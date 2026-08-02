# TrainingKompas Premium Development Handbook

## Hoofdstuk 1 — Productvisie & Filosofie

**Status:** leidend referentiedocument voor alle toekomstige sprints, ontwerpbeslissingen en productkeuzes.
**Gebaseerd op:** de volledige codebase (v3.3.25), de Premium Product Audit (2 augustus 2026), en de bestaande projectdocumentatie — Product Book, Blueprint, Brand Identity, Roadmap en Decision Log.
**Leeswijzer:** dit hoofdstuk bevat geen technische implementatie. Het beschrijft wát TrainingKompas is, voor wie, en waarom — zodat elk volgend hoofdstuk (ontwerp, sprints, features) hieraan getoetst kan worden.

---

### Inleiding

Elk product dat lang genoeg meegaat, komt op een punt waarop het sneller groeit dan de vraag "waarom bestaat dit eigenlijk" beantwoord kan worden in een paar zinnen. TrainingKompas is op dat punt aanbeland. Wat begon als een persoonlijk hulpmiddel — één ontwikkelaar die voor zichzelf een trainingslogboek bouwde met een peakdoel op de kalender — is uitgegroeid tot een applicatie met 459 functies, een AI-coach met een uitlegbaar redeneermodel, een spierherstel-visualisatie die geen enkele concurrent evenaart, en de eerste stappen naar een platform voor een volledige sportschool. Die groei is geen toeval: elke technische keuze tot nu toe — van de Row-Level-Security-architectuur tot de sportspecifieke AI-context — is genomen met een onuitgesproken visie in het achterhoofd. Dit hoofdstuk spreekt die visie voor het eerst expliciet uit.

Het doel hiervan is niet decoratief. Een productvisie die alleen bestaat als gevoel bij de Product Owner, is een visie die bij elke sprint opnieuw uitgevonden moet worden — en die bij tijdsdruk het eerst sneuvelt. Vanaf dit document is de visie een toetssteen: elke nieuwe feature, elk ontwerpvoorstel, elke prioriteringsdiscussie kan tegen deze pagina's gelegd worden met de vraag "past dit bij wie TrainingKompas is, of bij wie TrainingKompas toevallig aan het worden is."

---

### 1.1 Waarom bestaat TrainingKompas?

TrainingKompas bestaat niet omdat de markt om nóg een trainingsapp vroeg. Hevy, Strong, Alpha Progression, Fitbod en Garmin Connect bedienen die markt al, ieder met een duidelijke belofte. TrainingKompas is ontstaan uit een veel specifiekere frustratie: geen van die apps denkt daadwerkelijk mee met de mens achter de training.

De aanleiding was concreet, niet abstract. Maurice — Product Owner, enig ontwikkelaar en de eerste atleet van de app — traint functioneel/CrossFit, valt in de Masters-leeftijdscategorie, traint bij ART CrossFit in Hilversum en had een hard peakdoel op de kalender staan: 15 augustus 2026. Dat is geen doelgroep-profiel dat achteraf is bedacht voor een pitch; het is de exacte situatie waarin de eerste regel code is geschreven. Een generiek trainingsschema dat geen rekening houdt met hoe je vandaag hersteld bent, met hoeveel langzamer een lichaam van in de veertig of vijftig herstelt dan een lichaam van vijfentwintig, en met wat een deadline betekent voor periodisering — dat schema is in de praktijk waardeloos, hoe mooi het er in een app ook uitziet.

TrainingKompas bestaat dus om één preciezer probleem op te lossen dan "help mij trainen": **het combineert de discipline van nauwkeurige trainingslogging met de intelligentie van een coach die de mens achter de cijfers begrijpt — dagelijks, uitlegbaar, en zonder dat daar een duur abonnement bij een personal trainer voor nodig is.**

Het feit dat dit uitgroeit tot een platform voor ART CrossFit en mogelijk andere sportscholen, is een gevolg van dat startpunt, niet de reden ervoor. Het Product Book is hierin expliciet: *"Niet eerst een multi-user platform bouwen, maar eerst de beste AI-gestuurde personal training app."* Die volgorde is geen tijdelijke prioritering — het is een uitspraak over waar de waarde van TrainingKompas vandaan komt. Een platform met veel gebruikers en een middelmatige coach is een commodity. Een uitzonderlijke coach die vervolgens toegankelijk wordt voor meer mensen, is een product met een ziel.

---

### 1.2 Welke problemen lost de app op?

De Product Audit (2 augustus 2026) en de bestaande projectdocumentatie laten samen een consistent beeld zien van vijf concrete problemen die TrainingKompas aanpakt — niet als marketingclaim, maar als functies die daadwerkelijk gebouwd en in de laatste stabilisatieronde geharde zijn:

**1. Trainingsschema's houden geen rekening met de dag van vandaag.**
De meeste apps tonen een vast schema, ongeacht hoe iemand die ochtend wakker wordt. TrainingKompas lost dit op met de ratiofactor-/dagfactor-motor en de cold-start-predictor: HRV, rustslag, slaap en een korte conditie-check-in worden gecombineerd tot een concreet, dagelijks aangepast advies — zichtbaar als een dagfactor-score met een expliciete toelichting ("HRV goed, slaap te kort").

**2. Trainingsadvies is een black box.**
Bijna elke app met "AI" erin de naam geeft een aanbeveling zonder te zeggen waarom. TrainingKompas is hierop gebouwd met een tegenovergesteld uitgangspunt: elk advies toont welke data gebruikt is en welke berekening is toegepast — een principe dat letterlijk zo in het Product Book staat en terugkomt in elk coach-advies-scherm dat de spierherstelpercentages per spiergroep toont vóórdat het advies gegeven wordt.

