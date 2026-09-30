# Security audit — privileged database functions & authorization boundaries

**Datum:** 29 september 2026 · **Baseline:** main `c25b121c8de917f5424292324960686f9c7d8889` · **Project:** productie-Supabase
**Methode:** read-only inventarisatie (`pg_proc`, ACL's, policies, grants) + rollback-veilige adversarial tests
(`begin; set local role …; request.jwt.claims …; subtransactie met geforceerde rollback; rollback;`). Er is geen
productiedata gewijzigd; testidentiteiten zijn fictieve UUID's (`00000000-0000-4000-8000-0000000000xx`), behalve bij
F-SEC-001, waar binnen dezelfde teruggedraaide transactie twee bestaande accounts werden gebruikt (niet vastgelegd).

## Attack surface (live, vóór remediatie)

| Meting | Waarde |
|---|---|
| Functies in `public` | 250 |
| SECURITY DEFINER | 61 (alle 61 met expliciet `search_path`) |
| SECURITY DEFINER uitvoerbaar door `anon` | 5 (alle via impliciete PUBLIC-grant) |
| SECURITY DEFINER uitvoerbaar door `authenticated` | 29 |
| SECURITY INVOKER uitvoerbaar door `anon` | 188 (draaien met rechten van de aanroeper; RLS blijft gelden — niet privileged) |
| Dynamische SQL (`EXECUTE`) in de 34 aanroepbare SECDEF-functies | geen |

Classificatie: **A** intended + beschermd · **B** onnodig blootgesteld · **C** autorisatiezwakte · **D** bevestigde
cross-user kwetsbaarheid · **E** onvoldoende bewijs.

## Per functie (SECURITY DEFINER, aanroepbaar door anon/authenticated; alle owner `postgres`, `search_path` gezet)

| Functie | Rollen vóór | Data/effect | Identiteitsbron | Autorisatie | Adversarial evidence | Klasse | Remediatie | Restrisico |
|---|---|---|---|---|---|---|---|---|
| upsert_daily_health | PUBLIC, anon, authenticated | schrijft hrv_log (gezondheid) | p_user_id, gebonden aan auth.uid() tenzij service_role | caller == p_user_id | anon → geweigerd; auth vreemde id → geweigerd; auth eigen id → toegestaan (teruggedraaid) | B | v570: anon/PUBLIC ingetrokken | geen bekend |
| schedule_my_training | PUBLIC, anon, authenticated | schrijft planning | auth.uid() | eigendom vaste training | anon → geweigerd | B | v570 | geen bekend |
| get_or_create_direct_thread | PUBLIC, anon, authenticated | maakt thread | auth.uid() | connectie + blokkade-check | anon → geweigerd | B | v570 | geen bekend |
| upsert_endurance_profile_target | PUBLIC, anon, authenticated | schrijft eigen profieldoel | auth.uid() | eigen rij | anon → geweigerd | B | v570 | geen bekend |
| is_thread_participant | PUBLIC, anon, authenticated | boolean, RLS-helper | auth.uid() | alleen eigen deelname | anon → `false` | B | v570 | geen bekend |
| upsert_provider_activity | authenticated | schrijft activities | p_user_id, gebonden aan auth.uid() | caller == p_user_id | auth vreemde id → geweigerd | A | — | — |
| consume_credit | authenticated | verlaagt eigen credits | auth.uid() | eigen aankoop, alleen omlaag | vreemde aankoop → geweigerd | A | — | — |
| increment_usage | authenticated | verhoogt eigen teller | auth.uid() | alleen eigen, alleen omhoog | — | A | — | — |
| decrement_usage | authenticated | verlaagt eigen AI-quota-teller | auth.uid() | alleen eigen scope | auth → toegestaan (teruggedraaid) | C | geen (zie F-SEC-002) | quota-omzeiling eigen account |
| check_and_increment_usage | authenticated | quota-reservering, caller-controlled p_quota | auth.uid() | eigen scope; p_quota door caller | p_quota=null → toegestaan (teruggedraaid) | C | geen (zie F-SEC-002) | quota-omzeiling eigen account |
| export_research_cohort | authenticated | research-export | auth.uid() → users.system_role | support/developer, min. cohort | auth zonder rol → geweigerd | A | — | — |
| materialize_coach_assignment | authenticated | maakt programma | auth.uid() | alleen athlete van assignment + relatie/org-check | — (code) | A | — | — |
| assign_event_responsibility_notify | authenticated | taak + notificatie | auth.uid() via team_has_access | owner/admin/staff; assignee moet lid zijn | — (code) | A | — | — |
| cancel_team_event_notify / update_team_event_notify | authenticated | team-events | auth.uid() via team_has_access | owner/admin/staff | — (code) | A | — | — |
| notify_team_event_created | authenticated | notificaties | auth.uid() | alleen creator van het event | — (code) | A | — | — |
| get_team_attendance_summary | authenticated | geaggregeerde aanwezigheid | auth.uid() via team_has_access → org_has_role | owner/admin/staff, min. cohort 5 | — (code, chain gecontroleerd) | A | — | — |
| get_organization_branding | authenticated | branding | auth.uid() via org_has_role | lid van organisatie | — (code) | A | — | — |
| org_has_role / team_has_access | authenticated | boolean, RLS-helper | auth.uid() | alleen eigen rol | — | A | — | — |
| is_relationship_athlete / is_relationship_coach | authenticated | boolean, RLS-helper | auth.uid() | alleen eigen relatie | — | A | — | — |
| is_relationship_active | authenticated | boolean op relatie-UUID | rel_id (caller) | geen binding | — | C | geen (F-SEC-003) | laag: vereist onbekende UUID |
| coach_has_scope | authenticated | boolean coach↔athlete-scope | p_coach_id, p_athlete_id (caller) | geen binding aan caller | callable (code) | C | geen (F-SEC-003) | relatie-informatie van derden |
| org_user_has_role | authenticated | boolean lidmaatschap | p_user_id (caller) | geen binding aan caller | auth vreemde id → antwoord (teruggedraaid) | C | geen (F-SEC-003) | lidmaatschap van derden |
| social_is_blocked_pair | authenticated | boolean blokkade | a, b (caller) | geen binding; social_blocks-RLS toont alleen eigen blokkades | auth vreemde ids → antwoord | C | geen (F-SEC-003) | blokkades tussen derden zichtbaar |
| social_is_group_member / social_is_group_owner | authenticated | boolean groep | u, g (caller) | geen binding | callable (code) | C | geen (F-SEC-003) | groepsinfo van derden |
| social_create_notification | authenticated | schrijft social_notifications (geen client-INSERT-policy; functie is enige poort) | actor = auth.uid(); recipient = caller | geen relatie-/doelcontrole | auth → notificatie voor niet-verbonden andere gebruiker aangemaakt (teruggedraaid) | D | geen (F-SEC-001, HARD STOP) | spam/misleidende notificaties |

## Findings (PCC-reconcilieerbaar)

- **F-SEC-001 (D) social_create_notification** — Finding: een ingelogde gebruiker kan voor iedere andere gebruiker een
  notificatie van elk toegestaan type (o.a. `team_event_cancelled`, `responsibility_assigned`) aanmaken, zonder
  relatie- of doelcontrole. Verification: bewezen met twee bestaande accounts zonder connectie, teruggedraaid.
  EngineeringChange: **niet uitgevoerd** — `connection_request` richt zich legitiem op niet-verbonden gebruikers en
  team-events worden ook via interne SECDEF-ketens gemeld; de juiste per-type-autorisatie is niet betrouwbaar uit de
  code af te leiden (HARD STOP). Gap: ontwerp per `event_type` (relatie/doel-eigendom) + verplaatsen van team-/
  responsibility-meldingen naar uitsluitend interne aanroepen.
- **F-SEC-002 (C) AI-quota integriteit** — `decrement_usage` en `check_and_increment_usage(p_quota)` zijn direct door
  de eigen gebruiker aanroepbaar (coach.js gebruikt de gebruikers-JWT), waardoor een gebruiker de eigen quota kan
  omzeilen. Geen cross-user effect. HARD STOP: vereist herontwerp (server-side service_role-pad met server-bepaalde quota).
- **F-SEC-003 (C) boolean-orakels** — RLS-helpers met caller-gestuurde identiteit (`coach_has_scope`,
  `org_user_has_role`, `social_is_blocked_pair`, `social_is_group_member`, `social_is_group_owner`,
  `is_relationship_active`) onthullen relatie-/lidmaatschapsfeiten van derden. EXECUTE is nodig omdat ze in policies
  worden gebruikt; binding aan auth.uid() wijzigt policy-semantiek → HARD STOP, apart ontwerp.
- **F-SEC-004 (B) PUBLIC/anon-EXECUTE op vijf SECDEF-functies** — opgelost met `migratie_v570.sql`.
- **F-SEC-005 (B, residu) standaard-tabelgrants** — `authenticated` heeft o.a. TRUNCATE op tabellen zoals
  `social_notifications`/`usage_log` (Supabase-default); niet bereikbaar via PostgREST, RLS geldt niet voor TRUNCATE.
  Niet gewijzigd (breed, buiten deze minimale slice).
- **F-SEC-006 leaked-password protection** — volgens Security Advisors (`auth_leaked_password_protection`) uit.
  Niet gewijzigd: productie-accountbeleid (Supabase Auth-instelling; beschikbaarheid planafhankelijk). Activeren
  weigert nieuwe/gewijzigde wachtwoorden die in HaveIBeenPwned voorkomen; bestaande logins blijven werken. Vereist
  PO-besluit + controle van de registratie-/reset-foutmelding in de app.

## Richting CLOSED_PROVEN

- Kan (na productie-verificatie van v570): F-SEC-004.
- Niet: F-SEC-006. F-SEC-001: CLOSED_PROVEN (v571). F-SEC-005: CLOSED_PROVEN (v572). F-SEC-002: CLOSED_PROVEN (v573). F-SEC-003: zie closure-sectie (v574).

## F-SEC-001 closure (29 september 2026, migratie v571)

**Oorspronkelijke exploit.** Authenticated A → `social_create_notification(B, 'responsibility_assigned', 'team_event',
<willekeurig>)` → rij in `social_notifications` voor B (actor A). Vóór de fix opnieuw gereproduceerd met rollback:
TOEGESTAAN, 1 rij in de transactie, 0 rijen erna. Functiedefinitie ongewijzigd sinds de audit (md5 vóór:
`2cd658eb…`).

**Root cause.** De functie is SECURITY DEFINER (nodig: `social_notifications` heeft geen client-INSERT-policy), maar
controleerde alleen of de caller ingelogd was en of `event_type`/`target_type` in een allowlist stonden. Ontvanger
en doel waren volledig caller-gestuurd; er was geen relatie tussen `auth.uid()`, ontvanger en doel.

**Autorisatiematrix (afgeleid uit bestaande producers).**

| Type | Producer | Actor | Ontvanger | Vereiste relatie (server-side bewijs) |
|---|---|---|---|---|
| reaction | index.html `socialToggleReaction` (na eigen reaction-insert) | auth.uid() | eigenaar activity | `social_reactions(activity, actor)` en `social_shared_activities.athlete_id = ontvanger`, target_type `shared_activity` |
| comment | index.html `socialPostComment` (na eigen comment-insert) | auth.uid() | eigenaar activity | `social_comments(activity, actor)` en `athlete_id = ontvanger` |
| connection_request | index.html `socialFollow` (na pending-insert) | auth.uid() | gevolgde | `social_connections(actor → ontvanger, pending)`, target = profiel actor |
| connection_accepted | index.html `socialAcceptFollow` (na accept) | auth.uid() | volger | `social_connections(ontvanger → actor, accepted)`, target = profiel actor |
| responsibility_assigned | DB-keten `assign_event_responsibility_notify` (v540) | auth.uid() | toegewezene | `event_responsibilities(event, assigned_user_id = ontvanger)` en `team_has_access(team, owner/admin/staff)` (categorie A-helper, gebonden aan auth.uid()) |
| group_invite, group_join_approved, challenge_invite | geen producer | — | — | niet meer via deze functie (fail-closed) |
| team_event_created/updated/cancelled | eigen geautoriseerde SECDEF-functies (direct insert) | — | — | niet via deze functie (fail-closed) |
| new_message | trigger `notify_message_participants` | — | — | niet via deze functie |

**Gekozen fix (`migratie_v571.sql`).** Zelfde signature, SECURITY DEFINER, owner en `search_path`; actor =
`auth.uid()`; allowlist teruggebracht tot de vijf aantoonbaar geproduceerde typen; per type een verplichte
`exists`-controle zoals in de matrix; zonder bewijs → exception (fail-closed); geen F-SEC-003-orakels gebruikt;
EXECUTE blijft zonder PUBLIC/anon. Geen wijziging aan tabellen, RLS of policies.

**Verworpen alternatieven.** (1) EXECUTE voor authenticated intrekken: breekt de vier legitieme frontend-flows.
(2) Alleen blokkeren van niet-verbonden gebruikers via `social_is_blocked_pair`/connecties: dekt reaction/comment/
responsibility niet en gebruikt een F-SEC-003-orakel als boundary. (3) Notificaties naar een triggerlaag verplaatsen:
correct maar een brede refactor buiten deze slice.

**Adversarial evidence vóór de fix (live functie, rollback).** N1 exploit: TOEGESTAAN.

**Adversarial + regressie-evidence met de nieuwe definitie (productie, alles in één teruggedraaide transactie; md5
van de live functie daarna ongewijzigd, 0 restrijen).**
Geweigerd: N1 exploit (willekeurig doel), N2 reaction naar niet-eigenaar, N3 geldig type verkeerde context, N4
connection_request met vervalst doel, N5 connection_request zonder relatie, N6 connection_accepted bij pending, N7
team_event_cancelled via RPC, N8 group_invite, N9 onbekend type, N10 responsibility naar niet-toegewezene, N11
responsibility door niet-staff, N12 keten door niet-staff, N13 reaction zonder eigen reaction, N14 reaction na
verwijderen relatie, N15 anon, N16 responsibility op onbestaand event, N17 member → staff.
Toegestaan: P1 reaction, P2 comment, P3 connection_request, P4 connection_accepted, P5 responsibility (staff →
toegewezene), P6 keten `assign_event_responsibility_notify` (staff). S1 zichzelf: stille no-op (bestaand gedrag).
Herhaalbaar: `tools/verify-f-sec-001.sql`.

**Residual risk.** Een gebruiker met een bestaande legitieme relatie kan de bijbehorende notificatie herhaald
triggeren (bijv. reaction-notificatie meerdere keren) — geen cross-user misbruik, wel mogelijke herhaling; geen
deduplicatie in deze slice.

**Productie-evidence v571 (29 september 2026).** Migratie `20260929145213:migratie_v571_f_sec_001_notification_authz`
eenmalig toegepast ná de groene exact-head Quality Gate van PR #485. Live geverifieerd: nieuwe definitie (md5
`84f8ff62…`, actor gebonden aan `auth.uid()`), één overload, SECURITY DEFINER, owner `postgres`,
`search_path=public`; EXECUTE: anon nee, PUBLIC nee, authenticated ja, service_role ja; `social_notifications` RLS aan,
policies ongewijzigd (recipient-select, recipient-update). `tools/verify-f-sec-001.sql` tegen de live functie
(rollback): N1–N15 en N18 (directe INSERT als RPC-bypass) GEWEIGERD, P1–P6 TOEGESTAAN, S1 no-op; daarna 0 restrijen
en 0 testcontext. Security Advisors na DDL: geen nieuwe bevinding; SECURITY DEFINER anon-uitvoerbaar 0,
authenticated-uitvoerbaar 29 (ongewijzigd; `social_create_notification` is nu categorie A).

