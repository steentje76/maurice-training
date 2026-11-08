# Concept2 ErgData 2.2.29 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `com.concept2.ergdata_2.2.29_(281)-281_minAPI29(arm64-v8a,armeabi-v7a,x86,x86_64)(nodpi)_apkmirror.com.apk`  
**SHA-256:** `7235898879d907c4d624016cd5c0dcba84237190d19167f06458d1e8320473e6`  
**Size:** 45,232,796 bytes · **package/version from artefact name:** `com.concept2.ergdata`, 2.2.29 (281), min API 29.  
**Binary:** 2 DEX; x86/x86_64/arm64-v8a/armeabi-v7a native libs; Compose/Room/DataStore/WorkManager; LiteCoreJNI/Couchbase Lite indicators; Sentry native.

> Complete static audit for the supplied APK. This version is older than TK's existing forensic reference (ErgData 2.16.0), so findings are version-scoped. Static evidence proves packaged structures and schemas, not real PM5 behavior or server-side Logbook behavior.

## 1. TK Measurement Model v1.2

| Criterion | Result | Confidence | Boundary |
|---|---:|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance unavailable |
| B Canonical architecture | 4 | HIGH | explicit PM/workout/result/split/interval/firmware/logbook domains |
| C Runtime integration | 4 | MEDIUM | BLE/ANT+/PM5/HRM/firmware/workout paths concrete; no physical PM5 test |
| D Persistence/data model | 4 | HIGH | explicit Room schemas for workout_results, split/interval/stroke/variable interval and sync state |
| E Calc/Context/Decision | 3 | MEDIUM | pace/watts/calories/targets/pacer/HR zones and force metrics visible; algorithm semantics partly unknown |
| F Tests/evidence | NOT ASSESSABLE | — | internal tests unavailable |
| G Security/privacy | NOT ASSESSABLE | — | backend/exported-component enforcement not proven |
| H UX completion | 2 | MEDIUM | broad screens/strings; runtime friction not tested |
| I Failure/degraded handling | 4 | HIGH | explicit BLE/PM/firmware/network/offline states |
| J Audit closure | NOT APPLICABLE | — | TK-specific |

No aggregate score.

## 2. Machine identity is first-class

Direct evidence distinguishes RowErg, BikeErg and SkiErg throughout models/assets/workout data. ErgData can remember one PM5 per erg type.

**PAT-ERG-TYPE-001:** machine type is canonical metadata, not inferred from generic “rowing”.

**TK:** current code/docs already corrected BikeErg vs rowing semantics. **ALREADY_PRESENT**, with real-device validation still open.

## 3. PM5 model/firmware variants

The client contains PM5 Row/Ski/Bike monitor variants and extensive firmware models/bundles/status.

**PAT-PM-CAPABILITY-001:** PM generation/machine/firmware determine supported behavior.

**TK:** candidate refinement of generic device capability registry; no name-based guessing.

## 4. BLE transport

Concrete Android BluetoothAdapter/GATT/device/characteristic structures plus BLUETOOTH_CONNECT/SCAN evidence are packaged.

**PAT-DEVICE-PIPELINE-001 corroboration:** BLE transport remains upstream of canonical workout data.

**TK:** already architecturally aligned through NativeConcept2BleTransport/TKDeviceTransport.

## 5. External HR monitor

ErgData explicitly supports Bluetooth or ANT+ heart-rate monitors and remembers HRM state.

**PAT-HR-SOURCE-001:** HR source identity is separate from erg identity.

**TK:** existing Concept2 provenance already distinguishes PM5/external HR source; corroborated.

## 6. Workout configuration

The app supports custom workouts, favorites and Concept2 Workout of the Day (WOD).

**PAT-ERG-WORKOUT-ASSET-001:** workout configuration is a reusable/syncable object separate from workout result.

**TK:** already aligned with Training maken/Mijn trainingen and execution snapshots.

## 7. Variable intervals

Explicit variable-interval models and persistent schema include interval type, work/rest time/distance and targets.

**PAT-ERG-INTERVAL-001:** erg interval definition and interval result are distinct canonical records.

**TK:** current IntervalEngine/structured erg persistence already aligns.

## 8. Target dimensions

Variable interval schema includes target stroke rate, heart-rate zone, pace, watts and target calories.

**PAT-ERG-TARGET-001:** erg prescription can target different physical dimensions without changing result schema.

**TK:** strong candidate to extend current structured erg targets carefully; units/sport applicability must be typed.

## 9. Pacer

