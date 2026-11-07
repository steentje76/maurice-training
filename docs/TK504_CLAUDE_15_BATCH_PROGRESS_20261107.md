# TK504 — 15 MoveKit-pakketten: voortgang (alleen veilige aggregaten)

Datum: 7 november 2026. Refs #504, #603, Draft #607.
Branch: `feat/tk504-claude-15-batches-20261107`, start `f2d5aaa`.
Geen ruwe media, posters, licentietekst, private metadata of secrets in dit
document of in Git.

## Wat er werkelijk veranderd is in de bestaande TK-app

Eén canonieke pakketledger (`core/tk504BatchReleaseLedger.js`) stuurt nu het
bestaande pad aan. Er is geen tweede bibliotheek, picker, logger of
mediaprovider bijgekomen.

| Bestaand onderdeel | Wijziging |
|---|---|
| `netlify/functions/exercise-catalog-v2.js` | Het vrijgegeven bereik moet exact de pakketten 1..N zijn, met de goedgekeurde fingerprints van de eigenaar; elke gepubliceerde rij moet de goedkeuringsstempel van het eigen pakket dragen; de respons noemt het pakket |
| `netlify/functions/exercise-media-v2-url.js` | ID's 227–582 worden alleen getekend binnen een volledig vrijgegeven pakketbereik; een losse entry, een gat of een onvolledig pakket geeft 404 |
| `core/tk504PublishedCatalogRuntime.js` (ECS-bridge) | Weigert een respons waarvan pakket, `through` of fingerprint niet bij `new_count` past; meldt het geïnstalleerde pakket; bij wissen wordt het pakket gereset |
| `tools/tk504_prepare_private_catalog_content.py` | Stempelt `approved_batch` en de fingerprint van het pakket in de private publicatiemetadata |
| `tools/tk504-build-release-candidate.cjs` | Maakt per pakket een release-candidate uit de inventory-digests in Git; status `RELEASE_CANDIDATE_NOT_APPROVED`; weigert het centrale releasedocument te overschrijven |
| `index.html`, `sw.js` | Ledger geladen vóór de runtime; precache; cache bumped naar v470278 |

Het centrale releasedocument `MOVEKIT_V2_RELEASE_GATES.json` staat nog op
`BLOCKED_NOT_REVIEWED` met 0 entries. `TK504_PUBLISHED_CATALOG_RELEASE` en
`TK504_TYPED_FK_SESSION_RELEASE` staan op `false`.

## Pakketstatus

Integratietest = `core/tk504Batch15Integration.test.js` (synthetische backend).
Real-auth = `node tools/tk603-real-auth-captured-schema.cjs --packages`
(run 2026-11-07T17:02Z, 4065 checks PASS).

| Pakket | Bereik | Cumulatief | Integratietest | Real-auth lokaal | Status |
|---|---|---|---|---|---|
| 01 | TK-000227..TK-000251 | 251 | 117 PASS | 295 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 02 | TK-000252..TK-000276 | 276 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 03 | TK-000277..TK-000301 | 301 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 04 | TK-000302..TK-000326 | 326 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 05 | TK-000327..TK-000351 | 351 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 06 | TK-000352..TK-000376 | 376 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 07 | TK-000377..TK-000401 | 401 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 08 | TK-000402..TK-000426 | 426 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 09 | TK-000427..TK-000451 | 451 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 10 | TK-000452..TK-000476 | 476 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 11 | TK-000477..TK-000501 | 501 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 12 | TK-000502..TK-000526 | 526 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 13 | TK-000527..TK-000551 | 551 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 14 | TK-000552..TK-000576 | 576 | 118 PASS | 279 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |
| 15 | TK-000577..TK-000582 | 582 | 59 PASS | 70 PASS | VERIFIED_LOCAL / BLOCKED_RELEASE |

VERIFIED_LOCAL betekent hier: echte catalogusfunctie, echte ECS uit index.html,
echte geëxtraheerde writer en typed FK per ID tegen echte lokale Auth/REST/PG,
met synthetische metadata. Het betekent **niet** dat er signed Storage,
Range-afspelen, een private bronchecksum, browser- of Android-playback is
aangetoond. Geen pakket is LIVE_VERIFIED; productie blijft BLOCKED_RELEASE.

