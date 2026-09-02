# Trainingskompas Target Product Architecture — Voeding

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** targetfunctionaliteit voor voedingslogging, maaltijdtiming, sportcontext, doelen, privacy, analyse, coachcontext en toekomstige integraties. Geen bewijs dat alle beschreven functionaliteit al gebouwd is.

## 1. Kernbeslissing

Voeding is ondersteunend aan training, herstel en sportdoelen. Trainingskompas wordt geen algemene dieet- of calorie-app en geen medisch voedingssysteem.

De kernvraag is:

`Wat eet/drink ik rond mijn training, hoe past dit bij mijn sportdoel en welke patronen zijn aantoonbaar relevant?`

Voeding heeft daarom twee plaatsen in de productarchitectuur:

INPUT / LOGGING
-> snel voeding registreren

INZICHT
-> voedingstrends en relatie met training/context

Voeding kan daarnaast context leveren aan Coach, Planning en Herstel binnen expliciete evidence-, privacy- en Decision Engine-regels.

## 2. Targetstructuur

VOEDING
- Vandaag
- Loggen
- Maaltijden
- Dranken / hydratatie
- Rond training
- Dagoverzicht
- Doelen
- Favorieten / templates
- Historie
- Inzicht
- Instellingen / privacy

Niet ieder onderdeel hoeft als afzonderlijk scherm te bestaan. Definitieve UX volgt later scherm-voor-scherm na product-ownergoedkeuring.

## 3. Harde productregel: training-first, geen obsessieve calorie-app

Trainingskompas mag voeding niet reduceren tot `calorieën in versus calorieën uit`.

De gebruiker moet voedingsfunctionaliteit ook bruikbaar kunnen vinden zonder iedere gram voeding te loggen.

Ondersteun drie detailniveaus:

QUICK LOG
-> maaltijdmoment / type / globale kwaliteit / timing

STANDARD LOG
-> producten + porties + macro's indien beschikbaar

DETAILED LOG
-> uitgebreidere voedingswaarden waar betrouwbare bron beschikbaar is

De gebruiker kiest hoeveel detail gewenst is.

## 4. Canonical nutrition model

Kernobjecten:

NUTRITION ENTRY
- id
- athlete_id
- timestamp / local date/time / timezone
- meal_type
- source
- items
- quantity/portion
- nutrients where known
- hydration where relevant
- notes
- training_context reference optional
- provenance
- data quality
- manual correction status

NUTRITION DAY
-> verzameling entries per lokale dag

NUTRITION TEMPLATE
-> herbruikbare maaltijd/snack/drank

TRAINING NUTRITION CONTEXT
-> koppeling aan geplande of uitgevoerde training/event

## 5. Maaltijdtypen

Voor gebruikerscontext minimaal:
- ontbijt;
- lunch;
- avondmaaltijd;
- snack;
- pre-workout;
- during-workout;
- post-workout;
- herstelmaaltijd indien productmatig gewenst;
- drank/hydratatie;
- custom.

Een entry kan zowel `lunch` als functionele timingcontext `pre-workout` hebben. Maaltijdtype en sporttiming zijn dus niet hetzelfde veld.

## 6. Snel loggen

Snelheid is essentieel. Mogelijke quick actions:
- maaltijd toevoegen;
- snack toevoegen;
- water/drank toevoegen;
- pre-workout loggen;
- post-workout loggen;
- herhaal recente maaltijd;
- gebruik favoriet/template.

Een gebruiker moet een relevant voedingsmoment in enkele handelingen kunnen registreren zonder eerst een volledige database te doorzoeken.

## 7. Productdatabase / food catalog

Indien Trainingskompas later een voedingsmiddelendatabase gebruikt, moet iedere voedingswaarde provenance hebben.

Broncategorieën kunnen zijn:
- betrouwbare externe voedingsdatabase;
- barcode-productbron;
- fabrikant/merkdata;
- handmatig door gebruiker ingevoerd;
- recept berekend uit ingrediënten.

Geen onbekende voedingswaarde stil als exact presenteren.

## 8. Barcode scanning

Target-capability:
- barcode scannen;
- product matchen;
- portie kiezen;
- nutrition entry opslaan.

