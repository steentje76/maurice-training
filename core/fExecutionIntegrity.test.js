/* core/fExecutionIntegrity.test.js — UX-EXEC-01
 *
 * Builder → Mijn trainingen → Preview → uitvoering → afronden → historie: alleen de in de
 * reality-audit van 18 oktober 2026 aantoonbaar gevonden gaten.
 *  N   Tab Trainen tijdens een eigen of programmatraining leidde naar een niet-bestaand scherm.
 *  B9  Een hervatte vaste training (via Preview) verloor haar oefeningenlijst; sets van
 *      ingewisselde oefeningen werden bij afronden niet weggeschreven.
 *  B12 Opnieuw afronden na een herstart kon een tweede sessierij geven (geen vaste rij-id).
 *  B4  custom_trainings was niet idempotent: replay na verloren antwoord bleef op 409 hangen.
 *  B1  Handmatig aangemaakte training (offline of mislukte write) verdween bij de volgende sync.
 *  B2  Een offline verwijderde training kwam bij de volgende sync terug.
 *  B3  "Permanent toevoegen" aan een Builder-training wiste sets/reps/rpe/rust/pick.
 *  B7  Preview van een lopende training koppelde de sessie stil aan een nieuwe instance.
 *  B10 startCustomTraining zette de pauzestand niet terug.
 * Deel 1 (altijd): bronbinding + pure functies. Deel 2 (Chromium, anders SKIP): echte flows.
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
  /* N */
  const sb = {}; vm.createContext(sb); vm.runInContext(extractFn(HTML, 'tkTrainScreenIdVoor'), sb);
  eq(['A', 'B', 'custom_custom_1700', 'custom_wb-AbC', 'prog_42', null].map(sb.tkTrainScreenIdVoor), ['s-train-a', 's-train-b', 's-train-custom-custom_1700', 's-train-custom-wb-AbC', 's-train-prog-42', null], 'N1 schermnaam per soort training (custom-id niet in kleine letters)');
  ok(!/'s-train-'\+(String\()?curT\)?\.toLowerCase\(\)/.test(HTML.split('\n').filter(function (r) { return !/^\s*\/\//.test(r); }).join('\n')), 'N2 nergens meer de vaste-training-formule voor het trainingsscherm');
  ok(/target:function\(\)\{ return \(typeof curT!=='undefined'&&curT\)\?tkTrainScreenIdVoor\(curT\):'s-train-mgr'; \}/.test(HTML), 'N3 tab Trainen gebruikt de canonieke schermnaam');
  ok(/scherm===tkTrainScreenIdVoor\(curT\)/.test(extractFn(HTML, 'tkTrainingLooptOp')) && /id===tkTrainScreenIdVoor\(curT\)\)startTrainTimer\(curT\)/.test(extractFn(HTML, 'go')), 'N4 navigatiebewaking en klokhervatting gelden ook voor eigen en programmatrainingen');
  /* B9 */
  const pd = extractFn(HTML, 'persistTrainingDraft');
  ok(/resolvedWorkout:\(typeof resolvedWorkout!=='undefined'&&resolvedWorkout&&resolvedWorkout\.t===curT\)\?resolvedWorkout:null/.test(pd), 'B9a het concept bewaart de Preview-oefeningenlijst van deze training');
  ok(/if\(draft\.resolvedWorkout&&draft\.resolvedWorkout\.t===t&&Array\.isArray\(draft\.resolvedWorkout\.items\)\)resolvedWorkout=draft\.resolvedWorkout;/.test(extractFn(HTML, 'startT')), 'B9b hervatten zet die lijst terug');
  /* B12 */
  const fsn = extractFn(HTML, 'finishSession');
  ok(/\.\.\.cRow,id:tkSessieRijId\(l\)\}/.test(fsn) && /row\.id=tkSessieRijId\(l\); const _wOkS=await writeSessionRow/.test(fsn), 'B12a beide sessierij-writes krijgen een vaste id per oefening');
  eq((fsn.match(/l\._sessionRowPersistedAt=Date\.now\(\); try\{persistTrainingDraft\(true\);\}catch\(_\)\{\}/g) || []).length, 2, 'B12b na een geslaagde write staat de markering direct in het concept');
  const sb2 = { calls: 0, n: 0 }; vm.createContext(sb2);
  vm.runInContext('function newClientRowId(){ n++; return "id-"+n; } function persistTrainingDraft(){ calls++; }' + extractFn(HTML, 'tkSessieRijId'), sb2);
  const l = {}; const a = sb2.tkSessieRijId(l), b = sb2.tkSessieRijId(l);
  eq([a, b, sb2.calls], ['id-1', 'id-1', 1], 'B12c dezelfde oefening houdt dezelfde id; het concept wordt vóór de write bijgewerkt');
  /* B4 */
  ok(/custom_trainings: true \};/.test(HTML) && !/TK_IDEMPOTENT_ZONDER_UPDATE = \{[^}]*custom_trainings/.test(HTML), 'B4 custom_trainings is idempotent met merge-duplicates (UPDATE-policy v333)');
  /* B1/B3 */
  ok(/async function pushCustomTrainingExercises\(t\)\{\s*return pushCustomTrainingExercisesRich\(Object\.assign\(\{\},t,\{exercise_targets:tkTrainingOefendoelen\(t\)\}\)\);\s*\}/.test(HTML), 'B1a de handmatige oefeningenroute gebruikt de wachtrij-veilige Builder-route');
  ok(/tkCustomTrainingPost\(\{id,naam:name/.test(extractFn(HTML, 'saveNewTraining')) && !/sbPost\('custom_trainings'/.test(extractFn(HTML, 'saveNewTraining')), 'B1b nieuwe training via tkCustomTrainingPost (markering + wachtrij)');
  ok(/tkCustomTrainingPost\(\{id:t\.id/.test(extractFn(HTML, 'saveAsTrainingAndFinish')), 'B1c "opslaan als training" ook');
  ok(/ct\.exercise_targets\.push\(\{exercise_id:e\.id/.test(extractFn(HTML, 'permanentlyAddExtras')), 'B3 permanent toevoegen vult ook exercise_targets aan');
  /* B2 */
  const del = extractFn(HTML, 'deleteCustomTraining');
  ok(/await sbDelQ\('custom_trainings','id=eq\.'\+id,\{detail:true\}\)/.test(del) && /customTrainings=_vorige/.test(del), 'B2a verwijderen via de wachtrij; lukt ook dat niet, dan komt de training lokaal terug');
  ok(/i\.table==='custom_trainings'&&i\.method==='DELETE'/.test(extractFn(HTML, 'syncCustomTrainingsFromSupabase')), 'B2b de sync slaat een wachtende verwijdering over');
  /* B7/B10 */
  ok(/if\(mode!=='guided'&&typeof curT!=='undefined'&&curT&&curT===_lopend\)\{/.test(extractFn(HTML, 'previewStartTraining')), 'B7 Preview van een lopende training: terug naar die training, geen nieuwe instance');
  const sc = extractFn(HTML, 'startCustomTraining');
  ok(/trainPaused=false;pausedAccumMs=0;lastSetDoneAt=\{\};/.test(sc), 'B10 startCustomTraining zet de pauzestand terug');
  ok(/if\(curT===ctxT&&document\.getElementById\('s-train-custom-'\+id\)\)\{/.test(sc) && /if\(!resolvedItems&&curT!=='custom_'\+id\)activeInstanceId=null;/.test(sc), 'B10b een lopende eigen training wordt niet geleegd en houdt haar instance');
}

let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

async function deel2() {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) { console.log('fExecutionIntegrity: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)'); return; }
  const url = 'file://' + path.join(ROOT, 'index.html');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', function (e) { errs.push(e.message); });
  const opzet = async function () {
    await page.evaluate(async function () {
      const seed = TRAIN_CFG_SEED.A.slice(1, 4);
      const exRows = seed.map(function (e) { return { id: e.id, name: e.naam, type: e.type, active: true, muscle_primary: e.muscles.p, muscle_secondary: e.muscles.s, scope: 'global' }; });
      exRows.push({ id: 'rdl', name: 'RDL', type: 'strength', active: true, muscle_primary: ['Hamstrings'], muscle_secondary: [], scope: 'global' });
      const teRows = seed.map(function (e, i) { return { id: 'A_' + e.id, exercise_id: e.id, training_ref: 'A', sort_order: i, sets: e.sets, reps: e.reps, rpe: e.rpe, wu: e.wu, tip: e.tip }; });
      window.__t = { exercises: exRows, training_exercises: teRows, custom_trainings: [{ id: 'srv1', naam: 'Server training', kleur: '#111', sort_order: 0 }], custom_training_exercises: [] };
      window.sbGet = async function (t) { return window.__t[t] ? JSON.parse(JSON.stringify(window.__t[t])) : []; };
      window.sbUpsert = async function () { return true; };
      window.fetchWearableStatus = async function () { return { connected: false }; };
      authSession = { access_token: 'x', user: { id: '00000000-0000-0000-0000-0000000000aa', email: 't@t' }, expires_at: Date.now() + 3600e3 };
      exercises = exRows; await loadTrainCfg();
    });
  };
  await page.goto(url); await page.waitForTimeout(500); await opzet();

  /* B1 + B2: offline aanmaken en verwijderen, daarna sync */
  await ctx.setOffline(true);
  const b1 = await page.evaluate(async function () {
    customTrainings = []; localStorage.setItem('tk_trainings', '[]');
    document.getElementById('nt-name').value = 'Offline training'; saveNewTraining();
    await new Promise(function (r) { setTimeout(r, 400); });
    const nieuw = customTrainings.find(function (t) { return t.name === 'Offline training'; });
    const q = await offlineQueueAll();
    await syncCustomTrainingsFromSupabase();
    const naSync = customTrainings.map(function (t) { return t.id; });
    return { id: nieuw && nieuw.id, onbevestigd: tkTrainingenOnbevestigd(), queue: q.map(function (i) { return i.table + ':' + i.method; }), naSync: naSync };
  });
  ok(b1.id && b1.onbevestigd.indexOf(b1.id) >= 0, 'B1-1 offline aangemaakte training is gemarkeerd als nog niet bevestigd');
  ok(b1.queue.indexOf('custom_trainings:POST') >= 0, 'B1-2 de training-rij staat in de wachtrij: ' + JSON.stringify(b1.queue));
  ok(b1.naSync.indexOf(b1.id) >= 0 && b1.naSync.indexOf('srv1') >= 0, 'B1-3 na een sync met een andere serverlijst is de training er nog: ' + JSON.stringify(b1.naSync));
  const b2 = await page.evaluate(async function () {
    customTrainings.push({ id: 'srv1', name: 'Server training', color: '#111', note: '', exercises: [] });
    localStorage.setItem('tk_trainings', JSON.stringify(customTrainings));
    const p = deleteCustomTraining('srv1'); await new Promise(function (r) { setTimeout(r, 200); });
    const knop = document.querySelector('.tk-confirm-bg .tk-confirm-ok'); if (knop) knop.click(); await p;
    const q = await offlineQueueAll();
    await syncCustomTrainingsFromSupabase();
    return { queue: q.filter(function (i) { return i.table === 'custom_trainings' && i.method === 'DELETE'; }).length, naSync: customTrainings.map(function (t) { return t.id; }) };
  });
  eq(b2.queue, 1, 'B2-1 offline verwijderen staat als DELETE in de wachtrij');
  ok(b2.naSync.indexOf('srv1') < 0, 'B2-2 de verwijderde training komt bij de sync niet terug: ' + JSON.stringify(b2.naSync));
  await ctx.setOffline(false);
  await page.evaluate(async function () { const db = await offlineDb(); await new Promise(function (r) { const tx = db.transaction(OFFLINE_STORE, 'readwrite'); tx.objectStore(OFFLINE_STORE).clear(); tx.oncomplete = r; }); });

  /* N + B10 + B7: eigen training starten, tab Trainen, preview van de lopende training */
  const n = await page.evaluate(async function () {
    const t = customTrainings.find(function (x) { return x.name === 'Offline training'; });
    t.exercises = ['backsquat']; localStorage.setItem('tk_trainings', JSON.stringify(customTrainings));
    trainPaused = true; pausedAccumMs = 999999;
    await startCustomTraining(t.id); await new Promise(function (r) { setTimeout(r, 300); });
    const scherm = document.querySelector('.scr.active').id, pauze = [trainPaused, pausedAccumMs];
    const e = document.getElementById('s-backsquat-1-kg'); e.value = '80'; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change'));
    activeInstanceId = 'inst-lopend';
    go('s-home'); await new Promise(function (r) { setTimeout(r, 200); });
    tkPaintBnav('s-home');
    const tr = Array.from(document.querySelectorAll('.scr.active nav.bnav .ni')).find(function (x) { return /Trainen/.test(x.textContent); });
    tr.click(); await new Promise(function (r) { setTimeout(r, 300); });
    const terug = document.querySelector('.scr.active').id, klok = !!trainInterval;
    await startCustomTraining(t.id); await new Promise(function (r) { setTimeout(r, 200); });
    return { id: t.id, scherm: scherm, pauze: pauze, terug: terug, klok: klok, kg: sessionLog.backsquat && sessionLog.backsquat.sets[0].kg, inst: activeInstanceId };
  });
  eq(n.scherm, 's-train-custom-' + n.id, 'N5 eigen training opent op haar scherm');
  eq(n.pauze, [false, 0], 'B10-1 een oude pauzestand loopt niet mee in een nieuwe eigen training');
  eq([n.terug, n.klok], ['s-train-custom-' + n.id, true], 'N6 tab Trainen tijdens een eigen training gaat naar die training (was leeg scherm) en de klok loopt');
  eq([n.kg, n.inst], ['80', 'inst-lopend'], 'B10-2 de lopende eigen training opnieuw openen leegt niets en houdt haar instance');

  /* B9 + B12: vaste training met Preview-lijst, herstart, hervatten */
  const b9a = await page.evaluate(async function () {
    curT = null; sessionLog = {}; sessionExtra = []; clearTrainingDraft();
    resolvedWorkout = { t: 'A', items: [{ id: 'rdl', naam: 'RDL', type: 'strength', sets: 3, reps: '8', rpe: '7' }], instanceId: 'inst-A' };
    activeInstanceId = 'inst-A';
    await startT('A'); await new Promise(function (r) { setTimeout(r, 300); });
    const e = document.getElementById('s-rdl-1-kg'); e.value = '90'; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change'));
    const r2 = document.getElementById('s-rdl-1-reps'); r2.value = '8'; r2.dispatchEvent(new Event('input')); r2.dispatchEvent(new Event('change'));
    const rijId = tkSessieRijId(sessionLog.rdl);
    persistTrainingDraft(true);
    return { rijId: rijId, draft: JSON.parse(localStorage.getItem('tk_draft_training')) };
  });
  ok(b9a.draft.resolvedWorkout && b9a.draft.resolvedWorkout.items[0].id === 'rdl', 'B9-1 het concept bevat de Preview-lijst');
  eq(b9a.draft.sessionLog.rdl._sessionRowId, b9a.rijId, 'B12-1 de vaste rij-id staat in het concept');
  await page.reload(); await page.waitForTimeout(500); await opzet();
  const b9b = await page.evaluate(async function () {
    window._tkResumeIntent = 'A';
    await startT('A'); await new Promise(function (r) { setTimeout(r, 300); });
    const lijst = getSessionExs('A').map(function (x) { return x.id; });
    return { lijst: lijst, kg: (document.getElementById('s-rdl-1-kg') || {}).value, inst: activeInstanceId, rijId: sessionLog.rdl && sessionLog.rdl._sessionRowId, nogmaals: tkSessieRijId(sessionLog.rdl) };
  });
  eq([b9b.lijst, b9b.kg, b9b.inst], [['rdl'], '90', 'inst-A'], 'B9-2 na een herstart hervat de training met dezelfde oefeningen, sets en instance (was: TRAIN_CFG zonder RDL)');
  eq([b9b.rijId, b9b.nogmaals], [b9a.rijId, b9a.rijId], 'B12-2 na de herstart gebruikt opnieuw afronden dezelfde rij-id (geen tweede sessierij)');
  /* B7: Preview van de lopende training */
  const b7 = await page.evaluate(async function () {
    let nieuw = 0; const echt = window.startInstanceFromDefinition; window.startInstanceFromDefinition = async function () { nieuw++; return 'inst-nieuw'; };
    previewCtx = { def: { id: 'A', exercises: [] }, source: 'vast', id: 'A' }; previewStarting = false;
    await previewStartTraining('normal'); await new Promise(function (r) { setTimeout(r, 300); });
    window.startInstanceFromDefinition = echt;
    return { nieuw: nieuw, inst: activeInstanceId, lijst: getSessionExs('A').map(function (x) { return x.id; }), kg: sessionLog.rdl.sets[0].kg };
  });
  eq([b7.nieuw, b7.inst, b7.lijst, b7.kg], [0, 'inst-A', ['rdl'], '90'], 'B7 Preview van de lopende training maakt geen nieuwe instance en laat lijst en sets staan');
  ok(errs.filter(function (e) { return !/fetch|CORS|NetworkError|Failed to load|ERR_INTERNET/i.test(e); }).length === 0, 'D geen JavaScript-fouten: ' + errs.join(' | '));
  await browser.close();
}

(async function () {
  try { deel1(); await deel2(); }
  catch (e) { fail++; msgs.push('onverwachte fout: ' + (e && e.stack || e)); }
  console.log('fExecutionIntegrity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
