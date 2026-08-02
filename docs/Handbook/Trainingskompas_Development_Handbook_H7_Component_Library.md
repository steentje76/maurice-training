# TrainingKompas Premium Development Handbook

## Hoofdstuk 7 — Component Specifications & Behaviour Library

**Status:** bindend document. Vanaf dit hoofdstuk mag geen enkele nieuwe UI-component worden ontwikkeld zonder dat deze eerst aan deze bibliotheek is toegevoegd.
**Voortbouwend op:** Hoofdstuk 1-6, in het bijzonder Hoofdstuk 5 (Deel 11: Component Style, de basisspecificaties die hier tot volledige bouwbaarheid worden uitgebreid) en Hoofdstuk 6 (de schermbibliotheek die deze componenten toepast).
**Karakter:** productspecificatie, geen code, geen implementatie. Elke component is zo volledig beschreven dat een ontwikkelaar kan bouwen zonder verdere ontwerpbeslissingen te hoeven nemen.

---

### Leeswijzer en gebruikte conventies

Om dit hoofdstuk bruikbaar te houden in plaats van een herhaling van Hoofdstuk 5, geldt de volgende werkwijze: waar Hoofdstuk 5 (Deel 11) een component al basaal heeft gespecificeerd (Buttons, Cards, FAB, Navigation, Bottom Sheets, Dialogs, Forms, Dropdowns, Search, Charts, Tables, Badges, Progress, Tabs, Switches, Checkboxes, Radio Buttons, de vijf domeinkaarten), breidt dit hoofdstuk die specificatie uit tot volledige bouwbaarheid — het herhaalt niet, het verdiept. Nieuwe componenten die niet in Hoofdstuk 5 voorkwamen, worden hier voor het eerst volledig vastgelegd.

**Vast format per component (samengevoegd waar dat de bruikbaarheid vergroot):**
Naam · Doel · Beschrijving · Wanneer gebruiken · Wanneer NIET gebruiken · Gebruiker · Context · Visuele hiërarchie · Afmetingen/Padding/Margins/Radius/Elevation · Typography · Iconen · Kleuren (light/dark) · Accessibility (touch targets, screen reader, keyboard, focus) · States (loading/success/warning/error/disabled/selected/pressed/hover/empty/offline) · Animaties · Haptics · Performance · Business Rules · Acceptatiecriteria · UX-regels · Golden Rules · Veelgemaakte fouten · Verboden toepassingen · Toekomstige uitbreidingen.

Elke component krijgt daarnaast een plek in de vier afsluitende matrices: **Interaction Matrix**, **Component Relationship Matrix**, **Reusable Component Matrix** (koppeling aan Hoofdstuk 6-schermen), en **Design Token Mapping** (koppeling aan Hoofdstuk 5-tokens).

**Statusaanduiding:** 🟢 bestaand in v3.3.25 · 🟡 gedeeltelijk bestaand, hier uitgebreid · 🔴 nieuw, nog te bouwen.

---

## Deel 1 — Buttons

### 1.1 Primary Button 🟢

| Veld | Specificatie |
|---|---|
| Doel | De primaire, aanbevolen actie op een scherm activeren. |
| Beschrijving | Volledig gevulde knop, hoogste visuele nadruk van alle knoptypen. |
| Wanneer gebruiken | Eén keer per scherm/dialog, voor de belangrijkste actie (Product Principle P7). |
| Wanneer NIET gebruiken | Nooit twee keer op hetzelfde scherm; nooit voor een lage-impact/optionele actie. |
| Gebruiker | Alle gebruikers. |
| Context | Schermen, dialogs, bottom sheets — overal waar één duidelijke volgende stap nodig is. |
| Visuele hiërarchie | Hoogste van alle knoptypen; domineert visueel via kleurvulling, niet via grootte. |
| Afmetingen/Padding/Margins/Radius/Elevation | Hoogte 48dp, padding 12dp verticaal/24dp horizontaal, radius 12dp, elevatie 0 (Hoofdstuk 5, Deel 11). |
| Typography | Button-stijl: Poppins Bold, 15px (Hoofdstuk 5, Deel 4). |
| Iconen | Optioneel links van het label, 20×20px, zelfde kleur als tekst. |
| Kleuren | Light: `#0B1D2A`-achtergrond/witte tekst · Dark: `#00B894`-achtergrond/`#0B1D2A`-tekst (Hoofdstuk 5, Deel 3/13). |
| Accessibility | Min. 48dp touch-target; `role="button"` met beschrijvend label; toetsenbord-activeerbaar met Enter/Spatie; 2px `#00B894`-focusring met 2dp offset. |
| States | Loading: label vervangen door 16px-spinner, breedte ongewijzigd · Disabled: 40% dekking, geen interactie · Pressed: schaal 98%, 80ms · Hover (desktop): 8% donkerder · Success: kort vinkje vervangt label 800ms · Error: N.v.t. op knopniveau (fout via Feedback Patterns) · Empty/Offline: N.v.t. |
| Animaties | `motion-instant` (pressed), `motion-fast` (success-icoon). |
| Haptics | Lichte tik bij activeren. |
| Performance | Reactie binnen 100ms; geen layout-shift bij loading-state. |
| Business Rules | Nooit twee Primary Buttons gelijktijdig zichtbaar op hetzelfde scherm. |
| Acceptatiecriteria | Eén Primary Button per scherm; loading-state behoudt exacte breedte. |
| UX-regels | Hoofdstuk 3, Product Principle P7. |
| Golden Rules | Product Constitution VII, UX Constitution wet 2. |
| Veelgemaakte fouten | Twee Primary Buttons naast elkaar bij een "of"-keuze (gebruik dan Primary + Secondary). |
| Verboden toepassingen | Gebruik voor destructieve acties (gebruik Danger Button, 1.4). |
| Toekomstige uitbreidingen | Geen — dit component is bewust stabiel en simpel gehouden. |

### 1.2 Secondary Button 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een gelijkwaardig alternatief naast een Primary Button aanbieden, of een op zichzelf staande, niet-primaire actie. |
| Beschrijving | Outline-variant: transparante achtergrond, `#0B1D2A`-rand (light) / `#FFFFFF`-rand (dark). |
| Wanneer gebruiken | Naast een Primary Button bij twee gelijkwaardige keuzes (bijv. AI Coach: "Nee, gewoon starten" naast "Pas aan en start"); alleenstaand bij een belangrijke maar niet-primaire actie. |
| Wanneer NIET gebruiken | Nooit voor de enige actie op een scherm waar die actie duidelijk primair is. |
| Gebruiker | Alle gebruikers. |
| Context | Dialogs, AI-advies-scherm, formulieren. |
| Visuele hiërarchie | Direct onder Primary Button, boven Ghost Button. |
| Afmetingen/Padding/Margins/Radius/Elevation | Identiek aan Primary Button qua maatvoering, 1,5px randdikte. |
| Typography | Button-stijl, zelfde als Primary. |
| Iconen | Zelfde regels als Primary. |
| Kleuren | Rand en tekst `#0B1D2A` (light) / `#FFFFFF` (dark), transparante achtergrond. |
| Accessibility | Identiek aan Primary Button. |
| States | Zelfde structuur als Primary; Hover: lichte `#E6EBEF`-vulling; Pressed: lichte vulling + schaal 98%. |
| Animaties | Zelfde tokens als Primary. |
| Haptics | Lichte tik. |
| Performance | Identiek aan Primary. |
| Business Rules | Wanneer naast een Primary Button gebruikt, vertegenwoordigt de Secondary Button altijd de minder ingrijpende/minder aanbevolen keuze — nooit andersom (Product Principle P1). |
| Acceptatiecriteria | Visueel duidelijk ondergeschikt aan een gelijktijdig aanwezige Primary Button. |
| UX-regels | Hoofdstuk 3, Product Principle P1 (AI beslist nooit). |
| Golden Rules | Product Constitution I. |
| Veelgemaakte fouten | Secondary Button met evenveel visuele massa als Primary door een te dikke rand of te felle randkleur. |
| Verboden toepassingen | Gebruik voor destructieve acties. |
| Toekomstige uitbreidingen | Geen. |

### 1.3 Ghost Button 🟢

| Veld | Specificatie |
|---|---|
| Doel | Laagste-nadruk-actie: annuleren, overslaan, "meer info". |
| Beschrijving | Geen achtergrond, geen rand — uitsluitend tekst in merkkleur. |
| Wanneer gebruiken | "Annuleren" naast een impactvolle actie; "Overslaan" in onboarding. |
| Wanneer NIET gebruiken | Nooit als enige actie op een scherm dat een duidelijke primaire actie vereist. |
| Gebruiker | Alle gebruikers. |
| Context | Dialogs, onboarding, formulieren. |
| Visuele hiërarchie | Laagste van de drie basisknoptypen. |
| Afmetingen/Padding/Margins/Radius/Elevation | Hoogte 48dp (touch-target behouden ondanks visuele lichtheid), geen zichtbare achtergrond/radius. |
| Typography | Button-stijl, zelfde grootte, geen onderstreping (voorkomt verwarring met hyperlinks). |
| Iconen | Zelden gebruikt; indien aanwezig 16×16px. |
| Kleuren | Tekst `#0E3B4A` (light) / `#E6EBEF` (dark) — bewust minder prominent dan Primary/Secondary. |
| Accessibility | Identieke touch-target-eis (48dp) ondanks visuele lichtheid — geen kleiner tikgebied. |
| States | Pressed: lichte achtergrondtint verschijnt tijdelijk (enige visuele feedback); overige states minimaal. |
| Animaties | `motion-instant`. |
| Haptics | Zeer lichte tik. |
| Performance | Identiek aan Primary. |
| Business Rules | Gebruikt voor de minst ingrijpende optie in een keuzeset van twee of drie. |
| Acceptatiecriteria | Blijft tikbaar op volledige 48dp-hoogte ondanks visuele minimalisme. |
| UX-regels | Hoofdstuk 4, Deel 4 (Buttons). |
| Golden Rules | UX Constitution wet 2. |
| Veelgemaakte fouten | Ghost Button die met een hyperlink verward wordt door onderstreping toe te voegen. |
| Verboden toepassingen | Gebruik als enige actie op een formulier. |
| Toekomstige uitbreidingen | Geen. |

### 1.4 Danger Button 🟢

| Veld | Specificatie |
|---|---|
| Doel | Destructieve acties activeren (verwijderen, account opzeggen, programma stopzetten). |
| Beschrijving | Zelfde vorm als Primary Button, met `#B3454C`-achtergrond in plaats van merkkleur. |
| Wanneer gebruiken | Uitsluitend binnen een reeds bevestigende context (Confirmation Dialog, 9.5) — nooit als losstaande knop op een regulier scherm zonder voorafgaande bevestigingsstap. |
| Wanneer NIET gebruiken | Nooit voor een omkeerbare actie. |
| Gebruiker | Alle gebruikers. |
| Context | Confirmation Dialogs uitsluitend. |
| Visuele hiërarchie | Gelijk aan Primary Button qua gewicht, onderscheiden via kleur — nooit gecombineerd met een gelijktijdige Primary Button van een andere kleur op hetzelfde scherm. |
| Afmetingen/Padding/Margins/Radius/Elevation | Identiek aan Primary Button. |
| Typography | Button-stijl. |
| Iconen | Optioneel waarschuwing-icoon links. |
| Kleuren | `#B3454C`-achtergrond, witte tekst, in beide modi ongewijzigd (Hoofdstuk 5, Deel 3: Danger is bewust gedempt, geen fel alarmrood). |
| Accessibility | Zelfde als Primary; extra: nooit de eerste focus binnen een dialog (Hoofdstuk 5, Dialogs). |
| States | Loading: spinner tijdens verwerking van de destructieve actie, dialog blijft open · overige states zelfde structuur als Primary. |
| Animaties | Zelfde tokens als Primary. |
| Haptics | Middel-sterke, onderscheidende trilling bij activeren (verschilt van de lichte tik bij Primary). |
| Performance | Identiek aan Primary. |
| Business Rules | Verschijnt nooit zonder een voorafgaand Confirmation Dialog-scherm (Golden Rule UX37, Product Constitution VIII). |
| Acceptatiecriteria | Nooit de standaard-focus binnen zijn dialog. |
| UX-regels | Hoofdstuk 3, UX37. |
| Golden Rules | Product Constitution VIII. |
| Veelgemaakte fouten | Danger Button gebruiken voor een actie die eigenlijk omkeerbaar is (creëert onnodige angst). |
| Verboden toepassingen | Gebruik buiten een Confirmation Dialog-context. |
| Toekomstige uitbreidingen | Geen. |

### 1.5 Icon Button 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een compacte, herkenbare actie zonder tekstlabel activeren binnen een beperkte ruimte (headers, kaartkoppen). |
| Beschrijving | Enkel icoon binnen een cirkelvormig of vierkant-afgerond tikgebied, geen zichtbare achtergrond in rust. |
| Wanneer gebruiken | Terugknop, instellingen-icoon, sluiten-knop in dialogs, "meer opties"-menu-trigger. |
| Wanneer NIET gebruiken | Nooit voor een actie waarvan de betekenis niet universeel herkenbaar is via icoon alleen. |
| Gebruiker | Alle gebruikers. |
| Context | Headers, kaartkoppen, toolbars. |
| Visuele hiërarchie | Laag — ondersteunend, nooit primair. |
| Afmetingen/Padding/Margins/Radius/Elevation | 40×40px tikgebied (icoon zelf 24×24px, Hoofdstuk 5 Deel 8), volledig rond. |
| Typography | N.v.t. |
| Iconen | Lijnstijl, 1,5px (Hoofdstuk 5, Deel 8). |
| Kleuren | Icoon `#0B1D2A` (light) / `#FFFFFF` (dark); actieve/geselecteerde staat `#00B894`. |
| Accessibility | Verplicht `aria-label` (nooit enkel icoon zonder toegankelijke naam); min. 44×44px effectief tikgebied ondanks kleinere visuele afmeting. |
| States | Pressed: lichte achtergrondcirkel verschijnt (`#E6EBEF`/`#1A4557`) · Disabled: 40% dekking · overige minimaal. |
| Animaties | `motion-instant`. |
| Haptics | Zeer lichte tik. |
| Performance | Identiek aan overige knoppen. |
| Business Rules | Elk Icon Button heeft een ondubbelzinnige, universeel herkenbare betekenis of wordt aangevuld met een tooltip/label bij twijfel. |
| Acceptatiecriteria | Verplicht `aria-label` aanwezig; tikgebied minimaal 44×44px. |
| UX-regels | Hoofdstuk 3/4, Accessibility. |
| Golden Rules | UX Constitution wet 16 (touch-targets). |
| Veelgemaakte fouten | Icon Button zonder `aria-label` — meest voorkomende toegankelijkheidsfout in de huidige codebase (Product Audit, sectie 6). |
| Verboden toepassingen | Gebruik voor een primaire actie die tekst-context nodig heeft om begrepen te worden. |
| Toekomstige uitbreidingen | Geen. |

### 1.6 FAB (Floating Action Button) 🟢

| Veld | Specificatie |
|---|---|
| Doel | De meest frequente actie op een scherm direct en blijvend bereikbaar maken tijdens scrollen. |
| Beschrijving | Cirkelvormige, zwevende knop rechtsonder — zie volledige specificatie Hoofdstuk 5, Deel 11. |
| Wanneer gebruiken | Eén frequente toevoeg-actie per scherm (bijv. "Programma toevoegen"). |
| Wanneer NIET gebruiken | Nooit twee tegelijk; nooit voor een actie die ook al als primaire schermknop aanwezig is (redundantie). |
| Gebruiker | Alle gebruikers. |
| Context | Programma-overzicht, toekomstige lijst-schermen met een "toevoegen"-behoefte. |
| Visuele hiërarchie | Hoogste elevatie in de UI (niveau 2-3). |
| Afmetingen/Padding/Margins/Radius/Elevation | 56×56px, radius 28dp, elevatie 2 (rust)/3 (interactie) — Hoofdstuk 5, Deel 11. |
| Typography | N.v.t. (icoon-only) of Button-stijl bij "extended FAB" met kort label. |
| Iconen | 24×24px, wit, gecentreerd. |
| Kleuren | `#00B894`-achtergrond, wit icoon, ongewijzigd in beide modi. |
| Accessibility | Verplicht `aria-label`; 56px ruim boven de 44px-minimumeis. |
| States | Zelfde structuur als Hoofdstuk 5, Deel 11. |
| Animaties | Lichte schaalvergroting bij hover (desktop), `motion-instant` bij pressed. |
| Haptics | Lichte tik. |
| Performance | Identiek aan overige knoppen. |
| Business Rules | Overlapt nooit actief in te vullen content (Golden Rule UI19). |
| Acceptatiecriteria | Nooit meer dan één FAB tegelijk zichtbaar. |
| UX-regels | Hoofdstuk 3, UI17-19. |
| Golden Rules | Design Constitution wet (Hoofdstuk 5). |
| Veelgemaakte fouten | FAB toevoegen aan een scherm dat al een even prominente Primary Button heeft voor dezelfde actie. |
| Verboden toepassingen | Gebruik voor destructieve acties. |
| Toekomstige uitbreidingen | Speed-dial-variant (meerdere sub-acties bij long-press) indien een scherm ooit meerdere frequente toevoeg-acties krijgt — vereist herziening vóór bouw. |


### 1.7 Split Button 🔴

