# Nutrition UX Hardening & Consistency — Sprint Report (unattended)

Branch `ux/nutrition-hardening-v1` vanaf #241 HEAD `6b311586`; stacked PR met base `feature/nutrition-targets-v1`. Geen nieuwe features, geen redesign, geen IA-/nav-wijziging, geen calculation-/targets-/AI-wijziging, geen DB-wijziging.

## Auditmethode
Geautomatiseerd, in de gebouwde app (Playwright), 19 Nutrition-schermen × 4 breedtes (320/360/390/412): horizontale overflow, knoppen zonder toegankelijke naam, inputs zonder label, touch targets. Aangevuld met statische audit van JS-gerenderde inputs, copy-scan (optimaal/aanbevolen/ideale/schuldtaal), dubbele-submit-guards, en gedragstests (UNKNOWN, partial target, busy-state, empty search).

## Bevindingen → fixes
- Overflow: **0** op alle breedtes (geen fix nodig).
- Knoppen zonder naam: **0**.
- Inputs zonder label: 5 statisch (supp-dose) + JS-gerenderd (qty-unit, correctie-value ×2, newproduct-name, water-input) → **gefixt** met `<label for>`/`aria-label`.
- Gedeelde `.vd-input`-primitive (44px min-height, `:focus-visible`, `aria-invalid`-styling) consolideert ~15 identieke inline-input-stijlen; geen nieuw design system, hergebruikt bestaande tokens.
- `aria-live="polite"` op async regio's (overzicht, zoekresultaten, scanner-status/not-found, foutmeldingen).
- Dubbele submit: `voedingWithBusy()` (disabled + `aria-busy` + label) op alle 7 async save-paden; ontbrak nog op label-naar-nieuw-product → **gefixt**, incl. menselijke foutmelding bij netwerkfout (was stille failure).
- Copy: geen "optimaal/aanbevolen/ideale behoefte", geen schuldtaal; targets-wording "Je ingestelde doelen" bevestigd.
- UNKNOWN≠0: gedragsmatig bewezen ("Inname onvolledig bekend", nooit "0 g"); partial target toont geen nep-doelen.
- Empty states functioneel met één vervolgactie (maaltijden, targets, zoeken).
- Line-ending-drift (1 regel) op een ongewijzigde CSS-regel hersteld vóór commit.

## Bewust NIET gefixt
- `.ibtn` terugknop = 36px hoog op alle schermen: dit is een **app-brede** primitive (ook buiten Nutrition). Aanpassen raakt de hele app → PO-beslissing, zie hieronder.
- Camera/barcode real-device blockers: onaangeroerd, OPEN.

## PRODUCT OWNER DECISIONS REQUIRED
1. **Terugknop-touch-target (`.ibtn`, 36px) app-breed naar ≥44px?** Impact: alle schermen, header-hoogte/visueel ritme. Opties: (a) app-breed 44px; (b) alleen Nutrition-headers (inconsistent); (c) laten. Aanbeveling: (a) in een aparte, app-brede a11y-sprint. Niet geïmplementeerd.

## Tests
Set B 54/54 (+8 UX-contracten), Set A 10/10, scanner 13/13, targets 22/22, contract 9/9, quality gate 10/10, OFF 22/22, ingest 9/9, OCR 6/6, Calculation/Evidence/Energy 5/5 · 21/21 · 10/10, release 265/265, Android 29/29, security 16/16, HYROX 386/386, doc consistency PASS, build PASS.
