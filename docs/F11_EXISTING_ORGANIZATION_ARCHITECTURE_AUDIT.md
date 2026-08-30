# F11_EXISTING_ORGANIZATION_ARCHITECTURE_AUDIT.md — Trainingskompas

**Datum:** 30 augustus 2026. Uitgevoerd vóór enige MS-F11-01-implementatie, conform de F11-vrijgave-instructie.

## Kritieke bevinding vooraf (apart gerepareerd, PR #150)
Tijdens deze audit werd een live bevestigde, kritieke self-role-elevation-kwetsbaarheid gevonden in `memberships` (elke gebruiker kon zichzelf owner maken van elke organisatie). Dit is al apart gerepareerd en gemergd vóór deze audit werd afgerond. Zie GAP_ANALYSIS_V2.md (CLOSED GAPS/HISTORICAL) voor het volledige bewijs.

## Twee parallelle, niet-geïntegreerde organisatiemodellen gevonden

### Model A: `gyms` + `users.gym_id`/`gym_role_level` (legacy, actief, enkel-tenant)
| Aspect | Bevinding |
|---|---|
| Tabel | `gyms` (1 rij aanwezig — waarschijnlijk Maurice's eigen ART CrossFit) |
| Ownership | `gyms.owner_email`, geen formele multi-tenant-membership |
| Rolmodel | `users.gym_id` + `users.gym_role_level` (ROLE_LEVEL: lid=0, coach=1, manager=2, owner=3), PIN-gebaseerde autorisatie |
| Runtime | Actief: `netlify/functions/gym-team.js` (list/update_role/audit_log/lookup_teammate), `netlify/functions/gym-team-set-pin.js`, UI-referenties in `index.html` |
| Branding | `gyms` bevat logo_url/primary_color/accent_color/font/app_name — relevant voor MS-F11-05 |
| Commercieel | `gyms.plan_key`/`mollie_customer_id` aanwezig maar **niet in scope voor F11/F12 is niet vrijgegeven** — deze velden blijven ongebruikt/legacy voor nu |
| Multi-org | **Nee** — `users.gym_id` is een enkelvoudige FK, één gebruiker hoort bij hooguit één gym. Exact het patroon waar de F11-instructie voor waarschuwt ("geen globale users.gym_id als enige waarheid als multi-membership nodig is") |
| Beoordeling | **Legacy, blijft ongewijzigd bestaan.** Niet geschikt als basis voor multi-tenant F11 (geen multi-org-ondersteuning, geen granulaire membership-tabel, PIN-gebaseerd i.p.v. RLS-gebaseerd). Niet migreren/verwijderen binnen deze sprint — Maurice's eigen gym gebruikt dit actief. |

### Model B: `organizations`/`memberships`/`teams`/`training_groups`/`seasons`/`macrocycles`/`mesocycles`/`microcycles` (nieuwer, multi-tenant-klaar, ongebruikt)
| Tabel | Kolommen | RLS vóór deze sprint | Rijen |
|---|---|---|---|
| `organizations` | id, name, sport_id, owner_user_id, created_at | Uitsluitend SELECT (member-or-owner) | 0 |
| `memberships` | id, user_id, organization_id, team_id, training_group_id, sport_id, role, status | SELECT/INSERT/UPDATE/DELETE eigen-rij, **self-elevation-bug nu gerepareerd** | 0 |
| `teams` | id, organization_id, name, sport_id, created_at | Uitsluitend SELECT (member-or-org-owner) | 0 |
| `training_groups` | id, team_id, name, created_at | Uitsluitend SELECT (member-or-org-owner) | 0 |
| `seasons` | id, organization_id, name, starts_on, ends_on | Uitsluitend SELECT | 0 |
| `macrocycles`/`mesocycles`/`microcycles` | (niet volledig geaudit, analoog patroon) | Uitsluitend SELECT | 0 |

**Multi-org-ondersteuning:** `memberships` ondersteunt correct één gebruiker in meerdere organisaties/teams/training_groups (aparte rijen per combinatie) — dit is precies het canonieke, multi-tenant-klare model dat de F11-instructie vraagt.

**Locations:** **bestaat nog niet.** Geen enkele tabel voor locaties gevonden. Moet nieuw gebouwd worden in MS-F11-01.

**Ontbrekend fundament (bevestigd, geen aanname):** `organizations`, `teams`, `training_groups`, `seasons` en de cycle-tabellen hebben **uitsluitend SELECT-policies**. Er bestaat geen enkele manier om deze objecten via de normale, geauthenticeerde client-route aan te maken, te wijzigen, of te verwijderen. MS-F1-01 heeft dus uitsluitend de leesbeveiliging (cross-tenant-isolatie) gesloten — het schrijf-fundament (INSERT/UPDATE/DELETE, staff/member-beheer) is de daadwerkelijke scope van MS-F11-01.

## Aanbeveling
Bouw MS-F11-01 voort op **Model B** (`organizations`/`memberships`/`teams`/`training_groups`), conform de expliciete instructie ("Dit bestaande securityfundament moet worden hergebruikt, niet opnieuw ontworpen"). Voeg de ontbrekende INSERT/UPDATE/DELETE-policies toe (rolgebonden: owner/admin kan organisatie-instellingen wijzigen, staff kan teams beheren binnen de eigen organisatie, member heeft alleen leestoegang). Bouw een nieuwe `locations`-tabel. Laat **Model A** (`gyms`/`gym-team.js`) volledig ongewijzigd bestaan als gedocumenteerd, actief legacy-systeem voor Maurice's eigen gym — geen migratie, geen verwijdering, geen samenvoeging binnen deze sprint (buiten scope, risicovol zonder expliciete productbeslissing).

## Legacy `gym_id`-kolommen op andere tabellen
`programs.gym_id`, `custom_trainings.gym_id` bestaan met 0 rijen ingevuld. **`equipment_catalog.gym_id` heeft echter 10 actieve rijen** (Maurice's eigen gym heeft al equipment geregistreerd via Model A) — `exercise_equipment.gym_id` heeft 0 rijen. Deze verwijzen naar `gyms.id` (Model A), niet naar `organizations.id` (Model B). Voor F11 relevant: MS-F11-02 (Gym Programming & Equipment) moet expliciet rekening houden met deze bestaande, actieve equipment-data in Model A — een migratie- of coëxistentiestrategie is nodig, dit is een open ontwerppunt voor MS-F11-02, niet nu opgelost.
