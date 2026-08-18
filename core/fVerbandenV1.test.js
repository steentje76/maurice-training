/* Verbanden V1 — Calculation Engine (Spearman), koppeling (pairDaily),
 * Decision Engine (vrijgave, sterkte, circulariteit, taal) en de renderpaden.
 *
 * A  Spearman: correctheid, ties, randgevallen, determinisme
 * B  pairDaily: koppeling op kalenderdatum, geen invulling, geen interpolatie
 * C  Decision Engine: minimum n, sterkteclassificatie, richting, circulariteit
 * D  Taal: geen causale formulering, richting volgt de berekening
 * E  Definities: configuratiegedreven, geen logica per verband
 * F  UI-/renderpaden en regressie
 *
 * Draai: node core/fVerbandenV1.test.js
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
const P = (a, b) => a.map((x, i) => ({ a: x, b: b[i] }));
const S = (dates, vals) => dates.map((d, i) => ({ date: d, value: vals[i] }));
const dagen = (n, start) => Array.from({ length: n }, (_, i) => {
  const d = new Date(Date.UTC(2026, 0, (start || 1) + i)); return d.toISOString().slice(0, 10); });

console.log('\n[Verbanden V1] Spearman · pairDaily · Decision Engine');

// ── A. Spearman ──────────────────────────────────────────────────────────────
console.log('  A Spearman (correlation.v1)');
eq(C.spearman(P([1,2,3,4,5],[10,20,30,40,50])), { coefficient: 1, n: 5, direction: 'higher' }, 'A1: perfect positief');
eq(C.spearman(P([1,2,3,4,5],[50,40,30,20,10])), { coefficient: -1, n: 5, direction: 'lower' }, 'A2: perfect negatief');
eq(C.spearman(P([1,2,3,4,5],[1,4,9,16,25])).coefficient, 1, 'A3: monotoon maar niet-lineair geeft toch 1 (dit is rangcorrelatie)');
eq(C.spearman([]), { coefficient: null, n: 0, direction: 'none' }, 'A4: n=0 → null, nooit 0');
eq(C.spearman(P([1],[2])), { coefficient: null, n: 1, direction: 'none' }, 'A5: n=1 → niet te bepalen');
eq(C.spearman(P([3,3,3,3],[1,2,3,4])).coefficient, null, 'A6: constante reeks → null, niet 0');
eq(C.spearman(P([3,3,3,3],[1,2,3,4])).direction, 'none', 'A6b: en geen richting');
// ties krijgen de gemiddelde rang
eq(C.spearman(P([1,2,2,3],[5,6,6,9])).coefficient, 1, 'A7: gelijke waarden (ties) verwerkt via gemiddelde rang');
eq(C.spearman(P([1,2,2,4],[1,3,2,4])).n, 4, 'A8: ties tellen gewoon mee in n');
// ongeldige waarden verdwijnen, worden nooit 0
eq(C.spearman([{a:1,b:2},{a:null,b:3},{a:NaN,b:1},{a:2,b:undefined},{a:3,b:4},{a:Infinity,b:9},{a:'x',b:1}]).n, 2,
   'A9: null, NaN, undefined, Infinity en tekst vallen af — niet als 0 geteld');
eq(C.spearman(null).n, 0, 'A10: null-invoer is veilig');
eq(C.spearman([[1,2],[2,3],[3,4]]).coefficient, 1, 'A11: paren als array werken ook');
// uitschieter: dit is exact waarom Spearman gekozen is
const metUitschieter = C.spearman(P([1,2,3,4,5,6],[1,2,3,4,5,600])).coefficient;
eq(metUitschieter, 1, 'A12: één extreme uitschieter verandert de rangcorrelatie niet');
// geen verband
const geen = C.spearman(P([1,2,3,4,5,6],[3,1,4,1,5,2])).coefficient;
ok(Math.abs(geen) < 0.6, 'A13: willekeurige reeks geeft geen sterke samenhang');
ok(geen >= -1 && geen <= 1, 'A14: coëfficiënt blijft binnen -1..1');
// determinisme
let zelfde = true; const ref = JSON.stringify(C.spearman(P([1,2,2,3,5],[2,1,4,4,5])));
for (let i = 0; i < 10; i++) if (JSON.stringify(C.spearman(P([1,2,2,3,5],[2,1,4,4,5]))) !== ref) zelfde = false;
ok(zelfde, 'A15: tien identieke aanroepen geven tien identieke uitkomsten');
// volgorde-onafhankelijk: dezelfde paren in andere volgorde geven dezelfde coëfficiënt
const p1 = P([1,2,3,4],[2,4,1,3]); const p2 = p1.slice().reverse();
eq(C.spearman(p1).coefficient, C.spearman(p2).coefficient, 'A16: volgorde van de paren verandert niets');
ok(!/Date\.now|Math\.random/.test(String(C.spearman)), 'A17: de functie is puur (geen tijd, geen random)');
eq(C.VERSIONS.correlation, 'correlation.v1', 'A18: versietag aanwezig');
ok(Number.isFinite(C.spearman(P([1,2,3],[1,2,3])).coefficient), 'A19: nooit NaN of Infinity als uitkomst');

// ── B. pairDaily ─────────────────────────────────────────────────────────────
console.log('  B pairDaily');
const A1 = S(['2026-08-01','2026-08-02','2026-08-03','2026-08-04'], [7.2, null, 6.8, 6.0]);
const B1 = S(['2026-08-01','2026-08-02','2026-08-03','2026-08-04'], [28, 30, null, 25]);
eq(DC.pairDaily(A1, B1), [{date:'2026-08-01',a:7.2,b:28},{date:'2026-08-04',a:6,b:25}],
   'B1: alleen dagen waarop BEIDE waarden bestaan');
eq(DC.pairDaily(A1, B1).length, 2, 'B2: ontbrekende dagen worden weggegooid, niet ingevuld');
ok(!DC.pairDaily(A1, B1).some(p => p.a === 0 || p.b === 0), 'B3: nooit 0 ingevuld');
eq(DC.pairDaily([], B1), [], 'B4: lege reeks A');
eq(DC.pairDaily(null, null), [], 'B5: null is veilig');
eq(DC.pairDaily(S(['2026-08-01'],[NaN]), S(['2026-08-01'],[5])), [], 'B6: NaN valt af');
eq(DC.pairDaily(S(['2026-08-01'],[Infinity]), S(['2026-08-01'],[5])), [], 'B7: Infinity valt af');
eq(DC.pairDaily(S(['2026-08-01T00:00:00Z'],[5]), S(['2026-08-01'],[9])), [{date:'2026-08-01',a:5,b:9}],
   'B8: ISO-tijdstempel en kale datum koppelen op dezelfde kalenderdag');
eq(DC.pairDaily(S(['2026-08-03','2026-08-01'],[1,2]), S(['2026-08-01','2026-08-03'],[3,4])).map(p=>p.date),
   ['2026-08-01','2026-08-03'], 'B9: uitvoer is op datum gesorteerd — deterministisch');
// geen forward/backward fill
eq(DC.pairDaily(S(['2026-08-01','2026-08-02'],[5,null]), S(['2026-08-01','2026-08-02'],[1,2])).length, 1,
   'B10: geen forward fill van de vorige waarde');

// ── C. Decision Engine ───────────────────────────────────────────────────────
console.log('  C Decision Engine (verband.v1)');
const def = D.VERBAND_DEFINITIES.filter(d => d.id === 'sleep_hrv')[0];
eq(D.VERBAND_MIN_N, 30, 'C1: het productbesluit n>=30 staat in de engine');
eq(D.releaseVerband({coefficient:0.9,n:29}, def).vrijgegeven, false, 'C2: n=29 wordt niet vrijgegeven');
eq(D.releaseVerband({coefficient:0.9,n:29}, def).reason, 'te_weinig_data', 'C3: met expliciete reden');
eq(D.releaseVerband({coefficient:0.9,n:30}, def).vrijgegeven, true, 'C4: n=30 mag');
eq(D.releaseVerband({coefficient:0.9,n:31}, def).vrijgegeven, true, 'C5: n=31 mag');
eq(D.releaseVerband({coefficient:0.9,n:0}, def).vrijgegeven, false, 'C6: n=0 niet');
eq(D.releaseVerband({coefficient:0.9,n:1}, def).vrijgegeven, false, 'C7: n=1 niet');
eq(D.releaseVerband({coefficient:null,n:40}, def).reason, 'niet_bepaalbaar', 'C8: onbepaalbare coëfficiënt wordt niet vrijgegeven');
eq(D.releaseVerband({coefficient:NaN,n:40}, def).reason, 'niet_bepaalbaar', 'C9: NaN wordt niet vrijgegeven');
eq(D.releaseVerband({coefficient:0.5,n:40}, {}).reason, 'ongeldige_definitie', 'C10: definitie zonder bronnen wordt geweigerd');
// sterktegrenzen — exact gedocumenteerd
eq(D.verbandSterkte(0.05).key, 'verwaarloosbaar', 'C11: |r|<0,10 verwaarloosbaar');
eq(D.verbandSterkte(0.10).key, 'zwak',   'C12: |r|=0,10 zwak');
eq(D.verbandSterkte(0.29).key, 'zwak',   'C13: |r|=0,29 zwak');
eq(D.verbandSterkte(0.30).key, 'matig',  'C14: |r|=0,30 matig');
eq(D.verbandSterkte(0.49).key, 'matig',  'C15: |r|=0,49 matig');
eq(D.verbandSterkte(0.50).key, 'sterk',  'C16: |r|=0,50 sterk');
eq(D.verbandSterkte(-0.62).key, 'sterk', 'C17: sterkte kijkt naar de absolute waarde');
eq(D.verbandSterkte(null), null, 'C18: geen coëfficiënt geeft geen sterkte');
// richting volgt het teken; verwaarloosbaar claimt geen richting
eq(D.releaseVerband({coefficient:0.42,n:37}, def).direction, 'higher', 'C19: positief → higher');
eq(D.releaseVerband({coefficient:-0.42,n:37}, def).direction, 'lower', 'C20: negatief → lower');
eq(D.releaseVerband({coefficient:0.04,n:37}, def).direction, 'none', 'C21: verwaarloosbaar claimt geen richting');
eq(D.releaseVerband({coefficient:0.04,n:37}, def).vrijgegeven, true, 'C22: een zwakke uitkomst wordt wél getoond, maar als zwak');
// circulariteit — geweigerd in de engine, niet in de UI
ok(D.verbandIsCirculair({a:{veld:'dagfactor',inputs:['hrv','sleep']}, b:{veld:'hrv',inputs:['hrv']}}),
   'C23: dagfactor ↔ HRV is circulair');
ok(D.verbandIsCirculair({a:{veld:'dagfactor',inputs:['hrv','sleep']}, b:{veld:'sleep',inputs:['sleep']}}),
   'C24: dagfactor ↔ slaap is circulair');
ok(D.verbandIsCirculair({a:{veld:'herstel',inputs:['sessions','rpe']}, b:{veld:'belasting',inputs:['sessions','rpe']}}),
   'C25: herstel ↔ trainingsbelasting is circulair');
ok(D.verbandIsCirculair({a:{veld:'x',inputs:[]}, b:{veld:'y',inputs:['hrv']}}),
   'C26: onbekende herkomst wordt behandeld als circulair — niet vrijgeven bij twijfel');
eq(D.releaseVerband({coefficient:0.9,n:100},
   {id:'circ',a:{veld:'dagfactor',label:'Dagfactor',inputs:['hrv','sleep'],conditie:'x'},b:{veld:'hrv',label:'HRV',inputs:['hrv'],noemer:'HRV'},minimumN:30}).reason,
   'circulair', 'C27: een circulaire definitie wordt door releaseVerband geweigerd, ook bij n=100');
D.VERBAND_DEFINITIES.forEach(d => ok(!D.verbandIsCirculair(d), 'C28: definitie ' + d.id + ' is niet circulair'));
// nooit NaN/Infinity in de uitvoer
const uit = D.releaseVerband({coefficient:0.42,n:37}, def);
ok(Number.isFinite(uit.coefficient) && Number.isFinite(uit.n), 'C29: uitvoer bevat geen NaN of Infinity');
ok(!/Date\.now|Math\.random/.test(String(D.releaseVerband)), 'C30: releaseVerband is puur');

// ── D. taal ──────────────────────────────────────────────────────────────────
console.log('  D taal');
const verboden = D.VERBAND_VERBODEN_WOORDEN.filter(w => w !== 'door'); // 'door' komt voor in 'doordat' e.d.; los getest
let taalfouten = 0;
D.VERBAND_DEFINITIES.forEach(d => [-0.85,-0.4,-0.15,0.02,0.15,0.4,0.85].forEach(c => {
  const r = D.releaseVerband({coefficient:c,n:40}, d);
  const tekst = (r.zin + ' ' + r.onderbouwing + ' ' + r.disclaimer).toLowerCase();
  verboden.forEach(w => { if (tekst.indexOf(w) >= 0) { taalfouten++; console.log('    causaal woord "' + w + '" in: ' + r.zin); } });
}));
eq(taalfouten, 0, 'D1: geen enkel causaal woord in alle gegenereerde zinnen');
eq(D.releaseVerband({coefficient:0.42,n:37}, def).zin,
   'Op dagen waarop je langer sliep, lag je HRV gemiddeld hoger.', 'D2: positieve zin volgt de berekening');
eq(D.releaseVerband({coefficient:-0.42,n:37}, def).zin,
   'Op dagen waarop je langer sliep, lag je HRV gemiddeld lager.', 'D3: negatieve zin volgt de berekening');
ok(D.releaseVerband({coefficient:0.02,n:37}, def).zin.indexOf('geen duidelijke samenhang') >= 0,
   'D4: verwaarloosbaar levert een zin zonder richtingclaim');
eq(D.releaseVerband({coefficient:0.42,n:37}, def).onderbouwing, 'Gebaseerd op 37 dagen met beide metingen.',
   'D5: de onderbouwing noemt het werkelijke aantal dagen');
eq(D.VERBAND_DISCLAIMER, 'Dit is een samenhang, geen oorzaak.', 'D6: vaste disclaimer');
ok(D.releaseVerband({coefficient:0.42,n:37}, def).disclaimer === D.VERBAND_DISCLAIMER, 'D7: disclaimer zit in elke uitkomst');
// de zin mag nooit een getal claimen dat niet berekend is
ok(!/[0-9]+%/.test(D.releaseVerband({coefficient:0.42,n:37}, def).zin), 'D8: geen percentages in de zin');

// ── E. definities ────────────────────────────────────────────────────────────
console.log('  E definities');
eq(D.VERBAND_DEFINITIES.map(d => d.id), ['sleep_hrv','sleep_rhr','hrv_rhr'], 'E1: precies de drie afgesproken verbanden');
D.VERBAND_DEFINITIES.forEach(d => {
  eq(d.methode, 'spearman', 'E2: ' + d.id + ' gebruikt spearman');
  eq(d.minimumN, 30, 'E3: ' + d.id + ' gebruikt n>=30');
  ok(d.a.veld && d.b.veld && d.a.inputs && d.b.inputs, 'E4: ' + d.id + ' benoemt bronnen en ruwe invoer');
  ok(!!d.a.conditie && !!(d.b.noemer || d.b.label), 'E5: ' + d.id + ' bevat de taalconfiguratie');
});
// geen if/else per verband in de engine
const engineBron = fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8');
const releaseBron = engineBron.slice(engineBron.indexOf('function releaseVerband'), engineBron.indexOf('  var DecisionCore = {'));
ok(releaseBron.indexOf("'sleep_hrv'") < 0 && releaseBron.indexOf("'hrv_rhr'") < 0,
   'E6: releaseVerband kent geen enkel verband bij naam — volledig configuratiegedreven');
ok(!/weather|luchtdruk|humidity|pressure/i.test(engineBron), 'E7: geen weerverbanden in deze versie');
ok(!/1rm|one_rm/i.test(releaseBron), 'E8: geen 1RM in deze versie');

// ── F. renderpaden en regressie ──────────────────────────────────────────────
console.log('  F renderpaden en regressie');
ok(html.indexOf('id="s-lich-verband"') >= 0, 'F1: het verband-detailscherm bestaat');
ok(html.indexOf("if(id==='s-lich-verband')renderLichaamVerbandDetail();") >= 0, 'F2: route in de bestaande go()-router');
ok(/function openVerband\(id\)\{ lichVerbandSel=id; go\('s-lich-verband'\); \}/.test(html), 'F3: één ingang naar het detail');
ok(html.indexOf('function renderLichaamVerbanden') >= 0, 'F4: de overzichtssectie heeft een renderer');
ok(html.indexOf('Nog geen verbanden vrijgegeven') >= 0, 'F5: de veilige lege toestand bestaat nog steeds');
const rend = html.slice(html.indexOf('async function renderLichaamVerbanden'), html.indexOf('function openVerband'));
ok(rend.indexOf('if(!vrij.length) return;') >= 0, 'F6: zonder vrijgegeven verband blijft de lege toestand staan');
ok(rend.indexOf('releaseVerband') < 0 && rend.indexOf('minimumN') < 0 && rend.indexOf('0.3') < 0,
   'F7: de overzichtsrenderer kent geen drempel en geen sterktegrens');
const berekenBron = html.slice(html.indexOf('function tkVerbandBereken'), html.indexOf('function tkVerbandPijl'));
ok(berekenBron.indexOf('cc.spearman(') >= 0 && berekenBron.indexOf('de.releaseVerband(') >= 0 && berekenBron.indexOf('dc.pairQuality(') >= 0,
   'F8: de UI roept de engines aan en rekent zelf niets (koppeling loopt sinds Sprint 10 via pairQuality)');
ok(!/Math\.sqrt|reduce\(/.test(berekenBron), 'F9: geen eigen statistiek in de UI');
ok(berekenBron.indexOf('tkSleepHours(') >= 0, 'F10: slaap gaat door de bestaande normalisatie');
ok(berekenBron.indexOf('dc.healthSeries(') >= 0, 'F11: de reeksen komen uit de bestaande healthSeries');
const scatter = html.slice(html.indexOf('function tkRenderVerbandScatter'), html.indexOf('async function renderLichaamVerbandDetail'));
ok(scatter.indexOf('trendlijn') < 0 && scatter.indexOf('regress') < 0 && scatter.indexOf('polyline') < 0,
   'F12: het spreidingsdiagram tekent geen trend- of regressielijn');
ok(scatter.indexOf('isFinite(p.a) && isFinite(p.b)') >= 0, 'F13: alleen echte paren worden getekend');
ok(html.indexOf('async function _renderLichaamVerbandDetail') >= 0, 'F14: het detailscherm heeft een foutgrens');
ok(html.indexOf(':is(#s-lichaam,#s-lich-spieren,#s-lich-spier,#s-lich-health,#s-lich-metingen,#s-lich-metric,#s-lich-oefeningen,#s-lich-verband,#s-lich-gegevens)') >= 0,
   'F15: het scherm erft de bestaande Lichaam-cascade');
ok(/<div class="scr" id="s-lich-verband">[\s\S]{0,2400}<nav class="bnav"/.test(html), 'F16: bestaande bottom navigation');
// geen fictieve data
ok(!/const\s+VOORBEELD|demoVerband|sampleCorrel/i.test(html), 'F17: geen voorbeeld- of demodata in de app');
// regressie op wat niet mocht wijzigen
ok(html.indexOf('<div class="lich-figpair">') >= 0, 'F18: anatomie op het overzicht ongewijzigd');
ok(html.indexOf("fetch('/.netlify/functions/wearable-sync'") >= 0, 'F19: Fitbit-sync ongewijzigd');
ok(html.indexOf('function renderLichaamMetricDetail') >= 0, 'F20: metric-detail ongewijzigd aanwezig');
ok(html.indexOf('function renderLichaamSpierOefeningen') >= 0, 'F21: oefeningenscherm ongewijzigd aanwezig');
ok(html.indexOf('calculateMuscleRecoveryPct') >= 0, 'F22: herstelberekening ongemoeid');
ok(html.indexOf('function upsertHrvLog') >= 0, 'F23: de v4.29.1-dataverliesfix intact');

console.log('\n========================================================');
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exit(1);
console.log('✅ Verbanden V1: berekening puur, vrijgave in de Decision Engine, geen causale taal.');