**3. Herstel is onzichtbaar totdat een blessure het zichtbaar maakt.**
De spierherstel-heatmap — een visuele, per-spiergroep weergave van hersteld/vermoeid — is een feature die geen van de vijf benchmark-apps (Hevy, Strong, Alpha Progression, Fitbod, Garmin Connect) op dit niveau aanbiedt. Het maakt een abstract begrip (herstel) concreet en behapbaar vóór elke training.

**4. Standaardapps behandelen elke leeftijd hetzelfde.**
De Masters-correctiefactor is geen bijkomstig detail — het is een structurele aanname in de AI-context (`buildCtx()`) dat een atleet van vijftig fysiologisch anders reageert op belasting dan een atleet van vijfentwintig, en dat het advies daar structureel op moet worden aangepast, niet incidenteel.

**5. Machine-instellingen en context gaan elke keer opnieuw verloren.**
Een klein maar veelzeggend probleem: wie er ooit voor stond te zoeken welke pin-stand of zithoogte bij een bepaalde legpress hoorde, herkent de frictie die `equipment_types`/`exercise_equipment` oplost — instellingen worden onthouden, niet elke sessie opnieuw uitgevonden.

Deze vijf problemen delen een patroon: het zijn stuk voor stuk situaties waarin een generieke, statische aanpak de mens negeert. TrainingKompas' bestaansreden is telkens dezelfde beweging — van generiek naar persoonlijk, van impliciet naar uitlegbaar, van vergeten naar onthouden.

---

### 1.3 Voor welke doelgroep(en) is de app ontworpen?

**Primaire doelgroep — de serieuze functionele/CrossFit-sporter, vaak in de Masters-leeftijdscategorie.**
Dit is geen marketingsegment maar een letterlijke beschrijving van de eerste en tot nu toe enige structurele gebruiker: iemand die traint als discipline, niet als toevallige gewoonte. Iemand die al weet wat RPE, 1RM en periodisering betekenen, die een concreet doel op de kalender heeft staan, en voor wie leeftijdsbewuste training geen bijzaak is maar een dagelijkse realiteit. Deze doelgroep vraagt om precisie, uitlegbaarheid en respect voor ervaring — geen vereenvoudigde interface die uitgaat van onwetendheid.

**Secundaire doelgroep — leden en coaches van ART CrossFit Hilversum.**
De eerste concrete uitbreiding buiten Maurice zelf is geen abstracte "multi-user markt" maar een specifieke, bestaande gemeenschap met een eigen box, eigen coaches en een concreet geuite behoefte (zie Decision Log DEC-008: het social/competitief-traject is niet intern bedacht, maar rechtstreeks gevraagd door ART CrossFit-leden en -coaches). Deze doelgroep traint vaak in klassenverband, heeft een coach die meekijkt, en heeft baat bij de gym-brede zichtbaarheid die het drie-laags model (personal/gym/global) sinds migratie v333 mogelijk maakt.

**Tertiaire doelgroep (toekomst, Fase 4-5) — andere zelfstandige sportscholen.**
Boxeigenaren die een AI-gestuurde, merkbare ervaring aan hun leden willen bieden zonder zelf een platform te bouwen. Deze doelgroep is nog niet actief bediend, maar de architectuur (rollen/entitlements-schema, dynamische branding als "skin" over de Trainingskompas-basis) is er al bewust op voorbereid — precies de vroege, pijnloze voorbereiding die DEC-002 beschrijft.

Wat deze drie doelgroepen verbindt, is niet leeftijd of sportkeuze, maar **houding tegenover training**: mensen die trainen willen begrijpen, niet alleen registreren.

---

### 1.4 Welke gebruikers juist niet?

Een productvisie die voor iedereen probeert te werken, werkt uiteindelijk voor niemand goed. Drie groepen zijn bewust geen primair ontwerpdoel van TrainingKompas, en toekomstige features mogen daar niet stilzwijgend naartoe schuiven:

**De vrijblijvende, incidentele beweger.** Iemand die af en toe wil sporten zonder ooit HRV in te vullen, geen enkele data wil loggen en louter een stopwatch of een lijstje zoekt, krijgt bij TrainingKompas een verarmde ervaring — want de kernwaarde van de app (dagelijks, datagedreven, uitlegbaar advies) ontstaat pas bij actieve betrokkenheid. Dit is geen tekortkoming die opgelost moet worden door de app te versimpelen; het is een bewuste grens.

**Wie primair een sociale-motivatie-app zoekt.** Apps zoals Strava draaien in de kern om delen, volgen en vergelijken. TrainingKompas krijgt met het social/competitief-traject (DEC-008) ook een sociale laag, maar die is en blijft **ondergeschikt aan de coaching-intelligentie**, nooit een vervanging ervoor. Wie een app zoekt waarin het sociale de hoofdmoot is, zit bij TrainingKompas op de verkeerde plek, ook na uitbreiding van die laag.

**De absolute beginner die basisbegeleiding nodig heeft.** TrainingKompas coacht *keuzes* binnen een training — belasting, herstel, progressie — het leert geen mens van nul af aan wat een squat is. Techniekvideo's ondersteunen wie een oefening al kent maar een geheugensteun wil; ze vervangen geen instructieprogramma voor absolute beginners. Dat is een andere productcategorie, met een ander soort begeleiding, en TrainingKompas moet die belofte niet erbij proberen te doen.

Deze grenzen zijn geen exclusiviteit om exclusiviteit — ze zijn de voorwaarde om voor de wél bediende doelgroep uitzonderlijk te blijven in plaats van gemiddeld voor iedereen.

