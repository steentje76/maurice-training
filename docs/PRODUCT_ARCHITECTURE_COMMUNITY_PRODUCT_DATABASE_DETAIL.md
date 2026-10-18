# Trainingskompas Target Product Architecture — Community Product Database

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** onbekende voeding, sportvoeding en supplementen via barcode + tijdelijke labelbeelden laten toevoegen, AI-assisted extractie, gebruikersvalidatie, consensus, confidence, versioning en promotie naar een gedeelde Trainingskompas-productbron. Dit document beschrijft targetfunctionaliteit; het is geen claim dat deze runtimefunctionaliteit al bestaat.

## 1. Kernbeslissing

Wanneer een barcode/GTIN niet betrouwbaar door een bestaande productbron wordt herkend, mag een gebruiker het product helpen toevoegen door de fysieke verpakking tijdelijk te fotograferen/scannen.

Minimale captureflow:
1. barcode/GTIN;
2. voorkant product/verpakking waar nodig voor identiteit;
3. ingrediëntenlijst;
4. voedingswaardetabel of supplement facts/samenstellingslijst.

De beelden zijn **uitsluitend tijdelijke verwerkingsinput**. AI/OCR extraheert gestructureerde gegevens, de gebruiker controleert/corrigeert deze gegevens, daarna worden de beelden verwijderd. Trainingskompas bewaart standaard **niet** de originele productfoto's als community-evidence.

AI/OCR ondersteunt uitsluitend de extractie en structurering van wat aantoonbaar op de verpakking staat. AI mag ontbrekende waarden, ingrediënten, hoeveelheden of claims niet verzinnen of afleiden alsof ze gemeten feiten zijn.

## 2. Product Resolution Service

PRODUCT RESOLUTION SERVICE
- trusted external product sources;
- Trainingskompas Product Database;
- community product submissions;
- product/version resolver;
- confidence and conflict engine.

GTIN/EAN is waar beschikbaar de primaire productidentiteit. Productnaam of merk alleen is onvoldoende om varianten, verpakkingsgroottes of recepturen betrouwbaar te onderscheiden.

GS1/Data Link is een **optionele hoogwaardige bron**, geen technische of commerciële afhankelijkheid. De architectuur moet bruikbaar blijven zonder GS1. Externe bronnen worden alleen gebruikt binnen hun licentie-/APIvoorwaarden.

## 3. Onbekend-product-flow

BARCODE UNKNOWN
-> capture barcode
-> temporary capture front/package if needed
-> temporary capture ingredients
-> temporary capture nutrition/supplement composition
-> image quality checks
-> AI/OCR extraction
-> structured draft
-> user review/correction
-> persist structured submission + provenance/confidence
-> delete temporary images
-> USER-CONTRIBUTED PRODUCT
-> compare with independent submissions and trusted sources
-> field-level confidence
-> conflict/version detection
-> possible promotion to COMMUNITY VERIFIED.

De gebruiker moet vóór definitieve submission de geëxtraheerde kerngegevens kunnen controleren en corrigeren.

## 4. Submission evidence — structured data only

Een product submission bewaart minimaal:
- submission id;
- GTIN/EAN indien aanwezig;
- product type: FOOD / SPORT_FOOD / SUPPLEMENT;
- brand;
- product name;
- variant;
- package size;
- country/market indien relevant;
- raw extracted structured fields;
- user-confirmed/corrected structured fields;
- source type, bijvoorbeeld USER_LABEL_SCAN;
- extraction method/version;
- source/observation timestamp;
- submission timestamp;
- extraction confidence;
- field-level confidence;
- moderation/verification status;
- product-version candidate.

Niet standaard persistent opgeslagen:
- originele voorkantfoto;
- barcodefoto;
- ingrediëntenfoto;
- voedingswaardefoto;
- supplement-labelfoto;
- EXIF/location metadata.

De bewijswaarde voor community-verificatie komt uit **onafhankelijke nieuwe scans en hun gestructureerde resultaten**, niet uit permanente opslag van de oorspronkelijke beelden.

## 5. Privacy en tijdelijke beeldverwerking

Harde default:
`capture -> temporary processing -> extraction -> user confirmation -> structured storage -> image deletion`.

Vereisten:
- vraag alleen beelden die noodzakelijk zijn;
- verwerk zo veel mogelijk direct/in een strikt tijdelijke pipeline;
- strip of negeer EXIF/location metadata;
- sla locatiegegevens uit afbeeldingen niet op;
- gebruik tijdelijke opslag alleen wanneer technisch noodzakelijk;
- tijdelijke objecten hebben korte TTL/cleanup en mogen niet in normale backups/community browsing terechtkomen;
- verwijder beelden na succesvolle extractie + gebruikersbevestiging;
- verwijder/cleanup ook bij afgebroken flows, timeouts en mislukte uploads;
- gezichten/personen/achtergrondinformatie worden niet als productdata opgeslagen;
- logging/telemetry bevat geen ruwe afbeeldingen.

