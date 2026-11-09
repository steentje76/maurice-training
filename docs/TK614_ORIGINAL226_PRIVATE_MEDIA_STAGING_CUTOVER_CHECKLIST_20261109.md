# TK614 — oorspronkelijke 226 MoveKit-media: staging en veilige privé-cutover

**Datum:** 9 november 2026
**Status:** `STAGED_ONLY_NOT_RELEASED` — uitsluitend voorbereide code en metadata. **Geen eigenaarshandtekening voor media, geen productievrijgave en geen APK.**

## Vastgestelde werkelijkheid

Trainingskompas gebruikt voor alle **582** dezelfde canonieke provideridentiteiten. De echte privéopslag bevat **582 MP4-video's** in `exercise-media` en **582 WebP-posters** in `exercise-posters`. Beide buckets hebben `public=false`; de huidige Storage-RLS-policies verlenen gewone gebruikers uitsluitend toegang tot eigen avatars, niet rechtstreeks tot MoveKit-bestanden.

Een onafhankelijke read-only databasevergelijking van ieder pad en iedere objectgrootte met de gepinde Golden V2- en posterinventaris leverde **582/582 video's en 582/582 posters passend, 0 afwijkingen**. Dit is geen volledige SHA-256-hash van de opgeslagen inhoud.

**Belangrijke nuance:** `docs/generated/MOVEKIT_V2_RELEASE_GATES.json` bevat in zijn bestaande `entries` al **1.164 mediabeschrijvingen: 452 voor 001–226 én 712 voor 227–582**. Deze entries hebben `reviewed` en `upload_verified`-markeringen. De **15 formeel gereleasete `released_batches`** gelden uitsluitend voor 227–582. De aanwezigheid van 452 beschrijvingen is **niet** hetzelfde als een afzonderlijke, door de eigenaar ondertekende privémediavrijgave voor de oorspronkelijke 226. De aparte eigenaarvrijgave voor FK-identiteit zegt juist `media_grants=0`, `media_access=NOT_RELEASED`.

In Supabase staan **0** media-cataloguspublicaties voor 001–226, tegenover **356** gepubliceerde catalogusidentiteiten voor 227–582. De oorspronkelijke 226 FK-bindings zijn staged en inactief; bestaande trainingshistorie is niet veranderd.

## Gemaakt in deze ontwikkelbranch

- `tools/tk614_original226_private_media_staging.cjs`: deterministische broncontrole tegen de 226 gepinde `exercise-catalog.json`-identiteiten, de Golden V2-video's en de WebP-posterregistratie. Bouwt één metadata-only manifest, precies **452** records met pad, SHA-256-verwachting, byte-lengte en `STAGED_ONLY_NOT_RELEASED`. Geen media, URL's of secrets in dit bestand. Controleert ontbrekende/dubbele/verwisselde provideridentiteit, paden en SHA's.
- `docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json`: exact die **452** onuitgegeven beschrijvingen; **780.852.020** verwachte videobytes en **3.879.362** verwachte posterbytes. Het document autoriseert *niets*; ook na opname in code niet.
- `netlify/functions/exercise-media-v2-url.js`: expliciete **hard-block** op `TK-000001..TK-000226`: `404 MEDIA_NOT_APPROVED` nog vóór authenticatie, grant lookup en signing. Een gemanipuleerd releasebestand of aangeboden testoptie kan dit niet omzeilen. De reeds vrijgegeven 356 behouden hun normale private-mediafunctie.
- `core/tk614Original226MediaParity.test.js`: toets van alle **452 originele media-assets**, bestaande released 356, afwijkende provider, twee synthetische gebruikers, owner-key/recordchecks, tampering, manifest en hard-block.
- `core/movekitV2Broker.test.js` en `core/tk504MediaRenewalBoundary.test.js`: de bestaande positieve signing/TTL-tests gebruiken nu een *formeel gereleaset* item `TK-000227` in plaats van de uitdrukkelijk niet-vrijgegeven `TK-000001`. Zo blijven normale autorisatie-, TTL- en revocatietests betekenisvol.

