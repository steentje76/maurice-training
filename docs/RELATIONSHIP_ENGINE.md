# Relationship Engine — Trainingskompas

> Contract `relationship.v1` · geïntroduceerd in Sprint 19 (v4.41.0) · dit document
> beschrijft de stand na Sprint 23 (v4.45.0).

## Waarom deze laag bestaat

Tot v4.40.0 kende Trainingskompas drie verbanden: slaap↔HRV, slaap↔rusthartslag en
HRV↔rusthartslag. Ze stonden met de hand opgeschreven in `DecisionCore.VERBAND_DEFINITIES`.
Dat werkt bij drie en niet bij dertig. Het aantal mogelijke relaties tussen herstel,
training, prestatie, lichaam en omgeving loopt in de tientallen en groeit mee met elke
nieuwe databron.

De Relationship Engine draait de richting om. Hij kijkt eerst wat er wérkelijk aan data
is, leidt daaruit kandidaatrelaties af, en laat er alleen die door die genoeg data,
genoeg kwaliteit en genoeg spreiding hebben.

**Dit is geen vaste lijst.** Dat is een productbesluit, geen implementatiedetail. De UI
zegt daarom nooit "dit zijn de verbanden van Trainingskompas", maar "dit zijn de
verbanden die we op dit moment in jouw gegevens zien".

## Architectuur

```
RAW DATA
   ↓
DATA QUALITY      DeviceCore.qualifySeries / pairQuality   (dataquality.v1)
   ↓
CALCULATION       CalcCore.spearman                        (correlation.v1)
   ↓
DECISION          DecisionCore.releaseVerband              (verband.v1)
   ↓
RELATIONSHIP      RelationshipCore.discover                (relationship.v1)
   ↓
COACH             CoachingCore.buildIntelligenceContext    (coach_intelligence.v1)
   ↓
UI
```

De Relationship Engine **rekent zelf niets**. Hij correleert niet, keurt geen
meetreeksen en formuleert geen zinnen. Die drie dingen blijven waar ze al waren. Wat
hij toevoegt is de laag die ontbrak tussen "we hebben data" en "dit mag een sporter
zien": inventarisatie, kandidaatvorming, spreidingstoets, betrouwbaarheid, classificatie
en rangschikking.

De rekenlagen worden **ingespoten**, niet geïmporteerd:

```js
RelationshipCore.discover(bronnen, {
  spearman:           CalcCore.spearman,
  pairQuality:        DeviceCore.pairQuality,
  releaseVerband:     DecisionCore.releaseVerband,
  verbandIsCirculair: DecisionCore.verbandIsCirculair
}, opties)
```

Ontbreekt er één, dan levert `discover` `{ok:false, reason:'engines_ontbreken'}` — geen
zelfbedachte uitkomst. Daardoor kan er ook nooit stiekem een tweede correlatie-
implementatie insluipen: er is domweg geen plek waar hij zou passen.

## Datamodel

### Variabelenregister

Elke grootheid die als dagreeks kan bestaan, staat als één regel in
`RelationshipCore.VARIABLE_REGISTRY`. Een nieuwe grootheid is een extra regel, geen
nieuwe code.

| veld | betekenis |
|---|---|
| `key` | sleutel van de dagreeks in het `bronnen`-object |
| `label` / `zinNaam` | naam op de kaart / in lopende tekst |
| `conditie` | hoe "meer hiervan" klinkt wanneer de grootheid de BRON is |
| `noemer` | hoe de grootheid heet wanneer hij het DOEL is |
| `domein` | filtercategorie: `recovery` · `training` · `performance` · `environment` |
| `inputs` | de RUWE invoer waaruit de grootheid volgt — basis van de circulariteitstoets |
| `veld` | sleutel voor het datakwaliteitscontract (`null` bij afgeleide grootheden) |
| `afgeleid` | komt de waarde uit een berekening of uit een meting? |
| `beschikbaarheid` | `nu` (de app kan deze reeks leveren) of `toekomstig` (het register kent hem, er is nog geen bron) |

`beschikbaarheid` is bewust data en geen to-dolijst: zo staat de uitbreidbaarheid in het
model zelf, zonder dat er ooit een reeks verzonnen wordt.

### Het relationship.v1-record

```
relationship_id        source_variable        target_variable
period                 period_days            sample_count
actual_sample_count    minimum_sample_required
sample_tier            nog_nodig
effect                 effect_direction       strength / strength_label
status                 is_patroon             confidence
data_quality           zin / onderbouwing / disclaimer / sterkte_uitleg
calculation_version    decision_version       created_at
```

