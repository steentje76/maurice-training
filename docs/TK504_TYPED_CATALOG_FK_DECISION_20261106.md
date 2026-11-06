# TK504 / #603 — getypeerde catalogusidentiteit en veilige sessie-FK (ontwikkelcontract)

**Status:** DRAFT / VOLLEDIGE RELEASE GEBLOKKEERD. 6 november 2026. Geen productionele database, APK, media-grants, persoonsgegevens of historische sessies gewijzigd.

## 1. Oorzaak en geverifieerde uitgangspunten

De enige bron voor oefenidentiteit is de bestaande `ExerciseCatalogService`. Bestaande MoveKit-items `TK-000001..226` en de 356 goedgekeurde maar ongepubliceerde kandidaten `TK-000227..582` moeten in dezelfde bestaande Picker → Preview → Execution → Logging → History-keten passen, zonder nieuwe UX, tweede catalogus of tweede writer.

Read-only schemaonderzoek op het actieve Trainingskompas-project (6 november 2026):
- `public.exercises.id` = **TEXT PRIMARY KEY**, `sessions.exercise_id` verwijst daar via een **FOREIGN KEY** naar.
- `exercises`: 7 globale en 16 persoonlijke `TK-######`-IDs in de bestaande 226; **geen** in de nieuwe 356. Dit zijn *vormovereenkomsten*, geen gecertificeerde MoveKit-identiteiten.
- Er bestaan 103 sessierijen waarvan `exercise_id` op `TK-######` lijkt; hun ware historische provenance is niet vast te stellen uit het ID alleen. **Niet migreren, verwijderen, hernoemen of automatisch herclassificeren**.
- Gereserveerde toekomstige `TKC-######`-IDs: **0** in `public.exercises` bij de read-only preflight.
- De 582 video's en 582 posters zijn in private Supabase-buckets aanwezig; `public.movekit_media_grants` is niet ingericht. Deze feiten autoriseren niets automatisch.

## 2. Beslissing: gescheiden catalogus- en FK-identiteit

De gebruiker selecteert een *expliciet getypeerde canonieke oefening*:
`{_catalog:true, id:'TK-000038', catalog_id:'TK-000038'}` uit de bestaande ECS, met gecontroleerde MoveKit `source.provider/provider_id`.

De domeinidentiteit blijft `TK-000038`; een vooruitgerichte **globaal gereserveerde** FK-placeholder voor nieuwe logs is `TKC-000038`. `TKC` betekent uitsluitend een technische catalogus-FK, **geen** nieuwe oefening, oefeningsnaam, gebruikersrecht of licentie. De deterministische transformatie gebeurt alleen na een onafhankelijk geverifieerd en gepubliceerd FK-bindingcontract. De databank moet de mapping duurzaam vastleggen en valideren; de clientmodule is géén authenticatie- of autorisatiebron.

De databankbeheerder provisiont die `TKC`-placeholderrijen **eenmalig global** met `created_by = null`, een gescheiden mapping op `catalog_id`, FK constraints en RLS. Normale gebruikers mogen de aliasruimte niet aanmaken, aanpassen of verwijderen. Voor eigen oefeningen, oude `TK`-historie en legacy IDs blijft de bestaande weg behouden. Geen acceptatie op basis van naam, slug, tekstvorm, gelijkende spiergroep of vrije `exercises.id`.

De bestaande app negeert zulke toekomstige *globale* FK-placeholders bij `ensureExercisesLoaded`, zodat ze **geen extra oefeningen in de huidige UX** worden. Persoonlijke rows — ook met gelijkende IDs — blijven behouden.

## 3. Huidige code (staging)

