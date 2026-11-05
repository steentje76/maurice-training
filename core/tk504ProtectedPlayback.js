/* TK504 — authorized MoveKit media adapter for the existing ExerciseCatalogService.
 * No additional catalog, picker, DB binding or entitlement decisions. The
 * broker remains the sole authority to sign media after a published release.
 * Deliberately not enabled in production until the cut-over release gates pass.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TK504ProtectedPlayback = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  'use strict';
  const ID = /^TK-\d{6}$/;
  const UID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  function error(code) { const e = new Error(code); e.code = code; return e; }
  function create(opts) {
    opts = opts || {};
    const ecs = opts.catalogService;
    const bridge = opts.bridge;
    const getOwner = opts.getOwner;
    if (!ecs || typeof ecs.byId !== 'function' ||
        !bridge || typeof bridge.requestStaged !== 'function' ||
        typeof bridge.invalidate !== 'function' ||
        typeof getOwner !== 'function') throw error('ADAPTER_NOT_CONFIGURED');
    let generation = 0;
    function canonical(exercise) {
      if (typeof exercise === 'string') exercise = { catalog_id: exercise };
      if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise) ||
          Object.prototype.hasOwnProperty.call(exercise, 'scope') ||
          Object.prototype.hasOwnProperty.call(exercise, 'user_id') ||
          Object.prototype.hasOwnProperty.call(exercise, 'owner_id')) return null;
      const id = exercise.catalog_id;
      if (typeof id !== 'string' || !ID.test(id)) return null;
      const published = ecs.byId(id);
      if (!published || published.catalog_id !== id || !published.source ||
          published.source.provider !== 'movekit' ||
          typeof published.source.provider_id !== 'string') return null;
      if (exercise.source && (exercise.source.provider !== 'movekit' ||
          exercise.source.provider_id !== published.source.provider_id)) return null;
      return published;
    }
    async function signed(exercise, type) {
      if (type !== 'video' && type !== 'poster') throw error('UNSUPPORTED_MEDIA_TYPE');
      const published = canonical(exercise);
      if (!published) throw error('CANONICAL_EXERCISE_UNBOUND');
      const uid = getOwner();
      if (typeof uid !== 'string' || !UID.test(uid)) throw error('AUTH_REQUIRED');
      const g = generation;
      const result = await bridge.requestStaged({
        catalog_id: published.catalog_id,
        source: { provider: 'movekit', provider_id: published.source.provider_id }
      }, type, uid);
      if (generation !== g || getOwner() !== uid) throw error('STALE_ACCOUNT');
      if (!result || result.catalogId !== published.catalog_id ||
          result.type !== type || result.version !== 'v2' ||
          typeof result.url !== 'string' || !result.url.startsWith('https://'))
        throw error('INVALID_BROKER_RESPONSE');
      return result;
    }
    function invalidate() { generation++; bridge.invalidate(); }
    return Object.freeze({ canonical, signed, invalidate });
  }
  return Object.freeze({ create });
});
