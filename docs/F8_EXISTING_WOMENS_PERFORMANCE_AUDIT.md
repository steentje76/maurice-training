# F8_EXISTING_WOMENS_PERFORMANCE_AUDIT.md — Trainingskompas

**Doel:** repo-brede audit van alle bestaande Women's Performance-gerelateerde code/schema/documentatie, vóór enige nieuwe F8-implementatie.

## Kernbevinding: Cycle & Symptom Context bestaat al, grotendeels correct en veilig geimplementeerd
| Onderdeel | Status | Bevinding |
|---|---|---|
| core/cycle.js (CycleCore, cycle.v1) | ACTUAL RUNTIME | Puur/deterministisch. Hergebruikt de bestaande, protected CalcCore.cyclusDagFactor(fase) en het al goedgekeurde vocabulaire (hrv_log.cyclus_fase: menstruatie/folliculair/ovulatie/luteaal). Geschatte cyclusdag/fase uit RAW periode-start/einddatums. Voorspellingen alleen bij >=2 volledige cycli, anders expliciet null. |
| core/cycleTraining.js (CycleTrainingCore) | ACTUAL RUNTIME | Training-versus-cyclus-overlays. |
| cycle_periods-tabel | ACTUAL SCHEMA, LIVE GEVERIFIEERD | RLS aan, eigen-data-alleen-policy, geverifieerd via live database-query. Uitsluitend RAW start/einddatum. |
| cycle_symptom_logs-tabel | ACTUAL SCHEMA, LIVE GEVERIFIEERD | RLS aan, eigen-data-alleen-policy, live geverifieerd. Documentatiegap gevonden: geen bijbehorend migratiebestand in de repo-root -- de tabel bestaat correct en veilig op de live database, maar het aanmaak-script is nooit gecommit. Vastgelegd als niet-blokkerend gap. |
| UI (Lichaam-scherm) | ACTUAL RUNTIME | Expliciet optioneel, volledig verwijderbaar. |
| AI-coach-integratie | NIET GEIMPLEMENTEERD | core/coaching.js bevat GEEN enkele cyclus-referentie. De cyclus-context wordt vandaag NIET naar de AI-coach doorgestuurd. |
| Contraceptie | GEEN IMPLEMENTATIE | Uitsluitend expliciete uitsluitingsverklaringen. |
| Zwangerschap | GEEN IMPLEMENTATIE | Uitsluitend expliciete uitsluitingsverklaringen. |
| Postpartum | GEEN IMPLEMENTATIE | Geen enkele treffer. |
| Perimenopauze/menopauze | GEEN IMPLEMENTATIE | Geen enkele treffer. |
| Bekkenbodem | GEEN IMPLEMENTATIE | Geen enkele treffer. |
| AI-boundary (hormoon-causale taal) | GEEN SCHENDING GEVONDEN | Repo-brede zoekactie: 0 treffers. |

## Actueel wetenschappelijk onderzoek (29 augustus 2026)
Cycle-fase-effecten op prestatie: een 2023-umbrella-review concludeert het is "premature to conclude that short-term fluctuations in reproductive hormones appreciably influence acute exercise performance." Recentere reviews (2025-2026) bevestigen: de meerderheid van studies vindt geen MC-fase-effecten op uithoudingsvermogen/vermogen/kracht, met hoge heterogeniteit en methodologische zwaktes. Conclusie: geen bewijs dat harde, universele cycle-phase-based trainingsvoorschriften rechtvaardigt.

Zwangerschap: ACOG (Committee Opinion 804, herzien november 2025) beveelt algemene richtlijnen aan maar benadrukt dat individuele beslissingen "individualized" moeten zijn en bij comorbiditeiten specialistische consultatie vereisen. Conclusie: een trainings-app kan geen medische goedkeuring vervangen -- automatische, trimester-gebaseerde belastingsregels zijn niet verantwoord.

## Bestaande architectuur bevestigt de juiste aanpak
core/cycle.js volgt exact het conservatieve patroon dat het onderzoek rechtvaardigt: context/schatting, nooit een harde voorschrift-regel, nooit een diagnose- of anticonceptie-/zwangerschapsclaim.
