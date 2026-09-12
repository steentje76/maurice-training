# Trainingskompas Target Product Architecture — Voedingsbibliotheek & Supplementen

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH
**Parent:** `PRODUCT_ARCHITECTURE_NUTRITION_DETAIL.md`

## 1. Kernbeslissing

Trainingskompas bouwt één voedingsbibliotheek met meerdere bronlagen en een apart, duidelijk herkenbaar Supplementen-gedeelte. Voedingswaarden, productidentiteit en claims/effectiviteit worden niet uit één bron gehaald.

Architectuur:

FOOD LIBRARY
- generieke voedingsmiddelen
- merkproducten
- porties/maten
- recepten/templates
- sportvoeding
- supplementproducten
- supplementingrediënten

SUPPLEMENT EVIDENCE LAYER
- ingrediënt
- doel/use-case
- effectiviteit
- evidence level
- doelgroep/sportcontext
- gebruikscontext/dosering alleen waar evidence/governance dit toestaat
- bijwerkingen/risico's
- interacties/contra-indicaties waar betrouwbare bron aanwezig
- dopingrisico/status
- bron/provenance
- laatste review/version

## 2. Nederlandse basisbron

Voor Nederland is NEVO van RIVM de primaire kandidaat voor generieke voedingsmiddelen en voedingsstoffen. NEVO blijft een externe bron met eigen gebruiksvoorwaarden/licentie; gegevens worden versioned geïmporteerd met bronvermelding en provenance.

Voor porties en huishoudelijke maten is de RIVM/WUR database Voedingseenheden en -maten / Portie-online een primaire kandidaat.

Voor supplementproduct-samenstelling is het Nederlandse Supplementenbestand (NES) een belangrijke kandidaat. NES is complementair aan NEVO en bevat etiketgegevens van veelgebruikte voedingssupplementen.

Merkgebonden voedingsmiddelen kunnen waar juridisch/technisch toegestaan worden aangevuld vanuit LEDA/NVIP of andere productdatabronnen. Geen bron wordt zonder controle als onbeperkt herbruikbaar aangenomen.

## 3. Internationale fallback

USDA FoodData Central kan als aanvullende/internationale bron worden gebruikt, vooral voor producten/ingrediënten die niet in Nederlandse bronnen staan. Imported items behouden source-country/source-dataset metadata. Nederlandse producten worden niet blind gemapt op Amerikaanse varianten.

EFSA/EU food-composition datasets kunnen worden gebruikt als harmonisatie-/referentiebron waar relevant.

## 4. Canonical food model

Elk voedingsmiddel/product krijgt minimaal:
- canonical_food_id;
- display name;
- synonyms;
- category;
- generic/brand flag;
- brand/manufacturer indien relevant;
- barcode/GTIN indien beschikbaar;
- source dataset + source id;
- dataset/version;
- nutrients per 100 g/ml;
- portion definitions;
- preparation state;
- allergens indien betrouwbaar beschikbaar;
- data-quality/provenance;
- last reviewed/imported.

Missing nutrient != zero.

## 5. Source merge policy

Een product kan meerdere bronrecords hebben. Trainingskompas behoudt bronrecords en maakt alleen een canonical representation via deterministische mapping. Geen stille overschrijving.

Voorbeeld:
- NEVO generiek 'magere kwark';
- LEDA merkproduct;
- user custom product.

Deze zijn niet automatisch hetzelfde object.

## 6. Barcode

Barcode scanning gebruikt GTIN/EAN om een merkproduct te vinden. Als product onbekend is:
- gebruiker kan handmatig toevoegen;
- labelgegevens kunnen worden ingevoerd;
- bron wordt `USER_ENTERED_LABEL`;
- eventuele latere database-match vereist review/deterministische matching.

Geen AI-hallucinatie van voedingswaarden uit alleen productnaam/foto.

## 7. Supplementen als apart onderdeel

Target binnen Voeding:

VOEDING
- Vandaag
- Loggen
- Bibliotheek
  - Voedingsmiddelen
  - Sportvoeding
  - Supplementen
- Hydratatie
- Rond training
- Historie
- Inzicht

SUPPLEMENTEN
- Zoeken
- Op doel
- Mijn supplementen
- Ingrediëntenchecker
- Veiligheid & doping
- Evidence-uitleg

Supplementen krijgen een eigen UX omdat 'wat zit erin?' en 'werkt het?' andere vragen zijn dan calorieën/macronutriënten.

