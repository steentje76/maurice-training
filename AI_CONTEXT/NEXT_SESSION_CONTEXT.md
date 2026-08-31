# NEXT_SESSION_CONTEXT — Trainingskompas

> Bijgewerkt aan het eind van de F13 Post-Audit Reconciliation & Remediation
> Masterprint-sessie (31 augustus 2026). Vervangt volledig de vorige versie
> van 1 augustus 2026 (v3.3.12) — die was extreem verouderd (F13 Post-Audit
> P1-15, bevonden en hersteld).

## Project
Trainingskompas — AI Performance Coach. Governance-niveau B (Middenweg).

## Huidige status
App-versie **v4.69.29**. Main SHA `b1d5d676b959a12bfdcdfe9684f4d909e158c276`.
Release gate: 194 stappen groen (0 gefaald). F13 is **REOPENED — SECURITY
REMEDIATION IN PROGRESS** (niet langer "SOFTWARE CLOSED" zoals eerder
geclaimd — zie `docs/F13_POST_AUDIT_RECONCILIATION_REPORT.md`).

## Wat er in deze sessie is gebeurd
Een onafhankelijk auditrapport identificeerde bevindingen die tijdens F13
gemist waren. Voor elke bevinding: opnieuw vastgesteld of het probleem nog
bestaat (nooit aangenomen dat een latere sprint het al opgeloste), dan
hersteld en live geverifieerd. Kleine, coherente PR's per bevinding
(#172-#180 t/m nu), elk met sabotagebewijs.

**P0/P1-bevindingen VERIFIED CLOSED (live bevestigd als echt, daarna hersteld):**
- P0-A: `upsert_daily_health()` liet een anonieme aanroeper toe gezondheidsdata
  voor een willekeurige gebruiker te schrijven (`migratie_v525.sql`).
- P0-B: `hrv_log_archive_v500` had geen RLS, volledige CRUD voor anon.
- P1-01: `coach.js` liet de client model/max_tokens bepalen (AI-kostenmisbruik).
- P1-02/03: AI-governance was client-side omzeilbaar; AI werd geinstrueerd
  zelf gewichten te verzinnen. Server-side AIOutputContract-validatie
  toegevoegd aan `coach.js`.
- P1-04: `sessions`-rijen hadden geen client-id -- een verloren HTTP-response
  kon een duplicate sessie opleveren. Idempotente upsert toegevoegd.
- P1-05: de offline-queue was niet user-scoped -- cross-account-leakage
  mogelijk op een gedeeld toestel. `owner_uid` per queue-item toegevoegd.
- P1-08: elke gym-owner (niet alleen de platform-eigenaar) kon de globale
  oefeningencatalogus muteren (`migratie_v526.sql`, `system_role`-vereiste).
- P1-09: OAuth-tokens (`wearable_connections`) stonden in plaintext -- nu
  via Supabase Vault (`migratie_v527.sql`).
- P1-16: 4 bevestigde XSS-sinks + een subtiel `JSON.stringify()`-in-
  `onclick`-patroon (nieuwe `escJsAttr()`-helper).

**Herbeoordeeld en correct bevonden (geen code-wijziging nodig, eerlijk als
zodanig gedocumenteerd i.p.v. blind CLOSED te laten staan):**
- P1-06: HRV-baseline-keten staat in index.html, maar is transparant
  geregistreerd in `CALC-REC-001` (PARTIAL, architectuurschuld expliciet
  vastgelegd, niet verplaatst -- risico van een gezondheidsgerelateerde
  refactor weegt zwaarder dan de architectuurwinst).
- P1-07: het HRV-baseline-model gebruikt al een echt tijdrollend venster
  (14/28 dagen), geen vaste rijentelling. VERIFIED CLOSED.
- P1-11: registry-dekking van alle 25 versioned contracts geinventariseerd
  -- gezond. `ai_guard.v1` alsnog geregistreerd als `CALC-GUARD-001`.
- P1-14: de bekende, terugkerende "1 consistentieprobleem" in
  `tools/check-doc-consistency.js` bleek een genuine false positive (een
  "grove heuristiek" matchte op tekstaanwezigheid, niet op semantiek). De
  checker zelf verbeterd -- voor het eerst in deze sessie draait de check
  volledig groen.
- P1-15 (dit document + 2 losse `.patch`-bestanden in de root): verouderde
  artefacten opgeruimd. Migration reproducibility: 62 live migraties vs.
  49 repo-bestanden geinventariseerd -- repo-migraties zijn geconsolideerde
  eindtoestanden per mastersprint (niet 1-op-1 met elke live, incrementele
  stap), maar het eindresultaat is volledig gedekt. Vanaf F13 Post-Audit
  is de conventie: elke live `apply_migration` krijgt direct een eigen,
  apart repo-bestand (zie `migratie_v525.sql` t/m `migratie_v527.sql`).

## Nog openstaand (F13 Post-Audit, resterende clusters)
- P1-10: endurance-datamodel (running/cycling/rowing) -- architectuuropgave,
  nog niet gestart.
- P1-12: query-scalability bij grote datavolumes -- nog niet gemeten.
- P1-13: crash/product-telemetry vóór gesloten beta -- nog niet gebouwd.
- UX-nabeschouwing, sport-capability-matrix, Google Health live-validatie,
  en de finale, allesomvattende F13-eindaudit (release gate, doc-consistency,
  security/AI/data/calculation/observability/performance/mobile).

## Belangrijke, actuele technische feiten
- `IDEMPOTENT_TABELLEN_MET_CLIENT_ID` (index.html): `sessions`/`race_segments`
  krijgen nu een client-side UUID + idempotente upsert.
- `escJsAttr()` (index.html, direct na `escHtml()`): gebruik dit voor elk
  nieuw `onclick='...'`-attribuut dat een naam/tekst-veld als argument
  meegeeft -- nooit een kale `JSON.stringify()`.
- `netlify/functions/wearableTokenVault.js`: alle wearable-OAuth-tokens
  lopen via deze module (Supabase Vault), nooit meer rechtstreeks
  `access_token`/`refresh_token` op `wearable_connections`.
- Elke gym-owner/manager is een PER-GYM rol (`gym_role_level`, afgeleid van
  `gym_role`). Platform-brede autoriteit is `system_role` (`tester`/
  `support`/`developer`) -- gebruik dit voor elke `scope='global'`-achtige
  beslissing, nooit `gym_role_level`.

## Governance-status
F13-status: **F13 REOPENED — SECURITY REMEDIATION IN PROGRESS.** F14 is
NIET gestart (absolute stop-instructie uit de F13 Post-Audit-opdracht).
Documentatie is bijgewerkt naar de daadwerkelijke, geverifieerde code-staat
-- geen status-inflatie, geen CLOSED-claim zonder hernieuwd bewijs.
