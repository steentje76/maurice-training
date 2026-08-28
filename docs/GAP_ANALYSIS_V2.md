# GAP_ANALYSIS_V2.md — Trainingskompas (canonieke, actuele versie — vervangt de losse "v1" volledig)

**Laatst herbouwd:** 28 augustus 2026, tegen `main` @ (wordt bijgewerkt na de Observability Foundation-merge — zie git log voor de actuele HEAD).
**Regel:** dit document toont de HUIDIGE openstaande gaps. Gesloten gaps staan uitsluitend in sectie "CLOSED GAPS / HISTORICAL" onderaan en tellen niet mee in de totalen. Er bestaat geen apart "v1"-bestand meer in de repo — deze V2 is de enige bron.

---

## Actuele open-gap-telling

| Prioriteit | Aantal |
|---|---|
| P0 | **0 open** |
| P1 | 2 |
| P2 | 7 |
| P3 | 3 |
| P4 | 2 |

Geen enkel P0 is momenteel open. De drie eerder gevonden P0's zijn gesloten via PR #64. Een vierde, tijdens de Multi-tenant RLS Security Closure-sprint gevonden P0 (self-privilege-escalatie via `users`-kolommen) is gesloten via `migratie_v497.sql`. GAP-P1-004 (Gym-RLS-scoping) is gesloten via `migratie_v498.sql` (zelfde sprint). Het observability-kernraamwerk (voorheen GAP-P2-003) is gesloten via de Observability Foundation-sprint — het P2-aantal blijft 7 omdat het verkleinde vervolg-item (resterende instrumentatie) als apart, kleiner P2-item is blijven staan. Zie sectie "CLOSED GAPS / HISTORICAL" voor alle drie.

---

## P1 — kernproduct / kritieke benchmark-gap

### GAP-P2-006 — Handbook-drift (verplaatst van P1, zie Roadmap 2.0 v1.1 §29)
**Capability-ID:** DOC-HANDBOOK-001
**Current:** H6 (Screen Library) en H9 (AI Governance) bevestigd feitelijk stale (geen "Cyclus"/`s-lich-cyclus`-referentie in H6; geen `evidence_store.v1`/DEC-036-referentie in H9). Laatst bijgewerkt 2 augustus, code staat op v4.69.0.
**Evidence:** CODE VERIFIED (grep tegen Handbook-bestanden).
**Target:** H6/H9/H12 inhoudelijk bijwerken volgens `docs/HANDBOOK_UPDATE_PLAN.md`.
**Dependency:** geen. **Test:** n.v.t. (documentatie). **Validation:** handmatige review na update.
**Priority:** **P2** (gedowngraded van P1 — Roadmap 2.0 v1.1: "documentatie is geen vervanging voor productwaarde"; blijft wel F1-onderhoud, MS-F1-04). **Complexity:** L. **Roadmap phase:** F1.

### GAP-P2-007 — Commercial/Entitlements heeft geen UI (verplaatst van P1/F2, zie Roadmap 2.0 v1.1 §32)
**Capability-ID:** COMM-UI-001
**Current:** DB-schema volledig aanwezig (`plans`, `features`, `credit_packs`, `plan_feature_quota`, `usage_log`); geen enkel scherm onder de 38 geïnventariseerde top-level schermen gebruikt dit schema.
**Evidence:** CODE VERIFIED (index.html doorzocht op `plans`/`features`-referenties: 0 treffers client-side).
**Target:** tier/waardepropositie + entitlement domain model (MS-F12-01) → entitlement enforcement (MS-F12-02) → plan-overzichtsscherm/Commercial UX (MS-F12-03) → billing/reconciliation (MS-F12-04).
**Dependency:** GYM-RLS-SCOPING-001 — inmiddels VALIDATED (zie sectie "CLOSED GAPS / HISTORICAL"), geen resterende blocker.
**Priority:** **P2** (gedowngraded van P1 — een bestaand DB-schema of benchmark-pariteit rechtvaardigt op zichzelf geen vroege bouw). **Complexity:** M. **Roadmap phase:** **F12** (verplaatst van F2).

