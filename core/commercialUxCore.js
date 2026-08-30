/* ==========================================================================
 * TrainingKompas — COMMERCIAL UX CORE  (F12, MS-F12-03)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: de ENIGE, canonieke bron voor "wat moet de commerciële UX tonen?".
 * Consumeert uitsluitend EntitlementCore-output en de catalogus (plans/
 * features/quota) -- NOOIT een eigen, tweede plan-beslissing. Vervangt
 * principieel elke verspreide "user.plan==='pro'"/"isPremium"-check in de
 * UI-laag.
 *
 * UI-LOCK =/= SECURITY: dit is een PRESENTATIE-laag. Wat deze module
 * teruggeeft bepaalt uitsluitend wat de gebruiker TE ZIEN krijgt -- het
 * heeft geen enkele invloed op wat de server daadwerkelijk toestaat.
 * Server-side enforcement (MS-F12-02) blijft de bron van waarheid.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'commercialUx.v1' };

  var STATUS_LABELS = {
    active: 'Actief',
    trial: 'Proefperiode',
    cancel_at_period_end: 'Wordt beëindigd',
    grace: 'Betaling mislukt — herstelperiode',
    expired: 'Verlopen',
    past_due: 'Betaling mislukt',
    suspended: 'Opgeschort',
    refunded: 'Terugbetaald'
  };

  /* buildPlanComparisonViewModel(actor, catalog): retourneert een lijst van
   * plan-view-models plus welke daarvan het huidige plan is. Nooit een
   * fictieve prijs -- NULL blijft NULL, de UI-laag (index.html) beslist
   * hoe dat getoond wordt ("Prijs wordt nog bekendgemaakt"), deze module
   * verzint nooit een bedrag. */
  function buildPlanComparisonViewModel(actor, catalog) {
    var EC = (typeof module !== 'undefined' && module.exports) ? require('./entitlementCore.js') : global.EntitlementCore;
    catalog = catalog || { plans: [], planFeatures: [], planQuota: [], features: [] };
    var entitlements = EC.resolveEntitlements(actor, catalog);
    var huidigPlanKey = resolveCurrentPlanKey(actor);

    var plans = (catalog.plans || []).map(function (plan) {
      var featuresVoorPlan = (catalog.planFeatures || [])
        .filter(function (pf) { return pf.plan_key === plan.key; })
        .map(function (pf) {
          var featureMeta = (catalog.features || []).find(function (f) { return f.key === pf.feature_key; });
          var quotaRij = (catalog.planQuota || []).find(function (q) { return q.plan_key === plan.key && q.feature_key === pf.feature_key; });
          return {
            key: pf.feature_key,
            naam: featureMeta ? featureMeta.naam : pf.feature_key,
            quotaPerMaand: quotaRij ? quotaRij.quota_per_maand : null // null = onbeperkt binnen dit plan
          };
        });
      return {
        key: plan.key,
        naam: plan.naam,
        type: plan.type,
        prijsCent: (plan.prijs_cent === undefined ? null : plan.prijs_cent), // NOOIT een fictief bedrag invullen
        isHuidigPlan: plan.key === huidigPlanKey,
        features: featuresVoorPlan
      };
    });

    return {
      plans: plans,
      huidigPlanKey: huidigPlanKey,
      statusLabel: resolveStatusLabel(actor)
    };
  }

  function resolveCurrentPlanKey(actor) {
    if (!actor) return 'gratis';
    return actor.planKey || 'gratis';
  }

  function resolveStatusLabel(actor) {
    if (!actor || !actor.subscriptionStatus) return null;
    return STATUS_LABELS[actor.subscriptionStatus] || null;
  }

  /* buildQuotaMessageViewModel(featureKey, entitlements, usageAantal):
   * vertaalt een QUOTA_EXCEEDED-serverresponse naar een begrijpelijke UX-
   * boodschap. Toont NOOIT een generieke "er ging iets mis" voor een echte
   * quota-status (conform de opdracht). */
  function buildQuotaMessageViewModel(featureKey, entitlements, usageAantal) {
    var EC = (typeof module !== 'undefined' && module.exports) ? require('./entitlementCore.js') : global.EntitlementCore;
    var quota = EC.getQuota(entitlements, featureKey);
    return {
      featureKey: featureKey,
      quota: quota, // null = onbeperkt (zou hier normaliter niet als "exceeded" voorkomen)
      huidigGebruik: typeof usageAantal === 'number' ? usageAantal : null,
      // De resetdatum is altijd het begin van de eerstvolgende UTC-kalendermaand
      // -- consistent met de server-side periode-berekening in coach.js
      // (periode = YYYY-MM-01). Geen clienttijd/timezone-afhankelijke logica.
      resetOp: nextMonthStartUtcIso()
    };
  }

  function nextMonthStartUtcIso() {
    var now = new Date();
    var jaar = now.getUTCFullYear();
    var maand = now.getUTCMonth();
    var volgendeMaand = new Date(Date.UTC(jaar, maand + 1, 1));
    return volgendeMaand.toISOString().slice(0, 10);
  }

  /* buildDowngradeStateViewModel(actor): expliciete states voor
   * cancel_at_period_end / expired / grace, met de effectieve datum waar
   * relevant. Geeft nooit een advies om data te verwijderen. */
  function buildDowngradeStateViewModel(actor) {
    if (!actor || !actor.subscriptionStatus) {
      return { state: 'none', message: null };
    }
    var status = actor.subscriptionStatus;
    if (status === 'cancel_at_period_end') {
      return {
        state: 'cancel_at_period_end',
        message: actor.expiresAt
          ? 'Je abonnement loopt door tot ' + formatDatumNl(actor.expiresAt) + '. Daarna val je terug op het gratis plan. Je trainingsgeschiedenis en gegevens blijven altijd bewaard.'
          : 'Je abonnement wordt beëindigd aan het einde van de huidige periode. Je trainingsgeschiedenis en gegevens blijven altijd bewaard.'
      };
    }
    if (status === 'expired') {
      return { state: 'expired', message: 'Je abonnement is verlopen. Je gebruikt nu het gratis plan. Al je trainingsgeschiedenis en gegevens blijven volledig bewaard.' };
    }
    if (status === 'grace') {
      return { state: 'grace', message: 'De laatste betaling is niet gelukt. Je hebt nog toegang terwijl we het opnieuw proberen. Controleer je betaalgegevens om onderbreking te voorkomen.' };
    }
    return { state: status, message: null };
  }

  function formatDatumNl(isoDatum) {
    var d = new Date(isoDatum);
    if (isNaN(d.getTime())) return isoDatum;
    var maanden = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    return d.getDate() + ' ' + maanden[d.getMonth()] + ' ' + d.getFullYear();
  }

  var CommercialUxCore = {
    VERSIONS: VERSIONS,
    buildPlanComparisonViewModel: buildPlanComparisonViewModel,
    buildQuotaMessageViewModel: buildQuotaMessageViewModel,
    buildDowngradeStateViewModel: buildDowngradeStateViewModel,
    resolveCurrentPlanKey: resolveCurrentPlanKey,
    resolveStatusLabel: resolveStatusLabel
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CommercialUxCore; }
  else { global.CommercialUxCore = CommercialUxCore; }
})(typeof window !== 'undefined' ? window : this);