`created_at` komt binnen via `opts.at`. De engine kent de tijd niet.

## Drempels

| constante | waarde | betekenis |
|---|---|---|
| `REL_MIN_KANDIDAAT` | 10 | onder dit aantal wordt een kandidaat niet eens getoond |
| `REL_MIN_PATROON` | 30 | vanaf hier mag van een patroon gesproken worden |
| `REL_MIN_DISTINCT` | 5 | minimaal aantal verschillende waarden per zijde |
| `REL_MAX_UITSLUIT` | 0,35 | boven dit aandeel uitgesloten dagen: kwaliteit onvoldoende |
| `REL_LAGE_KWALITEIT` | 0,20 | vanaf dit aandeel daalt de betrouwbaarheid één stap |
| `REL_TOON_MAX` | 12 | maximum aantal relaties in één overzicht |

`REL_MIN_PATROON` is **gelijk** aan het bestaande `DecisionCore.VERBAND_MIN_N`. De
discovery-engine verlaagt die productdrempel niet en verzint geen soepeler grens; een
test bewaakt die gelijkheid.

De tiers eronder (`geen` <10, `voorlopig` 10–19, `opkomend` 20–29, `redelijk` 30–49,
`ruim` 50+) bestaan om de sporter te laten zien hoe ver hij is. "Nog 18 dagen te gaan"
is bruikbare informatie; een lege lijst niet.

## Classificatie

| status | betekenis |
|---|---|
| `INSUFFICIENT_DATA` | we weten het niet. Zegt **niets** over of er een verband is |
| `NO_PATTERN` | genoeg data, en er is geen patroon zichtbaar. Dat is een uitkomst, geen leegte |
| `POSSIBLE_PATTERN` | zwakke samenhang (\|r\| 0,10–0,30) |
| `MODERATE_PATTERN` | matige samenhang (\|r\| 0,30–0,50) |
| `STRONG_PATTERN` | sterke samenhang (\|r\| ≥ 0,50) |

Nooit `TRUE`, `FALSE` of `CAUSE`.

Het onderscheid tussen de eerste twee is het hele punt:

```
NIET BESCHIKBAAR        ≠  GEEN VERBAND
ONVOLDOENDE DATA        ≠  GEEN VERBAND
VOLDOENDE DATA, GEEN PATROON  =  GEEN AANGETOOND PATROON
```

De sterktebanden komen **ongewijzigd** uit `DecisionCore.VERBAND_STERKTE` (Cohen 1988).
`classify()` vertaalt alleen; hij bepaalt geen grens. Zou hij dat wel doen, dan had de
app twee sterkteschalen die uit elkaar kunnen lopen.

## Betrouwbaarheid

Sterkte en betrouwbaarheid zijn twee verschillende dingen en worden bewust apart
gehouden. Een sterke samenhang over 31 rommelige dagen is minder te vertrouwen dan een
matige samenhang over 90 schone dagen.

Betrouwbaarheid (`laag` · `gemiddeld` · `hoog`) volgt uit de steekproeftier, verlaagd met
één stap bij beperkte datakwaliteit en altijd `laag` bij onvoldoende kwaliteit.

## Datakwaliteit

Sample count alleen is niet genoeg. Meegewogen worden:

- **ontbrekende en niet-numerieke waarden** — vallen af in `qualifySeries`
- **onmogelijke waarden** — buiten de contractgrenzen per meetsoort
- **uitschieters** — Iglewicz & Hoaglin modified z-score
- **dubbele meetdagen**
- **tijdsverschillen** — alleen dagen waarop beide waarden bestaan tellen mee
- **aandeel uitgesloten dagen** — boven 35% wordt de kandidaat onbruikbaar
- **spreiding** — minstens 5 verschillende waarden per zijde

Die laatste verdient toelichting. Een rangcorrelatie over een reeks die vrijwel stilstaat
is wiskundig geldig en inhoudelijk waardeloos: als je slaap veertig dagen lang 7,5 uur is,
zegt de uitkomst iets over afrondingsruis. Er wordt geteld hoeveel *verschillende* waarden
er zijn, bewust geen standaarddeviatie — die is niet vergelijkbaar tussen ms, uren en kg
zonder per grootheid een drempel te verzinnen.

## Zichtbaarheid en afkapping

