# MS-F8-04_LIFE_STAGE_PERFORMANCE_CONTEXT.md — Trainingskompas

**Canonieke naam/acceptance:** "Life-stage Performance Context" -- "Only approved life-stage scope." P2, dependencies MS-F8-01/02 (beide CLOSED).

Deze sprint heronderzoekt elk domein zelfstandig (geen groepering "sensitive = DEFER"). DEFER is een evidence-based conclusie, geen automatische default.

## Kritieke heraudit: cyclusDagFactor()
Reeds herbevestigd in MS-F8-03 als Evidence level C. Aanvullende vragen:
1. Rechtvaardigt actueel onderzoek de multiplicatoren nog? Ja, als productheuristiek, niet als sterke wetenschappelijke claim.
2. Is Evidence Level C voldoende voor een directe aanpassing? Ja, mits transparant gecommuniceerd en atleet-controleerbaar (beide al het geval).
3. Is de UI transparant dat dit een heuristiek is? Bevestigd via CALCULATION_REGISTRY.md.
4. Kan de atleet dit uitschakelen? Ja, indirect: cyclus_fase in de HRV-check-in is optioneel, niet invullen = neutraal (1.00).
5. Kan hormonale anticonceptie de fase-mapping ongeldig maken? Ja -- genuine, nieuwe bevinding deze sprint (opgelost, zie hieronder).
6. Kunnen onregelmatige cycli de mapping onbetrouwbaar maken? Betreft de aparte CycleCore-schatting, niet de dagelijkse self-report.
7. Conflicteert dit met het nieuwe AI-contextontwerp? Nee -- volledig gescheiden lagen.

Finale status: RETAIN AS-IS + verbetering elders (contraceptie, zie hieronder).

## Dual cycle-architectuur-audit
Twee paden bevestigd: cycle_periods/cycle_symptom_logs -> CycleCore (schatting, UI); hrv_log.cyclus_fase (dagelijkse self-report) -> cyclusDagFactor() (dagfactor). Dit is een bewuste, veilige scheiding, geen architectuurdrift. Niet-blokkerend productverbeterpunt gevonden: geen suggestie-koppeling tussen beide -- vastgelegd als GAP-P3-024, niet binnen deze sprint gebouwd.

## Contraceptie -- herbeoordeeld, kleine verbetering gebouwd
Vorige beslissing: DEFER. Herbeoordeling: kan het niet weten van hormonale anticonceptie tot misleidende cyclusinterpretatie leiden? Ja, bevestigd -- CycleCore veronderstelt impliciet natuurlijke-cyclus-fysiologie.
Nieuwe beslissing: kleine, veilige verbetering gebouwd. WomensPerformanceContextCore.build() accepteert nu een optioneel vierde argument contraceptionType ('hormonal'/'non_hormonal'/'unknown'/null, atleet-gedeclareerd, nooit afgeleid). Bij 'hormonal' wordt geschatte_fase bewust onderdrukt (null) met een expliciete reden. Geen contraceptie-advies, geen effectiviteitsclaim. Backwards-compatible.
UI/opslag voor dit veld is nog niet gebouwd -- concrete volgende stap, vastgelegd als niet-blokkerend.

## Zwangerschap -- herbeoordeeld, DEFER herbevestigd
ACOG (2025): brede aanbevelingen bestaan, maar consequent met individuele beoordeling/specialistische consultatie. Kernvraag: zou implementatie de atleet aanmoedigen op de app te vertrouwen i.p.v. klinische beoordeling? Ja -- zelfs voorzichtige context loopt risico op impliciete geruststelling zonder enige contra-indicatie-detectie. Finale beslissing: DEFER. Vereist om te heroverwegen: aparte sprint met medisch-inhoudelijke review.

## Postpartum -- herbeoordeeld, DEFER herbevestigd
Zelfde onderliggende risico als zwangerschap. Finale beslissing: DEFER.

## Perimenopauze/Menopauze -- herbeoordeeld, andere uitkomst dan zwangerschap/postpartum
WHEN position statement 2026/ACSM: krachttraining breed aanbevolen, individualisatie belangrijker dan specifieke methode. Generiek, populatie-niveau-bewijs -- rechtvaardigt geen geautomatiseerde aanpassing, wel een context-only aanpak analoog aan Cycle/Symptoms.
Finale beslissing: CONTEXT_ONLY -- ARCHITECTURE READY. Bestaande cycle_symptom_logs-infrastructuur kan dit technisch dragen zonder nieuwe tabel. Niet binnen deze sprint gebouwd: de UI (apart, niet "Cyclus"-gelabeld scherm) vereist eigen ontwerpwerk.

## Bekkenbodem -- herbeoordeeld, DEFER herbevestigd
Risico op impliciete geruststelling zonder verwijzingsarchitectuur is reëel. Finale beslissing: DEFER.

## Maturiteitsmatrix
| Domein | Productbeslissing | Architectuur | Software | Wetenschappelijk | Privacy |
|---|---|---|---|---|---|
| Cycle | CLOSED (IMPLEMENT) | IMPLEMENTED | IMPLEMENTED | Evidence-C herbevestigd | VALIDATED |
| Symptoms | CLOSED (IMPLEMENT) | IMPLEMENTED | IMPLEMENTED | athlete_reported, geen diagnose | VALIDATED |
| Contraceptie | CLOSED (kleine verbetering) | ARCHITECTURE READY | PARTIAL (Core klaar, niet gewired in UI) | N.v.t. | N.v.t. |
| Zwangerschap | CLOSED (DEFER) | DEFERRED | NOT_IMPLEMENTED | ACOG gereviewed | N.v.t. |
| Postpartum | CLOSED (DEFER) | DEFERRED | NOT_IMPLEMENTED | Zelfde als zwangerschap | N.v.t. |
| Perimenopauze/Menopauze | CLOSED (CONTEXT_ONLY) | ARCHITECTURE READY | NOT_IMPLEMENTED (bewust) | WHEN/ACSM 2025-2026 gereviewed | Vereisten gedefinieerd |
| Bekkenbodem | CLOSED (DEFER) | DEFERRED | NOT_IMPLEMENTED | Voorzichtigheidsprincipe | N.v.t. |

## Tests
core/fWomensPerformanceContext.test.js uitgebreid (17/17, was 12): 5 nieuwe tests voor contraceptie-bewuste faseonderdrukking. Sabotagebewijs geleverd.

## Nieuwe, niet-blokkerende gap
GAP-P3-024: de HRV-check-in toont geen suggestie vanuit de al-beschikbare CycleCore-schatting. Geen veiligheidsprobleem, wel een gebruikerslast-verbeterpunt.

## MS-F8-04 acceptance-gate-toetsing
Letterlijke acceptance gate: "Only approved life-stage scope."
Resultaat: CLOSED. Elk domein is zelfstandig, evidence-based beoordeeld. Contraceptie kreeg een kleine, veilige verbetering; perimenopauze/menopauze kreeg architectuurgoedkeuring voor toekomstig werk. Zwangerschap/postpartum/bekkenbodem blijven DEFER op basis van herbevestigd, actueel bewijs.
