/* fGlobalExerciseAuthority.test.js — F13 Post-Audit Remediation P1-08.
 * Bewaakt dat scope='global'-mutaties op exercises uitsluitend platform-
 * brede autoriteit (system_role) vereisen, nooit een per-gym rolniveau
 * (gym_role_level) -- de owner/manager van een willekeurige gym mag
 * nooit de platform-brede oefeningencatalogus kunnen muteren.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v526.sql'), 'utf8');

// ---- A. Alle drie de mutatie-policies (insert/update/delete) gebruiken system_role voor scope='global' ----
['exercises_insert_v333', 'exercises_update_v333', 'exercises_delete_v333'].forEach(function (policy) {
  const blok = migratie.split('create policy ' + policy)[1] ? migratie.split('create policy ' + policy)[1].split(/create policy|-- LIVE/)[0] : '';
  ok(blok.includes("scope = 'global'") && blok.includes("system_role") && blok.includes("in ('developer','support')"),
    'A: ' + policy + ' vereist system_role IN (developer, support) voor scope=global');
  ok(!blok.match(/scope\s*=\s*'global'[^)]*gym_role_level/),
    'B: ' + policy + ' gebruikt nergens meer gym_role_level als voorwaarde voor scope=global (de oorspronkelijke, per-gym-lek)');
});

// ---- C. scope='gym' blijft terecht gym_role_level gebruiken (geen overcorrectie) ----
['exercises_insert_v333', 'exercises_update_v333', 'exercises_delete_v333'].forEach(function (policy) {
  const blok = migratie.split('create policy ' + policy)[1] ? migratie.split('create policy ' + policy)[1].split(/create policy|-- LIVE/)[0] : '';
  ok(blok.match(/scope\s*=\s*'gym'[\s\S]{0,120}gym_role_level/),
    'C: ' + policy + ' blijft gym_role_level gebruiken voor scope=gym (elke gym-manager/owner blijft terecht bevoegd voor de eigen gym)');
});

// ---- D. De migratie kent system_role toe met een expliciete service_role-context (geleerde les) ----
ok(migratie.includes("system_role = 'developer'") && migratie.includes('system_role is null'),
  'D1: de system_role-toekenning is idempotent (WHERE system_role IS NULL, geen overschrijving bij een herhaalde uitvoering)');

console.log('fGlobalExerciseAuthority: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
