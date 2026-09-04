# SCREEN_MIGRATION_CHECKLIST_v1.md

Elke toekomstige hoofdschermmigratie (Vandaag, Inzicht, Coach, Samen, Profiel) volgt exact deze 16 stappen, in volgorde. Geen volgend hoofdscherm vóór STEP 16 van het vorige.

**STEP 1 — Canonical PNG bevestigen.** Het juiste bestand uit `docs/ux/baseline/v1/` visueel, opnieuw bekijken (niet uit het geheugen aannemen).

**STEP 2 — Functional preservation matrix.** Alle bestaande routes/functies van het huidige scherm forensisch inventariseren (zoals `TRAINEN_V02_FUNCTIONAL_PRESERVATION_MATRIX.md`).

**STEP 3 — Component reuse mapping.** `SCREEN_IMPLEMENTATION_STANDARD_v1.md` en de Component Inventory raadplegen vóór het schrijven van nieuwe CSS (conform de No-Duplication Rule).

**STEP 4 — Data-source mapping.** Voor elk zichtbaar mockup-veld bevestigen: bestaat de data echt (databaseschema controleren), of ontbreekt die — nooit fictief invullen.

**STEP 5 — Implementatie.** Additief, gescoped, geen wijziging aan gedeelde functies zonder backward-compatible parameters (zoals `v43RenderPlan(elId, nextT, opts)`).

**STEP 6 — Static tests.** Node-gebaseerde source-tests (patroon: `fXxxV0Migration.test.js`).

**STEP 7 — Browser-runtime tests.** Playwright/Chromium, echte DOM-assertions (patroon: `fXxxBrowserRuntime.test.js`) — verplicht sinds bewezen dat static tests alleen onvoldoende zijn.

**STEP 8 — Responsive tests.** 320/360/375/390/412/430px, geen horizontale overflow.

**STEP 9 — Visual delta audit.** Element-voor-element tegen de canonical PNG, geclassificeerd PASS/MINOR/MAJOR/BLOCKER.

**STEP 10 — Netlify Preview.** Pushen, wachten op de automatische Deploy Preview, exacte preview-URL/commit-SHA noteren.

**STEP 11 — Product Owner mobiele review.** Echte Android/browser-runtime, niet alleen de PR-diff.

**STEP 12 — Micro-correction indien nodig.** Gerichte, gescoped fixes — geen redesign, geen scope-uitbreiding.

**STEP 13 — Final regression.** Volledige release gate + Android + cross-domain preservation + canonical PNG-integriteit.

**STEP 14 — Product Owner GO.** Expliciete, uitgesproken goedkeuring.

**STEP 15 — Merge.** Normale repository-governance, geen force-merge.

**STEP 16 — Production verification.** Fresh main certificeren; erkennen (niet verzwijgen) welke productie-verificatie wel/niet programmatisch mogelijk is vanuit de ontwikkelomgeving.
