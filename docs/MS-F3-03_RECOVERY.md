# MS-F3-03_RECOVERY.md — Trainingskompas

**Auditmethode:** volledige lezing van de HRV-baseline-keten (`lnRmssd`, `hrvBaseline`, `hrvRollingRecent`, `hrvStPersonal`, `hrvDagFactorPersonal`), de dagfactor-compositie, de Recovery Score (`calculation.js`), en `rhrBaselineDelta`. Live geverifieerd tegen het `hrv_log`-schema in Supabase.

## Bevinding: uitzonderlijk goed onderbouwde bestaande implementatie
De HRV-baseline gebruikt exact de gevestigde Plews-methodologie: Ln-RMSSD-transformatie, 7-daags rollend gemiddelde, "smallest worthwhile change" = 0,5×SD, gefaseerde confidence (referentie/voorlopig/volledig op basis van 14/28 dagen). Dit is bij web-onderzoek (sectie 15-18 van de opdracht) bevestigd als een nauwkeurige, correcte toepassing van de sportwetenschappelijke literatuur (Plews et al., *Sports Medicine* 2013). De Recovery Score is transparant samengesteld: expliciete gewichten (45/30/15/10%), herverdeeld over uitsluitend aanwezige componenten (geen fabricage), met een reproduceerbaar confidence-model (hoog/gemiddeld/laag op basis van componentaantal).

## Claim-specifieke evidence (sectie 51-52): één functiegroep, twee evidence-niveaus
Binnen dezelfde HRV-functiegroep bevat de code twee thresholds met zeer verschillende bewijskracht: `HRV_SWC_MULTIPLIER=0.5` (sterk onderbouwd, Plews et al.) en `HRV_SEVERE_DROP_PCT=0.15` (code citeert zelf een coaching-webbron, geen peer-reviewed studie). De nieuwe registry classificeert deze apart — geen functie-brede aanname dat "de HRV-logica" één evidence-niveau heeft.

## Evidence-classificatie: bewust conservatief bij composities
- CALC-REC-001 (HRV-baseline): **B**
- CALC-REC-002 (dagfactor-compositie): **C** — de multiplicatieve combinatie zelf is productontwerp, ook al hebben de individuele componenten elk hun eigen (hogere) evidence
- CALC-REC-003 (Recovery Score): **D** — de specifieke 45/30/15/10%-gewichtsverdeling is een expliciete product heuristic (code-commentaar: "sprint-default"), niet uit onderzoek afgeleid
- CALC-REC-004 (RHR-delta): **C**

Geen evidence-inflatie: een score kan nooit hoger scoren dan zijn zwakste, niet-gevalideerde schakel (de compositiemethode zelf).

## Gevonden, echte gap: geen sleep/HRV-provenance
Live geverifieerd: `hrv_log` heeft geen `source`-kolom. Handmatige check-in-waarden en wearable-sync-waarden zijn niet te onderscheiden in dezelfde kolom. Dit is een reële afwijking van de opdrachtvereiste. **Niet gecorrigeerd binnen deze sprint** — een DB-migratie plus aanpassing van alle schrijfpaden is een grotere ingreep dan een audit-sprint rechtvaardigt. Geregistreerd als **GAP-P1-007** (P1, want dit raakt de betrouwbaarheid van de hele Recovery-keten, niet slechts cosmetisch).

## Overige gevonden gaps
- **GAP-P2-011**: geen dedicated `core/`-unit-test voor de HRV-baseline-functiegroep (leeft in `index.html`, niet in de pure-core-extractie).
- **GAP-P2-012**: `rhrBaselineDelta`'s minimum van 2 metingen is laag vergeleken met HRV's striktere gates (14 dagen/4 metingen) — mogelijk inconsistente datakwaliteitseisen tussen Recovery-signalen.

## Duplicate calculation audit
`readinessPercent` had ooit een duplicaat (`v43GereedheidScore`) — al in een eerdere sprint geconsolideerd (code-commentaar bevestigt dit). Geen actieve duplicatie aangetroffen.

## Nieuw: test
`core/fRecoveryRegistry.test.js` (48/48): functionele tests voor `lnRmssd()` (via bracket-matching-extractie en `new Function()`-evaluatie, consistent met eerdere F2-testpatronen voor index.html-only-code), structurele registry-tests, en expliciete evidence-inflatie-detectie per item. Sabotagebewijs geleverd.

## MS-F3-03 acceptance-gate-toetsing
Letterlijke acceptance gate: *"HRV/RHR/sleep/readiness components with baseline/confidence."*
**Resultaat: CLOSED.** Alle vier genoemde componenten (HRV, RHR, sleep — via dagfactor, readiness) bevestigd aanwezig met expliciete baseline-/confidence-mechanismen. Het gevonden provenance-gap (GAP-P1-007) is een reëel, maar niet dit-domein-specifiek-blokkerend punt — geregistreerd voor gerichte opvolging, geen reden voor PARTIAL op deze specifieke acceptance gate.
