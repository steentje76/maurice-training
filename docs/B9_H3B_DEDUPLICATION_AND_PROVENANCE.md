# B9-H3B Deduplication and Provenance

## Dedupe-strategie (sectie 24/25)

**Confidence-niveau: EXACT.** `dedupe_key = "google_health:" +
dataPoint.name` -- Google Health se eigen, stabiele, unieke
datapoint-naam per gebruikersaccount. Geen fingerprint-heuristiek
nodig zolang de provider een stabiele external ID levert (wat Google
Health doet).

## Zelf gevonden en gerepareerde kritieke bug (kernresultaat van deze sprint)

De bestaande unique index `idx_activities_user_dedupe` is een
**partial index** (`WHERE dedupe_key IS NOT NULL`) -- correct, want
handmatig ingevoerde activiteiten hebben geen dedupe_key en horen niet
onderling als "conflict" gezien te worden. Live, adversariaal
ontdekt: PostgREST se generieke `on_conflict`-query-parameter
ondersteunt GEEN partial-index-WHERE-clausule op de conflict-target
(bevestigd: `42P10: there is no unique or exclusion constraint
matching the ON CONFLICT specification`).

**Oplossing:** een nieuwe SECURITY DEFINER-RPC
(`upsert_provider_activity()`, migratie_v541.sql) die de correcte,
native SQL `ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT
NULL DO UPDATE` intern uitvoert -- hetzelfde architectuurpatroon als
de reeds bestaande `upsert_daily_health()`-RPC.

**Live, adversariaal bewezen (S1):** dezelfde activity 3x via de RPC
aangeroepen -> 1 canonieke rij, elke keer herbevestigd.

## Manual Data Protection (sectie 31, zelf gevonden tijdens ontwerp)

Tijdens het uitwerken van de update-semantiek (sectie 27) werd
duidelijk dat een naïeve "altijd overschrijven bij conflict"-aanpak
een handmatige correctie van de athlete (`data_quality =
'user_corrected'`, een reeds bestaand, elders in de app gebruikt
label) stil zou kunnen overschrijven bij een volgende sync. Opgelost
door een expliciete `WHERE public.activities.data_quality IS DISTINCT
FROM 'user_corrected'` op de `DO UPDATE`-clausule. Live, adversariaal
bewezen: een activity met `data_quality='user_corrected'` en
`distance_meters=5000` bleef exact `5000` na een sync-poging met
`distance_meters=9999` -- de correctie werd niet overschreven, en de
RPC gaf geen fout (retourneert NULL, door de aanroepende functie
correct als "skipped" geteld).

## Provenance-velden per canonieke activity

`source_provenance='provider_derived'`, `source_provider='google_
health'`, `data_quality='provider_verified'`, `recorded_at` (bron-
tijdstip, ongewijzigd), `dedupe_key` (herleidbaar naar de exacte
provider-record). Per-metric provenance (sectie 22, bijv. HR van een
borstband apart van GPS van het horloge) is in deze sprint niet van
toepassing -- Google Health se `exercise.metricsSummary` levert een
samengevatte, geaggregeerde set metrics zonder per-sensor-attributie.