Dedicated Pacer models/modes, default pacer, paceboat/buoy UI and rowing/skiing pacer assets exist.

**PAT-PACER-001:** a pacer is a visualization/execution aid consuming a prescribed target, not a separate calculation source.

**TK:** candidate for RowErg/SkiErg/BikeErg execution UX.

## 10. Force curve

A Force Curve Screen is explicit and limited to RowErg/SkiErg, not BikeErg.

**PAT-FORCE-CURVE-001:** biomechanical/force visualization is capability-gated by machine type.

**TK:** VERIFIED_GAP candidate for rich PM5 execution analytics, but requires confirmed PM5 payload support and real-device validation.

## 11. Stroke/drive/force metrics

Static schema/strings expose stroke rate/count, average drag factor, drive length, drive time, peak force max/avg and average force.

**PAT-ERG-STROKE-METRICS-001:** retain device-measured stroke/force metrics as raw/derived workout detail, not generic cardio fields.

**TK:** current canonical connected-equipment contract covers pace/power/stroke rate/drag factor but not this full force/drive detail. **VERIFIED_GAP** for optional advanced Erg intelligence.

## 12. BikeErg semantics

Force curve is explicitly incompatible with bike; machine-specific models distinguish BikeErg. This reinforces that BikeErg cadence/pace semantics differ from RowErg/SkiErg.

**TK:** current docs already corrected BikeErg pace basis to 1000 m and identify cadence/stroke-rate semantics as remaining P4 nuance. ErgData independently corroborates the need for typed machine semantics.

## 13. Result schema — major finding

`workout_results` stores distance, time, machine type, verification/ranking, stroke rate/count, calories, drag factor, rest distance/time, HR summary, target stroke rate, HR zone, pace, watts, target calories, client/PM/firmware/device metadata, erg model and privacy.

**PAT-ERG-RESULT-001:** one durable result carries performance + target + device provenance, while detailed splits/strokes live in child tables.

**TK:** highly relevant to canonical activity/session design; avoid flattening every split/stroke into session columns.

## 14. Split schema

`split_data` stores stroke rate/count, drag factor, drive length/time, peak/average force, calories, time, distance and HR summary.

**PAT-SPLIT-DETAIL-001:** split detail is a child collection with stable workout identity.

**TK:** structured interval history already follows this direction; force metrics are the gap.

## 15. Stroke-level schema

`workout_stroke_data` stores per-stroke time, distance, pace, stroke rate and HR.

**PAT-STROKE-STREAM-001:** high-frequency stroke data belongs in a separate detail stream/table, not the summary record.

**TK:** candidate only if athlete value and storage cost justify it; do not overload canonical session table.

## 16. Offline-first persistence

Tables explicitly carry `isOffline`; strings include offline envelope/session storage and sync states. Favorites also have sync status.

**PAT-ERG-OFFLINE-001:** completed workout data is locally durable before cloud/logbook synchronization.

**TK:** existing offline/idempotent queue architecture is **ALREADY_PRESENT**; ErgData is a strong domain-specific comparator.

## 17. Logbook synchronization

The app is explicitly connected to a personal Concept2 Logbook account and contains synchronized workout result API models.

**PAT-ERG-CLOUD-LINK-001:** local PM workout and cloud Logbook result are separate lifecycle states.

**TK:** already has Concept2 Logbook mapping and local/live-vs-import dedup logic. **ALREADY_PRESENT**.

## 18. Local/live ↔ Logbook dedup

ErgData's own schema has local IDs, server workout IDs and sync state. TK independently already uses local Concept2 identity plus later Logbook dedup.

**TK:** current architecture is well aligned; no new gap.

## 19. Verified/ranked status

Result schemas include `verified` and `ranked`.

**PAT-RESULT-VERIFICATION-001:** result verification/eligibility is metadata distinct from raw performance.

**TK:** candidate if future competition/leaderboards require trusted-device result status; irrelevant to normal training truth.

## 20. Privacy per workout

`workout_results` contains a required `privacySetting`.

**PAT-WORKOUT-PRIVACY-001:** cloud/shared visibility belongs to result metadata and should not alter underlying performance record.

**TK:** social privacy architecture already broadly aligned.

## 21. Shared workout configuration

Explicit shared-workout configuration API/models and shared URL paths exist.

**PAT-WORKOUT-SHARE-ASSET-001:** sharing a workout definition is distinct from sharing a completed workout.

**TK:** candidate for “Mijn trainingen” sharing/social sprint.

## 22. Workout of the Day

