# Nutrition UX v1 — Implementation Report (Set A: Screens 1-8)

Branch: `ux/nutrition-approved-v1`. Voortbouwend op de gemergde
Wave 1-4 + Functional Service Layer (main SHA `d5c10c12...`).

## Wat is gebouwd (Set A, screens 1-8)

1. **Inzicht: "Voeding"-domeinrij toegevoegd** (na Lichaam, conform de
   goedgekeurde mockup-volgorde), met een nieuw, toegevoegd appel-icoon
   (`tkIcon('voeding')`). Additief: de 6 bestaande domeinen zijn niet
   verwijderd of gewijzigd, alleen uitgebreid naar 7.
2. **s-voeding** (overzicht): datum-navigatie, dagtotalen (energie +
   3 macro's + 4 overige voedingsstoffen met expliciete
   COMPLETE/PARTIAL-weergave -- een `UNKNOWN`-veld wordt bewust
   **niet getoond** in plaats van als 0, conform de harde
   UNKNOWN-regel), water- en supplementen-samenvatting.
3. **s-voeding-maaltijden**: 4 canonical maaltijdmomenten
   (ontbijt/lunch/diner/snacks), elk met een lege of gevulde staat.
4. **s-voeding-zoeken**: zoekveld (debounced, gebruikt
   `NutritionDiscoveryService.buildSearchFilter()`), knoppen voor
   barcode/foto (bewust nog niet geactiveerd, zie hieronder), en
   "zelf product toevoegen" (bewust nog niet uitgewerkt tot een volledig
   formulier).
5. **s-voeding-product**: volledige voedingswaardetabel, provenance-
   regel, "Volgende"-knop naar de portiekeuze.
6. **s-voeding-hoeveelheid**: presets (25/50/75/100/150/200g + 1 portie),
   vrije invoer, maaltijdkeuze. Roept **uitsluitend**
   `NutritionFoundation2Core.portionToNutrients()` aan -- geen eigen
   schaling in de UI (structureel getest, zie hieronder).
7. **s-voeding-maaltijd-detail**: item-lijst met verwijderknop,
   maaltijdtotaal, maaltijd-verwijderen.
8. **s-voeding-supplement**: naam/dosis/eenheid-invoer via
   `NutritionSupplementService.validateSupplementDefinition/Log()`,
   recente-invoer-lijst met verwijderknop.

Alle database-interactie via de bestaande `sbGet`/`sbPostQ`/`sbDelQ`-
conventies (RLS filtert automatisch op de ingelogde gebruiker). Geen
enkele nieuwe database-tabel of -kolom nodig (alles hergebruikt Wave 3
`nutrition_*`-tabellen).

## Kritieke, tijdens deze sprint zelf gevonden en gerepareerde fout

**Ik gebruikte aanvankelijk `btn-primary`/`btn-secondary` als CSS-
class, in de veronderstelling dat dit de standaard primaire/secundaire
knop-stijl was.** Bij visuele verificatie (screenshot) bleek de knop
volledig ongestyled. Onderzoek wees uit: de daadwerkelijke, door de
rest van de app gebruikte classes zijn **`tk-btn tk-btn-primary`** en
**`tk-btn tk-btn-secondary`** (met CSS-definities op regel 219-239).
Gecorrigeerd, **visueel herbevestigd** via een nieuwe screenshot (teal,
volle breedte, witte tekst -- consistent met de rest van de app). Een
structurele regressietest (`fVoedingUXSetA.test.js`) legt dit nu vast
zodat deze fout niet terugkomt.

## Geen shadow calculation (structureel getest, niet aangenomen)

- `voedingConfirmAddToMeal()` roept uitsluitend
  `NutritionFoundation2Core.portionToNutrients()` aan; een adversariale
  test bevestigt dat er geen eigen `/100`-schaling in de UI-functie
  staat.
- `voedingRenderOverview()` roept uitsluitend
  `NutritionMealService.aggregateDailyNutrition()` aan voor de
  dagtotalen.
- Beide zijn structureel, via source-inspectie in een geautomatiseerde
  test, bevestigd -- niet alleen visueel gecontroleerd.

## Geen doelnotatie (PO-besluit gerespecteerd)

