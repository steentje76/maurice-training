# F12_EXISTING_COMMERCIAL_ARCHITECTURE_AUDIT.md — Trainingskompas

**Baseline main SHA (fresh, geverifieerd vóór dit document):** `0cba74fad1bdf609bef3c75bead9613cd288b320`. Datum: 30 augustus 2026.

## Repo-brede zoekresultaten (index.html, core/*.js, netlify/functions/*.js)

**0 treffers** voor `plan_key`, `feature_key`, `entitlement`, `mollie`, `stripe`, `subscription` (echte, niet-technische betekenis), `billing`, `credit_pack`, `webhook`, `checkout`, `quota`, `upgrade`/`downgrade` (commercieel), `paywall`, `trial` in zowel `index.html` als `core/*.js` als `netlify/functions/*.js`. Alle "premium"-vermeldingen in `index.html` zijn UI/design-terminologie (bijv. "premium visualisaties", "premium schaduw") — geen enkele daadwerkelijke plan-check. **Conclusie: 0% runtime-integratie, 100% dode/schema-only architectuur.** Dit is consistent met de eerdere `GAP_ANALYSIS_V2.md`/`CAPABILITY_REGISTRY.md`-bevinding voor `COMM-UI-001`.

## Component-matrix

| Component → Current state | Runtime used? | Authority | Security | Gap | Reuse/Replace/Defer |
|---|---|---|---|---|---|
| `plans` (`key`,`type`,`naam`,`prijs_cent`,`actief`) — 4 rijen: gratis/atleet_basis/atleet_pro/sportschool_basis, **alle `prijs_cent`=NULL** | Nee | N.v.t. | RLS aan, **0 policies** (default-deny, veilig maar onbereikbaar) | Geen prijzen ingevuld, geen enforcement | **REUSE** — canoniek plan-anker, RLS toevoegen |
| `features` (`key`,`naam`,`categorie`,`metered`) — 5 rijen: `ai_coach`, `programma_generator` (coaching, metered), `1rm_grafieken`, `hrv_analyse` (inzicht), `supersets` (training) | Nee | N.v.t. | RLS aan, 0 policies | Geen plan-koppeling; `hrv_analyse` als afschermbare feature vereist expliciete productbeoordeling (recovery-inzicht, geen veiligheidswaarschuwing — zie §8) | **REUSE** — categorieën bruikbaar voor MS-F12-01-classificatie |
| `plan_features` (`plan_key`,`feature_key`) — **0 rijen** | Nee | N.v.t. | RLS aan, 0 policies | Volledig leeg, geen enkele koppeling ooit gemaakt | **REUSE** — canonieke join-tabel, moet gevuld worden in MS-F12-01 |
| `plan_feature_quota` (`plan_key`,`feature_key`,`quota_per_maand`) — 0 rijen | Nee | N.v.t. | RLS aan, 0 policies | Leeg | **REUSE** |
| `credit_packs` (`key`,`feature_key`,`naam`,`aantal_credits`,`prijs_cent`,`actief`) — 0 rijen | Nee | N.v.t. | RLS aan, 0 policies | Leeg | **REUSE** |
| `user_credit_purchases` (`id`,`user_id`,`credit_pack_key`,`feature_key`,`credits_resterend`,`mollie_payment_id`,`aangekocht_at`) — 0 rijen | Nee | N.v.t. | **RLS aan, 1 policy (`credit_purchases_own_data`, `ALL`, `qual: auth.uid()=user_id`, `with_check: NULL`)** — **KRITIEKE, LIVE BEVESTIGDE BEVINDING: een gewone gebruiker kan `credits_resterend` van de eigen rij zelf naar een willekeurige waarde zetten (self-service credit-inflatie), live getest: `999999` geaccepteerd.** | Geen server-side mutatiebescherming voor het credit-saldo | **REUSE, MAAR MOET GEREPAREERD WORDEN VOORDAT ENIGE ENFORCEMENT HIEROP BOUWT** (trigger/RPC-patroon analoog aan F11's `updated_at`-hardening) |
| `usage_log` (`user_id`,`feature_key`,`periode`,`aantal`,`updated_at`) — bestaat, ongebruikt | Nee | N.v.t. | **RLS aan, 1 policy (`usage_log_own_data`, `ALL`, `qual: auth.uid()=user_id`, `with_check: NULL`) — hetzelfde patroon als hierboven: een gebruiker kan zelf `aantal` (quotaverbruik) manipuleren.** | Zelfde kwetsbaarheid als `user_credit_purchases` | **REUSE, ZELFDE REPARATIE NODIG** |
| `ai_usage` (`user_id`,`dag`,`aanroepen`,`tokens_in`,`tokens_uit`,`bijgewerkt`) — bestaat, ongebruikt | Nee (0 treffers in `coach.js`) | N.v.t. | RLS aan, 0 policies (default-deny) | Geen enkele schrijfactie vanuit de AI-coach-proxy | **REUSE** voor toekomstige AI-quota-tracking (MS-F12-02), koppeling met `coach.js` nog te bouwen |
| `gyms.mollie_customer_id`/`plan_key` (Model A, legacy) | Nee | N.v.t. | Beschermd sinds MS-F11-05 (`get_organization_branding()` projecteert dit veld nooit) | Nooit gevuld, nooit gebruikt | **DEFER** — blijft Model A-legacy, niet aanraken binnen F12 tenzij expliciet nodig |
| `netlify/functions/*.js` | 0 treffers voor billing/mollie/stripe/webhook | N.v.t. | N.v.t. | Geen enkele billing-endpoint bestaat | **Nieuw te bouwen** (MS-F12-04) |
| `delete-account.js` | `usage_log`/`ai_usage`/`user_credit_purchases` staan al alle drie in de delete-completeness-lijst | Ja (voor delete-scope) | N.v.t. | Geen | **REUSE**, `plans`/`features`/`plan_features`/`credit_packs` bevatten geen persoonsgegevens (geen delete-actie nodig) |

## Legacy commerciële architectuur
Geen andere, parallelle commerciële architectuur gevonden. Het enige aanverwante legacy-element is `gyms.plan_key`/`mollie_customer_id`/`coach_pin_hash` (Model A) — reeds volledig geaudit en beveiligd in MS-F11-05, blijft ongewijzigd.

## Herhaald patroon met de F11-bevindingen
De `with_check: NULL`-zwakte op `user_credit_purchases`/`usage_log` is **conceptueel identiek** aan de eerdere F11-bevinding (RLS is row-level, een brede `ALL`-policy zonder expliciete WITH CHECK laat een actor het eigen record vrij muteren). Dit bevestigt de waarde van de F11 row-vs-column-security-audit-gate: hetzelfde soort "onschuldige, eigen-data"-policy kan een client-mutatie-escalatie verbergen. Deze twee tabellen worden **niet gebruikt** vóór deze zwakte is gerepareerd (MS-F12-01/02, met live adversarial bewijs en sabotagetest, conform het F11-precedent).

## Extern onderzoek (actuele bronnen, augustus 2026)

- **Apple App Store / EU DMA** (developer.apple.com, geraadpleegd 30 augustus 2026; Apple Developer Program License Agreement bijgewerkt 18 augustus 2026): sinds de DMA-unificatie in de EU mogen apps klanten naar een externe website leiden voor betaling (linkout), met een gereduceerd Apple-kostenpercentage (rond 12–20% totaal, i.p.v. 30% standaard IAP) via de External Purchase Link Entitlement (EU). Kinderen onder 13: externe betaallinks volledig geblokkeerd.
- **Google Play Billing Choice** (support.google.com/android-developer, developer.android.com, geraadpleegd augustus 2026): sinds 30 juni 2026 kunnen ontwikkelaars in de EER/VK/VS third-party billing of externe weblinks aanbieden naast/i.p.v. Google Play Billing; servicefee (10% voor auto-renewing subscriptions) en aparte billingfee (5%, vervalt bij externe afhandeling) zijn nu gesplitst.
- **Mollie** (docs.mollie.com, geraadpleegd augustus 2026): Subscriptions API bouwt op de Payments API met mandates; webhook-payload bevat **uitsluitend een payment-ID** (`id=tr_...`, form-encoded, geen JSON/status) — de daadwerkelijke status moet altijd via een aparte, geauthenticeerde API-call worden opgehaald. Er bestaat geen apart subscription-status-webhook; subscriptionstatus wordt afgeleid uit de onderliggende payment-webhooks. Mislukte herhalingsbetalingen: tot 5 pogingen, dan automatische cancellation.

**Betekenis voor Trainingskompas:** het reeds bestaande plan (Mollie voor web-based subscriptions, ter vermijding van store-commissie) is nog steeds valide en zelfs gunstiger geworden in 2026 dankzij de DMA/Billing-Choice-versoepelingen. Dit rechtvaardigt geen overhaaste keuze voor native store-billing in MS-F12-04 — providerstrategie wordt daar apart, met bewijs, vastgelegd.

## Conclusie voor MS-F12-01
Geen nieuwe architectuur nodig voor het canonieke model zelf — `plans`/`features`/`plan_features`/`plan_feature_quota`/`credit_packs` worden hergebruikt en ingevuld. Twee kritieke, live bevestigde RLS-zwaktes (`user_credit_purchases`, `usage_log`) moeten eerst gerepareerd worden. Geen enkele runtime-integratie bestaat — MS-F12-01 begint op een schone lei qua enforcement.
