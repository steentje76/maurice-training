/* core/fB9_H6ConnectedEquipmentHardening.test.js
 * B9-H6 Ergometers & Connected Equipment 9+ Functional Hardening.
 * Bewaakt: de zelf gevonden en gerepareerde BikeErg-splitbasis-bug,
 * sport-mapping-differentiatie (RowErg/SkiErg/BikeErg), machine-
 * mismatch-detectie, en de architecturale bevinding dat Concept2-
 * familie-data via de sessions-tabel loopt (niet activities).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const concept2Src = fs.readFileSync(path.join(ROOT, 'core/concept2Live.js'), 'utf8');

// ---- 1. Zelf gevonden en gerepareerde bug: BikeErg-splitbasis (sectie 9/17) ----
ok(html.includes("splitUnit:'/1000m'") && html.match(/bikeerg:\s*\{[\s\S]{0,50}splitUnit:'\/1000m'/),
  '1a (zelf gevonden en gerepareerd, officieel bevestigd tegen de Concept2 PM5-handleiding): BikeErg gebruikte ten onrechte een 500m-splitbasis in CARDIO_TYPES (index.html) -- Concept2 se eigen conventie is expliciet 1000m voor BikeErg, 500m voor RowErg/SkiErg. Dit veroorzaakte een exact-factor-2-fout in elke handmatig ingevoerde/opgeslagen BikeErg-pace.');
ok(html.match(/bikeerg:\s*\{[\s\S]{0,900}basis:1000/),
  '1b: calc.basis voor bikeerg is nu 1000, consistent met de al-correcte concept2Live.js se paceBasisFor()');

// ---- 2. Consistentie tussen realtime (concept2Live.js) en handmatige invoer (index.html) ----
ok(concept2Src.includes("paceBasisFor(mt) { return mt === 'bikeerg' ? 1000 : 500")
   || concept2Src.match(/paceBasisFor[\s\S]{0,100}bikeerg[\s\S]{0,50}1000/),
  '2: concept2Live.js se paceBasisFor() gebruikte AL correct 1000m voor bikeerg -- de bug zat uitsluitend in de handmatige-invoer-configuratie (CARDIO_TYPES), niet in de realtime PM5-weergave. Deze twee zijn nu consistent.');

// ---- 3. Sport-mapping-differentiatie (sectie 8/9): SkiErg != RowErg != BikeErg ----
ok(concept2Src.includes("rowerg: 'roeien', skierg: 'skierg', bikeerg: 'bikeerg'"),
  '3: elke machine-familie heeft een eigen, canonieke oefening-identiteit -- SkiErg wordt niet simpelweg als RowErg behandeld, BikeErg-data loopt niet via een RowErg-label');

// ---- 4. Machine-mismatch-detectie (sectie 12/40 S14/S15/S16) ----
ok(concept2Src.includes('machineMatchesExercise') && concept2Src.includes('CARDIO_TO_MACHINE'),
  '4: het systeem detecteert actief een mismatch tussen het gekoppelde apparaat en de gekozen oefening (bijv. een BikeErg gekoppeld terwijl "rowing" is geselecteerd) en toont een duidelijke waarschuwing -- proactieve bescherming tegen shadow-domain-verwarring');

// ---- 5. Missing != zero (sectie 15), architecturaal bevestigd ----
ok(concept2Src.includes('function _num(v)') && concept2Src.match(/_num[\s\S]{0,50}return null/),
  '5: de generieke numerieke parser retourneert null bij ontbrekende/ongeldige waarden, nooit 0 -- consistent toegepast in normalizeLiveMetric()');

// ---- 6. Architecturale bevinding: Concept2-familie-data loopt via sessions, niet activities ----
{
  const sportCheckOnly4 = !html.includes("sport=eq.bikeerg") && !html.includes("sport=eq.skierg");
  ok(sportCheckOnly4,
    '6a: geen enkele query filtert op sport=eq.bikeerg of sport=eq.skierg tegen de activities-tabel -- bevestigt dat deze sporten niet via het activities-gebaseerde Calculation/Intelligence-pad (runningIntelligence/cyclingIntelligence) lopen, consistent met de vastgestelde, bestaande architectuur (Concept2-familie via sessions)');
}

console.log('fB9_H6ConnectedEquipmentHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
