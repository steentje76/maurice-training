# F11_MS_F11_02_REPORT.md — Trainingskompas

**Canonieke naam/acceptance:** "Gym Programming & Equipment" -- "Gym templates/equipment/exercise mapping." P2, dependency MS-F11-01 (CLOSED).

## Architectuur
Geen tweede workoutmodel, geen tweede equipment-model. Beide onderdelen hergebruiken bestaande, canonieke structuren met een toegevoegde `organization_id`-kolom, analoog aan het patroon uit MS-F11-01.

## Equipment (deel 1)
`equipment_catalog`/`exercise_equipment` (Model A, legacy gyms) uitgebreid met `organization_id`. Drie mutueel exclusieve eigenaarscontexten (gym/organization/personal), afgedwongen via een CHECK-constraint en een bestaande, uitgebreide trigger.

**Genuine, pre-existing bevindingen** (niet door F11 geintroduceerd): `equipment_catalog_insert` had `WITH CHECK (true)` (geen actieve kwetsbaarheid -- een bestaande trigger doet het echte werk, wel architecturaal inconsistent, gedocumenteerd). `exercise_equipment` had een policy die nooit kon slagen voor gym-context (bevestigd ongebruikt, 0 rijen). Beide gerepareerd/uitgebreid.

**Live gecorrigeerde eigen fout:** de eerste triggerversie gaf altijd voorrang aan Model A zodra die bestond, waardoor Model B onbereikbaar was voor elke gebruiker die al bij een Model-A-gym hoorde. Gecorrigeerd: expliciete organization_id krijgt nu voorrang.

`core/equipmentCore.js` (16/16 tests), `core/fEquipmentRls.test.js` (6/6). Beide met sabotagebewijs.

## Gym Templates (deel 2)
Hergebruikt volledig de bestaande F10-architectuur (`coach_program_templates`/`coach_program_assignments`/`materialize_coach_assignment()`). Een gym-template is een template met `organization_id` gezet. Staff beheert, leden lezen het beschikbare-programma's-overzicht.

**Live gecorrigeerde eigen fout:** de eerste assignment-policy controleerde per ongeluk tweemaal de aanroeper in plaats van de athlete-membership. Direct gecorrigeerd met `org_user_has_role()`.

De bestaande, canonieke materialisatie-RPC is uitgebreid met een organization-tak (athlete-membership-validatie i.p.v. de individuele F10-coach-relatie-check) -- geen tweede RPC, de bestaande F10-flow blijft ongewijzigd.

**Live adversarial geverifieerd:** volledige flow (owner maakt template, wijst toe, lid materialiseert -- `programs.user_id` = het lid zelf, dezelfde trigger-invariant uit F10/GAP-P2-023 blijft intact), cross-tenant-toewijzing aan een niet-lid geweigerd, een gewoon lid kan geen programma toewijzen aan een ander lid, en een reeds gematerialiseerd programma blijft bestaan na verwijdering uit de organisatie.

`core/fGymTemplateRls.test.js` (8/8), met sabotagebewijs.

## Exercise Mapping
`exercise_equipment.exercise_id` blijft ongewijzigd verwijzen naar de bestaande, canonieke Exercise Library. Geen nieuwe exercise-identiteit gefabriceerd.

## Tests
Totaal voor MS-F11-02: 30 nieuwe tests (16+6+8), alle met sabotagebewijs waar relevant. Volledige regressie: 152 uitgevoerd/1 geskipt/0 gefaald.

## MS-F11-02 acceptance-gate-toetsing
Letterlijke acceptance gate: "Gym templates/equipment/exercise mapping."
**Resultaat: CLOSED.** Alle drie onderdelen volledig, adversarial bewezen, geen tweede model gebouwd, twee genuine pre-existing bevindingen gedocumenteerd en gerepareerd, twee eigen implementatiefouten live ontdekt en direct gecorrigeerd vóór enige externe zichtbaarheid.

## Software-bewijs versus real-world validatie
Dit bewijst dat de architectuur correct en veilig is. Geen UI gebouwd (consistent met de rest van F10/F11) -- geen real-world workflow-validatie mogelijk.
