# DOCUMENTATION_GOVERNANCE.md

> **Kernregel, zonder uitzondering: een historische sectie in een source-of-truth-document mag nooit de actuele status overschrijven.** Elk document dat zowel actuele als historische informatie bevat, moet een expliciete "CURRENT STATUS"-kop bovenaan hebben; alles daaronder dat over het verleden gaat, staat gelabeld als "HISTORICAL RECORD" en bevat nooit een aanbeveling die nog als open actie gelezen kan worden — historische aanbevelingen zijn expliciet gemarkeerd als "HISTORICAL RECOMMENDATION — IMPLEMENTED via ...". Dit is toegepast op `SECURITY_FINDINGS.md`, `TEST_VERIFICATION.md` en `GAP_ANALYSIS_V2.md`.

## Autoriteitsmodel: productstrategie vs. technische werkelijkheid (vastgesteld met Roadmap 2.0 v1.1)

| Laag | Bron | Leidend voor |
|---|---|---|
| **Productstrategie** | `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` (Roadmap 2.0 v1.1, Product Owner + ChatGPT-architectuur) | Producttracks, gewenste richting, fasering, strategische prioriteiten, nieuwe epics, gewenste mastersprint-sequencing, wat bewust deferred wordt |
| **Technische werkelijkheid** | Repository + DB-bewijs + tests (Claude) | Wat al bestaat, maturity, IMPLEMENTED/TESTED/INTEGRATED/VALIDATED/CLOSED, technische dependencies, bestaande IDs, feitelijke architectuur, bestaande tests, technische beperkingen |

**Regel:** technische cross-audit mag status, effort, dependency en technisch risico betwisten met bewijs (gemarkeerd als "TECHNICAL CONFLICT"), maar mag productprioriteit of productrichting niet stilzwijgend terugdraaien. Een bestaand DB-schema of benchmark-pariteit is op zichzelf geen reden voor vroege productbouw — dat is een productbeslissing, geen technisch feit (zie de Commercial-UI-herfasering P1/F2→P2/F12 als precedent).

Vastgesteld na controle van de bestaande documentstructuur (niet blind het voorstel uit de sprintopdracht overgenomen — hieronder per rij bevestigd of aangepast).

| Domein | Leidende bron | Bevestigd/aangepast |
|---|---|---|
| Actual implementation | code + DB + tests (wint altijd bij conflict, ook boven CURRENT_STATE zelf) | Bevestigd |
| Current state | `docs/00_Project_Management/CURRENT_STATE.md` | Bevestigd, nu met expliciete roadmappositie (F0 CLOSED, F1 CURRENT) |
| Capabilities | `docs/CAPABILITY_REGISTRY.md` | **Aangepast:** dit bestaat nu als eigen, gecommit repo-document (was tot deze sprint alleen sessie-output) |
| Open gaps | `docs/GAP_ANALYSIS_V2.md` | **Aangepast:** dit is nu het enige, volledig herbouwde gap-document — geen apart "v1"-bestand meer, geen tegenstrijdige P0-tellingen |
| Future sequencing | `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` + `docs/ROADMAP_INDEX.json` | Bevestigd. `docs/CURRENT_ROADMAP.md` blijft de bron voor de *kortetermijn* POST-V1-status; de Master Roadmap is het *meerjarige* kader — beide blijven bestaan, met andere scope |
| Decisions | `docs/00_Project_Management/DECISION_LOG.md` | Bevestigd |
| Scientific calculations | `core/scientificEvidence.js` (code) is de facto leidend; er bestaat nog geen apart `CALCULATION_EVIDENCE_SPEC.md` | Ongewijzigd t.o.v. vorige versie — blijft een open item |
| Benchmark | `docs/BENCHMARK_REGISTRY.md` | Bevestigd |
| History | root `CHANGELOG.md` (volledig) + `docs/RELEASE_HISTORY.md` (compacte index) | Bevestigd |
| UX rules | `docs/Handbook/*` + `docs/Brand/BRAND_IDENTITY.md` | Bevestigd, met erkende drift (zie `docs/HANDBOOK_UPDATE_PLAN.md`) — code leidend waar Handbook zwijgt over iets dat al bestaat, Handbook leidend waar het wél iets specificeert |
| Security-status | `docs/SECURITY_FINDINGS.md` | **Aangepast:** dit bestaat nu als eigen, gecommit repo-document, herstructureerd met CURRENT STATUS/HISTORICAL RECORD-scheiding |
| Test-status | `docs/TEST_VERIFICATION.md` | **Aangepast:** idem, nu gecommit en herstructureerd |
| Documentatie-inventaris/conflicten | `DOCUMENTATION_INVENTORY.md` (sessie-output) + `docs/DOCUMENTATION_CONFLICT_REPORT.md` | Ongewijzigd |
| Consistentie tussen documenten | `tools/check-doc-consistency.js` | **Nieuw deze sprint** — zie sectie hieronder |

## Automatische consistentiecontrole
`tools/check-doc-consistency.js` controleert (read-only, geen productwijziging):
- `docs/ROADMAP_INDEX.json` is geldig JSON;
- geen dubbele capability-IDs binnen de roadmap-index;
- elke `dependencies`-referentie in de roadmap-index verwijst naar een bestaand ID binnen diezelfde index;
- geen roadmap-index-item met `status: "CLOSED"` dat tegelijk in `docs/GAP_ANALYSIS_V2.md` nog als open P0/P1/P2/P3 gerubriceerd staat (tekstuele heuristiek, geen garantie — zie beperkingen in het script zelf).

Dit script is bewust klein gehouden (geen crossreferentie-parsing van alle Markdown-bestanden, dat zou fragiel worden voor een tekstformaat dat voortdurend wijzigt) — zie de toelichting in het scriptbestand zelf voor de precieze grenzen.

## Onderhoudsregel voor point-in-time-documenten
`docs/DATABASE_STATUS.md`, `docs/PLAY_STORE_READINESS.md`, `docs/RELEASE_READINESS.md` zijn per ontwerp **snapshots op een moment** (ze bevatten een expliciete datum in de titel/kop). Voorstel: bij een volgende relevante gebeurtenis (nieuwe Play Store-actie, grote DB-migratieronde) een NIEUW gedateerd document toevoegen in plaats van het oude te overschrijven — zo blijft de geschiedenis van audits zelf ook navolgbaar. Dit is een voorstel, geen vastgestelde regel; ter beoordeling.

## Wat deze sprint NIET heeft vastgesteld
- Geen formele policy over hoe vaak `CURRENT_STATE.md` mag/moet groeien vóór een uitsplitsing naar `RELEASE_HISTORY.md` nodig is.
- Geen besluit over of project-knowledge (de ~150 externe sprintrapporten die niet in de repo staan) ooit alsnog naar de repo gemigreerd moeten worden.
- Geen `CALCULATION_EVIDENCE_SPEC.md` — blijft een placeholder-verwijzing naar de code zelf.

