# PRODUCT_DATAFLOW_MAP.md

## A. Krachttraining
`s-train-mgr/s-builder/s-guided` → invoer sets/reps/weight/rpe → `sessions`-tabel → `core/calculation.js` → spierherstel/volume-trends (`s-lich-spieren`) → geen AI-herberekening → geschiedenis in `s-hist`.

## B. Hardlopen
`s-running` → handmatige invoer OF Google Health `exercise`-sync (`wearable-sync-activities.js`, B9-H3B) → `core/cloudActivityIngestion.js` (normalisatie) → `upsert_provider_activity()` RPC → canonieke `activities`-tabel → `core/runningIntelligence.js` (critical speed, adherence) → `s-running-insights` → AI Coach (canonieke output alleen).

## C. Fietsen
Identieke keten als B, met `cyclingIntelligence.js` en `s-cycling-insights`.

## D. Concept2
PM5 (Web Bluetooth) → `core/concept2Live.js` (realtime normalisatie, machinefamilie-specifiek: RowErg/SkiErg/BikeErg met correcte, aparte pace-basis) → `sessions`-tabel (bewust NIET `activities`, zie B9-H6B) → `core/cardio.js` (calculation) → geschiedenis in `s-hist`. Geen apart Concept2-scherm; opgenomen in de generieke workout-execution-flow.

## E. Herstel/HRV
Google Health (`wearable-sync.js`) OF handmatige invoer → `hrv_log`-tabel (`hrv_source`/`hrv_metric_type`-provenance) → `core/calculation.js`/`decision.js` (`READINESS_SIGNALEN`, multi-signaal) → `s-lich-health` → geen enkelvoudige HRV-drempel-regel (bevestigd, B9-H4).

## F. Women's Performance
Handmatige invoer (`s-lich-cyclus`) → `cycle_periods`-tabel → `core/cycle.js` (`cycleContext()`, met `estimatedPhaseConfidence()`, B9-H5) → `core/cycleTraining.js` (neutrale correlatie, geen voorschrijvende regel) → weergave in `s-lich-cyclus`.

## G. Social
`s-social` → activiteiten/groepen/challenges → `social_*`-tabellen → `social_create_notification()` RPC → `s-meldingen`.

## H. Team
**Geen UI-pad bestaat.** Backend: coach maakt `team_events` (RPC) → `event_attendance`/`event_responsibilities` → `social_create_notification()` → geen scherm om dit te bekijken/beheren.

## I. Coach/PT
**Geen UI-pad bestaat.** Backend: `coach_athlete_relationships` (consent-lifecycle) → `coach_program_templates`/`coach_program_assignments` → `materialize_coach_assignment()` RPC → canonieke, athlete-owned `programs` → geen scherm voor coach-kant.

## J. Gym/Club
`s-admin` (pincode-beveiligd) → **legacy** `users.gym_id`/`gym_role` → gym-functionaliteit. De nieuwere, canonieke `organizations`/`memberships`/`teams`-laag (B9-H2A/B) bestaat parallel maar wordt door geen enkel scherm gelezen/geschreven.

## K. Nutrition
`s-nutrition` → maaltijd/hydratatie-invoer → `nutrition_entries`-tabel → `core/nutritionIntelligence.js` (timing-context, geen aanbevelingen) → weergave binnen `s-nutrition` ("Inzichten"-kaart).
