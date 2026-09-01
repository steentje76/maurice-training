# Benchmark 9+ Gap Registry

## B9G-UX-001
**DOMAIN:** UX / Navigation (cross-domain: Social, Nutrition)
**SCREEN:** Home, Lichaam, bottom-navigatie (globaal)
**CAPABILITY:** Discoverability van Sociaal en Voeding
**CURRENT SCORE:** 6.5 (Discoverability-dimensie op beide schermen)
**TARGET SCORE:** >=9.0
**COMPETITOR REFERENCE:** Strava (Feed als hoofdtab), Cronometer/
MyFitnessPal (Voeding als hoofdtab)
**EVIDENCE:** beide domeinen zijn uitsluitend bereikbaar via een klein,
ongelabeld icoon (👥 op Home, 🍽️ op Lichaam) i.p.v. een gelijkwaardige,
herkenbare hoofdplek naast Training/Lichaam/Coach/Voortgang. Deze
keuze was in eerdere sprints (B9-07/B9-09) bewust conservatief
("geen brede bottom-nav-refactor riskeren"), maar is nooit apart,
grondig UX-getoetst.
**USER IMPACT:** middel-hoog -- een nieuwe gebruiker zal deze twee,
inmiddels volwaardige productdomeinen (negen bruikbare Social-
onderdelen, drie Nutrition-sprints) waarschijnlijk niet uit zichzelf
ontdekken.
**TECHNICAL IMPACT:** laag (een navigatiewijziging raakt geen
data-/beveiligingslaag).
**UX IMPACT:** hoog -- dit is een structurele, zichtbare
navigatiewijziging.
**PRIORITY:** P1 (blokkeert >=9.0 op een belangrijke user journey,
geen P0 want geen security/privacy-risico).
**DEPENDENCIES:** geen.
**UX MOCK-UP REQUIRED:** YES.
**IMPLEMENTATION PHASE:** B9-H2 of later, na expliciete Product
Owner-goedkeuring van een concreet voorstel.
**STATUS:** OPEN.

## B9G-UX-002
**DOMAIN:** UX / Consistency
**SCREEN:** Cross-domain (Sociaal, Voeding, mogelijk breder)
**CAPABILITY:** Terminologie-consistentie van opslaan-acties
**CURRENT SCORE:** 7.8 (Consistency-dimensie, geschat)
**TARGET SCORE:** >=9.0
**COMPETITOR REFERENCE:** N.v.t. (interne consistentie-standaard)
**EVIDENCE:** "Toevoegen"/"Wijzigingen opslaan" (Nutrition) vs.
"Profiel opslaan"/"Groep aanmaken" (Social) -- functioneel
gelijksoortige acties met verschillende labels per domein.
**USER IMPACT:** laag-middel (geen blokkade, wel een klein, herhaald
frictiepunt).
**TECHNICAL IMPACT:** zeer laag (tekstwijziging).
**UX IMPACT:** laag.
**PRIORITY:** P2.
**DEPENDENCIES:** een repo-brede terminologie-inventaris (NOT ENOUGH
EVIDENCE binnen deze sprint, zie B9G-UX-004).
**UX MOCK-UP REQUIRED:** NO (tekstuele consistentie, geen structurele
wijziging).
**IMPLEMENTATION PHASE:** elke toekomstige B9-H-fase, lage prioriteit.
**STATUS:** OPEN.

## B9G-UX-003
**DOMAIN:** UX / Visual Consistency
**SCREEN:** Cross-domain
**CAPABILITY:** Icoonstijl-consistentie (emoji vs. SVG)
**CURRENT SCORE:** 7.5 (geschat)
**TARGET SCORE:** >=9.0
**COMPETITOR REFERENCE:** N.v.t.
**EVIDENCE:** bottom-nav en nieuwe entry-knoppen gebruiken emoji;
oudere Running-geschiedenis-items gebruiken SVG-iconen.
**USER IMPACT:** laag (esthetisch, geen functionele blokkade).
**TECHNICAL IMPACT:** laag-middel (een volledige icoon-vervanging
raakt veel schermen).
**UX IMPACT:** middel (globale look-and-feel-wijziging, vereist
Product Owner-goedkeuring conform sectie 2).
**PRIORITY:** P3.
**DEPENDENCIES:** een design-systemrichting-beslissing (globale
iconografie).
**UX MOCK-UP REQUIRED:** YES (globale look-and-feel-wijziging).
**IMPLEMENTATION PHASE:** een latere B9-H-fase (consolidatie).
**STATUS:** OPEN.