WOD is machine-specific and can be added to favorites.

**PAT-WOD-001:** curated daily workout is a content/prescription object that can become a reusable personal workout.

**TK:** candidate content feature, but not a Calculation/Decision rule.

## 23. Favorites synchronization

Favorites have local configuration entities and explicit sync status.

**PAT-SYNCABLE-TEMPLATE-001:** reusable workout templates are independently syncable from execution history.

**TK:** relevant to My Training cloud/offline consistency; likely largely aligned.

## 24. Heart-rate zones

Dedicated HR-zone icons/settings/targets are packaged.

**PAT-HR-TARGET-ERG-001:** HR zone can be a workout target alongside pace/power/stroke targets.

**TK:** candidate after canonical HR-zone evidence/source semantics are established.

## 25. Drag factor

Drag Factor is a first-class result/split metric.

**PAT-DRAG-FACTOR-001:** drag factor is machine context/performance metadata, not resistance setting equivalence.

**TK:** already records drag factor in connected-equipment contract; keep interpretation conservative.

## 26. Firmware lifecycle

Extensive firmware update models/status, PM5 bundle/image info and explicit “PM connection lost, restart update process” failure are present.

**PAT-FIRMWARE-GATE-001 corroboration:** firmware compatibility/update state is independent from workout state.

**TK:** only relevant if TK ever owns PM firmware operations; otherwise surface device firmware metadata, leave updates to Concept2.

## 27. Device metadata provenance

Result schema retains PM version, firmware version, serial number, device/OS/version and erg model type.

**PAT-DEVICE-PROVENANCE-001:** device/firmware provenance should accompany imported/live measurement when it materially affects semantics/quality.

**TK:** candidate enrichment of connected-equipment provenance.

## 28. Connection degraded states

Explicit “Bluetooth connection lost”, “Connection lost”, reconnect UI, PM update restart and network-loss messages are present.

**PAT-DEVICE-DEGRADED-001 corroboration.**

**TK:** real-device PM5 validation remains open; reconnect/degraded UX should be device-proven before production claim.

## 29. Saved-device policy

ErgData limits saved PM5s to one per erg type.

**PAT-SAVED-DEVICE-SCOPE-001:** remembered-device policy is explicit and bounded.

**TK:** candidate UX rule; do not impose ErgData's exact limit without product reason.

## 30. Signal quality

Assets include signal-quality indicators.

**PAT-BLE-SIGNAL-UX-001:** discovery UI can expose signal quality to help users select the correct nearby device.

**TK:** useful candidate for PM5 pairing UX.

## 31. Real-time workout screens

Workout screen configuration models and live workout data structures are packaged.

**PAT-ERG-LIVE-SCREEN-001:** athletes can choose/consume machine-specific live metric screens while one execution state remains canonical.

**TK:** candidate UX refinement; screen configuration must not create parallel logging logic.

## 32. Target achievement

Target-achieved UI assets exist.

**PAT-TARGET-ACHIEVEMENT-001:** execution compares actual to prescribed target and renders achievement downstream.

**TK:** already conceptually aligned with planned-vs-actual interval history; can improve erg UX.

## 33. Calories

Calories exist in result/split/variable interval and target fields.

**TK boundary:** Concept2 calories are device/product outputs. Preserve source and do not silently equate them with general energy-expenditure truth.

## 34. Pace and watts

Pace and watts coexist in result/interval structures.

**TK:** current Concept2 live core already distinguishes measured watts vs derived watts provenance. This is a strong alignment point.

## 35. Community/challenges

Menu assets and domain strings expose Challenges and Community.

**TK:** social/challenge architecture already exists; ErgData is not the primary benchmark for this domain.

## 36. Loop/game assets

The APK contains Loop machine/boat/map/radar-style assets and game-like workout presentation.

**PAT-ERG-GAMIFIED-001:** gamified visualization can consume live erg telemetry without changing workout truth.

**TK:** optional future UX candidate, low priority versus device validation and metrics completeness.

## 37. Delete account

A Delete Account flow is packaged.

**TK:** account deletion already exists and is repeatedly audited; no gap.

## 38. Account export

No clear generic user-data export workflow was established from this static pass.

**Result:** NOT ASSESSABLE / not observed; do not infer absence from strings alone.

## 39. Health platforms

This Android APK contains Apple Health strings, likely from cross-platform/shared localization; no Android Health Connect integration was observed in this version.

**Boundary:** do not claim Apple Health works on Android. Version 2.2.29 evidence is not evidence for current ErgData releases.

## 40. Observability

