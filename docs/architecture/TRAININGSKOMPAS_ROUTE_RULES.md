STATUS: CANONICAL — SOURCE OF TRUTH

# TrainingKompas — Route Rules

Dit document legt de bindende navigatie-invariants vast voor TrainingKompas.
**Iedere wijziging aan actieve navigation contracts moet in dezelfde PR deze
Route Map (dit bestand + `TRAININGSKOMPAS_ROUTE_MAP.md` + `.json`) bijwerken.**

Ontstaan uit Fase 0 t/m 0D: een read-only, evidence-based action-level
navigatie-audit over de domeinen Vandaag, Trainen Hub, Coach, Inzicht, Samen
en Profiel. Zie `TRAININGSKOMPAS_ROUTE_MAP.md` voor de volledige, per-actie
onderbouwing.

## Bestaande navigatie-primitieven (baseline, ongewijzigd door deze docs)

- `go(id)` — centrale router. Wrapt zichzelf (IIFE) om bij elke aanroep
  automatisch de vorige scherm-id op `tkNavStack` te pushen via `tkNavPush()`,
  behalve tijdens een `tkNavPoppend`-cyclus (popstate-afwikkeling).
- `tkNavStack` / `tkNavPush()` / `tkNavHuidig()` — de canonical back-stack.
- `tkNavGoBack(fallback)` — source-aware terug: popt `tkNavStack` als die
  iets bevat, valt anders terug op `fallback`. **Bewezen, werkend patroon**
  (gebruikt door Profiel → Meldingen/Privacy/Help).
- `window.addEventListener('popstate', ...)` — één centrale terug-handler:
  1) sluit een open `.modal-bg.open` (via `tkNavModaalOpen()`/`closeModal()`),
  2) vangt de Coach-vanuit-Training-terugkeer (`coachReturn`),
  3) popt anders `tkNavStack` via `go()`,
  4) op het beginscherm: dubbele-terug-om-af-te-sluiten-patroon.
- `openModal(id)` / `closeModal(id)` — canonical modal-systeem (`.modal-bg`).
  Enige systeem dat door `tkNavModaalOpen()` wordt herkend.
- `confirmModal(message, opts)` — app-brede vervanger van native `confirm()`
  (`.tk-confirm-bg`). **Niet** door `tkNavModaalOpen()` herkend.
- exec-overlay-mechanisme (`ensureExecOverlay()`/`closeExecOverlay()`,
  klasse `.exec-overlay`) — sheets tijdens actieve training (overview, next,
  stop, explain, pause, note). **Niet** door `tkNavModaalOpen()` herkend.

## Route Rules (invariants)

**R-001** — Normale user-visible schermovergangen gebruiken `go()` of een
expliciet goedgekeurde equivalente navigator (bv. `tkNavGoBack()`).

**R-002** — Zichtbare Terug en Android Back moeten naar dezelfde logische
parent/context terugkeren, tenzij expliciet gedocumenteerd anders.

**R-003** — Iedere modal/overlay heeft één geldig lifecycle-contract: open,
close, cancel, Android Back.

**R-004** — Geen hardcoded parent wanneer dezelfde detail-surface uit
meerdere bronnen bereikbaar is. Gebruik source-aware return
(`tkNavGoBack(fallback)`) waar functioneel passend.

**R-005** — Primary-tab ownership blijft logisch tijdens secondary flows.

**R-006** — Actieve Training execution state mag nooit door navigatie
verloren gaan.

**R-007** — Een dead/unreachable scherm mag geen noodzakelijke forward-
bestemming van een actieve journey zijn.

**R-008** — UNKNOWN mag nooit als GREEN worden geregistreerd.

**R-009** — Directe `.scr`-classmanipulatie voor user-visible schermnavigatie
is verboden tenzij expliciet verantwoord en getest.

**R-010** — Een actieve `modal-bg` moet een sluitbaar canonical contract
hebben; geen ad-hoc modal zonder geldige identifier/lifecycle.

**R-011** — Nieuwe confirm-/destructieve flows moeten Android Back correct
ondersteunen.

**R-012** — ONE CANONICAL HOME per managementfunctie. D1-shortcuts zijn
toegestaan; D3/D4 moeten expliciet worden geregistreerd (zie Root Cause
Registry / Functional Issues in `TRAININGSKOMPAS_ROUTE_MAP.md`).

## Documentatie-updatepolicy

Een PR **moet** deze Route Map-documentatie aanpassen wanneer hij:

- een scherm toevoegt of verwijdert;
- een navigation handler wijzigt;
- een destination wijzigt;
- zichtbare Terug of Android Back wijzigt;
- een modal-/overlay-lifecycle wijzigt;
- een canonical home wijzigt;
- primary-tab ownership wijzigt;
- dead/active-status van een surface wijzigt;
- een bestaande RED/AMBER/UNKNOWN oplost.

Pure visuele wijzigingen zonder navigatie-effect vereisen **geen**
route-map-update.
