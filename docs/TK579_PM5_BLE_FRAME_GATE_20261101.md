# TK #579 — PM5 BLE frame-size safety gate (2026-11-01)

## Confirmed technical distinction

The pure `Concept2Csafe.compileFiniteIntervalPrescription` compiler produces a valid
CSAFE byte stream under its legacy 120-byte *CSAFE frame* limit. That is **not**
a guarantee that an individual frame fits the native BLE characteristic.

Official Concept2 *PM Bluetooth Smart Communication Interface Definition*
rev. 1.30, C2 PM Control characteristic CE060021, specifies **up to 20 bytes**
for the receive characteristic. CE060022 is likewise documented as up to
20 bytes. Source: https://www.concept2.cn/files/pdf/us/monitors/PM5_BluetoothSmartInterfaceDefinition.pdf
The older CSAFE rev. 0.27 interface table agrees:
https://www.concept2.nl/files/pdf/us/monitors/PM5_CSAFECommunicationDefinition.pdf

Reproducible fixture (six 60-second work intervals with 60-second rests):
- `buildFixedDistanceWorkout(1000).frame.length === 13`
- `compileFiniteIntervalPrescription(...).frames.map(f => f.length)` is
  `[108, 29]` for the no-warmup/no-cooldown fixture.
- Although each interval frame is legal under the existing 120-byte **CSAFE**
  bound, neither fits a 20-byte **BLE characteristic value**.

## Code safety action

`native/src/nativeConcept2BleTransport.js` now rejects every CSAFE control
write larger than 20 bytes before reaching `gateway.write`. It returns a
distinct `csafe_frame_exceeds_ble_characteristic_limit` error. It does not
change the single BLE connection owner, any decoder, or workout logging.
The existing 13-byte fixed-distance frame remains allowed.

RED before the guard / GREEN afterwards:
`node core/fConcept2BleFrameSize.test.js`.
Additional checks: native transport 176/176, finite compiler test PASS,
PM5 identity regression PASS, `git diff --check`.

## Explicit boundaries

- **Not** a PM5 interval-programming fix, readback, ACK or physical test.
- **Not** evidence that Android's negotiated ATT MTU overrides the PM5's
  documented value size. No speculative BLE fragmentation, truncation or
  implicit retry is permitted.
- Establish an **officially supported multi-command/multi-frame transfer**
  strategy within the actual BLE value limit and confirm firmware support.
- Only then introduce sequential frame transfer with per-frame status,
  device/generation identity, cancel/timeout controls and readback of **the
  complete interval structure**. An ordinary 0x31 general-status packet's
  workoutType=8 alone does not prove six correct work/rest intervals.
- Before a physical PM5 test, no 'programmed on PM5' claim or own-account
  release. Keep current app-only interval explanation truthful.
- PR #587 remains Draft. No new APK until functional fixes, shared UX review
  and explicit release gates; no main merge or historical data mutation.

## Follow-up: offline whole-command BLE frame plan

`Concept2Csafe.planBleCharacteristicFrames(compiled)` is an **offline-only**
command-boundary repacker. It checks the checksum, unstuffing and C2 wrapper
of each compiled source frame, then builds complete, individually check-summed
CSAFE frames with at most 20 bytes **including stuffing**. This is not raw
payload chunking and does not change or split individual CSAFE commands.

The isolated `core/fConcept2BleFramePlan.test.js` covers all three machines,
6 x 60/60 with warm-up/cooldown, byte-for-byte command-stream equivalence,
50-interval byte stuffing, corrupted checksums and an oversized indivisible
command. The plan explicitly has `deviceVerified:false`,
`requiresSequentialAck:true` and a complete-structure-readback requirement.

**This does not prove PM5 acceptance of interval configuration commands
across multiple CSAFE frames.** The planner is intentionally not connected
to the workout start button, the native writer, a second BLE owner or
production logging. A physical device/firmware contract is still a hard gate.
