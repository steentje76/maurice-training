# MS-F13-03_PERFORMANCE_ARCHITECTURE.md — Trainingskompas

**Baseline main SHA:** `13353ded665e0c80c0281fa2dacb52f18df9bcbc`. Datum: 30 augustus 2026.

## Metingen (eerst, conform de opdracht "meet eerst, geen willekeurige optimalisaties")

- `index.html`: 26.640 regels, 4.366.907 bytes (~4,17 MB) ongecomprimeerd.
- Daarvan **206 ingebedde `image/webp;base64`-data-URI's, samen ~1,86 MB** (44% van het bestand) — dit zijn de poster-thumbnails in de bestaande `EX_CATALOG`-oefeningendataset (206 oefeningen, bevestigd consistent met de bekende MoveKit-catalogusomvang).
- Startup-flow (`startAppAfterAuth()`): reeds volledig parallel/non-blocking. Geen enkele van `refreshHome()`, `ensureExercisesLoaded()`, `ensureEquipmentTypesLoaded()`, `syncAtleetFromSupabase()`, `syncCustomTrainingsFromSupabase()`, `checkTeamAccess()`, `OrganizationContextRuntime.initOrganizationContext()`, `refreshMijnAbonnementCard()` wordt ge-`await`ed vóór de volgende — ze lopen gelijktijdig.
- `ensureExercisesLoaded()`/soortgelijke "ensure"-functies: hebben al een dubbele bescherming tegen duplicate netwerkaanroepen (`if(exercises.length)return`-cache-check + `if(_exercisesLoading)return _exercisesLoading`-in-flight-lock). Geen N+1-patroon gevonden in de startup-flow.
- Service worker (`sw.js`): heeft al een precache-strategie die `/index.html` en alle `core/*.js`-bestanden bij install cachet — een **terugkerende** gebruiker downloadt de 4,17 MB dus niet opnieuw bij elke bezoek, alleen bij een daadwerkelijke versie-update (`CACHE_NAME`-bump).

## Geïdentificeerde, bewezen bottleneck
De 206 ingebedde poster-thumbnails vormen de grootste, eenduidig aanwijsbare bijdrage aan de **eerste, koude load** (nieuwe gebruiker, of na een cache-clear/versie-update): 1,86 MB van de 4,17 MB moet gedownload en geparsed worden vóórdat de app interactief is, ongeacht of de gebruiker ooit het oefeningenscherm opent.

## Expliciete beslissing: GEEN extractie in deze sprint
Het verplaatsen van de 206 poster-thumbnails naar een apart, lui geladen bestand (of Supabase Storage-URL's) zou de eerste-load-omvang met ~44% kunnen verminderen, maar dit is een **substantiële, risicovolle structurele wijziging**: de posters worden gebruikt in het oefeningenscherm, de oefening-detailpagina, de builder, en mogelijk andere, niet-triviaal te inventariseren plekken in een bestand van 26.640 regels. Conform de expliciete instructie "optimaliseer alleen bewezen bottlenecks, bewaar correctness boven microperformance" wordt deze extractie **niet** binnen deze sprint uitgevoerd — het risico op regressie in een kernflow (oefeningen bekijken/kiezen) weegt niet op tegen de winst binnen een sprint die primair "meet en documenteer" als doel heeft. Dit wordt vastgelegd als een expliciete, toekomstige, eigen-toegewijde optimalisatiesprint (zie Open Gaps), niet stilzwijgend genegeerd.

## Wat wél is gedaan: een performance-budget-regressietest
Om te voorkomen dat de omvang van `index.html` ongemerkt verder groeit zonder dat iemand dit expliciet afweegt, is een nieuwe test toegevoegd die de huidige, gemeten omvang vastlegt als een budget met ruimte voor normale groei, en faalt bij een abnormale sprong (bijvoorbeeld een toekomstige, per ongeluk opnieuw ingebedde grote asset).

## Overige gecontroleerde domeinen (geen bottleneck gevonden)
- Dashboard/analytics/AI/teams/social/billing/auth: geen van deze roept synchroon-blokkerende, sequentiële Supabase-calls aan tijdens de kritieke opstartpad — alles loopt via het bestaande, non-blocking `startAppAfterAuth()`-patroon of wordt pas opgehaald bij het daadwerkelijk openen van het betreffende scherm.
- Geen duplicate-query-patroon gevonden in de nieuwe MS-F12-serie (entitlements/billing) — `loadCommercialCatalog()`/`loadCommercialActor()` worden alleen aangeroepen bij `refreshMijnAbonnementCard()`/`openPlanOverzicht()`, niet herhaald.

## Open gap (non-blocking, expliciet geregistreerd)
Toekomstige, eigen sprint: extractie van de 206 poster-thumbnails naar lui geladen assets (Supabase Storage-URL's, consistent met het bestaande `exercise-media`-storage-patroon dat al voor video's/posters van MoveKit wordt gebruikt) — vereist een volledige inventarisatie van elke gebruiksplek en regressietests voor het gehele oefeningenscherm vóór uitvoering.
