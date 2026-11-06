# Bibliotheekvalidatie (LIB-VALIDATE-01)

Gegenereerd met `node tools/library-validate.js --markdown --sha`. Alleen-lezen; niets geïmporteerd.

## Oefeningen

| Controle | Uitkomst |
|---|---|
| Records | 226 (MoveKit 226) |
| Fouten | 0 |
| Waarschuwingen | 4 |
| Dubbele id's / slugs / namen | 0 |
| Zonder Nederlandse naam | 226 |
| Spiergroepen buiten keuzelijst | Kuiten, Adductoren |
| Relatiefouten | 0 |
| Kennislaag gekoppeld | 206 van 226 (records: 206, met aliassen: 206, NL-naam: 0) |
| Video's | 226 (ontbrekend: 0, zonder catalogus: 0) |
| Manifest | 226 regels, grootte afwijkend: 0, sha256: 0 |
| Posters | 206 beschikbaar, 20 ontbrekend |
| Batch 002 | BLOCKED until the acceptance gates in this document are complete. |

Type: {"mobility":10,"isolation":69,"compound":135,"olympic":5,"plyometric":4,"carry":1,"cardio":2}  
Niveau: {"beginner":166,"advanced":12,"intermediate":48}  
Materiaal: {"bodyweight":44,"band":12,"barbell":32,"cable machine":33,"dumbbell":59,"kettlebell":23,"machine":21,"bicycle":2}

### Waarschuwingen

- spiergroepen in de catalogus die niet in MUSCLE_OPTIONS (tagging-keuzelijst) staan: Kuiten, Adductoren
- 226 van 226 oefeningen hebben geen Nederlandse naam (identity.nl)
- 20 catalogusoefeningen zonder record in exercise-intelligence_6.json
- 20 posters ontbreken bij de posterleverancier (movekit-posters)

## Supplementen

| Controle | Uitkomst |
|---|---|
| Catalogus | supplement_catalog.v1, 73 items {"CERTIFIED":35,"PENDING_VERIFICATION":38} |
| Claims / bronnen | 128 / 35 {"VERIFIED":118,"INSUFFICIENT":9,"REMOVE":1} |
| Beleidsclaims (niveau E) zonder literatuurbron | 6 (per ontwerp) |
| Fouten | 0 |
| Waarschuwingen | 0 |

## Voeding

De repository bevat geen centrale voedingsmiddelendatabase. Producten komen per scan uit Open Food Facts (core/nutritionProviderOpenFoodFacts.js, core/nutritionIngestService.js) of zijn eigen producten van de sporter (core/nutritionCustomProductService.js, gebruikersdata). Een centrale import vraagt eerst een productbesluit over bron, licentie (ODbL bij Open Food Facts) en scheiding van gebruikersdata.

