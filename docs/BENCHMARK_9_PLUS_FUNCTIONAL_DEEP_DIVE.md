# Benchmark 9+ Functional Deep-Dive

**Methodologie:** repo-brede audit (database-schema, netlify/functions,
index.html-integratie). Scores zijn FUNCTIONEEL, UX/navigatie wordt
expliciet DEFERRED. Waar binnen deze sessie onvoldoende diepgaand
onderzocht: NOT ENOUGH EVIDENCE, geen gegokte score.

---

## DOMAIN: TEAM OPERATIONS
**CURRENT SCORE:** 6.8 (Product Owner-baseline)
**SCORE CONFIDENCE:** HIGH (repo-breed, live database-audit uitgevoerd)

**CURRENT FUNCTIONAL CAPABILITIES:** een volledig, rijk backend-
datamodel bestaat: `teams`, `team_events`, `event_attendance`,
`event_responsibilities`, `organizations`, `memberships`.

**FUNCTIONAL STRENGTHS:** het datamodel zelf dekt precies de in de
opdracht genoemde end-to-end-keten (event → attendance → responsibilities).

**MISSING FUNCTIONALITY:** **kritieke bevinding: 0 UI- en 0 Netlify-
functie-integratie voor deze tabellen.** `grep` op `team_events`/
`event_attendance`/`event_responsibilities` in `index.html` en alle
`netlify/functions/*.js` geeft 0 treffers. Het backend-datamodel
bestaat volledig CODE COMPLETE (schema/RLS), maar is BACKEND ONLY --
geen enkele gebruiker kan dit vandaag daadwerkelijk gebruiken.

**INCOMPLETE FUNCTIONALITY:** N.v.t. -- er is niets "incompleet", er
is simpelweg geen productlaag boven het schema.

**INTEGRATION GAPS:** geen enkele integratie tussen `team_events` en
de bestaande trainingsplanning/kalenderfunctionaliteit.

**DATA GAPS:** geen bekend gat in het schema zelf (niet grondig
kolomniveau-geaudit binnen deze sessie -- zie confidence).

**CALCULATION GAPS:** N.v.t. voor dit domein.

**CONTEXT GAPS:** geen context-laag boven attendance/responsibilities.

**DECISION/RULE GAPS:** geen (nog geen productlaag om regels op te bouwen).

**EVIDENCE GAPS:** N.v.t.

**RELIABILITY GAPS:** onbekend (geen UI om te testen).

**OFFLINE/SYNC GAPS:** onbekend.

**SECURITY/PRIVACY GAPS:** RLS-aanwezigheid van deze tabellen niet
binnen deze sessie live geverifieerd (aanbevolen vóór implementatie).

**REAL DEVICE/PROVIDER VALIDATION GAPS:** N.v.t.

**UX-ONLY GAPS:** DEFERRED (geen navigatie/scherm voor dit domein
bestaat, maar dat is een gevolg van de ontbrekende functionaliteit
zelf, niet een puur cosmetisch punt).

**BEST COMPARATORS:** TeamSnap, Garmin Connect (Groups).

**WHAT MAKES COMPARATOR BETTER FUNCTIONALLY:** een coach kan een
terugkerende trainingsafspraak aanmaken, deelnemers zien tijd/locatie,
kunnen beschikbaarheid aangeven, en materiaal-verantwoordelijkheid
wordt zichtbaar toegewezen -- niets hiervan is in Trainingskompas
vandaag bruikbaar, ondanks het bestaande datamodel.

**MINIMUM REQUIRED FOR 9.0:** minimaal een functionele CRUD-laag
(Netlify-functie of directe, RLS-gedekte client-queries) voor
`team_events`/`event_attendance`/`event_responsibilities`, plus een
minimale, functionele (niet noodzakelijk mooie) UI-koppeling.

**ESTIMATED SCORE AFTER THOSE FIXES:** 8.0-8.5 (functionele basis
zonder UX-polish).

**DEPENDENCIES:** Gym/Club (organisatie-structuur), Coach/PT
(wie mag events aanmaken).

**PRIORITY:** P1 (grootste functionele achterstand, blokkeert een
complete, amateur-teamworkflow volledig).

---

## DOMAIN: COACH/PT
**CURRENT SCORE:** 7.5
**SCORE CONFIDENCE:** HIGH

