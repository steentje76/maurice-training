# PRODUCT_RESET_REPORT — AI Performance Coach / Maurice Training Coach

Status: concept v3 — bijgewerkt 31 juli 2026 op basis van de actuele CONTEXT_NIEUW_PROJECT.md (stand v3.2.2), die de eerdere repo-export (v3.0.6.2, 29 juli) en de aannames uit v1/v2 van dit rapport overtreft. Dit is nu de meest betrouwbare bron; onderdelen met [nog aanvullen] zijn de enige resterende open punten.

## Wat dit rapport corrigeert ten opzichte van v2
- Actuele versie is **v3.2.2**, niet v3.0.6.2 — het project is in twee dagen meerdere releases verder.
- **RLS-status is volledig opgehelderd:** sinds v320/v321/v322 (12 juli) staat RLS aan met policies op `auth.uid() = user_id`, inclusief een TEXT→UUID-fix op vijf tabellen. De 5 tabellen die op 31 juli als kritiek naar voren kwamen (`users`, `exercises`, `gyms`, `equipment_types`, `exercise_equipment`) stonden hier los van — nieuwere/aparte tabellen, nu ook gefixt.
- **Blueprint v6 (26 hoofdstukken) is door de Product Owner al expliciet afgewezen** als te zwaar voor dit solo-project. Alleen losse ideeën eruit (ACWR, PR-categorisatie, confidence scoring, plateau-detectie) zijn nog bruikbaar. Dit heeft directe gevolgen voor hóe zwaar Project OS zelf op dit project moet worden toegepast — zie Prioriteiten en de openstaande vraag onderaan.
- Er bestaat al een **volwassen, informele werkwijze** (zie hieronder) die in de praktijk al veel doet van wat Project OS beoogt.

## Huidige situatie
AI-ondersteunde CrossFit-trainingsapp (PWA) voor Maurice, met bewuste koers richting een multi-user, white-label platform voor sportscholen (commerciële subscripties via Mollie in Fase 5). Vanaf het begin bewust **solo-project-schaal** gehouden: één HTML-bestand, geen framework, geen enterprise-governance.

**Stack:** vanilla JS PWA → Netlify (hosting + auto-deploy) → GitHub (`steentje76/maurice-training`) → Supabase (Postgres + PostgREST + RLS) → Claude Sonnet, server-side via Netlify Function (`netlify/functions/coach.js` — API-key niet meer client-side). Toekomstige distributie via Capacitor (iOS) en TWA/Bubblewrap (Android) — wrapping, geen rewrite.

## Werkende functionaliteit (v3.2.2)
Naast alles uit v3.0.6.2 (trainingslogging, cardio, supersets, plate calculator, AI-coach, profiel, stats, logboek):
- AI-programmagenerator (per-week generatie i.v.m. Netlify-timeouts, atleetprofiel in prompt, kalendergebaseerde planning).
- Pre-training coach check-in: HRV/rusthartslag/slaap/stemming/pijn → dagfactor + per-spiergroep herstel, met AI-uitleg en expliciete bevestiging vóór belastingsaanpassing.
- Gewichtsuggestie via Brzycki-formule.
- "Route 2" / `vaste_trainingen`: dynamisch N-vaste-trainingen i.p.v. hardgecodeerd A/B, least-recently-done afwisseling.
- Ratiofactor-motor (standaard + zelflerend) en dagfactor-motor + cold-start-predictor voor nieuwe oefeningen.
- Programma-adherence tracking, RPE-delta-analyse, herberekening resterende weken.

## Gebruikerswaarde
[ongewijzigd — zie v2: automatiseert/onderbouwt trainingsbeslissingen met leeftijdscorrectie en concreet peakdoel]

