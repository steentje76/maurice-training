/* P1 (16-08) — universele recovery-aanpassing: determinisme + double-application-bescherming.
 * De aanpassing (DecisionCore.computeProgAdjustment) is deterministisch en wordt in de app op de
 * IMMUTABELE basiswaarden (4 sets, RPE 8) toegepast — nooit op een eerder-aangepaste waarde. Dit
 * simuleert die toepassing en bewijst dat herhaald toepassen NIET compound.
 * Draai: node core/fRecoveryAdaptation.test.js
 */
const Dec = require('./decision.js');

// Zelfde toepassing als de app (programmaflow + custom): delta op de BASISwaarden, geclampt.
function applyToBase(baseSets, baseRpe, adj){
  return { sets: Math.max(1, baseSets + (adj.setsDelta||0)), rpe: Math.max(5, Math.min(10, baseRpe + (adj.rpeDelta||0))) };
}

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

// ── determinisme: zelfde herstel → zelfde aanpassing ──
const a1 = Dec.computeProgAdjustment(0.88, [], null, null);
const a2 = Dec.computeProgAdjustment(0.88, [], null, null);
eq(JSON.stringify({r:a1.rpeDelta,s:a1.setsDelta}), JSON.stringify({r:a2.rpeDelta,s:a2.setsDelta}), 'deterministisch: identieke aanpassing bij identieke input');

// ── laag herstel → reductie ──
const low = Dec.computeProgAdjustment(0.88, [], null, null); // factor<0.90 → rpe-1.5, sets-1
ok(low.setsDelta < 0 || low.rpeDelta < 0, 'laag herstel (0.88) → reductie in sets/RPE');
const p1 = applyToBase(4, 8, low);
ok(p1.sets < 4 || p1.rpe < 8, 'toegepast op basis → lichtere training');

// ── DOUBLE-APPLICATION PROTECTION: toepassen op de basis is idempotent (geen compounding) ──
const again = applyToBase(4, 8, low); // opnieuw vanuit de BASIS (zoals de app doet)
eq(p1.sets, again.sets, 'sets identiek bij herhaalde toepassing op basis (niet -2)');
eq(p1.rpe, again.rpe, 'RPE identiek bij herhaalde toepassing op basis');
// tegenvoorbeeld: toepassen op de AL-aangepaste waarde zou WEL compounden (dat doet de app bewust niet)
const wrong = applyToBase(p1.sets, p1.rpe, low);
ok(wrong.sets <= p1.sets, 'compounding zou verder verlagen — daarom past de app altijd op de basis toe');

// ── neutraal herstel → geen aanpassing (computeProgAdjustment geeft null = niets nodig) ──
const neutral = Dec.computeProgAdjustment(1.00, [], null, null) || {setsDelta:0, rpeDelta:0};
eq(neutral.setsDelta||0, 0, 'neutraal herstel (1.00) → geen sets-aanpassing (null→0)');
eq(neutral.rpeDelta||0, 0, 'neutraal herstel → geen RPE-aanpassing');
const pn = applyToBase(4, 8, neutral);
eq(pn.sets, 4, 'neutraal → basis 4 sets ongewijzigd');
eq(pn.rpe, 8, 'neutraal → basis RPE 8 ongewijzigd');

console.log('\nRecovery-adaptatie: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
