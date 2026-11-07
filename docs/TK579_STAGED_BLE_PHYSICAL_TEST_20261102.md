# TK #579 — gecontroleerde eindige PM5-intervaloverdracht, 2 november 2026

## Status en grens
**CODE CANDIDATE — PHYSICAL DEVICE GATE OPEN.** Dit is GEEN productievrijgave,
geen bewijs dat de volledige intervalstructuur correct op de PM5 staat en geen
vrijgave voor het persoonlijke account. PR is gestapeld op herstelbranch #587,
niet op `main`. Geen APK bouwen in deze functionele herstelronde.

## Gebouwde keten
1. Bestaande intervalformulier → `IntervalEngineCore.normalizePrescription`.
2. Bestaande `Concept2Csafe.compileFiniteIntervalPrescription` gebruikt de
   eindige variabele intervalstructuur (workouttype 8), inclusief precies zes
   werk-/rustparen, optionele warming-up en cooling-down.
3. Bestaande `planBleCharacteristicFrames` herverpakt complete CSAFE-commando's
   naar individuele frames van maximaal 20 bytes voor CE060021.
4. Nieuwe `Concept2FiniteTransfer.createFiniteIntervalTransfer` verzendt
   sequentieel: frame → CE060022 response → GETSTATUS → response met
   Previous Frame Status OK → volgend frame. Afwijzing, corrupte respons,
   timeout, disconnect, accountwisseling of verbindingswissel stoppen.
5. Eén runtime-owner `_c2rt` en bestaande BLE transport; géén nieuwe BLE-stack,
   sessie-write, dataherstel of afwijkende execution-/logging-eigenaar.
6. Gewone knop **Start intervaltraining** blijft de vertrouwde app-only route.
   Een **afzonderlijke experimentele PM5-testknop** vergt actieve PM5,
   actuele echte 0x31 WAITTOBEGIN-status, expliciete bevestiging (kan
   monitortraining vervangen) en eenduidig device/generation/account.
7. Na alle frame-ACKs is het resultaat uitsluitend
   `TRANSFERRED_UNVERIFIED`, nooit `PROGRAMMED` of `ok:true`.
   Het beeldscherm meldt dat de inhoud op de PM5 zelf gecontroleerd moet worden.

## Negatieve contracts
- BLE/GATT-write success is niet hetzelfde als CSAFE-ACK.
- CSAFE Previous Frame Status OK is niet hetzelfde als volledig ingestelde
  training. Workout type 8 alleen is geen readback van 6 × 60/60.
- Geen gedeeltelijke overdracht stil herhalen en geen automatische
  terugval naar app-only onder een succeslabel.
- Geen claims van echte metingen op een simulator of na een browser-gate.
- Eerder ingestelde PM5-workouts kunnen door een expliciete test worden
  overschreven; de bevestigingsdialoog waarschuwt.
- Device-response-volgorde is gebaseerd op ontvangen CE060022-sequenties,
  echte deviceId en generation; onvoldoende correlatie of fout => geen succes.

## Tests en overblijvende gates
- `core/fConcept2FiniteTransfer.test.js`: per-frame sequentie,
  GATT-limiet, dubbele start, toestemming, idle/versheid, verkeerde PM5,
  stale generation/response, checksum, afwijzing, cancel en timeout.
- `core/fConcept2FiniteTransferWiring.test.js`: echte index-handler;
  verbonden account/PM5, bevestiging, busy en normale app-only route.
- Bestaande controllers/Concept2-native-transport mogen niet regresseren.
- **Fysiek verplicht**: Samsung Android16 → PM5 RowErg/SkiErg/BikeErg
  6 × 60 s werk / 60 s rust, waar mogelijk 2 nabije PM5's, afgebroken
  overdracht, reconnect, juiste volgorde en *volledige* werk-/ruststructuur
  op de monitor controleren. Geen echt toestel is in deze sessie beschikbaar.
- **Nog te ontwikkelen/verifiëren**: onafhankelijke, volledige device-readback
  van alle intervalparameters of een expliciet goedgekeurde fysieke
  acceptatieprocedure. Tot dan blijft issue #579 OPEN.
