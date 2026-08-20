# TrainingKompas Premium Development Handbook

## Hoofdstuk 4 — Premium UX & Interaction Design Handbook

**Status:** bindend. Alle toekomstige schermen, interacties en gebruikersflows moeten voldoen aan de standaarden in dit hoofdstuk.
**Karakter:** dit document beschrijft niet alleen wat de gebruiker ziet, maar vooral hoe de applicatie zich gedraagt — elke tik, elke wachttijd, elke foutmelding, elke stilte.
**Voortbouwend op:** Hoofdstuk 1 (Productvisie & Filosofie), Hoofdstuk 2 (Doelgroepen, Persona's & Customer Journey), Hoofdstuk 3 (Product Design Principles & Golden Rules), de Premium Product Audit, en de bestaande projectdocumentatie.
**Gebruik:** verplichte referentie bij elke UX Review, Sprint Review, Acceptatietest en Play Store Release Review.

---

### Inleiding

Hoofdstuk 3 heeft de grondwet van TrainingKompas vastgelegd — de productprincipes en Golden Rules die bepalen of een ontwerpkeuze goed of fout is. Dit hoofdstuk is de praktische vertaling daarvan naar elke concrete flow, elk scherm en elke interactie die de gebruiker daadwerkelijk tegenkomt. Waar Hoofdstuk 3 zegt "kernacties tijdens een workout kosten maximaal twee tikken" (Golden Rule UX16, Product Constitution XIX), beschrijft dit hoofdstuk exact welke twee tikken dat zijn, wat er in de tussenliggende 100 milliseconden gebeurt, en welke emotie de gebruiker op dat moment moet ervaren.

Dit hoofdstuk behandelt de bestaande schermenstructuur zoals die uit de codebase (v3.3.25) en de schermopname naar voren komt — vijf hoofdschermen via bottom-navigatie (Home, Training, Coach, Profiel, Stats), plus de belangrijkste modals en submodules (onboarding, programma-editor, team-/gymbeheer, wearables). Waar dit hoofdstuk een verbetering voorschrijft die verder gaat dan de huidige implementatie, wordt dat gemarkeerd als aanbeveling voor toekomstige sprints, nooit als beschrijving van reeds bestaand gedrag.

---

## Deel 1 — UX Filosofie

### Wat betekent "Premium UX" voor TrainingKompas?

Premium UX is, in directe lijn met Product Constitution-wet VI (Hoofdstuk 3), **het zichtbaar maken van onderliggende kwaliteit — nooit een esthetische laag die daar los van staat.** Voor interactieontwerp specifiek betekent dit: een premium interactie is er een die precies het gedrag vertoont dat de gebruiker verwacht, op het moment dat hij het verwacht, zonder dat hij daar bewust bij stil hoeft te staan. Premium UX voelt niet "indrukwekkend" — premium UX voelt onopvallend betrouwbaar, tot het moment dat iets bijzonders gebeurt (een PR, een scherp AI-inzicht), waarop het juist wél even de aandacht mag trekken.

### Minimale cognitieve belasting

Elke beslissing die de app namens de gebruiker kan nemen — zonder controle weg te nemen — is een beslissing die de gebruiker niet zelf hoeft te maken. Dit is met name kritiek tijdens de workout-flow (Hoofdstuk 3, Deel 4): een gebruiker die net een zware set heeft voltooid, heeft minder cognitieve capaciteit over dan aan het begin van de sessie. De rusttimer die automatisch start (Golden Rule UX17) is hiervan het duidelijkste voorbeeld — niet omdat de gebruiker het niet zelf zou kunnen, maar omdat hem dat op dat moment niet gevraagd zou moeten worden. Cognitieve belasting wordt begrensd volgens Product Principle P7 (Hoofdstuk 3): één primair doel per interactie, nooit meer.

### Voorspelbaarheid

Een gebruiker die 4-5 keer per week traint (Persona Ruud, Hoofdstuk 2) bouwt binnen enkele weken spiergeheugen op voor de interactiepatronen van de app, net zoals voor een beweging in de gym zelf. Elke afwijking van een geleerd patroon — een knop die van plaats wisselt, een gebaar dat op het ene scherm iets anders doet dan op het andere — doorbreekt dat vertrouwen. Voorspelbaarheid is daarom geen esthetisch principe maar een directe verlenging van UI-regel UI42 (Hoofdstuk 3): eenzelfde interactiepatroon betekent overal in de app hetzelfde.

### Snelheid

Snelheid in TrainingKompas kent twee lagen die niet verward mogen worden: **waargenomen snelheid** (reageert de interface direct, ongeacht de netwerklatentie) en **daadwerkelijke snelheid** (hoe lang duurt een taak van begin tot eind). Performance Principles (Hoofdstuk 3, Deel 8) leggen vast dat elke tik binnen 100ms een zichtbare reactie krijgt — dit is waargenomen snelheid, en is vaak belangrijker voor het premium-gevoel dan de daadwerkelijke netwerksnelheid, die deels buiten de controle van de app ligt.

### Focus

Tijdens de kernactiviteit van de app — een training loggen — is focus een ontwerpdoel op zichzelf, niet een bijproduct van een opgeruimd scherm. Dit betekent: geen meldingen, geen aanbevelingen voor andere features, geen niet-kritieke content tijdens een actieve sessie (Golden Rule UX18). Focus wordt actief beschermd, niet enkel afwezigheid van rommeligheid.

### Flow

Flow — de psychologische toestand waarin een gebruiker volledig opgaat in een taak — ontstaat wanneer de moeilijkheidsgraad van de interactie precies aansluit bij de vaardigheid van de gebruiker, zonder onderbrekingen. Voor TrainingKompas betekent dit dat de trainingsflow (sets loggen, gewicht aanpassen, rust nemen) een ononderbroken ritme moet hebben dat de fysieke herhaling van de training zelf weerspiegelt — elke onderbreking van dat ritme (een laadscherm, een onverwachte dialoog) is een verstoring van flow, niet slechts een kleine vertraging.

### Vertrouwen

Vertrouwen wordt op drie niveaus opgebouwd: **functioneel** (de app doet wat hij belooft, elke keer — Product Principle P8, nooit stille fouten), **inhoudelijk** (AI-adviezen zijn uitlegbaar en kloppen met wat de gebruiker zelf ervaart — Product Principle P3) en **relationeel** (de app behandelt de gebruiker als een capabele volwassene die zelf beslist — Product Principle P1). Premium UX-ontwerp bij TrainingKompas toetst elke interactie op alle drie deze lagen, niet alleen op de eerste.

### Motivatie

Motivatie in de UX-laag ontstaat primair uit zichtbare, eerlijke feedback over eigen inspanning (Hoofdstuk 3, Deel 6: Behavioural Design) — niet uit kunstmatige prikkels. UX-ontwerp faciliteert dit door voortgang altijd zichtbaar en tijdig te maken (niet pas bij het einde van een week, maar direct na elke sessie), en door successen (PR's, streaks) te bevestigen op het moment dat ze gebeuren, niet pas bij een volgend bezoek.

### Foutpreventie

Premium UX voorkomt fouten liever dan dat het ze goed afhandelt. Een verplicht veld dat vóór het invullen al gemarkeerd is (Golden Rule UX7) voorkomt een foutmelding die anders pas na een mislukte poging zou verschijnen. Foutpreventie is een investering vooraf die foutherstel (Deel 9 van dit hoofdstuk) grotendeels overbodig moet maken — beide zijn nodig, maar preventie heeft altijd voorrang in het ontwerpproces.

### Herstel boven prestatie

Direct uit Product Constitution-wet II (Hoofdstuk 3): op elk scherm waar herstel- en prestatie-informatie samen voorkomen, krijgt herstel ten minste evenveel visuele prominentie. Dit is niet alleen een informatiehiërarchie-regel maar een filosofische keuze die zich in elke flow moet herhalen — een AI-advies dat een lagere belasting voorstelt, wordt nooit ondergeschikt gepresenteerd aan het oorspronkelijke, "ambitieuzere" schema.

### AI als coach

De interactiepatronen rond de AI-coach volgen consequent het beeld van een coach die naast de sporter staat, niet boven hem. Dit vertaalt zich concreet: de AI-coach initieert een gesprek wanneer dat functioneel relevant is (een waarschuwing bij stijgende belasting), maar dringt zich nooit op; elke suggestie is een uitnodiging, nooit een instructie die moeilijk te negeren is (Golden Rule UX25).

### Gebruik tijdens fysieke inspanning

Dit is het meest onderscheidende UX-gegeven van TrainingKompas ten opzichte van de meeste consumenten-apps: een aanzienlijk deel van het gebruik vindt plaats tijdens fysieke inspanning — vermoeide vingers, verhoogde hartslag, verminderde fijne motoriek, soms bezwete schermen. Dit vraagt om grotere tikdoelen dan strikt noodzakelijk zou zijn voor stilzittend gebruik (Golden Rule UI14: minimaal 44×44px, in de praktijk voor kernacties tijdens training ruimer), grotere contrasten, en een interactieontwerp dat fouttolerant is voor een minder precieze tik dan gebruikelijk.

### Expliciet verboden UX-patronen

- **Dark patterns van elke soort** — verborgen annuleeropties, misleidende knopbenaming, opzettelijk verwarrende bevestigingsflows.
- **Oneindig scrollen zonder doel** — elke lijst in TrainingKompas heeft een natuurlijk eindpunt of duidelijke paginering; oneindig scrollen dat is ontworpen om schermtijd te maximaliseren, hoort niet bij een app die trainingskwaliteit dient, niet gebruiksduur.
- **Interstitials/pop-ups die niet functioneel gevraagd zijn** — geen reclame-achtige onderbrekingen, geen "beoordeel ons nu"-pop-ups tijdens een actieve sessie.
- **Verborgen of vertraagde annuleeropties** in een flow (bijvoorbeeld een abonnement opzeggen dat pas na meerdere schermen mogelijk wordt) — in directe tegenspraak met Product Principle P1 en de vertrouwensfilosofie hierboven.
- **Kunstmatige laadschermen** die geen functie dienen behalve het suggereren van "zwaar werk" om waarde te simuleren.
- **Notificaties zonder functionele noodzaak** — reeds verboden in Hoofdstuk 2/3, hier herbevestigd op interactieniveau.
- **Gebaren die niet ontdekbaar zijn** — een swipe- of long-press-actie zonder enige visuele hint dat deze bestaat, is voor een deel van de doelgroep (minder digitaal-ervaren gebruikers zoals Persona Fleur en Marieke) volledig onvindbaar en dus feitelijk niet-bestaand functionaliteit.

---

## Deel 2 — Volledige User Flows

Achttien flows, elk uitgewerkt volgens hetzelfde vaste format. Elke flow bouwt voort op de Customer Journey uit Hoofdstuk 2 (Deel 3) en de Golden Rules uit Hoofdstuk 3.

### Flow 1 — Eerste installatie

**Doel:** de gebruiker van app-store/link naar een werkende, ingelogde app brengen met minimale frictie.
**Stappen:** installatie/openen → korte merkintroductie → account aanmaken of inloggen → doorstroom naar onboarding (Flow 2).
**Emoties:** nieuwsgierigheid, lichte scepsis (Hoofdstuk 2, Customer Journey Fase 1).
**Risico's:** een gebruiker die de app sluit vóórdat de kernwaarde zichtbaar is geworden.
**Frictiepunten:** een account-aanmaakformulier dat meer vraagt dan strikt noodzakelijk vóór de eerste waardevolle interactie.
**Verbeteringen:** merkintroductie beperkt tot één scherm, geen meerdere "swipe-through"-schermen die enkel marketing herhalen (zie verboden patroon: interstitials zonder functie).
**Acceptatiecriteria:** van installatie tot eerste zichtbare, gepersonaliseerde content in minder dan negentig seconden bij een gemiddelde verbinding.

### Flow 2 — Onboarding

**Doel:** profiel, doel en ervaringsniveau vastleggen en eindigen in een concreet eerste advies (Golden Rule UX9-UX11).
**Stappen:** naam/basisgegevens → sportkeuze en ervaringsniveau → doel (kortetermijn/langetermijn) → optioneel: conditie/blessure → eerste check-in → eerste advies getoond.
**Emoties:** bereidheid tot investeren, mits relevant; voor Persona Fleur nadrukkelijk geruststelling nodig.
**Risico's:** afhaken bij een te lange vragenlijst; overweldiging bij te veel keuzeopties in één stap.
**Frictiepunten:** vragen die generiek aanvoelen in plaats van direct gekoppeld aan het komende advies.
**Verbeteringen:** elke stap toont impliciet waarom de vraag gesteld wordt ("dit helpt ons je eerste training af te stemmen").
**Acceptatiecriteria:** maximaal vijf stappen, volledig overslaanbaar, eindigt altijd met een concreet advies op het scherm — nooit met een lege dashboard-weergave.

### Flow 3 — Eerste workout

**Doel:** de eerste daadwerkelijke trainingservaring laten aanvoelen als een bevestiging van de onboarding-belofte.
**Stappen:** vanuit het eerste advies of dashboard → training starten → eerste oefening met eventueel techniekvideo → eerste set loggen → sessie afronden → korte samenvatting.
**Emoties:** lichte spanning, groeiend vertrouwen als de flow soepel verloopt.
**Risico's:** een onduidelijke eerste setinvoer die de gebruiker laat twijfelen of de actie geslaagd is.
**Frictiepunten:** te veel opties zichtbaar (superset, RPE, apparatuurinstellingen) bij een eerste, onervaren gebruik.
**Verbeteringen:** een lichte, niet-opdringerige eerste-keer-hint bij de belangrijkste acties (rusttimer, plate calculator) zonder een volledige rondleiding te forceren.
**Acceptatiecriteria:** eerste set succesvol gelogd binnen twee minuten na start van de eerste training.

### Flow 4 — Workout starten

**Doel:** van dashboard/shortcut naar actieve trainingssessie in minimale stappen.
**Stappen:** Training A/B kiezen (of shortcut `?start=A`) → sessie opent direct in het logscherm.
**Emoties:** doelgerichtheid — de gebruiker wil beginnen, niet lezen.
**Risico's:** een tussenscherm dat overbodige bevestiging vraagt vóór het starten.
**Frictiepunten:** onduidelijkheid welke training vandaag "aan de beurt" is bij een wisselend schema.
**Verbeteringen:** het dashboard suggereert proactief de eerstvolgende training op basis van historie (bestaand patroon: "Volgende training: Training A").
**Acceptatiecriteria:** training starten kost één tik vanaf het dashboard.

### Flow 5 — Set loggen

**Doel:** gewicht, reps en optioneel RPE vastleggen met minimale onderbreking van het fysieke ritme.
**Stappen:** waarde(n) invoeren (via stepper, Golden Rule UX5) → opslaan → automatische bevestiging → rusttimer start automatisch (UX17).
**Emoties:** focus, ritme.
**Risico's:** een dubbele tik die tot dubbele registratie leidt (voorkomen via UX21).
**Frictiepunten:** toetsenbord-wissels bij tekstinvoer in plaats van stappers.
**Verbeteringen:** grote stappers met vaste increments per apparatuurtype (Hoofdstuk 2, user story 20).
**Acceptatiecriteria:** set loggen kost maximaal twee tikken, bevestiging zichtbaar binnen twee seconden.

### Flow 6 — Gewicht aanpassen

**Doel:** gewicht tussentijds corrigeren zonder de sessie te onderbreken.
**Stappen:** tik op gewichtsveld → stepper met vaste increment (2,5kg vrije gewichten, apparatuurspecifiek voor machines) → automatische opslag.
**Emoties:** controle, geen frictie.
**Risico's:** een increment die niet aansluit bij de daadwerkelijk beschikbare schijven/pin-standen.
**Frictiepunten:** een los tekstveld dat het toetsenbord opent voor een kleine aanpassing.
**Verbeteringen:** increment gekoppeld aan `equipment_types`-data waar beschikbaar.
**Acceptatiecriteria:** gewicht aanpassen kost maximaal twee tikken, geen toetsenbordwissel voor standaardaanpassingen.

### Flow 7 — Rusttimer

**Doel:** consistente, passende rust tussen sets zonder handmatige actie.
**Stappen:** set opgeslagen → timer start automatisch met RPE-gebaseerde suggestieduur → zichtbare aftelbalk → melding bij einde (visueel + optioneel haptisch) → automatisch terug naar logscherm.
**Emoties:** rust, vertrouwen dat de app meedenkt.
**Risico's:** een timer die te kort of te lang aanvoelt bij een verkeerd ingeschatte RPE.
**Frictiepunten:** het ontbreken van een snelle "+30 sec"-optie tijdens het aftellen.
**Verbeteringen:** een eenvoudige tik om de resterende tijd te verlengen/verkorten zonder de timer te moeten annuleren en herstarten.
**Acceptatiecriteria:** timer start zonder gebruikersactie, aanpassen van duur kost maximaal één tik.

### Flow 8 — AI Coach raadplegen

**Doel:** een vraag stellen of een advies ontvangen met volledige uitlegbaarheid (Golden Rule UX24-27).
**Stappen:** coach-tab openen → vraag stellen of bestaand advies bekijken → antwoord met zichtbare databasis en redenering → optioneel doorvragen.
**Emoties:** kritische nieuwsgierigheid bij eerste gebruik, vertrouwen bij herhaald gebruik.
**Risico's:** een generiek aanvoelend antwoord dat de indruk van "AI-gimmick" versterkt in plaats van wegneemt.
**Frictiepunten:** geen zichtbare status tijdens het wachten op een antwoord (UX26).
**Verbeteringen:** duidelijke "aan het nadenken"-status, visueel onderscheid tussen berichttypen.
**Acceptatiecriteria:** elk antwoord toont minimaal één concrete verwijzing naar gebruikte data.

### Flow 9 — Programma volgen

**Doel:** een meerweeks, gepersonaliseerd trainingsprogramma dagelijks kunnen volgen zonder verwarring over "waar zit ik nu".
**Stappen:** programma-overzicht → huidige week gemarkeerd → dagelijkse training start rechtstreeks vanuit het programma-blok.
**Emoties:** betrokkenheid bij een groter geheel (Hoofdstuk 2, Customer Journey Fase 8).
**Risico's:** onduidelijkheid welke training bij welke week hoort na een gemiste sessie.
**Frictiepunten:** een programma-blok dat leeg lijkt bij het uitklappen (zie Product Principle P10, contentcheck).
**Verbeteringen:** expliciete week-voortgangsindicator binnen het programma-overzicht.
**Acceptatiecriteria:** de gebruiker kan altijd in één oogopslag zien welke week/training "vandaag" is binnen het lopende programma.

### Flow 10 — Programma wijzigen

**Doel:** parameters aanpassen of het programma laten herverdelen na een onderbreking.
**Stappen:** programma openen → wijzigen (duur, dagen per week, afwijkende dagen) → AI genereert opnieuw met uitleg van wat er verandert → bevestigen.
**Emoties:** controle behouden over een AI-gegenereerd geheel.
**Risico's:** een wijziging die per ongeluk voortgang uit voorgaande weken laat verdwijnen.
**Frictiepunten:** onduidelijkheid of een wijziging alleen toekomstige weken raakt of ook de voltooide geschiedenis.
**Verbeteringen:** expliciete bevestiging welke weken wel/niet worden aangepast vóór het definitief doorvoeren.
**Acceptatiecriteria:** de gebruiker ziet vóór bevestiging exact welke weken opnieuw gegenereerd worden.

### Flow 11 — Dashboard gebruiken

**Doel:** in één oogopslag weten wat vandaag te doen staat en hoe de week/maand ervoor staat.
**Stappen:** dashboard openen → dagfactor en "vandaag"-advies zien → optioneel doorklikken naar detail (herstel, statistieken).
**Emoties:** oriëntatie, rustig overzicht.
**Risico's:** te veel gelijktijdige kaarten die met elkaar concurreren om aandacht (Product Audit, UI-dichtheid).
**Frictiepunten:** het ontbreken van een duidelijke enkele CTA (huidige situatie, Product Audit sectie 9).
**Verbeteringen:** Dashboard 2.0-structuur (Product Audit): "vandaag"-actie, weekvoortgang, mini-heatmap.
**Acceptatiecriteria:** maximaal vijf primaire kaarten boven de vouw, één primaire CTA zichtbaar zonder scrollen.

### Flow 12 — Statistieken bekijken

**Doel:** trends en inzichten vinden zonder overweldigd te raken door filtercombinaties.
**Stappen:** Stats-tab openen → standaardweergave zonder filters → optioneel filteren op sport/type/spiergroep → detailweergave per metric.
**Emoties:** nieuwsgierigheid, bevestiging van vooruitgang.
**Risico's:** drie gelijktijdige filterdimensies die bij eerste gebruik overweldigen (Product Audit, sectie 5).
**Frictiepunten:** een lege of onduidelijke staat bij onvoldoende data.
**Verbeteringen:** elke grafiek toont een korte duiding (Golden Rule UX28).
**Acceptatiecriteria:** standaardweergave zonder filters toont al zinvolle informatie; filters zijn optioneel, nooit verplicht.

### Flow 13 — Herstel controleren

**Doel:** de spierherstel-heatmap raadplegen om te bepalen of/hoe zwaar getraind kan worden.
**Stappen:** heatmap openen (dashboard of Stats) → visuele status per spiergroep → optioneel tikken voor detail per groep.
**Emoties:** geruststelling of bewuste voorzichtigheid, nooit schuldgevoel (Product Principle P2).
**Risico's:** een te subtiele visualisatie die de urgentie van een niet-herstelde groep niet goed overbrengt.
**Frictiepunten:** ontbreken van directe koppeling tussen heatmap-inzicht en een concrete trainingsaanpassing.
**Verbeteringen:** een tik op een niet-herstelde spiergroep suggereert direct een alternatieve oefening of belasting.
**Acceptatiecriteria:** hersteltoestand van elke hoofdspiergroep is zichtbaar binnen één tik vanaf het dashboard.

### Flow 14 — PR bekijken

**Doel:** een behaald record direct herkennen en, achteraf, de volledige PR-geschiedenis kunnen doorbladeren.
**Stappen:** tijdens het loggen: automatische PR-badge zichtbaar op het moment zelf → na de sessie: PR terug te vinden in samenvatting → op termijn: PR-tijdlijnscherm (Product Audit aanbeveling).
**Emoties:** trots, korte oprechte erkenning (Hoofdstuk 3, Deel 4/9).
**Risico's:** een PR die onopgemerkt voorbijgaat door een te subtiele badge.
**Frictiepunten:** geen centraal overzicht van historische PR's (huidige gat, Product Audit sectie 11).
**Verbeteringen:** PR-tijdlijnscherm met datum, context en oefening per record.
**Acceptatiecriteria:** een PR wordt op het moment zelf zichtbaar bevestigd, niet pas bij het bekijken van de samenvatting.

### Flow 15 — Instellingen wijzigen

**Doel:** profiel, voorkeuren en accountopties beheren zonder verdwaald te raken.
**Stappen:** Profiel-tab → gewenste sectie (account, atleet-profiel, wearables, team) → wijziging doorvoeren → zichtbare bevestiging.
**Emoties:** controle, vertrouwen dat wijzigingen daadwerkelijk worden opgeslagen.
**Risico's:** een instelling die wijzigt zonder duidelijke bevestiging (Product Principle P8).
**Frictiepunten:** dichte informatie-opeenstapeling (wearable-kaart, admin-secties samen op één scherm, Product Audit sectie 5).
**Verbeteringen:** duidelijkere sectionering binnen Profiel, met visuele scheiding tussen persoonlijke instellingen en beheerfuncties.
**Acceptatiecriteria:** elke instellingswijziging toont een zichtbare bevestiging binnen twee seconden.

### Flow 16 — Wearable koppelen

**Doel:** HRV/hartslagdata automatisch laten binnenkomen zonder herhaalde technische stappen.
**Stappen:** Profiel → wearables → OAuth-koppeling starten → autoriseren bij de wearable-provider → terugkeer naar app met bevestigde koppeling.
**Emoties:** verwachting van gemak, lichte zorg over privacy.
**Risico's:** de bestaande beperking dat de Fitbit-koppeling via een Testing-mode Google Cloud-app loopt met wekelijkse tokenvervaldatum (Product Audit, sectie 4.8/14) — een reëel risico dat via UX (proactieve melding) verzacht moet worden totdat het technisch is opgelost.
**Frictiepunten:** een koppeling die stil verloopt zonder waarschuwing.
**Verbeteringen:** proactieve melding ruim vóór tokenverval (Golden Rule UX33).
**Acceptatiecriteria:** koppelen kost maximaal drie stappen; de gebruiker ontvangt een melding minimaal 48 uur vóór het verlopen van een token.

### Flow 17 — Offline werken

**Doel:** een training volledig kunnen loggen zonder internetverbinding, zonder functieverlies.
**Stappen:** training starten zonder verbinding → sets loggen (lokaal opgeslagen) → zichtbare offline-indicator → automatische synchronisatie zodra verbinding terugkeert.
**Emoties:** vertrouwen dat niets verloren gaat.
**Risico's:** onduidelijkheid of een actie daadwerkelijk lokaal is opgeslagen.
**Frictiepunten:** het ontbreken van een duidelijke, doorlopende indicator van de offline-status tijdens de hele sessie.
**Verbeteringen:** permanente, subtiele offline-badge zichtbaar zolang er niet-gesynchroniseerde data is (bestaand patroon, hier bevestigd als norm).
**Acceptatiecriteria:** elke actie tijdens offline gebruik toont dezelfde bevestigingssnelheid als online gebruik.

### Flow 18 — Synchronisatie

**Doel:** offline opgeslagen data betrouwbaar en zichtbaar naar Supabase synchroniseren zodra een verbinding beschikbaar is.
**Stappen:** verbinding hersteld → automatische synchronisatie start → voortgangsindicator → bevestiging bij voltooiing, of duidelijke foutmelding met herstelactie bij falen.
**Emoties:** geruststelling bij succes, geen paniek bij een tijdelijke vertraging.
**Risico's:** een conflict tussen apparaten (dezelfde sessie gewijzigd op twee toestellen) dat zonder duidelijke afhandeling tot dataverlies leidt.
**Frictiepunten:** een synchronisatie die faalt zonder dat de gebruiker dit ooit te zien krijgt (rechtstreeks in strijd met Product Principle P8).
**Verbeteringen:** expliciete conflictresolutie-UI bij gelijktijdige wijzigingen (zie ook Deel 9, Error Recovery).
**Acceptatiecriteria:** de gebruiker kan te allen tijde zien of alle data gesynchroniseerd is, en krijgt bij een mislukte synchronisatie een concrete herstelactie aangeboden.


---

## Deel 3 — Schermspecificaties

Veertien schermen/modals, elk volgens hetzelfde vaste specificatieformat. Dit dekt alle hoofdschermen (bottom-navigatie), de belangrijkste submodules en de meest gebruikte modals. Toekomstige, nog niet gebouwde schermen (coach-dashboard, owner-dashboard, PR-tijdlijn) zijn gemarkeerd als zodanig.

### Scherm 1 — Onboarding

| Veld | Specificatie |
|---|---|
| Doel | Profiel, doel en ervaringsniveau vastleggen; eindigen in een concreet eerste advies. |
| Primaire gebruiker | Nieuwe gebruiker (Persona Fleur als kwetsbaarste variant). |
| Secundaire gebruiker | Ervaren gebruiker die een nieuw account aanmaakt (Persona Ruud, Daan). |
| Belangrijkste taak | Vijf stappen doorlopen zonder afhaken. |
| Informatiehiërarchie | Eén vraag per stap, voortgangsindicator bovenaan, altijd een "overslaan"-optie zichtbaar. |
| Visuele prioriteiten | De huidige vraag; voortgang; nooit toekomstige stappen vooruit tonen (overweldiging voorkomen). |
| Gewenste emoties | Welkom, gezien worden, geen overweldiging (Hoofdstuk 1, sectie 1.15). |
| Maximale scroll | Geen scroll nodig per stap — elke stap past op één scherm. |
| Maximale tikken | Eén tik per stap plus "volgende". |
| Lege staat | N.v.t. (altijd content). |
| Loading state | Korte laadindicator bij het genereren van het eerste advies na de laatste stap. |
| Foutmeldingen | Alleen bij verplichte velden; duidelijk, direct onder het veld. |
| AI-context | Het eerste advies aan het einde toont expliciet welke ingevoerde gegevens gebruikt zijn. |
| Accessibility | Grote tikdoelen, hoog contrast, screenreader-volgorde matcht visuele volgorde. |
| Interacties | Tik, tekstinvoer, keuzeknoppen; geen swipe-only navigatie (ontdekbaarheid). |
| Acceptatiecriteria | Maximaal vijf stappen; overslaanbaar; eindigt in een gepersonaliseerd advies, nooit een leeg dashboard. |

### Scherm 2 — Dashboard (Home)

| Veld | Specificatie |
|---|---|
| Doel | In één oogopslag tonen wat vandaag te doen staat en hoe de gebruiker ervoor staat. |
| Primaire gebruiker | Alle actieve gebruikers, dagelijks bezoek. |
| Secundaire gebruiker | Coach die kort de eigen voortgang checkt tussen klanten door (Persona Iris/Bram). |
| Belangrijkste taak | Vandaag-advies zien en trainen starten. |
| Informatiehiërarchie | 1) Dagfactor/vandaag-advies, 2) weekvoortgang, 3) mini-heatmap, 4) recente sessies. |
| Visuele prioriteiten | De "vandaag"-actie krijgt de grootste visuele massa; herstel minimaal gelijk aan prestatie (Product Principle P2). |
| Gewenste emoties | Rustig overzicht, motivatie om te beginnen. |
| Maximale scroll | Kernoverzicht past boven de vouw; details vereisen scroll. |
| Maximale tikken | Training starten: één tik vanaf dashboard. |
| Lege staat | Nieuwe gebruiker zonder historie: toont onboarding-vervolgadvies in plaats van lege kaarten. |
| Loading state | Skeleton-kaarten in dezelfde lay-out als geladen content (Golden Rule, Deel 8 Performance). |
| Foutmeldingen | Bij mislukte data-fetch: korte melding met "opnieuw proberen", overige kaarten blijven functioneel. |
| AI-context | Dagfactor-toelichting direct zichtbaar ("HRV goed, slaap te kort"). |
| Accessibility | Kaartvolgorde matcht screenreader-volgorde; geen informatie alleen via kleur. |
| Interacties | Tik om door te klikken naar detail; geen destructieve acties op dit scherm. |
| Acceptatiecriteria | Maximaal vijf primaire kaarten boven de vouw; één primaire CTA. |

