/* F-SEC-002 closure — AI-quota: compensatie uitsluitend server-side (migratie_v573 + netlify/functions/coach.js).
 * CI-bewijs zonder database: (1) decrement_usage niet meer client-uitvoerbaar; (2) nieuwe
 * decrement_usage_for_user uitsluitend service_role, SECURITY DEFINER, search_path, vloer 0, null-guard;
 * (3) check_and_increment_usage/increment_usage/consume_credit niet aangeraakt; (4) coach.js compenseert alleen
 * via de server-only RPC met service key en de uit het JWT geverifieerde userId, alleen na een eigen reservering,
 * en zonder service key helemaal niet (fail-safe); (5) rollback-verificatiescript en auditdocument aanwezig;
 * (6) sabotage wordt gedetecteerd. Live-evidence: docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = { mig: rd('migratie_v573.sql'), coach: rd('netlify/functions/coach.js'), verify: rd('tools/verify-f-sec-002.sql'), doc: rd('docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md') };
let pass = 0, fail = 0, mute = false;
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const code = s => s.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
function fnSrc(src, name) { const s = src.indexOf('async function ' + name + '('); if (s < 0) return null; let d = 0; const b = src.indexOf('{', src.indexOf(')', s));
  for (let k = b; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (d === 0) return src.slice(s, k + 1); } } return null; }
async function runComp(src, env, uid) {
  const calls = []; const f = fnSrc(src, 'compenseerQuota'); if (!f) return { missing: true };
  const fn = new Function('process', 'fetch', f + '\nreturn compenseerQuota;')({ env: env }, (u, i) => { calls.push({ u, i }); return Promise.resolve({ ok: true }); });
  const r = await fn('https://x.supabase.co', uid, 'ai_coach', '2026-09-01');
  return { r, calls };
}
async function check(S, L) {
  L = L || '';
  const m = code(S.mig);
  const nf = (m.match(/create or replace function public\.decrement_usage_for_user\([\s\S]*?\$function\$;/) || [''])[0];
  ok(/create or replace function public\.decrement_usage_for_user\(p_user_id uuid, p_feature_key text, p_periode date\)\s*returns integer/.test(m), L + 'M1: server-only compensatiefunctie met expliciete gebruiker');
  ok(/security definer/.test(nf) && /set search_path to 'public'/.test(nf), L + 'M2: SECURITY DEFINER met expliciet search_path');
  ok(/greatest\(aantal - 1, 0\)/.test(nf) && /where user_id = p_user_id and feature_key = p_feature_key and periode = p_periode/.test(nf), L + 'M3: exact één eenheid, vloer 0, alleen de opgegeven rij');
  ok(/if p_user_id is null or p_feature_key is null or p_periode is null then\s*raise exception/.test(nf), L + 'M4: null-guard');
  ok(/revoke all on function public\.decrement_usage_for_user\(uuid, text, date\) from public, anon, authenticated;/.test(m) && /grant execute on function public\.decrement_usage_for_user\(uuid, text, date\) to service_role;/.test(m), L + 'M5: nieuwe functie uitsluitend service_role');
  ok(/revoke execute on function public\.decrement_usage\(text, date\) from public, anon, authenticated;/.test(m), L + 'M6: client-compensatie (decrement_usage) ingetrokken');
  ok(!/grant[^;]*\bto\b[^;]*\b(authenticated|anon|public)\b/i.test(m), L + 'M7: niets verleend aan authenticated/anon/PUBLIC');
  ok(!/check_and_increment_usage|increment_usage\(|consume_credit|usage_log[^\n]*policy|disable/i.test(m.replace(/public\.usage_log/g, '')), L + 'M8: quota-check, credits en RLS ongemoeid');
  ok(!/\/rpc\/decrement_usage`/.test(S.coach), L + 'C1: coach.js roept de client-variant decrement_usage niet meer aan');
  ok(/\/rpc\/decrement_usage_for_user`/.test(S.coach) && /apikey: serviceKey, Authorization: 'Bearer ' \+ serviceKey/.test(S.coach) && /p_user_id: userId/.test(S.coach), L + 'C2: compensatie met service key en geverifieerde userId');
  ok((S.coach.match(/if \(quotaGereserveerd\) \{\s*await compenseerQuota\(supabaseUrl, userId, featureKey, periode\)/g) || []).length === 2, L + 'C3: compensatie alleen na eigen reservering (beide faalpaden)');
  ok(/userId = user\.id;/.test(S.coach) && !/p_user_id:\s*(body|payload|event)/.test(S.coach), L + 'C4: userId uit de JWT-verificatie, nooit uit de request');
  ok(/\/rpc\/check_and_increment_usage`[\s\S]{0,200}Authorization: authHeader/.test(S.coach), L + 'C5: quota-check blijft auth.uid()-gebonden (gebruikers-JWT, atomair in de DB)');
  const noKey = await runComp(S.coach, {}, 'u1');
  ok(!noKey.missing && noKey.r === false && noKey.calls.length === 0, L + 'C6: zonder service key geen compensatie (fail-safe)');
  const withKey = await runComp(S.coach, { SUPABASE_SERVICE_ROLE_KEY: 'svc' }, 'u1');
  ok(withKey.r === true && withKey.calls.length === 1 && JSON.parse(withKey.calls[0].i.body).p_user_id === 'u1', L + 'C7: met service key precies één compensatie voor de juiste gebruiker');
  const noUser = await runComp(S.coach, { SUPABASE_SERVICE_ROLE_KEY: 'svc' }, null);
  ok(noUser.r === false && noUser.calls.length === 0, L + 'C8: zonder geverifieerde gebruiker geen compensatie');
  ok(/rollback;\s*$/.test(S.verify.trim() + '\n') && /N2 client decrement_usage/.test(S.verify) && /N4 client decrement_usage_for_user \(forged id B\)/.test(S.verify) && /P2 server-compensatie/.test(S.verify) && /X1 stand B/.test(S.verify) && !/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.test(S.verify), L + 'V1: verificatiescript (rollback, geen echte ids)');
  ok(/F-SEC-002/.test(S.doc) && /v573/.test(S.doc), L + 'D1: auditdocument bijgewerkt');
}
(async function () {
  await check(SRC, '');
  const sab = [
    ['authenticated krijgt decrement_usage terug', s => Object.assign({}, s, { mig: s.mig + '\ngrant execute on function public.decrement_usage(text, date) to authenticated;\n' })],
    ['client-revoke vergeten', s => Object.assign({}, s, { mig: s.mig.replace('revoke execute on function public.decrement_usage(text, date) from public, anon, authenticated;', '') })],
    ['nieuwe functie client-callable', s => Object.assign({}, s, { mig: s.mig.replace('from public, anon, authenticated;\ngrant execute on function public.decrement_usage_for_user(uuid, text, date) to service_role;', 'from public, anon;\ngrant execute on function public.decrement_usage_for_user(uuid, text, date) to service_role, authenticated;') })],
    ['service_role gebroken', s => Object.assign({}, s, { mig: s.mig.replace('grant execute on function public.decrement_usage_for_user(uuid, text, date) to service_role;', '') })],
    ['vloer 0 weg', s => Object.assign({}, s, { mig: s.mig.replace('greatest(aantal - 1, 0)', 'aantal - 1') })],
    ['compensatie met gebruikers-JWT', s => Object.assign({}, s, { coach: s.coach.replace("apikey: serviceKey, Authorization: 'Bearer ' + serviceKey", 'apikey: serviceKey, Authorization: authHeader') })],
    ['user_id uit de request', s => Object.assign({}, s, { coach: s.coach.replace('p_user_id: userId', 'p_user_id: body.userId') })],
    ['compensatie zonder reservering', s => Object.assign({}, s, { coach: s.coach.replace('    if (quotaGereserveerd) {\n      await compenseerQuota', '    if (true) {\n      await compenseerQuota') })],
    ['fail-safe zonder key weg', s => Object.assign({}, s, { coach: s.coach.replace('if (!serviceKey || !userId || !featureKey || !periode) return false;', 'if (!userId) return false;') })]
  ];
  for (const [name, mut] of sab) {
    const S2 = mut(SRC);
    if (S2.mig === SRC.mig && S2.coach === SRC.coach) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); continue; }
    const pp = pass, ff = fail; mute = true; await check(S2, '[sab] '); mute = false; const caught = fail > ff; pass = pp; fail = ff;
    if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
    ok(caught, 'SABOTAGE gedetecteerd via assertie: ' + name);
  }
  console.log('\n[SecUsageQuota F-SEC-002] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})();
