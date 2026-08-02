# CURRENT_STATE — Maurice Training Coach

> Bijwerken na iedere afgeronde Story en iedere release.

## Projectnaam
Trainingskompas — definitief (was Maurice Training Coach; appnaam vastgesteld 1 augustus 2026, zie DEC-010 en docs/Brand/BRAND_IDENTITY.md)

## Huidige versie
v3.3.27

## Laatste release
- Versie: v3.3.27
- Datum: 2 augustus 2026
- Inhoud: Sprint 2 — Instellingen, Onboarding & Branding. Instellingen-scherm (8.3) volledig gebouwd (thema/taal/meldingen/geluid-trillingen/privacy-link/offline-info/cachebeheer/app-info), Meldingen-scherm (8.2, 5 losse voorkeuren), Privacy-scherm (9.6, juridische tekst expliciet als placeholder gemarkeerd), Help-scherm (9.4/9.5/9.7), volledige 9-staps onboarding-wizard (eenmalig na login), merkidentiteit doorgevoerd (Poppins-font, officiële kleuren #0B1D2A/#0E3B4A/#00B894/#E6EBEF, handmatige thema-override naast automatische detectie), KOMPAS-afkorting gecorrigeerd naar volledige naam op login- én dashboardscherm (DEC-010). Zie `Sprintrapporten/Sprint2_Rapport.md` voor het volledige verslag.

## Laatste release (vorig)
- Versie: v3.3.26
- Datum: 2 augustus 2026
- Inhoud: Sprint 1 — Fundament, Accessibility & Stabilisatie (Skill v2.0-werkwijze, tegen het complete Handbook H1–H14). Accessibility-fundament (aria-navigatie/heading/dialoogrollen, focus-management bij scherm- en modalwissels, skip-link, focus-visible), Motion Framework-tokens + `prefers-reduced-motion`, Dark Mode-tokenfundament + automatische detectie (`prefers-color-scheme`), offline-verificatie (sw.js network-first bevestigd correct), QA-doorlichting (geen memory-leaks/dode code aangetroffen), labelfout "Instellingen" op het Beheer-scherm gecorrigeerd. Zie `Sprintrapporten/Sprint1_Rapport.md` voor het volledige verslag.

> Oudere releases (t/m v3.3.25): zie DECISION_LOG.md en CHANGELOG.md voor de volledige geschiedenis — hier bewust ingekort om dit document actueel en leesbaar te houden.

## Actieve sprint
Sprint 2 — "Instellingen, Onboarding & Branding": afgerond, wacht op functionele bevestiging door Product Owner (met name: onboarding-flow en thema-wissel zijn nog niet op een echt device getest).

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
