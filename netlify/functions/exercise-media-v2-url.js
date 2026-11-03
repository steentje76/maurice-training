'use strict';
// MoveKit Golden V2, isolated draft broker. Never enabled without explicit
// independent catalogue, entitlement, upload-integrity and license approvals.
// NO private media uploaded, no external media release from this branch.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const BUCKET = 'exercise-media';
const SCOPE = 'movekit_v2';
const BASE = 'https://mhfxhzkdmgkaplicdszg.supabase.co';
const SCHEMA = 'trainingskompas-movekit-v2-release/1.0';
const TTL_SECONDS = 60;
const MAX_BODY_BYTES = 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CID = /^TK-\d{6}$/;
const SHA = /^[a-f0-9]{64}$/;
const REVIEW = /^TK504-[0-9]{8}-[0-9]{3,6}$/;
const ALLOWED_ORIGINS = new Set([
  'https://maurice-art.netlify.app',
  'https://trainingskompas.com',
  'https://www.trainingskompas.com',
  'https://localhost',
  'capacitor://localhost'
]);

const invPath = path.resolve(__dirname, '../../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const releasePath = path.resolve(__dirname, '../../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const inventoryBytes = fs.readFileSync(invPath);
const inventory = JSON.parse(inventoryBytes.toString('utf8'));
const inventorySha = crypto.createHash('sha256').update(inventoryBytes).digest('hex');
const release = require('../../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
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
    Array.isArray(config.entries) &&
    config.entries.length > 0 &&
    config.entries.length <= 582);
}
function descriptor(catalogId, mediaType, config) {
  if (!CID.test(catalogId) || mediaType !== 'video' ||
      !config || !Array.isArray(config.entries)) return null;
  const canonical = byId.get(catalogId);
  if (!canonical) return null;
  const rows = config.entries.filter(x => x && x.catalog_id === catalogId && x.media_type === mediaType);
  if (rows.length !== 1) return null;
  const approved = rows[0];
  if (approved.reviewed !== true || approved.upload_verified !== true ||
      !REVIEW.test(approved.review_reference) ||
      !REVIEW.test(approved.upload_reference) ||
      approved.storage_path !== canonical.video.path ||
      approved.sha256 !== canonical.video.sha256 ||
      approved.bytes !== canonical.video.bytes) return null;
  return Object.freeze({
    catalog_id: catalogId, type: 'video', version: 'v2',
    bucket: BUCKET, path: canonical.video.path
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
    return { ok: true };
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
async function sign(desc, key, fetchFn) {
  const url = BASE + '/storage/v1/object/sign/' + desc.bucket + '/' + desc.path;
  try {
    const result = await fetchFn(url, {
      method: 'POST', redirect: 'error', cache: 'no-store',
      headers: { Authorization: 'Bearer ' + key, apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: TTL_SECONDS })
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
      body.type !== 'video' || body.version !== 'v2') {
    return failure(event, 400, 'INVALID_REQUEST');
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
  const url = await sign(desc, env.SUPABASE_SERVICE_ROLE_KEY, fetchFn);
  if (!url) return failure(event, 502, 'SIGNED_MEDIA_UNAVAILABLE');
  return respond(event, 200, {
    ok: true, catalog_id: desc.catalog_id, type: desc.type, version: desc.version,
    expires_in: TTL_SECONDS, url
  });
}
exports.handler = event => handle(event, { env: process.env, fetch: globalThis.fetch, now: Date.now });
exports._internal = { handle, releaseConfigured, descriptor, identifyUser, verifyEntitlement,
  signedUrl, sign, inventorySha, BUCKET, SCOPE, BASE, TTL_SECONDS, SCHEMA };