### GAP-P1-003 — AI-outputcontract ontbreekt
**Capability-ID:** AI-OUTPUT-CONTRACT-001 (**expliciet onderscheiden van de reeds gesloten security-capability voor dezelfde proxy**, zie sectie "CLOSED GAPS / HISTORICAL" en Capability Registry — dit is een governance-gat, geen security-gat)
**Current:** `coach.js`/`buildCtx()` zijn security-getest (JWT, open-proxy-regressie — zie de historische P0-002-sluiting hierboven) maar er is geen technische controle die een AI-antwoord blokkeert als het een niet-onderbouwd cijfer noemt of diagnose-achtige taal gebruikt.
**Evidence:** CODE VERIFIED — `scientificEvidence.js` beschermt Decision Rules, niet de vrije AI-tekst zelf (zie Product Architecture §5).
**Target:** contracttest op het AI-responsschema (MS-F4-01).
**Dependency:** EVID-SCI-001.
**Priority:** P1. **Complexity:** M. **Roadmap phase:** F2.

### GAP-P1-005 — AI-adaptive-programmering-gat t.o.v. Hevy Trainer
**Capability-ID:** AI-PROGRAM-AUTOGEN-001
**Current:** Hevy Trainer (feb 2026) genereert een volledig, zelf-aanpassend trainingsprogramma. TK heeft AI-gestuurde week-generatie-aanroepen (2 van de 6 `buildCtx()`-aanroeppunten), maar geen even volwassen, gesloten auto-aanpassingslus.
**Evidence:** Web (juni 2026, PRPath-vergelijking) + CODE VERIFIED (index.html regel ~10888, ~11253).
**Target:** bestaande week-generatie doorontwikkelen, met TK's evidence-laag als differentiator t.o.v. Hevy's black-box-aanpak.
**Dependency:** EVID-SCI-001, DEC-CORE-001.
**Priority:** P1. **Complexity:** L. **Roadmap phase:** F4.

---

## P2 — grote verbetering

### GAP-P2-001 — Vijf openstaande Women's Performance-productbeslissingen
**Capability-ID:** WOMENS-PERF-DECISIONS-001
**Current:** `docs/Womens_Performance/DECISION_REQUIRED_{zwangerschap,postpartum,menopauze,anticonceptie,bekkenbodem}.md`, open sinds 26 augustus.
**Target:** vijf expliciete besluiten van Maurice, daarna implementatie.
**Dependency:** blokkeert Track 8 (F8) volledig.
**Priority:** P2. **Complexity:** M-L per besluit. **Roadmap phase:** F8.

### GAP-P2-002 — 7 `bak_p_*`-backuptabellen zonder retentiebeleid
**Capability-ID:** PLAT-BACKUP-CLEANUP-001
**Current:** 7 losse backup-kopieën (93-154 rijen elk), zonder primary key, RLS aan/geen policies (onbereikbaar voor gebruikers, wel nog in de DB).
**Evidence:** DB VERIFIED.
**Target:** exporteren en verwijderen via een kleine, expliciet goedgekeurde migratie.
**Priority:** P2. **Complexity:** S. **Roadmap phase:** F1.

### GAP-P2-003 (verkleind) — Observability: resterende instrumentatie
**Capability-ID:** PLAT-OBSERVABILITY-001
**Current:** kernevent-contract (`core/observability.js`) bestaat en is geïntegreerd in AI-coach, wearable-sync en frontend-error-capture (zie sectie "CLOSED GAPS / HISTORICAL" voor het volledige bewijs van die kern-closure). Nog niet geïnstrumenteerd: `delete-account.js`, `gym-team.js`, `wearable-auth-*.js`, training-execution-lifecycle, auth-flow, device-integratie (Concept2). Geen persistente/doorzoekbare operational-log-opslag, geen formeel retentiebeleid.
**Evidence:** CODE VERIFIED — zie `docs/OBSERVABILITY_CONTRACT.md` §"Gedekte flows" en §"Open gaps".
**Target:** resterende functies/flows instrumenteren met het bestaande contract; retentiebeleid formaliseren.
**Priority:** P2. **Complexity:** M. **Roadmap phase:** F1/F13.

