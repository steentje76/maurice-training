# F11_MS_F11_03_REPORT.md — Trainingskompas

**Canonieke naam/acceptance:** "Teams, Groups & Analytics" -- "Team workflows and privacy-safe dashboards." P3, dependency MS-F11-01 (CLOSED).

## 1. Bestaande staat & schema-drift (verplicht onderzocht)
Tijdens de baseline-audit bleken `team_events`, `event_attendance`, `event_responsibilities` en `team_has_access()` al live te bestaan, correct gebouwd op het MS-F11-01-fundament, maar nergens in de repository gedocumenteerd (0 treffers, 0 rijen, geen productie-impact). Retroactief vastgelegd in `migratie_v516.sql`.

### Schema-drift-matrix
| Entiteit | Migratiebestand | Live DB | RLS | Triggers | Delete-completeness | Tests |
|---|---|---|---|---|---|---|
| organizations | v512 | Bevestigd | Bevestigd | v511(memberships) | delete-account.js | fOrganizationRls |
| memberships | v511/v512 | Bevestigd | Bevestigd | immutable tenant-id (v513) | delete-account.js | fOrganizationCore/Rls |
| locations | v512 | Bevestigd | Bevestigd | immutable org_id (v513) | cascade via organizations | fOrganizationRls |
| teams | v512 | Bevestigd | Bevestigd | immutable org_id (v513) | cascade via organizations | fOrganizationRls |
| team_events | v516 (retroactief) | Bevestigd | Bevestigd | location/training/team_id-validatie (v518) | cascade via created_by/teams -- **geen expliciete vermelding in delete-account.js nodig (cascade-only)** | fTeamEventsRls/AdversarialFixes |
| event_attendance | v516 (retroactief) | Bevestigd | Bevestigd | immutable event_id/user_id (v518) | cascade via user_id/event_id | fTeamEventsAdversarialFixes |
| event_responsibilities | v516 (retroactief) | Bevestigd | Bevestigd | immutable event_id (v518) | cascade via event_id, set null via assigned_user_id | fTeamEventsAdversarialFixes |
| equipment_catalog/exercise_equipment | v514 | Bevestigd | Bevestigd | drie-weg ownership-trigger | delete-account.js (n.v.t., cascade via organizations/gyms) | fEquipmentCore/Rls |
| coach_program_templates/assignments | v515 | Bevestigd | Bevestigd | n.v.t. | delete-account.js (bestaand) | fGymTemplateRls |
| get_team_attendance_summary() | v517/v519 | Bevestigd | SECURITY DEFINER, staff-only | n.v.t. | n.v.t. (geen tabel) | fTeamAnalyticsRpc/CohortFloor |

**Genuine, niet-blokkerende observatie (nieuw gevonden tijdens deze audit):** als de aanmaker van een `team_events`-rij (`created_by`) het eigen account verwijdert, verdwijnt via CASCADE het hele event inclusief de `event_attendance`/`event_responsibilities`-rijen van ANDERE, actieve teamleden (die op hun beurt CASCADEN via `event_id`). Dit is geen security-lek (geen ongeautoriseerde toegang), maar een data-retentie-vraagstuk: een teamlid kan zijn eigen historische aanwezigheidsregistratie kwijtraken doordat een ANDERE gebruiker (de organisator) zijn account verwijdert. **Classificatie: P2 HARDENING, niet blokkerend voor CLOSED** -- vergelijkbaar met bestaande cascade-patronen elders in de codebase (bijv. F9 social content bij block/delete). Aanbeveling voor een toekomstige sprint: `created_by` op `ON DELETE SET NULL` in plaats van CASCADE, zodat het event (en de aanwezigheidshistorie van anderen) blijft bestaan, met een "verwijderde organisator"-weergave.

## 2. Kritieke privacybug gevonden EN gerepareerd binnen deze sprint (zelf-geïntroduceerd, zelf gecorrigeerd)
`get_team_attendance_summary()` (migratie_v517.sql) stond aanvankelijk toe dat de aanroeper zelf `p_min_cohort_size` verlaagde, tot expliciet bevestigd met `p_min_cohort_size=1` dat een staff-lid het exacte percentage van een cohort van 1 persoon kon zien -- een volledige omzeiling van de privacy-garantie. Gevonden tijdens de verplichte "F11 Tenant Escape Final Matrix" (expliciet als check aangewezen), gerepareerd in `migratie_v519.sql` met een server-side `GREATEST(..., 5)`-ondergrens die de client-parameter nooit kan verlagen, alleen verhogen. Sabotagebewijs geleverd.

## 3. Overige security-bevindingen (adversarial matrix sectie 5)
Vier bevindingen gevonden en gerepareerd in `migratie_v518.sql`: cross-tenant location-koppeling op `team_events` (P1), `team_id`-mutatie op `team_events` (lagere impact), `linked_training_instance_id` van een niet-lid (data-integriteit, geen data-lek), en `event_id`/`user_id`-mutatie op `event_attendance`/`event_responsibilities` (P2, tenant-identifier-immutabiliteit). Alle vier met live adversarial bewijs vóór en na de fix, plus sabotagebewijs (met een zelf-gecorrigeerde testzwakte: de eerste testversie controleerde alleen een foutmelding-string, niet de daadwerkelijke conditie -- direct hersteld).

