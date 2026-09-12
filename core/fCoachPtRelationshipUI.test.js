/* fCoachPtRelationshipUI.test.js — COACH/PT MASTER SPRINT, CPT2/CPT3.
 * Bewaakt: hergebruik van CoachAccessCore/CoachRosterCore (geen nieuw
 * relatiemodel/tweede autorisatie-engine), correcte RLS-conforme mutaties
 * (activeren/scope-wijzigen alleen als UPDATE, nooit een client-side INSERT
 * op coach_access_scopes -- die RLS-policy bestaat niet), Human Coach
 * blijft in een eigen scherm gescheiden van de AI Coach (s-coach), en de
 * athlete-overview toont uitsluitend toegestane secties (privacy-by-omissie,
 * geen "vergrendeld"-kaart die verraadt wat er zou kunnen staan).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

console.log('COACH/PT MASTER SPRINT — CPT2/CPT3 Relationship + Roster UI');

// ---- A. Hergebruik bestaande core-modules, geen nieuw model ----
ok(html.includes('<script src="core/coachAccess.js"></script>') && html.includes('<script src="core/coachRoster.js"></script>'),
  'A1: coachAccess.js/coachRoster.js worden nu daadwerkelijk geladen in de browser (voorheen 0 verwijzingen)');
ok(html.includes('id="s-coachpt"') && html.includes('id="s-coachpt-athlete"'), 'A2: eigen, bereikbare schermen bestaan');
ok(!html.match(/CoachRelationshipCore|SecondCoachModel|coach_relationships_v2/), 'A3: geen tweede, parallel coach-relatiemodel geintroduceerd');

// ---- B. Human Coach staat visueel/navigatie-technisch los van AI Coach (sectie 2) ----
ok(html.indexOf('id="s-coachpt"') !== html.indexOf('id="s-coach"'), 'B1: s-coachpt (Human Coach) is een ander scherm dan s-coach (AI Coach)');
{
  const shell = html.split('<!-- ═══ COACH/PT MASTER SPRINT CPT2/CPT3')[1].split('<!-- ═══ B9-09')[0];
  ok(shell.includes('Menselijke coach') && shell.includes('niet de AI Coach'), 'B2: het scherm zelf benoemt expliciet dat dit de menselijke coach is, niet AI Coach');
}

// ---- C. RLS-conforme mutaties: alleen UPDATE, nooit een client-side INSERT op scopes ----
ok(!html.match(/rest\/v1\/coach_access_scopes[^`]*method:['"]POST['"]/) && !html.match(/sbPostQ\('coach_access_scopes'/),
  'C1: nergens wordt geprobeerd een NIEUWE coach_access_scopes-rij te INSERTen vanuit de client -- die RLS-policy bestaat niet (alleen UPDATE/SELECT), de activatie-trigger maakt de rijen server-side aan');
{
  const toggleFn = html.split('async function coachPtToggleScope(relationshipId,scope,enabled)')[1].split('// Athlete-overzicht')[0];
  ok(toggleFn.includes("await sbPatchQ('coach_access_scopes'"), 'C2: scope-wijziging gaat via sbPatchQ (UPDATE), niet via een POST');
}
{
  const activateFn = html.split('async function coachPtActivate(relationshipId)')[1].split('async function coachPtRevoke')[0];
  ok(activateFn.includes("await sbPatchQ('coach_athlete_relationships'"), 'C3: activeren is een UPDATE naar status=active (RLS: car_athlete_grants_consent), geen aparte RPC die de athlete-only-consent-eis zou kunnen omzeilen');
}
{
  const requestFn = html.split('async function coachPtRequest(targetUserId,requestType)')[1].split('async function coachPtActivate')[0];
  ok(requestFn.includes("status:'pending',requested_by:uid") && (requestFn.match(/requested_by:uid/g) || []).length === 2,
    'C4: elk relatieverzoek wordt met status=pending en requested_by=uid aangemaakt (spiegelt car_insert_pending_only exact, geen client die zichzelf meteen active kan maken)');
}

// ---- D. Zelf-elevatie onmogelijk: coach kan nooit zelf activeren (client-side spiegel) ----
{
  const renderFn = html.split('async function renderCoachPtScreen()')[1].split('async function coachPtSearch()')[0];
  ok(renderFn.includes('CoachAccessCore.canActivateRelationship(uid,r)'), 'D1: de "Accepteren"-knop wordt uitsluitend getoond als CoachAccessCore.canActivateRelationship() dat toestaat (alleen de athlete)');
}

// ---- E. Privacy-by-omissie in het athlete-overzicht (geen "vergrendeld"-hint) ----
{
  const openFn = html.split('async function renderCoachPtAthlete()')[1].split('async function renderSocialScreen')[0];
  ok(openFn.includes('CoachRosterCore.athleteOverviewSections('), 'E1: welke secties getoond worden komt uitsluitend uit CoachRosterCore.athleteOverviewSections(), geen eigen, losse zichtbaarheidslogica');
  ok(!openFn.match(/vergrendeld|locked|upgrade om te zien|niet gedeeld door/i), 'E2: geen "vergrendeld/locked"-kaart voor een niet-toegestane sectie -- die sectie ontbreekt gewoon volledig (privacy-by-omissie, geen hint van wat er zou kunnen staan)');
}

// ---- F. Cross-domain privacy: geen gevoelige data-dump zonder scope ----
{
  const openFn = html.split('async function renderCoachPtAthlete()')[1].split('async function renderSocialScreen')[0];
  ok(openFn.includes("sbGet('hrv_log'") && openFn.match(/secties\.includes\('RECOVERY_HEALTH'\)[\s\S]{0,50}hrv_log/),
    'F1: hrv_log wordt uitsluitend opgehaald binnen de RECOVERY_HEALTH-sectie-check, niet onvoorwaardelijk');
  ok(!openFn.match(/cycle_periods|cycle_symptom_logs|menstru/i), 'F2: geen rechtstreekse cyclus-/menstruatiedata-query -- Women\'s Performance-sectie toont bewust alleen een neutrale, niet-detaillerende samenvatting');
}

console.log('\n========================================================');
console.log('fCoachPtRelationshipUI.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
