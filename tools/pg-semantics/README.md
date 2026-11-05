# PostgREST-semantiek lokaal testen

Wegwerpomgeving om de schrijf- en verificatielaag van de app tegen een **echte** PostgreSQL en PostgREST te draaien. In de unit-tests gebeurt dat tegen een nep-PostgREST.

Gebruik dit nooit tegen productie: de runner praat alleen met `127.0.0.1`.

`schema.sql` is afgeleid uit read-only productiemetadata: kolommen, sleutels, unieke indexen, RLS-policies en de trigger `set_user_id_from_auth`. Het bevat geen productiedata.

## Starten

1. **Database aanmaken.** PostgreSQL 16 lokaal, als superuser:

   ```
   createdb tk_semantiek
   psql -v ON_ERROR_STOP=1 -d tk_semantiek -f tools/pg-semantics/schema.sql
   ```

2. **PostgREST v12.2.3 starten.** Gebruik het statische binary van de GitHub-release `postgrest-v12.2.3-linux-static-x64.tar.xz` (sha256 van het binary: `870a77f4…c617`) met deze configuratie:

   ```
   db-uri = "postgres://authenticator:tk_lokaal@127.0.0.1:5432/tk_semantiek"
   db-schemas = "public"
   db-anon-role = "anon"
   jwt-secret = "tk-lokaal-geheim-alleen-voor-wegwerp-tests-0123456789"
   server-port = 3000
   ```

3. **Runner draaien:**

   ```
   node tools/pg-semantics/run.js
   ```

## Wat de runner controleert (P1–P10)

| Scenario | Controle |
|---|---|
| P1 | Een replay met client-id geeft één rij. Teruglezen met echte Postgres-typen (timestamptz, numeric, jsonb) geeft `SERVER_VERIFIED`. |
| P2 | `exercise_goals` met `on_conflict` werkt naast de identity-kolom. |
| P3 | `activity_laps` met `on_conflict`; laps worden geverifieerd via de ouder. |
| P4 | `ignore-duplicates` draait een intrekking niet terug; een partiële unieke index geeft 409. |
| P5 | `cycle_symptom_logs`: een tweede insert voor dezelfde dag geeft 409 en de symptomen blijven ongewijzigd. |
| P6 | De client weigert een payload van een andere gebruiker vóór verzending. Daarnaast wordt bevestigd dat de trigger in de database de rij stil overschrijft. |
| P7 | Een rij die bij een andere eigenaar staat, geeft `MISSING` zonder definitief te zijn. |
| P8 | Maaltijdregels zonder eigen `user_id` worden via de maaltijd geverifieerd. |
| P9 | Een echte 409 op de primaire sleutel leidt via teruglezen tot bevestiging. |
| P10 | Tekst-id's met komma's en aanhalingstekens werken in het `in`-filter. |

Deze runner draait niet in CI: daar staat geen PostgreSQL of PostgREST klaar. Leg de uitkomst bij elke wijziging aan de schrijf- of verificatielaag vast in het rapport.
