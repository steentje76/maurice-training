# TK504 / TK603 / TK614 — migratie-identiteit gesynchroniseerd met live Supabase

**Datum:** 9 november 2026
**Omvang:** uitsluitend Git-bestandsnamen, broncodeverwijzingen en regressietests.
**Productie:** ALLE vijf SQL-migraties waren reeds eerder uitgevoerd; in deze sessie zijn alleen **READ-ONLY** controles op de Supabase-migratiehistorie gedaan.

## Feitelijke afwijking

In Git stonden vijf MoveKit-/catalogus-/TK614-migraties met eigen ontwikkelversienummers. Het productiesysteem heeft dezelfde SQL opgeslagen onder andere, daadwerkelijke migratieversies. Een latere `supabase db push` zou de oude versienummers mogelijk als niet-uitgevoerd herkennen en de al aanwezige schema- en beveiligingsobjecten opnieuw proberen te maken.

Voorafgaand aan hernoemen is via `supabase_migrations.schema_migrations` op de actuele Trainingskompas-database de combinatie van **version, name en SHA-256 van de werkelijk opgeslagen SQL-statements** uitgelezen. Vervolgens zijn de lokale SQL-bronnen vergeleken na uitsluitend normalisatie van Windows CRLF-regelafbrekingen naar LF. **Alle vijf hashes komen exact overeen.**

| Migratie | Oud Git-versienummer | Live Supabase-versie | SHA-256 van toegepaste SQL, genormaliseerd |
|---|---|---|---|
| MoveKit media grants | 20261103155325 | **20261107191701** | `7e94ebf215ef3f9b207d760b11b14ef9c58872d5940105030d7b645898bdf0d7` |
| Getypeerde catalogus-FK | 20261106110000 | **20261107191714** | `9eaa87433a06d654a96142be452987a8be9bcb7561a9bd76ff8aab00700cf278` |
| Gepubliceerde catalogus staging | 20261106161000 | **20261107191721** | `c9f09a44096b236d7f20a2a7bc2f781f6221cc5b9383351f24289767fdfe8d5a` |
| TK603 gereserveerde scope | 20261107154937 | **20261107191728** | `98eb2e9528ff497c87d71456378f500acafd5ed790d82d258f745effa6574c79` |
| TK614 admin-auditledger | 20261108120000 | **20261108223504** | `3fdd2d58bbe733cad4cca09c20272843126779160ec1f3546d12b7059c90db89` |

## Uitgevoerde code-only correctie

- Vijf bestaande SQL-bestanden met `git mv` naar de echte live versienummers hernoemd. SQL-inhoud is **byte-exact behouden**.
- Alle verwijzingen binnen core, tools en docs naar de oude versienummers aangepast, met behoud van hun overige inhoud.
- Nieuwe regressietest `core/tk614MigrationLedgerAlignment.test.js` controleert alle vijf filenames, de vijf SQL-hashes/tekstlengten en weigert oude verwijzingen in core/tools/docs.
- Geen SQL toegepast, geen wijziging in `supabase_migrations.schema_migrations`, geen `migration repair`, geen extra grants, geen configuratie-/RLS-wijziging en geen APK.

## Verplichte toekomstige controle

De wijziging wordt pas na onafhankelijke code- en GitHub-gates als reviewkandidaat beschouwd. Voor een latere merge/deploy moet de daadwerkelijke deploybranch opnieuw met de LIVE migratiehistorie worden vergeleken. Bij enige onbekende versie of SQL-verschil: **stop**, niet automatisch repareren of migreren.

Dit verhelpt uitsluitend het risico van *versie-identiteit*. **Fase B ACTIVATE van de 226 oorspronkelijke oefeningen blijft een apart, door de eigenaar te ondertekenen besluit**, met zes evidence-gates, verse live fingerprint en verifieerbare A/B Auth/RLS-/Android-/rollbacktesten.
