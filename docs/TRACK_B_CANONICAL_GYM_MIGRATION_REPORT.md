# TRACK B — CANONICAL GYM MIGRATION

## BASELINE
Main `99164e048d53ac3d0acfeccfeef8dfa388512bf9` (na Track A). Elke aanname uit `docs/ADMIN_AUTH_AND_GYM_MIGRATION_PLAN.md` opnieuw, live geverifieerd — niet blind overgenomen.

## LEGACY INVENTORY
`users.gym_id/gym_role/gym_role_level` (generated, 1-indexed), `gyms(id, coach_pin_hash)`, `gym_audit_log`. Functies: `gym-team.js`, `gym-team-set-pin.js`. 5 users met `gym_id` gevuld. **0 actieve schrijfpaden** naar `users.gym_id` gevonden repo-breed (client noch server) — er bestaat geen join-flow om te migreren.

## CANONICAL INVENTORY
`organizations` (1 rij, `art-crossfit`), `memberships` (5 rijen, unique constraint `(user_id, organization_id, team_id)` met nullable `team_id`), `teams` (0 rijen), `org_has_role()` (accepteert vrije tekst-rolarray, geen enum-beperking).

## MAPPING
| LEGACY | CANONICAL | Type | Basis |
|---|---|---|---|
| `gym_role='lid'` | `memberships.role='member'` | 1:1 | live data |
| `gym_role='coach'` | `memberships.role='staff'` | 1:1 | technisch afgeleid uit bestaande RLS-rolnamen (`org_has_role(...,['owner','admin','staff'])`), geen PO-beslissing nodig |
| `gym_role='manager'` | `memberships.role='admin'` | 1:1 | idem |
| `gym_role='owner'` | `organizations.owner_user_id` | 1:1, ander mechanisme | bestaand, bewezen patroon (niet via `memberships.role`) |
| `gyms.id` | `organizations.id` | 1:1 | live bevestigd, gelijke ID's (`art-crossfit`) |

## DATA COUNTS BEFORE
5 users met `gym_id`, 5 `memberships` (al 1:1 aanwezig vóór deze sprint via B9-H2B), 0 orphans, 0 duplicates (live geverifieerd op `(user_id, organization_id, team_id)`).

## DATA MIGRATION
**Geen backfill nodig** — canonical was al volledig, consistent gevuld. Geen migratie-SQL uitgevoerd op productiedata.

## DATA COUNTS AFTER
Ongewijzigd: 5 users, 5 memberships, 1 organization, 0 orphans, 0 duplicates (herbevestigd na code-wijziging).

## RUNTIME READ MIGRATION
`gym-team.js` `list`-actie: van `users.gym_role` (legacy) naar `organizations + memberships` (canonical), met een vertaallaag (`CANONICAL_TO_LEGACY_ROLE`) zodat de API-response naar de client (`gym_role: lid/coach/manager/owner`) **ongewijzigd** blijft — 0 client-wijziging.

## RUNTIME WRITE MIGRATION
`update_role`: **TRANSITIONAL dual-write** — schrijft naar zowel `users.gym_role` (legacy, nog nodig zolang `exercise_equipment`/`equipment_catalog`-RLS op `gym_role_level` leest) als `memberships.role`/`organizations.owner_user_id` (canonical). Canonical-write-falen wordt expliciet gemeld, nooit stilzwijgend genegeerd.

**Zelf gevonden en gerepareerd tijdens implementatie:** een `on_conflict`-upsert op `memberships` zou onbetrouwbaar zijn geweest — de unique constraint bevat de nullable kolom `team_id`, en NULL-waarden zijn in PostgreSQL nooit aan elkaar gelijk, dus een naïeve upsert zou bij elke rolwijziging een nieuwe, dubbele rij hebben aangemaakt. Vervangen door een expliciete select-op-`team_id=is.null` gevolgd door PATCH of POST. Live, transactioneel getest vóór toepassing.

## JOIN FLOW
**Geen wijziging nodig/mogelijk** — er bestaat geen actieve join-flow (0 schrijfpaden naar `users.gym_id` gevonden). Dit is geen openstaand punt maar een bevestigde afwezigheid.

## RLS / TENANT ISOLATION
Live, adversarieel herbevestigd: een gewoon lid ziet exact 1 `memberships`-rij (de eigen), niet alle 5. Anon wordt op functieniveau geweigerd (`org_has_role`/`coach_has_scope`). Geen wijziging aan RLS-policies in deze sprint (Track A deed dat al voor `equipment_catalog`/`exercise_equipment`).

## CROSS-DOMAIN REGRESSION
| Domein | Testsuite | Resultaat |
|---|---|---|
| Organization consolidation | fB9_H2BOrganizationConsolidation | 13/13 |
| Team Operations | fB9_H2CTeamOperations | 21/21 |
| Entitlements (resolver) | fEntitlementCore | 52/52 |
| Entitlements (RLS) | fEntitlementRls | 18/18 |
| Admin auth (Track A) | fAdminAuthGymRlsHardening | 8/8 (1 assertie bijgewerkt na canonical read-migratie, geen functionele regressie) |
| gym-team.js (mock, adversarieel) | fGymTeamSecurity | 17/17 (mock bijgewerkt naar 1-indexed schaal + canonical endpoints) |
| Track B zelf | fCanonicalGymTrackB (nieuw) | 9/9 |