### Scherm 3 — Training A/B (workout-logscherm)

| Veld | Specificatie |
|---|---|
| Doel | Sets, reps, gewicht en RPE loggen tijdens een actieve training. |
| Primaire gebruiker | Alle actieve trainende gebruikers, hoogste gebruiksfrequentie in de app. |
| Secundaire gebruiker | N.v.t. — dit scherm is inherent single-user tijdens gebruik. |
| Belangrijkste taak | Een set opslaan in maximaal twee tikken. |
| Informatiehiërarchie | 1) Huidige oefening/set, 2) vorige-sessie-referentie, 3) rusttimer-status, 4) overige oefeningen in de sessie. |
| Visuele prioriteiten | Invoervelden voor de actieve set domineren; navigatie naar andere hoofdschermen is bewust onopvallend (focus, Deel 1). |
| Gewenste emoties | Focus, ritme, vertrouwen. |
| Maximale scroll | Actieve oefening altijd zichtbaar zonder scroll; overige oefeningen via scroll bereikbaar. |
| Maximale tikken | Set opslaan: twee tikken; gewicht/reps aanpassen: twee tikken. |
| Lege staat | N.v.t. (start altijd met vooraf bepaalde of eerder geselecteerde oefeningen). |
| Loading state | Geen merkbare loading tijdens loggen — optimistische UI (Deel 8 Performance). |
| Foutmeldingen | Alleen bij mislukte synchronisatie, nooit blokkerend voor verder loggen. |
| AI-context | "Vraag de coach"-optie direct vanuit het scherm beschikbaar zonder sessie te verlaten. |
| Accessibility | Grote tikdoelen (ruimer dan standaard 44px gezien fysieke inspanning); haptische bevestiging bij opslaan. |
| Interacties | Stepper voor gewicht/reps, tik voor opslaan, automatische rusttimer-trigger. |
| Acceptatiecriteria | Twee tikken per kernactie; bevestiging binnen twee seconden; rusttimer start automatisch. |

