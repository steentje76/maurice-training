# F13 Post-Audit — P1-06/P1-07/P1-11 Calculation Architecture Audit

## P1-06 (shadow HRV calculations) — herbeoordeling

**Oorspronkelijke bevinding:** `hrvBaseline`/`hrvRollingRecent`/`hrvStPersonal`/`lnRmssd`
staan in `index.html`, niet in `core/calculation.js`.

**Herbeoordeling:** bevestigd dat de code inderdaad in `index.html` staat.
MAAR: dit is géén verborgen "shadow calculation" meer. `docs/CALCULATION_REGISTRY.md`
bevat een volledige, expliciete entry (**CALC-REC-001**) met formule,
`Implementation: index.html`, minimum-datavereisten, evidence level B,
wetenschappelijke bron (Plews et al. 2013, Sports Medicine), limitations,
en expliciet verboden interpretaties. De locatie is dus bewust
gedocumenteerd, niet verzwegen.

**Status: PARTIAL.** De transparantie/documentatie-kant is volledig
opgelost. De architectonische plaatsing (canonieke engine vs. index.html)
is niet gecorrigeerd -- een volledige verplaatsing naar `core/calculation.js`
zou alle aanroeppunten in index.html moeten omzetten naar `CalcCore.*`
en vereist grondige, aparte regressietests op een gezondheidsgerelateerde
berekening. Dit is bewust NIET in deze sprint uitgevoerd (risico van een
subtiele gedragsverandering in een gevoelige berekening weegt zwaarder
dan de architectuurwinst), maar wel hier expliciet als open, laag-risico
architectuurschuld vastgelegd -- geen stille aanname dat dit al klopt.

## P1-07 (HRV baseline model) — herbeoordeling

**Oorspronkelijke bevinding:** "baseline was gemiddelde laatste 35 rijen,
niet werkelijk tijdrollend."

**Herbeoordeling:** de huidige implementatie (`hrvBaseline()`, index.html)
gebruikt al een ECHT tijd-gebaseerd venster: `days = Math.round((ref-rows[0].date)/86400000)`,
met expliciete minimumvereisten (`HRV_BASELINE_MIN_DAYS=14` EN
`HRV_BASELINE_MIN_N=4`), een gefaseerd confidence-model
(`referentie` → `voorlopig` (≥14 dagen) → `volledig` (≥`HRV_BASELINE_FULL_DAYS=28` dagen)),
Ln-RMSSD-transformatie, en een SWC-drempel (0,5×SD, Plews et al.). Dit is
géén vaste "laatste N rijen"-logica meer.

**Status: VERIFIED CLOSED** (eerder opgelost, bevestigd bij deze
herbeoordeling; geen nieuwe code-wijziging nodig). De 28-60-dagensuggestie
uit de oorspronkelijke audit is NIET klakkeloos overgenomen (conform de
opdracht: "Doe eerst actuele wetenschappelijke verificatie") -- de huidige
14/28-dagengrens is al onderbouwd met een specifieke, geciteerde bron.

## P1-11 (Calculation/Evidence registry coverage) — inventory

Alle 25 versioned contract-ID's (`*.v1`) in `core/calculation.js`/
`core/decision.js` geinventariseerd en vergeleken met
`docs/CALCULATION_REGISTRY.md`/`docs/DECISION_RULE_REGISTRY.md`:

| Contract | Geregistreerd? | Classificatie |
|---|---|---|
| `dayfactor.v1`, `recovery.v1`, `recovery_score.v1`, `trend.v1`, `volume.v1`, `warmup.v1`, `working_weight.v1` | Ja | CALCULATION (volledige CALC-entry) |
| `ai_guard.v1` | Nee | CONTRACT/GUARD (AI-veiligheidsgrens, geen zelfstandige, wetenschappelijk onderbouwde calculation -- reeds grondig behandeld onder P1-03) |
| `rounding.v1`/`rounding_increment.v1` | Nee | FORMATTING (triviale afronding, geen wetenschappelijke onderbouwing nodig) |
| `percentage.v1` (`applyPercentage`) | Nee | FORMATTING (triviale rekenkunde: base×pct/100) |
| `readiness_percent.v1` (`readinessPercent`) | Nee | FORMATTING (schaal-conversie van een reeds elders berekende dayFactor, geen nieuwe calculation) |
| `goal.v1` (`calculateGoalProgress`) | Nee | FORMATTING (lineaire voortgangsberekening, geen methodologie) |
| `sleep_unit.v1` (`normalizeSleepHours`/`sleepToHours`) | Nee | FORMATTING (eenheid-conversie) |
| `correlation.v1` | Nee | Vermeld in VERSIONS-object maar nergens als `calculationVersion` daadwerkelijk teruggegeven -- geinventariseerd, geen actief gebruikte calculation gevonden die dit contract retourneert |

**Conclusie**: geen "kunstmatig doel" van 100% dekking nagestreefd
(conform de opdracht). Alle daadwerkelijke, zelfstandige, wetenschappelijk
onderbouwde calculations (24 CALC-entries) zijn al volledig geregistreerd.
De 7 niet-geregistreerde contracten zijn correct geclassificeerd als
triviale formatting/conversie-hulpfuncties of een reeds elders behandelde
AI-guard -- geen registry-lacune, geen code-wijziging nodig.

## rpeMeaning() / dayState() — aanvullende, kleinere scan

`rpeMeaning(rpe)` (index.html): DISPLAY ONLY, een tekstuele labelfunctie
zonder beslissingsgevolg. `dayState(f)`: delegeert al direct naar
`DecisionCore.dayZone(f)` -- correct verwezen naar de canonieke engine,
geen shadow-logica.

## Conclusie

Geen code-wijziging in dit cluster: P1-07 was al opgelost, P1-11 toont
een gezonde, proportionele registry-dekking, en P1-06 is grotendeels
opgelost (transparantie/documentatie volledig, architectonische
plaatsing blijft een bekende, expliciet vastgelegde beperking).
