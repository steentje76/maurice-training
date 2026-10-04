# DATA_QUALITY_CONFIDENCE_CONTRACT.md — Trainingskompas

**Doel:** canonieke, gedeelde semantiek voor Data Quality en Confidence over Calculation/Context/Decision, per Master Roadmap 2.0 v1.1 (MS-F3-08). Consolideert bestaande, verspreide praktijk — bouwt geen tweede, parallel model.

## Evidence ≠ Confidence — hard onderscheid (sectie 5/12)
**Evidence**: hoe sterk is de wetenschappelijke onderbouwing van de METHODE (statisch, per calculation/regel — zie `docs/CALCULATION_REGISTRY.md`/`docs/DECISION_RULE_REGISTRY.md`).
**Confidence**: hoe betrouwbaar is DEZE CONCRETE UITKOMST voor deze gebruiker, nu (dynamisch, per aanroep). Een evidence-B calculation (HRV-methodiek) kan lage confidence hebben bij onvoldoende baseline-data; dit onderscheid is al impliciet aanwezig in de bestaande code (`hrvBaseline()`'s `fase:'referentie'/'voorlopig'/'volledig'`) maar nu expliciet vastgelegd.

## Data Quality Dimensions (bestaand, per domein)
| Domein | Dimensie | Implementatie |
|---|---|---|
| Strength | — | geen expliciete kwaliteitsscore; `calculate1RM` retourneert `null` bij ongeldige input (impliciete "sample sufficiency": 1 set) |
| Load | sample sufficiency | `trendBy(minN=3)` — expliciete ondergrens vóór een trend geclaimd wordt |
| Recovery (HRV) | recency + sample sufficiency | `HRV_BASELINE_MIN_DAYS=14`/`MIN_N=4`, gefaseerd (`referentie`/`voorlopig`/`volledig`) |
| Recovery (composiet) | completeness | `recoveryScore()`'s `comps.length` (zie hieronder — **bevinding**) |
| Endurance | — | geen kwaliteitsscore in `cardio.js` zelf (pure conversie); meetkwaliteit (GPS/device) buiten scope van de calculatie |
| Energy | source reliability | impliciet via `USER_REPORTED`/`WEARABLE_ESTIMATE`-labeling (MS-F3-05) |
| Context | freshness | impliciet via `buildCtx()`'s per-veld "geen data"-teksten (MS-F3-06) |

## Confidence Model (bestaand)
| Functie | Confidence-bron | Schaal |
|---|---|---|
| `recoveryScore()` | `comps.length` over de componenten die de orkestratie aanlevert; sinds v4.70.9 levert `recoveryScoreFrom()` alleen componenten met gekeurde invoer en een betrouwbare basis | `'hoog'`(≥3)/`'gemiddeld'`(2)/`'laag'`(<2)/`'geen'`(0) |
| `readinessDay()` | expliciete telling beschikbare signalen (na ONBETROUWBAAR-filter: `no_data`, `stale`) | `'volledig'`(≥5)/`'gedeeltelijk'`(≥2)/`'onvoldoende'`(<2) |
| `hrvBaseline()` | dagen + aantal metingen | `'referentie'`/`'voorlopig'`/`'volledig'` (fase, geen los confidence-label maar functioneel equivalent) |

**Bevinding (sectie 15, opdracht-voorspelling bevestigd):** `recoveryScore()`'s confidence is uitsluitend gebaseerd op **componentaantal**, niet op de KWALITEIT van elk component. Een verouderde of onbetrouwbare HRV-meting telt in deze functie even zwaar mee als een verse, betrouwbare meting — in tegenstelling tot `readinessDay()`, die al wél een `ONBETROUWBAAR`-filter (`no_data`/`sync_failed`) toepast vóórdat de telling plaatsvindt. Dit is een reële, maar niet-kritieke inconsistentie tussen twee confidence-implementaties in dezelfde codebase. **Niet binnen deze sprint gefixed** (zou de compositiefunctie zelf moeten wijzigen, een risicovollere ingreep dan een audit rechtvaardigt) — geregistreerd als GAP-P2-015.

## Per-waarde kwaliteit voor health-data — bestaande lagen (aanvulling 4 oktober 2026)

De eerste versie van dit contract noemde de onderstaande lagen niet, terwijl ze sinds 18 augustus 2026 in
`core/deviceIntegration.js` staan. Ze zijn het canonieke model; er komt geen tweede naast.

| Laag | Vraag | Uitkomst | Moment |
|---|---|---|---|
| dataquality.v1 — `qualifySeries()` | Is dit getal technisch bruikbaar als invoer? | per dag en veld: `valid` / `excluded` + reden (`niet_numeriek`, `buiten_contract`, `extreme_uitschieter`) / `insufficient_data` | bij lezen |
| observation.v1 — `observation()` + `observationQuality()` | Hoe actueel is de nieuwste meting, en hoe staat de bron ervoor? | `no_data`, `syncing`, `sync_failed`, `source_unavailable`, `stale`, `partial`, `current` | bij lezen |
| `normalizeHealthDaily()` | Is de providerwaarde bij ingestie geldig? | `valid` / `implausible` / `invalid` / `empty` | niet aangesloten in runtime |

Quality is geen provenance (`manual`/`wearable`/`unknown`), geen evidence en geen confidence. De grenzen komen uit
het brondata-contract (`GOOGLE_HEALTH_MAP`): HRV 0–400 ms, rusthartslag 20–120 bpm, slaap 0–24 uur.

### Brug naar herstel en readiness (healthinput.v1, v4.70.9)

`DeviceCore.qualifyHealthRows()` roept alleen de twee bovenste lagen aan. `index.html` gebruikt hem via
`tkHealthQualified()` op elke plek waar de keten `hrv_log` leest.

| Bestaande status | Effect op de berekening van vandaag (dagfactor, RHR-delta, herstelscore) | Effect op `readinessDay()` |
|---|---|---|
| `excluded`: `niet_numeriek`, `buiten_contract` | waarde is ontbrekend vóór de berekening | signaal ontbreekt |
| `excluded`: `extreme_uitschieter` | geen — de waarde blijft meetellen en blijft gemarkeerd | signaal telt |
| `insufficient_data` | al ontbrekend | signaal ontbreekt |
| `no_data` | signaal stuurt niets | signaal telt niet |
| `stale` (7+ dagen) | HRV valt terug op 'ref', slaap en RHR-delta ontbreken; de meting blijft historie en voedt baseline en trend | signaal telt niet |
| `partial`, `current` | geen | signaal telt |
| sync-status (`sync_failed`, `syncing`, ...) | geen invoer van de keten | geen invoer van de keten |

De lijst `no_data`/`stale` staat op één plek: `DecisionCore.READINESS_ONBETROUWBARE_KWALITEIT`. Sync-status is
transport, geen meetgeldigheid; zij blijft zichtbaar in de UI. Valt de keuringslaag weg, dan zijn HRV, rusthartslag en
slaap ontbrekend (fail-closed). Besluiten: `docs/00_Project_Management/DECISION_LOG.md`, DEC-DQ-001.

## Unknown ≠ Zero — bevestigd correct
Repo-brede zoekactie naar `||0`/`??0`-patronen op RPE/HRV/gewicht/reps leverde geen treffers op. Ontbrekende waarden resulteren consistent in `null`, nooit stilzwijgend `0`.

## Decision Quality Gate Matrix (sectie 21)

| Rule ID | Inputs | Missing behavior | Hard recommendation zonder data? |
|---|---|---|---|
| DEC-PROG-001 | RPE, gewicht | `null` bij ontbrekende RPE/gewicht | **Nee** — geen advies zonder RPE |
| DEC-RECADJ-001 | dagfactor, spierherstel, gevoel, pijn | geen aanpassing (`null`) als geen enkele conditie van toepassing | **Nee** |
| DEC-READY-001 | dagfactor | `null` zonder `dfInfo` | **Nee** |
| DEC-DETRAIN-001 | dagen-sinds-uitvoering | neutrale factor 1.00 (geen correctie) bij ontbrekende data | **Nee** — veilige neutrale default |
| DEC-REST-001 | RPE | basisrust ongewijzigd zonder RPE | **Nee** |
| DEC-SETOUT-001 | voorgeschreven/uitgevoerde waarden | `bruikbaar:false`, `reden:'onvoldoende_gegevens'` | **Nee** |
| DEC-READYDAY-001 | 6 signalen | `bruikbaar:false` zonder dagfactor; datakwaliteit expliciet "onvoldoende" bij <2 signalen | **Nee** — expliciet `trainingsadvies:{soort:'geen_advies'}` |
| DEC-ACWR-ADV-001 | ACWR-waarde | geen tekst bij `reden!=='ok'` | **Nee** |
| DEC-LOADCORR-001 | ACWR-classificatie + trend | `false` bij ontbrekend signaal | **Nee** |

**Alle 9 regels bevestigd veilig: geen enkele produceert een harde aanbeveling bij onvoldoende data.**

## AI Quality Boundary — bevestigd op prompt-niveau, niet op technisch-afdwingbaar niveau (sectie 22, MS-F3-09-reconciliatie)
De AI ontvangt uitsluitend reeds-besloten Decision-uitkomsten met expliciete promptinstructie deze niet te wijzigen. Bij onvoldoende data levert de Decision Engine zelf al `geen_advies`/`null`. **Precieze formulering (gecorrigeerd t.o.v. een eerdere, te sterke claim):** dit betekent dat de deterministische upstream-keten de AI geen gefabriceerde Decision-waarde aanreikt en het model instrueert deze grens te respecteren — het betekent NIET dat het technisch onmogelijk is voor een AI-modelantwoord om van deze instructie af te wijken. Er bestaat momenteel geen technische output-validator die elk afwijkend AI-antwoord afdwingbaar blokkeert; dat is expliciet **GAP-P1-003, met bestemming F4 (AI Output Contract)** — geen F3-capability. F3 claimt dus: "de AI krijgt nooit een gefabriceerde waarde aangereikt en wordt geïnstrueerd de grens te respecteren", niet: "de AI kan technisch onmogelijk fabriceren."

## Open Gap
**Stand 4 oktober 2026 (v4.70.9):** de bedrading hieronder is geïmplementeerd, inclusief de besluiten uit DEC-DQ-001 (stale, sync-status, uitschieters, fail-closed). De registerstatus wijzigt pas na merge. De oorspronkelijke bevinding blijft hieronder staan.

**GAP-P2-015** (nieuw): `recoveryScore()`'s confidence-model telt alleen componenten, filtert niet op componentkwaliteit (in tegenstelling tot `readinessDay()`'s wél-aanwezige `ONBETROUWBAAR`-filter). Niet kritiek (geen hard advies wordt hierdoor onveilig geproduceerd — de Recovery Score is altijd een aanvullend, informatief getal, nooit de directe bron van een Decision Rule-uitkomst zelf), maar een reële inconsistentie tussen twee vergelijkbare confidence-implementaties.

## MS-F3-08 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Shared quality/confidence semantics across engines."*
**Resultaat: CLOSED.** Evidence/Confidence-onderscheid gedocumenteerd en bevestigd in de bestaande code. Alle 9 Decision Rules bevestigd veilig bij onvoldoende data. Eén reële, niet-kritieke inconsistentie gevonden en eerlijk geregistreerd (GAP-P2-015) in plaats van verzwegen of geforceerd "opgelost".
