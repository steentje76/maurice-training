# Roadmap — Trainingskompas

> Herzien 1 augustus 2026 (DEC-010) — zie DECISION_LOG.md voor de volledige redenering achter deze herprioritering.

## Nu (Fase 1/2 — stabilisatie + multi-user, actieve prioriteit)
**Stabilisatie (grotendeels afgerond 1 augustus 2026, v3.3.9–v3.3.25):**
- [x] Kritieke security-fixes (coach.js JWT-verificatie, RLS-audit alle tabellen)
- [x] XSS-remediatie (fase 1 + 2, volledig)
- [x] Dubbel-klik-bescherming op alle schrijf-acties
- [x] v333 3-laags zichtbaarheidsmodel (personal/gym/global) — schema, RLS én UI-laag compleet
- [x] Apparatuur-catalogus (los van equipment_types)
- [x] AI-programmagenerator: periodisering afgedwongen in code, sport-context/PR's/trainingshistorie in de prompt
- [x] sw.js network-first-navigatie verifiëren (Sprint 1, 2 augustus 2026 — bevestigd via code-inspectie, geen wijziging nodig)
- [ ] Per-user profielscheiding testen
- [ ] Offline sync queue (IndexedDB) — gebouwd, nog niet functioneel bevestigd
- [x] Accessibility-fundament (aria/focus-management/skip-link) — Sprint 1, toegepast op bestaande kernschermen
- [x] Motion-tokenfundament + `prefers-reduced-motion` — Sprint 1
- [x] Dark mode-tokenfundament + automatische detectie — Sprint 1 (nog geen volledige restyle, zie Branding hieronder)

**Nieuw toegevoegd (DEC-010, 1 augustus 2026):**
- [x] **Onboarding-workflow nieuwe atleten** — profiel + doelen instellen bij eerste gebruik. Gebouwd in Sprint 2 (2 augustus 2026, v3.3.27): 9-staps wizard, verschijnt eenmalig na login. Nog niet op een echt device getest door Product Owner.
- [x] **Doelen (7.1) en persoonlijke Challenges (7.2)** — Sprint 3 (2 augustus 2026, v3.3.30): 9 doeltypes met SMART-check, 5 data-onderbouwde Challenges, Dashboard-/Profiel-integratie, AI-coach-koppeling per doel. **Nog niet functioneel gevalideerd** (migratie v337 nog uit te voeren). Zie Sprintrapporten/Sprint3_Rapport.md.
- [ ] **Gym-/Team-challenges** — expliciet niet gebouwd in Sprint 3 (DEC-018): vereist cross-user aggregatie-infrastructuur die nog niet bestaat.
- [ ] **"Perfecte trainingsweek"-challenge** — expliciet niet gebouwd in Sprint 3 (DEC-018): geen bestaande, eenduidige definitie van "perfect" — vereist eerst input van de Product Owner over wat dit precies moet betekenen, vóór het gebouwd wordt.
- [ ] **Wearables-uitbreiding** — Apple HealthKit, Google Health Connect, Garmin/Whoop/Oura, naast de bestaande Fitbit/Google Health-koppeling.
- [ ] **HYROX race-splits en triathlon-brick** — was expliciet uitgesteld, nu geprioriteerd.
- [ ] **Menstruatiecyclus-tracking** — was uitgesteld; `cyclus_fase`-veld bestaat al in hrv_log, uitbreiding tot volwaardige tracking nog te bouwen.
- [ ] Gebruikersbeheerinterface — Team-scherm (ledenlijst, rollen, wijzigingslog) al gebouwd; her-beoordelen of dit punt hiermee afgerond is.
- [ ] Gym-breed leespad via exercises.gym_id — al gerealiseerd via v331/v333; dit vinkje kan waarschijnlijk af, ter bevestiging bij volgende CURRENT_STATE-update.

## Intelligentielaag (Sprint 19–23, augustus 2026 — gebouwd)
- [x] **Relationship Discovery Engine** (`relationship.v1`, v4.41.0) — verbanden zijn geen vaste lijst meer. De engine inventariseert welke dagreeksen er werkelijk zijn, vormt daaruit kandidaatparen, toetst spreiding en datakwaliteit, classificeert en rangschikt. Zie docs/RELATIONSHIP_ENGINE.md.
- [x] **Verbanden-experience** (v4.42.0) — eigen scherm onder Lichaam met filters per domein, drie secties (gevonden patronen / onderzocht-geen-patroon / nog te weinig data), periodekeuze en een transparantieblok "Hoe is dit bepaald?".
- [x] **Unified Athlete Intelligence** (`athlete.v1`, `load.v1`, `performance_index.v1`, v4.43.0) — dagbeeld per modaliteit, weekbelasting, frequentie, monotonie, acuut/chronisch en een prestatie-index ten opzichte van het eigen niveau per oefening. Multi-sport architectonisch voorbereid via het bestaande SportDefinitionCore.
- [x] **Coach Intelligence** (`coach_intelligence.v1`, v4.44.0) — de AI krijgt uitsluitend gevalideerde uitkomsten, maximaal drie geprioriteerde inzichten, en kan geen relatie zelf berekenen of er advies uit afleiden.
- [x] **ACWR (acuut:chronisch)** — stond sinds Blueprint v6 op de wensenlijst; nu berekend in AthleteCore, bewust zonder grenswaarde of oordeel (dat hoort in de Decision Engine).
- [x] **Confidence scoring** — stond sinds Blueprint v6 op de wensenlijst; betrouwbaarheid staat nu apart van sterkte in elk relationship.v1-record.

