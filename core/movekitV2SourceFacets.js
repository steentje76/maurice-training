'use strict';
/* TK-504 MoveKit V2 — SOURCE-FIRST muscle/equipment facets (pure, display-only).
 *
 * Projects supplier term arrays onto EXACT, whitelisted, namespaced display facets
 * taken from an explicitly supplied PROPOSED term registry
 * (shape of tools/movekit-v2-taxonomy-map.json).
 *
 * Hard rules:
 *  - Pure: no fs / network / DB / DOM / globals. Caller supplies all data.
 *  - Exact, case- and whitespace-sensitive match only. No synonyms, no trimming
 *    for matching, no scientific muscle-load inference.
 *  - Never converts to canonical app taxonomy (e.g. supplier "Forearms" is NOT
 *    'm:grip'; supplier "Lower Back" is NOT general "Rug"). Output codes are
 *    only the proposed 'movekit:' namespaced codes.
 *  - Unknown / malformed terms are preserved as unapproved source terms.
 *  - Every result carries approved:false and runtime activation false.
 *  - Input is never mutated; output is deep-frozen plain serializable data.
 *  - Not wired into index.html or any runtime path.
 */

const SCHEMA = 'tk504-movekit-v2-source-facets/1.0';
const REGISTRY_SCHEMA = 'tk504-movekit-v2-terminology/1.0';
const REGISTRY_STATUS = 'PROPOSED_NOT_APPROVED';
const NAMESPACE = 'movekit:';
const KINDS = Object.freeze({
  muscles: Object.freeze({ key: 'muscles', kind: 'muscle', prefix: 'movekit:muscle:' }),
  equipment: Object.freeze({ key: 'equipment', kind: 'equipment', prefix: 'movekit:equipment:' })
});
const MAX_TERMS = 64;
const MAX_TERM_LENGTH = 80;
const MAX_PROVIDER_LENGTH = 40;
// A caller must explicitly attest provider identity; do not infer licensed provenance.
const DEFAULT_PROVIDER = 'unknown';
// Only terms from this provider may match the movekit-namespaced registry.
const MATCHING_PROVIDER = 'movekit';

const STATUS = Object.freeze({
  PROPOSED: 'proposed_display_only',
  UNAPPROVED: 'unapproved_source_term',
  INVALID: 'invalid_source_value'
});

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isPlainObject = (v) => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
};
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/;
const CODE_RE = /^movekit:(muscle|equipment):[a-z0-9_]+$/;

function deepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.keys(v).forEach((k) => deepFreeze(v[k]));
  }
  return v;
}

function safeGet(obj, key) {
  try { return obj[key]; } catch (e) { return undefined; }
}

/** A displayable-safe source string, or null with a reason. Never alters the value. */
function checkTermString(value) {
  if (typeof value !== 'string') return { ok: false, reason: 'not_a_string' };
  if (value.length === 0) return { ok: false, reason: 'empty' };
  if (value.trim().length === 0) return { ok: false, reason: 'blank' };
  if (value.length > MAX_TERM_LENGTH) return { ok: false, reason: 'too_long' };
  if (CONTROL_RE.test(value)) return { ok: false, reason: 'control_characters' };
  return { ok: true };
}

function sanitizeProvider(provider) {
  if (typeof provider !== 'string') return DEFAULT_PROVIDER;
  if (provider.length === 0 || provider.length > MAX_PROVIDER_LENGTH) return 'unknown';
  if (!/^[a-z0-9_.-]+$/.test(provider)) return 'unknown';
  return provider;
}

/**
 * Validate a proposed term registry. Fail-closed: any problem => valid:false.
 * Returns { valid, approved:false, errors:[string], termCount, codes:[string] }.
 */
function validateTermRegistry(registry) {
  const errors = [];
  const codes = [];
  const seen = Object.create(null);
  if (!isPlainObject(registry)) {
    return deepFreeze({ valid: false, approved: false, errors: ['registry_not_object'], termCount: 0, codes: [] });
  }
  if (safeGet(registry, 'schema') !== REGISTRY_SCHEMA) errors.push('registry_schema_mismatch');
  if (safeGet(registry, 'status') !== REGISTRY_STATUS) errors.push('registry_must_be_proposed_not_approved');
  if (safeGet(registry, 'runtime_activation') !== false) errors.push('registry_runtime_activation_must_be_false');
  if (safeGet(registry, 'review_required') !== true) errors.push('registry_review_required_must_be_true');

  Object.keys(KINDS).forEach((groupKey) => {
    const spec = KINDS[groupKey];
    const group = safeGet(registry, groupKey);
    if (!isPlainObject(group)) { errors.push(groupKey + '_group_missing'); return; }
    Object.keys(group).forEach((term) => {
      const entry = group[term];
      const t = checkTermString(term);
      if (!t.ok || term !== term.trim()) { errors.push(groupKey + ':invalid_term_key'); return; }
      if (!isPlainObject(entry)) { errors.push(groupKey + ':' + term + ':entry_not_object'); return; }
      const code = entry.code;
      if (typeof code !== 'string' || !CODE_RE.test(code) || code.indexOf(spec.prefix) !== 0) {
        errors.push(groupKey + ':' + term + ':code_not_namespaced');
        return;
      }
      if (typeof entry.label_nl !== 'string' || !checkTermString(entry.label_nl).ok) {
        errors.push(groupKey + ':' + term + ':label_nl_invalid');
        return;
      }
      if (seen[code]) { errors.push(groupKey + ':' + term + ':duplicate_code'); return; }
      seen[code] = true;
      codes.push(code);
    });
  });

  return deepFreeze({ valid: errors.length === 0, approved: false, errors, termCount: codes.length, codes });
}

