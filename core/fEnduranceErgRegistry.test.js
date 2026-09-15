/* fEnduranceErgRegistry.test.js — MS-F3-04 regressietest.
 *
 * A. Functionele golden/boundary-tests voor de bestaande CardioCore-conversies
 *    (pace/split/power) -- geen nieuwe berekeningen, uitsluitend bevestiging van
 *    reeds bestaand, correct gedrag.
 * B. Structurele registry-tests voor CALC-END-001..005, inclusief expliciete
 *    bewaking dat CALC-END-004/005 (Critical Speed/Power, TRIMP, decoupling,
 *    HR-zones) terecht als NOT_IMPLEMENTED staan -- geen stille "toch maar
 *    gebouwd zonder onderbouwing"-drift.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
const registryText = fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_REGISTRY.md'), 'utf8');
const intervalEngineCode = fs.readFileSync(path.join(ROOT, 'core/intervalEngine.js'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Pace/split-conversie (golden + boundaries) ----
ok(CardioCore.splitFromDistTime(2000, 400, 500) === 100, 'splitFromDistTime: 2000m in 400s, basis 500 -> split 100s/500m (golden case)');
ok(CardioCore.timeFromDistSplit(2000, 100, 500) === 400, 'timeFromDistSplit: inverse van bovenstaande klopt exact');
ok(CardioCore.distFromTimeSplit(400, 100, 500) === 2000, 'distFromTimeSplit: derde inverse klopt exact');
ok(CardioCore.splitFromDistTime(0, 400, 500) === null, 'splitFromDistTime: dist=0 -> null (geen Infinity)');
ok(CardioCore.splitFromDistTime(2000, 0, 500) === null, 'splitFromDistTime: time=0 -> null');
ok(CardioCore.timeFromDistSplit(2000, 0, 500) === null, 'timeFromDistSplit: split=0 -> null');

// ---- A2. Concept2-vermogensformule (golden + inverse) ----
{
  const watt = CardioCore.wattFromSplit500(120); // 2:00/500m
  ok(Math.abs(watt - (2.80 / Math.pow(120 / 500, 3))) < 1e-9, 'wattFromSplit500: exacte Concept2-formule (2.80/(split/500)^3)');
  const terugSplit = CardioCore.splitFromWatt500(watt);
  ok(Math.abs(terugSplit - 120) < 1e-6, 'splitFromWatt500: inverse van wattFromSplit500 komt terug op de oorspronkelijke split (determinisme + wiskundige consistentie)');
  ok(CardioCore.wattFromSplit500(0) === null, 'wattFromSplit500: split=0 -> null (geen delen door nul)');
  ok(CardioCore.splitFromWatt500(0) === null, 'splitFromWatt500: watt=0 -> null');
}

// ---- A3. Tijd parse/format (round-trip) ----
ok(CardioCore.parseTime('12:34') === 754, 'parseTime: "mm:ss" correct geparsed');
ok(CardioCore.formatTime(754) === '12:34', 'formatTime: inverse van parseTime (round-trip)');
ok(CardioCore.parseTime('') === null, 'parseTime: lege string -> null');
ok(CardioCore.parseTime(null) === null, 'parseTime: null -> null');

// ---- A4. Input-classificatie (empty/invalid/valid) ----
ok(CardioCore.classifyNumericInput('').status === 'empty', 'classifyNumericInput: lege string -> empty (geen "invalid")');
ok(CardioCore.classifyNumericInput('-5').status === 'invalid', 'classifyNumericInput: negatief -> invalid');
ok(CardioCore.classifyNumericInput('Infinity').status === 'invalid', 'classifyNumericInput: niet-eindig -> invalid, nooit doorgegeven aan een sessions-rij');
ok(CardioCore.classifyNumericInput('42').status === 'valid' && CardioCore.classifyNumericInput('42').value === 42, 'classifyNumericInput: geldig getal correct doorgegeven');

// ---- B. Registry-structuur ----
const items = registryText.split(/(?=^### CALC-END-)/m).filter(s => s.startsWith('### CALC-END-'));
// MS-F6-02: CALC-END-004B (Critical Power) toegevoegd -- telling stijgt van 5 naar 6.
// CALC-END-006 (Endurance Target Normalization, endurance_target.v1) toegevoegd -- telling stijgt van 6 naar 7.
ok(items.length === 7, 'exact 7 CALC-END-items gevonden (001, 002, 003, 004, 004B, 005, 006)');

// ---- B2. NOT_IMPLEMENTED-items correct en eerlijk gelabeld (geen stille fabricage) ----
{
  const csCp = items.find(i => i.startsWith('### CALC-END-004 '));
  const cp = items.find(i => i.startsWith('### CALC-END-004B'));
  // Endurance Registry Source-of-Truth Fix: CS/CP zijn sinds B9-03/B9-05 aantoonbaar
  // gewired op echte activities-historie via de eligibility-laag (is_max_effort).
  // De registry mag dat NIET meer ontkennen, maar mag ook NIET beweren dat Context/
  // Decision/AI al aangesloten zijn.
  ok(csCp && cp, 'CALC-END-004 (Critical Speed) en CALC-END-004B (Critical Power) bestaan beide');
  [['CALC-END-004', csCp, 'criticalSpeedEligiblePerformances', 'CALC-RUN-CSELIG-001'],
   ['CALC-END-004B', cp, 'criticalPowerEligiblePerformances', 'CALC-CYC-CPELIG-001']].forEach(([id, txt, elig, eligId]) => {
    ok(txt && /LIVE_CANONICAL/.test(txt), id + ' is gelabeld LIVE_CANONICAL (calculation/history/UI)');
    ok(txt && !/niet geïntegreerd op trainingsgeschiedenis/.test(txt) && !/niet INTEGRATED/.test(txt) && !/niet automatisch op trainingsgeschiedenis gewired/.test(txt) && !/geen tijdrit-markeringsmechanisme/.test(txt),
      id + ' bevat geen stale "niet geïntegreerd/geen tijdrit-markering"-claim meer');
    ok(txt && new RegExp(elig).test(txt) && new RegExp(eligId).test(txt) && /is_max_effort === true/.test(txt),
      id + ' erkent de echte history-integratie via ' + elig + ' (' + eligId + ', is_max_effort === true)');
    // Gap 1b (GAP-P2-026): Context is nu CONNECTED via de dunne adapter tkEnduranceCoachContext();
    // Decision blijft NOT CONNECTED; de AI rekent niet (ontvangt uitsluitend Context-waarden).
    ok(txt && /CONNECTED \(Context via adapter\)/.test(txt) && /tkEnduranceCoachContext\(\)/.test(txt),
      id + ' erkent de Context-integratie via de adapter tkEnduranceCoachContext() (GAP-P2-026)');
    ok(txt && /NOT CONNECTED \(Decision\)/.test(txt) && /Nog NIET aangesloten/.test(txt) && /Decision Engine/.test(txt),
      id + ' beweert NIET dat de Decision Engine is aangesloten (expliciet NOT CONNECTED (Decision))');
    ok(txt && /rekent niet|niet herberekenen/.test(txt), id + ' documenteert dat de AI niet zelf (her)berekent');
    ok(txt && !/end-to-end (mature|geïntegreerd)/i.test(txt), id + ' claimt geen volledige end-to-end-integratie');
    ok(txt && /niet\*\* gepersisteerd|niet gepersisteerd/.test(txt) && /[Dd]ynamisch/.test(txt), id + ' documenteert dynamische berekening zonder persistentie');
  });

  const trimpEtc = items.find(i => i.startsWith('### CALC-END-005'));
  ok(trimpEtc && /\*\*NOT_IMPLEMENTED\*\*/.test(trimpEtc), 'CALC-END-005 (TRIMP/decoupling/HR-zones) is expliciet NOT_IMPLEMENTED');
  ok(trimpEtc && !/LIVE_CANONICAL/.test(trimpEtc), 'CALC-END-005 is NIET meegelift naar LIVE_CANONICAL (blijft eerlijk NOT_IMPLEMENTED)');
}

// ---- B3. Bevestig dat het architectuurcommentaar waarnaar de registry verwijst ook echt bestaat ----
ok(/Geen FTP\/critical power\/critical speed/.test(intervalEngineCode),
  'intervalEngine.js bevat daadwerkelijk het geciteerde architectuurcommentaar — de registry citeert geen niet-bestaande bron');

// ---- B4. Provenance-gap (CALC-END-003) correct als open gap, niet als opgeloste calculation ----
{
  const provenance = items.find(i => i.startsWith('### CALC-END-003'));
  ok(provenance && /GAP, geregistreerd/.test(provenance),
    'CALC-END-003 (watt-provenance-onderscheid) staat correct als open gap, niet als afgeronde, gevalideerde calculation');
}

console.log('fEnduranceErgRegistry: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
