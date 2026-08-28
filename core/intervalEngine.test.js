/* Testsuite — core/intervalEngine.js (A6 v1) */
'use strict';
const IC = require('./intervalEngine.js');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + label); } }
function eq(actual, expected, label) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), label + ' (kreeg ' + JSON.stringify(actual) + ', verwacht ' + JSON.stringify(expected) + ')');
}

console.log('\nA. normalizePrescription() — repeat-groepen worden correct AFGEWISSELD (niet per blocktype geblokt)');
const rowErg = IC.normalizePrescription({
  sport: 'rowing',
  blocks: [
    { type: 'warmup', termination: { type: 'time', seconds: 600 } },
    { repeat: 8, of: [
      { type: 'work', termination: { type: 'distance', meters: 500 } },
      { type: 'recovery', termination: { type: 'time', seconds: 120 } }
    ] },
    { type: 'cooldown', termination: { type: 'time', seconds: 300 } }
  ]
});
ok(rowErg.geldig, 'A1: RowErg 8x[500m werk, 2:00 rust] is een geldige prescriptie');
eq(rowErg.blocks.length, 18, 'A2: 1 warmup + 16 (8x2) + 1 cooldown = 18 blocks');
eq(rowErg.blocks.map(function (b) { return b.type; }).slice(0, 5), ['warmup', 'work', 'recovery', 'work', 'recovery'], 'A3 (kernbewijs): work en recovery zijn CORRECT AFGEWISSELD, niet work*8 gevolgd door recovery*8');
eq(rowErg.blocks[rowErg.blocks.length - 1].type, 'cooldown', 'A4: laatste block is de cooldown');
eq(rowErg.blocks[1].repeatIndex, 0, 'A5: eerste work-block heeft repeatIndex 0');
eq(rowErg.blocks[1].repeatTotal, 8, 'A6: repeatTotal correct doorgegeven (8)');
eq(rowErg.blocks[15].repeatIndex, 7, 'A7: laatste herhaalde work-block heeft repeatIndex 7 (achtste van acht)');

console.log('\nB. HIIT: volledig time-based, totalPlannedSeconds correct berekend');
const hiit = IC.normalizePrescription({ sport: 'hiit', blocks: [{ repeat: 12, of: [
  { type: 'work', termination: { type: 'time', seconds: 30 } },
  { type: 'recovery', termination: { type: 'time', seconds: 30 } }
] }] });
eq(hiit.blocks.length, 24, 'B1: 12x2 = 24 blocks');
eq(IC.totalPlannedSeconds(hiit), 720, 'B2: 24 blocks x 30s = 720s totaal');

console.log('\nC. GEEN SCHIJNPRECISIE: totalPlannedSeconds is null zodra een distance/manual-block aanwezig is');
ok(IC.totalPlannedSeconds(rowErg) === null, 'C1 (kernprincipe): RowErg-prescriptie (bevat distance-blocks) heeft GEEN voorspelde totale duur -- geen gegokte tijd voor een niet-tijdgebonden block');
const manualOnly = IC.normalizePrescription({ sport: 'x', blocks: [{ type: 'work', termination: { type: 'manual' } }] });
ok(IC.totalPlannedSeconds(manualOnly) === null, 'C2: een MANUAL-block heeft per definitie geen voorspelbare duur');

console.log('\nD. Validatie: ongeldige prescripties worden correct geweigerd, nooit stilzwijgend "gerepareerd"');
ok(!IC.normalizePrescription({ sport: 'x', blocks: [{ type: 'sprint', termination: { type: 'time', seconds: 10 } }] }).geldig, 'D1: onbekend blocktype wordt geweigerd');
ok(!IC.normalizePrescription({ sport: 'x', blocks: [{ type: 'work', termination: { type: 'time' } }] }).geldig, 'D2: time-terminatie zonder seconds wordt geweigerd');
ok(!IC.normalizePrescription({ sport: 'x', blocks: [{ type: 'work', termination: { type: 'distance' } }] }).geldig, 'D3: distance-terminatie zonder meters wordt geweigerd');
ok(!IC.normalizePrescription({ sport: 'x', blocks: [] }).geldig, 'D4: lege blocks-array is ongeldig');
ok(!IC.normalizePrescription(null).geldig, 'D5: null-input is ongeldig, geen crash');
ok(!IC.normalizePrescription({}).geldig, 'D6: object zonder blocks-property is ongeldig, geen crash');

console.log('\nE. Puurheid: geen mutatie van de invoer, geen zij-effecten');
const origineel = { sport: 'x', blocks: [{ type: 'work', termination: { type: 'time', seconds: 10 } }] };
const voorSnapshot = JSON.stringify(origineel);
IC.normalizePrescription(origineel);
eq(JSON.stringify(origineel), voorSnapshot, 'E1: normalizePrescription() muteert de invoer niet');
const p1 = IC.normalizePrescription(origineel);
const p2 = IC.normalizePrescription(origineel);
ok(p1 !== p2, 'E2: retourneert bij elke aanroep een NIEUW object, geen gedeelde referentie');

console.log('\nF. stateAt() / nextBlockIndex() — pure state-lookup, geen wall-clock-kennis');
const s0 = IC.stateAt(hiit, 0);
eq(s0.status, 'bezig', 'F1: index 0 is "bezig"');
eq(s0.block.type, 'work', 'F2: eerste HIIT-block is work');
const sLast = IC.stateAt(hiit, 23);
ok(sLast.isLaatsteBlock, 'F3: index 23 (laatste van 24) is het laatste block');
const sDone = IC.stateAt(hiit, 24);
eq(sDone.status, 'voltooid', 'F4: index gelijk aan blocks.length betekent voltooid');
eq(IC.nextBlockIndex(5), 6, 'F5: nextBlockIndex is een pure increment');
const sLeeg = IC.stateAt({ blocks: [] }, 0);
eq(sLeeg.status, 'leeg', 'F6: een lege prescriptie geeft direct "leeg"/voltooid terug, geen crash');

console.log('\nG. Target vs termination blijven expliciet gescheiden concepten');
const metTarget = IC.normalizePrescription({ sport: 'rowing', blocks: [
  { type: 'work', termination: { type: 'time', seconds: 240 }, target: { power: 250 } }
] });
eq(metTarget.blocks[0].termination.seconds, 240, 'G1: termination (WANNEER eindigt het block) is 240s');
eq(metTarget.blocks[0].target.power, 250, 'G2: target (WAT moet de sporter halen) is apart, 250W, beïnvloedt termination niet');
ok(metTarget.blocks[0].target.rpe === null && metTarget.blocks[0].target.pace === null, 'G3: niet-opgegeven targetvelden blijven expliciet null, geen verzonnen waarde');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ intervalEngine niet groen.'); process.exit(1); }
console.log('✅ IntervalEngineCore is puur, deterministisch, en bewijsbaar correct voor RowErg/HIIT-scenario\'s.');
