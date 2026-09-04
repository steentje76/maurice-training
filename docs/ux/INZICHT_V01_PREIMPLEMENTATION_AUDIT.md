# INZICHT_V01_PREIMPLEMENTATION_AUDIT.md

**GEEN RUNTIME IMPLEMENTATIE. GEEN VISUELE WIJZIGING. GEEN NIEUW SCHERM.** Dit document plant, het bouwt niets.

## Fase 2 — Canonical Inzicht visual (opnieuw, visueel geïnspecteerd)
Header ("Inzicht"/"Jouw ontwikkeling en herstel"/avatar) → Period Selector (7 dagen | 4 weken | 3 maanden, "7 dagen" actief) → Filter Chip ("Alle sporten ▾") → Featured-achtige "Jouw ontwikkeling"-kaart (4 summary-cellen: Verbeterd/Stijgende trends/Trainingen/Adherence, met sub-vergelijking t.o.v. vorige periode) → AI-sparkle-conclusie-strook → "Snel overzicht" (5 compacte metric-cellen met ring/waarde/trend-pijl) → 6 domain-rijen (Prestaties/Herstel/Belasting/Lichaam/Verbanden/Doelen, elk icon+titel+subtekst+mini-visualisatie+chevron) → 3 "Belangrijkste inzichten"-kaarten → "Bekijk alle inzichten en trends"-CTA. **Alle numerieke waarden zijn designvoorbeelden — niets hardcoded.**

## Fase 3 — Legacy Functional Inventory
Zie `docs/ux/INZICHT_V01_FUNCTIONAL_PRESERVATION_MATRIX.md` — 13 legacy-schermen (`s-lichaam` + 11 sub-schermen + `s-stats` + `s-doelen`) volledig geïnventariseerd, 26 individuele functies, alle gemarkeerd PRESERVE=JA.

## Fase 4 — Target Information Architecture
```
INZICHT OVERVIEW
├─ Jouw ontwikkeling (4 summary cells) — DIRECT
├─ Snel overzicht (5 metric cells) — DIRECT
├─ PRESTATIES → PR's, 1RM, krachtverhoudingen, multisport, cardio-records
├─ HERSTEL → anatomie (voor/achter), hersteltrends, HRV/rusthartslag/slaap (7-90d)
├─ TRAININGSBELASTING → volume per spiergroep, consistentie
├─ LICHAAM → metingen, samenstelling, historie, gegevens & koppelingen
├─ VERBANDEN → correlatie-overzicht, verband-detail
├─ DOELEN & PROGRAMMA → actieve doelen, challenges
├─ WOMEN'S PERFORMANCE → cyclus (NIET automatisch zichtbaar, zie D10)
├─ VOEDING → niet in huidige legacy-inventaris gevonden binnen Lichaam/Voortgang; blijft voorlopig buiten Inzicht-scope (geen bestaande functionaliteit om te preserveren)
└─ SPORT-SPECIFIEK → roei-progressie, running/cycling-trends (deels al onder Prestaties gedekt)
```
Overzichtsscherm toont 6 domain-tiles (conform mockup), niet alle 11 architectuur-domeinen als aparte tegel — de overige functionaliteit blijft bereikbaar via drill-down binnen de 6 zichtbare domeinen (zie matrix).

## Fase 5 — History / Insight / Coach Boundary
- **KEEP IN HISTORY:** "Volledig trainingslogboek"-link (`s-hist`) — blijft Trainen-domein, niet verplaatst.
- **MOVE ENTRY TO INSIGHT:** alle 26 geïnventariseerde Lichaam/Voortgang-functies (interpretatie van data).
- **KEEP IN COACH:** "Wat betekent dit voor vandaag?"-doorlink vanuit Lichaam blijft naar Coach wijzen (advies-laag, niet interpretatie).
- **SHARED DEEP LINK:** Inzicht-detailschermen mogen naar Coach linken voor advies, en naar Trainen voor actie — geen functionaliteit dupliceren.
- **UNCLEAR:** geen gevonden.

