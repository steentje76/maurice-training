# Nutrition UX Redesign — Discovery Report
Datum: 6 september 2026 · Discovery/design sprint · **geen productiecode gewijzigd**

## 1. Baseline (GitHub, geverifieerd)
main `f9a6fb4b` · #240 OPEN base main head `167f8dc4` · #241 OPEN base ux/nutrition-approved-v1 head `6b311586` · #242 MERGED · #243 OPEN base feature/nutrition-targets-v1 head `6a5f9357`, Quality Gate 34031242793 success. **Auditbasis: #243 HEAD** (meest complete stack). Design-branch `design/nutrition-ux-redesign-proposal` vanaf `6a5f9357`.

## 2. Huidige ervaring (gereconstrueerd uit code, niet uit aannames)
**20 schermen** (s-voeding + 19) en 2 modals (water, bevestiging). Navigatiegraaf uit de HTML/JS:

- **Primair pad (loggen):** Overzicht → `+ Voeg maaltijd toe` → Maaltijden → `+` bij maaltijd → Zoeken → (typen) → Productdetail → `Volgende` → Hoeveelheid → `Toevoegen` → Maaltijden.
- **Secundair:** Water (modal vanaf overzicht) · Supplementen · Doelen instellen · Maaltijddetail (verwijderen item/maaltijd) · Correctie (vanaf productdetail) · Zelf product toevoegen (vanaf zoeken).
- **Uitzondering/fallback:** Barcode → scanner → handmatige barcode; Foto etiket → controleren → herkende gegevens → match → conflict / nieuw product; OCR-fail → handmatig invoeren.
- **Terugroutes:** consistent één stap terug; Bevestiging → Zoeken; Doelen/Supplement → Overzicht.
- **Dead ends:** geen harde; wél een *zachte*: Zoeken opent leeg (Recent verschijnt pas na typen+wissen, geen render-hook) en toont niet aan welke maaltijd je toevoegt.
- **Bekende blockers (OPEN, niet in scope):** native camera return-flow; fysieke barcodeherkenning.

### Tap-telling (gemeten in de code, vanaf Voeding-overzicht)
| Taak | TK nu | Benchmark |
|---|---|---|
| Bestaand product → ontbijt | **7** (Voeg toe → `+` Ontbijt → typen → product → Volgende → preset → Toevoegen); zonder typen als Recent zichtbaar zou zijn: 6 | MacroFactor FLSI "search"-test: sterk = <17 *acties* incl. typen/niet-default serving; 21 apps gemeten, MF totaal 24 over 4 workflows vs MFP 36, Cronometer 40 (bron: macrofactor.com/fastest-food-logger-2025, nutriscan.app 2026). Directe 1-op-1 vergelijking per taak: **UNKNOWN** (andere telmethode). |
| Nieuw product zoeken → toevoegen | 7 + typen | idem |
| Hoeveelheid wijzigen (bestaand item) | **niet mogelijk zonder verwijderen + opnieuw toevoegen** (Maaltijddetail heeft alleen 🗑) → ~9 | MF: tap serving-veld in Plate → custom keyboard (bron: macrofactor.com/new-food-logger) |
| Maaltijd bekijken | 2 (Voeg toe/Maaltijden → maaltijd) — maaltijden staan **niet** op overzicht | Benchmarks tonen maaltijden op home (MFP/Yazio/Lifesum: diary-first) |
| Target wijzigen | 3 (Wijzigen → velden → Opslaan) | vergelijkbaar |
| Water toevoegen | 3 (kaart → preset → Toevoegen) | vergelijkbaar/beter |
| Barcode → toevoegen | 6 + scan (Zoeken → Scan → [scan] → product → Volgende → preset → Toevoegen) | MF: 1-tap entry vanaf dashboard/widget (bron: help.macrofactorapp.com/215). **Fysieke werking TK: OPEN** |

