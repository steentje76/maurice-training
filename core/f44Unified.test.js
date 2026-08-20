/* F44/Phase7 + Phase3 — Identity-contract (catalog/legacy/custom) + UNKNOWN-safe equipment.
 * Extraheert de ECHTE helpers uit index.html. Contract: id blijft ALTIJD behouden, nooit
 * fuzzy/naam-matching; equipment-filter sluit ONBEKEND nooit uit (UNKNOWN ≠ FALSE).
 * Draai: node core/f44Unified.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(name){
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1);
}

// module-scope stubs
let exercises = [];
let ExerciseCatalogService = null;
let _exPickerPoolCache = null, _exPickerPoolKey = '';
function invalidateExPickerPool(){ _exPickerPoolCache = null; _exPickerPoolKey = ''; }
// stub: legacy 'bench' onbekend equipment (null); 'db_curl' bekend dumbbell
function resolveExerciseEquipment(e){
  if (!e) return null;
  if (e.id === 'db_curl') return ['dumbbell'];
  return null; // legacy 'bench' → onbekend
}
eval(['catalogToPickerEx','exPickerPool','resolvePickerEx','pickerExEquipment'].map(extractFn).join('\n'));

const CAT = [
  { catalog_id:'TK-000019', identity:{ name:'Barbell Bench Press', category:'Push', primary:['Borst'], secondary:['Triceps'], equipment:['barbell'] } },
  { catalog_id:'TK-000200', identity:{ name:'Cable Fly', category:'Push', primary:['Borst'], secondary:[], equipment:['cable machine'] } }
];
ExerciseCatalogService = { all:()=>CAT.slice(), byId:(id)=>CAT.find(c=>c.catalog_id===id)||null, count:()=>CAT.length };

let pass=0, fail=0;
function ok(c,m){ if(c) pass++; else { fail++; console.log('  ✗ '+m); } }
function eq(a,b,m){ ok(a===b, m+' (verwacht '+JSON.stringify(b)+', kreeg '+JSON.stringify(a)+')'); }

// ── Identity: 3 soorten oefeningen ──
(() => {
  exercises = [
    { id:'bench', name:'Benchpress', type:'strength' },                          // legacy
    { id:'mijn_oefening', name:'Mijn Oefening', type:'strength', scope:'personal' } // custom
  ];
  invalidateExPickerPool();

  // catalogus
  const cat = resolvePickerEx('TK-000019');
  eq(cat.id, 'TK-000019', 'identity: catalogus exercise_id === catalog_id');
  eq(cat._catalog, true, 'identity: catalogus vlag');

  // legacy
  const leg = resolvePickerEx('bench');
  eq(leg.id, 'bench', 'identity: legacy exercise_id behouden');
  ok(!leg._catalog, 'identity: legacy is geen catalogus');

  // custom
  const cus = resolvePickerEx('mijn_oefening');
  eq(cus.id, 'mijn_oefening', 'identity: custom exercise_id behouden');
  eq(cus.scope, 'personal', 'identity: custom scope personal');

  // onbekend → null, GEEN fuzzy
  ok(resolvePickerEx('bnch') === null, 'identity: typefout matcht NIET fuzzy → null');
  ok(resolvePickerEx('barbell bench press') === null, 'identity: naam-string matcht NIET → null (geen naam-lookup)');
})();

// ── Pool: alle drie soorten aanwezig, id's ongewijzigd ──
(() => {
  exercises = [ { id:'bench', name:'Benchpress' }, { id:'mijn_oefening', name:'Mijn Oefening', scope:'personal' } ];
  invalidateExPickerPool();
  const pool = exPickerPool();
  ok(pool.some(e=>e.id==='bench'), 'pool: legacy aanwezig');
  ok(pool.some(e=>e.id==='mijn_oefening'), 'pool: custom aanwezig');
  ok(pool.some(e=>e.id==='TK-000019'), 'pool: catalogus aanwezig');
  ok(pool.some(e=>e.id==='TK-000200'), 'pool: 2e catalogus aanwezig');
  eq(pool.length, 4, 'pool: 2 legacy/custom + 2 catalogus = 4');
})();

// ── Equipment UNKNOWN-safe ──
(() => {
  exercises = [ { id:'bench', name:'Benchpress' }, { id:'db_curl', name:'DB Curl' } ];
  invalidateExPickerPool();
  eq(JSON.stringify(pickerExEquipment(resolvePickerEx('TK-000019'))), JSON.stringify(['barbell']), 'equip: catalogus equipment uit identity');
  eq(pickerExEquipment(resolvePickerEx('bench')), null, 'equip: legacy zonder equipment → null (ONBEKEND)');
  eq(JSON.stringify(pickerExEquipment(resolvePickerEx('db_curl'))), JSON.stringify(['dumbbell']), 'equip: legacy via resolver → dumbbell');

  // filter-predicaat (zelfde logica als renderExPickerList): !eq || eq.includes(sel)
  const sel = 'dumbbell';
  const keep = e => { const eq2 = pickerExEquipment(e); return !eq2 || eq2.includes(sel); };
  ok(keep(resolvePickerEx('bench')), 'filter: ONBEKENDE equipment blijft zichtbaar (UNKNOWN ≠ FALSE)');
  ok(keep(resolvePickerEx('db_curl')), 'filter: dumbbell-match blijft');
  ok(!keep(resolvePickerEx('TK-000019')), 'filter: bekende barbell wordt bij dumbbell-filter wél uitgesloten');
})();

console.log('\nF44 unified identity/equipment: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