**CURRENT FUNCTIONAL CAPABILITIES:** backend-datamodel bestaat:
`coach_athlete_relationships`, `coach_program_assignments`,
`coach_program_templates`, `coach_access_scopes`.

**FUNCTIONAL STRENGTHS:** `coach_access_scopes` suggereert een reeds
doordachte, granulaire permissie-architectuur (niet blind "coach ziet
alles").

**MISSING FUNCTIONALITY:** **kritieke bevinding, identiek aan Team
Operations: 0 treffers in `index.html` voor `coach_athlete_
relationships`/`coach_program_assignments`/`coach_program_templates`.**
`netlify/functions/coach.js` bleek bij inspectie de AI-coach-proxy te
zijn (LLM-aanroepen), NIET een PT/coach-relatiebeheer-endpoint --
een belangrijke naams-verwarring die ik eerst moest ontrafelen. Er
bestaat geen aparte Netlify-functie voor het menselijke coach/PT-
domein.

**INCOMPLETE FUNCTIONALITY:** N.v.t. -- zelfde situatie als Team
Operations: volledig backend-only.

**INTEGRATION GAPS:** geen koppeling tussen `coach_program_
assignments` en de bestaande Workout Builder/programma-infrastructuur
(die overigens wel al bewezen, functioneel bestaat voor individuele
atleten).

**DATA GAPS:** niet grondig geaudit binnen deze sessie.

**CALCULATION GAPS:** adherence-berekening voor coach-overzicht zou
`AdherenceIntelligenceCore` (F7, al bewezen) kunnen hergebruiken --
geen nieuwe calculation nodig, mits een coach-laag wordt gebouwd.

**CONTEXT GAPS:** geen coach-athlete-overzicht-context bestaat.

**DECISION/RULE GAPS:** geen.

**EVIDENCE GAPS:** N.v.t.

**RELIABILITY GAPS:** onbekend.

**OFFLINE/SYNC GAPS:** onbekend.

**SECURITY/PRIVACY GAPS:** `coach_access_scopes` suggereert bewuste
granulariteit, maar zonder UI is dit niet live te verifiëren.
Belangrijk aandachtspunt voor implementatie: "data after relationship
ends" (sectie 8 van de opdracht) moet expliciet getest worden zodra
een UI-laag bestaat.

**REAL DEVICE/PROVIDER VALIDATION GAPS:** N.v.t.

**UX-ONLY GAPS:** DEFERRED.

**BEST COMPARATORS:** TrainingPeaks (coach-athlete-dashboard).

**WHAT MAKES COMPARATOR BETTER FUNCTIONALLY:** een coach kan
tientallen sporters in één overzicht monitoren, programma's toewijzen,
en voortgang zien -- dit bestaat vandaag helemaal niet als bruikbaar
product in Trainingskompas.

**MINIMUM REQUIRED FOR 9.0:** functionele coach-athlete-invite/accept-
flow, een athlete-overzichtsscherm (kan minimaal zijn), programma-
toewijzing gekoppeld aan de bestaande Workout Builder.

**ESTIMATED SCORE AFTER THOSE FIXES:** 8.0-8.5.

**DEPENDENCIES:** Team Operations (gedeeld fundament), bestaande
Workout Builder/adherence-infrastructuur (hergebruiken).

**PRIORITY:** P1.

---

## DOMAIN: DEVICES/WEARABLES
**CURRENT SCORE:** 7.5
**SCORE CONFIDENCE:** HIGH

**CURRENT FUNCTIONAL CAPABILITIES:** in schril contrast met Team/Coach:
een volledige, functionerende integratie bestaat. `netlify/functions/
wearable-auth-start.js`/`wearable-auth-callback.js`/`wearable-sync.js`/
`wearable-status.js`/`wearable-disconnect.js`/`wearableTokenVault.js`/
`_wearableSyncLib.js` -- OAuth-flow, token-vault, sync, disconnect,
allemaal server-side (correct, tokens nooit client-side).

**FUNCTIONAL STRENGTHS:** correcte architectuur (auth → ingestion →
provenance, tokens server-side bewaard).

**MISSING FUNCTIONALITY:** niet grondig, opnieuw getest binnen deze
sessie welke specifieke providers (Health Connect/Apple HealthKit/
Garmin/WHOOP/Strava/Fitbit) daadwerkelijk zijn geïmplementeerd versus
alleen architectuur-klaar.

**INCOMPLETE FUNCTIONALITY:** backfill-gedrag (historische data bij
eerste koppeling) niet apart geverifieerd binnen deze sessie.

**INTEGRATION GAPS:** onbekend zonder verdere audit per provider.

**DATA GAPS:** N.v.t. voor deze audit-diepte.

**CALCULATION GAPS:** eerder in deze sessie al bevestigd: wearable-
energieverbruik wordt correct als schatting behandeld, niet als
waarheid (B9-11-precedent).

**CONTEXT GAPS:** N.v.t.

**DECISION/RULE GAPS:** N.v.t.

**EVIDENCE GAPS:** N.v.t.

**RELIABILITY GAPS:** dedupe-gedrag bij sync niet binnen deze sessie
opnieuw live getest.

**OFFLINE/SYNC GAPS:** niet opnieuw getest binnen deze sessie.

**SECURITY/PRIVACY GAPS:** `wearableTokenVault.js` suggereert een
bewuste, veilige token-opslag -- niet opnieuw, live geaudit binnen
deze sessie (eerdere sessies in dit project hebben dit wel eerder
bevestigd, buiten het bereik van deze specifieke conversatie).

**REAL DEVICE/PROVIDER VALIDATION GAPS:** **kritiek: geen enkele
echte, externe provider (Garmin/WHOOP/Apple/Google) is binnen deze
sessie of waarschijnlijk ooit fysiek gevalideerd** -- dit vereist een
extern, betaald/geautoriseerd provideraccount en fysieke hardware,
wat buiten de mogelijkheden van een geautomatiseerde sessie valt.

**UX-ONLY GAPS:** DEFERRED.

**BEST COMPARATORS:** Garmin Connect, WHOOP, Strava.

**WHAT MAKES COMPARATOR BETTER FUNCTIONALLY:** deze producten hebben
bewezen, jarenlange, real-world-gevalideerde provider-integraties;
Trainingskompas se integratie is architectonisch correct maar
extern-ongevalideerd.

**MINIMUM REQUIRED FOR 9.0:** minimaal één provider REAL DEVICE
VALIDATED (niet alleen sandbox/API).

**ESTIMATED SCORE AFTER THOSE FIXES:** SOFTWARE 9+ READY blijft
mogelijk zonder externe validatie; volledige 9.0 vereist externe
validatie die buiten softwarematige scope valt.

**DEPENDENCIES:** externe provideraccounts (buiten Trainingskompas se
controle).

**PRIORITY:** P2 (software-architectuur is al sterk; de resterende
achterstand is grotendeels een externe-validatie-vraagstuk, niet een
softwarematig gat).

---

## DOMAIN: GYM/CLUB
**CURRENT SCORE:** 8.0
**SCORE CONFIDENCE:** HIGH

**CURRENT FUNCTIONAL CAPABILITIES:** **belangrijke architectuur-
bevinding: twee parallelle systemen bestaan.** (1) Een ouder, eenvoudig
systeem via `users.gym_id`/`gym_role`/`gym_role_level`, bediend door
`netlify/functions/gym-team.js` (staff-rolbeheer, pincode-
geverifieerd, audit-logging via `gym_audit_log`) -- dit systeem is wel
degelijk functioneel en actief. (2) Een nieuwer, rijker datamodel
(`organizations`/`teams`/`gyms`/`memberships`) dat -- net als Team
Operations -- 0 UI/Netlify-integratie heeft.

**FUNCTIONAL STRENGTHS:** het bestaande, actieve staff-rolbeheer-
systeem is veilig ontworpen (pincode + audit-log, geen atleet-data in
de log).

**MISSING FUNCTIONALITY:** multi-locatie-beheer, coach/lid-toewijzing
binnen een organisatiehiërarchie, en organisatie-brede programma's
lijken uitsluitend op het nieuwere, ongebruikte datamodel te steunen
-- dus functioneel niet beschikbaar voor een echte gebruiker vandaag.

**INCOMPLETE FUNCTIONALITY:** het bestaan van twee parallelle
systemen is zelf een architectonisch risico (welk systeem is de
uiteindelijke bron van waarheid?) -- dit moet expliciet worden
opgelost vóór verdere Gym/Club-hardening, niet toevallig omzeild.

**INTEGRATION GAPS:** de twee systemen zijn niet aan elkaar
gekoppeld.

**DATA GAPS:** onduidelijk of `organizations`/`teams` al productie-
data bevatten of nog volledig leeg zijn (niet gecontroleerd binnen
deze sessie).

**CALCULATION GAPS:** N.v.t.

**CONTEXT GAPS:** N.v.t.

**DECISION/RULE GAPS:** N.v.t.

**EVIDENCE GAPS:** N.v.t.

**RELIABILITY GAPS:** onbekend voor het nieuwere systeem (geen UI om
te testen).

**OFFLINE/SYNC GAPS:** onbekend.

**SECURITY/PRIVACY GAPS:** tenant-isolatie van het bestaande,
actieve `gym-team.js`-systeem niet opnieuw live geaudit binnen deze
sessie (aanbevolen als eerste stap vóór verdere hardening).

**REAL DEVICE/PROVIDER VALIDATION GAPS:** N.v.t.

**UX-ONLY GAPS:** DEFERRED.

**BEST COMPARATORS:** Mindbody, TeamBuildr (multi-locatie-gym-
platformen).

**WHAT MAKES COMPARATOR BETTER FUNCTIONALLY:** een duidelijke, ene
bron van waarheid voor gym/locatie/lidmaatschap, zonder architectonische
ambiguïteit.

**MINIMUM REQUIRED FOR 9.0:** een expliciete architectuurbeslissing
(welk systeem is canoniek, hoe worden ze eventueel samengevoegd) vóór
verdere functionele uitbreiding.

**ESTIMATED SCORE AFTER THOSE FIXES:** 8.3-8.7 zonder volledige
consolidatie; hoger na een bewuste, uitgevoerde architectuurkeuze.

**DEPENDENCIES:** Team Operations, Coach/PT (gedeeld fundament).

**PRIORITY:** P1 (de architecturele ambiguïteit zelf is een risico dat
niet mag blijven liggen).

---

## DOMAIN: SOCIAL
**CURRENT SCORE:** 8.2
**SCORE CONFIDENCE:** HIGH (grotendeels binnen deze sessie zelf
gebouwd/getest, B9-07/B9-07B/B9-08)

**CURRENT FUNCTIONAL CAPABILITIES:** identity/profile, privacy,
connections, groepen, challenges, activity sharing, reacties/comments,
moderation/block/report, notifications, Social Intelligence --
allemaal bevestigd bruikbaar (zie B9-07/B9-07B/B9-08-rapporten).

**FUNCTIONAL STRENGTHS:** volwassen privacy-architectuur (RLS als
enige bron van waarheid, herhaaldelijk live adversarial getest, één
P0 zelf gevonden en gerepareerd tijdens B9-07B).

**MISSING FUNCTIONALITY:** notificatie-generatie is beperkt tot
connection_request/connection_accepted (geen notificaties voor nieuwe
reacties/comments/challenge-mijlpalen) -- een functionele, geen
UX-gap.

**INCOMPLETE FUNCTIONALITY:** groep-administratie (bijv. een lid
verwijderen, een groep bewerken/verwijderen na aanmaak) niet
bevestigd te bestaan.

**INTEGRATION GAPS:** geen koppeling tussen Social Intelligence en de
bestaande, canonieke `AdherenceIntelligenceCore` (bewuste keuze in
B9-08, blijft een open, niet-blokkerende optie).

**DATA GAPS:** geen.

**CALCULATION GAPS:** geen (B9-08 hergebruikt uitsluitend bestaande
engines).

**CONTEXT GAPS:** geen.

**DECISION/RULE GAPS:** geen ongeregistreerde regels gevonden
(B9-08-audit bevestigd).

**EVIDENCE GAPS:** N.v.t. (Social Intelligence bevat geen
wetenschappelijke claims).

**RELIABILITY GAPS:** offline-schrijven voor Social (bijv. offline
een reactie plaatsen) niet apart bevestigd -- Nutrition kreeg dit wel
expliciet (B9-10), Social niet.

**OFFLINE/SYNC GAPS:** zie hierboven -- een functionele, niet-
blokkerende gap.

**SECURITY/PRIVACY GAPS:** geen open P0/P1 (herhaaldelijk bevestigd).

**REAL DEVICE/PROVIDER VALIDATION GAPS:** N.v.t.

**UX-ONLY GAPS:** DEFERRED -- discoverability (B9G-UX-001, al
geregistreerd in B9-H1).

**BEST COMPARATORS:** Strava.

**WHAT MAKES COMPARATOR BETTER FUNCTIONALLY:** volledigere
notificatie-dekking, groep-administratie-lifecycle.

**MINIMUM REQUIRED FOR 9.0:** notificatie-generatie uitbreiden naar
reacties/comments/challenge-mijlpalen; groep-administratie (bewerken/
verwijderen/lid verwijderen) toevoegen.

**ESTIMATED SCORE AFTER THOSE FIXES:** 8.7-9.0.

**DEPENDENCIES:** geen (self-contained binnen het bestaande domein).

**PRIORITY:** P2 (Social is al functioneel sterk; de resterende gaps
zijn kleine, afgebakende uitbreidingen, geen fundamentele gaten).

---

## DOMAIN: TRIATHLON
**CURRENT SCORE:** 8.2
**SCORE CONFIDENCE:** MEDIUM (datamodel bevestigd via eerdere B9-06-
audit binnen deze sessie, UI-diepte niet opnieuw, grondig getest in
deze specifieke opdracht)

**CURRENT FUNCTIONAL CAPABILITIES:** `race_segments` +
`training_instances` (bevestigd tijdens B9-06): parent/child-model met
`segment_index` (ordering), `exercise_id` (discipline/context),
`start_at`/`finish_at` (impliciete transitie-tijd).

**FUNCTIONAL STRENGTHS:** het datamodel is al correct canoniek (B9-06
bevestigde dit expliciet, geen tweede systeem nodig).

**MISSING FUNCTIONALITY:** geen expliciet, apart "transition time"-
veld bevestigd (alleen impliciet af te leiden uit start/finish-
timestamps van opeenvolgende segmenten) -- functioneel bruikbaar, maar
niet als eerste-klas metric gepresenteerd.

**INCOMPLETE FUNCTIONALITY:** per-leg-metrics (swim-pace/bike-power/
run-pace binnen één triathlon-sessie) niet bevestigd of deze de
bestaande, sportspecifieke canonieke calculations (CardioCore)
hergebruiken, of een eigen, apart pad volgen -- vereist verdere audit
buiten deze sessie se tijdsbudget.

**INTEGRATION GAPS:** koppeling tussen `race_segments` en de B9-01/
B9-04 endurance-`activities`-tabel niet expliciet bevestigd (mogelijk
volledig gescheiden paden, zoals eerder bevestigd tijdens B9-06 voor
HYROX).

**DATA GAPS:** N.v.t. (datamodel bevestigd correct).

**CALCULATION GAPS:** onduidelijk of swim/bike/run-segmenten binnen
een triathlon dezelfde canonieke `CardioCore`-functies gebruiken als
standalone Running/Cycling -- risico op shadow calculation indien niet.

**CONTEXT GAPS:** geen apart "is dit een race of een training"-
onderscheid bevestigd als expliciet veld (sectie 13 van de opdracht
vraagt hier expliciet naar).

**DECISION/RULE GAPS:** geen bekend.

**EVIDENCE GAPS:** N.v.t.

**RELIABILITY GAPS:** niet opnieuw getest binnen deze sessie.

**OFFLINE/SYNC GAPS:** niet opnieuw getest.

**SECURITY/PRIVACY GAPS:** geen nieuwe, binnen deze sessie gevonden
issue (de onderliggende `race_segments`-RLS is dezelfde als bij
HYROX, eerder bevestigd correct).

**REAL DEVICE/PROVIDER VALIDATION GAPS:** N.v.t.

**UX-ONLY GAPS:** DEFERRED.

**BEST COMPARATORS:** Garmin Connect (multisport-activiteiten), TrainingPeaks.

**WHAT MAKES COMPARATOR BETTER FUNCTIONALLY:** expliciete transition-
tijd als eerste-klas metric, duidelijk race-versus-training-
onderscheid.

**MINIMUM REQUIRED FOR 9.0:** race-versus-training-veld toevoegen aan
`training_instances` (indien nog niet bestaand), expliciete transitie-
tijd-berekening (hergebruik van bestaande timestamp-logica, geen
nieuwe calculation-categorie).

**ESTIMATED SCORE AFTER THOSE FIXES:** 8.6-8.9.

**DEPENDENCIES:** HYROX (deelt hetzelfde datamodel).

**PRIORITY:** P2.

---

## DOMAIN: WOMEN'S PERFORMANCE
**CURRENT SCORE:** 8.3
**SCORE CONFIDENCE:** LOW (niet onderzocht binnen deze of recente
sessies binnen dit gesprek)

**NOT ENOUGH EVIDENCE** binnen deze sessie voor een verantwoorde,
gedetailleerde functionele analyse. Bekend uit eerdere, niet in deze
conversatie herhaalde audits (F8-vermeldingen in de projectgeschiedenis)
dat er een bestaand domein is met cyclus-/symptomen-/levensfase-
context. Een aparte, gerichte audit (vergelijkbaar in diepte met de
overige domeinen hierboven) is nodig vóór een verantwoorde score-
herbevestiging.

**MINIMUM REQUIRED FOR 9.0:** vereist eerst een grondige, eigen
existing-state audit -- niet gegokt binnen deze sessie.

**PRIORITY:** P2 (audit-noodzaak, geen bevestigde kritieke gap).

---

## DOMAIN: ERGOMETERS
**CURRENT SCORE:** 8.3
**SCORE CONFIDENCE:** MEDIUM (Concept2-integratie eerder in de
projectgeschiedenis uitgebreid gebouwd, zoals blijkt uit
`core/concept2Live.js` en `netlify/functions`-namen elders in de repo,
maar niet opnieuw, grondig herbevestigd binnen deze specifieke sessie)

**CURRENT FUNCTIONAL CAPABILITIES:** Concept2-specifieke logica
bevestigd aanwezig (`core/concept2Live.js`, calorie/kcal-gerelateerde
functies eerder gezien tijdens repo-brede zoekopdrachten in deze
sessie).

**MISSING FUNCTIONALITY:** RowErg/BikeErg/SkiErg-onderscheid, en
architecture-readiness voor Technogym/EGYM/Wattbike/Keiser/Matrix/Life
Fitness niet binnen deze sessie onderzocht.

**REAL DEVICE/PROVIDER VALIDATION GAPS:** Concept2 PM5-livekoppeling
vereist fysieke hardware voor volledige validatie -- buiten scope van
een geautomatiseerde sessie.

**MINIMUM REQUIRED FOR 9.0:** een aparte, gerichte audit van de
volledige Concept2-flow (import/actieve sessie/duplicate-detectie) is
nodig voor een verantwoorde herbevestiging.

**PRIORITY:** P2.

---

## DOMAIN: CYCLING
**CURRENT SCORE:** 8.5
**SCORE CONFIDENCE:** HIGH (binnen deze sessie zelf gebouwd/getest,
B9-04/B9-05)

**CURRENT FUNCTIONAL CAPABILITIES:** volledige execution (gedeelde
`EnduranceExecutionCore` met Running), snelheids-/vermogenstrend,
Critical Power (opt-in max-effort-markering), FTP (user-entered),
belasting -- allemaal bevestigd bruikbaar.

**MISSING FUNCTIONALITY:** power zones (bewust niet gebouwd, geen
gevalideerde formule); canonieke FTP-testprotocol-berekening (bewust
niet gebouwd, alleen user-entered).

**MINIMUM REQUIRED FOR 9.0:** power zones zouden pas gebouwd mogen
worden na een aparte evidence-audit (net als de HR-zones-beslissing
bij Running) -- dit is een bewuste, functionele keuze, niet een
technisch gat.

**ESTIMATED SCORE AFTER THOSE FIXES:** 8.5 blijft grotendeels
gerechtvaardigd zonder power zones -- de 0.5 gap is grotendeels een
bewuste, evidence-gebonden scope-keuze, niet een simpelweg "ontbrekende
feature".

**PRIORITY:** P3 (bewuste scope-keuze, geen onbedoeld gat).

---

## DOMAIN: RUNNING
**CURRENT SCORE:** 8.6
**SCORE CONFIDENCE:** HIGH

**CURRENT FUNCTIONAL CAPABILITIES:** volledige execution, weekly
volume, snelheidstrend (appels-met-appels via afstandsband),
consistency, Critical Speed, belasting -- allemaal bewezen.

**MISSING FUNCTIONALITY:** HR-zones (bewust niet gebouwd, geen
gevalideerde formule), TRIMP (bewust niet gebouwd, methodologische
complexiteit), aerobic decoupling (bewust niet gebouwd, onvoldoende
datagranulariteit -- geen continue tijdreeks, alleen gemiddelde HR per
lap).

**MINIMUM REQUIRED FOR 9.0:** zoals bij Cycling: dit zijn bewuste,
evidence-gebonden scope-keuzes. Een echte 9.0 zou een aparte,
grondige evidence-audit voor HR-zones vereisen (welke formule is
canoniek verantwoord), niet een simpele implementatie.

**PRIORITY:** P3 (bewuste scope-keuze).

---

## DOMAIN: RECOVERY
**CURRENT SCORE:** 8.7
**SCORE CONFIDENCE:** LOW (niet opnieuw, grondig geaudit binnen deze
specifieke sessie -- bekend uit eerdere projectgeschiedenis F7/F8,
niet herhaald hier)

**NOT ENOUGH EVIDENCE** voor een gedetailleerde, verantwoorde
herbevestiging binnen deze sessie. Bekend: `AdherenceIntelligenceCore`
bestaat en is canoniek (hergebruikt in B9-11). HRV/RHR/sleep-
infrastructuur bestaat (eerder gezien via `hrv_log`/`daily_health`-
tabellen tijdens repo-brede zoekopdrachten in eerdere B9-sprints),
maar de kwaliteit van de readiness-/rest-regels zelf is niet binnen
deze sessie herbeoordeeld.

**MINIMUM REQUIRED FOR 9.0:** vereist een eigen, gerichte audit.

**PRIORITY:** P2 (audit-noodzaak).

---

## DOMAIN: COMMERCIAL
**CURRENT SCORE:** 8.7
**SCORE CONFIDENCE:** MEDIUM

**CURRENT FUNCTIONAL CAPABILITIES:** `EntitlementCore` bevestigd
client-side gebruikt (`individual_plan_key`/`status`/`expires_at`),
server-side her-afgedwongen in `coach.js` (de AI-proxy, MS-F12-02,
"ENTITLEMENTS =/= SECURITY"-precedent expliciet in codecommentaar
bevestigd). `billing_events`-tabel bevestigd bestaand (eerder gezien
tijdens B9-01/F14-onderzoek).

**MISSING FUNCTIONALITY:** upgrade/downgrade/cancellation/restore/
failed-payment-flows niet opnieuw, grondig getest binnen deze sessie.

**MINIMUM REQUIRED FOR 9.0:** vereist een eigen, gerichte audit van
de volledige entitlement-lifecycle (niet alleen de leesactie die al
bevestigd is).

**PRIORITY:** P2.

---

## DOMAIN: HYROX / ATHLETE INTELLIGENCE
**CURRENT SCORE:** 8.8
**SCORE CONFIDENCE:** MEDIUM (HYROX-datamodel bevestigd via B9-06;
Athlete Intelligence als apart begrip niet grondig, opnieuw geaudit)

**Splitsing bevestigd relevant** (conform sectie 20 van de opdracht):
**HYROX** (running-segmenten + stations, `race_segments`, al
bevestigd canoniek tijdens B9-06) is functioneel een ander onderwerp
dan **Athlete Intelligence** (longitudinaal model, cross-domain-
relaties, stagnatie-detectie) -- dat laatste is expliciet NIET
onderzocht binnen deze sessie en zou een eigen, apart traject
vereisen (mogelijk deels overlappend met een toekomstige F15-scope,
die momenteel bewust gepauzeerd is).

**MINIMUM REQUIRED FOR 9.0 (HYROX specifiek):** station-ordering en
race-versus-training-onderscheid (zie Triathlon hierboven, gedeeld
datamodel) explicieter maken.

**Athlete Intelligence: NOT ENOUGH EVIDENCE**, vereist een eigen audit.

**PRIORITY:** P2 (HYROX-deel), P3 (Athlete-Intelligence-deel, mogelijk
overlappend met een gepauzeerde F15-scope -- niet vooruitlopen zonder
Product Owner-vrijgave).
