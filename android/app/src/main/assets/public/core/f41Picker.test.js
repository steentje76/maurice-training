/* F41 — Unit tests voor de unified picker-pool + resolver.
 * Deze functies leven in index.html (index-only wijziging, geen core-module).
 * De test EXTRAHEERT de echte functietekst uit index.html en evalueert die met
 * gestubde globals (exercises, ExerciseCatalogService), zodat de werkelijke code
 * getest wordt — niet een kopie. Draai: node core/f41Picker.test.js
 * Verifieert de F41-contracten:
 *   - id = catalog_id (identiteit behouden)
 *   - dedup UITSLUITEND op id (nooit fuzzy op naam): legacy TK-id niet dubbel;
 *     legacy-slug + distinct catalog-id blijven BEIDE staan
 *   - resolvePickerEx: legacy-first, dan catalogus-fallback, anders null
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extract(name){
  // pak "function <name>(...){ ... }" met balanced braces
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden in index.html: ' + name);
  let i = html.indexOf('{', start), depth = 0, end = -1;
  for (let j = i; j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++;
    else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  if (end < 0) throw new Error('geen balanced braces voor ' + name);
  return html.slice(start, end + 1);
}

// Stubs (module-scope zodat de geëxtraheerde functies ze zien)
let exercises = [];
let ExerciseCatalogService = null;
let _exPickerPoolCache = null, _exPickerPoolKey = ''; // F44/Phase10 pool-cache state
function invalidateExPickerPool(){ _exPickerPoolCache = null; _exPickerPoolKey = ''; }

const src = [ 'catalogToPickerEx', 'exPickerPool', 'resolvePickerEx' ].map(extract).join('\n');
// eval in deze scope: de functies binden aan de lokale `exercises`/`ExerciseCatalogService`
eval(src);

let pass = 0, fail = 0;
function ok(cond, msg){ if (cond){ pass++; } else { fail++; console.log('  ✗ ' + msg); } }
function eq(a, b, msg){ ok(a === b, msg + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// ── Catalogus-fixture ──
const CAT = [
  { catalog_id:'TK-000019', identity:{ name:'Barbell Bench Press', category:'Push', primary:['chest'], secondary:['triceps'] } },
  { catalog_id:'TK-000038', identity:{ name:'Barbell Squat', category:'Legs', primary:['quads'], secondary:['glutes'] } },
  { catalog_id:'TK-000200', identity:{ name:'Cable Fly', category:'Push', primary:['chest'], secondary:[] } },
  { catalog_id:'', identity:{ name:'Kapot (geen id)' } },                 // ongeldig → nooit in pool
  { catalog_id:'TK-BADIDENT' }                                            // geen identity → map = null
];
ExerciseCatalogService = {
  all: () => CAT.slice(),
  byId: (id) => CAT.find(c => c.catalog_id === id) || null,
  count: () => CAT.length
};

// ── 1. catalogToPickerEx: pure mapping ──
(() => {
  const px = catalogToPickerEx(CAT[0]);
  eq(px.id, 'TK-000019', 'catalogToPickerEx: id = catalog_id');
  eq(px.catalog_id, 'TK-000019', 'catalogToPickerEx: catalog_id bewaard');
  eq(px.name, 'Barbell Bench Press', 'catalogToPickerEx: naam uit identity.name');
  eq(px.type, 'strength', 'catalogToPickerEx: type = strength (canonical-conventie)');
  eq(px._catalog, true, 'catalogToPickerEx: _catalog vlag');
  eq(px.muscle_primary.join(','), 'chest', 'catalogToPickerEx: muscle_primary uit identity.primary');
  eq(px.muscle_secondary.join(','), 'triceps', 'catalogToPickerEx: muscle_secondary uit identity.secondary');
  ok(catalogToPickerEx(null) === null, 'catalogToPickerEx(null) → null');
  ok(catalogToPickerEx({ catalog_id:'X' }) === null, 'catalogToPickerEx zonder identity → null');
  // mutatie-isolatie: wijzig de gemapte array, bron mag niet mee-veranderen
  px.muscle_primary.push('X');
  eq(CAT[0].identity.primary.length, 1, 'catalogToPickerEx: muscle-array is een kopie (geen alias)');
})();

// ── 2. exPickerPool: lege legacy → alle geldige catalogus-entries ──
(() => {
  exercises = [];
  const pool = exPickerPool();
  eq(pool.length, 3, 'exPickerPool: 3 geldige catalogus-entries (ongeldige overgeslagen)');
  ok(pool.every(e => e.id && e.id.indexOf('TK-') === 0), 'exPickerPool: alle uit catalogus hebben TK-id');
})();

// ── 3. exPickerPool: dedup op id — legacy TK-id NIET dubbel ──
(() => {
  exercises = [ { id:'TK-000019', name:'Bench (legacy row)', type:'strength' } ];
  const pool = exPickerPool();
  const bench = pool.filter(e => e.id === 'TK-000019');
  eq(bench.length, 1, 'exPickerPool: TK-000019 verschijnt precies 1× (dedup op id)');
  eq(bench[0].name, 'Bench (legacy row)', 'exPickerPool: legacy-row wint (behoudt historie/naam)');
  eq(pool.length, 3, 'exPickerPool: totaal 3 (1 legacy + 2 resterende catalogus)');
})();

// ── 4. exPickerPool: legacy-slug + distinct catalog-id → BEIDE (nooit fuzzy op naam) ──
(() => {
  exercises = [ { id:'bench', name:'Bench Press', type:'strength' } ]; // slug ≠ TK-000019
  const pool = exPickerPool();
  ok(pool.some(e => e.id === 'bench'), 'exPickerPool: legacy-slug "bench" blijft');
  ok(pool.some(e => e.id === 'TK-000019'), 'exPickerPool: catalogus "TK-000019" blijft óók (geen naam-fuzzy dedup)');
  eq(pool.length, 4, 'exPickerPool: 1 legacy + 3 catalogus = 4 (beide bench-varianten behouden)');
})();

// ── 5. resolvePickerEx: legacy-first, catalogus-fallback, anders null ──
(() => {
  exercises = [ { id:'bench', name:'Bench Press (legacy)', type:'strength' } ];
  eq(resolvePickerEx('bench').name, 'Bench Press (legacy)', 'resolvePickerEx: legacy-first');
  const cat = resolvePickerEx('TK-000038');
  eq(cat.id, 'TK-000038', 'resolvePickerEx: catalogus-fallback id');
  eq(cat.name, 'Barbell Squat', 'resolvePickerEx: catalogus-fallback naam');
  eq(cat._catalog, true, 'resolvePickerEx: catalogus-fallback vlag');
  ok(resolvePickerEx('bestaat-niet') === null, 'resolvePickerEx: onbekend id → null');
})();

// ── 6. Robuustheid: geen catalogus-service beschikbaar ──
(() => {
  const save = ExerciseCatalogService; ExerciseCatalogService = null;
  exercises = [ { id:'bench', name:'Bench', type:'strength' } ];
  const pool = exPickerPool();
  eq(pool.length, 1, 'exPickerPool: zonder catalogus alleen legacy (geen crash)');
  ok(resolvePickerEx('TK-000019') === null, 'resolvePickerEx: zonder catalogus → null voor TK-id');
  eq(resolvePickerEx('bench').name, 'Bench', 'resolvePickerEx: legacy blijft werken zonder catalogus');
  ExerciseCatalogService = save;
})();

console.log('\nF41 picker-pool/resolver: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