---

### 1.5 Welke kernwaarden staan centraal?

Uit de bestaande principes (Product Book, Blueprint, Decision Log) en het gedrag van de codebase zelf — welke bugs prioriteit kregen, welke architecturale keuzes bewust vroeg zijn gemaakt — laten zich zes kernwaarden aflezen die niet toevallig zijn, maar consistent terugkomen:

**Uitlegbaarheid boven magie.** Elke AI-uitspraak moet beargumenteerd zijn: welke data, welke berekening, waarom dit advies. Dit is geen UX-detail maar een expliciet Product Book-principe, en het onderscheidt TrainingKompas fundamenteel van "black box"-AI-coaching elders in de markt.

**Herstel is even belangrijk als prestatie.** De spierherstel-heatmap en de dagfactor-motor krijgen evenveel architecturale aandacht als de trainingslogging zelf. Dit is een waarde-uitspraak: een app die alleen prestatie meet en herstel negeert, bouwt op termijn blessures en uitval in plaats van vooruitgang.

**Automatiseer wat saai is, nooit wat waardevol is.** Het Product Book noemt expliciet "automatiseren waar mogelijk" en "minder handmatig invoeren" als ontwerpprincipe — maar de coach-interactie zelf blijft mens-in-the-loop: de gebruiker kan een AI-suggestie altijd naast zich neerleggen ("Nee, gewoon starten" naast "Pas aan en start" in het coach-advies-scherm). Automatisering ontneemt geen regie.

**Precisie zonder overweldiging.** De RPE-stepper, de plate calculator die exact toont welke schijven aan de stang moeten, het drie-laags zichtbaarheidsmodel — stuk voor stuk voorbeelden van functionaliteit die complex genoeg is om serieus te zijn, maar zo vormgegeven dat het niet overweldigt. Dit spanningsveld — diepgang zonder complexiteitsgevoel — is een kernwaarde die bij elke toekomstige feature bewust bewaakt moet worden, zeker gezien de audit-bevinding dat de huidige informatiedichtheid soms al tegen die grens aan zit.

**Vertrouwen door veiligheid.** De stabilisatieronde van 1 augustus 2026 — JWT-verificatie op de coach-proxy, een volledige RLS-audit op alle 31 tabellen, het dichten van kritieke lekken (DEC-004) — is geen incident geweest maar een demonstratie van een onderliggende waarde: een app die met HRV, lichaamsdata en trainingsgeschiedenis werkt, verdient het vertrouwen van de gebruiker alleen als die data net zo zorgvuldig behandeld wordt als de adviezen die ermee gegeven worden.

**Nooit stilzwijgend falen.** De les uit DEC-006 — een schrijf-actie die maandenlang stil faalde omdat een `user_id` ontbrak, zonder dat de gebruiker of de ontwikkelaar dit merkte — is inmiddels een kernwaarde geworden: elke actie in de app moet zichtbaar slagen of zichtbaar falen, nooit onzichtbaar niets doen.

---

### 1.6 Wat betekent "Premium" voor TrainingKompas?

"Premium" wordt in de fitness-app-markt vaak verward met decoratie: gladde animaties, felle kleuren, gamification-lagen die punten uitdelen voor elke handeling. De Product Audit is hier expliciet kritisch over waar dat woord vandaan zou moeten komen bij TrainingKompas — en die kritiek is nu onderdeel van de visie, niet enkel van het rapport.

**Premium betekent bij TrainingKompas in de eerste plaats: het onzichtbare werk zichtbaar maken.** De onderliggende kwaliteit is er al — een RLS-architectuur die zonder bekende gaten is (DEC-007), een AI-coach die dieper redeneert dan concurrenten, een spierherstelmodel dat uniek is in de markt. De Audit laat zien dat de functionaliteitsscore (7,5/10) ver vóór de premium-uitstralingsscore (4/10) ligt. Premium is dus niet een laag die er nog bovenop moet — het is het zichtbaar maken van wat er al onder zit.

**Premium betekent precisie, niet decoratie.** Geen dubbele-save-bugs (opgelost, v3.3.6-3.3.7), geen silent failures (DEC-006-les), geen willekeurige interactiepatronen. Een premium app voelt betrouwbaar omdat hij dat daadwerkelijk is, niet omdat hij er zo uitziet.

**Premium betekent rust, geen ruis.** Expliciet niet: opdringerige gamification, overdreven confetti bij elke handeling, kunstmatige urgentie. De doelgroep — serieuze, vaak oudere sporters — herkent en waardeert ingehouden bevestiging (een korte, oprechte viering bij een PR) boven een spektakel dat na de tiende keer irritant wordt.

**Premium betekent dat het merk zichtbaar en consistent is — ook onder een gym-skin.** De merkregel uit Brand Identity ("de volledige naam Trainingskompas moet altijd zichtbaar blijven, ook onder gym-branding") is zelf een premium-principe: een merk dat zich laat wegdrukken door elke gymhuisstijl heeft geen ruggengraat.

**Premium betekent dat elke laag – ontwerp, data, AI – vertrouwen verdient.** Dit sluit direct aan bij kernwaarde "vertrouwen door veiligheid" (1.5): een gebruiker die zijn HRV, lichaamsgewicht en trainingsgeschiedenis toevertrouwt aan een app, moet kunnen aanvoelen — niet alleen via een privacyverklaring lezen — dat die data zorgvuldig behandeld wordt.