## Fase 6 — Component Reuse Map
| Element | Existing component | Reuse | Reason |
|---|---|---|---|
| Page shell / header / profile trigger | `.hdr`/`.ibtn` | EXACT | reeds canoniek, Trainen-bewezen |
| Section label | `.v43-lbl` | EXACT | canoniek |
| Standard Card | `.tk-card.tk-card-l3` | EXACT | canoniek, DS-05 |
| Featured Card | marine-kaart-patroon | MOGELIJK NIET NODIG | "Jouw ontwikkeling"-kaart is wit/licht in de mockup, geen marine — vermoedelijk Standard Card met interne structuur, geen Featured Card. Bevestigen tijdens implementatie. |
| Icon container | `.tk-icon-box`/`-sm` | EXACT | canoniek |
| Icon+text+chevron row (domain rows) | `.v43-tmt(-inset) .row` | EXACT of VARIANT | de 6 domain-rijen hebben een mini-visualisatie rechts (naast de chevron) die het bestaande patroon niet heeft — mogelijk een gedocumenteerde variant nodig (zie NEW COMPONENT CANDIDATES) |
| Buttons | `.tk-btn-*` | EXACT | canoniek |
| Period Selector | — | **NEW COMPONENT** (zie Fase 7) | niets vergelijkbaars gevonden in de huidige runtime |
| Filter Chip/Dropdown | — | **NEW COMPONENT** (zie Fase 8) | niets vergelijkbaars gevonden |
| Metric Summary Cell ("Jouw ontwikkeling"-cellen) | — | **NEW COMPONENT** | geen bestaand 4-cellen-grid-patroon met pijl+cijfer+sublabel gevonden |
| Metric Overview Card ("Snel overzicht"-cellen) | — | **NEW COMPONENT** (mogelijk variant van Metric Summary Cell, kleiner) | ring-indicator (Herstelstatus) bestaat mogelijk al elders (bv. Voortgang-ringen in Trainen-context) — onderzoeken tijdens implementatie of hergebruik mogelijk is |
| Mini Trend Visualization (sparklines, bar-mini-charts) | — | **NEW COMPONENT** | geen bestaand, herbruikbaar mini-chart-component gevonden; bestaande `stats-hrv-chart` gebruikt canvas voor een volwaardige chart, geen mini-sparkline |
| Insight/Trend Row ("Belangrijkste inzichten"-kaarten) | Standard Card, variant | REUSE WITH VARIANT | icoon-in-cirkel (i.p.v. icon-box-vierkant) + pijl-indicator — kleine, gedocumenteerde variant |

## Nieuwe componenten — bewijs eerst noodzaak (volledig, gestructureerd)

| Component | Purpose | Semantics | Existing equivalent? | Reuse possible? | New component justified? | Tokens | Accessibility | Responsive |
|---|---|---|---|---|---|---|---|---|
| Period Selector | tijdsvenster kiezen zonder contentwissel | Period Selector (Fase 6-model, definitief) | `lich-seg`-toggle in `s-lichaam` is visueel gelijkend maar semantisch een Content Mode Switch (Herstel/Belasting), niet een periode-filter | gedeeltelijk (CSS-vorm herbruikbaar als referentie, semantiek niet) | JA | `--color-primary` (actief), bestaande pill-radius | `role="tablist"`/`role="tab"` (patroon al aanwezig in `lich-seg`) | compacte pills, getest op 320px moet passen zonder wrap |
| Metric Summary Cell | 4-koloms cijfer+label+sub-vergelijking | DATA-DEPENDENT presentatie van een DIRECT-cijfer | geen gevonden | nee | JA | `--space-*`, typography-schaal | cijfer + label + trend-richting elk apart voor screenreader (nooit alleen kleur/pijl) | 4 kolommen op 320px moeten smal genoeg blijven, mogelijk 2x2-grid nodig op kleinste viewport |
| Metric Overview Card | 5-koloms compacte metric+ring/waarde+trend | idem, DATA-DEPENDENT | mogelijk een bestaande ring-indicator elders (niet bevestigd binnen dit tijdsbudget) | gedeeltelijk, te onderzoeken tijdens implementatie | ONBEVESTIGD -- eerst bevestigen of een ring-component al bestaat | idem | idem | 5 kolommen, waarschijnlijk horizontaal scrollbaar op kleinste viewports i.p.v. samengeperst |
| Filter Chip/Dropdown | sportfilter, geen segmented control | Filter Chip (Fase 6-model, definitief) | Trainen's `<select id="sport-switcher">` is functioneel gelijkend maar visueel een kale HTML-select, geen pill-chip | gedeeltelijk (databron `getActiveSport()` herbruikbaar, visuele vorm niet) | JA (visuele vorm), NEE (databron, die bestaat al) | `--color-border`, pill-radius | `aria-haspopup`, keyboard-navigeerbaar | compact genoeg om naast de Period Selector te passen op 320px |
| Mini Trend Visualization | sparkline/mini-bar in domain-rows | SCREEN-SPECIFIC presentatie van bestaande trend-output | `stats-hrv-chart` (canvas, volwaardige chart) is geen mini-sparkline | nee | JA | `--color-primary` voor lijn/staven | tekstalternatief verplicht (bv. "stijgende trend") | schaalt mee met rijbreedte, geen vaste pixelbreedte |
| Insight Row | icoon-in-cirkel + titel + delta + chevron | REUSE WITH VARIANT van Icon Row Pattern | Icon Row Pattern bestaat, maar met vierkante icon-box, niet rond | JA, als gedocumenteerde variant | JA (variant, niet nieuw component) | zelfde tokens als Icon Row Pattern | zelfde als Icon Row Pattern | zelfde als bestaand patroon, bewezen op 6 viewports bij Trainen |

