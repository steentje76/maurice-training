# TK614 — P1 opslagintegriteit, eerste herstelpakket
**Datum:** 8 november 2026
**Status:** LOKALE CODE + SYNTHETISCHE TESTS GEVERIFIEERD; PRODUCTIEBLOKKADE OPEN.
**Branch:** `fix/tk614-storage-20261108` op `origin/main` `492bf3db40a4597a3f61dda3d1f0d57e8bf3cc4b`.
**Bron:** #613 TK-UT-20261108-043 t/m 047; verband met #584, #603, #607 en #614.
**Verboden gebleven:** productie-mutaties, account-retry, cloud-migratie, branch-push, PR-merge, deployment en APK.

## 1. Gebruikersbewijs
- Programma Anatomische Aanpassing week 1: twee vervangen oefeningen, na afronden *twee mislukte acties*. In getoonde history vijf items, maar niet Machine Pec Fly en Cable Bar Pushdown.
- Losse Machine Pec Fly (3×15, 40 kg, RPE 5) bleef op `Deze registratie wacht op bevestiging` / `Nog niet opgeslagen`.
- Dit verklaart de gebruikerstrial, maar de exacte responsecodes van de fysieke Android-writes zijn niet vastgelegd. Verwar een mislukte write niet zonder servertrace met een verloren userrecord.

## 2. VERIFIED: client/server-release mismatch voor de eerste 226 items
*Deze sectie is geactualiseerd door ChatGPT na read-only schema-/aggregaatonderzoek; oudere repositorydocumentatie over een niet-geïnstalleerde stage was achterhaald.*
- In de echte `index.html` staat `TK504_TYPED_FK_SESSION_RELEASE=true`.
- Via de echte gecatalogiseerde ECS: `Machine Pec Fly=TK-000188` (provider `machine-pec-fly`); `Cable Bar Pushdown=TK-000063` (provider `cable-bar-pushdown`).
- Bewerk-/vervangroute draagt de catalogusprovenance. De losse route toont `tk603LosFreezePending` pas nadat een expliciete cataloguskeuze als pending is vastgelegd.
- Beide routes vereisen `tk504VerifySessionBinding` → `tk504_resolve_catalog_fk(catalog_id,provider_id)` → exact `TKC-xxxxxx`.
- De **productie-RPC bestaat** (bevestigd in `pg_catalog.pg_proc`). Definitie leest uit `public.movekit_catalog_fk_bindings` uitsluitend een binding voor de ingelogde eigenaar met exact catalogus- en provider-ID, `active=true` en `reviewed_at IS NOT NULL`.
- Read-only statistiek op productie (geen persoonlijke records, geen write): `public.exercises` heeft **356** `TKC-`-aliasrijen; **0** voor 001–226, **356** voor 227–582. `public.movekit_catalog_fk_bindings` heeft eveneens **356** actieve/gereviewde bindings, allemaal 227–582, en **0** voor 001–226. Alle 356 bindings verwijzen naar bestaande exercise-FK's.
- De database-migratieledger bevat de staged TK504/TK603-migraties van 7 november 2026. Daarom is de oude documentatieclaim 'stage niet in productie' **niet meer geldig**. De **oorspronkelijke 226 bindings zijn wel aantoonbaar onbeschikbaar**.
- Voor `TK-000188` en `TK-000063` kan de huidige resolver dus geen vereiste actieve binding teruggeven. Dat is een bewezen release-/voorzieningsgebrek. De directe relatie met de twee specifieke Android-write-responses is sterk onderbouwd, maar zonder fysieke per-write trace niet 100% bewezen.
- **Geen frontend-bypass** naar persoonlijke FK-shadows of gekopieerde `TKC`-IDs: dat doorbreekt herkomst, eigendom en security. Eerst gescheiden goedgekeurde provisioning met migratie, rollback, twee-accounts RLS- en echte deviceacceptatie.

## 3. Twee onafhankelijk reproduceerbare codebugs in `finishSession`
**Bug A: onstabiele retry na gedeeltelijke save.** Voorheen werden `_sessionRowPersistedAt`-markers na gedeeltelijk falen niet meteen duurzaam in de lokale trainingsdraft opgeslagen. Na harde afsluiting kon een retry de vijf eerder bevestigde legacy-sets opnieuw inserten met nieuwe UUID's. De fix roept op het gedeeltelijke-foutpad `persistTrainingDraft(true)` aan als er reeds successen zijn; geen tweede serverwriter.

