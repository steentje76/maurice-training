# Database Reality Map — App-breed

Bron: live Supabase `list_tables` (project `mhfxhzkdmgkaplicdszg`), alle
tabellen, alle met RLS aan (`rls_enabled: true`, universeel bevestigd --
geen enkele publieke tabel zonder RLS gevonden). Rij-aantallen zijn een
momentopname.

**Harde regel toegepast overal:** tabel bestaat + 0 rijen = géén
functioneel, gebruikt product, ongeacht hoe compleet het schema is.

## TRAINING CORE / EXERCISE INTELLIGENCE -- FULL STACK, ECHT GEBRUIKT

| Tabel | Rijen | Interpretatie |
|---|---|---|
| exercises | 103 | echte, gebruikte oefeningen-catalogus |
| sessions | 118 | echte trainingssessies |
| training_instances | 150 | echte, geplande/uitgevoerde instanties |
| program_blocks | 32 | echt gebruikt |
| program_block_exercises | 161 | echt gebruikt |
| training_exercises | 17 | echt gebruikt |
| custom_trainings | 9 | echt gebruikt |
| custom_training_exercises | 66 | echt gebruikt |
| vaste_trainingen | 5 | echt gebruikt |
| exercise_favorites | 1 | minimaal gebruikt, maar functioneel |
| exercise_goals | 21 | echt gebruikt |
| goals | 5 | echt gebruikt |

**Classificatie: FULL STACK, met echte productiedata.** Dit is verreweg
het meest volwassen domein in de database.

## ENDURANCE / MULTISPORT -- PARTIAL

| Tabel | Rijen |
|---|---|
| activities | 3 |
| race_segments | 3 |
| activity_laps | 0 |
| athlete_endurance_profile | 0 |

**Classificatie: PARTIAL.** Schema voor HYROX/triathlon-brick-segmenten
bestaat en heeft data (3 rijen), maar lap-detail en een apart
duurprofiel voor de sporter hebben nul rijen -- de basisregistratie werkt,
de diepere analytics-laag lijkt niet (volledig) in gebruik of niet
bereikt door de huidige UI-flows.

## RECOVERY / HEALTH / BODY -- FULL STACK, ECHT GEBRUIKT

| Tabel | Rijen |
|---|---|
| hrv_log | 73 |
| hrv_log_archive_v500 | 8 |
| weight_log | 44 |
| body_comp | 4 |
| athlete_conditions | 9 |
| checkin_conditions | 29 |

**Classificatie: FULL STACK**, bevestigd al eerder via de volledige
functionele keten-audit tijdens de Inzicht v0.1-preservation-audit
(anatomisch poppetje, herstel/belasting).

## WOMEN'S PERFORMANCE -- PARTIAL, MINIMAAL GEBRUIKT

| Tabel | Rijen |
|---|---|
| cycle_periods | 1 |
| cycle_symptom_logs | 2 |

**Classificatie: PARTIAL.** Schema en RLS bestaan, functionele keten is
eerder bevestigd (renderLichaamCyclus e.d.), maar met slechts 1-2 rijen
is dit nauwelijks als "in gebruik" te kwalificeren -- eerder net getest
dan een volwassen, dagelijks gebruikte capability.

## NUTRITION -- zie aparte, eerdere audit (PR #234)

nutrition_entries: 0 rijen. Geen wijziging t.o.v. eerdere bevinding.

## SAMEN / SOCIAL -- zie aparte, eerdere audit (PR #234), + aanvulling hier

Alle social_*-tabellen op social_groups (1) en social_group_memberships
(1) na: 0 rijen. Geen wijziging.

## TEAM / GYM / CLUB -- BACKEND READY, MINIMAAL GEBRUIKT

| Tabel | Rijen |
|---|---|
| organizations | 1 |
| gyms | 1 |
| memberships | 4 |
| teams | 0 |
| training_groups | 0 |
| locations | 0 |
| team_events | 0 |
| event_attendance | 0 |
| event_responsibilities | 0 |

**Classificatie: BACKEND READY / PARTIAL.** Eén echte organisatie/gym
met 4 memberships bestaat (dit is vermoedelijk de ontwikkelaars-/
testomgeving zelf, ART CrossFit). De nieuwere, canonieke Team/Location/
Event-laag (MS-F11) heeft nul rijen -- gebouwd, nooit gebruikt.

## COACH (HUMAN) -- ARCHITECTURE ONLY

| Tabel | Rijen |
|---|---|
| coach_athlete_relationships | 0 |
| coach_access_scopes | 0 |
| coach_program_assignments | 0 |
| coach_program_templates | 0 |

