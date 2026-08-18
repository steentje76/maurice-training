/* MASTER FIX — ÉÉN PRESCRIPTION-TRUTH + media-owner.
 * Extraheert de ECHTE functies uit index.html: buildPrescriptionContract, buildPrevBlock,
 * resolveExerciseMedia. Bewijst: coaching/prev-block leiden ALLEEN af van de actuele prescription
 * (rxWeight), tonen nooit een tweede/afwijkend "vandaag"-getal, en media = mp4→yt→poster→none.
 * Draai: node core/fPrescriptionConsistency.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){
  const st = html.indexOf('function ' + name + '(');
  if (st < 0) throw new Error('functie niet gevonden: ' + name);
  let d = 0, e = -1;
  for (let j = html.indexOf('{', st); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') d++; else if (ch === '}'){ d--; if (d === 0){ e = j; break; } }
  }
  return html.slice(st, e + 1);
}
// stubs voor globals die resolveExerciseMedia kan raken
let _posterReturn = null;
function movekitPosterFor(ex){ return _posterReturn; }
// MoveKit-video-provider stub: naam/id-gebaseerde resolutie (zoals ExerciseAssetProvider.resolve(id,'video')).
let _movekitVideo = null; // zet op een .mp4-pad om MoveKit-beschikbaarheid te simuleren
let ExerciseAssetProvider = {
  has:    (id,type)=> type==='video' && !!_movekitVideo,
  resolve:(id,type)=> (type==='video' ? _movekitVideo : null),
  hasVideo:(id)=> !!_movekitVideo,
  video:  (id)=> _movekitVideo ? { file:_movekitVideo } : null
};
const buildPrescriptionContract = eval('(' + extractFn('buildPrescriptionContract') + ')');
const buildPrevBlock = eval('(' + extractFn('buildPrevBlock') + ')');
const resolveExerciseMedia = eval('(' + extractFn('resolveExerciseMedia') + ')');

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

// het scenario uit de audit: vorige 62×1@8, doel 3-5, prescription 57
const prev62 = { weight:62, reps:1, rpe:8, date:'2026-08-01' };
const ex57 = { sets:4, reps:'3-5', rpe:'7.5', suggestedWeight:57, _rxRpeDelta:-0.5, _rxWeightAdjusted:true };

// ── A/B: prescription weight/RPE komen uit de bron ──
const c1 = buildPrescriptionContract(ex57, prev62, 57);
eq(c1.prescription.weight, 57, 'A: prescription.weight = rxWeight (57)');
eq(c1.prescription.rpe, '7.5', 'B: prescription.rpe = getoonde RPE (7.5)');
eq(c1.prescription.basis, 'recovery', 'basis=recovery want _rxWeightAdjusted');
eq(c1.previous.weight, 62, 'previous = historische context (62)');

// ── C/D/E: coaching bevat de prescription (57), NOOIT het oude "houd 62"/"62 mogelijk" ──
ok(c1.coaching.indexOf('57') !== -1, 'C: coaching noemt de prescription (57)');
ok(c1.coaching.indexOf('Vorige keer: 62') !== -1, 'D: previous alleen als context genoemd');
ok(!/houd 62 kg aan/i.test(c1.coaching), 'D: geen imperatief "houd 62 kg aan"');
ok(!/62 kg mogelijk/i.test(c1.coaching), 'E: geen tweede "62 kg mogelijk"-advies');
// exact één "Vandaag: <getal>" en dat getal == prescription
const m = c1.coaching.match(/Vandaag:\s*([0-9,]+)\s*kg/);
ok(m && m[1].replace(',','.') === '57', 'E: enige "Vandaag"-getal == prescription (57)');
ok(/meer herhalingen/i.test(c1.coaching) || /herstel/i.test(c1.coaching), 'rationale-zin aanwezig (waarom lichter)');

// ── buildPrevBlock: toont de prescription, niet meer "houd/richting" ──
const pb = buildPrevBlock(prev62, ex57, 57);
ok(pb.indexOf('62 kg × 1') !== -1, 'prev-block toont vorige prestatie');
ok(pb.indexOf('Vandaag 57 kg') !== -1, 'prev-block verwijst naar de actuele prescription (57)');
ok(!/houd 62 kg aan/i.test(pb) && !/richting/i.test(pb), 'prev-block: geen oud vorige+delta-advies');
// prev-block getal == contract prescription
ok(pb.indexOf('57') !== -1 && pb.indexOf('houd') === -1, 'prev-block toont geen concurrerend getal');

// ── adversarieel: gelijk gewicht, progressie, geen recovery, bodyweight ──
const cEqual = buildPrescriptionContract({sets:3,reps:'5',rpe:'8',suggestedWeight:80}, {weight:80,reps:5,rpe:8}, 80);
ok(/gelijk/i.test(cEqual.coaching), 'gelijk gewicht → "gelijk"-uitleg');
const cUp = buildPrescriptionContract({sets:3,reps:'5',rpe:'8',suggestedWeight:85}, {weight:80,reps:5,rpe:8}, 85);
ok(cUp.rationale.via.indexOf('progressie') !== -1 && /zwaarder|opbouw/i.test(cUp.coaching), 'zwaarder → progressie-uitleg');
// K: bodyweight / geen prescription-gewicht → GEEN verzonnen getal in coaching
const cBw = buildPrescriptionContract({sets:3,reps:'10',rpe:null,suggestedWeight:null}, {weight:0,reps:10,rpe:null}, null);
ok(cBw.coaching.indexOf('Vandaag:') === -1, 'K: geen prescription-gewicht → geen verzonnen "Vandaag"-getal');
// geen previous → geen coaching (geen fake personalisatie)
eq(buildPrescriptionContract(ex57, null, 57).coaching, '', 'geen previous → lege coaching');
// weight null als rxWeight ontbreekt en geen suggestedWeight
eq(buildPrescriptionContract({sets:3,reps:'5'}, {weight:50,reps:5,rpe:8}, null).prescription.weight, null, 'geen bron → weight null (geen fabricatie)');

// ── MEDIA-OWNER: MOVEKIT PRIMAIR — MoveKit > YouTube > poster > none ──
_posterReturn = 'data:poster'; _movekitVideo = null;
// MoveKit via expliciet ex.video wint van YouTube
eq(resolveExerciseMedia({video:'videos/squat.mp4', yt:'ABC', canonicalId:'TK-1'}).kind, 'mp4', 'MoveKit (ex.video) wint van YouTube');
eq(resolveExerciseMedia({video:'videos/squat.mp4', yt:'ABC'}).source, 'movekit', 'source=movekit');
eq(resolveExerciseMedia({video:'videos/squat.mp4'}).type, 'movekit', 'type=movekit');
eq(resolveExerciseMedia({video:'videos/squat.mp4'}).poster, 'data:poster', 'MoveKit krijgt poster als preview');
// MoveKit via naam/id-resolutie (ExerciseAssetProvider) wint OOK van YouTube, zónder ex.video (legacy-oefening)
_movekitVideo = 'videos/wall-sit.mp4';
eq(resolveExerciseMedia({id:'legacy-squat', yt:'ABC'}).kind, 'mp4', 'ADVERSARIEEL: MoveKit (naam-resolutie) wint van YouTube ook zonder ex.video');
eq(resolveExerciseMedia({id:'legacy-squat', yt:'ABC'}).src, 'videos/wall-sit.mp4', 'MoveKit-src uit provider');
// GEEN MoveKit → YouTube fallback
_movekitVideo = null;
eq(resolveExerciseMedia({id:'x', yt:'ABC'}).kind, 'yt', 'geen MoveKit → YouTube fallback');
eq(resolveExerciseMedia({id:'x', yt:'ABC'}).source, 'youtube', 'source=youtube bij fallback');
// geen video → poster
_posterReturn = 'data:poster';
eq(resolveExerciseMedia({id:'x'}).kind, 'poster', 'geen video → poster (fallback)');
eq(resolveExerciseMedia({id:'x'}).type, 'poster', 'type=poster');
// niets → nette empty state
_posterReturn = null;
eq(resolveExerciseMedia({id:'x'}).kind, 'none', 'niets → none');
eq(resolveExerciseMedia({id:'x'}).available, false, 'none → available:false (nette empty state)');
_movekitVideo = null; _posterReturn = null;

// ── PROGRAMMA: één prescription-truth; gewicht volgt de (recovery-aangepaste) RPE (C3 by construction) ──
const CalcCore = require('./calculation.js');
const repsPrefillFromRange = eval('(' + extractFn('repsPrefillFromRange') + ')');
const resolvePrescriptionRepTarget = eval('(' + extractFn('resolvePrescriptionRepTarget') + ')');
const suggestWeightForRepsRpe = eval('(' + extractFn('suggestWeightForRepsRpe') + ')');
const computeProgPrefill = eval('(' + extractFn('computeProgPrefill') + ')');

// ── REP-RANGE PREFILL: range → MAXIMUM; exact → exact; ongeldig → '' (geen fabricatie) ──
eq(resolvePrescriptionRepTarget('3-5'), 5, '"3-5" → 5 (maximum van de range)');
eq(resolvePrescriptionRepTarget('4-6'), 6, '"4-6" → 6');
eq(resolvePrescriptionRepTarget('5-8'), 8, '"5-8" → 8');
eq(resolvePrescriptionRepTarget('6-10'), 10, '"6-10" → 10');
eq(resolvePrescriptionRepTarget('8-12'), 12, '"8-12" → 12');
eq(resolvePrescriptionRepTarget('10-15'), 15, '"10-15" → 15');
eq(resolvePrescriptionRepTarget('3–5'), 5, 'en-dash "3–5" → 5');
eq(resolvePrescriptionRepTarget('3 – 5'), 5, 'spaties "3 – 5" → 5');
eq(resolvePrescriptionRepTarget('3-5 reps'), 5, '"3-5 reps" → 5');
eq(resolvePrescriptionRepTarget('5'), 5, 'exact "5" → 5');
eq(resolvePrescriptionRepTarget('10'), 10, 'exact "10" → 10');
eq(resolvePrescriptionRepTarget(5), 5, 'getal 5 → 5');
eq(resolvePrescriptionRepTarget(10), 10, 'getal 10 → 10');
eq(resolvePrescriptionRepTarget(null), '', 'null → "" (geen fabricatie)');
eq(resolvePrescriptionRepTarget(undefined), '', 'undefined → ""');
eq(resolvePrescriptionRepTarget(''), '', 'leeg → ""');
eq(resolvePrescriptionRepTarget('abc'), '', 'onleesbaar → ""');
eq(resolvePrescriptionRepTarget(0), '', '0 → "" (geen 0-reps)');
// computeProgPrefill: prefill-reps = MAXIMUM, maar gewicht ONGEWIJZIGD (op low-end)
const pr = computeProgPrefill({reps:'3-5', rpe:'8', sets:4}, {weight:100, reps:1}, 62);
eq(pr.reps, 5, 'prog-prefill reps = 5 (max), NIET low-end 3 en NIET vorige-reps 1');
eq(parseFloat(pr.kg), suggestWeightForRepsRpe(62, parseFloat(repsPrefillFromRange('3-5')), '8'), 'prog-prefill gewicht ongewijzigd (berekend op low-end, niet op max)');
// adversarieel: vorige reps (1 of 12) mag de prescription-prefill NOOIT overschrijven — resolver is bronloos
eq(resolvePrescriptionRepTarget('3-5'), 5, 'adversarieel: prefill blijft 5 ongeacht vorige reps=1');

const p8  = computeProgPrefill({reps:'3-5', rpe:'8',   sets:4}, null, 62);
const p75 = computeProgPrefill({reps:'3-5', rpe:'7.5', sets:4}, null, 62);
ok(parseFloat(p75.kg) <  parseFloat(p8.kg), 'Programma: lagere (recovery-)RPE → lichter gewicht (gewicht volgt RPE)');
eq(p75.rpe, '7.5', 'Programma prefill RPE = item-RPE (aangepast)');
const sugItem = suggestWeightForRepsRpe(62, parseFloat(repsPrefillFromRange('3-5')), '7.5');
eq(parseFloat(p75.kg), sugItem, 'Programma: prefill.kg == suggestedWeight (één bron, geen dubbele berekening)');
const cProg = buildPrescriptionContract({sets:4,reps:'3-5',rpe:'7.5',suggestedWeight:sugItem}, {weight:62,reps:1,rpe:8}, sugItem);
eq(cProg.prescription.weight, sugItem, 'Programma-contract: prescription = canonical getal');
ok(cProg.coaching.indexOf('Vorige keer: 62')!==-1 && !/houd 62/i.test(cProg.coaching), 'Programma-coaching: 62 alleen als vorige keer, geen imperatief');

/* ── SPRINT 11 — DE VANDAAG-KAART TOONT HETZELFDE GETAL ────────────────────
 * DEFECT (v4.34.0 en eerder): de VANDAAG-kaart in Execution las uitsluitend
 * ex.suggestedWeight. Bij een vaste training staat dat veld er niet in, dus toonde de kaart
 * "nog te bepalen" terwijl de setvelden en het "Vorige keer"-blok op HETZELFDE scherm 95 kg
 * lieten zien. Eén scherm, twee antwoorden. */