Bij meerdere of twijfelachtige matches moet de gebruiker kunnen bevestigen. Een externe productdatabase is geen automatische waarheid; data quality/provenance blijven zichtbaar onderliggend.

## 9. Porties

Ondersteun begrijpelijke eenheden:
- gram/ml;
- stuk;
- portie;
- glas/fles;
- schep;
- serving volgens bron;
- custom.

Conversies mogen alleen deterministisch gebeuren als de benodigde dichtheid/eenheidsrelatie bekend is. Niet gokken dat één `stuk` universeel een bepaald gewicht heeft.

## 10. Macronutriënten

Waar betrouwbare gegevens beschikbaar zijn kan Trainingskompas tonen:
- energie;
- eiwit;
- koolhydraten;
- vet;
- vezels waar relevant.

Macrodoelen zijn optioneel. De app mag geen persoonlijke medische voedingsbehoefte improviseren.

Doelen moeten hun oorsprong kennen:
- gebruiker zelf;
- gekwalificeerde professional indien ondersteund;
- expliciete evidence/rule-based target uit Trainingskompas;
- imported source.

AI mag targets niet zelfstandig creëren of aanpassen buiten toegestane regels.

## 11. Micronutriënten

Micronutriënten kunnen later worden ondersteund als databron en productdoel dit rechtvaardigen.

Geen baselinevereiste voor iedere gebruiker. Voorkom dat incomplete productdata een schijnbaar nauwkeurig micronutriënten-dashboard creëert.

## 12. Hydratatie

Hydratatie wordt gekoppeld aan voeding maar kan een eigen snelle input hebben.

Mogelijke data:
- hoeveelheid vocht;
- dranktype;
- tijd;
- training/event context;
- elektrolyten indien daadwerkelijk bekend.

Geen exacte individuele zweet- of vochtbehoefte claimen zonder passende meetdata/model/evidence.

## 13. Training-first timing

Sterke kerncapability:

PLANNED / EXECUTED WORKOUT
-> relevant nutrition window
-> pre / during / post entries
-> factual timing analysis

Voorbeeld:
- maaltijd 2u15 voor hardlooptraining;
- drank tijdens lange duurtraining;
- post-workout maaltijd 50 minuten na training.

Timing wordt feitelijk berekend uit timestamps. Interpretatie volgt alleen als Calculation/Evidence/Decision Registry daarvoor een toegestane regel bevat.

## 14. Contextueel loggen vanuit workout

Net als apparaten moet voeding vanuit de normale trainingsflow bereikbaar zijn.

Voorbeelden:
- vanuit Training Preview: `Pre-workout voeding toevoegen`;
- tijdens lange endurance sessie: `Fuel/drink loggen`;
- na workout result: `Post-workout maaltijd loggen`.

De gebruiker hoeft daarvoor niet eerst naar een los voedingsscherm.

## 15. Fueling tijdens endurance

Voor langere endurance-events kan later gestructureerde during-workout logging worden ondersteund:
- gels;
- drank;
- koolhydraatbron;
- hoeveelheid/tijd;
- cafeïne indien expliciet geregistreerd;
- vocht.

Realtime of achteraf loggen moet mogelijk zijn. AI mag niet zomaar een fueling-plan verzinnen zonder Calculation/Decision/Evidence support.

## 16. Race / event nutrition

Wedstrijd/event kan optioneel nutrition planning bevatten:
- pre-event plan;
- during-event plan;
- post-event plan;
- gebruikte producten;
- geplande versus werkelijke timing.

Zo kan een marathon-, triathlon-, wieler- of HYROX-event voeding als onderdeel van de voorbereiding meenemen zonder een tweede los planobject te maken.

## 17. Recepten en maaltijden

Een gebruiker kan een recept/maaltijdtemplate opslaan:

RECIPE
-> ingredients
-> total quantity
-> portions
-> calculated nutrition if source values known

Bij wijziging van ingredienten/porties moet versiegedrag voorkomen dat historische entries stil veranderen.

Een gelogde maaltijd behoudt dus de waarden/context die op dat moment golden.

## 18. Favorieten en herhalen

Belangrijk voor lage loggingfrictie:
- recente producten;
- recente maaltijden;
- favorieten;
- templates;
- herhaal gisteren/vergelijkbaar moment waar productmatig logisch.

