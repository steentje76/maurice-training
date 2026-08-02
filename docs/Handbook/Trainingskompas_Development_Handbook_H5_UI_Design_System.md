# TrainingKompas Premium Development Handbook

## Hoofdstuk 5 — Premium UI Design System & Visual Language

**Status:** bindend document. Alle toekomstige UI-schermen, componenten, iconen, animaties en designs moeten voldoen aan dit hoofdstuk.
**Voortbouwend op:** Hoofdstuk 1-4 en de Premium Product Audit. De aangeleverde logo- en brand sheet-bestanden gelden vanaf dit hoofdstuk als **definitieve, bindende merkidentiteit** — niet meer als richtlijn maar als bronbestand.
**Karakter:** dit hoofdstuk beschrijft de volledige visuele taal — kleur, typografie, ruimte, elevatie, iconografie, illustratie, fotografie, componenten, datavisualisatie, dark mode, motion en tokens — als één samenhangend systeem, vergelijkbaar in precisie met Material Design 3, Apple Human Interface Guidelines, of het Stripe Design Language.

---

### Bevestiging van de aangeleverde merkidentiteit

De aangeleverde bestanden bevestigen en verscherpen wat Brand Identity (vastgesteld 1 augustus 2026, DEC-010) al beschreef, en worden hier vastgelegd als exacte, definitieve bron:

- **Logo:** een kompas waarvan de naald is opgebouwd uit een gewichtheffer met opgeheven halter — de drie betekenislagen die de brand sheet zelf toont: kompas (richting & focus), gewichtheffersilhouet (kracht & ontwikkeling), naald (doelgericht verbeteren). De naald loopt door tot buiten de cirkel — een bewuste asymmetrie die vooruitgang suggereert, geen statisch symbool.
- **Naam:** "TrainingsKompas" in twee kleurblokken — "Trainings" in donkerblauw/wit, "Kompas" in teal. Dit tweekleurige naampatroon wordt in dit hoofdstuk vastgelegd als verplicht wordmark-gebruik.
- **Tagline:** "Gericht trainen. Slimmer worden. Sterker blijven." — drie korte, parallelle zinnen die exact de drie AI-filosofie-pijlers uit Hoofdstuk 1 weerspiegelen: precisie (Gericht), intelligentie (Slimmer), duurzaamheid (Sterker).
- **Kleurenpalet (bevestigd exact):** `#0B1D2A` (donkerblauw), `#0E3B4A` (petrol), `#00B894` (teal), `#E6EBEF` (lichtgrijs), `#FFFFFF` (wit).
- **Typografie (bevestigd exact):** Poppins Bold voor koppen, Poppins Medium voor body.
- **App-icoon:** het kompas-symbool op een donkerblauw-naar-petrol gradient vierkant met afgeronde hoeken — dit is vanaf dit hoofdstuk de bindende basis voor launcher- en adaptive icons (Deel 2, Deel 17).
- **Splash screen:** donkerblauwe achtergrond, het logo gecentreerd, met een teal bergpad-illustratie die oploopt naar een vlag — een visuele metafoor voor "doelgericht vooruitgang" die in Deel 9 (Illustration Style) wordt uitgebreid naar een systeembreed illustratiemotief.

Elke kleur-, typografie- en componentspecificatie in dit hoofdstuk is direct herleidbaar tot deze bronbestanden. Waar dit hoofdstuk een nieuwe, afgeleide kleur of stijlregel introduceert (bijvoorbeeld semantische kleuren voor waarschuwingen), wordt expliciet aangegeven dat dit een **afgeleide, nieuw vastgestelde toevoeging** is — nooit stilzwijgend als onderdeel van het aangeleverde materiaal gepresenteerd.

---

## Deel 1 — Visual Identity

Acht kwaliteiten die TrainingKompas visueel moet uitstralen, elk met een onderbouwing van waarom de gemaakte ontwerpkeuzes hierbij passen.

### Merkidentiteit

Het logo zelf is de duidelijkste uitspraak: een kompas — richting, betrouwbaarheid, iets dat je nooit in de steek laat — samengevoegd met een gewichtheffer — inspanning, kracht, fysieke discipline. Dit is geen willekeurige combinatie van symbolen; het is de visuele samenvatting van Hoofdstuk 1, sectie 1.1: TrainingKompas combineert de discipline van nauwkeurige trainingslogging met de intelligentie van een coach die richting geeft. Elke toekomstige visuele beslissing wordt getoetst aan de vraag: versterkt dit "richting geven" of "kracht/inspanning", of verzwakt het een van beide?

### Premium uitstraling

Premium wordt gedragen door **beperking, niet door toevoeging** — vijf kleuren in het basispalet, twee lettertype-gewichten, één consistente iconenstijl. Dit sluit direct aan bij Product Principle P6 (Hoofdstuk 3): premium is het zichtbaar maken van onderliggende kwaliteit, nooit decoratie. Een beperkt palet dat overal consistent wordt toegepast, oogt duurder en doordachter dan een breed palet dat per scherm net iets anders wordt ingezet — dit is exact het verschil tussen de huidige, nog niet doorgevoerde huisstijl (Product Audit, sectie 6: Barlow Condensed/cyaan) en de hier vastgelegde definitieve identiteit.

### Sportieve uitstraling

De naald van het kompas is dynamisch — hij doorbreekt de cirkel, staat niet stil op een vaste positie zoals een gewoon kompas. Dit vertaalt zich naar een systeembrede regel: waar decoratieve elementen worden toegevoegd (bijvoorbeeld in illustraties, Deel 9), suggereren ze beweging en richting, nooit statische symmetrie. De hoekige, iets scherpe vormtaal van de kompaspunten (in tegenstelling tot volledig afgeronde vormen) refereert aan precisie-instrumenten, niet aan speelsheid.

### Betrouwbaarheid

Het donkerblauw (`#0B1D2A`) is de dominante kleur in zowel het logo als de brand sheet — een kleur die in vrijwel elk cultureel kleurenonderzoek geassocieerd wordt met vertrouwen, stabiliteit en professionaliteit (vergelijkbaar met de kleurkeuzes van financiële instellingen en gevestigde sportmerken als Garmin). Dit sluit rechtstreeks aan bij de datafilosofie (Hoofdstuk 1, sectie 1.10): een app die HRV en lichaamsdata verwerkt, moet dat vertrouwen ook visueel uitstralen, niet alleen architecturaal waarmaken.

### Rust

Het palet bevat precies één "levendige" kleur (teal `#00B894`) tegenover twee neutrale donkere tinten en twee lichte neutralen. Deze verhouding — overwegend neutraal met één doelbewust accent — is een directe toepassing van Hoofdstuk 1, sectie 1.6 ("Premium betekent rust, geen ruis") en Hoofdstuk 3's principe dat gamification en visuele nadruk laagdrempelig moeten blijven. Rust ontstaat niet door kleurloosheid, maar door een streng gerantsoeneerd gebruik van kleur.

### Intelligentie

Het kompas-symbool zelf communiceert intelligentie via precisie: een gegradueerde, symmetrische cirkelvorm met een berekenende naald, geen organische of willekeurige vormen. Deze visuele precisie wordt in Deel 8 (Icon System) doorgetrokken naar een iconenstijl die eveneens geometrisch en consistent is — nooit handgetekend of grillig, wat "AI-gedreven precisie" zou tegenspreken.

### Motivatie

Motivatie wordt visueel niet gedragen door felle, opzichtige elementen, maar door de opwaartse, doelgerichte compositie van het logo (de naald wijst omhoog/naar buiten) en door de bergpad-met-vlag-metafoor op het splashscreen. Dit is een bewuste keuze die aansluit bij Product Principle P12 (Hoofdstuk 3): motivatie is intrinsiek en ingehouden, geen uitbundig visueel spektakel.

### AI-uitstraling

Waar de AI-coach zichtbaar is (chatinterface, advies-kaarten), wordt de petrol-tint (`#0E3B4A`) als dragende kleur ingezet — donker genoeg om "doordacht" te suggereren, maar duidelijk onderscheiden van het pure donkerblauw van de merkidentiteit zelf, zodat AI-content herkenbaar is als een specifiek onderdeel van de app zonder een volledig los sub-merk te worden (Deel 3, AI-kleurtoepassing).

---

## Deel 2 — Brand Language

### Logogebruik

| Regel | Specificatie |
|---|---|
| Volledig logo (icoon + wordmark) | Standaardgebruik op alle marketing- en onboardingschermen, splash screen, Play Store-listing. |
| Icoon alleen | Toegestaan in de bottom-navigatie-context, favicon, app-icoon, en overige ruimtes onder 120px breedte waar de wordmark niet leesbaar zou zijn. |
| Wordmark alleen (zonder icoon) | Alleen toegestaan in platte tekstcontext (bijv. juridische voettekst, e-mailhandtekening) — nooit als vervanging van het volledige logo in productcontext. |
| Kleurvarianten | Kleur-volledig (standaard), eenkleurig-donker (`#0B1D2A`, voor lichte achtergronden waar teal onvoldoende contrast geeft), eenkleurig-teal (`#00B894`, voor donkere, neutrale achtergronden) — exact de drie varianten uit de brand sheet. |

### Clear space

Minimale vrije ruimte rond het logo (icoon + wordmark samen) is **gelijk aan de hoogte van de kompascirkel in het icoon** aan alle zijden — geen ander UI-element, tekst of rand mag binnen deze zone komen. Voor het icoon alleen (bijv. in de navigatiebalk) geldt een minimale clear space van 25% van de icoonbreedte.

### Minimumgrootte

| Toepassing | Minimumgrootte |
|---|---|
| Volledig logo (digitaal) | 120px breedte |
| Icoon alleen (digitaal) | 24px breedte (favicon-niveau); onder 24px vervalt fijne detaillering, gebruik dan een vereenvoudigde 1-kleur variant |
| Logo in print | 20mm breedte |

### Verboden toepassingen

- Het logo herkleuren buiten de drie vastgestelde varianten (kleur-volledig, eenkleurig-donker, eenkleurig-teal).
- Het icoon en de wordmark loskoppelen en apart herpositioneren binnen dezelfde compositie.
- De verhouding tussen icoon en wordmark uitrekken of vervormen (niet-uniform schalen).
- Een schaduw, gloed, of 3D-effect toevoegen aan het logo bovenop de reeds ingebouwde gradient.
- Het logo plaatsen op een achtergrondafbeelding met onvoldoende contrast zonder een effen kader.
- De tagline vertalen, herformuleren of inkorten in productcontext (alleen in strikt ruimte-beperkte marketing-uitingen, met goedkeuring, mag de tagline wegvallen — nooit gewijzigd worden).
- Het woord "Trainingskompas" splitsen over twee regels op een manier die de twee kleurblokken doorbreekt.

### Achtergronden

| Context | Regel |
|---|---|
| Licht (wit/`#E6EBEF`) | Kleur-volledig logo of eenkleurig-donker variant. |
| Donker (`#0B1D2A`/`#0E3B4A`) | Kleur-volledig logo (zoals in de brand sheet, wit/teal wordmark) of eenkleurig-teal variant. |
| Foto-achtergrond | Alleen met een effen, halftransparant kader (`#0B1D2A` op 80% dekking) direct achter het logo — nooit los op een foto zonder kader. |

### Foto's, illustraties, watermerken

- **Foto's:** zie Deel 10 — nooit als achtergrond direct achter het logo of primaire wordmark zonder kader.
- **Illustraties:** zie Deel 9 — mogen het kompas-motief (richting, pad, naald) hergebruiken in vereenvoudigde vorm, maar nooit het volledige logo als illustratie-element verwerken.
- **Watermerken:** het icoon alleen, op maximaal 8% dekking, alleen toegestaan op exportbare content (bijv. een gedeelde voortgangsgrafiek) — nooit binnen de reguliere productinterface.

### Favicon, launcher icon, Play Store icon, adaptive icon

| Type | Specificatie |
|---|---|
| Favicon | Icoon alleen, 32×32px en 16×16px varianten, vereenvoudigd tot de kernvorm zonder fijne gradient-details onder 16px. |
| Launcher icon (iOS) | Icoon op het volledige donkerblauw-naar-petrol gradient vierkant, geen afgeronde hoeken in het bronbestand (iOS rondt automatisch af), exact zoals aangeleverd in de brand sheet. |
| Adaptive icon (Android) | Voorgrondlaag: het kompas-icoon, gecentreerd binnen de veilige zone (66% van het canvas, conform Android-specificatie). Achtergrondlaag: effen gradient donkerblauw (`#0B1D2A`) naar petrol (`#0E3B4A`). Geen tekst in de voorgrondlaag — deze wordt door het systeem bijgesneden tot een cirkel, rond vierkant, of andere vorm afhankelijk van het toestel. |
| Play Store icon | Identiek aan het launcher icon, 512×512px, geen alpha-transparantie (Play Store-vereiste). |

### Splash screen

Donkerblauwe (`#0B1D2A`) achtergrond, logo verticaal en horizontaal gecentreerd, teal bergpad-met-vlag-illustratie onderaan derde van het scherm (exact zoals aangeleverd) — dit wordt in Deel 9 vastgelegd als het canonieke voorbeeld van de systeembrede illustratiestijl. Laadtijd van het splash screen is nooit kunstmatig verlengd (verboden UX-patroon, Hoofdstuk 4, Deel 1) — het verdwijnt zodra de app daadwerkelijk gereed is.

---

## Deel 3 — Color System

De vijf basiskleuren (`#0B1D2A`, `#0E3B4A`, `#00B894`, `#E6EBEF`, `#FFFFFF`) zijn aangeleverd en bindend. De semantische kleuren hieronder (Success, Warning, Danger, Info) en de uitgebreide toepassingen (Recovery, Performance, Grafieken) zijn een **nieuw vastgestelde, afgeleide uitbreiding** voor dit hoofdstuk — ontworpen om binnen hetzelfde ingehouden, betrouwbare palet te blijven passen in plaats van een nieuwe kleurtaal te introduceren. Waar mogelijk wordt bewust voortgebouwd op kleuren die al in de codebase bestaan (bijvoorbeeld de bestaande `--y`-variabele) om onnodige, niet-onderbouwde nieuwe kleuren te vermijden (Product Principle P9: uitbreiding boven nieuwbouw).

### Kernpalet (aangeleverd, bindend)

