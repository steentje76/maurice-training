/* fRunningIntelligence.test.js — MS-F6-01 regressietest.
 *
 * A. Golden cases voor CardioCore.criticalSpeed(): geldig, onvoldoende data,
 *    identieke duren (gedegenereerde regressie), ongeldige input.
 * B. Bevestigt dat pace-trends de BESTAANDE ProgressionCore.trendBy() hergebruiken
 *    (geen tweede, gedupliceerde trendalgoritme voor endurance).
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
const ProgressionCore = require(path.join(ROOT, 'core/progression.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Golden cases: criticalSpeed() ----
{
  const r1 = CardioCore.criticalSpeed([{ distance_m: 5000, duration_s: 1200 }, { distance_m: 3000, duration_s: 660 }]);
  ok(r1.status === 'valid' && Math.abs(r1.cs_m_s - 3.7037) < 0.001, 'A1: 2 geldige, verschillende tijdritten -> geldige CS (~3.70 m/s)');
  ok(r1.d_prime_m > 0, 'A1: D-prime (anaerobe capaciteit) is positief en plausibel');

  const r2 = CardioCore.criticalSpeed([{ distance_m: 5000, duration_s: 1200 }]);
  ok(r2.status === 'insufficient' && r2.reason === 'min_2_performances_required', 'A2: 1 performance -> insufficient, nooit een verzonnen CS uit één punt');

  const r3 = CardioCore.criticalSpeed([{ distance_m: 5000, duration_s: 1200 }, { distance_m: 3000, duration_s: 1200 }]);
  ok(r3.status === 'insufficient' && r3.reason === 'durations_not_distinct', 'A3: identieke duren -> insufficient (ongedefinieerde regressie), geen gok');

  const r4 = CardioCore.criticalSpeed('geen array');
  ok(r4.status === 'invalid', 'A4: niet-array-invoer -> invalid, fail-closed');

  const r5 = CardioCore.criticalSpeed([{ distance_m: -100, duration_s: 60 }]);
  ok(r5.status === 'insufficient', 'A5: negatieve afstand wordt gefilterd, telt niet mee als geldige performance');

  const r6 = CardioCore.criticalSpeed([
    { distance_m: 5000, duration_s: 1200 }, { distance_m: 3000, duration_s: 660 }, { distance_m: 1500, duration_s: 300 }
  ]);
  ok(r6.status === 'valid' && r6.n_performances === 3 && r6.r_squared != null,
    'A6: 3 performances -> R² aanwezig, geen gefabriceerde confidence zonder statistische basis');
}

// ---- B. Pace-trend hergebruikt de bestaande, generieke trendBy() (geen duplicatie) ----
{
  const history = [
    { key: 'run_5k', pace_s_per_km: 300, date: '2026-07-01' },
    { key: 'run_5k', pace_s_per_km: 295, date: '2026-07-15' },
    { key: 'run_5k', pace_s_per_km: 288, date: '2026-08-01' }
  ];
  const trend = ProgressionCore.trendBy(history, 'run_5k', 'pace_s_per_km', 'min', 3);
  ok(trend.status === 'trend' && trend.improving === true,
    'B1: dalende pace (sneller) over 3 vergelijkbare 5k-runs -> trend, improving=true (dir=min correct toegepast)');
  ok(!Object.keys(CardioCore).some(k => /trend/i.test(k)),
    'B2: CardioCore bevat GEEN eigen trendfunctie -- pace-trends hergebruiken uitsluitend ProgressionCore.trendBy(), geen tweede trendalgoritme voor endurance');
}

console.log('fRunningIntelligence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
