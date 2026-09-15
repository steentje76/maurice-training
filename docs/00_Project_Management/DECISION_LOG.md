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

## Technical Foundation Track B -- canonical gym-migratie (strangler, geen destructieve migratie)

- **Datum:** 3 september 2026.
- **Context:** gecontroleerde uitfasering van het legacy Gym-model, uitsluitend technisch (geen UX-wijziging), na expliciete Product Owner-vrijgave onder de voorwaarde CURRENT USER FUNCTION -> SAME USER FUNCTION -> CANONICAL BACKEND.
- **Bevinding:** canonical data was al 1:1 aanwezig (B9-H2B); er bestaat 0 actieve join-flow naar legacy. gym-team.js list-actie migreert naar canonical (organizations+memberships), update_role schrijft dual (TRANSITIONAL) zodat de bestaande exercise_equipment/equipment_catalog-RLS (die nog gym_role_level leest) niet regresseert.
- **Zelf gevonden en gerepareerd, buiten de oorspronkelijke scope:** gym-team-set-pin.js had een hardcoded, nog 0-indexed drempel die sinds de Track A-fix een manager onterecht toegang gaf tot het instellen van de coach-pincode (bevoegdheid uitsluitend voor owner bedoeld). Gerepareerd en live geverifieerd.
- **Niet gedaan:** volledige RLS-migratie van exercise_equipment/equipment_catalog naar uitsluitend organization_id (aparte, latere, zuiver technische sprint); verwijderen van legacy kolommen/functies (geen bewezen noodzaak, geen destructieve migratie zonder bewijs).
- **Verantwoordelijke:** Product Owner (expliciete Track B-vrijgave), uitgevoerd door Claude, elke aanname live, onafhankelijk herverifieerd.

## Hotfix -- Team access role-gate regressie na PR #323

- **Datum:** 11 september 2026.
- **Context:** audit van de canonical Profiel-IA (PR #323) legde bloot dat
  `checkTeamAccess()` nog naar het verwijderde element `profiel-team-card`
  verwees. De functie gaf zich daardoor altijd onmiddellijk gewonnen: `whoami`
  werd nooit meer uitgevoerd, `teamRoleLevel` bleef permanent op de
  init-waarde -1 staan, en de nieuwe rij "Organisatie & team" was
  onvoorwaardelijk zichtbaar voor iedereen, ook solo-sporters zonder team.
- **Aanvullende bevinding (al eerder als RC0-comment in de code vastgelegd,
  nu pas gerepareerd):** `teamRoleLevel===-1` betekende zowel bevestigd-solo
  (na een geslaagde whoami) als onbekend/mislukt (vóór whoami, of bij een
  netwerk-/serverfout). `canEditEquipmentCatalog()` en
  `canCreatePersonalExercise()` gebruikten die -1 zonder dat onderscheid,
  terwijl `openBeheer()` het al wel correct deed via `teamAccessResolved`.
- **Besluit (PO-akkoord):** `checkTeamAccess()` spreekt nu het canonical
  element `#pf-org-team-row` aan; zichtbaarheid volgt pas na een geslaagde
  whoami (drempel coach+, ongewijzigd). `canEditEquipmentCatalog()` en
  `canCreatePersonalExercise()` zijn fail-closed gemaakt: zonder
  `teamAccessResolved===true` geen enkele privilege, dus UNKNOWN krijgt nooit
  meer stilzwijgend solo-gedrag via -1. `openBeheer()` ongewijzigd (was al
  correct), nu met tests geborgd.
- **Scope bewust NIET meegenomen (aparte PO-besluiten vereist):** hero-CSS-
  fidelity, Feedback/Help-duplicatie, Privacy/Export-canonical-home,
  organisatie/club-branding, thema/kleuren, bottom-nav.
- **Tests:** `core/fTeamAccessRoleGateHotfix.test.js` (nieuw, 49/49) —
  RESOLVED/UNRESOLVED per rol (solo/lid/coach/manager/owner), whoami-fout,
  netwerkfout, geen sessie, rijzichtbaarheid, `openBeheer()`-consistentie.
  Preservation 65/65, regressie 353/353 (was 352, +1 nieuw testbestand).
  Geen databasewijziging.
- **Verantwoordelijke:** Product Owner (expliciete hotfix-vrijgave, 11
  september 2026), uitgevoerd door Claude.

## Profiel Sprint 2 -- canonical visuele fidelity + UX-semantiek

- **Datum:** 11 september 2026.
- **Context:** PR #324 herstelde de functionele team-access-regressie; de
  visuele hero-donkerheid en enkele copy-/navigatie-onvolkomenheden bleven
  daarna nog open (root cause voor de hero al eerder forensisch bewezen:
  een verouderde Sprint 5.2 CSS-regel voor `#s-profiel .pf-hero` stond later
  in de cascade dan de canonical witte regel en won bij gelijke specificity).
- **Besluit (PO visuele goedkeuring):** hero-maatvoering (padding 16px,
  border-radius 16px, avatar 60px) ongewijzigd gelaten -- alleen de vier
  conflicterende oude declaraties (`.pf-hero` achtergrond, `.pf-hero-nm`/
  `.pf-hero-sub`-tekstkleur, `.pf-hero-edit svg`-stroke) verwijderd; de
  canonical lichte regel is nu de enige bron (geen `!important`, geen derde
  override-laag).
- **Copy gecorrigeerd naar wat de route werkelijk doet:** "Privacy & delen"
  krijgt de subtitel "Wat we opslaan en waarom" (identiek aan de kop van
  `s-privacy` zelf); "Account & data" krijgt "E-mail, wachtwoord en
  gegevens exporteren" (verwijderen expliciet weggehaald -- dat blijft een
  aparte destructieve actie).
- **Source-aware back-navigation:** `s-privacy`, `s-help` en `s-meldingen`
  gingen bij sluiten altijd hardcoded naar `s-settings`, ook vanuit Profiel.
  Nieuwe `tkNavGoBack()`-helper hergebruikt de al bestaande `tkNavStack`
  (dezelfde infrastructuur als de Android-hardware-terugknop) -- geen
  nieuwe state.
- **Feedback vs Help & ondersteuning:** beide riepen kaal `go('s-help')`
  aan, zonder enig verschil voor de gebruiker. Nieuwe `openHelpFeedback()`
  navigeert naar Help en scrollt/focust direct de bestaande "Contact &
  feedback"-kaart (`tabindex="-1"` + `scrollIntoView`). Geen tweede
  feedbackformulier gebouwd.