**Toptaken** (productstructuur-bewijs: overzicht en maaltijden zijn de entry points; UX-inferentie: loggen is de repetitieve kern; PO-validatie nodig voor frequentie): 1 dag bekijken, 2 eten toevoegen, 3 bestaand product opnieuw, 4 hoeveelheid aanpassen, 5 maaltijd bekijken, 6 water, 7 doelen bekijken, 8 zoeken/scannen.

## 3. Benchmark (actuele bronnen)
- **MacroFactor** — unified logging surface: barcode/search/quick-add/describe/custom altijd via één ribbon; "Plate" met multi-add; onthoudt foods+servings per maaltijd; `+` quick action op elke primaire pagina; FLSI als objectieve maat. Kritiek: data-dicht, kan stressvol zijn, geen "simple mode" (amyfoodjournal 2026). → **Overnemen:** één logging-oppervlak, recent/onthouden servings, 1-tap entry, live macro-preview per serving. **Afwijzen:** dichtheid, adaptief TDEE (buiten scope/PO-beslissing).
- **MyFitnessPal** — diary-first home, grootste DB, meer taps (36 vs 24). → home = dagboek is bewezen mentaal model; snelheid niet kopiëren.
- **Cronometer** — nauwkeurig, "functional but dated, dense tables" (nutrola 2026). → afwijzen als visueel model.
- **Yazio / Lifesum** — clean/modern, weekly summaries, "motivating"; kritiek: gamification, paywall, minder diepte. → visuele rust en ringen/progress overnemen; gamification/streaks/badges **expliciet afgewezen** (PO-voorkeur).
- **MyNetDiary / Lose It** — approachable budgets; geen extra patronen boven bovenstaande.
- **Gedeelde best practices:** (1) dagstatus + maaltijden op één home; (2) `+` altijd bereikbaar; (3) recent/frequent vóór typen; (4) serving-keuze met live kcal/macro-preview; (5) inline hoeveelheid-edit in het dagboek; (6) rustige progress (bars of ringen) met neutrale over-target-taal.

## 4. Screen-by-screen audit (0–10; 8 = echt goed)
| # | Scherm | Clar | Hier | Eff | Cons | Disc | ErrP | Mob | A11y | Pol | Load | **Overall** | Kernbevinding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|01|Overzicht|6|**4**|5|6|5|7|7|7|6|5|**5.5**|Doelen-kaart genest in "Vandaag gelogd" (dubbele rand); verweesde kop "VOEDINGSSTOFFEN (VANDAAG)"; kcal/macro's dubbel; maaltijden onzichtbaar; CTA onder de vouw; datumkaart neemt prime ruimte|
|02|Maaltijden|8|7|7|8|8|8|8|8|7|8|**7.5**|Helder; enige extra hop tussen overzicht en loggen|
|03|Maaltijddetail|7|7|**4**|7|6|6|8|7|6|7|**6.5**|Geen hoeveelheid-edit (alleen verwijderen)|
|04|Product zoeken|6|6|5|7|**4**|7|8|8|7|6|**6.5**|Leeg bij openen; Recent verborgen; geen maaltijd-context; 3 gelijkwaardige secundaire knoppen|
|05|Productdetails|7|7|6|7|7|7|8|8|7|7|**7**|Verplichte tussenstap voor bekend product; CTA "Volgende" is vaag|
|06|Hoeveelheid|7|7|7|8|7|**5**|8|8|7|7|**7**|**Geen live kcal/macro-preview**; "1 portie" zonder stukgewicht-feedback vooraf|
|07|Maaltijd kiezen|8|8|8|8|8|8|8|8|7|8|**8**|Goed (select, voorgeselecteerd via entry)|
|08|Maaltijd bewerken|=03|||||||||| **6.5**|zie 03|
|09|Water|8|8|8|8|8|8|8|8|8|8|**8**|Modal met presets — goed|
|10|Supplementen|7|7|7|7|6|8|8|8|7|7|**7**|Werkt; historie compact; vindbaarheid via overzichtkaart|
|11|Barcode|7|7|6|7|7|8|8|8|7|7|**7** (UX)|Statusmachine goed; **fysiek OPEN**|
|12|Foto etiket|7|6|6|7|7|7|7|8|6|6|**6.5**|Twee foto's verplicht; lang scherm; camera-app-fallback **OPEN**|
|13|Foto controleren|8|8|8|8|8|8|8|8|7|8|**8**|Goed|
|14|Herkende gegevens|8|8|7|8|8|8|8|8|7|8|**7.5**|Goed; lege staat sterk|
|15|Product match|6|6|6|7|6|7|8|7|6|6|**6.5**|Technische titel; zelden echte match (zoekt op naam)|
|16|Conflict|6|6|6|7|6|7|8|7|6|6|**6.5**|Structuur aanwezig, weinig gebruik|
|17|Nieuw product|7|7|7|7|7|7|8|8|7|7|**7**|Ok|
|18|Zelf product|7|7|6|8|7|7|8|8|7|6|**7**|Lang formulier; 2×2-grid ok|
|19|Correctie|6|6|6|7|5|7|8|8|6|6|**6.5**|Alleen kcal corrigeerbaar; technische bronlabels (USER_LABEL_SCAN)|
|20|Targets (in overzicht)|7|6|7|7|6|8|8|8|6|6|**6.5**|Inhoudelijk correct (USER_DEFINED, UNKNOWN); visueel genest/druk|
|21|Doelen instellen|8|8|8|8|8|8|8|8|7|8|**8**|Goed; CHECK_VALUE-flow helder|

