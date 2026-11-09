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