**Status F-SEC-001: CLOSED_PROVEN.** Alle closure-contractpunten aangetoond: squash-merge PR #485
(`2b4c963852dde0c4ef2b22aa208f2f55fc96dccd`) en post-merge Quality Gate groen.

## F-SEC-005 closure (29 september 2026, migratie v572)

**Inventory (live, vóór).** Schema public: 119 tabellen (alle owner `postgres`, alle RLS aan), 7 sequences, geen
views; geen pg_graphql; schema-USAGE voor anon/authenticated, geen CREATE. Effectieve tabelrechten:

| Recht | authenticated | anon |
|---|---|---|
| SELECT | 115 | 96 |
| INSERT | 115 | 96 |
| UPDATE / DELETE | 113 | 96 |
| TRUNCATE | 99 | 96 |
| REFERENCES | 99 | 96 |
| TRIGGER | 99 | 96 |

Geen PUBLIC-tabelgrants. De 20 tabellen zonder TRUNCATE hadden dat al eerder gericht ingetrokken (o.a.
`beta_feedback`, `product_telemetry_events`, `nutrition_*`, `research_*`).

**Root cause.** `pg_default_acl` van rol `postgres` in schema public gaf anon/authenticated `arwdDxtm` op elke nieuwe
tabel (Supabase-default); migraties maken tabellen als `postgres`. Dezelfde default staat voor `supabase_admin`, die de
projectrol niet mag wijzigen.