### Scherm 4 — Losse oefening loggen

| Veld | Specificatie |
|---|---|
| Doel | Een oefening loggen buiten een vast schema om. |
| Primaire gebruiker | Ervaren gebruikers die flexibel reageren op een klasse-aanbod (Persona Ruud) of coach-gestuurde les (Persona Fleur). |
| Secundaire gebruiker | N.v.t. |
| Belangrijkste taak | Snel een niet-geplande oefening kunnen vastleggen. |
| Informatiehiërarchie | Identiek aan Training A/B (hergebruikt hetzelfde renderpad — Product Principle P9). |
| Visuele prioriteiten | Zelfde als Scherm 3. |
| Gewenste emoties | Flexibiliteit zonder verlies van structuur. |
| Maximale scroll | Zelfde als Scherm 3. |
| Maximale tikken | Oefening kiezen: twee tikken; loggen: zelfde als Scherm 3. |
| Lege staat | Oefeningbibliotheek leeg bij zoekactie zonder resultaat: alternatief/aanmaakoptie tonen (Golden Rule UX35). |
| Loading state | Zelfde als Scherm 3. |
| Foutmeldingen | Zelfde als Scherm 3. |
| AI-context | Zelfde als Scherm 3. |
| Accessibility | Zelfde als Scherm 3. |
| Interacties | Zoekfunctie plus dezelfde logging-interacties als Scherm 3. |
| Acceptatiecriteria | Oefening vinden en starten met loggen binnen drie tikken vanaf het beginpunt. |

### Scherm 5 — Programma (overzicht, generator, blokdetail)

| Veld | Specificatie |
|---|---|
| Doel | Meerweekse, gepersonaliseerde programma's genereren, bekijken en volgen. |
| Primaire gebruiker | Gebruikers met een concreet doel op de kalender (Persona Ruud, Daan, Sanne). |
| Secundaire gebruiker | Coach die een programma aan een lid toewijst (Persona Iris — toekomstige functionaliteit). |
| Belangrijkste taak | Begrijpen welke week/training nu actueel is en waarom. |
| Informatiehiërarchie | 1) Huidige week gemarkeerd, 2) periodiseringsoverzicht (blokken), 3) generator-parameters bij aanmaken. |
| Visuele prioriteiten | De actuele week krijgt visuele nadruk boven toekomstige/afgeronde weken. |
| Gewenste emoties | Vertrouwen dat het geheel logisch opgebouwd is, controle over parameters. |
| Maximale scroll | Programma-overzicht: één scroll voor alle blokken; blokdetail: uitklapbaar zonder aparte pagina. |
| Maximale tikken | Genereren starten: twee tikken; blok bekijken: één tik (uitklappen). |
| Lege staat | Geen actief programma: duidelijke CTA "Genereer je eerste programma" met korte uitleg van de waarde. |
| Loading state | Generatie loopt per week (bestaande Netlify-timeoutbeperking) — voortgang expliciet getoond per week, niet als één ondoorzichtige balk. |
| Foutmeldingen | Bij mislukte generatie van één week: alleen die week opnieuw proberen, niet het hele programma. |
| AI-context | Elk blok toont kort de periodiseringslogica ("week 3: kracht-fase, omdat…"). |
| Accessibility | Uitklapbare blokken bedienbaar via toetsenbord/schermlezer, niet enkel via tik. |
| Interacties | Uitklappen/inklappen van blokken, parameters aanpassen via formulier (Golden Rule UX6). |
| Acceptatiecriteria | Gebruiker ziet binnen één tik welke training vandaag hoort bij het lopende programma; contentcheck bevestigt gevulde weekinhoud (Product Principle P10). |

### Scherm 6 — Coach (AI-chat)

| Veld | Specificatie |
|---|---|
| Doel | Vragen stellen aan en advies ontvangen van de AI-coach, met volledige uitlegbaarheid. |
| Primaire gebruiker | Alle gebruikers, met name bij twijfel over training of herstel. |
| Secundaire gebruiker | N.v.t. |
| Belangrijkste taak | Een uitlegbaar antwoord ontvangen op een concrete vraag. |
| Informatiehiërarchie | 1) Actief gesprek, 2) laatste coach-advies bovenaan indien relevant, 3) geschiedenis eronder. |
| Visuele prioriteiten | Berichttype (vraag/advies/waarschuwing) visueel onderscheiden (Golden Rule UX24). |
| Gewenste emoties | Vertrouwen, gehoord worden. |
| Maximale scroll | Geschiedenis scrollbaar; actief gesprek altijd zichtbaar zonder scroll. |
| Maximale tikken | Vraag versturen: één tik na intypen. |
| Lege staat | Nieuwe gebruiker zonder geschiedenis: korte introductie van wat de coach kan, met voorbeeldvragen als snelle start. |
| Loading state | Zichtbare "aan het nadenken"-status (Golden Rule UX26), nooit een onverklaarde stilte. |
| Foutmeldingen | Bij AI niet beschikbaar: duidelijke melding met alternatief (zie Deel 9, Error Recovery). |
| AI-context | Elk antwoord toont expliciet welke data is gebruikt (Product Principle P3). |
| Accessibility | Berichten voorleesbaar in logische volgorde; onderscheid berichttype niet uitsluitend via kleur. |
| Interacties | Tekstinvoer, tik op quick-reply-suggesties waar relevant. |
| Acceptatiecriteria | Elk antwoord bevat minimaal één concrete dataverwijzing; laadstatus zichtbaar binnen 300ms na versturen. |

### Scherm 7 — Statistieken / Progressie

| Veld | Specificatie |
|---|---|
| Doel | Trends en inzichten tonen over 1RM, volume, herstel en sportspecifieke metrics. |
| Primaire gebruiker | Data-gedreven gebruikers (Persona Daan), regelmatige gebruikers die vooruitgang willen zien. |
| Secundaire gebruiker | Beginnende gebruiker die een eenvoudige "ben ik vooruitgegaan"-blik zoekt (Persona Fleur). |
| Belangrijkste taak | Een trend begrijpen zonder eerst filters te moeten instellen. |
| Informatiehiërarchie | 1) Standaardweergave (meest relevante metric), 2) filters (optioneel), 3) detailgrafieken. |
| Visuele prioriteiten | De duiding bij een grafiek weegt even zwaar als de grafiek zelf (Golden Rule UX28). |
| Gewenste emoties | Bevestiging van vooruitgang, nieuwsgierigheid. |
| Maximale scroll | Eén scroll voor overzicht; detail per metric via tik, niet via lange doorlopende pagina. |
| Maximale tikken | Filter toepassen: twee tikken; standaardweergave: nul tikken nodig. |
| Lege staat | Onvoldoende data: uitleg wat nodig is om een trend te zien (Golden Rule UX30). |
| Loading state | Skeleton-grafieken tijdens laden. |
| Foutmeldingen | Bij mislukte data-fetch: melding met "opnieuw proberen", losstaand per grafiek. |
| AI-context | Waar relevant: korte AI-duiding bij een opvallende trend (bijv. plateau-signaal). |
| Accessibility | Grafieken hebben een tekstuele samenvatting voor schermlezers, niet enkel visuele weergave. |
| Interacties | Filterchips, sorteeropties, tik voor detailweergave. |
| Acceptatiecriteria | Standaardweergave toont zinvolle informatie zonder enige filter; elke grafiek heeft een duiding. |

### Scherm 8 — Spierherstel-heatmap

| Veld | Specificatie |
|---|---|
| Doel | Visueel, per spiergroep, de actuele hersteltoestand tonen. |
| Primaire gebruiker | Alle actieve gebruikers, dagelijks relevant (Persona Ruud, Marieke in het bijzonder). |
| Secundaire gebruiker | Coach die snel een lid wil beoordelen vóór een klasse (Persona Iris — toekomstig). |
| Belangrijkste taak | In één oogopslag zien welke spiergroepen belast/hersteld zijn. |
| Informatiehiërarchie | Lichaamsvisualisatie primair; tekstuele lijst per spiergroep secundair/aanvullend. |
| Visuele prioriteiten | Kleurcodering is consistent met de rest van de app (Golden Rule UI35); geen concurrerende visuele elementen op hetzelfde scherm. |
| Gewenste emoties | Geruststelling of bewuste voorzichtigheid, nooit schuldgevoel (Product Principle P2). |
| Maximale scroll | Volledige heatmap past op één scherm zonder scroll. |
| Maximale tikken | Detail per spiergroep: één tik. |
| Lege staat | Nieuwe gebruiker zonder trainingsdata: neutrale uitgangsstaat met korte uitleg wat de heatmap gaat tonen. |
| Loading state | Korte laadanimatie bij het (her)laden van de SVG-visualisatie. |
| Foutmeldingen | Bij laadfout: fallback naar tekstuele lijst per spiergroep. |
| AI-context | Tik op een niet-herstelde groep kan doorverwijzen naar een AI-suggestie voor alternatieve belasting. |
| Accessibility | Elke spiergroep heeft een tekstalternatief (percentage + label) naast de visuele kleur. |
| Interacties | Tik voor detail, wissel tussen weergavehoeken indien van toepassing. |
| Acceptatiecriteria | Hersteltoestand van elke hoofdspiergroep zichtbaar zonder scroll, bereikbaar binnen één tik vanaf het dashboard. |

### Scherm 9 — Sessie-samenvatting

| Veld | Specificatie |
|---|---|
| Doel | Direct na een training een overzicht geven van wat bereikt is. |
| Primaire gebruiker | Alle gebruikers, elke voltooide training. |
| Secundaire gebruiker | N.v.t. |
| Belangrijkste taak | Vooruitgang en eventuele PR's herkennen. |
| Informatiehiërarchie | 1) PR's (indien behaald), 2) volume/duur-samenvatting, 3) vergelijking met vorige sessie. |
| Visuele prioriteiten | Een behaalde PR krijgt de grootste visuele nadruk op dit scherm. |
| Gewenste emoties | Voldoening, trots, afsluiting. |
| Maximale scroll | Kernoverzicht zonder scroll; details (per-oefening-uitsplitsing) via scroll. |
| Maximale tikken | Scherm sluiten/doorgaan: één tik. |
| Lege staat | N.v.t. (verschijnt alleen na een voltooide sessie met data). |
| Loading state | Korte laadstatus tijdens het samenstellen van de samenvatting, direct na "sessie afronden". |
| Foutmeldingen | Bij onvolledige synchronisatie: duidelijke melding dat de samenvatting mogelijk nog bijwerkt. |
| AI-context | Optioneel: korte AI-duiding over hoe deze sessie past in het grotere beeld (herstel, periodisering). |
| Accessibility | PR-informatie niet uitsluitend via kleur/badge, ook via tekst. |
| Interacties | Tik om te sluiten, tik om door te klikken naar volledige sessiedetails. |
| Acceptatiecriteria | Verschijnt automatisch bij het afronden van een sessie; een PR is zonder scrollen zichtbaar. |

### Scherm 10 — Profiel (account, atleet-profiel, wearables)

| Veld | Specificatie |
|---|---|
| Doel | Persoonlijke gegevens, account- en wearable-instellingen beheren. |
| Primaire gebruiker | Alle gebruikers, incidenteel bezoek. |
| Secundaire gebruiker | N.v.t. |
| Belangrijkste taak | Een specifieke instelling vinden en wijzigen zonder te verdwalen. |
| Informatiehiërarchie | Duidelijke sectionering: account, atleet-profiel, wearables, data (export/verwijderen) — visueel gescheiden (Product Audit-aanbeveling). |
| Visuele prioriteiten | Destructieve acties (account verwijderen) visueel duidelijk anders dan reguliere instellingen (Golden Rule UI13). |
| Gewenste emoties | Controle, vertrouwen. |
| Maximale scroll | Eén scroll voor het volledige overzicht; secties inklapbaar voor overzicht. |
| Maximale tikken | Een instelling wijzigen: twee tikken. |
| Lege staat | N.v.t. (altijd basisgegevens aanwezig na onboarding). |
| Loading state | Sectiegewijze skeleton bij laden. |
| Foutmeldingen | Per sectie losstaand, zodat een fout in wearable-sync de rest van het profiel niet blokkeert. |
| AI-context | N.v.t. voor dit scherm. |
| Accessibility | Formuliervelden met labels, foutmeldingen ook voor schermlezers aangekondigd. |
| Interacties | Formulierinvoer, toggles, tik naar sub-schermen (wearables, team). |
| Acceptatiecriteria | Elke wijziging toont bevestiging binnen twee seconden; account verwijderen vereist expliciete, niet-dubbelzinnige bevestiging. |

