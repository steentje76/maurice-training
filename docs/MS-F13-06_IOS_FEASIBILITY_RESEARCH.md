# MS-F13-06_IOS_FEASIBILITY_RESEARCH.md — Trainingskompas

**Baseline main SHA:** `a6fb2d66ad80184db89d41efa4d0567e4334c166`. Datum: 30 augustus 2026. Onderzoeksdatum voor alle externe bronnen: 30 augustus 2026.

## Open product decision (canoniek, ongewijzigd)
docs/TRAININGSKOMPAS_MASTER_ROADMAP.md §24: "iOS timing" -- vóór Apple HealthKit-implementatie -- blokkeert MS-F5-04-vervolg (deze sprint). Dit is een decision-gated research-sprint: het doel is een technisch juiste, eerlijke feasibility-basis leggen voor de Product Owner, niet zelf de "wanneer bouwen we een native iOS-app"-beslissing nemen.

## Existing-state audit
- package.json: uitsluitend @capacitor/android (^6.1.0) + @capacitor/core. Geen @capacitor/ios.
- capacitor.config.json: geen iOS-specifieke configuratie.
- Geen ios/-map in de repository.
- Platform-check (deze sessie, uitgevoerd): uname -a bevestigt een Linux-omgeving. which pod xcodebuild xcode-select geeft geen resultaat -- geen CocoaPods, geen Xcode-toolchain beschikbaar.

## Fundamentele, technische bevinding
Een werkende iOS Xcode-projectstructuur (via npx cap add ios) vereist CocoaPods en de Xcode-command-line-tools, die uitsluitend op macOS bestaan. Dit is geen kwestie van ontbrekende Apple Developer-credentials (die zouden alleen nodig zijn om te signeren/publiceren) -- het is een fundamentele platformbeperking van deze Linux-sandbox-omgeving. Conform de opdracht ("bouw niet kunstmatig een halve iOS-app uitsluitend om een vinkje te zetten") wordt daarom geen ios/-map of Capacitor-iOS-dependency toegevoegd in deze sprint.

## Actueel onderzoek: Sign in with Apple (30 augustus 2026, officiële bronnen)
Belangrijke, positieve bevinding: Sign in with Apple kan volledig web-based, zonder native iOS-app. Apple's officiële "Sign in with Apple JS"-SDK draait in de browser en is expliciet bedoeld voor websites/PWA's zoals Trainingskompas. Dit is dus technisch bouwbaar binnen de huidige, web-gebaseerde architectuur.

Vereisten (via developer.apple.com, bevestigd):
- Een actief Apple Developer Program-lidmaatschap (buiten deze sessie beschikbaar).
- Een geregistreerde Services ID met Sign In with Apple ingeschakeld, gekoppeld aan een Primary App ID, met geregistreerde, exacte Return URLs (https, geen wildcards).
- Een gegenereerde private key (.p8-bestand) voor de Services ID, gebruikt om een clientsecret-JWT te ondertekenen -- moet elke 6 maanden vernieuwd worden (operationeel onderhoudspunt).
- Supabase Auth ondersteunt Apple als OAuth-provider direct via signInWithOAuth() -- consistent met de bestaande Supabase-authenticatiearchitectuur.
- Nieuw sinds 1 januari 2026: ontwikkelaars gevestigd in Zuid-Korea moeten een server-to-server-notificatie-endpoint registreren -- niet van toepassing op Trainingskompas.
- App Store Review Guideline 4.8 (bevestigd, juli 2026-bron): als een toekomstige native iOS-app social login aanbiedt, moet Sign in with Apple als gelijkwaardig alternatief worden aangeboden.

Conclusie Sign in with Apple: softwarematig, web-based bouwbaar binnen deze architectuur zodra de Product Owner een Apple Developer-account beschikbaar stelt. Dit hangt niet af van de "iOS timing"-beslissing voor een native app.

## Actueel onderzoek: Apple StoreKit / App Store Server API (30 augustus 2026)
Fundamenteel verschil met Sign in with Apple: StoreKit 2 is een native, Swift-gebaseerde API -- er bestaat geen web-equivalent. In-app-aankopen kunnen uitsluitend vanuit een echte, native iOS-app worden geïnitieerd; dit vereist Xcode, macOS, en een gecompileerde, in de App Store gepubliceerde app.

- App Store Server API (de server-kant): dit is een gewone REST-API die vanuit elke backend aangeroepen kan worden, met JWT-authenticatie op basis van een private key/Issuer ID/Key ID uit App Store Connect.
- App Store Server Notifications: server-to-server mechanisme voor transactiegebeurtenissen (conceptueel vergelijkbaar met de bestaande Mollie-webhook).
- Zonder een daadwerkelijke, native iOS-app die de aankoop initieert, is er niets voor deze server-kant om te verifiëren.

Conclusie StoreKit: volledig afhankelijk van de "iOS timing"-productbeslissing. De server-side adapter-architectuur kan ontworpen worden zonder een native app, maar kan pas daadwerkelijk getest worden zodra er een echte, gecompileerde iOS-app bestaat -- buiten het technische bereik van deze sessie (geen macOS/Xcode).

## Aanbeveling aan de Product Owner (feitelijk, geen beslissing genomen)
1. Sign in with Apple kan onafhankelijk van de "iOS timing"-beslissing worden gebouwd (MS-F13-07) zodra een Apple Developer-account beschikbaar is.
2. Apple StoreKit (MS-F13-08-scope) is intrinsiek afhankelijk van een daadwerkelijke, native iOS-app -- de "iOS timing"-beslissing blijft dus een harde blocker voor dit specifieke onderdeel.
3. Aanbevolen aanpak voor MS-F13-08: bouw de provider-adapterarchitectuur generiek genoeg dat een toekomstige StoreKit-adapter kan aansluiten zonder herontwerp -- vergelijkbaar met hoe billing_events.provider al providerneutraal is ontworpen in MS-F12-04.

## Status
MS-F13-06: SOFTWARE RESEARCH COMPLETE -- iOS TIMING PRODUCT DECISION BLIJFT OPEN. Geen code-implementatie in deze sprint (bewust, conform de instructie om geen kunstmatige, halve iOS-structuur te bouwen). Het onderzoek is volledig en actueel; de vervolgstappen (MS-F13-07 Sign in with Apple, MS-F13-08 StoreKit-scope) zijn hierdoor voor de Product Owner en toekomstige sprints duidelijk technisch afgebakend.
