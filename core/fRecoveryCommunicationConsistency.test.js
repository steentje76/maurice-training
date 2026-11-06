/* core/fRecoveryCommunicationConsistency.test.js
 *
 * UX-REC-02 — HERSTELCOMMUNICATIE CONSISTENT OP VANDAAG, INZICHT EN COACH.
 *
 * Praktijkbevinding (18 oktober 2026): dagfactor 1.02, gereedheid 85, slaap 6u01 en tegelijk
 * spierherstel 40%. PR #540 (UX-REC-01) maakte de hero-subtitel voorzichtig, maar de coachzin
 * (buildCoachAdvice, ook gebruikt in "Waarom vandaag?" en in de coachkaart) zei nog "Je herstel is
 * sterk" / "Je algehele herstel is sterk" / "Je lichaam is klaar voor belasting", en Inzicht zette
 * "Klaar om te trainen" naast de spierherstelring zonder te zeggen waar dat oordeel vandaan kwam.
 *
 * Wat deze test bewijst:
 *  A. De Decision-zone en de Calculation-uitkomsten zijn ongewijzigd (vaste tabel).
 *  B. De coachzinnen schrijven het oordeel toe aan de dagfactor en bevatten geen absolute
 *     herstelclaim; dezelfde zone geeft hetzelfde type zin.
 *  C. tkDagfactorHerkomst() noemt alleen wat de dagfactor voedde, met meetmoment; RHR niet.
 *     Beide "Waarom vandaag?"-panelen gebruiken die ene helper.
 *  D. (Chromium, anders SKIP) het praktijkscenario end-to-end op Home en Inzicht, op 320/360/390/412.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const CalcCore = require('./calculation.js');
const DecisionCore = require('./decision.js');
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
function dag(n) { const d = new Date(); d.setDate(d.getDate() - n); const p = function (x) { return ('0' + x).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

/* Absolute herstelclaims die een dagfactor niet kan onderbouwen. Bevat de bestaande verboden
 * woorden van CoachingCore plus de vroegere Home-formuleringen. */
const CLAIM = new RegExp([
  'je lichaam is klaar', 'je bent hersteld', 'herstel is sterk', 'algehele herstel', 'uitstekend moment',
  'grootste kans op progressie', 'goed hersteld en klaar', 'staat op groen', 'sterke trainingsdag'
].concat(CoachingCore.LIVE_VERBODEN_WOORDEN.filter(function (w) { return /hersteld|klaar/.test(w); })).join('|'), 'i');

/* ── runtime met de echte functies uit index.html ───────────────────────────── */
const NAMEN = ['tkDagfactorHeeftBasis', 'tkDagfactorVoorAdvies', 'joinNl', 'buildCoachAdvice', 'buildCoachIntro', 'buildMorningMessage', 'dayState', 'tkDagfactorHerkomst'];
const PROD = NAMEN.map(function (n) { return extractFn(HTML, n); }).join('\n') +
  '\n' + (/const TK_GEEN_ADVIES_TXT='[^']*';/.exec(HTML) || [''])[0] + (/const TK_GEEN_ADVIES_SUB='[^']*';/.exec(HTML) || [''])[0];
function runtime() {
  const sb = { console: console, window: {}, DecisionCore: DecisionCore, CalcCore: CalcCore, atleet: null,
    getRelevantMuscleRecovery: async function () { return []; },
    tkMetingNa: function (m) { return (m && m.wanneer) ? ' (' + m.wanneer + ')' : ''; },
    fmtSleep: function (h) { const u = Math.floor(h), m = Math.round((h - u) * 60); return u + 'u' + (m ? ('0' + m).slice(-2) : ''); } };
  vm.createContext(sb); vm.runInContext(PROD, sb);
  return sb;
}

