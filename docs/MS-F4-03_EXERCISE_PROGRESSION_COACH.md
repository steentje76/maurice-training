# MS-F4-03_EXERCISE_PROGRESSION_COACH.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json, leidend boven de opdrachttekst):** "Exercise-specific Progression Coach" -- "Lift-by-lift stagnation/progression advice."

## Kernbevinding: grotendeels reeds gebouwd, vóór deze sprint
Runtime-trace bevestigt een volledige, reeds bestaande keten:

1. computeExerciseTrends() (index.html) -- puur deterministisch: groepeert sessies per exercise_id, berekent per oefening het e1RM (via het protected CalcCore.oneRMRaw(), Epley), en past ProgressionCore.trendBy() toe (minimaal 3 vergelijkbare sessies, improving: true/false/null).
2. tkProgressionTrendContext() -- zet dit om in een feitelijke, Nederlandstalige tekstsamenvatting van oefeningen met een dalende trend (aantalDalend, oefeningnamen).
3. buildCtx() -- neemt deze tekst op in de AI-systeemprompt, met de expliciete instructie: "PROGRESSIE-TREND PER OEFENING (reeds berekend door ProgressionCore, niet zelf herberekenen -- feitelijke constatering, geen deload-advies of trainingsbeslissing hierop baseren tenzij de gebruiker daar expliciet om vraagt)."
4. TrainingLoadCore.corroboratedLoadSignal() (DEC-LOADCORR-001, reeds F3-gevalideerd) gebruikt aantalDalend als één van de twee vereiste, onafhankelijke signalen voor een programmaniveau-deload-suggestie -- nooit op basis van één enkele dalende oefening.
5. Numerieke toepassing (indien de AI een concreet gewicht voorstelt) blijft volledig gebonden aan de reeds bestaande, per-oefening-gescoopte [[APPLY:exId:kg]]-marker + CalcCore.validateProposedWeight() (ai_guard.v1, F1.3, MS-F4-01 bevestigd).

## Recommendation Trace Matrix (sectie 21)

| Recommendation-adjacent output | Calculation | Decision Rule | Quality/Confidence | Evidence | AI-rol |
|---|---|---|---|---|---|
| "Oefening X toont een dalende trend" | CalcCore.oneRMRaw (Epley) + ProgressionCore.trendBy | -- (signaal, geen decision) | trendBy's eigen minN=3-ondergrens | E (technische trend-detectie) | Mag citeren/bespreken, mag NIET zelf een trainingsbeslissing baseren tenzij expliciet gevraagd |
| "Meerdere signalen wijzen op een rustiger week" | idem + ACWR-classificatie | DEC-LOADCORR-001 | corroboratie-vereiste (2 onafhankelijke signalen) | E (product heuristic, F3-bevestigd) | Mag bespreken, geen automatische aanpassing |
| Concreet voorgesteld gewicht ([[APPLY:exId:kg]]) | CalcCore.validateProposedWeight (ai_guard.v1) | -- (guard) | plausibiliteitscap 120% e1RM | E (technisch/heuristisch) | Mag voorstellen; toepassing altijd via deterministische guard + expliciete gebruikersbevestiging |

Conclusie: geen enkele lift-by-lift-recommendation bestaat zonder herleidbare, deterministische onderbouwing. Geen "AI-only prescription" gevonden.

## GAP-P2-016 herbeoordeling (sectie 23/27)
De vraag is niet "hebben we structured JSON nodig", maar: "kunnen alle actieve user-facing AI-recommendation-paden aantoonbaar technisch aan canonieke Calculation/Decision-output worden gebonden?" Antwoord: ja, voor de numerieke/prescriptieve paden -- de APPLY-marker + validateProposedWeight bindt elke daadwerkelijke gewichtstoepassing deterministisch, ongeacht wat de AI in vrije tekst beweert. Het enige, nog resterende, eerlijk gedocumenteerde gat (uit MS-F4-01) is: de AI zou in lopende tekst (buiten een APPLY-marker) een onjuist getal kunnen noemen zonder dat dit specifieke type fout wordt gedetecteerd -- dat vereist numerieke-waarde-tegen-canoniek-feit-validatie, een aanzienlijk grotere uitbreiding.
Uitkomst: GAP-P2-016 blijft P2 (niet CLOSED, niet opnieuw P1) -- het reële, prescriptieve risico is al deterministisch geborgd; het resterende risico (een onjuist genoemd getal in proza, nooit toegepast) is laag-impact en blijft eerlijk als openstaand, niet-kritiek vervolgpunt genoteerd.

## MS-F4-03 acceptance-gate-toetsing
Letterlijke acceptance gate: "Lift-by-lift stagnation/progression advice."
Resultaat: CLOSED. De volledige keten (deterministische per-oefening-trenddetectie -> feitelijke AI-context met expliciete niet-herberekenen-instructie -> gescoopte, gevalideerde toepassing) bestond al en is nu voor het eerst formeel gedocumenteerd en getest. Geen tweede progressie-engine, geen ongebonden lift-by-lift-prescriptie gevonden.
