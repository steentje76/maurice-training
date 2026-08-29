# CALCULATION_EVIDENCE_SPEC.md — Trainingskompas

**Status:** canonieke, formele specificatie (MS-F3-11). Consolideert `docs/CALCULATION_REGISTRY.md`, `docs/DECISION_RULE_REGISTRY.md`, `docs/CONTEXT_CONTRACT.md`, `docs/DATA_QUALITY_CONFIDENCE_CONTRACT.md` en de F3-sprintrapporten tot één blijvend engineering-contract. Dit document vervangt geen van de bronregistries — het legt vast HOE ze samenhangen en welke regels toekomstige uitbreidingen moeten volgen.

## 1. Doel
Dit document is het permanente contract voor toekomstige engineers (mens of AI) die de Calculation/Context/Decision/Evidence-laag van Trainingskompas uitbreiden. Het beantwoordt: wat mag berekend worden, waar, met welke onderbouwing, hoe context wordt behandeld, hoe beslissingen tot stand komen, en wat AI wel/niet mag.

## 2. Autoriteit (source-of-truth-hiërarchie)
1. Runtime code
2. Database/schema/migraties
3. Tests
4. Echte integratie-/live-validatie
5. Registries (`CALCULATION_REGISTRY.md`, `DECISION_RULE_REGISTRY.md`, etc.)
6. Dit specificatiedocument
7. `CURRENT_STATE.md`
8. Roadmap-documentatie (bepaalt productrichting, niet actuele implementatiewaarheid)

Documentatie is nooit automatisch bewijs dat iets technisch bestaat. Bij een conflict winnen runtime+DB+tests; documentatie wordt daarna gecorrigeerd. **AI is nooit source of truth.**

## 3. Canonieke architectuur
```
RAW DATA SOURCES
  -> normalisatie / provenance / datakwaliteit
  -> Calculation Engine
  -> Context Engine
  -> Decision / Rules Engine
  -> Evidence / Explainability
  -> AI Coach
  -> Athlete UX
```

## 4. Raw Data Layer
Ruwe input bevat waar relevant: eigenaar/user, timestamp, bron, provider, eenheden, oorspronkelijke waarde, kwaliteitsmetadata. Providerwaarden (bv. wearable-calorieën) blijven providerwaarden — nooit stil als TK-berekening gepresenteerd.

**Actuele provenance-implementatie (MS-F3-10, GAP-P1-007 CLOSED):** `hrv_log` gebruikt **per-veld** provenance (`hrv_source`/`rhr_source`/`sleep_source`, waarden `manual`/`wearable`/`unknown`) — bewust NIET rij-niveau, omdat één rij aantoonbaar gemengde herkomst kan hebben (bv. HRV=wearable, RHR=manual, sleep=wearable in dezelfde rij). Een rij-niveau label zou feitelijk onjuist zijn. Geen aparte `provider`-kolom (nog niet geïmplementeerd, geen noodzaak bij precies één actieve wearable-bron).

**Bekend, apart geregistreerd risico (GAP-P1-008, F3 Final Integration Audit):** `hrv_log` heeft geen `UNIQUE(user_id,date)`-constraint en schrijfpaden zijn niet atomair — live bevestigd via 4 bestaande duplicate-rij-paren. Zie sectie 20.

## 5. Calculation Engine
Calculaties zijn: deterministisch, reproduceerbaar (waar relevant), version-aware, eenheid-gedefinieerd, null-safe, domein-gescoopt, onafhankelijk van AI, vrij van aanbevelingslogica. **Calculation != Decision.**

### 5.1 Calculation Registry-schema (verplicht per item)
ID, domain, name, version, formula/algorithm, implementation location, inputs, units, output, supported sports, minimum data quality, confidence model, evidence level, Evidence-bronnen, limitations, applicability, forbidden interpretations, toegestane Decision Rules, AI permissions, athlete-visible values, maturity/status.

### 5.2 Actuele Calculation-inventaris (reproduceerbaar geteld, `core/fEvidenceClaimAudit.test.js`)
23 items in `docs/CALCULATION_REGISTRY.md`, waarvan:
- **20 echte TK-calculations** met een evidence-niveau (A=1, B=4, C=4, D=1, E=7, NOT_IMPLEMENTED=3)
- **3 items zonder evidence-veld** (CALC-END-003, CALC-ENE-002, CALC-ENE-003) — dit zijn bewust GEEN TK-calculations maar bron-/gap-documentatie (device-provenance-onderscheid resp. USER_REPORTED/WEARABLE_ESTIMATE-labels); ze tellen niet mee als "calculation met evidence" omdat ze geen zelfstandige berekening zijn.

