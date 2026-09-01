# B9-H2A Organization Architecture Decision (ADR)

## Context

Trainingskompas heeft twee parallelle Gym/Club-datamodellen: een ouder
model (`users.gym_id`/`gym_role`, `gyms`) dat daadwerkelijk actief is
in de UI, en een nieuwer model (`organizations`/`teams`/`memberships`)
dat vrijwel geen UI-integratie heeft. Deze ambiguïteit moet worden
opgelost vóór Team Operations en Coach/PT functioneel naar 9+ kunnen
worden gebracht.

## Alternatieven

- **Strategy A (System A canonical):** het `gyms`/`gym_id`-model wordt
  uitgebreid met echte multi-tenancy (meerdere memberships per
  gebruiker, teams, rollen). Vereist een volledig nieuwe membership-
  tabel-structuur -- feitelijk het opnieuw bouwen van wat `memberships`
  al is.
- **Strategy B (System B canonical):** `organizations`/`teams`/
  `memberships` wordt canoniek, `gyms`/`gym_id` wordt volledig
  gemigreerd en daarna verwijderd.
- **Strategy C (controlled consolidation):** `organizations`/`teams`/
  `memberships` wordt de canonieke organisatie-/lidmaatschap-laag.
  `gyms` blijft bestaan als een 1:1-uitbreidingstabel voor product-
  specifieke velden (branding/billing/pincode), gekoppeld via de al
  bestaande `gyms.organization_id`-foreign-key. `users.gym_id`/
  `gym_role` wordt gefaseerd gemigreerd naar `memberships`-rijen.
- **Strategy D (blocked):** geen veilige keuze mogelijk.

## Evidence

1. `gyms.organization_id` heeft al een echte, bestaande foreign-key
   naar `organizations(id)` (`ON DELETE CASCADE`) -- de architectuur
   is dus al eerder, bewust voorbereid op precies deze consolidatie,
   alleen nooit afgemaakt (de ene bestaande gym-rij heeft
   `organization_id = NULL`).
2. `coach_program_assignments.organization_id` en
   `team_events.team_id` verwijzen beide al naar het `organizations`/
   `teams`-model, niet naar `gyms`/`gym_id`. De Coach/PT- en Team
   Operations-infrastructuur is dus al gebouwd bovenop System B.
3. `memberships` heeft een correcte, genormaliseerde structuur
   (`user_id`, `organization_id`, `team_id`, `role`, `status`) die
   multi-tenancy (sectie 10: een gebruiker als athlete in Club A én
   coach in Team A2) al architecturaal ondersteunt. `users.gym_id`
   (een enkele text-kolom op de user-rij) kan dat per constructie
   nooit ondersteunen -- een gebruiker kan er maar één waarde in
   hebben.
4. Live, productiedata-telling: **slechts 1 bestaande gym**
   (ART CrossFit). Het migratierisico is dus minimaal.
5. Live, adversarial bevestigd: self-elevation op `memberships.role`
   wordt correct geweigerd (transactie zonder commit, 0 wijziging).

## Selected Strategy

**Strategy C — Controlled Consolidation.**

## Consequences

- `organizations`/`teams`/`memberships` worden de canonieke bronnen
  voor organisatie, team en lidmaatschap.
- `gyms` blijft bestaan als product-uitbreiding (branding/billing/
  pincode), gekoppeld aan `organizations` via de bestaande FK -- geen
  nieuwe tabel nodig.
- `coach_athlete_relationships` blijft bewust **standalone**
  (bevestigt hypothese C uit sectie 13 van de opdracht): een coach-
  athlete-relatie bestaat onafhankelijk van organisatie-lidmaatschap
  (een coach kan een individuele athlete begeleiden buiten elke
  organisatie om), maar `coach_program_assignments` ondersteunt al
  optioneel een `organization_id` voor organisatie-brede toewijzingen.
- `users.gym_id`/`gym_role` blijft **voorlopig ongewijzigd** in deze
  sprint (geen big-bang migratie, sectie 33/34) -- een toekomstige,
  gefaseerde migratie kan de ene bestaande gym-rij expliciet aan een
  nieuwe `organizations`-rij koppelen via de al bestaande FK, gevolgd
  door het aanmaken van bijbehorende `memberships`-rijen voor de
  huidige gym-leden, en pas daarna het uitfaseren van `users.gym_id`
  als leesbron.
- Geen permanente dual-write: de huidige situatie (System A actief,
  System B grotendeels inactief voor Gym/Club zelf) is een tijdelijke,
  te repareren staat, geen architectuur.

## Migration (toekomstig, niet in deze sprint uitgevoerd)

1. Canonical schema/contract vastgesteld (dit document).
2. Eén bestaande gym-rij expliciet koppelen aan een nieuwe
   `organizations`-rij (kleine, forward-only migratie, minimaal risico
   gezien 1 rij).
3. `memberships`-rijen aanmaken voor bestaande gym-leden (afgeleid van
   `users.gym_id`/`gym_role`).
4. Dual-read-verificatie (beide bronnen tijdelijk vergelijken, geen
   dual-write).
5. UI-laag omschakelen naar `memberships`/`organizations` als
   leesbron (vereist een UX-review voor de betrokken schermen --
   buiten scope van deze architectuursprint).
6. `users.gym_id`/`gym_role` als schrijfbron uitfaseren.
7. Latere cleanup.

## Risks

Zeer laag risico gezien de minimale productiedata (1 gym). Het
belangrijkste risico is het missen van een edge-case in de
gym-leden-lijst tijdens de toekomstige membership-migratie -- te
mitigeren met een expliciete row-count-validatie vóór/na.

## Rollback

Geen destructieve wijziging in deze sprint. Een toekomstige migratie
kan altijd worden teruggedraaid zolang `users.gym_id` niet is
verwijderd (fase 6 hierboven is het punt van geen terugkeer, pas te
zetten na volledige validatie).

## Deprecated model

`users.gym_id`/`gym_role`/`gym_role_level` worden op termijn
gedeprecieerd als schrijfbron, ten gunste van `memberships`. Niet in
deze sprint verwijderd of gewijzigd.
