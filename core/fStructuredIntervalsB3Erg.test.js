/* fStructuredIntervalsB3Erg.test.js — STRUCTURED INTERVALS B3 (Erg): RowErg/BikeErg/SkiErg op de
 * canonieke keten Definition (1 erg-oefening + interval_prescription.v1) → Preview/instance-snapshot →
 * IntervalEngineCore → oefeningkaart-executie → sessions (exercise_id, training_instance_id,
 * intervals_detail = erg_intervals_actual.v1) → session-History planned-vs-actual.
 * Echte productiefuncties uit index.html + echte cores; stub-DB levert alleen rijen.
 *
 * Draai: node core/fStructuredIntervalsB3Erg.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const IntervalEngineCore = require(path.join(ROOT, 'core/intervalEngine.js'));
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
const DecisionCore = require(path.join(ROOT, 'core/decision.js'));
let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(a === b, l + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
function extractFn(name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = re.exec(html); if (!m) return null;
  let i = html.indexOf('{', m.index), d = 0;
  for (let j = i; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (d === 0) return html.slice(m.index, j + 1); } }
  return null;
}
const FNS = ['tkErgSportForExercise', 'tkErgDefinitionValid', 'saveIntervalWorkout', 'ivRaw', 'ivFromRaw', 'snapshotFromCustomTraining', 'startInstanceFromDefinition',
  'startIntervalExecution', 'advanceIntervalBlock', 'tkErgCloseBlockActual', 'finishIntervalExecution', 'buildIntervalPrescriptionFromForm',
  'renderErgSessionStructuredHtml', 'tkErgActualText', 'structuredBlockLabel', 'tkIvTerminationText', 'tkIvTargetText'];
const SRC = {}; FNS.forEach((n) => { SRC[n] = extractFn(n); ok(SRC[n], 'functie gevonden: ' + n); });
const CONST = (html.match(/const TK_IV_BLOCK_LABEL=\{[^\n]*\n/) || [''])[0] + (html.match(/const TK_IV_SPORT_LABEL=\{[^\n]*\n/) || [''])[0]
  + (html.match(/const TK_ERG_SPORTS=\[[^\]]*\];\r?\n/) || [''])[0] + (html.match(/const TK_ERG_EXERCISE_ID=\{[^\n]*\n/) || [''])[0]
  + (html.match(/const TK_ERG_INTERVALS_VERSION='[^']*';\r?\n/) || [''])[0]
  + (html.match(/const CARDIO_TYPE_BY_ID = \{[^\n]*\n/) || [''])[0];
ok(/TK_ERG_SPORTS/.test(CONST) && /TK_ERG_EXERCISE_ID/.test(CONST) && /CARDIO_TYPE_BY_ID/.test(CONST), 'B3-constanten gevonden');
const PREVIEW_START = extractFn('previewStartTraining'), FINISH_SESSION_WRITE = (html.match(/await writeSessionRow\(\{date:today,exercise_id:ex\.id[^\n]*/) || [''])[0];
const ERGS = [['rowing', 'roeien', 'RowErg'], ['bikeerg', 'bikeerg', 'BikeErg'], ['skierg', 'skierg', 'SkiErg']];
const T0 = 1_800_000_000_000;

