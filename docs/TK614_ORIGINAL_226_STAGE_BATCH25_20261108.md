# TK614 / #603 — getypeerde catalogusbinding eerste 226: batch25-preflight

**Datum:** 8 november 2026
**Branch:** `fix/tk614-original226-batch-preflight-20261108` op PR #615 `77aec90a5a453f32d08f24c9cd41f34db7f5b326`
**Status:** OFFLINE TOOLING GEVERIFIEERD — 128 synthetische assertions PASS, echte private bronmanifest-preflight PASS, lokale PostgreSQL 17 ROLLBACK-proef PASS. Geen productiedatabase, geen extern netwerk, geen push/merge/release/APK/deploy.

## 1. Uitgangspunt (geverifieerd door eigenaar/ChatGPT, niet opnieuw door deze branch)
- Productie: 356 actieve, gereviewde `TKC`-aliassen/bindings, uitsluitend 227..582; **0** voor 001..226. RPC `tk504_resolve_catalog_fk` bestaat en levert alleen `active=true AND reviewed_at IS NOT NULL`.
- 23 oude `TK-######`-rijen in `public.exercises` (7 global, 16 personal): alleen vormovereenkomst, nooit bron, nooit overschrijven.
- Machine Pec Fly `TK-000188` en Cable Bar Pushdown `TK-000063` missen daardoor een binding. Frontend FK-shadow-workaround blijft verboden.
- Owner-goedkeuring geldt voor de **inhoud van de nieuwe 356**, **niet** voor het activeren van bindings 001..226.

## 2. Wat is gebouwd
`tools/tk614_original226_batch25_preflight.cjs` (hergebruikt `safelyOutsideRepo` uit `tk504_prepare_private_fk_manifest.cjs` en `validatePrivateManifest` uit `tk504_render_private_fk_docker_preview.cjs`).

```
node tools/tk614_original226_batch25_preflight.cjs --manifest C:\Movikit\.tk-private-review\TK504-582-TYPED-FK-PREFLIGHT-20261106.json
  [--out ABS_PRIVATE.json] [--sql-out ABS_PRIVATE.sql] [--sandbox-out ABS_PRIVATE_HARNESS.sql]
```

Fail-closed volgorde, alles vóór de eerste geschreven byte:
1. Manifest- en outputpaden absoluut en **buiten de repository**; outputs exclusief (`wx`, 0600), bestaande bestanden → weigering.
2. Volledige 582-manifestvalidatie (schema `tk504-private-typed-fk-preflight/1.0`, `DRY_RUN_NO_RELEASE_AUTHORITY`, `eligible_for_live_seed:0`, alle `active:false`, juiste eligibility per bereik, herberekende mapping-digest).
3. `mapping_sha256` moet gelijk zijn aan de gepinde `706803c1…750e0ec` → anders `STALE_OR_WRONG_MAPPING_SHA`.
4. Exacte identiteit met publieke `exercise-catalog.json`: 226 items, `source.provider='movekit'`, `provider_id` gelijk, `id_map[slug]` wijst exact terug (bijectief, 226 sleutels), FK-doel nooit het `TK-`-ID zelf. Geen enkele slug van de 356 mag in de originele `id_map` voorkomen.
5. Schema 10 batches: 9×25 (001..225) + 1×1 (226), aaneengesloten. CLI staat **alleen batch 1** toe (`BATCH_NOT_IN_PREVIEW_SCOPE`); onbekende vlaggen (`--activate`, `--reviewed`, `--grant`, `--commit`, `--live`) → `USAGE`.
6. Output: `DRY_RUN_NO_RELEASE_AUTHORITY`, batch 1 `TK-000001..TK-000025` → `TKC-000001..025`, `active=false`, `reviewed_at=null`, `release_authority:false`, plus `batch_sha256`. Stdout bevat uitsluitend tellingen/digests, **geen provider-slugs**.

Optioneel:
- `renderRollbackSql` — **ROLLBACK-only** proef voor een wegwerp-Postgres. Weigert zonder tabel `public.tk614_disposable_sandbox_marker` (`NOT_A_DISPOSABLE_SANDBOX`). Pre-guards: gewijzigde/ontbrekende 356 (exacte catalog/exercise/provider-join, active+reviewed, unowned global alias), eigenaar/scope in `TKC`-ruimte, batch al aanwezig, aliasbotsing, gaten/out-of-order, eerdere batches niet inactief/ongereviewd, provider al gebonden, legacy-aantal ≠ 23. Post-guards: 25 nieuwe rijen inactief/ongereviewd, md5-fingerprint van de 356 bindings, 356 aliassen en 23 legacy-rijen ongewijzigd binnen de transactie. Tekstguard: geen `COMMIT/GRANT/REVOKE/ALTER/DROP/TRUNCATE/UPDATE/DELETE/POLICY/SECURITY DEFINER/SET ROLE`; moet op `ROLLBACK;` eindigen.
- `renderSandboxHarness` — synthetische harness: eigen schema, staged migratie via `\i`, marker, 356 synthetische gereviewde bindings, 23 synthetische `TK`-rijen (7/16), legacy-sessie; na de proef controle dat de state bit-gelijk is hersteld.
- `assertDisposableTargetState` — dezelfde guards als pure JS op een synthetische of privé geëxporteerde read-only snapshot.

## 3. Tests
`core/tk614Original226Batch25Preflight.test.js` (wordt automatisch opgepikt door `core/release-gate.js`). Synthetisch: 582-identiteiten uit de **publieke** golden inventory via de echte `verify()` van tk504; echte tool-functies, geen nagebootste databasewrite.