| Rol | HEX | RGB | Toepassing | Contrast (op wit) | Contrast (op donkerblauw) | Light mode | Dark mode |
|---|---|---|---|---|---|---|---|
| **Primary** | `#0B1D2A` | 11, 29, 42 | Wordmark-tekst, primaire knoppen op lichte achtergrond, dark mode-achtergrond | ~15,8:1 (uitstekend, AAA) | n.v.t. (is de kleur zelf) | Tekst/knoppen | Achtergrond |
| **Secondary** | `#0E3B4A` | 14, 59, 74 | AI-content-achtergrond, secundaire knoppen, dark mode-surface | ~11,9:1 (AAA) | ~1,3:1 (onvoldoende, niet combineren) | Accentachtergrond | Card-surface |
| **Accent/Success** | `#00B894` | 0, 184, 148 | Primaire CTA-highlight, actieve navigatiestaat, succesbevestiging | ~2,4:1 (onvoldoende voor kleine tekst — alleen grote tekst ≥24px/bold of iconen/vlakken) | ~4,1:1 (voldoende voor grote tekst op donker) | Accent op wit-oppervlak, grote tekst/iconen only | Accent, ruim toepasbaar op donkere ondergrond |
| **Neutraal licht** | `#E6EBEF` | 230, 235, 239 | Achtergrond light mode, dividers, disabled-states | ~1,1:1 t.o.v. wit (bewust subtiel onderscheid) | n.v.t. | Achtergrond/surface-variant | Zelden gebruikt (donkere modus heeft eigen surfacetinten) |
| **Wit** | `#FFFFFF` | 255, 255, 255 | Cards/surface light mode, tekst op donkere achtergronden | — | ~15,8:1 (AAA) | Surface/card | Primaire teksttint |

### Semantische kleuren (nieuw vastgesteld, afgeleid van het bestaande palet)

| Rol | HEX | RGB | Toepassing | Contrast (op wit) | Herkomst |
|---|---|---|---|---|---|
| **Warning** | `#C8A84B` | 200, 168, 75 | Waarschuwingsbanners, ACWR-piekmelding, wearable-tokenverval-melding | ~2,1:1 (alleen icoon/vlak, niet als kleine tekst) | Hergebruik van de bestaande `--y`-variabele uit de huidige codebase — geen nieuwe kleur, bewuste continuïteit (Product Principle P9). |
| **Danger** | `#B3454C` | 179, 69, 76 | Destructieve acties, kritieke foutmeldingen | ~4,7:1 (voldoet AA voor normale tekst) | Bewust gedempte, "ingehouden" roodtint — geen fel alarmrood, conform de merktoon (Hoofdstuk 4, Deel 7: geen felle, choquerende foutkleuren). |
| **Info** | `#0E3B4A` | 14, 59, 74 | Informatieve meldingen, AI-berichten | ~11,9:1 (AAA) | Hergebruik van Secondary — geen aparte kleur nodig, voorkomt paletvervuiling. |

### Achtergrond, surface, cards, navigatie, dialogs

| Element | Light mode | Dark mode |
|---|---|---|
| **Background** (app-achtergrond) | `#E6EBEF` | `#0B1D2A` |
| **Surface** (onder cards) | `#FFFFFF` | `#0E3B4A` |
| **Cards** | `#FFFFFF` met schaduw (Deel 7) | `#0E3B4A` met lichtere randlijn i.p.v. schaduw (schaduw werkt niet zichtbaar op donkere achtergrond) |
| **Navigatie (bottom nav)** | `#FFFFFF`, actieve staat `#00B894` | `#0E3B4A`, actieve staat `#00B894` |
| **Dialogs** | `#FFFFFF` op verdonkerde scrim (`#0B1D2A` op 60% dekking) | `#0E3B4A` op verdonkerde scrim (`#000000` op 70% dekking) |

### AI, Recovery, Performance

| Toepassing | Kleur(en) | Toelichting |
|---|---|---|
| **AI-content** | Achtergrond `#0E3B4A` (donker petrol-blok) met witte tekst; AI-avatar/icoon in `#00B894` | Herkenbaar als "coach spreekt", consistent met Visual Identity Deel 1 (AI-uitstraling). |
| **Recovery (hersteltoestand, niet-gradient gebruik)** | Hersteld: `#00B894` · Gedeeltelijk: `#C8A84B` · Vermoeid: `#B3454C` | Drie-punts semantische schaal, herbruikt de bestaande Warning/Danger/Success-kleuren — geen nieuwe kleurenreeks nodig. |
| **Performance (prestatiecijfers, PR's)** | `#0B1D2A` (cijfers) met `#00B894`-accent bij een verbetering t.o.v. vorige waarde | Prestatie blijft visueel "neutraal ingehouden" totdat een verbetering het accent activeert — voorkomt dat prestatie visueel zwaarder weegt dan herstel (Product Principle P2). |

### Grafieken, charts, heatmaps

| Toepassing | Specificatie |
|---|---|
| **Categorische data-reeksen (max. 5 series in één grafiek)** | `#00B894`, `#0E3B4A`, `#0B1D2A`, `#C8A84B`, `#B3454C` — in deze volgorde toegepast, zodat de meest positieve/primaire reeks altijd teal is. |
| **Continue schaal (bijv. 1RM-trendlijn)** | Enkele lijn in `#00B894` op een `#FFFFFF`/`#E6EBEF`-grid; nooit een gradient-vulling onder de lijn (voorkomt visuele overdaad, Product Principle P6). |
| **Spierherstel-heatmap** | Vijfpunts-gradient van `#B3454C` (0-20% hersteld) via `#C8A84B` (40-60%) naar `#00B894` (80-100%), met de tussenliggende stappen als lineaire interpolatie — nooit meer dan vijf zichtbare stappen, om het onderscheid herkenbaar te houden (WCAG-conform: gecombineerd met een tekstueel percentage, nooit kleur alleen, Hoofdstuk 3/4). |
| **Weekoverzicht/kalender-heatmap (trainingsintensiteit per dag)** | Zelfde vijfpunts-schaal als spierherstel, voor consistentie systeembreed. |

### Contrast- en toegankelijkheidsregels (samengevat, uitgewerkt in Deel 16)

- Teal (`#00B894`) wordt **nooit gebruikt als kleine tekstkleur op een witte achtergrond** — het contrast is daarvoor onvoldoende (±2,4:1, onder de WCAG AA-eis van 4,5:1). Teal is wel toegestaan voor iconen, vlakken, grote/vette tekst (≥24px), en tekst op donkere achtergronden.
- Elke kleurcombinatie in dit systeem is vooraf gecontroleerd op minimaal WCAG AA voor de beoogde toepassing (tekst vs. grafisch element hebben verschillende drempels: 4,5:1 voor tekst, 3:1 voor grafische objecten/grote tekst).
- Kleur wordt nooit als enige informatiedrager gebruikt (herhaling van Hoofdstuk 3/4-principe, hier op kleursysteemniveau bevestigd): elke semantische kleurtoepassing (Success/Warning/Danger) gaat altijd vergezeld van een icoon of tekstlabel.


---

## Deel 4 — Typography

Poppins Bold (koppen) en Poppins Medium (body) zijn aangeleverd en bindend (Brand Identity, bevestigd in de brand sheet). Onderstaande schaal is een **nieuw vastgestelde, afgeleide uitwerking** die deze twee gewichten toepast op een volledige typografische hiërarchie, aansluitend bij de minimale-lettergrootte-regels uit Hoofdstuk 3/4 (interactieve tekst ≥14px, kerncijfers ≥16px).

| Stijl | Gewicht | Lettergrootte | Regelafstand | Letter-spacing | Toepassing | Voorbeeld |
|---|---|---|---|---|---|---|
| **Headline** | Poppins Bold | 28px | 34px (1,21×) | -0,3px | Schermtitels ("Progressie", "Profiel") | "Trainingskompas" |
| **Title** | Poppins Bold | 22px | 28px (1,27×) | -0,2px | Sectiekoppen binnen een scherm, kaarttitels | "Vandaag" |
| **Subtitle** | Poppins Medium | 17px | 24px (1,41×) | 0px | Secundaire koppen, kaartsubteksten | "Wk 1 · Anatomische aanpassing" |
| **Body** | Poppins Medium | 15px | 22px (1,47×) | 0px | Lopende tekst, AI-adviesteksten, formulierlabels | "HRV goed, slaap te kort" |
| **Caption** | Poppins Medium | 13px | 18px (1,38×) | 0,1px | Metadata, tijdstempels, hulptekst onder velden | "2026-08-01 · 82kg×1" |
| **Button** | Poppins Bold | 15px | 20px (1,33×) | 0,2px | Alle knoplabels | "TRAINING A" |
| **Statistic** | Poppins Bold | 24px | 28px (1,17×) | -0,3px | Kerncijfers (dagfactor, 1RM, PR-waarden) | "110 kg" |
| **AI** | Poppins Medium | 15px | 23px (1,53×) | 0px | AI-chatberichten — iets ruimere regelafstand voor leescomfort bij langere adviesteksten | "Je spieren zijn nog behoorlijk vermoeid…" |
| **Workout** | Poppins Bold | 18px | 22px (1,22×) | 0px | Actieve set-invoer tijdens training — groter dan standaard Body voor leesbaarheid tijdens fysieke inspanning (Hoofdstuk 4, Deel 1) | "56,5 kg × 10" |

**Minimale-grootte-regel (bevestiging):** geen enkele stijl in dit systeem gaat onder 13px; interactieve elementen gebruiken minimaal Body (15px) of groter, conform Golden Rule UI37 (Hoofdstuk 3).

**Gewichtregel:** het systeem gebruikt uitsluitend Poppins Bold en Poppins Medium — nooit Regular, Light, SemiBold of Black, ook niet voor subtiele nuanceverschillen. Twee gewichten, consistent toegepast, is een bewuste beperking die aansluit bij Visual Identity Deel 1 ("premium wordt gedragen door beperking").

---

## Deel 5 — Spacing System

Tien vaste spacing-waarden (dp), gebaseerd op het reeds bestaande 8px-grid in de codebase (Product Audit, sectie 6) en uitgebreid tot een volledige schaal.

| Waarde | Wanneer gebruiken |
|---|---|
| **4dp** | Micro-spacing binnen een component: tussen een icoon en zijn label, tussen een badge en de tekst ernaast. |
| **8dp** | Standaard interne padding bij compacte elementen (chips, kleine knoppen); spacing tussen nauw gerelateerde elementen binnen een kaart. |
| **12dp** | Spacing tussen losse invoervelden binnen hetzelfde formulier; interne padding van standaardknoppen (verticaal). |
| **16dp** | Standaard schermmarge (links/rechts); standaard interne kaartpadding; spacing tussen kaarten in een lijst. |
| **20dp** | Spacing tussen een sectiekop en de content eronder. |
| **24dp** | Spacing tussen grote, onafhankelijke secties op een scherm (bijv. tussen de dagfactor-kaart en de weekvoortgang-kaart). |
| **32dp** | Verticale spacing rond de primaire CTA op een scherm — extra ademruimte om de primaire actie (Product Principle P7) visueel te laten domineren. |
| **40dp** | Spacing boven een schermtitel (Headline) wanneer deze niet direct onder een systeembalk staat. |
| **48dp** | Minimale hoogte van interactieve elementen (knoppen, formuliervelden) — sluit aan bij de 44×44px-touch-targetregel (Hoofdstuk 3/4), afgerond naar het 8dp-grid. |
| **64dp** | Verticale spacing bij lege staten en onboarding-illustraties, om het scherm rust en focus te geven rond een enkel centraal element. |

**Regel:** elke spacing-waarde in nieuwe schermen is een van bovenstaande tien — geen tussenliggende, ad-hoc waarden (bijv. geen 14dp of 18dp). Dit is een directe voortzetting van Golden Rule UI1 (Hoofdstuk 3).


---

## Deel 6 — Grid System

TrainingKompas is en blijft primair een mobiele PWA (Blueprint: "Eén index.html... bewuste keuze, geen migratie naar ander platform"). Het grid-system hieronder legt vast hoe dat mobiele fundament zich verantwoord uitbreidt naar tablet en desktop-weergave (bijvoorbeeld voor een toekomstig coach-/owner-dashboard, Hoofdstuk 2).

| Formaat | Breakpoint | Marges | Kolommen | Kaartgedrag |
|---|---|---|---|---|
| **Telefoon (standaard)** | < 600px | 16dp links/rechts | 1 kolom (single-column stack) | Kaarten nemen de volledige breedte in, gestapeld verticaal — bestaand, bindend patroon (`max-width: 430px`-container). |
| **Tablet** | 600-1024px | 24dp links/rechts | 2 kolommen voor overzichtsschermen (Stats, Programma-overzicht); 1 kolom blijft voor de actieve trainingsflow | De trainingsflow (Training A/B) blijft single-column ook op tablet — bewuste keuze omdat focus tijdens het loggen belangrijker is dan schermbenutting (Hoofdstuk 4, Deel 1). |
| **Desktop (toekomstig coach-/owner-dashboard)** | > 1024px | 32dp links/rechts, gecentreerde content met `max-width: 1200px` | 3 kolommen voor dashboardoverzichten (bijv. ledenlijst + detail + acties naast elkaar) | Alleen relevant voor rolgebonden dashboards (Persona Iris, Bram, Tom, Hoofdstuk 2) — de atleet-gerichte schermen blijven mobile-first, ook op desktop, om consistentie met de kernervaring te bewaren. |

**Responsief gedrag:** het grid schaalt op basis van beschikbare breedte, niet op basis van apparaattype-detectie — een browservenster van 650px breed op een desktop krijgt dezelfde 2-koloms tabletweergave als een fysieke tablet op diezelfde breedte.

**Regel:** geen enkel scherm reorganiseert zijn informatiehiërarchie tussen formaten — een kaart die op mobiel de derde positie heeft, blijft op tablet/desktop conceptueel op de derde positie, ook al verandert de kolomindeling.

---

## Deel 7 — Elevation

Vier elevatieniveaus, direct gebaseerd op de bestaande `--shadow`-variabele in de codebase (`0 1px 3px rgba(0,0,0,.1)`) als basisniveau, hier uitgebreid tot een volledige schaal.

| Niveau | Toepassing | Light mode shadow | Dark mode alternatief |
|---|---|---|---|
| **0 — Vlak** | Achtergrond, ingebedde content zonder eigen laag (bijv. tekst direct op de app-achtergrond) | Geen schaduw | Geen schaduw |
| **1 — Kaart (standaard)** | Reguliere cards in lijsten (oefeningkaarten, statistiekkaarten) | `0 1px 3px rgba(11,29,42,0.10)` (bestaande waarde, ongewijzigd) | Geen schaduw; in plaats daarvan een 1px rand in `#1A4557` (lichter dan de `#0E3B4A`-surface) |
| **2 — Verhoogd** | Actief geselecteerde kaart, FAB in rust, sticky headers | `0 2px 8px rgba(11,29,42,0.14)` | 1px rand in `#1A4557` + lichte surface-tint-verhoging |
| **3 — Zwevend** | Bottom sheets, dialogs, FAB bij interactie | `0 8px 24px rgba(11,29,42,0.20)` | Zelfde schaduw, effectiever zichtbaar door de donkere scrim eronder |

**Wanneer NIET gebruiken:**
- Nooit elevatie toevoegen aan statische, niet-interactieve tekst — elevatie communiceert laag-op-laag-structuur en interactiviteit, geen decoratie (consistent met Motion Design-regel uit Hoofdstuk 4: elke visuele toevoeging dient een functioneel doel).
- Nooit twee verschillende elevatieniveaus door elkaar op eenzelfde visuele laag (bijv. twee kaarten naast elkaar in dezelfde lijst met verschillende schaduwdiepte) — dit breekt de gesuggereerde laagstructuur.
- In dark mode: nooit uitsluitend op schaduw vertrouwen voor onderscheid — donkere achtergronden maken schaduw nauwelijks zichtbaar; rand- of surface-tint-verschil is verplicht (zie Deel 13).

---

## Deel 8 — Icon System

### Stijl

Consistente **lijnstijl (outlined)** als standaard voor alle functionele iconen (navigatie, acties), met een **gevulde (filled) variant uitsluitend voor actieve/geselecteerde staten** — dit vervangt de huidige emoji-iconografie (Product Audit, sectie 6/13, expliciete quick win) volledig.

| Eigenschap | Specificatie |
|---|---|
| Lijndikte | 1,5px bij 24×24px iconraster (schaalt proportioneel mee bij andere groottes) |
| Hoeken | Licht afgerond (2px radius op lijnuiteinden) — sluit aan bij de afgeronde vormtaal van het logo zonder volledig "zacht"/speels te worden |
| Raster | 24×24px basisraster, met een veilige zone van 2px marge binnen het raster |
| Filled-gebruik | Uitsluitend voor: actieve bottom-navigatie-item, geselecteerde filterchip-icoon, bevestigde/voltooide status (bijv. een vinkje-icoon) |
| Kleur | `#0B1D2A` (standaard, licht), `#FFFFFF`/`#E6EBEF` (dark mode), `#00B894` (actieve staat, beide modi) |

### Categorieën

| Categorie | Iconen (voorbeelden) | Stijlnotitie |
|---|---|---|
| **Navigatie** | Home, Training, Coach, Profiel, Stats | Vervangen de huidige emoji (🏠🏋️💬👤📈) één-op-één met lijnstijl-equivalenten; behoud van dezelfde herkenbare metafoor (huis, halter, spraakballon, persoon, grafiek). |
| **AI/Coach** | Spraakballon met kompas-naald-detail, "denk"-indicator (drie puntjes) | Enige iconencategorie die een subtiel logo-verwant detail mag bevatten (kompas-naald), om AI-content herkenbaar te maken zonder het volledige logo te hergebruiken. |
| **Workout** | Halter, herhaling-icoon (cirkelpijl), stopwatch (rusttimer), gewicht-schijf (plate calculator) | Geometrisch, geen realistische afbeeldingen van sportmateriaal. |
| **Recovery** | Lichaamssilhouet (vereenvoudigd, geen anatomische details), hart met golflijn (HRV) | Neutraal silhouet, niet gender-specifiek waar niet functioneel relevant. |
| **Statistics** | Staafdiagram, lijngrafiek, trofee (PR) | Trofee-icoon uitsluitend gebruikt voor PR-context, nooit decoratief elders — behoudt betekenisvolle schaarste. |
| **Coach (menselijk, Team-context)** | Persoon met sterretje (coach-badge), schild (owner/beheerrol) | Onderscheid coach-rol-iconen bewust van AI-coach-iconen (spraakballon-met-naald) om verwarring tussen menselijke en AI-coach te voorkomen. |
| **Gym** | Gebouw/locatie-pin, mensen-groep (leden) | Consistent met gangbare kaart-/locatie-iconografie voor directe herkenbaarheid. |
| **Wearables** | Horloge/band-silhouet, sync-pijlen | Merkonafhankelijk vormgegeven (geen Fitbit-specifieke vorm), zodat toekomstige wearable-uitbreiding (Apple HealthKit, Garmin) geen icoonwijziging vereist. |

**Verboden:** emoji als functioneel icoon (herhaling van Golden Rule UI22/UI87, hier op systeemniveau bevestigd); gemengde stijlen (lijnstijl en gevuld door elkaar op hetzelfde scherm buiten de vastgelegde actieve-staat-regel); iconen zonder tekstlabel of `aria-label` (Hoofdstuk 3/4, Accessibility).


---

## Deel 9 — Illustration Style

Het splash screen (aangeleverd bronbestand) legt het canonieke illustratiemotief vast: een eenvoudig, geometrisch bergpad dat oploopt naar een vlag, in teal lijnstijl op donkerblauwe achtergrond. Dit motief — **pad, richting, een bereikbaar doel** — wordt hier uitgebreid tot een volledig illustratiesysteem.

### Principes

- **Geen cartoons, geen mascottes.** In lijn met Product Principle P6 en de ingehouden merktoon (Hoofdstuk 1, sectie 1.6): geen speelse figuurtjes, geen antropomorfe elementen. Dit sluit uit wat veel consumenten-fitness-apps wél doen (vergelijk: geen equivalent van een geanimeerd mascotte-personage).
- **Geometrisch en lijnstijl-gebaseerd**, consistent met het Icon System (Deel 8) — illustraties zijn in wezen "grotere, complexere iconen", geen aparte visuele taal.
- **Eén tot twee kleuren per illustratie**, uit het bestaande palet (typisch: teal lijnwerk op donkerblauwe/petrol achtergrond, of donkerblauw lijnwerk op lichte achtergrond) — nooit een volledig, verzadigd multicolor-illustratiepalet.
- **Altijd een richtingselement** (pad, pijl, naald, oplopende lijn) — een directe visuele echo van het kompas-concept, ook in illustraties die niets met navigatie te maken hebben.

### Toepassing per context

| Context | Illustratie-aanpak |
|---|---|
| **Empty states** | Sober lijnicoon (grotere variant van het functionele icoon uit Deel 8, geen aparte illustratie nodig) — bijvoorbeeld een halter-lijnicoon bij een lege trainingsgeschiedenis. Consistent met Hoofdstuk 4, Deel 8. |
| **Onboarding** | Het bergpad-met-vlag-motief, aangepast per stap (bijv. stap 1 toont een korte padlengte, de laatste stap toont het pad met de vlag dichtbij) — visualiseert de onboarding zelf als een klein "eerste stuk pad". |
| **AI** | Geen illustratie nodig — de AI-uitstraling wordt gedragen door kleur (petrol-achtergrond, Deel 3) en het spraakballon-met-kompas-naald-icoon (Deel 8), niet door een grotere illustratie. |
| **Success (bijv. programma succesvol gegenereerd)** | Kompas-naald die "aankomt" op een punt — vloeiende, kleine variant van het logo-detail, geen confetti of feestelijke iconografie (consistent met de ingehouden PR-viering-regel, Hoofdstuk 3/4). |
| **Error** | Neutraal, geometrisch uitroepteken-in-cirkel — geen dramatische of humoristische foutillustraties die de ernst van bijvoorbeeld een mislukte synchronisatie zouden bagatelliseren. |
| **Offline** | Onderbroken pad-lijn (het bergpad-motief met een zichtbare onderbreking die later weer aansluit) — een subtiele, betekenisvolle toepassing van hetzelfde motief: "de weg gaat straks verder". |
| **Recovery** | Geen aparte illustratie — de spierherstel-heatmap zelf (Deel 12) is het visuele middelpunt van deze context. |

### Wat expliciet niet toegestaan is

- Fotorealistische of 3D-gerenderde illustraties (breekt de geometrische, merkconsistente lijnstijl).
- Illustraties met menselijke gezichten of gedetailleerde figuren (het logo zelf gebruikt bewust een silhouet zonder gezicht — dit precedent is bindend voor alle illustraties).
- Illustraties die losstaan van het pad/richting-motief zonder functionele reden.
- Gebruik van meer dan twee kleuren binnen één illustratie.

---

## Deel 10 — Photography

TrainingKompas gebruikt fotografie spaarzaam — de huidige productinterface bevat vrijwel geen foto's (techniekvideo's zijn de uitzondering, zie Hoofdstuk 2/4) en dit hoofdstuk legt vast dat dit een bewuste keuze blijft, geen tijdelijke omissie.

