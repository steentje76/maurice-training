# TrainingKompas Premium Development Handbook

## Hoofdstuk 11 — Motion Design, Animation System & Micro-interactions

**Status:** bindend document. Vanaf dit hoofdstuk wordt geen enkele animatie, overgang, haptische feedback of micro-interactie toegevoegd zonder hieraan te voldoen. Dit hoofdstuk is de enige, definitieve bron voor alle beweging binnen TrainingKompas.
**Voortbouwend op:** Hoofdstuk 1-10. In het bijzonder Hoofdstuk 4 (Deel 5 Motion Design, Deel 6 tachtig micro-interactions), Hoofdstuk 5 (Deel 14 Motion Tokens, Deel 13 Dark Mode), Hoofdstuk 7 (Deel 16 Animations-catalogus, Deel 17 Haptics-catalogus) en Hoofdstuk 6 (de 37 schermen die hier hun overgangen krijgen).
**Karakter:** productspecificatie — geen code, geen implementatie, geen Lottie-bestanden.

---

### Leeswijzer: wat dit hoofdstuk toevoegt aan wat al bestaat

Motion is in dit Handbook nooit pas nu voor het eerst ter sprake gekomen — Hoofdstuk 4 legde de tien motion-categorieën en tachtig micro-interactions al vast, Hoofdstuk 5 introduceerde acht motion-tokens, Hoofdstuk 7 koppelde animaties aan componenten en haptiek aan gebeurtenissen. Dit hoofdstuk **consolideert die drie bronnen tot één definitief systeem** en vult drie gaten die eerdere hoofdstukken bewust nog open lieten: (1) een volledig, uitgebreid tokenstelsel met betekenisvolle namen in plaats van alleen snelheidscategorieën, (2) scherm-voor-scherm-overgangsspecificaties voor alle 37 schermen (Hoofdstuk 6), en (3) motion-performance en een uitputtende QA-laag. Waar dit hoofdstuk iets herhaalt dat al elders vastligt, gebeurt dat nooit inhoudelijk — uitsluitend als expliciete verwijzing.

**Statusaanduiding:** 🟢 reeds vastgelegd elders, hier geconsolideerd · 🟡 gedeeltelijk vastgelegd, hier uitgebreid · 🔴 nieuw in dit hoofdstuk.

---

## Deel 1 — Motion Philosophy

### Waarom bewegen?

TrainingKompas beweegt om precies drie redenen, nooit om een vierde — dit drieledige doel is al vastgesteld in Hoofdstuk 4 (Deel 5): **oriëntatie** (waar kom ik vandaan, waar ga ik heen), **bevestiging** (is mijn actie geslaagd) en **nadruk** (dit is belangrijk). Elke animatie in dit hoofdstuk is getoetst aan deze drie — een animatie die geen van de drie dient, wordt niet gebouwd, ongeacht hoe "premium" hij zou ogen (Product Principle P6, Hoofdstuk 3).

### Wanneer wel, wanneer niet?

| Wel bewegen | Niet bewegen |
|---|---|
| Een actie is voltooid en verdient bevestiging (set opgeslagen, PR behaald) | Statische, informatieve tekst die niet interactief is |
| De gebruiker navigeert en heeft ruimtelijke oriëntatie nodig | Content die al zichtbaar en stabiel is (geen "adem"-animatie op rustige elementen) |
| Content verandert van staat (laden → geladen, leeg → gevuld) | Herhaalde, identieke gebeurtenissen die door overdaad hun betekenis verliezen (elke gewone set net zo vieren als een PR) |
| Iets vraagt om nadruk binnen een verder rustig scherm (een waarschuwing, een PR) | Wanneer `prefers-reduced-motion` actief is en de animatie puur decoratief zou zijn |

### Rust versus dynamiek

TrainingKompas kiest bewust voor een basisregister van **rust** (Hoofdstuk 1, sectie 1.6: "premium betekent rust, geen ruis") met **spaarzaam ingezette dynamiek** op de momenten die dat verdienen. Dit is meetbaar terug te zien in de bestaande motion-tokens (Hoofdstuk 5, Deel 14): zeven van de acht tokens zijn kort en functioneel (80-600ms), en precies één token (`motion-spring-bouncy`) is uitdrukkelijk "speelser" — gereserveerd voor het enige moment waarop dat gerechtvaardigd is (een PR, Deel 9). Deze verhouding — overwegend rustig, één bewust uitzonderlijk moment — is de kern van de motion-filosofie en wordt in dit hoofdstuk op elk niveau herhaald.

### Premium uitstraling door beweging

Premium motion communiceert via **precisie**, niet via spektakel: een animatie die exact de juiste duur heeft (niet te snel, niet te traag), die precies stopt waar hij moet stoppen, en die nooit hapert. Dit is dezelfde logica als Visual Identity (Hoofdstuk 5, Deel 1): beperking, consistent toegepast, oogt duurder dan overvloed.

### Emotionele impact

Elke animatiecategorie in dit hoofdstuk is gekoppeld aan de emotie die hij moet oproepen (Hoofdstuk 3, Deel 9; Hoofdstuk 4, Deel 9) — bevestiging voelt geruststellend, een PR voelt trots, een fout voelt kalm nooit alarmerend. Motion is een van de krachtigste dragers van deze emoties omdat het, anders dan tekst, direct en pre-cognitief overkomt — wat een animatie "zegt" wordt gevoeld vóór het bewust gelezen wordt. Dat maakt zorgvuldigheid hier belangrijker, niet minder belangrijk, dan bij tekstuele content.

### Golden Rules (Deel 1, samenvattend)

1. Elke animatie dient oriëntatie, bevestiging of nadruk (herhaling, bindend).
2. Rust is de default; dynamiek is de uitzondering die verdiend moet worden.
3. Herhaalde gebeurtenissen krijgen nooit een uitbundiger effect dan hun frequentie rechtvaardigt.
4. Motion communiceert premium via precisie, nooit via spektakel.
5. `prefers-reduced-motion` wordt zonder uitzondering gerespecteerd (volledig uitgewerkt: Deel 14).

---

## Deel 2 — Motion Principles

Negen principes die op elk motion-ontwerp in dit hoofdstuk van toepassing zijn.

| Principe | Beschrijving | Toepassing |
|---|---|---|
| **Continuïteit** | Een animatie toont het pad van A naar B, nooit een abrupte sprong die de relatie tussen twee staten verbergt | Een uitklappende kaart (Hoofdstuk 7, 6.3) toont de hoogte-overgang vloeiend, springt niet direct naar de eindstaat |
| **Natuurlijke beweging** | Elementen versnellen en vertragen zoals fysieke objecten (ease-in/ease-out), nooit lineair-mechanisch tenzij functioneel vereist | Alle standaardovergangen gebruiken ease-in-out of ease-out (Hoofdstuk 5, Deel 14); lineaire beweging is gereserveerd voor determinate voortgangsindicatoren waar accurate snelheid belangrijker is dan natuurlijkheid (Hoofdstuk 4, Deel 5: progress bars) |
| **Focus** | Beweging trekt de aandacht naar wat nu relevant is, en weg van wat dat niet meer is | Een actieve Exercise Block krijgt visuele nadruk bij het wisselen van oefening (Hoofdstuk 7, 9.1), overige blocks worden tegelijk visueel rustiger |
| **Hiërarchie** | Belangrijkere elementen bewegen met meer nadruk (langere duur, grotere schaal) dan ondergeschikte elementen | Een PR-animatie (`motion-spring-bouncy`) is nadrukkelijker dan een reguliere set-bevestiging (`motion-instant`) |
| **Vertraging (delay/staggering)** | Meerdere gelijktijdige elementen verschijnen met een lichte, opeenvolgende vertraging in plaats van simultaan, om het oog te geleiden | PR-tijdlijn-items verschijnen staggered (Hoofdstuk 7, 6.6); dashboard-kaarten laden met een lichte opeenvolgende fade-in |
| **Responsiviteit** | Een animatie start binnen 100ms na de trigger, zonder uitzondering (Hoofdstuk 3/4, Performance Principles) | Elke tik-feedback, systeembreed |
| **Voorspelbaarheid** | Eenzelfde interactie beweegt overal in de app op dezelfde manier | Elke kaart gebruikt dezelfde pressed-animatie (Hoofdstuk 5, Deel 11), geen scherm-specifieke afwijkingen |
| **Minimalisme** | De kortst mogelijke animatie die het doel nog steeds dient, wordt gekozen boven een langere, "mooiere" variant | Elk token in Deel 3 is bewust aan de korte kant van wat natuurlijk aanvoelt |
| **Reduce Motion** | Elke animatie heeft een gedefinieerde, functioneel gelijkwaardige variant bij `prefers-reduced-motion` | Systeembreed, via het `motion-reduced`-token (Deel 3.9) |

---

## Deel 3 — Motion Tokens

Hoofdstuk 5 (Deel 14) legde acht basis-tokens vast. Dit hoofdstuk is de **definitieve, uitgebreide versie** — de acht basistokens blijven ongewijzigd bestaan als *primitieven* (duur+easing), en worden hier aangevuld met *semantische tokens* die een betekenisvolle naam koppelen aan een primitief, zodat een ontwikkelaar nooit hoeft te kiezen "welke duur voelt goed voor een modal" — dat is al beslist.

### 3.1 Primitieve tokens (ongewijzigd t.o.v. Hoofdstuk 5, Deel 14) 🟢

| Token | Duur | Easing | Doel |
|---|---|---|---|
| `motion-instant` | 80ms | ease-out | Drukstaten |
| `motion-fast` | 100-150ms | ease-out | Bevestigingen, kleine statuswisselingen |
| `motion-normal` (hernoemd van `motion-standard` voor consistentie met de in dit hoofdstuk gevraagde naamgeving — functioneel identiek) | 200-250ms | ease-in-out | Pagina-overgangen, kaartanimaties |
| `motion-slow` | 400-600ms | ease-out | Grafiek-tekenanimaties, vieringen |
| `motion-spring-gentle` | variabel (demping 0,8 / stijfheid 120) | spring | Terugveren (swipe, bottom sheet) |
| `motion-spring-bouncy` | variabel (demping 0,6 / stijfheid 180) | spring | Uitsluitend PR-viering |
| `motion-loading` (hernoemd van `motion-loading-pulse`) | 1200ms cyclus | ease-in-out, oneindig herhalend | Skeleton-loading |
| `motion-reduced` | 0-50ms | geen | Vervangt alle bovenstaande bij `prefers-reduced-motion` |

### 3.2 — 3.11 Semantische tokens (nieuw, dit hoofdstuk) 🔴

