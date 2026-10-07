/* core/fHomeDagfactorBasisSafety.test.js
 *
 * EEN NUMERIEKE FALLBACK IS GEEN EVIDENCE (DEC-DQ-002).
 *
 * dagfactor() geeft zonder HRV-oordeel, slaap en cyclusfase een neutrale 1.00 terug en meldt in
 * `basis` dat niets die waarde heeft gevoed. Home gooide `basis` weg en gaf de 1.00 als meting
 * door: "Klaar om te trainen", Dagfactor 1, Gereedheid 75, herstelscore 75/100, "Je herstel is
 * sterk" en een positieve readiness-zone, zonder één actuele meting.
 *
 * Deel 1 (altijd): de contextgrens met de echte functies uit index.html en de echte cores.
 * Deel 2 (Chromium, anders SKIP): de echte Home-flow via refreshHome(), scenario S1-S8, en de
 *         responsive regels.
 *
 * De berekening, de drempels en de Decision Engine zijn NIET gewijzigd; dat wordt hier bewezen
 * door de uitkomsten met echte data te vergelijken met wat de engines zelf teruggeven.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const CalcCore = require('./calculation.js');
const DecisionCore = require('./decision.js');
const DeviceCore = require('./deviceIntegration.js');
const CoachingCore = require('./coaching.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(JSON.stringify(a) === JSON.stringify(b), l + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }
function extractFn(src, name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('functie niet gevonden in index.html: ' + name);
  let i = src.indexOf('{', m.index), d = 0;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return src.slice(m.index, i + 1); } }
  throw new Error('functie niet afgesloten: ' + name);
}
function tussen(src, van, tot) { const i = src.indexOf(van); if (i < 0) throw new Error('niet gevonden: ' + van); const j = src.indexOf(tot, i); if (j < 0) throw new Error('einde niet gevonden: ' + tot); return src.slice(i, j); }

const GEEN_TXT = 'Nog te weinig gegevens voor advies';
const GEEN_SUB = 'Je check-in van vandaag is er, maar slaap of een HRV-oordeel ontbreekt nog.';
const GEEN_CHECKIN = 'Nog geen check-in vandaag — vul je HRV in en ik vertel je precies wat vandaag slim is.';
const COACH = {
  g: 'Je herstel is sterk. Vandaag heb je de grootste kans op progressie.',
  y: 'Je herstel is oké. Train je training vandaag op gevoel en houd je RPE in de gaten.',
  r: 'Je lichaam vraagt vandaag om rust. Houd je training licht of kies voor actief herstel.'
};
const SUB = {
  g: 'Je lichaam is goed hersteld en klaar voor optimale prestaties.',
  y: 'Train vandaag op gevoel en houd je RPE in de gaten.',
  r: 'Je lichaam vraagt om rust — houd het vandaag licht.'
};

/* ── invoer ─────────────────────────────────────────────────────────────────── */
function dag(n) { const d = new Date(); d.setDate(d.getDate() - n); const p = function (x) { return ('0' + x).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function reeks(f) { const u = []; for (let i = 0; i < 30; i++) u.push(Object.assign({ date: dag(i), hrv: 50 + ((i * 7) % 9) - 4, rhr: 55, sleep: 7.5, hrv_source: 'wearable', rhr_source: 'wearable', sleep_source: 'wearable', cyclus_fase: null, note: null }, f ? f(i) : {})); return u; }
const SCEN = {
  S1: [],
  S2: [{ date: dag(10), hrv: 48, rhr: 55, sleep: 7, note: null }],
  S3: [{ date: dag(0), hrv: null, rhr: 55, sleep: null, voelt: 'goed', note: null }],
  S4: [{ date: dag(0), hrv: 48, rhr: 55, sleep: null, note: null }, { date: dag(1), hrv: 50, rhr: 55, sleep: null, note: null }],
  S5: [{ date: dag(0), hrv: null, rhr: null, sleep: 7.5, note: null }],
  S6: reeks(function (i) { return i < 7 ? { hrv: 60, sleep: 8 } : {}; }),
  S7: reeks(function (i) { return i < 7 ? { hrv: 30, sleep: 5 } : {}; }),
  S8: reeks(function (i) { return i < 7 ? { hrv: 48 } : {}; })
};
const kloon = function (x) { return JSON.parse(JSON.stringify(x)); };

/* ══ Deel 1 — de contextgrens ═════════════════════════════════════════════════ */
const NAMEN = ['td', 'tkSleepHours', 'lnRmssd', 'hrvBaseline', 'hrvRollingRecent', 'hrvStPersonal', 'hrvDagFactorPersonal', 'slaapDagFactor', 'cyclusDagFactor',
  'tkCyclusFaseVandaag', 'tkHealthFailClosed', 'tkHealthQualified', 'tkSignaalOnbetrouwbaar', 'tkRhrDeltaHerstel', 'dagfactor', 'tkDagfactorHeeftBasis',
  'tkDagfactorVoorAdvies', 'tkCheckinVandaag', 'tkSpierherstelEvidence', 'recoveryScoreFrom', 'rhrBaselineDelta', 'v43GereedheidScore', 'tkReadinessVandaag', 'computeProgAdjustment',
  'dagfactorUitleg', 'tkNietMeegeteldTxt', 'tkMetingNa', 'joinNl', 'buildCoachAdvice', 'buildCoachTraining', 'buildCoachIntro', 'buildMorningMessage',
  'dayState', 'trainReadiness'];
const REFRESH = extractFn(HTML, 'refreshHome');
const DFINFO_LIT = (/dfInfo=(\{factor:df\.factor[^;]*\});/.exec(REFRESH) || [null, null])[1];
const TOAST_BLOK = tussen(HTML, "let hrvComponent={factor:1.00,st:'ref',baseline:null};", "\n  }\n  const parts=[];");
const PROD = NAMEN.map(function (n) { return extractFn(HTML, n); }).join('\n') +
  '\nconst HRV_BASELINE_MIN_DAYS = CalcCore.HRV_BASELINE_MIN_DAYS;' +
  '\n' + (/const TK_GEEN_ADVIES_TXT='[^']*';/.exec(HTML) || [''])[0] + (/const TK_GEEN_ADVIES_SUB='[^']*';/.exec(HTML) || [''])[0] +
  /* dfInfo exact zoals refreshHome() hem samenstelt: de objectliteral komt uit de bron */
  '\nfunction __homeDfInfo(df){ const uitleg="u", heroKleur="k", st=df.hrvSt; return ' + DFINFO_LIT + '; }' +
  '\nasync function __toast(hrv,slp,cyclus){ ' + TOAST_BLOK + ' }';

function runtime(hd) {
  const sb = {
    console: console, window: {}, CalcCore: CalcCore, DecisionCore: DecisionCore, DeviceCore: DeviceCore, CoachingCore: CoachingCore,
    v43SafeGet: async function (t) { return t === 'hrv_log' ? hd : []; }, sbGet: async function (t) { return t === 'hrv_log' ? hd : []; },
    getRelevantMuscleRecovery: async function () { return []; }, toasts: [], atleet: null,
    escHtml: function (x) { return String(x == null ? '' : x); }
  };
  sb.toast = function (t) { sb.toasts.push(t); };
  vm.createContext(sb); vm.runInContext(PROD, sb);
  return sb;
}
function df(sb, hd) { const hq = sb.tkHealthQualified(hd); const lh = hq.rows[0]; return lh ? sb.dagfactor(sb.hrvDagFactorPersonal(hq.rows), lh.sleep, sb.tkCyclusFaseVandaag(lh), hq.signalen) : null; }
async function besluit(hd, maak) { const sb = runtime(kloon(hd)); const d = df(sb, kloon(hd)); await sb.tkReadinessVandaag(maak(sb, d), [], null); return { sb: sb, df: d, b: sb.window._tkReadiness }; }
const samenvat = function (b) { return { bruikbaar: b.bruikbaar, reden: b.reden, zone: b.zone, zoneLabel: b.zoneLabel, dagfactor: b.dagfactor, gereedheid: b.gereedheid, herstel: b.herstel, advies: b.trainingsadvies.soort, dagthema: b.dagthema ? b.dagthema.key : null }; };
const GEEN_BESLUIT = { bruikbaar: false, reden: 'onvoldoende_gegevens', zone: null, zoneLabel: null, dagfactor: null, gereedheid: null, herstel: null, advies: 'geen_advies', dagthema: null };

async function deel1() {
  const sb = runtime([]);
  const V = sb.tkDagfactorVoorAdvies;
  /* A. De ene regel: bruikbaar voor advies = dagfactor aanwezig EN basis aanwezig. */
  {
    eq([V(null), V(undefined), V({}), V({ factor: 'x', basis: { slaap: true } }), V({ factor: NaN, basis: { slaap: true } })], [null, null, null, null, null], 'A1 geen of ongeldige dagfactor -> niet bruikbaar');
    eq(V({ factor: 1, basis: { hrv: false, slaap: false, cyclus: false } }), null, 'A2 neutrale 1.00 zonder basis -> niet bruikbaar (een fallback is geen evidence)');
    eq([V({ factor: 1 }), V({ factor: 1.05 }), V({ factor: 0.85, uitleg: 'x', st: 'r' })], [null, null, null], 'A3 een kaal getal zonder `basis` -> niet bruikbaar: de herkomst is onbekend (fail-closed)');
    const metBasis = { factor: 1, basis: { hrv: false, slaap: true, cyclus: false } };
    ok(V(metBasis) === metBasis, 'A4 met basis komt hetzelfde object ongewijzigd terug (ook bij een echte 1.00)');
    ['hrv', 'slaap', 'cyclus'].forEach(function (k) { const b = { hrv: false, slaap: false, cyclus: false }; b[k] = true; ok(V({ factor: 0.97, basis: b }) !== null, 'A5 één echte invoer (' + k + ') is een basis: de minimale basisdefinitie is ongewijzigd'); });
    eq((HTML.match(/b\.hrv\|\|b\.slaap\|\|b\.cyclus/g) || []).length, 1, 'A6 de basisregel zelf staat op precies één plek (tkDagfactorHeeftBasis); geen tweede ad-hoc check');
    ok(/function tkDagfactorVoorAdvies\(dfInfo\)\{[\s\S]{0,260}return tkDagfactorHeeftBasis\(dfInfo\)\?dfInfo:null;\s*\}/.test(HTML), 'A7 de helper hergebruikt de bestaande basiscontrole');
    eq(extractFn(HTML, 'tkDagfactorHeeftBasis').replace(/\s+/g, ' '), 'function tkDagfactorHeeftBasis(dfInfo){ const b=dfInfo&&dfInfo.basis; if(!b) return true; return !!(b.hrv||b.slaap||b.cyclus); }', 'A8 tkDagfactorHeeftBasis is ongewijzigd');
    eq([sb.tkCheckinVandaag(null), sb.tkCheckinVandaag({ date: dag(0) }), sb.tkCheckinVandaag({ date: dag(1) }), sb.tkCheckinVandaag({ date: null })], [false, true, false, false], 'A9 check-in van vandaag = er staat een rij met de datum van vandaag');
  }
  /* B. De orkestratiegrens: dfInfo zoals refreshHome() hem maakt. */
  {
    ok(!!DFINFO_LIT && /basis:df\.basis/.test(DFINFO_LIT), 'B1 refreshHome() geeft `basis` mee in dfInfo: ' + DFINFO_LIT);
    for (const s of ['S2', 'S3', 'S4']) {
      const r = await besluit(SCEN[s], function (x, d) { return x.__homeDfInfo(d); });
      eq([r.df.factor, r.df.basis], [1, { hrv: false, slaap: false, cyclus: false }], 'B2 ' + s + ': de berekening is ongewijzigd — neutrale 1 zonder basis');
      eq(samenvat(r.b), Object.assign({}, GEEN_BESLUIT, { herstel: r.b.herstel }), 'B3 ' + s + ': via de echte dfInfo bereikt readinessDay() zijn bestaande pad zonder dagfactor — geen zone, geen advies');
      ok(r.b.herstel === null || r.b.herstel.score !== 75, 'B4 ' + s + ': de herstelscore bevat de neutrale invulling niet meer (was 75 uit de fallback)');
    }
    const s2 = await besluit(SCEN.S2, function (x, d) { return x.__homeDfInfo(d); });
    eq(s2.b.herstel, null, 'B5 S2: zonder enig actueel signaal is er geen herstelscore (DEC-DQ-001 punt 6 wordt op Home afgedwongen)');
    /* het testgat: een uitgekleed dfInfo (zoals Home hem tot v4.70.16 maakte) */
    const kaal = await besluit(SCEN.S2, function (x, d) { return { factor: d.factor, uitleg: 'u', hero: 'k', st: d.hrvSt }; });
    eq(samenvat(kaal.b), GEEN_BESLUIT, 'B6 regressie: het oude, uitgeklede dfInfo ({factor,uitleg,hero,st}) levert geen positieve zone meer op');
    const kaalEcht = await besluit(SCEN.S6, function (x, d) { return { factor: d.factor, uitleg: 'u', hero: 'k', st: d.hrvSt }; });
    eq(Object.assign({}, samenvat(kaalEcht.b), { herstel: null }), GEEN_BESLUIT, 'B7 verliest Home ooit opnieuw `basis`, dan valt ook het advies bij echte data weg — dat breekt zichtbaar (zie S6-S8)');
    for (const s of ['S5', 'S6', 'S7', 'S8']) {
      const via = await besluit(SCEN[s], function (x, d) { return x.__homeDfInfo(d); });
      const vol = await besluit(SCEN[s], function (x, d) { return d; });
      eq(samenvat(via.b), samenvat(vol.b), 'B8 ' + s + ': met basis is het besluit via de Home-dfInfo gelijk aan dat met het volledige dagfactor-object');
      const z = DecisionCore.trainReadiness({ factor: via.df.factor });
      eq([via.b.bruikbaar, via.b.dagfactor, via.b.gereedheid, via.b.zone], [true, via.df.factor, CalcCore.readinessPercent(via.df.factor), z.cls === 'g' ? 'ready' : (z.cls === 'y' ? 'caution' : 'reduce')], 'B9 ' + s + ': zone, dagfactor en gereedheid komen ongewijzigd uit de engines');
    }
    eq([df(sb, kloon(SCEN.S6)).factor, df(sb, kloon(SCEN.S7)).factor, df(sb, kloon(SCEN.S8)).factor, df(sb, kloon(SCEN.S5)).factor], [1.05, 0.85, 0.93, 1], 'B10 de vaste invoer dekt positief (1.05), negatief (0.85), neutraal/voorzichtig (0.93) en alleen-slaap (1 met basis)');
    /* bronbinding: alle afnemers krijgen de gekeurde dagfactor */
    ok(/const dfAdvies=tkDagfactorVoorAdvies\(dfInfo\), checkinVandaag=tkCheckinVandaag\(lh\);/.test(REFRESH), 'B11 refreshHome() bepaalt één keer of de dagfactor bruikbaar is');
    ['buildCoachAdvice(dfAdvies,nextT,recRows,checkinVandaag)', 'renderMorning(dfAdvies,nextT,checkinVandaag)', 'renderTodayCta(nextT,dfAdvies)', 'renderCoachAdvies(dfAdvies,recRows)', 'renderV43Home(dfAdvies,lh,nextT,recRows)', "dfAdvies?dayState(dfAdvies.factor).key:'goed'"].forEach(function (a) {
      ok(REFRESH.indexOf(a) >= 0, 'B12 refreshHome() geeft de gekeurde dagfactor door: ' + a);
    });
    const naDef = REFRESH.slice(REFRESH.indexOf('const dfAdvies=') + 'const dfAdvies=tkDagfactorVoorAdvies(dfInfo)'.length);
    eq((naDef.match(/[(,]dfInfo[,)]/g) || []), ['(dfInfo,'], 'B13 na de keuring gaat dfInfo alleen nog naar tkReadinessVandaag(), die zelf keurt');
    ['tkReadinessVandaag', 'renderV43Home', 'buildCoachAdvice', 'buildCoachTraining', 'buildCoachIntro', 'buildMorningMessage', 'renderTodayCta'].forEach(function (n) {
      ok(/tkDagfactorVoorAdvies\(dfInfo\)/.test(extractFn(HTML, n)), 'B14 ' + n + '() keurt zelf aan de grens (ook veilig bij een andere aanroeper)');
    });
  }
  /* C. Live coach en AI lezen het besluit; ze krijgen de fallback niet als evidence. */
  {
    const r = await besluit(SCEN.S2, function (x, d) { return x.__homeDfInfo(d); });
    const ctx = CoachingCore.buildReadinessContext({ besluit: r.b, geplandeTraining: null });
    const ai = CoachingCore.readinessAiPayload(ctx);
    eq([ctx.magUitleggen, ai.zone, ai.zoneLabel, ai.zoneBetekenis, ai.herstel, ai.dagthema, ai.trainingsadvies], [false, undefined, undefined, undefined, undefined, undefined, { soort: 'geen_advies', setsDelta: 0, rpeDelta: 0 }], 'C1 AI-payload zonder basis: geen zone, geen label, geen herstelscore, geen dagthema; advies is geen_advies');
    ok(ai.datakwaliteit === 'onvoldoende' && ['hrv', 'rhr', 'slaap'].every(function (k) { return ai.ontbreekt.indexOf(k) >= 0; }), 'C2 de AI krijgt wel te horen dat de gegevens ontbreken');
    ok(!/"dagfactor":\s*[0-9]|"gereedheid"|"score"|:75\b/.test(JSON.stringify(ai)), 'C3 de neutrale 1 en de afgeleide 75 staan nergens als waarde in de AI-payload: ' + JSON.stringify(ai));
    const m = CoachingCore.readinessCoachMessage(ctx);
    eq([m.kop, m.betekenis, m.aanpassing, m.onzekerheid], [null, null, null, 'Ik heb hiervoor vandaag niet genoeg gegevens.'], 'C4 de readinesskaart gebruikt de bestaande tekst voor onvoldoende gegevens (CoachingCore ongewijzigd)');
    const liveBron = /readiness: \(window\._tkReadiness&&window\._tkReadiness\.bruikbaar\)\s*\? \{zone:window\._tkReadiness\.zone, zoneLabel:window\._tkReadiness\.zoneLabel,\s*trainingsadvies:window\._tkReadiness\.trainingsadvies\}\s*: null/.test(HTML);
    ok(liveBron, 'C5 de live coach leest readiness alleen bij een bruikbaar besluit');
    eq((r.b && r.b.bruikbaar) ? { zone: r.b.zone } : null, null, 'C6 dus zonder basis krijgt de live coach readiness: null');
    ok(/if\(adj&&hb&&hb\.bruikbaar&&hb\.zone==='ready'\)/.test(HTML), 'C7 de consistentiebrug vóór een training vereist ook een bruikbaar besluit');
    const echt = await besluit(SCEN.S6, function (x, d) { return x.__homeDfInfo(d); });
    const aiEcht = CoachingCore.readinessAiPayload(CoachingCore.buildReadinessContext({ besluit: echt.b }));
    eq([aiEcht.zone, aiEcht.zoneLabel, aiEcht.trainingsadvies.soort], ['ready', 'Goed hersteld', 'ongewijzigd'], 'C8 met echte data krijgt de AI het besluit zoals voorheen');
  }
  /* D. De melding na een check-in. */
  {
    const t = async function (hd, hrv, slp, cyc) { const x = runtime(hd); await x.__toast(hrv, slp, cyc); return x.toasts[0]; };
    eq(await t([{ date: dag(0), hrv: 48 }], 48, null, null), GEEN_TXT + ' — HRV: referentiefase (nog 14 dagen tot je eigen baseline)', 'D1 alleen HRV in de referentiefase: geen "Dagfactor 1" in de melding');
    eq(await t([], null, 7.5, null), 'Dagfactor 1 — slaap voldoende', 'D2 slaap ingevuld: basis aanwezig, melding zoals voorheen (ook bij een echte 1)');
    eq(await t(kloon(SCEN.S6), 60, 8, null), 'Dagfactor 1.05 — HRV goed t.o.v. je eigen baseline, slaap voldoende', 'D3 HRV met baseline en slaap: melding ongewijzigd');
    eq(await t(kloon(SCEN.S7), 30, 5, null), 'Dagfactor 0.85 — HRV sterk verlaagd t.o.v. je eigen baseline, slaap te kort', 'D4 negatieve dag: melding ongewijzigd');
    ok(/toast\(\(tkDagfactorVoorAdvies\(df\)\?\('Dagfactor '\+df\.factor\):TK_GEEN_ADVIES_TXT\)\+' — '\+dagfactorUitleg\(hrv,slp,cyclus,df\)\);/.test(TOAST_BLOK), 'D5 de melding gebruikt dezelfde helper');
  }
  /* E. Teksten zonder advies: check-in wel of niet aanwezig. */
  {
    const kaal = { factor: 1, uitleg: 'u', hero: 'k', st: 'ref' }, zonder = { factor: 1, basis: { hrv: false, slaap: false, cyclus: false } };
    eq([await sb.buildCoachAdvice(null, null, [], false), await sb.buildCoachAdvice(zonder, null, [], false), await sb.buildCoachAdvice(kaal, null, [], false)], [GEEN_CHECKIN, GEEN_CHECKIN, GEEN_CHECKIN], 'E1 coach zonder basis, geen check-in vandaag: de bestaande check-in-vraag');
    eq(await sb.buildCoachAdvice(zonder, null, [], true), GEEN_TXT + '. ' + GEEN_SUB, 'E2 coach zonder basis, check-in van vandaag aanwezig: "Nog te weinig gegevens voor advies", niet "nog geen check-in"');
    eq([sb.buildCoachTraining(zonder, []), sb.buildCoachTraining(kaal, [])], [null, null], 'E3 geen "Je bent klaar om te presteren" zonder basis');
    eq([sb.buildCoachIntro(zonder, false), sb.buildCoachIntro(zonder, true)], ['Vul je HRV in, dan vertel ik je hoe je ervoor staat.', GEEN_TXT + '.'], 'E4 coachintro volgt hetzelfde onderscheid');
    eq([sb.buildMorningMessage(zonder, null, false).regel, sb.buildMorningMessage(zonder, null, true).regel], ['Nog geen check-in vandaag — vul je HRV in voor je dagfactor.', GEEN_TXT + '. ' + GEEN_SUB], 'E5 ochtendboodschap volgt hetzelfde onderscheid');
    const g = { factor: 1.05, basis: { hrv: true, slaap: true, cyclus: false } }, y = { factor: 0.93, basis: { hrv: true, slaap: true, cyclus: false } }, r = { factor: 0.85, basis: { hrv: true, slaap: true, cyclus: false } };
    eq([await sb.buildCoachAdvice(g, null, [], true), await sb.buildCoachAdvice(y, null, [], true), await sb.buildCoachAdvice(r, null, [], true)], [COACH.g, COACH.y, COACH.r], 'E6 met basis zijn de drie bestaande coachzinnen woordelijk ongewijzigd');
    eq(await sb.buildCoachAdvice({ factor: 1, basis: { hrv: false, slaap: true, cyclus: false } }, null, [], true), COACH.g, 'E7 alleen slaap als basis (S5): bestaand gedrag, bewust niet gewijzigd');
  }
  /* F. Governance. */
  {
    const rd = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };
    const dec = rd('docs/00_Project_Management/DECISION_LOG.md'), con = rd('docs/DATA_QUALITY_CONFIDENCE_CONTRACT.md'), reg = rd('docs/DECISION_RULE_REGISTRY.md');
    ok(/## DEC-DQ-002 — /.test(dec) && /numerieke fallback is geen evidence/i.test(dec), 'F1 DEC-DQ-002 legt vast: een numerieke fallback is geen evidence');
    ok(/DEC-DQ-002/.test(con) && /tkDagfactorVoorAdvies/.test(con), 'F2 het datakwaliteitscontract noemt de contextgrens en de helper');
    ok(/DEC-DQ-002/.test(reg), 'F3 het beslisregelregister noemt de voorwaarde voor de dagfactor-invoer');
  }
}

/* ══ Deel 2 — de echte Home-flow ═════════════════════════════════════════════ */
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

async function deel2() {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) { console.log('fHomeDagfactorBasisSafety: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)'); return; }
  const url = 'file://' + path.join(ROOT, 'index.html');
  const open = async function (w, rows, sessies) {
    const page = await browser.newPage({ viewport: { width: w, height: 1400 } });
    const errs = []; page.on('pageerror', function (e) { errs.push(e.message); });
    await page.goto(url); await page.waitForTimeout(500);
    await page.evaluate(function (a) {
      exercises = [{ id: 'sq', naam: 'Squat', muscle_primary: ['Quadriceps'], muscle_secondary: [] }];
      window.sbGet = async function (t) { return t === 'hrv_log' ? a[0] : (t === 'sessions' ? a[1] : []); };
      window.fetchWearableStatus = async function () { return { connected: false }; };
      window.__klaar = false; const echt = window.refreshHome;
      window.refreshHome = async function () { const r = await echt.apply(this, arguments); window.__klaar = true; return r; };
      go('s-home');
    }, [rows, sessies || []]);
    await page.waitForFunction(function () { return window.__klaar === true && document.querySelectorAll('#home-hero .v43-stat-k').length === 4; }, null, { timeout: 60000 });
    page.__errs = errs;
    return page;
  };
  const lees = function (page) {
    return page.evaluate(async function () {
      const t = function (sel) { const e = document.querySelector(sel); return e ? e.textContent.replace(/­/g, '').replace(/\s+/g, ' ').trim() : null; };
      const hq = tkHealthQualified(await v43SafeGet('hrv_log', '&order=date.desc,created_at.desc&limit=35')); const lh = hq.rows[0] || null;
      const d = lh ? dagfactor(hrvDagFactorPersonal(hq.rows), lh.sleep, tkCyclusFaseVandaag(lh), hq.signalen) : null;
      const r = window._tkReadiness || {};
      const rec = await v43OverallRecovery();
      const stats = {}; document.querySelectorAll('#home-hero .v43-stat').forEach(function (s) { stats[s.querySelector('.v43-stat-k').textContent.replace(/­/g, '')] = (s.querySelector('.v43-stat-v,.v43-df-circle') || {}).textContent; });
      return { calc: d ? { factor: d.factor, basis: d.basis } : null, spierherstel: rec.hasData ? rec.overall + '%' : '—',
        titel: t('#home-hero .v43-hero-title'), sub: t('#home-hero .v43-hero-sub'), stats: stats, waarom: t('#v43-why-body'),
        coach: t('#home-coach-vandaag .t'), readiness: t('#home-readiness'), readinessKop: t('#home-readiness .tk-ready-kop'),
        bel: !!document.querySelector('#v43-home-head .bdot'), thema: document.getElementById('home-theme').getAttribute('data-day'),
        verborgen: [t('#home-morning'), t('#home-coach-advies'), t('#home-hrv-card'), t('#home-today-cta'), t('#home-dash .dash-status')].join(' || '),
        ring: t('#home-hrv-card .df-ring-val'),
        besluit: { bruikbaar: r.bruikbaar, zone: r.zone || null, zoneLabel: r.zoneLabel || null, dagfactor: r.dagfactor, gereedheid: r.gereedheid, herstel: r.herstel || null, advies: r.trainingsadvies && r.trainingsadvies.soort, dagthema: r.dagthema ? r.dagthema.key : null } };
    });
  };
  const POSITIEF = /Klaar om te trainen(?!\?)|goed hersteld en klaar|Je herstel is sterk|grootste kans op progressie|Goed hersteld|Goede dag|uitstekende dag|klaar om te presteren|Je herstel is goed|sterke trainingsdag|staat op groen/;
  const GEEN = { bruikbaar: false, zone: null, zoneLabel: null, dagfactor: null, gereedheid: null, advies: 'geen_advies', dagthema: null };
  const sessies = [{ exercise_id: 'sq', date: dag(2), rpe: 8, sets: 5, reps: 5, weight: 100 }];

  /* S1-S4: zonder bruikbare basis */
  for (const s of ['S1', 'S2', 'S3', 'S4']) {
    const page = await open(390, SCEN[s], sessies); const u = await lees(page);
    const checkin = (s === 'S3' || s === 'S4');
    if (s !== 'S1') eq(u.calc, { factor: 1, basis: { hrv: false, slaap: false, cyclus: false } }, s + '.0 berekening ongewijzigd: neutrale 1 zonder basis');
    eq([u.titel, u.sub], checkin ? [GEEN_TXT, GEEN_SUB] : ['Doe je check-in', 'Vul je HRV in voor je dagfactor en herstelbeeld.'], s + '.1 hoofdstatus: ' + (checkin ? 'erkent de check-in van vandaag, geen advies' : 'vraagt om de check-in'));
    eq([u.stats.Dagfactor, u.stats.Gereedheid], ['—', '—'], s + '.2 Dagfactor "—" en Gereedheid "—" (geen 1, geen 75)');
    eq(u.coach, checkin ? (GEEN_TXT + '. ' + GEEN_SUB) : GEEN_CHECKIN, s + '.3 coach: ' + (checkin ? '"Nog te weinig gegevens voor advies"' : 'de bestaande check-in-vraag'));
    eq([u.readinessKop, /Ik heb hiervoor vandaag niet genoeg gegevens\./.test(u.readiness)], ['Readiness vandaag', true], s + '.4 readinesskaart: de bestaande tekst voor onvoldoende gegevens, geen zone');
    eq(Object.assign({}, u.besluit, { herstel: undefined }), Object.assign({}, GEEN, { herstel: undefined }), s + '.5 _tkReadiness: geen zone, geen dagfactor, geen gereedheid, advies geen_advies');
    ok(u.besluit.herstel === null || u.besluit.herstel.score !== 75, s + '.6 geen herstelscore 75 uit de fallback');
    const alles = [u.titel, u.sub, u.coach, u.readiness, u.waarom, u.verborgen].join(' || ');
    ok(!POSITIEF.test(alles), s + '.7 nergens op Home een positieve herstel- of trainingsclaim: ' + ((POSITIEF.exec(alles) || [''])[0]));
    ok(!/Dagfactor 1\b|1 = HRV|Herstel 75\/100/.test(alles) && (s === 'S1' || u.ring === '—'), s + '.8 de neutrale 1 staat nergens als dagfactor (ook niet in de verborgen blokken)');
    eq(u.bel, !checkin, s + '.9 check-in-herinnering: ' + (checkin ? 'niet, de check-in is er' : 'ja'));
    /* gemeten data blijft zichtbaar */
    ok(/^\d+%$/.test(u.spierherstel) && u.stats.Spierherstel === u.spierherstel, s + '.10 spierherstel uit de sessies (v43OverallRecovery) blijft zichtbaar: ' + u.stats.Spierherstel + ' / ' + u.spierherstel);
    if (s === 'S2') eq(u.stats.Slaap, '7u', 'S2.11 de laatst gemeten slaap blijft zichtbaar');
    if (s === 'S1') eq(u.stats.Slaap, '—', 'S1.11 zonder enige rij is er geen slaapwaarde');
    ok(page.__errs.filter(function (e) { return !/fetch|CORS|NetworkError/i.test(e); }).length === 0, s + '.12 geen JavaScript-fouten');
    await page.close();
  }
  /* S5-S8: met basis — uitkomst gelijk aan wat de engines teruggeven */
  for (const s of ['S5', 'S6', 'S7', 'S8']) {
    const page = await open(390, SCEN[s], sessies); const u = await lees(page);
    const f = u.calc.factor, z = DecisionCore.trainReadiness({ factor: f });
    eq(f, { S5: 1, S6: 1.05, S7: 0.85, S8: 0.93 }[s], s + '.0 dagfactor uit de berekening');
    ok(u.calc.basis.hrv || u.calc.basis.slaap || u.calc.basis.cyclus, s + '.0b er is een basis');
    eq([u.titel, u.sub], [z.txt, SUB[z.cls]], s + '.1 hoofdstatus woordelijk zoals voorheen (' + z.txt + ')');
    eq([u.stats.Dagfactor, u.stats.Gereedheid], [String(f), String(CalcCore.readinessPercent(f))], s + '.2 Dagfactor en Gereedheid zijn de berekende waarden');
    eq(u.coach, COACH[z.cls], s + '.3 coachzin woordelijk zoals voorheen');
    const zone = z.cls === 'g' ? 'ready' : (z.cls === 'y' ? 'caution' : 'reduce');
    eq([u.besluit.bruikbaar, u.besluit.zone, u.besluit.dagfactor, u.besluit.gereedheid, u.besluit.dagthema], [true, zone, f, CalcCore.readinessPercent(f), DecisionCore.dayZone(f).key], s + '.4 _tkReadiness: zone, dagfactor, gereedheid en dagthema ongewijzigd');
    eq(u.readinessKop, { ready: 'Goed hersteld', caution: 'Voorzichtig vandaag', reduce: 'Belasting aanpassen' }[zone], s + '.5 readinesskaart toont het bestaande zonelabel');
    eq([u.thema, u.ring, u.bel], [DecisionCore.dayZone(f).key, String(f), false], s + '.6 dagthema, dagfactorkaart en check-in-herinnering ongewijzigd');
    ok(new RegExp('Dagfactor' + String(f).replace('.', '\\.')).test(u.waarom.replace(/\s/g, '')), s + '.7 "Waarom vandaag?" toont de berekende dagfactor');
    await page.close();
  }
  /* Responsive: Home-kengetallen en de dagsamenvatting op Inzicht */
  const vandaagSlaap = [{ date: dag(0), hrv: 48, rhr: 55, sleep: 7.5, note: null }];
  for (const w of [320, 340, 360, 390, 412]) {
    const page = await open(w, vandaagSlaap, sessies);
    const h = await page.evaluate(function () {
      const st = Array.from(document.querySelectorAll('#home-hero .v43-stat'));
      const b = st.map(function (s) { const k = s.querySelector('.v43-stat-k'); const r = document.createRange(); r.selectNodeContents(k); const t = r.getBoundingClientRect(); return { naam: k.textContent.replace(/­/g, ''), l: t.left, r: t.right, h: Math.round(k.getBoundingClientRect().height), regels: Math.round(t.height / 17) }; });
      let overlap = false; for (let i = 0; i < b.length - 1; i++) if (b[i].r > b[i + 1].l + 0.5) overlap = true;
      const kaart = document.querySelector('#home-hero .v43-hero').getBoundingClientRect();
      return { namen: b.map(function (x) { return x.naam; }), overlap: overlap, hoogtes: b.map(function (x) { return x.h; }), regels: b.map(function (x) { return x.regels; }), binnen: b.every(function (x) { return x.r <= kaart.right + 0.5 && x.l >= kaart.left - 0.5; }), pagina: document.getElementById('s-home').scrollWidth > document.getElementById('s-home').clientWidth + 1 };
    });
    eq(h.namen, ['Dagfactor', 'Spierherstel', 'Gereedheid', 'Slaap'], w + 'px R1 het Home-kengetal heet Spierherstel');
    ok(!h.overlap && h.binnen && !h.pagina, w + 'px R2 geen overlap tussen de labels, alles binnen de kaart, geen horizontaal scrollen');
    ok(new Set(h.hoogtes).size === 1, w + 'px R3 de vier labels zijn even hoog, de rij blijft uitgelijnd: ' + JSON.stringify(h.hoogtes));
    eq(h.regels[1], w <= 360 ? 2 : 1, w + 'px R4 Spierherstel staat op ' + (w <= 360 ? 'twee regels (afgebroken op het streepje)' : 'één regel'));
    await page.evaluate(function () { window.__inz = false; go('s-inzicht'); });
    await page.waitForFunction(function () { return document.querySelectorAll('#lich-hero .grid .m').length === 4; }, null, { timeout: 30000 });
    const i = await page.evaluate(function () {
      const g = document.querySelector('#lich-hero .grid'), k = document.querySelector('#lich-hero .lich-rhero').getBoundingClientRect(); const ms = Array.from(g.children).map(function (m) { return m.getBoundingClientRect(); });
      return { past: g.scrollWidth <= g.clientWidth, kolommen: new Set(ms.map(function (m) { return Math.round(m.left); })).size, rijen: new Set(ms.map(function (m) { return Math.round(m.top); })).size, binnen: ms.every(function (m) { return m.right <= k.right + 0.5 && m.left >= k.left - 0.5; }), pagina: document.getElementById('s-inzicht').scrollWidth > document.getElementById('s-inzicht').clientWidth + 1 };
    });
    ok(i.past && i.binnen && !i.pagina, w + 'px R5 de vier tegels van de dagsamenvatting blijven binnen de kaart: ' + JSON.stringify(i));
    eq([i.kolommen, i.rijen], w < 360 ? [2, 2] : [4, 1], w + 'px R6 ' + (w < 360 ? '2×2 onder 360 px' : 'vier naast elkaar'));
    await page.close();
  }
  await browser.close();
}

(async function () {
  try { await deel1(); await deel2(); }
  catch (e) { fail++; msgs.push('onverwachte fout: ' + (e && e.stack || e)); }
  console.log('fHomeDagfactorBasisSafety: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
