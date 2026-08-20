# TrainingKompas Premium Development Handbook

## Hoofdstuk 2 — Doelgroepen, Persona's & Customer Journey

**Status:** leidend referentiedocument voor alle toekomstige UX-, ontwerp- en featurebeslissingen.
**Voortbouwend op:** Hoofdstuk 1 (Productvisie & Filosofie), de Premium Product Audit (2 augustus 2026), en de bestaande projectdocumentatie (Product Book, Blueprint, Brand Identity, Roadmap, Decision Log).
**Leeswijzer:** dit hoofdstuk bevat geen technische implementatie. Het legt vast wíe TrainingKompas bedient, hoe die mensen zich door de app bewegen, en welke concrete eisen daaruit volgen. Elke toekomstige sprint die schermen, componenten of AI-functionaliteit ontwerpt, toetst zichzelf aan dit hoofdstuk — met name aan de checklist "UX Principles afgeleid uit de doelgroep" aan het einde.

---

### Inleiding

Hoofdstuk 1 heeft vastgelegd wíe TrainingKompas bewust wél en niet bedient, op het niveau van visie: de serieuze functionele/CrossFit-sporter die trainen als discipline ziet, vaak in de Masters-leeftijdscategorie, met ART CrossFit als eerste gymgemeenschap. Dit hoofdstuk maakt die abstractie concreet. Een visie als "wij bedienen de serieuze sporter" stuurt geen enkele knop-positie, geen enkele schermvolgorde en geen enkel AI-promptontwerp — pas wanneer die sporter een naam, een leeftijd, een frustratie en een dinsdagavond-trainingsroutine krijgt, wordt de visie bruikbaar voor ontwerp.

Twee waarschuwingen vooraf, direct voortkomend uit de manier waarop dit project tot nu toe is gebouwd. Ten eerste: de personagegevens in dit hoofdstuk zijn **samengestelde archetypes**, gebaseerd op de daadwerkelijke doelgroepomschrijving in het Product Book en de Product Kickoff (CrossFit/functioneel, Masters-leeftijd, ART CrossFit Hilversum) en op patronen die logisch volgen uit die context — ze zijn nog niet stuk voor stuk met individuele interviews bevestigd. Deel 8 van dit hoofdstuk (Validatie) benoemt expliciet welke aannames al onderbouwd zijn en welke nog getoetst moeten worden. Ten tweede: waar een persona overlapt met de rol van Product Owner Maurice (CrossFit Masters, eigenaar van een box), is bewust gekozen voor een generiek archetype in plaats van een letterlijke beschrijving van één individu — dit hoofdstuk moet bruikbaar zijn voor elke toekomstige gebruiker die op dit archetype lijkt, niet alleen voor de oprichter.

---

## Deel 1 — Doelgroepen

### 1.1 Primaire doelgroep: de serieuze functionele/CrossFit-sporter (vaak Masters-leeftijd)

**Leeftijd.** Kern tussen 35 en 55 jaar (Masters-categorie in CrossFit begint doorgaans bij 35), met een reële spreiding van eind twintig tot begin zestig. Leeftijd is bij deze doelgroep geen bijzaak — het is een fysiologische realiteit die het trainingsadvies structureel raakt (zie Hoofdstuk 1, sectie 1.8: Masters-correctie als structurele aanname, niet als correctiefactor achteraf).

**Sportachtergrond.** Functionele fitness en CrossFit als hoofddiscipline, vaak met een voorgeschiedenis in een andere sport (hardlopen, teamsport, krachttraining) vóórdat men bij een box terechtkwam. Ervaren met basisbegrippen als RPE, 1RM en periodisering — dit is geen instapdoelgroep die uitleg nodig heeft over wat een squat is.

**Trainingsdoelen.** Vaak een concreet, tijdgebonden doel (een wedstrijd, een specifieke tilprestatie, een fysieke test) gecombineerd met een doorlopend doel van duurzaam sterk en gezond blijven. Het Product Kickoff-document noemt hiervan een letterlijk voorbeeld: een concreet peakdoel met vaste datum. Deze combinatie — kortetermijndoel binnen een langetermijnbeeld — is typerend voor de doelgroep en vraagt om een programmagenerator die beide tegelijk kan bedienen.

**Motivatie.** Intrinsiek gedreven: trainen is identiteit, niet een taak op een lijst. Motivatie komt uit meetbare vooruitgang, uit het gevoel gehoord te worden door een coach die de context begrijpt, en — in toenemende mate naarmate de leeftijd stijgt — uit het besef dat consistent, verstandig trainen een voorwaarde is om te blijven kunnen wat men wil blijven kunnen.

**Frustraties.** Gebaseerd rechtstreeks op de problemen die TrainingKompas oplost (Hoofdstuk 1, sectie 1.2): schema's die geen rekening houden met een slechte nachtrust, adviesapps die niet uitleggen waarom, herstel dat onzichtbaar blijft tot een blessure het pijnlijk duidelijk maakt, en generieke leeftijdsblindheid van standaardapps. Daarbij komt een frustratie die de Product Audit blootlegt aan de kant van TrainingKompas zelf: een app die functioneel sterk is maar zich nog niet premium presenteert, met een ontbrekende onboarding en een merkidentiteit die nog niet is doorgevoerd.

**Digitale vaardigheden.** Hoog tot zeer hoog wat betreft app-gebruik in het algemeen (dit is een doelgroep die al Hevy, Strong of Garmin Connect kent of heeft gebruikt), maar niet per se technisch onderlegd in de zin van "houdt van complexiteit om de complexiteit". Voorkeur voor apps die zich gedragen als een vakinstrument: veel functionaliteit, maar voorspelbaar en zonder overbodige stappen.

**Verwachtingen.** Snelheid tijdens het loggen (geen frictie tijdens een training), diepgang in de analyse achteraf, en boven alles: een advies dat aanvoelt alsof het specifiek voor hén is gegeven, niet voor "een gebruiker". De verwachting van uitlegbaarheid (Hoofdstuk 1, sectie 1.9) is bij deze doelgroep geen prettige extra — het is de reden om te blijven.

**Waarom kiest juist deze gebruiker TrainingKompas?** Omdat geen van de vijf marktleiders (Hevy, Strong, Alpha Progression, Fitbod, Garmin Connect) de combinatie biedt die deze doelgroep specifiek nodig heeft: HRV-gedreven dagelijkse aanpassing, leeftijdsbewuste correctie, sportspecifieke AI-context en zichtbaar herstel in één samenhangend geheel (zie Hoofdstuk 1, sectie 1.11). Voor een 25-jarige beginner is dat verschil misschien onzichtbaar; voor een 45-jarige Masters-atleet met een concreet doel en een lichaam dat trager herstelt dan tien jaar geleden, is het verschil doorslaggevend.

### 1.2 Secundaire doelgroep: leden en coaches van ART CrossFit Hilversum

Deze doelgroep is geen abstracte "vroege adopter"-groep, maar een bestaande gemeenschap met een eigen box, eigen coaches, eigen klassenstructuur en — cruciaal — een concreet geuite behoefte. Decision Log DEC-008 legt vast dat het social/competitief-traject niet intern is bedacht, maar rechtstreeks is gevraagd door leden en coaches van ART CrossFit. Dat maakt deze groep niet slechts "gebruikers nummer twee", maar de eerste plek waar TrainingKompas moet bewijzen dat het ook in klassenverband, met een coach die meekijkt, werkt.

Deze doelgroep verschilt van de primaire doelgroep op een paar concrete punten: een bredere spreiding in ervaringsniveau (van gevorderde Masters-atleten tot leden die net starten binnen een box-omgeving), een grotere afhankelijkheid van een coach voor programmering (in plaats van zelf een programma samen te stellen), en een sterkere behoefte aan zichtbaarheid binnen de groep (klassenroosters, gedeelde prestaties) — precies de reden waarom het drie-laags zichtbaarheidsmodel (personal/gym/global, migratie v333) is gebouwd.

**Waarom is deze groep belangrijk?** Omdat het de eerste test is van TrainingKompas als platform in plaats van als persoonlijk instrument. Elke aanname die opgaat voor één atleet die voor zichzelf logt, moet opnieuw getoetst worden zodra een coach twintig leden moet kunnen overzien, of zodra een lid een training ziet die de coach heeft klaargezet in plaats van zelf heeft samengesteld. ART CrossFit is daarmee niet zomaar "meer gebruikers" — het is de proeftuin voor Fase 3 en Fase 4 van de Roadmap.

### 1.3 Tertiaire doelgroep: andere zelfstandige sportscholen (toekomst, Fase 4-5)

Boxeigenaren en managers van andere functionele-fitness- of CrossFit-boxen die een AI-gestuurde, merkbare ervaring aan hun leden willen bieden zonder zelf een platform te bouwen of te onderhouden. Deze doelgroep bestaat nu nog niet actief binnen TrainingKompas, maar de architectuur is er al bewust op voorbereid: het rollen-/entitlementschema (`gym_role`, `plan_features`) staat al klaar (DEC-002), en de merkregel dat gym-branding een skin is over de Trainingskompas-basis (DEC-010) is precies ontworpen om meerdere gyms te kunnen bedienen zonder dat elke gym een volledig losse ervaring wordt.

**Waarom is deze groep belangrijk, ook al is hij nog niet actief?** Omdat elke ontwerpbeslissing die nu voor ART CrossFit gemaakt wordt, een precedent zet voor tientallen toekomstige boxen. Een oplossing die alleen werkt omdat Maurice zowel Product Owner als ART CrossFit-eigenaar is, schaalt niet. Deze doelgroep dwingt daarom nu al tot de discipline om oplossingen generiek genoeg te ontwerpen voor een willekeurige gym-eigenaar, ook al is er vandaag nog maar één.

---

## Deel 2 — Persona's

