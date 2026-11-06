# TK #603 — brongetypeerde leesroutes (6 november 2026)

**STATUS: STAGED / DRAFT — geen productieactivatie.** Werk op `fix/tk603-catalog-shadow-20261106`, gestapeld op PR #602 via concept-PR #604.

## Oorzaak

Een door de toekomstige getypeerde FK-keten vastgelegde Movekit-sessie krijgt in `public.sessions.exercise_id` de gereserveerde `TKC-000001..TKC-000582` identiteit. Bestaande persoonlijke oefeningen kunnen `TK-000001..` heten; naam en TK-nummer zijn **geen** bewijs van Movekit. Oorspronkelijke leesroutes vroegen `exercise_id=eq.TK-...` op en konden daardoor een persoonlijke oefening als Movekit-basis weergeven of nieuwe getypeerde resultaten missen.

## Gerealiseerde beperkte codeaanpassingen

- `tk603ReadExerciseSessions(exId,sourceRef,querySuffix)` hergebruikt uitsluitend de bestaande `sbGet('sessions')` en de bestaande geauthenticeerde `tk504VerifySessionBinding` RPC. Bij *expliciete, valide* canonieke provenance wordt de EXACTE servergecontroleerde `TKC-` FK gelezen. Na het ophalen blijven uitsluitend rijen met die FK behouden. Eigenaar wordt vóór én na de asynchrone calls gecontroleerd. Ongeldige, ontbrekende of vervallen toestemming geeft **geen** terugval naar persoonlijke TK-data.
- Oefeningkiezers 'Recent gebruikt' tonen bij ingeschakelde typed mode afzonderlijke `catalog:TK-...` en `legacy:TK-...` keuzes. Het cataloguslabel volgt alleen uit de reeds aanwezige `tk504_historical_catalog_id` server-RPC die vaststelt dat deze sporter een eigen getypeerde sessie bezit. Inactieve of niet-bestaande cataloguspublicaties worden niet geraden. Andere aanroepers van `getRecentExerciseIds()` houden hun bestaande gedrag; geen verborgen generatieve trainingswijziging.
- `loadStrengthBasis(eid,sourceRef)` blijft exact de bestaande `CalcCore.selectStrengthBasis` (CALC-STR-006) gebruiken. Bij geldig catalogusverband komt de dataset uitsluitend uit de getypeerde bron en wordt deze in de eigenaar- en brongebonden sleutel `strengthBasisCache['catalog:'+owner+':'+id]` bewaard. De eerdere persoonlijke `strengthBasisCache[id]` en `estOneRMCache[id]` blijven onaangeroerd.
- `canonicalNewExerciseItem` krijgt bij **aanmaken/toevoegen, vervangen en eenmalig omwisselen** de werkelijk gekozen `tk504_catalog_ref` door. Het bestaande `resolveWorkingWeight` gebruikt in brongetypeerde modus uitsluitend de door CALC-STR-006 bevestigde basis, nooit een ongerelateerde handmatige personal-1RM of rep-PR. Ontbrekende basis levert `null`/no-base, niet een gegokt gewicht. Het deterministische Calculation/Decision-model en de wetenschappelijke status worden niet gewijzigd.
- De bestaande `buildResolvedExecutionItems()` toont bij toekomstige getypeerde vrijgave alleen canonieke Movekit-metadata en video/poster als het specifieke Preview-item een geverifieerde `tk504_catalog_ref` bezit. Eenzelfde `TK-` ID zonder bronbewijs behoudt zijn persoonlijke/ruwe uitvoering zonder beschermde leveranciersmedia. De oude catalog-first werking blijft intact zolang de vlag UIT staat.
- Alle paden achter `TK504_TYPED_FK_SESSION_RELEASE=false` behouden hun huidige legacy-gedrag. Geen gewijzigde productie-RLS, migraties, mediarechten of logging-writer.

## Reproduceerbare tests

```sh
node core/tk603TypedReadProjection.test.js
node core/tk603RecentPickerCollisionUi.test.js
node core/tk603ExecutionMediaProvenance.test.js
node core/fStrengthBasisSelection.test.js
node core/fExerciseSwapPrescriptionWeight.test.js
node core/tk504TypedFkSessionWriteGate.test.js
```

Getoetst met de **echte functies uit `index.html`** (synthetische account- en API-stubs): same-ID persoonlijk versus catalogus, vervalste provider, offline, geen RPC-bevestiging, eigenaarwissel tijdens RPC en tijdens sessiequery, terugkerende foutieve FK, brongetypeerde recents/filter/render en unieke recency/e1RM-cache. Foutpaden geven geen foutief samengevoegde dataset. Geen productie- of echte accounts aangesproken.

## Nog niet klaar — releaseblokker blijft

1. **Preview en programma's met oudere onbewezen definitie-items** geven soms slechts een bare `TK-` ID door, zonder expliciet `tk504_catalog_ref`. Deze mogen bij typed-release niet worden gekoppeld aan een persoonlijke prestatie; de hele Preview/Programma-execution keten moet daarom nog end-to-end provenance-dragen en getest worden.
2. **Rep-PR, alle grafieken, langetermijnprogressie en AI-coach-context** gebruiken meer leesroutes met een kale `exercise_id`. Deze moeten vóór vrijgave brongetypeerd worden gekoppeld; geen globale prefixherschrijving of samenvoegen met persoonlijke records.
3. Historische typed sessies blijven via het bestaande eigenaar-gecontroleerde historiebeeld zichtbaar na intrekking, maar de performance-reader verlangt een **actieve** getypeerde binding. Toon geen PR/coachadvies als die bevestiging ontbreekt.
4. Twee echte onafhankelijke Supabase Auth JWT's, productie-schemacontract in geïsoleerde acceptatie, herstart/queue/RLS, Android/WebView en signed-media/licentie/cutover blijven onafgehandeld.

**Besluit:** #603 blijft P1 OPEN, #602 en #604 blijven Draft, alle releaseflags FALSE, geen merge/productie-/APK-stap.