| Semantisch token | Gebouwd op primitief | Vertraging (delay) | Doel | Toepassingen |
|---|---|---|---|---|
| `motion-celebration` | `motion-spring-bouncy` + `motion-slow` (tweefasig: eerst de bouncy-verschijning, dan een korte rust-fase) | 0ms | Vieringsmomenten (Deel 9) | PR, doel behaald, mijlpaal |
| `motion-modal` | `motion-normal` (fade+scale) | 0ms | Dialog-opening (Hoofdstuk 7, 11.1) | Elke Dialog, Confirmation/Permission/Error Dialog |
| `motion-sheet` | `motion-normal` (slide-up) + `motion-spring-gentle` (terugveer bij onvoltooide swipe) | 0ms | Bottom Sheet-opening/sluiting (Hoofdstuk 7, 4.8) | Rusttimer-presets, Plate Calculator, filterkeuzes |
| `motion-navigation` | `motion-normal` (slide/fade, richting afhankelijk van voorwaarts/achterwaarts) | 0ms | Schermovergangen (Deel 4) | Elke navigatie tussen schermen |
| `motion-loading` | zie 3.1 | 0ms | (herhaling, consolidatie) | Skeleton-loading systeembreed |
| `motion-success` | `motion-fast` + accentkleur-overgang naar `color-success` (Hoofdstuk 5, Deel 3) | 0ms | Succesbevestiging | Set opgeslagen, instelling opgeslagen, sync voltooid |
| `motion-error` | `motion-fast` (lichte shake, max. 4px amplitude) + accentkleur-overgang naar `color-danger` | 0ms | Foutmelding | Validatiefout, mislukte actie |
| `motion-warning` | `motion-fast` + accentkleur-overgang naar `color-warning` | 0ms | Waarschuwing | ACWR-piek, wearable-tokenverval |

**Regel:** elke animatie in dit hoofdstuk (Deel 4-13) refereert uitsluitend aan een token uit 3.1 of 3.2-3.11 — nooit aan een losse, ad-hoc duur/easing-combinatie. Dit is de bindende, volledige tokenlijst; een nieuw token wordt alleen toegevoegd na expliciete toetsing of een bestaand token niet reeds volstaat (Product Principle P9).


---

## Deel 4 — Screen Transitions

### 4.1 Universele regel (geldt voor alle 37 schermen uit Hoofdstuk 6, tenzij hieronder een uitzondering vermeld staat)

| Actie | Token | Richting |
|---|---|---|
| **Open** (voorwaartse navigatie, niveau 0→1 of 1→2) | `motion-navigation` | Nieuw scherm schuift in van rechts, oud scherm schuift lichtjes naar links en vervaagt |
| **Close/Back** | `motion-navigation` | Omgekeerd — huidig scherm schuift naar rechts en vervaagt, vorig scherm schuift terug van links |
| **Forward** (via bottom-navigatie, geen hiërarchische relatie) | `motion-fast` cross-fade (geen slide — twee hoofdschermen zijn "gelijk", geen ouder-kind-relatie, dus geen richting) | Cross-fade, geen slide |
| **Modal (Dialog)** | `motion-modal` | Fade+scale-in, scrim tegelijk verdonkerend |
| **Bottom Sheet** | `motion-sheet` | Slide-up van onderaf |
| **Dialog sluiten** | `motion-modal` (omgekeerd, iets sneller: `motion-fast` in plaats van `motion-normal`) | Fade+scale-out |
| **Tab wisselen** (binnen eenzelfde scherm, bijv. Team Leden/Wijzigingslog) | `motion-fast` cross-fade | Geen richting, directe inhoud-wissel |

### 4.2 Scherm-specifieke aanvullingen (uitzonderingen op 4.1)

| Scherm(groep) | Aanvullende regel | Reden |
|---|---|---|
| **Dashboard** (2.1, Hoofdstuk 6) | Kaarten laden met gestaggerde `motion-normal` fade-in (Deel 2: Vertraging-principe) bovenop de standaard schermovergang | Voorkomt dat vijf kaarten simultaan "knipperen" bij het laden |
| **Workout** (3.2-3.6) | Opent zonder de standaard `motion-navigation`-slide — in plaats daarvan een snellere `motion-fast`-overgang, omdat elke milliseconde tussen "training starten" en "eerste set kunnen loggen" telt (Hoofdstuk 4, Deel 4: Workout Experience Principles) | Snelheid boven ceremonie in de meest gebruikte flow |
| **Coach (Chat/Advies)** | Berichten verschijnen met `motion-normal` (inschuivend vanaf de eigen zijde, Hoofdstuk 7, 10.1) bovenop de standaard schermovergang bij het openen van het scherm zelf | Onderscheidt de "gespreks"-laag van de "scherm"-laag |
| **Herstel** | De lichaamsvisualisatie kleurt in met een korte, vloeiende overgang (`motion-slow`) bij eerste weergave, niet instant — benadrukt dat dit "levende", actuele data is | Consistent met Hoofdstuk 4, Deel 5 (grafiek-tekenanimatie bij eerste laden) |
| **Analytics/Statistieken** | Grafieken tekenen zich in met `motion-slow`, eenmalig bij eerste laden binnen de sessie, nooit herhaald bij terugkeer (Hoofdstuk 4, Deel 5, bindende regel) | Voorkomt vermoeiende herhaling bij een veelbezocht scherm |
| **Instellingen** | Geen enkele aanvullende animatie — het meest "rustige" scherm in de app, uitsluitend de standaard schermovergang en directe toggle-feedback (Hoofdstuk 7, Switches) | Instellingen is functioneel, geen moment voor nadruk (Deel 1: rust is de default) |
| **Premium schermen** (Abonnement, upgrade-flow) | Standaard schermovergang, **expliciet geen** extra "opwindende" animatie bij het tonen van tiers/prijzen | Voorkomt elke schijn van manipulatieve, verkoop-gedreven enthousiasmering (Hoofdstuk 10, Deel 7: upsells nooit storend of manipulatief) |

**Bindende regel (Deel 4, samenvattend):** de standaardovergang (4.1) is voor 33 van de 37 schermen voldoende zonder enige aanvulling — de vier uitzonderingen hierboven (Dashboard, Workout, Coach, Herstel/Analytics als visualisatie-zwaar, Instellingen/Premium als bewust-rustig) zijn de enige toegestane afwijkingen, expliciet gemotiveerd. Geen enkel ander scherm krijgt een eigen, afwijkende overgangsanimatie zonder herziening van dit hoofdstuk.


---

## Deel 5 — Component Animations

Basisanimaties van elk component zijn al vastgelegd in Hoofdstuk 5 (Deel 11) en Hoofdstuk 7. Dit Deel voegt de laag toe die nog ontbrak: wat gebeurt er bij **interruptie** (de gebruiker onderbreekt de animatie met een nieuwe actie) en **herstel** (hoe keert het component terug naar een stabiele staat).

| Component | Start (trigger) | Einde | Interruptie | Herstel |
|---|---|---|---|---|
| **Button** (Hoofdstuk 7, Deel 1) | Tik | Pressed-animatie voltooid (`motion-instant`) | Een tweede tik tijdens de pressed-animatie wordt genegeerd (dubbel-klik-bescherming) | Keert direct terug naar rust-staat |
| **Card** (Hoofdstuk 5, Deel 11) | Tik (interactieve kaart) | Lift-animatie voltooid | Scroll tijdens de animatie: animatie voltooit alsnog, geen abrupte afkap | Terugkeer naar rust-elevatie na loslaten |
| **Input/Text Field** (Hoofdstuk 7, 2.1) | Focus | Randkleur-overgang voltooid (`motion-fast`) | Focus-wissel naar een ander veld tijdens de overgang: vorige overgang voltooit, nieuwe start gelijktijdig | Blur keert de rand direct terug naar rust |
| **Search** (Hoofdstuk 7, 2.1) | Toetsaanslag | Resultaten-fade-in voltooid | Nieuwe toetsaanslag tijdens laden: vorige zoekopdracht wordt geannuleerd, nieuwe start opnieuw vanaf 0ms | Lege invoer: resultaten vervagen naar de "recent gebruikt"-staat |
| **Tabs** (Hoofdstuk 7, 4.5) | Tik op tab | Pill-verschuiving voltooid (`motion-fast`) | Snelle opeenvolgende tik op meerdere tabs: elke tik onderbreekt de vorige verschuiving en start een nieuwe vanaf de huidige positie (geen wachtrij) | Eindigt altijd op de laatst getikte tab |
| **Navigation (Bottom Nav)** (Hoofdstuk 7, 4.1) | Tik op item | Actieve-staat-kleurovergang voltooid | N.v.t. (navigatie zelf onderbreekt niets, is de resulterende actie) | — |
| **Charts** (Hoofdstuk 7, Deel 8) | Eerste weergave binnen de sessie | Teken-animatie voltooid (`motion-slow`) | Navigeren weg vóór voltooiing: animatie stopt, bij terugkeer binnen dezelfde sessie geen herhaling (Hoofdstuk 4, Deel 5-regel) | Toont de volledige, statische grafiek bij een onderbroken animatie |
| **Progress** (Hoofdstuk 7, Deel 11) | Data-update | Vult tot de nieuwe waarde | Een snelle opeenvolgende update (bijv. tijdens synchronisatie): balk beweegt door naar de nieuwste waarde, geen tussenliggende sprongen worden overgeslagen (accuraat, Hoofdstuk 4 Deel 5) | Stabiliseert op de laatst bekende, correcte waarde |
| **Workout Card** (Hoofdstuk 7, 9.1) | Set opgeslagen / oefening gewisseld | Pulse/overgang voltooid | Snel achtereenvolgend loggen van meerdere sets: elke bevestiging is onafhankelijk en volledig, nooit samengevoegd of overgeslagen (elke set verdient zijn eigen, volledige bevestiging) | Keert direct terug naar invoerklare staat |
| **Exercise Card** | Tik (navigatie/toevoegen) | Navigatie voltooid | N.v.t. | — |
| **Recovery Card** (Hoofdstuk 7, 5.1/8.6) | Data-load | Kleur-inkleur-animatie voltooid (`motion-slow`, eerste keer) | Herhaald bezoek binnen dezelfde sessie: geen herhaalde inkleur-animatie, direct de eindstaat | — |
| **AI Card** (Hoofdstuk 7, 10.1-10.3) | AI-respons ontvangen | Typerende tekstanimatie voltooid | Gebruiker scrollt/tikt weg tijdens het typen: tekst verschijnt direct volledig (geen "achtervolgende" animatie die de gebruiker moet inhalen) | Volledige tekst blijft na interruptie leesbaar |
| **Bottom Sheet** (Hoofdstuk 7, 4.8) | Trigger-actie | Slide-up voltooid (`motion-sheet`) | Swipe-down tijdens het openen: animatie keert om (`motion-spring-gentle`), geen abrupte tegenstrijdige beweging | Rust in volledig open of volledig gesloten staat, nooit halverwege |
| **Dialog** (Hoofdstuk 7, Deel 11) | Trigger-actie | Fade+scale voltooid (`motion-modal`) | N.v.t. (dialogs zijn blokkerend, geen interruptie mogelijk tijdens de korte openingsanimatie) | — |
| **Snackbar** (Hoofdstuk 7, 11.2) | Actie-bevestiging | Slide-up + 4 sec zichtbaar + fade-out | Een nieuwe Snackbar tijdens een zichtbare: de oude verdwijnt versneld (`motion-fast`), de nieuwe verschijnt direct — nooit gestapeld | Verdwijnt na de vaste 4 seconden, ongeacht verdere interactie |
| **FAB** (Hoofdstuk 7, 1.6) | Scroll-richting-wissel | Verschijnen/verdwijnen voltooid | Snel wisselende scroll-richting: FAB volgt de laatste richting, geen "trillende" tussenstaat door een debounce van 150ms | Stabiliseert in zichtbare of verborgen staat |
| **Switch** (Hoofdstuk 7, 3.1) | Tik | Schuifbeweging voltooid (`motion-fast`) | Snelle dubbele tik: tweede tik na voltooiing van de eerste telt als een nieuwe, volledige toggle | Rust in aan/uit-staat |
| **Checkbox** (Hoofdstuk 7, 3.1) | Tik | Pulse voltooid (100ms) | Zelfde als Switch | Rust in aangevinkt/niet-aangevinkt |
| **Radio** (Hoofdstuk 7, 3.1) | Tik | Pulse voltooid, vorige selectie deselecteert gelijktijdig | Snelle opeenvolgende selectie binnen de groep: elke tik onderbreekt de vorige, eindstaat is altijd de laatst getikte optie | Rust op de actieve selectie |
| **Chips** (Hoofdstuk 7, 3.2-3.3) | Tik | Kleur/rand-overgang voltooid (`motion-fast`) | Snelle multi-select-tikken (Filter Chips): elke tik is onafhankelijk, geen wachtrij | Rust in de resulterende selectiecombinatie |