- `core/tk504TypedCatalogFk.js`: pure versioneerbare typed mapping met deny-by-default wanneer een item niet gepubliceerd is, de selectie geen expliciete catalogusprovenance heeft of een echte binding niet als geverifieerd beschikbaar is. Returnt een nieuw sessieobject; muteert bestaande `sessionLog`, `sets_detail`, account of instantie-ID niet.
- `index.html`: filtert **uitsluitend** `scope='global'` met gereserveerd `TKC-[0-9]{6}` in de gedefinieerde reeks 1..582 uit de normale `exercises`-collectie. De bestaande bibliotheek/picker/layout blijft ongewijzigd; lege technische placeholders veroorzaken geen onbedoelde standaarddata-seed.
- `core/tk504TypedCatalogFk.test.js`: 52 asserts, 582 unieke aliases, persoonlijke ID-botsingen, multi-user, oude en nieuwe sessies, ontbrekende authority en ongewijzigde idempotente rijvelden.
- `core/tk504TypedCatalogFkOriginalPicker.test.js`: echte huidige ECS en daadwerkelijke `catalogToPickerEx`; 226/226 expliciete catalogusselecties/logreferenties/historie blijven consistent, persoonlijke `TK`-rows worden niet ongemerkt Movekit.
- `core/tk504GlobalFkVisibility.test.js`: 582 technische globale placeholders onzichtbaar, 16 synthetische persoonlijke `TK`-IDs blijven zichtbaar; geen automatische seed op uitsluitend placeholders.
- `tools/tk504-typed-fk-isolated-smoke.sql`: volledige synthetische PostgreSQL 17-transactie met 582 aliases, globale FK, twee rollen met RLS, gedeelde catalogusverwijzing voor A/B, afgeschermde persoonlijke oefeningen, ongewijzigde legacyhistorie en deny-by-default release. Eindigt in **ROLLBACK**. Op 6 november 2026 uitgevoerd op tijdelijke `--network none` Docker PostgreSQL-container, PASS; container daarna verwijderd. **NIET uitvoeren op live Supabase.**

## 4. Nog expliciet open — essentieel voor daadwerkelijke 582-vrijgave

1. Ontwerp, security-audit en autoriseer een **echte**, getypte database-bindingtabel en alleen-servermatige globale aliasprovisioning met RLS, uniekheid, migratie, audit en herstelplan. De SQL-smoke is bewust géén productiemigratie.
2. Sluit de app-output aan **op de ene bestaande `writeSessionRow`** op basis van een **expliciet brongetypeerde selectie** uit programmavoorbeeld of vrije oefening. Controleer dat training-instance snapshots, crash/herstart, offline FIFO en retries die selectie onveranderd behouden. Nooit zomaar `TK`-achtige legacy IDs als catalogus behandelen. Totdat dit kan is de module **niet runtime actief**.
3. Historische weergave van nieuwe `TKC`-sessies moet de serververifieerde binding gebruiken om de oorspronkelijke `TK`-catalogusinhoud te tonen. **Bestaande 103 `TK`-vormige sessies blijven ongewijzigd**.
4. Volledige live-geïsoleerde acceptatie met twee accounts, 16 reeds aanwezige persoonlijk-scoped vormbotsingen, meerdere offline writes, accountwisseling, idempotente retry, nieuwe sessies, trainingsoverzicht en rollback; nooit proefmatig schrijven in de productieaccounts.
5. Media server: `MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED` moet uit blijven totdat 1–4 echt geslaagd zijn. 226 bestaande private-media-cutover kan apart. Alle overige licentie-/entitlement-/poster-/video-/Range-/Androidgates blijven gelden.

**Geen vrijgavebesluit.** Deze code mag pas actief aan de Execution/Logging-keten worden verbonden wanneer de onderliggende database en releasevoorwaarden onafhankelijk zijn bewezen. Het gebruik van een client-side `verifiedBinding` callback is uitsluitend een aanvullende readiness-check, **geen servermatige machtiging**. De code is voorbereid om later veilig aangesloten te worden, maar lost #603 nog niet volledig op.

## 5. 6 november — expliciete catalogusprovenance door bestaande trainingsketen (staged)

De oorspronkelijke Builder was een informatieverliespunt: `custom_training_exercises` bewaart `exercise_id`/voorschrift, maar geen getypeerde bron. Een ID dat alleen op `TK-######` lijkt mag niet automatisch een MoveKit-selectie worden. Nieuwe additieve code in `index.html` slaat daarom **uitsluitend bij daadwerkelijke cataloguskeuzes** de controleerbare bronclaim `{kind:'movekit-catalog-v1',catalog_id,provider_id}` op:

