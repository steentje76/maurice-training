# TRAINEN_V02_VISUAL_FIDELITY_REPORT.md

## 1. Baseline
PR #229 head vóór deze sprint: `dd07227920ab4de780373f86e36765c3a6ca4175`. main ongewijzigd.

## 2. Eerstvolgende training card
**Herstructureerd.** `v43RenderPlan()` backward-compatible uitgebreid met optionele parameters (`detailsButton`, `compact`). Home roept de functie nog steeds aan met exact 2 argumenten — 0 wijziging aan gedrag/HTML voor `s-home` (expliciet getest, zie sectie 7). Trainen toont nu "Start training" + "Bekijk details" naast elkaar, compactere padding. Alle nieuwe CSS gescoped op `#v43-train-plan`, nooit op `#home-plan`.

## 3. Tijd/locatie
**Onderzocht en bevestigd afwezig.** Live geverifieerd tegen het echte databaseschema: `vaste_trainingen` en `training_instances` hebben geen enkele kolom voor een geplande starttijd of locatie; geen `calendar`-tabel bestaat. Geen fictieve waarde toegevoegd. Nieuwe browsertest (`fTrainenBrowserRuntime` #14) bevestigt expliciet: geen `HH:MM`-patroon, geen locatie-achtige tekst.

## 4. Start een activiteit / iconografie
**Canonical teal icon-container toegepast** (nieuw, additief `--color-primary-soft`-token + `.tk-icon-box`/`.tk-icon-box-sm`-classes) op alle 11 icon-containers: Jouw training (3), Start een activiteit (5), Maken & ontdekken (2), Terugkijken (1). Was: groot, zwart icoon op transparante achtergrond. Nu: lichte teal achtergrond, teal icoon — exact zoals de canonical baseline.

## 5. Jouw training
Chevron-iconen toegevoegd naast elke titel, teal icon-box, compactere padding.

## 6. Maken & ontdekken / Terugkijken
Teal icon-box toegepast op de bestaande `.row`-structuur, geen andere wijziging.

## 7. Zelf gevonden, buiten-scope bevinding: vals-positief in fHardening.test.js
Een pre-existing test (W9) gebruikte een vaste, 3200-tekens-brongrens i.p.v. de echte functiegrens van `tkErgConnectDevice()` (3617 tekens). Door de toegevoegde/verplaatste code elders in dit bestand verschoof de absolute bestandspositie, waardoor de vaste grens toevallig een **verklarend commentaar** meenam ("...noch execLeaveDiscard() noch finishSession() riep...") en dat per ongeluk als een echte functieaanroep interpreteerde. **Bevestigd als vals-positief:** de test draaide 347/347 groen op de ongewijzigde staat vóór deze sprint (`git stash` bevestigd), 346/347 na de verschuiving (mijn wijzigingen), terug naar 347/347 na de fix. **Fix:** commentaarregels worden nu eerst gestript vóór de regex-controle op `connDevSrc` — geen verzwakking van de onderliggende, functionele controle, uitsluitend voor de W9-assertie.

## 8. Visual delta audit (bijgewerkt, na de fidelity pass)
| Element | Target | Runtime (na fidelity pass) | Match |
|---|---|---|---|
| Header | titel/subtitel/avatar | identiek | PASS |
| Eerstvolgende training | 2 knoppen naast elkaar, compact | identiek qua structuur | PASS |
| Icon-containers (alle secties) | lichte teal, teal icoon | identiek | PASS |
| Jouw training | chevron, compacte padding | identiek | PASS |
| Start een activiteit | 5 gelijke tiles, teal iconen | identiek | PASS |
| Maken & ontdekken | teal icon-box | identiek | PASS |
| Terugkijken | teal icon-box | identiek | PASS |
| Tijd/locatie op kaart | aanwezig in mockup | bewust afwezig (data bestaat niet) | MINOR, bewezen reden |

**0 BLOCKER, 0 MAJOR, 1 MINOR (ongewijzigd, bewezen datagat).**

## 9. Screenshots
`docs/screenshots/trainen_v02_runtime_fixed.png` (empty state), `docs/screenshots/trainen_v02_runtime_with_data.png` (met echte data, referentieviewport), `docs/screenshots/trainen_v02_visual_fidelity_full.png` (volledige pagina, fullPage screenshot na de fidelity pass).

## 10. Tests
`core/fTrainenBrowserRuntime.test.js`: 22/22 (was 19). `core/fHardening.test.js`: 347/347 (vals-positief gerepareerd). Release gate: 234/234. Android: 29/29.

## 11. Sabotage
Herhaalde sabotage van de oorspronkelijke kernbug (`${tkIcon(...)}` opnieuw geïntroduceerd): correct gedetecteerd (2 assertions falen), volledig hersteld. Sabotage van de nieuwe icon-box-fix (1 box verwijderd): eerst niet gedetecteerd door een te losse `>=10`-drempel, gecorrigeerd naar een exacte `=== 11`-controle, daarna correct gedetecteerd en hersteld.

## 12. Functional preservation
Alle 13 bestaande routes ongewijzigd (herbevestigd via `fTrainenV02Migration`, 36/36). Home (`s-home`) niet geraakt — expliciet getest dat `v43RenderPlan('home-plan', nextT)` nog steeds met exact 2 argumenten wordt aangeroepen.

## 13. Status
**TRAINEN v0.2 VISUAL FIDELITY PASS COMPLETE — READY FOR PRODUCT OWNER RE-REVIEW**
