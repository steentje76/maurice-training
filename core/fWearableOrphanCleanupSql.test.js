/* fWearableOrphanCleanupSql.test.js — v4.70.25 (DEC-VAULT-001).
 *
 * Voert migratie_v581.sql ECHT uit in een in-process PostgreSQL (PGlite) en toetst het gedrag
 * van cleanup_orphan_wearable_token_secrets() en delete_wearable_token_secret().
 *
 * EERLIJKE GRENS. Supabase Vault zelf (pgsodium, vault.create_secret, versleuteling) bestaat
 * niet in PGlite. vault.secrets is hier nagebouwd met dezelfde kolommen en dezelfde unieke
 * index als op productie (secrets_name_idx, live uitgelezen op 11 oktober 2026). Bewezen
 * wordt dus de SQL-logica en de rechten van deze migratie, niet Vault. De migratie is niet
 * op productie toegepast.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');
const ROOT = path.join(__dirname, '..');
const MIG = fs.readFileSync(path.join(ROOT, 'migratie_v581.sql'), 'utf8');

let pass = 0, fail = 0; const msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + m); } }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

const U1 = '9b534bd1-0070-4e15-aa01-3ca3695bc9eb';
const U2 = 'd8116e6c-d5ca-47c9-ac8a-5a1f89ed4dcb';
const N = (i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0');

const FIXTURE = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema vault;
create table vault.secrets (
  id uuid primary key default gen_random_uuid(), name text, description text not null default '',
  secret text not null, key_id uuid, nonce bytea,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index secrets_name_idx on vault.secrets using btree (name) where (name is not null);
create table public.wearable_connections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, provider text not null,
  access_token_secret_id uuid, refresh_token_secret_id uuid, unique (user_id, provider));
grant usage on schema public to anon, authenticated, service_role;
`;

async function db0() { const db = new PGlite(); await db.exec(FIXTURE); await db.exec(MIG); return db; }
async function secret(db, id, naam, minutenOud) {
  await db.query("insert into vault.secrets (id, name, secret, created_at) values ($1, $2, 'versleuteld', now() - ($3 || ' minutes')::interval)", [id, naam, String(minutenOud)]);
}
async function namen(db) { return (await db.query('select name from vault.secrets order by name')).rows.map((r) => r.name); }
async function als(db, rol, sql, params) {
  await db.exec('set role ' + rol);
  try { return { ok: true, rows: (await db.query(sql, params || [])).rows }; }
  catch (e) { return { ok: false, code: e.code }; }
  finally { await db.exec('reset role'); }
}

async function main() {
  /* ══ A. De migratie is uitvoerbaar en herhaalbaar ═══════════════════════════════════ */
  let db = await db0();
  let herhaald = true; try { await db.exec(MIG); } catch (_) { herhaald = false; }
  ok(herhaald, 'A1 de migratie kan zonder fout een tweede keer worden uitgevoerd (create or replace)');

  /* ══ B. Rechten: alleen service_role ════════════════════════════════════════════════ */
  for (const fn of ['cleanup_orphan_wearable_token_secrets(uuid)', 'delete_wearable_token_secret(uuid)']) {
    const r = (await db.query("select has_function_privilege('anon', $1, 'execute') a, has_function_privilege('authenticated', $1, 'execute') b, has_function_privilege('service_role', $1, 'execute') c", ['public.' + fn])).rows[0];
    eq([r.a, r.b, r.c], [false, false, true], 'B1 ' + fn + ': anon nee, authenticated nee, service_role ja');
  }
  eq((await als(db, 'anon', 'select public.cleanup_orphan_wearable_token_secrets(null)')).code, '42501', 'B2 anon krijgt permission denied');
  eq((await als(db, 'authenticated', 'select public.cleanup_orphan_wearable_token_secrets($1)', [U1])).code, '42501', 'B3 authenticated krijgt permission denied');
  eq((await als(db, 'authenticated', 'select public.delete_wearable_token_secret($1)', [N(1)])).code, '42501', 'B4 authenticated kan geen secret verwijderen');
  eq((await als(db, 'service_role', 'select * from vault.secrets')).code, '42501', 'B5 (controle) service_role heeft zelf geen toegang tot vault.secrets: alleen via de functie');

  /* ══ C. Per gebruiker: precies de eigen wezen ouder dan 15 minuten ══════════════════ */
  await secret(db, N(1), 'wearable_access_' + U1, 60 * 24 * 31);                 // productie: oude vaste naam, wees
  await secret(db, N(2), 'wearable_refresh_' + U1, 60 * 24 * 31);                // idem
  await secret(db, N(3), 'wearable_access_' + U1 + '_' + N(103), 16);            // nieuwe naamvorm, wees, oud genoeg
  await secret(db, N(4), 'wearable_access_' + U1 + '_' + N(104), 14);            // wees maar te jong (lopende koppeling)
  await secret(db, N(5), 'wearable_access_' + U1 + '_' + N(105), 600);           // in gebruik (access)
  await secret(db, N(6), 'wearable_refresh_' + U1 + '_' + N(106), 600);          // in gebruik (refresh)
  await secret(db, N(7), 'wearable_access_' + U2, 60 * 24 * 40);                 // andere gebruiker, wees
  await secret(db, N(8), 'polar_access_' + U1, 600);                             // andere provider, zelfde gebruiker, wees
  await secret(db, N(9), 'mollie_api_key', 60 * 24 * 90);                        // heeft niets met wearables te maken
  await secret(db, N(10), 'wearable_access_' + U1 + '_extra', 600);              // lijkt erop, maar past niet in het patroon
  await secret(db, N(11), 'xwearable_access_' + U1, 600);                        // prefix past niet
  await db.query("insert into vault.secrets (id, name, secret, created_at) values ($1, null, 'x', now() - interval '90 days')", [N(12)]); // naamloos
  await db.query("insert into public.wearable_connections (user_id, provider, access_token_secret_id, refresh_token_secret_id) values ($1, 'google_health', $2, $3)", [U1, N(5), N(6)]);

  let r = await als(db, 'service_role', 'select public.cleanup_orphan_wearable_token_secrets($1) n', [U1]);
  eq(r.ok && r.rows[0].n, 4, 'C1 vier wezen van deze gebruiker verwijderd (2 oude vaste namen, 1 nieuwe naamvorm, 1 andere provider)');
  const na = await namen(db);
  ok(na.indexOf('wearable_access_' + U1) === -1 && na.indexOf('wearable_refresh_' + U1) === -1, 'C2 de secrets met de oude vaste naam (de blokkade van 11 oktober) zijn weg');
  ok(na.indexOf('wearable_access_' + U1 + '_' + N(104)) !== -1, 'C3 een wees jonger dan 15 minuten blijft staan');
  ok(na.indexOf('wearable_access_' + U1 + '_' + N(105)) !== -1 && na.indexOf('wearable_refresh_' + U1 + '_' + N(106)) !== -1, 'C4 secrets waar een koppeling naar verwijst blijven staan');
  ok(na.indexOf('wearable_access_' + U2) !== -1, 'C5 het wees-secret van een andere gebruiker blijft staan');
  ok(na.indexOf('mollie_api_key') !== -1 && na.indexOf('wearable_access_' + U1 + '_extra') !== -1 && na.indexOf('xwearable_access_' + U1) !== -1, 'C6 secrets buiten het exacte wearable-patroon worden nooit geraakt');
  eq((await db.query('select count(*)::int n from vault.secrets where name is null')).rows[0].n, 1, 'C7 een naamloos secret wordt nooit geraakt');
  eq((await db.query('select count(*)::int n from public.wearable_connections')).rows[0].n, 1, 'C8 de koppeling zelf is ongewijzigd');
  r = await als(db, 'service_role', 'select public.cleanup_orphan_wearable_token_secrets($1) n', [U1]);
  eq(r.rows[0].n, 0, 'C9 een tweede aanroep verwijdert niets meer (idempotent)');

  /* ══ D. Beheeractie (null): ook wezen van verwijderde accounts ═══════════════════════ */
  r = await als(db, 'service_role', 'select public.cleanup_orphan_wearable_token_secrets(null) n');
  eq(r.rows[0].n, 1, 'D1 zonder user-id: het wees-secret van de andere (verwijderde) gebruiker wordt opgeruimd');
  const na2 = await namen(db);
  ok(na2.indexOf('wearable_access_' + U2) === -1, 'D2 dat secret is weg');
  ok(na2.indexOf('wearable_access_' + U1 + '_' + N(104)) !== -1 && na2.indexOf('wearable_access_' + U1 + '_' + N(105)) !== -1 && na2.indexOf('mollie_api_key') !== -1 && na2.indexOf('wearable_access_' + U1 + '_extra') !== -1,
    'D3 ook de beheeractie spaart jonge wezen, gekoppelde secrets en alles buiten het patroon');
  r = await als(db, 'service_role', 'select public.cleanup_orphan_wearable_token_secrets() n');
  ok(r.ok && r.rows[0].n === 0, 'D4 de parameter is optioneel (default null)');

  /* ══ E. De productiestand van 11 oktober, exact nagebouwd ═══════════════════════════ */
  db = await db0();
  await secret(db, '98dbde69-72d7-4768-8524-b788fef150e0', 'wearable_access_' + U1, 60 * 24 * 31);
  await secret(db, '474b6f78-09dc-4853-ac07-b575f4a81248', 'wearable_refresh_' + U1, 60 * 24 * 31);
  await secret(db, 'bcc2f624-c8cf-4ab9-90d5-e120f0da641f', 'wearable_access_' + U2, 60 * 24 * 41);
  await secret(db, '445ca5d1-a785-4a64-95db-25725b301510', 'wearable_refresh_' + U2, 60 * 24 * 41);
  // De oorzaak: dezelfde naam opnieuw aanmaken botst op de unieke index.
  let botst = null; try { await db.query("insert into vault.secrets (name, secret) values ($1, 'nieuw')", ['wearable_access_' + U1]); } catch (e) { botst = e.code; }
  eq(botst, '23505', 'E1 (oorzaak gereproduceerd) dezelfde secretnaam opnieuw aanmaken geeft SQLSTATE 23505');
  let uniek = true; try { await db.query("insert into vault.secrets (id, name, secret) values ($1, $2, 'nieuw')", [N(50), 'wearable_access_' + U1 + '_' + N(150)]); } catch (_) { uniek = false; }
  ok(uniek, 'E2 een unieke naam per autorisatie botst niet, ook niet zolang de oude secrets er nog staan');
  await db.query("insert into public.wearable_connections (user_id, provider, access_token_secret_id) values ($1, 'google_health', $2)", [U1, N(50)]);
  r = await als(db, 'service_role', 'select public.cleanup_orphan_wearable_token_secrets(null) n');
  eq(r.rows[0].n, 4, 'E3 de eenmalige beheeractie ruimt precies de vier bestaande wees-secrets op');
  eq(await namen(db), ['wearable_access_' + U1 + '_' + N(150)], 'E4 alleen het secret van de actieve koppeling blijft over');

  /* ══ F. delete_wearable_token_secret (repo-drift hersteld) ═════════════════════════ */
  r = await als(db, 'service_role', 'select public.delete_wearable_token_secret($1)', [N(50)]);
  ok(r.ok && (await namen(db)).length === 0, 'F1 service_role kan één secret op id verwijderen');
  r = await als(db, 'service_role', 'select public.delete_wearable_token_secret($1)', [N(999)]);
  ok(r.ok, 'F2 een onbekend id is geen fout');

  /* ══ G. De functie geeft nooit een secretwaarde terug ══════════════════════════════ */
  const def = (await db.query("select pg_get_function_result('public.cleanup_orphan_wearable_token_secrets(uuid)'::regprocedure) t")).rows[0].t;
  eq(def, 'integer', 'G1 het resultaat is alleen een aantal');
}

main().then(function () {
  console.log('fWearableOrphanCleanupSql: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) { console.error('fWearableOrphanCleanupSql: onverwachte fout', e); process.exit(1); });
