/* fStaleHealthPresentation.test.js — de presentatie van health-data volgt de berekening.
 *
 * Sinds #515/#516 telt een verouderde (7+ dagen) HRV-, rusthartslag- of slaapmeting niet meer als
 * signaal voor vandaag. De presentatie liep daar op drie plekken achter:
 *   A. Home-dagfactorkaart: de uitleg en "Waarom vandaag?" lazen de rauwe nieuwste rij en noemden
 *      een verouderde meting nog als reden ("HRV: referentiefase", "slaap voldoende", 2/3 signalen).
 *   B. Lichaam-hero: de tegels toonden de nieuwste waarde zonder meetmoment.
 *   C. Hersteldetail: de HRV-statusregel stond er ook bij een verouderde meting als "Status".
 *
 * Oplossing: één presentatiecontext, tkHealthVandaag(hq, hrvComponent, df).
 *   - Kwaliteit/versheid zegt of een meting BRUIKBAAR is.
 *   - df.basis (uitkomst van dagfactor()) bewijst of een onderdeel de dagfactor WERKELIJK voedde;
 *     dat bepaalt uitleg, signaaltelling en confidence.
 *   - HRV is reeks-gebaseerd: de basis is hrvComponent.recent, niet per se de nieuwste rij.
 *   - Elk signaal houdt zijn eigen meetdatum; er is geen gezamenlijke rijdatum.
 * Geen nieuwe drempel, geen berekening in de UI.
 *
 * De suite voert de ECHTE code uit: de functies en de betreffende blokken van refreshHome() en
 * renderLichaamPremium() worden uit index.html gehaald en met de echte cores gedraaid.
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
const NAMEN = ['td', 'tkSleepHours', 'tkFmtSleepHours', 'fmtSleep', 'v43SlaapTxt', 'v43RecColor', 'lnRmssd', 'hrvBaseline', 'hrvRollingRecent',
  'hrvStPersonal', 'hrvDagFactorPersonal', 'slaapDagFactor', 'cyclusDagFactor', 'tkCyclusFaseVandaag', 'tkHealthFailClosed', 'tkHealthQualified',
  'tkHealthVandaag', 'tkNietMeegeteldTxt', 'tkMetingNa', 'tkNietMeeHtml', 'tkStatusLabel', 'tkSignaalOnbetrouwbaar', 'tkRhrDeltaHerstel', 'dagfactor', 'tkDagfactorHeeftBasis', 'tkDagfactorVoorAdvies', 'tkCheckinVandaag', 'trainReadiness', 'tkSpierherstelEvidence',
  'recoveryScoreFrom', 'rhrBaselineDelta', 'todayPainMuscle', 'recoveryAdjustmentForToday', 'computeProgAdjustment', 'v43GereedheidScore',
  'tkReadinessVandaag', 'fmtDate', 'capitalize', 'tkMetingHerkomst', 'tkMetingWanneer', 'tkMetingLabel', 'openRecoveryDetail',
  'dagfactorStatus', 'dayState', 'dagfactorCoach', 'dagfactorUitleg', 'renderDagfactorDetail'];
const REFRESH = extractFn(HTML, 'refreshHome');
const LICH = extractFn(HTML, 'renderLichaamPremium');
// De echte Home-kaart: het blok van refreshHome dat de dagfactorkaart opbouwt.
const HOME_BLOK = tussen(REFRESH, 'const hrvComponent=hrvDagFactorPersonal(hd);', '  }else{\n    document.getElementById(\'home-hrv-card\')');
// De echte Lichaam-hero: van het ophalen van de rijen tot en met de hero-HTML.
const LICH_BLOK = tussen(LICH, 'let hd=[]; let lh=null; let hq=null;', '// Body/Health foundation + apparaatstatus');
const PROD = NAMEN.map(function (n) { return extractFn(HTML, n); }).join('\n') +
  '\nconst HRV_BASELINE_MIN_DAYS = CalcCore.HRV_BASELINE_MIN_DAYS;' +
  '\n' + (/const TK_GEEN_ADVIES_TXT='[^']*';/.exec(HTML) || [''])[0] + (/const TK_GEEN_ADVIES_SUB='[^']*';/.exec(HTML) || [''])[0] +
  '\nfunction __homeKaart(hdRuw){ const hq=tkHealthQualified(hdRuw); const hd=hq.rows; const lh=hd[0]; let dfInfo=null; if(!lh) return null;\n' + HOME_BLOK +
  '\n return {dfInfo:dfInfo, detail:window.homeDfDetail, kaart:document.getElementById(\'home-hrv-card\').innerHTML}; }' +
  '\nasync function __lichHero(){ const rec=window.v43LichRec||{overall:100,rows:[],hasData:false}; const rows=rec.rows||[];\n' + LICH_BLOK + '\n return document.getElementById(\'lich-hero\').innerHTML; }';

function runtime(state) {
  const els = {};
  const sb = {
    console: console, window: {}, CalcCore: CalcCore, CoachingCore: CoachingCore, DecisionCore: DecisionCore, DeviceCore: DeviceCore,
    v43SafeGet: async function (t) { return t === 'hrv_log' ? state.hd : []; },
    sbGet: async function (t) { return t === 'hrv_log' ? state.hd : []; },
    getRelevantMuscleRecovery: async function () { return state.recRows || []; },
    document: { getElementById: function (id) { return els[id] || (els[id] = { innerHTML: '', style: {} }); } },
    openModal: function () {}, progCheckinCtx: null,
    escHtml: function (x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  };
  vm.createContext(sb); vm.runInContext(PROD, sb);
  sb.__els = els;
  return sb;
}
function home(hd) {
  const sb = runtime({ hd: hd });
  const r = sb.__homeKaart(hd);
  sb.renderDagfactorDetail();
  const tech = (r.kaart.match(/<div class="df-tech">([^<]*)<\/div>/) || [null, null])[1];
  return { sb: sb, dfInfo: r.dfInfo, detail: r.detail, kaart: r.kaart, tech: tech, waarom: sb.__els['dagfactor-detail'].innerHTML, ring: (r.kaart.match(/<div class="df-ring-val">([^<]*)<\/div>/) || [])[1] };
}
async function keten(hd, recRows) {
  const sb = runtime({ hd: hd, recRows: recRows });
  const hq = sb.tkHealthQualified(hd); const lh = hq.rows[0];
  const df = lh ? sb.dagfactor(sb.hrvDagFactorPersonal(hq.rows), lh.sleep, sb.tkCyclusFaseVandaag(lh), hq.signalen) : null;
  await sb.tkReadinessVandaag(df, recRows || [], null);
  const b = sb.window._tkReadiness; const adj = await sb.recoveryAdjustmentForToday(['borst'], {});
  return [df && df.factor, df && df.hrvFactor, df && df.slaapFactor, df && df.cyclusFactor, df && df.basis, b.herstel && [b.herstel.score, b.herstel.band, b.herstel.betrouwbaarheid],
    b.zone, b.datakwaliteit, b.beschikbaar, b.trainingsadvies, [adj.score, adj.band, adj.confidence, adj.factor, adj.setsDelta, adj.rpeDelta]];
}
// De berekening en de presentatiecontext naast elkaar, met de echte functies.
function ctx(hd) {
  const sb = runtime({ hd: hd });
  const hq = sb.tkHealthQualified(hd); const lh = hq.rows[0] || null;
  const hc = sb.hrvDagFactorPersonal(hq.rows);
  const df = lh ? sb.dagfactor(hc, lh.sleep, sb.tkCyclusFaseVandaag(lh), hq.signalen) : null;
  return { sb: sb, hq: hq, hc: hc, df: df, hv: sb.tkHealthVandaag(hq, hc, df) };
}
function rij(waarom, label) { return (new RegExp(label + '</span><span class="dfd-val">([^<]*)<').exec(waarom) || [null, null])[1]; }
async function lichHero(hd) { const sb = runtime({ hd: hd }); return await sb.__lichHero(); }
async function detail(hd) { const sb = runtime({ hd: hd }); await sb.openRecoveryDetail(); return sb.__els['recdetail-body'].innerHTML; }
function tegel(html, naam) { const m = new RegExp('<div class="m"><div class="v">([^<]*)</div><div class="k">' + naam + '</div>(?:<div class="lich-src">([^<]*)</div>)?(?:<div class="w">([^<]*)</div>)?</div>').exec(html); return m ? [m[1], m[2] || null, m[3] || null] : null; }

function dag(n) { const d = new Date(); d.setDate(d.getDate() - n); const p = function (x) { return ('0' + x).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function reeks(n, start) {
  const uit = [];
  for (let i = (start || 0); i < n + (start || 0); i++) {
    uit.push({ date: dag(i), hrv: 50 + ((i * 7) % 9) - 4, hrv_source: 'wearable', rhr: 55 + ((i * 3) % 5) - 2, rhr_source: 'wearable',
      sleep: 7.5 - ((i % 4) * 0.25), sleep_source: 'wearable', cyclus_fase: null, note: null });
  }
  return uit;
}
const kloon = function (x) { return JSON.parse(JSON.stringify(x)); };
const REC = [{ pct: 80 }, { pct: 70 }];
const VANDAAG = dag(0);
// scenario's
const ACTUEEL = reeks(30);
const HRV_OUD = (function () { const r = reeks(25, 10).map(function (x) { return Object.assign(x, { sleep: null, rhr: null }); }); r.unshift({ date: VANDAAG, hrv: null, rhr: null, sleep: 6.5, sleep_source: 'manual', cyclus_fase: null }); return r; })();
const SLAAP_OUD = (function () { const r = reeks(30).map(function (x, i) { return Object.assign(x, { sleep: i >= 10 ? x.sleep : null }); }); return r; })();
const ALLES_OUD = reeks(25, 10);
// rij van vandaag met alleen slaap; de HRV-reeks loopt tot 3 dagen geleden
const GEMENGD = (function () { const r = reeks(30, 3).map(function (x) { return Object.assign(x, { sleep: null, rhr: null }); }); r.unshift({ date: VANDAAG, hrv: null, rhr: null, sleep: 6.5, sleep_source: 'manual', cyclus_fase: null }); return r; })();
// HRV en slaap van vandaag, maar pas 5 dagen HRV-historie
const KORT = reeks(5);

async function main() {
  /* ══ A. Presentatiecontext: zelfde bron als de berekening ═════════════════ */
  {
    const a = ctx(kloon(ACTUEEL));
    eq([a.hv.hrv.waarde, a.hv.hrv.datum, a.hv.hrv.wanneer, a.hv.hrv.isVandaag, a.hv.hrv.oud, a.hv.hrv.gebruikt, a.hv.hrv.referentie], [ACTUEEL[0].hrv, VANDAAG, 'vandaag', true, false, true, false], 'A1 actuele HRV: de meting van vandaag, gebruikt door de dagfactor');
    eq([a.hv.slaap.waarde, a.hv.slaap.gebruikt, a.hv.slaap.isVandaag, a.hv.rhr.waarde, a.hv.rhr.gebruikt, a.hv.cyclus.gebruikt], [ACTUEEL[0].sleep, true, true, ACTUEEL[0].rhr, true, false], 'A1b actuele slaap en rusthartslag; geen cyclusfase');
    const o = ctx(kloon(ALLES_OUD));
    eq([o.hv.hrv.waarde, o.hv.hrv.wanneer, o.hv.hrv.oud, o.hv.hrv.gebruikt, o.hv.hrv.basis, o.hv.hrv.referentie], [ALLES_OUD[0].hrv, '10 dagen geleden', true, false, null, false], 'A2 verouderde HRV: de laatste meting met haar meetmoment, niet gebruikt, geen basis');
    eq([o.hv.slaap.waarde, o.hv.slaap.wanneer, o.hv.slaap.gebruikt, o.hv.rhr.oud, o.hv.rhr.gebruikt], [ALLES_OUD[0].sleep, '10 dagen geleden', false, true, false], 'A2b verouderde slaap en rusthartslag: zichtbaar als laatste meting, niet gebruikt');
    const leeg = ctx([{ date: VANDAAG, hrv: null, rhr: null, sleep: null }]);
    eq([leeg.hv.hrv.waarde, leeg.hv.hrv.datum, leeg.hv.hrv.wanneer, leeg.hv.hrv.gebruikt, leeg.hv.hrv.referentie, leeg.hv.slaap.waarde], [null, null, '', false, false, null], 'A3 geen meting: niets voor vandaag en geen verzonnen laatste meting (geen 0)');
    const niets = a.sb.tkHealthVandaag(null);
    eq([niets.hrv.waarde, niets.hrv.gebruikt, niets.slaap.gebruikt, niets.cyclus.gebruikt, a.sb.tkHealthVandaag({ rows: [], signalen: {} }).slaap.waarde], [null, false, false, false, null], 'A4 lege invoer is veilig; zonder df is niets "gebruikt"');
    const bron = extractFn(HTML, 'tkHealthVandaag');
    ok(/basis\.hrv/.test(bron) && /basis\.slaap/.test(bron) && /basis\.cyclus/.test(bron) && /hrvComponent\.recent/.test(bron), 'A5 "gebruikt" komt uit df.basis en de HRV-basis uit hrvComponent.recent');
    ok(/tkSignaalOnbetrouwbaar\(/.test(bron) && /tkMetingWanneer\(/.test(bron) && !/stale|no_data|\b7\b|Date\(|reduce\(|Math\./.test(bron), 'A5b geen eigen status, drempel, datumlogica of gemiddelde in de context');
    ok(a.sb.tkNietMeegeteldTxt('HRV', { wanneer: '10 dagen geleden' }) === 'HRV van 10 dagen geleden telt vandaag niet mee' && a.sb.tkNietMeegeteldTxt('slaap', { wanneer: '' }) === 'laatste slaap-meting telt vandaag niet mee', 'A6 mensentaal, ook zonder meetmoment');
    eq([a.sb.tkMetingNa({ wanneer: 'vandaag', isVandaag: true }), a.sb.tkMetingNa({ wanneer: '3 dagen geleden', isVandaag: false }), a.sb.tkMetingNa({ wanneer: '3 dagen geleden', isVandaag: false }, 'laatste meting '), a.sb.tkMetingNa({ wanneer: '' }), a.sb.tkMetingNa(null)], ['', ' (3 dagen geleden)', ' (laatste meting 3 dagen geleden)', '', ''], 'A7 een meetmoment-achtervoegsel alleen bij een meting die niet van vandaag is');
  }

  /* ══ B. Home-dagfactorkaart ═══════════════════════════════════════════════ */
  {
    // 1. actuele HRV + actuele slaap: zoals vóór de sprint
    const h = home(kloon(ACTUEEL));
    eq(h.tech, 'HRV goed t.o.v. je eigen baseline, slaap voldoende · ' + VANDAAG, 'B1 actuele HRV en slaap: de uitlegregel is woordelijk gelijk aan vóór de sprint');
    eq([h.detail.hrv, h.detail.rhr, h.detail.sleep, h.detail.conf, h.detail.sig, h.detail.st, h.detail.date], [ACTUEEL[0].hrv, ACTUEEL[0].rhr, ACTUEEL[0].sleep, 'Hoog', 2, 'g', VANDAAG], 'B2 actuele waarden zichtbaar; 2/3 signalen, confidence Hoog');
    ok(rij(h.waarom, 'Herstelsignalen') === 'HRV 46 ms · RHR 53 · slaap 7u 30m' && rij(h.waarom, 'Telt vandaag niet mee') === null && /Confidence: Hoog \(2\/3 signalen\)/.test(h.waarom) && /HRV-beoordeling t\.o\.v\. je volledige eigen baseline/.test(h.waarom), 'B3 "Waarom vandaag?" bij actuele data: zelfde signalen, telling en beoordeling');
    eq([h.ring, h.dfInfo.factor, h.dfInfo.st], ['1.05', 1.05, 'g'], 'B4 dagfactor op de kaart ongewijzigd (1.05)');
    eq(runtime({ hd: [] }).dagfactorUitleg(46, 7.5, 'luteaal', { hrvSt: 'g', hrvBaseline: { fase: 'volledig' }, slaapFactor: 1 }), 'HRV goed t.o.v. je eigen baseline, slaap voldoende, cyclus: luteaal', 'B5 dagfactorUitleg met vier argumenten geeft dezelfde tekst als voorheen');
  }
  {
    // 2. HRV 10 dagen oud, slaap vandaag
    const h = home(kloon(HRV_OUD));
    eq(h.tech, 'slaap kort, HRV van 10 dagen geleden telt vandaag niet mee · ' + VANDAAG, 'B6 HRV 10 dagen oud + slaap vandaag: slaap is de reden, HRV staat erbij als niet meegeteld');
    ok(!/referentiefase|HRV goed|HRV verlaagd/.test(h.tech), 'B7 de verouderde HRV wordt niet als actuele dagfactorreden genoemd');
    eq([h.detail.hrv, h.detail.sleep, h.detail.sig, h.detail.conf, h.detail.st, h.detail.ctx.hrv.oud, h.detail.ctx.hrv.wanneer], [null, 6.5, 1, 'Middel', 'ref', true, '10 dagen geleden'], 'B8 detail: alleen slaap telt (1/3, Middel); HRV alleen als laatste meting');
    ok(rij(h.waarom, 'Herstelsignalen') === 'slaap 6u 30m' && /^HRV \d+ ms \(10 dagen geleden\)$/.test(rij(h.waarom, 'Telt vandaag niet mee')) && !/HRV-beoordeling/.test(h.waarom), 'B9 "Waarom vandaag?": slaap bij de signalen, HRV apart onder "Telt vandaag niet mee", geen HRV-beoordeling');
  }
  {
    // 3. slaap 10 dagen oud, HRV vandaag
    const h = home(kloon(SLAAP_OUD));
    eq(h.tech, 'HRV goed t.o.v. je eigen baseline, slaap van 10 dagen geleden telt vandaag niet mee · ' + VANDAAG, 'B10 slaap 10 dagen oud + HRV vandaag: HRV is de reden, slaap staat erbij als niet meegeteld');
    ok(!/slaap voldoende|slaap kort|slaap te kort/.test(h.tech), 'B11 de verouderde slaap wordt niet als actuele dagfactorreden genoemd');
    eq([h.detail.hrv, h.detail.sleep, h.detail.sig, h.detail.conf, h.detail.ctx.slaap.waarde, h.detail.ctx.slaap.wanneer], [SLAAP_OUD[0].hrv, null, 1, 'Middel', SLAAP_OUD[10].sleep, '10 dagen geleden'], 'B12 detail: alleen HRV telt; slaap alleen als laatste meting');
  }
  {
    // 4. HRV en slaap beide verouderd
    const h = home(kloon(ALLES_OUD));
    eq(h.tech, 'HRV van 10 dagen geleden telt vandaag niet mee, slaap van 10 dagen geleden telt vandaag niet mee', 'B13 beide verouderd: de uitleg noemt geen van beide als reden en toont geen datum');
    ok(!/referentiefase|slaap voldoende|HRV goed/.test(h.tech + h.waarom), 'B14 nergens "referentiefase" of "slaap voldoende" voor verouderde data');
    eq([h.ring, h.detail.hrv, h.detail.rhr, h.detail.sleep, h.detail.sig, h.detail.conf, h.detail.st, h.detail.date], ['—', null, null, null, 0, 'Laag', 'ref', ''], 'B15 zonder basis toont de kaart geen dagfactor (—); 0/3 signalen, confidence Laag, geen gezamenlijke datum');
    eq([h.dfInfo.factor, h.dfInfo.basis, h.detail.heeftBasis, h.detail.factor, h.sb.tkDagfactorVoorAdvies(h.dfInfo)], [1, { hrv: false, slaap: false, cyclus: false }, false, 1, null], 'B15b de rekenwaarde blijft 1 en gaat MET haar basis door de contextlaag; voor advies is zij niet bruikbaar');
    ok(/<div class="df-headline geen">Doe je check-in voor advies<\/div>/.test(h.kaart) && !/Goede dag|uitstekende dag/.test(h.kaart + h.waarom), 'B15c geen positieve dagkop uit de neutrale invulling');
    eq(rij(h.waarom, 'Dagfactor'), '— · nog te weinig gegevens', 'B15d "Waarom vandaag?": de regel Dagfactor toont geen getal');
    ok(rij(h.waarom, 'Herstelsignalen') === '—' && /^HRV \d+ ms \(10 dagen geleden\) · RHR \d+ \(10 dagen geleden\) · slaap [^(]* \(10 dagen geleden\)$/.test(rij(h.waarom, 'Telt vandaag niet mee')), 'B16 "Waarom vandaag?": geen herstelsignalen; de drie laatste metingen staan apart met hun meetmoment');
    ok(/Confidence: Laag \(0\/3 signalen\)/.test(h.waarom) && /Geen dagfactor voor vandaag: geen van de signalen voedt hem\. De rekenwaarde 1 \(HRV 1\.00 × slaap 1\.00\) is een neutrale invulling, geen meting\./.test(h.waarom) && !/1 = HRV/.test(h.waarom), 'B17 de formuleregel blijft controleerbaar (de neutrale factoren staan er), maar presenteert de 1 als invulling en niet als uitkomst');
    const cyc = kloon(ALLES_OUD); cyc.unshift({ date: VANDAAG, hrv: null, rhr: null, sleep: null, cyclus_fase: 'luteaal' });
    const c = home(cyc);
    eq(c.tech, 'cyclus: luteaal, HRV van 10 dagen geleden telt vandaag niet mee, slaap van 10 dagen geleden telt vandaag niet mee · ' + VANDAAG, 'B18 een ander actueel onderdeel (cyclusfase van vandaag) wordt wel als reden uitgelegd');
    eq([c.detail.sig, c.detail.conf, c.detail.cyclus], [1, 'Laag', 'luteaal'], 'B18b en telt als het ene gebruikte onderdeel');
    const geen = home([{ date: VANDAAG, hrv: null, rhr: null, sleep: null, note: 'x' }]);
    eq([geen.tech, geen.detail.hrv, geen.detail.sig, rij(geen.waarom, 'Telt vandaag niet mee')], ['onvoldoende data', null, 0, null], 'B19 geen enkele meting: bestaande lege weergave, geen 0 en geen verzonnen meting');
  }
  ok(!/dagfactorUitleg\(lh\.hrv|hrv:lh\.hrv|sleep:lh\.sleep|\[lh\.hrv,lh\.sleep|\$\{lh\.date\}|date:lh\.date/.test(REFRESH) && /tkHealthVandaag\(hq,hrvComponent,df\)/.test(REFRESH), 'B20 refreshHome gebruikt de rauwe rij en haar datum niet meer als toelichtingsbron');

  /* ══ F. Presentatie volgt de WERKELIJKE basis van de berekening ═══════════ */
  {
    // A. rij van vandaag met slaap; HRV alleen tot 3 dagen geleden
    const g = ctx(kloon(GEMENGD));
    eq([g.hq.signalen.hrv.kwaliteit, g.hq.signalen.hrv.datum, g.hc.st, g.hc.factor, g.hc.recent.bron, g.hc.recent.n, g.df.factor, g.df.basis], ['current', dag(3), 'g', 1.05, '7d-gemiddelde', 5, 1.02, { hrv: true, slaap: true, cyclus: false }],
      'F1 uitgangspunt: de berekening GEBRUIKT de HRV van 3 dagen geleden (7-daags gemiddelde van 5 metingen: dag 3 t/m 7, grens inclusief; st g, basis.hrv true; dagfactor 1.02)');
    eq([g.hv.hrv.gebruikt, g.hv.hrv.waarde, g.hv.hrv.datum, g.hv.hrv.isVandaag, g.hv.hrv.wanneer, g.hv.slaap.gebruikt, g.hv.slaap.datum, g.hv.slaap.isVandaag], [true, GEMENGD[1].hrv, dag(3), false, '3 dagen geleden', true, VANDAAG, true], 'F2 de context volgt dat: HRV gebruikt met datum 3 dagen geleden, slaap gebruikt met datum vandaag');
    const h = home(kloon(GEMENGD));
    eq(h.tech, 'HRV goed t.o.v. je eigen baseline (laatste meting 3 dagen geleden), slaap kort', 'F3 Home noemt HRV als reden, met het eigen meetmoment; geen gezamenlijke datum omdat HRV en slaap van verschillende dagen zijn');
    eq([h.detail.sig, h.detail.conf, h.detail.hrv, h.detail.sleep, h.detail.date, h.ring], [2, 'Hoog', GEMENGD[1].hrv, 6.5, '', '1.02'], 'F4 signaaltelling 2/3 en confidence Hoog, gelijk aan df.basis; geen rijdatum');
    eq(rij(h.waarom, 'Herstelsignalen'), 'HRV ' + GEMENGD[1].hrv + ' ms (3 dagen geleden) · slaap 6u 30m', 'F5 "Waarom vandaag?": de HRV-meting staat er met haar eigen datum, niet als vandaag');
    ok(/HRV-beoordeling t\.o\.v\. je volledige eigen baseline/.test(h.waarom) && /Vergeleken met je gemiddelde van 5 metingen in de laatste 7 dagen \(\d+ ms\)\./.test(h.waarom), 'F6 de HRV-basis van de berekening (7-daags gemiddelde) staat apart van de laatste meting');
    eq(Math.round(g.hv.hrv.basis.waarde), Number((h.waarom.match(/laatste 7 dagen \((\d+) ms\)/) || [])[1]), 'F7 het getoonde gemiddelde is hrvComponent.recent.meanRaw, alleen afgerond');
    eq([g.hv.hrv.basis.n, g.hv.hrv.basis.bron, g.hv.hrv.basis.waarde], [g.hc.recent.n, g.hc.recent.bron, g.hc.recent.meanRaw], 'F8 de context geeft hrvComponent.recent ongewijzigd door');
    const uiCode = extractFn(HTML, 'tkHealthVandaag') + extractFn(HTML, 'renderDagfactorDetail') + extractFn(HTML, 'dagfactorUitleg');
    ok(!/reduce\(|lnRmssd|hrvRollingRecent|hrvBaseline\(|meanLn/.test(uiCode), 'F9 de UI-code berekent zelf geen HRV-gemiddelde of baseline');
  }
  {
    // laatste-meting-basis: te weinig recente metingen -> hrvComponent.recent.bron 'laatste meting'
    const dun = reeks(30, 5).map(function (x) { return Object.assign(x, { sleep: null, rhr: null }); }); dun.unshift({ date: VANDAAG, hrv: null, rhr: null, sleep: 7.5, sleep_source: 'manual', cyclus_fase: null });
    const d = ctx(kloon(dun)); const h = home(kloon(dun));
    eq([d.hc.recent.bron, d.hc.recent.n, d.df.basis.hrv, d.hv.hrv.basis.bron], ['laatste meting', 1, true, 'laatste meting'], 'F10 uitgangspunt: met minder dan 4 metingen in 7 dagen gebruikt de berekening de laatste meting (5 dagen geleden)');
    ok(/\(laatste meting 5 dagen geleden\)/.test(h.tech) && /Vergeleken met je laatste meting \(\d+ ms\)\./.test(h.waarom) && rij(h.waarom, 'Herstelsignalen').indexOf('(5 dagen geleden)') > 0, 'F11 Home toont die basis als "laatste meting" met haar datum');
  }
  {
    // B. HRV vandaag, baseline nog niet klaar
    const k = ctx(kloon(KORT));
    eq([k.hc.st, k.hc.baseline.ready, k.hc.recent, k.df.hrvFactor, k.df.basis], ['ref', false, null, 1, { hrv: false, slaap: true, cyclus: false }], 'F12 uitgangspunt: st ref, baseline niet klaar, basis.hrv false — HRV voedt de dagfactor niet');
    eq([k.hv.hrv.gebruikt, k.hv.hrv.referentie, k.hv.hrv.basis, k.hv.hrv.waarde, k.hv.hrv.isVandaag], [false, true, null, KORT[0].hrv, true], 'F13 de context: HRV is er (vandaag) maar is niet gebruikt');
    const h = home(kloon(KORT));
    eq([h.detail.sig, h.detail.conf, h.detail.hrv, h.detail.sleep], [1, 'Middel', null, KORT[0].sleep], 'F14 HRV verhoogt de signaaltelling en confidence niet: 1/3, Middel (was 2/3, Hoog)');
    // KORT = metingen op vandaag en de vier dagen ervoor: de eerste meting is 4 kalenderdagen oud,
    // dus nog 14 - 4 = 10 dagen tot de baseline. Sinds de kalenderdag-fix (fHrvCalendarDay) is dat
    // op elk tijdstip van de dag hetzelfde getal.
    eq(h.tech, 'HRV: referentiefase (nog 10 dagen tot je eigen baseline) — telt nog niet mee, slaap voldoende · ' + VANDAAG, 'F15 de hoofdregel zegt expliciet dat HRV nog niet meetelt; slaap is de actuele reden');
    ok(/— telt nog niet mee/.test(h.tech) && /slaap voldoende/.test(h.tech) && !/HRV goed|HRV verlaagd/.test(h.tech), 'F15b geen HRV-oordeel in de hoofdregel');
    eq([k.hc.st, k.df.basis.hrv, h.detail.sig, h.detail.conf], ['ref', false, 1, 'Middel'], 'F15c zelfde toestand als de berekening: st ref, basis.hrv false, 1/3, Middel');
    // referentiefase zonder enige eerdere meting in de baseline-telling: zelfde toevoeging
    const eerste = home([{ date: VANDAAG, hrv: 46, hrv_source: 'manual', rhr: null, sleep: 7.5, sleep_source: 'manual', cyclus_fase: null }]);
    ok(/^HRV: referentiefase \((nog \d+ dagen tot je eigen baseline|baseline wordt opgebouwd)\) — telt nog niet mee, slaap voldoende · /.test(eerste.tech), 'F15d ook bij de allereerste HRV-meting');
    const sbU = runtime({ hd: [] });
    eq(sbU.dagfactorUitleg(46, 7.5, null, { hrvSt: 'ref', hrvBaseline: { n: 5, days: 5 }, slaapFactor: 1 }), 'HRV: referentiefase (nog 9 dagen tot je eigen baseline), slaap voldoende', 'F15e de aanroep zonder context (vier argumenten) geeft de bestaande tekst ongewijzigd');
    eq([rij(h.waarom, 'Herstelsignalen'), rij(h.waarom, 'Telt vandaag niet mee')], ['RHR 53 · slaap 7u 30m', 'HRV 46 ms (vandaag, persoonlijke baseline wordt nog opgebouwd)'], 'F16 "Waarom vandaag?": HRV staat niet bij de herstelsignalen maar apart, met de reden');
    ok(/Confidence: Middel \(1\/3 signalen\)/.test(h.waarom) && /HRV-beoordeling: referentiefase \(5 metingen, nog geen persoonlijke baseline/.test(h.waarom) && !/Vergeleken met/.test(h.waarom), 'F17 de bestaande referentiefase-toelichting blijft; er wordt geen vergelijkingsbasis genoemd');
  }
  {
    // C. voldoende baseline + HRV vandaag, en G. numeriek ongewijzigd
    const a = ctx(kloon(ACTUEEL)); const h = home(kloon(ACTUEEL));
    eq(h.tech, 'HRV goed t.o.v. je eigen baseline, slaap voldoende · ' + VANDAAG, 'F17b voldoende baseline + gebruikte HRV: de bestaande hoofdregel exact ongewijzigd, zonder "telt nog niet mee"');
    const laag = kloon(ACTUEEL); laag.slice(0, 7).forEach(function (x) { x.hrv = 30; });
    ok(/^HRV (sterk )?verlaagd t\.o\.v\. je eigen baseline, slaap voldoende · /.test(home(laag).tech) && !/telt nog niet mee/.test(home(laag).tech), 'F17c verlaagde HRV met voldoende baseline: bestaande "HRV verlaagd …"-tekst ongewijzigd');
    ok(!/telt nog niet mee/.test(home(kloon(GEMENGD)).tech) && /^HRV goed t\.o\.v\. je eigen baseline \(laatste meting 3 dagen geleden\)/.test(home(kloon(GEMENGD)).tech), 'F17d HRV van 3 dagen geleden die via het 7-daags gemiddelde is gebruikt blijft als gebruikte basis staan');
    ok(home(kloon(ALLES_OUD)).tech.indexOf('HRV van 10 dagen geleden telt vandaag niet mee') === 0 && !/referentiefase|telt nog niet mee/.test(home(kloon(ALLES_OUD)).tech), 'F17e verouderde HRV blijft expliciet niet-meetellend, zonder referentiefase-tekst');
    eq([a.df.basis, a.hv.hrv.gebruikt, a.hv.hrv.basis.bron, a.hv.hrv.basis.n, h.detail.sig, h.detail.conf], [{ hrv: true, slaap: true, cyclus: false }, true, '7d-gemiddelde', a.hc.recent.n, 2, 'Hoog'], 'F18 voldoende baseline + HRV vandaag: HRV telt normaal (2/3, Hoog)');
    ok(new RegExp('Vergeleken met je gemiddelde van ' + a.hc.recent.n + ' metingen in de laatste 7 dagen \\(' + Math.round(a.hc.recent.meanRaw) + ' ms\\)\\.').test(h.waarom), 'F19 de vergelijkingsbasis staat erbij, uit hrvComponent.recent');
    // E. afzonderlijke datums
    const los = kloon(ACTUEEL); los[0].rhr = null; los[0].sleep = null; los[1].sleep = null;
    const l = home(los);
    eq([l.detail.ctx.hrv.wanneer, l.detail.ctx.rhr.wanneer, l.detail.ctx.slaap.wanneer, l.detail.ctx.slaap.gebruikt], ['vandaag', 'gisteren', '2 dagen geleden', false], 'F20 elk signaal heeft zijn eigen meetmoment (HRV vandaag, rusthartslag gisteren, slaap 2 dagen geleden)');
    eq([l.tech, rij(l.waarom, 'Herstelsignalen'), rij(l.waarom, 'Telt vandaag niet mee')], ['HRV goed t.o.v. je eigen baseline, slaap van 2 dagen geleden telt vandaag niet mee · ' + VANDAAG, 'HRV 46 ms · RHR ' + ACTUEEL[1].rhr + ' (gisteren)', 'slaap ' + runtime({ hd: [] }).fmtSleep(ACTUEEL[2].sleep) + ' (2 dagen geleden)'], 'F21 de slaap van een oudere rij voedde de dagfactor niet (basis.slaap false) en staat dus bij "telt niet mee"');
    // F. stale blijft zoals in de eerste versie van deze PR
    const s = ctx(kloon(ALLES_OUD));
    eq([s.df.basis, s.hv.hrv.gebruikt, s.hv.hrv.referentie, s.hv.hrv.oud], [{ hrv: false, slaap: false, cyclus: false }, false, false, true], 'F22 verouderde HRV: niet gebruikt, geen referentiefase, wel "oud"');
  }

  /* ══ C. Lichaam-hero ═════════════════════════════════════════════════════ */
  {
    const nu = await lichHero(kloon(ACTUEEL));
    eq([tegel(nu, 'HRV'), tegel(nu, 'Rust HR'), tegel(nu, 'Slaap')], [['46', 'gemeten', 'Vandaag'], ['53', 'gemeten', 'Vandaag'], ['7u 30m', 'gemeten', 'Vandaag']], 'C1 waarden van vandaag: "Vandaag" onder elke gemeten tegel');
    const gis = await lichHero(reeks(30, 1));
    eq([tegel(gis, 'HRV')[2], tegel(gis, 'Rust HR')[2], tegel(gis, 'Slaap')[2]], ['Gisteren', 'Gisteren', 'Gisteren'], 'C2 waarden van gisteren: "Gisteren"');
    const oud = await lichHero(kloon(ALLES_OUD));
    eq([tegel(oud, 'HRV'), tegel(oud, 'Slaap')[2], tegel(oud, 'Rust HR')[2]], [[String(ALLES_OUD[0].hrv), 'gemeten', '10 dagen geleden'], '10 dagen geleden', '10 dagen geleden'], 'C3 waarden van 10 dagen oud: de waarde blijft zichtbaar, met "10 dagen geleden"');
    const geenDatum = await lichHero([{ date: null, hrv: 48, rhr: 55, sleep: 7 }]);
    eq([tegel(geenDatum, 'HRV'), tegel(geenDatum, 'Slaap')[2]], [['48', 'gemeten', 'Laatste meting'], 'Laatste meting'], 'C4 zonder geldige datum: "Laatste meting", geen "Vandaag"');
    const deels = kloon(ACTUEEL); deels[0].hrv = null;
    const d = await lichHero(deels);
    eq([tegel(d, 'HRV'), tegel(d, 'Slaap')[2]], [['—', 'gemeten', null], 'Vandaag'], 'C5 ontbrekende waarde: bestaande lege weergave, geen meetmoment en geen 0');
    eq(tegel(nu, 'Dagfactor'), ['1.05', 'berekend', null], 'C6 de berekende dagfactor-tegel is ongewijzigd');
    const leeg = await lichHero([]);
    eq([tegel(leeg, 'HRV'), tegel(leeg, 'Dagfactor')], [['—', 'gemeten', null], ['—', null, 'Nog te weinig gegevens']], 'C7 zonder data: lege meettegel zoals hij was; de Dagfactor-tegel zegt dat er te weinig gegevens zijn en noemt zich niet "berekend"');
    ok(/tkMetingLabel\(lh\)/.test(LICH) && !/new Date|86400000/.test(tussen(LICH, 'const tile=', '</div>`;')), 'C8 het meetmoment komt uit de bestaande helper; geen tweede datumlogica in de hero');
    ok(/\.lich-rhero \.m \.w\{/.test(HTML), 'C9 het meetmoment heeft een eigen, ingetogen stijlregel');
    // Het dagoordeel in de hero volgt df.basis; 100% in de ring is spierherstel, geen readiness.
    const heroMet = async function (hd) { const sb = runtime({ hd: hd }); sb.window.v43LichRec = { overall: 100, rows: [], hasData: true }; return await sb.__lichHero(); };
    const oordeel = function (h) { return [(/<div class="rd">([^<]*)<\/div>/.exec(h) || [])[1], (/<div class="badge">([^<]*)<\/div>/.exec(h) || [])[1], (/<div class="n">([^<]*)<\/div><div class="l">([^<]*)<\/div>/.exec(h) || []).slice(1, 3)]; };
    eq(oordeel(await heroMet(kloon(ALLES_OUD))), ['Doe je check-in voor advies', 'Check-in nodig', ['100%', 'Spierherstel']], 'C10 100% spierherstel met alleen verouderde gegevens: geen "Klaar om te trainen", wel de bestaande check-in-vraag');
    eq(ctx(kloon(ALLES_OUD)).df.basis, { hrv: false, slaap: false, cyclus: false }, 'C11 dat volgt uit de berekening zelf: de dagfactor heeft dan geen basis');
    const act = oordeel(await heroMet(kloon(ACTUEEL)));
    eq([act[0], act[2]], ['Klaar om te trainen', ['100%', 'Spierherstel']], 'C12 met een dagfactor die op metingen van vandaag rust blijft het oordeel zoals het was');
    eq(act[1], runtime({ hd: [] }).dayState(ctx(kloon(ACTUEEL)).df.factor).headline, 'C13 de badge komt ongewijzigd uit DecisionCore.dayZone');
    const zonderBasis = [{ date: VANDAAG, hrv: null, rhr: 55, sleep: null, cyclus_fase: null, note: null }];
    eq(oordeel(await heroMet(zonderBasis)).slice(0, 2), ['Nog te weinig gegevens voor advies', 'Gedeeltelijke gegevens'], 'C14 check-in van vandaag zonder slaap en HRV: geen oordeel en geen tweede check-in-vraag');
    eq(oordeel(await heroMet([]))[0], 'Doe je check-in voor advies', 'C15 zonder enige rij: ongewijzigd');
    ok(/dfBasis=tkDagfactorHeeftBasis\(dfo\)/.test(LICH) && !/basis\.(hrv|slaap|cyclus)/.test(LICH), 'C16 de hero gebruikt de bestaande helper; geen eigen basisregel');
    // Dagfactor-tegel: de neutrale 1.00 zonder basis is een invulling, geen uitkomst.
    const oudCtx = ctx(kloon(ALLES_OUD));
    eq([oudCtx.df.factor, oudCtx.sb.tkDagfactorHeeftBasis(oudCtx.df)], [1, false], 'C17 uitgangspunt: de berekening geeft zonder basis nog steeds de neutrale 1 (ongewijzigd) en meldt dat de basis ontbreekt');
    const oudHero = await heroMet(kloon(ALLES_OUD));
    eq(tegel(oudHero, 'Dagfactor'), ['—', null, 'Nog te weinig gegevens'], 'C18 zonder basis: geen "1.00", geen "berekend", wel "Nog te weinig gegevens"');
    ok(!/>1\.00</.test(oudHero) && !/berekend/.test(oudHero), 'C19 nergens in de dagsamenvatting staat dan nog 1.00 of "berekend"');
    eq(tegel(await heroMet(zonderBasis), 'Dagfactor'), ['—', null, 'Nog te weinig gegevens'], 'C20 ook met een check-in van vandaag zonder slaap en HRV-oordeel');
    const actCtx = ctx(kloon(ACTUEEL));
    eq([tegel(await heroMet(kloon(ACTUEEL)), 'Dagfactor'), actCtx.sb.tkDagfactorHeeftBasis(actCtx.df)], [[actCtx.df.factor.toFixed(2), 'berekend', null], true], 'C21 met basis: exact de berekende dagfactor, met "berekend", zoals voorheen');
    const alleenSlaap = [{ date: VANDAAG, hrv: null, rhr: null, sleep: 5.5, sleep_source: 'manual', cyclus_fase: null, note: null }];
    const slaapCtx = ctx(kloon(alleenSlaap));
    eq([slaapCtx.df.basis, tegel(await heroMet(kloon(alleenSlaap)), 'Dagfactor')], [{ hrv: false, slaap: true, cyclus: false }, [slaapCtx.df.factor.toFixed(2), 'berekend', null]], 'C22 één echte meting van vandaag (slaap) is een basis: de berekende waarde blijft staan');
    ok(/const dfToon=df!=null&&dfBasis;/.test(LICH) && /tile\(dfToon\?df\.toFixed\(2\):'—','Dagfactor',dfToon\?'berekend':'',dfToon\?'':'Nog te weinig gegevens'\)/.test(LICH), 'C23 de tegel volgt dezelfde bestaande basiscontrole als het dagoordeel; de factor zelf wordt niet aangepast');
  }

  /* ══ D. Hersteldetail ════════════════════════════════════════════════════ */
  {
    const nu = await detail(kloon(ACTUEEL));
    ok(/<div>Vandaag: 46 ms<\/div>/.test(nu) && /Status: boven persoonlijk niveau/.test(nu) && !/Bij die meting|Te oud om vandaag/.test(nu), 'D1 actuele HRV: bestaande statusweergave ("Status: …") behouden, geen extra regel');
    const oud = await detail(kloon(ALLES_OUD));
    ok(/<div>10 dagen geleden: \d+ ms<\/div>/.test(oud), 'D2 verouderde HRV: het echte meetmoment is zichtbaar');
    ok(!/Status: /.test(oud) && /Bij die meting: (boven|onder) persoonlijk niveau|Bij die meting: sterk lager/.test(oud), 'D3 verouderde HRV: geen "Status" voor vandaag; de positie hoort bij die meting');
    eq((oud.match(/Te oud om vandaag mee te tellen in je herstel\./g) || []).length, 3, 'D4 HRV, rusthartslag en slaap melden elk dat de meting vandaag niet meetelt');
    ok(/Persoonlijk niveau \(volledig\): \d+ ms/.test(oud), 'D5 het persoonlijke niveau (historie) blijft zichtbaar');
    const gemengd = await detail(kloon(HRV_OUD));
    ok(/<div>Vandaag: 6\.5 uur<\/div>/.test(gemengd) && (gemengd.match(/Te oud om vandaag mee te tellen/g) || []).length === 0, 'D6 nieuwste rij van vandaag met alleen slaap: geen onterechte melding');
    ok(!/stale|no_data|observation/.test(nu + oud), 'D7 geen technische kwaliteitstermen in de UI');
  }

  /* ══ E. Berekening en beslissing ongewijzigd ═════════════════════════════ */
  {
    eq(await keten(kloon(ACTUEEL), REC), [1.05, 1.05, 1, 1, { hrv: true, slaap: true, cyclus: false }, [92, 'hoog', 'hoog'], 'ready', 'volledig', ['hrv', 'rhr', 'slaap', 'spierherstel', 'trainingsbelasting'], { soort: 'ongewijzigd', setsDelta: 0, rpeDelta: 0 }, [92, 'hoog', 'hoog', 1.05, 0, 0]], 'E1 volledig actuele invoer: dagfactor, herstelscore, readiness en trainingsaanpassing exact als in #515/#516');
    eq((await keten(kloon(ALLES_OUD), REC)).slice(0, 6), [1, 1, 1, 1, { hrv: false, slaap: false, cyclus: false }, [75, 'gemiddeld', 'laag']], 'E2 verouderde invoer: zelfde uitkomst als in #515 (neutraal, alleen spierherstel)');
    const h = home(kloon(ACTUEEL)); const k = await keten(kloon(ACTUEEL), REC);
    eq([h.dfInfo.factor, h.detail.hrvF, h.detail.slaapF], [k[0], k[1], k[2]], 'E3 de kaart toont dezelfde dagfactor en onderdelen als de keten berekent');
    const src = ['core/calculation.js', 'core/decision.js', 'core/deviceIntegration.js'].map(function (f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }).join('\n');
    ok(!/tkHealthVandaag|tkNietMeegeteldTxt/.test(src), 'E4 de cores kennen de presentatiecontext niet (alleen index.html)');
    eq(DecisionCore.READINESS_ONBETROUWBARE_KWALITEIT, ['no_data', 'stale'], 'E5 de Decision-lijst is ongewijzigd');
    ok(/dagfactor\(hrvComponent,lh\.sleep,cyclusVandaag,hq\.signalen\)/.test(REFRESH), 'E6 de dagfactor-aanroep op Home is ongewijzigd');
  }
}

main().then(function () {
  console.log('fStaleHealthPresentation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) { console.error('fStaleHealthPresentation: onverwachte fout', e); process.exit(1); });
