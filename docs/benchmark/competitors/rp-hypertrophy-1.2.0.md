# RP Hypertrophy 1.2.0 — Complete External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `RP+Hypertrophy_1.2.0_APKPure.xapk`  
**SHA-256 XAPK:** `15a236aacbca88765e8533d3c0ca185d1493827bc929de818e0d1705db346e2b`  
**Base APK SHA-256:** `ab4ebd7a314418a9e22b3283768e670a21a2a71b77afd6ca5d93af8125144e33`  
**Package/version:** `com.rp.hypertrophy` · 1.2.0 · versionCode 59 · minSdk 24 · targetSdk 35.  
**XAPK:** 6,724,0xx bytes archive; base APK 5,623,361 bytes; supplied split ABI armeabi-v7a, English and mdpi. One DEX (~4.47 MB).

## Critical evidence boundary

This Android artefact is primarily a **native WebView/PWA shell**, not the RP Hypertrophy training engine. Direct APK strings identify `PWA URL: https://training.rpstrength.com`, Android WebView/JavaScript bridges, deep-link dispatch, Google OAuth callback bridging, Play Billing, AppsFlyer, Firebase Messaging and Bugsnag. The actual hypertrophy application logic/content is served from the web application and is therefore **not packaged in this XAPK**.

Accordingly this report deliberately separates:

1. **ARTEFACT-OBSERVED** — directly proven by the supplied XAPK.
2. **OFFICIAL-DOCUMENTATION** — current RP Strength/Help Center/release-note claims independently checked on 2026-09-18.
3. **TK TRANSLATION** — generic pattern or gap candidate; never a copied proprietary rule.

This is a full audit of what the supplied artefact can prove. It would be false precision to score hidden web/server logic as if it had been reverse-engineered from this XAPK.

## 1. TK Measurement Model v1.2 — artefact-only score

| Criterion | Result | Confidence | Boundary |
|---|---:|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance unavailable |
| B Canonical architecture | 2 | HIGH | shell/native bridge architecture visible; training domain remote |
| C Runtime integration | 2 | MEDIUM | WebView/OAuth/deep-link/billing/push bridges visible; runtime not exercised |
| D Persistence/data model | NOT ASSESSABLE | — | training persistence lives outside supplied shell |
| E Calculation/Context/Decision | NOT ASSESSABLE | — | hypertrophy logic not packaged |
| F Tests/evidence | NOT ASSESSABLE | — | internal tests unavailable |
| G Security/privacy | NOT ASSESSABLE | — | no exploit claim; web/backend enforcement unavailable |
| H UX completion | NOT ASSESSABLE | — | remote web UI not contained in artefact |
| I Failure/degraded handling | 2 | MEDIUM | billing/OAuth/push/error shell paths visible; training degraded states remote |
| J Audit closure | NOT APPLICABLE | — | TK-specific |

No aggregate score.

## 2. Native shell around remote training application — ARTEFACT-OBSERVED

Direct strings include `PWA URL: https://training.rpstrength.com`, `WebViewClient`, `WebChromeClient`, `JavascriptInterface`, JavaScript custom-event dispatch and an `AndroidOAuthBridge`.

**PAT-PWA-NATIVE-SHELL-001:** web training product can be packaged as a thin native capability shell while domain logic remains remotely deployable.

**TK:** relevant reference only. TK already has a web/native boundary, but canonical calculations/rules must remain versioned and auditable regardless of delivery mechanism.

## 3. Remote-update implication — ARTEFACT + OFFICIAL-DOCUMENTATION

RP's official help says the Hypertrophy app can function as a web app and web delivery allows updates without waiting for app-store approval.

**PAT-REMOTE-DOMAIN-DELIVERY-001:** product logic/content can update independently of native shell releases.

**TK:** only safe for presentation/non-canonical web code if Calculation/Decision versions remain traceable. Remote deployment must never make historical prescriptions irreproducible.

## 4. OAuth bridge — ARTEFACT-OBSERVED

