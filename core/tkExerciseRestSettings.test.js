'use strict';
// DEC-EXLINK-004 (fase 2b-3): rusttijd per gebruiker per oefening.
// Bewijst op de ECHTE index.html-functies (vm) en de ECHTE migratie (PGlite).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MIG = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261115120000_tk_exercise_rest_settings.sql'), 'utf8');
function fn(name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(html); assert(m, name);
  let d = 0; for (let i = html.indexOf('{', m.index); i < html.length; i++) { if (html[i] === '{') d++; if (html[i] === '}' && --d === 0) return html.slice(m.index, i + 1); }
  throw new Error('unterminated ' + name);
}
let checks = 0; function ok(v, label) { assert(v, label); checks++; console.log('  ok  ' + label); }
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';

function make(opts = {}) {
  const store = Object.assign({}, opts.store || {});
  const st = { owner: opts.owner === undefined ? A : opts.owner, online: opts.online !== false, rpcs: [], rpcResult: opts.rpcResult === undefined ? true : opts.rpcResult,
    server: opts.server || { failed: false, rows: [] }, gets: [], switchOnGet: null };
  const ctx = {
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    navigator: { get onLine() { return st.online; } },
    tkEigenaarUid: () => st.owner,
    tkExLinkOwnExerciseForCatalog: id => (opts.links && opts.links[id]) || null,
    exercises: opts.exercises || [],
    sbGetOrFail: async (t, q) => { st.gets.push({ t, q }); if (st.switchOnGet) st.owner = st.switchOnGet; return st.server; },
    sbRpcQ: async (f, args) => { st.rpcs.push({ f, args }); return st.rpcResult; },
    escHtml: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    Map, Array, Number, String, JSON, Math, Object
  };
  const s = vm.createContext(ctx);
  vm.runInContext('let exerciseRestSettings=new Map();let _exerciseRestLoaded=false;' + html.match(/const TK_REST_CACHE='[^']+';/)[0] + '\n' +
    ['restDefaultSec', 'tkRestKey', 'tkRestCacheWrite', 'tkRestCacheRead', 'ensureExerciseRestLoaded', 'restSecondsFor', 'setExerciseRest', 'tkRestRowHtml'].map(fn).join('\n') +
    '\nthis.__map=()=>exerciseRestSettings;this.__loaded=()=>_exerciseRestLoaded;', s);
  return { s, st, store };
}

