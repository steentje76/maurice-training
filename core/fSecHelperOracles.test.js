/* F-SEC-003 closure — relatie-/lidmaatschapshelpers (migratie_v574).
 * CI-bewijs zonder database: (1) elke helper antwoordt alleen als de caller partij is (coach_has_scope,
 * social_is_blocked_pair, social_is_group_member/owner) of, voor org_user_has_role, zelf of org-staff van die
 * organisatie; (2) fail-closed zonder auth.uid(); (3) signatures, SECURITY DEFINER, search_path en tabellogica
 * ongewijzigd; (4) trigger team_events_validate_linked_training gebruikt inline de ongewijzigde controle;
 * (5) is_relationship_active niet meer uitvoerbaar voor clients; (6) geen grants, geen policy-/RLS-wijziging;
 * (7) geen TK-client roept de helpers direct aan; (8) rollback-verificatiescript + auditdocument; (9) sabotage.
 * Live-evidence: docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fnDir = path.join(ROOT, 'netlify/functions');
const SRC = { mig: rd('migratie_v574.sql'), index: rd('index.html'), verify: rd('tools/verify-f-sec-003.sql'), doc: rd('docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md'),
  fns: fs.readdirSync(fnDir).filter(f => /\.js$/.test(f)).map(f => fs.readFileSync(path.join(fnDir, f), 'utf8')).join('\n') };
let pass = 0, fail = 0, mute = false;
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const code = s => s.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
const fn = (m, name) => (m.match(new RegExp('create or replace function public\\.' + name + '\\([\\s\\S]*?\\$function\\$;')) || [''])[0];
const HELPERS = ['coach_has_scope', 'social_is_blocked_pair', 'social_is_group_member', 'social_is_group_owner', 'org_user_has_role'];
function check(S, L) {
  L = L || '';
  const m = code(S.mig);
  HELPERS.forEach(h => {
    const f = fn(m, h);
    ok(/returns boolean\s+language sql\s+stable security definer\s+set search_path to 'public'/.test(f), L + 'M1: ' + h + ' behoudt signature, SECURITY DEFINER, STABLE en search_path');
    ok(/select auth\.uid\(\) is not null\s+and/.test(f), L + 'M2: ' + h + ' fail-closed zonder ingelogde caller');
  });
  ok(/auth\.uid\(\) in \(p_coach_id, p_athlete_id\)/.test(fn(m, 'coach_has_scope')), L + 'M3: coach_has_scope alleen voor coach of athlete zelf');
  ok(/r\.coach_user_id = p_coach_id and r\.athlete_user_id = p_athlete_id\s+and r\.status = 'active' and s\.scope = p_scope and s\.enabled = true/.test(fn(m, 'coach_has_scope')), L + 'M4: coach_has_scope-relatielogica ongewijzigd');
  ok(/auth\.uid\(\) in \(a, b\)/.test(fn(m, 'social_is_blocked_pair')) && /\(blocker_id = a and blocked_id = b\) or \(blocker_id = b and blocked_id = a\)/.test(fn(m, 'social_is_blocked_pair')), L + 'M5: social_is_blocked_pair alleen voor een partij, blokkadelogica ongewijzigd');
  ok(/and u = auth\.uid\(\)/.test(fn(m, 'social_is_group_member')) && /and u = auth\.uid\(\)/.test(fn(m, 'social_is_group_owner')) && /role = 'owner'/.test(fn(m, 'social_is_group_owner')), L + 'M6: groepshelpers alleen voor de caller zelf');
  ok(/\(p_user_id = auth\.uid\(\) or public\.org_has_role\(p_org_id, array\['owner','admin','staff'\]\)\)/.test(fn(m, 'org_user_has_role')), L + 'M7: org_user_has_role alleen zelf of org-staff van die organisatie');
  ok(/o\.owner_user_id = p_user_id/.test(fn(m, 'org_user_has_role')) && /m\.status = 'active' and m\.role = any\(p_roles\)/.test(fn(m, 'org_user_has_role')), L + 'M8: org-lidmaatschapslogica ongewijzigd');
  const trg = (m.match(/create or replace function public\.team_events_validate_linked_training\(\)[\s\S]*?\$function\$;/) || [''])[0];
  ok(/security definer/.test(trg) && !/org_user_has_role\(/.test(trg) && /o\.owner_user_id = v_ti_user_id/.test(trg) && /m\.role = any\(array\['owner','admin','staff','member'\]\)/.test(trg), L + 'M9: trigger gebruikt de ongewijzigde lidmaatschapscontrole inline');
  ok(/revoke execute on function public\.is_relationship_active\(uuid\) from public, anon, authenticated;/.test(m), L + 'M10: is_relationship_active niet meer client-uitvoerbaar');
  ok(!/\bgrant\b/i.test(m), L + 'M11: geen enkele grant');
  ok(!/policy|row level security|disable/i.test(m), L + 'M12: geen policy-/RLS-wijziging');
  ok(!/\bexecute\s+(format|')/i.test(m), L + 'M13: geen dynamische SQL');
  const callers = HELPERS.concat(['is_relationship_active']).filter(h => new RegExp('rpc/' + h + '\\b').test(S.index + S.fns));
  ok(callers.length === 0, L + 'C1: geen TK-client of Netlify-functie roept de helpers direct aan (' + callers.join(',') + ')');
  ok(/rollback;\s*$/.test(S.verify.trim() + '\n') && /LIVE A: coach_has_scope\(B,C\) derde/.test(S.verify) && /LIVE B\(coach\): RLS hrv_log van C/.test(S.verify) && /LIVE trigger: gekoppelde training van niet-lid/.test(S.verify) && !/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.test(S.verify), L + 'V1: verificatiescript (rollback, geen echte ids, orakel + RLS-regressies + trigger)');
  ok(/F-SEC-003/.test(S.doc) && /v574/.test(S.doc), L + 'D1: auditdocument bijgewerkt');
}
check(SRC, '');
const sab = [
  ['auth.uid()-binding coach_has_scope weg', s => Object.assign({}, s, { mig: s.mig.replace('and auth.uid() in (p_coach_id, p_athlete_id)', '') })],
  ['derde weer toegestaan bij blokkade', s => Object.assign({}, s, { mig: s.mig.replace('and auth.uid() in (a, b)', '') })],
  ['org-context-check weg', s => Object.assign({}, s, { mig: s.mig.replace("(p_user_id = auth.uid() or public.org_has_role(p_org_id, array['owner','admin','staff']))", 'true') })],
  ['relatiecheck weg', s => Object.assign({}, s, { mig: s.mig.replace("and r.status = 'active' and s.scope = p_scope and s.enabled = true", '') })],
  ['groepshelper voor derden', s => Object.assign({}, s, { mig: s.mig.replace('and u = auth.uid()\n    and exists (select 1 from public.social_group_memberships where user_id = u and group_id = g and status = \'active\');', "and exists (select 1 from public.social_group_memberships where user_id = u and group_id = g and status = 'active');") })],
  ['anon EXECUTE terug', s => Object.assign({}, s, { mig: s.mig + '\ngrant execute on function public.coach_has_scope(uuid, uuid, text) to anon;\n' })],
  ['helper permissief (true)', s => Object.assign({}, s, { mig: s.mig.replace(/create or replace function public\.social_is_group_owner[\s\S]*?\$function\$;/, "create or replace function public.social_is_group_owner(u uuid, g uuid)\n returns boolean\n language sql\n stable security definer\n set search_path to 'public'\nas $function$ select true; $function$;") })],
  ['RLS versoepeld', s => Object.assign({}, s, { mig: s.mig + '\nalter table public.social_groups disable row level security;\n' })],
  ['trigger afhankelijk van gebonden helper', s => Object.assign({}, s, { mig: s.mig.replace(/  if not \(\n    exists \(select 1 from public\.organizations o where o\.id = v_team_org and o\.owner_user_id = v_ti_user_id\)[\s\S]*?  \) then/, "  if not public.org_user_has_role(v_team_org, v_ti_user_id, array['owner','admin','staff','member']) then") })],
  ['fail-open zonder ingelogde caller', s => Object.assign({}, s, { mig: s.mig.replace(/select auth\.uid\(\) is not null\n    and auth\.uid\(\) in \(p_coach_id, p_athlete_id\)/, 'select (auth.uid() is null or auth.uid() in (p_coach_id, p_athlete_id))') })]
];
sab.forEach(([name, mut]) => {
  const S2 = mut(SRC);
  if (S2.mig === SRC.mig) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); return; }
  const pp = pass, ff = fail; mute = true; check(S2, '[sab] '); mute = false; const caught = fail > ff; pass = pp; fail = ff;
  if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
  ok(caught, 'SABOTAGE gedetecteerd via assertie: ' + name);
});
console.log('\n[SecHelperOracles F-SEC-003] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