Nooit blind dupliceren naar verkeerde datum/tijd zonder gebruiker te laten bevestigen.

## 19. Doelen

Mogelijke voedingsdoelen:
- eiwit target;
- koolhydraat target;
- hydratatie target;
- meal timing target;
- energy target alleen waar productmatig/evidence-technisch verantwoord;
- sport/event fueling target.

Doeltypes worden versioned en gekoppeld aan bron/evidence/context.

Gewichtsverlies of gewichtstoename kan als gebruikersdoel bestaan, maar Trainingskompas moet terughoudend zijn met agressieve energierestrictie of andere potentieel schadelijke aanbevelingen.

## 20. Relatie met lichaamsgewicht/body composition

Voeding kan worden bekeken naast lichaamsmetingen, maar correlatie is niet hetzelfde als causaliteit.

De app mag bijvoorbeeld feitelijk tonen:
- gemiddeld gewicht over periode;
- gelogde voedingsconsistentie;
- energielogging completeness.

Geen claim `je kwam aan door voedingsmiddel X` zonder passende causale basis.

## 21. Inzicht

Onder Inzicht -> Voeding kunnen worden getoond:
- logging frequency/completeness;
- maaltijdfrequentie;
- macrotrends indien voldoende data;
- hydratatietrend indien gelogd;
- pre/during/post workout timing;
- sport-/trainingsdag versus rustdag context;
- gepland versus werkelijk event-fueling;
- feitelijke patronen over tijd.

Incomplete logging moet duidelijk als incomplete data worden gemarkeerd. Geen conclusie alsof niet-gelogd hetzelfde is als niet-gegeten.

## 22. Verbanden met training en herstel

Potentiële analyses kunnen alleen worden toegevoegd indien evidence en minimale datakwaliteit dit toelaten.

Architectuur:

NUTRITION DATA
+ TRAINING DATA
+ RECOVERY DATA
+ CONTEXT
-> Calculation / analysis
-> confidence
-> Evidence/Decision rules
-> Insight

AI mag een patroon uitleggen maar niet zelfstandig een correlatie berekenen of causale claim creëren.

## 23. AI Coach

AI Coach mag, op basis van reeds berekende/gestructureerde context:
- logged voeding samenvatten;
- wijzen op ontbrekende logs;
- timingcontext uitleggen;
- toegestane Decision outputs communiceren;
- gebruiker helpen een voedingslog te vinden of begrijpen.

AI Coach mag niet:
- dieetdiagnoses stellen;
- medische voeding voorschrijven;
- allergieën/intoleranties afleiden;
- nutrient deficiencies diagnosticeren;
- calorie-/macrodoelen improviseren zonder regel;
- ontbrekende maaltijden verzinnen;
- zeggen dat iemand voedsel X moet vermijden zonder onderbouwde context.

## 24. Coach/PT

Voedingsdata is gevoelige persoonlijke data en krijgt een eigen consent scope.

Human coach/PT ziet voeding alleen als athlete dit expliciet deelt en de rol dit toestaat.

Een personal trainer is niet automatisch bevoegd om medische voedingsbegeleiding te geven. Product UI mag bevoegdheid niet suggereren enkel omdat iemand `coach` is.

## 25. Dietitian / nutrition professional later

Architectuur moet ruimte laten voor een gespecialiseerde professional role, bijvoorbeeld dietitian/nutrition professional, maar dit is een afzonderlijke product- en compliancebeslissing.

Geen automatische uitbreiding van Coach/PT-rechten.

## 26. Team / Gym privacy

Team- of gymlidmaatschap geeft geen automatische toegang tot individuele voedingslogs.

Gym kan algemene content/programmas aanbieden, bijvoorbeeld:
- recept/content;
- algemene sportvoedinginformatie;
- event hydration station info.

Maar individuele logs blijven private athlete data tenzij expliciet gedeeld.

## 27. Social sharing

Voedingsentries worden niet automatisch in feed/social gedeeld.

Later kan vrijwillig delen van bijvoorbeeld recept/maaltijdfoto mogelijk zijn, maar nooit met verborgen macro/gewicht/health context buiten de gekozen share scope.

## 28. Allergieën, intoleranties en dieetvoorkeuren