### Welke foto's wel

| Context | Richtlijn |
|---|---|
| **Marketing/Play Store-listing** (Deel 17) | Echte sporters in functionele/CrossFit-context, natuurlijk licht of gecontroleerd studiolicht met een koele, neutrale kleurtemperatuur die aansluit bij het donkerblauw/teal-palet — nooit warme, oranje gefilterde beelden. |
| **Techniekvideo's binnen de app** | Functioneel, geen "sfeerbeeld" — directe, heldere weergave van de beweging, camera op ooghoogte of zij-aanzicht, neutrale achtergrond zonder afleiding. |
| **Gym-brede content (toekomstig, Fase 3-4)** | Foto's van de daadwerkelijke gym/box (bijv. ART CrossFit-locatie) bij gym-profielen — authentiek, niet-gestaged, maar wel technisch scherp en goed belicht. |

### Welke foto's nooit

- Gestockte, generieke "fitness influencer"-beelden die niet aansluiten bij de functionele/CrossFit/HYROX-esthetiek van de daadwerkelijke doelgroep (Hoofdstuk 2).
- Foto's met sterke kleurfilters/warme tinten die botsen met het koele donkerblauw/teal-palet.
- Foto's die prestatie zonder context tonen (bijvoorbeeld uitsluitend een extreem gespierd lichaam) — dit spreekt de inclusieve doelgroepbeschrijving tegen (Persona's variërend van beginnend tot Masters tot revalidatie, Hoofdstuk 2).
- Foto's met zichtbare concurrerende merken (andere trainingsapps, andere sportmerken prominent in beeld).
- Foto's die pijn, blessure of overbelasting suggereren — spreekt het "herstel boven prestatie"-principe (Product Constitution II) tegen.

### Sportspecifieke richtlijnen

| Sport | Beeldtaal |
|---|---|
| **CrossFit/functioneel** | Actie-momenten (mid-lift, mid-beweging), gymomgeving zichtbaar op de achtergrond, functionele apparatuur. |
| **Fitness/kracht** | Focus op precisie van uitvoering (bijv. juiste grip, houding) eerder dan op maximale belasting. |
| **HYROX** | Combinatie van loop- en krachtelementen in één beeld waar mogelijk, gericht op de multidisciplinaire aard van de sport (Persona Sanne, Hoofdstuk 2). |
| **Lifestyle (buiten training)** | Spaarzaam gebruikt, uitsluitend in marketingcontext (nooit in de productinterface zelf) — bijvoorbeeld een sporter die een sessie afsluit, niet mid-actie. |

### Belichting, compositie, kleurgebruik

- **Belichting:** koel-neutraal (5000-6500K), vermijd warme kunstlichtfilters; contrastrijk genoeg om de fysieke inspanning te tonen zonder overbelicht te zijn.
- **Compositie:** ruimte voor tekst-overlay in marketingtoepassingen gereserveerd aan één zijde (consistent met de asymmetrische logo-compositie); geen gecentreerde, symmetrische portretcompositie die statisch aanvoelt.
- **Kleurgebruik:** een subtiele donkerblauwe/petrol kleurgrading over marketingfoto's is toegestaan om visuele consistentie met het merkpalet te waarborgen, mits de huidtinten van de gefotografeerde sporters natuurlijk en representatief blijven.


---

## Deel 11 — Component Style

Tweeëntwintig componenten, elk volledig gespecificeerd volgens hetzelfde vaste format. Waarden refereren consequent naar het Color System (Deel 3), Typography (Deel 4), Spacing (Deel 5) en Elevation (Deel 7) hierboven — dit deel introduceert geen nieuwe losse waarden.

### Buttons (primair, secundair, tekst)

| Eigenschap | Specificatie |
|---|---|
| Doel | Eén primaire actie per scherm activeren (Product Principle P7). |
| Gebruik | Primair: `#0B1D2A`-achtergrond met witte tekst (light mode) / `#00B894`-achtergrond met `#0B1D2A`-tekst (dark mode, voor voldoende contrast). Secundair: outline-variant, transparante achtergrond met `#0B1D2A`-rand. Tekst-knop: geen achtergrond/rand, uitsluitend voor lage-nadruk-acties (bijv. "Annuleren"). |
| Padding | 12dp verticaal, 24dp horizontaal |
| Radius | 12dp (afgerond, consistent met kaartradius, niet volledig pill-vormig — sluit aan bij de licht-afgeronde, precisie-geïnspireerde vormtaal, Deel 1) |
| Elevation | Niveau 0 (vlak) in rust; geen schaduw toegevoegd aan knoppen — onderscheid komt via kleur, niet via diepte |
| Iconen | Optioneel, links van het label, 20×20px, zelfde kleur als tekst |
| Typography | Button-stijl (Deel 4): Poppins Bold, 15px |
| Spacing | 8dp tussen icoon en label indien aanwezig |
| Hover (desktop/tablet) | Achtergrond 8% donkerder (primair) of lichte `#E6EBEF`-vulling (secundair) |
| Pressed | Schaal 98%, 80ms (Hoofdstuk 4, Motion Design) |
| Disabled | 40% dekking, geen interactie, cursor/touch genegeerd |
| Focused (toetsenbord/schermlezer) | 2px `#00B894`-focusring met 2dp offset |
| Loading | Label vervangen door een kleine spinner (16px) in dezelfde kleur als de tekst; knop blijft op dezelfde breedte (geen layout-shift) |
| Error | N.v.t. op knopniveau — fouten worden getoond via Feedback Patterns (Hoofdstuk 4, Deel 7), niet via een aparte knopstaat |
| Success | Kort vinkje-icoon vervangt het label gedurende 800ms na een succesvolle actie, daarna terug naar normale staat |
| Accessibility | Minimaal 48dp hoogte (Spacing-regel), `aria-label` bij icoon-only-knoppen, focus-volgorde logisch |
| Voorbeeld | "TRAINING A" (primair, bestaand patroon), "Annuleren" (tekst-knop) |

### Cards

| Eigenschap | Specificatie |
|---|---|
| Doel | Eén enkelvoudig onderwerp groeperen (Golden Rule UI8). |
| Gebruik | Standaardcontainer voor vrijwel alle content-groepen: dashboard-kaarten, oefeningkaarten, statistiekkaarten. |
| Padding | 16dp rondom |
| Radius | 12dp |
| Elevation | Niveau 1 (standaard), niveau 2 bij actieve selectie |
| Iconen | Optioneel in de kaartkop (card-hd), rechts uitgelijnd bij acties |
| Typography | Title (kaarttitel) + Body (inhoud) |
| Spacing | 8dp tussen kaartkop en inhoud, 10dp tussen kaarten onderling in een lijst (bestaande waarde, behouden) |
| Hover | Lichte schaduwtoename (niveau 1 → 2) bij interactieve kaarten |
| Pressed | Schaal 99%, 80ms |
| Disabled | N.v.t. (kaarten zijn zelden volledig uitgeschakeld; content erin kan wel disabled zijn) |
| Focused | 2px `#00B894`-rand bij toetsenbordfocus op interactieve kaarten |
| Loading | Skeleton-variant: grijze blokken (`#E6EBEF` light / `#1A4557` dark) op exact dezelfde posities als de uiteindelijke content |
| Error | Rode (`#B3454C`) 1px accentrand aan de linkerzijde bij een kaart die een foutstatus toont |
| Success | Groene (`#00B894`) 1px accentrand aan de linkerzijde, bijvoorbeeld bij een recent behaalde PR-kaart |
| Accessibility | Kaartinhoud in logische leesvolgorde, interactieve kaarten met duidelijke tap-affordance (UI10) |
| Voorbeeld | Dagfactor-kaart, oefeningkaart in de trainingsflow |

