# Nutrition External Data Source Assessment

**Methode:** gericht webonderzoek (niet uit training overgenomen, actueel
gecontroleerd), september 2026. Geen provider-specifieke code
geïmplementeerd in deze sprint -- uitsluitend een generiek, provider-
agnostisch adaptercontract (zie `NUTRITION_CANONICAL_DATA_MODEL.md`).

## Kandidaat 1: Open Food Facts

| Criterium | Bevinding |
|---|---|
| Coverage NL/EU | Sterk: wereldwijd crowdsourced, ruim vertegenwoordigd in Europa (het project is Frans-gebaseerd, sterke EU-dekking) |
| Barcode coverage | Zeer sterk: GTIN/barcode is de primaire identifier van elk product in de dataset |
| Nutrition fields | Uitgebreid: macro's, veel micronutriënten, Nutri-Score, NOVA-groep, allergenen, ingrediëntenlijst |
| Schaal | 4+ miljoen producten, 182+ landen (stand medio 2025) |
| Licentie | Database: Open Database License (ODbL) + Database Contents License; productfoto's: CC BY-SA. Commercieel gebruik is toegestaan |
| Attribution | Verplicht: naam + link naar Open Food Facts vereist bij hergebruik, ook commercieel |
| Share-alike-risico | ODbL vereist dat een *afgeleide database* die Open Food Facts-data combineert met andere bronnen, onder dezelfde open voorwaarden gedeeld wordt -- dit raakt uitsluitend het delen van de resulterende, gecombineerde dataset zelf, niet de rest van de Trainingskompas-applicatie |
| API-limieten | Geen hard gedocumenteerd request-quotum gevonden in deze zoekopdracht; wel een verzoek om vooraf een gebruiksformulier in te vullen voor productie-gebruik |
| Kosten | Gratis; het project vraagt actief om donaties, geen betaalmuur voor API-toegang |
| Vendor lock-in risico | Laag: open licentie, geen contractuele afhankelijkheid |

## Kandidaat 2: USDA FoodData Central (FDC)

| Criterium | Bevinding |
|---|---|
| Coverage NL/EU | Zwak: primair Amerikaans, "Branded Foods" bevat vooral in de VS verkochte producten |
| Barcode coverage | Onrechtstreeks: branded foods hebben een GTIN/UPC-veld, maar geen dedicated "zoek op barcode"-endpoint |
| Nutrition fields | Sterk, genormeerd op numerieke USDA-nutrient-ID's (bv. 1008=energie kcal, 1003=eiwit) -- vereist eigen ID-naar-veldnaam-mapping |
| Schaal | 300.000+ voedingsmiddelen (Foundation/SR Legacy/Branded/Survey-FNDDS) |
| Licentie | Public domain, CC0 -- geen attributieverplichting, geen share-alike-risico |
| API-limieten | 1.000 requests/uur met een gratis, geregistreerde data.gov-sleutel (DEMO_KEY is strenger gelimiteerd) |
| Kosten | Volledig gratis, geen betaalmuur |
| Praktische last | Vereist zelf portion-scaling (geen automatische per-portie-berekening) en een eigen nutrient-ID-mapping-laag -- meer eigen engineering nodig dan bij Open Food Facts |
| Vendor lock-in risico | Zeer laag (CC0, overheidsbron) |

## Recommendation

**PRIMARY SOURCE: Open Food Facts.** Beste barcode-coverage en EU/NL-
relevantie voor een Nederlandse/Europese sportgebruiker, acceptabele
licentie mits attributie correct wordt geïmplementeerd.

**SECONDARY SOURCE: USDA FoodData Central.** Uitstekende aanvulling voor
generieke, merkloze voedingsmiddelen (groenten, granen, vlees) waar
Amerikaanse referentiewaarden goed bruikbaar zijn, en waar de CC0-
licentie geen attributielast geeft. Minder geschikt als primaire
barcode-bron voor de Nederlandse markt.

**OPTIONAL FALLBACK:** geen derde kandidaat in deze sessie onderzocht;
een Nederlandse/EU-specifieke bron (bv. NEVO, het Nederlandse
voedingsstoffenbestand) is een logische vervolgstap maar is niet
onderzocht binnen deze sprint -- expliciet open gelaten, geen aanname.

## Implementatiebeslissing deze sprint

Conform de opdracht ("adapter contract only, provider integration
deferred" bij twijfel over licentie/commerciële afspraken): **geen
enkele provider is in deze sprint daadwerkelijk geïntegreerd.** Het
canonical model en het generieke adaptercontract
(`lookupBarcode()/searchProducts()/getProduct()/normalizeProduct()/
normalizeNutrients()/sourceMetadata()`) zijn provider-agnostisch
gebouwd. Een daadwerkelijke Open Food Facts-integratie vereist nog een
expliciete Product Owner-beslissing over attributie-implementatie in de
UI (buiten scope: "geen nieuwe UX" in deze sprint) en eventueel het
invullen van het gevraagde productie-gebruiksformulier.
