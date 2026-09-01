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
