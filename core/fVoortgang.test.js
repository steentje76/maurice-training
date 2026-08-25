/* Sprint 16 — VOORTGANG.
 *
 * Vrijwel het hele Voortgang-scherm bestond al. Deze suite dekt wat er in Sprint 16 werkelijk
 * is toegevoegd of gerepareerd, en pint vast wat er al was zodat het niet ongemerkt verdwijnt.
 *
 * A  trend.v1: richting, ondergrens, ontbrekende punten, determinisme
 * B  trend.v1 loopt niet uit de pas met de bestaande healthTrend
 * C  Ontbrekende metingen worden niet als 0 getekend
 * D  Volume loopt via volume.v1 — geen tweede formule in de UI
 * E  Persoonlijke records: bestaande regels en fixes intact
 * F  1RM en krachtontwikkeling via de bestaande Calculation Engine
 * G  Voortgang-scherm: bestaande onderdelen blijven bestaan
 * H  Regressie Sprint 13/14/15
 *
 * Draai: node core/fVoortgang.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./calculation.js');
const D = require('./decision.js');
const DC = require('./deviceIntegration.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

console.log('\n[Sprint 16] Voortgang');

/* ── A. TREND.V1 ─────────────────────────────────────────────────────────── */
console.log('\nA. Trendclassificatie');
eq(C.VERSIONS.trend, 'trend.v1', 'A1: versie trend.v1');
eq(C.TREND_RICHTINGEN, ['stijgend','stabiel','dalend','onvoldoende_data'], 'A2: exact vier uitkomsten');
eq(C.trendClassify([10,11,12,13,14,15]).richting, 'stijgend', 'A3: oplopende reeks is stijgend');
eq(C.trendClassify([15,14,13,12,11,10]).richting, 'dalend', 'A4: aflopende reeks is dalend');
eq(C.trendClassify([10,10,10,10]).richting, 'stabiel', 'A5: gelijke reeks is stabiel');
eq(C.trendClassify([100,101,100,101]).richting, 'stabiel', 'A6: 1% verschil blijft stabiel');
eq(C.trendClassify([100,100,105,105]).richting, 'stijgend', 'A7: 5% verschil is stijgend');
// ondergrens
eq(C.trendClassify([10,12,14]).richting, 'onvoldoende_data', 'A8: drie punten is te weinig');
eq(C.trendClassify([10,12,14]).n, 3, 'A9: het aantal punten wordt wel gemeld');
eq(C.trendClassify([10,12,14]).delta, null, 'A10: en er wordt geen delta geclaimd');
eq(C.trendClassify([]).richting, 'onvoldoende_data', 'A11: lege reeks');
eq(C.trendClassify(null).richting, 'onvoldoende_data', 'A12: null-invoer is veilig');
eq(C.trendClassify([42]).richting, 'onvoldoende_data', 'A13: één punt is geen trend');
ok(C.TREND_MINIMUM >= 4, 'A14: de ondergrens is minstens vier punten');
eq(C.trendClassify([10,12,14], { minimum: 2 }).richting, 'stijgend', 'A15: de ondergrens is instelbaar');
eq(C.trendClassify([10,12,14], { minimum: 1 }).minimum, C.TREND_MINIMUM, 'A16: een onzinnige ondergrens valt terug op de standaard');
// ontbrekende punten worden overgeslagen, niet als 0 geteld
eq(C.trendClassify([10,null,12,null,14,16]).n, 4, 'A17: ontbrekende punten tellen niet mee');
eq(C.trendClassify([10,null,12,null,14,16]).richting, 'stijgend', 'A18: en trekken de trend niet omlaag');
// Vier echte punten is precies genoeg; drie is te weinig — ongeacht hoeveel gaten ertussen zitten.
eq(C.trendClassify([100,null,null,100,100,100]).richting, 'stabiel', 'A19a: vier echte punten volstaan');
eq(C.trendClassify([100,null,null,100,null,100]).richting, 'onvoldoende_data', 'A19b: drie echte punten is te weinig');
eq(C.trendClassify([100,null,null,100,null,100]).n, 3, 'A19c: en dat aantal wordt eerlijk gemeld');
eq(C.trendClassify([10,'abc',NaN,undefined,12,14,16]).n, 4, 'A20: tekst, NaN en undefined vallen af');
eq(C.trendClassify(['10','12','14','16']).richting, 'stijgend', 'A21: numerieke strings tellen wel mee');
// een reeks met nullen is iets anders dan een reeks met gaten
ok(C.trendClassify([10,0,12,0,14,16]).n === 6, 'A22: een echte 0 is een meting en telt wel mee');
ok(C.trendClassify([10,0,12,0,14,16]).richting !== C.trendClassify([10,null,12,null,14,16]).richting ||
   C.trendClassify([10,0,12,0,14,16]).n !== C.trendClassify([10,null,12,null,14,16]).n,
   'A23: nul en ontbrekend leveren aantoonbaar niet hetzelfde op');