`coach.js` (entitlements) en `delete-account.js` gebruiken al `organization_id`/cascade — geen nieuwe shadow-truth, geen conflict met deze migratie. **Payment != data authorization, coach role != org admin, team membership != health consent** — alle drie bevestigd ongewijzigd (geen van de gewijzigde RLS/functies raakt health/recovery/nutrition/Women's Performance-toegang).

## ONVERWACHTE, ECHTE REGRESSIE GEVONDEN EN GEREPAREERD (buiten de oorspronkelijke scope, ontdekt tijdens testen)
`gym-team-set-pin.js` bevatte een hardcoded, nog **0-indexed** drempel (`gym_role_level < 3`) die sinds de Track A-fix (owner nu level 4 i.p.v. 3) een **manager** ook liet slagen — een manager kon sinds de Track A-merge onterecht de coach-pincode instellen, een bevoegdheid die uitsluitend voor de owner bedoeld is. Ontdekt doordat de bijbehorende mock-testsuite tegelijk naar de correcte, 1-indexed schaal werd bijgewerkt. Gerepareerd naar `< 4`, live tegen de database geverifieerd (`owner` heeft `gym_role_level=4`).

## LEGACY SHADOW-TRUTH AUDIT
| Treffer | Classificatie |
|---|---|
| `users.gym_id/gym_role` kolommen | ACTIVE READ (via gym-team.js legacy-write-back, dual-write-fase) |
| `index.html` 10 treffers | 1x ACTIVE READ (via gym-team.js-response, ongewijzigd contract), 1x visuele badge-check (`e.gym_id` boolean), 8x commentaar |
| `exercise_equipment`/`equipment_catalog` RLS | ACTIVE READ (`gym_role_level`, dual-model met `organization_id`-tak, Track A bevestigd) |
| `gym-team-set-pin.js` | ACTIVE READ + WRITE (legacy `gyms.coach_pin_hash`, geen canonical equivalent nodig — dit is geen lidmaatschapsdata) |

## ACTIVE LEGACY READS
Aantoonbaar > 0, bewust (TRANSITIONAL-fase, dual-write vereist legacy-read voor consistentiecontrole). Niet naar 0 gebracht in deze sprint — vereist eerst dat `exercise_equipment`/`equipment_catalog`-RLS ook volledig naar `organization_id` overgaat, wat een aparte, latere sprint is (geen technisch obstakel, wel een aparte scope).

## ACTIVE LEGACY WRITES
`users.gym_role` (dual-write, `update_role`-actie) — **bewust behouden** zolang `exercise_equipment`/`equipment_catalog`-RLS er nog van afhangt. **Geen andere actieve legacy writes gevonden** (0 elders in de codebase, bevestigd vóór en na deze sprint).

## DEPRECATED COMPONENTS
Geen. Legacy blijft volwaardig functioneel tijdens de TRANSITIONAL-fase.

## REMOVED COMPONENTS
Geen. Geen destructieve verwijdering uitgevoerd.

## PRESERVED COMPONENTS
`s-admin-pin`, `gym-team.js`-API-contract, `TEAM_ROLE_LABELS`/`changeTeamRole` (client, ongewijzigd), `gym_audit_log`, `gyms.coach_pin_hash`-mechanisme.

## TESTS
`core/fCanonicalGymTrackB.test.js` (nieuw, 9/9). `core/fGymTeamSecurity.test.js` bijgewerkt (17/17, was 16/17 stuk door de canonical-migratie, nu inclusief canonical-mock + de zelf gevonden pincode-regressie-fix). `core/fAdminAuthGymRlsHardening.test.js` 1 assertie bijgewerkt (8/8). Volledige regressie: 230/230, Android 29/29, doc-consistency groen.

## PR
Wordt aangemaakt na dit rapport, vanaf branch `technical/canonical-gym-track-b`.

## MERGE SHA
Wordt aangevuld na merge (zie CURRENT_STATE.md voor de definitieve waarde).

## FRESH-MAIN VERIFICATION
Wordt uitgevoerd na merge (verplicht, zie procedure).

## OPEN EXTERNAL VALIDATION
Geen. Deze sprint vereiste geen externe credentials/hardware.

## PO DECISIONS
Geen nieuwe PO-beslissing nodig gebleken — de rolmapping was technisch afleidbaar uit bestaande, vastgestelde RLS-rolnamen. **Wel een aanbeveling, geen blocker:** een toekomstige sprint kan `exercise_equipment`/`equipment_catalog`-RLS volledig naar `organization_id` migreren om `ACTIVE LEGACY READ` verder te verlagen — dit is zuiver technisch, geen UX-beslissing, maar buiten de scope van deze sprint.

STATUS: TECHNICAL FOUNDATION CLOSED — READY FOR FUTURE GYM UX
