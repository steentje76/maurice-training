# MS-F7-05_ATHLETE_DASHBOARD_2_0.md — Trainingskompas

**Canonieke naam/acceptance:** "Athlete Dashboard 2.0" -- "Longitudinal insights converted into action." P1, dependencies MS-F7-01/02/03/04 (allen CLOSED).

## Verplichte Shadow Calculation Audit
Repo-brede audit van het bestaande Home-scherm (renderV43Home(), ~115 regels) uitgevoerd voordat enige UI-wijziging is gemaakt.

Geen F7-gerelateerde shadow-calculatie gevonden in renderV43Home() zelf -- de bestaande hero/coach/plan/weer-secties gaan over hartslagherstel/dagfactor/gereedheid (buiten F7-scope, pre-existing).

Genuine, gedocumenteerde bevinding (buiten deze sprint niet gerepareerd): computeProgramProgress()/computeProgramProgressPure() (F4-erfenis) berekenen inline completed.length/blocks.length*100 als "adherencePct", waarbij blocks het volledige programma kan omvatten inclusief toekomstige blokken. Dit is een ander concept ("programma-doorloop-percentage") dan de nieuwe, canonieke F7-adherence, maar de identieke naam is verwarrend. Actief gebruikt in productie (programma-regeneratie, weekoverzicht) en NIET vervangen: het risico van herschrijven valt buiten de scope van deze sprint. Vastgelegd als GAP-P3-023 (niet-blokkerend).

## Nieuw gebouwd: F7 Dashboard 2.0-sectie (renderF7Attention(), index.html)
Nieuwe container #home-f7-attention, geplaatst in de ATTENTION-laag. Uitsluitend consumptie:
- Plateau: roept PlateauDetectionCore.classify() aan op de al-opgehaalde sessiecache. Toont een kaart uitsluitend bij de expliciete PLATEAU-state, nooit bij STAGNATION_CANDIDATE. Maximaal een plateau-kaart.
- Adherence: roept AdherenceIntelligenceCore.aggregate() aan op het actieve programma. Toont een kaart uitsluitend bij een geldig percentage onder 60%, geen kaart bij NOT_AVAILABLE/INSUFFICIENT_DATA.

Geen enkele berekening zelf uitgevoerd.

## Empty states
Geen schema, onvoldoende data, of geen plateau/lage-adherence -> de container blijft leeg. Geen fake "stabiel"/"goed"-tekst.

## Tests
core/fDashboardF7Consumption.test.js (nieuw, 9/9): bevestigt uitsluitend canonieke consumptie, correcte lege staat, en dat computeProgramProgress() ongewijzigd is gebleven. Sabotagebewijs geleverd.

## Versiebeheer
APP_VER v4.69.16 -> v4.69.17.

## MS-F7-05 acceptance-gate-toetsing
Letterlijke acceptance gate: "Longitudinal insights converted into action."
Resultaat: CLOSED. Een nieuwe, kleine, correcte Dashboard-sectie consumeert de canonieke MS-F7-02/03-outputs zonder shadow-berekening. Een pre-existing, buiten-scope naamsverwarring gedocumenteerd als niet-blokkerend gap.
