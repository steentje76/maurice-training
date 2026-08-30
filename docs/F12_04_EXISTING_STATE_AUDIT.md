# F12_04_EXISTING_STATE_AUDIT.md — Trainingskompas

**Baseline main SHA (fresh, geverifieerd vóór dit document):** `54f6772caf438e126fb37aee5dd9b983d604d9ae`. Datum: 30 augustus 2026.

## Repo-brede zoekresultaten

**0 treffers** voor `mollie`/`Mollie` in `netlify/functions/*.js`, `index.html`, `netlify.toml`. Geen webhook-endpoint, geen checkout-code, geen environment-variabele-referentie. `mollie_customer_id` (op `users`, beschermd sinds MS-F12-02) en `mollie_payment_id` (op `user_credit_purchases`, uniek sinds MS-F12-01) bestaan uitsluitend als database-kolommen, nooit gevuld of gelezen door enige runtime-code.

| Component | CURRENT | GAP | TARGET |
|---|---|---|---|
| `netlify/functions/*.js` | Geen enkel billing/checkout/webhook-endpoint | Volledige provider-integratie ontbreekt | Nieuw: `billing-checkout.js`, `billing-webhook.js` |
| `users.mollie_customer_id` | Kolom bestaat, nooit gevuld | Geen koppeling met een echte Mollie-klant | Wordt gevuld bij de eerste checkout via de provider-adapter |
| `users.individual_plan_key`/`status`/`expires_at` | Beschermd (MS-F12-02), leesbaar voor de client | Nog geen server-side schrijfpad dat hier daadwerkelijk gebruik van maakt | `reconcile_billing_event()`-RPC (service-role-only) |
| `user_credit_purchases`/`grant_credit_purchase()` | Idempotent, service-role-only (MS-F12-01) | Nog geen daadwerkelijke aanroep vanuit een betaalflow | Credit packs blijven **buiten scope** van deze sprint (zie hieronder) — geen nieuw productbesluit hier genomen |
| `plans.prijs_cent` | Alle vier plannen `NULL` | Geen enkele prijs geconfigureerd | Blijft `NULL` — expliciete productbeslissing, zie sectie "NULL pricing" |
| Environment variables | Geen `MOLLIE_*` gedefinieerd | — | `MOLLIE_API_KEY` volgt het bestaande `ANTHROPIC_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY`-patroon (Netlify-dashboard, nooit in de repo) |
| Billing-event/audit-tabel | Bestaat niet | Volledig ontbrekend | Nieuw: `billing_events` |
| Organization billing (`sportschool_basis`) | Geen koppeling tussen een organization en een commercieel plan | Buiten de MS-F12-04-scope, expliciet als gap geregistreerd (zie sectie "Organization billing") | — |

## Credit packs: bewust buiten scope
Credit packs (`credit_packs`/`user_credit_purchases`/`grant_credit_purchase()`) zijn in MS-F12-01 als infrastructuur gebouwd, maar er is nooit een productbeslissing genomen dat credit packs een actief onderdeel van de huidige commerciële flow zijn. Conform de opdracht ("als nog geen UX/productbesluit: geen willekeurige nieuwe commerciële productsoort activeren") wordt dit **niet** in MS-F12-04 geactiveerd. Wel is `grant_credit_purchase()`s idempotentie opnieuw bevestigd (zie sprint-evidence) zodat de infrastructuur, mocht ze later geactiveerd worden, al bewezen veilig is.

## Organization billing: expliciete gap
`sportschool_basis` bestaat als catalogusplan, maar er is geen kolom die een `organizations`-rij aan een commercieel plan koppelt. Het bouwen van een volledige organization-billing-flow (wie binnen een organisatie mag betalen, hoe een organization-plan wordt toegewezen) is een significante, eigen productbeslissing die buiten de scope van deze sprint valt — expliciet geregistreerd als **non-blocking gap** voor een toekomstige sprint, niet stilzwijgend geïmplementeerd.

## NULL pricing: expliciete productbeslissing
Alle vier catalogusplannen hebben `prijs_cent=NULL`. Conform de opdracht wordt dit **niet** omzeild met een fictieve prijs. De checkout-endpoint weigert expliciet een checkout te starten voor een plan zonder geconfigureerde prijs (`PRODUCT_NOT_CONFIGURED`). Dit is een **pricing configuration**-status, geen **billing security**-tekortkoming — de volledige architectuur is klaar zodra een Product Owner een prijs vaststelt.
