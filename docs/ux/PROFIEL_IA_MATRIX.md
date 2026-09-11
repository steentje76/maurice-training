# PROFIEL / APP-INSTELLINGEN — VOLLEDIGE FUNCTIEMATRIX

Baseline main `5e3808c6…`. Repo-brede inventarisatie, niet gestopt bij markup of screenshot.

## KRITIEKE BEVINDING VOORAF

`#s-settings` is een **deprecated stub** (23 regels). De eigen inhoud luidt:
*"Instellingen staan nu overzichtelijk in je Profiel (Thema, Meldingen,
Synchronisatie, Over)"* met één knop terug naar Profiel.

Een eerdere productbeslissing heeft settings dus **bewust naar Profiel
geconsolideerd**. Optie B draait die beslissing om. Dat is legitiem — de
inventaris die tot die keuze leidde was onvolledig — maar het betekent:
- er is geen bestaande bestemming om functies "naartoe te verplaatsen";
- App-instellingen moet als echt scherm worden gebouwd en de stub vervangen;
- de stubtekst moet weg, anders spreekt de app zichzelf tegen.

NB: de stub bevat ook de oude emoji-nav met robot-icoon voor Coach — dat is
de afgekeurde AI-identiteit. Bij vervanging verdwijnt die vanzelf.

## VOLLEDIGE MATRIX

Classificatie: **A** eindgebruiker · **B** support · **C** developer/debug · **D** legacy/dood

| # | Functie | Huidige locatie | Handler | Data | Kl. | Nieuwe bestemming | Nieuw pad | Handler behouden | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Profielfoto | pf-hero | canonical avatar | `avatar_path` | A | Profiel-hero | Profiel | ja | BEHOUDEN |
| 2 | Naam | pf-hero | `refreshProfiel` | `atleet.naam` | A | Profiel-hero | Profiel | ja | BEHOUDEN |
| 3 | Niveau/sport | pf-hero | idem | `atleet.*` | A | Sportcontext | Profiel | ja | BEHOUDEN |
| 4 | Profiel bewerken | pf-hero-edit | `openAtleetModal()` | — | A | Profiel-hero | Profiel | ja | BEHOUDEN |
| 5 | AI Coach-entry | pf-pill | (geen bron) | — | A | Profiel-hero | Profiel → Coach | n.v.t. | NEUTRAAL LABEL |
| 6 | Consistency | — | `homeWeekSummary.activeDays` | canonical | A | Profiel | Profiel | hergebruik | TOEGEVOEGD |
| 7 | Atleetprofiel | profiel-atleet-card | `openAtleetModal()` | `atleet_profiel` | A | Trainingsprofiel | Profiel | ja | BEHOUDEN |
| 8 | Condities | profiel-conditions-card | `addCondition()` | `athlete_conditions` | A | Trainingsprofiel | Profiel | ja | BEHOUDEN |
| 9 | Organisatie | tenant-brand-card | — | tenant | A | Organisatie | Profiel | ja | BEHOUDEN |
| 10 | Uitstraling beheren | tenant-brand-admin-btn | `tenantBrandingAdminEdit()` | — | **D** | — | — | — | **DOOD (P3)** — handler bestaat niet, blijft verborgen |
| 11 | Team/PIN | profiel-team-card | `openTeamPinModal()` | teams | A | Organisatie | Profiel | ja | BEHOUDEN |
| 12 | Huidig plan | plan-huidig-card | — | `individual_plan_*` | A | Abonnement | Profiel | ja | BEHOUDEN |
| 13 | Plannen vergelijken | plan-kaart | `openPlanOverzicht()` | — | A | Abonnement | Profiel | ja | BEHOUDEN |
| 14 | Wearable-detail | profiel-wearable-detail | — | wearable conns | A | Apparaten | Profiel | ja | BEHOUDEN (primaire ingang) |
| 15 | Wearable-acties | profiel-wearable-actions | — | idem | A | Apparaten | Profiel | ja | BEHOUDEN |
| 16 | E-mailadres | account-email-lbl | — | `authSession` | A | Account | Profiel | ja | BEHOUDEN |
| 17 | Inlogmethoden | account-identities-lbl | — | auth identities | A | Account | Profiel | ja | BEHOUDEN |
| 18 | Wachtwoord reset | rij | `openPasswordReset()` | — | A | Account | Profiel | ja | BEHOUDEN |
| 19 | Privacy-route | Weergave-sectie | `go('s-privacy')` | — | A | Privacy & data | Profiel | ja | BEHOUDEN (primaire entry) |
| 20 | Onderzoeksdeelname | pf-research-consent-card | research consent | `research_consents` | A | Privacy & data | Profiel | ja | BEHOUDEN |
| 21 | Gegevens exporteren | Synchronisatie/Data | `openModal('m-export')` | — | A | Privacy & data | Profiel | ja | BEHOUDEN (één entry, geen duplicaat) |
| 22 | Uitloggen | rij | `authSignOut()` | — | A | Accountbeheer | Profiel | ja | BEHOUDEN |
| 23 | Account verwijderen | rij | `deleteAccount()` | — | A | Accountbeheer | Profiel | ja | BEHOUDEN (destructief gescheiden) |
| 24 | Meldingen-route | Meldingen-sectie | `go('s-meldingen')` | — | A | App-instellingen | Profiel → App-instellingen | ja | VERPLAATST |
| 25 | Geluid | sw-sound | toggle | voorkeur | A | App-instellingen | idem | ja | VERPLAATST |
| 26 | Trillingen | sw-haptics | toggle | voorkeur | A | App-instellingen | idem | ja | VERPLAATST |
| 27 | Scherm aan tijdens training | sw-wakelock | toggle | voorkeur | A | App-instellingen | idem | ja | VERPLAATST |
| 28 | Dynamische rusttijd | sw-dynrest | toggle | voorkeur | A | App-instellingen | idem | ja | VERPLAATST |
| 29 | Thema Light/Dark/Auto | theme-opt-* | `setTheme()` | voorkeur | A | App-instellingen | idem | ja | VERPLAATST |
| 30 | Taal | Taal-kaart | — | voorkeur | A | App-instellingen | idem | ja | VERPLAATST |
| 31 | Offline-wachtrij | settings-queue-sub | `openOfflineQueueModal()` | queue | A | App-instellingen | idem | ja | VERPLAATST |
| 32 | Online-status | settings-online-status | — | runtime | A | App-instellingen | idem | ja | VERPLAATST |
| 33 | Cache verversen | knop | `clearAppCache()` | — | **B** | App-instellingen | idem | ja | VERPLAATST (support) |
| 34 | App-versie | settings-app-ver | — | `APP_VER` | **B** | Over | idem | ja | VERPLAATST |
| 35 | Help/FAQ/Contact | knop | `go('s-help')` | — | A | Help & ondersteuning | idem | ja | VERPLAATST |
| 36 | Technische informatie | settings-debug-info | — | `APP_VER` + userAgent | **B** | Over Trainingskompas | App-instellingen | ja | BEHOUDEN (read-only, veiligheidsgecontroleerd) |
| 37 | Onboarding opnieuw bekijken | knop | `debugRestartOnboarding()` | — | **A/B** | Help & ondersteuning | App-instellingen | ja | BEHOUDEN (gebruikerslabel) |
| 38 | Snelnavigatie | knoppen | `go('s-home'/...)` | — | **D** | — | — | — | **LEGACY** — dupliceert bottom-nav |