- Builder-generator selecteert een werkelijk ExerciseCatalogService-object; replace/swap of de bestaande Library → Builder-actie leggen die bron bij de gekozen planregel vast. Bestaande gewone doelen, sets, herhalingen en volgorde blijven ongewijzigd.
- `WB.saveWorkout` voegt alleen voor expliciet gemarkeerde planregels `metadata.tk504_catalog_refs` toe aan de reeds bestaande `custom_trainings.metadata` JSON, **zonder schema-aanpassing**. `planItemsFromTargets` herstelt die markering na heropenen; de vertrouwde ECS controleert de provider-ID opnieuw. Ontbrekende of gemanipuleerde metadata blijft ongeldig.
- De bestaande `getTrainingDefinition` werkt zowel lokale als via Supabase geladen custom trainingen af; Training Instance-snapshots slaan alleen gevalideerde bronclaims per item op. Preview bewaart die claims door aanpassingen; het kiezen van een andere oefening via de bestaande catalogus-alternatieven maakt een nieuwe bronclaim en kopieert de oude **niet**.
- `buildResolvedExecutionItems` en `buildGuidedWorkoutPlan` nemen de referentie in-memory mee; `GW.start` bewaart deze additief in het reeds bestaande hervatbare `tk_gw_active`. **De centrale sessieschrijver en historische sessies zijn niet omgezet**. De bestaande uitvoerings- en herstelcode blijft verder hetzelfde.
- Ongetypeerde persoonlijke oefeningen of oudere programmarijen met alleen `TK`-achtige IDs worden **niet automatisch geclassificeerd als MoveKit**; de bestaande gebruikersinterface blijft intact. Deze metadata is slechts een **bronclaim**, geen bewijs van serverbinding, gebruikersrecht of volledige licentievrijgave.
- Nieuwe gerichte regressie `core/tk504CatalogProvenanceFlow.test.js`: oorspronkelijke 226 ECS-items, fraude/spoof/ontbrekende bron, ongepubliceerde 356, grenzen 1..582, Builder-sidecar, lokale én server-definities, snapshots, Preview-swap, normale en Guided-items.

**Volgende harde release-gate:** de getypeerde bron moet na (her)start en offline FIFO met servermatig geverifieerde `TKC`-binding bij de **enige bestaande `writeSessionRow`** aankomen. Dat mag pas na geautoriseerde echte binding- en RLS-migratie. Oudere `TK`-vormige sessies krijgen geen retroactieve MoveKit-identiteit; historie vereist expliciete resolutie van `TKC` naar canonieke bron.

## 6 november — previewkeuze uitsluitend brongetypeerd na daadwerkelijk aanbieden

Bij samenvoegen met herstel-PR #587 is een belangrijk onderscheid aangetroffen: de alternatieven-UI gebruikt `WB.altList` (canonieke catalogus), maar de herstel-PR voegt ook een **handmatige keuze uit de oorspronkelijke centrale picker** toe. Daardoor zou een extra `previewApplySwap(id)`-callback bij een persoonlijke `TK-`-vormige oefening ten onrechte een MoveKit-claim kunnen afleiden uit alleen het ID.

De bronclaim wordt daarom **niet meer uit de replacement-ID afgeleid**: `previewRenderSwapPicker` registreert alleen de daadwerkelijk voor die originele oefening aangeboden ECS-alternatieven en hun gecontroleerde bron, `previewApplySwap` consumeert die tijdelijke context één keer en wist die daarna. Bij een directe ID-call zonder aangeboden catalogusobject blijft de bron **onbekend**. De regressie verifieert zowel de negatieve ID-only-case als de juiste echte alternatiefkeuze.

De afzonderlijke lokale integratie met PR #587 moet expliciet de nieuwe handmatige picker-callback op het **geselecteerde oefeningobject** laten controleren (niet op het ID). Dit blijft een integratievoorwaarde voor de gezamenlijke release; géén nieuwe UX of extra catalogus.

## 6 november — echte schema-voorbereiding en oorspronkelijke Supabase-RLS-vorm

Een tweede controle op het **actuele schema via uitsluitend read-only queries** bevestigt:
- `public.exercises(id TEXT PRIMARY KEY)` met vereiste `name`, `category`, `type`, bestaande `scope`-waarden `personal/gym/global`, `created_by` en `user_id`.
- `public.sessions.exercise_id` verwijst via FK naar `public.exercises.id`, terwijl `sessions` bestaande owner-RLS via `auth.uid()` gebruikt.
- Bestaande `exercises_insert_v333` laat persoonlijke inserts op `scope` toe en `exercises_update/delete_v333` kennen beheerdersruimte. Deze regels kunnen niet gebruikt worden als onafhankelijke bescherming van de **nieuwe gereserveerde aliasruimte**.
- Geen app-permissies of bestaande policies zijn gewijzigd, noch is er een rij uit de echte productieaccount gewijzigd.

