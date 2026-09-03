# DECISION_LOG — Maurice Training Coach

> Alleen grote koerskeuzes (geen ADR's per technische keuze — governance-niveau B).

## DEC-001
- Datum: 12 juli 2026
- Beslissing: Supabase Auth + RLS geactiveerd, policies verscherpt naar `auth.uid() = user_id` (migratie v320/v321).
- Reden: noodzakelijke stap richting Fase 2 (multi-user voorbereiding).
- Alternatieven: geen serieus alternatief — vereiste stap voor multi-user.
- Impact: bestaande data succesvol geclaimd naar echt account, geen dataverlies. TEXT→UUID-fix nodig op vijf tabellen (user_id-kolom).
- Verantwoordelijke: Maurice

## DEC-002
- Datum: 12 juli 2026
- Beslissing: Rollen/entitlements-schema aangelegd (migratie_v322: gym_role-hiërarchie, systeemrollen, plan_features, credit_packs, discounts), maar handhaving uitgesteld naar Fase 5.
- Reden: schema nu klaarzetten voorkomt latere, pijnlijkere migratie; vroege handhaving is niet nodig zolang het project single-user is.
- Alternatieven: schema pas in Fase 5 bouwen (afgewezen — grotere migratie-impact later).
- Impact: tabellen als credit_packs/plan_features bestaan al zonder actieve betaalflow — geen verwarring, mits gedocumenteerd (zie Blueprint.md).
- Verantwoordelijke: Maurice

## DEC-003
- Datum: [vóór 31 juli 2026, exacte datum nog aan te vullen]
- Beslissing: Blueprint v6 (enterprise-governance: ADR's, C4-diagrammen, meerdere-engineers-schaal) afgewezen als projectstandaard.
- Reden: schaal past niet bij een solo-project met één ontwikkelaar/AI.
- Alternatieven: losse bruikbare ideeën (ACWR, PR-categorisatie, confidence scoring, plateau-detectie) apart overnemen zonder de volledige structuur.
- Impact: bepaalt ook het governance-niveau voor Project OS zelf (zie DEC-005).
- Verantwoordelijke: Maurice

## DEC-004
- Datum: 31 juli 2026
- Beslissing: Kritieke RLS-lekken gedicht op `users`, `exercises`, `gyms`, `equipment_types`, `exercise_equipment` (read-only policies, `users` beperkt tot eigen rij).
- Reden: Supabase Advisor meldde deze vijf tabellen als kritiek (RLS uitgeschakeld, publiek schrijfbaar).
- Alternatieven: geen — kritieke kwetsbaarheid, direct actie vereist.
- Impact: geen functionaliteitsverlies (public.users had 0 rijen); referentiedata blijft leesbaar, schrijven voortaan beperkt tot service role.
- Verantwoordelijke: Maurice

## DEC-005
- Datum: 31 juli 2026
- Beslissing: Governance-niveau voor toepassing van Project OS op dit project vastgesteld op **Optie B — Middenweg**.
- Reden: sluit aan bij de bestaande, al bewezen lichte werkwijze (zie Blueprint.md); voorkomt het alsnog invoeren van de zwaarte die bij Blueprint v6 al is afgewezen (zie DEC-003).
- Alternatieven overwogen: Optie A (nog lichter — geen besluitregistratie), Optie C (volledig Project OS v1.3, incl. ADR's en Project Health Check).
- Impact: Project OS-toepassing beperkt tot Product Book, Blueprint, CURRENT_STATE.md, lichte Stories, Roadmap en dit DECISION_LOG — geen ADR's, geen Health Check, geen Dashboard-ceremonie.
- Verantwoordelijke: Maurice

## DEC-006
- Datum: 1 augustus 2026
- Beslissing: Fix toegepast op atleet_profiel-sync (user_id werd nooit meegestuurd, kolom is NOT NULL zonder default → alle Supabase-writes faalden stil).
- Reden: ontdekt tijdens Story 2 (per-user profielscheiding) door broncode te combineren met een SQL-schemacheck.
- Alternatieven: user_id default auth.uid() op kolomniveau zetten (database-fix) i.p.v. client-side meesturen — bewust niet gekozen, client-side is expliciet en consistent met hoe de rest van de app werkt.
- Impact: multi-device/multi-user-sync van het atleetprofiel werkt vanaf nu daadwerkelijk; vóór deze fix deed die sync niets (stille no-op), ook al leek de app te werken dankzij de localStorage-cache. Bevestigd: user_id is PRIMARY KEY op atleet_profiel, dus de merge-duplicates-upsert matcht correct — fix is structureel compleet, geen aanvullende constraint nodig.
- Verantwoordelijke: Maurice

## DEC-007
- Datum: 1 augustus 2026
- Beslissing: volledige RLS-audit uitgevoerd op alle 31 tabellen in public — allemaal rowsecurity=true.
- Reden: laatste openstaande technische controlepunt uit het Product Reset Rapport (13.11 uit Project OS-hoofdstuk 13, hier toegepast als Sprint 1-afsluiter).
- Alternatieven: n.v.t. — controle, geen keuze.
- Impact: geen resterende bekende RLS-gaten. Zegt niets over de inhoud van individuele policies (alleen óf RLS aanstaat, niet of elke policy correct is) — dat blijft per-tabel aandachtspunt bij toekomstig werk.
- Verantwoordelijke: Maurice

## DEC-008
- Datum: 1 augustus 2026
- Beslissing: social/competitief-koers (teams, leaderboards, badges) gaat van "afgewezen, later heropend zonder besluit" naar bevestigd: wordt gebouwd.
- Reden: concreet gevraagd door leden en coaches van ART CrossFit (eerste beoogde gym-klant) — geen intern buikgevoel maar externe, geuite behoefte van de doelgroep uit Fase 3-4.
- Alternatieven: koers ongewijzigd laten ("AI-coach, geen speeltuin") — verworpen nu er concrete externe vraag is; vroeger afgewezen omdat de behoefte toen niet aantoonbaar was.
- Impact: social/competitief wordt onderdeel van de Roadmap (Fase 3, samen met coach-dashboard, aangezien het gym-context vereist — leaderboards zijn zinloos zonder de gym/klasse-structuur die daar al gepland staat). Scope (welke vorm: leaderboards, teams, badges, of een combinatie) nog niet vastgesteld — apart te bepalen.
- Verantwoordelijke: Maurice

## DEC-009
- Datum: 1 augustus 2026
- Beslissing: audit uitgevoerd op de trg_set_user_id-trigger — blijkt al op 16 relevante tabellen te staan (alle persoonlijke gebruikersdata: profiel, condities, logs, trainingen/programma's). Geen ontbrekende dekking gevonden.
- Reden: vervolg op de RLS-audit (DEC-007) en de atleet_profiel-fix (DEC-006), om te controleren of vergelijkbare bugs elders bestonden.
- Correctie op DEC-006: de trigger bleek al aanwezig op atleet_profiel, athlete_conditions en checkin_conditions vóórdat de client-side user_id-fix (commit 71fd2b8) werd doorgevoerd. De oorspronkelijke diagnose in Story 2 ("write faalt stil door ontbrekende user_id, geen default") was gebaseerd op het kolomschema en klopte op zichzelf, maar hield geen rekening met een mogelijke trigger — die bleek er al te zijn. De code-fix is onschadelijk (overbodige dubbele beveiliging: JS zet user_id, trigger overschrijft 'm toch met dezelfde waarde), maar was mogelijk niet de daadwerkelijke oorzaak van de destijds waargenomen lege tabel. Reden voor de oorspronkelijk lege atleet_profiel-tabel blijft daarmee formeel niet 100% verklaard — waarschijnlijkste verklaring: de sync-push-functie (syncAtleetFromSupabase) draait maar één keer per browsersessie en had er simpelweg nog niet aan toegekomen.
- Impact: geen resterende bekende user_id/RLS-gaten op persoonlijke datatabellen. Twee onschuldig-overbodige triggerpogingen op al bestaande triggers gaven terecht een foutmelding (42710, trigger already exists) — geen schade, query gewoon niet opnieuw uitgevoerd.
- Verantwoordelijke: Maurice

## DEC-010
- Datum: 1 augustus 2026
- Beslissing: meerdere koerswijzigingen tegelijk vastgesteld:
  1. Appnaam definitief: **Trainingskompas** (logo/brand sheet vastgesteld, zie docs/Brand/BRAND_IDENTITY.md).
  2. Wearables-uitbreiding (Apple HealthKit, Google Health Connect, Garmin/Whoop/Oura — voorheen "na Fase 2" in de Later-bucket), HYROX race-splits/triathlon-brick en menstruatiecyclus-tracking (beide voorheen expliciet uitgesteld) verplaatst naar prioriteit Fase 1/2.
  3. Social/competitief (DEC-008, al bevestigd voor Fase 3) wordt nu actief opgepakt, niet pas na afronding van coach-dashboard/Fase 2.
  4. Dynamische branding (Fase 4) krijgt een preciezere invulling: Trainingskompas blijft de basis-experience; gym-branding is een laag bovenop (skin), geen vervanging. De volledige naam "Trainingskompas" moet daarbij altijd zichtbaar blijven — ook in toekomstige krappe UI-plekken (herziet de bestaande "KOMPAS"-afkorting-gewoonte). Later, ná de gym-brede branding, volgt een "experience-motor" (naar analogie van wat de Product Owner "radioplanner" noemt) waarmee individuele leden zelf hun look-and-feel kunnen aanpassen, bovenop de gym-skin.
  5. Onboarding-workflow voor nieuwe atleten (profiel + doelen instellen bij eerste gebruik) toegevoegd aan de roadmap — ontbrak nog volledig.
- Reden: Product Owner-koerswijziging op basis van voortschrijdend inzicht na de stabilisatiesessie van 1 augustus 2026 (v3.3.9 t/m v3.3.25) — met een stabiele basis is er ruimte om vooruit te plannen.
- Alternatieven: bestaande volgorde (wearables/HYROX/cyclus pas "later", branding pas volledig in Fase 4) aanhouden — verworpen, expliciete herprioritering door Product Owner.
- Impact: Roadmap.md herzien (zie aldaar). Geen technische wijzigingen in deze sessie — uitsluitend planning/documentatie. Bouw van deze features volgt in latere sessies.
- Verantwoordelijke: Maurice

## DEC-011
- Datum: 2 augustus 2026
- Beslissing: eerder gedeelde GitHub Personal Access Token (in een geüpload PDF-bestand) als gecompromitteerd beschouwd; wordt vervangen. Geen GitHub-push uitgevoerd in Sprint 1 op basis hiervan.
- Reden: token stond in platte tekst in een geüpload document — in strijd met de eigen Skill-regel dat tokens nooit in documentatie/prompts mogen staan.
- Alternatieven: token toch gebruiken tot rotatie — verworpen, onnodig risico.
- Impact: Sprint 1-wijzigingen zijn lokaal geverifieerd (syntax-check, volledige testsuite) en als bestanden opgeleverd, maar nog niet naar GitHub gepusht. Push volgt zodra een nieuwe PAT beschikbaar is.
- Verantwoordelijke: Maurice

## DEC-012
- Datum: 2 augustus 2026
- Beslissing: Sprint 0-audit bevestigd op één punt bijgesteld — Instellingen (Hoofdstuk 6, scherm 8.3) stond op 🟢, feitelijk is dit een smalle trainingsinstelling. Handbook-status blijft ongewijzigd (buiten scope om het Handbook zelf aan te passen zonder expliciete opdracht), maar CURRENT_STATE.md documenteert de discrepantie expliciet als openstaande bouwopgave.
- Reden: voorkomen dat de discrepantie tussen Handbook-statusmarkering en werkelijke implementatie stilzwijgend blijft bestaan.
- Alternatieven: Handbook H6 zelf aanpassen — afgewezen, vereist expliciete opdracht van de Product Owner (Skill-regel).
- Impact: geen functionele wijziging; wel een gecorrigeerd UI-label ("Instellingen" → "Beheer" op het gym-ownerscherm `s-admin`), zie CHANGELOG.
- Verantwoordelijke: Maurice

## DEC-013
- Datum: 2 augustus 2026
- Beslissing: onboarding-gate geïmplementeerd als device-lokale `localStorage`-vlag (`maurice_onboarding_done`), niet als account-/databasekolom.
- Reden: een echte account-brede onboarding-status zou een nieuwe Supabase-kolom + migratie vereisen — buiten de "geen nieuwe architectuur"-scope van Sprint 2.
- Alternatieven: Supabase-kolom `onboarding_done` op `atleet_profiel` — bewust uitgesteld, kan later alsnog als blijkt dat device-wissel in de praktijk een probleem is.
- Impact: een gebruiker die op een nieuw toestel inlogt, doorloopt de onboarding opnieuw. Functioneel onschadelijk (idempotent — overschrijft enkel doel/niveau/sport opnieuw), wel een bekende beperking.
- Verantwoordelijke: Maurice

## DEC-014
- Datum: 2 augustus 2026
- Beslissing: merkidentiteit (Poppins, `#0B1D2A`/`#0E3B4A`/`#00B894`/`#E6EBEF`) toegepast op de bestaande light-theme-designtokens en de KOMPAS-afkorting op login- en dashboardscherm gecorrigeerd naar "Trainingskompas" (DEC-010). Semantische kleuren (waarschuwing-geel, foutmelding-rood, spierheatmap/grafiekkleuren) bewust ongewijzigd gelaten — deze staan niet in de vastgestelde 5-kleuren-merkpalet (BRAND_IDENTITY.md) en zijn functioneel, geen merkelement.
- Reden: Sprint 2-opdracht ("voer de nieuwe merkidentiteit volledig door... geen redesign, alleen implementatie van de reeds goedgekeurde branding") — de goedgekeurde branding omvat expliciet vijf kleuren en een typografie, geen semantische statuskleuren.
- Alternatieven: ook semantische kleuren herzien naar merk-afgeleide tinten — afgewezen, zou een ontwerpbeslissing zijn die niet in BRAND_IDENTITY.md is vastgelegd (dus een aanname).
- Impact: consistente merkweergave app-breed; dashboard-headertitel is verkleind (24px→17px) om de langere naam "Trainingskompas" te laten passen — nog niet visueel bevestigd op een echt device.
- Verantwoordelijke: Maurice

## DEC-015
- Datum: 2 augustus 2026
- Beslissing: tijdens Sprint 2.5 live device-validatie uitgevoerd op de daadwerkelijke productie-app (maurice-art.netlify.app) via een reeds actieve, ingelogde sessie van de Product Owner — niet met een apart testaccount. Twee echte bugs ontdekt via live console-logs (niet via statische code-analyse): ontbrekende `doel`-kolom (migratie v336, nog uit te voeren) en een pre-existing crash in `refreshStats()` bij bezoek aan Beheer (gefixt, defensieve null-check).
- Reden: browsertoegang kwam tijdens deze sprint beschikbaar; er was geen apart testaccount voorhanden, en de bevindingen waren direct bruikbaar (echte, live foutmeldingen i.p.v. aannames).
- Alternatieven: wachten op een apart testaccount — afgewezen, zou waardevolle live foutdetectie onnodig uitstellen; de sessie werd read-only gebruikt voor navigatie/inspectie, geen destructieve acties uitgevoerd op echte data.
- Impact: twee reële bugs gevonden die met alleen statische code-analyse niet aan het licht waren gekomen. Aanbeveling voor toekomstige sprints: een apart wegwerp-testaccount aanmaken zodra device-validatie structureel onderdeel wordt van de werkwijze, om niet afhankelijk te zijn van een toevallig actieve sessie.
- Verantwoordelijke: Maurice

## DEC-016
- Datum: 2 augustus 2026
- Beslissing: mobiele `100vh`-fix toegepast op `.scr` en `.pin-screen` (`height:100dvh` als progressive enhancement naast de bestaande `height:100vh`-fallback).
- Reden: Product Owner meldde live, met telefoonscreenshot, dat de Terug/Volgende-knoppen op het onboarding-scherm buiten het zichtbare gebied vielen op een echt Android-toestel. Bevestigd als het bekende mobiele `100vh`-adresbalkprobleem: op desktop (waar `100vh` wél gelijk is aan `window.innerHeight`) gaf live meting in de browser een perfect sluitende layout (footer exact binnen 0–911px) — het probleem treedt dus specifiek op bij mobiele browsers met een dynamische adresbalk, niet in de layoutlogica zelf.
- Alternatieven: JavaScript-gebaseerde viewport-hoogtemeting (`window.visualViewport`) — niet gekozen omdat `100dvh` de officiële, CSS-native oplossing is voor precies dit probleem en breed ondersteund wordt door moderne mobiele browsers (bevestigd via `CSS.supports('height','100dvh')` in de live sessie).
- Impact: geen regressie op desktop (geverifieerd: `100dvh` = `100vh` = `window.innerHeight` wanneer er geen dynamische toolbar is). **Nog niet herbevestigd op het echte telefoon van de Product Owner** — dat is de enige resterende verificatiestap.
- Verantwoordelijke: Maurice

## DEC-017
- Datum: 2 augustus 2026
- Beslissing: Doelen (7.1) opgeslagen in één nieuwe tabel `goals` die uitsluitend het doel zelf bevat (type/streefwaarde/einddatum/motivatie/status). Actuele waarden (gewicht, vetpercentage, PR's, trainingsvolume, afstand) worden NOOIT gedupliceerd in `goals` — altijd live opgehaald uit de al bestaande tabellen (body_comp, weight_log, exercises, sessions).
- Reden: expliciete Sprint 3-opdracht ("gebruik bestaande data, geen dubbele opslag") en goede praktijk — voorkomt dat doelvoortgang uit de pas gaat lopen met de brontabellen.
- Alternatieven: alles in het bestaande `atleet_profiel` proppen — afgewezen, `atleet_profiel` is één rij per gebruiker en niet geschikt voor een 1-op-veel-relatie (meerdere gelijktijdige doelen).
- Impact: PR-doelen hergebruiken zelfs een al bestaand veld (`exercises.peak_goal`) dat vóór Sprint 3 al bestond maar nog niet gekoppeld was aan een doelenoverzicht — dus zelfs voor het PR-doeltype is er geen nieuwe opslag nodig, alleen een nieuwe rij in `goals` met een verwijzing naar de oefening.
- Verantwoordelijke: Maurice

## DEC-018
- Datum: 2 augustus 2026
- Beslissing: Gym-/Team-challenges en "Perfecte trainingsweek" NIET gebouwd in Sprint 3, ondanks dat ze in de Handbook-voorbeelden en de sprintopdracht worden genoemd.
- Reden: Gym-/Team-challenges vereisen cross-user data-aggregatie die nu niet bestaat (zou nieuwe architectuur zijn, expliciet buiten scope). "Perfecte trainingsweek" heeft geen eenduidige bestaande definitie van "perfect" in data of documentatie — die zelf verzinnen zou tegen de expliciete instructie "niet verzinnen" ingaan.
- Alternatieven: een arbitraire drempel kiezen voor "perfecte week" (bv. ≥3 sessies) — afgewezen, dat zou een aanname zijn die de Product Owner niet heeft gevalideerd.
- Impact: 5 van de in de opdracht genoemde Challenge-voorbeelden zijn gebouwd (100 trainingen, 30 dagen actief, 100 km roeien, 500 ton volume, 10 PR's — allemaal 100% herleid uit bestaande sessiedata). De overige 2 staan als aanbeveling voor een latere sprint, met de Product Owner te bepalen wat "perfect" precies betekent vóórdat het gebouwd wordt.
- Verantwoordelijke: Maurice

## DEC-019
- Datum: 2 augustus 2026
- Beslissing: `goals.exercise_id` gecorrigeerd van `bigint` naar `text`, matchend met het daadwerkelijke kolomtype van `exercises.id`.
- Reden: migratie v337 faalde bij eerste uitvoering in Supabase met "foreign key constraint cannot be implemented... Key columns exercise_id and id are of incompatible types: bigint and text" — mijn aanname over het kolomtype van `exercises.id` was fout. Live foutmelding gebruikt om te corrigeren, niet geraden.
- Alternatieven: geen — dit is een directe typefout-correctie, geen ontwerpkeuze.
- Impact: bijbehorende JS-code (`saveNewGoal()`) ook aangepast — stuurde `exercise_id` voorheen als `Number(...)`, nu als tekst, consistent met het gecorrigeerde kolomtype. Migratie v337 succesvol uitgevoerd door Product Owner na deze fix ("Success. No rows returned").
- Verantwoordelijke: Maurice

## DEC-020
- Datum: 2 augustus 2026
- Beslissing: HTML-commentaarblok gerepareerd dat tijdens Sprint 3 abusievelijk werd doormidden geknipt.
- Reden: bij het invoegen van het Doelen-scherm (str_replace-bewerking) matchte de vervangen tekst slechts de openingsregel van het bestaande HTML-commentaarblok boven het Onboarding-scherm, niet het hele blok. Het resultaat: de resterende 3 regels van dat commentaar (incl. de sluitende `-->`) kwamen zonder openende `<!--` te staan, en werden dus als gewone, zichtbare paginatekst gerenderd — live gemeld door de Product Owner met telefoonscreenshots (zichtbaar onderaan het Instellingen-scherm, onder de bottom-navigatie).
- Alternatieven: geen — dit is een directe fout-correctie.
- Impact: comment-balans in het hele bestand geverifieerd (52 open = 52 sluit, was 51 vs 52 vóór de fix) — bevestigt dat dit de enige plek was. Geen enkele andere sectie geraakt.
- Verantwoordelijke: Maurice

## DEC-021
- Datum: 2 augustus 2026
- Beslissing: `saveNewGoal()` gecorrigeerd — `user_id` ontbrak in de insert-payload naar `goals`, waardoor de RLS-policy elke poging blokkeerde (42501 "new row violates row-level security policy").
- Reden: live end-to-end test (na migratie v337) via de browserverbinding toonde de fout direct. Live getest met een echt testdoel (PR-doel op Hexabar Deadlift), bevestigd correct opgeslagen én correct weergegeven (240/300 kg, 80%), daarna zelf weer gearchiveerd — geen data van de Product Owner is blijvend gewijzigd.
- Alternatieven: geen — directe bugfix, geen ontwerpkeuze.
- Impact: Doelen-module nu voor het eerst end-to-end live bevestigd werkend (aanmaken → opslaan → live voortgangsberekening → weergave), niet langer alleen code-gevalideerd.
- Verantwoordelijke: Maurice

## DEC-022
- Datum: 2 augustus 2026
- Beslissing: `.modal-bg`/`.modal` begrensd tot dezelfde 430px-kolom als de rest van de app (`justify-content:center` + `max-width:430px`), i.p.v. de volle breedte van het browservenster.
- Reden: Product Owner merkte tijdens een screenshot van het live testen op dat de "Nieuw doel"-modal de volle breedte van het (brede desktop-)browservenster besloeg i.p.v. de smalle app-kolom. Onderzocht: dit was geen Sprint 3-fout en ook niet uniek voor deze ene modal — `.modal-bg{position:fixed;inset:0}` en `.modal{width:100%}` golden al voor alle ~50 modals in de app, sinds vóór dit project. Op een echte telefoon (viewport altijd <430px) was dit nooit zichtbaar; het werd nu pas zichtbaar doordat er via een brede desktop-browserverbinding werd getest.
- Alternatieven: alleen de nieuwe Doelen-modal fixen — afgewezen, zou inconsistent zijn met de overige ~49 modals en het onderliggende probleem niet oplossen.
- Impact: alle modals in de app tonen zich nu consistent in de 430px-kolom, ook op brede schermen. Live geverifieerd via `getBoundingClientRect()`: modal exact 430px breed, uitgelijnd met de app-kolom (745–1175px op een 1920px-breed venster). Geen wijziging in hoe de app op een echte telefoon (smal scherm) getoond wordt.
- Verantwoordelijke: Maurice

## DEC-023
- Datum: 2 augustus 2026
- Beslissing: Sprint 3.1 (live validatie/quality gate) uitgevoerd met expliciete grenzen — geen Lighthouse/axe-core-tool beschikbaar, geen synthetische schaalbaarheidsdata (100–10.000 sessies) aangemaakt in productie, geen screenshot-pack in de repo (browserscreenshots landen lokaal bij de Product Owner, niet in `docs/screenshots/`). Database-introspectiequeries klaargezet maar resultaat nog niet ontvangen.
- Reden: deze onderdelen zouden ofwel gefabriceerde cijfers/aannames vereisen (in strijd met "geen aannames"), ofwel destructieve/riskante acties op de productiedatabase (in strijd met eerdere afspraak om nooit trainingsdata te riskeren).
- Alternatieven: cijfers schatten of verzinnen om het rapport "compleet" te laten lijken — expliciet afgewezen.
- Impact: Sprint 3.1-rapport bevat expliciete "niet vastgesteld"-secties i.p.v. ingevulde placeholders. Wel: twee echte bugs gevonden en gefixt tijdens live testen (user_id ontbrak bij goals-insert; modals te breed op desktop) — beide al gepusht vóór dit rapport (v3.3.31–v3.3.34). Doelen-CRUD is voor 3 van de 4 operaties (Create/Read/Delete) live bevestigd; Update ontbreekt nog als functionaliteit.
- Verantwoordelijke: Maurice

## DEC-024
- Datum: 19 augustus 2026
- Beslissing: `targetSdkVersion`/`compileSdkVersion` naar 36 gebracht en AGP naar 8.9.1 / Gradle-wrapper naar 8.11.1, zonder dat die combinatie in deze omgeving kon worden gecompileerd.
- Reden: Google Play eist sinds 31-08-2025 minimaal API 35 voor nieuwe apps en updates, en vanaf 31-08-2026 API 36 (geverifieerd bij de bron, Play Console Help). De configuratie stond op 34 en zou dus zonder meer worden geweigerd. Niet bumpen betekent dat de eigenaar dat pas bij de upload ontdekt; wél bumpen betekent één lokale verificatiebuild. Dat tweede is omkeerbaar in één regel, het eerste kost een hele releasecyclus.
- Alternatieven: (a) op 34 laten en alleen rapporteren — afgewezen, dat verplaatst een bekende blokkade naar de eigenaar; (b) ook Capacitor naar een nieuwere major brengen — afgewezen, dat is een dependency-upgrade met API-wijzigingen die zonder compiler en zonder toestel niet te verifiëren is, en `@capacitor-community/bluetooth-le` moet in hetzelfde tempo mee.
- Impact: `docs/PLAY_STORE_READINESS.md` §6 benoemt exact wat er bij die eerste build gecontroleerd moet worden (compilatie tegen API 36, terugveeg, edge-to-edge, video's, ondertekening). `core/fAndroidRelease.test.js` legt de ondergrens vast en beweegt mee met de Play-datums.
- Verantwoordelijke: Maurice

## DEC-025
- Datum: 19 augustus 2026
- Beslissing: de videobibliotheek (437 MB, 206 bestanden) wordt niet meer in het Android-artefact gebundeld. `sw.js` bepaalt via `MEDIA_ORIGIN` van welke oorsprong de native app ze ophaalt.
- Reden: het artefact zou ~450 MB worden tegen een Play-plafond van 200 MB voor de basismodule — de upload zou domweg worden geweigerd. Bundelen was bovendien dubbelop: de service worker haalde video's al on-demand op en cachet ze met een LRU-plafond van 250 MB. Het gedrag op Android wordt daarmee identiek aan het web: eerste keer streamen, daarna offline beschikbaar.
- Alternatieven: (a) Play Asset Delivery — afgewezen voor V1, vereist een asset pack en een aparte uitleverketen voor een functie die niet in de kernlus zit; (b) video's uitdunnen — afgewezen, dat verwijdert inhoud om een verpakkingsprobleem op te lossen.
- Impact: `www/` van 450 MB naar 14 MB. Techniekvideo's vereisen bij eerste weergave verbinding; opgenomen in `docs/KNOWN_LIMITATIONS.md`.
- Verantwoordelijke: Maurice

## DEC-026
- Datum: 19 augustus 2026
- Beslissing: het bewijsspoor per set wordt getoond in het logboek (Historie), niet in Training of Home.
- Reden: Training en Home zijn in alle voorgaande sprints als beschermd gebied aangemerkt, en het logboek is precies de plek waar de vraag "waarom stond dit advies er" ontstaat — bij het terugkijken, niet tijdens het tillen. De toevoeging is additief: een knop verschijnt uitsluitend bij een rij die daadwerkelijk een snapshot bevat.
- Alternatieven: (a) in de sessiesamenvatting direct na afronden — afgewezen, dat is Training-gebied; (b) een eigen scherm — afgewezen, dat voegt navigatie toe voor iets dat bij een bestaande rij hoort.
- Impact: de kernbelofte ("niet alleen WAT, maar ook WAAROM") is voor het eerst zichtbaar voor de sporter. `core/fRC0.test.js` sectie A controleert dat de weergavelaag geen enkele rekenfunctie aanroept, zodat het scherm nooit iets anders kan tonen dan wat destijds is besloten.
- Verantwoordelijke: Maurice

## DEC-027
- Datum: 19 augustus 2026
- Beslissing: `netlify/functions/delete-account.js` uitgebreid van 22 naar 34 tabellen, en de relationship-audits van sprint 25/26 en de Fase-2-verificatie zijn gecorrigeerd.
- Reden: twee bevindingen uit de release-audit. (1) Elf tabellen met gebruikersgegevens bleven na accountverwijdering achter, waaronder `wearable_connections` met het access- én refresh-token in leesbare vorm — in strijd met de privacyverklaring van de app en met de Google Play-eis. (2) De eerdere relationship-audits zijn uitgevoerd op een datadump die met een service-role-sleutel was gemaakt en dus de rijen van twee accounts door elkaar bevatte; die situatie kan in de app niet bestaan (RLS), maar maakte de gerapporteerde aantallen wel onjuist.
- Alternatieven: bij (2) de oude cijfers laten staan — afgewezen, een audit die zijn eigen methodefout verzwijgt is geen audit.
- Impact: (1) `core/fRC0.test.js` sectie E vergelijkt de verwijderlijst voortaan met elke tabel in het schema die een gebruikerskolom draagt, en controleert dat er nooit zonder gebruikersfilter wordt verwijderd en dat gedeelde gym-inrichting van andere leden blijft bestaan. (2) `docs/RELATIONSHIP_AUDIT.md` §0 corrigeert de cijfers: 23 circulair (was 24), 187 kenbaar (was 186), 7 patronen (was 6).
- Verantwoordelijke: Maurice

## DEC-028
- Datum: 26 augustus 2026
- Beslissing: Cyclustracking-MVP gebouwd en gemergd (roadmap POST-V1 #7): nieuwe tabel
  `cycle_periods`, nieuwe Calculation-module `core/cycle.js`, nieuw subscherm Lichaam →
  Cyclus. Bijkomend: `cycle_periods` én het eerder ontbrekende `race_segments` toegevoegd
  aan de accountverwijderlijst (`netlify/functions/delete-account.js`) en aan de
  referentielijst in `core/fRC0.test.js` (DEC-027's controle was zelf verouderd en kon dit
  gat daardoor niet vangen).
- Reden: Cyclustracking stond al op de roadmap als gewenste toekomstige feature. De
  Calculation-laag hergebruikt bewust de al bestaande, protected `CalcCore.
  cyclusDagFactor()`-vocabulaire (menstruatie/folliculair/ovulatie/luteaal, al aanwezig
  via de dagelijkse HRV-check-in) in plaats van een tweede vocabulaire te introduceren.
- Alternatieven: een vereenvoudigd fasemodel zonder "ovulatie" overwegen om elke schijn
  van vruchtbaarheidsclaims te vermijden — afgewezen, omdat de bestaande, product-
  eigenaar-goedgekeurde `cyclusDagFactor()`-vocabulaire dat begrip al bevat als
  self-reported, geschatte waarde; een nieuwe, afwijkende vocabulaire zou juist
  inconsistentie met het bestaande systeem introduceren.
- Impact: nieuwe RLS-beveiligde tabel, geen wijziging aan protected core, geen AI-koppeling
  (bewust uitgesteld). Twee accountverwijderingsgaten gedicht.
- Verantwoordelijke: Autonome implementatiebeslissing door Claude tijdens een
  onbeheerde master-sprint (de gebruiker was langere tijd niet beschikbaar). Niet door
  Maurice persoonlijk beoordeeld op het moment van mergen — ter review bij terugkeer.

## DEC-029
- Datum: 26 augustus 2026
- Beslissing: Cyclustracking-audit uitgevoerd en PMS/symptoomregistratie gebouwd en
  gemergd (Women's Performance Blueprint v1.0, secties 2/7/8). Audit vond en repareerde
  een echte bug (overlap-preventie ontbrak server-side) en een privacygat
  (`cycle_symptom_logs` ontbrak in de accountverwijderlijst).
- Reden: Blueprint sectie 2 noemt Symptom Tracking en PMS Context als vroege
  featurefase (W3), met exact hetzelfde risicoprofiel als de al gemergede
  cyclustracking-MVP (self-reported logging, neutrale presentatie, geen
  diagnoseclaim). Uitgevoerd conform blueprint sectie 3's taalregel: uitsluitend
  feitelijke tellingen, nooit causale/hormonale claims, harde minimumdatadrempel
  (>=3 cycli) vóór een patroon getoond wordt.
- Alternatieven: patronen al tonen bij minder data overwogen (sneller nuttig voor de
  gebruiker) — afgewezen, want dat zou precies het risico introduceren dat het
  blueprint expliciet verbiedt ("nooit een conclusie op één of twee trainingen/
  datapunten").
- Impact: nieuwe RLS-beveiligde tabel (`cycle_symptom_logs`), geen wijziging aan
  protected core, geen AI-koppeling. Bewust NIET uitgevoerd: zwangerschap/postpartum-
  context, menopauze-terminologie, anticonceptie-categorieën — deze blijven expliciete
  productbeslissingen (zie de DECISION REQUIRED-documenten in
  docs/Womens_Performance/).
- Verantwoordelijke: Autonome implementatiebeslissing door Claude tijdens een
  onbeheerde master-sprint (de gebruiker was langere tijd niet beschikbaar). Niet door
  Maurice persoonlijk beoordeeld op het moment van mergen — ter review bij terugkeer.

## DEC-030
- Datum: 26 augustus 2026
- Beslissing: bij de Fase-4-rebaseline-audit (na PR #47/#48) een vijfde DECISION
  REQUIRED-document toegevoegd voor "Bekkenbodem-context" (blueprint gap-matrix-item
  12), naast de al bestaande vier (zwangerschap/postpartum/menopauze/anticonceptie).
- Reden: dit onderwerp was nog niet expliciet behandeld. Het mengt fitness-relevante
  en medisch-aangrenzende aspecten — het classificeren van specifieke oefeningen als
  "bekkenbodemveilig" vereist fysiotherapeutische expertise die niet zelfstandig
  verzonnen mag worden. Geen code geschreven; het document beschrijft opties A-C met
  aanbeveling (optie B: hergebruik van het bestaande, generieke vermijdings-
  mechanisme, geen door Claude verzonnen medische classificatie).
- Alternatieven: zelf een lijst van "bekkenbodemveilige" oefeningen samenstellen —
  expliciet afgewezen, want dat zou een ongeverifieerde medische claim zijn.
- Impact: geen databasewijziging, geen Engine-wijziging, geen UI-wijziging in deze
  stap — uitsluitend documentatie.
- Verantwoordelijke: Autonome implementatiebeslissing door Claude tijdens een
  onbeheerde master-sprint (de gebruiker was langere tijd niet beschikbaar). Niet door
  Maurice persoonlijk beoordeeld op het moment van mergen — ter review bij terugkeer.

## DEC-031
- Datum: 27 augustus 2026
- Beslissing: Program Adaptation V1 gebouwd — gemiste/verplaatste program_blocks
  krijgen een contextuele prompt (vandaag doen / overslaan / planning aanpassen)
  i.p.v. stil "open" te blijven staan.
- Reden: bevestigde productgap (geen automatische/contextuele reactie op een
  afwijkende uitvoeringsdatum), benchmark-onderbouwd (TrainHeroic doet dit al).
- Belangrijk attributieverschil met eerdere DEC-entries: de KERNPRODUCTBESLISSINGEN
  voor deze feature (welk model: hybride met expliciete keuze i.p.v. automatische
  verschuiving; skip-semantiek; audit-trail wel meenemen; conflictgedrag:
  waarschuwen, nooit automatisch alternatief zoeken) zijn VOORAF EXPLICIET DOOR
  MAURICE VASTGESTELD als bindend uitgangspunt, niet door Claude autonoom bedacht.
  Uitsluitend de TECHNISCHE UITVOERING (architectuurdetails, exacte functienamen,
  precieze UX-copy, testdekking) is autonoom door Claude ingevuld binnen dat
  vooraf gegeven kader.
- Alternatieven: Model 1 (simpel, geen conflictdetectie), Model 2 (rest van
  programma verschuift mee), Model 3 (volledig adaptief, vereist een
  event_date-kolom) — door Maurice vooraf afgewezen ten gunste van Model 4
  (hybride).
- Impact: `program_blocks` uitgebreid met drie nullable kolommen
  (rescheduled_from/reschedule_reason/schedule_status), geen nieuwe tabel, geen
  RLS-wijziging, geen protected-core-wijziging. `heergenereerResterendeWeken()`
  ongewijzigd. Bestaande readiness/adaptive-trainingflow volledig hergebruikt.
- Verantwoordelijke: kernproductbeslissingen door Maurice (vooraf, expliciet,
  bindend vastgelegd in de opdracht). Technische uitvoering: autonome
  implementatie door Claude tijdens een onbeheerde master-sprint. Niet door
  Maurice persoonlijk beoordeeld op het moment van mergen — ter review bij
  terugkeer.

## DEC-032
- Datum: 27 augustus 2026
- Beslissing: Goal/Event-Date Awareness gebouwd — programs.event_date/
  event_name, puur informatief (geen automatische planning-/fase-/
  belastingsaanpassing).
- Reden: grondige, zelfstandige gap-validatieronde bevestigde Bewijsniveau A
  (0 code-/databasereferenties naar een event/wedstrijddatum-concept;
  TrainHeroic/Boostcamp expliciet, actueel bevestigd wedstrijddatum-centrisch).
  Expliciet onderzocht en uitgesloten dat het bestaande `goals.einddatum`
  hetzelfde probleem al oploste: fundamenteel ander concept (numeriek
  prestatiedoel, geen FK naar programs).
- Alternatieven overwogen: event_date op program_blocks (afgewezen: het
  evenement is een eigenschap van het HELE programma, niet van één dag),
  op athlete/profile (afgewezen: een atleet kan meerdere programma's met
  verschillende doelen hebben), op goals (afgewezen: zou het bestaande,
  andere `einddatum`-concept vermengen en blijft zonder nieuwe FK alsnog
  onzichtbaar op het programmascherm).
- Impact: twee nullable kolommen op `programs`, geen nieuwe tabel, geen
  RLS-wijziging, geen protected-core-wijziging. Bewezen (bug-terugzet-
  simulatie, tests O11/O12) volledig losgekoppeld van bestaande fase-/
  voltooiing-/readiness-/Program-Adaptation-logica.
- Bewust op HOLD gehouden uit dezelfde onderzoekslijn: G2 (performance
  forecasting) en G3 (ACWR/trainingsbelasting-activatie — sessions.
  duration_s heeft nog steeds 0 gevulde rijen, geen nieuwe bouw nodig,
  wacht uitsluitend op echte productiedata).
- Verantwoordelijke: autonome gap-discovery, -validatie en -implementatie
  door Claude tijdens een onbeheerde master-sprint (de gebruiker was
  langere tijd niet beschikbaar, met expliciete voorafgaande toestemming
  voor implementatie t/m PR, uitgezonderd de merge zelf). Niet door
  Maurice persoonlijk beoordeeld op het moment van pushen — ter review bij
  terugkeer.

## DEC-032-VERVOLG (audit vóór merge)
- Datum: 27 augustus 2026
- Bevinding: tijdens de zelfstandige eindcontrole vóór merge van PR #51 werd
  een echte, binnen-scope-defect gevonden in de "vandaag"-weergave van
  Goal/Event-Date Awareness ("Nog 0 weken" i.p.v. "Vandaag: [naam]").
- Actie: gerepareerd (dRest===0 als eerste conditie), regressietest
  toegevoegd (fHardening.test.js O13), bewezen effectief via bug-terugzet-
  simulatie, volledige regressie herhaald (alle suites groen), protected
  core bevestigd onaangetast.
- Scope: uitsluitend binnen de bestaande G1-implementatie — geen nieuwe
  functionaliteit, geen scope-uitbreiding.
- Verantwoordelijke: autonome bugfix door Claude tijdens een onbeheerde
  master-sprint, expliciet toegestaan door Maurice ("aantoonbare defecten
  binnen de bestaande G1-scope herstellen"). PR #51 nog niet gemerged op
  het moment van deze fix.

## DEC-033
- Datum: 27 augustus 2026
- Beslissing: AI Coach krijgt toegang tot de reeds berekende Goal/Event-Date-
  context (v4.56.0) via een nieuwe tkProgramEventContext()-functie, exact naar
  het bestaande tkHyroxCoachContext()-patroon.
- Reden: zelfstandige "Product Gap Discovery V7" bevestigde dat event_date
  volledig gebouwd maar nergens aan de AI-context gekoppeld was — een
  laag-risico, direct hergebruik van reeds bestaande, geteste code
  (ScheduleAdherenceCore), geen nieuwe database, geen nieuwe Calculation
  Engine-functie.
- G3 (ACWR/trainingsbelasting) en G4 (proactieve deload) opnieuw
  gecontroleerd tijdens dezelfde discovery-ronde: beide blijven HOLD.
  sessions.duration_s heeft nog steeds 0 van 116 rijen gevuld — geen nieuwe
  bouw, geen kunstmatige data aangemaakt.
- Alternatieven overwogen: G2 (performance forecasting) — afgewezen als
  #1-kandidaat dit keer, want de bestaande trendBy()/avgStep-basis vereist
  eerst een zorgvuldiger certainty-framing-ontwerp dan binnen deze ronde
  paste; blijft een geldige, latere kandidaat.
- Impact: geen databasewijziging, geen protected-core-wijziging. AI ontvangt
  uitsluitend een reeds berekend feit, rekent zelf niets — bewezen via
  bug-terugzet-simulatie dat een fout in deze functie de coach-context nooit
  laat crashen, en dat Program Adaptation V1 deze functie nergens raadpleegt.
- Verantwoordelijke: autonome gap-discovery, -validatie en -implementatie
  door Claude tijdens een onbeheerde master-sprint, met expliciete
  voorafgaande toestemming voor implementatie én merge zonder tussentijdse
  bevestiging. Niet door Maurice persoonlijk beoordeeld op het moment van
  mergen — ter review bij terugkeer.

## DEC-034
- Datum: 27 augustus 2026
- Beslissing: Training Load Advisory gebouwd — een neutrale, wetenschappelijk
  onderbouwde classificatie (Gabbett 2016-banden) van de al bestaande,
  al berekende ACWR-waarde, toegevoegd aan de AI Coach-context.
- Reden/herziening: eerdere sessierondes (incl. deze sessie zelf, meerdere
  keren) concludeerden ten onrechte dat G3 (ACWR/trainingsbelasting)
  volledig geblokkeerd bleef door onvoldoende `duration_s`-data. Grondig
  hernieuwd onderzoek toonde aan dat `AthleteCore.unifiedLoad()` uitsluitend
  geblokkeerd is bij MEERDERE, ongelijksoortige eenheden tegelijk — voor een
  enkele modaliteit (overwegend krachttraining, de praktijksituatie) werkt de
  volume-gebaseerde belasting al, bevestigd met 5 maanden echte
  productiedata. Dit corrigeert een herhaalde, onvolledige eerdere conclusie.
- Alternatieven overwogen: computeProgAdjustment() (protected core, decision.
  js) direct uitbreiden met een ACWR-input — EXPLICIET AFGEWEZEN. Dat zou een
  bewezen-werkende, geteste, protected functie inhoudelijk wijzigen voor een
  ENHANCEMENT (geen bugfix) — in strijd met de vaste regel "beschermde core
  niet wijzigen tenzij absoluut noodzakelijk en expliciet bewezen". In plaats
  daarvan: een volledig nieuwe, aparte module (core/trainingLoad.js) die de
  reeds berekende waarde uitsluitend classificeert en als aanvullende,
  informatieve AI-coachcontext aanbiedt — zonder de bestaande sets/RPE-
  aanpassing te raken.
- Impact: geen databasewijziging, geen protected-core-wijziging (expliciet
  geverifieerd: core/decision.js bevat geen enkele referentie aan de nieuwe
  module). Eén nieuwe, duidelijk gelabelde AI-coachcontextregel. Bewezen via
  bug-terugzet-simulatie dat de nieuwe regel geen sets/RPE-logica bevat en
  computeProgAdjustment() nergens raadpleegt.
- Taalgrens: expliciet getest op afwezigheid van blessurerisico-/medische-/
  dwingende taal — uitsluitend neutraal-beschrijvend ("je belasting ligt
  hoger dan je eigen gemiddelde"), geen diagnose, geen automatisch advies.
- Verantwoordelijke: autonome gap-discovery, -validatie, -correctie van een
  eerdere onvolledige conclusie, en -implementatie door Claude tijdens een
  onbeheerde master-sprint, met expliciete voorafgaande toestemming voor
  implementatie én merge zonder tussentijdse bevestiging. Niet door Maurice
  persoonlijk beoordeeld op het moment van mergen — ter review bij
  terugkeer.

## DEC-035
- Datum: 27 augustus 2026
- Beslissing: AI Coach krijgt een samenvattend, feitelijk signaal over
  oefeningen met een dalende progressie-trend (v4.59.0), via een nieuwe
  tkProgressionTrendContext()-functie, exact naar het bestaande
  tkHyroxCoachContext()/tkProgramEventContext()-patroon.
- Reden: "Autonomous Benchmark Gap Discovery V9" — echt, actueel (2026)
  extern marktonderzoek toonde aan dat Alpha Progression en Dr. Muscle
  stagnatiedetectie PER OEFENING als kernonderscheid hanteren ("lift-by-
  lift granularity"). Trainingskompas had de onderliggende berekening
  (ProgressionCore.trendBy(), protected) al, toonde die alleen als losse,
  passieve geruststelling ná één sessie, nooit als samenvattend AI-
  coachsignaal.
- Vorige kandidaten deze onderzoekslijn EXPLICIET AFGEWEZEN vóór deze
  keuze: (1) G4 proactieve deload op basis van ACWR alleen — afgewezen,
  want ACWR (sterk_hoger) en monotonie (laag) toonden tegenstrijdige
  signalen bij de echte data, en een deload-advies op één los getal is
  expliciet verboden; (2) Training Strain-classificatie (belasting x
  monotonie) — afgewezen ná berekening, want dit vereist een persoonlijke-
  percentiel-vergelijking (in tegenstelling tot ACWR's zelf-normaliserende
  ratio) die niet binnen deze ronde verantwoord ontworpen kon worden;
  vaste drempels zouden hier pseudowetenschap zijn geweest.
- Bewijs: bevestigd met echte productiedata (geen kunstmatige testdata) --
  TK-000038 toont een reële stijgende trend, TK-000019 een reële dalende
  trend (geschat 1RM 90,7->50,0 kg over 13 sessies).
- Impact: geen databasewijziging, geen nieuwe Calculation Engine-module,
  geen protected-core-wijziging (expliciet geverifieerd: core/progression.js
  bevat geen enkele referentie aan de nieuwe functie). Eén nieuwe, duidelijk
  gelabelde AI-coachcontextregel. Bewezen via bug-terugzet-simulatie dat de
  functie geen "deload"-taal en geen sets/RPE-logica bevat.
- Verantwoordelijke: autonome benchmarkonderzoek, gap-discovery, -validatie
  en -implementatie door Claude tijdens een onbeheerde master-sprint, met
  expliciete voorafgaande toestemming voor implementatie én merge zonder
  tussentijdse bevestiging. Niet door Maurice persoonlijk beoordeeld op het
  moment van mergen — ter review bij terugkeer.

## DEC-036
- Datum: 27 augustus 2026
- Beslissing: "Blocker Elimination V2" — systematische herbeoordeling van
  alle bestaande HOLD/BLOCKED-items. duration_s-registratie bevestigd al
  volledig gebouwd (geen actie nodig, Groep B, wacht op tijd/gebruik).
  G4 (proactieve deload) herbeoordeeld en deels opgelost via een nieuw,
  conservatief corroboratie-ontwerp.
- Reden: eerdere aanname dat G4 volledig afhankelijk was van een enkel,
  complex ACWR/Training-Strain-getal bleek te beperkt. Met de volle
  breedte aan al bestaande, al berekende signalen (ACWR-classificatie uit
  v4.58.0, progressie-trend-telling uit v4.59.0) kan een eenvoudiger,
  conservatiever patroon: een signaal uitsluitend afgeven wanneer TWEE
  onafhankelijke bronnen tegelijk hetzelfde beeld geven. Dit vermijdt zowel
  het "één los getal is misleidend"-probleem (eerdere ACWR-alleen-
  afwijzing) als het "vereist persoonlijke percentielen"-probleem
  (eerdere Training-Strain-afwijzing).
- Alternatieven expliciet afgewezen vóór deze keuze: een derde,
  onafhankelijk signaal (bv. readiness-trend) toevoegen aan de conjunctie
  — overwogen maar niet gebouwd deze ronde, want de huidige twee-signalen-
  conjunctie is al bewijsbaar conservatiever dan elk eerder onderzocht
  ontwerp; een derde signaal kan een latere verfijning zijn, geen
  blokkerende noodzaak nu.
- Impact: geen databasewijziging, geen nieuwe Calculation Engine-
  berekening, geen protected-core-wijziging (expliciet geverifieerd:
  core/decision.js bevat geen enkele referentie aan het nieuwe signaal).
  Kleine, gerechtvaardigde aanpassing van tkProgressionTrendContext()'s
  retourtype (string -> object) om dubbele berekening te voorkomen.
  Bewezen via bug-terugzet-simulatie dat het signaal geen sets/RPE-logica
  bevat en computeProgAdjustment() nergens aanroept.
- Taalgrens: het signaal is expliciet geformuleerd als aanleiding voor een
  mens-tot-mens-gesprek ("bespreken", "geen advies zonder overleg"), niet
  als een AI- of systeembeslissing.
- Verantwoordelijke: autonome blokkade-inventarisatie, -herbeoordeling en
  -implementatie door Claude tijdens een onbeheerde master-sprint, met
  expliciete voorafgaande toestemming voor implementatie én merge zonder
  tussentijdse bevestiging. Niet door Maurice persoonlijk beoordeeld op
  het moment van mergen — ter review bij terugkeer.

## DEC-037
- Datum: 27 augustus 2026
- Beslissing: MASTERSPRINT A1 (Workout Execution 2.0) formeel afgesloten.
  Discovery en verificatie toonden aan dat de execution-laag grotendeels al
  volwassen was; deze afsluitende sprint dichtte de drie resterende, hard
  bevestigde gaps: oefening vervangen/verwijderen tijdens een actieve sessie,
  en een expliciete "training verwerpen"-actie naast pauzeren.
- Bewijs: drie eerder als UNKNOWN geclassificeerde fast-logging-punten
  (direct wijzigen gewicht/reps, automatische rusttimer, RPE niet-
  blokkerend) alle drie bevestigd COMPLETE met exacte codeverwijzingen —
  geen bouwwerk nodig gebleken.
- Alternatieven expliciet afgewezen: oefeningen herordenen (P2) — geen
  bestaande, eenvoudig herbruikbare drag-drop-component gevonden, zou
  nieuwe infrastructuur vereisen, niet laag-risico binnen deze sprint.
  Advanced set types (drop sets/AMRAP/EMOM/endurance-intervals) — bewust
  niet gebouwd, uitsluitend een architectuurnotitie
  (ADVANCED_SET_TYPES_ARCHITECTUUR.md), conform expliciete instructie dat
  deze A1 niet mogen openhouden.
- Impact: geen databasewijziging, geen protected-core-wijziging (uitsluitend
  index.html gewijzigd). Kernprincipe "discard ≠ finish" bewezen via bug-
  terugzet-simulatie: het verwerpen van een training roept nergens een
  database-schrijfactie, finishSession() of completeTrainingInstance() aan.
- A1-eindconclusie: Workout Execution wordt na deze sprint als benchmark-
  volwassen genoeg voor V1 beschouwd. A1 GESLOTEN.
- Verantwoordelijke: autonome discovery, verificatie, gap-closure en
  -implementatie door Claude over meerdere sessierondes. Niet door Maurice
  persoonlijk beoordeeld op het moment van mergen — ter review bij
  terugkeer.

## DEC-038
- Datum: 27 augustus 2026
- Beslissing: A2.5A/B/C gebouwd — weekoverzicht, per-oefening-trendlabels in
  Voortgang, en een centrale, chronologische PR-tijdlijn.
- Reden: A2-discoveryronde bewees drie echte, hoge-waarde gaps waarvoor de
  onderliggende data/calculations al canonical en volledig aanwezig waren --
  uitsluitend presentatie/aggregatie ontbrak.
- Belangrijke tussenbevinding: vóór het bouwen van de PR-tijdlijn bleek een
  "PR per herhaling"-kaart al te bestaan. Grondig onderzocht om duplicatie te
  voorkomen -- de nieuwe tijdlijn hergebruikt exact dezelfde bucket-/
  vergelijkingslogica (`nearestRepBucket`), uitsluitend chronologisch
  geordend i.p.v. gegroepeerd per oefening.
- Architectuurbeslissing: de per-oefening-trendberekening uit
  tkProgressionTrendContext() (v4.59.0) is geëxtraheerd naar een gedeelde
  computeExerciseTrends()-functie, zodat AI-coachcontext en Voortgang-UI
  exact dezelfde berekening/drempel gebruiken -- voorkomt een duplicate
  calculation path (expliciete Definition-of-Done-eis).
- PR-tijdlijn-beperking, expliciet gedocumenteerd: de database bewaart geen
  expliciete PR-events, dus dit is een retroactieve reconstructie op basis
  van de bestaande sessions-tabel. Bewezen zonder "future data leakage"
  (chronologische sortering vóór vergelijking, ongeacht aanlevervolgorde) --
  zowel met gesimuleerde als echte productiedata getest.
- Bug gevonden en binnen dezelfde sprint gerepareerd: het weekoverzicht
  gebruikte aanvankelijk een niet-gedefinieerde CSS-klasse; vervangen door
  correcte inline-stijl, met een nieuwe regressietest die dit bewaakt.
- Impact: geen databasewijziging, geen nieuwe Calculation Engine-module,
  geen protected-core-wijziging (expliciet geverifieerd: core/decision.js
  en core/progression.js bevatten geen enkele referentie aan de nieuwe
  functies). Eén bestaande test (fVoortgang.test.js D6) correct bijgewerkt
  van 10 naar 11 na de legitieme, nieuwe volume-aanroep.
- Verantwoordelijke: autonome implementatie door Claude tijdens een
  onbeheerde master-sprint, met expliciete voorafgaande toestemming. Niet
  door Maurice persoonlijk beoordeeld op het moment van mergen — ter review
  bij terugkeer.

## DEC-039
- Datum: 27 augustus 2026
- Beslissing: A2.6 (Exercise Detail Drill-down) gebouwd door de al bestaande
  show1RMChart()-modal uit te breiden, geen nieuwe modal/pagina gebouwd.
  MASTERSPRINT A2 formeel gesloten.
- Reden: discovery vóór het bouwen toonde aan dat show1RMChart() -- al
  gekoppeld aan elke oefeningregel in Voortgang -- al circa 80% van de
  gevraagde functionaliteit bevatte (e1RM-grafiek via de bestaande
  drawChart()-component, geschiedenislijst). In plaats van een nieuwe,
  grotere paginaarchitectuur te bouwen (expliciet af te wegen tegen P2 als
  de scope groot zou blijken), is de bestaande modal uitgebreid met vier
  reeds berekende, canonieke bronnen: trendlabel (computeExerciseTrends(),
  v4.62.0), beste-e1RM (afgeleid uit de al bestaande puntenreeks), PR per
  repbereik (loadRepPRs(), Sprint 16), en doel (peakGoalFor()).
- Alternatieven overwogen: een volledig nieuwe detailpagina/route bouwen --
  afgewezen, want de bestaande modal was al functioneel, al gekoppeld, en
  uitbreiding hield de scope klein en het risico laag.
- Impact: geen databasewijziging, geen nieuwe Calculation Engine-module,
  geen protected-core-wijziging (expliciet geverifieerd: core/decision.js
  en core/calculation.js bevatten geen enkele referentie aan de uitgebreide
  UI-functie). Bewezen via bug-terugzet-simulatie dat forecasting-taal
  correct als scope-overtreding wordt gedetecteerd.
- **FORMELE A2-AFSLUITING**: na A2.5 (weekoverzicht, oefeningtrend,
  PR-tijdlijn) en A2.6 (Exercise Detail Drill-down) bestaat er geen
  resterende P0- of P1-analytics-gap meer die V1 blokkeert. Resterende
  P2/backlog-items (week-vs-vorige-week-vergelijking, performance
  forecasting als aparte G2-lijn) worden bewust niet kunstmatig als reden
  gebruikt om A2 open te houden, conform de expliciete A2-closure-regel.
  A2 CLOSED.
- Verantwoordelijke: autonome implementatie door Claude tijdens een
  onbeheerde master-sprint, met expliciete voorafgaande toestemming. Niet
  door Maurice persoonlijk beoordeeld op het moment van mergen — ter review
  bij terugkeer.

## DEC-040
- Datum: 27 augustus 2026
- Beslissing: A3 Adaptive Training Intelligence — de bewezen chain break
  gesloten: het gecorroboreerde belastingssignaal (v4.60.0) en de
  per-oefening-progressietrend (v4.62.0) zijn toegevoegd als aanvullende
  context aan de al bestaande, canonieke pre-workout-aanbevelingsflow
  (evaluateProgAdjustment()/computeProgAdjustment()/m-prog-advies).
- Reden: A3-discoveryronde bewees dat deze twee signalen al bestonden en al
  berekend werden, maar uitsluitend in de AI-chatcontext zichtbaar waren --
  nooit in het daadwerkelijke, vóór-elke-training getoonde advies, het meest
  relevante en tijdige moment om ze te tonen.
- Kernprincipe: readiness-beslissing (computeProgAdjustment()) blijft de
  ENIGE bron van de daadwerkelijke sets/RPE-aanpassing. Load/trend-signalen
  zijn expliciet AANVULLENDE CONTEXT, geen nieuwe automatische beslissing --
  bewezen via bug-terugzet-simulatie dat de nieuwe functie nergens
  setsDelta/rpeDelta aanraakt.
- Belangrijke procesbevinding: bij aanvang van deze sprint werd ongecommitte,
  gedeeltelijk werk aangetroffen DIRECT OP MAIN (een schending van de vaste
  branch-discipline) -- veilig gered naar een nieuwe feature branch zonder
  ooit main te wijzigen (bevestigd: git status op main toonde leeg vóór en
  na de redding). Het aangetroffen werk was bovendien onvolledig (miste de
  corroboratedLoadSignal()-integratie volledig) en de versiedocumentatie
  (CHANGELOG/CURRENT_STATE) was nog niet bijgewerkt -- beide binnen deze
  sprint alsnog correct afgerond.
- Alternatieven afgewezen: geen wijziging aan protected computeProgAdjustment()
  zelf (zou een vijfde parameter/gewijzigde signature vereisen voor iets dat
  ook als aparte, aanvullende contextlaag kon -- lager risico, expliciet
  voorkeursuitkomst uit de opdracht).
- Impact: geen databasewijziging, geen nieuwe Calculation Engine-berekening,
  geen protected-core-wijziging (expliciet geverifieerd: core/decision.js
  bevat geen enkele referentie aan de nieuwe functie of ScheduleAdherenceCore).
- A3-eindconclusie: coherent pre-workout adaptive-oppervlak bereikt, geen
  P0/P1 meer resterend. A3 CLOSED.
- Verantwoordelijke: autonome implementatie door Claude tijdens een
  onbeheerde master-sprint, met expliciete voorafgaande toestemming. Niet
  door Maurice persoonlijk beoordeeld op het moment van mergen — ter review
  bij terugkeer.

## DEC-041
- Datum: 27 augustus 2026
- Beslissing: A4 Daily Readiness & Recovery 2.0 — de twee bewezen gaps
  gesloten: een consistentiebrug tussen Home-readiness en de pre-workout-
  aanbeveling, en een compacte Herstel & Readiness-detailweergave.
- Belangrijke correctie t.o.v. de eerste discovery-hypothese: aanvankelijk
  leek DecisionCore.readinessDay() (Home) een tweede, parallelle Decision
  Engine-functie t.o.v. computeProgAdjustment() (pre-workout). Nader
  onderzoek van de daadwerkelijke, protected code toonde aan dat
  readinessDay() INTERN exact computeProgAdjustment() aanroept -- er is dus
  geen dubbele Decision Engine, uitsluitend een verschil in de daadwerkelijk
  meegegeven inputs. Deze correctie is expliciet, transparant vastgelegd.
- Kernbevinding: Home geeft structureel altijd gevoel=null, pijn=null door
  aan readinessDay(), omdat de hrv_log-tabel deze kolommen niet heeft --
  dit is geen bug maar een structurele beperking van de brondata die Home
  gebruikt. Pre-workout haalt gevoel/pijn vers uit dezelfde check-in-sessie.
  Bewezen met echte, protected code (identieke dagfactor/herstel, Home
  toont 'ongewijzigd', pre-workout toont 'aangepast' met concrete redenen).
- Alternatieven afgewezen: geen wijziging aan protected computeProgAdjustment()
  of readinessDay() zelf (zou een vijfde/gewijzigde parameter vereisen voor
  iets dat ook als aparte, aanvullende presentatielaag kon -- lager risico).
  Geen nieuwe slaap-baselineformule ontworpen (bestond niet canoniek) --
  expliciet als ontbrekend gedocumenteerd i.p.v. stilzwijgend verzonnen.
- Impact: geen databasewijziging, geen nieuwe Calculation/Decision Engine-
  berekening, geen protected-core-wijziging (expliciet geverifieerd:
  core/decision.js en core/calculation.js bevatten geen enkele referentie
  aan de nieuwe functies). Bewezen via bug-terugzet-simulatie dat de
  consistentiebrug nergens setsDelta/rpeDelta wijzigt.
- A4-eindconclusie: Home-readiness bestond al en is correct; het verschil
  met pre-workout is niet langer misleidend; dezelfde canonieke basis wordt
  gebruikt; compacte herstel-detailweergave toegevoegd. Geen P0/P1 meer
  resterend. A4 CLOSED.
- Verantwoordelijke: autonome implementatie door Claude tijdens een
  onbeheerde master-sprint, met expliciete voorafgaande toestemming. Niet
  door Maurice persoonlijk beoordeeld op het moment van mergen — ter review
  bij terugkeer.

## DEC-042
- Datum: 27 augustus 2026
- Beslissing: A5 Real Device Validation & Live Training 2.0 — geen nieuwe
  mid-workout-connect-flow gebouwd (bestond al architecturaal correct);
  twee echte, bewezen bugs in de bestaande connect-functies gerepareerd.
- Reden: discovery toonde aan dat het apparaat-koppel-widget al ingebed is
  in de oefening-body zelf, identiek gerenderd tijdens actieve executie als
  daarbuiten. _c2repaint() werkt uitsluitend op een lokaal DOM-fragment,
  raakt sessionLog/activeInstanceId/resolvedWorkout/de trainingstimer niet.
  Het "hard requirement" van deze sprint bleek dus al vervuld door
  architectuurkeuzes uit eerdere sprints.
- Gevonden bug 1 (gestapelde subscriptions): subscribeMetrics()/
  subscribeConnection() in native/src/nativeConcept2BleTransport.js
  gebruiken array.push() -- de aanroepende UI-code legde de teruggegeven
  unsubscribe-functies nooit vast. Gerepareerd door exercise-specifieke
  unsubscribe-functies vast te leggen en vóór elke nieuwe subscriptie op
  te ruimen. Expliciet NIET de transportbrede unsubscribeMetrics()
  gebruikt, omdat dat een andere, gelijktijdig verbonden oefening in
  dezelfde training zou kunnen raken.
- Gevonden bug 2 (geen dubbel-tik-bescherming): busy-guards toegevoegd aan
  zowel het scannen (tkErgPair) als het verbinden (tkErgConnectDevice).
- Beide bugs bewezen via bug-terugzet-simulatie (tests W1/W6).
- Impact: geen databasewijziging, geen protected-core-wijziging (expliciet
  geverifieerd, inclusief de device-specifieke kernbestanden
  concept2Live.js/deviceIntegration.js). Minimale, precieze wijziging in
  twee bestaande functies, geen nieuwe architectuur.
- A5-status: het belangrijkste productrisico (mid-workout connect verliest
  de sessie) bleek NIET te bestaan; de twee gevonden bugs waren reële,
  maar kleinere robuustheidsgebreken, nu opgelost.
- Verantwoordelijke: autonome discovery, bewijsvoering en gerichte reparatie
  door Claude tijdens een onbeheerde master-sprint, met expliciete
  voorafgaande toestemming. Niet door Maurice persoonlijk beoordeeld op het
  moment van mergen — ter review bij terugkeer.

## DEC-043
- Datum: 27 augustus 2026
- Beslissing: A5-vervolg — functionele (niet uitsluitend statische)
  bewijsvoering toegevoegd voor mid-workout device-connect; een nieuwe,
  echte bug gevonden en gerepareerd (device-cleanup bij discard/finish).
- Nieuwe testmethode: core/fA5DeviceConnectE2E.test.js extraheert de
  daadwerkelijke functies (tkErgPair/tkErgSelect/tkErgConnectDevice) uit
  index.html en draait ze in een echte JS-omgeving (Node vm-module) tegen
  een gemockte transport en de echte trainingsstaat-variabelen. Dit is
  een methodologische verbetering t.o.v. de eerdere, uitsluitend
  regex-gebaseerde tests in fHardening.test.js -- beide blijven bestaan,
  complementair.
- Bewijs, niet aanname: de nieuwe testsuite is expliciet gedraaid tegen de
  ONGEREPAREERDE v4.65.0-code, met gemeten resultaat (3 connect-aanroepen
  i.p.v. 1, 3 gestapelde listeners i.p.v. 1 bij dubbel tikken; 2 gestapelde
  listeners i.p.v. 1 bij reconnect) -- geconcretiseerd, niet louter
  beweerd dat de v4.66.0-fix nodig was.
- Nieuwe bug gevonden (Prioriteiten 9/10): execLeaveDiscard() en
  finishSession() riepen nooit tkErgDisconnect() aan, waardoor een
  verbonden apparaat op de achtergrond actief bleef ná het einde van de
  training. Gerepareerd met een nieuwe tkErgDisconnectAll()-functie,
  bewezen via bug-terugzet-simulatie (tests X1/X5).
- Bewust niet gebouwd: cross-exercise device-switch-cleanup (twee
  verschillende oefeningen, elk met een eigen verbinding, zonder
  expliciete disconnect tussendoor) -- smaller randgeval, onderliggende
  transport is single-device, dus niet als blokkerende P0/P1
  geclassificeerd. Gedocumenteerd, geen architectuurwijziging gebouwd.
- Hardwarevalidatie: EXTERN BLOCKED — REAL PM5 VALIDATION (geen fysiek
  Concept2-apparaat beschikbaar in deze ontwikkelomgeving).
- A5-status: alle softwarematig bewijsbare eisen zijn aantoonbaar
  afgerond. FINAL DECISION: A5 SOFTWARE CLOSED — REAL DEVICE VALIDATION
  OPEN.
- Impact: geen databasewijziging, geen protected-core-wijziging.
- Verantwoordelijke: autonome, functionele bewijsvoering en gerichte
  reparatie door Claude tijdens een onbeheerde master-sprint, met
  expliciete voorafgaande toestemming voor doorwerken zonder tussentijdse
  bevestiging. Niet door Maurice persoonlijk beoordeeld op het moment van
  mergen — ter review bij terugkeer.

## DEC-044
- Datum: 27 augustus 2026
- Beslissing: post-A1-A5/G2 volledige roadmap-gap-audit uitgevoerd; #1
  geselecteerde gap (AMRAP-set-ondersteuning) autonoom gebouwd, getest en
  gemerged.
- G2 formeel geclassificeerd: DEFERRED BY EVIDENCE GATE (geen wijziging
  t.o.v. de eerdere G2-discoveryronde -- bevestigd, niet opnieuw
  onderzocht).
- Sporterreis-audit: post-workout-scherm bleek COMPLETE (deterministische
  kernconclusie vóór AI, per-oefening vervolgadvies, vorige-sessie-
  vergelijking, fail-safe foutafhandeling) -- geen actie.
- Geselecteerde #1: AMRAP-set-ondersteuning. Reden: expliciet, in een
  eerdere sprint (A1 Final Gap Closure, v4.61.0) vastgelegde
  architectuuranalyse markeerde dit als de laagste-drempel-kandidaat van
  vier onderzochte advanced-set-types -- maar bleef desondanks drie
  sprints (A1/A2/A3) ongebouwd. Directe relevantie voor Maurice's eigen
  CrossFit/HYROX-context.
- Kernbevinding vóór het bouwen: `sessions.sets_detail` is jsonb --
  bevestigd via Supabase-schema-query dat GEEN databasemigratie nodig is
  om de nieuwe `isAmrap`-vlag toe te voegen.
- Kernprincipe, expliciet uit de eerdere architectuurnotitie
  overgenomen: AMRAP-sets mogen de e1RM/PR-trendberekening niet vervuilen.
  Gerealiseerd door AMRAP-sets uit te sluiten van de "beste set"-selectie
  in buildStrengthSessionRow() (met veilige fallback wanneer alle sets
  AMRAP zijn). Bewezen met een functionele test (een zwaardere AMRAP-set
  wordt terecht niet als representatief gekozen) en via bug-terugzet-
  simulatie.
- Impact: geen databasewijziging, geen protected-core-wijziging (expliciet
  geverifieerd: core/decision.js en core/calculation.js bevatten geen
  enkele referentie aan AMRAP -- geen nieuwe Decision Rule, geen nieuwe
  1RM-formule).
- Verantwoordelijke: autonome audit, selectie, implementatie en merge door
  Claude tijdens een onbeheerde master-sprint, met expliciete voorafgaande
  toestemming voor de volledige cyclus zonder tussentijdse bevestiging.
  Niet door Maurice persoonlijk beoordeeld op het moment van mergen — ter
  review bij terugkeer.

## DEC-045
- Datum: 27 augustus 2026
- Beslissing: A6 Multi-Sport Interval Execution 1.0 — één generieke
  intervalarchitectuur geïntegreerd voor RowErg/SkiErg/BikeErg/Hardlopen,
  in plaats van vier losse sport-specifieke engines.
- Belangrijke bevinding vóór het bouwen: een reeds bestaand, zelfstandig
  ontwikkeld core/intervalEngine.js (IntervalEngineCore) bleek al aanwezig
  te zijn -- puur, deterministisch, 28/28 tests al groen, maar zonder
  enige UI-integratie. Deze sprint heeft dit NIET herbouwd, uitsluitend
  geïntegreerd (prescriptie-UI, executie-overlay, logging).
- Architectuurprincipe gevolgd: geen vier onafhankelijke sport-engines,
  één canoniek block/repeat-model met sportcontext erboven (CARDIO_TYPES
  blijft de bron voor per-sport metrics/eenheden).
- Kernprincipe, expliciet uit de bestaande core-documentatie
  overgenomen: geen schijnprecisie. DISTANCE/MANUAL-blocks eindigen nooit
  automatisch (geen live, device-onafhankelijke afstandsmeting bestaat).
  totalPlannedSeconds() retourneert null zodra niet alle blocks
  time-based zijn.
- Logging-beslissing: geen directe databaseschrijving vanuit de
  intervalmodule zelf. Vult uitsluitend bestaande cardio-invoervelden en
  het bestaande sessionLog.exNote-veld -- de bestaande, ongewijzigde
  finishSession()-schrijfweg blijft de enige bron van waarheid. Uitsluitend
  natuurlijk voltooide werk-blocks tellen mee (geen overtelling bij
  vroegtijdig doorklikken).
- Bewezen, niet alleen beweerd: de intervaltimer gebruikt exact hetzelfde
  wall-clock-patroon als de bestaande rusttimer; het niet-opruimen van een
  vorige timer (analoog aan het A5-gevonden BLE-listener-lek) wordt
  bewezen gedetecteerd via bug-terugzet-simulatie.
- Bewust buiten scope: EMOM (eigen sub-engine nodig, per eerdere
  architectuurnotitie), per-interval-detaillogging, FTP/critical power/
  critical speed, AI-targets, forecasting.
- Impact: geen databasewijziging, geen protected-core-wijziging (expliciet
  geverifieerd).
- Verantwoordelijke: autonome discovery, integratie en merge door Claude
  tijdens een onbeheerde master-sprint, met expliciete voorafgaande
  toestemming voor de volledige cyclus zonder tussentijdse bevestiging.
  Niet door Maurice persoonlijk beoordeeld op het moment van mergen — ter
  review bij terugkeer.

## DEC-047
- Datum: 30 augustus 2026
- Beslissing: een opdracht voor "Unified Account, Google/Apple Sign-In &
  Multi-Provider Payments" is NIET geïmplementeerd, maar uitsluitend
  gedocumenteerd/ontworpen (`docs/UNIFIED_IDENTITY_AND_PAYMENTS_CURRENT_STATE.md`)
  en als twee `PLANNED`-capabilities aan `ROADMAP_INDEX.json` toegevoegd
  (`FEDERATED-IDENTITY-001`, `MULTI-PROVIDER-BILLING-001`).
- Reden: repo-brede roadmap-audit bevestigde 0 treffers voor social login
  (Google/Apple Sign-In), Google Play Billing, of Apple StoreKit als
  bestaande, goedgekeurde mastersprint of capability. F12 is expliciet
  vrijgegeven voor MS-F12-01 t/m MS-F12-04 (Mollie als enige onderzochte
  provider voor Billing & Reconciliation) — deze opdracht beschreef een
  substantiële, nieuwe scope-uitbreiding, geen uitvoering van een reeds
  bestaande, vrijgegeven mastersprint. De opdracht zelf bevatte de
  expliciete governance-instructie om in dit geval te documenteren/
  ontwerpen in plaats van te implementeren.
- Alternatieven overwogen: direct implementeren (afgewezen — zou een
  ongeplande, zeer omvangrijke scope-uitbreiding midden in een lopende,
  wél vrijgegeven sprint (MS-F12-04) betekenen, met reëel risico op
  precies het soort shadow-architectuur en overclaimde status die
  eerder in F11/F12 al meermaals actief is opgespoord en gerepareerd).
- Impact: geen code-/database-wijziging voor identity/multi-provider-
  billing. MS-F12-04 (Mollie) wordt ongestoord afgerond als het eerste,
  bewezen providerpatroon. Een toekomstige, expliciete Product Owner-
  vrijgave van de twee nieuwe PLANNED-capabilities kan op deze audit
  voortbouwen zonder opnieuw te hoeven onderzoeken.
- Verantwoordelijke: autonome beoordeling door Claude, conform de
  expliciete, in de opdracht zelf aanwezige governance-regel.


## DEC-048
- Datum: 30 augustus 2026
- Beslissing: financiële audit-records (billing_events) worden nooit
  verwijderd bij accountverwijdering. De foreign-key naar de gebruiker
  gebruikt ON DELETE SET NULL (nooit CASCADE) -- de koppeling naar de
  persoon verdwijnt, de financiële geschiedenis zelf (bedrag, plan,
  status, tijdstip) blijft bewaard.
- Reden: MS-F13-05 (Privacy & Security Recertification) vereiste een
  expliciete data-retentiebeslissing voor financiële records. Dit
  gedrag bestond al impliciet sinds MS-F12-04 (de ON DELETE SET NULL-
  keuze werd toen al gemaakt), maar was nooit expliciet als bewuste
  productbeslissing vastgelegd of getest in de context van account-
  verwijdering. Live geverifieerd (transactie zonder commit): een
  verwijderde auth.users-rij laat het bijbehorende billing_events-
  record volledig intact bestaan, met target_user_id automatisch op
  NULL.
- Alternatieven overwogen: CASCADE-verwijdering van billing_events bij
  accountverwijdering (afgewezen -- zou mogelijk fiscale/boekhoudkundige
  bewaarplichten schenden en maakt reconciliatie/geschillenbeslechting
  na verwijdering onmogelijk).
- Impact: geen code-wijziging nodig (het gedrag bestond al correct).
  Nieuwe regressietest (core/fDeleteAccountBillingRetention.test.js)
  bewaakt dit voortaan expliciet, inclusief sabotagebewijs (ON DELETE
  CASCADE tijdelijk gesimuleerd, gedetecteerd, teruggedraaid).
- Verantwoordelijke: autonome beoordeling door Claude tijdens MS-F13-05.

## B9-09 -- Nutrition expliciet vrijgegeven binnen Benchmark 9.0 Floor Program

- **Datum:** 31 augustus 2026.
- **Historische status vóór deze beslissing:** Nutrition stond in
  oudere Handbook-documentatie (o.a. `Trainingskompas_Development_
  Handbook_H1_Productvisie.md`) als toekomstig, speculatief, niet-
  gecommitteerd onderdeel, zonder concrete fase of implementatiedatum.
  Deze historische documenten worden niet met terugwerkende kracht
  herschreven -- ze beschreven de destijds correcte, nog-niet-besloten
  status.
- **Beslissing:** de Product Owner heeft Nutrition expliciet vrijgegeven
  als B9-09 Nutrition Foundation binnen het Benchmark 9.0 Floor Program,
  met een expliciete, harde scope-begrenzing: uitsluitend een
  registratie-fundament (dataset/schema/UI), GEEN calorie-/macrodoel-
  engine, GEEN dieetadvies, GEEN voedingsmiddelendatabase, GEEN
  Nutrition AI Coach. B9-10 (Nutrition Product) en B9-11 (Nutrition
  Intelligence) vereisen een aparte, latere, expliciete vrijgave.
- **Wat B9-09 wel omvat:** `nutrition_entries` (één canonieke tabel,
  event-semantiek: meal/snack/hydration/other, met optionele
  `timing_context` t.o.v. training), user-entered provenance,
  missing-!=-zero-semantiek, default-private RLS, een eenvoudig
  registratiescherm (Lichaam -> Voeding).
- **Wat B9-09 bewust niet omvat:** caloriedoelen, macrodoelen, BMR/TDEE-
  berekening, voedingsmiddelendatabase/barcode, AI-integratie, Social-
  sharing van voedingsdata, allergie-/dieetvoorkeurenregistratie (data-
  minimalisatie, geen directe productbehoefte vastgesteld).
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-09-mastersprint.

## B9-H1 -- Benchmark 9+ Hardening Program vastgelegd, F15 gepauzeerd

- **Datum:** 31 augustus 2026.
- **Historische status vóór deze beslissing:** F15 "Beyond Benchmark"
  stond als de volgende, geselecteerde roadmapfase na afsluiting van
  de Benchmark 9.0 Floor Program-reeks (B9-01 t/m B9-11). Dit was de
  destijds correcte, geldende planning -- niet met terugwerkende
  kracht herschreven.
- **Beslissing:** de Product Owner heeft F15 voorlopig gepauzeerd en
  in plaats daarvan het **Benchmark 9+ Hardening Program** vrijgegeven:
  een reeks audit-/verbeteringssprints (B9-H1 t/m B9-H9) met als doel
  dat elke kritieke productdimensie afzonderlijk (niet gemiddeld)
  aantoonbaar >=9.0 scoort, vóórdat F15 opnieuw wordt geselecteerd.
- **Programma-indeling (voorlopig, geen fictieve CLOSED-statussen):**
  B9-H1 Complete Rebenchmark & Gap Registry, B9-H2 Athlete Core 9+,
  B9-H3 Strength & Exercise Intelligence 9+, B9-H4 Endurance &
  Multisport 9+, B9-H5 Recovery/Health/Women's Performance/Nutrition
  9+, B9-H6 AI/Analytics/Longitudinal Intelligence 9+, B9-H7 Social/
  Coach/Gym 9+, B9-H8 Platform/Security/Reliability 9+, B9-H9 Final
  Competitive Rebenchmark & 9+ Certification.
- **Nieuw, verplicht projectprincipe (vanaf nu geldend):** een
  absolute UX-gate -- elke wezenlijke, zichtbare wijziging aan een
  bestaand of nieuw scherm (navigatie, hoofdmenu, primaire CTA's,
  informatiehiërarchie, globale look-and-feel) vereist eerst een
  concreet voorstel/mock-up en expliciete Product Owner-goedkeuring
  vóór implementatie. Kleine, evidente technische bugfixes blijven
  hiervan uitgezonderd.
- **B9-H1-uitkomst:** volledige rebenchmark uitgevoerd (zie
  `docs/BENCHMARK_9_PLUS_SCORECARD.md`), een centrale gap-registry
  aangelegd (`docs/BENCHMARK_9_PLUS_GAP_REGISTRY.md`), en één scherm/
  navigatievraagstuk (B9G-UX-001: discoverability van Sociaal en
  Voeding) geselecteerd voor de eerste UX-review
  (`docs/UX_NEXT_SCREEN_BRIEF.md`). Geen enkele kritieke dimensie is
  in deze audit bevestigd op >=9.0 met HIGH confidence, behalve
  Platform-Security. Meerdere domeinen (Strength/Recovery/Women's
  Performance/AI/Analytics/Coach/Gym) kregen NOT ENOUGH EVIDENCE --
  eerlijk vastgelegd, geen verzonnen score.
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H1-mastersprint.

## B9-H2A -- Canonical Gym/Club/Organization Architecture

- **Datum:** 1 september 2026.
- **Context:** de Benchmark 9+ Functional Deep-Dive vond twee
  parallelle Gym/Club-datamodellen: een ouder, actief systeem
  (`users.gym_id`/`gym_role`, `gyms`) en een nieuwer, grotendeels
  ongebruikt systeem (`organizations`/`teams`/`memberships`).
- **Kritieke, live geverifieerde bevindingen:** (1) `gyms.organization_id`
  heeft al een bestaande foreign-key naar `organizations(id)` (ON
  DELETE CASCADE) -- de architectuur was al eerder voorbereid op
  precies deze consolidatie, nooit afgemaakt. (2) De Coach/PT- en Team
  Operations-infrastructuur (`coach_program_assignments.organization_id`,
  `team_events.team_id`) is al gebouwd bovenop het `organizations`/
  `teams`-model, niet op `gyms`/`gym_id`. (3) Slechts 1 productie-gym
  bestaat, migratierisico minimaal.
- **Beslissing:** Strategy C (Controlled Consolidation).
  `organizations`/`teams`/`memberships` worden de canonieke
  organisatie-/lidmaatschap-laag. `gyms` blijft bestaan als 1:1
  product-uitbreiding (branding/billing/pincode) via de bestaande FK.
  `coach_athlete_relationships` blijft bewust standalone (onafhankelijk
  van organisatie-lidmaatschap). `users.gym_id`/`gym_role` wordt op
  termijn, gefaseerd gemigreerd naar `memberships` -- niet in deze
  sprint uitgevoerd (geen big-bang migratie).
- **Alternatieven overwogen:** Strategy A (System A uitbreiden --
  zou feitelijk memberships opnieuw bouwen), Strategy B (direct,
  volledig migreren zonder tussenstap -- onnodig risicovol gezien de
  al bestaande, ongebruikte brug).
- **Impact:** geen code-/schema-wijziging in deze sprint (uitsluitend
  architectuurvaststelling en documentatie). Vervolgstappen (migratie-
  fasen, UX-review voor Team/Coach-schermen) vereisen aparte,
  toekomstige sprints/vrijgaves.
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H2A-mastersprint.

## B9-H2B -- Organization Controlled Consolidation (Strategy C uitgevoerd)

- **Datum:** 1 september 2026.
- **Context:** B9-H2A koos formeel Strategy C (Controlled
  Consolidation). B9-H2B voert deze daadwerkelijk, technisch uit.
- **Uitgevoerd:** migratie_v539.sql, live toegepast. De bestaande gym
  (`art-crossfit`) gekoppeld aan een nieuwe, canonieke
  `organizations`-rij (deterministische id = gym-id). 5 bestaande
  gebruikers gemigreerd naar canonieke `memberships`-rijen (1 owner, 4
  members).
- **Vier issues zelf gevonden en gerepareerd tijdens uitvoering:**
  type-mismatch (text vs uuid), een trigger die de legitieme, eerste
  koppeling blokkeerde, een tot dan toe onbekende constraint
  (`gyms_owner_context_chk`) die bevestigde dat `owner_email` leeg
  moet zijn na koppeling, en een idempotentie-bug (NULL-waarden in een
  unique constraint worden door PostgreSQL nooit als gelijk
  beschouwd) -- live, adversarial bevestigd en gecorrigeerd.
- **Security, live bevestigd:** een legacy `gym_role='owner'`-waarde
  voor een andere gym geeft geen enkele canonieke autorisatie-impact
  (kritieke sabotage S2, geslaagd). Cross-tenant coach-assignment-
  spoofing geweigerd. Anon-toegang tot de organization-helper-functie
  geweigerd.
- **Impact:** `organizations`/`teams`/`memberships` zijn nu de
  daadwerkelijk gevulde, canonieke bron. `users.gym_id`/`gym_role`
  blijven bestaan als read-only, non-authoritative compatibility
  (deprecation-plan vastgelegd, geen big-bang verwijdering). Geen
  UI/UX gewijzigd.
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H2B-mastersprint.

## B9-H2C -- Team Operations Functional Enablement, kritieke RLS-gap gerepareerd

- **Datum:** 1 september 2026.
- **Context:** Team Operations had de laagste benchmarkscore (6.8).
  Het backend-fundament bestond al (vorige sprint), maar was 0%
  bruikbaar zonder UI. Deze sprint bouwt de resterende, functionele
  backend-laag uit: meeting-time, event-lifecycle, availability/
  attendance-splitsing, recurring-events, notificatie-integratie.
- **Kritieke, zelf gevonden functionele gap tijdens UI-requirements-
  analyse:** de bestaande RLS op `event_attendance` stond uitsluitend
  self-mutatie toe -- een coach kon geen aanwezigheid voor een ander
  teamlid registreren, een kernvereiste van teamoperaties. Nieuwe
  RLS-policies toegevoegd die coach/staff toestaan attendance van
  anderen te muteren, terwijl availability strikt self-only blijft.
  Live, adversariaal bevestigd op beide punten.
- **Impact:** Team Operations backend/functional foundation nu
  compleet voor de volledige, in de opdracht beschreven operationele
  lus. Geen UI gebouwd -- vijf concrete product-capabilities
  gedocumenteerd voor Product Owner-beoordeling
  (`docs/B9_H2C_TEAM_OPERATIONS_UI_REQUIREMENTS.md`).
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H2C-mastersprint.

## B9-H2D -- Coach/PT: corrigerende bevinding (F10 al bewezen, gemiste eerdere audit)

- **Datum:** 1 september 2026.
- **Context:** de opdracht ging uit van een verouderde aanname
  (Coach/PT = 7.5, weinig bewezen backend). Existing-state audit
  onthulde dat een volledige, eerdere mastersprint-serie (F10, PR
  #142-#148) Coach/PT al "CLOSED — READY FOR F11 SELECTION" had
  bereikt: relationship/consent/scopes/roster/programming/assignment/
  materialisatie/adherence/AI-intelligence, 146 tests, 0 UI. De
  eerdere Benchmark 9+ Functional Deep-Dive had dit gemist door
  uitsluitend op tabelnamen te zoeken zonder de bijbehorende Core-
  modules en tests te controleren.
- **Zelfstandig, opnieuw geverifieerd:** 79 kern-testsuites herdraaid
  (0 gefaald), self-elevation en cross-coach-scenario's live,
  adversariaal herbevestigd na de B9-H2A/B/C-architectuurwijzigingen
  -- geen regressie.
- **Twee echte, nieuwe gaten gevonden:** coach-notes/feedback
  ontbreken volledig; entitlement-gating (Coach Pro) ontbreekt
  volledig (elke gebruiker kan vandaag coach-functionaliteit
  gebruiken ongeacht abonnement -- geen actieve privacy-/security-
  schending, wel een ontbrekende commerciële grens).
- **Impact:** geen code-/schema-wijziging in deze sprint (audit-only).
  B9G-COACH-001 gecorrigeerd met de nu volledige, accurate status.
  Twee nieuwe gap-entries (B9G-COACH-002/003) toegevoegd.
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H2D-mastersprint.

## B9-H3A -- Devices/Wearables: corrigerende bevinding (smalle, niet brede architectuur)

- **Datum:** 1 september 2026.
- **Context:** de Product Owner gaf een architectuurrichting: één
  generieke, sport-agnostische device-laag voor alle sporten. Audit
  toonde aan dat de bestaande device-architectuur (569+ tests, 0
  gefaald) grondig en correct is, maar functioneel beperkt tot twee
  smalle assen: Google Health-recovery (HRV/RHR/sleep) en Concept2-
  ergometer (real-time, lokaal). Geen enkele cross-sport cloud-
  provider (Garmin/Polar/WHOOP/Strava/etc.) is geïmplementeerd -- alle
  overige sporten gebruiken uitsluitend handmatige invoer.
- **Zelfstandig geverifieerd:** het generieke normalisatiepatroon in
  `core/deviceIntegration.js` (`normalizeMetric`/`normalizeWorkout`/
  `normalizeSeries`) is al het juiste architectuurpatroon voor
  toekomstige provider-uitbreiding, maar wordt uitsluitend door
  Concept2 gebruikt. Live, adversariaal herbevestigd: DEV-S1/DEV-S2
  (anon/cross-user-toegang tot wearable-connecties) correct geweigerd,
  DEV-S7 (tokens na account-deletion) al correct gedekt.
- **Impact:** geen code-/schema-wijziging (audit-only). B9G-DEV-001
  gecorrigeerd, nieuwe B9G-DEV-002 toegevoegd voor de bredere,
  ontbrekende cross-sport-integratie. Een volledige, generieke cross-
  sport architectuur bouwen vereist een aparte, toekomstige sprint met
  echte provider-OAuth-toegang (niet beschikbaar binnen deze sessie).
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H3A-mastersprint.

## B9-H3B -- Eerste, echte cross-sport cloud provider ingestion gebouwd

- **Datum:** 1 september 2026 (autonome nachtsprint).
- **Context:** B9-H3A stelde vast dat de bredere, cross-sport cloud-
  ingestion nog niet bestond. Garmin bleek extern geblokkeerd (geen
  developer-toegang). Gekozen fallback: uitbreiding van de bestaande,
  al geautoriseerde Google Health-integratie met het officiële
  `exercise`-datatype (Running/Cycling-activity-data).
- **Gebouwd:** `core/cloudActivityIngestion.js` (Provider Adapter +
  Sport Mapper + Metric Mapper), `netlify/functions/wearable-sync-
  activities.js` (nieuwe, geïsoleerde Netlify-functie), `netlify/
  functions/_wearableAuthLib.js` (gedeelde, herbruikbare auth-helper),
  `migratie_v541.sql` (nieuwe `upsert_provider_activity()` RPC).
- **Twee zelf gevonden en gerepareerde kritieke bugs:** (1) PostgREST
  se generieke `on_conflict`-parameter ondersteunt geen partial-index-
  WHERE, opgelost via een eigen, atomaire RPC; (2) de oorspronkelijke
  update-logica zou een handmatige gebruikerscorrectie stil hebben
  kunnen overschrijven bij een volgende sync -- opgelost met expliciete
  manual-data-protection, live bewezen.
- **Architectuur:** de bestaande, canonieke `activities`-tabel bleek
  al volledig voorbereid (provenance/dedupe-kolommen bestonden al) --
  geen schemawijziging nodig. `runningIntelligence.js`/
  `cyclingIntelligence.js` verwerken de nieuwe, provider-afkomstige
  rijen al, ongewijzigd, generiek.
- **Externe blokkade, niet opgelost binnen deze sessie:** real-API/
  account/device-validatie (mogelijk vereist een Google Cloud
  Console-scope-vrijgave door de Product Owner).
- **Verantwoordelijke:** Product Owner (expliciete, autonome
  nachtsprint-vrijgave), uitgevoerd door Claude tijdens B9-H3B.

## B9-H3C -- Real provider validatie: extern geblokkeerd, één echte bug gerepareerd

- **Datum:** 1 september 2026.
- **Context:** poging om de B9-H3B-software daadwerkelijk te valideren
  tegen een echte Google-account/API/device. Repo-brede scan bevestigt
  0 credentials/omgevingstoegang beschikbaar -- real-validatie volledig
  extern geblokkeerd, geen technische omissie van deze sessie.
- **Zelf gevonden en gerepareerde echte bug:** `wearable-sync-
  activities.js` kon geen onderscheid maken tussen een scope-tekort
  (bestaande gebruiker met een oud, vóór B9-H3B verkregen token) en
  een generieke provider-fout. Onderzocht via publieke Google-
  foutrapporten en gerepareerd: een specifieke, herkenbare
  `scope_missing`-status toegevoegd, gebaseerd op Google se officiële
  403-foutcontract (`insufficientPermissions`/`ACCESS_TOKEN_SCOPE_
  INSUFFICIENT`). De bestaande, kritieke HRV/RHR/sleep-sync is hierbij
  niet aangeraakt.
- **Kritieke, officieel geverifieerde bevinding:** een Google OAuth-
  project in "Testing"-modus vereist test-user-registratie en heeft
  7-dagen-verlopende refresh tokens -- of dit voor Trainingskompas
  geldt, kon niet worden vastgesteld zonder Google Cloud Console-
  toegang. Vastgelegd als exacte, minimale externe actie voor de
  Product Owner (3 stappen, 5-10 minuten).
- **Impact:** B9G-DEV-002 blijft expliciet PARTIAL, niet CLOSED --
  geen docs-only closure zonder daadwerkelijk real-world bewijs.
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H3C-mastersprint.

## B9-H4 -- Recovery & Health Context: bevestigd volwassen, één nieuwe limitatie gevonden

- **Datum:** 1 september 2026.
- **Context:** forensische audit van de volledige Recovery/Health-
  keten. Bleek al buitengewoon volwassen (F7/F8-mastersprint-serie,
  210+ tests herbevestigd, 0 regressie).
- **Bevestigd correct:** missing != zero, HRV als multi-signaal (nooit
  enkelvoudige trigger), geen parallelle waarheden, RLS/coach-scope-
  gating, account deletion.
- **Nieuwe, wetenschappelijk onderbouwde bevinding:** Google Health se
  HRV-veld kan zowel RMSSD (Garmin/Fitbit/Oura) als SDNN (Apple)
  representeren, zonder dit vast te leggen -- de bestaande code neemt
  RMSSD aan. Praktische impact vandaag laag; potentieel relevant bij
  toekomstige apparaatwissel. Niet zelfstandig gerepareerd (vereist
  live Google-API-verificatie, niet beschikbaar).
- **Impact:** geen code-/schema-wijziging aan de kernlogica; nieuwe
  Metric Contracts-documentatie en een nieuwe testsuite (8/8) die de
  bevindingen vastlegt.
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H4-mastersprint.

## B9-H5 -- Women's Performance: een echte bug gevonden en gerepareerd (forced 28-day model zonder confidence)

- **Datum:** 1 september 2026.
- **Context:** forensische audit van Women's Performance (F8-serie,
  151+ bestaande tests herbevestigd, 0 gefaald).
- **Zelf gevonden en gerepareerde bug:** `estimatedPhaseFromDay()`
  gebruikte een stille 28-dagen-fallback bij onvoldoende
  cyclusgeschiedenis, zonder dit te onderscheiden van een gebruiker
  met een betrouwbare, gemeten gemiddelde cycluslengte. Nieuwe
  `estimatedPhaseConfidence()`-functie toegevoegd (unavailable/low/
  medium/high, gebaseerd op data-volledigheid), doorgegeven via
  `cycleContext()`. Live sabotage bevestigt de fix.
- **Bevestigd correct:** causale/medische taal (0 overtredingen),
  Decision Rules-grens (0 categorie-gebaseerde trainingsregels), RLS/
  coach-scope-isolatie (aparte `WOMENS_PERFORMANCE`-scope, live
  bevestigd).
- **Impact:** kleine, veilige, backward-compatible Calculation-
  uitbreiding, geen schemawijziging, geen APP_VER-bump nodig.
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H5-mastersprint.

## B9-H6 -- Connected Equipment: BikeErg-splitbasis-bug gevonden en gerepareerd

- **Datum:** 1 september 2026.
- **Context:** forensische audit van Concept2 (RowErg/SkiErg/BikeErg)
  en generieke Connected Equipment-architectuur (95+10 bestaande
  tests herbevestigd, 0 gefaald).
- **Zelf gevonden en gerepareerde echte bug:** BikeErg gebruikte een
  onjuiste 500m-splitbasis in de handmatige-invoer-configuratie
  (index.html), terwijl Concept2 se eigen, officiële conventie
  (meervoudig bevestigd) 1000m is. De realtime PM5-code had dit al
  correct. Gecorrigeerd, plus de verouderde testverwachting in
  core/cardio.test.js bijgewerkt.
- **Belangrijke, architecturale bevinding, niet opgelost:** Concept2-
  data loopt via de oudere `sessions`-tabel, niet via de canonieke
  `activities`-tabel -- geen consumptie door runningIntelligence/
  cyclingIntelligence. Vastgelegd als P2 voor een toekomstige,
  aparte, grote migratie-sprint.
- **Vendor-onderzoek:** EGYM/Technogym hebben officiële APIs maar
  vereisen een externe partnerschapsaanvraag.
- **Impact:** kleine, veilige runtime-fix (APP_VER-bump), geen
  schemawijziging.
- **Verantwoordelijke:** Product Owner (expliciete vrijgave-opdracht),
  uitgevoerd door Claude tijdens de B9-H6-mastersprint.

## B9-H6B -- Concept2/sessions vs activities: architectuurscheiding zelfstandig herbevestigd, geen migratie

- **Datum:** 2 september 2026 (autonome long-run-sprint).
- **Context:** onderzocht of Concept2-data (sessions) veilig naar de
  canonieke activities-architectuur gemigreerd moest worden.
- **Bevinding:** sessions is de generieke workout-execution-log
  (kracht/WOD/ergometer), activities is specifiek voor standalone
  endurance. Geen parallelle waarheden -- bewuste, correcte scheiding.
  Live productiedata (118 sessions, 11 met ergometer-velden) bevestigt
  geen functionele noodzaak voor migratie.
- **Besluit:** geen migratie, geen dual-write. Harde
  regressiebescherming gebouwd tegen het B9-H6-pace-basis-defect.
- **Verantwoordelijke:** Product Owner (autonome long-run-vrijgave),
  uitgevoerd door Claude.

## Long-run-sprint -- HRV metric-type-onzekerheid expliciet vastgelegd

- **Datum:** 2 september 2026 (autonome long-run-sprint, na B9-H6B).
- **Context:** het bekende B9-H4-P2-item (RMSSD vs SDNN niet
  vastgelegd) werd heronderzocht op de vraag: kan dit veilig verbeterd
  worden ZONDER real Google API-toegang? Antwoord: ja, gedeeltelijk --
  de onzekerheid zelf kan expliciet worden vastgelegd, ook al kan de
  daadwerkelijke waarde nog niet worden bepaald.
- **Gebouwd:** `hrv_log.hrv_metric_type` (rmssd/sdnn/unknown), default
  'unknown' voor alle bestaande en nieuwe rijen. Live bevestigd: alle
  71 bestaande rijen kregen correct 'unknown', geen enkele rij kreeg
  een geraden waarde.
- **Impact:** kleine, veilige, additieve migratie. Geen overclaim: de
  daadwerkelijke RMSSD/SDNN-bepaling blijft afhankelijk van toekomstige
  real-API-toegang (B9-H3C-blokkade, ongewijzigd).
- **Repo-brede conclusie deze long-run-sprint:** na B9-H6B en deze
  micro-sprint is er geen resterende, softwarematig uitvoerbare
  Benchmark 9+ functional gap gevonden binnen de onderzochte scope die
  niet in een van de drie uitgesloten categorieën valt (UI-beslissing,
  Product Owner-productbeslissing, externe blokkade). Zie
  `docs/BENCHMARK_9_PLUS_FUNCTIONAL_PROGRESS.md` voor het volledige
  overzicht per domein.
- **Verantwoordelijke:** Product Owner (autonome long-run-vrijgave),
  uitgevoerd door Claude.

## Technical Foundation -- Admin-PIN was geen authorization-boundary; RLS defense-in-depth toegepast

- **Datum:** 3 september 2026.
- **Context:** forensisch onderzoek naar de gedeelde admin-PIN (target-architectuur verbiedt dit expliciet als mechanisme).
- **Bevinding:** de PIN gaf nooit zelfstandig privilege -- alle gevoelige acties waren al server-side/RLS-beschermd. Twee `WITH CHECK (true)`-INSERT-policies bleken bij live onderzoek geen exploiteerbaar gat (trigger-bescherming), maar zijn alsnog als defense-in-depth gehard naar het bestaande, bewezen rolgebaseerde patroon.
- **Niet gedaan:** verwijderen van `s-admin-pin` zelf (UX-wijziging, buiten scope) en migratie van de gym-join-flow naar canonical memberships (vereist aparte PO-goedkeuring).
- **Verantwoordelijke:** Product Owner (Technical Foundation Masterprint-opdracht), uitgevoerd door Claude, onafhankelijk live geverifieerd (eigen adversariële insert-test, trigger-bevestiging, RLS-policy-vergelijking).