## TELLING

- Totaal geïnventariseerd: **38**
- Klasse A (eindgebruiker): **33** → 100% heeft een bereikbaar nieuw pad
- Klasse B (support): 3 → cache opschonen, app-versie, technische informatie
- Klasse C (debug): **0** — zie classificatiecorrectie hieronder
- Klasse D (legacy/dood): 2 → #10 blijft verborgen P3, #38 dupliceert de bottom-nav

**LEGITIMATE USER-FACING FUNCTIONS: 100% ACCOUNTED FOR.**

## Geen duplicatie
- Export: één entry (Privacy & data), niet ook in App-instellingen.
- Privacy: één primaire entry op Profiel; diepere routes blijven erachter.
- Wearables: primaire ingang op Profiel, niet verstopt in App-instellingen.


## CLASSIFICATIECORRECTIE (PO-besluit)

De twee eerder als klasse C (developer/debug) geclassificeerde functies zijn
**onvoorwaardelijk onderdeel van de productie-UX**: er bestaat geen enkele
debug-/dev-conditie in de codebase (geen `isDev`, `DEV_MODE`, `debugMode`,
geen host-check) en beide staan in gewone markup zonder runtime-gate. Ze
waren dus al voor elke gebruiker zichtbaar en aanklikbaar.

De feitelijke productwerking is leidend, dus:

| Functie | Was | Wordt | Onderbouwing |
|---|---|---|---|
| Onboarding opnieuw bekijken | C | **A/B** | Niet-destructief (`tk_onboarding_done` weg, gegevens blijven), heeft al een bevestigingsflow via `confirmModal`, en het bestaande label richt zich al op gebruikers. Legitieme gebruikers-/supportfunctie. |
| Technische informatie | C | **B** | Read-only. Toont uitsluitend `APP_VER` en de eerste 60 tekens van de eigen `navigator.userAgent`. **Veiligheidsgecontroleerd: geen tokens, secrets, credentials of persoonsgegevens.** Nuttig bij support. |

Dit is een **classificatiecorrectie, geen nieuwe functionaliteit**. Er wordt
geen debugmodus, developer toggle, localhost-gate, verborgen gesture of
backendstatus gebouwd. De sectie ONTWIKKELAAR vervalt volledig.

De technische handlernaam `debugRestartOnboarding()` blijft ongewijzigd:
hernoemen zou onnodig risico geven zonder functioneel voordeel. Alleen het
gebruikerslabel verandert.
