# Trainingskompas — Premium Product Audit & Roadmap
**Versie onder audit:** v3.3.25 (1 augustus 2026) · **Bronnen:** volledige codebase (index.html, sw.js, netlify/functions, migraties, docs), 10 minuten schermopname live gebruik, logic_tests.js (55 tests), projectdocumentatie (Blueprint, Product Book, Roadmap, Decision Log, Brand Identity)
**Rol:** Product/UX/UI/Coach-audit zoals gevraagd — geen code geschreven, geen refactors uitgevoerd.

---

## 1. Executive Summary

Trainingskompas heeft **een ongewoon sterk fundament voor een solo-project**: een werkende AI-coach met uitlegbare adviezen (HRV, dagfactor, Masters-correctie), een AI-programmagenerator met echte periodisering, spierherstel-heatmaps, plate calculator, PR-detectie, en — sinds 1 augustus — een grondige security- en stabiliteitsronde (JWT-fix op de coach-proxy, RLS-audit op alle 31 tabellen, XSS-remediatie, dubbel-klik-bescherming). Functioneel zit de app dichter bij Hevy/Strong dan de meeste solo-gebouwde apps ooit komen.

De kloof met een premium/Play-Store-klaar product zit niet in functionaliteit maar in **drie concrete lagen**:

1. **Visuele identiteit is niet bijgewerkt.** De net vastgestelde merkidentiteit (Trainingskompas, Poppins, donkerblauw/petrol/teal `#00B894`) staat alleen in `docs/Brand/`. De daadwerkelijke `index.html` en `sw.js` draaien nog volledig op de oude placeholder-stijl: `Barlow Condensed`, cyaan `#3dd6d6`, en `manifest.json` verkort de naam naar "Kompas" — wat rechtstreeks ingaat tegen de eigen merkregel (DEC-010) dat de volledige naam altijd zichtbaar moet blijven.
2. **Interactie-afwerking is functioneel maar niet premium.** Native `confirm()`-dialogen (19x), vrijwel geen animaties (1 `@keyframes`, 8 `transition`-regels op 8640 regels), 3 `aria-`/`role`-attributen in de hele app, en geen enkele vorm van onboarding voor nieuwe gebruikers.
3. **Motivatie-laag ontbreekt vrijwel volledig.** Er is een PR-badge en dat is het — geen streaks, geen weekdoelen, geen enkele vorm van voortgang-viering. Voor een app die met Hevy/Strong wil concurreren is dit het grootste concurrentienadeel.

Geen van deze drie is een architectuurprobleem — het zijn stuk voor stuk oplosbaar binnen de bestaande single-file aanpak, zonder rewrite. Dat is het goede nieuws: de weg naar premium is een reeks gerichte sprints, geen herstart.

---

## 2. Product Scorecard (0–10)

| Dimensie | Score | Toelichting kort |
|---|---|---|
| Functionaliteit | 7,5 | Uitzonderlijk compleet voor solo-project; enkele dubbele routes en losse eindjes |
| UX (trainingsflow, navigatie) | 6 | Snelle flow eenmaal er ingewerkt, maar geen onboarding en zware afhankelijkheid van native dialogen |
| UI (visueel, premium-uitstraling) | 4,5 | Functioneel maar duidelijk "prototype"-esthetiek; merkidentiteit nog niet doorgevoerd |
| Motivatie / gamification | 3 | Eén PR-badge; geen streaks, doelen, of voortgangsviering |
| Trainingsflow (workout loggen) | 7 | Kern is goed doordacht (superset, plate calc, RPE, rusttimer); mist snelheid-optimalisaties van marktleiders |
| AI-coach | 8 | Sterk gedifferentieerd t.o.v. concurrenten — uitlegbaar, sportspecifiek, veilig geborgd sinds JWT-fix |
| Schaalbaarheid (architectuur) | 6,5 | Bewust single-file, RLS overal aan, entitlement-schema klaarstaand — solide fundament, file-split-vraagstuk blijft een tikkende klok |
| Google Play-gereedheid | 3,5 | Technisch (manifest/sw.js) dichtbij, maar geen onboarding, geen privacy policy, geen store-assets, branding-mismatch |

**Gemiddelde: 5,7 / 10** — een stevige bèta met een uitstekend AI-fundament, nog geen premium consumentenproduct.

---

## 3. Architectuuroverzicht

**Frontend:** één `index.html` (8.640 regels, 459 functies), vanilla JS, geen framework, geen build-stap — bewuste, gedocumenteerde keuze (Blueprint.md) tot na Fase 2. Vijf hoofdschermen via een bottom-tabbar-patroon (`go('s-...')`): **Home, Training, Coach, Profiel, Stats**, plus een groot aantal modals (rusttimer, exercise picker, sessieoverzicht, programma-editor, team-beheer, wearables) die als losse `.modal-bg`-lagen in dezelfde DOM leven.

**Navigatie:** géén router, géén URL-state per scherm (op een paar querystring-shortcuts na: `?start=A`, `?checkin=1`). Dat betekent: geen deep-linking, geen "terug"-knop van de browser die iets zinnigs doet, en messaging-shortcuts (PWA-manifest `shortcuts`) die alleen werken omdat de app dat handmatig afvangt.

**Data:** Supabase (Postgres + PostgREST + RLS), 31 tabellen, allemaal met RLS aan (DEC-007, geverifieerd 1 aug). Kern: `config, weight_log, hrv_log, exercises, sessions, body_comp, chat_history, gyms, users`, plus het nog niet gehandhaafde entitlement-schema (`plan_features, credit_packs, discounts, usage_log`) en het nieuwe drie-laags zichtbaarheidsmodel (`personal/gym/global`) op `exercises`/`custom_trainings` sinds migratie v333.

**Backend-logica:** Netlify Functions als dunne, servergezijdige laag — AI-coach-proxy (`coach.js`, sinds 1 aug met JWT-check), account-verwijdering, team/PIN-beheer, wearable OAuth-flow (Fitbit via Google Health API). Geen eigen backend-server; alle zware logica (periodisering, spierherstel-berekening, dagfactor) draait client-side in `index.html`.

**Offline:** `sw.js` (v2.8) met een `NO_CACHE_PATTERNS`-lijst voor API-domeinen en een IndexedDB-wachtrij voor offline trainingsschrijfacties — gebouwd, functioneel nog niet bevestigd door de Product Owner. Cache-strategie voor navigatie is recent omgezet naar network-first (nog te verifiëren volgens Roadmap.md).

