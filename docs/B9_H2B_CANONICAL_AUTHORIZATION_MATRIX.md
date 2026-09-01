# B9-H2B Canonical Authorization Matrix

| Actie | Canonical vereiste | Legacy-invloed |
|---|---|---|
| Organization lezen | `owner_user_id = auth.uid()` OF een `memberships`-rij met `user_id = auth.uid()` | Geen (`gym_role` speelt geen rol) |
| Organization wijzigen/verwijderen | `owner_user_id = auth.uid()` | Geen |
| Membership aanmaken | Server/migratie-only in deze sprint (geen client-aanroepbare invite-flow gebouwd) | Geen |
| Membership.role wijzigen | Geweigerd voor de eigen rij (self-elevation-preventie, B9-H2A live bevestigd) | Geen |
| Coach program assignment aanmaken | `coach_user_id = auth.uid()`, `organization_id` moet (indien ingevuld) bij een geldige, gerelateerde organisatie horen | Geen |
| Team event aanmaken/wijzigen | Team moet bij een geldige organisatie horen (bestaande FK) | Geen |

**Kernprincipe, live bevestigd (sabotage S2):** een gebruiker met een
legacy `gym_role='owner'`-waarde voor eender welke gym heeft **geen**
enkele canonieke autorisatie-impact op `organizations`/`memberships`/
gerelateerde tabellen. Uitsluitend `organizations.owner_user_id` en
`memberships`-rijen bepalen canonieke toegang.