**Nieuwe volledig UITGESCHAKELDE migratie:**
`supabase/migrations/20261106110000_tk504_typed_catalog_fk_stage.sql`.

Deze creëert een server-eigen typed bindingregistry, exacte `TK-######` → `TKC-######` FK-check, unieke provideridentiteit, standaard `active=false`, RLS en een uitsluitend servermatige SELECT-grant. Nauw begrensde triggers beschermen gereserveerde globale FK-rows tegen bestaande app-policy-inschrijvingen/wijzigingen, blokkeren via PostgreSQL zelf nieuwe `TKC`-sessies zonder een actief, onafhankelijk beoordeeld bindingrecord, en houden historische sessies met ongewijzigde FK bewerkbaar na eventuele deactivering. Het systeem moet niet alleen op `current_user` maar ook op `auth.uid()` en JWT-roleclaims vertrouwen, omdat ook een postgres-owned `SECURITY DEFINER` binnen een onbetrouwbare gebruikersrequest kan draaien.

Een kleine read-only PostgREST-RPC `tk504_resolve_catalog_fk(catalog_id,provider_id)` levert alleen aan een ingelogde gebruiker een op server gecontroleerde, actieve en exact bij de leverancier passende alias. Dat is **geen** mediarecht, geen publicatiebesluit en geen tweede writer. De browser kan de bindingregistry zelf nooit lezen of bewerken.

**Uitgevoerde beveiligingstest:**
`tools/tk504-typed-fk-security-smoke.sql` in tijdelijke Docker PostgreSQL 17, `--network none` (alle rijen/rollen/providers synthetisch):
- 582 unieke globale placeholders, 582 getypeerde providers en nul actieve rechten bij aanmaak.
- Bestaande persoonlijke `TK-`-vormige oefening en historie ongewijzigd.
- Onafhankelijke RLS-sessies voor twee gebruikers op één actieve, *synthetisch goedgekeurde* gedeelde FK; verkeerde provider of 581 ongepubliceerde bindings geven geen geldige RPC-uitkomst.
- Persoonlijke rol kan geen gereserveerde alias toevoegen, aanpassen of wissen en geen sessie namens de andere gebruiker loggen; service role kan de registry alleen lezen.
- Een opzettelijk onveilige `SECURITY DEFINER`-functie kan onder ingelogde gebruiker of service-role JWT-claim niet alsnog de alias wijzigen.
- Na intrekken van de synthetische binding weigert de database nieuwe trainingssessies op die alias, zonder bestaande sessies te verwijderen; direct `TK-`-historie blijft onaangeroerd.
- De proef eindigde met **ROLLBACK**; de complete container is verwijderd. `core/tk504TypedFkMigrationSecurity.test.js` bewaakt 38 statische contractsafety-controles.

**Nog vereist:** onafhankelijke SQL/securitybeoordeling, formele toestemming voor toepassing van deze migratie, verifieerbaar backup/herstelpunt, uitsluitend-admin manifestseeding met de originele 582 bronidentiteiten (NIET uit codeprefixen genereren), echte Supabase-staging-RLS-test en integratie met de bestaande enige sessieschrijver en historie. Geen enkel actueel gebruikersaccount heeft via deze code toegang gekregen tot de 356 nieuwe video's.

## 6 november — staged runtime-bridge naar de ENIGE bestaande sessieschrijver

`index.html` bevat nu een **hard uitgeschakelde** `TK504_TYPED_FK_SESSION_RELEASE=false`. Er is geen ingeschakelde featureflag, externe schakelaar of productiedeployment.

Na een latere formele vrijgave kan de bestaande `tk504_catalog_ref` op Preview/Execution/Guided via de bestaande geauthenticeerde `sbRpc` de gecontroleerde `tk504_resolve_catalog_fk` aanroepen. De client verlangt exact dezelfde provideridentiteit, exact `TKC-<zes cijfers>`, een onveranderde ingelogde accountidentiteit en een bestaande canonieke ECS-bron. Een ontbrekend, afgewezen of mismatched serverantwoord is **geen personal FK-shadow-fallback**. De definitieve database trigger weigert eveneens nieuwe `TKC`-sessies zonder geactiveerde en beoordeelde binding.

