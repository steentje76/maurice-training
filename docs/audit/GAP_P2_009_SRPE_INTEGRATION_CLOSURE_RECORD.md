# GAP-P2-009 ? sRPE integration closure record

**Status:** CLOSED_PROVEN
**Datum:** 1 oktober 2026
**Verification baseline:** `ee277c920cabda6a375f270a6b13dc42ed01ee9c`
**Product decision:** DEC-049

## Waarom de oude gap niet meer actueel is

De oorspronkelijke gap stelde dat `TrainingLoadCore.sessionLoadSRPE()` en `rollingLoadSum()` wel bestonden, maar nergens in UI of AI-context werden gebruikt. Dat was historisch juist, maar latere B9/endurance-sprints hebben de capability ge?ntegreerd.

## Huidig bewijs

- **Running UI:** zichtbare kaart `Belasting`; rolling load in AU, uitsluitend over runs met RPE; expliciete empty state bij ontbrekende RPE.
- **Cycling UI:** dezelfde canonical calculation en dezelfde missing-RPE-semantiek voor ritten.
- **Swimming UI:** dezelfde canonical calculation en dezelfde missing-RPE-semantiek voor trainingen.
- **Erg analytics:** hergebruik van dezelfde calculation; ontbrekende RPE resulteert in `null`, niet in een geschatte load.
- **AI-context:** `tkEnduranceCoachContext()` levert reeds berekende 7 d/28 d sRPE met coverage en labelt dit als CALC-LOAD-003/005; de tekst verbiedt ACWR-/blessure-interpretatie.

## Regressies op current code

- `core/fB9_03RunningIntelligence.test.js`: 17/17
- `core/fCyclingIntelligenceCore.test.js`: 7/7
- `core/fB9_05CyclingIntelligence.test.js`: 14/14
- `core/fSwimmingFoundation.test.js`: 22/22
- `core/fSwimmingFeasibility.test.js`: 6/6
- `core/fErgAnalyticsProjection.test.js`: 88/88
- `core/fEnduranceCoachContext.test.js`: 39/39

## Productbeslissing

DEC-049 sluit het resterende ontwerppunt: sRPE en ACWR worden niet tot ??n score samengevoegd. sRPE blijft sport-specifiek zichtbaar waar de inputs aanwezig zijn; ACWR blijft afzonderlijk. Daarmee is de capability bruikbaar zonder een parallelle load-engine, schijnprecisie of een nieuwe blessureclaim.

## Scope

Deze closure is governance/documentatie. Zij voegt geen nieuwe calculation, databasekolom, Decision Rule of AI-rekenpad toe. De reeds bestaande runtime-integratie wordt alleen opnieuw bewezen en canoniek geregistreerd.
