# GAP-P2-013 — Concept2 watt provenance closure record

**Datum:** 1 oktober 2026  
**Status:** CLOSED_PROVEN  
**Implementation PR:** #498  
**Implementation main:** `de3d48d5520d4d27ea8413910020bc4371684fa0`  
**Exact-head Quality Gate:** `36824963642` (#1331) — SUCCESS op `ae0a87817c34ec20ac79953e0f0c9ebeb17c07c2`  
**Post-merge Quality Gate:** `36825140808` (#1332) — SUCCESS op `de3d48d5520d4d27ea8413910020bc4371684fa0`

## Originele resterende gap

De database ondersteunde `sessions.watt_source` al via `migratie_v548.sql`, met de canonieke waarden `concept2_measured`, `concept2_derived`, `manual`, `imported_unknown` en `unknown`. Het PM5-persistencepad berekende measured/derived provenance eveneens al, maar plaatste die alleen in een los provenance-object. De daadwerkelijk opgeslagen sessions-row kreeg `watt` zonder `watt_source`.

Dit was niet theoretisch: een eerder fysiek opgeslagen SkiErg-PM5-resultaat had `watt=167` en `watt_source=NULL`.

## Resolution

`core/concept2Live.js::liveWorkoutToActual()` schrijft de reeds berekende `wattsSource` nu ook als `row.watt_source`.

De regel blijft deterministisch:
- PM5 levert werkelijk `summary.watts` → `concept2_measured`;
- geen gemeten watts, maar afstand + duur zijn voldoende voor de bestaande afleiding → `concept2_derived`;
- geen vermogen beschikbaar → geen verzonnen provenance.

Er was geen nieuwe migratie nodig.

## Gedragsbewijs

- `core/fWattProvenanceGapP2013.test.js` voert de echte `Concept2Live.liveWorkoutToActual` uit en bewijst measured én derived persistence, plus gelijkheid van metadata- en row-provenance.
- `core/fConcept2Live.test.js` controleert de canonical completion-row voor measured en derived vermogen.
- `core/fConcept2ThreeMachineLogging.test.js` voert de echte RowErg/SkiErg/BikeErg-keten uit via `tkErgOnCanonicalMeasurement → tkC2SessionRowFromLog → Concept2Live.liveWorkoutToActual` en bewijst dat `watt_source` de writeSessionRow-roundtrip overleeft.
- De volledige Quality Gate is groen op zowel de exacte PR-head als de post-merge canonical main, inclusief deterministic core en native Concept2 transport.

## Legacy data

Bestaande historische rijen met `watt_source=NULL` worden niet teruggevuld. De oorspronkelijke bron kan achteraf niet betrouwbaar als measured of derived worden vastgesteld. Een backfill zou provenance fabriceren en is daarom expliciet verboden; legacy NULL blijft veilig unknown.

## Verdict

De resterende acceptance-voorwaarde van GAP-P2-013 is volledig aangetoond op het werkelijke Concept2-persistencepad en op canonical main. **GAP-P2-013 = CLOSED_PROVEN.**
