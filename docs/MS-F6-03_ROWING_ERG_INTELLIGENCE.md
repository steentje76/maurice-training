# MS-F6-03_ROWING_ERG_INTELLIGENCE.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Rowing & Erg Intelligence" -- "Concept2-specific performance model." P1, dependencies MS-F3-04 + MS-F5-02 (beide voldaan).

## Kernbevinding: hergebruik-sprint, geen nieuwe berekeningslogica nodig
In tegenstelling tot MS-F6-01/02 bleek voor rowing/erg alle benodigde infrastructuur al te bestaan:

1. Concept2-infrastructuur (F5-02): uitgebreide BLE-transport, provenance-classificatie, measured-vs-derived-vermogen-onderscheid -- al PRODUCTION.
2. Split/vermogen-conversie (F1.12, CardioCore): officiële Concept2-formule, al PRODUCTION.
3. Critical Power (MS-F6-02, CardioCore.criticalPower()): volledig sportagnostisch -- neemt uitsluitend {avg_power_w, duration_s} aan. Direct herbruikbaar voor Concept2-ergdata, handmatig geverifieerd met realistische 2k/500m-ergprestaties (CP=234W, W'=28,5kJ).
4. Performance-trend (F4, ProgressionCore.trendBy()): eveneens sportagnostisch, direct herbruikbaar voor roeisplit-trends.

Geen tweede, gedupliceerde CP- of trendfunctie gebouwd voor roeien.

## Regressie-lock op de MS-F6-02-fix
De rowing-coachingtekst ("voorspel 2K/5K-prestaties") werd al in MS-F6-02 gecorrigeerd. Deze sprint bevestigt: de fix staat nog steeds correct.

## Rowing-specifieke metrics-audit
Bevestigd aanwezig en correct: 500m-split, afstand, duur, stroke rate, vermogen (gemeten/afgeleid), pace. Intervalconsistentie hergebruikt de bestaande, generieke core/intervalEngine.js.

## TID/periodisering
Bewust NOT_IMPLEMENTED, consistent met de running/cycling-beslissing in MS-F6-01/02.

## Tests
core/fRowingErgIntelligence.test.js (nieuw, 6/6): bevestigt sportagnostische herbruikbaarheid van criticalPower() en trendBy() voor roeidata, regressie-lockt de MS-F6-02-fix en het measured-vs-derived-onderscheid uit F5-02.

## MS-F6-03 acceptance-gate-toetsing
Letterlijke acceptance gate: "Concept2-specific performance model."
Resultaat: CLOSED. Het model bestaat uit de combinatie van de bestaande Concept2-infrastructuur + de sportagnostische Critical Power-functie + de bestaande trend-infrastructuur -- allemaal correct herbruikbaar zonder duplicatie.
