# TK614 / #603 — Admin-releasekandidaat voor de 226 oorspronkelijke MoveKit-bindings

**Datum:** 8 november 2026
**Branch:** `fix/tk614-all226-admin-release-candidate-20261108` op PR #615 `8b60ec517bbb27cb87f41b63f7bb00b0ddcdf777`
**Scope:** uitsluitend `TK-000001..TK-000226` → `TKC-000001..TKC-000226`. De 356 bestaande gereviewde bindings (`TK-000227..582`), de 23 historische `TK-######`-rijen (7 global, 16 personal) en alle sessies vallen buiten de schrijfscope.

> **Status: OFFLINE GEVERIFIEERD — NIET IN PRODUCTIE VRIJGEGEVEN.** De oorspronkelijke auteursessie kon Node/Docker niet starten, maar een afzonderlijke ChatGPT-review op 8 november 2026 heeft daarna alle onderstaande tests daadwerkelijk uitgevoerd: **351/351** nieuwe admin-asserties, **367/367** all-226 preflight, **57/57** Docker PostgreSQL 17-smoke-stappen (disposable container, `--network none`) en **512/512** volledige lokale releasecontroles (0 skips/0 failures). Er zijn geen live databasewrites, sessiereplays of APK-builds uitgevoerd. Een lokale commit en concept-PR zijn voorbereiding, geen productieactivatie.
>
> **ACTIVATIE (fase B) staat fail-closed op BLOCKED**, om twee bestaande, aantoonbare redenen:
> 1. `docs/generated/MOVEKIT_V2_RELEASE_GATES.json` dekt alleen `TK-000227..TK-000582`. Er is geen release-record voor 001..226.
> 2. Er is geen owner-signeersleutel gepind (`TRUSTED_OWNER_KEY_SHA256 = []`).
>
> Ook het private 582-manifest markeert 001..226 als `existing-catalog-not-authorized-for-new-binding`. Dit wordt **niet** omzeild. Activatie vraagt eerst een gereviewde commit die de release-gate uitbreidt en een owner-sleutel pint.

## 1. Waarom alleen stagen (inactief/ongereviewd) de runtime nog NIET fixt
Zowel de resolver `tk504_resolve_catalog_fk` als de sessie-guard `tk504_validate_typed_session_fk` eisen `active = true AND reviewed_at IS NOT NULL`. Na fase A geldt voor alle 226 `active=false, reviewed_at=NULL`. Gevolg:
- de resolver geeft voor 0/226 een FK terug, zodat de app `tk504_catalog_fk_unverified` blijft geven;
- de DB-trigger weigert elke nieuwe getypte sessie op `TKC-000001..226` (23514).

Dat wordt bewezen in de fase-A-SQL zelf (`TK614_RESOLVER_226_NOT_0`), in de Docker-probe `probe_after_stage_A/B` en in het offline model in de unittest (§2). Pas fase B maakt de 226 resolvebaar en logbaar.

## 2. Nieuwe en gewijzigde bestanden
| Bestand | Wat |
|---|---|
| `tools/tk614_original226_admin_release.cjs` (nieuw) | Fail-closed generator. Hergebruikt `planAll`/`verifyAllPlan`/`renderBatchBlock` rechtstreeks. Commando's `fingerprint`, `approval-template`, `seal`, `render`, `status`. Output alleen privé (buiten de repo, `wx`, 0600). |
| `supabase/migrations/20261108120000_tk614_admin_release_audit_stage.sql` (nieuw, **STAGED, niet live**) | Append-only ledger `public.tk614_admin_release_audit`: `decision_id UNIQUE` (geen replay), `prior_decision_id`-keten, registry-voor/na-hash, `backend_pid`, `txid`. RLS aan, `revoke all` voor public/anon/authenticated/service_role, geen policy, guard-trigger (alleen INSERT, alleen postgres zonder JWT, geen TRUNCATE). |
| `tools/tk614_admin_release_docker_smoke.cjs` (nieuw) | Wegwerp-`postgres:17` (`--network none`, `--pull never`). Echte COMMIT van A → B → C op de vastgelegde productie-schemacontract-fixture (TK603: echte kolommen, constraints, triggers, RLS-policies en grants) plus de drie staged migraties. |
| `core/tk614Original226AdminRelease.test.js` (nieuw) | RED/GREEN-unittest met een synthetisch 582-manifest. Wordt automatisch opgepikt door `core/release-gate.js`. |
| `tools/tk614_original226_batch25_preflight.cjs` (gewijzigd) | Alleen een extra export: `renderBatchBlock`. Het gedrag is ongewijzigd. |

