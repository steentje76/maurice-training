# CURRENT_STATE — Maurice Training Coach

> Bijwerken na iedere afgeronde Story en iedere release.

## Projectnaam
Trainingskompas — definitief (was Maurice Training Coach; appnaam vastgesteld 1 augustus 2026, zie DEC-010 en docs/Brand/BRAND_IDENTITY.md)

## Huidige versie
v3.3.25

## Laatste release
- Versie: v3.3.25
- Datum: 1 augustus 2026
- Inhoud: grote stabilisatiesessie (v3.3.9–v3.3.25) — kritieke security-fixes (coach.js JWT, RLS-audit), volledige XSS-remediatie, dubbel-klik-bescherming overal, v333 3-laags zichtbaarheidsmodel (UI-laag compleet: scope-kiezer, delen-met-persoon, rolgebaseerde Beheer-toegang), apparatuur-catalogus, AI-programmagenerator herzien (periodisering in code, sport-/PR-/historie-context), UX-doorlichting (Import/Export naar Profiel, pincode-vergeten-herstel voor Team). Zie DECISION_LOG.md DEC-010 voor de aansluitende roadmap-herprioritering (wearables/HYROX/menstruatiecyclus naar Fase 1/2, branding-model herzien, onboarding-flow toegevoegd).

## Actieve sprint
Sprint 1 — "Project OS-migratie + sw.js/profielscheiding-verificatie": afgerond. Story 1 (sw.js network-first) en Story 2 (atleet_profiel user_id-bug) beide functioneel bevestigd door Product Owner op 1 augustus 2026.

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

## Wat niet werkt
- Offline IndexedDB-sync (bewust uitgesteld, geen bug)
- Accountverwijdering: gebouwd en live gedeployed (SUPABASE_SERVICE_ROLE_KEY ingesteld op Netlify, 1 augustus), nog NIET functioneel getest — test met wegwerp-account volgt (Product Owner, thuis)

## Bekende bugs
[nog aanvullen — geen expliciet gemelde openstaande bugs op dit moment]

**Opgelost (1 augustus 2026):** atleet_profiel-writes naar Supabase faalden stil door ontbrekende user_id (NOT NULL, geen default). Functionele bevestiging door Product Owner nog gewenst.

## Technische schuld
- Rollen/entitlements-schema (migratie_v322: gym_role, plan_features, credit_packs, discounts) is aangelegd maar nog niet gehandhaafd — bewust uitgesteld naar Fase 5, geen abusievelijke schuld.
- File-split / migratie naar ander platform: bewust uitgesteld tot ná Fase 2.

## Openstaande beslissingen
- Sport-specifieke AI-context splitsing (`buildCtx()` generiek + per-sport, voorstel 7 sporten) — wacht op bevestiging
- Vorm van social/competitief (leaderboards/teams/badges/combinatie) — bevestigd DAT het gebouwd wordt (DEC-008), nog niet HOE
- Architectuur experience-motor voor leden-branding (DEC-010) — nog niet uitgewerkt, volgt na gym-brede branding

## Volgende stap
Zie Roadmap.md voor de volledige, herziene prioriteitenlijst (DEC-010, 1 augustus 2026). Op hoofdlijnen: onboarding-workflow, wearables-uitbreiding, HYROX/menstruatiecyclus-tracking, en dynamische branding lopen nu parallel aan de resterende Fase 2-punten (offline sync-bevestiging, profielscheiding-test).
