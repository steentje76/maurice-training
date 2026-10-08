# Strong 6.3-beta.19 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `io.strongapp.strong_v6.3-beta.19-603020_1arch_1dpi_20ed7ee31a043973ff3900deefa3faa3_apkmirror.com.apkm`  
**SHA-256 APKM:** `1db57004d1e667dac1bf956db6526bb3a2bbc985e3550163de959eb40583e3e3`  
**Package:** `io.strongapp.strong` · **version:** 6.3-beta.19 · **versionCode:** 603020 · **min API:** 32.  
**APKM:** 17,233,399 bytes compressed; base APK 29,157,255 bytes; arm64 split 5,091,790 bytes; xxhdpi split 92,187 bytes.  
**Client:** native Android/Kotlin/Java; 3 DEX; Jetpack Compose + classic Android; Realm Kotlin (`librealmc.so`) + DataStore; WorkManager/Hilt indicators; Health Connect; Sentry native/replay; Android Glance widget.

> Complete static audit for the supplied beta APKM. Static evidence establishes packaged client structures, not runtime speed, backend correctness, subscription behavior, or production stability. Because this is explicitly a beta build, findings are version-scoped and must not be generalized to stable Strong releases.

## 1. TK Measurement Model v1.2

| Criterion | Result | Confidence | Boundary |
|---|---:|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance unavailable |
| B Canonical architecture | 3 | HIGH | clear workout/set/exercise/warmup/measurement/widget/HC domains |
| C Runtime integration | 3 | MEDIUM | concrete Realm/use-case/worker/UI bindings visible; runtime not exercised |
| D Persistence/data model | 4 | HIGH | explicit Realm models for workouts, sets, exercises, warmup formulas, measurements, widgets and sync state |
| E Calc/Context/Decision | 3 | MEDIUM | RPE, predicted values, best-set 1RM, warmup formulas and targets visible; formulas not validated |
| F Tests/evidence | NOT ASSESSABLE | — | internal tests unavailable |
| G Security/privacy | NOT ASSESSABLE | — | backend/exported-component semantics not fully reconstructed |
| H UX completion | 2 | MEDIUM | extensive user-facing bindings, but static APK cannot prove Strong's reputed logging speed |
| I Failure/degraded handling | 3 | MEDIUM | Health Connect retries, reconnect/offline/backup/export failures visible |
| J Audit closure | NOT APPLICABLE | — | TK-specific |

No aggregate score.

## 2. Native workout core

Strong has explicit `WorkoutRealm`, `CellSetRealm`, `SetGroupRealm`, exercise and workout UI/binding structures.

**PAT-FAST-LOG-DATA-001:** set logging is modeled as compact structured rows under one workout, supporting low-friction repeated entry.

**TK:** execution architecture already supports structured sets. The remaining benchmark question is dynamic UX/tap count, which static evidence cannot prove.

## 3. RPE is first-class

Direct strings include `RPE value must be between 0 and 10, inclusive`, `RateOfPerceivedExertionTarget(rpe=...)`, `expectedRpe`, `predictedRpe`, CSV `,Reps,RPE,` and dedicated RPE keyboard binding.

**PAT-RPE-ENTRY-001:** RPE is a typed set/target field with constrained input and dedicated fast-entry UI.

**TK:** RPE/RIR are already canonical/evidence-registered. Strong is a UX comparator, not calculation authority.

## 4. RIR

No equally explicit first-class RIR product domain was established from this static pass.

**Result:** RIR NOT ASSESSABLE / not observed; absence is not claimed.

## 5. Best-set 1RM

The client contains `BEST_SET_1RM` alongside other best-set dimensions.

**PAT-BEST-SET-DIMENSION-001:** PR/best-set logic is typed by metric (1RM, max weight, reps, distance, duration, pace) rather than one generic “PR”.

**TK:** PR/e1RM foundation already exists; typed PR dimensions are a useful UX/data-model comparator.

## 6. Predicted/expected set values

Static models expose `expectedReps`, `expectedRpe`, `expectedSeconds`, `predictedReps`, `predictedRpe`, `predictedWeight`.

**PAT-SET-PREFILL-001:** next/set-entry defaults can be derived from prior/planned context and presented as editable prefill.

**TK:** strong candidate for logging speed, provided canonical prescription/history remains distinguishable from user-entered actual.

## 7. Warm-up formula — major finding

Strong has a dedicated `WarmUpFormulaRealm`, mapper/database, WarmUpFormula UI, warmup number, warmup rest timer and warmup set bindings.

**PAT-WARMUP-FORMULA-001:** warmup generation is a persistent configurable domain, not only ephemeral UI calculation.

**TK comparison:** TK already has `CALC-STR-004` / `calculateWarmup`, explicitly evidence-classified as heuristic rather than strong science. Strong suggests a UX/product enhancement: user-configurable/versioned warmup formula, but does not validate Strong's formula.

