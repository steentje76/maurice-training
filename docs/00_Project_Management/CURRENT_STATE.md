# CURRENT_STATE — Maurice Training Coach

> Bijwerken na iedere afgeronde Story en iedere release.

## Projectnaam
Trainingskompas — definitief (was Maurice Training Coach; appnaam vastgesteld 1 augustus 2026, zie DEC-010 en docs/Brand/BRAND_IDENTITY.md)

## Huidige versie
v3.3.28

## Laatste release
- Versie: v3.3.28
- Datum: 2 augustus 2026
- Inhoud: Sprint 2.5 — Validatie, Polish & Release Readiness. **Live device-/browservalidatie uitgevoerd** op de daadwerkelijke productie-app (maurice-art.netlify.app, met toestemming en via een reeds actieve sessie) — alle 5 Sprint 2-schermen bevestigd aanwezig en renderend, dark mode visueel bevestigd, privacy-checkbox-gate in onboarding bevestigd werkend. **Twee echte bugs gevonden via live console-logs en verholpen:** (1) `atleet_profiel`-writes vanuit onboarding faalden op een ontbrekende `doel`-kolom (migratie v336), (2) `refreshStats()` crashte bij elk bezoek aan Beheer omdat het scherm-specifieke element daar niet bestaat — dit was **al vóór Sprint 2 aanwezig**, nu pas ontdekt door live-logs. Zie `Sprintrapporten/Sprint2.5_Rapport.md` voor het volledige verslag inclusief wat wél en niet kon worden gevalideerd.

