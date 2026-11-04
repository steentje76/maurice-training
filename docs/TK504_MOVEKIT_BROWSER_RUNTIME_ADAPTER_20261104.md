# TK504 — Browserklaar Movekit V2-adaptercontract (4 november 2026)

**Status: Draft-PR #598, niet geactiveerd.** Dit werk bevat uitsluitend compatibiliteit van bestaande geïsoleerde modules met de browserruntime en een synthetische integratietest. Het is geen vrijgave van 356 nieuwe oefeningen, geen servergrant en geen uitrol.

## Wat is aangepast

- `core/movekitV2SourceFacets.js` is voortaan zowel vanuit Node/CommonJS als vanuit browser-`<script>` laadbaar. In de browser publiceert de module uitsluitend `MoveKitV2SourceFacets` zonder zelf filters of UI te activeren.
- `core/movekitV2DarkLaunchGate.js` is op dezelfde manier browserklaar onder `MoveKitV2DarkLaunchGate`; de standaardstatus blijft **uitgeschakeld**.
- `core/movekitV2TkCatalogAdapter.js` gebruikt in Node de bestaande CommonJS-dependencies en in de browser de expliciete voorgeschreven dependencies. Als deze ontbreken, weigert `create()` met `MOVEKIT_V2_DEPENDENCIES_NOT_READY`.
- `core/movekitV2BrowserBundle.test.js` gebruikt een echte, uit `index.html` geëxtraheerde `ExerciseCatalogService` in een browserachtige VM **zonder** `module`/`require` en een volledig synthetisch catalogusbestand van 582 identiteiten.

## Veilige toekomstige browserlaadvolgorde

1. `movekitV2SourceFacets.js`
2. `movekitV2ReviewEligibility.js`
3. `movekitV2DarkLaunchGate.js`
4. `movekitV2TkCatalogAdapter.js`

De bestaande `ExerciseCatalogService` moet eerst beschikbaar zijn wanneer een host later `create()` aanroept. De daadwerkelijke browser-app laadt deze vier modules **nog niet**. Geen nieuw script is in `index.html` opgenomen.

## Synthetische controle

De test toetst dat vier browserglobals zonder Node-laadmechanisme kunnen worden gemaakt, ontbrekende dependency's veilig falen, de bestaande zoekmachine samenwerkt met de adapter, de standaard dark launch geen oefeningen toont en een geïnjecteerde **uitsluitend synthetische** grant precies 226 als trainbaar en 356 als niet-trainbaar behoudt, inclusief de exacte bronterm `Forearms`. De synthetische grant bewijst **geen** serverautorisatie.

## Blijvende releasevoorwaarden

De 356 kandidaten, metadata- en terminologievoorstellen blijven ongeaccordeerd. Er is nog geen echte servergebonden releasehandshake naar de normale picker, en er bestaat geen recht om V2-media vanuit dit browsercontract zelfstandig vrij te geven. Ook de eerder gemelde functionele herstelpunten, gezamenlijke UX-acceptatie en Android/PM5-eindcontrole blijven afzonderlijke verplichtingen. Geen Supabase-write, licentieactivatie, `main`-merge, deployment of APK.
