# B9-H3A Provider Capability Matrix

## Google Health (Fitbit-achterliggend)

**TYPE:** Health platform (Android)
**IMPLEMENTED:** Ja (HRV/RHR/sleep)
**ARCHITECTURE READY:** Ja (generiek normalisatiepatroon deels herbruikbaar)
**CONNECTION METHOD:** OAuth2 via Google Health API
**AUTH TYPE:** OAuth2 + PKCE (`wearable-auth-start.js`/`wearable-auth-callback.js`)
**PERMISSIONS/SCOPES:** `googlehealth.*` (specifiek per datatype, least-privilege)
**WORKOUTS:** Nee. **HEART RATE:** Nee (los). **HRV:** Ja (dailyHeartRateVariability). **RESTING HR:** Ja (dailyRestingHeartRate). **SLEEP:** Ja. **STEPS:** Nee. **GPS:** Nee. **DISTANCE/PACE/SPEED/POWER/CADENCE/ELEVATION/LAPS:** Nee. **CALORIES:** Nee. **BODY METRICS:** Nee. **SPORT-SPECIFIC METRICS:** N.v.t.
**HISTORICAL SYNC:** Ja, sinds-datum-gebaseerd (`sinceDate`). **INCREMENTAL SYNC:** Ja. **REALTIME:** Nee. **WEBHOOK:** Niet gevonden. **MANUAL REFRESH:** Ja.
**PROVENANCE:** `provider`/timestamps aanwezig (niet in detail herverifieerd deze sessie). **NORMALIZATION:** `recordShape()`-helper. **DEDUPLICATION:** Niet apart geaudit deze sessie (geen activity-import om te dedupliceren). **DATA QUALITY:** Niet expliciet herverifieerd deze sessie. **FRESHNESS:** Niet expliciet herverifieerd deze sessie.
**TOKEN REFRESH:** Ja (`wearableTokenVault.js`, 20/20 getest). **DISCONNECT:** Ja (`wearable-disconnect.js`). **DELETE:** Onderdeel van account-deletion (niet apart herverifieerd deze sessie). **ERROR HANDLING:** `classifyException()`/`providerCode()`, canonieke foutclassificatie aanwezig.
**SOFTWARE TEST:** Ja (162+ assertions over 3 testsuites). **EXTERNAL PROVIDER TEST:** Onbekend (niet binnen deze sessie te verifiëren). **REAL DEVICE TEST:** Onbekend.
**STATUS:** SOFTWARE VALIDATED (voor HRV/RHR/sleep) — EXTERNAL PROVIDER VALIDATION OPEN — REAL DEVICE VALIDATION OPEN.

## Concept2 (PM5, Rowing/SkiErg)

**TYPE:** Ergometer (real-time, lokale verbinding)
**IMPLEMENTED:** Ja
**ARCHITECTURE READY:** Ja
**CONNECTION METHOD:** Transport-geïnjecteerd (BLE/USB, app-geleverd), geen cloud-OAuth
**AUTH TYPE:** N.v.t. (lokale device-pairing)
**WORKOUTS:** Ja. **HEART RATE:** Ja (indien gekoppeld). **DISTANCE/PACE/POWER:** Ja (Concept2-watt). **CADENCE (stroke rate):** Ja. **SPLITS:** Ja.
**HISTORICAL SYNC:** N.v.t. (real-time). **REALTIME:** Ja, expliciet ondersteund (`concept2Live.js`, 95/95 tests) inclusief reconnect-scenario's (`fConcept2MidWorkoutIsolation`, 10/10).
**PROVENANCE:** Concept2 als bron, expliciet. **NORMALIZATION:** `CONCEPT2_MAP`/`CONCEPT2_STROKE_MAP`.
**SOFTWARE TEST:** Ja (105+ assertions). **REAL DEVICE TEST:** eerder (MS-F5-02) vastgesteld als open.
**STATUS:** SOFTWARE VALIDATED — REAL DEVICE VALIDATION OPEN (herbevestigd, niet nieuw opgelost deze sessie).

## Apple HealthKit / Garmin / Polar / WHOOP / Suunto / COROS / Strava / TrainingPeaks / Technogym / EGYM / Wattbike / Keiser / Life Fitness / Matrix / Precor / Milon / Gym80

**IMPLEMENTED:** Nee, voor alle bovenstaande.
**ARCHITECTURE READY:** Deels (het generieke normalisatiepatroon uit `deviceIntegration.js` is herbruikbaar; Technogym/EGYM-klasse apparatuur heeft een feasibility-document, `fGymDeviceProviderContract.test.js`).
**STATUS:** NOT IMPLEMENTED. Geen enkele van deze providers claimt enige hogere status dan dit binnen deze audit.
