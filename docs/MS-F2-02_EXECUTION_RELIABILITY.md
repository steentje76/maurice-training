# MS-F2-02_EXECUTION_RELIABILITY.md — Trainingskompas

**Auditmethode:** volledige lezing van de execution-lifecycle-kernfuncties: `finishSession` (afronden), `execLeaveDiscard`/`confirmLeave` (verwerpen/pauzeren), `persistTrainingDraft`/`scheduleAutosave` (tussentijdse opslag), `previewStartTraining` (start vanuit Preview). Doel: bevestigen of timer/logging/resume/finish/discard/offline-edge-cases al dan niet gesloten zijn, per de acceptance gate.

## Bevinding: de bestaande code is al zeer volwassen
In tegenstelling tot MS-F2-01 (waar 2 concrete, actieve defecten werden gevonden), toont deze audit dat de execution-reliability-kern al door meerdere eerdere sprints zorgvuldig gehard is. Elke onderzochte functie bevat expliciete, historische bugfix-referenties:

| Functie | Garantie | Bewijs in code |
|---|---|---|
| `finishSession` | Dubbele-tap-bescherming (`finishSessionBezig`-guard) | Regel 15989 |
| `finishSession` | Gegarandeerde guard-reset via `finally`, ook bij fout | Regel 16148-16151 |
| `finishSession` | Geen silent-failure — expliciete toast + sessie blijft intact bij schrijffout | Commentaar "F0.7N (FASE 41): geen fake success" |
| `finishSession` | `completeTrainingInstance()` faalt nooit de al-opgeslagen sessie | Commentaar "Fase 2 — LEVENSCYCLUS VAN EEN TRAINING-INSTANCE", verwijst naar een eerder gevonden weesrij-probleem (139 rijen, 128 zonder sessie) |
| `execLeaveDiscard` | Expliciete, onomkeerbare-actie-bevestiging | `confirmModal` met `danger:true` |
| `execLeaveDiscard` | Correcte state-reset (`activeInstanceId`, draft, BLE-verbindingen) | Commentaar verwijst naar test "EX-DISCARD-2", A5-hardening (v4.67.0) |
| `persistTrainingDraft` | Debounced (1.2s) autosave met zichtbare save-status (saved/dirty/saving) | `scheduleAutosave`, `updateSaveIndicator` |
| `persistTrainingDraft` | Bij mislukte write: status blijft "dirty" (zichtbare waarschuwing), nooit stilzwijgend "saved" | `catch(e){saveState='dirty';}` |
| `persistTrainingDraft` | `instanceId` wordt meebewaard in de draft — voorkomt weesrijen bij app-afsluiting | Commentaar verwijst naar migratie v446, die eerder zulke weesrijen moest opruimen |
| `previewStartTraining` | Dubbele-tap-bescherming op de Start-knop zelf | `previewStarting`-guard |

**Architectuurnotitie (geen defect):** tijdens een actieve training worden sets bijgehouden in-memory (`sessionLog`) en periodiek als draft naar `localStorage` geschreven (debounced autosave). De daadwerkelijke, canonieke database-schrijfactie (naar `sessions`) gebeurt pas bij `finishSession()`, niet per individuele set. Dit is een bewuste, functionerende architectuurkeuze (batch-write-bij-afronden + lokale crash-herstelbare draft), geen "geen persistence tot finish"-risico: bij een crash/app-sluiting vóór afronden herstelt `startT`/`startCustomTraining` de volledige sessie uit de `localStorage`-draft (inclusief `instanceId`), niet alleen de laatst-bewaarde set.

## Geen nieuw defect van vergelijkbare ernst gevonden
Deze audit heeft, in tegenstelling tot MS-F2-01, geen actief, live-exploiteerbaar defect blootgelegd. Conform opdracht sectie 8 ("Geen grote rewrite als bestaande flow betrouwbaar te versterken is") is er geen wijziging aangebracht aan `index.html` — een "fix" zonder een daadwerkelijk gevonden probleem zou zelf een nieuw risico introduceren.

## Wél toegevoegd: regressiecontract voor de bestaande garanties
De hierboven genoemde garanties bestonden tot nu toe alleen als code + commentaar, zonder geautomatiseerde test die ze vastlegt. Nieuw: `core/fExecutionReliability.test.js` (12/12 assertions, sabotagebewijs geleverd voor de dubbele-tap-guard) — legt vast dat een toekomstige wijziging deze garanties niet stilzwijgend kan slopen.

## MS-F2-02 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Timer/logging/resume/finish/discard/offline edge cases closed."*
- Timer: canonieke wall-clock-tijd (`trainStart`/`pausedAccumMs`), niet afhankelijk van de interval-tick zelf — geverifieerd correct.
- Logging: batch-write-bij-finish met crash-herstelbare `localStorage`-draft — geverifieerd correct.
- Resume: `instanceId` + volledige `sessionLog`/`sessionExtra` hersteld uit draft — geverifieerd correct (na MS-F2-01 ook voor Repeat Workout/Programma-training).
- Finish: dubbele-tap-bescherming + gegarandeerde state-reset + geen silent failure — geverifieerd correct.
- Discard: expliciete bevestiging + correcte cleanup — geverifieerd correct.
- Offline: geen dedicated offline-sync-queue (bewust, hoort bij F13 per roadmap — opdracht sectie 13 bevestigt dit), maar de bestaande `sbPatchQ`-queue vangt een verbroken verbinding bij `completeTrainingInstance()` op zonder de al-opgeslagen sessie te verliezen.

**Resultaat: CLOSED** — acceptance gate bevestigd behaald op basis van bestaand, geverifieerd gedrag; geen openstaand kritiek gap binnen de scope van deze sprint.
