# PROFIEL — CURRENT → CANONICAL → PROPOSED

Baseline: main `5e3808c6fdf85f7c8432b9b83f390abc947c30aa`, APP_VER v4.69.67.
Branch `feature/ux-profiel-canonical`. **Ontwerpstap — geen productcode.**

## 1. FORENSISCHE INVENTARISATIE (repo-breed, niet visueel)

Kaarten in `#s-profiel`, in renderingsvolgorde:
`pf-hero` · `tenant-brand-card` · `plan-huidig-card` ·
`pf-research-consent-card` · `profiel-atleet-card` ·
`profiel-conditions-card` · `profiel-team-card` · `profiel-wearable-detail`

Acties (uit `onclick`): `openAtleetModal` · `openPlanOverzicht` ·
`openPasswordReset` · `authSignOut` · `deleteAccount` · `addCondition` ·
`openTeamPinModal` · `openModal` · `openOfflineQueueModal` ·
`clearAppCache` · `setTheme` · `debugRestartOnboarding` ·
`tenantBrandingAdminEdit` · `go`

`#s-settings` is een APARTE route (meldingen, geluid, trillingen,
wake-lock, dynamische rusttijd, thema, taal, privacyuitleg, import/export,
wearable-status, offline-wachtrij, cache verversen, app-versie, debug).
Die route wordt in deze sprint **niet** samengevoegd of verplaatst.

## 2. FUNCTIEBEHOUD-MATRIX

| # | Functie | Huidige locatie | Afhankelijkheid | Canonical bestemming | Status |
|---|---|---|---|---|---|
| 1 | Profielfoto/avatar | `pf-hero` | `avatar_path` + canonical resolver | Profielkaart | BEHOUDEN (hergebruik) |
| 2 | Naam | `pf-hero` | `atleet.naam` | Profielkaart | BEHOUDEN |
| 3 | Niveau + sport | `pf-hero` subtitel | `atleet.niveau/sport` | Sportcontextrij | BEHOUDEN |
| 4 | Profiel bewerken | `pf-hero-edit` (44×44) | `openAtleetModal()` | Profielkaart | BEHOUDEN |
| 5 | AI Coach-status | pill in hero | statisch | Profielkaart | BEHOUDEN |
| 6 | Organisatie/tenant | `tenant-brand-card` | tenant-branding | Sectie Organisatie | BEHOUDEN |
| 7 | Uitstraling beheren | `tenant-brand-admin-btn` | `tenantBrandingAdminEdit()` | Organisatie | **P3: handler bestaat niet** |
| 8 | Huidig plan | `plan-huidig-card` | `individual_plan_*` | Sectie Abonnement | BEHOUDEN |
| 9 | Plannen vergelijken | plan-kaart | `openPlanOverzicht()` | Abonnement | BEHOUDEN |
| 10 | E-mailadres | `account-email-lbl` | `authSession.user.email` | Account | BEHOUDEN |
| 11 | Inlogmethoden | `account-identities-lbl` | auth identities | Account | BEHOUDEN |
| 12 | Wachtwoord reset | rij | `openPasswordReset()` | Account | BEHOUDEN |
| 13 | Uitloggen | knop | `authSignOut()` | Accountbeheer | BEHOUDEN |
| 14 | Account verwijderen | knop | `deleteAccount()` | Accountbeheer | BEHOUDEN (destructief gescheiden) |
| 15 | Onderzoeksdeelname | `pf-research-consent-card` | research consent | Privacy & data | BEHOUDEN |
| 16 | Atleetprofiel | `profiel-atleet-card` | `atleet_profiel` | Profiel | BEHOUDEN |
| 17 | Condities | `profiel-conditions-card` | `athlete_conditions` | Profiel | BEHOUDEN |
| 18 | Team/PIN | `profiel-team-card` | `openTeamPinModal()` | Organisatie | BEHOUDEN |
| 19 | Wearable-status | `profiel-wearable-detail` | wearable connections | Apparaten | BEHOUDEN |
| 20 | Instellingen (s-settings) | aparte route | divers | blijft eigen route | ONGEWIJZIGD |

**Geen functie verwijderd. Geen functie verplaatst buiten Profiel.**

## 3. CURRENT vs CANONICAL — delta

Wat CURRENT al canonical doet: titel + subtitel "Account & voorkeuren",
uppercase sectielabels, witte kaarten op grijsblauw, teal icoonvlakken,
ruime radius, **en de zojuist gemergede canonical avatar werkt al**.

Verschillen:

| Aspect | CURRENT | CANONICAL `profiel-v0.1` | PROPOSED |
|---|---|---|---|
| Hero | donkere navy kaart | witte kaart | **navy behouden** (zie afwijking A) |
| Sportcontext | tekstregel in subtitel | drie kolommen (hoofdsport/doel/event) | canonical drie kolommen |
| Consistency-callout | ontbreekt | aanwezig | toegevoegd, alleen met echte data |
| Groepering | 8 losse kaarten | 3 groepen | canonical groepering, alle functies behouden |
| Organisatie | aanwezig | ontbreekt in mockup | **behouden** (current-rijkdom) |
| Abonnement | "Gratis" + vergelijken | "Premium"-badge | current-status behouden, geen checkout |

## 4. BEWUSTE AFWIJKINGEN VAN DE MOCKUP

**A. Hero blijft navy in plaats van wit.** De mockup toont een witte
profielkaart, maar CURRENT gebruikt een donkere navy kaart die visueel
overeenkomt met de "volgende actie"-kaart op Vandaag en Trainen. Die
navy hero is daarmee een herkenbaar TK-patroon geworden ná de mockup.
Wit maken zou consistentie met de andere canonical schermen verminderen.
**PO REVIEW REQUIRED** — ik draai dit om als je de mockup hier letterlijk wilt.

**B. Organisatie-sectie blijft.** Staat niet in de mockup, is echte
current-functionaliteit (tenant-branding). Verwijderen zou functieverlies zijn.

**C. Abonnement toont de echte status.** De mockup toont een
Premium-badge; CURRENT toont "Gratis" met "Plannen vergelijken".
De werkelijke status blijft leidend en er wordt geen checkout geactiveerd
(commercial blijft deferred).

**D. Geen `—` waar een betekenisvolle state bestaat.** E-mailadres en
inlogmethoden tonen nu `—` zonder sessie; in het voorstel worden dat
expliciete states ("Niet ingelogd" / laad-skeleton).

## 5. RISICO'S
- Hero-kleur is een PO-keuze (afwijking A), geen technische kwestie.
- `tenantBrandingAdminEdit()` bestaat niet: knop is permanent verborgen
  (P3, al eerder geregistreerd) — niet stilzwijgend activeren.
- `s-settings` niet samenvoegen; dat zou de scope breed openen.
