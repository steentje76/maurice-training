# MS-F3-06_CONTEXT_TAXONOMY.md — Trainingskompas

**Auditmethode:** volledige lezing van `core/contextEngine.js` en `buildCtx()` (index.html), de daadwerkelijke, actief-aangeroepen context-samensteller voor de AI-coachprompt.

## Kernbevinding: twee context-systemen, één daadwerkelijk actief
`ContextEngineCore` bevat zijn eigen, expliciete commentaar dat bevestigt: het wordt nergens vanuit `index.html` aangeroepen. `buildCtx()` is de daadwerkelijke, canonieke contextbron. Dit is geen kritiek defect (geen tegenstrijdige waarheid tussen twee actieve bronnen), maar wel een architectuurinconsistentie — geregistreerd als GAP-P2-014.

## Context Field Inventory
Volledige tabel opgesteld in `docs/CONTEXT_CONTRACT.md` met Origin (USER_REPORTED/RAW_SOURCE/CALCULATED/DEVICE/SYSTEM/DERIVED_CONTEXT) en Freshness (daily/slow-changing/session/realtime) per veld, gebaseerd op de daadwerkelijke `buildCtx()`-implementatie.

## Context berekent niets — bevestigd, functioneel getest
`buildCtx()` delegeert consistent aan canonieke calculaties (`hrvDagFactorPersonal`, `TrainingLoadCore.classifyAcwr`/`corroboratedLoadSignal`) — geen enkele herberekening lokaal binnen de contextfunctie zelf. `ContextEngineCore` berekent evenmin iets (`mergeAthleteContexts` telt/dedupliceert alleen). Geen duplicate-calculation-gap in dit domein.

## Belangrijke bevestiging: AI-grens al expliciet in de prompttekst
Het "Live Coach-context"-blok bevat de letterlijke instructie: *"wijzig het advies of het getal niet, vul ontbrekende gegevens niet in en beschrijf geen oorzaak-gevolg."* Dit is precies de AI-boundary die de opdracht vereist (AI mag interpreteren/uitleggen, nooit herberekenen of improviseren) — al aanwezig vóór deze sprint, nu expliciet gedocumenteerd en met een sabotagebewijs vastgelegd zodat deze tekst niet stilzwijgend kan verzwakken.

## No fabricated context — bevestigd
Elk veld in `buildCtx()` toont een expliciete "geen data"-variant in plaats van een geraden default (HRV-referentiefase, sportcontext, trainingscontext).

## Privacy
HRV/RHR/slaap/lichaamscompositie zijn gevoelig; `buildCtx()` wordt uitsluitend voor de eigen-atleet-AI-coachprompt gebruikt, binnen de bestaande, F1-geteste RLS-architectuur.

## Nieuw: test
`core/fContextContract.test.js` (14/14): functionele bevestiging dat `ContextEngineCore` niets berekent, dat `buildCtx()` aan canonieke calculaties delegeert, en dat de cruciale AI-grens-instructietekst exact aanwezig blijft. Sabotagebewijs geleverd (de instructietekst tijdelijk verzwakt, exit 1 bevestigd, teruggedraaid).

## MS-F3-06 acceptance-gate-toetsing
Letterlijke acceptance gate (uit het roadmap-doel): *"Canonical context types, provenance and precedence."*
**Resultaat: CLOSED.** Taxonomie, herkomst en versheid vastgelegd voor de daadwerkelijk actieve contextbron; geen calculation-duplicatie; AI-grens bevestigd intact. GAP-P2-014 (ongebruikte ContextEngineCore) geregistreerd als niet-blokkerend vervolgpunt.
