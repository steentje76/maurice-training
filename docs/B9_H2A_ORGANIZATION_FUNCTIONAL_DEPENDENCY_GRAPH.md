# B9-H2A Organization Functional Dependency Graph

```
organizations (canoniek, id text, owner_user_id)
  ├─ gyms (1:1 product-uitbreiding: branding/billing/pincode, via
  │        gyms.organization_id FK, ON DELETE CASCADE -- reeds bestaand)
  ├─ teams (organizations.id -> teams.organization_id)
  │    └─ team_events (teams.id -> team_events.team_id)
  │         └─ linked_training_instance_id (optionele koppeling naar
  │              de bestaande, canonieke training_instances -- geen
  │              tweede planning-engine)
  └─ memberships (user_id + organization_id + optioneel team_id/role/status
       -- de canonieke multi-tenancy-laag: één gebruiker kan meerdere
       memberships hebben, in meerdere organisaties/teams, met
       verschillende rollen)

coach_athlete_relationships (STANDALONE, geen organization_id --
  bewust: een coach-athlete-relatie bestaat onafhankelijk van
  organisatie-lidmaatschap)
  └─ coach_program_assignments (coach_user_id + athlete_user_id +
       optioneel organization_id -- ondersteunt zowel individuele als
       organisatie-brede toewijzing)
       └─ program_id / template_id / materialized_program_id (bestaande,
            canonieke Workout Builder/Program-infrastructuur -- GEEN
            tweede program-engine)

Equipment: nog te koppelen aan organizations/locations (niet in deze
sprint uitgewerkt, geen bestaande equipment-organization-FK gevonden
binnen de onderzochte scope).

Commercial/Entitlements: gyms.plan_key -> plans.key (reeds bestaand)
-- de entitlement-laag hangt al aan gyms, dus indirect al aan
organizations via de bestaande FK zodra die daadwerkelijk gevuld wordt.
```

**Belangrijkste, bevestigde afhankelijkheid (niet in de oorspronkelijke
hypothese van de opdracht):** de Coach/PT-infrastructuur is al direct
afhankelijk van `organizations`/`teams` (via optionele foreign keys),
niet van `gyms`/`gym_id`. Dit betekent dat de canonicalisatie van
Gym/Club (het daadwerkelijk vullen van `gyms.organization_id`) geen
nieuwe afhankelijkheid creëert voor Coach/Team -- die afhankelijkheid
bestaat al, hij is alleen nog nooit benut.
