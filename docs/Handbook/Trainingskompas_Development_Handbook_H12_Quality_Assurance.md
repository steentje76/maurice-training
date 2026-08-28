# TrainingKompas Premium Development Handbook

## Hoofdstuk 12 — Premium Quality Assurance, Testing Strategy & Play Store Readiness

**Status:** bindend document. Vanaf dit hoofdstuk wordt geen enkele build vrijgegeven voor testers of de Google Play Store zonder hieraan te voldoen. Dit is de officiële release-standaard van TrainingKompas.
**Voortbouwend op:** Hoofdstuk 1-11 in hun geheel. Dit hoofdstuk introduceert geen nieuwe productinhoud — het legt vast **hoe bewezen wordt** dat elke eerdere specificatie daadwerkelijk is nageleefd, vóór een build gebruikers bereikt.
**Karakter:** productspecificatie van kwaliteitsnormen en releasecriteria — geen code, geen implementatie.

---

### Leeswijzer

Dit hoofdstuk herhaalt geen enkele inhoudelijke norm die al elders vastligt (een animatie-eis uit Hoofdstuk 11, een AI-evaluatiecriterium uit Hoofdstuk 9) — het *verzamelt* die normen tot één toetsbaar geheel en voegt de laag toe die nog ontbrak: wanneer is een build goed genoeg, voor wie, en wie beslist dat. Waar dit hoofdstuk schaalt naar rollen ("verantwoordelijke", "testgroep"), blijft dat gegrond in de daadwerkelijke projectrealiteit (Maurice als Product Owner, een kleine testgroep van ART CrossFit-leden, geen fictief enterprise-QA-team) — consistent met de governance-aanpak uit Hoofdstuk 9.

**Statusaanduiding:** 🟢 bestaande praktijk (bijv. `logic_tests.js`, Playwright) · 🟡 gedeeltelijk bestaand · 🔴 nieuw in dit hoofdstuk.

---

## Deel 1 — Quality Philosophy

### Waarom kwaliteit belangrijk is

De Premium Product Audit (2 augustus 2026) trok één harde conclusie: TrainingKompas is functioneel verder dan de meeste solo-projecten, maar de kloof tussen "wat de app kan" en "wat de app laat zien" is precies waar een eerste indruk — een Play Store-reviewer, een nieuw ART CrossFit-lid, een potentiële betalende klant — op afgerekend wordt. Kwaliteit in dit hoofdstuk is niet een aparte fase na het bouwen; het is het instrument dat garandeert dat die kloof daadwerkelijk gedicht blijft bij elke volgende release, in plaats van steeds opnieuw te ontstaan.

### Premium kwaliteit

Direct uit Hoofdstuk 1 (sectie 1.6): premium is het zichtbaar maken van onderliggende kwaliteit, nooit decoratie. Kwaliteitsbewaking is daarom niet een kostenpost die tegenover "snel bouwen" staat — het is het mechanisme waardoor onderliggende kwaliteit daadwerkelijk zichtbaar wordt in plaats van verborgen te blijven achter een haastige release.

### Consistentie

Elk voorgaand hoofdstuk (3-11) heeft een eigen Constitution met bindende wetten. Kwaliteit betekent hier concreet: **aantoonbare naleving van elf verschillende wettenverzamelingen tegelijk**, niet als afzonderlijke controles maar als één samenhangende toets — een release die aan Hoofdstuk 11 (Motion) voldoet maar Hoofdstuk 9 (AI Governance) schendt, is geen kwaliteitsrelease.

### Betrouwbaarheid

Rechtstreeks uit Product Constitution VIII (Hoofdstuk 3): nooit een stille fout. Betrouwbaarheid is meetbaar (Deel 17, Quality Metrics: crash-free rate, ANR-rate) en het fundament waarop elke andere kwaliteitsclaim rust — een prachtig ontworpen scherm dat crasht, is geen premium ervaring.

### Gebruikersvertrouwen

Elke gebruiker die HRV, lichaamsgewicht en trainingsgeschiedenis aan TrainingKompas toevertrouwt, doet dat op basis van een impliciete belofte van zorgvuldigheid (Hoofdstuk 1, sectie 1.10). Kwaliteitsbewaking is de operationele vertaling van die belofte — niet een interne engineering-praktijk, maar een directe uiting van de datafilosofie.

### Productvolwassenheid

De zes releasestadia die dit hoofdstuk definieert (Development → Alpha → Internal → Closed → Open → Production) zijn een expliciete erkenning dat volwassenheid een proces is, geen schakelaar. Een build "werkt" al vroeg in dat proces; een build is pas *Production Ready* wanneer elke laag van dit Handbook — van Hoofdstuk 1's visie tot Hoofdstuk 11's laatste micro-interactie — aantoonbaar is nageleefd.

### Golden Rules (Deel 1, samenvattend)

1. Kwaliteit gaat altijd boven snelheid (herhaald en bindend gemaakt in de Quality Constitution, Deel 18).
2. Elke kwaliteitsnorm in dit hoofdstuk is herleidbaar tot een concreet, eerder hoofdstuk — geen nieuwe, ongefundeerde eisen.
3. Een release is nooit "goed genoeg" op één dimensie (bijv. functioneel) terwijl een andere dimensie (bijv. toegankelijkheid) faalt.
4. Kwaliteitsbewaking schaalt met de daadwerkelijke projectomvang — geen theater, geen overbodige ceremonie (governance-niveau B, Hoofdstuk 9).

---

## Deel 2 — Quality Standards

Twaalf kwaliteitsdimensies, elk met bron-hoofdstuk en concrete, meetbare norm — het meetinstrument dat alle overige delen van dit hoofdstuk gebruiken.

| Dimensie | Bron | Concrete norm |
|---|---|---|
| **UI-kwaliteit** | Hoofdstuk 5 (Design System), Hoofdstuk 7 (Component Library) | 100% van de gebruikte kleuren/typografie/spacing herleidbaar tot een gedefinieerd token; 0 native `confirm()`/`alert()`-aanroepen; Design Constitution (Hoofdstuk 5) zonder schending |
| **UX-kwaliteit** | Hoofdstuk 3-4 | Premium UX Checklist (Hoofdstuk 4, Deel 11, 172 punten) volledig JA; kernacties ≤2 tikken |
| **Performance** | Hoofdstuk 3/4 Performance Principles, dit hoofdstuk Deel 7 | Concrete tijdsnormen per metric, zie Deel 7 |
| **AI-kwaliteit** | Hoofdstuk 8-9 | Elf Evaluation-criteria (Hoofdstuk 9, Deel 5) geslaagd; 0 onopgeloste Kritiek/Hoog AI-incidenten (Hoofdstuk 9, Deel 13) |
| **Navigatie** | Hoofdstuk 10 | Navigation Review/Flow Review/Accessibility Checklist (Hoofdstuk 10, Deel 13, 250 punten) volledig JA |
| **Motion** | Hoofdstuk 11 | Motion QA Checklist (Hoofdstuk 11, Deel 16, 200 punten) volledig JA |
| **Accessibility** | Hoofdstuk 3/4/5/10/11, dit hoofdstuk Deel 8 | WCAG AA op alle kerncontent; alle accessibility-checklists uit voorgaande hoofdstukken JA |
| **Offline gedrag** | Hoofdstuk 4 Deel 9/17-18, Hoofdstuk 10 Deel 6 | Trainingslogging 100% functioneel zonder verbinding; elke offline-status uit de Navigation Map (Hoofdstuk 10, Deel 3.2) correct geïmplementeerd |
| **Beveiliging** | Blueprint.md (RLS, JWT), Hoofdstuk 9 Deel 11 | RLS actief op alle 31 tabellen (bestaand, DEC-007); 0 bekende, onopgeloste kritieke kwetsbaarheden (vergelijkbaar met Supabase Advisor-niveau) |
| **Privacy** | Hoofdstuk 1 sectie 1.10, Hoofdstuk 9 Deel 11 | AVG-conform (Deel 10); Privacy-scherm (Hoofdstuk 6, Scherm 9.6) inhoudelijk actueel bij elke datastructuurwijziging |
| **Stabiliteit** | Dit hoofdstuk Deel 17 | Crash-free rate ≥99,5% (norm vastgesteld in Deel 17) |
| **Onderhoudbaarheid** | Blueprint.md (werkwijze), Hoofdstuk 9 Deel 1.5 | Elke wijziging gedocumenteerd conform de bestaande CURRENT_STATE.md/Decision Log-praktijk; geen ongedocumenteerde architecturale afwijking |

**Bindende regel:** deze tabel is de enige plek waar kwaliteitsnormen worden *samengevat* — de volledige, gedetailleerde norm blijft in het bronhoofdstuk staan. Bij een discrepantie tussen deze tabel en een bronhoofdstuk, geldt het bronhoofdstuk als leidend.


---

## Deel 3 — Definition of Ready

Vijf niveaus, elk met concrete voorwaarden vóórdat werk mag starten.

| Niveau | Wanneer mag begonnen worden? |
|---|---|
| **User Story Ready** | De Story heeft een duidelijk, in één zin te formuleren doel; is herleidbaar tot een concrete persona-behoefte (Hoofdstuk 2) of Roadmap-punt; heeft geen open, blokkerende vragen aan de Product Owner (bestaande Definition of Ready-praktijk uit governance-niveau B, hier bevestigd) |
| **Sprint Ready** | Alle Stories binnen de sprint zijn individueel Story Ready; er is geen bekende architecturale overlap (Product Principle P9) met bestaande functionaliteit die niet vooraf is geadresseerd |
| **Feature Ready** | De feature is getoetst aan de relevante hoofdstukken (bijv. een nieuw scherm: Hoofdstuk 6 Screen Design Laws; een nieuwe AI-functie: Hoofdstuk 8 AI Behaviour Constitution); alle afhankelijkheden (bijv. een benodigde SQL-migratie) zijn geïdentificeerd |
| **Design Ready** | Het ontwerp is getoetst aan de Design Constitution (Hoofdstuk 5) en, waar van toepassing, de Screen/Component-specificaties (Hoofdstuk 6-7) — geen ontwerpvoorstel start bouw zonder deze toetsing |
| **AI Ready** | De AI-functie is getoetst aan de AI Behaviour Constitution (Hoofdstuk 8) én de AI Governance-risicoanalyse (Hoofdstuk 9, Deel 1.6) — inclusief expliciete classificatie op de drie risico-assen (veiligheid, vertrouwen, consistentie) |

---

## Deel 4 — Definition of Done

Acht "Done"-categorieën, elk met concrete, toetsbare voorwaarden.

| Categorie | "Done" betekent |
|---|---|
| **UI Done** | Elk element herleidbaar tot een Design Token (Hoofdstuk 5, Deel 15); Premium Design Checklist (Hoofdstuk 5, Deel 18, 252 punten) doorlopen voor de geraakte componenten |
| **UX Done** | Premium UX Checklist (Hoofdstuk 4, Deel 11) doorlopen; UX Scorecard (Hoofdstuk 4, Deel 12) scoort minimaal "Voldoende", met een concreet actieplan indien niet "Premium" |
| **AI Done** | Alle vijf testtypen uit Hoofdstuk 9 (Deel 4.2: functioneel, explainability, safety, persoonlijkheid, sportspecifiek) geslaagd; Constitution-toetsing (Hoofdstuk 8-9) zonder onopgeloste schending |
| **Testing Done** | Zie Deel 5 van dit hoofdstuk — alle relevante testtypen voor de wijziging uitgevoerd en geslaagd, inclusief de volledige `core/release-gate.js`-suite (discovery-based, 80 testbestanden, 82 teststappen — bijgewerkt via MS-F1-04, zie kanttekening onder Deel 5) zonder regressie |
| **Accessibility Done** | Zie Deel 8 van dit hoofdstuk — WCAG AA bevestigd, alle relevante accessibility-checklists (Hoofdstuk 4/5/10/11) doorlopen |
| **Performance Done** | Zie Deel 7 van dit hoofdstuk — alle relevante performance-normen gehaald, gemeten niet aangenomen |
| **Documentation Done** | CURRENT_STATE.md/Decision Log bijgewerkt waar relevant (Hoofdstuk 9, Deel 1.5/10.5); versiebump uitgevoerd (bestaande, bindende praktijk) |
| **Release Done** | Alle voorgaande zeven categorieën Done, plus doorloop van de relevante Release Gate (Deel 16) |

