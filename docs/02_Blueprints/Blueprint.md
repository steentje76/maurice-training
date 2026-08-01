# Blueprint — Maurice Training Coach

Bron: PROJECTPLAN_APP.md + CONTEXT_NIEUW_PROJECT.md (stand v3.2.2, 12 juli 2026 e.v.). Bewust géén ADR-structuur (governance-niveau B) — grote koerskeuzes staan in DECISION_LOG.md, niet hier per keuze onderbouwd.

## Technische stack
| Component | Technologie | Details |
|---|---|---|
| Frontend | PWA (HTML/CSS/JS) | Eén index.html, geen framework — bewuste keuze, geen migratie vóór Fase 2 afgerond is |
| Hosting | Netlify | maurice-art.netlify.app, auto-deploy via GitHub push |
| Repo | GitHub | github.com/steentje76/maurice-training |
| Database | Supabase (PostgreSQL + PostgREST + RLS) | mhfxhzkdmgkaplicdszg.supabase.co |
| AI Coach | Anthropic Claude Sonnet | server-side via Netlify Function (netlify/functions/coach.js) — API-key niet client-side |
| Auth | Supabase Auth | actief sinds 12 juli 2026 (e-mail/wachtwoord, persistente sessie, token refresh) |
| Stijl | Barlow Condensed, cyaan #3dd6d6 | bewust generiek gehouden i.v.m. toekomstige white-label |
| Distributie (later) | Capacitor (iOS), TWA/Bubblewrap (Android) | wrapping van bestaande PWA, geen rewrite |

## Databaseschema (kern)
```
config, weight_log, hrv_log, exercises, sessions,
body_comp, chat_history, gyms, users
```
Plus (sinds migratie_v322, schema-voorbereiding voor Fase 5, nog niet gehandhaafd):
`plan_features`, `plan_feature_quota`, `credit_packs`, `discounts`, `user_credit_purchases`, `usage_log`.
Nog niet gebouwd: `programs`, `program_exercises`, `assignments`, `coach_notes` (architectuur akkoord, bouw niet gestart).

`equipment_types` en `exercise_equipment` — machine-instellingen per oefening (bv. leg press pin-stand, zitting, rugsteun, hoogte, breedte), zodat instellingen niet telkens opnieuw gezocht hoeven worden:
- `equipment_types`: lijst mogelijke instellingstypes, uitbreidbaar via Beheer. Heeft een hardcoded fallback-seed (Zitting/Rugsteun/Pin/Hoogte/Breedte) als de tabel leeg/onbereikbaar is.
- `exercise_equipment`: de daadwerkelijke waarde per oefening. Bevat al `gym_id` (nu altijd `null`) — bewust vooruitgebouwd op Fase 4, zodat een sportschool later eigen gedeelde machine-presets kan krijgen naast persoonlijke instellingen.

## Rollen/entitlements-model (schema-voorbereiding, handhaving in Fase 5)
Drie assen: `gym_role`-hiërarchie (lid/coach/manager/owner) met `gym_role_level`, systeemrollen (tester/support/developer), feature-entitlements via `plan_features`. Individuele en gym-subscripties zijn additief. Metered features (`ai_coach`, `programma_generator`) met maandelijkse quota, creditpacks, 80%-waarschuwing. Losse Mollie-klantprofielen voor individuen vs. gyms.

## Security
| Laag | Maatregel |
|---|---|
| Auth | Supabase Auth, e-mail/wachtwoord, persistente sessie |
| Data | RLS op alle tabellen (auth.uid() = user_id op logtabellen; read-only policies op referentiedata sinds 31-07-2026) |
| API | Claude-key server-side via Netlify Function, niet client-side |
| Transport | HTTPS via Netlify |
| Bekend openstaand punt | Per-user profielscheiding nog niet apart geverifieerd ondanks actieve RLS |

## PWA / caching
manifest.json + sw.js. Cache-naam moet bij elke release ophogen. Navigatiestrategie moet network-first zijn, niet cache-first — **nog te verifiëren** (open punt, zie CURRENT_STATE.md).

## Werkwijze (bestaande, informele praktijk — blijft leidend)
1. `view`/`grep -n` om te lokaliseren
2. `str_replace` met exacte omliggende regels
3. `node --check` voor syntax-validatie
4. Volledige `logic_tests.js`-run (102+ zelfstandige tests, geen DOM/imports)
5. Playwright e2e lokaal na oplevering
6. Versiebump bij elke release (HTML-bestandsnaam + sw.js-cachenaam)
7. GitHub-upload via overschrijven (potlood/edit-icoon), nooit als nieuwe bestandsnaam
8. SQL-migraties altijd eerst uitvoeren, dan pas app-bestanden uploaden — idempotent (`ON CONFLICT DO UPDATE`, `IF NOT EXISTS`), nieuwe kolommen nullable voor backwards compatibility
9. Eerst verzamelen/analyseren, dan verbeterpunten, dan één implementatieplan, dan pas bouwen
10. Features pas "klaar" na volledige CRUD-check en content-check (geen lege skeletten tonen als compleet)
11. Architecturale overlap met bestaande systemen proactief signaleren vóór het bouwen

Deze werkwijze wordt in Project OS-vorm vastgelegd in docs/Prompts/CLAUDE_SOFTWARE_ENGINEER_START.md, niet vervangen door een generiek sjabloon.

## Bewust afgewezen/uitgesteld (blijft zo tenzij herzien via DECISION_LOG.md)
- Migratie naar Swift/Kotlin/Python/Go of file-split — uitgesteld tot na Fase 2
- Enterprise-blueprintstructuren (ADR-governance, C4-diagrammen) — afgewezen voor dit solo-project (DEC-003)
- Losse app per gym (i.v.m. Apple-richtlijn 4.2.6/4.3) — één app met dynamische branding na login is de gekozen richting voor Fase 4