Kortom: **Premium is bij TrainingKompas geen esthetische laag, maar het gevolg van consistent uitgevoerde kernwaarden.** De sprints die uit de Product Audit volgen (huisstijl, onboarding, micro-interacties) zijn daarom geen "premium-laagje" bovenop de functionaliteit — ze zijn de vertaling van wat er al waar is naar wat zichtbaar wordt.


---

### 1.7 Wat is de ontwerpfilosofie?

De ontwerpfilosofie van TrainingKompas moet vertrekken vanuit een eerlijke waarneming uit de Product Audit: de **techniek** achter het huidige ontwerp is al goed — een consistente CSS-variabelen-architectuur, een herbruikbaar card/button-systeem, een doordachte RPE-stepper. Wat ontbreekt is niet ontwerpdiscipline, maar ontwerp-*intentie* op merkniveau. De ontwerpfilosofie hierna beschrijft dus niet een breuk met het bestaande systeem, maar de intentie die dat systeem vanaf nu moet sturen.

**Systeem boven scherm.** Elk scherm is een expressie van hetzelfde onderliggende systeem — dezelfde kleuren, dezelfde typografische schaal, hetzelfde spacing-ritme (het bestaande 8/14/16px-grid). Een nieuw scherm ontwerpen betekent nooit "iets nieuws verzinnen", het betekent het systeem toepassen op een nieuwe situatie. Dit voorkomt precies het soort visuele inconsistentie die de Audit signaleert (emoji-navigatie naast zorgvuldig opgebouwde cards).

**Het merk is nooit onderhandelbaar, de skin wel.** DEC-010 legt vast dat Trainingskompas de basis-experience blijft en gym-branding een laag erbovenop is — geen vervanging. Deze regel is meer dan een merkafspraak; het is een ontwerpprincipe: personalisatie mag de identiteit aankleden, nooit vervangen.

**Dichtheid is een keuze, geen ongeluk.** De huidige informatiedichtheid (zie Audit, sectie UX) is begrijpelijk vanuit de ontstaansgeschiedenis — een power user die voor zichzelf bouwde, optimaliseerde voor volledigheid, niet voor eerste indruk. Vanaf dit document is dichtheid een bewuste, per-scherm afweging: een dashboard dat in één oogopslag een richting geeft, mag minimalistisch zijn; een programma-editor voor een ervaren atleet mag dichter zijn. Het verschil moet intentioneel zijn.

**Micro-interacties bevestigen, ze leiden niet af.** Met slechts één `@keyframes` en acht `transition`-regels in de volledige codebase is er weinig risico op overdaad — het risico ligt aan de andere kant: een app die niets bevestigt, voelt onbetrouwbaar aan ("heeft mijn set nu wel opgeslagen?"). De filosofie hier is spaarzaamheid met intentie: elke geanimeerde bevestiging moet een concrete vraag van de gebruiker beantwoorden, nooit decoratie zijn.

**Native systeemdialogen horen niet in een merkervaring.** De negentien `confirm()`-aanroepen zijn functioneel, maar ze zijn ook een browser die even het merk overneemt. Elke actie die om bevestiging vraagt, moet in het merksysteem blijven — dit is geen esthetische wens maar een grens tussen "een app die iets doet" en "een app die iets ís".

---

### 1.8 Wat is de trainingsfilosofie?

**Herstel gaat vóór schema.** De dagfactor/HRV-motor bepaalt niet slechts een aanvulling op het schema — het schema past zich aan de mens aan, niet andersom. Een trainingsfilosofie die progressie boven herstel plaatst, leidt op termijn tot blessures en uitval; TrainingKompas kiest structureel voor het omgekeerde, zichtbaar in het feit dat een check-in vóórafgaat aan elk trainingsadvies.

**Periodisering is architectuur, geen suggestie.** Sinds de laatste stabilisatieronde dwingt de programmagenerator periodisering af in code — het is geen AI-voorstel dat toevallig ook periodiseert, het is een structurele garantie. Dit is een fundamenteel andere filosofie dan apps die simpelweg "een programma genereren": TrainingKompas garandeert de trainingskundige logica, en laat de AI de persoonlijke invulling daarbinnen doen.

**RPE als taal, niet als bijzaak.** Autoregulatie via RPE (in plaats van uitsluitend vaste percentagetabellen) erkent dat dezelfde belasting op verschillende dagen verschillend aanvoelt — en dat een ervaren atleet dat verschil zelf het beste kan aangeven. De verticale RPE-stepper is hierin al het juiste ontwerp-precedent (zie 1.7): eenvoudig te bedienen, serieus in wat het meet.

**Leeftijd is een structurele aanname, geen correctiefactor achteraf.** De Masters-correctie zit niet als los sausje bovenop een standaardberekening — het is verweven in de AI-context vanaf het begin. Deze filosofie moet bij elke toekomstige trainingsfeature (HYROX-race-splits, triathlon-brick, menstruatiecyclus-tracking — alle drie recent naar Fase 1/2 vervroegd) hetzelfde uitgangspunt volgen: fysiologische realiteit is geen uitzondering, het is het startpunt.

**Sportcontext bepaalt de taal van het advies.** De splitsing van `buildCtx()` in een generieke basis plus sportspecifieke blokken (`SPORT_BLOCKS`) is een trainingsfilosofische keuze: een CrossFit-atleet en een hardloper hebben niet alleen andere oefeningen nodig, maar een ander soort coaching-taal. Bij uitbreiding naar nieuwe sporten moet dit principe — niet enkel de content — worden meegenomen.

---

### 1.9 Wat is de AI-filosofie?

**Uitlegbaar boven indrukwekkend.** Dit is het meest fundamentele AI-principe van TrainingKompas en staat letterlijk als zodanig in het Product Book. Een advies dat niet uitlegt welke data en welke berekening eraan ten grondslag ligt, is bij TrainingKompas per definitie onvolledig — ongeacht hoe goed het advies inhoudelijk zou zijn.

