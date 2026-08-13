/* TrainingKompas — Athlete Constraints Core test suite (node, standalone). F23 equipment & avoid.
 * Draai: node core/athleteConstraints.test.js
 * Bewijst: veilige equipment-normalisatie/filter, avoid EXACT vs AMBIGUOUS, geen lege training, purity. */
const fs = require('fs');
const path = require('path');
const A = require('./athleteConstraints.js');

let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); console.log('  ✓ ' + n); pass++; } catch (e) { console.log('  ✗ ' + n + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + b + ', kreeg ' + a); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const deq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const names = r => r.kept.map(x => x.name);

console.log('\n[A] normalizeEquipment — sporter-invoer → canonieke set');
T('slugs → canoniek, bodyweight altijd erbij', () => {
  var s = A.normalizeEquipment(['dumbbells', 'kettlebell']);
  ok(s['dumbbell'] && s['kettlebell'] && s['bodyweight']); ok(!s['barbell']);
});
T('machines → machine + cable machine', () => { var s = A.normalizeEquipment(['machines']); ok(s['machine'] && s['cable machine']); });
T('vrije tekst: halterstang→barbell, banden→band', () => { var s = A.normalizeEquipment(['halterstang', 'banden']); ok(s['barbell'] && s['band']); });
T('onbekend/geen-filterdimensie: rack/bench/pullup_bar → niets', () => { deq(A.normalizeEquipItem('rack'), []); deq(A.normalizeEquipItem('bench'), []); deq(A.normalizeEquipItem('gewicht'), []); });
T('lege invoer → alleen bodyweight', () => { var s = A.normalizeEquipment([]); ok(s['bodyweight']); eq(Object.keys(s).length, 1); });

console.log('\n[B] allowedByEquipment — verifieerbaar uitsluiten');
T('barbell-oefening zonder barbell → niet toegestaan', () => { var r = A.allowedByEquipment(['barbell'], A.normalizeEquipment(['dumbbells'])); ok(!r.allowed); eq(r.reason, 'equipment'); });
T('dumbbell-oefening mét dumbbell → toegestaan', () => { ok(A.allowedByEquipment(['dumbbell'], A.normalizeEquipment(['dumbbells'])).allowed); });
T('bodyweight → altijd toegestaan', () => { ok(A.allowedByEquipment(['bodyweight'], A.normalizeEquipment([])).allowed); });
T('onbekende/lege equipment → toegestaan (unknown, niet uitsluiten)', () => { var r = A.allowedByEquipment([], A.normalizeEquipment(['dumbbells'])); ok(r.allowed); eq(r.reason, 'unknown'); });

console.log('\n[C] avoidMatch — EXACT vs AMBIGUOUS vs UNKNOWN');
T('exacte naam → exact', () => eq(A.avoidMatch('Sumo Deadlift', 'Sumo Deadlift'), 'exact'));
T('"deadlift" bij "Sumo Deadlift" → ambiguous (substring)', () => eq(A.avoidMatch('deadlift', 'Sumo Deadlift'), 'ambiguous'));
T('geen relatie → unknown', () => eq(A.avoidMatch('Bench Press', 'Barbell Squat'), 'unknown'));
T('F24 alias "sumo dl" → Sumo Deadlift exact', () => eq(A.avoidMatch('sumo dl', 'Sumo Deadlift'), 'exact'));
T('F24 alias "rdl" → Romanian Deadlift exact', () => eq(A.avoidMatch('rdl', 'Romanian Deadlift'), 'exact'));
T('F24 "deadlift" blijft ambiguous bij varianten (geen alias)', () => {
  eq(A.avoidMatch('deadlift', 'Sumo Deadlift'), 'ambiguous');
  eq(A.avoidMatch('deadlift', 'Romanian Deadlift'), 'ambiguous');
});
T('F24 alias sluit alleen de juiste variant uit (applyConstraints)', () => {
  var c = [{ name: 'Sumo Deadlift' }, { name: 'Romanian Deadlift' }, { name: 'Barbell Deadlift' }];
  var r = A.applyConstraints(c, { avoidTerms: ['sumo dl'] });
  ok(r.kept.map(x => x.name).indexOf('Sumo Deadlift') === -1, 'sumo eruit');
  eq(r.kept.length, 2, 'andere varianten blijven');
});

console.log('\n[D] applyConstraints — equipment-filter');
var GYMSET = null; // geen availableSet = geen filter
var HOME_DB = A.normalizeEquipment(['dumbbells']);
var CANDS = [
  { name: 'Barbell Squat', equipment: ['barbell'] },
  { name: 'Dumbbell Goblet Squat', equipment: ['dumbbell'] },
  { name: 'Pull Ups', equipment: ['bodyweight'] },
  { name: 'Assault Bike', equipment: null }, // onbekend
  { name: 'Kettlebell Swing', equipment: ['kettlebell'] }
];
T('CASE thuis+dumbbell: barbell-oefening eruit, dumbbell/bodyweight/onbekend blijven', () => {
  var r = A.applyConstraints(CANDS, { availableSet: HOME_DB });
  ok(names(r).indexOf('Barbell Squat') === -1, 'barbell moet weg');
  ok(names(r).indexOf('Dumbbell Goblet Squat') !== -1);
  ok(names(r).indexOf('Pull Ups') !== -1, 'bodyweight blijft');
  ok(names(r).indexOf('Assault Bike') !== -1, 'onbekend blijft');
  ok(names(r).indexOf('Kettlebell Swing') === -1, 'geen kettlebell → eruit');
});
T('CASE thuis+dumbbell+kettlebell: beide bruikbaar', () => {
  var r = A.applyConstraints(CANDS, { userEquipment: ['dumbbells', 'kettlebell'] });
  ok(names(r).indexOf('Dumbbell Goblet Squat') !== -1 && names(r).indexOf('Kettlebell Swing') !== -1);
  ok(names(r).indexOf('Barbell Squat') === -1);
});
T('CASE gym / geen availableSet → geen equipment-filter (alles blijft)', () => {
  var r = A.applyConstraints(CANDS, { availableSet: GYMSET });
  eq(r.kept.length, CANDS.length);
});
T('diagnostics benoemen wat en waarom', () => {
  var r = A.applyConstraints(CANDS, { availableSet: HOME_DB });
  ok(r.diagnostics.excluded_by_equipment.indexOf('Barbell Squat') !== -1);
  ok(r.diagnostics.unresolved_equipment.indexOf('Assault Bike') !== -1);
});

console.log('\n[E] applyConstraints — avoid-filter');
T('CASE avoid "Sumo Deadlift" → exact eruit', () => {
  var c = [{ name: 'Sumo Deadlift', equipment: ['barbell'] }, { name: 'Barbell Squat', equipment: ['barbell'] }];
  var r = A.applyConstraints(c, { avoidTerms: ['Sumo Deadlift'] });
  ok(names(r).indexOf('Sumo Deadlift') === -1 && names(r).indexOf('Barbell Squat') !== -1);
  ok(r.diagnostics.excluded_by_avoid.indexOf('Sumo Deadlift') !== -1);
});
T('CASE ambigu "deadlift" → varianten BLIJVEN (niet onterecht verwijderen)', () => {
  var c = [{ name: 'Sumo Deadlift', equipment: ['barbell'] }, { name: 'Barbell Deadlift', equipment: ['barbell'] }, { name: 'Romanian Deadlift', equipment: ['barbell'] }];
  var r = A.applyConstraints(c, { avoidTerms: ['deadlift'] });
  eq(r.kept.length, 3);
  ok(r.diagnostics.unresolved_avoid.length >= 1, 'ambiguïteit gerapporteerd');
});
T('onbekende avoid-oefening → niets uitgesloten', () => {
  var c = [{ name: 'Barbell Squat', equipment: ['barbell'] }];
  var r = A.applyConstraints(c, { avoidTerms: ['iets wat niet bestaat'] });
  eq(r.kept.length, 1);
});

console.log('\n[F] combinatie + veilige fallback + oud gedrag');
T('equipment + avoid samen', () => {
  var r = A.applyConstraints(CANDS.concat([{ name: 'Sumo Deadlift', equipment: ['barbell'] }]), { availableSet: HOME_DB, avoidTerms: ['Sumo Deadlift'] });
  ok(names(r).indexOf('Sumo Deadlift') === -1 && names(r).indexOf('Barbell Squat') === -1 && names(r).indexOf('Dumbbell Goblet Squat') !== -1);
});
T('CASE geen kandidaten na filter → veilige fallback naar originele set', () => {
  var onlyBarbell = [{ name: 'Barbell Squat', equipment: ['barbell'] }, { name: 'Barbell Bench Press', equipment: ['barbell'] }];
  var r = A.applyConstraints(onlyBarbell, { availableSet: A.normalizeEquipment(['bands']) });
  eq(r.kept.length, 2, 'nooit lege training'); ok(r.diagnostics.fellBack === true);
});
T('CASE geen equipment/avoid context → exact oud gedrag (ongefilterd)', () => {
  var r = A.applyConstraints(CANDS, {});
  eq(r.kept.length, CANDS.length);
});

console.log('\n[G] Purity — geen DOM/DB/AI/Date');
T('geen verboden tokens', () => {
  var raw = fs.readFileSync(path.join(__dirname, 'athleteConstraints.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ['document', 'localStorage', 'sessionStorage', 'querySelector', 'XMLHttpRequest', 'new Date', 'Date.now', 'supabase'].forEach(t => ok(raw.indexOf(t) === -1, 'verboden: ' + t));
  ok(!/fetch\s*\(/.test(raw)); ok(!/\.from\s*\(/.test(raw));
});

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ Athlete Constraints Core niet groen.'); process.exit(1); }
console.log('✅ Athlete Constraints Core groen.');