**Uitbreidbaarheid:** het entitlement-/rollen-schema (`gym_role`, `plan_features`) is al aangelegd vóórdat het nodig is — een verstandige zet die latere, pijnlijkere migraties voorkomt. De grootste architecturale schuld is niet technisch fout, maar **tijdgebonden**: hoe langer `index.html` als single file blijft groeien (8.640 regels en groeiend met elke sprint), hoe duurder een eventuele file-split wordt. Dat is bewust uitgesteld tot na Fase 2 — een redelijke keuze nu, maar wel een die op de roadmap moet blijven staan.


---

## 4. Functioneel Overzicht

### 4.1 Trainingslogging (kern)
**Doel:** vaste trainingen (A/B), losse oefeningen en cardio loggen met sets, reps, gewicht, RPE.
**Werking:** dynamisch opgebouwd trainingsscherm (`renderTrainScreen`, `renderLosBody`) — één renderpad voor zowel vaste training als losse oefening, wat consistent gedrag garandeert. Superset-ondersteuning, plate calculator, epley-1RM-hint, PR-badges direct bij het loggen.
**Sterk:** de architecturale keuze om Training A/B, Workouts en Programma via één dynamisch renderpad te bouwen (v319-fix, zie code-comments) i.p.v. twee losse statische schermen is precies het soort ontwerpbeslissing dat latere features goedkoop maakt.
**Zwak:** rusttimer is een aparte modal met vaste presets (30s–10min) — geen auto-start na set loggen, geen custom duur, geen koppeling aan RPE (hogere RPE → automatisch langere rust is een quick win die Hevy/Strong niet eens hebben).
**Verbeterpotentie:** hoog — dit is de kernflow, elke tik die hier bespaard wordt telt 4×/week mee voor de gebruiker.

### 4.2 AI-coach & AI-programmagenerator
**Doel:** uitlegbare, sportspecifieke trainingsadviezen en periodisering.
**Werking:** `buildCtx()` bouwt een systeemprompt met HRV-drempels, dagfactor, Masters-correctiefactor, sport-specifieke blokken (`SPORT_BLOCKS`) en sinds de laatste ronde ook PR's/trainingshistorie. Programmagenerator draait per-week (Netlify-timeoutbeperking) met periodisering afgedwongen in code, niet enkel als AI-suggestie.
**Sterk:** dit is het meest onderscheidende onderdeel van de app. Geen enkele concurrent (Hevy, Strong, Alpha Progression) heeft een coach die HRV, Masters-leeftijd én sportcontext combineert in één uitlegbaar advies. Server-side proxy sinds de JWT-fix is nu ook correct beveiligd.
**Zwak:** de chatgeschiedenis-UI (`renderChatHist`, `renderCoachReply`) oogt functioneel maar generiek — geen visuele differentiatie tussen "AI stelt een vraag", "AI geeft een advies" en "AI waarschuwt" (bijvoorbeeld bij een te hoge trainingsbelasting).
**Verbeterpotentie:** middel-hoog — de motor is sterk, de presentatielaag kan de kwaliteit van het advies beter tonen.

### 4.3 Spierherstel-heatmap
**Doel:** visueel tonen welke spiergroepen hersteld zijn.
**Werking:** SVG-lichaamsvisualisatie (`renderMuscleHeatmap`), kleurcodering op basis van RPE-gewogen belasting en tijd sinds laatste training, geslacht-specifieke SVG's.
**Sterk:** dit is een feature die zelfs Strong niet heeft, en Fitbod alleen in een basale vorm. Sterk concurrentievoordeel als het visueel wordt afgemaakt.
**Zwak:** in de schermopname oogt de heatmap functioneel correct maar visueel vlak (geen premium gradient/glow, geen tap-to-detail-interactie zichtbaar).

### 4.4 Ratiofactor / dagfactor-motor + cold-start-predictor
**Doel:** dagelijkse trainingsgereedheid voorspellen op basis van HRV en conditie-check-ins.
**Werking:** check-in met vrije-tekst condities (`renderCheckinConditions`) gekoppeld aan een dagfactor-berekening.
**Sterk:** combinatie van objectieve data (HRV) én subjectieve check-in is precies wat Whoop/Garmin proberen te doen met alleen sensordata — Trainingskompas heeft hier een menselijker signaal bovenop.
**Zwak:** check-in condities zijn een kale `<select>`-lijst zonder visuele feedback vooraf ("dit beïnvloedt je advies met X%") — de uitlegbaarheid die het Product Book als kernprincipe noemt, is hier nog niet zichtbaar vóór het advies zelf.

### 4.5 Programma's & periodisering
**Doel:** meerweekse trainingsprogramma's genereren en beheren.
**Werking:** `renderProgrammaList`, `renderProgramBlockDetail`, `renderProgConcept` — programma's zijn opgebouwd uit blokken met een expand/collapse-patroon.
**Zwak (architecturaal aandachtspunt):** er lijkt gedeeltelijke overlap te bestaan tussen "vaste trainingen" (Training A/B, `renderVasteTrainingBtns`), "custom trainingen" (`renderCustomTrainList`) en "programma-blokken" (`renderProgramBlockDetail`) als drie parbehalve-elkaar-bestaande routes om een trainingsstructuur te definiëren. Dit is exact het patroon dat de eigen werkwijze (punt 11, Blueprint.md) vraagt om vóór bouwen te signaleren — hier gebeurt het achteraf, in audit-vorm. Aanbeveling: vóór verdere uitbreiding van de programmagenerator, expliciet in kaart brengen of dit drie bewuste concepten zijn of onbedoelde duplicatie.

### 4.6 Team-/gymbeheer
**Doel:** ART CrossFit als eerste gym in het platform beheren — ledenlijst, rollen, PIN-toegang voor coaches.
**Werking:** Team-scherm met tabs (leden/log), rolgebaseerde dropdowns, audit-log op gym-niveau, e-mailbevestiging vereist voor lidmaatschap (sinds v334).
**Sterk:** rolautorisatie is recent gefixed (manager kon owner degraderen — nu gecorrigeerd) en e-mailbevestiging voorkomt spook-accounts.
**Zwak:** geen zichtbare uitnodigingsflow in de opname — onduidelijk hoe een nieuw lid concreet wordt toegevoegd zonder dat de coach het e-mailadres handmatig invoert.

### 4.7 Drie-laags zichtbaarheidsmodel (v333)
**Doel:** oefeningen/trainingen delen op persoonlijk/gym/globaal niveau, plus peer-to-peer delen.
**Werking:** schema, RLS én UI-laag zijn volgens CURRENT_STATE.md inmiddels compleet (scope-kiezer, "deel met persoon"-knop, rolgebaseerde Beheer-toegang).
**Sterk:** dit is precies het soort model dat een multi-gym platform nodig heeft zonder dat gebruikers het als "ingewikkeld" ervaren — mits de scope-kiezer bij het aanmaken van content niet als extra frictie aanvoelt.

