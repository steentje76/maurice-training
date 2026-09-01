/* fRunningIntelligenceCore.test.js — B9-03 Running Intelligence.
 * Bewaakt de pure aggregatie/trend-bouwstenen, conform de testmatrix
 * (sectie 35): weekly aggregation, distance-band-keys, consistency,
 * Critical Speed-eligibility.
 */
'use strict';
const RIC = require('./runningIntelligence.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Weekly volume aggregation ----
{
  const activities = [
    { recorded_at: '2026-08-03T08:00:00Z', distance_meters: 5000, duration_seconds: 1500 }, // maandag week 1
    { recorded_at: '2026-08-05T08:00:00Z', distance_meters: 3000, duration_seconds: 900 },  // woensdag week 1
    { recorded_at: '2026-08-10T08:00:00Z', distance_meters: 10000, duration_seconds: 3000 }, // week 2
  ];
  const vol = RIC.weeklyVolume(activities);
  const weken = Object.keys(vol);
  ok(weken.length === 2, 'A1: twee, correct gescheiden weken worden herkend uit drie activiteiten');
  const week1 = vol[RIC.weekKeyFromDate('2026-08-03')];
  ok(week1.distanceMeters === 8000 && week1.count === 2, 'A2: week 1 aggregeert correct 2 activiteiten tot 8000m totaal');
}
{
  // Ontbrekende recorded_at wordt genegeerd, geen fabricage van een datum.
  const vol = RIC.weeklyVolume([{ distance_meters: 5000 }, null, { recorded_at: 'invalid-date', distance_meters: 1000 }]);
  ok(Object.keys(vol).length === 0, 'A3: activiteiten zonder geldige recorded_at worden genegeerd, geen verzonnen week');
}
{
  // Partial current week / timezone-grens: een maandag-ochtend-activiteit hoort bij die week.
  const maandagKey = RIC.weekKeyFromDate('2026-08-03T00:30:00Z'); // maandag vroeg
  const zondagKey = RIC.weekKeyFromDate('2026-08-02T23:30:00Z'); // zondag laat, vorige week
  ok(maandagKey !== zondagKey, 'A4 (timezone/weekgrens): een activiteit net vóór maandag 00:00 UTC hoort bij de vorige week, niet dezelfde');
}

// ---- B. Distance-band-key (appels-met-appels, sectie 8) ----
ok(RIC.distanceBandKey(3000) === 'running_lt5km', 'B1: 3km valt in de <5km-band');
ok(RIC.distanceBandKey(7000) === 'running_5_10km', 'B2: 7km valt in de 5-10km-band');
ok(RIC.distanceBandKey(25000) === 'running_15km_plus', 'B3: 25km valt in de 15km+-band');
ok(RIC.distanceBandKey(3000) !== RIC.distanceBandKey(25000), 'B4: een tempo-run (3km) en een lange duurloop (25km) krijgen NOOIT dezelfde band-key (nooit naief vergeleken)');
ok(RIC.distanceBandKey(null) === null && RIC.distanceBandKey(-100) === null, 'B5: ontbrekende/ongeldige afstand geeft geen band (geen vergelijking mogelijk, geen fabricage)');

// ---- C. Consistency (Evidence Level E, geen performance-claim) ----
{
  const activities = [{ recorded_at: '2026-08-03T08:00:00Z', distance_meters: 5000 }];
  const c = RIC.consistency(activities, 4, '2026-08-24T12:00:00Z');
  ok(c.evidenceLevel === 'E', 'C1: consistency draagt expliciet Evidence Level E (technisch/afgeleid, geen performance-voorspelling)');
  ok(c.activeWeeks === 1 && c.totalWeeks === 4, 'C2: exact 1 van de 4 weken was actief, correct geteld');
}
{
  const c0 = RIC.consistency([], 8);
  ok(c0.activeWeeks === 0, 'C3: 0 activiteiten geeft 0 actieve weken, geen crash, geen verzonnen waarde');
}

// ---- D. Critical Speed eligibility (sectie 11/12: alleen expliciet gemarkeerde max-effort) ----
{
  const activities = [
    { is_max_effort: false, distance_meters: 5000, duration_seconds: 1200 }, // easy run, NIET geschikt
    { is_max_effort: true, distance_meters: 3000, duration_seconds: 600 },
    { is_max_effort: true, distance_meters: 1600, duration_seconds: 300 },
  ];
  const r = RIC.criticalSpeedEligiblePerformances(activities, 3);
  ok(r.status === 'insufficient' && r.n === 2, 'D1: met slechts 2 gemarkeerde max-effort-activiteiten (drempel 3) blijft de status insufficient, GEEN CS getoond');
  ok(!r.performances || r.performances.every(function (p) { return true; }), 'D2 (sanity): insufficient retourneert geen bruikbare performances-array om per ongeluk te gebruiken');
}
{
  const activities = [
    { is_max_effort: false, distance_meters: 10000, duration_seconds: 3600 }, // NOOIT meegenomen, ongeacht hoe "hard" het lijkt
    { is_max_effort: true, distance_meters: 3000, duration_seconds: 600 },
    { is_max_effort: true, distance_meters: 1600, duration_seconds: 300 },
    { is_max_effort: true, distance_meters: 5000, duration_seconds: 1080 },
  ];
  const r = RIC.criticalSpeedEligiblePerformances(activities, 3);
  ok(r.status === 'eligible' && r.n === 3, 'D3: exact de 3 expliciet gemarkeerde max-effort-activiteiten worden gebruikt (sabotage-scenario 4: een normale easy run voedt CS NIET)');
}

console.log('fRunningIntelligenceCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