Niet gewijzigd: `index.html`, frontend, sessie-writer, app-RPC, `tk504_*`-functies, RLS-policies, media.

## 3. Owner-approval-artefact (privé input, per fase apart)
Schema `tk614-original226-owner-approval/1.0`, exacte sleutelset per fase:
- `decision_id` volgens `TK614-OWNER-(STAGE|ACTIVATE|REVERSE)-YYYYMMDD-XXXX`. De fase in het ID moet gelijk zijn aan de fase.
- `prior_decision_id`: bij stage `null`, bij activate verplicht (een STAGE- of REVERSE-besluit), bij reverse optioneel.
- `approved_by`, `approved_at` (ISO-Z, maximaal 14 dagen oud, maximaal 5 minuten in de toekomst).
- `scope`: `count=226`, de volledige lijst `TK-000001..226` in volgorde, plus een sha256 van die lijst.
- `sources`: `mapping_sha256`, `source_catalog_sha256`, `all_sha256`, `private_manifest_sha256`, gelijk aan de herberekende waarden.
- `live`: `precondition_sha256`, `registry_snapshot_sha256`, `server_version_num`, uit het read-only fingerprint-bestand (verplicht voor A/B; bij C mag alles `null` zijn).
- alleen bij activate: `gates.source|owner|review|license|rollback|ab_acceptance`, elk `status:'ACCEPTED'`, `accepted_by` en `evidence_sha256`. `review.completed_at` wordt `reviewed_at` en mag niet later liggen dan `approved_at`.
- alleen bij activate: `signature` (Ed25519 over de 32 ruwe bytes van `approval_sha256`). De sleutel moet in `TRUSTED_OWNER_KEY_SHA256` staan, en die lijst is nu leeg.
- `approval_sha256` = sha256 over de canonieke JSON zonder `approval_sha256`/`signature`.

**Tweekanaalsbevestiging:** de DBA moet `--confirm-decision-id` en `--confirm-approval-sha256` zelf intypen (out-of-band van de owner ontvangen). Er bestaat geen env-variabele of vlag om iets te forceren. Onbekende vlaggen (`--force`, `--allow-activation`, `--trusted-key`, `--release-gates`, `--now`, …) geven `USAGE`. De generator leest geen `process.env`. De `trust`-parameter bestaat alleen in de library-API (tests/smoke) en is vanaf de CLI onbereikbaar.

## 4. Gemeenschappelijke DB-gates (elke fase, vóór de eerste write)
`BEGIN ISOLATION LEVEL REPEATABLE READ`, `search_path=pg_catalog`, `TimeZone=UTC`, `lock_timeout 5s`, `statement_timeout 120s`. Daarna **eerst de locks**: audit `EXCLUSIVE`, bindings `EXCLUSIVE` (lezers zoals de resolver blijven werken), exercises `SHARE ROW EXCLUSIVE` (app-sessie-inserts met FK blijven werken). Pas daarna volgt de snapshot. Vervolgens:
- `session_user = current_user = 'postgres'` en geen `SET ROLE` → anders `TK614_REQUIRES_TRUSTED_POSTGRES_ADMIN`. Een `service_role`/`authenticated`-sessie faalt al bij de LOCK (`permission denied`).
- `auth.uid()` NULL en geen `request.jwt.claims/claim.sub/claim.role` → anders `TK614_JWT_CONTEXT_FORBIDDEN`.
- `pg_try_advisory_xact_lock(614226,603)` → anders `TK614_SECOND_WRITER_ACTIVE`.
- `server_version_num ≥ 150000`. Het decision-ID is nog niet gebruikt (`TK614_DECISION_ALREADY_USED`).
- RLS staat aan op exercises/sessions/bindings/audit, en de 4 guard-triggers zijn enabled en wijzen naar de juiste functie.
- De `prosrc`-sha256 van de 6 guard-functies is gelijk aan de staged repo-definities (`TK614_GUARD_DEFINITION_DRIFT`). De extractiemethode wordt bij elke run gecontroleerd tegen de onafhankelijke TK603-pin `485486db…`.
- anon/authenticated hebben geen enkel privilege op bindings/audit, en service_role heeft alleen SELECT op bindings.
- **Alleen A/B:** `server_version_num`, `precondition_sha256` en `registry_snapshot_sha256` zijn exact gelijk aan de approval. De precondition-hash dekt de definities (incl. owner/ACL/secdef/config) van de scope-functie, `set_user_id_from_auth`, alle `tk504_*`/`tk614_*`-functies en `auth.uid()`, plus triggers, RLS-vlaggen, ACL's, policies (incl. expressies), kolommen en constraints van de 4 tabellen. De registry-hash dekt alle bindings, alle `TKC`-rijen en de identiteit van de 23 legacy-rijen. Elke wijziging, ook een policywijziging, betekent fail closed.
- In de transactie zelf: md5 van de 356 bindings en aliassen, de 23 legacy-rijen, alle TK/TKC-sessies plus het totale aantal sessies, en de precondition-hash, vóór en na. Een verschil laat de transactie falen.

