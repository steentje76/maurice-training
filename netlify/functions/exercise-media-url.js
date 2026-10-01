// MoveKit private media access broker — Phase 1 foundation.
//
// SECURITY BOUNDARY
// - caller must present a valid Supabase user JWT;
// - caller supplies only canonical catalog_id + media type, NEVER a path/slug;
// - path is derived server-side from exercise-catalog.json;
// - signing uses service_role and a fixed private bucket;
// - response is no-store and never logs/echoes service credentials;
// - this function does not calculate or decide training content.
//
// Phase 1 does NOT switch the active UI to this endpoint yet.
const CATALOG = require('../../exercise-catalog.json');

const BUCKET = 'exercise-media';
const MEDIA_VERSION = 'v1';
const SIGN_TTL_SECONDS = 300;
const MAX_BODY_BYTES = 2048;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 240;
const rate = Object.create(null);

const byId = new Map(
  (CATALOG.catalog || []).map(function (e) { return [e.catalog_id, e]; })
);

const ALLOWED_ORIGINS = new Set([
  'https://maurice-art.netlify.app',
  'https://trainingskompas.com',
  'https://www.trainingskompas.com',
  'https://localhost',
  'capacitor://localhost'
]);

function cors(event) {
  const h = (event && event.headers) || {};
  const origin = h.origin || h.Origin || '';
  const out = {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
  if (ALLOWED_ORIGINS.has(origin)) out['Access-Control-Allow-Origin'] = origin;
  return out;
}

function reply(event, code, obj) {
  return {
    statusCode: code,
    headers: Object.assign({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, private',
      'Pragma': 'no-cache'
    }, cors(event)),
    body: code === 204 ? '' : JSON.stringify(obj)
  };
}

function limited(uid, now) {
  const e = rate[uid];
  if (!e || now - e.start > WINDOW_MS) {
    rate[uid] = { start: now, count: 1 };
    return false;
  }
  e.count++;
  return e.count > MAX_PER_WINDOW;
}

async function userFromToken(token, base, anonKey, fetchFn) {
  if (!token || !/^Bearer\s+\S+$/.test(token) || !base || !anonKey) return null;
  try {
    const r = await fetchFn(base + '/auth/v1/user', {
      headers: { Authorization: token, apikey: anonKey }
    });
    if (!r || !r.ok) return null;
    const u = await r.json();
    return (u && typeof u.id === 'string' && /^[0-9a-f-]{36}$/i.test(u.id)) ? u.id : null;
  } catch (e) {
    return null;
  }
}

function descriptorFor(catalogId, type) {
  if (type !== 'video') return null;
  if (typeof catalogId !== 'string' || !/^TK-\d{6}$/.test(catalogId)) return null;
  const e = byId.get(catalogId);
  if (!e || !e.source || e.source.provider !== 'movekit') return null;
  const slug = e.source.provider_id;
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return {
    bucket: BUCKET,
    catalog_id: catalogId,
    type: 'video',
    path: 'movekit/' + MEDIA_VERSION + '/video/' + slug + '.mp4'
  };
}

function normalizeSignedUrl(base, payload) {
  if (!payload || typeof payload !== 'object') return null;
  let s = payload.signedURL || payload.signedUrl || payload.signed_url;
  if (typeof s !== 'string' || !s) return null;
  if (/^https:\/\//i.test(s)) return s;
  if (s.indexOf('/storage/v1/') === 0) return base + s;
  if (s.indexOf('/object/') === 0) return base + '/storage/v1' + s;
  return null;
}

async function signDescriptor(desc, base, serviceKey, fetchFn) {
  const url = base + '/storage/v1/object/sign/' + desc.bucket + '/' + desc.path;
  const r = await fetchFn(url, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiresIn: SIGN_TTL_SECONDS })
  });
  if (!r || !r.ok) return { ok: false, code: 'SIGNING_FAILED' };
  let data;
  try { data = await r.json(); } catch (e) { return { ok: false, code: 'SIGNING_FAILED' }; }
  const signed = normalizeSignedUrl(base, data);
  if (!signed) return { ok: false, code: 'SIGNING_FAILED' };
  return { ok: true, url: signed };
}

async function handle(event, deps) {
  const env = deps.env || {};
  const fetchFn = deps.fetch;
  const now = deps.now || Date.now;

  if (event && event.httpMethod === 'OPTIONS') return reply(event, 204, {});
  if (!event || event.httpMethod !== 'POST') return reply(event, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  const base = env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  if (!base || !service || !anon || typeof fetchFn !== 'function') {
    return reply(event, 503, { ok: false, error: 'NOT_CONFIGURED' });
  }

  const raw = event.body || '';
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return reply(event, 413, { ok: false, error: 'PAYLOAD_TOO_LARGE' });
  }

  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization || '';
  const uid = await userFromToken(auth, base, anon, fetchFn);
  if (!uid) return reply(event, 401, { ok: false, error: 'UNAUTHENTICATED' });
  if (limited(uid, now())) return reply(event, 429, { ok: false, error: 'RATE_LIMITED' });

  let body;
  try { body = JSON.parse(raw || '{}'); }
  catch (e) { return reply(event, 400, { ok: false, error: 'INVALID_JSON' }); }

  // Unknown fields are ignored; no path/slug is ever consumed from the client.
  const desc = descriptorFor(body.catalog_id, body.type || 'video');
  if (!desc) return reply(event, 404, { ok: false, error: 'MEDIA_NOT_FOUND' });

  const signed = await signDescriptor(desc, base, service, fetchFn);
  if (!signed.ok) return reply(event, 502, { ok: false, error: signed.code });

  return reply(event, 200, {
    ok: true,
    catalog_id: desc.catalog_id,
    type: desc.type,
    expires_in: SIGN_TTL_SECONDS,
    url: signed.url
  });
}

exports.handler = async function (event) {
  return handle(event, {
    env: process.env,
    fetch: (typeof fetch === 'function') ? fetch : null,
    now: Date.now
  });
};

exports._internal = {
  handle,
  descriptorFor,
  normalizeSignedUrl,
  userFromToken,
  signDescriptor,
  BUCKET,
  MEDIA_VERSION,
  SIGN_TTL_SECONDS,
  MAX_BODY_BYTES,
  MAX_PER_WINDOW,
  WINDOW_MS,
  _resetRate: function () { for (const k in rate) delete rate[k]; }
};
