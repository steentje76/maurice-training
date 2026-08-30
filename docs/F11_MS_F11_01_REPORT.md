# F11_MS_F11_01_REPORT.md — Trainingskompas

**Canonieke naam/acceptance:** "Organization & Location Core" -- "Tenant/location/staff/member model after RLS gate." P2, dependency MS-F1-01 (CLOSED).

## Baseline-audit
Twee parallelle, niet-geintegreerde organisatiemodellen gevonden: legacy `gyms`/`users.gym_id`/PIN-gebaseerd (actief, enkel-tenant, Maurice's eigen gym) en het nieuwere `organizations`/`memberships`/`teams`/`training_groups` (multi-tenant-klaar, ongebruikt vóór deze sprint). Zie `docs/F11_EXISTING_ORGANIZATION_ARCHITECTURE_AUDIT.md` voor het volledige bewijs. Model B is gekozen als canoniek F11-fundament; Model A blijft bewust, gedocumenteerd, ongewijzigd bestaan.

## Kritieke bevindingen, alle live gevonden en gerepareerd (drie aparte commits/PR's)
1. **PR #150**: `memberships` stond self-role-elevation toe (elke gebruiker kon zichzelf owner maken van elke organisatie, zowel via INSERT als UPDATE). Gerepareerd vóór enige MS-F11-01-implementatie.
2. **Deze PR, deel 1**: het ontbrekende schrijf-fundament (INSERT/UPDATE/DELETE) toegevoegd op organizations/teams/training_groups (die tot dan uitsluitend SELECT hadden). Tijdens het testen bleek dat er ook geen manier bestond om leden te promoveren -- toegevoegd: `memberships_owner_manages_others` (uitsluitend de owner, uitsluitend voor andere leden) en `memberships_select_org_staff` (staff kan de ledenlijst lezen).
3. **Deze PR, deel 2 (Security Completion Gate)**: twee kritieke tenant-escape-bugs gevonden -- een owner van meerdere organisaties kon een lid (of een locatie) van de ene organisatie naar de andere verplaatsen via een simpele UPDATE, zonder toestemming. Gerepareerd met BEFORE UPDATE-triggers die `organization_id`/`user_id`/`team_id` onvoorwaardelijk onveranderlijk maken na aanmaak. Plus een delete-completeness-gat: `organizations.owner_user_id` had geen CASCADE naar `auth.users`.

## Live adversarial matrix (volledig, sectie A t/m E van de Security Completion Gate)
| Scenario | Resultaat |
|---|---|
| Staff A + member B: mag team beheren in A | Bevestigd toegestaan |
| Staff A + member B: mag team NIET beheren in B | Bevestigd geweigerd |
| Owner A: mag memberships in A beheren | Bevestigd toegestaan |
| Owner A: mag memberships in B NIET wijzigen | Bevestigd geweigerd |
| Owner van twee organisaties: kan geen lid verplaatsen tussen ze | Bevestigd geweigerd (na fix) |
| Owner van twee organisaties: kan geen locatie verplaatsen tussen ze | Bevestigd geweigerd (na fix) |
| Verwijderd/removed membership: geen beheertoegang | Bevestigd geweigerd |
| Cross-tenant: geen membership, geen team-aanmaak mogelijk | Bevestigd geweigerd |
| Cross-tenant: organisatie-delete door niet-owner | Bevestigd geweigerd (rij blijft bestaan) |
| Ownership-transfer (owner_user_id wijzigen naar ander) | Bevestigd geweigerd (al door bestaand ontwerp) |
| Legitieme naam/rol-wijziging zonder tenant-ID-verandering | Bevestigd blijft werken |

## Sabotagebewijs
Drie aparte sabotagetests uitgevoerd (self-elevation-check, tenant-identifier-immutability-check, exercise-whitelist elders) -- alle drie exact gedetecteerd en teruggedraaid.

## Eerlijk vastgelegde, niet-blokkerende product-gap
Er bestaat geen mechanisme voor een owner om een ander lid daadwerkelijk te *verwijderen* (DELETE) -- uitsluitend `status='removed'` via UPDATE (bewezen effectief: verliest onmiddellijk alle rechten). Dit is een bewuste, minimale scope-keuze voor het fundament, geen security-gat.

## Legacy-model-isolatie
`gyms`/`users.gym_id`/`gym-team.js` blijft volledig gescheiden en ongewijzigd. Geen enkele autorisatiecontrole combineert beide modellen. Toekomstige migratie/deprecatie is een apart, niet in deze sprint opgelost productpunt (zie audit-document).

## Tests
`core/fOrganizationCore.test.js` (16/16), `core/fOrganizationRls.test.js` (10/10), `core/fTenantIdentifierImmutability.test.js` (10/10), `core/fDeleteAccountSecurity.test.js` (27/27, uitgebreid). Alle relevante met sabotagebewijs.

## MS-F11-01 acceptance-gate-toetsing
Letterlijke acceptance gate: "Tenant/location/staff/member model after RLS gate."
**Resultaat: CLOSED.** Organization CRUD veilig, ownership veilig, membership-rollen veilig, self-elevation en cross-tenant-elevation architecturaal onmogelijk (adversarial bewezen inclusief twee live gevonden en gerepareerde tenant-escape-bugs), multi-org role mixing correct geïsoleerd, teams/training_groups/locations tenant-safe, immutabele tenant-identifiers afgedwongen via triggers, delete/completeness gecontroleerd en gerepareerd, geen USING(true)/WITH CHECK(true)-bypass, SECURITY DEFINER-functies minimaal geprivilegieerd (anon-EXECUTE overal ingetrokken), volledige regressie en sabotagebewijs groen.

## Software-bewijs versus real-world validatie
Dit bewijst dat het autorisatiemodel correct en veilig is. Er is geen UI gebouwd (consistent met F10) -- geen real-world organisatie-workflow-validatie mogelijk binnen deze sprint.
