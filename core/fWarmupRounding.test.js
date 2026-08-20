/* P2 (16-08) — equipment-aware praktische warm-up-afronding (rounding_increment.v1 + warmup.v1).
 * Draai: node core/fWarmupRounding.test.js
 */
const CalcCore = require('./calculation.js');
const RI = CalcCore.roundToIncrement, W = CalcCore.calculateWarmup;
// extraheer de ECHTE equipmentIncrement uit index.html (materiaal-tag → praktische stap)
const fs = require('fs'), path = require('path');
const _html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function _extract(name){ const st=_html.indexOf('function '+name+'('); let d=0,e=-1; for(let j=_html.indexOf('{',st);j<_html.length;j++){const c=_html[j]; if(c==='{')d++; else if(c==='}'){d--; if(d===0){e=j;break;}}} return _html.slice(st,e+1); }
const equipmentIncrement = eval('(' + _extract('equipmentIncrement') + ')');

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

// ── roundToIncrement ──
eq(RI(38.75, 2.5), 40, '38,75 kg @ inc 2,5 → 40 (praktisch, niet 38,75)');
eq(RI(39, 2.5), 40, '39 → 40');
eq(RI(41, 2.5), 40, '41 → 40 (dichtstbijzijnde stap)');
eq(RI(42.5, 2.5), 42.5, '42,5 → 42,5 (al op stap)');
eq(RI(57.125, 2.5), 57.5, '57,125 → 57,5');
eq(RI(38.75, 0), 39, 'inc 0 → roundKg-terugval: roundKg(38.75)=39 (0,5-stap, half-up)');
eq(RI(38.4, 0), 38.5, 'inc 0 → roundKg(38.4)=38.5');

// ── calculateWarmup zonder increment = ONGEWIJZIGD (achterwaarts compatibel) ──
const base = W(77.5);
ok(base.length === 3, 'warmup 77,5 → 3 sets (drempel ≥40)');
eq(base[0].kg, Math.round(77.5*0.5*2)/2, '77,5 zonder increment: eerste set = roundKg (0,5) — ongewijzigd');

// ── calculateWarmup MET increment 2,5 = praktisch ──
const bar = W(77.5, 2.5);
eq(bar[0].kg, 40, '77,5 @ inc 2,5: 50% = 38,75 → 40');
ok(bar.every(s => s.kg % 2.5 === 0), 'alle warm-up gewichten op 2,5-stap');
eq(bar[0].reps, base[0].reps, 'reps ongewijzigd door increment (alleen kg-afronding)');

// zwaardere set 120 kg @ 2,5
const heavy = W(140, 2.5);
ok(heavy.length === 5, '140 kg → 5 warm-up sets (≥120)');
ok(heavy.every(s => s.kg % 2.5 === 0), '140 @ 2,5: alle op stap');

// ── equipmentIncrement: materiaal-specifieke praktische stap; onbekend → 0 (veilige fallback) ──
eq(equipmentIncrement(['barbell']), 2.5, 'barbell → 2,5');
eq(equipmentIncrement(['dumbbell']), 2, 'dumbbell → 2');
eq(equipmentIncrement(['kettlebell']), 4, 'kettlebell → 4');
eq(equipmentIncrement(['machine']), 5, 'machine → 5');
eq(equipmentIncrement(['cable machine']), 2.5, 'cable machine → 2,5');
eq(equipmentIncrement(['bodyweight']), 0, 'bodyweight → 0 (geen gewicht)');
eq(equipmentIncrement(['band']), 0, 'band → 0');
eq(equipmentIncrement([]), 0, 'geen tag → 0 (onbekend, veilige fallback op roundKg)');
eq(equipmentIncrement(null), 0, 'null → 0');
eq(equipmentIncrement(['BARBELL']), 2.5, 'hoofdletter-ongevoelig');
eq(equipmentIncrement(['bodyweight','dumbbell']), 2, 'eerste materiaal met stap>0 wint');
// eind-tot-eind: dumbbell-warmup rondt op 2 kg
const db = W(50, equipmentIncrement(['dumbbell']));
ok(db.every(s => s.kg % 2 === 0), 'dumbbell-warmup: alle gewichten op 2 kg-stap');

console.log('\nWarm-up rounding: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
