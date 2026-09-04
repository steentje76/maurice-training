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

## 7. Zelf gevonden, buiten-scope bevinding: line-ending-inconsistentie veroorzaakte drie vals-positieven

**Root cause (volledig, eerlijk gereconstrueerd):** een eerdere, script-gebaseerde bewerking tijdens deze PR-reeks (een Python-bestandsschrijfoperatie in standaard tekstmodus) had onbedoeld het volledige bestand geconverteerd van zijn originele, **gemengde** line-ending-stijl (27069 van 28920 regels CRLF, de overige ~1851 regels waren al altijd LF-only -- een pre-existing, niet door mij veroorzaakte situatie) naar volledig, uniform LF. Dit veroorzaakte een cascade van drie vals-positieve testfalen:

1. **fHardening.test.js (W9):** een vaste, 3200-tekens-brongrens vanaf tkErgConnectDevice() verschoof door de bestandsgrootte-verandering en nam toevallig een verklarend commentaar mee ("...noch execLeaveDiscard() noch finishSession() riep...").
2. **fHyroxTriathlon.test.js (O1):** git diff origin/main HEAD zag door de bestandsbrede line-ending-verandering vrijwel elke regel als "gewijzigd", waardoor een lang bestaand, ongewijzigd commentaar over een intern zoekalgoritme ("ranking-prioriteit" bij exercise-matching) ten onrechte als "toegevoegde" tekst werd gezien.
3. **fB9_03RunningIntelligence.test.js (E1):** een exacte JS-stringmatch (split()) op een specifieke sectiemarker steunde op een pre-existing LF-only regelovergang in het origineel; mijn eerste, te rigoureuze poging om dit te herstellen (het hele bestand forceren naar uniforme CRLF) converteerde ook die specifieke, van oudsher LF-only overgang naar CRLF, waardoor de exacte match alsnog brak -- een nieuwe, andere fout, veroorzaakt door mijn eigen overcorrectie.

**Definitieve, correcte fix:** het bestand gereconstrueerd via een regel-voor-regel diff tussen de originele main-versie en de huidige inhoud (line-ending-onafhankelijk vergeleken) -- ongewijzigde regels behielden hun exacte, originele line-ending (CRLF of LF, wat het al was), uitsluitend daadwerkelijk gewijzigde/nieuwe regels kregen consistente CRLF. Resultaat: git diff origin/main -- index.html is nu 109 regels (de daadwerkelijk bedoelde inhoud van deze hele PR-reeks), niet de hele bestandsinhoud. Alle drie de tests herbevestigd groen: fHyroxTriathlon 386/386, fB9_03RunningIntelligence 17/17, fHardening 347/347 (ook zonder de eerder toegevoegde, defensieve "commentaar strippen"-verbetering in W9 bleek de test al te slagen na de correcte reconstructie -- die verbetering is desalniettemin behouden als een zinvolle, extra robuustheidsmaatregel tegen soortgelijke, toekomstige verschuivingen, zonder enig nadeel).

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
