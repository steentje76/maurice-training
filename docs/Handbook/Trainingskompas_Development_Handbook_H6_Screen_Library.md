## Hoofdstuk 6 — Screen Specifications & Complete Screen Library

**Status:** bindend, praktisch referentiehoofdstuk. Elk scherm dat in TrainingKompas gebouwd of herzien wordt, volgt de specificatie hieronder.
**Voortbouwend op:** Hoofdstuk 1 (Productvisie & Filosofie), Hoofdstuk 2 (Doelgroepen, Persona's & Customer Journey), Hoofdstuk 3 (Product Design Principles & Golden Rules), Hoofdstuk 4 (Premium UX & Interaction Design Handbook), Hoofdstuk 5 (Premium UI Design System & Visual Language).
**Karakter:** dit hoofdstuk is uitsluitend product-, UX-, functionele en ontwerpdocumentatie — geen code, geen wireframes, geen architectuur. Elke specificatie is geschreven zodat een ontwerper of ontwikkelaar zonder verdere interpretatie kan beginnen.

> **COVERAGE GAP (POINT-IN-TIME AUDIT, toegevoegd via MS-F1-04, 28 augustus 2026):** dit hoofdstuk noemt "v3.3.25" als referentieversie en bevat geen specificatie voor de 11 Lichaam-subschermen (`s-lich-*`, incl. `s-lich-cyclus`) of de HYROX-schermen (`s-hyrox`, `s-hyrox-perf`, incl. Adaptive/Relay/Doubles-varianten) die inmiddels bestaan in de huidige app (v4.69.1). Dit hoofdstuk beschrijft dus geen schermen die tegenstrijdig zijn met de huidige architectuur — het is onvolledig, niet fout, voor deze specifieke schermen. Zie `docs/CAPABILITY_REGISTRY.md` (CTX-CYCLE-001, END-HYROX-001) en `docs/HANDBOOK_UPDATE_PLAN.md` voor de volledige lijst. Het volledig uitschrijven van 24-veld-specificaties voor deze schermen is bewust NIET in deze sync-sprint gedaan (dat is contentcreatie, geen "synchronisatie van tegenstrijdige normatieve instructies") en blijft open vervolgwerk.

---

### Leeswijzer en gebruikte conventies

Elk scherm in dit hoofdstuk volgt exact hetzelfde vierentwintig-punts format, in de volgorde zoals opgegeven. Om herhaling van reeds vastgelegde specificaties te voorkomen (en dit hoofdstuk daarmee bruikbaar te houden in plaats van een herhaling van Hoofdstuk 4/5), verwijst elk veld waar mogelijk terug naar de exacte sectie waar een component, kleur, spacing-waarde of regel al is vastgelegd — met de aanvulling die specifiek is voor dát scherm. Waar een scherm nog niet bestaat in de huidige codebase (v3.3.25) en dus een toekomstige uitbreiding beschrijft, wordt dat expliciet vermeld bij "Business rules" of "Mogelijke uitbreidingen".

**Statusaanduiding per scherm:**
- 🟢 **Bestaand** — scherm bestaat in de huidige app, specificatie legt de bindende, definitieve vorm vast (inclusief nog te bouwen verbeteringen uit de Product Audit).
- 🟡 **Gedeeltelijk bestaand** — kernfunctionaliteit bestaat, dit hoofdstuk specificeert een uitbreiding of herstructurering.
- 🔴 **Nieuw/toekomstig** — scherm bestaat nog niet, specificatie is een productvoorstel gebaseerd op de Roadmap en Hoofdstuk 1-5.

**De vierentwintig velden, in vaste volgorde:** Doel · Gebruiker · User story · Navigatie · Header · Content · Cards · Componenten · CTA's · States · Empty state · Loading state · Error state · Offline gedrag · AI-gedrag · Haptics · Animaties · Accessibility · Dark mode · Business rules · Acceptatiecriteria · UX-regels · Golden Rules · Mogelijke uitbreidingen.

---

## Deel 1 — Onboarding & Toegang

### 1.1 Splash 🟢

| Veld | Specificatie |
|---|---|
| Doel | De app onmiddellijk herkenbaar maken als Trainingskompas tijdens het laden, zonder de gebruiker te laten wachten langer dan functioneel nodig is. |
| Gebruiker | Iedereen, elke sessie-start. |
| User story | Als gebruiker wil ik direct zien dat de juiste app opent, zodat ik vertrouwen heb vóór er iets geladen is. |
| Navigatie | Geen — automatische doorstroom naar Login (niet-ingelogd) of Dashboard (ingelogd, actieve sessie). |
| Header | Geen systeemheader; het logo fungeert als enige content. |
| Content | Logo (icoon + wordmark + tagline), verticaal en horizontaal gecentreerd (Hoofdstuk 5, Deel 2). |
| Cards | Geen. |
| Componenten | Geen interactieve componenten. |
| CTA's | Geen — dit scherm vraagt geen actie. |
| States | Eén enkele staat: laden. |
| Empty state | N.v.t. |
| Loading state | Het scherm ís de loading state van de app zelf; het bergpad-met-vlag-motief (Hoofdstuk 5, Deel 9) mag een subtiele, doorlopende animatie krijgen (`motion-loading-pulse`, Hoofdstuk 5 Deel 14) zolang de app initialiseert. |
| Error state | Bij een kritieke laadfout (bijv. geen bundle beschikbaar): een minimale foutmelding met "opnieuw proberen", los van de merkweergave. |
| Offline gedrag | Splash verschijnt ongeacht netwerkstatus — de PWA-shell is lokaal gecached (sw.js). |
| AI-gedrag | N.v.t. |
| Haptics | Geen. |
| Animaties | Logo-fade-in (`motion-standard`, 200-250ms) bij verschijnen; geen kunstmatige vertraging (verboden UX-patroon, Hoofdstuk 4 Deel 1). |
| Accessibility | Logo voorzien van alt-tekst "Trainingskompas" voor schermlezers; scherm wordt overgeslagen bij `prefers-reduced-motion` zonder functieverlies. |
| Dark mode | Splash is by design al donker (`#0B1D2A`-achtergrond) — geen apart light-mode-splash nodig (Hoofdstuk 5, Deel 2/13). |
| Business rules | Maximale weergaveduur: alleen zo lang als de daadwerkelijke initialisatie duurt; geen minimale kunstmatige duur. |
| Acceptatiecriteria | Splash verdwijnt zodra de app functioneel gereed is; nooit langer dan 2 seconden op een gemiddelde verbinding. |
| UX-regels | Hoofdstuk 4, Deel 1 (geen kunstmatige laadschermen). |
| Golden Rules | UI-regels Hoofdstuk 3 (merkconsistentie), Product Constitution XI (merknaam altijd zichtbaar). |
| Mogelijke uitbreidingen | Geen — dit scherm blijft bewust minimaal; uitbreiding zou tegen het "geen kunstmatige vertraging"-principe ingaan. |

### 1.2 Onboarding 🟡

| Veld | Specificatie |
|---|---|
| Doel | Profiel, doel en ervaringsniveau vastleggen en eindigen in een concreet, gepersonaliseerd eerste advies (Hoofdstuk 4, Flow 2). |
| Gebruiker | Primair: nieuwe gebruiker, met Persona Fleur (Hoofdstuk 2) als kwetsbaarste referentie. Secundair: ervaren gebruiker (Persona Ruud/Daan) bij nieuw account. |
| User story | Als nieuwe gebruiker wil ik in enkele korte stappen mijn profiel opzetten, zodat mijn eerste training al persoonlijk aanvoelt. |
| Navigatie | Lineaire stap-voor-stap-flow zonder bottom-navigatie; een "overslaan"-link is op elk moment zichtbaar rechtsboven. |
| Header | Voortgangsindicator (stippen of balk) bovenaan, geen traditionele titelbalk. |
| Content | Eén vraag per stap: naam/basisgegevens → sport + ervaringsniveau → doel (kort-/langetermijn) → optioneel conditie/blessure → eerste check-in (HRV/slaap) → eerste advies. |
| Cards | Het eindscherm toont het eerste advies in een AI Card (Hoofdstuk 5, Deel 11). |
| Componenten | Radio buttons (sportkeuze, ervaringsniveau), tekstvelden (naam, HRV), stepper (leeftijd), Button (volgende/overslaan). |
| CTA's | "Volgende" (primair, Bold), "Overslaan" (tekst-knop, laagste nadruk). |
| States | Stap-voor-stap-voortgang, eindstaat met gegenereerd advies. |
| Empty state | N.v.t. (elke stap heeft altijd content). |
| Loading state | Korte laadindicator bij het genereren van het eerste advies na de laatste stap (Hoofdstuk 4, Micro-interactie #80). |
| Error state | Alleen bij verplichte velden; foutmelding direct onder het veld (Hoofdstuk 5, Forms). |
| Offline gedrag | Onboarding vereist een actieve verbinding voor het eerste AI-advies; bij offline-start wordt dit duidelijk gemeld met de optie later te voltooien. |
| AI-gedrag | Het eindadvies toont expliciet welke ingevoerde gegevens gebruikt zijn (Product Principle P3). |
| Haptics | Lichte tik bij elke voltooide stap (Hoofdstuk 4, Micro-interactie #79). |
| Animaties | Voortgangsindicator schuift op (`motion-fast`); eindadvies verschijnt met lichte overshoot (`motion-slow`, Micro-interactie #80). |
| Accessibility | Grote tikdoelen, hoog contrast, screenreader-volgorde matcht visuele volgorde (Hoofdstuk 4, Scherm 1). |
| Dark mode | Volgt het systeembrede dark-mode-schema (Hoofdstuk 5, Deel 13); AI-advieskaart in petrol met witte tekst in beide modi. |
| Business rules | Maximaal vijf stappen (Golden Rule UX9); overslaanbaar; terugkerende gebruikers doorlopen dit nooit opnieuw zonder eigen actie (UX12). |
| Acceptatiecriteria | Van start tot gepersonaliseerd advies in minder dan negentig seconden bij normaal gebruik. |
| UX-regels | Hoofdstuk 3, UX9-UX12; Hoofdstuk 4, Flow 2, Scherm 1. |
| Golden Rules | Product Constitution IX (onboarding max. vijf stappen, eindigt in concreet advies). |
| Mogelijke uitbreidingen | Sportspecifieke vervolgvragen per gekozen sport (bijv. HYROX-race-doeldatum); optionele wearable-koppeling direct binnen de flow. |

### 1.3 Login 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een bestaande gebruiker snel en veilig toegang geven tot zijn account. |
| Gebruiker | Alle terugkerende gebruikers. |
| User story | Als terugkerende gebruiker wil ik snel inloggen, zodat ik zonder frictie bij mijn dagfactor en training kom. |
| Navigatie | Vanaf Splash (niet-ingelogd) of na uitloggen vanuit Profiel; link naar Registreren onderaan. |
| Header | Logo (icoon-variant) bovenaan, geen terugknop op het eerste scherm van de flow. |
| Content | E-mailveld, wachtwoordveld, "wachtwoord vergeten"-link, primaire inlogknop. |
| Cards | Geen — een los formulier op de achtergrondkleur, geen kaartcontainer nodig voor zo'n kort formulier. |
| Componenten | Forms (Hoofdstuk 5, Deel 11), Button (primair). |
| CTA's | "Inloggen" (primair), "Account aanmaken" (secundair/tekst-knop naar Registreren). |
| States | Leeg, ingevuld, bezig met inloggen, foutstaat (onjuiste inloggegevens). |
| Empty state | N.v.t. |
| Loading state | Primaire knop toont spinner tijdens verwerking (Hoofdstuk 5, Buttons: loading-state). |
| Error state | "E-mailadres of wachtwoord onjuist" direct boven het formulier, nooit een technische foutcode (Golden Rule UX36). |
| Offline gedrag | Inloggen vereist een verbinding; bij offline-poging: duidelijke melding, geen stille mislukking. |
| AI-gedrag | N.v.t. |
| Haptics | Lichte tik bij "Inloggen"; foutmelding-trilling bij mislukte poging. |
| Animaties | Standaard schermovergang (`motion-standard`); foutmelding verschijnt met `motion-fast`. |
| Accessibility | Velden met gekoppelde labels, wachtwoordveld met zichtbaar-maken-toggle die toegankelijk is voor schermlezers. |
| Dark mode | Formulier volgt Hoofdstuk 5, Deel 13 (dark-mode Forms-specificatie). |
| Business rules | Sessie blijft persistent (bestaand Supabase Auth-gedrag) tot expliciet uitloggen. |
| Acceptatiecriteria | Succesvolle login leidt direct naar Dashboard zonder tussenscherm. |
| UX-regels | Hoofdstuk 3, UX7-UX8 (formulierregels), UX36 (foutmeldingen). |
| Golden Rules | Product Constitution VIII (geen stille fouten). |
| Mogelijke uitbreidingen | Biometrische login (vingerafdruk/gezichtsherkenning) als snelkoppeling op ondersteunde toestellen; "onthoud mij"-optie expliciet gescheiden van persistente sessie. |

### 1.4 Registreren 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een nieuw account aanmaken met minimale frictie vóór de onboarding start. |
| Gebruiker | Nieuwe gebruikers. |
| User story | Als nieuwe gebruiker wil ik snel een account aanmaken, zodat ik zo snel mogelijk bij mijn eerste gepersonaliseerde advies kom. |
| Navigatie | Vanaf Login of Splash; leidt na succesvolle registratie direct naar Onboarding (1.2). |
| Header | Zelfde als Login. |
| Content | E-mailveld, wachtwoordveld, wachtwoordbevestiging, akkoord met voorwaarden/privacybeleid (checkbox met link naar Deel 8, Privacy). |
| Cards | Geen. |
| Componenten | Forms, Checkbox (voorwaarden-akkoord), Button (primair). |
| CTA's | "Account aanmaken" (primair), "Al een account? Inloggen" (tekst-knop terug naar Login). |
| States | Leeg, ingevuld, bezig, foutstaat (bijv. e-mail al in gebruik, wachtwoord te zwak). |
| Empty state | N.v.t. |
| Loading state | Zelfde patroon als Login. |
| Error state | Specifiek per veld (Hoofdstuk 5, Forms: validatie inline onder het veld) — "dit e-mailadres is al geregistreerd" in plaats van een generieke foutmelding. |
| Offline gedrag | Registratie vereist een verbinding; duidelijke melding bij offline-poging. |
| AI-gedrag | N.v.t. |
| Haptics | Zelfde als Login. |
| Animaties | Zelfde als Login. |
| Accessibility | Wachtwoordsterkte-indicator ook tekstueel omschreven, niet uitsluitend via kleurbalk. |
| Dark mode | Zelfde als Login. |
| Business rules | E-mailbevestiging vereist vóór volledige toegang (consistent met de bestaande e-mailbevestigingseis bij gym-lidmaatschap, migratie v334); wachtwoord minimaal conform Supabase Auth-standaardvereisten. |
| Acceptatiecriteria | Succesvolle registratie leidt direct door naar Onboarding; e-mailbevestiging kan parallel/later plaatsvinden zonder de eerste productervaring te blokkeren. |
| UX-regels | Hoofdstuk 3, UX6-UX8. |
| Golden Rules | Product Constitution VIII. |
| Mogelijke uitbreidingen | Registratie via bestaand Google-account (OAuth) als alternatief voor e-mail/wachtwoord, ter verlaging van de aanmeldfrictie. |


---

## Deel 2 — Dashboard & Dagelijkse Focus

### 2.1 Dashboard 🟡

| Veld | Specificatie |
|---|---|
| Doel | In één oogopslag tonen wat vandaag te doen staat en hoe de gebruiker ervoor staat — het startpunt van elke sessie (Hoofdstuk 4, Scherm 2). |
| Gebruiker | Alle actieve gebruikers, dagelijks bezoek; secundair coaches die kort eigen voortgang checken. |
| User story | Als gebruiker wil ik bij het openen van de app direct weten of en hoe ik vandaag moet trainen, zodat ik niet zelf hoef te bepalen wat de juiste keuze is. |
| Navigatie | Standaard eerste tab van de bottom-navigatie (Hoofdstuk 5, Navigation). |
| Header | Merklogo (icoon-variant) links, instellingen-icoon rechts — bestaand patroon, behouden. |
| Content | Dagfactor/vandaag-advies (bovenaan, grootste visuele massa) → weekvoortgang → mini-spierherstel-heatmap → recente sessies. |
| Cards | Maximaal vijf primaire kaarten boven de vouw (Golden Rule UX13): Vandaag-kaart, Weekvoortgang-kaart, Herstel-mini-kaart, Training-starten-kaart, Recente-sessies-kaart. |
| Componenten | Analytics Card (dagfactor-cijfer), Progress (weekbalk), Recovery Card (mini-heatmap), Button (training starten). |
| CTA's | Eén primaire CTA: "Training starten" of specifiek "Training A/B starten" — nooit twee gelijkwaardige primaire knoppen (Product Principle P7). |
| States | Gevuld (normaal), leeg (nieuwe gebruiker), laden, foutstaat per kaart. |
| Empty state | Nieuwe gebruiker zonder trainingshistorie: toont het vervolg van de onboarding-belofte in plaats van lege kaarten (Hoofdstuk 4, Deel 8). |
| Loading state | Skeleton-kaarten in exact dezelfde lay-out als de geladen content (Hoofdstuk 3/4, Performance Principles). |
| Error state | Bij mislukte data-fetch: korte melding met "opnieuw proberen" per kaart, losstaand — één mislukte kaart blokkeert de overige niet. |
| Offline gedrag | Laatst bekende data blijft zichtbaar met een offline-indicator; "training starten" blijft volledig functioneel (UX41). |
| AI-gedrag | Dagfactor-toelichting altijd zichtbaar naast het cijfer ("HRV goed, slaap te kort") — nooit een kaal cijfer zonder uitleg (Product Principle P3). |
| Haptics | Lichte tik bij elke kaart-interactie. |
| Animaties | Kaarten laden met lichte fade-in (`motion-standard`); geen enkele decoratieve animatie zonder functie. |
| Accessibility | Kaartvolgorde matcht screenreader-volgorde; herstel nooit uitsluitend via kleur weergegeven. |
| Dark mode | Achtergrond `#0B1D2A`, kaarten `#0E3B4A` (Hoofdstuk 5, Deel 13). |
| Business rules | Herstelinformatie krijgt minimaal evenveel visuele prominentie als prestatie-informatie (Product Constitution II). |
| Acceptatiecriteria | Training starten kost één tik vanaf dit scherm; maximaal vijf kaarten boven de vouw; skeleton i.p.v. lege ruimte tijdens laden. |
| UX-regels | Hoofdstuk 3, UX13-UX15; Hoofdstuk 4, Flow 11, Scherm 2. |
| Golden Rules | Product Constitution II, VI, VII. |
| Mogelijke uitbreidingen | Dashboard 2.0-uitbreiding uit de Product Audit: prominentere weekvoortgang, streak-weergave (na validatie, Hoofdstuk 2 Deel 8), gepersonaliseerde AI-samenvatting bovenaan bij terugkeer na langere afwezigheid. |

### 2.2 Vandaag 🔴

| Veld | Specificatie |
|---|---|
| Doel | Een verdiepende, volledige weergave van de dagelijkse status bieden — voor de gebruiker die verder wil kijken dan de Dashboard-samenvatting, zonder het Dashboard zelf te overladen (Product Principle P16: complexiteit naar de kwetsbaarste gebruiker, diepgang blijft beschikbaar voor wie het zoekt). |
| Gebruiker | Primair Persona Ruud/Daan (data-gedreven gebruikers die de dagfactor-berekening willen doorgronden). |
| User story | Als data-gedreven sporter wil ik precies zien welke factoren mijn dagfactor vandaag bepalen, zodat ik het advies volledig kan doorgronden in plaats van enkel het eindcijfer te zien. |
| Navigatie | Bereikbaar via een "meer details"-tik op de Vandaag-kaart van het Dashboard — geen eigen plek in de bottom-navigatie (voorkomt een zesde navigatie-item, Golden Rule UX1). |
| Header | Titel "Vandaag" (Headline-stijl), terugknop naar Dashboard. |
| Content | Volledige uitsplitsing: HRV-waarde en trend, rustslag, slaapduur, ingevulde condities, berekende dagfactor met stap-voor-stap-toelichting, vergelijking met het gemiddelde van de afgelopen 14 dagen. |
| Cards | Eén kaart per databron (HRV, slaap, condities) plus één samenvattende Analytics Card met het eindcijfer. |
| Componenten | Analytics Card, Chart (kleine trendlijn per factor), AI Card (toelichting). |
| CTA's | "Pas mijn training aan" (indien de dagfactor een aanpassing suggereert) of "Terug naar Dashboard". |
| States | Gevuld, laden, foutstaat. |
| Empty state | Onvoldoende data (bijv. nog geen HRV ingevuld vandaag): directe CTA naar de check-in. |
| Loading state | Skeleton per factor-kaart. |
| Error state | Per factor losstaand — een ontbrekende wearable-sync blokkeert niet de weergave van handmatig ingevoerde data. |
| Offline gedrag | Toont laatst bekende berekening met offline-indicator. |
| AI-gedrag | Elke stap van de berekening expliciet toegelicht in gewone taal (Product Principle P3, hier op het meest gedetailleerde niveau van de hele app). |
| Haptics | Lichte tik bij het uitklappen van een factor. |
| Animaties | Factoren klappen open met `motion-standard`. |
| Accessibility | Elke trendlijn heeft een tekstuele samenvatting. |
| Dark mode | Zelfde patroon als Dashboard. |
| Business rules | Dit scherm toont uitsluitend read-only inzicht — wijzigingen aan de onderliggende data (bijv. HRV corrigeren) gebeuren via de check-in-flow, niet hier. |
| Acceptatiecriteria | Elke factor die de dagfactor beïnvloedt is hier terug te vinden met exacte bijdrage. |
| UX-regels | Hoofdstuk 3, UX28 (grafieken tonen duiding); Product Principle P4. |
| Golden Rules | Product Constitution III (uitlegbaarheid zonder uitzondering). |
| Mogelijke uitbreidingen | Historische vergelijking van dagfactor-nauwkeurigheid ("op dagen met dagfactor <0,8 herstelde je gemiddeld X% sneller wanneer je het advies opvolgde") — een geavanceerde vorm van AI-transparantie voor de meest betrokken gebruikers. |


---

## Deel 3 — Trainingsflow

### 3.1 Trainingsschema 🟢

| Veld | Specificatie |
|---|---|
| Doel | Overzicht van vaste trainingen (Training A/B), workouts en losse-oefening-opties, als startpunt vóór het trainen zelf. |
| Gebruiker | Alle actieve gebruikers. |
| User story | Als gebruiker wil ik kiezen hoe ik vandaag wil loggen (vast schema, eigen workout, of losse oefening), zodat de app aansluit bij hoe mijn dag daadwerkelijk verloopt. |
| Navigatie | Tweede tab van de bottom-navigatie ("Training"); toont bij een actieve training automatisch het logscherm in plaats van dit overzicht. |
| Header | "Training" (Headline), sport-context-indicator ("Sport vandaag: CrossFit/Functioneel"). |
| Content | Vier keuzekaarten: Schema (vaste trainingen), Workouts (eigen samenstellingen), Oefening (losse log), Programma (doorverwijzing naar 3.7). |
| Cards | Vier gelijkwaardige keuzekaarten, elk met icoon (Hoofdstuk 5, Deel 8), titel en korte omschrijving. |
| Componenten | Exercise Card-achtige keuzekaarten, Segment control (indien sportwissel hier plaatsvindt). |
| CTA's | Elke kaart is zelf de CTA (tik navigeert direct); geen aparte "verder"-knop nodig. |
| States | Gevuld, laden. |
| Empty state | Nieuwe gebruiker zonder vaste trainingen ingesteld: CTA om een eerste Training A/B samen te stellen of een programma te genereren. |
| Loading state | Skeleton-kaarten. |
| Error state | "Kon trainingsgegevens niet laden" met "opnieuw proberen". |
| Offline gedrag | Vaste trainingen (lokaal gecached) blijven kiesbaar; nieuwe workout samenstellen vereist mogelijk verbinding voor oefeningbibliotheek-zoekopdrachten (fallback: recent gebruikte oefeningen blijven offline beschikbaar). |
| AI-gedrag | N.v.t. op dit keuzescherm zelf. |
| Haptics | Lichte tik per kaartkeuze. |
| Animaties | Standaard kaart-tap-animatie (Hoofdstuk 5, Cards). |
| Accessibility | Vier kaarten navigeerbaar met duidelijke, onderscheidende labels voor schermlezers. |
| Dark mode | Standaard kaartpatroon. |
| Business rules | Toont altijd de "volgende training" op basis van historie wanneer een vast A/B-schema actief is (bestaand patroon). |
| Acceptatiecriteria | Een training starten kost maximaal twee tikken vanaf dit scherm. |
| UX-regels | Hoofdstuk 4, Flow 4. |
| Golden Rules | Product Constitution XIX (max. twee tikken kernacties). |
| Mogelijke uitbreidingen | Sportspecifieke iconografie per kaart wanneer sport wisselt (bijv. HYROX-specifieke workout-suggesties bovenaan bij HYROX-context). |

### 3.2 Training uitvoeren 🟢

| Veld | Specificatie |
|---|---|
| Doel | De actieve trainingssessie huisvesten — sets, reps, gewicht en RPE loggen (Hoofdstuk 4, Scherm 3). |
| Gebruiker | Alle actieve trainende gebruikers — hoogste gebruiksfrequentie in de hele app. |
| User story | Als sporter wil ik tijdens mijn training snel en zonder nadenken elke set kunnen loggen, zodat de app mijn ritme niet onderbreekt. |
| Navigatie | Bottom-navigatie is ondergeschikt tijdens actieve sessie (UX18); expliciete stop/pauze-knoppen in de train-top-balk (bestaand patroon). |
| Header | Verstreken tijd, pauze-knop, instellingen-icoon, afronden-knop (groen vinkje) — bestaande `train-top`-structuur, behouden en herstyled naar Hoofdstuk 5. |
| Content | Actieve oefening bovenaan (Workout Card), overige oefeningen in de sessie eronder, elk uitklapbaar. |
| Cards | Workout Cards (Hoofdstuk 5, Deel 11) — één per oefening in de sessie. |
| Componenten | Stepper (gewicht/reps/RPE), Superset-koppelicoon, "Vraag de coach"-knop, Plate calculator-snelkoppeling. |
| CTA's | "Set opslaan" (primair per set), "Sessie afronden" (primair, in de header). |
| States | Actief loggen, gepauzeerd, afgerond. |
| Empty state | N.v.t. — een sessie start altijd met minimaal één oefening. |
| Loading state | Geen zichtbare loading tijdens loggen — optimistische UI (Performance Principles, Hoofdstuk 3/4). |
| Error state | Bij mislukte synchronisatie van een specifieke set: rode accentrand op die kaart met "opnieuw proberen", blokkeert het verdere loggen niet. |
| Offline gedrag | Volledig functioneel zonder verbinding; offline-badge zichtbaar, sets worden in de wachtrij geplaatst (Golden Rule UX41-42). |
| AI-gedrag | "Vraag de coach"-knop direct bereikbaar zonder de sessie te verlaten; AI-waarschuwingen (bijv. bij ongewoon hoge belasting) verschijnen als niet-blokkerende kaart bovenaan. |
| Haptics | Lichte tik bij elke stepper-increment, sterkere bevestigende tik bij het opslaan van een set, onderscheidende positieve trilling bij een PR. |
| Animaties | Set-opslaan-pulse (100ms, `motion-instant`); PR-animatie (`motion-spring-bouncy`, uitsluitend hier en in de sessie-samenvatting). |
| Accessibility | Touch-targets ruimer dan systeemstandaard gezien fysieke inspanning (Hoofdstuk 4, Deel 1); Workout-typografiestijl (18px Bold) voor leesbaarheid. |
| Dark mode | Actieve set-kaart in `#0E3B4A` met hoog contrast, essentieel gezien mogelijk gebruik in een schemerige gym-omgeving. |
| Business rules | Dubbele tik op opslaan leidt nooit tot dubbele registratie (bestaande, bindende dubbel-klik-bescherming); rusttimer start automatisch na elke opgeslagen set. |
| Acceptatiecriteria | Set loggen kost maximaal twee tikken; bevestiging binnen twee seconden; rusttimer start zonder gebruikersactie. |
| UX-regels | Hoofdstuk 4, Deel 4 (Workout Experience Principles), Flow 5. |
| Golden Rules | Product Constitution XIX. |
| Mogelijke uitbreidingen | Proactieve AI-suggestie voor de volgende set op basis van RPE-trend binnen de sessie zelf (bijv. "je vorige twee sets waren zwaarder dan gepland — overweeg dit gewicht"). |


### 3.3 Oefening (detail/losse log) 🟢

| Veld | Specificatie |
|---|---|
| Doel | Eén specifieke oefening loggen, hetzij binnen een sessie, hetzij als losse registratie buiten een schema om. |
| Gebruiker | Alle gebruikers; met name relevant voor Persona Ruud (flexibel reageren op een klasse-aanbod). |
| User story | Als sporter wil ik een oefening kunnen loggen die niet in mijn vaste schema staat, zodat ik flexibel kan zijn zonder structuur te verliezen. |
| Navigatie | Vanuit Trainingsschema ("Oefening"-kaart) of vanuit een actieve sessie ("+ Oefening"). |
| Header | Oefeningnaam (Title), spiergroep-tags eronder. |
| Content | Techniekvideo-preview (indien beschikbaar), 1RM-referentie met percentage-snelkeuzes, apparatuurinstellingen-paneel, opwarmsets-sectie, werksets-sectie. |
| Cards | Eén Workout Card voor de actieve invoer, plus een informatieve kaart voor techniekvideo/spiergroep-info. |
| Componenten | Video-preview, percentage-chips (50/60/70/80/90/95/100%), Stepper, apparatuur-formulier. |
| CTA's | "Set opslaan", "+ Set toevoegen", "Vraag de coach". |
| States | Zelfde als Training uitvoeren (3.2) — dit scherm hergebruikt exact hetzelfde renderpad (Product Principle P9). |
| Empty state | Nieuwe oefening zonder eerdere sessie-data: geen "vorige sessie"-referentie getoond, vervangen door een korte hint ("Dit is je eerste keer met deze oefening"). |
| Loading state | Zelfde als 3.2. |
| Error state | Zelfde als 3.2. |
| Offline gedrag | Zelfde als 3.2. |
| AI-gedrag | Zelfde als 3.2. |
| Haptics | Zelfde als 3.2. |
| Animaties | Zelfde als 3.2. |
| Accessibility | Zelfde als 3.2; techniekvideo heeft ondertitels/transcript waar beschikbaar. |
| Dark mode | Zelfde als 3.2. |
| Business rules | Apparatuurinstellingen worden onthouden per oefening én per gebruiker (Golden Rule UX23), nooit gym-breed gedeeld tenzij expliciet ingesteld (drie-laags model). |
| Acceptatiecriteria | Oefening vinden en loggen starten binnen drie tikken vanaf het beginpunt (Hoofdstuk 4, Scherm 4). |
| UX-regels | Hoofdstuk 4, Scherm 4. |
| Golden Rules | Product Constitution IX (uitbreiding boven nieuwbouw — hergebruik van het Training-renderpad). |
| Mogelijke uitbreidingen | Automatische suggestie van vergelijkbare oefeningen wanneer een gebruiker herhaaldelijk dezelfde losse oefening logt (signaal voor een mogelijk nieuw vast schema-onderdeel). |

### 3.4 Set logging (invoercomponent, geen apart scherm) 🟢

| Veld | Specificatie |
|---|---|
| Doel | Het exacte, herhaalde invoermoment binnen 3.2/3.3 — apart gespecificeerd vanwege het extreem hoge gebruiksvolume (meerdere keren per set, honderden keren per maand per actieve gebruiker). |
| Gebruiker | Alle trainende gebruikers. |
| User story | Als sporter wil ik gewicht, reps en RPE invoeren met zo min mogelijk tikken, zodat loggen nooit een reden wordt om te stoppen met bijhouden. |
| Navigatie | Geen eigen navigatie — leeft volledig binnen de Workout Card. |
| Header | N.v.t. (component, geen scherm). |
| Content | Gewicht-stepper, reps-stepper, RPE-stepper (verticaal, bestaand patroon), opslaan-knop. |
| Cards | Leeft binnen de Workout Card (Hoofdstuk 5, Deel 11). |
| Componenten | Stepper ×3 (gewicht/reps/RPE), Button (opslaan). |
| CTA's | "Opslaan" (impliciet via vinkje-icoon, bestaand patroon). |
| States | Leeg (nieuwe set), vooringevuld (op basis van vorige sessie), opgeslagen, foutstaat. |
| Empty state | N.v.t. — velden zijn vooraf gevuld met een zinvolle default (vorige sessie-waarde of eerste-keer-suggestie). |
| Loading state | Geen zichtbare loading — optimistisch bevestigd. |
| Error state | Rode rand + "opnieuw proberen" bij mislukte synchronisatie, invoer blijft behouden. |
| Offline gedrag | Volledig functioneel, direct lokaal bevestigd, synchronisatie op de achtergrond. |
| AI-gedrag | N.v.t. direct op dit component — de rusttimer-suggestie die volgt (3.5) is wel RPE-gekoppeld. |
| Haptics | Zeer lichte tik per stepper-increment (Hoofdstuk 4, Micro-interactie #2-4), sterkere bevestigende tik bij opslaan. |
| Animaties | Increment-pulse 80ms; opslaan-bevestiging 100ms. |
| Accessibility | Stepper-knoppen minimaal 44×44px met ruime tussenruimte (Golden Rule UI113/UX-Checklist #113). |
| Dark mode | Hoog contrast tussen stepper-cijfers en achtergrond, essentieel voor leesbaarheid tijdens training. |
| Business rules | Dubbele tik op opslaan wordt genegeerd binnen 500ms (dubbel-klik-bescherming); increment-waarden gekoppeld aan apparatuurtype waar beschikbaar. |
| Acceptatiecriteria | Twee tikken van invoer tot bevestigde opslag; bevestiging binnen 100ms zichtbaar (optimistisch). |
| UX-regels | Hoofdstuk 3, UX5, UX20-21; Hoofdstuk 4, Flow 5. |
| Golden Rules | Product Constitution XIX, VII. |
| Mogelijke uitbreidingen | Spraakinvoer voor gewicht/reps als toegankelijkheids- en snelheidsoptie tijdens training (handen vrij tijdens het optillen van gewichten). |


### 3.5 Rusttimer 🟡

| Veld | Specificatie |
|---|---|
| Doel | Consistente, passende rust tussen sets beheren zonder handmatige actie (Hoofdstuk 4, Scherm 12, Flow 7). |
| Gebruiker | Alle trainende gebruikers. |
| User story | Als sporter wil ik dat mijn rust automatisch en passend wordt beheerd, zodat ik me tijdens rust kan focussen op herstel, niet op een klok. |
| Navigatie | Verschijnt als compacte balk onderaan het trainingsscherm; uitklapbaar tot volledige weergave via tik. |
| Header | Geen apart scherm-header — leeft als overlay-component. |
| Content | Aftellende tijd (groot, Statistic-stijl), RPE-gebaseerde toelichting, snelkeuze-presets bij handmatige start. |
| Cards | Compacte balk (niveau 2 elevatie) of volledige bottom sheet bij uitklappen (Hoofdstuk 5, Bottom Sheets). |
| Componenten | Countdown-component, "+30 sec"/"overslaan"-knoppen. |
| CTA's | "+30 sec" (secundair), "Overslaan" (tekst-knop). |
| States | Actief aftellend, gepauzeerd (bij sessie-pauze), afgelopen. |
| Empty state | N.v.t. |
| Loading state | N.v.t. (lokale timer, geen netwerkafhankelijkheid). |
| Error state | N.v.t. |
| Offline gedrag | Volledig functioneel offline (lokale timer-logica). |
| AI-gedrag | Suggestieduur gebaseerd op RPE van de zojuist voltooide set, met korte toelichting (Golden Rule UX17). |
| Haptics | Onderscheidende trilling bij afloop (Hoofdstuk 4, Micro-interactie #15). |
| Animaties | Balk verschijnt van onderaf (`motion-standard`); kleur verschuift naar waarschuwend geel bij 30 sec resterend, naar teal bij afloop. |
| Accessibility | Countdown ook auditief/haptisch aangekondigd bij einde, niet uitsluitend visueel (Hoofdstuk 4, Deel 10). |
| Dark mode | Hoge leesbaarheid van de countdown-cijfers vereist, gezien vaak op afstand bekeken tijdens rust. |
| Business rules | Start automatisch na elke opgeslagen set, tenzij de gebruiker dit per sessie heeft uitgeschakeld. |
| Acceptatiecriteria | Timer start zonder gebruikersactie; duur aanpassen kost maximaal één tik; einde op minimaal twee zintuiglijke manieren aangekondigd. |
| UX-regels | Hoofdstuk 4, Deel 4 (Workout Experience Principles: hoogste-impact quick win). |
| Golden Rules | Product Constitution IV (rusttimer automatisch met RPE-suggestie). |
| Mogelijke uitbreidingen | Geluidssignaal-opties (stilte/zacht/duidelijk) instelbaar per gebruiker; automatische aanpassing van de suggestieduur op basis van langetermijn-hersteldata. |

### 3.6 Plate Calculator 🟢

| Veld | Specificatie |
|---|---|
| Doel | Exact tonen welke schijven aan de stang moeten voor een gewenst gewicht (Hoofdstuk 4, Scherm 13). |
| Gebruiker | Alle gebruikers die met een langhalter trainen. |
| User story | Als sporter wil ik direct zien welke schijven ik moet pakken, zodat ik geen tijd verlies aan rekenen tussen sets. |
| Navigatie | Bereikbaar via snelkoppeling vanuit het trainingsscherm zonder schermwissel (bottom sheet). |
| Header | "Plate Calculator" (Title) binnen de sheet. |
| Content | Doelgewicht-invoer, stang-gewichtkeuze, visuele schijfweergave per kant. |
| Cards | Leeft binnen een Bottom Sheet (Hoofdstuk 5, Deel 11). |
| Componenten | Stepper (doelgewicht), Segment control (stang-gewicht), visuele schijf-iconen. |
| CTA's | "Sluiten". |
| States | Berekend (standaard), niet-haalbaar-gewicht. |
| Empty state | N.v.t. |
| Loading state | N.v.t. (lokale berekening). |
| Error state | Bij een niet haalbaar gewicht met beschikbare schijven: melding met de dichtstbijzijnde haalbare optie (Hoofdstuk 4, Deel 3 Scherm 13). |
| Offline gedrag | Volledig functioneel offline. |
| AI-gedrag | N.v.t. |
| Haptics | Lichte tik bij elke stepper-increment. |
| Animaties | Directe herberekening (<100ms) zonder animatie-vertraging. |
| Accessibility | Schijfweergave heeft een tekstuele lijst als alternatief. |
| Dark mode | Schijfkleuren behouden hun fysieke kleurcodering (rood/blauw/geel/groen/wit) ook in dark mode voor herkenbaarheid. |
| Business rules | Beschikbare schijven zijn configureerbaar (gym-specifiek in de toekomst, Fase 4). |
| Acceptatiecriteria | Berekening verschijnt direct (binnen 100ms) na wijziging van het doelgewicht. |
| UX-regels | Hoofdstuk 4, Scherm 13. |
| Golden Rules | Product Constitution XIX (onderdeel van de kernflow, snelheid vereist). |
| Mogelijke uitbreidingen | Gym-specifieke schijveninventaris (indien een box een beperkte schijvenset heeft) gekoppeld aan het gym-profiel. |


---

## Deel 4 — AI, Programma & Coaching

### 4.1 Programmagenerator 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een meerweeks, gepersonaliseerd trainingsprogramma genereren met afgedwongen periodisering (Hoofdstuk 4, Scherm 5, Flow 9-10). |
| Gebruiker | Gebruikers met een concreet doel op de kalender (Persona Ruud, Daan, Sanne). |
| User story | Als sporter met een wedstrijd of doel op de kalender wil ik een programma dat daar structureel naartoe werkt, zodat ik niet zelf hoef te periodiseren. |
| Navigatie | Vanuit Trainingsschema ("Programma"-kaart) of Dashboard-doorverwijzing. |
| Header | "Programma genereren" (Title), annuleer-knop. |
| Content | Formulier: naam, doel, sportrichting, duur (weken), dagen per week, duur per training, afwijkende dagen, planningsvoorkeur. |
| Cards | Eén formulierkaart voor generatie-parameters; per-week-voortgangskaarten tijdens generatie. |
| Componenten | Forms, Stepper (duur/dagen), Dropdown (sportrichting), Button (AI genereren). |
| CTA's | "AI genereren" (primair), "Annuleren" (tekst-knop). |
| States | Formulier invullen, genereren (per week), voltooid, mislukt (per week). |
| Empty state | Geen actief programma: CTA "Genereer je eerste programma" met korte waardepropositie (Hoofdstuk 4, Deel 8). |
| Loading state | Voortgang expliciet per week getoond, niet als één ondoorzichtige balk (Hoofdstuk 4, Scherm 5) — noodzakelijk vanwege de bestaande Netlify-timeoutbeperking die per-week-generatie vereist. |
| Error state | Bij mislukte generatie van één week: alleen die week opnieuw proberen, niet het hele programma herstarten. |
| Offline gedrag | Genereren vereist een verbinding; parameters kunnen offline ingevuld worden, generatie start zodra verbinding beschikbaar is. |
| AI-gedrag | Elk gegenereerd blok toont kort de periodiseringslogica ("week 3: kracht-fase, omdat…") — Product Principle P3 toegepast op programmaniveau. |
| Haptics | Lichte tik per voltooide week tijdens generatie. |
| Animaties | Weekkaart vult in met lichte fade-in per voltooide week (Hoofdstuk 4, Micro-interactie #60). |
| Accessibility | Formuliervelden met labels; generatie-voortgang aangekondigd voor schermlezers per voltooide week. |
| Dark mode | Formulier en voortgangskaarten volgen het standaardpatroon. |
| Business rules | Periodisering is afgedwongen in code, niet enkel een AI-suggestie (bestaand, bindend gedrag); elk blok wordt gecontroleerd op daadwerkelijk gevulde inhoud vóór het als compleet geldt (Product Principle P10). |
| Acceptatiecriteria | Contentcheck bevestigt gevulde weekinhoud; formulier bevat nooit meer dan zeven actieve velden zonder groepering. |
| UX-regels | Hoofdstuk 4, Scherm 5, Flow 9-10. |
| Golden Rules | Product Constitution X (volledige CRUD- en contentcheck). |
| Mogelijke uitbreidingen | Automatische koppeling aan een specifieke wedstrijddatum (HYROX, powerlifting-meet) met een aftellende periodisering die zichtbaar naar de peakweek toewerkt. |

### 4.2 AI Coach (advies-scherm) 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een concreet, uitlegbaar trainingsadvies presenteren vóór het starten van een sessie (Hoofdstuk 2/4, Customer Journey Fase 4). |
| Gebruiker | Alle actieve gebruikers, elke sessie waar een check-in aan voorafgaat. |
| User story | Als sporter wil ik vóór het trainen een concreet, onderbouwd advies zien, zodat ik weloverwogen kan beslissen hoe ik vandaag train. |
| Navigatie | Verschijnt automatisch na de ochtend-check-in, vóór het trainingsscherm. |
| Header | "Coach-advies" (Title), sluiten/overslaan-optie. |
| Content | Doel/dagcontext bovenaan, uitleg van de huidige toestand (spiervermoeidheid, herstelpercentage per spiergroep), concreet voorstel. |
| Cards | AI Card (Hoofdstuk 5, Deel 11) als hoofdcontainer, met een Recovery Card-sectie voor de spierherstel-percentages. |
| Componenten | AI Card, Recovery-mini-visualisatie, twee gelijkwaardige knoppen. |
| CTA's | "Nee, gewoon starten" (secundair, gelijkwaardig) en "Pas aan en start" (primair) — bewust naast elkaar, nooit met een dominantere styling voor één optie (Product Principle P1). |
| States | Advies getoond, advies opgevolgd, advies genegeerd. |
| Empty state | N.v.t. (verschijnt alleen wanneer er voldoende data is voor een advies). |
| Loading state | "Aan het nadenken"-status (drie puntjes) tijdens het genereren van het advies. |
| Error state | Bij AI niet beschikbaar: neutrale melding, training kan zonder advies gestart worden (Hoofdstuk 4, Deel 9). |
| Offline gedrag | Advies vereist een verbinding; bij offline-start: melding + directe optie om zonder advies te beginnen. |
| AI-gedrag | Kernscherm van de uitlegbaarheidsbelofte — toont expliciet welke data (HRV, slaap, spierherstel) en welke redenering tot dit advies leiden. |
| Haptics | Lichte tik bij elke knopkeuze. |
| Animaties | Kaart verschijnt met lichte fade-in; geen overshoot (dit is een neutraal informatiemoment, geen viering). |
| Accessibility | Berichttype en databasis ook tekstueel voorgelezen voor schermlezers. |
| Dark mode | Petrol-achtergrond met wit tekstcontrast (Hoofdstuk 5, AI Cards). |
| Business rules | Beide knoppen zijn te allen tijde gelijkwaardig bereikbaar — de AI beslist nooit, adviseert enkel (Product Constitution I). |
| Acceptatiecriteria | Advies toont minimaal één concrete dataverwijzing; beide vervolgopties even eenvoudig bereikbaar. |
| UX-regels | Hoofdstuk 3, UX24-25; Hoofdstuk 4, Flow 8. |
| Golden Rules | Product Constitution I, III, V. |
| Mogelijke uitbreidingen | Vergelijking met eerdere, vergelijkbare dagfactor-situaties ("de laatste keer dat je dagfactor zo laag was, herstelde je sneller door het advies op te volgen"). |

### 4.3 Coach Chat 🟢

| Veld | Specificatie |
|---|---|
| Doel | Vrije vragen stellen aan en doorlopend advies ontvangen van de AI-coach (Hoofdstuk 4, Scherm 6, Flow 8). |
| Gebruiker | Alle gebruikers, met name bij twijfel over training of herstel. |
| User story | Als sporter wil ik op elk moment een vraag aan mijn coach kunnen stellen, zodat ik niet hoef te wachten tot de volgende geplande check-in. |
| Navigatie | Derde tab van de bottom-navigatie ("Coach"). |
| Header | "Coach" (Headline), geen verdere acties nodig in de header zelf. |
| Content | Actief gesprek, laatste coach-advies uitgelicht bovenaan indien relevant, geschiedenis eronder chronologisch. |
| Cards | AI Cards per bericht, visueel onderscheiden per type (vraag/advies/waarschuwing, Golden Rule UX24). |
| Componenten | Tekstinvoerveld, verzendknop, quick-reply-chips (voorbeeldvragen bij lege geschiedenis). |
| CTA's | "Versturen" (impliciet via pijl-icoon). |
| States | Lege geschiedenis, actief gesprek, "aan het nadenken", foutstaat. |
| Empty state | Korte introductie van wat de coach kan, met twee à drie voorbeeldvragen als snelle start (Hoofdstuk 4, Scherm 6). |
| Loading state | Zichtbare "aan het nadenken"-status, nooit een onverklaarde stilte (Golden Rule UX26). |
| Error state | "De coach is momenteel niet bereikbaar" met "opnieuw proberen" (Hoofdstuk 4, Deel 9). |
| Offline gedrag | Geschiedenis blijft leesbaar offline; nieuwe berichten vereisen een verbinding, met duidelijke melding indien niet beschikbaar. |
| AI-gedrag | Elk antwoord toont expliciet welke data is gebruikt; visueel onderscheid tussen berichttypen. |
| Haptics | Lichte tik bij versturen. |
| Animaties | Bericht schuift in vanaf rechts (eigen berichten) of links (coach-berichten); AI-antwoord verschijnt typerend op leessnelheid. |
| Accessibility | Berichten voorleesbaar in logische volgorde; berichttype ook tekstueel aangekondigd. |
| Dark mode | Coach-berichten in petrol, eigen berichten in een neutrale, duidelijk onderscheiden tint. |
| Business rules | Chatgeschiedenis blijft herleidbaar naar de context van dat moment (datum, gekoppelde trainingssessie indien relevant). |
| Acceptatiecriteria | Elk antwoord bevat minimaal één concrete dataverwijzing; laadstatus zichtbaar binnen 300ms na versturen. |
| UX-regels | Hoofdstuk 4, Scherm 6, Deel 5 (AI Design Principles). |
| Golden Rules | Product Constitution I, III, V, XX (verbod op manipulatieve AI-motivatie). |
| Mogelijke uitbreidingen | Gespreksonderwerpen categoriseren (herstel/techniek/planning) voor snellere terugvindbaarheid in lange geschiedenissen. |


---

## Deel 5 — Herstel & Lichaam

### 5.1 Herstel (spierherstel-heatmap) 🟢

| Veld | Specificatie |
|---|---|
| Doel | Visueel, per spiergroep, de actuele hersteltoestand tonen (Hoofdstuk 4, Scherm 8). |
| Gebruiker | Alle actieve gebruikers, dagelijks relevant; met name Persona Ruud en Marieke. |
| User story | Als sporter wil ik in één oogopslag zien welke spiergroepen belast/hersteld zijn, zodat ik weloverwogen kan trainen zonder te gokken. |
| Navigatie | Bereikbaar vanuit Dashboard (mini-versie) en Stats-tab (volledige versie); geen eigen bottom-navigatie-item. |
| Header | "Herstel" (Title), weergave-toggle (voor-/achteraanzicht indien van toepassing). |
| Content | Lichaamsvisualisatie primair, tekstuele lijst per spiergroep met percentage secundair. |
| Cards | Recovery Card (Hoofdstuk 5, Deel 11) als hoofdcontainer. |
| Componenten | SVG-lichaamsvisualisatie, percentage-lijst, weergave-toggle. |
| CTA's | Tik op een spiergroep voor detail; geen aparte primaire CTA nodig op dit informatieve scherm. |
| States | Gevuld, leeg (nieuwe gebruiker), laden, foutstaat. |
| Empty state | Neutrale uitgangsstaat met korte uitleg wat de heatmap gaat tonen (Hoofdstuk 4, Deel 8). |
| Loading state | Korte laadanimatie bij het (her)laden van de SVG-visualisatie. |
| Error state | Fallback naar tekstuele lijst per spiergroep bij laadfout van de visualisatie. |
| Offline gedrag | Laatst bekende hersteltoestand blijft zichtbaar met offline-indicator. |
| AI-gedrag | Tik op een niet-herstelde groep kan doorverwijzen naar een AI-suggestie voor alternatieve belasting. |
| Haptics | Lichte tik bij spiergroep-selectie. |
| Animaties | Kleuren updaten met een vloeiende overgang (`motion-standard`) bij het laden van nieuwe data, geen abrupte kleursprong. |
| Accessibility | Elke spiergroep heeft een tekstueel percentage naast de kleurcodering (verplicht, kleurenblindheid). |
| Dark mode | Visualisatie behoudt de vijfpunts-heatmapkleuren ongewijzigd (Hoofdstuk 5, Deel 3) — deze kleuren zijn al functioneel, niet louter decoratief, en blijven daarom identiek in beide modi. |
| Business rules | Herstelberekening weegt RPE en tijd sinds laatste training (bestaand, bindend rekenmodel); nooit geframed als schuldgevoel-opwekkend (Product Constitution II). |
| Acceptatiecriteria | Hersteltoestand van elke hoofdspiergroep zichtbaar zonder scroll; bereikbaar binnen één tik vanaf Dashboard. |
| UX-regels | Hoofdstuk 4, Scherm 8, Flow 13. |
| Golden Rules | Product Constitution II, XIV (kleur nooit enige informatiedrager). |
| Mogelijke uitbreidingen | Historische heatmap-tijdlijn (herstelpatroon over de afgelopen maand per spiergroep) voor de meer data-gedreven gebruiker. |

### 5.2 Anatomie 🔴

| Veld | Specificatie |
|---|---|
| Doel | Een educatief, verdiepend aanzicht van spiergroepen bieden — welke oefeningen welke spieren trainen — los van actuele hersteldata (onderscheid met 5.1: dit scherm is referentie/educatie, geen statusweergave). |
| Gebruiker | Primair Persona Fleur (beginnende gebruiker die spiergroepnamen en -locaties nog leert), secundair alle gebruikers bij het kiezen van een nieuwe oefening. |
| User story | Als beginnende sporter wil ik kunnen opzoeken welke spieren een oefening precies traint, zodat ik begrijp waarom een oefening in mijn schema staat. |
| Navigatie | Bereikbaar vanuit een oefeningdetail ("Welke spieren?"-link) of vanuit de oefeningbibliotheek als filterhulpmiddel. |
| Header | "Anatomie" (Title), terugknop. |
| Content | Zelfde lichaamsvisualisatie-basis als 5.1, maar in educatieve modus: tik op een spiergroep toont de naam, een korte functieomschrijving, en een lijst van oefeningen die deze spiergroep trainen. |
| Cards | Exercise Cards in de resultatenlijst per geselecteerde spiergroep. |
| Componenten | SVG-lichaamsvisualisatie (educatieve variant, neutrale kleuren i.p.v. hersteldata-kleuren), Exercise Card-lijst. |
| CTA's | "Bekijk oefeningen" per geselecteerde spiergroep. |
| States | Geen selectie, spiergroep geselecteerd. |
| Empty state | N.v.t. — de visualisatie is altijd volledig zichtbaar. |
| Loading state | Skeleton bij het laden van de gekoppelde oefeningenlijst. |
| Error state | "Kon oefeningen niet laden" met "opnieuw proberen". |
| Offline gedrag | Volledig functioneel offline (statische anatomische informatie, geen live data). |
| AI-gedrag | N.v.t. — puur educatief/referentiescherm. |
| Haptics | Lichte tik bij spiergroep-selectie. |
| Animaties | Geselecteerde spiergroep licht op met `motion-fast`. |
| Accessibility | Spiergroepnamen en -functies volledig tekstueel beschikbaar, niet uitsluitend via de visualisatie. |
| Dark mode | Neutrale kleurcodering (geen hersteldata-kleuren) blijft duidelijk zichtbaar in beide modi. |
| Business rules | Dit scherm toont nooit hersteldata — uitsluitend statische, educatieve anatomische informatie, om verwarring met 5.1 te voorkomen. |
| Acceptatiecriteria | Elke hoofdspiergroep is selecteerbaar en toont minimaal drie gekoppelde oefeningen. |
| UX-regels | Hoofdstuk 3, Product Principle P16 (complexiteit naar kwetsbaarste gebruiker — Persona Fleur). |
| Golden Rules | Product Constitution XVI (herbruikt de bestaande visualisatie-architectuur, geen nieuwe component). |
| Mogelijke uitbreidingen | Korte, geanimeerde uitleg van de bewegingsfunctie per spiergroep (bijv. "de quadriceps strekt de knie") voor extra educatieve diepgang. |

### 5.3 Spierbelasting 🔴

| Veld | Specificatie |
|---|---|
| Doel | Trainingsvolume per spiergroep over tijd tonen — het ontbrekende analytics-gat uit de Product Audit (sectie 10: "trainingsvolume per spiergroep over tijd"). |
| Gebruiker | Data-gedreven gebruikers (Persona Daan), coaches die spreiding van belasting bij een lid willen beoordelen. |
| User story | Als sporter wil ik zien of ik een spiergroep structureel verwaarloos, zodat ik mijn programmering kan bijsturen vóór het een zwakte wordt. |
| Navigatie | Bereikbaar vanuit Stats-tab, als aanvullend tabblad naast Progressie (7.1) en Persoonlijke records (7.3). |
| Header | "Spierbelasting" (Title), periodeselectie (week/maand/kwartaal via Segment control). |
| Content | Staafdiagram per spiergroep (wekelijks volume), gesorteerd van meest naar minst belast, met een duidelijke duiding bij afwijkende patronen. |
| Cards | Analytics Card per spiergroep-samenvatting. |
| Componenten | Segment control (periode), staafdiagram (Hoofdstuk 5, Deel 12), Analytics Cards. |
| CTA's | "Bekijk oefeningen voor [spiergroep]" bij een onderbelaste groep — directe doorverwijzing naar actie. |
| States | Gevuld, onvoldoende data, laden. |
| Empty state | Onvoldoende trainingshistorie: uitleg wat nodig is om een zinvol beeld te tonen (Golden Rule UX30). |
| Loading state | Skeleton-staafdiagram. |
| Error state | "Kon data niet laden" met "opnieuw proberen". |
| Offline gedrag | Toont laatst berekende data met offline-indicator. |
| AI-gedrag | Automatische duiding bij een significante afwijking ("je beenvolume ligt deze maand 40% onder je gemiddelde") — mogelijk gekoppeld aan een AI Coach-melding. |
| Haptics | Lichte tik bij het selecteren van een spiergroep-staaf. |
| Animaties | Staven tekenen zich in bij eerste laden (`motion-slow`, Hoofdstuk 5 Deel 5), niet herhaald bij elke terugkeer. |
| Accessibility | Elke staaf heeft een tekstuele waarde, niet enkel visuele hoogte. |
| Dark mode | Staafdiagram volgt het standaard grafiekenpatroon (Hoofdstuk 5, Deel 13). |
| Business rules | Volume wordt berekend op basis van sets × reps × gewicht per spiergroep-toewijzing van elke oefening (bestaande data-architectuur, geen nieuwe databron nodig). |
| Acceptatiecriteria | Standaardweergave toont zinvolle informatie zonder enige filter; elke afwijking heeft een tekstuele duiding. |
| UX-regels | Hoofdstuk 4, Deel 9/10 Product Audit-aanbeveling. |
| Golden Rules | Product Constitution XXIII (duiding verplicht bij elke visualisatie). |
| Mogelijke uitbreidingen | Automatische programma-aanpassing-suggestie wanneer een structurele onderbelasting drie weken aanhoudt. |


---

## Deel 6 — Progressie, Data & Planning

### 6.1 Progressie 🟢

| Veld | Specificatie |
|---|---|
| Doel | 1RM-trends en algehele krachtprogressie tonen per oefening (Hoofdstuk 4, Scherm 7). |
| Gebruiker | Data-gedreven gebruikers (Persona Daan), alle gebruikers bij het zoeken naar motivatie via zichtbare vooruitgang. |
| User story | Als sporter wil ik zien hoe mijn kracht zich over tijd ontwikkelt per oefening, zodat ik weet of mijn training werkt. |
| Navigatie | Eerste tabblad binnen de Stats-hoofdtab (vierde item bottom-navigatie). |
| Header | "Progressie" (Headline), sorteer-/filteropties rechtsboven. |
| Content | Lijst van oefeningen met 1RM-waarde en trend-indicator, filterbaar op sport/type/spiergroep (optioneel, nooit verplicht — Golden Rule UX29). |
| Cards | Analytics Card per oefening. |
| Componenten | Filterchips, sorteeroptie, lijngrafiek per geselecteerde oefening. |
| CTA's | Tik op een oefening voor de volledige trendgrafiek. |
| States | Gevuld, gefilterd, onvoldoende data, laden. |
| Empty state | "Nog niet genoeg data voor een trend" met uitleg (drie sessies nodig) — Hoofdstuk 4, Deel 8. |
| Loading state | Skeleton-lijst. |
| Error state | "Kon data niet laden" met "opnieuw proberen", losstaand per grafiek. |
| Offline gedrag | Laatst berekende trends blijven zichtbaar offline. |
| AI-gedrag | Optioneel: korte AI-duiding bij een opvallende trend (bijv. plateau-signaal). |
| Haptics | Lichte tik bij filter-/sorteerselectie. |
| Animaties | Grafiek tekent zich in bij eerste weergave (`motion-slow`). |
| Accessibility | Elke grafiek heeft een tekstuele samenvatting voor schermlezers. |
| Dark mode | Standaard grafiekenpatroon (Hoofdstuk 5, Deel 13). |
| Business rules | Standaardweergave toont zinvolle informatie zonder enige filter (Golden Rule UX29). |
| Acceptatiecriteria | Elke grafiek toont een duiding; filtercombinaties zijn nooit verplicht. |
| UX-regels | Hoofdstuk 4, Scherm 7, Flow 12. |
| Golden Rules | Product Constitution IV. |
| Mogelijke uitbreidingen | ACWR en plateau-detectie geïntegreerd als aparte indicator per oefening (Product Audit sectie 10). |

### 6.2 Statistieken (algemeen overzicht) 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een breder statistisch overzicht bieden dat Progressie (6.1), Spierbelasting (5.3) en Persoonlijke records (6.3) samenbrengt als startpunt van de Stats-hoofdtab. |
| Gebruiker | Alle gebruikers die de Stats-tab openen. |
| User story | Als sporter wil ik één overzichtelijk startpunt hebben van waaruit ik naar specifieke inzichten kan doorklikken, zodat ik niet drie aparte tabs hoef te kennen. |
| Navigatie | De Stats-hoofdtab zelf (vierde bottom-navigatie-item), met sub-tabbladen naar 6.1, 5.3, 6.3. |
| Header | "Stats" (Headline). |
| Content | Korte samenvattende KPI-kaarten bovenaan (totaal volume deze week, actieve streak, laatste PR), gevolgd door toegang tot de drie subschermen. |
| Cards | Maximaal drie KPI-kaarten naast elkaar (Hoofdstuk 5, Deel 12). |
| Componenten | KPI-kaarten, Tabs (sub-navigatie naar Progressie/Spierbelasting/Records). |
| CTA's | Elke sub-tab is zelf de navigatie-CTA. |
| States | Gevuld, laden. |
| Empty state | Nieuwe gebruiker: KPI-kaarten tonen nul-staten met een korte, motiverende uitleg in plaats van lege getallen. |
| Loading state | Skeleton-KPI-kaarten. |
| Error state | Per KPI-kaart losstaand. |
| Offline gedrag | Laatst berekende KPI's blijven zichtbaar offline. |
| AI-gedrag | N.v.t. op dit overzichtsniveau — AI-duiding leeft in de subschermen. |
| Haptics | Lichte tik per KPI-kaart/tab. |
| Animaties | Standaard kaart-fade-in. |
| Accessibility | Tabgroep correct met `role="tablist"`. |
| Dark mode | Standaardpatroon. |
| Business rules | Dit scherm is bewust een dun overzicht — geen dubbele functionaliteit met de subschermen, om verwarrende duplicatie te voorkomen (Product Audit-les over architecturale overlap). |
| Acceptatiecriteria | Elke KPI-kaart is direct zichtbaar zonder scroll; navigatie naar elk subscherm kost één tik. |
| UX-regels | Hoofdstuk 4, Scherm 7. |
| Golden Rules | Product Constitution XVIII (complexiteit gelaagd, geen duplicatie). |
| Mogelijke uitbreidingen | Personaliseerbare KPI-selectie (gebruiker kiest welke drie KPI's bovenaan getoond worden). |


### 6.3 Persoonlijke records (PR-tijdlijn) 🔴

| Veld | Specificatie |
|---|---|
| Doel | Alle behaalde PR's chronologisch tonen als motiverend overzicht (Hoofdstuk 4, Scherm 14 — reeds als toekomstig scherm gespecificeerd, hier herbevestigd binnen de volledige schermbibliotheek). |
| Gebruiker | Alle gebruikers, met name bij langduriger gebruik. |
| User story | Als sporter wil ik al mijn PR's overzichtelijk kunnen terugzien, zodat ik trots kan terugblikken op mijn geleverde prestaties. |
| Navigatie | Derde sub-tabblad binnen Stats, of rechtstreeks vanuit Profiel. |
| Header | "Persoonlijke records" (Title), filter-icoon (per oefening). |
| Content | Chronologische lijst, meest recente PR bovenaan, elk item met oefening, datum en waarde. |
| Cards | Compacte lijst-items (badge-achtige kaarten, Hoofdstuk 5, Badges + Cards-combinatie). |
| Componenten | Filterchip (per oefening), lijstitem-component. |
| CTA's | Tik op een PR voor detail (doorverwijzing naar de bijbehorende sessie). |
| States | Gevuld, leeg, gefilterd, laden. |
| Empty state | Motiverende uitleg wat een PR is en hoe de eerste te behalen (Hoofdstuk 4, Deel 8). |
| Loading state | Skeleton-lijst. |
| Error state | "Opnieuw proberen" bij laadfout. |
| Offline gedrag | Volledige lijst blijft beschikbaar offline (lokaal gecachede data). |
| AI-gedrag | N.v.t. — puur registratief scherm. |
| Haptics | Lichte tik per item. |
| Animaties | Staggered fade-in bij laden (lichte, opeenvolgende verschijning per item, `motion-standard`). |
| Accessibility | Lijst navigeerbaar via schermlezer met duidelijke datum/waarde-aankondiging per item. |
| Dark mode | Standaardpatroon, PR-badges blijven teal in beide modi. |
| Business rules | Een PR wordt automatisch gedetecteerd bij het loggen (bestaande logica), dit scherm is uitsluitend een weergave, geen aparte registratiestap. |
| Acceptatiecriteria | Elke PR ooit behaald is terug te vinden binnen twee tikken vanaf Stats of Profiel. |
| UX-regels | Hoofdstuk 4, Scherm 14, Flow 14. |
| Golden Rules | Product Constitution XII (PR-viering ingehouden maar oprecht). |
| Mogelijke uitbreidingen | Deelbare PR-kaart (export als afbeelding) voor persoonlijk gebruik buiten de app — geen verplichte sociale koppeling, puur optioneel eigen gebruik. |

### 6.4 Kalender 🔴

| Veld | Specificatie |
|---|---|
| Doel | Een maandoverzicht bieden van geplande en uitgevoerde trainingen, inclusief programmablokken. |
| Gebruiker | Alle gebruikers met een lopend programma; coaches die de planning van een lid willen overzien (toekomstig). |
| User story | Als sporter wil ik in kalendervorm zien welke trainingen gepland en uitgevoerd zijn, zodat ik mijn consistentie in de tijd kan overzien. |
| Navigatie | Bereikbaar vanuit Programma-overzicht en vanuit Profiel. |
| Header | "Kalender" (Title), maand-navigatiepijlen. |
| Content | Maandraster met dagen als kleine cirkels (Hoofdstuk 5, Deel 12: Kalenders), gevuld bij uitgevoerde training, gerande cirkel bij gepland-maar-gemist. |
| Cards | Detailkaart onderaan bij selectie van een specifieke dag. |
| Componenten | Kalenderraster, dag-detail-kaart. |
| CTA's | Tik op een dag toont detail; "Start training" indien de geselecteerde dag vandaag is met een geplande training. |
| States | Gevuld, leeg (geen programma), laden. |
| Empty state | Geen lopend programma: CTA naar Programmagenerator (4.1). |
| Loading state | Skeleton-kalenderraster. |
| Error state | "Kon kalenderdata niet laden" met "opnieuw proberen". |
| Offline gedrag | Toont laatst gesynchroniseerde planning offline. |
| AI-gedrag | N.v.t. direct — gekoppeld aan de programma-logica van 4.1. |
| Haptics | Lichte tik per dagselectie. |
| Animaties | Maandwissel met horizontale slide (`motion-standard`). |
| Accessibility | Elke dag aangekondigd met status (gepland/uitgevoerd/gemist) voor schermlezers, niet enkel via cirkelvulling. |
| Dark mode | Kalendercirkels behouden de standaard semantische kleuren (Hoofdstuk 5, Deel 3). |
| Business rules | Een gemiste geplande training beïnvloedt nooit automatisch een streak op een schuldgevoel-opwekkende manier (Product Constitution XIX-verwant motivatieprincipe, Hoofdstuk 3 Deel 6). |
| Acceptatiecriteria | Huidige maand toont direct de status van elke dag zonder verdere interactie. |
| UX-regels | Hoofdstuk 4, Scherm 5 (verwant), Deel 12 Hoofdstuk 5. |
| Golden Rules | Product Constitution II (rustdag nooit bestraffend weergegeven). |
| Mogelijke uitbreidingen | Synchronisatie met externe agenda-apps (Google Calendar) voor gymklas-roosters (Fase 3-4, Team-context). |


---

## Deel 7 — Motivatie, Gemeenschap & Gym

### 7.1 Doelen 🔴

| Veld | Specificatie |
|---|---|
| Doel | Week- en maanddoelen instellen en volgen, als laagdrempelige motivatielaag (Product Audit, sectie 11; Hoofdstuk 3, Deel 6). |
| Gebruiker | Alle gebruikers die behoefte hebben aan concrete, kortetermijn-focus naast het lange-termijnprogramma. |
| User story | Als sporter wil ik een concreet weekdoel kunnen instellen, zodat mijn motivatie niet uitsluitend afhangt van het grotere, verdere programmadoel. |
| Navigatie | Bereikbaar vanuit Profiel of als kaart op het Dashboard (weekvoortgang, zie 2.1). |
| Header | "Doelen" (Title), "+ Nieuw doel"-icoon. |
| Content | Actieve doelen (week/maand) met voortgangsbalk, afgeronde doelen als geschiedenis. |
| Cards | Progress-kaarten per doel (Hoofdstuk 5, Progress-component). |
| Componenten | Progress-balk, Forms (nieuw doel instellen), Button. |
| CTA's | "+ Nieuw doel" (FAB of kaart-CTA), "Doel aanpassen". |
| States | Actieve doelen, afgeronde doelen, geen doelen ingesteld. |
| Empty state | Uitleg wat een doel toevoegt, met een voorgestelde eerste doel op basis van huidige trainingsfrequentie (AI-suggestie, optioneel). |
| Loading state | Skeleton-kaarten. |
| Error state | "Kon doelen niet laden" met "opnieuw proberen". |
| Offline gedrag | Voortgang wordt lokaal bijgehouden en bij verbinding gesynchroniseerd. |
| AI-gedrag | Optioneel: de AI-coach kan een doel voorstellen met onderbouwing ("gebaseerd op je gemiddelde van de afgelopen 4 weken") — nooit eenzijdig opgelegd (Golden Rule uit Hoofdstuk 3, Deel 6). |
| Haptics | Lichte tik bij het instellen; positieve trilling bij het behalen van een doel. |
| Animaties | Voortgangsbalk vult vloeiend mee met daadwerkelijke voortgang (nooit misleidend sneller/langzamer, Hoofdstuk 4 Deel 5). |
| Accessibility | Voortgang ook tekstueel weergegeven ("3 van 4 trainingen"), niet enkel via balk. |
| Dark mode | Standaardpatroon, voortgangsbalk in teal bij normale voortgang. |
| Business rules | Doelen zijn door de gebruiker zelf ingesteld of met onderbouwing voorgesteld — nooit eenzijdig door het systeem opgelegd (Product Constitution XX-verwant). |
| Acceptatiecriteria | Een nieuw doel instellen kost maximaal drie stappen; voortgang wordt real-time bijgewerkt na elke relevante sessie. |
| UX-regels | Hoofdstuk 3, Deel 6 (Behavioural Design). |
| Golden Rules | Product Constitution XVII, XX. |
| Mogelijke uitbreidingen | Gedeelde gym-brede doelen (aansluitend bij 7.3 Gym) als opstap naar het social/competitief-traject (DEC-008). |

### 7.2 Challenges 🔴

| Veld | Specificatie |
|---|---|
| Doel | Optionele, tijdgebonden uitdagingen bieden — laagste-prioriteit gamification-laag, expliciet pas te bouwen na validatie met ART CrossFit (Roadmap, DEC-008). |
| Gebruiker | Gebruikers die vrijwillig extra motivatie via een uitdaging zoeken; nooit verplicht voor de kernervaring. |
| User story | Als sporter wil ik vrijwillig kunnen deelnemen aan een uitdaging, zodat ik af en toe een extra motivatie-impuls heb zonder dat dit verplicht aanvoelt. |
| Navigatie | Bereikbaar vanuit 7.1 Doelen of vanuit Gym (7.4) bij gym-brede uitdagingen. |
| Header | "Challenges" (Title). |
| Content | Lijst van beschikbare uitdagingen (tijdgebonden, bijv. "4 weken consistent trainen"), met duidelijke deelnamestatus. |
| Cards | Uitdaging-kaarten met korte omschrijving, duur, en deelnameknop. |
| Componenten | Card, Button ("Doe mee"/"Gestopt"), Progress-indicator bij actieve deelname. |
| CTA's | "Doe mee" (nooit vooraf aangevinkt/verplicht). |
| States | Beschikbaar, actief deelnemend, afgerond, niet deelgenomen. |
| Empty state | Geen actieve uitdagingen: neutrale melding, geen druk om er een te starten. |
| Loading state | Skeleton-kaarten. |
| Error state | "Kon uitdagingen niet laden" met "opnieuw proberen". |
| Offline gedrag | Deelname-status lokaal bijgehouden, gesynchroniseerd bij verbinding. |
| AI-gedrag | N.v.t. direct — uitdagingen zijn systeem-/gym-gedreven, niet AI-gegenereerd. |
| Haptics | Lichte tik bij deelname-bevestiging. |
| Animaties | Standaard kaartpatroon. |
| Accessibility | Deelnamestatus ook tekstueel duidelijk, niet enkel via badge-kleur. |
| Dark mode | Standaardpatroon. |
| Business rules | Nooit standaard ingeschreven — elke deelname is een expliciete, vrijwillige keuze (Product Constitution XX: geen niet-opt-in sociale vergelijking/druk). |
| Acceptatiecriteria | Deelname/uitschrijven kost één tik; geen enkele uitdaging is verplicht zichtbaar als druk-opwekkend element elders in de app. |
| UX-regels | Hoofdstuk 3, Deel 6; Decision Log DEC-008. |
| Golden Rules | Product Constitution XX. |
| Mogelijke uitbreidingen | Vorm (leaderboard/team-uitdaging/individueel) definitief bepalen ná het aangekondigde gesprek met ART CrossFit over de concrete behoefte (Roadmap, expliciet nog niet vastgesteld). |


### 7.3 Team 🟢

| Veld | Specificatie |
|---|---|
| Doel | Ledenlijst, rollen en audit-log binnen een gym beheren (Hoofdstuk 4, Scherm 11). |
| Gebruiker | Coach/manager/owner van een gym (Persona Iris, Tom); regulier lid dat zijn gym-koppeling wil zien. |
| User story | Als coach wil ik een overzicht van mijn gymleden met hun rollen, zodat ik weet wie welke verantwoordelijkheid heeft. |
| Navigatie | Bereikbaar vanuit Profiel. |
| Header | "Team" (Title), tabs: Leden / Wijzigingslog. |
| Content | Ledenlijst met rol per rij; wijzigingslog chronologisch. |
| Cards | Tabel-achtige lijst (Hoofdstuk 5, Tables). |
| Componenten | Tabs, Table, Dropdown (roltoewijzing), coach-PIN-invoer (apart, zie business rules). |
| CTA's | "Nodig lid uit" (bij lege/nieuwe gym), roldropdown per lid. |
| States | Gevuld, leeg (nieuwe gym), laden. |
| Empty state | Uitleg hoe leden uit te nodigen (Hoofdstuk 4, Deel 8). |
| Loading state | Skeleton-lijst. |
| Error state | Duidelijke melding bij mislukte rolwijziging, geen stille no-op (DEC-lessen). |
| Offline gedrag | Ledenlijst blijft zichtbaar (laatst gesynchroniseerd); rolwijzigingen vereisen een verbinding. |
| AI-gedrag | N.v.t. |
| Haptics | Middel-sterke tik bij rolwijziging (impactvolle actie). |
| Animaties | Rolbadge update met korte kleurovergang. |
| Accessibility | Rollentabel navigeerbaar via schermlezer, rij-voor-rij. |
| Dark mode | Standaard Tables-patroon (Hoofdstuk 5, Deel 13). |
| Business rules | Elke rolwijziging vereist bevestiging en verschijnt zichtbaar in het audit-log (bestaand, bindend gedrag); nieuwe leden vereisen e-mailbevestiging vóór koppeling (migratie v334). |
| Acceptatiecriteria | Elke rolwijziging vereist bevestiging; audit-log toont elke wijziging correct. |
| UX-regels | Hoofdstuk 4, Scherm 11. |
| Golden Rules | Product Constitution VII, VIII. |
| Mogelijke uitbreidingen | Bulk-uitnodiging via CSV-import voor grotere gyms bij eerste onboarding van een nieuwe gym-klant (Fase 4). |

### 7.4 Gym 🟡

| Veld | Specificatie |
|---|---|
| Doel | Het gym-profiel tonen — branding, locatie, algemene informatie — als het bredere kader waarbinnen Team (7.3) opereert. |
| Gebruiker | Alle leden van een gym; primair gym owner (Persona Tom) voor beheer. |
| User story | Als lid wil ik zien bij welke gym ik hoor en wat daar actueel speelt, zodat mijn ervaring in de app aansluit bij mijn fysieke trainingsplek. |
| Navigatie | Bereikbaar vanuit Profiel, gekoppeld aan Team (7.3) als sub-navigatie. |
| Header | Gym-naam (met eventuele gym-branding-skin toegepast, Product Constitution XI: Trainingskompas-naam blijft altijd zichtbaar). |
| Content | Gym-locatie, korte beschrijving, ledenaantal, eventuele gym-brede aankondigingen/uitdagingen (koppeling naar 7.2). |
| Cards | Eén profielkaart, eventueel een aankondigingen-kaart. |
| Componenten | Card, koppeling naar Team en Challenges. |
| CTA's | "Bekijk team" (naar 7.3), "Instellingen aanpassen" (uitsluitend zichtbaar voor owner-rol). |
| States | Gekoppeld aan een gym, niet-gekoppeld (standalone atleet). |
| Empty state | Niet-gekoppelde gebruiker: uitleg dat een gym-koppeling optioneel is en wat het toevoegt (nooit verplicht voor de kernervaring — TrainingKompas werkt volledig standalone). |
| Loading state | Skeleton-kaart. |
| Error state | "Kon gym-gegevens niet laden" met "opnieuw proberen". |
| Offline gedrag | Laatst bekende gym-informatie blijft zichtbaar offline. |
| AI-gedrag | N.v.t. |
| Haptics | Lichte tik bij navigatie. |
| Animaties | Standaardpatroon. |
| Accessibility | Gym-branding-kleuren (indien actief) worden gecontroleerd op contrast vóór toepassing (Hoofdstuk 5, UI41). |
| Dark mode | Gym-skin-kleuren moeten zowel light als dark mode ondersteunen — een verplichting bij het activeren van gym-branding (Fase 4-vereiste, hier vastgelegd). |
| Business rules | Gym-branding is een skin bovenop de Trainingskompas-basis, nooit een vervanging (DEC-010, Product Constitution XI). |
| Acceptatiecriteria | De volledige naam "Trainingskompas" blijft zichtbaar, ook met actieve gym-branding. |
| UX-regels | Hoofdstuk 5, Deel 1/2 (merkregels). |
| Golden Rules | Product Constitution XI, Design Constitution wet 48 (Hoofdstuk 5). |
| Mogelijke uitbreidingen | Meerdere vestigingen per gym-eigenaar (Fase 4: "meerdere vestigingen" op de Roadmap); gym-foto's conform Hoofdstuk 5, Deel 10. |


---

## Deel 8 — Account, Instellingen & Systeem

### 8.1 Wearables 🟢

| Veld | Specificatie |
|---|---|
| Doel | HRV/hartslagdata automatisch laten binnenkomen via een gekoppelde wearable (Hoofdstuk 4, Flow 16). |
| Gebruiker | Alle gebruikers die een wearable bezitten (momenteel Fitbit via Google Health API; uitbreiding gepland). |
| User story | Als sporter wil ik mijn wearable koppelen, zodat ik mijn HRV niet elke ochtend handmatig hoef over te typen. |
| Navigatie | Bereikbaar vanuit Profiel. |
| Header | "Wearables" (Title). |
| Content | Koppelingsstatus-kaart, laatste sync-tijdstip, koppel-/loskoppel-knop. |
| Cards | Eén statuskaart per ondersteunde wearable. |
| Componenten | Card, Button (koppelen/loskoppelen), statuslabel. |
| CTA's | "Koppelen" / "Loskoppelen" / "Sync nu". |
| States | Niet gekoppeld, gekoppeld-actief, koppeling-verlopen, synchroniserend. |
| Empty state | Geen wearable gekoppeld: uitleg van de waarde plus koppelknop; handmatige invoer expliciet als volwaardig alternatief genoemd (Hoofdstuk 2, JTBD 29). |
| Loading state | Icoon draait kort tijdens handmatige sync. |
| Error state | Duidelijk onderscheid tussen "tijdelijk probleem" en "koppeling verlopen — opnieuw autoriseren" (Hoofdstuk 4, Deel 9). |
| Offline gedrag | Statuskaart toont laatst bekende staat; koppelen/synchroniseren vereist een verbinding. |
| AI-gedrag | N.v.t. direct — data stroomt door naar de dagfactor-berekening (2.2 Vandaag). |
| Haptics | Positieve trilling bij succesvolle koppeling. |
| Animaties | Statuskaart update met groene indicator bij succes (Hoofdstuk 4, Micro-interactie #54). |
| Accessibility | Statuslabel altijd tekstueel, niet enkel via kleur. |
| Dark mode | Standaardpatroon. |
| Business rules | Proactieve melding minimaal 48 uur vóór tokenverval (Golden Rule UX33); huidige Fitbit-koppeling kent een bekende beperking (Testing-mode Google Cloud-app, wekelijkse tokenvervaldatum) die via deze proactieve melding UX-technisch ondervangen wordt totdat de onderliggende configuratie is opgelost. |
| Acceptatiecriteria | Koppelen kost maximaal drie stappen; gebruiker ontvangt tijdig een melding vóór verval. |
| UX-regels | Hoofdstuk 4, Flow 16, Deel 9. |
| Golden Rules | Product Constitution VIII. |
| Mogelijke uitbreidingen | Apple HealthKit, Google Health Connect, Garmin/Whoop/Oura (reeds op de Roadmap, DEC-010) als aanvullende koppelopties naast Fitbit. |

### 8.2 Meldingen 🔴

| Veld | Specificatie |
|---|---|
| Doel | Functionele, niet-opdringerige notificaties beheren (Product Constitution: notificaties zijn functioneel, nooit activatiegedreven). |
| Gebruiker | Alle gebruikers die notificatievoorkeuren willen beheren. |
| User story | Als sporter wil ik zelf bepalen welke meldingen ik ontvang, zodat de app me alleen stoort wanneer dat functioneel waardevol is. |
| Navigatie | Bereikbaar vanuit Instellingen (8.3). |
| Header | "Meldingen" (Title). |
| Content | Lijst van meldingscategorieën met individuele toggles: geplande training-herinnering, wearable-tokenverval, coach-waarschuwingen (ACWR/plateau), gym-aankondigingen. |
| Cards | Geen kaartcontainer nodig — een lijst met Switches (Hoofdstuk 5, Deel 11) volstaat. |
| Componenten | Switch per categorie, korte toelichting per categorie. |
| CTA's | Geen aparte opslaanknop — elke toggle bevestigt direct (Golden Rule UX20). |
| States | Elke categorie individueel aan/uit. |
| Empty state | N.v.t. |
| Loading state | N.v.t. (lokale/direct opgeslagen instelling). |
| Error state | Bij mislukte synchronisatie van een voorkeur: korte melding, voorkeur blijft lokaal actief tot hersteld. |
| Offline gedrag | Voorkeuren blijven lokaal aanpasbaar, synchronisatie bij verbinding. |
| AI-gedrag | N.v.t. |
| Haptics | Lichte tik per toggle. |
| Animaties | Vloeiende switch-schuifbeweging (150ms). |
| Accessibility | Elke switch met `role="switch"` en `aria-checked`. |
| Dark mode | Standaardpatroon. |
| Business rules | Geen enkele meldingscategorie mag standaard activatiegedreven zijn ("we missen je"-achtige meldingen zijn systeembreed verboden, Product Constitution XX). |
| Acceptatiecriteria | Elke wijziging bevestigt binnen twee seconden; geen enkele meldingscategorie is verplicht aan te laten staan. |
| UX-regels | Hoofdstuk 3, Deel 6 (Behavioural Design), UX-checklist punt 56 (Hoofdstuk 4). |
| Golden Rules | Product Constitution XVII, XX. |
| Mogelijke uitbreidingen | Tijdvenster-instelling per categorie (bijv. geen meldingen na 21:00) voor extra gebruikerscontrole. |


### 8.3 Instellingen 🟢

| Veld | Specificatie |
|---|---|
| Doel | Centrale toegang tot alle configuratiemogelijkheden buiten het atleet-profiel zelf. |
| Gebruiker | Alle gebruikers, incidenteel bezoek. |
| User story | Als gebruiker wil ik één centrale plek hebben om app-brede voorkeuren te beheren, zodat ik niet hoef te zoeken. |
| Navigatie | Bereikbaar vanuit Profiel (instellingen-icoon) of rechtstreeks vanuit Dashboard-header. |
| Header | "Instellingen" (Title), sluitknop. |
| Content | Gegroepeerde secties: Meldingen (8.2), Taal/weergave, Apparatuurbeheer (Beheer-scherm), Toegankelijkheid (haptiek aan/uit, verminderde beweging), Over de app (8.16). |
| Cards | Sectielijst, elk item navigeert door naar een subscherm of toont een directe toggle. |
| Componenten | Lijst-items met chevron (navigatie) of Switch (directe instelling). |
| CTA's | Elk lijst-item is zelf de CTA. |
| States | Gevuld (statisch, geen laadafhankelijkheid van externe data). |
| Empty state | N.v.t. |
| Loading state | N.v.t. |
| Error state | N.v.t. op dit niveau (fouten leven in de subschermen). |
| Offline gedrag | Volledig functioneel offline. |
| AI-gedrag | N.v.t. |
| Haptics | Lichte tik per item. |
| Animaties | Standaard lijstnavigatie. |
| Accessibility | Lijst navigeerbaar met logische schermlezervolgorde. |
| Dark mode | Standaardpatroon. |
| Business rules | Dit scherm bevat uitsluitend navigatie/toggles — geen accountgevoelige acties (die leven in Profiel, 8.4). |
| Acceptatiecriteria | Elke instelling bereikbaar binnen twee tikken vanaf dit scherm. |
| UX-regels | Hoofdstuk 4, Flow 15. |
| Golden Rules | Product Constitution IX. |
| Mogelijke uitbreidingen | Zoekfunctie binnen instellingen zodra het aantal opties door toekomstige features (Fase 3-5) significant groeit. |

### 8.4 Profiel 🟢

| Veld | Specificatie |
|---|---|
| Doel | Persoonlijke gegevens, account- en atleet-profielinstellingen beheren (Hoofdstuk 4, Scherm 10). |
| Gebruiker | Alle gebruikers. |
| User story | Als gebruiker wil ik mijn persoonlijke gegevens en account op één plek kunnen beheren, zonder te verdwalen tussen secties. |
| Navigatie | Vijfde tab van de bottom-navigatie... nee — vierde/vijfde afhankelijk van de bestaande volgorde (Home/Training/Coach/Profiel/Stats, bestaande volgorde behouden). |
| Header | "Profiel" (Headline), "+"-icoon (indien relevant voor snelle acties). |
| Content | Vier duidelijk gescheiden secties: Account, Atleet-profiel, Wearables (link naar 8.1), Data (export/verwijderen, link naar 8.10/8.11). |
| Cards | Eén kaart per sectie. |
| Componenten | Card, Forms (atleet-profiel-bewerking), Button (uitloggen, account verwijderen). |
| CTA's | "Bewerken" per sectie, "Uitloggen", "Account verwijderen" (visueel duidelijk onderscheiden als destructief). |
| States | Gevuld, bewerkmodus per sectie. |
| Empty state | N.v.t. (basisgegevens altijd aanwezig na onboarding). |
| Loading state | Sectiegewijze skeleton. |
| Error state | Per sectie losstaand, zodat een fout in wearable-sync de rest niet blokkeert. |
| Offline gedrag | Basisgegevens blijven zichtbaar offline; wijzigingen gesynchroniseerd bij verbinding. |
| AI-gedrag | N.v.t. direct op dit scherm. |
| Haptics | Lichte tik per sectie-interactie. |
| Animaties | Standaard formulierpatroon. |
| Accessibility | Formuliervelden met labels, foutmeldingen ook voor schermlezers aangekondigd. |
| Dark mode | Standaardpatroon. |
| Business rules | Account verwijderen vereist een expliciete, niet-dubbelzinnige bevestiging (Golden Rule UX32). |
| Acceptatiecriteria | Elke wijziging toont bevestiging binnen twee seconden. |
| UX-regels | Hoofdstuk 4, Scherm 10, Flow 15. |
| Golden Rules | Product Constitution VII, VIII. |
| Mogelijke uitbreidingen | Profielfoto-ondersteuning voor gym-context (herkenbaarheid in Team-ledenlijst, 7.3). |


---

## Deel 9 — Commercieel, Data & Ondersteuning

### 9.1 Abonnement 🔴

| Veld | Specificatie |
|---|---|
| Doel | Betaalde tiers (Atleet/Sportschool, Roadmap Fase 5) tonen en beheren via Mollie-integratie. |
| Gebruiker | Alle gebruikers zodra Fase 5 actief wordt; gym owners voor de Sportschool-tier. |
| User story | Als gebruiker wil ik duidelijk zien wat mijn huidige abonnement inhoudt en wat een upgrade toevoegt, zodat ik een weloverwogen keuze kan maken zonder verrassingen. |
| Navigatie | Bereikbaar vanuit Profiel. |
| Header | "Abonnement" (Title). |
| Content | Huidige tier-status, functieoverzicht per tier (vergelijkingstabel), quota-gebruik (AI-coach, programmagenerator) met 80%-waarschuwing (bestaand ontworpen mechanisme, nog niet gehandhaafd). |
| Cards | Eén kaart per tier in de vergelijking. |
| Componenten | Table (Hoofdstuk 5, Deel 11) voor tier-vergelijking, Progress (quota-gebruik), Button (upgraden). |
| CTA's | "Upgrade naar [tier]" (primair, uitsluitend voor de aanbevolen/volgende tier). |
| States | Gratis/basis, betaald-actief, quota-bijna-bereikt, quota-bereikt. |
| Empty state | N.v.t. |
| Loading state | Skeleton bij het laden van quota-gebruik. |
| Error state | Bij een mislukte betaling: duidelijke melding met herstelactie, nooit een stille afwijzing. |
| Offline gedrag | Toont laatst bekende abonnementsstatus; upgraden vereist een verbinding. |
| AI-gedrag | N.v.t. direct, wel gekoppeld aan AI-coach-quota. |
| Haptics | Lichte tik bij tier-selectie. |
| Animaties | Standaard tabel-/kaartpatroon. |
| Accessibility | Quota-voortgang ook tekstueel weergegeven ("80% van je maandelijkse AI-adviezen gebruikt"). |
| Dark mode | Standaardpatroon. |
| Business rules | Individuele en gym-abonnementen zijn additief (bestaand ontworpen model, Blueprint); geen enkele kernfunctionaliteit (trainingslogging, basis-AI-coach) wordt achter een betaalmuur geplaatst zonder dat dit vooraf in dit Handbook is vastgelegd — het huidige uitgangspunt is dat geavanceerde/metered features (AI-coach-volume, programmagenerator-volume) beperkt worden, niet de kernervaring zelf. |
| Acceptatiecriteria | Quota-gebruik is te allen tijde inzichtelijk; een upgrade kost maximaal drie stappen. |
| UX-regels | Hoofdstuk 3, Deel 6 (geen manipulatieve verkooptechnieken); Legal/financial-toon: feitelijk, geen agressieve verkoopdruk. |
| Golden Rules | Product Constitution XX (geen manipulatieve technieken, ook niet in commerciële context). |
| Mogelijke uitbreidingen | Creditpack-aankoop voor incidenteel extra AI-gebruik zonder volledige tier-upgrade (reeds voorbereid in het bestaande schema: `credit_packs`). |

### 9.2 Backup 🟡

| Veld | Specificatie |
|---|---|
| Doel | Vertrouwen geven dat trainingsdata veilig bewaard wordt, met inzicht in de laatste backup-/synchronisatiestatus. |
| Gebruiker | Alle gebruikers, met name na een periode van offline gebruik. |
| User story | Als gebruiker wil ik weten dat mijn trainingsdata veilig is opgeslagen, zodat ik met vertrouwen kan loggen zonder angst voor dataverlies. |
| Navigatie | Bereikbaar vanuit Profiel of Instellingen. |
| Header | "Backup & synchronisatie" (Title). |
| Content | Laatste succesvolle synchronisatie-tijdstip, status van de offline-wachtrij (indien actief), directe "sync nu"-actie. |
| Cards | Eén statuskaart. |
| Componenten | Card, Button ("Sync nu"), statuslabel. |
| CTA's | "Sync nu". |
| States | Alles gesynchroniseerd, wachtrij actief, synchronisatie mislukt. |
| Empty state | N.v.t. (er is altijd een synchronisatiestatus, ook als "alles up-to-date"). |
| Loading state | Icoon draait tijdens handmatige synchronisatie. |
| Error state | Aantal mislukte items zichtbaar met "opnieuw proberen" per item of in bulk. |
| Offline gedrag | Dit scherm ís in essentie de UX-vertaling van het offline-gedrag zelf (Hoofdstuk 4, Flow 17-18); blijft volledig leesbaar offline. |
| AI-gedrag | N.v.t. |
| Haptics | Lichte tik bij handmatige sync-actie. |
| Animaties | Wachtrij-icoon pulseert tijdens actieve synchronisatie (Hoofdstuk 4, Micro-interactie #44). |
| Accessibility | Synchronisatiestatus opvraagbaar via een expliciet tekstelement, niet enkel via icoonkleur. |
| Dark mode | Standaardpatroon. |
| Business rules | Nooit automatisch overschrijven bij een conflict tussen apparaten zonder gebruikersbevestiging (Product Constitution XIII). |
| Acceptatiecriteria | De gebruiker kan te allen tijde zien of alle data gesynchroniseerd is. |
| UX-regels | Hoofdstuk 4, Flow 18, Deel 9 (Error Recovery — conflict tussen apparaten). |
| Golden Rules | Product Constitution VIII, XIII. |
| Mogelijke uitbreidingen | Automatische periodieke lokale export als extra vangnet naast Supabase-synchronisatie. |


### 9.3 Import/Export 🟢

| Veld | Specificatie |
|---|---|
| Doel | De gebruiker volledige controle geven over zijn eigen data — importeren van een eerder logboek, exporteren voor eigen gebruik elders. |
| Gebruiker | Alle gebruikers; met name relevant bij overstap van een andere app of bij het delen van data met een arts/fysiotherapeut (Persona Marieke). |
| User story | Als gebruiker wil ik mijn trainingsdata kunnen exporteren, zodat ik er ook buiten de app iets mee kan doen en niet vastzit aan het platform. |
| Navigatie | Bereikbaar vanuit Profiel (Data-sectie). |
| Header | "Import & Export" (Title). |
| Content | "Importeren"-sectie (JSON-bestand selecteren), "Exporteren"-sectie (CSV/JSON-download). |
| Cards | Twee kaarten: Import en Export. |
| Componenten | Bestandskiezer, Button ("Kies bestand", "Exporteren"). |
| CTA's | "Kies bestand" (import), "Exporteren" (export). |
| States | Klaar om te importeren/exporteren, bezig, voltooid, mislukt. |
| Empty state | N.v.t. |
| Loading state | Voortgangsindicator tijdens export van grote datasets (niet blokkerend). |
| Error state | Bij een ongeldig importbestand: duidelijke melding wat er mis is (bijv. onjuist formaat), geen silent failure. |
| Offline gedrag | Export van lokaal gecachede data werkt offline; import/export naar Supabase vereist een verbinding. |
| AI-gedrag | N.v.t. |
| Haptics | Lichte tik bij starten van import/export. |
| Animaties | Downloadbevestiging met korte fade-in (Hoofdstuk 4, Micro-interactie #52). |
| Accessibility | Bestandskiezer toegankelijk via toetsenbord/schermlezer. |
| Dark mode | Standaardpatroon. |
| Business rules | Export bevat uitsluitend data van de ingelogde gebruiker (RLS-gegarandeerd); import controleert op duplicaten vóór toevoeging. |
| Acceptatiecriteria | Exportbestand is direct bruikbaar na download; importfouten worden concreet gemeld, niet generiek. |
| UX-regels | Hoofdstuk 2, JTBD 17 (data meenemen naar andere context). |
| Golden Rules | Product Constitution XIV (data blijft van de atleet). |
| Mogelijke uitbreidingen | Directe export naar een gedeeld PDF-rapport voor een fysiotherapeut of arts (Persona Marieke-specifieke behoefte). |

### 9.4 Help 🔴

| Veld | Specificatie |
|---|---|
| Doel | Zelfstandig antwoorden vinden op veelgestelde vragen zonder externe support nodig te hebben. |
| Gebruiker | Alle gebruikers bij twijfel over functionaliteit. |
| User story | Als gebruiker wil ik snel een antwoord vinden op een vraag over de app, zodat ik niet hoef te wachten op een supportreactie voor iets simpels. |
| Navigatie | Bereikbaar vanuit Instellingen of Profiel. |
| Header | "Help" (Title), zoekveld bovenaan. |
| Content | Doorzoekbare lijst met veelgestelde vragen, gegroepeerd per categorie (Trainen, AI-coach, Wearables, Account, Gym). |
| Cards | Uitklapbare vraag-antwoord-items (accordion-patroon). |
| Componenten | Search (Hoofdstuk 5, Deel 11), uitklapbare lijst-items. |
| CTA's | "Contact opnemen" (doorverwijzing naar 9.5 Feedback) onderaan, voor wanneer het antwoord niet gevonden wordt. |
| States | Zoekend, resultaten getoond, geen resultaten. |
| Empty state | Geen zoekresultaat: directe CTA naar Feedback/Contact (Golden Rule UX35). |
| Loading state | N.v.t. (statische content, lokaal beschikbaar). |
| Error state | N.v.t. |
| Offline gedrag | Volledig functioneel offline (statische content). |
| AI-gedrag | Optioneel: zoekvraag kan doorverwezen worden naar de AI-coach indien het een trainingsinhoudelijke vraag betreft in plaats van een app-gebruiksvraag. |
| Haptics | Lichte tik bij het uitklappen van een vraag. |
| Animaties | Uitklappen met `motion-standard`. |
| Accessibility | Elke vraag/antwoord-combinatie correct gestructureerd voor schermlezers. |
| Dark mode | Standaardpatroon. |
| Business rules | Content wordt centraal beheerd en kan buiten een app-release om worden bijgewerkt (contentbeheer, geen harde codekoppeling). |
| Acceptatiecriteria | Zoekresultaten verschijnen binnen 300ms; elke categorie bevat minimaal drie vragen bij lancering. |
| UX-regels | Hoofdstuk 4, Deel 4 (Zoekfunctie). |
| Golden Rules | Product Constitution — geen expliciete wet, wel Design Principle P4 (data/content leidt tot inzicht). |
| Mogelijke uitbreidingen | Contextuele help-suggesties per scherm (bijv. een "?"-icoon op de Programmagenerator dat direct naar de relevante Help-sectie springt). |

### 9.5 Feedback 🔴

| Veld | Specificatie |
|---|---|
| Doel | De gebruiker een laagdrempelige manier geven om problemen te melden of suggesties te doen. |
| Gebruiker | Alle gebruikers. |
| User story | Als gebruiker wil ik eenvoudig feedback kunnen geven, zodat ik het gevoel heb gehoord te worden zonder een ingewikkeld proces te moeten doorlopen. |
| Navigatie | Bereikbaar vanuit Instellingen/Help; ook indirect bereikbaar bij een terugkerende fout ("meld dit probleem"). |
| Header | "Feedback" (Title). |
| Content | Categorie-selectie (bug/suggestie/overig), tekstveld, optionele schermafbeelding-bijlage. |
| Cards | Eén formulierkaart. |
| Componenten | Segment control (categorie), Forms (tekstveld), bestandskiezer (optioneel). |
| CTA's | "Versturen" (primair). |
| States | Leeg, ingevuld, verzonden, mislukt. |
| Empty state | N.v.t. |
| Loading state | Knop toont spinner tijdens verzenden. |
| Error state | "Kon niet verzenden" met "opnieuw proberen", ingevulde tekst blijft behouden. |
| Offline gedrag | Feedback wordt lokaal opgeslagen en verzonden zodra een verbinding beschikbaar is. |
| AI-gedrag | N.v.t. |
| Haptics | Lichte tik bij verzenden; bevestigende trilling bij succesvolle verzending. |
| Animaties | Bevestigingsbanner na verzending. |
| Accessibility | Formuliervelden met labels. |
| Dark mode | Standaardpatroon. |
| Business rules | Feedback wordt gekoppeld aan het account (indien ingelogd) voor eventuele opvolging, maar nooit verplicht identificerend voor anonieme suggesties. |
| Acceptatiecriteria | Verzending bevestigt binnen twee seconden; ingevulde tekst gaat nooit verloren bij een netwerkfout. |
| UX-regels | Hoofdstuk 3, UX36 (foutmeldingen met herstelactie). |
| Golden Rules | Product Constitution VIII. |
| Mogelijke uitbreidingen | Directe koppeling met het bestaande "thumbs-down"-feedbackmechanisme voor specifiek AI-adviezen (contextueel, vanuit de Coach Chat). |


### 9.6 Privacy 🔴

| Veld | Specificatie |
|---|---|
| Doel | Transparant en begrijpelijk uitleggen welke data wordt verzameld, hoe deze wordt gebruikt, en welke controle de gebruiker heeft — Play Store-vereiste (Product Audit, sectie 14) en directe uiting van de datafilosofie (Hoofdstuk 1, sectie 1.10). |
| Gebruiker | Alle gebruikers; verplicht raadpleegbaar vóór/tijdens Registreren (9.3-koppeling met de akkoord-checkbox). |
| User story | Als gebruiker wil ik in begrijpelijke taal weten wat er met mijn gezondheidsdata gebeurt, zodat ik met vertrouwen HRV en lichaamsdata kan invullen. |
| Navigatie | Bereikbaar vanuit Registreren, Instellingen, en Profiel. |
| Header | "Privacy" (Title). |
| Content | Gestructureerde secties: welke data wordt verzameld, waarvoor (AI-advies, herstelberekening), wie er toegang toe heeft (drie-laags model uitgelegd in gewone taal), hoe lang data bewaard wordt, hoe een account/data te verwijderen (link naar 8.4). |
| Cards | Geen kaartcontainer — doorlopende, goed gestructureerde tekst met duidelijke kopjes (Headline/Title-hiërarchie). |
| Componenten | Tekstsecties, ankerlinks naar specifieke onderdelen. |
| CTA's | "Account verwijderen" (link naar 8.4), "Data exporteren" (link naar 9.3). |
| States | Statisch (geen laadafhankelijkheid). |
| Empty state | N.v.t. |
| Loading state | N.v.t. |
| Error state | N.v.t. |
| Offline gedrag | Volledig functioneel offline (statische content). |
| AI-gedrag | Specifieke sectie legt uit hoe de AI-coach data gebruikt en dat berichten server-side verwerkt worden zonder de API-sleutel client-side bloot te stellen (technisch feit, in gebruikersvriendelijke taal vertaald). |
| Haptics | N.v.t. |
| Animaties | N.v.t. — een juridisch/vertrouwensdocument vraagt om rust, geen decoratieve beweging. |
| Accessibility | Correcte kopstructuur voor schermlezer-navigatie tussen secties. |
| Dark mode | Standaard tekstpatroon. |
| Business rules | Inhoud moet exact overeenkomen met de daadwerkelijke dataverwerking (Supabase, Claude-proxy, wearables) — geen generieke template zonder controle (expliciete eis uit de Product Audit, sectie 14). |
| Acceptatiecriteria | Beschikbaar in minimaal Nederlands en Engels; linkt correct vanuit Registreren/Profiel/Instellingen. |
| UX-regels | Product Audit, sectie 14 (Google Play Readiness). |
| Golden Rules | Product Constitution XIV. |
| Mogelijke uitbreidingen | Interactieve "wat gebeurt er met deze specifieke data"-tooltips direct bij relevante invoervelden elders in de app (bijv. bij het conditie-invoerveld). |

### 9.7 Over de app 🔴

| Veld | Specificatie |
|---|---|
| Doel | Kort, merkeigen laten zien wat TrainingKompas is en waar het voor staat — de enige plek in de app waar de volledige merkverhaal-vertelling (Hoofdstuk 1) een zichtbare plek krijgt. |
| Gebruiker | Alle gebruikers, incidenteel bezoek (nieuwsgierigheid, versiecontrole). |
| User story | Als gebruiker wil ik kort kunnen lezen waar TrainingKompas voor staat en welke versie ik gebruik, zodat ik een compleet beeld van het product heb. |
| Navigatie | Bereikbaar vanuit Instellingen. |
| Header | Logo (volledig, kleur-variant) gecentreerd. |
| Content | Tagline ("Gericht trainen. Slimmer worden. Sterker blijven."), korte missieverwoording (aansluitend bij Hoofdstuk 1, sectie 1.1, in toegankelijke taal), versienummer, links naar Privacy (9.6) en Help (9.4). |
| Cards | Geen — een rustig, tekstueel scherm consistent met de ingehouden merktoon. |
| Componenten | Logo, tekstsecties, versielabel. |
| CTA's | "Bekijk privacybeleid", "Naar Help". |
| States | Statisch. |
| Empty state | N.v.t. |
| Loading state | N.v.t. |
| Error state | N.v.t. |
| Offline gedrag | Volledig functioneel offline. |
| AI-gedrag | N.v.t. |
| Haptics | N.v.t. |
| Animaties | Logo verschijnt met lichte fade-in (`motion-standard`) — enige subtiele animatie op dit scherm. |
| Accessibility | Logo met alt-tekst, tekstsecties in logische leesvolgorde. |
| Dark mode | Logo-kleurvariant conform Hoofdstuk 5, Deel 2 (kleur-volledig, past in beide modi). |
| Business rules | Versienummer wordt automatisch bijgewerkt bij elke release (bestaand releaseproces: APP_VER-increment). |
| Acceptatiecriteria | Toont altijd het actuele versienummer; missieverwoording blijft inhoudelijk consistent met Hoofdstuk 1. |
| UX-regels | Hoofdstuk 5, Deel 1 (Visual Identity) volledig toegepast. |
| Golden Rules | Product Constitution XI. |
| Mogelijke uitbreidingen | Korte "wat is er nieuw"-sectie per release, gekoppeld aan het versienummer, om gebruikers te laten zien dat de app actief doorontwikkeld wordt. |


---

## Screen Constitution

De volledige schermbibliotheek hierboven — zevenendertig schermen, van Splash tot Over de app — is geen verzameling losse ontwerpen. Het is één systeem, gebouwd op precies dezelfde vierentwintig velden, precies dezelfde componentspecificaties (Hoofdstuk 5), en precies dezelfde onderliggende principes (Hoofdstuk 1-4). De Screen Constitution legt vast wat elk scherm, ongeacht status (🟢 bestaand, 🟡 gedeeltelijk, 🔴 toekomstig), gemeen moet hebben:

**Elk scherm dient exact één primair doel.** Een scherm dat geen enkelvoudig, in één zin te formuleren doel heeft (zoals het "Doel"-veld in elke specificatie hierboven toont), wordt gesplitst in twee schermen vóórdat het gebouwd wordt.

**Elk scherm is herleidbaar tot een gebruiker uit Hoofdstuk 2.** Geen enkel scherm wordt ontworpen voor een abstracte "gebruiker" — elke specificatie hierboven noemt expliciet welke persona (of welke combinatie van persona's) het scherm dient, en welke behoefte daarmee wordt beantwoord.

**Elk scherm behandelt zijn vijf verplichte state-categorieën als evenwaardig aan de hoofdinhoud.** Een empty state, loading state, error state en offline-gedrag die pas achteraf worden "toegevoegd" nadat de hoofdflow af is, zijn in dit systeem een ontwerpfout — deze vier staten zijn vanaf het eerste ontwerp een verplicht onderdeel van de specificatie, niet een latere aanvulling.

**Elk scherm is uitlegbaar getoetst op AI-gedrag, ook wanneer het antwoord "N.v.t." is.** Het expliciet vaststellen dat een scherm geen AI-interactie heeft, voorkomt dat AI later ongepland en ongetoetst wordt toegevoegd aan een scherm dat daar niet voor ontworpen is.

**Elk scherm respecteert dark mode als evenwaardig, niet als afgeleide modus.** Zoals vastgelegd in Hoofdstuk 5, Deel 13: geen enkel scherm wordt opgeleverd met uitsluitend een light-mode-ontwerp waarna dark mode "later" wordt toegevoegd.

**Elk scherm noemt expliciet zijn eigen Business rules.** Waar functionele logica (bijv. "periodisering is afgedwongen in code") het ontwerp beperkt of stuurt, staat dat met zoveel woorden in de specificatie — een ontwerper mag dit nooit hoeven te raden of elders moeten opzoeken.

**Elk scherm erkent zijn eigen grenzen via "Mogelijke uitbreidingen".** Dit veld is geen wensenlijst maar een bewuste afbakening: alles wat hier staat, is uitdrukkelijk *niet* onderdeel van de huidige, bindende specificatie — een aparte, toekomstige beoordeling is vereist vóór bouw.

---

## Screen Review Checklist

Verplicht te doorlopen bij het opleveren, herzien, of aanpassen van elk scherm uit dit hoofdstuk — vergelijkbaar in functie met de Premium UX Checklist (Hoofdstuk 4) en de Premium Design Checklist (Hoofdstuk 5), hier specifiek gericht op de volledigheid en consistentie van een individuele schermspecificatie.

### Volledigheid (1-12)
1. Zijn alle vierentwintig velden voor dit scherm ingevuld, inclusief expliciete "N.v.t." waar van toepassing?
2. Is het Doel in één zin te formuleren?
3. Is de Gebruiker herleid tot een specifieke persona uit Hoofdstuk 2?
4. Bevat de User story het format "Als … wil ik … zodat …"?
5. Is de Navigatie ondubbelzinnig (waar komt de gebruiker vandaan, waar gaat hij heen)?
6. Zijn Header, Content, Cards en Componenten elk concreet benoemd, niet enkel generiek omschreven?
7. Is er precies één primaire CTA gespecificeerd (Product Principle P7)?
8. Zijn States, Empty state, Loading state en Error state alle vier afzonderlijk beschreven?
9. Is Offline gedrag expliciet vastgelegd, ook als "vereist verbinding"?
10. Is AI-gedrag expliciet vastgelegd, ook als "N.v.t."?
11. Zijn Haptics en Animaties gekoppeld aan specifieke, benoemde tokens (Hoofdstuk 5, Deel 14)?
12. Is Accessibility scherm-specifiek ingevuld, niet enkel een generieke verwijzing?

### Consistentie (13-22)
13. Verwijst Dark mode naar het systeembrede kleursysteem (Hoofdstuk 5, Deel 3/13), zonder losse, nieuwe kleurwaarden?
14. Zijn alle genoemde componenten herleidbaar tot Hoofdstuk 5, Deel 11 (geen ongespecificeerd component)?
15. Zijn de genoemde Golden Rules en Product Constitution-wetten daadwerkelijk van toepassing op dit scherm, niet willekeurig aangehaald?
16. Sluiten de Acceptatiecriteria aantoonbaar aan bij de Business rules?
17. Is de UX-regel-verwijzing herleidbaar tot een concrete sectie in Hoofdstuk 3 of 4?
18. Overlapt dit scherm niet functioneel met een ander scherm zonder dat dit expliciet benoemd is (architecturale-overlap-signalering, Product Principle P9)?
19. Is de statusmarkering (🟢/🟡/🔴) correct en actueel?
20. Zijn "Mogelijke uitbreidingen" duidelijk gescheiden van de bindende specificatie zelf?
21. Is de typografische hiërarchie binnen het scherm consistent met Hoofdstuk 5, Deel 4?
22. Zijn spacing- en radius-waarden (indien genoemd) herleidbaar tot vastgestelde tokens?

### Validatie tegen eerdere hoofdstukken (23-30)
23. Is dit scherm getoetst aan minimaal één principe uit Hoofdstuk 1 (Productvisie)?
24. Is dit scherm getoetst aan de relevante persona-behoeften uit Hoofdstuk 2?
25. Schendt dit scherm geen enkele wet uit de Product Constitution (Hoofdstuk 3)?
26. Schendt dit scherm geen enkele wet uit de UX Constitution (Hoofdstuk 4)?
27. Schendt dit scherm geen enkele wet uit de Design Constitution (Hoofdstuk 5)?
28. Is voor een 🔴-scherm expliciet vermeld op welke Roadmap-fase/Decision Log-vermelding het gebaseerd is?
29. Is voor een 🟡-scherm expliciet vermeld wat er verandert ten opzichte van de huidige (v3.3.25) implementatie?
30. Is dit scherm door minimaal één andere persoon getoetst aan deze checklist vóór het als "definitief" geldt?

---

## Screen Design Laws

Twintig wetten, specifiek op schermniveau, die de Product Constitution (Hoofdstuk 3), UX Constitution (Hoofdstuk 4) en Design Constitution (Hoofdstuk 5) aanvullen — niet vervangen. Bindend voor elke toekomstige sprint die een scherm uit dit hoofdstuk bouwt, wijzigt, of een nieuw scherm toevoegt aan de bibliotheek.

**1.** Elk scherm heeft precies één primair doel en precies één primaire CTA — nooit twee gelijkwaardige concurrerende acties.

**2.** Elk scherm specificeert expliciet zijn empty, loading en error state vóórdat de hoofdflow als compleet geldt — geen enkel scherm wordt opgeleverd met alleen de "happy path" uitgewerkt.

**3.** Elk scherm dat op data wacht toont een skeleton in de uiteindelijke lay-out — nooit een lege ruimte of enkel een spinner.

**4.** Elk scherm blijft, waar functioneel zinvol, bruikbaar zonder internetverbinding — de trainingsflow-schermen (Deel 3) zonder uitzondering.

**5.** Elk scherm met AI-content toont expliciet de gebruikte data en redenering — of legt expliciet vast dat AI hier niet van toepassing is.

**6.** Elk scherm respecteert de bestaande bottom-navigatie-structuur (vijf items, vaste volgorde) — nieuwe schermen krijgen toegang via bestaande tabs of sub-navigatie, nooit via een zesde navigatie-item zonder herziening van dit Handbook.

**7.** Elk nieuw (🔴) scherm is herleidbaar tot een concrete regel, persona-behoefte, of Roadmap-punt uit Hoofdstuk 1-5 — geen scherm wordt toegevoegd op basis van een ongefundeerde aanname.

**8.** Elk scherm dat destructieve acties bevat, gebruikt een gestileerde, merkeigen bevestiging — nooit een native systeemdialoog (herhaling, hier op schermniveau bindend gemaakt).

**9.** Herstelinformatie krijgt op elk scherm waar het samen met prestatie-informatie voorkomt minimaal gelijke visuele prominentie.

**10.** Elk scherm binnen de trainingsflow (Deel 3) kent striktere snelheids- en tik-eisen dan elk ander scherm in de bibliotheek — twee tikken voor kernacties, optimistische UI, automatische rusttimer.

**11.** Elk scherm met motivatie- of gamification-elementen (Doelen, Challenges, PR-weergave) blijft optioneel en niet-manipulatief — nooit verplicht voor de kernervaring.

**12.** Elk scherm toont de merknaam "Trainingskompas" volledig waar de merkidentiteit zichtbaar is, ook onder gym-branding (Gym-scherm, Deel 7).

**13.** Elk scherm dat persoonlijke of gezondheidsdata toont of verzamelt, is getoetst aan het drie-laags zichtbaarheidsmodel (personal/gym/global) en toont nooit gevoelige data aan een rol zonder expliciete toestemming.

**14.** Elk scherm ondersteunt dark mode als volwaardig, gelijktijdig ontworpen alternatief.

**15.** Elk scherm is getoetst op de kwetsbaarste relevante persona in die specifieke flow (Product Principle P16) — een scherm dat alleen voor de meest ervaren gebruiker "werkt", is onvolledig gespecificeerd.

**16.** Elk scherm met een formulier bevat maximaal zeven actieve velden zonder groepering, en markeert verplichte velden vóór het invullen.

**17.** Elk scherm registreert zijn eigen, scherm-specifieke Business rules expliciet — generieke verwijzingen naar "standaardgedrag" zonder concretisering zijn onvoldoende.

**18.** Elk scherm dat overlapt met een bestaand scherm in functie (bijv. Statistieken versus Progressie versus Spierbelasting) legt het onderscheid expliciet vast om architecturale duplicatie te voorkomen.

**19.** Elk scherm doorloopt de volledige Screen Review Checklist vóór het als "definitief" of "klaar voor bouw" geldt.

**20.** Elke afwijking van deze twintig wetten, of van een specifieke schermspecificatie in dit hoofdstuk, wordt expliciet vastgelegd in de Decision Log, met motivatie en impactanalyse — dezelfde bindende werkwijze als de Product Constitution, UX Constitution en Design Constitution voorschrijven.

---

*Einde Hoofdstuk 6. Dit hoofdstuk vormt samen met Hoofdstuk 1 (Productvisie & Filosofie), Hoofdstuk 2 (Doelgroepen, Persona's & Customer Journey), Hoofdstuk 3 (Product Design Principles & Golden Rules), Hoofdstuk 4 (Premium UX & Interaction Design Handbook) en Hoofdstuk 5 (Premium UI Design System & Visual Language) het volledige, praktisch toepasbare fundament van het TrainingKompas Premium Development Handbook. De Screen Review Checklist is vanaf dit moment verplicht onderdeel van elke schermoplevering. Elk volgend hoofdstuk — en elke toekomstige uitbreiding van de schermbibliotheek zelf — wordt tegen de Screen Constitution en de Screen Design Laws hierboven getoetst vóórdat het als goedgekeurd geldt.*
