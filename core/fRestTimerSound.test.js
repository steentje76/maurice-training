/* P1 (14-08) — Rusttimer-standaard + geluid (Web Audio) + wakelock (sporterkeuze).
 * Test de gedrag-bepalende, pure logica die uit index.html is geëxtraheerd:
 *  - restDefaultSec(): afwezige instelling → 120 (timer verschijnt per set), "0" → uit, "90" → 90.
 *  - restBeepSequence(): 3 korte + 1 lange toon, oplopend eindsignaal.
 * Wake lock + het daadwerkelijk afspelen/​trillen zijn browser-API's → device-verificatie.
 * Draai: node core/fRestTimerSound.test.js
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

// stub localStorage voor restDefaultSec
let _store = {};
const localStorage = { getItem:k=> (k in _store ? _store[k] : null), setItem:(k,v)=>{_store[k]=String(v);}, removeItem:k=>{delete _store[k];} };

const restDefaultSec = eval('(' + extractFn('restDefaultSec') + ')');
const restBeepSequence = eval('(' + extractFn('restBeepSequence') + ')');
const countdownSeconds = eval('(' + extractFn('countdownSeconds') + ')');
const dynamicRestSec = eval('(' + extractFn('dynamicRestSec') + ')');

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

// ── restDefaultSec ──
_store = {};
eq(restDefaultSec(), 120, 'afwezige instelling → 120s (rusttimer verschijnt per set — de bug uit de melding)');
_store = { tk_rest_default:'0' };
eq(restDefaultSec(), 0, '"0" (Uit) → 0, expliciet uitgezet blijft uit');
_store = { tk_rest_default:'90' };
eq(restDefaultSec(), 90, '"90" → 90');
_store = { tk_rest_default:'120' };
eq(restDefaultSec(), 120, '"120" → 120');
_store = { tk_rest_default:'' };
eq(restDefaultSec(), 0, 'lege string → 0 (parseInt faalt → 0, geen crash)');

// ── restBeepSequence ──
const seq = restBeepSequence();
eq(seq.length, 4, 'toon-schema: 4 tonen (3 kort + 1 lang)');
ok(seq.slice(0,3).every(n=>n.d <= 0.2), 'toon-schema: eerste 3 tonen kort (≤0.2s)');
ok(seq[3].d > seq[0].d, 'toon-schema: laatste toon langer dan de eerste');
ok(seq[3].f > seq[0].f, 'toon-schema: eindsignaal hogere toon (herkenbaar afsluiten)');
ok(seq.every((n,i)=> i===0 || n.t > seq[i-1].t), 'toon-schema: tijdstippen strikt oplopend (geen overlap-start)');

// ── countdownSeconds — aftel-piepjes in de laatste seconden ──
const cd = countdownSeconds();
eq(JSON.stringify(cd), JSON.stringify([5,4,3,2,1]), 'aftel-piepjes op 5,4,3,2,1 (incl. 2s — natuurlijke aftelling)');
ok(!cd.includes(0), 'aftel: geen piep op 0 (daar komt het eindsignaal)');

// ── dynamicRestSec — rust schalen op zwaarte (RPE) ──
eq(dynamicRestSec(120, 8), 120, 'RPE 8 (referentie) → basisrust 120s ongewijzigd');
eq(dynamicRestSec(120, 10), 180, 'RPE 10 (maximaal zwaar) → 1.5× = 180s');
eq(dynamicRestSec(120, 9), 150, 'RPE 9 (zwaar) → 1.25× = 150s');
eq(dynamicRestSec(120, 6), 90, 'RPE 6 (licht) → 0.75× = 90s');
eq(dynamicRestSec(120, 5), 90, 'RPE 5 (heel licht) → ondergrens-tak 0.75×');
eq(dynamicRestSec(120, null), 120, 'geen RPE → basisrust ongewijzigd (geen verzonnen aanpassing)');
eq(dynamicRestSec(120, NaN), 120, 'ongeldige RPE → basisrust ongewijzigd');
eq(dynamicRestSec(0, 9), 0, 'basis 0 (Uit) → blijft 0, dynamiek zet geen timer aan');
ok(dynamicRestSec(30, 6) >= 30, 'ondergrens: nooit korter dan 30s');
ok(dynamicRestSec(133, 9) % 5 === 0, 'afronding op hele 5 seconden');

console.log('\nRusttimer + geluid: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
