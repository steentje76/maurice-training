# F7_EXISTING_INTELLIGENCE_INVENTORY.md — Trainingskompas

**Doel:** volledige audit van bestaande longitudinale intelligentie vóór F7-implementatie.

## Kernbevinding: uitzonderlijk mature, reeds bestaande infrastructuur
Repo-brede zoekactie bevestigt: TK heeft al twee, bewust-verschillende, complementaire trendmethoden en een uitgebreide adherence-basis.

## Capability-inventaris

| Capability | Calculation | Runtime | Decision | UI | AI | Tests | Status |
|---|---|---|---|---|---|---|---|
| Kracht-e1RM-trend per oefening | ProgressionCore.trendBy() (key=exercise_id) via computeExerciseTrends() | Actief, gedeelde bron voor UI + AI-coach | Nee (descriptief) | Voortgangsscherm | tkProgressionTrendContext() voedt AI-coach | Bestaand | PRODUCTION |
| Endurance pace/vermogen-trend | ProgressionCore.trendBy() (hergebruikt in F6-01/02/03) | Functioneel bewezen, niet gewired in UI | Nee | Nee | Nee | Bestaand (F6) | IMPLEMENTED (niet INTEGRATED) |
| HRV/RHR/slaap-trend | CalcCore.trendClassify() (ongefilterde dagreeks) | Actief, tkTrendRegel() | Nee | Statistiekenscherm | Nee | Bestaand | PRODUCTION |
| PR-detectie | ProgressionCore.isNewBest()/bestBy()/recordsBy() | Bestaand | Nee | Bestaand | Nee | Bestaand | PRODUCTION |
| Trainingsconsistentie (descriptief) | tkConsistencyCounts() | Actief, refreshConsistency() | Nee | Statistiekenscherm | Nee | Bestaand | PRODUCTION (puur descriptief, geen adherence-tegen-schema) |
| Schema-adherence (planned vs. completed) | ScheduleAdherenceCore.resolveScheduleGap()/sessionsMissed()/resolveRescheduleDecision() | Actief, bij programmaherplanning | Impliciet (COMPLETED/SKIPPED/MISSED/FUTURE/rescheduled) | Programmascherm | Nee | Bestaand (F4) | PRODUCTION -- geen geaggregeerd adherence-percentage/-trend over tijd |
| Exercise Stagnation / Plateau | Geen | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | NOT_IMPLEMENTED -- genuine lacune voor MS-F7-02 |
| Relationship Intelligence | Geen | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | NOT_IMPLEMENTED -- genuine lacune voor MS-F7-04 |
| Dashboard 2.0 | Bestaand Home-scherm | Actief | -- | Bestaand | Bestaand | Bestaand | Te auditen in MS-F7-05 |

## Belangrijke architecturale bevestiging: geen ongewenste trend-duplicatie
ProgressionCore.trendBy() en CalcCore.trendClassify() zijn twee legitiem verschillende, complementaire methoden, geen toevallige duplicatie:
- trendBy(history, key, field, dir, minN): opereert op objecten met een expliciete context-identity-sleutel, stap-gebaseerde vergelijking. Geschikt voor prestatiematen waar identiteit/context cruciaal is.
- trendClassify(values, opts): opereert op een ongefilterde array van dagwaarden, eerste-helft/tweede-helft-gemiddelde-vergelijking. Geschikt voor dagelijkse gezondheidsmetrics waar geen identity-context nodig is.

Beide methoden blijven bestaan; MS-F7-01 documenteert dit formeel als het canonieke antwoord op "unified longitudinal trend layer", niet geforceerd tot één algoritme.

## Genuine lacunes voor F7
1. Geaggregeerd adherence-percentage/-trend over tijd ontbreekt.
2. Exercise Stagnation/Plateau ontbreekt volledig -- MS-F7-02.
3. Relationship Intelligence ontbreekt volledig -- MS-F7-04.
4. Dashboard 2.0 vereist een audit op shadow-calculations vóór herontwerp -- MS-F7-05.
