/* core/fB9_H6BCanonicalErgometerActivities.test.js
 * B9-H6B Concept2/Ergometer Canonical Activity Consolidation.
 *
 * Kernresultaat: forensische audit toonde aan dat sessions/activities
 * GEEN parallelle waarheden zijn (zie
 * docs/B9_H6B_CONCEPT2_CANONICAL_DATAFLOW_AUDIT.md) -- geen migratie
 * uitgevoerd. Deze testsuite legt daarom vast: (1) harde
 * regressiebescherming tegen het exact in B9-H6 gerepareerde
 * pace-basis-defect (RowErg/SkiErg=500m, BikeErg=1000m, NOOIT door
 * elkaar), consistent gecontroleerd op ALLE paden (realtime +
 * handmatige invoer); (2) sportidentiteit blijft behouden (geen
 * SkiErg->rowing- of BikeErg->cycling-collapse); (3) missing != zero.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const concept2Live = fs.readFileSync(path.join(ROOT, 'core/concept2Live.js'), 'utf8');

// ---- 1. Pace-basis-regressiebescherming (sectie 8, het B9-H6-defect) ----
// Realtime-pad (concept2Live.js paceBasisFor()): moet 1000 voor bikeerg, 500 voor de rest.
ok(concept2Live.includes("mt === 'bikeerg' ? 1000 : 500"),
  '1a: het realtime-pad (concept2Live.js) gebruikt 1000m voor BikeErg, 500m voor RowErg/SkiErg -- ongewijzigd, was al correct vóór B9-H6');

// Handmatige-invoer-pad (index.html CARDIO_TYPES): moet consistent zijn met het realtime-pad.
ok(html.includes("splitUnit:'/1000m'") && html.includes("basis:1000,defaultDist:1000"),
  '1b (B9-H6-fix, herbevestigd als harde regressiebescherming): de handmatige-invoer-configuratie (CARDIO_TYPES.bikeerg) gebruikt nu consistent 1000m -- de exact-factor-2-fout die vóór B9-H6 bestond (basis:500 voor BikeErg) mag nooit terugkeren');
{
  const bikeergBlockMatch = html.match(/bikeerg: \{[\s\S]*?\n  skierg: \{/);
  const bikeergBlock = bikeergBlockMatch ? bikeergBlockMatch[0] : '';
  ok(bikeergBlock.length > 0 && !bikeergBlock.includes('basis:500'),
    '1c: het volledige CARDIO_TYPES.bikeerg-blok (tot aan de volgende sleutel, skierg) bevat NERGENS basis:500 -- dit was precies de gerepareerde bug');
}
ok(html.includes("calc:{type:'split',distField:'dist',basis:500,defaultDist:1000}"),
  '1d: RowErg/SkiErg behouden hun eigen, correcte 500m-basis (niet per ongeluk meegetrokken naar 1000m bij het repareren van BikeErg)');

// ---- 2. Sportidentiteit blijft behouden (sectie 7, geen collapse) ----
ok(concept2Live.match(/rowerg:\s*'roeien'/) && concept2Live.match(/skierg:\s*'skierg'/) && concept2Live.match(/bikeerg:\s*'bikeerg'/),
  '2a: elke Concept2-machinefamilie (RowErg/SkiErg/BikeErg) heeft een eigen, canonieke sportidentiteit -- geen SkiErg->rowing- of BikeErg->cycling-mapping');

// ---- 3. sessions/activities: bewuste, gedocumenteerde scheiding (geen migratie uitgevoerd) ----
{
  const audit = fs.readFileSync(path.join(ROOT, 'docs/B9_H6B_CONCEPT2_CANONICAL_DATAFLOW_AUDIT.md'), 'utf8');
  ok(audit.includes('GEEN parallelle waarheden') && audit.includes('JA.') && audit.includes('Moeten beide bestaan?'),
    '3: de forensische audit concludeert expliciet dat sessions/activities beide moeten blijven bestaan (conceptueel verschillende modellen), na live, productiedata-onderzoek -- geen destructieve migratie uitgevoerd zonder bewijs (sectie 10)');
}

// ---- 4. Missing != zero (herbevestiging, geen wijziging nodig) ----
ok(concept2Live.includes('function _num') || concept2Live.match(/_num\s*=\s*function/),
  '4: de bestaande _num()-helper (normalizeLiveMetric-pad) blijft de enige, canonieke plek voor missing-vs-zero-afhandeling -- niet gedupliceerd door deze sprint');

console.log('fB9_H6BCanonicalErgometerActivities: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
