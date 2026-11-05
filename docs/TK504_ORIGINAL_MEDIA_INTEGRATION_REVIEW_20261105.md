# TK504 — Oorspronkelijk ontwerp versus MoveKit 582-bronnen (independent Claude review)

**Datum:** 5 november 2026
**Scope:** onafhankelijke bron-/codecontrole, niet de productiecutover.
**Reviewbron:** Claude Code Sonnet, read-only, uitgevoerd op de repo-worktree `feat/tk504-secure-media-v1-20261105`; aangevuld met rechtstreeks gecontroleerde repo-contracten. Claude heeft in zijn eigen review geen tests uitgevoerd; de hieronder vermelde technische regressies zijn onafhankelijk door ChatGPT gedraaid.

## 1. Wat was oorspronkelijk bedoeld?

Volgens `docs/MOVEKIT_MEDIA_SCALE_GATE_2026-10-01.md`, hoofdstuk 5-6, moeten leveranciersbestanden eerst **offline worden geïmporteerd en op integriteit gecontroleerd**. Vervolgens gaat uitsluitend oefenidentiteit, provider-id, manifest, checksum, bestandsomvang en herkomst in Git. De **private Supabase Storage** bevat de binaire video's/posters. Een **geauthentiseerde, geautoriseerde serverbroker** mag kortlevende afspeel-URL's uitgeven. Web en Android gebruiken dezelfde bestaande mediaservice.

De bestaande `ExerciseCatalogService` (`index.html`) is en blijft de **enige** oefencatalogus en heeft reeds zoekindex, sortering, favorieten en `catalog_id`-identiteit. De bestaande `ExerciseAssetProvider` heeft expliciet `register(type, provider)` en ondersteunt meerdere mediatypen en leveranciers. `MediaUrlResolver` is de bestaande origin/URL-boundary; voor asynchrone private delivery komt een MediaAccessBroker achter de provider. **Er komt geen tweede picker, Workout Builder, training-uitvoerder, loggingfunctie of bibliotheek.**

`docs/MS-F2-04_EXERCISE_LIBRARY.md` bevestigt dat een normale gebruiker uit de bibliotheek **bewust niet** zomaar nieuwe globale oefeningen kan publiceren. De persoonlijke 'nieuwe oefening' is een afzonderlijke beperkte trainingflow. `docs/TK504_EXISTING_LIBRARY_CONNECTION_20261105.md` bevestigt de bestaande bridge van `identity.nl`/Engelse naam naar dezelfde picker en logging.

## 2. Kunnen de bronbestanden op deze manier aansluiten?

**Ja, als offline voorbereide en na menselijke review individueel vrijgegeven providersets. Niet als bulkactivering van 356 kandidaten.**

- Exact **582** bronidentiteiten, privé MP4 en geoptimaliseerde WebP-posters zijn al op basis van canonieke `TK-######`-ID plus MoveKit-provider-slug gekoppeld; per object zijn bytegrootte, bron-SHA-256 en storage-ETag-registers onafhankelijk gecontroleerd. Geen provider-index/bronvolgorde gebruiken voor identiteit.
- **226** bestaande MoveKit-catalogusrecords en manifests zijn in de centrale ECS aanwezig; **356** nieuwe kandidaten staan op `NOT_PUBLISHED` en mogen nog niet trainbaar/selecteerbaar zijn.
- De private 582-talige vertaalset kan zonder ID-herschrijving `identity.nl` en de details vullen, uitsluitend na inhoudelijke beoordeling. De reguliere bestaande Engelse `identity.name` blijft behouden en workout-history blijft op stabiel ID. De 356 zijn niet vooraf in de actieve centrale catalogus ingevoegd.
- `TK-000227` — 90/90 heupwissels — is de bewezen **enige** goedgekeurde zichtbare proef. Deze oefening is in een lokale geïsoleerde kopie via **de echte `EX_CATALOG` + `ExerciseCatalogService` + `ExerciseAssetProvider`** getoond, met eigen originele video/poster en succesvolle HTTP 206 + echte Chromium-seektest. De eigenaar heeft getoonde NL-tekst, indeling en UX op 5 november goedgekeurd; dat is **geen** live publicatiegoedkeuring of entitlement.
- De oorspronkelijke generieke **beheer-UI voor upload/review/publicatie** is nog niet afgerond. Het huidige brontraject bestaat uit offline scripts/draftmappen en een afzonderlijke release- en rechtenprocedure.

## 3. Gewenste productieroute voor elke extra leverancier/oefening

`bronvideo + bronmetadata + bronlicentie` → offline checksum/variantcheck → ongewijzigde canonieke `catalog_id` + `provider_id` → Nederlandse redactie en onafhankelijke taxonomie-/evidencecontrole → expliciete item-scoped reviewbeslissing → gecontroleerde toevoeging aan de **bestaande ECS** → goedgekeurde private media-assetregistratie → authenticatie/actieve gebruikersgrant in serverbroker → signed video/poster afspelen in bestaande detail-, preview-, execution- en logging-UI → security-/Android-/Range-/seek-/replayacceptatie.