## Problemen
1. **(Opgelost 31-07-2026)** RLS op `users`, `exercises`, `gyms`, `equipment_types`, `exercise_equipment`.
2. **(Opgelost 01-08-2026 — Story 1)** sw.js was cache-first i.p.v. network-first voor navigatie — omgezet, functioneel bevestigd door Product Owner.
3. **(Opgelost 01-08-2026 — Story 2)** Per-user scheiding van atleetprofiel bleek een echte bug: `atleet_profiel`-writes faalden stil door ontbrekende `user_id` (NOT NULL, geen default). Gefixt, functioneel bevestigd; `user_id` bleek bovendien al de primary key, dus geen aanvullende constraint nodig.
4. **Geen gebruikersbeheerinterface.**
5. **Governance-vraag:** Project OS v1.3 brengt een vrij uitgebreid governance-apparaat mee (ADR's, Project Health Check, Product Owner Dashboard, PROJECT_OS_RULES). Dat staat op gespannen voet met de expliciete, eerder gemaakte keuze om enterprise-blueprintstructuren af te wijzen voor dit solo-project. **Beantwoord: Optie B (Middenweg) gekozen, zie DECISION_LOG DEC-005.**
6. Appnaam nog niet definitief (negen namen geprobeerd/bezet; richting "sport + zelfstandig naamwoord").
7. Social/competitief-koers (teams, leaderboards) eerder afgewezen ("AI-coach, geen speeltuin"), later heropend ter discussie — nog geen besluit.
8. **(Opgelost 01-08-2026)** `equipment_types`/`exercise_equipment` waren niet gedocumenteerd — nu vastgelegd in Blueprint.md: machine-instellingen per oefening, `gym_id` al vooruitgebouwd op Fase 4.

## Technische analyse
- **Architectuur:** bewust simpel gehouden; migratie naar file-split of ander taalplatform is expliciet uitgesteld tot ná Fase 2, een bewuste, herhaaldelijk bevestigde keuze — geen technische schuld die "toevallig" is blijven liggen.
- **Rollen/entitlements (migratie_v322):** drie assen — `gym_role`-hiërarchie (lid/coach/manager/owner), systeemrollen (tester/support/developer), feature-entitlements via `plan_features` met metered quota (`ai_coach`, `programma_generator`), creditpacks, losse Mollie-klantprofielen voor individuen vs. gyms. **Dit is schema-voorbereiding — handhaving volgt pas in Fase 5.** Verklaart nu volledig waarom `credit_packs`, `discounts`, `plan_features` etc. al in het schema stonden zonder dat er al een betaalflow is.
- **Codekwaliteit:** teststrategie is volwassen — `logic_tests.js` bevat 102+ zelfstandige tests (geen DOM/imports), aangevuld met Playwright e2e lokaal na oplevering.
- **Werkwijze (al bestaand, informeel):** `view`/`grep -n` lokaliseren → `str_replace` met exacte context → `node --check` → volledige testrun → oplevering. Versiebump per release (bestandsnaam + sw.js-cachenaam). SQL-migraties altijd vóór app-upload, idempotent (`ON CONFLICT DO UPDATE`, `IF NOT EXISTS`), nullable nieuwe kolommen. Eerst analyseren, dan verbeterpunten, dan één implementatieplan, dan bouwen. Features pas "klaar" na volledige CRUD-check. **Dit dekt een groot deel van wat Project OS hoofdstuk 7 (ontwikkelproces) beoogt — al in de praktijk aanwezig, alleen niet in Project OS-vorm/-taal.**

## UX-analyse
[nog aanvullen — ongewijzigd vanuit v2]

## Sterke punten
- Zeer volwassen functionaliteit en werkwijze voor een solo-project — dit is niet een project dat "vanaf nul" gedisciplineerd moet worden, eerder één dat zijn bestaande discipline in Project OS-vorm moet gieten.
- Bewuste, herhaaldelijk herbevestigde scope-keuzes (geen premature multi-language rewrite, geen enterprise-governance, features expliciet uitgesteld i.p.v. half gebouwd).
- Sterke testdiscipline (102+ unit tests + e2e).
- Duidelijke, scherpe productvisie (v3.1: AI-first personal excellence vóór multi-user).

## Te behouden onderdelen
- Alles uit v2, plus: de bestaande, informele werkwijze zelf (view→str_replace→test→release) — dit wordt de basis voor `docs/Prompts/CLAUDE_SOFTWARE_ENGINEER_START.md` voor dít project, niet vervangen door een generiek sjabloon.
- De bewuste "nog niet bouwen"-beslissingen (multi-AI provider, wearables, voeding, HYROX-splits, menstruatiecyclus-tracking, social) horen direct in `docs/12_Roadmap/`, niet verloren laten gaan.

## Te verbeteren onderdelen
- sw.js network-first-navigatie verifiëren.
- Per-user profielscheiding testen (nu dat Auth/RLS actief zijn).
- [opgelost 01-08-2026: equipment_types/exercise_equipment documenteren] — overige RLS-dekking op de resterende ~25 tabellen nog één keer te bevestigen (buiten scope van Sprint 1)

## Te verwijderen onderdelen
[ongewijzigd vanuit v2 — Edna training, oude versies naar archive/]

## Migratieadvies
**Verbeteren, en léég — bewust licht.** Gezien de expliciete afwijzing van enterprise-governance voor dit project, is het advies om Project OS v1.3 hier **niet** in volle omvang toe te passen. Zie de open vraag hieronder voor het te kiezen profiel.

## Prioriteiten
1. **Open vraag — governance-niveau voor dit project (Product Owner-besluit):**
   Optie A — **Lightweight**: alleen Product Book, CURRENT_STATE.md, Stories/Sprints, Roadmap. Geen ADR's, geen Project Health Check, geen Product Owner Dashboard-ceremonie, geen PROJECT_OS_RULES als apart document (de kernregels blijven impliciet gelden, maar worden niet als formeel document opgelegd).
   Optie B — **Middenweg**: bovenstaand + wél DECISION_LOG.md voor de grote koerskeuzes (die worden nu al informeel gemaakt en zijn het waard om vast te leggen, zoals de social/competitief-afweging), maar geen ADR-per-technische-keuze.
   Optie C — **Volledig Project OS v1.3**, inclusief ADR's en Health Checks.
   **Advies: Optie B** — sluit aan bij de bestaande discipline zonder de al afgewezen zwaarte terug te brengen.
2. `PROJECTPLAN_AI_Performance_Coach_v3.1.md` → basis voor `Product_Book.md`; `PROJECTPLAN_APP.md`/CONTEXT_NIEUW_PROJECT.md → basis voor `docs/02_Blueprints/`; Blueprint v6 → alleen de genoemde losse ideeën overnemen, rest laten vervallen.
3. Bestaande migratiebestanden → `docs/02_Blueprints/migraties/` (patroon behouden, alleen locatie verandert).
4. Alle "op de radar"-punten (wearables, multi-AI, voeding, omgevingsdata, HYROX/triathlon, menstruatiecyclus, social, AFAS, meertaligheid, appnaam-opties) → `docs/12_Roadmap/Roadmap.md`, zodat ze niet alsnog kwijtraken tussen documenten.
5. sw.js- en profielscheiding-verificatie als eerste twee Stories.
6. Edna training-project opruimen.
7. PROJECT_KICKOFF.md en CURRENT_STATE.md invullen zodra punt 1 beantwoord is.
