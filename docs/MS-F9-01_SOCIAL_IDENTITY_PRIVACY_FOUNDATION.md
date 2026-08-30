# MS-F9-01_SOCIAL_IDENTITY_PRIVACY_FOUNDATION.md — Trainingskompas

**Canonieke naam/acceptance:** "Social Identity & Privacy Foundation" -- "Visibility and relationship model first." P2, geen dependencies.

## Information Architecture-beslissing
Zie F9_SOCIAL_INFORMATION_ARCHITECTURE_AUDIT.md. Kern: de bestaande bottom-navigatie heeft al 5 vaste hoofdtabs -- een genuine navigatieconflict tegen de gesuggereerde "aparte hoofdtab"-standaard. Beslissing: Social krijgt een eigen scherm bereikbaar via een consistent toegangspunt, geen permanente 6e tab.

## Social Identity
Hergebruikt auth.users.id volledig -- geen tweede accountsysteem. social_profiles is een presentatielaag bovenop dezelfde identiteit. Geen automatische opname van HRV/recovery/Women's Performance/gewicht.

## Privacy-model
Drie standen: private (default, opt-in) / connections / discoverable. SocialPrivacyCore (core/socialPrivacy.js) is het enige canonieke autorisatiecontract, 1:1 gespiegeld door de RLS-policies.

## Connections
Eenvoudig, asymmetrisch follow-model (geen wederkerige "friend"), bewust gekozen als kleinste, meest voorspelbare model.

## Block
Blok wint altijd, ongeacht visibility/connectiestatus. De geblokkeerde partij kan nooit zien dat/door wie zij geblokkeerd is.

## Report
social_reports-tabel: vertrouwelijk by design. Reporter ziet uitsluitend eigen reports, target heeft geen enkele toegang, geen self-report mogelijk. Geen nep-moderatorrol gebouwd (F9-03-scope).

## Vier kritieke, live ontdekte en gerepareerde security-bugs
Alle vier gevonden via verplichte adversarial testing op de productiedatabase (transacties met rollback), vóór er ooit UI op gebouwd werd:

1. Anonieme toegang tot discoverable profielen -- gefixt met auth.uid() IS NOT NULL.
2. Block-omzeiling via RLS-subquery-isolatie -- een directe EXISTS-subquery naar social_blocks werd zelf onderworpen aan de RLS van die tabel; de block-check faalde onopgemerkt vanuit het perspectief van de geblokkeerde partij. Gefixt met een SECURITY DEFINER-functie (social_is_blocked_pair).
3. Self-role-elevation in social_connections -- de follower-policy was FOR ALL (dus ook UPDATE), waardoor de follower zelf zijn verzoek naar accepted kon zetten. Gefixt door de follower te beperken tot INSERT/DELETE.
4. Onbedoeld EXECUTE-recht voor anon op de SECURITY DEFINER-functie -- een Supabase-default-privilege niet ondervangen door de eerste REVOKE ALL FROM PUBLIC. Gefixt met een expliciete REVOKE EXECUTE FROM anon.

Alle vier live herbevestigd als gerepareerd.

## SECURITY DEFINER-audit
social_is_blocked_pair: search_path vastgezet op 'public', STABLE, retourneert uitsluitend een boolean, geen dynamische SQL, EXECUTE uitsluitend voor authenticated.

## Tests
core/fSocialPrivacyCore.test.js (15/15, sabotagebewijs) en core/fSocialRlsMultiTenant.test.js (14/14, statische migratiebestand-contract-check + sabotagebewijs).

## Bestaande security-suites herbevestigd
RLS multi-tenant 22/22, coach-proxy 12/12, wearable-auth 20/20, observability 58/58 -- geen regressie.

## MS-F9-01 acceptance-gate-toetsing
Letterlijke acceptance gate: "Visibility and relationship model first."
Resultaat: CLOSED. Visibility-model en relationship-model zijn volledig, live geverifieerd geïmplementeerd vóórdat enige verdere social-functionaliteit gebouwd wordt. Vier kritieke security-bugs gevonden en gerepareerd door eigen, verplichte adversarial discipline.
