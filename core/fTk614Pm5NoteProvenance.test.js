/* fTk614Pm5NoteProvenance.test.js — #614 vervolg P2: PM5-notitieprovenance (8 nov 2026)
 *
 * Bug: renderEditSessFields toonde in het notitieveld "alles vóór de laatste ' · '". Voor een
 * PM5-rij (note 'split:2:08.3/500m · [c2:<id>]', geschreven door Concept2Live.liveWorkoutToActual)
 * werd dat 'split:2:08.3/500m': de [c2:id]-bronidentiteit verdween en saveEditSession plakte de
 * opnieuw gegenereerde split erachter → 'split:2:08.3/500m · split:2:08.3/500m' zónder [c2:id].
 * Daarmee herkent alreadyLoggedLive / concept2AlreadyImported de workout niet meer (dedupe).
 *
 * ECHTE productiefuncties uit index.html (geëxtraheerd), ECHTE CardioCore/DeviceCore/Concept2Live;
 * alleen DOM/Supabase/toast gestubd, de PATCH-payload wordt afgevangen (geen netwerk).
 * Synthetische fixtures; geen gemeten data verzonnen — elke rij komt uit liveWorkoutToActual.
 *
 * Verwacht: RED op PR #615 HEAD 77aec90 (helpers bestaan daar niet), GREEN met de fix.
 * Draai: node core/fTk614Pm5NoteProvenance.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const CardioCore = require(path.join(ROOT, 'core', 'cardio.js'));
const DeviceCore = require(path.join(ROOT, 'core', 'deviceIntegration.js'));
const Concept2Live = require(path.join(ROOT, 'core', 'concept2Live.js'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
function count(s, re) { return (String(s || '').match(re) || []).length; }

// ── extractie van echte productiecode (zelfde methode als fTk614Pm5EditSplitMode.test.js) ──
function balancedFrom(startIdx) {
  let d = 0;
  for (let j = html.indexOf('{', startIdx); j < html.length; j++) {
    const ch = html[j];
    if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) return html.slice(startIdx, j + 1); }
  }
  throw new Error('onbalans vanaf ' + startIdx);
}
function fn(name, prefix) {
  const tok = (prefix || 'function ') + name + '(';
  const st = html.indexOf(tok);
  if (st < 0) throw new Error('functie niet gevonden: ' + name);
  return balancedFrom(st);
}
function constObj(name) {
  const st = html.indexOf('const ' + name + ' = {');
  if (st < 0) throw new Error('const niet gevonden: ' + name);
  return balancedFrom(st) + ';';
}
const HAS_FIX = html.indexOf('function tkCardioEditNoteParts(') >= 0;
const tagLine = () => { const i = html.indexOf('const TK_C2_NOTE_TAG_RE='); return html.slice(i, html.indexOf('\n', i)); };

const src = [
  constObj('CARDIO_TYPES'),
  fn('resolveCardioType'),
  constObj('CardioEngine'),
  'const CARDIO_TYPE_BY_ID = { bikeerg:"bikeerg", skierg:"skierg", roeien:"rowing" };',
  fn('numNL'), fn('parseTimeToSec'),
  fn('getCardioVal'), fn('setCardioVal'), fn('round1'),
  fn('recomputeCardioFields'),
  'let cardioSplitMode={}; let cardioSplits={}; let cardioWattSource={};',
  (html.indexOf('let cardioSplitEstimates') >= 0 ? 'let cardioSplitEstimates={};' : ''),
  fn('numSplitsFor'), fn('splitRowsHtml'), fn('renderSplitRows'),
  fn('setCardioSplitMode'), fn('computeAutoSplits'), fn('onManualSplitChange'),
  (html.indexOf('function cardioFmtPrecise(') >= 0 ? fn('cardioFmtPrecise') : ''),
  fn('updateSplitSummary'), fn('onCardioFieldInput'),
  fn('logCardio'), fn('cardioDataToRow'),
  'let curEditSess=null, curAddExId=null, curAddExName=null, curAddDate=null, curAddTT=null; let curEditExObj=null; const ES_DOMID="es";',
  (HAS_FIX ? tagLine() + '\n' + fn('tkCardioEditNoteParts') + '\n' + fn('tkCardioEditNoteCompose') : ''),
  fn('openEditSess'), fn('renderEditSessFields'),
  fn('saveEditSession', 'async function ')
].join('\n');

function makeSandbox(machineName) {
  const els = {};
  const el = id => (els[id] || (els[id] = { id, value: '', innerHTML: '', textContent: '', style: {}, title: '',
    classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, querySelectorAll: () => [] }));
  const patches = [];
  const sb = {
    console, Math, Number, String, Object, JSON, Array, Date, RegExp, isFinite, isNaN, parseInt, parseFloat, Promise,
    CardioCore, DeviceCore,
    window: {},
    localStorage: { getItem: () => machineName || '', setItem() {} },
    document: { getElementById: el, querySelector: () => null },
    exercises: [{ id: 'skierg', name: 'SkiErg', type: 'skierg', cardioType: 'skierg' },
                { id: 'roeien', name: 'RowErg', type: 'rowing', cardioType: 'rowing' }],
    sessionLog: {}, curT: 'A', updateProgress() {}, scheduleAutosave: undefined,
    buildCardioBody: () => '', buildWodBody: () => '', buildCarryBody: () => '', buildWorkSetRow: () => '',
    escHtml: s => String(s), td: () => '2026-11-08', fmtDate: s => s,
    openModal() {}, closeModal() {}, toast() {}, loadHistory() {},
    validateCardioField() {},
    sbPatchQ: async (table, query, row) => { patches.push({ table, query, row: JSON.parse(JSON.stringify(row)) }); return { ok: true }; },
    sbPostQ: async () => true, ensureExerciseRow: async () => {},
    __els: els, __patches: patches
  };
  vm.createContext(sb);
  vm.runInContext(src + '\nglobalThis.__x={openEditSess,setCardioSplitMode,onManualSplitChange,saveEditSession,cardioSplits,cardioWattSource};', sb);
  return sb;
}
// De echte DOM zet het notitieveld via value="${escHtml(session.note)}" in de innerHTML-string;
// de stub negeert innerHTML, dus emuleren we dat attribuut vóór de render.
function open(sb, s, name) { sb.document.getElementById('es-note').value = String(s.note || ''); sb.__x.openEditSess(s.id, name || 'SkiErg', s); }
function v(sb, f) { return sb.__els['es-' + f] ? sb.__els['es-' + f].value : undefined; }
async function save(sb) { const before = sb.__patches.length; await sb.__x.saveEditSession(null); return sb.__patches[before] || { row: {}, query: '' }; }
const dedupe = (id, note) => Concept2Live.alreadyLoggedLive(id, [{ note }]);
const imported = (id, note) => DeviceCore.concept2AlreadyImported(id, [{ note }]);

// ── fixtures: ECHTE PM5-rijen uit de bestaande Concept2Live-schrijver ──
const ID = 'tk614-synth-0001';
const pm5 = Concept2Live.liveWorkoutToActual({ machineType: 'skierg', date: '2026-11-08', distance_m: 500, duration_s: 128.3, watts: 167, stroke_rate_spm: 35, resultId: ID }, {}).row;
const S = Object.assign({ id: 'sess-note-1', edit_revision: 7 }, pm5);
eq(S.note, 'split:2:08.3/500m · [c2:' + ID + ']', 'fixture: bestaande PM5-note-grammatica');
ok(dedupe(ID, S.note) && imported(ID, S.note), 'fixture: bron-dedupe herkent de oorspronkelijke note');

(async () => {
  // ═══ A. KERN: enkel openen + opslaan ═══
  let sb = makeSandbox();
  open(sb, S);
  eq(v(sb, 'note'), '', 'A. open: notitieveld toont geen split-token en geen [c2:id] (geen vrije tekst aanwezig)');
  ok(/^2:08\.3/.test(v(sb, 'split')), 'A. open: split-veld 2:08.3 (/500m) uit de note');
  let p = await save(sb);
  eq(p.row.note, S.note, 'A. save zonder edits: note byte-identiek (provenance ongewijzigd)');
  eq(count(p.row.note, /split:/g), 1, 'A. save: split: precies 1x (geen duplicaat)');
  eq(count(p.row.note, /\[c2:tk614-synth-0001\]/g), 1, 'A. save: [c2:id] precies 1x');
  ok(dedupe(ID, p.row.note) && imported(ID, p.row.note), 'A. save: alreadyLoggedLive + concept2AlreadyImported herkennen de rij nog');
  ok(/id=eq\.sess-note-1&edit_revision=lt\./.test(p.query), 'A. save: CAS op edit_revision ongewijzigd (zelfde PATCH-pad)');
  ok(p.row.edit_revision > 7, 'A. save: nieuwe edit_revision > bekende');
  ok(p.row.watt_source === undefined, 'A. save: watt_source niet meegestuurd (gemeten herkomst blijft server-side)');
  eq(p.row.watt, 167, 'A. save: watt 167');
  eq(p.row.time_str, '2:08.3', 'A. save: tijd 2:08.3');

  // ═══ B. Bestaande vrije notitie (P1-compositie exNote · converter-note) ═══
  const SB = Object.assign({}, S, { note: 'Zware dag · ' + S.note });
  sb = makeSandbox(); open(sb, SB);
  eq(v(sb, 'note'), 'Zware dag', 'B. open: alleen vrije tekst bewerkbaar');
  p = await save(sb);
  eq(p.row.note, SB.note, 'B. save zonder edits: byte-identiek');

  // ═══ C. Alleen vrije tekst wijzigen, daarna opnieuw bewerken (idempotent) ═══
  sb = makeSandbox(); open(sb, SB);
  sb.__els['es-note'].value = 'Lekker getraind';
  p = await save(sb);
  eq(p.row.note, 'Lekker getraind · split:2:08.3/500m · [c2:' + ID + ']', 'C. vrije tekst gewijzigd: tekst nieuw, tokens/provenance behouden');
  const SC = Object.assign({}, S, { note: p.row.note });
  sb = makeSandbox(); open(sb, SC);
  eq(v(sb, 'note'), 'Lekker getraind', 'C. heropenen: vrije tekst terug, geen tokens in veld');
  p = await save(sb);
  eq(p.row.note, SC.note, 'C. tweede save zonder edits: byte-identiek (geen drift)');

  // ═══ D. Vrije tekst leegmaken / lege note ═══
  sb = makeSandbox(); open(sb, SB);
  sb.__els['es-note'].value = '';
  p = await save(sb);
  eq(p.row.note, S.note, 'D. vrije tekst gewist: alleen tokens + [c2:id], niets verzonnen');
  sb = makeSandbox(); open(sb, Object.assign({}, S, { note: '' }));
  p = await save(sb);
  ok(!/\[c2/.test(p.row.note || ''), 'D. lege note: geen [c2:]-tag verzonnen (kreeg "' + p.row.note + '")');
  eq(p.row.note, '', 'D. lege note zonder split-bron: note blijft leeg (niets verzonnen)');

  // ═══ E. RowErg met drag + hr + tag (drag heeft een veld, hr niet) ═══
  const R = Object.assign({ id: 'r-note', edit_revision: 1 }, Concept2Live.liveWorkoutToActual({ machineType: 'rowerg', date: '2026-11-08', distance_m: 1000, duration_s: 215.7, watts: 275, stroke_rate_spm: 28, drag_factor: 120, heart_rate_bpm: 150, resultId: 'tk614-synth-row' }, {}).row);
  ok(/ · drag 120 · hr 150 · \[c2:tk614-synth-row\]$/.test(R.note), 'E. fixture: rowerg-note bevat drag/hr/tag');
  sb = makeSandbox(); open(sb, R, 'RowErg');
  eq(v(sb, 'drag'), '120', 'E. open: drag-veld 120');
  eq(v(sb, 'note'), '', 'E. open: geen tokens (split/drag/hr/tag) in het notitieveld');
  p = await save(sb);
  eq(p.row.note, R.note, 'E. save zonder edits: byte-identiek');
  sb = makeSandbox(); open(sb, R, 'RowErg');
  sb.__els['es-note'].value = 'pr';
  p = await save(sb);
  eq(count(p.row.note, /split:/g), 1, 'E. tekst gewijzigd: split 1x');
  eq(count(p.row.note, /drag 120/g), 1, 'E. tekst gewijzigd: drag 1x');
  eq(count(p.row.note, /hr 150/g), 1, 'E. tekst gewijzigd: gemeten hr behouden (1x)');
  ok(/^pr · /.test(p.row.note) && /\[c2:tk614-synth-row\]$/.test(p.row.note), 'E. tekst gewijzigd: vrije tekst voorop, tag behouden (kreeg "' + p.row.note + '")');

  // ═══ F. SkiErg met hr+drag (geen velden voor beide) blijven als provenance ═══
  const F = Object.assign({ id: 'f-note', edit_revision: 1 }, Concept2Live.liveWorkoutToActual({ machineType: 'skierg', date: '2026-11-08', distance_m: 500, duration_s: 128.3, watts: 167, drag_factor: 95, heart_rate_bpm: 161, resultId: 'tk614-synth-f' }, {}).row);
  sb = makeSandbox(); open(sb, F);
  eq(v(sb, 'note'), '', 'F. open: drag/hr zonder veld niet als bewerkbare tekst');
  p = await save(sb);
  eq(p.row.note, F.note, 'F. save zonder edits: byte-identiek');

  // ═══ G. Mode-switch zonder invoer → note ongewijzigd ═══
  sb = makeSandbox(); open(sb, S);
  sb.__x.setCardioSplitMode('es', 'skierg', 'handmatig');
  sb.__x.setCardioSplitMode('es', 'skierg', 'auto');
  sb.__x.setCardioSplitMode('es', 'skierg', 'handmatig');
  p = await save(sb);
  eq(p.row.note, S.note, 'G. alleen moduswissels: note byte-identiek, geen fictieve splits');

  // ═══ H. Echte handmatige splits: token erbij, tag behouden, split niet dubbel ═══
  sb = makeSandbox(); open(sb, S);
  sb.__x.setCardioSplitMode('es', 'skierg', 'handmatig');
  sb.document.getElementById('es-sp1').value = '1:03.9'; sb.__x.onManualSplitChange('es', 'skierg', 1);
  sb.document.getElementById('es-sp2').value = '1:04.4'; sb.__x.onManualSplitChange('es', 'skierg', 2);
  p = await save(sb);
  ok(/splits:1=63\.9,2=64\.4/.test(p.row.note), 'H. handmatige splits bewaard');
  eq(count(p.row.note, /split:/g), 1, 'H. split: 1x');
  eq(count(p.row.note, /\[c2:tk614-synth-0001\]/g), 1, 'H. [c2:id] 1x behouden');
  const SH = Object.assign({}, S, { note: p.row.note });
  sb = makeSandbox(); open(sb, SH);
  eq(v(sb, 'note'), '', 'H. heropenen: notitieveld zonder split/splits/tag');
  p = await save(sb);
  eq(p.row.note, SH.note, 'H. heropenen + save: byte-identiek');

  // ═══ I. Injectie/vervalsing: getypte [c2:]-tag telt niet als bron ═══
  sb = makeSandbox(); open(sb, S);
  sb.__els['es-note'].value = 'hoi [c2:forged-999] <img src=x>';
  p = await save(sb);
  ok(!/forged-999/.test(p.row.note), 'I. getypte [c2:forged]-tag niet opgeslagen (kreeg "' + p.row.note + '")');
  ok(!dedupe('forged-999', p.row.note), 'I. dedupe herkent geen vervalste id');
  eq(count(p.row.note, /\[c2:tk614-synth-0001\]/g), 1, 'I. echte tag 1x behouden');
  ok(/^hoi <img src=x> · /.test(p.row.note), 'I. overige vrije tekst ongewijzigd als data bewaard');

  // ═══ J. Eerder door de bug beschadigde note: geen duplicaat meer, niets verzonnen ═══
  const J = Object.assign({}, S, { note: 'split:2:08.3/500m · split:2:08.3/500m' });
  sb = makeSandbox(); open(sb, J);
  eq(v(sb, 'note'), '', 'J. open: dubbel split-token niet als vrije tekst');
  sb.__els['es-note'].value = 'x';
  p = await save(sb);
  eq(p.row.note, 'x · split:2:08.3/500m', 'J. save na edit: split 1x, geen [c2:] verzonnen');

  // ═══ K. Lokale identiteit [c2local:] + meerdere scheidingstekens in vrije tekst ═══
  const K = Object.assign({ id: 'k-note', edit_revision: 1 }, Concept2Live.liveWorkoutToActual({ machineType: 'skierg', date: '2026-11-08', distance_m: 500, duration_s: 128.3, watts: 167, localId: 'local-tk614' }, {}).row);
  K.note = 'a · b | c · ' + K.note;
  sb = makeSandbox(); open(sb, K);
  eq(v(sb, 'note'), 'a · b | c', 'K. open: vrije tekst met · en | intact, tokens/tag eruit');
  p = await save(sb);
  eq(p.row.note, K.note, 'K. save zonder edits: byte-identiek incl. [c2local:]');
  ok(dedupe('local-tk614', p.row.note), 'K. [c2local:]-dedupe blijft werken');

  // ═══ L. Machinenaam in localStorage: geen dubbel, tag behouden ═══
  sb = makeSandbox('PM5-Ski'); open(sb, S);
  sb.__els['es-note'].value = 'm';
  p = await save(sb);
  eq(count(p.row.note, /split:/g), 1, 'L. met machinenaam: split 1x');
  eq(count(p.row.note, /\[c2:tk614-synth-0001\]/g), 1, 'L. met machinenaam: tag 1x');

  // ═══ M. Handmatige (niet-PM5) note: bestaand gedrag ═══
  const M = { id: 'm-note', edit_revision: 1, exercise_id: 'roeien', distance: 2000, time_str: '7:20', note: 'Voelde goed · split:1:50' };
  sb = makeSandbox(); open(sb, M, 'RowErg');
  eq(v(sb, 'note'), 'Voelde goed', 'M. handmatig: vrije notitie behouden, split gestript');
  p = await save(sb);
  eq(p.row.note, M.note, 'M. handmatig: save zonder edits byte-identiek');

  console.log('\nTK614 PM5 note-provenance: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt' + (HAS_FIX ? '' : ' (fix-helpers afwezig: verwacht RED)'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