**Classificatie: ARCHITECTURE ONLY.** Volledig, doordacht schema
(inclusief het bewuste, server-side default-privacy-gedrag voor
RECOVERY_HEALTH/WOMENS_PERFORMANCE), maar geen enkele rij ooit
aangemaakt. Geen enkele echte coach-athlete-relatie bestaat.

## AI COACH -- BACKEND READY

| Tabel | Rijen |
|---|---|
| chat_history | 77 |
| ai_usage | 0 |
| program_regeneration_log | 0 |

**Classificatie: BACKEND READY tot FULL STACK voor de kern-chatfunctie**
(77 echte gesprekken), maar het aparte gebruiks-tellingssysteem
(ai_usage, service-role-only) heeft nul rijen -- ofwel niet actief
geschreven, ofwel de functionaliteit die dit zou moeten vullen is niet
(meer) actief.

## DEVICES / WEARABLES -- PARTIAL

| Tabel | Rijen |
|---|---|
| wearable_connections | 1 |
| wearable_oauth_state | 1 |
| external_connections | 0 |
| external_records | 0 |
| integration_sync | 0 |

**Classificatie: PARTIAL.** Eén echte wearable-koppeling bestaat, maar de
generieke external_connections/records/integration_sync-laag (die
mogelijk Concept2/overige devices moet dekken) is volledig leeg.

## COMMERCIAL / ENTITLEMENTS -- ARCHITECTURE ONLY qua transacties

| Tabel | Rijen |
|---|---|
| plans | 4 |
| features | 5 |
| plan_features | 17 |
| plan_feature_quota | 4 |
| usage_log | 0 |
| credit_packs | 0 |
| user_credit_purchases | 0 |
| discounts | 0 |
| billing_events | 0 |

**Classificatie: ARCHITECTURE ONLY voor daadwerkelijke commerciële
transacties.** Het plan/feature-model zelf is volledig ingericht (4
plannen, 5 features, quota gekoppeld), maar er heeft nooit een echte
aankoop, credit-purchase, korting of billing-event plaatsgevonden.
Entitlement-logica mag dus aantoonbaar bestaan; betaalstroom-realiteit is
onbevestigd.

## RESEARCH -- PARTIAL

| Tabel | Rijen |
|---|---|
| research_consents | 1 |
| research_cohort_access_log | 0 |

## PLATFORM / OBSERVABILITY -- MINIMAAL

| Tabel | Rijen |
|---|---|
| client_telemetry_events | 3 |
| support_access_log | 0 |
| gym_audit_log | 1 |
| common_data_points | 0 |

**Classificatie: ARCHITECTURE ONLY tot PARTIAL.** Telemetrie-schema
bestaat, vrijwel geen events gelogd -- consistent met de eerder
gedocumenteerde MS-TELEMETRY-01-status (gepland, niet volledig actief).

## LEGACY / MIGRATIE-TABELLEN

`bak_p_*`-tabellen (7 stuks, elk met data) zijn expliciet
backup/migratie-tabellen (naamconventie), geen actieve productcapaciteit.
Niet verder geclassificeerd; aanwezigheid zelf is geen risico zolang ze
uitsluitend read-only backup-doeleinden dienen -- dit is NIET in deze
sessie geverifieerd op read/write-actief gebruik en blijft een open
controlepunt.

`training_programs`, `program_weeks`, `program_sessions`, `assignments`,
`seasons`, `macrocycles`, `mesocycles`, `microcycles`: allemaal 0 rijen.
Dit is een volledig, gelaagd periodiseringsmodel (macro/meso/microcyclus)
dat **volledig ongebruikt** is -- een aanzienlijke architecturale
investering zonder enige runtime-realisatie.

## Samenvattende classificatie (tabel-niveau, niet UI-niveau)

| Domein | Classificatie |
|---|---|
| Training Core | FULL STACK |
| Exercise Intelligence | FULL STACK |
| Recovery/Health/Body | FULL STACK |
| Endurance/Multisport | PARTIAL |
| Women's Performance | PARTIAL |
| Nutrition | PARTIAL (logger) / MISSING (productdatabase) |
| Samen/Social | BACKEND READY (deels) / MISSING (messaging) |
| Team/Gym/Club (canoniek, MS-F11) | ARCHITECTURE ONLY |
| Team/Gym/Club (legacy, gyms/memberships) | BACKEND READY, minimaal gebruikt |
| Human Coach | ARCHITECTURE ONLY |
| AI Coach | FULL STACK (chat) / ARCHITECTURE ONLY (usage tracking) |
| Devices/Wearables | PARTIAL |
| Commercial/Entitlements | ARCHITECTURE ONLY (transacties) |
| Research | PARTIAL |
| Periodisering (macro/meso/microcyclus) | ARCHITECTURE ONLY, ongebruikt |
| Platform/Observability | ARCHITECTURE ONLY |
