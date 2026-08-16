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
const ExerciseAssetProvider = undefined; // pad valt terug op ex.video/ex.yt
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

// ── MEDIA-OWNER: mp4 → yt → poster → none, met juiste prioriteit ──
_posterReturn = 'data:poster';
eq(resolveExerciseMedia({video:'videos/squat.mp4', yt:'ABC', canonicalId:'TK-1'}).kind, 'mp4', 'mp4 wint van yt');
eq(resolveExerciseMedia({video:'videos/squat.mp4'}).src, 'videos/squat.mp4', 'mp4 src doorgegeven');
eq(resolveExerciseMedia({video:'videos/squat.mp4'}).poster, 'data:poster', 'mp4 krijgt poster als preview');
eq(resolveExerciseMedia({yt:'ABC'}).kind, 'yt', 'geen mp4 → yt');
eq(resolveExerciseMedia({yt:'ABC'}).src, 'ABC', 'yt src doorgegeven');
_posterReturn = 'data:poster';
eq(resolveExerciseMedia({}).kind, 'poster', 'geen video → poster');
_posterReturn = null;
eq(resolveExerciseMedia({}).kind, 'none', 'niets → none (nette fallback)');

console.log('\nPrescription consistency + media: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
