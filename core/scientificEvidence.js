/* ==========================================================================
 * TrainingKompas — SCIENTIFIC EVIDENCE CORE (Phase C)  evidence_store.v1
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen fetch, geen AI,
 * geen Date.now/Math.random. INPUT -> OUTPUT.
 *
 * Keten: SOURCE → EVIDENCE → VALIDATION → METADATA → CALCULATION → DECISION → COACHING.
 *
 * HARDE REGELS:
 *  - Een evidence-entry zonder voldoende metadata is UNVALIDATED.
 *  - UNVALIDATED evidence mag GEEN Decision Rule voeden (ruleBacking → backed:false).
 *  - AI mag NOOIT een entry verzinnen: dit module CREËERT geen inhoud, het VALIDEERT alleen
 *    door de mens aangeleverde entries en lost regel-referenties (evidenceRefs) deterministisch op.
 *
 * Complementair aan DecisionCore.Evidence.buildEvidence (dat legt de INTERNE reken-/regel-
 * provenance vast: "welke calc/regel/versie leidde tot deze uitkomst"). Dit module legt de
 * EXTERNE wetenschappelijke onderbouwing van een regel vast ("welke literatuur staat erachter").
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { store: 'evidence_store.v1', ref: 'evidence_ref.v1' };

  // Metadata die minimaal aanwezig moet zijn voordat een entry een regel mag voeden.
  var REQUIRED_META = ['id', 'source', 'title', 'date', 'identifier', 'study_type', 'confidence', 'validated_by'];
  // Erkende studietypes (hiërarchie hoog→laag); onbekend type telt als ontbrekend.
  var STUDY_TYPES = ['meta_analysis', 'systematic_review', 'rct', 'cohort', 'observational', 'guideline', 'consensus'];

  function isBlank(v){ return v === undefined || v === null || (typeof v === 'string' && v.trim() === ''); }

  // Valideer één entry → status + welke velden ontbreken. Geen fabricage.
  function validateEntry(entry){
    entry = entry || {};
    var missing = [];
    REQUIRED_META.forEach(function (k){ if (isBlank(entry[k])) missing.push(k); });
    if (!isBlank(entry.study_type) && STUDY_TYPES.indexOf(String(entry.study_type)) === -1) {
      missing.push('study_type:onbekend(' + entry.study_type + ')');
    }
    return { status: missing.length === 0 ? 'validated' : 'unvalidated', missing: missing, id: entry.id != null ? entry.id : null };
  }

  // Deterministische identiteit: expliciete id, anders source:identifier (bv. doi).
  function evidenceId(entry){
    entry = entry || {};
    if (!isBlank(entry.id)) return String(entry.id);
    if (!isBlank(entry.source) && !isBlank(entry.identifier)) return String(entry.source).toLowerCase() + ':' + String(entry.identifier);
    return null;
  }

  // Ref-parsing: "id@version" → {id, version}. Zonder @ → version null.
  function parseRef(ref){
    if (isBlank(ref)) return { id: null, version: null };
    var s = String(ref);
    var at = s.lastIndexOf('@');
    if (at === -1) return { id: s, version: null };
    return { id: s.slice(0, at), version: s.slice(at + 1) };
  }

  // Bouw een store (index op id) uit entries; markeert per entry de validatiestatus.
  function makeStore(entries){
    var byId = {};
    (entries || []).forEach(function (e){
      var id = evidenceId(e);
      if (id == null) return; // geen id → niet indexeerbaar (genegeerd, niet gefabriceerd)
      var v = validateEntry(e);
      byId[id] = { entry: e, status: v.status, missing: v.missing, version: e.version != null ? String(e.version) : null };
    });
    return {
      schema: VERSIONS.store,
      get: function (id){ return byId[id] || null; },
      has: function (id){ return Object.prototype.hasOwnProperty.call(byId, id); },
      ids: function (){ return Object.keys(byId); },
      _byId: byId
    };
  }

  // Los een set evidenceRefs op tegen de store.
  //  → { allValidated, resolved:[id], missing:[ref], unvalidated:[id], versionMismatch:[ref] }
  function resolveRefs(refs, store){
    var resolved = [], missing = [], unvalidated = [], versionMismatch = [];
    (refs || []).forEach(function (ref){
      var p = parseRef(ref);
      if (p.id == null || !store || !store.has(p.id)) { missing.push(ref); return; }
      var rec = store.get(p.id);
      if (p.version != null && rec.version != null && p.version !== rec.version) { versionMismatch.push(ref); return; }
      if (rec.status !== 'validated') { unvalidated.push(p.id); return; }
      resolved.push(p.id);
    });
    var allValidated = (missing.length === 0 && unvalidated.length === 0 && versionMismatch.length === 0 && resolved.length > 0);
    return { allValidated: allValidated, resolved: resolved, missing: missing, unvalidated: unvalidated, versionMismatch: versionMismatch };
  }

  // Mag een regel (met rule.evidenceRefs) als wetenschappelijk onderbouwd gelden?
  // backed=true ALLEEN als alle refs bestaan, versie klopt en elke bron validated is.
  // Een regel ZONDER refs → backed:false, reason 'no-refs' (geen stille onderbouwing).
  function ruleBacking(rule, store){
    rule = rule || {};
    var refs = rule.evidenceRefs || [];
    if (!refs.length) return { backed: false, reason: 'no-refs', resolved: [], missing: [], unvalidated: [] };
    var r = resolveRefs(refs, store);
    var reason = r.allValidated ? null
      : (r.missing.length ? 'missing-evidence'
      : (r.unvalidated.length ? 'unvalidated-evidence'
      : (r.versionMismatch.length ? 'version-mismatch' : 'unknown')));
    return { backed: r.allValidated, reason: reason, resolved: r.resolved, missing: r.missing, unvalidated: r.unvalidated, versionMismatch: r.versionMismatch };
  }

  var EvidenceCore = {
    VERSIONS: VERSIONS, REQUIRED_META: REQUIRED_META, STUDY_TYPES: STUDY_TYPES,
    validateEntry: validateEntry, evidenceId: evidenceId, parseRef: parseRef,
    makeStore: makeStore, resolveRefs: resolveRefs, ruleBacking: ruleBacking
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = EvidenceCore; }
  else if (global) { global.EvidenceCore = EvidenceCore; }
})(typeof self !== 'undefined' ? self : this);