**Geblokkeerd op data, niet op code:**
- [ ] **Duur per sessie opslaan** — zonder duur is er geen gezamenlijke trainingsbelasting over kracht en cardio heen (sessie-RPE × duur). `AthleteCore.unifiedLoad` levert daarom bewust `null` met `ontbreekt:['duur_per_sessie']`. Dit is de kleinste wijziging met de grootste opbrengst voor de intelligentielaag.
- [ ] **Omgevingsdata (Open-Meteo)** — temperatuur, luchtvochtigheid en wind staan al in het variabelenregister op `beschikbaarheid: 'toekomstig'`. Zodra er een bron is, verschijnen de kandidaten vanzelf.
- [ ] **Rustduur tussen sets opslaan** — idem; staat in het register, heeft nog geen bron.
- [ ] **Meer dagen met training én HRV én slaap** — de correlatiemotor heeft 30 vergelijkbare dagen nodig. Dit is geen bouwtaak maar een meettaak.

## Branding (nieuw, DEC-010 — loopt parallel aan Fase 1/2/3, niet pas Fase 4)
- [ ] **Dynamische gym-branding** — Trainingskompas blijft de basis-experience; gym-huisstijl is een skin bovenop, geen vervanging. Volledige naam "Trainingskompas" moet altijd zichtbaar blijven (zie docs/Brand/BRAND_IDENTITY.md). *KOMPAS-afkorting op login-/dashboardscherm al gecorrigeerd in Sprint 2 (2 aug 2026) — de per-gym-skin-architectuur zelf (Fase 4) is nog niet gebouwd.*
- [x] Merkidentiteit vastgesteld: logo, kleurenpalet (`#0B1D2A`/`#0E3B4A`/`#00B894`), Poppins-typografie — zie docs/Brand/BRAND_IDENTITY.md. Vervangt de placeholder-stijl (Barlow Condensed/cyaan) uit Blueprint.md. **Doorgevoerd in Sprint 2 (2 augustus 2026, v3.3.27)** — kleuren/font app-breed via bestaande design-tokens; semantische kleuren (waarschuwing/foutmelding/grafiek) bewust ongewijzigd gelaten.
- [ ] **Later — experience-motor voor leden** (na de gym-brede branding): individuele leden passen zelf hun look-and-feel aan, naar analogie van wat de Product Owner "radioplanner" noemt. Architectuur nog niet uitgewerkt — eerste stap is de gym-brede branding (hierboven) afronden.

## Fase 3 — Coach dashboard + Social/competitief (actief op te pakken, niet wachten op Fase 2-afronding)
- Coach-rol per gym_id, programma's toewijzen, coach-notities, AI-coach-voor-de-coach.
- **Social/competitief (DEC-008, bevestigd):** concreet gevraagd door leden/coaches ART CrossFit. Hoort hier thuis omdat leaderboards/teams de gym/klasse-structuur uit deze fase nodig hebben. Vorm (leaderboards / teams / badges / combinatie) nog te scopen — eerste stap: kort met ART CrossFit ophalen wat men precies bedoelt met "behoefte", vóór er Stories van gemaakt worden. Per DEC-010 nu actief te prioriteren, niet af te wachten tot Fase 2 volledig klaar is.

## Fase 4 — White-label / sportschoolbeheer
Dynamische branding uit gyms-tabel (zie "Branding" hierboven voor de herziene invulling — skin, geen vervanging), ledenadministratie, lesrooster (architectuur al vastgelegd: vaste_training → class_schedule → class_instance → enrollments, hergebruikt bestaande check-in-machinerie), owner dashboard, meerdere vestigingen.

## Fase 5 — Commercieel + Play Store
Quota-handhaving, feature-blocking, Mollie-betalingen (individueel + gym), creditpack-aankoop. Google Play via TWA/Bubblewrap (assetlinks.json, gesloten testronde 2+ weken), Apple via Capacitor. Privacy policy/voorwaarden NL/EN, Data Safety-formulier.

> Volgorde 3/4/5 ligt niet vast — Fase 5 kan vóór 3/4 komen, afhankelijk van prioriteit.

## Later — op de radar (bewust nog niet gepland)
- Sport-specifieke AI-context: buildCtx() splitsen in generieke basis + sport-specifieke blokken (voorstel 7 sporten: kracht, bodybuilding, crossfit, hyrox, hardlopen, triathlon, zwemmen) — **wacht op bevestiging Product Owner**
- Voeding
- Omgevingsdata (Open-Meteo, lat/lon + tijdstip in IndexedDB)
- Multi-AI provider (Claude default, Mistral eerste uitbreiding)
- AFAS-koppeling, meertaligheid — backlog

## Uit Blueprint v6 — losse ideeën die nog bruikbaar zijn (rest v6 afgewezen, zie DECISION_LOG DEC-003)
- [x] ACWR (Acute:Chronic Workload Ratio) — gebouwd in Sprint 21 (v4.43.0), zonder grenswaarde
- PR-categorisatie
- [x] Confidence scoring — gebouwd in Sprint 19 (v4.41.0), apart van sterkte
- Plateau-detectie