Strings include `AndroidOAuthBridge`, Google OAuth callback custom events and `oauthCallbackGoogle`.

**PAT-WEB-NATIVE-AUTH-BRIDGE-001:** native authentication result is bridged into web domain through an explicit event boundary.

**TK:** useful native-shell pattern; tokens/secrets must remain out of DOM where possible.

## 5. Deep-link bridge — ARTEFACT-OBSERVED

The shell dispatches `deepLinkOpened` into JavaScript.

**PAT-WEB-NATIVE-DEEPLINK-001:** native deep links are normalized into the web application event model.

**TK:** relevant to future workout/program/share links in native Android.

## 6. Play Billing — ARTEFACT-OBSERVED

Google Play Billing classes, purchase acknowledgement, subscription handling and validation plumbing are packaged.

**PAT-NATIVE-BILLING-BRIDGE-001:** subscription commerce can remain native while entitlement UX is web-hosted.

**TK:** reference for Android commercial surface; server-side entitlement remains authoritative.

## 7. Purchase attribution/validation telemetry — ARTEFACT-OBSERVED

AppsFlyer purchase/subscription connector structures are packaged.

**TK:** no need to copy vendor choice. Privacy/minimization review required before any attribution SDK.

## 8. Push messaging — ARTEFACT-OBSERVED

Firebase Messaging service/classes are packaged.

**PAT-PWA-PUSH-BRIDGE-001:** native push capability can wake/deep-link a web-hosted training product.

**TK:** relevant to reminders/coach notifications, but notification payload must not become source of training truth.

## 9. Observability — ARTEFACT-OBSERVED

Bugsnag Android core/NDK/ANR libraries are present, including armeabi-v7a native libraries.

**PAT-MOBILE-OBSERVABILITY-001 corroboration:** thin shell still needs native crash/ANR observability.

**TK:** vendor-neutral observability architecture already exists; Android-native layer should receive equivalent coverage.

## 10. Minimal permissions — ARTEFACT-OBSERVED

XAPK manifest metadata lists INTERNET, VIBRATE, AD_ID/attribution, billing/license and network-state permissions. No Health Connect/Bluetooth/location/camera permission is declared in the supplied XAPK metadata.

**Interpretation:** RP Hypertrophy 1.2.0's supplied Android shell is not a wearable/device-integration benchmark.

## 11. No Health Connect evidence — ARTEFACT-OBSERVED

No Health Connect permission/library evidence was found.

**TK:** do not infer absence in RP web/backend generally; only supplied Android 1.2.0 shell lacks evidence.

## 12. Version delta warning — OFFICIAL-DOCUMENTATION

RP's official release notes show 1.2.0 released 2026-06-27, while later releases exist through at least 1.3.10 (2026-08-19). Therefore this audit is explicitly **version-scoped** and not a claim about every current RP behavior.

## 13. Mesocycle-first programming — OFFICIAL-DOCUMENTATION

Current official RP material says users can choose premade templates or build custom mesocycles; current marketing also exposes a Meso Builder based on physique/muscle priorities.

**PAT-HYPERTROPHY-MESO-001:** hypertrophy programming is organized around a finite accumulation/deload cycle rather than an endless repeating week.

**TK:** TK already has mesocycle schema foundations but current bodybuilding/hypertrophy athlete UX depth requires separate verification. Candidate domain-specific program view.

## 14. Muscle emphasis drives plan construction — OFFICIAL-DOCUMENTATION

RP states Meso Builder can build a program around selected muscle priorities.

**PAT-HYPERTROPHY-EMPHASIS-001:** muscle priority is explicit program context.

**TK:** overlaps Alpha Progression's muscle-focus pattern; repeated competitor corroboration.

## 15. Week-by-week adaptation — OFFICIAL-DOCUMENTATION

RP states the app adjusts week by week using pump, soreness and workload feedback.

