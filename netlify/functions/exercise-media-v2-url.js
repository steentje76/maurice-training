'use strict';
// MoveKit Golden V2, isolated draft broker. Never enabled without explicit
// independent catalogue, entitlement, upload-integrity and license approvals.
// Private V2 media is stored in Supabase, but no end-user media release is approved.

const BUCKET = 'exercise-media';
const POSTER_BUCKET = 'exercise-posters';
const SCOPE = 'movekit_v2';
const BASE = 'https://mhfxhzkdmgkaplicdszg.supabase.co';
const SCHEMA = 'trainingskompas-movekit-v2-release/1.0';
const TTL_SECONDS = 60;
const MAX_BODY_BYTES = 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CID = /^TK-\d{6}$/;
const SHA = /^[a-f0-9]{64}$/;
const REVIEW = /^TK504-[0-9]{8}-[0-9]{3,6}$/;
const ORIGINAL_226_MEDIA_STATE = 'STAGED_ONLY_NOT_RELEASED';
const ALLOWED_ORIGINS = new Set([
  'https://maurice-art.netlify.app',
  'https://trainingskompas.com',
  'https://www.trainingskompas.com',
  'https://localhost',
  'capacitor://localhost'
]);

// Static requires are bundled into Netlify Functions by esbuild.
// Runtime fs.readFileSync would fail after deployment unless special file
// inclusion rules were configured. These immutable source-byte SHA pins are
// independently checked against the JSON files in the test/Quality Gate.
const inventory = require('../../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posterRegistry = require('../../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const release = require('../../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const ledger = require('../../core/tk504BatchReleaseLedger.js');
const inventorySha = 'a8500ce902bbea4f1ff5ad0be6576f70b44616f8803367a27122e5449c815a66';
const posterSha = '07fe0762c6eb5814d03d006e060b8eec0dd4e47cd053a3d3846ff003cc8559a4';
const byId = new Map();
if (inventory.schema !== 'trainingskompas-movekit-golden-inventory/2.0' ||
    inventory.status !== 'STAGING_ONLY_DO_NOT_ACTIVATE' ||
    !Array.isArray(inventory.items) || inventory.items.length !== 582) {
  throw new Error('MOVEKIT_GOLDEN_INVENTORY_INVALID');
}
for (const item of inventory.items) {
  if (!item || !CID.test(item.catalog_id) || byId.has(item.catalog_id) ||
      !item.video || !SHA.test(item.video.sha256) ||
      !Number.isSafeInteger(item.video.bytes) || item.video.bytes <= 0 ||
      typeof item.video.path !== 'string' ||
      !/^movekit\/v2\/video\/[a-z0-9]+(?:-[a-z0-9]+)*\.mp4$/.test(item.video.path)) {
    throw new Error('MOVEKIT_GOLDEN_ITEM_INVALID');
  }
  byId.set(item.catalog_id, item);
}
const postersById = new Map();
if (posterRegistry.schema !== 'trainingskompas-movekit-v2-optimized-poster-digests/1.0' ||
    posterRegistry.status !== 'STAGING_INDEX_NOT_RELEASE_APPROVAL' ||
    posterRegistry.golden_inventory_sha256 !== inventorySha ||
    !Array.isArray(posterRegistry.items) || posterRegistry.items.length !== 582 ||
    posterRegistry.count !== 582 || posterRegistry.total_bytes !== 9634714) {
  throw new Error('MOVEKIT_OPTIMIZED_POSTER_REGISTRY_INVALID');
}
let posterTotal = 0;
for (const poster of posterRegistry.items) {
  const golden = poster && byId.get(poster.catalog_id);
  if (!poster || !golden || postersById.has(poster.catalog_id) ||
      poster.provider_id !== golden.provider_id ||
      poster.mime !== 'image/webp' ||
      poster.path !== 'movekit/v2/poster-optimized/' + golden.provider_id + '.webp' ||
      !SHA.test(poster.sha256) || !Number.isSafeInteger(poster.bytes) ||
      poster.bytes < 1 || poster.bytes > 1048576) {
    throw new Error('MOVEKIT_OPTIMIZED_POSTER_MAPPING_INVALID');
  }
  postersById.set(poster.catalog_id, poster);
  posterTotal += poster.bytes;
}
if (postersById.size !== byId.size || posterTotal !== 9634714) {
  throw new Error('MOVEKIT_OPTIMIZED_POSTER_SET_INCOMPLETE');
}

function cors(event) {
  const h = event && event.headers || {};
  const origin = h.origin || h.Origin || '';
  const output = {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
  if (ALLOWED_ORIGINS.has(origin)) output['Access-Control-Allow-Origin'] = origin;
  return output;
}
function respond(event, status, data) {
  return { statusCode: status, headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, private, max-age=0',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...cors(event)
  }, body: status === 204 ? '' : JSON.stringify(data) };
}
function failure(event, status, code) {
  return respond(event, status, { ok: false, error: code });
}
function trustedOrigin(event) {
  const h = event && event.headers || {};
  const origin = h.origin || h.Origin;
  return !origin || ALLOWED_ORIGINS.has(origin);
}
function releaseConfigured(config, env, sha = inventorySha) {
  return !!(env && env.MOVEKIT_V2_SIGNING_ENABLED === 'true' &&
    env.MOVEKIT_V2_PERMISSION_REVIEWED === 'true' &&
    env.MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED === 'true' &&
    config && config.schema === SCHEMA &&
    config.status === 'RELEASE_APPROVED' &&
    config.inventory_sha256 === sha &&
    config.poster_digest_sha256 === posterSha &&
    Array.isArray(config.entries) &&
    config.entries.length > 0 &&
    config.entries.length <= 1164);
}
function descriptor(catalogId, mediaType, config) {
  if (typeof catalogId !== 'string' || !CID.test(catalogId) ||
      (mediaType !== 'video' && mediaType !== 'poster') ||
      !config || !Array.isArray(config.entries)) return null;
  const canonical = byId.get(catalogId);
  const expected = mediaType === 'video' ? canonical && canonical.video : postersById.get(catalogId);
  if (!canonical || !expected) return null;
  const rows = config.entries.filter(x => x && x.catalog_id === catalogId && x.media_type === mediaType);
  if (rows.length !== 1) return null;
  const approved = rows[0];
  if (approved.reviewed !== true || approved.upload_verified !== true ||
      !REVIEW.test(approved.review_reference) ||
      !REVIEW.test(approved.upload_reference) ||
      approved.storage_path !== expected.path ||
      approved.sha256 !== expected.sha256 ||
      approved.bytes !== expected.bytes) return null;
  return Object.freeze({
    catalog_id: catalogId, type: mediaType, version: 'v2',
    bucket: mediaType === 'video' ? BUCKET : POSTER_BUCKET, path: expected.path
  });
}
async function identifyUser(header, anonKey, fetchFn) {
  if (typeof header !== 'string' || header.length > 8199 ||
      !/^Bearer [A-Za-z0-9_.~-]+$/.test(header) ||
      typeof anonKey !== 'string' || !anonKey) return null;
  try {
    const r = await fetchFn(BASE + '/auth/v1/user', {
      method: 'GET', cache: 'no-store', redirect: 'error',
      headers: { Authorization: header, apikey: anonKey }
    });
    if (!r || !r.ok) return null;
    const user = await r.json();
    return user && typeof user.id === 'string' && UUID.test(user.id) ? user.id.toLowerCase() : null;
  } catch (_) { return null; }
}
async function verifyEntitlement(uid, serviceKey, fetchFn, now) {
  if (!UUID.test(uid)) return { ok: false, error: 'AUTH_REQUIRED' };
  const query = new URLSearchParams({
    select: 'user_id,scope,active,expires_at,revoked_at',
    user_id: 'eq.' + uid,
    scope: 'eq.' + SCOPE,
    limit: '2'
  });
  try {
    const r = await fetchFn(BASE + '/rest/v1/movekit_media_grants?' + query.toString(), {
      method: 'GET', cache: 'no-store', redirect: 'error',
      headers: { Authorization: 'Bearer ' + serviceKey, apikey: serviceKey,
        Accept: 'application/json' }
    });
    if (!r || !r.ok) return { ok: false, error: 'GRANT_BACKEND_UNAVAILABLE' };
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length !== 1) return { ok: false, error: 'NO_ENTITLEMENT' };
    const item = rows[0];
    if (!item || item.user_id !== uid || item.scope !== SCOPE || item.active !== true ||
        item.revoked_at !== null) return { ok: false, error: 'NO_ENTITLEMENT' };
    if (item.expires_at !== null) {
      if (typeof item.expires_at !== 'string' ||
          !Number.isFinite(Date.parse(item.expires_at)) ||
          Date.parse(item.expires_at) <= now()) return { ok: false, error: 'NO_ENTITLEMENT' };
    }
    return { ok: true, expiresAt: item.expires_at === null ? null : Date.parse(item.expires_at) };
  } catch (_) { return { ok: false, error: 'GRANT_BACKEND_UNAVAILABLE' }; }
}
function signedUrl(raw, desc) {
  if (typeof raw !== 'string' || !raw || raw.length > 8192) return null;
  let u;
  if (raw.startsWith('/storage/v1/')) u = BASE + raw;
  else if (raw.startsWith('/object/')) u = BASE + '/storage/v1' + raw;
  else if (raw.startsWith('https://')) u = raw;
  else return null;
  try {
    const parsed = new URL(u);
    const expected = '/storage/v1/object/sign/' + desc.bucket + '/' + desc.path;
    if (parsed.origin !== BASE || parsed.pathname !== expected ||
        parsed.username || parsed.password || parsed.hash ||
        parsed.searchParams.size !== 1 ||
        !parsed.searchParams.has('token') ||
        !/^[A-Za-z0-9._~-]{8,4096}$/.test(parsed.searchParams.get('token') || '')) return null;
    return parsed.href;
  } catch (_) { return null; }
}
async function sign(desc, key, fetchFn, ttlSeconds = TTL_SECONDS) {
  const url = BASE + '/storage/v1/object/sign/' + desc.bucket + '/' + desc.path;
  try {
    const result = await fetchFn(url, {
      method: 'POST', redirect: 'error', cache: 'no-store',
      headers: { Authorization: 'Bearer ' + key, apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: ttlSeconds })
    });
    if (!result || !result.ok) return null;
    const body = await result.json();
    const raw = body && (body.signedURL || body.signedUrl || body.signed_url);
    return signedUrl(raw, desc);
  } catch (_) { return null; }
}
async function handle(event, deps = {}) {
  const env = deps.env || {};
  const fetchFn = deps.fetch;
  const now = deps.now || Date.now;
  const activeRelease = deps.release || release;
  if (!trustedOrigin(event)) return failure(event, 403, 'ORIGIN_REJECTED');
  if (event && event.httpMethod === 'OPTIONS') return respond(event, 204, {});
  if (!event || event.httpMethod !== 'POST') return failure(event, 405, 'METHOD_NOT_ALLOWED');
  // Check release gates before examining credentials or making network calls.
  if (!releaseConfigured(activeRelease, env, inventorySha)) {
    return failure(event, 503, 'V2_NOT_RELEASED');
  }
  if (env.SUPABASE_URL !== BASE || !env.SUPABASE_SERVICE_ROLE_KEY ||
      !env.SUPABASE_ANON_KEY || typeof fetchFn !== 'function') {
    return failure(event, 503, 'BROKER_NOT_CONFIGURED');
  }
  if (typeof event.body !== 'string' ||
      Buffer.byteLength(event.body, 'utf8') > MAX_BODY_BYTES) {
    return failure(event, 413, 'INVALID_BODY_SIZE');
  }
  let body;
  try { body = JSON.parse(event.body); } catch (_) { return failure(event, 400, 'INVALID_JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== 3 || !Object.hasOwn(body, 'catalog_id') ||
      !Object.hasOwn(body, 'type') || !Object.hasOwn(body, 'version') ||
      typeof body.catalog_id !== 'string' || !CID.test(body.catalog_id) ||
      (body.type !== 'video' && body.type !== 'poster') || body.version !== 'v2') {
    return failure(event, 400, 'INVALID_REQUEST');
  }
  // #603: media signing must not silently make the 356 new catalog items
  // usable before a durable, collision-safe catalog->FK logging contract has
  // been validated. The existing 226 may still undergo a safe private cutover.
  const catalogNumber = Number(body.catalog_id.slice(3));
  if (catalogNumber >= 227 && catalogNumber <= 582 &&
      env.MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED !== 'true') {
    return failure(event, 503, 'NEW_CATALOG_EXECUTION_UNVERIFIED');
  }
  // A new-catalog item is signable only inside an exact, owner-fingerprinted
  // cumulative package prefix. A lone entry, gap or partial package fails.
  if (catalogNumber >= 227 && catalogNumber <= 582) {
    const scope = ledger.releasedScope(activeRelease);
    if (!scope || !scope.ids.includes(body.catalog_id)) {
      return failure(event, 404, 'MEDIA_NOT_APPROVED');
    }
  }
  // TK614: original 226 media is STAGED_ONLY_NOT_RELEASED.
  // Existing release.entries contain 452 original media metadata rows, but
  // these are NOT an independent media release decision. Never sign original
  // media on the basis of entries, FK approval, runtime env, or test overrides.
  // A future owner-signed media release requires a separate reviewed code change.
  // Unconditional: runs before auth, grant lookup or signing. The pure eligibility
  // gate (tools/tk614_original226_media_eligibility.cjs) is code-only staging and is
  // deliberately NOT loaded here; wiring it requires a separate reviewed release.
  if (catalogNumber >= 1 && catalogNumber <= 226) {
    return failure(event, 404, 'MEDIA_NOT_APPROVED');
  }
  if (body.type === 'poster' && env.MOVEKIT_V2_POSTER_UPLOAD_VERIFIED !== 'true') {
    return failure(event, 503, 'POSTERS_NOT_RELEASED');
  }
  const desc = descriptor(body.catalog_id, body.type, activeRelease);
  if (!desc) return failure(event, 404, 'MEDIA_NOT_APPROVED');
  const headers = event.headers || {};
  const uid = await identifyUser(headers.authorization || headers.Authorization,
    env.SUPABASE_ANON_KEY, fetchFn);
  if (!uid) return failure(event, 401, 'AUTH_REQUIRED');
  const entitlement = await verifyEntitlement(uid, env.SUPABASE_SERVICE_ROLE_KEY, fetchFn, now);
  if (!entitlement.ok) {
    return failure(event, entitlement.error === 'GRANT_BACKEND_UNAVAILABLE' ? 503 : 403,
      entitlement.error);
  }
  // Cap requested TTL by the grant's remaining validity. The browser uses a
  // conservative 30-second margin; direct Storage bearer replay remains a
  // separately documented release boundary, not an instant-revocation claim.
  const issuedAt = now();
  const ttlSeconds = entitlement.expiresAt === null ? TTL_SECONDS :
    Math.min(TTL_SECONDS, Math.floor((entitlement.expiresAt - issuedAt) / 1000));
  if (ttlSeconds < 31) return failure(event, 403, 'ENTITLEMENT_EXPIRING');
  const url = await sign(desc, env.SUPABASE_SERVICE_ROLE_KEY, fetchFn, ttlSeconds);
  if (!url) return failure(event, 502, 'SIGNED_MEDIA_UNAVAILABLE');
  // Signing is asynchronous. A grant can expire or be revoked while Storage
  // answers; do not release a newly signed bearer URL after that boundary.
  const confirmed = await verifyEntitlement(uid, env.SUPABASE_SERVICE_ROLE_KEY, fetchFn, now);
  if (!confirmed.ok) return failure(event,
    confirmed.error === 'GRANT_BACKEND_UNAVAILABLE' ? 503 : 403, confirmed.error);
  const expiresAt = issuedAt + ttlSeconds * 1000;
  if (confirmed.expiresAt !== null && confirmed.expiresAt < expiresAt)
    return failure(event, 403, 'ENTITLEMENT_CHANGED');
  const remainingSeconds = Math.floor((expiresAt - now()) / 1000);
  if (remainingSeconds < 31) return failure(event, 403, 'SIGNED_MEDIA_EXPIRED');
  return respond(event, 200, {
    ok: true, catalog_id: desc.catalog_id, type: desc.type, version: desc.version,
    expires_in: remainingSeconds, url
  });
}
exports.handler = event => handle(event, { env: process.env, fetch: globalThis.fetch, now: Date.now });
exports._internal = { handle, releaseConfigured, descriptor, identifyUser, verifyEntitlement,
  signedUrl, sign, inventorySha, posterSha, byId, postersById,
  BUCKET, POSTER_BUCKET, SCOPE, BASE, TTL_SECONDS, SCHEMA, ORIGINAL_226_MEDIA_STATE };
