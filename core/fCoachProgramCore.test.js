/* fCoachProgramCore.test.js — MS-F10-03 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CP = require(path.join(ROOT, 'core/coachProgram.js'));
const CA = require(path.join(ROOT, 'core/coachAccess.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const template = { id: 'T1', coach_user_id: 'C1', revision: 1 };
const rels = [{ id: 'R1', coach_user_id: 'C1', athlete_user_id: 'A1', status: 'active' }];
const scopesAan = [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }];
const scopesUit = [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: false }];

ok(CP.canManageTemplate('C1', template) === true, 'A1: de coach-eigenaar mag de eigen template beheren');
ok(CP.canManageTemplate('C2', template) === false, 'A2: een andere coach mag een andermans template niet beheren');

ok(CP.canAssignTemplate('C1', 'A1', template, rels, scopesAan, CA) === true, 'B1: geldige relatie + TRAINING_CORE -> mag toewijzen');
ok(CP.canAssignTemplate('C1', 'A1', template, rels, scopesUit, CA) === false, 'B2: TRAINING_CORE uit -> mag niet toewijzen');
ok(CP.canAssignTemplate('C1', 'A2', template, rels, scopesAan, CA) === false, 'B3: geen relatie met deze athlete -> mag niet toewijzen');
{
  const andermansTemplate = { id: 'T2', coach_user_id: 'C2', revision: 1 };
  ok(CP.canAssignTemplate('C1', 'A1', andermansTemplate, rels, scopesAan, CA) === false,
    'B4: een coach mag nooit andermans template toewijzen');
}

ok(CP.canMaterializeAssignment('A1', { athlete_user_id: 'A1' }) === true, 'C1: de athlete mag de eigen assignment materialiseren');
ok(CP.canMaterializeAssignment('C1', { athlete_user_id: 'A1' }) === false, 'C2: de coach mag nooit zelf materialiseren');
ok(CP.canMaterializeAssignment('A2', { athlete_user_id: 'A1' }) === false, 'C3: een andere athlete mag niet materialiseren');

ok(CP.isAlreadyMaterialized({ materialized_program_id: 123 }) === true, 'D1: een reeds gematerialiseerde assignment wordt correct herkend');
ok(CP.isAlreadyMaterialized({ materialized_program_id: null }) === false, 'D2: een nog niet gematerialiseerde assignment wordt correct herkend');

ok(CP.nextRevision({ revision: 1 }) === 2, 'E1: revisie wordt correct opgehoogd');
ok(CP.nextRevision(null) === 1, 'E2: ontbrekende template geeft veilig revisie 1');

// ---- F. validateTemplateContent: server-side spiegel van de RPC-validatie ----
const knownExercises = ['power_clean', 'bike_erg'];
{
  const geldig = { schema_version: 1, days: [{ week_nr: 1, day_offset: 0, training_name: 'Dag 1', exercises: [{ exercise_id: 'power_clean', sets: 5, reps: '5' }] }] };
  ok(CP.validateTemplateContent(geldig, knownExercises).valid === true, 'F1: een correcte, volledige template valideert als geldig');
}
ok(CP.validateTemplateContent(null, knownExercises).valid === false, 'F2: ontbrekende content is ongeldig');
ok(CP.validateTemplateContent({ schema_version: 2, days: [] }, knownExercises).valid === false, 'F3: onbekende schema_version is ongeldig');
ok(CP.validateTemplateContent({ schema_version: 1, days: [] }, knownExercises).valid === false, 'F4: lege days-array is ongeldig');
{
  const onbekendExercise = { schema_version: 1, days: [{ week_nr: 1, day_offset: 0, training_name: 'D', exercises: [{ exercise_id: 'niet-bestaand', sets: 5 }] }] };
  const result = CP.validateTemplateContent(onbekendExercise, knownExercises);
  ok(result.valid === false && result.errors.some(function (e) { return e.indexOf('onbekend exercise_id') !== -1; }),
    'F5: een niet-canoniek exercise_id wordt geweigerd, met een duidelijke foutmelding');
}
{
  const negatieveSets = { schema_version: 1, days: [{ week_nr: 1, day_offset: 0, training_name: 'D', exercises: [{ exercise_id: 'power_clean', sets: -3 }] }] };
  ok(CP.validateTemplateContent(negatieveSets, knownExercises).valid === false, 'F6: negatieve sets worden geweigerd');
}
{
  const duplicaat = { schema_version: 1, days: [{ week_nr: 1, day_offset: 0, training_name: 'D', exercises: [{ exercise_id: 'power_clean', sets: 5 }, { exercise_id: 'power_clean', sets: 3 }] }] };
  ok(CP.validateTemplateContent(duplicaat, knownExercises).valid === false, 'F7: een duplicate exercise_id binnen dezelfde dag wordt geweigerd');
}
{
  const ongeldigeWeek = { schema_version: 1, days: [{ week_nr: 0, day_offset: 0, training_name: 'D', exercises: [{ exercise_id: 'power_clean', sets: 5 }] }] };
  ok(CP.validateTemplateContent(ongeldigeWeek, knownExercises).valid === false, 'F8: week_nr moet positief zijn (0 is ongeldig)');
}

console.log('fCoachProgramCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
