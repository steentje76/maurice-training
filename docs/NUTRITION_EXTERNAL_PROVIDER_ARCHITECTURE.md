# Nutrition External Provider Architecture

## Architectuur (definitief, deze sprint gebouwd)

```
Client (index.html, toekomstige UX)
  -> NutritionProductLookupService (client, niet gebouwd -- alleen
     ontwerp; UI mag deze flow nooit zelf implementeren)
    -> lokale canonical resolveBarcode() (Foundation 2, bestaand)
       -> FOUND: return lokaal product, GEEN provider-aanroep
       -> NOT_FOUND: POST /.netlify/functions/nutrition-off-lookup
          -> server-side: auth-check (auth/v1/user, bestaande conventie)
          -> normalizeBarcode() + checksum (Foundation 2, hergebruikt)
          -> INVALID_IDENTIFIER: direct terug, GEEN provider-aanroep
          -> fetch naar Open Food Facts (User-Agent: Trainingskompas/
             <APP_VER> (support@trainingskompas.com), timeout 8s)
          -> validateResponse() (status:0 -> NOT_FOUND, geen 404-aanname)
          -> normalizeProduct()/normalizeNutrients()/getSourceMetadata()/
             evaluateDataQuality() (OpenFoodFactsAdapter, bestaand)
          -> retourneert genormaliseerde candidate + provenance + quality
    -> client past NutritionIngestService.resolveIngestDecision() toe
       -> CREATE_NEW / ADD_REVISION / KEEP_EXISTING_VERIFIED /
          KEEP_EXISTING_USER_PRIVATE
    -> client persisteert via bestaande, RLS-gedekte sbPostQ-
       infrastructuur (geen service-role-bypass, geen tweede
       platformframework)
```

**Bewust, expliciet ontwerpbesluit:** de Netlify Function schrijft zelf
NIET naar de database. Persistence gebeurt client-side via de reeds
bestaande, RLS-gedekte `sbPostQ`/offline-infrastructuur -- consistent
met "geen tweede platformframework" en met het principe dat de
gebruikers-JWT (niet een service-role) de schrijfrechten bepaalt.

## Kritieke, tijdens deze sprint zelf gevonden en gerepareerde RLS-fout

**Tijdens de live functionele test van VERIFIED-precedence** (een
Nutella-record echt aangemaakt, gemarkeerd als VERIFIED, en toen
gecontroleerd of de oorspronkelijke maker het nog kon wijzigen) bleek:
**de bestaande RLS-policies (`np_update_own` op `nutrition_products`,
`nf_update_own` op `nutrition_foods`, uit Nutrition Foundation 2.0)
stonden een update toe zolang `created_by = auth.uid()`, ONGEACHT
`verification_state`.** De client-side `canModifyCanonicalRecord()`
(al bestaand, al getest) gaf wel correct `false` terug, maar dit werd
**niet afgedwongen op databaseniveau** -- een gemanipuleerde client had
een eigen, inmiddels VERIFIED product alsnog via een directe PostgREST-
call kunnen wijzigen.

**Gerepareerd (additieve policy-vervanging, geen data-migratie nodig):**
beide policies eisen nu expliciet `verification_state <> 'VERIFIED'`.
**Functioneel herbevestigd na de fix:** de exacte policy-expressie
geeft `false` voor de VERIFIED-testrij, ook voor de oorspronkelijke
`created_by`. Dit is dus geen nieuw risico van Wave 3, maar een reeds
langer bestaand gat in Foundation 2.0 dat pas nu, door een levensechte
functionele test, aan het licht kwam -- precies het soort bevinding dat
live-tegen-de-database-testen (in plaats van alleen source-lezen) hoort
te vangen.

## Observability

`nutrition.off_lookup.*`-events via de bestaande `ObservabilityCore.
tkLog()` (hergebruikt, geen nieuw logging-systeem): `invalid_input`,
`invalid_identifier`, `provider_unavailable`, `provider_timeout`,
`provider_not_found`, `normalization_failed`, `incomplete_product`,
`provider_hit`. **Functioneel bevestigd** via de handler-tests: geen
enkele meal-inhoud of persoonlijke voedingsdata in de log-metadata,
uitsluitend technische status/timing.

## Wat nog steeds niet is gebouwd

`NutritionProductLookupService` (client-side orchestratie) en de
daadwerkelijke UI-aanroep zijn niet gebouwd -- dit vereist het
raakvlak met een toekomstig scherm (buiten scope, "geen Nutrition UX").