**Ongewijzigd:** de 15 mediabatches, de bestaande **1.164** metadata-entries, het FK-only eigenaarbesluit, `index.html`, productie-Supabase, grants, Storage, gebruikerssessies en historische `TK-`-ID's. `MEDIA_CUTOVER_ENABLED=false` blijft een harde blokkade in de aparte mediareleasevalidator.

## Reproduceerbare controles

```bash
node tools/tk614_original226_private_media_staging.cjs --check
node core/tk614Original226MediaParity.test.js
node core/movekitV2Broker.test.js
node core/tk504MediaRenewalBoundary.test.js
node core/tk614Original226OwnerFkApproval.test.js
```

De eenmalige, offline generator is `node tools/tk614_original226_private_media_staging.cjs --write`. De controleroute `--check` herleidt de volledige JSON byte-exact opnieuw naar de drie bronnen en stopt bij afwijkingen.

**Tests gebruiken uitsluitend synthetische grant-/JWT-/signed-URL-gegevens**; dit bewijst geen echte video-afspeelbaarheid of productie-entitlement. De originelen moeten gesloten blijven wanneer de oude V1-medialevering later wordt uitgefaseerd.

## Open gates vóór private-media vrijgave voor 226

1. **Werkelijke Storage-blob SHA-256:** serverzijdig en buiten Git de opgeslagen 452 bestanden byte-exact vergelijken met het staged manifest. `storage.objects.metadata.size` en eTag zijn onvoldoende.
2. **Mediarechten en aparte eigenaarssignatuur:** controle van licentietermen en een afzonderlijke Ed25519 ondertekende **media**beslissing, cryptografisch gebonden aan scope, provider-ID's, manifesthash, accountrechten en bewijshashes. De huidige FK-handtekening geldt hier niet.
3. **Publicatie en entitlement:** expliciet gereviewde media-cataloguspublicaties en per-gebruiker servergrantcontroles; geen zelfservice/anonymous Storage-permissies. Laat de 452 reeds aanwezige metadata-entries intact; voeg 001–226 niet toe aan de 15 batchvrijgaven die 227–582 betreffen.
4. **Nieuwe gecontroleerde broker-activatie:** reviewde code die de echte media-owner-signatuur en actuele accountentitlement valideert in de beveiligde serverroute. Alleen daarna mag de huidige hard-block worden aangepast. Nooit uitsluitend een clientflag, omgevingvariabele of `reviewed=true` als toestemming.
5. **Web en Android:** echte gesigneerde URL, posterweergave, video seek/Range (`206` en `Content-Range`), expiratie binnen maximaal 60 seconden, revoke, accountwissel, logout en offline-gedrag controleren.
6. **Oude openbare MP4-route uitzetten:** pas als de nieuwe mediaketen op web én Android bewezen werkt. Controleer oude directe URL's en Cache Storage/service-worker caches op toegankelijkheid, bewaak rollback zonder mediarechten te verruimen.

**Operationele beslissing:** deze stap is *code-only* en maakt de bronverificatie reproduceerbaar. Geen nieuwe videoupload, publicatie, databasewrite of release is uitgevoerd.

## Aanvulling: server-side eligibility gate (TK504, fail-closed)

`tools/tk614_original226_media_eligibility.cjs` is de herbruikbare, pure poort die een toekomstige broker voor 001–226 moet bevragen. Hij toetst (A) catalogus-gekwalificeerde selectie zonder persoonlijke/custom botsing, (B) het gepinde 452-manifest (`all_sha256` 8492f2c1…) plus exacte pad/SHA/bytes-pariteit met de broker en ongewijzigde 356-releasegates, (C) een Ed25519-ondertekend **media**besluit via `mediaReleaseRecordProblems` (FK-only geweigerd), (D) een door de eigenaar ondertekende **attestatie** van het live byte-SHA-rapport (exact 452 pass, 0 fail, 0 unable, zelfde manifestdigest, gebonden aan `evidence.byte_level_download_sha256_proof`; ongetekende verifier-JSON wordt geweigerd), (E) publicatie + accountgebonden actieve grant, beide gebonden aan hetzelfde mediabesluit en een server-geverifieerde, niet-anonieme account, en (F) een letterlijke cutover-lock `enabled:false`.

