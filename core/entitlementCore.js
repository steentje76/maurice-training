/* ==========================================================================
 * TrainingKompas — ENTITLEMENT CORE  (F12, MS-F12-01)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: de ENIGE, canonieke autoriteit voor "heeft deze actor/product-
 * combinatie deze commerciële capability?". Vervangt principieel elke
 * verspreide "plan === 'premium'"/"isPro"-check.
 *
 * KRITIEK, ABSOLUUT ONDERSCHEID: entitlements =/= security. Deze module
 * bepaalt NOOIT of een actor gegevens mag BENADEREN (dat blijft RLS/de
 * database) -- uitsluitend of een reeds geautoriseerde actor een
 * COMMERCIËLE capability heeft. Een resultaat van deze module mag NOOIT
 * worden gebruikt om een RLS-beslissing te overstemmen of te vervangen.
 *
 * VEILIGHEIDSFUNCTIES ZIJN NOOIT ENTITLEMENT-AFHANKELIJK: account
 * verwijderen, consent intrekken, privacy-instellingen, data-export, en de
 * Calculation/Decision-waarheid zelf bestaan volledig BUITEN dit systeem
 * en worden hier bewust niet eens gemodelleerd -- ze zijn nooit een
 * "capability" die ontzegd kan worden.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'entitlement.v1' };

  // Canonieke rolvolgorde voor "welke entitlement wint bij combinatie":
  // hoger scorende bron wint NOOIT capabilities weg van een lagere bron --
  // entitlements STAPELEN (union van alle geldige bronnen), ze verdringen
  // elkaar nooit. Zie resolveEntitlements() hieronder.
  var SOURCE_PRIORITY = { organization: 3, coach_grant: 2, subscription: 1, default: 0 };

  /* resolveEntitlements(actor, catalog): actor = { userId, planKey (eigen
   * abonnement, incl. status/expiry), organizationMemberships: [{organizationId,
   * planKey, status, role}], now (Date, voor testbaarheid) }. catalog =
   * { planFeatures: [{plan_key, feature_key}], planQuota: [{plan_key,
   * feature_key, quota_per_maand}] }.
   *
   * Retourneert altijd een volledig, veilig object -- nooit undefined. */
  function resolveEntitlements(actor, catalog) {
    var out = { capabilities: {}, quota: {}, sources: {} };
    if (!actor) return out;
    catalog = catalog || { planFeatures: [], planQuota: [] };

    var effectivePlans = collectEffectivePlans(actor);
    var onbeperkteFeatures = {}; // feature_key -> true zodra een geldig plan de feature geeft zonder eigen quota-rij

    effectivePlans.forEach(function (p) {
      var features = (catalog.planFeatures || []).filter(function (pf) { return pf.plan_key === p.planKey; });
      features.forEach(function (pf) {
        out.capabilities[pf.feature_key] = true;
        var huidigePrioriteit = SOURCE_PRIORITY[out.sources[pf.feature_key]] || -1;
        var nieuwePrioriteit = SOURCE_PRIORITY[p.source] || 0;
        if (nieuwePrioriteit >= huidigePrioriteit) out.sources[pf.feature_key] = p.source;

        var eigenQuota = (catalog.planQuota || []).find(function (q) { return q.plan_key === p.planKey && q.feature_key === pf.feature_key; });
        if (!eigenQuota) onbeperkteFeatures[pf.feature_key] = true; // dit plan geeft de feature zonder beperking
      });
    });

    (catalog.planQuota || []).forEach(function (q) {
      var planIsEffectief = effectivePlans.some(function (p) { return p.planKey === q.plan_key; });
      if (!planIsEffectief) return;
      if (out.quota[q.feature_key] === undefined || q.quota_per_maand > out.quota[q.feature_key]) {
        out.quota[q.feature_key] = q.quota_per_maand;
      }
    });

    // Een plan dat de feature ONBEPERKT geeft (geen eigen quota-rij) wint
    // ALTIJD van een beperktere quota die een ander, eveneens actief plan
    // toevallig ook zou opleggen (bijv. het altijd-aanwezige gratis-
    // basisplan). Nooit het gebruikersvoordeel beperken door de laagste
    // van meerdere geldige bronnen te kiezen.
    Object.keys(onbeperkteFeatures).forEach(function (featureKey) {
      delete out.quota[featureKey];
    });

    return out;
  }

  /* collectEffectivePlans: puur, deterministisch. Bepaalt welke plannen
   * daadwerkelijk ACTIEF zijn voor deze actor op tijdstip `now` --
   * expired/cancelled-na-period-end/unknown/malformed plannen worden
   * genegeerd (nooit een crash, nooit een onterecht toegekende capability). */
  function collectEffectivePlans(actor) {
    var now = actor.now instanceof Date ? actor.now : new Date();
    var result = [{ planKey: 'gratis', source: 'default' }]; // iedereen heeft minimaal de gratis-plan-capabilities

    if (actor.planKey && isPlanActive(actor, now)) {
      result.push({ planKey: actor.planKey, source: 'subscription' });
    }

    (actor.organizationMemberships || []).forEach(function (m) {
      if (m && m.status === 'active' && typeof m.planKey === 'string' && m.planKey) {
        result.push({ planKey: m.planKey, source: 'organization' });
      }
    });

    return result;
  }

  /* isPlanActive: expired/cancelled-at-period-end/grace-logica. Een
   * ontbrekend of onherkenbaar veld leidt NOOIT tot een crash of tot het
   * onterecht toekennen van een betaald plan -- bij twijfel: inactief. */
  function isPlanActive(actor, now) {
    if (!actor.subscriptionStatus) return true; // geen expliciete status bekend: veronderstel actief (bijv. lifetime/gratis-plan zonder expiry-concept)
    var status = actor.subscriptionStatus;
    if (status === 'active' || status === 'trial') return true;
    if (status === 'cancel_at_period_end') {
      // Blijft actief TOT period end -- geen directe intrekking bij cancel.
      if (!actor.expiresAt) return false;
      var expires = new Date(actor.expiresAt);
      return !isNaN(expires.getTime()) && expires.getTime() > now.getTime();
    }
    if (status === 'grace') return true; // grace-periode: capabilities blijven actief
    // 'expired', 'past_due', 'suspended', 'refunded', of een onbekende/malformed status: inactief.
    return false;
  }

  /* hasCapability: het canonieke, enige toegestane vervangingspatroon voor
   * "plan === 'premium'"/"isPro". */
  function hasCapability(entitlements, featureKey) {
    return !!(entitlements && entitlements.capabilities && entitlements.capabilities[featureKey] === true);
  }

  /* getQuota: retourneert null wanneer geen quota-rij bestaat voor deze
   * combinatie (= onbeperkt binnen de toegekende capability), of het
   * hoogste geldige maandquotum. */
  function getQuota(entitlements, featureKey) {
    if (!entitlements || !entitlements.quota || entitlements.quota[featureKey] === undefined) return null;
    return entitlements.quota[featureKey];
  }

  var EntitlementCore = {
    VERSIONS: VERSIONS,
    SOURCE_PRIORITY: SOURCE_PRIORITY,
    resolveEntitlements: resolveEntitlements,
    hasCapability: hasCapability,
    getQuota: getQuota
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = EntitlementCore; }
  else { global.EntitlementCore = EntitlementCore; }
})(typeof window !== 'undefined' ? window : this);