### GAP-P2-004 (uitgebreid via de Secrets & Configuration Hygiene-sprint) — Orphaned secret-achtige DB-kolommen + client-side lock-hardening
**Capability-ID:** SEC-CONFIG-001
**Current:** `config.anthropic_key` en `config.pin_hash` bevatten beide een waarde maar hebben 0 code-referenties (repo-breed geverifieerd) — vermoedelijk historische duplicaten van vóór de server-side proxy-architectuur. RLS blokkeert client-toegang correct (alleen `service_role`); risico is onnodige attack surface, niet actieve exposure. Daarnaast: de client-side app-lock (`PIN_HASH` in index.html) is een ongesalte, hardcoded SHA-256-hash zichtbaar in verzonden JS — geen echte autorisatiegrens (die loopt via Supabase Auth + RLS), wel een low-severity design-punt.
**Evidence:** DB VERIFIED (aanwezigheid, nooit waarden) + CODE VERIFIED (0 referenties). Zie `docs/CONFIGURATION_SECURITY_CONTRACT.md` F-01/F-02/F-03.
**Target:** F-01/F-02 — bevestig met Product Owner dat niets buiten deze repo deze kolommen leest, verwijder daarna in een aparte, expliciet goedgekeurde migratie. F-03 — productbeslissing of een sterkere client-lock gewenst is.
**Blocker classificatie:** F-01/F-02 = `MANUAL_USER_VALIDATION_REQUIRED`. F-03 = `PRODUCT_DECISION_REQUIRED`. Geen van beide blokkeert de closure van de Secrets & Configuration Hygiene-sprint zelf (geen actieve exposure).
**Priority:** P2 (F-01/F-02), P3 (F-03). **Complexity:** S. **Roadmap phase:** F1.

### GAP-P2-005 — Verouderde point-in-time-documenten
**Current:** `docs/DATABASE_STATUS.md` (19 aug, claimt 10 migraties; live schema loopt tot v4.95.0), `docs/PLAY_STORE_READINESS.md`/`RELEASE_READINESS.md` (19 aug, v4.48.0).
**Target:** zie `docs/DOCUMENTATION_GOVERNANCE.md` — bij een volgende relevante gebeurtenis een nieuw gedateerd document toevoegen i.p.v. overschrijven.
**Priority:** P2. **Complexity:** S per document. **Roadmap phase:** F1.

---

## P3 — latere optimalisatie

### GAP-P3-001 — Redundante ownership-check ontbreekt in `WITH CHECK` (defense-in-depth)
`exercises`/`custom_trainings`/`equipment_catalog` leunen voor ownership-afdwinging volledig op `BEFORE INSERT`-triggers, niet op de RLS `WITH CHECK` zelf. **Complexity:** S.

### GAP-P3-002 — Handbook H7 (Component Library)/H11 (Motion Design) niet inhoudelijk geverifieerd op drift
Geen concreet bewijs van veroudering gevonden, maar ook niet actief uitgesloten. **Complexity:** M.

### GAP-P3-003 — `fAndroidRelease.test.js` blijft CI-only valideerbaar
Sinds de P0-003-fix skipt deze test zichtbaar i.p.v. hard te falen buiten een Android-buildomgeving — acceptabel, geen verdere actie vereist tenzij de lokale dev-flow dit vaker nodig heeft. **Complexity:** S.

---

## P4 — lange termijn / research / beyond benchmark

### GAP-P4-001 — Publieke social/community-laag
Bewust laag geprioriteerd — geen productbeslissing om dit te bouwen. **Roadmap phase:** F9 (alleen bij expliciete koerswijziging).

