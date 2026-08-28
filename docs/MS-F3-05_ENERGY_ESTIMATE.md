# MS-F3-05_ENERGY_ESTIMATE.md — Trainingskompas

**Auditmethode:** repo-brede zoekactie naar calorieën/kcal/MET/BMR/RMR/TDEE in `index.html`, `core/*.js`, `core/deviceIntegration.js`.

## Kernbevinding: geen eigen energieberekening
Trainingskompas berekent zelf géén energieverbruik — geen MET-tabel, geen BMR/RMR/TDEE-formule, geen calorie-schattingsvergelijking. Alle calorie-/BMR-waarden zijn ofwel handmatig ingevoerd (workout-calorieën van een apparaatscherm, Tanita-scale-BMR) of rechtstreeks doorgegeven vanuit wearable-sync (`calories_total`). Dit is exact de architectuur die de acceptance gate vraagt: door zelf niets te berekenen, kan de app nooit ten onrechte een eigen precisie claimen boven wat de bron zelf rapporteert.

## Reeds correct vóór deze sprint
BMR wordt in de UI al gelabeld als `soort:'ingevoerd'` — een eerlijke, reeds bestaande markering dat dit geen TK-berekening is. Wearable-dagcalorieën-sync is al gemarkeerd als `'OPTIONAL', 'nog niet gemapt/gevalideerd'` — geen voortijdige claim.

## Bewuste keuze: BMR/RMR/TDEE blijft NOT_IMPLEMENTED
Meerdere wetenschappelijk verschillende BMR-vergelijkingen bestaan (Mifflin-St Jeor, Harris-Benedict, Katch-McArdle) met uiteenlopende resultaten. De roadmap schrijft geen methode voor. Zelf willekeurig kiezen zou een verzonnen productbeslissing zijn — geregistreerd als `PRODUCT_DECISION_REQUIRED` in plaats van gefabriceerd.

## Nieuw: test
`core/fEnergyEstimateRegistry.test.js` (10/10) bewaakt dat geen stille energieberekening wordt geïntroduceerd, dat `calPerMin` de triviale ratio blijft, en dat BMR/wearable-calorieën correct gelabeld blijven. Sabotagebewijs geleverd (een verboden `calculateBMR`-functie tijdelijk geïntroduceerd, exit 1 bevestigd, teruggedraaid).

## MS-F3-05 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Calories/estimates explicitly uncertain."*
**Resultaat: CLOSED.** De architectuur voldoet al volledig — geen productcodewijziging nodig.
