# TK #603 — brongetypeerde analytics-leesroutes (7 november 2026)

**STATUS: STAGED / DRAFT.** Branch `fix/tk603-catalog-shadow-20261106`, gestapeld PR #604 boven #602. Geen commit, push, merge, deploy, DB-, credential-, flag-, media- of APK-wijziging door deze stap. `TK504_TYPED_FK_SESSION_RELEASE` en `TK504_PUBLISHED_CATALOG_RELEASE` blijven `false`. Geen formule, writer, RPC of migratie gewijzigd.

**Tests worden door de hoofdagent gedraaid, niet door deze implementatie-agent** (node/npm waren hier niet toegestaan). Stand ronde 1: hoofdagent draaide `core/tk603AnalyticsSourceReads.test.js` → **49 PASS**. Ronde 2 (dit document) is **nog niet uitgevoerd**; resultaten volgen van de hoofdagent, inclusief EOL-herstel van `index.html` en `git diff --check`.

## Ronde 1 (eerder, 49 PASS door hoofdagent)

Rep-PR (`loadRepPRs(id,ref)`), `show1RMChart(id,naam,ref)`, live PR-badge in `logSet`, training-/losse-oefening-prefetch met de ref van het werkelijke item, AI-coach-trends en recente sessies (`tk603ActiveCatalogForTypedFk`, `tk603CatalogCoachSessions`). Persoonlijke `TK-` en catalogus-`TKC-` data worden nooit gecombineerd; intrekking, RPC-fout, offline en eigenaarwissel falen gesloten.

## Ronde 2 — wijzigingen in `index.html`

1. **Eigenaar-isolatie.**
   - `tk603ReadExerciseSessions` legt de eigenaar vast vóór elke await, in zowel de legacy- als de getypeerde tak. Is de eigenaar daarna gewijzigd, dan geeft de functie `[]`.
   - Nieuwe `tk603OwnRows` verwijdert rijen met een expliciet vreemde `user_id`. Rijen zonder `user_id` (smalle select) blijven staan; RLS blijft de autoriteit.
   - `meta.verified` wordt pas gezet na alle controles.
   - `tk603RecentPickerSourceKeys` legt de eigenaar vast vóór de eerste `sbGet`. Zonder eigenaar gaat er geen request uit.
   - Legacy `loadRepPRs` en `loadStrengthBasis` schrijven na een accountwissel geen caches van het vorige account meer.
   - `resetPersonalCacheIfNewDeviceOwner` leegt nu ook `strengthBasisCache` (in place: persoonlijk en `catalog:`-sleutels), de catalogus-statistieken en de kiezer-pool (`invalidateExPickerPool`). Het reset van het live-bronregister blijft behouden.
2. **Geen persoonlijke manual-1RM-terugval voor catalogusgebonden live items.**
   - Nieuwe `tk603LiveOneRM(domKey,order)` en `tk603LiveIsCatalog(domKey)` worden alleen op live call-sites gebruikt: programma-prefill in `renderTrainScreen`, `autoGenerateWarmup`, `getEffectiveKg` (%1RM-modus) en `suggestTopset`. Een catalogusitem krijgt uitsluitend zijn eigen CALC-STR-006-basis, of `null`. Een persoonlijk item houdt de exacte oude precedentie.
   - `buildRmPanel(ex,catalogBound)` toont het manual-1RM-paneel niet voor catalogusitems (het paneel leest én schrijft de persoonlijke 1RM). Beide aanroepers geven de expliciete live bron mee.
   - `estimatedOneRM` is teruggezet naar legacy, zodat Preview en statistieken voor hetzelfde numerieke id niet globaal worden onderdrukt.
   - `strengthBasisProvenance` wordt bij een source-bound resolve al niet aangeroepen (`resolveWorkingWeight`); dat is nu met een test geborgd.
3. **Zichtbare statistieken.** Er is één centrale adapter, `tk603CatalogPerformanceSources()`. Die ontdekt uitsluitend de eigen `TKC-` FK's van de eigenaar en houdt alleen die over die de eigenaar-historie-RPC **én** de actieve binding bevestigen. Er wordt niets afgeleid uit een kale `TK-` id of een naam.
   - De **progressielijst** krijgt aparte catalogusrijen via `tk603CatalogProgressEntries` en `tk603ProgCatalogRowsHtml`. Die gebruiken dezelfde `CalcCore.selectStrengthBasis`-piek, geen persoonlijke PR, geen peakdoel en een trend op de `TKC-` sleutel. Zonder eigen metadata verschijnen ze alleen als er geen filter actief is.
   - De **zichtbare onclick** is `tk603ShowCatalogChart(i)` en roept `show1RMChart(id,label,ref)` aan met de expliciete ref.
   - De **Rep-PR-kaart** toont aparte rijen via `loadRepPRs(id,ref)`.
   - De **PR-tijdlijn** levert aparte events met `exerciseId` `catalog:TK-…`. Week-overzicht en Records-kaart hergebruiken die.
