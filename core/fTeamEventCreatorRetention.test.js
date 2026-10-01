/* GAP-P2-024 — team-event creator retention.
 * Bewaakt de twee kanten van de fix:
 *  1. database: team_events.created_by wordt nullable + ON DELETE SET NULL;
 *  2. account-delete: delete-account.js mag gedeelde team_events niet alsnog expliciet op created_by verwijderen.
 * Daarnaast moet notify_team_event_created() na NULL-provenance fail-closed blijven.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = {
  mig: rd('migratie_v577.sql'),
  del: rd('netlify/functions/delete-account.js'),
  doc: rd('docs/GAP_P2_024_TEAM_EVENT_CREATOR_RETENTION.md')
};

let pass = 0, fail = 0, mute = false;
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const sqlCode = s => s.split('\n').map(l => l.replace(/--.*$/, '')).join('\n');

function check(S, label) {
  const L = label || '';
  const m = sqlCode(S.mig);

  ok(/alter table public\.team_events\s+alter column created_by drop not null\s*;/i.test(m),
    L + 'M1: created_by wordt nullable zodat SET NULL uitvoerbaar is');
  ok(/alter table public\.team_events\s+drop constraint if exists team_events_created_by_fkey\s*;/i.test(m),
    L + 'M2: bestaande CASCADE-FK wordt expliciet vervangen');
  ok(/add constraint team_events_created_by_fkey\s+foreign key \(created_by\) references auth\.users\(id\)\s+on delete set null\s*;/i.test(m),
    L + 'M3: created_by-FK gebruikt ON DELETE SET NULL naar auth.users(id)');
  ok(!/foreign key \(created_by\)[\s\S]{0,120}on delete cascade/i.test(m),
    L + 'M4: migratie introduceert nergens opnieuw CASCADE voor created_by');
  ok(/if v_created_by is distinct from auth\.uid\(\) then/i.test(m),
    L + 'F1: creator-check blijft bij NULL fail-closed via IS DISTINCT FROM');
  ok(/security definer/i.test(m) && /set search_path to 'public'/i.test(m),
    L + 'F2: bestaande SECURITY DEFINER/search_path-hardening blijft intact');
  ok(/revoke all on function public\.notify_team_event_created\(uuid\) from public, anon\s*;/i.test(m) &&
     /grant execute on function public\.notify_team_event_created\(uuid\) to authenticated\s*;/i.test(m),
    L + 'F3: functieprivileges zijn expliciet en niet verbreed');
  ok(!/\b(create|drop|alter)\s+policy\b|disable\s+row\s+level\s+security|enable\s+row\s+level\s+security/i.test(m),
    L + 'S1: RLS/policies worden niet gewijzigd');
  ok(!/alter table public\.(event_attendance|event_responsibilities|teams|organizations)\b|\b(drop table|truncate|delete from)\b/i.test(m),
    L + 'S2: gedeelde afhankelijke tabellen en data worden niet gewijzigd/verwijderd');

  ok(!/\[\s*['"]team_events['"]\s*,\s*\[\s*['"]created_by['"]\s*\]\s*\]/.test(S.del),
    L + 'D1: account-delete verwijdert team_events niet expliciet via created_by');
  ok(/\[\s*['"]event_attendance['"]\s*,\s*\[\s*['"]user_id['"]\s*\]\s*\]/.test(S.del),
    L + 'D2: eigen attendance van de verwijderde gebruiker blijft expliciet opruimbaar');
  ok(/\[\s*['"]event_responsibilities['"]\s*,\s*\[\s*['"]assigned_user_id['"]\s*\]\s*\]/.test(S.del),
    L + 'D3: eigen responsibility-assignment blijft expliciet opruimbaar');
  ok(/GAP-P2-024/.test(S.del) && /SET NULL/.test(S.del) && /gedeelde teamhistorie/.test(S.del),
    L + 'D4: account-delete legt de bewuste retention-semantiek naast de code vast');

  ok(/GAP-P2-024/.test(S.doc) && /ON DELETE SET NULL/.test(S.doc) &&
     /team_events = 0/.test(S.doc) && /team_has_access/.test(S.doc) &&
     /notify_team_event_created/.test(S.doc),
    L + 'A1: auditrecord bevat baseline, target, RLS- en RPC-impact');
}

check(SRC, '');

const sabotages = [
  ['SET NULL terug naar CASCADE', s => ({...s, mig:s.mig.replace('on delete set null;', 'on delete cascade;')})],
  ['NOT NULL-drop verwijderd', s => ({...s, mig:s.mig.replace(/alter table public\.team_events\s+alter column created_by drop not null;\s*/i, '')})],
  ['FK naar verkeerde tabel', s => ({...s, mig:s.mig.replace('references auth.users(id)', 'references public.users(id)')})],
  ['creator guard terug naar SQL-NULL-onveilig', s => ({...s, mig:s.mig.replace('v_created_by is distinct from auth.uid()', 'v_created_by <> auth.uid()')})],
  ['team_events expliciet wissen teruggebracht', s => ({...s, del:s.del.replace("['event_attendance', ['user_id']],", "['team_events', ['created_by']],\n      ['event_attendance', ['user_id']],")})],
  ['attendance-opruiming verwijderd', s => ({...s, del:s.del.replace("['event_attendance', ['user_id']],", '')})],
  ['responsibility-opruiming verwijderd', s => ({...s, del:s.del.replace("['event_responsibilities', ['assigned_user_id']]", '')})],
  ['RLS uitgezet', s => ({...s, mig:s.mig + "\nalter table public.team_events disable row level security;\n"})],
  ['attendance-schema aangeraakt', s => ({...s, mig:s.mig + "\nalter table public.event_attendance add column x text;\n"})],
  ['anon execute verbreed', s => ({...s, mig:s.mig.replace('to authenticated;', 'to authenticated, anon;')})]
];

sabotages.forEach(([name, mut]) => {
  const changed = mut(SRC);
  const p0 = pass, f0 = fail;
  mute = true; check(changed, '[sab] '); mute = false;
  const caught = fail > f0;
  pass = p0; fail = f0;
  ok(caught, 'SABOTAGE gedetecteerd: ' + name);
});

console.log('\n[TeamEventCreatorRetention GAP-P2-024] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
