/* ==========================================================================
 * TrainingKompas — CONTEXT ENGINE CORE  (Unified Sport & Data Architecture, fundering)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen browser-opslag, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: de Context Engine LEVERT context, ze REKENT niet (dat is CalcCore) en
 * BESLIST niet (dat is DecisionCore). Dit bestand is additief naast de
 * bestaande buildCtx() in index.html — het VERVANGT buildCtx() niet en wordt
 * in deze sprint nog NERGENS aangeroepen vanuit index.html (geen pushtoegang
 * deze sessie om dat te bedraden; zie implementatierapport).
 *
 * Input is een reeds-opgehaalde, platte databag (de aanroeper doet alle
 * Supabase/fetch-calls elders, precies zoals bij CalcCore/DecisionCore) —
 * dit bestand combineert die bag uitsluitend tot een vaste, versioned vorm.
 *
 * ONDERSTEUNT (Fase 10 van de sprintopdracht): een atleet met MEERDERE
 * gelijktijdige sportcontexten. mergeAthleteContexts() telt/somt NIETS op
 * (dat blijft CalcCore) — het verzamelt uitsluitend welke sporten actief zijn.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { context: 'context_engine.v1', membership: 'membership_context.v1' };

  // buildStructuredContext: zet een platte input-bag om in een vaste,
  // versioned StructuredContext. Geen enkel veld wordt hier berekend of
  // geïnterpreteerd — alleen samengesteld/genormaliseerd naar vorm.
  function buildStructuredContext(input) {
    var i = input || {};
    return {
      version: VERSIONS.context,
      athlete: {
        id: i.athleteId != null ? String(i.athleteId) : null,
        level: i.level != null ? String(i.level) : null
      },
      sport: {
        id: i.sportId != null ? String(i.sportId) : null,
        label: i.sportLabel != null ? String(i.sportLabel) : null
      },
      goal: i.goal != null ? i.goal : null,
      trainingPhase: i.trainingPhase != null ? String(i.trainingPhase) : null,
      membership: normalizeMembership(i.membership),
      generatedAt: i.generatedAt != null ? String(i.generatedAt) : null
    };
  }

  // normalizeMembership: null = personal-only (het huidige, enige bestaande gedrag
  // van de app vandaag) — GEEN membership-object aanmaken waar er geen is.
  function normalizeMembership(m) {
    if (!m || typeof m !== 'object') return null;
    return {
      version: VERSIONS.membership,
      organizationId: m.organizationId != null ? String(m.organizationId) : null,
      teamId: m.teamId != null ? String(m.teamId) : null,
      trainingGroupId: m.trainingGroupId != null ? String(m.trainingGroupId) : null,
      role: m.role != null ? String(m.role) : 'athlete',
      status: m.status != null ? String(m.status) : 'active'
    };
  }

  // mergeAthleteContexts: Fase 10 — één atleet, meerdere gelijktijdige sport-
  // contexten (bv. CrossFit + Running + individuele kracht in dezelfde week).
  // Verzamelt uitsluitend WELKE sporten/contexten actief zijn; berekent geen
  // belasting/load — dat blijft expliciet aan CalcCore voorbehouden.
  function mergeAthleteContexts(contexts) {
    var list = (contexts || []).filter(function (c) { return c && c.sport && c.sport.id; });
    var seen = {};
    var activeSports = [];
    list.forEach(function (c) {
      if (!seen[c.sport.id]) { seen[c.sport.id] = true; activeSports.push(c.sport.id); }
    });
    return {
      version: VERSIONS.context,
      activeSports: activeSports,
      primarySportId: activeSports.length ? activeSports[0] : null,
      contextCount: list.length
    };
  }

  // validateMembership: puur-structurele guard (geen RLS-vervanger — de database-RLS
  // blijft de daadwerkelijke handhaving; dit is uitsluitend een client-side sanity-check
  // vóórdat een context aan de Decision Engine/AI wordt doorgegeven).
  function validateMembership(membership) {
    if (membership == null) return { valid: true, reason: 'personal-only, geen membership vereist' };
    if (typeof membership !== 'object') return { valid: false, reason: 'membership moet een object zijn' };
    if (!membership.organizationId) return { valid: false, reason: 'organizationId ontbreekt' };
    return { valid: true, reason: null };
  }

  var ContextEngineCore = {
    buildStructuredContext: buildStructuredContext,
    normalizeMembership: normalizeMembership,
    mergeAthleteContexts: mergeAthleteContexts,
    validateMembership: validateMembership,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = ContextEngineCore; }
  if (global) { global.ContextEngineCore = ContextEngineCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
