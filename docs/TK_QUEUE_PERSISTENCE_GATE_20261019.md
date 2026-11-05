# TK-REL-SEC-05 — Duurzame offline-writes als succesvoorwaarde

**Datum:** 19 oktober 2026  
**Status:** Draft; technische herstelkandidaat, geen releasebesluit.  
**Base:** PR #556, HEAD `142e710914954467815efb9bf962c0999ec5955f` (de onafhankelijke Claude-review).

## Reproduceerbaar defect

`sbPatchQ`, `sbDelQ` en `sbRpcQ` retourneerden voor offline-, netwerk- en retryable-serverfoutpaden soms `true` (of `{ok:true,rows:null}`), zelfs wanneer `offlineQueueAdd()` aantoonbaar `false` teruggaf. In dat geval is de mutatie **noch serverbevestigd, noch duurzaam lokaal opgeslagen**. Een aanroeper kan een valse succesmelding tonen of het lokale invoerformulier sluiten. Bij onbekende eigenaar werd eveneens zonder valide eigenaarsbewijs gequeued.

## Reparatie

- Alle drie de wrappers accepteren een wachtrij-write alleen bij `offlineQueueAdd(...) === true`.
- Ontbrekende `owner_uid` wordt fail-closed geweigerd: er wordt niet met een latere identiteit gestempeld.
- Bestaande directe server-succespaden en normale succesvolle offline-queuecontracten blijven behouden.
- `sbPatchQ(...,{returnRows:true})` retourneert `{ok:false,rows:null,superseded:false}` bij opslagfalen.
- `sbRpcQ` verstuurt `rpc_offline_queued` uitsluitend na een bevestigde IndexedDB-commit; bij falen wordt alleen metadata zonder argumenten gelogd als `rpc_queue_failed`.
- `fInternalCalendarHardening` test de nieuwe queue-helperdelegatie i.p.v. de verouderde eis dat `offlineQueueAdd` letterlijk in de `catch`-regel staat.

## Onafhankelijk reproduceerbare tests

`node core/fQueueWriteAcknowledgement.test.js`

Test voert de oorspronkelijke productiecode uit via Node VM en controleert PATCH, DELETE en RPC voor offline-fout, succesvolle offline commit, retryable 503, netwerkexception, ontbrekende eigenaar en directe serversuccessen, inclusief `returnRows` en eventlabels.

**RED vóór fix:** PATCH met offline `offlineQueueAdd=false` retourneerde `ok:true`.  
**GREEN na fix:** 34/34 controles.  
**Bestaande doeltests:** `fInternalCalendarHardening` 29/29, `fBackendOrderingIntegrity` 23/23, `fOfflineDataIntegrity` 13/13, `fGuidedSaveReliability` 17/17, `fMyTrainingScheduling` 39/39 en overige relevante suites lokaal geslaagd. Definitieve GitHub QG en Chromium afzonderlijk verifiëren op de PR HEAD.

## Bewust niet opgelost (release blijft NO-GO)

- Sommige bestaande schermhandlers **negeren** de boolean van een write-wrapper; een UI-successmelding is daarom nog niet overal betrouwbaar. Vooral voeding-, supplement- en agendaschermen vragen een aparte caller-by-caller impactreview.
- `activities`/`activity_laps` missen bewezen idempotente client-ID's; verloren serverantwoorden kunnen dubbele rijen opleveren.
- Echte server-read-after-write met record-ID, eigenaar, inhoud en kinderen is nog niet gerealiseerd.
- Legacy-wachtrij-items met onbekende eigenaar blijven in quarantaine zonder gebruikersgestuurde reconciliatie.
- Concurrente flush van meerdere tabs heeft nog geen cross-tab lock.
- Directe REST-importwrites buiten de gemeenschappelijke wrappers kennen mogelijk accountwisselrisico.
- Geen fysiek Android-/Concept2-/Health Connect-acceptatiebewijs. Signing D1–D4 en PR #532 blijven open.

**Regel:** geen merge naar main, geen production changes, geen Android-(her)installatie of lokale data-verwijdering zonder onafhankelijke heracceptatie en expliciete toestemming.
