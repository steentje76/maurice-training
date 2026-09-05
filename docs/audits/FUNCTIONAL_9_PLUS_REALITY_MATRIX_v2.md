# Functional >=9 Reality Matrix v2 — drie assen

Vervangt de v1-matrix (blijft bestaan als historisch document, zie
PR-completeness-check). Elke score expliciet gesplitst in:

**A. SOFTWARE MATURITY** (bestaat de code/schema/logica, getest?)
**B. DATA POPULATION / USAGE** (wordt het echt gebruikt?)
**C. EXTERNAL / REAL-WORLD VALIDATION** (buiten software bevestigd?)

Harde regel: 0 database-rijen betekent NIET automatisch B=0 als er
uberhaupt geen schrijf-pad is uitgeprobeerd; maar een tabel met een
bevestigd, werkend schrijf-pad en 0 rijen betekent wel degelijk B=0
(nooit daadwerkelijk gebruikt).

| Domein | A. Software maturity | B. Data population | C. External validation | Notes |
|---|---|---|---|---|
| Training Core | 9 (code+tests+RLS bevestigd) | 9 (103-161 rijen per tabel, actief) | 8 (dagelijks zelf-gebruikt door PO als atleet) | sterkste domein in de app |
| Recovery/Health/Body | 9 | 8 (73 hrv-rijen, 44 weight-rijen) | 7 (eigen wearable-koppeling) | volledige functionele keten eerder bevestigd |
| AI Coach (chat/programming) | 9 (coaching.js: 80/80 tests, coachProgramming.js: 13/13 tests) | 8 (chat_history: 77 rijen) | onbekend (niet extern gevalideerd deze sessie) | duidelijk onderscheiden van Human Coach hieronder |
| Human Coach (relaties/roster/access) | 3 -- code bestaat (coachAccess.js, coachRoster.js, coachProgram.js) maar GEEN test-bestand gevonden, en GEEN enkele aanroep vanuit index.html (0 treffers, bevestigd) | 0 (coach_athlete_relationships: 0 rijen) | 0 | **IMPLEMENTED, NOT TESTED, NOT INTEGRATED** -- dit is de meest precieze classificatie, niet simpelweg "architecture only" |
| Nutrition (macro-logger) | 6 (werkend CRUD-scherm, geen tests gevonden) | 0 (0 rijen) | 0 | zie eerdere audit, ongewijzigd |
| Nutrition (productdatabase/barcode/supplementen) | 0 (geen schema) | 0 | 0 | volledig ontbrekend |
| Samen (connections/groups/challenges backend) | 6 (CRUD-code bevestigd, RLS aan, geen tests gevonden in deze sessie) | 0-1 (vrijwel alle tabellen 0, groups:1) | 0 | geen centraal scherm |
| Samen (messaging) | 0 | 0 | 0 | geen tabel gevonden |
| Periodisering (seasons/macro/meso/microcycles) | 2 -- schema bestaat (RLS aan), maar 0 treffers voor deze tabelnamen in index.html: **geen enkele CRUD/UI-code gevonden**, ook geen apart core-bestand zoals bij Coach | 0 | 0 | zuiverder "ARCHITECTURE ONLY" dan Human Coach -- hier is zelfs geen losse module geschreven |
| Devices/Wearables | 5 (1 echte koppeling, generieke external_connections-laag leeg) | 2 | 2 (1 eigen account) | Concept2 niet apart in deze sessie geverifieerd |
| Commercial/Entitlements | 6 (plan/feature/quota-architectuur compleet) | 0 (transacties: 0 rijen) | 0 | betaalstroom-realiteit onbevestigd |
| Team/Gym/Club (legacy) | 6 (1 organization, 1 gym, 4 memberships -- vermoedelijk PO's eigen testomgeving) | 2 | 2 | canonieke MS-F11-laag (locations/team_events) apart: 0/0/0 |

**Belangrijke correctie t.o.v. v1:** Human Coach kreeg eerder impliciet
een "architecture only"-classificatie die te dicht aanleunde tegen
Periodisering. Nu expliciet onderscheiden: Human Coach heeft wel
degelijk meerdere, doordachte code-modules (~4 bestanden), Periodisering
heeft geen enkele. Beide zijn A<5, maar om verschillende redenen.
