# B9-H2A Data Ownership Matrix

| Data | Personal | Organization | Team | Shared/Derived | Delete behavior |
|---|---|---|---|---|---|
| Athlete profile/workout history | Ja | Nee | Nee | Nee | Blijft bij de gebruiker; verdwijnt uitsluitend bij account-verwijdering, NOOIT bij organisatie-/team-verwijdering |
| Coach notes | Ja (van de coach) | Nee | Nee | Nee | CASCADE op de coach-athlete-relatie zelf (reeds bestaand, B9-07-precedent), nooit op de athlete se eigen trainingsdata |
| Program template | Nee | Ja (eigendom van de coach/organisatie die het maakte) | Nee | Nee | Verdwijnt bij verwijdering van de eigenaar (coach), niet bij verwijdering van een individuele toewijzing |
| Assigned workout (materialized) | Gedeeld (athlete voert uit) | Nee (herkomst: organization/coach) | Nee | Ja | De materialized, uitgevoerde training blijft bij de athlete (personal), de bron-toewijzing (assignment-record) volgt de coach-relatie |
| Team event | Nee | Ja | Ja (het team binnen de organisatie) | Nee | CASCADE bij verwijdering van het team; verwijdering van de organisatie cascadeert naar teams (reeds zo ontworpen via de FK-structuur) |
| Attendance | Gedeeld | Nee | Ja | Ja | Volgt het team-event; persoonlijke aanwezigheidshistorie zelf blijft bij de athlete als eigen trainingslog (indien gekoppeld aan `linked_training_instance_id`) |
| Equipment (organization/location) | Nee | Ja | Nee | Nee | CASCADE bij organisatie-verwijdering |
| Organization settings (branding/billing) | Nee | Ja | Nee | Nee | CASCADE bij organisatie-verwijdering (reeds zo, `gyms.organization_id ON DELETE CASCADE`) |
| Coach-athlete relationship | Gedeeld (beide partijen) | Nee (bewust standalone, zie architectuurbeslissing) | Nee | Nee | CASCADE op beide user_id's (reeds bestaand, B9-07/B9-09-precedent in `delete-account.js`) |

**Kernprincipe, expliciet vastgelegd:** persoonlijke trainingsdata
(workout history, HRV, nutrition, recovery) is en blijft **nooit**
eigendom van een organisatie. Organisatie-verwijdering cascadeert
uitsluitend naar organisatie-eigen data (settings, teams, equipment,
programma-templates) -- nooit naar de persoonlijke geschiedenis van een
individuele sporter.
