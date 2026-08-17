# Concept2 PM5 BLE Integration — Architecture (`concept2_live.v1`)

## 1. Architectuur
```
PM5  →  BLE transport (native)  →  RAW  →  Concept2Live.normalizeLiveMetric  →  CANONICAL
     →  Calculation Engine  →  Decision Engine  →  AI Coach
```
BLE-data is RAW DATA; de core calculation-engine bevat **geen** BLE-code; AI interpreteert nooit rechtstreeks BLE-packets. `core/concept2Live.js` is puur/platform-onafhankelijk (geen BLE/DOM/fetch).

## 2. UUID-matrix
Zie `Concept2Live.CONCEPT2_BLE_UUIDS` en `concept2-ergdata-forensic.md`. Basis `CE060000-43E5-11E4-916C-0800200C9A66`; device-info `0x0010`, control/CSAFE `0x0020`, PM-data `0x0030` (stroke `0x0035`, split `0x0037/38`, summary `0x0039/3A`, force-curve `0x003C`, multiplexed `0x0080`).

## 3. Device states (§5)
`not_available → idle → scanning → connecting → connected → (reconnecting | out_of_range | disconnecting) → disconnected`, plus `error`, `unsupported`. `Concept2Live.nextConnState(cur,event)` is de deterministische transitiefunctie. **Nooit fake `connected`.**

## 4. Live-session states (§14)
`not_started → connecting → connected → ready → workout_active → (paused | interval | rest) → finishing → completed`, plus `disconnected`, `error`. `Concept2Live.nextSessionState`.

## 5. Live metrics (canoniek, §8)
`normalizeLiveMetric(raw, machineType, ctx)` → `{ machineType, exerciseId, distanceM, elapsedTimeS, pace500M, pace1000M, paceBasisM, watts, wattsSource, strokeRateSPM, strokeCount, heartRateBPM, heartRateSource, calories, dragFactor, workoutState, intervalNumber, restState }`.

## 6. Machine mapping (§6, §31)
`rowerg→roeien` (RowErg = canonieke id `roeien`, **geen rename**, historische data intact), `skierg→skierg`, `bikeerg→bikeerg`, `dynamic→roeien`. BikeErg/SkiErg nooit → roeien.

## 7. Units / pace-basis (§9)
distance m, tijd s, pace s/basis, watts W, spm, bpm, kcal. Pace-basis: RowErg/SkiErg **500m**, BikeErg **1000m** (`paceBasisFor`). Centraal afgedwongen + getest.

## 8. Interval-model (§16)
`normalizeInterval` → `{ intervalNumber, type(fixed_distance|fixed_time|variable|rest|undefined_rest), workTimeS, restTimeS, distanceM, pace500M, watts, strokeRateSPM, heartRateBPM, calories, dragFactor }`.

## 9. Connection lifecycle / reconnect (§20)
`connected → signal_lost → reconnecting → connected` of `→ out_of_range → back_in_range → reconnecting`. Workoutdata gaat niet verloren bij tijdelijke disconnect (sessie-state apart afgehandeld).

## 10. Native bridge (§22-23)
`window.TKDeviceTransport` is het injectiepunt. Contract: `available`, `discover()`, `connect(machineType)`, `disconnect()`, `getStatus()`, `getDeviceInfo()`, `subscribeMetrics(cb)`, `unsubscribeMetrics()`, `subscribeConnection(cb)`, `getCurrentMetrics()`, `reset()`. Een `NativeConcept2BleTransport` (Android/Capacitor of iOS shell) implementeert dit contract; de core blijft ongewijzigd. **Zonder transport in web → geen live koppeling** (eerlijke UI, zie §11).

## 11. Web-limitatie (§29)
De PWA heeft geen betrouwbare BLE. Ontbreekt `window.TKDeviceTransport` (of `available!==true`), dan toont de oefening: *"Live koppeling met je Concept2 is beschikbaar in de app-versie met apparaatondersteuning."* Nooit "Verbonden" zonder echte transport.

## 12. Test-strategie (§27-28)
`Concept2Live.makeMockConcept2PM5(scenario)` implementeert het transport-contract en produceert realistische events (RowErg/SkiErg/BikeErg: 0→500→1000→2000m). Tests: `core/fConcept2Live.test.js` (77 asserts) + browser-acceptance (mock geïnjecteerd als `window.TKDeviceTransport`).

## 13. Provenance (§10, §18)
Watts: `concept2_measured` (PM5 levert) vs `concept2_derived` (afgeleid 2.80/pace³) — afgeleid nooit als gemeten. HR-bron: `concept2_pm5` / `external_hrm` / `fitbit` / `manual` — Fitbit-HR nooit als live PM5-HR. Live = ACTUAL.

## 14. Workout completion (§15) + idempotency
`liveWorkoutToActual(summary)` → bestaande `sessions`-actual (geen tweede logging-systeem), `prescription` onaangeroerd (rpe null, geen target-velden). Identiteit: Logbook-resultId → `[c2:<id>]`; live zonder resultId → `[c2local:<id>]`. `alreadyLoggedLive` dedupliceert tegen beide → **geen duplicaten** bij latere Logbook-import.

## 15. Security (§24)
Geen device-secrets/tokens/PII/health-values/raw-packet-dumps in productie-logging. `/.netlify/functions/` blijft uit de SW-cache. Debug-logging alleen in dev/test.

## 16. Web vs native samengevat
| Laag | Web/PWA | Native shell |
|---|---|---|
| Concept2Live core | ✅ (puur) | ✅ |
| DeviceTransport contract | ✅ | ✅ |
| Echte BLE transport | ❌ (geen) | ✅ (NativeConcept2BleTransport) |
| Live metrics | ❌ (eerlijke melding) | ✅ |
| Logbook import | ✅ (server-OAuth) | ✅ |

## 17. Evidence-classificatie
Zie `concept2-ergdata-forensic.md`. UUID's/machinetypes/modellen/CSAFE/`workout_results`-schema = APK_OBSERVED; rol-structuur = CONFIRMED_OFFICIAL (spec); byte-layout per payload = UNKNOWN tot live-capture in de native shell (**EXTERN BLOCKED — NATIVE BLE TEST**).