Sentry native libraries are packaged; Firebase analytics strings are present.

**TK:** vendor-neutral observability/redaction remains preferable.

## 41. Local database technology

Room/SQLite is explicit; LiteCoreJNI indicates Couchbase Lite technology is also packaged. Static evidence alone does not prove which domains use which store or conflict strategy.

**PAT-DUAL-LOCAL-STORE-001:** complex device apps may isolate local stores by purpose, but TK should not add a second store without demonstrated need.

**TK:** REFERENCE_ONLY.

## 42. Security/privacy boundary

No vulnerability is claimed. Full manifest exported-component/provider/network-security semantics were not reconstructed, so security remains NOT ASSESSABLE rather than zero.

## 43. Version delta caution

TK already has a forensic reference based on ErgData **2.16.0**, while the supplied artifact is **2.2.29**. The current audit therefore does not supersede later-version evidence. It adds an independently reproducible older-version baseline and confirms that many core PM5/result/offline concepts were already mature in 2.2.29.

## 44. Current TK comparison — unusually direct

Current main documentation/code confirms:
- native Android PM5 transport architecture exists via `NativeConcept2BleTransport` / `TKDeviceTransport`;
- pure Concept2 live core is software-tested;
- RowErg/SkiErg/BikeErg typed semantics exist;
- BikeErg 1000 m split basis was corrected;
- measured-vs-derived watts provenance exists;
- Logbook API mapping exists;
- local-live vs later Logbook import dedup exists;
- structured erg interval persistence exists;
- drag factor is in the connected-equipment contract;
- **real PM5 hardware validation remains OPEN**.

This competitor therefore reveals fewer architecture gaps than Hevy/Fitbod/Garmin: TK has already reproduced much of the correct Concept2 structure.

## 45. Verified gaps / strongest candidates

1. **REAL DEVICE VALIDATION — VERIFIED GAP / blocker to production proof.** Existing TK docs explicitly keep PM5 real-device validation open.
2. **Advanced force/drive metrics — VERIFIED GAP candidate.** ErgData stores drive length/time, peak force and average force; current TK connected-equipment contract does not expose this full set.
3. **Force Curve — VERIFIED GAP candidate.** ErgData exposes RowErg/SkiErg force-curve screen; TK has no equivalent proven live capability.
4. **Per-stroke detail stream — CANDIDATE.** Valuable for advanced rowing analysis but potentially high storage volume.
5. **Pacer visualization — CANDIDATE.**
6. **BLE signal-quality pairing UX — CANDIDATE.**
7. **Device/firmware provenance enrichment — CANDIDATE.**
8. **Workout-definition sharing — CANDIDATE.**
9. **WOD/content layer — CANDIDATE.**
10. **HR-zone target for erg sessions — CANDIDATE pending evidence/source semantics.**

## 46. Dynamic/real-device audit gates

This competitor uniquely requires physical PM5 testing for meaningful closure:
- discover RowErg/SkiErg/BikeErg separately;
- saved-device reconnect and wrong-machine prevention;
- Bluetooth-off/permission denied;
- mid-workout disconnect/reconnect;
- screen-off/background behavior;
- fixed/variable intervals;
- pace basis: Row/Ski 500 m, Bike 1000 m;
- watts/stroke-rate vs Bike cadence;
- drag factor;
- HR from PM5/external HRM and source switching;
- force/drive metrics and force curve on Row/Ski, explicit absence on Bike;
- per-stroke stream;
- workout completion and local persistence without network;
- later Logbook sync/dedup;
- duplicate/replayed result handling;
- firmware/version metadata;
- PM firmware mismatch/update boundary;
- WOD/favorites/shared workout;
- target pace/watts/stroke/HR/calories;
- low signal / connection loss;
- multi-user/account switch;
- privacy/ranked/verified result semantics.

## Final status

**CONCEPT2 ERGDATA 2.2.29 COMPLETE STATIC AUDIT: CLOSED for supplied-APK static scope.**  
**Dynamic/runtime + physical PM5 audit: OPEN and materially required.**  
**Server/Logbook backend/internal tests: NOT AVAILABLE from supplied artefact.**

Most important TK lesson: unlike most competitor audits, ErgData confirms that TK's existing Concept2 architecture is already structurally close to the official specialist app: typed erg identity, device transport separation, canonical live metrics, structured intervals, Logbook mapping, provenance and dedup. The main remaining difference is **depth and hardware proof** — force/drive/stroke detail, pairing/live-screen polish, and above all real PM5 validation.