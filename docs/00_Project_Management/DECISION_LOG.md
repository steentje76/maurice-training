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
