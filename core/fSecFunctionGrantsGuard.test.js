/* F-SEC-010 — default function EXECUTE hardening (migratie_v576) + CI-guard tools/check-function-grants.js.
 * Bewijst: (1) v576 hardt uitsluitend toekomstige defaults van postgres (globaal PUBLIC eruit, extensions-schema
 * ongewijzigd gedrag, public zonder anon/authenticated, service_role blijft), zonder bestaande functies/supabase_admin
 * te raken; (2) de guard accepteert correcte migraties en weigert elke overtreding (R1–R5); (3) de guard draait op
 * alle migraties na v575 in deze repo; (4) sabotage van guard of migratie wordt gedetecteerd. */
'use strict';
const fs = require('fs'); const path = require('path'); const os = require('os');
const ROOT = path.join(__dirname, '..');
const GUARD_SRC = fs.readFileSync(path.join(ROOT, 'tools/check-function-grants.js'), 'utf8');
const MIG = fs.readFileSync(path.join(ROOT, 'migratie_v576.sql'), 'utf8');
const V571 = fs.readFileSync(path.join(ROOT, 'migratie_v571.sql'), 'utf8');
let pass = 0, fail = 0, mute = false;
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
function loadGuard(src) { const m = { exports: {} }; new Function('module', 'exports', 'require', '__dirname', src.replace(/^#!.*\n/, ''))(m, m.exports, require, path.join(ROOT, 'tools')); return m.exports; }
const code = s => s.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
const F = {
  invokerOk: "create or replace function public.f_ok(a int) returns int language sql as $$ select 1 $$;\ngrant execute on function public.f_ok(int) to authenticated;",
  triggerOk: "create function public.trg_ok() returns trigger language plpgsql as $$ begin return new; end $$;\nrevoke all on function public.trg_ok() from public, anon, authenticated;",
  definerOk: "create or replace function public.d_ok(p uuid) returns void language plpgsql security definer set search_path to 'public' as $function$ begin perform 1; end; $function$;\nrevoke all on function public.d_ok(uuid) from public, anon;\ngrant execute on function public.d_ok(uuid) to authenticated, service_role;",
  noGrant: "create function public.f_bad() returns int language sql as $$ select 1 $$;",
  definerNoPath: "create function public.d_np() returns int language sql security definer as $$ select 1 $$;\nrevoke all on function public.d_np() from public, anon;",
  definerNoRevoke: "create function public.d_nr() returns int language sql security definer set search_path = public as $$ select 1 $$;\ngrant execute on function public.d_nr() to authenticated;",
  definerRevokePublicOnly: "create function public.d_rp() returns int language sql security definer set search_path = public as $$ select 1 $$;\nrevoke all on function public.d_rp() from public;",
  definerToAnon: "create function public.d_anon() returns int language sql security definer set search_path = public as $$ select 1 $$;\nrevoke all on function public.d_anon() from public, anon;\ngrant execute on function public.d_anon() to anon;",
  definerToAnonMarked: "-- tk-security-allow-anon-execute: public.d_anon2 (bewuste uitzondering)\ncreate function public.d_anon2() returns int language sql security definer set search_path = public as $$ select 1 $$;\nrevoke all on function public.d_anon2() from public, anon;\ngrant execute on function public.d_anon2() to anon;",
  adpPublicSchema: "alter default privileges for role postgres in schema public grant execute on functions to anon;",
  adpGlobalPublic: "alter default privileges for role postgres grant execute on functions to public;",
  adpExtensionsOk: "alter default privileges for role postgres in schema extensions grant execute on functions to public;",
  grantInBodyOnly: "create function public.f_body() returns int language plpgsql as $$ begin execute 'grant execute on function public.f_body() to authenticated'; return 1; end $$;",
  preF004Style: "create or replace function public.upsert_x(p_user_id uuid) returns void language plpgsql security definer set search_path to 'public' as $$ begin perform 1; end $$;"
};
function run(G) {
  const R = {};
  Object.keys(F).forEach(k => { R[k] = G.checkMigration('x.sql', F[k]); });
  R.v571 = G.checkMigration('migratie_v571.sql', V571);
  R.repo = G.checkRepo(ROOT);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fgg-'));
  fs.writeFileSync(path.join(tmp, 'migratie_v500.sql'), F.noGrant); fs.writeFileSync(path.join(tmp, 'migratie_v999.sql'), F.noGrant);
  R.cutoff = G.checkRepo(tmp); fs.rmSync(tmp, { recursive: true, force: true });
  R.base = G.BASELINE_VERSION;
  return R;
}
const has = (errs, rule) => errs.some(e => e.indexOf(': ' + rule + ' ') !== -1);
function check(R, mig, L) {
  L = L || ''; const m = code(mig);
  ok(/^alter default privileges for role postgres revoke execute on functions from public;$/m.test(m), L + 'M1: globale PUBLIC EXECUTE-default voor postgres ingetrokken');
  ok(/^alter default privileges for role postgres in schema extensions grant execute on functions to public;$/m.test(m), L + 'M2: extensions-schema behoudt huidig gedrag (PUBLIC EXECUTE)');
  ok(/^alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;$/m.test(m), L + 'M3: public-defaults zonder anon/authenticated');
  ok(!/service_role/i.test(m) && !/supabase_admin/i.test(m), L + 'M4: service_role en supabase_admin ongemoeid');
  ok(!/create (or replace )?function|alter function|drop function|\bgrant\b[^;]*\bon\s+function\b|\brevoke\b[^;]*\bon\s+function\b/i.test(m), L + 'M5: geen bestaande functie gewijzigd (alleen defaults)');
  ok(!/\bon\s+(tables|sequences)\b/i.test(m), L + 'M6: tabel- en sequence-defaults ongemoeid');
  ok(R.invokerOk.length === 0 && R.triggerOk.length === 0 && R.definerOk.length === 0 && R.adpExtensionsOk.length === 0, L + 'P1: correcte migraties worden geaccepteerd');
  ok(R.definerToAnonMarked.length === 0, L + 'P2: bewuste anon-uitzondering met marker toegestaan');
  ok(R.v571.length === 0, L + 'P3: bestaande goede SECURITY DEFINER-migratie (v571) voldoet');
  ok(has(R.noGrant, 'R1'), L + 'N1: functie zonder expliciete grant/revoke geweigerd (R1)');
  ok(has(R.grantInBodyOnly, 'R1'), L + 'N2: grant alleen binnen de functiebody telt niet (R1)');
  ok(has(R.definerNoPath, 'R2'), L + 'N3: SECURITY DEFINER zonder search_path geweigerd (R2)');
  ok(has(R.definerNoRevoke, 'R3'), L + 'N4: SECURITY DEFINER zonder revoke geweigerd (R3)');
  ok(has(R.definerRevokePublicOnly, 'R3'), L + 'N5: SECURITY DEFINER met alleen PUBLIC-revoke geweigerd (R3)');
  ok(has(R.definerToAnon, 'R4'), L + 'N6: SECURITY DEFINER aan anon zonder marker geweigerd (R4)');
  ok(has(R.adpPublicSchema, 'R5') && has(R.adpGlobalPublic, 'R5'), L + 'N7: default function EXECUTE opnieuw verbreden geweigerd (R5)');
  ok(has(R.preF004Style, 'R1') && has(R.preF004Style, 'R3'), L + 'N8: het F-SEC-004-patroon (SECDEF zonder revoke) wordt gevangen');
  ok(R.base === 575 && R.cutoff.files.join() === 'migratie_v999.sql' && R.cutoff.errors.length === 1, L + 'C1: guard geldt voor migraties na v575, oudere zijn uitgezonderd');
  ok(R.repo.errors.length === 0 && R.repo.files.indexOf('migratie_v576.sql') !== -1, L + 'C2: alle migraties na v575 in deze repo voldoen (' + R.repo.errors.join(' | ') + ')');
}
check(run(loadGuard(GUARD_SRC)), MIG, '');
const sab = [
  ['guard: R1 uit', { g: s => s.replace("if (!privRe.test(sqlNoBodies)) errors.push", "if (false) errors.push") }],
  ['guard: R2 uit', { g: s => s.replace("if (!/set\\s+search_path/.test(header)) errors.push", "if (false) errors.push") }],
  ['guard: R3 alleen PUBLIC', { g: s => s.replace("&& /\\bfrom\\b[^;]*\\banon\\b/i.test(r)", "") }],
  ['guard: R4 uit', { g: s => s.replace("if (toAnon && markers.indexOf(name) === -1) errors.push", "if (false) errors.push") }],
  ['guard: R5 uit', { g: s => s.replace("if (inPublic || (global && /\\bto\\b[^;]*\\bpublic\\b/.test(s))) errors.push", "if (false) errors.push") }],
  ['guard: cutoff naar 9999', { g: s => s.replace('const BASELINE_VERSION = 575;', 'const BASELINE_VERSION = 9999;') }],
  ['guard: grants in functiebody tellen mee', { g: s => s.replace("const sqlNoBodies = bodyFree(stripComments(raw));", "const sqlNoBodies = stripComments(raw);") }],
  ['migratie: globale PUBLIC-revoke weg', { m: s => s.replace('alter default privileges for role postgres revoke execute on functions from public;\n', '') }],
  ['migratie: extensions niet hersteld', { m: s => s.replace('alter default privileges for role postgres in schema extensions grant execute on functions to public;\n', '') }],
  ['migratie: anon blijft in public-default', { m: s => s.replace('revoke execute on functions from anon, authenticated;', 'revoke execute on functions from authenticated;') }],
  ['migratie: service_role gebroken', { m: s => s + '\nalter default privileges for role postgres in schema public revoke execute on functions from service_role;\n' }],
  ['migratie: bestaande functie aangeraakt', { m: s => s + '\nrevoke execute on function public.check_and_increment_usage(text, date, integer) from authenticated;\n' }]
];
sab.forEach(([name, mut]) => {
  const g2 = mut.g ? mut.g(GUARD_SRC) : GUARD_SRC, m2 = mut.m ? mut.m(MIG) : MIG;
  if (g2 === GUARD_SRC && m2 === MIG) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); return; }
  const pp = pass, ff = fail; let caught = false;
  try { mute = true; check(run(loadGuard(g2)), m2, '[sab] '); caught = fail > ff; } catch (e) { caught = false; } finally { mute = false; pass = pp; fail = ff; }
  if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
  ok(caught, 'SABOTAGE gedetecteerd via assertie: ' + name);
});
console.log('\n[SecFunctionGrantsGuard F-SEC-010] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
