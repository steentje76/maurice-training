/* fCoachPrivateNotes.test.js — COACH/PT MASTER SPRINT, CPT7 Coach Notes.
 * Bewaakt: notities zijn nooit athlete-zichtbaar (geen SELECT-policy voor
 * athlete), nooit AI Coach-toegankelijk, nooit Social content, geen
 * OR-combinatie-lek tussen de FOR ALL-policy en een losse INSERT-policy,
 * en dat de UI dit uitsluitend op het coach-eigen scherm rendert.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v559.sql'), 'utf8');

console.log('COACH/PT MASTER SPRINT — CPT7 Coach Notes (privé)');

// ---- A. Nooit athlete-zichtbaar (kern van CPT7, sectie 24) ----
{
  // Alleen code buiten SQL-commentaarregels (-- ...) telt als echte logica.
  const codeOnly = migratie.split('\n').map(l => l.replace(/--.*/, '')).join('\n');
  ok(!codeOnly.match(/athlete_user_id\s*=\s*auth\.uid\(\)/), 'A1: geen enkele policy-CODE (buiten commentaar) verwijst naar athlete_user_id=auth.uid() -- de athlete heeft server-side geen enkel toegangspad tot deze tabel');
}
ok(!html.match(/coach_private_notes[\s\S]{0,200}athleteId===uid|athlete.*coach_private_notes/i), 'A2: geen client-side pad waarin de athlete zelf coach_private_notes zou kunnen lezen');

// ---- B. Slechts één FOR ALL-policy (geen OR-combinatie-lek, sectie 29-les) ----
{
  const policyCount = (migratie.match(/CREATE POLICY/g) || []).length;
  ok(policyCount === 1, 'B1: exact 1 policy (FOR ALL) -- een losse tweede INSERT-policy zou door Postgres se OR-combinatie van permissieve policies de relatie-eis ongemerkt hebben uitgeschakeld');
  ok(migratie.includes('FOR ALL') && migratie.includes("r.status = 'active'"), 'B2: dezelfde policy dekt zowel lezen/verwijderen (USING) als aanmaken/wijzigen met een actieve-relatie-eis (WITH CHECK)');
}

// ---- C. Nooit AI Coach, nooit Social content (sectie 25) ----
{
  const codeOnly = migratie.split('\n').map(l => l.replace(/--.*/, '')).join('\n').replace(/COMMENT ON FUNCTION[\s\S]*?;|COMMENT ON TABLE[\s\S]*?;/g, '');
  ok(!codeOnly.match(/ai_coach|social_/i), 'C1: de migratie-CODE (buiten commentaar/COMMENT ON) verwijst nergens naar een AI-Coach- of social_*-tabel/kolom');
}
{
  const notesBlock = html.split('// COACH/PT MASTER SPRINT — CPT7 COACH NOTES')[1].split('async function renderSocialScreen')[0];
  ok(!notesBlock.match(/ai_coach|AI_COACH|social_shared_activities|social_comments/i), 'C2: het volledige CPT7-codeblok bevat geen AI-Coach- of Social-verwijzing');
  ok(notesBlock.includes('Nooit zichtbaar voor de sporter') && notesBlock.includes('nooit gebruikt door de AI Coach'),
    'C3: de UI communiceert expliciet aan de coach dat dit privé is en buiten AI Coach om blijft');
}

// ---- D. CRUD compleet (create/read/update/delete) ----
ok(html.includes('async function coachAddPrivateNote') && html.includes('async function coachEditPrivateNote') &&
   html.includes('async function coachDeletePrivateNote') && html.includes('async function renderCoachPrivateNotesSection'),
  'D1: alle vier CRUD-operaties zijn geimplementeerd (sectie 24: create/read/update/delete)');

// ---- E. Bereikbaar uitsluitend op het coach-eigen athlete-detailscherm ----
ok(html.includes('renderCoachPrivateNotesSection(athleteId)') && html.includes('id="coachpt-notes-card"'),
  'E1: de notities-kaart is daadwerkelijk aangesloten op coachPtOpenAthlete (het coach-eigen scherm), niet een losstaand, nergens-aangeroepen codeblok');

console.log('\n========================================================');
console.log('fCoachPrivateNotes.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
