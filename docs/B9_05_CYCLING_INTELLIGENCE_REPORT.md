# B9-05 Cycling Intelligence — Eindrapport

**Rol-erkenning:** geen benchmarkscore toegekend.

**START SHA:** `b0b60b13c5f7ff345d0dd74b0eb6f321f78b49b6`
**APP_VER voor/na:** v4.69.37 / v4.69.38
**Migration(s):** geen (volledig hergebruik van bestaande activities-kolommen)

## Existing-state audit

`RunningIntelligenceCore.weeklyVolume()`/`consistency()` bevestigd
**CANONICAL, volledig sport-neutraal** -- geen enkele functie-body
bevat een running-specifieke aanname, beide werken al generiek op elke
`activities`-rij. Direct hergebruikt, geen duplicaat gebouwd.
`distanceBandKey()` en de CS-eligibility-functie bleken wel
inhoudelijk sport-specifiek (fietsafstanden zijn 5-10x groter dan
hardloopafstanden; Critical Power gebruikt vermogen, niet
afstand/duur) -- hiervoor is een nieuwe, kleine module gebouwd,
consistent met de B9-04-architectuurles (geen tweede, bijna-identieke
engine voor een echt inhoudelijk verschil, wel voor een puur
naamverschil).

`activities.avg_power_watts`/`avg_cadence_rpm` (B9-01) en
`athlete_endurance_profile.ftp_watts_user_entered` (B9-01) bevestigd
al aanwezig, tot nu toe niet gebruikt. `is_max_effort` (B9-03) bestond
al op schemaniveau maar had nog geen UI-checkbox voor Cycling.

## New calculations

CALC-CYC-SPEEDBAND-001, CALC-CYC-CPELIG-001 -- volledig geregistreerd.
`weeklyVolume()`/`consistency()` expliciet vermeld als hergebruikt,
geen nieuwe registry-entry (zelfde onderliggende calculation als
Running).

## Volume / Speed / Power / Cadence / Consistency

Volume en consistency: identiek hergebruikt van Running. Snelheid:
eigen, fiets-specifieke afstandsbanden (`<20km/20-50km/50-100km/
100km+`), via de bestaande `ProgressionCore.trendBy()`. Vermogen: een
nieuwe trend (Running heeft deze dimensie niet), eveneens via
`trendBy()`, geen band-groepering nodig (vermogen is al genormaliseerd
in watt). Cadans: geen aparte trend gebouwd in deze sprint (geen
directe, concrete productbehoefte vastgesteld binnen de beschikbare
tijd) -- blijft zichtbaar in Ride Detail (B9-04), niet in Insights.

## Consistency

Hergebruikt, ongewijzigd (Evidence Level E).

## FTP

Uitsluitend `ftp_watts_user_entered`, expliciete "door jou ingesteld"-
provenance. Geen canonieke berekening toegevoegd.

## Critical Power

Nieuw: de finish-flow van Cycling had nog geen `is_max_effort`-
checkbox (B9-04-gat, hier gedicht). `criticalPowerEligiblePerformances()`
filtert uitsluitend expliciet gemarkeerde ritten met geldig
`avg_power_watts`, minimaal 3 vereist, vóór
`CardioCore.criticalPower()` wordt aangeroepen. Resultaat toont
`confidence` van de bestaande, canonieke functie.

## Power zones

**Bewust niet geimplementeerd**, zelfde redenering als HR-zones bij
Running: geen gevalideerde, canonieke formule. UI toont expliciet
"nog niet beschikbaar".

## Canonieke FTP-berekening

**Bewust niet geimplementeerd.** Geen "95% van 20-min-power"-
schatting toegevoegd -- FTP blijft uitsluitend user-entered totdat een
formeel, geregistreerd testprotocol wordt gekozen.

## Zelf gevonden en gerepareerd

De Cycling-geschiedenis toonde niet-klikbare, dode lijstitems (geen
`onclick`, geen link naar Ride Detail) -- dezelfde klasse fout als
eerder bij Running (B9-02C). Gecorrigeerd: elk item opent nu zijn
eigen Ride Detail.

## Privacy/security

Geen nieuwe tabellen. Live, adversarial herbevestigd: een geforceerde
lap-koppeling op een cycling-activity door een andere gebruiker wordt
door de bestaande B9-01-RLS correct geweigerd.

## Tests

`core/fCyclingIntelligenceCore.test.js` (nieuw, 7/7), `core/
fB9_05CyclingIntelligence.test.js` (nieuw, 14/14). Bestaand `core/
fEvidenceClaimAudit.test.js` bijgewerkt (CALC-telling 29->31). Geen
regressie op de overige 204 bestaande testbestanden.

## Sabotage

1. `is_max_effort`-eligibiliteitscheck voor Critical Power verwijderd
   -> gedetecteerd, teruggedraaid.
2. Running se afstandsbanden hergebruikt i.p.v. de eigen, fiets-
   specifieke banden -> gedetecteerd, teruggedraaid.

## Release gate

**209/209 uitgevoerd, 0 geskipt, 0 gefaald** (was 207, +2 nieuwe
testbestanden).

## Doc consistency

**0 problemen.**

## Open limitations

Power zones, canonieke FTP-testprotocol-berekening, AI-coach-
integratie voor Cycling -- alle expliciet geregistreerd als open.

## FINAL STATUS

**B9-05 CYCLING INTELLIGENCE CLOSED — READY FOR INDEPENDENT BENCHMARK REVIEW**
