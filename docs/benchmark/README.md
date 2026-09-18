# Trainingskompas External Benchmark Knowledge Base

Status: v1 — initiated 2026-09-18.

## Purpose
This directory is the durable, version-controlled knowledge base for external app audits. It is intended for shared use by Maurice, ChatGPT, Claude and future audit/build sessions.

External observations are **inputs**, never implementation authority. Trainingskompas remains governed by its own architecture, evidence rules, privacy/security requirements and current canonical registries.

## Evidence discipline
Each finding must separate:
1. **Observed evidence** — directly visible in an APK/APKM/XAPK, runtime recording, public documentation or other identified source.
2. **Inference** — a technically plausible interpretation that is not directly proven.
3. **Solution pattern** — a generic problem-solving pattern abstracted from the evidence.
4. **TK current state** — verified against a named TK main/commit before implementation.
5. **TK opportunity** — an original TK design candidate, not copied proprietary implementation.

Confidence: HIGH = directly observed and reproducible; MEDIUM = strong inference from multiple artefacts; LOW = weak/partial inference. Server-side architecture is never asserted from a client binary alone.

## Repository policy
Do not commit competitor binaries, credentials, extracted proprietary source, copyrighted media or secrets. Record package/version, audit date, provenance and cryptographic hash when available. Do not copy competitor code or assets.

## Knowledge base
- [AUDIT_METHOD.md](AUDIT_METHOD.md) — repeatable external audit protocol.
- [SOLUTION_PATTERNS.md](SOLUTION_PATTERNS.md) — cross-competitor technical/product solution catalogue.
- [COMPETITOR_MATRIX.md](COMPETITOR_MATRIX.md) — evidence-based comparison index.
- [competitors/hevy-3.1.9.md](competitors/hevy-3.1.9.md) — complete static Hevy audit.\n- [competitors/fitbod-8.31.0-4.md](competitors/fitbod-8.31.0-4.md) — complete static Fitbod audit.\n- [competitors/runna-8.52.1.md](competitors/runna-8.52.1.md) — complete static Runna audit.\n- [competitors/trainheroic-8.36.0.md](competitors/trainheroic-8.36.0.md) — complete static TrainHeroic audit.\n- [competitors/boostcamp-264.md](competitors/boostcamp-264.md) — complete static Boostcamp audit.\n- [competitors/clue-267.0.md](competitors/clue-267.0.md) — complete static Clue audit.\n- [competitors/whoop-5.466.0.md](competitors/whoop-5.466.0.md) — complete static WHOOP audit.\n- [competitors/garmin-connect-5.28.md](competitors/garmin-connect-5.28.md) — complete static Garmin Connect audit.\n- [competitors/concept2-ergdata-2.2.29.md](competitors/concept2-ergdata-2.2.29.md) — complete static Concept2 ErgData audit.

## Promotion rule
A competitor finding does **not** become a roadmap item automatically. Before promotion:
- verify current TK main;
- check existing roadmap/gaps/capabilities/architecture;
- identify reusable TK components;
- assess Calculation → Context → Decision → AI impact where relevant;
- assess security/privacy/data impact;
- define tests/gates and evidence;
- then route through the canonical TK roadmap/change process.
