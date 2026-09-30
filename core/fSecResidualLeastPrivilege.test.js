/* Residual least-privilege closure (F-SEC-007 increment_usage, F-SEC-008 consume_credit, F-SEC-009 sequence-UPDATE;
 * migratie_v575). CI-bewijs zonder database: (1) EXECUTE op beide functies ingetrokken van PUBLIC/anon/authenticated
 * zonder body/signature-wijziging; (2) sequence-UPDATE ingetrokken op ALLE public sequences (loop) en in de
 * default privileges van postgres; USAGE/SELECT blijven; (3) niets verleend, service_role/supabase_admin ongemoeid;
 * (4) geen TK-caller van de functies en geen client-setval; (5) rollback-verificatiescript en auditdocument aanwezig;
 * (6) sabotage wordt gedetecteerd. Live-evidence: docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fnDir = path.join(ROOT, 'netlify/functions');
const SRC = { mig: rd('migratie_v575.sql'), index: rd('index.html'), verify: rd('tools/verify-residual-least-privilege.sql'), doc: rd('docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md'),
  fns: fs.readdirSync(fnDir).filter(f => /\.js$/.test(f)).map(f => fs.readFileSync(path.join(fnDir, f), 'utf8')).join('\n') };
let pass = 0, fail = 0, mute = false;
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const code = s => s.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
function check(S, L) {
  L = L || '';
  const m = code(S.mig);
  ok(/revoke execute on function public\.increment_usage\(text, date, integer\) from public, anon, authenticated;/.test(m), L + 'F1: increment_usage niet meer uitvoerbaar voor PUBLIC/anon/authenticated');
  ok(/revoke execute on function public\.consume_credit\(uuid, integer\) from public, anon, authenticated;/.test(m), L + 'F2: consume_credit niet meer uitvoerbaar voor PUBLIC/anon/authenticated');
  ok(!/create (or replace )?function|alter function|drop function|security (definer|invoker)|search_path/i.test(m), L + 'F3: geen functiebody/signature/security/search_path-wijziging');
  ok(/where n\.nspname = 'public' and c\.relkind = 'S'/.test(m) && /revoke update on sequence public\.%I from public, anon, authenticated/.test(m), L + 'S1: UPDATE ingetrokken op alle public sequences (loop)');
  ok(!/revoke[^;]*\b(usage|select|all)\b[^;]*sequence/i.test(m), L + 'S2: USAGE/SELECT op sequences blijven (inserts)');
  ok(!/setval|nextval|drop sequence|alter sequence|restart/i.test(m), L + 'S3: geen sequencewaarde of sequence gewijzigd');
  ok(/alter default privileges for role postgres in schema public\s+revoke update on sequences from anon, authenticated, public;/.test(m), L + 'S4: default privileges postgres/public voor sequences gehard (future drift)');
  ok(!/\bgrant\b/i.test(m) && !/service_role|supabase_admin/i.test(m), L + 'G1: niets verleend; service_role en supabase_admin ongemoeid');
  ok(!/policy|row level security|disable/i.test(m), L + 'G2: RLS en policies ongewijzigd');
  ok(!/rpc\/increment_usage|rpc\/consume_credit|\bincrement_usage\(|consume_credit\(/.test(S.index + S.fns), L + 'C1: geen TK-client of Netlify-caller van increment_usage/consume_credit');
  ok(!/\bsetval\s*\(|rpc\/setval/i.test(S.index + S.fns), L + 'C2: geen client-setval (setValueAtTime van WebAudio telt niet)');
  ok(/rollback;\s*$/.test(S.verify.trim() + '\n') && /N1 authenticated increment_usage/.test(S.verify) && /N2 authenticated consume_credit/.test(S.verify) && /N3 anon increment_usage/.test(S.verify) && /N4 anon consume_credit/.test(S.verify) && /P1 authenticated identity-insert/.test(S.verify) && /nieuwe sequence: authenticated UPDATE\/USAGE/.test(S.verify) && !/\bsetval\s*\(/i.test(S.verify), L + 'V1: verificatiescript (rollback, geen setval)');
  ok(!/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.test(S.verify), L + 'V2: geen echte user-id');
  ok(/F-SEC-007/.test(S.doc) && /F-SEC-008/.test(S.doc) && /F-SEC-009/.test(S.doc) && /v575/.test(S.doc), L + 'D1: auditdocument bijgewerkt');
}
check(SRC, '');
const sab = [
  ['authenticated krijgt increment_usage terug', s => Object.assign({}, s, { mig: s.mig + '\ngrant execute on function public.increment_usage(text, date, integer) to authenticated;\n' })],
  ['consume_credit-revoke vergeten', s => Object.assign({}, s, { mig: s.mig.replace('revoke execute on function public.consume_credit(uuid, integer) from public, anon, authenticated;', '') })],
  ['anon vergeten bij increment_usage', s => Object.assign({}, s, { mig: s.mig.replace('increment_usage(text, date, integer) from public, anon, authenticated', 'increment_usage(text, date, integer) from public, authenticated') })],
  ['sequence-UPDATE niet ingetrokken', s => Object.assign({}, s, { mig: s.mig.replace("revoke update on sequence public.%I from public, anon, authenticated", "revoke select on sequence public.%I from public") })],
  ['alleen één sequence', s => Object.assign({}, s, { mig: s.mig.replace("where n.nspname = 'public' and c.relkind = 'S'", "where n.nspname = 'public' and c.relname = 'goals_id_seq'") })],
  ['default privileges niet gehard', s => Object.assign({}, s, { mig: s.mig.replace(/alter default privileges[\s\S]*?;/, '') })],
  ['USAGE ingetrokken (breekt inserts)', s => Object.assign({}, s, { mig: s.mig + '\nrevoke usage on all sequences in schema public from authenticated;\n' })],
  ['functie gewijzigd', s => Object.assign({}, s, { mig: s.mig + '\nalter function public.consume_credit(uuid, integer) security invoker;\n' })],
  ['service_role gebroken', s => Object.assign({}, s, { mig: s.mig + '\nrevoke execute on function public.increment_usage(text, date, integer) from service_role;\n' })],
  ['supabase_admin aangeraakt', s => Object.assign({}, s, { mig: s.mig + '\nalter default privileges for role supabase_admin in schema public revoke update on sequences from anon;\n' })]
];
sab.forEach(([name, mut]) => {
  const S2 = mut(SRC);
  if (S2.mig === SRC.mig) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); return; }
  const pp = pass, ff = fail; mute = true; check(S2, '[sab] '); mute = false; const caught = fail > ff; pass = pp; fail = ff;
  if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
  ok(caught, 'SABOTAGE gedetecteerd via assertie: ' + name);
});
console.log('\n[SecResidualLeastPrivilege F-SEC-007/008/009] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