Indien toegevoegd, onderscheid:
- preference;
- self-reported intolerance;
- medically diagnosed allergy alleen als gebruiker dit expliciet als zodanig invoert/importeert en governance dit ondersteunt.

Trainingskompas mag zelf geen diagnose afleiden.

Deze gegevens zijn gevoelig en vereisen passende privacy.

## 29. Supplementen

Supplementlogging kan later als expliciete capability bestaan, maar mag niet uitmonden in onbeheerde supplementaanbevelingen.

Minimaal onderscheid:
- product;
- amount;
- timing;
- source;
- user-entered versus professionally advised.

Evidence en safety zijn verplicht voordat Trainingskompas aanbevelingen doet.

## 30. Cafeïne

Cafeïne kan als nutrition/fueling metric worden geregistreerd waar productgegevens of gebruikerinput dit ondersteunen.

Geen universele prestatie- of veiligheidsclaim zonder individuele context/evidence. Hoge dosis-/medische waarschuwingen vereisen expliciete safety rules, niet generatieve AI.

## 31. Data sources / integrations

Toekomstig mogelijke bronnen:
- food database API;
- barcode database;
- Apple Health/Health Connect waar nutrition fields betrouwbaar beschikbaar zijn;
- andere food logging platforms indien API/rechten passend;
- manual.

Import behoudt source/provenance en wordt niet automatisch vertrouwd boven bewuste manual corrections.

## 32. Dedupe

Dezelfde maaltijd kan handmatig en via externe food-app worden geïmporteerd.

Gebruik expliciete duplicate detection op tijd, product/meal fingerprint, source ids en amount waar mogelijk. Geen stil dubbel optellen van calorieën/macros.

## 33. Datakwaliteit

Nutrition data quality houdt rekening met:
- source completeness;
- portion precision;
- product match certainty;
- nutrient completeness;
- manual versus verified database;
- missing meals;
- imported duplicates/conflicts;
- timestamps.

Een dagelijkse macro/energy total krijgt geen hoge confidence wanneer slechts één maaltijd gelogd is.

## 34. Missing data

Harde regel:

NOT LOGGED != ZERO

Dus:
- geen ontbijt gelogd betekent niet `0 kcal ontbijt`;
- geen waterlog betekent niet `0 ml gedronken`;
- ontbrekende macrodata in een product betekent niet `0 g`.

## 35. Energy expenditure

Wearable energy expenditure is een schatting. Als nutrition energy intake ernaast wordt gezet, mag het resulterende `energy balance` niet als exacte fysiologische waarheid worden gepresenteerd.

Eventueel gebruik vereist duidelijke uncertainty/evidence labeling.

## 36. Women's Performance

Voeding kan contextueel naast Women's Performance worden bekeken als gebruiker beide functies gebruikt, maar geen automatische hormoon-/cycluscausaliteit.

Zwangerschap/postpartum/menopauze specifieke voedingsbegeleiding is een aparte product/medical governance beslissing en niet automatisch onderdeel van de baseline.

## 37. Minderjarigen / vulnerable users

Indien Trainingskompas later minderjarigen ondersteunt, vereist voedingsdoelen/gewicht/caloriefunctionaliteit afzonderlijke safety- en parental-control productregels.

Geen automatische overname van volwassen voedingslogica.

## 38. Eating-disorder safety

Nutrition features moeten productmatig voorkomen dat Trainingskompas schadelijke restrictie gamificeert.

Vermijd baseline patronen zoals:
- rode strafstatus voor `te veel gegeten`;
- negatieve social rankings op calorie-inname;
- extreme deficit targets;
- AI die restrictie escaleert.

Specifieke safetyregels moeten voor implementatie worden uitgewerkt wanneer calorie-/gewichtfeatures uitgebreid worden.

## 39. Notifications

Mogelijke opt-in reminders:
- maaltijd/fueling reminder rond geplande training;
- hydration reminder;
- event nutrition plan reminder;
- incomplete log reminder indien gebruiker dit wil.

Geen standaard notificaties die schuld/schaamte oproepen bij niet loggen.

## 40. Planning-integratie

Een geplande training kan nutrition context bevatten zonder dat voeding onderdeel van de workouttemplate zelf hoeft te worden.