## B9G-UX-004
**DOMAIN:** UX / Process
**SCREEN:** N.v.t. (methodologisch)
**CAPABILITY:** Volledige, repo-brede audit-dekking
**CURRENT SCORE:** N.v.t.
**TARGET SCORE:** N.v.t.
**COMPETITOR REFERENCE:** N.v.t.
**EVIDENCE:** deze B9-H1-sprint dekte de 20 belangrijkste kernschermen
grondig; Strength/Recovery/Women's Performance/AI/Analytics/Coach/Gym
kregen NOT ENOUGH EVIDENCE binnen het haalbare van deze audit-only
sprint.
**USER IMPACT:** onbekend (vereist eerst de audit zelf).
**TECHNICAL IMPACT:** N.v.t.
**UX IMPACT:** N.v.t.
**PRIORITY:** P1 (blokkeert een volledige 9+-certificering).
**DEPENDENCIES:** geen.
**UX MOCK-UP REQUIRED:** NO (dit is zelf een auditopdracht, geen UX-
wijziging).
**IMPLEMENTATION PHASE:** B9-H3 t/m B9-H7 (per domein, conform de
nieuwe roadmapindeling).
**STATUS:** OPEN.

## B9G-END-001 t/m B9G-END-004, B9G-NUT-001, B9G-SOC-001, B9G-PLAT-001/002
Zie `docs/BENCHMARK_9_PLUS_SCORECARD.md` voor de per-dimensie
"Blocking gaps"-kolom -- elk daar genoemd gap-ID is hierbij
geregistreerd met STATUS: OPEN, PRIORITY: P2 (geen van deze blokkeert
een kritieke user journey op de manier die B9G-UX-001 wel doet), en
UX MOCK-UP REQUIRED: NO tenzij expliciet anders vermeld (de meeste
zijn functionele/evidence-gaps, geen zichtbare UX-wijzigingen).

## Functionele uitbreiding (Benchmark 9+ Functional Deep-Dive)

**GAP ID:** B9G-TEAM-001
**DOMAIN:** Team Operations
**TYPE:** FUNC
**CURRENT BEHAVIOR:** `team_events`/`event_attendance`/`event_responsibilities` bestaan volledig als backend-schema, 0 UI/Netlify-integratie -- geen enkele gebruiker kan dit vandaag gebruiken.
**EXPECTED 9+ BEHAVIOR:** een coach kan een event aanmaken, leden zien tijd/locatie, geven beschikbaarheid aan, verantwoordelijkheden worden toegewezen.
**EVIDENCE:** repo-brede `grep`, 0 treffers in index.html/netlify/functions voor alle drie tabellen.
**USER IMPACT:** HOOG -- blokkeert de volledige, in de opdracht beschreven teamworkflow.
**DEPENDENCIES:** B9G-GYM-001 (architectuurambiguïteit eerst oplossen).
**SECURITY IMPACT:** RLS van deze tabellen niet binnen deze sessie live geverifieerd -- vereist verificatie vóór implementatie.
**DATA IMPACT:** geen (schema bestaat al).
**IMPLEMENTATION COMPLEXITY:** HOOG (nieuwe Netlify-functie(s) + nieuw scherm).
**BLOCKS 9.0:** YES
**UX MOCK-UP NEEDED:** YES (nieuw scherm, valt onder de B9-H1-UX-gate)
**STATUS:** OPEN -- BLOCKED UNTIL UX PHASE (conform sectie 27 van de opdracht: functionaliteit vereist hier een nieuw scherm, dus niet gebouwd in deze sprint)

**GAP ID:** B9G-COACH-001
**DOMAIN:** Coach/PT
**TYPE:** FUNC
**CURRENT BEHAVIOR:** `coach_athlete_relationships`/`coach_program_assignments`/`coach_program_templates` bestaan volledig als backend-schema, 0 UI/Netlify-integratie. `netlify/functions/coach.js` is de AI-coach-proxy, geen PT-relatiebeheer.
**EXPECTED 9+ BEHAVIOR:** een coach kan tientallen atleten uitnodigen, programma's toewijzen, voortgang monitoren.
**EVIDENCE:** repo-brede `grep`, 0 treffers.
**USER IMPACT:** HOOG.
**DEPENDENCIES:** B9G-TEAM-001, B9G-GYM-001.
**SECURITY IMPACT:** "data after relationship ends"-scenario nog niet getest (kan pas zodra een UI-laag bestaat).
**DATA IMPACT:** geen.
**IMPLEMENTATION COMPLEXITY:** HOOG (nieuw scherm).
**BLOCKS 9.0:** YES
**UX MOCK-UP NEEDED:** YES
**STATUS:** OPEN -- BLOCKED UNTIL UX PHASE

