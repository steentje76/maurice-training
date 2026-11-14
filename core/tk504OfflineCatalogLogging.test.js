'use strict';
// DEC-OFFLINE-CAT-001 — fase 2a: offline loggen op vrijgegeven MoveKit-oefeningen.
// Bewijst op de ECHTE index.html-functies (vm) en de ECHTE migratie (PGlite):
//  - offline: binding uit de eigenaar-gebonden vrijgavelijst, sessie gaat in de wachtrij (TKC-FK);
//  - zonder lijst / gemanipuleerde lijst / ander account: geen binding (ongewijzigd fail-closed);
//  - online: server is leidend; alleen bij een netwerkfout telt de lijst;
//  - verversing vervangt de lijst (ingetrokken = weg);
//  - de RPC geeft alleen actieve + gereviewde bindingen, alleen aan ingelogde gebruikers.
// Vaste synthetische account-id's — nooit echte.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MIG = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261114200000_tk504_released_catalog_fks_rpc.sql'), 'utf8');
process.on('unhandledRejection', (e) => { console.error(e); process.exit(1); });
let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
function fn(name) {
  const st = html.indexOf('function ' + name + '(');
  assert.ok(st >= 0, 'function ' + name);
  let d = 0;
  for (let j = html.indexOf('{', st); j < html.length; j++) {
    if (html[j] === '{') d++; else if (html[j] === '}' && --d === 0) return html.slice(st, j + 1);
  }
  throw new Error('unbalanced ' + name);
}
const A = '11111111-aaaa-4aaa-8aaa-111111111111', B = '22222222-bbbb-4bbb-8bbb-222222222222';
const REF = { kind: 'movekit-catalog-v1', catalog_id: 'TK-000300', provider_id: 'kettlebell-clean' };

function world() {
  const store = new Map();
  const c = vm.createContext({
    console, Date, JSON, Object, Number, Array, Error,
    TK504_TYPED_FK_SESSION_RELEASE: true,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    navigator: { onLine: true }, owner: A, rpc: null, queued: [], posted: [], fetchMode: 'ok',
    _store: store
  });
  vm.runInContext(`
    function tkEigenaarUid(){ return owner; }
    function tk504ValidateCatalogSourceRef(id,ref){
      return (ref&&ref.kind==='movekit-catalog-v1'&&ref.catalog_id===id&&typeof ref.provider_id==='string')
        ?{kind:ref.kind,catalog_id:ref.catalog_id,provider_id:ref.provider_id}:null;
    }
    async function sbRpc(fn,args){ return rpc?rpc(fn,args,sbRpc):null; }
    const IDEMPOTENT_TABELLEN_MET_CLIENT_ID={sessions:true}, TK_IDEMPOTENT_ZONDER_UPDATE={}, TK_WACHTRIJ_OUDERS={};
    const TK_SCHRIJF_TIMEOUT_MS=1000;
    function tkNormalizeSessionsRow(d){ return d; }
    function newClientRowId(){ return 'row-x'; }
    function tkLogSchrijf(){}
    function tkSchrijfUitkomst(status,http,reden){ return {status,http,reden}; }
    async function offlineQueueAdd(item){ queued.push({...item, owner_uid: owner}); return true; }
    function updateOfflineBadge(){}
    async function tkWachtrijHeeftOuder(){ return false; }
    function sbRetryable(s){ return s>=500||s===429||s===401; }
    function tkFoutcode(){ return ''; }
    async function tkMetTimeout(p){ return p; }
    const SB_URL='https://x';
    async function sbFetch(url,opts){ if(fetchMode==='network')throw new Error('net'); posted.push(opts.body); return {ok:true,status:201,text:async()=>''}; }
    function tk504RewriteVerifiedSessionRow(row,b){ return {...row,exercise_id:b.fk_id}; }
  ` + '\n' + [
    'async ' + fn('tk504VerifySessionBinding'), fn('tk504ReleasedFkEntryValid'), fn('tk504ReleasedFkRead'),
    fn('tk504ReleasedFkWrite'), fn('tk504ReleasedFkRemember'), fn('tk504OfflineBindingFor'),
    'async ' + fn('tk504RefreshReleasedFkCache'), 'async ' + fn('sbPostQ')
  ].join('\n') + '\nconst TK504_RELEASED_FK_CACHE="tk504_released_fks_v1:";', c);
  return c;
}
const run = (c, code) => vm.runInContext(code, c);
const verify = (c, ref = REF) => { c.input = { id: ref.catalog_id, tk504_catalog_ref: ref }; return run(c, 'tk504VerifySessionBinding(input)'); };
const rejectsWith = async (p, re, m) => { let e = null; try { await p; } catch (x) { e = x; } ok(e && re.test(e.message), m + ' (' + (e && e.message) + ')'); };

