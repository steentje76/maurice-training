# TRAININGSKOMPAS F3 CALCULATION / CONTEXT / EVIDENCE EXCELLENCE — MASTER REPORT

**Datum:** 28 augustus 2026

## 1. Baseline
| | |
|---|---|
| F3 initial SHA | `7f8264b5489ed767c8f86f492799531949908b36` (start F3, na F2 Contract Reconciliation) |
| F3 final SHA | `6ce6796afeeb27313619b189cb2fc1f91fa82124` |
| Initial APP_VER | v4.69.4 |
| Final APP_VER | v4.69.6 |

## 2. Mastersprints MS-F3-01 t/m 11
| Sprint | Naam | PR | Merge SHA | Status | Capability | Kernbevinding |
|---|---|---|---|---|---|---|
| MS-F3-01 | Strength Calculation Registry | #89 | 0111bd7 | CLOSED | CALC-STR-REGISTRY-001 | Epley/Brzycki geregistreerd, ACSM 2026 geciteerd |
| MS-F3-02 | Load & Progression Registry | #90 | ebb4301 | CLOSED | CALC-LOAD-REGISTRY-001 | sRPE ontbrak, toegevoegd; ACWR B→C na methodologische kritiek |
| MS-F3-03 | Recovery Calculation Registry | #91 | 948a015 | CLOSED | CALC-REC-REGISTRY-001 | HRV-baseline bevestigd correct (Plews et al.); provenance-gat gevonden |
| MS-F3-04 | Endurance & Erg Registry | #93 | 9cdd1b3 | **TESTED** (eerlijk, niet CLOSED) | CALC-END-REGISTRY-001 | Pace/power volledig; CS/CP/TRIMP/HR-zones bewust NOT_IMPLEMENTED |
| MS-F3-05 | Energy & Estimate Registry | #94 | e44d745 | CLOSED | CALC-ENE-REGISTRY-001 | TK berekent zelf geen energie — architectuur al correct |
| MS-F3-06 | Context Taxonomy & Contract | #95 | 5ed8a87 | CLOSED | CTX-CONTRACT-001 | ContextEngineCore is dode code; buildCtx() is actief |
| MS-F3-07 | Decision Rule Registry | #96 | 14e0934 | CLOSED | DEC-RULE-REGISTRY-001 | 9 regels, ACWR/HRV-guardrails heraudit intact |
| MS-F3-08 | Data Quality & Confidence | #97 | cd8a1f1 | CLOSED | DQ-CONFIDENCE-CONTRACT-001 | Alle 9 regels veilig bij ontbrekende data |
| MS-F3-09 | Evidence Registry Metric Audit | #98 | a119850 | CLOSED | EVIDENCE-CLAIM-AUDIT-001 | Epley/Brzycki niet peer-reviewed, evidence gepreciseerd |
| MS-F3-10 | Explainability & Provenance | #99 | 212aa24 | CLOSED | PROVENANCE-EXPLAINABILITY-001 | **GAP-P1-007 technisch gesloten** (live migratie) |
| MS-F3-11 | Formal Calculation & Evidence Spec | #100 | 6ce6796 | CLOSED | CALC-EVIDENCE-SPEC-001 | Consolidatiedocument; GAP-P1-008 ontdekt |

## 3. Calculation Architecture
```
RAW DATA → normalisatie/provenance/kwaliteit → Calculation Engine → Context Engine
→ Decision/Rules Engine → Evidence/Explainability → AI Coach → Athlete UX
```
Zie `docs/CALCULATION_EVIDENCE_SPEC.md` voor het volledige, canonieke contract.

## 4. Calculation Inventory (herberekend op de finale main, niet gekopieerd)
**23 items** in `docs/CALCULATION_REGISTRY.md`: 20 echte TK-calculations + 3 bron-/gap-documentatie-items (geen zelfstandige berekening). Per domein: Strength (5), Load & Progression (5), Recovery (4), Endurance & Erg (5, waarvan 2 NOT_IMPLEMENTED-items), Energy (4, waarvan 1 NOT_IMPLEMENTED).

## 5. Context Architecture
Actieve runtime-bron: **`buildCtx()`** (index.html). `ContextEngineCore` (core/contextEngine.js) bestaat, is puur en getest, maar **niet runtime-geïntegreerd** (GAP-P2-014, architectuurinconsistentie, geen tegenstrijdige waarheid).

## 6. Decision Architecture
**Exact 9 Decision Rules** (herverifieerd, niet blind overgenomen): `DEC-PROG-001`, `DEC-RECADJ-001`, `DEC-READY-001`, `DEC-DETRAIN-001`, `DEC-REST-001`, `DEC-SETOUT-001`, `DEC-READYDAY-001`, `DEC-ACWR-ADV-001`, `DEC-LOADCORR-001`. Elk precies één canonieke implementatie in `core/decision.js`. Geen verborgen tweede Decision-logica gevonden (`rpeMeaning()` is bevestigd presentatie-only).

