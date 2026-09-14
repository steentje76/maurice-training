/* fEnduranceCoachContext.test.js — ENDURANCE GAP 1B (GAP-P2-026): canonical berekende
 * endurance-intelligence → Context Engine via de dunne adapter tkEnduranceCoachContext().
 * Draait de ECHTE adapter-functies uit index.html met de ECHTE canonical cores en een
 * stub-sbGet (geen netwerk, geen fake berekening).
 *
 * Draai: node core/fEnduranceCoachContext.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
const RunningIntelligenceCore = require(path.join(ROOT, 'core/runningIntelligence.js'));
const CyclingIntelligenceCore = require(path.join(ROOT, 'core/cyclingIntelligence.js'));
const SwimmingIntelligenceCore = require(path.join(ROOT, 'core/swimmingIntelligence.js'));
const TrainingLoadCore = require(path.join(ROOT, 'core/trainingLoad.js'));
const ProgressionCore = require(path.join(ROOT, 'core/progression.js'));
let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }

function extractFn(name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = re.exec(html); if (!m) return null;
  let i = html.indexOf('{', m.index), d = 0;
  for (let j = i; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (d === 0) return html.slice(m.index, j + 1); } }
  return null;
}
const SPORTS_FN = extractFn('tkEnduranceCtxSports'), PROJECT_FN = extractFn('tkEnduranceCtxProject'), ADAPTER_FN = extractFn('tkEnduranceCoachContext');
const BUILD_CTX = extractFn('buildCtx');
ok(SPORTS_FN && PROJECT_FN && ADAPTER_FN && BUILD_CTX, 'adapter-functies + buildCtx() gevonden');
const CONSTS = (html.match(/var TK_ENDURANCE_CTX_WINDOW_DAYS=\d+, TK_ENDURANCE_CTX_LIMIT=\d+, TK_ENDURANCE_CTX_MAXEFFORT_LIMIT=\d+;/) || [''])[0];
ok(CONSTS, 'begrenzingsconstanten gevonden');

function sandbox(activeSport, queries) {
  const calls = [];
  const ctx = {
    CardioCore, RunningIntelligenceCore, CyclingIntelligenceCore, SwimmingIntelligenceCore, TrainingLoadCore, ProgressionCore,
    getActiveSport: () => activeSport, Date: FixedDate, Promise, Math, Object, Array, String, Number, isFinite, console,
    sbGet: (table, q) => { calls.push(table + q); return Promise.resolve(queries(table, q)); }
  };
  vm.createContext(ctx);
  vm.runInContext(CONSTS + '\n' + SPORTS_FN + '\n' + PROJECT_FN + '\n' + ADAPTER_FN, ctx);
  ctx._calls = calls; return ctx;
}
const NOW = new Date('2026-09-13T12:00:00Z');
// Datum-stabiel: de adapter gebruikt `new Date()`; de sandbox krijgt een Date die zonder argumenten NOW teruggeeft.
class FixedDate extends Date { constructor(...a) { if (a.length === 0) super(NOW.getTime()); else super(...a); } static now() { return NOW.getTime(); } }
const d = (daysAgo) => new Date(NOW.getTime() - daysAgo * 86400000).toISOString();
// Running: 3 max-effort met verschillende duren (CS-eligible) + gewone sessies met RPE
const RUN = [ // oudste sessies langzamer -> pace-trend verbeterend
  { sport: 'running', recorded_at: d(2), distance_meters: 5000, duration_seconds: 1440, rpe: 6, is_max_effort: false },
  { sport: 'running', recorded_at: d(5), distance_meters: 10000, duration_seconds: 3300, rpe: 7, is_max_effort: false },
  { sport: 'running', recorded_at: d(9), distance_meters: 5000, duration_seconds: 1460, rpe: null, is_max_effort: false },
  { sport: 'running', recorded_at: d(16), distance_meters: 5000, duration_seconds: 1480, rpe: 8, is_max_effort: false },
  { sport: 'running', recorded_at: d(23), distance_meters: 5000, duration_seconds: 1500, rpe: 8, is_max_effort: false }
];
const RUN_MAX = [
  { sport: 'running', recorded_at: d(30), distance_meters: 1500, duration_seconds: 330, is_max_effort: true },
  { sport: 'running', recorded_at: d(60), distance_meters: 3000, duration_seconds: 690, is_max_effort: true },
  { sport: 'running', recorded_at: d(90), distance_meters: 5000, duration_seconds: 1200, is_max_effort: true }
];
const BIKE = [
  { sport: 'cycling', recorded_at: d(3), distance_meters: 40000, duration_seconds: 5400, rpe: 6, avg_power_watts: 222 },
  { sport: 'cycling', recorded_at: d(10), distance_meters: 42000, duration_seconds: 5500, rpe: 7, avg_power_watts: 215 },
  { sport: 'cycling', recorded_at: d(17), distance_meters: 41000, duration_seconds: 5300, rpe: 7, avg_power_watts: 210 }
];
const BIKE_MAX = [
  { sport: 'cycling', recorded_at: d(20), duration_seconds: 180, avg_power_watts: 380, is_max_effort: true },
  { sport: 'cycling', recorded_at: d(40), duration_seconds: 600, avg_power_watts: 300, is_max_effort: true },
  { sport: 'cycling', recorded_at: d(70), duration_seconds: 1200, avg_power_watts: 270, is_max_effort: true }
];
const SWIM = [{ sport: 'swimming', recorded_at: d(4), distance_meters: 2000, duration_seconds: 2400, rpe: 5 }];
const ALL = RUN.concat(BIKE, SWIM), ALL_MAX = RUN_MAX.concat(BIKE_MAX);
function q(table, query) {
  if (table !== 'activities') return [];
  if (query.includes('is_max_effort=eq.true')) return ALL_MAX;
  const m = /sport=in\.\(([^)]+)\)/.exec(query); const sports = m ? m[1].split(',') : [];
  return ALL.filter((a) => sports.includes(a.sport));
}

(async () => {
  // Referentie: exact de canonical core-uitkomsten (geen eigen formule in de test)
  const csRef = CardioCore.criticalSpeed(RunningIntelligenceCore.criticalSpeedEligiblePerformances(RUN_MAX, 3).performances);
  const cpRef = CardioCore.criticalPower(CyclingIntelligenceCore.criticalPowerEligiblePerformances(BIKE_MAX, 3).performances);
  ok(csRef.status === 'valid' && cpRef.status === 'valid', 'fixture: CS en CP zijn canonical valid');

  // ── running ──
  let c = sandbox('running', q); let t = await c.tkEnduranceCoachContext();
  ok(t.includes('ENDURANCE-INTELLIGENCE') && t.includes('Sport: Hardlopen'), 'running-blok aanwezig');
  ok(t.includes('Critical Speed: ' + CardioCore.formatTime(Math.round(1000 / csRef.cs_m_s)) + '/km'), 'A: CS in context = exact canonical CardioCore.criticalSpeed()-uitkomst');
  ok(t.includes('critical_speed.v1') && t.includes('confidence ' + csRef.confidence) && t.includes(csRef.n_performances + ' geschikte'), 'F: calc-ID, confidence en N letterlijk doorgegeven');
  ok(t.includes('≠ drempeltempo uit het profiel'), 'H: CS expliciet ≠ threshold pace');
  ok(!t.includes('Critical Power') && !t.includes('Sport: Fietsen') && !t.includes('Sport: Zwemmen'), 'D: running-context bevat geen cycling/swimming');
  ok(/Weekvolume laatste 4 weken: 30\.0 km · 5 sessies/.test(t), 'weekvolume via RunningIntelligenceCore.weeklyVolume (weekkeys binnen 28 d: 5 sessies, 30,0 km)');
  const s7 = TrainingLoadCore.rollingLoadSum([TrainingLoadCore.sessionLoadSRPE(1440, 6), TrainingLoadCore.sessionLoadSRPE(3300, 7)]);
  ok(t.includes('7 d ' + s7 + ' AU (2 sessies)'), 'I: 7d-belasting = canonical sRPE-som (alleen sessies met RPE), venster caller-side');
  ok(/28 d \d+ AU \(4 van 5 sessies\)/.test(t), 'I: 28d-belasting telt N-met-RPE van M-totaal (ontbrekende RPE niet verzonnen)');
  ok(/running_5_10km: verbeterend \(4 sessies\)/.test(t) && /running_10_15km: onvoldoende vergelijkbare data/.test(t), 'trend via ProgressionCore.trendBy per band (pace omlaag = verbeterend; 1 sessie = onvoldoende)');
  ok(t.includes('niet herberekenen') && t.includes('geen ACWR-/blessure-interpretatie'), 'M: AI-grens in de tekst');
  ok(c._calls.length === 2 && c._calls[0].includes('limit=200') && c._calls[0].includes('recorded_at=gte.') && c._calls[1].includes('is_max_effort=eq.true') && c._calls[1].includes('limit=50'),
    'K: exact 2 begrensde queries (venster + limit 200; max-effort limit 50), geen 500/1000');
  ok(c._calls[0].includes('sport=in.(running)'), 'D/K: running-context haalt alleen running-activiteiten op');

  // ── cycling ──
  c = sandbox('wielrennen', q); t = await c.tkEnduranceCoachContext();
  ok(t.includes('Sport: Fietsen') && t.includes('Critical Power: ' + Math.round(cpRef.cp_w) + ' W'), 'B: CP in context = exact canonical CardioCore.criticalPower()-uitkomst');
  ok(t.includes('critical_power.v1') && t.includes('≠ FTP uit het profiel'), 'G: CP expliciet ≠ FTP');
  ok(!t.includes('Critical Speed:') && !t.includes('Sport: Hardlopen'), 'D: cycling-context bevat geen running CS-regel');
  ok(!/w_prime|W′|d_prime|r_squared|R²/.test(t), 'geen W′/D′/R² naar de AI');
  ok(/vermogen: stijgend \(3 ritten\)/.test(t), 'power-trend via trendBy (max)');

  // ── swimming: alleen relevante metrics ──
  c = sandbox('swimming', q); t = await c.tkEnduranceCoachContext();
  ok(t.includes('Sport: Zwemmen') && !t.includes('Critical Speed:') && !t.includes('Critical Power:') && t.includes('Weekvolume') && t.includes('Belasting'), 'swimming: volume + belasting, geen CS/CP-regel');
  ok(c._calls.length === 1, 'swimming: geen max-effort-query (CS/CP n.v.t.)');

  // ── triathlon: alle drie, elk gescheiden ──
  c = sandbox('triathlon', q); t = await c.tkEnduranceCoachContext();
  ok(t.includes('Sport: Hardlopen') && t.includes('Sport: Fietsen') && t.includes('Sport: Zwemmen'), 'triathlon: drie sportblokken');
  ok(t.indexOf('Critical Speed') < t.indexOf('Sport: Fietsen') && t.indexOf('Critical Power') > t.indexOf('Sport: Fietsen'), 'triathlon: CS onder hardlopen, CP onder fietsen (geen vermenging)');

  // ── kracht/crossfit: geen blok, geen query ──
  c = sandbox('kracht', q); t = await c.tkEnduranceCoachContext();
  ok(t === '' && c._calls.length === 0, 'L: kracht → leeg blok én nul queries');
  c = sandbox('crossfit', q); ok((await c.tkEnduranceCoachContext()) === '', 'L: crossfit → leeg');

  // ── E: insufficient blijft insufficient (geen getal), null-RPE ──
  c = sandbox('running', (tb, qq) => qq.includes('is_max_effort') ? [RUN_MAX[0]] : RUN.map((a) => Object.assign({}, a, { rpe: null }))); t = await c.tkEnduranceCoachContext();
  ok(/Critical Speed: onvoldoende geschikte max-effort-prestaties \(1\/3\) — geen waarde, niet schatten/.test(t), 'E: 1 eligible → insufficient-tekst, geen CS-getal');
  ok(!/Critical Speed: \d/.test(t), 'E: nooit een getal bij insufficient');
  ok(/7 d 0 AU \(0 sessies\)/.test(t) && /28 d 0 AU \(0 van/.test(t), 'E: geen RPE → 0 AU met 0 sessies (niet verzonnen)');
  // fail-safe bij query-fout
  c = sandbox('running', () => { throw new Error('db down'); }); ok((await c.tkEnduranceCoachContext()) === '', 'fail-safe: fout → leeg blok, geen crash');

  // ── C/J: geen formule in adapter, geen LongitudinalTrendCore/contextEngine ──
  const A = PROJECT_FN + ADAPTER_FN;
  ok(!/LongitudinalTrendCore|ContextEngineCore|contextEngine/.test(A), 'J: geen LongitudinalTrendCore/ContextEngineCore-activatie');
  ok(!/Math\.pow|Math\.exp|Math\.log|\*\s*rpe|rpe\s*\*|2\.80|slope|regress/.test(A), 'C: geen eigen formule in de adapter (alleen core-aanroepen)');
  ok(/CardioCore\.criticalSpeed\(/.test(A) && /CardioCore\.criticalPower\(/.test(A) && /criticalSpeedEligiblePerformances\(/.test(A) && /criticalPowerEligiblePerformances\(/.test(A), 'A/B: canonical eligibility + cores gebruikt');
  ok(/RunningIntelligenceCore\.weeklyVolume\(/.test(A) && /TrainingLoadCore\.sessionLoadSRPE\(/.test(A) && /TrainingLoadCore\.rollingLoadSum\(/.test(A) && /ProgressionCore\.trendBy\(/.test(A), 'canonical volume/load/trend-functies gebruikt');
  ok(/(csElig|cpElig)\.status==='eligible'/.test(A) && /r\.status==='valid'/.test(A), 'E/F: eligibility-status en core-status gerespecteerd');
  ok(!/limit=500|limit=1000/.test(ADAPTER_FN) && /TK_ENDURANCE_CTX_LIMIT/.test(ADAPTER_FN) && /TK_ENDURANCE_CTX_MAXEFFORT_LIMIT/.test(ADAPTER_FN), 'K: adapter gebruikt de begrenzingsconstanten, nooit de Insights-limieten');
  ok(/tkEnduranceCoachContext\(\)\.catch\(function\(\)\{ return ''; \}\)/.test(BUILD_CTX) && /\$\{enduranceIntelTekst\|\|''\}/.test(BUILD_CTX), 'buildCtx() consumeert de adapter in de bestaande Promise.all en projecteert het blok');
  ok(!/criticalSpeed\(|criticalPower\(|weeklyVolume\(|sessionLoadSRPE\(|rollingLoadSum\(/.test(BUILD_CTX), 'C/L: buildCtx() zelf roept geen endurance-cores aan (alleen via de adapter); bestaande context ongewijzigd');
  ok(/enduranceProfielTekst/.test(BUILD_CTX), 'L: Gap 1a-profielblok blijft aanwezig (threshold pace/FTP apart van CS/CP)');

  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fEnduranceCoachContext: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