Nergens in Set A staat een "X / Y"-notatie voor kcal, macro's, of
water (bv. "1800 / 2200 kcal") -- uitsluitend absolute, gelogde feiten.
Adversarieel getest via een regex-scan op het volledige Voeding-blok
(zowel HTML als JS-sectie, die ver uit elkaar in het bestand staan).

## Visueel geverifieerd (screenshots, niet alleen aangenomen)

Vier schermen (Inzicht met Voeding-rij, Voeding-overzicht, Maaltijden,
Product zoeken) zijn daadwerkelijk gerenderd in een headless browser en
als afbeelding gecontroleerd -- bevestigd: consistente kaartstijl,
correcte iconen, juiste, actieve navigatie-tab ("Voortgang").

## Bottom navigation (bewust, minimaal risico)

Geen enkele van de 38 (was 36) bestaande bottom-nav-blokken is
gewijzigd. Twee NIEUWE bnav-blokken toegevoegd (voor `s-voeding` en
`s-voeding-maaltijden`), met "Voortgang" als actieve tab (Voeding valt
onder het Inzicht/Voortgang-domein). Twee bestaande regressietesten
(`fB9_07BSocialClosure.test.js`, `fB9_07SocialProductLayer.test.js`)
die het totale aantal bnav-blokken tellen, zijn bijgewerkt naar het
nieuwe, correcte aantal (36->38) -- niet verzwakt, uitsluitend het
verwachte getal gecorrigeerd conform deze bewuste, additieve uitbreiding.

## Wat NIET is gebouwd (bewust, eerlijk)

- **Set B (screens 9-15, de foto-/etiket-verrijkingsflow) is in deze
  sprint niet gebouwd.** De knoppen "Scan barcode" en "Foto etiket"
  bestaan in de UI maar tonen een duidelijke, eerlijke melding dat dit
  nog niet geactiveerd is -- ze doen zich niet voor als werkend.
  Reden: dit vereist het daadwerkelijk aansluiten van de camera-/OCR-
  runtime (Wave 4), die momenteel uitsluitend in de aparte, interne
  technische harnas bestaat (`tools/nutrition-camera-harness.html`),
  niet in `index.html` zelf. Dit is een aanzienlijke, eigen
  integratie-inspanning die niet is meegenomen binnen deze sessie.
- **"Zelf product toevoegen" is een placeholder-melding**, geen
  volledig formulier -- `NutritionCustomProductService` is klaar en
  getest, maar het formulier zelf is niet gebouwd.
- **Correctie-/aanvul-formulier** (bij een onvolledig product) is een
  placeholder-melding, geen werkend formulier.
- Geen enkele voedingsdoel-/target-UI (conform de expliciete PO-
  beslissing die dit open houdt).
- Real device validation: geen enkele test op een fysieke telefoon.

## TESTS

`fVoedingUXSetA.test.js` (nieuw, 10/10, echte browser-runtime via
Playwright): domeinrij-aanwezigheid, foutloos laden van 4 schermen,
geen dode CSS-classes, geen shadow calculation (2x structureel),
geen doelnotatie. Twee bestaande tests bijgewerkt (bnav-telling,
domain-row-telling) naar de nieuwe, correcte, verwachte aantallen.
Release gate: 261/261 (was 260, +1 nieuw testbestand). Android: 29/29.

## MATURITY

```
NUTRITION UX SET A (screens 1-8)   = IMPLEMENTED + VISUALLY VERIFIED (4/8 screens screenshot-gecontroleerd)
NUTRITION UX SET B (screens 9-15)  = NOT BUILT (foto-/etiketflow, camera-runtime niet aangesloten)
CUSTOM PRODUCT FORM                = NOT BUILT (placeholder-melding)
CORRECTION FORM                    = NOT BUILT (placeholder-melding)
BOTTOM NAV                         = ADDITIEF UITGEBREID, GEEN BESTAAND BLOK GEWIJZIGD
SHADOW CALCULATION                 = GEEN (structureel getest)
REAL DEVICE VALIDATION             = OPEN
```

## MERGE RECOMMENDATION: YES (voor Set A)

Set A is functioneel, visueel geverifieerd, en veroorzaakt geen
regressie op bestaande schermen/navigatie (bevestigd via bijgewerkte,
niet-verzwakte tests). Set B blijft een aparte, toekomstige stap.
Definitieve beslissing blijft bij de Product Owner.
