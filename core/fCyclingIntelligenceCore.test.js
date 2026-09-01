/* fCyclingIntelligenceCore.test.js — B9-05 Cycling Intelligence.
 * Bewaakt de pure, cycling-specifieke bouwstenen.
 */
'use strict';
const CIC = require('./cyclingIntelligence.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Speed-band-key (fiets-schaal, appels-met-appels) ----
ok(CIC.speedBandKey(15000) === 'cycling_lt20km', 'A1: 15km valt in de <20km-band (fietsschaal, niet hardloopschaal)');
ok(CIC.speedBandKey(35000) === 'cycling_20_50km', 'A2: 35km valt in de 20-50km-band');
ok(CIC.speedBandKey(120000) === 'cycling_100km_plus', 'A3: 120km valt in de 100km+-band');
ok(CIC.speedBandKey(15000) !== CIC.speedBandKey(120000), 'A4: een korte, snelle rit (15km) en een lange toertocht (120km) krijgen NOOIT dezelfde band-key');
ok(CIC.speedBandKey(null) === null && CIC.speedBandKey(-5) === null, 'A5: ontbrekende/ongeldige afstand geeft geen band, geen fabricage');

// ---- B. Critical Power eligibility (uitsluitend gemarkeerde max-effort MET vermogen) ----
{
  const activities = [
    { is_max_effort: true, distance_meters: 20000, duration_seconds: 1800 }, // GEEN avg_power_watts -- niet geschikt
    { is_max_effort: true, avg_power_watts: 280, duration_seconds: 600 },
    { is_max_effort: true, avg_power_watts: 260, duration_seconds: 1200 },
  ];
  const r = CIC.criticalPowerEligiblePerformances(activities, 3);
  ok(r.status === 'insufficient' && r.n === 2, 'B1: een gemarkeerde activiteit zonder vermogensdata telt niet mee -- drempel 3 blijft insufficient met 2');
}
{
  const activities = [
    { is_max_effort: false, avg_power_watts: 350, duration_seconds: 300 }, // NIET gemarkeerd -- nooit meegenomen, ongeacht hoe "hard" het lijkt
    { is_max_effort: true, avg_power_watts: 280, duration_seconds: 600 },
    { is_max_effort: true, avg_power_watts: 260, duration_seconds: 1200 },
    { is_max_effort: true, avg_power_watts: 300, duration_seconds: 300 },
  ];
  const r = CIC.criticalPowerEligiblePerformances(activities, 3);
  ok(r.status === 'eligible' && r.n === 3, 'B2 (sabotage-analoog): exact de 3 expliciet gemarkeerde activiteiten worden gebruikt, een normale rit met hoog vermogen voedt CP NIET');
}

console.log('fCyclingIntelligenceCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
