/* core/fInzichtHerstelBelasting.test.js
 *
 * Het overzicht van het vroegere Lichaam-scherm (spierherstel en spierbelasting met voor- en
 * achterzijde) staat rechtstreeks onder Inzicht, vóór Domeinen. "Lichaam" is geen eigen of
 * verborgen bestemming meer.
 *
 * Deel 1 (altijd): structuur, routes en renderpad uit de bron.
 * Deel 2 (Chromium, anders SKIP): de echte pagina met vaste invoer. De getoonde waarden moeten
 * exact de uitkomst zijn van de bestaande bronfuncties (v43OverallRecovery, muscleLoadBySvgId);
 * de weergave rekent niets zelf.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let pass = 0, fail = 0;
const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(JSON.stringify(a) === JSON.stringify(b), l + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
function tussen(src, a, b) { const s = src.indexOf(a); if (s < 0) return ''; const e = src.indexOf(b, s + a.length); return e < 0 ? '' : src.slice(s, e); }
function fn(naam) { const m = new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\(').exec(HTML); if (!m) return ''; const s = m.index; const e = HTML.indexOf('\n}', s); return HTML.slice(s, e + 2); }

/* ══ Deel 1 — bron ═══════════════════════════════════════════════════════════ */
const INZ = tussen(HTML, '<div class="scr" id="s-inzicht">', '<div class="scr" id="s-library">');
{
  // A. De sectie staat onder Inzicht, vóór Domeinen, in de afgesproken volgorde.
  const volgorde = ['>Snel overzicht</div>', 'id="inzicht-herstel"', 'id="lich-hero"', 'id="lich-checkin"', 'id="lich-datastatus"',
    '>Herstel &amp; belasting</div>', 'id="lich-mode-rec"', 'id="lich-mode-load"', 'id="lich-fig-front"', 'id="lich-fig-back"',
    'id="lich-legend"', 'id="lich-muslist"', '>Hersteltrends<', 'id="lich-metrics"', '>Verbanden</div>', 'id="lich-relations"',
    '>Wat betekent dit?</div>', '>Domeinen</div>', 'id="inzicht-domain-list"', '>Gegevens &amp; context</div>', '>Recente inzichten</div>'];
  const pos = volgorde.map(function (x) { return INZ.indexOf(x); });
  ok(pos.every(function (p) { return p >= 0; }), 'A1 alle onderdelen staan op het Inzicht-scherm (ontbreekt: ' + volgorde.filter(function (x, i) { return pos[i] < 0; }).join(', ') + ')');
  ok(pos.every(function (p, i) { return i === 0 || p > pos[i - 1]; }), 'A2 volgorde: samenvatting, datastatus, Herstel & belasting, Hersteltrends, Verbanden, uitleg, en pas daarna Domeinen');
  ok(/id="lich-mode-rec" class="on" role="tab" aria-selected="true" onclick="lichSetMode\('rec'\)">Herstel<\/button>\s*<button id="lich-mode-load" role="tab" aria-selected="false" onclick="lichSetMode\('load'\)">Spierbelasting<\/button>/.test(INZ), 'A3 schakelaar Herstel | Spierbelasting, Herstel standaard actief');
  ok(/>Voorzijde<\/div>[\s\S]{0,200}>Achterzijde<\/div>/.test(INZ), 'A4 voor- en achterzijde staan naast elkaar met bijschrift');
  ['inzicht-herstel', 'lich-hero', 'lich-checkin', 'lich-datastatus', 'lich-mode-rec', 'lich-mode-load', 'lich-fig-front', 'lich-fig-back', 'lich-legend', 'lich-muslist', 'lich-anatfoot-t', 'lich-metrics', 'lich-relations'].forEach(function (id) {
    eq((HTML.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, 'A5 id ' + id + ' bestaat precies één keer (geen tweede weergave)');
  });
}
{
  // B. Eén renderpad en dezelfde brondata.
  ok(HTML.indexOf("if(id==='s-inzicht'||id==='s-lich-spieren'||id==='s-lich-health'||id==='s-lich-metingen')renderLichaam();") >= 0, 'B1 Inzicht gebruikt de bestaande renderer renderLichaam()');
  eq((HTML.match(/(?:^|\n)async function renderLichaamAnatomie\(/g) || []).length, 1, 'B2 er is precies één anatomie-renderer');
  const ANAT = fn('renderLichaamAnatomie');
  ok(/renderMuscleRecoveryHeatmap\('lich-fig-front', rec\.pctBySvgId\|\|\{\}, \{side:'front',neutralUnknown:true\}\)/.test(ANAT) && /renderMuscleRecoveryHeatmap\('lich-fig-back',\s+rec\.pctBySvgId\|\|\{\}, \{side:'back',neutralUnknown:true\}\)/.test(ANAT), 'B3 herstelfiguren lezen rec.pctBySvgId (v43OverallRecovery)');
  ok(/load=await muscleLoadBySvgId\(\)/.test(ANAT) && /renderMuscleHeatmap\('lich-fig-front', load\.setsBySvgId, \{side:'front'\}\)/.test(ANAT) && /renderMuscleHeatmap\('lich-fig-back',\s+load\.setsBySvgId, \{side:'back'\}\)/.test(ANAT), 'B4 belastingfiguren lezen muscleLoadBySvgId() — dezelfde bron als het spiergroepenscherm');
  ok(!/sbGet|v43SafeGet|sbFetch|CalcCore\./.test(ANAT), 'B5 de anatomie-weergave haalt zelf niets op en rekent niets');
  const INZ_JS = ['renderInzicht', 'inzichtRenderDevelopment', 'inzichtRenderOverview', 'inzichtRenderDomains', 'inzichtRenderRecent'].map(fn).join('\n');
  ok(INZ_JS.length > 2000 && !/getElementById\('(?:lich-|v43-lich)|renderLichaam\w*\(|muscleLoadBySvgId/.test(INZ_JS), 'B6 de Inzicht-renderers schrijven niet naar de herstelsectie (geen tweede dataketen)');
  ok(/function lichRecStatus\(p\)\{ return p>=85\?\['Hersteld','var\(--status-good\)'\] : p>=50\?\['Aandacht','var\(--status-warn\)'\] : \['Vermoeid','var\(--status-bad\)'\]; \}/.test(HTML), 'B7 kleurcodering en drempels van herstel zijn ongewijzigd (85/50)');
  ok(/function lichLoadStatus\(sets\)\{ return sets>=12\?\['Hoog','var\(--load-3\)'\] : sets>=6\?\['Gemiddeld','var\(--load-2\)'\] : sets>0\?\['Laag','var\(--load-1\)'\] : \['Rustdag','var\(--load-0\)'\]; \}/.test(HTML), 'B8 categorieën van spierbelasting zijn ongewijzigd (12/6 sets)');
  ok(HTML.indexOf(':is(#s-inzicht,#s-lich-spieren,#s-lich-spier,#s-lich-health,#s-lich-metingen,#s-lich-metric,#s-lich-oefeningen,#s-lich-verband,#s-lich-gegevens) .lich-figpair') >= 0 && !/#s-lichaam[ ,)]/.test(tussen(HTML, '<style', '</style>')), 'B9 de bestaande opmaak geldt op Inzicht; geen stijlregel verwijst nog naar het oude scherm');
}
{
  // C. Lichaam is geen bestemming meer; routes zijn omgeleid.
  ok(HTML.indexOf('<div class="scr" id="s-lichaam">') < 0, 'C1 het losse Lichaam-scherm bestaat niet meer');
  ok(HTML.indexOf("if(id==='s-lichaam'){id='s-inzicht';}") >= 0, 'C2 de oude route leidt in go() om naar Inzicht (geen dead-end)');
  ok(HTML.indexOf("go('s-lichaam')") < 0, 'C3 geen enkele knop verwijst nog naar Lichaam');
  ok(HTML.indexOf('Beheren bij Lichaam') < 0 && HTML.indexOf('Terug naar Lichaam') < 0, 'C4 de teksten "Beheren bij Lichaam" en "Terug naar Lichaam" zijn weg');
  ok(/actionsEl\.innerHTML=`<button class="btn btn-o btn-sm" style="flex:1" onclick="closeModal\('m-wearable'\);go\('s-lich-gegevens'\)">Gegevens &amp; koppelingen<\/button>`;/.test(HTML), 'C5 apparaatbeheer opent rechtstreeks Gegevens & koppelingen en sluit de modal');
  ok(/id="s-lich-gegevens"[\s\S]{0,600}onclick="tkNavGoBack\('s-profiel'\)" aria-label="Terug"/.test(HTML), 'C6 Gegevens & koppelingen: bronbewust terug; zonder voorgeschiedenis naar Profiel');
  ['s-lich-spieren', 's-lich-verband', 's-lich-cyclus', 's-lich-metric', 's-nutrition'].forEach(function (id) {
    const kop = HTML.substr(HTML.indexOf('<div class="scr" id="' + id + '">'), 700);
    ok(kop.indexOf("tkNavGoBack('s-inzicht')") >= 0, 'C7 ' + id + ': terugknop is bronbewust met Inzicht als terugval');
  });
  ok(/onclick="go\('s-lich-metingen'\)"><span class="pf-ic">[\s\S]{0,400}Lichaamsgegevens/.test(HTML), 'C8 Profiel-rij Lichaamsgegevens opent rechtstreeks Lichaamsmetingen');
  ok(INZ.indexOf("go('s-lich-cyclus')") > 0 && INZ.indexOf("go('s-lich-gegevens')") > 0 && INZ.indexOf("go('s-nutrition')") > 0 && INZ.indexOf("go('s-lich-spieren')") > 0, 'C9 wat alleen via Lichaam bereikbaar was, is vanaf Inzicht bereikbaar');
  ok(/\[\/\^s-lich\/,'inzicht'\]/.test(HTML), 'C10 de subschermen blijven in de Inzicht-context van de navigatie');
}
{
  // D. De 100% in de hero is spierherstel, geen readiness (gedrag: fStaleHealthPresentation C10-C16).
  const PREM = fn('renderLichaamPremium');
  ok(/<div class="l">Spierherstel<\/div>/.test(PREM) && !/<div class="l">Herstel<\/div>/.test(PREM), 'D1 de ring is gelabeld als Spierherstel');
  ok(/dfBasis=tkDagfactorHeeftBasis\(dfo\)/.test(PREM) && /const beoordeeld=ger!=null&&dfBasis;/.test(PREM), 'D2 het dagoordeel volgt de bestaande df.basis');
}
{
  // K. Eén naam voor één metric: het gemiddelde spierherstel heet overal Spierherstel.
  ok(!/>Herstelstatus</.test(HTML), 'K1 geen enkel zichtbaar label heet nog Herstelstatus');
  const OV = fn('inzichtRenderOverview');
  ok(/var rec=\(typeof v43OverallRecovery==='function'\)\?await v43OverallRecovery\(\):null;/.test(OV) && /<div class="lbl">Spierherstel<\/div><div class="val">'\+rec\.overall\+'<span class="unit">%<\/span>/.test(OV), 'K2 Snel overzicht: het vak Spierherstel toont rec.overall uit v43OverallRecovery() — dezelfde bron als voorheen');
  eq((OV.match(/ovCell\('herstel','Spierherstel',/g) || []).length, 2, 'K3 ook de lege toestand van dat vak heet Spierherstel');
  ok(/const ov=rec\.hasData\?rec\.overall:null;/.test(fn('renderLichaamPremium')), 'K4 de ring Spierherstel leest dezelfde rec.overall');
  ok(/font-weight:600">Spierherstel<\/div>'\+\s*'<div class="big" style="color:'\+st\[1\]\+'">'\+\(rij\.pct!=null\?rij\.pct\+'%':'—'\)/.test(fn('renderLichaamSpierDetail')), 'K5 spiergroepdetail: het percentage van die spiergroep (rec.rows) heet Spierherstel');
  ok(/<div class="k">spierherstel<\/div>/.test(HTML) && /gemiddeld spierherstel <span id="v43-lich-overall">/.test(HTML), 'K6 Voortgang en het spiergroepenscherm gebruiken dezelfde naam voor hetzelfde gemiddelde');
  ok(/herstelRegel='Herstelstatus vandaag: '\+herstel\.score\+'\/100 \('/.test(HTML) && /herstel=await recoveryAdjustmentForToday\(\);/.test(HTML), 'K7 de coachcontext houdt "Herstelstatus" voor de samengestelde herstelscore (recovery_score.v1): een andere metric, niet hernoemd');
}

/* ══ Deel 2 — echte pagina ════════════════════════════════════════════════════ */
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

const FIXTURE = function () {
  const d = function (n) { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().split('T')[0]; };
  exercises = [
    { id: 'sq', naam: 'Squat', muscle_primary: ['Quadriceps', 'Billen'], muscle_secondary: ['Hamstrings', 'Core'] },
    { id: 'bp', naam: 'Bench', muscle_primary: ['Borst'], muscle_secondary: ['Triceps', 'Schouders'] },
    { id: 'row', naam: 'Row', muscle_primary: ['Rug'], muscle_secondary: ['Biceps', 'Grip'] }];
  const ses = [
    { exercise_id: 'sq', date: d(0), rpe: 9, sets: 5, reps: 5, weight: 100 },
    { exercise_id: 'bp', date: d(1), rpe: 8, sets: 4, reps: 8, weight: 70 },
    { exercise_id: 'row', date: d(3), rpe: 7, sets: 8, reps: 10, weight: 60 },
    { exercise_id: 'sq', date: d(5), rpe: 7, sets: 6, reps: 5, weight: 90 }];
  const hrv = []; for (let i = 0; i < 30; i++) hrv.push({ date: d(i), hrv: 45 + (i % 5), rhr: 52 + (i % 3), sleep: 7 + (i % 2) * 0.5, hrv_source: 'wearable', rhr_source: 'wearable', sleep_source: 'wearable', note: null });
  window.__sbGetCalls = [];
  window.sbGet = async function (t, q) {
    q = q || ''; window.__sbGetCalls.push(t + q);
    const m = /date=gte\.([0-9-]+)/.exec(q);
    if (t === 'sessions') return ses.filter(function (s) { return !m || s.date >= m[1]; });
    if (t === 'hrv_log') return hrv;
    return [];
  };
  window.fetchWearableStatus = async function () { return { connected: false }; };
};

(async function () {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) {
    console.log('fInzichtHerstelBelasting: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)');
  } else {
    const url = 'file://' + path.join(ROOT, 'index.html');
    const lijst = function (page) { return page.evaluate(function () { return Array.from(document.querySelectorAll('#lich-muslist .lich-mrow')).map(function (r) { return [r.querySelector('.nm').textContent, r.querySelector('.pc').textContent, r.querySelector('.st').textContent, r.querySelector('.st').style.color]; }); }); };
    for (const w of [320, 360, 390, 412]) {
      const errs = [];
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      page.on('pageerror', function (e) { errs.push(e.message); });
      await page.goto(url); await page.waitForTimeout(500);
      await page.evaluate(FIXTURE);
      await page.evaluate(function () { go('s-inzicht'); });
      await page.waitForFunction(function () { return document.querySelectorAll('#lich-muslist .lich-mrow').length > 0 && document.querySelector('#lich-fig-back svg'); }, null, { timeout: 20000 });

      // E. Zichtbaar onder Inzicht, vóór Domeinen.
      const plek = await page.evaluate(function () {
        const sec = document.getElementById('inzicht-herstel'), dom = document.getElementById('inzicht-domain-list'), card = document.querySelector('#inzicht-herstel .lich-anatcard');
        const r = card.getBoundingClientRect();
        return { actief: document.querySelector('.scr.active').id, voorDomeinen: !!(sec.compareDocumentPosition(dom) & Node.DOCUMENT_POSITION_FOLLOWING), boven: sec.offsetTop < dom.offsetTop, hoogte: r.height, breedte: r.width, links: r.left, rechts: r.right,
          overflow: document.getElementById('s-inzicht').scrollWidth > document.getElementById('s-inzicht').clientWidth + 2,
          figs: Array.from(document.querySelectorAll('#inzicht-herstel .lich-figbox')).map(function (f) { const b = f.getBoundingClientRect(), s = f.querySelector('svg').getBoundingClientRect(); return [Math.round(b.left) >= 0, Math.round(b.right) <= window.innerWidth, s.width > 60, s.height > 120]; }),
          naastElkaar: (function () { const f = document.querySelectorAll('#inzicht-herstel .lich-figbox'); return Math.abs(f[0].getBoundingClientRect().top - f[1].getBoundingClientRect().top) < 2 && f[0].getBoundingClientRect().right <= f[1].getBoundingClientRect().left + 1; })(),
          tabs: Array.from(document.querySelectorAll('#inzicht-herstel .lich-seg button')).map(function (b) { return [b.textContent, b.getAttribute('aria-selected'), b.scrollWidth <= b.clientWidth + 1]; }),
          stijl: getComputedStyle(document.querySelector('#inzicht-herstel .lich-figpair')).display };
      });
      eq([plek.actief, plek.voorDomeinen, plek.boven], ['s-inzicht', true, true], w + 'px E1 de sectie staat op Inzicht en vóór Domeinen');
      ok(plek.hoogte > 300 && plek.links >= 0 && plek.rechts <= w + 1 && !plek.overflow, w + 'px E2 de kaart is zichtbaar, past binnen het scherm en veroorzaakt geen horizontaal scrollen');
      eq(plek.figs, [[true, true, true, true], [true, true, true, true]], w + 'px E3 voor- en achterzijde zijn getekend en vallen binnen het scherm');
      ok(plek.naastElkaar && plek.stijl !== 'block', w + 'px E4 de twee figuren staan naast elkaar (bestaande opmaak is actief op Inzicht)');
      eq(plek.tabs, [['Herstel', 'true', true], ['Spierbelasting', 'false', true]], w + 'px E5 schakelaar: Herstel actief, labels niet afgekapt');

      // F. Herstel: exact de uitkomst van v43OverallRecovery().
      const her = await page.evaluate(async function () {
        const rec = await v43OverallRecovery();
        const tmp = document.createElement('div'); tmp.id = '__tmpfig'; tmp.style.display = 'none'; document.body.appendChild(tmp);
        renderMuscleRecoveryHeatmap('__tmpfig', rec.pctBySvgId, { side: 'front', neutralUnknown: true }); const f = tmp.innerHTML;
        renderMuscleRecoveryHeatmap('__tmpfig', rec.pctBySvgId, { side: 'back', neutralUnknown: true }); const b = tmp.innerHTML; tmp.remove();
        return { verwacht: lichTop4Herstel(rec.rows).map(function (r) { const st = lichRecStatus(r.pct); return [r.muscle, r.pct + '%', st[0], st[1]]; }), rijen: rec.rows.length, overall: rec.overall,
          front: f === document.getElementById('lich-fig-front').innerHTML, back: b === document.getElementById('lich-fig-back').innerHTML,
          legenda: Array.from(document.querySelectorAll('#lich-legend span')).map(function (s) { return [s.textContent, s.querySelector('i').style.background]; }), voet: document.getElementById('lich-anatfoot-t').textContent };
      });
      eq(await lijst(page), her.verwacht, w + 'px F1 spiergroeprijen tonen exact het herstel uit v43OverallRecovery() met de bestaande status en kleur');
      ok(her.verwacht.length === 4 && her.verwacht.some(function (r) { return r[2] === 'Vermoeid'; }) && her.verwacht.some(function (r) { return r[2] === 'Hersteld'; }), w + 'px F2 de vaste invoer geeft herstelde en vermoeide groepen (de test is niet leeg)');
      ok(her.front && her.back, w + 'px F3 beide figuren zijn identiek aan de bestaande renderer met rec.pctBySvgId');
      eq(her.legenda, [['Hersteld', 'var(--status-good)'], ['Aandacht', 'var(--status-warn)'], ['Vermoeid', 'var(--status-bad)']], w + 'px F4 legenda herstel: groen hersteld, geel aandacht, rood vermoeid');
      eq(her.voet, '4 van ' + her.rijen + ' groepen · gem. ' + her.overall + '% · 14 dagen', w + 'px F5 voettekst komt uit dezelfde uitkomst');

      // G. Spierbelasting: exact de uitkomst van muscleLoadBySvgId(); geen tweede keten.
      const voor = await page.evaluate(function () { const n = window.__sbGetCalls.length; lichSetMode('load'); return n; });
      await page.waitForFunction(function () { const p = document.querySelector('#lich-muslist .pc'); return p && / sets$/.test(p.textContent); }, null, { timeout: 10000 });
      const bel = await page.evaluate(async function (n) {
        const nieuw = window.__sbGetCalls.slice(n);
        const load = await muscleLoadBySvgId();
        const tmp = document.createElement('div'); tmp.id = '__tmpfig'; tmp.style.display = 'none'; document.body.appendChild(tmp);
        renderMuscleHeatmap('__tmpfig', load.setsBySvgId, { side: 'front' }); const f = tmp.innerHTML;
        renderMuscleHeatmap('__tmpfig', load.setsBySvgId, { side: 'back' }); const b = tmp.innerHTML; tmp.remove();
        const verwacht = Object.keys(load.setsByMuscle).map(function (m) { return { muscle: m, sets: load.setsByMuscle[m] }; })
          .sort(function (a, c) { return (c.sets - a.sets) || a.muscle.localeCompare(c.muscle, 'nl'); }).slice(0, 4)
          .map(function (r) { const st = lichLoadStatus(r.sets); return [r.muscle, r.sets + ' sets', st[0], st[1]]; });
        return { nieuw: nieuw, verwacht: verwacht, front: f === document.getElementById('lich-fig-front').innerHTML, back: b === document.getElementById('lich-fig-back').innerHTML,
          legenda: Array.from(document.querySelectorAll('#lich-legend span')).map(function (s) { return s.textContent; }),
          tabs: [document.getElementById('lich-mode-rec').getAttribute('aria-selected'), document.getElementById('lich-mode-load').getAttribute('aria-selected')] };
      }, voor);
      eq(await lijst(page), bel.verwacht, w + 'px G1 spiergroeprijen tonen exact de sets uit muscleLoadBySvgId() met de bestaande categorie en kleur');
      eq(bel.verwacht.slice(0, 2), [['Billen', '11 sets', 'Gemiddeld', 'var(--load-2)'], ['Core', '11 sets', 'Gemiddeld', 'var(--load-2)']], w + 'px G2 de vaste invoer telt op zoals verwacht (5 + 6 sets squat)');
      ok(bel.front && bel.back, w + 'px G3 beide figuren zijn identiek aan de bestaande renderer met load.setsBySvgId');
      eq([bel.legenda, bel.tabs], [['Hoog', 'Gemiddeld', 'Laag', 'Rustdag'], ['false', 'true']], w + 'px G4 legenda en schakelaar volgen de modus');
      ok(bel.nieuw.length === 1 && /^sessions&date=gte\.[0-9-]+&weight=not\.is\.null&sets=not\.is\.null&reps=not\.is\.null$/.test(bel.nieuw[0]), w + 'px G5 omschakelen doet precies één bestaand verzoek (muscleLoadBySvgId), geen tweede dataketen: ' + JSON.stringify(bel.nieuw));
      await page.evaluate(function () { lichSetMode('rec'); });
      await page.waitForFunction(function () { const p = document.querySelector('#lich-muslist .pc'); return p && /%$/.test(p.textContent); }, null, { timeout: 10000 });
      eq(await lijst(page), her.verwacht, w + 'px G6 terugschakelen toont weer exact dezelfde herstelrijen');

      // H. De overige Inzicht-secties zijn er nog.
      await page.waitForFunction(function () { return document.querySelectorAll('#inzicht-domain-list .row').length > 0; }, null, { timeout: 30000 });
      const rest = await page.evaluate(function () { return [document.querySelectorAll('#inzicht-summary-grid .tk-summary-cell').length, document.querySelectorAll('#inzicht-overview-grid .tk-overview-cell').length, document.querySelectorAll('#inzicht-domain-list .row').length, document.querySelectorAll('#s-inzicht .tk-period-selector button[role="tab"]').length, !!document.getElementById('inzicht-recent-list')]; });
      eq(rest, [4, 5, 7, 3, true], w + 'px H1 Jouw ontwikkeling (4), Snel overzicht (5), Domeinen (7), periode (3) en Recente inzichten zijn ongewijzigd aanwezig');
      // L. Hetzelfde spierherstel staat niet onder twee namen op Inzicht.
      await page.waitForFunction(function () { return document.querySelectorAll('#inzicht-overview-grid .tk-overview-cell').length === 5; }, null, { timeout: 30000 });
      const naam = await page.evaluate(async function () {
        const rec = await v43OverallRecovery();
        const cel = Array.from(document.querySelectorAll('#inzicht-overview-grid .tk-overview-cell')).filter(function (c) { return c.querySelector('.tk-recovery-ring'); })[0];
        return { verwacht: rec.overall + '%', vak: cel ? [cel.querySelector('.lbl').textContent, cel.querySelector('.val').textContent] : null,
          ring: [document.querySelector('#lich-hero .rring .l').textContent, document.querySelector('#lich-hero .rring .n').textContent],
          scherm: document.getElementById('s-inzicht').innerText,
          tegel: Array.from(document.querySelectorAll('#lich-hero .grid .m')).map(function (m) { return [m.querySelector('.k').textContent, m.querySelector('.v').textContent, (m.querySelector('.lich-src') || {}).textContent || null]; })[0] };
      });
      eq([naam.vak, naam.ring], [['Spierherstel', naam.verwacht], ['Spierherstel', naam.verwacht]], w + 'px L1 vak in Snel overzicht en ring tonen dezelfde waarde uit v43OverallRecovery() onder dezelfde naam');
      ok(!/Herstelstatus/i.test(naam.scherm), w + 'px L2 het woord Herstelstatus komt niet meer voor op het Inzicht-scherm');
      ok(naam.tegel[0] === 'Dagfactor' && /^\d\.\d\d$/.test(naam.tegel[1]) && naam.tegel[2] === 'berekend', w + 'px L3 met metingen van vandaag toont de tegel de berekende dagfactor: ' + JSON.stringify(naam.tegel));
      const fouten = errs.filter(function (e) { return !/fetch|CORS|NetworkError/i.test(e); });
      ok(fouten.length === 0, w + 'px H2 geen JavaScript-fouten: ' + JSON.stringify(fouten));
      await page.close();
    }

    // M. Dagfactor zonder basis: geen 1.00, geen "berekend", geen positief dagoordeel.
    for (const w of [320, 360, 412]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      const errs = []; page.on('pageerror', function (e) { errs.push(e.message); });
      await page.goto(url); await page.waitForTimeout(500);
      await page.evaluate(FIXTURE);
      await page.evaluate(function () {
        const x = new Date(); x.setDate(x.getDate() - 10); const oud = x.toISOString().split('T')[0];
        const echt = window.sbGet;
        window.sbGet = async function (t, q) { return t === 'hrv_log' ? [{ date: oud, hrv: 48, rhr: 55, sleep: 7, note: null }] : echt(t, q); };
        go('s-inzicht');
      });
      await page.waitForFunction(function () { return !!document.querySelector('#lich-hero .grid .m') && document.querySelectorAll('#lich-muslist .lich-mrow').length > 0; }, null, { timeout: 20000 });
      const z = await page.evaluate(async function () {
        const hq = tkHealthQualified(await v43SafeGet('hrv_log', '&order=date.desc,created_at.desc&limit=35'));
        const dfo = dagfactor(hrvDagFactorPersonal(hq.rows), hq.rows[0].sleep, tkCyclusFaseVandaag(hq.rows[0]), hq.signalen);
        const m = document.querySelector('#lich-hero .grid .m'), g = document.querySelector('#lich-hero .grid'), h = document.getElementById('lich-hero');
        return { factor: dfo.factor, basis: tkDagfactorHeeftBasis(dfo), tegel: [m.querySelector('.k').textContent, m.querySelector('.v').textContent, !!m.querySelector('.lich-src'), (m.querySelector('.w') || {}).textContent || null],
          oordeel: [h.querySelector('.rd').textContent, h.querySelector('.badge').textContent], hero: h.innerText, ring: h.querySelector('.rring .l').textContent,
          lijst: document.querySelectorAll('#lich-muslist .lich-mrow').length, breedte: g.scrollWidth };
      });
      eq([z.factor, z.basis], [1, false], w + 'px M1 de berekening zelf geeft nog steeds de neutrale 1 zonder basis (ongewijzigd)');
      eq(z.tegel, ['Dagfactor', '—', false, 'Nog te weinig gegevens'], w + 'px M2 de tegel toont geen getal en geen "berekend", maar "Nog te weinig gegevens"');
      ok(!/1[.,]00/.test(z.hero) && !/berekend/i.test(z.hero), w + 'px M3 nergens in de dagsamenvatting staat 1.00 of "berekend"');
      eq(z.oordeel, ['Doe je check-in voor advies', 'Check-in nodig'], w + 'px M4 er ontstaat geen positief dagoordeel uit de neutrale invulling');
      ok(z.ring === 'Spierherstel' && z.lijst === 4, w + 'px M5 spierherstel en de spiergroeprijen blijven gewoon zichtbaar');
      const basisBreedte = await page.evaluate(function () { const m = document.querySelectorAll('#lich-hero .grid .m'); return [Math.round(m[0].getBoundingClientRect().width), Math.round(m[1].getBoundingClientRect().width)]; });
      ok(basisBreedte[0] <= basisBreedte[1] + 2, w + 'px M6 de tekst maakt de Dagfactor-tegel niet breder dan de andere tegels: ' + JSON.stringify(basisBreedte));
      const fouten = errs.filter(function (e) { return !/fetch|CORS|NetworkError/i.test(e); });
      ok(fouten.length === 0, w + 'px M7 geen JavaScript-fouten: ' + JSON.stringify(fouten));
      await page.close();
    }

    // I. Routes.
    {
      const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
      const errs = []; page.on('pageerror', function (e) { errs.push(e.message); });
      await page.goto(url); await page.waitForTimeout(500);
      await page.evaluate(FIXTURE);
      const actief = function () { return page.evaluate(function () { return document.querySelector('.scr.active').id; }); };
      const terug = function (id) { return page.evaluate(function (x) { document.querySelector('#' + x + ' .hdr .ibtn').click(); }, id); };
      await page.evaluate(function () { go('s-home'); go('s-lichaam'); });
      eq(await actief(), 's-inzicht', 'I1 de oude Lichaam-route komt op Inzicht uit');
      eq(await page.evaluate(function () { return !!document.getElementById('s-lichaam'); }), false, 'I2 er bestaat geen Lichaam-scherm meer in de pagina');
      await page.evaluate(function () { go('s-profiel'); openModal('m-wearable'); });
      await page.waitForFunction(function () { return !!document.querySelector('#profiel-wearable-actions button'); }, null, { timeout: 10000 });
      eq(await page.evaluate(function () { return document.querySelector('#profiel-wearable-actions button').textContent; }), 'Gegevens & koppelingen', 'I3 de knop in Wearables & apparaten heet Gegevens & koppelingen');
      await page.evaluate(function () { document.querySelector('#profiel-wearable-actions button').click(); });
      eq([await actief(), await page.evaluate(function () { return !!document.querySelector('.modal-bg.open'); })], ['s-lich-gegevens', false], 'I4 de knop opent Gegevens & koppelingen en laat geen modal open staan');
      await terug('s-lich-gegevens');
      eq(await actief(), 's-profiel', 'I5 terug vanuit Gegevens & koppelingen gaat naar Profiel, niet naar Lichaam');
      for (const paar of [['s-inzicht', 's-lich-gegevens'], ['s-inzicht', 's-lich-cyclus'], ['s-inzicht', 's-lich-spieren'], ['s-inzicht', 's-nutrition'], ['s-profiel', 's-lich-metingen']]) {
        await page.evaluate(function (p) { go(p[0]); go(p[1]); }, paar);
        const op = await actief();
        await terug(paar[1]);
        eq([op, await actief()], [paar[1], paar[0]], 'I6 ' + paar[0] + ' → ' + paar[1] + ' → terug komt weer uit op ' + paar[0]);
      }
      await page.evaluate(function () { go('s-lich-gegevens'); tkNavStack = []; });
      await terug('s-lich-gegevens');
      eq(await actief(), 's-profiel', 'I7 Gegevens & koppelingen zonder voorgeschiedenis: terug naar Profiel');
      await page.evaluate(function () { go('s-lich-spieren'); tkNavStack = []; });
      await terug('s-lich-spieren');
      eq(await actief(), 's-inzicht', 'I8 spiergroepen zonder voorgeschiedenis: terug naar Inzicht');
      await page.evaluate(function () { go('s-inzicht'); });
      await page.waitForFunction(function () { return document.querySelectorAll('#lich-muslist .lich-mrow').length > 0; }, null, { timeout: 20000 });
      await page.evaluate(function () { document.querySelector('#inzicht-herstel .lich-anatfoot .lk').click(); });
      eq(await actief(), 's-lich-spieren', 'I9 "Bekijk alle spiergroepen" opent het bestaande spiergroepenscherm');
      // Geen heen-en-weer: lijst -> detail -> terug -> terug eindigt op Inzicht, niet weer op het detail.
      await page.evaluate(function () { openSpierDetail('Billen'); });
      const opDetail = await actief(); await terug('s-lich-spier'); const opLijst = await actief(); await terug('s-lich-spieren');
      eq([opDetail, opLijst, await actief()], ['s-lich-spier', 's-lich-spieren', 's-inzicht'], 'I9b spiergroepen → detail → terug → terug loopt terug tot Inzicht (geen lus)');
      await page.evaluate(function () { document.querySelector('#lich-muslist .lich-mrow').click(); });
      const viaRij = await actief(); await terug('s-lich-spier');
      eq([viaRij, await actief()], ['s-lich-spier', 's-inzicht'], 'I9c een spiergroeprij op Inzicht opent het detail; terug komt weer op Inzicht uit');
      const fouten = errs.filter(function (e) { return !/fetch|CORS|NetworkError/i.test(e); });
      ok(fouten.length === 0, 'I10 geen JavaScript-fouten in de routes: ' + JSON.stringify(fouten));
      await page.close();
    }
    await browser.close();
  }

  console.log('fInzichtHerstelBelasting: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
