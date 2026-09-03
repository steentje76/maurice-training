# ADMIN_AUTH_AND_GYM_MIGRATION_PLAN.md

## A. ADMIN AUTH — forensische inventarisatie

**Twee, volledig gescheiden PIN-mechanismen bestaan — niet één.**

### A1. `s-admin-pin` (client-side, catalogus-gating)
- **CURRENT:** `index.html` regel 6256: `const PIN_HASH = '699415a6...'` (SHA-256, hardcoded in client-broncode). `vAPin()` vergelijkt client-side `sha256(adminPinBuf)===PIN_HASH`. Bij match: `go('s-admin')`.
- **Wat het ontsluit:** `s-admin` (regel 4440-4480) is uitsluitend een **oefeningen-/apparatuur-catalogusbeheer** (PM5's, oefeningen, equipment types, apparatuur-catalogus). Geen ledenbeheer, geen rollen, geen gezondheidsdata.
- **Backend enforcement:** GROTENDEELS AL AANWEZIG. `exercises` INSERT/UPDATE/DELETE: correct RLS op `gym_role_level >= 1`. `equipment_catalog`/`exercise_equipment` UPDATE/DELETE: correct RLS op `gym_role_level >= 3` OF `org_has_role(owner/admin/staff)` OF eigen `user_id`.
- **ECHTE GAT — HERZIEN NA LIVE ONDERZOEK:** `equipment_catalog_insert` en `exercise_equipment_insert` hadden `WITH CHECK: true`. Live, transactioneel getest (rollback) bleek dit **GEEN exploiteerbare kwetsbaarheid**: before-insert-triggers (`set_exercise_equipment_owner()`/`set_equipment_catalog_owner()`) controleren autorisatie zelf en overschrijven `gym_id`/`user_id`/`organization_id` altijd met server-vertrouwde waarden, ongeacht wat de client meegeeft. Een test-insert met een willekeurige, vreemde `gym_id` werd door de trigger stilzwijgend vervangen door de echte, eigen gym_id van de aanroeper. De RLS-aanscherping is daarom uitgevoerd als **defense-in-depth** (een tweede, onafhankelijke verdedigingslaag voor het geval de trigger ooit wijzigt), **niet als reparatie van een kritieke fout**. Dit is een belangrijke, eerlijke correctie op de aanvankelijke aanname bij het lezen van alleen de policy-definitie.
- **Kan de client-side PIN privilege verhogen?** NEE — de PIN opent alleen een client-side scherm; alle onderliggende schrijfacties (behalve de twee INSERT-gaten hierboven) waren al RLS-beschermd ongeacht de PIN.
- **Tests:** 0 bestaande tests voor deze PIN of voor de twee RLS-gaten.

### A2. `gym-team.js` (server-side, team-/rollenbeheer — het echte, gevoelige mechanisme)
- **CURRENT:** Netlify-functie, POST-only, vereist geldige Supabase-sessie (server-side geverifieerd via `/auth/v1/user`, nooit client `user_id` vertrouwd). Acties: `whoami` (geen PIN), `lookup_teammate` (geen PIN, tenant-gescoped), `list`/`audit_log` (min. `gym_role_level>=1`, coach), `update_role` (min. `gym_role_level>=2`, manager).
- **PIN-rol:** `gyms.coach_pin_hash` is een **gedeelde, tweede factor per gym**, bovenop — niet in plaats van — de rolcontrole. De rolcontrole gebeurt vóór de PIN-check.
- **Privilege-escalatie-bescherming:** al aanwezig (P0-002-fix in de code zelf): niemand kan een gelijke/hogere rol wijzigen, niemand kan een hogere rol toekennen dan zijn eigen rol.
- **Kip-en-ei-bypass:** als `gyms.coach_pin_hash` nog niet is ingesteld, mag alleen `gym_role_level>=3` (owner) erdoorheen zonder PIN — beperkt en acceptabel, wel expliciet documenteren.
- **Audit:** `gym_audit_log` legt elke rolwijziging vast (actor, target, from/to, timestamp) — al aanwezig, target-requirement (sectie 7 van de opdracht) is al vervuld.
- **Tests:** 0 bestaande tests.

### Conclusie A
Er is geen "gedeelde PIN als enige authorization" gevonden -- het gevoeligste mechanisme (`gym-team.js`) heeft al server-side rolcontrole vóór de PIN. De aanvankelijk vermoede RLS-kwetsbaarheid (2 open INSERT-policies) bleek bij live onderzoek GEEN exploiteerbaar gat, dankzij bestaande before-insert-triggers. RLS is alsnog gehard als defense-in-depth. Geen tests bestonden voor beide mechanismen vóór deze sprint.

## B. LEGACY GYM vs. CANONICAL ORGANIZATION — dependency graph

**LEGACY:** tabellen `users.gym_id/gym_role/gym_role_level(generated)`, `gyms(id, coach_pin_hash, ...)`, `gym_audit_log`. Functies: `netlify/functions/gym-team.js`, `gym-team-set-pin.js`. RLS: rolgebaseerd via `users.gym_role_level`, org-parallel via `org_has_role()` op dezelfde tabellen (`exercise_equipment`/`equipment_catalog` gebruiken AL BEIDE modellen tegelijk — `gym_id`-tak én `organization_id`-tak in dezelfde policy). JS: `index.html` (10 treffers `gym_id`/`gym_role`), `s-admin`, `s-admin-pin`. Tests: 0 specifiek voor gym-auth.

**CANONICAL:** tabellen `organizations`, `memberships`, `teams`, functie `org_has_role()`, `team_has_access()`. RLS: reeds actief op `exercise_equipment`/`equipment_catalog` (org-tak). JS: 0 treffers in `index.html` (geen scherm leest/schrijft canonical direct). Tests: B9-H2A/B/C-suites (10+13+21).

**Belangrijke, geruststellende bevinding:** de RLS op `exercise_equipment`/`equipment_catalog` is **al dual-model** — beide paden (`gym_id`-tak en `organization_id`-tak) bestaan in dezelfde policy-expressie. Dit is precies de "strangler"-voorbereiding die de opdracht vraagt: er hoeft geen nieuwe RLS te worden geschreven om canonical te ondersteunen, die bestaat al naast legacy.

## GAPS
1. `equipment_catalog_insert`/`exercise_equipment_insert`: `WITH CHECK true` (P1, veilig oplosbaar).
2. 0 adversariële tests voor gym-team.js en de catalogus-RLS.
3. Gym-join-flow (waar een nieuwe gebruiker `users.gym_id` krijgt) schrijft uitsluitend legacy — nog geen canonical `memberships`-write. **Niet in deze sprint gewijzigd** (Track B blijft analyse, geen migratie van de write-flow zonder aparte, expliciete PO-goedkeuring van de UX-consequenties).
4. `s-admin-pin` hash staat in client-broncode — theoretisch brute-forcebaar offline, maar geeft geen privilege bovenop wat RLS al toestaat (na fix van gap 1). Geclassificeerd als LOW severity, DEPRECATED-candidate, niet blokkerend.

## DEPENDENCIES
`exercise_equipment`/`equipment_catalog` RLS-fix raakt geen andere tabel. Geen schema-wijziging nodig (alleen policy-vervanging). Geen dependency op Track B.

## RISKS
RLS-policy-vervanging kan bestaande, legitieme writes blokkeren als de nieuwe `WITH CHECK` te streng is. Mitigatie: exact het bestaande, al bewezen UPDATE-patroon hergebruiken (niet een nieuw patroon verzinnen), en live smoke-test met een transactie-rollback vóór definitieve toepassing.

## MIGRATION ORDER
1. Live, transactionele test van de nieuwe INSERT-policy (rollback).
2. Toepassen via `apply_migration`.
3. Adversariële tests (anon/cross-gym/cross-org/zonder rol) toevoegen aan de testsuite.
4. Geen wijziging aan Track B in deze sprint buiten documentatie (zie sectie B hierboven — expliciet geen write-flow-migratie zonder aparte PO-goedkeuring).

## ROLLBACK
Beide policy-wijzigingen zijn enkelvoudige `DROP POLICY` + `CREATE POLICY`-paren; een rollback-migratie kan de oorspronkelijke `WITH CHECK (true)` moeiteloos herstellen indien nodig (niet verwacht).

## DATA PRESERVATION
Geen data verwijderd of gewijzigd — uitsluitend policy-definities. 0 rijen worden aangeraakt.

## RLS IMPACT
Alleen INSERT op `equipment_catalog` en `exercise_equipment` wordt strenger; SELECT/UPDATE/DELETE ongewijzigd.

## TEST PLAN
Nieuwe testsuite `core/fAdminAuthGymRlsHardening.test.js`: adversariële scenario's conform sectie 6 van de opdracht (anon, andere gym, andere org, geen rol, coach zonder org-admin, cross-tenant). Live, transactionele Supabase-verificatie voor de kern-scenario's.

## ACCEPTANCE CRITERIA
- `equipment_catalog_insert`/`exercise_equipment_insert` vereisen aantoonbaar dezelfde rol als UPDATE.
- Live bevestigd: gebruiker zonder gym/org-rol kan niet meer inserten.
- Geen regressie op bestaande, legitieme insert-paden (eigen `user_id`-scope blijft werken).
- Volledige testsuite + release gate groen.
- Geen UX gewijzigd.
