# NUT-DATA-OBS-01 — Potential canonical product duplication

**Vastgelegd:** 6 september 2026, tijdens Product Owner real-device review van UX-03.

**Observatie:** twee verschillende `nutrition_products`-records met vrijwel dezelfde
identiteit zichtbaar in zoekresultaten: "NUTELLA" zonder bruikbare voedingswaarden,
en "Nutella" (merk Nutella) met volledige voedingswaarden.

**Impact:** geen bug in UX-03 (Portion Engine/preview/logging werkten correct op het
record met data). Wel een mogelijk verwarrend dubbel zoekresultaat.

**Te onderzoeken (later, aparte Nutrition data-audit):**
- canonical identity / barcode-identiteit van beide records
- provenance/source van elk record
- deduplicatie- en matchinglogica
- ranking: voorkeur voor het completere canonical record
- risico op meer van dit soort near-duplicates

**Status:** OPEN, non-blocking. Geen destructieve deduplicatie zonder aparte analyse.
Deze registratie is documentatie-only; geen productiecode gewijzigd.
