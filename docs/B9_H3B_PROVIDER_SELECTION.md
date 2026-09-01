# B9-H3B Provider Selection

## GARMIN

**IMPLEMENTED / BLOCKED / NOT SELECTED:** BLOCKED
**WHY:** geen Garmin Connect Developer Program-toegang, geen API-
sleutel, geen client-ID/secret beschikbaar in deze omgeving (`env`-
scan: 0 resultaten). Garmin se Connect IQ/Health API vereist een
handmatige, goedgekeurde developer-registratie bij Garmin zelf --
een externe, meerdaagse goedkeuringsprocedure die buiten deze sessie
valt (conform sectie 3 van de opdracht: "externe developer-
accountgoedkeuring" is een expliciete stopreden).
**DEVELOPER ACCESS:** Geen.
**REAL API TEST:** BLOCKED.
**REAL DEVICE TEST:** BLOCKED.

## FALLBACK PROVIDER RESULTAAT

**SELECTED FALLBACK:** Google Health API v4, `exercise`-datatype
(uitbreiding van de reeds bestaande, productie-actieve Google Health-
integratie voor HRV/RHR/sleep).

**WHY:** conform sectie 10 van de opdracht ("Fitbit/Google Health
uitbreiding" als expliciete kandidaat). De app heeft al een volledig
werkende, geautoriseerde OAuth2-verbinding met Google Health
(client-ID/secret al geconfigureerd in productie, token-vault al
gebouwd en getest). Officiële documentatie (developers.google.com/
health/data-types/workouts, geverifieerd augustus 2026) bevestigt een
`exercise`-datatype met `exerciseType` (RUNNING/BIKING/etc.),
tijdsinterval, en `metricsSummary` (afstand/calorieën) -- precies een
generieke, cross-sport activity-bron, toegankelijk via dezelfde,
bestaande provider-relatie. Dit is de enige route waarmee een echte
"cloud activity -> canonieke Trainingskompas-activity"-keten
softwarematig kon worden gebouwd zonder een nieuwe, externe provider-
registratie.

**REAL API:** de Google Health `exercise`-API zelf is een bestaande,
publiek gedocumenteerde, algemeen toegankelijke API (niet zelf
BLOCKED) -- de nieuwe, benodigde OAuth-scope
(`googlehealth.activity_and_fitness.readonly`) is toegevoegd aan de
bestaande OAuth-flow in code. **Een mogelijke, resterende externe
stap:** of deze specifieke scope al is vrijgegeven op het OAuth-
consent-scherm in de Google Cloud Console van het productieproject,
kon niet worden geverifieerd binnen deze sessie (geen toegang tot die
Console). Als de scope nog moet worden toegevoegd aan het consent-
scherm, is dat een korte, zelfstandige actie voor de Product Owner in
de bestaande Google Cloud Console (geen nieuwe provider-registratie,
geen nieuw contract) -- geen blokkade voor de software zelf, die
volledig, correct gebouwd en getest is.

**RUNNING:** softwarematig volledig geïmplementeerd en getest (zie
`docs/B9_H3B_RUNNING_CYCLING_INTEGRATION_REPORT.md`).
**CYCLING:** softwarematig volledig geïmplementeerd en getest, zelfde
document.

## Waarom niet Strava/Health Connect/Apple HealthKit

Geen van deze had een bestaande, al geautoriseerde, productie-actieve
OAuth-verbinding binnen deze codebase -- elke zou een volledig nieuwe
provider-registratie (Strava API-app, Apple Developer-account voor
HealthKit-entitlements) hebben vereist, wat conform sectie 3 van de
opdracht een stopreden is. De Google Health-uitbreiding was de enige
route die met de bestaande, reeds geautoriseerde infrastructuur kon
worden gebouwd.
