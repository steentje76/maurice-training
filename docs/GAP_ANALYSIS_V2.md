# GAP_ANALYSIS.md — v2 (Master Roadmap 2.0 Consolidatie)

**Status t.o.v. v1:** GAP-P0-001/002/003 zijn CLOSED (zie `SECURITY_FINDINGS.md`). Deze v2 herprioriteert de resterende gaps na de volledige capability/architectuur/benchmark-audit en voegt nieuwe gaps toe uit de index.html-, AI-governance- en benchmark-analyse.

Prioriteiten: **P0** security/data-integriteit/architectuur/release-blocker · **P1** kernproduct/kritieke benchmark-gap · **P2** grote verbetering · **P3** latere optimalisatie · **P4** lange termijn/research/beyond-benchmark.

---

## P0 — geen nieuwe gevonden
Geen acuut datalek of actief dataverlies aangetroffen tijdens deze consolidatie-audit. **Geen "EMERGENCY P0 FOUND".**

---

## P1 — kernproduct / kritieke benchmark-gap

### GAP-P1-001 — Handbook-drift (ongewijzigd t.o.v. v1, nu met exact bewijs)
H6 (Screen Library) en H9 (AI Governance) zijn **bevestigd feitelijk stale** (geen "Cyclus"/`s-lich-cyclus`-referentie, geen `evidence_store.v1`/DEC-036). Zie `HANDBOOK_UPDATE_PLAN.md`.
**Target:** H6/H9/H12 eerst bijwerken. **Dependency:** geen. **Complexiteit:** L.

### GAP-P1-002 — Commercial/Entitlements heeft geen UI
**Current:** DB-schema volledig aanwezig (`plans`, `features`, `credit_packs`, `plan_feature_quota`, `usage_log`), **geen enkel scherm** onder de 38 geïnventariseerde top-level schermen gebruikt dit schema.
**Evidence:** CODE VERIFIED (index.html-doorzoeking, geen `plans`/`features`-referentie gevonden client-side).
**Benchmark:** alle onderzochte concurrenten hebben een zichtbare upgrade-flow.
**Target:** minimaal een "huidige plan"-scherm binnen Profiel, vóór enige multi-gym-commercialisering.
**Dependency:** blokkeert Track 14 (Commercial). **Complexiteit:** M.

### GAP-P1-003 — AI-outputcontract (ongewijzigd, nu met concreet bewijs uit de governance-matrix)
Geen technische blokkade tegen AI die een niet-onderbouwd cijfer noemt of een medische-diagnose-achtige uitspraak doet. `scientificEvidence.js` beschermt **regels**, niet de vrije AI-tekst zelf.
**Target:** contracttest op de AI-responsstructuur (schema-validatie), zie ook GAP-P0-002-vervolg uit de closure-sprint.
**Dependency:** geen. **Complexiteit:** M.

### GAP-P1-004 — Phase 3-RLS-scoping (ongewijzigd uit v1)
`organizations`/`teams`/`training_groups`/`seasons`/`macrocycles`/`mesocycles`/`microcycles` leesbaar voor elke ingelogde gebruiker, 0 rijen nu.
**Target:** membership-gebaseerde scoping vóór Phase 3-data.
**Dependency:** blokkeert Track 13 (Gym/Club/Team). **Complexiteit:** M.

### GAP-P1-005 — AI-adaptive-programmering-gat t.o.v. Hevy Trainer
**Current:** Hevy Trainer (feb 2026) genereert een volledig, zelf-aanpassend programma; TK's AI-coach legt uit/chat/genereert weekvoorstellen (`buildCtx()`-aanroeppunten voor week-generatie bestaan al) maar heeft geen volledig gesloten auto-aanpassingslus vergelijkbaar qua volwassenheid.
**Evidence:** Web (juni 2026) + code (2 van de 6 AI-aanroeppunten zijn al week-generatie-gericht — dit is dichterbij dan het lijkt).
**Target:** onderzoeken of de bestaande week-generatie-aanroepen (regel ~10888, ~11253 in index.html) kunnen doorgroeien naar een volledig gesloten, evidence-onderbouwde auto-aanpassingslus — TK's differentiator zou de uitlegbaarheid zijn die Hevy Trainer niet biedt.
**Dependency:** EVID-SCI-001, DEC-CORE-001. **Complexiteit:** L.

---

## P2 — grote verbetering

### GAP-P2-001 — Vijf openstaande Women's Performance-besluiten (ongewijzigd)
**Dependency:** blokkeert Track 8 (F8). **Complexiteit:** M-L per besluit.

### GAP-P2-002 — 7 `bak_p_*`-backuptabellen zonder retentiebeleid (ongewijzigd)
**Complexiteit:** S.

### GAP-P2-003 — Observability ontbreekt structureel
**Current:** geen bewijs van client-side errortracking of gestructureerde server-side monitoring buiten Netlify's eigen logs.
**Evidence:** GEEN BEWIJS GEVONDEN (architectuur-audit, sectie 2).
**Target:** minimaal basis error-logging voor de Netlify Functions (bv. gestructureerde console.error die via `Supabase:query_logs` doorzoekbaar is — deels al aanwezig, niet centraal ontsloten).
**Complexiteit:** M.

### GAP-P2-004 — `config.anthropic_key`-encryptie niet geverifieerd (ongewijzigd)
**Complexiteit:** S.

### GAP-P2-005 — `docs/DATABASE_STATUS.md`/`PLAY_STORE_READINESS.md`/`RELEASE_READINESS.md` verouderd (ongewijzigd, nu met Conflict Report-verwijzing)
**Target:** zie `DOCUMENTATION_GOVERNANCE.md` voor het te kiezen onderhoudsmodel.
**Complexiteit:** S per document.

---

## P3 — latere optimalisatie

### GAP-P3-001 — Redundante ownership-check `WITH CHECK` ontbreekt (ongewijzigd)
### GAP-P3-002 — `fAndroidRelease.test.js` vereist lokale Android-build (deels verzacht: nu zichtbaar SKIPPED i.p.v. hard falen, sinds P0-003-fix)
### GAP-P3-003 — Component Library (H7)/Motion Design (H11) niet geverifieerd op drift
**Complexiteit:** M (vereist inhoudelijke vergelijkingssessie).

---

## P4 — lange termijn / research / beyond benchmark

### GAP-P4-001 — Publieke social/community-laag
Bewust laag geprioriteerd (Skill-prioriteitenlijst zet "Automatisering" boven "Integraties" en beide boven "Nieuwe functionaliteit"; social staat niet expliciet genoemd maar past qua aard bij de lage-prioriteitscategorieën). Alleen relevant als Maurice de productvisie expliciet verbreedt.

### GAP-P4-002 — Scientific Platform (research-ready export, consent-governance)
Track 16 in Master Roadmap 2.0 — vereist eerst een volwassen Evidence-laag (al aanwezig) + expliciete consent-flow (nog niet gebouwd).

---

## Samenvatting

| Prioriteit | Aantal | Kern |
|---|---|---|
| P0 | 0 (3 CLOSED) | — |
| P1 | 5 | Handbook-drift, Commercial-UI-gat, AI-outputcontract, Phase 3-RLS, AI-programmering-benchmark-gap |
| P2 | 5 | Women's Performance-besluiten, backup-tabellen, observability, secret-encryptie-verificatie, verouderde readiness-docs |
| P3 | 3 | Cosmetische hardening, Android-testafhankelijkheid (verzacht), Handbook H7/H11 |
| P4 | 2 | Social-laag (bewust), Scientific Platform (lange termijn) |
