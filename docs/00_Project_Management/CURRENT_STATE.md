# CURRENT_STATE — Maurice Training Coach

> Bijwerken na iedere afgeronde Story en iedere release.

## Projectnaam
Maurice Training Coach (werktitel)

## Huidige versie
v3.2.2

## Laatste release
- Versie: v3.2.2
- Datum: eind juli 2026 (exacte datum: [nog aanvullen])
- Inhoud: AI-programmagenerator, pre-training coach check-in, Brzycki-gewichtsuggestie, Route 2 (vaste_trainingen), ratiofactor-/dagfactor-motor, cold-start-predictor, adherence tracking

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
- Geen gebruikersbeheerinterface
- Offline IndexedDB-sync (bewust uitgesteld, geen bug)

## Bekende bugs
[nog aanvullen — geen expliciet gemelde openstaande bugs op dit moment]

**Opgelost (1 augustus 2026):** atleet_profiel-writes naar Supabase faalden stil door ontbrekende user_id (NOT NULL, geen default). Functionele bevestiging door Product Owner nog gewenst.

## Technische schuld
- Rollen/entitlements-schema (migratie_v322: gym_role, plan_features, credit_packs, discounts) is aangelegd maar nog niet gehandhaafd — bewust uitgesteld naar Fase 5, geen abusievelijke schuld.
- File-split / migratie naar ander platform: bewust uitgesteld tot ná Fase 2.

## Openstaande beslissingen
- Appnaam (nog niet definitief)
- Social/competitief-koers (eerder afgewezen, later heropend — nog geen besluit)
- Sport-specifieke AI-context splitsing (`buildCtx()` generiek + per-sport, voorstel 7 sporten) — wacht op bevestiging

## Volgende stap
Sprint 1 volledig afgerond. Volgende kandidaten (zie Roadmap.md): equipment_types/exercise_equipment documenteren, of een nieuwe Story kiezen.
