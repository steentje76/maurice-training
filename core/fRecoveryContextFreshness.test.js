/* fRecoveryContextFreshness.test.js — twee restpunten uit PR #515:
 *
 *  1. CYCLUSFASE. hrv_log.cyclus_fase is zelf-gerapporteerde check-in-context en is datumgebonden.
 *     De keten nam haar uit de nieuwste rij, hoe oud die ook was: een fase van tien dagen geleden
 *     stuurde de dagfactor van vandaag. Nu telt alleen de fase op de rij van vandaag
 *     (tkCyclusFaseVandaag) — dezelfde regel als voor het gevoel uit de check-in. Er wordt geen
 *     fase geschat of doorgetrokken; CycleCore blijft een suggestie voor de check-in.
 *
 *  2. HERSTELDETAIL. openRecoveryDetail() zette "Vandaag:" voor de nieuwste meting, ook als die
 *     dagen oud was. Het label komt nu uit de bestaande versheid van observation.v1
 *     (tkMetingWanneer, dezelfde helper als de herkomstregel bij lichaamsmetingen).
 *
 * De suite draait op de ECHTE functies uit index.html met de echte cores. Datums zijn relatief
 * aan vandaag, omdat td() en CalcCore.hrvBaseline met 'nu' rekenen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CalcCore = require('./calculation.js');
const DecisionCore = require('./decision.js');
const DeviceCore = require('./deviceIntegration.js');
const CoachingCore = require('./coaching.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }

function extractFn(src, name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('functie niet gevonden in index.html: ' + name);
  let i = src.indexOf('{', m.index), d = 0;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return src.slice(m.index, i + 1); } }
  throw new Error('functie niet afgesloten: ' + name);
}
const NAMEN = ['td', 'tkSleepHours', 'lnRmssd', 'hrvBaseline', 'hrvRollingRecent', 'hrvStPersonal', 'hrvDagFactorPersonal',
  'slaapDagFactor', 'cyclusDagFactor', 'tkCyclusFaseVandaag', 'tkHealthFailClosed', 'tkHealthQualified', 'tkSignaalOnbetrouwbaar',
  'tkRhrDeltaHerstel', 'dagfactor', 'tkDagfactorHeeftBasis', 'recoveryScoreFrom', 'rhrBaselineDelta', 'todayPainMuscle',
  'recoveryAdjustmentForToday', 'computeProgAdjustment', 'v43GereedheidScore', 'tkReadinessVandaag',
  'fmtDate', 'capitalize', 'tkMetingHerkomst', 'tkMetingWanneer', 'tkMetingLabel', 'openRecoveryDetail'];
const PROD = NAMEN.map(function (n) { return extractFn(HTML, n); }).join('\n');

function runtime(state, opts) {
  opts = opts || {};
  const el = { innerHTML: '' };
  const sb = {
    console: console, window: {}, CalcCore: CalcCore, CoachingCore: CoachingCore, DecisionCore: DecisionCore,
    v43SafeGet: async function (t) { return t === 'hrv_log' ? state.hd : []; },
    sbGet: async function (t) { return t === 'hrv_log' ? state.hd : []; },
    getRelevantMuscleRecovery: async function () { return state.recRows || []; },
    document: { getElementById: function () { return el; } },
    openModal: function () {}, escHtml: function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
    progCheckinCtx: null
  };
  if (!opts.zonderDeviceCore) sb.DeviceCore = DeviceCore;
  vm.createContext(sb); vm.runInContext(PROD, sb);
  sb.__el = el;
  return sb;
}
function homeDf(sb, hdRuw) {            // de orkestratie van refreshHome (bronbinding: sectie E)
  const hq = sb.tkHealthQualified(hdRuw); const hd = hq.rows; const lh = hd[0];
  return lh ? sb.dagfactor(sb.hrvDagFactorPersonal(hd), lh.sleep, sb.tkCyclusFaseVandaag(lh), hq.signalen) : null;
}
async function draai(state) {
  const sb = runtime(state);
  const df = homeDf(sb, state.hd);
  await sb.tkReadinessVandaag(df, state.recRows || [], null);
  const b = sb.window._tkReadiness;
  const adj = await sb.recoveryAdjustmentForToday(['borst'], {});
  return { sb: sb, df: df, besluit: b, herstel: b.herstel, start: adj };
}
// Het gedrag van vóór deze wijziging: fase uit de nieuwste rij, ongeacht de datum.
function oudeDf(sb, hdRuw) {
  const hq = sb.tkHealthQualified(hdRuw); const hd = hq.rows; const lh = hd[0];
  return lh ? sb.dagfactor(sb.hrvDagFactorPersonal(hd), lh.sleep, lh.cyclus_fase, hq.signalen) : null;
}
async function detail(hd) { const sb = runtime({ hd: hd }); await sb.openRecoveryDetail(); return sb.__el.innerHTML; }

function dag(n) { const d = new Date(); d.setDate(d.getDate() - n); const p = function (x) { return ('0' + x).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function reeks(n, bron, start, fase) {
  const uit = [];
  for (let i = (start || 0); i < n + (start || 0); i++) {
    uit.push({ date: dag(i), hrv: 50 + ((i * 7) % 9) - 4, hrv_source: bron, rhr: 55 + ((i * 3) % 5) - 2, rhr_source: bron,
      sleep: 7.5 - ((i % 4) * 0.25), sleep_source: bron, cyclus_fase: null, note: null });
  }
  if (fase) uit[0].cyclus_fase = fase;
  return uit;
}
const kloon = function (x) { return JSON.parse(JSON.stringify(x)); };
const REC = [{ pct: 80 }, { pct: 70 }];
const VANDAAG = dag(0);
const kern = function (r) { return [r.df.factor, r.df.cyclusFactor, r.df.basis, r.herstel ? [r.herstel.score, r.herstel.band, r.herstel.betrouwbaarheid] : null,
  [r.start.factor, r.start.score, r.start.band, r.start.confidence, r.start.setsDelta, r.start.rpeDelta], r.besluit.zone, r.besluit.trainingsadvies]; };

async function main() {
  /* ══ A. De regel zelf: de fase is datumgebonden ══════════════════════════ */
  {
    const sb = runtime({ hd: [] });
    const F = sb.tkCyclusFaseVandaag;
    eq(F({ date: VANDAAG, cyclus_fase: 'menstruatie' }), 'menstruatie', 'A1 fase op de rij van vandaag telt');
    eq(F({ date: VANDAAG + 'T07:30:00+02:00', cyclus_fase: 'luteaal' }), 'luteaal', 'A2 ook met een tijdstempel achter de datum');
    eq([F({ date: dag(1), cyclus_fase: 'menstruatie' }), F({ date: dag(10), cyclus_fase: 'menstruatie' }), F({ date: dag(-1), cyclus_fase: 'menstruatie' })], [null, null, null], 'A3 fase van gisteren, van 10 dagen geleden of uit de toekomst telt niet voor vandaag');
    eq([F({ cyclus_fase: 'luteaal' }), F({ date: null, cyclus_fase: 'luteaal' }), F({ date: '', cyclus_fase: 'luteaal' }), F({ date: 'kapot', cyclus_fase: 'luteaal' })], [null, null, null, null], 'A4 ontbrekende of ongeldige datum -> geen fase (niets gefabriceerd)');
    eq([F(null), F(undefined), F({ date: VANDAAG }), F({ date: VANDAAG, cyclus_fase: '' }), F({ date: VANDAAG, cyclus_fase: null })], [null, null, null, null, null], 'A5 geen rij of geen fase -> null');
    ok(!/CycleCore|cycleContext|cycle_periods|getDate|Date\(/.test(extractFn(HTML, 'tkCyclusFaseVandaag')), 'A6 de regel schat of projecteert geen fase (geen CycleCore, geen dagtelling)');
  }

  /* ══ B. Dagfactor en keten ═══════════════════════════════════════════════ */
  {
    // 1. fase op de rij van vandaag -> exact zoals voorheen
    for (const fase of ['menstruatie', 'folliculair', 'ovulatie', 'luteaal']) {
      const hd = reeks(30, 'wearable', 0, fase);
      const r = await draai({ hd: kloon(hd), recRows: REC });
      const oud = oudeDf(r.sb, kloon(hd));
      eq([r.df.factor, r.df.cyclusFactor, r.df.basis.cyclus], [oud.factor, CalcCore.cyclusDagFactor(fase), true], 'B1 fase ' + fase + ' van vandaag: dagfactor en cyclusfactor gelijk aan het oude gedrag');
    }
    // 2. gisteren en 3. tien dagen geleden -> stuurt vandaag niet
    for (const n of [1, 10]) {
      const hd = reeks(30, 'wearable', n, 'menstruatie');
      const r = await draai({ hd: kloon(hd), recRows: REC });
      const oud = oudeDf(r.sb, kloon(hd));
      const zonder = await draai({ hd: kloon(hd).map(function (x) { return Object.assign(x, { cyclus_fase: null }); }), recRows: REC });
      ok(oud.cyclusFactor === 0.93 && oud.basis.cyclus === true, 'B2 uitgangspunt (' + n + ' dag(en) oud): het oude gedrag paste de fase van de oude rij toe (cyclusfactor 0.93)');
      eq([r.df.cyclusFactor, r.df.basis.cyclus], [1, false], 'B3 fase van ' + n + ' dag(en) geleden stuurt de dagfactor van vandaag niet (neutrale cyclusfactor, geen basis)');
      eq(kern(r), kern(zonder), 'B4 en de hele uitkomst is gelijk aan dezelfde data zonder cyclusfase (' + n + ' dag(en) oud)');
    }
    // 4. geen actuele fase -> neutraal
    const geen = await draai({ hd: reeks(30, 'wearable'), recRows: REC });
    eq([geen.df.cyclusFactor, geen.df.basis.cyclus], [1, false], 'B5 geen cyclusfase: bestaande neutrale semantiek (factor 1.00)');
    // 5. stale HRV + oude cyclusfase -> geen verborgen oude context
    const oudAlles = reeks(25, 'wearable', 10, 'menstruatie');
    const s = await draai({ hd: kloon(oudAlles), recRows: REC });
    const oudS = oudeDf(s.sb, kloon(oudAlles));
    eq([oudS.factor, oudS.basis], [0.93, { hrv: false, slaap: false, cyclus: true }], 'B6 uitgangspunt: bij verouderde health-data stuurde alleen de oude cyclusfase nog de dagfactor (0.93)');
    eq([s.df.factor, s.df.basis, s.herstel.score, s.herstel.betrouwbaarheid, s.start.factor], [1, { hrv: false, slaap: false, cyclus: false }, 75, 'laag', 1], 'B7 nu: geen verborgen oude herstelcontext — dagfactor neutraal zonder basis, alleen spierherstel telt');
    // 6. actuele HRV/slaap + oude cyclusfase -> health telt, cyclus niet
    const gemengd = reeks(30, 'wearable'); gemengd[3].cyclus_fase = 'menstruatie';
    const g = await draai({ hd: kloon(gemengd), recRows: REC });
    const ref = await draai({ hd: reeks(30, 'wearable'), recRows: REC });
    eq(kern(g), kern(ref), 'B8 actuele HRV/slaap + een fase op een rij van 3 dagen geleden: health telt normaal, cyclus niet');
    const oudeRijVoorop = reeks(30, 'wearable', 2, 'luteaal');
    const o = await draai({ hd: kloon(oudeRijVoorop), recRows: REC });
    eq([o.df.basis, o.df.cyclusFactor], [{ hrv: true, slaap: true, cyclus: false }, 1], 'B9 nieuwste rij 2 dagen oud (recent): HRV en slaap blijven tellen (#515 ongewijzigd), de fase niet');
    // 7. volledig actuele geldige invoer -> numeriek ongewijzigd
    for (const fase of [null, 'luteaal']) {
      const hd = reeks(30, 'wearable', 0, fase);
      const r = await draai({ hd: kloon(hd), recRows: REC });
      const oud = oudeDf(r.sb, kloon(hd));
      eq([r.df.factor, r.df.hrvFactor, r.df.slaapFactor, r.df.cyclusFactor, r.df.basis], [oud.factor, oud.hrvFactor, oud.slaapFactor, oud.cyclusFactor, oud.basis], 'B10 volledig actuele invoer (fase ' + fase + '): dagfactor en onderdelen numeriek ongewijzigd');
    }
    eq([ref.df.factor, ref.herstel.score, ref.herstel.band, ref.herstel.betrouwbaarheid, ref.start.setsDelta, ref.start.rpeDelta], [1.05, 92, 'hoog', 'hoog', 0, 0], 'B11 referentiescenario uit #515 geeft dezelfde getallen (dagfactor 1.05, herstel 92 hoog)');
    // fail-closed blijft: zonder keuringslaag telt de fase van vandaag nog wel, een oude niet
    const fc = runtime({ hd: [] }, { zonderDeviceCore: true });
    eq([homeDf(fc, [{ date: VANDAAG, hrv: 450, sleep: 4, cyclus_fase: 'luteaal' }]).cyclusFactor, homeDf(fc, [{ date: dag(4), hrv: 450, sleep: 4, cyclus_fase: 'luteaal' }]).cyclusFactor], [0.97, 1], 'B12 fail-closed: fase van vandaag blijft werken, een oude fase niet');
    // startpad en programma-check-in volgen dezelfde regel
    const st = await draai({ hd: reeks(30, 'wearable', 1, 'menstruatie'), recRows: REC });
    eq(st.start.factor, st.df.factor, 'B13 het startpad (recoveryAdjustmentForToday) rekent met dezelfde dagfactor');
  }

  /* ══ C. Meetmoment: één helper op de bestaande versheid ══════════════════ */
  {
    const sb = runtime({ hd: [] });
    const W = sb.tkMetingWanneer, L = sb.tkMetingLabel;
    eq([W(VANDAAG), W(dag(1)), W(dag(3)), W(dag(10))], ['vandaag', 'gisteren', '3 dagen geleden', '10 dagen geleden'], 'C1 vandaag / gisteren / N dagen geleden (observation.v1)');
    eq([W(null), W(undefined), W(''), W('kapot'), W('2026-13')], ['', '', '', '', ''], 'C2 geen of ongeldige datum -> lege string, geen verzonnen tijdsaanduiding');
    ok(W(dag(-2)) === sb.fmtDate(dag(-2)) && W(dag(-2)) !== 'vandaag', 'C3 een datum in de toekomst wordt als feitelijke datum getoond, nooit als vandaag');
    eq([L({ date: VANDAAG }), L({ date: dag(1) }), L({ date: dag(10) }), L({}), L(null), L({ date: 'x' })], ['Vandaag', 'Gisteren', '10 dagen geleden', 'Laatste meting', 'Laatste meting', 'Laatste meting'], 'C4 label: Vandaag alleen bij een meting van vandaag; zonder datum een neutraal label');
    eq([sb.tkMetingHerkomst(VANDAAG, 'Tanita', 'entered', null), sb.tkMetingHerkomst(dag(10), null, 'measured', 5), sb.tkMetingHerkomst(null, 'x')], ['Bron: Tanita · vandaag · ingevoerd', 'Bron: handmatig · 10 dagen geleden · gemeten', ''], 'C5 de bestaande herkomstregel geeft dezelfde tekst als voorheen');
    const bron = extractFn(HTML, 'tkMetingWanneer');
    ok(/dc\.observation\(/.test(bron) && !/Date\.now|new Date|86400000/.test(bron), 'C6 geen eigen tijdlogica: de versheid komt uit DeviceCore.observation');
    ok(/tkMetingWanneer\(datum, bron, soort, waarde\)/.test(extractFn(HTML, 'tkMetingHerkomst')), 'C7 tkMetingHerkomst gebruikt dezelfde helper (geen tweede datumregel)');
    const zonderDc = runtime({ hd: [] }, { zonderDeviceCore: true });
    ok(zonderDc.tkMetingWanneer(dag(10)) === zonderDc.fmtDate(dag(10)) && zonderDc.tkMetingLabel({ date: VANDAAG }) !== 'Vandaag', 'C8 zonder observatielaag: de feitelijke datum, nooit een aangenomen "Vandaag"');
  }

  /* ══ D. Hersteldetail (echte openRecoveryDetail) ═════════════════════════ */
  {
    const nu = await detail(reeks(30, 'wearable'));
    ok(/<div>Vandaag: \d+ ms<\/div>/.test(nu) && /<div>Vandaag: \d+ bpm<\/div>/.test(nu) && /<div>Vandaag: [\d.]+ uur<\/div>/.test(nu), 'D1 meting van vandaag: HRV, rusthartslag en slaap krijgen het label "Vandaag"');
    const gisteren = await detail(reeks(30, 'wearable', 1));
    ok(/<div>Gisteren: \d+ ms<\/div>/.test(gisteren) && /<div>Gisteren: \d+ bpm<\/div>/.test(gisteren) && /<div>Gisteren: [\d.]+ uur<\/div>/.test(gisteren) && !/Vandaag: \d/.test(gisteren), 'D2 meting van gisteren: "Gisteren", niet "Vandaag"');
    const oud = await detail(reeks(25, 'wearable', 10));
    ok(/<div>10 dagen geleden: \d+ ms<\/div>/.test(oud) && /<div>10 dagen geleden: \d+ bpm<\/div>/.test(oud) && /<div>10 dagen geleden: [\d.]+ uur<\/div>/.test(oud), 'D3 meting van 10 dagen oud: het feitelijke meetmoment');
    ok(!/Vandaag: \d/.test(oud), 'D4 een oude meting wordt nergens als "Vandaag" gepresenteerd');
    const geenDatum = await detail([{ date: null, hrv: 48, rhr: 55, sleep: 7 }]);
    ok(!/Vandaag: \d/.test(geenDatum) && !/dagen geleden|Gisteren/.test(geenDatum), 'D5 ontbrekende datum: geen gefabriceerd datumlabel');
    const slaapLeeg = reeks(30, 'wearable'); slaapLeeg[0].sleep = null;
    ok(/<div>Vandaag: niet ingevuld<\/div>/.test(await detail(slaapLeeg)), 'D6 geen slaap op de nieuwste rij: "Vandaag: niet ingevuld" blijft (dat is een feit over vandaag)');
    const bron = extractFn(HTML, 'openRecoveryDetail');
    ok(!/'<div>Vandaag: '\+lh\./.test(bron) && (bron.match(/tkMetingLabel\(lh\)/g) || []).length === 3, 'D7 de drie waarderegels gebruiken het meetmoment-label, geen vast "Vandaag"');
    ok(typeof (await detail([])) === 'string' && /onvoldoende hersteldata/.test(await detail([])), 'D8 zonder data blijft het detail bruikbaar');
  }

  /* ══ E. Bedrading ════════════════════════════════════════════════════════ */
  const home = extractFn(HTML, 'refreshHome');
  ok(/const cyclusVandaag=tkCyclusFaseVandaag\(lh\);/.test(home) && /dagfactor\(hrvComponent,lh\.sleep,cyclusVandaag,hq\.signalen\)/.test(home) && !/lh\.cyclus_fase/.test(home), 'E1 refreshHome: dagfactor, uitleg en detail gebruiken alleen de fase van vandaag');
  ['recoveryAdjustmentForToday', 'evaluateProgAdjustment', 'renderLichaamPremium'].forEach(function (naam) {
    const src = extractFn(HTML, naam);
    ok(/tkCyclusFaseVandaag\(/.test(src) && !/\.cyclus_fase/.test(src), 'E2 ' + naam + ' neemt de cyclusfase via tkCyclusFaseVandaag');
  });
  const vandaagAanroepen = HTML.split('\n').filter(function (l) { return /dagfactor\(hrvDagFactorPersonal\(hd\)/.test(l); });
  ok(vandaagAanroepen.length === 4 && vandaagAanroepen.every(function (l) { return /tkCyclusFaseVandaag\(/.test(l) && !/\.cyclus_fase/.test(l); }), 'E3 alle vier de dagfactor-aanroepen op de nieuwste rij gebruiken de datumgebonden fase (' + vandaagAanroepen.length + ')');
  ok(/dagfactor\(hc, rij\.sleep, rij\.cyclus_fase\)/.test(HTML), 'E4 de historische reeks rekent per dag met de fase van DIE dag (ongewijzigd, al datumgebonden)');
  ok(/dagfactor\(hrvComponent,slp,cyclus\)/.test(HTML), 'E5 de check-in van vandaag gebruikt de zojuist ingevulde fase (ongewijzigd)');
  const calcSrc = fs.readFileSync(path.join(ROOT, 'core', 'calculation.js'), 'utf8');
  eq([CalcCore.cyclusDagFactor('menstruatie'), CalcCore.cyclusDagFactor('folliculair'), CalcCore.cyclusDagFactor('ovulatie'), CalcCore.cyclusDagFactor('luteaal'), CalcCore.cyclusDagFactor(null)], [0.93, 1.03, 1, 0.97, 1], 'E6 de cyclusfactoren van de Calculation Engine zijn ongewijzigd');
  ok(!/tkCyclusFaseVandaag|td\(\)/.test(calcSrc), 'E7 de Calculation Engine kent geen datumlogica voor de cyclusfase (opgelost in de orkestratie)');
}

main().then(function () {
  console.log('fRecoveryContextFreshness: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) { console.error('fRecoveryContextFreshness: onverwachte fout', e); process.exit(1); });
