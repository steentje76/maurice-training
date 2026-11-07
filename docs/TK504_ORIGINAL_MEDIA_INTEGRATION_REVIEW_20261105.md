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

## Vervolgbouw — harde productie-cutovercontrole en herhaald hervatten

- `core/tk504PrivateReleaseCutoverGuard.test.js` is een automatische **fail-closed release-test**. Hij inventariseert in de huidige V1-deploybron 226 openbare MP4-bestanden en 206 embedded data-URI-posters, en verhindert het activeren van de nieuwe private codegates zolang er direct bereikbare oude mediabestanden, embedded posters, ontbrekende server release entries, ontbrekend echte afspeelbewijs of niet-gecontroleerde directe CDN-paden bestaan. De test bewaakt ook de exacte synchronisatie tussen app- en service-worker-vlaggen. Uitkomst: **15/15 tests**. Dit is geen bewering dat alle publieke kopieën al verwijderd zijn.
- De oorspronkelijke speler deed maximaal één tokenvernieuwing bij een video-error. Hij is nu voorbereid op herhaald hervatten van een training over langere tijd: zachte expiratie uit het brokercontract (`expiresAt`) wordt gecontroleerd op `play` en `seeking`, waarna de speler een nieuw gebruikersgebonden ticket ophaalt en de videopositie behoudt. Een expliciet gepauzeerde video wordt daarbij niet zelfstandig gestart.
- Een `inFlight`-slot dedupliceert gelijktijdige `play`/`seeking`-vernieuwingen; een rolling limit van **maximaal twee vernieuwingen in twaalf seconden** verhindert een oneindige retryloop op corrupte content, terwijl latere pauzes wel een nieuwe poging mogen doen. Bij auth- of mediaweigering wordt de speler beëindigd, gepauzeerd en worden signed `src` en `poster` uit het video-element verwijderd.
- `core/tk504ProtectedPlayerFlow.test.js`: **46** synthetische DOM-tests, inclusief twee afzonderlijke linkverlopen met lange pauzes, paused seek zonder autoplay, parallelle events met één signed request, fout-herstel, fail-closed gedrag en accountwissel.
- **Grenzen:** Dit is nog geen test met echte Supabase-signed links of op fysieke Android-WebView. Het verversen van elke kaartposter voor een grote bibliotheek is nog niet gebatcht. Server-side rate limiting en tokenuitgifte-audit ontbreken nog en moeten vóór activatie worden gebouwd. Laat de 226 openbare MP4's en embedded data alleen verdwijnen via een gecontroleerde, veilige cutover; geen voortijdige breuk voor bestaande gebruikers.

## Aanvullende tweede onafhankelijke Claude Code-review — 5 november 2026, 21:09 CET

De gebruiker vroeg expliciet om Claude te betrekken en te onderzoeken of de oorspronkelijke importopzet uitvoerbaar is met het geleverde bronpakket. Claude Code 2.1.317 (Sonnet) is werkelijk gestart in read-only modus (`Read`, `Glob`, `Grep`, geen schrijf-, shell- of edit-tools). Uitvoercode 0. De volledige, ongefilterde review bleef in de private ontwikkelmap; geen gelicentieerde mediabestanden werden geopend of naar Git gekopieerd. De conclusies zijn vervolgens onafhankelijk getoetst met een lokale read-only bronmetadata-audit.

### Direct geverifieerd tegen het originele 582-rijige bronmetadata-schema

- Metadata JSON: **582 records / 582 unieke `slug`-waarden** met 18 bronvelden. De bijbehorende CSV heeft dezelfde 18 kolomnamen.
- Voor **582/582** is `videoFile` exact `<slug>.mp4` en staat het originele MP4-bestand daadwerkelijk in het bronpakket.
- Voor **582/582** is `posterFile` exact `posters/<slug>.png`; de voorbereide geoptimaliseerde WebP (`<slug>.webp`) is voor **582/582** aanwezig.
- **582/582** bron-slugs matchen één-op-één met de Golden V2-inventaris. Alle **226** bestaande `exercise-catalog.json`-ID's matchen de Golden V2-catalogus-ID en exacte provider-slug; de overige **356** catalogus-ID's zijn ongepubliceerd.
- Geen lege verplichte bronvelden gevonden voor `slug`, `name`, `primaryMuscles`, `equipment`, `movementPattern`, `difficulty`, `durationSeconds`, `instructions`, `commonMistakes`, `shortDescription`, `longDescription`, `posterFile`, `videoFile`. `movementPattern` is een lijst in **582/582** rijen; dus NIET zomaar als enkelvoudige categorietekst importeren.

