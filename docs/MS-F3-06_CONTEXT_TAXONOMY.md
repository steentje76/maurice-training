# MS-F3-06_CONTEXT_TAXONOMY.md — Trainingskompas

**Auditmethode:** volledige lezing van `core/contextEngine.js` en `buildCtx()` (index.html), de daadwerkelijke, actief-aangeroepen context-samensteller voor de AI-coachprompt.

## Kernbevinding: structurele Context Engine is nu runtime-bedraad
`ContextEngineCore` wordt door `index.html` geladen en `buildCtx()` roept `ContextEngineCore.buildStructuredContext()` daadwerkelijk aan. De resulterende `sport.id`/`sport.label` worden gebruikt voor het bestaande actieve-sportblok in de AI-coachcontext. `buildCtx()` blijft de orchestrator voor data-ophaalacties en domeinspecifieke context; ContextEngineCore blijft puur en rekent of beslist niets. Dit sluit de technische oorzaak van GAP-P2-014.

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
`core/fContextContract.test.js` (18/18): functionele bevestiging dat `ContextEngineCore` niets berekent, als productiescript geladen wordt, vanuit `buildCtx()` wordt aangeroepen, dat de resulterende sportcontext daadwerkelijk wordt geconsumeerd, dat canonieke calculaties gedelegeerd blijven en dat de cruciale AI-grens-instructietekst exact aanwezig blijft.

## MS-F3-06 acceptance-gate-toetsing
Letterlijke acceptance gate (uit het roadmap-doel): *"Canonical context types, provenance and precedence."*
**Resultaat: CLOSED.** Taxonomie, herkomst en versheid blijven vastgelegd; geen calculation-duplicatie; AI-grens bevestigd intact. De technische oorzaak van GAP-P2-014 is op 1 oktober 2026 geïmplementeerd door ContextEngineCore in `buildCtx()` te bedraden; formele `CLOSED_PROVEN`-status volgt pas na exact-head en post-merge Quality Gate-bewijs.