**Eén schrijver blijft behouden:** `writeSessionRow(row,opts)` past alleen bij een geverifieerde `opts.tk504_binding` de FK naar een nieuwe session-row kopie aan, en roept daarna precies de al bestaande `sbPostQ('sessions',...)` aan. Gewone oefeningen/legacy en de huidige 226 gebruiken exact de bestaande rijen en wachtrij; een normale of begeleide training krijgt geen tweede writer, geen client-gespoofde `user_id`, geen vermenging van trainingswaarden en geen nieuwe UI. De bestaande begeleide retry-ID en de normale `_sessionRowPersistedAt` blijven intact.

De uitvoering is voorlopig **alleen online** mogelijk met de stageflag aan: zonder verbindingsbevestiging weigert de nieuwe getypeerde route de FK-wijziging en houdt de bestaande recovery/draft-flow de niet-opgeslagen training vast. **Offline FIFO met getypeerde serverbindings blijft daarom expliciet een releaseblokkade**; niet als al opgelost rapporteren. Losse oefening, starten buiten Preview, hergebruik van oudere programmadefinities en nieuwe `TKC`-historieweergave vereisen nog end-to-end bewijs; ongetypeerde gelijkende `TK`-IDs zijn principieel geen MoveKit-bewijs.

`core/tk504TypedFkSessionWriteGate.test.js` gebruikt de échte applicatiefuncties in geïsoleerde VM met gecontroleerde bron, geauthenticeerde RPC, onveranderde opslagvelden, echte centrale writer, online/accountwissel/foutpaden en de harde stageflag. 27 gerichte asserts geslaagd; daarnaast zijn de actuele sessie-FK- en ergometertests groen. Dit valideert **voorbereid gedrag**, niet de werkelijke Android- of Supabase-productieactivatie.

## 6 november — historische identiteit blijft behouden na intrekken van media/release

Een tweede read-only RPC in dezelfde **niet-toegepaste** migratie is toegevoegd: `tk504_historical_catalog_id(p_exercise_id)`. Het is expres niet hetzelfde als de actieve FK-schrijfreferentie-RPC. De database geeft uitsluitend het canonieke `TK-######` terug wanneer **de actuele ingelogde gebruiker daadwerkelijk een eigen sessie met die `TKC-######`-FK bezit**. Er wordt geen provider-ID, media-URL, grant, trainingsnotitie, andere gebruikersinformatie of licentiecontent teruggegeven.

Deze historische resolver blijft geldig na het intrekken van een mapping; een oud opgeslagen resultaat mag dus niet verdwijnen omdat nieuwe logging of mediatoegang is geblokkeerd. De database blijft nieuwe sessies op een ingetrokken typed FK weigeren. Het uiterlijk van bestaande historieschermen is niet gewijzigd: daadwerkelijke asynchrone data-aansluiting in History/Recent vereist nog een gecontroleerde implementatie en regressies.

De PostgreSQL 17 Docker-test controleert naast de bestaande 582-opslag-, sessie- en RLS-poorten nu ook: historische lookup door user A en B naar hun eigen gedeelde FK, weigering van een oefening zonder eigen sessie, weigering van deze RPC voor service-role, en leesbaarheid van oude sessies na deactivering. **PASS; volledige transactie ROLLBACK; container verwijderd.** De statische migration-securitytest bewaakt inmiddels **43** contractsafety-punten.

## 6 november — historieprojectie aangesloten, achter dezelfde uitgeschakelde release-gate

`index.html` voegt `tk504HistoricalSourceForSession(exerciseId)` toe aan het bestaande `loadHistory`-pad. De functie retourneert uitsluitend een weergavenaam uit de bestaande canonieke catalogus nadat de nieuwe, uitsluitend voor de eigenaar beschikbare read-only RPC `tk504_historical_catalog_id` de oorspronkelijke `TK-`-identiteit bevestigt. De actuele account, het antwoord, de catalogusbron en de exacte `TKC-######`-vorm moeten kloppen.

De geschiedenis blijft qua bediening en lay-out **ongewijzigd**: alleen de bestaande naamregel wordt verrijkt; sessie-ID/FK, editor, sets, berekeningen, datum, PB en de bestaande cardio-context blijven intact. Onbevestigde offline wachtrij-items, personal records met vergelijkbare ID's, onbevoegde gebruikers en ontbrekende providerresultaten krijgen **geen gefantaseerde catalogusnaam**. De weergave wordt via de bestaande `escHtml` ontsmet. De historische naam is geen toestemming voor videomedia.