(async () => {
  // ── A. Vrijgavelijst ophalen ────────────────────────────────────────────────
  let c = world();
  c.rpc = (fn) => fn === 'tk504_released_catalog_fks'
    ? [{ catalog_id: 'TK-000300', provider_id: 'kettlebell-clean', exercise_id: 'TKC-000300' },
       { catalog_id: 'TK-000301', provider_id: 'x', exercise_id: 'TKC-000999' }, // onjuiste FK → genegeerd
       { catalog_id: 'TK-000900', provider_id: 'y', exercise_id: 'TKC-000900' }]  // buiten 1..582 → genegeerd
    : null;
  ok(await run(c, 'tk504RefreshReleasedFkCache()') === true, 'A1 lijst opgehaald');
  const cache = JSON.parse(c._store.get('tk504_released_fks_v1:' + A));
  eq([cache.owner_uid, Object.keys(cache.entries), cache.full], [A, ['TK-000300'], true], 'A2 alleen geldige rijen, onder de eigenaar-sleutel');
  c.rpc = () => null;
  ok(await run(c, 'tk504RefreshReleasedFkCache()') === false, 'A3 mislukte verversing meldt false');
  ok(c._store.get('tk504_released_fks_v1:' + A) === JSON.stringify(cache), 'A4 mislukte verversing laat de laatst bekende lijst staan');
  c.navigator.onLine = false;
  ok(await run(c, 'tk504RefreshReleasedFkCache()') === false, 'A5 offline geen verversing');

  // ── B. Offline loggen ──────────────────────────────────────────────────────
  c.navigator.onLine = false;
  const b = await verify(c);
  eq([b.fk_id, b.owner_uid, b.verified], ['TKC-000300', A, 'offline-cache'], 'B1 offline binding uit de vrijgavelijst');
  c.row = { id: 'u-1', exercise_id: 'TK-000300', sets: 3, reps: 5, weight: 20 }; c.b = b;
  const res = await run(c, "sbPostQ('sessions', tk504RewriteVerifiedSessionRow(row,b), {tk504_binding:b, detail:true})");
  eq([res.status, c.queued.length, c.queued[0].body.exercise_id, c.queued[0].body.id, c.queued[0].owner_uid],
    ['queued', 1, 'TKC-000300', 'u-1', A], 'B2 sessie staat in de wachtrij met TKC-FK, zelfde id, eigenaar A');
  await rejectsWith(verify(c, { ...REF, catalog_id: 'TK-000301', provider_id: 'x' }), /tk504_typed_fk_offline_unverified/, 'B3 niet in de lijst → offline geweigerd');
  await rejectsWith(verify(c, { ...REF, provider_id: 'andere-bron' }), /tk504_typed_fk_offline_unverified/, 'B4 andere bron-id → geweigerd');
  c.owner = B; run(c, 'owner="' + B + '"');
  await rejectsWith(verify(c), /tk504_typed_fk_offline_unverified/, 'B5 ander account gebruikt de lijst van A niet');
  run(c, 'owner="' + A + '"');
  c._store.set('tk504_released_fks_v1:' + A, JSON.stringify({ owner_uid: A, entries: { 'TK-000300': { p: 'kettlebell-clean', fk: 'TKC-000301' } } }));
  await rejectsWith(verify(c), /tk504_typed_fk_offline_unverified/, 'B6 gemanipuleerde FK in de lijst → geweigerd');
  c._store.set('tk504_released_fks_v1:' + A, JSON.stringify({ owner_uid: B, entries: { 'TK-000300': { p: 'kettlebell-clean', fk: 'TKC-000300' } } }));
  await rejectsWith(verify(c), /tk504_typed_fk_offline_unverified/, 'B7 lijst met andere eigenaar onder deze sleutel → geweigerd');
  c._store.clear();
  await rejectsWith(verify(c), /tk504_typed_fk_offline_unverified/, 'B8 zonder lijst: exact het oude fail-closed gedrag');

  // ── C. Online: server leidend ──────────────────────────────────────────────
  c = world();
  c.rpc = (fn, a) => (fn === 'tk504_resolve_catalog_fk' && a.p_catalog_id === 'TK-000300') ? 'TKC-000300' : null;
  const on = await verify(c);
  ok(on.fk_id === 'TKC-000300' && !on.verified, 'C1 online binding van de server');
  ok(JSON.parse(c._store.get('tk504_released_fks_v1:' + A)).entries['TK-000300'].fk === 'TKC-000300', 'C2 bevestigde binding wordt onthouden voor offline');
  c.row = { id: 'u-2', exercise_id: 'TK-000300' }; c.b = on;
  const r2 = await run(c, "sbPostQ('sessions', tk504RewriteVerifiedSessionRow(row,b), {tk504_binding:b, detail:true})");
  eq([r2.status, c.posted.length, c.queued.length], ['confirmed', 1, 0], 'C3 online direct opgeslagen');
  c.fetchMode = 'network'; c.row = { id: 'u-3', exercise_id: 'TK-000300' };
  const r3 = await run(c, "sbPostQ('sessions', tk504RewriteVerifiedSessionRow(row,b), {tk504_binding:b, detail:true})");
  eq([r3.status, c.queued.length, c.queued[0].body.exercise_id], ['queued', 1, 'TKC-000300'], 'C4 netwerkfout tijdens opslaan → wachtrij (niet meer weggegooid)');
  // Server zegt "niet vrijgegeven" → geweigerd, ook als de lijst hem wel kent.
  c.rpc = () => null;
  await rejectsWith(verify(c), /tk504_catalog_fk_unverified/, 'C5 serverweigering is leidend boven de lijst');
  // Netwerkfout tijdens de controle ("online" maar geen verbinding) → lijst telt.
  c.rpc = (fn, a, self) => { self.lastNetworkFailure = { fn, at: Date.now() }; return null; };
  const nf = await verify(c);
  eq(nf.verified, 'offline-cache', 'C6 netwerkfout tijdens controle → lijst');
  // Oude netwerkfout van vóór deze vraag telt niet.
  c.rpc = (fn, a, self) => { self.lastNetworkFailure = { fn, at: 1 }; return null; };
  await rejectsWith(verify(c), /tk504_catalog_fk_unverified/, 'C7 een oude netwerkfout geeft geen vrijbrief');
  // Accountwissel tijdens opslaan → nooit onder een andere eigenaar in de wachtrij.
  c.fetchMode = 'network'; c.queued.length = 0; c.b = on; c.row = { id: 'u-4', exercise_id: 'TK-000300' };
  run(c, 'owner="' + B + '"');
  const r4 = await run(c, "sbPostQ('sessions', {id:'u-4',exercise_id:'TKC-000300'}, {tk504_binding:b, detail:true})");
  eq([r4.status, c.queued.length], ['failed', 0], 'C8 binding van A wordt nooit onder B gequeued');

  // ── D. Verversing vervangt (ingetrokken = weg) ─────────────────────────────
  c = world();
  c._store.set('tk504_released_fks_v1:' + A, JSON.stringify({ owner_uid: A, full: true, entries: { 'TK-000300': { p: 'kettlebell-clean', fk: 'TKC-000300' } } }));
  c.rpc = (fn) => fn === 'tk504_released_catalog_fks' ? [] : null;
  await run(c, 'tk504RefreshReleasedFkCache()');
  c.navigator.onLine = false;
  await rejectsWith(verify(c), /tk504_typed_fk_offline_unverified/, 'D1 ingetrokken vrijgave verdwijnt uit de lijst');

  // ── E. Statische contracten ────────────────────────────────────────────────
  ok(/tk504RefreshReleasedFkCache\(\); \/\/ DEC-OFFLINE-CAT-001/.test(html), 'E1 lijst wordt na inloggen ververst');
  ok(fn('sbRpc').includes('sbRpc.lastNetworkFailure={fn:fn,at:Date.now()}'), 'E2 sbRpc onthoudt alleen netwerkfouten (verder ongewijzigd)');
  ok(!/if\(confirmedOnly\)return uit\('failed',http,reden\|\|'offline'\)/.test(html), 'E3 oude "nooit in de wachtrij"-regel is vervangen');

  // ── F. RPC in PostgreSQL (PGlite) ──────────────────────────────────────────
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    create table public.movekit_catalog_fk_bindings (catalog_id text primary key, exercise_id text, provider_id text, active boolean, reviewed_at timestamptz);
    alter table public.movekit_catalog_fk_bindings enable row level security;
    insert into public.movekit_catalog_fk_bindings values
      ('TK-000001','TKC-000001','a',false,null), ('TK-000300','TKC-000300','kettlebell-clean',true,now()),
      ('TK-000301','TKC-000301','b',true,null), ('TK-000302','TKC-000999','c',true,now());
  `);
  await db.exec(MIG); await db.exec(MIG);
  ok(true, 'F1 migratie herhaalbaar');
  await db.exec("select set_config('request.jwt.claim.sub','" + A + "',false); set role authenticated;");
  const got = (await db.query('select * from public.tk504_released_catalog_fks()')).rows;
  eq(got, [{ catalog_id: 'TK-000300', provider_id: 'kettlebell-clean', exercise_id: 'TKC-000300' }], 'F2 alleen actief + gereviewd + juiste FK');
  let direct = true; try { await db.query('select * from public.movekit_catalog_fk_bindings'); } catch (_) { direct = false; }
  ok(!direct, 'F3 de bindingentabel zelf blijft onleesbaar voor clients');
  await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role authenticated;");
  eq((await db.query('select count(*)::int n from public.tk504_released_catalog_fks()')).rows[0].n, 0, 'F4 zonder ingelogde gebruiker: niets');
  await db.exec('reset role; set role anon;');
  let anonExec = true; try { await db.query('select * from public.tk504_released_catalog_fks()'); } catch (_) { anonExec = false; }
  ok(!anonExec, 'F5 anon mag de functie niet uitvoeren');

  console.log('[DEC-OFFLINE-CAT-001] offline catalogus-loggen: ' + checks + ' checks geslaagd');
})();
