/* F-SEC-001 closure — social_create_notification (migratie_v571).
 * CI-bewijs zonder database: (1) de nieuwe definitie bindt de actor aan auth.uid(), staat uitsluitend de vijf
 * aantoonbaar geproduceerde typen toe en eist per type een server-side relatie; (2) grants blijven minimaal
 * (geen PUBLIC/anon); (3) alle bestaande callers (frontend + DB-keten v540) blijven binnen de matrix;
 * (4) het rollback-verificatiescript en de auditdocumentatie zijn aanwezig; (5) sabotage wordt gedetecteerd.
 * Live-evidence (rollback-veilige adversarial tests vóór/na) staat in docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = { mig: rd('migratie_v571.sql'), index: rd('index.html'), v540: rd('migratie_v540.sql'), verify: rd('tools/verify-f-sec-001.sql'), doc: rd('docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md') };
let pass = 0, fail = 0, mute = false;
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const ALLOWED = ['reaction', 'comment', 'connection_request', 'connection_accepted', 'responsibility_assigned'];
const REMOVED = ['group_invite', 'group_join_approved', 'challenge_invite', 'team_event_created', 'team_event_updated', 'team_event_cancelled', 'new_message'];
function code(s) { return s.split('\n').filter(l => !/^\s*--/.test(l)).join('\n'); }
function check(S, L) {
  L = L || '';
  const m = code(S.mig);
  const fn = (m.match(/create or replace function public\.social_create_notification\([\s\S]*?\$function\$;/) || [''])[0];
  ok(/create or replace function public\.social_create_notification\(p_recipient_id uuid, p_event_type text, p_target_type text, p_target_id uuid\)\s*returns void/.test(m), L + 'M1: zelfde signature (callers blijven compatibel)');
  ok(/security definer/.test(fn) && /set search_path to 'public'/.test(fn), L + 'M2: SECURITY DEFINER met expliciet search_path');
  ok(/v_actor uuid := auth\.uid\(\);/.test(fn) && /if v_actor is null then raise exception/.test(fn), L + 'M3: actor = auth.uid(), anoniem geweigerd');
  ok(/values \(p_recipient_id, p_event_type, v_actor, p_target_type, p_target_id\)/.test(fn), L + 'M4: actor_id komt uitsluitend uit auth.uid()');
  const allow = (fn.match(/p_event_type not in \(([^)]*)\)/) || [, ''])[1].replace(/'/g, '').split(',').map(x => x.trim()).filter(Boolean);
  ok(allow.slice().sort().join() === ALLOWED.slice().sort().join(), L + 'M5: allowlist = exact de vijf geproduceerde typen (' + allow.join(',') + ')');
  REMOVED.forEach(t => ok(allow.indexOf(t) === -1, L + 'M6: type ' + t + ' niet via deze functie'));
  ok(/p_event_type = 'reaction'[\s\S]*?p_target_type = 'shared_activity'[\s\S]*?sa\.athlete_id = p_recipient_id and r\.user_id = v_actor/.test(fn), L + 'M7: reaction vereist eigen reaction + ontvanger = eigenaar');
  ok(/p_event_type = 'comment'[\s\S]*?p_target_type = 'shared_activity'[\s\S]*?sa\.athlete_id = p_recipient_id and c\.user_id = v_actor/.test(fn), L + 'M8: comment vereist eigen comment + ontvanger = eigenaar');
  ok(/p_event_type = 'connection_request'[\s\S]*?p_target_id = v_actor[\s\S]*?sc\.follower_id = v_actor and sc\.followee_id = p_recipient_id and sc\.status = 'pending'/.test(fn), L + 'M9: connection_request vereist pending verzoek van actor');
  ok(/p_event_type = 'connection_accepted'[\s\S]*?p_target_id = v_actor[\s\S]*?sc\.follower_id = p_recipient_id and sc\.followee_id = v_actor and sc\.status = 'accepted'/.test(fn), L + 'M10: connection_accepted vereist geaccepteerde volger');
  ok(/p_event_type = 'responsibility_assigned'[\s\S]*?p_target_type = 'team_event'[\s\S]*?er\.assigned_user_id = p_recipient_id[\s\S]*?public\.team_has_access\(te\.team_id, array\['owner','admin','staff'\]\)/.test(fn), L + 'M11: responsibility vereist toegewezen taak + staffrechten van actor');
  ok(/if not coalesce\(v_ok, false\) then raise exception/.test(fn), L + 'M12: fail-closed zonder bewezen relatie');
  ok(!/\bexecute\s+(format|'|\w+\s*\|\|)/i.test(fn) && !/coach_has_scope|org_user_has_role|social_is_blocked_pair|social_is_group_(member|owner)|is_relationship_active/.test(fn), L + 'M13: geen dynamische SQL en geen F-SEC-003-orakels als boundary');
  ok(/revoke execute on function public\.social_create_notification\(uuid, text, text, uuid\) from public, anon;/.test(m) && /grant\s+execute on function public\.social_create_notification\(uuid, text, text, uuid\) to authenticated, service_role;/.test(m) && !/to[^;]*\banon\b/.test(m.replace(/from public, anon/g, '')), L + 'M14: EXECUTE niet voor PUBLIC/anon');
  // callers
  const calls = (S.index.match(/rpc\/social_create_notification`[^;]*?JSON\.stringify\(\{[^}]*\}\)/g) || []);
  ok(calls.length === 4, L + 'C1: vier frontend-callers gevonden (' + calls.length + ')');
  calls.forEach(c => {
    const t = (c.match(/p_event_type:'([a-z_]+)'/) || [, ''])[1], tt = (c.match(/p_target_type:'([a-z_]+)'/) || [, ''])[1];
    ok(ALLOWED.indexOf(t) !== -1, L + 'C2: frontend-type ' + t + ' toegestaan');
    if (t === 'reaction' || t === 'comment') ok(tt === 'shared_activity' && /p_target_id:sharedActivityId/.test(c) && /p_recipient_id:athleteId/.test(c), L + 'C3: ' + t + ' naar eigenaar van de activity');
    if (t === 'connection_request' || t === 'connection_accepted') ok(tt === 'profile' && /p_target_id:uid/.test(c), L + 'C4: ' + t + ' met eigen profiel als doel');
  });
  ok(/perform public\.social_create_notification\(p_assigned_user_id, 'responsibility_assigned', 'team_event', p_event_id\)/.test(S.v540) && /team_has_access\(v_team_id, array\['owner','admin','staff'\]\)/.test(S.v540), L + 'C5: DB-keten (assign_event_responsibility_notify) valt binnen de matrix');
  ok(/rollback;\s*$/.test(S.verify.trim() + '\n') && /N1 F-SEC-001 exploit/.test(S.verify) && !/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.test(S.verify), L + 'V1: verificatiescript eindigt met ROLLBACK en bevat geen echte user-id');
  ok(/F-SEC-001/.test(S.doc) && /v571/.test(S.doc), L + 'D1: auditdocument bijgewerkt');
}
check(SRC, '');
const sab = [
  ['auth.uid()-binding weg', s => Object.assign({}, s, { mig: s.mig.replace('v_actor uuid := auth.uid();', 'v_actor uuid := p_recipient_id;') })],
  ['relatiecheck weg (reaction)', s => Object.assign({}, s, { mig: s.mig.replace("sa.athlete_id = p_recipient_id and r.user_id = v_actor", "true") })],
  ['willekeurige ontvanger (responsibility)', s => Object.assign({}, s, { mig: s.mig.replace("er.assigned_user_id = p_recipient_id", "true") })],
  ['onbekend type permissief', s => Object.assign({}, s, { mig: s.mig.replace("if not coalesce(v_ok, false) then raise exception 'not authorized for this notification'; end if;", '') })],
  ['team_event_cancelled weer via RPC', s => Object.assign({}, s, { mig: s.mig.replace("'responsibility_assigned') then", "'responsibility_assigned','team_event_cancelled') then") })],
  ['anon-EXECUTE terug', s => Object.assign({}, s, { mig: s.mig + '\ngrant execute on function public.social_create_notification(uuid, text, text, uuid) to anon;\n' })],
  ['actor uit parameter', s => Object.assign({}, s, { mig: s.mig.replace('values (p_recipient_id, p_event_type, v_actor, p_target_type, p_target_id)', 'values (p_recipient_id, p_event_type, p_target_id, p_target_type, p_target_id)') })]
];
sab.forEach(([name, mut]) => {
  const S2 = mut(SRC);
  if (S2.mig === SRC.mig) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); return; }
  const pp = pass, ff = fail; mute = true; check(S2, '[sab] '); mute = false; const caught = fail > ff; pass = pp; fail = ff;
  if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
  ok(caught, 'SABOTAGE gedetecteerd via assertie: ' + name);
});
console.log('\n[SecNotificationAuthz F-SEC-001] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
