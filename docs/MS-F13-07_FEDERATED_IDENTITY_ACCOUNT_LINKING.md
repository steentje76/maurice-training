# MS-F13-07_FEDERATED_IDENTITY_ACCOUNT_LINKING.md — Trainingskompas

**Baseline main SHA:** `46cc432f2b357cdc16356b05f0d4f4f651bae41c`. Datum: 30 augustus 2026. Onderzoeksdatum voor externe bronnen: 30 augustus 2026.

## Existing-state audit: identity-architectuur

public.users.id heeft geen expliciete foreign key naar auth.users(id) (bevestigd via pg_constraint: alleen FK's naar gyms.id en plans.key bestaan). De koppeling loopt via een AFTER INSERT ON auth.users-trigger (trg_provision_public_user -> provision_public_user()), die bij elke nieuwe auth.users-rij automatisch een public.users-rij met hetzelfde id (as text) aanmaakt, met ON CONFLICT DO NOTHING (idempotent).

Belangrijke, bestaande bevinding: provision_public_user() zet bij elke nieuwe gebruiker hardcoded gym_id='art-crossfit' en gym_role='lid'. Bestaand, ongewijzigd gedrag, buiten scope van deze sprint, maar bevestigt dat de trigger geen aannames maakt over de inlogmethode.

Authenticatie loopt volledig via directe REST-fetch-calls naar de Supabase Auth-API -- geen @supabase/supabase-js-SDK aanwezig. Elke OAuth-integratie moet het raw GoTrue REST-protocol gebruiken, niet de SDK-methoden.

## Actueel onderzoek: Supabase automatische account-linking (30 augustus 2026, officiële bron)

Kernbevinding: Supabase Auth linkt automatisch identities met hetzelfde, geverifieerde e-mailadres aan één bestaande gebruiker. Bij een nieuwe OAuth-login zoekt Supabase zelf naar een bestaande gebruiker met hetzelfde e-mailadres -- bij een match wordt de nieuwe identity gekoppeld, er ontstaat geen nieuwe auth.users-rij. trg_provision_public_user triggert dan niet opnieuw -- geen dubbele public.users-rij.

Veiligheidsmaatregel tegen pre-account-takeover: Supabase linkt nooit automatisch een identity met een ongeverifieerd e-mailadres. Bij een succesvolle koppeling worden andere, ongeverifieerde identities van de bestaande gebruiker automatisch verwijderd.

Live geverifieerd in dit project: auth.users.email_confirmed_at wordt daadwerkelijk gevuld (4 van 6 bestaande gebruikers bevestigd) -- e-mailverificatie is actief, automatische linking is hier dus veilig.

Manual linking (linkIdentity()) is standaard uitgeschakeld, vereist dashboard-configuratie, buiten scope (geen dashboard-toegang beschikbaar) -- automatische linking dekt het belangrijkste scenario.

Bekende, gerelateerde bug (GitHub supabase/auth#2472, april 2026): identities-tabel-metadata wordt niet bijgewerkt bij het toevoegen van e-mail/wachtwoord aan een bestaand OAuth-account via password-recovery. Niet blocking, raakt alleen metadata-weergave.

## Actueel onderzoek: raw GoTrue REST-protocol voor OAuth (zonder SDK)

Bevestigd: het onderliggende endpoint is GET {SUPABASE_URL}/auth/v1/authorize?provider=<naam>&redirect_to=<url> -- een browser-redirect, consistent uitvoerbaar zonder SDK (window.location.href). Zonder PKCE-parameters gebruikt dit de implicit flow: tokens komen terug als URL-hash-fragment (#access_token=...&refresh_token=...), niet als een code die eerst omgewisseld moet worden -- de eenvoudigste, meest passende keuze voor een client zonder SDK.

## Actueel onderzoek: Sign in with Apple specifiek
Bevestigd (via MS-F13-06): web-based, PWA-compatibel. Supabase's /authorize-endpoint handelt het protocolgesprek server-side af. Vereist een Apple Developer Program-account, Services ID met exacte Return URLs, en een periodiek te vernieuwen .p8-private-key (buiten deze sessie, providervalidatie blijft open).

## Wat wél gebouwd wordt in deze sprint
1. UI: "Doorgaan met Google" / "Doorgaan met Apple"-knoppen op het login/registratiescherm.
2. Client-side redirect-functie naar het raw /auth/v1/authorize-endpoint.
3. Callback-afhandeling: bij het laden van de app wordt het URL-hash-fragment gecontroleerd op access_token, hergebruik van de bestaande sessie-opslag-code.
4. "Gekoppelde inlogmethoden"-sectie in het profielscherm, gebaseerd op de identities-array uit /auth/v1/user.
5. Adversarial tests + sabotagebewijs.

## Wat NIET gebouwd wordt
- Het daadwerkelijk inschakelen van Google/Apple in het Supabase-dashboard (vereist providercredentials).
- Live, end-to-end-verificatie van een echte OAuth-round-trip.

## Status
MS-F13-07: SOFTWARE IMPLEMENTED/TESTED — GOOGLE/APPLE PROVIDER CONFIGURATION VALIDATION OPEN.
