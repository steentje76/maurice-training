'use strict';
// DEC-EXLINK-002 (fase 2b, onderdeel 1): een MoveKit-catalogusitem (Builder, alternatief, opgeslagen
// training) dat voor deze eigenaar door een eigen oefening wordt vertegenwoordigd, wordt op die eigen
// oefening gelogd en leest daar zijn historie. Echte index.html-functies in vm; synthetische id's.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
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
const A = '11111111-aaaa-4aaa-8aaa-111111111111';
const L = (exercise_id, catalog_id, merged_into = null, hidden = false) => ({ user_id: A, exercise_id, catalog_id, merged_into, hidden });
const ref = (cid, pid) => ({ kind: 'movekit-catalog-v1', catalog_id: cid, provider_id: pid });

const links = TkExerciseLinks.create();
links.load([L('TK-000019', 'TK-000019'), L('bench', 'TK-000019', 'TK-000019'), L('frontsquat', 'TK-000356'),
  L('roeien', 'TK-000458'), L('hyrox_row', 'TK-000458', null, true), L('oud_inactief', 'TK-000100')], A);

const c = vm.createContext({
  tkExLinks: links, owner: A, TK504_TYPED_FK_SESSION_RELEASE: true, verifyCalls: 0, sent: [], gets: [],
  exercises: [{ id: 'TK-000019', active: true }, { id: 'frontsquat', active: true }, { id: 'roeien', active: true },
    { id: 'hyrox_row', active: true }, { id: 'oud_inactief', active: false }],
  sessionLog: { 'TK-000356': { sets: [] }, 'TK-000019': { sets: [] }, 'TK-000500': { sets: [] }, 'TK-000100': { sets: [] } }
});
vm.runInContext(`
  function tkEigenaarUid(){ return owner; }
  async function ensureExerciseRowStatus(id){ return exercises.some(e=>e.id===id)?'exists':'failed'; }
  async function tk504VerifySessionBinding(ex){ verifyCalls++; return {kind:'movekit-catalog-v1',catalog_id:ex.id,provider_id:ex.tk504_catalog_ref.provider_id,fk_id:'TKC-'+ex.id.slice(3),owner_uid:owner}; }
  function tkSessieSchrijfOpts(s){ return {queueOnly:s==='queued'}; }
  function tk504RewriteVerifiedSessionRow(row,b){ return {...row,exercise_id:b.fk_id}; }
  function tkExLinkIsMerged(){ return false; } function tkExLinkAlias(x){ return x; }
  async function sbPostQ(t,row,opts){ sent.push({row,opts}); return true; }
  var tk603ReadEpoch=0;
  async function sbGet(t,q){ gets.push(q); return [{exercise_id:'x',user_id:owner}]; }
  function tk603OwnRows(rows){ return rows; }
  function tk504ValidateCatalogSourceRef(id,r){ return r&&r.catalog_id===id?r:null; }
  var navigator={onLine:true};
` + [fn('tkExLinkOwnExerciseForCatalog'), fn('tkExLinkOwnForItem'), 'async ' + fn('ensureSessionExerciseRows'),
  fn('tkSessieOptsVoor'), 'async ' + fn('writeSessionRow'), 'async ' + fn('tk603ReadExerciseSessions')].join('\n'), c);
const run = (code) => vm.runInContext(code, c);

