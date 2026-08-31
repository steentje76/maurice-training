# F14 Existing State Audit — Scientific Platform

**Baseline:** main `a1f66c6598dff1ef8a3358d11312399b5378c9bd`, APP_VER v4.69.30.
F13: SOFTWARE CLOSED — EXTERNAL PROVIDER/DEVICE VALIDATION OPEN. F14: NIET GESTART (bevestigd, geen enkel F14-artefact in de repo).

## F14-scope (uit de actuele `docs/ROADMAP_INDEX.json`, niet uit deze opdracht aangenomen)

| ID | Naam | Priority | Dependencies | Target maturity | Status |
|---|---|---|---|---|---|
| MS-F14-01 | Research Consent & Withdrawal | P1 | MS-F3-09 (CLOSED, geverifieerd) | IMPLEMENTED | NOT STARTED |
| MS-F14-02 | Reproducible Dataset Export | P2 | MS-F14-01 | IMPLEMENTED | NOT STARTED |
| MS-F14-03 | Cohort & Research Governance | P3 | MS-F14-01, MS-F14-02 | TESTED | NOT STARTED |
| SCI-CONSENT-001 (capability) | -- | P1 | EVID-SCI-001 (=MS-F3-09, CLOSED) | IMPLEMENTED | NOT STARTED |

Volgorde is dwingend: MS-F14-01 -> MS-F14-02 -> MS-F14-03.

## CURRENT -> EVIDENCE -> GAP -> TARGET -> DEPENDENCIES -> ACCEPTANCE -> RISKS

### MS-F14-01 — Research Consent & Withdrawal

- **CURRENT:** geen research-consent-infrastructuur. Live DB-scan (`information_schema`): 0 tabellen met "consent"/"privacy" in de naam. Enige gerelateerde kolommen: `cyclus_consent boolean` + `consented_at timestamptz` -- een simpel, niet-versioneerbaar boolean-vlag-paar voor Women's Performance-cyclustracking, nergens in `index.html` daadwerkelijk gebruikt (vermoedelijk legacy/ongebruikt), en functioneel niet geschikt voor research-consent (geen doelbinding, geen versie, geen intrekgeschiedenis).
- **EVIDENCE:** `information_schema.columns`/`tables`-scan (live), `docs/CAPABILITY_REGISTRY.md` regel 114 bevestigt "consent-flow ontbreekt volledig, vereist vóór enige research-export".
- **GAP:** volledige, nieuwe consent-laag ontbreekt: geen expliciete, doelgebonden, intrekbare, versioneerbare, traceerbare research-consent-registratie.
- **TARGET:** een nieuwe `research_consents`-tabel (append-only geschiedenis, nooit destructief overschreven -- intrekking is een nieuwe rij, geen UPDATE/DELETE van de vorige toestemming) + een minimale UI-flow (opt-in, nooit vooraf aangevinkt, met een duidelijke, losse toestemmingsvraag per doel) + intrekfunctionaliteit.
- **DEPENDENCIES:** MS-F3-09 (Evidence Registry Metric Audit) is CLOSED -- voldaan.
- **ACCEPTANCE:** "Explicit research-specific consent" (roadmap-tekst, letterlijk). Nooit impliciet uit account/algemene voorwaarden/wearable/Women's Performance/coach/social/commercieel.
- **RISKS:** dark patterns (voorafgevinkte toestemming, verwarrende taal); consent die per ongeluk andere, bestaande functionaliteit blokkeert voor niet-deelnemers; een tabel-ontwerp dat intrekking niet aantoonbaar, auditeerbaar maakt.

### MS-F14-02 — Reproducible Dataset Export

- **CURRENT:** geen exportendpoint, geen data-dictionary.
- **GAP:** volledig te bouwen, afhankelijk van MS-F14-01 se consent-status.
- **TARGET:** een server-authoritative export-endpoint met volledige provenance (conform sectie 4/8 van de opdracht) -- pas relevant zodra MS-F14-01 staat.
- **DEPENDENCIES:** MS-F14-01 (nog niet gebouwd bij aanvang van deze sessie).
- **RISKS:** een export zonder consent-check, cross-user-export, ontbrekende provenance.

### MS-F14-03 — Cohort & Research Governance

- **CURRENT:** niets.
- **GAP:** volledig te bouwen, afhankelijk van beide voorgaande.
- **DEPENDENCIES:** MS-F14-01 + MS-F14-02.

## Discrepanties tussen normatieve documenten (conform sectie 1 van de opdracht)

Geen discrepantie gevonden tussen `ROADMAP_INDEX.json` en de opdracht se eigen beschrijving van F14 -- de opdracht se scope-beschrijving (Research Consent, Reproducible Export, Cohort Governance) komt overeen met de drie canonieke mastersprints. Geen aanname nodig, geen conflict om te documenteren.

## Vervolg

Start met MS-F14-01 (P1, hoogste prioriteit, enige mastersprint zonder open dependency).