Een toekomstige uitzondering voor langdurige beeldretentie vereist een afzonderlijke Product Owner-, privacy-, security- en juridische beslissing. Het is geen onderdeel van de baseline.

## 6. AI/OCR-regel

AI/OCR is een extractielaag, geen voedingsbron en geen Evidence Registry.

Toegestaan:
- barcode lezen;
- merk/productnaam herkennen;
- ingrediënten transcriberen;
- tabelvelden transcriberen;
- eenheden structureren;
- mogelijke duplicaten voorstellen;
- verschillen tussen submissions signaleren.

Niet toegestaan:
- ontbrekende voedingswaarden invullen;
- ingrediënthoeveelheden gokken;
- onbekende allergenen als afwezig markeren;
- effectiviteit van supplementen uit marketingtekst afleiden;
- fabrikantclaims als wetenschappelijk bewijs registreren.

Onleesbaar/onbekend blijft UNKNOWN/MISSING.

## 7. Verification statuses

Minimaal statusmodel:
- UNVERIFIED;
- USER_CONFIRMED;
- MULTI_SOURCE_MATCH;
- COMMUNITY_VERIFIED;
- TRUSTED_EXTERNAL;
- CONFLICTED;
- OUTDATED;
- REJECTED.

Deze status geldt waar nodig zowel productbreed als per veld.

## 8. Geen simpele X-users = waarheid

Een vast aantal inzendingen alleen is nooit voldoende om productdata automatisch tot waarheid te promoveren.

Promotie gebruikt een expliciete, versioneerbare consensusregel met minimaal:
- zelfde GTIN/productidentiteit;
- onafhankelijke submissions;
- voldoende capture/extraction quality;
- overeenkomende labelwaarden binnen expliciete tolerantie;
- overeenkomende ingrediënten/variant/verpakkingscontext;
- geen onopgelost conflict;
- geen sterk signaal dat een nieuwere receptuur bestaat.

**Aanbevolen initiële productdefault:** minimaal 3 onafhankelijke, evidence-backed labelscans voordat automatische COMMUNITY_VERIFIED-promotie mogelijk is. Dit aantal is configureerbaar en is een governance-confidence-regel, geen wetenschappelijke waarheid. High-risk/conflicted supplementvelden mogen ook bij drie matches aanvullende review vereisen.

## 9. Field-level confidence

Confidence is bij voorkeur per veld, niet alleen per product.

Voorbeeldvelden:
- GTIN;
- brand;
- product name;
- package size;
- energy;
- protein;
- carbohydrate;
- sugars;
- fat;
- saturated fat;
- fibre;
- salt/sodium;
- ingredients;
- allergens;
- serving size;
- supplement ingredient amount.

Hierdoor kunnen betrouwbare voedingswaarden al bruikbaar zijn terwijl bijvoorbeeld portiegrootte of een moeilijk leesbaar ingrediënt nog onzeker is.

## 10. Consensus versus copy-confirmation

Onafhankelijk bewijs heeft meer waarde dan gebruikers die alleen reeds opgeslagen waarden bevestigen.

Sterke consensus:
scan A -> structured 25 g protein
scan B independent -> structured 25 g
scan C independent -> structured 25 g.

Zwakke consensus:
user A enters 25 g
user B sees 25 g and taps yes
user C sees 25 g and taps yes.

De confidence engine moet dit onderscheid behouden. Een nieuwe onafhankelijke scan is nieuw bewijs, ook al wordt de foto daarna verwijderd.

## 11. Conflict detection

Bij verschillende waarden voor dezelfde productidentiteit:
- niet blind majority vote;
- vergelijk structured extraction + user-confirmed values;
- check timestamps/market/package variant;
- check trusted external source indien beschikbaar;
- detecteer mogelijke nieuwe receptuur;
- zet status CONFLICTED als niet veilig oplosbaar;
- gebruik conflicterende velden niet alsof zij betrouwbaar zijn.

Wanneer conflictanalyse echt opnieuw beeldbewijs nodig heeft, vraagt Trainingskompas om een **nieuwe onafhankelijke scan** in plaats van oude foto's permanent te bewaren.

## 12. Product versioning

Dezelfde GTIN kan in de tijd gewijzigde samenstelling krijgen. Daarom geen destructieve overwrite van historische productdata.

PRODUCT
-> VERSION 1 valid_from/observed_period
-> VERSION 2 valid_from/observed_period
-> ...

Historische nutrition logs blijven gekoppeld aan de productversie die bij logging is gebruikt. Een latere receptuurwijziging herschrijft historische inname niet.