**PAT-HYPERTROPHY-FEEDBACK-LOOP-001:** subjective post-exercise/session signals feed the next prescription cycle.

**TK:** candidate only. Subjective signals must enter Context/Decision as labelled inputs with data-quality/confidence, never as direct AI-generated truth.

## 16. Pump feedback — OFFICIAL-DOCUMENTATION

Pump is one of RP's stated volume-adjustment inputs.

**PAT-PUMP-SIGNAL-001:** local subjective pump can be captured as a hypertrophy-specific context signal.

**TK:** **EVIDENCE_REVIEW_REQUIRED.** Do not assume pump predicts hypertrophy or optimal volume.

## 17. Soreness feedback — OFFICIAL-DOCUMENTATION

Soreness is explicitly used in RP's stated future-volume logic.

**PAT-SORENESS-SIGNAL-001:** muscle-specific soreness can be tracked longitudinally as context.

**TK:** potentially useful context signal; must not independently diagnose recovery, injury or optimal volume.

## 18. Workload/volume perception — OFFICIAL-DOCUMENTATION

RP's help describes workload perception/“beat up from volume” as another input to future set recommendations.

**PAT-VOLUME-TOLERANCE-SIGNAL-001:** perceived volume tolerance can be captured separately from RIR/per-set effort.

**TK:** candidate Context Engine input after terminology/evidence review.

## 19. Multi-signal hypertrophy feedback — OFFICIAL-DOCUMENTATION

RP describes pump + soreness + workload perception jointly influencing set-count decisions.

**PAT-HYPERTROPHY-MULTISIGNAL-001:** do not let one subjective hypertrophy signal decide future volume alone.

**TK:** philosophically aligned with corroboration principle, but exact RP rules are proprietary/unverified and must not be copied.

## 20. Weight/reps/sets are separate adaptation dimensions — OFFICIAL-DOCUMENTATION

RP explicitly describes adapting weight, reps and set count through different logic.

**PAT-HYPERTROPHY-ADAPT-DIMENSIONS-001:** load progression and volume progression are separate decision dimensions.

**TK:** strong fit with versioned Decision Engine. Avoid one opaque “progression score”.

## 21. Equipment increment feasibility — OFFICIAL-DOCUMENTATION

RP says when the next load increment would be too large, it may add a rep instead of load.

**PAT-LOAD-FEASIBILITY-001 corroboration:** Alpha Progression and RP independently support equipment-aware progression feasibility.

**TK:** existing Alpha audit already marked this TK_CHECK_REQUIRED. RP raises its benchmark priority.

## 22. Manual override — OFFICIAL-DOCUMENTATION

RP allows users to add/delete sets or change recommendations.

**PAT-ADAPTIVE-OVERRIDE-001:** adaptive prescription remains user-editable.

**TK:** essential: Decision output is recommendation/prescription state, not an uneditable command.

## 23. RIR progression — OFFICIAL-DOCUMENTATION

RP help/content uses assigned RIR and describes cycles progressing toward lower RIR before deload.

**PAT-RIR-MESO-PROGRESSION-001:** target effort can progress across a hypertrophy mesocycle.

**TK:** corroborates Alpha's RIR-periodisation pattern. Exact schedule/rules require independent evidence and registry treatment.

## 24. Automatic deload at cycle end — OFFICIAL-DOCUMENTATION

RP says the final week of a created cycle is automatically a deload, generally after 4–6 training weeks depending on cycle length.

**PAT-CYCLE-END-DELOAD-001:** deload can be structural cycle state rather than reactive daily recommendation.

**TK:** candidate Decision/program rule, but RP's fixed/default timing is not evidence for a universal TK rule.

## 25. Deload modifies both volume and intensity — OFFICIAL-DOCUMENTATION

RP describes deload as reduced training volume and intensity.

**PAT-DELOAD-MULTIDIMENSION-001:** deload prescription can modify multiple dimensions, not only “fewer sets”.

**TK:** useful schema direction; exact reductions require evidence/versioned rules.