### 4.8 Wearables (Fitbit via Google Health API)
**Doel:** hartslag/HRV automatisch importeren i.p.v. handmatig invoeren.
**Werking:** OAuth2-flow via Netlify Functions, beheer verplaatst van Instellingen naar Profiel, app in Google Cloud Testing-modus (max. 100 gebruikers, wekelijkse token-vervaldatum).
**Zwak — commercieel risico:** de wekelijkse token-vervaldatum van een Testing-mode Google Cloud-app is niet houdbaar voor een productieklant. Dit moet vóór een Play Store-release naar Production-verificatie bij Google, wat een doorlooptijd van weken kan hebben — dit hoort thuis in de Store-readiness-planning, niet als losse technische voetnoot.

### 4.9 Plate calculator, PR-detectie, 1RM
Alle drie aanwezig en functioneel geïntegreerd in de logflow — dit is tafelstakes-functionaliteit die Hevy/Strong ook hebben, en Trainingskompas haalt hier gelijke hoogte.

### 4.10 Offline sync (IndexedDB-wachtrij)
Gebouwd, met een ⏳-indicator en beheermodal, maar **nog niet functioneel bevestigd**. Dit is een states-in-progress feature — voor een audit relevant omdat "offline-first" wél in `sw.js` staat als commentaar ("Play Store ready — offline first") terwijl de sync-laag zelf nog onbevestigd is. Claim en status lopen hier iets uiteen.


---

## 5. UX Audit per scherm

| Scherm | Eerste indruk | Tikken tot doel | Feedback/foutafhandeling | Cijfer |
|---|---|---|---|---|
| **Home / Dashboard** | Duidelijke stat-boxen en HRV-pills, oogt informatief maar dicht op elkaar | Laag — belangrijkste acties direct zichtbaar | Geen skeleton-loading zichtbaar tijdens data-fetch | 6,5 |
| **Training (A/B loggen)** | Direct, geen omhaal — logisch voor een dagelijkse actie | Laag na gewenning; eerste keer onduidelijk waar superset/RPE zit | Dubbel-tik-bescherming aanwezig (recent gefixt), maar geen visuele "opgeslagen"-microfeedback anders dan de knop-state | 7 |
| **Losse oefening loggen** | Herbruikt trainingsscherm-logica — consistent, maar daardoor ook evenveel velden voor een "snel 1 setje loggen"-scenario | Middel — geen verkorte flow voor een enkele set | Zelfde als Training | 6,5 |
| **Coach (chat)** | Ziet eruit als een generieke chatinterface, geen duidelijke visuele hiërarchie tussen vraag/advies/waarschuwing | Laag | Geen zichtbare "AI denkt na"-state in de opname anders dan wachten | 6 |
| **Stats / Progressie** | Veel filters (sport/type/muscle) en sorteeropties — krachtig maar dicht beschreven | Middel — drie filterdimensies tegelijk kan overweldigen bij eerste gebruik | Onbekend of lege-resultaten-state een duidelijke boodschap geeft | 6 |
| **Spierherstel-heatmap** | Visueel de sterkste feature, maar kleurcontrast en interactie ogen basic | Laag | — | 6,5 |
| **Profiel / Instellingen** | Wearable-kaart, admin-secties (apparatuur, rollen) samen op één plek — functioneel dicht opeengepakt | Middel-hoog voor beheertaken | PIN-flow voor coach-toegang aanwezig, herstel-optie recent toegevoegd | 6 |
| **Team / Gymbeheer** | Tabs (leden/log) duidelijk gescheiden | Middel | Rolwijziging-audit-log is een sterk vertrouwenssignaal | 6,5 |
| **Programma-editor** | Blok-gebaseerd, expand/collapse — functioneel maar dens | Middel-hoog, veel stappen om een programma te bouwen | — | 5,5 |
| **Onboarding** | **Bestaat niet.** Een nieuwe gebruiker landt direct in een lege of gedeeltelijk gevulde app zonder uitleg. | n.v.t. | n.v.t. | 1 |

**Algemene UX-patronen die op meerdere schermen terugkomen:**
- **Native `confirm()`-dialogen (19×)** voor destructieve acties (verwijderen e.d.) — functioneel maar breekt de premium-ervaring; elke andere serieuze app (Hevy, Strong) gebruikt een gestileerde bevestigingsmodal die bij het merk past.
- **Vrijwel geen loading-skeletons of optimistic UI** — schermen lijken te wachten op Supabase-respons voordat er iets getoond wordt (mobiele 4G-latency zal dit voelbaar maken).
- **Dichte informatiedichtheid** — begrijpelijk vanuit een "power user voor zichzelf bouwen"-ontstaansgeschiedenis, maar voor bredere doelgroep (gymleden met wisselend digitaal comfort) is meer ademruimte nodig tussen elementen.
- **Geen enkele vorm van progressieve onboarding-tooltips** bij nieuwe features (drie-laags zichtbaarheidsmodel, apparatuur-catalogus) — een bestaande gebruiker moet zelf ontdekken dat er iets is bijgekomen.

---

## 6. UI Audit

| Onderdeel | Bevinding | Score |
|---|---|---|
| **Kleuren** | Huidige implementatie: cyaan `#3dd6d6` accent, zwart/grijs-palet, lichtgrijze achtergrond `#f2f2f2` — functioneel neutraal maar generiek "prototype-blauw". De vastgestelde merkidentiteit (donkerblauw `#0B1D2A`, petrol `#0E3B4A`, teal `#00B894`) is nog nergens in de code terug te vinden. | 4 |
| **Typografie** | `Barlow Condensed` overal — smal, functioneel, maar niet het vastgestelde `Poppins`. Condensed lettertypes ogen op mobiel al snel "budget-app" i.p.v. premium. | 4 |
| **Spacing** | Consistente 8/14/16px-grid zichtbaar in CSS — technisch prima, maar visueel dicht (weinig witruimte, veel elementen per scherm). | 5,5 |
| **Iconografie** | Emoji als iconen (🏠🏋️💬👤📈) in de bottom nav — functioneel, snel te bouwen, maar oogt niet als een doordacht icon-systeem en rendert inconsistent tussen Android-toestellen/-versies. | 3,5 |
| **Cards** | Consistent card-patroon (`--r:8px`, subtiele shadow) — dit is een van de sterkere UI-fundamenten, makkelijk te herstijlen zonder structuurwijziging. | 6,5 |
| **Formulieren** | Standaard `<input>`/`<select>` met minimale styling — functioneel, weinig premium-afwerking (geen custom stepper voor gewicht/reps behalve de RPE-stepper). | 5 |
| **Knoppen** | `.btn`/`.btn-o`-patroon consistent toegepast — herbruikbaar basis, mist states (loading-spinner in knop bij opslaan is niet zichtbaar in de opname). | 5,5 |
| **Tabbars** | Vaste 5-tab bottom nav, consistent op alle schermen — functioneel correct, actieve-staat alleen kleur-gebaseerd (geen vorm/achtergrond-verandering). | 6 |
| **Animaties/micro-interacties** | **1** `@keyframes` en **8** `transition`-regels in de volledige 8.640-regelige stylesheet. Dit is het duidelijkste kwantitatieve bewijs dat micro-interacties nooit een designprioriteit zijn geweest. | 2,5 |
| **Premium-uitstraling algemeen** | Consistent en functioneel, maar leest als een sterk doordachte interne tool, niet als een product waar iemand €10-15/maand voor betaalt naast Hevy Pro. | 4 |