Acht persona's, elk gebaseerd op een herkenbaar archetype binnen of rond de primaire, secundaire en tertiaire doelgroep. Elke persona is een samengesteld archetype (zie inleiding) — bruikbaar voor ontwerp, nog niet individueel gevalideerd (zie Deel 8).

### Persona 1 — "Ruud", de CrossFit Masters-atleet

| Kenmerk | Beschrijving |
|---|---|
| Leeftijd | 51 |
| Achtergrond | Traint sinds zijn 40e functioneel/CrossFit, daarvoor recreatief hardlopen en fitness. Vaste bezoeker van zijn box, 4-5x per week. |
| Doelen | Een concreet peakdoel op de kalender (bijvoorbeeld een lokale wedstrijd of een zelfgekozen tilprestatie), en op de lange termijn: sterk en blessurevrij blijven tot ver in de zestig. |
| Grootste frustraties | Schema's die geen rekening houden met een slechte nacht; het gevoel dat leeftijd genegeerd wordt door standaard-apps; blessures die hadden kunnen worden voorkomen als herstel eerder zichtbaar was geweest. |
| Digitale vaardigheden | Hoog — gebruikt dagelijks meerdere apps, heeft Strong en Garmin Connect eerder gebruikt, verwacht een vlotte, foutloze ervaring. |
| Trainingsroutine | Vaste trainingsdagen rond werk, ochtend-check-in vóór elke sessie, houdt zelf al jaren losse notities bij over herstel en pijnpunten. |
| Motivatie | Intrinsiek — trainen is identiteit; motivatie stijgt zichtbaar wanneer de app expliciet bevestigt dat een aangepast advies terecht was. |
| Verwachting van AI | Uitleg bij elk advies, specifiek voor zijn leeftijd en sport — geen generiek "goed gedaan, ga door". |
| Verwachting van analytics | Trends over maanden, niet alleen momentopnames; wil zien of zijn ACWR structureel stijgt vóór het een probleem wordt. |
| Verwachting van recovery | De spierherstel-heatmap moet dagelijks bruikbaar zijn, niet decoratief — dit is voor Ruud de kernfeature. |
| Verwachting van wearables | Zijn Fitbit moet naadloos en betrouwbaar HRV doorgeven; irritatie bij elke handmatige stap. |
| Belangrijkste schermen | Home/dashboard (dagfactor), Training A/B, Spierherstel-heatmap, Progressie/Stats. |
| Belangrijkste workflows | Ochtend-check-in → coach-advies → training loggen → herstel bekijken. |
| Minder relevant | Social/leaderboards (interesse, maar geen kernbehoefte); gym-brede functies als hij standalone traint. |

### Persona 2 — "Fleur", de beginnende CrossFitter

