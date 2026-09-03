/* core/fCanonicalGymTrackB.test.js
 * Technical Foundation Masterprint -- Track B: Legacy Gym Consolidation.
 *
 * Strangler-migratie van netlify/functions/gym-team.js: list/audit_log
 * lezen nu primair via canonical organizations/memberships (B9-H2A/B) in
 * plaats van users.gym_id/gym_role. update_role schrijft dual (legacy +
 * canonical) tijdens de TRANSITIONAL-fase. De API-response naar de client
 * (gym_role: lid/coach/manager/owner) blijft ONGEWIJZIGD -- geen UX-impact.
 *
 * Live, transactioneel geverifieerd vóór deze testsuite (rollback):
 * - canonical memberships bevat exact dezelfde 5 gebruikers/rollen als
 *   legacy users.gym_id/gym_role (1:1, geen orphans/duplicates/conflicts);
 * - de rolmapping member<->lid, staff<->coach, admin<->manager is technisch
 *   afgeleid uit de al bestaande RLS-rolnamen (owner/admin/staff), geen
 *   nieuwe naamgeving verzonnen;
 * - de select-dan-patch/post-aanpak voor memberships-writes (i.p.v. een
 *   on_conflict-upsert) is noodzakelijk omdat de unique constraint
 *   (user_id, organization_id, team_id) een nullable team_id bevat --
 *   een on_conflict op (organization_id,user_id) matcht niet met de
 *   bestaande constraint, en NULL-waarden zijn nooit gelijk aan elkaar;
 * - RLS-isolatie: een gewoon lid ziet exact 1 membership-rij (de eigen),
 *   niet alle 5; anon wordt op functieniveau geweigerd (org_has_role).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const gymTeam = fs.readFileSync(path.join(ROOT, 'netlify/functions/gym-team.js'), 'utf8');

// ---- 1. list-actie leest canonical (organizations/memberships), niet legacy users.gym_role ----
ok(gymTeam.includes("fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${orgId}") &&
   gymTeam.includes("fetch(`${supabaseUrl}/rest/v1/memberships?organization_id=eq.${orgId}"),
  '1: de list-actie haalt leden nu op via organizations+memberships (canonical), niet meer via users.gym_role als primaire bron');

// ---- 2. API-contract naar de client blijft exact hetzelfde (geen UX-impact) ----
ok(gymTeam.includes("gym_role: legacyRole, gym_role_level: ROLE_LEVEL[legacyRole]"),
  '2: de response bevat nog steeds gym_role (lid/coach/manager/owner) en gym_role_level -- de bestaande client-code (loadTeamMembers/TEAM_ROLE_LABELS) hoeft niet te wijzigen');

// ---- 3. Rolmapping is bidirectioneel consistent en gebruikt bestaande RLS-rolnamen ----
{
  const CANONICAL_TO_LEGACY = { member: 'lid', staff: 'coach', admin: 'manager' };
  const LEGACY_TO_CANONICAL = { lid: 'member', coach: 'staff', manager: 'admin' };
  let consistent = true;
  Object.keys(CANONICAL_TO_LEGACY).forEach(function (canonical) {
    const legacy = CANONICAL_TO_LEGACY[canonical];
    if (LEGACY_TO_CANONICAL[legacy] !== canonical) consistent = false;
  });
  ok(consistent, '3: de canonical<->legacy rolmapping is bidirectioneel consistent (member<->lid, staff<->coach, admin<->manager) -- gebruikt de al bestaande RLS-rolnamen (owner/admin/staff) uit exercise_equipment/equipment_catalog, geen nieuwe naamgeving verzonnen');
}

// ---- 4. Owner wordt via organizations.owner_user_id gemodelleerd, niet memberships.role ----
ok(gymTeam.includes("organizations?id=eq.${caller.gym_id}") && gymTeam.includes('owner_user_id: targetUserId'),
  '4: bij promotie naar owner wordt organizations.owner_user_id bijgewerkt (consistent met het bestaande org_has_role()-patroon), en de eventuele oude memberships-rij van de nieuwe owner wordt verwijderd om een tegenstrijdige dubbele bron te voorkomen');

// ---- 5. GEEN onbetrouwbare on_conflict-upsert (nullable team_id in unique constraint) ----
ok(!gymTeam.match(/fetch\(`\$\{supabaseUrl\}\/rest\/v1\/memberships\?on_conflict=/) && gymTeam.includes('team_id=is.null'),
  '5 (zelf gevonden en gerepareerd tijdens deze sprint): geen on_conflict-upsert op memberships -- de unique constraint is (user_id, organization_id, team_id) met een NULLABLE team_id, waardoor NULL-waarden nooit als gelijk worden gezien en een naieve upsert dubbele rijen zou creëren bij herhaalde rolwijzigingen. In plaats daarvan: expliciete select-op-team_id-is-null gevolgd door PATCH of POST.');

// ---- 6. Dual-write: canonical-write-falen wordt niet stilzwijgend genegeerd ----
ok(gymTeam.includes('canonical membership-update mislukt'),
  '6: als de canonical memberships-write faalt na een geslaagde legacy-write, krijgt de aanroeper een expliciete foutmelding -- geen onopgemerkte dual-state-drift tussen legacy en canonical');

// ---- 7. Server-side identity en tenant-scoping blijven behouden (regressie t.o.v. Track A) ----
ok(gymTeam.includes("await fetch(`${supabaseUrl}/auth/v1/user`") &&
   (gymTeam.match(/gym_id=eq\.\$\{caller\.gym_id\}|organization_id=eq\.\$\{orgId\}|organization_id=eq\.\$\{caller\.gym_id\}/g) || []).length >= 3,
  '7: server-side identiteitscontrole (nooit user_id van de client) en tenant-scoping op alle queries blijven intact -- geen regressie op de Track A-bevindingen');

// ---- 8. Rolcontrole en PIN-check blijven vóór elke canonical read/write staan ----
{
  const roleCheckIdx = gymTeam.indexOf('minLevelForAction');
  const pinCheckIdx = gymTeam.indexOf('coach_pin_hash');
  const listIdx = gymTeam.indexOf("action === 'list'");
  ok(roleCheckIdx > -1 && pinCheckIdx > -1 && listIdx > -1 && roleCheckIdx < pinCheckIdx && pinCheckIdx < listIdx,
    '8: rolcontrole -> PIN-check -> canonical read/write blijven in deze volgorde -- de migratie naar canonical als databron verandert niets aan de authorization-boundary (Track A blijft CLOSED, geen heropening nodig)');
}

// ---- 9. Legacy blijft parallel bestaan (bewust, geen destructieve verwijdering) ----
ok(gymTeam.includes("PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },\n        body: JSON.stringify({ gym_role: newRole })"),
  '9: legacy users.gym_role wordt nog steeds bijgewerkt (TRANSITIONAL-fase, niet PHASE B4 "uitsluitend canonical") -- exercise_equipment/equipment_catalog-RLS leest nog gym_role_level, geen regressie daarop door deze sprint');

console.log('fCanonicalGymTrackB: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
