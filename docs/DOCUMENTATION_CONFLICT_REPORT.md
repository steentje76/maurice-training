# DOCUMENTATION_CONFLICT_REPORT.md

**Methode:** code/DB/tests/git wint bij conflict. Elk conflict krijgt een verdict: ACTUAL, STALE, SUPERSEDED, PARTIAL, PRODUCT DECISION NOT YET IMPLEMENTED, of CONFLICTING. Geen document wordt verwijderd.

---

### Conflict 1 — Handbook (H1-H14) vs. code
**Document A (Handbook):** laatst bijgewerkt 2 augustus 2026; dekt geen Women's Performance-schermen (`s-lich-cyclus`), geen HYROX-Adaptive-classificaties, geen Multi-Sport Interval Execution (v4.69.0), geen `evidence_store.v1`/DEC-036-corroboratieregel.
**Document B (Skill/proces):** Handbook is hoogste autoriteit; code wordt aan het Handbook aangepast.
**Actual evidence:** code bevat al deze features (`core/cycle.js`, `race_relay_*`-kolommen, `core/intervalEngine.js`, `core/scientificEvidence.js`), grondig getest (release gate groen).
**Verdict:** PARTIAL — het Handbook is niet fout, het is **onvolledig t.o.v. de huidige code**. Waar het Handbook wél iets specificeert, geldt het nog; waar het zwijgt over iets dat inmiddels bestaat, is de code de facto leidend totdat het Handbook is bijgewerkt.
**Action:** zie `HANDBOOK_UPDATE_PLAN.md`.

### Conflict 2 — `AI_CONTEXT/NEXT_SESSION_CONTEXT.md` vs. `docs/00_Project_Management/CURRENT_STATE.md`
**Document A:** claimt v3.3.3→v3.3.12 als laatste stand (1 augustus 2026).
**Document B:** claimt v4.69.0 + P0-closure (28 augustus 2026), zelfde commit als HEAD.
**Actual evidence:** git log bevestigt HEAD = laatste commit van CURRENT_STATE.md.
**Verdict:** STALE (document A) — 68 releases achter.
**Action:** `NEXT_SESSION_CONTEXT.md` niet meer gebruiken als sessie-ingang; `CURRENT_STATE.md` is de ingang.

### Conflict 3 — `docs/DATABASE_STATUS.md` vs. live DB
**Document A:** "alle tien migraties uitgevoerd" (19 augustus).
**Actual evidence:** live schema bevat kolommen tot v4.95.0 (cycle_periods, race_type, race_relay_*), 17 migratiebestanden in repo.
**Verdict:** STALE (point-in-time, niet fout voor die datum).
**Action:** expliciet dateren als snapshot, of vervangen door een per-release gegenereerd document (zie `DOCUMENTATION_GOVERNANCE.md`).

### Conflict 4 — `docs/12_Roadmap/Roadmap.md` vs. `docs/CURRENT_ROADMAP.md`
**Document A:** zelf al gemarkeerd "VEROUDERD — 19 augustus 2026".
**Verdict:** SUPERSEDED (document zelf erkent dit al correct).
**Action:** geen — voorbeeld van correct verouderd-markeren, blijft als archief staan.

### Conflict 5 — Vijf `DECISION_REQUIRED`-documenten (Women's Performance) vs. `CURRENT_ROADMAP.md`
**Document A:** vijf open vragen (zwangerschap, postpartum, menopauze, anticonceptie, bekkenbodem), 26 augustus.
**Document B:** noemt deze als openstaand.
**Verdict:** ACTUAL — geen conflict, correct als open productbeslissing gemarkeerd.
**Action:** PRODUCT DECISION NOT YET IMPLEMENTED — wacht op Maurice, zie Master Roadmap 2.0 track 8 (F8).

### Conflict 6 — `CHANGELOG.md` (root) vs. `docs/RELEASE_CHANGELOG.md`
**Document A:** doorlopend, 271 KB, alle releases.
**Document B:** point-in-time voor v4.48.0 specifiek.
**Verdict:** PARTIAL — geen tegenspraak, wel overlap/duplicatie. Root-CHANGELOG is de volledige bron; het losse RC0-document is een historisch releaseverslag.
**Action:** root-CHANGELOG blijft de actieve bron; RC0-document naar HISTORICAL-classificatie (al gedaan in `DOCUMENTATION_INVENTORY.md`).

### Conflict 7 — Oudere sprintrapporten (`docs/Sprintrapporten/`, project-knowledge `claude_*_Report.md`) vs. huidige staat
**Document A:** tientallen/honderden puntsgewijze sprintverslagen, sommige met claims die later zijn ingehaald (bv. vroege Doelen-CRUD-status vóór latere consolidatie in Voortgang, v4.21.0).
**Actual evidence:** router (`go()`) bevestigt `s-doelen` nu redirect naar `s-stats` (v4.21.0-consolidatie).
**Verdict:** HISTORICAL — correct als geschiedenis, niet als huidige status.
**Action:** compacte index in `docs/RELEASE_HISTORY.md`; niet verwijderen.

### Conflict 8 — Eerdere Capability Registry (module-niveau) vs. productniveau-realiteit
**Document A (deze mastersprint-serie, eerste iteratie):** dekte alleen `core/*.js` + `netlify/functions/*.js` (~35 capabilities).
**Actual evidence:** 38 top-level schermen + 6 AI-aanroeppunten + horizontale systemen bestaan en zijn nu apart geïnventariseerd.
**Verdict:** PARTIAL (niet fout, eerste iteratie was expliciet beperkt in scope, zoals daar ook vermeld).
**Action:** uitgebreid in deze sprint, zie bijgewerkte `CAPABILITY_REGISTRY.md`.

### Conflict 9 — `docs/PLAY_STORE_READINESS.md`/`RELEASE_READINESS.md` (19 augustus, v4.48.0) vs. huidige v4.69.0
**Verdict:** STALE — 21 releases oud, met name relevant zodra een daadwerkelijke Play Store-publicatie weer actueel wordt.
**Action:** REQUIRES REVIEW vóór een volgende Play Store-actie, niet urgent voor deze consolidatie.

---

## Samenvatting
- **Opgelost/geclassificeerd in deze sprint:** 9 conflicten.
- **Geen enkel conflict was "CONFLICTING" (tegenstrijdig zonder duidelijke winnaar)** — alle gevallen waren STALE, SUPERSEDED, PARTIAL of correcte open productbeslissingen. Dat is een positief signaal voor de onderliggende documentatiediscipline (documenten liegen niet, ze lopen alleen achter).
- **Nog open:** een volledige inhoudelijke vergelijking van elk Handbook-hoofdstuk regel-voor-regel tegen de code is niet gedaan (zie `HANDBOOK_UPDATE_PLAN.md` voor de aanpak daarvan).
