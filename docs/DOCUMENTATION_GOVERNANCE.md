# DOCUMENTATION_GOVERNANCE.md

Vastgesteld na controle van de bestaande documentstructuur (niet blind het voorstel uit de sprintopdracht overgenomen — hieronder per rij bevestigd of aangepast).

| Domein | Leidende bron | Bevestigd/aangepast |
|---|---|---|
| Product intent | `docs/01_Product/Product_Book.md` + `docs/00_Project_Management/DECISION_LOG.md` | Bevestigd — beide bestaan al en worden actief bijgehouden (DECISION_LOG tot DEC-036, 27 aug) |
| Huidige realiteit | `docs/00_Project_Management/CURRENT_STATE.md` + code + DB + tests | Bevestigd, met aanvulling: bij twijfel wint code/DB/test altijd van elk document, inclusief CURRENT_STATE zelf |
| Toekomstplan | `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` + `docs/ROADMAP_INDEX.json` | **Aangepast t.o.v. voorstel:** `docs/CURRENT_ROADMAP.md` blijft de bron voor de *kortetermijn* POST-V1-status (actief tot in detail bijgehouden, laatst 26 aug); de nieuwe Master Roadmap is het *meerjarige* kader. Beide blijven bestaan, met een expliciete verwijzing tussen beide. |
| Capabilities | `CAPABILITY_REGISTRY.md` (sessie-output, nog niet in repo gecommit als los bestand — zie Open Items) | Bevestigd qua rol; **actie nodig**: dit document formeel in de repo opnemen (nu alleen als sessie-artefact aanwezig) |
| Calculations/evidence | `core/scientificEvidence.js` (code) is de facto leidend; er bestaat nog geen apart `CALCULATION_EVIDENCE_SPEC.md` in de repo | **Aangepast:** tot dat document bestaat, is de module zelf + de coverage-audit in `TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md` de tijdelijke bron |
| Benchmark | `docs/BENCHMARK_REGISTRY.md` | Bevestigd, nieuw aangemaakt deze sprint |
| Geschiedenis | root `CHANGELOG.md` (volledig, doorlopend) + `docs/RELEASE_HISTORY.md` (compacte index, nieuw) | Bevestigd — `docs/RELEASE_CHANGELOG.md` (point-in-time v4.48.0) blijft HISTORICAL, niet leidend |
| UI/UX-regels | `docs/Handbook/*` + `docs/Brand/BRAND_IDENTITY.md` | Bevestigd, met de kanttekening dat het Handbook op dit moment een erkende drift heeft (zie `HANDBOOK_UPDATE_PLAN.md`) — tot bijgewerkt geldt: **code is leidend waar het Handbook zwijgt over iets dat al bestaat; het Handbook blijft leidend waar het wél iets specificeert.** |
| Procesregels | `docs/DEVELOPMENT_CONTRACT.md` | Bevestigd, nog actueel (17 aug, procesdocument, geen versiegebonden feiten) |
| Documentatie-inventaris/conflicten | `DOCUMENTATION_INVENTORY.md` + `docs/DOCUMENTATION_CONFLICT_REPORT.md` | Nieuw, beide deze sprintserie |

## Onderhoudsregel voor point-in-time-documenten
`docs/DATABASE_STATUS.md`, `docs/PLAY_STORE_READINESS.md`, `docs/RELEASE_READINESS.md` zijn per ontwerp **snapshots op een moment** (ze bevatten een expliciete datum in de titel/kop). Voorstel: bij een volgende relevante gebeurtenis (nieuwe Play Store-actie, grote DB-migratieronde) een NIEUW gedateerd document toevoegen in plaats van het oude te overschrijven — zo blijft de geschiedenis van audits zelf ook navolgbaar. Dit is een voorstel, geen vastgestelde regel; ter beoordeling.

## Wat deze sprint NIET heeft vastgesteld
- Geen formele policy over hoe vaak `CURRENT_STATE.md` mag/moet groeien vóór een uitsplitsing naar `RELEASE_HISTORY.md` nodig is (het document bevat nu circa 10 releasevermeldingen; een concreet omslagpunt is niet gedefinieerd).
- Geen besluit over of project-knowledge (de ~150 externe sprintrapporten die niet in de repo staan) ooit alsnog naar de repo gemigreerd moeten worden — dit blijft een risico (zie `DOCUMENTATION_INVENTORY.md` sectie B).
