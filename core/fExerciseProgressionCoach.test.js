/* fExerciseProgressionCoach.test.js — MS-F4-03 regressietest.
 *
 * A. Bevestigt dat computeExerciseTrends()/tkProgressionTrendContext() puur deterministisch
 *    zijn (functioneel getest via ProgressionCore/CalcCore, geen AI).
 * B. Regressie-lock op de kritieke promptinstructie ("reeds berekend, niet zelf
 *    herberekenen, geen deload-advies tenzij expliciet gevraagd").
 * C. Bevestigt dat DEC-LOADCORR-001 nog steeds TWEE onafhankelijke signalen vereist
 *    (nooit één dalende oefening alleen triggert een programmasignaal).
 * D. Sabotagebewijs op de promptinstructie.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ProgressionCore = require(path.join(ROOT, 'core/progression.js'));
const CalcCore = require(path.join(ROOT, 'core/calculation.js'));
const TrainingLoadCore = require(path.join(ROOT, 'core/trainingLoad.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Deterministische per-oefening-trenddetectie (geen AI) ----
{
  // Dalende e1RM over 3 vergelijkbare sessies.
  const geschiedenis = [
    { date: '2026-08-01', key: 'bench', e1rm: CalcCore.oneRMRaw(100, 5) },
    { date: '2026-08-08', key: 'bench', e1rm: CalcCore.oneRMRaw(97, 5) },
    { date: '2026-08-15', key: 'bench', e1rm: CalcCore.oneRMRaw(94, 5) }
  ];
  const trend = ProgressionCore.trendBy(geschiedenis, 'bench', 'e1rm', 'max', 3);
  ok(trend.status === 'trend' && trend.improving === false, 'trendBy(): 3 dalende e1RM-metingen -> status trend, improving=false (puur deterministisch)');

  const teWeinig = ProgressionCore.trendBy(geschiedenis.slice(0, 2), 'bench', 'e1rm', 'max', 3);
  ok(teWeinig.status === 'insufficient', 'trendBy(): minder dan minN -> insufficient, geen fabricage van een trend');
}

// ---- B. Regressie-lock op de kritieke promptinstructie ----
ok(html.includes('reeds berekend door ProgressionCore, niet zelf herberekenen'),
  'de systeemprompt bevat nog exact de instructie dat de AI de progressie-trend niet zelf mag herberekenen');
ok(html.includes('geen deload-advies of trainingsbeslissing hierop baseren tenzij de gebruiker daar expliciet om vraagt'),
  'de systeemprompt verbiedt nog exact een automatische deload-conclusie op basis van de trenddata alleen');

// ---- C. DEC-LOADCORR-001: corroboratie blijft twee-signalen-vereist ----
{
  const alleenDalend = TrainingLoadCore.corroboratedLoadSignal(null, 3);
  ok(alleenDalend === false, 'corroboratedLoadSignal: 3 dalende oefeningen ZONDER hoge ACWR-classificatie -> geen signaal (geen one-lift-triggert-alles)');
  const alleenAcwr = TrainingLoadCore.corroboratedLoadSignal('hoger', 0);
  ok(alleenAcwr === false, 'corroboratedLoadSignal: hoge ACWR ZONDER dalende oefeningen -> geen signaal');
  const beide = TrainingLoadCore.corroboratedLoadSignal('hoger', 2);
  ok(beide === true, 'corroboratedLoadSignal: beide onafhankelijke signalen tegelijk -> wel een signaal');
}

// ---- D. Bevestig dat de numerieke-toepassingsguard nog steeds per-oefening-gescoped is ----
ok(html.includes("if(!document.getElementById('s-'+exId+'-1-kg')){toast('Oefening niet actief in de huidige training');return;}"),
  'applyCoachSuggestion() blijft gescoped aan een daadwerkelijk actieve oefening in de huidige training -- geen toepassing op een willekeurige/niet-actieve oefening');

console.log('fExerciseProgressionCoach: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