### GAP-P4-002 — Scientific Platform (research-ready export, consent-governance)
Vereist eerst een consent-flow (nog niet gebouwd) bovenop de al aanwezige Evidence-laag. **Roadmap phase:** F14.

---

## CLOSED GAPS / HISTORICAL

### GAP-P2-003 (voorheen) — Observability ontbreekt volledig — **STATUS: CLOSED (kern) via MS-F1-02**
- **Original finding:** geen bewijs van gestructureerde client- of server-side monitoring buiten Netlify's eigen functielogs.
- **Resolution:** `core/observability.js` (`observability_event.v1`) — event-contract, 5 loglevels, correlation-ID's, redactielaag, foutnormalisatie, fail-safe serialisatie. Geïntegreerd in `coach.js`, `wearable-sync.js`, en als globale frontend-error-capture.
- **Mastersprint:** MS-F1-02.
- **Evidence:** `core/observability.test.js` 52/52, incl. verplichte security-sabotagetest (geen enkele secretwaarde lekt door) en failure-simulaties. Zie `docs/OBSERVABILITY_CONTRACT.md`.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED voor het kernraamwerk. Resterende instrumentatie-uitbreiding blijft open als GAP-P2-003 (verkleind, zie boven) — geen volledige closure geclaimd voor wat nog niet is geïnstrumenteerd.


### GAP-P1-004 (voorheen) — Multi-tenant RLS-scoping ontbreekt — **STATUS: CLOSED (MS-F1-01)**
- **Original finding:** `organizations`/`teams`/`training_groups`/`seasons`/`macrocycles`/`mesocycles`/`microcycles` leesbaar voor elke ingelogde gebruiker (`auth.role()='authenticated'`, geen ownership-scoping). 0 rijen op dat moment.
- **Resolution:** `migratie_v498.sql` — 7 brede policies vervangen door membership-gescoopte policies (met owner-bootstrap-uitzondering).
- **Mastersprint:** MS-F1-01.
- **Evidence:** live SQL-transactietest met 2 volledig gescheiden tenants — lid van tenant A ziet tenant A (ALLOW), ziet tenant B niet (DENY), onbetrokken gebruiker ziet geen van beide (DENY), owner zonder eigen membership-rij ziet zijn eigen organisatie (ALLOW). Regressietest: `core/fGymRlsMultiTenant.test.js`.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — GYM-RLS-SCOPING-001 nu VALIDATED.

### GAP-P0-004 (nieuw gevonden tijdens MS-F1-01) — Self-privilege-escalatie via `users`-tabel — **STATUS: CLOSED**
- **Original finding:** policy `users_update_own` (`USING id=auth.uid()`) had geen kolomrestrictie, en `authenticated` had UPDATE-GRANT op `gym_role`/`gym_id`/`system_role`. Een gewone gebruiker kon zichzelf via een directe PostgREST-PATCH naar `gym_role='owner'` én `system_role='developer'` promoveren, volledig buiten de hiërarchie-checks van `gym-team.js` om.
- **Resolution:** `migratie_v497.sql` — `BEFORE UPDATE`-trigger die deze drie kolommen terugzet naar hun oude waarde tenzij de aanroep van `service_role` komt.
- **Mastersprint:** MS-F1-01 (niet in de oorspronkelijke audit gevonden — ontdekt tijdens de threat-model-tests van deze sprint).
- **Evidence:** live SQL-transactietest — self-update van de drie kolommen wordt geblokkeerd (waarden blijven ongewijzigd); service-role-update (simuleert `gym-team.js`) slaagt zoals bedoeld. Regressietest: `core/fGymRlsMultiTenant.test.js`.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — nieuwe capability SEC-USERROLE-001, CLOSED.


Deze gaps zijn gesloten. Ze tellen niet mee in de totalen hierboven. Bewaard voor auditeerbaarheid.

