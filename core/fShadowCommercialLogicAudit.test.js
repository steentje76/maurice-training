/* fShadowCommercialLogicAudit.test.js — MS-F12-01 architectuurgate. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const coreFiles = fs.readdirSync(path.join(ROOT, 'core')).filter(function (f) {
  return f.endsWith('.js') && f !== 'entitlementCore.js' && f !== 'commercialUxCore.js' && !f.endsWith('.test.js');
});
const coreContents = coreFiles.map(function (f) { return fs.readFileSync(path.join(ROOT, 'core', f), 'utf8'); }).join('\n');

const VERBODEN_PATRONEN = [
  /plan\s*===\s*['"]premium['"]/i,
  /plan\s*===\s*['"]pro['"]/i,
  // Uitbreiding (gevonden tijdens MS-F12-03 sabotagetest): de bovenstaande
  // twee patronen misten een hardcoded vergelijking tegen de daadwerkelijke,
  // canonieke plan-keys uit de catalogus (bijv. 'atleet_pro' i.p.v. 'pro').
  // Elke directe planKey-string-vergelijking is een verboden shadow-check,
  // ongeacht welke specifieke plan-key wordt gebruikt.
  /planKey\s*===\s*['"](gratis|atleet_basis|atleet_pro|sportschool_basis)['"]/i,
  /\.plan\s*===\s*['"](gratis|atleet_basis|atleet_pro|sportschool_basis)['"]/i,
  /isPro\s*\(/,
  /\.isPro\b/,
  /user\.paid\b/,
  /user\.premium\b/
];

VERBODEN_PATRONEN.forEach(function (re) {
  ok(!re.test(html), 'A: index.html bevat geen verspreid patroon "' + re + '"');
  ok(!re.test(coreContents), 'A: core/*.js (buiten entitlementCore.js) bevat geen verspreid patroon "' + re + '"');
});

const entitlementCoreSrc = fs.readFileSync(path.join(ROOT, 'core/entitlementCore.js'), 'utf8');
ok(entitlementCoreSrc.includes('function resolveEntitlements'), 'B1: de canonieke resolveEntitlements() bestaat in entitlementCore.js');
ok(entitlementCoreSrc.includes('function hasCapability'), 'B2: het canonieke hasCapability()-vervangingspatroon bestaat');

// ---- C. coach.js: requestType->feature-key-classificatie is vast en
// server-side, nooit een client-aangeleverde feature-key direct gebruikt ----
const coachSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/coach.js'), 'utf8');
ok(coachSrc.includes('REQUEST_TYPE_TO_FEATURE'), 'C1: coach.js gebruikt de vaste REQUEST_TYPE_TO_FEATURE-classificatie');
ok(!coachSrc.match(/hasCapability\(entitlements,\s*payload/i) && !coachSrc.match(/hasCapability\(entitlements,\s*requestType\)/i),
  'C2: hasCapability() wordt nooit direct met een client-aangeleverde string aangeroepen, uitsluitend met de server-side afgeleide featureKey');
ok(coachSrc.includes("hasOwnProperty.call(REQUEST_TYPE_TO_FEATURE, requestType)"),
  'C3: een onbekend requestType wordt expliciet, fail-closed geweigerd (geen impliciete default-capability)');

// ---- D. commercialUxCore.js (MS-F12-03): mag de verboden patronen ALLEEN
// in commentaarregels documenteren (uitleg van wat het vervangt), nooit
// als daadwerkelijk uitvoerbare code. ----
{
  const uxSrc = fs.readFileSync(path.join(ROOT, 'core/commercialUxCore.js'), 'utf8');
  const nietCommentaarRegels = uxSrc.split('\n').filter(function (regel) {
    var t = regel.trim();
    return !t.startsWith('*') && !t.startsWith('//') && !t.startsWith('/*');
  }).join('\n');
  VERBODEN_PATRONEN.forEach(function (re) {
    ok(!re.test(nietCommentaarRegels), 'D: commercialUxCore.js bevat het verboden patroon "' + re + '" uitsluitend in commentaar, nooit in uitvoerbare code');
  });
  ok(uxSrc.includes('EntitlementCore.resolveEntitlements') || uxSrc.includes("require('./entitlementCore.js')"),
    'D1: commercialUxCore.js consumeert uitsluitend EntitlementCore, bouwt geen eigen, tweede plan-beslissing');
}

console.log('fShadowCommercialLogicAudit: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
