# Trainingskompas Target Product Architecture — Nutrition Data, Evidence & Supplement Governance

**Status:** PRODUCT OWNER PROPOSAL — recommended defaults  
**Scope:** uitwerking van de twaalf resterende architectuurbeslissingen voor voeding, productdata, community capture, supplementen, veiligheid, sportvoeding en data quality. Geen runtime-implementatie.

## 1. Bronnenmatrix — voorstel

### Tier 1 — Nederlandse generieke voedingssamenstelling
**NEVO/RIVM** als primaire bron voor generieke Nederlandse voedingsmiddelen.
- Canonieke waarden volgens bron en bronversie bewaren.
- NEVO-data niet wijzigen onder NEVO-identiteit.
- Bron + versienummer verplicht tonen/registreren waar vereist.
- Licentie/voorwaarden vóór productie juridisch vastleggen.
- NEVO is generieke food composition, niet automatisch exact merkproduct.

### Tier 2 — Nederlandse branded labeldata
**GS1 Data Source/Data Link** als voorkeursroute voor actuele Nederlandse merk-/labeldata wanneer licentie, kosten en gebruiksvoorwaarden akkoord zijn.
- GTIN-gedreven.
- Labeldata kan voedingswaarden, ingrediënten en productidentificatie bevatten.
- Gebruik/caching/updating alleen volgens afgesloten GS1-licentie.

### Tier 3 — open branded productdata
**Open Food Facts** alleen na expliciete ODbL-architectuur/legal review.
- Technisch aantrekkelijk voor barcode coverage.
- ODbL/share-alike kan gevolgen hebben voor combineren met eigen/proprietary productdatabase.
- Niet mengen in één database zonder vooraf goedgekeurde data-segregatie/licentiestrategie.
- OFF-data heeft eigen provenance/confidence; community data is niet automatisch trusted.

### Tier 4 — internationale aanvulling
**USDA FoodData Central** als internationale/generieke/branded aanvulling waar passend.
- Public-domain/CC0 bronstatus registreren.
- Nederlandse/EU productidentiteit niet vervangen door Amerikaanse equivalenten.

### Trainingskompas community source
Eigen label-scan database als afzonderlijke provenanceklasse.

### Besluit
Maak een `SOURCE_POLICY_REGISTRY` met per bron minimaal: licence, attribution, allowed_use, local_cache_allowed, redistribution, derivative/combine constraints, refresh requirement, territory, source_version, legal_review_status.

## 2. Definitief voedselproduct-datamodel — voorstel

Scheid `GENERIC_FOOD`, `BRANDED_PRODUCT`, `PRODUCT_VERSION`, `NUTRITION_PROFILE`, `INGREDIENT_STATEMENT`, `PORTION_DEFINITION` en `NUTRITION_LOG`.

Voor voeding is canonieke labelbasis:
- `PER_100_G` voor vaste producten;
- `PER_100_ML` voor vloeibare/labelbasis waar van toepassing.

Verplichte productvelden waar beschikbaar:
- internal product id;
- GTIN/EAN;
- brand;
- product name;
- variant;
- net content + unit;
- market/country;
- product category;
- source/provenance;
- source version/retrieval timestamp;
- product version;
- verification status;
- data quality/confidence.

Nutrition profile ondersteunt minimaal energy kJ/kcal, fat, saturated fat, carbohydrate, sugars, protein, salt; fibre en overige nutriënten alleen indien bron/label ze werkelijk levert. `MISSING/UNKNOWN != 0`.

Porties zijn een aparte laag. Rekenen van 100 g/ml naar werkelijk geconsumeerde hoeveelheid gebeurt deterministisch in Calculation Engine.

## 3. Productversies/receptuurwijziging — voorstel

Nooit destructive overwrite.

Nieuwe `PRODUCT_VERSION` wanneer voor dezelfde productidentiteit betekenisvolle labelwijziging wordt bevestigd, bijvoorbeeld:
- ingrediëntenlijst verandert;
- allergenenstatus verandert;
- voedingswaarden buiten expliciete tolerantie veranderen;
- net content/variant betekenisvol wijzigt;
- trusted source nieuwe actieve versie meldt.

Historische logs houden hun oorspronkelijke product_version_id en nutrition snapshot/reference. Nieuwe versie wijzigt oude consumptie niet.

## 4. Community verification — aanbevolen default

Gebruik geen simpele stemtelling.

Voorstel verificatieniveaus:
- 1 onafhankelijke gecontroleerde scan: `USER_CONFIRMED`;
- >=2 onafhankelijke evidence-backed overeenkomsten: `MULTI_SOURCE_MATCH`;
- >=3 onafhankelijke overeenkomende scans + alle mandatory quality gates groen: kandidaat `COMMUNITY_VERIFIED`;
- trusted external match: `TRUSTED_EXTERNAL` waar licentie dit toestaat.

