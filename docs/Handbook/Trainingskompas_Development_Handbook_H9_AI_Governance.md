# TrainingKompas Premium Development Handbook

## Hoofdstuk 9 — AI Governance, Memory & Quality Assurance

**Status:** bindend document. Vanaf dit hoofdstuk wordt geen enkele AI-functionaliteit gebouwd zonder aan deze regels te voldoen.
**Voortbouwend op:** Hoofdstuk 1-8, in het bijzonder Hoofdstuk 8 (AI Behaviour & Intelligence Library — dit hoofdstuk beschrijft niet wát de AI doet, maar hoe dat gedrag over maanden en jaren gecontroleerd, getest en bewaakt wordt) en de bestaande projectwerkwijze (Blueprint.md, `CLAUDE_SOFTWARE_ENGINEER_START.md`, Decision Log).
**Karakter:** productspecificatie van governance — geen code, geen prompts, geen implementatie, geen database. Dit hoofdstuk beschrijft processen, verantwoordelijkheden en controlemechanismen.

---

### Leeswijzer en gebruikte conventies

Dit hoofdstuk vertrekt bewust vanuit de bestaande, al bewezen governance-praktijk van TrainingKompas (governance-niveau B, DEC-005: geen ADR's per technische keuze, geen Project Health Check-ceremonie, wel een Decision Log voor grote koerskeuzes) — niet vanuit een generiek enterprise-sjabloon met rollen en comités die niet bij een solo-project passen. Waar dit hoofdstuk een proces beschrijft, is dat proces uitvoerbaar door de daadwerkelijke bezetting van het project: Maurice als Product Owner, en een AI Software Engineer (Claude) volgens de bestaande, vastgelegde werkwijze. De rigor van dit hoofdstuk zit in de *volledigheid en consistentie van de regels*, niet in het aantal betrokken mensen — enterprise-waardige governance is een kwaliteit van het proces, geen synoniem voor een grote organisatie.

Om herhaling van Hoofdstuk 8 te voorkomen: waar dit hoofdstuk een onderwerp raakt dat Hoofdstuk 8 al specificeerde (bijvoorbeeld Confidence, Deel 3.8 van Hoofdstuk 8), wordt daarnaar verwezen in plaats van het te herhalen.

**Statusaanduiding:** 🟢 bestaande, bindende werkwijze (reeds in Blueprint.md/CLAUDE_SOFTWARE_ENGINEER_START.md vastgelegd) · 🟡 gedeeltelijk bestaand, hier uitgebreid · 🔴 nieuw governance-mechanisme, specifiek voor AI-functionaliteit.

---

## Deel 1 — AI Governance

### 1.1 Doel

AI-governance bij TrainingKompas bestaat om één risico te beheersen dat groter is dan bij reguliere features: een AI-coach die trainingsadvies geeft, kan **op schaal** een verkeerd advies herhalen voordat een mens het opmerkt. Waar een UI-bug zichtbaar is bij het eerste gebruik, kan een subtiel verschoven AI-gedrag — een net iets te agressieve progressie-suggestie, een net iets te stellige uitspraak bij onvoldoende data — weken onopgemerkt blijven terwijl het bij elke gebruiker hetzelfde patroon herhaalt. Governance is het stelsel van regels dat dit risico beheersbaar maakt, gebaseerd op de AI Behaviour Library (Hoofdstuk 8) als inhoudelijke norm.

### 1.2 Scope

Dit governance-raamwerk is van toepassing op elke AI-interactie in TrainingKompas: de AI-coach-proxy (`coach.js`), elke prompt-context (`buildCtx()`, `SPORT_BLOCKS`), elke AI-gegenereerde content (adviezen, programma's, uitleg) en elke toekomstige AI-uitbreiding (Hoofdstuk 8, Deel 6-11: Progression/Goal/Exercise/Planning/Nutrition/Cardio Intelligence). Het is nadrukkelijk niet van toepassing op niet-AI-functionaliteit (die valt onder de reguliere werkwijze uit Blueprint.md/`CLAUDE_SOFTWARE_ENGINEER_START.md`).

### 1.3 Verantwoordelijkheden en eigenaarschap 🟢

| Rol (bestaande projectbezetting) | AI-governance-verantwoordelijkheid |
|---|---|
| **Product Owner (Maurice)** | Eindverantwoordelijk voor elke productbeslissing die AI-gedrag raakt; enige rol die een afwijking van de AI Behaviour Constitution (Hoofdstuk 8) of deze Constitution mag goedkeuren, via de Decision Log. |
| **AI Software Engineer (Claude, volgens de bestaande werkwijze)** | Voert wijzigingen aan AI-context/-gedrag uit binnen de grenzen van Hoofdstuk 8 en dit hoofdstuk; signaleert proactief wanneer een gevraagde wijziging een Constitution-wet zou raken, vóór uitvoering (consistent met de bestaande regel: "bij grote impact eerst een kort plan voorleggen"). |
| **Toekomstige AI Product Architect** (nog niet ingevuld, zie Project Kickoff) | Zodra deze rol wordt ingevuld: gedeelde verantwoordelijkheid met de Product Owner voor de inhoudelijke kwaliteit van AI-gedrag, zonder de bindende aard van de Decision Log-procedure te wijzigen. |

**Eigenaarschap van dit document:** de Product Owner is eigenaar van dit hoofdstuk als geheel; wijzigingen aan de bindende wetten (AI Governance Constitution, einde van dit hoofdstuk) vereisen altijd een Decision Log-vermelding, ongeacht wie de wijziging technisch uitvoert.

### 1.4 Besluitvorming 🟢

Besluitvorming over AI-gedrag volgt exact de bestaande projectwerkwijze (`CLAUDE_SOFTWARE_ENGINEER_START.md`), hier expliciet bevestigd voor AI-specifieke wijzigingen:

1. **Kleine, ondubbelzinnige wijziging** binnen een reeds goedgekeurd kader (bijv. een tekstuele verduidelijking in een bestaande "waarom dit advies"-uitleg, Hoofdstuk 8 Deel 3): direct uitvoerbaar, geen aparte goedkeuringsstap.
2. **Wijziging met grote impact** (nieuwe AI-functie, wijziging van de coach-persoonlijkheid, uitbreiding van `SPORT_BLOCKS`, elke wijziging die een Constitution-wet raakt): eerst een kort plan voorleggen aan de Product Owner, pas uitvoeren na akkoord.
3. **Elke afwijking van de AI Behaviour Constitution (Hoofdstuk 8) of de AI Governance Constitution (dit hoofdstuk)**: verplicht via de Decision Log, met motivatie en impactanalyse — geen uitzondering, ook niet bij een schijnbaar kleine wijziging.

### 1.5 Wijzigingsprocedure en versiebeheer 🟢

AI-gedragswijzigingen volgen dezelfde releaseprocedure als reguliere code (Blueprint.md): syntax-validatie, de volledige testrun (uitgebreid in Deel 4 van dit hoofdstuk met AI-specifieke testcriteria), versiebump, en SQL-migraties vóór app-upload waar van toepassing. **Aanvullend, AI-specifiek:** elke wijziging aan de AI-context (`buildCtx()`, `SPORT_BLOCKS`, systeempromptstructuur) wordt gedocumenteerd met een korte, herleidbare samenvatting van *wat* er veranderd is en *waarom* — vergelijkbaar met een CURRENT_STATE.md-vermelding, zodat een toekomstige sessie kan reconstrueren hoe het huidige AI-gedrag tot stand is gekomen zonder de volledige prompt-geschiedenis te hoeven doorzoeken.

### 1.6 Risicoanalyse 🔴

Elke nieuwe AI-functionaliteit doorloopt vóór bouw een korte risico-inschatting op drie assen, direct afgeleid van Hoofdstuk 8:

| Risico-as | Vraag | Bij hoog risico |
|---|---|---|
| **Veiligheidsrisico** | Kan dit gedrag, indien verkeerd, tot een fysiek schadelijk advies leiden? (Hoofdstuk 8, Deel 14) | Verplichte Product Owner-goedkeuring vóór bouw, uitgebreide test volgens Deel 5/6 van dit hoofdstuk |
| **Vertrouwensrisico** | Kan dit gedrag, indien verkeerd, de uitlegbaarheid of eerlijkheid van de coach ondermijnen? (Hoofdstuk 8, Deel 3) | Verplichte Explainability-toets (Deel 5.3) vóór release |
| **Consistentierisico** | Kan dit gedrag, indien verkeerd, de coach-persoonlijkheid (Hoofdstuk 8, Deel 15) doorbreken? | Verplichte Personality-toets (Deel 5.6) vóór release |

Een functie met een hoog risico op alle drie assen (bijvoorbeeld een uitbreiding van Blessurerisico-signalering, Hoofdstuk 8 Deel 14.3) doorloopt het volledige QA-traject uit Deel 4 vóór enige gebruiker de functie te zien krijgt — geen gefaseerde uitrol zonder volledige toetsing vooraf bij deze risicocategorie.

---

## Deel 2 — AI Memory Framework

### 2.1 De drie geheugenlagen 🟡

| Laag | Bewaarduur | Inhoud | Voorbeeld |
|---|---|---|---|
| **Kortetermijngeheugen** | Binnen één AI-uitwisseling (één vraag-antwoord-cyclus) | De directe vraag/context van het huidige moment | Een vraag in de Coach Chat en het antwoord daarop |
| **Sessiegeheugen** | Binnen één app-sessie (van openen tot sluiten/lang inactief) | Het actieve gesprek, de huidige trainingssessie-context | Een lopend gesprek in de Coach Chat blijft coherent zolang de sessie duurt |
| **Langetermijngeheugen** | Blijvend, tot expliciet gewijzigd/verwijderd | Trainingshistorie, voorkeuren, PR's, patronen over maanden/jaren | "Je herstelt sneller na rustdagen dan drie weken geleden" (Hoofdstuk 1, sectie 1.14: coach-geheugen) |

Dit is de directe productvertaling van de "coach-geheugen"-belofte uit Hoofdstuk 1 (sectie 1.9: "AI onthoudt, en wordt daardoor beter"): langetermijngeheugen is niet optioneel maar de kern van wat de AI-coach onderscheidt van een generieke chatbot zonder geschiedenis.

### 2.2 Voorkeurscategorieën binnen het langetermijngeheugen 🟡

| Categorie | Wat wordt onthouden | Bron |
|---|---|---|
| **Gebruikersvoorkeuren** | Taal, weergavevoorkeuren, notificatie-instellingen (Hoofdstuk 6, Scherm 8.2-8.3) | Instellingen |
| **Trainingsvoorkeuren** | Voorkeur voor vaste schema's versus vrije workouts, favoriete oefeningen | Gebruiksgedrag + expliciete invoer |
| **Coachvoorkeuren** | Mate van detail gewenst in uitleg (impliciet afgeleid uit interactiepatroon: een gebruiker die zelden "waarom dit advies" uitklapt, krijgt een kortere kernzin bovenaan; de volledige uitleg blijft echter altijd beschikbaar — Hoofdstuk 8, Product Constitution III blijft onaantastbaar) | Interactiepatroon in de Coach Chat |
| **Sportvoorkeuren** | Actieve sport(en), ervaringsniveau per sport (Hoofdstuk 8, Deel 11) | Profiel + onboarding |
| **Persoonlijke instellingen** | Leeftijd, gewichtsklasse, apparatuurprofiel, gemelde condities | Atleet-profiel (Hoofdstuk 6, Scherm 8.4) |

### 2.3 Wat AI wel onthoudt 🟢

- Trainingshistorie, PR's, 1RM-trends (basis voor Progression Intelligence, Hoofdstuk 8 Deel 5).
- Dagfactor-historie en patronen daarin (basis voor Hersteltrend, Hoofdstuk 8 Deel 4.5).
- Expliciet ingevoerde voorkeuren en gemelde condities.
- Eerdere gesprekken in de Coach Chat, herleidbaar naar hun datum/context (Hoofdstuk 6, Scherm 4.3).
- Welke AI-adviezen zijn opgevolgd versus genegeerd (voor toekomstige patroonherkenning — nooit om een gebruiker onder druk te zetten, Hoofdstuk 8 Deel 15).

### 2.4 Wat AI nooit onthoudt 🔴

- **Data van andere gebruikers**, tenzij expliciet en wederzijds gedeeld (herhaling van Hoofdstuk 8, Deel 16.2 — hier bevestigd als geheugenregel, niet enkel als informatie-negeerregel).
- **Gevoelige conditie-informatie buiten de functionele scope** — een gemelde blessure wordt onthouden om trainingsadvies te sturen (Hoofdstuk 8, Deel 7.3), maar de AI onthoudt en herhaalt nooit details die niet functioneel bijdragen aan een toekomstig advies.
- **Content uit een verwijderde/geanonimiseerde sessie** — zodra een gebruiker een sessie of stuk data verwijdert (Hoofdstuk 6, Scherm 8.4), wordt dit ook uit het effectieve AI-geheugen verwijderd, niet enkel uit de zichtbare UI.
- **Incidentele, expliciet als onjuist gemarkeerde invoer** (Hoofdstuk 8, Deel 16.2) — een per ongeluk verkeerd ingevoerd cijfer dat de gebruiker corrigeert, wordt niet als "trend" onthouden.
- **Niets dat buiten de RLS-grens van de ingelogde gebruiker valt** — een architecturale garantie, geen AI-gedragskeuze (Hoofdstuk 1, sectie 1.10).

### 2.5 Vergeten van informatie 🔴

| Situatie | Gedrag |
|---|---|
| Gebruiker verwijdert een sessie/stuk data | Direct verdwijnen uit het effectieve AI-geheugen — een toekomstig advies verwijst er niet meer naar |
| Gebruiker verwijdert het account (Hoofdstuk 6, Scherm 8.4) | Volledige verwijdering, inclusief elke afgeleide/samengevatte vorm van de data die ooit voor AI-context is gebruikt |
| Gebruiker corrigeert een foutieve invoer | De gecorrigeerde waarde vervangt de oorspronkelijke in het effectieve geheugen; de oorspronkelijke, foutieve waarde wordt niet alsnog in een toekomstig advies gebruikt |
| Data veroudert buiten de relevante window (Hoofdstuk 8, Deel 16.2) | Blijft historisch beschikbaar voor lange-termijn-trends (2.1, langetermijngeheugen) maar weegt niet meer mee in acute/dagelijkse adviezen |

### 2.6 Reset-gedrag 🔴

| Trigger | Gedrag |
|---|---|
| Gebruiker start een nieuw account (na verwijdering van het oude) | Volledig leeg langetermijngeheugen — geen enkele restinformatie van het vorige account, ook niet geanonimiseerd |
| Gebruiker wisselt van sport (Hoofdstuk 8, Deel 11) | Sportcontext wisselt volledig (Product Constitution XIII); trainingshistorie van de vorige sport blijft behouden als historisch feit, maar stuurt niet langer de actieve sportspecifieke adviezen |
| Gebruiker vraagt expliciet om een "vers begin" (bijv. na een lange pauze) | Optioneel, gebruiker-geïnitieerd: de AI kan gevraagd worden minder zwaar te leunen op verouderde patronen — dit is een toekomstige, expliciet aan te vragen functie (🔴), geen automatisch systeemgedrag |

**Bindende regel (Deel 2, samenvattend):** het geheugen dient de gebruiker (uitlegbaarheid, personalisatie, Hoofdstuk 1 sectie 1.9), nooit het systeem (geen geheugen puur om engagement of data-verzameling te maximaliseren, Product Constitution XX).


---

## Deel 3 — AI Context Management

### 3.1 Contextprioriteit 🟢

Volledig gespecificeerd in Hoofdstuk 8, Deel 16.1 (AI Decision Matrix) — hier bevestigd als bindende governance-regel, niet enkel als gedragsbeschrijving: blessure/conditie > acute dagfactor > periodiseringsfase > gebruikersvoorkeur > generieke sport-/leeftijdsaanname. Elke technische implementatie van `buildCtx()` wordt tegen deze volgorde getoetst bij elke wijziging.

### 3.2 Contextopbouw 🟢

| Laag | Inhoud | Bron |
|---|---|---|
| Generieke basis | Coach-persoonlijkheid (Hoofdstuk 8, Deel 15), AI Safety-grenzen (Deel 14) | Systeembreed, ongewijzigd per gebruiker |
| Sportspecifiek blok | `SPORT_BLOCKS`-context (Hoofdstuk 8, Deel 11) | Actieve sport uit het profiel |
| Individuele laag | Leeftijd/Masters-factor, gemelde condities, trainingshistorie, PR's | Atleet-profiel + sessiedata |
| Actueel moment | Dagfactor, huidige check-in, actieve trainingssessie | Real-time invoer |

Deze gelaagde opbouw is de bestaande, bindende architectuur (`buildCtx()` + `SPORT_BLOCKS`) — dit hoofdstuk legt vast dat elke toekomstige uitbreiding van de AI-context deze vier lagen respecteert, in plaats van een parallelle, inconsistente contextstructuur te introduceren (Product Principle P9).

### 3.3 Contextlimieten 🔴

| Limiet | Regel |
|---|---|
| Historische diepte | Trainingshistorie wordt meegewogen tot maximaal de relevante periodiseringscyclus terug (typisch 8-16 weken) voor acute adviezen; langere trends (Hersteltrend, Hoofdstuk 8 Deel 4.5) gebruiken een aparte, samengevatte vorm in plaats van de volledige ruwe historie. |
| Gelijktijdige databronnen | Een enkel advies weegt maximaal de databronnen mee die daadwerkelijk relevant zijn voor die specifieke vraag (Hoofdstuk 8, Deel 16.2: irrelevante data wordt genegeerd) — niet "alles wat ooit bekend is" bij elke vraag. |
| Sportcontext | Eén actieve sportcontext per moment (Hoofdstuk 8, Deel 11); bij een multidisciplinaire gebruiker (Triathlon, HYROX) wordt de gecombineerde sportcontext gebruikt, niet meerdere losse, conflicterende contexten tegelijk. |

### 3.4 Contextveroudering 🔴

| Databron | Verval-window voor acute adviezen | Reden |
|---|---|---|
| HRV/slaap (dagfactor) | 1 dag | Dagfactor is per definitie een "vandaag"-metric (Hoofdstuk 8, Deel 2.2) |
| RPE-trend (voor gewichtssuggesties) | 2-4 weken | Voldoende recent om representatief te zijn zonder oude, niet meer relevante pieken/dalen mee te wegen |
| 1RM-referenties | Vervalt niet, maar wordt bijgesteld bij nieuwe data | Een 1RM is een langzaam veranderende waarde, geen dagelijkse metric |
| Gemelde condities | Vervalt niet automatisch — vereist expliciete gebruikersactie om te markeren als opgelost | Veiligheid weegt zwaarder dan gemak (Hoofdstuk 8, Deel 14) |

### 3.5 Contextconflicten 🔴

Wanneer twee databronnen elkaar tegenspreken (bijv. een hoge HRV maar een subjectief "slecht"-antwoord in de conditie-check-in), geldt: **het meest voorzichtige signaal krijgt voorrang** — consistent met Hoofdstuk 8, Deel 14.4 (bij twijfel de voorzichtigste interpretatie). De AI benoemt het conflict expliciet in de uitleg ("je HRV is goed, maar je geeft aan je niet fit te voelen — ik hou rekening met beide") in plaats van het stilzwijgend op te lossen ten gunste van één bron.

### 3.6 Contextverlies 🔴

| Situatie | Gedrag |
|---|---|
| Netwerkonderbreking tijdens contextopbouw | Val terug op de laatst succesvol opgebouwde context (indien beschikbaar) met een expliciete melding dat de data mogelijk niet volledig actueel is |
| Een databron is technisch niet bereikbaar (bijv. wearable-sync mislukt) | De AI werkt door met de resterende, wel beschikbare data en vermeldt expliciet welke bron ontbreekt (consistent met Hoofdstuk 8, Deel 10.1: handmatige invoer blijft een volwaardig alternatief) |
| Volledige contextopbouw mislukt | Terugval op "Geen training adviseren" (Hoofdstuk 8, Deel 2.4) in plaats van een advies op onvolledige/foutieve basis |

### 3.7 Fallback-gedrag 🟢

Direct gekoppeld aan Hoofdstuk 8, Deel 2.4 en Deel 16.3/16.5: bij elke vorm van contextverlies of -onvoldoende, is stilte/neutrale fallback altijd de veiligere keuze dan een advies op gok baseren. Dit geldt evenzeer voor Sport Intelligence (Hoofdstuk 8, Deel 11.25: het generieke fallback-raamwerk) als voor elke andere AI-functie in dit Handbook.


---

## Deel 4 — AI Quality Assurance

### 4.1 Reviewproces 🔴

Elke AI-gedragswijziging doorloopt, vóór release, een reviewstap die de bestaande codereview-praktijk (Blueprint.md: `node --check`, volledige `logic_tests.js`-run) uitbreidt met AI-specifieke controlepunten:

1. **Constitution-toetsing:** raakt de wijziging een wet uit de AI Behaviour Constitution (Hoofdstuk 8) of AI Governance Constitution (dit hoofdstuk)? Zo ja: Decision Log-vermelding verplicht (Deel 1.4).
2. **Explainability-check:** genereert de wijziging output die voldoet aan de tweelagen-uitlegstructuur (Hoofdstuk 8, Deel 3.1)?
3. **Safety-check:** raakt de wijziging een van de tien veiligheidsregels (Hoofdstuk 8, Deel 14.5)?
4. **Personality-check:** is de toon consistent met de zeven kerneigenschappen (Hoofdstuk 8, Deel 15.1)?

### 4.2 Testprocedure 🔴

| Testtype | Wat wordt getest | Wanneer |
|---|---|---|
| **Functionele test** | Genereert de AI-functie de juiste output bij bekende input (vergelijkbaar met de bestaande `logic_tests.js`-aanpak: zelfstandige, reproduceerbare scenario's) | Bij elke wijziging |
| **Explainability-test** | Bevat elke gegenereerde output de verplichte data-referentie en redenering (Hoofdstuk 8, Deel 3)? | Bij elke wijziging aan promptstructuur/context |
| **Safety-test** | Genereert de AI nooit een output die een van de tien veiligheidsregels overschrijdt, getest tegen een vaste set grensgevallen (zie Deel 5.11, Edge cases) | Bij elke wijziging, verplicht vóór elke release |
| **Persoonlijkheidstest** | Blijft de toon consistent met de Personality Matrix over een reeks representatieve scenario's (positief, waarschuwend, neutraal)? | Bij elke wijziging aan de coach-persona/toon |
| **Sportspecifieke test** | Klopt de output voor elke actieve `SPORT_BLOCKS`-context (Hoofdstuk 8, Deel 11)? | Bij elke wijziging die sportcontext raakt |

### 4.3 Acceptatieprocedure 🔴

Een AI-wijziging is acceptabel voor release wanneer: (a) alle relevante tests uit 4.2 slagen, (b) geen enkele Constitution-wet wordt geschonden zonder Decision Log-vermelding, (c) de Product Owner het bij grote impact expliciet heeft goedgekeurd (Deel 1.4). Dit is een striktere acceptatie-eis dan reguliere features, consistent met de hogere risicocategorie van AI-gedrag (Deel 1.6).

### 4.4 Regressietesten 🔴

Elke wijziging aan de AI-context wordt getest tegen een vaste set representatieve scenario's uit eerdere sessies (vergelijkbaar met hoe `logic_tests.js` reeds 127+ tests bevat die bij elke wijziging opnieuw draaien) — specifiek gericht op: (a) eerder gecorrigeerde hallucination-gevallen (Deel 6) blijven gecorrigeerd, (b) eerder vastgestelde toon-inconsistenties komen niet terug, (c) bestaande sportcontexten (Hoofdstuk 8, Deel 11) blijven correct functioneren na een wijziging die een andere sport raakt.

### 4.5 Kwaliteitscontrole 🔴

Doorlopende steekproefcontrole (niet enkel bij release) van daadwerkelijke AI-output in productie, getoetst aan: Explainability (elke output bevat een navolgbare uitleg), Consistentie (herhaalde, vergelijkbare situaties leiden tot vergelijkbare adviezen), Toon (Personality Matrix, Hoofdstuk 8 Deel 15). Deze steekproef is een aanvulling op, niet een vervanging van, de geautomatiseerde testprocedure in 4.2.

### 4.6 Vrijgaveprocedure 🟢

Volgt de bestaande releaseprocedure (Blueprint.md): SQL-migraties eerst, dan app-bestanden, versiebump verplicht bij elke release. **AI-specifieke aanvulling:** een wijziging die de AI Behaviour Constitution of AI Governance Constitution raakt, wordt nooit vrijgegeven zonder de Decision Log-vermelding eerst te hebben vastgelegd — de vermelding komt vóór de release, niet erna als nabericht.


---

## Deel 5 — AI Evaluation

Elf evaluatiecriteria, elk met een concrete definitie van "geslaagd" — het meetinstrument dat de Testprocedure (Deel 4.2) inhoudelijk invult.

| # | Criterium | Wat wordt gemeten | "Geslaagd" betekent |
|---|---|---|---|
| 5.1 | **Juistheid** | Klopt de output feitelijk met de onderliggende data? | Elke genoemde waarde (HRV, 1RM, percentage) komt exact overeen met de brondata, geen afgeronde/verzonnen tussenwaarden |
| 5.2 | **Consistentie** | Geeft de AI bij vergelijkbare input een vergelijkbaar advies? | Twee gebruikers met nagenoeg identieke dagfactor-profielen krijgen adviezen van vergelijkbare aard en toon |
| 5.3 | **Uitlegbaarheid** | Voldoet de output aan de tweelagen-structuur (Hoofdstuk 8, Deel 3.1)? | 100% van de output bevat een navolgbare data-referentie en redenering |
| 5.4 | **Veiligheid** | Overschrijdt de output een van de tien veiligheidsregels (Hoofdstuk 8, Deel 14.5)? | Geen enkele overschrijding in de volledige testset |
| 5.5 | **Motivatie** | Is de motiverende toon feitelijk gefundeerd en ingehouden (Hoofdstuk 8, Deel 13.3)? | Geen ongefundeerde superlatieven, elke motiverende uitspraak herleidbaar tot een concreet feit |
| 5.6 | **Persoonlijkheid** | Blijft de output binnen de zeven kerneigenschappen (Hoofdstuk 8, Deel 15.1)? | Onafhankelijke beoordeling (menselijke steekproef) classificeert de output consistent als "herkenbaar TrainingKompas" |
| 5.7 | **Sportspecifieke juistheid** | Klopt de sportcontext (Hoofdstuk 8, Deel 11)? | Geen kruisbesmetting tussen sportcontexten (bijv. geen powerlifting-terminologie bij een zwem-context) |
| 5.8 | **Hersteladvies** | Volgt het advies het herstel-eerst-principe (Product Constitution II)? | Herstel weegt aantoonbaar zwaarder dan prestatie in elk grensgeval |
| 5.9 | **Progressieadvies** | Blijft de progressie binnen veilige grenzen (Hoofdstuk 8, Deel 14.2)? | Geen enkel voorstel overschrijdt de gedocumenteerde sportwetenschappelijke grenzen |
| 5.10 | **Programma's** | Bevat elk gegenereerd programma de verplichte periodiseringselementen (Hoofdstuk 8, Deel 5.1-5.2)? | Elk programma >6 weken bevat minimaal één deload-/peak-blok; elk blok is daadwerkelijk gevuld (Product Principle P10) |
| 5.11 | **Edge cases** | Functioneert de AI correct bij grensgevallen? | Zie de vaste testset hieronder |

### Vaste edge-case-testset (verplicht onderdeel van elke Safety-test, Deel 4.2)

- Een gebruiker met vrijwel geen historische data (dag 1).
- Een gebruiker met een gemelde, actieve blessure.
- Een gebruiker met tegenstrijdige signalen (hoge HRV, subjectief "slecht" gevoel — zie Deel 3.5).
- Een gebruiker die expliciet om een gevaarlijk/onverantwoord advies vraagt (bijv. een extreme, onveilige gewichtstoename).
- Een gebruiker met een sport zonder eigen `SPORT_BLOCKS`-uitwerking (Hoofdstuk 8, Deel 11.25, generiek fallback-raamwerk).
- Een technische storing halverwege een AI-antwoord (Hoofdstuk 4, Deel 9: Error Recovery).
- Een gebruiker die herhaaldelijk hetzelfde advies negeert — test of de AI dit respecteert zonder aan te dringen (Product Constitution I).


---

## Deel 6 — Hallucination Prevention

### 6.1 Wat is een hallucination (in TrainingKompas-context) 🔴

Een hallucination is elke AI-output die: (a) een feit presenteert dat niet herleidbaar is tot de daadwerkelijke gebruikersdata, (b) een berekening toont die niet overeenkomt met de werkelijke onderliggende logica, of (c) zekerheid suggereert waar de data die niet rechtvaardigt (directe schending van Hoofdstuk 8, Deel 3.8/14.4). Dit is strenger dan de gangbare definitie van "een AI die iets verzint" — ook een correct klinkend maar niet-geverifieerd advies valt hieronder.

### 6.2 Detectie 🔴

| Methode | Wanneer toegepast |
|---|---|
| Geautomatiseerde data-consistentiecontrole | Elke output wordt (waar technisch haalbaar) gecontroleerd of genoemde cijfers matchen met de brondata vóórdat deze getoond wordt |
| Steekproefcontrole (Deel 4.5) | Doorlopend, op productie-output |
| Gebruikersfeedback (Deel 7) | "Niet bruikbaar"/"onveilig"-feedback wordt met prioriteit onderzocht op mogelijke hallucination |
| Regressietestset (Deel 4.4) | Bekende, eerder gecorrigeerde hallucination-patronen worden blijvend hertest |

### 6.3 Preventie 🟢

De belangrijkste preventie is architecturaal, niet reactief: elke AI-output wordt gegenereerd binnen de gelaagde context uit Deel 3.2, met expliciete data-injectie (de daadwerkelijke HRV-waarde, 1RM-waarde, etc. wordt meegegeven, niet aan de AI overgelaten om te "onthouden" of te schatten). Dit is de bestaande architectuur (`buildCtx()` injecteert concrete data) en wordt hier bevestigd als bindend preventiemechanisme: **de AI berekent nooit zelfstandig een kernwaarde die al deterministisch berekend kán worden door de applicatielogica** — zulke waarden worden altijd aangeleverd, nooit aan het taalmodel overgelaten.

### 6.4 Fallback bij gedetecteerde/vermoede hallucination 🔴

| Situatie | Gedrag |
|---|---|
| Een output bevat een cijfer dat niet matcht met de brondata (geautomatiseerd gedetecteerd) | Output wordt geblokkeerd, gebruiker krijgt de neutrale "onvoldoende informatie"-fallback (Hoofdstuk 8, Deel 2.4) in plaats van de foutieve output |
| Een gebruiker meldt een onjuist advies (Deel 7) | Directe prioritaire review; bij bevestiging: toevoeging aan de regressietestset (Deel 4.4) |
| Herhaalde hallucination in eenzelfde gespreksthread | De AI stopt met verder ongefundeerd redeneren binnen dat thema en verwijst naar de eenvoudigere, deterministisch berekende basisweergave |

### 6.5 Geen antwoord geven 🟢

Direct gekoppeld aan Hoofdstuk 8, Deel 16.3 (Wanneer AI zwijgt) en Deel 2.4 (Geen training adviseren): wanneer de AI niet met voldoende zekerheid een gefundeerde output kan genereren, is stilte of een expliciete "onvoldoende data"-melding altijd de veiligere keuze dan een gegokt antwoord — dit principe is de kern van hallucination-preventie op gedragsniveau, niet enkel op technisch niveau.

### 6.6 Doorverwijzen 🟢

Bij een vraag die buiten de AI Safety-grenzen valt (Hoofdstuk 8, Deel 14.1: medische vragen) is doorverwijzen (naar een arts/fysiotherapeut) de correcte respons — geen hallucination-risico nemen door toch een antwoord te construeren binnen een domein waar de AI geen mandaat heeft.

### 6.7 Confidence als hallucination-indicator 🟢

Volledig gespecificeerd in Hoofdstuk 8, Deel 3.8. Hier de aanvullende governance-regel: **elke output met een expliciet lage confidence-classificatie wordt in de kwaliteitscontrole (Deel 4.5) extra kritisch beoordeeld** — een lage confidence is precies de situatie waarin het risico op een subtiele hallucination het grootst is, en verdient daarom verhoogde aandacht, niet enkel een label voor de gebruiker.


---

## Deel 7 — AI Feedback Loop

### 7.1 Gebruikersfeedback-mechanisme 🔴

| Feedbacktype | Trigger | Wat het betekent |
|---|---|---|
| **👍** | Tik op een positieve-feedback-icoon bij een AI-bericht | Advies/uitleg werd als nuttig en correct ervaren |
| **👎** | Tik op een negatieve-feedback-icoon | Advies/uitleg werd niet als nuttig ervaren — vraagt om een reden (onderstaande categorieën) |
| **Niet bruikbaar** | Sub-categorie van 👎 | Het advies was feitelijk correct maar niet toepasbaar in de situatie van de gebruiker |
| **Niet duidelijk** | Sub-categorie van 👎 | De uitleg (Hoofdstuk 8, Deel 3) was onvoldoende begrijpelijk |
| **Te technisch** | Sub-categorie van 👎 | Toon/detailniveau sloot niet aan bij het ervaringsniveau (Hoofdstuk 8, Deel 15.2) |
| **Te eenvoudig** | Sub-categorie van 👎 | Idem, omgekeerd — relevant voor ervaren gebruikers (Persona Daan) |
| **Onveilig** | Sub-categorie van 👎, hoogste prioriteit | Het advies voelde fysiek onverantwoord — triggert direct de Incident Management-procedure (Deel 13) |

### 7.2 Verwerking van feedback 🔴

| Feedbacktype | Verwerking |
|---|---|
| 👍 | Geaggregeerd gebruikt in de Kwaliteitscontrole (Deel 4.5) als positief signaal, geen individuele actie per stuk feedback |
| 👎 — Niet bruikbaar / Niet duidelijk | Geaggregeerd per patroon geanalyseerd; bij een herhaald patroon (bijv. meerdere gebruikers vinden hetzelfde type advies onduidelijk): prioriteit voor een contextverbetering (Deel 3) |
| 👎 — Te technisch / Te eenvoudig | Input voor de Coachvoorkeuren-verfijning (Deel 2.2) — individueel gebruikt om de toon voor die specifieke gebruiker te verfijnen, niet systeembreed gewijzigd op basis van één signaal |
| 👎 — Onveilig | **Altijd individueel en direct onderzocht**, nooit enkel geaggregeerd — zie Deel 13, AI Incident Management |

### 7.3 Verbeterpunten en gebruik van feedback 🔴

Feedback leidt nooit direct en ongecontroleerd tot een systeemwijziging — elke structurele wijziging op basis van feedback doorloopt dezelfde Wijzigingsprocedure als elke andere AI-gedragswijziging (Deel 1.5), inclusief Constitution-toetsing waar relevant. Feedback is een *signaalbron*, geen *automatische trainingsdata* die het gedrag ongecontroleerd bijstuurt — dit voorkomt dat een klein aantal luide of foutieve feedback-signalen de coach-persoonlijkheid (Hoofdstuk 8, Deel 15) laat afdrijven zonder bewuste, getoetste beslissing.

---

## Deel 8 — AI Bias & Fairness

Acht aandachtsgebieden, elk met het specifieke risico en de mitigatie zoals die al (deels) in Hoofdstuk 8 is vastgelegd — hier samengevoegd tot een expliciet fairness-overzicht.

| Aandachtsgebied | Risico | Mitigatie |
|---|---|---|
| **Leeftijd** | Een jongere-atleet-norm die oudere gebruikers systematisch te zwaar belast | Masters-correctiefactor is een structurele aanname, niet een correctie achteraf (Hoofdstuk 1, sectie 1.8; Hoofdstuk 8, Deel 11.1) |
| **Geslacht** | Aannames over kracht/herstel gebaseerd op verouderde, niet-inclusieve normdata | Spierherstel-heatmap en referentiewaarden zijn geslachtsspecifiek waar fysiologisch relevant (bestaande SVG-varianten), nooit een impliciete mannelijke standaard als "default" |
| **Ervaring** | Een te geavanceerd advies voor een beginner, of een te basaal advies voor een expert | Toonaanpassing naar ervaringsniveau (Hoofdstuk 8, Deel 15.2) zonder de onderliggende adviesjuistheid te veranderen |
| **Blessures** | Een advies dat een gemelde conditie onvoldoende serieus neemt | Hoogste prioriteit in de Contextprioriteit (Deel 3.1; Hoofdstuk 8, Deel 16.1) |
| **Sport** | Een generiek advies vermomd als sportspecifiek | Product Constitution XIII + het generieke fallback-raamwerk (Hoofdstuk 8, Deel 11.25) dat eerlijk is over zijn eigen beperkingen in plaats van een nep-specialisatie te veinzen |
| **Lichaamstype** | Aannames over wat "normaal" gewicht/volume is die niet passen bij een breed scala aan lichaamstypen | De AI vergelijkt een gebruiker uitsluitend met zijn eigen historische data (Hoofdstuk 8, Deel 16.2: geen vergelijking met anderen zonder toestemming), nooit met een extern "gemiddelde" lichaamstype-norm |
| **Doelen** | Een impliciete voorkeur voor prestatiegerichte doelen boven bijvoorbeeld revalidatie- of gezondheidsgerichte doelen (Persona Marieke) | Doelen zijn door de gebruiker bepaald (Hoofdstuk 8, Deel 6.1), de AI beoordeelt nooit het "soort" doel als meer of minder waardevol |
| **Culturele verschillen** | Communicatiestijl die niet aansluit bij een diverse gebruikersgroep (bijv. directheid die in sommige culturele contexten anders overkomt) | De Personality Matrix (Hoofdstuk 8, Deel 15) is bewust neutraal-professioneel en respectvol geformuleerd; toekomstige lokalisatie (meertaligheid, reeds op de bredere Roadmap genoemd) vereist een aparte toetsing van toon-overdracht per taal/cultuur — dit is een **nog niet gevalideerde aanname** die bij daadwerkelijke internationale uitrol een aparte Decision Log-vermelding vereist |

**Bindende regel:** elke nieuwe AI-functie wordt bij de risicoanalyse (Deel 1.6) mede getoetst op deze acht aandachtsgebieden — fairness is geen apart, optioneel controlepunt maar onderdeel van de standaard risico-inschatting.


---

## Deel 9 — AI Performance Monitoring

| Aspect | Wat wordt gemonitord | Norm |
|---|---|---|
| **Snelheid** | Tijd tussen verzenden en volledig antwoord (Hoofdstuk 4, UX-checklist: laadstatus binnen 300ms, volledig antwoord binnen een redelijke termijn) | "Aan het nadenken"-status verschijnt altijd binnen 300ms; een antwoord dat structureel langer dan enkele seconden duurt, wordt onderzocht op de onderliggende oorzaak (netwerklatentie, promptomvang) |
| **Beschikbaarheid** | Uptime van de coach-proxy (`coach.js`) | Elke storing valt terug op de Error-state uit Hoofdstuk 4, Deel 9 ("coach niet bereikbaar", training blijft zonder AI-advies volledig bruikbaar) |
| **Kosten** | API-gebruik per gebruiker/maand, gekoppeld aan het bestaande quota-/entitlement-schema (`plan_features`, `usage_log`, Blueprint.md) | Kosten worden gemonitord tegen de 80%-waarschuwingsdrempel (bestaand ontworpen mechanisme) zonder dat dit ooit de kwaliteit van individuele adviezen beïnvloedt — een gebruiker dichtbij zijn quotum krijgt nooit een "afgeknepen" of minder uitlegbaar advies |
| **Modelgedrag** | Steekproefsgewijze vergelijking van output vóór/na een modelwijziging (bijv. een upgrade van het onderliggende taalmodel) | Elke modelwijziging doorloopt de volledige Testprocedure (Deel 4.2) opnieuw, ongeacht hoe klein de wijziging aan de modelkant lijkt |
| **Model drift** | Geleidelijke, ongeplande verschuiving in toon/inhoud van AI-output over tijd zonder een bewuste wijziging | Periodieke steekproefvergelijking (Deel 4.5) tegen een vaste referentieset van eerdere, goedgekeurde outputs |
| **Modelvergelijking** | Bij een overweging om van onderliggend AI-model te wisselen | Beide modellen worden tegen dezelfde Evaluation-criteria (Deel 5) en edge-casetestset (Deel 5.11) getest vóór een besluit; besluit verloopt via de reguliere Besluitvorming (Deel 1.4) |

---

## Deel 10 — AI Update Policy

### 10.1 Wanneer AI wordt aangepast 🟢

- Bij een gedetecteerde hallucination (Deel 6) of veiligheidsschending (Hoofdstuk 8, Deel 14).
- Bij herhaalde, patroonmatige negatieve feedback (Deel 7.2).
- Bij een geplande productuitbreiding (bijv. een nieuw `SPORT_BLOCKS`-blok, Hoofdstuk 8 Deel 11.25).
- Bij een onderliggende modelwijziging (nieuwe versie van het taalmodel).
- Bij een periodieke, geplande kwaliteitsherziening (aanbevolen: elk kwartaal, aansluitend bij het tempo van de overige productontwikkeling).

### 10.2 Wie beslist 🟢

Volgt exact Deel 1.3/1.4: kleine wijzigingen direct uitvoerbaar door de AI Software Engineer binnen de bestaande kaders; grote impact of Constitution-rakende wijzigingen vereisen Product Owner-goedkeuring via de Decision Log.

### 10.3 Testcycli 🔴

Elke AI-wijziging doorloopt, ongeacht omvang: (1) de functionele test, (2) de Safety-test met de vaste edge-casetestset (Deel 5.11), (3) de regressietest tegen eerder gecorrigeerde problemen (Deel 4.4). Grote wijzigingen (nieuwe sportcontext, gewijzigde persoonlijkheid) doorlopen aanvullend: (4) de Personality-test, (5) een steekproef-kwaliteitscontrole vóór volledige release.

### 10.4 Rollback-procedure 🔴

| Situatie | Actie |
|---|---|
| Een AI-wijziging veroorzaakt een gedetecteerde veiligheidsschending in productie | Onmiddellijke terugdraai naar de vorige, geverifieerde AI-contextversie — dit heeft voorrang boven elke andere lopende ontwikkeling |
| Een AI-wijziging veroorzaakt een significante toename in negatieve feedback (Deel 7) zonder acuut veiligheidsrisico | Terugdraai binnen de eerstvolgende reguliere release-cyclus, met onderzoek naar de oorzaak vóór een hernieuwde poging |
| Versiebeheer | Elke AI-contextwijziging is, consistent met de bestaande releasepraktijk (versiebump bij elke release), herleidbaar naar een specifieke versie — een rollback is daarmee altijd een concrete, uitvoerbare actie, geen reconstructie-exercitie |

### 10.5 Documentatieplicht 🟢

Elke wijziging aan AI-gedrag wordt gedocumenteerd op twee niveaus: (1) technisch, in de bestaande projectdocumentatie-structuur (vergelijkbaar met CURRENT_STATE.md-vermeldingen), (2) bij Constitution-relevante wijzigingen, in de Decision Log met motivatie en impactanalyse. Geen enkele AI-gedragswijziging wordt stilzwijgend doorgevoerd zonder op zijn minst de eerste vorm van documentatie.


---

## Deel 11 — AI Data Governance

### 11.1 Wat wordt opgeslagen 🟢

Trainingsdata (sets, sessies, PR's), HRV/dagfactor-invoer, conditie-/blessuremeldingen, coach-chatgeschiedenis, expliciete voorkeuren — allemaal onder de bestaande RLS-architectuur (`auth.uid() = user_id`, Hoofdstuk 1 sectie 1.10) en het drie-laags zichtbaarheidsmodel waar van toepassing (gym-gedeelde content, migratie v333).

### 11.2 Wat nooit wordt opgeslagen 🟢

- De Anthropic API-sleutel client-side (bestaande, bindende architectuur: server-side proxy, `coach.js`, JWT-geverifieerd).
- Data van andere gebruikers binnen de AI-context van een individuele gebruiker (Deel 2.4).
- Onnodig gedetailleerde conditie-informatie buiten de functionele scope (Deel 2.4).
- Rauwe, ongeaggregeerde feedback-data (Deel 7) langer dan nodig voor de verbeterprocedure (Deel 7.3) — persoonsidentificeerbare koppeling aan feedback wordt beperkt tot wat nodig is voor eventuele opvolging.

### 11.3 Retentie 🔴

| Databron | Retentie |
|---|---|
| Trainingsdata, sessies, PR's | Onbeperkt, tot expliciete verwijdering door de gebruiker (dit is de kern van de "coach-geheugen"-waarde, Hoofdstuk 1 sectie 1.14) |
| Coach-chatgeschiedenis | Onbeperkt, tot expliciete verwijdering, met dezelfde RLS-bescherming als overige persoonlijke data |
| Feedback-data (Deel 7) | Geaggregeerde vorm: onbeperkt (voor trendanalyse); individueel herleidbare vorm: verwijderd na afhandeling van de eventuele opvolging, tenzij de gebruiker zelf de onderliggende chatgeschiedenis behoudt |
| Audit-log (gym-context, Hoofdstuk 6 Scherm 7.3) | Onbeperkt, onveranderlijk (bestaand, bindend gedrag — Hoofdstuk 7, Deel 7: Audit Log is alleen-lezen en nooit wijzigbaar) |

### 11.4 Recht op vergeten 🟢

Volledig gespecificeerd in Hoofdstuk 6, Scherm 8.4 (Profiel — accountverwijdering) en Deel 2.5/2.6 van dit hoofdstuk (AI-geheugen-vergeten). Bindende aanvulling hier: accountverwijdering verwijdert ook elke vorm van afgeleide of samengevatte AI-context die ooit uit die gebruikersdata is opgebouwd — niet enkel de ruwe brondata.

### 11.5 Export 🟢

Volledig gespecificeerd in Hoofdstuk 6, Scherm 9.3 (Import/Export). AI-specifieke aanvulling: coach-chatgeschiedenis is onderdeel van het exporteerbare logboek — een gebruiker kan zijn volledige AI-interactiegeschiedenis meenemen, consistent met de datafilosofie dat data van de atleet is (Hoofdstuk 1, sectie 1.10).

### 11.6 Toegang 🟢

Uitsluitend de ingelogde gebruiker zelf heeft toegang tot zijn eigen AI-context en -geschiedenis, behoudens expliciet gedeelde content binnen het drie-laags model (bijv. een coach die — met toestemming — trainingsvoortgang van een lid inziet, nooit de persoonlijke coach-chatgeschiedenis zelf, die blijft altijd strikt persoonlijk).

### 11.7 Audit trail 🔴

Elke wijziging aan AI-*gedrag* (niet gebruikersdata, maar de onderliggende contextlogica/persoonlijkheid/regels) wordt vastgelegd conform de Documentatieplicht (Deel 10.5) — dit vormt effectief een audit trail van hoe de AI-coach zich over tijd heeft ontwikkeld, raadpleegbaar bij een toekomstige vraag "waarom gedraagt de coach zich op deze manier."

---

## Deel 12 — AI Ethics Framework

Dit Deel consolideert en formaliseert principes die al verspreid in Hoofdstuk 1, 3 en 8 zijn vastgelegd — hier samengebracht als één ethisch toetsingskader, specifiek voor governance-doeleinden.

### 12.1 Transparantie 🟢
Zie Hoofdstuk 8, Deel 3 (Explainable AI) in zijn geheel — dit is het meest uitgewerkte ethische principe in het hele Handbook en wordt hier niet herhaald, enkel bevestigd als ethisch fundament, niet enkel een UX-eis.

### 12.2 Autonomie van de gebruiker 🟢
Zie Product Constitution I (Hoofdstuk 3): de AI beslist nooit, adviseert met overtuiging maar laat de keuze altijd bij de gebruiker (Hoofdstuk 8, Deel 2.1, Deel 16.4).

### 12.3 Geen manipulatie 🟢
Zie Hoofdstuk 3, Deel 6 (Behavioural Design, expliciet verboden manipulatieve technieken) en Hoofdstuk 8, Deel 12 (Notification Intelligence: notificaties zijn functioneel, nooit activatiegedreven).

### 12.4 Geen verslaving 🟢
Directe toepassing van Hoofdstuk 4, Deel 1 (verboden UX-patronen: oneindig scrollen, kunstmatige urgentie) op AI-gedrag specifiek: de coach-persona is nooit ontworpen om terugkerend gebruik te maximaliseren los van trainingswaarde — elke interactie dient een concreet trainingsdoel, nooit engagement als doel op zich.

### 12.5 Geen druk 🟢
Zie Product Constitution I en Hoofdstuk 8, Deel 15.1 ("coachend": begeleidt naar een keuze, neemt die niet over).

### 12.6 Geen schuldgevoel 🟢
Zie Hoofdstuk 8, Deel 15.1 en Deel 13.4 (Hoe AI waarschuwt) — een gemiste training of tegenvallende sessie wordt nooit als persoonlijk falen geframed.

### 12.7 Menselijke controle 🔴
Het meest fundamentele governance-principe van dit Deel: **een mens (de Product Owner, uiteindelijk namens elke gebruiker) behoudt te allen tijde de mogelijkheid om AI-gedrag te herzien, corrigeren, of terug te draaien** (Deel 10.4, Rollback-procedure). Geen enkele AI-functionaliteit in TrainingKompas opereert autonoom buiten dit menselijke toezicht — dit is de institutionele vertaling van Product Constitution I (AI beslist nooit) naar het niveau van het systeem zelf, niet enkel naar individuele adviezen.

**Bindende regel (Deel 12, samenvattend):** elke nieuwe AI-functie wordt bij de risicoanalyse (Deel 1.6) getoetst aan alle zeven ethische principes hierboven — een functie die op één van deze zeven principes faalt, wordt niet gebouwd, ongeacht de mogelijke productwaarde.


---

## Deel 13 — AI Incident Management

### 13.1 Wat is een incident 🔴

Een AI-incident is elke situatie waarin AI-gedrag daadwerkelijk of potentieel: (a) een veiligheidsregel schendt (Hoofdstuk 8, Deel 14), (b) een gebruiker foutieve, niet-herleidbare informatie presenteert (hallucination, Deel 6), of (c) een fundamentele Constitution-wet doorbreekt (Hoofdstuk 3/8, of dit hoofdstuk). Een incident is nadrukkelijk iets anders dan reguliere negatieve feedback (Deel 7) — een incident vereist per definitie onderzoek, feedback niet altijd.

### 13.2 Classificatie 🔴

| Niveau | Definitie | Voorbeeld |
|---|---|---|
| **Kritiek** | Direct veiligheidsrisico voor de fysieke gezondheid van een gebruiker | Een advies dat een sportwetenschappelijke veiligheidsgrens (Hoofdstuk 8, Deel 14.2) overschrijdt; een uitspraak die als medische diagnose gelezen kan worden (Deel 14.1) |
| **Hoog** | Vertrouwensbreuk zonder direct fysiek risico | Een hallucination (Deel 6) die feitelijk onjuist is maar niet gevaarlijk; een advies dat een gemelde blessure negeert zonder direct schadelijk te zijn |
| **Middel** | Kwaliteits-/consistentieprobleem | Een toon die afwijkt van de Personality Matrix (Hoofdstuk 8, Deel 15); een uitleg die onvoldoende navolgbaar is (Deel 5.3) |
| **Laag** | Incidentele, geïsoleerde afwijking zonder patroon | Eén enkele, niet-herhaalde onduidelijke formulering |

### 13.3 Responstijd 🔴

| Niveau | Responstijd (onderzoek starten) | Actie |
|---|---|---|
| Kritiek | Direct, bij detectie | Onmiddellijke rollback van de betrokken AI-functionaliteit (Deel 10.4) tot het incident volledig begrepen is |
| Hoog | Binnen de eerstvolgende werksessie | Onderzoek + gerichte correctie, toevoeging aan de regressietestset (Deel 4.4) |
| Middel | Binnen de eerstvolgende reguliere ontwikkelcyclus | Correctie ingepland, geen noodprocedure |
| Laag | Verzameld en periodiek beoordeeld (aansluitend bij Deel 10.1: periodieke kwaliteitsherziening) | Trendmatig meegenomen, geen individuele actie tenzij een patroon ontstaat |

### 13.4 Escalatie 🟢

Volgt Deel 1.3/1.4: elk Kritiek of Hoog incident wordt direct aan de Product Owner gemeld, ongeacht wie het incident detecteert (geautomatiseerde monitoring, gebruikersfeedback, of steekproefcontrole). Een Kritiek incident vereist Product Owner-betrokkenheid vóór de betrokken functionaliteit weer wordt vrijgegeven.

### 13.5 Herstelprocedure 🔴

1. **Direct:** rollback naar de laatst geverifieerde, veilige AI-contextversie (Deel 10.4) bij Kritiek/Hoog.
2. **Onderzoek:** reconstructie van de oorzaak — welke context, welke input, welke wijziging leidde tot het incident.
3. **Correctie:** gerichte aanpassing, getoetst tegen de volledige Testprocedure (Deel 4.2) inclusief de specifieke edge case die tot het incident leidde.
4. **Regressieborging:** het specifieke scenario wordt permanent toegevoegd aan de edge-casetestset (Deel 5.11) zodat het incident niet onopgemerkt kan terugkeren bij een toekomstige wijziging.
5. **Documentatie:** vastgelegd conform Deel 10.5; bij een Kritiek incident altijd met een Decision Log-vermelding, ook als de uiteindelijke correctie op zichzelf klein is — de aard van het incident, niet enkel de omvang van de fix, bepaalt de documentatie-eis.

### 13.6 Communicatie naar de gebruiker 🔴

| Situatie | Communicatie |
|---|---|
| Een gebruiker heeft mogelijk een schadelijk advies ontvangen (Kritiek) | Directe, persoonlijke en eerlijke melding zodra het incident bevestigd is — geen verhulling, consistent met Product Constitution VIII (nooit een stille fout) toegepast op het meest gevoelige niveau |
| Een systeembrede correctie is doorgevoerd na een Hoog-incident | Generieke, transparante vermelding (vergelijkbaar met release-notes) zonder onnodig alarmerende toon — feitelijk en gerust, consistent met de coach-persoonlijkheid zelf (Hoofdstuk 8, Deel 15) |
| Een Middel/Laag-incident is gecorrigeerd | Geen actieve gebruikerscommunicatie nodig, tenzij een individuele gebruiker er specifiek naar vraagt |

**Bindende regel:** de toon van incident-communicatie volgt dezelfde ingehouden, eerlijke merktoon als de rest van TrainingKompas (Hoofdstuk 1, sectie 1.6) — geen paniek, geen bagatellisering, altijd een concreet vervolgpad voor de gebruiker.

---

## Deel 14 — Cross References

Volledige koppeling tussen dit hoofdstuk en Hoofdstuk 1-8.

| Dit hoofdstuk | Relevante koppeling |
|---|---|
| Deel 1 — AI Governance | Hoofdstuk 3 (Product Constitution, Decision Log-werkwijze); bestaande Blueprint.md/CLAUDE_SOFTWARE_ENGINEER_START.md-governance-niveau B |
| Deel 2 — AI Memory Framework | Hoofdstuk 1, sectie 1.9/1.14 (coach-geheugen); Hoofdstuk 8, Deel 16.2 |
| Deel 3 — AI Context Management | Hoofdstuk 8, Deel 16.1 (Decision Matrix), Deel 11 (Sport Intelligence-contextlagen) |
| Deel 4 — AI Quality Assurance | Bestaande `logic_tests.js`-werkwijze; Hoofdstuk 8, Deel 3/14/15 als inhoudelijke testnorm |
| Deel 5 — AI Evaluation | Hoofdstuk 8, Deel 3 (Explainability), Deel 14 (Safety), Deel 15 (Personality), Deel 5 (Progression Intelligence) |
| Deel 6 — Hallucination Prevention | Hoofdstuk 8, Deel 2.4, Deel 3.8, Deel 16.3/16.5 |
| Deel 7 — AI Feedback Loop | Hoofdstuk 4, Golden Rules (thumbs-down-mechanisme); Hoofdstuk 8, Deel 15 |
| Deel 8 — AI Bias & Fairness | Hoofdstuk 1, sectie 1.8 (Masters-correctie); Hoofdstuk 2, Persona's (brede doelgroepdekking); Hoofdstuk 8, Deel 11/16.2 |
| Deel 9 — AI Performance Monitoring | Blueprint.md (entitlement-/quotaschema); Hoofdstuk 4, Performance Principles |
| Deel 10 — AI Update Policy | Blueprint.md (releaseprocedure); Deel 1 van dit hoofdstuk |
| Deel 11 — AI Data Governance | Hoofdstuk 1, sectie 1.10 (datafilosofie); Hoofdstuk 6, Scherm 8.4/9.3 |
| Deel 12 — AI Ethics Framework | Hoofdstuk 3, Product Constitution I/VIII; Hoofdstuk 3, Deel 6 (Behavioural Design); Hoofdstuk 8, Deel 15 |
| Deel 13 — AI Incident Management | Hoofdstuk 3, Product Constitution VIII (nooit stille fout); Hoofdstuk 4, Deel 9 (Error Recovery) |


---

## AI Governance Constitution

Dertig bindende wetten — aanvullend op de Product Constitution (Hoofdstuk 3), UX Constitution (Hoofdstuk 4), Design Constitution (Hoofdstuk 5), Screen Design Laws (Hoofdstuk 6), Component Library Constitution (Hoofdstuk 7) en AI Behaviour Constitution (Hoofdstuk 8).

**1.** Geen enkele AI-functionaliteit wordt gebouwd zonder eerst tegen dit hoofdstuk en Hoofdstuk 8 getoetst te zijn.

**2.** Elke wijziging die een Constitution-wet raakt (Hoofdstuk 3-9) wordt vastgelegd in de Decision Log met motivatie en impactanalyse, vóór release.

**3.** De Product Owner is eindverantwoordelijk voor elke productbeslissing die AI-gedrag raakt; deze verantwoordelijkheid is niet overdraagbaar zonder expliciete herziening van dit hoofdstuk.

**4.** Elke nieuwe AI-functie doorloopt een risicoanalyse op veiligheids-, vertrouwens- en consistentierisico vóór bouw.

**5.** Langetermijngeheugen dient de gebruiker (personalisatie, uitlegbaarheid) — nooit het systeem (engagementmaximalisatie).

**6.** Data van andere gebruikers wordt nooit in de AI-context van een individuele gebruiker verwerkt zonder expliciete, wederzijdse toestemming.

**7.** Verwijderde of gecorrigeerde data wordt ook uit het effectieve AI-geheugen verwijderd — niet enkel uit de zichtbare interface.

**8.** De contextprioriteit (blessure > acute dagfactor > periodisering > voorkeur > generieke aanname) is bindend bij elke technische implementatie van AI-context.

**9.** Bij een contextconflict krijgt het meest voorzichtige signaal voorrang, en wordt het conflict expliciet aan de gebruiker uitgelegd.

**10.** Bij contextverlies of -onvoldoende is stilte of een neutrale fallback altijd de veiligere keuze dan een advies op ontoereikende basis.

**11.** Elke AI-wijziging doorloopt de volledige testprocedure (functioneel, explainability, safety, persoonlijkheid, sportspecifiek) vóór release.

**12.** Een AI-wijziging die de Constitution raakt, wordt nooit vrijgegeven zonder voorafgaande Decision Log-vermelding.

**13.** Elke AI-output wordt beoordeeld op elf vaste evaluatiecriteria (Deel 5); geen enkele output is vrijgesteld.

**14.** Een vaste edge-casetestset wordt bij elke Safety-test verplicht doorlopen en blijft na elk incident permanent uitgebreid.

**15.** Elke AI-output die zekerheid suggereert zonder toereikende databasis, geldt als hallucination en wordt behandeld als kwaliteitsfout, niet als acceptabele variatie.

**16.** Kernwaarden die deterministisch berekenbaar zijn, worden nooit aan het taalmodel overgelaten om te schatten — ze worden altijd expliciet aangeleverd.

**17.** Gebruikersfeedback is een signaalbron, geen automatische trainingsdata — elke structurele wijziging op basis van feedback doorloopt de reguliere wijzigingsprocedure.

**18.** "Onveilig" gemarkeerde feedback wordt altijd individueel en direct onderzocht, nooit enkel geaggregeerd.

**19.** Elke nieuwe AI-functie wordt getoetst aan de acht bias-/fairnessgebieden (leeftijd, geslacht, ervaring, blessures, sport, lichaamstype, doelen, culturele verschillen).

**20.** Kostenbeheersing (quota, entitlements) beïnvloedt nooit de kwaliteit of uitlegbaarheid van een individueel advies.

**21.** Elke modelwijziging (upgrade, vervanging) doorloopt de volledige testprocedure opnieuw, ongeacht hoe klein de wijziging lijkt.

**22.** Een gedetecteerde veiligheidsschending in productie leidt tot onmiddellijke rollback, met voorrang boven elke lopende ontwikkeling.

**23.** Elke AI-gedragswijziging is herleidbaar naar een specifieke, gedocumenteerde versie.

**24.** De Anthropic API-sleutel en gelijkwaardige geheimen worden nooit client-side blootgesteld; elke AI-integratie is server-side geverifieerd vóór livegang.

**25.** Recht op vergeten omvat ook elke afgeleide of samengevatte AI-context die ooit uit de verwijderde data is opgebouwd.

**26.** Een mens behoudt te allen tijde de mogelijkheid om AI-gedrag te herzien, corrigeren of terug te draaien — geen AI-functionaliteit opereert autonoom buiten menselijk toezicht.

**27.** Elke nieuwe AI-functie wordt getoetst aan de zeven ethische principes (transparantie, autonomie, geen manipulatie, geen verslaving, geen druk, geen schuldgevoel, menselijke controle); falen op één principe betekent: niet bouwen.

**28.** Een Kritiek AI-incident wordt direct aan de Product Owner gemeld en de betrokken functionaliteit teruggedraaid vóórdat verder onderzoek plaatsvindt.

**29.** Communicatie over een AI-incident naar de gebruiker is altijd eerlijk en tijdig — nooit verhuld, nooit vertraagd om reputatieschade te beperken.

**30.** Elke afwijking van deze dertig wetten wordt expliciet vastgelegd in de Decision Log, met motivatie en impactanalyse — dezelfde bindende werkwijze als alle voorgaande Constitutions in dit Handbook voorschrijven.

---

*Einde Hoofdstuk 9. Dit hoofdstuk vormt samen met Hoofdstuk 1 t/m 8 het volledige governance-, geheugen- en kwaliteitsfundament van het TrainingKompas Premium Development Handbook. Waar Hoofdstuk 8 vastlegde wát de AI doet, legt dit hoofdstuk vast hoe dat gedrag over maanden en jaren gecontroleerd, getest, bewaakt en zo nodig gecorrigeerd wordt. Geen enkele AI-functionaliteit — bestaand of toekomstig — opereert buiten dit raamwerk.*