**Kernconclusie UI:** de *techniek* achter het design (CSS-variabelen, consistente cards, herbruikbare button-classes) is goed opgezet — een restyle naar de nieuwe merkidentiteit is een **variabelen-vervanging**, geen herbouw. Dat is goed nieuws voor de planning: dit is één geconcentreerde sprint, geen losse duizend-tikken-klus.


---

## 7. Concurrentieanalyse

| App | Waar ze beter zijn | Waarom | Wat Trainingskompas kan overnemen (principe, niet kopie) |
|---|---|---|---|
| **Hevy** | Loggen-snelheid, sociale feed, plate-calculator-UX | Elke tik in de logflow is geanalyseerd op frictie; sociale feed drijft dagelijkse terugkeer | Frictie-audit van de eigen logflow (zie sectie 9); overweeg een lichte sociale laag ná het gym-model (al gepland, DEC-008) |
| **Strong** | Extreme eenvoud, snelheid, "1RM %"-gebaseerde targets | Bewust minimalistisch — doet minder, maar wat het doet is snel | Trainingskompas doet functioneel al méér (AI, herstel) — de UI moet dat *niet* laten aanvoelen als "meer complexiteit" maar als "meer waarde, zelfde snelheid" |
| **Alpha Progression** | Wetenschappelijk onderbouwde progressie-adviezen, gedetailleerde grafieken | Sterk op de "waarom dit gewicht"-uitleg — exact het principe dat Trainingskompas al als kernwaarde heeft (uitlegbare AI) | Trainingskompas kan dit overtreffen zodra de HRV/dagfactor-uitleg ook vóór het advies zichtbaar wordt, niet alleen erin verwerkt |
| **Fitbod** | Automatische work-out-generatie op basis van hersteldata, zeer glad onboarding | Sterke eerste-gebruik-ervaring; vraagt gericht naar doelen/uitrusting bij start | Trainingskompas heeft geen onboarding — dit is het duidelijkste, snelst te dichten gat t.o.v. Fitbod |
| **Garmin Connect** | Diepe wearable-integratie, uitgebreide hersteldata-visualisatie | Eigen hardware-ecosysteem — oneerlijk voordeel dat Trainingskompas niet kan matchen, wel via bredere wearable-support (al gepland: HealthKit, Health Connect, Garmin/Whoop/Oura) | Wearable-uitbreiding staat al op de roadmap (DEC-010) — belangrijk dat dit niet blijft steken op Fitbit-alleen |

**Waar Trainingskompas al vóórloopt:** de combinatie van spierherstel-heatmap + uitlegbare AI-coach + Masters-leeftijd-correctie + sportspecifieke context is een combinatie die geen van de vijf genoemde apps aanbiedt. Dat is een echt te verdedigen niche — mits de presentatielaag het niveau van de onderliggende logica gaat matchen.

---

## 8. Trainingsflow — stap voor stap

| Stap | Bevinding | Snelheidswinst mogelijk |
|---|---|---|
| Workout starten | Direct via shortcut (`?start=A`) of Home-kaart | Al snel |
| Oefening openen | Consistent renderpad (Training/Losse oefening delen logica) | Al efficiënt qua code, UX-tikken onbekend zonder volledige doorloop |
| Set loggen | Gewicht + reps + optioneel RPE | Numerieke inputs — een grote-knoppen stepper (zoals de bestaande RPE-stepper) voor gewicht/reps zou sneller zijn dan toetsenbord-invoer op mobiel |
| Gewicht aanpassen | Tekstinvoer (`inp`-classes) | Plus/min-knoppen met vaste increments (2,5kg/1,25kg) zouden toetsenbord-wissels tijdens een set vermijden |
| RPE invullen | Verticale stepper (`rpe-stepper-v`, sinds v306) | Dit is al het juiste patroon — toepassen op gewicht/reps zou consistentie geven |
| Rusttimer | Handmatige presets (30s–10min), geen auto-start | **Grootste quick win in de hele flow:** timer automatisch starten zodra een set is opgeslagen, met slim voorstel op basis van RPE |
| Afronden | `finishSession()`, dubbel-klik beschermd | Prima |
| Historie bekijken | Filter-tabs (`renderHistFilterTabs`) | Werkt, geen bevindingen die op traagheid wijzen |

**Belangrijkste flow-aanbeveling:** rusttimer auto-start + gewicht/reps als stepper i.p.v. tekstveld zijn de twee wijzigingen met de hoogste impact-per-uur-bouwtijd, omdat ze 4× per week × elke set worden gebruikt.


---

## 9. Dashboard — hoe zou premium eruitzien

**Huidige staat:** stat-boxen (3-koloms grid), HRV-pills, spierherstel-kaart, programma-kaart. Functioneel, informatief, maar statisch — het toont wat er nu bekend is, niet wat de gebruiker daarmee zou moeten doen.

**Wat een premium dashboard toevoegt, zonder complexiteit toe te voegen:**
- **Eén duidelijke "vandaag"-actie bovenaan** — niet alleen data tonen, maar een enkele aanbeveling ("Vandaag: lichte belasting aanbevolen, dagfactor 0,82") direct gekoppeld aan een startknop.
- **Weekoverzicht als voortgangsbalk**, niet als losse cijfers — hoeveel van de geplande trainingen deze week al gedaan zijn, visueel.
- **Maandoverzicht als trend**, niet als momentopname — een kleine sparkline per KPI (volume, HRV-trend) i.p.v. alleen het huidige cijfer.
- **Herstel- en trainingsbelasting samen visueel**, niet in aparte kaarten — dit is precies waar de spierherstel-heatmap al de bouwstenen voor heeft; een mini-versie op het dashboard zou de sterkste feature van de app meteen zichtbaar maken bij het openen van de app.