## 7. Data Quality & Confidence
Canonieke semantiek vastgelegd in `docs/DATA_QUALITY_CONFIDENCE_CONTRACT.md`. Alle 9 Decision Rules bevestigd veilig bij ontbrekende data (geen harde aanbeveling zonder voldoende input). Bekende, niet-kritieke beperking: GAP-P2-015 (`recoveryScore()`-confidence telt alleen componentaantal).

## 8. Evidence — exacte, machine-herberekende tellingen
**23 CALC-items:** A=1, B=4, C=4, D=1, E=7, NOT_IMPLEMENTED=3, geen-evidence-veld=3.
**9 Decision Rules:** 0× A/B (geen enkele claimt sterke wetenschappelijke onderbouwing voor zijn exacte thresholds), 5× product heuristic, 1× technical/product heuristic, 1× C, 1× E, samengesteld/n.v.t.

## 9. Provenance
`hrv_log`: **per-veld** provenance (`hrv_source`/`rhr_source`/`sleep_source`, manual/wearable/unknown) — gekozen boven rij-niveau omdat één rij aantoonbaar gemengde herkomst kan hebben (live bevestigd tijdens MS-F3-10). Migratie `migratie_v499.sql` live uitgevoerd: 3 kolommen, 70 bestaande rijen veilig (NULL/onbekend).

## 10. Explainability, Immutability, Reproducibility (strikt onderscheiden, sectie 31)
- **Immutable:** bewezen voor Decision Evidence-snapshots (`readDecisionEvidence()` retourneert een diepe kopie, functioneel getest — mutatie van een teruggelezen kopie raakt het origineel niet).
- **Explainable:** de volledige keten (raw→calculation→context→rule→outcome) is reconstrueerbaar via de bestaande snapshot-velden.
- **Reproducible:** `evidenceReproduceerbaar()` detecteert correct of een opnieuw genomen beslissing overeenkomt — dit is reproducibility-*detectie*, geen garantie dat elke historische snapshot voldoende ruwe input bevat om altijd exact te reproduceren.

## 11. GAP-P1-007 — before/after
**Before:** `hrv_log` had geen provenance-kolommen; handmatige en wearable-waarden niet te onderscheiden.
**Fix:** per-veld provenance, live migratie, beide schrijfpaden bijgewerkt, functioneel getest tegen het mixed-source-scenario.
**After:** **CLOSED**, live geverifieerd.

## 12. Wetenschappelijke correcties (MS-F3-09)
Epley/Brzycki: beide oorspronkelijk niet peer-reviewed; B-classificatie herformuleerd naar de aparte validatiestudies (LeSuer et al. 1997). ACWR: C i.p.v. B, methodologische kritiek (Windt & Gabbett 2018) expliciet vermeld. Recovery Score: D, componentevidence verhoogt compositie-evidence niet automatisch.

## 13. Endurance-beperkingen
Geïmplementeerd: pace/split/tijd-conversie, Concept2-vermogensconversie. **NOT_IMPLEMENTED (bewust, expliciet):** Critical Speed, Critical Power, TRIMP, HR-zones, aerobic decoupling — bevestigd bestaand architectuurcommentaar (`intervalEngine.js`), geen ontdekte omissie.

## 14. Energy-beperkingen
Geen eigen TK-energieberekening — bewust, correct architectuurontwerp, geen gebrek. BMR/RMR/TDEE: NOT_IMPLEMENTED (`PRODUCT_DECISION_REQUIRED`, meerdere gelijkwaardige formules bestaan).

## 15. Magic Number Audit (finaal, alle domeinen)
Geen onverklaarde critical threshold gevonden over de volledige F3-scope (Strength/Load/Recovery/Endurance/Energy/Decision). Elke gevonden waarde is expliciet geclassificeerd als evidence-backed, product heuristic, of technical threshold in de respectievelijke registry-secties.

## 16. Duplicate Calculation Audit (finaal)
`calculate1RM`/`calculateVolume`/`calculateWorkingWeight`: **0 duplicaten** buiten `core/calculation.js` (geverifieerd via repo-brede grep op de finale main).

## 17. Duplicate Decision Audit (finaal)
Geen verborgen, parallelle Decision-logica gevonden. `rpeMeaning()` is bevestigd presentatie-only (expliciet code-commentaar: "duiding, geen nieuwe berekening").

## 18. AI Boundary — drie dimensies apart gerapporteerd (sectie 56, niet samengevoegd)
- **A. Deterministische upstream-keten:** PASS.
- **B. Prompt-niveau-governance:** PASS (expliciete "wijzig het advies niet"-instructie bevestigd aanwezig op de finale main).
- **C. Technische response-enforcement:** NOT_IMPLEMENTED — `AI-OUTPUT-CONTRACT-001` (GAP-P1-003), expliciet F4, geen F3-tekortkoming.

## 19. Security & Privacy (finale regressie)
RLS multi-tenant: 22/22. Coach-proxy-security: 12/12. Observability-redactie: 58/58. RLS op de nieuwe provenance-kolommen: automatisch gedekt door de bestaande `ALL`-policy, live herbevestigd tijdens MS-F3-10.

