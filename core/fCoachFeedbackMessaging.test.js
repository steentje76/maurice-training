/* fCoachFeedbackMessaging.test.js — COACH/PT MASTER SPRINT, CPT5 + CPT6.
 * CPT5: nieuwe coach_workout_feedback-tabel (migratie_v558), athlete-
 * zichtbaar, altijd expliciet Human Coach, nooit AI Coach. CPT6: COACH_
 * ATHLETE-messaging via de bestaande RLS (geen nieuwe RPC/migratie nodig
 * voor deze context, anders dan DIRECT-threads in S5).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v558.sql'), 'utf8');

console.log('COACH/PT MASTER SPRINT — CPT5 Workout Feedback + CPT6 Messaging');

// ---- A. CPT5: geen hergebruik van Social Comments (sectie 21, onderzocht) ----
ok(migratie.includes('CREATE TABLE public.coach_workout_feedback'), 'A1: nieuwe, eigen coach_workout_feedback-tabel (geen social_comments-hergebruik)');
ok(!html.match(/coach_workout_feedback.*social_comments|social_comments.*coach_workout_feedback/), 'A2: coach-feedback en social-comments blijven volledig gescheiden datamodellen');

// ---- B. CPT5: athlete-zichtbaar (in tegenstelling tot CPT7 Coach Notes) ----
ok(migratie.includes('cwf_betrokkenen_lezen') && migratie.includes('coach_user_id = auth.uid() OR athlete_user_id = auth.uid()'),
  'B1: zowel coach als athlete kunnen feedback lezen (athlete-zichtbaar, sectie 20: "athlete ontvangt dit correct")');
ok(html.includes("sbGet('coach_workout_feedback',`&athlete_user_id=eq.${uid}"), 'B2: de athlete-UI haalt daadwerkelijk de eigen ontvangen feedback op');

// ---- C. CPT5: alleen coach met actieve relatie + juiste athlete/training-koppeling mag schrijven ----
ok(migratie.includes('coach_has_scope(auth.uid(), athlete_user_id') && migratie.includes("'TRAINING_CORE'"),
  'C1: schrijven vereist coach_has_scope TRAINING_CORE -- hergebruikt het bestaande scope-model, geen nieuw autorisatieconcept');
ok(migratie.includes('ti.user_id = athlete_user_id'), 'C2: de RLS controleert dat de gekoppelde training_instance daadwerkelijk van de opgegeven athlete is (voorkomt verkeerde koppeling)');
ok(migratie.includes('cwf_coach_beheert_eigen') && migratie.includes('cwf_coach_verwijdert_eigen'), 'C3: alleen de coach die de feedback zelf schreef kan die wijzigen/verwijderen');

// ---- D. CPT5: Human Coach vs AI Coach absoluut gescheiden ----
{
  const feedbackBlock = html.split('// COACH/PT MASTER SPRINT — CPT5 WORKOUT REVIEW')[1].split('// COACH/PT MASTER SPRINT — CPT6 MESSAGING')[0];
  ok(feedbackBlock.includes('Human Coach') && feedbackBlock.includes('👤'), 'D1: ontvangen feedback wordt expliciet gelabeld als Human Coach, niet anoniem of als AI Coach getoond');
  ok(!feedbackBlock.match(/ai_coach\b|AI_COACH\b/), 'D2: geen enkele AI-schrijftoegang-verwijzing in het feedback-codeblok');
}
ok(!migratie.match(/ai_coach|AI_COACH/i), 'D3: de migratie zelf bevat geen enkele AI-gerelateerde kolom/verwijzing');

// ---- E. CPT6: hergebruik van de bestaande Messaging Foundation, geen nieuwe RPC/migratie ----
ok(!fs.existsSync(path.join(ROOT, 'migratie_v559.sql')) || !fs.readFileSync(path.join(ROOT, 'migratie_v559.sql'), 'utf8').match(/CREATE.*message/i),
  'E1: CPT6 introduceert geen nieuwe messaging-migratie -- de bestaande RLS (mt_insert_coach_athlete/mp_insert_coach_athlete_counterpart) volstaat al');
{
  const threadFn = html.split('async function openCoachAthleteThread(relationshipId,otherUserId)')[1].split('async function renderSocialScreen')[0];
  ok(threadFn.includes("thread_type:'COACH_ATHLETE'") && threadFn.includes('context_relationship_id:relationshipId'),
    'E2: een nieuwe thread wordt met het juiste thread_type en de juiste relationship-koppeling aangemaakt');
  ok(threadFn.includes("thread_type=eq.COACH_ATHLETE&context_relationship_id=eq.") , 'E3: idempotency -- een bestaande COACH_ATHLETE-thread voor dezelfde relatie wordt hergebruikt, nooit gedupliceerd');
  ok(threadFn.includes('openMessageThread(') , 'E4: hergebruikt het bestaande openMessageThread()/renderMessageThreadScreen() uit S5 -- geen tweede chat-UI');
}

// ---- F. CPT6: bereikbaar vanuit zowel coach- als athlete-kant ----
ok((html.match(/onclick="openCoachAthleteThread\(/g) || []).length >= 2, 'F1: "Bericht sturen" is zowel bij "Mijn coach(es)" als bij "Mijn sporters" bereikbaar');

console.log('\n========================================================');
console.log('fCoachFeedbackMessaging.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
