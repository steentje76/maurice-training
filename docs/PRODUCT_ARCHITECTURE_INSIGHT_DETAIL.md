# Trainingskompas — Target Product Architecture: Inzicht

**Status:** PRODUCT OWNER WORKING DETAIL  
**Parent source of truth:** `docs/TRAININGSKOMPAS_TARGET_PRODUCT_ARCHITECTURE.md`  
**Doel:** functionele doelarchitectuur voor `Inzicht` uitwerken vóór UX/mock-ups en implementatie.

## 1. Rol van Inzicht

`Inzicht` beantwoordt drie vragen:

1. Hoe ontwikkel ik mij?
2. Welke patronen/signalen zijn aantoonbaar in mijn data?
3. Welke context is relevant om mijn trainingen en herstel te begrijpen?

Afbakening:

- `Historie` = wat heb ik gedaan?
- `Inzicht` = hoe ontwikkelt dit zich en welke patronen/signalen zijn aantoonbaar?
- `Coach` = wat kan ik hiermee doen binnen toegestane regels?

De huidige productgebieden `Lichaam` en `Voortgang` worden functioneel samengebracht onder `Inzicht`, zonder capabilities te verwijderen.

## 2. Target hoofdstructuur

```text
INZICHT
├── Overzicht
├── Prestaties
├── Herstel
├── Trainingsbelasting
├── Lichaam
├── Trends
├── Verbanden
├── Doelen & programma
├── Women's Performance
├── Voeding
└── Sport-specifiek
```

Niet ieder onderdeel hoeft als permanente subtab zichtbaar te zijn. Dit is de functionele informatiearchitectuur; de uiteindelijke schermnavigatie wordt later met de Product Owner ontworpen.

## 3. Inzicht Overzicht

Het overzicht is een persoonlijke samenvatting, geen dashboard met alle beschikbare metrics tegelijk.

Minimaal relevante blokken:

- huidige trainings-/performance trend
- trainingsconsistentie
- actuele herstel/readiness-samenvatting
- recente trainingsbelasting
- voortgang richting actief doel/programma
- actieve sport-specifieke kernmetrics
- belangrijke veranderingen/signalen
- data quality/confidence indien relevant

Gebruiker moet per blok kunnen doorklikken naar detail.

### 3.1 Personalisatie

Het overzicht mag zich aanpassen aan actieve sporten en doelen. Voorbeelden:

- runner: pace/race/route/performance trend prominent
- cyclist: power/speed/elevation/route trend prominent
- strength athlete: e1RM/volume/exercise progress prominent
- HYROX athlete: run/station/transition trends
- multisport athlete: verdeling en gecombineerde belasting over sporten

Personalisatie mag informatie prioriteren, maar geen kritieke herstel-/veiligheidssignalen verbergen.

## 4. Prestaties

Prestaties is de longitudinale ontwikkellaag boven individuele activiteiten.

Generieke functionaliteit:

- periode kiezen
- sport kiezen
- metric kiezen
- absolute waarden
- verandering over tijd
- persoonlijke records/mijlpalen
- vergelijking met vorige periode
- vergelijking met programmafase
- koppeling naar onderliggende activiteiten

### 4.1 Running

Mogelijke metrics, uitsluitend indien beschikbaar/betrouwbaar:

- pace per afstand/trainingstype
- race performance
- beste prestaties per standaardafstand
- route performance
- splits/laps
- heart rate context
- cadence
- elevation context
- critical speed / relevante calculation output wanneer geregistreerd in Calculation Registry

Nooit automatisch `sneller = fitter` zonder voldoende context.

### 4.2 Cycling

- speed
- power
- cadence
- HR
- elevation
- route/segment performance
- duration/distance
- sport-specifieke power metrics alleen via Calculation Registry

### 4.3 Strength

- load
- sets/reps
- e1RM
- werkelijk uitgevoerde 1RM waar aanwezig
- volume
- frequency
- RPE/RIR
- exercise-specific progress
- spiergroepbelasting waar methodologisch toegestaan

Geschatte e1RM en gemeten 1RM blijven duidelijk onderscheiden.

### 4.4 Swimming

- distance
- pace
- laps
- interval performance
- stroke metrics waar werkelijk beschikbaar
- HR waar beschikbaar

### 4.5 HYROX / Hybrid

- total time
- run segments
- station times
- transitions
- station-specific performance
- repeatability/consistency

### 4.6 Concept2

- distance/time
- pace
- power
- stroke rate/cadence
- splits
- interval performance
- sport-specifieke PRs

## 5. Herstel

Herstel combineert meerdere signalen en toont geen enkel signaal als absolute waarheid.

Mogelijke signalen:

- HRV trend
- resting heart rate trend
- sleep data
- subjectieve recovery/readiness input
- soreness/fatigue waar ingevoerd
- recente training exposure/load
- relevante Women's Performance context indien expliciet geactiveerd