**AI is coach, geen orakel.** De gebruiker beslist altijd. Het coach-advies-scherm toont dit letterlijk: naast "Pas aan en start" staat evenwaardig "Nee, gewoon starten". Dit is geen technische toevalligheid maar filosofie: AI in TrainingKompas adviseert met overtuiging, maar oefent nooit dwang uit. Toekomstige AI-features (proactieve ACWR-waarschuwingen, plateau-detectie — zie Product Audit sectie 10 en 12) moeten dezelfde balans bewaren: signaleren, niet dicteren.

**Context is specifiek, nooit generiek.** Sportspecifieke context, Masters-correctie, trainingshistorie en PR's worden meegewogen — een advies dat evengoed voor iedereen zou gelden, is bij TrainingKompas een teken dat de context niet compleet is.

**Veiligheid is een voorwaarde voor bestaan, geen add-on.** De JWT-fix op de coach-proxy (v3.3.10) is exemplarisch: vóór die fix kon in theorie iedereen met de URL, zonder in te loggen, onbeperkt gebruikmaken van de AI-coach op kosten van het project. Dat dit binnen één stabilisatieronde met hoogste prioriteit is gecorrigeerd, is zelf een uitspraak over de AI-filosofie: krachtige AI-toegang zonder waterdichte autorisatie is geen functionaliteit, het is een risico dat eerst wordt weggenomen voordat de functionaliteit telt.

**AI onthoudt, en wordt daardoor beter — nooit generieker.** Naarmate trainingshistorie, PR's en patronen zich opstapelen, moet het AI-advies scherper en persoonlijker worden, niet verwateren tot een gemiddelde. Dit is een expliciete richtlijn voor toekomstige AI-uitbreidingen: meer data moet leiden tot meer precisie, niet tot meer generalisatie.

---

### 1.10 Wat is de datafilosofie?

**Data is van de atleet, niet van het platform.** De volledige RLS-architectuur (alle 31 tabellen, geverifieerd DEC-007) en de recente per-user-scoping-fixes (localStorage cache-owner-uid, DEC-006) zijn de technische vertaling van één filosofisch uitgangspunt: een atleet vertrouwt zijn HRV, gewicht en trainingsgeschiedenis toe aan TrainingKompas, en dat vertrouwen wordt beantwoord met architecturale striktheid, niet met een privacyverklaring alleen.

**Data zwijgt nooit stil.** De ontdekking dat een profielsynchronisatie maandenlang onopgemerkt faalde (DEC-006) is verwerkt tot een blijvend principe: elke schrijfactie moet zichtbaar slagen of zichtbaar falen. Een app die met gezondheids- en prestatiedata werkt, mag zich geen stille fouten veroorloven — de gebruiker moet erop kunnen vertrouwen dat wat hij invoert, ook daadwerkelijk ergens aankomt.

**Eigenaarschap kent lagen, geen alles-of-niets.** Het drie-laags zichtbaarheidsmodel (personal/gym/global, migratie v333) is een datafilosofische keuze even zeer als een technische: een atleet bepaalt zelf wat persoonlijk blijft, wat met de gym gedeeld wordt, en wat globaal bruikbaar is voor anderen. Dit vervangt nooit individuele controle door verplichte transparantie.

**Migraties zijn omkeerbaar en veilig, nooit destructief zonder noodzaak.** De bestaande werkwijze (idempotente SQL, `ON CONFLICT DO UPDATE`, nieuwe kolommen altijd nullable) is een datafilosofie op zich: vooruitgang mag nooit bestaande data in gevaar brengen. Dit principe moet ook gelden zodra de schaal groeit naar meerdere gyms met elk eigen data.

**Data die nog niet gehandhaafd wordt, blijft eerlijk gedocumenteerd.** Het entitlement-schema (`plan_features`, `credit_packs`) bestaat al zonder actieve betaalflow (DEC-002) — een bewuste, transparante voorbereiding, geen verborgen functionaliteit. Deze eerlijkheid over wat wél en nog niet actief is, is zelf onderdeel van de datafilosofie: geen schijnfunctionaliteit, geen misleidende schema's.


---

### 1.11 Hoe verschilt TrainingKompas fundamenteel van Hevy, Strong, Alpha Progression, Fitbod en Garmin Connect?

Het is verleidelijk om dit verschil te beschrijven als een optelsom van features die de concurrentie mist. Dat zou de vraag echter verkeerd beantwoorden — elk van de vijf benchmark-apps heeft legitieme, sterke eigenschappen (zie Product Audit, sectie 7), en TrainingKompas hoeft die niet te overtreffen op hun eigen speelveld om fundamenteel te verschillen.

**Hevy en Strong optimaliseren voor snelheid van registratie. TrainingKompas optimaliseert voor kwaliteit van beslissing.** Hevy is razendsnel in loggen en heeft een sterke sociale feed; Strong is bewust minimalistisch. Beide nemen als vertrekpunt: de mens weet al wat hij moet doen, de app moet dat zo snel mogelijk vastleggen. TrainingKompas vertrekt vanuit het tegenovergestelde: de vraag "wat moet ik vandaag doen, en waarom" is zelf onderdeel van het product, niet een vraag die de gebruiker al beantwoord heeft voordat hij de app opent.

