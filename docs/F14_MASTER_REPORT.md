# F14 Scientific Platform — Master Report

**Start SHA:** `a1f66c6598dff1ef8a3358d11312399b5378c9bd` (F13 SOFTWARE CLOSED).
**Final SHA:** `087ee60b5c6de7af1854e8f9b05e1e5f1335c6ee`.
**APP_VER:** v4.69.32.

## Mastersprints

| ID | Naam | Status | PR |
|---|---|---|---|
| MS-F14-01 | Research Consent & Withdrawal | **CLOSED** | #186 |
| MS-F14-02 | Reproducible Dataset Export | **CLOSED** | #187 |
| MS-F14-03 | Cohort & Research Governance | **CLOSED** | #188 |

## Daadwerkelijk gebouwde capabilities

- `research_consents` (migratie_v530.sql): append-only consent-geschiedenis, doelgebonden, versioneerbaar, intrekbaar, volledig los van elk ander consent-mechanisme.
- `export_research_dataset()` (migratie_v531.sql): individuele, server-authoritative export zonder user-id-parameter, consent-gate, dataminimalisatie, pseudonimisering, volledige provenance.
- `export_research_cohort()` + `research_cohort_access_log` (migratie_v532.sql): platform-autoriteit (system_role), k-anonimiteit-drempel (minimaal 3 subjects), audit-logging.

## Architecture decisions

- Nieuwe, aparte laag boven de bestaande RAW->CALCULATION->CONTEXT->DECISION->EVIDENCE->AI->UX-keten -- geen enkele bestaande engine gewijzigd of gedupliceerd.
- Consent, individuele export, en cohort-export delen hetzelfde pseudonimiseringsschema (consistente, reproduceerbare subject_id's tussen exports).
- Platform-autoriteit voor cohort-toegang hergebruikt `system_role` (F13-P1-08-precedent), nooit `gym_role_level`.

## Scientific methodology

Alle geëxporteerde velden zijn ruwe observaties (`calculation_id: raw_observation`), geen afgeleide Calculation Engine-uitkomsten in deze eerste versie -- geen risico op verwarring tussen Observatie/Afgeleide metric/Decision (sectie 3).

## Calculation Registry-impact / Evidence Registry-impact

Geen wijziging -- F14 introduceert geen nieuwe calculations/decision rules, uitsluitend een export-laag voor bestaande, ruwe sessiedata.

## Consentmodel

Expliciet, doelgebonden (`general_research_export`), versioneerbaar (`consent_version`), intrekbaar (nieuwe rij, nooit een wijziging), traceerbaar (append-only geschiedenis). Nooit impliciet uit account/wearable/Women's Performance/coach/social/commercieel.

## Privacy/securitymodel

RLS overal, least privilege vanaf dag 1 (geen herhaling van de F13-P2-bevinding over te ruime standaard anon-grants) voor beide nieuwe research-tabellen. Cohort-toegang vereist expliciete platform-autoriteit + een k-anonimiteitsdrempel.

## Exportmodel

`schema_version: research_export.v1` (individueel) / `research_cohort_export.v1` (cohort). JSON, geen NDJSON of ander formaat gebouwd zonder aantoonbare behoefte (sectie 8).

## Pseudonimisatiemodel

`sha256(user_id + server-side salt)`. Nadrukkelijk **pseudonymous**, nooit "anonymous" genoemd -- de hash is omkeerbaar voor wie de salt+uid kent.

## AI-boundary-resultaten

0 AI-call-sites (`coach.js`) raken de research-tabellen. AI berekent niets nieuws voor F14 -- geen p-values/correlaties/effect sizes toegevoegd.

## Causal-language-audit

0 verboden termen ("voorkomt blessures", "bewijst overtraining", "AI heeft vastgesteld", etc.) gevonden in alle F14-code/migraties.

## Statistical-integrity-audit

Geen nieuwe statistische analyses toegevoegd in F14 -- niet van toepassing op deze sprint.

## Sabotagebewijzen

- MS-F14-01: impliciete opt-in (consent altijd true) -> gedetecteerd, teruggedraaid.
- MS-F14-02: onterechte "anonymous"-claim -> gedetecteerd, teruggedraaid.
- MS-F14-03: k-anonimiteitsdrempel uitgeschakeld -> gedetecteerd, teruggedraaid.

## Database migrations

`migratie_v530.sql`, `migratie_v531.sql`, `migratie_v532.sql`.

## Live verificaties

Alle drie sprints: live, adversarial getest binnen niet-gecommitte transacties (anon geweigerd, cross-user geweigerd, correcte happy-path bevestigd), 0 restanten na afloop bevestigd.

## Tests

46 nieuwe assertions (12+22+12) over drie nieuwe testbestanden, alle groen.

## Release-gate-resultaat

199/199 groen (was 196 vóór F14).

## Doc-consistency-resultaat

Volledig groen, inclusief na de roadmap/capability-registry-statuswijzigingen.

## Open P0/P1/P2/P3

Geen nieuwe P0/P1 geïntroduceerd. Bestaande, van vóór F14 bewaarde open punten (conform sectie 18, niet administratief laten verdwijnen):
- Projectbrede least-privilege-grants-hardening (P2).
- Endurance-datamodel / GAP-P2-025 (P2).
- HRV-calculation-placement-architectuurschuld (PARTIAL, P1-06).
- Repository media weight (P2).
- `select=*`-optimalisatie (bewust buiten scope).
- Externe provider/device-validaties (Google Play/Apple StoreKit, iOS-timing).

## Externe validatie

Geen externe research/ethiek-validatie uitgevoerd in deze sprint (geen externe partij/IRB betrokken) -- de software-architectuur is klaar, ethische/onderzoeksvalidatie is een aparte, toekomstige stap.

## Deferred researchmogelijkheden

- Uitbreiding van `research_purpose` naar meer, specifieke doelen dan `general_research_export`.
- Uitbreiding van het exportdomein voorbij `sessions` (bijv. cardio/endurance-data, na het GAP-P2-025-contract).
- NDJSON/streaming-export bij een aangetoonde behoefte aan grote datasets.

## Finale F14-status

**F14 SCIENTIFIC PLATFORM SOFTWARE CLOSED — EXTERNAL RESEARCH/ETHICS VALIDATION OPEN.**

Alle drie canonieke mastersprints zijn met bewijs (code + database + tests + live-verificatie + sabotage) gesloten. Geen enkele nieuwe P0/P1. De software-architectuur is volledig, veilig en functioneel -- externe, formele onderzoeks-/ethiekvalidatie (bijv. een IRB-achtige toetsing als dit ooit voor echt, extern onderzoek wordt gebruikt) is bewust niet gesimuleerd of aangenomen, en blijft daarom expliciet open.

**F15 NIET GESTART** (absolute stop-instructie).
