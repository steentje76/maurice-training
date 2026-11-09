# TK614 / #603 — Fase B: owner-reviewpakket voor de 226 originele MoveKit-oefeningen

**Datum:** 9 november 2026
**Branch:** `fix/tk614-phase-b-review-20261109`, base `e78b9b327e676be55a83107dfc69f5f7fcfd691d` (DRAFT PR #616)
**Scope:** alleen `TK-000001..TK-000226` → FK-doel `TKC-000001..TKC-000226`. De 356 nieuwe (`TK-000227..582`), de 23 legacy-`TK-######`-rijen, sessies en media vallen buiten de scope.

> **Status: REVIEWPAKKET — `PENDING_OWNER_REVIEW` voor 226/226. Dit document keurt niets goed.**
> Fase B (ACTIVATE) is **niet** goedgekeurd door de eigenaar. De CLI blijft blokkeren met
> `ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES` en `ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY`.
> Er is geen sleutel gegenereerd of gepind, er is geen owner-signatuur, `MOVEKIT_V2_RELEASE_GATES.json` is ongewijzigd en er zijn
> geen database-, netwerk-, media- of deploy-acties uitgevoerd. "Ga door" na fase A is **geen** toestemming voor fase B.
>
> **Onafhankelijk door ChatGPT getest op de Windows-ontwikkelcomputer (9 november):** de brongebonden eigenaar-reviewgenerator heeft daadwerkelijk **226/226** entries en **10 batches** geproduceerd, na `--write` met `--check` exact gevalideerd. De nieuwe reviewpackettest **174/174 PASS**, de bijgewerkte admin release-tests **357/357 PASS**. De bestaande PostgreSQL 17-sandbox smoke met de nieuwe fail-closed reviewcontractcode **57/57 PASS**. De volledige releasegate volgt separaat; geen productieactivatie, geen owner-signatuur. Claude's eigen sessie kon omgevings-/toolbeperkingen niet zelf testen; deze getallen komen uitsluitend uit de onafhankelijke ChatGPT-uitvoering.

## 1. Uitgangssituatie (gerapporteerd, offline niet opnieuw geverifieerd)
Feiten van de owner-sessie van 8 november 2026, letterlijk vastgelegd in `STAGED_CONTRACT` van de generator:

| Feit | Waarde |
|---|---|
| Fase A-besluit | `TK614-OWNER-STAGE-20261108-CHAT02`, **COMMITTED in productie** |
| 226 globale FK-aliassen en bindingrijen | aanwezig, `active=false`, `reviewed_at=NULL` |
| Resolvebaar van de 226 | **0/226** |
| 356 nieuwe | actief en gereviewd, onaangetast |
| Post-stage registry-SHA | `bb0b9ee423fcf322fa0e9c854c9013ece34fb3068193b1febb12bdb89de1c927` |
| Audit-tabel en guard-triggers | in productie |
| Fase B | `NOT_APPROVED_BLOCKED` |

De generator labelt deze feiten als `reported_by_owner_session_20261108_not_reverified_offline`. Deze tool leest geen database.

## 2. Evidence-inventaris (drie aparte categorieën)

### (a) Bestaande licentieclaims en technische basis — aanwezig, maar geen FK-goedkeuring
| # | Bron in repo | Wat het aantoont | Wat het **niet** aantoont |
|---|---|---|---|
| a1 | `exercise-catalog.json` (sha256 LF `b2789384…6bf4af`, gepind) | 226 MoveKit-items, `source.provider='movekit'`, bijectieve `id_map` slug↔`TK-`, al gepubliceerd als ECS-catalogus | Het bestand bevat **geen** licentie-, rechten- of copyrightveld (test-geverifieerd). Er staat geen goedkeuring voor nieuwe FK-bindings in. |
| a2 | `docs/MOVEKIT_MEDIA_SCALE_GATE_2026-10-01.md` | Het bronpakket verwijst naar **MoveKit License Agreement v1.0**: in-app gebruik/streaming toegestaan; ruwe publieke content-URL's en downloadlinks verboden. Expliciet "engineering/compliance interpretation, not legal advice". | Geen schriftelijke bevestiging van MoveKit. Het licentiedocument zelf staat niet in Git, en dat is terecht. |
| a3 | `docs/TK504_MEDIA_TRANSFER_EVIDENCE_20261105.md` | 582/582 video's en posters: SHA-256 en bytes matchen de inventaris, en de Storage-ETag-registers zijn identiek. Dat is integriteits- en overdrachtsbewijs. | Het document zegt zelf: "Controleer afzonderlijk of de aankoop/licentiehouder overeenkomt met de exploitant". Dat is nog **open**. Het verleent geen entitlement en geen release. |
| a4 | `docs/generated/MOVEKIT_V2_RELEASE_GATES.json` | 1164 media-entries, waarvan **452** (video+poster) voor `TK-000001..226`, allemaal `reviewed:true, upload_verified:true`, `review_reference: "TK504-20261107-356"` | `released_batches` dekt **alleen** `TK-000227..582` (15 batches, 356). Er is geen release-record voor 001..226. |
| a5 | `tools/tk614_original226_batch25_preflight.cjs` (`batchEntries`) | Het stage-plan eist voor alle 226 de private manifest-eligibility `existing-catalog-not-authorized-for-new-binding` | Het private 582-manifest markeert de 226 dus zelf als **niet geautoriseerd** voor een nieuwe binding. Het manifest is voor dit pakket niet gelezen, omdat dat niet nodig was. De eis volgt uit de code. |
| a6 | Fase A in productie (§1) | Technische identiteit (alias + binding) bestaat, inactief | Technische aanwezigheid betekent geen review en geen activatie. |

**Open observatie voor de eigenaar (a4):** de 452 media-entries van de originele 226 dragen de review-referentie `TK504-20261107-356`. Die naam suggereert een review van "356". Bevestig of de media-review van 7 november de 226 originele bestanden werkelijk inhoudelijk omvatte, of dat de referentie alleen technisch hergebruikt is. Tot die bevestiging telt a4 alleen als integriteits-/uploadbewijs.

**Inhoudelijke kanttekening:** de `intelligence`-velden in de catalogus zijn heuristisch (`human_verified=false`, bewijsniveau C). Het reviewpakket neemt ze daarom bewust **niet** op. Het toont alleen identiteits- en weergavevelden.

### (b) Expliciete goedkeuring voor 226 nieuwe FK-bindings — **PENDING**
- Er bestaat **geen** owner-besluit, release-record of signatuur dat `TK-000001..226` vrijgeeft als actieve, gereviewde FK-binding.
- Het eerdere ownerbesluit `TK504-20261105-OWNER-BATCHES-01-15` ("ik keur batch 1 tm 15 goed") geldt voor `TK-000227..TK-000582` (356). Het sluit `supplier_media_license`, `live_account_entitlements` en `release_authorization` expliciet uit. Het is **niet overdraagbaar** naar de 226 (test-afgedwongen: dat decision-ID wordt door de nieuwe validator geweigerd).
- Het fase A-besluit `TK614-OWNER-STAGE-20261108-CHAT02` gaf alleen toestemming voor inactief/ongereviewd stagen.

### (c) Mediatoegang — **NOT_RELEASED**
- Een binding geeft geen media-entitlement. Er zijn geen `movekit_media_grants` en het pakket bevat geen storage-paden, media-SHA's of URL's.
- Het voorgestelde release-record (§4) eist `media_grants: 0` en `media_access: "NOT_RELEASED"`. Een record dat media vrijgeeft wordt geweigerd.

## 3. Reviewpakket (deterministisch, read-only)
**Generator:** `tools/tk614_original226_review_packet.cjs`
**Output:** `docs/generated/TK614_ORIGINAL226_OWNER_REVIEW_PACKET_20261109.json` (alleen publieke ECS-data)

```
node tools/tk614_original226_review_packet.cjs --write            # (her)genereer het pakket
node tools/tk614_original226_review_packet.cjs --check            # verifieer het gecommitte pakket (standaard)
node tools/tk614_original226_review_packet.cjs --record-template  # print een PENDING release-record-concept
```
- **Bron:** uitsluitend `exercise-catalog.json`, gepind op dezelfde SHA als het stage-plan. Bij afwijking volgt `SOURCE_CATALOG_SHA_MISMATCH`. Er is geen eigen oefen-ID-waarheid: elke rij wordt teruggecontroleerd tegen `catalog[]` en `id_map`.
- **Per rij:** `n`, `catalog_id`, `fk_target_exercise_id` (`TKC-`), `provider`, `provider_id` (de slug staat al publiek in `exercise-catalog.json`), `name`, `name_nl`, `category`, `pattern`, `type`, `difficulty`, `equipment`, `review_status: PENDING_OWNER_REVIEW`.
- **Nooit opgenomen:** de 356 en hun slugs, legacy-rijen, sessies, storage-paden, media-SHA's, de private manifestinhoud, licentiedocumenten, sleutels of signaturen.
- **Batches:** 10 (9 × 25 + 1 × 1), identiek aan het stage-schema. Per batch is er een `batch_sha256` = sha256 van `JSON.stringify({schema,batch,from,through,count,rows})`. Het totaal `totals.all_sha256` = sha256 van `{schema,source_catalog_sha256,scope,batches[index+sha]}`.
- **Deterministisch:** geen klok, geen env, en CRLF-neutraal. Dezelfde catalogusbytes geven een byte-identiek pakket.
- **`authorizes`**: alle zes de vlaggen staan op `false`. `review_counts`: 226 pending, 0 approved.

| Batch | IDs | Aantal | Status |
|---|---|---|---|
| 1 | TK-000001..TK-000025 | 25 | PENDING_OWNER_REVIEW |
| 2 | TK-000026..TK-000050 | 25 | PENDING_OWNER_REVIEW |
| 3 | TK-000051..TK-000075 | 25 | PENDING_OWNER_REVIEW (bevat TK-000063 Cable Bar Pushdown) |
| 4 | TK-000076..TK-000100 | 25 | PENDING_OWNER_REVIEW |
| 5 | TK-000101..TK-000125 | 25 | PENDING_OWNER_REVIEW |
| 6 | TK-000126..TK-000150 | 25 | PENDING_OWNER_REVIEW |
| 7 | TK-000151..TK-000175 | 25 | PENDING_OWNER_REVIEW |
| 8 | TK-000176..TK-000200 | 25 | PENDING_OWNER_REVIEW (bevat TK-000188 Machine Pec Fly) |
| 9 | TK-000201..TK-000225 | 25 | PENDING_OWNER_REVIEW |
| 10 | TK-000226 | 1 | PENDING_OWNER_REVIEW |

**SHA-waarden onafhankelijk geverifieerd op 9 november door ChatGPT.** De generator `--write` is op de schone ontwikkelbranch uitgevoerd; de aansluitende `--check` heeft het volledige JSON-bestand byte-exact gevalideerd tegen `exercise-catalog.json`. De nieuwe inhoudstest is **174/174 PASS** en controleert de 10 batch- en totaaldigests onafhankelijk. Onderstaande SHA-waarden vormen de **technisch geverifieerde reviewbasis**, geen inhoudelijke eigenaarstoestemming:

| Batch | Gecontroleerde `batch_sha256` |
|---|---|
| 1 | `d5f42ae16c763d64320c39952c5a852a33a23ccd4acd2b3f37bc0faa3c2e51b1` |
| 2 | `dadec463778229c372691e9512fe1673b4835dae5284be1731792afd9b9997ce` |
| 3 | `70534ae2d37d556816e5b46dfea0e47cb6241539b97890e3b10cf3e22067b598` |
| 4 | `2f6491a1216722af3c8c31bc1f9006e4886dbffbeb5b4fd83ba4a60247ab4b64` |
| 5 | `3a318f383f44c962c6ebad0b32f4a35d99b00e616c865527db40731b2e687a14` |
| 6 | `d027197a381d47cc14d126fe31163c2f5dc241a5a45492020ba86a9876474d38` |
| 7 | `065530d712ee81645b48069a3936213719e71e586f34fea7c28150214baaa88d` |
| 8 | `f5bbf824f0dc256252305bc7e127fa806ba8364796ab04762d441eda4f7792e1` |
| 9 | `aea72156e3c2eede6a54b6d66e766af26452722f1300e5afc91bfad64de89778` |
| 10 | `436635dd7435e584ac09a5c6e585e8d8981e687c2516fc63a0e8ab934edb5590` |
| **totaal** `all_sha256` | `bb7badb23244ad47659b8170e9f154aa7bbcfc7fd69c1c1c4b42b2a65bd98487` |

De generator is uitgevoerd en `--check` is geslaagd. De eigenaar kan deze batchgebonden hashes gebruiken om de **afzonderlijke inhoudelijke review** vast te leggen. Alle 226 items blijven `PENDING_OWNER_REVIEW`; deze technische verificatie keurt niets goed.

## 4. Voorstel fail-closed release-register voor de 226 (FK-identiteit only)
**Zwakte gevonden:** `original226Released(gates)` controleerde alleen `status==='RELEASE_APPROVED'` plus range-dekking `001..226` in `released_batches`. Eén regel `{from:'TK-000001',through:'TK-000226'}` in het bestaande (356-)gatesbestand was daardoor genoeg. Er was geen owner, geen evidence, geen koppeling aan wat er gereviewd is, en geen mediabeperking.

**Verscherping (productcode, `tools/tk614_original226_admin_release.cjs`):** dekking is nu *noodzakelijk maar niet voldoende*. Daarnaast is een geldig `gates.original_226_fk_identity_release`-record vereist, gevalideerd door `releaseRecordProblems(record, packet)` in de generator. Het pakket wordt bij `render --phase activate` uit dezelfde `catalogBytes` afgeleid. De echte `MOVEKIT_V2_RELEASE_GATES.json` is **niet** gewijzigd.

Recordschema `tk614-original226-fk-identity-release/1.0` (exacte sleutelset):
```
{ schema, status: "OWNER_APPROVED_FK_IDENTITY_ONLY",
  decision_id: "TK614-OWNER-REVIEW226-YYYYMMDD-XX",   // eigen namespace; 356- en STAGE-ID's geweigerd
  approved_by, approved_at (ISO-Z),
  binding_kind: "FK_IDENTITY_BINDING_ONLY", media_grants: 0, media_access: "NOT_RELEASED",
  review_packet: { schema, all_sha256, source_catalog_sha256 },     // == herberekend pakket
  evidence: { source_evidence_sha256, license_evidence_sha256, owner_review_evidence_sha256 },
  batches: [10 × { batch, from, through, count, batch_sha256, status: "OWNER_APPROVED",
                   reviewed_by, reviewed_at (<= approved_at), evidence_sha256 }] }
```
Weigeringscodes: `RELEASE_RECORD_MISSING`, `_SHAPE_INVALID`, `_SCHEMA_INVALID`, `_NOT_OWNER_APPROVED`, `_DECISION_ID_INVALID`, `_APPROVED_BY_INVALID`, `_APPROVED_AT_INVALID`, `_SCOPE_NOT_FK_IDENTITY_ONLY`, `_MEDIA_GRANT_FORBIDDEN`, `_PACKET_DIGEST_MISMATCH`, `_BATCHES_INCOMPLETE`, `_BATCH_DIGEST_MISMATCH`, **`_PARTIAL_APPROVAL_BLOCKED`** (één batch niet `OWNER_APPROVED` blokkeert alles), `_REVIEWER_INVALID`, `_REVIEW_TIMESTAMP_INVALID` en `_EVIDENCE_MISSING_OR_INVALID`. Die laatste geldt ook voor een placeholder (`aaaa…`), voor de pakket- of batch-hash zelf als "evidence", en voor één digest die voor twee evidence-soorten wordt gebruikt.

Zelfs met een geldig record blijft `ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY` staan. Activatie vraagt daarnaast een Ed25519-gesigneerde activate-approval met prior `TK614-OWNER-STAGE-20261108-CHAT02`, een **nieuwe** post-stage fingerprint, alle 6 gates `ACCEPTED`, en DBA-uitvoering. Daarvoor is niets gewijzigd.

## 5. Open owner-, rechten- en brongates (in volgorde)
1. **G1 Bron/identiteit:** de eigenaar bevestigt dat de 226 ECS-identiteiten (naam/slug/`TK-`↔`TKC-`) per batch kloppen. Input: het pakket. → per batch `OWNER_APPROVED` of afwijzing.
2. **G2 Rechten/licentie:** de eigenaar bevestigt (buiten Git) dat de licentiehouder van de MoveKit-aankoop gelijk is aan de exploitant van Trainingskompas, en dat MoveKit License v1.0 het gebruik van deze 226 identiteiten als FK in sessielogging dekt. Leg alleen een sha256 van het private bewijs vast (`license_evidence_sha256`).
3. **G3 Media-review-referentie:** verduidelijking van `TK504-20261107-356` voor de 452 media-entries van 001..226 (zie §2 a4). Media blijft hoe dan ook `NOT_RELEASED` in dit spoor.
4. **G4 Release-record-commit:** pas na G1–G2 een apart gereviewde commit die `original_226_fk_identity_release` plus de dekkingsregel aan `MOVEKIT_V2_RELEASE_GATES.json` toevoegt. Een partieel record wordt geweigerd.
5. **G5 Owner-sleutel:** de eigenaar genereert zelf, buiten deze repo, een Ed25519-sleutel. Alleen de sha256 van de publieke SPKI komt via een aparte, gereviewde commit in `TRUSTED_OWNER_KEY_SHA256`. Deze sessie heeft geen sleutel gemaakt.
6. **G6 Activate-approval:** nieuwe live fingerprint (read-only), approval-template, owner-signatuur en tweekanaals-bevestiging (zie `TK614_ORIGINAL226_ADMIN_RELEASE_CANDIDATE_20261108.md`).
7. **G7 Uitvoering en acceptatie:** DBA-run van fase B, A/B-accounts, Android; rollback = fase C (reverse).

## 6. Gewijzigde en nieuwe bestanden
| Bestand | Wijziging |
|---|---|
| `tools/tk614_original226_review_packet.cjs` (nieuw) | Deterministische generator, `verifyReviewPacket`, `releaseRecordProblems`, `buildReleaseRecordTemplate`, CLI `--check/--write/--record-template` |
| `tools/tk614_original226_admin_release.cjs` | `original226Released` eist nu naast dekking ook een geldig owner-record. Nieuw: `original226ReleaseRecordProblems`. `prepareRelease(activate)` bindt het pakket aan de input-catalogus. |
| `tools/tk614_admin_release_docker_smoke.cjs` | `SYNTHETIC_RELEASE_GATES` bevat nu een synthetisch, pakket-gebonden record (`syntheticRelease226Record`), alleen voor smoke/tests |
| `core/tk614Original226AdminRelease.test.js` | `GATES_OK` = synthetische smoke-gate. Nieuwe RED-cases: coverage-only, partieel (9/10) en een media-grant worden geweigerd, ook met een geldige signatuur en een gepinde test-sleutel. |
| `core/tk614Original226ReviewPacket.test.js` (nieuw) | Zie §7 |
| `docs/TK614_PHASE_B_OWNER_REVIEW_20261109.md` (nieuw) | Dit document |
| `docs/generated/TK614_ORIGINAL226_OWNER_REVIEW_PACKET_20261109.json` | Untracked aanwezig, niet door deze sessie gemaakt of geverifieerd. Bevestigen met `--write`, een lege diff en `--check` (zie §3). |

Niet gewijzigd: `MOVEKIT_V2_RELEASE_GATES.json`, `exercise-catalog.json`, migraties, RLS, frontend, `TRUSTED_OWNER_KEY_SHA256` (blijft `[]`).

## 7. Tests en status
Testdekking in `core/tk614Original226ReviewPacket.test.js`:
- 226/226 uniek (catalog_id, provider_id, FK-doel) en aaneengesloten. Elke rij is gelijk aan de echte ECS-identiteit. Er staat geen 356-ID of -slug in.
- 10 batches 9×25+1, gelijk aan `T.batchSchedule()`. TK-000063 zit in batch 3, TK-000188 in batch 8.
- SHA-formules onafhankelijk herberekend. Een rebuild is byte-identiek, ook bij CRLF.
- Tamper-RED (12 varianten: naam, slug, batch-/totaal-sha, zelf-approval rij/batch/pakket, `authorizes`, telling, rij weg, media-veld, staged contract) en catalogusdrift.
- Geen media/secrets/private paden/approval-markers. Het gecommitte pakket moet gelijk zijn aan het herberekende (fail closed als het ontbreekt).
- Release-record: GREEN alleen bij een volledig synthetisch record. Geweigerd worden: partieel (elke batch 1..10 los), afgewezen, 9 batches, dubbel, verkeerde sha, range tot 227, pakket-/catalogus-sha, media, scope, generieke `RELEASE_APPROVED`, 356-besluit, STAGE-besluit, ontbrekende/placeholder/zelfverwijzende/dubbele evidence, reviewer, tijd, extra sleutels.
- Integratie: echte repo-gates geven nog steeds beide blockers. Een kale 001..226-range, een PENDING-template of een partieel record geeft geen release. Een volledig record laat nog steeds `NO_PINNED_OWNER_KEY` staan.
- De 356 zijn onaangetast (15 batches, 227..582, som 356, besluit-scope). De evidence-claims uit §2 worden tegen de repo gecontroleerd.
- Staged contract van fase A. Geen onbedoelde ACTIVATE: alleen fs/path/crypto, geen SQL-writes, keys of signing, één schrijfpad, CLI weigert `--activate/--approve/...`. Het gatesbestand blijft byte-identiek.

**Werkelijk uitgevoerd door onafhankelijke ChatGPT-review (offline):** `core/tk614Original226ReviewPacket.test.js` **174/174 PASS** en `core/tk614Original226AdminRelease.test.js` **357/357 PASS**. Een gerichte RED→GREEN-test van de echte functie met uitsluitend een bereik zonder eigenaarreviewbewijs geeft op originele PR #616 `original226Released=true` (onveilig) en op deze branch `false` (correct geblokkeerd). De lokale PostgreSQL-smoke `tk614_admin_release_docker_smoke.cjs` **57/57 PASS**, `activate=BLOCKED` onder het echte privémanifest; geen live reads/writes aan persoonlijke accounts. De volledige lokale releasegate is daadwerkelijk afgerond: **513 controles uitgevoerd, 0 mislukt, 0 overgeslagen** na offline `npm ci` en `npm run cap:sync`. De GitHub Quality Gate op de toekomstige PR-commit staat nog open. De code mag daardoor als technische reviewkandidaat worden aangeboden, niet als toestemming voor fase B. Reproduceerbare commando's:
```
node tools/tk614_original226_review_packet.cjs --write
node tools/tk614_original226_review_packet.cjs --check
node core/tk614Original226ReviewPacket.test.js
node core/tk614Original226AdminRelease.test.js
node core/tk614Original226All226Preflight.test.js
node core/tk614Original226Batch25Preflight.test.js
node core/release-gate.js
node tools/tk614_original226_admin_release.cjs status --manifest C:\Movikit\.tk-private-review\TK504-582-TYPED-FK-PREFLIGHT-20261106.json
```
Verwacht bij `status`: `activate: BLOCKED` met beide blockers. RED-bewijs voor de verscherping: draai `core/tk614Original226AdminRelease.test.js` tegen `e78b9b3`-versie van de tool. De nieuwe assert `coverage-only gate without owner record is rejected` faalt daar, want de oude code gaf `true`.

## 8. Blockers
- **Owner-besluit G1–G2 ontbreekt.** Dat is een inhoudelijke beslissing van de eigenaar. Code beslist dat niet.
- Geen gepinde owner-sleutel, en dat is bewust zo.
- Licentiehouder ↔ exploitant niet bevestigd. Er is geen schriftelijke MoveKit-bevestiging.
- Betekenis van `TK504-20261107-356` op de media van 001..226 is onduidelijk.
- Pakket-JSON en hashes zijn door ChatGPT gecontroleerd en de gerichte tests, PostgreSQL-smoke en volledige lokale releasegate zijn groen. De formele eigenaarreview, gepinde sleutel, GitHub-CI en fysieke Android-acceptatie staan nog open.
