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
