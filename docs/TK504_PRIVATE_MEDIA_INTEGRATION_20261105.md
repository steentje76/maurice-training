# TK504 Private media integration — 5 November 2026

Status: engineering-only, NOT production release. This worktree starts from main aa43741.

- Production storage: exercise-media 582 private video objects (2,047,785,201 bytes); exercise-posters 582 private WebP objects (9,634,714 bytes).
- Paths match movekit/v2/video/<slug>.mp4 and movekit/v2/poster-optimized/<slug>.webp (all 582 each).
- No direct authenticated Storage SELECT policies for the licensed exercise buckets; existing policies refer only to avatars.
- No `public.movekit_media_grants` table; no deployed Supabase Edge Functions in this project as observed on 5 November.
- Existing ExerciseCatalogService publishes 226 Movekit exercises; 356 further identities remain NOT_PUBLISHED and untrainable.
- Legacy Netlify video endpoint is still publicly accessible and Range-capable. Do not disable before private playback has real device proof.
- The signed media transport and client code exists in Draft PR #595, not on canonical main. Do not build a second catalog.

## Hard release gates

No client-generated signed media URL; require authenticated server-side identity, audited entitlement, published catalog identity and media release manifest, protected bucket, approved license delivery interpretation, zero public fallback after private cutover, Android/Web Range/expiry validation, and no permanent tokenized URL caching. Never show the 356 pending catalog items before their separate human review and approval. Main and production must remain unchanged until independently verified.

Existing baseline: `node core/fMediaUrlResolver.test.js`: 29 PASS, 0 FAIL.

## Beveiligde afspeelroute in deze ontwikkelbranch

- Het bestaande ExerciseCatalogService/ExerciseAssetProvider/MediaUrlResolver-contract blijft gehandhaafd. De nieuwe route is expliciet UIT: TK504_PRIVATE_MEDIA_RELEASE = false.
- index.html is voorbereid voor bibliotheekdetail, traininguitleg en de bestaande workout-mediaweergave; autorisatie gebeurt uitsluitend server-side via een bestaande broker uit PR #595.
- core/tk504ProtectedPlayback.js accepteert uitsluitend een expliciet gepubliceerd canoniek TK-catalog-ID, niet een gelijknamige of persoonlijke Supabase-exercise.
- Logout of accountwissel invalidateert beveiligde media-aanvragen en verwijdert beveiligde video-src's. Geen opslag van signed URLs of eigen caching.
- In toekomstige private mode geven ExerciseAssetProvider.resolve(id,video) en ExerciseAssetProvider.videos(id)[].url geen openbare videolink terug; offline downloaden vanuit de oude mediacache wordt niet aangeboden.
- Bij mislukte autorisatie wordt niet teruggevallen op een openbare Movekit MP4. Bij afspeelfouten wordt hoogstens éénmaal een nieuw tijdelijk ticket gevraagd.

## Gecontroleerde tests

- fMediaUrlResolver.test.js: 29/29 PASS
- movekitV2Broker.test.js: 28 PASS, release by default OFF
- movekitV2ClientServerContract.test.js: 14 PASS
- movekitV2ExerciseMediaBridge.test.js: 29 PASS
- movekitV2ExistingAssetProviderContract.test.js: 16 PASS
- tk504ProtectedPlayback.test.js: 17 PASS
- tk504PrivateUiWiring.test.js: 18 PASS
- fPrescriptionConsistency.test.js: 66 PASS
- tk504ExistingLibraryConnection.test.cjs: 226 catalog-ID's en embedded JS syntax gecontroleerd

## Voor productie absoluut noodzakelijk

De database mist public.movekit_media_grants. De server-broker is nog niet uitgerold; release- en licentiegoedkeuring ontbreken. Een gecontroleerde table-migratie, gecontroleerde gebruikersrechten, echte SHA-/Range-tests, schriftelijke licentietoets, Android/WebView-apparaatproeven, service-worker-cachecutover en verwijderen van openbare Netlify MP4s zijn nog nodig. De 356 nieuwe oefeningen zijn niet gepubliceerd en vereisen menselijke review. De problemen #577/#579/#582/#584/#586 en gezamenlijke UX-beoordeling komen vóór nieuwe APK. Geen van deze gating-acties is in deze branch geactiveerd.

## Extra gecontroleerde serverentitlement-migratie

De bestaande migratie `supabase/migrations/20261103155325_tk504_movekit_v2_media_grants.sql` uit de Draft #595 is geïsoleerd hergebruikt. De tabel is standaard inactief (`active=false`), beschermt grants met RLS, trekt rechten van anonieme en ingelogde browserrollen in, en verleent alleen SELECT aan de service_role voor server-side toetsing. De unieke (user_id,scope)-sleutel en gecontroleerde referentie verhinderen stilzwijgende user-grants. De migratie is **niet** in productie of op een testdatabase uitgevoerd. Zonder aparte goedgekeurde grant-activatie is afspelen onmogelijk. `core/tk504MediaGrantSchema.test.js`: 11/11 statische controles groen; echte migratietest/rollback op geïsoleerde database blijft open.

## Aanvullende verificatie — 5 november 2026

- Read-only Supabase Storage join: 582 unieke videoslugs én 582 unieke poster-slugs, 0 missende paren, 0 ongeldige lege bestanden. Objectmetadata is niet hetzelfde als cryptografische byte-verificatie.
- GoldenCrosswalk test: 226 bestaande catalog-id en leverancier-id koppelingen exact behouden, 356 nieuwe kandidaten niet gepubliceerd; bij 210/226 verschilt de videobestandsgrootte tussen V2 en de V1 bron. Verifieer de V2 SHA256 tegen echte Storage-bytes vóór vrijgave.
- Guided Workout (GWUI.media) was een vierde speler die de oude openbare videolink direct gebruikte. De private route is nu toegevoegd aan dezelfde bestaande spelerketen. V1 blijft ongewijzigd zolang de codegate uit is. Extra gerichte UI tests testen beide modes.
- De migratie is uitgevoerd in een tijdelijke lokale Docker PostgreSQL 16 met synthetische gebruiker en rollen: default inactive, RLS, geen clienttoegang, service-only SELECT, unieke grants, revocation check. GEEN wijziging aan productie.
- Netlify PR #602 deploy-preview: HTTP 503 V2_NOT_RELEASED voor signing request, zoals bedoeld. Bestaande openbare MP4 Range smoke: HTTP 206, bytes 0–1023, length 1024.
- Vrijgave blijft uit. Op de geïsoleerde main baseline waren met dezelfde lokaal geïnstalleerde dependencies 16 gates rood; de nieuwe branch mag ze niet kwijtschelden.
