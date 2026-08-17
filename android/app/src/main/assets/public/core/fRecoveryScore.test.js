/* P1 core-sprint (16-08) — deterministische Recovery Score 0-100 (recovery_score.v1).
 * Test de ECHTE CalcCore.recoveryScore/recoveryBand. Deterministisch, geen fabricage bij ontbrekende data.
 * Draai: node core/fRecoveryScore.test.js
 */
const CalcCore = require('./calculation.js');
const R = CalcCore.recoveryScore, B = CalcCore.recoveryBand;

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

// ── geen fabricage bij ontbrekende data ──
eq(R({}).score, null, 'geen inputs → score null (geen verzonnen waarde)');
eq(R({}).band, 'onbekend', 'geen inputs → band onbekend');
eq(R(null).components, 0, 'null-input → 0 componenten');

// ── dayFactor-mapping (0.85→0, 1.00→75, 1.05→100) ──
eq(R({dayFactor:1.00}).score, 75, 'dayFactor 1.00 → 75 (neutraal)');
eq(R({dayFactor:0.85}).score, 0, 'dayFactor 0.85 (slechtst) → 0');
eq(R({dayFactor:1.05}).score, 100, 'dayFactor 1.05 (best) → 100');
eq(R({dayFactor:0.92}).score, 35, 'dayFactor 0.92 → 35');

// ── determinisme + begrenzing ──
eq(R({dayFactor:0.92}).score, R({dayFactor:0.92}).score, 'zelfde input → zelfde output (deterministisch)');
ok(R({dayFactor:2}).score <= 100 && R({dayFactor:2}).score >= 0, 'buiten bereik → geclampt 0-100');

// ── gewogen combinatie + confidence ──
let r = R({dayFactor:1.00, muscleRecoveryPct:100, rhrDelta:0, voelt:'top'});
eq(r.score, 89, 'alle top (df75·.45 + spier100·.30 + rhr100·.15 + top100·.10) = 88.75 → 89');
eq(r.confidence, 'hoog', '4 componenten → confidence hoog');
eq(R({dayFactor:1.00, muscleRecoveryPct:60}).confidence, 'gemiddeld', '2 componenten → gemiddeld');
eq(R({voelt:'goed'}).confidence, 'laag', '1 component → laag');

// ── RHR: hoger = slechter ──
ok(R({rhrDelta:0}).score > R({rhrDelta:10}).score, 'hogere RHR-delta → lagere score');
eq(R({rhrDelta:0}).score, 100, 'RHR-delta 0 → 100');

// ── voelt-mapping ──
ok(R({voelt:'slecht'}).score < R({voelt:'top'}).score, 'slecht < top');

// ── band-grenzen (≥80 hoog, ≥60 gemiddeld, anders laag) ──
eq(B(80), 'hoog', 'B(80)=hoog'); eq(B(79), 'gemiddeld', 'B(79)=gemiddeld');
eq(B(60), 'gemiddeld', 'B(60)=gemiddeld'); eq(B(59), 'laag', 'B(59)=laag');
eq(B(0), 'laag', 'B(0)=laag'); eq(B(null), 'onbekend', 'B(null)=onbekend');

// ── realistisch laag-herstel scenario ──
r = R({dayFactor:0.90, muscleRecoveryPct:55, rhrDelta:8, voelt:'matig'});
ok(r.score < 60, 'laag herstel-scenario → band laag (score '+r.score+')');
eq(r.band, 'laag', 'laag-scenario → band laag');

console.log('\nRecovery Score: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
