'use strict';
// DEC-EXLINK-005: programma's en historie met MoveKit-id's (na migratie) — weergave en trainingsstart.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function fn(name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(html); assert(m, name);
  let d = 0; for (let i = html.indexOf('{', m.index); i < html.length; i++) { if (html[i] === '{') d++; if (html[i] === '}' && --d === 0) return html.slice(m.index, i + 1); }
  throw new Error('unterminated ' + name);
}
let checks = 0; function ok(v, label) { assert(v, label); checks++; console.log('  ok  ' + label); }
const A = 'owner-a';

const cache = { owner_uid: A, entries: { 'TK-000356': { p: 'mk-356', fk: 'TKC-000356' } } };
const ctx = {
  exercises: [{ id: 'squat', name: 'Back Squat', active: true }],
  ExerciseCatalogService: { byId: id => (id === 'TK-000356' ? { catalog_id: id, identity: { nl: 'Frontsquat', name: 'Front Squat' } } : null) },
  catalogToPickerEx: c => ({ id: c.catalog_id, name: c.identity.nl, type: 'strength', source: 'catalog' }),
  tkEigenaarUid: () => A, tk504ReleasedFkRead: o => (o === A ? cache : null)
};
const s = vm.createContext(ctx);
vm.runInContext(['resolvePickerEx', 'tkResolveExerciseForDisplay', 'tkExerciseDisplayName'].map(fn).join('\n'), s);

console.log('\nA. Weergave');
ok(s.tkExerciseDisplayName('squat') === 'Back Squat', 'A1: eigen oefening: eigen naam');
ok(s.tkExerciseDisplayName('TK-000356') === 'Frontsquat', 'A2: MoveKit-id in een programmaregel: catalogusnaam (geen "onbekende oefening")');
ok(s.tkExerciseDisplayName('TKC-000356') === 'Frontsquat', 'A3: MoveKit-sessie-id in historie: naam via de vrijgavelijst van de eigenaar');
ok(s.tkExerciseDisplayName('TKC-000357') === null, 'A4: TKC-id niet in de lijst: geen geraden naam');
cache.owner_uid = 'iemand-anders'; ctx.tk504ReleasedFkRead = o => null;
ok(s.tkExerciseDisplayName('TKC-000356') === null, 'A5: zonder lijst van deze eigenaar: geen naam');

console.log('\nB. Bron');
const detail = fn('renderProgramBlockDetail'), start = html.slice(html.indexOf("const ctxT='prog_'+blockId;"), html.indexOf("buildProgramTrainScreen(block,prog);"));
ok(detail.includes('tkResolveExerciseForDisplay(r.exercise_id)') && !detail.includes('exercises.find(e=>e.id===r.exercise_id)'), 'B1: programmadetail toont MoveKit-regels met naam');
ok(/resolvePickerEx\(r\.exercise_id\)/.test(start) && !/const ex=exercises\.find\(e=>e\.id===r\.exercise_id\);\s*if\(!ex\)continue;/.test(start), 'B2: trainingsstart laat een MoveKit-regel niet meer wegvallen');
ok(/const _prev=await loadPrevPerformance\(ex\.id,_ref\);/.test(start) && /tk504DerivedCatalogRef\(ex\.id\)/.test(start), 'B3: gewichtsvoorstel leest de historie op het MoveKit-id');
ok(fn('programHistoryHtml').includes('tkResolveExerciseForDisplay(id)'), 'B4: programmahistorie toont namen van MoveKit-sessies');
ok(fn('openEditBlockExercise').includes('tkResolveExerciseForDisplay(row.exercise_id)'), 'B5: bewerken van een programmaregel toont de naam');

const cfg = fn('loadTrainCfg');
ok(/exercises\.find\(x=>x\.id===r\.exercise_id\)\|\|\(\(typeof resolvePickerEx==='function'\)\?resolvePickerEx\(r\.exercise_id\):null\)/.test(cfg), 'B6: vaste trainingen (A/B) laten een MoveKit-regel niet meer wegvallen');
const bre = fn('buildResolvedExecutionItems');
ok(/const _derivedRef=\(typedMode&&it\.tk504_catalog_ref==null&&typeof tk504DerivedCatalogRef==='function'\)\?tk504DerivedCatalogRef\(exId\):null;/.test(bre) && /\|\|!!_derivedRef\);/.test(bre) && /\(_derivedRef\?\{tk504_catalog_ref:_derivedRef\}:\{\}\)/.test(bre), 'B7: opgeslagen trainingen: MoveKit-regel zonder bron krijgt catalogusnaam en -bron');

console.log('\n[DEC-EXLINK-005] programma-weergave: ' + checks + ' checks geslaagd');