### FAB (Floating Action Button)

| Eigenschap | Specificatie |
|---|---|
| Doel | De meest frequente actie op een scherm direct bereikbaar maken (Golden Rule UI17). |
| Gebruik | Eén per scherm, rechtsonder gepositioneerd, bijv. "Programma toevoegen". |
| Padding | 16dp (cirkelvormig, 56×56px totaal) |
| Radius | 28dp (volledig rond) |
| Elevation | Niveau 2 in rust, niveau 3 bij interactie |
| Iconen | Centraal, 24×24px, wit (op `#00B894`-achtergrond) |
| Typography | N.v.t. (icoon-only) tenzij een "extended FAB" met kort label wordt gebruikt (Button-stijl, max. twee woorden) |
| Spacing | 16dp marge tot schermrand |
| Hover | Lichte schaalvergroting (102%) |
| Pressed | Schaal 96%, 80ms |
| Disabled | Zelden toegepast; indien nodig 40% dekking |
| Focused | 2px witte focusring met 2dp offset (op de teal-achtergrond) |
| Loading | Icoon vervangen door kleine spinner |
| Error | N.v.t. |
| Success | Korte pulse-animatie na succesvolle actie |
| Accessibility | `aria-label` verplicht (icoon-only), minimaal 48dp (voldoet al bij 56px) |
| Voorbeeld | "+" op het Programma-overzichtsscherm |

### Bottom Sheets

| Eigenschap | Specificatie |
|---|---|
| Doel | Standaardvorm voor keuzelijsten zonder volledige paginanavigatie (Golden Rule UI26). |
| Gebruik | Rusttimer-presets, plate calculator, filterkeuzes. |
| Padding | 20dp boven, 16dp zijkanten, 24dp onder (extra ruimte voor veilige zone/thuisbalk) |
| Radius | 20dp (alleen bovenhoeken) |
| Elevation | Niveau 3 |
| Iconen | Sleepgreep (drag handle) bovenaan, 32×4px, `#E6EBEF`/`#1A4557` |
| Typography | Title voor de sheet-kop, Body voor opties |
| Spacing | 12dp tussen individuele opties |
| Hover | N.v.t. (mobiel-primair) |
| Pressed | Lichte achtergrondkleur-verandering (`#E6EBEF`/`#1A4557`) op de getikte optie |
| Disabled | Optie in 40% dekking indien niet beschikbaar |
| Focused | Zelfde als Cards |
| Loading | Skeleton-opties bij dynamisch geladen content |
| Error | Foutmelding inline binnen de sheet, sheet blijft open |
| Success | Sheet sluit automatisch na een succesvolle selectie |
| Accessibility | Focus verplaatst automatisch naar de sheet bij openen, sluitbaar met Escape (toetsenbord) of tik buiten de sheet |
| Voorbeeld | Rusttimer-duurkeuze |

### Dialogs

| Eigenschap | Specificatie |
|---|---|
| Doel | Bevestiging van impactvolle acties (Golden Rule UI23-25). |
| Gebruik | Destructieve acties (verwijderen), belangrijke bevestigingen (account verwijderen). |
| Padding | 24dp rondom |
| Radius | 16dp |
| Elevation | Niveau 3 |
| Iconen | Optioneel, waarschuwing-icoon bovenaan bij destructieve dialogs (`#B3454C`) |
| Typography | Title voor de vraag, Body voor toelichting |
| Spacing | 16dp tussen titel en toelichting, 24dp tussen toelichting en knoppen |
| Hover | Zelfde als Buttons voor de knoppen binnenin |
| Pressed | Zelfde als Buttons |
| Disabled | N.v.t. op dialogniveau |
| Focused | Focus-trap binnen de dialog; eerste focus op de minst destructieve knop (bijv. "Annuleren"), nooit standaard op de destructieve actie |
| Loading | Primaire knop toont spinner tijdens verwerking, dialog blijft open tot bevestiging |
| Error | Foutmelding verschijnt binnen de dialog zonder deze te sluiten |
| Success | Dialog sluit met korte fade-out na succesvolle actie |
| Accessibility | `role="alertdialog"` voor destructieve bevestigingen, focus-trap, Escape sluit (tenzij een kritieke, verplichte keuze) |
| Voorbeeld | "Weet je zeker dat je dit programma wilt verwijderen?" |


### Navigation (bottom navigation)

| Eigenschap | Specificatie |
|---|---|
| Doel | Constante, voorspelbare toegang tot de vijf hoofdschermen (Golden Rule UX1). |
| Gebruik | Permanent zichtbaar behalve tijdens actieve training/fullscreen-modals (UI20). |
| Padding | 8dp boven, `env(safe-area-inset-bottom)` onder (bestaande, behouden waarde) |
| Radius | 0 (volledige breedte, geen afgeronde hoeken) |
| Elevation | Niveau 2 (lichte scheiding van de content erboven) |
| Iconen | Lijnstijl 24×24px (Deel 8), gevuld bij actieve staat |
| Typography | Caption (11px, iets kleiner dan standaard Caption voor compacte labels) |
| Spacing | Gelijk verdeeld over vijf items, elk item minimaal 48dp breed |
| Hover | N.v.t. (mobiel-primair) |
| Pressed | Lichte achtergrondtint op het getikte item |
| Disabled | N.v.t. (alle navigatie-items zijn altijd actief) |
| Focused | 2px focusring bij toetsenbordnavigatie (desktop-weergave) |
| Loading | N.v.t. |
| Error | Rode stip-indicator (`ni-dot`, bestaand patroon) bij een relevante melding op dat scherm |
| Success | N.v.t. |
| Accessibility | Actieve staat via kleur én icoonvorm (filled vs. outlined), nooit kleur alleen (Golden Rule UX2) |
| Voorbeeld | Home / Training / Coach / Profiel / Stats |

### Forms

| Eigenschap | Specificatie |
|---|---|
| Doel | Gestructureerde data-invoer met foutpreventie (Golden Rule UX5-8). |
| Gebruik | Profiel-bewerken, programma-generator-parameters, check-in. |
| Padding | 12dp verticaal, 16dp horizontaal per veld |
| Radius | 8dp per invoerveld |
| Elevation | Niveau 0 (vlak, veld onderscheidt zich via rand/achtergrond, niet via schaduw) |
| Iconen | Optioneel, links in het veld (bijv. een kalender-icoon bij datumvelden) |
| Typography | Body voor invoer, Caption voor labels/hulptekst |
| Spacing | 12dp tussen velden (Spacing System) |
| Hover | Randkleur verdonkert licht |
| Pressed/Actief | 2px `#00B894`-rand bij focus |
| Disabled | `#E6EBEF`-achtergrond, 60% tekstdekking |
| Focused | Zelfde als Pressed/Actief |
| Loading | N.v.t. op veldniveau |
| Error | Rode (`#B3454C`) rand + foutmelding in Caption-stijl direct onder het veld |
| Success | Groene (`#00B894`) rand + klein vinkje rechts in het veld bij succesvolle validatie (optioneel, alleen bij expliciete validatie zoals e-mailformaat) |
| Accessibility | Elk veld heeft een zichtbaar, gekoppeld `<label>`; foutmeldingen gekoppeld via `aria-describedby` |
| Voorbeeld | Atleet-profielformulier |

### Dropdowns

| Eigenschap | Specificatie |
|---|---|
| Doel | Eén keuze uit een beperkte lijst selecteren zonder een volledige bottom sheet te vereisen. |
| Gebruik | Kleinere keuzelijsten binnen formulieren (bijv. gewichtsklasse). |
| Padding | Zelfde als Forms |
| Radius | 8dp |
| Elevation | Uitklap-paneel op niveau 2 |
| Iconen | Chevron-down rechts, roteert 180° bij openen |
| Typography | Body |
| Spacing | 8dp tussen opties in het uitklap-paneel |
| Hover | Lichte achtergrondtint per optie |
| Pressed | Directe selectie-bevestiging |
| Disabled | Zelfde als Forms |
| Focused | Zelfde als Forms, uitklap-paneel navigeerbaar met pijltjestoetsen |
| Loading | Skeleton-opties bij dynamisch geladen lijsten (bijv. oefeningcategorieën) |
| Error | Zelfde als Forms |
| Success | N.v.t. |
| Accessibility | `role="listbox"`, actieve optie aangekondigd voor schermlezers |
| Voorbeeld | Ervaringsniveau-selectie in onboarding |

### Search

| Eigenschap | Specificatie |
|---|---|
| Doel | Snel een specifiek item vinden in een grotere lijst (Golden Rule UX34). |
| Gebruik | Oefeningbibliotheek, ledenlijst bij grote gyms. |
| Padding | 12dp verticaal, 16dp horizontaal, met extra 32dp links voor het zoekicoon |
| Radius | 24dp (pill-vormig — een bewuste uitzondering op de standaard 8-12dp, om zoekvelden visueel direct herkenbaar te maken) |
| Elevation | Niveau 1 wanneer los boven een lijst zwevend (sticky search bar) |
| Iconen | Vergrootglas links, "wis"-kruisje rechts zodra er tekst is ingevoerd |
| Typography | Body |
| Spacing | 16dp marge tot de lijst eronder |
| Hover | N.v.t. (mobiel-primair) |
| Pressed/Actief | 2px `#00B894`-rand bij focus |
| Disabled | Zelden toegepast |
| Focused | Toetsenbord verschijnt, resultaten filteren live |
| Loading | Kleine spinner rechts tijdens het ophalen van resultaten (indien server-side gezocht wordt) |
| Error | "Geen resultaten"-staat, zie Hoofdstuk 4, Deel 8 (Empty States) |
| Success | N.v.t. |
| Accessibility | Resultatenaantal aangekondigd voor schermlezers na elke wijziging |
| Voorbeeld | Oefening zoeken bij "Losse oefening" |


### Charts

| Eigenschap | Specificatie |
|---|---|
| Doel | Trends en vergelijkingen visueel begrijpelijk maken (Golden Rule UX28). |
| Gebruik | Progressie/Stats-scherm, dashboard-mini-trends. |
| Padding | 16dp rondom binnen de kaart |
| Radius | Overneemt de Card-radius (12dp) van de omvattende kaart |
| Elevation | Zelf geen eigen elevatie — leeft binnen een Card |
| Iconen | N.v.t. binnen de grafiek zelf; wel een info-icoon voor toelichting indien nodig |
| Typography | Caption voor as-labels, Statistic voor uitgelichte kerncijfers |
| Spacing | 8dp tussen grafiek en de onderliggende duidingstekst (verplicht, Golden Rule UX28) |
| Hover (desktop) | Tooltip met exacte waarde bij hover over een datapunt |
| Pressed (mobiel) | Tik op een datapunt toont dezelfde tooltip |
| Disabled | N.v.t. |
| Focused | Datapunten navigeerbaar via toetsenbord bij desktop-gebruik |
| Loading | Skeleton-grafiekvorm (Deel 5, Hoofdstuk 4) |
| Error | "Kon data niet laden" met "opnieuw proberen", losstaand per grafiek |
| Success | N.v.t. |
| Accessibility | Tekstuele samenvatting van de trend beschikbaar voor schermlezers (niet enkel de visuele grafiek) |
| Voorbeeld | 1RM-trendlijn |

### Tables

| Eigenschap | Specificatie |
|---|---|
| Doel | Gestructureerde, vergelijkbare data in rijen/kolommen tonen. |
| Gebruik | Ledenlijst (Team-scherm), mesocyclusvergelijking. |
| Padding | 12dp verticaal, 16dp horizontaal per cel |
| Radius | 12dp op de buitenste hoeken van de volledige tabel |
| Elevation | Niveau 1 (als omvattende kaart) |
| Iconen | Rolbadge-iconen in relevante kolommen (Team-scherm) |
| Typography | Caption voor kolomkoppen (bold), Body voor celinhoud |
| Spacing | 1px dividers tussen rijen (`#E6EBEF`/`#1A4557`) |
| Hover (desktop) | Lichte rij-highlight |
| Pressed | Rij-tik navigeert naar detail (indien van toepassing) |
| Disabled | N.v.t. per rij |
| Focused | Rijen navigeerbaar via toetsenbord bij desktop-gebruik |
| Loading | Skeleton-rijen |
| Error | Foutmelding boven de tabel, tabel blijft met laatst bekende data zichtbaar indien mogelijk |
| Success | N.v.t. |
| Accessibility | `<table>`-semantiek met correcte kop-koppelingen voor schermlezers |
| Voorbeeld | Ledenlijst met rol-kolom |

### Badges

| Eigenschap | Specificatie |
|---|---|
| Doel | Korte, opvallende statusaanduiding (PR, nieuw, rol). |
| Gebruik | PR-badge tijdens loggen, rolbadge in Team-scherm, "nieuw"-indicator. |
| Padding | 2dp verticaal, 8dp horizontaal |
| Radius | 8dp (klein, rechthoekig-afgerond) of volledig rond bij een enkel cijfer/icoon |
| Elevation | Niveau 0 |
| Iconen | Optioneel, klein (14×14px) |
| Typography | Caption, Bold-gewicht voor extra nadruk ondanks de kleine grootte |
| Spacing | 4dp tussen icoon en tekst |
| Hover | N.v.t. (badges zijn zelden interactief) |
| Pressed | Indien interactief (bijv. rolbadge die een dropdown opent): lichte tint-verandering |
| Disabled | N.v.t. |
| Focused | Alleen relevant bij interactieve badges |
| Loading | N.v.t. |
| Error | N.v.t. |
| Success | Teal-achtergrond (`#00B894`) met witte tekst voor PR-badges specifiek |
| Accessibility | Betekenis nooit uitsluitend via kleur — altijd gecombineerd met tekst/icoon |
| Voorbeeld | "PR@bucket" tijdens het loggen |

### Progress (balken en ringen)