**Alpha Progression onderbouwt wetenschappelijk. TrainingKompas onderbouwt persoonlijk.** Alpha Progression is sterk in het "waarom dit gewicht"-verhaal — precies het principe dat TrainingKompas als kernwaarde deelt (uitlegbare AI). Het verschil zit in de laag daaronder: Alpha Progression redeneert vanuit generieke trainingswetenschap, TrainingKompas redeneert vanuit de individuele HRV, dagfactor, Masters-leeftijd en sportcontext van déze atleet, vandaag. Beide zijn uitlegbaar; alleen TrainingKompas is uitlegbaar én persoonlijk tegelijk.

**Fitbod automatiseert programmakeuze. TrainingKompas automatiseert coaching.** Fitbod's sterkste eigenschap is een gladde, automatische work-out-generatie op basis van hersteldata en beschikbare uitrusting — en een sterke onboarding die daar meteen om vraagt (een gat dat TrainingKompas op dit moment nog concreet heeft, zie Product Audit sectie 15/16). Het verschil is dieper dan onboarding alleen: Fitbod automatiseert *wát* je doet, TrainingKompas probeert daarnaast te automatiseren *hoe je* je daarbij voelt en waarom dat zo is — de dagfactor-toelichting, de spierherstel-heatmap, het "waarom" bij elk advies gaan verder dan alleen work-out-samenstelling.

**Garmin Connect heeft dieper sensordata, TrainingKompas heeft dieper mensdata.** Garmin's voordeel is een eigen hardware-ecosysteem — objectieve sensordata op een niveau dat een software-only platform niet kan evenaren. TrainingKompas' antwoord hierop is niet een poging dat na te bootsen, maar een aanvulling: de dagelijkse conditie-check-in combineert objectieve HRV met subjectief menselijk signaal (pijn, energie, slaapkwaliteit-in-eigen-woorden) op een manier die pure sensordata nooit kan vangen.

**Het fundamentele verschil samengevat:** de vijf benchmark-apps zijn stuk voor stuk sterk in één as — snelheid, eenvoud, wetenschappelijke onderbouwing, automatisering, of sensordata. TrainingKompas is de enige die HRV-gedreven dagfactor, uitlegbare AI, Masters-leeftijdsbewustzijn, sportspecifieke context én visuele spierherstel-tracking in één samenhangend, uitlegbaar geheel combineert. Geen van de andere vijf apps doet dat — en dat is geen toevallige featurelijst, het is het directe gevolg van de manier waarop TrainingKompas is ontstaan (zie 1.1): gebouwd vanuit een concrete, veeleisende atleet, niet vanuit een marktsegment.

---

### 1.12 Welke principes mogen nooit worden geschonden tijdens toekomstige ontwikkeling?

Deze lijst is bewust kort en categorisch. Dit zijn geen richtlijnen die "meestal" gelden — het zijn grenzen.

1. **Nooit een AI-advies zonder uitleg.** Elk advies toont welke data en welke berekening eraan ten grondslag ligt. Geen uitzondering, ook niet voor "kleine" adviezen.
2. **Nooit een stille datafout.** Elke schrijfactie moet zichtbaar slagen of zichtbaar falen. Een herhaling van de DEC-006-situatie is per definitie onacceptabel, ongeacht hoe onschuldig een nieuwe feature aanvoelt.
3. **Nooit gym- of ledenbranding die de naam Trainingskompas onzichtbaar maakt.** Vastgelegd in DEC-010 en Brand Identity — dit geldt ook voor toekomstige experience-personalisatie ("radioplanner"-model) die nog niet is uitgewerkt.
4. **Nooit motivatiemechanismen die manipulatief of verslavend aanvoelen.** Gamification wordt bewust laagdrempelig gehouden (streaks, weekdoelen, een eerlijke PR-viering) — geen kunstmatige urgentie, geen schuldgevoel-triggers, geen mechanismen ontworpen om engagement te maximaliseren ten koste van welzijn.
5. **Nooit persoonlijke data zichtbaar voor wie er geen recht toe heeft.** RLS is niet-onderhandelbaar bij elke nieuwe tabel, elke nieuwe feature, elke nieuwe rol.
6. **Nooit een feature "klaar" zonder volledige CRUD-check en content-check.** Dit bestaande principe (Blueprint, ontstaan uit de programma-generator-misser) blijft onverkort van kracht.
7. **Nooit een architecturale rewrite wanneer uitbreiding volstaat.** Dit geldt evenzeer voor de single-file-architectuur als voor elk toekomstig deelsysteem.
8. **Nooit trainingsadvies dat herstel ondergeschikt maakt aan prestatie.** De dagfactor/HRV-motor gaat vooraf aan het schema — dit primaat mag nooit omgedraaid worden, ook niet onder commerciële of gebruikersdruk ("ik wil gewoon mijn schema zien").
9. **Nooit AI-toegang zonder waterdichte autorisatie.** De JWT-les uit v3.3.10 geldt voor elke toekomstige AI- of externe-API-integratie.

---

### 1.13 Welke ontwerpkeuzes moeten in de toekomst altijd worden getoetst aan deze visie?

Voor elke nieuwe feature, elk ontwerpvoorstel en elke prioriteringsdiscussie geldt een vaste set toetsvragen — direct afgeleid uit de kernwaarden in 1.5 en de filosofieën in 1.7-1.10:

