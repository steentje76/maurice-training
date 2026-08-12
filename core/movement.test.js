/* TrainingKompas — Movement Core test suite (node, standalone). F19 MoveKit name-mapping.
 * Draai: node core/movement.test.js
 * Bewijst: deterministische naam->slug mapping, veilige (conservatieve) aliassen, geen verkeerde koppelingen, purity. */
const fs = require('fs');
const path = require('path');
const M = require('./movement.js');

let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); console.log('  ✓ ' + n); pass++; } catch (e) { console.log('  ✗ ' + n + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + b + ', kreeg ' + a); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

console.log('\n[A] normSlug — naam -> slug (zelfde vorm als MoveKit provider_id)');
T('spaties/hoofdletters -> koppel-slug', () => { eq(M.normSlug('Bench Press'), 'bench-press'); eq(M.normSlug('Overhead Press'), 'overhead-press'); });
T('haakjes/leestekens genormaliseerd', () => { eq(M.normSlug('Deadlift (conventioneel)'), 'deadlift-conventioneel'); });
T('& -> and', () => eq(M.normSlug('Clean & Press'), 'clean-and-press'));
T('leeg/null -> lege string', () => { eq(M.normSlug(''), ''); eq(M.normSlug(null), ''); eq(M.normSlug(undefined), ''); });

console.log('\n[B] slugForName — geverifieerde barbell/bodyweight koppelingen');
T('Backsquat -> barbell-squat', () => eq(M.slugForName('Backsquat'), 'barbell-squat'));
T('Benchpress / Bench Press -> barbell-bench-press', () => { eq(M.slugForName('Benchpress'), 'barbell-bench-press'); eq(M.slugForName('Bench Press'), 'barbell-bench-press'); });
T('Paused Bench -> barbell-bench-press', () => eq(M.slugForName('Paused Bench'), 'barbell-bench-press'));
T('Incline Bench Press -> barbell-incline-bench-press', () => eq(M.slugForName('Incline Bench Press'), 'barbell-incline-bench-press'));
T('Bent Over Row -> barbell-bent-over-row', () => eq(M.slugForName('Bent Over Row'), 'barbell-bent-over-row'));
T('Overhead Press / Shoulder Press / OHP -> barbell-overhead-press', () => { eq(M.slugForName('Overhead Press'), 'barbell-overhead-press'); eq(M.slugForName('Shoulder Press'), 'barbell-overhead-press'); eq(M.slugForName('OHP'), 'barbell-overhead-press'); });
T('Deadlift (conventioneel) -> barbell-deadlift', () => { eq(M.slugForName('Deadlift'), 'barbell-deadlift'); eq(M.slugForName('Deadlift (conventioneel)'), 'barbell-deadlift'); });
T('Good Morning -> good-mornings', () => eq(M.slugForName('Good Morning'), 'good-mornings'));
T('Pull-ups / Chin-ups (bodyweight)', () => { eq(M.slugForName('Pull-ups'), 'pull-ups'); eq(M.slugForName('Chin Up'), 'chin-ups'); });
T('Leg Press -> machine-leg-press', () => eq(M.slugForName('Leg Press'), 'machine-leg-press'));

console.log('\n[C] passthrough — exacte provider_id-namen zonder alias');
T('Box Jump / Burpee -> ongewijzigde slug (bestaat als provider_id)', () => { eq(M.slugForName('Box Jump'), 'box-jump'); eq(M.slugForName('Burpee'), 'burpee'); });
T('onbekende naam -> genormaliseerde slug (provider levert dan null)', () => eq(M.slugForName('CrossFit WOD'), 'crossfit-wod'));
T('leeg/null -> null (geen koppeling)', () => { eq(M.slugForName(''), null); eq(M.slugForName(null), null); });

console.log('\n[D] VEILIGHEID — geen biomechanisch verkeerde koppeling');
T('Dumbbell Bench Press wordt NIET naar barbell gemapt', () => { eq(M.slugForName('Dumbbell Bench Press'), 'dumbbell-bench-press'); ok(M.slugForName('Dumbbell Bench Press') !== 'barbell-bench-press'); });
T('Front Squat wordt NIET naar back squat gemapt (geen alias, geen fout beeld)', () => { ok(M.slugForName('Frontsquat') !== 'barbell-squat'); ok(M.slugForName('Front Squat') !== 'barbell-squat'); });
T('Romanian Deadlift / Sumo Deadlift NIET naar conventional gemapt', () => { ok(M.slugForName('Romanian Deadlift') !== 'barbell-deadlift'); ok(M.slugForName('Deadlift (sumo)') !== 'barbell-deadlift'); });
T('Hexabar Deadlift NIET naar barbell-deadlift', () => ok(M.slugForName('Hexabar Deadlift') !== 'barbell-deadlift'));
T('Hang Power Snatch NIET naar power snatch/snatch', () => { ok(M.slugForName('Hang Power Snatch') !== 'barbell-power-snatch'); ok(M.slugForName('Hang Power Snatch') !== 'barbell-snatch'); });
T('elke alias-waarde is een niet-lege slug-string', () => { Object.keys(M.ALIASES).forEach(function (k) { ok(typeof M.ALIASES[k] === 'string' && /^[a-z0-9-]+$/.test(M.ALIASES[k]), 'ongeldige alias-target: ' + k); }); });

console.log('\n[E] determinisme + purity');
T('deterministisch', () => { eq(M.slugForName('Backsquat'), M.slugForName('Backsquat')); eq(M.normSlug('X Y'), M.normSlug('X Y')); });
const RAW = fs.readFileSync(path.join(__dirname, 'movement.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
T('movement-core bevat geen DOM/DB/AI/network/Date', () => {
  ['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest', 'new Date', 'Date.now', 'Math.random'].forEach(function (tok) { ok(RAW.indexOf(tok) === -1, 'verboden token: ' + tok); });
});
T('VERSION aanwezig', () => eq(M.VERSION, 'movement_map.v1'));

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: movement-core faalt.'); process.exit(1); }
console.log('✅ Alle movement-tests groen.');