## 6. Context Engine
Context mag: selecteren, combineren, labelen, versheid aangeven, bron/provenance meenemen, kwaliteit/confidence meenemen. Context mag NIET: e1RM/HRV/load/recovery opnieuw berekenen, Decision Rules uitvoeren, ontbrekende feiten verzinnen.

**Actuele implementatie (eerlijk gedocumenteerd, MS-F3-06):** de daadwerkelijke, actief-aangeroepen contextbron is `buildCtx()` in `index.html`. `core/contextEngine.js` (`ContextEngineCore`) bestaat als pure, geteste module maar is **niet runtime-geïntegreerd** — bevestigd via het eigen bestandscommentaar. Dit is GAP-P2-014, een architectuurinconsistentie, geen tegenstrijdige waarheid (geen twee actieve bronnen die elkaar tegenspreken). Niet kunstmatig "opgelost" om dit document mooier te maken.

### 6.1 Context origins (actueel gebruikt, geen nieuwe categorieën verzonnen)
`USER_REPORTED`, `RAW_SOURCE`, `DEVICE`, `CALCULATED`, `SYSTEM`, `DERIVED_CONTEXT`, `UNKNOWN`.

### 6.2 Freshness-categorieën
`realtime`, `session`, `daily`, `slow-changing`, `persistent`.

## 7. Decision Engine
Decision Rules zijn: deterministisch, versioned, expliciet, testbaar, kwaliteit-bewust, confidence-bewust waar relevant, evidence/heuristiek-geclassificeerd, uitlegbaar. **AI is geen Decision Engine.**

### 7.1 Decision Rule-schema (verplicht per regel)
Rule ID, version, purpose, benodigde Calculation IDs, Context-inputs, minimum quality, minimum confidence, logic, thresholds, priority, conflict resolution, outcome, evidence class, heuristic status, limitations, forbidden interpretations, explainability, AI permissions, implementation location.

### 7.2 Actuele Decision Rules: exact 9 (herverifieerd, niet blind overgenomen)
`DEC-PROG-001`, `DEC-RECADJ-001`, `DEC-READY-001`, `DEC-DETRAIN-001`, `DEC-REST-001`, `DEC-SETOUT-001`, `DEC-READYDAY-001`, `DEC-ACWR-ADV-001`, `DEC-LOADCORR-001` — elk met precies één canonieke implementatie in `core/decision.js` (geverifieerd, geen duplicaten).

## 8. Data Quality vs. Confidence vs. Evidence (harde scheiding)
- **Evidence**: hoe sterk is de wetenschappelijke onderbouwing van de METHODE (statisch).
- **Data Quality**: kwaliteit van de INPUT/DATA voor deze concrete meting (completeness, recency, sample sufficiency, source reliability, measurement quality, consistency).
- **Confidence**: hoe betrouwbaar is DEZE CONCRETE UITKOMST voor deze gebruiker, nu (dynamisch, deterministisch, nooit AI-gegenereerd, geen pseudo-precisie).

Bekende, apart genoteerde beperking: `recoveryScore()`'s confidence telt uitsluitend componentaantal, niet componentkwaliteit (GAP-P2-015) — blijft een geregistreerde limitatie, niet stilzwijgend "opgelost".

## 9. Evidence-niveaus
A = sterke, consistente evidence · B = goede praktische/empirische basis · C = contextafhankelijk · D = controversieel/beperkt · E = technisch/afgeleid, geen zelfstandige wetenschappelijke claim · UNVERIFIED waar van toepassing.

**Kernprincipe:** exacte claim <-> exacte bron. Een algemene review (bv. ACSM 2026) ondersteunt niet automatisch een specifieke formule (bv. Epley) — claim-specifieke evidence verplicht, geen citation laundering.

### 9.1 Wetenschappelijke correcties uit MS-F3-09 (formeel vastgelegd)
- **Epley (CALC-STR-001) en Brzycki (CALC-STR-002):** beide formules zijn oorspronkelijk NIET afkomstig uit peer-reviewed onderzoek (praktijkgerichte publicaties zonder gedocumenteerde steekproef). De B-classificatie rust op latere, aparte validatie-/vergelijkingsliteratuur (LeSuer et al. 1997), niet op de formule-oorsprong zelf. Bekende beperking: systematische onderschatting bij de deadlift specifiek.
- **ACWR (CALC-LOAD-001):** evidence C, niet B — methodologische kritiek (mathematical coupling, Windt & Gabbett 2018) expliciet vermeld naast de ondersteunende bron (Gabbett 2016).
- **HRV-baseline (CALC-REC-001):** evidence B, correct toegeschreven aan Plews et al. (2013)'s Ln-RMSSD/rolling-mean/SWC-methodologie — niet uitgebreid naar de "15%-ernstige-daling"-drempel (die apart, zwakker gebrond is) of naar de Recovery Score-compositie (apart, lager geclassificeerd, D).
- **Recovery Score (CALC-REC-003):** evidence D — de 45/30/15/10%-gewichtsverdeling is een productheuristiek; componentevidence verhoogt de compositie-evidence niet automatisch.