## 8. Ingredient-first model

Effectiviteit wordt primair beoordeeld op ingrediënt/werkzame stof, niet op marketingproduct.

PRODUCT -> INGREDIENTS -> EVIDENCE PROFILES

Voorbeeld: een 'Pre Workout X' heeft geen zelfstandig effectiviteitslabel. De ingrediënten worden afzonderlijk beoordeeld en eventueel de combinatie alleen wanneer daar specifieke evidence voor bestaat.

Dit volgt dezelfde kernlogica als de Nederlandse Supplementenwijzer: ingrediënten centraal, marketingclaims niet leidend.

## 9. Supplement ingredient profile

Per ingrediënt minimaal:
- ingredient_id;
- naam + synoniemen;
- categorie;
- wat is het?;
- mogelijke doelen/use-cases;
- mechanisme alleen wanneer relevant en voldoende onderbouwd;
- effectiviteit per doel;
- evidence level;
- doelgroep/sporttype;
- acute versus chronische toepassing;
- verwachte effectgrootte alleen indien betrouwbaar kwantificeerbaar;
- onzekerheid/non-responders;
- bijwerkingen;
- contra-indicaties/interacties waar betrouwbare bron aanwezig;
- doping-/contaminatierisico;
- bronnen;
- evidence review date/version.

## 10. Effectiviteitslabel

Geen simplistische universele score. Effectiviteit is doel- en contextafhankelijk.

Voorbeeld:
CREATINE MONOHYDRAAT
- repeated high-intensity / strength-related performance: strong evidence
- endurance performance: not generally supported as direct ergogenic benefit

CAFEEINE
- endurance/performance/alertness: evidence-supported in relevant contexts
- response and adverse effects vary by person

Het systeem toont dus `werkt waarvoor?`, niet alleen `werkt / werkt niet`.

## 11. Evidence taxonomy

Gebruik de Trainingskompas Evidence Registry als source of truth:
A = sterke en consistente evidence
B = goede praktische/empirische basis
C = contextafhankelijk
D = controversieel/beperkt
E = technisch/afgeleid, geen zelfstandige claim

Supplementprofielen kunnen daarnaast consumentvriendelijke labels krijgen, bijvoorbeeld:
- Sterk bewijs
- Redelijk bewijs
- Onzeker/contextafhankelijk
- Geen overtuigend bewijs
- Mogelijk risico / afraden

Deze labels worden deterministisch uit de evidence-governance afgeleid; AI kiest ze niet.

## 12. Bronnen voor effectiviteit

Voorkeursbronnen:
- systematische reviews/meta-analyses;
- consensus/position stands van erkende sportvoedingsinstanties;
- EFSA waar relevant;
- Voedingscentrum/RIVM voor Nederlandse context en veiligheid;
- Dopingautoriteit/Supplementenwijzer voor risico- en dopingcontext;
- AIS Sports Supplement Framework als internationale sportperformance-referentie;
- andere hoogwaardige wetenschappelijke bronnen per ingredient.

Commerciële fabrikantclaims zijn nooit primaire evidence.

## 13. Supplementenwijzer-achtige UX

Voor ieder ingrediënt moet een gebruiker in enkele seconden begrijpen:

CREATINE MONOHYDRAAT
- Waarvoor? Kracht / korte intensieve herhaalde inspanning
- Effectiviteit: Sterk bewijs
- Voor wie relevant? Afhankelijk van sport/doel
- Mogelijke nadelen: o.a. gewichtstoename door vocht; GI-klachten mogelijk
- Dopingstatus/risico: afzonderlijk tonen; productcontaminatie blijft product/batch-afhankelijk
- Meer uitleg
- Wetenschappelijke bronnen

Daaronder pas diepere details.

## 14. Quickscan op doel

Gebruiker kan zoeken op doelen, bijvoorbeeld:
- kracht;
- spiermassa;
- sprint/explosiviteit;
- duurprestatie;
- alertheid/focus;
- herstel;
- slaap;
- gewichtsverlies;
- hydratatie;
- tekortcorrectie.

De resultaten tonen alleen ingrediënten met expliciete evidence-classificatie voor dat doel en tonen ook `onvoldoende bewijs` waar relevant. Een doelzoeker mag geen verkoopfunnel worden.

## 15. Mijn supplementen