// determinisme + geen mutatie
const reeks = [12,14,11,15,13,16];
const ref = JSON.stringify(C.trendClassify(reeks));
let stabiel = true;
for (let i = 0; i < 50; i++) if (JSON.stringify(C.trendClassify(reeks)) !== ref) stabiel = false;
ok(stabiel, 'A24: deterministisch over vijftig aanroepen');
eq(reeks, [12,14,11,15,13,16], 'A25: de invoer wordt niet gemuteerd');
const calcSrc = fs.readFileSync(path.join(__dirname, 'calculation.js'), 'utf8');
const trendBlok = calcSrc.slice(calcSrc.indexOf('function trendClassify'), calcSrc.indexOf('function calculateVolume'));
ok(!/Date\.now\(\)|Math\.random\(\)|new Date\(/.test(trendBlok), 'A26: geen tijd of toeval');

/* ── B. GEEN TWEEDE TRENDWAARHEID ────────────────────────────────────────── */
console.log('\nB. Trend loopt gelijk met de bestaande healthTrend');
const kaart = { up: 'stijgend', down: 'dalend', flat: 'stabiel' };
let gelijk = 0, verschil = 0;
for (let i = 0; i < 300; i++) {
  const n = 4 + (i % 12);
  const vals = Array.from({ length: n }, function (_, k) { return 50 + ((i * 7 + k * 13) % 40) - ((k * i) % 9); });
  const a = C.trendClassify(vals).richting;
  const b = kaart[DC.healthTrend(vals.map(function (v, k) { return { date: '2026-01-0' + (k % 9 + 1), value: v }; })).dir];
  if (a === b) gelijk++; else verschil++;
}
eq(verschil, 0, 'B1: over 300 reeksen geen enkel verschil met healthTrend');
ok(gelijk === 300, 'B2: alle 300 komen overeen');
eq(C.TREND_DREMPEL, 0.03, 'B3: dezelfde drempel van 3% als healthTrend');
ok(/rel > 0\.03/.test(fs.readFileSync(path.join(__dirname, 'deviceIntegration.js'), 'utf8')),
   'B4: healthTrend gebruikt nog steeds diezelfde 3%');

/* ── C. ONTBREKENDE METINGEN WORDEN NIET 0 ───────────────────────────────── */
console.log('\nC. Geen nul voor een ontbrekende meting');
// Alleen het HRV-grafiekblok beoordelen, en commentaar niet meetellen (daarin staat de oude
// regel bewust geciteerd als toelichting).
const hrvBlok = html.slice(html.indexOf('// HRV chart'), html.indexOf('// Roeien'))
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/hrv\s*\|\|\s*0/.test(hrvBlok), 'C1: de HRV-grafiek vult een ontbrekende meting niet meer met 0');
ok(/hrvPunten=hd\.slice\(\)\.reverse\(\)\.filter/.test(html), 'C2: dagen zonder meting worden overgeslagen');
ok(/r\.hrv!=null && r\.hrv!==''/.test(html), 'C3: en dat gebeurt op aanwezigheid, niet op waarheid');
ok(/stats-hrv-trend/.test(html), 'C4: onder de grafiek staat een expliciete trendregel');
ok(/onvoldoende gegevens/.test(html), 'C5: "onvoldoende gegevens" bestaat als zichtbare uitkomst');
// de gedeelde reeks-laag houdt gaten nog steeds open
const ser = DC.healthSeries([{ date: '2026-08-10', hrv: 28, note: null }], 'hrv', '2026-08-12', 3);
eq(ser.length, 3, 'C6: healthSeries levert nog steeds elke dag');
eq(ser.filter(function (p) { return p.value == null; }).length, 2, 'C7: en houdt gaten op null, niet op 0');
eq(DC.healthStats(ser).count, 1, 'C8: healthStats telt alleen echte metingen');

