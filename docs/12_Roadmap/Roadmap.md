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
- [ ] **Onboarding-workflow nieuwe atleten** — profiel + doelen instellen bij eerste gebruik. Ontbrak volledig; nu expliciet gepland vóórdat gym-brede ledeninstroom (Fase 3-4) relevant wordt.
- [ ] **Wearables-uitbreiding** — Apple HealthKit, Google Health Connect, Garmin/Whoop/Oura, naast de bestaande Fitbit/Google Health-koppeling.
- [ ] **HYROX race-splits en triathlon-brick** — was expliciet uitgesteld, nu geprioriteerd.
- [ ] **Menstruatiecyclus-tracking** — was uitgesteld; `cyclus_fase`-veld bestaat al in hrv_log, uitbreiding tot volwaardige tracking nog te bouwen.
- [ ] Gebruikersbeheerinterface — Team-scherm (ledenlijst, rollen, wijzigingslog) al gebouwd; her-beoordelen of dit punt hiermee afgerond is.
- [ ] Gym-breed leespad via exercises.gym_id — al gerealiseerd via v331/v333; dit vinkje kan waarschijnlijk af, ter bevestiging bij volgende CURRENT_STATE-update.

## Branding (nieuw, DEC-010 — loopt parallel aan Fase 1/2/3, niet pas Fase 4)
- [ ] **Dynamische gym-branding** — Trainingskompas blijft de basis-experience; gym-huisstijl is een skin bovenop, geen vervanging. Volledige naam "Trainingskompas" moet altijd zichtbaar blijven (zie docs/Brand/BRAND_IDENTITY.md) — herziet de bestaande "KOMPAS"-afkorting in krappe UI-plekken.
- [ ] Merkidentiteit vastgesteld: logo, kleurenpalet (`#0B1D2A`/`#0E3B4A`/`#00B894`), Poppins-typografie — zie docs/Brand/BRAND_IDENTITY.md. Vervangt de placeholder-stijl (Barlow Condensed/cyaan) uit Blueprint.md.
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
- ACWR (Acute:Chronic Workload Ratio)
- PR-categorisatie
- Confidence scoring
- Plateau-detectie