Dit vraagt geen nieuwe databronnen — alle data bestaat al (HRV, dagfactor, spierherstel, sessiehistorie). Het is een presentatie-sprint, geen data-sprint.

---

## 10. Analytics — ontbrekende inzichten

Wat een serieuze sporter (het eigen doelpubliek: CrossFit/functioneel, Masters-leeftijd) typisch verwacht en hier nog ontbreekt of niet zichtbaar is:
- **ACWR (Acute:Chronic Workload Ratio)** — al genoemd als bruikbaar idee uit Blueprint v6 (Roadmap.md), nog niet gebouwd. Dit is precies het soort metric die overbelasting vroeg signaleert, aansluitend bij de bestaande dagfactor-filosofie.
- **Plateau-detectie** — eveneens al genoteerd als bruikbaar idee, nog niet gebouwd. Sluit direct aan bij de AI-coach: een plateau-signaal kan een concrete trigger zijn voor een programmawijziging.
- **PR-categorisatie en confidence scoring** — genoteerd, nog niet gebouwd; zou de PR-badge (nu binair) een gewicht geven ("waarschijnlijk een PR" vs. "zeker een PR" bij twijfelachtige data).
- **Trainingsvolume per spiergroep over tijd** — de heatmap toont een moment, geen trend; een sporter wil weten of been-volume deze maand structureel achterblijft.
- **Vergelijking t.o.v. vorige mesocyclus** — bij een periodiserings-gedreven programma is "hoe verhoudt dit blok zich tot het vorige" een natuurlijke vraag die nu niet beantwoord wordt.

---

## 11. Gamification — ontbrekende elementen

**Huidige staat: één PR-badge.** Dat is het volledige motivatiesysteem in een 8.640-regelige app. Voor een product dat met Hevy/Strong wil concurreren is dit de grootste inhoudelijke omissie in de hele audit.

Aanbevolen, in volgorde van bouwkosten (laag → hoog) en zonder over-gamified te worden (past bij een serieuze Masters-CrossFit-doelgroep, geen kinderachtige stickers):
1. **Streaks** — trainingsweken op rij zonder gemiste geplande sessie. Eenvoudig te berekenen uit bestaande sessiedata.
2. **Weekdoelen** — "3 van 4 trainingen deze week" als voortgangsbalk op het dashboard (zie sectie 9) — combineert direct met de dashboard-sprint.
3. **PR-historie als tijdlijn** — de PR-badge bestaat al per set; een verzamelscherm met alle PR's chronologisch is een kleine uitbreiding met grote motivatiewaarde.
4. **Maanddoelen** — volumedoelen of sessiedoelen per maand, gekoppeld aan de AI-coach ("je zit op koers voor je maanddoel").
5. **Badges/levels** — laagste prioriteit voor deze doelgroep; overweeg dit pas na validatie met ART CrossFit-leden (past bij de bestaande DEC-008-aanpak: eerst vraag ophalen, dan bouwen), en zeker in combinatie met het al geplande social/competitief-werk in Fase 3.

---

## 12. AI-Coach — waar AI echt kan helpen (geen gimmicks)

De AI-coach is al het sterkste onderdeel; onderstaande zijn uitbreidingen die evengoed uitlegbaar en direct nuttig zijn, geen chat-gimmicks:
- **Proactieve waarschuwing bij ACWR-piek** (zie sectie 10) — AI-coach die ongevraagd meldt "je belasting steeg deze week 35%, dat is boven je normale bandbreedte" i.p.v. alleen reactief te antwoorden op vragen.
- **Rusttimer-suggestie op basis van RPE en oefening-type** — kleine, concrete AI/regel-gebaseerde toepassing die de trainingsflow direct versnelt (sluit aan bij sectie 8).
- **Check-in-uitleg vóóraf** — toon bij het invullen van de dagelijkse check-in kort wat een "matig"-antwoord doet met het advies, in lijn met het eigen "uitlegbare AI"-principe uit het Product Book, maar dan vóór het advies i.p.v. erna.
- **Programma-aanpassing bij gemiste trainingen** — als een geplande sessie wordt overgeslagen, kan de AI-coach het resterende blok automatisch herverdelen (dit sluit aan bij de al bestaande `heergenereerResterendeWeken()`-functie die precies dit lijkt te doen — controleren of dit al proactief gebeurt of alleen op aanvraag).

---

## 13. Design System — ontbrekende onderdelen

Voor een consistent premium systeem, gebouwd op de al aanwezige CSS-variabelen-architectuur:
- **Component-bibliotheek van states** — knoppen, inputs en cards hebben nu geen gedocumenteerde loading/error/success-states; deze bestaan waarschijnlijk ad-hoc per scherm.
- **Iconenset i.p.v. emoji** — een consistente lijnstijl-iconenset (bijvoorbeeld Lucide, gezien de vermelding van `lucide-react` elders in de toolset) vervangt de emoji-navigatie en voorkomt render-verschillen tussen Android-versies/toestellen.
- **Gestileerde confirm/alert-modal** — één herbruikbare component ter vervanging van de 19 native `confirm()`-aanroepen; dit is een kleine, goed afgebakende bouwtaak met grote merkimpact.
- **Motion-tokens** — een klein setje gestandaardiseerde transition-duurtes/easings (nu ad-hoc, 8 losse regels) zodat toekomstige micro-interacties consistent aanvoelen i.p.v. willekeurig.
- **Skeleton-loading-component** — herbruikbaar voor Home/Stats/Coach tijdens Supabase-fetches, i.p.v. een lege of "springende" layout.


---

## 14. Google Play Readiness

| Vereiste | Status | Toelichting |
|---|---|---|
| Manifest/icons/PWA-basis | ✅ Grotendeels klaar | `manifest.json` compleet met shortcuts, iconen 192/512, maskable-varianten |
| App-naam consistentie | ⚠️ Afwijking | `short_name: "Kompas"` in manifest.json druist in tegen de eigen merkregel (DEC-010: volledige naam altijd zichtbaar) |
| Visuele merkidentiteit | ❌ Niet doorgevoerd | Zie sectie 6 — kleuren/typografie nog placeholder |
| Privacy policy / voorwaarden | ❌ Ontbreekt | Genoemd als Fase 5-vereiste in Roadmap.md, nog niet opgesteld (NL/EN) |
| Data Safety-formulier (Play Console) | ❌ Nog niet van toepassing | Vereist zodra TWA/Bubblewrap-traject start |
| Wearable OAuth production-verificatie | ❌ Blokkerend risico | Google Cloud-app staat in Testing-modus (max. 100 gebruikers, wekelijkse tokenvervaldatum) — moet naar Production vóórdat een closed/open test met echte gymleden zinvol is |
| Offline-gedrag | ⚠️ Onbevestigd | sw.js claimt "offline-first", sync-wachtrij nog niet functioneel bevestigd |
| Onboarding voor nieuwe gebruikers | ❌ Ontbreekt volledig | Een reviewer/tester die de app voor het eerst opent, heeft geen enkele richting |
| Toegankelijkheid | ❌ Zeer beperkt | 3 `aria-`/`role`-attributen in de hele codebase |
| Account verwijderen (Play-vereiste) | ⚠️ Gebouwd, ongetest | Live gedeployed 1 augustus, functionele test met wegwerp-account nog niet gedaan |
| Auth/RLS-beveiliging | ✅ Sterk | Volledige RLS-audit (DEC-007), JWT-fix op coach-proxy, dit is boven het niveau van veel indie-apps |