`rank()` levert drie dingen naast elkaar:

| veld | betekenis |
|---|---|
| `alle` | elke geëvalueerde kandidaat, ook onder de toondrempel |
| `inAanmerking` | alles boven `REL_MIN_KANDIDAAT`, gerangschikt, **niet afgekapt** |
| `zichtbaar` | de eerste `REL_TOON_MAX` daarvan — exact het eerste stuk van `inAanmerking` |
| `verborgen` | hoeveel er buiten `zichtbaar` vallen |

Tot v4.45.1 las de UI alleen `zichtbaar` en verdwenen de rest zonder melding. De afkapping
blijft bestaan — een scherm met tientallen kaarten leest niemand — maar het overzicht meldt
nu hoeveel er niet getoond worden en de sporter kan ze uitklappen. De engine gooit niets weg.

## Twee toestanden achter INSUFFICIENT_DATA

`INSUFFICIENT_DATA` dekt situaties die voor de sporter verschillend zijn, en die door elkaar
halen is misleidend:

| reden (uit `data_quality.redenen`) | betekenis | teller "nog X te gaan"? |
|---|---|---|
| leeg, `bruikbaar: true` | simpelweg nog te weinig vergelijkbare dagen | ja |
| `te_weinig_variatie_bron/_doel` | genoeg dagen, maar een meting staat vrijwel stil | nee — betekenisloos |
| `te_veel_uitgesloten` | te veel dagen vielen af bij de kwaliteitscontrole | nee |

Voorbeeld uit de praktijk: lichaamsgewicht heeft 35 vergelijkbare dagen met HRV — ruim boven
de drempel van 30 — en levert tóch geen oordeel, omdat de reeks vrijwel constant 106,0 kg is.
"Meer data nodig" zou daar onwaar zijn.

## Geen correlatiespam

Bij twintig beschikbare grootheden zijn er 190 mogelijke paren. Er wordt daarom vroeg
gefilterd, vóórdat er iets gerekend wordt:

1. beide grootheden moeten werkelijk data hebben
2. geen paar met zichzelf, elk paar precies één keer
3. **geen circulair paar** — twee grootheden die dezelfde ruwe invoer delen meten de
   formule en niet de sporter. De toets staat in `DecisionCore.verbandIsCirculair`.
   Zo wordt dagfactor↔HRV geweigerd (dagfactor komt uit HRV) en belasting↔volume ook
   (belasting is gewogen volume). Belasting-van-gisteren↔HRV-van-vandaag is wél geldig:
   andere dag, andere data.
4. de bron moet een `conditie` hebben, anders valt er geen zin over te maken

Daarna nog: steekproeftoets, kwaliteitstoets, effecttoets, betrouwbaarheid, en tot slot
rangschikking met een bovengrens. De volgorde is deterministisch — sterkte, dan
betrouwbaarheid, dan omvang, dan cross-domein, dan alfabetisch — zodat dezelfde data
altijd dezelfde volgorde geeft.

## Geen causaliteit

Nergens in de engine staat een woord dat oorzaak en gevolg suggereert, en de zinnen komen
sowieso uit de Decision Engine. `RELATIE_VERBODEN_WOORDEN` en `RELATIE_POPULATIE_WOORDEN`
bestaan uitsluitend zodat tests dat kunnen afdwingen.

Niet: *"Meer slaap veroorzaakt een hogere HRV."*
Wel: *"Op dagen waarop je langer sliep, lag je HRV gemiddeld hoger."*

Elke vrijgegeven relatie draagt de disclaimer *"Dit is een samenhang, geen oorzaak."*

## Privacy

Uitsluitend de eigen gegevens van de sporter. Geen referentiedataset, geen normgroep,
geen vergelijking met anderen, geen externe bron. De engines hebben geen netwerktoegang
en loggen niets.

## Coach-integratie

`CoachingCore.buildIntelligenceContext` neemt de vrijgegeven patronen, de belasting uit
AthleteCore en de herstelstatus uit de Decision Engine, en levert maximaal **drie**
inzichten. Met twintig kandidaten zou een coach twintig dingen kunnen zeggen; dan zegt
hij niets.

`intelligenceAiPayload` is een zeef, geen doorgeefluik: coëfficiënt, `relationship_id`
en `data_quality` bereiken het model **niet** — die zou hij kunnen herinterpreteren.

