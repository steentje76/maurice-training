# B9-H2B Organization Migration Plan

## Migration Matrix

| Legacy field/object | Canonical target | Migration required | Compatibility required | Deprecation |
|---|---|---|---|---|
| `users.gym_id` | `memberships.organization_id` (via `gyms.organization_id`) | Ja, uitgevoerd | Ja, tijdelijk (compatibility-only, geen authorization meer) | Fase 6, toekomstig |
| `users.gym_role`/`gym_role_level` | `memberships.role` | Ja, uitgevoerd (2 bekende waarden: owner->owner, lid->member) | Ja, tijdelijk (read-only, non-authoritative) | Fase 6, toekomstig |
| `gyms.owner_email` | `organizations.owner_user_id` | Ja, uitgevoerd (geleegd na koppeling, afgedwongen door bestaande `gyms_owner_context_chk`) | Nee (kolom blijft bestaan maar wordt niet meer gebruikt zodra gekoppeld) | Direct na koppeling |
| `gyms.id` (tenant-identiteit) | `organizations.id` (canonieke tenant), `gyms.id` blijft de product-uitbreidingssleutel | Ja, uitgevoerd (deterministisch: `organizations.id = gyms.id`) | Ja (gyms blijft bestaan voor branding/billing) | N.v.t. (blijvend, per B9-H2A) |
| `netlify/functions/gym-team.js` (pincode-auth) | Ongewijzigd -- gebruikt `gyms`/`users.gym_id`, niet direct geraakt | Nee | Ja | Toekomstig, na volledige canonical read-path-omschakeling |

## Migration Steps (uitgevoerd in deze sprint)

1. Voor elke gym zonder `organization_id`: canonieke `organizations`-rij aangemaakt met deterministische id (= gym-id).
2. `gyms.organization_id` gevuld, `gyms.owner_email` geleegd (conform bestaande constraint).
3. Voor elke gebruiker met een bekende `gym_role` ('owner'/'lid'): canonieke `memberships`-rij aangemaakt.

## Zelf gevonden en gerepareerde issues tijdens uitvoering

1. **Type-mismatch:** `users.id` is `text`, `organizations.owner_user_id`/`memberships.user_id` zijn `uuid` -- expliciete `::uuid`-cast toegevoegd.
2. **Trigger blokkeerde legitieme eerste toewijzing:** `prevent_gyms_organization_id_change()` blokkeerde onvoorwaardelijk elke wijziging aan `gyms.organization_id`, ook de eerste (NULL -> waarde). Gecorrigeerd naar: NULL -> waarde toegestaan, waarde -> andere waarde blijft geblokkeerd.
3. **Onbekende constraint `gyms_owner_context_chk`:** vereist dat `owner_email` leeg is zodra `organization_id` gezet is -- bevestigt de architectuurbeslissing zelf als bestaande constraint. `owner_email` wordt daarom expliciet geleegd bij koppeling.
4. **Idempotentie-bug:** `on conflict (user_id, organization_id, team_id)` werkt niet betrouwbaar met `team_id = NULL` (PostgreSQL-standaardgedrag: NULL != NULL in een unique constraint). Live bevestigd: een tweede uitvoering gaf 10 i.p.v. 5 memberships. Vervangen door een expliciete `where not exists`-check.

## Rollback

Geen destructieve wijziging aan bestaande data (uitsluitend nieuwe rijen aangemaakt, `owner_email` geleegd op basis van een reeds bestaande, functioneel ongebruikte kolom). Rollback zou betekenen: de aangemaakte `organizations`/`memberships`-rijen verwijderen en `gyms.organization_id`/`owner_email` terugzetten -- niet uitgevoerd in deze sprint, want de migratie is succesvol en gevalideerd.
