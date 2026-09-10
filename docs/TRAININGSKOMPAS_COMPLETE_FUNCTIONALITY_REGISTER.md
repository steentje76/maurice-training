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

### PRODUCTBESLISSING (PO, bevestigd): billing/checkout is BEWUST inactief

De PO heeft bevestigd: de ontbrekende betaal-/checkoutflow is een
bewuste, intentionele keuze -- geen vergeten koppeling. Classificatie:

```
COMMERCIAL / BILLING
- Backend/server-side capability:      AANWEZIG (MS-F12-04, volledig
                                        gebouwd en getest: prijsautoriteit,
                                        Mollie-integratie, webhook-
                                        bevestiging)
- billing-checkout.js:                 INTENTIONAL DORMANT-FROM-UI
- billing-verify-apple.js:             INTENTIONAL FUTURE NATIVE IAP HOOK
- billing-verify-google-play.js:       INTENTIONAL FUTURE NATIVE IAP HOOK
- Huidige fase:                        BETA / PRE-COMMERCIAL
- Product accessibility:               DEFERRED BY PRODUCT OWNER
- P0:                                  Geen
- P1:                                  Geen
- Functional freeze blocker:           Nee
```

Geen upgrade-knop, checkoutscherm of IAP-bridge wordt gebouwd tijdens
deze audit. Commerciele activatie is een aparte, toekomstige product/
commercial sprint, gepland na de huidige functional freeze en/of tijdens
de voorbereiding op livegang. Dit item is hiermee AFGESLOTEN voor de
Final Repo-Wide Functional Freeze Audit -- het telt niet mee in de P0/P1
telling van deze audit en blokkeert de freeze-beslissing niet.

### Overige, kleinere bevindingen
- **wearable-sync-activities.js** (B9-H3B): zelfde gat-patroon, al
  gerepareerd in de Fitbit Successor Certification-sprint. Precedent.
- **contextEngine.js**: dormant, zie sectie 3 -- geen actie, geen schade
  (bewust vervangen door buildCtx(), eerder al vastgesteld).
- `cleanup-unverified-accounts.js` en `billing-webhook.js` hebben
  terecht 0 client-side aanroepen (respectievelijk een geplande
  achtergrondtaak en een server-to-server webhook-target) -- GEEN gat,
  expliciet gecontroleerd en uitgesloten.
- Verdere systematische controle van UI-koppeling voor de resterende
  Netlify functions (coach.js, gym-team*, research-export.js,
  calendar-feed.js, nutrition-off-lookup.js, telemetry.js) is deze pas
  wel gedaan (zie sectie 2 aanroeptellingen) en toont geen vergelijkbaar
  gat -- allemaal ≥1 aanroep vanuit index.html.

### NIEUW GEVONDEN (audit-pas 2): dead UI-element + 6 niet-geintegreerde core-modules

**Dead UI (klein, nul huidige impact)**: een knop
(`id="tenant-brand-admin-btn"`, "Uitstraling beheren") heeft
`onclick="tenantBrandingAdminEdit()"` -- die functie bestaat nergens in
de codebase. De knop staat permanent op `style="display:none"` en er is
geen enkele plek gevonden die dit ooit op zichtbaar zet. Netto-impact op
gebruikers: nul (de knop is nooit te zien, dus nooit aan te klikken).
Classificatie: onafgemaakte/orphaned feature-rest, GEEN P0/P1 (geen
enkel bereikbaar pad leidt hier ooit naartoe). Niet gerepareerd deze
pas -- onduidelijk of de bedoeling was de functie alsnog te bouwen
(nieuwe feature, buiten scope van deze audit) of de dode knop te
verwijderen (cleanup, geen dringende noodzaak zolang hij onzichtbaar
blijft).

### Classificatie van de 6 (+1 nieuw gevonden) ongebruikte modules (item 14)

Onderzocht tegen `docs/TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md` (een
eerdere, eigen architectuuraudit) en tegen de git-geschiedenis (bevestigd:
al onge?ntegreerd sinds minstens commit 60eac70, ruim voor deze sessie --
geen recente regressie).

- **adaptiveCoaching.js**: CATEGORIE A (canonical, vergeten integratie).
  Expliciet genoemd in de architectuurdoc als onderdeel van de bedoelde
  Decision/Rules Engine-laag. Behandelt readiness+RPE-trend-gebaseerde
  automatische trainingsaanpassingen met coach-override
  (`coach_approved`/`coach_overridden`) -- een ANDER concept dan het
  actief gebruikte `computeProgAdjustment()` (via DecisionCore,
  spierherstel-gebaseerd). Geen directe P1: er bestaat al een werkende,
  eenvoudigere aanpassingslogica in productie (computeProgAdjustment),
  dus V1-functionaliteit "automatische trainingsaanpassing" ontbreekt
  niet volledig -- dit is een niet-uitgerolde VERBETERING, geen gat.
