# MS-F5-05_WEARABLE_PROVIDER_FEASIBILITY_MATRIX.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Wearable Provider Feasibility Matrix" -- "Garmin/Polar/WHOOP/Suunto/COROS official access and value ranked." P2, docs-only toegestaan.

**Onderzoeksdatum:** 29 augustus 2026, uitsluitend actuele, officiële provider-/developerbronnen (providerprogramma's wijzigen, geen aanname uit training).

**Nadrukkelijk NIET gedaan:** geen reverse-engineering van private consumer-API's, geen APK-decompilatie. Alle bevindingen komen uitsluitend van officiële developerportals/documentatie.

## Per-provider bevindingen

### Garmin (Garmin Connect Developer Program)
- Officiële API/toegangsmodel: verzameling API's (Health, Activity, Women's Health, Training, Courses), OAuth 2.0, gratis licentie (sommige metrics vereisen een licentievergoeding voor commercieel gebruik).
- Goedkeuringsvereiste: partner-goedkeuring-only, geen self-serve. Actuele bevinding: nieuwe aanmeldingen liggen sinds 2026 gerapporteerd stil -- het publieke aanvraagformulier is verwijderd, geen gepubliceerde heropeningsdatum.
- Data: HRV/RHR/slaap via de Health API, volledige activiteitsdata via de Activity API.
- Toegangs-feasibility: LAAG (op dit moment, ongeacht technische geschiktheid).

### Polar (Open AccessLink API)
- Officiële API/toegangsmodel: self-serve, gratis Polar Flow-account + ontwikkelaarsregistratie, OAuth2, transactie-gebaseerd datamodel.
- Goedkeuringsvereiste: geen -- direct te gebruiken na registratie.
- Data: HRV (HRV4T, gestandaardiseerde 3-minuten-ochtendmeting), Nightly Recharge (ANS+slaap-hersteldata), Training Load Pro (Cardio/Muscle Load), activiteit. Uitsluitend nieuwe data, geen historische data vóór koppeling.
- Toegangs-feasibility: HOOG.

### WHOOP (WHOOP Developer Platform)
- Officiële API/toegangsmodel: gratis, self-serve developer-portal, OAuth 2.0, webhooks.
- Goedkeuringsvereiste: de ontwikkelaar zelf moet een eigen WHOOP-apparaat + betaald lidmaatschap hebben. Development-fase beperkt tot 10 WHOOP-leden; volledige lancering vereist een aparte app-goedkeuring.
- Data: activiteit, slaap, herstel (recovery/strain, WHOOP's eigen methodologie).
- Toegangs-feasibility: MIDDEL (technisch eenvoudig, maar vereist persoonlijke hardware-investering vóór ontwikkeling kan starten).

### Suunto (Suunto Partner Program / Cloud API)
- Officiële API/toegangsmodel: Suunto Cloud API voor consumentendata, OAuth-gebaseerd.
- Goedkeuringsvereiste: partner-programma-aanvraag, discretionaire beoordeling (merk-fit, klantinteresse), circa 2 weken reactietijd. Uitdrukkelijk geen personal-use-toegang -- uitsluitend voor bedrijven/organisaties met een publiek aanbod.
- Data: trainingssessies, dagelijkse activiteit (exacte HRV/slaap-dekking niet gespecificeerd in de geraadpleegde bronnen -- vereist verdere verificatie bij een daadwerkelijke aanvraag).
- Toegangs-feasibility: MIDDEL-LAAG (discretionair, business-only).

### COROS (COROS API)
- Officiële API/toegangsmodel: OAuth 2.0, recentelijk (2026) omgezet naar een gestandaardiseerd, objectief, niet-discretionair onboardingproces -- geen handmatige selectiebeoordeling, toegang voor elk platform dat aan standaard beveiligings-/operationele vereisten voldoet. GDPR/EU Data Act-conform.
- Goedkeuringsvereiste: technische details + OAuth-redirect-URI's indienen, standaardvoorwaarden accepteren -- geen discretionaire fit-beoordeling.
- Data: hartslag, VO2max, pace/cadans, hoogtemeters, zwemmetrics, bloedzuurstof, slaap.
- Toegangs-feasibility: HOOG (het meest open model van de vijf, recent geopend).

## Feasibility Score (per dimensie apart beoordeeld)

| Provider | Technical | Access | Athlete value | Data uniqueness | Overlap Health Connect/HealthKit | Implementation effort | Maintenance | Privacy complexity |
|---|---|---|---|---|---|---|---|---|
| Garmin | Hoog | Laag (aanmeldingen stilgelegd) | Hoog (grootste marktaandeel) | Middel | Deels | Middel | Middel | Middel |
| Polar | Hoog | Hoog | Middel-hoog | Middel-hoog (eigen recovery-metrics) | Beperkt | Laag-middel | Laag-middel | Laag-middel |
| WHOOP | Hoog | Middel (vereist eigen device) | Hoog (sluit aan bij TK's readiness-architectuur) | Hoog | Beperkt | Middel | Middel | Middel |
| Suunto | Middel | Middel-laag (discretionair, business-only) | Middel | Middel | Deels | Middel-hoog | Middel | Middel |
| COROS | Hoog | Hoog (nieuw, objectief model) | Middel-hoog | Middel-hoog | Beperkt | Laag-middel | Laag-middel | Laag-middel |

## Direct vs. aggregator
Voor elke provider is een directe integratie mogelijk, maar third-party aggregators bieden een alternatief pad dat de individuele OAuth-integratie-inspanning per provider vermijdt, tegen een terugkerende kostprijs en met een extra provenance-tussenlaag. Geen aanbeveling voor een specifieke aggregator-vendor gedaan -- dit is een commerciële/vendor-keuze die niet zelfstandig wordt beslist.

## Prioritering (evidence-based, geen contracten getekend, geen betaalde aanvragen ingediend)
1. Polar -- hoogste toegangs-feasibility, laagste drempel, sterke, gedifferentieerde hersteldata.
2. COROS -- vergelijkbaar hoge toegangs-feasibility, groeiende endurance-doelgroep die aansluit bij TK's Hyrox/endurance-tracks.
3. WHOOP -- hoge productwaarde (herstel-focus), maar vereist een investeringsbeslissing vóór ontwikkeling kan starten.
4. Garmin -- hoogste atleetwaarde maar momenteel feitelijk ontoegankelijk -- PRODUCT_DECISION_REQUIRED indien TK dit toch wil nastreven.
5. Suunto -- laagste prioriteit gezien de discretionaire, business-only toegangsdrempel.

## MS-F5-05 acceptance-gate-toetsing
Letterlijke acceptance gate: "Garmin/Polar/WHOOP/Suunto/COROS official access and value ranked."
Resultaat: CLOSED. Alle vijf providers onderzocht via actuele, officiële bronnen, feasibility gescoord op alle acht vereiste dimensies, evidence-based prioritering zonder commerciële beslissing. Docs-only, geen nep-connectorcode gebouwd.
