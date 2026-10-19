# Trainingskompas — onafhankelijke integratieheracceptatie, ronde 1

**Datum:** 19 oktober 2026
**Status:** DRAFT / STAGING / **NO MERGE, NO DEPLOY, NO ANDROID-(HER)INSTALLATIE**

## 1. Bron en werkmethode

- Repository: `steentje76/maurice-training`.
- Ongewijzigde `main`: `160fefc2e1dabc424922e907f7dc360e4f84543f` (v4.70.25).
- Basis voor deze geconsolideerde review: `bf8c1e5ad27865ef66c695bbe26400e18f76f67d` (PR #551). GitHub-vergelijking: 32 commits vóór `main`, 0 achter, 35 gewijzigde bestanden. Het is een aparte branch/PR; geen rechtstreekse wijziging van `main`.
- PR #550 is gestapeld op #547 en heeft niet de eindcorrecties van #551; deze kandidaat bevat beide via de bestaande Git-ancestry.
- Beoordelingsscope ronde 1: read-only hoofdvergelijking van wijzigingen in `index.html`, `core/decision.js`, `core/coaching.js`, synchronisatie/wachtrij, Playwright workflow, gekoppelde testcontracten en releaseblokkades. Geen claim van volledige formele securityaudit over alle code.

## 2. Afzonderlijke positieve bewijzen vóór deze ronde

- PR #551 SHA `bf8c1e5`: GitHub Quality Gate run [39199368111](https://github.com/steentje76/maurice-training/actions/runs/39199368111) **SUCCESS**.
- Echte Chromium-acceptatie run [39199368112](https://github.com/steentje76/maurice-training/actions/runs/39199368112) **SUCCESS**, 646/646 checks, zes suites, nul SKIP en nul FAIL. Deze runs zijn **niet** op de nieuwe heracceptatie-HEAD uitgevoerd.
- Chromium/Android-toesteltests op de Windows-pc zijn niet als groen meegeteld.

## 3. Nieuwe onafhankelijke bevinding TK-INT-01

**Ernst: P1 integriteitsrisico; oorspronkelijke bron `syncCustomTrainingsFromSupabase()`.**

Een `offlineQueueAll()`-fout werd lokaal genegeerd (`catch(_){ }`). Daardoor werd het nog niet verwerkte offline-delete-tombstone niet gecontroleerd en haalde de sync een op de server aanwezige maar lokaal verwijderde training terug. Een afzonderlijk Node/VM-tegenvoorbeeld met een falende queue-read reproduceerde de wederopstanding op `bf8c1e5`.

**Herstel in deze kandidaat:** de synchronisatie vereist één geldige array-snapshot van de offlinequeue. Leesfouten en verkeerd getypeerde resultaten stoppen het syncpad vóór mutaties. Zowel het filteren van tombstones als herstelwrites hergebruiken dezelfde gecontroleerde snapshot; de twee eerdere paden die leesfouten als lege queue interpreteerden zijn verwijderd.

**Nieuwe test `core/fOfflineDeleteFailClosed.test.js`:** zes gerichte scenario's: onleesbare IndexedDB/wachtrij; geen state- of opslagmutaties bij leesfout; verkeerd type; pending DELETE; geldig lege queue; behoud van bestaande lokale training. Alle zes lokaal groen.

## 4. Overige nieuwe verificatie vóór push

Gerichte niet-browser suites lokaal groen: `fExecutionIntegrity` 19, `fUpdateReadiness` 12, `fRecoveryContextFreshness` 61, `fDecisionRecoveryPlanScope` 26, `fLibraryValidation` 18, `fSetLoggingUx` 27, `fRecoveryCommunicationConsistency` 27. Browsergedeelten zijn lokaal SKIP, dus niet geaccepteerd op basis van deze lokale runs.

De bestaande Chromium-workflow is expliciet aan `pull_request` richting `main` toegevoegd zodat de geconsolideerde Draft-PR echte browseracceptatie krijgt op zijn PR-mergekandidaat. `main` en bestaande Draft-branches zijn niet aangepast.

## 5. Nog vereiste harde vrijgavepoorten

1. Nieuwe GitHub Quality Gate **en** volledige zes-suite Chromium-test op de **exacte** geconsolideerde PR-HEAD.
2. Onafhankelijke finale review na eventuele CI-correcties en expliciet eigenaar-/PO-mergebesluit, inclusief beslissing over oude gestapelde drafts.
3. Android signing D1–D4 uit PR #532; geen signing-secret / cert-wijziging in deze review.
4. Onafhankelijke serverbevestiging van uitsluitend lokale gegevens en veilige migratie (de lokale updatecontrole is expliciet **geen** uninstalltoestemming).
5. Fysieke Android/OAuth-toestelacceptatie; de huidige installatie blijft staan.

**Voorlopig oordeel:** gerichte P1-fout hersteld en statisch onderbouwd; integratierelease **NO-GO** tot de bovengenoemde gates aantoonbaar zijn afgesloten.