Eerste real-auth poging: pakketten 01–12 PASS, 13 FAIL omdat de lokale JWT's na
een uur verliepen (GoTrue `JWT_EXP=3600`). Alleen in `--packages` modus is de
tokenlevensduur van de harness verlengd; de herhaalde run is volledig PASS.

## Bewijs (lokaal)

- `node core/tk504Batch15Integration.test.js`: per pakket worden de echte
  catalogusfunctie, de echte mediabroker (tekencontract), de echte ECS en de
  Nederlandse zoekfunctie en de picker-provenance uit index.html doorlopen,
  plus checksums, revoke, accountwissel en geweigerde varianten (gat, duplicaat,
  vreemde fingerprint, gemanipuleerde checksum, onvolledig pakket, rij met
  stempel van een ander pakket). De backend is synthetisch.
- `node tools/tk504-package-suite.cjs`: 18 gerichte bestaande suites.
- `node tools/tk603-real-auth-captured-schema.cjs --packages`: echte lokale
  Auth/PostgREST/PostgreSQL en de echte writer-probe per nieuw ID.

## Niet aangetoond (eerlijke grenzen)

- Echte Supabase Storage: signed GET, HTTP 206/Range/seek en `Cache-Control`
  van video/poster. Er is geen lokale Storage-image en er is geen toegang tot
  private media.
- Een private bronchecksum per pakket tegen `C:\Movikit`: die map is in deze
  sessie niet toegankelijk. Checksums zijn alleen gecontroleerd tegen de
  inventory-digests in Git.
- Echte browser-playback in de app, Android/WebView, productie-RLS/grants,
  licentiehouder- en eigenaar-releasebesluit.


## PR #608 — onafhankelijke bron-, browser- en cloudcontrole (7 november 2026)

**Nieuwe directe verificatie, na Claude-sessie; eerdere synthetische tests blijven afzonderlijk aangeduid.**

- Originele prive bestanden onder C:\Movikit: alle 15 cumulatieve pakketten (356 nieuwe IDs) exact gekoppeld aan de eigenaar-goedgekeurde Nederlandse zichtbare velden: **15/15 contentfingerprints**. Golden V2 MP4 en WebP poster per nieuwe ID met werkelijke byte/SHA-256 controle: **712/712 PASS**. Niets gepubliceerd of gekopieerd naar Git. Privaat bewijs: .tk-private-review/TK504-PR608-PRIVATE-SOURCE-ALL15-20261107.json, script en bronbestanden buiten deze repo.
- Werkelijke lokale Chromium-browser met originele TK-appshell en **private review-overlay**, echte 25 video-binaries voor TK-000227..251: **25/25** videometadata geladen, seek naar midden, play en voortgang; 25 unieke kaarten/zoekfunctie; 25 goedgekeurde labels. CDP exitcode **0**. Herhaalbaar via bestaande tools/tk504_batch25_cdp_qa.mjs met optionele --all-approved mode (zonder privemedia in Git). Dit bewijst **geen** live signed-Storage/Android appafspeelbaarheid.
- Bestaande prive loopback preview (127.0.0.1) met werkelijke MP4 bytes: **25/25** HTTP Range-requests geven **206** en correcte Content-Range; foutbereik HTTP **416**; Cache-Control private/no-store. Dit is lokale Python HTTP-server, **niet Supabase signed URL**.
- Supabase projectcontrole uitsluitend **read-only**: exercise-media **582** en exercise-posters **582** objects, public=false voor beide; objectmetadata max-age=60 voor beide. Geen nieuwe productiegrants of schema's: gevraagde release-/grantregistries zijn nog niet live. Publieke/anonieme GET + Range op de eerste V2-video/poster geeft **HTTP 400**, dus geen anonieme raw-mediatoegang aangetoond.
- npm.cmd run cap:copy na webbuild: **PASS**, OCR-assets aanwezig in Android assets, geen APK. Daarna volledige npm.cmd test: **501 uitgevoerd, 0 geskipte, 0 gefaald**, exitcode **0**. De eerdere 1 rode OCR-fixture is daarmee verholpen; de afzonderlijke licentie/security/releaseacceptatie is NIET weggevallen.
- Officiele Supabase Storage-documentatie: een afgegeven signed URL kan niet individueel worden ingetrokken en edge-cache TTL en tokentijd zijn onafhankelijke parameters. De V2-signing TTL is 60 seconden en opslagcache maximaal 60 seconden volgens metadata. **Niet claimen dat logout/revocation een reeds gedeelde getekende URL onmiddellijk ongeldig maakt.** Beoordeling van deze resttoegang is harde security-/license-check voor release.
- Primaire codeverandering in deze QA-ronde: optionele --all-approved real-Chromium acceptatiemodus voor alle 25; bestaande default test (1+24/3 samples) behouden. Nooit private media, private credentials of signed URLs loggen in PR/CI.