/* ── D. VOLUME VIA VOLUME.V1 ─────────────────────────────────────────────── */
console.log('\nD. Volume komt uit de Calculation Engine');
eq(C.calculateVolume({ sets: 3, reps: 5, weight: 100 }), 1500, 'D1: volume.v1 rekent het tonnage');
eq(C.calculateVolume(null), null, 'D2: geen invoer -> null');
const volBlok = html.slice(html.indexOf('async function refreshVolumeSpiergroep'), html.indexOf('// CSV / JSON EXPORT'));
ok(/CalcCore\.calculateVolume\(/.test(volBlok), 'D3: de spiergroep-sectie gebruikt volume.v1');
ok(!/\(s\.sets\|\|1\)\*\(s\.reps\|\|1\)\*\(s\.weight\|\|0\)/.test(volBlok), 'D4: de handgeschreven formule is weg');
ok(!/\*\s*\(s\.weight/.test(volBlok), 'D5: er staat geen los tonnage-product meer in dit blok');
// D6: dit aantal is met opzet een hard invariant, geen toevallige teller. Groeide van 6
// naar 10 tijdens de volledige-architectuurauditsprint: drie voorheen losse tonnage-
// kopieën (doelvoortgang case 'volume', loadHistory-recente-strip, loadHistory-dagtotalen)
// zijn geconsolideerd naar CalcCore.calculateVolume() -- zie core/fHardening.test.js E15-E19
// voor de gedetailleerde, plek-specifieke bewijzen. Bij een volgende wijziging: als dit
// aantal daalt is een delegatie per ongeluk teruggedraaid naar een eigen kopie; als het
// stijgt, is dat verwacht bij een nieuwe, terechte consolidatie -- werk dan dit getal bij.
eq((html.match(/CalcCore\.calculateVolume\(/g) || []).length, 10, 'D6: alle tien volumeplekken lopen via de engine');
ok(/muscleVol\[m\]/.test(volBlok) && /tkFmtTonnage/.test(volBlok),
   'D7: het berekende tonnage wordt nu ook getoond (was dode code)');
ok(!/function calculateVolume/.test(html), 'D8: de UI heeft geen eigen volumefunctie');

/* ── E. PERSOONLIJKE RECORDS ─────────────────────────────────────────────── */
console.log('\nE. Persoonlijke records — Sprint 11/12 intact');
eq(D.releaseRecord(115, 100).isRecord, true, 'E1: zwaarder dan de basislijn is een record');
eq(D.releaseRecord(100, 100).isRecord, false, 'E2: evenaren is geen record');
eq(D.releaseRecord(0, 100).reason, 'geen_geldige_waarde', 'E3: nul is geen record');
eq(D.releaseRecord(null, null).isRecord, false, 'E4: zonder waarde geen record');
eq(D.RECORD_VERSIE, 'record.v1', 'E5: versie record.v1');
ok(/sessionPrBase/.test(html), 'E6: de PR-basislijn uit Sprint 12 bestaat nog');
ok(/_alleenGeheugen/.test(html), 'E7: en de markering voor een nog niet bestaande doelrij ook');
eq((html.match(/DecisionCore\.releaseRecord\(/g) || []).length, 3, 'E8: nog steeds precies drie recordbeslissingen');
ok(/stats-reppr-content/.test(html), 'E9: het rep-PR-onderdeel op Voortgang bestaat nog');

/* ── F. KRACHTONTWIKKELING VIA DE BESTAANDE ENGINE ───────────────────────── */
console.log('\nF. 1RM en krachtontwikkeling');
eq(C.oneRMRaw(100, 5), C.oneRMRaw(100, 5), 'F1: e1rm.v1 is deterministisch');
ok(C.oneRMRaw(100, 5) > 100, 'F2: en levert een geschat 1RM boven het gewicht');
ok(/function epley1RMRaw\(kg,reps\)\{ return CalcCore\.oneRMRaw/.test(html), 'F3: de UI gebruikt e1rm.v1 via een wrapper');
ok(/function epley1RM\(kg,reps\)\{ return CalcCore\.calculate1RM/.test(html), 'F4: idem voor de afgeronde variant');
ok(!/reps\s*\/\s*30/.test(html.replace(/CalcCore\.[a-zA-Z]+/g, '')), 'F5: geen tweede Epley-formule in de UI');
eq(C.VERSIONS.e1rm, 'e1rm.v1', 'F6: versie e1rm.v1 ongewijzigd');
eq(C.VERSIONS.goal, 'goal.v1', 'F7: doelvoortgang heeft een eigen versie');
ok(/function computeGoalProgress\(g, currentVal\)\{ return CalcCore\.calculateGoalProgress/.test(html),
   'F8: doelvoortgang loopt via goal.v1');

/* ── G. HET VOORTGANG-SCHERM BLIJFT COMPLEET ─────────────────────────────── */
console.log('\nG. Bestaande onderdelen van Voortgang');
[['id="s-stats"','het scherm'], ['id="stats-hero"','hero Deze week'], ['id="stats-improve-list"','Recente vooruitgang'],
 ['id="stats-consistency-list"','Consistentie'], ['id="doelen-list"','Doelen'], ['id="challenges-list"','Challenges'],
 ['id="stats-reppr-content"','Persoonlijke records'], ['id="stats-1rm-list"','Krachtontwikkeling'],
 ['id="stats-ratio-list"','Krachtverhoudingen'], ['id="stats-volume-content"','Volume per spiergroep'],
 ['id="stats-volume-chart"','volumegrafiek'], ['id="stats-hrv-chart"','HRV-grafiek'],
 ['id="stats-row-list"','Roei progressie'], ['id="stats-cardio-list"','Cardio records'],
 ['id="prog-filters"','filters'], ['id="prog-sort"','sortering']]
  .forEach(function (p) { ok(html.indexOf(p[0]) >= 0, 'G1: Voortgang bevat nog steeds ' + p[1]); });
// lege datasets houden hun nette lege staat
['Nog geen roeisessies gelogd', 'Nog geen data van de afgelopen 7 dagen', 'Nog geen metingen']
  .forEach(function (t) { ok(html.indexOf(t) >= 0, 'G2: lege staat bestaat nog: "' + t + '"'); });
eq((html.match(/id="stats-hrv-trend"/g) || []).length, 1, 'G3: precies één nieuwe trendregel toegevoegd');

/* ── H. REGRESSIE SPRINT 13/14/15 ────────────────────────────────────────── */
console.log('\nH. Sprint 13, 14 en 15 ongemoeid');
eq(D.setOutcome({ voorgeschreven: { kg:100, reps:5, rpe:8 }, uitgevoerd: { kg:100, reps:5, rpe:7 },
                  restBasisSec:120, dynamischeRust:true }).actie.kg, 102.5, 'H1: setoutcome.v1 ongewijzigd');
eq(D.restForSet(120, 9), 150, 'H2: rest.v1 ongewijzigd');
const rd = D.readinessDay({ dagfactor: 0.99, herstel: { score: 70, band: 'gemiddeld', confidence: 'hoog' },
  signalen: { hrv: { waarde: 28, kwaliteit: 'no_data' }, rhr: { waarde: 57, kwaliteit: 'no_data' },
              slaap: { waarde: 7 }, spierherstel: [{ muscle: 'Rug', pct: 90 }], gevoel: 'goed', trainingsdagen7: 2 } });
eq(rd.datakwaliteit, 'gedeeltelijk', 'H3: de Sprint 15-fix op de datakwaliteit staat nog');
eq(rd.beschikbaar.length, 4, 'H4: onbetrouwbare signalen tellen nog steeds niet mee');
eq(C.recoveryScore({ dayFactor: 0.97, muscleRecoveryPct: 71, rhrDelta: 2, voelt: 'goed' }).score, 70,
   'H5: recovery_score.v1 ongewijzigd');
eq(C.readinessPercent(0.99), 70, 'H6: readiness_percent.v1 ongewijzigd');
ok(/id="home-readiness"/.test(html), 'H7: de readinesskaart op Home staat er nog');
ok(/livecoach-'\+cur\.id/.test(html), 'H8: de live coach in de training staat er nog');
['id="home-hero"','id="home-plan"','Jouw ritme','Mijn trainingen','Workout Builder','Kalender','Logboek']
  .forEach(function (t) { ok(html.indexOf(t) >= 0, 'H9: buiten Voortgang ongewijzigd: ' + t); });

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Voortgang niet groen.'); process.exit(1); }
console.log('✅ Trend is deterministisch, gaten blijven gaten en volume komt uit één engine.');