**Conclusie:** technisch fundament (auth, RLS, PWA-manifest) is dichter bij store-klaar dan de meeste solo-projecten. De blokkerende punten zijn niet technisch complex — merkidentiteit doorvoeren, privacy policy schrijven, wearable-app naar Production verifiëren, onboarding bouwen — maar moeten wél vóór een closed test, niet erna.

---

## 15. Prioritering

### Must Have (vóór eerste Play Store-test)
1. Onboarding-flow nieuwe atleten (al op Roadmap, DEC-010)
2. Merkidentiteit doorvoeren in `index.html`/`sw.js` (kleuren, typografie, manifest-naam)
3. Wearable Google Cloud-app naar Production-verificatie
4. Privacy policy + voorwaarden (NL/EN)
5. Account-verwijdering functioneel testen (wegwerp-account)
6. Native `confirm()` vervangen door gestileerde bevestigingsmodal
7. sw.js network-first-navigatie en offline-sync functioneel bevestigen

### Should Have (sterk aanbevolen voor v1.0)
8. Rusttimer auto-start + RPE-gekoppelde suggestie
9. Gewicht/reps als stepper i.p.v. tekstinvoer
10. Dashboard 2.0: "vandaag"-actie, weekvoortgang, mini-heatmap
11. Streaks + weekdoelen (gamification, laagdrempelig)
12. ACWR + plateau-detectie (analytics)
13. Skeleton-loading op Home/Stats/Coach
14. Architecturale opschoning: overlap Training A/B vs. custom trainingen vs. programma-blokken (sectie 4.5) expliciet in kaart brengen

### Nice to Have (latere versies)
15. Iconenset i.p.v. emoji-navigatie
16. PR-tijdlijnscherm
17. Maanddoelen
18. Bredere wearable-support (HealthKit, Health Connect, Garmin/Whoop/Oura) — al gepland
19. Badges/levels (na validatie met ART CrossFit-leden)
20. Coach-chat visuele differentiatie (vraag/advies/waarschuwing)

---

## 16. Sprintplanning (16 sprints)

> Volgorde houdt rekening met: Must Have eerst, geen afhankelijkheid vooruitgeschoven, en de bestaande regel "geen rewrites indien uitbreiding mogelijk is."

**Sprint 1 — Merkidentiteit doorvoeren**
Doel: CSS-variabelen (`:root`) en `manifest.json` bijwerken naar Trainingskompas-huisstijl (Poppins, `#0B1D2A`/`#0E3B4A`/`#00B894`), `short_name` corrigeren.
Waarom nu: laagste bouwkosten/hoogste zichtbare impact; alles hangt aan een klein aantal CSS-variabelen.
Gebruikerswaarde: de app oogt meteen als "het merk" i.p.v. placeholder.
Risico's: font-laadtijd (Poppins via Google Fonts, sw.js-cache-lijst moet mee-updaten); contrast-check nieuwe kleuren op kleine tekst.
Acceptatiecriteria: alle schermen tonen nieuwe kleuren/font; geen "Kompas"-afkorting meer zichtbaar in krappe UI-plekken; sw.js `CACHE_STATIC` bijgewerkt met nieuwe font-URL.
Afhankelijkheden: geen.

**Sprint 2 — Confirm/alert-modal component**
Doel: één herbruikbare gestileerde bevestigingsmodal, alle 19 `confirm()`-aanroepen vervangen.
Waarom nu: kleine, geïsoleerde taak, direct premium-gevoel, laag regressierisico als het één component is.
Gebruikerswaarde: geen onverwachte browser-dialogen meer die de merkillusie doorbreken.
Risico's: destructieve acties (verwijderen) moeten exact hetzelfde blokkerend gedrag houden — geen per-ongeluk-doorklikken.
Acceptatiecriteria: nul `confirm()`-aanroepen resterend; elke vervangen actie getest op daadwerkelijk annuleren/bevestigen.
Afhankelijkheden: Sprint 1 (huisstijl van de modal).

**Sprint 3 — Onboarding-flow nieuwe atleten**
Doel: profiel + doelen instellen bij eerste gebruik (al op Roadmap, DEC-010).
Waarom nu: Must Have, blokkerend voor elke test met echte nieuwe gebruikers (gymleden, Play Store-testers).
Gebruikerswaarde: eerste-gebruik-ervaring vergelijkbaar met Fitbod i.p.v. een lege app.
Risico's: scope-kruip — begrensen tot profiel+doelen, niet uitbreiden naar volledige productrondleiding.
Acceptatiecriteria: nieuwe gebruiker doorloopt profiel+doelen vóór eerste dashboard-weergave; bestaande gebruikers zien de flow niet opnieuw.
Afhankelijkheden: Sprint 1 (huisstijl zichtbaar vanaf eerste scherm).

**Sprint 4 — Rusttimer auto-start + RPE-koppeling**
Doel: timer start automatisch na het opslaan van een set, duur gesuggereerd op basis van RPE.
Waarom nu: hoogste frequentie-van-gebruik verbetering in de hele app (elke set, 4×/week).
Gebruikerswaarde: minder tikken tijdens een training, wanneer de gebruiker fysiek het minst zin heeft in extra interactie.
Risico's: gebruikers die bewust geen timer willen — behoud een makkelijke "sla over"-optie.
Acceptatiecriteria: timer start automatisch, suggestieduur klopt met RPE-regels, uitzetten kost één tik.
Afhankelijkheden: geen technische, wel UX-continuïteit met Sprint 1/2.

**Sprint 5 — Gewicht/reps als stepper**
Doel: RPE-stepper-patroon (al bestaand) toepassen op gewicht/reps-invoer.
Waarom nu: bouwt direct voort op Sprint 4 (zelfde scherm), hergebruikt bestaande component-logica.
Gebruikerswaarde: minder toetsenbord-wissels tijdens het loggen.
Risico's: increments moeten per oefeningtype kloppen (2,5kg vrije gewichten vs. machine-pin-stappen) — koppelen aan bestaande `equipment_types`.
Acceptatiecriteria: stepper werkt op alle oefeningtypes, tekstinvoer blijft beschikbaar als fallback voor niet-standaard waarden.
Afhankelijkheden: Sprint 4 (zelfde scherm, gecombineerd testen).