- **Preview-databevinding (PO-check):** de eerder getoonde Sprint-2-preview
  gebruikte illustratieve voorbeelddata ("Krachttraining", "Sterker &
  fitter") uitsluitend binnen een losstaand previewwidget. Geverifieerd:
  `refreshProfiel()` en alle `atleet.sport`/`atleet.doel`-databronnen zijn
  in deze sprint niet aangeraakt -- 0 wijzigingen aan data-/mapping-logica.
  Geen sport-/doelwaarden geherinterpreteerd, geen hardcoded productiedata.
- **Bewust niet meegenomen:** dode branding-markup (`tenant-brand-card`,
  `tenantBrandingAdminEdit()`) blijft geregistreerde debt -- verwijderen zou
  `fProfielIaPreservation.test.js` (regels die deze aanwezigheid vereisen)
  breken, en tests verzwakken om cleanup mogelijk te maken is expliciet niet
  toegestaan. Onderzoeksdeelname blijft eigen Profile-row, ongewijzigd.
  Organisatie & team role-gating (PR #324) ongewijzigd. Bottom-nav-migratie
  blijft aparte P2 App Shell-scope.
- **Tests:** `core/fProfielSprint2VisualFidelity.test.js` (nieuw, 31/31) --
  hero-CSS single-source-of-truth, copy-waarheid, `tkNavGoBack()` per
  entry-point (Profiel/Instellingen), lege-stack-fallback,
  `openHelpFeedback()`-deeplink inclusief scroll/focus. Preservation 65/65,
  team-access-hotfixtests 49/49, volledige regressie 355/355 (was 354, +1
  nieuw testbestand). Doc-consistency 0. Geen databasewijziging.
- **Verantwoordelijke:** Product Owner (expliciete visuele goedkeuring, 11
  september 2026), uitgevoerd door Claude.

## Active Days -- canonical semantic fix (multi-source)

- **Datum:** 11 september 2026.
- **Context:** een gerichte data-truth-audit (geen live databasetoegang
  mogelijk vanuit deze sessie) toonde code-niveau aan dat
  "X dagen actief in de afgelopen 30 dagen" uitsluitend de `sessions`-
  tabel telde. Bewezen: `completeTrainingInstance()` schrijft nooit naar
  `sessions`, dus HYROX/triathlon-trainingen telden structureel nooit
  mee; standalone hardloop-/fiets-/zwemactiviteiten staan in de aparte
  `activities`-tabel en telden evenmin mee. Daarnaast gebruikte de
  vensterrand `toISOString()` (UTC) terwijl `sessions.date` al lokaal
  wordt geschreven via `td()`.
- **Besluit (PO-goedgekeurde canonical definitie):** een actieve dag is
  een lokale kalenderdag met minimaal één rij in `sessions`, `activities`,
  of een `training_instances`-rij met `status='completed'`. Geplande/
  niet-afgeronde records tellen nooit mee. Nieuwe canonical, generieke
  hulpfuncties `localDateFromTimestamp()`/`localDateDaysAgo()` (naast
  `td()`) converteren de UTC-timestamptz-bronnen (`activities.recorded_at`,
  `training_instances.completed_at`) naar dezelfde lokale kalenderdatum-
  semantiek als `sessions.date`. Eén canonical `calculateActiveDays30()`
  voor zowel Home als Profiel (via `window.homeWeekSummary`) -- geen
  aparte schaduwtelling per scherm.
- **Partial-failure-regel (hard PO-besluit):** als één van de drie
  bronqueries mislukt is `activeDays` expliciet `null` (UNKNOWN), nooit
  een gedeeltelijk of impliciet 0-resultaat. Gebruikt de bestaande
  `sbGetOrFail()`-precedent (al eerder gebouwd voor Calendar, exact
  dezelfde ambiguïteit). `renderWeekStats()` toont de Ritme-kaart niet
  bij UNKNOWN (Volume-kaart blijft onafhankelijk werken); `renderMotivatie()`
  slaat de motivatiekaart over bij UNKNOWN i.p.v. de "Elke sessie
  telt"-tekst te tonen (die zou UNKNOWN als ZERO framen). Profiel
  vereiste geen wijziging: de bestaande `typeof wk.activeDays==='number'`
  guard behandelt `null` al correct als "niet tonen".
- **Home-copy gecorrigeerd:** de vier "deze maand"-varianten in
  `renderMotivatie()` (dezelfde rolling-30-dagen-waarde) zijn vervangen
  door "in de afgelopen 30 dagen" -- dit was de al eerder geregistreerde
  P3-debt, nu meegenomen omdat de onderliggende metric zelf wijzigde.
  Geen andere maandstatistieken aangepast.
- **Tests:** `core/fActiveDaysCanonicalMultiSource.test.js` (nieuw,
  27/27) -- volledige 20-punts PO-testmatrix: broncombinaties/dedupe,
  niet-afgeronde instances, lokale-middernacht-round-trip,
  venstergrenzen, partial failure per bron, lege-maar-succesvolle
  bronnen, Home/Profiel-consumergedrag bij UNKNOWN, "deze maand"-copy
  verdwenen. Preservation 65/65, team-access-hotfixtests 49/49,
  Profiel-Sprint-2-tests 31/31, volledige regressie 356/356 (was 355,
  +1 nieuw testbestand). Doc-consistency 0. Geen databasewijziging
  (uitsluitend nieuwe leesqueries tegen bestaande tabellen).
- **Bewust niet meegenomen:** wearable-ingestion, nieuwe syncpaden,
  training-write-path-wijzigingen, Profile-redesign, bottom-nav,
  clubbranding, thema's, Coach/AI, nieuwe sportdefinities.
- **Verantwoordelijke:** Product Owner (expliciete implementatie-
  goedkeuring, 11 september 2026), uitgevoerd door Claude.

## Account & data -- CSS-scoping root cause + minimale fix

- **Datum:** 11 september 2026.
- **Context:** real-device screenshot toonde een enorme navy envelop en
  enorme zwarte "Wachtwoord"/"Gegevens exporteren"-tegels op Profiel ->
  Account & data. Aanvankelijke conclusie ("m-account is al canonical")
  bleek onvolledig -- de markup is inderdaad canonical, maar bewezen
  root cause is een CSS-scopingfout: `m-account` staat in de DOM als
  sibling vóór `#s-profiel` opent (geen kind), en alle `.pf-row`/
  `.pf-ic`/`.pf-tx`/`.pf-lb`/`.pf-sb`/`.pf-chev`-CSS is uitsluitend
  geschreven als `#s-profiel .pf-*`. Zonder bereikbare CSS kreeg de
  `<svg>` geen width/height (browser-default replaced-element-grootte)
  en erfde `stroke="currentColor"` de algemene donkere tekstkleur.
  Volledige call chain (Profiel-rij -> `openModal('m-account')` ->
  statische markup, geen dynamische render) bevestigde dat dit geen
  markup-, build-, of cache-probleem was.
- **Besluit (PO-goedgekeurde minimale fix):** nieuwe, expliciet
  `#m-account`-gescopeerde regelset voor exact de 7 herbruikte
  classes, met de effectief renderende (na cascade-dedupe) waarden
  van `#s-profiel` 1-op-1 hergebruikt. Geen nieuwe classes, geen
  `!important`, geen markup- of handlerwijziging.
- **Secondary checks (visueel beoordeeld, niet geïmplementeerd)**:
  `m-pass-reset` gebruikt generieke, elders ook gebruikte classes
  (geen `pf-*`), dus niet door dezelfde bug geraakt -- sober maar
  functioneel in orde. `m-export` gebruikt `.csv-btn` met
  emoji-iconen -- een echt gedateerd, nooit bijgewerkt ontwerp t.o.v.
  canonical Profiel, maar dit is een apart, nog niet goedgekeurd
  vervolgvoorstel, geen onderdeel van deze fix.
- **Tests:** `core/fAccountDataCssScopeFix.test.js` (nieuw, 59/59) --
  bevestigt de DOM-positie-aanname achter de fix, aanwezigheid en
  begrensdheid van de nieuwe regels, afwezigheid van `!important`,
  geen nieuwe classes, en automatische 1-op-1-vergelijking van elke
  `#m-account`-waarde tegen de effectieve `#s-profiel`-waarde.
  Preservation 65/65, team-access-hotfixtests 49/49,
  Profiel-Sprint-2-tests 31/31, Active-Days-tests 27/27, volledige
  regressie 357/357 (was 356, +1 nieuw testbestand). Doc-consistency 0.
  Geen databasewijziging.
- **Verantwoordelijke:** Product Owner (expliciete visuele
  goedkeuring, 11 september 2026), uitgevoerd door Claude.

## Exporteren Sprint 3B -- canonical visuele correctie + copy-waarheid

- **Datum:** 11 september 2026.
- **Context:** real-device-controle toonde `m-export` nog met vijf
  `.csv-btn`-knoppen (emoji-iconen, vlakke grijze achtergrond) --
  visueel afwijkend van het canonical Profiel-/Account & data-
  patroon. Tijdens het traceren van de vijf handlers bleek "Alles
  exporteren (JSON backup)" feitelijk onjuist: `exportJSON()`
  exporteert slechts `sessions`, `weight_log`, `hrv_log`,
  `body_comp`, `exercises`, `atleet` en `customTrainings` -- 7 van de
  ~70+ gebruikersdata-tabellen, zonder voeding, endurance-
  activiteiten, HYROX/triathlon, doelen, condities, cyclustracking,
  AI-coach-geschiedenis, social-data, e.d.
- **Besluit (PO-goedgekeurde canonical visual)**: dezelfde `pf-row`/
  `pf-ic`-componenttaal als Account & data, geen emoji. Omdat
  `m-export`, net als `m-account`, een DOM-sibling buiten
  `#s-profiel` is, is preventief dezelfde bewezen `#m-account`-CSS-
  scope-fix toegepast op `#m-export` (1-op-1 identieke waarden) --
  voorkomt dat dezelfde "enorme icoon"-regressie hier opnieuw
  optreedt.
- **Copy-correctie (PO-besluit)**: "Alles exporteren"/"Volledige
  back-up" vervangen door "Kerngegevens exporteren", met een
  subtitel die exact de daadwerkelijk geëxporteerde categorieën
  noemt (trainingen, gewicht, HRV, lichaamscompositie, oefeningen,
  profiel & eigen trainingen). Bevestigingstoast gelijkgetrokken
  ("Kerngegevens gedownload" i.p.v. "Volledige backup gedownload").
- **Functionele bevinding, bewust NIET opgelost in deze sprint**:
  `exportJSON()` is geen volledige data-export/back-up. Geregistreerd
  als aparte debt/follow-up; geen uitbreiding van de export-tabellen
  nu.
- **Preservation**: alle 5 handlers (`exportCSV('sessions'|
  'weight_log'|'hrv_log'|'body_comp')`, `exportJSON()`) en hun
  volledige interne logica (query's, bestandsformaten,
  `downloadFile()`) ongewijzigd. `closeModal('m-export')` ongewijzigd.
- **Tests:** `core/fExportVisualFidelity.test.js` (nieuw, 56/56) --
  alle 5 handlers/opties, CSV/JSON-datasetlogica ongewijzigd, geen
  emoji, `#m-export`-CSS-scope aanwezig/begrensd/identiek aan
  `#m-account`, geen overflow-gevoelige breedtes, copy-waarheid
  (geen "Alles"/"Volledige back-up" meer, subtitel noemt exact wat
  er in zit). Preservation 65/65, Account & data-CSS-scope-tests
  59/59, Profiel-Sprint-2-tests 31/31, Active-Days-tests 27/27,
  team-access-hotfixtests 49/49, volledige regressie 358/358 (was
  357, +1 nieuw testbestand). Doc-consistency 0. Geen
  databasewijziging.
- **Verantwoordelijke:** Product Owner (expliciete visuele
  goedkeuring, 11 september 2026), uitgevoerd door Claude.

## UX App Shell Master Sprint -- canonical primary navigation

- **Datum:** 11 september 2026.
- **Context:** de primaire navigatie bestond uit 45 losse, handmatig gekopieerde
  `<nav class="bnav">`-blokken met hardcoded labels (Home/Training/Lichaam/
  Coach/Voortgang, emoji-iconen) in 17 unieke varianten -- de "actieve" tab was
  dus een build-time toeval, geen runtime-berekening.
- **Besluit (PO-approved canonical mockups):** primaire navigatie gemigreerd
  naar Vandaag/Trainen/Inzicht/Coach/Samen. Profiel blijft uitsluitend via
  avatar bereikbaar, geen zesde tab. Canonical mapping bewezen uit bestaande
  code (niet aangenomen): `s-inzicht` en `s-social` bestonden al als volwaardige
  doelschermen (s-inzicht linkte zelf al door naar s-stats voor detail; s-social
  had al de juiste "Sociaal · Profiel, connecties & privacy"-kop).
- **Architectuur:** één canonical bron (`TK_PRIMARY_NAV`, 5 items) + prefix-
  gebaseerde scherm->tab-mapping (`TK_TAB_PREFIX_RULES`, dekt ook dynamisch
  aangemaakte schermen zoals `s-train-<naam>` zonder per-scherm onderhoud).
  Alle 45 bnav-instanties zijn nu lege canonical shells; `tkPaintBnav()` vult
  precies de zichtbare shell, hergebruikt de bestaande go()-wrapper (één
  repaint per echte schermwissel, geen 45-voudige DOM-arbeid). Renderlogica
  bewust buiten de door `fNavigatie.test.js` bewaakte "pure navigatielaag"
  geplaatst (die mag geen innerHTML schrijven).
- **Lichaam/Voortgang/Nutrition**: geen eigen tab meer, functionaliteit
  volledig behouden en bereikbaar als Inzicht-context detailflow (PO-besluit).
  Coach-icoon: abstracte sparkle i.p.v. het vorige robot-emoji, conform de
  al vastgelegde AI-identiteitsregel (geen robot, geen menselijke avatar).
- **Regressiebewaking gerepareerd, niet verzwakt:** 9 bestaande tests
  (fB9_03RunningIntelligence, fB9_04CyclingCore, fB9_05CyclingIntelligence,
  fB9_07BSocialClosure, fB9_07SocialProductLayer, fB9_09NutritionFoundation,
  fNightSprint, fTrainenV02Migration, fZichtbaarheid) telden letterlijke
  legacy-labelkopieën of button-aantallen in specifieke schermblokken. Root
  cause gerepareerd: dezelfde regressiebewaking, nu op canonical-shell-
  aanwezigheid en de gedeelde bron i.p.v. hardcoded per-scherm-markup.
- **Tests:** nieuw `core/fUxAppShellCanonicalNav.test.js` (47/47) -- 5 tabs,
  exacte labels/volgorde, geen Profiel-tab, legacy labels weg, juiste
  bestemmingen, Lichaam/Voortgang/Nutrition-reachability, actieve-tab-context
  in detailflows (Inzicht/Trainen/Samen/Coach), non-primary surfaces (Profiel/
  Instellingen/Help/Privacy/auth/onboarding) muteren de actieve tab niet,
  safe-area/accessibility/geen state-mutatie. Volledige regressie 359/359
  (was 358, +1 nieuw testbestand). Doc-consistency 0. Geen databasewijziging.
- **Verantwoordelijke:** Product Owner (canonical v1-mockups + expliciete
  autonome-uitvoering-opdracht, 11 september 2026), uitgevoerd door Claude.

## Samen V1 -- canonical redesign (UX >=9-sprint, Fase 2 implementatie)

- **Datum:** 12 september 2026.
- **Context:** Samen (`s-social`) werd na de App Shell-migratie een volwaardige
  hoofdtab, maar de UX bleef een lange verticale stapel formulierkaarten
  (social-profiel/zoeken/connecties/groepen/challenges/meldingen/feed) zonder
  segmentatie, met zichtbare ruwe user-ID's in connecties/comments/geblokkeerd.
  Forensische inventarisatie (Fase 1) bewees welke functionaliteit echt bestond
  en welke mockup-elementen (online-status, Gym/Club-tegel, challenge-
  voortgangsbalken/rangnummers, groepsledenaantallen) niet bestonden.
- **Besluit (PO visuele goedkeuring op `samen-v0.1.png`-gebaseerde mock-up)**:
  canonical tab-structuur Overzicht/Feed/Vrienden/Groepen + een 5e Challenges-
  tabblad (zelf gevonden tijdens implementatie: zonder dit tabblad werd de
  bestaande volledige challenge-lijst-functie onbereikbaar -- functiebehoud
  gaat voor esthetische tab-economie). Header omgezet naar het canonical
  Samen + avatar-patroon (was nog "Sociaal" + "Terug naar Home", een restant
  van vóór de App Shell-migratie). Social-profiel/bio/zichtbaarheid/thema en
  de geblokkeerd-lijst verplaatst naar een nieuw secondary modal
  (`m-social-instellingen`), uitsluitend met ongescopeerde `.card`-classes
  (voorkomt de eerder bewezen CSS-scoping-valkuil van modals buiten hun
  brondocument-context).
- **Raw user-ID's verwijderd**: nieuwe `socialResolveDisplayNames()`-helper
  (dezelfde RLS-gefilterde `social_profiles`-query als de al bestaande
  zoekfunctie) met privacyveilige fallback ("Sporter") toegepast op
  connecties, volgverzoeken, feed-auteurs, feed-comments en geblokkeerd-lijst.
  Emoji in de feed (👍💬🏆) vervangen door canonical SVG-iconen.
- **Geen functionele uitbreiding, geen databasewijziging**: alle bestaande
  handlers (volgen/accepteren/groep aanmaken-joinen/challenge joinen/
  reactie-comment-report/berichten/Coach-PT) ongewijzigd hergebruikt, RLS-
  aannames en allowlist-validaties (join-mode, thema-migratie_v556) intact.
  Herbruikte uitsluitend bestaande, globale canonical componentclasses
  (`.tk-period-selector`/`.tk-overview-grid`, al gebruikt in Inzicht) --
  geen nieuwe visuele taal.
- **Tests**: nieuw `core/fSamenV1CanonicalRedesign.test.js` (47/47) -- tabs,
  geen raw ID's meer, alle handlers/RLS-aannames onveranderd, secondary
  modal correct geïsoleerd van de CSS-scoping-valkuil, empty/UNKNOWN-states,
  accessibility. Bestaand `fB9_07SocialProductLayer.test.js` C1 aangepast
  (profielformulier gebruikt sindsdien veilige `.value`-assignment i.p.v.
  HTML-interpolatie -- geen escHtml() meer nodig, geen regressie). Volledige
  regressie 360/360 (was 359, +1 nieuw testbestand). Doc-consistency 0.
  Geen databasewijziging. APP_VER v4.69.73 -> v4.69.74.
- **Verantwoordelijke:** Product Owner (PO visuele goedkeuring Samen V1,
  12 september 2026), uitgevoerd door Claude.

## Navigation Repair Wave 2 -- P2 root causes

- **Datum:** 12 september 2026.
- **Context:** vervolg op Wave 1 (PR #333, RC-OVL-01/02). Vier resterende
  P2-root-causes in de canonical Route Map: RC-NAV-03 (Coach dubbele
  history-push), RC-NAV-01 (directe .scr-activatie buiten go()),
  RC-NAV-02 (hardcoded verkeerde parent op zichtbare terugknoppen),
  RC-OVL-03 (ad-hoc modal zonder canonical close-contract).
- **Besluit:** alle vier root causes opgelost, uitsluitend via hergebruik
  van bestaande canonical mechanismen (go()-hooks naar bestaand patroon,
  tkNavGoBack(), closeModal()/tkNavTopmostOverlay()) -- geen nieuwe
  architectuur, geen Training-execution-wijziging, geen visuele
  UX-wijziging, geen databasewijziging.
- **RC-NAV-03**: overbodige handmatige `history.pushState()` in
  `openCoachSession()` verwijderd (D-01, D-02 RED -> GREEN).
- **RC-NAV-01**: `coachPtOpenAthlete()`/`openMessageThread()` gerouteerd
  via canonical `go()` + module-variabelen voor context i.p.v. directe
  `.scr`-manipulatie (D-04, F-05 RED -> GREEN). Repo-brede scan naar
  overige bypasses uitgevoerd; `startT()` en de trainingsstart-varianten
  vertonen hetzelfde patroon maar zijn bewust NIET aangepakt (gekoppeld
  aan beschermde Training-execution/resume/timer-logica, R-006) --
  geregistreerd als aparte follow-up-bevinding, geen Wave 3 gestart.
- **RC-NAV-02**: 5 hardcoded terugknoppen (Builder/Library, 3x
  Lichaam-detail) vervangen door het bestaande `tkNavGoBack()`-patroon
  (B-10, B-18, B-19, B-25, E-03, E-05, E-07 RED -> GREEN).
- **RC-OVL-03**: cardio 1RM ad-hoc modal kreeg een `id` (was al deels
  gedaan) + een aanvulling die een dubbele DOM-id voorkomt bij hergebruik
  (E-17 RED -> GREEN).
- **EV-02/onboarding**: bevestigd als bewezen, actieve user journey (100%
  van nieuwe gebruikers, 3 fysieke navigation-acties bypassen go()) maar
  NIET stilzwijgend toegevoegd aan de 91 audited contracts -- vastgelegd
  als formeel PO-02-voorstel (scope-uitbreiding), PO-beslissing vereist.
- **Route Map**: 91 total, 83 GREEN, 7 AMBER, 0 RED, 1 UNKNOWN (was na
  Wave 1: 71/7/12/1). Domeintabellen herberekend rechtstreeks uit de JSON.
- **Tests**: nieuw `core/fNavigationWave2.test.js` (34/34) -- bewijst
  expliciet dat geen enkele gewijzigde functie Training-execution-state
  (curT/activeInstanceId/sessionLog/trainStart) aanraakt.
  `fCoachPtRelationshipUI.test.js` root-cause aangepast aan de
  `renderCoachPtAthlete()`-refactor (14/14, geen verzwakking).
  `fNavigatie.test.js` 21/21, `routeMap.test.js` 35/35. Volledige
  regressie 362/362 (was 360, +2 testbestanden). Doc-consistency 0. Geen
  databasewijziging. APP_VER v4.69.74 -> v4.69.75.
- **Verantwoordelijke:** Product Owner (expliciete Wave 2-opdracht, 12
  september 2026), uitgevoerd door Claude.

## Navigation & Journey Audit -- formele closure + PO-01/PO-02

- **Datum:** 12 september 2026.
- **A-11 (UNKNOWN) volledig getraceerd**: startProgramBlockTraining() ->
  maybeShowScheduleGate() -> ... -> launchProgramTrainScreen() ->
  s-train-prog-<blockId>. Bestemming bewezen; UNKNOWN -> AMBER (niet
  GREEN, deelt de startT()-directe-.scr-bypass, geen kunstmatige status).
- **Alle 8 AMBER-contracts** opnieuw onderzocht, elk exact één
  classificatie (navigation defect / IA-semantiek / presentatie-debt /
  functional-data-architectuur / intentional product behavior /
  insufficient evidence). Geen enkele kunstmatig GREEN gemaakt.
- **PO-01: DECIDED -- OPTIE C.** Trainingsbelasting (historisch
  volume/load/trend, s-stats) en Spierbelasting/Herstel (actuele
  lichaams-/spierstatus, s-lich-spieren) canoniek gesplitst. Zichtbare
  uitwerking als PO-01-UX geregistreerd, vereist de visual PO-gate.
- **PO-02: DECIDED -- OPTIE B.** Onboarding krijgt een aparte
  Onboarding/Lifecycle Route Map, niet toegevoegd aan de 91. EV-02
  TRANSFERRED TO ONBOARDING/LIFECYCLE ROUTE GOVERNANCE.
- Route Map: 91 total, 83 GREEN, 8 AMBER, 0 RED, 0 UNKNOWN.
  Doc-consistency 0. Geen code-/database-/visuele wijziging (documentatie-
  only sprint).
- **Verantwoordelijke:** Product Owner (PO-01/PO-02-besluiten, 12
  september 2026), uitgevoerd door Claude.

## UX Polish Sprint 01 -- Inzicht + Belasting/Herstel + PO-01-UX

- **Datum:** 12 september 2026.
- **Context:** eerste sprint van de echte UX/UI-polishfase. Workflow
  gevolgd: ANALYSIS -> DESIGN -> RENDERED PREVIEW -> PO VISUAL APPROVAL
  -> IMPLEMENTATION (PO keurde Variant A goed vóór enige codewijziging).
- **PO-01 zichtbaar geïmplementeerd**: Inzicht-domeinkaart "Belasting" ->
  "Trainingsbelasting"; Lichaam-tab "Belasting" -> "Spierbelasting"
  (symmetrisch). Bestaande information hierarchy, period-selector,
  summary, domeinenlijst, anatomische figuur, Herstel-tab, voor-/
  achterzijde en alle onderliggende data/berekeningen ongewijzigd.
- **Presentation debt**: verouderde "Preview: nieuw Inzicht-scherm"-
  banner op Lichaam verwijderd (stale sinds Inzicht al primaire tab is).
  7 emoji-iconen op het Lichaam-hoofdscherm vervangen door bestaande
  canonical SVG-lijniconen (designSystemIcons.js-registry) -- geen
  nieuwe iconenset. Cyclus (🌙) en Voeding-snelkoppeling (🍽️) hebben
  bewust geen canonical equivalent en zijn niet aangepast (expliciet
  resterende debt).
- **RC-IA-01 opgelost** (E-02, E-04, E-08, A-10: -> GREEN, bewezen):
  drie nieuwe deep-link-functies (goInzichtPrestaties(),
  goInzichtTrainingsbelasting(), goInzichtDoelen()), zelfde bestaande
  scroll-patroon als openHelpFeedback(), naar drie bestaande, semantisch
  overeenkomende secties in s-stats. Geen nieuwe schermen, geen nieuwe
  data.
- **Tests**: nieuw core/fUxPolishSprint01.test.js (40/40). Drie
  bestaande tests root-cause aangepast aan de presentatiewijzigingen
  (fGezondheidsgegevens, fLichaamPhase0: emoji->SVG-marker;
  fInzichtV01BrowserRuntime: navigatie via canonical bottom-nav-tab
  i.p.v. de verwijderde banner) -- geen verzwakking.
- Route Map: 91 total, 87 GREEN, 4 AMBER, 0 RED, 0 UNKNOWN (was
  83/8/0/0). RC-IA-01 FIXED -- geen open navigatie-root-causes meer.
  Volledige regressie 363/363 (was 362, +1 testbestand). Doc-consistency
  0. Geen databasewijziging, geen Nutrition-wijziging, geen Training-
  execution-wijziging. APP_VER v4.69.75 -> v4.69.76.
- **Verantwoordelijke:** Product Owner (visuele goedkeuring vóór
  implementatie, 12 september 2026), uitgevoerd door Claude.

## Exercise Substitution Source-of-Truth Sprint -- Fase A (audit) + Fase B (consolidatie)

- **Datum:** 12 september 2026.
- **Fase A (read-only audit)**: bewees met codecitaten dat de execution
  swap-picker (`openSwapExercise()`/`filterSwapCandidates()`)
  `EX_CATALOG.relations.alternatives` volledig negeerde en een eigen,
  parallelle kandidatenset genereerde via `muscle_primary`-matching, terwijl
  de Workout Builder (`altList()`/`swapAlternative()`) dezelfde canonical
  relatie al correct gebruikte. Catalogdata zelf bevestigd schoon: 206/206
  met alternatives, 0 self-references, 0 duplicaten, 0 ongeldige
  verwijzingen. Geclassificeerd als **C -- DUPLICATE SOURCE**.
- **Apart, expliciet bewezen vervolgrisico (NIET opgelost in Fase B,
  bewust)**: `confirmSwapExercise()` neemt sets/reps/RPE/`suggestedWeight`
  blind over van de oude naar de nieuwe oefening
  (`sessionExtra[idx]={...sessionExtra[idx],id:newId,...}` -- spread van het
  oude item, alleen id/naam/type overschreven). Orthogonaal aan de
  source-of-truth-vraag, geregistreerd als **P1/P2-vervolgpunt**, niet
  stilzwijgend meegepatcht.
- **Fase B (consolidatie)**: nieuwe functie `resolveCanonicalAlternatives()`
  leest `relations.alternatives` als primary semantic source (valideert elk
  ID tegen de catalogus, sluit self-reference/duplicaten uit, fail-safe naar
  lege array). `openSwapExercise()` canonical-first; de bestaande
  `muscle_primary`-matching is nu uitsluitend expliciete fallback (alleen
  bij custom/legacy-bron of lege canonical-set na `AthleteConstraints`),
  herkenbaar gelabeld in de UI ("Aanbevolen alternatieven" vs. "Andere
  suggesties op spiergroep"), nooit vermengd. `AthleteConstraints` ongewijzigd
  (blijft puur filter). `confirmSwapExercise()` functioneel ongewijzigd
  (identity/history/logging-veiligheid uit Fase A bevestigd intact). Builder
  en Library-detail byte-voor-byte ongewijzigd (regressie-guard, getest).
- Nieuwe test: `core/fExerciseSubstitutionCanonicalSource.test.js` (34/34).
  Volledige regressie 364/364 (was 363, +1 testbestand). Doc-consistency 0.
  Geen databasewijziging, geen MoveKit-uitbreiding, geen koppeling aan
  `exercise-intelligence_6.json`, geen goal-aware substitution, geen
  AI-selectielogica, geen weight-conversion-formule. APP_VER v4.69.76 ->
  v4.69.77.
- **Verantwoordelijke:** Product Owner (expliciete Fase A/B-opdracht met
  hard scope, 12 september 2026), uitgevoerd door Claude.

## Exercise Swap Prescription Carry-Over Fix

- **Datum:** 12 september 2026.
- Verhelpt het in de Exercise Substitution Source-of-Truth Sprint (Fase A)
  bewezen P1-defect: bij swap/replace bleef `suggestedWeight` van de oude
  oefening (A) staan terwijl de identity al B was.
- **Root cause, exact twee plekken** (repo-breed gescand naar `newId`,
  `replace`, `swap`, `sessionExtra`, `suggestedWeight`, `resolvedWorkout.items`,
  `exercise_id`, `id:` -- geen derde plek met dezelfde oorzaak gevonden;
  `execReplaceCurrent()` is een dunne wrapper zonder eigen mutatie, Preview's
  `previewCtx.swaps` draagt nooit een `suggestedWeight`-veld, Guided
  Workout's `replaceEx()` deed het al correct via een verse
  `resolveWorkingWeight()`-aanroep):
  1. `confirmSwapExercise()` -- object-spread liet `suggestedWeight` staan.
  2. `execReplaceExercise()` -- de `sessionExtra`-spiegel deed dit
     inconsistent t.o.v. de al-correcte `resolvedWorkout.items`-spiegel.
- **Fix**: uitsluitend invalidatie (`suggestedWeight:null`) op beide
  plekken, in dezelfde object-override als de identity-wissel. Geen nieuwe
  berekening/conversie/AI/Decision Rule. De reeds bestaande, ongewijzigde
  canonical prefill-keten (`prevS`/`computeProgPrefill()`/
  `suggestWeightForRepsRpe()`, keyed op `ex.id`) bepaalt B's eigen gewicht
  of valt terug op de bestaande veilige lege staat.
- sets/reps/RPE bewust behouden (workoutblok-intentie). `AthleteConstraints`,
  de canonical substitution-source (PR #337) en fallback-labeling
  ongewijzigd. Recovery-adaptatie schaalt `suggestedWeight` alleen als het
  al bestaat -- geen dubbele toepassing direct na een swap.
- Bewezen via functionele simulatie (incl. adversariële controle die het
  ongefixte gedrag reproduceert om te bevestigen dat de fix het probleem
  echt oplost) en statisch bewijs: multi-swap-ketens (A->B->A, A->B->C),
  idempotentie, gewichtstype-onafhankelijkheid.
- Nieuwe test: `core/fExerciseSwapPrescriptionWeight.test.js` (34/34).
  Bestaande `fExerciseSubstitutionCanonicalSource.test.js` terecht met één
  assertie aangepast (34->35): de oude assertie verbood elke wijziging aan
  `suggestedWeight` in `confirmSwapExercise()`, correct vóór deze fix maar
  achterhaald erna; vervangen door een assertie die specifiek een
  letterlijke `null`-invalidatie eist (geen berekende waarde).
- Volledige regressie 365/365 (was 364, +1 testbestand).
  `fPrescriptionConsistency.test.js` 66/66, `fRecoveryAdaptation.test.js`
  10/10. Doc-consistency 0. Geen databasewijziging, geen MoveKit-
  uitbreiding, geen goal-aware substitution, geen AI-logica. APP_VER
  v4.69.77 -> v4.69.78.
- **Apart vervolgpunt (bewust niet in deze PR)**: of een swap tussen sterk
  uiteenlopende oefeningtypes (bv. compound-vrij-gewicht -> bodyweight)
  ook een inhoudelijke waarschuwing verdient, blijft open -- deze fix lost
  uitsluitend het data-lek op, niet de bredere UX-vraag.
- **Verantwoordelijke:** Product Owner (expliciete opdracht met hard scope,
  12 september 2026), uitgevoerd door Claude.


## Builder + AthleteConstraints Completion -- Fase A (audit) + Fase B (Connection Gap fix)

- **Datum:** 13 september 2026.
- **Fase A (read-only)** bracht vier onafhankelijke vervang-surfaces in kaart:
  Execution (PR #337), Preview (F23), Builder-autobuild `generate()` (F24)
  en Builder-edit `swapAlternative()`. Correctie op een oudere audit-
  aanname: de autobuild-generator was al aangesloten (F24). Alleen
  `swapAlternative()` miste `AthleteConstraints` -- **B -- CONNECTION GAP**,
  root cause: functie dateert van voor F23 en is bij F23/F24 overgeslagen.
  Geen shadow source, geen eigen equipment/injury-logica, persistence
  correct (canonical `catalog_id`). Verschil Builder-edit vs. overige
  surfaces geclassificeerd als DEFECT (geen productbeslissing gevonden die
  het rechtvaardigt). AthleteConstraints-inventaris: equipment (live,
  gated op `location` thuis/hybride) en avoid-termen (live); een los
  injury/pain-systeem en sport/context-restricties bestaan niet (MISSING,
  P3, geen bewezen acute vraag).
- **Fase B**: `swapAlternative()` past nu hetzelfde
  `AthleteConstraints.applyConstraints()`-patroon toe als F24 (zelfde
  context-bronnen, wrapping en fail-safe), na `altList()` en voor de
  goalScore-sortering. Geen wijziging aan de core, geen tweede engine.
- Nieuwe test `core/fBuilderSwapAthleteConstraints.test.js` (28/28).
  Volledige regressie 366/366. Doc-consistency 0. Geen databasewijziging.
  APP_VER v4.69.78 -> v4.69.79.
- **Procesnotitie**: tijdens Fase B bleek een oude `git stash` (uit een
  eerdere sessie) bij `stash pop` twee vreemde hunks in de worktree te
  mengen (CSS regel ~2194 en een letterlijke `${tkIcon(`-expressie in
  statische HTML, regel ~4405) die door bestaande tests correct werden
  afgevangen (`fTrainenV02Migration` FASE5-1). Worktree hersteld naar main
  + uitsluitend de eigen `swapAlternative()`-hunk; niets daarvan is
  gecommit.
- **Verantwoordelijke:** Product Owner (GO na Fase A-rapport, 13 september
  2026), uitgevoerd door Claude.

## Endurance Registry Source-of-Truth Fix -- CALC-END-004 / CALC-END-004B

- **Datum:** 13 september 2026. Gap 3 uit de Endurance & Multisport Completion
  Audit; expliciete PO-scope: uitsluitend registry/evidence-documentatie +
  testbewaking. Geen runtime-, calculation-, UI- of databasewijziging.
- **Stale claim (voor):** `docs/CALCULATION_REGISTRY.md` beschreef CS/CP als
  "GEIMPLEMENTEERD, niet geintegreerd op trainingsgeschiedenis" / "niet
  INTEGRATED" met als reden "geen tijdrit-markeringsmechanisme in het
  datamodel"; `GAP_ANALYSIS_V2.md` GAP-P2-021 herhaalde dit.
- **Bewezen werkelijkheid (actuele main 2e3662a):** `renderRunningInsights()`
  -> `activities` (sport=running) -> `criticalSpeedEligiblePerformances(
  activities,3)` (`is_max_effort === true`) -> `CardioCore.criticalSpeed()`;
  idem cycling via `criticalPowerEligiblePerformances()` ->
  `CardioCore.criticalPower()`. Dynamisch berekend, niet gepersisteerd,
  guards (`insufficient`/confidence) aanwezig, zichtbaar in Running/Cycling
  Insights. `buildCtx()`, Decision Rule Registry en AI-context bevatten CS/CP
  NIET.
- **Gecorrigeerde status:** LIVE_CANONICAL (calculation/history/UI) --
  NOT CONNECTED (Context/Decision/AI). GAP-P2-021 CLOSED (tijdrit-markering
  bestaat als `is_max_effort`); de Context/Decision/AI-aansluiting blijft een
  aparte open gap (audit Gap 1/4).
- **Testbewaking:** `core/fEnduranceErgRegistry.test.js` verscherpt (26 -> 36
  asserties): bestaan 004/004B, geen stale claims, erkenning van de
  eligibility-integratie, expliciet NOT CONNECTED voor Context/Decision/AI,
  geen end-to-end-claim, dynamisch/niet-gepersisteerd, en CALC-END-005 blijft
  NOT_IMPLEMENTED. Sabotagebewijs: 10 falende asserties op de oude tekst.
- **Niet aangepast (bewust):** F6/F7/F13-sprintrapporten en -inventarissen
  zijn gedateerde historische snapshots die de toenmalige stand correct
  beschrijven; CAPABILITY_REGISTRY-regels 63/64 verwijzen naar MS-F6-docs en
  bevatten geen eigen statusclaim.
- **Versioning:** geen APP_VER-bump, conform precedent PR #335 (docs-only
  wijziging zonder runtimeverandering).
- **Verantwoordelijke:** Product Owner (GO voor uitsluitend Gap 3), uitgevoerd
  door Claude.

## Endurance → Context Fase B1 — profiel-drempels (Gap 1a)

- **Datum:** 13 september 2026. PO-scope: uitsluitend Gap 1a (persisted profiel-drempels), geen adapter, geen CS/CP.
- **Verbinding:** één `sbGet('athlete_endurance_profile','&sport=in.(running,cycling)&limit=2')` in de bestaande `Promise.all` van `buildCtx()`; tekstblok "ENDURANCE-PROFIEL" vóór "ACTIEVE SPORT".
- **Semantiek:** threshold pace ≠ Critical Speed, FTP (user-entered) ≠ Critical Power — beide expliciet in de contexttekst; eenheid + provenance per regel; ontbrekend = "niet ingesteld (geen waarde beschikbaar; niet schatten)"; sportisolatie op actieve sport (triathlon beide); geen confidence verzonnen; formattering via `CardioCore.formatTime()`; fail-safe try/catch → leeg blok.
- **Consumer-safety:** enige consumer van `buildCtx()` is de AI Coach-systeemprompt; geen Decision Rule, geen Today-kaart geraakt. Geen promptlogica gewijzigd buiten het additieve blok.
- **Tests:** `core/fEnduranceContextProfileThresholds.test.js` 30/30 (statisch + functionele simulatie van het exacte blok; sabotagebewijs 24 failures zonder verbinding); `fContextContract` 14/14; volledige regressie 367/367; doc-consistency 0.
- **Docs:** CONTEXT_CONTRACT.md (nieuwe inventory-rij), GAP_ANALYSIS_V2.md (GAP-P2-025 CLOSED = Gap 1a; GAP-P2-026 OPEN = Gap 1b).
- **Versioning:** runtime-wijziging → APP_VER v4.69.79 -> v4.69.80 (patch, conform conventie).
- **Verantwoordelijke:** Product Owner (Fase B1-opdracht), uitgevoerd door Claude.

## Concept2 PM5 — Sustained Connection Failure Audit (Fase A) + Fase B (state/diagnostics/UX)

- **Datum:** 13 september 2026. Real-device: discovery/classification PASS, connect-handshake PASS, sustained connection FAIL (niet bewezen), telemetry NOT PROVEN.
- **Fase A root cause: G — INSUFFICIENT OBSERVABILITY** (fysieke drop niet uit code te bewijzen; plugin geeft geen native statuscode door), met bewezen secundaire defecten: (1) `tkRenderErgConnect()` reset bij elke rerender de pairing-state (connected:false, wezen-listeners, hernieuwde scan/connect mogelijk); (2) transport emitte 'reconnecting' zonder reconnect-mechanisme; (3) `st.connected` bleef true na fysieke disconnect; (4) subscription-uitkomsten stil weggeslikt. Plugin `@capacitor-community/bluetooth-le` 6.1.0 bewezen: JS-queue serialiseert calls; ontbrekende characteristic = schone reject, geen disconnect; `connect` op verbonden device = 'Already connected'.
- **Fase B (PO GO)**: state preservation + transport-truth in `tkRenderErgConnect()`; no-rescan guard in `tkErgPair()`; transport `onDisconnect` -> deviceId=null + 'disconnected'; `disconnect(reason)` met KNOWN_APP_REASON (user_disconnect/session_finish/leave_execution); `getConnectionDiagnostics()` (connectedAt/disconnectedAt/lastDisconnectReason/subscriptions/notification-tellers) zichtbaar in Developer Mode; UX-states CONNECTING/CONNECTED/WAITING_FOR_DATA/DISCONNECTED/ERROR; `tkErgReconnect()` als expliciete nieuwe connect-flow; naam-hint `Concept2Live.machineHintFromName()`/`machineHintMismatchMessage()` (hint, geen block).
- **Bewust niet gewijzigd:** subscriptiestrategie, decoders (UNKNOWN), FTMS-wiring, workout control/CSAFE, byte-layouts — eerst hardwarebewijs via de nieuwe diagnostiek.
- **Tests:** native 104/104, DeveloperMode 24/24, `fConcept2ConnectionState.test.js` 51/51; sabotage 11 resp. 5 failures. Regressie 368/368. APP_VER v4.69.80 -> v4.69.81. Draft PR, NIET mergen vóór real-device validatie (TEST A-D).
- **Open:** sustained connection UNVERIFIED; telemetry/decoder OPEN (spec vereist); FTMS NIET verbonden; workout control MISSING.
- **Verantwoordelijke:** Product Owner (GO Fase B), uitgevoerd door Claude.

## Concept2 PM5 — ErgData-forensics → safe subscription strategy (op PR #344)

- **Datum:** 13 september 2026. Hardware tijdelijk niet beschikbaar; doel = testbare APK over ~1 week.
- **Bron:** `docs/concept2-ergdata-forensic.md` (strings-analyse ErgData 2.16.0; APK niet in repo). BEWEZEN UIT APK: individuele data-chars + CSAFE-control + connection-keeper/inactivity-disconnect. STERKE INFERENTIE: ErgData gebruikt de individuele 0x003x-chars als primaire datastroom (klassen `PmStrokeData`/`PmSplitIntervalData`, `forceCurveCharacteristic`). ONBEKEND: multiplex-vs-individueel-exclusiviteit, subscriptievolgorde, of CSAFE nodig is voor passieve telemetry, byte-layouts, wat 'inactivity' precies is.
- **TK-afwijkingen (vóór):** blinde batch van 8 notify-chars incl. multiplex 0x0080 én individuele chars tegelijk (HIGH — enige onbewezen-veilige strategie), geen service discovery vóór subscriben (MEDIUM), parallel i.p.v. sequentieel (LOW, plugin queue), geen connection-keeper (UNKNOWN — geen keep-alive gegokt).
- **Besluit:** strategie-laag `AUTO_DISCOVERED` (default) | `INDIVIDUAL` | `MULTIPLEXED`; nooit beide tegelijk; INDIVIDUAL-first, MULTIPLEXED alleen als fallback bij afwezigheid; discovery via `gateway.getServices()` (plugin-contract geverifieerd in `bleClient.d.ts`/`BluetoothLe.kt`); sequentieel met order; alleen aanwezige chars. Geen decoders, geen CSAFE, geen keep-alive.
- **Tests:** native 133/133 (S1–S17), DeveloperMode 32/32, connection-state 51/51; sabotage (beide tegelijk) → 4 failures. Regressie 368/368. APP_VER v4.69.81 → v4.69.82. PR #344 (zelfde scope), NIET mergen.
- **Verantwoordelijke:** Product Owner (GO Fase A–E, geen merge), uitgevoerd door Claude.

## Endurance → Context Gap 1b — Fase A (audit) + Fase B (dunne adapter)

- **Datum:** 13 september 2026. Fase A-classificatie **C — THIN ADAPTER REQUIRED** (sub-D: Insights-queries ≤500/1000 rijen te zwaar voor per-bericht-hergebruik; sub-G: rolling load vereist caller-side venster, geen calc-gap). Geen shadow calculation gevonden (CS/CP-formule uitsluitend in CardioCore; weeklyVolume één sport-neutrale functie; trendBy canonical; LongitudinalTrendCore/contextEngine.js dormant).
- **Fase B:** `tkEnduranceCtxSports()` (gating als Gap 1a) + pure `tkEnduranceCtxProject()` + `tkEnduranceCoachContext()` (2 begrensde queries) in `buildCtx()`'s `Promise.all`, blok `${enduranceIntelTekst}` vóór ACTIEVE SPORT. Geen formule; CS/CP alleen bij core-status valid; N uit eligibility; sRPE-venster 7/28 d; trend per band; cycling extra vermogenstrend; W′/D′/R² niet naar AI. Decision Engine bewust NIET aangesloten; geen ACWR-interpretatie.
- **Docs:** CALCULATION_REGISTRY 004/004B → CONNECTED (Context via adapter)/NOT CONNECTED (Decision); GAP-P2-026 CLOSED; ID-collision opgelost (Gap 1a-entry hernummerd 025→027); CONTEXT_CONTRACT-rij.
- **Tests:** `fEnduranceCoachContext.test.js` 39/39 (sabotage 1/5 failures), `fEnduranceErgRegistry` 40/40, `fContextContract` 14/14, profiel 30/30; regressie 369/369. APP_VER v4.69.82 → v4.69.83.
- **Procesnotitie:** in de worktree stond bij aanvang een ongetrackt bestand `core/fEnduranceCoachContext.test.js` van onbekende herkomst (niet in git-historie, verwees naar de nog te bouwen adapter). Niet gebruikt; in quarantaine gezet buiten de repo; eigen test geschreven.
- **Verantwoordelijke:** Product Owner (GO Fase B na Fase A-rapport), uitgevoerd door Claude.

## Structured Endurance Intervals — Fase A (audit) + Fase B1 (running canonical lifecycle)

- **Datum:** 13 september 2026. Audit-classificatie **E — TRAINING DEFINITION EXTENSION REQUIRED** (+D persistence, +F-licht consolidatie). Twee ad-hoc mechanismen gevonden (running/cycling/swimming `intervalBlokken` ×3; erg `IntervalEngineCore`+`exNote`), geen Definition/Preview/planned-vs-actual.
- **Architectuurbesluit (PO):** PLAN = `custom_trainings.metadata.intervalPrescription` (IntervalEngineCore-formaat, raw met repeat-groepen); PLAN-SNAPSHOT = `training_instances.snapshot` (raw + genormaliseerd); EXECUTIE = `IntervalEngineCore` (geen persistence-SoT); ACTUAL = `activities` + `activity_laps`. Geen tweede endurance-trainingssysteem; geen aparte Interval Builder.
- **Schema (migratie_v563):** `activities.training_instance_id` (nullable, FK ON DELETE SET NULL — zelfde semantiek als sessions v536/v551; cascade zou historische activities verwijderen), `activity_laps.lap_type/block_index/repeat_index` (nullable, check-constraints). Forward-only, geen backfill, geen exNote-parsing, RLS ongewijzigd.
- **Core-uitbreidingen:** `IntervalEngineCore.blockIndexAtElapsed()` (tijdprogressie, stopt bij distance/manual), `EnduranceExecutionCore.addLap()` accepteert optionele lap-semantiek.
- **Guards:** auto-lap-cursor (`structuredLapCursor`) + 'blok net gestart (<2 s)' voorkomen dubbele/0-seconden-laps bij gelijktijdige auto- en handmatige transitie; `is_max_effort` blijft checkbox; running-only start (`norm.sport!=='running'` → toast) tot B2.
- **Resterende legacy paden (bewust):** running ad-hoc `intervalBlokken`/`huidigeIntervalStap` (formulier zonder Definition), `huidigeCyclingIntervalStap`, `huidigeSwimmingIntervalStap`, erg-`_ivExec`/`exNote` — GAP-P2-029.
- **Concurrency-incident + provenance:** de B1-implementatie is aangetroffen als ongecommitte worktree-diff van een parallelle, afgebroken sessie (mtimes 14:40–14:58 UTC; geen actieve processen bij overname). Behandeld als UNTRUSTED input: volledige diff-review tegen main `6047350f…` (9 gewijzigde + 2 nieuwe bestanden, 0 unrelated), migratie- en testfile-review. §7-besluit **B — PARTIALLY SOUND**: architectuur, migratie, Builder/Preview/snapshot/executie/logging/History INTENDED en correct; één INCOMPLETE gevonden: het lopende (deel)blok ging bij vroegtijdig afronden verloren → review-fix `structuredRunningCloseOpenBlock()` in `runningRequestFinish()` (status nog RUNNING; vanuit PAUSED bewust geen fake lap). Geen aangetroffen code verwijderd.
- **Tests:** `fStructuredIntervalsCanonical.test.js` 97/97 (incl. review-fix); sabotage: instance-id weg → 1, lokaal intervalBlokken-model → 21, lap-semantiek weg → 4 failures; regressie 370/370. APP_VER v4.69.83 → v4.69.84. Draft PR, NIET mergen.
- **Verantwoordelijke:** Product Owner (GO B1), uitgevoerd door Claude.

## Return After Absence / Deload — Fase A (audit) + Fase B1 (prescription-path repair)

- **Datum:** 13 september 2026. Aanleiding: PO merkte na ~3 weken vakantie geen gewichtsaanpassing. Fase A-classificatie **H — MULTIPLE COMBINED GAPS**, primair **C — CONNECTION GAP**: DEC-DETRAIN-001 (`detraining.v1`, `DETRAINING_RULES_V1`, F0.7L `resolveWorkingWeight()`) bestond en werkte via Preview/Mijn training, maar het programmapad (`launchProgramTrainScreen`, `computeProgPrefill`) berekende het werkgewicht rechtstreeks via `suggestWeightForRepsRpe()` zonder `prev.date`. Sub-gaps: geen inactivity-signalen in Context, 1RM zonder recency, bandfactoren productheuristiek, uitleg alleen in Preview.
- **Besluit B1:** regel en banden ONGEWIJZIGD; gedeelde canonical previous-performance-bron `loadPrevPerformance()` (extractie van de Preview-logica); programmapad via `resolveProgramItemWeight()` → resolver; `computeProgPrefill()` delegeert; provenance `_detrain` naar Normal execution voor de bestaande F0.7L-zin. Guided `replaceEx()` bewust niet gewijzigd (sync; alleen niet-canonical `tk_gw_hist` zonder datum → geen fake prev).
- **Tests:** `fDetrainingPrescriptionPaths.test.js` 76/76; sabotage programmapad-bypass → 3, prev.date weg → 4 failures; regressie 371/371. Statische gate: `suggestWeightForRepsRpe()` één productiecaller. APP_VER v4.69.84 → v4.69.85. Draft PR, NIET mergen.
- **Verantwoordelijke:** Product Owner (GO B1), uitgevoerd door Claude.

## Strength Basis Recency — evidence/rule design + Fase B1 (canonical basis selection)

- **Datum:** 13 september 2026. Audit: 1RM-basis was datumloos en "hoogste wint" (handmatig > rep-PR-kg > max-Epley over 30 sessies) → recente lagere prestaties verlaagden de prescriptie niet; detraining kon dat per ontwerp niet compenseren. Evidence (Bosquet 2013 dosis-respons; Hwang 2017 geen verlies ≤2 wk bij getrainden; Larsen 2021/Greig 2022: 1RM fluctueert, autoregulatie op actuele prestatie ≥ %1RM) ondersteunt het principe, geen numerieke verval-/leeftijdsdrempel.
- **PO-besluiten (B1):** geen decay-formule; meest recente representatieve prestatie (reps ≤10) als basis; piek apart (analytics); rep-PR uit de 1RM-precedentie (data blijft); handmatige 1RM behoudt precedentie, niet automatisch verlaagd, wél gedateerd via `exercise_goals.updated_at`; geen middeling; geen DEC-BASIS-001; DEC-DETRAIN-001 ongewijzigd.
- **Implementatie:** `CalcCore.selectStrengthBasis` (CALC-STR-006, `strength_basis.v1`; registry-ID 003 was al bezet door Volume); `loadStrengthBasis`/`strengthBasisCache`; `getOneRM` zonder `prFor`; `strengthBasisProvenance` in `resolveWorkingWeight` (dataQuality-categorieën ≤14 d high / ≤56 d medium / anders low = productkeuze); uitleg in Preview + Normal execution; Stats/progress-context via dezelfde selector (peak); `migratie_v564.sql`.
- **Tests:** `fStrengthBasisSelection` 97/97 (sabotage 8/4/3), `fDetrainingPrescriptionPaths` 82/82, registry-tellingen (6/32/5) bijgewerkt; regressie 372/372. APP_VER v4.69.85 → v4.69.86. Draft PR, NIET mergen.
- **Procesnotitie:** tijdens de sabotagefase is met `git checkout -- index.html` één keer de nog niet gecommitte implementatie weggegooid; exact opnieuw uitgevoerd en als tussenstand gecommit vóór verdere sabotage.
- **Open:** middeling meerdere sessies (evidence/product), DEC-BASIS-001, GAP-P3-031 (a/b/d/e); `CALCULATION_EVIDENCE_SPEC §5.2` bevat een verouderde handmatige telling (23/B=4) — pre-existing docs-debt, niet herschreven.

## Readiness Input & Application Parity (GAP-P3-032) — Fase B

- **Datum:** 14 september 2026. Root cause (Adaptive Prescription Completion Audit): Programma paste DEC-RECADJ-001 vóór Brzycki toe (sets/RPE-mutatie, check-in met gevoel+pijn); Normal/Guided via `applySessionRecovery`/`recoveryWeightFactor` met pijn hard `null`; override-vs-readiness ongedocumenteerd.
- **Besluit/implementatie:** `recoveryAdjustmentForToday(muscles, opts)` = enige canonical aanroep (gevoel `hrv_log.voelt` vandaag; pijn `checkin_conditions` 'Pijn: …' vandaag via `todayPainMuscle()`; expliciete check-in als opts); Programma via `sessionRxAdj[ctxT]` → `applySessionRecovery` (geen pre-mutatie); `evaluateProgAdjustment` via de canonical functie; `_weightOverride` op Preview-/Guided-items → `_rxOverrideBypass` (gewicht finaal, sets/RPE-delta wel); provenance `inputs` + uitleg (`readinessInputsText`). DEC-RECADJ-001/DEC-DETRAIN-001/DEC-PROG-001 ongewijzigd; geen adaptive use van adherence/inactivity/RPE-trend/dataQuality/peak.
- **Tests:** `fReadinessParity.test.js` 57/57; sabotage: pre-Brzycki-route → 2, pijn null → 8, override numeriek → 2 failures. Regressie 373/373. APP_VER v4.69.86 → v4.69.87. Draft PR, NIET mergen.
- **Buiten scope:** GAP-P3-031 (a: Guided `replaceEx` prev.date; b/d/e), 1RM-middeling, DEC-BASIS-001, Structured Intervals B2, Concept2, dormant contextEngine/LongitudinalTrend.

## Canonical Replacement/Add Prescription (GAP-P3-033 + 031a) — Fase B

- **Datum:** 14 september 2026. Root cause (Canonical Athlete Loop audit): swap/replace/add zetten `suggestedWeight:null` → prefill = `prevS.weight` (keyed op de nieuwe oefening, dus geen cross-exercise-lek, maar wél zonder CALC-STR-006/DETRAIN/RECADJ-gewichtsfactor); oude provenance/override-vlaggen liftten mee; Guided `replaceEx` zonder prev.date.
- **Besluit:** intent (sets/reps/RPE/rest) van het blok (#338) + exercise-specifieke load canonical opnieuw via `canonicalNewExerciseItem()`; geen cross-exercise gewicht; no-base → null; override-vlaggen gereset (een oude exercise-override is exercise-specifiek, niet block-level); readiness via de bestaande route één keer; Guided: `replaceExAsync` laadt de basis vooraf, `_tkGuidedRxAdj` voor één readiness-toepassing. Geen rule-/formulewijziging.
- **Tests:** `fReplacementPrescription` 47/47; sabotage A/B/C 1/1/3; #338-locks (`fExerciseSwapPrescriptionWeight`, `fExerciseSubstitutionCanonicalSource`, `fBuilderSwapAthleteConstraints`) root-cause bijgewerkt. Regressie 374/374. APP_VER v4.69.87 → v4.69.88. Draft PR, NIET mergen.
- **Open:** GAP-P3-031 (b) inactivity/adherence → Context/Decision, (d) evidence-grading detraining, (e) situaties C/D; DEC-BASIS-001; 1RM-middeling; Structured Intervals B2; Concept2.

## Inactivity & Adherence → Context (GAP-P3-031b)

- **Datum:** 14 september 2026. Bronnen (bewezen): `sessions` (kracht = gewicht+reps; overige sessions-rijen = erg/cardio), `activities` (endurance, `recorded_at` → lokale kalenderdag met td()-semantiek), `program_blocks` (planned_date/completed_at/schedule_status) en `planned_training_occurrences`+`planned_training_assignments` (status planned/completed/skipped, cancelled-occurrences). Bestaande canonical missed-logica `ScheduleAdherenceCore.resolveScheduleGap` hergebruikt; geen tweede adherence-engine.
- **Besluit:** CALC-ACT-001 `inactivity.v1` + CALC-ACT-002 `adherence.v1` (evidence E, descriptief, geen drempels, null blijft null), alleen naar Context (`tkInactivityAdherenceContext()`); geen Decision Rule, geen prescription-invloed (statisch + sabotage bewezen); DEC-DETRAIN-001 ongewijzigd met eigen input. Adherence → Decision blijft een apart productbesluit. Niet geïmplementeerd: erg-sessies als endurance-inactivity (sessions-rijen missen sportklassificatie zonder join → tellen voor overall).
- **Tests:** `fInactivityAdherence` 46/46; sabotage A/B/C 4/3/1. Regressie 375/375. APP_VER v4.69.88 → v4.69.89. Draft PR, NIET mergen.
- **Review-fix (P1, PR #351):** `program_blocks` wordt in de adapter niet meer ongescoopt gelezen: `tkOwnedProgramBlocksInWindow(uid, vanaf, today)` = `programs&user_id=eq.<uid>&select=id` → `program_blocks&program_id=in.(<eigen ids>)` + datumvenster; geen programma's → []; geen uid of query-fout → [] (nooit fallback naar alle blokken). Tests A–F + sabotage 6/2/2. Pre-existing ongescoopt patroon in `tkWeekOverview` geregistreerd als GAP-P4-003 (buiten scope).

## Weekoverzicht ownership (GAP-P4-003)

- **Datum:** 14 september 2026. `tkWeekOverview()` (enige caller `renderWeekOverview`) las `program_blocks` ongescoopt op `planned_date`. Reparatie: dezelfde canonical owner-helper als #351 (`tkOwnedProgramBlocksInWindow`), geen tweede owner-logica; `computeProgramProgress` ontvangt uitsluitend eigen blocks. Geen RLS-/scheduling-/adherence-wijziging; CALC-ACT-001/002 en Decision ongemoeid.
- **Tests:** `fWeekOverviewOwnership` 17/17; sabotage 10/2/2; `fInactivityAdherence` 55/55, `fVoortgang` groen. Regressie 376/376. APP_VER v4.69.89 → v4.69.90. Draft PR, NIET mergen.
- **Review-correctie (PR #352):** de closure-claim "laatste ongescoopte read" was onjuist; `renderKalender()` en `inzichtRenderDevelopment()` lazen `program_blocks` nog ongescoopt. Beide in dezelfde PR gescoopt via de generieke `tkOwnedProgramBlocks(uid, extraQ, {nullOnError})` (window-helper delegeert); GAP-P4-004 geregistreerd en gesloten; static gate verbreed naar alle read-helpers. Testsuite 28/28; sabotage 2/2/3.

## Structured Intervals B2 — cycling + swimming canonical (GAP-P2-029), erg → B3

- **Datum:** 14 september 2026. Audit: cycling/swimming hadden dezelfde execution-core (`EnduranceExecutionCore`), hetzelfde lap-schema (migratie v563, sportneutraal) en dezelfde Preview/Definition-infrastructuur als running; alleen de verbindingen ontbraken. Erg gebruikt een andere persistence (`sessions` + exNote) → apart besluit.
- **Besluit/implementatie:** één sportneutrale structured-laag met `TK_ENDU_SPORT`-dispatch (state/config/persist/render per sport strikt gescheiden); `IntervalEngineCore` blijft de enige executie-semantiek; running-wrappers behouden hun B1-namen en gedrag; Preview-gate en Builder uitgebreid naar running|cycling|swimming; cycling/swimming-finish krijgt instance-link + lap-semantiek; History-renderer hergebruikt. Ad-hoc formulier-intervallen lopen nu via `tkAdhocIntervalPrescription` op hetzelfde model — de vaste warming-up/cooling-down (600/600 s resp. 300/300 s zwemmen) is bewust ONgewijzigd overgenomen (geen UX-besluit zonder PO).
- **Bewust niet:** erg-persistence (GAP-P2-031/B3), target-enforcement, GPS-auto-afstand, HR/power-targets, Concept2 (blijft EXPERIMENTAL — SOFTWARE VALIDATED — HARDWARE REVALIDATION PENDING), nieuwe Decision Rules, DB-migratie.
- **Tests:** `fStructuredIntervalsB2` 68/68; B1-suite 107/107; `fB9_02BRunningClosure` F1/F2/G1 root-cause bijgewerkt (ad-hoc via IntervalEngineCore). Regressie 377/377. APP_VER v4.69.90 → v4.69.91. Draft PR, NIET mergen.
- **Review-remediatie (PR #353):** de eerste closure rustte deels op statische asserties. Toegevoegd: dynamische productie-bewijzen voor Definition-round-trip (cycling/swimming), immutable instance-snapshot (bronmutatie ná start verandert plan noch History-output; renderer leest uitsluitend `training_instances`), History planned-vs-actual per sport, incomplete/abort-semantiek, Calculation→Context-continuïteit met harde sport-isolatie, en de executie-grens (`TK_STRUCTURED_SPORTS`) die erg/onbekende sporten fail-closed weigert — `IntervalEngineCore` valideert het sportveld bewust niet. Zwem-eenheden gecorrigeerd via de gedeelde formatter `tkStructuredLapActualText`. De architectuur-invariant wordt nu gedragsmatig/statisch bewaakt (één `blockIndexAtElapsed`-aanroep, geen sport-eigen stap-implementatie, geen legacy timing-lus, running-wrappers als delegaties) in plaats van op commentaartekst.

## Structured Intervals B3 (Erg) — sessions-domein persistence (GAP-P2-031)

- **Datum:** 14 september 2026. PO-besluit na architectuuraudit: erg-actuals in het sessions-domein (`sessions.intervals_detail`, jsonb, `erg_intervals_actual.v1`), NIET in activities/activity_laps; en: een structured Erg-Definition bevat exact één canonieke erg-oefening (executie-identiteit + `sessions.exercise_id`), plan blijft `metadata.intervalPrescription`.
- **Bewijs voor de tabelkeuze:** `docs/B9_H6B_CONCEPT2_CANONICAL_DATAFLOW_AUDIT.md` (sessions = workout-execution log incl. ergometer; activities = standalone endurance; beide moeten bestaan; migratie/dual-write onnodig). Voor jsonb boven child-tabel: atomische write met de sessierij, ownership erft van sessions (geen nieuwe, niet-bewijsbare policy), geen per-lap query-behoefte, precedent `sets_detail`.
- **Resterend (P4):** BikeErg-cadans (`stroke_rate`) en drag/weerstand (vrije tekst) blijven semantische schuld — B3 verergert dit niet (cadans wordt niet in de structured actuals geschreven); erg blijft buiten `tkEnduranceCtxProject` (geen dual-write); sabotage 'instance-guard verwijderen' geeft geen gedragsverschil doordat een tweede fail-safe (onbekende instance → lege sectie) hetzelfde resultaat geeft.
- **Tests:** `fStructuredIntervalsB3Erg` 176/176; sabotage 3/4/12/4/2/3 failures; B2 181/181, B1 108/108; regressie 378/378. APP_VER v4.69.91 → v4.69.92. Draft PR, NIET mergen.
- **Onafhankelijke recovery-audit + remediatie (PR #354):** eerste closure rustte op statische sabotage-asserties tegen ongewijzigde code en op een architectuurredenering voor ownership zonder dynamisch vergelijkingsbewijs — beide gesloten, geen architectuurwijziging. (1) Reëel uitgevoerde sabotage: prescribed `target.pace` tijdelijk in actual `power_w` geschreven → bestaande "geen verzonnen telemetrie"-assertie faalde voor alle 3 sporten (3 mislukt) → exacte productiecode hersteld (sha256-identiek, `git diff` leeg) → 176/176 hersteld. (2) Ownership: `migratie_v565.sql` wijzigt geen RLS-policy (kolom erft de bestaande sessions-policy, precedent `edit_revision`/migratie_v547); de nieuwe Erg-History-read op `training_instances` is byte-identiek gescoped aan de reeds geaudite B1/B2-renderer; geen service-role-sleutel in enig Erg-codepad; de sessierij-insert stuurt zelf geen `user_id` mee (toewijzing blijft serverside). Expliciete restlimitatie: een live, twee-gebruikers Postgres-RLS-proef is nergens in deze repo uitvoerbaar (geen lokale Postgres/pgTAP-harness bestaat voor enige feature) — bovenstaande is het sterkste offline-bewijs. `fStructuredIntervalsB3Erg` nu **182/182**. Geen APP_VER-bump (nog niet gereleased, zelfde onafgeronde draft). `GAP-P2-031` = **CLOSED**.

## Endurance Typed Target Normalization — CALC-END-006 (Calculation Engine foundation)

- **Datum:** 15 september 2026. Vervolg op de Endurance Decision Authority & Target Semantics Gate.
  Bewijs: `target.pace`/`target.power` in `interval_prescription.v1` zijn vrije tekst voor alle sporten
  (hardlopen `4:30/km`, zwemmen `1:45/100m`, RowErg/SkiErg `1:50/500m`, fietsen/BikeErg `250 W` — alles
  via `.pace`; `.power` is een dood schemaveld zonder producent). Een generieke `target×(1±pct)` is
  daardoor ongeldig: pace (tijd/afstand) en vermogen lopen tegengesteld bij "lagere intensiteit".
- **Besluit:** typed-normalisatie hoort in de Calculation Engine (`core/cardio.js`, CALC-END-006,
  `endurance_target.v1`), niet in Builder/Preview/History/AI/Decision. Geen Decision-regel, geen
  readiness-koppeling, geen intensiteitstransformatie in deze sprint — uitsluitend parse/format.
- **Contract:** `{status,kind:'pace'|'power'|'rpe',value,unit,raw,reason}`; canonieke eenheden per
  oorspronkelijke noemer (`sec_per_km`/`sec_per_100m`/`sec_per_500m`/`watt`/`rpe_0_10`) — nooit stil
  omgezet tussen noemers. Geen DB-migratie; bestaande vrije-tekst prescripties blijven ongewijzigd
  bruikbaar en zijn alsnog typeerbaar (compatibiliteitsgrens, geen tweede bron van waarheid).
- **Tests:** `fStructuredIntervalsB3Erg` nu **182/182**; ` `core/fEnduranceTargetNormalization.test.js`
  **155/155** (round-trip per sport, RPE, 19 adversariale/fail-closed-gevallen, architectuurgrens tegen
  Decision/readiness/AdaptiveCoaching, backward-compatibility). Reële sabotage: noemer-semantiek
  weggegooid (`/500m`→`/km`) → 4 failures bewezen → exact hersteld → 155/155. B3 182/182, B2 181/181,
  B1 108/108 ongewijzigd. `core/cardio.js` zit in sw-guard `CORE_FILES` — CORE_SIG/CACHE_NAME/
  CACHE_STATIC meegebumpt in `sw.js`. APP_VER v4.69.92 → v4.69.93. Draft PR, NIET mergen.
- **Resterend (buiten scope, expliciet niet opgelost):** Decision→Calculation-vertaalregel voor
  "REDUCE_INTENSITY X%" per typed kind, readiness-koppeling, AdaptiveCoachingCore-refactor, Erg-Context.

## HRV Calculation Canonicalization — CALC-REC-001 (hrv_baseline.v1)

- **Datum:** 15 september 2026. Vervolg op de HRV Baseline & Longitudinal Learning Specification Gate,
  die vaststelde dat TK al een live, wetenschappelijk onderbouwde HRV-baseline/deviatieberekening had
  (Plews & Buchheit SWC-methode) maar zonder dedicated test, zonder expliciet versienummer, en met
  ongescheiden evidence-classificatie voor de 15%-drempel.
- **Besluit:** canoniseren/hardenen van de BESTAANDE berekening, geen herontwerp. `lnRmssd`/`hrvBaseline`/
  `hrvRollingRecent`/`hrvStPersonal`/`hrvDagFactorPersonal` verhuisd naar `core/calculation.js`
  (CALC-REC-001, `hrv_baseline.v1`); `index.html` bevat nu uitsluitend dunne wrappers.
- **Nieuw, additief:** `direction`-veld (`'above'|'within'|'below'|'ref'`) op `hrvStPersonal`/
  `hrvDagFactorPersonal` — bestaand `st`/`factor`-contract ongewijzigd; verhoogde HRV wordt nergens
  automatisch als negatief signaal behandeld (parasympathetic-saturation-fenomeen wel herkenbaar
  gemaakt, niet automatisch geduid — onvoldoende evidence voor een regel).
- **15%-ernst-drempel:** bewust ongewijzigd gelaten, expliciet als PRODUCT HEURISTIEK (evidence D)
  gedocumenteerd, los van de sterkere SWC-methodologie (evidence B) en de TK-vensterkalibratie
  (evidence C) — geen vervangende drempel verzonnen.
- **Tests:** `fHrvBaselineCanonicalization` 64/64 (nieuw, dedicated). Reële sabotage: SWC-multiplier
  0,5→0,3 → 2 FAILS bewezen → exact hersteld → 64/64 PASS. `fRecoveryRegistry`/
  `fCalculationRegistryCoverage` bijgewerkt naar de nieuwe canonieke locatie (49/49, 5/5). Volledige
  regressie 379 uitgevoerd, 2 bekende sandbox-omgevingsfouten (ongewijzigd). `core/calculation.js` zit
  in sw-guard `CORE_FILES` — CORE_SIG/CACHE_NAME/CACHE_STATIC meegebumpt. APP_VER v4.69.93 → v4.69.94.
  Draft PR, NIET mergen.
- **Bevestigd ongewijzigd:** `AdaptiveCoachingCore` 0 runtime-aanroepers; geen HRV-verwijzing in
  `core/cardio.js` (endurance target-normalisatie); geen Decision-actiewoord in `calculation.js`; geen
  migratie; raw RMSSD blijft de enige persistentiewaarheid (LnRMSSD blijft altijd afgeleid, nooit
  gepersisteerd).
- **Resterend (buiten scope, expliciet niet opgelost):** device-merk-granulariteit in provenance,
  meetcontext-metadata, HRV-CV/non-functioneel-overreaching-signaal, endurance-Context-koppeling,
  Decision-regelvorming — allemaal expliciete non-goals van deze sprint.

## Erg Analytics Visibility V1 — read-only sessions-projectie (geen Calculation)

- **Datum:** 15 september 2026. Aanleiding: de Analytics & Longitudinal Athlete Intelligence-audit
  toonde dat RowErg/BikeErg/SkiErg volledig onzichtbaar waren in longitudinale analytics — zij worden
  canoniek in `sessions` gelogd en hebben geen `activities`-tegenhanger, terwijl alle endurance-
  analytics uit `activities` projecteren.
- **Besluit (PO, definitief):** V1-projectie omvat UITSLUITEND rowing/bikeerg/skierg. Handmatig
  gelogde running/cycling/swimming-sessies worden bewust GEWEIGERD: die kunnen ook in `activities`
  bestaan en er is geen bewezen gedeelde dedup-identifier (`activities` heeft `dedupe_key`, `sessions`
  niet) — meenemen zou training kunnen dubbeltellen. Apart vastgelegd als **P3 — MANUAL CARDIO
  ANALYTICS VISIBILITY / CROSS-PERSISTENCE DEDUPLICATION (uitgesteld)**.
- **Architectuur:** `core/ergAnalyticsProjection.js` is een read-only ADAPTER, expliciet GEEN
  Calculation — hij rekent niets, claimt geen CALC-ID en introduceert geen nieuw versiecontract; hij
  normaliseert naar het reeds bestaande analytics-vormcontract. Alle daadwerkelijke berekening blijft
  bij de bestaande canonieke calculations (weeklyVolume, sessionLoadSRPE/rollingLoadSum).
  `ProgressionCore.trendBy()` is voor Ergs bewust **niet** runtime-aangesloten (zie scope hieronder).
  Geen dual-write, geen migratie, geen tweede bron van waarheid.
- **Semantische grenzen:** sport uitsluitend uit `exercise_id` (nooit uit stroke_rate/afstand/label);
  BikeErg nooit rowing; cadans weggelaten (RPM vs slagfrequentie onverenigbaar — weglaten boven
  semantische corruptie); afstand strikt per machine gescheiden, tijd/sRPE wel aggregeerbaar;
  BikeErg 1000m-splitbasis vs RowErg/SkiErg 500m blijft ongemoeid.
- **Grenzen bewaard:** geen Decision-regel, geen readiness-autoriteit, geen adaptatie-semantiek;
  structured-interval-analytics blijft session-summary-only; AI ontvangt uitsluitend reeds berekende
  waarden; `AdaptiveCoachingCore` blijft losgekoppeld; `LongitudinalTrendCore` blijft dormant.
- **Tests:** `fErgAnalyticsProjection` 88/88. Sabotage: running door de adapter -> 4 FAILS;
  bikeerg->rowing -> 12 FAILS; beide sha256-identiek hersteld. Volledige regressie 380, 2 bekende
  sandbox-fouten. APP_VER v4.69.94 -> v4.69.95. Draft PR, NIET mergen.
- **Nog open (niet opgelost in deze sprint):** manual-cardio-dedup (P3), interval-niveau-analytics,
  CSS/zwemanker, coach/team-analytics.

### Scope-correctie na onafhankelijke pre-merge-audit (PR #357)

De onafhankelijke audit stelde vast dat het oorspronkelijke sprintrapport trend-hergebruik claimde dat
niet is uitgeleverd. Hieronder de accurate scheiding.

**LIVE in PR #357** — RowErg/BikeErg/SkiErg-sessies nemen canoniek deel aan:
endurance-weekvolume; trainingsduur/-frequentie; sRPE/trainingsbelasting waar de vereiste invoer (RPE)
bestaat; rolling load waar van toepassing; de endurance-Context; en de daaruit volgende AI-context op
basis van reeds berekende waarden. Dit is echte analytics-deelname, geen cosmetische zichtbaarheid.

**NIET live in PR #357** — Erg-prestatietrend; verbeter-/achteruitgangsclassificatie; PB-intelligentie;
plateau-intelligentie; cross-sessie-prestatievergelijking. De tests die sport-/trendisolatie aantonen
zijn **veiligheidstests voor toekomstig gebruik** en betekenen niet dat een prestatietrendfunctie live is.

**Productbesluit (vastgelegd):** Erg-data moet daadwerkelijk meetellen in Trainingskompas-analytics.
PR #357 legt de canonieke deelname vast voor volume, belasting en Context. Prestatieprogressie is
**bewust gescheiden** omdat Erg-prestatievergelijkingen strikte sport- en inspanningsspecifieke
vergelijkbaarheid vereisen. Een latere Erg Performance Intelligence-sprint mag uitsluitend prestaties
vergelijken die aantoonbaar vergelijkbaar zijn.

**Uitgestelde toekomstige scope (NIET geïmplementeerd):** RowErg-, BikeErg- en SkiErg-
prestatie-intelligentie, met als harde invarianten voor die latere sprint: RowErg ≠ BikeErg ≠ SkiErg;
500m ≠ 2000m ≠ 5000m tenzij een wetenschappelijk/canoniek verantwoorde normalisatie bestaat;
gestructureerde intervallen ≠ continue inspanningen by default; BikeErg-splitbasis blijft 1000m,
RowErg/SkiErg 500m; geen universele Erg-prestatiescore zonder bewijs; geen AI-berekende trend; geen
cross-machine-prestatievergelijking.

**Los uitgesteld (ongewijzigd):** P3 — MANUAL CARDIO ANALYTICS VISIBILITY / CROSS-PERSISTENCE
DEDUPLICATION. Handmatige running-/cycling-/swimming-sessies blijven buiten de Erg-adapter omdat er
geen veilige gedeelde sessions↔activities-dedup-identiteit bestaat.

## Erg Continuous Protocol Identity — protocolintentie vóór actual (v4.69.96)

- **Datum:** 15 september 2026. Vervolg op de Concept2/Erg-reconciliatiegate, die bewees dat
  `interval_prescription.v1` de protocol-primitief al bezit (`TERMINATION_TYPES = time|distance|manual`)
  en dat een continue inspanning de kleinst geldige prescriptie is (`repeat:1`, één work-blok).
- **Nieuw gevonden lifecycle-feit (bepalend voor het ontwerp):** het losse Erg-pad had GEEN
  pre-executiemoment — het was een invulformulier achteraf. De eis "intentie gaat vooraf aan actual"
  vereiste daarom een echte start-stap; extra velden op het bestaande formulier zouden per definitie
  te laat zijn geweest.
- **Besluit:** géén nieuw protocolcontract. `core/ergProtocolIdentity.js` hergebruikt de bestaande
  terminatiesemantiek 1-op-1. Atleet-labels (Vrij/Afstand/Tijd) zijn uitsluitend presentatie; de
  canonieke waarden blijven `manual|distance|time`.
- **Ad-hoc instance:** losse Ergs met een doel leggen hun intentie vast in een `training_instance` met
  beide saved-workout-ID's `null` (expliciet toegestaan door `createTrainingInstance`). Geen
  nep-opgeslagen workout; geen lek naar Mijn trainingen (die lijsten lezen `vaste_trainingen`/
  `custom_trainings`, nooit `training_instances` — forensisch bevestigd).
- **Bron van waarheid:** prescriptie/immutable snapshot = INTENTIE. `sessions.protocol_type`/
  `protocol_value` (migratie_v566) zijn IMMUTABLE QUERY-PROJECTIES, geen zelfstandige waarheid; bij
  tegenspraak wint het snapshot. Structureel afgedwongen: de projectiefunctie heeft exact één
  parameter (de prescriptie) en kan een actual dus niet eens zien.
- **Historisch/Concept2:** geen backfill, geen heuristiek. NULL betekent onbekende intentie, niet
  "vrij". Concept2-import zonder TK-prescriptie blijft onbekend, ook bij exact 2000 m of 30:00.
- **Tests:** `fErgContinuousProtocolIdentity` **106/106** incl. 23 runtime-wiring-asserties.
  Zeven sabotages bewezen en byte-exact hersteld (S1/S2/S4/S5/S6/S7/S8). Twee bestaande tests
  meegegroeid: `fHardening` (leesvenster 5200→6200, asserties ongewijzigd) en
  `fStructuredIntervalsB3Erg` (`training_instance_id` nu incl. ad-hoc fallback; nog steeds één
  sessierij). Volledige regressie 381, 2 bekende sandbox-fouten. APP_VER v4.69.95 → v4.69.96.
- **Expliciet NIET live:** Erg Performance Intelligence (PB/trend/plateau), PM5 workout control.
  Uitgesteld en ongewijzigd: Concept2 `duration_s` (P4, aparte PR), manual-cardio-dedup (P3).

### Pre-merge-reparatie PR #358 (audit klasse C → A)

- **P3-A dubbel-submit-race (gerepareerd):** `tkErgStartProtocol` controleerde `instanceId` vóór de
  `await createTrainingInstance(...)` terwijl dat veld pas erná werd gezet; twee snelle kliks konden
  twee ad-hoc instances maken. Nu een busy-vlag vóór de eerste await, knop direct disabled, vrijgave
  in `finally` (ook bij exception). Bewezen met echte concurrency-tests op de geëxtraheerde
  productiefunctie; sabotage R1/R2/R3 gedetecteerd en byte-exact hersteld.
- **P3-B Builder (opgelost zonder nieuwe code):** forensiek bewees dat `ivRaw()` het canonieke
  terminatiemodel al gebruikt en bij `repeats=1` zonder warm-up/cooldown/herstel de continue vorm
  oplevert. Equivalentie Builder ↔ los pad nu getest (6 combinaties); geen shadow-protocolmodel.
  Opgeslagen trainingen blijven Definition → `startInstanceFromDefinition` → snapshot volgen; er
  wordt op dat pad géén ad-hoc instance gemaakt.
- **Geaccepteerde P4's (bewust niet uitgebreid):** (a) "Vrij" persisteert geen expliciet protocol en
  is niet te onderscheiden van legacy-onbekend — beide even niet-PB-geschikt, geen onnodige instance
  aangemaakt; (b) een afgebroken Afstand/Tijd-start laat een `active` ad-hoc instance achter, wat de
  bestaande architectuur al tolereert — opschoning is een aparte follow-up; (c) het
  `fHardening`-leesvenster blijft een magic number (nu 6200, 542 tekens marge) — asserties
  ongewijzigd, structurele begrenzing is een losse verbetering.
- **Preview (scope gesloten in dezelfde PR):** de continue Erg-protocolregel is live in de bestaande
  `renderTPInterval`-hero via `tkIvContinuousProtocolText()`, uitsluitend gevoed door de canonieke
  `protocolProjectionFromPrescription()` — geen tweede parser, nooit een actual. Fail-closed voor
  manual/Vrij, gestructureerd B3 (8x500m wordt nooit "4000 m continu"), onbekend en niet-Erg.
  Intensiteit blijft gescheiden (pace/RPE/W via `tkIvTargetText`); machine-identiteit gepind (de chip
  komt uit `norm.sport`, de helper mag `norm` nooit hermappen). Preview-sabotages P1/P2 (actual
  lezen), P3 (BikeErg->RowErg), P4 (gestructureerd samenvouwen), P5 (shadow-parser) alle vier
  gedetecteerd en byte-exact hersteld. `fStructuredIntervalsCanonical` (B1) kreeg de nieuwe helper +
  `ErgProtocolIdentity` in zijn sandbox-harness zodat de ECHTE Preview-renderer blijft draaien --
  geen verzwakte assertie, alleen de ontbrekende dependency (108 -> 109 asserties).
  APP_VER blijft v4.69.96 (geen extra bump voor reparatiewerk binnen dezelfde PR).

## DEC-MOVEKIT-001 — MoveKit Batch 001: geen nieuwe media-infrastructuur (15 september 2026)

**Context.** De Exercise Catalog moest van 206 naar uiteindelijk 412 MoveKit-oefeningen. Een
eerdere pilot had een openstaande architectuurvraag achtergelaten: de catalogus declareert
`movekit-posters` met `format: webp`, terwijl de repository 0 fysieke .webp-bestanden bevat,
en `videos/` is 437 MB normale, niet-LFS Git-inhoud.

**Onderzoek (evidence-first).** Vier opties vergeleken: normale Git, Git LFS, Supabase Storage,
bestaande TK media/CDN.
- `scripts/build-www.mjs` sluit `videos/` **expliciet** uit van de Capacitor/Android-build met
  een gedocumenteerde reden (AAB zou ruim 450 MB worden). De Android-app haalt video's dus al
  van de productie-webomgeving.
- `sw.js` heeft een aparte, **van de app-versie losgekoppelde** videocache (`tk-videos-v1`) met
  cache-first, on-demand ophalen en een 250 MB LRU-plafond; app-updates wissen video's niet.
- `ExerciseAssetProvider` is een schone provider-registry (`resolve(id,type)`,
  `register(type,provider)`) — nieuwe mediatypen pluggen in zonder cataloguswijziging.
- Supabase Storage wordt al gebruikt, maar uitsluitend voor de **private** `avatars`-bucket met
  per-user RLS; publieke, anonieme oefeningmedia is een wezenlijk ander toegangsmodel en zou een
  nieuwe bucket, nieuw policy-model en een productie-consolehandeling vereisen.

**Besluit.** Voor Batch 001 (20 video's, ~68 MB) wordt **geen nieuwe media-infrastructuur
gebouwd**. Video's volgen exact het bestaande, bewezen Sprint 11A-patroon (normale Git +
`VIDEO_MANIFEST` + SW-cache). Posters krijgen `embedded: false`, exact het bestaande
meerderheidspatroon (194 van de 206 bestaande records), dat al bewezen fail-closed degradeert.

**Waarom niet nu al migreren.** Git LFS of Supabase Storage zijn reële kandidaten voor de
schaalsprong naar 412+ oefeningen, maar (a) een migratie van de bestaande 206 video's valt
buiten de opdrachtscope, (b) Supabase Storage vereist een onomkeerbare, externe PO-handeling
(bucket + publiek toegangsbeleid), en (c) de bestaande architectuur draagt deze batch aantoonbaar
zonder wijziging. **Expliciet vastgelegd als openstaande vervolgbeslissing:** vóór de resterende
circa 186 oefeningen moet de opslagroute opnieuw worden gewogen — de repo groeit dan richting
~1,2 GB zonder LFS.

**Poster-WebP.** De `format: webp`-declaratie is geclassificeerd als **stale metadata**, niet als
canonieke runtimevorm. Bewust **niet** gecorrigeerd in deze PR: het veld wordt door geen enkele
resolver gelezen (`_providers.poster.resolve()` kijkt alleen naar `EXERCISE_POSTERS`/`_manifest`),
dus een wijziging zou puur cosmetisch zijn en de diff onnodig vergroten. Vastgelegd als P4.

**Cycling-poster-brondefect.** `cycling-intervals.png` en `cycling-sprint.png` zijn byte-identiek
(sha256 `ca6250217d643f0e...`, beide 3.325.805 bytes), terwijl hun video's wél verschillen.
Classificatie: `SOURCE_ASSET_REVIEW_REQUIRED`. Besluit: **niet gokken** welke van de twee correct
is en **nooit** dezelfde afbeelding aan beide koppelen. Beide posterbestanden zijn buiten de
import gehouden; de twee oefeningen zijn wel geimporteerd met correcte, unieke video's. De poster
resolvet fail-closed naar `null`. **Actie voor de leverancier:** twee vervangende, van elkaar
verschillende posterbestanden aanleveren.

**Lege intelligence/relations.** Bewust leeg gelaten voor de 20 nieuwe records. De bestaande 206
hebben NL-cues, fatigue/recovery-classificaties en confidence-scores die aantoonbaar uit een
deterministische generator komen die niet in de repository aanwezig is. Zelf waarden invullen zou
neerkomen op het verzinnen van wetenschappelijke classificaties en relationele verbanden —
expliciet verboden. `ExerciseIntelligence.scores()` valt voor ontbrekende velden terug op een
neutrale default (50), dus er ontstaat geen crash en geen misleidende uitspraak. **Openstaand
vervolgwerk:** deze 20 records verrijken zodra de canonieke generator beschikbaar is.

## DEC-MOVEKIT-002 — Mediaclassificatie gecorrigeerd + MoveKit Media Scale Gate verplicht (15 september 2026)

**Aanleiding.** Onafhankelijke pre-merge audit van PR #359, classificatie
**B — safe after documentation/classification correction only**.

**Correctie op DEC-MOVEKIT-001.** DEC-MOVEKIT-001 beschreef de keuze voor normale Git correct
als “voor Batch 001” en noemde LFS/Supabase expliciet uitgestelde, niet afgewezen kandidaten.
De begeleidende sprintrapportage presenteerde die keuze echter als **OPTION A, CONFIDENCE HIGH**,
wat suggereert dat normale Git een bewezen canonieke langetermijnarchitectuur is. Dat wordt door
het bewijs niet gedragen.

**Vastgelegde, correcte classificatie.**
- Normale Git = **acceptable Batch-001 pilot / current-precedent path.**
- Langetermijndoel voor MoveKit-media = **UNRESOLVED.**

**Onderbouwing.** Het bewijs toont aan dat de bestaande architectuur déze batch draagt
(`build-www.mjs` sluit `videos/` al uit van de Android-build; `sw.js` cachet on-demand met een
250 MB LRU-plafond los van de app-versie). Het bewijs zegt niets over schaal: `.git` staat na
Batch 001 op circa 567 MB, de resterende circa 186 oefeningen voegen naar schatting circa 630 MB
toe (richting circa 1,2 GB). “Werkt vandaag” is niet hetzelfde als “schaalt canoniek naar
412/1.000/10.000”.

**Migratieschuld, expliciet beoordeeld.** Het mergen van deze 20 MP4's voegt circa 68 MB
permanent toe aan de Git-history, bovenop de circa 437 MB die er al staat (+15%). Werkboom-
migratie naar LFS of object storage is triviaal en omkeerbaar; history-opschoning vereist óf een
rewrite (`filter-repo`/BFG + force-push op een protected branch) óf het accepteren dat de blobs
in de history blijven. Die keuze is bij 226 video's even zwaar als bij 206 — de schuld is
**materieel in bytes maar niet categorisch nieuw**, en daarmee **niet merge-blokkerend**.

**Besluit: MOVEKIT MEDIA SCALE GATE is verplicht en blokkerend vóór Batch 002.** Minimaal te
vergelijken en te beantwoorden: normale Git · Git LFS · object storage/Supabase Storage ·
Netlify build/deploy · PWA-videocache (`tk-videos-v1`, 250 MB LRU) · Android/Capacitor
(`build-www.mjs`-exclusie) · Git-history-groei · bandbreedte en kosten · migratiepad voor de
reeds gecommitte 226 video's · schaal naar 412 / 1.000 / 10.000 oefeningen. PR #359 wordt
hiervoor **niet** teruggedraaid.

**Aanvullend geregistreerd, niet gerepareerd in PR #359.**
- **P3-MOVEKIT-INTEL — intelligence provenance / unknown-state gap.** `intelligence = {}` op de
  20 nieuwe records omdat geen bewezen deterministische classifier beschikbaar is. Correctie op
  de eerdere voorstelling dat de default 50 puur intern is: `_intelDashboard()` toont die 50
  zichtbaar aan de sporter voor onder meer CNS, vermoeidheid en herstelduur, met mid-band-copy,
  zonder onderscheid van de geclassificeerde 206. Te besluiten vóór grootschalige expansie:
  (A) UNKNOWN/“—” tonen, (B) een deterministische classifier met aantoonbare provenance
  terugvinden/herbouwen, of (C) een andere evidence-safe canonieke oplossing. Geen
  wetenschappelijke waarden verzinnen.
- **P3-LIB-CONFSORT — confidence-sort unknown-value handling.** Comparator
  `b.intelligence.confidence - a.intelligence.confidence` kan NaN retourneren bij `undefined`.
  Geen crash of dataverlies bewezen; sortering niet deterministisch gedefinieerd voor UNKNOWN.
- **P4-MOVEKIT-POSTERMETA — stale provider metadata.** `format: webp` runtime ongebruikt;
  `total` is nominale catalogusdekking, geen fysieke posterdekking. Geen runtime-impact.

**S3-precisie.** S3 (missing media) is werkelijk handmatig uitgevoerd en waargenomen, maar is
**niet** als permanente CI-regressietest vastgelegd, in tegenstelling tot S1/S2/S4/S5/S6.
Permanent geborgd is wél “wrong media is never substituted” via de
asset-mapping-integriteitsguard. “Exercise remains usable with missing media” berust op de
bestaande, ongewijzigde `_libLoad()`-fallback plus die handmatige sabotage.

**Cycling-posters.** `cycling-intervals` en `cycling-sprint` blijven `SOURCE_ASSET_REVIEW_REQUIRED`.
Geen poster toegevoegd, geen gok, geen fallback. Correcte bronassets zijn nodig vóór
posteruitrol; dit blokkeert de identiteit/video-import van beide oefeningen niet.

## DEC-MOVEKIT-003 — UNKNOWN-semantiek en posterdekking (Gate Closure A, 15 september 2026)

**INTEL-01 — UNKNOWN-representatie.** Geen nieuw vocabulaire uitgevonden. Hergebruikt uit
`exercise-intelligence_6.json` (`_meta.evidence_legend`: source/heuristic/estimated/generated;
`enums.validation_status`: unreviewed/reviewed/approved/rejected), met exact één additieve waarde:
**`unavailable`**. Waarde blijft `null`. Toegepast op uitsluitend TK-000207..226.
**UNKNOWN ≠ 0, ≠ 50, ≠ gemiddeld, ≠ lage-confidence-schatting.**

**INTEL-02 — Athlete-facing presentatie.** UNKNOWN rendert “— NIET BEPAALD” met lege balk en
zonder WHY-copy. Alleen de vijf intelligence-afhankelijke scores (cns, vermoeidheid, herstelduur,
calorie, herstelbelasting) vallen hieronder; de overige scores en de ★-rating lezen geen
fallbackveld en blijven ongewijzigd. Bestaande 206 tonen onveranderd hun werkelijke waarden.

**INTEL-03 — Confidence-sortering.** KNOWN aflopend, UNKNOWN altijd achteraan, stabiele
secundaire ordening op `identity.name`. Nooit NaN. Bewust géén uitschakeling van de sorteermodus:
dat zou records verbergen in plaats van ze eerlijk te positioneren.

**INTEL-04 — Provenance bestaande 206.** Vastgelegd als heuristisch/geschat/gegenereerd,
0/206 `human_verified`, 206/206 `unreviewed`. Niet geherlabeld, niet als gevalideerd
gepresenteerd.

**MEDIA-06 (deelbesluit) — posterdekking-metadata.** `total` beschreef feitelijk werkelijke
posterdekking en was vóór PR #359 exact correct (206/206). #359 bumpte het naar 226 zonder
posters toe te voegen. Kleinste waarheidsgetrouwe reparatie gekozen: `total` = 206 hersteld, en
de nominale catalogusdekking expliciet gemaakt in een nieuw veld `catalog_entries` = 226 plus
`missing` = 20. Zo blijft de oorspronkelijke veldbetekenis intact en wordt de tweede betekenis
niet langer in hetzelfde veld gepropt. `format: webp` blijft ongewijzigd: het is aantoonbaar het
werkelijke runtimeformaat, geen stale metadata.

**Expliciet NIET gedaan in deze sprint.** Geen mediamigratie, geen Supabase-bucket, geen
videoverplaatsing, geen verwijdering van embedded posters, geen nieuwe MoveKit-oefeningen of
-media, geen reconstructie van relatie-intelligentie, geen verzonnen intelligence, geen
APP_VER-bump.

**Blijft open.** Langetermijn-MoveKit-media-architectuur (MEDIA-01/02/05/06-implementatie),
INTEL-05 (reproduceerbare intelligence-generator met provenance), INTEL-06 (relations),
de twee cycling-posterbronbestanden, en de MoveKit-licentievraag over publieke levering.
**Batch 002 blijft BLOCKED.**
