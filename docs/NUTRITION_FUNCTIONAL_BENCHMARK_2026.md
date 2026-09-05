# Nutrition Functional Benchmark 2026

**Methode:** gericht webonderzoek (september 2026), meerdere,
onafhankelijke bronnen. Vergelijking uitsluitend op functionele
capaciteit -- niet op UX/visueel ontwerp.

## Referentiepunten (geparafraseerd, meerdere bronnen)

| App | Sterkte | Zwakte |
|---|---|---|
| MyFitnessPal | Zeer grote productdatabase (20+ miljoen items), brede merk-/restaurantdekking | Datakwaliteit wisselend (community-invoer), barcode-scannen inmiddels beperkt op de gratis laag |
| Cronometer | Sterke, curatie-gedreven database (USDA-verankerd), 84+ getrackte voedingsstoffen, expliciete verificatie-markering | Kleinere database dan MyFitnessPal, minder merkproducten |
| MacroFactor | Snelste, meest tik-efficiënte logging-workflows, adaptieve, op gewichtstrend gebaseerde doelen | Geen uitgebreide micronutriënten-tracking |

**Belangrijke, meervoudig bevestigde bevinding:** geen van deze drie,
gevestigde apps biedt AI-foto-herkenning van voeding (per medio 2026).
Trainingskompas' camera-/label-OCR-fundament (Wave 4) is op dit vlak
dus al verder dan deze drie referenties, al is dat bij Trainingskompas
nog niet in een gebruikersscherm gebracht.

## Trainingskompas: CURRENT vs. benchmark vs. gap

| Capability | Trainingskompas CURRENT | Benchmark | Gap |
|---|---|---|---|
| Food/product database | Eigen canonical model + Open Food Facts-adapter (klaar, niet gevuld) | 1-20 miljoen items | Groot: 0 echte productrijen |
| Barcode scanning | Software klaar, niet in UI | Standaard, deels betaald | Klein (softwarematig verder dan gedacht) |
| Custom foods | Canonical model ondersteunt dit (USER_PRIVATE) | Alle drie ondersteunen dit | Klein |
| Meal logging (CRUD) | Nieuw gebouwd deze sprint (service-laag), geen UI | Volwassen, jarenlang gepolijst | Groot: geen UI, geen jarenlange praktijkervaring |
| Daily totals + coverage | Nieuw gebouwd, UNKNOWN != 0 expliciet | Impliciet/inconsistent bij concurrenten | **Trainingskompas' expliciete coverage-metadata is een reeel, functioneel voordeel** |
| Micronutriënten | Canonical schema ondersteunt uitbreiding, praktisch alleen macro's + salt/sodium/fiber/sugar/sat-fat | Cronometer: 84+ | Groot |
| Adaptieve doelen | Niet gebouwd, bewust (PO-beslissing vereist) | MacroFactor's kernfunctie | Groot, doelbewust nog niet opgepakt |
| Historische reproduceerbaarheid | Expliciet, apart getest (snapshot-at-log-time) | Niet publiek gedocumenteerd bij concurrenten | Onbekend bij concurrenten, wel bij Trainingskompas bewezen |
| AI-fotoherkenning van voeding | Fundament aanwezig (Wave 4), niet in UI | Geen van de drie referenties biedt dit | **Potentieel concurrentievoordeel, nog niet benut** |
| Hydratie | Apart canonical model, geen UI | Meestal wel aanwezig | Matig |
| Supplementen | Apart canonical model, geen UI | Wisselend aanwezig | Matig |

## Conclusie

Trainingskompas hoeft niet elke functie van deze drie apps te evenaren.
De doelstelling blijft: een uitstekende, sportgerichte
voedingsfunctionaliteit, geintegreerd in de rest van de app -- niet een
losstaande, algemene voedingstracker-kloon. Het grootste, structurele
gat is niet architectuur (die is nu solide), maar **populatie van
echte productdata** en **een daadwerkelijke gebruikersinterface**.