Het hele pad blijft uit zolang `TK504_TYPED_FK_SESSION_RELEASE=false` staat. De gerichte `core/tk504HistoryOwnerProjection.test.js` draait op de originele applicatiefuncties, valideert eigenaar/afwijzing/verlopen account/oude historie en controleert dat het scherm niet wordt herontworpen. De echte productiedatabase is niet veranderd.

## 6 november — private 582-source preflight en provisioning-manifest (read-only)

Nieuw: `tools/tk504_prepare_private_fk_manifest.cjs` (plus `core/tk504PrivateFkManifestPreflight.test.js`). Deze controle is de voorbereiding voor het **servermatig provisionen** van precies 582 getypeerde globale FK-koppelingen. Hij leest de privé supplier-stage vanaf een *expliciet lokaal pad buiten Git* en vergelijkt alle 582 canonieke IDs/leveranciers-IDs één-op-één met de golden video-inventaris, posterregister en de bestaande 226-published baseline. De oorspronkelijke golden-inventaris is **niet geordend op catalogus-ID**, dus de controle gebruikt keyed lookups in plaats van een onterechte array-index-afhankelijkheid.

Alle 356 nieuwe items moeten in het privébronbestand nog `NOT_PUBLISHED`, `media_entitlement_status:NOT_VERIFIED` en `confirmed_by_authenticated_reviewer:false` zijn. Het apart vastgelegde owner-batchbesluit keurt **inhoud** goed, niet media- of productierelease. De bronstage blijft `PRIVATE_REVIEW_NOT_RELEASED`, met `_approved_for_import=0`. Het plan draagt daarom `DRY_RUN_NO_RELEASE_AUTHORITY`, `eligible_for_live_seed:0`, `active:false` en `media_grants_created:0`. Geen enkel planrecord kan dus gelden als releasegoedkeuring.

De optionele output (alleen op expliciet `--out ABSOLUTE_PRIVATE_DEST` en alleen buiten repository) bevat slechts catalogus- en technische identiteiten, nooit oefenomschrijvingen, gewichten, privé geschiedenis, URL-tokens of mediabestanden. Het commando schrijft standaard niets. Eventuele output wordt uitsluitend nieuw (`wx`) aangemaakt en mag niet worden overschreven. De stdout bevat uitsluitend tellingen en hashfingerprints, **geen individuele leverancier-slugs**. De hashfingerprints verbinden de mapping aan het exact gecontroleerde privébronbestand en de drie bronregisters, zonder CRLF/LF-afhankelijke pins.

Dit is geen database- of mediascript en bevat opzettelijk **geen SQL INSERT, RLS-wijziging, Supabase-API, media signing of runtimefeatureflag**. `node core/tk504PrivateFkManifestPreflight.test.js` heeft 48 synthetische contractcontroles (inclusief ontbrekende/extra/gewijzigde bronnen, niet-geautoriseerde vrijgave, bestandsuitvoer en reproduceerbare hashes). Het privébestand en eventuele afgeleide echte 582-identiteiten blijven op een afzonderlijke geautoriseerde ontwikkelcomputer en worden **nooit toegevoegd aan GitHub**.

De werkelijke lokale privé 582-source moet nog via dit commando getoetst worden; daarna is nog afzonderlijke security/provisioning-, account-, media- en Android-acceptatie verplicht. Het gereedkomen van een manifest mag de `356` **niet** automatisch publiceerbaar maken.

## 6 november — PostgreSQL proef met exacte 582 privébronidentiteiten (geen productie-actie)

`tools/tk504_render_private_fk_docker_preview.cjs` verwerkt uitsluitend het privé `DRY_RUN_NO_RELEASE_AUTHORITY`-manifest van de vorige stap. Hij controleert opnieuw 582 unieke, exact geordende technische `TKC-`-IDs, 582 bronleveranciers, de fingerprint, **nul actieve mappings** en de uitsluitend inhoudelijke ownergoedkeuring. Het resultaat is een **privé SQL-proefbestand buiten de repository**, nooit een migratie of automatische seed; de exclusieve uitvoer kan niet stilzwijgend een bestaand bestand overschrijven.

