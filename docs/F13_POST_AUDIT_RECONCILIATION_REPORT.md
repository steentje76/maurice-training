# F13_POST_AUDIT_RECONCILIATION_REPORT.md — Trainingskompas

**Start SHA:** `76746a4c354ff321e849f8d46101e7fbcccdd885` (geclaimde "F13 SOFTWARE CLOSED" staat).
**Datum:** 31 augustus 2026.

## Belangrijkste conclusie tot nu toe

Het onafhankelijke Sprint 13 Master Audit Report bevatte minimaal twee kritieke, LIVE BEVESTIGDE, nog bestaande P0-kwetsbaarheden op de main die als "F13 SOFTWARE CLOSED" was gedocumenteerd. De eerdere claim was **niet correct** voor deze twee punten. Beide zijn nu hersteld en live geverifieerd.

## P0-bevindingen

| ID | Origineel | Actuele status vóór fix (live bevestigd) | Fix | Status |
|---|---|---|---|---|
| P0-A | `upsert_daily_health()`: SECURITY DEFINER, EXECUTE voor anon/PUBLIC, cross-user-check overgeslagen bij `auth.uid() IS NULL` | **STILL OPEN, LIVE BEVESTIGD**: een volledig anonieme aanroep kon daadwerkelijk HRV-data voor een willekeurige gebruiker schrijven (adversarial getest, transactie teruggedraaid) | `migratie_v525.sql`: EXECUTE ingetrokken van anon/PUBLIC + functielogica gebruikt `auth.role()='service_role'` i.p.v. de onveilige `auth.uid() IS NULL`-proxy | **VERIFIED CLOSED** |
| P0-B | `hrv_log_archive_v500`: RLS uit, SELECT/INSERT/UPDATE/DELETE/TRUNCATE voor anon/authenticated | **STILL OPEN, LIVE BEVESTIGD**: `relrowsecurity=false`, volledige CRUD-rechten voor `anon` bevestigd via `information_schema.table_privileges` | `migratie_v525.sql`: RLS aan zonder policies + alle rechten ingetrokken van anon/authenticated. Bevestigd via repo-brede scan: tabel wordt nergens in applicatiecode gebruikt (puur, passief archief) — geen data verwijderd | **VERIFIED CLOSED** |

## Live adversarial bewijs (beide, transacties zonder commit)
- P0-A: anon → permission denied; authenticated cross-user → RAISE EXCEPTION; authenticated eigen user → toegestaan; service_role → toegestaan (wearable-sync.js blijft werken).
- P0-B: anon → permission denied; authenticated → permission denied; data-integriteit: alle 8 originele rijen intact.

## Tests
`core/fUpsertDailyHealthSecurity.test.js` (5/5), `core/fHrvArchiveLockdown.test.js` (5/5). Beide met sabotagebewijs (oude, onveilige patroon teruggezet → gedetecteerd → teruggedraaid).

## F13-statuscorrectie (voorlopig, tijdens dit onderzoek)

**F13 REOPENED — SECURITY REMEDIATION IN PROGRESS.**

De eerdere claim "F13 SOFTWARE CLOSED — EXTERNAL PROVIDER/DEVICE VALIDATION OPEN" was onjuist voor P0-A/P0-B. Beide zijn nu hersteld. Onderzoek naar de resterende P1-bevindingen (P1-01 t/m P1-16) volgt.

## P1-bevindingen

| ID | Origineel | Actuele status vóór fix (live bevestigd) | Fix | Status |
|---|---|---|---|---|
| P1-01 | `coach.js` vertrouwde `payload.model`/`payload.max_tokens` rechtstreeks | **STILL OPEN, code-bevestigd**: `model: payload.model \|\| 'claude-sonnet-4-5'` en `max_tokens: payload.max_tokens \|\| 1000` werden ongewijzigd doorgegeven aan de Anthropic API | Server-side, vaste `AI_MODEL_PER_REQUEST_TYPE`-mapping (client-model wordt nooit gebruikt, ook niet als fallback) + `AI_MAX_TOKENS_CEILING_PER_REQUEST_TYPE` (client mag een lagere waarde vragen voor legitieme variatie tussen call-sites, nooit hoger dan het plafond) | **VERIFIED CLOSED** |

---
*Dit document wordt tijdens de sessie iteratief uitgebreid naarmate elke bevinding wordt onderzocht.*
