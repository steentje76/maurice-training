# MS-F2-01_CANONICAL_TRAINING_START.md — Trainingskompas

**Auditmethode:** repo-brede grep naar alle `onclick`-aanroepen die naar een trainingsstart-functie leiden, gevolgd door volledige lezing van elke startfunctie (`startT`, `startCustomTraining`, `startProgramBlockTraining`→`launchProgramTrainScreen`, `startRepeatWorkout`) en de bestaande Preview-adapterketen (`openTrainingPreview`→`startInstanceFromDefinition`→`createTrainingInstance`).

## Entrypoint-matrix

| Entrypoint | Locatie | Pad | Convergeert via Preview? |
|---|---|---|---|
| Vaste training (Home/Training-tab, 4×) | regels 6643, 6689, 21157, 21225 | `openTrainingPreview('vast', id)` | ✅ Ja |
| Mijn trainingen (custom, 2×) | regels 19691, 19707 | `openTrainingPreview('custom', id)` | ✅ Ja |
| Programma-blok | regel 16799 | `startProgramBlockTraining(blockId)` → `maybeShowScheduleGate` → check-in-modals → `launchProgramTrainScreen` | ❌ Nee — eigen pad, bypast Preview volledig |
| Repeat Workout (uit geschiedenis) | regel 5151 (modal), aanroep vanuit `openRepeatWorkout(date,t)` | `startRepeatWorkout()` | ❌ Nee — eigen pad, bypast Preview volledig |

**Conclusie:** 6 van de 8 concrete entrypoints (alle vaste-training- en custom-training-starts) lopen al via de canonieke `openTrainingPreview()`-adapter uit een eerdere "Werkblok"-sprint, die op zijn beurt naar `startInstanceFromDefinition()` → `createTrainingInstance()` leidt — één gedeeld snapshot-/instance-mechanisme voor beide brontypen. De Programma-blok- en Repeat-Workout-paden zijn niet gemigreerd naar deze architectuur en bevatten eigen, deels gedupliceerde sessie-opzet-logica (resume-detectie, `activeInstanceId`-beheer, state-reset).

## Gevonden en gefixed: execution-identity-lek (P1)
**Bevinding:** `startRepeatWorkout()` en `launchProgramTrainScreen()` resetten `activeInstanceId` niet, in tegenstelling tot `startT`/`startCustomTraining`. `guardExistingDraft()` — door alle 4 functies aangeroepen bij een botsende training — wist alleen de `localStorage`-draft, nooit deze in-memory variabele.

**Concreet risico:** start training A (via Preview, `activeInstanceId=X`) → onderbreek zonder af te ronden (geen `confirmLeave`/finish, dus `activeInstanceId` blijft `X` in het geheugen binnen dezelfde app-sessie) → start een Repeat Workout of Programma-training → de nieuw gelogde sets worden gekoppeld aan `X` (training A) in plaats van aan de daadwerkelijk actieve sessie; bij afronden wordt de verkeerde `training_instances`-rij als voltooid gemarkeerd.

**Fix:** `activeInstanceId=null;` toegevoegd aan het begin van beide functies, exact het patroon dat `startT`/`startCustomTraining` al gebruikten (code-commentaar verwijst naar "Werkblok D" als oorspronkelijke bron van deze regel).

## Gevonden en gefixed: bevroren live-timer bij custom trainingen (P2, UX)
**Bevinding:** `startCustomTraining()` riep `startTrainTimer('A')` aan — een hardcoded verwijzing naar vaste training A — in plaats van de daadwerkelijke trainingscontext (`curT`). Het bijbehorende DOM-element (`elapsed-custom-${t.id}`, met koppelteken) volgde bovendien een andere naamgevingsconventie dan wat `startTrainTimer()` zoekt (`elapsed-${t.toLowerCase()}`).

**Concreet risico:** de verstreken-tijd-klok bleef bij élke custom training op "00:00" staan — een zichtbaar, dagelijks UX-defect voor elke sporter die custom trainingen gebruikt.

**Fix:** timer-aanroep naar `startTrainTimer(curT)`; element-ID hernoemd naar `elapsed-${ctxT.toLowerCase()}`, dezelfde conventie die vaste en programma-trainingen al gebruiken (`ctxT.toLowerCase()`-patroon, geverifieerd geen andere code-referentie naar de oude, foutieve ID).

## Preview-inhoud (sectie 11 van de opdracht)
`previewCtx` (regel ~7472) bevat al: trainingnaam/type (`def.name`), oefeningen (`def.exercises`), volgorde (`order`), verwijderingen (`removedIds`), vervangingen (`swaps`), herstel-per-spiergroep (`recovery`, async via `getRelevantMuscleRecovery`), vorige-sessie/1RM-schatting (`prevMap`), sporter-gewichtsoverrides (`overrides`), en trainingscontext (duur/locatie, `tkTrainingCtx`). Dit voldoet al aan vrijwel alle vereiste velden uit de opdracht. Geen pseudo-intelligente metrics aangetroffen — alle getoonde waarden zijn herleidbaar tot een bestaande databron of berekening.

## Execution identity (sectie 12)
`activeInstanceId` is één globale variabele (regel 11705) die het huidige `training_instances.id` bijhoudt. Correct beheerd bij: start via Preview (guard tegen stale ID, regel 11513), resume vanuit draft (regel 11539/19790), finish (`completeTrainingInstance`, regel 16096-16097), discard (regel 15569). **Na deze sprint** ook correct bij Repeat Workout en Programma-training-start (de twee hierboven gefixte paden).

## Niet in deze sprint opgelost — bewust, met onderbouwing
Volledige architecturale convergentie (Programma-blok en Repeat Workout ook laten lopen via `openTrainingPreview`/`startInstanceFromDefinition`, zodat de gedupliceerde resume-/state-reset-logica zelf verdwijnt in plaats van alleen het meest kritieke symptoom ervan) is **niet uitgevoerd**. Dit zou een structurele herbouw van twee bestaande, breed geteste flows vereisen (nieuwe Definition Adapters voor "programma-blok" en "herhaal-workout" als brontype, snapshot-compatibiliteit, uitgebreide regressietests) — een grotere ingreep dan verantwoord is als "minimale fix" binnen deze sprint (opdracht sectie 33: "geen grote rewrite tenzij aantoonbaar noodzakelijk... kleinere fix onvoldoende veilig/reproduceerbaar"). Het acuut risicovolle symptoom (data-misattributie) is met de kleinst mogelijke, gerichte wijziging weggenomen; de onderliggende duplicatie blijft een bekend, traceerbaar vervolgpunt.

## MS-F2-01 acceptance-gate-toetsing
Letterlijke acceptance gate: *"All normal entry points converge without duplicated execution logic."*
- **Gedeeltelijk behaald:** 6 van 8 entrypoints convergeren al volledig (gedeeld snapshot-/instance-mechanisme). De resterende 2 (Programma-blok, Repeat Workout) delen wél dezelfde onderliggende render-/state-machine (`renderTrainScreen`, `curT`, `sessionLog`, `startTrainTimer`) maar NIET dezelfde opzet-/adapterlaag — enige logica-duplicatie blijft aantoonbaar aanwezig.
- Het kritieke, daadwerkelijk schadelijke gevolg van die duplicatie (verkeerde instance-koppeling) is wel gesloten.

**Resultaat: PARTIAL, niet CLOSED** — conform het principe "PARTIAL boven een onterecht CLOSED".
