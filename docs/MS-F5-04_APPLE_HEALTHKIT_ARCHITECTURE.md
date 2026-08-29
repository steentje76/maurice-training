# MS-F5-04_APPLE_HEALTHKIT_ARCHITECTURE.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Apple HealthKit Architecture" -- "iOS path designed before implementation." P2. Ontwerp-sprint, geen implementatie vereist of toegestaan zonder een fysieke iPhone/canonieke roadmap-wijziging.

**Onderzoeksdatum:** 29 augustus 2026, gericht op officiële Apple Developer-documentatie.

## Bevestigd: geen bestaande iOS-scaffold
Repo-brede controle bevestigt: geen ios/-map, geen .xcodeproj, capacitor.config.json bevat uitsluitend Android-configuratie. Dit is dus een volledig greenfield ontwerp.

## Fundamentele architectuurwet (bevestigd via officiële documentatie)
HealthKit werkt fundamenteel anders dan elke andere in dit project geïntegreerde provider: geen REST-endpoint, geen OAuth-flow, geen server-side token. Data leeft uitsluitend op het apparaat en kan het apparaat nooit verlaten zonder dat de iOS-app dit expliciet uitleest en uploadt. Dit is geen ontwerpkeuze maar een platformbeperking. Elke architectuur die HealthKit als een Garmin-achtige server-REST-API zou modelleren, is fundamenteel fout.

## Ontworpen keten
```
iOS app/native laag (Swift, Capacitor-plugin)
  -> HKHealthStore.requestAuthorization(toShare:read:) [expliciete gebruikersactie, per-type]
  -> HKObserverQuery + enableBackgroundDelivery(for:frequency:) [achtergrond-updates]
  -> canonieke adapter (JS-zijde, analoog aan window.TKDeviceTransport-patroon van Concept2)
  -> normalisatie/provenance (hergebruik dezelfde canonieke velden als de Google Health API waar semantisch gelijk)
  -> bestaande TK-backend/datamodel (hrv_log, upsert_daily_health-RPC)
```

## Autorisatie (officieel bevestigd)
- requestAuthorization() moet vanuit een gebruikers-zichtbare context worden geïnitieerd, niet automatisch bij app-start.
- Info.plist-doelomschrijvingen (NSHealthShareUsageDescription) moeten helder en mens-leesbaar zijn -- Apple-reviewers wijzen apps af die onnodige gezondheidsdata opvragen.
- Minimaal noodzakelijke typen aanvragen, nooit een brede aanvraag.
- HKHealthStore.isHealthDataAvailable() moet eerst gecontroleerd worden (bv. niet beschikbaar op iPad).

## Voorgestelde HealthKit-datatypen (officieel geverifieerde identifiers, alleen productrelevante kandidaten)

| HealthKit-identifier | Canonieke TK-mapping | Belangrijke nuance |
|---|---|---|
| HKQuantityTypeIdentifier.heartRateVariabilitySDNN | hrv | Methodologisch verschil, niet stilzwijgend gelijkstellen: dit is een SDNN-gebaseerde meting. Als de Google Health API een andere HRV-methodologie rapporteert, moeten beide bronnen hun eigen methodologie in de provenance vastleggen -- geen geforceerde equivalentie. |
| HKQuantityTypeIdentifier.restingHeartRate | rhr | Semantisch gelijk aan het bestaande RHR-canonieke veld, waarschijnlijk direct herbruikbaar. |
| HKCategoryTypeIdentifier.sleepAnalysis | sleep | Categorische waarden (asleep/inBed/awake), vereist aggregatie naar canonieke uren-eenheid -- niet 1-op-1 met een numerieke Google Health-slaapwaarde. |
| HKQuantityTypeIdentifier.heartRate | Live/sessie-hartslag | Alleen relevant bij een toekomstige live-sessie-integratie -- buiten de huidige HRV/RHR/slaap-scope. |

Bewust NIET meegenomen: workouts, stappen, calorieën, reproductieve gezondheid -- geen productbehoefte hiervoor vastgesteld binnen de huidige scope.

## Achtergrondlevering
HKObserverQuery + enableBackgroundDelivery(for:frequency:) met frequentie hourly of daily voor HRV/RHR/slaap (niet immediate, wat onnodig batterijverbruik zou veroorzaken) -- consistent met de bestaande, niet-tijdkritische aard van de Google Health API-sync.

## Apple-privacy
- Expliciete, per-type doelomschrijvingen in Info.plist.
- Minimalisatie: alleen de vier bovenstaande typen.
- Read/write-grens: uitsluitend lezen, nooit toShare voor deze scope.
- Server transfer-implicatie: zodra data van het apparaat naar de TK-backend wordt geüpload, verlaat het Apple's HealthKit-privacygrens en valt onder TK's eigen, reeds bestaande privacybeleid (dezelfde RLS/provenance-garanties als de Google Health API-data) -- dit moet expliciet aan de gebruiker gecommuniceerd worden bij de autorisatie-aanvraag.

## Cross-platform contract -- convergentie ná de adapter, geen geforceerde gelijkstelling
HealthKit en de Google Health API convergeren pas NA hun eigen adapters in hetzelfde canonieke hrv/rhr/sleep-schema (dezelfde tabel, dezelfde upsert_daily_health-RPC, dezelfde per-veld provenance-kolommen) -- maar de HRV-methodologie-nuance wordt bewust niet weggemoffeld. Voorstel: hrv_source kan voortaan naast manual/wearable/unknown ook een methodologie-suffix dragen (bv. wearable:healthkit_sdnn) indien dit ooit gebouwd wordt -- dit is een ontwerpvoorstel, geen huidige implementatie.

## Gedeelde abstracties
Voorgesteld, niet gebouwd: een JS-zijde window.TKHealthKitTransport-interface, analoog aan het bestaande window.TKDeviceTransport-patroon voor Concept2 -- een dunne, canonieke JS-laag die een toekomstige native Swift/Capacitor-plugin zou implementeren, zodat de bestaande _wearableSyncLib.js-canonieke-mapping-logica hergebruikt kan worden zonder duplicatie.

## MS-F5-04 acceptance-gate-toetsing
Letterlijke acceptance gate: "iOS path designed before implementation."
Resultaat: CLOSED. Volledig architectuurontwerp opgesteld op basis van actuele, officiële Apple-documentatie, met expliciete erkenning van de HRV-methodologie-nuance en de fundamentele platform-architectuurwet. Geen iOS-code geschreven, geen implementatie voorgewend.
