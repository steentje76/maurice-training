/* fTk614Pm5EditSplitMode.test.js — #614 fase 2 P1 (TK-UT-20261108-039/040)
 *
 * Gebruikerstest v4.70.27: fysieke SkiErg PM5 500m — 2:08.3 totaal,
 * 2:08.3/500m, 167W gemeten, 35 spm. Logboek → Bewerken toont eerst correct;
 * na de splitmoduswissel (Automatisch/"Geschatte verdeling" ↔ Handmatig)
 * toonde het modal 2:08, split/500m 1:04 (= 250m-deeltijd) en 1326/1335 W.
 *
 * Deze test draait de ECHTE productiefuncties uit index.html (geëxtraheerd,
 * geen herimplementatie) met de ECHTE CardioCore (core/cardio.js), DeviceCore
 * (core/deviceIntegration.js) en de ECHTE PM5-rij uit
 * Concept2Live.liveWorkoutToActual(). Alleen DOM/Supabase/toast zijn gestubd;
 * de PATCH-payload van saveEditSession() wordt afgevangen (geen netwerk).
 *
 * Draai: node core/fTk614Pm5EditSplitMode.test.js
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

// ── extractie van echte productiecode ──
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

const src = [
  constObj('CARDIO_TYPES'),
  fn('resolveCardioType'),
  constObj('CardioEngine'),
  'const CARDIO_TYPE_BY_ID = { bikeerg:"bikeerg", skierg:"skierg", roeien:"rowing" };',
  fn('numNL'),
  fn('parseTimeToSec'),
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
  // #614 P2 (note-provenance): renderEditSessFields/saveEditSession gebruiken deze helpers.
  (html.indexOf('function tkCardioEditNoteParts(') >= 0
    ? html.slice(html.indexOf('const TK_C2_NOTE_TAG_RE='), html.indexOf('\n', html.indexOf('const TK_C2_NOTE_TAG_RE='))) + '\n' + fn('tkCardioEditNoteParts') + '\n' + fn('tkCardioEditNoteCompose')
    : ''),
  fn('openEditSess'), fn('renderEditSessFields'),
  fn('saveEditSession', 'async function ')
].join('\n');

function makeSandbox() {
  const els = {};
  const el = id => (els[id] || (els[id] = { id, value: '', innerHTML: '', textContent: '', style: {}, title: '',
    classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, querySelectorAll: () => [] }));
  const patches = [];
  const sb = {
    console, Math, Number, String, Object, JSON, Array, Date, RegExp, isFinite, isNaN, parseInt, parseFloat, Promise,
    CardioCore, DeviceCore,
    window: {},
    localStorage: { getItem: () => '', setItem() {} },
    document: { getElementById: el, querySelector: () => null },
    exercises: [{ id: 'skierg', name: 'SkiErg', type: 'skierg', cardioType: 'skierg' }],
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
  vm.runInContext(src + '\nglobalThis.__x={openEditSess,setCardioSplitMode,onManualSplitChange,onCardioFieldInput,saveEditSession,cardioSplits,cardioSplitMode,cardioWattSource};', sb);
  return sb;
}

// ── fixture: ECHTE PM5-rij uit de bestaande Concept2Live-schrijver ──
const pm5 = Concept2Live.liveWorkoutToActual({ machineType: 'skierg', date: '2026-11-08', distance_m: 500, duration_s: 128.3, watts: 167, stroke_rate_spm: 35, resultId: 'tk614fixture' }, {});
const session = Object.assign({ id: 'sess-tk614', edit_revision: 1 }, pm5.row);
// sanity: dit is precies wat de gebruiker in het Logboek zag
eq(session.exercise_id, 'skierg', 'fixture: PM5 skierg → exercise skierg');
eq(session.time_str, '2:08.3', 'fixture: time_str 2:08.3 (tienden behouden door bestaande schrijver)');
eq(session.watt, 167, 'fixture: watt 167');
eq(session.watt_source, 'concept2_measured', 'fixture: watt_source concept2_measured');
ok(/split:2:08\.3\/500m/.test(session.note), 'fixture: note bevat split:2:08.3/500m');

function v(sb, f) { return sb.__els['es-' + f] ? sb.__els['es-' + f].value : undefined; }
function summary(sb) { return sb.__els['splitsummary-es'] ? sb.__els['splitsummary-es'].textContent : ''; }
function grid(sb) { return sb.__els['splitsgrid-es'] ? sb.__els['splitsgrid-es'].innerHTML : ''; }

(async () => {
  // ═══ 1. Openen: gemeten waarden correct ═══
  let sb = makeSandbox();
  sb.__x.openEditSess(session.id, 'SkiErg', session);
  eq(String(v(sb, 'dist')), '500', '1. open: afstand 500');
  eq(v(sb, 'time'), '2:08.3', '1. open: tijd 2:08.3');
  eq(String(v(sb, 'watt')), '167', '1. open: watt 167');
  eq(String(v(sb, 'stroke')), '35', '1. open: 35 spm');
  ok(/^2:08\.3/.test(v(sb, 'split')), '1. open: split begint met 2:08.3 (/500m)');
  ok(!/Gem\. split: 1:04/.test(summary(sb)), '1. open: samenvatting labelt 250m-deeltijd NIET als "Gem. split" (kreeg "' + summary(sb) + '")');

  // ═══ 2. KERN-BUG: wissel naar Handmatig mag gemeten velden NIET wijzigen ═══
  sb.__x.setCardioSplitMode('es', 'skierg', 'handmatig');
  eq(v(sb, 'time'), '2:08.3', '2. Handmatig: tijd blijft 2:08.3 (geen 0.3s-verlies)');
  ok(/^2:08\.3/.test(v(sb, 'split')), '2. Handmatig: split/500m blijft 2:08.3 (kreeg ' + v(sb, 'split') + ')');
  eq(String(v(sb, 'watt')), '167', '2. Handmatig: watt blijft gemeten 167');
  ok(sb.__x.cardioWattSource.es == null, '2. Handmatig: geen watt-herkomstwijziging door presentatiewissel');
  // geschatte deeltijden zijn GEEN handmatige invoer
  eq(Object.keys(sb.__x.cardioSplits.es || {}).length, 0, '2. Handmatig: geschatte 250m-deeltijden worden niet als ingevoerde splits overgenomen');
  ok(/placeholder="1:04"/.test(grid(sb)), '2. Handmatig: geschatte 1:04 per 250m alleen als placeholder (estimated) zichtbaar');

  // ═══ 3. Terug naar Automatisch en nogmaals Handmatig (1335W-pad) ═══
  sb.__x.setCardioSplitMode('es', 'skierg', 'auto');
  sb.__x.setCardioSplitMode('es', 'skierg', 'handmatig');
  sb.__x.setCardioSplitMode('es', 'skierg', 'auto');
  eq(v(sb, 'time'), '2:08.3', '3. heen-en-weer: tijd 2:08.3');
  eq(String(v(sb, 'watt')), '167', '3. heen-en-weer: watt 167 (geen 1335W)');
  ok(/^2:08\.3/.test(v(sb, 'split')), '3. heen-en-weer: split/500m 2:08.3');
  ok(/1:04/.test(grid(sb)) && /250m/.test(summary(sb)) && /[Gg]eschat/.test(summary(sb)), '3. auto: 250m-deeltijden zichtbaar, expliciet als geschat per 250m (kreeg "' + summary(sb) + '")');
  ok(/2:08\.3/.test(summary(sb)), '3. auto: totaal in samenvatting met tienden 2:08.3');

  // ═══ 4. Roundtrip/filing: opslaan na wissels → PATCH-payload ongewijzigde metingen ═══
  await sb.__x.saveEditSession(null);
  eq(sb.__patches.length, 1, '4. save: precies één PATCH');
  const row = sb.__patches[0] && sb.__patches[0].row || {};
  ok(/id=eq\.sess-tk614&edit_revision=lt\./.test(sb.__patches[0] && sb.__patches[0].query), '4. save: compare-and-set op eigen rij-id (geen tweede schrijver)');
  eq(row.time_str, '2:08.3', '4. save: time_str 2:08.3 (0.3s niet weggeschreven)');
  eq(row.watt, 167, '4. save: watt 167');
  eq(row.distance, 500, '4. save: afstand 500');
  ok(row.watt_source === undefined || row.watt_source === 'concept2_measured', '4. save: watt_source niet overschreven met andere herkomst (kreeg ' + row.watt_source + ')');
  ok(!/splits:/.test(row.note || ''), '4. save: GEEN fictieve splits-token in note (kreeg "' + row.note + '")');
  ok(!/split:1:04/.test(row.note || ''), '4. save: geen 250m-deeltijd als /500m-split in note');

  // ═══ 5. Echte handmatige invoer: units 250m→500m correct, watt derived ═══
  sb = makeSandbox();
  sb.__x.openEditSess(session.id, 'SkiErg', session);
  sb.__x.setCardioSplitMode('es', 'skierg', 'handmatig');
  sb.__els['es-sp1'] = sb.__els['es-sp1'] || sb.document.getElementById('es-sp1');
  sb.__els['es-sp1'].value = '1:03.9'; sb.__x.onManualSplitChange('es', 'skierg', 1);
  eq(v(sb, 'time'), '2:08.3', '5. 1/2 ingevuld: topvelden nog ongewijzigd');
  sb.document.getElementById('es-sp2').value = '1:04.4'; sb.__x.onManualSplitChange('es', 'skierg', 2);
  eq(v(sb, 'time'), '2:08.3', '5. 2/2 handmatig (63.9+64.4=128.3): tijd 2:08.3 met tienden');
  ok(/^2:08\.3/.test(v(sb, 'split')), '5. handmatig: split per 500m = 2:08.3, niet 250m-gemiddelde 1:04 (kreeg ' + v(sb, 'split') + ')');
  const w5 = Number(v(sb, 'watt'));
  ok(w5 > 160 && w5 < 175, '5. handmatig: afgeleide watt plausibel ~165W, niet ~1326W (kreeg ' + w5 + ')');
  eq(sb.__x.cardioWattSource.es, 'concept2_derived', '5. handmatig: watt-herkomst = concept2_derived (nooit measured)');
  await sb.__x.saveEditSession(null);
  const row5 = sb.__patches[0].row;
  eq(row5.watt_source, 'concept2_derived', '5. save: watt_source concept2_derived meegestuurd (geen measured-label op afgeleide watt)');
  ok(/splits:1=63\.9,2=64\.4/.test(row5.note || ''), '5. save: echte handmatige splits wel bewaard');

  // ═══ 6. Herrender: heropenen van opgeslagen handmatige splits wijzigt topvelden niet ═══
  sb = makeSandbox();
  const s6 = Object.assign({}, session, { note: 'split:2:08.3/500m | splits:1=64.15,2=64.15 · [c2:tk614fixture]' });
  sb.__x.openEditSess(s6.id, 'SkiErg', s6);
  eq(v(sb, 'time'), '2:08.3', '6. heropenen met splits-token: tijd blijft 2:08.3');
  eq(String(v(sb, 'watt')), '167', '6. heropenen met splits-token: watt blijft 167');

  // ═══ 7. Stale state: vorige edit lekt niet in volgende ═══
  sb = makeSandbox();
  sb.__x.openEditSess(session.id, 'SkiErg', session);
  sb.__x.cardioWattSource.es = 'manual';
  sb.__x.openEditSess(session.id, 'SkiErg', session);
  ok(sb.__x.cardioWattSource.es == null, '7. heropenen: stale watt-herkomst van vorige bewerking gewist');

  // ═══ 8. RowErg-regressie: zelfde mechanisme, 1000m ═══
  sb = makeSandbox();
  sb.exercises.push({ id: 'roeien', name: 'RowErg', type: 'rowing', cardioType: 'rowing' });
  const r8 = Concept2Live.liveWorkoutToActual({ machineType: 'rowerg', date: '2026-11-08', distance_m: 1000, duration_s: 215.7, watts: 275 }, {}).row;
  sb.__x.openEditSess('r8', 'RowErg', Object.assign({ id: 'r8' }, r8));
  sb.__x.setCardioSplitMode('es', 'rowing', 'handmatig');
  eq(v(sb, 'time'), '3:35.7', '8. RowErg: tijd blijft 3:35.7');
  eq(String(v(sb, 'watt')), '275', '8. RowErg: watt blijft 275');

  console.log('\nTK614 PM5 edit split-modus: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
