/* fCommercialUxCore.test.js — MS-F12-03 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CUX = require(path.join(ROOT, 'core/commercialUxCore.js'));
const EC = require(path.join(ROOT, 'core/entitlementCore.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const catalog = {
  plans: [
    { key: 'gratis', naam: 'Gratis', type: 'individueel', prijs_cent: null },
    { key: 'atleet_basis', naam: 'Atleet Basis', type: 'individueel', prijs_cent: null },
    { key: 'atleet_pro', naam: 'Atleet Pro', type: 'individueel', prijs_cent: null },
    { key: 'sportschool_basis', naam: 'Sportschool Basis', type: 'gym', prijs_cent: null }
  ],
  features: [
    { key: 'ai_coach', naam: 'AI Coach gesprekken' },
    { key: 'programma_generator', naam: 'AI Programma-generator' },
    { key: 'hrv_analyse', naam: 'HRV-analyse' }
  ],
  planFeatures: [
    { plan_key: 'gratis', feature_key: 'ai_coach' },
    { plan_key: 'atleet_basis', feature_key: 'ai_coach' },
    { plan_key: 'atleet_basis', feature_key: 'hrv_analyse' },
    { plan_key: 'atleet_pro', feature_key: 'ai_coach' },
    { plan_key: 'atleet_pro', feature_key: 'hrv_analyse' },
    { plan_key: 'atleet_pro', feature_key: 'programma_generator' }
  ],
  planQuota: [
    { plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 5 },
    { plan_key: 'atleet_basis', feature_key: 'ai_coach', quota_per_maand: 5 }
  ]
};

// ---- A. Plan comparison: geen enkele fictieve prijs, ooit ----
{
  const vm = CUX.buildPlanComparisonViewModel({ userId: 'U1', planKey: null }, catalog);
  ok(vm.plans.length === 4, 'A1: alle vier catalogusplannen worden getoond');
  vm.plans.forEach(function (p) {
    ok(p.prijsCent === null, 'A2: plan "' + p.key + '" heeft prijsCent=null (NULL blijft NULL, nooit een verzonnen bedrag)');
  });
  ok(vm.huidigPlanKey === 'gratis', 'A3: geen eigen plan -> huidig plan is "gratis"');
  ok(vm.plans.find(function (p) { return p.key === 'gratis'; }).isHuidigPlan === true, 'A4: het gratis-plan is correct gemarkeerd als huidig plan');
}

// ---- B. Huidig plan correct gemarkeerd voor een betalend gebruiker ----
{
  const vm = CUX.buildPlanComparisonViewModel({ userId: 'U2', planKey: 'atleet_pro', subscriptionStatus: 'active' }, catalog);
  ok(vm.huidigPlanKey === 'atleet_pro', 'B1: huidig plan is atleet_pro');
  ok(vm.plans.find(function (p) { return p.key === 'atleet_pro'; }).isHuidigPlan === true, 'B2: atleet_pro correct gemarkeerd');
  ok(vm.plans.find(function (p) { return p.key === 'gratis'; }).isHuidigPlan === false, 'B3: gratis niet gemarkeerd als huidig plan voor een betalende gebruiker');
  ok(vm.statusLabel === 'Actief', 'B4: de statuslabel is een leesbare, Nederlandse tekst ("Actief")');
}

// ---- C. Quota-weergave: onderscheid tussen beperkt en onbeperkt ----
{
  const vm = CUX.buildPlanComparisonViewModel({ userId: 'U3', planKey: null }, catalog);
  const gratisAiCoach = vm.plans.find(function (p) { return p.key === 'gratis'; }).features.find(function (f) { return f.key === 'ai_coach'; });
  ok(gratisAiCoach.quotaPerMaand === 5, 'C1: gratis-plan toont het correcte, beperkte quotum voor ai_coach');
  const proAiCoach = vm.plans.find(function (p) { return p.key === 'atleet_pro'; }).features.find(function (f) { return f.key === 'ai_coach'; });
  ok(proAiCoach.quotaPerMaand === null, 'C2: atleet_pro toont null (onbeperkt) voor ai_coach, geen verzonnen getal');
}

// ---- D. Onbekend plan: geen crash, geen fictieve data ----
{
  const vm = CUX.buildPlanComparisonViewModel({ userId: 'U4', planKey: 'niet_bestaand_xyz', subscriptionStatus: 'active' }, catalog);
  ok(vm.huidigPlanKey === 'niet_bestaand_xyz', 'D1: het huidige plan wordt getoond zoals het is, zonder crash');
  ok(vm.plans.every(function (p) { return p.isHuidigPlan === false; }), 'D2: geen enkel catalogusplan wordt onterecht als "huidig" gemarkeerd voor een onbekend plan');
}

// ---- E. Quota-message-viewmodel ----
{
  const ent = EC.resolveEntitlements({ userId: 'U5', planKey: null }, catalog);
  const vm = CUX.buildQuotaMessageViewModel('ai_coach', ent, 5);
  ok(vm.quota === 5, 'E1: het correcte quotum wordt teruggegeven');
  ok(vm.huidigGebruik === 5, 'E2: het huidige gebruik wordt correct doorgegeven');
  ok(typeof vm.resetOp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(vm.resetOp), 'E3: resetOp is een concrete, geformatteerde datum (begin van de eerstvolgende UTC-kalendermaand)');
}

// ---- F. Downgrade/cancel/expiry/grace states: nooit een advies tot dataverlies ----
{
  const cancelVm = CUX.buildDowngradeStateViewModel({ subscriptionStatus: 'cancel_at_period_end', expiresAt: '2026-09-15' });
  ok(cancelVm.state === 'cancel_at_period_end', 'F1: cancel_at_period_end wordt correct herkend');
  ok(cancelVm.message.includes('bewaard'), 'F2: de boodschap bevestigt expliciet dat gegevens bewaard blijven');
  ok(!cancelVm.message.toLowerCase().includes('verwijder'), 'F3: de boodschap adviseert nooit tot verwijdering');

  const expiredVm = CUX.buildDowngradeStateViewModel({ subscriptionStatus: 'expired' });
  ok(expiredVm.state === 'expired', 'F4: expired wordt correct herkend');
  ok(expiredVm.message.includes('bewaard'), 'F5: expired-boodschap bevestigt dataretentie');

  const graceVm = CUX.buildDowngradeStateViewModel({ subscriptionStatus: 'grace' });
  ok(graceVm.state === 'grace', 'F6: grace wordt correct herkend, geen paniekerige taal');

  const geenVm = CUX.buildDowngradeStateViewModel({ subscriptionStatus: null });
  ok(geenVm.state === 'none', 'F7: geen abonnementsstatus geeft een neutrale "none"-state, geen crash');
}

// ---- G. Defensief tegen malformed/ontbrekende input ----
ok(CUX.buildPlanComparisonViewModel(null, catalog).plans.length === 4, 'G1: een null-actor crasht niet en toont nog steeds de catalogus');
ok(CUX.buildDowngradeStateViewModel(null).state === 'none', 'G2: een null-actor voor downgrade-state geeft veilig "none"');

console.log('fCommercialUxCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
