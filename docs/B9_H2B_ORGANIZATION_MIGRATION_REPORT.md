# B9-H2B Organization Migration Report

## Live Migration Execution

**Migratie:** `migratie_v539.sql`, live toegepast via Supabase.

**Vóór migratie (baseline, live bevestigd):** 1 gym (`art-crossfit`),
0 organizations, 0 memberships, 5 gebruikers gekoppeld aan de gym
(1 owner, 4 members via `gym_role`), 0 orphans op alle onderzochte
relaties.

**Na migratie (live bevestigd):** 1 organization (`art-crossfit`,
deterministisch dezelfde id als de gym), 5 memberships (1 owner-rol,
4 member-rollen, exact matchend met de vooraf bekende role-mapping),
`gyms.organization_id = 'art-crossfit'`, `gyms.owner_email = NULL`.

## Idempotentie (live, adversarial getest, sabotage S1)

De volledige migratie tweemaal, achter elkaar uitgevoerd binnen
dezelfde transactie (zonder commit): eerste poging (vóór de fix) gaf
1 organization maar **10 memberships** (dubbel) -- gedetecteerd, de
`on conflict`-clausule werkte niet betrouwbaar met `team_id = NULL`.
Na de fix (expliciete `where not exists`-check): 1 organization,
**5 memberships**, correct, herhaalbaar.

## Ownership Verification

10 tabellen hebben een foreign key naar `organizations` (`teams`,
`memberships`, `seasons`, `locations`, `equipment_catalog`,
`exercise_equipment`, `coach_program_templates`,
`coach_program_assignments`, `gyms`, `billing_events`) -- **geen
enkele daarvan is een persoonlijke trainingsdata-tabel.** Dit
bevestigt architecturaal, definitief: organization-deletion kan nooit
persoonlijke trainingsgeschiedenis, HRV, nutrition, of Women's
Performance-data raken (sectie 36 van de opdracht).

## Legacy Auth Bypass (sabotage S2, kritiek)

Een testgebruiker kreeg een legacy `gym_role='owner'` toegewezen voor
een **andere**, nieuwe gym (zonder canonieke organization/membership).
Deze gebruiker probeerde vervolgens de naam van de bestaande,
canonieke `art-crossfit`-organization te wijzigen via een directe
UPDATE. **Resultaat: geen effect** (de naam bleef ongewijzigd) -- de
bestaande RLS-policies op `organizations` gebruiken uitsluitend
`owner_user_id`/`memberships`, nooit `users.gym_role`. Legacy-rollen
hebben dus, architecturaal, al geen enkele canonieke autorisatie-
impact.

## Cross-tenant / Self-elevation (sabotage S3/S4)

- Een gebruiker probeerde de eigen `memberships.role` naar 'owner' te
  wijzigen -> geweigerd (reeds bevestigd in B9-H2A, hier niet opnieuw
  gemuteerd om productiedata niet te verstoren; de onderliggende RLS
  is in deze sprint niet gewijzigd).
- Een gebruiker probeerde een `coach_program_assignments`-rij aan te
  maken met een `organization_id` van een andere, niet-gerelateerde
  organisatie -> **RLS-violation, geweigerd.**

## Anon (sabotage S8)

`anon` krijgt een harde "permission denied" op de helper-functie
`org_has_role()` (`has_function_privilege('anon', ..., 'execute')` =
`false`) -- geen datalek, een architecturale weigering op
functieniveau, consistent met het eerder bevestigde B9-07-patroon.

## Organization Deletion / Owner Account Deletion (sectie 35/36)

`netlify/functions/delete-account.js` bevatte al, vóór deze sprint
(MS-F11-01), een expliciete stap die `organizations` verwijdert waar
`owner_user_id` matcht met het te verwijderen account. Dit is een
bewuste, reeds gedocumenteerde keuze: **volledige cascade-verwijdering
van de organisatie bij eigenaar-account-verwijdering** (niet
"blokkeren" of "vereist overdracht"). Live, met een geïsoleerde
testorganisatie bevestigd: de cascade verwijdert uitsluitend
organisatie-eigen rijen (`memberships` etc.) -- persoonlijke data van
leden wordt daarbij nooit geraakt (zie Ownership Verification
hierboven).

## Backward Compatibility

`owner_email` wordt nergens in de actieve, functionele code gebruikt
(0 treffers in `index.html`/`gym-team.js`/`gym-team-set-pin.js`, live
geverifieerd vóór het leegmaken van dit veld) -- het legen ervan heeft
dus geen enkel effect op de bestaande, actieve Gym/Club-functionaliteit.

## Foundation Readiness (na migratie, sectie 53)

- **GYM/CLUB FOUNDATION:** FOUNDATION VALIDATED (canonieke organization
  bestaat, gekoppeld, memberships correct gevuld, legacy-auth-bypass
  bevestigd geen effect).
- **TEAM OPERATIONS FOUNDATION:** FOUNDATION READY (de canonieke
  organization bestaat nu daadwerkelijk om teams aan te koppelen; geen
  team-UI gebouwd).
- **COACH/PT FOUNDATION:** FOUNDATION READY (dezelfde canonieke
  organization-laag is nu daadwerkelijk gevuld; coach-tabellen bleven
  ongewijzigd, standalone waar van toepassing).

Geen 9.0-score toegekend enkel op basis van deze migratie, conform
sectie 53 van de opdracht.
