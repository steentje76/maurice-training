/* Readiness Reliability PR A (DEC-DQ-003) — vijf bewezen lekken in de contextlaag.
 *
 *   N1  trainingsintro beweert geen goed herstel zonder bruikbare dagfactor
 *   N2  een nooit getrainde spier ({pct:100,hours:null}) is geen evidence voor herstel
 *   N3  de AI-context krijgt gekeurde healthrijen; stale staat nooit onder de actuele waarden
 *   N4  Inzicht gebruikt DecisionCore.trainReadiness, geen eigen grenzen
 *   N5  de dagfactorreeks bevat geen dagen zonder basis
 *   V   het trainingsvoorschrift (sets, RPE) verandert niet
 *
 * De test draait de ECHTE functies uit index.html in een vm, met de echte cores.
 * Er staan geen vaste herstelpercentages of datums in: verwachte waarden komen uit de cores zelf.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
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
function tussen(src, van, tot) {
  const i = src.indexOf(van); if (i < 0) throw new Error('blokbegin niet gevonden: ' + van);
  const j = src.indexOf(tot, i); if (j < 0) throw new Error('blokeinde niet gevonden: ' + tot);
  return src.slice(i, j);
}
function konst(naam) { const m = new RegExp('const ' + naam + "='[^']*';").exec(HTML); if (!m) throw new Error('constante niet gevonden: ' + naam); return m[0]; }

const NAMEN = ['td', 'tkSleepHours', 'tkFmtSleepHours', 'fmtSleep', 'v43SlaapTxt', 'v43RecColor', 'lnRmssd', 'hrvBaseline', 'hrvRollingRecent',
  'hrvStPersonal', 'hrvDagFactorPersonal', 'slaapDagFactor', 'cyclusDagFactor', 'tkCyclusFaseVandaag', 'tkHealthFailClosed', 'tkHealthQualified',
  'tkHealthVandaag', 'tkMetingNa', 'tkSignaalOnbetrouwbaar', 'tkRhrDeltaHerstel', 'dagfactor', 'tkDagfactorHeeftBasis', 'tkDagfactorVoorAdvies',
  'tkCheckinVandaag', 'trainReadiness', 'tkSpierherstelEvidence', 'tkAiHealthStatus', 'recoveryScoreFrom', 'rhrBaselineDelta', 'todayPainMuscle',
  'recoveryAdjustmentForToday', 'computeProgAdjustment', 'v43GereedheidScore', 'tkReadinessVandaag', 'fmtDate', 'capitalize', 'tkMetingWanneer',
  'tkMetingLabel', 'dayState', 'buildTrainIntro', 'tkDagfactorReeksen', 'buildHeroFocus', 'renderTodayCta'];
const LICH = extractFn(HTML, 'renderLichaamPremium');
const LICH_BLOK = tussen(LICH, 'let hd=[]; let lh=null; let hq=null;', '// Body/Health foundation + apparaatstatus');
const CTX = extractFn(HTML, 'buildCtx');
const INTRO = extractFn(HTML, 'buildTrainIntro');
const REEKS = extractFn(HTML, 'tkDagfactorReeksen');
const PROD = NAMEN.map(function (n) { return extractFn(HTML, n); }).join('\n') +
  '\n' + konst('TK_GEEN_ADVIES_TXT') + konst('TK_GEEN_ADVIES_SUB') + konst('TK_TRAIN_INTRO_NEUTRAAL') +
  '\nasync function __lichHero(){ const rec=window.v43LichRec||{overall:100,rows:[],hasData:false}; const rows=rec.rows||[];\n' + LICH_BLOK + '\n return document.getElementById(\'lich-hero\').innerHTML; }' +
  '\nfunction __neutraal(){ return TK_TRAIN_INTRO_NEUTRAAL; }';

function runtime(state) {
  const els = {};
  const st = state || {};
  const sb = {
    console: console, window: {}, CalcCore: CalcCore, CoachingCore: CoachingCore, DecisionCore: DecisionCore, DeviceCore: DeviceCore,
    v43SafeGet: async function (t) { return t === 'hrv_log' ? (st.hd || []) : []; },
    sbGet: async function (t) { return t === 'hrv_log' ? (st.hd || []) : []; },
    getRelevantMuscleRecovery: async function () { return st.recRows || []; },
    getExerciseMuscles: function () { return ['borst']; },
    musclePhrase: function (m) { return m.join(' en '); },
    document: { getElementById: function (id) { return els[id] || (els[id] = { innerHTML: '', style: {} }); } },
    openModal: function () {}, progCheckinCtx: null,
    escHtml: function (x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  };
  vm.createContext(sb); vm.runInContext(PROD, sb);
  sb.__els = els;
  return sb;
}
const BASIS = runtime();
const VANDAAG = BASIS.td();
function dag(n) { const d = new Date(VANDAAG + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); }
// 20 dagen HRV rond 50 ms: genoeg voor een eigen baseline. `laatste` is de waarde van vandaag.
function hrvReeks(laatste, extra) {
  const r = [];
  for (let i = 0; i < 20; i++) r.push({ date: dag(i), hrv: i === 0 ? laatste : 50 + (i % 3), rhr: 55, sleep: 8 });
  if (extra) Object.keys(extra).forEach(function (k) { r[0][k] = extra[k]; });
  return r;
}
function focusVan(html) { return (/<div class="train-intro-focus">([^<]*)<\/div>/.exec(html) || [null, null])[1]; }
function kleurVan(html) { return (/--tcol:([^"]*)"/.exec(html) || [null, null])[1]; }

(async function () {
  // ══ BRON: de vijf lekken staan niet meer in de code ══
  ok(!/let key='goed'/.test(INTRO), 'N1 bron: de intro begint niet meer op de toestand "goed"');
  ok(/tkDagfactorVoorAdvies\(dagfactor\(/.test(INTRO), 'N1 bron: de intro vraagt de dagfactor via tkDagfactorVoorAdvies()');
  ok(/tkSpierherstelEvidence\(recRows\)/.test(extractFn(HTML, 'recoveryScoreFrom')), 'N2 bron: recoveryScoreFrom middelt alleen evidence-rijen');
  ok(/spierherstel:[^\n]*tkSpierherstelEvidence\(recRows\)/.test(extractFn(HTML, 'tkReadinessVandaag')), 'N2 bron: het spierherstelsignaal naar readinessDay is gefilterd');
  eq((HTML.match(/function tkSpierherstelEvidence\(/g) || []).length, 1, 'N2 bron: één helper voor de regel');
  ok(/r\.hours!==null/.test(extractFn(HTML, 'tkSpierherstelEvidence')), 'N2 bron: de helper gebruikt de bestaande herkomst hours!==null');
  ok(/const hq=tkHealthQualified\(hdRuw\);/.test(CTX), 'N3 bron: buildCtx keurt de healthrijen via tkHealthQualified()');
  eq((CTX.match(/hdRuw/g) || []).length, 3, 'N3 bron: de rauwe rijen worden alleen opgehaald, gekeurd en in commentaar genoemd');
  ok(/const hd=hq\.rows;/.test(CTX), 'N3 bron: hd in buildCtx zijn de gekeurde rijen');
  ok(/const hrvStr=tkAiHealthStatus\(hq, lh, avg7\);/.test(CTX), 'N3 bron: de statusregel komt uit tkAiHealthStatus()');
  ok(!/lh\.(hrv|rhr|sleep)\b/.test(CTX), 'N3 bron: buildCtx leest geen HRV, RHR of slaap meer rechtstreeks uit de nieuwste rij');
  ok(/HUIDIGE STATUS:\n\$\{hrvStr\}/.test(CTX), 'N3 bron: de prompt gebruikt die ene statusregel');
  ok(/if\(hrvNietActueel\)\{/.test(CTX), 'N3 bron: de HRV-toelichting heeft een pad voor een niet-actuele meting');
  ok(!/ger>=70|ger>=45/.test(LICH), 'N4 bron: geen eigen gereedheidsgrenzen 70/45 meer op Inzicht');
  ok(/const ready=beoordeeld\?trainReadiness\(\{factor:df\}\)\.txt:/.test(LICH), 'N4 bron: het dagoordeel komt uit trainReadiness()');
  ok(/return DecisionCore\.trainReadiness\(dfInfo\);/.test(extractFn(HTML, 'trainReadiness')), 'N4 bron: trainReadiness() is een doorgeefwrapper naar DecisionCore');
  ok(/if\(tkDagfactorVoorAdvies\(df\)\)\{/.test(REEKS), 'N5 bron: de reeks gebruikt dezelfde basisregel');
  ok(!/basis\.(hrv|slaap|cyclus)/.test(REEKS + INTRO + CTX), 'N1/N3/N5 bron: nergens een eigen definitie van "basis"');

  // ══ N1 — TRAININGSINTRO ══
  const NEUTRAAL = BASIS.__neutraal();
  async function intro(hd) { return await runtime({ hd: hd }).buildTrainIntro('t', [{ id: 1 }, { id: 2 }]); }
  const POSITIEF = /herstel is goed|Prima dag/;
  const iGeen = await intro([]);
  eq(focusVan(iGeen), NEUTRAAL, 'N1 geen data: neutrale intro');
  ok(!POSITIEF.test(iGeen), 'N1 geen data: geen positieve herstelclaim');
  ok(kleurVan(iGeen) !== '#00B894', 'N1 geen data: niet de kleur van "goed"');
  ok(/Vandaag train je borst\./.test(iGeen) && /2 oefeningen/.test(iGeen), 'N1 geen data: de geplande training staat er gewoon');
  const iNotitie = await intro([{ date: VANDAAG, note: 'druk' }]);
  eq(focusVan(iNotitie), NEUTRAAL, 'N1 check-in zonder slaap of HRV: neutrale intro');
  const iStale = await intro([{ date: dag(10), hrv: 48, rhr: 55, sleep: 7 }]);
  eq(focusVan(iStale), NEUTRAAL, 'N1 alleen stale data: neutrale intro');
  ok(!POSITIEF.test(iStale), 'N1 alleen stale data: geen positieve herstelclaim');
  const iRef = await intro([{ date: VANDAAG, hrv: 48 }]);
  eq(focusVan(iRef), NEUTRAAL, 'N1 HRV in referentiefase zonder slaap: neutrale intro');
  // Met basis: de bestaande uitkomst per dagzone blijft.
  const TEKST = { goed: 'Je herstel is goed — focus op sterke, gecontroleerde sets.', normaal: 'Prima dag — train op gevoel en houd je techniek scherp.',
    vermoeid: 'Rustig opbouwen vandaag. Kwaliteit boven gewicht.', herstel: 'Vandaag herstelgericht — houd het licht en luister naar je lijf.', slecht: 'Rustig aan vandaag. Kwaliteit boven gewicht.' };
  const KLEUR = { goed: '#00B894', normaal: '#C8A84B', vermoeid: '#D98A3D', herstel: '#4A90C2', slecht: '#E0704A' };
  const gevallen = [[{ date: VANDAAG, sleep: 8 }], [{ date: VANDAAG, sleep: 6.5 }], [{ date: VANDAAG, sleep: 5 }], hrvReeks(50), hrvReeks(30, { sleep: 5 })];
  const zones = {};
  for (const hd of gevallen) {
    const hq = BASIS.tkHealthQualified(hd);
    const df = BASIS.dagfactor(BASIS.hrvDagFactorPersonal(hq.rows), hq.rows[0].sleep, BASIS.tkCyclusFaseVandaag(hq.rows[0]), hq.signalen);
    ok(!!BASIS.tkDagfactorVoorAdvies(df), 'N1 met basis: testgeval heeft een bruikbare dagfactor (' + df.factor + ')');
    const key = DecisionCore.dayZone(df.factor).key; zones[key] = 1;
    const h = await intro(hd);
    eq(focusVan(h).replace(/&amp;/g, '&'), TEKST[key], 'N1 met basis ' + df.factor + ': bestaande zin voor zone ' + key);
    eq(kleurVan(h), KLEUR[key], 'N1 met basis ' + df.factor + ': bestaande kleur voor zone ' + key);
  }
  ok(zones.goed && Object.keys(zones).length >= 3, 'N1 met basis: de gevallen dekken "goed" en minstens twee andere zones (' + Object.keys(zones).join(',') + ')');

  // ══ N2 — NOOIT GETRAIND IS GEEN EVIDENCE ══
  const NOOIT = [{ muscle: 'borst', pct: 100, hours: null }, { muscle: 'triceps', pct: 100, hours: null }];
  const DEELS = [{ muscle: 'borst', pct: 60, hours: 20 }, { muscle: 'triceps', pct: 100, hours: null }, { muscle: 'schouders', pct: 100, hours: null }];
  const ALLE = [{ muscle: 'borst', pct: 60, hours: 20 }, { muscle: 'triceps', pct: 80, hours: 30 }, { muscle: 'schouders', pct: 100, hours: 90 }];
  const DF = { factor: 0.97, basis: { hrv: false, slaap: true, cyclus: false } };
  eq(BASIS.tkSpierherstelEvidence(NOOIT), [], 'N2 helper: 0 spieren met historie -> geen evidence');
  eq(BASIS.tkSpierherstelEvidence(DEELS).map(function (r) { return r.muscle; }), ['borst'], 'N2 helper: alleen de spier met historie');
  eq(BASIS.tkSpierherstelEvidence(ALLE).length, 3, 'N2 helper: alle spieren met historie blijven');
  eq(BASIS.tkSpierherstelEvidence(null), [], 'N2 helper: geen rijen -> lege lijst');
  eq(BASIS.tkSpierherstelEvidence([{ muscle: 'borst', pct: 100, hours: 400 }]).length, 1, 'N2 helper: 100% mét sessie is wel evidence');
  // 0 spieren met historie
  eq(BASIS.recoveryScoreFrom(null, NOOIT), CalcCore.recoveryScore({}), 'N2 geen data: herstelscore is die van "geen invoer"');
  eq(BASIS.recoveryScoreFrom(null, NOOIT).score, null, 'N2 geen data: geen score');
  eq(BASIS.recoveryScoreFrom(DF, NOOIT), CalcCore.recoveryScore({ dayFactor: 0.97 }), 'N2 0 met historie: alleen de dagfactor telt');
  // sommige spieren met historie
  eq(BASIS.recoveryScoreFrom(DF, DEELS), CalcCore.recoveryScore({ dayFactor: 0.97, muscleRecoveryPct: 60 }), 'N2 deels: alleen de spier met historie (60%)');
  ok(JSON.stringify(BASIS.recoveryScoreFrom(DF, DEELS)) !== JSON.stringify(CalcCore.recoveryScore({ dayFactor: 0.97, muscleRecoveryPct: 87 })), 'N2 deels: de oude uitkomst (gemiddelde 87% met twee ingevulde 100\'en) is weg');
  eq(BASIS.recoveryScoreFrom(null, DEELS), CalcCore.recoveryScore({ muscleRecoveryPct: 60 }), 'N2 deels zonder dagfactor: 60%, geen fictieve 100');
  // alle spieren met historie: bestaande score
  eq(BASIS.recoveryScoreFrom(DF, ALLE), CalcCore.recoveryScore({ dayFactor: 0.97, muscleRecoveryPct: 80 }), 'N2 alle met historie: bestaande score (gemiddelde 80%)');
  eq(BASIS.recoveryScoreFrom(DF, [{ muscle: 'borst', pct: 100, hours: 400 }]), CalcCore.recoveryScore({ dayFactor: 0.97, muscleRecoveryPct: 100 }), 'N2 gemeten 100% blijft 100%');

  // Keten: training starten zonder enige data -> geen herstelscore naar live coach en AI.
  async function keten(hd, recRows) {
    const sb = runtime({ hd: hd, recRows: recRows });
    const hq = sb.tkHealthQualified(hd); const lh = hq.rows[0];
    const df = lh ? sb.dagfactor(sb.hrvDagFactorPersonal(hq.rows), lh.sleep, sb.tkCyclusFaseVandaag(lh), hq.signalen) : null;
    await sb.tkReadinessVandaag(df, recRows || [], null);
    return { besluit: sb.window._tkReadiness, adj: await sb.recoveryAdjustmentForToday(['borst', 'triceps'], {}) };
  }
  const kGeen = await keten([], NOOIT);
  eq([kGeen.adj.score, kGeen.adj.band], [null, 'onbekend'], 'N2 keten geen data: geen herstelscore 100/hoog voor de live coach');
  eq([kGeen.adj.setsDelta, kGeen.adj.rpeDelta, kGeen.adj.redenen], [0, 0, []], 'V keten geen data: geen aanpassing van sets of RPE');
  eq(kGeen.besluit.bruikbaar, false, 'N2 keten geen data: readiness is niet bruikbaar');
  ok(!kGeen.besluit.herstel || kGeen.besluit.herstel.score == null, 'N2 keten geen data: geen herstelscore in het readinessbesluit');
  ok((kGeen.besluit.beschikbaar || []).indexOf('spierherstel') < 0, 'N2 keten geen data: spierherstel telt niet als aanwezig signaal');
  ok(!/"score":100/.test(JSON.stringify(kGeen.besluit)), 'N2 keten geen data: nergens een score 100 in de payload');
  const kDeels = await keten([{ date: VANDAAG, sleep: 8 }], DEELS);
  ok((kDeels.besluit.beschikbaar || []).indexOf('spierherstel') >= 0, 'N2 keten deels: spierherstel is aanwezig (er is één spier met historie)');
  eq(kDeels.adj.score, CalcCore.recoveryScore({ dayFactor: 1, muscleRecoveryPct: 60 }).score, 'N2 keten deels: de score rust op de ene gemeten spier');
  const kAlle = await keten([{ date: VANDAAG, sleep: 8 }], ALLE);
  eq(kAlle.adj.score, CalcCore.recoveryScore({ dayFactor: 1, muscleRecoveryPct: 80 }).score, 'N2 keten alle met historie: bestaande score');

  // ══ V — HET TRAININGSVOORSCHRIFT VERANDERT NIET ══
  // De nooit-getrainde rijen hebben pct 100 en kunnen dus nooit een verlaging veroorzaken.
  // Bewijs: voor elke combinatie geeft de Decision Engine met en zonder die rijen dezelfde uitkomst.
  let gelijk = 0, totaal = 0;
  [0.85, 0.87, 0.90, 0.93, 0.95, 0.99, 1.00, 1.05].forEach(function (f) {
    [NOOIT, DEELS, ALLE, [{ muscle: 'borst', pct: 30, hours: 5 }, { muscle: 'rug', pct: 100, hours: null }]].forEach(function (rows) {
      [null, 'slecht', 'matig', 'goed', 'top'].forEach(function (voelt) {
        [null, 'borst'].forEach(function (pijn) {
          totaal++;
          const a = DecisionCore.computeProgAdjustment(f, rows, voelt, pijn);
          const b = DecisionCore.computeProgAdjustment(f, BASIS.tkSpierherstelEvidence(rows), voelt, pijn);
          if (JSON.stringify(a) === JSON.stringify(b)) gelijk++;
        });
      });
    });
  });
  eq(gelijk, totaal, 'V: computeProgAdjustment geeft met en zonder nooit-getrainde rijen dezelfde uitkomst (' + totaal + ' combinaties)');
  ok(/computeProgAdjustment\(dfInfo\.factor, recRows, voelt, painMuscle\)/.test(extractFn(HTML, 'recoveryAdjustmentForToday')), 'V: het voorschrift krijgt de rijen ongefilterd, zoals voorheen');
  eq(extractFn(HTML, 'computeProgAdjustment'), 'function computeProgAdjustment(factor,muscleRecoveryRows,voelt,painMuscle){ return DecisionCore.computeProgAdjustment(factor,muscleRecoveryRows,voelt,painMuscle); }', 'V: computeProgAdjustment() is de ongewijzigde doorgeefwrapper');
  ok(!/sessionRxAdj|setsDelta|rpeDelta|applySessionRecovery/.test(INTRO + extractFn(HTML, 'tkAiHealthStatus') + extractFn(HTML, 'tkSpierherstelEvidence') + REEKS), 'V: de gewijzigde functies raken geen voorschriftstate');
  const kLaag = await keten([{ date: VANDAAG, sleep: 8 }], [{ muscle: 'borst', pct: 30, hours: 5 }, { muscle: 'triceps', pct: 100, hours: null }]);
  const verwachtLaag = DecisionCore.computeProgAdjustment(1, [{ muscle: 'borst', pct: 30, hours: 5 }, { muscle: 'triceps', pct: 100, hours: null }], null, null) || { rpeDelta: 0, setsDelta: 0 };
  eq([kLaag.adj.setsDelta, kLaag.adj.rpeDelta], [verwachtLaag.setsDelta || 0, verwachtLaag.rpeDelta || 0], 'V: een echt lage spier geeft exact de bestaande aanpassing');

  // ══ N3 — AI-CONTEXT ══
  function status(hd, avg7) { const hq = BASIS.tkHealthQualified(hd); return BASIS.tkAiHealthStatus(hq, hq.rows[0], avg7 == null ? null : avg7); }
  eq(status([]), 'Geen recente HRV', 'N3 geen data: blijft geen data');
  const sVandaag = status([{ date: VANDAAG, hrv: 48, rhr: 55, sleep: 7 }], 49);
  eq(sVandaag, 'HRV 48 ms | RHR 55 bpm | Slaap ' + BASIS.fmtSleep(7) + ' | 7d gem: 49 ms', 'N3 actueel: dezelfde regel als voorheen');
  const sNotitie = status([{ date: VANDAAG, hrv: 48, rhr: 55, sleep: 7, edema: 'licht', note: 'goed geslapen' }]);
  eq(sNotitie, 'HRV 48 ms | RHR 55 bpm | Slaap ' + BASIS.fmtSleep(7) + ' | oedeem: licht | goed geslapen', 'N3 actueel met notitie: dezelfde regel als voorheen');
  const sStale = status([{ date: dag(10), hrv: 48, rhr: 55, sleep: 7 }], 49);
  const regels = sStale.split('\n');
  eq(regels.length, 2, 'N3 stale: actuele regel en een aparte regel voor oudere metingen');
  eq(regels[0], 'HRV geen actuele meting | RHR geen actuele meting | Slaap geen actuele meting', 'N3 stale: geen waarde onder de actuele status');
  ok(!/\d/.test(regels[0]), 'N3 stale: geen enkel getal op de actuele regel (ook geen 7-daags gemiddelde)');
  ok(/^Oudere metingen \(NIET actueel/.test(regels[1]), 'N3 stale: de tweede regel benoemt de metingen als niet actueel');
  ok(regels[1].indexOf('HRV 48 ms (10 dagen geleden, gemeten ' + dag(10) + ')') >= 0, 'N3 stale: HRV met leeftijd en meetdatum');
  ok(regels[1].indexOf('RHR 55 bpm (10 dagen geleden, gemeten ' + dag(10) + ')') >= 0, 'N3 stale: RHR met leeftijd en meetdatum');
  ok(regels[1].indexOf('Slaap ' + BASIS.fmtSleep(7) + ' (10 dagen geleden, gemeten ' + dag(10) + ')') >= 0, 'N3 stale: slaap met leeftijd en meetdatum');
  const sGemengd = status([{ date: VANDAAG, sleep: 7 }, { date: dag(3), hrv: 48, rhr: 55 }]);
  eq(sGemengd, 'HRV 48 ms (3 dagen geleden) | RHR 55 bpm (3 dagen geleden) | Slaap ' + BASIS.fmtSleep(7), 'N3 gemengd: elke waarde met haar eigen meetmoment');
  eq(status([{ date: dag(1), hrv: 48, rhr: 55, sleep: 7 }]), 'HRV 48 ms (gisteren) | RHR 55 bpm (gisteren) | Slaap ' + BASIS.fmtSleep(7) + ' (gisteren)', 'N3 gisteren: actueel, met meetmoment');
  eq(status([{ date: VANDAAG, note: 'druk' }]), 'HRV ? ms | RHR ? bpm | Slaap ? | druk', 'N3 check-in zonder metingen: onbekend blijft onbekend');
  const sOudNieuw = status([{ date: VANDAAG, sleep: 7 }, { date: dag(12), hrv: 48 }]);
  ok(/^HRV geen actuele meting \| RHR \? bpm \| Slaap /.test(sOudNieuw) && /\nOudere metingen[^\n]*HRV 48 ms \(12 dagen geleden/.test(sOudNieuw), 'N3 slaap vandaag, HRV 12 dagen oud: alleen de HRV staat bij de oudere metingen');
  eq(status([{ date: dag(10), note: 'oud', sleep: 7 }]).split('\n')[0], 'HRV ? ms | RHR ? bpm | Slaap geen actuele meting | oud (check-in 10 dagen geleden)', 'N3 oude notitie: met het moment van de check-in');
  // De drempel voor "niet actueel" komt uit de bestaande keten, niet uit deze helper.
  ok(!/\b[0-9]+\b/.test(extractFn(HTML, 'tkAiHealthStatus').replace(/avg7/g, '')), 'N3: geen getal (drempel) in tkAiHealthStatus');
  const lijst = DecisionCore.READINESS_ONBETROUWBARE_KWALITEIT;
  [1, 3, 6, 7, 10, 30].forEach(function (n) {
    const hq = BASIS.tkHealthQualified([{ date: dag(n), hrv: 48 }]);
    const nietActueel = lijst.indexOf(hq.signalen.hrv.kwaliteit) >= 0;
    eq(/^HRV geen actuele meting/.test(status([{ date: dag(n), hrv: 48 }])), nietActueel, 'N3 ' + n + ' dagen oud: de statusregel volgt de bestaande kwaliteitsstatus (' + hq.signalen.hrv.kwaliteit + ')');
  });

  // ══ N4 — INZICHT == HOME == DECISIONCORE ══
  const FACTOREN = [0.85, 0.87, 0.90, 0.92, 0.9299, 0.93, 0.95, 0.99, 0.9999, 1.00, 1.02, 1.05];
  for (const f of FACTOREN) {
    const sb = runtime({ hd: [{ date: VANDAAG, sleep: 8 }] });
    sb.dagfactor = function () { return { factor: f, hrvFactor: 1, slaapFactor: 1, cyclusFactor: 1, hrvSt: 'ref', hrvBaseline: null, basis: { hrv: false, slaap: true, cyclus: false } }; };
    const hero = await sb.__lichHero();
    const inzicht = (/<div class="rd">([^<]*)<\/div>/.exec(hero) || [null, null])[1];
    sb.renderTodayCta({ id: 'x', naam: 'Push', _exCount: 3, _muscles: ['borst'] }, sb.dagfactor());
    const home = (/<span class="today-dot"><\/span>([^<]*)<\/div>/.exec(sb.__els['home-today-cta'].innerHTML) || [null, null])[1];
    const kern = DecisionCore.trainReadiness({ factor: f }).txt;
    eq(inzicht, kern, 'N4 factor ' + f + ': Inzicht == DecisionCore');
    eq(home, kern, 'N4 factor ' + f + ': Home == DecisionCore');
  }
  eq(DecisionCore.trainReadiness({ factor: 0.93 }).txt, 'Train op gevoel', 'N4: 0.93 is "Train op gevoel" (was op Inzicht "Houd het licht vandaag")');
  eq(DecisionCore.trainReadiness({ factor: 0.99 }).txt, 'Train op gevoel', 'N4: 0.99 is "Train op gevoel" (was op Inzicht "Klaar om te trainen")');
  eq([0.85, 1.00, 1.05].map(function (f) { return DecisionCore.trainReadiness({ factor: f }).txt; }), ['Houd het licht vandaag', 'Klaar om te trainen', 'Klaar om te trainen'], 'N4: de bestaande Decision-uitkomsten');
  // Zonder basis blijft Inzicht zonder oordeel (#524/#525).
  const sbGeen = runtime({ hd: [{ date: VANDAAG, note: 'x' }] });
  ok((await sbGeen.__lichHero()).indexOf('<div class="rd">Nog te weinig gegevens voor advies</div>') >= 0, 'N4 zonder basis: geen oordeel, ongewijzigd');

  // ══ N5 — DAGFACTORREEKS ══
  const rKaal = BASIS.tkDagfactorReeksen([{ date: dag(2), hrv: 48 }, { date: dag(1), hrv: 50 }, { date: VANDAAG, hrv: 49 }], 30);
  eq(rKaal, { dagfactor: [], readiness: [] }, 'N5 alleen HRV in de referentiefase: geen meetpunten (was 1 / 75 per dag)');
  const gemengd = [{ date: dag(3), hrv: 48 }, { date: dag(2), hrv: 48, sleep: 8 }, { date: dag(1), sleep: 5 }, { date: VANDAAG, hrv: 47 }];
  const rGemengd = BASIS.tkDagfactorReeksen(gemengd, 30);
  eq(rGemengd.dagfactor.map(function (p) { return p.date; }), [dag(2), dag(1)], 'N5 gemengd: alleen de dagen met basis');
  eq(rGemengd.readiness.map(function (p) { return p.date; }), [dag(2), dag(1)], 'N5 gemengd: gereedheid volgt dezelfde dagen');
  gemengd.forEach(function (rij) {
    const df = BASIS.dagfactor(BASIS.hrvDagFactorPersonal(gemengd, rij.date), rij.sleep, rij.cyclus_fase);
    const punt = rGemengd.dagfactor.find(function (p) { return p.date === rij.date; });
    if (BASIS.tkDagfactorVoorAdvies(df)) {
      eq(punt && punt.value, df.factor, 'N5 ' + rij.date + ': dag met basis heeft exact de berekende dagfactor');
      eq((rGemengd.readiness.find(function (p) { return p.date === rij.date; }) || {}).value, CalcCore.readinessPercent(df.factor), 'N5 ' + rij.date + ': gereedheid exact uit CalcCore');
    } else ok(!punt, 'N5 ' + rij.date + ': dag zonder basis ontbreekt');
  });
  // Volledige reeks met baseline: elke dag blijft, met dezelfde waarde als de berekening.
  const vol = hrvReeks(50);
  const rVol = BASIS.tkDagfactorReeksen(vol, 365);
  eq(rVol.dagfactor.length, vol.length, 'N5 geldige reeks: geen punt verdwenen');
  ok(rVol.dagfactor.every(function (p) { const rij = vol.find(function (r) { return r.date === p.date; }); return p.value === BASIS.dagfactor(BASIS.hrvDagFactorPersonal(vol, p.date), rij.sleep, rij.cyclus_fase).factor; }), 'N5 geldige reeks: elk punt is de bestaande berekende waarde');
  ok(rKaal.dagfactor.length === 0 && !/interpol/i.test(REEKS), 'N5: geen interpolatie');

  // ══ GEEN WIJZIGING IN DE CORES ══
  eq(DecisionCore.READINESS_ONBETROUWBARE_KWALITEIT, ['no_data', 'stale'], 'kern: de lijst met niet-actuele kwaliteiten is ongewijzigd');
  eq([0.85, 0.93, 1.00, 1.05].map(CalcCore.readinessPercent), [0, 40, 75, 100], 'kern: readinessPercent ongewijzigd');

  msgs.forEach(function (m) { console.log(m); });
  console.log('fReadinessReliabilityContextLeaks: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.log('fReadinessReliabilityContextLeaks: onverwachte fout ' + (e && e.stack || e)); process.exit(1); });
