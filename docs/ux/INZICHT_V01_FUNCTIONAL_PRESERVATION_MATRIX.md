# INZICHT_V01_FUNCTIONAL_PRESERVATION_MATRIX.md

MERGE VAN NAVIGATION DESTINATIONS != FUNCTIONALITY REMOVAL. Elke rij hieronder blijft toegankelijk, ongeacht of hij zichtbaar is op het Inzicht-overzichtsscherm zelf.

| CURRENT FUNCTION | CURRENT SCREEN/ROUTE | DATA SOURCE | CALCULATION SOURCE | TARGET INZICHT DOMAIN | TARGET ENTRY POINT | PRESERVE? | DIRECT/DRILL-DOWN/DEFERRED | SECURITY/PRIVACY | TEST REQUIRED | NOTES |
|---|---|---|---|---|---|---|---|---|---|---|
| Herstel & belasting anatomie (voor/achterzijde) | `s-lichaam` (hero) | `lich-hero`-render, spiergroep-recovery-data | bestaande recovery-per-spiergroep-logica | HERSTEL | Snel overzicht → Herstel-domeincard | JA | DRILL-DOWN | health-scope | ja | Herstel/Belasting is al een lokale mode-switch (`lich-seg`) -- zie Fase 7-opmerking |
| Alle spiergroepen | `s-lich-spieren` | idem | idem | HERSTEL | via Herstel-domeincard | JA | DRILL-DOWN | health-scope | ja | |
| Eén spiergroep-detail | `s-lich-spier` | idem | idem | HERSTEL | via spiergroepenlijst | JA | DRILL-DOWN | health-scope | ja | |
| Herstel-gerelateerde oefeningen | `s-lich-oefeningen` | exercise library | geen nieuwe calc | HERSTEL | via spiergroep-detail | JA | DRILL-DOWN | geen | ja | |
| Verbanden (correlaties) | `s-lich-verbanden` | health/training-cross-data | deterministische verbanden-engine (bestaand) | VERBANDEN | Verbanden-domeincard | JA | DRILL-DOWN | health-scope | ja | correlation != causation, zie Fase 18 |
| Eén verband-detail | `s-lich-verband` | idem | idem | VERBANDEN | via verbandenlijst | JA | DRILL-DOWN | health-scope | ja | |
| Gegevens & koppelingen | `s-lich-gegevens` | wearable_connections | geen calc | LICHAAM (of Profiel, zie DECISION-item) | via Lichaam-domeincard of Profiel | JA | DRILL-DOWN | health-scope | ja | mogelijk overlap met toekomstig Profiel "Apparaten & verbindingen" -- PO-besluit nodig |
| Gezondheid & herstel (HRV/rusthartslag/slaap, 7-90d) | `s-lich-health` | wearable/manual health-logs | bestaande health-trend-logica (`dc.healthTrend`) | HERSTEL | Herstel-domeincard | JA | DRILL-DOWN | health-scope | ja | |
| Cyclus | `s-lich-cyclus` | cyclus-logboek | Women's Performance-engine (bestaand) | WOMEN'S PERFORMANCE | apart, niet-automatisch-zichtbaar entry point onder Herstel of Lichaam | JA | DRILL-DOWN | **sensitive, opt-in**, health-scope, Women's Performance-governance | ja | zie Fase 19, géén automatische tile op overzicht |
| Lichaamsmetingen | `s-lich-metingen` | body_metrics | geen nieuwe calc | LICHAAM | Lichaam-domeincard | JA | DRILL-DOWN | health-scope | ja | |
| Eén meting-detail | `s-lich-metric` | idem | idem | LICHAAM | via metingenlijst | JA | DRILL-DOWN | health-scope | ja | |
| Waar ben ik beter geworden ("Verbeterd") | `s-stats` | sessions | `CoachingCore.improvementsDigest(buildImprovementItems(...))` | OVERZICHT ("Jouw ontwikkeling"-cel) + PRESTATIES-domein | Overzicht direct (telling) + Prestaties-domeincard (lijst) | JA | DIRECT (telling) + DRILL-DOWN (lijst) | geen bijzonder | ja | canonieke bron bestaat al, zie Decision Register |
| Consistentie | `s-stats` | sessions | deterministische consistentie-telling (bestaand) | TRAININGSBELASTING of PRESTATIES | domeincard | JA | DRILL-DOWN | geen | ja | |
| Multisport endurance | `s-stats` | running/cycling sessions | bestaande multisport-aggregatie | PRESTATIES of SPORT-SPECIFIEK | domeincard | JA | DRILL-DOWN | geen | ja | |
| Actieve doelen | `s-stats`/`s-doelen` | goals-tabel | geen nieuwe calc | DOELEN & PROGRAMMA | Doelen-domeincard | JA | DRILL-DOWN | geen | ja | |
| Challenges | `s-stats` | berekend, automatisch | bestaande challenge-engine | DOELEN & PROGRAMMA | Doelen-domeincard | JA | DRILL-DOWN | geen | ja | |
| PR per herhaling | `s-stats` | sessions | bestaande PR-per-repbereik-logica | PRESTATIES | Prestaties-domeincard | JA | DRILL-DOWN | geen | ja | |
| Recente records (chronologisch) | `s-stats` | sessions | idem | PRESTATIES | Prestaties-domeincard | JA | DRILL-DOWN | geen | ja | |
| Geschatte 1RM (Epley) | `s-stats` | sessions | `core/calculation.js: oneRMRaw/oneRMResult` (protected core) | PRESTATIES | Prestaties-domeincard | JA | DRILL-DOWN | geen | ja | canoniek, gedetermineerd |
| Krachtverhoudingen | `s-stats` | 1RM-data | bestaande ratio-logica | PRESTATIES | Prestaties-domeincard | JA | DRILL-DOWN | geen | ja | |
| Volume per spiergroep | `s-stats` | sessions | bestaande volume-aggregatie | TRAININGSBELASTING | Belasting-domeincard | JA | DRILL-DOWN | geen | ja | |
| HRV trend (chart) | `s-stats` | HRV-logs | `dc.healthTrend`/`ProgressionCore.trendBy` | HERSTEL | Herstel-domeincard | JA | DRILL-DOWN | health-scope | ja | mogelijke overlap met `s-lich-health` -- consolidatiekans, zie Decision Register |
| Roei progressie | `s-stats` | ergometer-sessions | `ProgressionCore.trendBy` | SPORT-SPECIFIEK of PRESTATIES | Prestaties-domeincard | JA | DRILL-DOWN | geen | ja | |
| Cardio records | `s-stats` | cardio-sessions | machine-aware bestaande logica | PRESTATIES | Prestaties-domeincard | JA | DRILL-DOWN | geen | ja | |
| Doelen (los scherm) | `s-doelen` | goals-tabel | geen nieuwe calc | DOELEN & PROGRAMMA | Doelen-domeincard | JA | DRILL-DOWN | geen | ja | mogelijk consolideren met `s-stats`-doelen-sectie, zie Decision Register |
| Volledig trainingslogboek-link | `s-stats` → `s-hist` | n.v.t. | n.v.t. | **NIET Inzicht** | blijft Trainingshistorie (Trainen-domein) | JA | DEFERRED (blijft bestaande route) | geen | nee | expliciete Fase 5-grens: "wat heb ik gedaan" hoort bij Historie, niet Inzicht |
