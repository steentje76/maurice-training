# TRAININGSKOMPAS_COMPLETE_FUNCTIONALITY_REGISTER.md

Canoniek, repo-breed functionaliteitsregister. Basis voor de Final
Repo-Wide Functional Freeze Audit. Opgesteld tegen main
b2b470dedb36b47a877a588790bf27f39c7e0cfc. Dit is een EERSTE, structurele
volledige inventarisatie (schermen/entry points/modules/migraties) --
geen regel-voor-regel her-audit van elke functie-body. Waar een
diepere audit al eerder is gedaan (Devices/Wearables, F13 Security,
B9-H3B/H3C) wordt daarnaar verwezen i.p.v. herhaald.

## Reikwijdte-opmerking (Wearables-uitzondering, sectie 1 van de opdracht)

Devices/Wearables is SOFTWARE FUNCTIONAL, EXTERNAL VALIDATION REGISTER
OPEN (zie docs/WEARABLE_ACTIVATION_AND_DEVICE_PROOF.md). Dat blokkeert
deze audit niet en wordt hieronder niet opnieuw beoordeeld op P0/P1 --
alleen genoemd voor volledigheid van de inventaris.

---

## 1. Schermen (79 gevonden, `id="s-*"` in index.html)

Gegroepeerd op domein:

- **Auth/onboarding**: s-auth, s-auth-newpass, s-onboarding, s-intake
- **Home/navigatie**: s-home, s-meldingen, s-help, s-privacy, s-settings, s-profiel
- **Training**: s-train-mgr, s-train-mine, s-train-detail, s-builder, s-guided, s-programma, s-programma-detail, s-kalender, s-availability, s-doelen, s-library
- **Sportspecifiek**: s-cycling, s-cycling-insights, s-running, s-running-insights, s-swimming, s-swimming-insights, s-hyrox, s-hyrox-perf
- **Lichaam/gezondheid**: s-lichaam, s-lich-gegevens, s-lich-health, s-lich-metingen, s-lich-metric, s-lich-cyclus, s-lich-spier, s-lich-spieren, s-lich-verband, s-lich-verbanden, s-lich-oefeningen
- **Voeding** (grootste domein qua schermenaantal, 21 schermen): s-voeding + 20 sub-schermen (maaltijden/scanner/foto-flow/kennis/supplementen/hydratatie/correctie/matching -- zie de nutrition*-modules hieronder voor de backend-kant)
- **Social/coach**: s-social, s-messages, s-message-thread, s-coach, s-coachpt, s-coachpt-athlete
- **Stats/inzicht**: s-stats, s-inzicht, s-hist
- **Admin/team**: s-admin, s-admin-pin

Elk scherm is bereikbaar via `go('s-xxx')`; geen aanvullende, losstaande
router gevonden buiten dit ene patroon (geen tweede navigatiesysteem).

## 2. Netlify Functions (42 bestanden)

- **Wearables/devices** (28): wearable-* (6, incl. de gescheiden
  wearable-sync-activities.js, B9-H3B), garmin-* (5), oura-* (5),
  polar-* (5), whoop-* (5), plus 2 gedeelde libs
  (_wearableAuthLib.js, _wearableSyncLib.js) en wearableTokenVault.js.
  Zie docs/DEVICES_PROVIDER_TRACKER.md + WEARABLE_ACTIVATION_AND_DEVICE_PROOF.md
  voor de volledige, al-geauditeerde status per functie.
- **Billing** (4): billing-checkout.js, billing-verify-apple.js,
  billing-verify-google-play.js, billing-webhook.js.
- **Account/identiteit** (2): delete-account.js, cleanup-unverified-accounts.js.
- **Coach/team** (3): coach.js, gym-team.js, gym-team-set-pin.js.
- **Overig** (5): calendar-feed.js (ICS-export), nutrition-off-lookup.js
  (Open Food Facts-lookup), research-export.js, telemetry.js.