**GAP ID:** B9G-GYM-001
**DOMAIN:** Gym/Club
**TYPE:** DATA / architectuur
**CURRENT BEHAVIOR:** twee parallelle systemen bestaan: `users.gym_id`/`gym_role` (actief, via `gym-team.js`) versus `organizations`/`teams`/`gyms`/`memberships` (backend-only, ongebruikt).
**EXPECTED 9+ BEHAVIOR:** één, duidelijk canoniek systeem, of een bewuste, gedocumenteerde migratiestrategie tussen beide.
**EVIDENCE:** live database-schema-audit + repo-brede `grep` op beide systemen.
**USER IMPACT:** MEDIUM (het bestaande systeem werkt voor de huidige, eenvoudige use-case; de ambiguïteit is een risico voor toekomstige uitbreiding, geen acuut, zichtbaar gebruikersprobleem).
**DEPENDENCIES:** blokkeert B9G-TEAM-001/B9G-COACH-001.
**SECURITY IMPACT:** geen nieuw gevonden probleem, wel een risico op toekomstige inconsistentie als beide systemen ooit tegelijk worden gebruikt.
**DATA IMPACT:** een architectuurbeslissing hier bepaalt of toekomstige data-migratie nodig is.
**IMPLEMENTATION COMPLEXITY:** MEDIUM (architectuurbeslissing + eventuele migratie, geen nieuwe UI op zichzelf).
**BLOCKS 9.0:** YES (indirect, via de twee bovenstaande gaps)
**UX MOCK-UP NEEDED:** NO / LATER (dit is primair een architectuurbeslissing, geen zichtbare UX-wijziging op zichzelf)
**STATUS:** OPEN -- vereist een expliciete Product Owner-beslissing over welk systeem canoniek wordt, vóór B9G-TEAM-001/B9G-COACH-001 kunnen starten.

**GAP ID:** B9G-DEV-001
**DOMAIN:** Devices/Wearables
**TYPE:** VALID
**CURRENT BEHAVIOR:** architectuur correct (OAuth/token-vault/sync server-side), geen enkele provider fysiek, extern gevalideerd.
**EXPECTED 9+ BEHAVIOR:** minimaal één provider REAL DEVICE VALIDATED.
**EVIDENCE:** geen extern provideraccount/hardware beschikbaar binnen een geautomatiseerde sessie.
**USER IMPACT:** MEDIUM.
**DEPENDENCIES:** extern (buiten Trainingskompas se controle).
**SECURITY IMPACT:** geen nieuw gevonden probleem.
**DATA IMPACT:** geen.
**IMPLEMENTATION COMPLEXITY:** N.v.t. (externe validatie, geen implementatie).
**BLOCKS 9.0:** NO (SOFTWARE 9+ READY blijft haalbaar zonder dit)
**UX MOCK-UP NEEDED:** NO
**STATUS:** OPEN -- EXTERNAL VALIDATION OPEN, niet-blokkerend voor software-gereedheid.

**GAP ID:** B9G-SOC-002
**DOMAIN:** Social
**TYPE:** FUNC
**CURRENT BEHAVIOR:** notificatie-generatie beperkt tot connection_request/connection_accepted.
**EXPECTED 9+ BEHAVIOR:** ook notificaties voor reacties/comments/challenge-mijlpalen.
**EVIDENCE:** B9-07B/B9-08-codeaudit binnen deze sessie.
**USER IMPACT:** LAAG-MEDIUM.
**DEPENDENCIES:** geen.
**SECURITY IMPACT:** geen (hergebruik van de bestaande, veilige RPC).
**DATA IMPACT:** geen nieuwe tabel nodig.
**IMPLEMENTATION COMPLEXITY:** LAAG.
**BLOCKS 9.0:** NO
**UX MOCK-UP NEEDED:** NO (functionele uitbreiding van bestaand, ongewijzigd notificatiescherm)
**STATUS:** CLOSED -- geimplementeerd via migratie_v538.sql, live adversarial herbevestigd, core/fB9G_SOC_002_ReactionCommentNotifications.test.js 7/7. Geen UX-wijziging, conform vooraf gemarkeerd "UX MOCK-UP NEEDED: NO".


## B9-H2A -- Gym/Club Architecture Reconciliation

**GAP ID:** B9G-GYM-002
**DOMAIN:** Gym/Club, Team Operations, Coach/PT
**TYPE:** DATA (architectuur/canonicalisatie)
**CURRENT BEHAVIOR:** twee parallelle organisatiemodellen bestonden naast elkaar.
**EXPECTED 9+ BEHAVIOR:** exact één canonieke organisatie-/lidmaatschapslaag.
**EVIDENCE:** docs/B9_H2A_ORGANIZATION_ARCHITECTURE_DECISION.md, live database-audit.
**USER IMPACT:** indirect (blokkeert Team/Coach-functionaliteit).
**DEPENDENCIES:** geen (deze sprint lost de ambiguiteit zelf op).
**SECURITY IMPACT:** geen regressie (self-elevation live herbevestigd geweigerd).
**DATA IMPACT:** architectuurbeslissing vastgelegd, migratie nog niet uitgevoerd.
**IMPLEMENTATION COMPLEXITY:** HOOG (toekomstige, gefaseerde migratie).
**BLOCKS 9.0:** YES (voor Team Operations en Coach/PT).
**UX MOCK-UP NEEDED:** LATER (voor de uiteindelijke Team/Coach-schermen, niet voor de architectuurbeslissing zelf).
**STATUS:** ARCHITECTURE DECIDED -- migratie-uitvoering en UI-implementatie blijven open, aparte, toekomstige sprints.
