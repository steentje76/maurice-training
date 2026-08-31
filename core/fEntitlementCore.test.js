/* fEntitlementCore.test.js — MS-F12-01 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const EC = require(path.join(ROOT, 'core/entitlementCore.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const catalog = {
  planFeatures: [
    { plan_key: 'gratis', feature_key: 'ai_coach' },
    { plan_key: 'gratis', feature_key: 'programma_generator' },
    { plan_key: 'atleet_basis', feature_key: '1rm_grafieken' },
    { plan_key: 'atleet_basis', feature_key: 'hrv_analyse' },
    { plan_key: 'atleet_basis', feature_key: 'ai_coach' },
    { plan_key: 'atleet_pro', feature_key: '1rm_grafieken' },
    { plan_key: 'atleet_pro', feature_key: 'hrv_analyse' },
    { plan_key: 'atleet_pro', feature_key: 'ai_coach' },
    { plan_key: 'atleet_pro', feature_key: 'programma_generator' },
    { plan_key: 'sportschool_basis', feature_key: 'ai_coach' },
    { plan_key: 'sportschool_basis', feature_key: 'programma_generator' }
  ],
  planQuota: [
    { plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 5 },
    { plan_key: 'gratis', feature_key: 'programma_generator', quota_per_maand: 1 },
    { plan_key: 'atleet_basis', feature_key: 'ai_coach', quota_per_maand: 5 }
    // atleet_pro/sportschool_basis: geen quota-rij = onbeperkt
  ]
};

// ---- A. Free athlete: een daadwerkelijk bruikbaar product, geen crippleware ----
{
  const ent = EC.resolveEntitlements({ userId: 'U1', planKey: null }, catalog);
  ok(EC.hasCapability(ent, 'ai_coach') === true, 'A1: free athlete heeft ai_coach (beperkt, geen crippleware)');
  ok(EC.getQuota(ent, 'ai_coach') === 5, 'A2: free athlete heeft een quota van 5 voor ai_coach');
  ok(EC.hasCapability(ent, 'hrv_analyse') === false, 'A3: free athlete heeft geen hrv_analyse (premium-feature)');
}

// ---- B. Premium athlete ----
{
  const ent = EC.resolveEntitlements({ userId: 'U2', planKey: 'atleet_pro', subscriptionStatus: 'active' }, catalog);
  ok(EC.hasCapability(ent, 'ai_coach') === true, 'B1: atleet_pro heeft ai_coach');
  ok(EC.getQuota(ent, 'ai_coach') === null, 'B2: atleet_pro heeft onbeperkt ai_coach (geen quota-rij = null)');
  ok(EC.hasCapability(ent, 'hrv_analyse') === true, 'B3: atleet_pro heeft hrv_analyse');
}

// ---- C. Coach (via organization-membership, geen eigen abonnement) ----
{
  const ent = EC.resolveEntitlements({ userId: 'U3', planKey: null, organizationMemberships: [{ organizationId: 'O1', planKey: 'sportschool_basis', status: 'active' }] }, catalog);
  ok(EC.hasCapability(ent, 'ai_coach') === true, 'C1: lid van een sportschool-organisatie krijgt ai_coach via de organization-plan');
}

// ---- D. Gym member (gestapelde rollen: eigen abonnement + organization) ----
{
  const ent = EC.resolveEntitlements({ userId: 'U4', planKey: 'atleet_basis', subscriptionStatus: 'active', organizationMemberships: [{ organizationId: 'O1', planKey: 'sportschool_basis', status: 'active' }] }, catalog);
  ok(EC.hasCapability(ent, 'hrv_analyse') === true, 'D1: gestapeld -- hrv_analyse via het eigen atleet_basis-plan');
  ok(EC.hasCapability(ent, 'programma_generator') === true, 'D2: gestapeld -- programma_generator via de organization-plan (die het eigen plan niet geeft)');
  ok(EC.getQuota(ent, 'ai_coach') === null, 'D3: gestapeld -- het HOOGSTE quotum geldt (organization geeft onbeperkt, wint van de eigen 5)');
}

// ---- E. Expired subscription: premium-only capabilities verdwijnen, terugval op gratis-niveau blijft (geen dataverlies, dat wordt elders getest) ----
{
  const ent = EC.resolveEntitlements({ userId: 'U5', planKey: 'atleet_pro', subscriptionStatus: 'expired' }, catalog);
  ok(EC.hasCapability(ent, 'hrv_analyse') === false, 'E1: expired subscription verliest een premium-only capability (hrv_analyse zit niet in het gratis-plan)');
  ok(EC.hasCapability(ent, 'ai_coach') === true && EC.getQuota(ent, 'ai_coach') === 5,
    'E2: ai_coach blijft beschikbaar via het gratis-niveau na expiry, maar valt terug op de gratis-quota (geen premium-onbeperkt meer) -- correct, geen totale toegangsblokkade bij downgrade');
}

// ---- F. Cancelled maar nog geldig tot period end ----
{
  const now = new Date('2026-08-30');
  const nogGeldig = EC.resolveEntitlements({ userId: 'U6', planKey: 'atleet_pro', subscriptionStatus: 'cancel_at_period_end', expiresAt: '2026-09-15', now: now }, catalog);
  ok(EC.hasCapability(nogGeldig, 'hrv_analyse') === true, 'F1: cancel_at_period_end vóór de expiry-datum blijft de premium-capability behouden');
  const verlopen = EC.resolveEntitlements({ userId: 'U7', planKey: 'atleet_pro', subscriptionStatus: 'cancel_at_period_end', expiresAt: '2026-08-01', now: now }, catalog);
  ok(EC.hasCapability(verlopen, 'hrv_analyse') === false, 'F2: cancel_at_period_end ná de expiry-datum verliest de premium-capability');
}

// ---- G. Grace period ----
{
  const ent = EC.resolveEntitlements({ userId: 'U8', planKey: 'atleet_pro', subscriptionStatus: 'grace' }, catalog);
  ok(EC.hasCapability(ent, 'ai_coach') === true, 'G1: grace-periode behoudt de capabilities');
}

// ---- H. Unknown/malformed plan: nooit crashen, nooit onterecht toekennen ----
{
  const ent = EC.resolveEntitlements({ userId: 'U9', planKey: 'niet_bestaand_plan_xyz', subscriptionStatus: 'active' }, catalog);
  ok(EC.hasCapability(ent, 'ai_coach') === true, 'H1: een onbekend plan geeft geen crash; de gratis-capabilities blijven minimaal gegarandeerd');
  ok(EC.hasCapability(ent, 'hrv_analyse') === false, 'H2: een onbekend plan geeft nooit onterecht een premium-capability');
}
ok(JSON.stringify(EC.resolveEntitlements(null, catalog)) === JSON.stringify({ capabilities: {}, quota: {}, sources: {} }),
  'H3: een null-actor geeft een veilig, leeg (maar volledig gestructureerd) resultaat, geen crash');
ok(JSON.stringify(EC.resolveEntitlements({ userId: 'U10' }, null).capabilities) !== undefined,
  'H4: een ontbrekende catalog geeft geen crash');

// ---- I. Duplicate entitlements (dezelfde feature via meerdere paden) blijven idempotent ----
{
  const ent = EC.resolveEntitlements({
    userId: 'U11', planKey: 'atleet_pro', subscriptionStatus: 'active',
    organizationMemberships: [{ organizationId: 'O1', planKey: 'sportschool_basis', status: 'active' }, { organizationId: 'O2', planKey: 'sportschool_basis', status: 'active' }]
  }, catalog);
  ok(EC.hasCapability(ent, 'ai_coach') === true, 'I1: dubbele entitlement-bronnen voor dezelfde feature blijven correct (idempotent) true');
}

// ---- J. Inactive/removed organization membership wordt genegeerd ----
{
  const ent = EC.resolveEntitlements({ userId: 'U12', planKey: null, organizationMemberships: [{ organizationId: 'O1', planKey: 'sportschool_basis', status: 'removed' }] }, catalog);
  ok(EC.hasCapability(ent, 'hrv_analyse') === false, 'J1: een removed organization-membership geeft geen entitlements meer');
}

// ---- K. hasCapability/getQuota zijn defensief tegen malformed entitlement-objecten ----
ok(EC.hasCapability(undefined, 'ai_coach') === false, 'K1: hasCapability met undefined entitlements geeft veilig false, geen crash');
ok(EC.hasCapability({}, 'ai_coach') === false, 'K2: hasCapability met een leeg object geeft veilig false');
ok(EC.getQuota(undefined, 'ai_coach') === null, 'K3: getQuota met undefined entitlements geeft veilig null');

// ---- L. KRITIEK: "Money must never widen data access." EntitlementCore
// bevat geen enkele verwijzing naar RLS/tenant/hrv/Women's Performance/
// coach-scope-concepten -- het raakt principieel nooit de databeveiliging,
// uitsluitend commerciële capability-vlaggen. ----
{
  const fs = require('fs');
  const src = fs.readFileSync(path.join(ROOT, 'core/entitlementCore.js'), 'utf8');
  var VERBODEN_SECURITY_TERMEN = ['hrv_log', 'Women', 'org_has_role', 'coach_access_scope', 'organization_id ='];
  VERBODEN_SECURITY_TERMEN.forEach(function (term) {
    ok(!src.includes(term), 'L1: entitlementCore.js bevat geen verwijzing naar het security/privacy-domein ("' + term + '")');
  });

  // "RLS" mag uitsluitend in commentaarregels voorkomen (het legitiem
  // documenteren van het entitlements =/= security-onderscheid), nooit in
  // daadwerkelijk uitvoerbare code.
  var codeRegelsMetRls = src.split('\n').filter(function (regel) {
    var zonderCommentaar = regel.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').trim();
    return zonderCommentaar.includes('RLS') && !regel.trim().startsWith('*') && !regel.trim().startsWith('//');
  });
  ok(codeRegelsMetRls.length === 0, 'L2: "RLS" komt uitsluitend voor in commentaarregels, nooit in uitvoerbare code');
}

// ---- M. MS-F12-04: money-never-widens-data-access, ook voor de nieuwe billing-laag.
// De reconcile_billing_event()-RPC (via migratie_v524.sql) en de billing-
// endpoints mogen NOOIT role/gym_id/organization membership/RLS-gerelateerde
// velden muteren -- uitsluitend de vier commerciële authority-velden. ----
{
  const fs = require('fs');
  const migratiePath = path.join(ROOT, 'migratie_v524.sql');
  if (fs.existsSync(migratiePath)) {
    const migratie = fs.readFileSync(migratiePath, 'utf8');
    const fnBlok = migratie.split('function public.reconcile_billing_event')[1] ? migratie.split('function public.reconcile_billing_event')[1].split('$$;')[0] : '';
    ['gym_role', 'gym_id', 'system_role', 'organization_id', 'role ='].forEach(function (term) {
      ok(!fnBlok.includes(term), 'M1: reconcile_billing_event() muteert nergens "' + term + '" -- uitsluitend individual_plan_key/status/expires_at, nooit rol/tenant-velden');
    });
    ok(fnBlok.includes('individual_plan_key') && fnBlok.includes('individual_plan_status') && fnBlok.includes('individual_plan_expires_at'),
      'M2: reconcile_billing_event() muteert uitsluitend de bekende, vaste commerciële authority-velden');
  }
  ['billing-checkout.js', 'billing-webhook.js', 'billing-verify-google-play.js', 'billing-verify-apple.js'].forEach(function (bestand) {
    const bestandPath = path.join(ROOT, 'netlify/functions', bestand);
    if (fs.existsSync(bestandPath)) {
      const src = fs.readFileSync(bestandPath, 'utf8');
      const codeRegelsAlleen = src.split('\n').filter(function (regel) {
        var t = regel.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      }).join('\n');
      ['gym_role', 'gym_id', 'system_role', 'memberships'].forEach(function (term) {
        ok(!codeRegelsAlleen.includes(term), 'M3: ' + bestand + ' bevat "' + term + '" uitsluitend in commentaar (documentatie van het principe), nooit in uitvoerbare code');
      });
    }
  });
}

console.log('fEntitlementCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);