**Nog te verifieren in een vervolgpas**: of billing-* en de account-
functies elk daadwerkelijk vanuit de UI worden aangeroepen (dezelfde
soort "bestaat server-side maar nooit aangeroepen"-gat dat bij
wearable-sync-activities.js werd gevonden in de Wearables-sprint). Zie
sectie 5 (Bekende/vermoede gaten) hieronder voor de eerste steekproef.

## 3. Core-modules (101 bestanden, exclusief tests)

- **Voeding** (33 modules -- verreweg het grootste domein): nutrition*
  (barcode/camera/OCR/label-parsing/kennisbank/supplementen/hydratatie/
  maaltijden/discovery/degraded-state/cross-domain-contract/OFF-provider).
- **Social** (5): socialChallenge, socialGroup, socialIntelligence,
  socialPrivacy, socialSharing.
- **Coach/PT** (6): coachAccess, coachIntelligence, coachProgram,
  coachProgramming, coachRoster, coaching.
- **Team/organisatie** (4): teamAnalyticsCore, teamPerformance,
  organizationContextRuntime, organizationCore.
- **Sportspecifiek** (7): cyclingIntelligence, runningIntelligence,
  runningExecution, swimmingIntelligence, cycle.js, cycleTraining,
  enduranceExecution.
- **BLE/devices** (4): bleCyclingPower, bleCyclingSpeedCadence,
  bleHeartRate, ftmsCore, concept2Live, deviceIntegration,
  cloudActivityIngestion (B9-H3B).
- **Calculation/Decision/AI-core**: calculation.js, decision.js,
  aiOutputContract.js, intervalEngine.js, progression.js,
  plateauDetection.js, trainingLoad.js, scheduleAdherence.js,
  longitudinalTrend.js, adherenceIntelligence.js, adaptiveCoaching.js.
- **Overig/platform**: athlete.js, athleteConstraints.js,
  externalDataModel.js, entitlementCore.js, equipmentCore.js,
  platformRoles.js, relationship.js, messaging.js, weather.js,
  scientificEvidence.js, womensPerformanceContext.js, onboarding.js,
  myTrainingScheduling.js, calendarMonthView.js, calendarProjection.js,
  commonData.js, commercialUxCore.js, brandingCore.js,
  designSystemIcons.js, hydrationCalculation.js, movement.js,
  sportDefinition.js, dailyActivityCalculation.js, observability.js,
  nativeBarcodeScannerBridge.js, release-gate.js (testinfrastructuur,
  geen product-functionaliteit).

### BEVESTIGD DORMANT (geen enkele aanroep buiten de eigen test)
- **contextEngine.js** -- 0 treffers in index.html of enige andere
  core/netlify-functions-file buiten zijn eigen test. Eerder al
  geclassificeerd als "classificatie B, oud ontwerp" tijdens de
  Devices/Wearables-sprint (`buildCtx()` in index.html is de enige live
  AI-contextketen). Blijft dormant -- geen actie ondernomen, alleen
  bevestigd en hier geregistreerd zodat het niet opnieuw "herontdekt"
  hoeft te worden.

## 4. Database-migraties (83 bestanden, v479 t/m v561 range zichtbaar in de repo)

Niet individueel doorgenomen deze pas (83 bestanden, elk al bij eigen
sprint gereviewd/live-geverifieerd op het moment van uitvoeren). Laatste:
migratie_v561.sql (Garmin wearable_oauth_state.provider/code_verifier,
bevestigd live in productie tijdens de Garmin-sprint).

---

## 5. Bekende/vermoede gaten

### GEVONDEN EN BEVESTIGD DEZE PAS: billing/checkout volledig onbereikbaar

**Bevinding**: `billing-checkout.js`, `billing-verify-apple.js` en
`billing-verify-google-play.js` (MS-F12-04, Billing & Reconciliation)
zijn volledig gebouwd en getest server-side, maar hebben **nul**
aanroepen repo-breed buiten hun eigen dedicated testbestanden
(fBillingCheckout.test.js, fBillingVerifyApple.test.js,
fBillingVerifyGooglePlay.test.js). Geen native IAP-bridge-bestand
gevonden in native/. `entitlementCore.js` wordt wel geladen en gebruikt
om de plan-status van een gebruiker te LEZEN
(individual_plan_key/individual_plan_status/individual_plan_expires_at,
regel ~12188 van index.html), maar nergens in de hele UI bestaat een
knop, CTA, of flow die daadwerkelijk `billing-checkout.js` aanroept.

