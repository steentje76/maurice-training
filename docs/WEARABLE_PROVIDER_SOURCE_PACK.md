# WEARABLE_PROVIDER_SOURCE_PACK.md

Bronnenverantwoording per provider-implementatie in de Devices/Wearables
V1 MUST-sprint. Elke bewering in de code verwijst hierheen. Bewijsniveaus:
A=eerste-partij officiele documentatie, B=systematisch uit de officiele
OpenAPI/GATT-spec gegenereerde clientbibliotheek/documentatie,
C=onafhankelijke referentie-implementatie met echte hardware/accounttest,
D=community/blog zonder verificatie. Een productiecontract wordt nooit
uitsluitend op D gebouwd.

---

## Garmin Connect Developer Program (OAuth 2.0 + PKCE)

- Autorisatie-endpoint: GET https://connect.garmin.com/oauth2Confirm --
  Bewijsniveau A. Bron: Garmin Connect Developer Program OAuth2.0 PKCE
  Specification (developerportal.garmin.com/sites/default/files/OAuth2PKCE_1.pdf),
  eerste-partij Garmin-document, verbatim teruggevonden en zelf
  herverifieerd.
- Token-endpoint: POST https://diauth.garmin.com/di-oauth2-service/oauth/token
  -- Bewijsniveau A. Zelfde bron, inclusief de exacte parameterlijst
  (grant_type, client_id, client_secret, code, code_verifier, redirect_uri)
  verbatim uit het PDF. Corroborerend bevestigd (bewijsniveau C) door een
  onafhankelijke, publiek werkende referentie-implementatie
  (github.com/alexanderhodes/garmin-auth-app) met exact dezelfde URL en
  parameters.
- Deregistratie-endpoint: DELETE https://apis.garmin.com/wellness-api/rest/user/registration
  -- Bewijsniveau A/C (zelfde PDF + dezelfde referentie-implementatie,
  beide noemen dit exacte pad). "Revokes the access token authorized by
  user" (Garmin's eigen terminologie).
- Partner-gating: bevestigd via meerdere onafhankelijke bronnen
  (django-garmin, developer.garmin.com/gc-developer-program/) dat een
  Garmin Connect Developer Program-aanvraag eerst goedgekeurd moet worden
  voordat een consumer key/secret bestaat -- bewijsniveau B/C, consistent.
- Webhook-payload-schema per samenvattingstype en het officiele
  verificatiemechanisme: NIET bevestigd met A/B-zekerheid in deze sessie.
  garmin-webhook.js behandelt inkomende payloads daarom expliciet als
  niet-geverifieerd-authentiek: uitsluitend structurele, PII-vrije
  diagnostiek wordt gelogd, geen canonical data geschreven. PO ACTION:
  zodra Developer Program-toegang er is, de officiele webhook-documentatie
  (achter login) raadplegen voor het exacte schema en de verificatiemethode.
- OAuth 1.0a-uitfasering eind 2026: bevestigd via meerdere onafhankelijke,
  actuele (2026) integratiepakketten -- bewijsniveau C, consistent.
  Rechtvaardigt de keuze om uitsluitend OAuth 2.0+PKCE te bouwen.

## Polar AccessLink v3

- Autorisatie-endpoint: GET https://auth.polar.com/oauth/authorize --
  Bewijsniveau A (polar.com/polar-api-v4, Polar's eigen officiele pagina)
  + B (meerdere, onafhankelijk gegenereerde clientbibliotheken tonen
  exact dezelfde URL en queryparameters).
- Token-endpoint: POST https://polarremote.com/v2/oauth2/token, HTTP
  Basic Auth met client_id:client_secret -- Bewijsniveau A/B, zelfde
  bronnen, inclusief exacte curl-voorbeelden met identieke parameters
  over meerdere onafhankelijke community-clients heen.
- Verplichte user-registratiestap: POST /v3/users met member-id, 409 =
  al geregistreerd -- Bewijsniveau A (Polar's eigen Introducing-blogpost)
  + B (de officiele Python-referentieclient burnnat/polar_accesslink,
  een fork van Polar's eigen voorbeeldclient, documenteert dit exacte
  gedrag inclusief de 409-afhandeling).
- Exercise-transaction-model (create/list/fetch/commit): Bewijsniveau B
  -- meerdere, onafhankelijk uit Polar's eigen OpenAPI-spec gegenereerde
  clientbibliotheken (Ruby/PHP/Python) tonen identieke endpoint-paden en
  HTTP-methoden.
- Deregistratie-endpoint: DELETE /v3/users/{user-id} -- Bewijsniveau B,
  twee onafhankelijke, uit dezelfde officiele OpenAPI-spec gegenereerde
  clientbibliotheken bevestigen dit identiek.
- Zelfbediening, geen goedkeuringsperiode: Bewijsniveau A (Polar's eigen
  Introducing-blogpost) + C (onafhankelijke integratiegids bevestigt
  expliciet "does not require an approval period").
- 90-dagen-databeperking: Bewijsniveau C -- niet in een eerste-partij
  Polar-pagina expliciet teruggevonden in deze sessie, maar consistent en
  zonder tegenspraak.

## Bluetooth SIG-profielen (Heart Rate, Cycling Power, CSC, FTMS)

Zie de eerdere sprintrapporten (PR's #293-#300) en de moduledocumentatie
in core/bleHeartRate.js / core/bleCyclingPower.js /
core/bleCyclingSpeedCadence.js / core/ftmsCore.js zelf -- elke bewering
daar is al met hetzelfde format onderbouwd en wordt hier niet herhaald.

---

## Werkwijze voor nieuwe providers

1. Zoek eerst de eerste-partij developer-documentatie van de provider zelf.
2. Corroboreer met minimaal een onafhankelijke, bij voorkeur uit de
   officiele OpenAPI/GATT-spec gegenereerde clientbibliotheek of
   referentie-implementatie.
3. Bij tegenstrijdigheid tussen bronnen: de eerste-partij bron wint, of --
   als die zelf ontbreekt -- expliciet als ONBEVESTIGD markeren en niet in
   productiecode gebruiken.
4. Nooit een besluit over "kan dit gebouwd worden" uitsluitend op
   community/blog-niveau (D) baseren.
5. Elke keer dat dit document een bewering niet met A/B kan onderbouwen,
   moet de bijbehorende code dat expliciet en eerlijk in de eigen
   commentaar vermelden (zie garmin-webhook.js als voorbeeld).
