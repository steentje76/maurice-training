# SECURITY_FINDINGS.md — Trainingskompas (canonieke, actuele versie)

**Laatst herbouwd:** 28 augustus 2026, tegen `main` @ `201385d2d7c6dbc3c1dcd093411aed7619d429c1`.
**Bewijsniveau:** DB VERIFIED (volledige policy-definities, grants, triggers, functiebroncode gelezen) + CODE VERIFIED (Netlify Functions). Read-only, geen wijzigingen aangebracht buiten de expliciet goedgekeurde P0-closure-migratie.

## CURRENT STATUS (samenvatting)

| Bevinding | Status | PR |
|---|---|---|
| P0-001 — `gyms`-tabel publiek leesbaar | **CLOSED** | #64 |
| P0-002 — ontbrekende security-tests (coach.js, wearable-OAuth, delete-account.js, gym-team.js) | **CLOSED** | #64 |
| P0-003 — release gate dekte 10 van ~75 tests (lokaal) | **CLOSED** (met correctie: CI was al comprehensive sinds 18-08) | #64 |
| P2 — ontbrekende scoping op multi-tenant-schema (organizations/teams/etc.) | **OPEN** — zie `GAP_ANALYSIS_V2.md`, GYM-RLS-SCOPING-001 | — |
| P3 — redundante ownership-check in `WITH CHECK` ontbreekt | **OPEN**, cosmetisch | — |

**Alles onder "HISTORICAL RECORD" hieronder beschrijft de situatie ZOALS DIE WAS vóór de fix. Niets daarin is een open actie — elke aanbeveling is óf al geïmplementeerd (zie CURRENT STATUS hierboven), óf expliciet als nog open gemarkeerd in `GAP_ANALYSIS_V2.md`.**

---

## HISTORICAL RECORD — P0-001

### 🔴 P0 — LIVE DATALEK (OPGELOST, zie status hierboven): `gyms`-tabel leesbaar door iedereen, zonder inloggen

**Feit:** de RLS-policy `gyms_read` op `public.gyms` is `USING (true)` voor rol `public`, én de `anon`-rol (de rol die de publieke Supabase-anon-key gebruikt — dezelfde key die in de client-side code van de PWA staat) heeft volledige kolom-`SELECT`-rechten op de tabel. Er is geen enkele beperking — geen `auth.role() = 'authenticated'`, geen kolomrestrictie.

**Concreet:** een willekeurige derde die de publieke Supabase-URL + anon-key uit de PWA haalt (die staan per ontwerp client-side, dat is normaal voor Supabase) kan met een simpel HTTP-verzoek naar `/rest/v1/gyms?select=*` onder meer opvragen:
- `owner_email` (PII van de gym-eigenaar)
- `coach_pin_hash` (hash van de coach-pincode — een hash is geen platte tekst, maar hoort niet publiek leesbaar te zijn; vermindert de veiligheidsmarge van de pincode aanzienlijk als het een kort numeriek pincode-hash betreft, brute-forcebaar offline)
- `mollie_customer_id` (betalingsgerelateerde identifier)
- `disabled_features`, `plan_key` (commercieel/concurrentiegevoelig, minder kritiek)

Op dit moment staat er 1 rij in (`art_crossfit`), dus de blootstelling is beperkt tot jouw eigen gym-gegevens — maar bij elke volgende gym die wordt toegevoegd (het hele multi-gym-doel van het platform) wordt dit een structureel datalek voor élke aangesloten sportschool-eigenaar.

**Oorzaak:** de policy is vermoedelijk bedoeld om branding-gegevens (logo, kleuren, app-naam) publiek leesbaar te maken vóór het inloggen (bijv. voor een gym-specifieke inlogpagina/white-label-scherm) — maar dekt per ongeluk ook de gevoelige kolommen mee, omdat de policy op tabelniveau werkt, niet op kolomniveau.

