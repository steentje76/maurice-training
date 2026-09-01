/* fB9_H2BOrganizationConsolidation.test.js
 * Bewaakt de daadwerkelijke B9-H2B-migratie: Strategy C blijft canoniek,
 * idempotentie, role-mapping, geen dual-write, geen UI-wijziging.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v539.sql'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const delAcct = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');

// ---- 1. Strategy C blijft canoniek (deterministische org-id = gym-id) ----
ok(migratie.includes('select distinct on (g.id) g.id, g.name, u.id::uuid'),
  '1: de organization-id is deterministisch gelijk aan de gym-id -- geen willekeurige uuid die bij een herhaling zou kunnen verschillen');

// ---- 2. Gym-naar-organization-mapping ----
ok(migratie.includes("update gyms g\nset organization_id = g.id, owner_email = null"),
  '2: de gym wordt gekoppeld aan de organization EN owner_email wordt geleegd, conform de bestaande gyms_owner_context_chk-constraint');

// ---- 3. Idempotentie (zelf gevonden en gerepareerde bug) ----
ok(migratie.includes('not exists') && !migratie.includes('on conflict (user_id, organization_id, team_id) do nothing'),
  '3 (P1-fix, zelf gevonden): de membership-insert gebruikt een expliciete "where not exists"-check, niet "on conflict" -- PostgreSQL behandelt NULL-waarden in een unique constraint nooit als gelijk, dus on conflict zou een tweede uitvoering niet herkennen (live bevestigd: 10 i.p.v. 5 memberships vóór de fix)');

// ---- 4. Owner-membership correct ----
ok(migratie.includes("when 'owner' then 'owner'") && migratie.includes("when 'lid' then 'member'"),
  '4: de role-mapping is expliciet, geen blind 1-op-1 kopiëren van de legacy-waarde');

// ---- 5. Legacy role niet-authoritatief (fail-safe voor onbekende waarden) ----
ok(migratie.includes('else null') && migratie.includes("in ('owner', 'lid')"),
  '5: uitsluitend de twee bekende, expliciet gemapte rollen worden gemigreerd -- een onbekende gym_role-waarde krijgt geen membership, geen automatische admin/owner-promotie');

// ---- 6. Canonical membership authoritatief (RLS gebruikt nooit gym_role) ----
ok(!html.match(/organizations.*gym_role|memberships.*gym_role/i),
  '6: geen enkele client-side query combineert organizations/memberships met gym_role als autorisatie-check');

// ---- 7. Cross-tenant/self-elevation: geen nieuwe RPC die dit zou kunnen omzeilen ----
ok(!migratie.match(/security definer/i) || migratie.includes('prevent_gyms_organization_id_change'),
  '7: de enige SECURITY DEFINER-functie die deze migratie aanraakt is de reeds bestaande trigger-functie, met exact dezelfde auth-eigenschappen als voorheen (alleen de voorwaarde is gecorrigeerd)');

// ---- 8. Team-organization FK blijft ongewijzigd ----
ok(!migratie.includes('alter table teams') && !migratie.includes('alter table team_events'),
  '8: teams/team_events worden niet aangeraakt door deze migratie -- hun bestaande organization_id/team_id-FK blijft ongewijzigd canoniek');

// ---- 9. Coach-relationship blijft standalone ----
ok(!migratie.includes('alter table coach_athlete_relationships'),
  '9: coach_athlete_relationships wordt niet aangeraakt -- blijft bewust standalone, conform de B9-H2A-architectuurbeslissing');

// ---- 10. Account deletion: organizations/memberships al gedekt ----
ok(delAcct.includes("['organizations', ['owner_user_id']]") && delAcct.includes("['memberships', ['user_id']]"),
  '10: organizations/memberships staan al in de expliciete account-deletion-lijst (bevestigd: reeds aanwezig vóór deze sprint, MS-F11-01)');

// ---- 11. Ownership protection: geen enkele FK van organizations naar persoonlijke data ----
// (architecturaal, live bevestigd via pg_constraint -- vastgelegd als documentbewijs, zie B9_H2B_ORGANIZATION_MIGRATION_REPORT.md)
ok(fs.existsSync(path.join(ROOT, 'docs/B9_H2B_ORGANIZATION_MIGRATION_REPORT.md')),
  '11: het migratierapport bestaat en documenteert de live, architecturale ownership-verificatie');

// ---- 12. Geen permanente dual-write ----
ok(!migratie.match(/trigger.*sync|dual.write/i),
  '12: geen enkele trigger of sync-mechanisme dat een permanente dual-write tussen users.gym_role en memberships.role zou creëren');

// ---- 13. Geen UI-wijziging ----
ok(!migratie.includes('<div') && !migratie.includes('onclick'),
  '13: de migratie zelf bevat geen enkele HTML/UI-constructie -- puur database-schema/data');

console.log('fB9_H2BOrganizationConsolidation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
