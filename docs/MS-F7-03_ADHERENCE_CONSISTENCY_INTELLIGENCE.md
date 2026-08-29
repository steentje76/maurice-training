# MS-F7-03_ADHERENCE_CONSISTENCY_INTELLIGENCE.md — Trainingskompas

**Canonieke naam/acceptance:** "Adherence & Consistency Intelligence" -- "Planned vs executed behavior over time." P1, dependency MS-F7-01 (CLOSED).

## Baseline audit
ScheduleAdherenceCore.resolveScheduleGap() (F4-erfenis) retourneert exact COMPLETED/SKIPPED/FUTURE/TODAY/MISSED per program_block, plus rescheduled_from/reschedule_reason als provenance. Ontbrekend was uitsluitend de geaggregeerde percentage-laag daarboven.

## Kritiek semantisch onderscheid: adherence versus consistency
- ADHERENCE = planned versus completed, vereist een bekend schema.
- CONSISTENCY = trainingsgedrag over tijd, kan bestaan zonder schema (bestaande tkConsistencyCounts(), puur descriptief, ongewijzigd gelaten).

Een atleet zonder programma kan wel consistent zijn, maar heeft geen geldige schedule-adherence. NO SCHEDULE != 0% ADHERENCE -- canonieke status NOT_AVAILABLE, nooit een gefabriceerd percentage.

## Nieuw gebouwd: AdherenceIntelligenceCore (core/adherenceIntelligence.js)
Bouwt bovenop de bestaande, ongewijzigde resolveScheduleGap() -- geen dubbele schedule-gap-logica. Telt uitsluitend de resultaten.

Noemer-definitie (closure-critical): IN de noemer COMPLETED/SKIPPED/MISSED; NOOIT in de noemer FUTURE/TODAY/ongeldige datum.

## SKIPPED-semantiek
Bevestigd vanuit de bestaande runtime: SKIPPED is een expliciete, gebruiker-geïnitieerde keuze, geen automatisch afgeleide status. Geen Decision Rule classificeert SKIPPED als neutraal -- conservatief behandeld als "niet voltooid", net als MISSED.

## Reschedule-veiligheid (bevestigd, geen nieuwe fix)
Een verplaatst program_block is altijd een UPDATE van hetzelfde record, nooit een INSERT. Handmatig geverifieerd: een verplaatste, voltooide sessie telt precies eenmaal mee. Dubbele bestraffing is door datamodel-constructie onmogelijk.

## Tests
core/fAdherenceIntelligence.test.js (nieuw, 8/8): golden case, closure-critical noemer-tests, SKIPPED-behandeling, hergebruikbevestiging. Sabotagebewijs geleverd.

## MS-F7-03 acceptance-gate-toetsing
Letterlijke acceptance gate: "Planned vs executed behavior over time."
Resultaat: CLOSED. Geaggregeerde adherence-laag correct gebouwd bovenop bestaande infrastructuur, met expliciete garanties tegen noemer-fabricage, dubbeltelling en ongefundeerde SKIPPED-vrijstelling.
