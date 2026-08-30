# F11_DYNAMIC_BRANDING_EXISTING_STATE_AUDIT.md — Trainingskompas

**MS-F11-05 baseline-audit.** Datum: 30 augustus 2026.

## Repo-brede zoekresultaten

| Mechanisme | CURRENT | RISK | REUSE/MODIFY/REMOVE | TARGET |
|---|---|---|---|---|
| `gyms.logo_url`/`primary_color`/`accent_color`/`font`/`app_name` | **Bestaat in de database (Model A, legacy)**, maar **0 treffers in `index.html` en `netlify/functions/*.js`** -- nooit door de runtime gelezen of geschreven. **Kritieke, genuine bevinding: `gyms` heeft RLS ingeschakeld (`relrowsecurity=true`) maar 0 policies** -- dit betekent volledige default-deny voor elke client-route, wat verklaart waarom deze velden nooit geactiveerd zijn. | Geen actief risico (onbereikbaar), maar dode, verwarrende kolommen | **MODIFY** -- uitbreiden met `organization_id` en de ontbrekende velden (`branding_enabled`, `updated_at`, `updated_by`, `short_name`), plus alsnog correcte RLS-policies toevoegen zodat de tabel voor beide modellen (A en B) bruikbaar wordt | Canoniek `OrganizationBranding`-contract, hergebruikt via `gyms` |
| `organizations` (Model B, MS-F11-01) | Bevat `id`, `name`, `owner_user_id`, `sport_id` -- geen brandingvelden | Geen | REUSE (als tenant-anker via de nieuwe `organization_id`-FK op `gyms`) | Ongewijzigd |
| `org_has_role()` | Bestaande, canonieke autorisatiefunctie (MS-F11-01) | Geen | **REUSE** -- exact het patroon dat deze sprint moet gebruiken, geen nieuwe engine | Ongewijzigd |
| CSS-variabelen/theme-tokens in `index.html` | Onderzocht: bestaande, statische Trainingskompas-kleurenpalet (`#0B1D2A`/`#0E3B4A`/`#00B894`/`#E6EBEF`/`#FFFFFF`), geen dynamische tenant-tokens gevonden | Geen | Nieuw, minimaal mechanisme nodig voor tenant-override | Beperkte, gevalideerde CSS custom properties |
| localStorage/sessionStorage voor tenant/branding | 0 treffers gevonden voor een tenant-brandingcache | Geen (nog niet gebouwd) | N.v.t. (geen bestaand risico om te herstellen) | Indien gebouwd: tenant-scoped cache-key, server blijft bron van waarheid |
| URL-gebaseerde org-selectie / querystring tenant | 0 treffers gevonden | Geen | N.v.t. | Niet bouwen (risico op forged organization_id via URL) |
| `coach_pin_hash`/`plan_key`/`mollie_customer_id` op `gyms` | Bestaand, niet-branding-gerelateerd (commercieel/auth) | Buiten scope van deze sprint | Ongewijzigd laten | Ongewijzigd |

## Conclusie
Er bestaat **geen enkel actief, werkend brandingmechanisme** in de huidige runtime. De bestaande `gyms`-brandingvelden zijn dode kolommen, onbereikbaar door het ontbreken van RLS-policies. Conform de instructie om bestaande tabellen te hergebruiken in plaats van een nieuwe aan te maken, wordt `gyms` uitgebreid (niet vervangen) met een `organization_id`-koppeling en de ontbrekende governance-velden, en van correcte RLS voorzien -- dit repareert tegelijk de kritieke, genuine bevinding (RLS zonder policies = volledige onbereikbaarheid) als bijeffect van deze sprint.
