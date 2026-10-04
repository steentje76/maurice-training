/* fStaleHealthPresentation.test.js — de presentatie van health-data volgt de berekening.
 *
 * Sinds #515/#516 telt een verouderde (7+ dagen) HRV-, rusthartslag- of slaapmeting niet meer als
 * signaal voor vandaag. De presentatie liep daar op drie plekken achter:
 *   A. Home-dagfactorkaart: de uitleg en "Waarom vandaag?" lazen de rauwe nieuwste rij en noemden
 *      een verouderde meting nog als reden ("HRV: referentiefase", "slaap voldoende", 2/3 signalen).
 *   B. Lichaam-hero: de tegels toonden de nieuwste waarde zonder meetmoment.
 *   C. Hersteldetail: de HRV-statusregel stond er ook bij een verouderde meting als "Status".
 *
 * Oplossing: één presentatiecontext, tkHealthVandaag(), op dezelfde gekeurde rijen, dezelfde
 * signalen en dezelfde Decision-lijst als de berekening. Geen nieuwe drempel, geen berekening.
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
  'tkHealthVandaag', 'tkNietMeegeteldTxt', 'tkNietMeeHtml', 'tkStatusLabel', 'tkSignaalOnbetrouwbaar', 'tkRhrDeltaHerstel', 'dagfactor', 'tkDagfactorHeeftBasis',
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
  return { sb: sb, dfInfo: r.dfInfo, detail: r.detail, tech: tech, waarom: sb.__els['dagfactor-detail'].innerHTML, ring: (r.kaart.match(/<div class="df-ring-val">([^<]*)<\/div>/) || [])[1] };
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
async function lichHero(hd) { const sb = runtime({ hd: hd }); return await sb.__lichHero(); }
async function detail(hd) { const sb = runtime({ hd: hd }); await sb.openRecoveryDetail(); return sb.__els['recdetail-body'].innerHTML; }
function tegel(html, naam) { const m = new RegExp('<div class="m"><div class="v">([^<]*)</div><div class="k">' + naam + '</div><div class="lich-src">([^<]*)</div>(?:<div class="w">([^<]*)</div>)?</div>').exec(html); return m ? [m[1], m[2], m[3] || null] : null; }

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

async function main() {
  /* ══ A. Presentatiecontext: zelfde bron als de berekening ═════════════════ */
  {
    const sb = runtime({ hd: [] });
    const hq = sb.tkHealthQualified(kloon(ACTUEEL)); const v = sb.tkHealthVandaag(hq.rows, hq.signalen);
    eq([v.hrv, v.rhr, v.slaap], [{ waarde: ACTUEEL[0].hrv, telt: true, laatste: null }, { waarde: ACTUEEL[0].rhr, telt: true, laatste: null }, { waarde: ACTUEEL[0].sleep, telt: true, laatste: null }], 'A1 actuele metingen: de waarde van de nieuwste rij, telt mee, geen "laatste meting"');
    const hqO = sb.tkHealthQualified(kloon(ALLES_OUD)); const o = sb.tkHealthVandaag(hqO.rows, hqO.signalen);
    eq([o.hrv, o.slaap.waarde, o.slaap.laatste, o.rhr.telt], [{ waarde: null, telt: false, laatste: { waarde: ALLES_OUD[0].hrv, wanneer: '10 dagen geleden' } }, null, { waarde: ALLES_OUD[0].sleep, wanneer: '10 dagen geleden' }, false], 'A2 verouderde metingen: geen waarde voor vandaag, wel de laatste meting met haar meetmoment');
    const leeg = sb.tkHealthVandaag([{ date: VANDAAG, hrv: null, rhr: null, sleep: null }], sb.tkHealthQualified([{ date: VANDAAG, hrv: null, rhr: null, sleep: null }]).signalen);
    eq([leeg.hrv, leeg.slaap], [{ waarde: null, telt: false, laatste: null }, { waarde: null, telt: false, laatste: null }], 'A3 geen meting: niets voor vandaag en geen verzonnen laatste meting (geen 0)');
    eq([sb.tkHealthVandaag(null, null).hrv, sb.tkHealthVandaag([], {}).slaap.waarde], [{ waarde: null, telt: true, laatste: null }, null], 'A4 lege invoer is veilig');
    const bron = extractFn(HTML, 'tkHealthVandaag');
    ok(/tkSignaalOnbetrouwbaar\(/.test(bron) && /tkMetingWanneer\(/.test(bron) && !/stale|no_data|\b7\b|Date\(/.test(bron), 'A5 de context gebruikt de Decision-lijst en de bestaande datumhelper; geen eigen status of drempel');
    ok(sb.tkNietMeegeteldTxt('HRV', { wanneer: '10 dagen geleden' }) === 'HRV van 10 dagen geleden telt vandaag niet mee' && sb.tkNietMeegeteldTxt('slaap', { wanneer: '' }) === 'laatste slaap-meting telt vandaag niet mee', 'A6 mensentaal, ook zonder meetmoment');
  }

  /* ══ B. Home-dagfactorkaart ═══════════════════════════════════════════════ */
  {
    // 1. actuele HRV + actuele slaap: zoals vóór de sprint
    const h = home(kloon(ACTUEEL));
    eq(h.tech, 'HRV goed t.o.v. je eigen baseline, slaap voldoende · ' + VANDAAG, 'B1 actuele HRV en slaap: de uitlegregel is woordelijk gelijk aan vóór de sprint');
    eq([h.detail.hrv, h.detail.rhr, h.detail.sleep, h.detail.conf, h.detail.sig, h.detail.st, h.detail.laatste], [ACTUEEL[0].hrv, ACTUEEL[0].rhr, ACTUEEL[0].sleep, 'Hoog', 2, 'g', { hrv: null, rhr: null, slaap: null }], 'B2 actuele waarden zichtbaar; 2/3 signalen, confidence Hoog, geen "laatste meting"');
    ok(/HRV 46 ms · RHR 53 · slaap 7u 30m/.test(h.waarom) && !/Laatste meting/.test(h.waarom) && /Confidence: Hoog \(2\/3 signalen\)/.test(h.waarom) && /HRV-beoordeling t\.o\.v\. je volledige eigen baseline/.test(h.waarom), 'B3 "Waarom vandaag?" bij actuele data ongewijzigd');
    eq([h.ring, h.dfInfo.factor, h.dfInfo.st], ['1.05', 1.05, 'g'], 'B4 dagfactor op de kaart ongewijzigd (1.05)');
    eq(runtime({ hd: [] }).dagfactorUitleg(46, 7.5, 'luteaal', { hrvSt: 'g', hrvBaseline: { fase: 'volledig' }, slaapFactor: 1 }), 'HRV goed t.o.v. je eigen baseline, slaap voldoende, cyclus: luteaal', 'B5 dagfactorUitleg met vier argumenten geeft dezelfde tekst als voorheen');
  }
  {
    // 2. HRV 10 dagen oud, slaap vandaag
    const h = home(kloon(HRV_OUD));
    eq(h.tech, 'slaap kort, HRV van 10 dagen geleden telt vandaag niet mee · ' + VANDAAG, 'B6 HRV 10 dagen oud + slaap vandaag: slaap is de reden, HRV staat erbij als niet meegeteld');
    ok(!/referentiefase|HRV goed|HRV verlaagd/.test(h.tech), 'B7 de verouderde HRV wordt niet als actuele dagfactorreden genoemd');
    eq([h.detail.hrv, h.detail.sleep, h.detail.sig, h.detail.conf, h.detail.st, h.detail.laatste.hrv], [null, 6.5, 1, 'Middel', 'ref', { waarde: HRV_OUD[1].hrv, wanneer: '10 dagen geleden' }], 'B8 detail: alleen slaap telt (1/3, Middel); HRV alleen als laatste meting');
    ok(/Herstelsignalen<\/span><span class="dfd-val">slaap 6u 30m</.test(h.waarom) && /Laatste meting<\/span><span class="dfd-val">HRV \d+ ms \(10 dagen geleden\) — telt vandaag niet mee</.test(h.waarom) && !/HRV-beoordeling/.test(h.waarom), 'B9 "Waarom vandaag?": slaap bij de signalen, HRV apart als laatste meting, geen HRV-beoordeling');
  }
  {
    // 3. slaap 10 dagen oud, HRV vandaag
    const h = home(kloon(SLAAP_OUD));
    eq(h.tech, 'HRV goed t.o.v. je eigen baseline, slaap van 10 dagen geleden telt vandaag niet mee · ' + VANDAAG, 'B10 slaap 10 dagen oud + HRV vandaag: HRV is de reden, slaap staat erbij als niet meegeteld');
    ok(!/slaap voldoende|slaap kort|slaap te kort/.test(h.tech), 'B11 de verouderde slaap wordt niet als actuele dagfactorreden genoemd');
    eq([h.detail.hrv, h.detail.sleep, h.detail.sig, h.detail.conf, h.detail.laatste.slaap], [SLAAP_OUD[0].hrv, null, 1, 'Middel', { waarde: SLAAP_OUD[10].sleep, wanneer: '10 dagen geleden' }], 'B12 detail: alleen HRV telt; slaap alleen als laatste meting');
  }
  {
    // 4. HRV en slaap beide verouderd
    const h = home(kloon(ALLES_OUD));
    eq(h.tech, 'HRV van 10 dagen geleden telt vandaag niet mee, slaap van 10 dagen geleden telt vandaag niet mee', 'B13 beide verouderd: de uitleg noemt geen van beide als reden en toont geen rijdatum als "vandaag"');
    ok(!/referentiefase|slaap voldoende|HRV goed/.test(h.tech + h.waarom), 'B14 nergens "referentiefase" of "slaap voldoende" voor verouderde data');
    eq([h.ring, h.detail.hrv, h.detail.rhr, h.detail.sleep, h.detail.sig, h.detail.conf, h.detail.st], ['1', null, null, null, 0, 'Laag', 'ref'], 'B15 dagfactor 1 (neutraal), 0/3 signalen, confidence Laag');
    ok(/Herstelsignalen<\/span><span class="dfd-val">—</.test(h.waarom) && /Laatste meting<\/span><span class="dfd-val">HRV \d+ ms \(10 dagen geleden\) · RHR \d+ \(10 dagen geleden\) · slaap [^<]* \(10 dagen geleden\) — telt vandaag niet mee</.test(h.waarom), 'B16 "Waarom vandaag?": geen herstelsignalen; de drie laatste metingen staan apart met hun meetmoment');
    ok(/Confidence: Laag \(0\/3 signalen\)/.test(h.waarom) && /1 = HRV 1\.00 × slaap 1\.00/.test(h.waarom), 'B17 de formuleregel toont de werkelijk gebruikte (neutrale) factoren');
    const cyc = kloon(ALLES_OUD); cyc.unshift({ date: VANDAAG, hrv: null, rhr: null, sleep: null, cyclus_fase: 'luteaal' });
    const c = home(cyc);
    eq(c.tech, 'cyclus: luteaal, HRV van 10 dagen geleden telt vandaag niet mee, slaap van 10 dagen geleden telt vandaag niet mee · ' + VANDAAG, 'B18 een ander actueel onderdeel (cyclusfase van vandaag) wordt wel als reden uitgelegd');
    const geen = home([{ date: VANDAAG, hrv: null, rhr: null, sleep: null, note: 'x' }]);
    eq([geen.tech, geen.detail.hrv, geen.detail.laatste], ['onvoldoende data', null, { hrv: null, rhr: null, slaap: null }], 'B19 geen enkele meting: bestaande lege weergave, geen 0 en geen verzonnen meting');
  }
  ok(!/dagfactorUitleg\(lh\.hrv|hrv:lh\.hrv|sleep:lh\.sleep|\[lh\.hrv,lh\.sleep/.test(REFRESH) && /tkHealthVandaag\(hd,hq\.signalen\)/.test(REFRESH), 'B20 refreshHome gebruikt de rauwe rij niet meer als toelichtingsbron');

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
    eq([tegel(leeg, 'HRV'), tegel(leeg, 'Dagfactor')], [['—', 'gemeten', null], ['—', 'berekend', null]], 'C7 zonder data blijft de hero zoals hij was');
    ok(/tkMetingLabel\(lh\)/.test(LICH) && !/new Date|86400000/.test(tussen(LICH, 'const tile=', '</div>`;')), 'C8 het meetmoment komt uit de bestaande helper; geen tweede datumlogica in de hero');
    ok(/\.lich-rhero \.m \.w\{/.test(HTML), 'C9 het meetmoment heeft een eigen, ingetogen stijlregel');
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