Dezelfde keten moet later ook leveranciers behalve MoveKit kunnen bedienen. De Calculation/Context/Decision/AI-engine wordt hiervoor niet aangepast.

## 4. Claude's onafhankelijke risico's — niet wegpoetsen

1. **Publieke duplicaten blijven toegankelijk.** Oud Netlify `/videos/*.mp4` en `EXERCISE_POSTERS` / `EXERCISE_ASSETS` embedded-data in `index.html` zijn geen beschermde media. Een client-side SW 403 is geen netwerkbeveiliging voor directe CDN-links. Deze bronnen moeten bij een aantoonbaar veilige cutover server-side verdwijnen, met aandacht voor caching en historische bestanden.
2. **Twee poster-bypasses** ontdekt: `getExerciseAsset()` kon een legacy MoveKit-intelligenceposter rechtstreeks retourneren; `ExerciseCatalogService.resolveAsset()` kon rechtstreeks `EXERCISE_ASSETS.poster` uitlezen. In deze branch door ChatGPT beveiligd met onafhankelijke negatievetests, zonder gedrag van de V1-uitrol te veranderen.
3. **Pauzeren/URL-expiry:** de beveiligde player staat één herstelpoging toe, wat bij herhaald pauzeren gedurende lange sessies niet volstaat. Onderscheid normale URL-verval van echte decoderfouten en vernieuw veilig per nieuwe afspeelfase.
4. **Misbruik/audit:** server-side ondertekentokenuitgifte heeft nog geen aantoonbare rate-limiting/issuance-audit; controleer grantbevoegdheden op echte Supabase-rollen (niet alleen commentaar).
5. **Posters op schaal:** per thumbnail één brokercall veroorzaakt te veel verkeer. Kies batching of lazy-loaded batches met echte gebruikers-/releasechecks. MoveKit-posters niet zomaar openbaar publiceren zolang licentie/cutover onduidelijk is.
6. **Releaseconfiguratie:** zowel client/SW-codegates als server-releaseconfig zijn afzonderlijk. Zorg voor een versieerbare releasegatesmoketest met gecontroleerde deploymentvolgorde en rollback.
7. **Architectuurcomplexiteit:** de huidige staged client + bridge + playback + UI bevatten overlap in canonieke identiteit/sessiecontroles. Refactor pas gecontroleerd na groene end-to-endtests en zonder de provider-onafhankelijke architectuur te vervangen.

## 5. Uitvoerstatus en volgende gates

De oorspronkelijke bronstroom is **technisch compatibel**, maar betekent nog niet dat 356 nieuwe oefeningen live geïntegreerd zijn. Prioriteit: herstel alle publiek-embeds en de per-provider cutoverboundary; zorg voor server-side rechten- en mediarelease voor uitsluitend TK-000227; voer echte Android-account afspeelproeven, HTTP Range/seek/replay, expiry en rollback uit; sluit de bestaande integrale projectgate en de issues #577/#579/#582/#584/#586; pas daarna nieuwe APK en latere itemgewijze uitbreiding naar 582.

`public.movekit_media_grants` is tijdens deze controle nog **niet** aanwezig in productie. De owner approval voor één oefening geeft geen SQL-migratie- of publicatiebevoegdheid. **PR #602 blijft Draft met de client release uit en 356 kandidaten niet gepubliceerd.**

## Aanvullende onafhankelijke grants-controle (na Claude-review)

- Claude signaleerde dat de Supabase `service_role` op nieuwe public tabellen mogelijk via standaardprivileges schrijfrechten erft. De eerder opgestelde migration verleende wel `SELECT`, maar trok deze potentiële impliciete schrijfrechten niet expliciet in.
- `supabase/migrations/20261103155325_tk504_movekit_v2_media_grants.sql` bevat nu een expliciete `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ... FROM service_role` vóór de uitsluitend-lezen-grant. Geen productie-SQL uitgevoerd.
- De geïsoleerde Docker PostgreSQL 16-test simuleert vooraf een **volledig standaardprivilege** aan `service_role`, voert de migratie uit en bewijst daarna SELECT toegestaan, alle schrijfrechten geweigerd, gebruikersrollen uitgesloten, RLS ingeschakeld, default entitlement inactive, unique/revoke invariants geldig en BYPASSRLS-leesbaarheid vanuit de rol.
- De herhaalde lokale SQL-smoketest is **groen**, de container is verwijderd; `core/tk504MediaGrantSchema.test.js` controleert de expliciete REVOKE ook statisch. Werkelijke Supabase-config moet bij een gecontroleerde geïsoleerde validatie alsnog worden beoordeeld.