## 4. Teamcommunicatie -- architectuurbeslissing
**Onderzocht:** F9 (Social & Community) bouwde bewust GEEN chat/messaging-engine -- feed, reactions/comments, push/e-mail-notificaties staan allemaal expliciet als DEFERRED in `docs/F9_MASTER_REPORT.md`. Wat F9 wél canoniek levert: `social_notifications` (in-app, forgery-safe, uitsluitend server-side INSERT -- geen client-side INSERT-policy, analoog aan hoe F11 dit zou moeten hergebruiken).

**Beslissing: "teamcommunicatie = nieuwe scope/participant-context binnen bestaand communicatiemodel" voor notificaties; teamCHAT is expliciet ARCHITECTURE-READY / DEFERRED.**
- Praktische teammededelingen, eventberichten, en taak/verantwoordelijkheid-toewijzingen zijn AL gedekt door de bestaande `team_events`/`event_responsibilities`-structuur zelf (geen aparte "message" nodig voor "wie neemt de ballen mee" -- dat IS al een `event_responsibilities`-rij).
- Een toekomstige notificatie ("teamtraining gepland", "verantwoordelijkheid toegewezen") zou, wanneer gebouwd, de bestaande `social_notifications`-tabel hergebruiken via een server-side insert (net als F9 al doet) -- geen nieuwe notificatietabel.
- Echte, vrije-tekst teamchat vereist een messaging-primitief dat F9 nooit heeft gebouwd. MS-F11-03's acceptance gate ("Team workflows and privacy-safe dashboards") vereist dit niet. Bouwen zou een tweede, ongeteste messaging-stack introduceren zonder roadmap-noodzaak -- **bewust niet gebouwd, DEFERRED**, consistent met F9's eigen scope-discipline.
- Geen enkele F11-tabel of -RLS-policy introduceert een parallel messagingmodel.

## 5. Open productpunt: `event_responsibilities.assigned_user_id` zonder teamlidmaatschap
**Onderzocht (opdracht sectie 3):** geeft de toegewezen persoon hierdoor aanvullende leesrechten? Nee -- `assigned_user_id` is een losse FK naar `auth.users`, zonder eigen SELECT-uitbreiding op `team_events`/`event_attendance`. Kan dit misbruikt worden voor spam? Alleen als er ooit een notificatie-trigger op deze kolom wordt gebouwd (nog niet het geval); wanneer dat gebeurt, moet die trigger zelf teamlidmaatschap of een expliciete "externe assignee"-vlag valideren. Bestaat er een geldige use case? Ja -- een vrijwilliger, ouder, of chauffeur die materiaal regelt zonder formeel teamlid te zijn.
**Classificatie: PRODUCT DECISION OPEN.** Geen security-fix toegepast (geen bewezen data-access-escape). Aanbeveling: een toekomstig, expliciet "externe/non-member assignee"-concept overwegen in plaats van elke app-gebruiker te kunnen selecteren, zodra notificaties op deze kolom gebouwd worden.

## 6. Delete/leave/role-change completeness
- **Account delete:** `memberships`/`coach_program_templates`/`organizations` al in `delete-account.js`. `team_events`/`event_attendance`/`event_responsibilities` zijn cascade-only (geen aparte vermelding nodig, wel de P2-observatie uit sectie 1 hierboven).
- **Organization delete:** cascade naar teams/locations/memberships/equipment/templates, bevestigd via bestaande FK's.
- **Team delete:** cascade naar team_events (en daarmee attendance/responsibilities) -- geen orphans mogelijk.
- **Member removed (`status='removed'`):** live bevestigd (eerdere sprints) dat rechten onmiddellijk verdwijnen; historische `event_attendance`-rijen blijven bestaan (persoonlijke aanwezigheidshistorie wordt niet gewist door removal, correct).
- **Role downgrade (staff→member):** live bevestigd in MS-F11-01/03-tests dat een gedowngraded gebruiker onmiddellijk geen team-beheerrechten meer heeft (RLS is stateless per request, geen gecachede rechten).

## 7. Tests & regressie
164 stappen totaal in de F11.03-scope (server-side analytics 16, cohort-floor-fix 4, adversarial-fixes 6, team-events-RLS-documentatie 7, team-analytics-core 20, plus bestaande F11.01/02-suites). Volledige regressie: 157 uitgevoerd/1 geskipt/0 gefaald. Alle security-relevante bevindingen met sabotagebewijs.

## 8. MS-F11-03 acceptance-gate-toetsing
Letterlijke acceptance gate: "Team workflows and privacy-safe dashboards."
**Resultaat: CLOSED.** Team-events/aanwezigheid/verantwoordelijkheden volledig adversarial bewezen (inclusief vier gevonden en gerepareerde bugs). Server-side privacy-safe analytics gebouwd en, na het vinden en repareren van een kritieke privacy-omzeiling, correct bewezen dat het canonieke minimum nooit door de client te verlagen is. Teamcommunicatie: bewuste, beargumenteerde DEFERRED-beslissing voor chat, hergebruik-plan voor notificaties. Eén open productpunt (niet-blokkerend). Eén P2-hardeningsobservatie (niet-blokkerend, cascade-gedrag bij account-delete van een event-organisator).
