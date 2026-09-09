/* fSwimmingFoundation.test.js — ENDURANCE MASTER SPRINT, E4 Swimming Foundation.
 * Bewaakt: hergebruik van EnduranceExecutionCore (geen derde execution
 * engine), de canonieke activities/activity_laps-tabellen (geen nieuwe
 * swim-tabel), pool/open-water-context (sectie 10), swim-pace per 100m via
 * de bestaande CardioCore.splitFromDistTime() (geen nieuwe berekening),
 * user-specifieke localStorage (B9-02C-les), sport-specifieke afstandsbanden
 * (SwimmingIntelligenceCore), geen dubbeltelling met race_segments/Triathlon,
 * en dat CSS/swolf/AI-score bewust niet gebouwd zijn.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swimmingIntel = fs.readFileSync(path.join(ROOT, 'core/swimmingIntelligence.js'), 'utf8');

console.log('ENDURANCE MASTER SPRINT — E4 Swimming Foundation');

// ---- A. Architectuur: gedeelde execution engine, geen derde state machine ----
ok(html.includes('EnduranceExecutionCore.createSession(nu)') && html.includes('_swimmingExecState'),
  'A1: Swimming gebruikt rechtstreeks EnduranceExecutionCore, geen eigen, derde state machine');
ok(!html.match(/SwimmingExecutionCore|swimExecution\.js/),
  'A2: geen apart swimmingExecution.js/SwimmingExecutionCore geintroduceerd (generalisatie uit B9-04 blijft van kracht)');
ok(html.includes('id="s-swimming"') && html.includes('id="s-swimming-insights"'),
  'A3: Zwemmen is een eigen, first-class scherm (geen samenvoeging met Hardlopen/Fietsen)');

// ---- B. Canonical activity model: geen nieuwe tabel, sport='swimming' hergebruikt B9-01 ----
ok(html.includes("sport:'swimming'"), "B1: standalone zwemactiviteiten worden weggeschreven naar de bestaande activities-tabel (sport='swimming')");
ok(!html.match(/CREATE TABLE.*swim|swim_activities|swimming_sessions/i),
  'B2: geen nieuwe swim-specifieke activity-tabel (activities/activity_laps worden hergebruikt, zoals B9-01 al toestond)');
ok(html.includes("sbPostQ('activity_laps'") && html.match(/swimmingLap|swimming.*addLap/),
  'B3: lengths/intervals worden weggeschreven naar de bestaande activity_laps-tabel, geen nieuw LENGTH/LAP/INTERVAL-onderscheid');

// ---- C. Pool/open-water-context: expliciete UNKNOWN, geen aanname ----
ok(html.includes("_swimmingGekozenContext=null") && html.includes("selecteerSwimmingContext"),
  'C1: context start als UNKNOWN (null) en vereist een expliciete keuze van de gebruiker, geen default');
{
  const confirmFinishFn = html.split('async function swimmingConfirmFinish()')[1].split('// Swim Detail')[0];
  ok(confirmFinishFn.includes("context==='pool'||context==='open_water'?context:null"),
    "C2: swim_context wordt alleen als 'pool'/'open_water' weggeschreven -- elke andere/lege waarde blijft expliciet null (UNKNOWN), nooit geraden");
}

// ---- D. Swim pace: hergebruik van CardioCore, geen nieuwe formule ----
{
  const detailFn = html.split('async function renderSwimDetail(activityId)')[1].split('async function renderSwimmingHistory')[0];
  ok(detailFn.includes('CardioCore.splitFromDistTime(act.distance_meters,act.duration_seconds,100)') && detailFn.includes("/100m"),
    'D1: swim-pace is CardioCore.splitFromDistTime() met 100m als eenheid (bestaande, generieke functie/parameter) -- geen nieuwe distance/duration-formule');
  ok(!detailFn.match(/distance_meters\s*\/\s*100\)\s*\/\s*duration_seconds|duration_seconds\s*\/\s*\(.*distance_meters\s*\/\s*100\)/),
    'D2: geen lokale, losstaande zwem-pace-berekening naast CardioCore');
}

// ---- E. Bewust NIET gebouwd (E4-opdracht sectie 13/18): CSS/swolf/AI-score ----
ok(!html.match(/function\s+\w*[Cc]riticalSwimSpeed|function\s+\w*[Ss]wolf|\bswolf\s*=/) && !swimmingIntel.match(/function\s+\w*swolf|function\s+\w*criticalSwimSpeed/i),
  'E1: geen CSS (Critical Swim Speed) of swolf-berekening geimplementeerd -- niet bewezen noodzakelijk voor Triathlon >=9 (een verklarende commentaarregel die het woord noemt telt niet als implementatie)');
ok(!html.match(/swim.*ai.*score|AI-zwemscore|swimmingAiScore/i),
  'E2: geen nieuwe "AI-zwemscore" -- Calculation/Decision Engine blijft de bron van waarheid, AI berekent niets zelf');
ok(!swimmingIntel.match(/function\s+weeklyVolume|function\s+consistency\s*\(/) && html.includes('RunningIntelligenceCore.weeklyVolume(activities)'),
  'E3: renderSwimmingInsights roept de gedeelde, sport-neutrale weeklyVolume()/consistency() aan -- swimmingIntelligence.js zelf definieert geen eigen duplicaat van die functies');

// ---- F. Sport-specifieke afstandsband (het enige echt nieuwe stuk logica) ----
ok(swimmingIntel.includes('function distanceBandKey'), 'F1: SwimmingIntelligenceCore heeft een eigen, schaal-passende afstandsband (zwem-afstanden zijn 5-25x kleiner dan hardloopafstanden)');
ok(!swimmingIntel.match(/running_lt5km|cycling_lt20km/), 'F2: geen hergebruik van Running/Cycling se afstandsbanden (zou misleidende labels geven op zwemschaal)');

// ---- G. Provenance/data-quality: zelfde vocabulaire, geen nieuwe taxonomie ----
{
  const confirmFinishFn = html.split('async function swimmingConfirmFinish()')[1].split('// Swim Detail')[0];
  ok(confirmFinishFn.includes("source_provenance:'manual',data_quality:'unverified'"),
    'G1: standalone zwemactiviteiten gebruiken exact dezelfde provenance/data_quality-vocabulaire als Running/Cycling (geen nieuwe taxonomie)');
}

// ---- H. Idempotency/failure-atomicity: zelfde bewezen strategie als Running/Cycling ----
{
  const confirmFinishFn = html.split('async function swimmingConfirmFinish()')[1].split('// Swim Detail')[0];
  ok(confirmFinishFn.includes("dedupeKey='manual-exec-'+_swimmingExecState.startedAt+'-'+uid") && confirmFinishFn.includes("ignore-duplicates"),
    'H1: dedupe_key + ignore-duplicates voorkomt een dubbele activity bij een netwerkretry (exact dezelfde strategie als Running/Cycling)');
  ok(confirmFinishFn.includes('alleLapsGelukt'),
    'H2: individuele lap-controle (failure atomicity) -- een gedeeltelijk gefaalde lap-opslag wordt nooit stil als volledig succes gepresenteerd');
}

// ---- I. User-specifieke localStorage (B9-02C-les direct toegepast) ----
ok(html.includes("function swimmingExecLocalStorageKey(){\n  const uid=authSession?.user?.id;\n  return uid?('tk_swimming_execution_v1_'+uid):null;"),
  'I1: de execution-localStorage-key is user-specifiek (voorkomt dat een andere gebruiker op hetzelfde toestel een onafgeronde zwemtraining kan overnemen)');
ok(html.includes('data.state.ownerUserId!==huidigeUid'),
  'I2: expliciete ownerUserId-verificatie bij herstel (dubbele verdediging, zelfde patroon als Running/Cycling)');

// ---- J. Geen dubbeltelling met race_segments/Triathlon (sectie 19/21 van de opdracht) ----
{
  // Hergebruikt dezelfde regex-precisie-les als de C1-fix in fB9_06MultisportIntegration.test.js:
  // p_sport-parameters (RPC-conventie) mogen niet meetellen als een activities-schrijfactie.
  const activitiesSchrijfActies = (html.match(/(?<![A-Za-z0-9_])sport:'running'|(?<![A-Za-z0-9_])sport:'cycling'|(?<![A-Za-z0-9_])sport:'swimming'/g) || []).length;
  ok(activitiesSchrijfActies === 4,
    'J1: exact 4 schrijfacties naar activities bestaan (running x2, cycling x1, swimming x1) -- geen extra, onverwacht schrijfpad vanuit HYROX/Triathlon/Brick-code dat standalone swim-activities zou dubbeltellen');
}
ok(!html.match(/race_segments['"]?\s*,\s*\{[^}]*sport:'swimming'/),
  'J2: swimmingConfirmFinish schrijft nooit naar race_segments (dat blijft exclusief het domein van HYROX/Triathlon/Brick, geen tweede source of truth voor dezelfde fysieke inspanning)');

console.log('\n========================================================');
console.log('fSwimmingFoundation.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