async function deel1() {
  const sb = runtime();
  /* A. Engines ongewijzigd — vaste tabel van de bestaande drempels (readiness.v1, dayfactor.v1). */
  {
    const F = [0.85, 0.92, 0.93, 0.97, 0.99, 1, 1.02, 1.05];
    eq(F.map(function (f) { return DecisionCore.trainReadiness({ factor: f }).cls; }), ['r', 'r', 'y', 'y', 'y', 'g', 'g', 'g'], 'A1 trainReadiness-zones ongewijzigd (grenzen 0.93 en 1.00)');
    eq(F.map(function (f) { return DecisionCore.trainReadiness({ factor: f }).txt; }).filter(function (x, i, a) { return a.indexOf(x) === i; }), ['Houd het licht vandaag', 'Train op gevoel', 'Klaar om te trainen'], 'A2 Decision-teksten ongewijzigd (geen stille herlabeling)');
    eq([0.85, 0.93, 0.97, 1, 1.02, 1.05].map(function (f) { return CalcCore.readinessPercent(f); }), [0, 40, 60, 75, 85, 100], 'A3 gereedheid = readinessPercent(dagfactor), ongewijzigd: 1.02 -> 85 zoals in de praktijkbevinding');
    eq(DecisionCore.readinessDay({ dagfactor: 1.02, signalen: { spierherstel: [{ muscle: 'Quadriceps', pct: 40 }] } }).zone, 'ready', 'A4 readinessDay: zone volgt de dagfactor, ook bij laag spierherstel (bestaand gedrag, niet gewijzigd)');
  }
  /* B. Coachzinnen: toeschrijving aan de dagfactor, geen absolute herstelclaim. */
  {
    const basis = { hrv: true, slaap: true, cyclus: false };
    const g = { factor: 1.02, basis: basis }, y = { factor: 0.95, basis: basis }, r = { factor: 0.88, basis: basis };
    const laag = [{ muscle: 'Quadriceps', pct: 40, hours: 20 }], hoog = [{ muscle: 'Borst', pct: 95, hours: 80 }], geen = [{ muscle: 'Rug', pct: 100, hours: null }];
    const nextT = { naam: 'Benen A' };
    const zinnen = {
      gLaag: await sb.buildCoachAdvice(g, nextT, laag, true), gHoog: await sb.buildCoachAdvice(g, nextT, hoog, true),
      gGeen: await sb.buildCoachAdvice(g, nextT, geen, true), gLeeg: await sb.buildCoachAdvice(g, null, [], true),
      y: await sb.buildCoachAdvice(y, nextT, laag, true), r: await sb.buildCoachAdvice(r, nextT, laag, true)
    };
    Object.keys(zinnen).forEach(function (k) { ok(!CLAIM.test(zinnen[k]), 'B1 ' + k + ': geen absolute herstelclaim: "' + zinnen[k] + '"'); });
    ok(['gLaag', 'gHoog', 'gGeen', 'gLeeg'].every(function (k) { return zinnen[k].indexOf('Je dagfactor is gunstig') === 0; }), 'B2 zone g: elke zin begint met "Je dagfactor is gunstig"');
    ok(zinnen.y.indexOf('Je dagfactor is gemiddeld') === 0 && zinnen.r.indexOf('Je dagfactor is laag') === 0, 'B3 zones y en r schrijven ook toe aan de dagfactor');
    eq(zinnen.gLaag, 'Je dagfactor is gunstig. Let op: quadriceps is volgens de inschatting nog niet hersteld — houd daar rekening mee bij Benen A.', 'B4 laag spierherstel (<70%) blijft benoemd, als schatting');
    ok(/borst is volgens de inschatting hersteld/.test(zinnen.gHoog), 'B5 hoog spierherstel (>=90%) heet "volgens de inschatting hersteld", niet "volledig hersteld"');
    eq(zinnen.gGeen, 'Je dagfactor is gunstig voor Benen A. Spierherstel is een aparte schatting.', 'B6 een rij zonder trainingsdata (hours null) telt niet als hersteld (bestaand filter)');
    ok(!/RPE/.test(zinnen.gLaag) && /RPE/.test(zinnen.y), 'B7 de handelingsadviezen per zone zijn behouden');
    const intro = sb.buildCoachIntro(g, true), ochtend = sb.buildMorningMessage(g, null, true).regel;
    ok(!CLAIM.test(intro) && !CLAIM.test(ochtend), 'B8 coachintro en ochtendregel claimen geen herstel: "' + intro + '" / "' + ochtend + '"');
    const zonder = { factor: 1, basis: { hrv: false, slaap: false, cyclus: false } };
    const GEEN = (/const TK_GEEN_ADVIES_TXT='([^']*)';/.exec(HTML) || [])[1] + '. ' + (/const TK_GEEN_ADVIES_SUB='([^']*)';/.exec(HTML) || [])[1];
    eq(await sb.buildCoachAdvice(zonder, nextT, laag, true), GEEN, 'B9 zonder basis blijft het bestaande geen-advies-pad (DEC-DQ-002)');
  }
  /* C. Herkomst van de dagfactor: één helper, alleen wat werkelijk meetelde. */
  {
    const d = { factor: 1.02, hrv: 60, rhr: 52, sleep: 6.0167, cyclus: null, hrvF: 1.05, slaapF: 0.97, cycTxt: '', conf: 'Hoog', sig: 2, heeftBasis: true,
      ctx: { hrv: { gebruikt: true, waarde: 60, wanneer: 'vandaag' }, rhr: { gebruikt: true, waarde: 52, wanneer: 'vandaag' }, slaap: { gebruikt: true, waarde: 6.0167, wanneer: 'vandaag' }, cyclus: {} } };
    const h = sb.tkDagfactorHerkomst(d);
    eq(h.gebruikt, ['HRV 60 ms (vandaag)', 'slaap 6u01 (vandaag)'], 'C1 gebaseerd op: HRV en slaap met meetmoment; RHR voedt de dagfactor niet en staat er niet bij');
    eq(h.formule, '1.02 = HRV 1.05 × slaap 0.97, geclipt 0.85–1.05.', 'C2 de berekening is zichtbaar: korte slaap drukt de dagfactor');
    eq(h.betrouwbaarheid, 'Hoog (2/3 signalen)', 'C3 betrouwbaarheid uit de bestaande conf/sig');
    const oud = Object.assign({}, d, { hrv: null, ctx: Object.assign({}, d.ctx, { hrv: { gebruikt: false, waarde: 55, wanneer: '9 dagen geleden' } }) });
    ok(/HRV 55 ms \(9 dagen geleden\)/.test(sb.tkDagfactorHerkomst(oud).nietMee) && sb.tkDagfactorHerkomst(oud).gebruikt.length === 1, 'C4 een oude meting staat bij "telt vandaag niet mee", niet als basis');
    ok(/neutrale invulling, geen meting/.test(sb.tkDagfactorHerkomst(Object.assign({}, d, { heeftBasis: false })).formule), 'C5 zonder basis: de rekenwaarde heet een invulling');
    eq(sb.tkDagfactorHerkomst(null), null, 'C6 zonder detail geen herkomst (geen verzonnen waarden)');
    ok(/tkDagfactorHerkomst\(d\)/.test(extractFn(HTML, 'renderDagfactorDetail')) && /tkDagfactorHerkomst\(window\.homeDfDetail\)/.test(extractFn(HTML, 'renderV43Home')), 'C7 beide "Waarom vandaag?"-panelen gebruiken dezelfde helper');
    eq((extractFn(HTML, 'renderDagfactorDetail').match(/geclipt 0\.85/g) || []).length, 0, 'C8 de formuletekst staat niet meer dubbel in renderDagfactorDetail');
    eq((extractFn(HTML, 'renderV43Home').match(/r\.hours!==null&&r\.pct<70/g) || []).length, 1, 'C9 renderV43Home filtert laag spierherstel op één plek (geen tweede, identieke lijst)');
  }
}

