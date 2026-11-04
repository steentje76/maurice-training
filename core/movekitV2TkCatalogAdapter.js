'use strict';
/*
 * TK504 MoveKit V2 - V2-READY TK catalog adapter for a FUTURE normal training picker.
 * Pure, additive, NOT wired into index.html, DISABLED unless server-authorized.
 *
 * Composes (no second search index, no second writer):
 *   existing ExerciseCatalogService (search/all/favorites/recent, read-only use)
 *   + exact MoveKit source facets (proposed, unapproved, no Grip/Rug conversion)
 *   + trust eligibility gate (trusted published baseline 226 vs pending 356)
 *   + server-authorization dark-launch gate.
 *
 * Output rows are a SANITIZED PROJECTION: never the raw catalog row, never assets,
 * media URLs, storage paths, signed URLs, _review contents or supplier text.
 * Trainable == the eligibility gate allows 'workout_execution' for the ACTUAL service
 * row. Pending identities are never trainable/selectable whatever they claim.
 * Names are returned as plain text (control chars stripped, length capped); the future
 * renderer must set them via textContent / escape, never innerHTML.
 */
const Eligibility = require('./movekitV2ReviewEligibility.js');
const Facets = require('./movekitV2SourceFacets.js');

const FILTER_KEYS = Object.freeze({ muscle: 'movekitSourceMuscle', equipment: 'movekitSourceEquipment' });
const LEGACY_FILTERS = Object.freeze(['category', 'equipment', 'family', 'difficulty', 'type', 'fatigue',
  'lowfatigue', 'muscle', 'muscleGroup', 'goal', 'home', 'travel', 'favorite']);
const SORTS = Object.freeze(['name', 'relevance', 'confidence', 'difficulty']);
const MAX_QUERY = 100, MAX_LIMIT = 200, MAX_NAME = 120;
const STATUS = Object.freeze({
  PUBLISHED: 'PUBLISHED_BASELINE',
  PENDING: 'PENDING_REVIEW_NOT_RELEASED'
});
const PENDING_REASON = 'PENDING_HUMAN_REVIEW_AND_RELEASE_GATES';
const ID_RE = /^TK-\d{6}$/;

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function plain(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}
function own(o, k) {
  if (o === null || typeof o !== 'object' || !hasOwn(o, k)) return undefined;
  const d = Object.getOwnPropertyDescriptor(o, k);
  return d && hasOwn(d, 'value') ? d.value : undefined;
}
function fail(code) { const e = new Error(code); e.code = code; return e; }
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u001f\u007f-\u009f]/g;
function text(v, max) {
  return typeof v === 'string' ? v.replace(CTRL, ' ').trim().slice(0, max) : '';
}
function strList(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (let i = 0; i < Math.min(v.length, 32); i++) {
    const s = own(v, String(i));
    if (typeof s === 'string') out.push(text(s, 80));
  }
  return out;
}