### Canonieke veldmapping — noodzakelijke conversies expliciet

| MoveKit bronvelden | Reeds bestaande TK-bestemming / behandeling | Gate |
|---|---|---|
| `slug` | `source.provider_id`, vaste `catalog_id` uit Golden V2 | Exacte identiteit en unieke bron-slug |
| `name`, `aliases` | `identity.name`, optionele extra zoekalias via bestaande ECS-index | Geen naam als primaire sleutel |
| `primaryMuscles`, `secondaryMuscles` | `identity.primary`, `identity.secondary` na gecontroleerde vertaling naar TK spier-taxonomie | Geen nieuwe spiernamen zonder mapping |
| `equipment`, `difficulty` | `identity.equipment`, `identity.difficulty` via TK woordenlijst | Verifieer toegestane enums |
| `movementPattern` (lijst) | Voorgestelde `identity.pattern`, `family`, `type`, `category`, `goals` | **Niet 1-op-1**; per-item review. Geen impliciete kracht-/herstelregels |
| `durationSeconds` | Video-asset / manifest duur als beschrijvende mediadata | Niet als trainingsduur of voorschrift interpreteren |
| `instructions`, `commonMistakes` | `intelligence.cues`, `intelligence.mistakes` of gecontroleerde bestaande UI-detailtekst | Taal-/veiligheidsreview voor publicatie |
| `shortDescription`, `longDescription` | Bestaande detail-UI of aparte presentatie-overlay, niet blind in ECS plaatsen zonder contract | Omzetting/toetsing van UI-contract |
| `tags`, `benefits`, `useCases` | Alleen getoetste tags/tekstcontext; géén automatisch sportdoel of trainingsregel | Redactionele en evidence-check |
| `videoFile`, `posterFile` | Private storage-objectpad + geoptimaliseerde WebP, `VIDEO_MANIFEST` en `ExerciseAssetProvider` | Golden SHA-256, bytes, MIME, gebruikersgrant en private media broker |

### Eindoordeel en oorspronkelijke volgorde

**Bronpakket geschikt**, oorspronkelijke provider-onafhankelijke architectuur geschikt. De bestaande 226-record ECS, picker, Builder, Execution/Logging mogen niet gedupliceerd of opnieuw geïmplementeerd worden. Een algemene GUI om globale oefeningen met media te reviewen/publiceren bestond nog niet. Het ontbrekende stuk is een herhaalbare **offline generator per expliciet goedgekeurde catalogus-ID**, plus afgescheiden autorisatie-/release-pipeline. De oorspronkelijke `MOVEKIT_MEDIA_SCALE_GATE_2026-10-01.md` schrijft de veilige cutover van de bestaande 226 openbare media voor **vóór** Batch 002. Het inmiddels grotere pakket (historisch 412, nieuw 582) vraagt aparte controle van licentiescope en overdracht, ondanks dat alle 582 metadata- en bestandspaden technisch overeenkomen.

**TK-000227:** alleen de voor de eigenaar zichtbare NL-tekst, taxonomie en pilot-UX zijn op 5 november goedgekeurd; geen grants of productieactivering. De overige **355** moeten ongepubliceerd blijven. Advies: in de komende bouwfase één generieke versieerbare import/preview-generator maken (geen nieuwe catalogus), metadata-validation/regressies herhaalbaar maken, parallel reeds bestaande 226-public-media-cutover voorbereiden en pas na beveiligings- en Android-acceptatie itemgewijs vrijgeven.