- **coachProgramming.js**: CATEGORIE A, zelfde architectuurdoc-vermelding.
  Nader onderzoek nodig om te bevestigen of coachProgram.js (enkelvoud,
  actief F10.3/MS-F10-03) hetzelfde concept dekt -- niet afgerond deze
  pas.
- **externalDataModel.js**: CATEGORIE A, expliciet genoemd als
  Normalization/Canonical-laag in de architectuurdoc. Niet verder
  onderzocht deze pas of deviceIntegration.js dit al dekt.
- **platformRoles.js**: CATEGORIE A (waarschijnlijk) -- implementeert een
  rolhierarchie-autorisatiesysteem (hasAtLeastRole/canViewAthleteData/
  canManageOrganization/canManageTeam/canOverrideAdjustment). Inline in
  index.html bestaat wel eigen, eenvoudigere rolcontrole (3 treffers op
  gym_role/role_level/isCoach/isAdmin). BELANGRIJKE NUANCE (relevant
  voor auditpunt 9): dit is GEEN beveiligingsgat zolang server-side RLS
  autoritatief blijft -- client-side rolcontrole bepaalt alleen wat de
  UI toont, nooit wat de server toestaat. Wel een architectuur-inconsistentie
  (twee plekken die "wie mag wat" bepalen) die het risico op toekomstige
  divergentie vergroot.
- **teamPerformance.js**: ONDUIDELIJK (A of B) -- andere functienamen dan
  het wel-actieve teamAnalyticsCore.js (bv. buildTeamSummary vs.
  aggregateAttendance), dus mogelijk complementair i.p.v. duplicaat.
  Niet afgerond deze pas.
- **nutritionDegradedStateClassifier.js**: ONDUIDELIJK -- geen overlap
  gevonden met nutritionFoundation.js/nutritionFoundation2.js bij een
  eerste steekproef. Hoort thuis in de aparte, aangekondigde
  Nutrition-domeinpas (auditpunt 7), niet hier afgerond.
- **NIEUW GEVONDEN (bredere check deze pas)**: `coachProgram.js`
  (enkelvoud, F10.3/MS-F10-03 -- eerder abusievelijk als "actief"
  aangenomen) blijkt bij een strikte controle OOK nul referenties te
  hebben (geen `<script src>`-tag, geen `require()` elders). De eerdere
  "6 ongebruikte modules"-telling was hiermee onvolledig. Dit vereist
  een aparte, bredere herscan van ALLE 101 core-modules met een
  consistente, geverifieerde methode (script-tag-check EN require-check
  gecombineerd) -- niet afgerond deze pas, expliciet als openstaand
  geregistreerd i.p.v. het bestaande "6"-aantal ten onrechte te laten
  staan.

**Geen van de hierboven onderzochte modules krijgt een P1** -- voor geen
enkele is aangetoond dat V1-functionaliteit daadwerkelijk ontbreekt voor
de gebruiker (het dichtstbijzijnde geval, adaptiveCoaching.js, heeft een
werkende, eenvoudigere vervanging in productie). Verdere clas­sificatie
van coachProgramming/externalDataModel/teamPerformance/
nutritionDegradedStateClassifier en de volledige herscan blijven
openstaand.

## 6b. Security/RLS-steekproef (item 15 van de opdracht)

Live geverifieerd tegen productie (niet aangenomen): **117 van de 117**
publieke tabellen hebben Row Level Security actief (100%). Geen enkele
tabel zonder RLS aangetroffen. Dit is een sterke, positieve bevinding --
geen verdere actie nodig voor dit deelaspect. (Beperking: dit bevestigt
dat RLS AAN staat, niet dat elke policy inhoudelijk correct is -- dat
vereist per-tabel beleidsinhoud doorlezen, niet gedaan in deze pas.)

## 6c. Repo-brede TODO/FIXME/HACK/placeholder/deprecated-scan (item 17)

