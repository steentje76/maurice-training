/* fOfflineSyncDomainClassification.test.js — MS-F13-01 regressietest.
 * Bewaakt de architectuurregel: commerciële/billing- en auth-data mogen
 * NOOIT via de offline-queue (sbPostQ/sbPatchQ) lopen -- die vereisen
 * altijd een actieve verbinding en server-side autoriteit.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. NEVER OFFLINE MUTABLE: billing/commerciële tabellen nooit via de queue ----
['billing_events', 'billing-checkout', 'billing-webhook'].forEach(function (term) {
  ok(!html.match(new RegExp("sb(Post|Patch|Del)Q\\('" + term.replace(/-/g, '\\-'), 'i')),
    'A: "' + term + '" komt nergens voor als argument van sbPostQ/sbPatchQ/sbDelQ (billing loopt nooit via de offline-queue)');
});

// ---- B. reconcile_billing_event/individual_plan_key nooit via de queue ----
ok(!html.match(/sb(Post|Patch)Q\([^)]*individual_plan/i),
  'B1: individual_plan_key/status/expires_at worden nergens via sbPostQ/sbPatchQ aangeroepen');

// ---- C. Auth-acties (signup/token) nooit via de queue ----
ok(!html.match(/sb(Post|Patch)Q\([^)]*\/auth\/v1/i),
  'C1: geen enkele auth/v1-aanroep loopt via de offline-queue-wrappers');

// ---- D. Bevestig dat het bestaande, veilige QUEUEABLE-patroon nog steeds bestaat (regressie-anker) ----
ok(html.includes("sbPostQ('sessions'") || html.includes('sbPostQ(\'sessions\''),
  'D1: het bestaande, veilige QUEUEABLE-gebruik voor "sessions" bestaat nog (bevestigt dat de test niet toevallig alles blokkeert)');

// ---- E. De re-entry-lock (_flushBezig) bestaat nog, voorkomt dubbele sync ----
ok(html.includes('_flushBezig'), 'E1: de bestaande re-entry-lock tegen gelijktijdige flushOfflineQueue()-aanroepen is nog aanwezig');

// ---- F. De auth-gate in flushOfflineQueue() bestaat nog (queue wordt nooit weggegooid zonder sessie) ----
{
  const flushBlok = html.split('async function flushOfflineQueue()')[1] ? html.split('async function flushOfflineQueue()')[1].split('function updateOfflineBadge')[0] : '';
  ok(flushBlok.includes('if(!authSession)return'), 'F1: flushOfflineQueue() weigert nog steeds te draaien zonder geldige sessie');
}

console.log('fOfflineSyncDomainClassification: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
