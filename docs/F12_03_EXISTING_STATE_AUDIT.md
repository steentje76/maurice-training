# F12_03_EXISTING_STATE_AUDIT.md — Trainingskompas

**Baseline main SHA (fresh, geverifieerd vóór dit document):** `2991fa3a1f9dfa845a7ba4d554a7c27941448842`. Datum: 30 augustus 2026.

## Repo-brede zoekresultaten (index.html)

| Term | Treffers | Classificatie |
|---|---|---|
| `premium`/`Premium` | 87 | Uitsluitend UI/design-terminologie ("premium visualisaties", "premium schaduw", CSS-commentaar) — reeds bevestigd in MS-F12-01/02, geen enkele plan-check |
| `restore`/`Restore` | 12 | Uitsluitend `restoreTrainingDraft()`/`restoreSessionLogToDom()` — hersteld van een onvoltooide trainingssessie na app-herstart. **Geen enkele subscription-restore-functionaliteit.** |
| `cancel`/`Cancel` | 2 | Generieke `confirmModal`-annuleerknop (`.tk-confirm-cancel`) — geen subscription-cancel |
| `pro`/`Pro` | 10 | Substring-treffers (bijv. "proces", "profiel"), geen enkele plan-gerelateerde betekenis |
| `upgrade` | 2 | CSS-commentaar ("premium empty state — upgrade gedeeld component") en `indexedDB.onupgradeneeded` (browser-API) — beide reeds bevestigd in MS-F12-01 |
| `subscription` | 1 | Technische JS-commentaar over event-subscriptions, geen commercieel abonnement |
| `quota`/`billing`/`mollie`/`credits`/`paywall`/`QUOTA_EXCEEDED`/`FEATURE_NOT_AVAILABLE`/`downgrade`/`pricing` | 0 | Geen enkele treffer |

**Conclusie: 0% bestaande commerciële UX-runtime.** MS-F12-03 begint op een volledig schone lei qua UI.

## Bestaande, herbruikbare bouwstenen

| Component | Status | Reuse/Build |
|---|---|---|
| `core/entitlementCore.js` (MS-F12-01) | Getest, server-side in gebruik (MS-F12-02), **nooit client-side geladen** | Nu voor het eerst ook client-side laden — dit is de canonieke bron, geen nieuwe entitlement-logica |
| `plans`/`features`/`plan_features`/`plan_feature_quota` (RLS read-only sinds MS-F12-01) | Leesbaar voor elke authenticated gebruiker | Reuse — direct via `sbGet()` |
| `users.individual_plan_key`/`status`/`expires_at` (beschermd sinds MS-F12-02) | Leesbaar voor de eigen rij | Reuse — de client mag dit lezen (SELECT), alleen schrijven is geblokkeerd |
| `usage_log` (SELECT-only sinds MS-F12-02) | Leesbaar voor de eigen rij | Reuse — voor het tonen van huidig verbruik |
| `netlify/functions/coach.js`-foutresponses (402/429/503 met `error.code`) | Server-side klaar (MS-F12-02) | De client vangt deze al af via `if(d.error)`, maar toont nu nog een generieke fallback-tekst — MS-F12-03 verfijnt dit specifiek voor `ENTITLEMENT_REQUIRED`/`QUOTA_EXCEEDED` |
| `s-profiel`-scherm (bestaand, F11 branding-kaart erin) | Actief scherm | Het meest logische, bestaande scherm om een "Mijn abonnement"-sectie aan toe te voegen — geen nieuw top-level scherm nodig |
| `confirmModal()`/`openModal()` (bestaande, generieke modal-infrastructuur) | Actief | Reuse voor de plan-detail/upgrade-samenvatting |

## Ontwerpbeslissing: minimale, centrale CommercialUXCore-laag
Conform de opdracht ("GEEN aparte planlogica verspreiden over schermen") wordt een nieuwe, pure module `core/commercialUxCore.js` gebouwd die uitsluitend een view-model produceert (welk plan, welke capabilities, welke quota, welke status-tekst) op basis van `EntitlementCore`-output plus de catalogus. De UI-rendering zelf blijft in `index.html` (consistent met de bestaande architectuur — geen aparte rendering-laag), maar alle *beslissingen* over wat getoond moet worden, lopen door deze ene module.

## Prijs-integriteit
`plans.prijs_cent` is voor alle vier bestaande plannen `NULL` (bevestigd in MS-F12-01). De UI toont daarom bewust "Prijs wordt nog bekendgemaakt" in plaats van een verzonnen bedrag — geen enkele hardcoded prijs komt in `index.html`/`core/*.js`.
