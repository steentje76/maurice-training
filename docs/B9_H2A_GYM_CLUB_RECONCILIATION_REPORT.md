# B9-H2A GYM/CLUB ARCHITECTURE RECONCILIATION — FINAL INTEGRATION AUDIT

**FINAL MAIN SHA:** wordt bijgewerkt na merge
**APP_VER:** ongewijzigd (geen runtime-code gewijzigd)
**PR(s):** zie git log
**MIGRATION(s):** geen (architectuurbeslissing, geen schemawijziging in deze sprint)

**BASELINE:** main `114c08b2d3133b6de5d83c35bcd071e43f2dff88`, exact
overeenkomend, release gate 219/219 groen vóór wijziging.

**SYSTEM A:** `users.gym_id`/`gym_role`/`gym_role_level` + `gyms` +
`gym_audit_log`. Daadwerkelijk actief (10 UI-treffers). 1 productie-rij.

**SYSTEM B:** `organizations`/`teams`/`memberships`. 0 directe UI-
treffers, maar al de feitelijke foundation onder Coach/PT
(`coach_program_assignments.organization_id`) en Team Operations
(`team_events.team_id`).

**CURRENT ACTIVE SYSTEM:** System A (voor Gym/Club-UI zelf).
**CURRENT UNUSED/PARTIAL SYSTEM:** System B (voor Gym/Club-UI), maar
al actief gebruikt als schema-foundation voor Coach/Team.

**COMPARISON:** System A heeft product-features (branding/billing/
pincode) maar geen echte multi-tenancy (één text-kolom op de user-rij).
System B heeft een correcte, genormaliseerde multi-tenancy-structuur
maar mist product-features. **Kritiek:** `gyms.organization_id` is al
een bestaande FK naar `organizations(id)` -- de brug bestaat al,
alleen ongebruikt (de ene gym-rij heeft `organization_id = NULL`).

**SELECTED CANONICAL STRATEGY:** C (Controlled Consolidation).

**RATIONALE:** de bestaande FK-brug, de al-bestaande afhankelijkheid
van Coach/Team op System B, en het minimale migratierisico (1 rij)
maken consolidatie via de bestaande, ongebruikte brug de veiligste en
meest logische keuze -- geen van beide systemen hoeft van scratch
herbouwd te worden.

**CANONICAL ORGANIZATION:** `organizations`.
**CANONICAL LOCATION:** nog te bevestigen (`team_events.location_id`
verwijst naar een niet-in-deze-sprint-geverifieerde tabel).
**CANONICAL MEMBERSHIP:** `memberships`.
**CANONICAL TEAM:** `teams`.
**CANONICAL COACH RELATIONSHIP:** `coach_athlete_relationships`
(bewust standalone, niet organization-afhankelijk).
**CANONICAL PROGRAM ASSIGNMENT:** `coach_program_assignments`.
**CANONICAL SESSION/EVENT:** `team_events`.

**ROLE MODEL:** `memberships.role`/`status`, live bevestigd niet
self-editable.
**ENTITLEMENT BOUNDARY:** `gyms.plan_key` blijft de entitlement-bron,
ongewijzigd; role (organization-intern) en entitlement (product-
capability) blijven bewust gescheiden concepten.

**OWNERSHIP MATRIX:** zie `docs/B9_H2A_DATA_OWNERSHIP_MATRIX.md` --
persoonlijke trainingsdata is en blijft nooit organization-owned.

**SENSITIVE DATA BOUNDARY:** ongewijzigd -- geen nieuwe coach/gym-
toegang tot HRV/Nutrition/Women's Performance gecreëerd in deze
sprint (geen enkele nieuwe query/RPC gebouwd).