## 26. Deload can omit muscle/exercise work — OFFICIAL-DOCUMENTATION

RP help says some smaller muscle groups may be removed from deload week.

**TK:** **REFERENCE_ONLY.** This is an RP product rule, not a rule TK should adopt without evidence and explicit sport/program context.

## 27. Exercise feedback retains joint-pain rating — OFFICIAL-DOCUMENTATION

Release notes 1.3.6 state a previously recorded joint-pain rating is shown when exercise feedback is reopened.

**PAT-JOINT-DISCOMFORT-SIGNAL-001:** exercise feedback can retain a user-reported discomfort signal.

**TK:** candidate safety/context UX only. Never diagnose injury; concerning pain should trigger conservative guidance/escalation.

## 28. Feedback history should remain visible — OFFICIAL-DOCUMENTATION

The joint-pain release note implies feedback is not ephemeral; prior rating can be surfaced when revisiting feedback.

**PAT-FEEDBACK-HISTORY-001:** adaptive inputs need visible history/provenance so athletes understand what influenced future decisions.

**TK:** strongly aligned with explainability.

## 29. Set-distribution preservation — OFFICIAL-DOCUMENTATION

Release 1.3.1 says weekly set recommendations now respect how sets were distributed across exercises for a muscle group before adding/removing sets.

**PAT-MUSCLE-SET-DISTRIBUTION-001:** muscle-level volume adaptation should preserve exercise-level allocation unless a rule intentionally changes it.

**TK:** high-value architecture candidate. Calculation: aggregate muscle sets; Decision: adjust target; allocation: deterministic distribution with explicit provenance.

## 30. Skipped versus completed workouts — OFFICIAL-DOCUMENTATION

Release 1.3.10 visually differentiates skipped from completed workouts.

**PAT-WORKOUT-OUTCOME-STATE-001 corroboration:** adherence state should distinguish skipped from completed, not merely “has record / no record”.

**TK:** ScheduleAdherenceCore already exists.

## 31. Exercise history notes — OFFICIAL-DOCUMENTATION

Version 1.2.0 specifically adds unpinned exercise notes to exercise history.

**PAT-EXERCISE-NOTE-HISTORY-001:** exercise-specific notes remain available longitudinally, even when not pinned.

**TK:** candidate execution/history enhancement, especially technique/setup cues.

## 32. Planning-board day rearrangement — OFFICIAL-DOCUMENTATION

Version 1.1.52 added day rearrangement when building mesos/templates.

**PAT-MESO-DAY-REORDER-001:** multiweek program editor should support schedule rearrangement without rebuilding the program.

**TK:** likely overlaps scheduling/builder; current end-to-end UX parity should be checked.

## 33. Exercise filters/history — OFFICIAL-DOCUMENTATION

Later 1.3 release added filtering to exercises previously performed.

**PAT-EXERCISE-HISTORY-FILTER-001:** exercise library can prioritize/filter by personal history.

**TK:** useful as MoveKit library grows.

## 34. Warm-up guidance exists — OFFICIAL-DOCUMENTATION

RP help has dedicated guidance for warm-up/starting weight and release notes reference warm-up tips.

**TK:** warmup already Calculation Registry governed; RP's presence is UX/product corroboration, not evidence for formula changes.

## 35. Rest timer is not core in documented RP web flow — OFFICIAL-DOCUMENTATION

The help center explicitly has an article titled “Why is there no rest timer?” while later release notes mention rest-timer tips. This indicates product evolution/possible platform/version differences.

**Result:** do not infer current rest-timer capability from static XAPK. **DYNAMIC_CHECK_REQUIRED.**

## 36. Templates — OFFICIAL-DOCUMENTATION

RP markets 100+ templates and custom mesocycle creation in current materials.

**PAT-HYPERTROPHY-TEMPLATE-LIBRARY-001:** program library and adaptive execution can coexist; template is starting structure, not immutable plan.

**TK:** relevant to future program discovery/coach/creator library.