**Bindende regel (Deel 5, samenvattend):** elk component heeft een gedefinieerd interruptie-gedrag — geen enkel component "hangt" visueel vast in een onvoltooide, tegenstrijdige tussenstaat wanneer een gebruiker sneller handelt dan de animatie duurt.


---

## Deel 6 — Workout Motion

De meeste onderdelen hier zijn al volledig gespecificeerd in Hoofdstuk 4 (Deel 6, micro-interactions #1-20) — dit Deel consolideert die verwijzingen en vult twee ontbrekende onderdelen aan (Deload, Nieuwe week) die Hoofdstuk 4 nog niet behandelde.

| Moment | Token | Referentie | Aanvulling in dit hoofdstuk |
|---|---|---|---|
| **Workout starten** | `motion-fast` (Deel 4.2, uitzondering op standaardnavigatie) | Hoofdstuk 4, Flow 4 | — |
| **Nieuwe oefening** | `motion-normal` | Hoofdstuk 4, Micro-interactie #6 | — |
| **Nieuwe set** | `motion-instant` | Hoofdstuk 4, Micro-interactie #1-4 | — |
| **Set opgeslagen** | `motion-success` (Deel 3.7) | Hoofdstuk 4, Micro-interactie #1 | Vervangt de eerder losse beschrijving door het nu geformaliseerde semantische token |
| **Rusttimer** | `motion-normal` (start), `motion-warning` (30 sec resterend), `motion-success` (afgelopen) | Hoofdstuk 4, Micro-interactie #13-15 | Kleurwisseling nu expliciet gekoppeld aan de semantische tokens uit Deel 3 |
| **Superset** | `motion-fast` | Hoofdstuk 4, Micro-interactie #5 | — |
| **PR** | `motion-celebration` (Deel 3.2) | Hoofdstuk 4, Micro-interactie #33; volledige uitwerking: Deel 9 | — |
| **Workout voltooid** | `motion-slow` | Hoofdstuk 4, Micro-interactie #10 | — |
| **Deload** 🔴 | `motion-normal`, neutrale (niet-alarmerende) kleurtoon | Nieuw | Een deload-/peak-blok (Hoofdstuk 8, Deel 5.2) wordt in het programma-overzicht gemarkeerd met een rustige, geruststellende visuele overgang — een lichte, niet-nadrukkelijke `#00B894`-accentrand die vloeiend verschijnt, expliciet géén "waarschuwend" geel/amber (dat zou een deload ten onrechte als probleem framen, Product Constitution II) |
| **Nieuwe week** 🔴 | `motion-normal` | Nieuw | Bij het bereiken van een nieuwe programmaweek (Kalender/Programma-overzicht) verschijnt de nieuwe week-kop met een lichte fade-in, gesynchroniseerd met een subtiele voortgangsindicator-update (Progress Card, Hoofdstuk 7, 5.2) — een rustig, bevestigend moment, geen viering (dat is gereserveerd voor Deel 9) |

**Bindende regel:** binnen de trainingsflow is `motion-instant` en `motion-fast` de norm — geen enkele animatie binnen deze flow gebruikt `motion-slow` behalve de twee expliciet genoemde uitzonderingen (Workout voltooid, Deel 9-vieringen), consistent met Hoofdstuk 4 Deel 4 (Workout Experience Principles: snelheid boven alles).

---

## Deel 7 — AI Motion

Grotendeels al vastgelegd in Hoofdstuk 4 (Deel 6, micro-interactions #21-32) en Hoofdstuk 7 (Deel 10). Dit Deel consolideert naar de semantische tokens uit Deel 3 en voegt Confidence-motion toe (nieuw).

| AI-moment | Token | Referentie | Aanvulling |
|---|---|---|---|
| **AI denkt na** | `motion-loading` (drie pulserende puntjes) | Hoofdstuk 4, Micro-interactie #22 | — |
| **AI antwoord** | `motion-normal` (typerende tekst, snelheid = leessnelheid) | Hoofdstuk 4, Micro-interactie #23 | — |
| **Nieuwe aanbeveling** | `motion-normal` | Hoofdstuk 4, Micro-interactie #21/25/26 | — |
| **Confidence** 🔴 | `motion-fast` | Nieuw | Wanneer een Confidence Indicator (Hoofdstuk 8, Deel 3.8) een lage/middel-classificatie toont, verschijnt dit label met een subtiele, iets tragere fade-in dan de rest van het bericht — een bewust rustiger tempo dat onbewust "voorzichtigheid" communiceert, consistent met de inhoudelijke boodschap |
| **Coach spreekt** (regulier bericht) | `motion-normal` | Hoofdstuk 7, 10.1 | — |
| **Coach waarschuwt** | `motion-warning` | Hoofdstuk 4, Micro-interactie #24 | Nu expliciet gekoppeld aan het semantische `motion-warning`-token — kalm, geen felle flits (Hoofdstuk 3, Deel 9: fouten/waarschuwingen voelen rustig) |
| **Coach feliciteert** (bijv. bij het opvolgen van een advies of een consistente week) | `motion-success`, ingehouden (geen `motion-celebration` — dat is exclusief voor PR's/mijlpalen, Deel 9) | Hoofdstuk 4, Micro-interactie #36-37 | Expliciete afbakening: een compliment van de coach is `motion-success`, geen `motion-celebration` — het onderscheid tussen "goed gedaan" en "record behaald" moet ook motion-technisch voelbaar blijven |
| **Coach motiveert** | Geen aparte animatie — motivatie is een tekstuele/tonale eigenschap (Hoofdstuk 8, Deel 13.3), geen apart motion-moment | Hoofdstuk 8, Deel 13.3 | Bevestiging dat motivatie via taal werkt, niet via extra beweging (Deel 1: rust is de default) |

**Bindende regel:** AI-motion is systeembreed rustiger en trager dan Workout Motion (Deel 6) — dit is een bewust contrast dat de twee gebruiksmomenten (fysieke actie versus nadenken/lezen) motion-technisch onderscheidt.


---

## Deel 8 — Analytics Motion

Basis: Hoofdstuk 5 (Deel 12, Data Visualization) en Hoofdstuk 4 (Deel 5). Geconsolideerd naar de tokens uit Deel 3, met Kalender en Doelen als aanvulling.

| Visualisatie | Token | Gedrag |
|---|---|---|
| **Grafieken (algemeen)** | `motion-slow`, eenmalig per sessie | Lijn/staaf tekent zich in bij eerste weergave, nooit herhaald bij terugkeer binnen dezelfde sessie (Hoofdstuk 4, Deel 5, bindende regel) |
| **Lijnen** | `motion-slow` | Lijn "groeit" van links naar rechts |
| **Bars** | `motion-slow`, licht gestaggerd per staaf (Deel 2: Vertraging-principe) | Staven "groeien" verticaal, met een lichte opeenvolgende vertraging (~30ms tussen staven) voor een vloeiend, niet-simultaan effect |
| **Ringen** (Progress Ring, Recovery Circle) | `motion-slow` | Vult van 0% naar de actuele waarde bij eerste weergave; bij een dataupdate (niet eerste weergave): `motion-normal` vanaf de vorige naar de nieuwe waarde |
| **Heatmaps** | `motion-slow` (eerste weergave), `motion-normal` (kleurupdate bij nieuwe data) | Kleuren "vloeien" in per segment, niet als abrupte kleursprong |
| **Kalender** 🔴 | `motion-fast` (maandwissel: horizontale slide) | Nieuw gespecificeerd: maandnavigatie gebruikt dezelfde slide-richting-logica als schermnavigatie (Deel 4.1) — vooruit in de tijd schuift van rechts, terug schuift van links, een intuïtieve ruimtelijke metafoor voor tijd |
| **Progressie (1RM-trend)** | `motion-slow` | Zie "Grafieken (algemeen)" |
| **Doelen (voortgangsbalk)** 🔴 | `motion-normal`, lineair (accuraat, geen ease) | Nieuw gespecificeerd: een Goal/Progress Card-voortgangsbalk (Hoofdstuk 7, 5.2-5.3) beweegt met lineaire easing omdat nauwkeurigheid hier belangrijker is dan een "natuurlijk" gevoel (consistent met de bestaande Progress-regel uit Hoofdstuk 4, Deel 5: nooit misleidend sneller/langzamer dan de daadwerkelijke voortgang) |

**Bindende regel:** elke analytics-animatie in dit Deel is uitsluitend decoratief in de zin van *presentatie* — nooit in de zin van *vertraging*. De onderliggende data is direct beschikbaar; de animatie vertraagt nooit het moment waarop een gebruiker de uiteindelijke waarde kan aflezen (bijvoorbeeld via een tik die de animatie overslaat, indien de gebruiker niet wil wachten — impliciet mogelijk doordat een herhaalde tik/scroll de animatie nooit blokkeert, Deel 5-interruptieregel toegepast op Charts).


---

## Deel 9 — Celebration System

Het meest zorgvuldig gekalibreerde onderdeel van dit hoofdstuk: TrainingKompas viert prestaties ingehouden en oprecht (Hoofdstuk 1, sectie 1.15; Hoofdstuk 3, Deel 9), nooit uitbundig. Dit Deel legt een **intensiteitshiërarchie** vast — niet elke mijlpaal verdient dezelfde viering, en een systeem dat alles even hard viert, viert uiteindelijk niets meer (gewenning, Deel 1: "herhaalde gebeurtenissen krijgen nooit een uitbundiger effect dan hun frequentie rechtvaardigt").

### 9.1 Intensiteitshiërarchie (drie niveaus)

| Niveau | Wanneer | Token | Haptiek | Geluid |
|---|---|---|---|---|
| **Niveau 1 — Erkenning** | Frequente, kleine successen (Deel 7: "Coach feliciteert") | `motion-success` | Light | Geen |
| **Niveau 2 — Bevestiging** | Minder frequente, concrete prestaties | `motion-celebration` (ingetogen variant: kleinere schaal-overshoot) | Medium, onderscheidend patroon | Optioneel, zacht en kort (systeeminstelling-afhankelijk) |
| **Niveau 3 — Viering** | Zeldzame, grote mijlpalen | `motion-celebration` (volledige variant) | Medium-Heavy, duidelijk onderscheidend | Optioneel, zacht en kort |

### 9.2 — 9.9 De acht vieringsmomenten

| Moment | Niveau | Animatie | Timing | Haptiek | Geluid |
|---|---|---|---|---|---|
| **9.2 PR** | 3 | Badge verschijnt met `motion-celebration` (lichte overshoot-schaal, 400-600ms), gevolgd door een korte, subtiele "glow"-puls op de bijbehorende Statistic-waarde | Direct op het moment van opslaan (Hoofdstuk 4, Micro-interactie #33) | Positieve, onderscheidende trilling (Hoofdstuk 7, Deel 17: "PR"-haptiek) | Optioneel, kort en zacht signaal — nooit een fanfare |
| **9.3 Nieuw doel (ingesteld)** | 1 | `motion-success` op de Goal Card bij bevestiging | Direct na bevestiging (Hoofdstuk 6, Scherm 7.1) | Light | Geen |
| **9.4 Doel voltooid** | 2 | Progress Card-balk vult volledig met `motion-celebration` (ingetogen variant) | Direct bij detectie (automatisch, achtergrondproces + zichtbaar bij eerstvolgende app-open) | Medium | Optioneel, zacht |
| **9.5 100 trainingen** (of vergelijkbare grote getalsmijlpaal — 50/100/250/500) | 3 | Volledige `motion-celebration`, met een korte, eenmalige samenvattende kaart ("100 trainingen — knap volgehouden") die zichzelf niet herhaalt bij een volgend bezoek | Bij het bereiken van de mijlpaal, zichtbaar bij de eerstvolgende sessie-afronding of app-open | Medium-Heavy | Optioneel, iets langer maar nog steeds ingetogen (max. 1-2 seconden) |
| **9.6 Streak** (bijv. 4 weken op rij consistent) | 2 | Streak-teller incrementeert met `motion-fast` pulse (Hoofdstuk 4, Micro-interactie #37); bij een rond, herkenbaar getal (4/8/12 weken): korte `motion-celebration`-variant | Direct bij de kwalificerende actie | Zeer licht (reguliere increment), Medium (bij ronde getallen) | Geen (reguliere increment), optioneel zacht (ronde getallen) |
| **9.7 Badge** (indien gebouwd, Product Audit sectie 11: laagste gamification-prioriteit) | 2 | Badge-icoon verschijnt met `motion-celebration` (ingetogen variant) | Bij het behalen van de onderliggende trainingsmijlpaal | Medium | Optioneel, zacht |
| **9.8 Challenge** (voltooid, DEC-008-traject) | 2 | Bevestigingsbadge met `motion-success`, geen volledige celebration (challenges zijn per definitie vrijwillig en lichter van aard dan een PR) | Bij voltooiing | Medium | Geen |
| **9.9 Nieuwe mijlpaal** (generieke categorie voor toekomstige, nog niet specifiek benoemde mijlpalen) | Standaard niveau 2, tenzij expliciet als niveau 3 aangemerkt bij definitie | `motion-celebration` (ingetogen variant als default) | Bij detectie | Medium (default) | Optioneel, zacht (default) |

### 9.10 Bindende regels voor het hele Celebration System

1. **Niveau 3 is schaars gereserveerd** — uitsluitend PR's en de grootste getalsmijlpalen (9.5). Geen enkele andere gebeurtenis mag naar niveau 3 "opschuiven" zonder herziening van dit hoofdstuk.
2. **Geluid is systeembreed optioneel en standaard zacht** — nooit een luide, opdringerige jingle; de gebruiker kan geluid volledig uitschakelen zonder enig functieverlies (haptiek en visuele animatie blijven de primaire dragers).
3. **Geen enkele viering wordt herhaald bij een herbezoek** — een eenmaal getoonde PR-viering verschijnt niet opnieuw wanneer de gebruiker later terugkeert naar dezelfde sessie-samenvatting.
4. **Vieringen onderbreken nooit een lopende actie** — een PR tijdens een actieve trainingssessie viert zichzelf binnen de bestaande flow (Workout Card-badge), zonder een blokkerende modal die de volgende set zou vertragen (Hoofdstuk 4, Deel 4: snelheid boven alles, ook tijdens een vieringsmoment).
5. **Confetti-achtige, schermvullende effecten zijn systeembreed verboden** — consistent met Product Constitution XII en Hoofdstuk 4/5's herhaalde afwijzing van uitbundig spektakel.


---

## Deel 10 — Loading Experience

Grotendeels geconsolideerd uit Hoofdstuk 4 (Deel 15, Loading States) en Hoofdstuk 7 (Deel 15). Aanvullingen: Wearable Sync, Export, Import (nieuw gespecificeerd).

| Laadmoment | Token | Referentie/aanvulling |
|---|---|---|
| **Splash** | `motion-normal` (logo fade-in) | Hoofdstuk 6, Scherm 1.1 |
| **Skeletons** | `motion-loading` | Hoofdstuk 4, Deel 15; Hoofdstuk 7, Deel 15 — de standaard voor elk scherm/kaart dat op data wacht |
| **Progress** (determinate) | Lineaire beweging, geen ease (Deel 8-regel: accuraat boven natuurlijk) | Hoofdstuk 4, Deel 15 |
| **Background Sync** | `motion-loading` op een klein, niet-blokkerend badge-icoon | Hoofdstuk 4, Micro-interactie #44 |
| **AI Loading** | `motion-loading` (drie puntjes) | Deel 7.1 |
| **Wearable Sync** 🔴 | `motion-fast` (icoon-rotatie tijdens actieve sync), `motion-success` bij voltooiing | Nieuw: het sync-icoon op het Wearables-scherm (Hoofdstuk 6, Scherm 8.1) roteert met een constante, rustige snelheid (720°/sec, geen versnelling/vertraging) tijdens actieve synchronisatie — een voorspelbare, geen-haast-suggererende beweging, consistent met de niet-urgente aard van een routinematige achtergrondsynchronisatie |
| **Export** 🔴 | Determinate progress (Hoofdstuk 4, Deel 15) bij een meetbare voortgang; anders `motion-loading` | Nieuw: bij een export van een grote dataset (lange trainingsgeschiedenis) toont het scherm een determinate voortgangsbalk indien de omvang vooraf bekend is; bij een kleine, vrijwel instant export volstaat een korte `motion-fast`-bevestiging zonder aparte laadstaat |
| **Import** 🔴 | `motion-loading` tijdens verwerking, gevolgd door `motion-success` of `motion-error` afhankelijk van het resultaat | Nieuw: import toont expliciet een verwerkingsstatus (niet enkel een spinner zonder context) — "Bestand wordt gecontroleerd…" → "X sessies gevonden, worden geïmporteerd…" → bevestiging |

**Bindende regel:** Loading Overlay (Hoofdstuk 7, 11.8) — de volledige-schermblokkerende variant — wordt in geen van bovenstaande momenten gebruikt; elk laadmoment in dit Deel is niet-blokkerend, consistent met de bestaande regel dat een Loading Overlay de uitzondering is, niet de norm.

---

## Deel 11 — Empty States: subtiel tot leven komen

Empty states zijn inhoudelijk volledig gespecificeerd in Hoofdstuk 4 (Deel 8) en Hoofdstuk 7 (Deel 13) — dit Deel voegt uitsluitend de motion-laag toe die eerder nog niet expliciet was vastgelegd.

### Het principe: nooit statisch, nooit druk

Een lege staat die volledig statisch is, voelt "dood" aan — alsof de app niet werkt. Een lege staat die te druk beweegt, voelt overdreven aan voor wat in essentie "hier is nog niets" betekent. TrainingKompas kiest voor een derde weg: **een subtiele, doorlopende, zeer langzame ademhaling** op het illustratie-element (Hoofdstuk 5, Deel 9: het lijnstijl-icoon of het bergpad-motief), net genoeg om te bevestigen dat het scherm "leeft" zonder ooit de aandacht op te eisen.

| Aspect | Specificatie |
|---|---|
| **Animatie** | Een zeer subtiele schaal-ademhaling (98%-100%-98%) op het illustratie-icoon, cyclusduur 4 seconden, `ease-in-out` |
| **Timing** | Start 500ms na het verschijnen van de lege staat (niet direct — voorkomt dat het "onrustig" oogt bij het eerste zien) |
| **Intensiteit** | Minimaal — de beweging is bewust bijna onmerkbaar bij direct kijken, wel merkbaar in perifeer zicht (het verschil tussen "levend" en "opvallend") |
| **CTA-knop** | Geen ademhaling — blijft volledig statisch, zodat de enige bewegende content het decoratieve element is, nooit de actieknop (die moet stabiel en direct tikbaar zijn) |
| **Reduce Motion** | De ademhaling valt volledig weg; de lege staat blijft verder inhoudelijk identiek (Deel 14) |

**Bindende regel:** deze subtiele ademhaling is de **enige** toegestane animatie op een lege staat — geen bouncing iconen, geen kleurcycli, geen illustraties die "actief" iets voordoen. Dit houdt elke lege staat in de app consistent (Hoofdstuk 7, Deel 13: negen empty states, allemaal met exact dit ene, zelfde motion-patroon).


---

## Deel 12 — Error Motion

Inhoudelijk volledig gespecificeerd in Hoofdstuk 4 (Deel 9, Error Recovery) en Hoofdstuk 10 (Deel 9, navigatielaag). Dit Deel consolideert de motion-specifieke details naar het `motion-error`/`motion-warning`-token (Deel 3).

| Foutsituatie | Token | Motion-detail |
|---|---|---|
| **Validatie** (Hoofdstuk 5, Forms) | `motion-error` | Lichte shake (max. 4px amplitude, 150ms) op het betreffende veld, gelijktijdig met de randkleur-overgang naar `color-danger` |
| **Netwerk** | `motion-warning` (geen felle error — een netwerkonderbreking is functioneel, geen "fout" van de gebruiker) | Statusbalk verschijnt met `motion-fast` van bovenaf, geen shake |
| **Crash Recovery** 🔴 | `motion-normal` | Nieuw: bij het herstellen van een onverwachte app-herstart tijdens een actieve trainingssessie toont het scherm een korte, geruststellende overgang ("Je sessie is hersteld") met `motion-success`, nooit een technisch ogende foutmelding vooraf — het herstel zelf is het bericht |
| **Synchronisatie** | `motion-warning` | Wachtrij-icoon houdt zijn waarschuwingskleur zonder shake — een aanhoudende, rustige status, geen eenmalige schrik-animatie |
| **Wearable** | `motion-warning` | Statuskaart-kleurovergang, geen shake (Hoofdstuk 4, Deel 9: onderscheid tijdelijk/verlopen, beide zonder alarmerende beweging) |
| **AI** | `motion-warning`, zachter dan overige warnings (AI-onbeschikbaarheid is zelden urgent) | Neutrale melding verschijnt met `motion-fast`, geen shake, geen kleurintensivering voorbij `color-info` |

**Bindende regel:** `motion-error` (met shake) is uitsluitend gereserveerd voor directe, veld-gebonden validatiefouten waar de gebruiker onmiddellijk een correctie kan maken — elke overige foutsituatie (netwerk, sync, wearable, AI) gebruikt het rustigere `motion-warning`-token zonder shake, consistent met Hoofdstuk 3 Deel 9 ("fouten voelen rustig").

---

## Deel 13 — Haptic System

Basis: Hoofdstuk 7, Deel 17 (acht haptiek-categorieën). Dit Deel breidt uit met wanneer/waarom/wanneer-niet per gebeurtenis, plus vier aanvullende categorieën (Selection, Goal, Recovery, AI) die Hoofdstuk 7 nog niet apart benoemde.

| Categorie | Wanneer | Waarom | Wanneer NIET gebruiken |
|---|---|---|---|
| **Light** | Standaardtik, navigatie, stepper-increment | Bevestigt registratie van de tik zonder overdrijving — de meest voorkomende haptiek in de app | Nooit bij puur informatieve, niet-interactieve content |
| **Medium** | Rolwijziging, destructieve-dialoog-opening, superset-koppeling, niveau-2-vieringen (Deel 9) | Markeert een impactvollere actie die meer aandacht verdient dan een routinetik | Niet voor elke gewone bevestiging (zou de betekenis van "medium" uithollen) |
| **Heavy** | Uitsluitend account-definitief-verwijderd en vergelijkbare, werkelijk onomkeerbare acties | Gereserveerd voor het zeldzaamste, meest ingrijpende moment in de hele app | Vrijwel nooit — als Heavy vaker dan enkele keren per jaar gebruik voelt, is de toepassing te breed |
| **Selection** 🔴 | Chips-selectie, radio/checkbox-toggle, tab-wissel | Nieuw benoemd: een lichte, korte puls die zich onderscheidt van Light door een net iets kortere duur — specifiek voor "een keuze maken" in plaats van "een actie activeren" | Niet voor navigatie (die blijft Light) |
| **Success** | Set opgeslagen, instelling opgeslagen, sync voltooid | Bevestigt een geslaagde afronding | Niet bij elke tussenstap van een meerstaps-actie — uitsluitend bij de daadwerkelijke afronding |
| **Warning** | ACWR-piek, wearable-tokenverval, AI-waarschuwing | Trekt aandacht zonder te alarmeren | Nooit bij een routinematige, verwachte melding |
| **Failure** | Mislukte actie, validatiefout | Onderscheidt zich duidelijk van Success zonder overdreven hard te zijn | Nooit gestapeld (meerdere Failure-trillingen kort na elkaar bij dezelfde onderliggende fout) |
| **Workout** | Elke set-opslag-bevestiging tijdens training | Een lichte, voor herhaling geoptimaliseerde variant van Light — honderden keren per maand gebruikt, moet nooit vermoeiend worden | Niet buiten de actieve trainingsflow (elders gebruikt Success) |
| **PR** | Uitsluitend bij een nieuw persoonlijk record | Het meest onderscheidende, positieve patroon in de app — verdient herkenbaarheid | Nooit voor iets anders dan een daadwerkelijke PR (zou het patroon devalueren) |
| **Goal** 🔴 | Doel behaald (Deel 9.4) | Nieuw benoemd: Medium-intensiteit, onderscheiden van PR door een ander ritmisch patroon (twee korte pulsen in plaats van één langere) | Niet bij het instellen van een doel (dat is Light/Success, niet Goal) |
| **Recovery** 🔴 | Tik op een spiergroep in de heatmap voor detail | Nieuw benoemd: zeer lichte, informatieve puls — bevestigt interactie met gevoelige, lichaamsgerelateerde data zonder een "actie" te suggereren die er niet is | Niet bij het enkel bekijken van het Herstel-scherm zonder interactie |
| **AI** 🔴 | Ontvangen AI-antwoord (eerste teken van de typerende tekst) | Nieuw benoemd: zeer lichte puls die het begin van een AI-respons markeert, onderscheiden van een reguliere systeemmelding | Niet bij elk los zinsdeel tijdens het "typen" — uitsluitend bij de start van het antwoord |

**Bindende regel:** haptiek is systeembreed uitschakelbaar via Instellingen (Hoofdstuk 6, Scherm 8.3) en wordt nooit als enige feedbackvorm gebruikt — altijd gecombineerd met een visuele bevestiging (herhaling van Hoofdstuk 7, Deel 17, hier bevestigd als bindend voor alle twaalf categorieën).


---

## Deel 14 — Accessibility

Grotendeels geconsolideerd uit Hoofdstuk 3 (Deel 7), Hoofdstuk 4 (Deel 10), Hoofdstuk 5 (Deel 16) en Hoofdstuk 10 (Deel 11). Twee gebieden krijgen hier voor het eerst uitgebreide, motion-specifieke aandacht: Vestibulaire gevoeligheid en Epilepsie — beide vragen om net iets meer zorgvuldigheid dan eerdere hoofdstukken al gaven, gezien de directe fysieke impact die beweging op deze doelgroepen kan hebben.

| Gebied | Status | Motion-specifieke regel |
|---|---|---|
| **Reduce Motion** | 🟢 (Hoofdstuk 5, Deel 14) | Elk token in Deel 3 heeft een `motion-reduced`-equivalent; grafiek-teken-animaties, celebration-effecten en parallax-achtige bewegingen (indien die ooit geïntroduceerd zouden worden) vallen volledig weg — functionele bevestigingen (kleur, tekst) blijven behouden |
| **Screen Reader** | 🟢 (Hoofdstuk 3/4/5/10) | Een animatie communiceert nooit informatie die niet ook tekstueel/via `aria-live` beschikbaar is — een schermlezer-gebruiker mist door het uitschakelen van visuele animatie geen enkele functionele informatie |
| **Vestibulaire gevoeligheid** 🔴 | Nieuw, uitgebreid | Grote, snelle schaalveranderingen en parallax-effecten (dieptebeweging tussen lagen) worden systeembreed vermeden — geen enkele animatie in dit hoofdstuk (Deel 3-13) gebruikt een schaalverandering groter dan 10% of een simultane multi-laag-parallax. Dit is strenger dan enkel `prefers-reduced-motion` volgen: het is een structurele ontwerpgrens die voor alle gebruikers geldt, niet alleen voor wie de systeeminstelling heeft geactiveerd |
| **Epilepsie (fotosensitieve gevoeligheid)** 🔴 | Nieuw, uitgebreid | Geen enkele animatie in TrainingKompas knippert vaker dan 3 keer per seconde, en geen enkele animatie bedekt een groot deel van het scherm met een hoog-contrast, snel wisselend patroon — dit sluit expliciet elke vorm van "flitsende" celebration-effecten uit (Deel 9 gebruikt bewust vloeiende overshoot-animaties, geen knipperende effecten), en is een harde, niet-onderhandelbare veiligheidsgrens, vergelijkbaar in striktheid met de AI Safety-regels uit Hoofdstuk 8 |
| **Kleurenblindheid** | 🟢 (Hoofdstuk 5, Deel 3/16) | Kleurovergangen binnen een animatie (`motion-success`/`motion-warning`/`motion-error`) gaan altijd gepaard met een vorm- of icoonverandering, nooit uitsluitend een kleurwissel |
| **Motorische beperkingen** | 🟢 (Hoofdstuk 4, Deel 10) | Animatieduur beïnvloedt nooit de tijd die een gebruiker krijgt om te reageren — geen enkele interactie "verloopt" doordat een animatie is afgelopen (bijv. een tijdelijk verschijnende knop blijft aanwezig totdat de gebruiker handelt, verdwijnt niet automatisch na de animatie) |

**Bindende regel (Deel 14, samenvattend):** de Vestibulaire- en Epilepsie-grenzen hierboven zijn structurele ontwerpgrenzen voor de **hele animatiebibliotheek** in dit hoofdstuk — niet een aparte "toegankelijke modus" die apart getest wordt. Elke animatie in Deel 3-13 is al binnen deze grenzen ontworpen; er bestaat geen animatie in dit hoofdstuk die deze grenzen zou overschrijden en dus alsnog aangepast zou moeten worden.

---

## Deel 15 — Motion Performance

Productspecificatie van performance-grenzen — geen technische implementatie, wel bindende normen waaraan elke technische implementatie getoetst wordt.

| Aspect | Norm | Consequentie bij overschrijding |
|---|---|---|
| **Frame rate** | Elke animatie streeft naar 60fps; nooit merkbaar onder 30fps | Een animatie die structureel onder 30fps valt op een representatief middenklasse-toestel, wordt vereenvoudigd (minder gelijktijdige bewegende elementen) vóór release |
| **Batterij** | Doorlopende animaties (skeleton-loading, empty-state-ademhaling) zijn zo licht mogelijk qua rekenkracht; geen enkele animatie blijft actief wanneer het scherm niet zichtbaar is (achtergrond-tab, vergrendeld scherm) | Elke doorlopende animatie pauzeert automatisch buiten beeld (herhaling van Hoofdstuk 7, 12.2: Exercise Animation-regel, hier systeembreed toegepast) |
| **CPU** | Complexe animaties (grafiek-teken, heatmap-inkleuring) gebruiken waar mogelijk GPU-versnelde eigenschappen (transform/opacity) in plaats van CPU-intensieve herberekeningen | Vermeden: animaties die layout-herberekeningen forceren bij elke frame |
| **GPU** | Simultane, complexe animaties (bijv. meerdere grafieken tegelijk op Statistieken) worden gestaggerd (Deel 2: Vertraging-principe) in plaats van gelijktijdig afgevuurd, om GPU-piekbelasting te voorkomen | Bij een scherm met meerdere zware visualisaties: maximaal twee gelijktijdige "eerste-weergave"-animaties, overige wachten kort (150-300ms stagger) |
| **Responsiviteit** | Elke tik-feedback (Deel 5) start binnen 100ms, ongeacht wat er verder op de achtergrond gebeurt (bijv. een lopende synchronisatie) | Tik-feedback-animaties krijgen prioriteit boven achtergrondanimaties bij resource-schaarste |
| **Onderbreekbare animaties** | Elke animatie langer dan 300ms is onderbreekbaar door een nieuwe, relevante gebruikersactie (Deel 5: interruptie-regels per component) | Geen enkele animatie "blokkeert" de gebruiker langer dan functioneel noodzakelijk |
| **Lazy Animations** | Animaties buiten het zichtbare schermgedeelte (bijv. een Exercise Animation verderop in een lange lijst) starten pas wanneer ze daadwerkelijk in beeld komen | Voorkomt onnodig gelijktijdig afspelen van tientallen animaties in een lange lijst |
| **Caching** | Herhaalde animaties (bijv. dezelfde skeleton-vorm op elk bezoek aan een scherm) hergebruiken dezelfde, vooraf gedefinieerde specificatie in plaats van opnieuw berekend te worden | Consistente performance, ongeacht hoe vaak een scherm bezocht wordt binnen een sessie |

**Bindende regel:** performance gaat nooit ten koste van de drie kernprincipes uit Deel 1 (oriëntatie, bevestiging, nadruk) — een geoptimaliseerde maar betekenisloze "snellere" animatie die zijn functie verliest, is geen verbetering. Waar performance en motion-kwaliteit in spanning staan, wint de eenvoudigere animatie die zijn functionele doel behoudt.


---

## Deel 16 — Motion Quality Assurance

Tweehonderd controlepunten, doorlopend genummerd, JA/NEE-toetsbaar. Verplicht bij elke sprint die animatie, overgang, haptiek of micro-interactie raakt.

### Timing (1-30)
1. Gebruikt elke animatie uitsluitend een token uit Deel 3 (geen ad-hoc duur)?
2. Start elke tik-feedback binnen 100ms?
3. Duurt `motion-instant` exact 80ms?
4. Duurt `motion-fast` tussen 100-150ms?
5. Duurt `motion-normal` tussen 200-250ms?
6. Duurt `motion-slow` tussen 400-600ms?
7. Is de `motion-loading`-cyclus exact 1200ms?
8. Is `motion-reduced` nooit langer dan 50ms?
9. Gebruikt geen enkele animatie een duur die niet tot een gedocumenteerd token herleidbaar is?
10. Is de Snackbar-zichtbaarheidsduur consistent 4 seconden?
11. Start de empty-state-ademhaling (Deel 11) exact 500ms na verschijnen?
12. Duurt de empty-state-ademhalingscyclus exact 4 seconden?
13. Is de PR-viering-animatie (Deel 9) binnen de 400-600ms-grens van `motion-celebration`?
14. Is de stagger-vertraging tussen gestaggerde elementen consistent (~30ms, Deel 2/8)?
15. Reageert een grafiek-animatie nooit langer dan `motion-slow` toestaat?
16. Is de rusttimer-kleurwissel bij 30 sec resterend getimed op het juiste moment?
17. Is de "aan het nadenken"-status zichtbaar binnen 300ms na een AI-trigger?
18. Verschijnt skeleton-loading binnen 100ms na scherm-open?
19. Verdwijnt skeleton-loading direct zodra data beschikbaar is, zonder extra vertraging?
20. Is de wearable-sync-icoon-rotatiesnelheid consistent 720°/sec?
21. Is de shake-animatie bij validatiefouten exact 150ms?
22. Is de shake-amplitude nooit groter dan 4px?
23. Is de Confidence Indicator-fade-in merkbaar trager dan de omliggende AI-tekst (Deel 7)?
24. Is elke celebration-animatie eenmalig, nooit herhaald bij herbezoek?
25. Is de tab-pill-verschuiving consistent binnen `motion-fast`?
26. Is de FAB-debounce bij scroll-richting-wissel consistent 150ms?
27. Zijn alle interruptie-scenario's uit Deel 5 functioneel getest op timing?
28. Is de bottom-sheet-opening consistent `motion-sheet`?
29. Is de dialog-sluitanimatie sneller dan de openanimatie (Deel 4.1)?
30. Is er geen animatie die per ongeluk twee tokens combineert op een inconsistente manier?

### Consistency (31-60)
31. Gebruikt elk vergelijkbaar component dezelfde animatie voor dezelfde interactie (Deel 2: voorspelbaarheid)?
32. Is de pressed-animatie identiek op alle knoptypen (Hoofdstuk 7, Deel 1)?
33. Is de kaart-tap-animatie identiek op alle vijf domeinkaarten (Hoofdstuk 7, Deel 5)?
34. Gebruiken alle schermovergangen (Deel 4.1) dezelfde richting-logica?
35. Is de uitzonderingslijst in Deel 4.2 volledig en niet stilzwijgend uitgebreid?
36. Gebruiken alle Dialogs (Hoofdstuk 7, Deel 11) hetzelfde `motion-modal`-patroon?
37. Gebruiken alle Bottom Sheets hetzelfde `motion-sheet`-patroon?
38. Is de haptiek-intensiteit consistent binnen elke categorie (Deel 13)?
39. Gebruikt elke destructieve actie dezelfde Medium/Heavy-haptiekregel?
40. Is de celebration-intensiteitshiërarchie (Deel 9.1) consistent toegepast op alle acht momenten?
41. Gebruiken alle grafiektypen (Deel 8) hetzelfde eerste-weergave-gedrag?
42. Is de kalendernavigatie-richting consistent met schermnavigatie-richting?
43. Gebruikt elke Chips-variant (Filter/Choice/Tags) hetzelfde selectie-animatiepatroon?
44. Is de error-motion (Deel 12) consistent tussen alle zes foutsituaties qua toonzetting?
45. Gebruikt elk empty state exact dezelfde ademhalingsanimatie (Deel 11)?
46. Is er geen scherm met een unieke, niet-gedocumenteerde animatie buiten Deel 4.2?
47. Zijn AI-motion-momenten (Deel 7) consistent rustiger dan Workout-motion (Deel 6)?
48. Is het onderscheid tussen "Coach feliciteert" (motion-success) en een PR-viering (motion-celebration) overal consistent toegepast?
49. Gebruiken alle vormen van laadstatus (Deel 10) een van de gedocumenteerde tokens?
50. Is er consistentie tussen light/dark mode qua animatieduur (enkel kleur verschilt, niet de timing)?
51. Gebruikt elke Switch/Checkbox/Radio dezelfde onderliggende timing (Deel 5)?
52. Is de FAB-verschijn/verdwijn-animatie consistent op elk scherm waar een FAB voorkomt?
53. Gebruiken alle Snackbars dezelfde duur en positie?
54. Is de FAB/Snackbar-stapelregel (nooit gestapeld) consistent gehandhaafd?
55. Gebruiken alle vormen van "succesvol opgeslagen" hetzelfde `motion-success`-patroon?
56. Is de interruptie-regel per component (Deel 5) consistent geïmplementeerd?
57. Gebruikt elk component hetzelfde herstelgedrag na interruptie binnen zijn categorie?
58. Is de Recovery-haptiek (Deel 13) consistent afwijkend van de Workout-haptiek?
59. Zijn alle nieuw benoemde haptiek-categorieën (Selection/Goal/Recovery/AI) daadwerkelijk overal correct toegepast waar relevant?
60. Is er een enkele, centrale referentie (dit hoofdstuk) voor elke animatiebeslissing, zonder tegenstrijdige eerdere specificaties elders?

### Performance (61-90)
61. Haalt elke animatie minimaal 30fps op een representatief middenklasse-toestel?
62. Streeft elke animatie naar 60fps?
63. Pauzeert elke doorlopende animatie buiten het zichtbare scherm?
64. Pauzeert elke doorlopende animatie wanneer de app naar de achtergrond gaat?
65. Gebruiken complexe animaties GPU-versnelde eigenschappen (transform/opacity) waar mogelijk?
66. Forceert geen enkele animatie een layout-herberekening per frame?
67. Zijn simultane zware visualisaties (Statistieken) gestaggerd in plaats van gelijktijdig?
68. Krijgt tik-feedback prioriteit boven achtergrondanimaties bij resource-schaarste?
69. Is elke animatie langer dan 300ms onderbreekbaar door een relevante gebruikersactie?
70. Starten animaties buiten het zichtbare schermgedeelte pas wanneer ze in beeld komen (lazy)?
71. Wordt een herhaalde animatie (bijv. skeleton bij herbezoek) hergebruikt in plaats van herberekend?
72. Is er getest op een low-end-toestel, niet uitsluitend op een ontwikkeltoestel?
73. Is het batterijverbruik van doorlopende animaties (skeleton, empty-state) gemeten en binnen aanvaardbare grenzen?
74. Blokkeert geen enkele animatie de hoofdthread langer dan 16ms per frame (60fps-budget)?
75. Is er een fallback voor toestellen die de gewenste framerate niet halen (vereenvoudigde animatie in plaats van haperende volledige animatie)?
76. Is de GPU-belasting bij het gelijktijdig tonen van meerdere grafieken getest?
77. Is er geen geheugenlek bij herhaald starten/stoppen van dezelfde animatie (bijv. herhaald openen/sluiten van een Bottom Sheet)?
78. Is de Exercise Animation-lazy-load-regel (Hoofdstuk 7, 12.2) nageleefd bij lange lijsten?
79. Is de performance-impact van `motion-celebration` (het zwaarste visuele effect) apart getest?
80. Is performance getest met én zonder `prefers-reduced-motion` actief?
81. Is de laadtijd van de Splash-animatie (Deel 10) nooit kunstmatig verlengd?
82. Is er een maximale-animatie-budget per scherm gedefinieerd en getest (niet meer dan X gelijktijdige animaties)?
83. Wordt een animatie die de norm structureel niet haalt, vereenvoudigd vóór release?
84. Is de motion-performance-test onderdeel van de reguliere release-checklist?
85. Zijn er geen onnodige re-renders die animatie-performance beïnvloeden?
86. Is de CPU-belasting van de heatmap-inkleuring (Deel 8) binnen aanvaardbare grenzen?
87. Is de wearable-sync-rotatie-animatie licht genoeg om onbeperkt te kunnen draaien zonder merkbare belasting?
88. Is performance-degradatie bij een oudere OS-versie getest (waar relevant voor de PWA-doelgroep)?
89. Is er een duidelijk gedocumenteerd besluit over welke animaties bij lage performance het eerst vereenvoudigd worden?
90. Is de volledige performance-norm (Deel 15) opnieuw getoetst bij elke grote toevoeging aan de animatiebibliotheek?


### Accessibility (91-130)
91. Heeft elke animatie een `motion-reduced`-equivalent?
92. Blijven functionele bevestigingen (kleur, tekst) behouden bij reduced motion?
93. Valt de empty-state-ademhaling volledig weg bij reduced motion?
94. Vallen celebration-effecten (Deel 9) terug op een statische, maar even duidelijke bevestiging bij reduced motion?
95. Communiceert geen enkele animatie informatie die niet ook tekstueel/via `aria-live` beschikbaar is?
96. Overschrijdt geen enkele animatie een schaalverandering van 10% (vestibulaire grens, Deel 14)?
97. Bevat geen enkele animatie een simultane multi-laag-parallax?
98. Knippert geen enkele animatie vaker dan 3 keer per seconde (epilepsie-grens)?
99. Bedekt geen enkele animatie een groot schermdeel met snel wisselend hoog contrast?
100. Gaat elke kleurovergang (success/warning/error) gepaard met een vorm- of icoonverandering?
101. Beïnvloedt animatieduur nooit de tijd die een gebruiker krijgt om te reageren?
102. Blijft een tijdelijk verschijnend element aanwezig totdat de gebruiker handelt, niet totdat de animatie eindigt?
103. Is elke animatie getest met een schermlezer actief?
104. Is elke animatie getest met `prefers-reduced-motion` actief?
105. Is de Vestibulaire-grens getoetst op elke nieuwe animatie vóór toevoeging aan dit hoofdstuk?
106. Is de Epilepsie-grens getoetst op elke nieuwe animatie vóór toevoeging?
107. Is er een vaste testset (vergelijkbaar met Hoofdstuk 9's edge-casetestset) voor motion-accessibility?
108. Is elke haptiek-categorie (Deel 13) uitschakelbaar via Instellingen?
109. Wordt haptiek nooit als enige feedbackvorm gebruikt?
110. Is er een gecombineerde test (reduced motion + schermlezer + grote lettertypes) op minimaal de belangrijkste schermen?
111. Is de PR-viering-animatie (Deel 9) getoetst op zowel vestibulaire als epileptische veiligheid?
112. Is elke wizard-voortgangsindicator (Hoofdstuk 10, Deel 2.14) ook tekstueel beschikbaar?
113. Is de Kalender-maandwissel-animatie (Deel 8) toegankelijk via toetsenbord zonder de animatie te hoeven volgen?
114. Is elke doorlopende animatie (skeleton, ademhaling) pauzeerbaar of onopvallend genoeg om geen afleiding te vormen voor gebruikers met aandachtsgevoeligheden?
115. Is er een documentatie-overzicht van welke animaties zijn getoetst aan welke toegankelijkheidsgrens?
116. Is de motion-toegankelijkheid onderdeel van elke Play Store Release Review?
117. Is er geen enkele geïsoleerde animatie die buiten de systeembrede Reduce Motion-regeling valt?
118. Is de haptiek-uitschakeling systeembreed getest (geen enkele haptiek "vergeten" bij het uitschakelen)?
119. Zijn alle nieuw in dit hoofdstuk benoemde animaties (Deel 6-13) getoetst aan de volledige Deel 14-eisenlijst?
120. Is de motion-accessibility-checklist zelf onderdeel van de bredere Hoofdstuk 5/10-accessibility-checklists (geen dubbel, inconsistent systeem)?
121. Is er een duidelijke escalatieroute wanneer een animatie een toegankelijkheidsgrens blijkt te overschrijden na release?
122. Is de shake-animatie bij validatiefouten (Deel 12) binnen de vestibulaire grens getoetst?
123. Is de grafiek-teken-animatie (Deel 8) toegankelijk zonder de animatie te moeten volgen (eindresultaat direct beschikbaar)?
124. Kan elke animatie in dit hoofdstuk overgeslagen worden door een ongeduldige of gevoelige gebruiker zonder functieverlies?
125. Is de motion-ontwerpgrens (Deel 14) strenger dan het wettelijke WCAG-minimum, niet enkel eraan gelijk?
126. Is elke nieuwe toevoeging aan de Motion Tokens (Deel 3) automatisch getoetst aan Deel 14 vóór opname?
127. Is er bevestigd dat geen enkele animatie in dit hoofdstuk vertrouwt op kleur alleen om betekenis over te brengen?
128. Is de leesbaarheid van AI-tekst tijdens de typerende animatie (Deel 7) voor slechtziende gebruikers getest?
129. Is de rusttimer-kleurwissel (Deel 6) ook auditief/haptisch aangekondigd, niet uitsluitend visueel?
130. Is deze volledige Accessibility-sectie (91-130) doorlopen vóór elke release die nieuwe motion toevoegt?

### Haptics & Interrupties (131-160)
131. Is elke haptiek-categorie (Deel 13) correct gekoppeld aan zijn bindende trigger?
132. Wordt Heavy-haptiek uitsluitend gebruikt voor werkelijk onomkeerbare acties?
133. Is Light-haptiek nooit gebruikt voor een impactvolle actie die Medium verdient?
134. Is de PR-haptiek onderscheidend van de Goal-haptiek (verschillend ritmisch patroon)?
135. Is de Workout-haptiek geoptimaliseerd voor herhaling zonder vermoeiend te worden?
136. Is de Recovery-haptiek merkbaar lichter dan de Workout-haptiek?
137. Is de AI-haptiek uitsluitend bij de start van een antwoord, niet doorlopend tijdens het typen?
138. Is de Selection-haptiek onderscheiden van Light qua duur?
139. Is elk component met gedefinieerd interruptiegedrag (Deel 5) functioneel getest op snelle, opeenvolgende input?
140. Onderbreekt een tweede tik tijdens een Button-pressed-animatie de eerste correct (dubbel-klik-bescherming)?
141. Voltooit een Card-lift-animatie zichzelf ook bij scroll tijdens de animatie?
142. Annuleert een nieuwe zoekopdracht de vorige correct zonder visuele restanten?
143. Verschuift de Tabs-pill correct bij snelle opeenvolgende tik zonder wachtrij-vertraging?
144. Toont Charts na onderbreking de volledige, statische eindstaat zonder halverwege te blijven hangen?
145. Beweegt Progress door naar de nieuwste waarde bij snelle opeenvolgende updates zonder tussensprongen over te slaan?
146. Geeft elke afzonderlijke Workout Card-setbevestiging zijn eigen, volledige animatie zonder samenvoeging?
147. Toont AI Card de volledige tekst direct bij interruptie, zonder "achtervolgende" animatie?
148. Keert Bottom Sheet correct om bij swipe-down tijdens het openen (geen tegenstrijdige beweging)?
149. Verschijnt bij een nieuwe Snackbar tijdens een zichtbare de oude versneld weg, de nieuwe direct?
150. Volgt FAB de laatste scroll-richting zonder trillende tussenstaat (150ms-debounce functioneel getest)?
151. Telt een tweede Switch-tik na voltooiing van de eerste als volledig nieuwe toggle?
152. Is de Radio-eindstaat bij snelle opeenvolgende selectie altijd de laatst getikte optie?
153. Zijn Filter Chips-multi-select-tikken onafhankelijk zonder wachtrij?
154. Is elk in Deel 5 gedefinieerd interruptiegedrag gedocumenteerd vóórdat het component gebouwd wordt?
155. Is er geen component met ongedefinieerd interruptiegedrag in productie?
156. Is de haptiek-tabel (Deel 13) volledig — alle twaalf categorieën aanwezig en toegepast?
157. Is er geen dubbele of tegenstrijdige haptiek-toewijzing tussen Hoofdstuk 7 en dit hoofdstuk (Deel 13 is de definitieve bron)?
158. Zijn alle vier nieuw benoemde haptiek-categorieën (Selection/Goal/Recovery/AI) geïmplementeerd op de juiste triggers?
159. Is haptiek-intensiteit per categorie onderling getest op daadwerkelijk voelbaar onderscheid (niet enkel in specificatie, ook in praktijk)?
160. Is de "nooit gestapeld"-regel (Failure-haptiek, Snackbar) functioneel getest?

### Celebration, Loading & Overgangen (161-200)
161. Is Niveau 3 (Deel 9.1) uitsluitend toegepast op PR's en grote getalsmijlpalen?
162. Is er geen enkele gebeurtenis die ten onrechte is "opgeschoven" naar een hoger vieringsniveau?
163. Is geluid bij elke viering standaard zacht en volledig uitschakelbaar?
164. Wordt geen enkele viering herhaald bij herbezoek van dezelfde sessie?
165. Onderbreekt geen enkele viering een lopende actie (bijv. de volgende set tijdens training)?
166. Zijn confetti-achtige, schermvullende effecten nergens in de app aanwezig?
167. Is de Deload-markering (Deel 6) bewust neutraal/geruststellend, nooit waarschuwend gekleurd?
168. Is de "Nieuwe week"-overgang (Deel 6) onderscheiden van een vieringsmoment (rustiger, geen celebration-token)?
169. Is elk laadmoment uit Deel 10 gekoppeld aan het juiste token?
170. Toont Export een determinate voortgangsbalk bij een meetbare, langere bewerking?
171. Toont Import een concrete verwerkingsstatus, niet enkel een kale spinner?
172. Is Loading Overlay (Hoofdstuk 7, 11.8) inderdaad nergens gebruikt binnen dit hoofdstuk se specificaties?
173. Zijn alle scherm-overgangen getoetst aan de universele regel (Deel 4.1) tenzij een gedocumenteerde uitzondering (Deel 4.2) van toepassing is?
174. Is de Workout-scherm-openingsanimatie merkbaar sneller dan de standaardnavigatie?
175. Laden Dashboard-kaarten met een zichtbare, gestaggerde fade-in?
176. Kleurt de Herstel-visualisatie vloeiend in bij eerste weergave, niet instant?
177. Tekenen Analytics-grafieken zich eenmalig in per sessie, nooit herhaald?
178. Is Instellingen inderdaad vrij van elke aanvullende animatie buiten de standaardovergang?
179. Bevat het Premium-scherm geen enkele "opwindende" extra animatie bij tier-weergave?
180. Is elke in Deel 4.2 genoemde uitzondering nog steeds inhoudelijk gerechtvaardigd bij de huidige productstand?
181. Is er geen vijfde, ongedocumenteerde uitzondering op de standaardschermovergang geslopen?
182. Is de Kalendernavigatie-richting-logica (Deel 8) consistent met de algemene voorwaarts/achterwaarts-conventie?
183. Is de Doelen-voortgangsbalk-animatie (Deel 8) inderdaad lineair, niet ge-easet?
184. Is de Confidence-fade-in (Deel 7) daadwerkelijk merkbaar trager dan reguliere AI-tekst?
185. Is "Coach feliciteert" (motion-success) visueel en gevoelsmatig te onderscheiden van een PR-viering (motion-celebration)?
186. Is de volledige token-mapping (Deel 3.2-3.11) correct en zonder tegenstrijdigheden geïmplementeerd?
187. Is elk semantisch token daadwerkelijk gebouwd op het aangewezen primitief, zonder afwijking?
188. Is er een centrale, actuele tokenlijst die als enige bron van waarheid dient (geen verouderde losse waarden elders in de codebase)?
189. Is elke nieuwe animatie sinds de vorige release getoetst aan zowel Deel 1-2 (filosofie/principes) als Deel 3 (tokens)?
190. Is er een vast, herhaalbaar reviewproces voor nieuwe motion-toevoegingen (vergelijkbaar met Hoofdstuk 9's AI Quality Assurance-proces)?
191. Is elke afwijking van dit hoofdstuk gedocumenteerd conform de Decision Log-werkwijze?
192. Is de volledige Motion QA Checklist (1-200) doorlopen vóór elke release die nieuwe motion introduceert?
193. Is er een steekproefcontrole van daadwerkelijke productie-animaties tegen deze specificatie, niet enkel een ontwerpreview?
194. Is de Motion Constitution (Deel 17) geraadpleegd bij elke twijfelgeval tijdens ontwikkeling?
195. Is er een duidelijk eigenaarschap (vergelijkbaar met Hoofdstuk 9, Deel 1.3) voor dit hoofdstuk en zijn naleving?
196. Wordt bij elke grote productuitbreiding (nieuwe Fase) dit hoofdstuk opnieuw doorlopen?
197. Is er een testscenario dat de volledige Celebration-hiërarchie (Deel 9) in één sessie doorloopt (bijv. een testaccount met meerdere PR's, een streak, en een voltooid doel) om onderlinge consistentie te verifiëren?
198. Is de motion-kwaliteit ooit vergeleken met de referentie-kwaliteit van Google Material Design/Apple HIG zoals in de opdracht gevraagd?
199. Is er een proces om deze QA-checklist zelf te herzien wanneer nieuwe schermen/componenten in toekomstige hoofdstukken worden toegevoegd?
200. Is deze volledige Motion Quality Assurance-sectie zelf beoordeeld en goedgekeurd door de Product Owner vóór het als bindend te beschouwen?


---

## Deel 17 — Motion Constitution

Vijfenzeventig bindende Motion Laws — aanvullend op alle voorgaande Constitutions (Hoofdstuk 3-10). Elke afwijking wordt vastgelegd in de Decision Log, met motivatie en impactanalyse.

**Doel en functie**

**1.** Iedere animatie heeft een doel: oriëntatie, bevestiging, of nadruk — nooit decoratie zonder functie.

**2.** Geen animatie duurt langer dan noodzakelijk om zijn doel te vervullen.

**3.** Rust is de default toestand van de app; beweging is de bewust verdiende uitzondering.

**4.** Herhaalde, frequente gebeurtenissen krijgen nooit een uitbundiger effect dan hun frequentie rechtvaardigt.

**5.** Premium motion communiceert via precisie, nooit via spektakel.

**Snelheid en workout**

**6.** Workout mag nooit vertraagd voelen — de trainingsflow gebruikt systeembreed de kortste passende tokens.

**7.** Elke tik-feedback start binnen 100ms, zonder uitzondering.

**8.** Set-logging reageert optimistisch; geen enkele animatie vertraagt de daadwerkelijke registratie van een set.

**9.** De rusttimer start automatisch en zonder enige vertraging na een opgeslagen set.

**10.** Binnen de trainingsflow is `motion-slow` verboden, behalve bij sessie-afronding en vieringsmomenten.

**AI en denken**

**11.** AI mag nooit eindeloos lijken te denken — de "aan het nadenken"-status verschijnt binnen 300ms en blijft nooit onverklaard lang zichtbaar zonder resultaat of foutmelding.

**12.** AI-motion is systeembreed rustiger en trager dan Workout-motion — het contrast tussen fysieke actie en nadenken is doelbewust voelbaar.

**13.** Een AI-antwoord verschijnt nooit sneller dan leesbaar, en nooit trager dan nodig.

**14.** Onzekerheid in een AI-advies wordt ook motion-technisch subtiel voelbaar gemaakt — nooit met dezelfde zelfverzekerde snelheid als een zekere uitspraak.

**15.** AI navigeert nooit zelfstandig; elke AI-gesuggereerde beweging vereist een expliciete gebruikersactie.

**Viering en motivatie**

**16.** Success voelt feestelijk — een PR wordt oprecht en herkenbaar bevestigd.

**17.** Niet elke prestatie verdient hetzelfde vieringsniveau — de intensiteitshiërarchie (Deel 9) is bindend.

**18.** Confetti-achtige, schermvullende effecten zijn systeembreed verboden.

**19.** Een viering onderbreekt nooit een lopende actie.

**20.** Geen enkele viering herhaalt zichzelf bij een herbezoek van dezelfde gebeurtenis.

**21.** Geluid bij een viering is altijd optioneel, standaard zacht, en nooit de enige feedbackvorm.

**22.** Het onderscheid tussen een compliment (`motion-success`) en een record (`motion-celebration`) is altijd motion-technisch voelbaar.

**Fouten en rust**

**23.** Fouten voelen rustig — geen enkele foutmelding gebruikt een felle, alarmerende animatie.

**24.** Alleen directe, veldgebonden validatiefouten gebruiken een shake-animatie; alle overige foutsituaties blijven zonder shake.

**25.** Een netwerkonderbreking wordt nooit gepresenteerd als een "fout van de gebruiker" via alarmerende motion.

**26.** Crash-herstel communiceert geruststelling, niet een technische waarschuwing vooraf.

**27.** Een waarschuwing trekt aandacht zonder te alarmeren.

**Consistentie**

**28.** Overgangen zijn overal consistent — eenzelfde interactie beweegt overal in de app op dezelfde manier.

**29.** Elke animatie gebruikt uitsluitend een token uit de gedefinieerde tokenlijst (Deel 3) — nooit een ad-hoc waarde.

**30.** Elk vergelijkbaar component (alle knoptypen, alle domeinkaarten, alle dialogs) deelt exact dezelfde onderliggende animatie voor dezelfde interactie.

**31.** Slechts vier scherm-categorieën (Dashboard, Workout, Coach, Herstel/Analytics, Instellingen/Premium) mogen afwijken van de standaardschermovergang, en uitsluitend op de in Deel 4.2 gedocumenteerde, gemotiveerde wijze.

**32.** Geen vijfde, ongedocumenteerde uitzondering op de standaardschermovergang wordt toegevoegd zonder Handbook-herziening.

**33.** Light/dark mode verschillen uitsluitend in kleur, nooit in animatieduur of -timing.

**Interruptie en herstel**

**34.** Elk component heeft een gedefinieerd, voorspelbaar interruptiegedrag.

**35.** Geen enkel component blijft visueel vasthangen in een onvoltooide, tegenstrijdige tussenstaat.

**36.** Een dubbele, snelle actie op hetzelfde element wordt nooit als dubbele registratie verwerkt.

**37.** Elke animatie langer dan 300ms is onderbreekbaar door een relevante nieuwe gebruikersactie.

**38.** Na een interruptie keert een component altijd terug naar een stabiele, ondubbelzinnige eindstaat.

**Toegankelijkheid**

**39.** Reduce Motion wordt altijd gerespecteerd, zonder uitzondering en zonder functieverlies.

**40.** Geen enkele animatie overschrijdt de vestibulaire veiligheidsgrens (max. 10% schaalverandering, geen multi-laag-parallax).

**41.** Geen enkele animatie overschrijdt de epilepsie-veiligheidsgrens (max. 3 knipperingen per seconde, geen grootschalige hoog-contrast-flitsen).

**42.** Geen enkele animatie communiceert informatie die niet ook tekstueel of via `aria-live` beschikbaar is.

**43.** Kleurovergangen gaan altijd gepaard met een vorm- of icoonverandering.

**44.** Animatieduur beïnvloedt nooit de tijd die een gebruiker krijgt om te reageren.

**45.** Elke animatie is getest met een schermlezer actief.

**Haptiek**

**46.** Haptics ondersteunen de ervaring, maar domineren nooit.

**47.** Haptiek is systeembreed uitschakelbaar zonder functieverlies.

**48.** Haptiek wordt nooit als enige feedbackvorm gebruikt — altijd gecombineerd met visuele bevestiging.

**49.** Heavy-haptiek is gereserveerd voor werkelijk onomkeerbare acties.

**50.** Elke haptiek-categorie heeft een eigen, herkenbaar en consistent toegepast ritmisch patroon.

**Performance**

**51.** Elke animatie streeft naar 60fps en zakt nooit structureel onder 30fps.

**52.** Geen enkele doorlopende animatie blijft actief buiten het zichtbare scherm.

**53.** Geen enkele doorlopende animatie blijft actief wanneer de app naar de achtergrond gaat.

**54.** Tik-feedback krijgt altijd prioriteit boven achtergrondanimaties bij resource-schaarste.

**55.** Simultane zware visualisaties worden gestaggerd, nooit gelijktijdig afgevuurd.

**56.** Performance-optimalisatie mag nooit ten koste gaan van de functionele betekenis van een animatie.

**Laden**

**57.** Skeleton-loading is de standaard voor elk scherm of elke kaart die op data wacht.

**58.** Een Loading Overlay (volledige-scherm-blokkade) is de uitzondering, nooit de norm.

**59.** Geen enkele laadanimatie wordt kunstmatig verlengd om "grondigheid" te suggereren.

**60.** Elk laadmoment toont, waar zinvol, een concrete voortgangsstatus in plaats van een kale, contextloze spinner.

**Empty states**

**61.** Een lege staat is nooit volledig statisch en nooit onrustig druk.

**62.** De enige toegestane animatie op een lege staat is de gedefinieerde, subtiele ademhaling (Deel 11).

**63.** De actieknop op een lege staat blijft altijd volledig statisch en direct stabiel tikbaar.

**Governance en discipline**

**64.** Geen nieuw motion-token wordt toegevoegd zonder eerst te toetsen of een bestaand token volstaat.

**65.** Geen nieuwe animatie wordt gebouwd zonder eerst tegen dit hoofdstuk getoetst te zijn.

**66.** Elke wijziging aan dit hoofdstuk die de Motion Constitution raakt, wordt vastgelegd in de Decision Log.

**67.** De volledige Motion QA Checklist wordt doorlopen vóór elke release die nieuwe motion introduceert.

**68.** Dit hoofdstuk is de enige, definitieve bron voor animatie, overgangen, haptiek en micro-interacties — geen tegenstrijdige specificatie elders in het Handbook blijft geldig na publicatie van dit hoofdstuk.

**69.** Elke motion-beslissing wordt getoetst aan zowel de Motion Philosophy (Deel 1) als de Motion Principles (Deel 2), niet enkel aan de tokenlijst.

**70.** Dit hoofdstuk wordt herzien bij elke grote productuitbreiding (nieuw platform, nieuwe kernfeature) vóór implementatie, niet erna gecorrigeerd.

**Mens en vertrouwen**

**71.** Motion versterkt nooit een manipulatief patroon (kunstmatige urgentie, verslavende herhaling) — elke animatie die dat risico zou lopen, wordt niet gebouwd.

**72.** Elke animatie wordt getoetst aan de vraag of ze de kwetsbaarste relevante persona (Hoofdstuk 2) evengoed dient als de meest ervaren gebruiker.

**73.** Motion in commerciële contexten (upsells, Hoofdstuk 10 Deel 7) is nooit opwindender of nadrukkelijker dan motion in de kernervaring.

**74.** Consistentie tussen animaties weegt zwaarder dan een lokale, scherm-specifieke "verbeteringsanimatie" die de voorspelbaarheid van het geheel zou doorbreken.

**75.** Elke afwijking van deze vijfenzeventig wetten wordt expliciet vastgelegd in de Decision Log, met motivatie en impactanalyse — dezelfde bindende werkwijze als alle voorgaande Constitutions in dit Handbook voorschrijven.

---

*Einde Hoofdstuk 11. Dit hoofdstuk vormt samen met Hoofdstuk 1 t/m 10 het volledige, bewegende fundament van het TrainingKompas Premium Development Handbook. Waar eerdere hoofdstukken schermen, componenten, AI-gedrag en navigatie vastlegden, geeft dit hoofdstuk daar de laatste, cruciale laag aan: hoe dat alles voelt op het moment van aanraken. Geen enkele animatie, overgang, haptische feedback of micro-interactie wordt vanaf nu toegevoegd zonder eerst tegen dit hoofdstuk getoetst te zijn.*