## 8. Supersets

Explicit `superSetIndex`, `superSetOrder`, `SUPERSET_REST_TIMER`, first/last superset item and superset rest timer are packaged.

**PAT-GROUPED-SET-001:** set groups carry stable order/index plus group-specific rest behavior.

**TK:** superset architecture already exists; Strong provides a minimal logging UX comparator.

## 9. Dropsets

Explicit `DROPSET`, `DROP_SET`, `DropSetTag`, `dropSetRestTimer`.

**PAT-SET-TYPE-001:** special set type is structured metadata with type-specific rest behavior.

**TK:** candidate to ensure warmup/drop/backoff/failure/etc. are typed rather than encoded in notes.

## 10. Rest timer

Dedicated RestTimer UI and CSV `Rest Timer (s)` plus per-cell rest timer, warmup rest timer, superset and dropset rest timers exist.

**PAT-REST-SCOPE-001:** rest timing can be scoped to normal set, warmup, superset or dropset.

**TK:** current historical docs describe a simpler timer. Current implementation should be rechecked before gap promotion; pattern is a candidate for richer typed rest policy.

## 11. Workout/exercise notes

CSV fields explicitly include `Workout Notes` and `Exercise Notes`.

**PAT-NOTE-SCOPE-001:** workout-level and exercise-level notes are separate scopes.

**TK:** likely aligned conceptually; verify UI persistence before any gap claim.

## 12. CSV import — major portability finding

Strong packages `ImportCsvUseCase`, `ActivityImportCsvBinding` and structured import exceptions.

**PAT-WORKOUT-CSV-IMPORT-001:** athlete migration into the app is a first-class structured import workflow.

**TK:** repository search shows export UI and future gym CSV concepts, but no equivalent athlete workout-history CSV import surfaced. **VERIFIED_GAP candidate** for switching-cost reduction/data portability.

## 13. CSV export

`ExportCSV.kt`, export result/exception states and CSV schema strings are packaged.

**PAT-WORKOUT-CSV-EXPORT-001:** training history export uses a stable human-readable schema including set and note fields.

**TK:** TK already has export functionality; Strong is a schema/portability comparator, not a new generic export gap.

## 14. Backup

`WorkoutBackupUseCase`, backup fields and explicit Realm backup failure handling are packaged.

**PAT-WORKOUT-BACKUP-001:** local workout recovery/backup is a distinct resilience path from cloud sync.

**TK:** offline/sync exists; whether a user-facing workout backup/restore path is needed should be product-driven, not copied automatically.

## 15. Realm persistence

Strong uses Realm Kotlin extensively: `WorkoutRealm`, `CellSetRealm`, `SetGroupRealm`, `ExerciseRealm`, `FolderRealm`, `MeasurementRealm`, `UserRealm`, `UserGoalsRealm`, `WarmUpFormulaRealm`, `WidgetRealm`.

**PAT-STRENGTH-LOCAL-MODEL-001:** workout execution is backed by rich local domain objects to minimize network dependence.

**TK:** existing IndexedDB/offline queue architecture already serves the same architectural goal; no reason to copy Realm.

## 16. Health Connect — major finding

Strong packages AndroidX Health Connect and concrete client behavior including:
- `Inserting %d records into Health Connect (attempt %d)`;
- `Deleting %d records from Health Connect (attempt %d)`;
- `Syncing with Health Connect every 5 minutes`;
- `ActivityHealthConnectSettingsBinding`;
- `lastChangedOnHealthConnect` reconciliation fields.

**PAT-HC-001 corroboration:** Strong adds another independent native Health Connect benchmark.

**TK:** native Android Health Connect remains a verified platform gap.

## 17. Health Connect reconciliation

Realm query strings compare `lastChanged` and `lastChangedOnHealthConnect`.

**PAT-HC-RECONCILE-001:** local workout change time and health-platform sync time are tracked independently to decide whether a record needs resync.

**TK:** strong future Health Data Gateway pattern; preserve per-record source/sync timestamps.

## 18. Health Connect retries

Explicit insertion/deletion attempt counters and periodic sync are packaged.

**PAT-HC-RETRY-001:** Health Connect writes/deletes are retryable idempotent jobs rather than one-shot UI actions.

**TK:** future native HC path should adopt bounded retry/idempotency and permission fail-closed behavior.

## 19. Body measurements

`MeasurementRealm` and measurement-domain references are explicit.

**PAT-MEASUREMENT-LOCAL-001:** body measurements are first-class local records, separate from workout sets.

**TK:** already has body-data domain; Strong is a simple UX comparator.

## 20. Workout-per-week widget

The APK contains Android Glance and `res/xml/workout_per_week_widget_info.xml`, plus `WidgetRealm`.

**PAT-WIDGET-001 corroboration:** Strong provides a concrete strength-app Android widget benchmark.

