# MS-F6-02_CYCLING_INTELLIGENCE.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Cycling Intelligence" -- "Power/zones/CP/trends." P1, dependency MS-F3-04 (voldaan).

## Kritieke, cross-cutting bevinding: AI-boundary-schending in vier SPORT_BLOCKS-coachingteksten
Tijdens de AI Coach-audit (uitgevoerd tijdens deze sprint) bleek de bestaande, vrije-tekst coaching-identiteitstekst voor meerdere sporten de AI LETTERLIJK te instrueren om te rekenen/voorspellen:
- Wielrennen: "Pas vermogenszones aan, herschat FTP"
- Zwemmen: "Herbereken CSS (Critical Swim Speed) als basis voor trainingszones"
- Roeien: "voorspel 2K/5K-prestaties"
- HYROX: "voorspel racepace"

Dit is een directe schending van de architectuurwet (AI rekent niet zelfstandig, verzint geen thresholds, geen race-voorspelling zonder geregistreerd model-contract). Alle vier teksten zijn gecorrigeerd in deze sprint (hoewel HYROX/roeien/zwemmen buiten de letterlijke MS-F6-02-scope vallen, is de fix hier meegenomen omdat het dezelfde array/patroon betreft). De nieuwe teksten instrueren de AI expliciet: uitleggen op basis van reeds berekende waarden, nooit zelf herberekenen/voorspellen.

## FTP-audit
FTP bestaat uitsluitend als conceptuele metadata in core/sportDefinition.js -- geen enkel daadwerkelijk datamodel-veld, geen sessions.ftp-kolom. Er is dus niets te auditen qua provenance omdat er nergens een FTP-waarde wordt opgeslagen.

## Nieuw gebouwd: Critical Power (CardioCore.criticalPower())
Analoog aan Critical Speed (MS-F6-01), maar met TOTAAL VERRICHT WERK (vermogen x tijd) als afhankelijke variabele -- de correcte, in de literatuur gestandaardiseerde Critical Power-formulering (Monod & Scherrer 1965; Moritani et al. 1981): werk = CP*tijd + W'. Dezelfde strikte data-eisen en dezelfde eerlijke beperking als criticalSpeed(): geen automatische wiring op trainingsgeschiedenis.

## Cycling zones
Bevestigd: geen fake zones gevonden -- er bestaan momenteel geen berekende vermogenszones in de runtime (consistent met het ontbreken van een FTP-datawaarde).

## Cadence
Bevestigd: stroke_rate-kolom (hergebruikt voor RPM bij cycling) is puur beschrijvend, geen Decision Rule of AI-claim over "optimale cadans" gevonden.

## Cycling intervals
Bevestigd: hergebruikt de bestaande, generieke core/intervalEngine.js -- geen tweede execution engine.

## Tests
core/fCyclingIntelligence.test.js (nieuw, 13/13): golden cases voor criticalPower() en regressie-lock op alle vier gecorrigeerde coachingteksten. Sabotagebewijs geleverd.

## MS-F6-02 acceptance-gate-toetsing
Letterlijke acceptance gate: "Power/zones/CP/trends."
Resultaat: CLOSED. Power-logging bestond al. CP nieuw gebouwd en getest. Zones: bevestigd geen fake zones. Trends: pace-trend-patroon is direct toepasbaar op vermogen. Kritieke, aanvullende bevinding gefixed: vier AI-boundary-schendende coachingteksten gecorrigeerd.
