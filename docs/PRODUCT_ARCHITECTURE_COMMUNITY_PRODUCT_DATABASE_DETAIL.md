# Trainingskompas Target Product Architecture — Community Product Database

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** onbekende voeding, sportvoeding en supplementen via barcode + foto's laten toevoegen, AI-assisted extractie, gebruikersvalidatie, consensus, confidence, versioning en promotie naar een gedeelde Trainingskompas-productbron. Dit document beschrijft targetfunctionaliteit; het is geen claim dat deze runtimefunctionaliteit al bestaat.

## 1. Kernbeslissing

Wanneer een barcode/GTIN niet betrouwbaar door een bestaande productbron wordt herkend, mag een gebruiker het product helpen toevoegen door bewijs van de fysieke verpakking vast te leggen.

Minimale captureflow:
1. barcode/GTIN;
2. voorkant product/verpakking;
3. ingrediëntenlijst;
4. voedingswaardetabel of supplement facts/samenstellingslijst.

AI/OCR ondersteunt uitsluitend de extractie en structurering van wat aantoonbaar op de verpakking staat. AI mag ontbrekende waarden, ingrediënten, hoeveelheden of claims niet verzinnen of afleiden alsof ze gemeten feiten zijn.

## 2. Product Resolution Service

PRODUCT RESOLUTION SERVICE
- trusted external product sources;
- Trainingskompas Product Database;
- community product submissions;
- product/version resolver;
- confidence and conflict engine.

GTIN/EAN is waar beschikbaar de primaire productidentiteit. Productnaam of merk alleen is onvoldoende om varianten, verpakkingsgroottes of recepturen betrouwbaar te onderscheiden.

## 3. Onbekend-product-flow

BARCODE UNKNOWN
-> capture barcode
-> capture front/package
-> capture ingredients
-> capture nutrition/supplement composition
-> image quality checks
-> AI/OCR extraction
-> structured draft
-> user review/correction
-> USER-CONTRIBUTED PRODUCT
-> compare with independent submissions and trusted sources
-> field-level confidence
-> conflict/version detection
-> possible promotion to COMMUNITY VERIFIED.

De gebruiker moet vóór definitieve submission de geëxtraheerde kerngegevens kunnen controleren en corrigeren.

## 4. Submission evidence

Een product submission bewaart minimaal:
- submission id;
- GTIN/EAN indien aanwezig;
- product type: FOOD / SPORT_FOOD / SUPPLEMENT;
- brand;
- product name;
- variant;
- package size;
- country/market indien relevant;
- front/package evidence;
- barcode evidence;
- ingredient-label evidence;
- nutrition/supplement-label evidence;
- raw extracted fields;
- user-confirmed/corrected fields;
- source timestamp;
- submission timestamp;
- extraction confidence;
- field-level confidence;
- moderation/verification status;
- product-version candidate.

Bewijsafbeeldingen zijn ondersteunende evidence en moeten onder expliciete bewaartermijnen, privacy-, security- en moderatieregels vallen.

## 5. Privacy bij foto's

Productfoto's kunnen onbedoeld persoonsgegevens of omgevingsinformatie bevatten. Daarom:
- vraag alleen foto's die noodzakelijk zijn;
- voorkom onnodige EXIF/location-opslag;
- strip metadata waar passend;
- beperk toegang tot evidence-artifacts;
- laat geen community browsing van originele foto's toe zonder expliciete productbeslissing;
- definieer retentie/verwijdering;
- voorkom dat gezichten/personen onderdeel worden van de productdatabase wanneer niet noodzakelijk.

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
- voldoende beeldkwaliteit;
- overeenkomende labelwaarden binnen expliciete tolerantie;
- overeenkomende ingrediënten/variant/verpakkingscontext;
- geen onopgelost conflict;
- geen sterk signaal dat een nieuwere receptuur bestaat.

Het vereiste aantal onafhankelijke inzendingen is configureerbaar en moet vóór runtime-implementatie als product/data-governancebeslissing worden vastgelegd. Een eerste target kan bijvoorbeeld >=3 onafhankelijke evidence-backed submissions zijn, maar dit getal is geen wetenschappelijke waarheid en wordt niet hard gecodeerd zonder besluit.

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
submission A photo -> 25 g protein
submission B independent photo -> 25 g
submission C independent photo -> 25 g.

Zwakke consensus:
user A enters 25 g
user B sees 25 g and taps yes
user C sees 25 g and taps yes.

De confidence engine moet dit onderscheid behouden.

## 11. Conflict detection