## 5. Per fase
### A. STAGE (`render --phase stage`)
- Extra gates: exact 356 actief en gereviewd, met juiste alias-eigenaar en -scope; 0 van 001..226 aanwezig; geen aliasbotsing; geen provider al gebonden; 23 legacy-rijen; plan nog niet in de audit.
- Write: 10 geordende batchblokken (dezelfde `renderBatchBlock` als de bewezen preflight). 226 aliassen worden `global`, inactief en zonder eigenaar; 226 bindings `active=false, reviewed_at=NULL`. Geen UPDATE, geen media, geen sessies.
- Post: 226 inactief/ongereviewd, 582 canoniek, 356/23/historie ongewijzigd; resolver 0/226 en 356/356. Audit-rij `stage` met `registry_after_sha256`, dan `COMMIT`.
- **Backout A:** fase C is niet nodig zolang er niets actief is. De rijen zijn inactief en dus runtime-neutraal. Fysiek verwijderen valt buiten deze kandidaat (`ON DELETE RESTRICT`, zodat sessies nooit verloren gaan). Bij een fout midden in de transactie blijft niets achter.

### B. ACTIVATE (`render --phase activate`) — **BLOCKED in de CLI**
- Vereist: een aparte approval met `prior_decision_id` = het gecommitte stage- of reverse-besluit, een **nieuwe** fingerprint die ná de stage is genomen, alle 6 gates `ACCEPTED`, een release-gate die 001..226 dekt, en een Ed25519-signatuur van een gepinde sleutel.
- DB-gates: het prior-besluit bestaat en is het laatste voor dit plan (`TK614_PRIOR_DECISION_NOT_FOUND/_NOT_LATEST`). De `registry_after` van dat besluit is gelijk aan de approval-snapshot (`TK614_APPROVAL_NOT_BOUND_TO_PRIOR_STATE`). Het besluit is niet in dezelfde psql-sessie als de stage uitgevoerd (`TK614_ACTIVATE_IN_SAME_SESSION_AS_PRIOR_PHASE`). Geen cross-provider-drift, geen partiële of ontbrekende stage, niets al actief of gereviewd.
- **Waarom ACTIVATE nooit ongemerkt aan STAGE vastzit:** de registry-hash ná de stage bevat `created_at = now()` van de stage-transactie. Die is vooraf onvoorspelbaar, dus een activatie-approval kan pas ná een gecommitte stage bestaan. Een vooraf "meegetekende" activatie faalt met `TK614_REGISTRY_SNAPSHOT_DRIFT`. Daarnaast zijn het aparte bestanden met verschillende headers, en de statische contracttest weigert elke UPDATE in een stage-bestand.
- Write: precies één `UPDATE … SET reviewed_at=<owner review-tijd>, active=true … WHERE active=false AND reviewed_at IS NULL`, en `ROW_COUNT` moet 226 zijn. `exercise.active` van de technische aliassen blijft `false` (`TK614_TECHNICAL_ALIAS_ACTIVATED`). App-RPC en sessie-guard blijven ongewijzigd.
- Post: 226 actief en gereviewd; resolver 226/226, foute slug 0, 356 ongewijzigd. Audit `activate`, dan `COMMIT`.
- **Backout B:** fase C.

### C. REVERSE (`render --phase reverse`)
- Geen registry- of precondition-pin vereist, zodat een noodterugdraai niet geblokkeerd wordt door latere drift. De context-, guard-, RLS- en privilege-gates gelden wel.
- Write: precies één `UPDATE … SET active=false, reviewed_at=NULL` voor alleen de 226 plan-rijen die nog vrijgegeven zijn. Idempotent: 0..226 rijen, en het werkelijke aantal komt in de audit. Geen DELETE: aliassen, bindings en **alle sessies** blijven bestaan, zodat de historie via `tk504_historical_catalog_id` blijft werken.
- Post: 0 vrijgegeven in 001..226, resolver 0/226; 356/23/historie en de technische aliassen zijn ongewijzigd. Audit `reverse`, dan `COMMIT`.
- Opnieuw activeren kan daarna alleen met een nieuw besluit (`prior_decision_id` = het reverse-besluit) en een nieuwe fingerprint.

