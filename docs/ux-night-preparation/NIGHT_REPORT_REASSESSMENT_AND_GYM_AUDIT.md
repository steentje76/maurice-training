# NIGHT_REPORT_REASSESSMENT_AND_GYM_AUDIT.md

Herbeoordeling van alle eerdere night-preparation outputs na volledige lezing van alle 28 target-documenten (opdracht 4), plus backend-without-UI herbeoordeling (6), Gym/Organization-audit (7) en preservation-update (8).

## Opdracht 4 — Herbeoordeling per eerder document/sectie

| Eerdere output | Status | Toelichting |
|---|---|---|
| Current→Target migration matrix | **CORRECTED** | Abonnement-rij: was "NEW UI REQUIRED + PO DECISION, 0 backend". Nu: backend is TESTED+INTEGRATED (resolver, checkout, Apple/Google-verify, webhook, 221 tests); resterend uitsluitend prijzen (PO) + scherm (UX). Toegevoegd: s-admin-pin → CONFLICT (target verbiedt gedeeld admin-PIN). |
| Target Information Architecture | **CONFIRMED + EXPANDED** | Volledige lezing bevestigt de boom; toegevoegd onder SAMEN: Activiteitsgroepen (tijdelijk) als aparte laag; onder COACH: Berichten gedeelde messaging-engine met Samen (TOGETHER §34). |
| Vandaag specification | **CONFIRMED** | Volledig gebaseerd op TODAY_HOME_ORCHESTRATION (volledig gelezen in vorige sessie); geen correctie nodig. |
| Trainen/Inzicht/Coach/Samen/Profiel specs | **EXPANDED** | Nu onderbouwd met de volledige detail-documenten; kernstructuren onveranderd. |
| Cross-domain contracts | **CONFIRMED** | FINAL_COMPLETENESS §6 en INTEGRATION_COMPLETENESS §25 bevestigen de event-propagatie-contracten. |
| Gym migration audit | **EXPANDED** | Zie sectie 7 hieronder — nu met live UI-verificatie en drievoudige target-bevestiging. |
| Backend-without-UI register | **CORRECTED** | Subscriptions/Entitlements verplaatst van "NOT STARTED" naar "TESTED+INTEGRATED, geen UI, geen prijzen". Coach notes bevestigd NOT STARTED (COACH §11 letterlijk). |
| UX readiness scores | **CORRECTED** | Abonnement-scherm: readiness omhoog (backend klaar); Gym-admin: readiness omlaag (admin-PIN-conflict + legacy-uitfasering vereist eerst). |
| Regression preservation matrix | **EXPANDED** | Zie sectie 8 hieronder. |
| Documentchecklist | **SUPERSEDED** | Vervangen door TARGET_DOCUMENT_REVIEW_REGISTER.md (28/28 FULL). |

## Opdracht 6 — Backend-without-UI, herbeoordeeld

| CAPABILITY | DATABASE | DOMAIN LOGIC | RLS | TESTS | INTEGRATION | CURRENT UI | TARGET UI | MATURITY | EXT. BLOCKER | PO DECISION | UX REQUIRED |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Coach/PT relatie/roster/assignment | JA | JA (F10) | JA | 79+ | JA (materialize-RPC) | NEE | Coach-tab | TESTED+INTEGRATED | — | Coach Pro-tier | **JA** |
| Coach notes/feedback | NEE | NEE | — | 0 | — | NEE | Coach→Feedback | NOT STARTED (COACH §11 bevestigt) | — | schema-ontwerp | JA (na backend) |
| Team Operations | JA | JA (B9-H2C) | JA (incl. staff-attendance-fix) | 21 | JA (notificaties) | NEE | Samen→Teams | TESTED+INTEGRATED | — | — | **JA** |
| Canonical Organizations | JA (B9-H2A/B) | deels | JA | 10+13 | NEE (UI leest legacy) | NEE | Samen→Gym + webportaal | IMPLEMENTED, niet INTEGRATED in UI | — | legacy-uitfasering | **JA** |
| Gym/Club webportaal | NEE | NEE | — | 0 | — | NEE | apart webproduct | NOT STARTED | PSP | prijzen/pakketten | JA |
| Subscriptions/Entitlements | JA (7 tabellen) | **JA (resolver)** | JA | **221** | **JA (coach.js)** | NEE | Profiel→Abonnement | **TESTED+INTEGRATED** | live PSP-validatie | **prijzen (alle null)** | **JA** |
| Devices | JA | JA | JA | 569+ | JA | JA (kaart) | Profiel→Apparaten | TESTED+INTEGRATED | real account/device | — | verplaatsing |
| Notifications | JA (social_notifications) | deels | JA | JA | JA | JA (s-meldingen) | Profiel→Meldingen | IMPLEMENTED | — | defaults | REDESIGN (centraal event/instance-model ontbreekt) |
| Research | NEE | NEE | — | 0 | — | NEE | apart | NOT STARTED | ethiek | ja | later |
| Privacy/Consent | JA (scopes) | JA | JA | 9+ | JA | JA (s-privacy) | Profiel→Privacy | TESTED | — | — | uitbreiding |
| Nutrition | JA | JA | JA | 69 | JA | JA (s-nutrition) | Inzicht+Trainen | TESTED+INTEGRATED | licensing (NEVO/GS1) | 12 defaults | SPLIT |
| Events (generiek) | deels (race_segments HYROX) | deels | JA | JA | deels | JA (s-hyrox) | Trainen→Wedstrijden | PARTIAL | organizer-integraties | — | JA |
| Social/Groups/Challenges | JA | JA | JA | JA | JA | JA (s-social) | Samen | TESTED+INTEGRATED | — | follower-model | uitbreiding (messaging) |