const rxBron = html.slice(html.indexOf('const rxWeight=(prefillData&&prefillData.kg!=null)'),
                          html.indexOf('const rxWeight=(prefillData&&prefillData.kg!=null)') + 1400);
ok(rxBron.indexOf('window._rxWeightMap[ex.id]=rxWeight;') > 0,
   'Sprint 11: het bepaalde rxWeight wordt beschikbaar gesteld aan de VANDAAG-kaart');
const todayBron = html.slice(html.indexOf("const w=(_rx!=null)") - 400, html.indexOf("const w=(_rx!=null)") + 200);
ok(/cur\.suggestedWeight!=null\)\?cur\.suggestedWeight:\(\(window\._rxWeightMap/.test(todayBron),
   'Sprint 11: de VANDAAG-kaart valt terug op datzelfde rxWeight');
ok(!/const w=\(cur\.suggestedWeight!=null\)\?\(String\(cur\.suggestedWeight\)/.test(html),
   'Sprint 11: de oude, alleen-suggestedWeight-versie is weg');
ok(/'nog te bepalen'/.test(todayBron),
   'Sprint 11: zonder enig prescription-getal blijft "nog te bepalen" staan (geen verzonnen gewicht)');
// gedrag: exact de expressie uit index.html
function vandaagGewicht(suggested, rxMap, id){
  const cur={suggestedWeight:suggested,id:id};
  const window_={_rxWeightMap:rxMap};
  const _rx=(cur.suggestedWeight!=null)?cur.suggestedWeight:((window_._rxWeightMap&&window_._rxWeightMap[cur.id]!=null)?window_._rxWeightMap[cur.id]:null);
  return (_rx!=null)?(String(_rx).replace('.',',')+' kg'):'nog te bepalen';
}
eq(vandaagGewicht(null,{sq:95},'sq'), '95 kg', 'Sprint 11: vaste training toont het prefill-gewicht');
eq(vandaagGewicht(80,{sq:95},'sq'), '80 kg', 'Sprint 11: een expliciete suggestie wint (programma-pad ongewijzigd)');
eq(vandaagGewicht(null,{sq:null},'sq'), 'nog te bepalen', 'Sprint 11: geen getal -> geen verzonnen gewicht');
eq(vandaagGewicht(null,{},'sq'), 'nog te bepalen', 'Sprint 11: onbekende oefening -> geen verzonnen gewicht');
eq(vandaagGewicht(null,{sq:97.5},'sq'), '97,5 kg', 'Sprint 11: decimaal met NL-komma, zoals elders in de app');

console.log('\nPrescription consistency + media: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