| Kenmerk | Beschrijving |
|---|---|
| Leeftijd | 29 |
| Achtergrond | Drie maanden lid bij ART CrossFit, kwam over van een fitnessschool zonder klassenstructuur. Kent RPE en 1RM nog niet goed. |
| Doelen | Techniek onder de knie krijgen, zelfvertrouwen opbouwen in klassenverband, geleidelijk gewicht opbouwen zonder blessures. |
| Grootste frustraties | Overweldigd door te veel cijfers en opties; onzeker of ze een oefening goed uitvoert; schaamte om "domme vragen" te stellen aan de coach tijdens de les. |
| Digitale vaardigheden | Gemiddeld — gebruikt sociale media en basis-apps dagelijks, maar heeft nog nooit een trainingsapp met deze diepgang gebruikt. |
| Trainingsroutine | 3x per week vaste klassen bij de box, oefeningen worden grotendeels door de coach bepaald. |
| Motivatie | Extrinsiek in de vroege fase (erbij horen, resultaat zien), groeiend naar intrinsiek naarmate ervaring toeneemt. |
| Verwachting van AI | Simpel geformuleerde uitleg, geen jargon zonder toelichting; gerustgesteld worden dat een lagere belasting normaal is bij haar niveau. |
| Verwachting van analytics | Weinig behoefte aan diepgaande statistiek — vooral "ben ik vooruitgegaan" in eenvoudige vorm. |
| Verwachting van recovery | Waardeert het concept, maar heeft weinig referentiekader om het te interpreteren zonder duidelijke uitleg. |
| Verwachting van wearables | Heeft (nog) geen wearable; verwacht dat de app ook zonder prima werkt. |
| Belangrijkste schermen | Onboarding, Training (met techniekvideo's), eenvoudig dashboard, Team/gym-scherm (klasrooster). |
| Belangrijkste workflows | Klasse bekijken → training volgen met video-ondersteuning → korte, simpele feedback na afloop. |
| Minder relevant | Programmagenerator (de coach bepaalt haar schema); geavanceerde analytics; apparatuur-catalogus-beheer. |

### Persona 3 — "Daan", de ervaren krachtsporter

| Kenmerk | Beschrijving |
|---|---|
| Leeftijd | 34 |
| Achtergrond | Acht jaar krachttraining/powerlifting, recent overgestapt naar meer functionele training voor afwisseling, maar met kracht als kern. |
| Doelen | Specifieke 1RM-doelen op de grote liften, systematische periodisering, gedetailleerd inzicht in progressie per lift. |
| Grootste frustraties | Apps die kracht en functionele training niet allebei serieus nemen; te generieke programma's die geen rekening houden met individuele lift-zwaktes. |
| Digitale vaardigheden | Zeer hoog — houdt zelf spreadsheets bij naast apps, wil controle en detail. |
| Trainingsroutine | 5x per week, sterk gestructureerd, eigen periodiseringslogica die hij graag naast de AI-generator legt ter controle. |
| Motivatie | Prestatiegedreven, data-gedreven; motivatie stijgt met meetbare progressie op specifieke liften. |
| Verwachting van AI | Wil de onderliggende berekening kunnen doorgronden, geen zwart-wit "vertrouw de AI"-houding; waardeert transparantie boven gemak. |
| Verwachting van analytics | Hoog — per-lift-trends, krachtverhoudingen (ratiofactor), vergelijking tussen mesocycli. |
| Verwachting van recovery | Wil herstel per spiergroep gekoppeld zien aan specifieke liften, niet alleen algemeen. |
| Verwachting van wearables | Ziet wearables als aanvullende databron, niet als vervanging van eigen RPE-inschatting. |
| Belangrijkste schermen | Progressie/Stats (1RM-tracking), Programma-editor, Plate calculator. |
| Belangrijkste workflows | Programma samenstellen/aanpassen → zware sets loggen met plate calculator → 1RM-trend controleren. |
| Minder relevant | Cardio-specifieke features; klassenroosters; sociale laag. |

### Persona 4 — "Sanne", de HYROX-atleet

| Kenmerk | Beschrijving |
|---|---|
| Leeftijd | 37 |
| Achtergrond | Voormalig hardloopster, drie jaar geleden overgestapt naar HYROX, combineert kracht- en duurtraining gericht op racesplits. |
| Doelen | Specifieke stationstijden verbeteren, race-pacing perfectioneren, blessurevrij door de combinatie van kracht en cardio heen komen. |
| Grootste frustraties | Geen enkele app die HYROX als discipline serieus ondersteunt (race-splits, station-specifieke training); trainingsbelasting die kracht én cardio los telt in plaats van gecombineerd. |
| Digitale vaardigheden | Hoog — gebruikt naast trainingsapps ook aparte hardloop-apps, wil dit liever geconsolideerd zien. |
| Trainingsroutine | Wisselend tussen krachtsessies, duursessies en gecombineerde brick-achtige trainingen. |
| Motivatie | Wedstrijdgedreven, concrete tijden als meetpunt. |
| Verwachting van AI | Combinatie-advies dat kracht- én cardiobelasting samen weegt — een gat dat de Roadmap expliciet benoemt (HYROX race-splits en triathlon-brick, DEC-010, vervroegd naar Fase 1/2). |
| Verwachting van analytics | Stationsspecifieke tijden, trends per race-onderdeel. |
| Verwachting van recovery | Wil zien hoe kracht- en cardiobelasting gecombineerd het hersteltotaal beïnvloeden — dit is functioneel nog niet volledig gebouwd. |
| Verwachting van wearables | Hoge verwachting van nauwkeurige hartslag-/pacedata tijdens duuronderdelen. |
| Belangrijkste schermen | Cardio-logging, toekomstig HYROX-race-splitsscherm, spierherstel-heatmap. |
| Belangrijkste workflows | Gemixte training loggen (kracht + cardio) → gecombineerde belasting zien → race-tijden vergelijken. |
| Minder relevant | Zuivere krachtperiodisering zonder cardio-integratie; op dit moment: features die nog niet HYROX-specifiek zijn. |

### Persona 5 — "Bram", de zelfstandige personal trainer

| Kenmerk | Beschrijving |
|---|---|
| Leeftijd | 41 |
| Achtergrond | Gecertificeerd personal trainer, werkt met 15-20 klanten, deels 1-op-1, niet gebonden aan één specifieke box. |
| Doelen | Klanten efficiënt programmeren en opvolgen zonder voor elke klant een los spreadsheet bij te houden; zijn eigen expertise laten samenwerken met AI, niet erdoor vervangen worden. |
| Grootste frustraties | Tools die voor hemzelf als atleet gebouwd zijn, niet voor het begeleiden van anderen; geen overzicht over meerdere klanten tegelijk. |
| Digitale vaardigheden | Hoog, professioneel gebruiker van meerdere tools (agenda, betaling, communicatie) naast trainingssoftware. |
| Trainingsroutine | Traint zelf ook, maar de meeste tijd in de app gaat naar het beheren van klantprogramma's. |
| Motivatie | Professioneel — zijn inkomen en reputatie hangen af van meetbare klantresultaten. |
| Verwachting van AI | Een hulpmiddel dat zijn programmering versnelt (concept-programma's genereren die hij vervolgens verfijnt), nooit een vervanging van zijn coaching-oordeel. |
| Verwachting van analytics | Overzicht per klant én geaggregeerd — wie loopt achter op het schema, wie heeft aandacht nodig. |
| Verwachting van recovery | Wil hersteldata van klanten kunnen inzien om overbelasting te signaleren vóórdat de klant het zelf meldt. |
| Verwachting van wearables | Waardevol als extra objectief signaal naast wat de klant zelf rapporteert. |
| Belangrijkste schermen | (Toekomstig) coach-dashboard met klantenoverzicht, programma-editor, coach-notities. |
| Belangrijkste workflows | Klant selecteren → voortgang/herstel bekijken → programma aanpassen → notitie achterlaten. |
| Minder relevant | Zijn eigen persoonlijke PR-tijdlijn is bijzaak; de coach-functionaliteit is voor hem primair. |
| Opmerking | Dit is een Fase 3-persona — het coach-dashboard waarop deze workflows steunen, staat nog op de Roadmap en is nog niet gebouwd. |

### Persona 6 — "Iris", de CrossFit-coach bij een box

| Kenmerk | Beschrijving |
|---|---|
| Leeftijd | 33 |
| Achtergrond | Coach in loondienst/freelance bij ART CrossFit, geeft dagelijks meerdere klassen, kent de leden persoonlijk. |
| Doelen | Klassen goed voorbereiden, leden individueel kunnen bijsturen zonder de groepsdynamiek te verliezen, veiligheid en techniek bewaken. |
| Grootste frustraties | Geen centraal overzicht van wie recent geblesseerd is of een lage dagfactor had vóór de les begint; handmatig onthouden wie welke aanpassing nodig heeft. |
| Digitale vaardigheden | Gemiddeld tot hoog, gebruikt de app tussen klassen door, vaak op de telefoon, weinig tijd per keer. |
| Trainingsroutine | Geeft zelf ook trainingen, maar de coach-rol domineert haar gebruik van de app. |
| Motivatie | Zorg voor haar leden — succes wordt gemeten in blessurevrije, gemotiveerde leden, niet alleen in eigen prestatie. |
| Verwachting van AI | Signalen die haar werk ondersteunen (wie heeft een lage dagfactor vandaag) zonder haar coach-oordeel te vervangen. |
| Verwachting van analytics | Groepsniveau: wie loopt structureel achter, wie heeft recent een PR gehaald om te vieren in de les. |
| Verwachting van recovery | Wil per lid snel kunnen zien of iemand vandaag aangepast moet worden, vóór de les begint. |
| Verwachting van wearables | Secundair — nuttig als extra signaal, maar zij vertrouwt primair op wat ze in de les ziet. |
| Belangrijkste schermen | (Toekomstig) coach-dashboard, Team/gymbeheer (bestaat al: ledenlijst, rollen, audit-log), spierherstel-overzicht per lid. |
| Belangrijkste workflows | Vóór de les: ledenoverzicht met dagfactor-signalen bekijken → tijdens de les: individuele aanpassingen doorvoeren → na de les: PR's en aandachtspunten noteren. |
| Minder relevant | Persoonlijke programmagenerator voor zichzelf is bijzaak vergeleken met haar coach-taken. |

### Persona 7 — "Tom", de gym owner (toekomstige white-label klant)

| Kenmerk | Beschrijving |
|---|---|
| Leeftijd | 45 |
| Achtergrond | Eigenaar van een zelfstandige functionele-fitnessbox, vergelijkbaar met maar niet identiek aan ART CrossFit — geen technische achtergrond, wel ondernemerservaring. |
| Doelen | Zijn leden een moderne, herkenbare digitale ervaring bieden onder zijn eigen merk, zonder zelf een platform te hoeven bouwen of onderhouden; ledenbehoud en -tevredenheid verhogen. |
| Grootste frustraties | Bestaande gym-managementsoftware is administratief sterk maar coaching-zwak; losse trainingsapps hebben geen gym-brede laag; twijfel of een AI-coach zijn eigen coaches overbodig maakt (dat is niet zo, maar de zorg is reëel). |
| Digitale vaardigheden | Gemiddeld — comfortabel met basis-SaaS-tools (boekhouding, ledenadministratie), geen ontwikkelaar, wil geen technisch beheer. |
| Trainingsroutine | Traint zelf ook in zijn eigen box, maar zijn gebruik van de app is grotendeels beheerder-georiënteerd. |
| Motivatie | Bedrijfsgedreven — ledentevredenheid, retentie, onderscheidend vermogen ten opzichte van andere boxen in de regio. |
| Verwachting van AI | Een aantoonbaar concurrentievoordeel dat hij aan potentiële leden kan laten zien tijdens een proefles. |
| Verwachting van analytics | Gym-brede statistieken: retentie, actieve leden, gemiddelde opkomst — nog niet gebouwd (Fase 4). |
| Verwachting van recovery | Vertrouwen dat de spierherstel- en dagfactor-functionaliteit zijn coaches helpt, niet vervangt. |
| Verwachting van wearables | Verwacht dat dit "gewoon werkt" voor zijn leden zonder dat hij het zelf hoeft te configureren. |
| Belangrijkste schermen | (Toekomstig) owner-dashboard, dynamische branding-instellingen, ledenadministratie. |
| Belangrijkste workflows | Eigen gym-branding instellen → coaches en rollen beheren → gym-brede voortgang overzien. |
| Minder relevant | Individuele trainingsdetails van specifieke leden — dat is voor hem het domein van zijn coaches, niet van hemzelf. |
| Opmerking | Dit is een Fase 4/5-persona — de meeste functionaliteit waarop deze workflows steunen (owner dashboard, meerdere vestigingen) is nog niet gebouwd; het rollen-/entitlementschema is al wel voorbereid (DEC-002). |

### Persona 8 — "Marieke", de revalidatiesporter

| Kenmerk | Beschrijving |
|---|---|
| Leeftijd | 58 |
| Achtergrond | Jarenlange CrossFitter, herstellende van een schouderoperatie, traint onder aangepast regime met goedkeuring van fysiotherapeut. |
| Doelen | Veilig en geleidelijk terugkeren naar volledige belasting, zonder terugval; vertrouwen herwinnen in haar lichaam. |
| Grootste frustraties | Standaardschema's houden geen rekening met een blessurebeperking; angst om per ongeluk te veel te doen omdat de app dat niet signaleert; gebrek aan expliciete erkenning van haar aangepaste traject. |
| Digitale vaardigheden | Gemiddeld — geen digital native, maar functioneel vaardig met apps die ze dagelijks gebruikt. |
| Trainingsroutine | Aangepaste, lichtere sessies, vaak met alternatieve oefeningen voor bewegingen die haar schouder nog niet aankan. |
| Motivatie | Herstelgedreven — elke kleine stap terug naar normaal is een overwinning; motivatie is kwetsbaar en vraagt om zorgvuldige, geruststellende communicatie. |
| Verwachting van AI | Nadrukkelijk geruststellend en voorzichtig, nooit pushend; moet blessurecontext (conditie-check-in, "Lymfoedeem"/aandoeningen-veld dat al in de app bestaat) serieus meewegen in elk advies. |
| Verwachting van analytics | Vooral gericht op geleidelijke, veilige progressie — minder geïnteresseerd in maximale prestatie-cijfers. |
| Verwachting van recovery | De spierherstel-heatmap is voor haar bij uitstek relevant: visueel bevestigen dat een specifieke regio nog niet volledig hersteld is, geeft haar toestemming om het rustiger aan te doen zonder schuldgevoel. |
| Verwachting van wearables | Kan waardevol zijn om overbelasting objectief te signaleren, maar is geen voorwaarde voor haar. |
| Belangrijkste schermen | Check-in met condities (bestaat al: athlete_conditions), Training met aangepaste oefeningen, Spierherstel-heatmap. |
| Belangrijkste workflows | Conditie invullen vóór de check-in → aangepast advies ontvangen met duidelijke uitleg waaróm het is aangepast → training met alternatieve oefeningen loggen. |
| Minder relevant | Prestatiegerichte analytics (1RM-records, competitieve vergelijking); social/leaderboards voelen in deze fase eerder ontmoedigend dan motiverend. |


---

## Deel 3 — Customer Journey

De journey hieronder is primair geschreven vanuit Persona 1 (Ruud, CrossFit Masters) als representant van de kerndoelgroep, met expliciete zijstappen waar Persona 2 (Fleur, beginner) of andere persona's wezenlijk anders door de fasen bewegen.

### Fase 1 — Installatie en eerste indruk

**Emoties:** nieuwsgierigheid, gemengd met voorzichtige scepsis ("nog een app die belooft slim te zijn"). **Twijfels:** of dit weer een generieke fitnesstracker is; of de moeite van het invoeren van gegevens de moeite waard is. **Verwachtingen:** een snelle, duidelijke eerste indruk van wat de app anders maakt. **Mogelijke afhakers:** een trage eerste laadtijd, een verwarrend startscherm, of — de huidige stand volgens de Product Audit — het compleet ontbreken van een gerichte eerste stap, waardoor de gebruiker zelf moet uitzoeken waar te beginnen. **Kans om te verrassen:** direct bij de eerste opening al iets tonen dat concurrenten niet hebben (bijvoorbeeld een korte, heldere belofte over uitlegbare AI en herstel-eerst-denken) in plaats van een leeg dashboard.

### Fase 2 — Onboarding

**Emoties:** bereidheid om tijd te investeren, mits de vragen relevant aanvoelen. **Twijfels:** "waarom moet ik dit allemaal invullen voordat ik iets kan doen?" **Verwachtingen:** een kort, gericht traject — profiel, doel, ervaringsniveau — dat aanvoelt als een intake bij een goede coach, niet als een formulier. **Mogelijke afhakers:** een te lange vragenlijst, of (huidige situatie) een volledig ontbrekende onboarding waardoor de gebruiker in een halfleeg dashboard belandt zonder richting. **Kans om te verrassen:** de onboarding direct laten eindigen in een eerste, persoonlijk aanvoelend advies — niet in een leeg scherm met de mededeling "vul verder je profiel aan". Voor Fleur (Persona 2) is deze fase extra kritiek: haar onboarding moet nadrukkelijk geruststellend zijn over het feit dat ze nog niet alles hoeft te weten.

### Fase 3 — Eerste training

**Emoties:** lichte spanning ("werkt dit echt soepel tijdens het sporten, of ga ik zitten klooien met mijn telefoon"). **Twijfels:** of loggen tijdens een training niet te veel tijd kost. **Verwachtingen:** minimale frictie — de kernbelofte van elke serieuze trainingsapp. **Mogelijke afhakers:** een onduidelijke eerste setinvoer, een rusttimer die niet vanzelf verschijnt (zie Product Audit, sectie 8: rusttimer-auto-start als grootste flow-quick-win). **Kans om te verrassen:** een eerste PR-badge of een eerste stukje uitgelegd advies tijdens deze allereerste sessie, zodat de belofte van de app niet pas na dagen zichtbaar wordt maar al binnen het eerste bezoek.

### Fase 4 — Eerste AI-advies

**Emoties:** kritische nieuwsgierigheid — dit is het moment waarop de gebruiker toetst of "AI-coach" een loze marketingterm is of iets echts. **Twijfels:** "is dit advies specifiek voor mij, of een sjabloonzin met mijn naam erin geplakt?" **Verwachtingen:** een concrete koppeling tussen de zojuist ingevoerde check-in-data (HRV, slaap) en het advies. **Mogelijke afhakers:** een advies dat generiek aanvoelt, of geen duidelijke uitleg toont (in strijd met de kernwaarde uit Hoofdstuk 1). **Kans om te verrassen:** het advies laten verwijzen naar iets dat de gebruiker net zelf heeft ingevuld ("je slaap was kort vannacht, daarom...") — dit is precies waar TrainingKompas zich onderscheidt van elke concurrent.

### Fase 5 — Eerste PR

**Emoties:** trots, een moment dat om erkenning vraagt. **Twijfels:** nauwelijks — dit is een positief moment, mits de app het ook als zodanig behandelt. **Verwachtingen:** directe, zichtbare bevestiging op het moment zelf, niet pas bij het bekijken van statistieken achteraf. **Mogelijke afhakers:** een PR die onopgemerkt voorbijgaat omdat de badge te subtiel is, of net zo behandeld wordt als een gewone set. **Kans om te verrassen:** een kort, oprecht vierings-moment (zie Hoofdstuk 1, sectie 1.15: ingehouden oprechtheid, geen overdreven spektakel) — precies het soort emotioneel detail dat de huidige, functioneel-correcte maar emotioneel onderbenutte PR-badge (Product Audit, sectie 11) nog niet volledig waarmaakt.

### Fase 6 — Eerste week

**Emoties:** gewenning, met wisselende motivatie afhankelijk van hoe de eerste paar sessies aanvoelden. **Twijfels:** "ga ik dit volhouden, of wordt dit weer een app die ik na twee weken vergeet?" **Verwachtingen:** merkbare herhaling van waarde — niet elke dag een nieuwe functie ontdekken, maar wel elke dag hetzelfde niveau van bruikbaar advies. **Mogelijke afhakers:** technische frictie die zich herhaalt (een bug, een trage sync), of het gevoel dat de eerste-indruk-belofte niet wordt volgehouden. **Kans om te verrassen:** een korte, niet opdringerige samenvatting aan het eind van de week ("dit is wat je deze week bereikt hebt") — een vroege vorm van de weekvoortgang die de Product Audit aanbeveelt voor Dashboard 2.0.

### Fase 7 — Eerste maand

**Emoties:** groeiend vertrouwen als het patroon klopt, groeiende frustratie als het niet klopt. **Twijfels:** of de app na de eerste-indruk-fase nog steeds evenveel waarde toevoegt. **Verwachtingen:** de eerste zichtbare trends (gewicht, HRV, volume) — het moment waarop losse datapunten een verhaal beginnen te vertellen. **Mogelijke afhakers:** het ontbreken van duidelijke trendweergave, of een gevoel dat de app "hetzelfde blijft zeggen" zonder te leren van de opgebouwde geschiedenis. **Kans om te verrassen:** een advies dat expliciet verwijst naar een patroon uit de afgelopen maand ("je herstelt sneller na rustdagen dan drie weken geleden") — het moment waarop de belofte "AI onthoudt en wordt scherper" (Hoofdstuk 1, sectie 1.9) voor het eerst voelbaar wordt.

### Fase 8 — Eerste programma (meerdere weken, periodisering)

**Emoties:** betrokkenheid bij een groter geheel in plaats van losse trainingen. **Twijfels:** of de gegenereerde periodisering (hypertrofie → kracht → deload/peak) daadwerkelijk klopt met wat het lichaam op dat moment aankan. **Verwachtingen:** dat het programma zich aanpast als de werkelijkheid afwijkt (een gemiste training, een slechte week) in plaats van star vast te houden aan het oorspronkelijke plan. **Mogelijke afhakers:** een programma dat na een gemiste week niet herverdeelt en daardoor "kapot" aanvoelt. **Kans om te verrassen:** automatische, uitgelegde herverdeling van het resterende programma na een onderbreking — functionaliteit die er in de kern al is (`heergenereerResterendeWeken()`), maar waarvan de Product Audit aanbeveelt te bevestigen of dit al proactief gebeurt.

### Fase 9 — Eerste wearable-koppeling

**Emoties:** verwachting van gemak ("eindelijk hoef ik mijn HRV niet meer over te typen"). **Twijfels:** vertrouwen in de OAuth-koppeling, zorgen over privacy van gezondheidsdata. **Verwachtingen:** een soepele, eenmalige koppeling die daarna onopgemerkt blijft werken. **Mogelijke afhakers:** de huidige beperking dat de Fitbit-koppeling via een Testing-mode Google Cloud-app loopt met wekelijkse tokenvervaldatum (Product Audit, sectie 4.8 en 14) — een gebruiker die na een week merkt dat de koppeling "gewoon stopt" verliest vertrouwen op een manier die moeilijk te herstellen is. **Kans om te verrassen:** een duidelijke, geruststellende melding vóór een token dreigt te verlopen, in plaats van een stille koppelingsbreuk.

### Fase 10 — Eerste gym-koppeling (ART CrossFit of toekomstige box)

**Emoties:** een gevoel van erbij horen, gecombineerd met lichte onzekerheid over wat een coach nu wel en niet kan zien. **Twijfels:** privacy — "ziet mijn coach nu al mijn persoonlijke data, of alleen wat ik deel?" **Verwachtingen:** transparantie over het drie-laags zichtbaarheidsmodel (personal/gym/global) zonder dat de gebruiker de technische term ooit hoeft te horen. **Mogelijke afhakers:** onduidelijkheid over wat gedeeld wordt, wat kan leiden tot terughoudendheid in het invullen van gevoelige data (bijvoorbeeld condities zoals bij Persona 8, Marieke). **Kans om te verrassen:** een simpele, geruststellende uitleg op het moment van gym-koppeling ("je coach ziet je trainingen, niet je persoonlijke notities") die vertrouwen opbouwt in plaats van afbreekt.

### Fase 11 — Langdurig gebruik (maanden tot jaren)

**Emoties:** rustig vertrouwen, een gevoel van continuïteit — zie Hoofdstuk 1, sectie 1.14/1.15. **Twijfels:** in deze fase vooral gericht op de vraag of de app blijft evolueren, of dat het "af" aanvoelt en stil komt te staan. **Verwachtingen:** dat nieuwe features (wearable-uitbreiding, HYROX-splits, social-laag) organisch aansluiten bij wat de gebruiker al kent, niet als losse toevoegingen aanvoelen. **Mogelijke afhakers:** stilstand in ontwikkeling, of — een reëel risico bij opschaling naar meerdere gyms — een gevoel dat de persoonlijke aandacht verwatert naarmate de gebruikersbasis groeit (zie Hoofdstuk 1, sectie 1.16). **Kans om te verrassen:** een jaaroverzicht of vergelijkbaar moment dat expliciet laat zien hoeveel geschiedenis de app inmiddels heeft opgebouwd — het "coach-geheugen" tastbaar maken.


---

## Deel 4 — User Stories

Onderstaande 79 user stories zijn verdeeld over twaalf categorieën en direct gekoppeld aan de persona's uit Deel 2, zodat elke story herleidbaar is naar een concrete gebruikersbehoefte in plaats van een aanname.

### Onboarding (6)
1. Als **Fleur (beginnende CrossFitter)** wil ik bij mijn eerste opening een korte, simpele intake doorlopen, zodat ik niet meteen overweldigd word door geavanceerde opties.
2. Als **Ruud (CrossFit Masters)** wil ik tijdens onboarding mijn leeftijd en ervaringsniveau kunnen opgeven, zodat mijn eerste advies al leeftijdsbewust is.
3. Als **nieuwe gebruiker** wil ik na onboarding direct een eerste, persoonlijk aanvoelend advies zien, zodat ik meteen begrijp wat de app anders maakt.
4. Als **Marieke (revalidatiesporter)** wil ik tijdens onboarding een blessure of aandoening kunnen aangeven, zodat mijn eerste programma daar meteen rekening mee houdt.
5. Als **terugkerende gebruiker** wil ik de onboarding niet opnieuw hoeven doorlopen, zodat ik niet als nieuwkomer behandeld word.
6. Als **Sanne (HYROX-atleet)** wil ik tijdens onboarding mijn specifieke sport kunnen kiezen, zodat mijn eerste sportcontext meteen klopt.

### Dashboard (6)
7. Als **Ruud** wil ik op het dashboard in één oogopslag mijn dagfactor zien, zodat ik weet wat ik vandaag kan verwachten.
8. Als **gebruiker** wil ik één duidelijke "vandaag"-actie op mijn dashboard zien, zodat ik niet zelf hoef uit te zoeken wat de volgende stap is.
9. Als **Ruud** wil ik mijn weekvoortgang als balk zien, zodat ik weet hoeveel van mijn geplande trainingen ik al heb gedaan.
10. Als **Daan (krachtsporter)** wil ik een mini-trend van mijn belangrijkste KPI's op het dashboard zien, zodat ik niet apart naar Stats hoef te navigeren voor een snel overzicht.
11. Als **gebruiker** wil ik een mini-versie van de spierherstel-heatmap op het dashboard zien, zodat de sterkste feature van de app meteen zichtbaar is bij het openen.
12. Als **Fleur** wil ik een eenvoudige, niet overweldigende dashboardweergave zien, zodat ik me niet laat afschrikken door cijfers die ik nog niet begrijp.

### Workout (7)
13. Als **Ruud** wil ik mijn vaste Training A/B met één tik kunnen starten, zodat ik geen tijd verlies vóór het opwarmen.
14. Als **Daan** wil ik supersets kunnen loggen binnen dezelfde flow als reguliere sets, zodat mijn krachttraining niet wordt vertraagd door aparte schermen.
15. Als **gebruiker** wil ik dat de rusttimer automatisch start na het opslaan van een set, zodat ik niet handmatig een timer hoef in te stellen.
16. Als **Ruud** wil ik dat de rusttimerduur wordt gesuggereerd op basis van mijn RPE, zodat zware sets automatisch meer rust krijgen.
17. Als **Fleur** wil ik tijdens een oefening een techniekvideo kunnen bekijken, zodat ik zeker weet dat ik de beweging goed uitvoer.
18. Als **Sanne** wil ik een gecombineerde kracht- en cardiotraining (brick) kunnen loggen in één sessie, zodat mijn HYROX-training niet kunstmatig gesplitst wordt.
19. Als **gebruiker** wil ik de plate calculator direct vanuit het logscherm kunnen openen, zodat ik niet hoef te schakelen tussen schermen tijdens een zware set.

### Logging (7)
20. Als **gebruiker** wil ik gewicht en reps met grote stappenknoppen kunnen invoeren, zodat ik tijdens een training niet op een klein toetsenbord hoef te tikken.
21. Als **Ruud** wil ik een losse oefening kunnen loggen buiten mijn vaste schema om, zodat ik flexibel kan reageren op wat mijn box die dag aanbiedt.
22. Als **gebruiker** wil ik dat mijn vorige sessie op dezelfde oefening zichtbaar is tijdens het loggen, zodat ik direct kan vergelijken zonder terug te bladeren.
23. Als **gebruiker** wil ik dat een dubbele tik op "opslaan" nooit tot een dubbele registratie leidt, zodat mijn historie betrouwbaar blijft.
24. Als **Daan** wil ik machine-instellingen (pin-stand, zithoogte) per oefening kunnen opslaan, zodat ik ze niet elke sessie opnieuw hoef te zoeken.
25. Als **gebruiker zonder internetverbinding** wil ik toch een training kunnen loggen, zodat een slechte gym-wifi mijn sessie niet blokkeert.
26. Als **gebruiker** wil ik een sessie kunnen bewerken nadat ik hem heb afgerond, zodat ik een fout achteraf kan corrigeren.

### AI Coach (8)
27. Als **Ruud** wil ik bij elk advies zien welke data en welke berekening zijn gebruikt, zodat ik het advies kan vertrouwen in plaats van moeten aannemen.
28. Als **gebruiker** wil ik altijd de optie hebben om een AI-advies naast me neer te leggen en gewoon te starten, zodat de AI adviseert maar niet dwingt.
29. Als **Daan** wil ik dat de AI-coach mijn sportspecifieke context (kracht, niet CrossFit) meeweegt, zodat het advies niet generiek aanvoelt.
30. Als **Marieke** wil ik dat de AI-coach mijn aangegeven blessure/conditie zichtbaar meeweegt in elk advies, zodat ik me gehoord voel in mijn herstel.
31. Als **gebruiker** wil ik proactief gewaarschuwd worden bij een sterk stijgende trainingsbelasting, zodat ik niet pas achteraf ontdek dat ik te veel heb gedaan.
32. Als **gebruiker** wil ik dat de AI-coach mijn Masters-leeftijd structureel meeweegt, zodat het advies past bij hoe mijn lichaam daadwerkelijk herstelt.
33. Als **gebruiker** wil ik visueel onderscheid zien tussen een AI-vraag, een AI-advies en een AI-waarschuwing in de chat, zodat ik snel de aard van het bericht begrijp.
34. Als **gebruiker** wil ik dat de AI-coach mijn trainingshistorie en PR's meeweegt, zodat het advies scherper wordt naarmate ik langer gebruik maak van de app.

### Analytics (7)
35. Als **Daan** wil ik mijn 1RM-trend per lift over tijd kunnen bekijken, zodat ik mijn krachtprogressie objectief kan volgen.
36. Als **Ruud** wil ik mijn Acute:Chronic Workload Ratio kunnen zien, zodat ik vroeg gewaarschuwd word bij overbelasting.
37. Als **gebruiker** wil ik een plateau-signaal ontvangen wanneer mijn progressie stagneert, zodat ik tijdig kan bijsturen.
38. Als **Sanne** wil ik mijn stationsspecifieke HYROX-tijden kunnen vergelijken over meerdere races, zodat ik mijn zwakste onderdeel kan identificeren.
39. Als **gebruiker** wil ik mijn trainingsvolume per spiergroep over tijd kunnen zien, zodat ik weet of ik een spiergroep structureel verwaarloos.
40. Als **Daan** wil ik mijn huidige mesocyclus kunnen vergelijken met de vorige, zodat ik weet of mijn periodisering daadwerkelijk werkt.
41. Als **gebruiker** wil ik filters op sport, type en spiergroep kunnen combineren in mijn statistieken, zodat ik precies de data zie die voor mij relevant is.

### Recovery (6)
42. Als **Ruud** wil ik dagelijks mijn spierherstel per spiergroep visueel zien, zodat ik weet welke groepen extra rust nodig hebben.
43. Als **Marieke** wil ik expliciet bevestigd zien dat een specifieke regio nog niet volledig hersteld is, zodat ik zonder schuldgevoel rustiger aan kan doen.
44. Als **gebruiker** wil ik vóór mijn dagelijkse check-in al zien wat de invloed van mijn antwoorden op het advies is, zodat de uitlegbaarheid niet pas ná het advies komt.
45. Als **gebruiker** wil ik mijn dagfactor met een korte, begrijpelijke toelichting zien ("HRV goed, slaap te kort"), zodat ik het advies emotioneel kan volgen, niet alleen cijfermatig.
46. Als **Ruud** wil ik gewaarschuwd worden als mijn trainingsbelasting mijn hersteltempo structureel overschrijdt, zodat ik blessures kan voorkomen.
47. Als **gebruiker** wil ik mijn hersteltrend over de afgelopen weken kunnen terugzien, zodat ik niet alleen het huidige moment maar ook de richting ken.

### Wearables (6)
48. Als **Ruud** wil ik mijn Fitbit koppelen zodat mijn HRV automatisch wordt doorgegeven zonder handmatige invoer.
49. Als **gebruiker** wil ik ruim vóór het verlopen van mijn wearable-koppeling een duidelijke melding krijgen, zodat mijn data niet ongemerkt stopt met synchroniseren.
50. Als **Sanne** wil ik mijn wearable ook tijdens duurtraining nauwkeurige hartslag- en pacedata laten doorgeven, zodat mijn cardio-analytics kloppen.
51. Als **gebruiker met een ander merk wearable** wil ik ook Apple HealthKit of Garmin kunnen koppelen, zodat ik niet beperkt ben tot Fitbit.
52. Als **gebruiker** wil ik mijn wearable-koppeling eenvoudig kunnen loskoppelen, zodat ik controle houd over welke data gedeeld wordt.
53. Als **Marieke** wil ik dat objectieve wearable-data mijn eigen inschatting van overbelasting kan bevestigen, zodat ik niet alleen op mijn gevoel hoef te vertrouwen.

### Instellingen (6)
54. Als **gebruiker** wil ik mijn atleetprofiel (leeftijd, gewichtsklasse, ervaringsniveau) kunnen bijwerken, zodat mijn advies blijft kloppen naarmate ik verander.
55. Als **gebruiker** wil ik mijn logboek kunnen exporteren, zodat ik controle houd over mijn eigen data.
56. Als **gebruiker** wil ik mijn account volledig kunnen verwijderen inclusief alle gekoppelde data, zodat ik zeker weet dat niets achterblijft.
57. Als **Marieke** wil ik mijn conditie/aandoeningen kunnen beheren in mijn profiel, zodat deze consistent worden meegewogen in elk advies.
58. Als **Daan** wil ik apparatuurinstellingen per oefening kunnen beheren, zodat mijn machine-presets persoonlijk blijven, ook als de gym gedeelde apparatuur heeft.
59. Als **gebruiker** wil ik mijn taal- en weergavevoorkeuren kunnen instellen, zodat de app aanvoelt als voor mij gebouwd.

### Gym (7)
60. Als **Iris (coach)** wil ik vóór een klasse een overzicht zien van welke leden een lage dagfactor hebben, zodat ik hen tijdig kan aanpassen.
61. Als **Tom (gym owner)** wil ik mijn gym-branding kunnen instellen als laag boven de Trainingskompas-basis, zodat mijn leden zowel mijn merk als het platform herkennen.
62. Als **gym-lid** wil ik begrijpen wat mijn coach wél en niet van mijn data kan zien, zodat ik met vertrouwen gevoelige informatie kan invullen.
63. Als **Iris** wil ik een audit-log van rolwijzigingen binnen mijn gym kunnen inzien, zodat ongeautoriseerde wijzigingen zichtbaar zijn.
64. Als **gym-lid** wil ik oefeningen kunnen delen op gym-niveau, zodat medeleden er ook baat bij hebben zonder dat ik ze los moet doorsturen.
65. Als **Tom** wil ik rollen (lid/coach/manager/owner) aan leden kunnen toewijzen, zodat verantwoordelijkheden binnen mijn gym duidelijk zijn.
66. Als **nieuw gym-lid** wil ik via e-mailbevestiging aan een gym gekoppeld worden, zodat spook-accounts en verkeerde koppelingen worden voorkomen.

### Social (6)
67. Als **Fleur** wil ik zien wanneer een medelid van mijn box een PR haalt, zodat ik me onderdeel voel van een gemeenschap.
68. Als **gym-lid** wil ik kunnen deelnemen aan een gym-breed weekdoel, zodat trainen ook een gedeelde inspanning wordt.
69. Als **Ruud** wil ik desgewenst een oefening of programma met een specifiek persoon kunnen delen, zonder dat het meteen voor de hele gym zichtbaar wordt.
70. Als **gebruiker** wil ik zelf kunnen kiezen of ik meedoe aan een leaderboard, zodat sociale vergelijking nooit verplicht aanvoelt.
71. Als **Marieke** wil ik social-functionaliteit kunnen uitschakelen of negeren, zodat vergelijking met anderen mijn herstelproces niet ontmoedigt.
72. Als **Iris** wil ik als coach een gedeelde prestatie van een lid in de les kunnen benoemen, zodat erkenning niet alleen digitaal maar ook sociaal plaatsvindt.

### Programma's (7)
73. Als **Ruud** wil ik een meerweeks programma laten genereren met een concreet peakdoel en datum, zodat mijn periodisering aantoonbaar naar dat doel toewerkt.
74. Als **Daan** wil ik zelf periodiseringsparameters (duur, dagen per week, afwijkende dagen) kunnen aanpassen, zodat het gegenereerde programma aansluit bij mijn eigen inzicht.
75. Als **gebruiker** wil ik dat een gemist trainingsblok automatisch en uitgelegd wordt herverdeeld, zodat een onderbreking mijn programma niet "kapot" maakt.
76. Als **Sanne** wil ik een programma kunnen genereren dat kracht- en cardiobelasting gecombineerd periodiseert, zodat mijn HYROX-voorbereiding niet kunstmatig gesplitst wordt.
77. Als **gebruiker** wil ik een gegenereerd programmablok kunnen uitklappen om te zien wat elke week concreet inhoudt, zodat ik vertrouwen heb vóórdat ik begin.
78. Als **Iris (coach)** wil ik een programma aan een specifiek lid kunnen toewijzen, zodat ik programmering en logging kan scheiden van mijn eigen trainingen.
79. Als **gebruiker** wil ik een lopend programma kunnen verwijderen of stopzetten met duidelijke bevestiging, zodat ik nooit per ongeluk voortgang verlies.


---

## Deel 5 — Jobs To Be Done

Dertig Jobs To Be Done, gegroepeerd rond de momenten waarop een gebruiker TrainingKompas daadwerkelijk "inhuurt" om een concreet probleem op te lossen — inclusief een korte onderbouwing van het belang, omdat een JTBD zonder rationale een aanname blijft in plaats van een ontwerpgrondslag.

**Dagelijkse gereedheid**
1. Wanneer ik 's ochtends wakker word na een slechte nacht, wil ik direct weten of ik mijn geplande training moet aanpassen, zodat ik niet blind een te zwaar schema volg. *Belangrijk omdat dit exact het probleem is dat de dagfactor-motor oplost — zonder deze job verliest die functie haar bestaansreden.*
2. Wanneer mijn HRV structureel daalt over meerdere dagen, wil ik dat vroeg gesignaleerd krijgen, zodat ik kan bijsturen vóór overtraining optreedt. *Onderbouwt de noodzaak van trendweergave, niet alleen momentopnames (zie Analytics, Deel 4).*
3. Wanneer ik twijfel of ik vandaag wel of niet moet trainen, wil ik een concreet, beargumenteerd advies krijgen in plaats van zelf te moeten gokken. *Kern van de AI-coach-belofte.*
4. Wanneer ik een pijnlijke spiergroep voel, wil ik kunnen aangeven waar, zodat mijn training daar automatisch rekening mee houdt. *Onderbouwt de conditie-check-in als verplicht, niet optioneel onderdeel van de flow.*

**Tijdens de training**
5. Wanneer ik een zware set net heb afgerond, wil ik niet zelf een timer hoeven instellen, zodat mijn rust meteen en correct begint. *Directe onderbouwing voor rusttimer-auto-start (hoogste-impact quick win, Product Audit sectie 8.*
6. Wanneer ik twijfel over de juiste schijfcombinatie, wil ik dat direct kunnen zien, zodat ik geen tijd verlies aan rekenen tussen sets. *Onderbouwt de plaats van de plate calculator in de kernflow, niet als losstaande tool.*
7. Wanneer ik een oefeningstechniek niet meer zeker weet, wil ik snel een korte referentie kunnen bekijken, zodat ik veilig kan blijven trainen. *Onderbouwt techniekvideo's als vertrouwenselement, vooral voor Fleur-achtige persona's.*
8. Wanneer ik een superset uitvoer, wil ik niet tussen aparte schermen hoeven schakelen, zodat mijn tempo niet onderbroken wordt. *Onderbouwt het bestaande, dynamische renderpad als iets om te behouden, niet te vereenvoudigen ten koste van functionaliteit.*

**Na de training**
9. Wanneer ik een training heb afgerond, wil ik in één oogopslag zien wat ik heb bereikt, zodat ik het gevoel van vooruitgang meteen ervaar. *Onderbouwt een sessieoverzicht dat meer doet dan cijfers herhalen.*
10. Wanneer ik een PR haal, wil ik dat direct en oprecht erkend zien, zodat het moment niet verloren gaat tussen de rest van de sessie. *Directe onderbouwing voor een emotioneel rijkere PR-viering (Hoofdstuk 1, sectie 1.15).*
11. Wanneer ik twijfel of mijn uitvoering vandaag goed was, wil ik dat kort kunnen navragen bij de AI-coach, zodat ik niet wacht tot de volgende les om het te vragen. *Onderbouwt de coach-chat als toegankelijk náást, niet enkel vóór de training.*

**Herstel en planning**
12. Wanneer ik een rustdag overweeg, wil ik weten of dat trainingskundig verstandig is, zodat ik niet uit schuldgevoel toch ga trainen. *Kernonderbouwing voor de "herstel gaat vóór schema"-filosofie (Hoofdstuk 1, sectie 1.8).*
13. Wanneer mijn programma een week onderbroken wordt door ziekte of drukte, wil ik dat de rest automatisch en verstandig wordt herverdeeld, zodat ik niet met een "kapot" schema achterblijf. *Onderbouwt automatische herverdeling als kernbelofte, niet als edge case.*
14. Wanneer ik een nieuw doel stel (wedstrijd, tiljcijfer), wil ik dat mijn periodisering daar structureel naartoe werkt, zodat losse trainingen een duidelijk doel dienen. *Onderbouwt periodisering als architectuur, niet als losse suggestie.*
15. Wanneer een mesocyclus afloopt, wil ik zien hoe die zich verhoudt tot de vorige, zodat ik weet of mijn aanpak werkt vóór ik verderga. *Onderbouwt cyclusvergelijking als analytics-behoefte.*

**Wearables en data**
16. Wanneer ik mijn wearable koppel, wil ik nooit handmatig hoeven te controleren of de koppeling nog werkt, zodat ik kan vertrouwen op continue, correcte data. *Onderbouwt proactieve meldingen vóór tokenverval (Product Audit sectie 4.8).*
17. Wanneer ik mijn data wil meenemen naar een andere context (arts, fysiotherapeut), wil ik mijn logboek kunnen exporteren, zodat mijn geschiedenis niet vastzit in de app. *Onderbouwt exportfunctionaliteit als vertrouwenselement, niet als bijzaak.*
18. Wanneer ik mijn account wil verwijderen, wil ik zekerheid dat al mijn data daadwerkelijk weg is, zodat ik controle behoud over mijn eigen gezondheidsdata. *Onderbouwt account-verwijdering als geverifieerde, niet enkel gebouwde, functionaliteit.*

**Coach- en gymcontext**
19. Wanneer ik als coach een klasse voorbereid, wil ik snel zien welke leden vandaag aangepast moeten worden, zodat ik niet blind een groepsschema draai. *Onderbouwt het toekomstige coach-dashboard als kernfunctionaliteit voor Fase 3.*
20. Wanneer ik als lid mijn gegevens deel met mijn gym, wil ik precies weten wat gedeeld wordt, zodat ik met vertrouwen gevoelige informatie invul. *Onderbouwt transparante communicatie over het drie-laags zichtbaarheidsmodel.*
21. Wanneer ik als gym owner nieuwe leden verwelkom, wil ik dat zij zich meteen thuis voelen in mijn merk binnen de app, zodat de digitale ervaring aansluit bij de fysieke ervaring in mijn box. *Onderbouwt dynamische branding als skin, niet als vervanging.*
22. Wanneer een lid een PR haalt tijdens een klasse, wil ik dat als coach kunnen benoemen, zodat erkenning ook sociaal plaatsvindt, niet alleen digitaal. *Onderbouwt de koppeling tussen individuele data en groepsdynamiek.*

**Motivatie en langetermijngebruik**
23. Wanneer ik een moeilijke week achter de rug heb, wil ik toch een gevoel van vooruitgang kunnen zien, zodat motivatie niet volledig afhangt van goede weken alleen. *Onderbouwt trendweergave die verder kijkt dan de laatste sessie.*
24. Wanneer ik al maanden gebruik maak van de app, wil ik dat merken aan de kwaliteit van het advies, zodat mijn investering in data invoeren zich beloont. *Directe onderbouwing van "AI onthoudt en wordt scherper" (Hoofdstuk 1, sectie 1.9).*
25. Wanneer ik twijfel of ik moet doorzetten met trainen, wil ik niet gemanipuleerd worden door kunstmatige urgentie, zodat mijn motivatie intrinsiek blijft. *Onderbouwt de grens tegen manipulatieve gamification (Hoofdstuk 1, sectie 1.12).*
26. Wanneer ik mijn eerste jaar in de app afsluit, wil ik een overzicht van mijn geschiedenis kunnen terugzien, zodat de opgebouwde data tastbaar aanvoelt. *Onderbouwt een jaaroverzicht-achtig moment in de langetermijn-journey.*

**Speciale situaties**
27. Wanneer ik herstellende ben van een blessure, wil ik dat mijn beperking structureel wordt meegewogen, niet incidenteel, zodat ik me nooit hoef te verantwoorden voor een lagere belasting. *Directe onderbouwing voor Persona 8 (Marieke).*
28. Wanneer ik een nieuwe sport oppak binnen de app (bijvoorbeeld van kracht naar HYROX), wil ik dat de context volledig meeverandert, zodat oude aannames niet blijven doorwerken. *Onderbouwt sportspecifieke context als volledig, niet gedeeltelijk, omschakelbaar.*
29. Wanneer ik geen wearable heb, wil ik dat de app evengoed volledig functioneert, zodat ik niet als tweederangs gebruiker word behandeld. *Onderbouwt handmatige invoer als volwaardig alternatief, niet als noodoplossing.*
30. Wanneer ik als personal trainer meerdere klanten begeleid, wil ik hen kunnen overzien zonder voor elke klant apart in te loggen, zodat mijn workflow schaalt met mijn klantenbestand. *Onderbouwt de noodzaak van een coach-multiaccountweergave, nog te bouwen in Fase 3.*


---

## Deel 6 — UX Prioriteiten (matrix)

Prioritering volgt de bestaande projectconventie (P0 = kritiek/eerstvolgend, P1 = belangrijk, P2 = waardevol later, P3 = nice-to-have), zoals ook gehanteerd in de Roadmap-governance (Project Kickoff, governance-niveau B).

| Persona | Belangrijkste schermen | Belangrijkste functies | Grootste frustraties | Grootste kansen | Prioriteit |
|---|---|---|---|---|---|
| Ruud (CrossFit Masters) | Dashboard, Training A/B, Spierherstel-heatmap, Progressie | Dagfactor/HRV, uitlegbare AI, ACWR/plateau-detectie | Geen onboarding, geen weekvoortgang, herstel niet op dashboard | Dashboard 2.0, ACWR, PR-tijdlijn | **P0** |
| Fleur (beginnende CrossFitter) | Onboarding, Training (met video), eenvoudig dashboard | Techniekvideo's, geruststellend AI-advies, klasrooster | Overweldigende dichtheid, geen onboarding, jargon zonder uitleg | Onboarding-flow, vereenvoudigde eerste-weergave | **P0** |
| Daan (krachtsporter) | Progressie/Stats, Programma-editor, Plate calculator | 1RM-trend, periodiseringscontrole, apparatuurinstellingen | Te generieke programma's, weinig detail-controle | Mesocyclusvergelijking, transparante AI-berekening | **P1** |
| Sanne (HYROX-atleet) | Cardio-logging, (toekomstig) race-splitsscherm | Gecombineerde kracht/cardio-belasting, stationstijden | Geen HYROX-specifieke ondersteuning | HYROX race-splits/brick-training (al op Roadmap) | **P1** |
| Marieke (revalidatiesporter) | Check-in met condities, aangepaste training, Spierherstel-heatmap | Blessurebewust advies, geruststellende toon | Geen expliciete erkenning van blessuretraject | Herstel-gerichte, niet-prestatiegerichte weergave | **P1** |
| Iris (coach) | (Toekomstig) coach-dashboard, Team-scherm | Ledenoverzicht met dagfactor-signalen, audit-log | Geen centraal overzicht vóór de les | Coach-dashboard (Fase 3) | **P2** |
| Bram (personal trainer) | (Toekomstig) coach-dashboard, programma-editor | Multi-klant-overzicht, coach-notities | Geen overzicht over meerdere klanten | Coach-voor-losse-trainer-functionaliteit | **P2** |
| Tom (gym owner) | (Toekomstig) owner-dashboard, branding-instellingen | Gym-brede statistieken, dynamische branding | Twijfel of AI coaches vervangt | Owner-dashboard, retentie-inzicht (Fase 4) | **P3** |

**Toelichting bij de prioritering:** Ruud en Fleur krijgen P0 omdat zij de primaire doelgroep direct vertegenwoordigen (Deel 1.1) en omdat hun grootste frustraties (geen onboarding, geen weekvoortgang) al als Must Have in de Product Audit zijn geïdentificeerd. Daan, Sanne en Marieke zijn P1: hun behoeften bouwen voort op reeds bestaande of geplande functionaliteit (periodisering, HYROX op de Roadmap, conditie-check-in) en vragen vooral om verdieping, niet om nieuwe fundamenten. Iris en Bram zijn P2 omdat hun kernbehoefte (coach-dashboard) een Fase 3-bouwsteen is die nog niet bestaat. Tom is P3: relevant voor de visie en architectuur, maar pas actief zodra Fase 4 concreet wordt.

---

## Deel 7 — Ontwerpregels

Onderstaande regels zijn direct afgeleid uit de doelgroepen, persona's en journey hierboven — niet uit algemene UX-best-practices. Elke regel benoemt expliciet welke persona of bevinding de regel rechtvaardigt. Deze regels zijn bindend voor elke toekomstige sprint (zie ook Hoofdstuk 1, sectie 1.13).

**Maximaal aantal tikken.** Kernacties tijdens een training (set loggen, gewicht aanpassen, rusttimer starten) mogen nooit meer dan twee tikken kosten vanaf het logscherm. Rechtvaardiging: Ruud en Daan trainen met hoge frequentie (4-5x/week) — elke overbodige tik schaalt met gebruiksfrequentie tot merkbare frictie (Deel 4, Workout/Logging user stories 13-26).

**Minimale lettergrootte.** Geen interactieve tekst kleiner dan 14px, kerncijfers (gewicht, reps, dagfactor) minimaal 16px. Rechtvaardiging: de doelgroep is niet uitsluitend jong (Ruud 51, Marieke 58) en leest vaak onder gym-verlichting of tijdens fysieke inspanning — kleine tekst is hier geen esthetische keuze maar een bruikbaarheidsrisico.

**Informatiehiërarchie.** Elk scherm toont maximaal één primaire actie boven de vouw; secundaire informatie (historie, details) is beschikbaar maar niet dominant. Rechtvaardiging: Fleur's frustratie met overweldigende dichtheid (Persona 2) staat rechtstreeks tegenover Ruud en Daan's behoefte aan detail (Persona 1 en 3) — de oplossing is nooit "minder functionaliteit", maar bewuste gelaagdheid per scherm.

**Foutpreventie.** Destructieve acties (verwijderen, programma stopzetten) vereisen een expliciete, gestileerde bevestiging; niet-destructieve acties (set aanpassen) vereisen dat niet. Rechtvaardiging: user story 79 (programma verwijderen) en de bestaande dubbel-klik-bescherming — foutpreventie moet schalen met de ernst van de actie, niet uniform overal hetzelfde gewicht krijgen.

**Bevestigingen.** Elke schrijfactie toont een zichtbare bevestiging van slagen of falen binnen twee seconden. Rechtvaardiging: rechtstreeks afgeleid van de datafilosofie "data zwijgt nooit stil" (Hoofdstuk 1, sectie 1.10) en de DEC-006-les.

**AI-interacties.** Elk AI-advies toont verplicht: (1) de gebruikte data, (2) de kernredenering, (3) een gelijkwaardige "negeer dit advies"-optie. Rechtvaardiging: kernwaarde uitlegbaarheid (Hoofdstuk 1, sectie 1.9) en user stories 27-28.

**Toegankelijkheid.** Interactieve elementen krijgen aria-labels; contrastratio's voldoen aan WCAG AA op kerntekst; geen informatie wordt uitsluitend via kleur overgebracht. Rechtvaardiging: de huidige codebase telt slechts drie toegankelijkheidsattributen op 8.640 regels (Product Audit, sectie 6) — dit is geen edge-case-eis maar een basisverplichting gezien de leeftijdsspreiding van de doelgroep.

**Notificaties.** Notificaties zijn functioneel (wearable-tokenverval, geplande training, coach-bericht) en nooit puur activatiegedreven ("kom terug, we missen je"). Rechtvaardiging: sluit direct aan bij het principe tegen manipulatieve motivatiemechanismen (Hoofdstuk 1, sectie 1.12) en JTBD 25.

**Onboarding.** Onboarding duurt maximaal vijf stappen, eindigt altijd in een concreet, gepersonaliseerd eerste advies, en is overslaanbaar zonder functieverlies voor wie liever direct begint. Rechtvaardiging: Fase 2 van de Customer Journey (Deel 3) en user stories 1-6; de huidige, volledig ontbrekende onboarding is het duidelijkste, breedst gedragen gat in de hele audit.

**Herstel vóór prestatie in visuele hiërarchie.** Op elk scherm waar beide zichtbaar zijn (dashboard, sessieoverzicht), krijgt herstel/dagfactor-informatie ten minste evenveel visuele prominentie als prestatiecijfers. Rechtvaardiging: rechtstreekse vertaling van de trainingsfilosofie (Hoofdstuk 1, sectie 1.8) naar een concrete, toetsbare regel.

**Personalisatie mag het merk nooit overschaduwen.** Gym-branding en toekomstige ledenpersonalisatie mogen kleur en logo aanpassen, maar de naam "Trainingskompas" blijft in elke configuratie volledig leesbaar zichtbaar. Rechtvaardiging: DEC-010, Brand Identity, en user story 61 (Tom, gym owner).

---

## Deel 8 — Validatie

### Aannames die al onderbouwd zijn

Door de **Product Audit**: de functionele sterkte van AI-coach en spierherstel-heatmap (kwantitatief onderbouwd via codebase-analyse: 459 functies, sportspecifieke `SPORT_BLOCKS`, uitlegbare `buildCtx()`); het vrijwel volledig ontbreken van gamification (kwantitatief: één PR-badge, geen streaks/doelen); het vrijwel ontbreken van micro-interacties (kwantitatief: 1 `@keyframes`, 8 `transition`-regels); het ontbreken van onboarding (geen enkele onboarding-gerelateerde code gevonden); de merkidentiteit-mismatch tussen documentatie en daadwerkelijke code (Barlow Condensed/cyaan in code vs. Poppins/teal in Brand Identity).

Door de **huidige codebase**: de architecturale keuzes die de trainingsfilosofie ondersteunen zijn daadwerkelijk geïmplementeerd, niet enkel gepland — periodisering afgedwongen in code (niet enkel AI-suggestie), RLS op alle 31 tabellen (DEC-007), sportspecifieke AI-context daadwerkelijk gesplitst (`SPORT_BLOCKS`), het drie-laags zichtbaarheidsmodel volledig gebouwd inclusief UI-laag (migratie v333, bevestigd in CURRENT_STATE.md).

Door **bestaande gebruikers (ART CrossFit)**: de behoefte aan social/competitief-functionaliteit is niet aangenomen maar expliciet gevalideerd — DEC-008 legt vast dat dit concreet is gevraagd door leden en coaches, niet intern bedacht. Dit is de enige persona-behoefte in dit hoofdstuk die al buiten de codebase en de audit om is bevestigd door daadwerkelijke gebruikers.

### Aannames die nog gevalideerd moeten worden

De precieze samenstelling en details van Persona's 2 tot en met 8 (Fleur, Daan, Sanne, Bram, Iris, Tom, Marieke) zijn archetypes, samengesteld uit de doelgroepbeschrijving in het Product Book en logische afleidingen daaruit — geen van deze persona's is op dit moment onderbouwd met een individueel interview of gebruikerstest. In het bijzonder: of beginnende CrossFitters (Fleur) daadwerkelijk binnen de scope van TrainingKompas vallen of beter bediend worden door de coach die hun schema bepaalt, is een aanname die om beleidsmatige verduidelijking vraagt, niet alleen om UX-onderzoek.

De exacte vorm van het social/competitief-traject (leaderboards, teams, badges, of een combinatie) is bevestigd als "wordt gebouwd" (DEC-008) maar niet als specifieke vorm — de Roadmap noemt dit expliciet nog te bepalen, "eerste stap: kort met ART CrossFit ophalen wat men precies bedoelt met 'behoefte'."

De aanname dat rusttimer-auto-start en gewicht/reps-steppers de hoogste-impact verbeteringen zijn in de trainingsflow (Deel 4, Deel 6) is afgeleid uit logische redenering (frequentie × frictie) en de Product Audit, maar niet gemeten met daadwerkelijke gebruikstijdmetingen.

De behoeften van Bram (zelfstandige personal trainer) en Tom (gym owner) zijn volledig afgeleid van de architectuur die er al is (rollen-/entitlementschema) en de Roadmap-richting (Fase 3-5) — geen van beide persona's vertegenwoordigt op dit moment een daadwerkelijk gesproken gebruiker, in tegenstelling tot de ART CrossFit-doelgroep.

### Welke interviews en tests later nodig zijn

- **Korte interviews met 4-6 ART CrossFit-leden** verspreid over ervaringsniveau (van net begonnen tot ervaren Masters-atleet), om de Fleur- en Ruud-persona's te toetsen tegen echte antwoorden op de vragen uit Deel 1 (frustraties, digitale vaardigheden, verwachtingen).
- **Een kort gesprek met de coaches van ART CrossFit** specifiek over de vorm van social/competitief (zoals de Roadmap al voorschrijft), om Persona 6 (Iris) te onderbouwen vóórdat het coach-dashboard wordt ontworpen.
- **Gebruikstijdmeting tijdens een echte trainingssessie** (bijvoorbeeld via schermopname, zoals al gedaan voor de Product Audit) specifiek gericht op het aantal tikken en de tijd tussen sets, om de aanname achter de rusttimer-auto-start-prioriteit te bevestigen of bij te stellen.
- **Validatie van de Marieke-persona bij een daadwerkelijke revalidatiesporter** binnen of buiten ART CrossFit, om te bevestigen of de huidige conditie-check-in functionaliteit daadwerkelijk het geruststellende effect heeft dat in Deel 2 en Deel 3 wordt aangenomen.
- **Een verkennend gesprek met minimaal één externe boxeigenaar** (niet ART CrossFit) zodra Fase 4 concreet wordt, om te toetsen of Persona 7 (Tom) en de bijbehorende aannames over white-label-behoeften kloppen buiten de context van de eigen Product Owner.
- **A/B-achtige validatie van de onboarding-lengte** (maximaal vijf stappen, regel uit Deel 7) zodra de onboarding-flow is gebouwd, om te bevestigen dat dit de juiste balans is tussen snelheid en personalisatie.


---

## Samenvatting: UX Principles afgeleid uit de doelgroep

Deze samenvatting is de verplichte checklist voor elke toekomstige UX-sprint. Elk ontwerpvoorstel moet aantoonbaar aan onderstaande principes voldoen — waar dat niet zo is, wordt dat expliciet en beargumenteerd vastgelegd, niet stilzwijgend overgeslagen.

1. **Snelheid tijdens de training gaat boven alles.** Maximaal twee tikken voor kernacties tijdens het loggen (Ruud, Daan — hoge trainingsfrequentie).
2. **Herstel krijgt minimaal evenveel visuele prominentie als prestatie.** Op elk scherm waar beide voorkomen (trainingsfilosofie, Hoofdstuk 1.8; Deel 7).
3. **Elk AI-advies toont data, redenering en een gelijkwaardige "negeer dit"-optie.** Nooit een zwarte doos, nooit dwingend (Deel 4, AI Coach; Deel 7).
4. **Onboarding is kort, gepersonaliseerd, en eindigt in een concreet eerste advies.** Maximaal vijf stappen, overslaanbaar (Fleur; Customer Journey Fase 2).
5. **Informatiedichtheid is een bewuste, per-scherm keuze — nooit een toevallig gevolg.** Eén primaire actie boven de vouw; diepgang blijft beschikbaar voor wie het zoekt (spanning Fleur vs. Daan).
6. **Geen enkele schrijfactie faalt stil.** Zichtbare bevestiging van slagen of falen binnen twee seconden (datafilosofie, DEC-006-les).
7. **Destructieve acties krijgen gestileerde, merkeigen bevestiging — geen native systeemdialogen.** Foutpreventie schaalt met de ernst van de actie.
8. **Toegankelijkheid is een basisverplichting, geen edge case.** Aria-labels, WCAG AA-contrast, geen kleur als enige informatiedrager — gezien de reële leeftijdsspreiding van de doelgroep (Ruud 51, Marieke 58).
9. **Notificaties zijn functioneel, nooit puur activatiegedreven.** Geen kunstmatige urgentie, geen "we missen je"-mechanismen (grens tegen manipulatieve gamification, Hoofdstuk 1.12).
10. **Personalisatie — gym-branding of individuele skin — overschaduwt nooit het merk Trainingskompas.** De volledige naam blijft in elke configuratie zichtbaar (DEC-010).
11. **Motivatie-mechanismen zijn laagdrempelig en oprecht, nooit opdringerig.** Een PR wordt kort en oprecht gevierd, geen spektakel; sociale vergelijking is altijd optioneel (Marieke, Deel 4 Social).
12. **Elke feature wordt ontworpen voor de kwetsbaarste relevante persona in de flow, niet alleen voor de meest ervaren gebruiker.** Wat voor Ruud vanzelfsprekend is, moet voor Fleur of Marieke evengoed geruststellend en begrijpelijk blijven.
13. **Wat nog niet gevalideerd is, wordt als aanname behandeld — niet als vaststaand feit.** Zie Deel 8: persona-aannames buiten de bevestigde ART CrossFit-behoefte (DEC-008) blijven onderworpen aan toekomstige validatie vóórdat ze als basis voor grote investeringen dienen.

---

*Einde Hoofdstuk 2. Dit hoofdstuk bouwt voort op Hoofdstuk 1 (Productvisie & Filosofie) en dient als verplichte referentie voor Hoofdstuk 3 en verder (Ontwerpsysteem, Sprintplanning, Featurespecificaties). Waar een toekomstig hoofdstuk afwijkt van een principe uit dit hoofdstuk, wordt dat vastgelegd als expliciete, beargumenteerde uitzondering — analoog aan de bestaande Decision Log-werkwijze.*

