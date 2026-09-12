# Nutrition — Full Stack Reality Audit

**Methode:** live Supabase-schema-inspectie (project `mhfxhzkdmgkaplicdszg`) +
source-code-inspectie (`index.html`). Geen documentatie als bewijs gebruikt.

## Database (bewezen, live geïnspecteerd)

Slechts **één** nutrition-gerelateerde tabel bestaat: `nutrition_entries`.

Kolommen (bevestigd): `id, user_id, occurred_at, entry_type, timing_context,
source_type, energy_kcal, protein_g, carbohydrate_g, fat_g, fluid_ml,
training_instance_id, activity_id, note, created_at, updated_at`.

**Rijen: 0.** Geen enkele echte voedingsregistratie bestaat in productie.

Geen enkele van de volgende tabellen bestaat:
- foods / products / product database
- barcode
- brand
- serving units
- user-created products / community products
- supplements (library of intake)
- hydration (apart) -- `fluid_ml` zit binnen dezelfde `nutrition_entries`-rij

RLS: `rls_enabled: true` op `nutrition_entries` (bevestigd via list_tables).

## Backend/UI (bewezen via code)

Een volledig werkend scherm bestaat: `renderNutritionScreen()` (index.html),
bereikbaar via `go('s-nutrition')` (o.a. vanaf de Lichaam-header).

Bevestigde functionaliteit:
- READ: haalt entries per dag op (`sbGet('nutrition_entries', ...)`)
- WRITE: create (`sbPostQ`) en update (`sbPatchQ`) bevestigd
- DELETE: bevestigd (`sbDelQ`)
- Datumnavigatie (vorige/volgende dag, "naar vandaag")
- Dagtotalen via `NutritionFoundationCore.dailyLoggedTotals(entries)` --
  een echte, bestaande Calculation Engine-functie (geen shadow calculation
  in de UI-laag)
- Idempotency: `nutrition_entries` staat in `IDEMPOTENT_TABELLEN_MET_CLIENT_ID`

## Wat NIET bestaat

- Geen product-zoekfunctie of -database: de gebruiker vult kcal/eiwit/
  koolhydraten/vet **handmatig** in per entry, er is geen gekoppelde
  voedingsmiddelen-catalogus om uit te zoeken.
- Geen barcode-scanning.
- Geen supplementen-bibliotheek of -logging.
- Geen community/verificatie/moderatie-laag (want er is geen product-entiteit
  om te modereren).

## Classificatie

| Capability | Status | Evidence |
|---|---|---|
| Macro-logging (handmatige invoer) | **FULL STACK** (maar functioneel minimaal) | code (render/CRUD-functies), schema, RLS |
| Data population / echte gebruikersdata | **MISSING** | 0 rijen, live gemeten |
| Product database (foods/barcode/brand) | **MISSING** | geen tabel bestaat |
| Hydratie als los concept | **PARTIAL** | veld bestaat (`fluid_ml`), geen apart UI-onderdeel bevestigd |
| Supplementen | **MISSING** | geen tabel, geen UI-code gevonden |
| Community/moderatie | **MISSING** | geen onderliggende entiteit |

## Eerlijke conclusie

Voeding is **geen "architecture only"** -- er bestaat een werkend, getest
stuk backend+UI voor handmatige macro-logging. Maar de canonical
productbelofte (barcode/productdatabase/supplementen) heeft **geen enkele
onderliggende tabel**, en de bestaande, wel-werkende logger heeft **nul
echte gebruikersdata**. Een "Voeding loggen"-knop op Vandaag (zie
canonical mockup) zou naar deze wel-bestaande, functionele, maar
productdatabase-loze logger kunnen wijzen -- dat is een PO-beslissing,
geen technische blocker.

**FULL STACK SCORE (macro-logging basis): 6/10** -- werkt, maar minimaal.
**FULL STACK SCORE (canonical voedingservaring incl. productdatabase): 1/10**
-- vrijwel het hele productconcept ontbreekt op databaseniveau.