4. **Coach-provenance.** `buildCtx` gebruikt de werkelijke execution-items (`tk603CoachExecutionItems`: `resolvedWorkout` of `TRAIN_CFG`, plus de `sessionExtra` van deze training). Een id dat ergens in de uitvoering een expliciete ref draagt, gaat niet in de persoonlijke query. Canonieke uitvoering valt nooit terug op persoonlijke rijen. Met de vlag UIT blijft de oorspronkelijke `TRAIN_CFG`-query exact staan.

## Tests (geschreven/aangepast, uitvoering door de hoofdagent)

- `core/tk603AnalyticsSourceReads.test.js` is uitgebreid met delen 1–4, op de echte functies. Gedekt zijn:
  - legacy en getypeerde eigenaarwissel;
  - vreemde `user_id` (999 kg) versus rijen zonder `user_id`;
  - recents vóór de eerste await;
  - geen stale cache-writes;
  - echte `resetPersonalCacheIfNewDeviceOwner`;
  - live 1RM: catalogus negeert manual 300 kg, persoonlijk houdt de precedentie, Preview wordt niet onderdrukt;
  - het rm-paneel;
  - adapter, progressierij, zichtbare onclick met ref, Rep-PR-kaart en PR-tijdlijn, waarbij persoonlijk en catalogus met hetzelfde id onderscheidbaar zijn;
  - intrekking, eigenaarwissel en vlag UIT zonder request;
  - coach-execution-items en statische wiring van alle live- en statistiek-aanroepers.
- Expliciete eigenaar-/cache-stubs (geen productieverzwakking) zijn toegevoegd aan `fStrengthBasisSelection`, `fReplacementPrescription`, `fDetrainingPrescriptionPaths` (`tkEigenaarUid`) en `fFase2` (`strengthBasisCache`). `tk603TypedReadProjection` extraheert nu ook `tk603OwnRows`.
- De RED/GREEN-test van de root (`core/tk603OwnerSwitchReadIsolation.test.js`, QA-worktree) en `C:/Steensoft/tk603-night-review-notes-20261107.txt` waren voor deze agent **niet leesbaar** (permissie buiten de worktree). Er is een equivalente dekking geschreven; overdracht en vergelijking liggen bij de root.

Te draaien door de hoofdagent: de bovengenoemde vier tests, `tk603TypedReadProjection`, `tk603RecentPickerCollisionUi`, `tk603ExecutionMediaProvenance`, `fExerciseSwapPrescriptionWeight`, `fVoortgang`, `fContextContract`, `tk504TypedFkSessionWriteGate`, de volledige release-gate, `npm run build:www` en `git diff --check` (na EOL-herstel).

## Echte Auth/PostgREST

Volgens de hoofdagent zijn lokaal 36 echte Auth/PostgREST-checks geslaagd (commit `b2831a3`, runner en rapport van de root). **Gelijkheid met het productieschema is niet aangetoond.** Daar valt ook onder of `like.TKC-*` op `sessions` werkt onder productie-RLS en -indexen.

## Resterende exacte gaten (releaseblokker blijft)

1. Catalogusrijen in de progressielijst hebben geen sport-, type- of spiergroepfilter en geen favoriet- of peakdoelfunctie. Dat is bewust: geen geraden metadata, geen persoonlijke `exercise_goals`.
2. Het post-sessie-trendbericht (`rows`-trend in de afrondingssamenvatting) toont een `TKC-` id als naam. Er is geen samenvoeging, maar ook geen cataloguslabel.
3. `checkColdStart`, `applyPct` en `openPlateCalcForEx` zijn alleen via het manual-1RM-paneel bereikbaar. Dat paneel is verborgen voor catalogusitems, maar de functies zelf blijven persoonlijk.
4. Na een intrekking tonen analytics bewust **geen** catalogusprestaties: een actieve binding is vereist. Of historische zichtbaarheid na intrekking gewenst is, is een productbesluit.
5. Discovery haalt per bezoek aan het statistiekscherm maximaal 1000 `TKC-` rijen en 60 FK's op, zonder memo. Elke weergave verifieert opnieuw (meer RPC's). Prestaties en limieten zijn nog niet gemeten.
6. Open blijven: productieschema-pariteit, Android/WebView, offline/herstart en media/licentie-cutover.

**Besluit:** #603 blijft P1 OPEN, #602 en #604 blijven Draft, alle releaseflags FALSE.