## 6. CLI (alle paden absoluut en buiten de repo)
```
# 0. Status / blokkades (geen writes)
node tools/tk614_original226_admin_release.cjs status --manifest C:\Movikit\.tk-private-review\TK504-582-TYPED-FK-PREFLIGHT-20261106.json

# 1. Read-only fingerprint-SQL; de DBA draait die (psql -At) en bewaart de ene JSON-regel privé
node tools/tk614_original226_admin_release.cjs fingerprint --out <ABS>\tk614-fingerprint.sql

# 2. Unsigned approval-concept (machtigt niets); owner reviewt/bewerkt, daarna seal
node tools/tk614_original226_admin_release.cjs approval-template --phase stage --manifest <ABS_582> --fingerprint <ABS_FP_JSON> --decision-id TK614-OWNER-STAGE-YYYYMMDD-XX --approved-by "<owner>" --out <ABS>\stage-approval.json
node tools/tk614_original226_admin_release.cjs seal --approval <ABS_BEWERKT> --out <ABS_GESEALD>

# 3. Fase-SQL renderen (DBA typt decision-ID en digest zelf over)
node tools/tk614_original226_admin_release.cjs render --phase stage|activate|reverse --manifest <ABS_582> --approval <ABS_APPROVAL> --confirm-decision-id <ID> --confirm-approval-sha256 <HEX64> --out <ABS>\phase.sql

# 4. Uitvoering: ALLEEN door de DBA na een expliciet goedgekeurde release-handeling, als postgres via psql
psql -X -v ON_ERROR_STOP=1 -f phase.sql     # verwacht exact de marker uit het rapport (expected_marker)
```
Owner-signatuur (alleen activate, pas nadat een sleutel-fingerprint via een gereviewde commit in `TRUSTED_OWNER_KEY_SHA256` staat): Ed25519 over de 32 ruwe bytes van `approval_sha256`, met `signature = {alg:'ed25519', public_key_spki_der_base64, value_base64}`. De library-helper `signApproval` doet dit. Een openssl-variant is **niet getest**.

Docker-smoke:
```
node tools/tk614_admin_release_docker_smoke.cjs --manifest C:\Movikit\.tk-private-review\TK504-582-TYPED-FK-PREFLIGHT-20261106.json --out-dir C:\Movikit\.tk-private-review\tk614-admin-smoke-20261108
```

## 7. Live-voorwaarden vóór fase A (open)
1. De staged migratie `20261108120000_tk614_admin_release_audit_stage.sql` is door de DBA toegepast. Zonder die tabel faalt elke fase al bij de LOCK. **Live nog niet toegepast.**
2. De live guard-functies zijn byte-gelijk aan de repo. TK603 pinde `485486db…` op live; voor de andere 5 is dat aannemelijk maar **niet live geverifieerd**. Bij een afwijking geeft de SQL `TK614_GUARD_DEFINITION_DRIFT` (fail closed).
3. `session_user` is `postgres` bij de DBA-verbinding (de TK603-scopefunctie eist dat ook).
4. Backup/snapshot vóór de uitvoering; de fingerprint wordt vlak vóór het renderen genomen (de approval is maximaal 14 dagen geldig).

## 8. Echte tests versus niet getest
**Aansluitende onafhankelijke controle door ChatGPT daadwerkelijk uitgevoerd:** `node core/tk614Original226AdminRelease.test.js` **351/351 PASS**; `node core/tk614Original226All226Preflight.test.js` **367/367 PASS**; private-manifest-CLI `status` **PASS**, met `activate: BLOCKED` en de exacte blockers voor release-gates/owner-sleutel. `node tools/tk614_admin_release_docker_smoke.cjs` tegen het private manifest in lokale Docker PostgreSQL 17 (`--network none`) **57/57 PASS**: stage → activate → reverse, foutieve rechten/drift/replay geweigerd, originele 356 bindings + 23 legacy-rijen en historie ongewijzigd, container verwijderd. `npm ci --offline`, `npm run cap:sync` en `node core/release-gate.js` **512 uitgevoerd, 0 overgeslagen, 0 fouten**. Generated Android-assets zijn daarna uit de Git-werkboom hersteld. **Nog niet bewezen:** echte live Supabase-Auth-/RLS-acceptatie, productieactivatie, een getekend ownerbesluit en fysieke Android-acceptatie.

