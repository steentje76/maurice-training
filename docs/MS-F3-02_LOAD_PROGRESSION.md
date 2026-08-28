# MS-F3-02_LOAD_PROGRESSION.md — Trainingskompas

**Auditmethode:** volledige lezing van `core/trainingLoad.js` (ACWR-classificatie, corroboratieregel) en `core/progression.js` (trendanalyse/`isNewBest`), plus repo-brede zoekactie naar sRPE/rolling-load/monotony/strain/stagnatie-signalen.

## Bevinding: bestaande code al goed onderbouwd, met één correctie
`classifyAcwr()` citeerde al Gabbett (2016) in het bestaande code-commentaar. Tijdens deze audit gerichte, formule-specifieke wetenschappelijke verificatie uitgevoerd (sectie 51 van de opdracht: "een algemene review bewijst niet automatisch een specifieke claim"): naast de oorspronkelijke, ondersteunende bron vond ik ook gepubliceerde methodologische kritiek op ACWR zelf — Windt & Gabbett (2018), "mathematical coupling" tussen de acute en chronische component. Op basis hiervan is de evidence-classificatie in de nieuwe formele registry bewust **C** (contextafhankelijk), niet B — een conservatievere classificatie dan de oorspronkelijke bron alleen zou suggereren, conform sectie 6 ("bij twijfel lager classificeren, niet hoger").

## Gevonden, echte lacune: sRPE ontbrak volledig
De acceptance gate van MS-F3-02 noemt sRPE letterlijk ("sRPE/rolling load/progression/stagnation models"). Een repo-brede zoekactie bevestigde: geen enkele sessie-RPE-berekening (Foster-methode: duur × RPE) bestond. `sessions.duration_s` en `sessions.rpe` bleken al aanwezig (live geverifieerd in Supabase — POST-V1 roadmap-item #1 had deze kolommen al toegevoegd). Dit is dus een genuine, roadmap-expliciete, direct-bruikbare lacune, geen kunstmatig verzonnen werk.

**Toegevoegd (minimaal, geciteerd, getest):** `sessionLoadSRPE(durationSec, rpe)` en `rollingLoadSum(srpeValues)` in `core/trainingLoad.js`. Bewust **niet** UI-geïntegreerd of gecombineerd tot een nieuwe eigen ACWR-variant — dat zou een productbeslissing vereisen (een tweede belasting-signaal naast de bestaande, volume-gebaseerde ACWR kan verwarrend zijn zonder doordachte UX). Geregistreerd als GAP-P2-009.

## Bijvangst: service-worker-precache-gap
`core/trainingLoad.js` bleek — in tegenstelling tot `calculation.js`/`progression.js` — niet in de `STATIC_ASSETS`-precache van `sw.js` te staan. Gecorrigeerd (direct relevant, want mijn nieuwe sRPE-functie zou anders offline onbereikbaar zijn). Een bredere, vergelijkbare lacune bij 13 andere `core/*.js`-bestanden gevonden en apart geregistreerd (buiten scope van deze sprint — te brede blast radius voor één gerichte fix).

## Calculation vs Decision — bevestigd correct gescheiden
`trendBy()`/`isNewBest()` (progression.js) zijn pure signalen — ze bepalen zelf nooit "deload nodig" of "stagnatie vereist ingrijpen". Dat blijft exclusief Decision Engine-logica, te formaliseren in MS-F3-07. Dit onderscheid is nu expliciet vastgelegd in de registry en getest.

## Magic number audit
Alle gevonden thresholds (ACWR-banden, corroboratiedrempel "≥2 dalende oefeningen", `trendBy`-`minN=3`) expliciet geclassificeerd — geen onverklaarde critical threshold.

## Duplicate calculation audit
Geen duplicaat gevonden. `AthleteCore.acuteChronic()` (protected core) blijft de enige ACWR-berekening; `TrainingLoadCore` classificeert uitsluitend.

## Nieuw: test
`core/fLoadProgressionRegistry.test.js` (64/64): functionele tests voor de nieuwe sRPE-bouwstenen (golden cases, boundaries, determinisme) + structurele registry-tests + expliciete evidence-inflatie-detectie (CALC-LOAD-001 mag nooit boven C zonder de methodologische kritiek te vermelden). Sabotagebewijs geleverd.

## MS-F3-02 acceptance-gate-toetsing
Letterlijke acceptance gate: *"sRPE/rolling load/progression/stagnation models bounded and versioned."*
**Resultaat: CLOSED.** sRPE nu geïmplementeerd en geregistreerd (bouwsteen-niveau); rolling load (som-bouwsteen) aanwezig; progression/stagnatie-modellen (`trendBy`/`isNewBest`) bevestigd correct begrensd (`minN`, `sufficiency()`) en versioned. UI-integratie van sRPE is bewust apart vervolgwerk (GAP-P2-009), geen blokkerende reden voor PARTIAL.