**Sprint 6 — Wearable-app naar Google Production-verificatie**
Doel: Google Cloud OAuth-app uit Testing-modus halen.
Waarom nu: doorlooptijd bij Google kan weken zijn — vroeg starten voorkomt dat dit de Play-Store-planning blokkeert.
Gebruikerswaarde: indirect — voorkomt dat wearable-koppeling na een week stopt voor testers/klanten.
Risico's: Google-reviewproces buiten eigen controle; scope-verificatie (welke data-scopes precies gevraagd worden) moet kloppen.
Acceptatiecriteria: OAuth-app in Production-status, tokens niet meer wekelijks verlopend.
Afhankelijkheden: geen — kan parallel aan andere sprints lopen (aanvraag indienen, niet blokkerend wachten).

**Sprint 7 — Privacy policy + voorwaarden (NL/EN)**
Doel: juridische documenten opstellen en linken vanuit de app.
Waarom nu: Play Store-vereiste, geen technische afhankelijkheid, kan parallel.
Gebruikerswaarde: vertrouwen, wettelijk vereist voor elke store-listing.
Risico's: inhoud moet kloppen met daadwerkelijke dataverwerking (Supabase, Claude-proxy, wearables) — niet een generieke template zonder controle.
Acceptatiecriteria: beide documenten beschikbaar, taalkeuze werkt, linkt correct vanuit Profiel/Instellingen.
Afhankelijkheden: geen.

**Sprint 8 — Account-verwijdering functioneel testen + offline-sync bevestigen**
Doel: de twee "gebouwd maar onbevestigd"-punten uit CURRENT_STATE.md afsluiten.
Waarom nu: Must Have, en het zijn precies het soort losse eindjes die een audit als deze moet forceren af te sluiten vóór nieuwe features.
Gebruikerswaarde: vertrouwen dat kernbeloftes (privacy, offline) daadwerkelijk werken.
Risico's: als offline-sync een bug blijkt te hebben, kan dit een grotere sprint worden dan gepland — vroeg testen beperkt die kans.
Acceptatiecriteria: wegwerp-account succesvol verwijderd inclusief alle gerelateerde data; offline geloggede sessie synct correct bij terugkeer online.
Afhankelijkheden: geen.

**Sprint 9 — Dashboard 2.0**
Doel: "vandaag"-actie, weekvoortgangsbalk, mini-spierherstel-heatmap op Home.
Waarom nu: grootste zichtbare motivatie-upgrade, hergebruikt volledig bestaande data (geen nieuwe databronnen nodig, zie sectie 9).
Gebruikerswaarde: elke keer dat de app geopend wordt, direct een concrete volgende stap i.p.v. alleen cijfers.
Risico's: dashboard mag niet drukker worden dan nu — bewust kiezen wat weg mag om ruimte te maken.
Acceptatiecriteria: "vandaag"-advies zichtbaar binnen één scroll, weekvoortgang klopt met sessiehistorie, mini-heatmap laadt zonder merkbare vertraging.
Afhankelijkheden: Sprint 1 (huisstijl).

**Sprint 10 — Streaks + weekdoelen**
Doel: eerste laag gamification, direct gekoppeld aan Dashboard 2.0.
Waarom nu: bouwt voort op Sprint 9 (zelfde scherm), lage bouwkosten, hoge motivatiewaarde.
Gebruikerswaarde: zichtbare voortgang i.p.v. alleen historische data.
Risico's: streak-logica moet eerlijk aanvoelen (wat telt als "gemist" bij een bewust rustdag-schema?) — afstemmen op bestaande programmastructuur.
Acceptatiecriteria: streak-telling klopt met geplande vs. uitgevoerde sessies, weekdoel-voortgangsbalk zichtbaar op dashboard.
Afhankelijkheden: Sprint 9.

**Sprint 11 — ACWR + plateau-detectie**
Doel: twee analytics-metrics uit de Blueprint-v6-ideeënlijst daadwerkelijk bouwen.
Waarom nu: sluit direct aan bij de bestaande dagfactor-filosofie, geeft de AI-coach nieuwe, concrete triggerdata.
Gebruikerswaarde: vroege waarschuwing bij overbelasting, concreet signaal bij een plateau.
Risico's: berekening moet uitlegbaar blijven (kernprincipe) — geen black-box-score zonder toelichting.
Acceptatiecriteria: ACWR zichtbaar in Stats, plateau-signaal genereert een concrete AI-coach-melding, beide met uitleg van de onderliggende data.
Afhankelijkheden: geen technische, wel conceptueel op sectie 10.

**Sprint 12 — Skeleton-loading component**
Doel: herbruikbare loading-states voor Home/Stats/Coach.
Waarom nu: kleine, geïsoleerde technische verbetering die de premium-indruk tijdens laden versterkt — logisch te combineren met de al opgebouwde Dashboard 2.0-schermen.
Gebruikerswaarde: geen "lege flits" meer bij tragere verbindingen (relevant voor gym-wifi/4G).
Risico's: geen — puur additief, laag regressierisico.
Acceptatiecriteria: alle Supabase-fetches op de drie schermen tonen skeleton i.p.v. lege ruimte.
Afhankelijkheden: geen.

**Sprint 13 — Architecturale opschoning trainingsstructuren**
Doel: overlap tussen Training A/B, custom trainingen en programma-blokken (sectie 4.5) expliciet analyseren en waar nodig consolideren.
Waarom nu: elke sprint die hierna nog aan de programmagenerator bouwt, wordt duurder als deze overlap onopgelost blijft — vroeg oplossen is goedkoper dan laat.
Gebruikerswaarde: indirect — voorkomt toekomstige bugs en verwarrende dubbele routes.
Risico's: dit raakt de kernlogflow — grondig regressietesten via `logic_tests.js` en Playwright vereist.
Acceptatiecriteria: gedocumenteerde conclusie (bewust drie concepten, of consolidatie) vastgelegd in Blueprint.md/DECISION_LOG.md; indien consolidatie: geen functieverlies, volledige CRUD-check per betrokken entiteit.
Afhankelijkheden: geen, maar vereist rustige, geïsoleerde sprint zonder gelijktijdige featuredruk.