Gedekt: SHA-reproductie t.o.v. de gepinde privé-digest; schedule/gaten; batch 1 exact; ID-shadow (personal `TKC-000005`, personal alias in 356, `TK`≠FK); unreviewed-release-block (active in manifest, eligible>0, eligibility-swap, DB-constraint en resolver-tekst, verboden CLI-vlaggen); batchgrenzen 0/9/10/11/1.5/'1'/NaN/null; verkeerde/stale SHA en tamper; idempotentie (identiek plan/SQL, "already present" weigert dubbele insert, batch 2 vereist exact batch 1); 356 onaangetast (inactive, unreviewed, ontbrekend, verkeerde provider); SQL-tekstcontract; harness-tellingen; CLI private-of-niets, `EEXIST`, in-repo weigering, niets geschreven bij fout.

**RED:** test geschreven vóór de tool; draaien werd door de permissiemodus geblokkeerd, dus RED is **niet** uitgevoerd.
**GREEN daadwerkelijk uitgevoerd door ChatGPT:** `node core/tk614Original226Batch25Preflight.test.js` **128 PASS**; `node core/tk504PrivateFkManifestPreflight.test.js` **43 PASS**; `node core/tk504PrivateFkDockerPreview.test.js` **31 PASS**. Alleen lokale, synthetische fixturedata, geen DB/API-writes. RED op een versie zonder de nieuwe tool is niet uitgevoerd: geen claim over eerdere exacte fouttelling.

**Private bron daadwerkelijk gevalideerd:** CLI las `C:\Movikit\.tk-private-review\TK504-582-TYPED-FK-PREFLIGHT-20261106.json` en produceerde batch1 `TK-000001..025` met `status=DRY_RUN_NO_RELEASE_AUTHORITY`, 0 active, 0 reviewed, 0 databasewrites. Mapping SHA256 `706803c1e5a9485eb190da04f11d607d4e29a5f29777da4c77d0a1f99750e0ec`, batch SHA256 `a309c6810559ae833ab0f5bc721b12d110421811b21e2848d46e2bd71d1a44ee`. Privé JSON/SQL/harness zijn uitsluitend buiten Git opgeslagen. **Echte lokale PostgreSQL 17 proof:** Docker `postgres:17`, `--network none`, bestaand staged FK-schema en synthetische 356+23 basis. De SQL rapporteerde `TK614_BATCH01_ROLLBACK_PROOF_PASS_25_INACTIVE_UNREVIEWED` gevolgd door `TK614_SANDBOX_BATCH01_ROLLBACK_VERIFIED_356_AND_23_UNCHANGED`, beide PASS. Container daarna verwijderd. Live productie niet aangeraakt. Nog niet bewezen: daadwerkelijke A/B Auth+RLS onder echte credentials, rollback van een toekomstige productieactivatie, en echte Android-sessieopslag.

## 4. Batchstatus
| Batch | IDs | Status |
|---|---|---|
| 1 | TK-000001..025 | privé bron + 128 checks + PostgreSQL rollback-proef PASS; **niet in productiedatabase geactiveerd** |
| 2–9 | 026..225 | voorbereid (CLI `--batch 2..9`/`all`, inactief); zie `TK614_ALL_226_BINDINGS_20261108.md` |
| 10 | 226 | voorbereid (CLI `--batch 10`/`all`, inactief); zie `TK614_ALL_226_BINDINGS_20261108.md` |

`TK-000063` zit in batch 3, `TK-000188` in batch 8 — de gebruikersklacht wordt dus **niet** door batch 1 opgelost.

## 5. Security-blockers (open)
1. **Owner-besluit** nodig voor activering/review van bindings 001..226; content-goedkeuring van 356 geldt niet.
2. **Rollen:** alleen trusted `postgres` zonder `auth.uid()`/JWT-rol kan rijen invoegen (bestaande triggers). Geen ACL/RLS-versoepeling in deze tool; dat blijft zo.
3. **Licentie/media:** binding ≠ media-entitlement. Geen `movekit_media_grants`, geen signing, geen licentiebytes of private metadata in Git.
4. **Auth/RLS:** twee-accounts acceptatie (A/B) met de geactiveerde binding ontbreekt nog; resolver geeft pas resultaat na `active+reviewed`.
5. **Rollback:** productie-provisioning vereist apart goedgekeurd script, snapshot/backup, en reverse-plan (deactiveren i.p.v. verwijderen zodra sessies FK's gebruiken — `ON DELETE RESTRICT`).
6. **Legacy:** de 23 `TK`-rijen en alle bestaande historische sessies blijven buiten scope; nooit herclassificeren.

## 6. Vervolg
1. De tests, private manifest-validatie en de lokale PostgreSQL rollback-proof zijn uitgevoerd en groen. Onafhankelijke code-review en GitHub CI op de exacte commit volgen.
2. Owner-beslissing over *review en activering* van de originele 226 als apart contract, inclusief rechten/licentie en fasering; geen stilzwijgende activatie.
3. Pas daarna een apart geaudit productiescript met formele backup, dry-run vergelijking, twee-account Auth/RLS, rollback en hardwareacceptatie. Deze tool is alleen de voorbereidingsproef voor batch 1 en is **niet geschikt voor productie-uitvoering**.
4. Voor de direct getroffen oefeningen zijn ook batch 3 (`TK-000063`) en batch 8 (`TK-000188`) nodig; niets wordt overgeslagen of automatisch gepubliceerd.