## Fase 7 — Period Selector
Geen bestaand, vergelijkbaar runtime-patroon gevonden (geen `.tk-segmented-control` bestaat al, conform Screen Implementation Standard — dit was al voorzien als toekomstige bouwbehoefte). **NEW COMPONENT, conform de reeds goedgekeurde `tk-segmented-control--period`-variant uit de Standard.** Tokens: `--color-primary` (actief-achtergrond), bestaande pill-radius-conventie. Accessibility: `role="tablist"`/`role="tab"` (patroon bestaat al in `s-lichaam`'s `lich-seg`, hergebruikbaar als referentie-implementatie). **Kritieke, harde eis (Fase 7): per metric moet bevestigd worden of de onderliggende calculation een periode-parameter accepteert — zie Decision Register D8. Geen enkele metric toont een periode-afhankelijk cijfer totdat dit per metric bevestigd is.**

## Fase 8 — Sport Filter
Geen bestaand dropdown/filter-chip-component gevonden voor dit specifieke doel (de bestaande sport-switcher in Trainen is een `<select>`, geen visuele filter-chip). **NEW COMPONENT.** Bestaand sport-contextmodel (`getActiveSport()`, `SPORT_BLOCKS`) is herbruikbaar als databron. "Alle sporten" moet de default zijn; single-sport-filter moet metrics tonen die alleen voor die sport zinvol zijn (bv. geen "roei-progressie" tonen bij filter "Hardlopen").

## Fase 9 -- Data Source Mapping / Data Contract (harde gate, STATUS-kolom toegevoegd)

Per element: STATUS = READY (bron + berekening bestaan, direct herbruikbaar) / PARTIAL (bron bestaat, periode- of sport-ondersteuning nog te bevestigen) / MISSING (geen canonieke bron gevonden) / NOT APPLICABLE.

| UI ELEMENT | REQUIRED VALUE | ACTUAL SOURCE | RAW/CALC | CALCULATION ID | PERIOD SUPPORT | SPORT SUPPORT | EMPTY STATE | STATUS |
|---|---|---|---|---|---|---|---|---|
| Herstelstatus | % + kwalificatie (Goed/Optimaal/...) | Recovery Decision Engine (B9-H4) | CALCULATED | bestaand | onbevestigd | sport-onafhankelijk | "Onvoldoende data" | **PARTIAL** |
| HRV (7d) | ms + trend | `dc.healthTrend` | CALCULATED | bestaand | JA (7d expliciet) | n.v.t. | "MISSING" | **READY** |
| Rusthartslag | bpm + trend | `dc.healthTrend` | CALCULATED | bestaand | onbevestigd | n.v.t. | "MISSING" | **PARTIAL** |
| Slaap (7d) | uren + trend | `dc.healthTrend` | CALCULATED | bestaand | JA | n.v.t. | "MISSING" | **READY** |
| Trainingsbelasting | waarde + kwalificatie (Optimaal) | bestaande load-aggregatie | CALCULATED | bestaand | onbevestigd | mogelijk sport-specifiek | "Onvoldoende data" | **PARTIAL** |
| "4 Verbeterd" | telling | `CoachingCore.improvementsDigest(buildImprovementItems())` | CALCULATED | bestaand | onbevestigd | multi-sport | "0" (echte telling) | **PARTIAL** (bron READY, exacte teldefinitie D1 nog PO-besluit) |
| "5 Stijgende trends" | telling | `ProgressionCore.trendBy` + `c.trendUps` | CALCULATED | bestaand | onbevestigd | per-sport | "0" (echte telling) | **PARTIAL** (bron READY, richting-semantiek D2 nog PO-besluit) |
| "2 Trainingen" | telling | sessions-telling | RAW (telling) | bestaand | JA | alle | "0" geldig | **PARTIAL** (welke executions precies meetellen -- zie hieronder, Fase 11-uitbreiding) |
| "0% Adherence" | percentage | `AdherenceIntelligenceCore`/`ScheduleAdherenceCore` | CALCULATED | bestaand | onbevestigd | programma-specifiek | "--" bij geen programma | **PARTIAL** (bron READY, noemer-definitie D3 nog PO-besluit) |
| e1RM-trend | % + richting | `core/calculation.js oneRMResult` + `ProgressionCore.trendBy` | CALCULATED | bestaand, protected core | JA (4wk expliciet) | kracht-only | "Onvoldoende historie" | **READY** |
| Roeien-trend (rowing/endurance) | tijd + richting | `ProgressionCore.trendBy` op ergometer-data | CALCULATED | bestaand | JA | roeien-only | "Onvoldoende historie" | **READY** |
| Slaapduur-trend | minuten + richting | `dc.healthTrend` | CALCULATED | bestaand | JA | n.v.t. | "MISSING" | **READY** |

Geen enkel element is MISSING op bronniveau -- alle bestaande calculation-functies zijn gevonden. De PARTIAL-status betreft uitsluitend (a) periode-parameter-ondersteuning nog niet individueel bevestigd, of (b) een exacte teldefinitie die een Product Owner-besluit vereist (zie Decision Register).

## Fase 10 — Calculation Engine Audit
Alle in Fase 9 genoemde bronnen zijn reeds bestaand en eerder (in vorige sprints) gecontroleerd op determinisme/versioning binnen hun eigen domein (Recovery: B9-H4, e1RM: `core/calculation.js` protected core, Adherence: eerder geaudit in Trainen-context). Geen nieuwe calculation-audit nodig voor hergebruik — wel een expliciete, per-metric bevestiging van periode-parameter-ondersteuning (D8) vóór implementatie.

## Fase 11 — Context Engine
Sport-context (filter), cyclus/Women's Performance-context (apart, niet automatisch), device-source (wearable vs. handmatig, beïnvloedt confidence-presentatie), tijdsperiode (Period Selector). Geen contextlogica wordt in dit plan gedupliceerd naar de frontend — alle context blijft server/calculation-side.

## Fase 12 — Decision Engine Boundary
Classificaties zoals "Goed"/"Optimaal"/"Lager dan normaal" in de mockup moeten uit de bestaande Recovery Decision Engine (B9-H4) komen, niet uit nieuwe, in de UI verzonnen thresholds. Te bevestigen per metric tijdens implementatie welke classificatie-functie precies wordt aangeroepen.

## Fase 13 — Evidence/Data Quality/Confidence
Onderscheid: overzicht toont compact (bv. een icoon/kleur-neutrale indicator bij onvoldoende data), detail toont volledige uitleg (bron, periode, beperkingen). Geen bestaand, herbruikbaar "confidence badge"-component gevonden (D9) — mogelijk een nieuwe, kleine component, pas te bouwen na bevestiging dat dit niet al elders bestaat.

## Fase 14 — "Jouw ontwikkeling": de vier development summary metrics, in detail

### VERBETERD
Welke metrics tellen mee, directionality, of lager soms beter is, minimum history, confidence: **alles al onderdeel van de bestaande `CoachingCore.improvementsDigest()`-implementatie** (per-metric-directionality zit al verwerkt in de onderliggende `buildImprovementItems()`-logica, gebruikt in Home). Geen nieuwe regel nodig — wel expliciet te bevestigen (D1) dat Inzicht exact dezelfde digest-aanroep gebruikt, geen eigen, licht-afwijkende variant.

### STIJGENDE TRENDS
Stijgend != beter, expliciet bevestigd (D2). Minimum history en trend-logica zitten al in `ProgressionCore.trendBy(perfsMetPace, band, field, dir, 3)` — de `dir`-parameter (bv. `'min'` voor pace, `'max'` voor kracht) bepaalt al per metric wat "verbeteren" betekent; de telling zelf (`c.trendUps`) is losstaand van die richting en telt puur "trend gedetecteerd", niet "trend is positief" — dit is precies de nuance die Fase 14 vraagt te onderscheiden, en die al zo geïmplementeerd is.

### TRAININGEN — gedetailleerde executie-inventarisatie
Welke completed executions precies meetellen is **nog niet bevestigd als canonieke, vaste regel** — de bestaande `sessions`-telling omvat naar bevinding: Strength (`sessions`-tabel), Running/Cycling (aparte `activities`-tabel, zie B9-H6B-bevinding: sessions en activities zijn NIET parallelle waarheden), HYROX/Triathlon (`training_instances` met race-velden), Team-sessies (indien via Gym/Team-context gelogd), handmatige en apparaat-gesynchroniseerde sessies (beide via dezelfde tabel, `_pending`-vlag onderscheidt sync-status). **Duplicaten:** geen expliciete, canonieke dedupe-regel gevonden binnen dit tijdsbudget voor de combinatie sessions+activities in één "Trainingen"-telling — **PRODUCT/CALCULATION GAP, zie Decision Register D11 (nieuw).**

### ADHERENCE — edge cases
Noemer (D3) nog te bevestigen. Specifieke edge-cases uit deze opdracht, onderzocht: **verplaatste training** — `ScheduleAdherenceCore.resolveScheduleGap()` bestaat al en verwerkt `planned_date` vs. `completed_at`/`schedule_status`, dus verplaatsing lijkt al gedekt. **Gemiste/geannuleerde training, extra training, meerdere trainingen per dag:** niet expliciet bevestigd binnen dit tijdsbudget of `AdherenceIntelligenceCore.aggregate()` deze vier scenario's correct onderscheidt — **PRODUCT/CALCULATION GAP, zie Decision Register D12 (nieuw).** Geen van beide gaps zelf ingevuld; beide vereisen een gerichte, technische verificatie van de bestaande functie-inhoud vóór implementatie, niet een nieuwe aanname.

## Fase 15 — Snel overzicht + No-Wearable Audit (uitgebreid, scenariomatrix)

Alle 5 items hebben een bestaande, canonieke bron (Fase 9). **NO-WEARABLE bevestigd haalbaar.**

| Scenario | Herstelstatus | HRV | Rusthartslag | Slaap | Trainingsbelasting |
|---|---|---|---|---|---|
| No wearable | UNAVAILABLE (toont "geen data", niet 0) | UNAVAILABLE | UNAVAILABLE | REPLACED BY ALTERNATIVE DATA (handmatige invoer mogelijk, zoals nu al bij Home's "Herstelcheck niet compleet") | AVAILABLE (trainingsbelasting is sessie-gebaseerd, geen wearable nodig) |
| Partial wearable (bv. alleen stappen, geen HRV-sensor) | PARTIAL (lagere confidence, bestaand principe uit B9-H5) | UNAVAILABLE | AVAILABLE indien device dit wel meet | AVAILABLE indien device dit wel meet | AVAILABLE |
| Manual data only | PARTIAL (afhankelijk van welke velden handmatig ingevuld zijn) | REPLACED BY ALTERNATIVE DATA (handmatige HRV-invoer bestaat, zie Home) | REPLACED BY ALTERNATIVE DATA indien handmatig ingevoerd | REPLACED BY ALTERNATIVE DATA | AVAILABLE |
| Multiple sources | AVAILABLE (bestaande brondisambiguatie) | AVAILABLE, met provenance-vermelding | AVAILABLE | AVAILABLE | AVAILABLE |
| Stale source | PARTIAL (bestaande staleness-gate, zie `fix/home-coach-freshness-gate`-precedent) | PARTIAL | PARTIAL | PARTIAL | AVAILABLE |
| Disconnected source | UNAVAILABLE, met een duidelijke reconnect-CTA (bestaand patroon uit Profiel/Apparaten-concept) | UNAVAILABLE | UNAVAILABLE | UNAVAILABLE | AVAILABLE |

Geen fictieve recovery-data in enig scenario — elk UNAVAILABLE/PARTIAL-geval toont een tekstuele status, nooit een verzonnen getal.

## Fase 16 — Domain Cards
6 kaarten (Prestaties/Herstel/Belasting/Lichaam/Verbanden/Doelen), elk met een bestaande data-achterliggende functie (zie matrix). Mini-visualisaties zijn NIEUW als component maar visualiseren uitsluitend bestaande, reeds berekende output — geen nieuwe calculation.

## Fase 17 — Belangrijkste inzichten — zie Decision Register D4 (blokkerend voor deze specifieke sectie).

## Fase 18 — Associations/Verbanden
Bestaande verbanden-functionaliteit (`s-lich-verbanden`/`s-lich-verband`) is al gebouwd met een deterministische, geen-causale-taal-aanpak (naam "Deterministische verbanden" in de mockup zelf bevestigt dit ontwerpprincipe). Geen aanpassing nodig aan de onderliggende taal-regels; alleen visuele migratie.

## Fase 19 — Women's Performance
Bestaande Cyclus-functionaliteit (`s-lich-cyclus`) blijft volledig behouden. **Entry point: NIET automatisch zichtbaar op het Inzicht-overzicht** (Decision Register D10, veiligste, conservatieve keuze) — bereikbaar via Herstel- of Lichaam-domeincard, net als vandaag via Lichaam.

## Fase 20 — Body/Health Privacy
Bestaande health-scope/RLS-grenzen (uit eerdere B9-H4/H5-sprints) blijven ongewijzigd van toepassing — Inzicht is een nieuwe presentatielaag op dezelfde, al beveiligde databronnen, geen nieuwe data-toegang.

## Fase 21 — Responsive/Accessibility Plan
Zelfde 6 viewports (320-430px) als bewezen bij Trainen. Extra aandachtspunten: Period Selector `role="tablist"`, trend-pijlen altijd icoon+tekst (nooit kleur-only, conform bestaand DS-principe), mini-visualisaties hebben een tekstueel alternatief voor screenreaders (bv. "stijgende trend, 3 opeenvolgende weken").

## Fase 22 — Empty/Degraded States
Alle in Fase 9 genoemde MISSING-gevallen; aanvullend: nieuwe gebruiker (0 sessies ooit) toont een aparte, verwelkomende empty-state i.p.v. lege domain-cards.

## Fase 23 — Existing Navigation Dependency
**NAVIGATION MIGRATION DEPENDENCY, ongewijzigd bevestigd (zoals bij Trainen).** Bottom-nav blijft Home/Training/Lichaam/Coach/Voortgang. Bij een toekomstige, daadwerkelijke Inzicht-implementatie: het nieuwe Inzicht-scherm kan tijdelijk bereikbaar worden gemaakt vanaf zowel de bestaande "Lichaam"- als "Voortgang"-navigatie-knoppen (beide wijzen dan naar hetzelfde, nieuwe scherm) totdat de volledige bottom-nav-migratie plaatsvindt — dit voorkomt dat gebruikers een van beide, huidige bestemmingen kwijtraken vóór de navigatie zelf verandert. Geen code hiervoor geschreven in deze audit.

## Fase 24 — New Component Candidates (definitief, voor deze fase)
| Component | Status |
|---|---|
| Period Selector (`tk-segmented-control--period`) | NEW COMPONENT REQUIRED (reeds voorzien in de Standard) |
| Filter Chip/Dropdown | NEW COMPONENT REQUIRED |
| Metric Summary Cell | NEW COMPONENT REQUIRED |
| Metric Overview Card | NEW COMPONENT REQUIRED (mogelijk variant van Summary Cell) |
| Mini Trend Visualization | NEW COMPONENT REQUIRED |
| Insight/Trend Row | REUSE WITH APPROVED VARIANT (Standard Card + icoon-in-cirkel) |
| Confidence/Data Quality-indicator | NEW COMPONENT REQUIRED, mits D9 bevestigt dat niets bruikbaars al bestaat |
| Domain Row (icon+text+mini-viz+chevron) | REUSE WITH APPROVED VARIANT van Icon Row Pattern |

## Fase 25 — Implementation Order (voorstel, niet uitgevoerd)
1. Period Selector + Filter Chip (nieuwe, kleine componenten, onafhankelijk testbaar)
2. Metric Summary Cell + Metric Overview Card
3. Page shell/header (reuse)
4. "Jouw ontwikkeling"-sectie wiring (afhankelijk van D1-D3-besluiten)
5. "Snel overzicht"-wiring
6. Domain cards + Mini Trend Visualization
7. "Belangrijkste inzichten" (afhankelijk van D4-besluit, mogelijk uitgesteld)
8. Drill-down-routes naar bestaande sub-schermen (grotendeels al bestaand, alleen entry-points migreren)
9. Empty/degraded states
10. Browser-runtime + responsive tests
11. Visual delta audit tegen canonical PNG

## Fase 26 — Test Plan
Source tests, component contract tests (Period Selector/Filter Chip/Summary Cell), calculation-source-tests (bevestigen dat UI geen shadow-calculation bevat — regex-gebaseerd, zoals bij Trainen), route-tests (alle 13 legacy-routes nog bereikbaar), privacy/RLS-tests (Cyclus blijft health-scope), no-wearable-tests, empty-state-tests, browser-runtime-tests (Playwright, verplicht sinds Trainen-les), responsive-tests (6 viewports), accessibility-tests, visual-delta-tests, canonical-PNG-integriteit, cross-domain-regressie.

## Fase 27 — Benchmark Check (bestaande projectkennis, geen nieuwe webresearch)
Geen expliciete, eerdere benchmark-documentatie over Garmin/WHOOP/TrainingPeaks/Strava specifiek voor een "Inzicht"-achtig scherm gevonden binnen de repo tijdens deze audit. Kwalitatieve observatie uit de mockup zelf: periode-schakelen + sport-filter + domein-tegels-met-mini-viz is consistent met hoe TrainingPeaks/WHOOP hun "insights"-overzichten structureren (periode bovenaan, domeinen als scanbare lijst, details één tap dieper) — geen nieuwe features hieruit afgeleid, puur ter bevestiging dat de mockup-structuur zelf gangbaar is.

## Blocker Burn-Down (Decision Resolution Sprint)

| Blocker (was) | Root cause | Evidence | Can resolve now? | Resolution | Remaining decision | Owner |
|---|---|---|---|---|---|---|
| D1 Verbeterd-definitie | onbevestigd of Home-functie canoniek genoeg was | `buildImprovementItems()`/`ProgressionCore` volledig gelezen: metric-specifieke `dir`, min. 2 samples, expliciet gedocumenteerd | JA | **OPGELOST -- A. ALREADY DEFINED** | geen | n.v.t. |
| D2 Stijgende trends-richting | "stijgend != beter"-risico | `ProgressionCore.trendBy()`: `improving` gebruikt dezelfde metric-`dir`, nooit naief "hoger=beter" | JA | **OPGELOST -- A. ALREADY DEFINED** | geen | n.v.t. |
| D3 Adherence-noemer | onbekende exacte semantiek | `AdherenceIntelligenceCore.aggregate()` volledig gelezen, module-header expliciteert numerator/denominator/SKIPPED-semantiek | GEDEELTELIJK | **B. TECHNICAL FACT**, met 1 gerapporteerd conflict (SKIPPED blijft in noemer, i.p.v. de voorlopige PO-richting "geldige annulering verdwijnt uit noemer") | PO1 (zie Decision Pack) | Product Owner |
| D4 Insight Ranking | geen canonieke rankingfunctie gevonden | candidate-signal-inventory volledig doorlopen, bevestigd: geen combinerende, geversioneerde rankingfunctie bestaat | NEE | blijft blocker | PO2 (zie Decision Pack) | Product Owner |
| D8 Periode-parameter per metric | niet individueel bevestigd | technisch, per-metric verificatiewerk (geen productbeslissing) | JA (als taak, niet als PO-vraag) | **B. TECHNICAL FACT**, uit te voeren tijdens implementatie zelf, niet vooraf blokkerend voor de audit | geen PO-besluit nodig, wel implementatiewerk | Claude, tijdens bouwfase |

**BLOCKERS BEFORE: 6. BLOCKERS RESOLVED: 4 (D1, D2, D3 gedeeltelijk, D11, D12 -- zie hieronder). BLOCKERS REMAINING: 2 (PO2 Insight Ranking blijft hard blokkerend voor die ene sectie; PO1 Adherence-SKIPPED is technisch niet-blokkerend zodra Optie A gekozen wordt, wat de aanbevolen, standaard keuze is).**

## D11/D12 — Forensische resolutie (nieuw)

**D11 (Training count, sessions vs. activities):** volledig technisch bewezen via het bestaande `docs/B9_H6B_FINAL_REPORT.md` -- `sessions` (kracht/WOD/ergometer) en `activities` (standalone endurance) zijn architecturaal gescheiden, GEEN overlap mogelijk. Hardlopen (activities) + kracht (sessions) op dezelfde dag = 2 afzonderlijke, niet-overlappende executions = **2 Trainingen, exact de voorlopige PO-richting, nu bevestigd als B. TECHNICAL FACT.** Een multisport/brick-sessie (bv. HYROX) wordt al als één, samenhangend `training_instances`-record gemodelleerd (race-velden), dus telt terecht als 1 -- geen arbitraire UI-opsplitsing nodig of aanwezig.

**D12 (Adherence edge-cases):** volledig technisch bewezen via `core/adherenceIntelligence.js` + `core/scheduleAdherence.js`:
- **planned completed** -> COMPLETED (numerator)
- **planned moved then completed** -> door "reschedule-veiligheid" (altijd een UPDATE van hetzelfde record) telt dit als 1 COMPLETED op de nieuwe datum, geen dubbele bestraffing -- **exact de PO-richting, technisch bevestigd**
- **planned moved then missed** -> MISSED op de nieuwe, verplaatste datum
- **planned cancelled** -> geen aparte "cancelled"-status bestaat in `resolveScheduleGap()` (alleen COMPLETED/SKIPPED/FUTURE/TODAY/MISSED) -- een annulering zou als SKIPPED gemodelleerd moeten worden
- **planned skipped** -> SKIPPED, blijft in de noemer als niet-voltooid (bewust, conservatief -- zie PO1)
- **extra unplanned completed** -> zit structureel NIET in de input-lijst van `aggregate()` (die itereert uitsluitend over geplande `items`) -- **technisch onmogelijk dat dit de teller boven 100% duwt, exact de PO-richting, bevestigd zonder dat een expliciete cap nodig is**
- **multiple workouts/day** -> niet van toepassing op Adherence zelf (werkt op program_blocks, niet op sessies-per-dag)
- **coach/team/program-generated/manual/imported workout** -> `aggregate()` is bron-agnostisch, itereert over elk item met een `planned_date`/`completed_at`/`schedule_status` ongeacht oorsprong -- geen onderscheid nodig of aanwezig

## Fase 29 -- Implementation Readiness Score (BEFORE / AFTER Decision Resolution Sprint)

| Categorie | BEFORE | AFTER | Uitleg wijziging |
|---|---|---|---|
| Functional Preservation Readiness | 9 | 9 | ongewijzigd, al volledig |
| Data Readiness | 7 | 7 | ongewijzigd -- D8 blijft technisch werk tijdens implementatie, geen nieuwe onzekerheid weggenomen op documentatieniveau |
| Calculation Readiness | 8 | **9** | D1/D2/D11/D12 forensisch, met code-bewijs, volledig bevestigd als reeds bestaand en correct -- aantoonbare onzekerheid weggenomen |
| Context Readiness | 7 | 7 | ongewijzigd |
| Decision Readiness | 6 | **7** | Adherence-classificatie (D3/D12) nu volledig doorgrond met code-bewijs, op 1 expliciet, klein PO-conflict na |
| Evidence Readiness | 5 | 5 | ongewijzigd -- PO3 (confidence-presentatie) blijft een open, echte keuze, geen technisch bewijs kan dit oplossen |
| Component Reuse Readiness | 7 | 7 | ongewijzigd |
| Accessibility Readiness | 7 | 7 | ongewijzigd |
| Privacy/Security Readiness | 8 | 8 | ongewijzigd |
| Test Readiness | 8 | 8 | ongewijzigd |
| Visual Implementation Readiness | 6 | 6 | ongewijzigd -- geen visuele/component-bouw heeft plaatsgevonden deze sprint |

**OVERALL IMPLEMENTATION READINESS: BEFORE 7/10 -> AFTER 7.2/10** (afgerond: 7/10). De stijging is bewust klein en beperkt tot de twee categorieen waar daadwerkelijk, aantoonbaar bewijs is gevonden (Calculation, Decision) -- geen enkele score is verhoogd omdat de documentatie uitgebreider werd; alleen waar een concrete onzekerheid met code is weggenomen.

**BLOCKERS BEFORE: 6 (D1, D3, D4, D8, plus D11/D12 impliciet meegeteld als onderdeel van D3/Training-count-onzekerheid).**
**BLOCKERS RESOLVED: 4 (D1, D2, D11, D12 volledig; D3 grotendeels, op 1 PO-conflict na).**
**BLOCKERS REMAINING: 2, beide expliciet, geen enkele verstopt in het gemiddelde:**
- **PO2 (Insight Ranking)** -- blokkeert uitsluitend de "Belangrijkste inzichten"-sectie, niet de rest van Inzicht.
- **PO1 (Adherence SKIPPED-conflict)** -- technisch niet-blokkerend zodra de aanbevolen, standaard Optie A gekozen wordt (0 codewijziging nodig); blijft formeel open totdat expliciet bevestigd.

D8 (periode-parameter per metric) is geherclassificeerd van "blocker" naar "technisch verificatiewerk tijdens implementatie" -- geen Product Owner-beslissing nodig, dus niet langer een besluitvormings-blocker, wel nog een implementatietaak.