## 37. Technique videos — OFFICIAL-DOCUMENTATION

Current RP product page advertises 250+ technique videos.

**TK:** MoveKit media architecture already exists. RP provides hypertrophy-specific content benchmark, not content to copy.

## 38. Scientific-claim boundary

RP describes its system as evidence-based and publishes training guidance. Competitor marketing/help claims are **not sufficient evidence** for TK calculations or Decision rules. Every comparable TK rule still requires its own Evidence Registry review.

This is particularly important for pump, soreness, volume landmarks, deload timing and any MEV/MRV-like interpretation.

## 39. MEV/MRV boundary

RP educational content uses MEV/MRV concepts, but the supplied APK does not expose their implementation and current official app help does not provide enough formula-level evidence to reconstruct them.

**TK:** do not add universal MEV/MRV numerical thresholds from competitor content. At most treat the concepts as research candidates.

## 40. Current TK comparison

Current repository evidence confirms:
- bodybuilding is an existing sport definition with hypertrophy/volume-training and per-muscle volume metrics;
- RPE/RIR calculations and limitations are formally registry-governed;
- tonnage exists as `CALC-STR-003`, but tonnage must not be equated with hypertrophy stimulus;
- macrocycle/mesocycle/microcycle schema exists in organizational architecture;
- exercise-specific Progression Coach and adaptive weekly program foundations exist;
- TK's architecture already requires Calculation→Context→Decision→AI separation;
- no direct evidence from current search establishes a mature RP-style **muscle-specific pump+soreness+volume-tolerance feedback loop**.

## 41. Highest-value TK opportunities

1. **Hypertrophy-specific feedback contract:** muscle/exercise soreness, pump, volume tolerance and discomfort as separate labelled inputs — **EVIDENCE_REVIEW_REQUIRED**.
2. **Muscle-level set target → exercise-level allocation** with deterministic distribution/provenance.
3. **Equipment-aware progression feasibility** — now corroborated independently by Alpha + RP.
4. **Explicit hypertrophy mesocycle UX** using existing periodisation foundations.
5. **RIR target progression across mesocycle**, only via versioned/evidence-rated rules.
6. **Deload materialisation** across volume/intensity while avoiding universal competitor-derived timing.
7. **Feedback history/explainability:** show which prior athlete inputs influenced a recommendation.
8. **Exercise-note history** for setup/technique context.
9. **Personal-history exercise filters** as library scales.
10. **Dynamic/runtime audit of the actual remote web app**, because the XAPK does not contain the training engine.

## 42. Dynamic audit gates

A runtime/browser pass is essential for this competitor and should test: onboarding; subscription/auth; mesocycle builder; template selection; muscle emphasis; exercise selection; week progression; RIR targets; per-set logging; pump/soreness/workload feedback; joint-pain feedback; set additions/removals; weight-vs-rep progression under coarse equipment increments; set-distribution behavior; manual override; missed/skipped sessions; deload transition; notes/history; exercise filters; warm-up; rest timer current state; offline/network loss; multi-device state; responsive/mobile WebView behavior; deep links; notifications; accessibility; export/privacy/account deletion.

## Final status

**RP HYPERTROPHY 1.2.0 NATIVE-XAPK STATIC AUDIT: CLOSED.**  
**Remote PWA/domain-engine static audit: NOT PRESENT IN ARTEFACT.**  
**Official-product documentation benchmark: COMPLETED as a separately labelled evidence layer.**  
**Dynamic/runtime PWA audit: OPEN.**

Most important TK lesson: RP's differentiating product pattern is not a secret formula visible in the APK. It is a **hypertrophy-specific closed loop**: mesocycle prescription → athlete performance + subjective muscle feedback → separate load/reps/set decisions → next-week prescription → deload. TK should not copy RP's opaque rules. The opportunity is to build the same class of feedback loop with stronger evidence metadata, explicit confidence, deterministic/versioned Decision rules and transparent provenance.