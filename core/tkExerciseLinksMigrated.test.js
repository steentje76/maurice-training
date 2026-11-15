'use strict';
// DEC-EXLINK-005 (fase 3a): app klaar voor historie op het MoveKit-id.
// Bewijst op de ECHTE module, de ECHTE index.html-functies (vm) en de ECHTE migratie (PGlite).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MIG_LINKS = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261114180000_tk_exercise_catalog_links.sql'), 'utf8');
const MIG = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261115160000_tk_exercise_catalog_links_migrated_at.sql'), 'utf8');
const { create } = require(path.join(ROOT, 'core/tkExerciseLinks.js'));
function fn(name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(html); assert(m, name);
  let d = 0; for (let i = html.indexOf('{', m.index); i < html.length; i++) { if (html[i] === '{') d++; if (html[i] === '}' && --d === 0) return html.slice(m.index, i + 1); }
  throw new Error('unterminated ' + name);
}
let checks = 0; function ok(v, label) { assert(v, label); checks++; console.log('  ok  ' + label); }
const A = '11111111-1111-1111-1111-111111111111';
const NOW = '2026-11-15T12:00:00Z';

(async () => {
  console.log('\nA. Module: gemigreerde koppeling');
  const L = create();
  L.load([
    { user_id: A, exercise_id: 'bench_press', catalog_id: 'TK-000019', merged_into: null, hidden: false, migrated_at: NOW },
    { user_id: A, exercise_id: 'TK-000038', catalog_id: 'TK-000038', merged_into: null, hidden: false, migrated_at: NOW },
    { user_id: A, exercise_id: 'ohp', catalog_id: 'TK-000050', merged_into: null, hidden: false, migrated_at: null },
    { user_id: A, exercise_id: 'bench_old', catalog_id: 'TK-000019', merged_into: 'bench_press', hidden: false, migrated_at: NOW }
  ], A);
  ok(L.survivorForCatalog('TK-000019') === null && L.survivorForCatalog('TK-000038') === null, 'A1: gemigreerd → geen omleiding naar de eigen oefening');
  ok(L.survivorForCatalog('TK-000050') === 'ohp', 'A2: niet-gemigreerde koppeling blijft omleiden (DEC-EXLINK-002)');
  ok(L.isHidden('bench_press') && L.isHidden('TK-000038') && !L.isHidden('ohp'), 'A3: gemigreerde eigen oefening niet meer in kieslijsten');
  ok(L.migratedForCatalog('TK-000019') && L.migratedForCatalog('TK-000038') && !L.migratedForCatalog('TK-000050'), 'A4: migratiestand per MoveKit-item');
  ok(L.aliasOf('bench_old') === 'bench_press' && !L.isMigrated('bench_old'), 'A5: samenvoeging blijft samenvoeging (wordt nooit gemigreerd)');
  const L2 = create(); L2.load(L.rows(), A);
  ok(L2.migratedForCatalog('TK-000019') && L2.isMigrated('bench_press'), 'A6: cache-rondreis bewaart de migratiestand');

  console.log('\nB. Afgeleide MoveKit-bron voor sessie-items');
  const st = { release: true, exercises: [{ id: 'TK-000019', active: true }, { id: 'TK-000077', active: true }, { id: 'squat', active: true }] };
  const ctx = {
    get TK504_TYPED_FK_SESSION_RELEASE() { return st.release; },
    get exercises() { return st.exercises; },
    tkExLinks: L,
    tk504CatalogSourceRefFromSelection: id => /^TK-\d{6}$/.test(id) && id !== 'TK-000999' ? { kind: 'movekit-catalog-v1', catalog_id: id, provider_id: 'mk-' + id.slice(3) } : null,
    resolvedWorkout: null, sessionExtra: [], TRAIN_CFG: {}, applySessionRecovery: (t, base) => base
  };
  const s = vm.createContext(ctx);
  vm.runInContext(['tk504DerivedCatalogRef', 'tk504AttachDerivedRef', 'getSessionExs'].map(fn).join('\n'), s);
  ok(s.tk504DerivedCatalogRef('TK-000019').catalog_id === 'TK-000019', 'B1: gemigreerd + actieve legacy-rij (gedeeld, bv. bankdrukken) → MoveKit-bron');
  ok(s.tk504DerivedCatalogRef('TK-000077') === null, 'B2: actieve legacy-rij, niet gemigreerd → legacy-pad ongewijzigd');
  ok(s.tk504DerivedCatalogRef('TK-000123').provider_id === 'mk-000123', 'B3: geen eigen rij → MoveKit-bron');
  ok(s.tk504DerivedCatalogRef('squat') === null && s.tk504DerivedCatalogRef('TK-000999') === null, 'B4: eigen id of onbekend catalogus-id → niets');
  st.release = false; ok(s.tk504DerivedCatalogRef('TK-000123') === null, 'B5: zonder vrijgave niets'); st.release = true;
  const keep = st.exercises; st.exercises = [];
  ok(s.tk504DerivedCatalogRef('TK-000123') === null, 'B6: oefeningenlijst niet geladen → onbekend, dus legacy laten'); st.exercises = keep;
  const own = { id: 'TK-000123', tk504_catalog_ref: { kind: 'movekit-catalog-v1', catalog_id: 'TK-000123', provider_id: 'eigen' } };
  ctx.TRAIN_CFG.A = [{ id: 'TK-000019' }, { id: 'squat' }, own];
  const list = s.getSessionExs('A');
  ok(list[0].tk504_catalog_ref && list[0].tk504_catalog_ref.catalog_id === 'TK-000019' && list[0] === ctx.TRAIN_CFG.A[0], 'B7: getSessionExs koppelt de bron aan hetzelfde object (identiteit blijft)');
  ok(list[1].tk504_catalog_ref === undefined && list[2].tk504_catalog_ref.provider_id === 'eigen', 'B8: eigen oefening ongemoeid; bestaande bron nooit overschreven');

  console.log('\nC. Eigen-oefening-omleiding en doelsleutel na migratie');
  const c2 = vm.createContext({ tkExLinks: L, exercises: [{ id: 'bench_press', active: true }, { id: 'ohp', active: true }], TK504_TYPED_FK_SESSION_RELEASE: true, exerciseGoals: new Map() });
  vm.runInContext(['tkExLinkOwnExerciseForCatalog', 'tkGoalKey', 'tkRestKey'].map(fn).join('\n'), c2);
  ok(c2.tkExLinkOwnExerciseForCatalog('TK-000019') === null && c2.tkExLinkOwnExerciseForCatalog('TK-000050') === 'ohp', 'C1: gemigreerd item logt niet meer op de eigen oefening');
  ok(c2.tkGoalKey('TK-000019') === 'TKC-000019' && c2.tkRestKey('TK-000019') === 'TKC-000019', 'C2: doelen en rusttijd op het MoveKit-id');

  console.log('\nD. Historienaam van een MoveKit-sessie (ook offline)');
  const cache = { owner_uid: A, entries: { 'TK-000019': { p: 'mk-000019', fk: 'TKC-000019' } } };
  const d = { online: false, rpcs: 0 };
  const c3 = vm.createContext({
    TK504_TYPED_FK_SESSION_RELEASE: true, navigator: { get onLine() { return d.online; } }, tkEigenaarUid: () => A,
    tk504ReleasedFkRead: o => (o === A ? cache : null),
    tk504ReleasedFkEntryValid: (cid, p, fk) => /^TK-\d{6}$/.test(cid) && typeof p === 'string' && fk === 'TKC-' + cid.slice(3),
    ExerciseCatalogService: { byId: id => (id === 'TK-000019' ? { catalog_id: id, source: { provider: 'movekit', provider_id: 'mk-000019' }, identity: { nl: 'Bankdrukken', name: 'Bench Press' } } : null) },
    sbRpc: async () => { d.rpcs++; return null; }
  });
  vm.runInContext(fn('tk504HistoricalSourceForSession'), c3);
  const h1 = await c3.tk504HistoricalSourceForSession('TKC-000019');
  ok(h1 && h1.name === 'Bankdrukken' && h1.catalog_id === 'TK-000019' && d.rpcs === 0, 'D1: offline naam uit de vrijgavelijst van deze eigenaar, zonder RPC');
  ok(await c3.tk504HistoricalSourceForSession('TKC-000020') === null && d.rpcs === 0, 'D2: niet in de lijst en offline → geen naam geraden');
  cache.entries['TK-000019'].p = 'vals';
  d.online = true; await c3.tk504HistoricalSourceForSession('TKC-000019');
  ok(d.rpcs === 1, 'D3: lijst klopt niet met de catalogus → bestaande RPC-route');

  console.log('\nE. Bron');
  ok(/tkExLinkIsHidden\(e\.id\)===true\)\);\n?\s*if\(!exs\.length\)return;/.test(html.replace(/\r/g, '')), 'E1: Beheer toont gemigreerde/samengevoegde oefeningen niet');

  console.log('\nF. Migratie (PGlite)');
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key); insert into auth.users values ('${A}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    create table public.exercises (id text primary key); insert into public.exercises values ('bench_press'), ('bench_old');
  `);
  await db.exec(MIG_LINKS); await db.exec(MIG); await db.exec(MIG);
  ok(true, 'F1: migratie herhaalbaar');
  await db.exec(`insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id, migrated_at) values ('${A}', 'bench_press', 'TK-000019', now())`);
  let bad = true; try { await db.exec(`insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id, merged_into, migrated_at) values ('${A}', 'bench_old', 'TK-000019', 'bench_press', now())`); } catch (_) { bad = false; }
  ok(!bad, 'F2: samengevoegde koppeling kan niet "gemigreerd" zijn');

  console.log('\n[DEC-EXLINK-005] fase 3a: ' + checks + ' checks geslaagd');
})().catch(e => { console.error(e); process.exit(1); });
