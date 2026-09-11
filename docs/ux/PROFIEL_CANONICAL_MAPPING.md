# PROFIEL — CANONICAL IA MAPPING (fidelity v2)

Baseline main `0648169f…`. Canonical target: `CANONICAL-profiel-v0.1`.

## A. HEADERGEGEVENS — beschikbaarheidsonderzoek (§3)

| Canonical veld | Bestaande bron | Beschikbaar | Behandeling |
|---|---|---|---|
| Profielfoto/avatar | `atleet_profiel.avatar_path` + canonical resolver | **JA** | tonen, initialen-fallback |
| Naam | `atleet.naam` | **JA** | tonen |
| Account/plan-status | `individual_plan_key` → `plan-huidig-naam` | **JA** | echte status ("Gratis"), geen fake Premium |
| Hoofdsport | `atleet.sport` (+ `niveau`, `klasse`) | **JA** | tonen |
| Doel | `atleet.doel` en tabel `goals` | **JA** | tonen; leeg → rustige empty-state |
| **Volgend event** | — | **UNKNOWN** | **Geen bron.** Er bestaat geen event-/wedstrijd-entiteit. `goals.einddatum` is een DOELDEADLINE, geen event; dat als "volgend event" tonen zou semantiek verzinnen. → veld weggelaten of expliciete empty-state |
| Persoonlijke consistentie | `window.homeWeekSummary.activeDays` (canonical, uit sessies) | **JA, conditioneel** | alleen tonen wanneer gevuld; anders callout volledig weglaten |
| Lichaamsgegevens | `atleet.lengte`, `weight_log`, `body_comp` | **JA** | eigen canonical rij |

**Geen demo-data, geen verzonnen event, streak, doel of Premium-status.**

## B. CANONICAL ROW → FUNCTIE-MAPPING (alle 38 behouden)

| Canonical rij | Bestaande functie(s) | Huidige locatie | Bestemming | Detail | Behouden |
|---|---|---|---|---|---|
| **MIJN PROFIEL** | | | | | |
| Sportprofiel & doelen | atleetprofiel (sport/niveau/klasse/doel) | `profiel-atleet-card` | Mijn profiel | `m-atleet` | JA |
| ↳ Condities | blessures/aandachtspunten | `profiel-conditions-card` | onder Sportprofiel | `m-condities` | JA |
| Lichaamsgegevens | lengte, gewicht, metingen, historie | Lichaam-route | Mijn profiel | `go('s-lichaam')` | JA |
| Apparaten & verbindingen | wearable status/acties | `profiel-wearable-*` | Mijn profiel | `m-wearable` | JA |
| Privacy & delen | privacy-route, onderzoeksdeelname, export | verspreid | Mijn profiel | `go('s-privacy')`, `m-research`, `m-export` | JA |
| **VOORKEUREN & INSTELLINGEN** | | | | | |
| Meldingen | meldingen-route + 4 toggles | App-instellingen | Voorkeuren | `go('s-meldingen')` | JA |
| Abonnement | huidig plan, plannen vergelijken | `plan-huidig-card` | Voorkeuren | `openPlanOverzicht()` | JA |
| Instellingen | thema, taal, offline, opslag, over | App-instellingen | Voorkeuren | `go('s-settings')` | JA |
| **ONDERSTEUNING & ACCOUNT** | | | | | |
| Help & ondersteuning | FAQ/contact/feedback | App-instellingen | Ondersteuning | `go('s-help')` | JA |
| Account & data | e-mail, inlogmethoden, wachtwoord, export, verwijderen | `Mijn account` | Ondersteuning | rijen + `deleteAccount()` | JA |
| Uitloggen | `authSignOut()` | Mijn account | Ondersteuning | — | JA |
| **CONTEXTUEEL** | | | | | |
| Organisatie & team | tenant-branding, team/PIN | eigen hoofdsectie bovenaan | **contextuele rij onder Ondersteuning** | `openTeamPinModal()` | JA |

**Organisatie/team**: niet verwijderd, maar niet langer een hoofdsectie bóven de
persoonlijke kern. Het is voor veel gebruikers niet van toepassing (tenant-kaart
is vaak de standaard-branding) en domineerde het scherm. Nu een contextuele rij.

## C. Behouden gates
55/55 preservation · ≥44×44 · native semantics · keyboard/focus · geen
horizontale overflow · database unchanged · Calculation/Decision unchanged.

## D. Bottom nav
Niet gemigreerd in deze correctie. **P2 blijft open**: 45 losse `bnav`-blokken
met hardcoded legacy labels; vereist een aparte App Shell / Navigation sprint
vóór finale UX-certificering.
