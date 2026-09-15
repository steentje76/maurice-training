/* fEnduranceTargetNormalization.test.js — CALC-END-006: typed-normalisatie van de vrije-tekst
 * intervaldoelen (block.target.pace/.power/.rpe uit interval_prescription.v1). Test de echte
 * CardioCore-productiefuncties (parseEnduranceTarget/formatEnduranceTarget/typedRpeTarget/
 * isTargetKindSupportedForSport) op parse, format, round-trip, sportdekking, ongeldige/
 * adversariale invoer en architectuurgrenzen (géén Decision/readiness-koppeling).
 *
 * Draai: node core/fEnduranceTargetNormalization.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const CardioCore = require(path.join(__dirname, 'cardio.js'));
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(a === b, l + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// ── 1: bewezen echte prescriptievormen per sport (Builder-placeholders + B3-testfixtures) ──
const REAL_FORMS = [
  { sport: 'running', raw: '4:30/km', kind: 'pace', value: 270, unit: 'sec_per_km' },
  { sport: 'swimming', raw: '1:45/100m', kind: 'pace', value: 105, unit: 'sec_per_100m' },
  { sport: 'rowing', raw: '1:50/500m', kind: 'pace', value: 110, unit: 'sec_per_500m' },
  { sport: 'skierg', raw: '1:50/500m', kind: 'pace', value: 110, unit: 'sec_per_500m' },
  { sport: 'cycling', raw: '250 W', kind: 'power', value: 250, unit: 'watt' },
  { sport: 'bikeerg', raw: '250 W', kind: 'power', value: 250, unit: 'watt' }
];
REAL_FORMS.forEach(f => {
  const t = CardioCore.parseEnduranceTarget(f.raw);
  eq(t.status, 'valid', f.sport + ' "' + f.raw + '": status valid');
  eq(t.kind, f.kind, f.sport + ' "' + f.raw + '": kind ' + f.kind);
  eq(t.value, f.value, f.sport + ' "' + f.raw + '": value ' + f.value + ' (canonieke eenheid, geen noemer-omzetting)');
  eq(t.unit, f.unit, f.sport + ' "' + f.raw + '": unit ' + f.unit);
  ok(CardioCore.isTargetKindSupportedForSport(f.sport, f.kind), f.sport + ': ' + f.kind + ' is een bewezen sport/soort-combinatie');
  // Round-trip: parse -> format -> parse moet exact dezelfde typed waarde opleveren.
  const formatted = CardioCore.formatEnduranceTarget(t);
  eq(formatted, f.raw, f.sport + ': format(parse("' + f.raw + '")) === origineel (geen noemer-omzetting, geen afronding)');
  const t2 = CardioCore.parseEnduranceTarget(formatted);
  eq(t2.status, 'valid', f.sport + ': herparse van geformatteerde tekst blijft valid');
  eq(t2.value, t.value, f.sport + ': round-trip behoudt de numerieke waarde');
  eq(t2.unit, t.unit, f.sport + ': round-trip behoudt de eenheid (geen km<->500m-vermenging)');
});

// ── 2: "250W" zonder spatie (evidence: placeholder accepteert 'bv. 250 W', maar de parser mag
// niet uitsluitend op de exacte placeholder-spatie leunen) ──
{
  const t = CardioCore.parseEnduranceTarget('250W');
  eq(t.status, 'valid', '"250W" (geen spatie): valid');
  eq(t.kind, 'power', '"250W": kind power');
  eq(t.value, 250, '"250W": waarde 250');
}

// ── 3: RPE — reeds-numeriek veld, typedRpeTarget wrapt uniform, geen herberekening ──
[0, 5, 8, 10].forEach(v => {
  const t = CardioCore.typedRpeTarget(v);
  eq(t.status, 'valid', 'RPE ' + v + ': valid');
  eq(t.kind, 'rpe', 'RPE ' + v + ': kind rpe');
  eq(t.value, v, 'RPE ' + v + ': waarde ongewijzigd');
  eq(t.unit, 'rpe_0_10', 'RPE ' + v + ': eenheid rpe_0_10');
});
['running', 'cycling', 'swimming', 'rowing', 'bikeerg', 'skierg'].forEach(sp => {
  ok(!CardioCore.isTargetKindSupportedForSport(sp, 'rpe'), sp + ': rpe staat NIET in TARGET_KIND_BY_SPORT (RPE is een apart, universeel veld, geen "kind" per sport-tabel — geen aanname verzonnen)');
});

// ── 4: sport/soort-scheiding — geen enkele sport claimt een niet-bewezen combinatie ──
ok(!CardioCore.isTargetKindSupportedForSport('running', 'power'), 'running ondersteunt geen power (geen bewijs in Builder/tests)');
ok(!CardioCore.isTargetKindSupportedForSport('cycling', 'pace'), 'cycling ondersteunt geen pace (evidence: workPace-veld bevat voor cycling altijd een W-waarde)');
ok(!CardioCore.isTargetKindSupportedForSport('rowing', 'power'), 'rowing/RowErg ondersteunt in de huidige Builder geen power (evidence: workPace default 1:50/500m)');
ok(!CardioCore.isTargetKindSupportedForSport('bikeerg', 'pace'), 'BikeErg ondersteunt in de huidige Builder geen pace (evidence: workPace default 250 W)');
eq(CardioCore.isTargetKindSupportedForSport('onbekende_sport', 'pace'), false, 'onbekende sport: geen crash, expliciet false (fail closed)');

// ── 5: ongeldige/adversariale invoer — moet ALTIJD fail-closed zijn, nooit gokken ──
const INVALID = [
  ['', 'empty', 'lege string'],
  ['   ', 'empty', 'alleen whitespace'],
  [null, 'empty', 'null'],
  [undefined, 'empty', 'undefined'],
  ['willekeurige tekst', 'invalid', 'willekeurige tekst (geen slash, geen W)'],
  ['4:30', 'invalid', 'ontbrekende noemer (geen "/...")'],
  ['4:30/mile', 'invalid', 'onbekende noemer (mile)'],
  ['4:30/yard', 'invalid', 'onbekende noemer (yard)'],
  ['abc/km', 'invalid', 'onleesbaar tijd-deel'],
  ['-1:00/km', 'invalid', 'negatief tijd-deel'],
  ['0:00/km', 'invalid', 'nul-pace (fysiek/contractueel ongeldig)'],
  ['-250 W', 'invalid', 'negatief vermogen'],
  ['0 W', 'invalid', 'nul-vermogen (fysiek ongeldig)'],
  ['4,5:00/km', 'invalid', 'komma i.p.v. punt in tijd-deel (locale-ambigu, bewust niet geraden)'],
  ['250,5 W', 'invalid', 'komma in vermogen (locale-ambigu, bewust niet geraden)'],
  ['Infinity/km', 'invalid', 'Infinity als tijd-deel'],
  ['NaN W', 'invalid', 'NaN als vermogen'],
  ['250 kW', 'invalid', 'onbekende eenheid (kW i.p.v. W)'],
  ['4:30/km/km', 'invalid', 'dubbele noemer'],
  [123, 'invalid', 'kaal getal zonder eenheid/noemer (geen impliciete aanname welke grootheid)']
];
INVALID.forEach(([raw, expectedStatus, label]) => {
  const t = CardioCore.parseEnduranceTarget(raw);
  eq(t.status, expectedStatus, 'adversarial: ' + label + ' -> status ' + expectedStatus);
  if (expectedStatus === 'invalid') {
    eq(t.value, null, 'adversarial: ' + label + ' -> geen waarde geretourneerd bij invalid');
    ok(!!t.reason, 'adversarial: ' + label + ' -> expliciete reason aanwezig (geen stille null)');
  }
});
// NaN/Infinity mag NOOIT als getal weglekken naar de consument.
[NaN, Infinity, -Infinity].forEach(v => {
  const t = CardioCore.typedRpeTarget(v);
  ok(t.status === 'invalid' && t.value === null, 'RPE ' + v + ': nooit NaN/Infinity naar de consument');
});

// ── 6: formatEnduranceTarget op ongeldige/lege typed-input -> '' (zelfde conventie als formatTime) ──
eq(CardioCore.formatEnduranceTarget(null), '', 'formatEnduranceTarget(null) -> leeg');
eq(CardioCore.formatEnduranceTarget({ kind: 'pace', value: null, unit: 'sec_per_km' }), '', 'formatEnduranceTarget zonder waarde -> leeg');
eq(CardioCore.formatEnduranceTarget({ kind: 'pace', value: -5, unit: 'sec_per_km' }), '', 'formatEnduranceTarget met negatieve waarde -> leeg (geen gefabriceerde output)');
eq(CardioCore.formatEnduranceTarget({ kind: 'onbekend', value: 100, unit: 'x' }), '', 'onbekend kind -> leeg');

// ── 7: grenswaarden rondom minuutgetallen (dubbele cijfers, uren) blijven correct ──
{
  const t = CardioCore.parseEnduranceTarget('12:03/km');
  eq(t.status, 'valid', '12:03/km: valid'); eq(t.value, 723, '12:03/km: 723s');
  eq(CardioCore.formatEnduranceTarget(t), '12:03/km', '12:03/km: round-trip exact');
}
{
  const t = CardioCore.parseEnduranceTarget('1:05:00/km');
  eq(t.status, 'valid', '1:05:00/km (h:mm:ss): valid'); eq(t.value, 3900, '1:05:00/km: 3900s');
}

// ── 8: architectuurgrens — GEEN afhankelijkheid van Decision/readiness/AdaptiveCoaching ──
const cardioSrc = fs.readFileSync(path.join(__dirname, 'cardio.js'), 'utf8');
ok(!/AdaptiveCoachingCore|DecisionCore|readinessCls|magnitudePct|reduce_intensity|hrv|HRV|ACWR/i.test(cardioSrc), 'architectuur: core/cardio.js bevat GEEN enkele verwijzing naar Decision/readiness/AdaptiveCoaching/intensiteitsaanpassing');
ok(!/\* *0\.95|\* *1\.05|magnitudePct/.test(cardioSrc), 'architectuur: geen intensiteitstransformatie (×0.95/×1.05/magnitudePct) geïmplementeerd in deze module');

// ── 9: backward compatibility — bestaande B1/B2/B3-contracten blijven ongewijzigd bruikbaar ──
const IntervalEngineCore = require(path.join(__dirname, 'intervalEngine.js'));
{
  const norm = IntervalEngineCore.normalizePrescription({ version: 'interval_prescription.v1', sport: 'running', blocks: [{ repeat: 2, of: [{ type: 'work', termination: { type: 'time', seconds: 180 }, target: { pace: '4:30/km', rpe: 8 } }] }] });
  ok(norm.geldig, 'backward-compat: bestaande vrije-tekst prescriptie normaliseert nog altijd zonder wijziging aan IntervalEngineCore');
  eq(norm.blocks[0].target.pace, '4:30/km', 'backward-compat: target.pace blijft de ongewijzigde vrije tekst (geen migratie, geen mutatie)');
  const typed = CardioCore.parseEnduranceTarget(norm.blocks[0].target.pace);
  eq(typed.status, 'valid', 'backward-compat: de bestaande opgeslagen tekst is alsnog typeerbaar via de nieuwe parser (compatibiliteitsgrens, geen DB-migratie nodig)');
}
// Geen enkele wijziging aan intervalEngine.js zelf voor deze sprint.
ok(!/parseEnduranceTarget|formatEnduranceTarget|typedRpeTarget/.test(fs.readFileSync(path.join(__dirname, 'intervalEngine.js'), 'utf8')), 'backward-compat: IntervalEngineCore zelf blijft ongewijzigd/onwetend van de nieuwe typed-laag (geen tweede canonieke plek)');

// ── 10: canonieke locatie — precies één implementatie, niet gedupliceerd in index.html ──
const htmlPath = path.join(ROOT, 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  ok(!/function\s+parseEnduranceTarget|function\s+formatEnduranceTarget/.test(html), 'canoniek: geen eigen/duplicaat parser-implementatie in index.html (UI mag alleen CardioCore.parseEnduranceTarget aanroepen)');
}

if (msgs.length) console.log(msgs.join('\n'));
console.log('fEnduranceTargetNormalization: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