**Herhaalbaar bij een volgende onafhankelijke review (reeds groen op 8 november):**
```
node core/tk614Original226AdminRelease.test.js
node core/tk614Original226All226Preflight.test.js
node core/tk614Original226Batch25Preflight.test.js
node core/tk603StagedScopeTransition.test.js
node core/release-gate.js
node tools/tk614_original226_admin_release.cjs status --manifest C:\Movikit\.tk-private-review\TK504-582-TYPED-FK-PREFLIGHT-20261106.json
node tools/tk614_admin_release_docker_smoke.cjs --manifest C:\Movikit\.tk-private-review\TK504-582-TYPED-FK-PREFLIGHT-20261106.json --out-dir C:\Movikit\.tk-private-review\tk614-admin-smoke-20261108
```
Wat de unittest dekt: TK603-pin-reproductie en CRLF; het offline model "stage ≠ fix"; de GREEN-render per fase met het volledige SQL-contract; meer dan 35 RED-approvalvarianten (schema, fase, sleutels, decision-ID/injectie, prior, verouderd/toekomst, scope, bron-digests, manifest-bytes, live, digest, bevestiging, manifest-tamper, catalogusdrift); activatie geblokkeerd zonder release-gate of zonder gepinde sleutel, met een ongeldige, vreemde of herspeelde signatuur, en met een niet-geaccepteerde of onvolledige gate; genegeerde env-vlaggen; tamper-RED op het statische contract (DELETE/sessie-writer/stage+activate/GRANT/ALTER/POLICY/SET ROLE/media/tweede transactie/ROLLBACK/lock/marker); de read-only fingerprint; de audit-migratie; de CLI (private-or-nothing, EEXIST, niets geschreven bij een fout, geen slugs op stdout, CLI-activatie geblokkeerd); de pure delen van de smoke.

Wat de Docker-smoke moet aantonen (in één wegwerp-DB, met echte COMMITs):
- **A-negatieven:** foute snapshot, JWT-context, service_role, authenticated+JWT, RLS-policy-drift, uitgeschakelde guard-trigger, gewijzigde guard-body, tweede writer (advisory lock). Daarna moet de fingerprint ongewijzigd zijn.
- **A-commit en replay geweigerd.** Probes A/B: 0/226 resolvebaar en een getypte sessie geweigerd, dus de runtime is nog niet gefixt.
- **B-negatieven:** approval van vóór de stage, onbekend prior-besluit, partiële drift, cross-provider-drift, JWT, service_role, policy-drift. Daarna moet de fingerprint ongewijzigd zijn.
- **B-commit, replay geweigerd, tweede activatie geweigerd.** Probes A/B: 226/226 resolvebaar, foute en vervalste slug geblokkeerd, geen personal shadow mogelijk, technische aliassen inactief. A schrijft een getypte sessie en B ziet die niet.
- **C:** JWT geweigerd, C-commit. Probes: 0/226, getypte insert geweigerd, A's sessie en historische resolutie intact.
- **C nogmaals:** 0 rijen, replay geweigerd.
- **Eindstaat:** 6 sessies, de historie bit-gelijk, 23 legacy-rijen en 356 bit-gelijk, 226 veilig inactief, auditketen `stage:226,activate:226,reverse:226,reverse:0`, audit niet te wijzigen of verwijderen en niet leesbaar voor clients.
- De container wordt verwijderd.

**Niet getest / niet bewezen (ook niet na een groene smoke):**
- Geen live Supabase-mutaties. De read-only cataloguscontrole is uitgevoerd: **0/226** originele bindings/aliassen aanwezig, **356/356** nieuwe exacte actief gereviewde bindings; echte JWT/PostgREST, de pooler, `session_user` op live en Supabase-default-privileges voor deze kandidaat zijn niet getest.
- De fixture is een vastgelegd schemacontract met synthetische afhankelijkheden, geen volledige productie-dump.
- Een openssl-signatuurflow, re-activatie ná een reverse (alleen statisch getest) en een concurrency-test met echte gelijktijdige app-writers (alleen de lock-modi zijn beredeneerd) zijn niet getest.
- Android/A-B met echte accounts is niet getest.

## 9. Blokkades / restrisico's
- **Activatie BLOCKED (semantisch, bewust):** er is geen release-gate en geen owner-sleutel voor 001..226, en het manifest zegt "not authorized for new binding". Oplossen vraagt een owner-besluit en een gereviewde commit, niet code.
- De audit-migratie is een nieuwe live-voorwaarde.
- De registry-snapshot is gevoelig voor élke wijziging aan bindings of TKC-rijen tussen de fingerprint en de uitvoering. Dat is bewust: een nieuwe fingerprint en approval zijn dan nodig.
