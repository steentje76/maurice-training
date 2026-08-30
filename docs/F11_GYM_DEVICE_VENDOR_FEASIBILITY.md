# F11_GYM_DEVICE_VENDOR_FEASIBILITY.md — Trainingskompas

**MS-F11-04 — Gym Device Vendor Feasibility.** Onderzoeksdatum: 30 augustus 2026. Bronnen: officiële developerportals/documentatie waar beschikbaar (zie per vendor). Dit is een feasibility-/architectuursprint, geen implementatiesprint.

## 1. Architectuur (bevestigd, hergebruikt uit F5)

Bestaande, canonieke keten (`docs/PROVIDER_INTEGRATION_CONTRACT.md`, F5/MS-F5-01):

```
Device/vendor → connector/adapter → raw data + provenance → canonical model → Calculation Engine → Context/Decision → AI Coach → UX
```

Deze sprint introduceert **geen tweede calculation-, workout-, of equipmentmodel**. Elke vendor-adapter eindigt bij de canonieke `GymDeviceProviderContract` (sectie 4) en de bestaande, canonieke Exercise Library (`EX_CATALOG`, TK-XXXXXX-ID's, uit MS-F11-02).

## 2. Capability-matrix per vendor

| Vendor | Productcategorie | Officiële API | SDK | Cloud API | On-device | BLE | ANT+ | Auth | Partner approval | Public access | Workout read | Machine settings | Realtime | Historical sync | Commercial restr. | Privacy | Developer-status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **EGYM** | Krachttraining (smart strength/cardio), gym-ecosysteem | JA (Equipment Vendor API, MMS API v2, Data Hub) | Nee (REST) | JA | Nee | Onbekend | Onbekend | API-key + OAuth (EGYM ID SSO) | JA (server-to-server, contactformulier `integrations@egym.com`) | NEE (partner-only) | JA (via Data Hub, Enterprise Pack) | Onbekend (buiten scope publieke docs) | Onbekend | JA | Data Hub = Enterprise Pack-only, in pilot | Gym-tenant-scoped (EGYM is zelf al multi-tenant "data processor"-model) | **PARTNER-ONLY, actief onderhouden** | developer.egym.com (2026) |
| **Technogym** | Cardio + kracht, "mywellness"-ecosysteem | JA (Technogym Enterprise API / mywellness Open Platform) | Onbekend | JA | JA (FTMS Bluetooth op smart equipment) | JA (FTMS, open standaard) | Onbekend | OAuth (partner-niveau) | JA (Enterprise API vereist partnerschap) | **DEELS** — FTMS-Bluetooth-laag is een **open standaard**, geen Technogym-partnerschap nodig voor basale live data (power/cadence/etc.) | JA (Enterprise API: PRESCRIPTION/USER/EQUIPMENT LOGIN) | Onbekend | JA (equipment login + tracking) | JA | Contractueel, "business partnership" vereist voor Enterprise API | Individuele data-export door eindgebruiker mogelijk (GDPR-recht), geen individuele-developer-API | **Enterprise API: PARTNER-ONLY. FTMS-laag: OPEN STANDAARD, direct bruikbaar** | openplatformdocs.mywellness.com, DEV Community-artikel (mei 2026) |
| **Life Fitness / Precor** (zelfde moederbedrijf) | Cardio + kracht | JA (LFopen Web/Mobile API; Halo Fitness Cloud API console) | JA (Halo API/SDK-collectie) | JA | Onbekend | Onbekend | Onbekend | Developer-registratie vereist | **NEE voor basisregistratie** — LFopen is historisch "open zonder restricties", Halo vereist ontwikkelaarsregistratie via `apiconsole.halo.fitness` | JA na registratie | Onbekend | Subscription-API voor near-real-time | JA | Onbekend | Onbekend | **PUBLIEK, REGISTRATIE VEREIST (geen zakelijk partnerschap nodig)** | apiconsole.halo.fitness, software.lfconnect.com/lfopen (2026) |
| **Matrix Fitness** (Johnson Health Tech) | Cardio + kracht | Geen publieke, actueel bevestigde eigen developer-API gevonden | — | Onbekend | Onbekend | Vermoedelijk FTMS op recente cardio-modellen (niet expliciet bevestigd voor 2026) | Onbekend | — | Onbekend | **UNKNOWN** | — | — | — | — | — | — | **UNKNOWN — vereist direct vendorcontact** | Geen officiële 2026-bron gevonden binnen dit onderzoek |
| **Keiser** | Indoor cycling (M-Series), krachtapparatuur | JA (Keiser Developer Zone, `dev.keiser.com`) | JA (TypeScript/C#-referentie-parsers, officieel gepubliceerd) | Nee (directe BLE-broadcast, geen cloud) | JA (TX-only BLE-broadcast, Bluetooth 4.0 Smart) | **JA — open, publiek gedocumenteerd protocol** | Nee | Geen auth nodig (open broadcast) | **NEE** | **JA — volledig open, geen registratie** | JA (power/cadence/HR/duration via broadcast) | N.v.t. | **JA (native broadcast-interval)** | Nee (geen cloud-opslag door Keiser zelf) | Geen | Broadcast bevat geen PII, alleen equipment-ID + meetwaarden | **VOLLEDIG PUBLIEK, GEEN PARTNERSCHAP NODIG** | dev.keiser.com (M Series Direct/Receiver-documentatie) |
| **Wattbike** | Indoor cycling (Atom/Pro) | Geen eigen partner-API; gebruikt **open standaarden** | — | Onbekend (Wattbike Hub-app, geen publieke developer-API gevonden) | JA | JA (FTMS op Model B-monitor/Atom) | JA (FE-C op alle modellen) | Geen (open protocol-niveau) | Nee | **JA op protocol-niveau** (ANT+ FE-C / BLE FTMS zijn open industriestandaarden, geen Wattbike-specifieke toestemming nodig) | JA (power/cadence/HR via protocol) | N.v.t. | JA | Nee (geen Wattbike-cloud-API) | Geen | Protocol-niveau, geen PII | **OPEN STANDAARDPROTOCOL, GEEN VENDOR-API NODIG** | DC Rainmaker, TrainerRoad-support (2026) |
| **Concept2** | Rowing/Ski erg (PM5) | Reeds CLOSED in F5/F6 (`DEV-CONCEPT2-001`) | — | — | JA | JA | — | — | Nee | JA | JA | N.v.t. | JA | JA | Geen | Geen PII in broadcast | **REEDS GEÏMPLEMENTEERD** | `core/concept2Live.js`, MS-F5-02/MS-F6-03 |
| **gym80** | Krachtapparatuur (mechanisch) | **Geen native API** | — | — | — | Onbekend (third-party retrofit zoals "FitSense" genoemd, niet officieel) | — | — | — | — | — | — | — | — | — | — | **NO-GO (geen digitaal ecosysteem)** | FitnessNav-review (2026, met AI-gegenereerde disclaimer — laag-vertrouwen bron, maar consistent met afwezigheid van een officiële gym80-developerportal) |

**UNKNOWN blijft UNKNOWN:** Matrix Fitness kon binnen dit onderzoek geen officiële, actuele (2026) developer-documentatie opleveren. Geen reverse engineering, geen APK-analyse toegepast — geclassificeerd als `RESEARCH FURTHER`, niet als `NO-GO` of `unsupported`.

## 3. Waardebeoordeling & aanbevolen strategie

| Vendor | Databaarde | Betrouwbare load/reps? | Canonical exercise-koppeling mogelijk? | Athlete-identity veilig koppelbaar? | Realtime nodig? | Vendor lock-in | Partnership realistisch voor vroege startup? | Kosteneffectiviteit | Tenant-activeerbaar door gym zelf? | **Aanbeveling** |
|---|---|---|---|---|---|---|---|---|---|---|
| EGYM | Hoog (smart equipment, automatische load-tracking) | Ja (smart equipment) | Ja | Ja (EGYM ID) | Nee, post-workout sync volstaat | Laag (open ecosysteem, 200+ partners) | Laag-middel (contact vereist, Enterprise Pack-drempel voor Data Hub) | Middel | Nee (partnerschap nodig) | **PARTNER DEPENDENT** |
| Technogym (FTMS-laag) | Middel-hoog (power/cadence/duration op cardio) | Nee voor kracht (FTMS is cardio-gericht) | Ja (cardio-oefeningen) | Nee (FTMS geeft geen identiteit, alleen device-data) | Ja voor live weergave, nee voor logging | Zeer laag (open standaard) | N.v.t. (geen partnerschap nodig voor FTMS) | Zeer hoog | **JA — direct, geen actie van de gym nodig** | **NOW (architecture-ready)** |
| Technogym Enterprise API | Hoog (volledige prescription/tracking) | Ja | Ja | Ja | Nee | Hoog (contractueel) | Laag | Laag | Nee | **PARTNER DEPENDENT** |
| Life Fitness/Precor (Halo/LFopen) | Middel-hoog | Onbekend (afhankelijk van machinetype) | Ja | Ja (via geregistreerde app) | Nee | Middel | **Hoog — publieke registratie, geen zakelijk contract nodig** | Hoog | Ja (registratie via developer-console) | **NEXT** |
| Matrix Fitness | Onbekend | Onbekend | Onbekend | Onbekend | Onbekend | Onbekend | Onbekend | Onbekend | Onbekend | **RESEARCH FURTHER** |
| Keiser | Middel (cycling-metrics: power/cadence/HR, geen kracht-load) | N.v.t. (cycling, geen sets/reps) | Ja (voor cycling-oefeningen) | Nee (broadcast bevat geen identiteit, koppeling via app-sessie nodig) | Ja (live cycling-klas-scenario) | Zeer laag (open protocol) | N.v.t. | Zeer hoog | Ja, direct | **NOW (architecture-ready, cycling-specifiek)** |
| Wattbike | Middel (power/cadence/HR) | N.v.t. (cycling) | Ja | Nee (protocolniveau, geen identiteit) | Ja | Zeer laag | N.v.t. | Zeer hoog | Ja, direct | **NOW (architecture-ready, cycling-specifiek)** |
| gym80 | Geen | Nee | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | **NO-GO** |

**Belangrijke observatie:** de twee open-standaard-protocollen (**ANT+ FE-C en Bluetooth FTMS**) bieden de hoogste kosteneffectiviteit en laagste implementatiedrempel, ongeacht welke specifieke vendor-hardware ze gebruikt (Technogym, Wattbike, en veel ander cardio-apparatuur ondersteunen dit). Een generieke FTMS/ANT+-adapter zou potentieel bruikbaar zijn voor meerdere vendors tegelijk, zonder enig partnerschap. Keiser's eigen, open BLE-broadcast-protocol is vergelijkbaar toegankelijk maar vendor-specifiek geparsed.

## 4. Canonical `GymDeviceProviderContract` (ontwerp, geen implementatie deze sprint)

Conform sectie 1F van de opdracht: een generiek contract, alleen te implementeren zodra een concrete vendor-adapter gebouwd wordt (geen overengineering nu).

```
GymDeviceProviderContract {
  provider_id            -- 'egym' | 'technogym_ftms' | 'keiser_ble' | 'wattbike_ble' | ...
  external_machine_id    -- vendor-specifieke machine-identiteit
  machine_type           -- vrije tekst, gemapt naar canonical equipment_catalog waar mogelijk
  location_id            -- FK naar F11 locations (MS-F11-01) -- NOOIT een los, vendor-eigen locatiebegrip
  canonical_exercise_id  -- FK naar de bestaande Exercise Library (EX_CATALOG), NOOIT verzonnen
  athlete_identity_ref   -- expliciete, veilige koppeling (bijv. EGYM ID <-> Trainingskompas user_id), NOOIT impliciet geraden
  source_timestamp
  raw_provenance         -- ongewijzigde brondata + bron-vendor, voor audit
  load, reps, duration, distance, power, cadence, heart_rate  -- elk optioneel, NOOIT gefabriceerd bij ontbreken
  source_confidence      -- 'measured' | 'estimated' | 'unknown', nooit stilzwijgend 'measured' aannemen
  sync_state             -- 'pending' | 'synced' | 'conflict'
}
```

Niet elke provider hoeft elk veld te leveren (bijv. Keiser levert geen `load`/`reps`, alleen cycling-metrics). Het contract wordt pas een tabel/migratie zodra een concrete vendor-adapter (bijv. FTMS) daadwerkelijk gebouwd wordt — **niet in deze sprint**, om overengineering te voorkomen.

## 5. Privacy/security-architectuur (ontwerp)

Conform F11's bestaande tenant-model (MS-F11-01/02):

```
organization → location → machine/provider connection (nieuw, toekomstig) → canonical model
```

- **Secrets server-side only**: elke vendor-API-key/OAuth-token wordt, wanneer geïmplementeerd, uitsluitend server-side (Netlify Function/Supabase Vault) bewaard — nooit in de browser, analoog aan het bestaande wearable-patroon (`wearable_connections`/`wearable_oauth_state`, RLS deny-all, F5).
- **Tenant isolation**: een machine-koppeling hoort bij exact één `location_id` (FK naar F11 `locations`), nooit los. Cross-gym machine-zichtbaarheid moet met dezelfde `org_has_role()`-RLS-patronen worden geblokkeerd als equipment_catalog (MS-F11-02).
- **Athlete consent**: een individuele athlete-identiteitskoppeling (bijv. EGYM ID) vereist expliciete, herroepbare toestemming — analoog aan het bestaande wearable-koppel-/ontkoppel-patroon.
- **Idempotency/duplicate sync**: elke sync-operatie moet, wanneer gebouwd, een `UNIQUE`-constraint op `(provider_id, external_machine_id, source_timestamp)` hebben, analoog aan de bestaande `UNIQUE(user_id, provider)`-wearable-patronen.
- **Geen globale providercredentials**: elke credential is per-organization gescoped, nooit een applicatie-brede sleutel die meerdere tenants deelt.

Dit is ontwerp, geen implementatie — er bestaat nog geen enkele machine/provider-connection-tabel, conform de feasibility-scope van deze sprint.

## 6. Testbaar artifact voor deze sprint

Conform sectie 1H van de opdracht (geen nepsoftware alleen om "TESTED" te claimen): deze sprint levert geen nieuwe runtime-code (geen vendor is daadwerkelijk geïmplementeerd). Het testbare artifact is een **contractvalidatietest** die aantoont dat het ontworpen `GymDeviceProviderContract`-schema consistent is met de bestaande, canonieke Exercise Library en het F11-locatiemodel, en dat er geen vendor-specifieke calculation-logica in de Calculation Engine sluipt (architecturale grens-test, geen functionele feature-test).

## 7. Aanbevolen roadmapvolgorde

1. **NOW (architecture-ready, geen partnerschap nodig):** een generieke FTMS/ANT+-adapter (dekt Technogym-cardio, Wattbike, en potentieel andere FTMS-apparatuur in één keer) — hoogste waarde per implementatie-inspanning.
2. **NOW (architecture-ready, geen partnerschap nodig):** Keiser BLE-broadcast-adapter voor cycling-metrics.
3. **NEXT:** Life Fitness/Precor Halo-API-registratie (publiek, geen zakelijk contract nodig, maar wel losse ontwikkelinspanning per vendor-API in plaats van een open protocol).
4. **PARTNER DEPENDENT:** EGYM (Data Hub is Enterprise Pack-only/pilot, contact nodig) en Technogym Enterprise API (volledige prescription-toegang, contractueel).
5. **RESEARCH FURTHER:** Matrix Fitness — geen officiële 2026-bron gevonden binnen dit onderzoek, vereist direct vendorcontact voordat een feasibility-oordeel mogelijk is.
6. **NO-GO:** gym80 — geen digitaal ecosysteem, geen productwaarde te behalen zonder eigen, non-officiële hardware-retrofit (buiten scope, zou reverse-engineering-achtige risico's introduceren).

## 8. MS-F11-04 acceptance-gate-toetsing

Letterlijke acceptance gate: "EGYM/Technogym/etc. official integration feasibility."
**Resultaat: onderzoek volledig, evidence-based, per vendor geclassificeerd met expliciete brongegevens en datum. Geen vendor-integratie is geïmplementeerd (bewust, conform de feasibility-scope). Target maturity TESTED wordt gedragen door de contractvalidatietest (sectie 6) plus de volledige, reproduceerbare evidence-matrix in dit document.**
