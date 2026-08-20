# Concept2 / ErgData — Forensic Reference (black-box)
Bron: `ErgData_2.16.0+(360)_APKPure.xapk` — statische strings-analyse van `classes.dex`/`classes2.dex` (geen code gedecompileerd/gekopieerd; alleen feiten: UUID's, klassenamen, enum-waarden, DB-schema). Classificatie per item: **APK_OBSERVED** / **CONFIRMED_OFFICIAL** / **BOTH** / **INFERRED** / **UNKNOWN**.

> ErgData is uitsluitend technische referentie. Trainingskompas neemt geen ErgData-code over en is er niet van afhankelijk.

## 1. BLE UUID's (APK_OBSERVED — letterlijk in de APK)
Basis: `CE060000-43E5-11E4-916C-0800200C9A66`. Alle 35 aangetroffen CE060-UUID's:
`10,11,12,13,14,15,16,17,18` · `20,21,22` · `30,34,35,37,38,39,3A,3C,3D,3E,43` · `60,61,62,63,64,65,66,67,68,69` · `80` (elk als `CE0600xx-43E5-11E4-916C-0800200C9A66`).

Rol-toewijzing (BOTH = officiële spec-structuur + APK-aanwezig):
- `0x0010` device information service; `0x0011` serial, `0x0012` firmware, `0x0013` hardware, `0x0014` manufacturer, `0x0015` erg machine type. (`0x0016–18` APK_OBSERVED, rol UNKNOWN)
- `0x0020` control service (**CSAFE**); `0x0021` receive (write), `0x0022` transmit (notify).
- `0x0030` PM erg-data service; `0x0034` sample rate, `0x0035` stroke data, `0x0037` split/interval, `0x0038` additional split/interval, `0x0039` end-of-workout summary, `0x003A` additional workout summary, `0x003C` force-curve (APK_OBSERVED via `forceCurveCharacteristic`), `0x0080` multiplexed information. (`0x003D,3E,43` UNKNOWN)
- `0x0060–0x0069` tweede/uitgebreide data-service — **APK_OBSERVED, rol UNKNOWN** (niet gefabriceerd).

## 2. Machine types (APK_OBSERVED — enum `WorkoutMachineType`)
`rowerg`, `skierg`, `bikeerg`, `dynamic`. Veldnamen: `workoutMachineType`, `ergModelType`.

## 3. Domeinmodellen (APK_OBSERVED — klassenamen)
`PmDevice`, `PmDeviceAdapter`, `PmConnectionKeeperService` (connectie-lifecycle), `PmCommand`/`PmCommandProcessor`/`PmResponseParser` (CSAFE), `PmStrokeData`, `PmSplitIntervalData`, `SplitData`, `IntervalData`, `VariableIntervalData`, `RealTimeLap`, `RealTimeData`, `ForceCurveData`, `HeartRateData`, `WorkoutState`, `WorkoutSnapshot`, `WorkoutResults`.

## 4. CSAFE-commando's (APK_OBSERVED — via control service 0x0020)
o.a. `GET_ROWINGSTATE`, `GET_STROKESTATS`, `GET_FORCEPLOTDATA`, `GET_HRBELT_INFO`, `GET_EXTENDED_HBELT_INFO`, `GET_HEARTBEATDATA`, `GET_INTERVALTYPE`, `GET_WORKOUTINTERVALCOUNT`, `CONFIGURE_WORKOUT`, `GET_FW_VERSION`, `GET_HW_VERSION`, `GET_PRODUCTCONFIGURATION`, `GET_BATTERYLEVELPERCENT`, `GET_DFCALIBRATIONVERIFIED`.

## 5. Workout-actual schema (APK_OBSERVED — SQLite `workout_results`)
Authoritatieve veldenlijst (units-relevant): `distance`(int m), `time`(real, tienden s), `workoutMachineType`(text), `strokeRate`(int), `strokeCount`(int), `caloriesTotal`(int), `wattMinutesTotal`(int), `dragFactor`(int), `restDistance`, `restTime`, `pace`(real), `watts`(int), `hrAverage/hrMin/hrMax/hrEnding/hrRecovery/hrRest`(int), `heartRateZone`, `serialNumber`(int), `firmwareVersion`(real), `ergModelType`(text), `hrType`(text), `verified`, `ranked`, `source`, `date`, `timeZone`.

## 6. HR (APK_OBSERVED)
HR-belt-beheer: `connectedHRM`, `discoveredHRMs`, `rememberedHRM`, `pendingConnectionWithHRM`; `HeartRateData`, `hrType`, `FIELD_BPM`. → HR-bron expliciet (`concept2_pm5` vs extern HRM).

## 7. Saved-device / reconnect (APK_OBSERVED)
`logAutoConnectingWithRememberedDevice` (auto-connect met onthouden apparaat), `DisconnectInitiatedDueInactivity`, `wattMinuteCompatiblePMConnected`.

## 8. WorkoutState-waarden (APK_OBSERVED)
`waiting`, `active`, `rest`, `countDown`, `WAITING_TO_REACH_CALIBRATION_SPEED`.

## Wat NIET is vastgesteld (UNKNOWN — niet gokken)
Exacte byte-layout per characteristic-payload; exacte rol van `0x0016–18`, `0x003D/3E/43`, `0x0060–69`; force-curve byte-formaat. → te bevestigen tegen de officiële PM5 Bluetooth-spec + een echte live-capture in de native shell.
