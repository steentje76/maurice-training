/* fCoachProgrammingUI.test.js — COACH/PT MASTER SPRINT, CPT4 Programming/Assignment.
 * Bewaakt: hergebruik van de bestaande, adversarial bewezen MS-F10-03-
 * architectuur (coach_program_templates -> coach_program_assignments ->
 * materialize_coach_assignment), geen tweede execution/planning-engine, de
 * coach kan nooit zelf materialiseren (client roept uitsluitend de athlete-
 * variant aan), exercise-selectie komt uitsluitend uit de bestaande
 * EX_CATALOG, en geen enkele gezondheids-/Women's Performance-verwijzing in
 * de nieuwe programming-code.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

console.log('COACH/PT MASTER SPRINT — CPT4 Programming/Assignment UI');

// ---- A. Backend -> product capability: nu daadwerkelijk bereikbaar ----
ok(html.includes("sbGet('coach_program_templates'") && html.includes("sbGet('coach_program_assignments'"),
  'A1: de UI leest daadwerkelijk uit coach_program_templates/coach_program_assignments (voorheen 0 verwijzingen)');
ok(html.includes('id="coachpt-programming-card"') && html.includes('id="coachpt-assignments-list"'),
  'A2: zowel de coach-kant (toewijzen) als de athlete-kant (accepteren) hebben een bereikbaar scherm-onderdeel');

// ---- B. Geen tweede execution/planning-engine (sectie 17/18 van de opdracht) ----
ok(!html.match(/function coachExecuteAssignment|CoachExecutionCore|CoachPlanningEngine/),
  'B1: geen aparte "coach workout execution engine" of planning-engine geintroduceerd');
{
  const materializeFn = html.split('async function athleteMaterializeAssignment(assignmentId)')[1].split('async function renderSocialScreen')[0];
  ok(materializeFn.includes("sbRpc('materialize_coach_assignment'"), 'B2: materialiseren gaat uitsluitend via de bestaande, canonieke materialize_coach_assignment-RPC');
}

// ---- C. Coach kan nooit zelf materialiseren (server-side afgedwongen, hier client-side bevestigd geen bypass-knop) ----
ok(!html.match(/coachMaterializeAssignment|coach.*materialize_coach_assignment/i),
  'C1: er bestaat geen client-side pad waarmee de COACH (i.p.v. de athlete) materialize_coach_assignment aanroept');
{
  const assignFn = html.split('async function coachAssignProgramTemplate(templateId,athleteId)')[1].split('// Athlete-zijde')[0];
  ok(assignFn.includes("status:'pending'"), 'C2: een nieuwe toewijzing start altijd als pending -- nooit direct als geaccepteerd/gematerialiseerd vanuit de coach-kant');
}

// ---- D. Exercise-selectie komt uitsluitend uit de bestaande Exercise Library ----
{
  const builderFn = html.split('function renderCoachProgramBuilder()')[1].split('async function coachSaveProgramTemplate()')[0];
  ok(builderFn.includes('EX_CATALOG.catalog') && builderFn.includes('o.catalog_id'),
    'D1: de oefeningkeuze in de programma-builder komt uitsluitend uit de bestaande EX_CATALOG (dezelfde exercise_id-ruimte die materialize_coach_assignment server-side valideert), geen nieuwe/losse oefeningenlijst');
}

// ---- E. Client-side validatie vóór opslaan (server-side blijft de daadwerkelijke afdwinging) ----
{
  const saveFn = html.split('async function coachSaveProgramTemplate()')[1].split('async function coachAssignProgramTemplate')[0];
  ok(saveFn.includes('heeftOngeldigeOefening') && saveFn.includes('!e.exercise_id'),
    'E1: een lege oefeningkeuze wordt client-side geweigerd vóór verzenden (vriendelijke fout; server-side exercise_id-validatie in materialize_coach_assignment blijft de echte grens)');
  ok(saveFn.includes('schema_version:1'), 'E2: de content-payload gebruikt exact het schema_version dat materialize_coach_assignment verwacht');
}

// ---- F. Geen gezondheids-/Women\'s Performance-lek in de nieuwe programming-code ----
{
  const programmingBlock = html.split('// COACH/PT MASTER SPRINT — CPT4 PROGRAMMING / ASSIGNMENT')[1].split('async function renderSocialScreen')[0];
  ok(!programmingBlock.match(/hrv|rhr|womens_performance|cyclus|nutrition/i),
    'F1: het volledige CPT4-codeblok (templates/assignments/builder/materialize) bevat geen enkele HRV/RHR/Women\'s Performance/nutrition-verwijzing');
}

// ---- G. Human Coach blijft duidelijk (geen AI-Coach-verwarring in de nieuwe UI) ----
{
  const programmingBlock = html.split('// COACH/PT MASTER SPRINT — CPT4 PROGRAMMING / ASSIGNMENT')[1].split('async function renderSocialScreen')[0];
  ok(!programmingBlock.match(/AI[\s_-]?Coach|ai_coach/i), 'G1: de programming/assignment-UI claimt nergens AI Coach-betrokkenheid -- dit is uitsluitend Human Coach-workflow');
}

console.log('\n========================================================');
console.log('fCoachProgrammingUI.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
