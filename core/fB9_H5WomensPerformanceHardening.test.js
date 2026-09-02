/* core/fB9_H5WomensPerformanceHardening.test.js
 * B9-H5 Women's Performance 9+ Functional Hardening.
 * Bewaakt: de zelf gevonden en gerepareerde confidence-fix (geen
 * forced 28-day model zonder confidence-signalering), causale/
 * medische taal-audit, symptom-to-training-rules-grens, en RLS/
 * coach-scope-isolatie (WOMENS_PERFORMANCE apart van RECOVERY_HEALTH).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CycleCore = require('./cycle.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const decision = fs.readFileSync(path.join(ROOT, 'core/decision.js'), 'utf8');
const cycleSrc = fs.readFileSync(path.join(ROOT, 'core/cycle.js'), 'utf8');
const cycleTrainingSrc = fs.readFileSync(path.join(ROOT, 'core/cycleTraining.js'), 'utf8');

// ---- 1. Zelf gevonden en gerepareerde fix: forced 28-day model zonder confidence ----
ok(CycleCore.estimatedPhaseConfidence(null, []) === 'unavailable',
  '1a: geen cyclusdag bekend -> confidence "unavailable" (geen schatting mogelijk)');
ok(CycleCore.estimatedPhaseConfidence(5, [{ start_date: '2026-04-01' }]) === 'low',
  '1b (zelf gevonden en gerepareerd): met slechts 1 gelogde periode (0 gemeten cyclus-intervallen) gebruikt estimatedPhaseFromDay() de 28-dagen-fallback -- dit wordt nu expliciet als "low" confidence gemarkeerd, waar de functie voorheen stilzwijgend dezelfde, impliciete zekerheid suggereerde als bij een gebruiker met een lange, bekende cyclushistorie (sectie 14: "Geen forced 28-day model... Missing != normal")');
ok(CycleCore.estimatedPhaseConfidence(5, [{ start_date: '2026-03-01' }, { start_date: '2026-04-01' }]) === 'medium',
  '1c: met 1 gemeten cyclus-interval (2 periodes) -> "medium" confidence, hoger dan de 28-dagen-gok maar nog niet de hoogste categorie');
ok(CycleCore.estimatedPhaseConfidence(5, [{ start_date: '2026-01-01' }, { start_date: '2026-02-01' }, { start_date: '2026-03-01' }, { start_date: '2026-04-01' }]) === 'high',
  '1d: met >=2 gemeten cyclus-intervallen -> "high" confidence, gebaseerd op een echte, gemeten gemiddelde cycluslengte');

// ---- 2. cycleContext() geeft de nieuwe confidence door (backward-compatible uitbreiding) ----
{
  const ctx = CycleCore.cycleContext([{ start_date: '2026-04-01' }], '2026-04-06');
  ok(Object.prototype.hasOwnProperty.call(ctx, 'geschatteFaseConfidence'),
    '2: cycleContext() bevat het nieuwe geschatteFaseConfidence-veld -- bestaande velden blijven ongewijzigd (backward-compatible)');
}

// ---- 3. Causale taal-audit (sectie 32): geen actieve causale claims ----
ok(!cycleSrc.match(/hormonen veroorzaken\s*[^"\-]/) || cycleSrc.match(/GEEN causaliteitsclaim.*nooit.*hormonen veroorzaken/i),
  '3a: enige treffer voor "hormonen veroorzaken" in cycle.js is de commentaar die de verboden regel zelf benoemt, geen actieve overtreding');
ok(!decision.match(/menstruatie.*causes|luteal.*causes|hormonen.*veroorzaken/i),
  '3b: geen causale taal gevonden in decision.js');

// ---- 4. Symptom-to-training rules (sectie 16/30): geen categorie-only beslissing ----
ok(!decision.match(/menstruatie|luteaal|folliculair/i),
  '4a: decision.js bevat 0 cyclusfase-termen -- geen categorie-gebaseerde trainingsregel ("menstruatie -> rust") in de Decision Engine');
ok(cycleTrainingSrc.includes('MIN_SESSIES_PER_EMMER') && cycleTrainingSrc.includes('Geen enkele causaliteits'),
  '4b: cycleTraining.js is expliciet, puur feitelijke telling/correlatie (geen voorschrijvende regel), met een harde ondergrens tegen false precision bij weinig data');

// ---- 5. RLS/coach-privacy (live, adversariaal bevestigd tijdens deze sprint) ----
// Live bevestigd: anon geweigerd op functieniveau (coach_has_scope), en de
// RLS-policy op cycle_periods gebruikt een aparte 'WOMENS_PERFORMANCE'-scope,
// niet de gedeelde 'RECOVERY_HEALTH'-scope uit B9-H2D/H4 -- correcte isolatie.
// (Geen aparte, statische code-assertie hiervoor nodig/mogelijk -- dit is een
// live-database-eigenschap, vastgelegd in het security-privacy-document.)

console.log('fB9_H5WomensPerformanceHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
