# Roadmap — Maurice Training Coach

## Nu (Fase 2 — multi-user voorbereiding, deels gebouwd)
- [x] Supabase Auth + RLS (12 juli 2026)
- [x] Rollen/entitlements-schema voorbereid (migratie_v322)
- [x] RLS op resterende kritieke tabellen (31 juli 2026)
- [ ] sw.js network-first-navigatie verifiëren
- [ ] Per-user profielscheiding testen
- [ ] Gebruikersbeheerinterface
- [ ] Gym-breed leespad via exercises.gym_id
- [ ] Offline sync queue (IndexedDB)

## Daarna (Fase 5 wordt vóór Fase 3/4 overwogen — volgorde afhankelijk van prioriteit)
**Fase 5 — Commercieel + Play Store**
Quota-handhaving, feature-blocking, Mollie-betalingen (individueel + gym), creditpack-aankoop. Google Play via TWA/Bubblewrap (assetlinks.json, gesloten testronde 2+ weken), Apple via Capacitor. Privacy policy/voorwaarden NL/EN, Data Safety-formulier.

**Fase 3 — Coach dashboard**
Coach-rol per gym_id, programma's toewijzen, coach-notities, AI-coach-voor-de-coach.

**Fase 4 — White-label / sportschoolbeheer**
Dynamische branding uit gyms-tabel (één app, branding na login), ledenadministratie, lesrooster (architectuur al vastgelegd: vaste_training → class_schedule → class_instance → enrollments, hergebruikt bestaande check-in-machinerie), owner dashboard, meerdere vestigingen.

## Later — op de radar (bewust nog niet gepland)
- Sport-specifieke AI-context: buildCtx() splitsen in generieke basis + sport-specifieke blokken (voorstel 7 sporten: kracht, bodybuilding, crossfit, hyrox, hardlopen, triathlon, zwemmen) — **wacht op bevestiging Product Owner**
- Wearables (Apple HealthKit, Google Health Connect, Garmin/Whoop/Oura) — na Fase 2
- Voeding
- Omgevingsdata (Open-Meteo, lat/lon + tijdstip in IndexedDB)
- HYROX race-splits en triathlon-brick — expliciet uitgesteld
- Menstruatiecyclus-tracking — uitgesteld
- Social/competitief (teams, leaderboards, badges) — eerder afgewezen ("AI-coach, geen speeltuin"), later heropend — **verdient bewust ja/nee-besluit, geen automatische heropname**
- Multi-AI provider (Claude default, Mistral eerste uitbreiding)
- AFAS-koppeling, meertaligheid — backlog
- Appnaam definitief kiezen (richting: "sport + zelfstandig naamwoord")

## Uit Blueprint v6 — losse ideeën die nog bruikbaar zijn (rest v6 afgewezen, zie DECISION_LOG DEC-003)
- ACWR (Acute:Chronic Workload Ratio)
- PR-categorisatie
- Confidence scoring
- Plateau-detectie
