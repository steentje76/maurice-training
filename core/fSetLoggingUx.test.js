/* core/fSetLoggingUx.test.js
 *
 * UX-LOG-01 — SETREGISTRATIE MOBIEL BRUIKBAAR, BEWERKINGEN BLIJVEN STAAN, GEEN ONBEDOELD VERLATEN.
 *
 * Gebruikerstestbevindingen (v4.70.25):
 *  1. De 1RM-schatting ("1RM ≈ 79 kg") stond als extra flex-item IN de setrij; de inline
 *     `grid-column` werkte niet in flex. Op 320-360 px werden kg en reps ~6 px breed.
 *  2. Een bewerking na afvinken wiste done/rest_sec/isAmrap (logSet verving het hele object).
 *  3. Oefening toevoegen/verwijderen/vervangen bouwde het scherm opnieuw op zonder de ingevulde
 *     sets terug te zetten; de velden leken leeg en de volgende bewerking overschreef de data.
 *  4. Guided: elke set kreeg bij opslaan het láátste gewicht van de oefening.
 *  5. Een tik op Samen/Inzicht/Coach of een terugveeg haalde de sporter zonder vraag uit de
 *     training; terug via Trainen liep de klok niet meer.
 *  6. Profielknoppen in schermkoppen toonden een generiek icoon i.p.v. de avatar; een losse
 *     👥-knop op Home lag over de kopknoppen.
 *
 * Deel 1 (altijd): bronbinding. Deel 2 (Chromium, anders SKIP): de echte trainingsflow op
 * 320/360/390/412 px. Rekenlogica (Epley, getEffectiveKg, normNumStr, PR) is niet gewijzigd.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

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

function deel1() {
  /* 1. 1RM-regel onder de invoer */
  const row = extractFn(HTML, 'buildWorkSetRow');
  ok(/<div class="setr-e1rm" id="e1rm-\$\{exId\}-\$\{i\}" aria-live="polite"><\/div>/.test(row), '1a e1RM-element zonder inline grid-column/padding (stond als flex-item in de rij)');
  ok(/\.tks-setcard \.set-row\.setr\{flex-wrap:wrap\}/.test(HTML) && /\.setr-e1rm\{flex:0 0 100%;order:9/.test(HTML) && /\.setr-e1rm:empty\{display:none\}/.test(HTML), '1b CSS: rij mag wrappen, e1RM volle breedte op eigen regel, leeg = geen ruimte');
  ok(/function updateSetE1RM\(exId,i,effKg,reps\)/.test(HTML) && /'1RM ≈ '\+epley1RM\(/.test(HTML), '1c de 1RM-tekst en Epley-berekening zelf zijn ongewijzigd');
  ok(/@media \(max-width:374px\)\{\s*\.ex-card \.tks-card\{margin-left:4px;margin-right:4px\}/.test(HTML), '1d smalle toestellen: minder kader, geen kleinere invoer');
  const rpe = extractFn(HTML, 'buildRpeStepper');
  ok(/class="rpe-btn rpe-up" aria-label="RPE verhogen"/.test(rpe) && /class="rpe-btn rpe-down" aria-label="RPE verlagen"/.test(rpe), '1e RPE-knoppen hebben een toegankelijke naam');
  ok(/\.setr-cell-rpe \.rpe-up::after\{top:-10px;bottom:0\}/.test(HTML), '1f RPE-knoppen: groter raakvlak zonder layoutwijziging');
  /* 2. logSet behoudt vlaggen */
  const log = extractFn(HTML, 'logSet');
  ok(/sessionLog\[exId\]\.sets\[setNum-1\]=Object\.assign\(\{\},_oud\(sessionLog\[exId\]\.sets\),\{kg,reps,rpe,effKg\}\)/.test(log), '2a logSet vervangt alleen de invoerwaarden van een werkset');
  ok(/sessionLog\[exId\]\.wu\[setNum-1\]=Object\.assign\(\{\},_oud\(sessionLog\[exId\]\.wu\),\{kg,reps\}\)/.test(log), '2b idem voor warming-upsets');
  ok(/const effKg=isWork\?getEffectiveKg\(exId,setNum\):\(numNL\(kg\)\|\|null\)/.test(log) && /normNumStr\(document\.getElementById\(pfx\+'-'\+exId\+'-'\+setNum\+'-kg'\)/.test(log), '2c normalisatie en effectief gewicht ongewijzigd');
  /* 3. opnieuw opbouwen herstelt de ingevulde sets */
  ['removeExSession', 'addExConfirm', 'execRemoveExercise', 'execReplaceExercise'].forEach(function (f) {
    const s = extractFn(HTML, f);
    ok(/rerenderTrainScreenKeepLog\(/.test(s) && !/[^p]renderTrainScreen\(/.test(s.replace(/rerenderTrainScreenKeepLog/g, '')), '3 ' + f + '() bouwt opnieuw op via rerenderTrainScreenKeepLog()');
  });
  ok(/async function rerenderTrainScreenKeepLog\(t\)\{\s*await renderTrainScreen\(t\);\s*try\{ restoreSessionLogToDom\(t\);/.test(HTML), '3b de helper hergebruikt restoreSessionLogToDom() (hervat-pad), geen tweede herstelroute');
  /* 4. Guided per set */
  ok(/c\.setsDone\.push\(\{feel:f\.k,rpe:f\.rpe,reps:reps,kg:\(c\.weight!=null\?c\.weight:null\),at:Date\.now\(\)\}\)/.test(HTML), '4a Guided legt het gewicht per set vast');
  ok(/kg:\(sd\.kg!=null\?sd\.kg:\(it\.weight!=null\?it\.weight:null\)\)/.test(HTML), '4b Guided slaat per set dat gewicht op, met terugval voor oudere actieve sessies');
  /* 5. navigatie */
  ok(/onclick="tkPrimaryNavGo\(\\''\+doel\+'\\'\)"/.test(extractFn(HTML, 'tkPrimaryNavHtml')), '5a de hoofdnavigatie loopt via tkPrimaryNavGo()');
  const sb = { window: {}, GW: null };
  vm.createContext(sb); vm.runInContext('var curT=null;' + (/function tkTrainScreenIdVoor\(/.test(HTML) ? extractFn(HTML, 'tkTrainScreenIdVoor') : '') + extractFn(HTML, 'tkTrainingLooptOp'), sb); /* UX-EXEC-01: schermnaam via tkTrainScreenIdVoor */
  eq([sb.tkTrainingLooptOp('s-train-a'), sb.tkTrainingLooptOp(null)], [false, false], '5b zonder lopende training: geen vraag');
  vm.runInContext("curT='A';", sb);
  eq([sb.tkTrainingLooptOp('s-train-a'), sb.tkTrainingLooptOp('s-home'), sb.tkTrainingLooptOp('s-train-b')], [true, false, false], '5c alleen op het scherm van de lopende training');
  sb.window.GW = sb.GW = { hasActive: function () { return true; } };
  ok(sb.tkTrainingLooptOp('s-guided'), '5d een actieve begeleide training telt ook');
  ok(/if\(!tkNavGuardDoorlaten&&actief&&tkNavStack\.length&&typeof tkTrainingLooptOp==='function'&&tkTrainingLooptOp\(actief\.id\)\)/.test(HTML), '5e terugveeg tijdens een training vraagt eerst');
  ok(/if\(typeof curT!=='undefined'&&curT&&!trainPaused&&trainStart&&id===(tkTrainScreenIdVoor\(curT\)|'s-train-'\+String\(curT\)\.toLowerCase\(\))\)startTrainTimer\(curT\);/.test(extractFn(HTML, 'go')), '5f terug op de training loopt de klok door (niet bij pauze)');
  ok(!/confirm\(|alert\(|prompt\(/.test(extractFn(HTML, 'tkPrimaryNavGo')), '5g geen native dialoog');
  /* 6. avatar */
  eq((HTML.match(/data-tk-avatar onclick="go\('s-profiel'\)"/g) || []).length, 4, '6a de vier profielknoppen in schermkoppen zijn gemarkeerd voor de avatar');
  ok(!/aria-label="Naar Sociaal"/.test(HTML), '6b de losse 👥-knop op Home (dubbel met Samen) is weg');
  /* 7. Logboek-editor en setadvies */
  ok(/rpe:d\.rpe,perSet:true\}:null;/.test(HTML) && /prefill&&\(i===1\|\|prefill\.perSet\)\?prefill\.rpe:''/.test(HTML), '7a Logboek-editor: RPE per set; tijdens de training blijft alleen set 1 voorgevuld (cascade ongewijzigd)');
  ok(/if\(addRow&&addRow\.parentNode\)addRow\.parentNode\.insertBefore\(div,addRow\);else body\.appendChild\(div\);/.test(extractFn(HTML, 'showPostSetAdvice')), '7b setadvies wordt naast de bestaande toevoeg-rij geplaatst zonder NotFoundError');
}

let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

async function deel2() {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) { console.log('fSetLoggingUx: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)'); return; }
  const url = 'file://' + path.join(ROOT, 'index.html');
  const start = async function (w) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    const errs = []; page.on('pageerror', function (e) { errs.push(e.message); });
    await page.goto(url); await page.waitForTimeout(500);
    await page.evaluate(async function () {
      const seed = TRAIN_CFG_SEED.A.slice(1, 4);
      const exRows = seed.map(function (e) { return { id: e.id, name: e.naam, type: e.type, active: true, muscle_primary: e.muscles.p, muscle_secondary: e.muscles.s, scope: 'global' }; });
      exRows.push({ id: 'rdl', name: 'RDL', type: 'strength', active: true, muscle_primary: ['Hamstrings'], muscle_secondary: [], scope: 'global' });
      const teRows = seed.map(function (e, i) { return { id: 'A_' + e.id, exercise_id: e.id, training_ref: 'A', sort_order: i, sets: e.sets, reps: e.reps, rpe: e.rpe, wu: e.wu, tip: e.tip }; });
      window.__t = { exercises: exRows, training_exercises: teRows };
      window.sbGet = async function (t) { return window.__t[t] ? JSON.parse(JSON.stringify(window.__t[t])) : []; };
      window.sbUpsert = async function () { return true; }; window.sbPost = async function () { return true; }; window.sbPatch = async function () { return true; };
      window.fetchWearableStatus = async function () { return { connected: false }; };
      atleet = { naam: 'Maurice Test' };
      exercises = exRows; await loadTrainCfg(); go('s-home'); await startT('A');
      await new Promise(function (r) { setTimeout(r, 300); });
      const set = function (id, v) { const e = document.getElementById(id); e.focus(); e.value = v; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')); };
      set('s-backsquat-1-kg', '102,5'); set('s-backsquat-1-reps', '8');
    });
    page.__errs = errs;
    return page;
  };
  for (const w of [320, 360, 390, 412]) {
    const tag = w + 'px ';
    const page = await start(w);
    /* A. Lay-out van de setrij */
    const l = await page.evaluate(function () {
      const row = document.getElementById('sr-backsquat-1'); row.scrollIntoView({ block: 'center' });
      const B = function (e) { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
      const kg = document.getElementById('s-backsquat-1-kg'), reps = document.getElementById('s-backsquat-1-reps'), e1 = document.getElementById('e1rm-backsquat-1');
      const cells = row.querySelector('.setr-cells'), side = row.querySelector('.setr-side'), up = row.querySelector('.rpe-up'), rb = B(row);
      const ub = up.getBoundingClientRect();
      const raak = document.elementFromPoint(ub.left + ub.width / 2, ub.top - 6);
      return { kg: B(kg), reps: B(reps), e1: B(e1), e1t: e1.textContent, cells: B(cells), side: B(side), row: rb, kgPast: kg.scrollWidth <= kg.clientWidth + 1, kgVal: kg.value,
        raakUp: !!(raak && raak.closest && raak.closest('.rpe-up')), pagina: document.querySelector('.scr.active').scrollWidth > document.querySelector('.scr.active').clientWidth + 1 };
    });
    ok(l.e1t === '1RM ≈ 130 kg', tag + 'A0 de 1RM-schatting staat er, ongewijzigd berekend (Epley 102,5 × 8): ' + l.e1t);
    ok(l.kg.w >= 56 && l.reps.w >= 56, tag + 'A1 kg en reps blijven bruikbaar breed (≥ 56 px): ' + Math.round(l.kg.w) + ' / ' + Math.round(l.reps.w));
    ok(l.kgPast && l.kgVal === '102.5', tag + 'A2 "102.5" past volledig in het kg-veld (komma genormaliseerd zoals voorheen)');
    ok(l.e1.t >= l.cells.b - 0.5 && l.e1.l >= l.row.l && l.e1.r <= l.row.r + 0.5, tag + 'A3 de 1RM-regel staat onder de invoer, binnen de kaart');
    ok(l.side.r <= l.row.r + 0.5 && l.cells.r <= l.side.l + 0.5, tag + 'A4 geen overlap tussen invoer en afvinkring');
    ok(l.raakUp, tag + 'A5 tik net boven "+" raakt nog de RPE-knop (groter raakvlak)');
    ok(!l.pagina, tag + 'A6 geen horizontaal scrollen');
    /* B. Bewerken na afvinken */
    const b = await page.evaluate(async function () {
      toggleSetDone('backsquat', 1); toggleAmrapSet('backsquat', 1);
      const e = document.getElementById('s-backsquat-1-reps'); e.value = '9'; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change'));
      adjustRpe('backsquat', 1, 0.5);
      const s = sessionLog.backsquat.sets[0];
      return { done: s.done, amrap: s.isAmrap, reps: s.reps, kg: s.kg, rpe: s.rpe, rest: ('rest_sec' in s), advies: !!document.getElementById('advice-backsquat') };
    });
    eq([b.done, b.amrap, b.reps, b.kg, b.rest], [true, true, '9', '102.5', true], tag + 'B1 na afvinken + AMRAP blijven done/isAmrap/rest_sec staan bij het aanpassen van reps');
    ok(b.rpe !== '' && b.rpe != null, tag + 'B2 RPE via de stepper wordt opgeslagen: ' + b.rpe);
    ok(b.advies, tag + 'B3 na afvinken + RPE aanpassen verschijnt het setadvies (insertBefore-fout opgelost)');
    /* C. Oefening toevoegen: overige oefeningen behouden hun ingevulde sets */
    const c = await page.evaluate(async function () {
      await addExConfirm('rdl', 'A'); await new Promise(function (r) { setTimeout(r, 400); });
      return { kg: document.getElementById('s-backsquat-1-kg').value, reps: document.getElementById('s-backsquat-1-reps').value,
        done: !!document.querySelector('#sc-backsquat-1.done'), chip: !!document.querySelector('#amrapchip-backsquat-1.sel'), log: sessionLog.backsquat.sets[0].reps,
        nieuw: !!document.getElementById('s-rdl-1-kg') };
    });
    eq([c.kg, c.reps, c.done, c.log, c.nieuw], ['102.5', '9', true, '9', true], tag + 'C1 na "oefening toevoegen" staan kg/reps/afgevinkt nog in beeld (was leeg) en de nieuwe oefening is er');
    ok(c.chip, tag + 'C2 de AMRAP-markering is na opnieuw opbouwen nog zichtbaar');
    const c2 = await page.evaluate(async function () {
      const e = document.getElementById('s-backsquat-1-kg'); e.value = '105'; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change'));
      return sessionLog.backsquat.sets[0];
    });
    eq([c2.kg, c2.reps, c2.done], ['105', '9', true], tag + 'C3 een bewerking daarna overschrijft de reps niet met een leeg veld');
    /* D. Navigatie tijdens de training */
    const d1 = await page.evaluate(async function () {
      tkPaintBnav('s-train-a');
      const knop = Array.from(document.querySelectorAll('.scr.active nav.bnav .ni')).find(function (x) { return /Samen/.test(x.textContent); });
      knop.click(); await new Promise(function (r) { setTimeout(r, 250); });
      const dlg = document.querySelector('.tk-confirm-bg'); const tekst = dlg ? dlg.textContent : null;
      if (dlg) dlg.querySelector('.tk-confirm-cancel').click(); await new Promise(function (r) { setTimeout(r, 250); });
      return { tekst: tekst, scherm: document.querySelector('.scr.active').id, klok: !!trainInterval };
    });
    ok(/Training verlaten\?/.test(d1.tekst || '') && /blijft bewaard/.test(d1.tekst || ''), tag + 'D1 tik op Samen tijdens de training vraagt eerst');
    eq([d1.scherm, d1.klok], ['s-train-a', true], tag + 'D2 "Bij training blijven": je blijft op de training en de klok loopt');
    const d2 = await page.evaluate(async function () {
      const knop = Array.from(document.querySelectorAll('.scr.active nav.bnav .ni')).find(function (x) { return /Samen/.test(x.textContent); });
      knop.click(); await new Promise(function (r) { setTimeout(r, 250); });
      document.querySelector('.tk-confirm-bg .tk-confirm-ok').click(); await new Promise(function (r) { setTimeout(r, 400); });
      const opSamen = document.querySelector('.scr.active').id, avatar = (document.querySelector('#s-social button[data-tk-avatar]') || {}).textContent;
      const tr = Array.from(document.querySelectorAll('.scr.active nav.bnav .ni')).find(function (x) { return /Trainen/.test(x.textContent); });
      tr.click(); await new Promise(function (r) { setTimeout(r, 300); });
      return { opSamen: opSamen, avatar: avatar, terug: document.querySelector('.scr.active').id, klok: !!trainInterval, dialoog: !!document.querySelector('.tk-confirm-bg'),
        kg: document.getElementById('s-backsquat-1-kg').value, log: sessionLog.backsquat.sets[0].kg };
    });
    eq([d2.opSamen, d2.terug, d2.dialoog], ['s-social', 's-train-a', false], tag + 'D3 "Toch openen" gaat naar Samen; terug via Trainen zonder extra vraag');
    ok(d2.klok, tag + 'D4 terug op de training loopt de klok (en wakelock) weer');
    eq([d2.kg, d2.log], ['105', '105'], tag + 'D5 geen gegevensverlies door het heen-en-weer');
    ok(/MT/.test(d2.avatar || ''), tag + 'D6 de profielknop op Samen toont de avatar (initialen): ' + JSON.stringify(d2.avatar));
    const d3 = await page.evaluate(async function () {
      tkNavStack.push('s-home'); window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(function (r) { setTimeout(r, 250); });
      const dlg = !!document.querySelector('.tk-confirm-bg');
      if (dlg) document.querySelector('.tk-confirm-bg .tk-confirm-cancel').click();
      await new Promise(function (r) { setTimeout(r, 250); });
      return { dlg: dlg, scherm: document.querySelector('.scr.active').id };
    });
    eq([d3.dlg, d3.scherm], [true, 's-train-a'], tag + 'D7 terugveeg tijdens de training vraagt eerst; annuleren laat je op de training');
    const d4 = await page.evaluate(async function () {
      go('s-home'); await new Promise(function (r) { setTimeout(r, 300); });
      return { sociaal: !!document.querySelector('#s-home [aria-label="Naar Sociaal"]') };
    });
    ok(!d4.sociaal, tag + 'D8 geen losse 👥-knop meer op Home');
    /* E. Logboek-editor */
    const e = await page.evaluate(async function () {
      openEditSess('x1', 'Backsquat', { exercise_id: 'backsquat', date: '2026-10-17', sets: 3, reps: 5, weight: 100, rpe: 8,
        sets_detail: [{ kg: 100, reps: 5, rpe: 8 }, { kg: 100, reps: 5, rpe: 8.5 }, { kg: 102.5, reps: 4, rpe: 9 }] });
      await new Promise(function (r) { setTimeout(r, 300); });
      const r1 = document.getElementById('sr-es-1').getBoundingClientRect(), kg = document.getElementById('s-es-1-kg').getBoundingClientRect(), rp = document.getElementById('s-es-1-rpe').getBoundingClientRect();
      const knoppen = Array.from(document.querySelectorAll('.es-acties .btn')).map(function (x) { const b = x.getBoundingClientRect(); return b.right <= innerWidth + 0.5 && x.scrollWidth <= x.clientWidth + 1; });
      const res = collectWorkSets('es').map(function (x) { return [x.kg, x.reps, x.rpe]; });
      closeModal('m-edit-session');
      return { horizontaal: Math.abs(kg.top - rp.top) < 30 && r1.height < 120, kgW: kg.width, knoppen: knoppen, res: res };
    });
    eq(e.res, [['100', '5', '8'], ['100', '5', '8.5'], ['102.5', '4', '9']], tag + 'E1 Logboek-editor: elke set houdt zijn eigen RPE; opslaan leest ze ongewijzigd terug (was leeg voor set 2..n)');
    ok(e.horizontaal && e.kgW >= 56, tag + 'E2 editor-setrij staat horizontaal zoals tijdens de training: kg ' + Math.round(e.kgW) + ' px');
    ok(e.knoppen.length === 3 && e.knoppen.every(Boolean), tag + 'E3 Verwijder/Annuleer/Opslaan passen binnen het scherm: ' + JSON.stringify(e.knoppen));
    ok(page.__errs.filter(function (e) { return !/fetch|CORS|NetworkError|Failed to load/i.test(e); }).length === 0, tag + 'D9 geen JavaScript-fouten: ' + page.__errs.join(' | '));
    await page.close();
  }
  await browser.close();
}

(async function () {
  try { deel1(); await deel2(); }
  catch (e) { fail++; msgs.push('onverwachte fout: ' + (e && e.stack || e)); }
  console.log('fSetLoggingUx: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