**Bindende regel:** een feature is pas "Done" wanneer alle acht categorieën Done zijn — een feature die functioneel werkt maar Accessibility Done mist, is niet Done, ongeacht hoe dringend de release-druk is (Golden Rule Deel 1.1: kwaliteit boven snelheid).


---

## Deel 5 — Test Strategy

**Kanttekening (toegevoegd via MS-F1-04, 28 augustus 2026 — CANONICAL CURRENT vervangt de hieronder genoemde `logic_tests.js`-centrische beschrijving):** `logic_tests.js` bestaat nog en draait mee, maar is niet langer hét regressiemechanisme — de daadwerkelijke, bindende gate is `node core/release-gate.js`, een discovery-based runner die automatisch elk bestand onder `core/*.test.js` vindt en uitvoert (momenteel 80 testbestanden, 82 teststappen incl. `logic_tests.js` en 2 statische checks). Dit verving het oude, handmatig bijgehouden `logic_tests.js`-only-beeld nadat bleek dat de lokale testrun structureel achterliep bij wat CI al langer volledig draaide (zie `docs/TEST_VERIFICATION.md`). De onderstaande tabel is voor het overige ongewijzigd gelaten (historische context, niet elke rij vereiste correctie).

Dertien testtypen, elk met status, doel en bron.