**Consequentie**: een gebruiker kan momenteel op geen enkele manier via
de app een betaald abonnement afsluiten of upgraden -- de volledige
monetisatie-/betaalketen is functioneel een doodlopende weg, ondanks dat
de server-side logica (prijsautoriteit, Mollie-integratie,
webhook-bevestiging) volledig klaar en getest is.

**Classificatie**: exact hetzelfde gat-type als wearable-sync-activities.js
in de Devices/Wearables-sprint (bestaat, is beveiligd/getest, maar
nergens aan de UI gekoppeld) -- alleen met een aanzienlijk groter
productmatig gewicht (geen betaalpad = geen omzet via de app).
Dit is een NIEUW gevonden, echt softwarematig gat (ontbrekende UI-
koppeling), geen credential-/hardware-blokkade zoals bij Wearables.

**PRIORITEIT**: P1 (mogelijk hoger, productbeslissing aan PO) --
technisch geen crash/databeschadiging, maar een compleet ontbrekende
kernfunctionaliteit (betalen) die al wel gebouwd klaarligt. Wordt NIET
in deze beurt gerepareerd (buiten de scope van "inventariseren" naar
"repareren" zonder PO-bevestiging dat dit inderdaad de bedoeling is --
mogelijk is er een bewuste productreden voor een nog-niet-actieve
betaalflow, bv. een bewuste bèta-periode zonder betaalmuur). PO ACTION:
bevestigen of dit een bewust nog-niet-actieve flow is, of een echt
vergeten koppeling die in een gerichte PR moet worden hersteld.

### Overige, kleinere bevindingen
- **wearable-sync-activities.js** (B9-H3B): zelfde gat-patroon, al
  gerepareerd in de Fitbit Successor Certification-sprint. Precedent.
- **contextEngine.js**: dormant, zie sectie 3 -- geen actie, geen schade.
- `cleanup-unverified-accounts.js` en `billing-webhook.js` hebben
  terecht 0 client-side aanroepen (respectievelijk een geplande
  achtergrondtaak en een server-to-server webhook-target) -- GEEN gat,
  expliciet gecontroleerd en uitgesloten.
- Verdere systematische controle van UI-koppeling voor de resterende
  Netlify functions (coach.js, gym-team*, research-export.js,
  calendar-feed.js, nutrition-off-lookup.js, telemetry.js) is deze pas
  wel gedaan (zie sectie 2 aanroeptellingen) en toont geen vergelijkbaar
  gat -- allemaal ≥1 aanroep vanuit index.html.

## 6. Nog niet gedaan in deze pas (transparant vermeld)

Dit eerste register dekt de structurele inventaris (schermen, functies,
modules, migraties), UI-koppelingscontrole voor alle 42 Netlify
functions (met één bevestigd, significant gat: billing/checkout), en
één bevestigd dormant systeem (contextEngine.js). Wat deze pas NIET
bevat en in een vervolgpas hoort: (a) duplicate/shadow-system-scan
tussen core-modules onderling (bv. of twee cycling-gerelateerde modules
elkaar overlappen); (b) canonical-aansluiting per scherm (schrijft elk
scherm daadwerkelijk naar de juiste tabel via de juiste RPC); (c)
formele P0/P1-telling voor dit register specifiek (de bestaande
P0=0/P1=0 in CURRENT_STATE.md/GAP_ANALYSIS_V2.md dekt de tot nu toe
bekende issues -- het billing-gat hierboven is NIEUW gevonden deze pas
en moet nog worden opgenomen in die telling zodra de PO bevestigt dat
het een echt te repareren gat is, niet een bewuste productkeuze).
