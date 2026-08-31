/* fCohortResearchGovernance.test.js — F14 MS-F14-03.
 * Bewaakt de meest gevoelige F14-mastersprint: cross-user cohort-toegang.
 * Vereist system_role (platform-autoriteit, nooit gym_role_level),
 * een k-anonimiteit-drempel tegen heridentificatie bij een klein cohort,
 * volledige audit-logging (governance), en dezelfde dataminimalisatie/
 * pseudonimisering als de individuele export.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v532.sql'), 'utf8');

// ---- A. Platform-autoriteit vereist, nooit gym_role_level ----
ok(migratie.includes("v_system_role is distinct from 'developer' and v_system_role is distinct from 'support'"),
  'A1: de cohort-export vereist expliciet system_role (developer/support), consistent met de F13-P1-08-fix');
{
  const sqlCodeOnly = migratie.split('\n').filter(function (regel) { return !regel.trim().startsWith('--'); }).join('\n');
  ok(!sqlCodeOnly.match(/gym_role_level/),
    'A2: in de uitvoerbare SQL (geen commentaar) wordt gym_role_level (een per-gym rol) nergens gebruikt als autoriteitscheck voor deze platform-brede, cross-user-functionaliteit');
}

// ---- B. k-anonimiteit-drempel tegen heridentificatie ----
ok(migratie.includes('v_min_cohort_size constant integer := 3'),
  'B1: een expliciete, minimale cohortgrootte (k-anonimiteit-achtig) is vastgelegd');
ok(migratie.includes("if v_cohort_size < v_min_cohort_size then") && migratie.includes("'insufficient_cohort_size'"),
  'B2: bij een te klein cohort wordt GEEN data geretourneerd, uitsluitend een expliciete status');

// ---- C. Governance: elke aanroep wordt gelogd, zonder te onthullen WELKE subjects ----
ok(migratie.includes('create table public.research_cohort_access_log'),
  'C1: een audit-log-tabel bestaat voor elke cohort-toegangspoging');
ok(migratie.match(/insert into public\.research_cohort_access_log[\s\S]{0,100}'insufficient_cohort_size'/) &&
   migratie.match(/insert into public\.research_cohort_access_log[\s\S]{0,100}'granted'/),
  'C2: zowel een geslaagde als een geweigerde (te klein cohort) poging wordt gelogd');
ok(!migratie.match(/create table public\.research_cohort_access_log[\s\S]{0,400}subject/i),
  'C3: de audit-log-tabel zelf bevat geen enkel subject-identificerend veld -- alleen de aanvrager en een aantal');
ok(migratie.includes('revoke all on public.research_cohort_access_log from anon, authenticated'),
  'C4: geen enkele client-rol kan de audit-log zelf lezen/wijzigen (uitsluitend server-side/service-role)');

// ---- D. Zelfde dataminimalisatie/pseudonimisering als de individuele export (MS-F14-02) ----
ok(!migratie.match(/'note'|s\.note\b/i),
  'D1: het notitieveld wordt ook hier nergens meegenomen');
ok(migratie.includes("digest(s.user_id::text || 'tk-research-pseudonym-salt-v1'"),
  'D2: hetzelfde, consistente subject_id-pseudonimiseringsschema als MS-F14-02 wordt hergebruikt (niet een nieuw, incompatibel schema)');

// ---- E. Geen enkele user-id-parameter (consistent met MS-F14-02 se ontwerp) ----
ok(migratie.includes('create or replace function public.export_research_cohort()') && !migratie.match(/export_research_cohort\([^)]+\)/),
  'E1: export_research_cohort() heeft geen parameters -- geen manipuleerbaar veld om een specifiek, gericht cohort te forceren');

// ---- F. Least privilege ----
ok(migratie.includes('revoke all on function public.export_research_cohort() from public, anon'),
  'F1: anon heeft geen enkele toegang');

console.log('fCohortResearchGovernance: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
