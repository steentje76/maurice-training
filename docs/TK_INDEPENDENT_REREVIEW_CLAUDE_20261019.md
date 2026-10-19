# TK-REL-SEC-02..04 — Onafhankelijke herreview PR #555 / #552 / #532 (Claude)

**Datum:** 19 oktober 2026
**Reviewer:** Claude (onafhankelijk van de auteur van PR #555)
**Werkbranch:** `review/claude-independent-20261019`, gestapeld op PR #555 HEAD `8f1b8ca3df64222f2f668c4227953d9d02c5c180`
**Status:** DRAFT. NO MERGE / NO DEPLOY / NO (HER)INSTALLATIE. Geen productiedata, -schema of secrets gewijzigd.

## 1. Geverifieerde uitgangssituatie

| Object | Verwacht | Vastgesteld (GitHub REST, 19-10-2026) |
|---|---|---|
| `main` | `160fefc2…` | `160fefc2e1dabc424922e907f7dc360e4f84543f` |
| PR #552 | Draft, HEAD `146bb4b5…`, base `main` | Draft, open, `146bb4b5469024c3539b3b67b2a1216778872c47`, mergeable `clean`, 35 commits, 38 bestanden |
| PR #555 | Draft, HEAD `8f1b8ca3…`, base = #552-branch | Draft, open, `8f1b8ca3df64222f2f668c4227953d9d02c5c180`, base `review/tk-consolidated-20261019`, 3 commits, 19 bestanden |
| PR #532 | signing foundation | Draft, `a8cae83ba13d9a61596c83292b95603b64fab89d`, base `main@7c33f779`, **`mergeable_state: dirty`** (conflict in `DECISION_LOG.md`) |
| Ancestry | main ⊂ #552 ⊂ #555 | bevestigd (`git merge-base --is-ancestor`) |
| CI #555 | Quality Gate 39208940905, Chromium 39208940935 | beide `success`, `head_sha` = `8f1b8ca3…`, event `pull_request`, attempt 1 |

Geen onverwachte branch- of commitafwijking: geen HARD STOP.

**Beperking CI-bewijs.** De joblogs zijn vanuit de reviewomgeving niet downloadbaar (Azure-blob buiten de netwerk-allowlist). De claims "646/646" en "0 skip" zijn daarom niet uit de CI-log gelezen, maar onafhankelijk gereconstrueerd door de zes Chromium-suites lokaal op exact `8f1b8ca` te draaien (zie §5).

## 2. Bevindingen

### BLOCKER-01 (security, accountisolatie) — A's wachtrij-item kan met B's token naar Supabase

**Pad.** `flushOfflineQueue()` controleert de identiteit vóór en na `sbFetch()`. `sbFetch()` doet bij een 401 echter `await sbRefreshOnce()` en daarna een **tweede** `fetch` met headers uit het gedeelde, muteerbare `SB_H`. Logt A uit en B in terwijl A's eerste verzoek (met verlopen token) onderweg is, dan ververst `sbFetch` B's token en verstuurt A's payload opnieuw **met B's identiteit**. De controle ná `sbFetch` ziet de wissel pas als de write al gebeurd is.

**Waarom RLS dit niet tegenhoudt (read-only geverifieerd in productie, `pg_policies`/`information_schema.triggers`/`pg_proc`).** `sessions`, `custom_trainings`, `custom_training_exercises`, `race_segments` en `program_blocks` hebben een BEFORE INSERT-trigger `set_user_id_from_auth()` die `NEW.user_id := auth.uid()` zet, ongeacht de payload. De RLS-policy `WITH CHECK (user_id = auth.uid())` slaagt daarna altijd. Een met B's token verzonden set van A wordt stil eigendom van B. De latere replay van A (merge-duplicates op dezelfde id) raakt vervolgens een rij die RLS voor A verbergt: het item blijft permanent hangen.

**Bewijs.** `core/fAuthSwitchRetryIsolation.test.js` T1 draait de ongewijzigde productiefuncties: RED op `8f1b8ca` (REST-verzoek met `Bearer at-B-…`), GREEN na herstel.

**Herstel (TK-REL-SEC-02), in twee rondes.**

1. `afa1edb`: `sbFetch` legt `uid0` vast vóór de eerste poging; bij een 401 met gewijzigde identiteit (vóór of ná de refresh) geen refresh, geen retry en geen uitlog.
2. `9a3bcf8`, na een tweede, onafhankelijke review van ronde 1: die 401 is retrybaar, dus `sbPostQ`/`sbSchrijfQDetail`/`sbPatchQ`/`sbDelQ`/`sbRpcQ` queueden de write — en `offlineQueueAdd()` stempelde dan de **huidige** gebruiker B als eigenaar. B's volgende flush verstuurde A's payload alsnog met B's token: het lek was uitgesteld, niet gesloten. Nu wordt de eigenaar vastgelegd op het moment van de write-aanroep en doorgegeven (`offlineQueueAdd(item, eigenaar)`); `sbPostQ` verstuurt bovendien niet als de identiteit tijdens zijn eigen `await` wisselde. T7 (RED op `afa1edb`) en T12 bewijzen dit.

### HIGH-01 (security) — verlate token-refresh van A overschrijft de sessie van B

`refreshAuthToken()` las `authSession` bij de start en schreef het antwoord ongeacht de dan actieve sessie terug. Omdat `authSignOut()` geen server-side `/auth/v1/logout` aanroept, blijft A's refresh-token geldig. Een refresh die liep tijdens uitloggen A / inloggen B, zette A's sessie terug: B werkt daarna ongemerkt onder A's identiteit (lezen én schrijven). Bewijs: T2 RED → GREEN. Herstel: uitgelogd of andere gebruiker → het antwoord wordt weggegooid; dezelfde gebruiker maar intussen al geroteerd → de nieuwere sessie blijft staan en de refresh meldt succes; uitloggen alleen als de sessie nog het refresh-token heeft dat faalde; `ensureValidSession()` wist alleen de sessie waarvoor de refresh liep.

**Regressie in ronde 1, hersteld in ronde 2.** De eerste versie vergeleek op object-identiteit. `ensureValidSession()` vervangt het sessieobject echter bij elke terugkeer naar de app, en de timer-refresh loopt niet via `sbRefreshOnce()`. Een refresh van **dezelfde** gebruiker werd dan weggegooid: mislukte opslag, lege schermen en een verouderd refresh-token (risico op gedwongen uitlog door reuse-detectie). T8–T11 dekken dit; T8 is RED op `afa1edb`.

### HIGH-02 (privacy, accountisolatie) — wachtrij-UI negeerde de eigenaarsgrens

`getPendingSessionRows()` toonde wachtende sets van **alle** eigenaren in Home/Logboek; `renderOfflineQueueModal()` toonde inhoud van andermans en eigenaarloze items met een verwijderknop; `removeOfflineQueueItem()` en `deleteSessionDirect('pending_…')` verwijderden zonder eigenaarscheck en negeerden het resultaat van de lokale delete. Gebruiker B kon A's niet-gesynchroniseerde trainingsdata zien en definitief verwijderen. Bewijs: `core/fQueueUiOwnerIsolation.test.js` U1–U5, 9/9 RED → GREEN. Herstel (TK-REL-SEC-03): `tkIsEigenWachtrijItem()` met dezelfde regel als de flush; niet-eigen items alleen als aantal, bewaard en zonder inhoud; onleesbare wachtrij wordt "status onbekend", nooit "geen items".

### HIGH-03 (testkwaliteit, ingevoerd door #555) — de cross-account-suite was een stille no-op

`core/fOfflineQueueCrossAccountLeakage.test.js` — de suite die juist P1-05 (cross-account-lekkage) bewaakt — draaide sinds `4e684a7` geen enkele assertie meer. Zijn nep-IndexedDB riep bij `getAll` nooit `oncomplete` aan; de nieuwe strikte lezer wachtte daar eeuwig op, en Node stopte met exit 0 zodra de event loop leeg was. De suite print alleen de kop en telt in Quality Gate én `release-gate.js` als geslaagd (op `main`: "3 tests geslaagd"). Case P1-05-C verwachtte bovendien het oude beleid (legacy wél versturen) en zou bij uitvoering falen. Herstel: fixture rondt de transactie af, P1-05-C volgt het quarantainebeleid, en een exit-guard laat elke suite falen die niet volledig afrondt. Dezelfde guard staat in de drie nieuwe suites; zonder die guard overleefde mutatie M22 om precies deze reden.

### MEDIUM-01 (stabiliteit) — `offlineQueueAdd/Remove` hangen bij een commit-abort

Beide functies hadden geen `onabort`. Een transactie die tijdens commit afbreekt (bv. `QuotaExceededError`) vuurt alleen `abort`: de promise eindigt nooit. Bij `offlineQueueRemove` blijft `flushOfflineQueue()` hangen en blijft `_flushBezig` `true` tot herstart; bij `offlineQueueAdd` eindigt opslaan nooit. De test "IDB queue-deletefout" in #555 mockt alleen `return false` en mist dit pad. Gereproduceerd tegen een spec-conforme IndexedDB (fake-indexeddb, buiten de repo) én met `core/fQueueTxAbortSettles.test.js`. Herstel (TK-REL-SEC-04): `tx.onabort` → reject → bestaande catch → `false`.

### MEDIUM-02 (databehoud, niet gerepareerd) — legacy- en nieuwe eigenaarloze items blijven onbeperkt in quarantaine

#555 verstuurt `owner_uid == null` niet meer (terecht). Er is echter geen reconciliatiepad: de items blijven onbeperkt staan en blokkeren de updatecontrole permanent. Bovendien weigeren `sbPatchQ`/`sbDelQ` (zonder detail) en `sbRpcQ` — anders dan `sbPostQ` — niet als er géén eigenaar bekend is (geen sessie én geen `tk_cache_owner_uid`, bv. na uitloggen): ze maken dan **nieuwe** items zonder eigenaar aan die nooit meer worden verstuurd terwijl de aanroeper `true` krijgt (aangetoond met echte IndexedDB). Ronde 2 legt de eigenaar wel vast als die bekend is, maar weigert niet bij een ontbrekende eigenaar: dat verandert de returnwaarde voor ruim 50 aanroepers en vraagt een eigen impactanalyse. Vereist een eigenaarsbesluit (zie §7).

### MEDIUM-03 (databehoud, niet gerepareerd) — dubbele activiteiten bij verloren antwoord

`activities` en `activity_laps` (handmatige runs, Concept2/wearable-rondes) hebben geen client-id, geen natuurlijke unique key (alleen `pkey(id)`) en staan niet in `IDEMPOTENT_TABELLEN_MET_CLIENT_ID`. Verloren antwoord + replay = dubbele rij. Pre-existing.

### MEDIUM-04 (testkwaliteit) — browsersuites die nergens echt draaien

De Quality Gate-job installeert geen Playwright: alle browsersuites in `core/*.test.js` eindigen daar met SKIP en exit 0. De Chromium-workflow draait uitsluitend zes vaste suites. `fInzichtV01BrowserRuntime` en `fVoedingUXSetA` falen in een echte Chromium al op `main` (`.tk-overview-cell`/voedingsrij niet gevonden) en worden in CI dus nooit rood. Geen enkele CI-browsersuite raakt de wachtrij- of accountisolatiewijzigingen: die zijn alleen in Node-`vm` met mocks getest. Pre-existing.

### MEDIUM-05 (multi-instance) — geen tab-overstijgende flush-lock

`_flushBezig` geldt per JavaScript-context. Twee tabs/PWA-vensters delen dezelfde IndexedDB-wachtrij en kunnen hetzelfde item gelijktijdig versturen. Voor tabellen met client-id en upsert onschadelijk; voor MEDIUM-03-tabellen een dubbele rij. Aanbeveling: `navigator.locks.request('tk-offline-flush', …)`. Pre-existing.

### LOW

- **LOW-01** `fHomeDagfactorBasisSafety` (uit #552) bevat een afbrekingscheck op 360px die van fontmetriek afhangt: lokaal 194/195, in CI groen. Op een echt Android-toestel met andere fonts niet bewezen.
- **LOW-02** #552/#555 wijzigen productiecode zonder `APP_VER`/`versionCode`-bump: verschillende builds dragen `4.70.25`/47025.
- **LOW-03** `authSignOut()` trekt de refresh-token niet server-side in.
- **LOW-04** `offlineDb()` opent per aanroep een nieuwe verbinding zonder `onblocked`/`close`.
- **LOW-05** Directe `fetch(...SB_H...)`-writes buiten `sbFetch` lezen het token per aanroep: een accountwissel tijdens de JSON-import (sessions/weight_log/body_comp in één lus) schrijft de rest van A's bestand bij B. Overige directe writes zijn eenmalig zonder retry. Pre-existing.
- **LOW-06** Eigen legacy-items zonder `owner_uid` (en items die na uitloggen zonder eigenaar zijn gequeued) zijn nu in de UI alleen als aantal zichtbaar en niet te verwijderen; de badge en de updatecontrole blijven ze tellen. Veilig, maar zonder oplospad: zie MEDIUM-02.

## 3. Positief geverifieerd in PR #555

- `tkLeesWachtrijStrikt()` accepteert alleen een array na `oncomplete`, en weigert bij `onerror`/`onabort`/ontbrekend resultaat (ook tegen echte IndexedDB-semantiek bevestigd).
- Sync van eigen trainingen en de ouder-kindcontrole zijn fail-closed bij een onleesbare wachtrij.
- Legacy-items zonder `owner_uid` worden niet meer onder een volgende gebruiker verstuurd.
- Mislukte lokale delete stopt de flush; badge toont "Offline-opslag onbekend".
- Geen wijziging in Calculation/Context/Decision/Evidence/AI. #552 wijzigt `readiness_day.v1.1` alleen in de Decision Engine; `coaching.js` alleen een commentaarregel.

## 4. Acceptatiecontract serverbevestiging (voorstel, niet geïmplementeerd)

Een HTTP 2xx of een lege wachtrij is **geen** bewijs van volledige serveropslag (bv. `ignore-duplicates` geeft 2xx met lege representatie als er al een — mogelijk andere — rij bestond; een PATCH met 0 rijen is `superseded` of RLS-gefilterd). Voorgestelde statusmachine per lokaal object:

`lokaal` → `gequeued` → `verzonden` → `server-2xx` → **`geverifieerd`** (alleen dit telt voor de-installatie)

`geverifieerd` vereist read-after-write met de **zelfde identiteit als de eigenaar**:

1. **Eigenaar:** `owner_uid` lokaal = `auth.uid()` van het token waarmee wordt teruggelezen; serverrij `user_id` = dezelfde uid.
2. **Record-ID:** client-UUID voor elke gequeuede insert (randvoorwaarde: MEDIUM-03-tabellen eerst een client-id).
3. **Inhoud:** canonieke hash over de door de client verstuurde velden (gesorteerde sleutels, dezelfde normalisatie als `tkNormalizeSessionsRow`), vergeleken met dezelfde velden uit de serverrij.
4. **Volledigheid:** ouder + kinderen tellen: `custom_trainings` + aantal `custom_training_exercises`; `training_instances` + `sessions`; `nutrition_meals` + `nutrition_meal_items`.
5. **RPC's:** alleen verifieerbaar als de functie een id/rij teruggeeft; anders `onbekend`.
6. **Updatepoort:** `tkUpdateGereedheid().veilig` pas `true` bij lege strikte wachtrij (inclusief items van andere/onbekende eigenaren), geen draft/Guided/onbevestigde Builder én een geslaagde readback van alle lokaal ontstane ids sinds de laatste bevestigde readback. Bij twijfel: `onbekend`.

Dit vraagt een leesroute per tabel en is geen kleine, migratieloze wijziging: bewust niet in deze review geïmplementeerd.

## 5. Testresultaten

### 5.1 CI-bewijs PR #555 (geverifieerd, niet overgenomen)

- Quality Gate 39208940905 en Chromium 39208940935: `success`, `head_sha` = `8f1b8ca`. Logs niet downloadbaar (zie §1).
- **646 asserties onafhankelijk gereconstrueerd** door de zes CI-browsersuites lokaal in Chromium op `8f1b8ca` te draaien: fHomeDagfactorBasisSafety 195, fRecoveryCommunicationConsistency 91, fInzichtHerstelBelasting 170, fSetLoggingUx 131, fExecutionIntegrity 34, fUpdateReadiness 25 = **646**. Lokaal 645/646: de afwijking is de fontafhankelijke afbrekingscheck (LOW-01).
- Geen van deze zes suites raakt de wachtrij- of accountisolatiewijzigingen van #555.

### 5.2 Volledige Quality Gate-sequentie (lokaal)

| Boom | Omgeving | core | coaching | native Concept2 |
|---|---|---|---|---|
| `8f1b8ca` (#555) | Node 22 + Chromium | 452/455 | ✓ | 176/176 |
| `dba01f5` (#556) | Node 20, geen Playwright (= CI) | **458/458** | ✓ | 176/176 |

De drie falers op `8f1b8ca` met Chromium: `fInzichtV01BrowserRuntime` en `fVoedingUXSetA` (falen identiek op `main`, MEDIUM-04) en LOW-01. In de CI-gelijke omgeving eindigen 16 suites met SKIP.

### 5.3 GitHub CI Draft-PR #556

| HEAD | Quality Gate | Chromium | Toelichting |
|---|---|---|---|
| `1cee17b` | success | success | ronde 1 |
| `9a3bcf8` | **failure** | success | `fGuidedSaveReliability` telt exact zes uitgangen van `sbPostQ` |
| `7fb824f` | **failure** | success | `fOfflineDataIntegrity` eist de letterlijke eigenaarsguard |
| `dba01f5` | **success** (check-run 117962656315) | **success** (117962654398) | definitief |

Beide CI-falers waren broncodecontracten; opgelost zonder bestaande tests te wijzigen.

### 5.4 Negatieve tests en echte IndexedDB

- `fAuthSwitchRetryIsolation` 25/25 (T1/T2/T4/T5 RED op `8f1b8ca`; T7/T8 RED op `afa1edb`), `fQueueUiOwnerIsolation` 10/10 (9/9 RED op `8f1b8ca`), `fQueueTxAbortSettles` 5/5, `fOfflineQueueCrossAccountLeakage` 3/3 (was 0 uitgevoerd).
- Productiefuncties tegen een spec-conforme IndexedDB (`fake-indexeddb`, buiten de repo): `offlineQueueAdd/Remove` hingen bij commit-abort op `8f1b8ca`; eindigen nu met `false`. Strikte lezer weigert terecht; lenient `offlineQueueAll` levert bij dezelfde abort data/`[]`.

### 5.5 Mutation tests

**#555-tests op `8f1b8ca`** (11 mutaties op de #555-invarianten): 7 gedood, **4 overleefd** — M4 identiteitscheck aan begin van elke flush-iteratie, M8 `onabort` in de strikte lezer, M9 ouder-check fail-open, M11 badge verbergt onleesbare wachtrij. M10 werd alleen "gedood" doordat de mutatie de stille cross-account-suite weer liet draaien (HIGH-03).

**Definitieve stand `dba01f5`** (25 mutaties: de 11 hierboven + 14 op de reparaties van deze review): **25/25 gedood.** Op `dba01f5` 24/25; de overlever M10 (flush leest de wachtrij weer lenient: storing stil verborgen) was eerder alleen "gedood" via de stille suite en wordt nu gedood door T13. Tussenrondes onthulden ook overlevers in de eigen reparaties (M12/M13, M14, M20, M22); elk kreeg een eigen test. M22 overleefde aanvankelijk doordat een hangende `await` Node met exit 0 liet stoppen — reden voor de exit-guard in alle nieuwe suites. Harness: `scratchpad/mut/run-mutations.js` (muteert een kopie van `index.html`, draait de suites tegen die kopie).

### 5.6 Onafhankelijke controle van deze review

Een aparte agent die de reparaties niet schreef, heeft ronde 1 (`afa1edb`) gereviewd en twee terechte problemen gevonden (het uitgestelde lek via het queue-pad, en de regressie bij dezelfde gebruiker). Beide zijn met RED-bewijs in ronde 2 hersteld.

### 5.7 Android, Concept2, wearables

- **Geen fysiek Android-toestel beschikbaar.** Er is geen APK gebouwd, geïnstalleerd of vrijgegeven. Niets hier is toestelacceptatie.
- Concept2: alleen de native transporttests (176/176, gesimuleerde BLE). Geen PM5/RowErg/BikeErg/SkiErg-hardware.
- Health Connect/wearables: alleen bestaande unit-suites (o.a. `fWearableTokenLifecycle` groen). Geen toestelbewijs.

## 6. Android-signing (PR #532) en releaseveiligheid

Geverifieerd: `applicationId com.trainingskompas.app`; `versionCode 47025`/`versionName 4.70.25` (ADR noemt nog 47023 — verouderd); release-buildtype zonder debug-fallback; `allowBackup="false"`; geen keystores in Git; `build-internal` alleen via `workflow_dispatch` + environment `android-internal`; keystore alleen in `$RUNNER_TEMP` met always-cleanup; vingerafdruk-gate tegen `android/signing/INTERNAL_CERT_SHA256` (nog `NOG_NIET_VASTGESTELD`).

Hardening vóór de eerste echte signing:

1. **`source_sha` niet aan `main` gebonden.** Elke commit (ook een ongereviewde branch) kan met de stabiele sleutel worden ondertekend. Eis `git merge-base --is-ancestor "$SOURCE_SHA" origin/main` (of een beschermde tag).
2. **Build en signing in één job.** `npm ci`/`cap:sync`/Gradle draaien vóór de signingstap in dezelfde runner; een gecompromitteerde dependency kan een achtergrondproces achterlaten dat de signing-omgeving leest. Splits in een build-job (ongesigneerde APK + sha256) en een signing-job zonder `npm`.
3. **Actions op tag, niet op commit-SHA** (o.a. third-party `android-actions/setup-android@v3`). Pin op SHA.
4. **Provenance is zelf gerapporteerd** (tekstbestand + sha256 in hetzelfde artefact). Voeg `actions/attest-build-provenance` toe.
5. **Migratieprocedure §6** vertrouwt op de oranje badge. Na deze review telt die badge ook items van andere/onbekende eigenaren mee (correct), maar badge-afwezigheid is geen serverbewijs. Vervang stap 1–3 door "Synchroniseren en controleren" + het acceptatiecontract van §4.
6. PR #532 heeft een mergeconflict met `main` en een verouderde baseline (v4.70.23): rebase vereist.

D1–D4 zijn **niet** verleend. Geen sleutel aangemaakt, geen secret of environment gewijzigd, geen APK gebouwd of vrijgegeven, geen installatie verwijderd.

## 7. Open besluiten en voorwaarden

### 7.1 Effect op PR #552 en PR #555

Niet gewijzigd. Draft-PR #556 is gestapeld op de #555-branch; geen tekstuele conflicten met #555, #554 (parallelle UX) of #552. #556 voegt alleen de #555-branch toe als base in de Chromium-workflow. **PR #555 zonder #556 is voor accountisolatie NO-GO** (BLOCKER-01 en HIGH-01/02/03 staan open).

### 7.2 PCC

Geen geautoriseerde schrijfroute voor auditregistratie beschikbaar (Data API exposeert alleen `pcc.products` en bootstrap-RPC's); er is niets in PCC geschreven en geen admin-SQL gebruikt. Supabase-productie is uitsluitend read-only geraadpleegd (`information_schema`, `pg_policies`, `pg_proc`, `pg_constraint`).

### 7.3 Eigenaarsbesluiten

- **D1–D4** (signing): niet verleend, niets uitgevoerd.
- **E1** Reconciliatie van items zonder bewijsbare eigenaar (MEDIUM-02): bv. een expliciete actie "onbekende items bekijken/verwijderen" met sterke bevestiging, of export.
- **E2** Server-side: `set_user_id_from_auth()` laat een payload-`user_id` die afwijkt van `auth.uid()` nu stil overschrijven. Weigeren in plaats van overschrijven maakt RLS weer een onafhankelijke grens. Productiemigratie: apart besluit.
- **E3** Read-after-write-acceptatiecontract (§4) als poort vóór elke de-installatie.

### 7.4 Voorwaarden voor veilige integratie (#552 + #555 + #556 → `main`)

1. Expliciet PO-besluit om #556 in #555 op te nemen (of #555 te vervangen).
2. Quality Gate en Chromium groen op de exacte integratie-HEAD, na eventuele merge van #554.
3. E1 genomen, of de permanente quarantaine expliciet geaccepteerd.
4. `fInzichtV01BrowserRuntime` en `fVoedingUXSetA` hersteld en aan de Chromium-workflow toegevoegd, of expliciet als bekend rood geregistreerd.
5. `APP_VER`/`versionCode`-bump vóór iedere build.
6. Post-merge: regressie op de feitelijke `main`-SHA; bij falen revert via Git, nooit lokale sporterdata wissen.

### 7.5 Voorwaarden voor een Android-bètarelease

1. D1–D4 genomen; PR #532 gerebased en hardeningpunten 1–4 uit §6 verwerkt.
2. E3 geïmplementeerd en gebruikt in de migratieprocedure (§6 punt 5), plus client-id's voor `activities`/`activity_laps` (MEDIUM-03).
3. Fysieke toesteltest: installatie, update over bestaande installatie, offline/online, accountwissel, Concept2-hardware, Health Connect.
4. Build met vastgelegde vingerafdruk, provenance-attestatie en sha256; nooit een debug-fallback.

### 7.6 Eindoordeel per onderdeel

| Onderdeel | Oordeel | Kern |
|---|---|---|
| Code-integriteit | **CONDITIONAL GO** | #555 + #556: CI groen, 458/458, mutaties; voorwaarde §7.4-1/2 |
| Security en accountisolatie | **CONDITIONAL GO** (alleen met #556; #555 alleen: **NO-GO**) | Rest: MEDIUM-05, LOW-05, E2 |
| Offline databehoud | **CONDITIONAL GO** | Quarantaine zonder oplospad (E1), dubbele activiteiten (MEDIUM-03) |
| Serverbevestiging | **NO-GO** | Geen read-after-write; 2xx of lege wachtrij is geen bewijs |
| Integratiegereedheid | **CONDITIONAL GO** | Voorwaarden §7.4 |
| Android-buildgereedheid | **NO-GO** | D1–D4 open, #532 conflict/hardening, geen versionbump |
| Android-installatiegereedheid | **NO-GO** | Geen stabiele identiteit, geen serverbevestiging, geen toestelbewijs |
| Productiegereedheid | **NO-GO** | Volgt uit bovenstaande |
