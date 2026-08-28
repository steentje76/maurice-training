# OBSERVABILITY_CONTRACT.md — Trainingskompas (MS-F1-02)

**Bron:** `core/observability.js` (`observability_event.v1`), CODE VERIFIED, 52/52 tests groen.
**Doel:** traceerbaarheid + foutdiagnose + veilige logging + één consistente architectuur. Geen analytics-warehouse, geen user-behavior-tracking, geen marketing-telemetrie.

## Event-model

| Veld | Verplicht | Omschrijving |
|---|---|---|
| `timestamp` | ✅ | ISO-8601 |
| `level` | ✅ | DEBUG/INFO/WARN/ERROR/SECURITY |
| `event` | ✅ | `domain.component.action`, bv. `training.workout.start` |
| `domain` | ✅ | bv. `training`, `ai`, `wearable`, `platform` |
| `component` | ✅ | bv. `execution`, `coach`, `wearable-sync` |
| `app_version` | ✅ | huidige `APP_VER` |
| `environment` | ✅ | `browser` / Netlify `process.env.CONTEXT` |
| `correlation_id` | optioneel | koppelt events binnen dezelfde operatie/flow; bevat nooit user-ID/e-mail/token |
| `session_id` | optioneel | alleen indien veilig/pseudoniem |
| `operation` | optioneel | bv. `sync`, `request`, `save_set` |
| `status` | optioneel | bv. `success`, `no_new_data` |
| `duration_ms` | optioneel | |
| `error_code` / `error_class` | optioneel | zie foutnormalisatie |
| `retry_count` | optioneel | |
| `provider` | optioneel | bv. `anthropic`, `google_health` |
| `metadata` | optioneel | overige veilige, geredacteerde data |

## Log levels
- **DEBUG** — ontwikkeldiagnose, niet standaard permanent opgeslagen.
- **INFO** — belangrijke succesvolle lifecycle-event.
- **WARN** — recoverable afwijking of degraded mode.
- **ERROR** — operatie mislukt.
- **SECURITY** — security-sensitive event zonder credential/data-exposure.

## Event-naming
Vast patroon `domain.component.action`. Voorbeelden: `training.workout.start`, `training.persistence.error`, `auth.session.restore_failed`, `wearable.sync.start`/`.complete`/`.failed`, `ai.coach.request_started`/`.request_completed`/`.request_failed`, `app.uncaught_error`, `app.unhandled_rejection`.

## Correlation-strategie
`ObservabilityCore.newCorrelationId()` genereert een niet-cryptografische, willekeurige string (`cid_<timestamp36>_<random><random>`). Levensduur: per operation/flow (bv. één AI-request, één wearable-sync-run), niet permanent per gebruiker. Bevat nooit user-ID, e-mail of token.

## Foutnormalisatie
`ObservabilityCore.normalizeError(err, opts)` classificeert naar: `ProviderError` (Supabase/PostgREST/externe provider, met `http_status`/`provider_code`), `TimeoutError` (AbortError, `retryable: true`), `NetworkError`, of generieke `Error`. `message_safe` is altijd een generieke, veilige samenvatting — de rauwe `.message` (kan padinformatie/PII bevatten) wordt nooit 1-op-1 doorgegeven. Retryable-classificatie: HTTP 408/429/500/502/503/504.

## Redactie (DO-NOT-LOG)
`ObservabilityCore.redact()` vervangt case-insensitive elke key die een van deze substrings bevat door `[REDACTED]`, recursief in geneste objecten en arrays: `token`, `password`, `secret`, `authorization`, `cookie`, `api_key`/`apikey`, `access_token`, `refresh_token`, `pin`, `hash`, `service_role`, `jwt`, `credential`.

**Callers moeten daarnaast zelf geen gevoelige wáárden onder een onverdachte key meegeven** — de redactielaag beschermt op key-naam, niet op inhoud. Expliciet nooit loggen (ook niet onder een veilige key): volledige AI-prompt/response met athlete-context, cycle symptoms, HRV raw values, sleep-detail, bodyweight/body composition, private coach notes, medische context, willekeurige DB-row-dumps, e-mail (tenzij technisch noodzakelijk), naam. Gebruik in plaats daarvan veilige metadata zoals `context_sections=5` of `field_present=true`.

## Gedekte flows (deze sprint)

| Domein | Status | Bewijs |
|---|---|---|
| AI Coach | **COVERED** | `coach.js`: request_started/completed/failed, geen prompt/respons-inhoud |
| Wearables | **COVERED** | `wearable-sync.js`: sync.start/complete/failed, naast bestaande privacy-bewuste diagnostiek |
| Platform (frontend) | **COVERED** | `window.onerror` + `unhandledrejection` → `app.uncaught_error`/`app.unhandled_rejection` |
| Auth | NOT YET COVERED | login/logout/session-restore nog niet geïnstrumenteerd |
| Training execution | NOT YET COVERED | workout start/resume/persistence-failure nog niet geïnstrumenteerd (contract ondersteunt dit al, zie `observability.test.js` sectie J) |
| Database (overige functies) | PARTIAL | alleen via coach.js/wearable-sync.js; `delete-account.js`, `gym-team.js`, `wearable-auth-*.js` nog niet geïnstrumenteerd |
| Devices (Concept2) | NOT YET COVERED | |
| PWA/release | NOT YET COVERED | |
| Security | PARTIAL | bestaande `gym_audit_log` blijft de aparte security-audit-trail (per ontwerp, sectie 23 van de opdracht — operational logs en security audit logs zijn bewust gescheiden) |

## Persistente opslag & retentie
**Geen** externe observability-provider en **geen** eigen telemetrie-tabel toegevoegd in deze sprint (bewuste keuze, zie opdracht §22: eerst een consistent event/error-contract, provider pas bij aantoonbare noodzaak). Events landen nu in de Netlify Function-logs (console) resp. de browserconsole — geen persistente, doorzoekbare opslag buiten wat het platform zelf al biedt.

**Retentiebeleid (follow-up-contract, nog niet gebouwd):**
- DEBUG: niet persistent, alleen console tijdens ontwikkeling.
- INFO/WARN/ERROR (operationeel): momenteel gebonden aan Netlify's eigen logretentie (niet los gedefinieerd door dit project).
- SECURITY: blijft in `gym_audit_log` (aparte, reeds bestaande tabel met eigen RLS).
- Toekomstig: als eigen opslag ooit wordt overwogen, expliciet beoordelen op volume/PII-risico/RLS/kosten (zie GAP-vervolg).

## Open gaps (vervolgwerk, niet in deze sprint)
- Instrumentatie van `delete-account.js`, `gym-team.js`, `wearable-auth-*.js`.
- Training-execution-lifecycle-events (start/resume/persistence-failure/finish/discard).
- Auth-flow-events (login/logout/session-restore/refresh-error).
- Device-integratie-events (Concept2 connect/disconnect/parse-failure).
- Persistente, doorzoekbare operational-log-opslag + formeel retentiebeleid.