**HISTORICAL RECOMMENDATION — IMPLEMENTED via `migratie_v496.sql` (PR #64, 28-08-2026):**
1. Kolommen splitsen: een publieke view `gyms_public` met alleen `id, name, logo_url, primary_color, accent_color, font, app_name` (branding), en de RLS op de basistabel `gyms` beperken tot `auth.role() = 'authenticated' AND gym_id = eigen gym` (of alleen leesbaar voor leden van die gym).
2. Client-code laten wijzen naar `gyms_public` voor de branding-behoefte vóór login, en de echte `gyms`-tabel alleen na authenticatie bevragen.
3. `coach_pin_hash` en `mollie_customer_id` sowieso nooit via een client-leesbare route laten lopen — dat hoort puur server-side (Netlify Function met service-role) te blijven, net zoals nu al gebeurt bij `gym-team.js` se pincode-check.

**STATUS: CLOSED.** Deze DDL/beleidswijziging is uitgevoerd in PR #64 (`migratie_v496.sql`); de aanbeveling hierboven beschrijft wat toen is voorgesteld en vervolgens 1-op-1 geïmplementeerd. Zie CURRENT STATUS bovenaan dit document.

---

## 🟡 P2 — Ontbrekende scoping op referentietabellen (nog geen actieve exposure, wel vóór Phase 3 te fixen)

`macrocycles`, `mesocycles`, `microcycles`, `organizations`, `seasons`, `teams`, `training_groups` hebben allemaal een SELECT-policy `auth.role() = 'authenticated'` — dus **elke ingelogde gebruiker kan alle rijen van alle organisaties/teams zien**, niet alleen die van zichzelf. Dit is exact het coach-dashboard/multi-tenant-schema dat volgens `DECISION_LOG.md`/memory "voorbereid maar nog niet afgedwongen" is (Phase 3). Op dit moment staan er 0 rijen in deze tabellen — geen actief lek — maar dit moet vóór de eerste coach/organisatie-data wordt ingevoerd, gefixed worden naar een membership-gebaseerde scoping (naar analogie van `coach_athlete_relationships`, die dat wél correct doet).

## 🟢 Verified: schrijfrechten correct afgedwongen via triggers (geen bug, gecontroleerd)

Bij eerste lezing lijken de `WITH CHECK`-clausules op `exercises`, `custom_trainings` en `equipment_catalog` bij `scope='personal'` geen ownership af te dwingen (`with_check` bevat geen `created_by = auth.uid()` voor dat geval). **Nader onderzoek (trigger-functiebroncode gelezen) bevestigt dat dit geen gat is:** `BEFORE INSERT`-triggers (`set_exercise_scope_context`, `set_training_scope_context`, `set_equipment_catalog_owner`) herschrijven `created_by`/`user_id`/`gym_id` server-side altijd naar `auth.uid()` c.q. de eigen `gym_id`, óngeacht wat de client meestuurt, en blokkeren met een `RAISE EXCEPTION` als de rol te laag is voor `gym`/`global`-scope. Dit is solide defense-in-depth, al is het ongebruikelijk dat de RLS `WITH CHECK` zelf niet ook een redundante ownership-check bevat — als iemand ooit een trigger per ongeluk verwijdert bij een toekomstige migratie, valt deze bescherming direct weg zonder dat de RLS-policy dat zou opvangen. **Aanbeveling (P3, cosmetisch):** `WITH CHECK` uitbreiden met een redundante ownership-voorwaarde voor defense-in-depth, niet urgent.

## 🟢 Verified: eerder gedocumenteerde beveiligingsfixes staan nog overeind

- **`coach.js` open-proxy-fix**: code bevestigt JWT-verificatie via `/auth/v1/user`-aanroep (regel 5, 22-25) — nog aanwezig in v4.69.0, niet per ongeluk teruggedraaid.
- **`gym-team.js` owner-demotie-bug**: code bevestigt expliciete check `if (ROLE_LEVEL[newRole] > caller.gym_role_level) return 403` — een manager kan zichzelf niet meer tot owner promoveren, en de eerder gevonden bug is dus nog steeds gefixed.

## HISTORICAL RECORD — P0-002 (STATUS: CLOSED, zie CURRENT STATUS bovenaan)

**Nieuw gevonden tijdens testontwerp (niet in de oorspronkelijke audit):** `gym-team.js` blokkeerde alleen het *toekennen* van een te hoge rol, niet het *wijzigen* van iemand die al een gelijke/hogere rol had — een manager kon een owner naar `lid` degraderen. **Gefixed**: expliciete check `target.gym_role_level >= caller.gym_role_level` → 403, vóór de bestaande promotie-check.

**61 nieuwe regressietest-assertions, allemaal groen:**
- `core/fCoachProxySecurity.test.js` (12) — geen auth-header/malformed/ongeldige sessie/netwerkfout → altijd 401, Anthropic nooit aangeroepen; geldige sessie → normale flow werkt.
- `core/fGymTeamSecurity.test.js` (17) — niet-lid/te-lage-rol geweigerd, manager kan zichzelf niet tot owner promoveren, **manager kan owner niet demoten (nieuwe fix)**, eigen rol niet wijzigbaar, cross-gym geweigerd, onjuiste pincode geweigerd, PIN-hash nooit in een response, alleen owner mag pincode instellen.
- `core/fWearableAuthSecurity.test.js` (20) — state altijd gebonden aan het server-geverifieerde user-id (nooit client-input), ontbrekende/onbekende/verlopen/hergebruikte state geweigerd, disconnect/status altijd gescoped op eigen sessie, tokens nooit in de statusresponse.
- `core/fDeleteAccountSecurity.test.js` (12) — unauthenticated geweigerd zonder enige delete-call, user kan uitsluitend het eigen (server-geverifieerde) account laten verwijderen, fail-closed bij onvaststelbare identity, content_shares in beide richtingen opgeruimd.

## Overige RLS-observaties (volledigheid)

- Alle sporter-eigen data (`sessions`, `hrv_log`, `weight_log`, `body_comp`, `atleet_profiel`, `programs`, `program_blocks`, `goals`, `exercise_goals`, `training_instances`, `race_segments`, `cycle_periods`, `cycle_symptom_logs`, enz.) is consequent scoped op `user_id = auth.uid()` of `auth.uid() = user_id` — consistent patroon, geen anomalieën gevonden.
- `coach_athlete_relationships` heeft een correct opgezette consent-flow: alleen de betrokken partijen zien de relatie, alleen de sporter kan van `pending` naar `active` zetten (consent geven), beide partijen kunnen intrekken (`revoked`) maar niet meer terugzetten.
- `support_access_log` is terecht alleen leesbaar voor gebruikers met `system_role` support/developer.
- `users`-tabel: alleen eigen rij lezen/updaten — geen gat gevonden dat je andermans rol zou kunnen wijzigen via directe tabeltoegang (rolwijzigingen lopen via `gym-team.js`, met de bovengenoemde bescherming).
