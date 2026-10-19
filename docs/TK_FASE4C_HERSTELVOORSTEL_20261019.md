# Voorstel fase 4C — gecontroleerd en idempotent herstellen (19 oktober 2026)

**Status:** voorstel. Er is niets gebouwd en er wordt niets hersteld zonder een afzonderlijk eigenaarsbesluit.

**Uitgangspunt:** het concept-plan uit fase 4B (`restorepreview.v1`) is de enige invoer. Herstel voert uitsluitend records met status `HERSTELBAAR` uit, na een tweede, verse controle.

## 1. Principes

1. **Per bron, nooit alles tegelijk.**
   - De sporter kiest per bron of hij herstelt: eigen trainingen, Guided Workout-geschiedenis, voorkeuren, wachtrij.
   - Elke bron heeft een eigen journal en een eigen bevestiging.
2. **Accountbinding.**
   - Eigenaar van het bestand = ingelogde gebruiker = `tk_cache_owner_uid`.
   - De binding wordt bij de start vastgelegd en vóór elke write opnieuw gecontroleerd, zoals `tkHuidigeUid() === uid` in de bestaande schrijflaag.
   - Een accountwissel breekt af, zonder schrijfactie daarna.
3. **Alleen additief en idempotent.**
   - Een record dat lokaal ontbreekt wordt toegevoegd. Er wordt nooit iets overschreven of verwijderd.
   - Herhaalde uitvoering heeft geen effect: de sleutel is bron + recordsleutel + vingerafdruk.
4. **Conflictoplossing.**
   - `CONFLICT` wordt nooit automatisch opgelost.
   - Per record kiest de sporter "lokaal houden" (standaard) of "kopie als nieuwe versie". Dat laatste betekent: de training krijgt een nieuwe client-id en de naam "(hersteld)". Zo raakt er nooit iets verloren.
5. **Parent-child.**
   - Volgorde ouder → kind.
   - Een kind wordt pas teruggezet als de ouder na herstel lokaal of op de server aantoonbaar bestaat.
   - Anders blijft het kind in het journal staan als "wacht op ouder".
6. **De wachtrij gaat niet opnieuw afspelen tijdens het herstel.**
   - Teruggezette wachtrij-items gaan via `offlineQueueAdd` met de vastgelegde eigenaar en markering `hersteld:true`.
   - De gewone flush, met de idempotente sleutels (client-id of `on_conflict`), verstuurt ze later.
   - Inserts zonder client-id blijven uitgesloten.

## 2. Hersteljournal en rollback

- **Opslag:** een aparte IndexedDB-database `tk_herstel` (store `journal`). Bestaande databases worden niet gemigreerd.
- **Journal per record:** `run_id`, bron, recordsleutel, eigenaar, vingerafdruk van de kopie, vingerafdruk van de lokale toestand ervoor, status (`gepland`, `geschreven`, `geverifieerd`, `teruggedraaid`), tijdstip.
- **Write-ahead:**
  1. De journalregel `gepland` wordt in een eigen transactie opgeslagen vóór de write.
  2. Daarna volgt de write.
  3. Daarna `geschreven`.
- **Rollback per bron:**
  - Alleen records met status `geschreven` en een lokale toestand die nog gelijk is aan de vingerafdruk ná de write worden teruggedraaid. Bij localStorage gaat het om het verwijderen van het toegevoegde element; bij de wachtrij om het verwijderen van het toegevoegde item.
  - Wijkt de toestand af (de sporter heeft intussen gewerkt), dan geen automatische rollback. Het record wordt gemarkeerd voor handmatige beoordeling.
- **Geen gegevensverlies bij mislukking.** Omdat alleen wordt toegevoegd, laat een mislukte of half uitgevoerde herstelactie de bestaande gegevens altijd intact. Rollback haalt alleen eigen toevoegingen weg.

## 3. Onderbreking en hervatten

- Bij de start: is er een journal met `gepland` of `geschreven` zonder `geverifieerd`, dan volgt eerst reconciliatie:
  - `gepland` en de write is aantoonbaar gebeurd (lokale vingerafdruk gelijk aan die van de kopie) → `geschreven`;
  - anders opnieuw proberen.
- De bestaande patronen worden hergebruikt: hervatten per bron zoals de inventaris uit fase 3, en een deterministische sleutel tegen dubbelen.

## 4. Controle van het resultaat

- Na elke bron opnieuw de herstelpreview draaien op hetzelfde bestand. Verwacht: elk teruggezet record is nu `BESTAAT_AL`.
- Een verschil zet de bron op "niet geslaagd"; het journal toont welke records.
- Voor de wachtrij volgt na de flush de read-after-write-verificatie uit fase 2. Alleen `SERVER_VERIFIED` telt als op de server.

## 5. Interface

- Bevestiging per bron met aantallen en voorbeelden (alleen namen of titels die de sporter zelf heeft ingevoerd).
- Een aparte knop "Herstel uitvoeren" die pas na bevestiging en een geslaagde verse preview actief wordt.
- Na afloop een samenvatting en de optie "Terugdraaien" zolang de rollback-voorwaarden gelden.

## 6. Testplan (fase 4C)

- RED/GREEN per principe.
- Onderbreking na elke journalstap.
- Accountwissel tussen de journal en de write.
- Conflictkeuzes.
- Ouder-kindvolgorde.
- Rollback met en zonder tussentijdse wijziging.
- Dubbele uitvoering.
- Echte Chromium-IndexedDB.
- Mutatietests.
- Een fysieke Android-roundtrip zonder bestaande data te wissen, pas na een native opslagroute voor het maken van kopieën (review F2).

## 7. Besluiten vooraf (eigenaar)

1. Welke bronnen in 4C herstelbaar worden. Voorstel: eigen trainingen, Guided Workout-geschiedenis en voorkeuren eerst; de wachtrij later.
2. De conflictstandaard ("lokaal houden").
3. De native opslagroute voor Android: `@capacitor/filesystem` met een share-sheet, of een eigen plugin. Dit vraagt een nieuwe APK.