**RLS-interactie.** TRUNCATE valt niet onder RLS. Adversarial (rollback, productie, representatieve back-uptabel):
authenticated TRUNCATE → TOEGESTAAN (tabel leeg binnen de transactie, erna ongewijzigd); anon TRUNCATE → TOEGESTAAN;
authenticated CREATE TRIGGER via een tijdelijke functie → TOEGESTAAN; nieuwe tabel erft TRUNCATE/REFERENCES/TRIGGER.
DML bleef door RLS begrensd (cross-user INSERT geweigerd).

**Classificatie.** TRUNCATE (anon/authenticated) = **C** (RLS-omzeilend en destructief, bewezen uitvoerbaar in een
anon/authenticated-sessie; geen client-route: PostgREST kent geen TRUNCATE/DDL, geen pg_graphql, geen dynamische SQL in
aanroepbare functies → niet D). TRIGGER = **C** (trigger aan applicatietabel te hangen). REFERENCES = **B** (geen
behoefte; FK's naar public vanuit temp-tabellen zijn niet toegestaan). SELECT/INSERT/UPDATE/DELETE = **A** voor de
Supabase-architectuur (RLS is de begrenzing; buiten deze slice). Sequences (USAGE nodig voor inserts) = A; sequence-UPDATE
(setval) = restpunt.

**Remediatie (`migratie_v572.sql`).** TRUNCATE, REFERENCES en TRIGGER ingetrokken van anon, authenticated en PUBLIC
op alle tabellen in public (loop over pg_class) en de default privileges van `postgres` in public gehard. Geen grant,
geen DML-revoke, RLS/policies/service_role/owners ongewijzigd. Geen TK-client of -functie gebruikt deze rechten.

**Tests.** `core/fSecTablePrivileges.test.js` (CI, 9 sabotages); `tools/verify-f-sec-005.sql` (rollback-verificatie).

**Productie-evidence v572 (29 september 2026).** Migratie `20260929162243:migratie_v572_f_sec_005_table_privileges`
eenmalig toegepast ná de groene exact-head Quality Gate van PR #486. Live na DDL: TRUNCATE/REFERENCES/TRIGGER voor
anon en authenticated op 0 van 119 tabellen; SELECT/INSERT/UPDATE/DELETE ongewijzigd (authenticated 115/115/113/113,
anon 96); service_role TRUNCATE op 119/119; 0 tabellen zonder RLS; default privileges `postgres`/public nu
`anon=arwdm`, `authenticated=arwdm` (zonder D/x/t). `tools/verify-f-sec-005.sql` (rollback): authenticated en anon
TRUNCATE GEWEIGERD, authenticated CREATE TRIGGER GEWEIGERD, nieuwe tabel zonder TRUNCATE/REFERENCES/TRIGGER maar met
SELECT/INSERT, legitieme RLS-insert met FK en eigen RPC (`upsert_daily_health`) TOEGESTAAN, cross-user INSERT
GEWEIGERD, service_role TRUNCATE en DML TOEGESTAAN; daarna 0 restrijen en geen probe-tabel. Security Advisors na
DDL: ongewijzigd (de linter controleert geen tabelgrants).

**Restrisico.** (1) Default privileges van `supabase_admin` in public geven nog `arwdDxtm` (projectrol mag dit niet
wijzigen; alle huidige public-tabellen zijn van `postgres`). (2) Sequence-UPDATE (setval) voor anon/authenticated
en functie-EXECUTE-defaults voor anon zijn buiten deze slice gebleven. (3) DML-grants blijven in het Supabase-model
door RLS begrensd.

**Status F-SEC-005: CLOSED_PROVEN** (binnen de vastgestelde scope: RLS-omzeilende/DDL-achtige tabelrechten).
Squash-merge PR #486 (`fb4c9d10957c77bbfdd6f062c77ac6e61c936563`) en post-merge Quality Gate groen.

## F-SEC-002 closure (29 september 2026, migratie v573)

**Trust boundary.** Client → `netlify/functions/coach.js` (identiteit uit `/auth/v1/user`; requestType →
featureKey server-side) → entitlement + quota uit `plan_features`/`plan_feature_quota`/users (server-side;
verified tester onbeperkt) → `rpc/check_and_increment_usage(featureKey, periode, quota)` met de gebruikers-JWT
(SECURITY DEFINER, `auth.uid()`-gebonden, atomair: conditionele UPDATE `aantal < p_quota` + unique-violation-retry) →
Anthropic → bij providerfout of exception: compensatie. `usage_log` heeft RLS met alleen `select_own` (geen client-DML).

**Root cause.** De compensatie `decrement_usage(text, date)` (SECURITY DEFINER, `auth.uid()`, vloer 0) was EXECUTE
voor authenticated. Bedoeld als server-compensatie, maar direct aanroepbaar: een gebruiker kon het eigen
maandverbruik onbeperkt terugzetten.

**Exploit vóór de fix (rollback, productie, periode 2000-01-01).** quota 1: eerste verbruik TOEGESTAAN, tweede
GEWEIGERD; client `decrement_usage` → TOEGESTAAN; daarna opnieuw verbruik TOEGESTAAN (bypass); 3× decrement → stand
0 (vloer). Cross-user: stand van B ongewijzigd (auth.uid()-gebonden). anon: geweigerd. Directe UPDATE `usage_log`:
0 rijen (RLS). Zelfgekozen `p_quota` bij directe `check_and_increment_usage` verhoogt alleen het eigen verbruik en
geeft geen AI-toegang (de server controleert altijd zelf). 0 restrijen.

**Classificatie.** `decrement_usage` client-uitvoerbaar = **D** (bevestigde quota-bypass, alleen eigen account).
`check_and_increment_usage` = **A** (nodig voor coach.js met gebruikers-JWT; atomair; direct aanroepen = alleen eigen
verbruik). `increment_usage` en `consume_credit` = **B** (geen callers; kunnen uitsluitend het eigen verbruik
verhogen/credits verlagen — geen bypass; niet aangepast). Concurrency: race-safe door de conditionele UPDATE en de
unique-violation-retry in de database (code-bewezen; mock-test "R" in `fCoachEnforcement`); parallelle
databasesessies waren via de beschikbare tooling niet uitvoerbaar.

**Fix (`migratie_v573.sql` + coach.js).** Nieuwe `decrement_usage_for_user(p_user_id, p_feature_key, p_periode)`,
SECURITY DEFINER, uitsluitend service_role (zelfde patroon als `ai_usage_registreer`/`grant_credit_purchase`);
EXECUTE op `decrement_usage(text, date)` ingetrokken van PUBLIC/anon/authenticated. coach.js compenseert alleen na een
eigen reservering, via de service key met de uit het JWT geverifieerde userId; zonder service key geen compensatie
(fail-safe). Geen plan-, quota-, credit- of RLS-wijziging.

**Evidence met de nieuwe definitie (productie, in een teruggedraaide transactie).** Geweigerd: client
`decrement_usage`, client `decrement_usage_for_user` (eigen en vervalste id), anon op alle drie de functies,
compensatie zonder gebruiker; na geweigerde compensatie blijft de quota vol; directe UPDATE 0 rijen. Toegestaan:
verbruik binnen quota, server-compensatie via service_role (vloer 0 bij herhaling). Stand van B ongewijzigd.
Herhaalbaar: `tools/verify-f-sec-002.sql`. Tests: `core/fSecUsageQuota.test.js` (9 sabotages), `fCoachEnforcement`
P1b.

**Productie-evidence v573 (29 september 2026).** Migratie `20260929212712:migratie_v573_f_sec_002_usage_quota`
eenmalig toegepast ná de groene exact-head Quality Gate van PR #487. Live: `decrement_usage` — anon/authenticated/
PUBLIC geen EXECUTE, service_role wel; `decrement_usage_for_user` — alleen service_role; beide SECURITY DEFINER, owner
`postgres`, `search_path=public`; `check_and_increment_usage`, `increment_usage`, `consume_credit` ongewijzigd;
`usage_log` RLS aan met 1 policy. `tools/verify-f-sec-002.sql` tegen de live functies (rollback): N1–N10 GEWEIGERD
(incl. client- en anon-compensatie, vervalste gebruiker, directe UPDATE 0 rijen), P1–P3 TOEGESTAAN (verbruik binnen
quota, server-compensatie, vloer 0), stand B ongewijzigd; daarna 0 restrijen. Security Advisors na DDL:
SECURITY DEFINER uitvoerbaar door authenticated 29 → 28 (`decrement_usage` verdwenen), door anon 0; verder ongewijzigd.

**Restrisico.** Tussen productie-DDL en deploy van de nieuwe coach.js faalde de best-effort compensatie (hooguit één
eenheid verlies bij een providerfout, nooit gratis capaciteit). `increment_usage`/`consume_credit` blijven client-
uitvoerbaar zonder callers (B, alleen zelfbenadeling). `check_and_increment_usage` accepteert een door de caller
gekozen `p_quota`; bij directe aanroep leidt dat alleen tot eigen verbruik, nooit tot AI-toegang.

**Status F-SEC-002: CLOSED_PROVEN.** Squash-merge PR #487 (`ddc2caf01ea9d5e4bd1e1f08422022248c387db1`) en
post-merge Quality Gate groen.

## F-SEC-003 closure (29 september 2026, migratie v574)

**Helperset (live).** Zes SECURITY DEFINER-booleanhelpers accepteerden identiteiten van derden, allemaal owner
`postgres`, `search_path=public`, EXECUTE voor authenticated (niet anon/PUBLIC): `coach_has_scope(p_coach_id,
p_athlete_id, p_scope)`, `org_user_has_role(p_org_id, p_user_id, p_roles)`, `social_is_blocked_pair(a, b)`,
`social_is_group_member(u, g)`, `social_is_group_owner(u, g)`, `is_relationship_active(rel_id)`. Analoge helpers
`is_relationship_athlete`, `is_relationship_coach`, `is_thread_participant`, `org_has_role` en `team_has_access` zijn
al aan `auth.uid()` gebonden (A).

**Dependency graph.** Geen enkele TK-client of Netlify-functie roept de zes direct aan (alleen commentaar in
index.html/core). RLS-policies: `coach_has_scope` 6 (sessions, hrv_log, cycle_periods, cycle_symptom_logs,
coach_program_assignments, coach_workout_feedback), `social_is_blocked_pair` 8 (social feed, profielen, reacties,
comments, challenges, messages), `social_is_group_member` 4, `social_is_group_owner` 1, `org_user_has_role` 1
(`cpa_org_staff_wijst_toe`), `is_relationship_active` 0. Functies: `get_or_create_direct_thread`
(`social_is_blocked_pair`), `materialize_coach_assignment` (`coach_has_scope`, `org_user_has_role`), trigger
`team_events_validate_linked_training` (`org_user_has_role`). Elke policy-aanroep van coach_has_scope,
social_is_blocked_pair en de groepshelpers geeft `auth.uid()` mee als partij; `materialize_coach_assignment` en
`get_or_create_direct_thread` eveneens. `org_user_has_role` wordt voor een derde gebruikt in de policy (na
`org_has_role(owner/admin/staff)` van de caller) en in de trigger.

**Bedoelde semantiek.** De policy-helpers beantwoorden vragen over de caller zelf (of, voor org_user_has_role, over
leden van een organisatie waarin de caller owner/admin/staff is). Directe beantwoording over willekeurige derden is
nergens nodig. Een revoke van EXECUTE was geen optie: RLS-policies evalueren de helpers met de rechten van
`authenticated`.

**Orakel vóór de fix (rollback, productie; A zonder enige relatie).** `coach_has_scope(B,C)`, `social_is_blocked_pair(B,C)`,
`org_user_has_role(org,C)`, `social_is_group_member(C,G)`, `social_is_group_owner(B,G)` en
`is_relationship_active(rel)` gaven allemaal `true`, terwijl RLS A 0/0/0/0 onderliggende rijen liet zien. Gelekt:
bestaan van een actieve coach-athlete-relatie met een specifieke scope, blokkades tussen derden, organisatierol,
groepslidmaatschap/-eigenaarschap en de actieve status van een relatie-id.

**Classificatie.** De vijf policy-helpers = **C** (bevestigde disclosure over derden; geen schrijf-/leesbypass → niet
D). `is_relationship_active` = **C** met lage impact (vereist een onbekende relatie-UUID), bovendien zonder callers.

**Fix (`migratie_v574.sql`).** Zelfde functie-objecten (policies blijven ernaar verwijzen), signatures, SECURITY
DEFINER, STABLE, owner en search_path: `coach_has_scope` en `social_is_blocked_pair` antwoorden alleen als de caller
partij is; de groepshelpers alleen voor de caller zelf; `org_user_has_role` voor de caller zelf of — alleen als de
caller owner/admin/staff van die organisatie is — voor een derde; zonder `auth.uid()` altijd false. De trigger
controleert lidmaatschap inline met de ongewijzigde query. `is_relationship_active`: EXECUTE ingetrokken van
PUBLIC/anon/authenticated. Geen grant, policy- of RLS-wijziging.

**Evidence met de nieuwe definities (productie, één teruggedraaide transactie; live definities daarna ongewijzigd,
0 restrijen).** Orakel door A: alle vijf `false`, `is_relationship_active` geweigerd. Positief: coach B →
`coach_has_scope` true en RLS toont hrv_log van athlete C; groepseigenaar B beheert groepsleden (1 rij); C ziet de
invite-only groep, eigen blokkade en eigen org-rol; org-staff D ziet de rol van lid C; `get_or_create_direct_thread`
weigert nog steeds bij blokkade; trigger: gekoppelde training van een lid toegestaan, van een niet-lid geweigerd.
Negatief blijft: A ziet geen hrv_log/groep en kan geen groepsleden beheren; anon geweigerd. Herhaalbaar:
`tools/verify-f-sec-003.sql`. Tests: `core/fSecHelperOracles.test.js` (10 sabotages).

**Status F-SEC-003:** zie productie-evidence hieronder.
