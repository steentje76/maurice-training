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