`>=3` is een productdefault, geen wetenschappelijke waarheid; configureerbaar/versioneerbaar.

Mandatory quality gates:
- zelfde GTIN/identiteit;
- onafhankelijke accounts/submissions;
- voldoende extraction confidence;
- gebruiker heeft extractie bevestigd;
- kernnutrition exact of binnen vooraf vastgestelde rounding tolerance;
- ingrediënten/variant consistent;
- geen unresolved conflict/version-change signal;
- anti-abuse checks groen.

Voor allergenen, supplementdoseringen en andere veiligheidskritische velden geldt een hogere confidence threshold en bij conflict geen automatische promotie.

## 5. Tijdelijke fotoverwerking — definitieve keuze

**DEFAULT: foto's worden niet permanent opgeslagen.**

Flow:
CAPTURE -> temporary processing -> OCR/AI extraction -> user review/correction -> structured data saved -> image bytes + temporary derivatives deleted.

Privacy-by-design:
- EXIF/location metadata niet bewaren;
- geen foto in community product record;
- tijdelijke objecten automatisch verwijderen na succes/failure timeout;
- logs bevatten geen image payload;
- retry queue gebruikt zo kort mogelijk versleutelde tijdelijke lokale opslag;
- deletion job + tests bewijzen cleanup.

Community consensus vergelijkt onafhankelijke gestructureerde, user-confirmed submissions; de afbeelding zelf is geen permanent evidence artifact.

## 6. Supplement Ingredient Registry — voorstel

Maak een afzonderlijke `SUPPLEMENT_INGREDIENT_EVIDENCE_REGISTRY`.

Per canonical ingredient/form minimaal:
- ingredient id;
- canonical name;
- synonyms;
- chemical/form distinction waar relevant;
- investigated outcome/goal;
- sport/context;
- evidence level per claim/outcome;
- evidence summary;
- effect direction/effect size alleen indien verantwoord;
- studied dose/protocol ranges met context, niet automatisch persoonlijk voorschrift;
- timing evidence indien relevant;
- known adverse effects;
- safety limits/UL waar toepasselijk;
- population restrictions;
- doping status/context;
- AIS classification als externe context waar licentie/attributie dit toestaat;
- primary reviews/position stands/authoritative sources;
- last evidence review date;
- reviewer/version;
- AI permissions;
- forbidden interpretations.

Evidence wordt per claim beoordeeld. Eén ingrediënt kan sterk bewijs hebben voor doel A en zwak/geen bewijs voor doel B.

## 7. Supplementproduct versus ingrediënt — harde scheiding

`SUPPLEMENT_PRODUCT` beschrijft merkproduct/GTIN/batch/label/samenstelling.

`SUPPLEMENT_INGREDIENT` beschrijft canonical stof/vorm.

`SUPPLEMENT_EVIDENCE_CLAIM` beschrijft wetenschappelijke evidence voor ingredient + outcome + context.

Marketingnaam/productclaim verhoogt nooit evidence. Proprietary blends zonder bekende individuele doses blijven UNKNOWN per individuele dosis.

## 8. Veiligheid, interacties en stacking — voorstel

Bouw eerst veilige, deterministische stacking voor exact bekende hoeveelheden.

Voorbeelden:
- cafeïne uit koffie + gel + pre-workout;
- vitamines/mineralen uit meerdere supplementen;
- andere ingrediënten alleen wanneer units/form compatibel en evidence/safety model bestaat.

Safety engine gebruikt alleen geregistreerde grenzen/regels uit authoritative safety registry, bijvoorbeeld EFSA UL waar toepasselijk.

Harde regels:
- UNKNOWN != 0;
- geen medicijninteractie uit generatieve AI;
- geen diagnose;
- geen medische contra-indicatie afleiden zonder expliciet gevalideerde rule/source;
- zwangerschap, minderjarigen, aandoeningen/medicatie vragen aparte safety governance;
- overschrijding is contextwaarschuwing, geen diagnose.

Medicijninteracties blijven OUT OF SCOPE totdat een gevalideerde medische interaction source en governance zijn goedgekeurd.

## 9. Doping — voorstel

Scheid drie dingen:
1. ingredient/substance doping context;
2. product contamination risk;
3. batch-specific testing.

NZVT-status is uitsluitend geldig voor de specifieke product-batchcombinatie die is getest. Nooit `merk/product is dopingvrij` tonen op basis van één batch.

Datamodel voor eventuele latere NZVT-koppeling:
- supplement_product_id;
- batch/lot;
- test authority/source;
- tested date;
- expiry/validity context;
- source retrieval;
- status/disclaimer.

Dopingautoriteit/NZVT oordeelt niet over werkzaamheid; effectiviteit blijft Evidence Registry.

