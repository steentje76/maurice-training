# B9-H2A Gym/Club Dual System Audit

## SYSTEM A — "gym_id-model" (ouder, daadwerkelijk actief in de UI)

**TABLES:** `users.gym_id`/`gym_role`/`gym_role_level` (text-kolommen op
users, geen aparte membership-tabel), `gyms` (id text, branding/
billing/pin-velden), `gym_audit_log`.
**RPCS:** geen SECURITY DEFINER-RPC's gevonden specifiek voor dit systeem.
**FUNCTIONS:** `netlify/functions/gym-team.js` (pincode-verificatie,
audit-logging), `netlify/functions/gym-team-set-pin.js`.
**RLS:** `gyms` heeft RLS met 3 policies. `users.gym_id` zelf wordt
beschermd via de bestaande `users`-RLS (geen apart membership-model om
te beveiligen -- de rol staat direct op de user-rij).
**GRANTS:** niet apart onderzocht (geen nieuwe RPC).
**UI REFERENCES:** 10 treffers voor `gym_id`/`gym_role` in `index.html`
-- **dit is het daadwerkelijk actieve systeem.**
**NETLIFY REFERENCES:** `gym-team.js`, `gym-team-set-pin.js`.
**CORE MODULES:** geen dedicated core-module gevonden.
**ACCOUNT DELETION:** niet apart geverifieerd binnen deze sprint (geen
wijziging aan dit systeem).
**EXPORT:** geen apart exportcontract.
**TELEMETRY:** niet onderzocht.
**TESTS:** niet apart geïdentificeerd binnen deze sprint.
**MIGRATIONS:** onbekend (voor deze sessie), bestaat al langer dan de
huidige B9-serie.
**CREATED IN:** vóór de huidige B9-serie (legacy).
**CURRENT DATA:** **1 gym** (ART CrossFit, live geverifieerd via
`select count(*) from gyms` = 1).
**DEPENDENCIES:** billing/plan_key/mollie_customer_id, dynamic branding.

## SYSTEM B — "organizations-model" (nieuwer, grotendeels ongebruikt in de UI, maar wél de feitelijke foundation onder Coach/Team)

**TABLES:** `organizations` (id text, name, sport_id, owner_user_id),
`teams` (id text, organization_id, name, sport_id), `memberships` (id
uuid, user_id uuid, organization_id text, team_id text,
training_group_id text, sport_id text, role, status).
**RPCS:** niet apart onderzocht binnen deze sprint (geen wijziging
nodig gebleken).
**FUNCTIONS:** geen dedicated Netlify-functie gevonden.
**RLS:** `organizations` 4 policies, `teams` 2 policies, `memberships`
6 policies -- allemaal RLS-ingeschakeld, live bevestigd.
**GRANTS:** standaard (geen SECURITY DEFINER-RPC gevonden voor dit
systeem binnen deze sprint).
**UI REFERENCES:** **0 treffers** in `index.html` voor `organizations`/
`teams` als tabelnaam in een directe query.
**NETLIFY REFERENCES:** 0 dedicated functie, maar wel referenties
vanuit `coach_program_assignments.organization_id` en
`team_events.team_id` (zie hieronder -- indirecte, structurele
afhankelijkheid).
**CORE MODULES:** geen dedicated core-module.
**ACCOUNT DELETION:** `organizations`/`memberships` niet apart
geverifieerd binnen deze sprint (geen wijziging).
**EXPORT:** geen apart exportcontract.
**TELEMETRY:** niet onderzocht.
**TESTS:** niet apart geïdentificeerd.
**MIGRATIONS:** onbekend (vóór deze sessie).
**CREATED IN:** vóór de huidige B9-serie, vermoedelijk als voorbereiding
op een rijkere organisatiestructuur (F11 Gym/Club/Team Platform,
conform de bestaande roadmap-fase-vermelding in CURRENT_STATE.md).
**CURRENT DATA:** niet grootschalig gemeten (geen bekende, actieve
gebruikers via dit pad in de huidige UI).
**DEPENDENCIES:** `coach_program_assignments.organization_id`,
`team_events.team_id`, en **cruciaal: `gyms.organization_id`
(foreign key naar `organizations(id)`, `ON DELETE CASCADE`, reeds
bestaand)**.

## KRITIEKE, DOORSLAGGEVENDE BEVINDING

`gyms.organization_id` heeft al een **echte, bestaande foreign-key-
relatie** naar `organizations(id)` (`ON DELETE CASCADE`) -- de
architectuur is dus al, ergens in het verleden, bewust voorbereid om
System A (`gyms`) onder System B (`organizations`) te hangen. Deze
koppeling is echter nog **nooit daadwerkelijk gebruikt**: de ene
bestaande gym-rij heeft `organization_id = NULL`.

Bovendien blijkt de **Coach/PT- en Team Operations-infrastructuur al
gebouwd te zijn op System B**, niet op System A:
`coach_program_assignments.organization_id` en `team_events.team_id`
verwijzen beide naar het `organizations`/`teams`-model. Dit betekent:
System B is niet zomaar "het nieuwere, ongebruikte alternatief" -- het
is **al de feitelijke foundation** waarop de coach- en team-
infrastructuur voortbouwt. Alleen het Gym/Club-gedeelte zelf (via
`users.gym_id`) draait nog op het oudere systeem.