## 10. Verboden interpretaties (formeel, per domein)
- **ACWR:** nooit blessurevoorspeller, nooit universele veilige zone, nooit zelfstandig trainingsverbod, nooit medische risicoscore.
- **HRV:** nooit diagnose, nooit overtrainings- of ziektedetector, nooit verplichte-rustdag-regel, nooit blessurevoorspeller — uitsluitend een context-/herstelsignaal.
- **Energy:** provider-calorieën zijn schattingen, nooit exacte claims. BMR/RMR/TDEE blijven NOT_IMPLEMENTED zolang geen methodekeuze is gemaakt (productbeslissing, geen technische lacune).
- **Endurance:** geïmplementeerd = pace/split/tijd-conversie + Concept2-achtige vermogensconversie. NOT_IMPLEMENTED = Critical Speed, Critical Power, TRIMP, HR-zones, aerobic decoupling — nooit als bestaande functionaliteit gepresenteerd.

## 11. Explainability, Immutability, Reproducibility — drie strikt gescheiden begrippen
- **Explainable:** we kunnen reconstrueren welke inputs/regel/uitkomst betrokken waren.
- **Immutable:** een opgeslagen snapshot verandert zelf niet.
- **Reproducible:** een historische uitkomst kan exact opnieuw gegenereerd worden uit historische inputs + historische algoritme-versies.

**Bewezen bij MS-F3-10 (niet aangenomen, code daadwerkelijk gelezen en getest):** `buildDecisionEvidence`/`readDecisionEvidence` zijn **immutable** — `readDecisionEvidence()` retourneert een diepe kopie, nooit een referentie naar levende state; het muteren van een teruggelezen kopie raakt het opgeslagen snapshot niet (functioneel bewezen in `core/fProvenanceClosure.test.js`). `evidenceReproduceerbaar()` vergelijkt een snapshot met een opnieuw genomen beslissing en onderscheidt "andere_uitkomst" van "andere_regelversie" — dit ondersteunt **reproducibility-detectie**, niet een garantie dat elke historische uitkomst altijd reproduceerbaar IS (dat hangt af van of de aanroeper voldoende ruwe inputs+versies in het snapshot heeft gestopt).

## 12. AI Coach-contract
**AI mag:** samenvatten, interpreteren, contextualiseren, uitleggen, onzekerheid communiceren, canonieke metrics vergelijken.
**AI mag niet:** autoritatieve berekeningen uitvoeren, ontbrekende data verzinnen, thresholds creëren, Decision Rules maken, een Decision-uitkomst overschrijven, evidence-niveau verhogen, diagnosticeren, ongesteunde causaliteit claimen.

**F4-grens (expliciet, geen overclaim):** de deterministische upstream-keten geeft de AI geen gefabriceerde waarde en de prompt instrueert het model deze grens te respecteren (**prompt-level governance: bevestigd aanwezig**). Er bestaat **geen** technische validator die een afwijkend AI-modelantwoord afdwingbaar blokkeert — dat is `AI-OUTPUT-CONTRACT-001`, expliciet bestemd voor **F4**, geen F3-capability.

## 13. Change Governance
**Nieuwe calculation:** (1) claim definiëren -> (2) Calculation Registry-item toevoegen -> (3) evidence verifiëren -> (4) deterministische implementatie -> (5) tests -> (6) quality/confidence-model -> (7) toegestane Decision Rules definiëren -> (8) provenance -> (9) docs -> (10) versiebeheer.
**Nieuwe Decision Rule:** analoog proces met ID/version, calculation/context-afhankelijkheden, kwaliteits-/confidence-gates, exacte thresholds, heuristiek/evidence-classificatie, conflict-precedence, testcases, verboden interpretaties, explainability-contract, AI-permissies.

## 14. Governance-noot
Dit document wordt bijgewerkt bij elke F3-vervolgsprint of toekomstige calculation-/decision-uitbreiding. Het vervangt nooit de brondata in `docs/CALCULATION_REGISTRY.md`/`docs/DECISION_RULE_REGISTRY.md`/`docs/CONTEXT_CONTRACT.md`/`docs/DATA_QUALITY_CONFIDENCE_CONTRACT.md` — bij een conflict tussen dit document en een brondocument wint het brondocument (dat dichter bij de code staat), en dit document wordt gecorrigeerd.