| Veld | Specificatie |
|---|---|
| Doel | Een primaire actie combineren met een compact toegankelijke set gerelateerde alternatieve acties. |
| Beschrijving | Primary Button met een aangrenzend, visueel gescheiden chevron-segment dat een klein contextmenu opent. |
| Wanneer gebruiken | Wanneer één actie duidelijk primair is maar een klein aantal (2-3) nauw verwante varianten nodig heeft (bijv. "Genereer programma" met varianten "Genereer voor 4 weken" / "Genereer voor 8 weken"). |
| Wanneer NIET gebruiken | Nooit wanneer de varianten evenwaardig zijn aan de hoofdactie (gebruik dan losse knoppen of een Dropdown). |
| Gebruiker | Ervaren gebruikers (Persona Daan) die snel een variant willen kiezen zonder een volledig formulier te doorlopen. |
| Context | Programmagenerator (toekomstige snelkeuze-uitbreiding), losse-oefening-opslaan-varianten. |
| Visuele hiërarchie | Gelijk aan Primary Button, met het chevron-segment duidelijk kleiner en visueel ondergeschikt. |
| Afmetingen/Padding/Margins/Radius/Elevation | Hoofdsegment identiek aan Primary Button; chevron-segment 40dp breed, gescheiden door een 1px verticale lijn op 20% dekking. |
| Typography | Button-stijl voor het hoofdlabel. |
| Iconen | Chevron-down in het smalle segment. |
| Kleuren | Identiek aan Primary Button, chevron-segment in een 10% donkerdere tint van dezelfde kleur. |
| Accessibility | Twee afzonderlijke, correct gelabelde tikgebieden; contextmenu navigeerbaar met pijltjestoetsen. |
| States | Contextmenu open/gesloten als extra state naast de standaard Button-states. |
| Animaties | Contextmenu verschijnt met `motion-fast` fade/scale-in. |
| Haptics | Lichte tik bij beide segmenten. |
| Performance | Contextmenu verschijnt binnen 100ms. |
| Business Rules | Maximaal drie varianten in het contextmenu — meer dan drie vereist een volwaardig formulier in plaats van een Split Button. |
| Acceptatiecriteria | Beide segmenten zijn onafhankelijk, correct getikt bruikbaar. |
| UX-regels | Hoofdstuk 4, Deel 4 (Contextmenu's). |
| Golden Rules | Product Principle P7 (één primair doel, hier: één primaire actie met beperkte varianten). |
| Veelgemaakte fouten | Te veel varianten in het contextmenu, waardoor het component zijn compacte voordeel verliest. |
| Verboden toepassingen | Gebruik voor volledig ongerelateerde acties in hetzelfde menu. |
| Toekomstige uitbreidingen | Dit component wordt pas gebouwd zodra een concrete schermbehoefte dit rechtvaardigt (momenteel geen scherm in Hoofdstuk 6 dat dit vereist) — status blijft 🔴 tot dan. |

### 1.8 Loading Button 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een knop die tijdens serververwerking zijn eigen bezig-status toont zonder de omliggende layout te verstoren. |
| Beschrijving | Dit is geen apart component maar een verplichte state van Primary/Secondary/Danger Button (1.1/1.2/1.4) — hier apart gedocumenteerd omdat de eis systeembreed en niet-optioneel is. |
| Wanneer gebruiken | Elke knop die een actie met serverbevestiging activeert (opslaan, versturen, genereren, verwijderen). |
| Wanneer NIET gebruiken | Nooit voor puur lokale, instant acties (bijv. een stepper-increment) — daar is geen loading-state nodig. |
| Gebruiker | Alle gebruikers. |
| Context | Elk formulier, elke destructieve actie, elke AI-gerelateerde actie. |
| Visuele hiërarchie | Identiek aan de onderliggende knop. |
| Afmetingen/Padding/Margins/Radius/Elevation | Exact ongewijzigd t.o.v. de rust-state — geen breedteverandering (voorkomt layout-shift). |
| Typography | Label verborgen tijdens loading, geen tekst zichtbaar naast de spinner. |
| Iconen | 16px-spinner, kleur gelijk aan het oorspronkelijke tekstlabel. |
| Kleuren | Identiek aan de onderliggende knop-state. |
| Accessibility | `aria-busy="true"` tijdens laden; screenreader kondigt "bezig" aan. |
| States | Dit ís de "Loading"-state van een ander component — geen eigen sub-states. |
| Animaties | Spinner roteert continu, `motion-loading-pulse`-achtige constante rotatie (360°/800ms). |
| Haptics | Geen aparte haptiek bovenop de knop-activatie zelf. |
| Performance | Verschijnt binnen 100ms na tik, verdwijnt zodra de server reageert (succes of fout). |
| Business Rules | Een knop in loading-state is nooit opnieuw tikbaar (voorkomt dubbele acties, aansluitend bij de bestaande dubbel-klik-bescherming). |
| Acceptatiecriteria | Geen layout-shift; knop niet opnieuw activeerbaar tijdens laden. |
| UX-regels | Hoofdstuk 3, UX21 (dubbele tik voorkomen). |
| Golden Rules | Product Constitution VIII, XIX. |
| Veelgemaakte fouten | Knopbreedte die verandert wanneer het label plaatsmaakt voor de spinner. |
| Verboden toepassingen | Geen — dit is een verplichte state, geen keuzecomponent. |
| Toekomstige uitbreidingen | Geen. |


---

## Deel 2 — Inputs

### 2.1 Text Field (basiscomponent) 🟢

| Veld | Specificatie |
|---|---|
| Doel | Vrije tekstinvoer verzamelen met foutpreventie. |
| Beschrijving | Rechthoekig invoerveld met zichtbaar label, optioneel icoon, optionele hulptekst. |
| Wanneer gebruiken | Elke vorm van tekst-, cijfer- of datuminvoer waarvoor geen specifieker component (stepper, dropdown) geschikter is. |
| Wanneer NIET gebruiken | Nooit voor numerieke waarden waar een Stepper (2.14) sneller en foutbestendiger is (gewicht, reps, RPE tijdens training). |
| Gebruiker | Alle gebruikers. |
| Context | Formulieren systeembreed (Profiel, Registreren, Onboarding, Feedback). |
| Visuele hiërarchie | Neutraal — onderscheidt zich niet visueel van omliggende content behalve via de veldrand. |
| Afmetingen/Padding/Margins/Radius/Elevation | Hoogte 48dp, padding 12dp verticaal/16dp horizontaal, radius 8dp, elevatie 0 (Hoofdstuk 5, Deel 11: Forms). |
| Typography | Body voor invoer, Caption voor label/hulptekst. |
| Iconen | Optioneel links (bijv. kalender-icoon bij datumvelden), 20×20px. |
| Kleuren | Rand `#E6EBEF` (rust) → `#00B894` (focus) → `#B3454C` (fout); achtergrond `#FFFFFF`/`#0E3B4A`. |
| Accessibility | Verplicht gekoppeld `<label>`; foutmelding gekoppeld via `aria-describedby`; min. 48dp hoogte. |
| States | Leeg (placeholder zichtbaar) · Ingevuld · Focus (2px teal rand) · Disabled (`#E6EBEF`-achtergrond, 60% tekstdekking) · Error (rode rand + foutmelding onder het veld) · Success (optioneel groen vinkje rechts bij expliciete validatie) · Offline: N.v.t. (lokale invoer altijd mogelijk). |
| Animaties | Randkleur-overgang `motion-fast` bij focus/blur. |
| Haptics | Geen bij tekstinvoer zelf. |
| Performance | Geen merkbare vertraging tussen toetsaanslag en weergave. |
| Business Rules | Verplichte velden gemarkeerd vóór invullen (Golden Rule UX7); ingevulde data verdwijnt nooit bij een fout elders in het formulier (UX8). |
| Acceptatiecriteria | Foutmelding verschijnt direct onder het veld binnen 100ms na validatie-trigger. |
| UX-regels | Hoofdstuk 3, UX5-8. |
| Golden Rules | Product Constitution — Forms-gerelateerde UX-regels. |
| Veelgemaakte fouten | Placeholder-tekst gebruiken als vervanging voor een echt `<label>` (onvoldoende voor schermlezers en verdwijnt bij invoer). |
| Verboden toepassingen | Gebruik voor numerieke invoer tijdens de actieve trainingsflow (gebruik Stepper). |
| Toekomstige uitbreidingen | Geen — dit is een stabiel basiscomponent. |

### 2.2 Text Field-varianten (compacte specificatie, delta t.o.v. 2.1)

| Variant | Status | Afwijking van de basis Text Field |
|---|---|---|
| **Search** | 🟢 | Pill-vormig (24dp radius, bewuste uitzondering — Hoofdstuk 5, Deel 11), vergrootglas-icoon links, wis-kruisje rechts zodra tekst aanwezig is, resultaten binnen 300ms (Golden Rule UX34). |
| **Number** | 🟢 | `inputmode="numeric"` voor het juiste toetsenbord; rechts uitgelijnde tekst; gebruikt uitsluitend waar een Stepper niet toepasbaar is (bijv. lengte in cm bij eenmalige profielinvoer). |
| **Password** | 🟢 | Verborgen tekens met een toegankelijke "toon wachtwoord"-toggle rechts; sterkte-indicator ook tekstueel omschreven. |
| **Email** | 🟢 | `inputmode="email"`, automatische validatie op `@`-formaat bij blur, geen live-validatie tijdens typen (voorkomt voortijdige foutmeldingen). |
| **Date** | 🔴 | Opent een systeemdatumkiezer of aangepaste kalender-bottom-sheet; toont het formaat expliciet in de hulptekst (dd-mm-jjjj). |
| **Time** | 🔴 | Opent een systeemtijdkiezer; gebruikt in check-in-context (slaaptijd). |
| **Weight** | 🟢 | Numeriek, gekoppeld aan een eenheid-label (kg) rechts binnen het veld; in trainingscontext vervangen door Stepper, dit veld uitsluitend voor eenmalige profielinvoer (lichaamsgewicht). |
| **RPE** | 🟢 | In trainingscontext altijd de RPE-Stepper (verticaal, bestaand patroon) — dit Text Field-format uitsluitend als fallback bij handmatige sessie-correctie achteraf. |
| **Percentage** | 🟢 | Numeriek met `%`-suffix, gebruikt bij 1RM-percentage-invoer buiten de sneltoets-chips (50/60/70/80/90/95/100%) om. |

### 2.3 Dropdown 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 11. Aanvullende bouwbaarheids-details:

| Veld | Specificatie |
|---|---|
| Interaction Matrix (aanvullend) | Tap: opent paneel · Keyboard: pijltjestoetsen navigeren, Enter selecteert, Escape sluit · Screen reader: `role="listbox"`, actieve optie aangekondigd bij elke wijziging. |
| Business Rules | Bij meer dan acht opties: automatisch een zoekbalk bovenaan het uitklap-paneel (overgang naar Autocomplete-gedrag, 2.4). |
| Veelgemaakte fouten | Een Dropdown gebruiken voor minder dan drie opties (gebruik dan Radio Buttons of Segment Control, direct zichtbaar zonder extra tik). |

### 2.4 Autocomplete 🟡

| Veld | Specificatie |
|---|---|
| Doel | Snel een specifiek item vinden uit een grote lijst via tekstinvoer die live filtert. |
| Beschrijving | Text Field die tijdens typen een filterend Dropdown-paneel toont. |
| Wanneer gebruiken | Oefeningbibliotheek-zoekfunctie, ledenlijst bij grote gyms (meer dan twintig items). |
| Wanneer NIET gebruiken | Nooit voor lijsten korter dan acht items (gebruik gewone Dropdown). |
| Gebruiker | Alle gebruikers. |
| Context | Oefening zoeken (Scherm 3.3, Hoofdstuk 6), Team-ledenlijst. |
| Visuele hiërarchie | Zelfde als Text Field, met een zwevend resultatenpaneel (elevatie 2) eronder. |
| Afmetingen/Padding/Margins/Radius/Elevation | Veld identiek aan Text Field; resultatenpaneel radius 8dp, elevatie 2. |
| Typography | Body voor invoer en resultaten, gezocht deel van de tekst optioneel uitgelicht in Bold. |
| Iconen | Vergrootglas links in het veld. |
| Kleuren | Identiek aan Text Field/Dropdown. |
| Accessibility | Resultatenaantal aangekondigd voor schermlezers na elke wijziging (Golden Rule UX-checklist #149). |
| States | Leeg (toont recent gebruikte items als suggestie) · Typend (live filterend) · Resultaten getoond · Geen resultaten (Golden Rule UX35: alternatief tonen). |
| Animaties | Resultaten verschijnen met lichte fade-in naarmate ze binnenkomen. |
| Haptics | N.v.t. tijdens typen. |
| Performance | Resultaten binnen 300ms na de laatste toetsaanslag (Golden Rule UX34). |
| Business Rules | Toont bij een lege invoer de meest recent gebruikte items, niet een lege lijst — versnelt herhaald gebruik. |
| Acceptatiecriteria | Geen resultaat toont altijd een alternatief/CTA, nooit een doodlopend pad. |
| UX-regels | Hoofdstuk 4, Deel 4 (Zoekfunctie). |
| Golden Rules | UX Constitution wet gerelateerd aan zoekfunctie-snelheid. |
| Veelgemaakte fouten | Resultaten pas tonen na een volledige zoekterm in plaats van live filteren. |
| Verboden toepassingen | Gebruik voor een verplichte, korte keuzelijst. |
| Toekomstige uitbreidingen | Fuzzy-matching (tolerantie voor typefouten) bij oefeningnamen. |


### 2.5 Slider 🟡

| Veld | Specificatie |
|---|---|
| Doel | Een continue waarde binnen een brede range instellen waar exacte precisie minder kritiek is dan bij een Stepper. |
| Beschrijving | Horizontale baan met een verschuifbare handle. |
| Wanneer gebruiken | Zeldzaam in TrainingKompas — bijvoorbeeld een geschatte inspanningsrange bij een globale instelling (niet tijdens training). |
| Wanneer NIET gebruiken | Nooit voor gewicht, reps, RPE of enige waarde die exacte precisie vereist tijdens het trainen (gebruik Stepper, 2.14). |
| Gebruiker | Alle gebruikers, buiten de kernflow. |
| Context | Uitzonderlijke instellingen-context (bijv. een toekomstige "algemene intensiteitsvoorkeur"-instelling). |
| Visuele hiërarchie | Neutraal, ondersteunend component. |
| Afmetingen/Padding/Margins/Radius/Elevation | Baan 4dp hoogte, handle 24×24px, volledig rond. |
| Typography | Live waardeweergave in Statistic-stijl boven de handle tijdens het schuiven. |
| Iconen | Geen. |
| Kleuren | Gevuld gedeelte `#00B894`, ongevuld `#E6EBEF`/`#1A4557`, handle wit met teal rand. |
| Accessibility | Bedienbaar met toetsenbord-pijltjes; `role="slider"` met `aria-valuenow/min/max`. |
| States | Rust, actief slepend, disabled (40% dekking). |
| Animaties | Handle-beweging vloeiend zonder vertraging, live waarde-update. |
| Haptics | Lichte tik bij elke waarde-increment indien discrete stappen. |
| Performance | Geen merkbare vertraging tussen sleepbeweging en waarde-update. |
| Business Rules | Nooit gebruikt voor waarden die in de trainingsflow voorkomen (Product Principle-gedreven uitsluiting). |
| Acceptatiecriteria | Waarde-update binnen 16ms van de sleepbeweging (60fps-gevoel). |
| UX-regels | Hoofdstuk 4, Deel 4 (Sliders: wanneer niet gebruiken). |
| Golden Rules | UX Constitution — precisie-eis voor trainingsdata. |
| Veelgemaakte fouten | Slider gebruiken voor gewichtsinvoer (verkeerde precisie voor de context). |
| Verboden toepassingen | Elke trainingsdata-invoer. |
| Toekomstige uitbreidingen | Mogelijk voor een toekomstige "gewenste trainingsintensiteit deze week"-globale instelling. |

### 2.6 Segment Control 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 11 (Tabs/Segment Controls). Aanvullend:

| Veld | Specificatie |
|---|---|
| Interaction Matrix (aanvullend) | Tap: directe selectie · Swipe: N.v.t. (geen swipe-navigatie tussen segmenten, voorkomt onbedoelde wissel) · Keyboard: pijltjestoetsen binnen de groep. |
| Business Rules | Maximaal vier opties (Golden Rule UI-checklist #170) — bij meer opties: Dropdown of Tabs met scroll gebruiken in plaats van een overvolle Segment Control. |

### 2.7 Stepper 🟢

| Veld | Specificatie |
|---|---|
| Doel | Numerieke waarden (gewicht, reps, RPE, duur) snel en precies aanpassen tijdens fysieke inspanning. |
| Beschrijving | Twee knoppen (+/-) rondom een centraal cijferveld; RPE-variant verticaal georiënteerd (bestaand patroon). |
| Wanneer gebruiken | Systeembreed standaard voor elke numerieke trainingsinvoer (Golden Rule UX5). |
| Wanneer NIET gebruiken | Nooit voor tekst of niet-numerieke keuzes. |
| Gebruiker | Alle trainende gebruikers — een van de meest gebruikte componenten in de hele app. |
| Context | Set logging (Scherm 3.4, Hoofdstuk 6), Plate Calculator, Programmagenerator-parameters. |
| Visuele hiërarchie | Prominent binnen de Workout Card. |
| Afmetingen/Padding/Margins/Radius/Elevation | Increment-knoppen minimaal 44×44px, ruim uit elkaar (Golden Rule UI113); cijferveld Workout-typografiestijl (18px Bold). |
| Typography | Workout-stijl voor de waarde tijdens training, Statistic elders. |
| Iconen | "+" en "-" iconen, 20×20px. |
| Kleuren | Knoppen `#E6EBEF`-achtergrond (light) / `#1A4557` (dark), cijfer in primaire tekstkleur. |
| Accessibility | Elke increment-knop apart aangekondigd voor schermlezers ("verhoog gewicht met 2,5kg"); toetsenbord-pijltjes werken als alternatief op desktop. |
| States | Rust · Pressed (pulse-animatie 80ms) · Disabled (bijv. reps niet onder 1) · Focus (2px rand). |
| Animaties | Korte pulse-animatie bij elke increment-tik (`motion-instant`). |
| Haptics | Zeer lichte tik per increment, sterkere tik bij het bereiken van een grens (bijv. 0). |
| Performance | Directe waarde-update, geen merkbare vertraging. |
| Business Rules | Increment-waarden gekoppeld aan apparatuurtype waar beschikbaar (2,5kg vrije gewichten, apparaatspecifieke stappen bij machines); tekstinvoer blijft beschikbaar als fallback voor afwijkende waarden. |
| Acceptatiecriteria | Elke increment reageert binnen 100ms; grenswaarden (bijv. reps ≥1) worden nooit overschreden. |
| UX-regels | Hoofdstuk 3, UX5; Hoofdstuk 4, Deel 4. |
| Golden Rules | Product Constitution XIX. |
| Veelgemaakte fouten | Increment-knoppen te dicht bij elkaar geplaatst, wat tijdens fysieke inspanning tot verkeerde tikken leidt. |
| Verboden toepassingen | Gebruik voor niet-numerieke selecties. |
| Toekomstige uitbreidingen | Spraakinvoer als aanvullend alternatief tijdens training (Hoofdstuk 6, Scherm 3.4). |


---

## Deel 3 — Selection

### 3.1 Checkbox, Switch, Radio Button 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 11. Aanvullende bouwbaarheids-details, gezamenlijk beschreven omdat de drie componenten identieke interactiepatronen delen met uitsluitend visueel onderscheid:

| Veld | Checkbox | Switch | Radio Button |
|---|---|---|---|
| Interaction Matrix — Tap | Toggle aan/uit | Toggle aan/uit met schuifbeweging | Selecteert, deselecteert de rest van de groep |
| Interaction Matrix — Keyboard | Spatiebalk | Spatiebalk | Pijltjestoetsen binnen groep |
| Interaction Matrix — Screen reader | `role="checkbox"`, `aria-checked` | `role="switch"`, `aria-checked` | `role="radio"` binnen `role="radiogroup"` |
| Business Rules | Multi-select, geen impliciete volgorde-afhankelijkheid | Directe systeemwijziging, geen "opslaan"-stap nodig | Exclusieve keuze, altijd een default-selectie aanwezig |
| Veelgemaakte fouten | Checkbox gebruiken voor een exclusieve keuze (gebruik Radio Button) | Switch gebruiken voor een actie die bevestiging vereist (gebruik Button + Dialog) | Radiogroep zonder default-selectie, wat een "geen keuze"-status impliceert die vaak onbedoeld is |

### 3.2 Chips (basiscomponent) 🟢

| Veld | Specificatie |
|---|---|
| Doel | Compacte, tikbare labels voor filtering, categorisatie of korte tags. |
| Beschrijving | Pill-vormig label, mag een icoon en/of verwijder-kruisje bevatten. |
| Wanneer gebruiken | Filters, sportcategorieën, spiergroep-tags. |
| Wanneer NIET gebruiken | Nooit voor een enkelvoudige, verplichte keuze (gebruik Radio Button of Segment Control). |
| Gebruiker | Alle gebruikers. |
| Context | Stats-filters, oefeningbibliotheek-tags, onboarding-sportkeuze (indien als chips-grid weergegeven). |
| Visuele hiërarchie | Laag-tot-middel, ondersteunend aan de hoofdinhoud. |
| Afmetingen/Padding/Margins/Radius/Elevation | Hoogte 32dp, padding 8dp horizontaal, radius 16dp (volledig pill-vormig). |
| Typography | Caption, Bold bij geselecteerde staat. |
| Iconen | Optioneel links (categorie-icoon), optioneel rechts (verwijder-kruisje bij Tags-variant). |
| Kleuren | Rust: `#E6EBEF`-achtergrond/donkere tekst · Geselecteerd: `#00B894`-achtergrond/witte tekst + vinkje-icoon (nooit kleur alleen, Golden Rule UX2). |
| Accessibility | Actieve staat via kleur én icoon; chipsgroep aangekondigd als groep met individuele status per chip. |
| States | Rust · Geselecteerd · Disabled (40% dekking) · Pressed (korte kleurovergang, 100ms). |
| Animaties | Korte kleur/rand-overgang bij selectie (`motion-fast`). |
| Haptics | Lichte tik. |
| Performance | Directe visuele feedback bij selectie. |
| Business Rules | Filterchips zijn nooit verplicht om een basisoverzicht te zien (Golden Rule UX29). |
| Acceptatiecriteria | Actieve staat altijd via kleur én icoon te onderscheiden. |
| UX-regels | Hoofdstuk 3, UX29; Hoofdstuk 5, Deel 11. |
| Golden Rules | UX Constitution wet 14 (kleur nooit enige informatiedrager). |
| Veelgemaakte fouten | Chips-rij die afgekapt wordt zonder scroll-indicatie bij te veel opties. |
| Verboden toepassingen | Gebruik voor een primaire, verplichte actie. |
| Toekomstige uitbreidingen | Geen op basisniveau. |

### 3.3 Filter Chips, Choice Chips, Tags (varianten van 3.2)

| Variant | Status | Afwijking van de basis Chip |
|---|---|---|
| **Filter Chips** | 🟢 | Multi-select toegestaan (meerdere gelijktijdig actief), gebruikt in Stats-filters (sport/type/spiergroep). |
| **Choice Chips** | 🟢 | Single-select binnen een groep (functioneel gelijk aan Radio Buttons maar compacter), gebruikt bij sportkeuze in onboarding wanneer als horizontale rij weergegeven. |
| **Tags** | 🔴 | Bevat altijd een verwijder-kruisje rechts; gebruikt voor door de gebruiker zelf toegevoegde labels (bijv. een aangepaste categorie bij een eigen samengestelde workout) — nog niet gebouwd, potentiële uitbreiding bij de Workouts-functionaliteit. |


---

## Deel 4 — Navigation

### 4.1 Bottom Navigation 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 11. Aanvullend:

| Veld | Specificatie |
|---|---|
| Interaction Matrix | Tap: navigeert direct · Long press: N.v.t. · Swipe: N.v.t. (voorkomt onbedoelde tab-wissel tijdens scrollen) · Keyboard: Tab-toets doorloopt items, Enter activeert · Screen reader: elk item aangekondigd met naam + actieve status · Offline: alle vijf items blijven bereikbaar, individuele schermen tonen eigen offline-gedrag. |
| Business Rules | Verdwijnt uitsluitend tijdens actieve trainingssessie of fullscreen-modal (Golden Rule UI20); volgorde nooit wijzigend tussen schermen. |
| Veelgemaakte fouten | Een zesde item toevoegen zonder herziening van dit Handbook (Screen Design Laws, Hoofdstuk 6, wet 6). |

### 4.2 Top App Bar 🟢

| Veld | Specificatie |
|---|---|
| Doel | Schermtitel en primaire scherm-gebonden acties (instellingen, sluiten, filter) consistent positioneren. |
| Beschrijving | Horizontale balk bovenaan elk scherm met titel links/gecentreerd en maximaal twee Icon Buttons rechts. |
| Wanneer gebruiken | Elk hoofdscherm en subscherm, behalve Splash en de actieve trainingsflow (die een eigen `train-top`-variant gebruikt, zie 8.9). |
| Wanneer NIET gebruiken | Nooit met meer dan twee acties rechts (leidt tot overvolle header — gebruik een "meer opties"-Icon Button die een contextmenu opent bij meer dan twee acties). |
| Gebruiker | Alle gebruikers. |
| Context | Systeembreed. |
| Visuele hiërarchie | Vast bovenaan, niet meescrollend met de content (sticky). |
| Afmetingen/Padding/Margins/Radius/Elevation | Hoogte 56dp + veilige-zone-marge bovenaan, elevatie 1 wanneer content eronder scrollt (visuele scheiding), elevatie 0 wanneer bovenaan het scherm. |
| Typography | Headline (schermtitel) of Title (subschermtitel). |
| Iconen | Icon Buttons (4.3/1.5) rechts, optioneel Back Button (4.3) links. |
| Kleuren | Achtergrond gelijk aan de schermachtergrond (`#E6EBEF`/`#0B1D2A`) — geen contrasterende balkkleur, sluit aan bij de bestaande, rustige `.hdr`-stijl. |
| Accessibility | Titel als `<h1>`/hoofding voor schermlezers; acties met duidelijke `aria-label`. |
| States | Vast (rust), elevatie-overgang bij scrollen. |
| Animaties | Elevatie-overgang vloeiend bij scroll-start (`motion-fast`). |
| Haptics | Geen op de balk zelf; wel op de acties erin. |
| Performance | Geen merkbare vertraging bij de elevatie-overgang. |
| Business Rules | Titel is altijd aanwezig, behalve op Splash en tijdens de actieve trainingsflow. |
| Acceptatiecriteria | Maximaal twee acties rechts zonder "meer opties"-menu. |
| UX-regels | Hoofdstuk 6, schermspecificaties (Header-veld bij elk scherm). |
| Golden Rules | Product Principle P7. |
| Veelgemaakte fouten | Een derde actie toevoegen zonder over te schakelen naar een contextmenu. |
| Verboden toepassingen | Gebruik als primaire actielocatie (dat blijft de schermcontent, niet de header). |
| Toekomstige uitbreidingen | Zoekicoon binnen de Top App Bar op schermen met een grote, doorzoekbare lijst (bijv. toekomstige uitbreiding van Team-ledenlijst). |

### 4.3 Back Button 🟢

| Veld | Specificatie |
|---|---|
| Doel | Terugnavigeren naar het vorige, voorspelbare scherm. |
| Beschrijving | Icon Button-variant (chevron-left), links in de Top App Bar. |
| Wanneer gebruiken | Elk subscherm dat is bereikt via een voorwaartse navigatie-actie. |
| Wanneer NIET gebruiken | Nooit op een hoofdscherm van de bottom-navigatie (die schermen zijn geen "sub"-niveau). |
| Gebruiker | Alle gebruikers. |
| Context | Systeembreed op subschermen. |
| Visuele hiërarchie | Zelfde als Icon Button (1.5). |
| Afmetingen/Padding/Margins/Radius/Elevation | Identiek aan Icon Button. |
| Typography | N.v.t. |
| Iconen | Chevron-left, 24×24px. |
| Kleuren | Identiek aan Icon Button. |
| Accessibility | `aria-label="Terug"`; werkt consistent met de fysieke/systeem-terugknop (Golden Rule UX3). |
| States | Identiek aan Icon Button. |
| Animaties | Schermovergang bij activeren: omgekeerde richting van de binnenkomende overgang (`motion-standard`). |
| Haptics | Lichte tik. |
| Performance | Directe navigatie, geen tussenladen. |
| Business Rules | Brengt de gebruiker altijd naar een voorspelbare vorige staat (Golden Rule UX3) — nooit naar een onverwacht scherm. |
| Acceptatiecriteria | Gedrag consistent met systeem-terugnavigatie (swipe-back op iOS, hardware-terugknop op Android). |
| UX-regels | Hoofdstuk 3, UX3. |
| Golden Rules | UX Constitution — navigatie-voorspelbaarheid. |
| Veelgemaakte fouten | Back Button die naar een ander scherm navigeert dan de systeem-terugknop op hetzelfde moment zou doen (inconsistentie). |
| Verboden toepassingen | Gebruik tijdens een actieve trainingssessie zonder bevestiging (mogelijk dataverlies-risico, zie UX-Foutmeldingen Hoofdstuk 3). |
| Toekomstige uitbreidingen | Geen. |


### 4.4 Breadcrumb 🔴

| Veld | Specificatie |
|---|---|
| Doel | De hiërarchische locatie binnen een diepere navigatiestructuur tonen (bijv. Gym > Team > Lid-detail). |
| Beschrijving | Horizontale reeks tekstlabels gescheiden door chevron-scheidingstekens, elk klikbaar behalve het laatste (huidige) item. |
| Wanneer gebruiken | Uitsluitend in rolgebonden dashboards (toekomstig coach-/owner-dashboard) waar navigatiediepte groter is dan de reguliere atleet-ervaring. |
| Wanneer NIET gebruiken | Nooit in de atleet-gerichte kernervaring — die blijft bewust ondiep (Hoofdstuk 3, UX4: max. drie niveaus diep, meestal voldoende zonder breadcrumb). |
| Gebruiker | Coach/manager/owner (Persona Iris, Bram, Tom). |
| Context | Toekomstig coach-dashboard, owner-dashboard (Fase 3-4). |
| Visuele hiërarchie | Laag, ondersteunend, boven de Top App Bar-titel. |
| Afmetingen/Padding/Margins/Radius/Elevation | Hoogte 24dp, geen achtergrond/radius. |
| Typography | Caption. |
| Iconen | Chevron-right als scheidingsteken. |
| Kleuren | Niet-actieve items `#0E3B4A`/lichtgrijs, huidige item `#0B1D2A`/wit (bold). |
| Accessibility | `aria-label="Breadcrumb"` op de container, huidige item met `aria-current="page"`. |
| States | Statisch, geen interactiestaten behalve hover/pressed op klikbare items. |
| Animaties | Geen. |
| Haptics | Lichte tik bij navigatie. |
| Performance | Directe navigatie. |
| Business Rules | Alleen gebruikt bij daadwerkelijke navigatiediepte van drie of meer niveaus. |
| Acceptatiecriteria | Het huidige niveau is nooit klikbaar. |
| UX-regels | Hoofdstuk 3, UX4. |
| Golden Rules | Product Principle P16 (complexiteit naar de juiste doelgroep — hier bewust beperkt tot rolgebonden schermen). |
| Veelgemaakte fouten | Breadcrumb toevoegen aan de atleet-kernervaring waar het overbodige complexiteit toevoegt. |
| Verboden toepassingen | Gebruik in de reguliere, ondiepe atleet-navigatie. |
| Toekomstige uitbreidingen | Wordt pas gebouwd zodra het coach-/owner-dashboard (Fase 3-4) daadwerkelijk in ontwikkeling gaat. |

### 4.5 Tabs 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 11 (Tabs / Segment Controls). Aanvullend, specifiek voor het Tabs-gebruik (onderscheiden van Segment Control door context — Tabs wisselen volledige content-secties, Segment Control wisselt een weergavemodus binnen dezelfde content):

| Veld | Specificatie |
|---|---|
| Interaction Matrix | Tap: wisselt content-sectie · Swipe (optioneel): horizontale swipe tussen tabs toegestaan wanneer de content zelf niet horizontaal scrollbaar is (voorkomt gebaar-conflict) · Keyboard: pijltjestoetsen. |
| Business Rules | Gebruikt voor content-secties (Team: Leden/Wijzigingslog), Segment Control voor weergave-modi (Stats: dag/week/maand) — dit onderscheid is bindend en voorkomt component-verwarring. |

### 4.6 Segment Navigation 🟢

Dit is de toepassing van Segment Control (2.6) specifiek in een navigatie-context (bijv. sportwissel-navigatie). Geen aparte specificatie nodig — verwijst volledig naar 2.6.

### 4.7 Drawer 🔴

| Veld | Specificatie |
|---|---|
| Doel | Een zijpaneel-navigatie bieden voor bredere schermformaten (tablet/desktop coach-/owner-dashboards) waar bottom-navigatie minder geschikt is. |
| Beschrijving | Verticaal zijpaneel met navigatie-items, permanent zichtbaar op desktop-breedte, inklapbaar op tablet. |
| Wanneer gebruiken | Uitsluitend binnen rolgebonden dashboards op tablet/desktop-breedte (Hoofdstuk 5, Deel 6: Grid System). |
| Wanneer NIET gebruiken | Nooit in de mobiele atleet-kernervaring — die behoudt de bottom-navigatie op elk formaat (Hoofdstuk 5, Deel 6: trainingsflow blijft single-column ook op tablet). |
| Gebruiker | Coach/manager/owner op tablet/desktop. |
| Context | Toekomstig coach-/owner-dashboard. |
| Visuele hiërarchie | Permanent zichtbaar naast de hoofdcontent op desktop. |
| Afmetingen/Padding/Margins/Radius/Elevation | Breedte 240dp (uitgeklapt) / 72dp (ingeklapt, iconen-only), elevatie 1. |
| Typography | Body voor navigatielabels. |
| Iconen | Lijnstijl-iconen, consistent met Bottom Navigation-iconografie. |
| Kleuren | Achtergrond `#FFFFFF`/`#0E3B4A`, actief item `#00B894`-accent. |
| Accessibility | `role="navigation"`, huidige item met `aria-current`. |
| States | Uitgeklapt, ingeklapt, item-actief. |
| Animaties | Vloeiende breedte-overgang bij in-/uitklappen (`motion-standard`). |
| Haptics | N.v.t. (desktop-primair). |
| Performance | Directe overgang. |
| Business Rules | Verschijnt nooit op de mobiele atleet-schermen, uitsluitend op tablet/desktop rolgebonden dashboards. |
| Acceptatiecriteria | Navigatie-items identiek aan de onderliggende informatiearchitectuur van het dashboard. |
| UX-regels | Hoofdstuk 5, Deel 6 (Grid System). |
| Golden Rules | Design Constitution — mobiele kern blijft single-column. |
| Veelgemaakte fouten | Drawer proberen te introduceren in de mobiele atleet-ervaring (expliciet verboden). |
| Verboden toepassingen | De reguliere atleet-app op elk schermformaat. |
| Toekomstige uitbreidingen | Wordt pas gebouwd zodra het coach-/owner-dashboard in ontwikkeling gaat (Fase 3-4). |


### 4.8 Bottom Sheet 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 11. Aanvullend:

| Veld | Specificatie |
|---|---|
| Interaction Matrix | Tap buiten sheet: sluit · Swipe down: sluit (drempel 30% van sheet-hoogte, terugveren bij onvoltooide swipe via `motion-spring-gentle`) · Keyboard: Escape sluit, Tab blijft binnen de sheet (focus-trap) · Screen reader: focus verplaatst automatisch bij openen. |
| Business Rules | Gebruikt voor keuzelijsten (rusttimer, plate calculator); nooit voor content die een volledige aparte pagina rechtvaardigt (gebruik dan schermnavigatie). |

---

## Deel 5 — Cards

### 5.1 Workout, Exercise, Recovery, AI, Analytics Cards 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 11 (alle vijf domeinkaarten volledig gespecificeerd). Interaction Matrix aanvullend, gezamenlijk beschreven omdat de vijf kaarttypen identieke basisinteracties delen:

| Kaarttype | Tap | Long press | Swipe | Screen reader |
|---|---|---|---|---|
| Workout Card | Vouwt oefening open/dicht | N.v.t. | N.v.t. (voorkomt onbedoeld wissen tijdens training) | Leest oefeningnaam + huidige set-status |
| Exercise Card | Navigeert naar detail of voegt toe aan sessie | Opent contextmenu (bewerken/verwijderen uit bibliotheek) | N.v.t. | Leest naam + spiergroep-tags |
| Recovery Card | Toont detail per spiergroep | N.v.t. | N.v.t. | Leest hersteltoestand per spiergroep met percentage |
| AI Card | Vouwt "waarom dit advies" open | N.v.t. | N.v.t. | Leest berichttype + volledige inhoud |
| Analytics Card | Navigeert naar volledige grafiek/detail | N.v.t. | N.v.t. | Leest kerncijfer + trendrichting |

### 5.2 Progress Card 🔴

| Veld | Specificatie |
|---|---|
| Doel | Voortgang richting een specifiek doel (week/maand, programma-mesocyclus) visueel en tekstueel tonen. |
| Beschrijving | Kaart met een Progress-balk of -ring (Hoofdstuk 5, Deel 11), kerncijfer, en korte context. |
| Wanneer gebruiken | Doelen-scherm (Hoofdstuk 6, 7.1), Dashboard-weekvoortgang, programma-mesocyclus-overzicht. |
| Wanneer NIET gebruiken | Nooit voor data zonder een duidelijk, meetbaar eindpunt (gebruik dan Analytics Card). |
| Gebruiker | Alle gebruikers. |
| Context | Doelen, Dashboard, Programma-overzicht. |
| Visuele hiërarchie | Middel — ondersteunend aan de primaire schermactie. |
| Afmetingen/Padding/Margins/Radius/Elevation | Identiek aan de basis Card-specificatie (Hoofdstuk 5, Deel 11): 16dp padding, 12dp radius, elevatie 1. |
| Typography | Statistic voor het kerncijfer/percentage, Caption voor de contextregel. |
| Iconen | Optioneel een doel-icoon (Hoofdstuk 5, Deel 8). |
| Kleuren | Voortgangsbalk/-ring in `#00B894`; bij een dreigende deadline zonder voldoende voortgang: `#C8A84B`-accent (waarschuwend, nooit bestraffend, Product Constitution II). |
| Accessibility | Voortgang ook tekstueel weergegeven ("3 van 4 trainingen"), nooit enkel via balkvulling. |
| States | Actief lopend · Behaald (teal, met korte pulse-viering) · Verlopen zonder behaald te zijn (neutraal weergegeven, nooit bestraffend geframed). |
| Animaties | Balk/ring vult vloeiend mee met daadwerkelijke voortgang (nooit misleidend, Hoofdstuk 4 Deel 5). |
| Haptics | Positieve trilling bij het behalen van het doel. |
| Performance | Directe weergave van actuele voortgang bij elk bezoek. |
| Business Rules | Doelen zijn door de gebruiker ingesteld of met onderbouwing voorgesteld, nooit eenzijdig opgelegd (Hoofdstuk 3, Deel 6). |
| Acceptatiecriteria | Voortgang klopt exact met de onderliggende sessiedata. |
| UX-regels | Hoofdstuk 6, Scherm 7.1 (Doelen). |
| Golden Rules | Product Constitution XX (geen manipulatieve druk). |
| Veelgemaakte fouten | Een verlopen, niet-behaald doel visueel als "mislukking" framen in plaats van neutraal. |
| Verboden toepassingen | Gebruik voor door het systeem afgedwongen, niet-aanpasbare doelen. |
| Toekomstige uitbreidingen | Koppeling aan gym-brede doelen (7.4 Gym) zodra het social/competitief-traject concreet wordt (DEC-008). |


### 5.3 Goal Card, Challenge Card, Gym Card, Coach Card 🔴

Vier verwante kaarttypen, gezamenlijk gespecificeerd omdat ze structureel identiek zijn aan Progress Card (5.2) met een verschillend content-domein — elk erft padding/radius/elevation/typography-basis van Hoofdstuk 5, Deel 11.

| Kaarttype | Doel | Kerninhoud | Specifiek gedrag | Business Rule |
|---|---|---|---|---|
| **Goal Card** | Eén individueel doel tonen (zie ook Progress Card, waarmee dit nauw verwant is — Goal Card is de kaart in de lijst, Progress Card het herbruikbare voortgangs-component erbinnen) | Doelomschrijving, voortgang, deadline | Tap opent detail/bewerken | Nooit standaard ingesteld zonder gebruikersactie |
| **Challenge Card** | Eén uitdaging tonen (Hoofdstuk 6, 7.2) | Titel, duur, deelnamestatus | Tap toont detail, aparte "Doe mee"-knop | Nooit vooraf aangevinkt/verplicht (Product Constitution XX) |
| **Gym Card** | Gym-identiteit en kerninfo tonen (Hoofdstuk 6, 7.4) | Gym-naam (met skin-kleuren indien actief), locatie, ledenaantal | Tap navigeert naar volledig Gym-scherm | Trainingskompas-naam blijft zichtbaar naast gym-branding (Product Constitution XI) |
| **Coach Card** | Een menselijke coach (niet AI) representeren binnen Team-context | Naam, rol-badge, laatste activiteit | Tap navigeert naar coach-detail (toekomstig coach-profiel) | Visueel duidelijk onderscheiden van AI Card (geen spraakballon-met-naald-icoon) om verwarring tussen menselijke coach en AI-coach te voorkomen (Hoofdstuk 5, Deel 8) |

**Gedeelde Interaction Matrix (alle vier):** Tap navigeert naar detail · Long press: N.v.t. · Swipe: N.v.t. · Keyboard: focus + Enter · Screen reader: kerninhoud in logische volgorde voorgelezen.

**Gedeelde Accessibility:** kleurcodering (bijv. deelnamestatus, rol-badge) altijd met tekstueel label, nooit kleur alleen.

**Gedeelde Toekomstige uitbreidingen:** deze vier kaarttypen worden actief zodra de onderliggende functionaliteit (Doelen, Challenges, Gym-branding, Coach-rollen) buiten de basisvorm groeit — zie de respectievelijke schermspecificaties in Hoofdstuk 6.


---

## Deel 6 — Lists

### 6.1 Simple List 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een reeks gelijksoortige items tonen zonder groepering of hiërarchie. |
| Beschrijving | Verticale opeenvolging van lijst-items, gescheiden door dunne dividers of witruimte. |
| Wanneer gebruiken | Instellingenlijst (8.3, Hoofdstuk 6), eenvoudige oefeningresultaten. |
| Wanneer NIET gebruiken | Nooit voor data die natuurlijke groepen heeft (gebruik Grouped List, 6.2). |
| Gebruiker | Alle gebruikers. |
| Context | Instellingen, korte resultatenlijsten. |
| Visuele hiërarchie | Neutraal, elk item gelijkwaardig tenzij anders aangegeven. |
| Afmetingen/Padding/Margins/Radius/Elevation | Item-hoogte minimaal 48dp, padding 16dp horizontaal, 1px divider `#E6EBEF`/`#1A4557`. |
| Typography | Body voor het hoofdlabel, Caption voor secundaire info. |
| Iconen | Optioneel links, chevron rechts bij navigerende items. |
| Kleuren | Achtergrond gelijk aan de omvattende container, geen aparte kaartachtergrond per item (tenzij expliciet als Card-lijst gebruikt). |
| Accessibility | Elk item navigeerbaar met logische schermlezervolgorde; `role="list"`/`role="listitem"`. |
| States | Rust, pressed (lichte achtergrondtint), disabled. |
| Animaties | Geen bij statische weergave; lichte tint bij pressed. |
| Haptics | Lichte tik bij navigerende items. |
| Performance | Directe weergave, geen vertraging bij korte lijsten (<50 items). |
| Business Rules | Bij meer dan vijftig items: overschakelen naar een virtualized/lazy-loaded variant om performance te waarborgen. |
| Acceptatiecriteria | Elk item minimaal 48dp hoog voor toegankelijke tikbaarheid. |
| UX-regels | Hoofdstuk 3/4, Performance Principles. |
| Golden Rules | UX Constitution — touch-targets. |
| Veelgemaakte fouten | Items kleiner dan 48dp bij een dichte lijst, wat tikfouten veroorzaakt. |
| Verboden toepassingen | Gebruik voor data die inherent hiërarchisch/gegroepeerd is. |
| Toekomstige uitbreidingen | Virtualisatie bij zeer lange lijsten (Team-ledenlijst bij grote gyms, Fase 4). |

### 6.2 Grouped List 🟢

| Veld | Specificatie |
|---|---|
| Doel | Items tonen met een duidelijke, benoemde groepering (bijv. oefeningen per spiergroep-categorie). |
| Beschrijving | Simple List (6.1) met sectiekoppen (Sec-hd-stijl, bestaand patroon) tussen groepen. |
| Wanneer gebruiken | Oefeningbibliotheek gegroepeerd per spiergroep of type, PR-tijdlijn gegroepeerd per maand. |
| Wanneer NIET gebruiken | Nooit bij minder dan twee natuurlijke groepen (voegt dan onnodige complexiteit toe). |
| Gebruiker | Alle gebruikers. |
| Context | Oefeningbibliotheek, PR-tijdlijn (6.6). |
| Visuele hiërarchie | Sectiekoppen visueel duidelijk onderscheiden (Caption, uppercase, `#0E4/g4`-kleur — bestaand `.sec-hd`-patroon). |
| Afmetingen/Padding/Margins/Radius/Elevation | Sectiekop-padding 14dp boven/6dp onder; overige identiek aan Simple List. |
| Typography | Sec-hd-stijl (bestaand: 11px, bold, uppercase, letter-spacing) voor koppen. |
| Iconen | Zelfde als Simple List binnen elke groep. |
| Kleuren | Zelfde als Simple List. |
| Accessibility | Sectiekoppen als `<h2>`/hoofding-niveau voor schermlezer-navigatie tussen groepen. |
| States | Zelfde als Simple List, plus: groep in-/uitklapbaar (optioneel, zie Expandable List 6.3 voor die variant). |
| Animaties | Zelfde als Simple List. |
| Haptics | Zelfde als Simple List. |
| Performance | Zelfde overweging als Simple List bij lange lijsten. |
| Business Rules | Sectiekoppen zijn nooit zelf tikbaar/navigerend — puur informatief label. |
| Acceptatiecriteria | Elke groep heeft minimaal één item; lege groepen worden niet getoond. |
| UX-regels | Hoofdstuk 3, informatiehiërarchie-principes. |
| Golden Rules | Product Principle P4 (data leidt tot inzicht — groepering is zelf een vorm van inzicht). |
| Veelgemaakte fouten | Te veel groepen met elk slechts één item (verlies van het groeperingsvoordeel). |
| Verboden toepassingen | Gebruik als vervanging voor Tabs wanneer groepen eigenlijk aparte content-secties zijn. |
| Toekomstige uitbreidingen | Sticky sectiekoppen bij het scrollen door lange gegroepeerde lijsten. |

### 6.3 Expandable List 🟢

| Veld | Specificatie |
|---|---|
| Doel | Items tonen die op verzoek meer detail onthullen zonder naar een nieuw scherm te navigeren. |
| Beschrijving | Lijst-item met een chevron-indicator die bij tik de inhoud uitklapt binnen dezelfde lijst. |
| Wanneer gebruiken | Programmablok-detail (uitklappen van een week), Help-scherm (veelgestelde vragen). |
| Wanneer NIET gebruiken | Nooit voor content die zo omvangrijk is dat een apart scherm overzichtelijker zou zijn. |
| Gebruiker | Alle gebruikers. |
| Context | Programma-overzicht (Hoofdstuk 6, 4.1), Help (9.4). |
| Visuele hiërarchie | Zelfde als Simple List, met een duidelijke uitklap-indicator (chevron, roteert 180°). |
| Afmetingen/Padding/Margins/Radius/Elevation | Zelfde als Simple List; uitgeklapte content krijgt 8dp extra linker-inspringing voor visuele hiërarchie. |
| Typography | Zelfde als Simple List voor het item-label, Body voor uitgeklapte content. |
| Iconen | Chevron-down/up, roteert bij toggle. |
| Kleuren | Zelfde als Simple List. |
| Accessibility | `aria-expanded`-status op elk uitklapbaar item, correct bijgewerkt bij toggle. |
| States | Ingeklapt (default) · Uitgeklapt · Laden (bij dynamisch geladen uitklap-content, bijv. programmaweek-details). |
| Animaties | Uitklappen/inklappen met `motion-standard`, hoogte-overgang vloeiend (geen abrupte sprong). |
| Haptics | Lichte tik bij toggle. |
| Performance | Uitklap-animatie blokkeert nooit de volgende gebruikersactie (Hoofdstuk 4, Performance Principles). |
| Business Rules | Bij dynamisch geladen uitklap-content: content wordt gecontroleerd op daadwerkelijke vulling vóór weergave (Product Principle P10 — geen lege uitklap-secties). |
| Acceptatiecriteria | Elke uitklap-actie toont een correcte `aria-expanded`-status. |
| UX-regels | Hoofdstuk 4, Deel 4 (Interaction Design). |
| Golden Rules | Product Constitution X. |
| Veelgemaakte fouten | Een uitklap-sectie die leeg blijkt te zijn na het openen (Product Audit-les: contentcheck vóór "compleet" melden). |
| Verboden toepassingen | Gebruik voor content die inherent een aparte navigatiestap vereist. |
| Toekomstige uitbreidingen | Geen. |


### 6.4 History List 🟢

| Veld | Specificatie |
|---|---|
| Doel | Chronologisch overzicht van eerdere trainingssessies tonen. |
| Beschrijving | Grouped List (6.2) gegroepeerd per datum, elk item toont oefening/sessie-samenvatting. |
| Wanneer gebruiken | "Recente sessies" op Dashboard, volledige trainingsgeschiedenis. |
| Wanneer NIET gebruiken | Nooit voor niet-chronologische data. |
| Gebruiker | Alle gebruikers. |
| Context | Dashboard, Trainingsgeschiedenis. |
| Visuele hiërarchie | Meest recente sessie bovenaan, altijd. |
| Afmetingen/Padding/Margins/Radius/Elevation | Zelfde als Grouped List. |
| Typography | Subtitle (sessienaam/type), Caption (datum, samenvattingscijfers). |
| Iconen | Sport-/type-icoon per item. |
| Kleuren | Zelfde als Grouped List. |
| Accessibility | Datum en samenvatting samen voorgelezen als één betekenisvolle eenheid. |
| States | Gevuld, leeg (nieuwe gebruiker, zie Empty States Deel 15), laden (skeleton). |
| Animaties | Nieuwe items (na een zojuist voltooide training) verschijnen bovenaan met lichte fade-in. |
| Haptics | Lichte tik bij navigatie naar sessiedetail. |
| Performance | Paginering/lazy-loading bij lange geschiedenis (>3 maanden actief gebruik). |
| Business Rules | Toont altijd de daadwerkelijk gesynchroniseerde staat — een offline gelogde, nog niet gesynchroniseerde sessie krijgt een zichtbare indicator. |
| Acceptatiecriteria | Meest recente sessie altijd bovenaan zonder verdere actie. |
| UX-regels | Hoofdstuk 6, Scherm 2.1 (Dashboard). |
| Golden Rules | Product Constitution VIII. |
| Veelgemaakte fouten | Geen visueel onderscheid tussen gesynchroniseerde en nog-in-wachtrij-staande sessies. |
| Verboden toepassingen | Gebruik voor niet-tijdgebonden data. |
| Toekomstige uitbreidingen | Filter op sporttype binnen de geschiedenis. |

### 6.5 Activity Feed 🔴

| Veld | Specificatie |
|---|---|
| Doel | Een gemengd, chronologisch overzicht van relevante gebeurtenissen tonen — trainingen, PR's, gym-aankondigingen, coach-berichten samen (onderdeel van het toekomstige social/competitief-traject, DEC-008). |
| Beschrijving | History List (6.4)-achtige structuur maar met gemengde item-typen, elk met een herkenbaar icoon/kleur per type. |
| Wanneer gebruiken | Toekomstig, gym-brede context waar leden elkaars (opt-in gedeelde) prestaties zien. |
| Wanneer NIET gebruiken | Nooit als verplicht, standaard zichtbaar onderdeel van de individuele atleet-ervaring — uitsluitend opt-in (Product Constitution XX). |
| Gebruiker | Gym-leden die vrijwillig deelnemen aan de sociale laag. |
| Context | Toekomstig Gym-scherm (7.4, Hoofdstuk 6)-uitbreiding. |
| Visuele hiërarchie | Gemengd maar consistent per item-type (PR's prominenter dan routine-updates). |
| Afmetingen/Padding/Margins/Radius/Elevation | Zelfde basis als History List. |
| Typography | Zelfde als History List. |
| Iconen | Type-specifiek icoon per item (PR: trofee, aankondiging: gym-icoon, bericht: spraakballon). |
| Kleuren | Type-specifieke accentkleur binnen het gedempte basispalet. |
| Accessibility | Item-type expliciet aangekondigd voor schermlezers ("PR van [naam]: Backsquat 110kg"). |
| States | Gevuld, leeg, laden. |
| Animaties | Nieuwe items verschijnen zachtjes bovenaan. |
| Haptics | Lichte tik per item. |
| Performance | Paginering bij langere feeds. |
| Business Rules | Uitsluitend content die expliciet door de gebruiker is gedeeld (drie-laags zichtbaarheidsmodel) verschijnt in de feed van anderen — nooit standaard alle data. |
| Acceptatiecriteria | Elke gebruiker kan zijn eigen zichtbaarheid in de feed van anderen volledig beheren. |
| UX-regels | Hoofdstuk 3, Deel 6 (Behavioural Design); Decision Log DEC-008. |
| Golden Rules | Product Constitution XX. |
| Veelgemaakte fouten | Een feed die aanvoelt als verplichte sociale vergelijking in plaats van vrijwillige gemeenschapservaring. |
| Verboden toepassingen | Gebruik voor niet-opt-in data. |
| Toekomstige uitbreidingen | Vorm nog te bepalen na het aangekondigde gesprek met ART CrossFit (Roadmap) — dit component blijft 🔴 tot die validatie heeft plaatsgevonden. |

### 6.6 PR Timeline 🔴

Volledige schermspecificatie: Hoofdstuk 6, Scherm 6.3. Als component (herbruikbaar binnen Profiel én Stats) is dit een Grouped List (6.2) gegroepeerd per maand, met elk item als een compact badge-plus-tekst-element. Interaction Matrix: Tap navigeert naar de bijbehorende sessie; Screen reader leest oefening, datum en waarde als één eenheid; geen swipe/long-press-gedrag (puur registratief, geen bewerkacties op dit niveau).


---

## Deel 7 — Tables

Volledige basisspecificatie: Hoofdstuk 5, Deel 11 (Tables). Vier toepassingen, elk als delta beschreven:

| Tabel | Status | Kolommen | Specifiek gedrag | Business Rule |
|---|---|---|---|---|
| **Statistics Table** | 🟢 | Oefening / 1RM / Trend / Laatste sessie | Sorteerbaar per kolom (tik op kolomkop) | Standaard gesorteerd op meest recent actief |
| **Exercise Table** | 🟢 | Naam / Spiergroep / Type / Apparatuur | Filterbaar via Filter Chips (3.3) boven de tabel | Toont zichtbaarheidsindicator (persoonlijk/gym/globaal) per rij conform het drie-laags model |
| **Gym Members** | 🟢 | Naam / Rol / Laatste activiteit / Acties | Roldropdown direct in de rij (Hoofdstuk 6, Scherm 7.3) | Rolwijziging vereist bevestiging, verschijnt in Audit Log |
| **Audit Log** | 🟢 | Datum / Actor / Actie / Betrokken lid | Alleen-lezen, geen interactieve acties binnen de tabel zelf | Onveranderlijk — geen enkele actie binnen de app kan een audit-regel wijzigen of verwijderen |

**Gedeelde Interaction Matrix:** Tap op kolomkop: sorteert (waar van toepassing) · Tap op rij: navigeert naar detail (waar van toepassing, niet bij Audit Log) · Long press: N.v.t. · Swipe: N.v.t. · Keyboard: rijen navigeerbaar bij desktop-gebruik · Screen reader: correcte `<table>`-semantiek met kop-koppelingen.

**Gedeelde Accessibility:** elke tabel blijft met laatst bekende data zichtbaar bij een laadfout waar mogelijk (Hoofdstuk 4, Deel 9).

**Gedeelde Toekomstige uitbreidingen:** exporteerbaarheid van Gym Members en Audit Log als CSV voor gym owners (Fase 4-behoefte, Persona Tom).


---

## Deel 8 — Charts

Basisspecificatie voor Line Chart, Bar Chart, Heatmap, Progress Ring, KPI Card, Calendar: Hoofdstuk 5, Deel 12 (Data Visualization). Hier uitgebreid tot volledige bouwbaarheid, plus Radar Chart en Recovery Circle als nieuwe toevoegingen.

### 8.1 Line Chart 🟢

| Veld | Specificatie |
|---|---|
| Doel | Trends over tijd tonen (1RM, gewicht, HRV). |
| Wanneer gebruiken | Elke continue metric met een tijdsdimensie. |
| Wanneer NIET gebruiken | Categorische, niet-continue data (gebruik Bar Chart). |
| Afmetingen/Padding/Radius/Elevation | Leeft binnen een Card (Hoofdstuk 5, Deel 11), geen eigen elevatie. |
| Typography | Caption voor as-labels, Statistic voor uitgelichte kerncijfers. |
| Kleuren | Enkele lijn `#00B894`, 2px, geen vulling onder de lijn (Hoofdstuk 5, Deel 3/12). |
| Accessibility | Tekstuele samenvatting van de trend verplicht naast de visuele grafiek. |
| States | Laden (skeleton) · Gevuld · Onvoldoende data (Golden Rule UX30) · Foutstaat (losstaand per grafiek). |
| Interaction Matrix | Tap op datapunt: toont tooltip met exacte waarde · Hover (desktop): zelfde tooltip · Swipe: horizontaal pannen bij lange tijdreeksen · Screen reader: samenvatting voorgelezen, geen punt-voor-punt-navigatie vereist. |
| Animaties | Lijn tekent zich in bij eerste laden (`motion-slow`), niet herhaald bij terugkeer binnen dezelfde sessie. |
| Business Rules | Gaat altijd vergezeld van een tekstuele duiding (Golden Rule UX28). |
| Toekomstige uitbreidingen | Meerdere lijnen (tot vijf, Hoofdstuk 5 Deel 3) voor vergelijking tussen oefeningen. |

### 8.2 Bar Chart 🟢

| Veld | Specificatie |
|---|---|
| Doel | Categorische of periodieke data vergelijken (wekelijks volume, trainingsfrequentie). |
| Wanneer gebruiken | Discrete periodes of categorieën. |
| Wanneer NIET gebruiken | Continue trends (gebruik Line Chart). |
| Kleuren | Staven `#0E3B4A`, meest recente/relevante staaf uitgelicht in `#00B894`, afgeronde bovenhoeken 4dp. |
| Accessibility | Elke staaf met tekstuele waarde, niet enkel visuele hoogte. |
| States | Zelfde als Line Chart. |
| Interaction Matrix | Tap op staaf: toont exacte waarde · Swipe: horizontaal pannen bij lange periodes · Screen reader: waarden per staaf voorleesbaar op verzoek. |
| Animaties | Staven "groeien" in bij eerste laden. |
| Business Rules | Zelfde duidingsverplichting als Line Chart. |
| Toekomstige uitbreidingen | Gestapelde variant voor spierbelasting-per-categorie-per-week. |

### 8.3 Radar Chart 🔴

| Veld | Specificatie |
|---|---|
| Doel | Meerdere dimensies tegelijk vergelijken rond een centraal punt (bijv. balans tussen spiergroepen, of vergelijking tussen sportdisciplines bij een multidisciplinaire atleet zoals Persona Sanne). |
| Beschrijving | Veelhoekig grid met assen vanuit een centraal punt, data als een gevulde polygon. |
| Wanneer gebruiken | Spiergroep-balans-overzicht (aanvulling op Spierbelasting, Hoofdstuk 6 Scherm 5.3), toekomstige HYROX-stationsprestatie-balans. |
| Wanneer NIET gebruiken | Nooit bij minder dan vier of meer dan acht dimensies (te weinig of te veel assen maken het onleesbaar). |
| Gebruiker | Data-gedreven gebruikers (Persona Daan, Sanne). |
| Context | Spierbelasting-detail, toekomstig HYROX-dashboard. |
| Visuele hiërarchie | Eén centrale visualisatie per kaart, geen concurrerende elementen. |
| Afmetingen/Padding/Radius/Elevation | Leeft binnen een Card, vierkant aspect-ratio. |
| Typography | Caption per as-label. |
| Iconen | Geen. |
| Kleuren | Gevulde polygon in `#00B894` op 20% dekking met een 2px volledige rand, grid-lijnen in lage dekking (10-15%). |
| Accessibility | Elke as-waarde apart beschikbaar als tekstuele lijst naast de visualisatie. |
| States | Gevuld, onvoldoende data (minimaal vier dimensies met data vereist), laden. |
| Animaties | Polygon "vouwt open" vanuit het centrum bij eerste laden (`motion-slow`). |
| Haptics | Lichte tik bij het selecteren van een specifieke as. |
| Performance | Geen merkbare vertraging bij het tekenen. |
| Business Rules | Altijd vergezeld van een tekstuele duiding welke as het meest afwijkt van de balans. |
| Acceptatiecriteria | Minimaal vier, maximaal acht assen. |
| UX-regels | Hoofdstuk 5, Deel 12 (Data Visualization, algemene regel). |
| Golden Rules | Product Constitution IV. |
| Veelgemaakte fouten | Te veel assen, waardoor het label-overlap veroorzaakt en onleesbaar wordt. |
| Verboden toepassingen | Gebruik voor data zonder een zinvolle multidimensionale vergelijking. |
| Toekomstige uitbreidingen | Vergelijking tussen twee periodes (twee overlappende polygons) voor voortgangsanalyse. |


### 8.4 Heatmap 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 3/12. Interaction Matrix: Tap op een segment (spiergroep of kalenderdag) toont detail · Screen reader: elk segment met tekstueel percentage/status voorgelezen · Swipe/Drag: N.v.t. Business Rule: vijfpunts-kleurgradient nooit uitgebreid met meer stappen (herkenbaarheid, Hoofdstuk 5 Deel 3).

### 8.5 Progress Ring 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 11/12. Interaction Matrix: Tap toont detail-breakdown (indien van toepassing) · Screen reader: `role="progressbar"` met percentage voorgelezen. Toekomstige uitbreiding: gesegmenteerde ring (meerdere kleursegmenten binnen één ring) voor een gecombineerde herstel-score per lichaamsregio.

### 8.6 Recovery Circle 🟢

| Veld | Specificatie |
|---|---|
| Doel | Eén samenvattend, compact hersteldata-cijfer tonen als centraal element (bijv. op het Dashboard, compacter dan de volledige heatmap). |
| Beschrijving | Progress Ring-variant (8.5) specifiek toegepast op algeheel herstelpercentage, met het lichaamssilhouet-icoon (Hoofdstuk 5, Deel 8) gecentreerd in plaats van een cijfer. |
| Wanneer gebruiken | Dashboard mini-herstelweergave, sessie-samenvatting. |
| Wanneer NIET gebruiken | Nooit als vervanging voor de volledige spierherstel-heatmap (5.1, Hoofdstuk 6) wanneer per-spiergroep-detail nodig is. |
| Kleuren | Ringvulling volgens de vijfpunts-heatmapschaal (Hoofdstuk 5, Deel 3) gebaseerd op het laagste/meest kritieke spiergroep-percentage — conservatieve weergave, nooit optimistisch gemiddelde die een kritieke groep verbergt. |
| Accessibility | Percentage en onderliggende kritieke spiergroep beide tekstueel beschikbaar. |
| States | Gevuld, laden, leeg (nieuwe gebruiker). |
| Interaction Matrix | Tap: navigeert naar volledige Herstel-scherm (5.1, Hoofdstuk 6) · Screen reader: percentage + kritieke spiergroep voorgelezen. |
| Business Rules | Toont altijd het meest kritieke (laagste) percentage, nooit een gemiddelde dat een niet-herstelde spiergroep zou verhullen (Product Constitution II: herstel gaat vóór prestatie, hier vertaald naar "conservatief boven optimistisch"). |
| Toekomstige uitbreidingen | Geen. |


### 8.7 KPI Card 🟢
Zie Analytics Card (5.1) — functioneel identiek, "KPI Card" is de toepassingsnaam wanneer het component een enkel kerncijfer op Dashboard/Stats-overzichtsniveau toont (Hoofdstuk 5, Deel 12).

### 8.8 Calendar 🔴
Volledige schermspecificatie: Hoofdstuk 6, Scherm 6.4. Als herbruikbaar component: een maandraster met status-cirkels per dag, Interaction Matrix identiek aan Heatmap (8.4) toegepast op een tijdrasterlayout in plaats van een lichaamsvisualisatie.

---

## Deel 9 — Training

Dit is de meest kritieke componentcategorie van de hele bibliotheek — de trainingsflow-componenten worden honderden keren per maand per actieve gebruiker aangeraakt (Hoofdstuk 4, Deel 4: Workout Experience Principles).

### 9.1 Exercise Block 🟢

| Veld | Specificatie |
|---|---|
| Doel | Eén oefening binnen een trainingssessie structureren — de container rondom Set Blocks (9.2). |
| Beschrijving | Uitklapbare sectie (Expandable List-patroon, 6.3) met oefeningnaam, spiergroep-tags, en de individuele sets eronder. |
| Wanneer gebruiken | Elke oefening binnen een actieve trainingssessie. |
| Wanneer NIET gebruiken | Nooit voor niet-trainingsgerelateerde content. |
| Gebruiker | Alle trainende gebruikers. |
| Context | Training uitvoeren (Hoofdstuk 6, Scherm 3.2/3.3). |
| Visuele hiërarchie | Eén Exercise Block is altijd "actief" (uitgeklapt, prominent), overige zijn samengevouwen. |
| Afmetingen/Padding/Margins/Radius/Elevation | Identiek aan Workout Card-basis (Hoofdstuk 5, Deel 11): 16dp padding, 12dp radius, elevatie 1 (2 indien actief). |
| Typography | Title (oefeningnaam), Caption (spiergroep-tags/vorige-sessie-referentie). |
| Iconen | Superset-koppelicoon, apparatuur-instelling-icoon, video-preview-icoon. |
| Kleuren | Actieve Exercise Block: elevatie 2 + subtiele randaccent; overige: elevatie 1, geen accent. |
| Accessibility | Uitklapstatus (`aria-expanded`) correct bijgewerkt; oefeningnaam als hoofding voor navigatie tussen blocks. |
| States | Actief-uitgeklapt · Samengevouwen · Voltooid (alle sets gelogd, visueel vinkje) · Leeg (nieuw toegevoegd, nog geen sets). |
| Animaties | Uitklappen/inklappen `motion-standard`; overgang naar "voltooid"-staat met korte pulse. |
| Haptics | Lichte tik bij het wisselen van actieve oefening. |
| Performance | Geen merkbare vertraging bij het wisselen tussen oefeningen binnen dezelfde sessie. |
| Business Rules | Eén dynamisch renderpad voor zowel vaste trainingen als losse oefeningen (Product Principle P9, bestaand architectuurprincipe). |
| Acceptatiecriteria | Wisselen tussen oefeningen kost één tik. |
| UX-regels | Hoofdstuk 4, Deel 4. |
| Golden Rules | Product Constitution XIX. |
| Veelgemaakte fouten | Meerdere Exercise Blocks tegelijk uitgeklapt, wat de focus-regel (Hoofdstuk 4, Deel 1) doorbreekt. |
| Verboden toepassingen | Gebruik buiten de trainingscontext. |
| Toekomstige uitbreidingen | Drag-to-reorder van oefeningen binnen een losse workout (Deel 4, Drag-interactie — met alternatieve op/neer-knoppen voor toegankelijkheid). |

### 9.2 Set Block 🟢

Volledige specificatie: Hoofdstuk 6, Scherm 3.4 (Set logging) en dit hoofdstuk, Deel 2.7 (Stepper). Het Set Block is de rij binnen een Exercise Block die één individuele set representeert: setnummer, gewicht-stepper, reps-stepper, RPE-stepper, opslaan-status. Interaction Matrix: Tap op stepper: increment · Long press op stepper: versneld doorlopen (elke 400ms een extra increment bij vasthouden — enige toegestane long-press-toepassing binnen de trainingsflow, expliciet omdat het snelheid dient zonder precisieverlies) · Swipe: N.v.t. binnen de actieve sessie (voorkomt onbedoeld wissen) · Screen reader: setnummer + huidige waarden voorgelezen als eenheid.

### 9.3 Superset Block 🟢

| Veld | Specificatie |
|---|---|
| Doel | Twee of meer Exercise Blocks visueel en functioneel koppelen als superset. |
| Beschrijving | Verticale verbindingslijn tussen gekoppelde Exercise Blocks met een gedeeld superset-label. |
| Wanneer gebruiken | Wanneer de gebruiker expliciet "Superset" activeert tussen twee oefeningen. |
| Wanneer NIET gebruiken | Nooit automatisch verondersteld — altijd een expliciete gebruikersactie. |
| Gebruiker | Gevorderde gebruikers die met supersets trainen. |
| Context | Training uitvoeren. |
| Visuele hiërarchie | De verbindingslijn is subtiel — de individuele Exercise Blocks blijven de primaire visuele eenheden. |
| Afmetingen/Padding/Margins/Radius/Elevation | Verbindingslijn 2px, `#00B894`, tussen de linkerranden van de gekoppelde blocks. |
| Typography | Klein superset-label (Caption) bovenaan de gekoppelde groep. |
| Iconen | Superset-koppelicoon (Hoofdstuk 5, Deel 8). |
| Kleuren | Verbindingslijn in accentkleur, blocks zelf ongewijzigd. |
| Accessibility | Superset-relatie expliciet aangekondigd voor schermlezers ("Superset, oefening 1 van 2"). |
| States | Gekoppeld, ontkoppeld (na verwijderen van de superset-relatie). |
| Animaties | Verbindingslijn verschijnt met `motion-fast` bij het activeren van de superset. |
| Haptics | Lichte tik bij het koppelen/ontkoppelen. |
| Performance | Geen impact op de logsnelheid van individuele sets. |
| Business Rules | Supersets worden gelogd binnen dezelfde flow als reguliere sets, geen aparte modus (Hoofdstuk 2, user story 14). |
| Acceptatiecriteria | Koppelen/ontkoppelen kost één tik. |
| UX-regels | Hoofdstuk 4, Deel 4. |
| Golden Rules | Product Constitution XIX. |
| Veelgemaakte fouten | Superset-relatie die niet duidelijk genoeg visueel gemarkeerd is, waardoor de gebruiker de koppeling niet opmerkt. |
| Verboden toepassingen | Automatische superset-koppeling zonder expliciete gebruikersactie. |
| Toekomstige uitbreidingen | Circuit-variant (drie of meer gekoppelde oefeningen) met dezelfde visuele taal. |


### 9.4 Warm-up Block, Cooldown Block 🟢

| Veld | Warm-up Block | Cooldown Block |
|---|---|---|
| Doel | Opwarmsets vóór de werksets structureren, vaak met automatisch berekende percentages | Afsluitende, lichtere sets of mobiliteitsoefeningen na de werksets |
| Status | 🟢 (bestaand: "Opwarmsets toevoegen"-patroon) | 🔴 (nog niet expliciet gebouwd) |
| Visuele hiërarchie | Visueel lichter/kleiner dan werksets binnen hetzelfde Exercise Block | Zelfde principe, onderaan de Exercise Block-lijst |
| Kleuren | Neutrale, minder prominente kleur dan werksets (geen accentkleur) | Zelfde |
| Business Rules | Percentages automatisch voorgesteld op basis van 1RM (bestaand patroon) | Optioneel, nooit verplicht |
| Interaction Matrix | Identiek aan Set Block (9.2), visueel onderscheiden via minder prominente styling | Identiek |
| Toekomstige uitbreidingen | — | Volledige bouw als expliciet, apart blok — momenteel functioneel mogelijk via een reguliere losse oefening na de hoofdsessie, nog geen dedicated component |

### 9.5 Rest Timer 🟡

Volledige schermspecificatie: Hoofdstuk 6, Scherm 3.5. Als component: zie ook Hoofdstuk 5, Deel 11. Interaction Matrix: Tap op "+30 sec": verlengt · Tap op "overslaan": beëindigt direct · Swipe down: minimaliseert naar de compacte balk-variant · Screen reader: resterende tijd op verzoek voorgelezen, einde altijd aangekondigd via `aria-live="assertive"`.

### 9.6 Plate Calculator 🟢

Volledige schermspecificatie: Hoofdstuk 6, Scherm 3.6. Interaction Matrix: Tap op stepper: past doelgewicht aan · Tap op stang-keuze: wisselt stanggewicht · Screen reader: schijfcombinatie voorgelezen als tekstuele lijst, niet enkel de visuele weergave.

### 9.7 Workout Timer 🟢

| Veld | Specificatie |
|---|---|
| Doel | De totale verstreken tijd van de actieve trainingssessie tonen. |
| Beschrijving | Doorlopende klok bovenaan het trainingsscherm (bestaand `train-elapsed`-patroon). |
| Wanneer gebruiken | Elke actieve trainingssessie, permanent zichtbaar. |
| Wanneer NIET gebruiken | N.v.t. — altijd aanwezig tijdens training. |
| Gebruiker | Alle trainende gebruikers. |
| Context | Workout Header (9.9). |
| Visuele hiërarchie | Prominent maar niet dominant — ondersteunend aan de actieve set-invoer. |
| Afmetingen/Padding/Margins/Radius/Elevation | Onderdeel van de Workout Header, geen eigen kaart. |
| Typography | Statistic-achtige weergave maar iets kleiner (16px Bold, bestaande `train-elapsed`-stijl). |
| Iconen | Geen. |
| Kleuren | Primaire tekstkleur, verandert niet van kleur (in tegenstelling tot de Rest Timer die wel semantische kleurwisseling heeft). |
| Accessibility | Tijd op verzoek voorleesbaar, niet doorlopend aangekondigd (zou schermlezer-gebruik verstoren). |
| States | Actief tellend, gepauzeerd (bevriest, visueel gedimd). |
| Animaties | Geen — een doorlopende klok heeft geen decoratieve animatie nodig. |
| Haptics | Geen. |
| Performance | Update elke seconde zonder merkbare belasting. |
| Business Rules | Pauzeert exact synchroon met de sessie-pauzeknop (9.9). |
| Acceptatiecriteria | Tijd blijft accuraat ook na een sessie-pauze/hervat-cyclus. |
| UX-regels | Hoofdstuk 6, Scherm 3.2. |
| Golden Rules | — (ondersteunend component, geen directe wet). |
| Veelgemaakte fouten | Timer die doorloopt tijdens een pauze (moet exact bevriezen). |
| Verboden toepassingen | Gebruik als enige tijdsweergave zonder Rest Timer ernaast tijdens sets. |
| Toekomstige uitbreidingen | Geen. |

### 9.8 Workout Header 🟢

Bevat Workout Timer (9.7), pauze-/hervat-Icon Button, instellingen-Icon Button, afronden-Button — volledig gespecificeerd in Hoofdstuk 6, Scherm 3.2 ("train-top"-structuur). Business Rule: blijft zichtbaar (sticky) tijdens het scrollen door meerdere Exercise Blocks.

### 9.9 Workout Footer 🟡

| Veld | Specificatie |
|---|---|
| Doel | Snelle toegang tot sessie-brede acties bieden zonder omhoog te hoeven scrollen naar de Workout Header. |
| Beschrijving | Vaste balk onderaan het trainingsscherm met "+ Oefening toevoegen" en "Vraag de coach"-snelkoppelingen. |
| Wanneer gebruiken | Elke actieve trainingssessie met meer dan één oefening. |
| Wanneer NIET gebruiken | Niet nodig bij een sessie met exact één oefening (Workout Header volstaat dan). |
| Gebruiker | Alle trainende gebruikers. |
| Context | Training uitvoeren. |
| Visuele hiërarchie | Ondersteunend, nooit concurrerend met de actieve Set Block-invoer. |
| Afmetingen/Padding/Margins/Radius/Elevation | Hoogte 56dp, elevatie 2 (zwevend boven de content). |
| Typography | Button-stijl voor de labels. |
| Iconen | "+"-icoon, spraakballon-icoon (coach). |
| Kleuren | Achtergrond gelijk aan Card-surface, iconen in primaire kleur. |
| Accessibility | Beide acties met duidelijk `aria-label`. |
| States | Rust, pressed per actie. |
| Animaties | Verschijnt/verdwijnt met de rest van het trainingsscherm, geen aparte animatie. |
| Haptics | Lichte tik per actie. |
| Performance | Geen impact op de logsnelheid. |
| Business Rules | "Vraag de coach" opent de Coach Chat zonder de actieve sessie te onderbreken (blijft op de achtergrond actief). |
| Acceptatiecriteria | Beide acties bereikbaar zonder te scrollen, ongeacht positie binnen de sessie. |
| UX-regels | Hoofdstuk 4, Deel 4. |
| Golden Rules | Product Constitution XIX. |
| Veelgemaakte fouten | Footer die de onderste Set Block visueel overlapt zonder voldoende scroll-marge. |
| Verboden toepassingen | Gebruik als primaire navigatie (blijft de bottom-navigatie, die tijdens training ondergeschikt is — zie Hoofdstuk 6, Scherm 3.2). |
| Toekomstige uitbreidingen | Geen. |


---

## Deel 10 — AI

### 10.1 Coach Message 🟢

| Veld | Specificatie |
|---|---|
| Doel | Eén bericht binnen de Coach Chat weergeven, van de AI of van de gebruiker. |
| Beschrijving | Chatbubble, links uitgelijnd (AI, petrol-achtergrond) of rechts uitgelijnd (gebruiker, neutrale achtergrond). |
| Wanneer gebruiken | Elk bericht binnen de Coach Chat (Hoofdstuk 6, Scherm 4.3). |
| Wanneer NIET gebruiken | Nooit voor AI-content buiten een gespreks-context (gebruik AI Card, 10.3/5.1 Hoofdstuk 5). |
| Gebruiker | Alle gebruikers. |
| Context | Coach Chat. |
| Visuele hiërarchie | AI-berichten en gebruikersberichten gelijkwaardig qua grootte, onderscheiden via positie en kleur. |
| Afmetingen/Padding/Margins/Radius/Elevation | Padding 12dp, radius 16dp met één "platte" hoek aan de zijde van de afzender (chatbubble-conventie), elevatie 0. |
| Typography | AI-stijl (15px, 23px regelafstand) voor coach-berichten, Body voor gebruikersberichten. |
| Iconen | Klein AI-avatar-icoon (spraakballon-met-kompas-naald) naast AI-berichten. |
| Kleuren | AI: `#0E3B4A`-achtergrond/witte tekst · Gebruiker: `#E6EBEF`/`#1A4557`-achtergrond/primaire tekstkleur. |
| Accessibility | Afzender expliciet aangekondigd voor schermlezers ("Coach zegt: …" / "Jij zei: …"). |
| States | Verzonden, ontvangen, "aan het nadenken" (tijdelijke placeholder-bubble met drie puntjes). |
| Animaties | Bericht schuift in vanaf de eigen zijde (`motion-standard`); AI-tekst verschijnt typerend op leessnelheid. |
| Haptics | Lichte tik bij verzenden (eigen bericht). |
| Performance | Directe weergave van eigen berichten (optimistisch), AI-antwoord na server-respons. |
| Business Rules | Elk AI-bericht toont, waar van toepassing, een uitklapbare "waarom dit advies"-sectie (Product Principle P3). |
| Acceptatiecriteria | Berichttype altijd visueel en tekstueel onderscheidbaar. |
| UX-regels | Hoofdstuk 4, Deel 5 (AI Design Principles). |
| Golden Rules | Product Constitution I, III, V. |
| Veelgemaakte fouten | AI- en gebruikersberichten die visueel te weinig verschillen, wat de leesbaarheid van een gesprek vermindert. |
| Verboden toepassingen | Gebruik voor systeemmeldingen die geen daadwerkelijk AI-gegenereerde inhoud bevatten (gebruik Snackbar/Toast, 11.2/11.3). |
| Toekomstige uitbreidingen | Rijke content binnen berichten (bijv. een ingebedde mini-grafiek) bij data-onderbouwde adviezen. |

### 10.2 AI Explanation 🟢

| Veld | Specificatie |
|---|---|
| Doel | De uitklapbare "waarom dit advies"-sectie die bij elk AI-advies hoort — de directe UI-vertaling van Product Principle P3. |
| Beschrijving | Inklapbaar tekstblok binnen een Coach Message of AI Card, met expliciete data-referenties. |
| Wanneer gebruiken | Bij elk AI-advies zonder uitzondering. |
| Wanneer NIET gebruiken | Nooit weggelaten — dit component is niet optioneel bij AI-content. |
| Gebruiker | Alle gebruikers, met name data-gedreven persona's (Ruud, Daan). |
| Context | Coach Message, AI Card, Coach-advies-scherm (Hoofdstuk 6, Scherm 4.2). |
| Visuele hiërarchie | Ondersteunend aan de hoofdboodschap, maar altijd minimaal één regel direct zichtbaar (niet volledig verborgen achter een tik) — de kernuitleg is zichtbaar, de volledige onderbouwing is uitklapbaar. |
| Afmetingen/Padding/Margins/Radius/Elevation | Binnen de omvattende Coach Message/AI Card, 8dp interne marge t.o.v. de hoofdtekst. |
| Typography | Caption voor de data-referenties, Body voor de uitgeklapte volledige uitleg. |
| Iconen | Klein info-icoon of chevron als uitklap-indicator. |
| Kleuren | Lichte achtergrondtint-verschil t.o.v. de omvattende container om de sectie te onderscheiden. |
| Accessibility | `aria-expanded`, uitgeklapte inhoud direct na de trigger in de leesvolgorde. |
| States | Ingeklapt (kernzin zichtbaar) · Uitgeklapt (volledige data + redenering). |
| Animaties | Uitklappen met `motion-standard`. |
| Haptics | Lichte tik bij uitklappen. |
| Performance | Directe uitklap, geen laadvertraging (data is al meegeleverd met het AI-antwoord). |
| Business Rules | Bevat minimaal: welke data gebruikt is, en de kernredenering in gewone taal (Product Principle P3, niet-onderhandelbaar). |
| Acceptatiecriteria | Nooit een AI-advies zonder dit component. |
| UX-regels | Hoofdstuk 4, Deel 5. |
| Golden Rules | Product Constitution III. |
| Veelgemaakte fouten | Uitleg die enkel technische termen herhaalt ("dagfactor 0,82") zonder vertaling naar gewone taal. |
| Verboden toepassingen | Weglaten bij welk AI-advies dan ook. |
| Toekomstige uitbreidingen | Vergelijking met historische, vergelijkbare situaties als onderdeel van de uitleg (Hoofdstuk 6, Scherm 4.2, mogelijke uitbreiding). |


### 10.3 Recommendation Card, Warning Card, Insights Card, Reasoning Card 🟢/🔴

Vier gespecialiseerde varianten van de basis AI Card (Hoofdstuk 5, Deel 11), elk met een specifiek doel binnen het uitlegbaarheidssysteem:

| Variant | Status | Doel | Visueel onderscheid | Trigger | Business Rule |
|---|---|---|---|---|---|
| **Recommendation Card** | 🟢 | Een concreet, positief geformuleerd voorstel doen (bijv. het Coach-advies-scherm) | Standaard AI Card-styling, met de twee gelijkwaardige actieknoppen (Golden Rule UX25) | Check-in voltooid, of expliciete vraag in Coach Chat | Altijd vergezeld van AI Explanation (10.2) |
| **Warning Card** | 🟢 | Proactief waarschuwen bij een afwijking (ACWR-piek, plateau-signaal) | `#C8A84B`-accentrand links, iets prominentere plaatsing (bijv. bovenaan Dashboard) | Automatische detectie door de onderliggende analysemotor | Nooit blokkerend — de gebruiker kan altijd doorgaan zonder de waarschuwing op te volgen (Product Principle P1) |
| **Insights Card** | 🔴 | Een niet-actiegericht, puur informatief inzicht tonen (bijv. "je herstelt dit blok gemiddeld sneller dan het vorige") | Standaard AI Card zonder actieknoppen, puur informatief | Periodiek gegenereerd (bijv. bij afronding van een mesocyclus) | Nooit opdringerig getoond — verschijnt op relevante analytics-schermen, niet als onderbreking |
| **Reasoning Card** | 🟢 | De volledige, stap-voor-stap-berekening tonen (bijv. het "Vandaag"-detailscherm, Hoofdstuk 6 Scherm 2.2) | Uitgebreidere AI Explanation (10.2), permanent uitgeklapt in plaats van in-/uitklapbaar | Expliciete gebruikersactie ("meer details") | Meest gedetailleerde uitlegvorm in de hele app — geen enkele stap in de berekening blijft verborgen |

**Gedeelde Interaction Matrix:** Tap op actieknoppen (Recommendation Card): activeert het gekozen pad · Tap op Warning Card: navigeert naar het relevante detailscherm · Screen reader: kaarttype aangekondigd vóór de inhoud ("Waarschuwing: …", "Aanbeveling: …").

**Gedeelde Golden Rules:** Product Constitution I, III, V — alle vier de varianten volgen dezelfde uitlegbaarheids- en niet-dwingende-principes, uitsluitend het presentatiedoel verschilt.

---

## Deel 11 — System

### 11.1 Dialogs 🟢

Volledige basisspecificatie: Hoofdstuk 5, Deel 11. Zie ook de gespecialiseerde varianten hieronder (11.5-11.7).

### 11.2 Snackbar 🔴

| Veld | Specificatie |
|---|---|
| Doel | Een korte, niet-blokkerende bevestiging of statusmelding tonen die vanzelf verdwijnt. |
| Beschrijving | Compacte balk die onderaan het scherm verschijnt (boven de bottom-navigatie), met optioneel één actieknop. |
| Wanneer gebruiken | Niet-kritieke bevestigingen die geen blokkerende aandacht vereisen (bijv. "Instelling opgeslagen"). |
| Wanneer NIET gebruiken | Nooit voor kritieke fouten of acties die een bevestiging vereisen (gebruik Dialog, 11.1). |
| Gebruiker | Alle gebruikers. |
| Context | Systeembreed, na niet-kritieke acties. |
| Visuele hiërarchie | Laag — verschijnt, bevestigt, verdwijnt zonder de aandacht te domineren. |
| Afmetingen/Padding/Margins/Radius/Elevation | Hoogte 48dp, breedte volledig met 16dp marge links/rechts, radius 8dp, elevatie 3 (zwevend boven content). |
| Typography | Body, eventuele actie in Button-stijl. |
| Iconen | Optioneel, klein statusicoon links. |
| Kleuren | Achtergrond `#0B1D2A` (donker, ongeacht light/dark mode — een Snackbar contrasteert bewust met beide achtergronden voor zichtbaarheid), witte tekst. |
| Accessibility | `aria-live="polite"`, verschijnt zonder focus te stelen. |
| States | Verschijnend, zichtbaar, verdwijnend. |
| Animaties | Slide-up bij verschijnen, fade-out bij verdwijnen (`motion-standard`). |
| Haptics | Zeer lichte tik bij verschijnen (optioneel, alleen bij significante bevestigingen). |
| Performance | Verschijnt direct na de triggerende actie. |
| Business Rules | Verdwijnt automatisch na 4 seconden, of eerder bij een nieuwe, overschrijvende Snackbar; nooit gebruikt voor content die de gebruiker moet kunnen naslaan (die hoort in een permanente lijst/geschiedenis). |
| Acceptatiecriteria | Blokkeert nooit onderliggende interactie; maximaal één Snackbar tegelijk zichtbaar. |
| UX-regels | Hoofdstuk 3, UX20 (bevestiging binnen twee seconden). |
| Golden Rules | Product Constitution VIII. |
| Veelgemaakte fouten | Snackbar gebruiken voor een foutmelding die een herstelactie vereist (gebruik dan Error Dialog of inline foutmelding). |
| Verboden toepassingen | Kritieke fouten, destructieve bevestigingen. |
| Toekomstige uitbreidingen | Geen. |

### 11.3 Toast 🔴

Functioneel identiek aan Snackbar (11.2) — TrainingKompas gebruikt bewust één term en één component voor deze functie (Toast en Snackbar zijn in andere designsystemen soms gescheiden; hier expliciet samengevoegd om component-inflatie te voorkomen, Product Principle P9). Waar "Toast" wordt genoemd in externe documentatie of platformconventies (bijv. Android-systeemterminologie), verwijst dit naar hetzelfde component als Snackbar (11.2).


### 11.4 Modal 🟢

Overkoepelende term voor elk scherm-blokkerend overlay-component in dit systeem — in TrainingKompas concreet uitgewerkt als Dialog (11.1) of Bottom Sheet (4.8), nooit als een los, derde patroon. Business Rule: elke nieuwe blokkerende-overlay-behoefte wordt eerst getoetst of Dialog of Bottom Sheet volstaat (Product Principle P9) vóórdat een nieuwe Modal-variant wordt overwogen.

### 11.5 Confirmation Dialog 🟢

| Veld | Specificatie |
|---|---|
| Doel | Expliciete bevestiging vragen vóór een impactvolle of destructieve actie wordt uitgevoerd. |
| Beschrijving | Dialog-variant (11.1) met een Danger Button (1.4) als primaire actie bij destructieve bevestigingen, of twee gelijkwaardige knoppen bij niet-destructieve maar impactvolle bevestigingen. |
| Wanneer gebruiken | Verwijderen (oefening, programma, account), belangrijke onomkeerbare wijzigingen. |
| Wanneer NIET gebruiken | Nooit voor omkeerbare, lage-impact acties (creëert onnodige frictie en "dialoog-moeheid"). |
| Gebruiker | Alle gebruikers. |
| Context | Systeembreed bij destructieve acties (herhaling van Golden Rule UX37 — dit component ís de bindende implementatie van die regel). |
| Visuele hiërarchie | Zelfde als Dialog (11.1). |
| Afmetingen/Padding/Margins/Radius/Elevation | Identiek aan Dialog. |
| Typography | Title voor de vraag ("Weet je zeker dat je dit wilt verwijderen?"), Body voor eventuele toelichting van de consequentie. |
| Iconen | Waarschuwing-icoon bovenaan bij destructieve varianten. |
| Kleuren | Danger Button (1.4) voor destructieve bevestiging, Primary Button (1.1) voor niet-destructieve impactvolle bevestiging. |
| Accessibility | Eerste focus altijd op de minst destructieve/veiligste optie (Hoofdstuk 5, Dialogs); `role="alertdialog"`. |
| States | Getoond, verwerkend (loading op de bevestigende knop), gesloten. |
| Animaties | Zelfde als Dialog. |
| Haptics | Middel-sterke trilling bij het openen van een destructieve variant. |
| Performance | Verschijnt direct bij de triggerende actie, geen laadvertraging. |
| Business Rules | Dit is de enige toegestane vorm van bevestiging voor destructieve acties — native `confirm()` is systeembreed verboden (Golden Rule UX37, Product Constitution VIII/Design Constitution wet 20). |
| Acceptatiecriteria | Elke destructieve actie in de app gaat door dit component, zonder uitzondering. |
| UX-regels | Hoofdstuk 3, UX37. |
| Golden Rules | Product Constitution VIII. |
| Veelgemaakte fouten | Bevestigingstekst die vaag blijft over de daadwerkelijke consequentie ("weet je het zeker?" zonder te zeggen wat er verwijderd wordt). |
| Verboden toepassingen | Gebruik voor niet-impactvolle, snel omkeerbare acties. |
| Toekomstige uitbreidingen | Geen — dit component is bewust simpel en voorspelbaar gehouden. |

### 11.6 Permission Dialog 🔴

| Veld | Specificatie |
|---|---|
| Doel | Toestemming vragen voor systeemtoegang (bijv. camera voor profielfoto, notificaties) op een manier die de context vooraf uitlegt — vóór het systeemeigen toestemmingsvenster verschijnt. |
| Beschrijving | Een "pre-permission"-Dialog die uitlegt waaróm toestemming nodig is, gevolgd door het systeemeigen (OS-)toestemmingsvenster zelf (niet door TrainingKompas vormgegeven, platformstandaard). |
| Wanneer gebruiken | Vóór elke systeemtoestemmingsvraag (notificaties, camera, health-data-toegang). |
| Wanneer NIET gebruiken | Nooit als vervanging van het systeemeigen toestemmingsvenster — uitsluitend als voorbereidende context. |
| Gebruiker | Alle gebruikers. |
| Context | Wearable-koppeling (8.1, Hoofdstuk 6), toekomstige notificatie-instellingen, profielfoto-upload. |
| Visuele hiërarchie | Zelfde als Dialog. |
| Afmetingen/Padding/Margins/Radius/Elevation | Identiek aan Dialog. |
| Typography | Title (wat wordt er gevraagd), Body (waarom, wat gebeurt er met de data). |
| Iconen | Icoon passend bij de gevraagde toestemming (bijv. camera-icoon). |
| Kleuren | Standaard Dialog-kleuren, geen Danger-styling (dit is geen destructieve actie). |
| Accessibility | Zelfde als Dialog. |
| States | Getoond, geaccepteerd (leidt door naar systeemvenster), geweigerd. |
| Animaties | Zelfde als Dialog. |
| Haptics | Lichte tik. |
| Performance | Directe doorstroom naar het systeemvenster bij acceptatie. |
| Business Rules | Legt altijd expliciet uit wat er met de data gebeurt (aansluitend bij de datafilosofie, Hoofdstuk 1 sectie 1.10) vóórdat het systeemvenster verschijnt — verhoogt de kans op daadwerkelijke toestemming door context te geven in plaats van een onverwacht systeemvenster te tonen. |
| Acceptatiecriteria | Gebruiker begrijpt vóór het systeemvenster wat er gevraagd wordt en waarom. |
| UX-regels | Hoofdstuk 1, sectie 1.10 (datafilosofie). |
| Golden Rules | Product Constitution XIV. |
| Veelgemaakte fouten | Een systeemtoestemmingsvraag tonen zonder voorafgaande context, wat tot onnodige weigeringen leidt. |
| Verboden toepassingen | Gebruik als vervanging van het daadwerkelijke systeemvenster. |
| Toekomstige uitbreidingen | Geen. |

### 11.7 Error Dialog 🟡

| Veld | Specificatie |
|---|---|
| Doel | Een kritieke fout communiceren die blokkerende aandacht vereist (in tegenstelling tot een inline foutmelding of Snackbar). |
| Beschrijving | Dialog-variant met een duidelijke foutomschrijving en concrete herstelactie. |
| Wanneer gebruiken | Kritieke fouten die de gebruiker niet kan negeren zonder actie (bijv. sessie verlopen, kritiek dataverlies-risico). |
| Wanneer NIET gebruiken | Nooit voor kleine, niet-blokkerende fouten (gebruik inline foutmelding of Snackbar). |
| Gebruiker | Alle gebruikers. |
| Context | Zeldzame, kritieke foutsituaties systeembreed. |
| Visuele hiërarchie | Zelfde als Dialog. |
| Afmetingen/Padding/Margins/Radius/Elevation | Identiek aan Dialog. |
| Typography | Title (wat ging mis), Body (concrete herstelactie). |
| Iconen | Foutstatus-icoon (kruisje-in-cirkel), `#B3454C`. |
| Kleuren | Standaard Dialog met een `#B3454C`-accent op het icoon, geen felle alarmkleur op de volledige achtergrond (Hoofdstuk 5, Deel 3: ingehouden merktoon ook bij fouten). |
| Accessibility | `role="alertdialog"`, `aria-live="assertive"` bij verschijnen. |
| States | Getoond, herstelactie-in-uitvoering, opgelost. |
| Animaties | Zelfde als Dialog, geen schokkerige/alarmerende animatie (Hoofdstuk 4, Deel 5: error states zonder felle flits). |
| Haptics | Onderscheidende, maar niet overdreven sterke trilling. |
| Performance | Verschijnt direct bij de kritieke fout. |
| Business Rules | Bevat altijd een concrete herstelactie, nooit uitsluitend een technische foutcode (Golden Rule UX36). |
| Acceptatiecriteria | Elke Error Dialog is oplosbaar of legt uit wat de gebruiker kan doen als het probleem aanhoudt (bijv. contact via Feedback, 9.5 Hoofdstuk 6). |
| UX-regels | Hoofdstuk 3, UX36; Hoofdstuk 4, Deel 9 (Error Recovery). |
| Golden Rules | Product Constitution VIII. |
| Veelgemaakte fouten | Foutmelding die alleen een technische foutcode toont ("Error 500") zonder menselijke uitleg. |
| Verboden toepassingen | Gebruik voor niet-kritieke, routinematige fouten. |
| Toekomstige uitbreidingen | Automatische foutrapportage-optie ("stuur dit automatisch naar support") bij herhaalde, identieke fouten. |

### 11.8 Loading Overlay 🟢

| Veld | Specificatie |
|---|---|
| Doel | Een volledige-scherm-blokkerende laadstatus tonen bij processen die de rest van de interactie tijdelijk moeten blokkeren (zeldzaam — meestal heeft TrainingKompas de voorkeur voor niet-blokkerende, inline loading, Hoofdstuk 3/4 Performance Principles). |
| Beschrijving | Halftransparante overlay over het volledige scherm met een centrale spinner/voortgangsindicator. |
| Wanneer gebruiken | Uitsluitend bij processen waar verdere interactie daadwerkelijk destructief zou zijn (bijv. tijdens de finale stap van accountverwijdering). |
| Wanneer NIET gebruiken | Nooit voor reguliere data-laadmomenten (gebruik skeleton-loading, Deel 14) — een Loading Overlay is de uitzondering, niet de norm. |
| Gebruiker | Alle gebruikers, zeldzaam. |
| Context | Account verwijderen (definitieve stap), kritieke, niet-onderbreekbare synchronisatiemomenten. |
| Visuele hiërarchie | Hoogste mogelijke — blokkeert letterlijk al het overige. |
| Afmetingen/Padding/Margins/Radius/Elevation | Volledig scherm, elevatie 3+ (boven alles). |
| Typography | Korte statustekst onder de spinner ("Account wordt verwijderd…"). |
| Iconen | Spinner, 32px. |
| Kleuren | Scrim `#0B1D2A` op 80% dekking, witte spinner/tekst. |
| Accessibility | `aria-live="assertive"` met de statustekst; focus-trap (niets anders bedienbaar tijdens de overlay). |
| States | Actief, verdwijnend bij voltooiing. |
| Animaties | Fade-in bij verschijnen, fade-out bij verdwijnen. |
| Haptics | Geen. |
| Performance | Verschijnt direct, verdwijnt zodra het onderliggende proces daadwerkelijk voltooid is — nooit kunstmatig verlengd (verboden UX-patroon, Hoofdstuk 4 Deel 1). |
| Business Rules | Uitsluitend gebruikt wanneer verdere interactie tijdens het proces daadwerkelijk tot een fout of dataverlies zou leiden — bij twijfel altijd de voorkeur voor niet-blokkerende, optimistische UI. |
| Acceptatiecriteria | Verdwijnt exact op het moment dat het onderliggende proces voltooid is. |
| UX-regels | Hoofdstuk 3/4, Performance Principles. |
| Golden Rules | Product Constitution — impliciet via de kunstmatige-laadschermen-regel (Hoofdstuk 4, Deel 1). |
| Veelgemaakte fouten | Loading Overlay gebruiken voor reguliere schermovergangen waar skeleton-loading beter past. |
| Verboden toepassingen | Reguliere data-fetches; gebruik als "premium ogende" vertraging zonder functionele noodzaak. |
| Toekomstige uitbreidingen | Geen — dit component blijft bewust zeldzaam ingezet. |


---

## Deel 12 — Media

### 12.1 Video Player 🟢

| Veld | Specificatie |
|---|---|
| Doel | Techniekvideo's tonen ter ondersteuning van een oefening. |
| Beschrijving | Compacte, inline video-preview binnen een Exercise Block/Card, uitklapbaar naar volledig scherm. |
| Wanneer gebruiken | Oefeningdetail (Hoofdstuk 6, Scherm 3.3), waar een techniekvideo beschikbaar is. |
| Wanneer NIET gebruiken | Nooit auto-play met geluid (verstoort de gymomgeving/andere gebruikers). |
| Gebruiker | Alle gebruikers, met name Persona Fleur (technieken nog aan het leren). |
| Context | Oefening-detail. |
| Visuele hiërarchie | Ondersteunend, nooit groter dan nodig om de beweging duidelijk te tonen. |
| Afmetingen/Padding/Margins/Radius/Elevation | Inline preview 16:9, radius 8dp (consistent met kaartradius), volledig scherm bij uitklappen. |
| Typography | Caption voor een korte titel/bronvermelding onder de video. |
| Iconen | Play/pause-overlay-icoon, volledig-scherm-icoon. |
| Kleuren | Neutrale player-controls, geen merkkleur-overlay die de video zelf zou verstoren. |
| Accessibility | Ondertiteling/transcript waar beschikbaar (Hoofdstuk 4, Deel 10); player bedienbaar met toetsenbord (spatiebalk = play/pause). |
| States | Niet-afgespeeld (thumbnail + play-icoon) · Afspelend · Gepauzeerd · Laadfout (fallback naar statische afbeelding + tekstuele beschrijving). |
| Animaties | Play/pause-icoon fade in/out. |
| Haptics | Lichte tik bij play/pause. |
| Performance | Video laadt lazy (pas bij daadwerkelijke tik op play, niet vooraf volledig gebufferd) om databundel te sparen. |
| Business Rules | Nooit auto-play; geluid staat standaard uit. |
| Acceptatiecriteria | Player reageert binnen 100ms op play/pause-tik. |
| UX-regels | Hoofdstuk 5, Deel 10 (Photography — video volgt dezelfde functionele, niet-decoratieve richtlijn). |
| Golden Rules | Product Principle P6 (functie boven decoratie). |
| Veelgemaakte fouten | Auto-play met geluid, storend in een gymomgeving. |
| Verboden toepassingen | Gebruik voor decoratieve/marketing-video's binnen de kernproductinterface. |
| Toekomstige uitbreidingen | Door de gebruiker zelf opgenomen techniekvideo's ter vergelijking met de referentievideo (geavanceerde toekomstfunctie). |

### 12.2 Exercise Animation 🔴

| Veld | Specificatie |
|---|---|
| Doel | Een korte, gelooptte, geluidloze animatie van een oefeningsbeweging tonen als lichter alternatief voor een volledige Video Player. |
| Beschrijving | Silhouet-gebaseerde looping animatie (consistent met de illustratiestijl, Hoofdstuk 5 Deel 9 — geometrisch, geen fotorealisme). |
| Wanneer gebruiken | Bij oefeningen zonder een volledige techniekvideo, als snel visueel referentiepunt. |
| Wanneer NIET gebruiken | Nooit als vervanging van een volledige techniekvideo wanneer precisie van uitvoering kritiek is (complexe olympische liften). |
| Gebruiker | Alle gebruikers. |
| Context | Oefeningbibliotheek, Exercise Card. |
| Visuele hiërarchie | Klein, ondersteunend element binnen een Exercise Card. |
| Afmetingen/Padding/Margins/Radius/Elevation | Vierkant, 80×80px binnen een lijst-thumbnail, radius 8dp. |
| Typography | N.v.t. |
| Iconen | N.v.t. — de animatie zelf is het "icoon". |
| Kleuren | Silhouet in `#0B1D2A`/`#FFFFFF` (afhankelijk van modus), geen kleuraccent (consistent met de illustratiestijl-beperking tot twee kleuren, hier zelfs één). |
| Accessibility | Tekstuele beschrijving van de beweging altijd beschikbaar als alternatief (`alt`-equivalent). |
| States | Loopt continu wanneer zichtbaar, pauzeert wanneer buiten beeld (performance). |
| Animaties | Naadloze loop, 2-3 seconden per cyclus. |
| Haptics | Geen. |
| Performance | Lichtgewicht formaat (vector-gebaseerd waar mogelijk) om laadtijd te minimaliseren bij lange oefeninglijsten. |
| Business Rules | Pauzeert automatisch wanneer buiten het zichtbare scherm-gedeelte (voorkomt onnodig batterijgebruik bij lange lijsten). |
| Acceptatiecriteria | Geen merkbare vertraging bij het scrollen door een lijst met meerdere animaties. |
| UX-regels | Hoofdstuk 5, Deel 9 (Illustration Style). |
| Golden Rules | Design Constitution wet 15 (illustraties: max. twee kleuren, richtingselement niet van toepassing hier — functioneel silhouet). |
| Veelgemaakte fouten | Animaties die op elk scherm gelijktijdig blijven lopen, ongeacht zichtbaarheid, wat performance beïnvloedt. |
| Verboden toepassingen | Gebruik als vervanging voor Video Player bij technisch complexe oefeningen. |
| Toekomstige uitbreidingen | Uitbreiding naar de volledige oefeningbibliotheek naarmate meer animaties geproduceerd worden. |

### 12.3 Image Viewer 🔴

| Veld | Specificatie |
|---|---|
| Doel | Een afbeelding (bijv. een geëxporteerde grafiek, een gym-foto) op volledig scherm bekijken met zoom-mogelijkheid. |
| Wanneer gebruiken | Tik op een deelbare PR-kaart-afbeelding (Hoofdstuk 6, Scherm 6.3), gym-foto's (Hoofdstuk 5, Deel 10). |
| Wanneer NIET gebruiken | Nooit voor iconen of kleine UI-elementen. |
| Interaction Matrix | Tap: toont/verbergt controls · Pinch-to-zoom: vergroot/verkleint · Swipe down: sluit de viewer · Screen reader: alt-tekst voorgelezen. |
| Accessibility | Verplichte alt-tekst voor elke getoonde afbeelding. |
| Business Rules | Sluit altijd terug naar exact de scrollpositie van waaruit de afbeelding geopend werd. |
| Toekomstige uitbreidingen | Direct delen vanuit de viewer (koppeling met het besturingssysteem-deelmenu). |

### 12.4 Avatar, Profile Photo 🟡

| Veld | Avatar | Profile Photo |
|---|---|---|
| Doel | Compacte gebruikersrepresentatie binnen lijsten (Team-ledenlijst) | Volledige profielweergave binnen Profiel (8.4, Hoofdstuk 6) |
| Afmetingen | 32×32px (lijst-context), volledig rond | 96×96px (profielscherm-context), volledig rond |
| Fallback (geen foto) | Initialen op een neutrale `#0E3B4A`-achtergrond, witte tekst (Statistic-stijl, verkleind) | Zelfde patroon, groter |
| Accessibility | `alt`-tekst met de naam van de gebruiker | Zelfde |
| Business Rules | Profielfoto is optioneel — de initialen-fallback is een volwaardige, nooit "incomplete" ogende staat | Zelfde |
| Interaction Matrix | Tap (in Team-context): navigeert naar coach-/lid-detail | Tap: opent foto-wijzigen-flow (bestandskiezer/camera via Permission Dialog, 11.6) |
| Toekomstige uitbreidingen | Gym-brede zichtbaarheid van avatars in de Activity Feed (6.5) zodra de sociale laag actief wordt | Croppen/positioneren bij upload |


---

## Deel 13 — Empty States (systeembrede catalogus)

Basisprincipes volledig vastgelegd in Hoofdstuk 4, Deel 8 en Hoofdstuk 6 (per-scherm empty states). Hier als component-catalogus samengevat voor directe herbruikbaarheid:

| Empty State | Waar toegepast | Uitleg | CTA |
|---|---|---|---|
| **No workouts** | Dashboard/Trainingsgeschiedenis, nieuwe gebruiker | "Je hebt nog geen trainingen gelogd." | "Start je eerste training" |
| **No data** | Stats/Progressie, onvoldoende historie | "Nog niet genoeg data voor een trend." | "Terug naar training" |
| **Offline** | Elk scherm tijdens verbindingsverlies | "Je bent offline — wijzigingen worden lokaal bewaard." | Geen CTA nodig, informatief |
| **No connection** | Bij een mislukte eerste data-load zonder enige cache | "Kon geen verbinding maken." | "Opnieuw proberen" |
| **No statistics** | Statistieken-overzicht (6.2, Hoofdstuk 6), nieuwe gebruiker | Nul-staten met motiverende uitleg i.p.v. lege cijfers | "Start je eerste training" |
| **No goals** | Doelen-scherm (7.1, Hoofdstuk 6) | Uitleg wat een doel toevoegt | "+ Nieuw doel" |
| **No recovery** | Herstel-scherm, nieuwe gebruiker | "Nog geen trainingsdata om herstel te berekenen." | "Start training" |

**Gedeelde regel:** elke empty state bevat verplicht (Hoofdstuk 4, Deel 8): uitleg, motivatie, optionele AI-suggestie, en een concrete volgende stap/CTA — nooit uitsluitend een technische "geen data"-mededeling.

---

## Deel 14 — Error States (systeembrede catalogus)

Basisprincipes volledig vastgelegd in Hoofdstuk 4, Deel 9. Hier als directe, herbruikbare component-catalogus:

| Error State | Melding | Herstelactie | Fallback |
|---|---|---|---|
| **Network** | "Geen verbinding — je wijzigingen worden lokaal bewaard." | Automatisch herstel bij verbinding | Volledige offline-functionaliteit |
| **API** | "Kon geen verbinding maken met de server." | "Opnieuw proberen" | Laatst bekende data blijft zichtbaar |
| **Authentication** | "Je sessie is verlopen." | Doorverwijzing naar Login (1.3, Hoofdstuk 6) | Onopgeslagen lokale wijzigingen blijven bewaard tot na opnieuw inloggen |
| **Validation** | Veldspecifiek, inline onder het betreffende veld | Correctie door de gebruiker | N.v.t. |
| **Wearable** | "Synchronisatie met [wearable] mislukt." | Onderscheid tijdelijk/verlopen (Hoofdstuk 4, Deel 9) | Handmatige invoer |
| **Synchronization** | "X item(s) konden niet gesynchroniseerd worden." | "Opnieuw proberen" per item of in bulk | Item blijft in de offline-wachtrij |
| **Subscription** | "Betaling kon niet worden verwerkt." | Directe link naar betaalgegevens bijwerken | Bestaande tier blijft actief tot expliciete degradatie, nooit abrupt functieverlies bij een tijdelijke betaalfout |

**Gedeelde regel:** elke foutmelding beschrijft wat er misging én wat de gebruiker nu kan doen (Golden Rule UX36); nooit uitsluitend een technische foutcode.

---

## Deel 15 — Loading States (systeembrede catalogus)

| Loading State | Wanneer gebruiken | Specificatie |
|---|---|---|
| **Skeleton** | Standaard voor elk scherm/kaart dat op data wacht | Grijze blokken op exacte posities van de uiteindelijke content (Hoofdstuk 4/5) |
| **Spinner** | Binnen een knop (Loading Button, 1.8) of klein, geïsoleerd element | 16-32px, kleur consistent met de context |
| **Progress** | Bekende, meetbare voortgang (export, programma-generatie per week) | Determinate balk, nooit misleidend sneller/langzamer dan werkelijk (Hoofdstuk 4, Deel 5) |
| **Partial Loading** | Een deel van het scherm is klaar, een ander deel laadt nog (bijv. Dashboard-kaarten die onafhankelijk laden) | Elk onderdeel toont zijn eigen skeleton/spinner, losstaand van de overige onderdelen |
| **Background Sync** | Offline-wachtrij-verwerking, wearable-sync | Subtiele, niet-blokkerende indicator (badge/icoon), nooit een volledige-scherm-overlay |

**Gedeelde regel:** Loading Overlay (11.8) is de uitzondering, niet de norm — de standaardvoorkeur is altijd niet-blokkerende, contextuele loading.

---

## Deel 16 — Animations (systeembrede catalogus)

Volledige token-specificatie: Hoofdstuk 5, Deel 14 (Motion Tokens). Hier gekoppeld aan concrete interactietypen:

| Animatie | Token | Toepassing |
|---|---|---|
| **Tap** | `motion-instant` (80ms) | Drukstaat op elk tikbaar element |
| **Swipe** | Vloeiend meebewegend, `motion-spring-gentle` bij terugveren | Bottom sheet, kalendernavigatie |
| **Drag** | Vloeiend meebewegend met de vinger | Herordenen van eigen content |
| **Expand** | `motion-standard` (200-250ms) | Expandable List, AI Explanation |
| **Collapse** | `motion-standard`, omgekeerde richting | Zelfde componenten, sluiten |
| **Open** (modal/sheet) | `motion-standard` slide/fade-in | Dialog, Bottom Sheet |
| **Close** (modal/sheet) | `motion-fast` fade-out | Zelfde componenten |
| **Navigation** (schermovergang) | `motion-standard` | Elke schermwissel |
| **Success** | `motion-fast`, kleur naar teal | Bevestiging van een geslaagde actie |
| **Warning** | `motion-fast`, kleur naar amber | Waarschuwing-signalen |
| **Failure** | `motion-fast` lichte shake, geen felle flits | Foutmeldingen |
| **PR Celebration** | `motion-spring-bouncy` (uitsluitend hier toegestaan) | PR-badge, PR-detailweergave |
| **Workout Finished** | `motion-slow` (400-600ms) | Overgang naar sessie-samenvatting |

**Gedeelde regel:** elke animatie dient oriëntatie, bevestiging of nadruk (Hoofdstuk 4, Deel 5) — nooit decoratie zonder functie; `motion-reduced` vervangt alle bovenstaande bij `prefers-reduced-motion`.

---

## Deel 17 — Haptics (systeembrede catalogus)

| Haptiek | Intensiteit | Toepassing |
|---|---|---|
| **Light** | Kortste, zachtste puls | Standaardtik op knoppen, stepper-increments, navigatie |
| **Medium** | Middellange, duidelijker voelbare puls | Rolwijziging, destructieve bevestiging-opening, superset-koppeling |
| **Heavy** | Langste, sterkste puls | Zeldzaam — uitsluitend bij de meest kritieke, onomkeerbare bevestigingen (account definitief verwijderd) |
| **Notification** | Kort, tweeledig patroon | Binnenkomend coach-bericht, gym-aankondiging |
| **Workout** | Zeer lichte puls, geoptimaliseerd voor herhaling zonder vermoeiend te worden | Elke set-opslag-bevestiging tijdens training |
| **PR** | Onderscheidend, positief patroon (verschilt van reguliere Workout-haptiek) | Uitsluitend bij een nieuw persoonlijk record |
| **Warning** | Kort, herkenbaar afwijkend patroon | AI-waarschuwing, wearable-tokenverval |
| **Error** | Duidelijk, maar niet overdreven sterk patroon | Mislukte actie, foutmelding |

**Gedeelde regel:** haptische feedback is systeembreed uitschakelbaar via Instellingen (Hoofdstuk 6, Scherm 8.3) en wordt nooit als enige feedbackvorm gebruikt — altijd gecombineerd met visuele bevestiging (Hoofdstuk 3/4, Accessibility).


---

## Interaction Matrix — Consolidated Appendix

Elke component hierboven bevat zijn eigen Interaction Matrix-detail binnen de specificatie. Onderstaande tabel consolideert dit voor de meest gebruikte, kritieke componenten in één overzicht — bedoeld als snelle referentie tijdens implementatie, niet als vervanging van de gedetailleerde per-component matrices.

| Component | Tap | Double Tap | Long Press | Swipe | Drag | Keyboard | Screen Reader | Orientation | Offline |
|---|---|---|---|---|---|---|---|---|---|
| Primary/Secondary/Ghost/Danger Button | Activeert | N.v.t. | N.v.t. | N.v.t. | N.v.t. | Enter/Spatie | Label + rol voorgelezen | Ongewijzigd | Blijft tikbaar, actie in wachtrij indien nodig |
| Stepper | Increment | Snelle dubbele increment (geen aparte functie, telt als twee taps) | Versneld doorlopen increment | N.v.t. | N.v.t. | Pijltjestoetsen | Waarde + actie voorgelezen | Ongewijzigd | Volledig functioneel |
| Text Field | Focus | N.v.t. | Selecteer-alles (platform-standaard) | N.v.t. | N.v.t. | Volledige tekstinvoer | Label + waarde voorgelezen | Toetsenbord past zich aan | Volledig functioneel |
| Checkbox/Switch/Radio | Toggle/selecteer | N.v.t. | N.v.t. | N.v.t. | N.v.t. | Spatiebalk/pijltjes | Status voorgelezen | Ongewijzigd | Lokaal opgeslagen |
| Chips | Selecteer/deselecteer | N.v.t. | N.v.t. | Horizontaal scrollen bij overflow | N.v.t. | Tab + Enter | Groep + status voorgelezen | Ongewijzigd | Lokaal opgeslagen |
| Bottom Navigation | Navigeert | N.v.t. | N.v.t. | N.v.t. (bewust uitgesloten) | N.v.t. | Tab-volgorde | Naam + actieve status | Ongewijzigd | Alle items bereikbaar |
| Bottom Sheet | Sluit (buiten sheet) | N.v.t. | N.v.t. | Sluit (swipe-down) | Sleepgreep verplaatst hoogte (indien variabel) | Escape sluit | Focus-trap, aangekondigd bij openen | Herpositioneert bij rotatie | Volledig functioneel |
| Dialog | Activeert knop | N.v.t. | N.v.t. | N.v.t. | N.v.t. | Focus-trap, Escape (niet-kritiek) | `role="alertdialog"` | Herpositioneert bij rotatie | Volledig functioneel |
| Workout Card / Exercise Block | Vouwt open/dicht | N.v.t. | Contextmenu (Exercise Card only) | N.v.t. (bewust uitgesloten tijdens training) | N.v.t. | Tab + Enter | Naam + status voorgelezen | Ongewijzigd | Volledig functioneel |
| Set Block / Stepper (trainingscontext) | Increment/opslaan | N.v.t. | Versneld increment | N.v.t. | N.v.t. | Pijltjestoetsen | Setnummer + waarden | Ongewijzigd | Volledig functioneel, wachtrij bij offline |
| Rest Timer | Uitklappen | N.v.t. | N.v.t. | Minimaliseren (swipe-down) | N.v.t. | Spatiebalk (pauze) | Resterende tijd op verzoek, einde altijd aangekondigd | Ongewijzigd | Volledig functioneel (lokaal) |
| Coach Message / AI Card | Uitklapt uitleg | N.v.t. | N.v.t. | N.v.t. | N.v.t. | Tab + Enter | Type + inhoud voorgelezen | Ongewijzigd | Geschiedenis leesbaar, nieuwe berichten vereisen verbinding |
| Line/Bar Chart | Toont tooltip op datapunt | N.v.t. | N.v.t. | Pannen bij lange reeksen | N.v.t. | Tab tussen datapunten (desktop) | Samenvatting voorgelezen | Herschaalt | Laatst bekende data zichtbaar |
| Table (alle varianten) | Sorteert (kolomkop) / navigeert (rij) | N.v.t. | N.v.t. | Horizontaal scrollen bij veel kolommen | N.v.t. | Pijltjestoetsen tussen rijen (desktop) | Correcte tabel-semantiek | Herschikt kolommen op smal scherm | Laatst bekende data zichtbaar |
| Video Player | Play/pause | Volledig scherm (platform-standaard) | N.v.t. | N.v.t. | Scrubben op de tijdlijn | Spatiebalk | Transcript/ondertiteling | Herschaalt naar breedbeeld | Vereist verbinding (niet lokaal gecached) |

---

## Component Relationship Matrix

Welke componenten mogen samen voorkomen binnen dezelfde context, en welke combinaties zijn expliciet verboden — direct voortkomend uit Product Principle P7 (één primair doel per interactie) en de component-specifieke Business Rules hierboven.

| Combinatie | Toegestaan? | Toelichting |
|---|---|---|
| Primary Button + Secondary Button (zelfde scherm/dialog) | ✅ Toegestaan | Standaardpatroon voor een tweeledige keuze (bijv. AI Coach-advies, 4.2 Hoofdstuk 6). |
| Twee Primary Buttons (zelfde scherm) | ❌ Verboden | Doorbreekt Product Principle P7 — er is precies één primaire actie per scherm. |
| FAB + Primary Button (zelfde scherm, zelfde actie) | ❌ Verboden | Redundant — kies één van beide voor de betreffende actie. |
| FAB + Bottom Navigation | ✅ Toegestaan | FAB zweeft boven de content, Bottom Navigation blijft onderaan — geen visueel conflict mits voldoende marge. |
| Danger Button buiten een Confirmation Dialog | ❌ Verboden | Danger Button (1.4) is uitsluitend toegestaan binnen een Confirmation Dialog-context (11.5). |
| Snackbar + Dialog (gelijktijdig) | ❌ Verboden | Een Dialog blokkeert de aandacht volledig — een Snackbar mag nooit gelijktijdig verschijnen; wacht tot de Dialog gesloten is. |
| Loading Overlay + enige andere interactieve component | ❌ Verboden (per definitie) | Loading Overlay (11.8) blokkeert alle overige interactie zolang actief. |
| Workout Card + Rest Timer | ✅ Toegestaan (verplicht samen) | De Rest Timer (9.5) is functioneel gekoppeld aan het opslaan van een set binnen een Workout Card. |
| Superset Block + meer dan twee gekoppelde Exercise Blocks | ⚠️ Uitzondering, niet standaard | Toegestaan als bewuste "circuit"-uitbreiding (9.3), niet de standaardvorm. |
| AI Card zonder AI Explanation | ❌ Verboden | Product Principle P3 — elk AI-advies bevat verplicht de uitlegcomponent (10.2). |
| Chips (Filter) + Search (zelfde scherm) | ✅ Toegestaan | Veelvoorkomende combinatie in Oefeningbibliotheek/Autocomplete-context (2.4). |
| Tabs + Segment Control (zelfde scherm, verschillende functie) | ✅ Toegestaan, met onderscheid | Toegestaan zolang Tabs content-secties wisselt en Segment Control een weergavemodus binnen die sectie — nooit beide voor dezelfde functie (4.5). |
| Drawer + Bottom Navigation (zelfde scherm) | ❌ Verboden | Drawer (4.7) is uitsluitend voor tablet/desktop rolgebonden dashboards; de mobiele atleet-ervaring behoudt uitsluitend Bottom Navigation. |
| Coach Message + Recommendation/Warning Card (zelfde gesprek) | ✅ Toegestaan | Coach Chat (4.3, Hoofdstuk 6) combineert vrije berichten met gestructureerde adviesk kaarten naadloos. |
| Native `confirm()`/`alert()` + enig ander component | ❌ Verboden, systeembreed | Vervangen door Confirmation Dialog (11.5) / Error Dialog (11.7) zonder uitzondering. |

---

## Reusable Component Matrix

Koppeling tussen de schermen uit Hoofdstuk 6 en de componenten uit dit hoofdstuk — beperkt tot de kerncomponenten per scherm om de matrix bruikbaar te houden (ondersteunende componenten zoals Icon Button, Snackbar en Loading states worden systeembreed op vrijwel elk scherm gebruikt en zijn hier niet herhaald).

| Scherm (Hoofdstuk 6) | Kerncomponenten |
|---|---|
| 1.1 Splash | Geen interactieve componenten |
| 1.2 Onboarding | Radio Button, Text Field, Stepper, Primary/Ghost Button, AI Card |
| 1.3 Login / 1.4 Registreren | Text Field (Email/Password), Primary/Ghost Button, Checkbox |
| 2.1 Dashboard | KPI Card, Progress Card, Recovery Circle, Primary Button, History List |
| 2.2 Vandaag | Analytics Card, Line Chart, AI Explanation |
| 3.1 Trainingsschema | Exercise Card (keuzekaarten), Simple List |
| 3.2 Training uitvoeren / 3.3 Oefening | Exercise Block, Set Block, Superset Block, Stepper, Rest Timer, Plate Calculator, Workout Header/Footer/Timer |
| 3.5 Rusttimer | Rest Timer, Segment Control (presets) |
| 3.6 Plate Calculator | Plate Calculator, Stepper, Segment Control |
| 4.1 Programmagenerator | Text Field, Stepper, Dropdown, Expandable List, Progress |
| 4.2 AI Coach | Recommendation Card, AI Explanation, Primary/Secondary Button |
| 4.3 Coach Chat | Coach Message, AI Explanation, Warning Card, Text Field |
| 5.1 Herstel / 5.2 Anatomie / 5.3 Spierbelasting | Recovery Card, Heatmap, Bar Chart, Radar Chart |
| 6.1 Progressie / 6.2 Statistieken | Line Chart, KPI Card, Filter Chips, Tabs |
| 6.3 Persoonlijke records | PR Timeline, Grouped List |
| 6.4 Kalender | Calendar |
| 7.1 Doelen | Goal Card, Progress Card, FAB |
| 7.2 Challenges | Challenge Card |
| 7.3 Team | Gym Members Table, Audit Log Table, Dropdown, Coach Card |
| 7.4 Gym | Gym Card |
| 8.1 Wearables | Card, Primary/Secondary Button, Permission Dialog |
| 8.2 Meldingen | Switch |
| 8.3 Instellingen / 8.4 Profiel | Simple List, Text Field, Avatar/Profile Photo, Confirmation Dialog |
| 9.1 Abonnement | Statistics Table (tier-vergelijking), Progress, Primary Button |
| 9.2 Backup | Card, Snackbar |
| 9.3 Import/Export | Card, Primary Button |
| 9.4 Help | Search, Expandable List |
| 9.5 Feedback | Segment Control, Text Field, Primary Button |
| 9.6 Privacy / 9.7 Over de app | Statische tekstsecties, geen interactieve kerncomponenten behalve links |


---

## Design Token Mapping

Koppeling tussen elke componentcategorie en de tokens uit Hoofdstuk 5, Deel 15 — het enige naslagwerk dat nodig is om te controleren of een component consistent met het Design System is geïmplementeerd.

| Componentcategorie | Typography | Color | Spacing | Radius | Elevation | Motion |
|---|---|---|---|---|---|---|
| Buttons (Deel 1) | `type-button` | `color-primary`/`color-accent`/`color-danger` | `space-12`/`space-24` | `radius-md` | `elevation-0` | `motion-instant`, `motion-fast` |
| Inputs (Deel 2) | `type-body`, `type-caption` | `color-accent` (focus), `color-danger` (error) | `space-12`/`space-16` | `radius-default` | `elevation-0` | `motion-fast` |
| Selection (Deel 3) | `type-body`, `type-caption` (Chips) | `color-accent` (actief) | `space-8`/`space-12` | `radius-sm` (checkbox), `radius-round` (radio/switch), `radius-pill` (chips) | `elevation-0` | `motion-fast` |
| Navigation (Deel 4) | `type-caption` (labels) | `color-accent` (actief), `color-surface` | `space-8` | `radius-xl` (bottom sheet), geen radius (bottom nav/app bar) | `elevation-2` (nav), `elevation-3` (sheet) | `motion-standard` |
| Cards (Deel 5) | `type-title`, `type-statistic`, `type-caption` | `color-surface`, domeinspecifieke accenten (AI: `color-info`, Recovery: heatmapschaal) | `space-16` | `radius-md` | `elevation-1`/`elevation-2` | `motion-standard` |
| Lists (Deel 6) | `type-body`, `type-caption`, `type-title` (Sec-hd) | `color-surface`, dividers `color-neutral-light` | `space-16` | Geen (of `radius-md` bij kaart-lijst-hybride) | `elevation-0`/`elevation-1` | `motion-standard` (expand/collapse) |
| Tables (Deel 7) | `type-caption` (koppen), `type-body` (cellen) | `color-surface`, dividers `color-neutral-light` | `space-12`/`space-16` | `radius-md` (buitenrand) | `elevation-1` | `motion-fast` |
| Charts (Deel 8) | `type-caption`, `type-statistic` | `color-accent`, `color-secondary`, categorische reeks | `space-16` | Erft van omvattende Card | `elevation-0` (leeft in Card) | `motion-slow` (eerste laden) |
| Training (Deel 9) | `type-workout`, `type-title`, `type-caption` | `color-primary`, `color-accent` (actief), heatmapschaal (Rest Timer) | `space-16`, ruimere touch-targets | `radius-md` | `elevation-1`/`elevation-2` (actief) | `motion-instant` (set-opslag), `motion-spring-bouncy` (PR) |
| AI (Deel 10) | `type-ai` | `color-info` (petrol-achtergrond) | `space-16`, `space-8` (interne AI Explanation-marge) | `radius-md` | `elevation-1` | `motion-standard`, typerende tekstanimatie |
| System (Deel 11) | `type-title`, `type-body`, `type-button` | `color-danger` (destructief), `color-primary`/`color-surface` (neutraal) | `space-24` (dialog-padding) | `radius-lg` (dialog), `radius-xl` (sheet), `radius-default` (snackbar) | `elevation-3` | `motion-standard`, `motion-fast` |
| Media (Deel 12) | `type-caption` | Neutraal, geen merkkleur-overlay op video | `space-16` | `radius-md` (video), `radius-round` (avatar) | `elevation-0` | `motion-fast` (player-controls) |

**Regel:** elke nieuwe component die aan deze bibliotheek wordt toegevoegd, vult deze mapping-tabel direct aan — een component zonder tokenkoppeling geldt als onvolledig gespecificeerd en mag niet gebouwd worden (Design Constitution wet 31, Hoofdstuk 5).

---

## Component Library Constitution

Twaalf bindende wetten, specifiek voor het beheer en de uitbreiding van deze componentbibliotheek — aanvullend op de Product Constitution (Hoofdstuk 3), UX Constitution (Hoofdstuk 4), Design Constitution (Hoofdstuk 5) en Screen Design Laws (Hoofdstuk 6).

**1.** Geen enkele nieuwe UI-component wordt gebouwd zonder eerst in deze bibliotheek te zijn gespecificeerd volgens het vaste vierentwintig-veld-format.

**2.** Elke component wordt eerst getoetst op hergebruik van een bestaande component of variant (Product Principle P9) vóórdat een nieuw component wordt overwogen.

**3.** Elke component heeft een expliciete status (🟢/🟡/🔴) die de daadwerkelijke bouwstaat weerspiegelt, actueel gehouden bij elke wijziging.

**4.** Elke component is gekoppeld aan minimaal één scherm uit Hoofdstuk 6 (Reusable Component Matrix) — een component zonder schermtoepassing wordt niet aan de bibliotheek toegevoegd.

**5.** Elke component is gekoppeld aan expliciete Design Tokens (Design Token Mapping) — geen losse, ongedocumenteerde stijlwaarden.

**6.** Elke interactieve component specificeert zijn volledige Interaction Matrix (tap, double tap, long press, swipe, drag, keyboard, screen reader, orientation, offline).

**7.** De Component Relationship Matrix is bindend: verboden combinaties worden nooit samen geïmplementeerd, ook niet als tijdelijke/experimentele oplossing.

**8.** Elk AI-gerelateerd component (Deel 10) bevat verplicht een uitlegcomponent (AI Explanation, 10.2) — zonder uitzondering.

**9.** Elke destructieve actie in de app gaat door een Confirmation Dialog (11.5) — native systeemdialogen zijn systeembreed verboden.

**10.** Elk component ondersteunt dark mode als volwaardig, gelijktijdig gespecificeerd alternatief — nooit als latere toevoeging.

**11.** Elke wijziging aan een bestaand component (nieuwe state, nieuwe variant) wordt in deze bibliotheek bijgewerkt vóórdat de wijziging als "voltooid" geldt.

**12.** Elke afwijking van deze wetten, of van een specifieke componentspecificatie in dit hoofdstuk, wordt expliciet vastgelegd in de Decision Log, met motivatie en impactanalyse — dezelfde bindende werkwijze als de voorgaande Constitutions voorschrijven.

---

*Einde Hoofdstuk 7. Dit hoofdstuk vormt samen met Hoofdstuk 1 (Productvisie & Filosofie), Hoofdstuk 2 (Doelgroepen, Persona's & Customer Journey), Hoofdstuk 3 (Product Design Principles & Golden Rules), Hoofdstuk 4 (Premium UX & Interaction Design Handbook), Hoofdstuk 5 (Premium UI Design System & Visual Language) en Hoofdstuk 6 (Screen Specifications & Complete Screen Library) het volledige, tot op componentniveau bouwbare fundament van het TrainingKompas Premium Development Handbook. Vanaf dit hoofdstuk wordt geen enkele nieuwe UI-component ontwikkeld zonder eerst hier te zijn toegevoegd — de Component Library Constitution hierboven is daarbij, samen met de Reusable Component Matrix en de Design Token Mapping, het verplichte toetsingskader.*

