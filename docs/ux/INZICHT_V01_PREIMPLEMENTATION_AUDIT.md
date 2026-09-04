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

## Fase 7 — Period Selector
Geen bestaand, vergelijkbaar runtime-patroon gevonden (geen `.tk-segmented-control` bestaat al, conform Screen Implementation Standard — dit was al voorzien als toekomstige bouwbehoefte). **NEW COMPONENT, conform de reeds goedgekeurde `tk-segmented-control--period`-variant uit de Standard.** Tokens: `--color-primary` (actief-achtergrond), bestaande pill-radius-conventie. Accessibility: `role="tablist"`/`role="tab"` (patroon bestaat al in `s-lichaam`'s `lich-seg`, hergebruikbaar als referentie-implementatie). **Kritieke, harde eis (Fase 7): per metric moet bevestigd worden of de onderliggende calculation een periode-parameter accepteert — zie Decision Register D8. Geen enkele metric toont een periode-afhankelijk cijfer totdat dit per metric bevestigd is.**

## Fase 8 — Sport Filter
Geen bestaand dropdown/filter-chip-component gevonden voor dit specifieke doel (de bestaande sport-switcher in Trainen is een `<select>`, geen visuele filter-chip). **NEW COMPONENT.** Bestaand sport-contextmodel (`getActiveSport()`, `SPORT_BLOCKS`) is herbruikbaar als databron. "Alle sporten" moet de default zijn; single-sport-filter moet metrics tonen die alleen voor die sport zinvol zijn (bv. geen "roei-progressie" tonen bij filter "Hardlopen").

## Fase 9 — Data Source Mapping (kernmetrics)
| UI ELEMENT | SOURCE | RAW/CALC | CALCULATION ID | PERIOD SUPPORT | SPORT SUPPORT | EMPTY STATE |
|---|---|---|---|---|---|---|
| Herstelstatus | Recovery Decision Engine (bestaand, B9-H4) | CALCULATED | bestaand, niet hernoemd binnen dit tijdsbudget | onbevestigd (D8) | sport-onafhankelijk | "Onvoldoende data" |
| HRV (7d) | `dc.healthTrend` | CALCULATED | bestaand | JA (7d expliciet in naam) | n.v.t. | "MISSING" bij geen wearable/handmatige invoer |
| Rusthartslag | idem | CALCULATED | bestaand | onbevestigd | n.v.t. | "MISSING" |
| Slaap (7d) | idem | CALCULATED | bestaand | JA | n.v.t. | "MISSING" |
| Trainingsbelasting | bestaande load-aggregatie | CALCULATED | bestaand | onbevestigd (D8) | mogelijk sport-specifiek | "Onvoldoende data" |
| "4 Verbeterd" | `CoachingCore.improvementsDigest(buildImprovementItems())` | CALCULATED | bestaand, reeds gebruikt in Home | onbevestigd (D8, D1) | multi-sport | "0" is een geldige, echte telling hier (geen MISSING-situatie) mits de digest zelf draait |
| "5 Stijgende trends" | `ProgressionCore.trendBy` + telling (`c.trendUps`) | CALCULATED | bestaand | onbevestigd (D8) | per-sport | idem |
| "2 Trainingen" | sessions-telling | RAW (telling) | bestaand | JA (periode = telvenster) | alle | "0" geldig |
| "0% Adherence" | `AdherenceIntelligenceCore`/`ScheduleAdherenceCore` | CALCULATED | bestaand | onbevestigd | programma-specifiek | "—" wanneer geen actief programma (zie D3), NOOIT stilzwijgend 0% |
| e1RM-trend (Frontsquat-voorbeeld) | `core/calculation.js oneRMResult` + `ProgressionCore.trendBy` | CALCULATED | bestaand, protected core | JA (4 weken expliciet in mockup) | kracht-only | "Onvoldoende historie" |
| Roeien-trend | `ProgressionCore.trendBy` op ergometer-data | CALCULATED | bestaand | JA | roeien-only | "Onvoldoende historie" |
| Slaapduur-trend | `dc.healthTrend` | CALCULATED | bestaand | JA | n.v.t. | "MISSING" |

Geen enkele waarde hierboven is een "shadow calculation" — alle wijzen naar reeds bestaande, protected-core of eerder-geaudite functies.

## Fase 10 — Calculation Engine Audit
Alle in Fase 9 genoemde bronnen zijn reeds bestaand en eerder (in vorige sprints) gecontroleerd op determinisme/versioning binnen hun eigen domein (Recovery: B9-H4, e1RM: `core/calculation.js` protected core, Adherence: eerder geaudit in Trainen-context). Geen nieuwe calculation-audit nodig voor hergebruik — wel een expliciete, per-metric bevestiging van periode-parameter-ondersteuning (D8) vóór implementatie.

## Fase 11 — Context Engine
Sport-context (filter), cyclus/Women's Performance-context (apart, niet automatisch), device-source (wearable vs. handmatig, beïnvloedt confidence-presentatie), tijdsperiode (Period Selector). Geen contextlogica wordt in dit plan gedupliceerd naar de frontend — alle context blijft server/calculation-side.

## Fase 12 — Decision Engine Boundary
Classificaties zoals "Goed"/"Optimaal"/"Lager dan normaal" in de mockup moeten uit de bestaande Recovery Decision Engine (B9-H4) komen, niet uit nieuwe, in de UI verzonnen thresholds. Te bevestigen per metric tijdens implementatie welke classificatie-functie precies wordt aangeroepen.

## Fase 13 — Evidence/Data Quality/Confidence
Onderscheid: overzicht toont compact (bv. een icoon/kleur-neutrale indicator bij onvoldoende data), detail toont volledige uitleg (bron, periode, beperkingen). Geen bestaand, herbruikbaar "confidence badge"-component gevonden (D9) — mogelijk een nieuwe, kleine component, pas te bouwen na bevestiging dat dit niet al elders bestaat.

## Fase 14 — "Jouw ontwikkeling" — zie Decision Register D1-D3 voor de drie meest kritieke, blokkerende vragen.

## Fase 15 — Snel overzicht
Alle 5 items hebben een bestaande, canonieke bron (Fase 9). **NO-WEARABLE bevestigd haalbaar:** elk item heeft al een MISSING/onvoldoende-data-pad in de bestaande logica (het scherm crasht niet en toont geen fictieve 0 bij afwezigheid van wearable-data, conform bestaande architectuurprincipes elders in de app).

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

## Fase 29 — Implementation Readiness Score
| Categorie | Score (0-10) |
|---|---|
| Functional Preservation Readiness | 9 — volledige inventaris, alle routes in kaart |
| Data Readiness | 7 — meeste bronnen bestaan, periode-ondersteuning per metric nog te bevestigen (D8) |
| Calculation Readiness | 8 — kernberekeningen bestaan en zijn protected-core/eerder geaudit |
| Context Readiness | 7 — sport/cyclus-context bestaat, periode-context nog te bevestigen |
| Decision Readiness | 6 — classificatie-bronnen (Goed/Optimaal) nog niet per metric expliciet bevestigd |
| Evidence Readiness | 5 — geen bestaand, herbruikbaar confidence-component gevonden (D9) |
| Component Reuse Readiness | 7 — meerderheid herbruikbaar, 5-6 nieuwe componenten nodig, alle klein en scherp afgebakend |
| Accessibility Readiness | 7 — patronen bestaan (role=tablist elders), moet expliciet toegepast worden |
| Privacy/Security Readiness | 8 — bestaande scopes van toepassing, Cyclus-beslissing (D10) al gemaakt (conservatief) |
| Test Readiness | 8 — Trainen-testpatroon (source+browser-runtime) direct herbruikbaar als sjabloon |
| Visual Implementation Readiness | 6 — 5-6 nieuwe componenten moeten eerst gebouwd/getest worden vóór schermcompositie |

**OVERALL IMPLEMENTATION READINESS: 7/10** — geen enkele individuele score verbergt een blocker; de drie echte blokkers (D1, D3, D4, D10 reeds opgelost) staan apart vermeld, niet verstopt in het gemiddelde.

**BLOCKERS (expliciet, niet in het gemiddelde verstopt):**
- D1 (definitie "Verbeterd") — blokkeert het overzichtscijfer
- D3 (Adherence-noemer) — blokkeert het overzichtscijfer
- D4 (Belangrijkste inzichten-ranking) — blokkeert uitsluitend die ene sectie, niet de rest van Inzicht
- D8 (periode-parameter per metric) — blokkeert per-metric, niet het scherm als geheel