Nieuwe submissions kunnen een VERSION_CHANGE_CANDIDATE creëren wanneer ingrediënten of voedings-/supplementwaarden betekenisvol verschillen.

## 13. Product versus log

Productdata en gebruikersinname zijn aparte objecten.

PRODUCT = wat volgens betrouwbare bron/gestructureerde labelwaarneming op de verpakking staat.
NUTRITION LOG = wat de gebruiker aangeeft te hebben geconsumeerd.

Een community-correctie aan productdata mag een reeds bevestigde historische log niet stil veranderen zonder expliciete versie-/recalculation-policy.

## 14. Community promotion

Wanneer product/velden voldoen aan de vastgelegde consensus-, quality- en conflictregels kunnen ze gedeeld worden als COMMUNITY_VERIFIED productdata voor volgende gebruikers.

Volgende scan:
GTIN
-> resolve community/trusted product
-> toon product + source/confidence waar relevant
-> gebruiker kiest portie/hoeveelheid
-> log.

Trainingskompas behoudt intern provenance van de gestructureerde submissions zonder de originele productfoto's permanent te bewaren.

## 15. Trusted external promotion

Wanneer later een betrouwbare externe bron dezelfde GTIN/productversie bevestigt:
- externe bron als provenance toevoegen;
- overeenstemming registreren;
- status kan TRUSTED_EXTERNAL worden waar licentie/governance dit toestaat;
- community provenance niet vernietigen;
- conflicten expliciet behandelen.

## 16. Voeding

Voor FOOD/SPORT_FOOD is de canonical etiketbasis:
- per 100 g voor vaste voeding;
- per 100 ml voor vloeibare voeding;
- portie/serving aanvullend indien aanwezig, nooit als vervanging van canonical basis wanneer 100 g/100 ml beschikbaar is.

Community submissions kunnen o.a. vastleggen:
- energy;
- protein;
- carbohydrate;
- sugars;
- fat;
- saturated fat;
- fibre;
- salt/sodium;
- andere etiketwaarden indien aanwezig;
- ingredients;
- allergens;
- package/serving information.

Consumptie wordt deterministisch vanuit de canonical basis naar werkelijk gelogde hoeveelheid geschaald wanneer de benodigde eenheden bekend zijn. Niet op het etiket aanwezige voedingsstoffen worden niet automatisch geschat vanuit een generiek vergelijkbaar voedingsmiddel. UNKNOWN != 0.

## 17. Supplementen

Dezelfde product capture service geldt voor SUPPLEMENT, maar supplementen worden **niet geforceerd naar een per-100-g voedingsmodel**.

SUPPLEMENT PRODUCT
-> label ingredients + amounts per canonical dose unit
-> normalized ingredient identity
-> Supplement Evidence Registry lookup
-> effectiveness/safety/doping context.

Canonical supplement basis kan bijvoorbeeld per capsule/tablet/scoop/serving/daily dose zijn, inclusief aantal units. Strikte scheiding:
- Product Database: wat zit er volgens label/bron in het product?
- Supplement Evidence Registry: wat mag Trainingskompas wetenschappelijk zeggen over ingrediënt/effect/context?

Een community submission kan nooit zelf een evidence level verhogen.

## 18. Supplement ingredient normalization

Ingrediëntnamen op labels kunnen synoniemen, vormen of blends bevatten. Normalisatie moet voorzichtig zijn.

Bijvoorbeeld een labelterm mag alleen naar een canonical supplement ingredient worden gemapt wanneer identiteit voldoende zeker is. Proprietary blends zonder afzonderlijke hoeveelheden blijven als zodanig geregistreerd; individuele doses worden niet gegokt.

## 19. Stacking

Alleen bekende hoeveelheden uit betrouwbare productversie + werkelijk gelogde consumptie mogen worden gebruikt voor stacking, bijvoorbeeld cafeïne uit koffie, gel en pre-workout.

UNKNOWN amount != 0.

Een community product met onvoldoende confidence op cafeïnehoeveelheid mag niet als exacte hoeveelheid in een veiligheids-/stackingberekening worden gebruikt.

## 20. Moderation en abuse

Crowdsourcing vereist abuse controls:
- rate limits;
- duplicate submission detection;
- impossible-value validation;
- audit trail op structured submissions/statuswijzigingen;
- moderation queue voor conflicten/high-risk products;
- mogelijkheid product/submission te blokkeren;
- geen automatische promotie door één account met meerdere inzendingen.

`Independent users` betekent onafhankelijke accounts/submissions volgens expliciete anti-abuse regels.

## 21. Plausibility checks

Deterministische plausibility checks mogen fouten signaleren, maar niet zelfstandig etiketwaarden vervangen.

