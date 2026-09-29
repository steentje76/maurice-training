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
- Niet: F-SEC-001 (D, open), F-SEC-002, F-SEC-003 (C, open), F-SEC-005, F-SEC-006.

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

**Status F-SEC-001:** zie "Productie-evidence v571" hieronder.
