# TRAINEN_V02_IMPLEMENTATION_REPORT.md

## 1. Baseline
PR #228 base: `74871975f96fc089e2289ab80013edc42fa015dd`. Head SHA onafhankelijk herverifieerd (`450e5d3`), mergeable=true/clean, Quality Gate groen, PR #222 ongemoeid.

## 2. Source Register
Zie `docs/TRAINEN_V02_SOURCE_REGISTER.md` — alle relevante documenten volledig gelezen, `trainen-v0.2.png` visueel opnieuw geïnspecteerd.

## 3. Functional inventory
Forensisch geïnventariseerd: `s-train-mgr`, `s-train-detail`, `s-kalender` en alle 13 bestaande routes/handlers eruit (zie matrix).

## 4. Preservation matrix
Zie `docs/TRAINEN_V02_FUNCTIONAL_PRESERVATION_MATRIX.md` — 15/15 functies PRESERVED, 0 verwijderd.

## 5. Target structure
Vijf secties conform `trainen-v0.2.png`: Eerstvolgende training → Jouw training (3) → Start een activiteit (5 zichtbaar + Meer) → Maken & ontdekken (2) → Terugkijken (1).

## 6. Routes
Alle 13 bestaande `go()`/functie-aanroepen exact behouden, alleen visueel herverpakt in canonical `.tk-card-l2/l3`/`.quick-act`-structuren. 1 nieuwe, additieve route: avatar → `go('s-profiel')` (bestaande bestemming, nieuw toegangspunt).

## 7. Data sources
Eerstvolgende-training-kaart blijft de bestaande, **gedeelde** `v43RenderPlan('v43-train-plan', window.homeNextT)` gebruiken — dezelfde functie/databron als Home (`v43RenderPlan('home-plan', nextT)`). **Bewust niet gewijzigd** om Home-regressie te voorkomen (buiten scope van deze sprint). Geen enkele mockup-waarde (bijv. "Training A", "19:00", "Gym · Strength") hardcoded in de statische HTML.

## 8. Component reuse
`tkIcon()` (DS-03) voor alle nieuwe iconen, `.tk-btn-*` (DS-04, impliciet via bestaande `.tk-start`/toekomstige buttons — geen nieuwe button-family), `.tk-card-l2`/`.tk-card-l3` (DS-05) voor context- en functiekaarten. 0 nieuwe, lokale button-/card-/icon-stijl geïntroduceerd (geverifieerd via test #5d).

## 9. Visual comparison
| Element | Target (PNG) | Runtime | Match |
|---|---|---|---|
| Header titel/subtitel | "Trainen" / "Plan, start en beheer je trainingen" | identiek | ✓ |
| Avatar rechtsboven | aanwezig | toegevoegd, opent Profiel | ✓ |
| Sectienamen/-volgorde | 5 secties exact | identiek | ✓ |
| Max. 5 activity-tiles | Kracht/Hardlopen/Fietsen/HYROX/Meer | identiek (5 zichtbaar) | ✓ |
| Card radius | 16px | `--radius-card` (16px) gebruikt op alle nieuwe cards | ✓ |
| Primary CTA teal | "Start training" is teal | ongewijzigd (bestaande `.today-start`, gebruikt al `--accent`) | ✓ (reeds correct) |
| Line icons | outline-stijl | `tkIcon()` overal | ✓ |
| Bottom-nav compositie | 5 tabs zichtbaar in mockup | structureel 5 tabs (labels nog legacy, zie dependency) | GEDEELTELIJK (bewust, zie sectie 17) |

## 10. Accessibility
Alle nieuwe iconen via `tkIcon()` (accessible-by-default). Avatar-knop heeft `aria-label`. Meer-knop heeft `aria-expanded`. Card-als-actie via semantische `<button>`. Geen kleur-only status geïntroduceerd. Bestaande `:focus-visible` ongewijzigd van toepassing.

## 11. Dark mode
Alle nieuwe classes gebruiken uitsluitend `var(--color-*)`/`var(--radius-*)`-tokens die al correct per-thema resolven — geen nieuwe, aparte dark-mode-regels nodig, consistent met de DS-03/04/05-aanpak.

## 12. Offline/sync
Geen wijziging aan de offline-queue/sync-laag; het scherm blijft dezelfde, bestaande data-ophaal-/renderfuncties gebruiken.

## 13. Security/privacy
Geen wijziging aan auth/RLS/coach-scopes — puur presentationele HTML/CSS-wijziging, geen nieuwe databronnen of geprivilegieerde paden.

## 14. Benchmark result
Niet apart, formeel uitgevoerd binnen dit tijdsbudget (Fase 22) — kwalitatieve observatie: de nieuwe structuur (max. 5 primaire tiles + Meer, duidelijke eerstvolgende-training-kaart bovenaan) sluit qua "speed to start workout" en "cognitive load" aan bij de aanpak van Hevy/Strong (dominante volgende-training-kaart, beperkt aantal primaire keuzes). Multisport-breedte (HYROX/Triathlon) blijft, in tegenstelling tot de meeste van deze apps, wel volledig aanwezig via "Meer". Geen nieuwe functionaliteit hieruit gebouwd deze sprint.

## 15. Tests
`core/fTrainenV02Migration.test.js` (nieuw, 32/32). `core/fB9_02RunningCore.test.js` (1 assertie bijgewerkt, 21/21). Volledige regressie: release gate 233/233, Android 29/29, doc-consistency groen.

## 16. Sabotage
6/6 gedetecteerd en volledig hersteld: kapotte route, verwijderde Meer-activiteit, primary-kleur naar marine, card-radius, canonical PNG-byte, hardcoded "Training A".

## 17. Known dependencies
**NAVIGATION MIGRATION DEPENDENCY** (expliciet, bewust niet opgelost): de bottom-navigatie is nog volledig legacy (Home/Training/Lichaam/Coach/Voortgang-labels/emoji) — een gedeelde component op elk scherm. Een gedeeltelijke, per-scherm labelwijziging zou een inconsistente, onbedoelde app-brede navigatiewijziging veroorzaken op schermen die niet in scope zijn. Dit vereist een aparte, toekomstige DS-06-sprint met expliciete PO-goedkeuring voor de volledige navigatiemigratie.

## 18. Deliberately not implemented
Geen ander hoofdscherm gemigreerd. Geen navigatiewijziging. Geen showcase/debug-route. Geen formele, tooling-gebaseerde screenshot-vergelijking (geen browser-rendering-tooling beschikbaar in deze omgeving) — de visuele vergelijking in sectie 9 is een structurele, code-niveau-vergelijking tegen de PNG-compositie.

## 19. Remaining Trainen gaps
Exacte elevation-sterktes en icon-library-detailkeuzes blijven OPEN (ongewijzigd t.o.v. eerdere sprints). Geen nieuwe gaps geïntroduceerd.

## 20. Final status
**TRAINEN v0.2 READY FOR PRODUCT OWNER VISUAL REVIEW**
