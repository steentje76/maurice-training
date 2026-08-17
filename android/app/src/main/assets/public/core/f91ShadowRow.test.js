/* F91 / Optie B — Unit test voor de FK-compat shadow-rij logica (ensureExerciseRow).
 * Extraheert de ECHTE functie uit index.html en draait die met gestubde globals.
 * Verifieert: alleen een catalogus-only id (niet in exercises) → insert met correcte shape;
 * bestaande/legacy/custom/non-catalogus → GEEN insert. Geen fuzzy, geen tweede source of truth.
 * Draai: node core/f91ShadowRow.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(name){
  const start = html.indexOf('async function ' + name + '(') >= 0
    ? html.indexOf('async function ' + name + '(')
    : html.indexOf('function ' + name + '(');
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
let _ensureRowInflight = {};
let _posted = [];          // sbPost-oproepen (t, row)
let _postResult = true;    // laat sbPost slagen/falen
let _invalidated = 0;
async function sbPost(t, row){ _posted.push({ t, row }); return _postResult; }
function invalidateExPickerPool(){ _invalidated++; }
const CAT = {
  'TK-000105': { catalog_id:'TK-000105', identity:{ name:'Dumbbell Goblet Squat', primary:['Quadriceps'], secondary:['Billen'], equipment:['dumbbell'] } }
};
let ExerciseCatalogService = { byId:(id)=>CAT[id]||null };

eval(extractFn('ensureExerciseRow'));

let pass=0, fail=0;
function ok(c,m){ if(c) pass++; else { fail++; console.log('  ✗ '+m); } }
function eq(a,b,m){ ok(a===b, m+' (verwacht '+JSON.stringify(b)+', kreeg '+JSON.stringify(a)+')'); }

(async () => {
  // 1. catalogus-only id (niet in exercises) → insert met correcte shape + push + pool-invalidate
  exercises = []; _posted = []; _ensureRowInflight = {}; _invalidated = 0; _postResult = true;
  const r1 = await ensureExerciseRow('TK-000105');
  eq(r1, true, 'catalog-only → insert ok');
  eq(_posted.length, 1, 'sbPost 1× aangeroepen');
  eq(_posted[0].t, 'exercises', 'insert naar exercises-tabel');
  eq(_posted[0].row.id, 'TK-000105', 'shadow id = catalog_id');
  eq(_posted[0].row.name, 'Dumbbell Goblet Squat', 'naam uit catalogus');
  eq(_posted[0].row.scope, 'personal', 'scope personal (client-schrijfbaar)');
  eq(JSON.stringify(_posted[0].row.muscle_primary), JSON.stringify(['Quadriceps']), 'muscle_primary uit catalogus');
  ok(exercises.some(e=>e.id==='TK-000105'), 'na succes: toegevoegd aan exercises-array');
  eq(_invalidated, 1, 'pool-cache geïnvalideerd');

  // 2. id al aanwezig in exercises → GEEN insert
  exercises = [{ id:'TK-000105', name:'x' }]; _posted = []; _ensureRowInflight = {};
  const r2 = await ensureExerciseRow('TK-000105');
  eq(r2, true, 'reeds aanwezig → ok');
  eq(_posted.length, 0, 'reeds aanwezig → geen insert');

  // 3. legacy/custom id (niet in catalogus) → GEEN insert (hoort al te bestaan)
  exercises = []; _posted = []; _ensureRowInflight = {};
  const r3 = await ensureExerciseRow('bench');
  eq(r3, true, 'non-catalog id → ok');
  eq(_posted.length, 0, 'non-catalog id → geen insert');

  // 4. leeg id → geen insert
  exercises = []; _posted = []; _ensureRowInflight = {};
  await ensureExerciseRow('');
  eq(_posted.length, 0, 'leeg id → geen insert');

  // 5. insert faalt (RLS/FK) → niet toegevoegd aan exercises-array
  exercises = []; _posted = []; _ensureRowInflight = {}; _postResult = false;
  const r5 = await ensureExerciseRow('TK-000105');
  eq(r5, false, 'mislukte insert → false');
  ok(!exercises.some(e=>e.id==='TK-000105'), 'mislukte insert → niet lokaal toegevoegd (geen stille afwijking)');

  console.log('\nF91 shadow-row (FK-compat): RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})();
