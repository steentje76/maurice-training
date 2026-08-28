# MS-F2-04_EXERCISE_LIBRARY.md — Trainingskompas

**Auditmethode:** lezing van `ExerciseCatalogService` (index.html), inclusief `search`, `_run`, `_match`, `_tok`, `_norm`, `_alias`, `validateIndex`, `benchmark`, en de rendering-/selectiefuncties `_item`, `_libOpen`.

## Bevinding: geavanceerde, reeds bestaande zoek-infrastructuur
De Exercise Library blijkt te draaien op een volwaardige inverted-index-zoekmachine, niet een naïeve substring-filter:
- **Normalisatie** (`_norm`): case-insensitive, koppeltekens/underscores/slashes → spatie, leestekens verwijderd, getrimd.
- **Tokenisatie + alias-resolutie** (`_tok`, `ALIAS_GROUPS`): meerdere schrijfwijzen/synoniemen resolven naar hetzelfde concept.
- **Caching**: query-resultaten gecached op `query+filters+sort`-sleutel.
- **Typo-correctie**: `_correct()` per token, zichtbaar in `searchExplain()`.
- **Zelfvalidatie**: `validateIndex()` controleert op lege alias-groepen, dubbele aliassen, lege posting-lists, onbereikbare oefeningen en dubbele ID's — een ingebouwde datakwaliteitscontrole die al vóór deze sprint bestond.
- **Performance-instrumentatie**: `benchmark()`, `searchAnalytics()` — meet daadwerkelijke zoektijden over oplopende datasetgroottes.

## Canonical exercise identity (sectie 8-9 van de opdracht)
Bevestigd: `_item()` gebruikt `c.catalog_id` als `data-id`, `_libOpen(id)` registreert ditzelfde canonical ID in "recent bekeken" (`pushRecent`). Geen array-index of displaynaam wordt ergens als selectie-sleutel gebruikt. Consistent met de in MS-F2-03 al bevestigde gedeelde identity tussen Library en Builder (`libAddToExistingTraining` gebruikt `catalogId` rechtstreeks).

## Custom exercise (sectie 12): bewuste productgrens, geen defect
Er bestaat geen "voeg oefening toe aan de globale catalogus"-functie vanuit de Library zelf. Het aanmaken van een nieuwe oefening is bewust beperkt tot de "losse training"-flow (`selectExPickerNew`); wanneer de picker in een andere context (bijv. toevoegen aan een training via de Builder) wordt geopend, toont de app expliciet: *"Nieuwe oefening aanmaken kan alleen via Training → Oefening"*. Dit is een communiceerde, opzettelijke scope-grens — geen stille inconsistentie of half afgebouwde feature.

## Geen nieuw defect gevonden
Consistent met MS-F2-02/03: geen actief, gebruikersgevoeld defect aangetroffen. Geen wijziging aan `index.html`.

## Nieuw: regressiecontract
`core/fExerciseLibrary.test.js` (10/10, sabotagebewijs geleverd voor de case-insensitiviteit van `_norm`) legt de normalisatie- en identity-garanties vast.

## MS-F2-04 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Fast search/filter/favorites/recent/equipment/muscle UX."*
Bevestigd aanwezig: snelle gecachte zoekfunctie, favorieten (`isFavorite`), recent-bekeken (`pushRecent`/`recent()`), spiergroep-/equipment-gebaseerde secties (`_libSections`, `_altGroups`) en aanbevelingen (`_recommend`, `_inferGoal`).

**Resultaat: CLOSED** — acceptance gate bevestigd behaald op basis van bestaand, geverifieerd gedrag.
