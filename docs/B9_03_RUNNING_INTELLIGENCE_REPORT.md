# B9-03 Running Intelligence — Eindrapport

**Rol-erkenning:** geen benchmarkscore toegekend, dat blijft
voorbehouden aan de onafhankelijke Benchmark 9.0-eigenaar.

**START SHA:** `0ec4d2637b962e9f2e9d30e39b8e3a34029749d7`
**APP_VER voor/na:** v4.69.35 / v4.69.36
**Migration(s):** `migratie_v534.sql`

## Existing-state audit

| Onderdeel | Classificatie |
|---|---|
| `ProgressionCore.trendBy()`/`comparableHistory()` | **CANONICAL**, direct hergebruikt |
| `TrainingLoadCore.sessionLoadSRPE()`/`rollingLoadSum()` | **CANONICAL**, direct hergebruikt |
| `CardioCore.criticalSpeed()`/`splitFromDistTime()` | **CANONICAL**, hergebruikt |
| HR-zone-berekening | **NOT IMPLEMENTED** (bevestigd, blijft zo) |
| TRIMP/aerobic decoupling | **NOT IMPLEMENTED** (bevestigd, blijft zo) |
| AI Coach-context voor Running | **NOT IMPLEMENTED** -- geen bestaand contextobject om te auditen |

## New calculations

CALC-RUN-WEEKLY-001, CALC-RUN-DISTBAND-001, CALC-RUN-CONSIST-001,
CALC-RUN-CSELIG-001 -- volledig geregistreerd in
`docs/CALCULATION_REGISTRY.md` met alle verplichte velden.

## Evidence

Consistency: Evidence Level E (technisch/afgeleid, expliciet geen
performance-voorspelling). De overige drie nieuwe items zijn
aggregatie-/filter-bouwstenen zonder eigen sportwetenschappelijke
claim (consistent behandeld als CALC-GUARD-001 uit een eerdere sprint).
Geen nieuwe, externe wetenschappelijke bron nodig -- geen nieuwe
sportwetenschappelijke claim wordt gedaan.

## Weekly volume

`weeklyVolume()`: aggregeert `activities` per kalenderweek (maandag-
start, UTC). Getest: correcte scheiding tussen weken, geen fabricage
bij een ontbrekende/ongeldige datum, correcte weekgrens rond
maandag 00:00 UTC.

## Pace trend

Appels-met-appels via `distanceBandKey()` (<5km/5-10km/10-15km/15km+)
als groeperings-`key` voor `ProgressionCore.trendBy()`. Een 5km-tempo-
run wordt nooit vergeleken met een 25km-duurloop. Bij minder dan 3
vergelijkbare runs binnen een band: expliciet "Nog onvoldoende
gegevens", geen prestatieclaim.

## Consistency

Aantal actieve weken (>=1 activiteit) binnen de laatste 8 weken.
Evidence Level E, expliciete UI-disclaimer dat dit niets over
verwachte prestaties zegt.

## Critical Speed

Nieuw: `is_max_effort`-kolom (opt-in checkbox in de finish-flow,
standaard uit). `criticalSpeedEligiblePerformances()` filtert
uitsluitend expliciet gemarkeerde activiteiten, minimaal 3 vereist
vóór `CardioCore.criticalSpeed()` wordt aangeroepen. Resultaat toont
`confidence` (van de bestaande, canonieke functie) -- geen eigen,
verzonnen zekerheid.

## Max-effort marking

Checkbox "Was dit een maximale test-/wedstrijdinspanning?", standaard
niet aangevinkt, uitsluitend gelezen uit expliciete gebruikersinvoer
(nooit automatisch afgeleid uit afstand/tijd/pace).

## HR zones