Uitgevoerd over index.html, core/*.js (excl. tests) en
netlify/functions/*.js. Resultaat: **schoon** -- geen enkele echte
TODO/FIXME/HACK-marker aangetroffen. De enkele treffers op "todo" en
"placeholder" bleken bij inspectie stuk voor stuk vals-positief
(een variabele `todoNote` met een UI-hinttekst, en legitieme HTML
`placeholder`-attributen/CSS `::placeholder`-selectors).

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
bekende issues; het billing-gat is door de PO bevestigd als bewuste,
intentionele keuze -- BETA/PRE-COMMERCIAL -- en telt niet mee in de
P0/P1-telling, zie sectie 5).

## 8. Canonical aansluiting per scherm -- Batch 1 (Training-domein, diep gecontroleerd per opdracht-item 4)

**Bevinding: canonical, geen parallelle completion-engine gevonden.**
Geverifieerd: precies één `finishSession()` (regel 21833, de echte
afrondingsfunctie -- `finishSessionNoSave()` is een bewust aparte,
niet-opslaande varkeuze, geen duplicaat-pad), die de enige
`completeTrainingInstance()` (regel 8765) aanroept, die op zijn beurt de
enige directe schrijfactie naar de `sessions`-tabel uitvoert (met
`resolution=ignore-duplicates` voor idempotency). Bevestigde
call-sites: normale sessie-afronding (21942), de Guided-workout-flow
(34696, expliciet in commentaar vermeld als "dezelfde afronding als in
finishSession"), en Hyrox (32768). Dit dekt PREVIEW->EXECUTION->LOGGING->
COMPLETE voor de generieke trainingsflow, Guided, en Hyrox.

**Historische context in de code zelf** (niet een huidig probleem, maar
relevant voor deze audit): meerdere commentaarregels (20698, 21932,
29132) documenteren EERDERE bugs waarbij `completeTrainingInstance()`
bestond maar niet werd aangeroepen (verweesde 'active'-instances). Deze
zijn zichtbaar al gerepareerd -- de huidige call-sites bewijzen dat de
aanroep nu wel plaatsvindt. Dit is een voorbeeld van precies het soort
gat dat deze audit moet opsporen, en het bewijst dat zulke gaten in het
verleden ook daadwerkelijk zijn gevonden en gedicht.

**Nog NIET apart geverifieerd binnen dit batch** (tijdslimiet van deze
pas): of running/cycling/swimming/multisport-schermen elk zelf ook via
dezelfde `finishSession()`/`completeTrainingInstance()`-keten lopen, of
via een eigen variant (het patroon "roept completeTrainingInstance aan
als er iets gelogd is" is aangetoond voor Guided en Hyrox specifiek,
niet 1-op-1 voor elk van de losse sportschermen nagelopen). Aanbevolen
vervolgstap in een volgende batch.

**P0/P1 voor dit batch: geen gevonden.**

Eerlijke, expliciete stand per punt -- geen enkel punt hieronder wordt
als "afgerond" gemarkeerd tenzij dat ook echt is gebeurd:

1. Duplicate/shadow system scan: DEELS -- 6 ongebruikte "fundering"-
   modules gevonden (sectie 5), oorzaak per module nog te bepalen.
2. Canonical aansluiting per scherm: NOG NIET GEDAAN.
3. Dead UI audit: DEELS -- alle onclick-handlers repo-breed
   gecontroleerd tegen bestaande functienamen, 1 echte dode knop
   gevonden (sectie 5), nul praktische impact.
4. Backend-only capability audit: GEDAAN voor alle 42 Netlify functions
   (sectie 2/5) -- 1 significant gat (billing, nu PO-bevestigd bewust).
5. Hidden/semi-hidden functionality: DEELS, zie punt 1.
6. Legacy/dormant/orphaned code: DEELS, zie punt 1 + contextEngine.js
   (al eerder bevestigd).
7. Training workflow canonicality: NOG NIET GEDAAN.
8. Team/Gym legacy-vs-canonical audit: NOG NIET GEDAAN.
9. Nutrition full-flow audit: NOG NIET GEDAAN (grootste domein qua
   omvang -- 33 core-modules, 21 schermen -- vereist een eigen,
   gerichte pas).
10. Social block/privacy coherence: NOG NIET GEDAAN.
11. Coach/PT canonical paths: NOG NIET GEDAAN.
12. Analytics reachable-vs-backend-only: NOG NIET GEDAAN.
13. Auth/account lifecycle: NOG NIET GEDAAN.
14. Offline/resilience: NOG NIET GEDAAN.
15. Security/RLS evidence levels: GEDAAN (steekproef) -- 117/117
    publieke tabellen hebben RLS actief, live geverifieerd. Beperking:
    bevestigt RLS-AAN, niet policy-inhoud per tabel.
16. Production schema consistency: NOG NIET GEDAAN.
17. Repo-wide TODO/FIXME/HACK/placeholder/deprecated-scan: GEDAAN --
    schoon, geen echte treffers.

**Conclusie voor de freeze-beslissing**: deze audit is nog NIET compleet
genoeg om een freeze-beslissing op te baseren. 4 van de 17 punten zijn
(deels) gedaan met concrete bevindingen; 13 punten zijn nog niet
onderzocht. Geen enkel tot nu toe gevonden punt is een bevestigd P0 of
P1 (het dode-knop-geval heeft nul impact; de 6 ongebruikte modules zijn
nog niet geclassificeerd als schadelijk vs. onschadelijk). Een volgende
pas moet in elk geval punt 2 (canonical aansluiting), 9 (voeding, het
grootste domein) en 13 (auth-lifecycle) prioriteren.
