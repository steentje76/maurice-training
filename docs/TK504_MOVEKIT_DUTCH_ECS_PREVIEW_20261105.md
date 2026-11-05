# TK504 — Nederlandse content aan de bestaande ExerciseCatalogService

**5 november 2026 — ontwikkeling, nog niet gereed voor productie.**

## Wat werkelijk is gebouwd

`core/movekitNlCatalogPreview.js` is een **losse, niet geactiveerde previewbridge**
die expliciet aansluit op de al bestaande `ExerciseCatalogService` in `index.html`.
Er wordt geen tweede oefencatalogus, zoekindex, exercise picker, workout-uitvoerder
of logger gebouwd.

De module accepteert de privé-Nederlandse 582-ID-overlay alleen in de strikt
gevraagde modus `PRIVATE_LOCAL_EDITORIAL_PREVIEW`. Controles:

- Bronmetadata SHA-256 en schema van het privéconcept moeten overeenkomen.
- Alle 582 canonieke `TK-######` IDs en unieke supplier-provider IDs aanwezig.
- Exact 226 bestaande oefen-IDs worden tegen de **echte** ECS gekoppeld,
  met dezelfde `source.provider_id` als in het bronoverzicht.
- De overige 356 blijven `UNRELEASED_CANDIDATE` en kunnen niet in ECS
  worden geschreven of als trainbaar worden weergegeven.
- Iedere oefening heeft exact 14 Nederlandse tekstvelden; extra velden,
  incomplete records, ongeldige bytes, verkeerde scope of gewijzigde IDs
  worden geweigerd.
- Voor een expliciete *lokale review* vult `installDutchSearchForLocalReview()`
  alleen `identity.nl` van de bestaande 226 items in, waarna
  `ExerciseCatalogService.rebuildIndex()` de **bestaande** index opnieuw bouwt.
  De Engelse identiteit, `identity.name`, ID, spiergroep, media en
  uitvoering/logging veranderen niet. De module kan de oude toestand herstellen.
- De reviewprojectie heeft altijd `selectable=false`,
  `trainable=false` en `signedMediaAvailable=false`.
- Niets hiervan is aangesloten op de productie-HTML of het Android-bouwproces.

## Echte privébron en onafhankelijke proef

De Nederlandse conceptinhoud blijft uitsluitend onder
`C:\Movikit\.tk-private-review\` op de ontwikkel-pc en wordt
**niet in deze publieke repository gecommit**.

De private tests vergelijken de 582 gelicentieerde vertalingen met de
canonieke 226 uitgegeven `EX_CATALOG`-records via echte leverancier-ID's.
Het bronbestand staat in een andere volgorde dan de catalogus; index-joins
zijn niet toegestaan.

**Resultaat 5 november 2026:**

| Controle | Uitslag |
|---|---|
| Privévertaling gekoppeld aan echte ECS | 582/582 |
| Bestaande catalogusitems met Nederlandse zoekterm | **226/226 raak** |
| Verlies in de Nederlandse zoekresultaten | **0** |
| Nieuwe oefenrecords onbedoeld zichtbaar in ECS | **0/356** |
| Oorspronkelijke Engelse namen bij terugzetten intact | **226/226** |
| Generieke Node/VM-regressies met synthetische data | **9 PASS** |

Uitvoer: `TK504-REAL-ECS-NL-SEARCH-QA-20261105.json` (privé).
Bij controle bleken **2 vertaalrecords extra niet-ondersteunde AI-notitievelden**
te bevatten (`tags_nl_note` en `shortDescription_nl_placeholder`).
Die zijn niet stilzwijgend aan de app gekoppeld; een gecontroleerde
projectie naar precies 14 UI-velden staat onder
`TK504-NL-CANONICAL-OVERLAY-ECS-582-20261105.json` en het privé QA-bestand
registreert expliciet de twee uitgesloten extra velden. De originele
vertalingen en bronrecords zijn behouden.

## Lokale Chrome-weergave gecontroleerd

Uit de bestaande `EX_CATALOG` en dezelfde ECS-module is bovendien een
**volledig offline app-achtige privépreview** gemaakt. Deze bevat de
Nederlandse draft-overlay uitsluitend lokaal, zonder netwerkverzoeken of
training/loggingfunctionaliteit:
`C:\Movikit\.tk-private-review\TK504-NL-EXERCISE-CATALOG-ECS-APP-PREVIEW-20261105.html`.

Headless Chrome (privé) heeft deze daadwerkelijk uitgevoerd:

- **226/226 Nederlandse oefeningkaarten** gerenderd vanuit de bestaande ECS.
- De eerste Nederlandstalige detailweergave geladen.
- **356/356 nieuwe kandidaten niet getoond**.
- Resultaat `PRIVATE_REAL_CHROME_ECS_PREVIEW_PASS`, rapport:
  `TK504-CHROME-ECS-NL-PICKER-QA-20261105.json` (privé).

Deze HTML is bewust geen releasebuild van Trainingskompas. In productie is nog
geen script of vertaaldata aangesloten.

## Nog nodig voordat dit in de app komt

- Menselijke Nederlandse redactie en techniekcontrole van de 582 records.
  De 354 naamvarianten zijn alleen door AI voorgeselecteerd, waarvan 33 als
  handmatig onbeslist zijn gemarkeerd.
- Goedkeuring van de precieze UI-velden en hoe de meertalige weergave in de
  bestaande picker/detailweergave werkt, zonder opgeslagen namen te herschrijven.
- Voor de 356 nieuwe oefeningen: aparte inhoudelijke, juridische en
  authentiek vastgelegde releasegoedkeuring, server-authority, DB-migraties
  en privémedia-ontsluiting. De vertaling is **geen** releasegoedkeuring.
- Regressietests op de volledige uitvoering, #577/#582/#584/#579/#586,
  gezamenlijk mobiele UX-controle en vervolgens pas een nieuwe APK.

**Geen productiegegevens, rechten, Git-main, APK, releaseconfiguratie,
sociale functies of betaalde media gewijzigd.**

## Reproduceerbare tests

`node core/movekitNlCatalogPreview.test.js`

De private daadwerkelijke-broncontrole wordt uitsluitend op de vertrouwde
ontwikkel-pc uitgevoerd:
`node C:\Movikit\.tk-private-review\TK504-real-ecs-nl-integration-20261105.cjs`

In een UI moeten de geretourneerde tekstvelden altijd met `textContent` of
de bestaande `escHtml` weergegeven worden; **nooit** ongewijzigd in
`innerHTML` injecteren.
