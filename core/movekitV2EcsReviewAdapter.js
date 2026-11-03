'use strict';
/*
 * TK504: REVIEW-ONLY adapter over the EXISTING ExerciseCatalogService search().
 * No replacement search engine, no catalog writes, no app wiring or media access.
 * It adds exact MoveKit-source muscle/equipment filters, NEVER the legacy "Grip"
 * alias for supplier Forearms or generic Rug for supplier Lower Back.
 */
const { projectSourceFacets, validateTermRegistry } = require('./movekitV2SourceFacets.js');

const STAGE_STATUS = 'PRIVATE_REVIEW_NOT_RELEASED';
const FILTERS = Object.freeze({
  muscle: 'movekitSourceMuscle',
  equipment: 'movekitSourceEquipment',
});
const ID_RE = /^TK-\d{6}$/;

function failIf(condition, message) {
  if (condition) throw new Error(message);
}
function plain(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  const p = Object.getPrototypeOf(o);
  return p === Object.prototype || p === null;
}
function validateStage(stage, catalogService, registry) {
  failIf(!plain(stage) || stage._status !== STAGE_STATUS ||
    stage.count !== 582 || stage._base_count !== 226 ||
    stage._new_count !== 356 || stage._review_total !== 356 ||
    stage._approved_for_import !== 0 || stage._app_activated !== false ||
    stage._media_grants_created !== 0 ||
    !Array.isArray(stage.catalog) || stage.catalog.length !== 582,
    'NOT_VERIFIED_PRIVATE_STAGE');
  const counts = stage._review_counts;
  failIf(!plain(counts) ||
    counts.AI_PROPOSAL_PENDING_HUMAN_REVIEW !== 245 ||
    counts.SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW !== 85 ||
    counts.OWNER_FEEDBACK_PENDING_CONTENT_REVIEW !== 26,
    'STAGE_REVIEW_COUNTS_CHANGED');
  failIf(!catalogService || typeof catalogService.search !== 'function' ||
    typeof catalogService.byId !== 'function' ||
    typeof catalogService.all !== 'function', 'INCOMPATIBLE_CANONICAL_SEARCH');
  const raw = catalogService.all();
  failIf(!Array.isArray(raw) || raw.length !== 582, 'SEARCH_CATALOG_COUNT_MISMATCH');
  const seen = new Set();
  for (let i = 0; i < 582; i++) {
    const e = stage.catalog[i], c = raw[i];
    failIf(!e || !c || !ID_RE.test(e.catalog_id || '') ||
      e.catalog_id !== c.catalog_id || seen.has(e.catalog_id) ||
      !e.source || e.source.provider !== 'movekit' ||
      !c.source || c.source.provider !== e.source.provider ||
      c.source.provider_id !== e.source.provider_id ||
      !e.identity || !c.identity ||
      !Array.isArray(e.identity.primary) ||
      !Array.isArray(e.identity.secondary) ||
      !Array.isArray(e.identity.equipment) ||
      e.identity.name !== c.identity.name,
      'SEARCH_CATALOG_SOURCE_MISMATCH');
    if (i >= 226) {
      failIf(!e._review ||
        e._review.integration_status !== 'HOLD_FOR_HUMAN_AND_RELEASE_GATES' ||
        e._review.confirmed_by_authenticated_reviewer !== false ||
        e._review.status !== 'NOT_PUBLISHED' ||
        e.identity.category !== 'pending_review' ||
        !Array.isArray(e.assets) || e.assets.length !== 0,
        'NEW_CATALOG_ITEM_PREMATURE_RELEASE');
    }
    seen.add(e.catalog_id);
  }
  failIf(!validateTermRegistry(registry).valid, 'INVALID_UNAPPROVED_TERM_REGISTRY');
}
function createReviewSearch({stage, catalogService, registry} = {}) {
  validateStage(stage, catalogService, registry);
  const index = new Map();
  // Snapshot at validation time: later mutation of stage/registry by a caller
  // must not change what this review view reports (TOCTOU hardening).
  const facetsById = new Map();
  const total = stage.count;
  for (const c of stage.catalog) {
    const identity = c.identity;
    const projected = projectSourceFacets({
      provider: c.source.provider,
      muscles: identity.primary.concat(identity.secondary),
      equipment: identity.equipment,
    }, registry);
    facetsById.set(c.catalog_id, projected);
    const codes = Object.freeze({
      muscle: Object.freeze(projected.muscles.filter(f => f.code).map(f => f.code)),
      equipment: Object.freeze(projected.equipment.filter(f => f.code).map(f => f.code)),
    });
    index.set(c.catalog_id, codes);
  }
  const v = validateTermRegistry(registry);
  const muscleChoices = Object.freeze(Object.keys(registry.muscles)
    .map(k => Object.freeze({value:registry.muscles[k].code,
      label:registry.muscles[k].label_nl, sourceTerm:k, approved:false})));
  const equipmentChoices = Object.freeze(Object.keys(registry.equipment)
    .map(k => Object.freeze({value:registry.equipment[k].code,
      label:registry.equipment[k].label_nl, sourceTerm:k, approved:false})));
  function search(query='', filters={}, sort) {
    failIf(!plain(filters), 'INVALID_REVIEW_FILTERS');
    const muscleCode = filters[FILTERS.muscle];
    const equipmentCode = filters[FILTERS.equipment];
    const validMuscle = muscleCode === undefined || muscleChoices.some(x => x.value === muscleCode);
    const validEquipment = equipmentCode === undefined || equipmentChoices.some(x => x.value === equipmentCode);
    failIf(!validMuscle || !validEquipment, 'UNKNOWN_SOURCE_FACET_FILTER');
    const legacy = {...filters};
    delete legacy[FILTERS.muscle];
    delete legacy[FILTERS.equipment];
    // This is the ONE existing search entrypoint. No duplicate inverted index.
    const results = catalogService.search(query, legacy, sort);
    failIf(!Array.isArray(results), 'CANONICAL_SEARCH_RESULT_INVALID');
    return results.filter(row => {
      const f = row && index.get(row.catalog_id);
      return !!f && (muscleCode === undefined || f.muscle.includes(muscleCode)) &&
        (equipmentCode === undefined || f.equipment.includes(equipmentCode));
    });
  }
  function sourceFacets(id) {
    return (typeof id === 'string' && facetsById.get(id)) || null;
  }
  return Object.freeze({
    status:'REVIEW_ONLY_NOT_ACTIVATED',
    displayOnly:true, productionEnabled:false, approved:false,
    total, registryTerms:v.termCount,
    filterKeys:FILTERS,
    choices:Object.freeze({muscles:muscleChoices, equipment:equipmentChoices}),
    search, sourceFacets,
  });
}
module.exports = Object.freeze({createReviewSearch, FILTERS, STAGE_STATUS});