**Gemiddeld ≈ 6.9.** Sterk: states, veiligheid (UNKNOWN, provenance), formulieren, water. Zwak: overzicht-hiërarchie, logging-snelheid, ontbrekende preview, geen inline-edit.

## 5. Overzicht — diep
**Binnen 2 s begrijpen:** (a) hoeveel heb ik gegeten t.o.v. mijn ingestelde doel, (b) wat heb ik per maaltijd gelogd, (c) hoe voeg ik iets toe. Nu: (a) dubbel en genest, (b) afwezig, (c) onder de vouw.
**Voorgestelde hiërarchie (conceptueel):** Titel + datum-navigatie (compact, inline) → **Dagstatus-kaart** (energie prominent; 3 macro-regels; alleen velden met doel; "Stel doelen in" als inline empty state) → **Primaire CTA `+ Eten toevoegen`** (sticky onderaan boven bottom-nav, of direct onder dagstatus) → **Maaltijden** (4 rijen met subtotaal kcal en `+` per rij) → Water + Supplementen (compacte dubbelkaart) → Doelen wijzigen (secundair, in dagstatus-kaart). Verwijderen: aparte samenvattingskaart, verweesde kop, geneste kaart.

## 6. Logging — diep
Doel: **product → hoeveelheid → maaltijd → toevoegen** met minimaal taps, zonder aannames.
- Zoeken opent met **Recent** (bestaat al: `rankRecentFoods`; alleen render-hook ontbreekt) en toont **"Toevoegen aan: Ontbijt"** (state bestaat: `voedingCurrentMealTypeForAdd`).
- **Bekend product uit Recent → direct naar Hoeveelheid** (productdetail overslaan; detail via secundaire "i"). Bespaart 1 tap.
- Hoeveelheid: **live preview** "100 g = 63 kcal · 11 g eiwit" via bestaande `portionToNutrients` (geen shadow calc); presets behouden; "1 portie" alleen tonen als stukgewicht bekend (Portion Engine `piece_weight_g`).
- **Inline hoeveelheid-edit** in Maaltijddetail (hergebruik Hoeveelheid-scherm met bestaand item; nieuwe snapshot via bestaande service).
- **PO-decision:** laatst gebruikte maaltijd voorselecteren? Onthouden laatste serving per product? (MacroFactor doet beide; TK-regel: geen stille aannames → alleen als expliciete, zichtbare default.)