function sandbox() {
  const db = { custom_trainings: [], training_instances: [], sessions: [] };
  const toasts = [];
  const ctx = {
    IntervalEngineCore, CardioCore, DecisionCore, console, Math, JSON, Object, Array, String, Number, isFinite, isNaN, parseFloat, parseInt, encodeURIComponent, decodeURIComponent,
    Date: class extends Date { constructor(...a) { if (!a.length) super(ctx._now); else super(...a); } static now() { return ctx._now; } },
    _now: T0, _iv: null, _ivExec: null, _ivPrescr: {}, _tkErgPending: null, _ivTimerHandle: null,
    sessionLog: {}, customTrainings: [], lsSet: () => {}, pushCustomTrainingExercisesRich: () => {},
    toast: (t) => toasts.push(t), closeModal: () => {}, openModal: () => {}, escHtml: (x) => String(x),
    clearInterval: () => {}, setInterval: () => 1, document: { getElementById: () => null },
    renderIntervalExecBlock: () => {}, scheduleAutosave: () => {}, fmtMmSs: (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), onCardioFieldInput: () => {},
    sbPostQ: async (t, row) => { (db[t] = db[t] || []).push(row); return true; },
    sbPatchQ: async (t, q, patch) => { const id = /id=eq\.(.+)/.exec(q)[1]; const r = db.custom_trainings.find((x) => x.id === id); if (r) Object.assign(r, patch); return true; },
    sbGet: async (t, q) => { if (t === 'training_instances') { const m = /id=eq\.([^&]+)/.exec(q); return db.training_instances.filter((r) => r.id === decodeURIComponent(m[1])); } return []; },
    createTrainingInstance: async ({ customTrainingId, snapshot }) => { const id = 'inst-' + (db.training_instances.length + 1); db.training_instances.push({ id, custom_training_id: customTrainingId, snapshot: JSON.parse(JSON.stringify(snapshot)) }); return id; },
    _db: db, _toasts: toasts
  };
  vm.createContext(ctx);
  vm.runInContext(CONST + '\n' + FNS.map((n) => SRC[n]).join('\n'), ctx);
  return ctx;
}