## Opdracht 7 — Gym/Organization audit (live geverifieerd)

**LEGACY:** `users.gym_id`, `users.gym_role`, `users.gym_role_level` (generated), `gyms`-tabel, `gym_audit_log`, `netlify/functions/gym-team.js`, `gym-team-set-pin.js`, scherm `s-admin` + `s-admin-pin`. **UI-gebruik: 10 treffers in index.html (gym_id/gym_role).**

**CANONICAL:** `organizations`, `memberships`, `teams`, `team_has_access()`, `coach_program_assignments.organization_id`, `team_events`. **UI-gebruik: 0 treffers** (alle 10 `memberships`-treffers in index.html zijn `social_group_memberships`, een ander domein).

**Parallel actief?** JA. Legacy ontvangt nog writes (gym-join-flow schrijft `users.gym_id`). Canoniek is gevuld (B9-H2B: 1 org, 5 memberships) maar wordt door geen enkel scherm gelezen/geschreven. Backend (Team B9-H2C, Coach B9-H2D) bouwt al op canoniek.

**Migratierisico:** HOOG — een nieuwe Gym-UX die op canoniek bouwt terwijl de gym-join-flow nog legacy schrijft, creëert twee waarheden. De target-architectuur vereist dit expliciet driemaal (TOGETHER §23/§36, PROFILE §12, INTEGRATION_API §23).

**Extra CONFLICT:** `s-admin-pin` (gedeeld PIN) is expliciet verboden in INTERNAL_OPS §3 ("Geen gedeeld admin-PIN als targetarchitectuur"). Vervanging vereist rolgebaseerde, server-side, geaudite privileged access — een aparte SOFTWARE-taak vóór nieuwe Gym-UX.

**Vóór nieuwe Gym-UX moet gebeuren (SOFTWARE, geen UX-beslissing):** (1) gym-join-flow omschakelen naar canoniek `memberships`-write; (2) `users.gym_*` naar read-only compatibility; (3) admin-PIN vervangen door rolgebaseerde autorisatie; (4) consistentietest legacy≡canoniek. **GEEN migratie uitgevoerd.**

## Opdracht 8 — Preservation matrix, tweede (adversariële) audit

Bij vervanging van de navigatie door Vandaag|Trainen|Inzicht|Coach|Samen + Profiel:

| Capability | Kan verdwijnen? | Onbereikbaar? | Dubbel? | Verkeerde auth/entitlement? | Verliest offline/provenance? | Mitigatie |
|---|---|---|---|---|---|---|
| Strength/programs/builder/free exercise | Nee | Nee (Trainen) | Risico: Builder als aparte bestemming én editor | Nee | Nee | Builder uitsluitend als editor achter "Training maken" |
| Running/Cycling/HYROX/Concept2 | Nee | Nee | Nee | Nee | Nee | Sport Capability Model behoudt identiteit |
| Multisport/Triathlon | Nee | Nee | Nee | Nee | Risico: segmentverlies bij generieke Event-mapping | race_segments expliciet mappen |
| Planning/kalender/history/PRs | Nee | Nee | Risico: history in Trainen én Inzicht | Nee | Nee | History = één laag, twee ingangen |
| Recovery/HRV/sleep/load/body | Nee | **Risico: Lichaam-subschermen (13) verdwijnen als tab** | Nee | Nee | Risico: hrv_metric_type/manual-protection onzichtbaar | Alle 13 expliciet in Inzicht mappen; Metric Contracts behouden |
| Women's Performance | Nee | Nee (Inzicht) | Nee | **Risico**: WOMENS_PERFORMANCE-scope samengevoegd met RECOVERY_HEALTH | Nee | Scopes strikt apart houden |
| Nutrition | Nee | Nee | Risico: split Inzicht/Trainen dubbel | Nee | Nee | Één canonical log, twee views |
| AI Coach | Nee | Nee | Nee | **Risico**: AI/human vermengd | Nee | Afzender-contract verplicht (GAP-P1-005 blijft open) |
| Human Coach/PT | N.v.t. (bestaat niet als UI) | — | Risico: eigen data-kopie | **Risico**: coach_access_scopes omzeild | — | Alleen via bestaande scopes |
| Social/messages/groups/challenges | Nee | Nee (Samen) | Risico: Coach-berichten én Samen-berichten twee engines | Nee | Risico: offline pending/failed-state | Eén messaging-engine (TOGETHER §34) |
| Team | N.v.t. | — | Nee | Nee | Nee | — |
| Gym/club | **JA (legacy s-admin)** | Risico | **JA (legacy+canoniek)** | **JA (admin-PIN)** | Nee | Zie opdracht 7 |
| Devices | Nee | Risico: kaart verplaatst uit Lichaam | Nee | Nee | Risico: contextual connect vergeten | Profiel + in-workout |
| Notifications/privacy/consent | Nee | Nee | Nee | Nee | Nee | — |
| Export/delete | Nee | Nee | Nee | **Risico**: nieuwe tabellen niet in delete-account.js | Nee | Lijst bij elke nieuwe tabel bijwerken |
| Subscription | N.v.t. (geen UI) | — | **Risico**: nieuw scherm negeert bestaande resolver | **Risico**: `premium=true` als RLS-shortcut | Risico: offline cache elevatie | Alleen via entitlementCore.js, nooit client-side elevatie |
| Research/events | N.v.t. | — | — | — | — | — |
| Offline queue/sync/retry | Nee | Nee | Nee | Nee | **Risico**: IDEMPOTENT_TABELLEN-registratie vergeten | Bij elke nieuwe tabel registreren |
