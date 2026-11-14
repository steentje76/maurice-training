'use strict';
// DEC-EXLINK-001 fase 1 — eigen oefening ↔ MoveKit (koppelen + samenvoegen), client-kant.
// Bewijst (a) de pure module TkExerciseLinks en (b) de ECHTE index.html-functies (vm):
// kieslijst zonder dubbelen, MoveKit-naam/-media voor gekoppelde eigen oefeningen, race-
// onderdelen behouden hun naam, omleiden van samengevoegde id's bij schrijven.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const TkExerciseLinks = require('./tkExerciseLinks.js');
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
function segment(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + 1);
  assert.ok(a >= 0 && b > a, 'segment ' + start);
  return html.slice(a, b);
}
const U1 = '11111111-aaaa-4aaa-8aaa-111111111111', U2 = '22222222-bbbb-4bbb-8bbb-222222222222';
const L = (exercise_id, catalog_id, merged_into = null, hidden = false, user_id = U1) => ({ user_id, exercise_id, catalog_id, merged_into, hidden });

// ── A. Pure module ──────────────────────────────────────────────────────────
{
  const t = TkExerciseLinks.create();
  const n = t.load([
    L('TK-000019', 'TK-000019'), L('bench', 'TK-000019', 'TK-000019'), L('paused_bench', 'TK-000019', 'TK-000019'),
    L('roeien', 'TK-000458'), L('hyrox_row', 'TK-000458', null, true),
    L('x_chain', 'TK-000019', 'bench'),           // keten → genegeerd
    L('x_unknown', 'TK-000001', 'bestaat_niet'),  // onbekend doel → genegeerd
    L('x_hiddentarget', 'TK-000458', 'hyrox_row'),// verborgen doel → genegeerd
    L('x_bad', 'TK-9'),                           // ongeldige catalog_id
    L('x_contra', 'TK-000002', 'TK-000019', true),// hidden én merged → genegeerd
    L('foreign', 'TK-000002', null, false, U2),   // ander account
    L('frontsquat', 'TK-000356')
  ], U1);
  eq(n, 6, 'A1 alleen geldige eigen rijen tellen');
  eq([t.aliasOf('bench'), t.aliasOf('paused_bench'), t.aliasOf('TK-000019'), t.aliasOf('x_chain'), t.aliasOf('onbekend')],
    ['TK-000019', 'TK-000019', 'TK-000019', 'x_chain', 'onbekend'], 'A2 alias alleen voor geldige samenvoegingen');
  eq([t.isMerged('bench'), t.isMerged('hyrox_row'), t.isHidden('hyrox_row'), t.isHidden('bench'), t.isHidden('roeien')],
    [true, false, true, true, false], 'A3 verborgen ≠ samengevoegd');
  eq([t.catalogFor('bench'), t.catalogFor('hyrox_row'), t.catalogFor('frontsquat'), t.catalogFor('foreign')],
    ['TK-000019', 'TK-000458', 'TK-000356', null], 'A4 catalogFor (samengevoegd via doel; verborgen race behoudt beeld)');
  eq([t.survivorForCatalog('TK-000019'), t.survivorForCatalog('TK-000458'), t.survivorForCatalog('TK-000002')],
    ['TK-000019', 'roeien', null], 'A5 catalogustegel hoort bij één zichtbare eigen oefening, nooit bij een race-koppeling');
  const v = t.version(); t.clear();
  ok(t.version() > v && t.size() === 0 && t.ownerUid() === null, 'A6 clear wist alles en verhoogt de versie');
  eq(t.load([L('a', 'TK-000001')], ''), 0, 'A7 zonder eigenaar niets');
}

