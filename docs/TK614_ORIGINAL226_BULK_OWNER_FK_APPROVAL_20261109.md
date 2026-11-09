# TK614 / #603 — Bulk owner-goedkeuring FK-identiteit, originele 226 (9 nov 2026)

**Besluit:** `TK614-OWNER-REVIEW226-20261109-BULK01`
**Status:** `OWNER_EXPLICIT_BULK_FK_IDENTITY_APPROVAL`
**Scope:** `TK-000001..TK-000226` → FK-doel `TKC-000001..TKC-000226`, `FK_IDENTITY_BINDING_ONLY`
**Vastgelegd in:** GitHub issue #614, comment `6733264842`
(<https://github.com/steentje76/maurice-training/issues/614#issuecomment-6733264842>)
**Machineleesbaar:** `docs/generated/TK614_ORIGINAL226_OWNER_FK_APPROVAL_20261109.json` (sidecar)
**Release-record:** `docs/generated/MOVEKIT_V2_RELEASE_GATES.json` → alleen het NIEUWE veld `original_226_fk_identity_release`

Dit document voert niets uit in productie. Er zijn geen DB-writes, geen netwerk, geen push of merge, geen deploy, geen APK, geen media-grants, geen sleutels en geen handtekeningen.

## 1. Het besluit (letterlijk)

Vraag aan de owner, samengevat. De gezaghebbende tekst staat in comment 6733264842:

> Keur je alle 226 oorspronkelijke MoveKit-oefeningen in het reviewpakket goed voor uitsluitend de beveiligde trainingsregistratie, zonder nieuwe mediarechten, en bevestig je dat de MoveKit-licentie bij dezelfde persoon of juridische entiteit hoort die Trainingskompas exploiteert?

Antwoord van de owner, **letterlijk en byte-exact** vastgelegd in `owner_statement_verbatim`:

> `Ja bevestig ik, ik ben de eigenaar van tk en de koper van de movekit`

## 2. Wat dit besluit WEL en NIET is

| | |
|---|---|
| ✅ | Collectieve owner-goedkeuring van alle 226 (10 batches: 9 × 25 + 1) voor **uitsluitend** FK-identiteit / trainingsregistratie |
| ✅ | Owner-verklaring dat de MoveKit-koper dezelfde persoon of entiteit is die Trainingskompas exploiteert |
| ❌ | **Geen** bevestiging dat elk item afzonderlijk is gelezen (`per_item_reading_confirmed: false`) |
| ❌ | **Geen** onafhankelijk geverifieerde licentie of aankoop (`license_independently_verified: false`, `license_holder_match: OWNER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED`) |
| ❌ | **Geen** nieuwe mediarechten, media-grants of media-release (`media_grants: 0`, `media_access: NOT_RELEASED`) |
| ❌ | **Geen** wijziging van `released_batches` (dat is MEDIA-scope en blijft exact 15 batches 227..582, 1164 entries) |
| ❌ | **Geen** ondertekende cryptografische ACTIVATE. `TRUSTED_OWNER_KEY_SHA256 = []` blijft leeg |
| ❌ | **Geen** DB-activatie. Live stage blijft `TK614-OWNER-STAGE-20261108-CHAT02`: 226 bindingen `active=false`, `reviewed_at=NULL`, 356 actief |
| ❌ | Geen overdracht van de 356-goedkeuring `TK504-20261105-OWNER-BATCHES-01-15` |

Het reviewpakket `docs/generated/TK614_ORIGINAL226_OWNER_REVIEW_PACKET_20261109.json` blijft **ongewijzigd** `PENDING_OWNER_REVIEW`. De owner-goedkeuring is een **apart** record (sidecar + FK-only release-record) en wordt niet in het pakket teruggeschreven.

## 3. Bewijs (echte digests, geen placeholders)

| Bewijs | Waarde | Bron |
|---|---|---|
| Publieke exercise-catalog | `b278938498ffd0d713a4ad23184bfdd037fab65fd2ce5c9e0f7662a6e96bf4af` | `exercise-catalog.json` (gepind) |
| Reviewpakket totaal | `bb7badb23244ad47659b8170e9f154aa7bbcfc7fd69c1c1c4b42b2a65bd98487` | review packet `totals.all_sha256` |
| `source_evidence_sha256` | `494ed563dd063369aca56e2f8af3381b6502c23ef02b779915ff9036041243b0` | catalog + packet, gebonden aan het besluit |
| `owner_review_evidence_sha256` | `b55041cfdbfb87356183baad6b4b3cdf0c34ac011f4491f126dfee659e424b73` | besluit, status, scope, comment-URL, letterlijke verklaring, packet |
| LICENSE.txt (lokaal, privé) sha256 | `35f84f23691b4e11521decb541a7738d6ba12a8fd18eb9b4046db97dd69fb0ed` | **alleen** de hash. Inhoud nooit gelezen naar Git, logs of output |
| `license_evidence_sha256` | `6d92f6774cfa2e30ec7c367ae8b8e5bece9a4f7d6a17510e292f29303e468b19` | licentiebestand-hash + `OWNER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED` |

Batch-evidence. Elke digest bindt besluit + owner-review-evidence + batchnummer + bereik + aantal + `batch_sha256` uit het pakket:

| Batch | Bereik | n | `batch_sha256` (pakket) | `evidence_sha256` |
|---|---|---|---|---|
| 1 | TK-000001..TK-000025 | 25 | `d5f42ae1…2e51b1` | `102f8a39432ab7f5beb1f6b521064a8de6d7142a9f15e3aa77ee9d3de0cf4a48` |
| 2 | TK-000026..TK-000050 | 25 | `dadec463…9997ce` | `22547890b0850d3c16d731cb1ae01bb5930f6cfb9fd77fa4904cbc6741f608c9` |
| 3 | TK-000051..TK-000075 | 25 | `70534ae2…67b598` | `a933b9fcc99012f030d51bccf278cec8b237941be54cba75633747cdc4226c24` |
| 4 | TK-000076..TK-000100 | 25 | `2f6491a1…ab4b64` | `6aebf38229cc8cf78a99ea6c1082ea919d16470ac112bce8011e8cd2baa57ae0` |
| 5 | TK-000101..TK-000125 | 25 | `3a318f38…687a14` | `db82e1b9473ae4a601b4d145b09cdb5d7caf2c3d5fde7f40a0202f86b2a94ebb` |
| 6 | TK-000126..TK-000150 | 25 | `d027197a…474d38` | `531359930215d16972d99aa3fc2222b6433f59591e60f8ba5d13168b15a328fb` |
| 7 | TK-000151..TK-000175 | 25 | `065530d7…baaa88d` | `f72f2b8382ce172d439d78fd18e87c164341c0bb06c3c907806393e775e5e76d` |
| 8 | TK-000176..TK-000200 | 25 | `f5bbf824…f7792e1` | `42de1a07fc163c6ab8f2df637b958a4b49366ca984fd7dbce50733161692860d` |
| 9 | TK-000201..TK-000225 | 25 | `aea72156…e89778` | `ac7b6aa55e74c66238fb467b5d28ccf423ae85337d343de12df9c18431445c34` |
| 10 | TK-000226..TK-000226 | 1 | `436635dd…edb5590` | `565d6904ed44be869f6bc22d4929b175def066348f18595f195ee38c21dce5b9` |

### Canonieke hashing

`sha256` over UTF-8 bytes, lower-case hex, van de tekst:

```
HEADER\n
key=value\n   (één regel per veld, vaste volgorde, waarden zonder CR/LF, integers decimaal)
```

| Soort | HEADER | Velden (volgorde) |
|---|---|---|
| source | `tk614-original226-source-evidence/1.0` | decision_id, source_file, source_catalog_sha256, review_packet_schema, review_packet_all_sha256 |
| owner | `tk614-original226-owner-review-evidence/1.0` | decision_id, status, binding_kind, media_grants, issue_comment_url, owner_statement, review_packet_all_sha256 |
| license | `tk614-original226-license-evidence/1.0` | decision_id, license_file, license_file_sha256, license_holder_match |
| batch | `tk614-original226-batch-evidence/1.0` | decision_id, owner_review_evidence_sha256, batch, from, through, count, batch_sha256 |

Implementatie: `tools/tk614_original226_owner_decision.cjs`. Alle 13 digests zijn **onafhankelijk** van Node berekend (PowerShell `Get-FileHash` over de exacte LF-tekst). `core/tk614Original226OwnerFkApproval.test.js` pint ze letterlijk, zodat een afwijking in de Node-implementatie de test laat falen.

## 4. Scheiding MEDIA-scope en FK-identiteit (security-fix)

**Fout (tot en met PR #616 / `7045fbb`):** `original226Released()` eiste dat `released_batches` het bereik `001..226` dekte, plus een owner-record. `released_batches` is echter de **MEDIA**-releasescope (15 ledger-batches 227..582, `core/tk504BatchReleaseLedger.js releasedScope()`). Een 001..226-range toevoegen zou het mediamodel breken of onbedoeld toegang kunnen geven.

**Nu:**
- `mediaGateProblems(gates)`: root `status === RELEASE_APPROVED`, `released_batches` **exact 15**, geen batch onder 227, `entries` exact 1164, en `releasedScope()` levert batch 15 / 356 nieuw / 582 totaal. Een toegevoegde of vervangen media-batch 001..226 wordt **afgewezen** (`MEDIA_RELEASED_BATCHES_NOT_EXACTLY_15`, `MEDIA_RELEASE_SCOPE_INCLUDES_ORIGINAL_226_OR_INVALID`, `MEDIA_LEDGER_356_INTEGRITY_FAILED`).
- `original226ReleaseRecordProblems(gates)`: het aparte record `original_226_fk_identity_release` moet (a) structureel geldig zijn (`releaseRecordProblems()`), (b) een sidecar hebben die exact gelijk is aan het deterministisch herberekende besluit (`decisionProblems()`), en (c) exact gelijk zijn aan `buildReleaseRecord(sidecar)` (`RELEASE_RECORD_NOT_BOUND_TO_OWNER_DECISION`). Een willekeurige of generieke 64-hex digest is daardoor geen bewijs meer.
- Het gatesbestand kreeg **één** nieuw top-level veld. `diff`: 133 regels erbij, 1 regel gewijzigd (`]` → `],`). `released_batches` (15) en `entries` (1164) zijn byte-identiek.
- De Docker-smoke gebruikt nu de echte 15/1164-mediascope plus een FK-record gebonden aan een **synthetisch** besluit (wegwerp-licentiehash). Dat besluit wordt alleen geaccepteerd via het library-only argument `trust.ownerDecision`, dat vanaf de CLI onbereikbaar is.

## 5. Licentie-hash binden

`node tools/tk614_original226_owner_decision.cjs --bind-license <ABSOLUUT_PAD>/LICENSE.txt` doet het volgende:
- leest het bestand **alleen** om de sha256 te berekenen. Inhoud wordt niet gedecodeerd, gelogd of gekopieerd;
- weigert paden binnen de repository en andere bestandsnamen;
- herschrijft de sidecar en vervangt in het gatesbestand **precies één regel** (`"license_evidence_sha256": null`).

In deze worktree is de binding uitgevoerd **buiten** de Claude-sessie (die mocht het privébestand niet lezen). Het resultaat is in de sessie gecontroleerd: `license_evidence_sha256` = `6d92f677…` is met PowerShell onafhankelijk herberekend uit de vastgelegde bestandshash en klopt.

## 6. Resterende blockers (geen productie-actuatie)

1. **`ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY`**: `TRUSTED_OWNER_KEY_SHA256 = []`. Fase B (ACTIVATE) is onrenderbaar zonder een apart gereviewde commit die een owner-Ed25519-sleutel pint, plus een **ondertekende** ACTIVATE-approval met geaccepteerde gates (source, owner, review, license, rollback, ab_acceptance) en een verse live fingerprint. Niets daarvan is gemaakt.
2. De licentie-eigendom is **owner-verklaring**, niet onafhankelijk geverifieerd.
3. Er is **geen** per-item-review bevestigd. Het pakket blijft `PENDING_OWNER_REVIEW`.
4. MoveKit-media voor 001..226 blijft `NOT_RELEASED`. Er zijn geen media-grants.
5. Productie blijft in de staged toestand van `TK614-OWNER-STAGE-20261108-CHAT02` (226 inactief/ongereviewd, 356 actief). Een DBA-actie is pas mogelijk na punt 1.

Verwachte status in de repo: `activation_blockers = ["ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY"]`, `original_226_fk_release_problems = []`.

## 7. Verificatie in deze sessie

- **Niet uitgevoerd in de Claude-sessie:** `node`, `npm ci`, `npm test` (release-gate), `cap sync` en de Docker postgres:17-smoke. De sessie-permissies stonden geen procesuitvoering toe. De tests (`core/tk614Original226OwnerFkApproval.test.js` nieuw; `core/tk614Original226AdminRelease.test.js` en `core/tk614Original226ReviewPacket.test.js` aangepast) zijn dus **niet** door Claude gedraaid en moeten door de reviewer worden gedraaid vóór commit of push.
- **Wel geverifieerd:** alle 13 evidence-digests en de catalog-hash met PowerShell `Get-FileHash`. De gates-diff is puur additief (133/1). De lengte van de owner-evidence-tekst is 470 bytes (LF).
- Geen gegenereerde Android-assets aangeraakt.
