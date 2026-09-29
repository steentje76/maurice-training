/* Security audit — privileged functions (SECURITY DEFINER) EXECUTE-hardening (migratie_v570).
 * Bewijst in CI (zonder database): (1) v570 trekt PUBLIC/anon-EXECUTE in voor exact de vijf bewezen
 * onnodig blootgestelde functies en geeft expliciet authenticated + service_role, zonder iets anders te
 * wijzigen; (2) de legitieme callers blijven werken (client via gebruikers-JWT, wearable-sync via
 * service_role); (3) de server-side identiteitsbinding in de definiërende migraties blijft aanwezig;
 * (4) het read-only verificatiescript en het auditdocument zijn aanwezig; (5) sabotage wordt gedetecteerd.
 * Live-evidence (rollback-veilige adversarial tests) staat in docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = { v570: rd('migratie_v570.sql'), index: rd('index.html'), wear: rd('netlify/functions/wearable-sync.js'),
  v560: rd('migratie_v560.sql'), v552: rd('migratie_v552.sql'), v557: rd('migratie_v557.sql'), v553: rd('migratie_v553.sql'),
  verify: rd('tools/verify-privileged-functions.sql'), doc: rd('docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md') };
let pass = 0, fail = 0, mute = false;
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const FUNCS = [
  ['upsert_daily_health', 'uuid, date, numeric, integer, numeric, text, text, text, text, integer'],
  ['schedule_my_training', 'text, date, jsonb, uuid'],
  ['get_or_create_direct_thread', 'uuid'],
  ['upsert_endurance_profile_target', 'text, numeric, numeric'],
  ['is_thread_participant', 'uuid']
];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function check(S, L) {
  L = L || '';
  const code = S.v570.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
  FUNCS.forEach(([fn, sig]) => {
    const head = 'function public\\.' + esc(fn) + '\\(' + esc(sig) + '\\)';
    ok(new RegExp('revoke execute on ' + head + ' from public, anon;', 'i').test(code), L + 'M1: PUBLIC/anon ingetrokken: ' + fn);
    ok(new RegExp('grant\\s+execute on ' + head + ' to authenticated, service_role;', 'i').test(code), L + 'M2: authenticated + service_role expliciet: ' + fn);
  });
  ok(!/grant[^;]*\bto\b[^;]*\b(anon|public)\b/i.test(code), L + 'M3: v570 verleent nooit EXECUTE aan anon/PUBLIC');
  ok(!/\b(create|alter|drop)\b/i.test(code) && !/security\s+(definer|invoker)|search_path|policy|owner to/i.test(code), L + 'M4: v570 wijzigt geen body/definer/search_path/owner/policy');
  ok((code.match(/revoke execute on function/gi) || []).length === 5 && (code.match(/grant\s+execute on function/gi) || []).length === 5, L + 'M5: exact de vijf bewezen functies, niets anders');
  // legitieme callers
  const sbFetch = (S.index.match(/async function sbFetch\(url,o\)\{[\s\S]*?\n\}/) || [''])[0];
  ok(/SB_H/.test(sbFetch), L + 'C1: client-RPC-laag (sbFetch) stuurt de gebruikers-authorisatie mee');
  ['upsert_daily_health', 'get_or_create_direct_thread'].forEach(fn => ok(new RegExp("sbRpc\\('" + fn + "'").test(S.index), L + 'C2: client roept ' + fn + ' via sbRpc (authenticated)'));
  ['schedule_my_training', 'upsert_endurance_profile_target'].forEach(fn => ok(new RegExp("sbRpcQ\\('" + fn + "'").test(S.index), L + 'C3: client roept ' + fn + ' via sbRpcQ (authenticated)'));
  ok(/rpc\/upsert_daily_health`, \{\s*method: 'POST', headers: sbHeaders/.test(S.wear) && /const sbHeaders = \{ apikey: serviceKey, Authorization: `Bearer \$\{serviceKey\}`/.test(S.wear), L + 'C4: wearable-sync gebruikt service_role (grant nodig en aanwezig)');
  // identiteitsbinding in de definiërende migraties
  ok(/IF v_caller IS NULL OR v_caller <> p_user_id THEN/.test(S.v560) && /auth\.role\(\) IS DISTINCT FROM 'service_role'/.test(S.v560), L + 'I1: upsert_daily_health bindt p_user_id aan auth.uid() (service_role uitgezonderd)');
  ok(/v_user_id uuid := auth\.uid\(\)/.test(S.v552) && /IF v_user_id IS NULL THEN/.test(S.v552), L + 'I2: schedule_my_training vereist auth.uid()');
  ok(/v_user_id uuid := auth\.uid\(\)/.test(S.v557) && /IF v_user_id IS NULL THEN/.test(S.v557), L + 'I3: get_or_create_direct_thread vereist auth.uid()');
  ok(/v_user_id uuid := auth\.uid\(\)/.test(S.v553) && /IF v_user_id IS NULL THEN/.test(S.v553), L + 'I4: upsert_endurance_profile_target vereist auth.uid()');
  // verificatie + documentatie
  ok(/anon_executable_secdef/.test(S.verify) && /public_executable_secdef/.test(S.verify) && /secdef_without_search_path/.test(S.verify), L + 'V1: read-only verificatiescript aanwezig');
  ok(/social_create_notification[^\n]*\|\s*D\s*\|/.test(S.doc) && /decrement_usage[^\n]*\|\s*C\s*\|/.test(S.doc) && /social_is_blocked_pair[^\n]*\|\s*C\s*\|/.test(S.doc), L + 'V2: auditdocument legt D/C-findings vast');
  ok(!/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(S.doc.replace(/00000000-0000-4000-8000-0000000000[0-9a-f]{2}/gi, '')), L + 'V3: geen echte user-id\'s in het auditdocument');
}
check(SRC, '');
const sab = [
  ['anon opnieuw EXECUTE', s => Object.assign({}, s, { v570: s.v570 + '\ngrant execute on function public.is_thread_participant(uuid) to anon;\n' })],
  ['PUBLIC-revoke vergeten', s => Object.assign({}, s, { v570: s.v570.replace('revoke execute on function public.schedule_my_training(text, date, jsonb, uuid) from public, anon;', 'revoke execute on function public.schedule_my_training(text, date, jsonb, uuid) from anon;') })],
  ['service_role vergeten', s => Object.assign({}, s, { v570: s.v570.replace('grant  execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer) to authenticated, service_role;', 'grant  execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer) to authenticated;') })],
  ['auth.uid()-binding verwijderd', s => Object.assign({}, s, { v560: s.v560.replace('IF v_caller IS NULL OR v_caller <> p_user_id THEN', 'IF false THEN') })],
  ['SECURITY DEFINER/search_path aangepast', s => Object.assign({}, s, { v570: s.v570 + '\nalter function public.get_or_create_direct_thread(uuid) set search_path = public, pg_temp;\n' })]
];
for (const [name, mut] of sab) {
  const pp = pass, ff = fail; mute = true; check(mut(SRC), '[sab] '); const caught = fail > ff; mute = false; pass = pp; fail = ff;
  if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
  ok(caught, 'SABOTAGE gedetecteerd: ' + name);
}
console.log('\n[SecurityPrivilegedFunctions] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