De SQL-proef begint met `BEGIN`, weigert bestaande alias- of bindingbotsingen, probeert de 582 huidige FK-hulptabellenrijen en exact gekoppelde provider-IDs in een afgeschermde kopie van de database te registreren, controleert hun aantal en uitgeschakelde status, en eindigt verplicht met `ROLLBACK`. Er bestaat **geen COMMIT-pad**, geen mediatabel-/licentierechten-aanpassing en geen update van trainingssessies of persoonlijke oefeningen.

`tools/tk504_private_fk_docker_harness.sql` zet op een tijdelijke PostgreSQL-17-container met `--network none` uitsluitend een synthetische `TK-`-vormige persoonlijke oefening en een bestaande sessie klaar, laadt de nog **niet toegepaste** draft-schemamigratie, laat daarna de exacte 582-bron-preview uitvoeren en verifieert ná rollback dat de 582 `TKC`-alias-/bindingsrijen weer ontbreken terwijl persoonlijke oefening en historie intact zijn. Deze test is niet geschikt om op Supabase te starten; handmatige productieprovisioning vereist een afzonderlijk goedgekeurd script en gecontroleerde backup/rollback.

`core/tk504PrivateFkDockerPreview.test.js` bevat 31 contractasserties voor alle 582 rijen, strikte brondata, botsingen, fingerprints en verplichte rollback. De daadwerkelijke fysieke Dockerproef met de **privé** 582-provideridentiteiten moet nog op de geautoriseerde lokale ontwikkelcomputer worden uitgevoerd. De 356 zijn hiermee niet gepubliceerd.

### Uitvoeringsbewijs — werkelijke privé 582-inventaris, 6 november 2026

De **werkelijke** 582-bronvoorbereiding is uitgevoerd op de tweede geautoriseerde ontwikkelcomputer tegen de bestaande privébronstage. De broncheck slaagde voor 226 oorspronkelijke items en 356 nieuwe ongepubliceerde items met **582/582 consistente catalogus-ID's, provider-ID's en mediaverwijzingen**. Het uitsluitend privé opgeslagen source-provisioning-manifest heeft digest `706803c1e5a9485eb190da04f11d607d4e29a5f29777da4c77d0a1f99750e0ec` en expliciete status `DRY_RUN_NO_RELEASE_AUTHORITY`. Individuele licentiecontent en provider-slugs zijn niet naar GitHub overgebracht.

Het daaruit gegenereerde uitsluitend privé bewaarde SQL-proefbestand (SHA-256 `77f2439e0005f541feb07fd10843b3cbd9a8ae2fea80c70fb0c77a316ef92756`) is vervolgens met de echte 582 provideridentiteiten in een tijdelijke **`--network none` PostgreSQL 17 Docker-container** uitgevoerd. Resultaat: `INSERT 0 582` globale technische FK-placeholders, `INSERT 0 582` inactieve, exacte bindings, `TK504_PRIVATE_DOCKER_PROOF_PASS_582_INACTIVE`, verplichte `ROLLBACK`, en `TK504_DOCKER_582_REAL_SOURCE_FK_DRY_RUN_ROLLBACK_VERIFIED`. De controle na rollback bewees **0 achtergebleven technische aliases/bindings** en behoud van de synthetische persoonlijke `TK-`-oefening en historische sessie. PostgreSQL-exitcode **0**, container verwijderd.

De eerste PowerShell-uitvoering stopte vóór de volledige SQL-proef omdat een normale PostgreSQL `NOTICE` als PowerShell-fout werd behandeld; na correctie van de lokale testaanroep is de volledige proef aantoonbaar PASS. Dit was geen databasebeveiligingsfout en beide tijdelijke containers zijn verwijderd. **Geen SQL of persoonsgegevens in productie gewijzigd.**

De uitkomst bewijst alleen dat de echte 582 identiteiten aan dit schema en aan de getypeerde FK-constraints voldoen. Ze bewijst **niet** dat een echte Supabase-migratie, provisioning, mediagrant, apppublicatie, offline-herstart, twee-account-integratie of Android-test al is uitgevoerd. Geen releasegate is geopend; `TK504_TYPED_FK_SESSION_RELEASE=false` blijft leidend.

## 6 november — doorbraak naar de bestaande 582-oefeningenapp (nieuwe echte productcode, flags uit)

