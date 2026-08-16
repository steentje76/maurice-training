/* P2 (16-08) — persoonlijke equipment-memory (localStorage tk_eqmem), los van gym-referentie/history.
 * Extraheert de ECHTE eqMemGet/eqMemSet/eqMemAll uit index.html met een gestubde localStorage.
 * Draai: node core/fEquipmentMemory.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(name){
  const st = html.indexOf('function ' + name + '(');
  if (st < 0) throw new Error('functie niet gevonden: ' + name);
  let d = 0, e = -1;
  for (let j = html.indexOf('{', st); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') d++; else if (ch === '}'){ d--; if (d === 0){ e = j; break; } }
  }
  return html.slice(st, e + 1);
}
// gestubde localStorage + vaste tijd (eqMemSet gebruikt Date.now voor ts; determinisme niet vereist voor value)
let _store = {};
const localStorage = { getItem:k=>(k in _store?_store[k]:null), setItem:(k,v)=>{_store[k]=String(v);}, removeItem:k=>{delete _store[k];} };
const _origNow = Date.now; Date.now = () => 1700000000000;
eval(extractFn('eqMemAll') + '\n' + extractFn('eqMemGet') + '\n' + extractFn('eqMemSet'));

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

// ── leeg = geen suggestie (niet verzonnen) ──
_store = {};
eq(eqMemGet('bench'), '', 'onbekende oefening → lege string (geen verzonnen waarde)');

// ── opslaan + teruglezen (per oefening) ──
eqMemSet('bench', 'Pin 12, Zitting 4');
eq(eqMemGet('bench'), 'Pin 12, Zitting 4', 'opgeslagen instelling teruggelezen');
eq(eqMemGet('squat'), '', 'andere oefening blijft leeg (per-oefening gescheiden)');

// ── overschrijven ──
eqMemSet('bench', 'Pin 14');
eq(eqMemGet('bench'), 'Pin 14', 'nieuwe instelling overschrijft de vorige');

// ── persistentie: nieuwe "sessie" (nieuwe eval van de getter tegen dezelfde store) ──
const eqMemGet2 = eval('(' + extractFn('eqMemGet') + ')');
eq(eqMemGet2('bench'), 'Pin 14', 'instelling overleeft (blijft in localStorage, ≠ session-history)');

// ── leegmaken verwijdert de entry ──
eqMemSet('bench', '   ');
eq(eqMemGet('bench'), '', 'lege/whitespace waarde → entry verwijderd');

// ── store bevat alleen echte entries ──
eqMemSet('a','X'); eqMemSet('b','Y');
const all = JSON.parse(_store['tk_eqmem']);
eq(Object.keys(all).sort().join(','), 'a,b', 'store bevat exact de gezette oefeningen');

Date.now = _origNow;
console.log('\nEquipment memory: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
