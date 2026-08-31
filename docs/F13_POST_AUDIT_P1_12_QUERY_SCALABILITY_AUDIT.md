# F13 Post-Audit — P1-12 Query Scalability Audit

## Methode

Conform de opdracht: representatieve volumes gemeten (10.000 sessies),
nooit productiedata vervuild (alle test-inserts binnen een transactie
zonder commit, definitief teruggerold en geverifieerd op 0 restanten).

## Kritieke bevinding: `sessions(user_id, date)` — VERIFIED CLOSED

`sessions` had geen index die `user_id`+`date` combineert -- exact het
querypatroon van Home, History, Progress, en Exercise history (allemaal
gefilterd op de ingelogde gebruiker + een datumvenster).

**Live gemeten** (10.000 testrijen, transactie zonder commit):
- Vóór de index: `Seq Scan`, 2.051ms, 9658 van de 10.000 rijen onnodig
  gescand en weer weggefilterd.
- Na de index: `Index Scan` op `idx_sessions_user_date`, 0.052ms, 0
  onnodig gescande rijen. **~40x sneller.**

Dit schaalt lineair erger naarmate een gebruiker meer trainingsgeschiedenis
opbouwt -- bij 100.000 rijen zou de Seq Scan-variant richting de 20ms
gaan, puur voor deze ene query, uitgevoerd bij elke Home-load.

**Fix** (`migratie_v529.sql`): `create index idx_sessions_user_date on
sessions(user_id, date desc)`. Live geverifieerd op de ECHTE, huidige
productiedata (niet alleen de testset): `EXPLAIN ANALYZE` op de
Home-achtige query toont nu `Index Scan`.

## 15 unindexed foreign keys — VERIFIED CLOSED

Geïnventariseerd via `information_schema` vergeleken met `pg_indexes`
(dicht bij de 18 uit de oorspronkelijke audit -- een klein aantal was
kennelijk al gedekt door een latere sprint). Vooral multi-tenant-tabellen
(`organization_id`/gym-gerelateerd). Lagere queryfrequentie dan
`sessions`, maar relevant voor JOIN-performance en CASCADE-deletes
naarmate het aantal organisaties/gyms groeit. Alle 15 toegevoegd als
standaard, laag-risico indexen (`migratie_v529.sql`) -- geen
gedragswijziging, uitsluitend prestatiewinst.

## `select=*` in `sbGet()` — ONDERZOCHT, BEWUST NIET GEWIJZIGD (proportionaliteit)

`sbGet()` (index.html, de centrale, meest gebruikte ophaalfunctie voor
tientallen tabellen) gebruikt altijd `select=*`. Een volledige omzetting
naar expliciete kolom-selecties zou honderden individuele aanroeppunten
moeten controleren op welke velden daadwerkelijk gebruikt worden --
een omvangrijke, risicovolle refactor die de proportie van deze
sprint te boven gaat (vergelijkbaar met de door de opdracht zelf erkende
noodzaak om P1-10 als "ARCHITECTURE READY" te classificeren in plaats
van volledig te bouwen). Niet gewijzigd in deze sprint; expliciet
vastgelegd als bekende, resterende optimalisatiekans, geen
verborgen/genegeerde bevinding.

## Onbegrensde queries zonder `limit` — GEDEELTELIJK ONDERZOCHT

De meeste `sbGet('sessions', ...)`-aanroepen hebben al een expliciete
`limit` (30/60/90/300/400/2000). Een klein aantal (goal-voortgangs-
berekeningen, regel ~9661/9666/9675) heeft bewust geen limit -- deze
hebben een volledige, nauwkeurige som/telling nodig voor een correcte
doelberekening; een limit zou de berekening zelf incorrect maken. Geen
wijziging: dit is functioneel correct gedrag, geen onbedoelde
onbegrensdheid. Een volledige, systematische audit van alle honderden
`sbGet()`-aanroepen op limit-noodzaak valt buiten de proportie van deze
sprint.

## Regressietest

`core/fPerformanceBudget.test.js` (bestaande MS-F13-03-testsuite,
uitgebreid met sectie D): bevestigt dat de kritieke index en alle 15
foreign-key-indexen in de repo-migratie staan, en dat de Home-
dashboardquery een expliciete limit behoudt.