Gebruiker kan eigen gebruik loggen:
- product/ingrediënt;
- hoeveelheid indien bekend;
- tijd;
- frequentie;
- start/stop;
- context training/event;
- notitie;
- bijwerking/ervaring optioneel.

Zelfgerapporteerde ervaring is persoonlijke context, geen bewijs dat het supplement werkt.

## 16. Product versus batch en doping

Een merkproduct kan batchspecifieke veiligheid hebben. `Getest product` mag niet generiek vertaald worden naar `dit merk is altijd dopingvrij`.

Als NZVT/Dopingautoriteit of vergelijkbare betrouwbare batchinformatie later technisch/licentiematig kan worden gekoppeld, modelleer:
- product;
- batch/lot;
- test authority;
- test date;
- status;
- expiry/validity;
- source.

Zonder batchmatch geen dopingvrije claim.

## 17. Risico's en interacties

Supplementprofielen moeten duidelijke veiligheidswaarschuwingen kunnen tonen. Voorbeelden van categorieën:
- stimulant/cafeïne load;
- mogelijke medicatie-interacties;
- zwangerschap/borstvoeding context;
- minderjarigen;
- nier/lever/andere medische context alleen als betrouwbare bron dit ondersteunt;
- verboden/risicovolle stoffen;
- stapeling van hetzelfde ingrediënt uit meerdere producten.

Trainingskompas stelt geen diagnose. Bij medische interacties verwijst het naar arts/apotheker/sportdiëtist waar passend.

## 18. Stack detection

Omdat één gebruiker meerdere producten kan gebruiken, moet de engine dezelfde ingrediënten kunnen optellen wanneer hoeveelheden betrouwbaar bekend zijn.

Voorbeeld:
- koffie;
- pre-workout;
- cafeïnegum.

Cumulatieve cafeïne kan alleen worden berekend uit bekende hoeveelheden; onbekende hoeveelheid blijft unknown en blokkeert een exact totaal.

## 19. AI Coach

AI Coach mag:
- evidenceprofiel samenvatten;
- uitleggen waarvoor een supplement mogelijk relevant is;
- onzekerheid en risico's communiceren;
- wijzen op ingredient duplication/stacking als dit al deterministisch is vastgesteld.

AI Coach mag niet:
- nieuwe effectclaims verzinnen;
- een supplement als behandeling voorschrijven;
- fabrikantclaims als bewijs gebruiken;
- een onbekende productdosering gokken;
- een product dopingvrij noemen zonder geldige bron/batch;
- medische interacties improviseren.

## 20. Wetenschappelijke lifecycle

Supplement evidence verandert. Iedere evidence card bevat:
- evidence_version;
- reviewed_at;
- sources;
- reviewer/governance status;
- change history.

Nieuwe studies wijzigen niet automatisch direct gebruikersadvies. Eerst Evidence Registry review, daarna Decision/UX update.

## 21. Databibliotheek update pipeline

FOOD/SUPPLEMENT SOURCE RELEASE
-> ingest staging
-> schema validation
-> provenance/version
-> mapping/dedupe
-> quality checks
-> review
-> publish canonical library

Nooit rechtstreeks een nieuwe externe dump live zetten.

## 22. Functional >=9 closure

Voedingsbibliotheek/Supplementen kan pas functioneel >=9 zijn wanneer minimaal:
- betrouwbare Nederlandse generieke food source;
- portiematen;
- merkproduct/barcode-strategie;
- source/version/provenance;
- missing != zero;
- user-created foods;
- supplement ingredient library;
- doelafhankelijke evidence-classificatie;
- safety/doping-context;
- bronnen zichtbaar;
- evidence versioning;
- privacy/export/delete;
- search/favorites;
- offline/cache waar relevant;
- AI-output contract;
- tests voor bronmerge, nutrient units en supplement evidence mapping
zijn geïmplementeerd en gevalideerd.

## 23. Open product/licensing decisions

Voor daadwerkelijke implementatie eerst juridisch/licentiematig verifiëren:
- NEVO datasetgebruiksvoorwaarden;
- Portie-online hergebruik;
- LEDA/NVIP toegang en hergebruik;
- NES toegang/hergebruik;
- Dopingautoriteit/Supplementenwijzer data/API/licentie;
- NZVT/batchdata toegang;
- eventuele commerciële barcode/productdatabase.

Publiek raadpleegbare informatie betekent niet automatisch dat de volledige database zonder toestemming in Trainingskompas mag worden gekopieerd.