### 5.1 Principes

- HRV is een signaal, geen zelfstandige rustdagbeslisser.
- Missing data wordt niet als normaal/goed/slecht geïnterpreteerd.
- Baselines zijn persoonsgebonden.
- Databron, metric type, kwaliteit en confidence blijven beschikbaar.
- AI herberekent niets.

### 5.2 Herstel-detail

```text
HERSTEL
├── Vandaag
├── Trend
├── HRV
├── Rusthartslag
├── Slaap
├── Subjectieve signalen
├── Recente belasting
└── Bron / datakwaliteit
```

Het scherm moet onderscheid maken tussen een gemeten waarde, baseline-afwijking en een rule-based readiness output.

## 6. Trainingsbelasting

Trainingsbelasting geeft overzicht over belasting door alle sporten heen en daarnaast per sport.

Functionaliteit:

- dagelijkse belasting
- weekbelasting
- rolling periods
- sportverdeling
- planned versus actual exposure
- intensiteitsverdeling waar ondersteund
- sessiefrequentie
- duur/volume
- pieken/veranderingen

ACWR mag indien geregistreerd worden berekend/getoond, maar nooit als harde blessurevoorspeller of universele veilige zone.

### 6.1 Multisport

Een multisport-atleet krijgt één totaalbeeld plus sportuitsplitsing. Een zware krachttraining en lange duurloop mogen niet in volledig gescheiden productwerelden verdwijnen.

## 7. Lichaam

`Lichaam` blijft functioneel aanwezig binnen Inzicht voor persoonlijke lichaams- en meetdata.

Mogelijke onderdelen:

- gewicht
- body composition indien ingevoerd/gemeten
- lichaamsmetingen
- spier-/body map
- spierbelasting/herstel indien methodologisch toegestaan
- persoonlijke fysieke data
- meetgeschiedenis

Geen medische diagnostiek.

### 7.1 Body / muscle map

De bestaande spier/body-map capability blijft behouden, maar wordt een visualisatie binnen Inzicht in plaats van een los hoofdproductgebied.

Mogelijke functies:

- recente spierbelasting
- per spiergroep doorklikken
- relevante oefeningen
- trainingshistorie voor spiergroep
- trend

De visualisatie mag geen nauwkeurigheid suggereren die de onderliggende berekeningen niet ondersteunen.

## 8. Trends

Trends maakt ontwikkeling over langere tijd zichtbaar.

Periodekeuze minimaal:

- 7 dagen
- 4 weken
- 3 maanden
- 6 maanden
- 12 maanden
- custom

Vergelijkingen:

- huidige periode vs vorige periode
- huidige programmafase vs vorige fase
- jaar vs jaar waar voldoende data bestaat

Mogelijke categorieën:

- performance
- training volume
- duration
- frequency
- sport distribution
- recovery
- sleep
- body metrics
- adherence/completion

Gebruiker moet van een trend naar de onderliggende datapunten/activiteiten kunnen navigeren.

## 9. Verbanden

`Verbanden` toont uitsluitend observationele/statistische samenhang die methodologisch ondersteund kan worden.

Voorbeelden van kandidaat-relaties:

- sleep trend ↔ next-day recovery signal
- recent training exposure ↔ recovery trend
- training consistency ↔ performance trend
- sportvolume ↔ sport-specifieke performance
- cycle context ↔ eigen geregistreerde performance/recovery observaties

### 9.1 Harde taalregels

Toegestaan:

- `lijkt samen te hangen met`
- `in jouw gegevens zien we een associatie`
- `trad in dezelfde periode vaker samen op`

Niet toegestaan zonder causal evidence:

- `X veroorzaakt Y`
- `door X werd Y slechter`
- `dit hormoon maakte je prestatie lager`

### 9.2 Minimumvereisten

Een verband vereist minimaal:

- voldoende datapunten
- expliciete calculation/method
- data-quality threshold
- confidence
- beperkingen
- evidence classification

Geen AI-gegenereerde correlaties buiten deze laag.

## 10. Doelen & programma

Inzicht toont ontwikkeling richting doelen en programma's, maar planning blijft onder Trainen.

Mogelijke functionaliteit:

- actief doel
- doelmetric
- huidige feitelijke stand
- trend
- programma week/fase
- completion/adherence
- planned vs actual
- event countdown
- eerdere vergelijkbare programma's

Completion is een feitelijke metric en geen zelfstandig oordeel over trainingskwaliteit.

## 11. Women's Performance

Optionele contextlaag, geen zelfstandige period-trackerpositionering.

Mogelijke onderdelen wanneer gebruiker dit activeert en data invoert:

