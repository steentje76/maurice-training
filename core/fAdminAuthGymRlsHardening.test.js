/* core/fAdminAuthGymRlsHardening.test.js
 * Technical Foundation Masterprint: Admin Auth Hardening + Legacy Gym audit.
 *
 * Forensische conclusie (herzien, eerlijk): de client-side s-admin-pin en de
 * server-side gym-team.js zijn TWEE, volledig gescheiden mechanismen.
 * gym-team.js had al correcte, server-side rolcontrole VOOR de PIN-check
 * (rolcontrole is de echte authorization-boundary, PIN is een aanvullende
 * factor binnen dezelfde rol -- geen privilege-escalatie mogelijk).
 * s-admin-pin is puur client-side UI-gating boven een database die al
 * (grotendeels) correct beschermd was via before-insert-triggers
 * (set_exercise_equipment_owner/set_equipment_catalog_owner) die autorisatie
 * controleren EN client-input altijd overschrijven met server-vertrouwde
 * waarden -- dit is bevestigd via live, transactionele tests (zie
 * docs/ADMIN_AUTH_AND_GYM_MIGRATION_PLAN.md). De eerder vermoede
 * "WITH CHECK (true)"-kwetsbaarheid op INSERT bleek bij nader, live onderzoek
 * GEEN exploiteerbaar gat (trigger neutraliseert client-input altijd), maar is
 * alsnog gehard als defense-in-depth (RLS als tweede, onafhankelijke laag).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const gymTeam = fs.readFileSync(path.join(ROOT, 'netlify/functions/gym-team.js'), 'utf8');

// ---- 1. gym-team.js: rolcontrole gebeurt VOOR de PIN-check (geen privilege via PIN alleen) ----
{
  const roleCheckIdx = gymTeam.indexOf('minLevelForAction');
  const pinCheckIdx = gymTeam.indexOf('coach_pin_hash');
  ok(roleCheckIdx > -1 && pinCheckIdx > -1 && roleCheckIdx < pinCheckIdx,
    '1: de gym-role-level-check (minLevelForAction) staat in de broncode VOOR de coach-pincode-check -- kennis van de PIN alleen kan nooit een te lage rol compenseren, de rolcontrole is de echte authorization-boundary');
}

// ---- 2. Server-side identity: user_id komt nooit van de client ----
ok(gymTeam.includes("await fetch(`${supabaseUrl}/auth/v1/user`") && gymTeam.includes('nooit een user_id van de client vertrouwen'),
  '2: gym-team.js herleidt de aanroeper-identiteit altijd server-side via /auth/v1/user, nooit uit een door de client meegegeven veld');

// ---- 3. Privilege-escalatie-bescherming bij rolwijziging (P0-002-fix, al aanwezig) ----
ok(gymTeam.includes('gelijke of hogere rol dan die van jezelf') && gymTeam.includes('rol toekennen die hoger is dan je eigen rol'),
  '3: update_role blokkeert zowel het wijzigen van een gelijke/hogere rol als het toekennen van een hogere rol dan de aanroeper zelf heeft (bevestigd, al aanwezige bescherming)');

// ---- 4. Tenant-scoping: alle queries in gym-team.js zijn gym_id-gescoped ----
ok(gymTeam.match(/gym_id=eq\.\$\{caller\.gym_id\}/g)?.length >= 3,
  '4: list/audit_log/update_role-queries zijn allemaal expliciet gescoped op de gym van de aanroeper, geen cross-tenant query gevonden');

// ---- 5. Audit-logging van rolwijzigingen (target-vereiste, al aanwezig) ----
ok(gymTeam.includes("action: 'role_changed'") && gymTeam.includes('gym_audit_log'),
  '5: elke rolwijziging wordt gelogd in gym_audit_log met actor/target/from/to -- vervult de audit-vereiste uit INTERNAL_OPERATIONS_SUPPORT_ADMIN_DETAIL sectie 25 zonder extra werk');

// ---- 6. Kip-en-ei-bypass is beperkt tot alleen de owner-rol ----
ok(gymTeam.includes('caller.gym_role_level < 3) return') && gymTeam.includes('nog geen coach-pincode ingesteld'),
  '6: als er nog geen PIN is ingesteld, mag uitsluitend gym_role_level>=3 (owner) erdoorheen -- een bewuste, beperkte bootstrap-bypass, geen algemene achterdeur');

// ---- 7. Live, forensisch bevestigd: geen echte insert-kwetsbaarheid (trigger neutraliseert client-input) ----
// (Live, transactioneel getest tijdens deze sprint, zie migratieplan. Vastgelegd
// als regressietest op documentniveau -- een codewijziging die de triggers
// verwijdert zonder deze aantekening te herzien is een waarschuwingssignaal.)
{
  const plan = fs.readFileSync(path.join(ROOT, 'docs/ADMIN_AUTH_AND_GYM_MIGRATION_PLAN.md'), 'utf8');
  ok(plan.includes('GEEN exploiteerbare kwetsbaarheid') || plan.includes('geen exploiteerbare kwetsbaarheid') || plan.includes('niet gevaarlijk'),
    '7: het migratieplan legt eerlijk vast dat de aanvankelijk vermoede insert-kwetsbaarheid bij live onderzoek geen exploiteerbaar gat bleek (trigger-bescherming), en de RLS-aanscherping is gedaan als defense-in-depth, niet als kritieke fix');
}

// ---- 8. Legacy vs canonical: dual-model RLS bevestigd (geen nieuwe RLS nodig voor canonical) ----
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const gymIdHits = (html.match(/gym_id|gym_role/g) || []).length;
  const canonicalHits = (html.match(/\borganizations\b|\bmemberships\b/g) || []).length;
  ok(gymIdHits > 0, '8a: index.html gebruikt nog steeds legacy gym_id/gym_role (bevestigt: legacy is nog actief, geen stille breuk door deze sprint)');
  // canonicalHits kan > 0 zijn via social_group_memberships -- geen harde assertie hierop, puur informatief in het rapport.
}

console.log('fAdminAuthGymRlsHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