Na de 582-ID-/FK-/Dockerfundering is de daadwerkelijke ontbrekende **productinterface** aangesloten; niet opnieuw een losse technische demo:
- `core/tk504PublishedCatalogRuntime.js` valideert een via de server vrijgegeven set van exact **356 nieuwe** canonieke `TK-000227..582`-records, zonder bestaande 226 te herschrijven, zonder public media-assets of nieuwe databron. De oorspronkelijke `ExerciseCatalogService` wordt via zijn bestaande `rebuildIndex()` bijgewerkt, de bestaande oefeningkiezer via `invalidateExPickerPool()`; dezelfde Library, Workout Builder, Preview en Guided blijven hun bestaande ECS gebruiken. Ownerwissel/uitloggen trekt de aanvullingen uit geheugen en de zoekindex en invalideert kortgeldige mediaverwijzingen.
- `index.html` bevat een geauthenticeerde `tk504RefreshPublishedCatalog()` op de normale loginflow en koppelt deze via de bestaande `tkApiUrl` aan de Netlify route. **Hard disabled:** `TK504_PUBLISHED_CATALOG_RELEASE=false`, en daarnaast zijn `TK504_TYPED_FK_SESSION_RELEASE=false` en `TK504_PRIVATE_MEDIA_RELEASE=false`. Daarom doet de huidige app standaard **geen API-call**, verandert geen catalogus, UX of historie en toont nog de bestaande 226.
- `netlify/functions/exercise-catalog-v2.js` vraagt een actieve echte gebruiker en MoveKit V2-grant op, controleert dat de centrale 582-release-inventaris en zowel 356 posters/videos afzonderlijk zijn vrijgegeven, én dat elke nieuwe catalogusrij uitsluitend als reviewed/published in een server-only metadataregister staat met een **actieve exact-match `TKC` sessie-FK**. Zonder elk van deze voorwaarden volgt **503/403**, nooit een inhoudelijke fallback. Het originele video's-signing-mechanisme wordt hergebruikt voor accountrechten; geen privématerialen in de GitHub-payload.
- `supabase/migrations/20261106161000_tk504_published_catalog_stage.sql` is uitsluitend een **niet-toegepaste** databasevoorbereiding voor de 356 private metadatarecords, server-only read RLS, default `staged`, en admin-only controle van bron/provider/FK/review. De client krijgt nooit deze tabel rechtstreeks en mag geen records of rechten publiceren.
- `_videoBlock` gebruikt bij een vrijgegeven nieuwe MoveKit-oefening dezelfde beveiligde afspeelknop, ook als er opzettelijk geen openbare lokale video/poster bestaat. Dit is een interne codewijziging **binnen bestaande oefeningschermen**, geen UX-herontwerp.
- De privé V2 media-bridge snapshot de catalogus bij constructie; na in-memory uitbreiding/invalidering wordt de bridge voor het actuele account opnieuw opgebouwd. Anders zouden nieuwe catalogus-ID's in de bibliotheek verschijnen maar zouden videosignatures voor 356 ontbreken.
- Een echte synthetische ECS-test voegt 356 nieuwe catalogusitems toe aan de echte oorspronkelijke 226-service en vindt ze via de **bestaande zoekfunctie**. De aparte Netlify-brokertest onderzoekt 356 correcte en incomplete bron-/FK-/publicatie-/grant-/mediacondities. Een volledig geïsoleerde Docker PostgreSQL 17-proef van de **tweede, eveneens niet-toegepaste** publicatiemigratie bevestigt de strikt beperkte admin/RLS-releasevoorwaarden en voltooit met `ROLLBACK`.
- `sw.js` heeft een passende cachebump en precachet de nieuwe coremodule; de offline/static guard blijft groen.

**Wat nog WERKELIJK ontbreekt vóór gebruik van 582:** niet méér identiteitsproeven, maar (1) gecontroleerde inhoudelijke review/verificatie van de 356 specifieke, afzonderlijk als `PRIVATE_DRAFT_NOT_REVIEWED_NOT_PUBLISHED` gemarkeerde NL-overlaysource (niet verwarren met de eerdere batch-contentgoedkeuring), (2) expliciete security/backup- en productie-/acceptatiegoedkeuring van de databaseprovisioning en de 356 private metadatarecords, (3) daadwerkelijke beoordeling van 356 video's/posters, mobiele account-/offline-acceptatie en een gezamenlijke vervanging van de bestaande publiek toegankelijke V1-mediacache zonder gelekte bronnen. Until then blijft elk releaseflag hard uit en is niets in Supabase geschreven. Er is geen APK gemaakt.