// ── B. index.html: helpers, naam, kieslijst ─────────────────────────────────
const catalog = {
  'TK-000019': { catalog_id: 'TK-000019', identity: { name: 'Barbell Bench Press', nl: 'Bankdrukken (barbell)' }, source: { provider: 'movekit', provider_id: 'barbell-bench-press' } },
  'TK-000356': { catalog_id: 'TK-000356', identity: { name: 'Barbell Front Squat' }, source: { provider: 'movekit', provider_id: 'barbell-front-squat' } },
  'TK-000458': { catalog_id: 'TK-000458', identity: { name: 'Rowing Machine' }, source: { provider: 'movekit', provider_id: 'rowing-machine' } },
  'TK-000505': { catalog_id: 'TK-000505', identity: { name: 'Ski Erg' }, source: { provider: 'movekit', provider_id: 'ski-erg' } },
  'TK-000099': { catalog_id: 'TK-000099', identity: { name: 'Andere oefening' }, source: { provider: 'movekit', provider_id: 'andere' } }
};
function ctx(extra) {
  const store = new Map();
  const c = vm.createContext(Object.assign({
    TkExerciseLinks, console,
    ExerciseCatalogService: { byId: (id) => catalog[id] || null, all: () => Object.values(catalog), count: () => Object.keys(catalog).length },
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    navigator: { onLine: true }, document: { getElementById: () => null },
    exercises: [], _store: store, posted: [], owner: U1
  }, extra || {}));
  vm.runInContext(
    'const TK_HYROX_STATIONS=["hyrox_skierg","hyrox_row"]; const TK_HYROX_RUN_ID="hyrox_run"; const TK_TRIATHLON_EXERCISE_ID={swimming:"triathlon_zwemmen"};\n' +
    fn('tkCatalogDisplayName') + '\n' + fn('catalogToPickerEx') + '\n' +
    'function tkEigenaarUid(){return owner;}\n' +
    'var sbGetOrFailRows=null; async function sbGetOrFail(t,p){ return sbGetOrFailRows?{failed:false,rows:sbGetOrFailRows}:{failed:true,rows:[]}; }\n' +
    segment('var tkExLinks=', 'let _exPickerPoolCache') + '\n' +
    'let _exPickerPoolCache=null, _exPickerPoolKey=\'\';\nfunction invalidateExPickerPool(){ _exPickerPoolCache=null; _exPickerPoolKey=\'\'; }\n' +
    fn('exPickerPool') + '\n', c);
  return c;
}
const ROWS = [L('TK-000019', 'TK-000019'), L('bench', 'TK-000019', 'TK-000019'), L('frontsquat', 'TK-000356'),
  L('roeien', 'TK-000458'), L('hyrox_row', 'TK-000458', null, true), L('hyrox_skierg', 'TK-000505', null, true), L('ski_erg', 'TK-000505')];
{
  const c = ctx();
  c.exercises = [
    { id: 'TK-000019', name: 'Barbell Bench Press', scope: 'global' },
    { id: 'frontsquat', name: 'Frontsquat', scope: 'personal' },
    { id: 'roeien', name: 'Roeien', scope: 'personal' },
    { id: 'hyrox_row', name: 'HYROX Row', scope: 'global' },
    { id: 'hyrox_skierg', name: 'HYROX SkiErg', scope: 'global' },
    { id: 'ski_erg', name: 'Ski erg', scope: 'personal' },
    { id: 'eigen_x', name: 'Eigen X', scope: 'personal' }
  ];
  vm.runInContext('exercises=globalThis.exercises;', c);
  c.sbGetOrFailRows = ROWS.concat([L('foreign_row', 'TK-000099', null, false, U2)]);
  vm.runInContext('sbGetOrFailRows=globalThis.sbGetOrFailRows;', c);
  return vm.runInContext('tkExLinksRefresh()', c).then((loaded) => {
    ok(loaded === true, 'B1 koppelingen geladen van de server');
    const names = Object.fromEntries(c.exercises.map((e) => [e.id, e.name]));
    eq([names.frontsquat, names.roeien, names['TK-000019'], names.eigen_x],
      ['Barbell Front Squat', 'Rowing Machine', 'Bankdrukken (barbell)', 'Eigen X'], 'B2 gekoppelde eigen oefeningen tonen de MoveKit-naam');
    eq([names.hyrox_row, names.hyrox_skierg], ['HYROX Row', 'HYROX SkiErg'], 'B3 race-onderdelen houden hun eigen naam');
    const fr = c.exercises.find((e) => e.id === 'frontsquat');
    ok(!JSON.stringify(fr).includes('Frontsquat') && !Object.keys({ ...fr }).includes('_tkOwnName'), 'B4 eigen naam niet-enumereerbaar (nooit in spread/JSON/serverwrite)');
    const cache = JSON.parse(c._store.get('tk_exlinks_v1:' + U1));
    ok(cache.length === ROWS.length && cache.every((r) => r.user_id === U1), 'B5 offline cache per eigenaar, zonder vreemde rijen');
    const pool = vm.runInContext('exPickerPool()', c);
    const keys = pool.map((e) => (e._catalog ? 'cat:' : 'own:') + e.id).sort();
    eq(keys, ['cat:TK-000099', 'own:TK-000019', 'own:eigen_x', 'own:frontsquat', 'own:roeien', 'own:ski_erg'].sort(),
      'B6 kieslijst: één tegel per beweging (catalogusduplicaten en race-koppelingen verborgen)');
    // Zonder koppelingen: exact het oude gedrag (alle eigen + alle catalogustegels).
    vm.runInContext('tkExLinksClear(); tkExLinksApply();', c);
    eq(c.exercises.find((e) => e.id === 'frontsquat').name, 'Frontsquat', 'B7 na wissen komt de eigen naam terug');
    eq(vm.runInContext('exPickerPool()', c).length, c.exercises.length + Object.keys(catalog).length, 'B8 zonder koppelingen ongewijzigd gedrag');
    // Offline: mislukte serverlezing → laatst bekende stand uit de eigenaar-cache, niets gewist.
    vm.runInContext('sbGetOrFailRows=null;', c);
    return vm.runInContext('tkExLinksRefresh()', c).then((r2) => {
      ok(r2 === false, 'B9 mislukte serverlezing meldt false');
      eq(c.exercises.find((e) => e.id === 'frontsquat').name, 'Barbell Front Squat', 'B10 offline: koppelingen uit de eigenaar-cache');
    });
  }).then(runC);
}