| Eigenschap | Specificatie |
|---|---|
| Doel | Voortgang accuraat en vertrouwd communiceren (Hoofdstuk 4, Deel 5: nooit misleidend sneller/langzamer dan de daadwerkelijke voortgang). |
| Gebruik | Weekvoortgang, programma-generatie-voortgang, synchronisatie. |
| Padding | N.v.t. (de balk/ring zelf heeft geen interne padding) |
| Radius | Balk: volledig rond aan de uiteinden (pill-vorm) · Ring: cirkelvormig, 6-8dp lijndikte |
| Elevation | Niveau 0 |
| Iconen | Optioneel, gecentreerd binnen een progress ring (bijv. een percentage-cijfer) |
| Typography | Statistic binnen een ring (bijv. herstelpercentage), Caption naast een balk |
| Spacing | 8dp tussen de balk/ring en het bijbehorende label |
| Hover | N.v.t. |
| Pressed | N.v.t. (progress-indicatoren zijn niet-interactief) |
| Disabled | N.v.t. |
| Focused | N.v.t. |
| Loading | Indeterminate-variant (vloeiend heen-en-weer bewegende vulling) uitsluitend wanneer de exacte voortgang nog onbekend is |
| Error | Rode (`#B3454C`) vulling bij een mislukt proces (bijv. mislukte synchronisatie) |
| Success | Teal (`#00B894`) vulling bij voltooiing |
| Accessibility | `role="progressbar"` met `aria-valuenow`/`aria-valuemax` voor schermlezers |
| Voorbeeld | Weekvoortgangsbalk op het dashboard, spierherstel-ring |


### Tabs / Segment Controls

| Eigenschap | Specificatie |
|---|---|
| Doel | Wisselen tussen een klein aantal (2-4) gelijkwaardige weergaven binnen hetzelfde scherm. |
| Gebruik | Team-scherm (Leden/Wijzigingslog), Stats-periodeweergave (dag/week/maand). |
| Padding | 8dp verticaal, 16dp horizontaal per tab |
| Radius | 8dp voor de omvattende container, actieve tab-indicator als "pill" binnen de container |
| Elevation | Niveau 0 |
| Iconen | Optioneel, links van het label |
| Typography | Button-stijl (Bold, 15px) |
| Spacing | Gelijk verdeeld over het beschikbare aantal tabs |
| Hover | Lichte achtergrondtint |
| Pressed | Vloeiende pill-verschuiving (150ms, Hoofdstuk 4 Deel 5) |
| Disabled | Zelden toegepast op tabniveau |
| Focused | 2px focusring, navigeerbaar met pijltjestoetsen |
| Loading | N.v.t. (tabwissel is instant, onderliggende content toont eigen loading state) |
| Error | N.v.t. |
| Success | N.v.t. |
| Accessibility | `role="tablist"`/`role="tab"` met correcte `aria-selected`-status |
| Voorbeeld | "LEDEN" / "WIJZIGINGSLOG" |

### Switches (toggles)

| Eigenschap | Specificatie |
|---|---|
| Doel | Een aan/uit-instelling direct en tastbaar wijzigen. |
| Gebruik | Notificatie-instellingen, haptische feedback aan/uit. |
| Padding | N.v.t. (vaste component-afmeting: 52×32px) |
| Radius | Volledig rond (pill-vorm) |
| Elevation | Niveau 0, lichte schaduw op de "knop" binnen de track bij niveau 1 |
| Iconen | N.v.t. |
| Typography | Label ernaast in Body-stijl |
| Spacing | 12dp tussen switch en label |
| Hover | N.v.t. (mobiel-primair) |
| Pressed | Vloeiende schuifbeweging (150ms) |
| Disabled | 40% dekking, geen interactie |
| Focused | 2px focusring rondom de volledige switch |
| Loading | N.v.t. |
| Error | N.v.t. |
| Success | N.v.t. — de aan-staat zelf is `#00B894`, geen aparte successtaat nodig |
| Accessibility | `role="switch"` met `aria-checked`, bedienbaar met spatiebalk bij toetsenbordfocus |
| Voorbeeld | "Haptische feedback" aan/uit in Instellingen |

### Checkboxes

| Eigenschap | Specificatie |
|---|---|
| Doel | Eén of meerdere opties uit een lijst selecteren (multi-select). |
| Gebruik | Filterselecties met meerdere gelijktijdige opties. |
| Padding | N.v.t. (vaste afmeting: 20×20px) |
| Radius | 4dp (licht afgerond vierkant, onderscheidend van de volledig ronde radio buttons) |
| Elevation | Niveau 0 |
| Iconen | Vinkje, wit op `#00B894`-achtergrond bij aangevinkt |
| Typography | Label ernaast in Body-stijl |
| Spacing | 12dp tussen checkbox en label |
| Hover | Lichte randkleur-verandering |
| Pressed | Korte pulse-animatie (100ms) bij aan-/uitvinken |
| Disabled | 40% dekking |
| Focused | 2px focusring |
| Loading | N.v.t. |
| Error | Rode rand indien een verplichte checkbox-selectie ontbreekt bij formulierverzending |
| Success | N.v.t. |
| Accessibility | Gekoppeld `<label>`, bedienbaar met spatiebalk |
| Voorbeeld | Meerdere spiergroepen selecteren in een filter |

### Radio Buttons

| Eigenschap | Specificatie |
|---|---|
| Doel | Eén exclusieve keuze uit een lijst (single-select). |
| Gebruik | Sportkeuze in onboarding, ervaringsniveau-selectie. |
| Padding | N.v.t. (vaste afmeting: 20×20px) |
| Radius | Volledig rond |
| Elevation | Niveau 0 |
| Iconen | Gevulde binnencirkel in `#00B894` bij geselecteerd |
| Typography | Label ernaast in Body-stijl |
| Spacing | 12dp tussen radio button en label, 8dp tussen opties onderling |
| Hover | Lichte randkleur-verandering |
| Pressed | Korte pulse-animatie (100ms) |
| Disabled | 40% dekking |
| Focused | 2px focusring, navigeerbaar met pijltjestoetsen binnen de groep |
| Loading | N.v.t. |
| Error | N.v.t. (een radiogroep heeft doorgaans een default-selectie, geen "leeg"-foutstaat) |
| Success | N.v.t. |
| Accessibility | `role="radiogroup"` met correcte groepering en labels |
| Voorbeeld | Ervaringsniveau: Beginner / Gemiddeld / Ervaren |


### Workout Cards

