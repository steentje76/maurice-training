/* TrainingKompas — Platform Roles & Permissions Core test suite (node, standalone).
 * Draai: node core/platformRoles.test.js */
const fs = require('fs');
const path = require('path');
const P = require('./platformRoles.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

console.log('\n🔐 Platform Roles & Permissions Core');

console.log('\n[A] Rolhiërarchie');
T('hiërarchie exact conform sprintopdracht (5 rollen, oplopend)', () => {
  eq(P.ROLES.length, 5);
  ok(P.rankOf('ATHLETE') < P.rankOf('COACH'));
  ok(P.rankOf('COACH') < P.rankOf('CLUB_COACH'));
  ok(P.rankOf('CLUB_COACH') < P.rankOf('CLUB_ADMIN'));
  ok(P.rankOf('CLUB_ADMIN') < P.rankOf('PLATFORM_ADMIN'));
});
T('hasAtLeastRole werkt in beide richtingen', () => {
  ok(P.hasAtLeastRole('CLUB_ADMIN', 'COACH'));
  ok(!P.hasAtLeastRole('COACH', 'CLUB_ADMIN'));
  ok(P.hasAtLeastRole('COACH', 'COACH'), 'gelijke rol telt als voldoende');
});
T('onbekende rol -> altijd false, geen crash', () => {
  ok(!P.hasAtLeastRole('SUPERADMIN', 'ATHLETE'));
  ok(!P.hasAtLeastRole('ATHLETE', 'SUPERADMIN'));
});

console.log('\n[B] canViewAthleteData — consent-gedreven (privacy-by-design)');
T('eigen data is altijd zichtbaar', () => {
  eq(P.canViewAthleteData('u1', 'u1', null, null).allowed, true);
});
T('geen relatie/membership -> geweigerd', () => {
  eq(P.canViewAthleteData('coach1', 'athlete1', null, null).allowed, false);
});
T('actieve coach-atleet-relatie -> toegestaan', () => {
  const r = P.canViewAthleteData('coach1', 'athlete1', { type: 'coach_athlete', status: 'active' }, null);
  eq(r.allowed, true);
});
T('pending coach-atleet-relatie -> GEWEIGERD (nog geen consent)', () => {
  const r = P.canViewAthleteData('coach1', 'athlete1', { type: 'coach_athlete', status: 'pending' }, null);
  eq(r.allowed, false);
});
T('revoked coach-atleet-relatie -> geweigerd', () => {
  const r = P.canViewAthleteData('coach1', 'athlete1', { type: 'coach_athlete', status: 'revoked' }, null);
  eq(r.allowed, false);
});
T('actief CLUB_COACH-lidmaatschap -> toegestaan', () => {
  const r = P.canViewAthleteData('coach1', 'athlete1', null, { role: 'CLUB_COACH', status: 'active' });
  eq(r.allowed, true);
});
T('inactief membership -> geweigerd ondanks hoge rol', () => {
  const r = P.canViewAthleteData('coach1', 'athlete1', null, { role: 'CLUB_ADMIN', status: 'inactive' });
  eq(r.allowed, false);
});
T('membership met rol ATHLETE (bv. teamgenoot) -> geweigerd, geen peer-inzage', () => {
  const r = P.canViewAthleteData('u2', 'athlete1', null, { role: 'ATHLETE', status: 'active' });
  eq(r.allowed, false, 'een teamgenoot-atleet mag een andere atleet niet zien, alleen coach+');
});

console.log('\n[C] resolveVisibleAthleteIds');
T('actieve directe relaties worden verzameld', () => {
  const ids = P.resolveVisibleAthleteIds('coach1', [
    { type: 'coach_athlete', status: 'active', coachId: 'coach1', athleteId: 'a1' },
    { type: 'coach_athlete', status: 'active', coachId: 'coach1', athleteId: 'a2' },
    { type: 'coach_athlete', status: 'pending', coachId: 'coach1', athleteId: 'a3' },
    { type: 'coach_athlete', status: 'active', coachId: 'coach2', athleteId: 'a4' }
  ], []);
  eq(ids.length, 2);
  ok(ids.indexOf('a1') !== -1 && ids.indexOf('a2') !== -1);
});
T('team-memberships met voldoende rol voegen teamleden toe, gededupliceerd', () => {
  const ids = P.resolveVisibleAthleteIds('coach1', [], [
    { status: 'active', viewerRole: 'CLUB_COACH', teamAthleteIds: ['a1', 'a5'] },
    { status: 'active', viewerRole: 'ATHLETE', teamAthleteIds: ['a9'] }
  ]);
  eq(ids.length, 2, 'ATHLETE-rol membership mag geen teamleden toevoegen');
  ok(ids.indexOf('a1') !== -1 && ids.indexOf('a5') !== -1);
});
T('lege input -> lege lijst, geen crash', () => {
  eq(P.resolveVisibleAthleteIds('coach1', null, null).length, 0);
});

console.log('\n[D] Managementchecks — geen losse if/else in UI-code nodig');
T('canManageOrganization vereist minimaal CLUB_ADMIN', () => {
  ok(P.canManageOrganization('CLUB_ADMIN'));
  ok(P.canManageOrganization('PLATFORM_ADMIN'));
  ok(!P.canManageOrganization('CLUB_COACH'));
});
T('canManageTeam vereist minimaal CLUB_COACH', () => {
  ok(P.canManageTeam('CLUB_COACH'));
  ok(!P.canManageTeam('COACH'));
});
T('canOverrideAdjustment vereist minimaal COACH (Sprint 7-koppeling)', () => {
  ok(P.canOverrideAdjustment('COACH'));
  ok(!P.canOverrideAdjustment('ATHLETE'));
});

console.log('\n[E] Architecture guards');
T('platform-roles-core bevat geen DOM/DB/AI/network-afhankelijkheid', () => {
  const src = fs.readFileSync(path.join(__dirname, 'platformRoles.js'), 'utf8');
  ['document.', 'window.fetch', 'supabase', 'XMLHttpRequest', 'localStorage', '.from(', 'new Date', 'Math.random'].forEach(tok => {
    ok(src.indexOf(tok) === -1, 'verboden token gevonden: ' + tok);
  });
});
T('deterministisch: zelfde input -> zelfde output', () => {
  const a = P.canViewAthleteData('c', 'a', { type: 'coach_athlete', status: 'active' }, null);
  const b = P.canViewAthleteData('c', 'a', { type: 'coach_athlete', status: 'active' }, null);
  eq(JSON.stringify(a), JSON.stringify(b));
});

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
if (fail === 0) console.log('✅ Alle Platform Roles-tests groen.');
else process.exit(1);
