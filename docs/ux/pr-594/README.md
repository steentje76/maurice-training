# Trainingskompas PR #594 — visuele acceptatie Inzicht V2

**Status:** gecorrigeerde UX volgens product-ownerfeedback van 3 november 2026; de eerdere screenshotset is vervangen door nieuwe echte renderings. Deze screenshots komen uit een *offline, niet-ingelogde* Chrome-run op de geïsoleerde UX-branch. Er is geen echte sporter- of accountdata geladen. Onbekende waarden verschijnen bewust als '—' of 'niet gemeten'.

| Begin van Inzicht | Herstel en spierbelasting | Domeinen en gegevens |
|---|---|---|
| ![Inzicht start](inzicht-top.png) | ![Herstel](inzicht-middle.png) | ![Domeinen en context](inzicht-bottom.png) |

## Te beoordelen

- De vier oorspronkelijke KPI's (Verbeterd, Stijgende trends, Trainingen, Adherence) zijn hersteld. Klopt hun presentatie?
- De dubbele donkere daggereedheid/check-in is verwijderd van Inzicht en blijft op Home; oorspronkelijke Herstel & Spierbelasting (voorzijde/achterzijde, herstelpercentages en tabs) is ongewijzigd behouden.
- Vallen **Lichaamssamenstelling** en de vier contextacties logisch onder één kaart?
- Moet de navigatie visueel verder worden vereenvoudigd?

## Reeds geautomatiseerd gecontroleerd

- Geen horizontale overflow op 320, 360, 390, 430 px.
- Vier oorspronkelijke KPI's en zes domeinen renderen; Lichaamssamenstelling blijft onder Gegevens & context.
- Alle vier contextacties bestaan en de route naar lichaamsmetingen werkt.
- UX-polish na PO-feedback: Verbanden-kaarten en Alle verbanden hebben minimaal 12 px tussenruimte; het icoon en de resultaatbadges gebruiken dezelfde primaire mintkleur als de overige Inzicht-acties.
- Cyclus en Voeding rond je training hebben lijn-SVG's in dezelfde accentkleur en icoonachtergrond als Lichaamssamenstelling en Gezondheidsgegevens & koppelingen; geen afwijkende gekleurde emoji's.
- Chrome CSS-/geometrietoets: 320, 360, 390 en 430 px PASS, inclusief twee synthetische resultaatkaarten om tussenruimte te meten. De screenshots zelf tonen de eerlijke offline leegstaat, geen nagebootste sporterresultaten.
- Trainen blijft bereikbaar, trainingsritme wordt accountgebonden ververst en wist gegevens van een oud account direct bij switch.
- Deze screenshots tonen geen live synchronisatie, eigenaarshistorie of fysieke Android-toesteltest.

**Gates:** PR #594 blijft Draft. Geen merge naar `main`, geen Android-APK of publicatie van MoveKit-media vóór afzonderlijke acceptatie.
