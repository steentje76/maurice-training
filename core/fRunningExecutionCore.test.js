/* fRunningExecutionCore.test.js — B9-02B.
 * Bewaakt de pure state machine + deterministische timer-engine.
 */
'use strict';
const assert = require('assert');
const RunningExecutionCore = require('./runningExecution.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const RC = RunningExecutionCore;
const T0 = 1000000;

// ---- A. Geldige transitions ----
{
  let s = RC.createSession(T0);
  ok(s.status === 'READY', 'A1: nieuwe sessie start in READY');
  let r = RC.start(s, T0); ok(r.ok && r.state.status === 'RUNNING', 'A2: READY -> RUNNING toegestaan');
  r = RC.pause(r.state, T0 + 5000); ok(r.ok && r.state.status === 'PAUSED', 'A3: RUNNING -> PAUSED toegestaan');
  r = RC.resume(r.state, T0 + 8000); ok(r.ok && r.state.status === 'RUNNING', 'A4: PAUSED -> RUNNING toegestaan');
  r = RC.requestFinish(r.state, T0 + 10000); ok(r.ok && r.state.status === 'FINISH_CONFIRM', 'A5: RUNNING -> FINISH_CONFIRM toegestaan');
  r = RC.confirmFinish(r.state, T0 + 11000); ok(r.ok && r.state.status === 'COMPLETED', 'A6: FINISH_CONFIRM -> COMPLETED toegestaan');
}

// ---- B. Ongeldige transitions worden geweigerd ----
{
  let s = RC.createSession(T0);
  let r = RC.start(s, T0);
  r = RC.requestFinish(r.state, T0 + 500);
  r = RC.confirmFinish(r.state, T0 + 1000);
  ok(r.ok && r.state.status === 'COMPLETED', 'setup: naar COMPLETED via de correcte FINISH_CONFIRM-tussenstap');
  const na = RC.start(r.state, T0 + 2000);
  ok(!na.ok, 'B1: COMPLETED -> RUNNING is onmogelijk (COMPLETED is een eindstaat)');
  const paus = RC.pause(r.state, T0 + 2000);
  ok(!paus.ok, 'B2: COMPLETED -> PAUSED is onmogelijk');
}
ok(!RC.canTransition('READY', 'PAUSED'), 'B3: READY -> PAUSED is geen geldige transitie (moet eerst RUNNING zijn)');
ok(!RC.canTransition('READY', 'COMPLETED'), 'B4: READY -> COMPLETED is geen geldige transitie');

// ---- C. Deterministische timer (geen setInterval, alleen segmenten) ----
{
  let s = RC.createSession(T0);
  let r = RC.start(s, T0);
  ok(RC.elapsedActiveMs(r.state, T0 + 10000) === 10000, 'C1: 10s actief zonder pauze -> 10000ms elapsed');
  r = RC.pause(r.state, T0 + 10000);
  ok(RC.elapsedActiveMs(r.state, T0 + 20000) === 10000, 'C2: pauze-tijd telt NIET mee in elapsedActiveMs (sabotage-scenario 1)');
  ok(RC.elapsedPausedMs(r.state, T0 + 20000) === 10000, 'C3: elapsedPausedMs telt uitsluitend de gepauzeerde tijd');
  r = RC.resume(r.state, T0 + 20000);
  ok(RC.elapsedActiveMs(r.state, T0 + 25000) === 15000, 'C4: na hervatten telt de nieuwe, actieve tijd correct op bij de oude (10s + 5s)');
}

// ---- D. cancelFinish keert correct terug naar de vorige status ----
{
  let s = RC.createSession(T0);
  let r = RC.start(s, T0);
  r = RC.pause(r.state, T0 + 5000);
  r = RC.requestFinish(r.state, T0 + 6000);
  r = RC.cancelFinish(r.state, T0 + 7000);
  ok(r.ok && r.state.status === 'PAUSED', 'D1: cancelFinish vanuit een gepauzeerde sessie keert terug naar PAUSED, niet RUNNING');
}

// ---- E. Laps: duration is uitsluitend actieve tijd sinds de vorige lap ----
{
  let s = RC.createSession(T0);
  let r = RC.start(s, T0);
  r = RC.addLap(r.state, T0 + 5000, { distance_meters: 1000 });
  ok(r.ok && r.state.laps[0].lap_index === 1 && r.state.laps[0].duration_seconds === 5, 'E1: eerste lap heeft lap_index 1 en 5s duur');
  r = RC.pause(r.state, T0 + 5000);
  r = RC.resume(r.state, T0 + 8000); // 3s gepauzeerd, telt niet mee
  r = RC.addLap(r.state, T0 + 13000, { distance_meters: 1000 });
  ok(r.state.laps[1].duration_seconds === 5, 'E2: tweede lap-duur telt alleen actieve tijd (5s), NIET de 3s pauze ertussen');
  ok(r.state.laps.length === 2 && r.state.laps[1].lap_index === 2, 'E3: laps blijven oplopend, uniek genummerd (lap_index 1, 2, ...)');
}

console.log('fRunningExecutionCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