**TK:** Android widgets remain a candidate previously found in Hevy/WHOOP.

## 21. Widget state persistence

Dedicated `WidgetRealm` suggests widget configuration/state is persisted separately.

**PAT-WIDGET-STATE-001:** widget state/config is a projection/cache, not canonical workout truth.

**TK:** important if widgets are implemented; widget must consume canonical data and never become a write authority unless explicitly routed through canonical commands.

## 22. Workout folders

`FolderRealm` is explicit.

**PAT-WORKOUT-FOLDER-001:** reusable workouts/routines can be organized independently from execution history.

**TK:** candidate once “Mijn trainingen” library becomes large; useful with hundreds of exercises/programs.

## 23. Exercise model

Dedicated `ExerciseRealm` and exercise UI/domain structures are packaged.

**TK:** already has exercise library; Strong is not the primary media/content benchmark.

## 24. Workout import schema as migration surface

Import and export coexist, indicating Strong treats portability as a bidirectional product concern.

**PAT-PORTABILITY-ROUNDTRIP-001:** where feasible, export schema should be suitable for re-import/migration rather than a display-only dump.

**TK:** valuable design direction for athlete ownership and future app switching/backup.

## 25. Offline/degraded behavior

Sentry offline envelopes, Realm local data, WorkManager and backup paths indicate substantial local resilience. Static evidence does not prove full lossless workout conflict semantics.

**Result:** local-first capability OBSERVED; exact conflict strategy NOT ASSESSABLE.

## 26. Observability

Sentry Android/native and replay components are packaged.

**TK:** vendor-neutral observability/redaction remains the correct direction; workout/health values should remain protected.

## 27. Billing/entitlements

Google Billing components are packaged. Exact Strong Pro entitlement model was not reconstructed in this pass.

**Result:** billing OBSERVED; entitlement semantics NOT ASSESSABLE.

## 28. Security/privacy boundary

No exploit or credential leak is claimed. Provider path XMLs exist, but exported state/URI grant wiring was not semantically reconstructed. Backend auth and data-retention behavior are unavailable. Criterion G remains NOT ASSESSABLE.

## 29. Accessibility/localization

The APKM metadata lists a very broad Android resource language set, but this can include library resources; actual Strong-owned localization coverage was not separately proven. Compose/classic accessibility quality requires runtime testing.

## 30. Beta-version boundary

This is `6.3-beta.19`, posted 2026-09-10. It is useful for current architecture/features but may contain unfinished flows or behavior not shipped in stable. Do not benchmark beta instability as a stable-product defect.

## 31. Current TK comparison

Repository evidence confirms:
- Strong is already used qualitatively as a benchmark for low-friction workout logging.
- TK has structured workout execution, RPE/RIR, supersets, plate calculator, e1RM/PR, warmup calculation and rest timer foundations.
- TK's warmup calculation is explicitly registry-governed and conservatively evidence-rated.
- TK has export UI and offline/idempotent persistence.
- native Health Connect is not implemented.
- no athlete workout-history CSV import surfaced in the current search.

## 32. Highest-value TK opportunities

1. **CSV workout-history import — VERIFIED_GAP candidate.** High value for onboarding/migration from Strong/Hevy-like apps.
2. **Editable set prefill** using prescribed/prior values while preserving planned-vs-actual provenance.
3. **Typed set categories** and type-specific rest policy.
4. **Configurable warmup formula UX** layered on TK's evidence-labelled warmup calculation.
5. **Health Connect per-record reconciliation timestamps + retry jobs.**
6. **Workout/routine folders** when My Training scale warrants them.
7. **Android workout-frequency widget.**
8. **Round-trip portability contract** so export is useful for backup/re-import.
9. **Dynamic tap-count benchmark** against Strong before claiming parity on logging speed.

## 33. Dynamic audit gates

Runtime follow-up should test: time/taps from app open to first logged set; previous/predicted value prefill; keyboard transitions weight→reps→RPE; set add/delete/reorder; warmup generation/editing; supersets/dropsets and rest timers; workout/exercise notes; PR feedback; routine/folder management; CSV import mapping/errors/duplicates; CSV export roundtrip; offline workout completion/relaunch/reconnect; backup/restore; Health Connect permission/write/delete/retry/reconciliation; widget freshness/actions; body measurements; accessibility with large text/TalkBack; subscription limits; account switching; crash/recovery during active workout.

## Final status

**STRONG 6.3-BETA.19 COMPLETE STATIC AUDIT: CLOSED for supplied-APKM static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Backend/internal tests: NOT AVAILABLE from supplied artefact.**

Most important TK lesson: Strong's transferable advantage is not a sophisticated coaching engine; it is a compact, locally durable strength-log data model optimized around repeated set entry. TK already has the richer intelligence architecture. The opportunity is to make that intelligence sit behind an equally frictionless logging surface, while adding stronger provenance/evidence and better portability than a minimal logger.