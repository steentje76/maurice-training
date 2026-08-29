# DAILY_COACH_FLOW_INVENTORY.md — Trainingskompas (MS-F4-02)

**Auditmethode:** volledige runtime-trace van de Home-schermweergave, van ruwe data tot gerenderde UI, zonder aannames uit eerdere sprintrapporten.

## Kernbevinding: Explainable Daily Coach bestond al grotendeels
De canonieke pijplijn tkReadinessVandaag() -> DecisionCore.readinessDay() (DEC-READYDAY-001) -> CoachingCore.buildReadinessContext() -> CoachingCore.readinessCoachMessage() -> tkReadinessHtml() is al volledig gebouwd, bevestigd aangeroepen, en gerenderd in het #home-readiness-element op het Home-scherm -- geen dode code (in tegenstelling tot ContextEngineCore uit F3).

readinessCoachMessage() retourneert al exact de vier gevraagde elementen:
- WHAT (kop/betekenis): de zone-classificatie en betekenis, rechtstreeks uit het Decision-outcome.
- WHY (waarom): expliciet teruggevoerd op b.redenen (de Decision Rule se eigen reden-array) en de herstelscore-samenstelling -- nooit AI-geformuleerde causaliteit.
- CONFIDENCE (onzekerheid, plus betrouwbaarheid in de herstelscore-tekst): "laag"-betrouwbaarheid wordt expliciet benoemd, nooit verzwegen.
- MISSING DATA (onzekerheid + b.ontbreekt): expliciete "nog niet alles is bekend"-tekst per ontbrekend signaal -- Unknown wordt nooit als 0 of "goed" gepresenteerd.

Reeds bestaande, vóór deze sprint aanwezige guardrail: READINESS_VERBODEN_WOORDEN -- een woordblokkade in core/coaching.js die al langer "veroorzaakt", "ziek", "blessure", "diagnose", "overtraind", "volledig hersteld" e.d. verbiedt in de readiness-tekstgeneratie zelf.

AI-grens bevestigd correct: readinessAiPayload() is een expliciete whitelist-functie -- de AI ontvangt uitsluitend het reeds-genomen besluit en de reeds-berekende waarden, nooit de ruwe signalen. window._tkReadiness is expliciet gecommentarieerd als "alleen LEZEN door live coach en AI".

## Nieuw gevonden en gefixed tijdens deze sprint
buildCoachAdvice() (een oudere, parallelle tekstgenerator die window.homeCoachText vult) dupliceerde de dagfactor-drempels van DecisionCore.trainReadiness() (DEC-READY-001) inline (f>=1/f>=0.93) in plaats van de canonieke functie aan te roepen. Dit is een reëel, zij het toevallig-nog-synchroon, architectuurrisico: als DEC-READY-001's drempels ooit wijzigen, zou buildCoachAdvice() stil uit de pas gaan lopen. Gefixed: buildCoachAdvice() roept nu DecisionCore.trainReadiness(dfInfo) aan en schakelt op .cls, met identieke output-teksten (geen UX-wijziging, uitsluitend architectuurcorrectie).

## No-wearable-scenario (sectie 13)
Bevestigd: readinessDay()'s datakwaliteit-telling (>=5 volledig, >=2 gedeeltelijk, <2 onvoldoende) werkt correct door met uitsluitend trainingsgeschiedenis/RPE/handmatige invoer -- geen HRV vereist, geen HRV gefabriceerd bij afwezigheid.

## Stale-state-audit (sectie 16)
tkReadinessVandaag() wordt bij elke Home-refresh opnieuw aangeroepen (geen caching over dagen heen) -- nieuwe recovery-/trainingsdata op dezelfde dag wordt bij de eerstvolgende Home-weergave correct herberekend. Geen stale-state-risico gevonden.

## MS-F4-02 acceptance-gate-toetsing
Letterlijke acceptance gate: "What/why/confidence/missing-data explanation."
Resultaat: reeds grotendeels bestaand, bevestigd via runtime-trace, plus één architectuurcorrectie (shadow-threshold-fix in buildCoachAdvice()).
