# TK603 — durable typed loose registration, 7 November 2026

Development in Draft #606, building on dd31cb963871e3555888e10785215b26b03a0a6e. All release flags remain OFF. No merge, production operation or APK.

## Behavior

A catalog loose registration now persists a versioned, owner-bound pending envelope in localStorage before the binding RPC or session POST. The envelope contains the explicit source reference, original row, date, set details and a generated UUID. It contains no binding, entitlement, access token or media URL.

The same existing modal offers recovery. A pending registration is shown as a fixed summary of the actual stored data. Warm-up changes and re-rendering cannot reopen editable fields. Retry sends the same row and UUID through the existing central writer, after current ECS/source validation and a new online server binding. Pending rows never enter the offline queue.

Owner, selection epoch and active session-log object fence async save continuations. Discard/new selection invalidates the old continuation. A prior account response cannot reset the next account's form or remove its draft. Reset re-enables the shared Save control; logout/account switch clears pending disk/memory/visible summary. The logout dialog explicitly warns that unsent data is removed and may already be in history; Cancel preserves it. Confirmed logout therefore does not preserve unsent data.

Pending data counts as unsaved even without strength fields. Leaving requires an explicit warning that the server may already have received the row. Invalid/outdated/corrupt data can be retained or explicitly discarded. A disabled feature flag does not silently erase or replay typed pending data as personal history. A pre-existing attempt from another tab is rejected rather than substituted for new inputs.

Storage errors/readback mismatch block POST. Removal failure after a confirmed POST retains the same retry identity with user feedback. Normal training drafts and Calculation/Decision Engine formulas are untouched. Legacy personal logging keeps its existing writer/FK route.

## Verification

- core/tk603LooseDurableRestart.test.js: **38 actual-function assertions PASS**, including shared persisted storage across fresh VM contexts and the real open/recovery call path.
- Coverage: lost ACK, same UUID/payload after restart, authority refresh, offline/revoke, owner switch during binding/write/render, in-flight discard, normal draft preservation, personal same-ID and flag OFF, pending summary/warm-up repaint, warned Cancel/Back, corrupt entry recovery, next owner's shared button, flag rollback, quota/readback/remove failures, competing same-source pending entry, and execution of the actual logout wipe, warned logout/Cancel, and owner change while the logout dialog is open.
- Existing loose typed regression: **34 PASS**. Concept2 finalize: **127 PASS**. Structured intervals: **191 PASS**. Training final closure: **42 PASS**. Stable UUID contract: **11 PASS**.
- Existing harnesses load the new owner/attempt helpers and update explicit writer-path/key-list contracts. Existing behavioral assertions remain; the button assertion now distinguishes same-owner completion from an invalidated owner continuation.
- Independent initial read-only review found four blockers. Those findings drove summary-based pending UI, warned discard/recovery, invalid-data escape and shared-button reset. Re-review confirmed B1-B4 resolved and identified R1 (logout warning), now fixed with three additional actual-function assertions. Follow-up review status and exact-head CI are recorded in the PR.

## Real-service boundary

tools/tk603ActualWriterProbe.cjs extends the captured-schema runner from 53 to **63 real local Auth/PostgREST/PostgreSQL assertions**, cleanup PASS. It extracts the actual strength-row builder, source validator, binding RPC, HTTP wrapper and canonical writer. The server commits, the transport deliberately loses the successful response, and a fresh VM reauthorizes and replays the same serialized row. One row remains. An independent B JWT receives specifically HTTP 403 for A's UUID. Source SHA256 is recorded and checked unchanged during the probe.

The probe's UUID and date are supplied by the harness; this proves writer/server idempotency given stable data. The separate 38-assertion test proves the app's loose pending mechanism with synthetic storage/DOM/HTTP. Neither test alone proves a real Android process kill or browser persistence. The service probe uses synthetic dependency tables and a local-only scope-trigger proposal; full schema/production parity is still open.

## Open gates

- Real Android/WebView/browser process-kill, storage behavior and visual acceptance.
- Autosave of half-entered forms before Save and durable UUIDs for the legacy personal loose route.
- Multi-tab storage-event synchronization; no silent substitution is allowed, but live cross-tab UI synchronization is not implemented.
- Full schema/provisioning/rollback parity, cloud Auth/Storage, protected media/Range/expiry/licensing, legacy async readers/coach callers and stats request budget.
- Windows baseline release failures; GitHub CI success does not waive them.
- Earlier #577/#582/#584/#586 findings and owner-led mobile UX review before any new APK.

Catalog stays 226 existing plus 356 NOT_PUBLISHED. No new media inventory audit, acceptance deployment, entitlements, public-media removal or production change.
