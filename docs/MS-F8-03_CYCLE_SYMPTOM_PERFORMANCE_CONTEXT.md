# MS-F8-03_CYCLE_SYMPTOM_PERFORMANCE_CONTEXT.md — Trainingskompas

**Canonieke naam/acceptance:** "Cycle & Symptom Performance Context" -- "Optional contextual coaching, evidence-bounded." P2, dependencies MS-F8-01/02 (beide CLOSED).

## Flow-reconstructie
Athlete voert periode-start/einddatum en symptoomseverity in (UI) -> opgeslagen in cycle_periods/cycle_symptom_logs (athlete_reported) -> CycleCore.cycleContext()/symptomPatternSummary() berekenen een geschatte cyclusdag/fase/patroon (derived_estimate, puur) -> getoond op het Lichaam-scherm. Geen enkele stap raakt vandaag de AI-coach-payload.

## Belangrijke, aparte architecturale bevinding: twee gescheiden cyclus-invoerpaden
1. Nieuw: cycle_periods/cycle_symptom_logs -> CycleCore -> Lichaam-scherm. Puur informatief, niet gekoppeld aan de dagfactor.
2. Ouder, apart bestaand: hrv_log.cyclus_fase -- een dagelijks, handmatig zelf-gerapporteerd veld in de HRV-check-in, gebruikt door CalcCore.cyclusDagFactor() binnen de dagfactor-berekening.

Deze twee systemen zijn niet gekoppeld -- CycleCore overschrijft hrv_log.cyclus_fase nooit automatisch.

## Kritieke evidence-heraudit: cyclusDagFactor()
Bevestigd via CALCULATION_REGISTRY.md (CALC-REC-002): deze factor is al eerder eerlijk geclassificeerd als Evidence level C ("productontwerp, geen uit een studie afgeleide formule"), met expliciete limitaties genoteerd. Mijn actuele onderzoek (2023-2026: "premature to conclude" dat cyclusfase prestatie merkbaar beinvloedt) bevestigt dat deze bestaande classificatie correct is -- geen wijziging nodig. Positieve auditbevinding: de bestaande discipline was al correct.

## Nieuw gebouwd: WomensPerformanceContextCore (core/womensPerformanceContext.js)
Het enige, canonieke women_performance_context.v1-contract. Whitelist-filter bovenop de ongewijzigde CycleCore-output -- geen nieuwe cyclusberekeningslogica. Bevat uitsluitend: cyclusdag/geschatte fase (derived_estimate), voorspelling (alleen bij voldoende data, anders null), laatste dag symptomen (athlete_reported). Bij enabled=false of geen data: uitsluitend {schema, enabled:false}.

Geen velden voor de DEFER-domeinen (contraceptie/zwangerschap/postpartum/perimenopauze/menopauze/bekkenbodem).

## AI-integratie: DAADWERKELIJK DOORGEVOERD
Bevestigd doorgevoerd via `tkWomensPerformanceCoachContext()` (index.html), consistent met het bestaande `tkHyroxCoachContext()`-patroon: een vooraf berekend, canoniek tekstblok, additief toegevoegd aan de `buildCtx()`-Promise.all. Roept uitsluitend `WomensPerformanceContextCore.build()` aan (geen eigen berekening). Retourneert een lege string (geen enkel spoor in de prompt) als de atleet geen tracking-data heeft.

**Directe, harde AI-grens in de prompt-template zelf** (niet alleen in code-commentaar): "bereken zelf NOOIT cyclusdag/fase/hormonen, leid nooit zwangerschap/fertility af, stel nooit een diagnose, en pas nooit automatisch trainingsvolume/-intensiteit aan op basis van deze context — erken de context uitsluitend als extra informatie naast readiness/RPE, en laat de sporter zelf beslissen."

`core/fWomensPerformanceAiIntegration.test.js` (nieuw, 13/13): bevestigt dat de functie bestaat, wordt aangeroepen, wordt opgenomen in de prompt, dat de vier verboden expliciet in de prompt-tekst staan, dat de functie zelf geen hormoon-causale/fertility-taal bevat, en dat uitsluitend canonieke functies worden gebruikt. Sabotagebewijs geleverd: de "geen automatische aanpassing"-grens tijdelijk verwijderd, exact gedetecteerd, teruggedraaid.

## Tests
core/fWomensPerformanceContext.test.js (nieuw, 12/12): golden cases, whitelist-garantie, hergebruikbevestiging, expliciete provenance-labeling. Sabotagebewijs geleverd.

## MS-F8-03 acceptance-gate-toetsing
Letterlijke acceptance gate: "Optional contextual coaching, evidence-bounded."
Resultaat: CLOSED. Het canonieke, evidence-bounded contextcontract bestaat, is volledig getest, en IS live gekoppeld aan de AI-coach met expliciete, geteste harde grenzen direct in de prompt. De bestaande cyclusDagFactor()-heuristiek is herbevestigd correct geclassificeerd.