| Testtype | Status | Doel | Bron/uitvoering |
|---|---|---|---|
| **Unit Tests** | 🟢 | Geïsoleerde logica-validatie (berekeningen: dagfactor, 1RM, ACWR) | `core/release-gate.js` (80 discovery-based testbestanden, incl. `logic_tests.js`), Node.js, geen DOM/imports |
| **Integration Tests** | 🟡 | Samenwerking tussen modules (bijv. check-in → dagfactor → AI-advies) | Eigen `core/*.test.js`-bestanden binnen dezelfde discovery-based aanpak; geen aparte tooling nodig zolang de bestaande, zelfstandige-scenario-structuur volstaat |
| **Component Tests** | 🔴 | Individuele UI-componenten (Hoofdstuk 7) tegen hun specificatie | Nieuw: elke component uit Hoofdstuk 7 krijgt een geïsoleerd testscenario tegen zijn 24-veld-specificatie (padding/radius/states/accessibility) |
| **UX Tests** | 🟡 | Doorloop van de Premium UX Checklist (Hoofdstuk 4, Deel 11) | Handmatige/steekproef-doorloop per release |
| **Accessibility Tests** | 🟡 | Schermlezer, toetsenbord, contrast, reduce motion | Handmatige steekproef (Deel 8) + geautomatiseerde contrastcontrole waar mogelijk |
| **AI Tests** | 🟡 | Functioneel, explainability, safety, persoonlijkheid, sportspecifiek (Hoofdstuk 9, Deel 4.2) | Vaste edge-casetestset (Hoofdstuk 9, Deel 5.11) bij elke AI-wijziging |
| **Regression Tests** | 🟢 | Voorkomen dat een eerder opgeloste bug terugkeert | Volledige `core/release-gate.js`-run bij elke wijziging (bestaande, bindende praktijk) |
| **Smoke Tests** | 🔴 | Snelle, oppervlakkige controle dat de kernflow (inloggen, trainen loggen, AI-advies) functioneert na elke deploy | Nieuw: een minimale testset (<10 scenario's) die binnen enkele minuten de kernflow bevestigt vóór uitgebreidere tests |
| **Exploratory Testing** | 🟡 | Ongestructureerd, ervaringsgedreven testen door de Product Owner zelf, gericht op "voelt dit goed" | Bestaande praktijk (Maurice test als primaire atleet), hier geformaliseerd als verplichte stap vóór Internal Testing (Deel 12) |
| **User Acceptance Tests** | 🟡 | Bevestiging door de daadwerkelijke doelgroep (ART CrossFit-leden) dat een feature de bedoelde waarde levert | Onderdeel van Closed Testing (Deel 13) |
| **End-to-End Tests** | 🟢 | Volledige gebruikersflows van begin tot eind | Bestaande Playwright-suite, lokaal uitgevoerd na oplevering (Blueprint.md) |
| **Offline Tests** | 🔴 | Functionaliteit onder vliegtuigmodus/verbroken verbinding | Nieuw: verplichte vliegtuigmodus-test voor elke wijziging aan de trainingsflow (Hoofdstuk 4, Golden Rule UX41-eis) |
| **Wearable Tests** | 🔴 | OAuth-koppeling, synchronisatie, tokenverval-afhandeling | Nieuw: periodieke, handmatige verificatie van de Fitbit-koppeling inclusief de bekende Testing-mode-tokenvervalbeperking (Product Audit, sectie 4.8) |

**Bindende regel:** Unit Tests en Regression Tests (via `core/release-gate.js`) zijn **verplicht en geautomatiseerd** bij elke wijziging, zonder uitzondering — dit is de bestaande, bewezen kern van de testpraktijk en wordt hier expliciet als fundament van de overige twaalf testtypen bevestigd.


---

## Deel 6 — Device Matrix

| Categorie | Ondersteuningsniveau | Toelichting |
|---|---|---|
| **Android 13** | Volledig ondersteund | Minimale ondersteunde versie; PWA-installatie en alle kernfuncties werken |
| **Android 14** | Volledig ondersteund | — |
| **Android 15** | Volledig ondersteund | — |
| **Android 16** | Volledig ondersteund, getest zodra beschikbaar op representatieve toestellen | Nieuwe OS-versies worden binnen één reguliere releasecyclus na publicatie getest, niet pas bij een gemelde breuk |
| **Kleine telefoons** (<6") | Volledig ondersteund | De bestaande `max-width: 430px`-container (Hoofdstuk 5, Deel 6) is ontworpen voor compacte schermen als basisvorm, niet als uitzondering |
| **Grote telefoons** (>6,5") | Volledig ondersteund | Content blijft binnen de 430px-container gecentreerd, geen uitgerekte layout |
| **Tablets** | Ondersteund conform Hoofdstuk 5, Deel 6 (Grid System) | 2-koloms overzichtsschermen; trainingsflow blijft bewust single-column ook op tablet |
| **Foldables** | Basisondersteuning (werkt als telefoon in gevouwen/ontvouwen staat, geen dedicated dual-screen-layout) | Geen aparte foldable-specifieke layout gepland vóór een concrete gebruikersvraag hiernaar (vergelijkbaar met de wereldwijde-zoekfunctie-drempel, Hoofdstuk 10 Deel 10.2) |
| **Landscape** | Basisondersteuning op telefoon (functioneel bruikbaar, niet primair geoptimaliseerd); volledig ondersteund op tablet | De trainingsflow is primair ontworpen voor portrait-gebruik (manifest: `"orientation": "portrait"`, bestaand), consistent met eenhandig-gebruik tijdens training (Hoofdstuk 4, Deel 10) |
| **Dark Mode** | Volledig ondersteund | Hoofdstuk 5, Deel 13 — volwaardig eigen ontwerp, niet enkel een inversie |
| **Light Mode** | Volledig ondersteund | Standaardmodus |

**Bindende regel:** "volledig ondersteund" betekent: elke Golden Rule/Constitution uit Hoofdstuk 3-11 is op dat toestelprofiel getoetst, niet enkel "de app opent en toont content".

---

## Deel 7 — Performance Standards

Concrete, meetbare normen — elke norm is een directe verscherping/bevestiging van eerder vastgelegde principes (Hoofdstuk 3/4, Performance Principles), hier voor het eerst met exacte getallen.

| Metric | Norm | Bron/rationale |
|---|---|---|
| **Cold start** (app-icoon-tik tot interactief Dashboard) | <2 seconden op een representatief middenklasse-toestel | Consistent met Splash-regel (Hoofdstuk 6, Scherm 1.1: geen kunstmatige vertraging) |
| **Warm start** (app hervat vanuit achtergrond) | <500ms | Aanzienlijk sneller dan cold start — geen herinitialisatie nodig |
| **Scrolling** | Consistent 60fps, nooit merkbaar onder 30fps | Hoofdstuk 11, Deel 15 (Motion Performance) |
| **Workout logging** (tik tot bevestigde opslag) | Optimistische UI: <100ms zichtbare bevestiging; achtergrondsynchronisatie ongeacht netwerklatentie | Product Constitution XIX, Hoofdstuk 4 Deel 4 |
| **AI Response Time** | "Aan het nadenken"-status <300ms; volledig antwoord doorgaans binnen enkele seconden, met een bovengrens waarboven onderzoek volgt (Hoofdstuk 9, Deel 9) | Hoofdstuk 8, Deel 2.1 |
| **Synchronisatie** | Achtergrondproces, nooit blokkerend voor de gebruiker; zichtbare voortgang bij een grote wachtrij | Hoofdstuk 4, Flow 18 |
| **Grafieken** | Eerste teken-animatie <600ms (`motion-slow`, Hoofdstuk 11 Deel 3); data-berekening zelf <200ms | Hoofdstuk 11, Deel 8 |
| **Batterijgebruik** | Geen doorlopende animatie/proces actief buiten het zichtbare scherm of op de achtergrond (Hoofdstuk 11, Deel 15) | — |
| **Geheugengebruik** | Geen geheugenlek bij herhaald gebruik binnen een sessie (bijv. herhaald openen/sluiten van modals, Hoofdstuk 11 Deel 16 punt 77) | — |
| **Netwerkgebruik** | Lazy-loading van media (Hoofdstuk 7, 12.1: video laadt pas bij tik op play); geen onnodige vooraf-buffering | — |
| **Frame rate** | Streeft naar 60fps, fallback naar vereenvoudigde animatie bij structurele onderschrijding van 30fps | Hoofdstuk 11, Deel 15 |
| **Crashvrije sessies** | ≥99,5% (zie Deel 17, Quality Metrics) | Nieuw vastgestelde norm, dit hoofdstuk |

**Meetmethode:** elke norm wordt gemeten op een representatief middenklasse-Android-toestel (niet het snelste beschikbare ontwikkeltoestel) — een norm die alleen op topmodellen wordt gehaald, geldt als niet gehaald.


---

## Deel 8 — Accessibility Validation

Volledig gegrond in Hoofdstuk 3 (Deel 7), Hoofdstuk 4 (Deel 10), Hoofdstuk 5 (Deel 16), Hoofdstuk 10 (Deel 11) en Hoofdstuk 11 (Deel 14) — dit Deel is de **verificatielaag**, geen nieuwe norm.

| Gebied | Validatiemethode |
|---|---|
| **WCAG** | Steekproefcontrole tegen WCAG 2.1 AA op elke nieuwe/gewijzigde schermsectie |
| **Contrast** | Geautomatiseerde contrastcontrole waar mogelijk, handmatige steekproef op elke nieuwe kleurcombinatie |
| **Screen Reader** | Volledige doorloop van kernflows (trainen, AI-coach raadplegen, instellingen wijzigen) met een actieve schermlezer vóór elke Closed Testing-fase (Deel 13) |
| **Voice Access** | Steekproef op primaire navigatiepaden (Hoofdstuk 10, Deel 11) |
| **Keyboard** | Volledige Tab-navigatie-doorloop op elk nieuw scherm |
| **Touch Targets** | Verificatie van de 44×44px-minimumeis (ruimer binnen de trainingsflow) op elk nieuw interactief element |
| **Reduce Motion** | Verplichte doorloop met `prefers-reduced-motion` actief vóór elke release die nieuwe motion introduceert (Hoofdstuk 11, Deel 16) |
| **Kleurenblindheid** | Gesimuleerde doorloop (deuteranopie/protanopie) op elk scherm met kleurcodering (met name de spierherstel-heatmap) |
| **Motorische beperkingen** | Verificatie dat geen enkele interactie een snelle, precieze dubbele beweging vereist zonder alternatief |
| **Cognitieve belasting** | Steekproef tegen Product Principle P16 (complexiteit naar de kwetsbaarste relevante persona) — met name onboarding en eerste-gebruik-flows |

**Exit-criterium:** geen enkele build bereikt Closed Testing (Deel 13) zonder een volledige doorloop van deze tien gebieden op de sinds de vorige release gewijzigde schermen.

---

## Deel 9 — AI Validation

Volledig gegrond in Hoofdstuk 9, Deel 4-6 (Quality Assurance, Evaluation, Hallucination Prevention) — dit Deel is uitsluitend de **releasegate-toepassing** van die reeds vastgelegde normen.

| Criterium | Validatiebron | Releasegate-eis |
|---|---|---|
| Correctheid | Hoofdstuk 9, Deel 5.1 | 100% van de steekproef klopt met de brondata |
| Consistentie | Hoofdstuk 9, Deel 5.2 | Geen significante afwijking tussen vergelijkbare scenario's |
| Veiligheid | Hoofdstuk 9, Deel 5.4, Hoofdstuk 8 Deel 14 | 0 schendingen van de tien veiligheidsregels in de edge-casetestset |
| Confidence | Hoofdstuk 8, Deel 3.8 | Elke inschatting toont zijn classificatie |
| Explainability | Hoofdstuk 9, Deel 5.3 | 100% van de output bevat een navolgbare uitleg |
| Persoonlijkheid | Hoofdstuk 9, Deel 5.6 | Onafhankelijke steekproef classificeert output consistent als "herkenbaar TrainingKompas" |
| Sportspecifieke adviezen | Hoofdstuk 9, Deel 5.7 | Geen kruisbesmetting tussen sportcontexten |
| Blessurepreventie | Hoofdstuk 8, Deel 14.3 | Signalering getoetst tegen minimaal twee onafhankelijke databronnen |
| Hallucinaties | Hoofdstuk 9, Deel 6 | 0 gedetecteerde hallucinations in de regressietestset |
| Feedbackkwaliteit | Hoofdstuk 9, Deel 7 | Geen onopgeloste "Onveilig"-gemarkeerde feedback bij release |

**Exit-criterium:** geen enkele AI-wijziging bereikt Production (Deel 16, Gate 8) zonder dat alle tien criteria hierboven zijn geverifieerd — dit is strenger dan de reguliere Feature Done-eis (Deel 4) omdat AI, consistent met Hoofdstuk 9 Deel 1.6, een hogere risicocategorie is.

---

## Deel 10 — Security & Privacy Validation

| Gebied | Norm | Bron |
|---|---|---|
| **AVG (GDPR)** | Privacybeleid (Hoofdstuk 6, Scherm 9.6) komt exact overeen met de daadwerkelijke dataverwerking; recht op inzage/export/verwijdering functioneel geverifieerd | Hoofdstuk 1, sectie 1.10; Product Audit sectie 14 |
| **Dataminimalisatie** | Geen enkel veld/databron wordt verzameld zonder direct functioneel doel | Hoofdstuk 9, Deel 11.2 |
| **Authenticatie** | Supabase Auth, persistente sessie, correcte sessie-verval-afhandeling (Hoofdstuk 10, Deel 9: "verlopen sessie"-flow) | Bestaand, sinds 12 juli 2026 |
| **Autorisatie** | RLS actief en geverifieerd op alle tabellen (bestaand, DEC-007); elke nieuwe tabel krijgt RLS vóór productiedata | Blueprint.md |
| **Encryptie** | HTTPS via Netlify (transport); Supabase-encryptie-at-rest (platformstandaard) | Blueprint.md |
| **Lokale opslag** | Geen gevoelige data (API-sleutels) client-side opgeslagen; offline-wachtrijdata per-gebruiker gescheiden (cache-owner-uid-patroon, bestaand sinds v3.3.5-fix) | Bestaand |
| **Cloud opslag** | Supabase, RLS-beschermd, geen publiek toegankelijke buckets voor persoonlijke data | Bestaand |
| **Back-ups** | Supabase-platformback-ups (buiten directe controle, wel periodiek geverifieerd); gebruikerszijdige export (Hoofdstuk 6, Scherm 9.3) als aanvullend vangnet | Hoofdstuk 6, Scherm 9.2-9.3 |
| **Toestemmingen** | Elke permissie volgt Hoofdstuk 10, Deel 5 (wanneer wel/niet vragen); Privacy-scherm expliciet gekoppeld aan elke databron | Hoofdstuk 10, Deel 5 |

**Exit-criterium:** een kritieke security-bevinding (vergelijkbaar met de v3.3.10 coach.js-JWT-misser of de DEC-004 RLS-lekken) blokkeert elke release onvoorwaardelijk, ongeacht de fase — dit is de hoogste-prioriteit uitzondering in dit hele hoofdstuk.


---

## Deel 11 — Play Store Readiness

Visuele/merk-onderdelen zijn volledig gespecificeerd in Hoofdstuk 5, Deel 17 (Launcher Icon, Adaptive Icon, Feature Graphic, Screenshots, Splash Screen, App-naam, Omschrijvingen) — hier uitsluitend herbevestigd als releasegate-vereiste, niet herhaald. Dit Deel voegt de technische/beleidsmatige Play Store-vereisten toe die nog niet eerder aan bod kwamen.

| Onderdeel | Status | Norm |
|---|---|---|
| Launcher Icon / Adaptive Icon / Feature Graphic / Screenshots | 🟢 (Hoofdstuk 5, Deel 17) | Exact conform bronbestand, geverifieerd vóór elke Store-indiening |
| **Promo Video** | 🔴 | Optioneel voor eerste release; indien gemaakt, volgt dezelfde merktoon als Deel 17 Hoofdstuk 5 (geen overdreven superlatieven, feitelijke demonstratie van de kernflow) |
| Store Listing | 🟢 (Hoofdstuk 5, Deel 17) | Titel, korte/lange omschrijving exact conform specificatie |
| Privacy Policy / Terms | 🟡 | Zie Deel 10; moet inhoudelijk actueel zijn bij Store-indiening, in minimaal Nederlands en Engels (Hoofdstuk 6, Scherm 9.6) |
| **Target SDK** | 🔴 | Voldoet te allen tijde aan de actuele Google Play-vereiste (jaarlijks verhoogde minimale target-API-level) — geverifieerd vóór elke Store-indiening, niet enkel bij de eerste release |
| **App Signing** | 🔴 | Play App Signing geactiveerd (Google-beheerd sleutelbeheer), consistent met platformaanbeveling voor een solo-ontwikkelaar zonder eigen key-management-infrastructuur |
| **App Bundle** | 🔴 | Aangeleverd als Android App Bundle (.aab), niet als losse APK — platformvereiste sinds geruime tijd, hier bevestigd als bindende norm |
| **Versioning** | 🟢 | Bestaande, bindende praktijk: versiebump bij elke release (HTML-bestandsnaam + sw.js-cachenaam, hier uitgebreid met de Play Store `versionCode`/`versionName`) |
| **Release Notes** | 🔴 | Elke Store-release bevat een korte, feitelijke, gebruikersgerichte samenvatting van wijzigingen — geen technisch changelog-jargon, consistent met de merktoon (Hoofdstuk 1, sectie 1.6) |
| **Crashvrije build** | 🟢/🔴 | 0 bekende kritieke crashes bij indiening; crash-free rate-norm (Deel 17) van toepassing vanaf Internal Testing |
| **Performance** | 🔴 | Google Play Console-vitals (indien beschikbaar na eerste releases) binnen de "Goed"-drempel; vooraf: interne performance-normen (Deel 7) gehaald |
| **Permissions** | 🟡 | Elke aangevraagde permissie herleidbaar tot een daadwerkelijk gebruikte functie (Hoofdstuk 10, Deel 5) — geen ongebruikte permissie in het manifest |
| **Data Safety** | 🔴 | Het Play Console Data Safety-formulier komt exact overeen met de daadwerkelijke dataverwerking (Deel 10) — elke databron die het formulier claimt te verzamelen/delen, is geverifieerd tegen de daadwerkelijke code |

**Bindende regel:** Play Store Readiness is nooit uitsluitend een visuele/marketing-checklist (Hoofdstuk 5) — de technische/beleidsmatige onderdelen in dit Deel zijn even bindend en worden bij elke Store-indiening (niet enkel de eerste) opnieuw geverifieerd.


---

## Deel 12 — Internal Testing

| Aspect | Specificatie |
|---|---|
| **Doel** | De eerste toetsing van een build buiten de directe ontwikkelomgeving — bevestigen dat installatie, kernflow en de laatste wijzigingen werken op een echt toestel, vóórdat een grotere groep het ziet |
| **Testgroep** | Maurice (Product Owner/primaire atleet) plus een klein aantal direct betrokkenen (bijv. een ART CrossFit-coach) — realistisch, geen fictieve grote interne testafdeling |
| **Scenario's** | De volledige Smoke Test-set (Deel 5) plus de specifieke Stories die in de betreffende release zijn opgeleverd |
| **Feedbackproces** | Direct, informeel (bestaande werkwijze) — vastgelegd in CURRENT_STATE.md/Decision Log waar relevant, geen apart ticketsysteem nodig op deze schaal |
| **Bugclassificatie** | Kritiek (blokkeert kernflow of schendt een veiligheidsregel) / Hoog (functioneel defect zonder kernflow-blokkade) / Middel (UX/UI-afwijking) / Laag (cosmetisch) — consistent met de classificatie uit Hoofdstuk 9, Deel 13.2, hier toegepast op reguliere (niet-AI-specifieke) bugs |
| **Prioritering** | Kritiek en Hoog blokkeren doorstroom naar Closed Testing; Middel/Laag worden ingepland maar blokkeren niet |
| **Exit Criteria** | 0 Kritieke bugs, 0 onopgeloste Hoge bugs binnen de kernflow, volledige Smoke Test-set geslaagd |

---

## Deel 13 — Closed Testing

| Aspect | Specificatie |
|---|---|
| **Selectie testers** | ART CrossFit-leden en -coaches (de eerste, bevestigde doelgroep, Hoofdstuk 2) — een kleine, betrokken groep (richtlijn: 10-20 personen, aansluitend bij Google Play's minimale vereiste voor closed testing-doorstroom) |
| **Testopdrachten** | Concrete scenario's die de kernflows dekken (onboarding, eerste training, AI-coach-gebruik, herstel bekijken) — niet vrijblijvend "probeer het maar", maar gerichte opdrachten die feedback op elk kritiek onderdeel opleveren |
| **Feedback — algemeen** | Verzameld via het bestaande Feedback-scherm (Hoofdstuk 6, Scherm 9.5) |
| **AI feedback** | Specifiek gevraagd: voelt het advies persoonlijk, is de uitleg begrijpelijk, klopt de sportcontext (directe input voor Hoofdstuk 9, Deel 7) |
| **UX feedback** | Specifiek gevraagd: waar haakte je af, wat was onduidelijk, sluit dit aan bij hoe je normaal traint |
| **Performance feedback** | Specifiek gevraagd: voelde iets traag, is de app ooit vastgelopen |
| **Exit Criteria** | 0 Kritieke bugs; AI Validation (Deel 9) volledig geslaagd; geen patroonmatige negatieve UX-feedback op een kernflow zonder dat dit is geadresseerd; minimale testperiode van twee weken doorlopen (in lijn met Google Play's vereiste doorlooptijd voor closed testing vóór productie-toegang) |

---

## Deel 14 — Open Testing

| Aspect | Specificatie |
|---|---|
| **Publieke bèta** | Een grotere, publiek toegankelijke Play Store-testtrack — pas geactiveerd wanneer Closed Testing volledig is afgerond en de Product Owner expliciet akkoord geeft (Hoofdstuk 9, Deel 1.4-achtige besluitvorming, hier toegepast op releasebeslissingen) |
| **Monitoring** | Play Console-vitals (crashes, ANR's), Quality Metrics (Deel 17) actief gevolgd, niet enkel bij release maar doorlopend |
| **Crashanalyse** | Elke gerapporteerde crash onderzocht binnen een vergelijkbare responstijd-classificatie als AI-incidenten (Hoofdstuk 9, Deel 13.3) — een Kritieke crash (kernflow-blokkerend) krijgt directe aandacht |
| **Reviews** | Play Store-reviews gemonitord als kwalitatieve feedbackbron, aanvullend op het gestructureerde Feedback-mechanisme (Hoofdstuk 6, Scherm 9.5) |
| **Feedback** | Zelfde structuur als Closed Testing (Deel 13), nu op grotere schaal en met een bredere, minder gerichte gebruikersgroep |
| **Beslismomenten** | Doorstroom naar Production (Deel 16, Gate 8) vereist: crash-free rate binnen de Deel 17-norm, geen onopgeloste Kritieke/Hoge bugs, geen onopgeloste AI-incidenten (Hoofdstuk 9, Deel 13) |


---

## Deel 15 — Production Readiness Review

Vierhonderdtwaalf controlepunten, doorlopend genummerd, JA/NEE-toetsbaar, verdeeld over veertien categorieën. Dit is de meest uitgebreide checklist van het hele Handbook — verplicht volledig doorlopen vóór Gate 8 (Production, Deel 16).

### UI (1-36)
1. Zijn alle kleuren herleidbaar tot een Design Token (Hoofdstuk 5, Deel 15)?
2. Zijn alle spacing-waarden herleidbaar tot een Design Token?
3. Zijn alle radius-waarden herleidbaar tot een Design Token?
4. Zijn alle elevatieniveaus herleidbaar tot een Design Token?
5. Is Poppins Bold/Medium consistent en exclusief gebruikt?
6. Is de merknaam "Trainingskompas" volledig zichtbaar op elk relevant scherm?
7. Zijn er 0 native `confirm()`/`alert()`-aanroepen?
8. Is elk icoon in lijnstijl, consistent met Hoofdstuk 5 Deel 8?
9. Zijn er 0 emoji gebruikt als functioneel icoon?
10. Is dark mode volledig en correct geïmplementeerd op elk scherm?
11. Is light mode volledig en correct geïmplementeerd op elk scherm?
12. Voldoet elke component aan zijn Hoofdstuk 7-specificatie?
13. Is de Premium Design Checklist (Hoofdstuk 5, Deel 18) doorlopen voor alle gewijzigde schermen?
14. Zijn illustraties beperkt tot het lijnstijl-/pad-motief (Hoofdstuk 5, Deel 9)?
15. Zijn foto's (indien gebruikt) conform Hoofdstuk 5, Deel 10?
16. Is de iconenset consistent tussen alle 37 schermen?
17. Zijn alle Workout/Exercise/AI/Recovery/Analytics Cards visueel correct onderscheiden?
18. Is elke destructieve knop visueel onderscheiden van reguliere knoppen?
19. Is de Search-component consistent pill-vormig?
20. Is elk formulier conform de Forms-specificatie (Hoofdstuk 5/7)?
21. Zijn alle badges consistent gestyled?
22. Is de Bottom Navigation consistent op alle hoofdschermen?
23. Is de Top App Bar consistent op alle subschermen?
24. Zijn er 0 visuele inconsistenties tussen vergelijkbare schermen?
25. Is de adaptive icon correct binnen de veilige zone?
26. Is het launcher icon exact conform de brand sheet?
27. Is het splash screen exact conform het bronbestand?
28. Zijn alle grafieken conform Hoofdstuk 5, Deel 12?
29. Is de spierherstel-heatmap-kleurgradient consistent op elk scherm waar herstel getoond wordt?
30. Is er een visuele QA-doorloop uitgevoerd op zowel een klein als een groot schermformaat?
31. Zijn er 0 afgekapte teksten bij standaard systeemlettergrootte?
32. Zijn er 0 afgekapte teksten bij vergrote systeemlettergrootte (200%)?
33. Is de contrastverhouding van alle kerntekst geverifieerd (WCAG AA)?
34. Is elke nieuwe UI-toevoeging sinds de vorige release visueel gereviewd?
35. Is de Design Constitution (Hoofdstuk 5) zonder onopgeloste schending?
36. Is deze UI-sectie zelf doorlopen door minimaal één andere blik dan de bouwer (zelfreview vs. collegiale review)?

### UX (37-72)
37. Kosten kernacties tijdens de workout maximaal 2 tikken?
38. Is de Premium UX Checklist (Hoofdstuk 4, Deel 11, 172 punten) volledig doorlopen?
39. Scoort de UX Scorecard (Hoofdstuk 4, Deel 12) minimaal "Voldoende" op elk gewijzigd scherm?
40. Is elke onboarding-stap getest op Persona Fleur-achtig gebruik?
41. Bestaat onboarding uit maximaal 5 stappen?
42. Is onboarding op elk moment overslaanbaar?
43. Eindigt onboarding in een concreet, gepersonaliseerd advies?
44. Toont elke lege staat een concrete volgende stap?
45. Toont elk scherm dat op data wacht skeleton-loading?
46. Is elke destructieve actie voorzien van een Confirmation Dialog?
47. Is elke foutmelding voorzien van een concrete herstelactie?
48. Blijft trainingslogging 100% functioneel offline?
49. Start de rusttimer automatisch na elke opgeslagen set?
50. Is elke AI-aanbeveling vergezeld van een gelijkwaardig alternatief?
51. Is herstelinformatie minimaal even prominent als prestatie-informatie op elk relevant scherm?
52. Zijn er 0 manipulatieve motivatiemechanismen aanwezig?
53. Zijn notificaties uitsluitend functioneel, nooit activatiegedreven?
54. Is elke upsell-communicatie getoetst op afwezigheid van manipulatieve taal?
55. Is een abonnementsannulering even makkelijk vindbaar als een upgrade?
56. Is de volledige schermbibliotheek (Hoofdstuk 6) up-to-date met de daadwerkelijke implementatie?
57. Is de Screen Review Checklist (Hoofdstuk 6) doorlopen voor alle gewijzigde schermen?
58. Zijn alle 22 User Flows (Hoofdstuk 10, Deel 4) end-to-end getest sinds de vorige grote release?
59. Is de Navigation Review Checklist (Hoofdstuk 10, Deel 13) doorlopen?
60. Is elke deep link functioneel getest?
61. Gedraagt de Back-knop (software en hardware) zich overal consistent?
62. Is er 0 doodlopend scherm zonder navigatie-uitweg?
63. Is elke wizard-stap terug te navigeren zonder dataverlies?
64. Is de zoekfunctie getest binnen elke relevante context?
65. Verschijnen zoekresultaten binnen 300ms?
66. Is elke Empty/Loading/Error-state per scherm expliciet getest?
67. Is elke flow-emotie (Hoofdstuk 4/10) nog steeds accuraat na de laatste wijzigingen?
68. Is er een exploratory testing-sessie uitgevoerd door de Product Owner op de volledige, actuele build?
69. Is elke recent gewijzigde flow getoetst aan de kwetsbaarste relevante persona?
70. Is er 0 architecturale overlap tussen schermen geconstateerd zonder documentatie?
71. Is elke UX Constitution-wet (Hoofdstuk 4) zonder onopgeloste schending?
72. Is elke Screen Design Law (Hoofdstuk 6) zonder onopgeloste schending?


### AI (73-108)
73. Toont elke AI-output een navolgbare data-referentie en redenering?
74. Beslist de AI nooit zelfstandig — heeft elk advies een gelijkwaardig alternatief?
75. Is elke Confidence-classificatie correct en niet kunstmatig hoog voorgesteld?
76. Zijn alle tien AI Safety-regels (Hoofdstuk 8, Deel 14.5) zonder schending?
77. Stelt de AI-coach nergens een medische diagnose?
78. Geeft de AI-coach nergens een behandeladvies?
79. Blijft elke kwantitatieve aanbeveling binnen de sportwetenschappelijke veiligheidsgrenzen?
80. Heeft blessurerisico-signalering de hoogste prioriteit in elke informatie-afweging?
81. Gaat herstel vóór prestatie in elke AI-berekening?
82. Is de vaste edge-casetestset (Hoofdstuk 9, Deel 5.11) volledig doorlopen en geslaagd?
83. Zijn er 0 gedetecteerde hallucinations in de regressietestset?
84. Klopt de sportcontext voor elke actieve `SPORT_BLOCKS`-sport?
85. Functioneert het generieke fallback-raamwerk (Hoofdstuk 8, Deel 11.25) correct voor niet-uitgewerkte sporten?
86. Is de coach-persoonlijkheid consistent met de zeven kerneigenschappen (Hoofdstuk 8, Deel 15.1)?
87. Past de toon zich correct aan het ervaringsniveau aan zonder de persoonlijkheid te veranderen?
88. Is elke notificatie functioneel, nooit activatiegedreven?
89. Zijn er 0 onopgeloste Kritieke of Hoge AI-incidenten (Hoofdstuk 9, Deel 13)?
90. Is elke recente AI-wijziging gedocumenteerd conform de Documentatieplicht (Hoofdstuk 9, Deel 10.5)?
91. Is elke AI-wijziging die een Constitution-wet raakt, vastgelegd in de Decision Log?
92. Is de Contextprioriteit (blessure > dagfactor > periodisering > voorkeur > aanname) correct geïmplementeerd?
93. Wordt bij een contextconflict het meest voorzichtige signaal correct geprioriteerd?
94. Valt de AI bij onvoldoende data correct terug op de neutrale fallback (Hoofdstuk 8, Deel 2.4)?
95. Is er 0 AI-output die zekerheid suggereert zonder toereikende databasis?
96. Is elke deterministisch berekenbare waarde daadwerkelijk aangeleverd, nooit door het model geschat?
97. Is de Anthropic API-sleutel server-side geverifieerd en nooit client-side blootgesteld?
98. Is de coach-proxy (`coach.js`) JWT-geverifieerd?
99. Is elke nieuwe AI-functie getoetst aan de acht bias-/fairnessgebieden (Hoofdstuk 9, Deel 8)?
100. Beïnvloedt quotabeheer nooit de kwaliteit van een individueel advies?
101. Is elke modelwijziging opnieuw volledig getest (Hoofdstuk 9, Deel 9)?
102. Is er een mens (Product Owner) die AI-gedrag kan herzien/terugdraaien (menselijke controle, Hoofdstuk 9 Deel 12.7)?
103. Is elke AI-functie getoetst aan de zeven ethische principes (Hoofdstuk 9, Deel 12)?
104. Zijn alle dertig wetten uit de AI Governance Constitution (Hoofdstuk 9) zonder onopgeloste schending?
105. Zijn alle vijftien wetten uit de AI Behaviour Constitution (Hoofdstuk 8) zonder onopgeloste schending?
106. Is er 0 onopgeloste "Onveilig"-gemarkeerde gebruikersfeedback?
107. Is de AI-geheugenlaag getoetst op correcte vergeet-/reset-regels (Hoofdstuk 9, Deel 2.5-2.6) bij accountverwijdering?
108. Is de volledige AI Validation (Deel 9 van dit hoofdstuk) doorlopen en geslaagd?

### Performance (109-140)
109. Is cold start <2 seconden gemeten op een middenklasse-toestel?
110. Is warm start <500ms?
111. Is scrolling consistent 60fps op representatieve schermen?
112. Reageert workout-logging <100ms zichtbaar (optimistisch)?
113. Verschijnt de AI "aan het nadenken"-status <300ms?
114. Is synchronisatie nooit blokkerend voor de gebruiker?
115. Is de eerste-teken-animatie van grafieken <600ms?
116. Blijft geen enkele animatie/proces actief buiten het zichtbare scherm?
117. Is er 0 geconstateerd geheugenlek bij herhaald gebruik binnen een sessie?
118. Laadt media lazy (pas bij daadwerkelijke interactie)?
119. Haalt elke animatie minimaal 30fps, streeft naar 60fps?
120. Is er een fallback voor toestellen die de gewenste framerate niet halen?
121. Is de performance-norm getest op een representatief middenklasse-toestel, niet enkel het snelste ontwikkeltoestel?
122. Is de CPU-belasting van de heatmap-inkleuring binnen aanvaardbare grenzen?
123. Is de GPU-belasting bij meerdere gelijktijdige grafieken getest?
124. Zijn simultane zware visualisaties gestaggerd?
125. Krijgt tik-feedback prioriteit boven achtergrondanimaties bij resource-schaarste?
126. Is elke animatie langer dan 300ms onderbreekbaar?
127. Is er 0 kunstmatig verlengde laadtijd (Splash of anderszins)?
128. Is de Motion Performance-norm (Hoofdstuk 11, Deel 15) volledig getoetst?
129. Is de netwerkbelasting bij een trage verbinding (3G-simulatie) getest?
130. Reageert de app functioneel correct bij een zeer trage verbinding, ook al is dit trager dan de norm?
131. Is batterijverbruik van doorlopende animaties gemeten?
132. Zijn er 0 layout-herberekeningen die per animatie-frame geforceerd worden?
133. Is de app-bundle-grootte (.aab) binnen een redelijke grens voor snelle installatie?
134. Is de performance-test uitgevoerd zowel met als zonder actieve achtergrondsynchronisatie?
135. Is de quota-/entitlement-check (Hoofdstuk 6, Scherm 9.1) zonder merkbare vertraging?
136. Is de wearable-sync-performance (icoon-rotatie, Hoofdstuk 11 Deel 10) binnen de norm?
137. Zijn de Performance Standards (Deel 7 van dit hoofdstuk) volledig gemeten, niet aangenomen?
138. Is er een gedocumenteerd resultaat per metric, herleidbaar bij een toekomstige regressie?
139. Is performance-degradatie sinds de vorige release actief vergeleken (geen sluipende achteruitgang)?
140. Is deze Performance-sectie doorlopen met daadwerkelijke metingen, niet enkel een visuele inschatting?


### Security (141-172)
141. Is RLS actief op alle 31 tabellen?
142. Is elke nieuwe tabel voorzien van RLS vóór productiedata?
143. Is de Anthropic API-sleutel uitsluitend server-side aanwezig?
144. Is elke Netlify Function voorzien van dezelfde JWT-verificatie als het bestaande patroon?
145. Is er 0 publiek toegankelijke Supabase-bucket voor persoonlijke data?
146. Is HTTPS overal afgedwongen (geen onbeveiligde endpoints)?
147. Is de sessie-verval-afhandeling (Hoofdstuk 10, Deel 9) functioneel getest?
148. Zijn er 0 bekende, onopgeloste kritieke kwetsbaarheden (vergelijkbaar met Supabase Advisor-niveau)?
149. Is per-gebruiker lokale opslag-scheiding (cache-owner-uid) geverifieerd?
150. Is elke rolwijziging (Team-scherm) correct beperkt tot geautoriseerde rollen?
151. Is het audit-log (Hoofdstuk 6, Scherm 7.3) onveranderlijk en functioneel?
152. Is accountverwijdering functioneel getest met een wegwerp-account?
153. Verwijdert accountverwijdering ook elke afgeleide AI-context (Hoofdstuk 9, Deel 11.4)?
154. Is exportfunctionaliteit beperkt tot uitsluitend de eigen data van de ingelogde gebruiker?
155. Is elke permissie-aanvraag (Hoofdstuk 10, Deel 5) getest op correcte scope (niet meer gevraagd dan nodig)?
156. Is er een actueel overzicht van welke data waar wordt opgeslagen (Hoofdstuk 9, Deel 11.1)?
157. Is er 0 data van andere gebruikers zichtbaar binnen de AI-context van een individuele gebruiker?
158. Is het drie-laags zichtbaarheidsmodel (personal/gym/global) functioneel correct voor lees- én schrijfpaden?
159. Is er een recente (binnen de laatste zes maanden) volledige RLS-audit uitgevoerd, vergelijkbaar met DEC-007?
160. Is de coach-PIN-flow (Team-scherm) functioneel veilig (geen omzeiling mogelijk)?
161. Zijn wachtwoorden/inloggegevens nooit in platte tekst gelogd?
162. Is er 0 gevoelige data zichtbaar in publiek toegankelijke logs?
163. Is de wearable-OAuth-flow (Hoofdstuk 6, Scherm 8.1) veilig geïmplementeerd (geen tokenlekken)?
164. Is de bekende Fitbit-Testing-mode-beperking (wekelijkse tokenvervaldatum) correct gecommuniceerd naar gebruikers?
165. Is er een concreet plan/tijdlijn om de Fitbit-app naar Production-verificatie te brengen vóór brede uitrol?
166. Is elke betaalgerelateerde actie (Abonnement) via een geverifieerd, veilig kanaal (Mollie, wanneer geactiveerd)?
167. Is er 0 hardcoded, gevoelige waarde (sleutels, wachtwoorden) in de client-side code?
168. Is de bestaande security-cultuur (JWT-fix, RLS-audit) gedocumenteerd als herhaalbaar proces, niet als eenmalige actie?
169. Is er een security-regressietest die de v3.3.10-coach.js-misser en DEC-004-RLS-lekken permanent afdekt?
170. Is elke nieuwe externe integratie (toekomstige wearables, betaaldiensten) getoetst aan dezelfde beveiligingsstandaard?
171. Is Security Validation (Deel 10 van dit hoofdstuk) volledig doorlopen?
172. Blokkeert een kritieke security-bevinding onvoorwaardelijk elke release, ongeacht fase?

### Accessibility (173-204)
173. Voldoet alle kerntekst aan WCAG AA-contrast?
174. Is interactieve tekst minimaal 15px, kerncijfers minimaal 24px?
175. Zijn touch-targets minimaal 48dp systeembreed?
176. Is elk interactief element voorzien van een betekenisvol toegankelijk label?
177. Is de leesvolgorde voor schermlezers gelijk aan de visuele volgorde op elk scherm?
178. Wordt dynamische content aangekondigd via passende `aria-live`-niveaus?
179. Schaalt typografie correct mee met een vergrote systeemlettergrootte?
180. Wordt `prefers-reduced-motion` systeembreed gerespecteerd?
181. Is de heatmap-gradient getest tegen deuteranopie/protanopie?
182. Is haptische feedback uitschakelbaar via instellingen?
183. Is er 0 functionele informatie die uitsluitend via kleur wordt overgebracht?
184. Is elk nieuw scherm met een schermlezer getest vóór release?
185. Is Keyboard Navigation functioneel getest op alle primaire paden?
186. Is Voice Access getest op de primaire navigatiepaden?
187. Is Switch Access-scanning-volgorde consistent met Keyboard-volgorde?
188. Overschrijdt geen enkele animatie de vestibulaire veiligheidsgrens (max. 10% schaal)?
189. Overschrijdt geen enkele animatie de epilepsie-veiligheidsgrens (max. 3 knipperingen/sec)?
190. Zijn kernacties tijdens training bereikbaar binnen het onderste twee derde van het scherm?
191. Is de Accessibility Checklist uit Hoofdstuk 4 (Deel 10-gerelateerd) doorlopen?
192. Is de Accessibility Checklist uit Hoofdstuk 5 (Deel 16) doorlopen?
193. Is de Accessibility Checklist uit Hoofdstuk 10 (Deel 13, 50 punten) doorlopen?
194. Is de Accessibility-sectie uit Hoofdstuk 11 (Deel 16, punten 91-130) doorlopen?
195. Is cognitieve belasting getoetst op de onboarding-flow specifiek?
196. Is er een gecombineerde test (reduced motion + schermlezer + grote lettertypes) uitgevoerd op de kernflows?
197. Is Accessibility Validation (Deel 8 van dit hoofdstuk) volledig doorlopen?
198. Is er 0 nieuw scherm sinds de vorige release dat niet is getoetst aan alle zeven accessibility-gebieden (Hoofdstuk 10, Deel 11)?
199. Is er een vaste, herhaalbare accessibility-testset voor navigatie (Hoofdstuk 10, Deel 11, punt 249)?
200. Is de motion-toegankelijkheidsgrens getest op alle nieuwe animaties sinds de vorige release?
201. Is de contrastverhouding opnieuw geverifieerd na elke kleurwijziging (incl. toekomstige gym-branding)?
202. Is er bevestigd dat gym-branding-skins de merk-toegankelijkheidsnormen niet doorbreken?
203. Is deze Accessibility-sectie doorlopen door een test die de kwetsbaarste relevante persona simuleert?
204. Is deze sectie ondertekend als onderdeel van de Play Store Release Review?


### Motion (205-236)
205. Gebruikt elke animatie uitsluitend een token uit Hoofdstuk 11, Deel 3?
206. Is elke schermovergang conform Hoofdstuk 11, Deel 4 (universele regel of gedocumenteerde uitzondering)?
207. Is elk component-animatiegedrag conform Hoofdstuk 11, Deel 5, inclusief interruptiegedrag?
208. Is Workout Motion conform Hoofdstuk 11, Deel 6 (snelheid boven alles)?
209. Is AI Motion merkbaar rustiger dan Workout Motion?
210. Is de Celebration-intensiteitshiërarchie (Hoofdstuk 11, Deel 9.1) correct toegepast op elk vieringsmoment?
211. Is Niveau 3 (volledige viering) uitsluitend gebruikt voor PR's en grote getalsmijlpalen?
212. Zijn er 0 confetti-achtige, schermvullende effecten aanwezig?
213. Herhaalt geen enkele viering zichzelf bij herbezoek?
214. Is Loading Experience (Hoofdstuk 11, Deel 10) consistent geïmplementeerd?
215. Is de empty-state-ademhaling (Hoofdstuk 11, Deel 11) de enige animatie op lege schermen?
216. Is Error Motion (Hoofdstuk 11, Deel 12) consistent rustig, zonder felle flitsen?
217. Is elke haptiek-categorie (Hoofdstuk 11, Deel 13) correct gekoppeld aan zijn trigger?
218. Is haptiek systeembreed uitschakelbaar?
219. Wordt haptiek nooit als enige feedbackvorm gebruikt?
220. Overschrijdt geen enkele animatie de vestibulaire/epilepsie-grenzen (Hoofdstuk 11, Deel 14)?
221. Haalt elke animatie de performance-norm (Hoofdstuk 11, Deel 15)?
222. Is de volledige Motion QA Checklist (Hoofdstuk 11, Deel 16, 200 punten) doorlopen?
223. Zijn alle vijfenzeventig Motion Laws (Hoofdstuk 11, Deel 17) zonder onopgeloste schending?
224. Is er 0 ad-hoc animatieduur die niet tot een token herleidbaar is?
225. Is dark/light mode-motion consistent (enkel kleur verschilt, niet timing)?
226. Is de Kalendernavigatie-animatie consistent met de algemene richting-logica?
227. Is de Doelen-voortgangsbalk-animatie lineair (accuraat)?
228. Is elke grafiek-animatie eenmalig per sessie, nooit herhaald bij terugkeer?
229. Is de rusttimer-kleurwissel correct getimed?
230. Is de wearable-sync-rotatie-animatie consistent en licht?
231. Is Export/Import-laadgedrag conform Hoofdstuk 11, Deel 10?
232. Is Crash Recovery-motion (Hoofdstuk 11, Deel 12) geruststellend, niet technisch-alarmerend?
233. Is er een steekproefcontrole van productie-animaties tegen de Hoofdstuk 11-specificatie uitgevoerd?
234. Is elke nieuwe animatie sinds de vorige release getoetst aan zowel Motion Philosophy als Motion Principles (Hoofdstuk 11, Deel 1-2)?
235. Is er 0 nieuwe, ongedocumenteerde uitzondering op de standaardschermovergang?
236. Is deze Motion-sectie doorlopen vóór elke release die nieuwe motion introduceert?

### Content (237-262)
237. Is alle Nederlandse tekst taalkundig correct en consistent met de merktoon?
238. Is alle Engelse tekst (waar aanwezig) taalkundig correct?
239. Bevat geen enkele tekst jargon zonder uitleg op een gebruikersgericht scherm?
240. Is elke foutmelding in gewone, begrijpelijke taal geformuleerd?
241. Is elke AI-uitleg vrij van onnodig technisch taalgebruik?
242. Is de tagline ("Gericht trainen. Slimmer worden. Sterker blijven.") consistent en ongewijzigd gebruikt?
243. Is de Play Store-korte/lange omschrijving actueel en accuraat?
244. Zijn release notes feitelijk, gebruikersgericht en zonder technisch jargon?
245. Is het Privacy-scherm (Hoofdstuk 6, Scherm 9.6) inhoudelijk actueel bij de laatste datastructuur?
246. Is het Over de app-scherm (Hoofdstuk 6, Scherm 9.7) actueel (versienummer, missieverwoording)?
247. Zijn alle Help-artikelen (Hoofdstuk 6, Scherm 9.4) actueel met de huidige functionaliteit?
248. Is er 0 lorem-ipsum of placeholder-tekst in productie?
249. Is elke lege-staat-tekst motiverend en concreet, nooit technisch ("no data found")?
250. Is content getoetst op culturele/inclusieve toon (Hoofdstuk 9, Deel 8: culturele verschillen)?
251. Is content vrij van impliciete aannames over lichaamstype/geslacht/leeftijd?
252. Is elke sportnaam/-term correct en consistent gebruikt (Hoofdstuk 8, Deel 11)?
253. Is er 0 verwijzing naar een niet-bestaande of nog niet gebouwde functie in zichtbare productcontent?
254. Zijn alle 🔴-schermen/features uit eerdere hoofdstukken afwezig uit de huidige productie-UI (nog niet gebouwd = niet zichtbaar)?
255. Is content geverifieerd op consistentie tussen Nederlandse UI en eventuele Engelse Store-listing?
256. Is elke celebratie-tekst (Hoofdstuk 11, Deel 9) ingetogen en oprecht, niet overdreven?
257. Is elke motiverende tekst feitelijk gefundeerd, geen ongefundeerde superlatieven?
258. Is er een laatste contentdoorloop uitgevoerd door iemand anders dan de oorspronkelijke schrijver?
259. Zijn alle merknaam-vermeldingen consistent "Trainingskompas", nooit afgekort in nieuwe content?
260. Is content getest op daadwerkelijke apparaten (geen afkapping/overloop op kleine schermen)?
261. Is elke juridische tekst (Privacy, Terms) door de Product Owner geverifieerd als accuraat?
262. Is deze Content-sectie doorlopen vóór elke Store-indiening?


### Play Store (263-294)
263. Is het launcher icon exact conform de brand sheet?
264. Is de adaptive icon-voorgrondlaag correct binnen de veilige zone?
265. Is de Feature Graphic 1024×500px met correcte merktoepassing?
266. Bevatten de screenshots de vastgestelde volgorde en kernboodschappen (Hoofdstuk 5, Deel 17)?
267. Is de Store-titel exact "Trainingskompas"?
268. Is de korte omschrijving binnen de tekenlimiet en gebaseerd op de tagline?
269. Volgt de lange omschrijving de vastgestelde structuur zonder overdreven superlatieven?
270. Is Target SDK conform de actuele Google Play-vereiste?
271. Is Play App Signing geactiveerd?
272. Is de build aangeleverd als Android App Bundle (.aab)?
273. Is de versionCode/versionName correct verhoogd t.o.v. de vorige release?
274. Zijn release notes aanwezig, feitelijk en gebruikersgericht?
275. Is het Data Safety-formulier geverifieerd tegen de daadwerkelijke dataverwerking?
276. Is elke aangevraagde permissie herleidbaar tot een daadwerkelijk gebruikte functie?
277. Zijn er 0 ongebruikte permissies in het manifest?
278. Is de Privacy Policy-link functioneel en actueel?
279. Zijn de Terms of Service (indien van toepassing) actueel?
280. Is de app getest op de minimale ondersteunde Android-versie (13)?
281. Is de app getest op de nieuwste beschikbare Android-versie?
282. Is er 0 bekende kritieke crash bij indiening?
283. Is de content-rating correct ingevuld (leeftijdscategorie, gezondheid/fitness)?
284. Is de app-categorie correct ingesteld (Gezondheid & Fitness)?
285. Is contactinformatie voor support actueel in de Play Console?
286. Is er een testplan voor de verplichte doorlooptijd van closed testing vóór productie-toegang?
287. Is de minimale testersgroep-omvang voor closed testing gehaald (Google Play-vereiste)?
288. Is de Promo Video (indien aanwezig) conform de merktoon?
289. Is elke Play Store-asset getoetst aan de Design Constitution (Hoofdstuk 5)?
290. Is er een archief van alle ingediende Store-assets per versie, voor toekomstige referentie?
291. Is de Store-listing-taal (NL/EN) consistent met de daadwerkelijke app-taal?
292. Is er bevestigd dat geen enkele Store-listing-claim (functiebeschrijving) een niet-bestaande functie beschrijft?
293. Is de volledige Play Store Readiness-sectie (Hoofdstuk 5 Deel 17 + dit hoofdstuk Deel 11) doorlopen?
294. Is deze Play Store-sectie ondertekend door de Product Owner vóór indiening?

### Analytics (295-316)
295. Wordt het gemiddeld aantal tikken per kernactie gemeten (Hoofdstuk 10, Deel 12)?
296. Wordt tijd-tot-workout gemeten?
297. Wordt tijd-tot-AI-advies gemeten en getoetst aan de <3-seconden-norm?
298. Wordt drop-off per flow gevolgd?
299. Wordt onboarding-completion gemeten?
300. Wordt zoekgebruik gevolgd?
301. Worden foutpercentages per scherm gevolgd?
302. Wordt back-navigatie-frequentie per scherm gevolgd (mogelijke informatiehiërarchie-signalen)?
303. Wordt diepte-bereik (niveau 2-schermgebruik) gevolgd?
304. Is er bevestigd dat analytics-verzameling de privacyregels (Hoofdstuk 9, Deel 11) niet schendt?
305. Leidt geen enkele metric-geoptimaliseerde wijziging tot een Golden Rule-schending?
306. Is er een dashboard/overzicht waar deze metrics daadwerkelijk geraadpleegd kunnen worden?
307. Worden AI Acceptance-metrics (opgevolgd vs. genegeerd advies) gevolgd?
308. Wordt Workout Completion-rate gevolgd?
309. Wordt de 80%-quotawaarschuwing-trigger gevolgd zonder gebruikersimpact te meten als "negatief" per definitie?
310. Is er een periodieke (bijv. maandelijkse) review van deze metrics gepland?
311. Wordt een stijgend foutpercentage op een specifieke flow actief gesignaleerd?
312. Is er een vastgesteld proces om een metric-gedreven bevinding te vertalen naar een concrete Story?
313. Zijn de Quality Metrics (Deel 17 van dit hoofdstuk) technisch meetbaar in de huidige architectuur?
314. Is er een duidelijk onderscheid tussen diagnostische metrics en KPI's die daadwerkelijk sturend zijn voor beslissingen?
315. Is bevestigd dat analytics nooit gebruikt worden om AI-gedrag ongecontroleerd bij te sturen (Hoofdstuk 9, Deel 7.3)?
316. Is deze Analytics-sectie doorlopen vóór Production-release?

### Crashvrij (317-336)
317. Is de crash-free rate over de laatste testperiode gemeten?
318. Voldoet de crash-free rate aan de norm uit Deel 17?
319. Is elke gerapporteerde crash geclassificeerd (Kritiek/Hoog/Middel/Laag, Deel 12)?
320. Zijn er 0 onopgeloste Kritieke crashes?
321. Is de ANR-rate (Application Not Responding) gemeten?
322. Voldoet de ANR-rate aan de norm uit Deel 17?
323. Is elke crash tijdens Internal/Closed Testing onderzocht vóór doorstroom naar de volgende fase?
324. Is er een crashanalyse-proces actief tijdens Open Testing (Deel 14)?
325. Is de meest recente crash-geschiedenis herleidbaar (logging aanwezig)?
326. Is er 0 bekende, reproduceerbare crash in de kernflow (trainen, loggen, AI-advies)?
327. Is de trainingsflow specifiek getest op crash-bestendigheid (hoogste-frequentie-gebruik)?
328. Is er een Crash Recovery-scenario (Hoofdstuk 11, Deel 12) functioneel getest — herstelt een sessie na een onverwachte herstart?
329. Gaat bij een crash tijdens een actieve trainingssessie geen gelogde data verloren?
330. Is er een vergelijking van crash-rate tussen deze en de vorige release (geen sluipende achteruitgang)?
331. Is elke Kritieke crash voorzien van een permanente regressietest?
332. Is er 0 crash gerelateerd aan de AI-coach-proxy specifiek?
333. Is er 0 crash gerelateerd aan de offline-synchronisatielogica specifiek?
334. Is er 0 crash gerelateerd aan de wearable-koppeling specifiek?
335. Is de crash-vrije-sessies-norm (Deel 7) via daadwerkelijke meting bevestigd, niet aangenomen?
336. Is deze Crashvrij-sectie doorlopen met actuele productiedata (waar beschikbaar) vóór Gate 8?


### Synchronisatie (337-362)
337. Wordt elke offline gelogde actie correct in de wachtrij geplaatst?
338. Synchroniseert de wachtrij automatisch zodra een verbinding beschikbaar is?
339. Toont de gebruiker altijd hoeveel items nog niet gesynchroniseerd zijn?
340. Is conflictresolutie tussen apparaten functioneel getest?
341. Wordt bij een conflict nooit automatisch overschreven zonder gebruikersbevestiging?
342. Is de conflictresolutie-dialoog getest op daadwerkelijk correcte data-samenvoeging?
343. Blijft de navigatiestructuur ongewijzigd tijdens synchronisatie?
344. Is de synchronisatiestatus (Backup-scherm) altijd actueel?
345. Is er 0 dataverlies geconstateerd bij een offline-naar-online-overgang in testscenario's?
346. Is synchronisatie getest met een gesimuleerd langdurige offline-periode (bijv. 24+ uur)?
347. Is synchronisatie getest met meerdere offline gelogde sessies tegelijk?
348. Is er een handmatige "sync nu"-optie functioneel beschikbaar?
349. Reageert een mislukte synchronisatie met een concrete herstelactie (retry per item/bulk)?
350. Is de synchronisatie-architectuur getest tegen de RLS-beveiliging (geen cross-user-lekken tijdens sync)?
351. Is de synchronisatie-performance (Deel 7) binnen de norm (nooit blokkerend)?
352. Is er een regressietest voor eerder opgeloste synchronisatiebugs?
353. Is de wachtrij-UI (Hoofdstuk 4, Micro-interactie #47) functioneel en actueel?
354. Is synchronisatie getest op zowel Wi-Fi- als mobiele-data-overgangen?
355. Is er bevestigd dat een app-crash tijdens synchronisatie geen corrupte staat achterlaat?
356. Is elke synchronisatiefout server-side gelogd voor toekomstige monitoring?
357. Is de synchronisatielogica getest tegen de bestaande, bekende architectuur (geen ongedocumenteerde afwijking)?
358. Is er een vastgesteld maximum aan hoe lang data offline mag blijven vóór een expliciete waarschuwing?
359. Is synchronisatiegedrag getest in combinatie met een quotalimiet (Abonnement, Deel 11 Hoofdstuk 10)?
360. Is de Offline/Synchronisatie-flow (Hoofdstuk 4, Flow 17-18) end-to-end getest sinds de vorige release?
361. Is er 0 regressie op eerder geverifieerd synchronisatiegedrag?
362. Is deze Synchronisatie-sectie doorlopen vóór Gate 8?

### Offline (363-388)
363. Blijft trainingslogging 100% functioneel zonder verbinding?
364. Blijft de spierherstel-heatmap zichtbaar (laatst berekend) offline?
365. Blijft Coach Chat-geschiedenis leesbaar offline?
366. Genereert geen enkele AI-functie nieuwe output zonder verbinding?
367. Is elke offline-status in de Navigation Map (Hoofdstuk 10, Deel 3.2) correct geverifieerd, niet aangenomen?
368. Wijzigt een offline actie nooit de navigatiestructuur?
369. Is de offline-indicator consistent zichtbaar op elk relevant scherm?
370. Wordt bij verbindingsherstel geen ongevraagde navigatie geforceerd?
371. Verschijnt een offline niet-gegenereerd AI-advies automatisch zodra mogelijk?
372. Werkt Export op lokaal gecachede data ook offline?
373. Is elke permissie-gerelateerde flow getest bij afwezige verbinding?
374. Is Login/Registreren correct gemeld als "vereist verbinding" zonder verwarrende foutmelding?
375. Is de Programmagenerator correct gemeld als "vereist verbinding" voor nieuwe generatie?
376. Blijft een reeds gegenereerd programma volledig leesbaar offline?
377. Is de PWA-shell (sw.js) correct gecached voor offline-toegang tot de basisstructuur?
378. Is getest met een volledige vliegtuigmodus-simulatie op de kernflows?
379. Is getest met een wisselende, instabiele verbinding (aan/uit/aan)?
380. Is er 0 dataverlies geconstateerd tijdens offline-testscenario's?
381. Is de offline-wachtrij-capaciteit getest (werkt het systeem correct bij een groot aantal opgehoopte offline-acties)?
382. Is Golden Rule UX41 (trainingslogging 100% offline) formeel bevestigd, niet aangenomen?
383. Is er een regressietest voor eerder opgeloste offline-bugs?
384. Is de offline-ervaring getest op zowel Android als eventuele toekomstige platformen (iOS via Capacitor, indien relevant)?
385. Is bevestigd dat de offline-gebruikerservaring even snel aanvoelt als online (optimistische UI)?
386. Is Offline Navigation (Hoofdstuk 10, Deel 6) volledig geverifieerd?
387. Is er 0 discrepantie tussen de gedocumenteerde en de daadwerkelijke offline-status per scherm?
388. Is deze Offline-sectie doorlopen vóór Gate 8?

### Wearables (389-412)
389. Is de Fitbit-OAuth-koppeling functioneel getest?
390. Wordt HRV/hartslagdata correct gesynchroniseerd na koppeling?
391. Toont het systeem proactief een melding vóór tokenverval (minimaal 48 uur)?
392. Is het onderscheid tussen "tijdelijk probleem" en "koppeling verlopen" functioneel correct?
393. Blijft handmatige invoer een volwaardig alternatief bij elke wearable-storing?
394. Is loskoppelen functioneel getest?
395. Is de bekende Testing-mode-beperking (wekelijkse tokenvervaldatum) gedocumenteerd en gecommuniceerd?
396. Is er een concreet plan om naar Google Production-verificatie te gaan vóór brede uitrol?
397. Is wearable-data correct gekoppeld aan de dagfactor-berekening?
398. Is er 0 dataverlies bij een mislukte wearable-sync?
399. Is de wearable-statuskaart (Profiel) altijd actueel?
400. Is de wearable-sync-animatie (Hoofdstuk 11, Deel 10) functioneel en performant?
401. Is er een regressietest voor eerder opgeloste wearable-koppelingsbugs?
402. Is de wearable-integratie getest op minimaal twee verschillende Fitbit-accounts (variatie in databeschikbaarheid)?
403. Is de OAuth-scope-aanvraag beperkt tot exact de benodigde data (dataminimalisatie, Deel 10)?
404. Is de wearable-koppelflow (Hoofdstuk 4, Flow 16) end-to-end getest sinds de vorige release?
405. Is bevestigd dat een wearable-storing nooit de kernflow (trainen, loggen) blokkeert?
406. Is de Permission Dialog vóór wearable-koppeling functioneel en begrijpelijk?
407. Is er een testscenario voor een gebruiker die zijn wearable-account elders (bij Fitbit zelf) intrekt?
408. Is de wearable-sync-status correct zichtbaar in zowel Profiel als het Vandaag-scherm?
409. Is er bevestigd dat wearable-data nooit ongevraagd wordt gedeeld met een gym/coach zonder toestemming?
410. Is de toekomstige uitbreiding naar Apple HealthKit/Google Health Connect/Garmin/Whoop/Oura architecturaal voorbereid zonder de huidige Fitbit-flow te breken?
411. Is deze Wearables-sectie doorlopen vóór Gate 8?
412. Is de volledige Production Readiness Review (alle 412 punten) ondertekend door de Product Owner vóór Gate 8?


---

## Deel 16 — Release Gates

Acht poorten, elk met doel, benodigde documentatie, verantwoordelijke, acceptatiecriteria en risico's. Een build kan nooit een gate overslaan.

### Gate 1 — Development
| Veld | Specificatie |
|---|---|
| Doel | Code werkt lokaal, syntax gevalideerd |
| Documentatie | Story-omschrijving |
| Verantwoordelijke | AI Software Engineer |
| Acceptatiecriteria | `node --check` slaagt; geen bekende directe fout |
| Risico's | Onvolledige lokale test verhult een later probleem — gemitigeerd door Gate 2 |

### Gate 2 — Sprint Complete
| Veld | Specificatie |
|---|---|
| Doel | Alle Stories binnen de sprint zijn functioneel afgerond |
| Documentatie | Bijgewerkte CURRENT_STATE.md |
| Verantwoordelijke | AI Software Engineer, akkoord Product Owner |
| Acceptatiecriteria | Volledige `core/release-gate.js`-suite (80 testbestanden, 82 teststappen) slaagt zonder regressie |
| Risico's | Sprint-druk leidt tot overslaan van niet-functionele eisen (accessibility, motion) — gemitigeerd door Deel 4 (Definition of Done, acht categorieën) |

### Gate 3 — Feature Complete
| Veld | Specificatie |
|---|---|
| Doel | De feature voldoet aan alle relevante hoofdstuk-specificaties (Screen/Component/AI/Navigation/Motion, waar van toepassing) |
| Documentatie | Expliciete toetsing aan de relevante Constitution(s) |
| Verantwoordelijke | AI Software Engineer + Product Owner-goedkeuring bij grote impact (Hoofdstuk 9, Deel 1.4) |
| Acceptatiecriteria | Definition of Done (Deel 4) volledig — alle acht categorieën |
| Risico's | Architecturale overlap met bestaande functionaliteit — gemitigeerd door proactieve signalering (Product Principle P9) |

### Gate 4 — Alpha
| Veld | Specificatie |
|---|---|
| Doel | Eerste build op een echt toestel, buiten de directe ontwikkelomgeving |
| Documentatie | Smoke Test-resultaten |
| Verantwoordelijke | Product Owner (exploratory testing, Deel 5) |
| Acceptatiecriteria | Volledige Smoke Test-set geslaagd; installatie en kernflow werken |
| Risico's | Toestel-specifieke bugs die niet in de ontwikkelomgeving zichtbaar zijn — gemitigeerd door Device Matrix (Deel 6) |

### Gate 5 — Internal Testing
| Veld | Specificatie |
|---|---|
| Doel | Bevestiging door de kleine interne testgroep (Deel 12) |
| Documentatie | Bugclassificatie-overzicht |
| Verantwoordelijke | Product Owner + directe betrokkenen |
| Acceptatiecriteria | Exit Criteria Deel 12: 0 Kritieke bugs, 0 onopgeloste Hoge bugs in de kernflow |
| Risico's | Kleine testgroep mist edge cases — gemitigeerd door de gestructureerde testscenario's en de vaste edge-casetestset (Hoofdstuk 9, Deel 5.11) |

### Gate 6 — Closed Testing
| Veld | Specificatie |
|---|---|
| Doel | Bevestiging door de daadwerkelijke doelgroep (ART CrossFit) |
| Documentatie | Verzamelde AI/UX/Performance-feedback (Deel 13) |
| Verantwoordelijke | Product Owner, met input van de testgroep |
| Acceptatiecriteria | Exit Criteria Deel 13: 0 Kritieke bugs, AI Validation geslaagd, minimaal twee weken testperiode |
| Risico's | Feedback die de coach-persoonlijkheid ongecontroleerd zou bijsturen — gemitigeerd door Hoofdstuk 9, Deel 7.3 (feedback is signaalbron, geen automatische bijsturing) |

### Gate 7 — Open Testing
| Veld | Specificatie |
|---|---|
| Doel | Bevestiging op grotere, publieke schaal |
| Documentatie | Play Console-vitals, crashanalyse-overzicht |
| Verantwoordelijke | Product Owner |
| Acceptatiecriteria | Deel 14: crash-free rate binnen norm, geen onopgeloste Kritieke/Hoge bugs of AI-incidenten |
| Risico's | Schaal onthult problemen die bij kleinere groepen niet zichtbaar waren — gemitigeerd door doorlopende monitoring (Deel 17) |

### Gate 8 — Production
| Veld | Specificatie |
|---|---|
| Doel | Algemene beschikbaarheid via de Google Play Store |
| Documentatie | Volledige Production Readiness Review (Deel 15, 412 punten), ondertekend |
| Verantwoordelijke | Product Owner, eindverantwoordelijk (Hoofdstuk 9, Deel 1.3) |
| Acceptatiecriteria | Alle 412 punten uit Deel 15 JA; Play Store Readiness (Deel 11) volledig |
| Risico's | Onomkeerbaarheid van een publieke release — gemitigeerd door de volledige gate-keten ervoor; een rollback-procedure (vergelijkbaar met Hoofdstuk 9, Deel 10.4) blijft ook na Gate 8 beschikbaar |

**Bindende regel:** een build kan nooit gelijktijdig aan twee gates worden getoetst — elke gate wordt volledig doorlopen en gedocumenteerd vóórdat de volgende begint. Een terugval (bijv. een Kritieke bug ontdekt tijdens Gate 6) brengt de build terug naar de gate waar de oorzaak hoort te worden opgelost, niet enkel een lokale patch binnen de huidige gate.

---

## Deel 17 — Quality Metrics

| KPI | Norm | Toelichting |
|---|---|---|
| **Crash Free Rate** | ≥99,5% | Vastgestelde norm dit hoofdstuk; gemeten vanaf Internal Testing, bindend vanaf Gate 7 |
| **ANR Rate** | <0,5% | Vergelijkbaar met platformrichtlijnen voor "Goed"-classificatie in Play Console |
| **App Start Time** | Cold <2 sec, warm <500ms | Deel 7 |
| **Workout Completion** | Gevolgd als trend, geen harde norm (afhankelijk van legitieme redenen voor onderbreking) | Diagnostisch, geen sturend doel op zich (Deel 15, punt 314-eis) |
| **AI Acceptance** (advies opgevolgd vs. genegeerd) | Gevolgd als trend | Nooit gebruikt om de AI te "overtuigender" te maken — enkel diagnostisch (Hoofdstuk 9, Deel 7.3) |
| **User Satisfaction** | 👍/👎-ratio (Hoofdstuk 9, Deel 7) gevolgd per releaseperiode | Trend belangrijker dan een absolute drempel |
| **Retention** | Gevolgd als trend (dag 1/7/30) | Nooit geoptimaliseerd via manipulatieve mechanismen (Product Constitution XX) |
| **Performance** | Zie Deel 7, alle metrics | — |
| **Battery** | Geen doorlopend proces buiten zichtbaar scherm/voorgrond | Hoofdstuk 11, Deel 15 |
| **Synchronisatie** | 0 gerapporteerd dataverlies per releaseperiode | Hardste norm binnen dit Deel — dataverlies is nooit acceptabel, ongeacht frequentie |

**Bindende regel:** elke metric in dit Deel is een diagnostisch instrument (herhaling van Hoofdstuk 10, Deel 12) — geen enkele metric-optimalisatie mag ooit een Golden Rule of Constitution-wet uit Hoofdstuk 3-11 schenden.


---

## Deel 18 — Quality Constitution

Honderd bindende Quality Laws — de samenvatting van dit gehele hoofdstuk, en de officiële kwaliteitsstandaard voor alle toekomstige TrainingKompas-releases. Aanvullend op alle voorgaande Constitutions (Hoofdstuk 3-11). Elke afwijking wordt vastgelegd in de Decision Log, met motivatie en impactanalyse.

**Fundamenten**

**1.** Kwaliteit gaat altijd boven snelheid.

**2.** Geen build zonder volledige regressietest (`core/release-gate.js`).

**3.** Geen release met kritieke bugs, ongeacht releasedruk.

**4.** Elke kwaliteitsnorm in dit Handbook is herleidbaar tot een concreet, eerder hoofdstuk.

**5.** Een release is nooit "goed genoeg" op één dimensie terwijl een andere faalt.

**6.** Kwaliteitsbewaking schaalt met de daadwerkelijke projectomvang — geen overbodige ceremonie.

**7.** Elke feature is pas Done wanneer alle acht Definition of Done-categorieën Done zijn.

**8.** Geen enkele Story start zonder Story Ready te zijn.

**9.** Geen enkele sprint start zonder Sprint Ready te zijn.

**10.** Geen enkele build overslaat een Release Gate.

**Componenten, schermen en navigatie**

**11.** Iedere schermwijziging voldoet aan Hoofdstuk 6 (Screen Design Laws).

**12.** Iedere component voldoet aan Hoofdstuk 7 (Component Library Constitution).

**13.** Iedere navigatiewijziging voldoet aan Hoofdstuk 10 (Navigation Constitution).

**14.** Iedere animatie voldoet aan Hoofdstuk 11 (Motion Constitution).

**15.** Geen enkel scherm wordt toegevoegd zonder toetsing aan de Information Architecture (Hoofdstuk 10, Deel 1).

**16.** Geen enkele component wordt gebouwd zonder eerst te toetsen of een bestaand component volstaat.

**17.** Elke architecturale overlap wordt proactief gesignaleerd vóór bouw.

**18.** Elke workflow heeft een logisch, navigeerbaar einde.

**19.** Geen doodlopende schermen.

**20.** Geen verborgen primaire functionaliteit.

**AI**

**21.** Iedere AI-functie is explainable, zonder uitzondering.

**22.** Iedere AI-functie voldoet aan de AI Behaviour Constitution (Hoofdstuk 8).

**23.** Iedere AI-functie voldoet aan de AI Governance Constitution (Hoofdstuk 9).

**24.** De AI-coach beslist nooit — elk advies heeft een gelijkwaardig alternatief.

**25.** Geen enkele AI-output overschrijdt een van de tien veiligheidsregels.

**26.** Elke AI-wijziging doorloopt de volledige testprocedure vóór release.

**27.** Elke AI-wijziging die een Constitution raakt, wordt vastgelegd in de Decision Log.

**28.** Confidence wordt altijd getoond bij een inschatting, nooit verborgen.

**29.** Blessurerisico-signalering heeft de hoogste informatieprioriteit.

**30.** Een mens behoudt te allen tijde de mogelijkheid om AI-gedrag te herzien.

**Toegankelijkheid**

**31.** Iedere schermwijziging voldoet aan de accessibility-eisen van Hoofdstuk 3, 4, 5, 10 en 11.

**32.** WCAG AA is het minimumniveau, nooit het streefniveau.

**33.** Reduce Motion wordt altijd gerespecteerd.

**34.** Geen enkele animatie overschrijdt de vestibulaire of epilepsie-veiligheidsgrens.

**35.** Kleur is nooit de enige informatiedrager.

**36.** Elk interactief element heeft een betekenisvol toegankelijk label.

**37.** Touch-targets zijn systeembreed minimaal 48dp.

**38.** Elke build wordt met een actieve schermlezer getest vóór Closed Testing.

**39.** Haptiek is systeembreed uitschakelbaar en nooit de enige feedbackvorm.

**40.** Toegankelijkheid is een basisverplichting bij elke schermtoevoeging, geen latere toevoeging.

**Performance en stabiliteit**

**41.** Cold start is korter dan 2 seconden op een representatief middenklasse-toestel.

**42.** Elke tik-feedback reageert binnen 100ms.

**43.** Set-logging reageert optimistisch, ongeacht netwerklatentie.

**44.** Crash-free rate is minimaal 99,5% vanaf Open Testing.

**45.** Geen enkel proces blijft actief buiten het zichtbare scherm of de voorgrond.

**46.** Elke animatie streeft naar 60fps, nooit structureel onder 30fps.

**47.** Performance wordt gemeten op een representatief toestel, nooit uitsluitend op het snelste ontwikkeltoestel.

**48.** Een gemeten performance-regressie wordt vóór release opgelost, niet uitgesteld.

**49.** Batterijverbruik van doorlopende animaties wordt gemeten, niet aangenomen.

**50.** Elke Kritieke crash krijgt een permanente regressietest.

**Beveiliging en privacy**

**51.** RLS is actief op elke tabel met persoonlijke data, zonder uitzondering.

**52.** Geen enkele API-sleutel is client-side blootgesteld.

**53.** Elke Netlify Function is JWT-geverifieerd vóór productiegebruik.

**54.** Een kritieke security-bevinding blokkeert onvoorwaardelijk elke release.

**55.** Dataminimalisatie geldt bij elke nieuwe databron — niets wordt verzameld zonder functioneel doel.

**56.** Accountverwijdering verwijdert ook elke afgeleide AI-context.

**57.** Elke permissie wordt gevraagd op het moment van functionele noodzaak, nooit vooraf.

**58.** Het Data Safety-formulier komt exact overeen met de daadwerkelijke dataverwerking.

**59.** Het Privacy-scherm is inhoudelijk actueel bij elke datastructuurwijziging.

**60.** Elke rolwijziging vereist bevestiging en verschijnt in een onveranderlijk audit-log.

**Testen**

**61.** Unit Tests en Regression Tests zijn verplicht en geautomatiseerd bij elke wijziging.

**62.** Elke AI-wijziging doorloopt de vaste edge-casetestset.

**63.** Elke nieuwe component krijgt een geïsoleerd testscenario tegen zijn specificatie.

**64.** Offline-gedrag wordt getest met een daadwerkelijke vliegtuigmodus-simulatie, niet aangenomen.

**65.** Wearable-koppeling wordt periodiek handmatig geverifieerd.

**66.** Exploratory testing door de Product Owner is verplicht vóór Internal Testing.

**67.** User Acceptance Testing gebeurt met de daadwerkelijke doelgroep, niet enkel intern.

**68.** End-to-end tests dekken elke kernflow vóór een grote release.

**69.** Een Smoke Test-set wordt binnen enkele minuten doorlopen na elke deploy.

**70.** Geen enkele testfase wordt overgeslagen om tijd te besparen.

**Content en merk**

**71.** Geen enkele tekst in productie is placeholder- of lorem-ipsum-content.

**72.** De merknaam "Trainingskompas" is nooit afgekort in nieuwe content.

**73.** Elke foutmelding is in gewone, begrijpelijke taal geformuleerd.

**74.** Content wordt getoetst op culturele en inclusieve toon.

**75.** Geen enkele zichtbare productcontent verwijst naar een nog niet gebouwde functie.

**76.** Release notes zijn feitelijk en gebruikersgericht, zonder technisch jargon.

**77.** Elke celebratie-tekst is ingetogen en oprecht.

**78.** Elke motiverende tekst is feitelijk gefundeerd.

**79.** Juridische teksten worden door de Product Owner geverifieerd vóór publicatie.

**80.** Content wordt op daadwerkelijke apparaten getest, niet enkel gelezen op een ontwerptoestel.

**Play Store en release**

**81.** Elke Play Store-asset is getoetst aan de Design Constitution.

**82.** Target SDK voldoet altijd aan de actuele Google Play-vereiste.

**83.** Elke build wordt aangeleverd als Android App Bundle.

**84.** Versiebump is verplicht bij elke release, zonder uitzondering.

**85.** Elke Store-indiening doorloopt de volledige Play Store Readiness-toetsing, niet enkel de eerste.

**86.** Closed Testing duurt minimaal de vereiste periode met een representatieve testersgroep.

**87.** Doorstroom naar Production vereist volledige, ondertekende Production Readiness Review.

**88.** Een release kan nooit twee gates tegelijk overslaan.

**89.** Een teruggevallen build keert terug naar de gate waar de oorzaak hoort te worden opgelost.

**90.** Rollback blijft mogelijk, ook na Production-release.

**Governance en discipline**

**91.** Elke afwijking van een Constitution wordt vastgelegd in de Decision Log met motivatie en impactanalyse.

**92.** De Product Owner is eindverantwoordelijk voor elke releasebeslissing.

**93.** Geen enkele kwaliteitsnorm wordt versoepeld onder tijdsdruk zonder expliciete, gedocumenteerde beslissing.

**94.** Metrics zijn diagnostisch — geen enkele metric-optimalisatie schendt ooit een Golden Rule.

**95.** Feedback is een signaalbron, nooit automatische, ongecontroleerde bijsturing.

**96.** Elke grote productuitbreiding (nieuwe Fase) triggert een herziening van dit hoofdstuk.

**97.** Dit hoofdstuk is de enige, officiële kwaliteitsstandaard — geen tegenstrijdige, informele praktijk blijft naast dit hoofdstuk bestaan.

**98.** Elke checklist in dit hoofdstuk wordt daadwerkelijk doorlopen, nooit stilzwijgend als "vanzelfsprekend" overgeslagen.

**99.** Kwaliteitsbewaking is nooit theater — elke controle in dit hoofdstuk bestaat omdat hij een concreet, herleidbaar risico afdekt.

**100.** Elke afwijking van deze honderd wetten wordt expliciet vastgelegd in de Decision Log, met motivatie en impactanalyse — dezelfde bindende werkwijze als alle voorgaande Constitutions in dit Handbook voorschrijven.

---

*Einde Hoofdstuk 12. Dit hoofdstuk vormt samen met Hoofdstuk 1 t/m 11 het volledige, verifieerbare fundament van het TrainingKompas Premium Development Handbook. Waar de voorgaande hoofdstukken vastlegden wát TrainingKompas is en hoe het zich gedraagt, legt dit hoofdstuk vast hoe bewezen wordt dat die belofte bij elke release daadwerkelijk wordt waargemaakt — van de eerste regel code tot een build die gebruikers in de Google Play Store bereikt. Geen enkele release verlaat Gate 8 zonder dat elk voorgaand hoofdstuk, via de checklists en gates in dit hoofdstuk, aantoonbaar is nageleefd.*

