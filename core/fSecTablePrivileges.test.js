/* F-SEC-005 closure — least-privilege tabelrechten (migratie_v572).
 * CI-bewijs zonder database: (1) v572 trekt TRUNCATE/REFERENCES/TRIGGER in van anon, authenticated en PUBLIC op
 * ALLE tabellen in public (loop over pg_class, niet een handmatige lijst); (2) de default privileges van de
 * tabel-owner (postgres) in public worden ook gehard, zodat nieuwe tabellen de rechten niet opnieuw erven;
 * (3) niets anders wordt aangeraakt: geen DML-revoke, geen RLS-/policy-wijziging, service_role ongemoeid;
 * (4) geen TK-client of -functie gebruikt de ingetrokken rechten; (5) rollback-verificatiescript en auditdocument
 * aanwezig; (6) sabotage wordt gedetecteerd. Live-evidence: docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fnDir = path.join(ROOT, 'netlify/functions');
const SRC = { mig: rd('migratie_v572.sql'), index: rd('index.html'), verify: rd('tools/verify-f-sec-005.sql'), doc: rd('docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md'),
  fns: fs.readdirSync(fnDir).filter(f => /\.js$/.test(f)).map(f => fs.readFileSync(path.join(fnDir, f), 'utf8')).join('\n') };
let pass = 0, fail = 0, mute = false;
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const code = s => s.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
function check(S, L) {
  L = L || '';
  const m = code(S.mig);
  ok(/for rc in\s+select c\.relname from pg_class c join pg_namespace n on n\.oid = c\.relnamespace\s+where n\.nspname = 'public' and c\.relkind in \('r', 'p'\)/.test(m), L + 'M1: revoke loopt over alle tabellen in public (geen handmatige lijst)');
  ok(/revoke truncate, references, trigger on table public\.%I from anon, authenticated, public/.test(m), L + 'M2: TRUNCATE/REFERENCES/TRIGGER ingetrokken van anon, authenticated en PUBLIC');
  ok(/alter default privileges for role postgres in schema public\s+revoke truncate, references, trigger on tables from anon, authenticated, public;/.test(m), L + 'M3: default privileges van de tabel-owner gehard (toekomstige tabellen)');
  ok(!/\bgrant\b/i.test(m), L + 'M4: geen enkele grant (niets verbreed)');
  ok(!/revoke[^;]*\b(select|insert|update|delete|all)\b[^;]*on/i.test(m), L + 'M5: geen DML- of ALL-revoke (callers ongemoeid)');
  ok(!/service_role/i.test(m), L + 'M6: service_role niet aangeraakt');
  ok(!/row level security|create policy|drop policy|alter policy|disable/i.test(m), L + 'M7: RLS en policies ongewijzigd');
  ok(!/\bsequence\b|\bfunction\b/i.test(m), L + 'M8: geen sequence-/functiewijziging in deze slice');
  ok(!/\btruncate\b/i.test(S.index) && !/\btruncate\b|create trigger/i.test(S.fns), L + 'C1: geen TK-client of Netlify-functie gebruikt TRUNCATE/TRIGGER');
  ok(/rollback;\s*$/.test(S.verify.trim() + '\n') && /authenticated TRUNCATE/.test(S.verify) && /anon TRUNCATE/.test(S.verify) && /authenticated CREATE TRIGGER/.test(S.verify) && /nieuwe tabel: auth TRUNCATE\/REFERENCES\/TRIGGER/.test(S.verify) && /service_role TRUNCATE/.test(S.verify) && /cross-user INSERT/.test(S.verify), L + 'V1: verificatiescript dekt TRUNCATE, TRIGGER, default privileges, service_role, RLS en eindigt met ROLLBACK');
  ok(!/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.test(S.verify), L + 'V2: geen echte user-id in het script');
  ok(/F-SEC-005/.test(S.doc) && /v572/.test(S.doc), L + 'D1: auditdocument bijgewerkt');
}
check(SRC, '');
const sab = [
  ['TRUNCATE niet meer ingetrokken', s => Object.assign({}, s, { mig: s.mig.replace('revoke truncate, references, trigger on table', 'revoke references, trigger on table') })],
  ['authenticated vergeten', s => Object.assign({}, s, { mig: s.mig.replace("from anon, authenticated, public', rc.relname", "from anon, public', rc.relname") })],
  ['PUBLIC vergeten', s => Object.assign({}, s, { mig: s.mig.replace("from anon, authenticated, public', rc.relname", "from anon, authenticated', rc.relname") })],
  ['default privileges niet gehard', s => Object.assign({}, s, { mig: s.mig.replace(/alter default privileges[\s\S]*?;/, '') })],
  ['REFERENCES opnieuw toegestaan', s => Object.assign({}, s, { mig: s.mig.replace('revoke truncate, references, trigger on table', 'revoke truncate, trigger on table') })],
  ['TRIGGER opnieuw verleend', s => Object.assign({}, s, { mig: s.mig + '\ngrant trigger on all tables in schema public to authenticated;\n' })],
  ['alleen bestaande tabellen (handmatige lijst)', s => Object.assign({}, s, { mig: s.mig.replace("where n.nspname = 'public' and c.relkind in ('r', 'p')", "where n.nspname = 'public' and c.relname in ('users')") })],
  ['RLS uitgezet', s => Object.assign({}, s, { mig: s.mig + '\nalter table public.users disable row level security;\n' })],
  ['service_role gebroken', s => Object.assign({}, s, { mig: s.mig + '\nrevoke all on all tables in schema public from service_role;\n' })]
];
sab.forEach(([name, mut]) => {
  const S2 = mut(SRC);
  if (S2.mig === SRC.mig) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); return; }
  const pp = pass, ff = fail; mute = true; check(S2, '[sab] '); mute = false; const caught = fail > ff; pass = pp; fail = ff;
  if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
  ok(caught, 'SABOTAGE gedetecteerd via assertie: ' + name);
});
console.log('\n[SecTablePrivileges F-SEC-005] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