Bij verschillende waarden voor dezelfde productidentiteit:
- niet blind majority vote;
- check image evidence;
- check timestamps/market/package variant;
- check trusted external source indien beschikbaar;
- detecteer mogelijke nieuwe receptuur;
- zet status CONFLICTED als niet veilig oplosbaar;
- gebruik conflicterende velden niet alsof zij betrouwbaar zijn.

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

PRODUCT = wat volgens betrouwbare bron/evidence op de verpakking staat.
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

De gebruiker hoeft niet te weten hoeveel technische submissions achter elk veld zitten, maar Trainingskompas moet intern provenance behouden.

## 15. Trusted external promotion

Wanneer later een betrouwbare externe bron dezelfde GTIN/productversie bevestigt:
- externe bron als provenance toevoegen;
- overeenstemming registreren;
- status kan TRUSTED_EXTERNAL worden waar licentie/governance dit toestaat;
- community evidence niet vernietigen;
- conflicten expliciet behandelen.

## 16. Voeding

Voor FOOD/SPORT_FOOD kunnen community submissions o.a. vastleggen:
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

Niet op het etiket aanwezige voedingsstoffen worden niet automatisch geschat vanuit een generiek vergelijkbaar voedingsmiddel.

## 17. Supplementen

Dezelfde product capture service geldt voor SUPPLEMENT.

SUPPLEMENT PRODUCT
-> label ingredients + amounts
-> normalized ingredient identity
-> Supplement Evidence Registry lookup
-> effectiveness/safety/doping context.

Strikte scheiding:
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
- spam/malicious image detection;
- impossible-value validation;
- audit trail;
- moderation queue voor conflicten/high-risk products;
- mogelijkheid product/submission te blokkeren;
- geen automatische promotie door één account met meerdere inzendingen.

`Independent users` betekent onafhankelijke accounts/evidence volgens expliciete anti-abuse regels.

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
- whether value is label-reported, external, community verified or manually corrected.

Calculation/Insight/AI mogen geen confidence/provenance verliezen.

## 23. Search en fallback

Als barcode niet scanbaar is:
- handmatig GTIN invoeren;
- zoeken op merk/product;
- foto-assisted product candidate;
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
- veilige lokale tijdelijke opslag van foto's;
- cleanup na succesvolle upload volgens retentiebeleid.

## 26. Delete/export

Gebruikersaccount verwijderen en product community data moeten expliciet worden gescheiden.

Een productfeit dat door meerdere bronnen is bevestigd hoeft niet noodzakelijk als persoonlijk gebruikersgegeven te verdwijnen wanneer één contributor zijn account verwijdert, maar persoonsgegevens en contributor-identifiers moeten volgens privacybeleid verwijderd/geanonimiseerd worden. Deze juridische/data-governancepolicy moet vóór productie worden vastgesteld.

## 27. Functioneel >=9 closure criteria

Deze capability is pas functioneel >=9 wanneer minimaal bewezen is:
- barcode unknown flow werkt;
- image capture werkt;
- extraction zonder silent invention;
- user review/correction werkt;
- GTIN identity/dedupe werkt;
- field-level confidence werkt;
- independent consensus werkt;
- conflict detection werkt;
- product versioning werkt;
- historical logs blijven stabiel;
- community promotion deterministisch/versioneerbaar is;
- supplement ingredient mapping veilig is;
- evidence registry strikt gescheiden blijft;
- privacy/photo retention geregeld is;
- abuse/moderation aanwezig is;
- offline/retry/idempotency getest is;
- export/delete governance getest is;
- downstream Calculation/Insight/AI confidence respecteren;
- accessibility/error states getest zijn.

## 28. Product Owner open decisions

Voor implementatie nog expliciet beslissen:
- minimum aantal onafhankelijke submissions per verificatieniveau;
- confidence thresholds;
- welke fields community-verifiable zijn;
- welke high-risk supplementvelden menselijke moderatie vereisen;
- foto-retentie;
- moderatorrollen;
- externe productbronnen/licenties;
- country/market handling;
- contributor attribution/anonymization;
- eventuele expert verification later.

## 29. Harde architectuurregel

Crowdsourcing verhoogt dekking; het vervangt evidence niet.

`Aantal gebruikers` is een confidence-signaal, geen bron van waarheid. De bron blijft aantoonbare productlabel-/externe evidence, verwerkt via deterministische quality-, consensus-, conflict- en versioningregels. AI helpt herkennen en structureren maar promoveert geen product zelfstandig naar betrouwbaar.