## Laatste release (vorig)
- Versie: v3.3.27
- Datum: 2 augustus 2026
- Inhoud: Sprint 2 — Instellingen, Onboarding & Branding. Instellingen-scherm (8.3) volledig gebouwd (thema/taal/meldingen/geluid-trillingen/privacy-link/offline-info/cachebeheer/app-info), Meldingen-scherm (8.2, 5 losse voorkeuren), Privacy-scherm (9.6, juridische tekst expliciet als placeholder gemarkeerd), Help-scherm (9.4/9.5/9.7), volledige 9-staps onboarding-wizard (eenmalig na login), merkidentiteit doorgevoerd (Poppins-font, officiële kleuren #0B1D2A/#0E3B4A/#00B894/#E6EBEF, handmatige thema-override naast automatische detectie), KOMPAS-afkorting gecorrigeerd naar volledige naam op login- én dashboardscherm (DEC-010). Zie `Sprintrapporten/Sprint2_Rapport.md` voor het volledige verslag.

> Oudere releases (t/m v3.3.26): zie DECISION_LOG.md en CHANGELOG.md.

> Oudere releases (t/m v3.3.25): zie DECISION_LOG.md en CHANGELOG.md voor de volledige geschiedenis — hier bewust ingekort om dit document actueel en leesbaar te houden.

## Actieve sprint
Sprint 2.5 — "Validatie, Polish & Release Readiness": afgerond. Live device-/browservalidatie uitgevoerd op de productie-app; twee echte bugs gevonden en verholpen (zie Bekende bugs). **⚠ Actie vereist door Product Owner: `migratie_v336.sql` moet in Supabase worden uitgevoerd** — zonder deze migratie blijft de `atleet_profiel`-Supabase-sync falen voor elke gebruiker die onboarding doorloopt (device-lokaal werkt het al wel).

## Wat werkt
- Volledige trainingslogging (A/B, cardio, supersets, plate calculator, PR-badges, rusttimer)
- AI-coach met volledig systeemprompt (HRV-drempels, Masters-factor, progressieregels)
- AI-programmagenerator (per-week i.v.m. Netlify-timeouts)
- Pre-training coach check-in met dagfactor + spierherstel
- Ratiofactor-/dagfactor-motor + cold-start-predictor
- Supabase Auth + RLS (auth.uid() = user_id) sinds 12 juli 2026
- RLS op users/exercises/gyms/equipment_types/exercise_equipment sinds 31 juli 2026
- sw.js navigatie: network-first i.p.v. cache-first (31 juli 2026)
- atleet_profiel-sync naar Supabase gefixt: user_id ontbrak altijd, faalde stil op NOT NULL-constraint (1 augustus 2026)
- sw.js network-first-navigatiestrategie: geverifieerd in Sprint 1 door code-inspectie — `fetch(...).catch(()=>caches.match('/index.html'))` op alle `navigate`-requests, functioneert zoals bedoeld. Statische assets blijven bewust cache-first. Dit sluit het laatste openstaande punt uit Roadmap.md → "sw.js network-first-navigatie verifiëren".
- Accessibility-fundament (Sprint 1): aria-navigatie/heading-rollen, focus-management bij scherm-/modalwissel, skip-link, `:focus-visible`, `prefers-reduced-motion` — toegepast op alle bestaande kernschermen via de centrale `go()`/`openModal()`/`closeModal()`-functies en herbruikbare componentklassen (`.bnav`, `.hdr-title`, `.ibtn`). Nog niet: losse formuliervelden/complexere widgets per scherm (zie Bekende beperkingen).
- Dark mode-tokenfundament + automatische detectie (`prefers-color-scheme`) — kleurwaarden toegepast, nog geen volledige restyle (bewust, buiten Sprint 1-scope).
- Motion-tokenstelsel (H5/H11-namen) + `prefers-reduced-motion` — tokens beschikbaar, bestaande CSS-transities gebruiken ze nog niet automatisch (geen bestaand gedrag gewijzigd).
- Instellingen-scherm (8.3): thema (light/dark/automatisch, direct toegepast via `data-theme`), meldingenvoorkeuren-doorverwijzing, geluid/trillingen-switches, offline-status, cache-verversen. (Sprint 2)
- Meldingen-scherm (8.2): 5 losse voorkeuren + browsertoestemming-aanvraag. (Sprint 2)
- Onboarding: volledige 9-staps wizard, verschijnt eenmalig na login, slaat doel/niveau/sport op in het atleetprofiel. (Sprint 2)
- Merkidentiteit doorgevoerd: Poppins-font, officiële kleuren (`#0B1D2A`/`#0E3B4A`/`#00B894`/`#E6EBEF`) op alle schermen via de bestaande design-tokens, KOMPAS-afkorting gecorrigeerd naar "Trainingskompas" op login- en dashboardscherm (DEC-010). (Sprint 2)

## Wat niet werkt
- Offline IndexedDB-sync (bewust uitgesteld, geen bug — sw.js-niveau wél geverifieerd, zie boven)
- Accountverwijdering: gebouwd en live gedeployed (SUPABASE_SERVICE_ROLE_KEY ingesteld op Netlify, 1 augustus), nog NIET functioneel getest — test met wegwerp-account volgt (Product Owner, thuis)
- Geluid-instelling (Instellingen): opgeslagen voorkeur zonder huidig effect — de app heeft nog geen geluidseffecten om aan te koppelen.

## Bekende bugs
- **(Sprint 1, opgelost)** Beheer-scherm (`s-admin`) toonde het label "Instellingen" in de header i.p.v. "Beheer" — verwarde met het (nog te bouwen) echte Instellingen-scherm. Gecorrigeerd.
- **(Sprint 2, opgelost)** Instellingen-scherm (H6, 8.3) was in de Handbook-statusmarkering 🟢 maar bevatte in de praktijk alleen een smalle trainingsinstelling — nu volledig gebouwd conform Sprint 0.5-advies.
- **(Sprint 2, opgelost)** KOMPAS-afkorting op login- en dashboardscherm ging tegen de bindende merkregel uit DEC-010 in — gecorrigeerd naar "Trainingskompas".
- **(Sprint 2.5, code opgelost — migratie nog uit te voeren)** `atleet_profiel`-sync vanuit onboarding faalde op elke poging: `sbUpsert` stuurde een `doel`-veld mee waarvoor geen kolom bestond (PGRST204, live aangetroffen in Maurice's eigen testsessie). Migratie `migratie_v336.sql` toegevoegd — **nog niet uitgevoerd in Supabase**.
- **(Sprint 2.5, opgelost)** `refreshStats()` crashte (`TypeError: Cannot set properties of null`) bij elk bezoek aan het Beheer-scherm, waardoor `renderRowerAdmin()`/`renderTrainExAdmin()` daar nooit uitgevoerd werden. **Al aanwezig vóór Sprint 2** (bevestigd tegen v3.3.26), nu pas ontdekt via live console-logs. Gefixt met een defensieve null-check.

**Opgelost (1 augustus 2026):** atleet_profiel-writes naar Supabase faalden stil door ontbrekende user_id (NOT NULL, geen default). Functionele bevestiging door Product Owner nog gewenst.

## Technische schuld
- Rollen/entitlements-schema (migratie_v322: gym_role, plan_features, credit_packs, discounts) is aangelegd maar nog niet gehandhaafd — bewust uitgesteld naar Fase 5, geen abusievelijke schuld.
- File-split / migratie naar ander platform: bewust uitgesteld tot ná Fase 2.
- **(Sprint 2, geconstateerd, niet veroorzaakt)** Vooraf bestaande dubbele HTML-id's (`nav-train-dot` ×12, spierheatmap-svg-onderdelen) en een klein div-tag-onbalans (1 stuk) — beide al aanwezig vóór Sprint 2, functioneel geen waargenomen probleem, wel op te schonen in een dedicated opruim-sprint.
- Onboarding-gate is device-gescoped (localStorage), niet account-gescoped — een gebruiker die opnieuw inlogt op een ander toestel doorloopt de onboarding opnieuw. Bewuste vereenvoudiging (geen nieuwe architectuur/databasekolom in Sprint 2-scope).
- "Doel kiezen" in onboarding slaat een eenvoudige `atleet.doel`-waarde op als tijdelijke oplossing vooruitlopend op het volwaardige Doelen-scherm (7.1, nog 🔴).

## Openstaande beslissingen
- Sport-specifieke AI-context splitsing (`buildCtx()` generiek + per-sport, voorstel 7 sporten) — wacht op bevestiging
- Vorm van social/competitief (leaderboards/teams/badges/combinatie) — bevestigd DAT het gebouwd wordt (DEC-008), nog niet HOE
- Architectuur experience-motor voor leden-branding (DEC-010) — nog niet uitgewerkt, volgt na gym-brede branding
- Privacy- en Help-schermen bevatten bewust gemarkeerde placeholders (juridische tekst, contactkanaal) — input Product Owner nodig vóór Fase 5

## Volgende stap
Zie Roadmap.md. Op hoofdlijnen: wearables-uitbreiding, HYROX/menstruatiecyclus-tracking, en het Doelen-scherm (7.1) liggen nu als logische vervolgstappen, samen met een echte device-/browsertest van Sprint 2 (onboarding, thema-wissel, meldingtoestemming) door de Product Owner.