// ── C. Media, schrijven, statische contracten ───────────────────────────────
function runC() {
  const t = TkExerciseLinks.create(); t.load(ROWS, U1);
  const provider = { hasVideo: (id) => !!catalog[id], has: () => false, poster: () => null, video: () => null };
  const mc = vm.createContext({
    ExerciseAssetProvider: provider, ExerciseCatalogService: { byId: (id) => catalog[id] || null, all: () => Object.values(catalog) },
    tk504PrivateEnabled: (id) => typeof id === 'string' && /^TK-\d{6}$/.test(id), tkExLinks: t, input: null, result: null
  });
  vm.runInContext([fn('tkExLinkCatalogFor'), fn('tkExLinkCatalogEntry'), fn('movekitPosterFor'), fn('resolveExerciseMedia')].join('\n'), mc);
  const media = (ex) => { mc.input = ex; vm.runInContext('result=resolveExerciseMedia(input)', mc); return mc.result; };
  let m = media({ id: 'frontsquat', name: 'Barbell Front Squat', scope: 'personal' });
  eq([m.kind, m.catalogId, m.provenance.binding], ['private-mp4', 'TK-000356', 'owner_link'], 'C1 gekoppelde eigen oefening → beveiligde MoveKit-video');
  m = media({ id: 'bench', naam: 'Benchpress' }); // oude verwijzing in een opgeslagen training
  eq([m.kind, m.catalogId], ['private-mp4', 'TK-000019'], 'C2 samengevoegde id toont het beeld van het doel');
  m = media({ id: 'eigen_x', name: 'Eigen X', scope: 'personal', yt: 'abc123' });
  eq(m.kind, 'yt', 'C3 ongekoppelde eigen oefening: bestaand gedrag (YouTube)');
  m = media({ id: 'frontsquat', name: 'x', scope: 'personal', source: { provider: 'movekit', provider_id: 'iets-anders' } });
  ok(m.kind !== 'private-mp4', 'C4 een eigen bronclaim die niet klopt wordt niet overschreven');
  mc.tk504PrivateEnabled = () => false;
  m = media({ id: 'frontsquat', name: 'x', scope: 'personal' });
  ok(m.kind !== 'private-mp4', 'C5 route uit → geen beveiligde koppeling');

  // writeSessionRow: samengevoegde id → doel; overige rijen byte-gelijk.
  const wc = vm.createContext({ tkExLinks: t, sent: [], tk504RewriteVerifiedSessionRow: (r) => r });
  vm.runInContext(fn('tkExLinkIsMerged') + '\n' + fn('tkExLinkAlias') + '\nasync function sbPostQ(t,row){ sent.push(row); return true; }\n' + 'async ' + fn('writeSessionRow'), wc);
  return vm.runInContext('writeSessionRow({id:"u1",exercise_id:"bench",reps:5}).then(()=>writeSessionRow({id:"u2",exercise_id:"roeien"}))', wc).then(() => {
    eq(wc.sent.map((r) => r.exercise_id), ['TK-000019', 'roeien'], 'C6 schrijven: samengevoegde id landt op het doel, rest ongewijzigd');
    eq(wc.sent[0].id, 'u1', 'C7 idempotentie-id blijft behouden');

    // Statische contracten
    ok(/<script src="core\/tkExerciseLinks\.js"><\/script>/.test(html), 'C8 module geladen in index.html');
    ok(sw.includes("'/core/tkExerciseLinks.js'"), 'C9 module in de service-worker-precache');
    ok(/tkExLinksRefresh\(\); \/\/ DEC-EXLINK-001/.test(html), 'C10 koppelingen laden na inloggen');
    ok(/if\(typeof tkExLinksClear==='function'\)tkExLinksClear\(\);[^\n]*\r?\n\s*authSession=null;/.test(html), 'C11 wissen bij uitloggen');
    ok(html.includes("{const d=typeof tkExLinkAlias==='function'&&tkExLinkAlias(exId);if(typeof d==='string'&&d)exId=d;} // DEC-EXLINK-001"), 'C12 doelen schrijven naar het doel');
    ok(/const anchor=_al\('backsquat'\);/.test(html) && /'TK-000019': 1\.0, 'TK-000030': 0\.65/.test(html), 'C13 krachtverhoudingen volgen de samenvoeging');
    ok(fn('writeRaceSegmentRow').indexOf('tkExLink') < 0, 'C14 racesegmenten worden nooit omgeleid');
    console.log('[DEC-EXLINK-001] client: ' + checks + ' checks geslaagd');
  });
}