## 7. Informatiearchitectuur
Overzicht = dagstatus + maaltijden + entry. Maaltijden-scherm wordt **overbodig als apart scherm** (rijen op overzicht) — behouden als detail. Zoeken = één logging-oppervlak (zoek/Recent/barcode/foto/eigen product als tabs of chips, niet drie gelijkwaardige knoppen). Productdetail = secundair (info/correctie). Doelen/Water/Supplementen = eigen schermen, entry via overzicht. Duplicatie: kcal/macro-samenvatting vs. doelregels. Onverwacht: Correctie alleen via productdetail (ok, maar bron-labels te technisch).

## 8. Visuele hiërarchie & progress
Één kaartniveau per sectie (nooit genest). Sectiekoppen alleen boven lijsten. Progress: **compacte bars** (bestaand patroon `voedingCoverageBar`) i.p.v. ringen — ringen kosten ruimte en maken partial/UNKNOWN moeilijk (lege ring ≠ 0). Track lichter (`--g2`), fill `--color-primary`, over-target amber (bestaand). Alleen regels met doel; geen doel → geen bar, wel gelogde waarde als tekst. UNKNOWN → geen bar, "—" + "onvolledig bekend". Copy altijd "je ingestelde doel".

## 9. States (concept)
geen target → dagstatus toont gelogde waarden + inline "Stel je voedingsdoelen in [Doelen instellen]" · alleen eiwit → één bar, andere velden alleen als gelogd getal · alle targets → 4 bars · partial coverage → bar + "(deels bekend)" · UNKNOWN → "—", geen bar, geen 0 · over target → amber bar op 100% + "12 g boven doel" · lege dag → "Je hebt vandaag nog niets toegevoegd" + CTA · offline → banner "Geen verbinding — laatst bekende gegevens" + retry, geen spinner-loop.

## 10. Copy: CURRENT → PROPOSED
| Current | Proposed |
|---|---|
| Inzicht in je voeding en energie | Wat je vandaag hebt gegeten |
| VANDAAG GELOGD / VOEDINGSSTOFFEN (VANDAAG) | (één kop) Vandaag |
| + Voeg maaltijd toe | + Eten toevoegen |
| Volgende (productdetail) | Hoeveelheid kiezen |
| Voeg toe aan maaltijd (titel) | Hoeveelheid |
| Bron: USER_LABEL_SCAN -- nog niet geverifieerd | Bron: jouw etiketfoto (niet geverifieerd) |
| Bron: door jou toegevoegd (USER_LABEL_SCAN/USER) | Door jou toegevoegd |
| Product match | Vergelijking |
| Verschil gevonden | Waarden verschillen |
| Gegevens aanvullen of corrigeren | Waarde corrigeren |
| Zie in één oogopslag wat je nog kunt eten. | Zie direct hoe je dag ervoor staat. |
| Foto's maken (disabled CTA) | Maak eerst beide foto's |

