# TrainingKompas Premium Development Handbook

## Hoofdstuk 3 — Product Design Principles & Golden Rules

**Status:** permanent referentiedocument — de "grondwet" van TrainingKompas. Elke toekomstige UX-, UI-, AI-, product- en ontwikkelbeslissing wordt hieraan getoetst.
**Voortbouwend op:** Hoofdstuk 1 (Productvisie & Filosofie), Hoofdstuk 2 (Doelgroepen, Persona's & Customer Journey), de Premium Product Audit, en de bestaande projectdocumentatie (Product Book, Blueprint, Brand Identity, Roadmap, Decision Log).
**Karakter van dit document:** dit hoofdstuk beschrijft geen implementatie. Het beschrijft **waarom** een ontwerpkeuze goed of fout is — de vorige hoofdstukken zeiden wie TrainingKompas is en voor wie; dit hoofdstuk zet dat om in toetsbare wetten.

---

### Inleiding

Een visie (Hoofdstuk 1) en een doelgroepbeeld (Hoofdstuk 2) zijn noodzakelijk maar niet voldoende om een consistente honderden-schermen-grote applicatie te bouwen. Zonder een derde laag — expliciete, toetsbare regels — herhaalt zich onvermijdelijk wat de Product Audit al blootlegde: een technisch fundament dat verder is dan de meeste solo-projecten, met een presentatielaag die inconsistent is gegroeid omdat elke sprint zijn eigen, losse interpretatie van "goed genoeg" hanteerde. Eén `@keyframes`-regel op 8.640 regels code, negentien losse `confirm()`-aanroepen, drie `aria-`/`role`-attributen in de hele applicatie — dit zijn geen incidenten, het zijn het voorspelbare resultaat van bouwen zonder een geschreven grondwet.

Dit hoofdstuk is die grondwet. Het is opgebouwd in tien delen: productprincipes die op het niveau van "waarom bestaat een feature" oordelen, UX- en UI Golden Rules die op het niveau van "hoe gedraagt een scherm zich" oordelen, en vervolgens vijf gespecialiseerde domeinen (workout-ervaring, AI-gedrag, motivatie-ontwerp, toegankelijkheid, performance, emotie) die elk een kwetsbaar onderdeel van TrainingKompas beschermen tegen precies het soort verwatering dat bij groei het makkelijkst optreedt. Het hoofdstuk sluit af met een checklist van meer dan honderd objectief controleerbare regels en een Product Constitution van vijfentwintig wetten — niet als samenvatting ter lering, maar als het document dat letterlijk naast elke Pull Request Review en Sprint Review moet liggen.

Elke regel in dit hoofdstuk is te herleiden tot Hoofdstuk 1, Hoofdstuk 2, de Product Audit, of de bestaande projectdocumentatie. Waar een regel een nieuw ontwerpprincipe introduceert dat nog niet expliciet in eerdere documenten stond, wordt dat benoemd als "nieuw vastgesteld principe voor toekomstige ontwikkeling" — nooit stilzwijgend als vaststaand feit gepresenteerd.

---

## Deel 1 — Product Principles

Achttien productprincipes, elk met beschrijving, rationale, concrete voorbeelden, en een expliciete afbakening van wat niet is toegestaan. Deze principes opereren op het hoogste niveau: ze bepalen of een feature überhaupt gebouwd zou moeten worden, vóórdat er één scherm voor ontworpen is.

### P1 — AI ondersteunt de sporter, maar beslist nooit

**Beschrijving:** de AI-coach adviseert met overtuiging en onderbouwing, maar de gebruiker behoudt in elke situatie de uiteindelijke keuze.
**Rationale:** rechtstreeks afgeleid van de AI-filosofie in Hoofdstuk 1 (sectie 1.9: "AI is coach, geen orakel") en bevestigd door het bestaande coach-advies-scherm, waar "Nee, gewoon starten" evenwaardig naast "Pas aan en start" staat.
**Voorbeelden:** een verlaagd trainingsvoorstel bij een lage dagfactor, met een expliciete optie om het oorspronkelijke schema toch te volgen; een AI-waarschuwing bij stijgende ACWR die de training niet blokkeert maar wel markeert.
**Niet toegestaan:** een AI-advies dat een training automatisch aanpast zonder bevestiging; een interface die de "negeer dit advies"-optie visueel verstopt of kleiner maakt dan de aanbevolen keuze; een AI-functie die een gebruiker verhindert door te gaan met wat hij zelf wil doen.

### P2 — Herstel gaat vóór prestatie

**Beschrijving:** in elke afweging tussen trainingsbelasting en herstel krijgt herstel structureel voorrang, zowel in de onderliggende logica als in de visuele hiërarchie.
**Rationale:** kernonderdeel van de trainingsfilosofie (Hoofdstuk 1, sectie 1.8) en vertaald naar een concrete ontwerpregel in Hoofdstuk 2, Deel 7 ("Herstel vóór prestatie in visuele hiërarchie").
**Voorbeelden:** de dagfactor-motor bepaalt het advies vóórdat een schema wordt getoond; de spierherstel-heatmap krijgt op het dashboard minimaal evenveel ruimte als prestatiecijfers.
**Niet toegestaan:** een prestatiegerichte metric (volume, PR-telling) die prominenter wordt weergegeven dan de actuele hersteltoestand op hetzelfde scherm; een programma dat vasthoudt aan een geplande belasting ondanks een structureel dalende dagfactor-trend.

### P3 — Elk advies is uitlegbaar, zonder uitzondering

**Beschrijving:** geen enkele AI-uitspraak, geen enkele automatisch gegenereerde aanbeveling, verschijnt zonder een zichtbare verwijzing naar de gebruikte data en de toegepaste redenering.
**Rationale:** het meest fundamentele principe uit het Product Book zelf, letterlijk overgenomen in Hoofdstuk 1 (sectie 1.9) als "uitlegbaar boven indrukwekkend".
**Voorbeelden:** "Dagfactor 0,82 — HRV goed, slaap te kort" in plaats van enkel een cijfer; een programma-aanpassing die vermeldt welke gemiste training de herverdeling heeft veroorzaakt.
**Niet toegestaan:** een advies met uitsluitend een cijfer of label zonder toelichting; een "meer info"-knop die de uitleg optioneel maakt in plaats van standaard zichtbaar.

### P4 — Data moet altijd leiden tot inzicht, nooit tot ruis

**Beschrijving:** elk getal, elke grafiek en elke metric die getoond wordt, moet een concrete vraag van de gebruiker beantwoorden of een concrete actie suggereren.
**Rationale:** vertaalt de datafilosofie (Hoofdstuk 1, sectie 1.10) naar een productcriterium; sluit aan bij de Product Audit-bevinding dat de huidige Stats-schermen krachtig maar dicht beschreven zijn (Product Audit, sectie 5).
**Voorbeelden:** een 1RM-trendlijn die een korte duiding krijgt ("dit is je snelste stijging in twaalf weken") in plaats van enkel een lijn; ACWR die direct een aanbevolen actie toont bij een piek.
**Niet toegestaan:** een statistiekscherm dat data toont "omdat het kan"; een grafiek zonder enige duiding die de gebruiker zelf moet interpreteren zonder context.

### P5 — Elke feature moet trainingskwaliteit verhogen

**Beschrijving:** een nieuwe feature wordt alleen gebouwd als hij aantoonbaar minstens één van de zes doelen uit het Product Book dient: motivatie, personalisatie, inzicht, automatisering, performance, of herstel.
**Rationale:** dit criterium staat al expliciet in het bestaande Skill-document voor de AI Performance Coach en wordt hier bevestigd als blijvend productprincipe.
**Voorbeelden:** de apparatuur-catalogus verhoogt personalisatie en automatisering (geen herhaald zoeken naar machine-instellingen); ACWR/plateau-detectie verhoogt inzicht en herstel.
**Niet toegestaan:** een feature die uitsluitend concurrenten nabootst zonder een van de zes doelen te dienen; functionaliteit die primair bestaat om een investeerder of store-listing te imponeren.

### P6 — Premium betekent rust, eenvoud en vertrouwen — nooit decoratie

**Beschrijving:** premium-uitstraling is het zichtbaar maken van onderliggende kwaliteit (precisie, betrouwbaarheid, zorgvuldigheid), niet een esthetische laag die daar los van staat.
**Rationale:** letterlijk overgenomen uit Hoofdstuk 1, sectie 1.6, waar dit al is vastgesteld als het kernbegrip van "premium" voor TrainingKompas.
**Voorbeelden:** een gestileerde bevestigingsmodal die hetzelfde blokkerende gedrag heeft als een native `confirm()`, maar er merkeigen uitziet; een rustige, ingehouden PR-viering in plaats van confetti.
**Niet toegestaan:** visuele effecten die geen functie dienen; drukte toegevoegd om "premium" te laten aanvoelen zonder onderliggende functionele verbetering.

### P7 — Elke interactie heeft een duidelijk, enkelvoudig doel

**Beschrijving:** een knop, een scherm, een modal dient precies één primair doel; secundaire acties zijn zichtbaar ondergeschikt.
**Rationale:** rechtstreeks afgeleid uit de informatiehiërarchie-regel in Hoofdstuk 2, Deel 7, en bevestigd door de Product Audit-bevinding dat de huidige informatiedichtheid soms overweldigend is voor beginnende gebruikers (Persona Fleur).
**Voorbeelden:** het logscherm heeft als primair doel "set opslaan"; alle overige acties (superset toevoegen, coach vragen) zijn zichtbaar secundair.
**Niet toegestaan:** een scherm met twee of meer gelijkwaardig vormgegeven primaire acties die om aandacht concurreren.

### P8 — Nooit een stille fout

**Beschrijving:** elke actie in de app moet zichtbaar slagen of zichtbaar falen; er bestaat geen "niets gebeurt er" toestand.
**Rationale:** direct voortkomend uit de DEC-006-les (een schrijfactie die maandenlang onopgemerkt faalde) en vastgelegd als niet-onderhandelbaar principe in Hoofdstuk 1, sectie 1.12.
**Voorbeelden:** een offline gelogde set toont een zichtbare wachtrij-indicator; een mislukte synchronisatie toont een concrete foutmelding met een herstelactie.
**Niet toegestaan:** een knop die reageert zonder enige bevestiging van het resultaat; een achtergrondproces dat kan falen zonder dat dit ooit zichtbaar wordt voor de gebruiker.

### P9 — Geen rewrites waar uitbreiding volstaat

**Beschrijving:** elke nieuwe feature wordt eerst getoetst op de vraag of hij past binnen de bestaande architectuur (CSS-variabelen, card-systeem, single-file-aanpak) vóórdat een nieuwe structuur wordt overwogen.
**Rationale:** bestaande, expliciete werkwijze uit de Blueprint, bevestigd in Hoofdstuk 1 sectie 1.12 als niet-onderhandelbaar principe.
**Voorbeelden:** de merkidentiteit-migratie (Hoofdstuk 1, sectie 1.7) via CSS-variabelen-vervanging in plaats van herbouw; nieuwe schermen die het bestaande dynamische renderpad hergebruiken (zoals `renderTrainScreen` al voor zowel Training A/B als losse oefeningen doet).
**Niet toegestaan:** een parallelle, nieuwe manier om hetzelfde te bereiken als een bestaand systeem, zonder expliciete architecturale afweging (zie ook de Product Audit-bevinding over overlap tussen Training A/B, custom trainingen en programma-blokken).

### P10 — Geen feature is "klaar" zonder volledige CRUD- en contentcheck

**Beschrijving:** elke nieuwe entiteit die data opslaat, moet Create, Read, Update én Delete ondersteunen — met bevestiging bij Delete — vóórdat de feature als compleet geldt, en elke gegenereerde structuur moet daadwerkelijk gevuld zijn met verwachte inhoud.
**Rationale:** bestaand, hardgeleerd principe uit het AI Performance Coach Skill-document, ontstaan na een concrete misser (een programmagenerator die lege skeletten toonde als compleet).
**Voorbeelden:** een nieuw type conditie-invoer krijgt altijd ook een verwijderoptie; een gegenereerd programmablok wordt gecontroleerd op daadwerkelijk gevulde weekinhoud, niet enkel op het bestaan van de weekstructuur.
**Niet toegestaan:** een feature die als "af" wordt gerapporteerd terwijl één van de vier CRUD-operaties ontbreekt, zonder dat dit expliciet als openstaand punt wordt gemeld.

### P11 — Het merk Trainingskompas is nooit onderhandelbaar

**Beschrijving:** de volledige naam "Trainingskompas" blijft in elke context — eigen gebruik, gym-branding, toekomstige ledenpersonalisatie — zichtbaar en leesbaar.
**Rationale:** vastgelegd in Decision Log DEC-010 en Brand Identity; expliciet bevestigd als niet-onderhandelbaar principe in Hoofdstuk 1, sectie 1.12.
**Voorbeelden:** een gym-skin past kleur en logo aan, maar toont "Trainingskompas" onverkort; een toekomstig ledenpersonalisatie-model ("experience-motor") verandert nooit de merknaam zelf.
**Niet toegestaan:** afkortingen zoals "KOMPAS" in ruimte-beperkte UI-plekken (bestaande praktijk die volgens Brand Identity al herzien moet worden); een gym-branding die de naam volledig vervangt.

### P12 — Motivatie is intrinsiek gedreven, gamification is een ondersteunende laag

**Beschrijving:** elke motivatiefunctie versterkt het eigen gevoel van vooruitgang en beheersing van de gebruiker; gamification-elementen zijn eerlijk, laagdrempelig en nooit het primaire motivatiemechanisme.
**Rationale:** afgeleid uit de doelgroepbeschrijving (Hoofdstuk 2, Deel 1: intrinsiek gedreven doelgroep) en de expliciete grens tegen overdreven gamification in de Product Audit (sectie 11: "geen over-gamified, past bij serieuze Masters-CrossFit-doelgroep").
**Voorbeelden:** een streak die eerlijk telt op basis van het eigen geplande schema, niet een kunstmatige dagelijkse check-in-eis; een korte, oprechte PR-viering.
**Niet toegestaan:** punten- of levelsystemen die geen relatie hebben met daadwerkelijke trainingsinspanning; opzettelijk vage voortgangsbalken die altijd "bijna klaar" tonen om terugkeer te forceren.

### P13 — Elke sport krijgt een volledig eigen context, nooit een verdunde generieke laag

**Beschrijving:** wanneer een gebruiker van sport wisselt (kracht naar HYROX, CrossFit naar hardlopen), verandert de volledige AI-context mee — niet slechts een label.
**Rationale:** directe voortzetting van het bestaande `SPORT_BLOCKS`-ontwerp en de trainingsfilosofie in Hoofdstuk 1 (sectie 1.8: "sportcontext bepaalt de taal van het advies").
**Voorbeelden:** een HYROX-atleet krijgt combinatie-advies over kracht én cardiobelasting samen, niet twee losse, ongerelateerde adviezen.
**Niet toegestaan:** een "universeel" advies-sjabloon dat voor elke sport hetzelfde blijft op een paar ingevulde variabelen na.

### P14 — Persoonlijke data is en blijft van de atleet

**Beschrijving:** eigenaarschap over data is expliciet gelaagd (persoonlijk/gym/globaal) en de gebruiker bepaalt zelf, per stuk data, welke laag van toepassing is.
**Rationale:** rechtstreeks voortkomend uit de datafilosofie in Hoofdstuk 1 (sectie 1.10) en het reeds gebouwde drie-laags zichtbaarheidsmodel (migratie v333).
**Voorbeelden:** een conditie-aantekening (zoals bij Persona Marieke) blijft standaard persoonlijk, tenzij expliciet gedeeld; een oefening kan bewust gym-breed gedeeld worden.
**Niet toegestaan:** een default-instelling die persoonlijke data automatisch zichtbaar maakt voor een gym of coach zonder expliciete, begrijpelijke actie van de gebruiker.

### P15 — Veiligheid is een voorwaarde voor bestaan, geen add-on

**Beschrijving:** elke nieuwe databron, AI-integratie of externe koppeling wordt pas gebouwd nadat autorisatie en RLS-bescherming zijn ontworpen — niet achteraf toegevoegd.
**Rationale:** direct voortkomend uit de JWT-les op de coach-proxy (v3.3.10) en de volledige RLS-audit (DEC-007), beide bevestigd als niet-onderhandelbaar in Hoofdstuk 1, sectie 1.12.
**Voorbeelden:** elke nieuwe Netlify Function volgt vanaf het ontwerp hetzelfde autorisatiepatroon als de bestaande functies.
**Niet toegestaan:** een functionaliteit die eerst "werkend" wordt opgeleverd en waarvan beveiliging in een latere sprint wordt "nagezet".

### P16 — De doelgroep bepaalt complexiteit, niet de mogelijkheden van de techniek

**Beschrijving:** een feature wordt zo eenvoudig gehouden als de kwetsbaarste relevante persona in die flow nodig heeft, ook als de onderliggende techniek meer zou toestaan.
**Rationale:** rechtstreekse toepassing van UX Principle 12 uit Hoofdstuk 2 ("elke feature wordt ontworpen voor de kwetsbaarste relevante persona in de flow").
**Voorbeelden:** de onboarding-flow (Persona Fleur) toont niet de volledige diepte van filteropties die Persona Daan in Stats wél verwacht.
**Niet toegestaan:** een scherm dat evenveel complexiteit toont aan een beginnende gebruiker als aan een ervaren krachtsporter, "omdat de data er nu eenmaal is".

### P17 — Elke aanname wordt als aanname behandeld tot ze gevalideerd is

**Beschrijving:** persona's, journeys en prioriteiten die niet zijn bevestigd door daadwerkelijke gebruikers (zoals vastgelegd in Hoofdstuk 2, Deel 8) worden niet behandeld als vaststaand feit bij grote investeringsbeslissingen.
**Rationale:** rechtstreeks overgenomen uit Hoofdstuk 2, Deel 8 en de bijbehorende checklist-regel 13.
**Voorbeelden:** de vorm van het social/competitief-traject wordt pas in detail gebouwd na het aangekondigde gesprek met ART CrossFit over wat "behoefte" precies inhoudt (Roadmap, DEC-008).
**Niet toegestaan:** een grote sprint bouwen op een persona-aanname (bijvoorbeeld Persona Tom, gym owner) zonder de validatiestappen uit Hoofdstuk 2, Deel 8 te doorlopen wanneer de impact dat rechtvaardigt.

### P18 — Groei mag de persoonlijke aandacht nooit verwateren

**Beschrijving:** naarmate TrainingKompas meer gyms en gebruikers bedient, blijft elke individuele atleet dezelfde uitlegbare, herstel-eerst-ervaring krijgen als de eerste gebruiker.
**Rationale:** rechtstreeks de lange-termijnvisie uit Hoofdstuk 1, sectie 1.16, en het risico dat daar expliciet wordt benoemd.
**Voorbeelden:** een nieuwe gym-klant krijgt dezelfde AI-kwaliteit en dezelfde herstel-eerst-logica als ART CrossFit, nooit een "afgeslankte" versie om schaal te vereenvoudigen.
**Niet toegestaan:** een "lite"-tier die kernprincipes (uitlegbaarheid, herstel-eerst) laat vallen om meer gebruikers goedkoper te kunnen bedienen.

---

## Deel 2 — UX Golden Rules

Tweeënveertig regels, gegroepeerd per functioneel gebied. Elke regel bevat motivatie, toepassingsgebied, uitzonderingen en de manier waarop de regel getoetst wordt bij reviews.

### Navigatie

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX1 | De bottom-navigatie toont maximaal vijf items en verandert nooit van volgorde tussen schermen. | Voorspelbaarheid is cruciaal voor een app die tijdens fysieke inspanning gebruikt wordt (Hoofdstuk 2, Deel 1). | Alle hoofdschermen | Geen | Visuele controle: identieke volgorde/labels op elk scherm |
| UX2 | Elke actieve navigatiestaat is zichtbaar via kleur én positie, nooit via kleur alleen. | Toegankelijkheidsprincipe (Deel 7) — kleurenblindheid mag geen navigatie-informatie wegnemen. | Bottom-navigatie, tabs | Geen | Contrastcontrole zonder kleurkanaal |
| UX3 | Terugnavigatie (fysieke back-knop, swipe) brengt de gebruiker altijd naar een voorspelbare vorige staat, nooit naar een onverwacht scherm. | Vertrouwen in de app vereist consistente navigatie-logica. | Alle schermen en modals | Actieve trainingssessie mag bevestiging vragen vóór terugnavigatie (zie UX-Foutmeldingen) | Handmatige navigatietest per scherm |
| UX4 | Diepgaande functies (Beheer, apparatuur-catalogus) zijn maximaal drie niveaus diep vanaf een hoofdscherm bereikbaar. | Voorkomt de "verdwaald in instellingen"-ervaring die dichte apps kenmerkt (Product Audit, UI-dichtheid-bevinding). | Profiel, Instellingen, Beheer | Geen | Klikpadtelling per feature |

### Formulieren

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX5 | Numerieke invoer (gewicht, reps, RPE) gebruikt bij voorkeur stappers boven vrij tekstveld. | Rechtstreeks uit Hoofdstuk 2, Deel 4 (user story 20) en de Product Audit-aanbeveling over de bestaande RPE-stepper. | Logscherm, check-in | Vrije tekstinvoer blijft beschikbaar als fallback voor niet-standaardwaarden | Component-inventarisatie per formulier |
| UX6 | Een formulier toont nooit meer dan zeven actieve velden tegelijk zonder groepering. | Cognitieve belasting beperken, vooral relevant voor Persona Fleur (Hoofdstuk 2). | Profiel-bewerken, Programma genereren | Geavanceerde/optionele velden mogen ingeklapt worden | Veldentelling per zichtbare sectie |
| UX7 | Verplichte velden zijn visueel gemarkeerd vóór het invullen begint, niet pas na een foutmelding. | Foutpreventie boven foutafhandeling. | Alle formulieren | Geen | Visuele check op asterisk/label-styling |
| UX8 | Invoer wordt nooit verwijderd bij een fout elders in het formulier. | Voorkomt frustratie bij formulieren met meerdere velden (programma-generator). | Alle multi-veld formulieren | Geen | Testscenario: fout injecteren, overige velden controleren |

### Onboarding

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX9 | Onboarding bestaat uit maximaal vijf stappen en is op elk moment overslaanbaar. | Hoofdstuk 2, Deel 7, direct gekoppeld aan Persona Fleur en de audit-bevinding dat onboarding volledig ontbreekt. | Eerste-gebruik-flow | Geen | Stappenteller in ontwerp-review |
| UX10 | Onboarding eindigt altijd in een concreet, gepersonaliseerd eerste advies — nooit in een leeg dashboard. | Customer Journey Fase 2 (Hoofdstuk 2, Deel 3). | Eerste-gebruik-flow | Geen | Eindscherm-controle: bevat het scherm een concreet advies? |
| UX11 | Onboarding vraagt nooit naar data die pas later in de flow relevant wordt. | Elke vraag moet direct aantoonbaar bijdragen aan het eerste advies. | Eerste-gebruik-flow | Geen | Per veld: koppeling aantonen aan eerste advies |
| UX12 | Terugkerende gebruikers doorlopen onboarding nooit opnieuw, tenzij expliciet zelf gestart via Instellingen. | Hoofdstuk 2, user story 5. | Login/sessie-logica | Herstart na accountherstel is toegestaan | Sessiecontrole op onboarding-vlag |

### Dashboard

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX13 | Het dashboard toont maximaal vijf primaire kaarten boven de vouw. | Voorkomt de huidige overweldigende dichtheid (Product Audit, UI-sectie); direct toetsbaar. | Homescherm | Geen | Kaarttelling boven de fold op referentietoestel |
| UX14 | Het dashboard bevat altijd één duidelijke "vandaag"-actie. | Hoofdstuk 2, user story 8; Product Audit sectie 9 (Dashboard 2.0). | Homescherm | Geen | Visuele check op primaire CTA |
| UX15 | Herstelinformatie staat nooit lager op het dashboard dan prestatie-informatie. | Direct uit Product Principle P2. | Homescherm | Geen | Volgordecontrole in ontwerp |

### Workout

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX16 | Kernacties tijdens het loggen (set opslaan, gewicht aanpassen) kosten maximaal twee tikken. | Hoofdstuk 2, Deel 7; hoogste-frequentie interactie in de hele app. | Trainingsscherm, losse oefening | Geen | Tikanalyse per actie |
| UX17 | De rusttimer start automatisch na het opslaan van een set. | Hoogste-impact quick win uit de Product Audit (sectie 8). | Trainingsscherm | Gebruiker kan dit per sessie uitschakelen met één tik | Functionele test |
| UX18 | Tijdens een actieve training wordt nooit ongevraagd genavigeerd naar een ander hoofdscherm. | Voorkomt dataverlies en onderbreekt de focus niet. | Trainingsscherm | Expliciete gebruikersactie (bijv. coach raadplegen) mag, met terugkeeroptie | Navigatietest tijdens actieve sessie |
| UX19 | Een training kan gepauzeerd worden zonder functieverlies of dataverlies. | Bestaande functionaliteit (sessie pauzeren, data blijft bewaard) wordt hier als blijvende eis vastgelegd. | Trainingsscherm | Geen | Pauzeer/hervat-testscenario |

### Logging

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX20 | Elke logactie toont binnen twee seconden een zichtbare bevestiging van slagen of falen. | Product Principle P8, DEC-006-les. | Alle schrijfacties | Geen | Timing-test op bevestigingsweergave |
| UX21 | Dubbele tikken op eenzelfde opslaan-knop leiden nooit tot dubbele registratie. | Bestaande dubbel-klik-bescherming (v3.3.6-v3.3.7) wordt hier als blijvende eis vastgelegd. | Alle opslaan-acties | Geen | Geautomatiseerde dubbelklik-test |
| UX22 | De vorige sessie op dezelfde oefening is zichtbaar tijdens het loggen zonder extra navigatie. | Hoofdstuk 2, user story 22. | Logscherm | Geen | Visuele check tijdens logflow |
| UX23 | Machine-/apparatuurinstellingen worden onthouden per oefening en per gebruiker. | Hoofdstuk 1, sectie 1.2 (probleem 5); bestaande `exercise_equipment`-architectuur. | Kracht-oefeningen met instelbare apparatuur | Geen | Steekproef: instelling na herhaald bezoek |

### AI-chat

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX24 | Elk AI-bericht toont visueel onderscheid tussen vraag, advies en waarschuwing. | Hoofdstuk 2, user story 33; Product Audit sectie 4.2. | Coach-chat, coach-advies-scherm | Geen | Visuele stijlgids-controle |
| UX25 | Een AI-advies toont altijd een gelijkwaardige "negeer dit advies"-actie naast de aanbevolen actie. | Product Principle P1 en P3. | Coach-advies-scherm | Geen | Interactie-audit per adviestype |
| UX26 | De AI-coach toont een duidelijke "aan het nadenken"-status tijdens verwerking, nooit een onverklaarde stilte. | Product Audit sectie 5 (geen zichtbare wachttoestand geconstateerd). | Coach-chat | Geen | Timing-test op laadstatus |
| UX27 | Chatgeschiedenis blijft doorzoekbaar en herleidbaar naar de context van dat moment (datum, trainingssessie). | Ondersteunt het "coach-geheugen"-principe uit Hoofdstuk 1, sectie 1.14. | Coach-chat-geschiedenis | Geen | Steekproef op contextlabeling |

### Statistieken

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX28 | Elke grafiek toont een korte duiding of aanbevolen actie, nooit uitsluitend ruwe data. | Product Principle P4. | Progressie/Stats-scherm | Geen | Contentcontrole per grafiek |
| UX29 | Filtercombinaties (sport/type/spiergroep) zijn nooit verplicht om een basisoverzicht te zien. | Voorkomt overweldiging voor Persona Fleur, behoudt diepgang voor Persona Daan. | Stats-scherm | Geen | Standaardweergave-test zonder filters |
| UX30 | Lege of onvoldoende-data-staten in statistieken leggen uit wat de gebruiker moet doen om wél inzicht te krijgen. | Zie ook Lege staten hieronder; specifiek voor nieuwe gebruikers zonder historie. | Stats-scherm | Geen | Contentcontrole lege staat |

### Instellingen

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX31 | Elke instelling toont het huidige effect van de instelling, niet alleen de instelnaam. | Uitlegbaarheid geldt ook buiten AI-advies (Product Principle P3, breder toegepast). | Profiel, Instellingen | Geen | Contentcontrole per instelling |
| UX32 | Account- en dataverwijdering vereisen een expliciete, niet-dubbelzinnige bevestigingsstap. | Hoofdstuk 2, user story 56; Product Audit sectie 14 (Play Store-vereiste). | Profiel — accountbeheer | Geen | Functionele verwijdertest |
| UX33 | Wearable-koppelingen tonen proactief de resterende geldigheidsduur vóór verval. | Hoofdstuk 2, JTBD 16; Product Audit sectie 4.8/14. | Profiel — wearables | Geen | Notificatietest vóór tokenverval |

### Zoekfunctie

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX34 | Zoeken binnen oefeningen/programma's toont resultaten binnen 300ms na de laatste toetsaanslag. | Sluit aan bij Performance Principles (Deel 8). | Oefeningbibliotheek, programma-zoekfunctie | Geen | Performance-meting |
| UX35 | Een lege zoekresultatenpagina biedt altijd een alternatief (gerelateerde suggestie, "nieuwe oefening aanmaken"). | Voorkomt een doodlopende zoekactie. | Oefeningbibliotheek | Geen | Contentcontrole lege zoekresultaten |

### Foutmeldingen

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX36 | Elke foutmelding beschrijft wat er misging én wat de gebruiker nu kan doen. | Voorkomt foutmeldingen die alleen technische codes tonen. | Alle schermen | Geen | Contentcontrole per foutmelding |
| UX37 | Destructieve acties gebruiken een gestileerde, merkeigen bevestigingsmodal — nooit een native systeemdialoog. | Product Audit sectie 5/13; negentien `confirm()`-aanroepen geïdentificeerd als te vervangen. | Verwijderacties overal in de app | Geen | Codebase-scan op `confirm()`/`alert()` |
| UX38 | Een mislukte netwerkactie biedt altijd een directe "opnieuw proberen"-actie. | Voorkomt doodlopende paden bij connectiviteitsproblemen. | Alle netwerkafhankelijke acties | Geen | Netwerksimulatietest |

### Lege staten

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX39 | Elke lege staat legt uit waarom het scherm leeg is en wat de eerstvolgende actie is. | Voorkomt verwarring bij nieuwe gebruikers of nieuwe features (drie-laags model, apparatuur-catalogus). | Alle lijstschermen | Geen | Contentcontrole lege staat |
| UX40 | Een lege staat toont nooit een technische placeholder-tekst ("no data found"). | Consistentie met merktoon (Brand Identity). | Alle lijstschermen | Geen | Copyreview |

### Offline gedrag

| # | Regel | Motivatie | Toepassingsgebied | Uitzonderingen | Toetsing |
|---|---|---|---|---|---|
| UX41 | Trainingslogging blijft volledig functioneel zonder internetverbinding. | Hoofdstuk 2, user story 25; bestaande IndexedDB-wachtrij, nog te bevestigen (Product Audit sectie 14). | Trainingsscherm, losse oefening | Geen | Vliegtuigmodus-test |
| UX42 | De gebruiker ziet altijd hoeveel acties in de offline-wachtrij staan en wanneer deze gesynchroniseerd zijn. | Product Principle P8 toegepast op offline-gedrag. | Offline-wachtrij-indicator | Geen | Visuele controle synchronisatiestatus |


---

## Deel 3 — UI Golden Rules

Vijfenveertig regels, gegroepeerd per UI-domein. De bestaande CSS-variabelen-architectuur (Product Audit, sectie 6) wordt hierbij expliciet als sterk fundament erkend — deze regels bouwen daarop voort, ze vervangen het niet.

### Spacing & witruimte

| # | Regel | Motivatie |
|---|---|---|
| UI1 | Alle spacing volgt het bestaande 8/14/16px-grid; geen losse, ad-hoc waarden. | Consistentie is al technisch aanwezig (Product Audit sectie 6) — deze regel bevriest dat als norm. |
| UI2 | Elk scherm bevat minimaal één zone met bewust "lege" ruimte zonder interactief element. | Tegenwicht tegen de huidige, te dichte informatiedichtheid (Product Audit, UX-sectie). |
| UI3 | Kaarten binnen dezelfde lijst hebben identieke interne padding. | Voorkomt visuele ruis door inconsistente kaartopbouw. |
| UI4 | Witruimte rond de primaire CTA is minimaal 1,5× de standaard elementmarge. | Vergroot visuele nadruk zonder extra decoratie (Product Principle P7). |

### Grids

| # | Regel | Motivatie |
|---|---|---|
| UI5 | De app-breedte volgt de bestaande `max-width: 430px`-container; geen full-bleed-content op grotere schermen. | Consistentie op alle mobiele formaten, bestaand patroon. |
| UI6 | Statistiekgrids (stat-boxen) tonen maximaal drie kolommen op mobiel. | Leesbaarheid boven informatiedichtheid, sluit aan bij UX13. |
| UI7 | Grid-elementen binnen eenzelfde rij hebben altijd gelijke hoogte. | Voorkomt "springende" layouts tijdens laden. |

### Kaarten

| # | Regel | Motivatie |
|---|---|---|
| UI8 | Elke kaart heeft een enkelvoudig, herkenbaar onderwerp — nooit twee ongerelateerde datapunten in één kaart. | Directe toepassing van Product Principle P7 op componentniveau. |
| UI9 | Kaartranden gebruiken de bestaande `--r:8px`-radius consistent, zonder uitzondering per scherm. | Systeemconsistentie (Product Principle P9 — geen ad-hoc afwijkingen). |
| UI10 | Interactieve kaarten tonen een duidelijke tap-affordance (schaduw, rand, chevron) — statische kaarten niet. | Voorkomt verwarring tussen klikbare en informatieve kaarten. |

### Buttons

| # | Regel | Motivatie |
|---|---|---|
| UI11 | Primaire knoppen zijn per scherm uniek — nooit twee primaire knoppen naast elkaar. | Product Principle P7. |
| UI12 | Knoppen tonen een zichtbare pressed/loading-state binnen 100ms na tik. | Sluit aan bij Performance Principles (Deel 8) en UX20. |
| UI13 | Destructieve knoppen (verwijderen, account opzeggen) gebruiken een consistente, herkenbare kleurcodering die nergens anders voor niet-destructieve acties wordt gebruikt. | Foutpreventie via consistente visuele taal. |
| UI14 | Minimale touch-target van knoppen is 44×44px, ongeacht visuele grootte van het icoon/label erin. | Toegankelijkheidsstandaard (Deel 7), relevant voor de leeftijdsspreiding van de doelgroep. |

### Chips

| # | Regel | Motivatie |
|---|---|---|
| UI15 | Filterchips tonen hun actieve staat via kleur én een duidelijk selectie-icoon, nooit via kleur alleen. | Toegankelijkheid, zelfde principe als UX2. |
| UI16 | Chips-rijen zijn horizontaal scrollbaar wanneer ze niet passen — nooit afgekapt zonder scroll-indicatie. | Voorkomt onzichtbare, ontoegankelijke opties. |

### FAB (Floating Action Button)

| # | Regel | Motivatie |
|---|---|---|
| UI17 | Een FAB wordt alleen gebruikt voor de meest frequente actie op dat scherm (bijvoorbeeld "Programma toevoegen"). | Voorkomt FAB-inflatie die de primaire-actie-regel (P7) ondermijnt. |
| UI18 | Nooit meer dan één FAB tegelijk zichtbaar op een scherm. | Consistentie met UI11. |
| UI19 | Een FAB overlapt nooit content die op dat moment actief gelezen of ingevuld wordt. | Voorkomt interactieblokkades tijdens formulieren. |

### Bottom navigation

| # | Regel | Motivatie |
|---|---|---|
| UI20 | De bottom-navigatie blijft zichtbaar op alle hoofdschermen, en verdwijnt alleen tijdens een actieve trainingssessie of fullscreen-modal. | Consistentie met UX1; behoudt oriëntatie. |
| UI21 | Icoon en label zijn altijd samen zichtbaar in de bottom-navigatie — nooit icoon zonder label. | Herkenbaarheid boven compactheid, relevant voor minder digitaal-ervaren gebruikers (Persona Fleur, Marieke). |
| UI22 | De iconenset in de navigatie is een consistente lijnstijl-set — geen emoji (zie Product Audit sectie 6/13, quick win). | Consistente weergave tussen toestellen/Android-versies. |

### Dialogs

| # | Regel | Motivatie |
|---|---|---|
| UI23 | Elke dialog heeft exact één primaire en optioneel één secundaire actie — nooit drie of meer gelijkwaardige keuzes. | Voorkomt beslissingsverlamming, sluit aan bij P7. |
| UI24 | Dialogs sluiten nooit automatisch na een timeout bij een onbeantwoorde, belangrijke keuze. | Voorkomt onbedoelde bevestiging/annulering. |
| UI25 | De primaire actie in een destructieve dialog staat nooit visueel identiek aan de primaire actie in een bevestigende dialog. | Voorkomt verwarring tussen "ja, verwijderen" en "ja, doorgaan". |

### Bottom sheets

| # | Regel | Motivatie |
|---|---|---|
| UI26 | Bottom sheets zijn de standaardvorm voor keuzelijsten (zoals reeds gebruikt voor rusttimer-presets, plate calculator-opties). | Bevriest een bestaand, goed werkend patroon als norm. |
| UI27 | Een bottom sheet is altijd sluitbaar via tik buiten de sheet én via een expliciete sluitknop. | Voorkomt "vastzitten" in een modal. |
| UI28 | Bottom sheets met een lange lijst tonen een zichtbare scroll-indicatie. | Voorkomt verborgen opties (relevant bij lange oefeningslijsten). |

### Iconografie

| # | Regel | Motivatie |
|---|---|---|
| UI29 | Iconen gebruiken één consistente stijl (lijnstijl of gevuld, nooit gemengd binnen hetzelfde scherm). | Systeemconsistentie. |
| UI30 | Elk functioneel icoon heeft een tekstlabel of toegankelijke naam — nooit een icoon als enige informatiedrager. | Toegankelijkheid (Deel 7) en herkenbaarheid voor minder ervaren gebruikers. |
| UI31 | Iconen die een actie uitvoeren zijn visueel onderscheiden van iconen die enkel informatie tonen. | Voorkomt onbedoelde acties. |

### Kleuren

| # | Regel | Motivatie |
|---|---|---|
| UI32 | De kleuren uit Brand Identity (`#0B1D2A`, `#0E3B4A`, `#00B894`) zijn de enige toegestane merkkleuren in nieuwe schermen. | Directe toepassing van de vastgestelde huisstijl (Hoofdstuk 1, sectie 1.7). |
| UI33 | Status-kleuren (succes, waarschuwing, fout) zijn systeembreed consistent en nooit hergebruikt voor decoratieve doeleinden. | Voorkomt verwarring tussen betekenisvolle en decoratieve kleur. |
| UI34 | Kleur wordt nooit als enige informatiedrager gebruikt (zie ook UX2, UI15). | WCAG-conformiteit, kleurenblindheid. |
| UI35 | Herstel-gerelateerde kleurcodering (spierherstel-heatmap) blijft consistent tussen alle schermen waar herstel getoond wordt. | Voorkomt dat eenzelfde hersteltoestand er op twee plekken anders uitziet. |

### Typografie

| # | Regel | Motivatie |
|---|---|---|
| UI36 | Poppins Bold voor koppen, Poppins Medium voor body — geen andere lettertypes in nieuwe schermen. | Directe toepassing van Brand Identity. |
| UI37 | Minimale lettergrootte voor interactieve tekst is 14px, kerncijfers minimaal 16px. | Zie Hoofdstuk 2, Deel 7; relevant voor de leeftijdsspreiding van de doelgroep. |
| UI38 | Regelafstand is minimaal 1,4× de lettergrootte bij lopende tekst. | Leesbaarheid, vooral relevant bij uitgebreide AI-adviesteksten. |
| UI39 | Nooit meer dan drie tekstgewichten (bijv. regular/medium/bold) op één scherm. | Voorkomt visuele ruis. |

### Contrast

| # | Regel | Motivatie |
|---|---|---|
| UI40 | Alle kerntekst voldoet aan WCAG AA-contrast (minimaal 4,5:1) tegen de achtergrond. | Toegankelijkheidsstandaard (Deel 7). |
| UI41 | Contrast wordt na elke kleurwijziging opnieuw gecontroleerd — inclusief bij toekomstige gym-branding-skins. | Voorkomt dat een gym-huisstijl per ongeluk de leesbaarheid breekt. |

### Consistentie

| # | Regel | Motivatie |
|---|---|---|
| UI42 | Eenzelfde interactiepatroon (bijv. swipe-to-delete) betekent overal in de app hetzelfde. | Voorkomt dat gebruikers per scherm opnieuw moeten leren hoe iets werkt. |
| UI43 | Nieuwe componenten worden pas ontworpen nadat bevestigd is dat geen bestaand component (card, button, stepper) het doel al dient. | Directe toepassing van Product Principle P9 op UI-niveau. |
| UI44 | Micro-interacties (transities, bevestigingen) gebruiken een beperkte, gestandaardiseerde set duur/easing-waarden — geen ad-hoc animatietijden per scherm. | Voorkomt willekeurig aanvoelende beweging (Product Audit sectie 13: motion-tokens). |
| UI45 | Elk scherm dat de merkidentiteit toont, toont de volledige naam "Trainingskompas" op ten minste één zichtbare plek. | Directe toepassing van Product Principle P11. |

**Expliciet niet toegestaan (UI, samengevat):** afwijkende kleuren buiten het Brand Identity-palet; emoji als functionele iconen; native systeemdialogen voor destructieve acties; meer dan één primaire actie per scherm of dialog; decoratieve animaties zonder functionele bevestiging; tekst kleiner dan 14px voor interactieve elementen; kleur als enige informatiedrager; afkorting van de merknaam in nieuwe UI.


---

## Deel 4 — Workout Experience Principles

De trainingsflow is de meest gebruikte, meest fysiek-belaste interactie in de hele app — vier tot vijf keer per week, vaak onder vermoeidheid, vaak met beperkte aandacht. Onderstaande principes gelden daarom strenger dan voor elk ander deel van de app.

**Maximaal aantal tikken.** Kernacties (set opslaan, gewicht/reps aanpassen, rusttimer starten) kosten nooit meer dan twee tikken vanaf het logscherm (UX16). Dit is geen esthetische voorkeur maar een rekensom: bij vier trainingen per week met gemiddeld twintig sets, is elke bespaarde tik honderden bespaarde tikken per maand.

**Snelheid.** Elke interactie tijdens een actieve training reageert binnen 100ms (zie Deel 8, Performance Principles). Een trainingsscherm dat merkbaar vertraagt tussen sets, breekt het ritme van de training zelf — dit is fundamenteel anders dan vertraging op een browsescherm, waar geduld groter is.

**Focus.** Tijdens een actieve sessie wordt de gebruiker nooit ongevraagd afgeleid (UX18). Meldingen, aanbevelingen voor andere features, of niet-kritieke updates wachten tot na de sessie.

**Feedback.** Elke actie tijdens het loggen bevestigt zichzelf visueel en, waar zinvol, met een korte trilfeedback (zie Deel 7, Accessibility) — nooit door enkel te vertrouwen op de afwezigheid van een foutmelding.

**Rusttimer.** De rusttimer start automatisch na het opslaan van een set (UX17), met een voorgestelde duur gebaseerd op RPE — hoe zwaarder de zojuist voltooide set aanvoelde, hoe langer de voorgestelde rust. Dit is de hoogste-impact verbetering die uit de Product Audit naar voren kwam (sectie 8) en wordt hier vastgelegd als bindend principe, niet als losse suggestie.

**Plate calculator.** De plate calculator is direct bereikbaar vanuit het logscherm zonder schermwissel (bestaand patroon, hier bevroren als norm) en toont exact welke schijven aan elke kant van de stang moeten — nooit enkel een totaalgewicht.

**Supersets.** Supersets worden gelogd binnen dezelfde flow als reguliere sets, zonder aparte modus die apart geleerd moet worden (bestaand, goed ontworpen patroon — zie Hoofdstuk 2, user story 14).

**Progressie.** Elke sessie toont de vorige prestatie op dezelfde oefening zonder extra navigatie (UX22) — progressie moet zichtbaar zijn op het moment dat hij relevant is, niet pas achteraf in Stats.

**PR's.** Een PR wordt op het moment zelf, tijdens de training, kort en oprecht bevestigd — niet pas zichtbaar bij het bekijken van de sessie-samenvatting achteraf. De huidige PR-badge is functioneel correct maar emotioneel onderbenut (Product Audit, sectie 11); dit principe stelt vast dat het moment van herkenning net zo belangrijk is als de registratie zelf.

**Motivatie.** Motivatie tijdens de workout komt uit zichtbare, eerlijke progressie (vorige sessie, PR-erkenning, weekvoortgang) — nooit uit kunstmatige druk (aftellende timers die urgentie suggereren waar geen urgentie is, of meldingen die schuldgevoel oproepen bij een gemiste set).

**Waarom deze regels bindend zijn:** de trainingsflow is het enige onderdeel van de app waar de gebruiker fysiek belast is tijdens het gebruik. Elke afwijking van bovenstaande principes — een extra tik, een vertraagde reactie, een afleidende melding — heeft hier een groter, herhaald effect dan dezelfde afwijking op een browsescherm zou hebben.

---

## Deel 5 — AI Design Principles

De AI-coach is het meest onderscheidende onderdeel van TrainingKompas (Hoofdstuk 1, sectie 1.11) en tegelijk het onderdeel met het grootste risico als het verkeerd wordt ontworpen: een AI die overtuigend maar onterecht zelfverzekerd overkomt, is gevaarlijker dan een AI die zichtbaar terughoudend is.

**Toon.** De AI-coach spreekt als een ervaren, respectvolle coach — direct, zonder overbodige beleefdheidsformules, nooit neerbuigend. De toon past zich aan het ervaringsniveau van de gebruiker aan (jargon voor Daan, eenvoudiger taal voor Fleur) zonder ooit betuttelend te worden.

**Transparantie.** Elk advies toont welke data gebruikt is (Product Principle P3). Dit geldt evenzeer voor positieve als voor waarschuwende adviezen — een compliment zonder onderbouwing ("goed gedaan!") is net zo'n gemiste kans op vertrouwen als een waarschuwing zonder onderbouwing.

**Uitlegbaarheid.** De redenering achter een advies is in gewone taal beschreven, niet in technische termen ("dagfactor 0,82") zonder vertaling ("dat betekent: je hersteltoestand is vandaag lager dan gemiddeld").

**Betrouwbaarheid.** De AI-coach doet nooit een uitspraak die de onderliggende data niet ondersteunt. Bij onvoldoende data (bijvoorbeeld een nieuwe gebruiker zonder trainingshistorie) wordt dat expliciet benoemd in plaats van gecompenseerd met een generiek advies dat zekerder klinkt dan het is.

**Onzekerheid tonen.** Waar de AI-coach een inschatting maakt in plaats van een harde berekening (bijvoorbeeld een PR-waarschijnlijkheid bij twijfelachtige data, zie Product Audit sectie 10), wordt die onzekerheid benoemd — nooit gepresenteerd als vaststaand feit.

**Aanbevelingen.** Elke aanbeveling gaat vergezeld van een gelijkwaardige mogelijkheid om af te wijken (Product Principle P1). De AI-coach adviseert met overtuiging, maar presenteert zichzelf nooit als de enige juiste weg.

**Waarschuwingen.** Een waarschuwing (bijvoorbeeld bij stijgende ACWR) is concreet en actiegericht, nooit vaag alarmerend. "Je belasting steeg deze week 35% — dat is boven je gebruikelijke bandbreedte, overweeg een lichtere sessie" in plaats van "Let op: risico gedetecteerd."

**Motivatie.** De AI-coach motiveert door eerlijke erkenning van geleverde inspanning en zichtbare progressie, nooit door schuldgevoel, vergelijking met anderen zonder toestemming, of kunstmatige urgentie.

**Veiligheid.** Elke AI-integratie is vanaf ontwerp beveiligd tegen ongeautoriseerd gebruik (Product Principle P15, direct voortkomend uit de JWT-les op de coach-proxy). Dit is geen AI-gedragsregel in de klassieke zin, maar een randvoorwaarde voor het bestaan van elke AI-functie.

**Expliciet verboden AI-gedrag:**
- Een advies geven zonder herleidbare databasis.
- Zekerheid suggereren waar de onderliggende data onvoldoende is.
- Een gebruiker overtuigen om door te trainen ondanks duidelijke hersteltekenen, puur om engagement te verhogen.
- Vergelijkingen met andere gebruikers maken zonder expliciete toestemming van beide partijen.
- Generieke, sport- of leeftijdsblinde adviezen geven wanneer specifieke context beschikbaar is (Product Principle P13).
- Het advies van een gebruiker "afdwingen" door de alternatieve keuze te verbergen of te bemoeilijken.
- Toon aanslaan die medisch advies suggereert — de AI-coach ondersteunt trainingskeuzes, geeft geen medische diagnoses (relevant bij Persona Marieke, revalidatie).

---

## Deel 6 — Behavioural Design

Motivatie-ontwerp bij TrainingKompas vertrekt vanuit een expliciete keuze die al in Hoofdstuk 1 (sectie 1.6) en Hoofdstuk 2 (Deel 1, checklist-regel 11) is vastgelegd: de doelgroep is intrinsiek gedreven, en elk motivatiemechanisme moet die intrinsieke drive versterken, nooit vervangen door kunstmatige prikkels.

**Intrinsieke motivatie (primair).** Het belangrijkste motivatiemechanisme is zichtbare, eerlijke vooruitgang: een 1RM-trend die stijgt, een spierherstelpercentage dat verbetert, een AI-advies dat aantoonbaar klopte. Dit vraagt geen game-mechanica — het vraagt goede, tijdige weergave van data die er al is.

**Extrinsieke motivatie (ondersteunend, nooit dominant).** Streaks, weekdoelen en PR-erkenning ondersteunen de intrinsieke motivatie, maar vervangen die nooit. De toets is steeds: zou dit mechanisme ook motiveren als er geen enkel puntensysteem aan hing, puur op basis van de onderliggende prestatie?

**Gamification.** Bewust laagdrempelig, aansluitend bij Persona-onderzoek in Hoofdstuk 2: streaks gebaseerd op het eigen geplande schema (niet een kunstmatige dagelijkse eis), weekdoelen die een eerlijke voortgangsbalk tonen, en een PR-tijdlijn als verzamelscherm van al behaalde records. Uitdrukkelijk niet: levels, punten die inwisselbaar zijn tegen niets concreets, of competitieve ranglijsten die verplicht zichtbaar zijn.

**Beloningen.** Een beloning bij TrainingKompas is altijd informatief (een PR wordt erkend omdat het een feit is) — nooit transactioneel (geen "punten" die ergens voor ingewisseld kunnen worden zonder trainingsrelevantie).

**Streaks.** Een streak telt eerlijk mee op basis van het eigen geplande trainingsschema, met ruimte voor bewust geplande rustdagen zonder streak-verlies. Een streak die breekt door een verstandige, herstel-gedreven rustdag zou het "herstel gaat vóór prestatie"-principe (P2) rechtstreeks tegenspreken — dit wordt expliciet voorkomen in het ontwerp.

**Badges.** Indien gebouwd (laagste prioriteit binnen gamification, zie Product Audit sectie 11), zijn badges gekoppeld aan daadwerkelijke trainingsmijlpalen, niet aan app-gebruik an sich (niet: "5 dagen achter elkaar de app geopend").

**Uitdagingen.** Uitdagingen (toekomstig, onderdeel van het social/competitief-traject, DEC-008) zijn altijd optioneel en nooit zichtbaar als sociale druk voor wie niet meedoet.

**Weekdoelen en maanddoelen.** Doelen worden door de gebruiker zelf ingesteld of door de AI-coach voorgesteld met duidelijke onderbouwing — nooit door het systeem eenzijdig opgelegd als vaste norm voor iedereen.

**Expliciet verboden manipulatieve technieken:**
- Kunstmatige schaarste of countdown-timers zonder functionele urgentie ("nog maar 2 uur om je streak te redden!").
- Notificaties die schuldgevoel opwekken bij afwezigheid ("we missen je!") — reeds vastgelegd als verboden in Hoofdstuk 2, Deel 7.
- Variabele beloningsschema's (zoals bij gokmechanismen) toegepast op trainingsprestatie.
- Sociale vergelijking die niet expliciet is opt-in.
- Voortgangsbalken die opzettelijk vaag blijven ("bijna daar!") om terugkeer te forceren zonder concrete informatie.
- Elk mechanisme dat is ontworpen om gebruiksduur te maximaliseren los van trainingswaarde ("doomscroll"-achtige feeds).

---

## Deel 7 — Accessibility Principles

De huidige codebase telt drie `aria-`/`role`-attributen op 8.640 regels (Product Audit, sectie 6) — een startpunt van vrijwel nul. Deze principes zijn daarom niet optioneel verfijning, maar een basisverplichting, direct gerechtvaardigd door de reële leeftijdsspreiding van de doelgroep (Persona's van 29 tot 58 jaar, Hoofdstuk 2).

**WCAG.** Alle interactieve schermen streven naar WCAG 2.1 AA-conformiteit als minimumniveau, niet als einddoel.

**Lettergroottes.** Minimaal 14px voor interactieve tekst, minimaal 16px voor kerncijfers (gewicht, reps, dagfactor) — vastgelegd in UI37, hier herbevestigd als toegankelijkheidsprincipe.

**Contrast.** Minimaal 4,5:1 voor kerntekst tegen de achtergrond (WCAG AA), gecontroleerd bij elke kleurwijziging inclusief toekomstige gym-skins (UI40-41).

**Kleurenblindheid.** Geen enkele functionele informatie (actieve navigatie, herstelstatus, foutmelding) wordt uitsluitend via kleur overgebracht — altijd gecombineerd met vorm, icoon of tekst (UX2, UI15, UI34).

**Schermlezers.** Elk interactief element krijgt een betekenisvol toegankelijk label; iconen zonder tekstlabel krijgen een `aria-label` die het doel van de actie beschrijft, niet enkel het icoon (bijvoorbeeld "Set opslaan", niet "Vinkje-icoon").

**Touch targets.** Minimale afmeting van 44×44px voor elk tikbaar element (UI14), inclusief voldoende ruimte tussen naast elkaar liggende knoppen om per ongeluk tikken te voorkomen — relevant tijdens training wanneer fijne motoriek vermoeid is.

**Animaties.** Gebruikers met een voorkeur voor verminderde beweging (`prefers-reduced-motion`) krijgen een variant zonder niet-functionele animatie; functionele bevestigingsanimaties (UI44) blijven aanwezig maar worden korter en subtieler.

**Haptische feedback.** Korte trilfeedback ondersteunt kernacties tijdens de training (set opslaan, PR behaald, rusttimer afgelopen) als aanvulling op visuele feedback — nooit als vervanging ervan, en altijd uitschakelbaar via instellingen.

---

## Deel 8 — Performance Principles

Performance is bij TrainingKompas geen technisch detail maar een directe UX-eis: de Product Audit signaleert dat schermen momenteel lijken te wachten op Supabase-respons zonder skeleton-loading (sectie 5), en de Workout Experience Principles (Deel 4) stellen expliciet dat vertraging tijdens een training het ritme van de training zelf breekt.

**Schermen reageren direct.** Elke tik krijgt binnen 100ms een zichtbare reactie (drukstaat, laadindicator) — ook als de onderliggende actie (netwerkverzoek) langer duurt. Dit is het verschil tussen "de app werkt traag" en "de app reageert direct, het netwerk is traag" — laatstgenoemde voelt aantoonbaar minder frustrerend aan.

**Animaties blokkeren nooit de workflow.** Een bevestigingsanimatie (UI44) mag nooit de volgende actie van de gebruiker vertragen — animaties zijn decoratief bovenop functionaliteit, nooit een verplichte wachttijd ervoor.

**Loggen mag nooit vertraging geven.** De trainingsflow (Deel 4) heeft de strengste performance-eis in de hele app: een set opslaan reageert optimistisch (direct zichtbaar als opgeslagen) terwijl de daadwerkelijke synchronisatie op de achtergrond gebeurt, met een duidelijke terugmelding als die synchronisatie alsnog faalt (Product Principle P8).

**Offline werken heeft prioriteit boven perfecte synchronisatie-snelheid.** Een trainingssessie mag nooit wachten op een netwerkverbinding om door te gaan (UX41) — synchronisatie is een achtergrondproces, geen voorwaarde voor gebruik.

**Feedback binnen 100ms waar mogelijk.** Voor puur visuele feedback (knop-drukstaat, selectie-highlight) is 100ms de bovengrens; voor acties die een serverbevestiging vereisen, geldt in plaats daarvan de twee-seconden-regel uit UX20 met een tussentijdse laadstatus.

**Skeleton-loading in plaats van lege schermen.** Elk scherm dat op data wacht (Home, Stats, Coach-geschiedenis) toont een structurele plaatsvervanger die de uiteindelijke lay-out al suggereert, in plaats van een leeg scherm of alleen een spinner (Product Audit, sectie 13, aanbevolen als losse sprint).

---

## Deel 9 — Emotional Design

Deze principes bouwen rechtstreeks voort op Hoofdstuk 1 (sectie 1.15) en breiden de daar genoemde momenten uit naar situaties die pas bij langduriger gebruik ontstaan: een moeilijke trainingsdag, een plateau, en wedstrijdvoorbereiding.

**Eerste opening:** nieuwsgierigheid, welkom voelen, gezien worden — nooit overweldiging. De eerste indruk moet meteen laten zien wat de app anders maakt (Customer Journey Fase 1, Hoofdstuk 2).

**Eerste training:** gefocust vertrouwen — de gebruiker moet voelen dat de app hem niet in de weg zit tijdens fysieke inspanning. Lichte, gezonde spanning ("werkt dit soepel?") mag, frustratie door frictie niet.

**Eerste PR:** oprechte trots, kort en geloofwaardig bevestigd op het moment zelf (Deel 4) — nooit spektakel dat bij herhaling irritant wordt.

**Herstel:** geruststelling, nooit schuldgevoel. Een lager advies op een slechte dag moet aanvoelen als begrepen worden, niet als gefaald hebben (Product Principle P2, direct emotioneel vertaald).

**Moeilijke trainingsdag** *(nieuw vastgesteld principe voor toekomstige ontwikkeling, aanvullend op Hoofdstuk 1)*: wanneer een sessie zwaarder aanvoelde dan verwacht of niet volgens plan verliep, moet de app erkenning tonen zonder oordeel — een korte, niet-kritische samenvatting in plaats van een prestatie-gerichte badge die de mindere sessie extra pijnlijk maakt.

**Plateau** *(nieuw vastgesteld principe)*: wanneer progressie stagneert (zie plateau-detectie, Product Audit sectie 10), moet de emotionele toon er een zijn van gezamenlijk probleem oplossen ("dit gebeurt, laten we kijken wat helpt") in plaats van impliciete teleurstelling. Een plateau-signaal is functioneel nuttig maar emotioneel risicovol als het verkeerd wordt gebracht — dit principe legt vast dat de toon hier extra zorgvuldig moet zijn.

**Wedstrijdvoorbereiding** *(nieuw vastgesteld principe)*: in de weken vóór een concreet peakdoel (zoals het Product Book beschrijft voor de oorspronkelijke gebruiker) moet de app een gevoel van gerichte focus en vertrouwen opbouwen — bevestiging dat de periodisering klopt, geruststelling bij twijfel, zonder onnodige stress toe te voegen aan een periode die voor de gebruiker al spannend genoeg is.

**Langdurig gebruik:** rustig vertrouwen, stille trots op opgebouwde geschiedenis — het gevoel van een relatie die verdiept in plaats van verslijt (Hoofdstuk 1, sectie 1.14-1.15).

**Emoties die vermeden moeten worden, in elke fase:** schuldgevoel bij rust of een gemiste sessie; overweldiging door te veel gelijktijdige informatie; achterdocht door onuitgelegde AI-adviezen; irritatie door herhaalde, voorspelbare spektakel-momenten; eenzaamheid door een volledig individuele ervaring zonder enige erkenning van de gymgemeenschap (relevant zodra de sociale laag leeft); en — het meest schadelijke risico bij langdurig gebruik — onverschilligheid, het gevoel dat de app "hetzelfde blijft zeggen" zonder te leren van de opgebouwde geschiedenis.


---

## Deel 10 — Golden Rules Checklist

Verplicht te gebruiken bij UX Reviews, UI Reviews, Design Reviews, Sprint Reviews, Pull Request Reviews en Acceptatietesten. Elke regel hieronder is objectief controleerbaar — geen smaakoordeel, wel een ja/nee-antwoord. De checklist is georganiseerd per domein en genummerd voor eenvoudige verwijzing tijdens reviews.

### Product & structuur (1-10)
1. ✓ Eén primaire CTA per scherm.
2. ✓ Geen scherm zonder duidelijke volgende stap.
3. ✓ Elke nieuwe feature is te herleiden tot minimaal één van de zes Product Book-doelen (motivatie, personalisatie, inzicht, automatisering, performance, herstel).
4. ✓ Elke nieuwe entiteit ondersteunt Create, Read, Update én Delete met bevestiging bij Delete.
5. ✓ Elke gegenereerde structuur (programmablok, oefeningsschema) is gecontroleerd op daadwerkelijk gevulde inhoud, niet enkel op het bestaan van de structuur.
6. ✓ Geen nieuwe architecturale structuur zonder expliciete toetsing of een bestaand systeem uitbreidbaar was.
7. ✓ Geen feature gerapporteerd als "klaar" met een openstaand CRUD-gat zonder expliciete vermelding.
8. ✓ Elke destructieve actie vereist een expliciete, niet-dubbelzinnige bevestiging.
9. ✓ Geen enkele schrijfactie kan stil falen zonder zichtbare foutmelding.
10. ✓ Elke nieuwe databron of AI-integratie heeft autorisatie/RLS ontworpen vóór oplevering, niet erna toegevoegd.

### Navigatie & informatiehiërarchie (11-20)
11. ✓ Bottom-navigatie toont maximaal vijf items, identieke volgorde op elk scherm.
12. ✓ Actieve navigatiestaat zichtbaar via kleur én positie/icoon, nooit kleur alleen.
13. ✓ Diepgaande functies maximaal drie niveaus diep bereikbaar vanaf een hoofdscherm.
14. ✓ Dashboard bevat maximaal vijf primaire kaarten boven de vouw.
15. ✓ Dashboard bevat altijd één duidelijke "vandaag"-actie.
16. ✓ Herstelinformatie staat nooit visueel lager of kleiner dan prestatie-informatie op hetzelfde scherm.
17. ✓ Formulieren tonen nooit meer dan zeven actieve velden tegelijk zonder groepering.
18. ✓ Verplichte velden zijn gemarkeerd vóór invullen, niet pas na een foutmelding.
19. ✓ Terugnavigatie leidt altijd naar een voorspelbare vorige staat.
20. ✓ Geen twee gelijkwaardig vormgegeven primaire acties op hetzelfde scherm.

### Onboarding (21-27)
21. ✓ Onboarding bestaat uit maximaal vijf stappen.
22. ✓ Onboarding is op elk moment overslaanbaar.
23. ✓ Onboarding eindigt in een concreet, gepersonaliseerd eerste advies.
24. ✓ Elke onboarding-vraag is herleidbaar naar het eerste advies dat volgt.
25. ✓ Terugkerende gebruikers doorlopen onboarding niet opnieuw zonder expliciete eigen actie.
26. ✓ Onboarding-copy bevat geen jargon zonder uitleg.
27. ✓ Onboarding vraagt nooit gevoelige data (blessure/conditie) zonder uit te leggen waarom dat nodig is.

### Workout & logging (28-40)
28. ✓ Kernacties tijdens een workout kosten maximaal twee tikken.
29. ✓ Rusttimer start automatisch na het opslaan van een set.
30. ✓ Rusttimerduur wordt gesuggereerd op basis van RPE.
31. ✓ Tijdens een actieve training wordt nooit ongevraagd genavigeerd naar een ander hoofdscherm.
32. ✓ Een training kan gepauzeerd worden zonder dataverlies.
33. ✓ Elke logactie toont binnen twee seconden een zichtbare bevestiging.
34. ✓ Dubbele tikken op een opslaan-knop leiden nooit tot dubbele registratie.
35. ✓ De vorige sessie op dezelfde oefening is zichtbaar zonder extra navigatie.
36. ✓ Machine-/apparatuurinstellingen worden onthouden per oefening en per gebruiker.
37. ✓ Plate calculator is bereikbaar zonder schermwissel vanuit het logscherm.
38. ✓ Supersets worden gelogd binnen dezelfde flow als reguliere sets.
39. ✓ Een PR wordt op het moment zelf tijdens de training bevestigd, niet pas achteraf.
40. ✓ Numerieke invoer gebruikt bij voorkeur stappers boven vrij tekstveld.

### AI-coach (41-52)
41. ✓ Elk AI-advies toont welke data gebruikt is.
42. ✓ Elk AI-advies toont de kernredenering in gewone taal.
43. ✓ Elk AI-advies biedt een gelijkwaardige "negeer dit advies"-optie.
44. ✓ AI toont altijd de gebruikte context.
45. ✓ Visueel onderscheid tussen AI-vraag, AI-advies en AI-waarschuwing.
46. ✓ AI toont een zichtbare "aan het nadenken"-status tijdens verwerking.
47. ✓ AI doet geen uitspraak die de onderliggende data niet ondersteunt.
48. ✓ AI benoemt onzekerheid expliciet bij inschattingen (bijv. PR-waarschijnlijkheid).
49. ✓ AI-waarschuwingen zijn concreet en actiegericht, nooit vaag alarmerend.
50. ✓ AI vergelijkt nooit gebruikers onderling zonder expliciete wederzijdse toestemming.
51. ✓ AI geeft nooit medisch klinkende diagnoses, uitsluitend trainingsadvies.
52. ✓ Elke AI-integratie is beveiligd tegen ongeautoriseerd/onbeperkt gebruik vóór livegang.

### Motivatie & gamification (53-62)
53. ✓ Geen enkel motivatiemechanisme functioneert uitsluitend op basis van app-gebruik los van trainingsprestatie.
54. ✓ Streaks respecteren bewust geplande rustdagen zonder streak-verlies.
55. ✓ Geen kunstmatige schaarste of countdown-druk zonder functionele urgentie.
56. ✓ Geen notificaties die schuldgevoel opwekken bij afwezigheid.
57. ✓ Sociale vergelijking is altijd opt-in, nooit standaard zichtbaar voor anderen.
58. ✓ Voortgangsbalken tonen concrete informatie, nooit opzettelijk vage "bijna daar"-suggestie.
59. ✓ Badges (indien aanwezig) zijn gekoppeld aan trainingsmijlpalen, niet aan app-gebruik.
60. ✓ Beloningen zijn informatief (erkenning van een feit), nooit transactioneel zonder trainingsrelevantie.
61. ✓ PR-viering is kort en oprecht, geen herhaald identiek spektakel.
62. ✓ Weekdoelen/maanddoelen zijn door de gebruiker ingesteld of met onderbouwing voorgesteld, nooit eenzijdig opgelegd.

### Toegankelijkheid (63-73)
63. ✓ Interactieve tekst minimaal 14px, kerncijfers minimaal 16px.
64. ✓ Kerntekst voldoet aan WCAG AA-contrast (≥4,5:1).
65. ✓ Geen functionele informatie uitsluitend via kleur overgebracht.
66. ✓ Elk interactief element heeft een betekenisvol toegankelijk label.
67. ✓ Iconen zonder tekstlabel hebben een beschrijvend `aria-label`.
68. ✓ Minimale touch-target van 44×44px voor elk tikbaar element.
69. ✓ Voldoende ruimte tussen naast elkaar liggende knoppen om abuisief tikken te voorkomen.
70. ✓ `prefers-reduced-motion` wordt gerespecteerd met een animatie-arme variant.
71. ✓ Haptische feedback is uitschakelbaar via instellingen.
72. ✓ Geen scherm test uitsluitend met één toegankelijkheidsprofiel (bijv. alleen visueel, zonder schermlezer-check).
73. ✓ Formulierfouten worden ook aangekondigd voor schermlezers, niet enkel visueel gemarkeerd.

### Performance (74-82)
74. ✓ Elke tik krijgt binnen 100ms een zichtbare reactie.
75. ✓ Animaties blokkeren nooit de volgende actie van de gebruiker.
76. ✓ Set-logging reageert optimistisch, synchronisatie gebeurt op de achtergrond.
77. ✓ Trainingslogging blijft volledig functioneel zonder internetverbinding.
78. ✓ De gebruiker ziet altijd hoeveel acties in de offline-wachtrij staan.
79. ✓ Schermen die op data wachten tonen skeleton-loading, geen lege ruimte.
80. ✓ Zoekresultaten verschijnen binnen 300ms na de laatste toetsaanslag.
81. ✓ Geen enkele actie in de trainingsflow wacht op een niet-kritisch netwerkverzoek.
82. ✓ Mislukte netwerkacties bieden een directe "opnieuw proberen"-actie.

### UI-consistentie (83-95)
83. ✓ Alle spacing volgt het bestaande 8/14/16px-grid.
84. ✓ Kaarten binnen dezelfde lijst hebben identieke interne padding.
85. ✓ Merkkleuren zijn uitsluitend `#0B1D2A`, `#0E3B4A`, `#00B894` (plus neutralen) in nieuwe schermen.
86. ✓ Poppins Bold voor koppen, Poppins Medium voor body — geen andere lettertypes.
87. ✓ Geen emoji als functioneel icoon.
88. ✓ Consistente lijnstijl-iconenset in de hele app.
89. ✓ Nooit meer dan één FAB tegelijk zichtbaar.
90. ✓ Destructieve knoppen gebruiken systeembreed consistente kleurcodering.
91. ✓ Dialogs hebben exact één primaire en optioneel één secundaire actie.
92. ✓ Bottom sheets zijn sluitbaar via tik buiten de sheet én een expliciete sluitknop.
93. ✓ Filterchips tonen actieve staat via kleur én icoon.
94. ✓ Geen native `confirm()`/`alert()` voor destructieve of belangrijke bevestigingen.
95. ✓ Micro-interacties gebruiken gestandaardiseerde duur/easing-waarden, geen ad-hoc animatietijden.

### Merk & content (96-104)
96. ✓ De volledige naam "Trainingskompas" is zichtbaar op elk scherm dat de merkidentiteit toont.
97. ✓ Geen afkorting van de merknaam in nieuwe UI-elementen.
98. ✓ Elke lege staat legt uit waarom het scherm leeg is en wat de volgende actie is.
99. ✓ Geen technische placeholder-tekst ("no data found") in gebruikersgerichte content.
100. ✓ Elke foutmelding beschrijft wat er misging én wat de gebruiker nu kan doen.
101. ✓ Elke instelling toont het huidige effect van de instelling, niet enkel de naam.
102. ✓ Elke grafiek toont een korte duiding of aanbevolen actie, nooit uitsluitend ruwe data.
103. ✓ Copy is consistent met de merktoon: direct, respectvol, nooit betuttelend.
104. ✓ Gym-branding of ledenpersonalisatie past kleur/logo aan zonder de merknaam te vervangen.

### Emotioneel & gedragsontwerp (105-112)
105. ✓ Een verlaagd trainingsadvies communiceert geruststelling, geen schuldgevoel.
106. ✓ Een gemiste training of mindere sessie wordt nooit bestraffend gepresenteerd.
107. ✓ Een plateau-signaal wordt gebracht als gezamenlijk op te lossen probleem, niet als teleurstelling.
108. ✓ Wearable-koppelingen tonen proactief de resterende geldigheidsduur vóór verval.
109. ✓ Elke sport heeft een volledig eigen AI-context, geen verdunde generieke laag.
110. ✓ Elke nieuwe feature is getoetst aan de kwetsbaarste relevante persona in die flow.
111. ✓ Geen enkel scherm toont evenveel complexiteit aan een beginnende als aan een ervaren gebruiker zonder gelaagdheid.
112. ✓ Elke onbevestigde persona-aanname die aan de basis van een grote investering ligt, is expliciet als aanname gemarkeerd (Hoofdstuk 2, Deel 8).


---

## Product Constitution — de 25 wetten van TrainingKompas

Deze vijfentwintig wetten zijn de samenvatting van dit gehele hoofdstuk, en zijn **bindend voor alle toekomstige ontwikkeling van TrainingKompas.** Wanneer een toekomstige sprint van één van deze wetten afwijkt, wordt dat expliciet vastgelegd in de Decision Log — met motivatie én impactanalyse, volgens de bestaande governance-werkwijze (Project Kickoff, governance-niveau B). Een afwijking is niet per definitie verboden; een **onbesproken** afwijking is dat wel.

**I.** AI ondersteunt de sporter, maar beslist nooit — elke aanbeveling heeft een gelijkwaardig alternatief.

**II.** Herstel gaat structureel vóór prestatie, in logica én in visuele hiërarchie.

**III.** Elk advies, elke aanbeveling en elke automatische aanpassing is uitlegbaar met zichtbare data en redenering — zonder uitzondering.

**IV.** Data leidt altijd tot inzicht of een concrete actie; ruwe data zonder duiding wordt niet getoond.

**V.** Een nieuwe feature wordt alleen gebouwd als hij aantoonbaar motivatie, personalisatie, inzicht, automatisering, performance of herstel verhoogt.

**VI.** Premium is het zichtbaar maken van onderliggende kwaliteit — nooit decoratie zonder functie.

**VII.** Elke interactie, elk scherm en elke dialog heeft precies één primair doel.

**VIII.** Geen enkele actie in de app faalt stil — elke schrijfactie slaagt of faalt zichtbaar.

**IX.** Nieuwe functionaliteit wordt eerst getoetst op uitbreidbaarheid van bestaande architectuur vóórdat een nieuwe structuur wordt overwogen.

**X.** Geen feature geldt als compleet zonder volledige CRUD-ondersteuning en een bevestigde contentcheck.

**XI.** De volledige naam "Trainingskompas" is in elke context — eigen gebruik, gym-branding, ledenpersonalisatie — onverkort zichtbaar.

**XII.** Motivatie is intrinsiek gedreven; gamification ondersteunt dat, maar vervangt het nooit.

**XIII.** Elke sport en elke leeftijdscategorie krijgt een volledig eigen, structurele AI-context — nooit een verdunde generieke laag.

**XIV.** Persoonlijke data is en blijft eigendom van de atleet, met expliciete, gelaagde controle over wat gedeeld wordt.

**XV.** Veiligheid en autorisatie worden vóór een feature ontworpen, nooit achteraf toegevoegd.

**XVI.** Complexiteit wordt bepaald door de kwetsbaarste relevante gebruiker in een flow, niet door wat de techniek toestaat.

**XVII.** Onbevestigde aannames over gebruikers worden behandeld als aannames, niet als vaststaande feiten, totdat ze gevalideerd zijn.

**XVIII.** Groei naar meerdere gyms en meer gebruikers verwatert nooit de persoonlijke, uitlegbare aandacht die de eerste gebruiker kreeg.

**XIX.** Kernacties tijdens een training kosten maximaal twee tikken.

**XX.** Geen enkel motivatiemechanisme gebruikt manipulatieve technieken — kunstmatige schaarste, schuldgevoel-notificaties, of niet-opt-in sociale vergelijking zijn nooit toegestaan.

**XXI.** Toegankelijkheid (contrast, lettergrootte, touch-targets, schermlezerondersteuning) is een basisverplichting bij elke nieuwe schermbouw, niet een latere verfijning.

**XXII.** Trainingslogging blijft volledig functioneel zonder internetverbinding; synchronisatie is een achtergrondproces, geen voorwaarde voor gebruik.

**XXIII.** Elk scherm dat op data wacht toont een structurele plaatsvervanger — nooit een leeg scherm zonder uitleg.

**XXIV.** Geen native systeemdialogen voor belangrijke of destructieve bevestigingen — elke bevestiging blijft binnen het merksysteem.

**XXV.** Elke afwijking van deze vijfentwintig wetten wordt expliciet vastgelegd in de Decision Log, met motivatie en impactanalyse — nooit stilzwijgend doorgevoerd.

---

*Einde Hoofdstuk 3. Dit hoofdstuk vormt samen met Hoofdstuk 1 (Productvisie & Filosofie) en Hoofdstuk 2 (Doelgroepen, Persona's & Customer Journey) het fundament van het TrainingKompas Premium Development Handbook. Elk volgend hoofdstuk — ontwerpsysteem, sprintplanning, featurespecificaties — wordt tegen de Product Constitution hierboven getoetst vóórdat het als goedgekeurd geldt. De checklist in Deel 10 is vanaf dit moment verplicht onderdeel van elke UX Review, UI Review, Design Review, Sprint Review, Pull Request Review en Acceptatietest.*