Uitkomst in deze versie is **altijd** `authorized:false`, `DENY`, `404 MEDIA_NOT_APPROVED`; `eligible:true` is alleen een pure beoordeling, **geen autorisatie**. Geen env-variabele, inputveld of optie kan dit wijzigen; vrijgave vereist een aparte gereviewde codewijziging.

**Code-only staging, niet in runtime.** De poort wordt door géén productiefunctie geladen of aangeroepen. `netlify/functions/exercise-media-v2-url.js` importeert hem niet meer (geen `brokerShadow`, ~0,4 MB minder bundel en geen extra afhankelijkheden in de signeerfunctie); de 226-tak is een kale, onvoorwaardelijke `404 MEDIA_NOT_APPROVED` vóór auth, grant-lookup en signeren. Een vers Node-proces dat de functie laadt, laadt geen gate-, staging- of admin-module en geen 452-manifest (getest). De 356 zijn ongewijzigd. Dit verandert het runtimegedrag op `main` niet.

**Vertrouwensanker (gepind).** De enige sleutels voor zowel de Ed25519-controle van het mediabesluit (C) als de attestatie (D) zijn `OWNER_KEYS`: een bevroren, module-scoped kopie van de gereviewde `TRUSTED_OWNER_KEY_SHA256` uit `tk614_original226_admin_release.cjs`. Het vroegere inputveld `trustedKeys` is verwijderd: een payload met `trustedKeys` (of elk ander onbekend veld) geeft `ORIGINAL226_INPUT_UNEXPECTED_FIELD`; `attestationProblems()` negeert extra argumenten. Geen testmodus, toggle, `NODE_ENV`-tak, factory of sleuteloverride in de productiemodule. De herbruikbare validator `mediaReleaseRecordProblems` blijft ongewijzigd en krijgt alleen de gepinde constante.

**Tests.** `node core/tk614Original226MediaEligibility.test.js` (synthetisch, offline). De echte productiepoort weigert de synthetische sleutel (mediabesluit + attestatie niet vertrouwd). Alleen in de test wordt de ongewijzigde gatebron via `vm.runInThisContext` met een eigen `require` geladen die `admin_release` vervangt door een nep-module met een efemere testsleutel; die test-instantie valideert alle synthetische handtekeningen en attestatie: `eligible:true`, `authorized:false` (cutover-lock). 452/452 originelen geven 404 zonder uitgaande verzoeken; 356-signering ongewijzigd.

**Voorwaarden voor toekomstige integratie (aparte, gereviewde release; één canonieke broker, één data-writer):**
1. Accountidentiteit uitsluitend server-side via `identifyUser()` (Supabase `/auth/v1/user`), onafhankelijk van de bron geverifieerd; nooit een request-meegeleverde `account.verified`-claim doorgeven. De gate draait pas **na** auth, nooit pre-auth.
2. Publicatie-, grant- (met `media_decision_id`) en attestatiedata alleen uit server-only bronnen met betrouwbare herkomst (service-role, niet client-schrijfbaar), gebonden aan de server-geverifieerde gebruiker.
3. Eigenaarssleutel blijft een onveranderlijke server-side pin; wijziging alleen via gereviewde code.
4. Cutover-lock `false` → `true` alleen via aparte codewijziging met eigen review.

Open vóór gebruik: er bestaat nog geen server-side attestatie-, publicatie- of `media_decision_id`-grantbron; de broker-integratie zelf is nog niet gebouwd.
