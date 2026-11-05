# TK504 — Movekit aansluiten op bestaande Trainingskompas-oefenbibliotheek

**5 november 2026. Deze wijziging is daadwerkelijk in de bestaande app-UI aangebracht, niet in een tweede bibliotheek.**

## Wat is aangesloten

- `ExerciseCatalogService` blijft de **enige canonieke catalogusservice**.
- `tkCatalogDisplayName` gebruikt een aanwezige Nederlandse `identity.nl`,
  anders de bestaande Engelse `identity.name`.
- De huidige premium oefenbibliotheek gebruikt dat voor kaarten, zoekresultaten,
  details, afbeeldingen (alttekst) en vergelijken, zonder wijziging aan het TK-ID.
- De bestaande `exPickerPool` combineert nog steeds persoonlijke/legacy
  oefeningen met de canonieke catalogus, met deduplicatie **op ID**.
- De bestaande oefeningkiezer zoekt nu op beide naamvarianten en
  `source.provider_id`, en sorteert op de daadwerkelijk getoonde naam.
- **Persoonlijke oefeningen gaan voor** bij dezelfde ID: er vindt geen
  automatische hernoeming of koppeling op basis van een vergelijkbare naam plaats.
- Losse oefening / trainingselectie toont de gekozen naam, maar de
  bestaande `resolvePickerEx`, `buildExerciseBody`, `ensureExerciseRowStatus`,
  `finishSession` en loggingketen zijn niet vervangen.
- De reeds Nederlandse `intelligence.cues` en `intelligence.mistakes`
  blijven ongemoeid. Bestaande video's/posters gebruiken nog steeds de
  bestaande `ExerciseAssetProvider`.
- Taaltekst in het bibliotheekdetail is opgeschoond: `Equipment` → `Materiaal`.

## Wat dit bewust nog niet doet

- Er zijn in de huidige actieve catalogus nog **226 lege `identity.nl`-velden**.
  De 582 volledig vertaalde MoveKit-oefeningen zijn alleen als privéconcept
  beschikbaar; zij worden hier niet zonder review of server-authority
  als publicatiegegevens in de publieke GitHub-repo ingebakken.
  Tot een gecontroleerde contentrelease blijven de Engelse bronnamen zichtbaar.
- Het `main`-register bevat 356 nieuwe MoveKit-ID's als
  `NOT_PUBLISHED`, maar ze zijn **niet** geïmporteerd in de actieve
  `EX_CATALOG` en kunnen nog niet worden uitgevoerd of gelogd.
- De bestaande heuristische AI-scores, CNS-/blessurerisico-uitspraken
  en hersteltijdclaims zijn niet beoordeeld of gewijzigd door deze naam-UI-PR.
  Ze zijn **geen** inhoudelijke goedkeuring en vereisen eigen evidence-review.
- Geen productie-Supabase writes, APK, media-grants, of tweede picker.

## Verifieerbaar

`node core/tk504ExistingLibraryConnection.test.cjs` controleert echte
226-catalogus-ID's, Engelse/Nederlandse zoekterm, persoonlijke
ID-isolatie, bestaande aanroepketens en HTML-scriptparse.

`node core/movekitNlCatalogPreview.test.js` controleert de eerdere
strikt private, onuitgegeven MoveKit-NL-bronoverlaybridge.

De HTML staat rechtstreeks in `index.html`; goedgekeurde naamvelden
zullen na gecontroleerde aanlevering automatisch in zowel bibliotheek
als oefeningkiezer verschijnen. Geen dubbele bibliotheek bouwen.

## Volgende release-stappen

1. Beoordeelde Nederlandse naam-/inhoudsgegevens via de bestaande
   goedgekeurde catalogusopbouw/private leveringsroute in `identity.nl` laden,
   zonder Engelse `identity.name` of historie te herschrijven.
2. De 356 nieuwe kandidaten pas na authentiek vastgelegde
   inhouds-/licentiegoedkeuring, server-side authorization en private-media-grants
   toevoegen aan de bestaande `EX_CATALOG`.
3. Herstel- en UX-bevindingen #577, #579, #582, #584, #586 functioneel
   accepteren voordat er een nieuwe test-APK wordt vrijgegeven.
