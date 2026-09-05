## FUNCTIONAL >=9 GATE — FORMELE BESLISSING (Closure 2)

Score uitsluitend op onderliggende capability, UX en fysieke
apparaatvalidatie uitgesloten conform de opdracht.

| Vereiste | Status |
|---|---|
| Normal logging werkt | JA (meal CRUD, live bewezen) |
| Search werkt | JA (discovery-service, pure tests) |
| Barcode software werkt | JA (Wave 3/4, live bewezen) |
| OCR software werkt | JA (Wave 4, echte pixels bewezen) |
| Custom foods werken | JA (Closure 2, live bewezen) |
| Portions werken | JA (11/11 scenario's) |
| Meal CRUD werkt | JA (Closure 1, live bewezen) |
| Daily totals werken | JA (live bewezen) |
| Coverage metadata werkt | JA (expliciet COMPLETE/PARTIAL/UNKNOWN) |
| History werkt | JA (historische reproduceerbaarheid, tweemaal live bewezen) |
| Hydration werkt | JA (Closure 1, live bewezen) |
| Supplement logging werkt | JA (Closure 1, live bewezen) |
| Correction workflow werkt | JA (Closure 2, 5 scenario's) |
| Provenance werkt | JA (doorlopend, elke module) |
| Historical reproducibility werkt | JA (tweemaal, live, met verschillende scenario's bewezen) |
| Error states werken | JA (expliciete, onderscheiden statussen, geen silent failure) |
| Offline/degraded gedrag is expliciet | JA (eerlijke matrix, geen overclaim) |
| Security/RLS werkt | JA (herhaaldelijk herbevestigd, structureel) |
| Cross-domain factual read models bestaan | JA (contract gebouwd en getest, nog niet aangesloten op een scherm) |

**Alle achttien vereisten zijn met echt bewijs (live database-scenario's
en/of pure tests) aangetoond.**

### Formele beslissing

**Nutrition FUNCTIONAL SCORE: >=9 (softwarematig, functioneel)**,
met de volgende, expliciete, niet-onderhandelbare uitzonderingen die
dit oordeel niet ongeldig maken maar wel apart vermeld moeten blijven:

- **REAL DEVICE VALIDATION: OPEN** (geen enkele test op een fysieke
  telefoon/camera)
- **FINAL NUTRITION UX: OPEN** (geen enkel scherm gebouwd)
- **REAL USER VALIDATION: OPEN** (geen enkele echte gebruiker)
- **NUTRITION TARGET PRODUCT DECISION: OPEN** (bewust buiten scope,
  aparte PO-beslissing)

Dit is een eerlijke, evidence-based >=9-score voor de onderliggende
softwarecapability -- niet een claim dat Nutrition als geheel "af" is
voor eindgebruikers.
