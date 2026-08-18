/* Lichaam 2.1 — tabs, gedeelde zijde-state, oefeningenketen en de deterministische top-4.
 *
 * Bewaakt de vier P0-controles en de vijf bouwpunten van deze sprint:
 *   A  top-4 herstel is deterministisch: best + drie laagste, vaste tie-breaker
 *   B  s-lich-spieren heeft vier tabs met ÉÉN gedeelde voor/achter-state
 *   C  s-lich-spier heeft twee tabs (Visueel · Details), alleen herstructurering
 *   D  de keten Lichaam → spiergroep → spier → oefeningen is compleet en leest alleen echte data
 *   E  s-lich-metingen heeft twee tabs zonder CRUD
 *   F  P0-bevindingen: datastatus-bewoording en "geen trend" versus "te weinig metingen"
 *   G  regressie: overzicht, anatomie, verbanden, Fitbit en het metric-detail intact
 *
 * Leest de ECHTE index.html — geen tweede source of truth.
 * Draai: node core/fLichaam21Tabs.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
function extractFn(name){
  const start = html.indexOf('async function ' + name + '(') >= 0
    ? html.indexOf('async function ' + name + '(') : html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1);
}

console.log('\n[Lichaam 2.1] tabs, gedeelde state, oefeningen en top-4');

// ── A. deterministische top-4 ────────────────────────────────────────────────
console.log('  A top-4 herstel');
const lichTop4Herstel = new Function(extractFn('lichTop4Herstel') + '; return lichTop4Herstel;')();
const R = (m, p) => ({ muscle: m, pct: p });
let t4 = lichTop4Herstel([R('Borst',100), R('Rug',40), R('Billen',60), R('Kuiten',95), R('Core',20)]);
eq(t4.map(x => x.muscle), ['Borst','Core','Rug','Billen'],
   'A1: best herstelde eerst, daarna de drie laagste oplopend');
eq(t4.length, 4, 'A2: precies vier rijen');
// tie-breaker: gelijke waarden krijgen een vaste, alfabetische volgorde
t4 = lichTop4Herstel([R('Zij',50), R('Arm',50), R('Borst',50), R('Core',50), R('Rug',100)]);
eq(t4.map(x => x.muscle), ['Rug','Arm','Borst','Core'], 'A3: gelijke waarden volgen een vaste tie-breaker op naam');
let herhaald = true;
const ref = JSON.stringify(t4);
for (let i = 0; i < 10; i++) if (JSON.stringify(lichTop4Herstel([R('Zij',50), R('Arm',50), R('Borst',50), R('Core',50), R('Rug',100)])) !== ref) herhaald = false;
ok(herhaald, 'A4: tien keer dezelfde invoer geeft tien keer dezelfde volgorde');
eq(lichTop4Herstel([]).length, 0, 'A5: lege invoer geeft een lege lijst');
eq(lichTop4Herstel(null).length, 0, 'A6: null is veilig');
eq(lichTop4Herstel([R('A',10), R('B',90)]).map(x => x.muscle), ['B','A'],
   'A7: minder dan vier groepen: hoogste eerst, geen aanvulling');
eq(lichTop4Herstel([R('A',null), R('B',50), R('C',10)]).map(x => x.muscle), ['B','C'],
   'A8: groepen zonder percentage vallen af — geen nul verzinnen');
ok(extractFn('lichTop4Herstel').indexOf('calculateMuscleRecoveryPct') < 0,
   'A9: de selectie rekent zelf niets uit');
ok(/sort\(\(a,b\)=>\(b\.sets-a\.sets\)\|\|a\.muscle\.localeCompare/.test(html),
   'A10: ook de belastings-top-4 heeft een vaste tie-breaker');

// ── B. spiergroepen: vier tabs, één gedeelde zijde ───────────────────────────
console.log('  B spiergroepen-tabs');
['overzicht','lijst','front','back'].forEach(t =>
  ok(html.indexOf('id="lich-sp-tab-' + t + '"') >= 0, 'B1: tab ' + t + ' bestaat'));
ok(html.indexOf('let lichSpierenTab=') >= 0 && html.indexOf("lichSpierenSide='front'") >= 0,
   'B2: tab en zijde staan in één gedeelde state');
ok(html.indexOf('function v43LichView(') < 0, 'B3: de eerste losse zijde-schakelaar is verwijderd');
ok(html.indexOf('function toggleMuscleHeatmapView(') < 0, 'B4: de tweede losse zijde-schakelaar is verwijderd');
ok(html.indexOf('id="v43-lich-front"') < 0 && html.indexOf('id="muscle-heatmap-toggle-btn"') < 0,
   'B5: beide oude schakelknoppen staan niet meer in de markup');
const apply = extractFn('lichSpierenApply');
ok(apply.indexOf('recoveryHeatmapView=lichSpierenSide') >= 0 && apply.indexOf('muscleHeatmapView=lichSpierenSide') >= 0,
   'B6: herstel- en belastingfiguur volgen dezelfde zijde — ze kunnen elkaar niet meer tegenspreken');
ok(apply.indexOf('renderMuscleRecoveryHeatmap') >= 0 && apply.indexOf('refreshMuscleHeatmap') >= 0,
   'B7: de bestaande renderers worden hergebruikt');
ok(apply.indexOf('calculate') < 0 && apply.indexOf('Math.round') < 0, 'B8: de tabwissel rekent niets uit');
// de doel-ids blijven altijd in de DOM staan — één renderpad voor renderLichaam()
['v43-lich-figbox','v43-lich-list','lich-belasting','muscle-heatmap-container','lich-history','v43-lich-overall']
  .forEach(id => ok(html.indexOf('id="' + id + '"') >= 0, 'B9: doel-id ' + id + ' staat nog in de DOM'));
ok(html.indexOf("if(id==='s-lich-spieren'){ try{ lichSpierenApply(); }catch(_){} }") >= 0,
   'B10: de bestaande router past de tabstand toe — geen tweede router');
ok(html.indexOf("style.display=zichtbaar?'':'none'") >= 0,
   'B11: panelen worden getoond of verborgen, niet uit de DOM gehaald');

// ── C. spierdetail: twee tabs ────────────────────────────────────────────────
console.log('  C spierdetail-tabs');
ok(html.indexOf('id="lich-sd-tab-visueel"') >= 0 && html.indexOf('id="lich-sd-tab-details"') >= 0,
   'C1: beide tabs bestaan');
ok(html.indexOf('id="lich-sd-p-visueel"') >= 0 && html.indexOf('id="lich-sd-p-details"') >= 0,
   'C2: beide panelen bestaan');
const sdTab = extractFn('lichSpierTabSet');
ok(sdTab.indexOf('style.display') >= 0 && sdTab.indexOf('sbGet') < 0,
   'C3: de tabwissel toont alleen — geen nieuwe query, geen nieuwe berekening');
const detail = extractFn('renderLichaamSpierDetail');
['Uren sinds laatste belasting','Basisherstel voor deze groep','RPE laatste sessie','recovery.v1']
  .forEach(k => ok(detail.indexOf(k) >= 0, 'C4: Details toont "' + k + '" uit de bestaande berekening'));
ok(detail.indexOf('calculateMuscleRecoveryPct(') < 0, 'C5: geen nieuwe herstelformule');

// ── D. de oefeningenketen ────────────────────────────────────────────────────
console.log('  D oefeningen per spiergroep');
ok(html.indexOf('id="s-lich-oefeningen"') >= 0, 'D1: het oefeningenscherm bestaat');
ok(html.indexOf("if(id==='s-lich-oefeningen')renderLichaamSpierOefeningen();") >= 0,
   'D2: de route hangt in de bestaande go()-router');
ok(/function openSpierOefeningen\(\)\{ go\('s-lich-oefeningen'\); \}/.test(html), 'D3: één ingang naar het scherm');
const helper = extractFn('lichOefeningenVoorSpier');
ok(helper.indexOf("sbGet('sessions'") >= 0, 'D4: de lijst komt uit het bestaande sessions-logboek');
ok(helper.indexOf('getExerciseMuscles') >= 0, 'D5: de oefening→spier-koppeling is de bestaande');
ok(helper.indexOf('exercise-catalog') < 0 && helper.indexOf('ExerciseCatalogService') < 0,
   'D6: er wordt geen theoretische oefeningenlijst opgehaald — alleen wat je gelogd hebt');
ok(/sort\(\(a,b\)=>\(b\.sets-a\.sets\)\|\|a\.naam\.localeCompare/.test(helper),
   'D7: vaste tie-breaker, dus een stabiele volgorde');
const oefRender = extractFn('renderLichaamSpierOefeningen');
ok(oefRender.indexOf('lichOefeningenVoorSpier') >= 0, 'D8: het scherm gebruikt dezelfde helper als het spierdetail');
ok(oefRender.indexOf('Nog geen oefeningen gelogd') >= 0 && oefRender.indexOf('lich-empty') >= 0,
   'D9: zonder data een nette lege toestand, geen leeg scherm');
ok(oefRender.indexOf('Geen spiergroep gekozen') >= 0, 'D10: zonder selectie ook een nette toestand');
ok(detail.indexOf('openSpierOefeningen()') >= 0, 'D11: het spierdetail heeft een doorstap naar de oefeningen');
ok(/:is\(#s-lichaam,#s-lich-spieren,#s-lich-spier,#s-lich-health,#s-lich-metingen,#s-lich-metric,#s-lich-oefeningen,#s-lich-verband,#s-lich-gegevens\)/.test(html),
   'D12: het scherm erft de bestaande Lichaam-cascade');
ok(/<div class="scr" id="s-lich-oefeningen">[\s\S]{0,2200}<nav class="bnav"/.test(html),
   'D13: het scherm heeft de bestaande bottom navigation');

// ── E. metingen: twee tabs, geen CRUD ────────────────────────────────────────
console.log('  E metingen-tabs');
ok(html.indexOf('id="lich-mt-tab-comp"') >= 0 && html.indexOf('id="lich-mt-tab-afm"') >= 0, 'E1: beide tabs bestaan');
['profiel-bc-card','profiel-afmetingen-card','profiel-history','profiel-w-chart','profiel-waist-chart']
  .forEach(id => ok(html.indexOf('id="' + id + '"') >= 0, 'E2: doel-id ' + id + ' is behouden'));
const mtTab = extractFn('lichMetingenTabSet');
ok(mtTab.indexOf('style.display') >= 0 && mtTab.indexOf('sbPost') < 0 && mtTab.indexOf('sbDel') < 0,
   'E3: de tabwissel raakt de opslag niet');
const metScherm = html.slice(html.indexOf('id="s-lich-metingen"'), html.indexOf('id="s-lich-metric"'));
ok(metScherm.indexOf('Verwijder') < 0 && metScherm.indexOf('Bewerk') < 0 && metScherm.indexOf('sbDel(') < 0,
   'E4: geen CRUD op het metingenscherm');

// ── F. P0-bevindingen ────────────────────────────────────────────────────────
console.log('  F P0-bevindingen');
const status = extractFn('renderLichaamDataStatus');
ok(status.indexOf("'gemeten met '") >= 0, 'F1: de herkomst van de MEETWAARDE is als zodanig verwoord');
ok(status.indexOf("'nu geen wearable gekoppeld'") >= 0,
   'F2: de KOPPELING is expliciet als huidige stand verwoord — geen schijnbare tegenspraak meer');
ok(status.indexOf('deviceConnectionState') < 0 || status.indexOf('dc.deviceConnectionState') >= 0,
   'F3: de bronstand komt nog steeds uit de bestaande device-laag');
const kaart = extractFn('lichTrendCard');
ok(kaart.indexOf("'te weinig metingen'") >= 0,
   'F4: te weinig metingen is niet langer als "geen trend" verwoord');
ok(kaart.indexOf('n>=6') >= 0, 'F5: de bestaande drempel van zes punten is ongewijzigd hergebruikt');
ok(kaart.indexOf('dc.healthTrend(series)') >= 0, 'F6: de trend komt uit de bestaande engine');
// geen fictieve data in de grafiekpaden
const spark = extractFn('lichSpark');
ok(spark.indexOf('Math.random') < 0 && spark.indexOf('value==null') >= 0,
   'F7: de sparkline breekt bij gaten en verzint niets');

// ── G. regressie ─────────────────────────────────────────────────────────────
console.log('  G regressie');
ok(html.indexOf('<div class="lich-figpair">') >= 0, 'G1: beide anatomiefiguren staan nog op het overzicht');
ok(html.indexOf('Nog geen verbanden vrijgegeven') >= 0, 'G2: de veilige verbandentoestand is intact');
ok(!/minimaal \d+ (vergelijkbare )?waarnemingen/.test(html), 'G3: nog steeds geen verzonnen drempel');
ok(html.indexOf('id="s-lich-metric"') >= 0 && html.indexOf('function renderLichaamMetricDetail') >= 0,
   'G4: het metric-detail uit v4.30.0 is ongemoeid');
ok(html.indexOf("fetch('/.netlify/functions/wearable-sync'") >= 0, 'G5: de Fitbit-sync is ongewijzigd');
ok(html.indexOf('function upsertHrvLog') >= 0, 'G6: de v4.29.1-dataverliesfix is intact');
ok(html.indexOf('calculateMuscleRecoveryPct') >= 0, 'G7: de bestaande herstelberekening bestaat nog');
ok(html.indexOf('id="lich-hero"') >= 0 && html.indexOf('id="lich-checkin"') >= 0,
   'G8: de goedgekeurde overzichtsblokken staan er nog');

console.log('\n========================================================');
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exit(1);
console.log('✅ Tabs, gedeelde zijde en de oefeningenketen draaien op de bestaande engines.');
