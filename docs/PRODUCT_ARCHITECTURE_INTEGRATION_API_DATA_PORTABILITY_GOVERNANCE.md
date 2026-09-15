# Trainingskompas Target Product Architecture — Integration, API & Data Portability Governance

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** externe integraties, import/export, partner-API's, webhooks, canonical mappings, consent/scopes, portability en connector governance. Geen definitieve publieke API-productkeuze.

## 1. Doel
Externe bronnen en partners moeten Trainingskompas kunnen voeden of gebruiken zonder dat iedere integratie een eigen datamodel en businesslogica creëert.

Harde keten:
`SOURCE -> CONNECTOR/ADAPTER -> NORMALIZATION/PROVENANCE -> CANONICAL MODEL -> CALCULATION -> CONTEXT -> DECISION -> AI/UX`.

## 2. Integratietypen
Minimaal onderscheiden: device realtime, health/platform cloud import, activity platform import, calendar, nutrition/product data, event provider, organization/partner, billing provider, research export en toekomstige public API.

## 3. Connector Registry
Per connector: connector_id, provider, category, auth type, scopes, supported capabilities, canonical mappings, sync modes, polling/webhook, rate limits, freshness, provenance rules, dedupe policy, correction precedence, error taxonomy, deletion/disconnect behavior, external validation status en version.

## 4. Canonical-first
Geen provider-specifieke velden verspreid door productlogica als canonical equivalent bestaat. Raw provider payload mag apart bewaard worden indien noodzakelijk en toegestaan, maar productengine werkt op normalized canonical data.

## 5. Provenance
Elke imported value behoudt provider/source, external id, source timestamp, received timestamp, connector version, quality/confidence en raw/derived/corrected status waar relevant.

## 6. Authentication/scopes
OAuth/API-key/device auth least-privilege. Vraag alleen scopes die feature nodig heeft. Tokens server-side/protected; geen secrets in logs/client state.

## 7. Consent
Connector authorization door provider is niet automatisch toestemming voor delen met coach/team/research. Downstream sharing volgt eigen consent/authorization.

## 8. Sync modes
Ondersteun waar passend full bootstrap, incremental sync, webhook/event driven, realtime stream en manual refresh. Elk heeft checkpoints/cursors en idempotency.

## 9. Idempotency/dedupe
External id waar betrouwbaar, anders deterministic composite matching. Realtime + later cloud import van dezelfde sessie mag geen duplicate history opleveren.

## 10. Source precedence
Manual correction wordt niet stil overschreven door latere import. Precedence is domain-specific/versioned: official result kan bijvoorbeeld wedstrijdstatus bepalen terwijl device stream analysis voedt.

## 11. Missingness
Provider levert veld niet -> UNKNOWN, niet nul. Connector mappings mogen ontbrekende data niet fabriceren.

## 12. Units/time
Normalize units deterministically en bewaar source unit. Timestamps met timezone/offset/source semantics. DST/travel tests verplicht.

## 13. Schema evolution
Provider API en TK canonical schema veranderen. Connector versioning/migrations/backward compatibility voorkomen silent semantic drift.

## 14. API contracts
Interne/externe API's hebben versioned schemas, stable identifiers, validation, error codes, pagination, rate limits en auth scopes. Geen undocumented database-shaped API als productcontract.

## 15. Webhooks
Signed verification waar provider ondersteunt, replay protection, idempotency, ordering/reconciliation, retry/dead-letter handling en observability.

## 16. Rate limits/outages
Backoff/jitter, retry-after respecteren, queueing en degraded state. Provider outage blokkeert manual/no-device baseline niet.

## 17. Disconnect
Disconnect stopt nieuwe sync en revoke/delete tokens. Reeds athlete-owned imported history blijft behouden tenzij user expliciet data verwijdert; policy per connector zichtbaar.

## 18. Provider deletion
Als provider resource verdwijnt, TK verwijdert niet automatisch historisch athlete record zonder expliciete semantics. Tombstone/source state kan nodig zijn.

## 19. Import portability
User kan eigen data importeren via governed formats. Import preview/validation, mapping/provenance, dedupe, unit/time checks en conflict resolution. Geen guessing van unknown exercise/product identities zonder bevestiging.

## 20. Export portability
Export omvat eigen canonical data in begrijpelijk/machine-readable formaat waar passend, met timestamps/units/provenance. Geen secrets/internal authorization metadata.

## 21. Data correction
Imported data kan door user worden gecorrigeerd waar product dit toestaat. Bewaar original + correction/audit en herbereken via Calculation Engine.

## 22. Partner API
Toekomstige partner API krijgt registered client, scoped permissions, tenant context, rate limits, audit, versioning en revocation. Partner contract ≠ blanket athlete consent.

## 23. Organization integration
Gym/Club/Team partnerintegraties werken via canonical organization/team/membership model, niet legacy gym_id shortcuts.

## 24. Calendar
TK blijft source of truth voor training content; externe calendar vooral timing/planning. Controlled bidirectional sync alleen met conflict/versioning rules.

## 25. Devices
Physical device identity, connector account en canonical source zijn afzonderlijk. Eén provider-account kan meerdere devices hebben; één workout meerdere devices.

## 26. Data quality contract
Connector declareert per capability known limitations en quality flags. Wearable calorie expenditure blijft estimate; HRV metric type blijft expliciet/unknown als source het niet betrouwbaar meldt.

## 27. Evidence boundary
Imported metric is een measurement/source, niet evidence voor interpretatie. Calculation/Decision/Evidence layers bepalen betekenis.

## 28. AI boundary
AI krijgt normalized/scoped canonical values, niet onbeperkte raw provider payloads. AI mag providerdata niet herinterpreteren alsof ontbrekende units/semantics bekend zijn.

## 29. Privacy/security
RLS/server auth op imported data, encrypted tokens, minimum scopes, no cross-user external-id leakage, GDPR export/delete/disconnect flows en breach response.

## 30. External validation status
Per connector onderscheid SOFTWARE IMPLEMENTED/TESTED versus REAL ACCOUNT/DEVICE/PROVIDER VALIDATED. Geen CLOSED claim zonder passend bewijs.

## 31. Certification/conformance
Voor strategische partners kan connector conformance suite bestaan: sample payloads, unit/time semantics, duplicates, corrections, missingness, disconnect, deletion, load/retry en security.

## 32. Public API governance
Nog geen verplicht public API-product. Als geopend: capability allowlist, version policy, developer terms, sandbox, quotas, audit, deprecation policy en no direct DB access.

## 33. Functional >=9
Vereist Connector Registry, canonical-first mappings, provenance, least scopes, idempotent sync, dedupe, correction precedence, missingness, schema/version handling, webhook security, outage/retry, disconnect/delete, import/export, partner isolation, timezone/unit tests, external-validation status, AI boundary en adversarial cross-account tests.

## 34. Harde regels
`CONNECTORS TRANSPORT DATA; THEY DO NOT DEFINE TRAINING TRUTH.`
`RAW PROVIDER PAYLOAD != CANONICAL PRODUCT MODEL.`
`PROVIDER AUTHORIZATION != DOWNSTREAM CONSENT.`
`DISCONNECT STOPS SYNC; IT DOES NOT SILENTLY ERASE HISTORY.`