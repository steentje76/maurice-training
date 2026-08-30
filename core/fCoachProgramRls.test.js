/* fCoachProgramRls.test.js — MS-F10-03 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v509.sql'), 'utf8');

ok(!/create policy[\s\S]{0,60}on public\.programs/i.test(migratie),
  'A1: dit bestand voegt geen policy toe aan public.programs (de trigger-invariant blijft onaangeraakt)');

ok(migratie.includes("v_assignment.athlete_user_id <> auth.uid()") && migratie.includes('raise exception'),
  'B1: de RPC controleert dat de aanroeper de athlete van de assignment is');

ok(migratie.includes('v_template.title, v_template.sport'),
  'C1: de RPC kopieert uitsluitend vooraf bepaalde velden uit de template');
ok(!/create or replace function public\.materialize_coach_assignment\([^)]*jsonb[^)]*\)/.test(migratie),
  'C2: de RPC-signatuur accepteert geen vrije payload-parameter');

ok(migratie.includes('if v_assignment.materialized_program_id is not null then') && migratie.includes('return v_assignment.materialized_program_id'),
  'D1: de RPC is idempotent');

ok(migratie.includes('revoke execute on function public.materialize_coach_assignment(uuid) from anon'),
  'E1: anon heeft geen EXECUTE-recht op de materialisatie-RPC');
ok(migratie.includes("set search_path = public"),
  'E2: de RPC heeft een vastgezette search_path');

ok(migratie.includes('cpt_athlete_leest_via_assignment') && migratie.includes('a.athlete_user_id = auth.uid()'),
  'F1: een athlete kan een template uitsluitend lezen via een assignment die aan haar is gericht');

// ---- G. Content-materialisatie: canonieke keten, geen tweede workoutmodel ----
const migratie510 = fs.readFileSync(path.join(ROOT, 'migratie_v510.sql'), 'utf8');
ok(migratie510.includes('insert into public.program_blocks') && migratie510.includes('insert into public.custom_trainings') && migratie510.includes('insert into public.training_exercises'),
  'G1: de materialisatie gebruikt de bestaande, canonieke program_blocks/custom_trainings/training_exercises-keten');
ok(!/create table.*coach_training_instance/i.test(migratie510) && !/create table.*coach_program_block/i.test(migratie510),
  'G2: geen tweede, coach-specifieke workoutmodel-tabel wordt aangemaakt');

// ---- H. Server-side exercise-ID-validatie (bron van waarheid, niet uitsluitend client-side) ----
ok(migratie510.includes('not exists (select 1 from public.exercises ex where ex.id = e->>\'exercise_id\')'),
  'H1: elke exercise_id wordt server-side gevalideerd tegen de canonieke Exercise Library');
ok(migratie510.includes("raise exception 'template bevat % onbekende exercise_id"),
  'H2: onbekende exercise_ids blokkeren de materialisatie met een expliciete fout');

// ---- I. Idempotentie behouden in de content-versie ----
ok(migratie510.includes('return v_assignment.materialized_program_id'),
  'I1: idempotentie-guard blijft aanwezig in de content-materialisatie-versie');

console.log('fCoachProgramRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
