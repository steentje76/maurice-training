# MS-F7-01_ATHLETE_TREND_MODEL.md — Trainingskompas

**Canonieke naam/acceptance:** "Athlete Trend Model" -- "Unified longitudinal trend layer." P1, dependency MS-F3-08 (CLOSED).

## Baseline audit
Zie docs/F7_EXISTING_INTELLIGENCE_INVENTORY.md. TK heeft al twee, bewust-verschillende trendmethoden (ProgressionCore.trendBy() en CalcCore.trendClassify()), plus PR-detectie en een gedeelde e1RM-trendbron (computeExerciseTrends()) al gebruikt door UI en AI-coach.

## Waarom geen nieuwe berekeningsengine
trendBy() en trendClassify() zijn geen duplicatie -- ze lossen fundamenteel verschillende problemen op: identity-gebonden vergelijking versus ongefilterde dagreeks-classificatie. Beide blijven ongewijzigd bestaan. "Unified longitudinal trend layer" wordt hier geinterpreteerd als één gedeeld outputcontract boven beide bronnen, niet één rekenformule.

## Nieuw gebouwd: LongitudinalTrendCore (core/longitudinalTrend.js)
Twee functies: fromTrendBy() en fromTrendClassify(), die een ongewijzigd resultaat van de bestaande bronnen omzetten naar het canonieke schema longitudinal_trend.v1: schema, status, metric, domain, context, direction, observation_count, time_window, latest, baseline, magnitude, confidence, calculation_version, source_note. Beide bronnen retourneren identieke veldensets.

## Directionality blijft metric-aware
direction wordt nooit hardcoded op "hoger=beter" -- de bestaande improving/richting-velden van de bronnen worden direct overgenomen, geen eigen interpretatie toegevoegd.

## Confidence
Afgeleid van observation_count ten opzichte van het minimum dat de bron zelf al hanteerde -- geen nieuwe statistiek verzonnen, geen fabricage bij onvoldoende data.

## Tests
core/fLongitudinalTrendCore.test.js (nieuw, 11/11): golden cases voor beide bronnen, bevestiging van het gedeelde schema, determinisme. Sabotagebewijs geleverd.

## MS-F7-01 acceptance-gate-toetsing
Letterlijke acceptance gate: "Unified longitudinal trend layer."
Resultaat: CLOSED. Bestaande infrastructuur bevestigd en geformaliseerd tot één gedeeld outputcontract, zonder de legitiem verschillende berekeningsmethoden te forceren tot één formule.
