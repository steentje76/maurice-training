# HIDDEN_CAPABILITY_INVENTORY.md

Alles wat een gebruiker normaal niet ziet, geverifieerd via code/database/tests doorheen deze en eerdere sessies.

## Calculation Engine
**CODELOCATIE:** `core/calculation.js`. **DOEL:** enige, centrale bron van sport-/recovery-/lichaamsberekeningen. **DATABASEOBJECTEN:** leest uit `activities`/`sessions`/`hrv_log`/`programs`. **ZICHTBAAR RESULTAAT:** ja, indirect (elk cijfer in de app). **STATUS:** FULLY OPERATIONAL, geen shadow-calculations gevonden elders (herhaaldelijk geaudit: Devices, Ergometers, Recovery, Women's Performance).

## Context Engine / Decision Engine
**CODELOCATIE:** `core/decision.js`. **DOEL:** readiness-signalen combineren (`READINESS_SIGNALEN`: hrv/rhr/slaap/spierherstel/gevoel/trainingsbelasting), team/coach-autorisatieregels. **STATUS:** OPERATIONAL. Geen categorie-gebaseerde (bijv. cyclusfase-only) beslisregels gevonden.

## Evidence Registry / Confidence / Data Quality
**CODELOCATIE:** verspreid, o.a. `core/cycle.js` (`estimatedPhaseConfidence`, B9-H5), `activities.data_quality`/`source_provenance` (B9-01/H3B). **STATUS:** PARTIAL -- sterk voor Women's Performance/cloud-activities, minder expliciet voor HRV-metric-type (nu wel als 'unknown' vastgelegd, long-run-sprint).

## AI Coach contracts
**CODELOCATIE:** `netlify/functions/coach.js` (proxy), `core/aiOutputContract.js`, `core/coachIntelligence.js` (whitelist-laag). **ZICHTBAAR RESULTAAT:** ja, via s-coach. **STATUS:** OPERATIONAL, boundary herhaaldelijk geaudit (geen raw-payload-doorgifte, geen zelfstandige herberekening).

## Provenance / normalization / deduplicatie
**CODELOCATIE:** `core/cloudActivityIngestion.js` (B9-H3B), `core/deviceIntegration.js` (Concept2). **DATABASEOBJECTEN:** `activities.dedupe_key` (unique partial index), `upsert_provider_activity()` RPC. **ZICHTBAAR RESULTAAT:** indirect (voorkomt dubbele trainingen). **STATUS:** OPERATIONAL, live bewezen.

## Sync / offline queue / retry
**CODELOCATIE:** `sbPostQ`/`sbPatchQ`/`sbDelQ` (index.html), `IDEMPOTENT_TABELLEN_MET_CLIENT_ID`. **STATUS:** OPERATIONAL voor de daarin geregistreerde tabellen (sessions/race_segments/nutrition_entries/team_events).

## Wearable ingestion / device adapters
**CODELOCATIE:** `netlify/functions/wearable-sync.js` (HRV/RHR/slaap), `wearable-sync-activities.js` (Running/Cycling via Google Health, B9-H3B), `_wearableAuthLib.js`. **ZICHTBAAR RESULTAAT:** ja, via s-lich-health-kaart en (na sync) trainingshistorie. **STATUS:** SOFTWARE COMPLEET, REAL ACCOUNT-VALIDATIE EXTERN OPEN (B9-H3C).

## Concept2 realtime
**CODELOCATIE:** `core/concept2Live.js`. **ZICHTBAAR RESULTAAT:** ja, tijdens een actieve Concept2-workout (binnen s-guided/s-builder-achtige execution-flow). **STATUS:** SOFTWARE COMPLEET, REAL DEVICE OPEN.

## Notifications
**CODELOCATIE:** `social_notifications`-tabel, `social_create_notification()` RPC (B9-07/H2C, hergebruikt voor team-events). **ZICHTBAAR RESULTAAT:** ja, via s-meldingen. **STATUS:** OPERATIONAL.

## Permissions / RLS / coach scopes
**CODELOCATIE:** `coach_access_scopes`, `coach_has_scope()` RPC, gebruikt op `hrv_log`/`cycle_periods` (RECOVERY_HEALTH/WOMENS_PERFORMANCE, apart geïsoleerd). **ZICHTBAAR RESULTAAT:** NEE (geen enkel scherm om coach-scopes te beheren -- backend-only, UI-requirement open). **STATUS:** BACKEND ONLY.

## Organization/team permissions
**CODELOCATIE:** `organizations`/`memberships`/`teams` (B9-H2A/B), `team_has_access()`. **ZICHTBAAR RESULTAAT:** NEE, 0 UI. **STATUS:** BACKEND ONLY.

## Privacy/consent
**CODELOCATIE:** `fWomensPrivacyConsent`-gedekte consent-model (F8). **ZICHTBAAR RESULTAAT:** deels, via s-privacy. **STATUS:** PARTIAL.

## Account deletion / data export
**CODELOCATIE:** `netlify/functions/delete-account.js` (expliciete, groeiende lijst van >30 tabellen). **ZICHTBAAR RESULTAAT:** ja, via s-settings (verwijderknop, aangenomen). **STATUS:** OPERATIONAL, herhaaldelijk uitgebreid en geverifieerd.

## Entitlements / subscription infrastructure
**CODELOCATIE:** niet diepgaand teruggevonden binnen deze sessie; bekend gat (B9-H2D): 0 entitlement-checks in coach-gerelateerde RLS. **STATUS:** UNVERIFIED / mogelijk PARTIAL elders (Mollie-integratie bekend uit projectmemories, niet in deze sessie geaudit).

## Feature flags
**STATUS:** UNVERIFIED, geen dedicated feature-flag-systeem teruggevonden binnen deze sessie se scope.

## Logging / monitoring / crash reporting / telemetry
**CODELOCATIE:** `core/observability.js` (`tkLog`), gebruikt in alle B9-H3-Netlify-functies. **ZICHTBAAR RESULTAAT:** NEE. **STATUS:** OPERATIONAL, backend-only.

## Background jobs / functions
**CODELOCATIE:** `netlify/functions/*` (wearable-sync, wearable-sync-activities, coach, delete-account, etc.). **STATUS:** OPERATIONAL.

## Security protections
**CODELOCATIE:** verspreid, RLS op praktisch elke tabel, SECURITY DEFINER-RPC's met expliciete `search_path`/`anon`-revokes (patroon herhaaldelijk bevestigd: `upsert_daily_health`, `upsert_provider_activity`, `coach_has_scope`, `team_has_access`). **STATUS:** OPERATIONAL, consistent patroon.
