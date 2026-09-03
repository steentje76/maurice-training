# TRAINEN_V02_RUNTIME_DEFECT_RECOVERY_REPORT.md

## ROOT CAUSE
ES6-template-literal-syntax (`${tkIcon(...)}`) werd gebruikt direct in **statische HTML-broncode** van `s-train-mgr` — niet binnen een daadwerkelijk door JavaScript uitgevoerde template literal (backtick-string). Statische HTML wordt door de browser als tekst geparsed, nooit als JS-code uitgevoerd. `${...}` werd dus nooit geïnterpoleerd en verscheen letterlijk in de DOM, exact zoals de Product Owner-screenshots toonden.

## WHY TESTS MISSED IT
Alle bestaande Node-tests (inclusief mijn eigen `fTrainenV02Migration.test.js`) controleerden uitsluitend of de **string** `"tkIcon("` ergens in de bron-tekst voorkwam. Dat was waar — maar bewees niet dat de aanroep ook daadwerkelijk werd **uitgevoerd**. Dit is een fundamenteel verschil tussen source-parsing en runtime-gedrag, dat alleen een echte browsertest kan detecteren.

## FILES FIXED
`index.html` (12 plekken: `${tkIcon(...)}` vervangen door vooraf gegenereerde, statische SVG-markup), plus een kleine, additieve JS-fix voor de empty-state-toggle (`renderV43Train()`).

## NEW TESTS
`core/fTrainenBrowserRuntime.test.js` (nieuw, 17/17) — draait de **echte** `index.html` in een headless Chromium-browser (Playwright), inspecteert de resulterende DOM. `core/fTrainenV02Migration.test.js` uitgebreid met 3 statische, snelle checks als eerste verdedigingslinie.

## BROWSER RUNTIME RESULT
Geslaagd. 0 letterlijke `${` of `tkIcon(` in de gerenderde DOM, 14+ daadwerkelijk gerenderde `<svg class="tk-icon">`-elementen, 5 primair zichtbare activity-tiles.

## CONSOLE ERRORS
2 gevonden, beide **ongerelateerd** aan de gemelde bug: `net::ERR_FILE_NOT_FOUND` en een 403 — beide een gevolg van het testen via `file://` zonder echte server/Supabase-verbinding, niet van een JS-fout in de icon/component-code. 0 fouten gerelateerd aan `tkIcon`/`designSystemIcons`.

## LITERAL ${tkIcon(...)} PRESENT
NEE (bevestigd, live, in de echte browser-DOM).

## PLANNING VISIBLE
JA (bevestigd in de echte DOM, sectie "Jouw training").

## MOBILE VIEWPORTS TESTED
320px, 360px, 375px, 390px, 412px, 430px — alle 6 zonder horizontale overflow.

## VISUAL DELTA
| Element | Target | Runtime (na fix) | Match | Severity |
|---|---|---|---|---|
| Header titel/subtitel | "Trainen" / "Plan, start en beheer je trainingen" | identiek | PASS | — |
| Avatar rechtsboven | aanwezig | aanwezig, echt SVG-icoon | PASS | — |
| Eerstvolgende training-kaart | marine, "Training A" | leeg → correcte empty state ("Nog geen training gepland") — verwacht, geen echte data in deze niet-ingelogde testcontext | PASS (empty-state-gedrag correct) | — |
| Jouw training (3 tegels) | icoon + titel + subtekst, netjes gescheiden | identiek, correct gescheiden | PASS | — |
| Start een activiteit (5 tiles) | Kracht/Hardlopen/Fietsen/HYROX/Meer, echte iconen | identiek, echte SVG-iconen | PASS | — |
| Maken & ontdekken | icoon + titel + AI-badge + subtekst | identiek | PASS | — |
| Terugkijken | icoon + titel + subtekst | identiek | PASS | — |
| Card radius | 16px | `--radius-card` toegepast | PASS | — |
| Iconen | outline/line-stijl | echte SVG, outline-stijl | PASS | — |

**Geen BLOCKER of MAJOR gevonden in deze audit.**

## RELEASE GATE
234/234 groen (was 230 vóór deze herstelsprint, +4 nieuwe/uitgebreide testbestanden).

## ANDROID TESTS
29/29 groen.

## TRAINEN TESTS
`fTrainenV02Migration`: 35/35. `fTrainenBrowserRuntime`: 17/17.

## SABOTAGE RESULT
3 sabotage-experimenten, alle 3 correct gedetecteerd en volledig hersteld:
1. `${tkIcon('kracht',{size:'feature'})}` opnieuw geïntroduceerd in statische HTML → gedetecteerd door zowel de statische als de browser-test.
2. Layout-robuustheid (`display:flex` verwijderd) → **eerlijk gerapporteerd: geen visuele regressie gevonden** bij reconstructie van de exacte, oorspronkelijke markup mét de icon-fix. Dit toont aan dat het gemelde "tekst loopt door elkaar"-symptoom grotendeels een direct gevolg was van dezelfde root cause (de lange, onuitgevoerde tekststring zelf verstoorde de layout), niet een aparte, tweede CSS-bug. De `display:flex`-toevoeging blijft behouden als robuustere implementatie.
3. Empty-state-toggle verwijderd → correct gedetecteerd (een **echte, bevestigde, tweede bug**: de "Eerstvolgende training"-sectie toonde niets bij afwezigheid van een geplande training).

## CANONICAL PNG INTEGRITY
Alle 6 canonical baseline-PNG's ongewijzigd (niet aangeraakt tijdens deze herstelsprint).

## PR #229 HEAD SHA
Wordt bijgewerkt na push (zie commit-geschiedenis).

## NETLIFY PREVIEW URL
`https://deploy-preview-229--maurice-art.netlify.app` (ongewijzigd, wordt automatisch bijgewerkt door Netlify na de push van de herstelcommits).

## SCREENSHOT EVIDENCE
`docs/screenshots/trainen_v02_runtime_fixed.png` — echte, live Playwright-screenshot van de gerepareerde runtime (390×844, referentieviewport).

## EERLIJKE, TRANSPARANTE BEPERKING
De Playwright/Chromium-browsertests draaiden succesvol in deze ontwikkelomgeving. Of de CI/Quality-Gate-omgeving (GitHub Actions) ook Chromium heeft geïnstalleerd is **niet onafhankelijk bevestigd** — de testsuite degradeert veilig (expliciete SKIP, exit 0, geen vals-groen resultaat) als Playwright/Chromium daar ontbreekt, maar biedt dan geen daadwerkelijke bescherming in die specifieke omgeving. Dit is bewust vastgelegd, niet verzwegen.

## STATUS
**TRAINEN v0.2 RUNTIME FIXED — READY FOR PRODUCT OWNER RE-REVIEW**