**Bewust niet geimplementeerd.** Geen gevalideerde, universeel
toepasbare formule gevonden/gekozen binnen deze sprint (geen "220-
leeftijd", geen Karvonen zonder formele registratie). UI toont
expliciet "Nog niet beschikbaar (canonieke berekening ontbreekt)".

## TRIMP decision

**Bewust niet geimplementeerd.** Methodologische complexiteit (sex-
specifieke aannames in de klassieke Banister-TRIMP-formule) niet
passend bevonden binnen de beschikbare tijd/scope. sRPE/rolling load
(al bestaand, Foster-methode) is de gekozen, eenvoudigere, beter
onderbouwde loadmetriek voor Running.

## Aerobic decoupling decision

**Bewust niet geimplementeerd.** `activities`/`activity_laps` bevatten
uitsluitend gemiddelde HR per activiteit/lap, geen continue tijdreeks
-- onvoldoende granulariteit voor een valide Pw:HR-decoupling-
berekening. Expliciet als capability-gap gedocumenteerd, niet gedaan
alsof het beschikbaar is.

## Load

Hergebruikt `TrainingLoadCore.sessionLoadSRPE()` (Foster-methode) via
het nieuwe `activities.rpe`-veld. Rolling load getoond wanneer minimaal
één activiteit een ingevulde RPE heeft; anders expliciete "nog geen
RPE ingevuld"-melding. Geen gecombineerde pseudo-score.

## Race goals decision

**Niet gebouwd.** Geen directe, concrete noodzaak vastgesteld voor de
in deze sprint gebouwde functionaliteit (weekly volume/pace-trend/
consistency/CS/load vereisen geen race-goal-model). Blijft een open
punt voor een toekomstige sprint indien productmatig gewenst.

## Analytics UX

Nieuw scherm `s-running-insights` (Training -> Hardlopen -> Inzichten),
bereikbaar via een knop op het Hardlopen-hoofdscherm. Geen nieuwe
bottom-nav-tab (herbruikt de bestaande 5 tabs). Progressive disclosure:
huidige week bovenaan, detail-kaarten eronder. Expliciete empty-state
bij 0 runs.

## Confidence handling

Consistente taal: "Nog onvoldoende gegevens" (trend), expliciete
`confidence`-waarde van Critical Speed (laag/middel/hoog, van de
bestaande, canonieke regressie-fit), geen fake precision.

## Context Engine / Decision Engine

Geen nieuwe Decision Rules toegevoegd in deze sprint (geen concrete,
veilige regel geïdentificeerd die binnen de beschikbare tijd
verantwoord kon worden gebouwd en getest). Context (sport=running)
wordt impliciet gebruikt via de `sport=eq.running`-filter op elke
query.

## AI Coach

Geen bestaande AI-coach-integratie voor Running gevonden om te
auditen of uit te breiden -- niets gebouwd, geen scope-uitbreiding in
deze sprint. Blijft een open punt voor een toekomstige sprint.

## Privacy/security

Geen nieuwe tabellen. Live, adversarial herbevestigd: de nieuwe
`activities.rpe`/`is_max_effort`-kolommen introduceren geen cross-user-
lek (bestaande, B9-01-bewezen RLS dekt dit volledig af op rijniveau).

## Performance

Geen N+1-patroon: `renderRunningInsights()` haalt alle activiteiten in
één query op (limit 500) en berekent alle inzichten client-side uit
die ene dataset -- geen aparte query per grafiek/metric.

## Tests

`core/fRunningIntelligenceCore.test.js` (nieuw, 15/15), `core/
fB9_03RunningIntelligence.test.js` (nieuw, 17/17). Bestaand `core/
fEvidenceClaimAudit.test.js` bijgewerkt (CALC-telling 25->29, Evidence-
E-telling 7->8). Geen regressie op de overige 201 bestaande
testbestanden.

## Sabotage

1. `is_max_effort`-eligibiliteitscheck verwijderd -> gedetecteerd,
   teruggedraaid.
2. Lokale pace-formule geinjecteerd (buiten `CardioCore`) -> **eerste
   poging niet gedetecteerd** door een te smalle, breekbare negatieve
   regex-test. Zelf ontdekt, de test versterkt naar een robuustere,
   positieve check die exact controleert welke functie de pace-waarde
   levert. Tweede sabotagepoging: correct gedetecteerd, teruggedraaid.

## Release gate

**206/206 uitgevoerd, 0 geskipt, 0 gefaald** (was 204, +2 nieuwe
testbestanden).

## Doc consistency

**0 problemen.**

## Open limitations

- HR-zones, TRIMP, aerobic decoupling: bewust niet gebouwd (evidence-/
  data-gaps, eerlijk gecommuniceerd, geen shadow calculation).
- Geen race-goal-model.
- Geen AI-coach-integratie voor Running Intelligence.
- Geen nieuwe Decision Rules.

## FINAL STATUS

**B9-03 RUNNING INTELLIGENCE CLOSED — READY FOR INDEPENDENT BENCHMARK REVIEW**

Alle in sectie 42 (Definition of Done) genoemde, haalbare onderdelen
zijn bewezen: weekly volume, pace-ontwikkeling, consistency, load-
context, Critical Speed (alleen indien valide), confidence/limitations,
en eerlijke, transparante gaps waar evidence/data ontbreekt (HR-
intelligentie, TRIMP, decoupling) in plaats van misleidende conclusies.
