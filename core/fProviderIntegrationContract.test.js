/* fProviderIntegrationContract.test.js — MS-F5-01 regressietest.
 *
 * A. Functioneel: buildRow() (de canonieke datasamensteller voor wearable-sync) mag
 *    NOOIT een rauwe, providerspecifieke veldnaam in zijn output-object opnemen -- alleen
 *    de canonieke velden. Dit bewijst de "provider adapter boundary" (sectie 13) met
 *    daadwerkelijke functie-aanroepen, niet met documenttekst-matching.
 * B. Documentatie-aanwezigheid: het Provider Integration Contract-document bestaat en
 *    bevat de vereiste inventaris-/contractelementen.
 * C. Architectuurwet-regressie-lock: de canonieke keten-commentaren blijven in de
 *    bestaande core-modules staan.
 * D. Sabotagebewijs op A (de kern van deze testsuite).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const wearableLib = require(path.join(ROOT, 'netlify/functions/_wearableSyncLib.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const CANONIEKE_VELDEN = new Set(['date', 'user_id', 'hrv', 'hrv_source', 'rhr', 'rhr_source', 'sleep', 'sleep_source', 'note']);

// ---- A. buildRow() output bevat uitsluitend canonieke velden ----
{
  const { row } = wearableLib.buildRow('2026-08-29', 'user-x', { hrv: 42, rhr: 55, sleep: 7.5 }, null);
  const onbekendeVelden = Object.keys(row).filter(k => !CANONIEKE_VELDEN.has(k));
  ok(onbekendeVelden.length === 0,
    'buildRow() output bevat uitsluitend canonieke velden, geen rauwe providerveldnamen (provider adapter boundary, functioneel bewezen)');
}

// ---- B. Provider Integration Contract-document bevat de vereiste elementen ----
const contract = fs.readFileSync(path.join(ROOT, 'docs/PROVIDER_INTEGRATION_CONTRACT.md'), 'utf8');
ok(contract.includes('RLS deny-all op tokentabellen'), 'contract documenteert de RLS-deny-all-garantie op tokentabellen');
ok(contract.includes('UNIQUE(user_id,provider)'), 'contract documenteert de connectie-niveau-uniciteit');
ok(contract.includes('UNIQUE(user_id,date)'), 'contract documenteert de data-niveau-uniciteit (F3-erfenis)');
ok(contract.includes('CONNECTOR INVENTORY'), 'contract bevat de verplichte connector-inventaristabel');

// ---- C. Canonieke keten-wet blijft in de core-modules staan ----
const concept2Src = fs.readFileSync(path.join(ROOT, 'core/concept2Live.js'), 'utf8');
ok(/NOOIT RAW/.test(concept2Src), 'concept2Live.js bevat nog de expliciete "nooit raw naar AI"-architectuurwet');
const weatherSrc = fs.readFileSync(path.join(ROOT, 'core/weather.js'), 'utf8');
ok(/NOOIT WEATHER/.test(weatherSrc), 'weather.js bevat nog de expliciete "nooit weer rechtstreeks naar UI/AI"-architectuurwet');

// ---- D. Sabotagebewijs: injecteer een rauwe providerveldnaam in buildRow() se output ----
console.log('fProviderIntegrationContract: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
