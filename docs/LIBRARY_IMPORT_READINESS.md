# Bibliotheken — importgereedheid (LIB-VALIDATE-01, 18 oktober 2026)

**Status:** importgereedheid voorbereid; **niets geïmporteerd**. Het validatierapport staat in
`docs/LIBRARY_VALIDATION_REPORT.md` en wordt door `core/fLibraryValidation.test.js` actueel gehouden.

## 1. Oefeningen (MoveKit)

| Feit | Waarde | Bron |
|---|---|---|
| Catalogus | 226 MoveKit-oefeningen, 0 fouten | `exercise-catalog.json` |
| Volledige MoveKit-bibliotheek | 412 uniek, 186 aanvullend | `docs/MOVEKIT_MEDIA_SCALE_GATE_2026-10-01.md` |
| Bronbestanden van de 186 | **niet in de repository** | — |
| Poort Batch 002 | **BLOCKED** (beveiligde levering, licentie: geen publieke ruwe URL's) | idem |
| Video's | 226, manifest klopt (grootte + sha256) | `docs/generated/MOVEKIT_MEDIA_MANIFEST_V1.json` |

Bevindingen die de zoekkwaliteit en tagging raken (waarschuwingen, geen fouten):
- 0 van 226 oefeningen heeft een Nederlandse naam (`identity.nl`); de kennislaag heeft wel Engelse aliassen.
- `Kuiten` en `Adductoren` worden in de catalogus gebruikt maar staan niet in `MUSCLE_OPTIONS`.
- 20 catalogusoefeningen hebben geen record in `exercise-intelligence_6.json`; 20 posters ontbreken.

Niet zelf ingevuld: Nederlandse namen en ontbrekende kennisrecords zijn inhoud die een bron of een
redactiebesluit vraagt. Ze worden niet door Claude bedacht.

### Reproduceerbare en omkeerbare import (zodra de poort open is)
1. Pakket lokaal uitpakken in een eigen map (niet in de repository).
2. `node tools/library-validate.js --movekit-source <map> --markdown` → droogloop: nieuwe slugs, botsingen
   op naam, voorgestelde `TK-######` (altijd ná het hoogste bestaande id). Er wordt niets geschreven.
3. Plan laten beoordelen (PO + licentie). Pas daarna een aparte PR die de catalogus, het manifest en de
   media volgens de gekozen architectuur aanvult.
4. Omkeren = die PR terugdraaien; bestaande id's veranderen nooit, dus er is geen migratie van gebruikersdata.

## 2. Supplementen

`supplement_catalog.v1`: 73 items (35 CERTIFIED, 38 PENDING_VERIFICATION), 128 claims, 35 bronnen. Geen fouten:
elke claim op niveau A–D heeft een bron die in de Source Registry staat, geen genees-/behandeltaal. Zes
beleidsclaims op niveau E (bijv. "Trainingskompas stelt nooit zelfstandig een ijzertekort vast") hebben per
ontwerp geen literatuurbron. Uitbreiding verloopt per item via de bestaande catalogus + Evidence Registry.

## 3. Voeding

Er is geen centrale voedingsmiddelendatabase in de repository. Producten komen per scan uit Open Food Facts of
zijn eigen producten van de sporter (gebruikersdata, gescheiden van de catalogus). Een centrale import vraagt
eerst een **PO-besluit**: bron, licentie (Open Food Facts = ODbL, naamsvermelding en share-alike), versie-
beheer, en hoe gecontroleerde waarden zich verhouden tot schattingen. Tot dat besluit: geen bulkimport.