function create(opts) {
  if (!plain(opts)) throw fail('ADAPTER_NOT_CONFIGURED');
  const svc = opts.catalogService, launch = opts.launchGate, registry = opts.registry;
  const grantProvider = opts.grantProvider;
  if (!svc || typeof svc.search !== 'function' || typeof svc.all !== 'function' ||
    typeof svc.byId !== 'function') throw fail('INCOMPATIBLE_CANONICAL_SEARCH');
  if (!launch || typeof launch.check !== 'function') throw fail('LAUNCH_GATE_REQUIRED');
  if (typeof grantProvider !== 'function') throw fail('GRANT_PROVIDER_REQUIRED');
  if (!Facets.validateTermRegistry(registry).valid) throw fail('INVALID_UNAPPROVED_TERM_REGISTRY');

  const gate = Eligibility.create({
    baseline: opts.baseline, pending: opts.pending,
    expectedBaseline: opts.expectedBaseline, expectedPending: opts.expectedPending
  });
  const pendingIds = new Set(opts.pending.map((r) => r.catalog_id));
  const baselineIds = new Set(opts.baseline.map((r) => r.catalog_id));
  // Capture the exact trusted supplier identity once. The eligibility gate
  // intentionally denies pending IDs before checking source provenance; the
  // display adapter must independently reject a forged pending provider/slug.
  const trustedSourceById = new Map();
  for (const row of opts.baseline.concat(opts.pending)) {
    const source = own(row, 'source');
    trustedSourceById.set(own(row, 'catalog_id'), own(source, 'provider_id'));
  }

  // Snapshot of facets per trusted id at creation time (TOCTOU hardening).
  const facetsById = new Map();
  const rawAll = svc.all();
  if (!Array.isArray(rawAll)) throw fail('CANONICAL_SEARCH_RESULT_INVALID');
  for (const row of rawAll) {
    const id = own(row, 'catalog_id');
    if (typeof id !== 'string' || !(baselineIds.has(id) || pendingIds.has(id))) continue;
    if (facetsById.has(id)) throw fail('DUPLICATE_CATALOG_ID_IN_SERVICE');
    const ident = own(row, 'identity'), src = own(row, 'source');
    facetsById.set(id, Facets.projectSourceFacets({
      provider: own(src, 'provider'),
      muscles: strList(own(ident, 'primary')).concat(strList(own(ident, 'secondary'))),
      equipment: strList(own(ident, 'equipment'))
    }, registry));
  }
  const muscleCodes = new Set(Object.keys(registry.muscles).map((k) => registry.muscles[k].code));
  const equipCodes = new Set(Object.keys(registry.equipment).map((k) => registry.equipment[k].code));

  function disabledResult(reason) {
    return Object.freeze({
      status: 'DISABLED', reason, enabled: false, rows: Object.freeze([]), total: 0,
      activeUi: false
    });
  }
  function authorization() {
    // A transient host/session failure must disable the picker, not throw into
    // the active UI or accidentally use a previously authenticated account.
    try { return launch.check(grantProvider()); }
    catch (_e) { return Object.freeze({enabled:false, reason:'DISABLED_GRANT_PROVIDER_ERROR'}); }
  }

  // Revocation: optional host-injected provider (server-delivered list), re-read on EVERY
  // call so a revoke takes effect immediately. Any malformed answer fails CLOSED (nothing
  // is trainable/selectable until the provider answers sanely again).
  const revocationProvider = opts.revocationProvider;
  if (revocationProvider !== undefined && typeof revocationProvider !== 'function') {
    throw fail('INVALID_REVOCATION_PROVIDER');
  }
  const ALL_REVOKED = Symbol('all-revoked');
  function revokedSet() {
    if (!revocationProvider) return new Set();
    try {
      const list = revocationProvider();
      if (!Array.isArray(list) || list.length > 1000) return ALL_REVOKED;
      const out = new Set();
      for (let i = 0; i < list.length; i++) {
        const v = own(list, String(i));
        const id = typeof v === 'string' ? v : (plain(v) ? own(v, 'catalog_id') : undefined);
        if (typeof id !== 'string' || !ID_RE.test(id)) return ALL_REVOKED;
        out.add(id);
      }
      return out;
    } catch (_e) { return ALL_REVOKED; }
  }
  const isRevoked = (rev, id) => rev === ALL_REVOKED || rev.has(id);

  /** Sanitized projection, or null when the row must not be shown at all. */
  function project(row, includePending, rev) {
    if (!plain(row)) return null;
    const id = own(row, 'catalog_id');
    if (typeof id !== 'string' || !ID_RE.test(id)) return null;
    const facets = facetsById.get(id);
    if (!facets) return null; // unknown to the trusted snapshot -> hidden
    if (isRevoked(rev || revokedSet(), id)) return null; // revoked -> hidden everywhere
    const decision = gate.decide(row, 'workout_execution');
    const ident = own(row, 'identity'), src = own(row, 'source');
    if (!plain(src) || own(src, 'provider') !== 'movekit' ||
      own(src, 'provider_id') !== trustedSourceById.get(id)) return null;
    // Immutable nested presentation properties: callers may inspect these but
    // cannot alter source identity, facets or filtered source terms afterward.
    const freezeList = (x) => Object.freeze(strList(x));
    const publicFacets = Object.freeze({
      muscles: Object.freeze(facets.muscles.map((f) => Object.freeze({
        term: f.sourceTerm, code: f.code, approved: false
      }))),
      equipment: Object.freeze(facets.equipment.map((f) => Object.freeze({
        term: f.sourceTerm, code: f.code, approved: false
      })))
    });
    const base = {
      catalog_id: id,
      name: text(own(ident, 'name'), MAX_NAME),
      category: text(own(ident, 'category'), 40),
      primary: freezeList(own(ident, 'primary')), secondary: freezeList(own(ident, 'secondary')),
      equipment: freezeList(own(ident, 'equipment')),
      source: Object.freeze({ provider: 'movekit', provider_id: text(own(src, 'provider_id'), 80) }),
      facets: publicFacets,
      renderAs: 'text'
    };
    if (decision.allowed) {
      if (!baselineIds.has(id)) return null;
      return Object.freeze(Object.assign(base, {
        status: STATUS.PUBLISHED, trainable: true, selectable: true, disabledReason: null,
        mediaPolicy: 'EXISTING_ASSET_PROVIDER_AND_SERVER_BROKER_ONLY'
      }));
    }
    if (includePending && pendingIds.has(id) && decision.reason === Eligibility.REASON.PENDING) {
      return Object.freeze(Object.assign(base, {
        status: STATUS.PENDING, trainable: false, selectable: false,
        disabledReason: PENDING_REASON, mediaPolicy: 'NONE'
      }));
    }
    return null;
  }

  function projectMany(rows, includePending) {
    const seen = new Set(), out = [];
    if (!Array.isArray(rows)) throw fail('CANONICAL_SEARCH_RESULT_INVALID');
    const rev = revokedSet();
    for (const r of rows) {
      const p = project(r, includePending, rev);
      if (!p || seen.has(p.catalog_id)) continue; // dupes: first trusted projection wins
      seen.add(p.catalog_id);
      out.push(p);
    }
    return out;
  }

  function search(query, filters, sort, options) {
    const auth = authorization();
    if (!auth.enabled) return disabledResult(auth.reason);
    const q = query === undefined ? '' : query;
    if (typeof q !== 'string' || q.length > MAX_QUERY) throw fail('INVALID_QUERY');
    const f = filters === undefined ? {} : filters;
    if (!plain(f)) throw fail('INVALID_FILTERS');
    const o = options === undefined ? {} : options;
    if (!plain(o)) throw fail('INVALID_OPTIONS');
    for (const k of Object.keys(f)) {
      if (k !== FILTER_KEYS.muscle && k !== FILTER_KEYS.equipment && !LEGACY_FILTERS.includes(k)) {
        throw fail('UNKNOWN_FILTER');
      }
    }
    if (sort !== undefined && !SORTS.includes(sort)) throw fail('UNKNOWN_SORT');
    const mCode = f[FILTER_KEYS.muscle], eCode = f[FILTER_KEYS.equipment];
    if ((mCode !== undefined && !muscleCodes.has(mCode)) || (eCode !== undefined && !equipCodes.has(eCode))) {
      throw fail('UNKNOWN_SOURCE_FACET_FILTER');
    }
    let limit = o.limit === undefined ? 100 : o.limit, offset = o.offset === undefined ? 0 : o.offset;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw fail('INVALID_LIMIT');
    if (!Number.isInteger(offset) || offset < 0) throw fail('INVALID_OFFSET');
    const includePending = o.includePending === true;
    const legacy = Object.assign({}, f);
    delete legacy[FILTER_KEYS.muscle]; delete legacy[FILTER_KEYS.equipment];
    // THE one existing search entrypoint.
    let rows = projectMany(svc.search(q, legacy, sort), includePending);
    rows = rows.filter((r) => {
      const fc = facetsById.get(r.catalog_id);
      return (mCode === undefined || fc.muscles.some((x) => x.code === mCode)) &&
        (eCode === undefined || fc.equipment.some((x) => x.code === eCode));
    });
    const total = rows.length;
    return Object.freeze({
      status: 'ENABLED', reason: auth.reason, enabled: true, total,
      pendingShown: rows.filter((r) => !r.trainable).length,
      rows: Object.freeze(rows.slice(offset, offset + limit)), activeUi: false
    });
  }

  function listFrom(fnName) {
    const auth = authorization();
    if (!auth.enabled) return disabledResult(auth.reason);
    const fn = svc[fnName];
    if (typeof fn !== 'function') return disabledResult('SERVICE_LACKS_' + fnName.toUpperCase());
    // Favorites/recent come from the EXISTING service; only trainable rows survive.
    const rows = projectMany(fn.call(svc), false);
    return Object.freeze({ status: 'ENABLED', reason: auth.reason, enabled: true, total: rows.length,
      rows: Object.freeze(rows), activeUi: false });
  }

  /**
   * May a stored reference ({catalog_id} or id string) be used by the future picker
   * (favorites/recent/templates)? Resolves against the LIVE service row and re-runs the
   * gate, so crafted ids, forged statuses and personal rows fail closed.
   */
  function resolveReference(ref) {
    const auth = authorization();
    if (!auth.enabled) return Object.freeze({ ok: false, reason: auth.reason, row: null });
    try {
      const id = typeof ref === 'string' ? ref : (plain(ref) ? own(ref, 'catalog_id') : undefined);
      if (typeof id !== 'string' || !ID_RE.test(id)) return Object.freeze({ ok: false, reason: 'DENY_BAD_REFERENCE', row: null });
      if (plain(ref)) {
        const verdict = gate.decide(ref, 'workout_execution'); // reference claims are NOT trusted
        if (!verdict.allowed) return Object.freeze({ ok: false, reason: verdict.reason, row: null });
      }
      const live = svc.byId(id);
      const p = project(live, false);
      if (!p) return Object.freeze({ ok: false, reason: 'DENY_NOT_TRAINABLE', row: null });
      return Object.freeze({ ok: true, reason: 'ALLOWED_PUBLISHED_CANONICAL', row: p });
    } catch (_e) {
      return Object.freeze({ ok: false, reason: 'DENY_MALFORMED_CANDIDATE', row: null });
    }
  }

  /**
   * Media IDENTITY request for the EXISTING ExerciseAssetProvider. Returns only the exact
   * source identity of a trainable, non-revoked published row so the host may call
   * ExerciseAssetProvider.poster/resolve(catalog_id). Never returns media, URLs or paths,
   * and never for pending/revoked/personal/unknown rows (the provider itself has a
   * name-fallback for ids missing from the catalog, so it must not be called without this).
   */
  function assetIdentity(ref) {
    const r = resolveReference(typeof ref === 'string' ? ref : (plain(ref) ? ref : null));
    if (!r.ok) return Object.freeze({ ok: false, reason: r.reason, catalog_id: null, provider_id: null });
    return Object.freeze({ ok: true, reason: 'ALLOWED_PUBLISHED_CANONICAL',
      catalog_id: r.row.catalog_id, provider_id: r.row.source.provider_id,
      via: 'ExerciseAssetProvider.resolve(catalog_id)' });
  }

  return Object.freeze({
    status: 'V2_READY_DARK_LAUNCH', unwired: true, productionEnabled: false,
    filterKeys: FILTER_KEYS, statuses: STATUS,
    counts: Object.freeze({ baseline: gate.baselineCount, pending: gate.pendingCount }),
    isEnabled: () => authorization().enabled,
    search,
    favorites: () => listFrom('favorites'),
    recent: () => listFrom('recent'),
    resolveReference,
    assetIdentity
    // Deliberately NO write/save/toggle/pushRecent/media/sign/url members.
  });
}

module.exports = Object.freeze({ create, FILTER_KEYS, STATUS, PENDING_REASON });
