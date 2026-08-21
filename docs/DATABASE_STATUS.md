# Databasestatus — Trainingskompas

> Controle uitgevoerd 19 augustus 2026 tegen het productieproject `mhfxhzkdmgkaplicdszg`.

## Samenvatting

**Alle tien migraties in de repository zijn volledig uitgevoerd.** Er is geen enkele
migratie overgeslagen. Wat wél ontbreekt is SQL die nooit geschreven is: security-hardening
op de trigger-functies (`migratie_v447.sql`) en een RLS-performanceoptimalisatie (nog niet
uitgevoerd, zie onderaan).

## Uitgevoerde migraties

| Migratie | Levert | Status |
|---|---|---|
| v328 | `wearable_connections`, `wearable_oauth_state` + trigger | ✅ |
| v330 | `gyms.coach_pin_hash`, `provision_public_user()`, `gym_audit_log` | ✅ |
| v331 | `exercises.gym_id` / `.created_by` + gym-policies | ✅ (door v333 vervangen) |
| v332 | `exercise_equipment.user_id` + policy + trigger | ✅ |
| v333 | `content_shares`, `scope` op exercises/custom_trainings, 3-laags RLS | ✅ |
| v334 | `users.email_confirmed_at`, `sync_email_confirmed()` | ✅ |
| v335 | `equipment_catalog` + 4 policies + trigger | ✅ |
| v336 | `atleet_profiel.doel` | ✅ |
| v337 | `goals` + 4 policies | ✅ |
| v446 | levenscyclus `training_instances` | ✅ uitgevoerd 19 aug |

### Migraties ná dit auditmoment (v4.51.0–v4.54.0)

Onderstaande twee zijn **niet** onderdeel van de 19-augustus-controle hierboven — apart
bevestigd via een door de eigenaar aangeleverde schema-export (niet een live query van de
assistent zelf; deze omgeving heeft geen netwerktoegang tot Supabase).

| Migratie | Levert | Status |
|---|---|---|
| v452 | `training_instances.weather` (jsonb), `sessions.weather` (jsonb) | ✅ bevestigd door de eigenaar (schema-export, na 19 aug) |
| v454 | `atleet_profiel.cyclus_consent` (boolean) | ✅ bevestigd door de eigenaar (schema-export, na 19 aug) |

`migratie_v451.sql` bestaat niet als apart bestand: `rest_duration_s` (v4.51.0) landt in de
al bestaande JSONB-kolom `sessions.sets_detail` — geen schemawijziging nodig, dus geen
migratie om te bevestigen.

### Twee schijnbare gaten die geen gaten zijn

`set_exercise_gym_context()` en `trg_set_exercise_gym_context` bestaan niet meer, en de
policies `exercises_select_global_or_own_gym` / `exercises_insert_gym_coach` evenmin.
Dat is **correct**: v333 dropt ze expliciet (`DROP FUNCTION IF EXISTS
set_exercise_gym_context() CASCADE; -- v331, vervangen`) en vervangt ze door
`set_exercise_scope_context()` en de `_v333`-policies. Hun afwezigheid is juist het bewijs
dat zowel v331 als v333 gedraaid hebben, in die volgorde.

### Uitkomst van v446

| status | rijen | met sessie | met completed_at |
|---|---|---|---|
| completed | 11 | 11 | 11 (9–15 aug) |
| aborted | 128 | 0 | 0 |
| active | 0 | — | — |

Alle 139 snapshots zijn bewaard gebleven. Geen enkele rij verwijderd.

## Advisor-meldingen die géén defect zijn

De security advisor meldt `rls_enabled_no_policy` op `wearable_connections`,
`wearable_oauth_state` en `gym_audit_log`. Dat is **opzet**, expliciet gedocumenteerd in
v328 en v330: deze tabellen bevatten OAuth-tokens respectievelijk een auditspoor en zijn
uitsluitend via de service_role (Netlify Functions) benaderbaar. Een SELECT-policy voor
`authenticated` zou de tokens in de netwerkrespons zetten.

Hetzelfde geldt voor de `bak_p_*`-tabellen (backups) en de Fase 5-tabellen (`plans`,
`features`, `credit_packs`, `discounts`, `config`, `plan_features`, `plan_feature_quota`):
RLS aan zonder policy betekent dicht, en die tabellen zijn nog niet in gebruik.

## Openstaand

### 1. Security hardening — `migratie_v447.sql` (aanbevolen, laag risico)

Acht SECURITY DEFINER-functies hebben geen vaste `search_path` (klassiek
privilege-escalatiepad) en zijn alle acht aanroepbaar als RPC via `/rest/v1/rpc/<naam>`,
ook door niet-ingelogde bezoekers. Geverifieerd is dat alle acht **uitsluitend** als
trigger worden gebruikt, dus het intrekken van EXECUTE raakt geen enkele trigger.

### 2. RLS-performance — nog niet geschreven

De performance advisor meldt **82× `auth_rls_initplan`**: policies die `auth.uid()` per
rij evalueren in plaats van één keer per query. De standaardoplossing is `auth.uid()`
vervangen door `(select auth.uid())` — semantisch identiek, maar het scheelt bij grotere
tabellen een factor.

Bewust nog niet uitgevoerd: dit raakt vrijwel elke policy in de database, en een verkeerd
herschreven policy is een datalek of een blokkade. Dit hoort een eigen sprint te zijn met
een vóór/na-vergelijking per policy en een RLS-regressietest per rol. Bij de huidige
datavolumes (112 sessies) is er geen merkbare performancewinst; het is een investering
voor later.

### 3. Ontbrekende indexes op foreign keys — bewust niet nu

43 meldingen. Bij de huidige rijaantallen (grootste tabel: 139 rijen) kiest de planner
sowieso een sequential scan; een index levert niets op en kost onderhoud bij elke insert.
Heroverwegen zodra een tabel de ~10.000 rijen nadert.

### 4. Leaked password protection staat uit

Supabase Auth kan wachtwoorden controleren tegen HaveIBeenPwned. Dit is een instelling in
het dashboard (Authentication → Policies), geen SQL.
