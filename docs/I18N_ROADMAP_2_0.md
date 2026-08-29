# I18N_ROADMAP_2_0.md — canonical extension to Roadmap 2.0

**Status:** PLANNED / PRODUCT DIRECTION — no implementation claim.
**Parent roadmap:** `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` (Roadmap 2.0 v1.1 canonical).
**Nature:** cross-cutting capability. Internationalization/Localization (i18n/l10n) is not a new product track (T1-T18) — it is a presentation-layer capability that spans Athlete UX, Exercise Library, Programs/Workouts, Decision explanations and AI Coach communication, without changing the 18-track model or any track's mastersprint count.

## 1. Product decision
Trainingskompas becomes architecturally multilingual. First complete locales: **Dutch (nl-NL)** and **English (en)**. Later language packs (German, French, Spanish, Italian, Portuguese, ...) must be addable without rebuilding the product core — i.e. without touching Calculation, Decision, Evidence, or canonical data models.

## 2. Fundamental rule — canonical data is never translated
Canonical identifiers stay stable and language-neutral, always. This applies to, at minimum:
- exercise IDs (e.g. `barbell_back_squat` stays `barbell_back_squat` in every locale);
- calculation IDs;
- Decision Rule IDs;
- Evidence IDs;
- context enums;
- program IDs;
- workout IDs;
- database IDs;
- provider IDs;
- analytics event IDs (see `docs/PRODUCT_TELEMETRY_FEEDBACK_ROADMAP_2_0.md`);
- API contracts.

Localized **display names, descriptions, instructions, cues and help text** are layered on top of the canonical ID, never in place of it. A language switch must never duplicate an exercise, program or workout, and must never create a second canonical identity for the same underlying entity.

## 3. AI language governance
Conceptually: `preferred_locale = nl-NL` (or `en`, etc.) is passed alongside Calculation + Context + Decision + Evidence/Provenance to the AI Coach, which communicates in the requested language.

Language changes communication only. Language must **never**:
- change a Calculation result;
- change a threshold;
- change a Decision outcome;
- change Evidence content;
- change confidence;
- fabricate data that is otherwise missing.

This is a direct extension of the existing AI Output Contract principle (`docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` §3, §16): AI interprets and communicates, it does not (re)calculate — and locale is explicitly one more input that must not leak into calculation/decision logic.

## 4. Localization scope beyond text
Localization also covers: date/time formatting, decimal separators, number formats, kg/lb, km/miles, pace, speed, and temperature where relevant to athlete-facing display. Unit conversion remains deterministic and lives in the Calculation layer, not in the AI layer — the AI is not the Calculation Engine and must not perform ad-hoc unit conversion in its own output.

## 5. Exercise Library localization
The Exercise Library remains canonical (single source of truth per exercise). Localized presentation may add display name, description, instructions, cues and help text per locale. A language switch must never duplicate an exercise record or fork it into a language-specific copy.

## 6. AI + new exercises + program generation (explicit clarification, this sprint)
New exercises added to the canonical Exercise Library may become candidates for future AI program generation once sufficient validated metadata is present. Flow:

`Canonical Exercise Library → validated metadata → athlete context → Calculation → Decision Rules → Evidence/constraints → AI Coach → Program`

The AI must not invent exercises when canonical-library-based generation is used; it selects from validated, canonical entries only. This clarification does not change the AI Output Contract (`MS-F4-01`) or the Decision/Evidence authority model — it only confirms that newly added, validated library content is not permanently excluded from AI-assisted programming.

## 7. Proposed mastersprints
These are new, PLANNED product-plan IDs. Per `docs/DOCUMENTATION_GOVERNANCE.md`, they follow the same precedent already established for the Teamsport supplemental mastersprints (`docs/TEAMSPORT_ROADMAP_2_0.md` §7): documented here as canonical product direction, **not yet added to the machine-readable `docs/ROADMAP_INDEX.json`**. They must not be reported as implemented until repository/DB/test evidence supports a maturity change, and their eventual index-integration is deferred to the next formal roadmap-index canonicalization sprint (consistent with how MS-F6-07..09 / MS-F11-07..10 are handled).

### MS-I18N-01 — Internationalization Foundation
**Priority:** P2. **Phase:** cross-cutting, targeted for scheduling alongside/after F2 Athlete Core Excellence (UX surface must be stable before a translation layer is worth building against it).

Scope: locale model; preferred locale; translation service; translation keys; fallback; missing-key behavior; canonical ID/display separation; date/time formatting; number formatting; unit presentation; Exercise Library localization; Workout localization; Program localization; Decision explanation localization; AI Coach locale; error localization; tests.

Acceptance:
- training/business logic is independent of translated labels;
- canonical IDs remain stable across locales;
- deterministic fallback behavior (missing key falls back to a defined default locale, never a blank/broken string);
- a missing translation never causes a crash;
- switching language never changes a Calculation result;
- switching language never changes a Decision outcome;
- at least two locales (nl-NL, en) are testable end-to-end.

Status: **PLANNED**

### MS-I18N-02 — Dutch + English Complete Language Coverage
**Priority:** P2. **Phase:** after MS-I18N-01. **Dependencies:** MS-I18N-01.

Coverage minimum: onboarding; Home; Training; Teamsport; Progressie; Coach; Profile/Settings; Exercise Library; Workout Builder; Mijn trainingen; Preview; Execution; Logging; History; Recovery; errors; warnings; empty states; Decision explanations; AI Coach; programs/workouts.

Acceptance:
- full NL coverage;
- full EN coverage;
- fallback behavior tested;
- mobile overflow/truncation tested for both locales;
- Decision semantic equivalence between NL and EN explanations (same meaning, not a literal machine translation of a threshold);
- canonical identities remain equal between languages (no forked IDs).

Status: **PLANNED**

## 8. Dependency rules
- MS-I18N-01 depends on no other new sprint, but is only worth scheduling once the Athlete Core UX surface it wraps (F2) is reasonably stable — an earlier build would translate a moving target.
- MS-I18N-02 depends on MS-I18N-01.
- i18n must not be used to justify deferring Calculation/Decision/Evidence work, and must not be treated as a prerequisite that blocks F2/F3 — it is additive, cross-cutting presentation work.
- Product Telemetry event IDs (`docs/PRODUCT_TELEMETRY_FEEDBACK_ROADMAP_2_0.md`) are canonical/language-neutral for the same reason exercise IDs are: an analytics event must mean the same thing regardless of the athlete's locale.

## 9. Explicit out of scope for this roadmap update
This document adds product direction only. It does not implement a translation service, does not add translation keys to `index.html`, does not add new locale columns/tables, and does not translate any existing UI string. No database migration. No new dependency installed.

**I18N ROADMAP DECISION: INTEGRATED AS PLANNED PRODUCT DIRECTION**