/* ══ Deel 2 — praktijkscenario in de echte app ═══════════════════════════════ */
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

async function deel2() {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) { console.log('fRecoveryCommunicationConsistency: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)'); return; }
  const url = 'file://' + path.join(ROOT, 'index.html');
  /* 30 dagen historie; laatste week HRV 60 (goed t.o.v. baseline), vandaag slaap 6u01. */
  const hd = []; for (let i = 0; i < 30; i++) hd.push({ date: dag(i), hrv: i < 7 ? 60 : 50 + ((i * 7) % 9) - 4, rhr: 55, sleep: i === 0 ? 6 + 1 / 60 : 7.5, hrv_source: 'wearable', rhr_source: 'wearable', sleep_source: 'wearable', note: null });
  const sessies = [{ exercise_id: 'sq', date: dag(0), rpe: 9, sets: 5, reps: 5, weight: 100 }];
  const open = async function (w) {
    const page = await browser.newPage({ viewport: { width: w, height: 1400 } });
    const errs = []; page.on('pageerror', function (e) { errs.push(e.message); });
    await page.goto(url,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(500);
    await page.evaluate(function (a) {
      exercises = [{ id: 'sq', naam: 'Squat', muscle_primary: ['Quadriceps'], muscle_secondary: [] }];
      window.sbGet = async function (t) { return t === 'hrv_log' ? a[0] : (t === 'sessions' ? a[1] : []); };
      window.fetchWearableStatus = async function () { return { connected: false }; };
      window.__klaar = false; const echt = window.refreshHome;
      window.refreshHome = async function () { const r = await echt.apply(this, arguments); window.__klaar = true; return r; };
      go('s-home');
    }, [hd, sessies]);
    await page.waitForFunction(function () { return window.__klaar === true && document.querySelectorAll('#home-hero .v43-stat-k').length === 4; }, null, { timeout: 60000 });
    page.__errs = errs;
    return page;
  };
  for (const w of [320, 360, 390, 412]) {
    const page = await open(w);
    const u = await page.evaluate(function () {
      const t = function (sel) { const e = document.querySelector(sel); return e ? e.textContent.replace(/­/g, '').replace(/\s+/g, ' ').trim() : null; };
      const stats = {}; document.querySelectorAll('#home-hero .v43-stat').forEach(function (s) { stats[s.querySelector('.v43-stat-k').textContent.replace(/­/g, '')] = (s.querySelector('.v43-stat-v,.v43-df-circle') || {}).textContent; });
      document.querySelector('#home-hero .v43-hero').click();
      const kaart = document.querySelector('#home-hero .v43-hero').getBoundingClientRect();
      const body = document.getElementById('v43-why-body');
      const rijen = Array.from(body.querySelectorAll('.v43-why-row')).map(function (r) { return r.getBoundingClientRect(); });
      const leg = Array.from(document.querySelectorAll('#home-hero .v43-legend .d')).map(function (d) { return d.getBoundingClientRect(); });
      return { label: t('#home-hero .v43-lbl'), titel: t('#home-hero .v43-hero-title'), sub: t('#home-hero .v43-hero-sub'), stats: stats,
        waarom: t('#v43-why-body'), open: !body.hidden, coach: t('#home-coach-vandaag .t'), readinessKop: t('#home-readiness .tk-ready-kop'),
        factor: window.homeDfDetail && window.homeDfDetail.factor,
        binnen: rijen.concat(leg).every(function (r) { return r.right <= kaart.right + 0.5 && r.left >= kaart.left - 0.5; }),
        pagina: document.getElementById('s-home').scrollWidth > document.getElementById('s-home').clientWidth + 1 };
    });
    const tag = w + 'px ';
    if (w === 390) console.log('fRecoveryCommunicationConsistency: praktijkscenario ' + JSON.stringify({ stats: u.stats, titel: u.titel, sub: u.sub, coach: u.coach, readinessKop: u.readinessKop }));
    eq([u.stats.Dagfactor, u.stats.Gereedheid], ['1.02', '85'], tag + 'D1 de praktijkwaarden worden gereproduceerd: dagfactor 1.02, gereedheid 85');
    ok(/^\d+%$/.test(u.stats.Spierherstel) && parseInt(u.stats.Spierherstel, 10) < 70 && u.stats.Slaap === '6u 01m', tag + 'D2 laag geschat spierherstel en slaap 6u01 staan ernaast: ' + u.stats.Spierherstel + ' / ' + u.stats.Slaap);
    eq([u.label, u.titel], ['Vandaag', DecisionCore.trainReadiness({ factor: u.factor }).txt], tag + 'D3 hero-label claimt geen herstel ("Vandaag"); de titel komt ongewijzigd uit de Decision Engine');
    ok(/^Je dagfactor is gunstig, maar sommige spiergroepen herstellen/.test(u.sub), tag + 'D4 hero-subtitel (UX-REC-01) blijft voorzichtig');
    ok(u.coach && u.coach.indexOf('Je dagfactor is gunstig') >= 0 && !CLAIM.test(u.coach), tag + 'D5 coachkaart: toegeschreven aan de dagfactor, geen herstelclaim: "' + u.coach + '"');
    ok(u.open && /Gebaseerd op\s*HRV 60 ms · slaap 6u 01m/.test(u.waarom), tag + 'D6 "Waarom vandaag?" noemt wat de dagfactor voedde, met slaap 6u01');
    ok(/1\.02 = HRV 1\.05 × slaap 0\.97/.test(u.waarom) && /Betrouwbaarheid: (Hoog|Middel|Laag) \(\d\/3 signalen\)/.test(u.waarom), tag + 'D7 berekening en betrouwbaarheid zichtbaar');
    ok(/Spierherstel\s*\d+% · schatting, gemiddelde van 1 getrainde spiergroep(?!en)/.test(u.waarom) && /Nog herstellend\s*Quadriceps \d+%/.test(u.waarom), tag + 'D8 spierherstel apart verklaard als schatting');
    ok(!CLAIM.test(u.waarom) && !/Volledig hersteld/.test(u.waarom), tag + 'D9 "Waarom vandaag?" bevat geen absolute herstelclaim');
    ok(u.binnen && !u.pagina, tag + 'D10 uitgeklapte uitleg en legenda blijven binnen de kaart, geen horizontaal scrollen');
    /* Inzicht */
    await page.evaluate(function () { go('s-inzicht'); });
    await page.waitForFunction(function () { return document.querySelectorAll('#lich-hero .grid .m').length === 4; }, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    const i = await page.evaluate(function () {
      const t = function (sel) { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      const k = document.querySelector('#lich-hero .lich-rhero').getBoundingClientRect(), hk = document.querySelector('#lich-hero .lich-herk');
      return { rd: t('#lich-hero .rd'), herk: hk ? hk.textContent : null, herkBinnen: hk ? hk.getBoundingClientRect().right <= k.right + 0.5 : false,
        kaarten: t('#v43-lich-list'), lijst: Array.from(document.querySelectorAll('#lich-muslist .lich-mrow')).map(function (r) { return [r.querySelector('.nm').textContent, r.querySelector('.pc').textContent, r.querySelector('.st').textContent]; }), pagina: document.getElementById('s-inzicht').scrollWidth > document.getElementById('s-inzicht').clientWidth + 1 };
    });
    eq(i.rd, 'Klaar om te trainen', tag + 'D11 Inzicht: zelfde Decision-oordeel als Home');
    eq(i.herk, 'Op basis van je dagfactor · spierherstel is een aparte schatting', tag + 'D12 Inzicht zegt waar het oordeel vandaan komt');
    ok(i.herkBinnen && !i.pagina, tag + 'D13 de herkomstregel past op ' + w + 'px');
    ok(i.kaarten === null || !/Klaar voor belasting|Klaar voor zware belasting/.test(i.kaarten), tag + 'D14 spierkaarten: geen belastbaarheidsclaim zonder of op basis van alleen de vuistregel');
    ok(i.lijst.length > 0 && i.lijst.every(function (r) { return r[0] === 'Quadriceps' ? /^\d+%$/.test(r[1]) : (r[1] === '—' && r[2] === 'Geen data'); }), tag + 'D14b Inzicht-spierlijst: alleen de getrainde groep krijgt een percentage; de rest heet "Geen data", niet "Hersteld": ' + JSON.stringify(i.lijst));
    ok(page.__errs.filter(function (e) { return !/fetch|CORS|NetworkError/i.test(e); }).length === 0, tag + 'D15 geen JavaScript-fouten: ' + page.__errs.join(' | '));
    await page.close();
  }
  await browser.close();
}

(async function () {
  try { await deel1(); await deel2(); }
  catch (e) { fail++; msgs.push('onverwachte fout: ' + (e && e.stack || e)); }
  console.log('fRecoveryCommunicationConsistency: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
