# B9-10 Nutrition Product — Existing-State Audit

## Matrix

| Capability | B9-09 status | Productwaardig? | Gap | B9-10 actie |
|---|---|---|---|---|
| Entry toevoegen | IMPLEMENTED | Ja | Geen | Behouden, hergebruikt via nutritionSaveEntry() |
| Entry wijzigen | **NOT IMPLEMENTED** | Ja (kritiek) | Volledig ontbrekend -- delete+opnieuw was de enige route | **Gebouwd:** nutritionEditEntry()/nutritionSaveEntry() (create+update) |
| Entry verwijderen | IMPLEMENTED | Ja | Geen | Behouden, gemigreerd naar sbDelQ() |
| Dagoverzicht | PARTIAL (alleen "vandaag") | Ja | Geen datumnavigatie | **Gebouwd:** dag-switcher (vorige/volgende/vandaag) |
| History | NOT IMPLEMENTED | Ja | Geen manier om oudere dagen te zien | **Gebouwd:** via dezelfde datumnavigatie (geen aparte, complexe history-view) |
| Hydration quick log | NOT IMPLEMENTED | Ja | Geen invoerversnelling | **Gebouwd:** +250ml/+500ml-presets |
| Training koppeling | BACKEND ONLY (timing_context bestond, geen link-UI) | Ja | timing_context werd niet getoond | **Gebouwd:** timing_context zichtbaar per entry; concrete training_instance_id-link-UI bewust NIET gebouwd (sectie 15, acceptabel) |
| Offline create | NOT INTEGRATED | Ja | Eigen `fetch()`, geen queue | **Gebouwd:** gemigreerd naar sbPostQ() |
| Offline update | N.v.t. (edit bestond niet) | Ja | -- | **Gebouwd:** sbPatchQ() |
| Offline delete | NOT INTEGRATED | Ja | Eigen `fetch()`, geen queue | **Gebouwd:** gemigreerd naar sbDelQ() |
| Duplicate replay | NOT PROTECTED | Ja | Geen client-id/idempotency | **Gebouwd:** toegevoegd aan IDEMPOTENT_TABELLEN_MET_CLIENT_ID |
| Error recovery | PARTIAL | Ja | Aanwezig, herbevestigd | Behouden (error != empty al aanwezig sinds B9-09) |
| Provenance zichtbaar | BACKEND ONLY | Nee (bewust) | Geen zichtbare noodzaak (alleen user_entered bestaat) | Niet toegevoegd -- geen UX-vervuiling voor een enkele, altijd-dezelfde waarde |
| Data completeness | IMPLEMENTED (core), niet zichtbaar in UI | Ja | PARTIAL werd niet getoond | **Gebouwd:** "dag mogelijk onvolledig"-taal per veld |
| Account deletion | CLOSED | Ja | Geen | Herbevestigd, geen wijziging nodig |
| Export | NOT IMPLEMENTED (geen generiek contract) | Nee (voor nu) | Geen bestaand contract | **Beslissing:** P2/P3-backlog (optie C), niet blokkerend |
| Accessibility | Basaal (labels bestonden) | Ja | Edit-knop had geen label | **Gecorrigeerd:** aria-label toegevoegd |
| Mobile UX | Basaal | Ja | Herbevestigd | Geen structurele wijziging nodig, bestaande patronen (card/btn) hergebruikt |

## Kernbevindingen

**Kritiek, zelf gevonden security-gat (P0):** de B9-09-RLS-policies
controleerden bij een insert/update alleen `user_id = auth.uid()` op de
`nutrition_entry` zelf -- niet of een meegegeven `training_instance_id`/
`activity_id` ook daadwerkelijk van dezelfde gebruiker was. Live
bevestigd vóór de fix: user B kon een `training_instance_id` van user A
koppelen aan zijn eigen entry. Gecorrigeerd in `migratie_v537.sql`.

**Edit ontbrak volledig** -- precies zoals de opdracht anticipeerde.
Dit was de belangrijkste, eerste bouwtaak van B9-10.

**Offline was niet geïntegreerd** -- de B9-09-UI gebruikte rechtstreekse
`fetch()`-aanroepen. Gemigreerd naar de bestaande, bewezen
`sbPostQ()`/`sbPatchQ()`/`sbDelQ()`-infrastructuur (met `owner_uid`-
binding en idempotency), geen tweede offline-engine gebouwd.
