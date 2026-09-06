# Nutrition UX v1 — Real Device Closure Report

Voortzetting op PR #240. Drie, via echte Android-toestel-tests
gevonden blockers, allemaal opgelost en waar mogelijk live bewezen.

## Blocker 1: browser-native dialogen verwijderd

Alle 10 `alert()`/`prompt()`/`confirm()`-aanroepen in de Nutrition UX
vervangen door bestaande, in-app Trainingskompas-componenten
(`toast()`, `openModal()`/`closeModal()`, inline-error-elementen):

- Water-invoer: `window.prompt()` -> nieuwe `m-voeding-water`-modal met
  snelkeuzes (100/250/500/750 ml) + vrije invoer. **Visueel bevestigd**
  (screenshot): geen enkele browser-hostname meer zichtbaar.
- Maaltijd verwijderen: `confirm()` -> nieuwe `m-voeding-confirm`-modal.
- Barcode-fouten (niet gevonden/ongeldig/camera-fout): `alert()` ->
  `toast()`.
- Correctie-opslaan/-fout: `alert()` -> inline-error-element + `toast()`.
- Custom-product-/nieuw-product-naam-validatie: `alert()` ->
  inline-error-element.

**Regressietest** (`fVoedingUXSetB.test.js`): een regex-scan over het
volledige Voeding HTML+JS-blok bevestigt **0** resterende
`alert(`/`prompt(`/`confirm(`-aanroepen.

## Blocker 2: OCR-lege-staat blokkeert een blanco "Volgende"

**Root cause bevestigd:** `result.status==='OK'` kon terugkomen zonder
dat ook maar één kernveld (energie/eiwit/koolhydraten/vet) een waarde
had -- de UI toonde dan een lege tabel met een nog steeds actieve
"Volgende"-knop.

**Fix:** na de OCR-aanroep wordt expliciet gecontroleerd of minstens
één kernveld een waarde heeft. Zo niet, dan verschijnt "Geen gegevens
herkend" / "We konden het etiket niet betrouwbaar uitlezen." met twee
acties: "Opnieuw fotograferen" en "Gegevens handmatig invoeren". Dit
geldt nu voor alle drie de faalpaden (lege observaties, `status!=='OK'`,
en een exception).

**Nieuw, echt, werkend handmatig-invoerscherm** (`s-voeding-handmatig`):
productnaam, merk, basis, kcal + optioneel kJ (apart veld, geen
automatische omrekening), eiwit, koolhydraten, suikers (optioneel),
vet, verzadigd vet (optioneel), vezels (optioneel), zout (optioneel),
barcode (optioneel, checksum-gevalideerd). Een leeg veld wordt
opgeslagen als `null`, nooit als `0`. Herkomst: `USER_LABEL_SCAN`, nooit
`VERIFIED`.

**Live, echt gedemonstreerd** (niet aangenomen): een echte, gegenereerde
afbeelding zonder enige voedingswaarde-tekst (een barcode-plaatje) door
de echte OCR-pipeline gehaald -- resultaat: **daadwerkelijk** de "Geen
gegevens herkend"-staat op het scherm, screenshot bevestigd.

## Blocker 3: hoeveelheid registreren na foto/custom product

**Root cause bevestigd:** `voedingSelectedProduct.nutrientRow` en
`.name` werden alleen gevuld in het zoek-pad
(`renderVoedingProduct()`). Na een foto- of custom-product-pad kwam de
gebruiker op het hoeveelheid-scherm terecht met ontbrekende
productdata, waardoor er geen bruikbare invoer (bv. "25 g") mogelijk
was.

**Fix (twee delen):**
1. `renderVoedingHoeveelheid()` is nu `async` en haalt zelf, alsnog,
   de ontbrekende product-/nutrientdata op wanneer die nog niet
   aanwezig is -- ongeacht via welk pad het product tot stand kwam.
2. Elk product-aanmaakpad (custom product, label-naar-nieuw-product,
   handmatige invoer) navigeert nu **altijd eerst** naar
   `s-voeding-hoeveelheid` in plaats van direct naar een
   bevestigingsscherm. De bevestiging (`toast()`) verschijnt nu pas
   ná het daadwerkelijk toevoegen aan een maaltijd.

**Functioneel bewezen** (via een geïsoleerde, gemockte-database-test
van de daadwerkelijke functies, niet alleen source-inspectie): na
`voedingSaveCustomProduct()` staat het actieve scherm bevestigd op
`s-voeding-hoeveelheid` (was voorheen het daadwerkelijke defect).

## Regressietests toegevoegd (`fVoedingUXSetB.test.js`, nu 17/17)

6 nieuwe, gerichte tests: geen alert/prompt/confirm (regex-scan over
het volledige blok), OCR-lege-staat-blokkade (structureel), alle drie
product-aanmaakpaden leiden naar de portion-flow (structureel),
`renderVoedingHoeveelheid` haalt zelf ontbrekende data op (structureel).

## Regressie

Release gate: 262/262 (ongewijzigd aantal, bestaande tests
uitgebreid). Set A: 10/10. Set B: 17/17 (was 11). Android: 29/29.
Security: 16/16. Doc consistency: schoon. HYROX forensic regressie:
386/386. Diff-omvang bevestigd gebonden (`git diff --numstat`: 199/25
regels voor de blocker-fixes, geen line-ending-explosie).

## Eerlijke beperking

De volledige, end-to-end database-persistence van scenario B (custom
product -> 25g -> daadwerkelijk in een maaltijd terechtkomen) kon in
deze sandbox niet met een echte Supabase-verbinding gedemonstreerd
worden (geen echte sessie/CORS beschikbaar) -- getest met een
gemockte database-laag die uitsluitend de client-side
navigatie-/orchestratielogica bewijst, niet de daadwerkelijke
schrijfoperatie. Dat laatste is al eerder, in Wave 3/4 en Closure 1,
apart en live tegen de echte database bewezen voor dezelfde
onderliggende `sbPostQ`/`nutrition_meal_items`-mechaniek.

## REAL DEVICE RETEST REQUIRED: JA

Conform de opdracht blijft een hernieuwde, fysieke Android-test
vereist om te bevestigen dat deze drie fixes het gerapporteerde gedrag
daadwerkelijk oplossen op een echt toestel.