**Bug B: offline gequeued was als 'opgeslagen' geteld.** `saved` omvat ook wachtrij-items, en een retry telde eerder gequeued items niet meer mee voor de status. Fix: per set `_sessionRowQueued` en een expliciete statusmelding `X opgeslagen, Y in wachtrij (nog niet bevestigd), Z mislukt`. Zonder queue blijft eerdere tekst behouden.

De nieuwe patches zijn uitsluitend additief in `index.html`. Het onderscheid tussen een lokale, duurzame draft en definitief bevestigde serverpersistency blijft in de release-UX verder te onderzoeken.

## 4. Tests: daadwerkelijk RED → GREEN, niet alleen verondersteld
**Tests uitgevoerd met Node 24 op afzonderlijke Windows-ontwikkelworktree; geen netwerk/proddata.**
- NIEUW `core/tk614ProgramPartialSaveStorage.test.js`: echte uitgehaalde `index.html`-functies in deterministische synthetische PostgREST-/JWT-/FK-sandbox. Baseline `492bf3d` **62 PASS / 6 FAIL** (precies zes `[RED#614]`-controles). Fixbranch **68 PASS / 0 FAIL**.
- Gedekt: zes uitgevoerde krachtitems, één skipped RDL, SkiErg, twee catalogusvervangingen; ontbrekende binding; partial confirm; crash/hervat; idempotente UUID; stale/mismatched owner; twee accounts; verkeerde FK; queue en losse catalogusregistratie met stabiele pending UUID.
- Aanpalende suites **PASS** op fixbranch: `tk603LooseExerciseTypedSession` 34; `tk603StableSessionUuid` 11; `tk603OfflineRestartProvenance` 12 scenario's; `tk504TypedFkSessionWriteGate` 27; `fConcept2FinalizeLifecycle` 127; `fOfflineExerciseSessionSync` 10; `fGuidedSaveReliability` 18; `fDuplicateSessionPrevention` 6; `fProgramResume` 7; `fExecutionReliability` 12; `productTelemetryLifecycle` 84.
- Test op `fConcept2FinalizeLifecycle` was aanvankelijk rood door een **onbedoelde CRLF-normalisatie** van `index.html` in de eerste editing-pass. Het oorspronkelijke gemengde CRLF/LF-patroon is bytebewust hersteld: daarna is de echte suite **127/127 PASS** en `git diff --stat` beperkt tot **13 insertions, 3 deletions**. Dit was geen productregressie maar een breekbare sabotage-test die letterlijke `\\n` controleert.
- **Brede lokale release-gate uitgevoerd:** na offline installatie van 124 testafhankelijkheden draaide `node core/release-gate.js` **504 controles, 1 zichtbare Android-skip, 1 rode gate**. De enige rode gate `core/fAndroidOcrAssetPackaging.test.js` vraagt om niet-gegenereerde Android-assets (`npm run cap:copy`); dezelfde test faalt op de ongewijzigde baseline met dezelfde oorzaak. **Geen productregressie geconstateerd, maar releasegate blijft formeel ROOD.** Het Chromium-deel van twee gerichte browser-suites meldt SKIP. GitHub-CI, echte Android, cloud-A/B-auth, reconnect en 226 bindings blijven OPEN.

## 5. Open releasegates en vervolg
1. Eén gecontroleerde, expliciet goedgekeurde provisioning voor catalogus-ID 001–226: review-/rechten-/licentiecheck, getypeerde FK binding in `TKC` namespace, alle bestaande persoonlijke/historische ID's onaangeroerd, rollback, partial-batch discipline, echte twee-account security gates. **Nog niet uitvoeren in productie.**
2. Fysiek Android 16 met compatibele branch: dezelfde 8-item programmastroom en losse Machine Pec Fly, met exact-once read-after-write, user A/B isolatie, veilige offline/retry en historie per `training_instance_id`.
3. Volledige release-gate (CI plus Chromium en fysieke device) groen op exact te publiceren commit; onafhankelijke code-review. Pas daarna gefaseerde APK-kandidaat.
4. Geen automatische historisch herstel of opnieuw wegschrijven op gebruikersaccount. Bewaar pending drafts totdat herstel veilig is.

**Wijzigingen:** `index.html`, `core/tk614ProgramPartialSaveStorage.test.js`, dit rapport. Geen nieuwe calculation-/AI-regels, tweede sessieschrijver, SQL of productionconfig.