| Eigenschap | Specificatie |
|---|---|
| Doel | De actieve set-invoer tijdens een training huisvesten — de meest gebruikte component in de hele app. |
| Gebruik | Trainingsscherm (Training A/B, losse oefening). |
| Padding | 16dp, met extra 4dp verticale ademruimte rond de stepper-invoer specifiek |
| Radius | 12dp |
| Elevation | Niveau 1, niveau 2 wanneer actief (huidige oefening in een meerdere-oefeningen-sessie) |
| Iconen | Superset-koppelicoon, apparatuur-instelling-icoon, video-preview-icoon |
| Typography | Title (oefeningnaam), Workout-stijl (18px Bold) voor de actieve set-waarden, Caption (vorige-sessie-referentie) |
| Spacing | 12dp tussen sets binnen dezelfde kaart |
| Hover | N.v.t. (mobiel-primair) |
| Pressed | Stepper-specifieke feedback (Deel 6, Hoofdstuk 4: 80ms pulse) |
| Disabled | N.v.t. |
| Focused | 2px rand bij het actieve invoerveld |
| Loading | N.v.t. — optimistische UI, geen zichtbare loading tijdens loggen (Performance Principles, Hoofdstuk 3/4) |
| Error | Rode accentrand bij een mislukte synchronisatie van deze specifieke kaart, met "opnieuw proberen" |
| Success | Groene pulse + vinkje bij succesvol opgeslagen set (Micro-interactie #1, Hoofdstuk 4) |
| Accessibility | Grotere touch-targets dan standaard (Hoofdstuk 4, Deel 1: fysieke inspanning), haptische bevestiging |
| Voorbeeld | "Safety Squat Bar — 3x10-12 · RPE 5,5" |

### Exercise Cards

| Eigenschap | Specificatie |
|---|---|
| Doel | Een oefening representeren binnen een lijst (bibliotheek, programma-blok) buiten de actieve logflow. |
| Gebruik | Oefeningbibliotheek, programma-blokdetail. |
| Padding | 14dp |
| Radius | 8dp (iets compacter dan Workout Cards, want minder primair) |
| Elevation | Niveau 1 |
| Iconen | Spiergroep-tags (kleine badges), video-preview-thumbnail indien beschikbaar |
| Typography | Subtitle (oefeningnaam), Caption (spiergroep/type) |
| Spacing | 8dp tussen kaarten in de lijst |
| Hover | Lichte schaduwtoename |
| Pressed | Navigeert naar detail of voegt toe aan sessie, afhankelijk van context |
| Disabled | N.v.t. |
| Focused | 2px rand |
| Loading | Skeleton-variant bij dynamisch geladen bibliotheek |
| Error | N.v.t. op kaartniveau |
| Success | N.v.t. |
| Accessibility | Spiergroep-informatie ook tekstueel, niet enkel via kleurbadge |
| Voorbeeld | "Backsquat — Quadriceps, Billen" |

### AI Cards

| Eigenschap | Specificatie |
|---|---|
| Doel | AI-gegenereerde content (advies, waarschuwing, antwoord) visueel herkenbaar en uitlegbaar presenteren. |
| Gebruik | Coach-advies-scherm, coach-chatberichten, dashboard-AI-inzichten. |
| Padding | 16dp |
| Radius | 12dp |
| Elevation | Niveau 1 |
| Iconen | Spraakballon-met-kompas-naald-icoon (Deel 8), linksboven of als avatar-positie |
| Typography | Body (Deel 4: AI-stijl specifiek, 15px met 23px regelafstand) |
| Spacing | 8dp tussen de databasis-toelichting en de kernboodschap (Golden Rule UX24/P3: uitlegbaarheid altijd zichtbaar) |
| Hover | N.v.t. (mobiel-primair) |
| Pressed | "Waarom dit advies"-sectie klapt uit (Micro-interactie #27, Hoofdstuk 4) |
| Disabled | N.v.t. |
| Focused | 2px rand |
| Loading | Drie-puntjes "denk"-animatie (Micro-interactie #22, Hoofdstuk 4) |
| Error | Neutrale melding "coach niet bereikbaar" met herstelactie (Hoofdstuk 4, Deel 9) |
| Success | N.v.t. — AI-kaarten hebben geen "succesvol"-staat, wel een duidelijk advies-opgevolgd-bevestiging |
| Accessibility | Berichttype (advies/vraag/waarschuwing) ook tekstueel aangekondigd, achtergrondkleur `#0E3B4A` altijd met wit tekst voor AAA-contrast |
| Voorbeeld | "Coach-advies — Anatomische Aanpassing Wk 1" |

### Recovery Cards

| Eigenschap | Specificatie |
|---|---|
| Doel | Hersteltoestand per spiergroep of algeheel visueel en tekstueel tonen. |
| Gebruik | Dashboard mini-heatmap, volledig Spierherstel-scherm. |
| Padding | 16dp |
| Radius | 12dp |
| Elevation | Niveau 1 |
| Iconen | Lichaamssilhouet (Deel 8), geen aparte iconen per spiergroep — kleurcodering draagt de informatie |
| Typography | Statistic (herstelpercentage), Caption (spiergroepnaam) |
| Spacing | 8dp tussen de visualisatie en de tekstuele lijst eronder |
| Hover | N.v.t. |
| Pressed | Tik op een spiergroep toont detail (Scherm 8, Hoofdstuk 4) |
| Disabled | N.v.t. |
| Focused | 2px rand rondom het gehele kaartelement |
| Loading | Korte laadanimatie bij het (her)laden van de SVG (Scherm 8, Hoofdstuk 4) |
| Error | Fallback naar tekstuele lijst zonder visualisatie bij laadfout |
| Success | N.v.t. |
| Accessibility | Elke spiergroep heeft een tekstueel percentage naast de kleurcodering (Deel 3, kleurtoegankelijkheid) |
| Voorbeeld | "Quadriceps — 42% hersteld" |

### Analytics Cards

| Eigenschap | Specificatie |
|---|---|
| Doel | Eén statistische kerninzicht compact presenteren, met duiding. |
| Gebruik | Progressie/Stats-scherm, dashboard-KPI's. |
| Padding | 14dp |
| Radius | 12dp |
| Elevation | Niveau 1 |
| Iconen | Klein trend-icoon (pijl omhoog/omlaag/stabiel) naast het kerncijfer |
| Typography | Statistic (kerncijfer), Caption (duiding/context) |
| Spacing | 4dp tussen kerncijfer en trend-icoon, 8dp tussen kerncijfer en duidingstekst |
| Hover | Lichte schaduwtoename bij interactieve analytics-kaarten (doorklikbaar naar detail) |
| Pressed | Navigeert naar de volledige grafiek/detailweergave |
| Disabled | N.v.t. |
| Focused | 2px rand |
| Loading | Skeleton-variant |
| Error | "Kon data niet laden" met "opnieuw proberen" |
| Success | Groen trend-icoon bij een positieve ontwikkeling (bijv. stijgend 1RM) |
| Accessibility | Trendrichting ook tekstueel omschreven ("gestegen met 5%"), niet enkel via pijl-icoon |
| Voorbeeld | "Backsquat 1RM — 110kg, +5% vs. vorige maand" |


---

## Deel 12 — Data Visualization

| Type | Specificatie |
|---|---|
| **Lijngrafieken** | Enkele lijn in `#00B894` (2px lijndikte), geen vulling onder de lijn, datapunten als kleine cirkels (4px) die pas zichtbaar worden bij tik/hover. As-labels in Caption-stijl, maximaal vijf gridlijnen om visuele ruis te beperken. Gebruikt voor: 1RM-trend, gewichtstrend, HRV-trend. |
| **Staafdiagrammen** | Staven in `#0E3B4A` (neutraal) met de meest recente/relevante staaf uitgelicht in `#00B894`. Afgeronde bovenhoeken (4dp radius). Gebruikt voor: wekelijks volume, trainingsfrequentie per maand. |
| **Heatmaps** | Vijfpunts-kleurgradient (Deel 3: `#B3454C` → `#C8A84B` → `#00B894`), toegepast op zowel de spierherstel-lichaamsvisualisatie als een optionele kalender-heatmap (trainingsintensiteit per dag, vergelijkbaar met een GitHub-contributiegrafiek maar in het merkpalet). |
| **Progress rings** | Cirkelvormig, 6-8dp lijndikte, `#00B894`-vulling op een `#E6EBEF`/`#1A4557`-achtergrondring, met het percentage gecentreerd in Statistic-stijl. Gebruikt voor: hersteltoestand-samenvatting, weekdoel-voortgang. |
| **KPI-kaarten** | Zie Analytics Cards (Deel 11) — een KPI-kaart is de kaartcontainer, dit item beschrijft de specifieke datatoepassing: één kerncijfer, één trendindicator, één regel context. Nooit meer dan drie KPI-kaarten naast elkaar op mobiel (sluit aan bij het bestaande 3-koloms stat-grid). |
| **Kalenders** | Maandweergave met dagen als kleine cirkels; getrainde dagen gevuld in `#00B894`, geplande-maar-niet-uitgevoerde dagen met een lichte `#B3454C`-rand (niet volledig gevuld, om onderscheid te maken tussen "niet getraind" en "actieve waarschuwing"). |
| **Weekoverzicht** | Zeven kolommen (ma-zo), elke kolom een verticale mini-staaf voor trainingsintensiteit die dag, met de huidige dag gemarkeerd door een `#00B894`-onderstreping. |
| **Recovery-visualisatie** | De lichaamssilhouet-heatmap (Scherm 8, Hoofdstuk 4) is de primaire recovery-visualisatie; een secundaire, compactere variant (zonder volledige lichaamsvorm, enkel een horizontale balk per hoofdspiergroep) wordt gebruikt op het dashboard waar ruimte beperkt is. |

**Algemene regel voor alle datavisualisatie:** elke grafiek/visualisatie in dit systeem toont maximaal vijf gelijktijdige datareeksen (Deel 3), gebruikt nooit 3D-effecten of onnodige decoratie, en gaat — zonder uitzondering — vergezeld van een tekstuele duiding (Golden Rule UX28, Hoofdstuk 3).

---

## Deel 13 — Dark Mode

Dark mode is geen kleurinversie van light mode, maar een **volwaardig eigen ontwerp** — met name omdat het donkerblauwe merkpalet zich hier natuurlijk toe leent: de primaire merkkleur (`#0B1D2A`) wordt de dark mode-achtergrond, wat betekent dat TrainingKompas in dark mode er "meer zichzelf" uitziet dan in light mode, niet minder (zie de brand sheet zelf, die overwegend op een donkere achtergrond is opgebouwd).

| Aspect | Light mode | Dark mode | Toelichting |
|---|---|---|---|
| **Achtergrond** | `#E6EBEF` | `#0B1D2A` | De primaire merkkleur wordt letterlijk de basis. |
| **Surface/Cards** | `#FFFFFF` | `#0E3B4A` | Secondary-kleur als kaartoppervlak — behoudt het onderscheid tussen achtergrond en kaart. |
| **Tekst primair** | `#0B1D2A` | `#FFFFFF` | Volledige omkering, beide met AAA-contrast. |
| **Tekst secundair** | `#0E3B4A` (of grijstint) | `#E6EBEF` op 70% dekking | Voldoende onderscheid van primaire tekst zonder een aparte kleur te introduceren. |
| **Accent** | `#00B894` | `#00B894` (ongewijzigd) | Teal behoudt zijn functie en herkenbaarheid in beide modi — geen aangepaste "dark mode teal" nodig, het contrast op donkere achtergrond is al sterker dan op licht (Deel 3). |
| **Elevatie** | Schaduw (Deel 7) | Randlijn `#1A4557` + surface-tint-verhoging (schaduw is nauwelijks zichtbaar op donkere achtergronden) | Directe toepassing van de Elevation-regel uit Deel 7. |
| **Iconen** | `#0B1D2A` | `#FFFFFF`/`#E6EBEF` | Consistent met tekstkleur. |
| **Grafieken** | Lichte achtergrond, donkere gridlijnen | Donkere achtergrond, `#E6EBEF`-gridlijnen op lage dekking (15%) | Voorkomt een te felle, "uitgelicht" ogende grafiek op een donkere achtergrond. |
| **Foto's/illustraties** | Ongewijzigd | Illustraties in teal lijnstijl blijven ongewijzigd (al ontworpen voor donkere achtergrond, zie splash screen); foto's krijgen een lichte donkerblauwe overlay (10% `#0B1D2A`) voor visuele integratie | Voorkomt dat een lichte foto "los" oogt te midden van een verder donker scherm. |
| **Statusbalk/systeem-UI** | Donkere iconen op lichte achtergrond | Lichte iconen op donkere achtergrond | Standaard platformgedrag, geen custom implementatie nodig. |

**Overkoepelend principe:** dark mode is niet "light mode met omgekeerde kleuren" maar een bewust ontworpen tweede uitvoering van hetzelfde systeem — elk component in Deel 11 is expliciet getoetst op beide modi, niet enkel op light mode met een automatische inversie achteraf.

---

## Deel 14 — Motion Tokens

Formele tokens, direct voortbouwend op Hoofdstuk 4, Deel 5 (Motion Design) — hier vastgelegd als herbruikbare, benoemde waarden voor consistente implementatie.

| Token | Waarde | Toepassing |
|---|---|---|
| `motion-instant` | 80ms, ease-out | Drukstaten (knoppen, steppers) |
| `motion-fast` | 100-150ms, ease-out | Bevestigingen, kleine statuswisselingen (checkbox, chip-selectie) |
| `motion-standard` | 200-250ms, ease-in-out | Pagina-overgangen, kaartanimaties, bottom sheet-opening |
| `motion-slow` | 400-600ms, ease-out | Grafiek-tekenanimaties, PR-vieringen (eenmalig) |
| `motion-spring-gentle` | Demping 0,8, stijfheid 120 | Bottom sheet-terugveren bij onvoltooide swipe, FAB-schaalinteractie |
| `motion-spring-bouncy` | Demping 0,6, stijfheid 180 | Uitsluitend voor PR-animaties (lichte overshoot, Deel 5 Hoofdstuk 4) — bewust de enige plek waar een "speelsere" veerbeweging is toegestaan |
| `motion-loading-pulse` | 1200ms cyclus, ease-in-out, oneindig herhalend | Skeleton-loading |
| `motion-reduced` | 0-50ms, geen easing-nuance | Automatisch actief bij `prefers-reduced-motion`; vervangt alle bovenstaande tokens met een vrijwel instant overgang zonder decoratieve beweging |

**Regel:** geen enkele animatie in de app gebruikt een duur of easing-curve buiten deze acht tokens. Nieuwe animatiebehoeften worden eerst getoetst of een bestaand token volstaat (Product Principle P9) vóórdat een nieuw token wordt overwogen.

---

## Deel 15 — Design Tokens

Consoliderende referentietabel van alle tokens uit dit hoofdstuk, bedoeld als het enige naslagwerk dat nodig is bij implementatie — elke waarde hieronder is elders in dit hoofdstuk toegelicht en onderbouwd.

### Color tokens
`color-primary: #0B1D2A` · `color-secondary: #0E3B4A` · `color-accent: #00B894` · `color-success: #00B894` · `color-warning: #C8A84B` · `color-danger: #B3454C` · `color-info: #0E3B4A` · `color-neutral-light: #E6EBEF` · `color-white: #FFFFFF` · `color-bg-light: #E6EBEF` · `color-bg-dark: #0B1D2A` · `color-surface-light: #FFFFFF` · `color-surface-dark: #0E3B4A` · `color-border-dark: #1A4557`

### Spacing tokens
`space-4` · `space-8` · `space-12` · `space-16` · `space-20` · `space-24` · `space-32` · `space-40` · `space-48` · `space-64` (waarden: Deel 5)

### Radius tokens
`radius-sm: 4dp` (checkboxes) · `radius-default: 8dp` (formvelden, dropdowns) · `radius-md: 12dp` (cards, buttons, chart-containers) · `radius-lg: 16dp` (dialogs) · `radius-xl: 20dp` (bottom sheets) · `radius-pill: 24dp+` (search, tabs-indicator) · `radius-round: 50%` (FAB, switches, radio buttons)

### Elevation tokens
`elevation-0` (vlak) · `elevation-1` (kaart-standaard) · `elevation-2` (verhoogd) · `elevation-3` (zwevend) — specificaties: Deel 7

### Animation tokens
`motion-instant` · `motion-fast` · `motion-standard` · `motion-slow` · `motion-spring-gentle` · `motion-spring-bouncy` · `motion-loading-pulse` · `motion-reduced` — specificaties: Deel 14

### Typography tokens
`type-headline` · `type-title` · `type-subtitle` · `type-body` · `type-caption` · `type-button` · `type-statistic` · `type-ai` · `type-workout` — specificaties: Deel 4

### Icon tokens
`icon-stroke-width: 1.5px` · `icon-grid: 24×24px` · `icon-corner-radius: 2px` · `icon-style-outlined` (standaard) · `icon-style-filled` (actieve staat) — specificaties: Deel 8


---

## Deel 16 — Accessibility

Directe toepassing van Hoofdstuk 3 (Deel 7) en Hoofdstuk 4 (Deel 10) op het niveau van concrete designtokens en visuele specificaties.

| Aspect | Specificatie |
|---|---|
| **Contrast** | Alle tekst-op-achtergrond-combinaties in dit systeem zijn vooraf gecontroleerd op minimaal WCAG AA (4,5:1 voor normale tekst, 3:1 voor grote tekst ≥24px en grafische objecten). Teal (`#00B894`) is expliciet uitgesloten als kleine-tekstkleur op wit (Deel 3). |
| **Font sizes** | Minimaal 13px (Caption) systeembreed, interactieve tekst minimaal 15px (Body/Button), kerncijfers minimaal 24px (Statistic) — ruim boven de 14px/16px-ondergrens uit Hoofdstuk 3/4. |
| **Touch targets** | Minimaal 48dp (Spacing-token, Deel 5), overeenkomend met de 44×44px-regel plus marge; tijdens de actieve trainingsflow specifiek ruimer waar de layout dit toelaat (Workout Cards, Deel 11). |
| **Screen readers** | Elk component in Deel 11 heeft een expliciete Accessibility-regel; systeembreed geldt: logische leesvolgorde = visuele volgorde, geen informatie uitsluitend via kleur, dynamische content aangekondigd via passende `aria-live`-niveaus (Hoofdstuk 4, Deel 7). |
| **Dynamic type (systeemlettergrootte-schaling)** | Alle typografietokens (Deel 4) zijn relatief schaalbaar; bij een vergrote systeeminstelling schaalt de volledige typografische hiërarchie mee zonder dat verhoudingen (Headline blijft groter dan Body) worden doorbroken, en zonder dat tekst wordt afgekapt. |
| **Reduce motion** | Het `motion-reduced`-token (Deel 14) vervangt automatisch alle overige motion-tokens wanneer `prefers-reduced-motion` actief is — functionele bevestigingen blijven zichtbaar, decoratieve beweging (overshoot, spring-bouncy) valt weg. |

**Kleurenblindheid (aanvullend):** de vijfpunts-heatmapgradient (Deel 3, Deel 12) is getest tegen de meest voorkomende vormen van kleurenblindheid (deuteranopie, protanopie) door het gebruik van zowel helderheids- als kleurtoonverschil tussen de vijf stappen, gecombineerd met het verplichte tekstuele percentage — nooit kleur als enige informatiedrager (herhaling van het meest fundamentele toegankelijkheidsprincipe in dit hele Handbook).

---

## Deel 17 — Play Store Branding

| Onderdeel | Specificatie |
|---|---|
| **Launcher icon** | Zie Deel 2 — het kompas-icoon op het donkerblauw-naar-petrol gradient, exact zoals aangeleverd in de brand sheet, 512×512px bronbestand. |
| **Adaptive icon** | Voorgrondlaag (kompas-icoon binnen de 66%-veilige-zone) + achtergrondlaag (effen gradient) als gescheiden lagen, conform Android-specificatie (Deel 2). |
| **Feature Graphic** | 1024×500px, donkerblauwe achtergrond met het volledige logo (icoon + wordmark + tagline) gecentreerd of links uitgelijnd met ruimte voor een sfeerbeeld (Deel 10) rechts — nooit tekst over een drukke foto-achtergrond zonder kader (Deel 2). |
| **Screenshots** | Minimaal vijf, in volgorde: (1) Dashboard met dagfactor — toont de kernbelofte direct, (2) Trainingsscherm tijdens het loggen, (3) AI-coach-advies met zichtbare uitleg, (4) Spierherstel-heatmap — het meest onderscheidende visuele element, (5) Statistieken/progressie. Elke screenshot krijgt een korte, in Poppins Bold gezette kopregel erboven (los van de daadwerkelijke app-UI toegevoegd in het exportbestand) die de kernwaarde van dat scherm in maximaal vijf woorden samenvat (bijv. "Weet elke dag wat je aankan"). |
| **Promo-afbeeldingen** | Consistent met de Feature Graphic-stijl: donkerblauwe achtergrond, teal-accenten, geen felle, niet-merkeigen kleuren toegevoegd voor "opvallendheid" — onderscheidend vermogen komt uit consistentie, niet uit afwijking (Product Principle P6). |
| **Splash Screen** | Zie Deel 2 — het aangeleverde bronbestand is het definitieve, bindende ontwerp. |
| **App-naam (Play Store-titel)** | "Trainingskompas" — nooit afgekort, nooit met een marketing-toevoeging zoals "- AI Coach" in de titel zelf (dat hoort in de korte omschrijving, niet in de naam, om Merkregel/Product Principle P11 niet te schenden). |
| **Korte omschrijving (max. 80 tekens)** | "Jouw AI-trainingscoach: gericht trainen, slimmer worden, sterker blijven." — herbruikt de tagline direct, geen aparte marketingzin bedenken die ervan afwijkt. |
| **Lange omschrijving** | Structuur: (1) kernbelofte in twee zinnen — uitlegbare AI-coaching op basis van HRV en herstel, (2) drie tot vier concrete functiehighlights (dagfactor, spierherstel-heatmap, programmagenerator, plate calculator) elk in één zin, (3) doelgroep-erkenning (functionele fitness, CrossFit, Masters-atleten) zonder andere doelgroepen uit te sluiten, (4) korte afsluiting die teruggrijpt op de tagline. Geen overdreven superlatieven ("de beste app ooit") — de ingehouden merktoon (Hoofdstuk 1, sectie 1.6) geldt ook in marketingcontext. |
| **Brand consistency** | Elke Play Store-asset wordt getoetst aan dezelfde Design Constitution (einde van dit hoofdstuk) als de productinterface zelf — marketingmateriaal is geen uitzonderingsgebied met eigen, losse regels. |


---

## Deel 18 — Premium Design Checklist

Verplicht te doorlopen bij elke UI Sprint. Doorlopend genummerd, elk punt objectief met JA/NEE te beoordelen.

### Visual Identity & Brand Language (1-20)
1. Is het logo gebruikt in één van de drie vastgestelde varianten (kleur-volledig, eenkleurig-donker, eenkleurig-teal)?
2. Is de clear space rond het logo gerespecteerd?
3. Is het logo niet kleiner dan de vastgestelde minimumgrootte?
4. Is geen van de verboden logotoepassingen (Deel 2) toegepast?
5. Staat de tagline ongewijzigd waar deze gebruikt wordt?
6. Is de tweekleurige wordmark-styling ("Trainings" + "Kompas") consistent toegepast?
7. Is het logo op een foto-achtergrond altijd voorzien van een kader?
8. Is het watermerkgebruik (indien aanwezig) binnen de 8%-dekkingsgrens?
9. Is de favicon correct vereenvoudigd voor kleine formaten?
10. Voldoet het launcher icon aan de exacte brand sheet-specificatie?
11. Is de adaptive icon-voorgrondlaag binnen de 66%-veilige-zone geplaatst?
12. Bevat de adaptive icon-voorgrondlaag geen tekst?
13. Is het splash screen ongewijzigd t.o.v. het bindende bronbestand?
14. Verschijnt het splash screen zonder kunstmatige vertraging?
15. Is de merknaam "Trainingskompas" nergens afgekort in nieuwe UI?
16. Is elke visuele keuze getoetst aan minimaal één van de acht kwaliteiten uit Visual Identity Deel 1?
17. Is het kompas-naald-motief (richting/vooruitgang) consistent herkenbaar in afgeleide graphics?
18. Is er geen nieuw sub-logo of merkvariant geïntroduceerd zonder goedkeuring?
19. Sluiten alle marketing-uitingen aan bij dezelfde merktaal als de productinterface?
20. Is bij twijfel over merkgebruik teruggevallen op het aangeleverde bronbestand, niet op interpretatie?

### Color System (21-40)
21. Zijn uitsluitend de vastgestelde kernkleuren gebruikt (`#0B1D2A`, `#0E3B4A`, `#00B894`, `#E6EBEF`, `#FFFFFF`)?
22. Zijn semantische kleuren beperkt tot Warning (`#C8A84B`), Danger (`#B3454C`), Info (`#0E3B4A`)?
23. Is teal (`#00B894`) niet gebruikt als kleine tekstkleur op een witte achtergrond?
24. Voldoet elke tekst-op-achtergrond-combinatie aan minimaal WCAG AA?
25. Is kleur nergens de enige informatiedrager?
26. Is de heatmap-gradient beperkt tot de vastgestelde vijf stappen?
27. Is de recovery-driepuntsschaal consistent met de heatmap-kleuren?
28. Zijn categorische grafiekreeksen in de vastgestelde volgorde toegepast (teal eerst)?
29. Is de dark mode-kleurmapping (Deel 13) volledig en correct toegepast, niet enkel een automatische inversie?
30. Is de achtergrondkleur in light mode `#E6EBEF`, niet een andere grijstint?
31. Is de surfacekleur in light mode `#FFFFFF`?
32. Is de achtergrondkleur in dark mode exact `#0B1D2A`?
33. Is de surfacekleur in dark mode exact `#0E3B4A`?
34. Zijn dividers/randen consistent met de vastgestelde neutrale tinten?
35. Is elke nieuwe kleurtoepassing herleid tot een bestaand token (Deel 15) in plaats van een ad-hoc hexwaarde?
36. Is de Danger-kleur bewust gedempt, niet fel alarmrood?
37. Is Success consequent teal, niet een aparte groentint?
38. Is de AI-kaartachtergrond consistent petrol (`#0E3B4A`) met witte tekst?
39. Is elke kleurwijziging (bijv. bij toekomstige gym-branding) opnieuw gecontroleerd op contrast?
40. Is er geen kleur toegevoegd die niet in Deel 3 is gedefinieerd of daar expliciet als afgeleid is gemarkeerd?

### Typography (41-55)
41. Wordt uitsluitend Poppins Bold en Poppins Medium gebruikt?
42. Is elke tekststijl herleidbaar tot een token uit Deel 4 (geen ad-hoc groottes)?
43. Is de minimale lettergrootte (13px) nergens onderschreden?
44. Is interactieve tekst minimaal 15px?
45. Zijn kerncijfers gezet in de Statistic-stijl (24px Bold)?
46. Is de AI-chatstijl toegepast met de verruimde regelafstand (23px)?
47. Is de Workout-stijl (18px Bold) toegepast op actieve set-invoer?
48. Is regelafstand consistent met de in Deel 4 vastgelegde ratio's?
49. Is letter-spacing correct toegepast bij Headline/Title (negatief) versus Button (positief)?
50. Zijn er nooit meer dan drie tekstgewichten op één scherm zichtbaar?
51. Schaalt typografie correct mee met een vergrote systeeminstelling?
52. Is er geen tekst uitsluitend in hoofdletters gezet buiten de vastgestelde Button-stijl-context?
53. Is de typografische hiërarchie (Headline > Title > Subtitle > Body) op elk scherm consistent toegepast?
54. Is Caption-stijl beperkt tot metadata/hulptekst, niet gebruikt voor primaire content?
55. Zijn alle voorbeeldteksten in dit systeem representatief voor daadwerkelijke productcontent (geen lorem ipsum in opgeleverde designs)?

### Spacing & Grid (56-67)
56. Is elke spacing-waarde één van de tien vastgestelde tokens (Deel 5)?
57. Is de standaard schermmarge 16dp?
58. Is de spacing rond de primaire CTA minimaal 32dp?
59. Zijn interactieve elementen minimaal 48dp hoog?
60. Is het mobiele grid single-column zoals vastgesteld?
61. Blijft de trainingsflow single-column ook op tablet?
62. Is het tablet-grid 2 kolommen voor overzichtsschermen?
63. Is het desktop-grid (indien van toepassing) 3 kolommen met `max-width: 1200px`?
64. Reorganiseert geen enkel scherm zijn informatiehiërarchie tussen formaten?
65. Zijn marges per breakpoint correct toegepast (16/24/32dp)?
66. Is responsief gedrag getest op tussenliggende breedtes, niet enkel op de exacte breakpoints?
67. Is de bestaande `max-width: 430px`-mobiele container gerespecteerd waar van toepassing?

### Elevation (68-75)
68. Is elk component voorzien van het correcte elevatieniveau (0-3) uit Deel 7?
69. Is er geen elevatie toegevoegd aan statische, niet-interactieve tekst?
70. Is er nooit meer dan één elevatieniveau door elkaar op dezelfde visuele laag?
71. Is in dark mode een randlijn gebruikt in plaats van (onzichtbare) schaduw?
72. Is de zwevende elevatie (niveau 3) beperkt tot bottom sheets/dialogs/actieve FAB?
73. Is de standaardkaart-elevatie (niveau 1) consistent met de bestaande `--shadow`-waarde?
74. Verandert elevatie mee bij interactiestaten (hover/pressed) waar relevant?
75. Is elevatie nooit gebruikt als vervanging voor een ontbrekende randlijn in dark mode?

### Icon System (76-87)
76. Is de lijndikte consistent 1,5px op een 24×24px-raster?
77. Worden gevulde iconen uitsluitend gebruikt voor actieve/geselecteerde staten?
78. Is emoji volledig vervangen door de lijnstijl-iconenset?
79. Heeft elk functioneel icoon een tekstlabel of `aria-label`?
80. Zijn AI-iconen herkenbaar onderscheiden van menselijke-coach-iconen?
81. Is de wearable-iconografie merkonafhankelijk vormgegeven?
82. Zijn spiergroep-/recovery-iconen neutraal, niet gender-specifiek zonder functionele reden?
83. Is het trofee-icoon (PR) uitsluitend in PR-context gebruikt, nergens decoratief?
84. Zijn hoeken van lijnwerk consistent licht afgerond (2px)?
85. Is er geen mengvorm van gevuld en lijnstijl op hetzelfde scherm buiten de vastgestelde uitzondering?
86. Is elk nieuw icoon getoetst aan de bestaande categorieën vóór het aanmaken van een nieuwe stijl?
87. Is de iconkleur consistent met de tekstkleur van dezelfde context (licht/donker)?

### Illustration & Photography (88-99)
88. Bevat geen enkele illustratie een cartoon- of mascotte-achtig element?
89. Gebruikt elke illustratie maximaal twee kleuren uit het bestaande palet?
90. Bevat elke illustratie een herkenbaar richtingselement (pad/pijl/naald)?
91. Is het bergpad-met-vlag-motief consistent toegepast in onboarding/success-contexten?
92. Bevatten illustraties geen gedetailleerde menselijke gezichten?
93. Is de offline-illustratie (onderbroken pad) consistent met het motief elders?
94. Zijn foto's beperkt tot marketing/techniekvideo's/gym-context, niet decoratief in de kernproductinterface?
95. Sluiten fotobelichting en kleurgebruik aan bij het koel-neutrale palet?
96. Tonen sportfoto's de daadwerkelijke doelgroep (functioneel/CrossFit/HYROX), geen generieke stockbeelden?
97. Bevatten foto's geen zichtbare concurrerende merken?
98. Suggereren foto's nergens pijn, blessure of overbelasting?
99. Is elke foto technisch scherp en correct belicht vóór gebruik?


### Componenten — algemeen (100-104)
100. Is elk gebruikt component herleidbaar tot een specificatie in Deel 11?
101. Is er geen nieuw component ontworpen zonder eerst te toetsen of een bestaand component volstaat?
102. Zijn padding/radius/elevation-waarden bij elk component exact conform Deel 11, geen ad-hoc afwijkingen?
103. Zijn hover/pressed/disabled/focused-staten voor elk interactief component aanwezig?
104. Is elk component getest in zowel light als dark mode?

### Buttons (105-110)
105. Is er nooit meer dan één primaire knop per scherm?
106. Is de knopradius consistent 12dp?
107. Toont de knop een loading-state zonder layout-shift?
108. Is de disabled-state op 40% dekking?
109. Is de focusring 2px in `#00B894` met 2dp offset?
110. Is de minimale knophoogte 48dp?

### Cards (111-115)
111. Bevat elke kaart een enkelvoudig onderwerp?
112. Is de kaartradius consistent 12dp?
113. Is de kaartpadding consistent 16dp?
114. Wordt de skeleton-variant getoond op exact de posities van de uiteindelijke content?
115. Zijn error/success-accentranden (rood/teal) correct en spaarzaam toegepast?

### FAB (116-119)
116. Is er nooit meer dan één FAB tegelijk zichtbaar?
117. Is de FAB consistent 56×56px met 28dp radius?
118. Heeft de FAB een verplicht `aria-label`?
119. Overlapt de FAB nooit actief in te vullen content?

### Navigation (120-124)
120. Blijft de volgorde van navigatie-items identiek op elk scherm?
121. Is de actieve staat zichtbaar via kleur én icoonvorm?
122. Is elk navigatie-item minimaal 48dp breed?
123. Verschijnt de rode stip-indicator alleen bij een daadwerkelijk relevante melding?
124. Verdwijnt de navigatiebalk alleen tijdens actieve training/fullscreen-modals?

### Bottom Sheets (125-129)
125. Is de sleepgreep aanwezig en consistent gestyled?
126. Is de sheet sluitbaar via tik buiten de sheet én een expliciete knop?
127. Is de radius beperkt tot de bovenhoeken (20dp)?
128. Verplaatst de focus automatisch naar de sheet bij openen?
129. Is de sheet-opening-animatie consistent 250ms ease-out?

### Dialogs (130-135)
130. Heeft elke dialog exact één primaire en optioneel één secundaire actie?
131. Staat de eerste focus nooit standaard op de destructieve actie?
132. Is er een focus-trap binnen de dialog aanwezig?
133. Sluit de dialog nooit automatisch bij een onbeantwoorde belangrijke keuze?
134. Is de scrim-verdonkering consistent (60% light / 70% dark)?
135. Gebruikt een destructieve dialog het waarschuwing-icoon in `#B3454C`?

### Forms (136-141)
136. Zijn verplichte velden gemarkeerd vóór het invullen?
137. Verdwijnt ingevulde data nooit bij een fout elders in het formulier?
138. Is de focusrand consistent 2px teal?
139. Is de foutmelding direct onder het veld gepositioneerd?
140. Is elk veld gekoppeld aan een zichtbaar `<label>`?
141. Bevat geen enkel formulier meer dan zeven actieve velden zonder groepering?

### Dropdowns (142-145)
142. Roteert de chevron-indicator correct bij openen/sluiten?
143. Is het uitklap-paneel navigeerbaar met pijltjestoetsen?
144. Toont de dropdown een skeleton-staat bij dynamisch geladen opties?
145. Is de actieve optie aangekondigd voor schermlezers?

### Search (146-150)
146. Is het zoekveld pill-vormig (24dp radius) conform de bewuste uitzondering?
147. Verschijnen resultaten binnen 300ms na de laatste toetsaanslag?
148. Is het wis-kruisje pas zichtbaar zodra er tekst is ingevoerd?
149. Wordt het resultatenaantal aangekondigd voor schermlezers?
150. Toont een lege zoekactie een alternatief in plaats van een doodlopend pad?

### Charts (151-155)
151. Toont elke grafiek een tekstuele duiding direct eronder?
152. Is de skeleton-vorm aanwezig tijdens laden?
153. Is een tekstuele samenvatting beschikbaar voor schermlezers?
154. Faalt een grafiekfout losstaand van de overige grafieken op het scherm?
155. Is de tooltip-weergave consistent bij tik/hover op een datapunt?

### Tables (156-159)
156. Zijn kolomkoppen visueel onderscheiden van celinhoud (Caption Bold vs. Body)?
157. Zijn rijen navigeerbaar via toetsenbord bij desktop-gebruik?
158. Blijft de tabel met laatst bekende data zichtbaar bij een laadfout, waar mogelijk?
159. Is de tabel-semantiek (`<table>`) correct gekoppeld voor schermlezers?

### Badges (160-163)
160. Zijn badges beperkt tot korte, betekenisvolle labels (geen lange zinnen)?
161. Is de PR-badge consistent teal met witte tekst?
162. Is de badge-typografie consistent Caption Bold ondanks de kleine grootte?
163. Is de betekenis van elke badge nooit uitsluitend via kleur overgebracht?

### Progress (164-168)
164. Beweegt elke voortgangsindicator exact synchroon met de daadwerkelijke voortgang?
165. Is de indeterminate-variant beperkt tot situaties met onbekende voortgang?
166. Is `role="progressbar"` met correcte `aria-value*`-attributen aanwezig?
167. Is de foutkleur (rood) consistent bij een mislukt proces?
168. Is de successkleur (teal) consistent bij voltooiing?

### Tabs / Segments (169-172)
169. Verschuift de actieve-staat-indicator vloeiend (150ms) tussen tabs?
170. Zijn tabs beperkt tot maximaal vier gelijkwaardige opties?
171. Is `role="tablist"`/`role="tab"` correct toegepast?
172. Is de tabgroep navigeerbaar met pijltjestoetsen?

### Switches, Checkboxes, Radio Buttons (173-180)
173. Is de switch-track consistent 52×32px?
174. Is de aan-staat van een switch consistent teal?
175. Is de checkbox-radius consistent 4dp (onderscheidend van radio buttons)?
176. Is de radio button-radius volledig rond?
177. Zijn checkbox/radio button minimaal 20×20px met voldoende omringende tikruimte?
178. Is elk van deze drie componenten bedienbaar met het toetsenbord (spatiebalk/pijltjestoetsen)?
179. Is de disabled-state consistent 40% dekking bij alle drie?
180. Is de focusring consistent 2px bij alle drie?

### Workout Cards (181-186)
181. Is de Workout-typografiestijl (18px Bold) toegepast op actieve set-waarden?
182. Reageert de kaart optimistisch (geen zichtbare loading) tijdens loggen?
183. Is de succes-pulse (groen + vinkje) consistent bij elke opgeslagen set?
184. Zijn touch-targets binnen deze kaart ruimer dan de systeemstandaard?
185. Is haptische bevestiging gekoppeld aan de belangrijkste acties binnen deze kaart?
186. Is de vorige-sessie-referentie zichtbaar zonder extra navigatie?

### Exercise, AI, Recovery, Analytics Cards (187-198)
187. Zijn Exercise Cards visueel compacter dan Workout Cards (8dp vs. 12dp radius)?
188. Zijn spiergroep-tags op Exercise Cards ook tekstueel leesbaar?
189. Is de AI-kaartachtergrond consistent petrol met wit tekstcontrast?
190. Toont de AI-kaart altijd de "waarom dit advies"-uitklapoptie?
191. Is de "denk"-animatie (drie puntjes) consistent bij elke AI-verwerking?
192. Is de Recovery Card-kleurcodering consistent met de systeembrede heatmap-schaal?
193. Heeft elke spiergroep op een Recovery Card een tekstueel percentage?
194. Toont een Analytics Card altijd een trendindicator naast het kerncijfer?
195. Is de trendrichting ook tekstueel omschreven, niet enkel via pijl-icoon?
196. Is elke domeinspecifieke kaart (Workout/Exercise/AI/Recovery/Analytics) visueel direct onderscheidbaar van de andere vier?
197. Gebruiken alle vijf kaarttypen dezelfde basis-radius/elevatie-logica ondanks hun visuele onderscheid?
198. Is er geen zesde, niet-gespecificeerde kaartvariant geïntroduceerd zonder toetsing aan Deel 11?

### Data Visualization (199-208)
199. Bevat geen enkele grafiek meer dan vijf gelijktijdige datareeksen?
200. Is de lijngrafiek-kleur consistent teal zonder vulling onder de lijn?
201. Zijn staafdiagrammen voorzien van afgeronde bovenhoeken (4dp)?
202. Is de heatmap-gradient consistent met Deel 3 (vijf stappen)?
203. Toont een progress ring het percentage gecentreerd in Statistic-stijl?
204. Zijn nooit meer dan drie KPI-kaarten naast elkaar op mobiel?
205. Onderscheiden kalendervisualisaties "niet getraind" duidelijk van "actieve waarschuwing"?
206. Is de weekoverzicht-huidige-dag-markering consistent (teal onderstreping)?
207. Bevat geen enkele visualisatie 3D-effecten?
208. Gaat elke visualisatie vergezeld van een tekstuele duiding?

### Dark Mode (209-216)
209. Is dark mode als volwaardig eigen ontwerp getest, niet als automatische inversie?
210. Is de achtergrondkleur in dark mode exact de primaire merkkleur?
211. Zijn schaduweffecten in dark mode vervangen door randlijnen?
212. Blijft teal ongewijzigd en voldoende contrastrijk in beide modi?
213. Zijn foto's in dark mode voorzien van de donkerblauwe overlay voor visuele integratie?
214. Zijn illustraties in dark mode ongewijzigd bruikbaar (al ontworpen voor donkere achtergrond)?
215. Is elk component uit Deel 11 expliciet getoetst op zijn dark mode-specificatie?
216. Schakelt de systeemstatusbalk correct mee tussen licht/donker?

### Motion Tokens (217-224)
217. Gebruikt elke animatie een van de acht vastgestelde motion-tokens?
218. Is `motion-spring-bouncy` uitsluitend gebruikt voor PR-animaties?
219. Is `motion-reduced` correct actief bij `prefers-reduced-motion`?
220. Blokkeert geen enkele animatie de eerstvolgende gebruikersactie?
221. Is de loading-pulse-cyclus consistent 1200ms?
222. Is er geen ad-hoc animatieduur toegepast buiten de tokenlijst?
223. Zijn animaties consistent tussen vergelijkbare componenten (bijv. alle kaarten gebruiken dezelfde pressed-animatie)?
224. Is elke animatie getoetst aan het drieledige doel (oriëntatie/bevestiging/nadruk) uit Hoofdstuk 4?

### Design Tokens (225-230)
225. Zijn alle kleurwaarden in de code herleidbaar tot een genoemd token, geen losse hexcodes?
226. Zijn alle spacing-waarden herleidbaar tot een genoemd token?
227. Zijn alle radius-waarden herleidbaar tot een genoemd token?
228. Zijn alle elevatieniveaus herleidbaar tot een genoemd token?
229. Zijn alle typografiestijlen herleidbaar tot een genoemd token?
230. Is de tokenlijst (Deel 15) bijgewerkt bij elke nieuwe, goedgekeurde toevoeging?

### Accessibility (231-242)
231. Voldoet alle kerntekst aan WCAG AA-contrast?
232. Is de minimale lettergrootte (13px) systeembreed gerespecteerd?
233. Zijn touch-targets minimaal 48dp?
234. Heeft elk interactief element een betekenisvol toegankelijk label?
235. Is de leesvolgorde voor schermlezers gelijk aan de visuele volgorde?
236. Wordt dynamische content aangekondigd via passende `aria-live`-niveaus?
237. Schaalt de typografie correct mee met een vergrote systeemlettergrootte?
238. Is `prefers-reduced-motion` systeembreed gerespecteerd?
239. Is de heatmap-gradient getest tegen deuteranopie/protanopie?
240. Is haptische feedback uitschakelbaar via instellingen?
241. Is er nergens functionele informatie die uitsluitend via kleur wordt overgebracht?
242. Is elk nieuw scherm met een schermlezer getest vóór oplevering?

### Play Store Branding (243-252)
243. Is het launcher icon exact conform de brand sheet-specificatie?
244. Is de adaptive icon-voorgrondlaag correct binnen de veilige zone?
245. Is de Feature Graphic 1024×500px met correcte merktoepassing?
246. Bevatten de screenshots de vastgestelde volgorde en kernboodschappen?
247. Is de korte omschrijving binnen de 80-tekens-limiet en gebaseerd op de tagline?
248. Volgt de lange omschrijving de vastgestelde structuur zonder overdreven superlatieven?
249. Is de Play Store-titel exact "Trainingskompas", niet afgekort of aangevuld?
250. Zijn promo-afbeeldingen visueel consistent met de Feature Graphic-stijl?
251. Is elke marketing-asset getoetst aan dezelfde Design Constitution als de productinterface?
252. Is deze volledige checklist doorlopen en ondertekend vóór indiening bij de Play Store?


---

## TrainingKompas Design Constitution — de 50 visuele ontwerpwetten

Deze vijftig wetten zijn de samenvatting van dit gehele hoofdstuk en zijn **bindend voor alle toekomstige UI-, UX- en ontwikkelsprints.** Wanneer een sprint van één van deze wetten afwijkt, wordt dit expliciet vastgelegd in de Decision Log, inclusief motivatie en impactanalyse — dezelfde werkwijze als vastgelegd voor de Product Constitution (Hoofdstuk 3) en de UX Constitution (Hoofdstuk 4).

**1.** Het aangeleverde logo, kleurenpalet en de typografie zijn de definitieve, bindende merkidentiteit — geen enkele toekomstige stijlkeuze mag hiervan afwijken zonder formele herziening van dit hoofdstuk.

**2.** Het kernpalet bestaat uit precies vijf kleuren (`#0B1D2A`, `#0E3B4A`, `#00B894`, `#E6EBEF`, `#FFFFFF`); elke semantische uitbreiding (Warning, Danger, Info) is afgeleid en beperkt tot de in Deel 3 vastgestelde waarden.

**3.** Teal (`#00B894`) wordt nooit gebruikt als kleine tekstkleur op een witte achtergrond.

**4.** Kleur is nooit de enige informatiedrager — elke semantische kleurtoepassing gaat vergezeld van een icoon of tekstlabel.

**5.** Alleen Poppins Bold en Poppins Medium worden gebruikt — geen ander lettertype, geen ander gewicht.

**6.** Interactieve tekst is minimaal 15px, kerncijfers minimaal 24px, systeembreed nooit onder 13px.

**7.** Elke spacing-waarde is een van de tien vastgestelde tokens (4/8/12/16/20/24/32/40/48/64dp) — geen ad-hoc tussenwaarden.

**8.** De mobiele trainingsflow blijft single-column op elk schermformaat, ook tablet en desktop.

**9.** Elevatie communiceert uitsluitend laagstructuur en interactiviteit — nooit decoratie op statische content.

**10.** In dark mode wordt elevatie getoond via randlijnen, nooit uitsluitend via (onzichtbare) schaduw.

**11.** Iconen zijn systeembreed in lijnstijl (1,5px, 24×24px-raster); gevulde iconen zijn uitsluitend voor actieve/geselecteerde staten.

**12.** Emoji worden nergens gebruikt als functioneel icoon.

**13.** Elk icoon zonder tekstlabel heeft een verplicht, betekenisvol `aria-label`.

**14.** Illustraties bevatten nooit cartoons, mascottes of gedetailleerde menselijke gezichten.

**15.** Elke illustratie gebruikt maximaal twee kleuren en bevat een herkenbaar richtingselement (pad, pijl, naald).

**16.** Foto's worden spaarzaam gebruikt — beperkt tot marketing, techniekvideo's en gym-context — nooit decoratief in de kernproductinterface.

**17.** Foto's suggereren nergens pijn, blessure of overbelasting.

**18.** Elk component in dit systeem heeft een vaste, gedocumenteerde specificatie (Deel 11) — geen nieuw component wordt ontworpen zonder eerst te toetsen of een bestaand component volstaat.

**19.** Er is nooit meer dan één primaire actie (knop, FAB, CTA) per scherm.

**20.** Destructieve acties gebruiken altijd een gestileerde, merkeigen bevestigingsdialog — nooit een native systeemdialoog.

**21.** Elk interactief component heeft expliciet gespecificeerde hover-, pressed-, disabled- en focused-staten.

**22.** Loading-states tonen altijd een skeleton in de uiteindelijke lay-out, nooit een lege ruimte of enkel een spinner zonder structuur.

**23.** Grafieken bevatten nooit meer dan vijf gelijktijdige datareeksen en gaan altijd vergezeld van een tekstuele duiding.

**24.** De spierherstel-heatmap gebruikt consistent de vastgestelde vijfpunts-kleurgradient, systeembreed hergebruikt waar herstel wordt getoond.

**25.** Dark mode is een volwaardig eigen ontwerp, nooit een automatische kleurinversie van light mode.

**26.** De dark mode-achtergrond is de primaire merkkleur (`#0B1D2A`) — TrainingKompas oogt in dark mode minstens zo merkeigen als in light mode.

**27.** Elke animatie gebruikt een van de acht vastgestelde motion-tokens — geen ad-hoc duur of easing-curve.

**28.** `motion-spring-bouncy` (de enige "speelse" animatie in het systeem) is uitsluitend gereserveerd voor PR-vieringen.

**29.** `prefers-reduced-motion` wordt systeembreed gerespecteerd via het `motion-reduced`-token.

**30.** Elke animatie dient oriëntatie, bevestiging of nadruk — nooit decoratie zonder functie.

**31.** Alle kleur-, spacing-, radius-, elevatie-, typografie- en icoon-waarden in code zijn herleidbaar tot een genoemd token (Deel 15) — geen losse, ongedocumenteerde waarden.

**32.** Alle tekst-op-achtergrond-combinaties voldoen aan minimaal WCAG AA-contrast.

**33.** Touch-targets zijn systeembreed minimaal 48dp, ruimer tijdens de actieve trainingsflow.

**34.** De leesvolgorde voor schermlezers is op elk scherm gelijk aan de visuele leesvolgorde.

**35.** De volledige naam "Trainingskompas" is zichtbaar op elk scherm dat de merkidentiteit toont, ook onder toekomstige gym-branding.

**36.** Het logo wordt nooit herkleurd buiten de drie vastgestelde varianten, nooit vervormd, nooit voorzien van extra effecten.

**37.** De clear space en minimumgrootte van het logo worden zonder uitzondering gerespecteerd.

**38.** AI-content is systeembreed herkenbaar via de petrol-achtergrond (`#0E3B4A`) met wit tekstcontrast en het spraakballon-met-kompas-naald-icoon.

**39.** Workout Cards — de meest gebruikte component in de app — reageren optimistisch, zonder zichtbare loading-vertraging tijdens het loggen.

**40.** Elke domeinspecifieke kaart (Workout, Exercise, AI, Recovery, Analytics) is visueel direct onderscheidbaar van de andere vier, terwijl alle vijf dezelfde basis-radius/elevatie-logica delen.

**41.** Het launcher icon, de adaptive icon en het splash screen zijn exact conform de aangeleverde brand sheet — geen interpretatievrijheid.

**42.** Play Store-marketingmateriaal wordt getoetst aan dezelfde Design Constitution als de productinterface — geen apart, losser regime voor marketing.

**43.** De Play Store-titel is exact "Trainingskompas", zonder afkorting of marketing-toevoeging in de naam zelf.

**44.** Elke nieuwe kleur-, component- of tokenbehoefte wordt eerst getoetst op uitbreidbaarheid van het bestaande systeem (Product Principle P9) vóór een nieuwe toevoeging wordt overwogen.

**45.** De Premium Design Checklist (Deel 18) wordt volledig doorlopen vóór livegang van elke sprint die visuele elementen raakt.

**46.** Complexiteit en visuele dichtheid worden per scherm bewust gekozen, nooit een toevallig gevolg van opeenstapeling (Hoofdstuk 3, Product Principle P16, hier op visueel niveau herbevestigd).

**47.** Geen enkele visuele toevoeging wordt gerechtvaardigd met "het ziet er premium uit" zonder een onderliggende functionele of merkonderbouwing (Product Principle P6).

**48.** Elke afwijking van dit Design System — inclusief bij toekomstige gym-branding-skins — behoudt verplicht de kernkleuren, typografie en merkzichtbaarheid; alleen accenttoepassing mag per gym variëren, nooit het fundament.

**49.** Dit hoofdstuk wordt bij elke grote productuitbreiding (nieuw platform, nieuwe kernfeature) herzien vóór implementatie, niet erna gecorrigeerd.

**50.** Elke afwijking van deze vijftig wetten wordt expliciet vastgelegd in de Decision Log, met motivatie en impactanalyse — nooit stilzwijgend doorgevoerd.

---

*Einde Hoofdstuk 5. Dit hoofdstuk vormt samen met Hoofdstuk 1 (Productvisie & Filosofie), Hoofdstuk 2 (Doelgroepen, Persona's & Customer Journey), Hoofdstuk 3 (Product Design Principles & Golden Rules) en Hoofdstuk 4 (Premium UX & Interaction Design Handbook) het volledige fundament van het TrainingKompas Premium Development Handbook. De Premium Design Checklist (Deel 18) is vanaf dit moment verplicht onderdeel van elke UI Sprint, UX Review en Play Store Release Review. Elk volgend hoofdstuk wordt tegen de Design Constitution hierboven getoetst vóórdat het als goedgekeurd geldt.*