Voorbeelden:
- negatieve waarden ongeldig;
- ongeldige units;
- extreem onwaarschijnlijke macro/energy combinatie als review flag;
- serving > package als mogelijke fout;
- duplicate GTIN met afwijkende variant als conflict/version candidate.

Flag -> review, niet AI-correctie zonder bewijs.

## 22. Data quality contract

Elke downstream consumer moet minimaal kunnen weten:
- product version;
- field source;
- verification status;
- confidence;
- missing/unknown state;
- whether value is label-reported/extracted, external, community verified or manually corrected.

Calculation/Insight/AI mogen geen confidence/provenance verliezen.

## 23. Search en fallback

Als barcode niet scanbaar is:
- handmatig GTIN invoeren;
- zoeken op merk/product;
- temporary photo-assisted product candidate;
- handmatig product aanmaken.

Naam-/vision-match alleen is niet automatisch equivalent aan exacte GTIN-identiteit.

## 24. Contributor experience

Na succesvolle bijdrage mag Trainingskompas eenvoudig bedanken en uitleggen dat de bijdrage de bibliotheek verbetert.

Geen noodzaak voor competitieve gamification. Als contributor reputation later wordt gebruikt, mag dit nooit bewijs op zichzelf vervangen.

## 25. Offline

Capture kan waar mogelijk lokaal worden voorbereid. Server-side/community verificatie vereist sync.

Vereisten:
- idempotente submission upload;
- geen dubbele productrecords na retry;
- veilige tijdelijke lokale opslag van beelden alleen indien technisch noodzakelijk;
- encryptie/platform-private storage waar tijdelijke opslag nodig is;
- automatische cleanup na extractie/bevestiging én bij abandon/failure/TTL;
- geen opname van ruwe beelden in normale backup/export/analytics pipelines.

## 26. Delete/export

Gebruikersaccount verwijderen en product community data moeten expliciet worden gescheiden.

Een productfeit dat door meerdere bronnen is bevestigd hoeft niet noodzakelijk als persoonlijk gebruikersgegeven te verdwijnen wanneer één contributor zijn account verwijdert, maar persoonsgegevens en contributor-identifiers moeten volgens privacybeleid verwijderd/geanonimiseerd worden. Deze juridische/data-governancepolicy moet vóór productie worden vastgesteld.

Originele productfoto's zijn in de baseline al verwijderd na verwerking en behoren dus niet tot het normale account-export/community-dataset.

## 27. Functioneel >=9 closure criteria

Deze capability is pas functioneel >=9 wanneer minimaal bewezen is:
- barcode unknown flow werkt;
- temporary image capture werkt;
- extraction zonder silent invention;
- user review/correction werkt;
- structured data wordt persistent opgeslagen;
- originele beelden worden na verwerking verwijderd;
- abandon/failure/TTL cleanup is bewezen;
- EXIF/location/ruwe beelden lekken niet naar logs/backups/analytics;
- GTIN identity/dedupe werkt;
- field-level confidence werkt;
- independent consensus werkt;
- conflict detection werkt;
- product versioning werkt;
- historical logs blijven stabiel;
- community promotion deterministisch/versioneerbaar is;
- supplement ingredient mapping veilig is;
- evidence registry strikt gescheiden blijft;
- abuse/moderation aanwezig is;
- offline/retry/idempotency getest is;
- export/delete governance getest is;
- downstream Calculation/Insight/AI confidence respecteren;
- accessibility/error states getest zijn.

## 28. Product Owner defaults en resterende beslissingen

Vastgelegde defaults:
- originele productfoto's niet persistent bewaren;
- minimaal 3 onafhankelijke evidence-backed scans als initiële automatische COMMUNITY_VERIFIED-drempel, plus quality/conflict gates;
- FOOD canonical per 100 g/100 ml; supplementen per dose unit;
- GS1 optioneel en niet architectuurkritisch;
- community evidence verandert nooit wetenschappelijke supplementevidence.

Voor implementatie nog expliciet/configureerbaar maken:
- exacte field confidence thresholds/toleranties;
- welke high-risk supplementvelden menselijke moderatie vereisen;
- moderatorrollen;
- definitieve externe productbronnen/licenties;
- country/market handling;
- contributor attribution/anonymization;
- eventuele expert verification later.

## 29. Harde architectuurregel

Crowdsourcing verhoogt dekking; het vervangt evidence niet.

`Aantal gebruikers` is een confidence-signaal, geen bron van waarheid. De bron blijft aantoonbare productlabel-/externe evidence, verwerkt via deterministische quality-, consensus-, conflict- en versioningregels. AI helpt herkennen en structureren maar promoveert geen product zelfstandig naar betrouwbaar.

Originele productfoto's zijn verwerkingsinput, geen permanente productdatabase.