## 10. Voedingsinzicht versus voedingsadvies — voorstel

Faseer risico:

### Allowed baseline
- logging;
- feitelijke totalen/trends;
- timing rond training;
- hydration/fueling registratie;
- completeness/data quality;
- vergelijking met door gebruiker/professional ingestelde doelen;
- evidence-based algemene sportvoedingsuitleg.

### Rule-governed recommendations
Alleen via Calculation + Context + Decision + Evidence, bijvoorbeeld sportcontextuele fueling guidance wanneer geregistreerde regel bestaat.

### Niet automatisch toestaan
- generatieve persoonlijke afvaldiëten;
- agressieve caloriebeperking;
- medische voedingsbehandeling;
- diagnose tekort/allergie/intolerantie;
- automatisch supplement voorschrijven;
- AI die zelfstandig calorie/macro targets bedenkt.

Weight-loss/gain targets, minors, pregnancy/postpartum en eating-disorder-sensitive flows krijgen aparte safety/product approval vóór implementatie.

## 11. Sportvoeding tijdens training/wedstrijd — voorstel

Maak `FUELING_EVENT` onderdeel van workout/activity execution.

Per event mogelijk:
- timestamp;
- elapsed time;
- distance/segment indien beschikbaar;
- product/product version;
- consumed amount;
- carbohydrate amount indien bekend;
- fluid amount;
- sodium/electrolytes indien bekend;
- caffeine indien bekend;
- source/manual/device/context;
- confidence.

Toepassingen:
- running;
- cycling;
- triathlon/multisport;
- HYROX/hybrid waar relevant;
- lange team/endurance events.

Ondersteun planned fueling vs actual fueling. Realtime logging moet low-friction zijn en post-hoc correctie toestaan. Analyse van g/h, ml/h etc. alleen deterministisch uit bekende waarden; missing intake is niet zero intake.

## 12. Data quality — voorstel

Elke nutrition/supplement value draagt provenance + quality.

Voorstel source classes:
- `AUTHORITATIVE_GENERIC`;
- `LICENSED_BRANDED`;
- `OPEN_BRANDED`;
- `COMMUNITY_VERIFIED`;
- `USER_CONFIRMED_SCAN`;
- `MANUAL_USER_ENTRY`;
- `ESTIMATED_PORTION`;
- `UNKNOWN`.

Quality is multidimensionaal:
- identity confidence;
- composition confidence;
- portion confidence;
- timestamp confidence;
- completeness;
- source freshness;
- conflict state.

UI/Insight/AI mogen schijnprecisie niet vergroten. Een exact etiket kan een exacte labelwaarde zijn, maar niet automatisch exacte fysiologische opname. Een niet gelogde maaltijd is UNKNOWN, niet 0 kcal.

## Product Owner defaults — aanbevolen om nu vast te zetten

1. Foto's: temporary only, niet permanent bewaren — **APPROVE DEFAULT**.
2. Community verified: start met >=3 onafhankelijke overeenkomende user-confirmed submissions + quality gates — **APPROVE DEFAULT**, later data-driven aanpassen.
3. Safety-critical conflicts: geen automatische community promotion — **APPROVE DEFAULT**.
4. Open Food Facts: niet combineren in proprietary masterdatabase voordat ODbL/legal architectuur expliciet akkoord is — **APPROVE DEFAULT**.
5. GS1: voorkeurskandidaat voor Nederlandse branded labeldata, maar alleen na licentie/kostencheck — **APPROVE DEFAULT**.
6. NEVO: primaire generieke NL-bron met bron/version attribution en ongewijzigde bronwaarden — **APPROVE DEFAULT**.
7. Medicijninteracties: voorlopig out of scope — **APPROVE DEFAULT**.
8. Persoonlijke medische/afvaldieetprescriptie door AI: niet toegestaan — **APPROVE DEFAULT**.
9. Supplement Evidence: ingredient + outcome + context, nooit productmarketing — **APPROVE DEFAULT**.
10. NZVT: batch-specific only — **APPROVE DEFAULT**.
11. Sportfueling: first-class workout/activity events — **APPROVE DEFAULT**.
12. UNKNOWN != 0 in alle nutrition/supplement calculations — **APPROVE DEFAULT**.

## Closure

Met bovenstaande defaults kan het voedingsblok architectonisch als **DESIGN COMPLETE / IMPLEMENTATION NOT STARTED** worden behandeld zodra de parent nutrition/community docs hiernaar verwijzen en de foto-retentiepassages zijn gecorrigeerd.

Voor runtime blijven vóór bouw minimaal nodig: juridische/licentiecheck van gekozen productbronnen, concrete database/API schemas, threat/privacy review, evidence population/review workflow en tests/acceptance per capability.