- **Legt dit zichzelf uit?** Kan een gebruiker in één oogopslag zien waaróm de app dit voorstelt, of moet hij het vertrouwen zonder te begrijpen?
- **Voelt dit rustig, of gehaast?** Creëert deze keuze kalmte en overzicht, of voegt hij ruis en urgentie toe die niet functioneel nodig is?
- **Blijft Trainingskompas zichtbaar?** Overleeft de merknaam en -identiteit deze keuze, ook wanneer een gym-skin of ledenpersonalisatie eroverheen ligt?
- **Bedient dit de serieuze sporter, of verdunt het de ervaring voor iedereen?** Een feature die de primaire doelgroep (1.3) dient ten koste van complexiteit voor de vrijblijvende gebruiker (1.4) is precies het soort afweging waar TrainingKompas bewust voor kiest — niet andersom.
- **Voegt dit vertrouwen toe, of complexiteit?** Elke nieuwe databron, elke nieuwe AI-integratie, elke nieuwe rol moet op de vraag "verhoogt dit het vertrouwen van de atleet in zijn data en advies" een duidelijk ja opleveren.
- **Is herstel hier vóór prestatie geplaatst, of erna?** Bij elke trainingsgerelateerde feature (nieuw sportblok, nieuwe metric, nieuwe periodiseringsregel) moet deze volgorde expliciet gecontroleerd worden.
- **Kan dit zonder rewrite, met uitbreiding van wat er al is?** Elke architecturale keuze wordt eerst getoetst op uitbreidbaarheid van het bestaande systeem (CSS-variabelen, card-componenten, entitlement-schema) vóórdat een nieuwe structuur wordt overwogen.
- **Is dit gevalideerd bij de doelgroep, of is het een aanname?** Zoals social/competitief pas werd opgepakt nadat ART CrossFit-leden het concreet vroegen (DEC-008) — nieuwe motivatie- of sociale features moeten dezelfde validatiestap doorlopen, niet vanuit intern buikgevoel gebouwd worden.

Deze toetsvragen horen thuis in elke sprint-kick-off vanaf dit hoofdstuk, niet alleen in audits achteraf.


---

### 1.14 Hoe ziet de ideale gebruikerservaring eruit — van eerste keer openen tot jaren later als ervaren sporter?

**Dag 1 — de eerste keer openen.**
De ideale ervaring begint met een korte, gerichte onboarding — iets dat vandaag nog volledig ontbreekt (Product Audit, sectie 5 en 15) en daarmee de eerste concrete stap is om deze visie waar te maken. Geen uitgebreide productrondleiding, maar een gerichte vraag: wie ben je, wat is je doel, wat is je ervaringsniveau. Direct daarna volgt de eerste check-in (HRV, slaap, hoe voel je je) en de eerste training met daadwerkelijke uitleg naast elk advies — niet omdat de gebruiker dat moet leren waarderen, maar omdat het vanaf de eerste seconde laat zien wat TrainingKompas anders maakt.

**Week 1 tot 4 — het ritme wennen.**
De dagfactor wordt herkenbaar en vertrouwd: de gebruiker begint patronen te zien tussen hoe hij zich voelt, wat de app voorstelt, en hoe de training aanvoelt. Ergens in deze periode valt de eerste PR — een moment dat kort en oprecht gevierd wordt (zie 1.15), niet met overdreven spektakel maar met duidelijke erkenning.

**Maand 3 tot 6 — periodisering wordt tastbaar.**
De gebruiker doorloopt een volledige programma-cyclus (hypertrofie, kracht, deload/peak) en ziet voor het eerst hoe de periodisering die de app afdwingt, zich vertaalt in daadwerkelijke progressie. De spierherstel-heatmap wordt een dagelijks geraadpleegd instrument in plaats van een leuke visualisatie — de gebruiker herkent eigen patronen (welke spiergroep systematisch achterblijft, welke dagen structureel zwaarder aanvoelen).

**Jaar 1 en verder — de ervaren gebruiker.**
De waarde van TrainingKompas verschuift van dagelijkse begeleiding naar lange-termijn inzicht: trends over maanden, bewezen waarde van de Masters-correctie (de gebruiker merkt dat het advies klopt met wat zijn lichaam daadwerkelijk aankan), en — als het social/competitief-traject (DEC-008) inmiddels leeft — mogelijk een eerste aanraking met de gymgemeenschap via ART CrossFit, als een laag boven de individuele ervaring, nooit als vervanging ervan.

**Jaren later — TrainingKompas als coach-geheugen.**
De ideale eindtoestand is niet dat de gebruiker "klaar" is met de app, maar dat de app een vorm van geheugen is geworden die geen menselijke coach zou kunnen bijhouden: elke PR, elke periode van herstel, elk seizoen van training, doorzocht en gebruikt om het advies van vandaag scherper te maken. Een ervaren sporter die jaren met TrainingKompas traint, moet het gevoel hebben dat de app hem beter kent dan een nieuwe personal trainer ooit zou kunnen — niet omdat de app slimmer is dan een mens, maar omdat hij nooit vergeet en nooit ophoudt met opletten.

---

### 1.15 Welke emoties moet de app oproepen?

**Tijdens onboarding: welkom, gezien worden — niet overweldigd.**
De eerste minuten moeten het gevoel geven dat de app naar de gebruiker luistert (doel, ervaringsniveau, huidige staat) voordat hij iets voorschrijft. Het tegenovergestelde van overweldiging is niet vereenvoudiging van de functionaliteit — het is een goed getimede, gedoseerde introductie ervan.

**Tijdens de dagelijkse training: gefocust en ondersteund — nooit gehaast door frictie.**
De trainingsflow moet zo min mogelijk om aandacht vragen die niet naar de training zelf gaat. Elke onnodige tik, elke onduidelijke knop, is een emotie die de app niet wil oproepen: irritatie op het moment dat de gebruiker fysiek het minst geduld heeft voor obstakels.

