/* fGymTemplateRls.test.js — MS-F11-02 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v515.sql'), 'utf8');

ok(migratie.includes('cpa_org_staff_wijst_toe') &&
   migratie.includes("public.org_has_role(organization_id, array['owner','admin','staff'])") &&
   migratie.includes('org_user_has_role(organization_id, athlete_user_id'),
  'A1: de assignment-policy controleert zowel de staff-rol van de aanmaker als het lidmaatschap van de athlete');

ok(migratie.includes('org_user_has_role(p_org_id text, p_user_id uuid') && migratie.includes('m.user_id = p_user_id'),
  'B1: org_user_has_role() accepteert een expliciete user_id-parameter');

ok((migratie.match(/create or replace function public\.materialize_coach_assignment/g) || []).length === 1,
  'C1: er bestaat uitsluitend één materialize_coach_assignment()-functie');
ok(migratie.includes('if v_assignment.organization_id is not null then') &&
   migratie.includes('org_user_has_role(v_assignment.organization_id, v_assignment.athlete_user_id'),
  'C2: de bestaande RPC vertakt correct naar de organization-membership-check');
ok(migratie.includes("coach_has_scope(v_assignment.coach_user_id, v_assignment.athlete_user_id, 'TRAINING_CORE')"),
  'C3: de bestaande F10-coach-relatie-check blijft intact (geen regressie)');

ok(!/using\s*\(\s*true\s*\)/i.test(migratie), 'D1: geen enkele policy gebruikt een blanco USING (true)-shortcut');
ok(migratie.includes('cpt_org_member_leest') && migratie.includes("'owner','admin','staff','member'"),
  'D2: leden mogen organization-templates lezen, ook zonder staff-rol');

ok(migratie.includes('revoke execute on function public.org_user_has_role(text, uuid, text[]) from anon'),
  'E1: org_user_has_role() heeft geen EXECUTE-recht voor anon');

console.log('fGymTemplateRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