De AI mag uitleggen, samenvatten en contextualiseren. Hij mag **niet**: zelf verbanden
berekenen, een verband als oorzaak presenteren, of uit een verband een trainingsadvies
afleiden. Dat laatste is de scherpste grens: *"je HRV is hoog, dus train zwaar"* mag niet
ontstaan. Trainingsadvies komt uitsluitend uit de Decision Engine en gaat apart mee.

## Voorbeelden

**Sterk patroon**
> Slaap → HRV · Sterk patroon
> Op dagen waarop je langer sliep, lag je HRV gemiddeld hoger.
> 42 vergelijkbare dagen · hoge betrouwbaarheid · Dit is een samenhang, geen oorzaak.

**Onderzocht, geen patroon**
> Slaap → Rusthartslag · Geen patroon
> Tussen je slaap en je rusthartslag is in deze periode geen duidelijke samenhang te zien.
> 38 vergelijkbare dagen · gemiddelde betrouwbaarheid

**Nog te weinig data**
> Trainingsvolume → HRV · Meer data nodig
> Nog onvoldoende data om een betrouwbaar patroon te beoordelen.
> 12 vergelijkbare dagen · nog 18 te gaan

## Beperkingen

- **Alleen rangcorrelatie.** Een niet-monotoon verband (bijvoorbeeld: te weinig én te
  veel slaap zijn allebei ongunstig) wordt niet gevonden. Spearman meet of twee reeksen
  samen op- of aflopen, meer niet.
- **Geen meervoudige verbanden.** Elke relatie is een paar. Er wordt niet gecorrigeerd
  voor een derde grootheid die beide beïnvloedt.
- **Geen significantietoets.** Er is een minimumaantal dagen en een sterktegrens, geen
  p-waarde. Dat is een bewuste keuze: een p-waarde suggereert een zekerheid die bij
  tientallen gelijktijdig onderzochte paren niet waar te maken is zonder correctie voor
  meervoudig testen, en zo'n correctie zou bij deze aantallen vrijwel alles wegvagen.
- **Alleen dagniveau.** Twee metingen op dezelfde dag worden als één dag behandeld.
- **Geen vertraging behalve één dag.** `load_vorige_dag` bestaat; een verschuiving van
  twee of drie dagen nog niet.
- **Omgevingsdata ontbreekt.** Temperatuur, luchtvochtigheid en wind staan in het
  register op `toekomstig`: het model kan ze aan, er is nog geen bron.

## Toekomstige uitbreidingen

Wat het model nu al aankan zodra de data er is:

- **Omgeving** — temperatuur, luchtvochtigheid, wind (Open-Meteo staat op de roadmap)
- **Duur per sessie** — maakt sessie-RPE × duur mogelijk en daarmee één gezamenlijke
  trainingsbelasting over kracht en cardio heen. Zie `AthleteCore.unifiedLoad`, dat om
  precies deze reden nu `null` levert
- **Rustduur tussen sets** — staat in het register op `toekomstig`
- **Meer tijdsverschuivingen** — belasting van vorige week tegen prestatie van deze week
- **Cross-sport** — de modaliteitsscheiding in AthleteCore is er al; zodra er meerdere
  sporten met vergelijkbare eenheden zijn, ontstaan die kandidaten vanzelf

Wat een architectuurwijziging zou vragen: partiële correlatie, niet-monotone verbanden,
en correctie voor meervoudig testen.

## Openstaande productbeslissingen

Deze zijn bewust NIET zelf ingevuld:

1. **Sleutel voor de cardio-split.** De split per sessie wordt correct berekend, maar een
   dagreeks eroverheen mengt machines (bike-erg naast roeier). De app kent al een machine- en
   afstand-bewuste regel voor cardio-records; welke sleutel de relatiereeks moet dragen is een
   productkeuze. Tot die er is blijft `cardio_split` afwezig in plaats van misleidend aanwezig.
2. **Minimum-N en statistische methode formeel vastleggen.** De code noemt 30 en Spearman
   "vastgelegd door de Product Owner"; er is geen DEC-entry die dat bevestigt. Hetzelfde geldt
   voor de bewuste keuze géén significantietoets te gebruiken.
3. **Grofkorrelige afgeleiden.** Dagfactor en gereedheid zijn stapfuncties met weinig
   verschillende waarden; ze vallen daardoor vaak af op de spreidingstoets. Dat is de
   spreidingstoets die correct werkt, maar of zulke afgeleiden überhaupt als relatiebron
   moeten meedoen is een productvraag.
