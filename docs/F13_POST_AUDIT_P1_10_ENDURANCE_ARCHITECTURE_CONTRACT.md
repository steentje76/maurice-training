# F13 Post-Audit — P1-10 Endurance Data Architecture: Migration-Ready Contract

**Status: ARCHITECTURE READY — IMPLEMENTATION OPEN.**

Conform de opdracht se eigen richtlijn ("Als implementatie te groot is
voor veilig werk: lever eerst een exact migration-ready contract en
classificeer als ARCHITECTURE READY — IMPLEMENTATION OPEN") wordt dit
schema NIET in deze sprint live uitgevoerd. Reden: er bestaat op dit
moment geen enkele UI/logica-consumer die deze tabellen zou gebruiken --
ze live aanmaken zonder een concrete, geplande vervolgsprint zou zelf
een vorm van premature, ongebruikte architectuur zijn. Dit document is
het volledige, uitvoeringsklare contract voor die vervolgsprint.

## 0. Audit van de huidige staat (live geverifieerd)

| Kolom/tabel | Huidige staat | Probleem |
|---|---|---|
| `sessions.distance` | `integer`, geen expliciete unit | Onduidelijk of dit meters, honderden meters, of iets anders is -- elke consumer moet dit raden of hardcoderen |
| `sessions.time_str` | `text` | Geen gestructureerde tijdsduur -- niet sorteerbaar/optelbaar in SQL zonder parsing |
| `race_segments` | Bestaat, maar specifiek voor HYROX/triathlon-brick (segment_index, exercise_id, start/finish-tijdstempels) | Geen generiek laps/intervals-model voor een reguliere hardloop-/fietstraining |
| Athlete endurance profile | Bestaat niet | Geen opslag voor FTP/threshold pace/max HR/zones per atleet |
| `CardioCore.criticalSpeed()`/`criticalPower()` | Geïmplementeerd (CALC-END-004/004B) | "niet geïntegreerd op trainingsgeschiedenis" -- gevoed met sessie-niveau-data, geen echte lap/stream-data |

**Scores uit de oorspronkelijke audit bevestigd als nog accuraat:**
Running 3/10, Cycling 3/10 (geen wijziging sinds de audit -- deze sprint
levert het ontwerp, niet de implementatie).

## 1. Ontwerpprincipes (verplicht, conform de opdracht)

- SI/canonical units expliciet in elke kolomnaam (nooit een ongemarkeerd getal).
- Geen provider-specifiek datamodel (Garmin/Strava/Wahoo-agnostisch).
- Voor elk nieuw object: concrete consumer, canonical units, source
  provenance, timestamp-semantiek, sport, provider, data quality,
  confidence, dedupe-strategie, delete/account-ownership, RLS, indexering,
  backward compatibility -- allemaal hieronder expliciet ingevuld.
- Het bestaande strength-model (`sessions` voor kracht) blijft volledig
  ongewijzigd -- dit is een NIEUW, parallel schema voor endurance, geen
  migratie van bestaande data.

## 2. Schema-ontwerp

### 2.1 `activities` (nieuwe tabel — vervangt NIET `sessions`, aanvullend voor endurance-detail)

| Kolom | Type | Betekenis |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `user_id` | `uuid references auth.users(id) on delete cascade` | Ownership -- volledige verwijdering bij accountverwijdering (consistent met het bestaande `delete-account.js`-patroon) |
| `session_id` | `uuid references public.sessions(id) on delete cascade` | Koppeling naar de bestaande, canonieke sessions-rij (geen tweede bron van waarheid voor "wanneer/welke sport/basisduur") |
| `sport` | `text not null check (sport in ('running','cycling','rowing','swimming'))` | Expliciete, gesloten enum -- geen vrije tekst |
| `distance_meters` | `numeric` | SI-eenheid expliciet in de naam -- nooit een ongemarkeerd "distance" |
| `duration_seconds` | `integer` | SI-eenheid expliciet -- vervangt `time_str`'s vrije tekst |
| `elevation_gain_meters` | `numeric` | |
| `avg_heart_rate_bpm` | `integer` | |
| `avg_power_watts` | `numeric` | Alleen cycling/rowing |
| `avg_cadence_rpm` | `numeric` | |
| `source_provenance` | `text not null check (source_provenance in ('manual','wearable_device','wearable_derived'))` | Onderscheid gemeten vs. afgeleid (CALC-END-003-precedent) |
| `source_provider` | `text` | bijv. `'google_health'`, `null` voor handmatige invoer -- geen provider-specifiek schema, uitsluitend een herkomstlabel |
| `data_quality` | `text default 'unverified' check (data_quality in ('unverified','provider_verified','user_corrected'))` | |
| `recorded_at` | `timestamptz not null` | Wanneer de activiteit plaatsvond (niet wanneer de rij is aangemaakt) |
| `created_at` | `timestamptz not null default now()` | |
| `dedupe_key` | `text` | `provider + provider_activity_id`, uniek per gebruiker -- voorkomt duplicaten bij een herhaalde wearable-sync (zelfde patroon als de al bestaande P1-04-idempotentie-oplossing) |

**Unique constraint:** `unique(user_id, dedupe_key)` waar `dedupe_key is not null`.

### 2.2 `activity_laps` (nieuwe tabel)

| Kolom | Type | Betekenis |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `activity_id` | `uuid references public.activities(id) on delete cascade` | |
| `lap_index` | `integer not null` | 1-based, volgorde binnen de activiteit |
| `distance_meters` | `numeric` | |
| `duration_seconds` | `integer` | |
| `avg_pace_seconds_per_km` | `numeric` | Afgeleid, niet dubbel opgeslagen als los "pace"-veld met onduidelijke eenheid |
| `avg_heart_rate_bpm` | `integer` | |
| `avg_power_watts` | `numeric` | |

**Unique constraint:** `unique(activity_id, lap_index)`.

### 2.3 `athlete_endurance_profile` (nieuwe tabel — één rij per gebruiker per sport)

| Kolom | Type | Betekenis |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `user_id` | `uuid references auth.users(id) on delete cascade` | |
| `sport` | `text not null check (sport in ('running','cycling','rowing'))` | |
| `threshold_pace_seconds_per_km` | `numeric` | Running |
| `ftp_watts` | `numeric` | Cycling (Functional Threshold Power) |
| `max_heart_rate_bpm` | `integer` | |
| `zones_source` | `text not null check (zones_source in ('user_entered','calculated_critical_speed','calculated_critical_power'))` | Herkomst van de waarde -- nooit een stille, onverklaarde default |
| `updated_at` | `timestamptz not null default now()` | |

**Unique constraint:** `unique(user_id, sport)`.

## 3. RLS (consistent met het bestaande, bewezen patroon)

Alle drie tabellen: `enable row level security`, met policies naar het
bestaande, overal gebruikte patroon (`user_id = auth.uid()` voor
`authenticated`, geen policy voor `anon`, `service_role` voor
wearable-sync-achtige server-side writes). Geen nieuw RLS-patroon nodig
-- dit is exact hoe `hrv_log`/`weight_log`/`sessions` al werken.

## 4. Indexering

- `idx_activities_user_recorded on activities(user_id, recorded_at desc)`
  -- zelfde, kritieke patroon als de zojuist gefixte `idx_sessions_user_date`
  (P1-12) -- verplicht vanaf dag 1 van de implementatie, niet als latere
  toevoeging.
- `idx_activity_laps_activity on activity_laps(activity_id)`.
- `idx_athlete_endurance_profile_user on athlete_endurance_profile(user_id)`
  (impliciet via de unique constraint).

## 5. Backward compatibility

`sessions.distance`/`sessions.time_str` blijven ONGEWIJZIGD bestaan --
dit nieuwe schema is aanvullend, niet vervangend. Bestaande cardio-
sessies (kracht + eenvoudige cardio-logging) blijven werken zonder
enige aanpassing. `activities.session_id` is nullable-by-design in de
zin dat niet elke `sessions`-rij een `activities`-tegenhanger hoeft te
hebben -- alleen sessies met gedetailleerde endurance-data (laps,
device-gemeten vermogen, etc.) zouden een `activities`-rij krijgen.

## 6. Consumers (voor de vervolgsprint, niet in deze sprint gebouwd)

- `CardioCore.criticalSpeed()`/`criticalPower()`: zouden voortaan
  `activity_laps` als brondata kunnen gebruiken i.p.v. sessie-niveau-
  aggregaten -- preciezere Critical Speed/Power-berekening.
- Een nieuw "Endurance detail"-scherm (analoog aan het bestaande
  Progress-scherm voor kracht) zou laps/zones/trend tonen.
- TRIMP/aerobic decoupling/HR-zones (CALC-END-005, nog steeds NOT
  IMPLEMENTED) zouden `avg_heart_rate_bpm` uit `activities`/
  `activity_laps` als brondata gebruiken.

## 7. Expliciet NIET in scope van dit contract

- Geen provider-specifieke sync-logica (dat blijft in de bestaande
  `netlify/functions/wearable-sync.js`-laag, die zou worden uitgebreid
  om ook naar `activities` te schrijven in de vervolgsprint).
- Geen UI-wijzigingen.
- Geen migratie van bestaande `sessions.distance`/`time_str`-data naar
  het nieuwe schema (zou een aparte, expliciete productbeslissing
  vereisen over of/hoe historische data wordt teruggewerkt).

## 8. Conclusie

**ARCHITECTURE READY — IMPLEMENTATION OPEN.** Dit contract is compleet
genoeg om in een aparte, toekomstige sprint direct als migratie te
kunnen worden uitgevoerd, zonder verdere ontwerpvragen. Niet live
toegepast in deze F13 Post-Audit-sprint conform de opdracht se eigen
richtlijn voor omvangrijke, nog-niet-geconsumeerde architectuur.