**Release blijft geblokkeerd:** geen echte uitgegeven cloud-signed URL + Range/Cache test voor een bevoegde eindgebruiker, geen fysieke Android/Capacitor browseracceptatie met accountwissel, geen uitrol van benodigde getypeerde migraties/grants/RLS, geen afgeronde licentiehouders- en publieke V1-cutovercontrole, geen afzonderlijke releasebeslissing. Beide catalogus/typed-FK releaseflags blijven false; behoud 226 productieoefeningen en bestaande auteurschap/historie. Groene algemene npm-gate betekent niet dat #504/#603 gesloten zijn.


## PR #608 — signed-Storage acceptatiepoort (aanvullend, 7 november 2026)

De server-side beveiligde afspeelacceptatie is als afzonderlijke, fail-closed QA-tool voorbereid:
- `tools/tk504-signed-storage-acceptance.cjs` valideert de exacte canonieke catalogus-ID, de ondertekende Supabase Storage URL met één tijdelijk token, bucket/pad-identiteit, HTTP 206, Content-Range, MIME, video-/posterbytes op begin/midden/einde en browsercachebeleid. Hij maakt **zelf geen** grants, signed URL, upload, wijziging of publicatie.
- `core/tk504SignedStorageAcceptance.test.js`: 21 synthetische security/Range/byte-integriteitsasserties PASS; opgenomen in de gerichte 19-suite `tools/tk504-package-suite.cjs`. Automatische webbuild en 502 volledige controles: 0 overgeslagen, 0 gefaald. Ongeldige herkomst, public-path, verkeerde bucket, duplicate token, vreemde media, afwijkende bytes of incorrect Range/MIME worden afgewezen.
- Voor daadwerkelijke cloudtoets zijn een **reeds geautoriseerde, kort geldige** video- én postersigned URL plus bronfolders nodig in alleen het beveiligde procesenvironment: `TK504_PROBE_CATALOG_ID`, `TK504_SIGNED_VIDEO_URL`, `TK504_SIGNED_POSTER_URL`, `TK504_PRIVATE_VIDEO_DIR`, `TK504_PRIVATE_POSTER_DIR`. Nooit als CLI-argument, issuecommentaar of log. Als URLs ontbreken volgt exitcode 2 met `BLOCKED_SIGNED_URL_NOT_SUPPLIED`. Het huidige resultaat is **BLOCKED**, dus geen cloudplaybackclaim.
- Autorisatie voor signed URL is **niet** gelijk aan louter eigendom van bestanden. #504/#603 serverentitlements en accountwisseling moeten apart worden gevalideerd. Het gebruik van een signed URL vormt geen bewijs van directe intrekking na logout.

Nieuwe uitsluitend read-only productieopslagcontrole van project `mhfxhzkdmgkaplicdszg`: exact 582 video-objecten en 582 poster-objecten; alle 1.164 nonempty en correcte MIME. Over het gehele serverregister `name|bytes|metadata.eTag` na verwijderen van eTag-aanhalingstekens gaf Postgres opnieuw dezelfde manifest-MD5 als de eerdere private overdracht: video `f47e1c875e0703325fa845e48f4c8ce2`, posters `410c96f8a864a099ef0b15c3c418ba6f`. **Dit is metadata/ETag-transportbewijs, geen volledige externe SHA-256-herdownload.** Public=false voor beide buckets, `cacheControl=max-age=60`. Er zijn geen live grants of cataloguspublicaties uitgevoerd.

**Vrijgavebesluit: NO-GO.** Geen echte cloud-signed HTTP 206/seek met gebruikers-JWT, fysieke Android-player, complete #603-migratie en licentie-/cache-revocatiebesluit. PR blijft draft; geen productiewijzigingen of APK.