Geen medische/schuldtaal gevonden (audit #243). Termen consistent maken: "doel" (niet "target"), "toevoegen" (niet "loggen") in UI.

## 11. Camera/barcode (UX-voorstel; technische blockers OPEN)
Ideale flow: Eten toevoegen → [Zoek | Barcode | Foto] chips → camera met kader → "Barcode gevonden 87…" → product → hoeveelheid → maaltijd → toevoegen. Fallback: "Nog geen barcode" → Opnieuw / Handmatig invoeren. Foto: één foto (etiket) als minimum, voorkant optioneel (**PO-decision**; nu beide verplicht). **Technisch OPEN:** native camera return-flow; fysieke decode-betrouwbaarheid — geen UX-wijziging lost dit op.

## 12. Accessibility
`.ibtn` 36 px is app-breed. **Aanbeveling: app-brede design primitive (44 px)** in een aparte a11y-sprint — Nutrition-only zou een inconsistente header-hoogte geven binnen dezelfde app en het probleem elders laten bestaan. Overige a11y (labels, aria-live, busy, invalid) is in #243 al op orde.

## 13. Drie concepten
**A — Conservative:** overzicht-hiërarchie fixen (ontnesten, kop weg, duplicatie weg, CTA boven de vouw), Recent bij openen zoeken, maaltijd-context in zoeken, live preview in Hoeveelheid, copy-tabel. Geen IA-wijziging. Winst ↑↑ / complexiteit laag / regressie laag / PO-decisions 0–1 / tests: bestaande contracten + 6.
**B — Balanced (aanbevolen):** A + maaltijdrijen op overzicht (Maaltijden-scherm blijft als detail), één logging-oppervlak (chips), bekend product → direct Hoeveelheid, inline hoeveelheid-edit, sticky `+ Eten toevoegen`. Beperkte IA-aanpassing (geen nav-wijziging). Winst ↑↑↑ / complexiteit middel / regressie middel (routing) / PO-decisions 3 / tests: routing + edit-snapshot.
**C — Ambitious:** B + "bord"-model (multi-add per maaltijd vóór opslaan), onthouden serving per product, weekoverzicht, `+` in bottom-nav. Grotere structurele wijziging, raakt nav/IA en Portion-semantiek. Winst ↑↑↑(+) / complexiteit hoog / regressie hoog / PO-decisions 5+ / tests: uitgebreid.

## 14. Scores
| | Nu | A | B | C |
|---|---|---|---|---|
|Functional completeness|8|8|8|8.5|
|Architecture|9|9|9|8.5 (risico)|
|Logging efficiency|5|6.5|8|8.5|
|Navigation|6.5|7|8|8|
|Visual hierarchy|5|7.5|8.5|8.5|
|Consistency|7.5|8|8.5|8.5|
|Accessibility|7.5|7.5|8|8|
|Error recovery|8|8|8.5|8.5|
|Mobile usability|7|7.5|8.5|8.5|
|Trust/transparency|8.5|8.5|8.5|8.5|
|**Overall**|**6.9**|**7.6**|**8.4**|**8.5** (met hoger risico)|
Eerlijk: 9+ vereist bewezen real-device camera/barcode én PO-gevalideerd gebruik; niet haalbaar via redesign alleen.

## 15. Backlog
**P0** — (1) Overzicht: ontnesten/duplicatie/verweesde kop/CTA boven vouw [01] laag/laag/PO:NO · (2) Recent + maaltijd-context bij openen zoeken [04] laag/laag/NO · (3) Live preview in Hoeveelheid via portionToNutrients [06] laag/laag/NO.
**P1** — (4) Maaltijdrijen op overzicht [01] middel/middel/NO · (5) Inline hoeveelheid-edit [03] middel/middel/NO · (6) Bekend product → direct Hoeveelheid [04→06] laag/laag/YES (detail-stap overslaan?) · (7) Eén logging-oppervlak met chips [04] middel/laag/NO · (8) Copy-tabel [alle] laag/laag/NO.
**P2** — (9) Sticky `+ Eten toevoegen` [01] laag/laag/YES (past het bij het design system?) · (10) Bronlabels humaniseren [05,19] laag/laag/NO · (11) Foto: voorkant optioneel [12] laag/laag/YES · (12) `.ibtn` 44 px app-breed [alle] middel/middel/YES.
**P3** — (13) Onthouden serving per product [06] middel/middel/YES · (14) Laatste maaltijd voorselecteren [07] laag/laag/YES · (15) Weekoverzicht [nieuw] hoog/–/YES (feature gap, niet bouwen).
**Feature gaps (C, niet bouwen):** multi-add "bord", weekoverzicht, adaptieve targets, favorieten.

## 16. Implementatieplan (NIET uitvoeren)
UX-01 Overzicht-hiërarchie (P0-1): index.html overzicht-render; tests: geen geneste kaart, geen verweesde kop, CTA in viewport 390×844; risico laag; deps geen.
UX-02 Zoeken-entry (P0-2, P1-7): render-hook + chips; tests: Recent zichtbaar bij openen, maaltijd-context; risico laag.
UX-03 Hoeveelheid-preview (P0-3): render via portionToNutrients; tests: preview = service-uitkomst (geen shadow calc), UNKNOWN → "—"; risico laag.
UX-04 Maaltijdrijen op overzicht + inline edit (P1-4/5): tests: subtotaal = aggregateDailyNutrition per maaltijd, edit maakt nieuwe snapshot; risico middel; deps UX-01.
UX-05 Bekend product → Hoeveelheid + copy (P1-6/8): PO-decision 2; tests routing; risico laag.
UX-06 Sticky CTA + bronlabels + foto-optioneel (P2): PO-decisions 3,4; risico laag.
UX-07 App-brede `.ibtn` 44 px (P2-12): aparte a11y-sprint, PO-decision 5; risico middel (alle schermen).

## 17. Product Owner Decision Pack
1. **Concept-keuze** — nodig voor scope. A / **B (aanbevolen)** / C. Impact: B geeft grootste winst per risico.
2. **Bekend product uit Recent direct naar Hoeveelheid** (detail overslaan) — A: ja, detail via "i" (**aanbevolen**) / B: altijd detail tonen. Impact: −1 tap per herhaal-log.
3. **Maaltijdrijen op overzicht** (Maaltijden-scherm blijft detail) — A: ja (**aanbevolen**) / B: overzicht blijft alleen status. Impact: dag in één blik; overzicht langer.
4. **Sticky primaire CTA** boven bottom-nav — A: ja (**aanbevolen** mits design-system-conform) / B: inline onder dagstatus. Impact: CTA altijd bereikbaar.
5. **`.ibtn` 44 px app-breed** — A: app-breed in aparte sprint (**aanbevolen**) / B: Nutrition-only / C: laten. Impact: alle headers.
6. **Foto etiket: voorkant optioneel** — A: alleen etiket verplicht (**aanbevolen**) / B: beide verplicht. Impact: −1 foto, minder frictie; productnaam blijft handmatig.
7. **Laatst gebruikte maaltijd voorselecteren** (zichtbaar, wijzigbaar) — A: ja / B: nee (**aanbevolen: nee in V1**, geen stille aannames; entry-context bestaat al).
8. **Onthouden laatste serving per product** — A: ja als zichtbare default / B: nee (**aanbevolen: later, na B**). Impact: sneller, maar vereist opslag.
9. **Progress-visualisatie** — A: bars (**aanbevolen**, bestaand, partial/UNKNOWN-veilig) / B: ringen. Impact: ringen suggereren 0 bij UNKNOWN.
10. **Naamgeving** — A: "Eten toevoegen"/"doel" (**aanbevolen**) / B: huidig. Impact: consistentie.

## 18. Journeys (toekomstig, Concept B)
**A — bestaand product snel:** Overzicht → `+ Eten toevoegen` (chips, Recent zichtbaar, "Toevoegen aan: Ontbijt") → tik Skyr → Hoeveelheid (preview live) → 150 g → Toevoegen → Overzicht met bijgewerkte Ontbijt-rij. 4 taps. Fout: netwerk → inline melding + retry. Recovery: item blijft in Recent.
**B — nieuw product:** `+` → typ "havermout" → resultaat → (i) detail optioneel → Hoeveelheid → 50 g → maaltijd (voorgeselecteerd via entry) → Toevoegen. Fout: geen resultaten → "Geen producten gevonden" + Barcode/Foto/Eigen product als chips.
**C — dag bekijken → corrigeren:** Overzicht (status + rijen) → Lunch-rij → Maaltijddetail → item → Hoeveelheid (inline edit) → 120 g → Opslaan → nieuwe snapshot, totalen via service. Fout: product zonder waarden → "onvolledig bekend", geen 0.
**D — barcode (concept, blocker OPEN):** `+` → Barcode-chip → kader → "Barcode gevonden" → product → Hoeveelheid → Toevoegen; fallback handmatig.

Zie `NUTRITION_UX_CONCEPT_B_WIREFRAME.html` voor een losstaande, niet-gekoppelde wireframe van Overzicht en Hoeveelheid.