(async () => {
  console.log('\nA. Sleutel');
  let a = make();
  ok(a.s.tkRestKey('TK-000038') === 'TKC-000038', 'A1: MoveKit-catalogusitem → MoveKit-id (TKC-)');
  ok(a.s.tkRestKey('bench_press') === 'bench_press' && a.s.tkRestKey('TK-000999') === 'TK-000999', 'A2: eigen oefening en id buiten de 582 ongewijzigd');
  a = make({ links: { 'TK-000038': 'bench_press' } });
  ok(a.s.tkRestKey('TK-000038') === 'bench_press', 'A3: gekoppelde eigen oefening is leidend (DEC-EXLINK-002)');

  console.log('\nB. Lezen en terugval');
  a = make({ exercises: [{ id: 'squat', rest_seconds: 150 }] });
  ok(a.s.restSecondsFor('squat') === 150, 'B1: zonder eigen instelling: oude gedeelde waarde als terugval');
  a.s.__map().set('squat', 90);
  ok(a.s.restSecondsFor('squat') === 90, 'B2: eigen instelling gaat voor');
  a.s.__map().set('TKC-000038', 75);
  ok(a.s.restSecondsFor('TK-000038') === 75 && a.s.restSecondsFor('TK-000039') === null, 'B3: catalogusitem leest de waarde van zijn MoveKit-id, ander item niets');
  ok(/120s \(standaard\)/.test(a.s.tkRestRowHtml({ id: 'TK-000039', naam: 'X' })) && /75s · wijzigen/.test(a.s.tkRestRowHtml({ id: 'TK-000038', naam: 'Bank"drukken' })) &&
     a.s.tkRestRowHtml({ id: 'TK-000038', naam: 'Bank"drukken' }).includes('data-naam="Bank&quot;drukken"'), 'B4: rij in de training toont eigen of standaard rusttijd, naam veilig ge-escaped');

  console.log('\nC. Schrijven (wachtrij-veilig)');
  a = make();
  ok(await a.s.setExerciseRest('TK-000038', 90) === true, 'C1: opslaan geslaagd');
  ok(a.st.rpcs.length === 1 && a.st.rpcs[0].f === 'tk_set_exercise_rest' && a.st.rpcs[0].args.p_exercise_id === 'TKC-000038' && a.st.rpcs[0].args.p_rest_seconds === 90, 'C2: idempotente RPC op het MoveKit-id');
  ok(a.s.restSecondsFor('TK-000038') === 90 && JSON.parse(a.store['tk_rest_settings_v1:' + A]).rows[0][1] === 90, 'C3: direct lokaal en in de eigenaar-cache');
  await a.s.setExerciseRest('TK-000038', null);
  ok(a.st.rpcs[1].args.p_rest_seconds === null && a.s.restSecondsFor('TK-000038') === null, 'C4: wissen = null naar de server en lokaal weg');
  await a.s.setExerciseRest('squat', 5000);
  ok(a.st.rpcs[2].args.p_rest_seconds === 1800, 'C5: begrensd op 1800 s (zelfde grens als de database)');
  a = make({ rpcResult: false }); a.s.__map().set('squat', 60);
  ok(await a.s.setExerciseRest('squat', 90) === false && a.s.restSecondsFor('squat') === 60, 'C6: permanente weigering zet de vorige waarde terug');
  a = make({ owner: null });
  ok(await a.s.setExerciseRest('squat', 90) === false && a.st.rpcs.length === 0, 'C7: zonder eigenaar geen write en geen wachtrij-item');

  console.log('\nD. Laden (offline koude start, eigenaarwissel)');
  a = make({ server: { failed: false, rows: [{ exercise_id: 'TKC-000038', rest_seconds: 80 }, { exercise_id: 'x', rest_seconds: 'bad' }] } });
  await a.s.ensureExerciseRestLoaded();
  ok(a.s.restSecondsFor('TK-000038') === 80 && !a.s.__map().has('x') && a.s.__loaded() === true && a.st.gets[0].q === '&user_id=eq.' + A, 'D1: server geladen (alleen eigen rijen), ongeldige rij genegeerd');
  const cache = a.store;
  a = make({ store: cache, online: false });
  await a.s.ensureExerciseRestLoaded();
  ok(a.s.restSecondsFor('TK-000038') === 80 && a.st.gets.length === 0, 'D2: offline koude start leest de eigenaar-cache');
  a = make({ store: cache, owner: B, online: false });
  await a.s.ensureExerciseRestLoaded();
  ok(a.s.restSecondsFor('TK-000038') === null, 'D3: cache van een andere eigenaar wordt nooit gebruikt');
  a = make({ store: cache, server: { failed: true, rows: [] } });
  await a.s.ensureExerciseRestLoaded();
  ok(a.s.restSecondsFor('TK-000038') === 80 && a.s.__loaded() === false, 'D4: serverfout houdt de laatst bekende waarden en probeert later opnieuw');
  a = make({ store: {}, server: { failed: false, rows: [{ exercise_id: 'TKC-000038', rest_seconds: 80 }] } }); a.st.switchOnGet = B;
  await a.s.ensureExerciseRestLoaded();
  ok(a.s.restSecondsFor('TK-000038') === null, 'D5: eigenaarwissel tijdens laden neemt de rijen niet over');

  console.log('\nE. Bron');
  ok(fn('autoRestAfterSet').includes('restSecondsFor(exId)') && fn('openRestTimer').includes('restSecondsFor(exId)'), 'E1: beide timerstarts gebruiken de rusttijd per gebruiker');
  ok(fn('saveRest').includes('await setExerciseRest(curEditRestId,val)') && !fn('saveRest').includes("sbPatch('exercises'"), 'E2: de editor schrijft niet meer op de gedeelde oefening');
  ok(/exerciseRestSettings=new Map\(\); _exerciseRestLoaded=false;/.test(html), 'E3: wordt gewist bij uitloggen/wisselen van account');
  ok(/tkRestRowHtml\(ex\)/.test(html), 'E4: rusttijd instelbaar vanuit de training (ook MoveKit)');

  console.log('\nF. Migratie in PostgreSQL (PGlite)');
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${A}'), ('${B}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    create table public.exercises (id text primary key);
    insert into public.exercises values ('TKC-000038'), ('squat');
  `);
  await db.exec(MIG); await db.exec(MIG);
  ok(true, 'F1: migratie herhaalbaar');
  const as = async uid => db.exec("reset role; select set_config('request.jwt.claim.sub','" + uid + "',false); set role authenticated;");
  await as(A);
  eq1((await db.query("select public.tk_set_exercise_rest('TKC-000038', 90) v")).rows[0].v, 90);
  await db.query("select public.tk_set_exercise_rest('TKC-000038', 90)"); // herhaald afspelen
  eq1((await db.query('select count(*)::int n from public.exercise_rest_settings')).rows[0].n, 1);
  ok(true, 'F2: zetten is idempotent (herhaald afspelen geeft één rij)');
  await db.query("select public.tk_set_exercise_rest('TKC-000038', 120)");
  eq1((await db.query("select rest_seconds from public.exercise_rest_settings where exercise_id='TKC-000038'")).rows[0].rest_seconds, 120);
  ok(true, 'F3: laatste waarde wint');
  await as(B);
  eq1((await db.query('select count(*)::int n from public.exercise_rest_settings')).rows[0].n, 0);
  await db.query("select public.tk_set_exercise_rest('TKC-000038', 60)");
  let cross = true; try { await db.query("update public.exercise_rest_settings set rest_seconds=10 where user_id='" + A + "'"); cross = (await db.query("select 1")).rows.length > 0; } catch (_) { cross = false; }
  await as(A);
  eq1((await db.query("select rest_seconds from public.exercise_rest_settings where exercise_id='TKC-000038'")).rows[0].rest_seconds, 120);
  ok(true, 'F4: RLS: B ziet en wijzigt de rij van A niet; ieder zijn eigen waarde');
  await db.query("select public.tk_set_exercise_rest('TKC-000038', null)");
  eq1((await db.query('select count(*)::int n from public.exercise_rest_settings')).rows[0].n, 0);
  ok(true, 'F5: null wist de instelling (Delete)');
  let bad = true; try { await db.query("select public.tk_set_exercise_rest('TKC-000038', 5000)"); } catch (_) { bad = false; }
  let fk = true; try { await db.query("select public.tk_set_exercise_rest('bestaat_niet', 60)"); } catch (_) { fk = false; }
  ok(!bad && !fk, 'F6: buiten bereik en onbekende oefening geweigerd');
  await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role authenticated;");
  let noauth = true; try { await db.query("select public.tk_set_exercise_rest('squat', 60)"); } catch (_) { noauth = false; }
  await db.exec('reset role; set role anon;');
  let anon = true; try { await db.query("select public.tk_set_exercise_rest('squat', 60)"); } catch (_) { anon = false; }
  let anonRead = true; try { await db.query('select * from public.exercise_rest_settings'); } catch (_) { anonRead = false; }
  ok(!noauth && !anon && !anonRead, 'F7: zonder login of als anon: geen toegang');

  console.log('\n[DEC-EXLINK-004] rusttijd per gebruiker: ' + checks + ' checks geslaagd');
  function eq1(a, b) { assert.deepEqual(a, b); }
})().catch(e => { console.error(e); process.exit(1); });