(async () => {
  // ── 2: canonieke erg-identiteiten (uit de bestaande catalogus/aliasmap) ──
  const c0 = sandbox();
  ERGS.forEach(([sport, exId]) => eq(c0.tkErgSportForExercise(exId), sport, '2: canonieke oefening ' + exId + ' → sport ' + sport));
  eq(c0.tkErgSportForExercise('rowerg'), 'rowing', '2: alias rowerg → rowing (canonieke id blijft roeien)');
  eq(c0.tkErgSportForExercise('backsquat'), null, '2: niet-erg oefening → null');
  // ── 3: Definition-invariant (exact één oefening, sport = oefening) ──
  ok(c0.tkErgDefinitionValid('rowing', [{ exercise_id: 'roeien' }]), '3: RowErg-prescriptie + RowErg-oefening geldig');
  ok(!c0.tkErgDefinitionValid('rowing', [{ exercise_id: 'bikeerg' }]), '3: RowErg-prescriptie + BikeErg-oefening afgewezen');
  ok(!c0.tkErgDefinitionValid('bikeerg', []), '3: lege oefeningenlijst afgewezen');
  ok(!c0.tkErgDefinitionValid('skierg', [{ exercise_id: 'skierg' }, { exercise_id: 'skierg' }]), '3: >1 oefening afgewezen');
  ok(!c0.tkErgDefinitionValid('running', [{ exercise_id: 'roeien' }]), '3: niet-erg sport valt buiten de invariant');

  for (const [sport, exId, label] of ERGS) {
    const c = sandbox();
    // ── Definition save + reload round-trip ──
    c._iv = { sport, naam: label + ' 4×3', warmupMin: 5, repeats: 4, workTerm: 'time', workMin: 3, workM: 500, workPace: sport === 'bikeerg' ? '250 W' : '1:50/500m', workRpe: 8, recMin: 1, cooldownMin: 5 };
    const raw = c.ivRaw();
    eq(raw.sport, sport, label + ': ivRaw zet sport');
    const defId = await c.saveIntervalWorkout(label + ' 4×3', raw, null);
    ok(defId && c._db.custom_trainings.length === 1, label + ': Definition gepersisteerd');
    const row = c._db.custom_trainings[0] || { metadata: { intervalPrescription: {} } };
    eq(row.metadata.intervalPrescription.sport, sport, label + ': prescriptie-sport bewaard');
    const t = c.customTrainings[0] || { exercises: [], id: null, name: null };
    eq(t.exercises.length, 1, label + ': Definition bevat EXACT één oefening');
    eq(t.exercises[0] && t.exercises[0].exercise_id, exId, label + ': dat is de canonieke ' + label + '-oefening (' + exId + ')');
    ok(c.tkErgDefinitionValid(sport, t.exercises), label + ': Definition-invariant geldt na save');
    const reloaded = IntervalEngineCore.normalizePrescription(row.metadata.intervalPrescription);
    ok(reloaded.geldig && reloaded.blocks.length === 10 && reloaded.blocks.filter((b) => b.type === 'work').length === 4, label + ': reload/normalize behoudt 4 herhalingen en blokvolgorde');
    eq(reloaded.blocks[1].target.rpe, 8, label + ': RPE-target bewaard');
    // ── Instance-snapshot (immutable) ──
    const def = { id: t.id, source: 'custom', name: t.name, exercises: t.exercises, intervalPrescription: row.metadata.intervalPrescription };
    const instId = await c.startInstanceFromDefinition(def, []);
    const snap = (c._db.training_instances[0] && c._db.training_instances[0].snapshot) || { intervalPrescription: {}, items: [], intervalPrescriptionNormalized: { blocks: [] } };
    eq(snap.intervalPrescription.sport, sport, label + ': snapshot bevat de prescriptie');
    eq(snap.items.length, 1, label + ': snapshot bevat de ene oefening');
    const before = JSON.stringify(snap);
    row.metadata.intervalPrescription.blocks[1].repeat = 9; def.intervalPrescription.sport = 'running';
    eq(JSON.stringify(c._db.training_instances[0].snapshot), before, label + ': snapshot ongewijzigd na mutatie van de bron-Definition');
    // ── Executie via de oefeningkaart, IntervalEngineCore ──
    const norm = snap.intervalPrescriptionNormalized;
    c._tkErgPending = { exId, sport, instanceId: instId, prescription: norm, rawPrescription: snap.intervalPrescription };
    c.document = { getElementById: () => null };
    c.startIntervalExecution(exId, sport);
    ok(c._ivExec && c._ivExec.canonical === true && c._ivExec.exId === exId && c._ivExec.instanceId === instId, label + ': executie start canonical op de juiste oefening + instance');
    eq(c._ivExec.prescription.blocks.length, 10, label + ': executie draait op het snapshot (10 blokken), niet op de gemuteerde bron');
    c._now = T0 + 300_000; c.advanceIntervalBlock(); // warm-up voltooid
    c._now = T0 + 480_000; c.advanceIntervalBlock(); // werk 1 (180 s)
    eq(c._ivExec.laps.length, 2, label + ': twee actual-blokken gelogd');
    eq(c._ivExec.laps[0].lap_type, 'warmup', label + ': lap_type warmup'); eq(c._ivExec.laps[0].duration_s, 300, label + ': werkelijke duur 300 s');
    eq(c._ivExec.laps[1].lap_type, 'work', label + ': lap_type work'); ok(c._ivExec.laps.every((l) => { const pb = norm.blocks[l.block_index]; return pb && pb.type === l.lap_type; }), label + ': actual-bloksemantiek = plan-bloksemantiek op dezelfde index'); eq(c._ivExec.laps[1].block_index, 1, label + ': block_index 1'); eq(c._ivExec.laps[1].repeat_index, 0, label + ': repeat_index 0');
    ok(c._ivExec.laps.every((l) => l.distance_m === null && l.power_w === null), label + ': geen verzonnen afstand/vermogen (geen telemetrie)');
    // ── Onvolledig afronden ──
    c._now = T0 + 500_000; c.finishIntervalExecution(true);
    const det = (c.sessionLog[exId] && c.sessionLog[exId].intervalsDetail) || { version: null, sport: null, blocks: [], aborted: null };
    eq(det.version, 'erg_intervals_actual.v1', label + ': contractversie');
    eq(det.sport, sport, label + ': sportidentiteit in de actuals');
    eq(det.blocks.length, 3, label + ': vroegtijdig stoppen sluit alleen het lopende blok extra af');
    eq(det.blocks[2].block_index, 2, label + ': dat is het herstelblok (index 2), geen toekomstig blok');
    eq(det.blocks[2].duration_s, 20, label + ': werkelijke deelduur 20 s (niet de geplande 60 s)');
    ok(det.blocks.every((b) => b.block_index <= 2), label + ': geen toekomstige geplande blokken als actual');
    // de gelogde bloksemantiek MOET overeenkomen met het blok op die index in het plan (geen semantiek van een later blok)
    ok(det.blocks.every((b) => { const pb = norm.blocks[b.block_index]; return pb && pb.type === b.lap_type && pb.repeatIndex === b.repeat_index; }), label + ': lap_type/repeat_index komen exact overeen met het plan-blok op dezelfde index');
    eq(det.aborted, true, label + ': onvolledige uitvoering eerlijk gemarkeerd');
    ok(!('stroke_rate' in det.blocks[0]) && !('cadence' in det.blocks[0]), label + ': geen cadans/stroke_rate in de structured actuals');
    // ── Persistence: één sessierij met exercise_id + instance + intervals_detail ──
    await c.sbPostQ('sessions', { date: '2026-09-14', exercise_id: exId, training_type: 'x', training_instance_id: instId, duration_s: 500, intervals_detail: det });
    eq(c._db.sessions.length, 1, label + ': exact één sessierij');
    eq(c._db.sessions[0].exercise_id, exId, label + ': juiste exercise_id');
    eq(c._db.sessions[0].training_instance_id, instId, label + ': plan↔actual-link');
    ok(!c._db.activities, label + ': geen activities-write voor erg');
    // ── History planned-vs-actual ──
    const hist = await c.renderErgSessionStructuredHtml(c._db.sessions[0]);
    ok(/gepland vs\. uitgevoerd/.test(hist) && /10 blokken gepland/.test(hist) && /3 van 10 blokken gelogd/.test(hist), label + ': History leest plan uit snapshot + actuals uit intervals_detail');
    ok(/vroegtijdig gestopt/.test(hist), label + ': onvolledige sessie eerlijk getoond');
    ok(/niet gelogd/.test(hist), label + ': niet-uitgevoerde blokken → "niet gelogd" (geen planned→actual)');
    ok(/5:00/.test(hist) && /3:00/.test(hist), label + ': geplande duren uit het snapshot');
    const histLeeg = await c.renderErgSessionStructuredHtml({ id: 's-legacy', exercise_id: exId, training_instance_id: null });
    eq(histLeeg, '', label + ': legacy sessie zonder intervals_detail/instance → lege sectie (geen crash)');
    eq(await c.renderErgSessionStructuredHtml({ id: 's2', exercise_id: exId, training_instance_id: null, intervals_detail: det }), '', label + ': actuals zonder instance-link → geen planned-vs-actual (plan is niet bewijsbaar)');
    eq(await c.renderErgSessionStructuredHtml({ id: 's3', exercise_id: exId, training_instance_id: instId, intervals_detail: { version: 'anders.v9', blocks: det.blocks } }), '', label + ': onbekende contractversie → niets tonen (geen gok)');
    eq(await c.renderErgSessionStructuredHtml({ id: 's4', exercise_id: exId, training_instance_id: 'inst-onbekend', intervals_detail: det }), '', label + ': onbekende instance → lege sectie');
    // ── Sport-correcte actual-eenheden (alleen bij gemeten afstand) ──
    const basis = sport === 'bikeerg' ? 1000 : 500;
    const txt = c.tkErgActualText(sport, { duration_s: 120, distance_m: basis });
    ok(txt.includes('2:00') && txt.includes(basis + ' m') && txt.includes('/' + basis + 'm'), label + ': actual split per ' + basis + ' m uit gemeten afstand+tijd');
    eq(c.tkErgActualText(sport, { duration_s: 120, distance_m: null }), '2:00', label + ': zonder gemeten afstand geen split/afstand');
  }

  // ── Ad-hoc legacy erg (geen Definition): formulierprescriptie, geen structured actuals ──
  {
    const c = sandbox();
    c.document = { getElementById: (id) => ({ value: /repeats/.test(id) ? '3' : /work/.test(id) ? '60' : /rest/.test(id) ? '30' : '0' }) };
    c.startIntervalExecution('roeien', 'rowing');
    ok(c._ivExec && c._ivExec.canonical === false && c._ivExec.instanceId === null, 'legacy: ad-hoc erg zonder Definition blijft werken (canonical false)');
    c._now = T0 + 60_000; c.advanceIntervalBlock(); c._now = T0 + 90_000; c.finishIntervalExecution(false);
    ok(!c.sessionLog['roeien'] || !c.sessionLog['roeien'].intervalsDetail, 'legacy: ad-hoc erg schrijft GEEN structured actuals (geen valse canonieke waarheid)');
    ok(/sessionLog\[exId\]\.exNote=\(sessionLog\[exId\]\.exNote\?/.test(SRC.finishIntervalExecution) && /Intervaltraining: '\+completedWorkBlocks/.test(SRC.finishIntervalExecution), 'legacy: de bestaande exNote-samenvatting blijft ongewijzigd als display-compatibiliteit (niet de canonieke waarheid)');
    ok(SRC.finishIntervalExecution.indexOf('intervalsDetail') < SRC.finishIntervalExecution.indexOf('exNote'), 'legacy: de canonieke structured actuals worden vóór de display-notitie gezet (notitie is afgeleid/niet-autoritatief)');
  }
  // ── Statisch: keten, één engine, geen dual-write, geen activities ──
  const code = html.replace(/\/\/[^\n]*/g, '');
  ok(/intervals_detail:\(l\.intervalsDetail\|\|null\)/.test(FINISH_SESSION_WRITE) && /exercise_id:ex\.id/.test(FINISH_SESSION_WRITE) && /training_instance_id:activeInstanceId\|\|null/.test(FINISH_SESSION_WRITE), 'persistence: intervals_detail gaat mee in DEZELFDE, enige sessierij');
  eq((code.match(/intervals_detail:/g) || []).length, 1, 'persistence: exact één schrijfplek voor intervals_detail (geen tweede write)');
  eq((code.match(/await writeSessionRow\(\{date:today,exercise_id:ex\.id/g) || []).length, 1, 'persistence: exact één writeSessionRow-aanroep in de cardio-tak (geen duplicate session write)');
  eq((code.match(/writeSessionRow\(/g) || []).length, 5, 'persistence: totaal aantal writeSessionRow-aanroepen ongewijzigd (definitie + 4 bestaande schrijfpaden; geen extra schrijfweg)');
  ok(!/sbPostQ\('activities'/.test(SRC.finishIntervalExecution) && !/activity_laps/.test(SRC.finishIntervalExecution), 'persistence: erg schrijft niet naar activities/activity_laps');
  ok(/_tkErgPending&&_tkErgPending\.exId===exId/.test(SRC.startIntervalExecution) && /buildIntervalPrescriptionFromForm/.test(SRC.startIntervalExecution), 'executie: snapshot-prescriptie heeft voorrang, formulier blijft fallback voor ad-hoc');
  ok(/IntervalEngineCore\.stateAt/.test(SRC.tkErgCloseBlockActual) && /IntervalEngineCore\.nextBlockIndex/.test(SRC.advanceIntervalBlock), 'engine: bloksemantiek uit IntervalEngineCore');
  ok(!/ErgIntervalEngine|Concept2IntervalEngine|RowErgEngine/.test(html), 'engine: geen tweede interval-engine geïntroduceerd');
  ok(/TK_ERG_SPORTS\.indexOf\(norm\.sport\)!==-1/.test(PREVIEW_START) && /tkErgDefinitionValid\(norm\.sport,def\.exercises\|\|\[\]\)/.test(PREVIEW_START) && /_tkErgPending=\{exId:_exId/.test(PREVIEW_START), 'start: erg-tak valideert de Definition-invariant en zet de snapshot-prescriptie klaar');
  ok(/exercises:ergEx/.test(SRC.saveIntervalWorkout) && /if\(!tkErgDefinitionValid\(norm\.sport,ergEx\)\)return null/.test(SRC.saveIntervalWorkout), 'Definition: fail closed bij sport/oefening-mismatch');
  ok(!/stroke_rate/.test((SRC.finishIntervalExecution + SRC.tkErgCloseBlockActual + SRC.tkErgActualText).replace(/\/\/[^\n]*/g, '')), 'BikeErg-schuld: cadans/RPM wordt nergens als stroke_rate in de structured actuals geschreven');
  ok(fs.existsSync(path.join(ROOT, 'migratie_v565.sql')) && /add column if not exists intervals_detail jsonb null/.test(fs.readFileSync(path.join(ROOT, 'migratie_v565.sql'), 'utf8')), 'migratie: additief, nullable, idempotent');

  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fStructuredIntervalsB3Erg: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