/** All term identifiers (codes) in a valid registry, or [] if invalid. */
function listTermIdentifiers(registry) {
  const v = validateTermRegistry(registry);
  return v.valid ? v.codes.slice() : [];
}

function readTermList(raw) {
  // Returns { entries:[{index,value}], malformedContainer:boolean, truncated:boolean }
  if (raw === undefined || raw === null) return { entries: [], malformedContainer: false, truncated: false };
  if (!Array.isArray(raw)) return { entries: [], malformedContainer: true, truncated: false };
  const entries = [];
  let len = 0;
  try { len = raw.length; } catch (e) { return { entries: [], malformedContainer: true, truncated: false }; }
  const n = Math.min(len, MAX_TERMS);
  for (let i = 0; i < n; i++) entries.push({ index: i, value: safeGet(raw, i) });
  return { entries, malformedContainer: false, truncated: len > MAX_TERMS };
}

function projectGroup(raw, spec, group, provider, canMatch) {
  const { entries, malformedContainer, truncated } = readTermList(raw);
  const facets = [];
  const sourceTerms = [];
  const issues = [];
  if (malformedContainer) issues.push({ code: 'term_list_not_array' });
  if (truncated) issues.push({ code: 'term_list_truncated', max: MAX_TERMS });

  entries.forEach(({ index, value }) => {
    const check = checkTermString(value);
    if (!check.ok) {
      // Never echo a malformed value; record only its position and type.
      facets.push({
        kind: spec.kind, index, sourceTerm: null, provider,
        status: STATUS.INVALID, approved: false, code: null, labelNl: null, reason: check.reason
      });
      issues.push({ code: 'invalid_term', index, reason: check.reason, valueType: value === null ? 'null' : typeof value });
      return;
    }
    sourceTerms.push(value);
    let hit = null;
    if (canMatch && group && hasOwn(group, value)) {
      const e = group[value];
      hit = { code: e.code, labelNl: e.label_nl };
    }
    facets.push({
      kind: spec.kind, index, sourceTerm: value, provider,
      status: hit ? STATUS.PROPOSED : STATUS.UNAPPROVED,
      approved: false,
      code: hit ? hit.code : null,
      labelNl: hit ? hit.labelNl : null,
      reason: hit ? null : (canMatch ? 'not_in_proposed_registry' : 'provider_not_matchable')
    });
  });
  return { facets, sourceTerms, issues };
}

/**
 * Project supplier term arrays to display-only exact source facets.
 *
 * @param {{provider?:string, muscles?:any[], equipment?:any[]}} input explicit caller data
 * @param {object} registry proposed term registry (tools/movekit-v2-taxonomy-map.json shape)
 * @returns frozen plain object; approved:false always; runtimeActivation:false always.
 *   If the registry is invalid, no label is attached (all terms stay unapproved).
 */
function projectSourceFacets(input, registry) {
  const validation = validateTermRegistry(registry);
  const src = isPlainObject(input) ? input : {};
  const provider = sanitizeProvider(safeGet(src, 'provider'));
  const canMatch = validation.valid && provider === MATCHING_PROVIDER;
  const issues = [];
  if (!isPlainObject(input)) issues.push({ code: 'input_not_object' });
  if (!validation.valid) issues.push({ code: 'registry_invalid', errors: validation.errors.slice() });

  const out = { schema: SCHEMA, approved: false, displayOnly: true, runtimeActivation: false,
    namespace: NAMESPACE, provider, registryStatus: REGISTRY_STATUS, registryValid: validation.valid,
    muscles: [], equipment: [], sourceTerms: { muscles: [], equipment: [] }, issues };

  Object.keys(KINDS).forEach((groupKey) => {
    const spec = KINDS[groupKey];
    const group = validation.valid ? registry[groupKey] : null;
    const r = projectGroup(safeGet(src, groupKey), spec, group, provider, canMatch);
    out[groupKey] = r.facets;
    out.sourceTerms[groupKey] = r.sourceTerms;
    r.issues.forEach((i) => issues.push(Object.assign({ group: groupKey }, i)));
  });
  return deepFreeze(JSON.parse(JSON.stringify(out)));
}

module.exports = Object.freeze({
  SCHEMA, REGISTRY_SCHEMA, REGISTRY_STATUS, NAMESPACE, STATUS,
  RUNTIME_ACTIVATION: false,
  APPROVED: false,
  limits: Object.freeze({ MAX_TERMS, MAX_TERM_LENGTH }),
  validateTermRegistry,
  listTermIdentifiers,
  projectSourceFacets
});