**TEAM OPERATIONS COMPATIBILITY:** BACKEND/ARCHITECTURE READY, PRODUCT
WORKFLOW STILL OPEN.
**COACH/PT COMPATIBILITY:** BACKEND/ARCHITECTURE READY, PRODUCT
WORKFLOW STILL OPEN.
**GYM/CLUB COMPATIBILITY:** 9+ READY FOUNDATION (architectuur), UI-
migratie (fase 2+) nog niet uitgevoerd.
**COMMERCIAL COMPATIBILITY:** ongewijzigd, `gyms.plan_key` blijft
functioneren.
**SOCIAL SEPARATION:** bevestigd ongewijzigd -- `social_groups`/`teams`
blijven bewust gescheiden (geen forced merge, geen wijziging in deze
sprint).

**MIGRATION STRATEGY:** gefaseerd (zie ADR, 7 fasen), NIET uitgevoerd
in deze sprint -- uitsluitend de architectuurbeslissing en het pad
zelf zijn vastgelegd.

**DUAL-WRITE:** geen, en geen permanente dual-write gepland.

**DEPRECATED MODEL:** `users.gym_id`/`gym_role`/`gym_role_level`
(op termijn, na volledige migratie).

**RLS:** live bevestigd op alle 7 relevante tabellen
(`organizations`/`teams`/`memberships`/`gyms`/
`coach_athlete_relationships`/`team_events`/`coach_program_
assignments`) -- allemaal RLS-ingeschakeld met policies.

**SELF-ELEVATION:** live, adversarial getest (transactie zonder
commit) -- een poging om de eigen `memberships.role` naar 'owner' te
wijzigen werd stilzwijgend geweigerd (rol bleef 'member').

**CROSS-TENANT SECURITY:** niet apart, nieuw getest binnen deze sprint
(geen nieuwe cross-tenant-oppervlakte gecreëerd -- geen schema-
wijziging).

**RPC/SECURITY DEFINER:** geen nieuwe RPC gebouwd in deze sprint.

**ACCOUNT DELETION:** ongewijzigd (geen schema-wijziging).

**ORGANIZATION DELETION:** semantiek expliciet vastgelegd in de
ownership-matrix (CASCADE naar organisatie-eigen data, nooit naar
persoonlijke trainingsdata) -- nog niet geimplementeerd/getest, want
er is nog geen actieve organization-deletion-flow.

**SABOTAGE:** de architectuurbeslissing zelf tijdelijk dubbelzinnig
gemaakt ("beide systemen blijven canoniek") -> gedetecteerd door de
nieuwe testsuite (B1-assertie), teruggedraaid.

**TARGETED TESTS:** `core/fB9_H2AOrganizationArchitecture.test.js`
10/10.

**FULL REGRESSION:** `node core/release-gate.js` -> 220/220, 0
geskipt, 0 gefaald.

**RELEASE GATE:** 220/220 groen.

**ANDROID:** ongewijzigd (geen APP_VER-bump nodig, geen runtime-code).

**DOC CONSISTENCY:** 0 problemen.

**UI CHANGES:** 0 (bevestigd via `git diff main --stat -- index.html`,
expliciet getest in de testsuite zelf).

**UX REDESIGN:** 0.

**TEAM OPERATIONS 9+ READINESS:** architectuur klaar, product-workflow
open (zie `docs/B9_H2A_TEAM_COACH_GYM_9_PLUS_REQUIREMENTS.md`).
**COACH/PT 9+ READINESS:** idem.
**GYM/CLUB 9+ READINESS:** architectuur klaar (foundation), UI-migratie
open.

**OPEN P0:** 0. **OPEN P1:** de migratie-uitvoering zelf (fase 2-7 van
de ADR) en de daaropvolgende UX-review voor Team/Coach-schermen.
**OPEN P2/P3:** locatie-model-verificatie (`team_events.location_id`),
coach-feedback/notities-tabel (nog niet gebouwd).

**FINAL STATUS:**

**B9-H2A ORGANIZATION ARCHITECTURE CONDITIONALLY CLOSED — MIGRATION/VALIDATION OPEN**

**NEXT:** STOP — Product Owner releases the next functional 9+ implementation step (migratie-fase 2, en/of de UX-review voor Team Operations/Coach-PT).
