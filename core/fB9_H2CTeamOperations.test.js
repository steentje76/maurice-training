/* fB9_H2CTeamOperations.test.js
 * Bewaakt de B9-H2C Team Operations backend-uitbreiding: lifecycle,
 * availability/attendance-splitsing, notificatie-integratie, geen
 * dubbele engines, geen self-elevation-route.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v540.sql'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const delAcct = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');

// ---- 1. Canonical team gebruikt, geen nieuw team-model ----
ok(!migratie.includes('create table') || !migratie.match(/create table.*teams/i),
  '1: geen nieuwe teams-tabel aangemaakt -- de bestaande, canonieke teams-tabel (B9-H2A/B) wordt volledig hergebruikt');

// ---- 2. Event lifecycle: planned/cancelled/completed, geen 'updated'-state ----
ok(migratie.includes("check (status in ('planned', 'cancelled', 'completed'))"),
  "2: het event-lifecycle-model gebruikt exact planned/cancelled/completed -- 'updated' is bewust geen aparte state (een wijziging is een update van dezelfde rij, geen duplicaat)");

// ---- 3. Meeting time apart van starts_at ----
ok(migratie.includes('meeting_at timestamptz'),
  '3: meeting_at is een apart veld van starts_at/ends_at, niet verstopt in description');

// ---- 4. Availability/attendance expliciet gesplitst ----
ok(migratie.includes("stage text not null default 'attendance'") && migratie.includes("check (stage in ('availability', 'attendance'))"),
  '4: availability (vooraf) en attendance (achteraf) zijn expliciet onderscheiden via een stage-kolom, niet hetzelfde veld hergebruikt voor twee verschillende betekenissen');
ok(migratie.includes('unique (event_id, user_id, stage)'),
  '4b: de unique-constraint is bijgewerkt zodat één gebruiker zowel een availability- als een attendance-rij per event kan hebben, zonder duplicaten binnen dezelfde stage');

// ---- 5. Recurring events: eenvoudigste oplossing, geen complexe engine ----
ok(migratie.includes('duplicated_from_event_id uuid references public.team_events(id)'),
  '5: recurring/herhaalde events gebruiken een simpele self-reference (duplicated_from_event_id), geen aparte recurrence/series-engine');

// ---- 6. Notificaties hergebruiken de bestaande infrastructuur, geen tweede systeem ----
ok(migratie.includes('social_create_notification') && !migratie.match(/create table.*notification/i),
  '6: alle team-notificaties lopen via de reeds bestaande social_create_notification-RPC/social_notifications-tabel -- geen tweede notificatiesysteem gebouwd');
ok(migratie.includes("'team_event_created'") && migratie.includes("'team_event_updated'") && migratie.includes("'team_event_cancelled'") && migratie.includes("'responsibility_assigned'"),
  '6b: alle vier de vereiste event-types (created/updated/cancelled/responsibility_assigned) zijn toegevoegd aan de toegestane waarden');

// ---- 7. Self-notificatie-preventie via user_id <> auth.uid() ----
ok(migratie.match(/m\.user_id <> auth\.uid\(\)/g).length >= 3,
  '7: elke notificatie-generatie sluit expliciet de acteur zelf uit (geen nutteloze self-notificatie), consistent op alle drie de lifecycle-RPCs');

// ---- 8. Authorization: alle nieuwe RPCs hergebruiken team_has_access, geen nieuwe engine ----
{
  const aantalTeamHasAccessChecks = (migratie.match(/team_has_access\(v_team_id, array\['owner','admin','staff'\]\)/g) || []).length;
  ok(aantalTeamHasAccessChecks === 3, '8: update/cancel/assign-responsibility gebruiken alle drie exact dezelfde, bestaande team_has_access()-autorisatiefunctie -- geen parallelle authorization engine');
}

// ---- 9. Member-boundary op responsibility-toewijzing (sabotage-relevant) ----
ok(migratie.includes("raise exception 'toegewezen gebruiker is geen actief lid van dit team'"),
  '9: een taak kan niet worden toegewezen aan een gebruiker die geen actief lid is van het team (member-boundary, sectie 32)');

// ---- 10. Alle nieuwe SECURITY DEFINER-functies hebben expliciete search_path + anon-revoke ----
{
  const nieuweFuncties = ['notify_team_event_created', 'update_team_event_notify', 'cancel_team_event_notify', 'assign_event_responsibility_notify'];
  nieuweFuncties.forEach(naam => {
    ok(migratie.includes(`revoke execute on function public.${naam}`) && migratie.match(new RegExp(`revoke execute on function public\\.${naam}\\([^)]*\\) from anon`)),
      `10 (${naam}): heeft een expliciete anon-revoke naast de grant aan authenticated`);
  });
}

// ---- 11. Geen UI-wijziging (absolute scope-grens van B9-H2C vóór de UI-gate) ----
ok(!migratie.includes('<div') && !migratie.includes('onclick'),
  '11: de migratie bevat geen enkele HTML/UI-constructie -- puur backend');

// ---- 12. Idempotency: team_events toegevoegd aan het bestaande mechanisme (zelf gevonden gat, sectie 45) ----
{
  const idempBlok = html.match(/IDEMPOTENT_TABELLEN_MET_CLIENT_ID\s*=[\s\S]*?\};/)[0];
  ok(idempBlok.includes('sessions: true') && idempBlok.includes('race_segments: true') && idempBlok.includes('nutrition_entries: true') && idempBlok.includes('team_events: true'),
    '12 (zelf gevonden en gerepareerd): team_events ontbrak in de bestaande, generieke idempotency-registratie -- een netwerk-retry bij event-aanmaak zou een duplicaat event hebben kunnen creëren. Toegevoegd aan het reeds bestaande mechanisme (geen nieuw framework, sectie 45). Controleert aanwezigheid, niet de exacte, inmiddels uitgebreide lijst-inhoud.');
}

// ---- 13. Account deletion: team-tabellen expliciet gedekt (zelf gevonden gat, sectie 41) ----
ok(delAcct.includes("['team_events', ['created_by']]") && delAcct.includes("['event_attendance', ['user_id']]") && delAcct.includes("['event_responsibilities', ['assigned_user_id']]"),
  '13 (zelf gevonden en gerepareerd): team_events/event_attendance/event_responsibilities ontbraken in de expliciete account-deletion-lijst (hadden al correcte CASCADE/SET NULL-FK live bevestigd, maar niet expliciet vermeld voor auditeerbaarheid, conform het bestaande projectpatroon)');

// ---- 14. Attendance-vs-availability RLS-fix (zelf gevonden tijdens UI-requirements-analyse, sectie 16/49/50) ----
ok(migratie.includes('event_attendance_self_or_staff_insert') && migratie.includes('event_attendance_self_or_staff_update'),
  '14a (zelf gevonden en gerepareerd): de oorspronkelijke RLS stond UITSLUITEND self-mutatie toe voor zowel availability als attendance -- een coach kon dus geen aanwezigheid voor een ander teamlid registreren, terwijl sectie 16 dit expliciet vereist');
ok(migratie.match(/stage = 'availability' and user_id = auth\.uid\(\)/g)?.length >= 2,
  '14b: availability blijft in beide nieuwe policies (insert en update) strikt self-only, ook voor staff -- geen brede FOR ALL-policy die per ongeluk ook availability zou overrulen (sectie 49)');
ok(migratie.match(/stage = 'attendance'[\s\S]{0,200}team_has_access\(e\.team_id, array\['owner','admin','staff'\]\)/g)?.length >= 2,
  '14c: attendance staat expliciet staff-mutatie toe via team_has_access(), uitsluitend voor stage=attendance, niet voor availability');

console.log('fB9_H2CTeamOperations: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