- cycle context/phase estimate
- symptoms/context
- confidence
- eigen performance/recovery observations
- longitudinale trends
- niet-causale verbanden

Privacy is strikt. Geen automatische sociale/teamdeling.

Pregnancy, postpartum, menopause en contraception blijven afzonderlijke productbeslissingen totdat scope, evidence, privacy en UX expliciet zijn goedgekeurd.

## 12. Voeding binnen Inzicht

Voeding kent twee lagen:

1. invoer/logging
2. context/analyse binnen Inzicht

Mogelijke Inzicht-functionaliteit:

- geregistreerde voedingsmomenten
- timing rondom training
- consistentietrends
- context bij trainingen/herstel waar evidence en Decision Rules dit toelaten

Geen medische voedingsclaims of onbewezen causaliteit.

## 13. Data Quality & Confidence

Inzicht moet onzekerheid zichtbaar kunnen maken zonder de gebruiker met technische details te overladen.

Mogelijke presentatieniveaus:

- hoge datadekking
- gedeeltelijke datadekking
- beperkte data
- geschatte waarde
- bron onbekend/onzeker

Detail kan tonen:

- source/device
- measured/calculated/estimated
- confidence
- ontbrekende inputs

Een grafiek met lage datadekking mag niet visueel dezelfde zekerheid suggereren als een complete meetreeks.

## 14. Verklarende drill-down

Iedere samengestelde insight moet uitlegbaar zijn.

Voorbeeld:

```text
Readiness: lager dan eigen baseline
↓ Waarom?
- HRV trend: lager
- RHR: normaal
- slaap: beperkt beschikbaar
- recente belasting: verhoogd
↓
Bronnen & confidence
```

De gebruiker moet kunnen zien waarop een conclusie of signalering is gebaseerd.

## 15. Alerts versus Insights

Niet ieder datapunt is een melding.

- `Insight` = informatief patroon/trend
- `Signal` = relevante verandering die aandacht kan verdienen
- `Alert` = alleen waar expliciete product/security/safety-regels dat rechtvaardigen

Inzicht mag dus niet notificatie-spam produceren.

## 16. Vergelijken binnen Inzicht

De centrale Comparison Engine wordt hergebruikt.

Mogelijke vergelijking:

- periode ↔ periode
- programmafase ↔ programmafase
- sportseizoen ↔ sportseizoen
- doelblok ↔ vorig doelblok

Vanuit Inzicht kan gebruiker doorklikken naar Historie om individuele activiteiten te vergelijken.

## 17. Privacy en rollen

Eigenaar ziet eigen Inzicht-data.

Menselijke coach/PT krijgt uitsluitend expliciet toegestane scopes. Recovery, HRV, Women's Performance, body data en nutrition mogen niet automatisch onderdeel zijn van coach/team/gym views.

Team/gym dashboards gebruiken alleen daarvoor toegestane, geaggregeerde of expliciet gedeelde data.

## 18. Empty states

Geen verzonnen inzichten bij onvoldoende data.

Voorbeelden:

- `Nog onvoldoende gegevens voor een trend.`
- `Registreer minimaal meerdere sessies om te kunnen vergelijken.`
- `Hartslagdata is voor deze periode niet beschikbaar.`

De app moet uitleggen welke data nodig is zonder een wearable verplicht te maken als handmatige alternatieven bestaan.

## 19. Hidden capabilities onder Inzicht

```text
RAW/CANONICAL DATA
↓
Calculation Engine
↓
Trend / Comparison calculations
↓
Context Engine
↓
Decision Rules
↓
Evidence / Provenance / Data Quality / Confidence
↓
Insight presentation
↓
AI Coach explanation (optioneel)
```

Cross-cutting:

- RLS
- consent
- source provenance
- dedupe
- timezones
- correction history
- observability
- export/delete

## 20. Product acceptance criteria vóór UX-bouw

Inzicht is productarchitectonisch gereed voor schermontwerp wanneer:

1. iedere zichtbare insight terug te voeren is op een calculation/context/decision/evidence bron;
2. Historie, Inzicht en Coach niet dezelfde verantwoordelijkheid dupliceren;
3. sport-specifieke metrics via hetzelfde generieke model kunnen worden toegevoegd;
4. missing/estimated/measured/calculated correct onderscheiden blijven;
5. privacy scopes voor coach/team/gym expliciet zijn;
6. no-wearable gebruik mogelijk blijft waar relevant;
7. empty/error/partial-data states zijn gedefinieerd;
8. Product Owner de inhoudelijke architectuur heeft goedgekeurd.

## 21. Volgende blok

Na Inzicht wordt `Coach` uitgewerkt in twee expliciet gescheiden productwerelden:

- AI Coach
- menselijke Coach/PT

met gedeelde context waar toegestaan, maar verschillende rollen, rechten, communicatie en verantwoordelijkheid.