## 20. Cross-Layer Integration Flows
| Flow | Resultaat |
|---|---|
| A Strength | PASS |
| B Load/Progression | PASS |
| C Recovery | PASS |
| D Endurance/Erg | PASS (binnen geïmplementeerde scope) |
| E Energy | PASS (bewust geen eigen berekening) |
| F Missing Data | PASS |
| G Context | PASS |
| H Decision | PASS |
| I Data Quality | PASS |
| J Confidence | PASS (met genoteerde limitatie GAP-P2-015) |
| K Evidence | PASS |
| L Provenance | PASS (GAP-P1-007 CLOSED) |
| M Historical Evidence | PASS (immutability bewezen) |
| N AI | PASS (upstream+prompt), NOT_IMPLEMENTED (technische enforcement, correct F4) |

## 21. Tests & CI (finale, schone checkout)
100 testbestanden, 102 stappen totaal, **102 uitgevoerd, 0 geskipt, 0 gefaald** (met Android-buildmap gereproduceerd). Zonder buildmap: 100 uitgevoerd, 1 geskipt. Consistency: **19/19 groen**. Alle 12 F3-PR's (#89–#100) met groene Quality Gate gemerged en post-merge geverifieerd.

## 22. Open Gaps
- **P0:** 0.
- **F3-fase-blokkerende P1 (mastersprint-acceptance-gate):** 0.
- **F4-fase-items (geen F3-blokkade):** AI-OUTPUT-CONTRACT-001, AI-PROGRAM-AUTOGEN-001.
- **Nieuw, apart P1 (F3 Final Integration Audit, GEEN mastersprint-acceptance-gate vereiste dit):** **GAP-P1-008** — bewezen concurrent-write-risico op `hrv_log` (4 duplicate-rij-paren live gevonden, 1 met echte datadivergentie). Vereist een cleanup-plan vóór een `UNIQUE`-constraint veilig kan worden toegevoegd.
- **P2+:** GAP-P2-009 t/m GAP-P2-015 (sRPE-UI-integratie, precache-lacune, HRV-testdekking, RHR-minimum, watt-provenance, ContextEngineCore-dode-code, recoveryScore-confidence-kwaliteit).
- **PRODUCT_DECISION_REQUIRED:** BMR/RMR/TDEE-methodekeuze, toekomstige HR-zone-methodologie, TRIMP-variant, CS/CP-infrastructuur.

## 23. Capability Maturity
**38 canonieke capabilities**, 100% dekking (`registry=38, roadmap_index=38, coverage_audit=38/38`), 0 orphans. Alle statuswaarden uit de geldige maturity-enum (geen "PARTIAL" als schema-status).

## 24. Roadmap Status
F0 = CLOSED · F1 = CLOSED · F2 = CLOSED · **F3 = zie Final Decision** · F4 = LOCKED

---

## FINAL DECISION

**"F3 CONDITIONALLY CLOSED — NON-BLOCKING SCIENTIFIC/VALIDATION ITEMS OPEN"**

### Onderbouwing
Alle harde F3-sluitingsvoorwaarden zijn gehaald: alle 11 mastersprints eerlijk afgerond (MS-F3-04 blijft correct op TESTED, geen kunstmatige CLOSED), GAP-P1-007 (de enige mastersprint-acceptance-gate-blokkerende P1) is technisch en live gesloten, 0 kritieke calculation-duplicaten, 0 kritieke decision-duplicaten, 0 onverklaarde critical thresholds, de evidence-audit is compleet en reproduceerbaar, de AI-grens is correct gedocumenteerd (geen overclaim), en de volledige regressie/consistency/CI staat groen.

Dit is echter geen reden voor een onvoorwaardelijke "CLOSED": tijdens de finale integratie-audit is **GAP-P1-008** ontdekt — een bewezen (niet theoretisch) race-condition-risico in dezelfde `hrv_log`-tabel die net zorgvuldig van provenance is voorzien. Geen enkele F3-mastersprint-acceptance-gate vereiste dit expliciet op te lossen (het is ontstaan uit een nieuwe, aanvullende auditvraag), dus het is geen F3-fase-blokkerende P1 in dezelfde zin als GAP-P1-007 was — maar het is wel een materieel, nog-niet-opgelost datakwaliteitsrisico dat de eerlijkheid van een volmondige "CLOSED" zou ondermijnen. Daarnaast blijven MS-F3-04's Endurance-beperkingen (CS/CP/TRIMP/HR-zones) en meerdere P2-items bewust open, expliciet niet-blokkerend voor deze fase-acceptance, maar wel materieel relevant genoeg om te vermelden.

**"PARTIAL boven vals CLOSED"** blijft het leidende principe — vandaar CONDITIONALLY CLOSED in plaats van een volmondige, optimistischere claim.

---

## ABSOLUTE STOP VOOR F4

Geen F4-branch, geen F4-code, geen AI Output Contract-implementatie, geen adaptive-programming-werk, geen F4-roadmapstatus-wijziging. F4 vereist een nieuwe, expliciete vrijgave.