### GAP-P0-001 — Publieke blootstelling `gyms`-tabel — **STATUS: CLOSED**
- **Original finding:** RLS-policy `gyms_read` (`USING true`, rol `public`) liet de `anon`-rol alle kolommen van `gyms` lezen, incl. `owner_email`, `coach_pin_hash`, `mollie_customer_id`.
- **Resolution:** `migratie_v496.sql` — policy verwijderd, geen vervanging (deny-all voor anon/authenticated, service_role blijft werken).
- **PR:** #64.
- **Evidence:** `SET LOCAL ROLE anon/authenticated` → 0 rijen; `service_role` → 1 rij. Regressietest `core/fGymsRlsSecurity.test.js`.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — geen open actie. Volledige details in `SECURITY_FINDINGS.md`.

### GAP-P0-002 — Ontbrekende regressietests op security-kritieke Netlify Functions — **STATUS: CLOSED**
- **Original finding:** `coach.js`, wearable-auth-flow, `delete-account.js`, `gym-team.js` hadden geen dedicated geautomatiseerde test.
- **Resolution:** 61 nieuwe assertions over 4 nieuwe testbestanden. Tijdens testontwerp een echte bug gevonden en gefixed: een manager kon een owner degraderen naar `lid` (`target.gym_role_level >= caller.gym_role_level`-check toegevoegd aan `gym-team.js`).
- **PR:** #64.
- **Evidence:** `core/fCoachProxySecurity.test.js` (12/12), `core/fGymTeamSecurity.test.js` (17/17), `core/fWearableAuthSecurity.test.js` (20/20), `core/fDeleteAccountSecurity.test.js` (12/12).
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — geen open actie. (Zie GAP-P1-003 voor het aparte, nog wél open AI-**outputcontract**-governance-gat — dat is een andere capability dan deze security-testdekking.)

### GAP-P0-003 — Lokale release gate dekte 10 van ~75 testbestanden — **STATUS: CLOSED**
- **Original finding:** `core/release-gate.js` (lokaal `npm test`-commando) had een hardcoded lijst van 10 testbestanden.
- **Correctie tijdens closure:** GitHub's `quality-gate.yml` draaide al sinds 18 augustus (vóór de audit) alle `core/*.test.js` via een eigen bash-lus — de daadwerkelijke, door GitHub afgedwongen merge-bescherming was dus minder lek dan aanvankelijk gerapporteerd. Alleen het lokale gemakscommando was incompleet.
- **Resolution:** `core/release-gate.js` herbouwd naar discovery-based (v2), ontdekt nu automatisch alle 78 testbestanden. Bewezen via een tijdelijke, volledig teruggedraaide sabotage-test in `fCycle.test.js`.
- **PR:** #64.
- **Evidence:** `node core/release-gate.js` → 80 uitgevoerd, 1 zichtbaar geskipt (Android), 0 gefaald.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — geen open actie.

---

## Legacy → canonical capability-ID-mapping

| Legacy GAP-ID (v1) | Canonical capability-ID (Roadmap 2.0 v1.1) |
|---|---|
| GAP-P0-001 | SEC-GYMS-001 (CLOSED) |
| GAP-P0-002 | SEC-TEST-001 (CLOSED) |
| GAP-P0-003 | SEC-GATE-001 (CLOSED) |
| GAP-P1-001 (Handbook, v1) | DOC-HANDBOOK-001 → hernummerd **GAP-P2-006** (P1→P2 per v1.1 §29) |
| GAP-P1-002 (Commercial UI, v1) | COMM-UI-001 → hernummerd **GAP-P2-007** (P1→P2, F2→F12 per v1.1 §32) |
| GAP-P1-003 (Phase 3-RLS, v1) | GYM-RLS-SCOPING-001 (blijft P1, mastersprint nu MS-F1-01) |
| GAP-P2-001 (Women's Performance, v1) | WOMENS-PERF-DECISIONS-001 |
| GAP-P2-002 (backup-tabellen, v1) | PLAT-BACKUP-CLEANUP-001 |

**Volledige mastersprint-ID-migratie (57 oude PR#68-IDs → 79 canonieke v1.1-IDs):** zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md`.
