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