PLANNED SESSION
-> optional pre/during/post nutrition plan references

Bij verplaatsen van training moeten relatieve nutrition reminders/context meeschuiven volgens expliciete regels.

## 41. Programma-integratie

Sportprogramma kan generieke fueling guidance of structured nutrition checkpoints bevatten als evidence/product scope dit ondersteunt.

Geen volledig persoonlijk dieetplan automatisch genereren als onderdeel van elk trainingsprogramma.

## 42. Historie

Nutrition history kan worden gefilterd op:
- dag/periode;
- training day/rest day;
- sport;
- event;
- meal type;
- training timing;
- source.

Historische data behoudt oorspronkelijke product/recipe values zodat database-updates het verleden niet herschrijven.

## 43. Edit / delete

Gebruiker kan entries corrigeren/verwijderen.

Manual correction:
- behoud provenance;
- onderscheid originele/imported data versus correctie;
- afgeleide totals/insights opnieuw deterministisch berekenen.

Deletion moet derived nutrition insights correct invalidaten/rebuilden.

## 44. Offline

Manual logging en templates moeten waar mogelijk offline werken.

Sync gebruikt canonical ids/idempotency zodat offline entries later niet dubbel ontstaan.

Barcode/database lookup kan netwerk nodig hebben; fallback is manual log/save-for-later enrichment.

## 45. Export

Persoonlijke data-export bevat nutrition entries, timestamps, nutrition fields, sources/provenance en relevante consent metadata volgens privacybeleid.

## 46. Delete completeness

Account deletion omvat persoonlijke nutrition logs, templates, preferences en private derived data volgens centrale deletion architecture.

Externe provider tokens/links volgen connector deletion rules.

## 47. Security / RLS

Nutrition data is athlete-owned.

Server-side authorization minimaal voor:
- read/write own nutrition;
- scoped coach access;
- no team/gym access by membership alone;
- research access only via research consent/de-identification architecture;
- privileged support/admin access alleen volgens expliciete governance.

## 48. Research

Wetenschappelijk gebruik van nutrition data kan waardevol zijn, maar alleen met expliciete research consent en passende datakwaliteit/provenance.

Self-reported incomplete nutrition data mag niet als nauwkeurige dietary intake worden gelabeld.

## 49. Functional maturity >= 9 criteria

Voeding bereikt pas functioneel >=9 wanneer minimaal aanwezig en getest:
- snelle manual logging;
- meals/items/portion model;
- favorites/templates;
- training-context pre/during/post;
- hydration basis;
- history/edit/delete;
- source/provenance/data-quality/missing-data semantics;
- dedupe voor imports indien integraties actief zijn;
- Inzicht met expliciete completeness/confidence;
- Coach/privacy scopes;
- no team/gym implicit access;
- offline/retry waar relevant;
- export/delete completeness;
- adversarial RLS/privacy tests;
- veilige error/empty states;
- AI contract restrictions;
- safety review voordat calorie-/gewichtfunctionaliteit sterk prescriptief wordt.

## 50. Productfasering

Een verstandige functionele volgorde:

FOUNDATION
-> manual meals + timing + hydration + templates + history

TRAINING INTEGRATION
-> pre/during/post workout context + event fueling

INTELLIGENCE
-> validated deterministic analysis + confidence + Insight

INTEGRATIONS
-> barcode/food DB/external imports

ADVANCED
-> detailed macro goals, recipes, professional nutrition role, deeper event fueling

De fasevolgorde is geen toestemming om functies te bouwen voordat de volledige productarchitectuur is goedgekeurd.

## 51. Relatie met de hoofdarchitectuur

Voeding past als volgt:

INPUT / LOGGING
-> canonical nutrition data
-> quality/provenance
-> Calculation Engine where applicable
-> Context Engine
-> Decision Engine
-> Inzicht
-> AI Coach explanation

AI blijft de communicatielaag en nooit de bron van berekeningen of voedingswaarheid.

## 52. UX-regel

Dit document definieert functionaliteit en architectuur. Definitieve schermen, navigatie, knoppen, visuele hiërarchie en look & feel worden later per scherm als voorbeeld/mock-up voorgelegd aan product owner en pas na goedkeuring gebouwd.