### Scherm 11 — Team / Gymbeheer

| Veld | Specificatie |
|---|---|
| Doel | Ledenlijst, rollen en audit-log binnen een gym beheren. |
| Primaire gebruiker | Coach/manager/owner van een gym (Persona Iris, Tom). |
| Secundaire gebruiker | Regulier lid dat wil zien tot welke gym hij behoort. |
| Belangrijkste taak | Een lid vinden en indien nodig een rol aanpassen. |
| Informatiehiërarchie | Tabs: leden / wijzigingslog; ledenlijst met rol zichtbaar per rij. |
| Visuele prioriteiten | Rolwijzigingen zijn duidelijk gemarkeerd als impactvolle actie. |
| Gewenste emoties | Vertrouwen (voor leden) en overzicht (voor coaches/owners). |
| Maximale scroll | Ledenlijst scrollbaar met zoekfunctie bij meer dan twintig leden. |
| Maximale tikken | Rol wijzigen: twee tikken plus bevestiging. |
| Lege staat | Nieuwe gym zonder leden: uitleg hoe leden uit te nodigen. |
| Loading state | Skeleton-lijst tijdens laden van ledendata. |
| Foutmeldingen | Bij mislukte rolwijziging: duidelijke melding, geen stille no-op. |
| AI-context | N.v.t. voor dit scherm. |
| Accessibility | Rollentabel navigeerbaar via schermlezer, rij-voor-rij. |
| Interacties | Tik voor roldropdown, tik voor wijzigingslog-detail. |
| Acceptatiecriteria | Elke rolwijziging vereist bevestiging en verschijnt zichtbaar in het audit-log. |

### Scherm 12 — Rusttimer (modal)

| Veld | Specificatie |
|---|---|
| Doel | Rust tussen sets beheren zonder de trainingsflow te onderbreken. |
| Primaire gebruiker | Alle trainende gebruikers. |
| Secundaire gebruiker | N.v.t. |
| Belangrijkste taak | Duur zien en indien gewenst aanpassen. |
| Informatiehiërarchie | Aftellende tijd primair, aanpassingsopties secundair maar direct bereikbaar. |
| Visuele prioriteiten | Grote, goed leesbare countdown zichtbaar zelfs op afstand van het scherm (tijdens rust legt men de telefoon vaak neer). |
| Gewenste emoties | Rust, vertrouwen. |
| Maximale scroll | Geen scroll — past volledig op het zichtbare gedeelte. |
| Maximale tikken | Duur aanpassen: één tik. |
| Lege staat | N.v.t. |
| Loading state | N.v.t. (lokale timer, geen netwerkafhankelijkheid). |
| Foutmeldingen | N.v.t. |
| AI-context | Suggestieduur toont kort de RPE-koppeling ("langere rust voorgesteld — vorige set RPE 9"). |
| Accessibility | Countdown ook auditief/haptisch aangekondigd bij einde, niet uitsluitend visueel. |
| Interacties | Tik om te verlengen/verkorten, tik om over te slaan. |
| Acceptatiecriteria | Timer start zonder gebruikersactie; einde wordt op minimaal twee zintuiglijke manieren aangekondigd (visueel + haptisch/geluid). |

### Scherm 13 — Plate Calculator (modal)

| Veld | Specificatie |
|---|---|
| Doel | Exact tonen welke schijven aan de stang moeten voor een gewenst gewicht. |
| Primaire gebruiker | Alle gebruikers die met een langhalter trainen. |
| Secundaire gebruiker | N.v.t. |
| Belangrijkste taak | Snel, tijdens een training, de juiste schijfcombinatie aflezen. |
| Informatiehiërarchie | Doelgewicht primair, visuele schijfweergave direct daaronder. |
| Visuele prioriteiten | Schijven visueel herkenbaar op kleur/grootte, consistent met fysieke kleurcodering. |
| Gewenste emoties | Snelheid, geen rekenwerk nodig. |
| Maximale scroll | Geen scroll. |
| Maximale tikken | Gewicht invoeren: stepper, geen los toetsenbord nodig voor standaardstappen. |
| Lege staat | N.v.t. |
| Loading state | N.v.t. (lokale berekening). |
| Foutmeldingen | Bij een niet haalbaar gewicht met beschikbare schijven: duidelijke melding met dichtstbijzijnde haalbare optie. |
| AI-context | N.v.t. |
| Accessibility | Schijfweergave heeft een tekstuele lijst als alternatief voor de visuele voorstelling. |
| Interacties | Stepper, tik om te sluiten. |
| Acceptatiecriteria | Berekening verschijnt direct (binnen 100ms) na wijziging van het doelgewicht. |

### Scherm 14 — PR-tijdlijn *(toekomstig scherm, nog niet gebouwd — Product Audit-aanbeveling)*

| Veld | Specificatie |
|---|---|
| Doel | Alle behaalde PR's chronologisch tonen als motiverend overzicht. |
| Primaire gebruiker | Alle gebruikers, met name bij langduriger gebruik (Hoofdstuk 1, sectie 1.14). |
| Secundaire gebruiker | N.v.t. |
| Belangrijkste taak | Trots kunnen terugblikken op geleverde prestaties. |
| Informatiehiërarchie | Chronologisch, meest recente PR bovenaan, gegroepeerd per oefening optioneel filterbaar. |
| Visuele prioriteiten | Elke PR toont oefening, datum en waarde in gelijke visuele nadruk. |
| Gewenste emoties | Trots, bevestiging van langetermijnvooruitgang. |
| Maximale scroll | Doorlopende lijst, geen paginering nodig bij normale gebruiksduur. |
| Maximale tikken | Filter op oefening: één tik. |
| Lege staat | Nieuwe gebruiker zonder PR's: motiverende uitleg wat een PR is en hoe de eerste te behalen. |
| Loading state | Skeleton-lijst tijdens laden. |
| Foutmeldingen | Bij laadfout: "opnieuw proberen"-actie. |
| AI-context | N.v.t. — puur registratief scherm. |
| Accessibility | Lijst navigeerbaar via schermlezer met duidelijke datum/waarde-aankondiging per item. |
| Interacties | Filter, tik voor detail (naar de bijbehorende sessie). |
| Acceptatiecriteria | Elke PR ooit behaald is terug te vinden binnen twee tikken vanaf Profiel of Stats. |


---

## Deel 4 — Interaction Design

Vijftien interactietypen, elk met wanneer wel/niet te gebruiken, animatie, feedback, haptiek en toegankelijkheid.

| Interactie | Wanneer gebruiken | Wanneer NIET gebruiken | Animatie | Feedback | Haptics | Accessibility |
|---|---|---|---|---|---|---|
| **Tik** | Standaardinteractie voor alle primaire acties. | Nooit voor acties die precisie vereisen op een klein doel (<44px). | Korte drukstaat (schaal 98%, 80ms). | Visuele state-verandering binnen 100ms. | Lichte tik bij bevestigende acties (set opslaan). | Alternatief altijd bereikbaar via schermlezer-tap. |
| **Swipe** | Alleen voor omkeerbare, niet-destructieve acties (bijv. tussen dagen in een weekweergave navigeren). | Nooit voor destructieve acties (verwijderen) zonder zichtbare bevestiging — swipe-to-delete vereist een expliciete bevestigingsstap, geen directe uitvoering. | Vloeiende volg-animatie met de vinger, terugveren bij onvoltooide swipe. | Visuele indicatie van de vervolgactie tijdens het swipen. | Lichte tik bij het bereiken van de actiedrempel. | Elke swipe-actie heeft een alternatieve tik-toegankelijke route (ontdekbaarheid, Deel 1). |
| **Long press** | Voor secundaire, contextuele acties (bijv. snelmenu op een oefening in een lijst). | Nooit als enige manier om een kernactie te bereiken. | Korte "oplaad"-animatie die de drempel visualiseert. | Contextmenu verschijnt met vloeiende overgang. | Duidelijke haptische bevestiging bij het activeren van het menu. | Contextmenu ook bereikbaar via een zichtbare "meer opties"-knop. |
| **Drag** | Alleen voor herordenen van eigen content (bijv. volgorde van oefeningen in een custom training). | Nooit voor kernacties tijdens een training (te foutgevoelig bij fysieke inspanning). | Element volgt de vinger met lichte schaduw-vergroting. | Duidelijke drop-zone-indicatie. | Lichte tik bij oppakken en bij loslaten. | Alternatieve op-en-neer-knoppen voor wie niet kan slepen. |
| **FAB** | Eén frequent terugkerende actie per scherm (bijv. "Programma toevoegen"). | Nooit voor secundaire acties; nooit meer dan één FAB tegelijk (Golden Rule UI17-18). | Subtiele schaal-animatie bij verschijnen/verdwijnen tussen scroll-richtingen. | Directe visuele bevestiging bij tik. | Lichte tik bij activeren. | Label via `aria-label`, niet enkel icoon. |
| **Cards** | Groeperen van gerelateerde informatie met een enkelvoudig onderwerp (UI8). | Nooit voor twee ongerelateerde datapunten in één kaart. | Lichte "lift"-schaduw bij tik-start, terug bij loslaten. | Tap-affordance duidelijk zichtbaar bij interactieve kaarten (UI10). | Optioneel, licht bij navigatie-tik. | Kaartinhoud in logische leesvolgorde voor schermlezers. |
| **Bottom sheets** | Standaardvorm voor keuzelijsten (rusttimer-presets, plate calculator-opties — UI26). | Nooit voor content die een volledige, aparte pagina rechtvaardigt. | Vloeiende slide-up (250ms, ease-out), scrim-fade gelijktijdig. | Sluitbaar via tik buiten de sheet én expliciete knop (UI27). | Lichte tik bij openen. | Focus verplaatst automatisch naar de sheet voor schermlezers. |
| **Dialogs** | Voor bevestiging van impactvolle acties (UI23-25). | Nooit voor informatieve content zonder actie — gebruik dan een niet-blokkerende melding. | Korte fade/scale-in (150ms). | Exact één primaire en optioneel één secundaire actie. | Onderscheidende haptiek voor destructieve vs. bevestigende dialogs. | Focus-trap binnen de dialog tot een keuze gemaakt is. |
| **Sliders** | Voor continue waarden met een brede range waar precisie minder kritiek is (zelden gebruikt in TrainingKompas — meestal vervangen door steppers). | Nooit voor waarden die exacte precisie vereisen (gewicht, reps) — gebruik dan steppers (UX5). | Vloeiende handle-beweging, geen vertraging. | Live waardeweergave tijdens het schuiven. | Lichte tik bij elke waarde-increment indien discrete stappen. | Ook bedienbaar via toetsenbord-pijltjes/schermlezer-aanpassing. |
| **Steppers** | Standaard voor numerieke invoer tijdens training (gewicht, reps, RPE — UX5). | Nooit wanneer een exacte, ongebruikelijke waarde sneller te typen is — tekstinvoer blijft als fallback beschikbaar. | Korte pulse-animatie bij elke increment-tik. | Waarde direct zichtbaar bijgewerkt. | Lichte tik per increment. | Increment-knoppen minimaal 44×44px, ruim uit elkaar. |
| **Chips** | Filters en categorieselectie (sport/type/spiergroep — UX29). | Nooit voor een enkelvoudige, verplichte keuze — gebruik dan een duidelijkere selector. | Korte kleur/rand-overgang bij selectie (100ms). | Actieve staat via kleur én icoon (UI15). | Optioneel, lichte tik. | Chips-groep aangekondigd als groep voor schermlezers, met individuele status. |
| **Segment controls** | Voor een klein aantal (2-4) gelijkwaardige, exclusieve weergave-opties (bijv. wisselen tussen dag/week/maand-weergave in Stats). | Nooit voor meer dan vier opties — gebruik dan chips of een dropdown. | Vloeiende "pill"-verschuiving tussen segmenten (150ms). | Actieve segment duidelijk visueel gemarkeerd. | Lichte tik bij wisselen. | Aangekondigd als tabgroep met huidige selectie voor schermlezers. |
| **Zoekfunctie** | Voor het vinden van specifieke oefeningen/programma's in een grotere lijst (UX34). | Nooit als verplichte stap wanneer een korte lijst ook direct browsable is. | Resultaten verschijnen met lichte fade-in naarmate ze binnenkomen. | Resultaten binnen 300ms na laatste toetsaanslag. | N.v.t. | Resultatenlijst aangekondigd met aantal treffers voor schermlezers. |
| **Contextmenu's** | Voor secundaire acties op een bestaand item (bewerken, verwijderen, delen) via long press of een "meer"-icoon. | Nooit voor de primaire actie van een item — die blijft een directe tik. | Snelle fade/scale-in nabij het aanraakpunt. | Duidelijke visuele scheiding tussen destructieve en neutrale opties (UI13). | Lichte tik bij openen. | Menu-items navigeerbaar via schermlezer in logische volgorde. |
| **Toetsenbordgedrag** | Voor vrije tekstinvoer waar geen stepper toepasbaar is (naam, notities, coach-chat). | Nooit voor waarden waarvoor een stepper sneller en foutbestendiger is (UX5). | Scherm schuift op zodat het actieve veld zichtbaar blijft boven het toetsenbord. | Directe tekstweergave, geen vertraging. | N.v.t. | Correct `inputmode` per veldtype (numeriek, tekst) voor het juiste toetsenbord. |

---

## Deel 5 — Motion Design

Tien categorieën animatie, elk met duur, easing, doel en de voorwaarde waaronder de animatie verboden is. Dit bouwt direct voort op Golden Rule UI44 (gestandaardiseerde duur/easing-waarden) en Performance Principle "animaties blokkeren nooit de workflow" (Hoofdstuk 3, Deel 8).

