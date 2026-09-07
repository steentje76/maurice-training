/* core/nutritionKnowledgeService.js — NK-01.
 *
 * Enige plek die topic-content (nutritionKnowledgeTopics.js) koppelt
 * aan feitelijke evidence -- ofwel uit nutritionKnowledgeEvidenceRegistry.js
 * (nieuw), ofwel uit nutritionSupplementEvidenceRegistry.js (reeds
 * gecertificeerd, hergebruikt, NOOIT gedupliceerd). Zelfde harde
 * filtercontract als nutritionSupplementEducationService.js:
 *   VERIFIED + ready/niet-REMOVE -> zichtbaar
 *   INSUFFICIENT                -> nooit als bewezen advies, alleen als
 *                                  expliciete onzekerheid
 *   REVISE/REMOVE                -> nooit production-output
 *
 * ARCHITECTUURGRENS (sectie 1/8 van de opdracht): dit bestand berekent
 * NIETS. Geen gewicht x mg/kg, geen persoonlijke doelen. Het
 * onderscheid GENERAL EDUCATION vs PERSONALISED TARGET is hier
 * structureel afgedwongen: er bestaat geen enkele functie die
 * gebruikersinvoer (gewicht, doel) accepteert.
 *
 * AI-CONTRACT (sectie 11/12): buildAiContext() is GEEN live AI-aanroep.
 * Het is een pure, deterministische samenstelling van reeds
 * goedgekeurde claims voor één specifieke, vooraf gedefinieerde
 * FAQ-vraag. Er wordt nooit vrije tekst gegenereerd en nooit een
 * source-ID verzonnen -- elke SOURCE_REFERENCE komt rechtstreeks uit
 * een van de twee Source Registries.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./nutritionKnowledgeTopics.js'),
      require('./nutritionKnowledgeEvidenceRegistry.js'),
      require('./nutritionKnowledgeSources.js'),
      require('./nutritionSupplementEvidenceRegistry.js'),
      require('./nutritionSupplementSourceRegistry.js')
    );
  } else {
    root.NutritionKnowledgeService = factory(
      root.NutritionKnowledgeTopics, root.NutritionKnowledgeEvidenceRegistry, root.NutritionKnowledgeSources,
      root.NutritionSupplementEvidenceRegistry, root.NutritionSupplementSourceRegistry
    );
  }
}(typeof self !== 'undefined' ? self : this, function (Topics, KnowledgeEvidence, KnowledgeSources, SupplementEvidence, SupplementSources) {
  'use strict';

  var SERVICE_VERSION = 'nutrition_knowledge_service.v1';

  /* resolveClaim: normaliseert een claim uit OFWEL registry naar één
   * gedeelde vorm. Dit is de kern van het "gedeeld model" (sectie 2) --
   * geen fysieke samenvoeging van de twee brondata-bestanden (dat zou
   * de al-geteste Supplement Evidence Registry destabiliseren), wel één
   * uniforme lezing ervan. */
  function resolveClaim(claimId) {
    var nk = KnowledgeEvidence.getById(claimId);
    if (nk) {
      return {
        claim_id: nk.claim_id, origin: 'KNOWLEDGE',
        evidence_level: nk.evidence_level, status: nk.status,
        confidence: KnowledgeEvidence.confidenceLabel(nk.evidence_level, nk.status),
        population: nk.population, context: nk.context,
        supported_outcomes: (nk.supported_outcomes || []).slice(),
        limitations: (nk.limitations || []).slice(),
        forbidden_interpretations: (nk.forbidden_interpretations || []).slice(),
        allowed_ai_use: !!nk.allowed_ai_use,
        user_friendly_summary: nk.user_friendly_summary,
        source_ids: (nk.source_ids || []).slice(),
        last_reviewed: nk.last_reviewed
      };
    }
    var sup = SupplementEvidence.getById(claimId);
    if (sup) {
      return {
        claim_id: sup.evidence_id, origin: 'SUPPLEMENT_EVIDENCE',
        evidence_level: sup.evidence_level, status: sup.evidence_status,
        confidence: KnowledgeEvidence.confidenceLabel(sup.evidence_level, sup.evidence_status),
        population: sup.population, context: sup.sport_context,
        supported_outcomes: sup.outcome ? [sup.outcome] : [],
        limitations: (sup.limitations || []).slice(),
        forbidden_interpretations: (sup.forbidden_interpretations || []).slice(),
        allowed_ai_use: !!sup.allowed_ai_use,
        user_friendly_summary: sup.user_visible_summary,
        source_ids: (sup.sources || []).slice(),
        last_reviewed: sup.last_verified_at
      };
    }
    return null;
  }

  function resolveSource(sourceId) {
    return KnowledgeSources.getById(sourceId) || SupplementSources.getById(sourceId) || null;
  }

  /* isClaimReleasable: zelfde harde regels als de Supplement
   * EducationService, hier expliciet herhaald zodat deze module ook
   * zelfstandig leesbaar/testbaar is. GEEN-summary betekent in beide
   * bronregistries altijd een architectuur-/HIDDEN-claim (nooit een per
   * ongeluk vergeten tekst) -- daarom is een ontbrekende
   * user_friendly_summary hier, net als output_mode HIDDEN in de
   * Supplement-registry, een harde reden om nooit door te geven. */
  function isClaimReleasable(resolved) {
    if (!resolved) return false;
    if (!resolved.user_friendly_summary) return false;
    if (resolved.status === 'REVISE' || resolved.status === 'REMOVE') return false;
    return resolved.status === 'VERIFIED' || resolved.status === 'INSUFFICIENT';
  }

  function resolveRefs(evidenceRefs) {
    return (evidenceRefs || [])
      .map(resolveClaim)
      .filter(isClaimReleasable)
      .map(function (c) {
        return Object.assign({}, c, { sources: c.source_ids.map(resolveSource).filter(Boolean) });
      });
  }

  /* getTopicOverview: NIVEAU 1 -- snel antwoord. */
  function getTopicOverview(topicId) {
    var topic = Topics.getTopic(topicId);
    if (!topic) return { status: 'NOT_FOUND' };
    var quick = resolveClaim(topic.quick_summary_evidence_ref);
    return {
      status: 'OK', schema: SERVICE_VERSION,
      topic_id: topic.topic_id, domain: topic.domain, display_name: topic.display_name,
      quick_summary_text: topic.quick_summary_text,
      quick_summary_confidence: quick ? quick.confidence : null
    };
  }

  /* getSection: NIVEAU 2 -- meer uitleg per sectie, met opgeloste,
   * toegestane claims (nooit de ruwe claim_text_internal, alleen
   * user_friendly_summary + metadata). */
  function getSection(topicId, sectionId) {
    var topic = Topics.getTopic(topicId);
    if (!topic) return { status: 'NOT_FOUND' };
    var section = topic.sections.filter(function (s) { return s.section_id === sectionId; })[0];
    if (!section) return { status: 'NOT_FOUND' };
    return {
      status: 'OK', schema: SERVICE_VERSION,
      topic_id: topicId, section_id: section.section_id, title: section.title, body: section.body,
      claims: resolveRefs(section.evidence_refs)
    };
  }

  function getAllSections(topicId) {
    var topic = Topics.getTopic(topicId);
    if (!topic) return [];
    return topic.sections.map(function (s) { return getSection(topicId, s.section_id); });
  }

  /* getScienceDetail: NIVEAU 3 -- alle claims van het topic met volledig
   * bewijsniveau/confidence/populatie/context/beperkingen/bronnen. */
  function getScienceDetail(topicId) {
    var topic = Topics.getTopic(topicId);
    if (!topic) return { status: 'NOT_FOUND' };
    var allRefs = [];
    topic.sections.forEach(function (s) { (s.evidence_refs || []).forEach(function (r) { if (allRefs.indexOf(r) === -1) allRefs.push(r); }); });
    return { status: 'OK', schema: SERVICE_VERSION, topic_id: topicId, claims: resolveRefs(allRefs) };
  }

  function getFaq(topicId) {
    var topic = Topics.getTopic(topicId);
    if (!topic) return { status: 'NOT_FOUND' };
    return {
      status: 'OK', schema: SERVICE_VERSION, topic_id: topicId,
      items: topic.faq.map(function (f) {
        return { faq_id: f.faq_id, question: f.question, claims: resolveRefs(f.evidence_refs) };
      })
    };
  }

  /* buildAiContext: het AI Output Contract (sectie 12). Puur, geen
   * netwerk/LLM-aanroep -- een deterministisch samengesteld object voor
   * een vooraf gedefinieerde FAQ-vraag. De UI mag dit als "veilig
   * AI-prototype" tonen (structured preview), nooit als vrij chatgesprek. */
  function buildAiContext(topicId, faqId) {
    var topic = Topics.getTopic(topicId);
    if (!topic) return { status: 'NOT_FOUND' };
    var faqItem = topic.faq.filter(function (f) { return f.faq_id === faqId; })[0];
    if (!faqItem) return { status: 'NOT_FOUND' };
    var resolved = resolveRefs(faqItem.evidence_refs);
    // AI mag alleen claims met allowed_ai_use=true daadwerkelijk gebruiken.
    var aiApproved = resolved.filter(function (c) { return c.allowed_ai_use; });
    var known = aiApproved.filter(function (c) { return c.status === 'VERIFIED'; });
    var uncertain = aiApproved.filter(function (c) { return c.status === 'INSUFFICIENT'; });
    var safety = [];
    aiApproved.forEach(function (c) { (c.limitations || []).forEach(function (l) { if (safety.indexOf(l) === -1) safety.push(l); }); });
    var forbidden = [];
    aiApproved.forEach(function (c) { (c.forbidden_interpretations || []).forEach(function (f) { if (forbidden.indexOf(f) === -1) forbidden.push(f); }); });
    var sourceRefs = [];
    aiApproved.forEach(function (c) { (c.sources || []).forEach(function (s) { if (sourceRefs.indexOf(s.source_id) === -1) sourceRefs.push(s.source_id); }); });

    return {
      status: 'OK', schema: SERVICE_VERSION,
      TOPIC: topic.display_name,
      QUESTION: faqItem.question,
      APPROVED_FACTS: known.map(function (c) { return c.user_friendly_summary; }),
      EVIDENCE_LEVEL: known.map(function (c) { return c.evidence_level; }),
      CONFIDENCE: known.map(function (c) { return c.confidence; }),
      CONTEXT: known.map(function (c) { return c.context; }).filter(Boolean),
      LIMITATIONS: safety,
      SAFETY_BOUNDARIES: aiApproved.some(function (c) { return c.status === 'INSUFFICIENT'; }) ? ['Voor dit onderwerp is het bewijs nog niet sluitend -- presenteer dit nooit als bewezen advies.'] : [],
      MISSING_INFORMATION: uncertain.map(function (c) { return c.user_friendly_summary; }),
      FORBIDDEN_INTERPRETATIONS: forbidden,
      SOURCE_REFERENCES: sourceRefs.map(resolveSource).filter(Boolean).map(function (s) { return { source_id: s.source_id, title: s.title, organisation: s.authors_or_organisation, year: (s.publication_date || '').slice(0, 4) }; })
    };
  }

  function getRoadmap() { return Topics.ROADMAP.slice(); }

  var NutritionKnowledgeService = {
    SERVICE_VERSION: SERVICE_VERSION,
    resolveClaim: resolveClaim,
    resolveSource: resolveSource,
    isClaimReleasable: isClaimReleasable,
    getTopicOverview: getTopicOverview,
    getSection: getSection,
    getAllSections: getAllSections,
    getScienceDetail: getScienceDetail,
    getFaq: getFaq,
    buildAiContext: buildAiContext,
    getRoadmap: getRoadmap
  };

  return NutritionKnowledgeService;
}));
