/* core/nutritionSupplementEducationService.js — SUP-EVIDENCE-02.
 *
 * De ENIGE plek die bepaalt welke, al-vaststaande claims een
 * gebruiker/AI mag zien. Genereert nooit een nieuwe claim, verandert
 * nooit een evidence_level, en voert geen enkele berekening op
 * gebruikersgegevens uit (geen mg/kg x gewicht, geen personalisatie --
 * dat is expliciet toekomstig werk via Calculation/Context/Decision
 * Engine, hier bewust niet gebouwd).
 *
 * HARD FILTERCONTRACT (SUP-EVIDENCE-02 sectie 8):
 *   VERIFIED + ready_for_production=true  -> zichtbaar, output_mode bepaalt vorm
 *   INSUFFICIENT                          -> nooit GUIDANCE, alleen UNCERTAINTY_EDUCATION indien user_visible
 *   REVISE                                -> nooit output (bestaat vandaag niet in de registry, maar toch afgedwongen)
 *   REMOVE                                -> nooit output
 *   HIDDEN (output_mode)                  -> nooit user/AI-zichtbaar, ongeacht status
 *   requires_medical_referral=true        -> referral-info verplicht meegenomen in de output
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./nutritionSupplementCatalog.js'), require('./nutritionSupplementEvidenceRegistry.js'), require('./nutritionSupplementSourceRegistry.js'));
  } else {
    root.NutritionSupplementEducationService = factory(root.NutritionSupplementCatalog, root.NutritionSupplementEvidenceRegistry, root.NutritionSupplementSourceRegistry);
  }
}(typeof self !== 'undefined' ? self : this, function (Catalog, EvidenceRegistry, SourceRegistry) {
  'use strict';

  var SERVICE_VERSION = 'supplement_education_service.v1';

  /* isClaimReleasable: het enige filterpunt. Puur, geen randgevallen
   * stilzwijgend toegestaan. */
  function isClaimReleasable(claim) {
    if (!claim) return false;
    if (claim.output_mode === 'HIDDEN') return false;
    if (!claim.user_visible) return false;
    if (!claim.ready_for_production) return false;
    if (claim.evidence_status === 'REVISE' || claim.evidence_status === 'REMOVE') return false;
    if (claim.evidence_status === 'INSUFFICIENT' && claim.output_mode === 'GUIDANCE') return false; // INSUFFICIENT mag nooit als aanbeveling
    return claim.evidence_status === 'VERIFIED' || claim.evidence_status === 'INSUFFICIENT';
  }

  function releasableClaims(supplementId) {
    return EvidenceRegistry.bySupplementId(supplementId).filter(isClaimReleasable);
  }

  function isExpired(claim, nowIso) {
    if (!claim || !claim.review_due_at) return false;
    var now = nowIso ? new Date(nowIso) : new Date();
    return new Date(claim.review_due_at) < now;
  }

  /* resolveSources: vertaalt source_ids naar de volledige, traceerbare
   * bronrecords -- nooit een losse string, altijd het echte record. */
  function resolveSources(sourceIds) {
    return (sourceIds || []).map(function (id) { return SourceRegistry.getById(id); }).filter(Boolean);
  }

  /* getSupplementEducation({supplementId, context}) -> deterministisch
   * educatie-object, of {status:'NOT_FOUND'}/{status:'NO_CONTENT'} als
   * er niets te tonen is. `context` is bewust ongebruikt in deze
   * sprint (geen personalisatie) -- aanwezig voor toekomstige,
   * expliciet-toegestane uitbreiding (bv. sport_context-filtering),
   * nooit voor een berekening. */
  function getSupplementEducation(opts) {
    var o = opts || {};
    var item = Catalog.getById(o.supplementId);
    if (!item) return { status: 'NOT_FOUND', schema: SERVICE_VERSION };

    var claims = releasableClaims(o.supplementId);
    if (!claims.length) {
      return {
        status: 'NO_CONTENT', schema: SERVICE_VERSION,
        supplement_id: item.supplement_id, canonical_name: item.canonical_name,
        evidence_coverage_status: item.evidence_coverage_status
      };
    }

    var approved = claims.map(function (c) {
      return {
        evidence_id: c.evidence_id,
        claim_key: c.claim_key,
        evidence_level: c.evidence_level,
        evidence_status: c.evidence_status,
        output_mode: c.output_mode,
        user_visible_summary: c.user_visible_summary,
        user_visible_evidence_label: c.user_visible_evidence_label,
        limitations: (c.limitations || []).slice(),
        safety_notes: (c.safety_notes || []).slice(),
        contraindications: (c.contraindications || []).slice(),
        interaction_notes: (c.interaction_notes || []).slice(),
        requires_medical_referral: !!c.requires_medical_referral,
        source_ids: (c.sources || []).slice(),
        sources: resolveSources(c.sources),
        expired: isExpired(c, o.now)
      };
    });

    var medicalReferrals = approved.filter(function (c) { return c.requires_medical_referral; });
    var safetyWarnings = approved.filter(function (c) { return c.output_mode === 'SAFETY_WARNING'; });
    var uncertainty = approved.filter(function (c) { return c.output_mode === 'UNCERTAINTY_EDUCATION'; });
    var guidance = approved.filter(function (c) { return c.output_mode === 'GUIDANCE'; });

    return {
      status: 'OK', schema: SERVICE_VERSION,
      supplement_id: item.supplement_id,
      canonical_name: item.canonical_name,
      entity_type: item.entity_type,
      common_use: item.common_use,
      evidence_coverage_status: item.evidence_coverage_status,
      claims: approved,
      guidance: guidance,
      uncertainty_education: uncertainty,
      safety_warnings: safetyWarnings,
      medical_referrals: medicalReferrals,
      has_expired_evidence: approved.some(function (c) { return c.expired; }),
      evidence_ids: approved.map(function (c) { return c.evidence_id; }),
      source_ids: Array.prototype.concat.apply([], approved.map(function (c) { return c.source_ids; })).filter(function (v, i, a) { return a.indexOf(v) === i; })
    };
  }

  /* resolveBySearch: hergebruikt Catalog.bySynonymOrName -- geen
   * tweede naam-matchlogica. */
  function getSupplementEducationByName(nameOrSynonym, opts) {
    var item = Catalog.bySynonymOrName(nameOrSynonym);
    if (!item) return { status: 'NOT_FOUND', schema: SERVICE_VERSION };
    return getSupplementEducation(Object.assign({}, opts || {}, { supplementId: item.supplement_id }));
  }

  var NutritionSupplementEducationService = {
    SERVICE_VERSION: SERVICE_VERSION,
    isClaimReleasable: isClaimReleasable,
    releasableClaims: releasableClaims,
    isExpired: isExpired,
    resolveSources: resolveSources,
    getSupplementEducation: getSupplementEducation,
    getSupplementEducationByName: getSupplementEducationByName
  };

  return NutritionSupplementEducationService;
}));
