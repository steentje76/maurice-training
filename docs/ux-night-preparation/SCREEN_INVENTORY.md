# SCREEN_INVENTORY.md — Trainingskompas Screen Inventory

**Bron:** `index.html` (28.749 regels), fresh main `e3b8518`. Elk item hieronder is geverifieerd tegen een daadwerkelijk `id="s-..."`-scherm-element en de `go('s-...')`-navigatie-aanroepen.

**Routing-mechaniek:** `go('s-<id>')` toont het `<div class="scr" id="s-<id>">`-element. Vijf hoofdtabs in de bottom-navigatie: Home, Training, Lichaam, Coach, Voortgang.

## Onboarding/auth

| SCREEN-ID | Naam | Bereikbaar vanaf | Rol | Bestaat |
|---|---|---|---|---|
| s-auth | Login/registratie | App-start (niet-ingelogd) | iedereen | JA |
| s-auth-newpass | Nieuw wachtwoord instellen | Auth-flow (reset-link) | iedereen | JA |
| s-intake | AI-conversational intake | Na registratie | athlete | JA |
| s-onboarding | Onboarding-stappenwizard | Na intake | athlete | JA |

## Home

| SCREEN-ID | Naam | Doel | Belangrijkste data |
|---|---|---|---|
| s-home | Hoofdscherm | Dagoverzicht, snelle acties | vandaag-CTA, weekstats, coach-advies, programma-kaart |

## Training

| SCREEN-ID | Naam | Doel |
|---|---|---|
| s-train-mgr | Training-hub (geen actieve sport) | sportkeuze, overzicht |
| s-train-detail | Trainingsdetail | dagdetail binnen een programma |
| s-train-mine | "Mijn trainingen" | eigen, aangepaste trainingen |
| s-running | Hardlopen-hoofdscherm | running-overzicht, historie, insights-link |
| s-running-insights | Hardloop-inzichten | trends, critical speed, adherence |
| s-cycling | Fietsen-hoofdscherm | cycling-overzicht |
| s-cycling-insights | Fiets-inzichten | trends, critical power |
| s-hyrox | HYROX-hoofdscherm | HYROX-overzicht |
| s-hyrox-perf | HYROX-prestatie-overzicht | trend over meerdere races |
| s-guided | Guided workout builder | begeleide trainingsopbouw |
| s-builder | Trainingsbouwer | handmatige trainingsopbouw |
| s-programma | Programma-overzicht | lijst van programma's |
| s-programma-detail | Programmadetail | blokken/weken binnen een programma |
| s-kalender | Kalenderweergave | geplande trainingen op datum |
| s-library | Oefeningenbibliotheek | doorzoekbare exercise-catalogus |
| s-hist | Trainingshistorie | log van uitgevoerde sessies |

## Lichaam (Body/Recovery/Women's Performance hub)

| SCREEN-ID | Naam | Doel |
|---|---|---|
| s-lichaam | Lichaam-hoofdscherm | hub naar onderliggende subschermen |
| s-lich-gegevens | Lichaamsgegevens | gewicht, metingen-overzicht |
| s-lich-metingen | Metingen | historie van lichaamsmetingen |
| s-lich-metric | Metric-detail | trend van één specifieke meting |
| s-lich-health | Gezondheidsdata | HRV/RHR/slaap-overzicht (Recovery) |
| s-lich-cyclus | Cyclus | Women's Performance cyclus-tracking |
| s-lich-spieren | Spieren-overzicht | spiergroep-status |
| s-lich-spier | Spierdetail | detail per spiergroep |
| s-lich-oefeningen | Oefeningen per spier | gekoppelde oefeningen |
| s-lich-verbanden | Verbanden-overzicht | correlatie-analyses |
| s-lich-verband | Verband-detail | detail van één correlatie |

## Progress/analytics

| SCREEN-ID | Naam | Doel |
|---|---|---|
| s-stats | Voortgang-hoofdscherm | overkoepelende statistieken |
| s-doelen | Doelen | doelenoverzicht en -invoer |

## Recovery / Women's Performance

Geen aparte, losstaande top-level schermen buiten `s-lich-health` (Recovery) en `s-lich-cyclus` (Women's Performance) -- beide zijn subschermen van Lichaam, geen eigen bottom-nav-item.

## Wearables/devices

Geen apart `s-wearable*`-scherm gevonden. `renderWearableCard()`/`renderLichaamDevices()` tonen wearable-koppelstatus **binnen** bestaande schermen (Lichaam/Settings), geen eigen, top-level scherm.

## Social

| SCREEN-ID | Naam | Doel |
|---|---|---|
| s-social | Social-hoofdscherm | activiteitenfeed, groepen, challenges (B9-07/08) |

## Team / Coach/PT / Gym/Club

**Geen enkel `s-team*`/`s-coach-pt*`/`s-gym*`-scherm gevonden.** Dit bevestigt exact de conclusie uit eerdere sprints (B9-H2C/H2D): Team Operations en Coach/PT hebben een volledig gebouwde backend, maar 0 user-accessible UI. `s-coach` bestaat wel, maar dat is de **AI Coach-chatinterface** (`renderCoachReply`/`renderChatHist`), niet een Coach/PT-relatiebeheerscherm -- een potentiële naamsverwarring tussen "AI Coach" en "Human Coach/PT" (zie Sectie 7, Dubbelingen).

## Nutrition

| SCREEN-ID | Naam | Doel |
|---|---|---|
| s-nutrition | Voeding-hoofdscherm | maaltijd/hydratatie-logging (B9-09/10/11) |

## Settings/profile/privacy

| SCREEN-ID | Naam | Doel |
|---|---|---|
| s-profiel | Profiel | persoonlijke gegevens |
| s-settings | Instellingen | app-instellingen |
| s-privacy | Privacy | privacy-/consent-beheer |
| s-meldingen | Meldingen/notificaties | notificatie-overzicht |
| s-help | Help/contact | ondersteuning |

## Admin/support

| SCREEN-ID | Naam | Doel |
|---|---|---|
| s-admin | Adminpaneel | (gym-)beheerfunctionaliteit |
| s-admin-pin | Admin-pincode-invoer | toegangscontrole voor s-admin |

**TOTAAL: 44 daadwerkelijk gedefinieerde scherm-containers, 37 daarvan bereikbaar via een expliciete `go('s-...')`-aanroep elders in de code (de overige 7 -- s-auth, s-auth-newpass, s-intake, s-onboarding, s-hyrox-perf, s-lich-metric, s-lich-verband -- worden waarschijnlijk programmatisch geopend, niet via een statische `go()`-string; niet verder herleid binnen deze read-only inventarisatie).**