| Categorie | Duur | Easing | Doel | Wanneer verboden |
|---|---|---|---|---|
| **Pagina-overgangen** | 200-250ms | Ease-in-out | Ruimtelijke oriëntatie behouden tussen schermen. | Tijdens een actieve trainingssessie mag een overgang nooit de invoer van de volgende set vertragen. |
| **Kaartanimaties** | 150ms | Ease-out | Bevestigen dat een kaart interactief/geselecteerd is. | Nooit bij louter informatieve kaarten zonder interactie. |
| **Workout logging (set opslaan)** | 100ms | Ease-out | Directe, geruststellende bevestiging dat een set is vastgelegd. | Nooit langer dan 150ms — elke vertraging hier voelt als frictie tijdens fysieke inspanning. |
| **AI-antwoorden** | Variabel (typerende tekst-animatie, max. leessnelheid) | Lineair | Suggereren dat het antwoord "levend" tot stand komt, zonder de leessnelheid te vertragen. | Verboden wanneer de gebruiker de tekst al kan lezen sneller dan de animatie toestaat — dan direct volledige tekst tonen. |
| **Grafieken (tekenen van een lijn/staaf)** | 400-600ms bij eerste laden | Ease-out | Nadruk leggen op de vorm van een trend bij eerste weergave. | Nooit herhalen bij elke terugkeer naar hetzelfde scherm binnen dezelfde sessie — enkel bij eerste laden. |
| **Progress bars (weekvoortgang, synchronisatie)** | Vloeiend meebewegend met daadwerkelijke voortgang | Lineair voor determinate voortgang | Accuraat, vertrouwd beeld van daadwerkelijke voortgang. | Verboden: een voortgangsbalk die sneller/langzamer beweegt dan de daadwerkelijke onderliggende voortgang (misleidend). |
| **Skeleton loading** | Zachte pulse-cyclus, 1200ms per cyclus | Ease-in-out | Structuur van de komende content alvast suggereren. | Nooit langer dan nodig — zodra data beschikbaar is, direct vervangen zonder extra vertraging. |
| **Success states (bevestiging, PR)** | 200-400ms afhankelijk van gewicht van de gebeurtenis | Ease-out met lichte overshoot bij PR | Positieve bekrachtiging zonder overdaad. | Verboden: herhaalde identieke, uitbundige animatie bij elke gewone set (bewaar de "grotere" animatie voor PR's specifiek, Deel 9 Hoofdstuk 3). |
| **Error states** | 150ms shake/nadruk | Ease-in-out | Aandacht vestigen op wat hersteld moet worden, zonder te choqueren. | Verboden: felle, alarmerende animaties (snel knipperen, harde kleurflits) die stress toevoegen aan een toch al frustrerend moment. |
| **PR-animaties** | 400-600ms, eenmalig per PR | Ease-out met lichte overshoot | Oprechte, ingehouden viering (Hoofdstuk 3, Deel 9). | Verboden: confetti-achtige effecten die na herhaling irritant worden voor de doelgroep (Product Principle P12). |

**Algemene motion-regel:** elke animatie in TrainingKompas dient een van drie doelen — oriëntatie (waar kom ik vandaan/waar ga ik heen), bevestiging (is mijn actie geslaagd), of nadruk (dit is belangrijk). Een animatie die geen van deze drie doelen dient, wordt niet gebouwd, ongeacht hoe "premium" hij eruit zou zien (Product Principle P6).


---

## Deel 6 — Micro-interactions

Tachtig micro-interacties, gegroepeerd per functioneel gebied. Elke micro-interactie is een concrete toepassing van de Motion Design-regels (Deel 5) en de Golden Rules uit Hoofdstuk 3.

### Workout logging (1-12)

| # | Interactie | Trigger | Animatie | Geluid | Haptiek | Duur | Emotioneel doel |
|---|---|---|---|---|---|---|---|
| 1 | Set opgeslagen | Tik op opslaan-knop | Korte pulse + vinkje-icoon | Geen | Lichte tik | 100ms | Directe geruststelling |
| 2 | Gewicht aangepast via stepper | Tik op +/- | Waarde-increment met korte pulse | Geen | Zeer lichte tik | 80ms | Precisiegevoel |
| 3 | Reps aangepast via stepper | Tik op +/- | Zelfde als gewicht | Geen | Zeer lichte tik | 80ms | Precisiegevoel |
| 4 | RPE ingesteld via stepper | Tik op RPE-waarde | Kleurverloop van neutraal naar intensiteitskleur | Geen | Lichte tik | 100ms | Bevestiging van intensiteit |
| 5 | Superset toegevoegd | Tik op "Superset" | Kaarten visueel gekoppeld met verbindingslijn | Geen | Lichte tik | 150ms | Structuurgevoel |
| 6 | Oefening toegevoegd aan sessie | Tik op "+ Oefening" | Nieuwe kaart schuift in vanaf onder | Geen | Lichte tik | 200ms | Uitbreiding zichtbaar maken |
| 7 | Oefening verwijderd uit sessie | Bevestiging in dialog | Kaart schuift uit en vervaagt | Geen | Middel-sterke tik (destructief) | 200ms | Duidelijke, opzettelijke actie |
| 8 | Sessie gepauzeerd | Tik op pauze-icoon | Timer-cijfers vervagen naar grijs | Geen | Lichte tik | 150ms | Rust, geen paniek |
| 9 | Sessie hervat | Tik op hervat-icoon | Timer-cijfers keren terug naar actieve kleur | Geen | Lichte tik | 150ms | Hervatting van focus |
| 10 | Sessie afgerond | Tik op "Klaar"-knop | Overgang naar samenvattingsscherm met lichte fade | Geen | Middel-sterke tik | 300ms | Afsluiting, voldoening |
| 11 | Dubbele tik op opslaan genegeerd | Tweede tik binnen 500ms | Geen extra animatie (bewust onderdrukt) | Geen | Geen tweede haptiek | N.v.t. | Betrouwbaarheid zonder ruis |
| 12 | Apparatuurinstelling onthouden | Automatisch bij opslaan set met gekoppelde apparatuur | Klein icoon-vinkje naast instelling | Geen | Geen | 100ms | Onzichtbaar gemak |

### Rusttimer (13-20)

| # | Interactie | Trigger | Animatie | Geluid | Haptiek | Duur | Emotioneel doel |
|---|---|---|---|---|---|---|---|
| 13 | Timer start automatisch | Set opgeslagen | Balk verschijnt van onderaf | Optioneel zacht signaal | Lichte tik | 200ms | Verzorgd, meedenkend |
| 14 | Timer loopt af (30 sec resterend) | Countdown bereikt 30 sec | Kleur verschuift naar waarschuwend geel | Geen | Geen | Doorlopend | Voorbereiding op hervatten |
| 15 | Timer afgelopen | Countdown bereikt 0 | Korte pulse + kleur naar actief groen | Zacht signaal (indien geluid aan) | Duidelijke, onderscheidende trilling | 300ms | Duidelijk, niet schrikaanjagend signaal |
| 16 | Timer verlengd | Tik op "+30 sec" | Balk verlengt vloeiend | Geen | Lichte tik | 150ms | Controle behouden |
| 17 | Timer overgeslagen | Tik op "overslaan" | Balk vervaagt direct | Geen | Lichte tik | 100ms | Snelheid, geen frictie |
| 18 | Timer-suggestie gebaseerd op RPE | Automatisch bij starten | Korte tekst-fade-in met toelichting | Geen | Geen | 150ms | Uitlegbaarheid |
| 19 | Timer op de achtergrond (ander scherm bezocht) | Navigatie weg van trainingsscherm | Compacte balk blijft zichtbaar onderaan | Geen | Geen | Doorlopend | Continuïteit, geen verlies van context |
| 20 | Timer geannuleerd bij sessie-einde | Sessie afgerond tijdens actieve timer | Balk vervaagt samen met scherm-overgang | Geen | Geen | 200ms | Nette afsluiting |

### AI-coach (21-32)

| # | Interactie | Trigger | Animatie | Geluid | Haptiek | Duur | Emotioneel doel |
|---|---|---|---|---|---|---|---|
| 21 | Bericht verzonden naar coach | Tik op versturen | Bericht schuift in vanaf rechts | Geen | Lichte tik | 150ms | Bevestiging van verzending |
| 22 | AI "denkt na" | Direct na verzenden | Drie pulserende puntjes | Geen | Geen | Doorlopend tot antwoord | Geruststelling dat er iets gebeurt |
| 23 | AI-antwoord ontvangen | Antwoord binnen | Tekst verschijnt typerend (leessnelheid) | Geen | Zeer lichte tik bij start | Variabel | Levend, persoonlijk gevoel |
| 24 | AI-waarschuwing getoond | Automatische trigger (bijv. ACWR-piek) | Kaart met accentkleur schuift in | Geen | Onderscheidende, iets sterkere trilling | 200ms | Aandacht zonder paniek |
| 25 | AI-advies genegeerd ("gewoon starten") | Tik op alternatieve knop | Advies-kaart vervaagt, training start | Geen | Lichte tik | 150ms | Respect voor eigen keuze |
| 26 | AI-advies opgevolgd ("pas aan en start") | Tik op aanbevolen knop | Kaart transformeert naar aangepast schema | Geen | Lichte tik | 200ms | Samenwerking bevestigd |
| 27 | Data-onderbouwing uitgeklapt | Tik op "waarom dit advies" | Sectie klapt open met fade-in | Geen | Lichte tik | 150ms | Transparantie tastbaar maken |
| 28 | Chat-geschiedenis geladen | Scroll naar boven in chat | Oudere berichten schuiven zachtjes in | Geen | Geen | 200ms | Continuïteit van geheugen |
| 29 | AI niet beschikbaar | API-fout | Neutrale melding met "opnieuw proberen" | Geen | Zachte foutmelding-trilling | 150ms | Geen paniek, duidelijk alternatief |
| 30 | Sportcontext gewisseld | Sport aangepast in profiel | Korte bevestiging "coach-context bijgewerkt" | Geen | Lichte tik | 150ms | Zichtbare personalisatie |
| 31 | Plateau-signaal getoond | Automatische detectie | Kaart met neutrale, niet-alarmerende kleur | Geen | Lichte tik | 200ms | Gezamenlijk probleem, geen falen |
| 32 | Check-in-invloed vooraf getoond | Invullen check-in-veld | Live-preview van verwachte impact | Geen | Geen | 100ms per wijziging | Uitlegbaarheid vóór het advies |

### PR's en prestaties (33-42)

| # | Interactie | Trigger | Animatie | Geluid | Haptiek | Duur | Emotioneel doel |
|---|---|---|---|---|---|---|---|
| 33 | Nieuw PR behaald tijdens set | Automatische detectie na opslaan | Badge verschijnt met lichte overshoot-schaal | Optioneel zacht, kort signaal | Onderscheidende, positieve trilling | 400ms | Oprechte trots |
| 34 | PR bevestigd in sessie-samenvatting | Scherm geopend na sessie | Badge subtiel herhaald, niet opnieuw "groot" | Geen | Geen | 200ms | Consistente erkenning zonder overdaad |
| 35 | PR-tijdlijn geopend | Tik vanuit Profiel/Stats | Lijst met lichte staggered fade-in per item | Geen | Geen | 300ms totaal | Trots op geschiedenis |
| 36 | Weekdoel gehaald | Automatische detectie bij laatste sessie van de week | Voortgangsbalk vult volledig met korte pulse | Optioneel zacht signaal | Lichte tik | 300ms | Voldoening over consistentie |
| 37 | Streak voortgezet | Training gelogd op geplande dag | Streak-teller incrementeert met korte pulse | Geen | Zeer lichte tik | 100ms | Eerlijke erkenning van consistentie |
| 38 | Streak bewust onderbroken (rustdag) | Geplande rustdag volgens schema | Geen negatieve animatie — neutrale weergave | Geen | Geen | N.v.t. | Geen schuldgevoel bij verstandige rust |
| 39 | Mesocyclus afgerond | Laatste training van een programmablok | Blok visueel "afgevinkt" met vloeiende overgang | Geen | Lichte tik | 200ms | Afsluiting van een fase |
| 40 | Nieuw 1RM berekend (Epley-schatting) | Automatische herberekening na zware set | Cijfer update met korte highlight-flits | Geen | Geen | 150ms | Zichtbare, actuele progressie |
| 41 | Badge behaald (indien gebouwd) | Trainingsmijlpaal bereikt | Badge-icoon verschijnt met lichte overshoot | Optioneel zacht signaal | Lichte tik | 300ms | Erkenning van een concrete mijlpaal |
| 42 | Jaaroverzicht geopend | Tik vanuit Profiel (toekomstig) | Samenvattende kaarten schuiven na elkaar in | Geen | Geen | 400ms totaal | Tastbaar maken van opgebouwde geschiedenis |

### Synchronisatie en offline (43-52)

| # | Interactie | Trigger | Animatie | Geluid | Haptiek | Duur | Emotioneel doel |
|---|---|---|---|---|---|---|---|
| 43 | Actie offline opgeslagen | Schrijfactie zonder verbinding | Klein wachtrij-icoon verschijnt | Geen | Zeer lichte tik | 100ms | Geruststelling: niets gaat verloren |
| 44 | Synchronisatie gestart | Verbinding hersteld | Wachtrij-icoon krijgt subtiele pulse-animatie | Geen | Geen | Doorlopend | Zichtbaarheid van actief proces |
| 45 | Synchronisatie voltooid | Alle wachtrij-items verwerkt | Icoon verdwijnt met korte fade + vinkje | Geen | Lichte tik | 200ms | Bevestiging van volledige afronding |
| 46 | Synchronisatie deels mislukt | Eén of meer items falen | Icoon blijft met waarschuwingskleur | Geen | Zachte foutmelding-trilling | 150ms | Duidelijk, niet-paniekerig signaal |
| 47 | Offline-wachtrij geopend | Tik op wachtrij-badge | Modal met lijst schuift omhoog | Geen | Lichte tik | 200ms | Transparantie over wat nog wacht |
| 48 | Conflict tussen apparaten gedetecteerd | Gelijktijdige wijziging herkend | Duidelijke keuzedialoog verschijnt | Geen | Middel-sterke trilling | 150ms | Serieuze, niet-genegeerde melding |
| 49 | Verbinding verloren tijdens gebruik | Netwerkstatus wijzigt | Subtiele statusbalk bovenaan verschijnt | Geen | Geen | 200ms | Informatief, niet alarmerend |
| 50 | Verbinding hersteld | Netwerkstatus wijzigt terug | Statusbalk vervaagt | Geen | Geen | 200ms | Rustige bevestiging |
| 51 | Handmatige "sync nu"-actie | Tik op synchronisatieknop | Icoon draait kort tijdens verwerking | Geen | Lichte tik | Variabel | Gevoel van controle |
| 52 | Exportbestand gereed | Export voltooid | Downloadbevestiging met korte fade-in | Geen | Lichte tik | 150ms | Vertrouwen in data-eigenaarschap |

### Wearables (53-58)

| # | Interactie | Trigger | Animatie | Geluid | Haptiek | Duur | Emotioneel doel |
|---|---|---|---|---|---|---|---|
| 53 | Wearable-koppeling gestart | Tik op "Koppelen" | Overgang naar externe OAuth-flow | Geen | Lichte tik | N.v.t. | Vertrouwd, verwacht gedrag |
| 54 | Wearable succesvol gekoppeld | Terugkeer na autorisatie | Kaart update met groene statusindicator | Geen | Positieve trilling | 200ms | Opluchting, gemak bevestigd |
| 55 | Wearable-sync voltooid | Automatische periodieke sync | Klein "laatst gesynchroniseerd"-label update | Geen | Geen | 100ms | Onzichtbare betrouwbaarheid |
| 56 | Wearable-token nadert verval | 48 uur vóór verval | Proactieve melding met duidelijke actie | Geen | Lichte tik | 150ms | Voorkomen van verrassing |
| 57 | Wearable-koppeling verlopen | Token verlopen zonder actie | Statuskaart wijzigt naar duidelijk herstelbaar | Geen | Zachte foutmelding-trilling | 150ms | Geen paniek, duidelijk herstelpad |
| 58 | Wearable losgekoppeld | Tik op "Loskoppelen" na bevestiging | Kaart update naar neutrale, ongekoppelde staat | Geen | Lichte tik | 150ms | Controle bevestigd |

### Programma's (59-66)

| # | Interactie | Trigger | Animatie | Geluid | Haptiek | Duur | Emotioneel doel |
|---|---|---|---|---|---|---|---|
| 59 | Programma-generatie gestart | Tik op "AI genereren" | Voortgangsindicator per week verschijnt | Geen | Lichte tik | Doorlopend | Vertrouwen in het proces |
| 60 | Eén programmaweek gegenereerd | Backend-respons per week | Weekkaart vult in met lichte fade-in | Geen | Zeer lichte tik | 200ms | Tastbare voortgang tijdens wachten |
| 61 | Programmablok uitgeklapt | Tik op blok | Inhoud schuift open, chevron roteert | Geen | Lichte tik | 200ms | Voorspelbare onthulling |
| 62 | Programma opgeslagen | Tik op "Opslaan" | Bevestigingsbanner verschijnt kort | Geen | Lichte tik | 150ms | Zekerheid van bewaring |
| 63 | Resterende weken herverdeeld | Automatisch na gemiste training | Betrokken weken visueel gemarkeerd als "bijgewerkt" | Geen | Lichte tik | 200ms | Geruststelling, geen "kapot" gevoel |
| 64 | Programma stopgezet | Bevestiging in dialog | Programma-kaart vervaagt naar archief-status | Geen | Middel-sterke tik (destructief) | 200ms | Opzettelijke, bevestigde actie |
| 65 | Mesocyclusvergelijking geopend | Tik op "vergelijk met vorig blok" | Twee kolommen schuiven naast elkaar in | Geen | Lichte tik | 250ms | Inzicht in effectiviteit |
| 66 | Programma toegewezen aan lid (coach-functie, toekomstig) | Tik op "Toewijzen" | Bevestigingskaart met ontvanger-naam | Geen | Lichte tik | 150ms | Duidelijke overdracht van verantwoordelijkheid |

### Gym en social (67-72)

| # | Interactie | Trigger | Animatie | Geluid | Haptiek | Duur | Emotioneel doel |
|---|---|---|---|---|---|---|---|
| 67 | Rol gewijzigd in Team-scherm | Bevestiging in dialog | Rolbadge update met korte kleurovergang | Geen | Middel-sterke tik | 150ms | Bewuste, geregistreerde wijziging |
| 68 | Nieuw lid gekoppeld aan gym | E-mailbevestiging voltooid | Naam verschijnt in ledenlijst met fade-in | Geen | Lichte tik | 200ms | Welkom, erbij horen |
| 69 | Oefening gedeeld op gym-niveau | Tik op "Deel met gym" | Zichtbaarheids-icoon wijzigt van persoonlijk naar gym | Geen | Lichte tik | 150ms | Bewuste keuze bevestigd |
| 70 | PR van medelid zichtbaar (social, toekomstig) | Automatische melding binnen gymfeed | Kaart verschijnt zachtjes in feed | Geen | Geen | 200ms | Gemeenschapsgevoel |
| 71 | Deelname aan weekuitdaging (toekomstig) | Tik op "Doe mee" | Bevestigingsbadge verschijnt | Geen | Lichte tik | 150ms | Vrijwillige, positieve keuze |
| 72 | Coach-pincode ingevoerd | Cijferinvoer voltooid | Overgang naar coach-weergave | Geen | Lichte tik | 150ms | Toegang bevestigd |

### Instellingen en overig (73-80)

| # | Interactie | Trigger | Animatie | Geluid | Haptiek | Duur | Emotioneel doel |
|---|---|---|---|---|---|---|---|
| 73 | Instelling gewijzigd (toggle) | Tik op toggle | Vloeiende schuifbeweging | Geen | Lichte tik | 150ms | Directe, tastbare controle |
| 74 | Account-verwijdering bevestigd | Dubbele bevestiging voltooid | Korte, neutrale afsluitanimatie | Geen | Middel-sterke tik | 200ms | Serieuze, gerespecteerde keuze |
| 75 | Data-export gestart | Tik op "Exporteren" | Voortgangsindicator, geen blokkerende modal | Geen | Lichte tik | Doorlopend | Vertrouwen tijdens het wachten |
| 76 | Taal-/weergavevoorkeur gewijzigd | Selectie in instellingen | Directe herweergave zonder herstart | Geen | Lichte tik | 150ms | Onmiddellijke personalisatie |
| 77 | Zoekresultaat gevonden | Toetsaanslag in zoekveld | Resultatenlijst vult met lichte fade-in | Geen | Geen | 150ms | Snelheid, controle |
| 78 | Lege zoekresultaten getoond | Geen match gevonden | Alternatief/CTA verschijnt met fade-in | Geen | Geen | 150ms | Geen doodlopend pad |
| 79 | Onboarding-stap voltooid | Tik op "Volgende" | Voortgangsindicator schuift op | Geen | Lichte tik | 150ms | Voelbare vooruitgang |
| 80 | Eerste gepersonaliseerd advies getoond (einde onboarding) | Onboarding voltooid | Kaart verschijnt met lichte overshoot, iets prominenter dan standaard | Optioneel zacht signaal | Positieve trilling | 400ms | "Dit is voor mij gemaakt"-gevoel |


---

## Deel 7 — Feedback Patterns

Acht feedbackcategorieën, elk met kleur, iconen, tekst, positie, timing en toegankelijkheid. Kleurwaarden refereren aan het Brand Identity-palet (Hoofdstuk 1/3): `#00B894` (teal, positief), `#0B1D2A`/`#0E3B4A` (donkerblauw/petrol, neutraal/informatief).

| Type | Kleur | Iconen | Tekst | Positie | Timing | Toegankelijkheid |
|---|---|---|---|---|---|---|
| **Succes** | Teal `#00B894` | Vinkje | Kort, bevestigend ("Set opgeslagen") | Inline bij de actie, geen aparte melding voor routinematige successen | Verdwijnt na 2 sec of blijft als permanente statusverandering | Aangekondigd voor schermlezers via `aria-live="polite"` |
| **Waarschuwing** | Amber/geel (bestaande `--y`-variabele) | Driehoek met uitroepteken | Concreet, actiegericht ("Belasting steeg 35% deze week") | Prominente kaart, niet als toast die snel verdwijnt | Blijft zichtbaar tot gebruiker het bevestigt of de onderliggende situatie verandert | `aria-live="assertive"` bij nieuwe, relevante waarschuwingen |
| **Fout** | Donkerrood/neutraal-donker (geen fel alarmrood, past bij ingehouden merktoon) | Kruisje of uitroepteken in cirkel | Wat misging + concrete herstelactie (Golden Rule UX36) | Inline bij het betreffende element, of als blokkerende melding bij kritieke fouten | Blijft zichtbaar tot opgelost of expliciet weggetikt | `aria-live="assertive"`, foutmelding gekoppeld aan het formulierveld via `aria-describedby` |
| **Informatie** | Petrol `#0E3B4A`, neutraal | Info-icoon (i) | Kort, niet-dringend | Inline, laagdrempelig | Verdwijnt na interactie of blijft als contextuele hint | `aria-live="polite"` |
| **Loading** | Neutrale grijstinten (skeleton) of merkkleur voor spinners | Skeleton-vormen of subtiele spinner | Geen tekst nodig bij korte laadtijden; "Even geduld" bij langere processen (programmagenerator) | Exact op de plek waar de uiteindelijke content verschijnt | Direct bij start van het wachten, vervangen zodra data beschikbaar is | Laadstatus aangekondigd als "bezig met laden" voor schermlezers |
| **Synchronisatie** | Neutraal, met teal bij voltooiing | Wachtrij-icoon, vinkje bij afronding | "X items wachten op synchronisatie" / "Alles gesynchroniseerd" | Klein, persistent statuselement (badge), nooit blokkerend | Continu zichtbaar zolang relevant | Status opvraagbaar via een expliciet element, niet enkel via kleur van een klein icoon |
| **AI** | Petrol/teal-accent om AI-content te onderscheiden van systeemteksten | Coach-icoon of avatar-achtig element | Volledige zin met data + redenering (Product Principle P3) | Binnen de chat-structuur of als kaart op relevante schermen (coach-advies) | Verschijnt na "aan het nadenken"-status, blijft permanent in geschiedenis | Berichttype (vraag/advies/waarschuwing) ook tekstueel aangekondigd, niet enkel visueel |
| **Validatie** | Neutraal tot amber afhankelijk van ernst | Klein waarschuwingsicoon naast het veld | Concreet: wat is er nodig ("Vul een geldig gewicht in") | Direct onder het betreffende veld | Verschijnt zodra het veld verlaten wordt of bij poging tot opslaan, niet tijdens het typen zelf | Foutmelding gekoppeld aan veld via `aria-describedby`, aangekondigd bij focus |

---

## Deel 8 — Empty States

De lege toestand van elk relevant scherm, met uitleg, motivatie, eventuele AI-suggestie, volgende stap en CTA. Illustraties zijn optioneel en waar genoemd bewust sober gehouden — passend bij de ingehouden merktoon (Product Principle P6), geen speelse mascotte-illustraties die niet passen bij een serieuze sportersdoelgroep.

| Scherm | Uitleg | Motivatie | AI-suggestie | Volgende stap | CTA | Illustratie |
|---|---|---|---|---|---|---|
| **Dashboard (nieuwe gebruiker)** | "Je hebt nog geen trainingen gelogd." | "Elke eerste stap telt — begin met je eerste sessie." | N.v.t. (vervangen door onboarding-vervolg indien nog niet voltooid) | Eerste training starten | "Start je eerste training" | Sober lijnicoon van een halter, geen mascotte |
| **Stats/Progressie (onvoldoende data)** | "Nog niet genoeg data voor een trend." | "Na drie sessies op dezelfde oefening tonen we hier je progressie." | N.v.t. | Verder trainen en loggen | "Terug naar training" | Lege grafiek-omtrek als subtiele hint |
| **Spierherstel-heatmap (nieuwe gebruiker)** | "Nog geen trainingsdata om herstel te berekenen." | "Zodra je een training logt, zie je hier per spiergroep hoe hersteld je bent." | N.v.t. | Eerste training starten | "Start training" | Neutrale, ongekleurde lichaamsvisualisatie |
| **Programma-overzicht (geen actief programma)** | "Je hebt nog geen programma." | "Een programma geeft je periodisering en een duidelijk doel — TrainingKompas bouwt het voor je op." | Kort voorbeeld van wat de AI-generator oplevert | Programma genereren | "Genereer je eerste programma" | Sober kalender-lijnicoon |
| **PR-tijdlijn (geen PR's)** | "Nog geen records behaald." | "Je eerste PR verschijnt hier zodra je een gewicht, herhaling of tijd verbetert." | N.v.t. | Verder trainen | "Bekijk je trainingsschema" | Sober medaille-lijnicoon, niet opzichtig |
| **Coach-chatgeschiedenis (nieuwe gebruiker)** | "Nog geen gesprekken met je coach." | "Stel een vraag over herstel, belasting of je volgende training." | Twee à drie voorbeeldvragen als snelle start | Een vraag stellen | Voorbeeldvraag-chips tonen | Geen illustratie nodig — voorbeeldvragen zijn zelf de content |
| **Oefeningbibliotheek (geen zoekresultaat)** | "Geen oefeningen gevonden voor '[zoekterm]'." | "Controleer de spelling, of maak deze oefening zelf aan." | N.v.t. | Nieuwe oefening aanmaken | "Nieuwe oefening toevoegen" | Geen illustratie, tekst is voldoende |
| **Team/gymledenlijst (nieuwe gym)** | "Nog geen leden in deze gym." | "Nodig leden uit zodat zij trainingen en voortgang kunnen delen binnen jullie gym." | N.v.t. | Uitnodiging versturen/lid koppelen | "Nodig een lid uit" | Sober mensen-lijnicoon |
| **Offline-wachtrij (leeg, alles gesynchroniseerd)** | "Alles is gesynchroniseerd." | Positieve bevestiging, geen "leeg"-gevoel maar een "compleet"-gevoel. | N.v.t. | N.v.t. — geen actie nodig | Geen CTA nodig | Vinkje-icoon |

---

## Deel 9 — Error Recovery

Zeven foutscenario's, elk met melding, uitleg, herstelactie, fallback en logging. Direct gekoppeld aan Product Principle P8 ("nooit een stille fout") en Golden Rule UX36-38 (Hoofdstuk 3).

| Situatie | Melding | Uitleg | Herstelactie | Fallback | Logging |
|---|---|---|---|---|---|
| **Netwerkproblemen** | "Geen verbinding — je wijzigingen worden lokaal bewaard." | Korte, geruststellende toelichting dat niets verloren gaat. | "Opnieuw proberen" zodra verbinding terugkeert (automatisch of handmatig). | Volledige offline-functionaliteit voor trainingslogging (UX41). | Foutmoment en duur van offline-periode gelogd voor toekomstige betrouwbaarheidsanalyse. |
| **AI niet beschikbaar** | "De coach is momenteel niet bereikbaar." | Duidelijk dat dit tijdelijk is, geen indicatie van permanent verlies van functionaliteit. | "Opnieuw proberen"-knop; training kan ondertussen gewoon zonder AI-advies gestart worden. | Trainen zonder AI-advies blijft volledig mogelijk — de kernflow is nooit afhankelijk van AI-beschikbaarheid. | Foutcode en tijdstip gelogd server-side (Netlify Function-niveau) voor monitoring. |
| **Synchronisatie mislukt** | "X item(s) konden niet gesynchroniseerd worden." | Specifiek benoemen welke actie het betreft, niet enkel een generiek "er ging iets mis". | "Opnieuw proberen" per item, of "later automatisch opnieuw proberen". | Item blijft zichtbaar in de offline-wachtrij tot het alsnog lukt. | Elke mislukte synchronisatiepoging gelogd met reden (netwerkfout, serverfout, conflict). |
| **Oefening niet gevonden** | "Deze oefening bestaat niet meer of is niet beschikbaar." | Kan gebeuren bij verwijderde of niet-gedeelde content (drie-laags model). | Alternatieve, vergelijkbare oefening suggereren; optie om een nieuwe aan te maken. | Sessie kan doorgaan met een vervangende oefening zonder de hele training te blokkeren. | Gelogd welke oefening-ID niet gevonden werd, voor detectie van datamodel-inconsistenties. |
| **Wearable-fout** | "Synchronisatie met [wearable] mislukt." | Onderscheid tussen "tijdelijk probleem" en "koppeling verlopen — opnieuw autoriseren nodig" (UX33). | Directe link naar de wearable-instellingen om opnieuw te koppelen indien nodig. | Handmatige HRV-invoer blijft altijd beschikbaar als volwaardig alternatief (Hoofdstuk 2, JTBD 29). | Foutdetails gelogd inclusief of het een tokenprobleem of een tijdelijke API-storing betreft. |
| **Opslag mislukt (lokale storage vol/fout)** | "Kon niet lokaal opslaan — probeer het opnieuw." | Zeldzaam scenario, maar cruciaal tijdens een actieve training. | Directe herhaalpoging; bij herhaald falen: waarschuwing dat de sessie een goede verbinding nodig heeft. | Waar mogelijk: kritieke data (huidige set) apart bewaren van minder kritieke data (UI-voorkeuren) zodat trainingsdata voorrang krijgt. | Kritiek foutniveau gelogd — dit scenario verdient prioriteit bij monitoring gezien de impact op trainingsdata. |
| **Conflict tussen apparaten** | "Deze sessie is ook op een ander apparaat gewijzigd." | Uitleggen wat er verschilt tussen de twee versies, niet automatisch overschrijven. | Gebruiker kiest expliciet welke versie behouden blijft, of de app biedt een samenvoeg-suggestie waar dat veilig kan. | Bij twijfel: nooit automatisch de meest recente versie kiezen zonder gebruikersbevestiging — dataverlies is onacceptabel (Product Principle P8/P14). | Conflictmoment, betrokken apparaten en gebruikerskeuze gelogd voor toekomstige patroonherkenning. |

---

## Deel 10 — Accessibility UX

Zeven doelgroepspecifieke toegankelijkheidsscenario's, elk direct gekoppeld aan de persona's uit Hoofdstuk 2 en de principes uit Hoofdstuk 3, Deel 7.

**Ouderen (Persona Ruud, 51; Persona Marieke, 58; Persona Tom, 45).** Grotere standaard-lettergrootte dan bij veel consumenten-apps gebruikelijk (minimaal 16px voor kerninformatie, Golden Rule UI37), hoger contrast dan het wettelijke minimum waar mogelijk, en geen interactiepatronen die uitsluitend op snelle, kleine gebaren leunen (bijvoorbeeld geen kleine swipe-only-acties zonder alternatief, Deel 4).

**Kleurenblindheid.** Geen enkele functionele informatie (hersteltoestand, actieve navigatie, foutstatus) wordt uitsluitend via kleur overgebracht (Golden Rule UX2, UI34). De spierherstel-heatmap — het meest kleurafhankelijke scherm in de app — krijgt daarom altijd een tekstueel percentage per spiergroep naast de visuele kleurcodering (Scherm 8, Deel 3).

**Schermlezers.** Elk interactief element heeft een betekenisvol toegankelijk label (niet "knop 3" maar "Set opslaan"). Dynamische content (AI-antwoorden, synchronisatiestatus) wordt aangekondigd via `aria-live`-regio's met een passend assertiviteitsniveau (Deel 7). Navigatievolgorde voor schermlezers matcht de visuele leesvolgorde op elk scherm.

**Grote lettertypes (systeeminstelling van de gebruiker).** De interface moet correct schalen wanneer een gebruiker een grotere systeemlettergrootte heeft ingesteld, zonder dat tekst wordt afgekapt of knoppen onbruikbaar worden — dit is met name relevant voor de oudere doelgroep die vaker een vergrote systeeminstelling gebruikt.

**Motorische beperkingen.** Ruime touch-targets (minimaal 44×44px, Golden Rule UI14; ruimer tijdens de trainingsflow gezien fysieke inspanning, Deel 1), voldoende ruimte tussen interactieve elementen om abuisief tikken te voorkomen, en geen interacties die een precieze, snelle beweging vereisen (bijvoorbeeld geen kritieke actie die alleen via een snelle dubbele tik bereikbaar is).

**Eenhandig gebruik.** Kernacties tijdens de trainingsflow (set opslaan, gewicht aanpassen) zijn bereikbaar binnen het onderste twee derde van het scherm, waar een duim natuurlijk reikt bij eenhandig vasthouden — relevant omdat de andere hand tijdens training vaak niet vrij is (een halter vasthoudt, een polsband draagt). Dit is een **nieuw vastgesteld UX-principe voor toekomstige ontwikkeling**, direct afgeleid uit het gebruiksscenario "tijdens fysieke inspanning" (Deel 1) maar nog niet eerder expliciet vastgelegd in eerdere hoofdstukken.

**Gebruik tijdens intensieve training.** Naast de reeds genoemde principes (grotere tikdoelen, geen precisie-vereisende gebaren) geldt hier een extra eis: het scherm moet leesbaar blijven bij verminderde focus en verhoogde hartslag — dit betekent hoog contrast, grote kerncijfers (Golden Rule UI37), en een interface die niet afhankelijk is van het lezen van kleine, secundaire tekst om een kernactie te voltooien.


---

## Deel 11 — Premium UX Checklist

Verplicht bij UX Review, Sprint Review, Acceptatietest en Play Store Release Review. Elke regel is met JA of NEE te beoordelen. Doorlopend genummerd voor eenvoudige verwijzing.

### Flows algemeen (1-12)
1. Kan de gebruiker op elk moment zien wat de volgende stap is?
2. Is er precies één primaire actie per stap in de flow?
3. Kost geen enkele flow meer stappen dan in Deel 2 gespecificeerd?
4. Is elke flow getest vanaf een koude start (nieuwe gebruiker, geen cache)?
5. Is elke flow getest met een trage/onstabiele verbinding?
6. Eindigt elke flow in een duidelijk herkenbaar afgerond punt (geen onduidelijk "zweven")?
7. Is er geen enkele flow die de gebruiker dwingt tot een omweg om te annuleren?
8. Zijn alle acceptatiecriteria uit Deel 2 aantoonbaar gehaald voor deze flow?
9. Is de flow getest door iemand die de kwetsbaarste relevante persona vertegenwoordigt?
10. Bevat de flow geen enkel verboden UX-patroon uit Deel 1?
11. Is elke destructieve stap in de flow voorzien van een expliciete bevestiging?
12. Sluit de flow logisch aan op de flow die er in de Customer Journey (Hoofdstuk 2) op volgt?

### Onboarding (13-22)
13. Bestaat de onboarding uit maximaal vijf stappen?
14. Is de onboarding op elk moment overslaanbaar?
15. Eindigt de onboarding in een concreet, gepersonaliseerd advies?
16. Is elke onboarding-vraag herleidbaar naar het eerste advies?
17. Doorlopen terugkerende gebruikers de onboarding niet opnieuw zonder eigen actie?
18. Bevat de onboarding geen jargon zonder uitleg?
19. Wordt gevoelige data (blessure/conditie) gevraagd met uitleg waarom?
20. Is de voortgang binnen de onboarding altijd zichtbaar?
21. Is er geen enkel verplicht veld dat niet direct bijdraagt aan het eerste advies?
22. Is de onboarding getest met Persona Fleur als referentiepunt?

### Dashboard (23-32)
23. Toont het dashboard maximaal vijf primaire kaarten boven de vouw?
24. Is er precies één duidelijke "vandaag"-actie?
25. Staat herstelinformatie nooit lager of kleiner dan prestatie-informatie?
26. Toont het dashboard skeleton-loading in plaats van een lege ruimte tijdens laden?
27. Is de lege staat voor nieuwe gebruikers ingevuld met een concrete volgende stap?
28. Is de weekvoortgang zichtbaar zonder extra navigatie?
29. Bevat het dashboard geen enkele decoratieve kaart zonder functie?
30. Is de dagfactor-toelichting altijd zichtbaar naast het cijfer?
31. Reageert elke kaart op tik binnen 100ms?
32. Is het dashboard getest op zowel een klein als een groot mobiel scherm?

### Workout & logging (33-47)
33. Kosten kernacties tijdens het loggen maximaal twee tikken?
34. Start de rusttimer automatisch na het opslaan van een set?
35. Wordt de rusttimerduur gesuggereerd op basis van RPE?
36. Wordt tijdens een actieve training nooit ongevraagd genavigeerd naar een ander hoofdscherm?
37. Kan een training gepauzeerd worden zonder dataverlies?
38. Verschijnt bij elke logactie een bevestiging binnen twee seconden?
39. Leidt een dubbele tik nooit tot dubbele registratie?
40. Is de vorige sessie op dezelfde oefening zichtbaar zonder extra navigatie?
41. Worden apparatuurinstellingen onthouden per oefening en per gebruiker?
42. Is de plate calculator bereikbaar zonder schermwissel?
43. Worden supersets gelogd binnen dezelfde flow als reguliere sets?
44. Wordt een PR op het moment zelf bevestigd, niet pas achteraf?
45. Gebruikt numerieke invoer bij voorkeur een stepper boven een tekstveld?
46. Blijft tekstinvoer beschikbaar als fallback voor niet-standaardwaarden?
47. Is de workout-flow getest onder gesimuleerde fysieke inspanning (bijv. één hand, bewegend)?

### Rusttimer (48-55)
48. Is de countdown leesbaar op afstand van het scherm?
49. Wordt het einde van de timer op minimaal twee zintuiglijke manieren aangekondigd?
50. Kan de duur met één tik verlengd of verkort worden?
51. Kan de timer met één tik worden overgeslagen?
52. Blijft de timer zichtbaar (compact) bij navigatie naar een ander scherm?
53. Toont de timer een korte toelichting bij de RPE-gebaseerde suggestie?
54. Verdwijnt de timer netjes bij het afronden van de sessie?
55. Is er geen enkele verplichte stap om de timer te starten?

### AI-coach (56-67)
56. Toont elk AI-advies welke data gebruikt is?
57. Toont elk AI-advies de kernredenering in gewone taal?
58. Biedt elk AI-advies een gelijkwaardige "negeer dit advies"-optie?
59. Is er visueel onderscheid tussen AI-vraag, AI-advies en AI-waarschuwing?
60. Toont de AI een zichtbare "aan het nadenken"-status tijdens verwerking?
61. Doet de AI geen enkele uitspraak zonder herleidbare databasis?
62. Wordt onzekerheid (bijv. PR-waarschijnlijkheid) expliciet benoemd?
63. Zijn AI-waarschuwingen concreet en actiegericht, nooit vaag alarmerend?
64. Vergelijkt de AI nooit gebruikers onderling zonder wederzijdse toestemming?
65. Geeft de AI nooit medisch klinkend advies?
66. Is chatgeschiedenis herleidbaar naar de context van dat moment?
67. Is de AI-integratie beveiligd tegen ongeautoriseerd gebruik vóór livegang?

### Programma's (68-77)
68. Toont het programma-overzicht altijd welke week "nu" is?
69. Toont elk blok een korte periodiseringslogica?
70. Wordt een gemiste training automatisch en uitgelegd herverdeeld?
71. Is de generatie-voortgang per week zichtbaar, niet als één ondoorzichtige balk?
72. Kan een mislukte generatie van één week opnieuw geprobeerd worden zonder het hele programma te herstarten?
73. Is elk gegenereerd blok gecontroleerd op daadwerkelijk gevulde inhoud?
74. Toont het systeem vóór bevestiging welke weken door een wijziging worden geraakt?
75. Vereist het stopzetten van een programma een expliciete bevestiging?
76. Is een mesocyclusvergelijking beschikbaar zonder externe tool?
77. Is de programma-flow getest met zowel een korte (4 weken) als lange (16+ weken) planning?

### Statistieken & herstel (78-87)
78. Toont de standaardweergave van Stats zinvolle informatie zonder enige filter?
79. Toont elke grafiek een korte duiding of aanbevolen actie?
80. Is de lege/onvoldoende-data-staat uitgelegd met een concrete vervolgstap?
81. Is de hersteltoestand van elke hoofdspiergroep zichtbaar zonder scroll?
82. Is de kleurcodering van de heatmap consistent op elk scherm waar herstel getoond wordt?
83. Heeft elke spiergroep een tekstueel percentage naast de kleurcodering?
84. Is filtercombinatie in Stats altijd optioneel, nooit verplicht?
85. Zijn grafieken voorzien van een tekstuele samenvatting voor schermlezers?
86. Is ACWR/plateau-detectie (indien gebouwd) uitlegbaar in gewone taal?
87. Is de PR-tijdlijn (indien gebouwd) bereikbaar binnen twee tikken?

### Profiel, instellingen & wearables (88-97)
88. Toont elke instelling het huidige effect, niet enkel de naam?
89. Vereist account-/dataverwijdering een expliciete, niet-dubbelzinnige bevestiging?
90. Is elke sectie in Profiel visueel gescheiden en navigeerbaar?
91. Toont een instellingswijziging een bevestiging binnen twee seconden?
92. Kan het logboek geëxporteerd worden zonder tussenkomst van support?
93. Wordt een wearable-koppeling proactief gemeld vóór tokenverval?
94. Is loskoppelen van een wearable mogelijk in maximaal twee tikken?
95. Blijft handmatige invoer volledig functioneel zonder wearable?
96. Is elke destructieve actie in Profiel visueel onderscheiden van reguliere acties?
97. Zijn foutmeldingen per sectie losstaand, zodat één fout de rest niet blokkeert?

### Team & gym (98-104)
98. Toont het Team-scherm een audit-log van rolwijzigingen?
99. Vereist een rolwijziging een expliciete bevestiging?
100. Is de lege staat voor een nieuwe gym voorzien van een duidelijke volgende stap?
101. Begrijpt een lid wat een coach wel/niet van zijn data kan zien op dit scherm?
102. Werkt e-mailbevestiging correct vóórdat een lid gekoppeld wordt?
103. Is de ledenlijst doorzoekbaar bij meer dan twintig leden?
104. Is de gym-branding (indien actief) nooit dominanter dan de merknaam Trainingskompas?

### Interaction design (105-116)
105. Heeft elke swipe-actie een alternatieve, tik-toegankelijke route?
106. Wordt long press nooit gebruikt als enige manier om een kernactie te bereiken?
107. Wordt drag nooit gebruikt voor kernacties tijdens een training?
108. Is er nooit meer dan één FAB tegelijk zichtbaar?
109. Heeft elke interactieve kaart een duidelijke tap-affordance?
110. Zijn bottom sheets sluitbaar via tik buiten de sheet én een expliciete knop?
111. Heeft elke dialog exact één primaire en optioneel één secundaire actie?
112. Wordt een slider nooit gebruikt voor waarden die exacte precisie vereisen?
113. Zijn stepper-knoppen minimaal 44×44px en ruim uit elkaar?
114. Tonen chips hun actieve staat via kleur én icoon?
115. Verschijnen zoekresultaten binnen 300ms na de laatste toetsaanslag?
116. Is elk contextmenu ook bereikbaar via een zichtbare "meer opties"-knop naast long press?

### Motion design (117-124)
117. Blijft elke animatieduur binnen de in Deel 5 vastgelegde grenzen?
118. Dient elke animatie oriëntatie, bevestiging of nadruk — nooit decoratie zonder functie?
119. Blokkeert geen enkele animatie de volgende gebruikersactie?
120. Wordt een grafiekanimatie niet herhaald bij elke terugkeer naar hetzelfde scherm?
121. Beweegt een voortgangsbalk exact synchroon met de daadwerkelijke voortgang?
122. Is de PR-animatie onderscheidend van reguliere succes-animaties, zonder overdaad?
123. Wordt `prefers-reduced-motion` gerespecteerd met een alternatieve, kortere variant?
124. Is elke animatie getest op zowel een snel als een langzaam toestel?

### Micro-interactions (125-130)
125. Heeft elke micro-interactie uit Deel 6 een duidelijk emotioneel doel?
126. Is er nergens een micro-interactie die geluid gebruikt zonder dat geluid uitschakelbaar is?
127. Is haptische feedback consistent qua intensiteit met de ernst van de actie?
128. Is haptische feedback systeembreed uitschakelbaar via instellingen?
129. Onderscheidt een destructieve actie zich haptisch van een bevestigende actie?
130. Wordt geen enkele micro-interactie herhaald tot irritatie (bijv. bij elke gewone set een PR-waardig effect)?

### Feedback patterns (131-138)
131. Gebruikt elk feedbacktype een consistente kleur volgens Deel 7?
132. Is elke foutmelding gekoppeld aan een concrete herstelactie?
133. Verschijnt succesfeedback inline, zonder onnodige aparte melding bij routinehandelingen?
134. Blijft een waarschuwing zichtbaar tot bevestigd of opgelost, in tegenstelling tot een snel verdwijnende toast?
135. Is elke feedbackmelding met `aria-live` op het juiste assertiviteitsniveau aangekondigd?
136. Is validatiefeedback gekoppeld aan het veld via `aria-describedby`?
137. Verschijnt AI-feedback altijd met een volledige, uitlegbare zin, nooit een kaal label?
138. Toont synchronisatiefeedback altijd het aantal openstaande items?

### Empty states (139-144)
139. Legt elke lege staat uit waarom het scherm leeg is?
140. Bevat elke lege staat een concrete volgende stap of CTA?
141. Bevat geen enkele lege staat technische placeholder-tekst?
142. Is de illustratie (indien aanwezig) sober en passend bij de merktoon?
143. Is de lege staat voor Stats/herstel expliciet niet-ontmoedigend voor nieuwe gebruikers?
144. Sluit de copy in elke lege staat aan bij de directe, respectvolle merktoon?

### Error recovery (145-152)
145. Biedt elke foutmelding een concrete herstelactie, geen doodlopend pad?
146. Blijft trainingslogging volledig functioneel zonder internetverbinding?
147. Is er bij een AI-storing altijd een functioneel alternatief (trainen zonder advies)?
148. Wordt bij een conflict tussen apparaten nooit automatisch overschreven zonder gebruikersbevestiging?
149. Is elke foutsituatie server-side gelogd voor toekomstige monitoring?
150. Wordt kritieke trainingsdata bij een opslagfout apart behandeld van niet-kritieke UI-voorkeuren?
151. Is elke fout getest door de betreffende situatie daadwerkelijk te forceren (netwerk uit, API down)?
152. Is er geen enkele foutmelding die alleen een technische code toont zonder uitleg?

### Accessibility (153-164)
153. Is interactieve tekst minimaal 14px, kerncijfers minimaal 16px?
154. Voldoet kerntekst aan WCAG AA-contrast (≥4,5:1)?
155. Wordt geen enkele functionele informatie uitsluitend via kleur overgebracht?
156. Heeft elk interactief element een betekenisvol toegankelijk label?
157. Zijn touch-targets minimaal 44×44px met voldoende tussenruimte?
158. Wordt `prefers-reduced-motion` gerespecteerd?
159. Is haptische feedback uitschakelbaar?
160. Schaalt de interface correct bij een grotere systeemlettergrootte zonder afgekapte tekst?
161. Zijn kernacties tijdens de trainingsflow bereikbaar binnen het onderste twee derde van het scherm (eenhandig gebruik)?
162. Is elk scherm getest met een schermlezer actief?
163. Is elk scherm getest met gesimuleerde kleurenblindheid?
164. Is de navigatievolgorde voor schermlezers gelijk aan de visuele leesvolgorde?

### Performance & premium algemeen (165-172)
165. Reageert elke tik binnen 100ms met een zichtbare reactie?
166. Reageert set-logging optimistisch, met synchronisatie op de achtergrond?
167. Toont elk scherm dat op data wacht skeleton-loading in plaats van een lege ruimte?
168. Is de volledige naam "Trainingskompas" zichtbaar op elk scherm dat de merkidentiteit toont?
169. Bevat geen enkel nieuw scherm een native `confirm()`/`alert()` voor belangrijke bevestigingen?
170. Is elke destructieve actie voorzien van een gestileerde, merkeigen bevestigingsmodal?
171. Is elk nieuw scherm getoetst aan minimaal één principe uit Hoofdstuk 3 (Product Constitution)?
172. Is deze checklist zelf doorlopen en ondertekend vóór livegang van de sprint?


---

## Deel 12 — UX Scorecard

Een beoordelingsmodel voor elk scherm, met tien dimensies, elk gescoord van 1 tot 10. Dit model is bedoeld om de kwalitatieve bevindingen uit de Product Audit (die per scherm een rapportcijfer gaf) te herhalen op een gestructureerde, herbruikbare manier bij elke toekomstige sprint.

### De tien dimensies

| Dimensie | Waar deze op beoordeelt | Referentie |
|---|---|---|
| **Snelheid** | Reactietijd op interacties, laadtijd, waargenomen vs. daadwerkelijke snelheid | Deel 1, Deel 8 (Hoofdstuk 3) |
| **Eenvoud** | Cognitieve belasting, aantal gelijktijdige keuzes, informatiedichtheid | Deel 1, Product Principle P7/P16 |
| **Motivatie** | Mate waarin het scherm intrinsieke motivatie versterkt zonder manipulatie | Deel 6 (Hoofdstuk 3), Deel 6 (dit hoofdstuk) |
| **Duidelijkheid** | Begrijpelijkheid van copy, iconen en informatiehiërarchie zonder uitleg vooraf nodig te hebben | Deel 3, Deel 7 |
| **AI-integratie** | Uitlegbaarheid, transparantie en relevantie van AI-content op dit scherm | Deel 5 (Hoofdstuk 3), Deel 1/3 (dit hoofdstuk) |
| **Premium uitstraling** | Consistentie met Brand Identity, afwezigheid van placeholder-elementen | Product Principle P6, UI Golden Rules (Hoofdstuk 3) |
| **Toegankelijkheid** | Contrast, lettergrootte, schermlezerondersteuning, touch-targets | Deel 7 (Hoofdstuk 3), Deel 10 (dit hoofdstuk) |
| **Foutpreventie** | Mate waarin het scherm fouten voorkomt vóór ze kunnen optreden | Deel 1, Deel 9 |
| **Consistentie** | Overeenstemming met patronen elders in de app (navigatie, componenten, taal) | UI Golden Rule UI42/UI43 |
| **Emotionele impact** | Sluit de emotie die het scherm oproept aan bij wat Hoofdstuk 1/3 voorschrijft voor dat moment | Deel 9 (Hoofdstuk 3), Deel 1 (dit hoofdstuk) |

### Scoreniveaus

| Totaalscore (gemiddelde van de tien dimensies) | Kwalificatie | Betekenis |
|---|---|---|
| 1,0 – 4,9 | **Onvoldoende** | Het scherm belemmert het gebruik van de app of schendt actief één of meer wetten uit de Product Constitution (Hoofdstuk 3). Directe herziening vereist vóór verdere sprints op dit scherm. |
| 5,0 – 6,9 | **Voldoende** | Het scherm functioneert, maar mist consistente toepassing van de Golden Rules — vergelijkbaar met de huidige staat van veel schermen volgens de Product Audit (functioneel sterk, presentatie nog niet premium). |
| 7,0 – 8,4 | **Premium** | Het scherm voldoet aantoonbaar aan de Golden Rules, de Checklist in Deel 11 is volledig met JA te beantwoorden, en het scherm draagt bij aan het premium-gevoel zoals gedefinieerd in Product Principle P6. |
| 8,5 – 10,0 | **Uitzonderlijk** | Het scherm overtreft de standaard: het combineert functionele uitmuntendheid met een emotionele impact die de gebruiker daadwerkelijk positief verrast (zie "kansen om te verrassen" in de Customer Journey, Hoofdstuk 2, Deel 3) — vergelijkbaar met het soort onderscheidend detail dat een gebruiker ongevraagd aan anderen vertelt. |

**Regel voor gebruik:** een score onder de 5,0 op één enkele dimensie blokkeert de algehele kwalificatie, ongeacht het gemiddelde — een scherm dat op Toegankelijkheid een 3 scoort, kan nooit als "Premium" gelden ook al is het gemiddelde over de overige negen dimensies hoog. Dit voorkomt dat een sterke dimensie een fundamentele tekortkoming compenseert.

### Illustratief voorbeeld — toepassing op twee bestaande schermen

Onderstaande scores zijn een toepassing van het model op basis van de bevindingen uit de Product Audit (2 augustus 2026) op de huidige (v3.3.25) implementatie — ter illustratie van hoe het model werkt, niet als volledige, formele review.

| Dimensie | Training A/B (huidige staat) | Dashboard (huidige staat) |
|---|---|---|
| Snelheid | 7 | 6 |
| Eenvoud | 6 | 5 |
| Motivatie | 4 (PR-badge aanwezig, verder minimaal) | 4 |
| Duidelijkheid | 7 | 6 |
| AI-integratie | 7 | 6 |
| Premium uitstraling | 4 (placeholder-stijl, Product Audit sectie 6) | 4 |
| Toegankelijkheid | 3 (minimale aria-ondersteuning, Product Audit sectie 6) | 3 |
| Foutpreventie | 6 (dubbel-klik-bescherming aanwezig) | 6 |
| Consistentie | 7 | 6 |
| Emotionele impact | 5 (functioneel, PR-moment onderbenut) | 5 |
| **Gemiddelde** | **5,6** | **5,1** |
| **Kwalificatie** | **Voldoende** (geblokkeerd van "Premium" door Toegankelijkheid <5,0) | **Voldoende** (geblokkeerd van "Premium" door Toegankelijkheid <5,0) |

Dit bevestigt kwantitatief wat de Product Audit kwalitatief al concludeerde: beide schermen zijn functioneel solide maar worden specifiek door de Toegankelijkheid-dimensie geblokkeerd van een Premium-kwalificatie — een concreet, meetbaar aanknopingspunt voor de eerstvolgende sprints (zie ook Deel 10, dit hoofdstuk, en Hoofdstuk 3, Deel 7).

---

## UX Constitution — de 30 wetten van TrainingKompas

Deze dertig wetten zijn de samenvatting van dit gehele hoofdstuk en zijn **bindend voor alle toekomstige UX-, UI- en ontwikkelsprints.** Wanneer een sprint van één van deze wetten afwijkt, wordt dit expliciet vastgelegd in de Decision Log, inclusief motivatie en impactanalyse — dezelfde werkwijze als vastgelegd voor de Product Constitution in Hoofdstuk 3.

**1.** Premium UX is het zichtbaar maken van onderliggende kwaliteit — nooit decoratie zonder functie.

**2.** Elke interactie heeft precies één primair doel; nooit twee gelijkwaardige concurrerende acties op hetzelfde scherm.

**3.** Kernacties tijdens een workout kosten maximaal twee tikken, gemeten vanaf het logscherm.

**4.** De rusttimer start automatisch na het opslaan van een set, met een RPE-gebaseerde duursuggestie.

**5.** Elk AI-advies toont de gebruikte data, de kernredenering, en een gelijkwaardige "negeer dit advies"-optie.

**6.** Herstelinformatie krijgt op elk scherm minimaal evenveel visuele prominentie als prestatie-informatie.

**7.** Geen enkele actie faalt stil — elke schrijfactie bevestigt zichtbaar slagen of falen binnen twee seconden.

**8.** Destructieve acties gebruiken altijd een gestileerde, merkeigen bevestiging — nooit een native systeemdialoog.

**9.** Onboarding bestaat uit maximaal vijf stappen, is altijd overslaanbaar, en eindigt in een concreet, gepersonaliseerd advies.

**10.** Elke lege staat legt uit waarom het scherm leeg is en biedt een concrete volgende stap.

**11.** Elke animatie dient oriëntatie, bevestiging of nadruk — nooit decoratie zonder functie.

**12.** Trainingslogging blijft volledig functioneel zonder internetverbinding; synchronisatie is een achtergrondproces.

**13.** Bij een conflict tussen apparaten wordt nooit automatisch overschreven zonder expliciete gebruikersbevestiging.

**14.** Geen enkele functionele informatie wordt uitsluitend via kleur overgebracht.

**15.** Interactieve tekst is minimaal 14px, kerncijfers minimaal 16px, kerntekst voldoet aan WCAG AA-contrast.

**16.** Touch-targets zijn minimaal 44×44px, met extra ruimte tijdens de trainingsflow gezien fysieke inspanning.

**17.** Geen enkel motivatiemechanisme gebruikt manipulatieve technieken — geen kunstmatige schaarste, geen schuldgevoel-notificaties, geen niet-opt-in sociale vergelijking.

**18.** Een PR wordt op het moment zelf, tijdens de training, kort en oprecht bevestigd.

**19.** Een streak respecteert bewust geplande rustdagen zonder verlies — herstel gaat nooit ten koste van een motivatiemechanisme.

**20.** Elke sport en elke leeftijdscategorie krijgt een volledig eigen AI-context, nooit een verdunde generieke laag.

**21.** Elke fout biedt een concrete herstelactie; geen enkele foutmelding toont uitsluitend een technische code.

**22.** Wearable-koppelingen tonen proactief de resterende geldigheidsduur vóór verval.

**23.** Elk scherm dat op data wacht toont skeleton-loading in de uiteindelijke lay-out, nooit een leeg scherm.

**24.** Elke tik krijgt binnen 100ms een zichtbare reactie, ongeacht onderliggende netwerklatentie.

**25.** Swipe-, long-press- en drag-interacties hebben altijd een alternatieve, tik-toegankelijke route.

**26.** De volledige naam "Trainingskompas" is zichtbaar op elk scherm dat de merkidentiteit toont, ook onder gym-branding.

**27.** Elk nieuw scherm wordt beoordeeld met de UX Scorecard (Deel 12); een score onder 5,0 op één dimensie blokkeert de algehele kwalificatie.

**28.** De Premium UX Checklist (Deel 11) wordt volledig doorlopen vóór livegang van elke sprint die schermen, interacties of flows raakt.

**29.** Complexiteit wordt bepaald door de kwetsbaarste relevante persona in een flow, nooit door wat de techniek toestaat.

**30.** Elke afwijking van deze dertig wetten wordt expliciet vastgelegd in de Decision Log, met motivatie en impactanalyse — nooit stilzwijgend doorgevoerd.

---

*Einde Hoofdstuk 4. Dit hoofdstuk vormt samen met Hoofdstuk 1 (Productvisie & Filosofie), Hoofdstuk 2 (Doelgroepen, Persona's & Customer Journey) en Hoofdstuk 3 (Product Design Principles & Golden Rules) het fundament van het TrainingKompas Premium Development Handbook. Elke toekomstige UX Review, Sprint Review, Acceptatietest en Play Store Release Review gebruikt de Checklist in Deel 11 en de UX Scorecard in Deel 12 als verplicht instrument. Elk volgend hoofdstuk wordt tegen de UX Constitution hierboven getoetst vóórdat het als goedgekeurd geldt.*

