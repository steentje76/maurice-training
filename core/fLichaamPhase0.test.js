/* Fase 0 — Lichaam UX 2.0, technische UX-fixes. Unit- en regressietest.
 * Dekt de drie blokkerende auditbevindingen:
 *   0.1  statuskleuren zijn dark-mode-proof (semantische tokens i.p.v. --red/#111111)
 *   0.2  de periodekeuze (7/14/30/90) en de ophaallimiet van hrv_log lopen niet meer uiteen
 *   0.3  belasting is een intensiteitsramp, herstel is een stoplicht — nooit door elkaar
 * Extraheert de ECHTE functies/tokens uit index.html. Geen tweede source of truth.
 * Draai: node core/fLichaamPhase0.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if(c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

function extractFn(name){
  const start = html.indexOf('async function ' + name + '(') >= 0
    ? html.indexOf('async function ' + name + '(')
    : html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1);
}

console.log('\n[Fase 0] Lichaam — technische UX-fixes');

// ── 0.1 statuskleuren ────────────────────────────────────────────────────────
console.log('  0.1 statuskleuren');

ok(/--status-good:\s*var\(--df-g\)/.test(html), '--status-good is een alias op --df-g');
ok(/--status-warn:\s*var\(--df-y\)/.test(html), '--status-warn is een alias op --df-y');
ok(/--status-bad:\s*var\(--df-r\)/.test(html), '--status-bad is een alias op --df-r');

// --df-* wordt per thema overschreven; daardoor volgen de aliassen automatisch mee.
eq((html.match(/--df-g:#3fd3b6/g) || []).length, 2, '--df-* heeft twee dark-overrides (media query + data-theme)');
eq((html.match(/--df-g:#00a082/g) || []).length, 2, '--df-* heeft een light-basis en een expliciete light-override');

// Binnen de LICHAAM-renderers mag geen enkele stoplicht-beslissing nog op --red/--green/--y
// staan. Buiten Lichaam geldt het omgekeerde: Home, Training, Voortgang en Profiel volgen de
// goedgekeurde visuele baseline (27fb416) en houden daar juist wél hun eigen kleuren.
const LICH_FNS = ['renderMuscleRecoveryMiniListLichaam', 'v43RecColor', 'renderLichaamPremium',
                  'renderMuscleHeatmap', 'renderMuscleRecoveryHeatmap'];
const stoplichtRest = LICH_FNS
  .filter(fn => { try { return /var\(--red\)/.test(extractFn(fn)) && /var\(--green\)|var\(--y\)/.test(extractFn(fn)); }
                  catch(_) { return false; } });
ok(stoplichtRest.length === 0,
  'geen Lichaam-renderer gebruikt nog --red/--green/--y' +
  (stoplichtRest.length ? ' — nog open in ' + stoplichtRest.join(', ') : ''));

// Home houdt aantoonbaar zijn eigen, goedgekeurde kleuren.
ok(html.indexOf("const dfCol=dfCls==='g'?'var(--green)':dfCls==='r'?'var(--red)':'var(--y)';") >= 0,
  'de dagfactor-ring op Home staat terug op de baseline-kleuren');
ok(/function v43HomeRecColor\(p\)\{return p>=85\?'var\(--green\)':p>=50\?'var\(--y\)':'var\(--red\)';\}/.test(html),
  'Home heeft een eigen kleurfunctie voor het anatomiefiguur');
ok(html.indexOf("renderMuscleRecoveryHeatmap('v43-hero-fig',rec.pctBySvgId,{colorFn:v43HomeRecColor})") >= 0,
  'de Home-hero injecteert die kleurfunctie — geen tweede implementatie');

// --red blijft bestaan voor zijn niet-status-rollen (acties, verwijderen, focus).
ok(/--red:#111111/.test(html), '--red is ongewijzigd (acties/verwijderen/focus)');
ok(html.indexOf('.act-btn.red{background:var(--red)') >= 0, '--red doet nog steeds de actieknoppen');
ok(html.indexOf('.inp:focus{border-color:var(--red)}') >= 0, '--red doet nog steeds het focus-accent');

// Herstel is en blijft een stoplicht.
ok(/v43RecColor\(p\)\{return p>=85\?'var\(--status-good\)':p>=50\?'var\(--status-warn\)':'var\(--status-bad\)';\}/.test(html),
  'v43RecColor gebruikt de stoplicht-tokens (85/50-drempels ongewijzigd)');

// ── 0.3 belasting is géén stoplicht ──────────────────────────────────────────
console.log('  0.3 kleursemantiek belasting vs herstel');

['--load-0', '--load-1', '--load-2', '--load-3'].forEach(t => {
  const light = new RegExp(t.replace(/-/g, '\\-') + ':#');
  ok(light.test(html), t + ' is gedefinieerd');
});
eq((html.match(/--load-0:#4a545c/g) || []).length, 2, 'belastingsramp heeft twee dark-overrides');
eq((html.match(/--load-0:#DDDDDD/g) || []).length, 2, 'belastingsramp heeft een light-basis en light-override');

// Beide belastingsweergaven (figuur + lijst) gebruiken dezelfde ramp, met dezelfde drempels.
eq((html.match(/sets>=12 \? 'var\(--load-3\)' : sets>=6 \? 'var\(--load-2\)' : 'var\(--load-1\)'/g) || []).length, 1,
  'anatomiefiguur Spierbelasting gebruikt de intensiteitsramp');
eq((html.match(/sets>=12\?'var\(--load-3\)':sets>=6\?'var\(--load-2\)':'var\(--load-1\)'/g) || []).length, 1,
  'volumelijst per spiergroep gebruikt dezelfde intensiteitsramp');
ok(html.indexOf("path.style.fill = 'var(--load-0)'") >= 0, 'spier zonder belasting krijgt de neutrale basiskleur');
ok(html.indexOf('path.style.fill = heeftModel ? colorFn(100) : \'var(--load-0)\';') >= 0,
  'spier zonder herstelbelasting blijft "volledig hersteld"; gebied zonder herstelmodel wordt neutraal');

// De twee figuren mogen nooit dezelfde kleurbetekenis krijgen.
ok(html.indexOf('const color = colorFn(pct);') >= 0 && html.indexOf("sets>=12 ? 'var(--load-3)'") >= 0,
  'herstelfiguur en belastingsfiguur gebruiken aantoonbaar verschillende schalen');

// De belastingskaarten op Lichaam gebruiken de ramp, niet het stoplicht.
ok(/\.lich-loadcard \.k\.hi\{color:var\(--load-3\)\}/.test(html), 'kaart "zwaar belast" is niet langer rood');
ok(/\.lich-loadcard \.k\.mid\{color:var\(--status-warn\)\}/.test(html), '"rust aanbevolen" blijft wél een aandachtsignaal');
ok(/\.ic\.hi\{background:var\(--g1\);background:color-mix/.test(html), 'color-mix heeft een fallback voor oudere browsers');

// ── 0.2 periodekeuze vs ophaallimiet ─────────────────────────────────────────
console.log('  0.2 hrv_log-limiet vs 90-dagenselector');

eval(extractFn('_tkHealthLimitFor'));
eval(extractFn('_tkHealthCoverage'));

const mPeriods = html.match(/var TK_HEALTH_PERIODS = \[([\d,]+)\]/);
ok(!!mPeriods, 'TK_HEALTH_PERIODS bestaat als enige bron voor de knoppenrij');
const PERIODS = mPeriods[1].split(',').map(Number);
ok(html.indexOf('var periods=TK_HEALTH_PERIODS;') >= 0, 'de selector leest uit TK_HEALTH_PERIODS');

const TK_HEALTH_INIT_LIMIT = Number((html.match(/var TK_HEALTH_INIT_LIMIT = (\d+)/) || [])[1]);
eq(TK_HEALTH_INIT_LIMIT, 35, 'de eerste render houdt de bestaande, goedkope limiet aan');
ok(TK_HEALTH_INIT_LIMIT >= 28, 'de eerste render dekt de HRV-baseline van 28 dagen');

PERIODS.forEach(p => {
  const lim = _tkHealthLimitFor(p);
  ok(lim >= p, 'limiet voor ' + p + 'd (' + lim + ') dekt minstens één rij per dag');
  ok(lim <= 400, 'limiet voor ' + p + 'd blijft begrensd (' + lim + ' ≤ 400)');
});
ok(_tkHealthLimitFor(90) > TK_HEALTH_INIT_LIMIT, '90 dagen vraagt aantoonbaar meer dan de initiële 35 rijen');
ok(_tkHealthLimitFor(90) >= 180, '90 dagen laat ruimte voor meerdere check-ins op dezelfde dag');
ok(_tkHealthLimitFor(7) <= _tkHealthLimitFor(90), 'de limiet loopt monotoon op met de periode');

// Dekking: minder rijen dan de limiet = alles opgehaald.
eq(_tkHealthCoverage([], 35), 0, 'lege reeks dekt 0 dagen');
eq(_tkHealthCoverage([{ date: '2026-08-17' }], 35), Infinity, 'minder rijen dan de limiet = volledige historie');
const vol = [];
for (let i = 0; i < 35; i++){
  const d = new Date(Date.UTC(2026, 7, 17) - i * 86400000);
  vol.push({ date: d.toISOString().slice(0, 10) });
}
eq(_tkHealthCoverage(vol, 35), 35, 'volle pagina van 35 aaneengesloten dagen dekt 35 dagen');
eq(_tkHealthCoverage([{ date: '2026-08-17' }, { date: '2026-08-17' }], 2), 1,
  'twee check-ins op dezelfde dag dekken één dag — niet twee');

// Gedrag van de selector: alleen bijladen wanneer de cache tekortschiet.
let _tkHealthPeriod = 14, _tkHealthRows = [{ date: '2026-08-17' }], _tkHealthCoverDays = 0, _tkHealthLoading = false;
let _renders = 0, _queries = [];
let _lastRows = [{ date: '2026-08-17' }];
function tkRenderHealthHistoryInner(){ _renders++; return '<div></div>'; }
function sbGet(t, q){ _queries.push(t + q); return Promise.resolve(_lastRows); }
const _el = { innerHTML: '' };
global.document = { getElementById: () => _el };
eval(extractFn('tkSetHealthPeriod'));

_tkHealthCoverDays = Infinity; _queries = []; _renders = 0;
tkSetHealthPeriod(90);
eq(_queries.length, 0, 'volledige historie in cache → geen extra query bij 90d');
ok(_renders > 0, 'de weergave wordt wel opnieuw opgebouwd');

_tkHealthCoverDays = 30; _queries = []; _renders = 0;
tkSetHealthPeriod(30);
eq(_queries.length, 0, 'periode past binnen de dekking → geen extra query');

_tkHealthCoverDays = 30; _queries = []; _renders = 0;
tkSetHealthPeriod(90);
eq(_queries.length, 1, '90d met 30d dekking → precies één bijlaadquery');
ok(/limit=/.test(_queries[0]) && Number(_queries[0].split('limit=')[1]) === _tkHealthLimitFor(90),
  'de bijlaadquery gebruikt exact de van de periode afgeleide limiet');
ok(/order=date\.desc,created_at\.desc/.test(_queries[0]), 'de bestaande sorteervolgorde blijft ongewijzigd');
ok(_queries[0].indexOf('hrv_log') === 0, 'er wordt uit de bestaande tabel hrv_log gelezen — geen nieuw eindpunt');

// ── Fase 1 — overzicht en navigatiestructuur ─────────────────────────────────
console.log('  Fase 1 — Lichaam-overzicht en navigatie');

const LICH_SCREENS = ['s-lichaam', 's-lich-spieren', 's-lich-health', 's-lich-metingen'];
LICH_SCREENS.forEach(id => {
  eq((html.match(new RegExp('<div class="scr" id="' + id + '">', 'g')) || []).length, 1,
    'scherm ' + id + ' bestaat precies één keer');
});

// Verplaatste blokken mogen niet gedupliceerd raken: één element-id, één renderer.
['lich-hero','lich-checkin','lich-metrics','lich-relations','lich-belasting','lich-history',
 'lich-fig-front','lich-fig-back','lich-legend','lich-muslist','lich-anatfoot-t',
 'lich-bodymetrics','lich-history-health','v43-lich-figbox','v43-lich-list','v43-lich-overall',
 'muscle-heatmap-container','profiel-bc-card','profiel-w-chart','profiel-history'].forEach(id => {
  eq((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, 'id ' + id + ' komt precies één keer voor');
});

// De router bedient alle vier de schermen via dezelfde renderer.
const mRoute = html.match(/if\(id==='s-lichaam'\|\|id==='s-lich-spieren'\|\|id==='s-lich-health'\|\|id==='s-lich-metingen'\)renderLichaam\(\);/);
ok(!!mRoute, 'go() routeert Lichaam en de drie subschermen naar renderLichaam()');

// De CSS van Lichaam geldt ook op de subschermen (anders vallen verplaatste blokken kaal terug).
ok(html.indexOf(':is(#s-lichaam,#s-lich-spieren,#s-lich-spier,#s-lich-health,#s-lich-metingen) .lich-mus') >= 0,
  'de Lichaam-stijlen zijn verbreed naar alle subschermen, inclusief het spierdetail');
eq((html.match(/^#s-lichaam /gm) || []).length, 0, 'geen enkele Lichaam-stijl staat nog alleen op #s-lichaam');

// Metric-kaarten: elke route bestaat écht — geen nepscherm.
const mMap = html.match(/const TK_LICH_METRIC_ROUTE=\{([^}]+)\}/);
ok(!!mMap, 'TK_LICH_METRIC_ROUTE bestaat als enige routetabel voor de metric-kaarten');
const targets = (mMap ? mMap[1] : '').split(',').map(kv => kv.split(':')[1].replace(/'/g, '').trim());
eq(targets.length, 4, 'er zijn vier metric-kaarten (HRV, rust HR, slaap, gewicht)');
targets.forEach(t => ok(html.indexOf('<div class="scr" id="' + t + '">') >= 0,
  'route ' + t + ' verwijst naar een bestaand scherm'));

// Check-in: route naar de BESTAANDE modal, geen nieuwe flow.
ok(/lich-checkin/.test(html) && /class="lich-strip todo" onclick="openModal\('m-hrv'\)"/.test(html),
  'de check-instrip opent de bestaande check-in (m-hrv)');
ok(html.indexOf('id="m-hrv"') >= 0, 'de check-in-modal m-hrv is ongewijzigd aanwezig');

// Gemeten versus berekend.
ok(/tile\(df!=null\?df\.toFixed\(2\):'—','Dagfactor','berekend'\)/.test(html), 'dagfactor is gelabeld als berekend');
ok(/'HRV','gemeten'/.test(html) && /'Rust HR','gemeten'/.test(html) && /'Slaap','gemeten'/.test(html),
  'slaap, HRV en rusthartslag zijn gelabeld als gemeten');
// Anatomie is direct zichtbaar op het overzicht — harde acceptatie-eis.
ok(html.indexOf('<div class="lich-figpair">') >= 0, 'beide anatomiefiguren staan in de overzichtsmarkup');
ok(/id="lich-mode-rec"[\s\S]{0,200}id="lich-mode-load"/.test(html), 'de Herstel/Belasting-schakelaar staat op het overzicht');
ok(html.indexOf('let lichAnatMode') >= 0, 'figuur, legenda en lijst delen één modus-state');
ok(/renderMuscleRecoveryHeatmap\('lich-fig-front'[^)]*side:'front'/.test(html) &&
   /renderMuscleRecoveryHeatmap\('lich-fig-back'[^)]*side:'back'/.test(html),
   'voor- en achterzijde worden tegelijk getekend, zonder de module-state te wisselen');
ok(/renderMuscleHeatmap\('lich-fig-front'[^)]*side:'front'/.test(html), 'de belastingsmodus tekent dezelfde twee figuren');
ok(html.indexOf('Nog geen verbanden vrijgegeven') >= 0, 'de verbandensectie bestaat en toont de Decision-Engine-status');
ok(html.indexOf("relation: 'undecided'") < 0 && !/minimaal \d+ (vergelijkbare )?waarnemingen/.test(html),
   'er staat nergens een verzonnen drempel voor verbanden');

// Coach- en trainingsadvies staan niet meer op Lichaam (één source of truth).
ok(html.indexOf("Maximaal RPE ") < 0, 'het eigen RPE-plafond is van Lichaam verdwenen');
ok(html.indexOf("'Vandaag: '+escHtml(nextT.naam)") < 0, 'de trainingsnaam van vandaag staat niet meer op Lichaam');
ok(html.indexOf('id="lich-advies"') < 0, 'het blok Coachadvies is verwijderd');
ok(html.indexOf('id="lich-coach"') < 0, 'het coachblok is verwijderd');
const lichBody = extractFn('renderLichaamPremium');
ok(lichBody.indexOf('homeCoachText') < 0, 'de Lichaam-renderer leest de coachtekst van Home niet meer over');
ok(lichBody.indexOf('homeNextT') < 0, 'de Lichaam-renderer leest de training van vandaag niet meer over');
ok(/onclick="go\('s-coach'\)"><span class="ic">🤖/.test(html), 'er staat een verwijskaart naar Coach');
ok(/Welke training past hierbij\?/.test(html), 'er staat een verwijskaart naar Training');

// Geen dode stijlen van de verwijderde blokken.
ok(html.indexOf('.lich-adv{') < 0 && html.indexOf('.lich-ccard{') < 0, 'de stijlen van de verwijderde blokken zijn opgeruimd');

// De caption beloofde interactie die niet bestaat — die belofte is weg.
ok(html.indexOf('tik een spier voor detail') < 0, 'de onjuiste belofte "tik een spier voor detail" is verwijderd');

setTimeout(() => {
  _tkHealthCoverDays = 30; _queries = []; _renders = 0;
  tkSetHealthPeriod(90);
  tkSetHealthPeriod(90);
  eq(_queries.length, 1, 'dubbel klikken levert geen tweede gelijktijdige query op');

  console.log('\n  ' + pass + ' geslaagd, ' + fail + ' gefaald');
  if (fail) process.exit(1);
}, 20);