**Tijdens herstel: gerustgesteld, begrepen — nooit schuldig.**
Een rustdag of een verlaagd advies mag nooit aanvoelen als falen. De dagfactor-toelichting ("HRV goed, slaap te kort") moet geruststellen: de app begrijpt waarom vandaag anders is, en de gebruiker hoeft zich daar niet voor te verantwoorden. Dit is direct verbonden aan de trainingsfilosofie (1.8): herstel gaat vóór schema, en die volgorde moet emotioneel voelbaar zijn, niet alleen functioneel aanwezig.

**Bij het behalen van een PR: trots, oprecht gevierd — kort, niet uitbundig.**
De huidige PR-badge is functioneel correct maar emotioneel onderbenut (Product Audit, sectie 11). De ideale emotie is directe, geloofwaardige trots — vergelijkbaar met een coach die naast je staat en zegt "goed gedaan", niet een spelapp die confetti afvuurt voor elke handeling. Voor de doelgroep (serieuze, vaak oudere sporters) is ingehouden oprechtheid krachtiger dan spektakel.

**Bij langdurig gebruik: vertrouwen, gewoonte, stille trots op vooruitgang.**
Na maanden of jaren moet de dominante emotie een soort rustig vertrouwen zijn — het gevoel dat de app een constante is geworden, zoals een goede coach dat wordt. Geen opwinding die uitdooft, maar een relatie die verdiept. Dit is de emotionele vertaling van de datafilosofie (1.10): data die zorgvuldig behandeld wordt over jaren, bouwt een vorm van vertrouwen op die geen enkele eenmalige indruk kan evenaren.

---

### 1.16 Lange termijnvisie (3–5 jaar)

Zonder technische implementatie, maar met dezelfde precisie als de rest van dit hoofdstuk: waar staat TrainingKompas over drie tot vijf jaar, als de visie in dit document trouw wordt gevolgd?

**Van persoonlijke tool naar het vertrouwde AI-trainingsplatform voor functionele/CrossFit-boxen — zonder de ziel te verliezen bij het opschalen.** ART CrossFit blijft de eerste en meest betekenisvolle gym-klant, maar de architectuur (rollen/entitlements, drie-laags zichtbaarheid, dynamische branding als skin) is er al op gebouwd om naar meerdere sportscholen te groeien. Het risico bij die groei is niet technisch — het is dat de precisie en persoonlijke aandacht die TrainingKompas nu onderscheidt, verwatert naarmate de gebruikersbasis groeit. De lange-termijnvisie is expliciet dat dit niet gebeurt: elke nieuwe gym krijgt dezelfde uitlegbare, herstel-eerst coaching-ervaring, nooit een afgeslankte versie ervan.

**Een gemeenschap rond prestatie, niet alleen individuele logging.** Het social/competitief-traject (DEC-008), gevalideerd door een concrete vraag van ART CrossFit-leden, groeit uit tot een laag waarin leaderboards, teams en gedeelde doelen het individuele trainingsproces versterken — zonder ooit de kern (de één-op-één relatie tussen atleet en AI-coach) te overschaduwen.

**Wearable-onafhankelijkheid.** Waar de app nu beperkt is tot Fitbit via Google Health API, is de visie voor de komende jaren een brede, merkonafhankelijke wearable-laag (Apple HealthKit, Google Health Connect, Garmin, Whoop, Oura — reeds op de Roadmap sinds DEC-010) zodat geen enkele atleet wordt buitengesloten door hardwarekeuze.

**Trainingskompas als merk dat staat voor "een coach die je nooit vergeet en nooit oordeelt."** Dit is de emotionele kern van de lange-termijnvisie: over drie tot vijf jaar moet de naam Trainingskompas bij gebruikers niet in de eerste plaats een featurelijst oproepen, maar een gevoel — het gevoel van een coach die alle geschiedenis onthoudt, die nooit moe wordt van uitleggen, en die nooit een oordeel velt over een mindere dag.

**Commercieel duurzaam zonder de kernwaarden te verkopen.** De weg naar Mollie-betalingen, quota-handhaving en Play Store-distributie (Fase 5) is een noodzakelijke stap om dit alles te kunnen blijven bouwen en onderhouden — maar de lange-termijnvisie stelt een grens: commerciële druk mag nooit de uitlegbaarheid, de herstel-eerst-filosofie of de zichtbaarheid van het merk (1.12) aantasten. Een businessmodel is een middel om deze visie vol te houden, nooit een reden om ervan af te wijken.

---

### Hoe dit document gebruikt wordt

Dit hoofdstuk is geen archiefstuk. Elk toekomstig hoofdstuk van dit Development Handbook — ontwerpsysteem, sprintplanning, featurespecificaties — moet expliciet terugverwijzen naar de relevante paragrafen hierboven, met name naar de toetsvragen in 1.13 en de niet-onderhandelbare principes in 1.12. Waar een toekomstige beslissing hiervan afwijkt, moet dat een bewuste, beargumenteerde uitzondering zijn — vastgelegd zoals de Decision Log dat al doet voor grote koerskeuzes — nooit een stille verschuiving.

De sterkste onderdelen van TrainingKompas vandaag — de uitlegbare AI-coach, de spierherstel-heatmap, de herstel-eerst-filosofie, de architecturale veiligheid sinds de stabilisatieronde van 1 augustus 2026 — zijn niet toevallig ontstaan. Ze zijn het gevolg van keuzes die, vaak onbewust, al aan deze visie voldeden. De onderdelen die nog uitgewerkt moeten worden — merkidentiteit in de daadwerkelijke interface, onboarding, een emotioneel rijkere motivatielaag, bredere wearable-support — zijn geen tekortkomingen van de visie, maar het werk dat nog voor de boeg ligt om de visie volledig zichtbaar te maken.

