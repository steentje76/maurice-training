/*
 * TK504: Dutch MoveKit editorial preview attached to the existing ECS.
 * STAGING / NOT WIRED IN index.html. Licensed translation data stays private.
 * Never creates a second exercise catalog, picker, index, database writer
 * or right to execute any unpublished exercise.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MoveKitNlCatalogPreview = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  'use strict';
  const ID = /^TK-\d{6}$/;
  const HASH = /^[a-f0-9]{64}$/;
  const SCHEMA = 'tk504-private-nl-canonical-overlay/1.0';
  const STATUS = 'PRIVATE_DRAFT_NOT_REVIEWED_NOT_PUBLISHED';
  const DRAFT = 'DRAFT_NOT_HUMAN_REVIEWED_NOT_PUBLISHED';
  const FIELDS = Object.freeze([
    'aliases_nl', 'name_nl', 'primaryMuscles_nl', 'secondaryMuscles_nl',
    'equipment_nl', 'movementPattern_nl', 'difficulty_nl', 'tags_nl',
    'benefits_nl', 'useCases_nl', 'instructions_nl', 'commonMistakes_nl',
    'shortDescription_nl', 'longDescription_nl'
  ]);
  const PREVIEW_ONLY = 'PRIVATE_LOCAL_EDITORIAL_PREVIEW';
  function fail(code) { throw new Error('TK504_NL_' + code); }
  function text(x, limit) {
    if (typeof x !== 'string' || x.length > limit || /[\u0000-\u0008\u000B\u000C\u000E-\u001f\u007f]/.test(x))
      fail('INVALID_TEXT');
    return x;
  }
  function own(obj, key) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined;
    const d = Object.getOwnPropertyDescriptor(obj, key);
    return d && Object.prototype.hasOwnProperty.call(d, 'value') ? d.value : undefined;
  }
  function create(options) {
    const cfg = options || {};
    if (cfg.mode !== PREVIEW_ONLY) fail('PREVIEW_MODE_REQUIRED');
    const ecs = cfg.catalogService;
    const overlay = cfg.overlay;
    const expectedSha = cfg.expectedSourceSha256;
    if (!ecs || typeof ecs.all !== 'function' ||
        typeof ecs.byId !== 'function' || typeof ecs.search !== 'function' ||
        typeof ecs.rebuildIndex !== 'function') fail('CANONICAL_ECS_REQUIRED');
    if (!HASH.test(expectedSha) || own(overlay,'schema') !== SCHEMA ||
        own(overlay,'status') !== STATUS ||
        own(overlay,'metadata_source_sha256') !== expectedSha ||
        own(overlay,'total') !== 582 ||
        own(overlay,'existing_baseline') !== 226 ||
        own(overlay,'new_unreleased') !== 356 ||
        own(overlay,'approved_new_exercises') !== 0 ||
        own(overlay,'db_writes') !== 0 ||
        own(overlay,'grants_created') !== 0 ||
        own(overlay,'app_enabled') !== false ||
        !Array.isArray(own(overlay,'items')) ||
        overlay.items.length !== 582) fail('UNTRUSTED_PRIVATE_DRAFT');
    const baseline = ecs.all();
    if (!Array.isArray(baseline) || baseline.length !== 226) fail('BASELINE_COUNT_CHANGED');
    const baselineIds = new Set();
    for (const entry of baseline) {
      const cid = own(entry, 'catalog_id');
      if (!ID.test(cid) || Number(cid.slice(3)) > 226 || baselineIds.has(cid) ||
          own(own(entry,'source'),'provider') !== 'movekit' ||
          typeof own(own(entry,'source'),'provider_id') !== 'string' ||
          !own(entry,'identity') ||
          own(entry,'_review') !== undefined) fail('UNTRUSTED_BASELINE');
      baselineIds.add(cid);
    }
    const items = new Map(), providers = new Set();
    for (let i = 0; i < 582; i++) {
      const raw = overlay.items[i];
      const cid = own(raw,'catalog_id'), source = own(raw,'source');
      const providerId = own(source,'provider_id');
      const pending = i >= 226;
      if (cid !== 'TK-' + String(i+1).padStart(6,'0') ||
          own(source,'provider') !== 'movekit' ||
          typeof providerId !== 'string' ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(providerId) ||
          providers.has(providerId) ||
          own(raw,'group') !== (pending ? 'UNRELEASED_CANDIDATE' : 'EXISTING_CATALOG_BASELINE') ||
          own(raw,'translation_status') !== DRAFT) fail('BAD_CANONICAL_BINDING');
      const translations = own(raw,'translations');
      if (!translations || typeof translations !== 'object' ||
          Array.isArray(translations) ||
          Object.keys(translations).length !== FIELDS.length) fail('INCOMPLETE_TRANSLATION');
      const values = Object.create(null);
      for (const field of FIELDS) {
        const v = own(translations,field);
        values[field] = text(v, field === 'longDescription_nl' ? 12000 : 5000);
      }
      const displayName = text(own(raw,'display_name_nl_draft'),180).trim();
      if (!displayName || !values.name_nl.trim()) fail('EMPTY_NAME');
      if (!pending) {
        const entity = ecs.byId(cid);
        if (!entity || !baselineIds.has(cid) ||
            own(own(entity,'source'),'provider_id') !== providerId ||
            own(own(entity,'source'),'provider') !== 'movekit' ||
            own(own(entity,'identity'),'nl') !== null) fail('BASELINE_IDENTITY_DRIFT');
      } else if (baselineIds.has(cid) || ecs.byId(cid) !== null) {
        fail('UNRELEASED_IN_BASELINE');
      }
      providers.add(providerId);
      items.set(cid, Object.freeze({
        catalog_id:cid, provider_id:providerId, name:displayName,
        detailName:values.name_nl, pending, fields:Object.freeze(values)
      }));
    }
    if (items.size !== 582 || providers.size !== 582) fail('INCOMPLETE_PRIVATE_SET');
    let installed = false;
    function preview(id) {
      if (typeof id !== 'string' || !ID.test(id)) return null;
      const entry = items.get(id);
      if (!entry) return null;
      return Object.freeze({
        catalog_id:entry.catalog_id, name:entry.name,
        alternativeName:entry.detailName, status:entry.pending ?
          'NOT_PUBLISHED' : 'DRAFT_ONLY',
        selectable:false, trainable:false, signedMediaAvailable:false,
        fields:entry.fields
      });
    }
    function existingName(id) {
      const item = items.get(id);
      return item && !item.pending ? item.name : null;
    }
    function installDutchSearchForLocalReview() {
      if (installed) fail('ALREADY_INSTALLED');
      const source = ecs.all();
      if (source.length !== 226) fail('BASELINE_COUNT_CHANGED');
      // Recheck every identity before any mutation. The canonical ECS owns
      // its ONE inverted index; never create a parallel search implementation.
      for (const e of source) {
        const item = items.get(e.catalog_id);
        if (!item || item.pending ||
            !e.source || e.source.provider_id !== item.provider_id ||
            !e.identity || e.identity.nl !== null) fail('BASELINE_CHANGED');
      }
      let count = 0;
      try {
        for (const e of source) {
          e.identity.nl = items.get(e.catalog_id).name;
          count++;
        }
        ecs.rebuildIndex();
        installed = true;
      } catch (_) {
        for (let k = 0; k < count; k++) source[k].identity.nl = null;
        try { ecs.rebuildIndex(); } catch (_) {}
        fail('REBUILD_FAILED');
      }
      return Object.freeze({indexedDutchNames:count, pendingIndexed:0,
        previewOnly:true, authorizedForRelease:false});
    }
    function restoreEnglishBaseline() {
      if (!installed) return false;
      for (const e of ecs.all()) {
        const item = items.get(e.catalog_id);
        if (!item || item.pending ||
            !e.identity || e.identity.nl !== item.name)
          fail('RESTORE_BLOCKED_DUE_TO_CATALOG_CHANGE');
      }
      for (const e of ecs.all()) e.identity.nl = null;
      ecs.rebuildIndex();
      installed = false;
      return true;
    }
    return Object.freeze({
      mode:PREVIEW_ONLY, appActive:false, canApprove:false,
      canCreateExercise:false, canSignMedia:false,
      review:preview, existingName,
      installDutchSearchForLocalReview, restoreEnglishBaseline,
      get installed() { return installed; }
    });
  }
  return Object.freeze({ create, PREVIEW_ONLY, FIELDS, SCHEMA, STATUS });
});