**Sprint 14 — Iconenset i.p.v. emoji-navigatie**
Doel: consistente lijnstijl-iconen in bottom nav en waar relevant elders.
Waarom nu: relatief kleine visuele afronding, logisch na de merkidentiteit-sprint.
Gebruikerswaarde: consistente weergave tussen Android-toestellen, professionelere uitstraling.
Risico's: bestandsgrootte/laadtijd bij toevoegen icon-library — letten op single-file-architectuur (geen zware dependency).
Acceptatiecriteria: alle bottom-nav-emoji's vervangen, consistent op alle geteste toestellen/browsers.
Afhankelijkheden: Sprint 1.

**Sprint 15 — PR-tijdlijnscherm + coach-chat visuele differentiatie**
Doel: verzamelscherm van alle PR's chronologisch; visueel onderscheid vraag/advies/waarschuwing in de coach-chat.
Waarom nu: beide zijn relatief kleine, af te ronden features die de bestaande sterke punten (PR-detectie, AI-coach) beter zichtbaar maken.
Gebruikerswaarde: motivatie (PR-geschiedenis) en vertrouwen (duidelijkere coach-communicatie).
Risico's: laag.
Acceptatiecriteria: PR-tijdlijn toont alle historische PR's met datum/context; coach-chat toont duidelijk onderscheiden berichttypen.
Afhankelijkheden: Sprint 1 (stijl).

**Sprint 16 — Toegankelijkheidsronde (aria/contrast/focus-states)**
Doel: basale toegankelijkheid — aria-labels op interactieve elementen, focus-states, contrastcontrole na de nieuwe huisstijl.
Waarom nu: laatste stap vóór een bredere test-/store-fase; logisch ná de huisstijl-sprint zodat contrast op de definitieve kleuren gecontroleerd wordt.
Gebruikerswaarde: bruikbaarheid voor een bredere groep gebruikers, ook relevant voor Play Store-kwaliteitsbeoordeling.
Risico's: kan grotere scope krijgen dan verwacht als eerste controle veel gaten blootlegt — plan een losse vervolgsprint indien nodig.
Acceptatiecriteria: interactieve elementen hebben toegankelijke labels, contrastratio's voldoen aan WCAG AA op kerntekst.
Afhankelijkheden: Sprint 1.


---

## 17. Quick Wins (lage moeite, zichtbaar effect, buiten bovenstaande sprints)

- `manifest.json`: `short_name` van "Kompas" naar iets dat niet tegen de eigen merkregel ingaat (bijv. gewoon "Trainingskompas" ook als short_name, of een niet-afgekorte variant).
- `coach.js`: modelnaam is hardcoded op `'claude-sonnet-4-5'` als fallback — controleren of dit nog het gewenste model is nu er nieuwere modellen beschikbaar zijn; klein risico op onnodig verouderd gedrag als dit ooit vergeten wordt bij te werken.
- `sw.js`: `STATIC_ASSETS` verwijst nog naar de Barlow Condensed Google Fonts-URL — moet in dezelfde sprint als de huisstijl-migratie mee, anders blijft het oude font gecached.
- Rusttimer-modal: presets zijn een vaste lijst — een "laatst gebruikt"-preset bovenaan zou tikken besparen zonder enige nieuwe logica.

---

## 18. Grootste Risico's

1. **Wearable Google Cloud-app blijft in Testing-modus** — bij een closed test met echte ART CrossFit-leden lopen tokens na een week af; dit voelt voor gebruikers als "de app is stuk" terwijl het een losse configuratiestap is. Vroeg oppakken (Sprint 6) is expliciet aanbevolen om dit niet de kritieke planningsketen te laten worden.
2. **Merkidentiteit blijft "in de docs" hangen** — de kans bestaat dat nieuwe functionele sprints (wearables, HYROX, cyclus-tracking — alle drie recent naar Fase 1/2 vervroegd) voorrang blijven krijgen boven de visuele restyle, waardoor het gat tussen "wat het rapport zegt dat het merk is" en "wat de app laat zien" blijft bestaan. Aanbeveling: Sprint 1 als eerste, ongeacht andere druk.
3. **Architecturale overlap (Training A/B vs. custom trainingen vs. programma-blokken)** onopgelost laten terwijl de programmagenerator verder uitgebreid wordt, vergroot toekomstige refactorkosten — dit is exact het patroon dat de eigen werkwijze vraagt vroeg te signaleren.
4. **Onboarding blijft ontbreken tot vlak vóór een store-test** — dit is het punt waarop een reviewer of eerste externe gebruiker (ART CrossFit-lid) het snelst afhaakt; niet iets om tot Fase 4 te laten liggen.
5. **8.640-regelige single file blijft groeien** — geen acute crisis, maar elke sprint die wordt toegevoegd zonder de file-split-vraag te herbezoeken, verhoogt de uiteindelijke migratiekosten. Geen actie nu vereist, wel een agendapunt om niet te vergeten.

---

## 19. Eindconclusie

Trainingskompas is functioneel verder dan de meeste apps die door één ontwikkelaar naast een volledige gym-onderneming gebouwd worden. De AI-coach, spierherstel-heatmap en dagfactor-motor zijn een echt te verdedigen concurrentievoordeel — geen van de vijf benchmarkapps combineert dit. De stabilisatieronde van 1 augustus (JWT-fix, volledige RLS-audit, XSS-remediatie, dubbel-klik-bescherming) heeft bovendien een fundament neergezet dat degelijker is dan bij veel apps van dit stadium.

De weg naar "premium" ligt niet in nieuwe functionaliteit, maar in het **zichtbaar maken** van wat er al is: de merkidentiteit die al is vastgesteld maar nog niet is doorgevoerd, de motivatielaag die vrijwel geheel ontbreekt, en de interactie-afwerking (confirm-dialogen, animaties, onboarding) die de functionele diepte nog niet weerspiegelt. Geen van deze punten vraagt om een rewrite — de CSS-variabelen-architectuur, het herbruikbare card/button-systeem en de bestaande RPE-stepper laten zien dat de code al klaarstaat voor deze afwerkingsslag.

**Aanbevolen volgorde:** Sprint 1 (huisstijl) en Sprint 3 (onboarding) eerst, omdat elke dag dat deze blijven liggen de kloof tussen "wat de app kan" en "wat de app laat zien" groter maakt — precies het gat waar een eerste indruk (Play Store-reviewer, nieuw ART CrossFit-lid, potentiële betalende klant) op afgerekend wordt.

---

## Eindscores (0–10)

| Dimensie | Score |
|---|---|
| Functionaliteit | 7,5 |
| UX | 6 |
| UI | 4,5 |
| Premium-uitstraling | 4 |
| Motivatie | 3 |
| Trainingsflow | 7 |
| Schaalbaarheid | 6,5 |
| Google Play-gereedheid | 3,5 |