(async () => {
  // A. Bepalen van de eigen oefening
  eq([run("tkExLinkOwnExerciseForCatalog('TK-000356')"), run("tkExLinkOwnExerciseForCatalog('TK-000019')"),
      run("tkExLinkOwnExerciseForCatalog('TK-000458')"), run("tkExLinkOwnExerciseForCatalog('TK-000500')"),
      run("tkExLinkOwnExerciseForCatalog('TK-000100')"), run("tkExLinkOwnExerciseForCatalog('bench')")],
    ['frontsquat', 'TK-000019', 'roeien', null, null, null],
    'A1 gekoppeld → eigen oefening; race-koppeling telt niet; ongekoppeld, inactief of geen catalogus-id → null');
  c.it = { id: 'TK-000356', tk504_catalog_ref: ref('TK-000356', 'barbell-front-squat') };
  eq(run('tkExLinkOwnForItem(it)'), 'frontsquat', 'A2 catalogusitem met geldige bron → eigen oefening');
  c.it = { id: 'frontsquat', tk504_catalog_ref: ref('TK-000356', 'x') };
  eq(run('tkExLinkOwnForItem(it)'), null, 'A3 item-id ≠ catalogus-id → nooit omleiden');
  c.it = { id: 'TK-000356' };
  eq(run('tkExLinkOwnForItem(it)'), null, 'A4 zonder bron (geen catalogusselectie) → niets');

  // B. Normale uitvoering (finishSession): status, opties, write
  c.list = [{ id: 'TK-000356', tk504_catalog_ref: ref('TK-000356', 'barbell-front-squat') },
    { id: 'TK-000019', tk504_catalog_ref: ref('TK-000019', 'barbell-bench-press') },
    { id: 'TK-000500', tk504_catalog_ref: ref('TK-000500', 'iets-anders') }];
  const st = await run('ensureSessionExerciseRows(list)');
  eq([st['TK-000356'], st['TK-000019'], st['TK-000500']], ['exists', 'exists', 'typed-verified'], 'B1 gekoppelde items als eigen oefening, ongekoppeld via MoveKit');
  eq([st._tkOwnIds['TK-000356'], st._tkOwnIds['TK-000019'], st._tkOwnIds['TK-000500']], ['frontsquat', 'TK-000019', undefined], 'B2 eigen-id per item vastgelegd');
  eq(c.verifyCalls, 1, 'B3 MoveKit-controle alleen voor het ongekoppelde item');
  c.st = st;
  const o1 = run("tkSessieOptsVoor(st,'TK-000356')"), o3 = run("tkSessieOptsVoor(st,'TK-000500')");
  eq([o1.tk_own_exercise_id, !!o1.tk504_binding, o3.tk_own_exercise_id, !!o3.tk504_binding], ['frontsquat', false, undefined, true], 'B4 opties: eigen oefening óf MoveKit-binding, nooit beide');
  c.o1 = o1; c.o3 = o3;
  await run("writeSessionRow({id:'r1',exercise_id:'TK-000356',reps:5},o1)");
  await run("writeSessionRow({id:'r3',exercise_id:'TK-000500',reps:5},o3)");
  eq(c.sent.map((x) => x.row.exercise_id + '|' + x.row.id), ['frontsquat|r1', 'TKC-000500|r3'], 'B5 sessie landt op de eigen oefening (zelfde id); ongekoppeld op het MoveKit-ID');

  // C. Historie lezen
  await run("tk603ReadExerciseSessions('TK-000356', {kind:'movekit-catalog-v1',catalog_id:'TK-000356',provider_id:'barbell-front-squat'})");
  ok(/exercise_id=eq\.frontsquat&/.test(c.gets[c.gets.length - 1]), 'C1 historie van het gekoppelde item komt van de eigen oefening');

  // D. Statisch: Guided en records gebruiken dezelfde regel
  const gwSrc = html.slice(html.indexOf('async function doPersist('), html.indexOf('async function doPersist(') + 9000);
  ok(/var logId=ownId\|\|it\.id, typedRef=ownId\?null:it\.tk504_catalog_ref;/.test(gwSrc), 'D1 Guided bepaalt eigen oefening vóór de write');
  ok(/buildStrengthSessionRow\(logId,ws,/.test(gwSrc) && /prFor\(logId\)/.test(gwSrc) && /upsertExerciseGoalField\(logId,'pr'/.test(gwSrc), 'D2 Guided schrijft sessie en record op de eigen oefening');
  ok(/const _recId=_ownRec\|\|ex\.id;/.test(html) && /upsertExerciseGoalField\(_recId,'pr'/.test(html), 'D3 normale uitvoering zet een record op de eigen oefening');

  console.log('[DEC-EXLINK-002] catalogusitem → eigen oefening: ' + checks + ' checks geslaagd');
})();
