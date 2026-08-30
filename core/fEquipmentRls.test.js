/* fEquipmentRls.test.js — MS-F11-02 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v514.sql'), 'utf8');

ok(migratie.includes('equipment_catalog_owner_chk') &&
   migratie.includes('gym_id is not null and user_id is null and organization_id is null') &&
   migratie.includes('gym_id is null and user_id is null and organization_id is not null'),
  'A1: equipment_catalog_owner_chk staat expliciet drie mutueel exclusieve contexten toe');

ok(migratie.includes("raise exception 'Alleen staff/admin/owner van de organisatie mag de apparatuur-catalogus beheren'"),
  'B1: de trigger weigert equipment-beheer aan niet-staff-leden van een organisatie');
ok(migratie.includes("raise exception 'Alleen staff/admin/owner van de organisatie mag exercise-equipment-mappings beheren'"),
  'B2: dezelfde weigering geldt voor exercise_equipment-mappings');

{
  const eersteFunctieBlok = migratie.split('create or replace function public.set_equipment_catalog_owner')[1].split('$$;')[0];
  const orgCheckIndex = eersteFunctieBlok.indexOf('NEW.organization_id is not null');
  const gymCheckIndex = eersteFunctieBlok.indexOf('caller_gym_id is not null');
  ok(orgCheckIndex !== -1 && gymCheckIndex !== -1 && orgCheckIndex < gymCheckIndex,
    'C1: de organization_id-check staat vóór de impliciete gym_id-check');
}

ok(!/create table.*exercise_equipment.*exercise_name/i.test(migratie) && !migratie.includes('exercise_label'),
  'D1: geen nieuw, vrij-tekst exercise-identiteitsveld toegevoegd');

ok(migratie.includes('BEWUST GEEN vergelijkbare CHECK-constraint') || migratie.toLowerCase().includes('geen destructieve wijziging'),
  'E1: de bestaande, inconsistente historische rij wordt eerlijk gedocumenteerd, niet stilzwijgend verwijderd');

console.log('fEquipmentRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
