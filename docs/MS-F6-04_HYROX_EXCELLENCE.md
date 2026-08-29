# MS-F6-04_HYROX_EXCELLENCE.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "HYROX Excellence" -- "Race preparation/execution/analysis, rules revalidated." P2, dependencies MS-F6-01/02/03 (alle CLOSED).

**Rulebook-onderzoeksdatum:** 29 augustus 2026, officiële en gezaghebbende bronnen (hyroxus.com/faq, het officiële HYROX EN Single Rulebook 26/27, meerdere actuele race-guides).

## Kernbevinding: uitzonderlijk mature, reeds bestaande implementatie
END-HYROX-001 bestaat al met 386/386 tests (core/fHyroxTriathlon.test.js, het grootste testbestand in de repo) en dekt:
- Race preparation: hyroxStart(type, context, isOfficial) met een structureel racecontext-object, DB-gedragen via race_division/race_is_official-kolommen.
- Execution: hergebruikt de bestaande, gedeelde Calculation-contracten station_duration.v1/segment_transition.v1 -- geen aparte HYROX-executie-engine.
- Analysis: hyroxReconstructPerformance(instanceRow, sessieRijen) reconstrueert een volledig performance-object uit de canonieke sessiedata, gebruikt op meerdere plekken in de UI.
- Divisie-model: race_division is een flexibel, generiek stringveld, geen hardcoded enum.

## Rulebook-revalidatie (het bestaande P3-gap, nu gesloten)
De bestaande registry-vermelding markeerde expliciet "herverificatie van rulebook-bronnen" als openstaand. Actueel onderzoek bevestigt:
- Formaat ongewijzigd: 8x 1km hardlopen + 8 functionele stations in vaste volgorde (SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls).
- Divisies: Open, Pro, Doubles, Pro Doubles, Relay, Adaptive -- plus een nieuwe "Elite 15"-divisie voor seizoen 26/27. Geen hardcoded rij in TK die deze nieuwe divisie zou uitsluiten.
- Belangrijke, recente regelwijziging (seizoen 2025-2026): bij burpees is het gebruik van de knieën om op te staan nu wel toegestaan. Bevestigd: TK slaat geen enkele specifieke bewegingsstandaard hardcoded op -- de bestaande metadata blijft abstract. Geen verouderde regel om te corrigeren.
- Geen tijdslimiet voor het voltooien van een race -- consistent met de bestaande architectuur.

## Coaching-tekst
Bevestigd: de HYROX-coachingtekst-fix uit MS-F6-02 staat nog correct, geen regressie.

## Observaties versus aanbevelingen
hyroxReconstructPerformance() levert uitsluitend feitelijke, berekende data -- geen ingebouwde aanbevelingslogica gevonden.

## MS-F6-04 acceptance-gate-toetsing
Letterlijke acceptance gate: "Race preparation/execution/analysis, rules revalidated."
Resultaat: CLOSED. Preparation/execution/analysis bevestigd volledig aanwezig en getest. Rules revalidated: actueel officieel onderzoek uitgevoerd, geen verouderde regel gevonden, één relevante recente regelwijziging geidentificeerd en bevestigd niet-conflicterend. De bestaande P3-gap "herverificatie van rulebook-bronnen" is hiermee gesloten.
