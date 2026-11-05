# Schrijf-aanroepen index.html: inventarisatie en classificatie

**Basis:** geklasseerd tegen HEAD `7ee0828` (branch `review/claude-p0-reaccept-20261019`). De opdracht noemde `429d6c0`; tijdens de audit schoof de branch op (`fb7cff0`, `9994705`, `1e610e8`, `1dfe06c`, `41ca606`, `7ee0828`). Alle 244 aanroepregels komen 1-op-1 overeen tussen beide versies. **Regel** = HEAD 7ee0828. **Regelnummers in de kolom Bewijs verwijzen naar 429d6c0** (kolom `line_429d6c0` in matrix.json); vanaf ca. regel 9200 is HEAD 13 tot 41 regels hoger.

**Scope:** alle aanroepen van sbPostQ, sbPostQOpgeslagen, sbPatchQ, sbDelQ, sbRpcQ, sbPost, sbPostReturning, sbPatch, sbDel, sbUpsert, sbRpc, upsertWeightLog, upsertHrvLog en tkImportHrvRows, plus directe `fetch` POST/PATCH/DELETE naar `/rest/v1/` of `/.netlify/functions/`. Daarnaast vijf wrapper-aanroepen (writeSessionRow, writeRaceSegmentRow) die P0/P1-relevant zijn. Niet opgenomen: auth- en storage-endpoints, een commentaarregel (11335) en de interne aanroep in sbPostQOpgeslagen (9338). Totaal: 247 rijen.

## Status na herstel (bijgewerkt 19-10-2026, P1-rest)

De classificatie hieronder (kolommen Klasse, Prio en Bewijs) is de baseline van 429d6c0/7ee0828 en is niet aangepast. Elke rij heeft in `TK_WRITE_CALLER_MATRIX_20261019.json` de velden `status` (`opgelost` / `deels` / `open` / `geen defect`), `fixedIn` (commits), `rest` en zo nodig `herclassificatie`. De tellingen en de tabel "Status per HEAD" hieronder komen rechtstreeks uit die JSON. Ze zijn reproduceerbaar met:

```
node tools/audit-matrix-status.js        # JSON: tellingen, koppeling aan de huidige index.html, onbekende aanroepen
node tools/audit-matrix-status.js --md   # de tabellen in dit document
```

| Herstel | Commit | PR |
|---|---|---|
| P0: eerste upload eigen trainingen, opnieuw genereren van weken | `bb354ad` | #560 |
| P0: lopende training, Guided of HYROX na een eigenaarwissel | `45f5e33` | #560 |
| Imports gebonden aan de startende gebruiker | `1e610e8` | #560 |
| activities en activity_laps idempotent | `9994705` | #560 |
| P1: eerlijke meldingen na een mislukte write (10 schermen) | `7b19a35` | #562 |
| Directe REST-writes en flows met meerdere awaits gebonden aan de startende gebruiker | `22bfd90` | deze PR |
| Idempotency: exercises (409 → teruglezen), exercise_goals (`on_conflict`), programma opslaan hervatbaar, extra oefeningen zonder dubbel, duursport na een verloren antwoord | `77aa953` | deze PR |
| Time-outs voor sbPatchQ, sbDelQ en sbRpcQ; status "onzeker"; geen automatische tweede niet-idempotente insert; extra tabellen met client-id | `c6b15e1` | deze PR |
| Reviewbevindingen: volgorde per rij, replay van een insert is een no-op, verificatie die bij twijfel weigert, symptomen niet overschrijven, 502/504 zijn onzeker, "Toch versturen" | `83fcc6d` | deze PR |

**P1: 20 van 20 opgelost.** Herclassificaties: `deleteVasteTraining` bleek ook ACCOUNT-RISK te hebben (`training_ref=A` bestaat bij elke gebruiker) en `sendMsg` ook (het AI-antwoord van A kwam na een wissel in de chatgeschiedenis van B). Beide zijn hersteld in `22bfd90`.

## Telling van de classificatie (baseline, ongewijzigd)

| Klasse | Aantal |
|---|---|
| SAFE | 193 |
| FALSE-SUCCESS | 40 |
| DATA-LOSS | 6 |
| ACCOUNT-RISK | 4 |
| DUPLICATE-RISK | 4 |
| UNKNOWN | 0 |

| Prio | Aantal |
|---|---|
| P0 | 8 |
| P1 | 20 |
| P2 | 49 |
| P3 | 170 |

Secundaire labels: ACCOUNT-RISK 13, DATA-LOSS 4, DUPLICATE-RISK 19, FALSE-SUCCESS 3.

## Matrix (gesorteerd op prio, dan regel)

| Regel | Functie | Helper | Tabel/RPC | Domein | Klasse | Prio | Bewijs |
|---|---|---|---|---|---|---|---|
| 8715 | syncCustomTrainingsFromSupabase | sbPost | custom_trainings | training/sets/history | DATA-LOSS / ACCOUNT-RISK | P0 | 8711 sbPost custom_trainings genegeerd; training niet als onbevestigd gemarkeerd. Volgende sync: rows niet leeg → 8670-8690 alleen onbevestigde lokale trainingen behouden → mislukte training verdwijnt uit customTrainings/localStorage. Randgeval: alleen als server leeg is. Lus zonder identiteitsbinding (trigger set_user_id_from_auth op custom_trainings) |
| 8718 | syncCustomTrainingsFromSupabase | sbPost | custom_training_exercises | training/sets/history | DATA-LOSS / DUPLICATE-RISK | P0 | 8714 sbPost custom_training_exercises zonder id; bij gedeeltelijke fout overschrijft volgende sync de lokale oefeningenlijst met de onvolledige serverlijst |
| 19205 | heergenereerResterendeWeken | sbDel | program_block_exercises | agenda/calendar | DATA-LOSS / ACCOUNT-RISK | P0 | 19171-19174 resterende blokken worden VÓÓR de AI-generatie verwijderd; 19198/19200/19202 break bij AI-fout → 19204 if(!newBlocks.length) return: geplande trainingen weg zonder vervanging (audit-log 19162 kan ook stil gefaald zijn). Bij gedeeltelijke AI-respons ontbreken weken |
| 19206 | heergenereerResterendeWeken | sbDel | program_blocks | agenda/calendar | DATA-LOSS / ACCOUNT-RISK | P0 | idem 19172 |
| 24642 | finishSession | writeSessionRow→sbPostQ | sessions | training/sets/history | ACCOUNT-RISK | P0 | Afhandeling zelf correct. Maar sessionLog/curT/activeInstanceId zijn niet aan een eigenaar gebonden: authSignOut (HEAD 7899-7907) en resetPersonalCacheIfNewDeviceOwner (HEAD 35825-35864) wissen localStorage, niet curT/sessionLog; Home toont "Lopende training" zolang curT gezet is (HEAD 39030-39035); ensureValidSession (HEAD 7793-7795, via visibilitychange 11956) wisselt bij terugkeer stil naar de sessie die een andere tab opsloeg. Afronden schrijft A's sets met B als eigenaar; trigger set_user_id_from_auth maakt ze van B. Statisch afgeleid, niet runtime gereproduceerd |
| 24660 | finishSession | writeSessionRow→sbPostQ | sessions | training/sets/history | ACCOUNT-RISK | P0 | idem 24642 (krachtsets) |
| 36181 | hyroxFinishSegment | writeRaceSegmentRow→sbPostQ | race_segments | training/sets/history | ACCOUNT-RISK | P0 | hyroxActive leeft in geheugen (HEAD 36028) en wordt bij uitloggen/eigenaarwissel niet op null gezet; race_segments heeft trigger set_user_id_from_auth + RLS user_id=auth.uid() → segment met A's instanceId wordt eigendom van B |
| 38567 | GW.persistToSessions | writeSessionRow→sbPostQ | sessions | training/sets/history | ACCOUNT-RISK | P0 | GW st.active in geheugen niet eigenaargebonden; vooral cross-tab pad (ensureValidSession wisselt stil). Same-tab pad onzeker: resume() leest het gewiste tk_gw_active |
| 8035 | upsertExerciseGoalField | sbPatchQ | exercise_goals | training/sets/history | FALSE-SUCCESS | P1 | 8031-8032: return sbPatchQ genegeerd, geheugen bijgewerkt; saveStartingStrength 31160-31164 telt n++ en toast "…opgeslagen"; saveOneRM 21688 geen melding; PR-update in finishSession 24635 stil |
| 8042 | upsertExerciseGoalField | sbPostQ | exercise_goals | training/sets/history | FALSE-SUCCESS / DUPLICATE-RISK | P1 | 8038-8039: mislukking alleen als _alleenGeheugen; aanroeper saveStartingStrength 31164 toont succes. exercise_goals zonder client-id: replay na verloren antwoord → dubbele rij of 409 |
| 8492 | saveVasteTrainingName | sbPatch | vaste_trainingen | training/sets/history | FALSE-SUCCESS / DATA-LOSS | P1 | 8488 sbPatch genegeerd → 8497 closeModal, 8500 toast("Opgeslagen"); niet gequeued, naam weg bij fout/offline |
| 8496 | saveVasteTrainingName | sbPost | vaste_trainingen | training/sets/history | FALSE-SUCCESS / DATA-LOSS | P1 | 8492 sbPost genegeerd → 8497 closeModal, 8500 toast("Opgeslagen"); vtMetaSave lokaal, training bestaat niet op server |
| 8509 | deleteVasteTraining | sbDel | training_exercises | training/sets/history | FALSE-SUCCESS | P1 | 8505-8506 sbDel genegeerd → 8510 toast("Verwijderd"); deelresultaat mogelijk (oefeningen weg, training niet) |
| 8510 | deleteVasteTraining | sbDel | vaste_trainingen | training/sets/history | FALSE-SUCCESS | P1 | idem 8505; 8510 toast("Verwijderd") |
| 12967 | calendarFeedRevoke | sbPatchQ | calendar_feed_tokens | agenda/calendar | FALSE-SUCCESS | P1 | 12934 sbPatchQ genegeerd → 12935 cache gewist, 12936 toast("Agenda-koppeling ingetrokken"); bij falen blijft de feed-link actief (privacy) |
| 15023 | afrondenRunningActivity | sbPostQ | activities | training/sets/history | DUPLICATE-RISK | P1 | 429d6c0: geen client-id → replay dubbel. HEAD: client-id via IDEMPOTENT-lijst. Rest: geen busy-guard → dubbel tikken = 2 activiteiten (14971-14993) — **opgelost in 9994705 (activities client-id / TK_ON_CONFLICT activity_laps)** |
| 18316 | saveLosOefening | sbPostQ | exercises | training/sets/history | DUPLICATE-RISK | P1 | exercises niet idempotent (geen ignoreDuplicates, niet in lijst): replay na verloren antwoord → 409 → flush markeert _exNietGelukt → bijbehorende sessies (18355) blijven voorgoed in wachtrij |
| 18902 | opslaanProgramma | sbPostReturning | programs | training/sets/history | DATA-LOSS / ACCOUNT-RISK | P1 | 18863 window._progConcept=null vóór de writes; 18871 bij falen alleen toast → AI-concept weg (geen meetdata; regenereren kost AI-quota). Niet gequeued. Lus van niet-gequeuede writes; programs/program_blocks hebben set_user_id-trigger |
| 19152 | deleteProgramma | sbDel | program_block_exercises | training/sets/history | FALSE-SUCCESS | P1 | 19119-19121 sbDel genegeerd → 19123 toast("Programma verwijderd"); deelverwijdering mogelijk |
| 19153 | deleteProgramma | sbDel | program_blocks | training/sets/history | FALSE-SUCCESS | P1 | idem |
| 19154 | deleteProgramma | sbDel | programs | training/sets/history | FALSE-SUCCESS | P1 | idem |
| 19241 | heergenereerResterendeWeken | sbPostReturning | program_blocks | agenda/calendar | FALSE-SUCCESS / ACCOUNT-RISK | P1 | 19210 continue bij falen; 19216 toast(newBlocks.length+" trainingen her-gegenereerd") telt gegenereerd, niet opgeslagen. Lange lus met AI-awaits, SB_H per write |
| 19246 | heergenereerResterendeWeken | sbPost | program_block_exercises | agenda/calendar | FALSE-SUCCESS / DUPLICATE-RISK | P1 | 19213 sbPost genegeerd; 19216 succes-toast |
| 19413 | saveBlockExercise | sbPatch | program_block_exercises | training/sets/history | FALSE-SUCCESS / DATA-LOSS | P1 | 19380 sbPatch genegeerd → 19382 closeModal, 19384 toast("Opgeslagen"); ingevulde sets/reps/RPE weg (modal herlaadt uit rij) |
| 19422 | deleteBlockExercise | sbDel | program_block_exercises | training/sets/history | FALSE-SUCCESS | P1 | 19389 sbDel genegeerd → 19391 closeModal, 19393 toast("Oefening verwijderd") |
| 32170 | permanentlyAddExtras | sbUpsert | training_exercises | training/sets/history | FALSE-SUCCESS / ACCOUNT-RISK | P1 | 32129 sbUpsert-lus genegeerd → 32155 closeModal, 32156 toast("Permanent toegevoegd aan training") |
| 32192 | permanentlyAddExtras | sbPost | program_block_exercises | training/sets/history | FALSE-SUCCESS / DUPLICATE-RISK | P1 | 32151 sbPost-lus genegeerd (geen client-id) → 32156 toast |
| 37897 | deleteWorkout | sbDelQ | custom_trainings | training/sets/history | FALSE-SUCCESS | P1 | 37853-37856 lokaal verwijderd + markering weg, sbDelQ niet ge-await; aanroeper 38172 toast("Verwijderd"). Bij falen komt training bij volgende sync terug |
| 7629 | tkConcept2Import | writeSessionRow→sbPostQ | sessions | wearable/Concept2 | SAFE / DUPLICATE-RISK | P2 | Geen UI-aanroeper. 429d6c0: FALSE-SUCCESS + ACCOUNT-RISK. HEAD: c2uid-check per iteratie. Rest: dedupe alleen op [c2:id] in serversessies → gequeuede rijen niet gezien → herhaalde import offline dupliceert — **opgelost in 1e610e8 (identiteitsbinding import)** |
| 8295 | loadTrainCfg | sbUpsert | training_exercises | training/sets/history | SAFE / ACCOUNT-RISK | P2 | Eenmalige seed; state herleest server (8302). Lus met sbUpsert (direct fetch, SB_H per call) |
| 8299 | loadTrainCfg | sbUpsert | exercises | training/sets/history | SAFE / ACCOUNT-RISK | P2 | Seed globale oefeningen; lus zonder identiteitsbinding |
| 8356 | migreerABNaarVasteTrainingen | sbPost | vaste_trainingen | training/sets/history | SAFE / ACCOUNT-RISK | P2 | Eenmalige migratie A/B; lus sbPost |
| 8539 | toggleFavorite | sbDel | exercise_favorites | other | FALSE-SUCCESS | P2 | 8536 favoriteExIds.delete ongeacht resultaat |
| 8542 | toggleFavorite | sbPost | exercise_favorites | other | FALSE-SUCCESS / DUPLICATE-RISK | P2 | 8539 favoriteExIds.add ongeacht resultaat |
| 8968 | upsertHrvLog | sbRpc | upsert_daily_health | other | FALSE-SUCCESS | P2 | Niet gequeued (sbRpc). Zie aanroepers 17614/31763 |
| 9062 | tkImportHrvRows | sbRpc | upsert_daily_health | import | SAFE | P2 | RPC weigert p_user_id<>auth.uid(); HEAD: identiteitscheck per rij (1e610e8) — **opgelost in 1e610e8 (identiteitsbinding import)** |
| 9073 | upsertWeightLog | sbPatch | weight_log | other | FALSE-SUCCESS / DUPLICATE-RISK | P2 | upsertWeightLog retourneert niets; lees-dan-schrijf race → dubbele dagrij |
| 9074 | upsertWeightLog | sbPost | weight_log | other | FALSE-SUCCESS / DUPLICATE-RISK | P2 | idem |
| 10900 | cyclusStartMenstruatie | sbPostQ | cycle_periods | other | SAFE / DUPLICATE-RISK | P2 | cycle_periods zonder client-id: replay → tweede open periode |
| 10958 | cyclusSlaSymptoomOp | sbPostQ | cycle_symptom_logs | other | SAFE / DUPLICATE-RISK | P2 | Lees-dan-insert zonder client-id |
| 12565 | intakeConfirm | sbUpsert | atleet_profiel | profile | FALSE-SUCCESS / ACCOUNT-RISK | P2 | 12532-12533 sbUpsert genegeerd → 12553 tk_onboarding_done, 12554 intakeValueCTA; meerdere niet-gequeuede writes zonder identiteitsbinding |
| 12566 | intakeConfirm | sbUpsert | training_context | profile | FALSE-SUCCESS / ACCOUNT-RISK | P2 | idem |
| 12581 | intakeConfirm | sbPostQ | goals | other | SAFE / DUPLICATE-RISK | P2 | goals.id bigint: replay van gequeued item na verloren antwoord → dubbel doel |
| 12585 | intakeConfirm | sbPost | athlete_conditions | profile | FALSE-SUCCESS | P2 | athlete_conditions stil verloren |
| 12836 | saveNewGoal | sbPostQ | goals | other | SAFE / DUPLICATE-RISK | P2 | goals zonder client-id |
| 13128 | saveAvailabilityPeriod | sbPostQ | availability_periods | agenda/calendar | SAFE / DUPLICATE-RISK | P2 | availability_periods zonder client-id; replay → dubbel of 409 (overlap) in wachtrij |
| 14842 | runningConfirmFinish | fetch POST | activities | training/sets/history | SAFE | P2 | Verificatie via sbGet(dedupe_key); payload.user_id + RLS → faalt gesloten bij accountwissel. Offline: fetch gooit, geen catch → geen melding (state blijft bewaard) |
| 15474 | coachDeleteWorkoutFeedback | fetch DELETE | coach_workout_feedback | social/coach | FALSE-SUCCESS | P2 | 15441 DELETE genegeerd → 15442 toast("Feedback verwijderd") |
| 15511 | openCoachAthleteThread | fetch POST | message_threads | social/coach | SAFE / DUPLICATE-RISK | P2 | Thread aangemaakt, deelnemers kunnen falen → wees-thread; retry maakt tweede thread |
| 15516 | openCoachAthleteThread | fetch POST | message_participants | social/coach | DUPLICATE-RISK | P2 | zie 15478 |
| 15517 | openCoachAthleteThread | fetch POST | message_participants | social/coach | DUPLICATE-RISK | P2 | zie 15478 |
| 15575 | coachDeletePrivateNote | fetch DELETE | coach_private_notes | social/coach | FALSE-SUCCESS | P2 | 15542 DELETE genegeerd → 15543 toast("Notitie verwijderd") |
| 15826 | socialCreateGroup | fetch POST | social_group_memberships | social/coach | FALSE-SUCCESS | P2 | 15793 owner-lidmaatschap genegeerd → 15795 toast("Groep aangemaakt") |
| 16416 | nutritionSaveEntry | sbPostQ | nutrition_entries | nutrition | SAFE / DUPLICATE-RISK | P2 | Client-id per aanroep, maar geen busy-guard op knop (16321): dubbel klikken → 2 registraties |
| 16949 | cyclingConfirmFinish | fetch POST | activities | training/sets/history | SAFE | P2 | zie 14809 |
| 17469 | swimmingConfirmFinish | fetch POST | activities | training/sets/history | SAFE | P2 | zie 14809 |
| 17647 | saveHRV | upsertHrvLog | rpc upsert_daily_health (via upsertHrvLog) | other | FALSE-SUCCESS / ACCOUNT-RISK | P2 | 17617 Promise.all zonder resultcheck → 17618 closeModal, 17624 toast dagfactor / sendMsg; niet gequeued |
| 17648 | saveHRV | upsertWeightLog | weight_log (via upsertWeightLog) | other | FALSE-SUCCESS | P2 | idem 17618 |
| 17649 | saveHRV | sbPost | checkin_conditions | other | FALSE-SUCCESS | P2 | idem 17618 |
| 17675 | saveWeight | upsertWeightLog | weight_log (via upsertWeightLog) | other | FALSE-SUCCESS | P2 | 17643 closeModal + toast("Gewicht opgeslagen") |
| 17683 | saveBC | upsertWeightLog | weight_log (via upsertWeightLog) | other | FALSE-SUCCESS | P2 | 17651 closeModal + toast("Opgeslagen") |
| 17684 | saveBC | sbPost | body_comp | other | FALSE-SUCCESS | P2 | 17651 sbPost body_comp genegeerd → closeModal, toast("Opgeslagen") |
| 18911 | opslaanProgramma | sbPostReturning | program_blocks | training/sets/history | SAFE / ACCOUNT-RISK | P2 | Fouten eerlijk gemeld (18890) |
| 18916 | opslaanProgramma | sbPost | program_block_exercises | training/sets/history | SAFE / DUPLICATE-RISK | P2 | geen client-id |
| 19195 | heergenereerResterendeWeken | sbPost | program_regeneration_log | training/sets/history | SAFE | P2 | Audit-snapshot stil verloren; zie 19172 |
| 24719 | finishSession | sbPatchQ | program_blocks | agenda/calendar | SAFE | P2 | Blok blijft evt. "niet afgerond", geen melding; sessies zijn wel opgeslagen |
| 24731 | finishSession | sbPatchQ | planned_training_assignments | agenda/calendar | SAFE | P2 | idem voor assignment |
| 26518 | deleteSessionEntry | sbDelQ | sessions | training/sets/history | SAFE | P2 | Bij !ok geen melding (stil); geen valse succesmelding |
| 29902 | delEx | sbPatch | exercises | training/sets/history | FALSE-SUCCESS | P2 | 29869 sbPatch genegeerd → exercises lokaal gefilterd + toast("Verwijderd") |
| 29922 | saveNewEx | sbPost | exercises | training/sets/history | DATA-LOSS | P2 | 29896-29902 bij falen push lokaal + toast "(lokaal)"; niet gequeued, weg na herladen |
| 30868 | importFromFile | fetch POST | sessions | import | SAFE / FALSE-SUCCESS | P2 | 429d6c0: ACCOUNT-RISK P0 (SB_H per fetch, trigger set_user_id_from_auth; wissel midden in lus → rest bij B). HEAD: gewisseld()-check direct vóór elke fetch. Rest: ignore-duplicates telt overgeslagen rijen als "geïmporteerd"; niet gequeued — **opgelost in 1e610e8 (identiteitsbinding import)** |
| 30873 | importFromFile | fetch POST | weight_log | import | SAFE / FALSE-SUCCESS | P2 | idem 30830 (weight_log) — **opgelost in 1e610e8 (identiteitsbinding import)** |
| 30878 | importFromFile | fetch POST | body_comp | import | SAFE / FALSE-SUCCESS | P2 | idem 30830 (body_comp) — **opgelost in 1e610e8 (identiteitsbinding import)** |
| 30883 | importFromFile | tkImportHrvRows | rpc upsert_daily_health (via tkImportHrvRows) | import | SAFE | P2 | HEAD: overgeslagen na wissel — **opgelost in 1e610e8 (identiteitsbinding import)** |
| 30949 | saveAtleet | sbUpsert | atleet_profiel | profile | FALSE-SUCCESS / DATA-LOSS | P2 | 30908 sbUpsert genegeerd → 30909 closeModal, 30910 toast("Profiel opgeslagen"); volgende syncAtleetFromSupabase (30881) overschrijft lokaal met oude serverwaarden |
| 31804 | pchkSubmit | upsertHrvLog | rpc upsert_daily_health (via upsertHrvLog) | other | FALSE-SUCCESS | P2 | 31773 closeModal ongeacht resultaat |
| 31812 | pchkSubmit | sbPost | checkin_conditions | other | FALSE-SUCCESS | P2 | idem |
| 6689 | tkProductTelemetry | fetch POST | product-telemetry | other | SAFE | P3 | Telemetrie, geen UI-claim |
| 6766 | tkFeedbackSubmit | fetch POST | beta-feedback | other | SAFE | P3 | Succes alleen bij 201 {ok:true}; anders fout, invoer blijft |
| 6803 | tkFeedbackTriageCall | fetch POST | beta-feedback-triage | other | SAFE | P3 | Triage; fout teruggegeven |
| 7583 | tkProviderRequest (concept2-import) | fetch POST | concept2-import (netlify, bestaat niet in netlify/functions) | wearable/Concept2 | SAFE | P3 | Netlify-functie concept2-import bestaat niet; tkConcept2Import heeft geen aanroeper in UI |
| 7643 | tkFitbitSync | fetch POST | wearable-sync | wearable/Concept2 | SAFE | P3 | tkFitbitSync: geen aanroeper in UI; foutstatus getoond |
| 7689 | sendTelemetryBestEffort | fetch POST | telemetry | other | SAFE | P3 | Telemetrie |
| 8302 | loadTrainCfg | sbPatch | exercises | training/sets/history | SAFE | P3 | Seed spiergroepen |
| 8598 | tkCustomTrainingPost | sbPostQ | custom_trainings | training/sets/history | SAFE | P3 | Training lokaal + markering onbevestigd; eerlijke melding |
| 8608 | tkCustomTrainingPatch | sbPatchQ | custom_trainings | training/sets/history | SAFE | P3 | idem |
| 8745 | pushCustomTrainingExercisesRich | sbDelQ | custom_training_exercises | training/sets/history | SAFE | P3 | Uitkomsten gecontroleerd, markering pas weg na bevestiging |
| 8749 | pushCustomTrainingExercisesRich | sbPostQ | custom_training_exercises | training/sets/history | SAFE | P3 | Client-id per rij |
| 9795 | createTrainingInstance | sbPostQ | training_instances | training/sets/history | SAFE | P3 | Client-id (idempotent); aanroepers checken null |
| 9802 | completeTrainingInstance | sbPatchQ | training_instances | training/sets/history | SAFE | P3 | Sessie al opgeslagen; instance blijft evt. active (geen datadrift in sets) |
| 10907 | cyclusEindeMenstruatie | sbPatch | cycle_periods | other | SAFE | P3 | Niet gequeued: offline → foutmelding |
| 10915 | cyclusVerwijderPeriode | sbDel | cycle_periods | other | SAFE | P3 | gecontroleerd |
| 10928 | cyclusVerwijderAlleData | sbDel | cycle_periods | other | SAFE | P3 | Deelresultaat wordt gemeld |
| 10929 | cyclusVerwijderAlleData | sbDel | cycle_symptom_logs | other | SAFE | P3 | gecontroleerd |
| 10956 | cyclusSlaSymptoomOp | sbPatch | cycle_symptom_logs | other | SAFE | P3 | gecontroleerd |
| 11418 | fetchWearableStatus | fetch POST | wearable-status | wearable/Concept2 | SAFE | P3 | status |
| 11472 | wearableConnect | fetch POST | wearable-auth-start | wearable/Concept2 | SAFE | P3 | authUrl gecontroleerd |
| 11509 | wearableDisconnect | fetch POST | wearable-disconnect | wearable/Concept2 | SAFE | P3 | r.ok |
| 11536 | wearableSyncNow | fetch POST | wearable-sync | wearable/Concept2 | SAFE | P3 | h één keer vastgelegd voor beide calls |
| 11561 | wearableSyncNow | fetch POST | wearable-sync-activities | wearable/Concept2 | SAFE | P3 | stil aanvullend |
| 11615 | fetchPolarStatus | fetch POST | polar-status | wearable/Concept2 | SAFE | P3 | status |
| 11624 | polarConnect | fetch POST | polar-auth-start | wearable/Concept2 | SAFE | P3 | authUrl gecontroleerd |
| 11635 | polarDisconnect | fetch POST | polar-disconnect | wearable/Concept2 | SAFE | P3 | r.ok |
| 11646 | polarSyncNow | fetch POST | polar-sync | wearable/Concept2 | SAFE | P3 | r.ok && d.synced |
| 11666 | fetchGarminStatus | fetch POST | garmin-status | wearable/Concept2 | SAFE | P3 | status |
| 11676 | garminDisconnect | fetch POST | garmin-disconnect | wearable/Concept2 | SAFE | P3 | r.ok |
| 11690 | fetchWhoopStatus | fetch POST | whoop-status | wearable/Concept2 | SAFE | P3 | status |
| 11699 | whoopConnect | fetch POST | whoop-auth-start | wearable/Concept2 | SAFE | P3 | authUrl gecontroleerd |
| 11710 | whoopDisconnect | fetch POST | whoop-disconnect | wearable/Concept2 | SAFE | P3 | r.ok |
| 11721 | whoopSyncNow | fetch POST | whoop-sync | wearable/Concept2 | SAFE | P3 | r.ok && d.synced |
| 11737 | fetchOuraStatus | fetch POST | oura-status | wearable/Concept2 | SAFE | P3 | status |
| 11746 | ouraConnect | fetch POST | oura-auth-start | wearable/Concept2 | SAFE | P3 | authUrl gecontroleerd |
| 11757 | ouraDisconnect | fetch POST | oura-disconnect | wearable/Concept2 | SAFE | P3 | r.ok |
| 11768 | ouraSyncNow | fetch POST | oura-sync | wearable/Concept2 | SAFE | P3 | r.ok && d.synced |
| 11802 | checkTeamAccess | fetch POST | gym-team | social/coach | SAFE | P3 | gym-team read |
| 11839 | resetForgottenPin | fetch POST | gym-team-set-pin | social/coach | SAFE | P3 | r.ok |
| 11888 | loadTeamMembers | fetch POST | gym-team | social/coach | SAFE | P3 | gym-team read |
| 11907 | changeTeamRole | fetch POST | gym-team | social/coach | SAFE | P3 | r.ok |
| 11918 | loadTeamAuditLog | fetch POST | gym-team | social/coach | SAFE | P3 | gym-team read |
| 11935 | submitNewTeamPin | fetch POST | gym-team-set-pin | social/coach | SAFE | P3 | r.ok |
| 12279 | obFinish | sbUpsert | atleet_profiel | profile | SAFE | P3 | Lokaal leidend; latere syncAtleetFromSupabase pusht alleen als server leeg is |
| 12475 | intakeAiExtract | fetch POST | coach (AI) | profile | SAFE | P3 | AI-extractie |
| 12843 | deleteGoalPrompt | sbPatchQ | goals | other | SAFE | P3 | Geen valse melding; fout stil |
| 12950 | calendarFeedGenerate | sbPatchQ | calendar_feed_tokens | agenda/calendar | SAFE | P3 | genegeerd; volgende insert faalt op unique |
| 12951 | calendarFeedGenerate | sbPostQ | calendar_feed_tokens | agenda/calendar | SAFE | P3 | Gequeued telt als opgeslagen (DEC-QUEUE-001); link actief na sync |
| 13035 | availConflictSkip | sbPatchQ | program_blocks | agenda/calendar | SAFE | P3 | gecontroleerd |
| 13069 | availConflictReschedule | sbPatchQ | program_blocks | agenda/calendar | SAFE | P3 | gecontroleerd |
| 13124 | saveAvailabilityPeriod | sbPatchQ | availability_periods | agenda/calendar | SAFE | P3 | gecontroleerd |
| 13139 | deleteAvailabilityPeriod | sbDelQ | availability_periods | agenda/calendar | SAFE | P3 | Fout stil, geen valse melding |
| 13451 | openScheduleMyTraining | sbRpcQ | schedule_my_training | agenda/calendar | SAFE | P3 | Idempotente p_occurrence_id |
| 13463 | myTrainingSkipAssignment | sbPatchQ | planned_training_assignments | agenda/calendar | SAFE | P3 | gecontroleerd |
| 13481 | myTrainingReschedule | sbPatchQ | planned_training_occurrences | agenda/calendar | SAFE | P3 | gecontroleerd |
| 13490 | myTrainingCancelOccurrence | sbPatchQ | planned_training_occurrences | agenda/calendar | SAFE | P3 | gecontroleerd |
| 14044 | grantResearchConsent | sbPostQ | research_consents | other | SAFE | P3 | Append-only |
| 14050 | withdrawResearchConsent | sbPostQ | research_consents | other | SAFE | P3 | gecontroleerd |
| 14089 | downloadResearchExport | fetch POST | research-export | other | SAFE | P3 | export |
| 14857 | runningConfirmFinish | sbPostQ | activity_laps | training/sets/history | SAFE | P3 | 429d6c0: replay → 409 op (activity_id,lap_index) blokkeert wachtrij — **opgelost in 9994705 (activities client-id / TK_ON_CONFLICT activity_laps)** |
| 15189 | coachPtRequest | fetch POST | coach_athlete_relationships | social/coach | SAFE | P3 | r.ok |
| 15200 | coachPtActivate | sbPatchQ | coach_athlete_relationships | social/coach | SAFE | P3 | gecontroleerd |
| 15210 | coachPtRevoke | sbPatchQ | coach_athlete_relationships | social/coach | SAFE | P3 | gecontroleerd |
| 15220 | coachPtToggleScope | sbPatchQ | coach_access_scopes | social/coach | SAFE | P3 | gecontroleerd |
| 15374 | coachSaveProgramTemplate | fetch POST | coach_program_templates | social/coach | SAFE | P3 | r.ok |
| 15387 | coachAssignProgramTemplate | fetch POST | coach_program_assignments | social/coach | SAFE | P3 | r.ok |
| 15416 | athleteMaterializeAssignment | sbRpc | materialize_coach_assignment | social/coach | SAFE | P3 | gecontroleerd |
| 15465 | coachSaveWorkoutFeedback | fetch POST | coach_workout_feedback | social/coach | SAFE | P3 | r.ok |
| 15557 | coachAddPrivateNote | fetch POST | coach_private_notes | social/coach | SAFE | P3 | r.ok |
| 15566 | coachEditPrivateNote | fetch PATCH | coach_private_notes | social/coach | SAFE | P3 | r.ok |
| 15820 | socialCreateGroup | fetch POST | social_groups | social/coach | SAFE | P3 | r.ok |
| 15858 | socialJoinGroup | fetch POST | social_group_memberships | social/coach | SAFE | P3 | r.ok |
| 15894 | socialShareActivity | fetch POST | social_shared_activities | social/coach | SAFE | P3 | r.ok |
| 15916 | startDirectMessage | sbRpc | get_or_create_direct_thread | social/coach | SAFE | P3 | gecontroleerd |
| 16022 | renderMessageThreadScreen | sbPatchQ | message_participants | social/coach | SAFE | P3 | cosmetisch |
| 16039 | sendDirectMessage | sbPostQ | messages | social/coach | SAFE | P3 | client-id |
| 16086 | socialToggleReaction | fetch DELETE | social_reactions | social/coach | SAFE | P3 | genegeerd; herrender |
| 16088 | socialToggleReaction | fetch POST | social_reactions | social/coach | SAFE | P3 | ok.ok alleen voor notificatie; herrender |
| 16095 | socialToggleReaction | fetch POST | rpc social_create_notification | social/coach | SAFE | P3 | best-effort |
| 16109 | socialPostComment | fetch POST | social_comments | social/coach | SAFE | P3 | ok.ok |
| 16113 | socialPostComment | fetch POST | rpc social_create_notification | social/coach | SAFE | P3 | best-effort |
| 16131 | socialReport | fetch POST | social_reports | social/coach | SAFE | P3 | ok.ok |
| 16160 | socialJoinChallenge | fetch POST | social_challenge_participants | social/coach | SAFE | P3 | ok.ok |
| 16189 | socialMarkNotificationsRead | fetch PATCH | social_notifications | social/coach | SAFE | P3 | genegeerd; herrender |
| 16193 | socialMarkNotificationRead | fetch PATCH | social_notifications | social/coach | SAFE | P3 | genegeerd; herrender |
| 16411 | nutritionSaveEntry | sbPatchQ | nutrition_entries | nutrition | SAFE | P3 | gecontroleerd |
| 16424 | nutritionDeleteEntry | sbDelQ | nutrition_entries | nutrition | SAFE | P3 | gecontroleerd |
| 16464 | socialSaveProfile | fetch POST | social_profiles | social/coach | SAFE | P3 | ok.ok |
| 16492 | socialFollow | fetch POST | social_connections | social/coach | SAFE | P3 | ok.ok |
| 16500 | socialFollow | fetch POST | rpc social_create_notification | social/coach | SAFE | P3 | best-effort |
| 16505 | socialAcceptFollow | fetch PATCH | social_connections | social/coach | SAFE | P3 | ok.ok |
| 16510 | socialAcceptFollow | fetch POST | rpc social_create_notification | social/coach | SAFE | P3 | best-effort |
| 16656 | setRunningThresholdPace | sbRpcQ | upsert_endurance_profile_target | training/sets/history | SAFE | P3 | upsert-RPC |
| 16958 | cyclingConfirmFinish | sbPostQ | activity_laps | training/sets/history | SAFE | P3 | per lap — **opgelost in 9994705 (activities client-id / TK_ON_CONFLICT activity_laps)** |
| 17189 | setCyclingFtp | sbRpcQ | upsert_endurance_profile_target | training/sets/history | SAFE | P3 | gecontroleerd |
| 17478 | swimmingConfirmFinish | sbPostQ | activity_laps | training/sets/history | SAFE | P3 | per lap — **opgelost in 9994705 (activities client-id / TK_ON_CONFLICT activity_laps)** |
| 17702 | addCondition | sbPost | athlete_conditions | other | SAFE | P3 | gecontroleerd |
| 17708 | removeCondition | sbPatch | athlete_conditions | other | SAFE | P3 | genegeerd; herrender |
| 18043 | ensureExerciseRowStatus | sbPostQ | exercises | training/sets/history | SAFE | P3 | ignoreDuplicates |
| 18388 | saveLosOefening | sbPostQ | sessions | training/sets/history | SAFE | P3 | Knop geblokkeerd; client-id; timeout → queued |
| 18843 | genereerProgramma | fetch POST | coach (AI) | training/sets/history | SAFE | P3 | AI-generatie |
| 19229 | heergenereerResterendeWeken | fetch POST | coach (AI) | training/sets/history | SAFE | P3 | AI-call in regeneratie (zie 19172) |
| 19323 | pscheduleSkip | sbPatchQ | program_blocks | agenda/calendar | SAFE | P3 | gecontroleerd |
| 19344 | pscheduleShowReschedule | sbPatchQ | program_blocks | agenda/calendar | SAFE | P3 | gecontroleerd |
| 19384 | addBlockExercise | sbPostReturning | program_block_exercises | training/sets/history | SAFE | P3 | gecontroleerd (inserted) |
| 21936 | addEquipment | sbPost | exercise_equipment | other | SAFE | P3 | gecontroleerd |
| 21941 | deleteEquipment | sbDel | exercise_equipment | other | SAFE | P3 | gecontroleerd |
| 24403 | writeSessionRow | sbPostQ | sessions | training/sets/history | SAFE | P3 | zie aanroepers (extra rijen) |
| 24413 | writeRaceSegmentRow | sbPostQ | race_segments | training/sets/history | SAFE | P3 | zie 36140 |
| 24862 | generateSessionSummaryAI | fetch POST | coach (AI) | training/sets/history | SAFE | P3 | AI-samenvatting |
| 26295 | deleteSessionDirect | sbDelQ | sessions | training/sets/history | SAFE | P3 | gecontroleerd |
| 26471 | saveEditSession | sbPostQ | sessions | training/sets/history | SAFE | P3 | gecontroleerd |
| 26497 | saveEditSession | sbPatchQ | sessions | training/sets/history | SAFE | P3 | returnRows + superseded |
| 27113 | voedingSaveTargets | sbPostQOpgeslagen | nutrition_targets | nutrition | SAFE / DUPLICATE-RISK | P3 | nutrition_targets append-only zonder client-id |
| 27219 | voedingConfirmWaterEntry | sbPostQOpgeslagen | nutrition_hydration_entries | nutrition | SAFE | P3 | throws |
| 27456 | voedingIngestOffCandidate | sbPostQ | nutrition_nutrient_values | nutrition | SAFE | P3 | Nutrientwaarden ontbreken dan expliciet (UNKNOWN) |
| 27472 | voedingIngestOffCandidate | sbPostQ | nutrition_products | nutrition | SAFE | P3 | detail gecontroleerd |
| 27481 | voedingIngestOffCandidate | sbPostQ | nutrition_product_identifiers | nutrition | SAFE | P3 | detail; 409 → race-winnaar |
| 27492 | voedingIngestOffCandidate | sbPostQ | nutrition_nutrient_values | nutrition | SAFE | P3 | Nutrientwaarden ontbreken dan expliciet (UNKNOWN) |
| 27757 | voedingConfirmAddToMeal | sbPostQOpgeslagen | nutrition_meals | nutrition | SAFE | P3 | throws; vaste pending-id |
| 27761 | voedingConfirmAddToMeal | sbPostQOpgeslagen | nutrition_meal_items | nutrition | SAFE | P3 | throws; vaste pending-id |
| 27836 | voedingSaveMealTime | sbPatchQ | nutrition_meals | nutrition | SAFE | P3 | gecontroleerd |
| 27847 | voedingRemoveMealItemConfirmed | sbDelQ | nutrition_meal_items | nutrition | SAFE | P3 | gecontroleerd |
| 27924 | voedingSaveItemEdit | sbPatchQ | nutrition_meal_items | nutrition | SAFE | P3 | Hersteld in 429d6c0 |
| 27940 | voedingDeleteMealConfirmed | sbDelQ | nutrition_meal_items | nutrition | SAFE | P3 | gecontroleerd |
| 27941 | voedingDeleteMealConfirmed | sbDelQ | nutrition_meals | nutrition | SAFE | P3 | gecontroleerd |
| 27963 | voedingSaveSupplement | sbPostQOpgeslagen | nutrition_supplement_definitions | supplements | SAFE | P3 | throws |
| 27971 | voedingSaveSupplement | sbPostQOpgeslagen | nutrition_supplement_logs | supplements | SAFE | P3 | throws; vaste pending-id |
| 27990 | voedingDeleteSupplementLog | sbDelQ | nutrition_supplement_logs | supplements | SAFE | P3 | gecontroleerd |
| 28525 | voedingKennisAiSubmit | fetch POST | coach (AI) | nutrition | SAFE | P3 | Kennis-AI |
| 28727 | voedingPersistCustomProduct | sbPostQOpgeslagen | nutrition_products | nutrition | SAFE | P3 | throws |
| 28729 | voedingPersistCustomProduct | sbPostQOpgeslagen | nutrition_product_identifiers | nutrition | SAFE | P3 | throws |
| 28734 | voedingPersistCustomProduct | sbPostQOpgeslagen | nutrition_nutrient_values | nutrition | SAFE | P3 | throws |
| 28806 | voedingSubmitCorrection | sbPostQOpgeslagen | nutrition_nutrient_values | nutrition | SAFE / DUPLICATE-RISK | P3 | nutrient_values-revisie zonder id; dubbele revisie onschadelijk |
| 29121 | voedingPersistNewProductFromLabel | sbPostQOpgeslagen | nutrition_products | nutrition | SAFE | P3 | throws |
| 29122 | voedingPersistNewProductFromLabel | sbPostQOpgeslagen | nutrition_nutrient_values | nutrition | SAFE | P3 | throws |
| 29192 | voedingSaveManualEntry | sbPostQOpgeslagen | nutrition_products | nutrition | SAFE | P3 | throws |
| 29194 | voedingSaveManualEntry | sbPostQOpgeslagen | nutrition_product_identifiers | nutrition | SAFE | P3 | throws |
| 29207 | voedingSaveManualEntry | sbPostQOpgeslagen | nutrition_nutrient_values | nutrition | SAFE | P3 | throws |
| 29661 | saveYT | sbPatch | exercises | training/sets/history | SAFE | P3 | oefening-beheer |
| 29694 | saveRest | sbPatch | exercises | training/sets/history | SAFE | P3 | oefening-beheer |
| 29728 | saveMuscles | sbPatch | exercises | training/sets/history | SAFE | P3 | oefening-beheer |
| 29761 | savePeakGoal | sbPatchQ | exercise_goals | training/sets/history | SAFE | P3 | gecontroleerd |
| 29764 | savePeakGoal | sbPatchQ | exercise_goals | training/sets/history | SAFE | P3 | gecontroleerd |
| 29766 | savePeakGoal | sbPostQ | exercise_goals | training/sets/history | SAFE / DUPLICATE-RISK | P3 | exercise_goals zonder client-id |
| 29796 | saveAnchor | sbPatch | exercises | training/sets/history | SAFE | P3 | oefening-beheer |
| 29868 | saveAddTrainEx | sbUpsert | training_exercises | training/sets/history | SAFE | P3 | stabiele id |
| 29880 | removeTrainEx | sbDel | training_exercises | training/sets/history | SAFE | P3 | gecontroleerd |
| 29890 | moveTrainEx | sbPatch | training_exercises | training/sets/history | SAFE | P3 | halve swap mogelijk |
| 29891 | moveTrainEx | sbPatch | training_exercises | training/sets/history | SAFE | P3 | genegeerd; herlaadt |
| 30685 | sendMsg | sbPost | chat_history | other | SAFE | P3 | chatgeschiedenis stil niet bewaard |
| 30689 | sendMsg | fetch POST | coach (AI) | other | SAFE | P3 | AI-chat |
| 30704 | sendMsg | sbPost | chat_history | other | SAFE | P3 | genegeerd |
| 30707 | sendMsg | sbDel | chat_history | other | SAFE | P3 | opschonen |
| 30766 | clearChat | sbDel | chat_history | other | FALSE-SUCCESS | P3 | chatHist gereset ongeacht delete-resultaat |
| 30770 | clearChat | sbDel | chat_history | other | FALSE-SUCCESS | P3 | idem |
| 30929 | syncAtleetFromSupabase | sbUpsert | atleet_profiel | profile | SAFE | P3 | genegeerd (achtergrond) |
| 31527 | submitShare | fetch POST | gym-team | social/coach | SAFE | P3 | lookup |
| 31530 | submitShare | sbPost | content_shares | social/coach | SAFE | P3 | gecontroleerd |
| 31544 | deleteCustomTraining | sbDelQ | custom_trainings | training/sets/history | SAFE | P3 | fb7cff0 wijzigt alleen sbDelQ-commentaar; gedrag aanroeper ongewijzigd veilig |
| 31963 | generateProgAdviesAI | fetch POST | coach (AI) | training/sets/history | SAFE | P3 | AI-uitleg |
| 35575 | addEquipmentType | sbPost | equipment_types | other | SAFE | P3 | gecontroleerd |
| 35583 | removeEquipmentType | sbPatch | equipment_types | other | SAFE | P3 | genegeerd; herlaadt |
| 35631 | ensureEquipmentCatalogLoaded | sbPost | equipment_catalog | other | SAFE | P3 | genegeerd (seed); herlaadt |
| 35693 | saveEquipmentCatalogItem | sbPatch | equipment_catalog | other | SAFE | P3 | gecontroleerd |
| 35696 | saveEquipmentCatalogItem | sbPost | equipment_catalog | other | SAFE | P3 | gecontroleerd |
| 35708 | deleteEquipmentCatalogItem | sbPatch | equipment_catalog | other | SAFE | P3 | gecontroleerd |
| 35737 | ensureExercisesLoaded | sbUpsert | exercises | training/sets/history | SAFE | P3 | genegeerd (seed) |
| 35933 | wearableSyncSilent | fetch POST | wearable-sync | wearable/Concept2 | SAFE | P3 | stil |
| 36219 | hyroxCorrigeerLaatste | sbPatch | race_segments | training/sets/history | SAFE | P3 | Niet gequeued: offline → "Kon niet bijwerken" |

## Status per HEAD (bijgewerkt 19-10-2026)

Uitvoer van `node tools/audit-matrix-status.js --md`. De kolom Regel verwijst naar de index.html van deze branch. Een streepje betekent: een wrapper-aanroep of een aanroep naar een netlify-functie die de ruwe inventaris niet als REST-schrijfaanroep ziet. Rijen met status `geen defect` (P3 SAFE) zijn weggelaten.

| Prio | opgelost | deels | open | geen defect | Totaal |
|---|---|---|---|---|---|
| P0 | 8 | 0 | 0 | 0 | 8 |
| P1 | 20 | 0 | 0 | 0 | 20 |
| P2 | 13 | 11 | 25 | 0 | 49 |
| P3 | 13 | 0 | 2 | 155 | 170 |

Rijen: 247. Aanroep bestaat niet meer: 2. Gekoppeld aan een aanroep in de huidige index.html (zelfde tabel en helper, in volgorde): 193; niet door de ruwe inventaris gezien (wrapper zoals writeSessionRow/upsertWeightLog, of helper gewijzigd): 52. Aanroepen in index.html zonder matrixrij: 0.

| Regel (HEAD) | Prio | Functie | Helper | Tabel | Klasse | Status | Herstel | Rest |
|---|---|---|---|---|---|---|---|---|
| verwijderd | P0 | syncCustomTrainingsFromSupabase | sbPost | custom_trainings | DATA-LOSS / ACCOUNT-RISK | opgelost | `bb354ad` | Kale sbPost bestaat niet meer: de eerste upload loopt via tkCustomTrainingHerstel → sbPostQ (client-id, ouder eerst, markering) (bb354ad) |
| verwijderd | P0 | syncCustomTrainingsFromSupabase | sbPost | custom_training_exercises | DATA-LOSS / DUPLICATE-RISK | opgelost | `bb354ad` | Kale sbPost bestaat niet meer: de eerste upload loopt via tkCustomTrainingHerstel → sbPostQ (client-id, ouder eerst, markering) (bb354ad) |
| — | P0 | finishSession | writeSessionRow→sbPostQ | sessions | ACCOUNT-RISK | opgelost | `45f5e33` |  |
| — | P0 | finishSession | writeSessionRow→sbPostQ | sessions | ACCOUNT-RISK | opgelost | `45f5e33` |  |
| — | P0 | hyroxFinishSegment | writeRaceSegmentRow→sbPostQ | race_segments | ACCOUNT-RISK | opgelost | `45f5e33` |  |
| — | P0 | GW.persistToSessions | writeSessionRow→sbPostQ | sessions | ACCOUNT-RISK | opgelost | `45f5e33` |  |
| 19475 | P0 | heergenereerResterendeWeken | sbDel | program_block_exercises | DATA-LOSS / ACCOUNT-RISK | opgelost | `bb354ad`, `22bfd90` |  |
| 19475 | P0 | heergenereerResterendeWeken | sbDel | program_blocks | DATA-LOSS / ACCOUNT-RISK | opgelost | `bb354ad`, `22bfd90` |  |
| 8052 | P1 | upsertExerciseGoalField | sbPatchQ | exercise_goals | FALSE-SUCCESS | opgelost | `7b19a35` |  |
| 8060 | P1 | upsertExerciseGoalField | sbPostQ | exercise_goals | FALSE-SUCCESS / DUPLICATE-RISK | opgelost | `7b19a35`, `77aa953`, `83fcc6d` | on_conflict maakt replay idempotent; volgorde per rij voorkomt dat een getimede insert een latere PATCH terugdraait (83fcc6d) |
| 8514 | P1 | saveVasteTrainingName | sbPatch | vaste_trainingen | FALSE-SUCCESS / DATA-LOSS | opgelost | `7b19a35`, `22bfd90` |  |
| 8518 | P1 | saveVasteTrainingName | sbPost | vaste_trainingen | FALSE-SUCCESS / DATA-LOSS | opgelost | `7b19a35`, `22bfd90` |  |
| 8537 | P1 | deleteVasteTraining | sbDel | training_exercises | FALSE-SUCCESS | opgelost | `7b19a35`, `22bfd90` | Herclassificatie: ACCOUNT-RISK gevonden en hersteld: training_ref=A bestaat bij elke gebruiker; na een wissel tijdens de bevestigingsvraag werd de training van B geleegd |
| 8537 | P1 | deleteVasteTraining | sbDel | vaste_trainingen | FALSE-SUCCESS | opgelost | `7b19a35`, `22bfd90` |  |
| 13144 | P1 | calendarFeedRevoke | sbPatchQ | calendar_feed_tokens | FALSE-SUCCESS | opgelost | `7b19a35` |  |
| 15203 | P1 | afrondenRunningActivity | sbPostQ | activities | DUPLICATE-RISK | opgelost | `9994705` | Functie is onbereikbaar (geen UI-markup, fCriticalFlowResilience bevinding 2); de live afrondpaden hebben een busy-guard en dedupe_key (77aa953: verloren antwoord) |
| 18498 | P1 | saveLosOefening | sbPostQ | exercises | DUPLICATE-RISK | opgelost | `77aa953`, `83fcc6d` |  |
| 19112 | P1 | opslaanProgramma | sbPostReturning | programs | DATA-LOSS / ACCOUNT-RISK | opgelost | `7b19a35`, `77aa953`, `83fcc6d` |  |
| 19383 | P1 | deleteProgramma | sbDel | program_block_exercises | FALSE-SUCCESS | opgelost | `7b19a35`, `22bfd90` |  |
| 19384 | P1 | deleteProgramma | sbDel | program_blocks | FALSE-SUCCESS | opgelost | `7b19a35`, `22bfd90` |  |
| 19385 | P1 | deleteProgramma | sbDel | programs | FALSE-SUCCESS | opgelost | `7b19a35`, `22bfd90` |  |
| 19484 | P1 | heergenereerResterendeWeken | sbPostReturning | program_blocks | FALSE-SUCCESS / ACCOUNT-RISK | opgelost | `bb354ad`, `22bfd90` |  |
| 19490 | P1 | heergenereerResterendeWeken | sbPost | program_block_exercises | FALSE-SUCCESS / DUPLICATE-RISK | opgelost | `bb354ad`, `22bfd90` | Geen herhaling binnen één run; een nieuwe hergeneratie vervangt de onvolledige blokken (geen dubbele rijen) |
| 19659 | P1 | saveBlockExercise | sbPatch | program_block_exercises | FALSE-SUCCESS / DATA-LOSS | opgelost | `7b19a35` |  |
| 19668 | P1 | deleteBlockExercise | sbDel | program_block_exercises | FALSE-SUCCESS | opgelost | `7b19a35` |  |
| 32427 | P1 | permanentlyAddExtras | sbUpsert | training_exercises | FALSE-SUCCESS / ACCOUNT-RISK | opgelost | `7b19a35`, `22bfd90`, `83fcc6d` |  |
| 32457 | P1 | permanentlyAddExtras | sbPost | program_block_exercises | FALSE-SUCCESS / DUPLICATE-RISK | opgelost | `7b19a35`, `22bfd90`, `77aa953`, `83fcc6d` |  |
| 38181 | P1 | deleteWorkout | sbDelQ | custom_trainings | FALSE-SUCCESS | opgelost | `7b19a35` |  |
| — | P2 | tkConcept2Import | writeSessionRow→sbPostQ | sessions | SAFE / DUPLICATE-RISK | deels | `1e610e8` | Identiteitsbinding opgelost (1e610e8). Rest: dedupe alleen op [c2:id] in serversessies; gequeuede rijen worden niet gezien, dus een herhaalde import terwijl offline kan dupliceren (open, geen UI-aanroeper) |
| — | P2 | saveHRV | upsertHrvLog | rpc upsert_daily_health (via upsertHrvLog) | FALSE-SUCCESS / ACCOUNT-RISK | open |  |  |
| — | P2 | saveHRV | upsertWeightLog | weight_log (via upsertWeightLog) | FALSE-SUCCESS | open |  |  |
| — | P2 | saveWeight | upsertWeightLog | weight_log (via upsertWeightLog) | FALSE-SUCCESS | open |  |  |
| — | P2 | saveBC | upsertWeightLog | weight_log (via upsertWeightLog) | FALSE-SUCCESS | open |  |  |
| — | P2 | importFromFile | tkImportHrvRows | rpc upsert_daily_health (via tkImportHrvRows) | SAFE | opgelost | `1e610e8` |  |
| — | P2 | pchkSubmit | upsertHrvLog | rpc upsert_daily_health (via upsertHrvLog) | FALSE-SUCCESS | open |  |  |
| 8315 | P2 | loadTrainCfg | sbUpsert | training_exercises | SAFE / ACCOUNT-RISK | deels | `22bfd90` | Accountbinding opgelost. Datamodel: training_exercises.id (A_squat) is globaal uniek; de seed van een tweede gebruiker botst (bestaand, P2) |
| 8319 | P2 | loadTrainCfg | sbUpsert | exercises | SAFE / ACCOUNT-RISK | opgelost | `22bfd90` |  |
| 8377 | P2 | migreerABNaarVasteTrainingen | sbPost | vaste_trainingen | SAFE / ACCOUNT-RISK | deels | `22bfd90` | Accountbinding opgelost. vaste_trainingen.id (A/B) is globaal uniek; migratie van een tweede gebruiker botst (bestaand, P2) |
| 8568 | P2 | toggleFavorite | sbDel | exercise_favorites | FALSE-SUCCESS | open |  |  |
| 8571 | P2 | toggleFavorite | sbPost | exercise_favorites | FALSE-SUCCESS / DUPLICATE-RISK | open |  |  |
| 9006 | P2 | upsertHrvLog | sbRpc | upsert_daily_health | FALSE-SUCCESS | open |  |  |
| 9100 | P2 | tkImportHrvRows | sbRpc | upsert_daily_health | SAFE | opgelost | `1e610e8` |  |
| 9112 | P2 | upsertWeightLog | sbPatch | weight_log | FALSE-SUCCESS / DUPLICATE-RISK | deels | `22bfd90` | Accountbinding opgelost; resultaat nog steeds genegeerd en lees-dan-schrijf zonder unieke dag-sleutel (open) |
| 9113 | P2 | upsertWeightLog | sbPost | weight_log | FALSE-SUCCESS / DUPLICATE-RISK | deels | `22bfd90` | Accountbinding opgelost; resultaat nog steeds genegeerd en lees-dan-schrijf zonder unieke dag-sleutel (open) |
| 11074 | P2 | cyclusStartMenstruatie | sbPostQ | cycle_periods | SAFE / DUPLICATE-RISK | opgelost | `c6b15e1`, `83fcc6d` | Replay is ignore-duplicates (no-op), zodat een latere wijziging nooit wordt teruggedraaid (83fcc6d) |
| 11132 | P2 | cyclusSlaSymptoomOp | sbPostQ | cycle_symptom_logs | SAFE / DUPLICATE-RISK | deels | `83fcc6d` | Bewust geen idempotente sleutel: merge-duplicates zou bij een leesfout alle symptomen van de dag overschrijven (review, 83fcc6d). Verloren antwoord → onzeker, vastgehouden in de wachtrij ("Toch versturen" na controle); een replay geeft anders 409 |
| 12740 | P2 | intakeConfirm | sbUpsert | atleet_profiel | FALSE-SUCCESS / ACCOUNT-RISK | deels | `22bfd90` | Accountbinding opgelost; resultaat van de upsert wordt nog niet gecontroleerd (open) |
| 12741 | P2 | intakeConfirm | sbUpsert | training_context | FALSE-SUCCESS / ACCOUNT-RISK | deels | `22bfd90` | Accountbinding opgelost; resultaat wordt nog niet gecontroleerd (open) |
| 12756 | P2 | intakeConfirm | sbPostQ | goals | SAFE / DUPLICATE-RISK | deels | `c6b15e1`, `83fcc6d` | Geen automatische tweede write meer na een verloren antwoord (blijft als "mogelijk al opgeslagen" in de wachtrij); goals.id is identity, client-id vergt een schemabesluit |
| 12760 | P2 | intakeConfirm | sbPost | athlete_conditions | FALSE-SUCCESS | deels | `22bfd90` | Accountbinding opgelost (athlete_conditions heeft set_user_id_from_auth); resultaat genegeerd (open) |
| 13011 | P2 | saveNewGoal | sbPostQ | goals | SAFE / DUPLICATE-RISK | deels | `c6b15e1`, `83fcc6d` | Idem intakeConfirm/goals |
| 13307 | P2 | saveAvailabilityPeriod | sbPostQ | availability_periods | SAFE / DUPLICATE-RISK | opgelost | `c6b15e1`, `83fcc6d` | Replay is ignore-duplicates (no-op), zodat een latere wijziging nooit wordt teruggedraaid (83fcc6d) |
| 15022 | P2 | runningConfirmFinish | fetch POST | activities | SAFE | opgelost | `77aa953` | Netwerkfout na de insert wordt opgevangen; dedupe_key-lookup beslist |
| 15654 | P2 | coachDeleteWorkoutFeedback | fetch DELETE | coach_workout_feedback | FALSE-SUCCESS | open |  |  |
| 15691 | P2 | openCoachAthleteThread | fetch POST | message_threads | SAFE / DUPLICATE-RISK | open |  |  |
| 15696 | P2 | openCoachAthleteThread | fetch POST | message_participants | DUPLICATE-RISK | open |  |  |
| 15697 | P2 | openCoachAthleteThread | fetch POST | message_participants | DUPLICATE-RISK | open |  |  |
| 15755 | P2 | coachDeletePrivateNote | fetch DELETE | coach_private_notes | FALSE-SUCCESS | open |  |  |
| 16006 | P2 | socialCreateGroup | fetch POST | social_group_memberships | FALSE-SUCCESS | open |  |  |
| 16596 | P2 | nutritionSaveEntry | sbPostQ | nutrition_entries | SAFE / DUPLICATE-RISK | open |  |  |
| 17130 | P2 | cyclingConfirmFinish | fetch POST | activities | SAFE | opgelost | `77aa953` | Idem |
| 17651 | P2 | swimmingConfirmFinish | fetch POST | activities | SAFE | opgelost | `77aa953` | Idem |
| 17831 | P2 | saveHRV | sbPost | checkin_conditions | FALSE-SUCCESS | open |  |  |
| 17866 | P2 | saveBC | sbPost | body_comp | FALSE-SUCCESS | open |  |  |
| 19132 | P2 | opslaanProgramma | sbPostReturning | program_blocks | SAFE / ACCOUNT-RISK | opgelost | `77aa953`, `83fcc6d` |  |
| 19141 | P2 | opslaanProgramma | sbPost | program_block_exercises | SAFE / DUPLICATE-RISK | opgelost | `77aa953`, `83fcc6d` | Nu sbUpsert met vaste client-id per oefeningrij (merge-duplicates): hervatbaar zonder dubbele rij |
| 19431 | P2 | heergenereerResterendeWeken | sbPost | program_regeneration_log | SAFE | open |  |  |
| 24965 | P2 | finishSession | sbPatchQ | program_blocks | SAFE | open |  |  |
| 24977 | P2 | finishSession | sbPatchQ | planned_training_assignments | SAFE | open |  |  |
| 26764 | P2 | deleteSessionEntry | sbDelQ | sessions | SAFE | open |  |  |
| 30148 | P2 | delEx | sbPatch | exercises | FALSE-SUCCESS | open |  |  |
| 30168 | P2 | saveNewEx | sbPost | exercises | DATA-LOSS | open |  |  |
| 31117 | P2 | importFromFile | fetch POST | sessions | SAFE / FALSE-SUCCESS | opgelost | `1e610e8` |  |
| 31122 | P2 | importFromFile | fetch POST | weight_log | SAFE / FALSE-SUCCESS | opgelost | `1e610e8` |  |
| 31127 | P2 | importFromFile | fetch POST | body_comp | SAFE / FALSE-SUCCESS | opgelost | `1e610e8` |  |
| 31198 | P2 | saveAtleet | sbUpsert | atleet_profiel | FALSE-SUCCESS / DATA-LOSS | open |  |  |
| 32063 | P2 | pchkSubmit | sbPost | checkin_conditions | FALSE-SUCCESS | open |  |  |
| 8322 | P3 | loadTrainCfg | sbPatch | exercises | SAFE | opgelost | `22bfd90` |  |
| 13126 | P3 | calendarFeedGenerate | sbPostQ | calendar_feed_tokens | SAFE | opgelost | `c6b15e1`, `83fcc6d` | Client-id: een replay gaf voorheen een eeuwige 409 op de unieke actieve token Replay is ignore-duplicates (no-op), zodat een latere wijziging nooit wordt teruggedraaid (83fcc6d) |
| 14223 | P3 | grantResearchConsent | sbPostQ | research_consents | SAFE | opgelost | `c6b15e1` |  |
| 14229 | P3 | withdrawResearchConsent | sbPostQ | research_consents | SAFE | opgelost | `c6b15e1` |  |
| 15037 | P3 | runningConfirmFinish | sbPostQ | activity_laps | SAFE | opgelost | `9994705` |  |
| 17139 | P3 | cyclingConfirmFinish | sbPostQ | activity_laps | SAFE | opgelost | `9994705` |  |
| 17660 | P3 | swimmingConfirmFinish | sbPostQ | activity_laps | SAFE | opgelost | `9994705` |  |
| 27359 | P3 | voedingSaveTargets | sbPostQOpgeslagen | nutrition_targets | SAFE / DUPLICATE-RISK | opgelost | `c6b15e1`, `83fcc6d` | Replay is ignore-duplicates (no-op), zodat een latere wijziging nooit wordt teruggedraaid (83fcc6d) |
| 29052 | P3 | voedingSubmitCorrection | sbPostQOpgeslagen | nutrition_nutrient_values | SAFE / DUPLICATE-RISK | opgelost | `c6b15e1` |  |
| 30012 | P3 | savePeakGoal | sbPostQ | exercise_goals | SAFE / DUPLICATE-RISK | opgelost | `77aa953` |  |
| 30934 | P3 | sendMsg | sbPost | chat_history | SAFE | opgelost | `22bfd90` | Herclassificatie: ACCOUNT-RISK gevonden en hersteld: het AI-antwoord voor A (op basis van A's gezondheidsdata) kwam na een accountwissel tijdens het wachten in de chatgeschiedenis van B (chat_history heeft set_user_id_from_auth) |
| 30953 | P3 | sendMsg | sbPost | chat_history | SAFE | opgelost | `22bfd90` | Herclassificatie: ACCOUNT-RISK gevonden en hersteld: het AI-antwoord voor A (op basis van A's gezondheidsdata) kwam na een accountwissel tijdens het wachten in de chatgeschiedenis van B (chat_history heeft set_user_id_from_auth) |
| 30956 | P3 | sendMsg | sbDel | chat_history | SAFE | opgelost | `22bfd90` | Herclassificatie: ACCOUNT-RISK gevonden en hersteld: het AI-antwoord voor A (op basis van A's gezondheidsdata) kwam na een accountwissel tijdens het wachten in de chatgeschiedenis van B (chat_history heeft set_user_id_from_auth) |
| 31015 | P3 | clearChat | sbDel | chat_history | FALSE-SUCCESS | open |  |  |
| 31019 | P3 | clearChat | sbDel | chat_history | FALSE-SUCCESS | open |  |  |

## Analyse van de importpaden (meerdere opeenvolgende writes; historisch, HEAD 7ee0828)

**Trigger-context.** In productie zet `set_user_id_from_auth()` `user_id := auth.uid()` op sessions, custom_trainings, custom_training_exercises, race_segments en program_blocks (docs/TK_INDEPENDENT_REREVIEW_CLAUDE_20261019.md; core/fImportIdentityBinding.test.js noemt ook weight_log en body_comp). De RLS-regel `WITH CHECK (user_id = auth.uid())` houdt een write met het verkeerde token dus niet tegen.

| Pad | Token per write | Identiteitsbinding 429d6c0 | HEAD 7ee0828 |
|---|---|---|---|
| `importFromFile` JSON (sessions/weight_log/body_comp), regel 30814 | `fetch(... headers:{...SB_H})`: SB_H wordt **per fetch** gelezen. Geen sbFetch, geen 401-refresh, niet gequeued | Geen. Wisselt het account tijdens een `await`, dan gaan de resterende records naar B (P0 in 429d6c0) | **Opgelost in 1e610e8.** `importUid` wordt bij de start vastgelegd; `gewisseld()` wordt direct vóór elke fetch gecontroleerd, overgeslagen records worden als "gestopt" gemeld. Restrisico: synchroon tussen check en fetch is er geen await, dus geen gat. Wel blijft: (a) `ignore-duplicates` telt overgeslagen rijen als "geïmporteerd"; (b) payload-`id`/`user_id` uit het bestand gaan ongefilterd mee (een vreemde `id` die al bestaat wordt stil overgeslagen) |
| `tkImportHrvRows` (hrv_log via RPC upsert_daily_health), regel 9034 | `sbRpc` → `sbFetch`, headers per poging uit SB_H; `p_user_id` = uid bij de start | Server weigert `p_user_id <> auth.uid()`, dus faalt gesloten (telt als mislukt) | 1e610e8: `gewisseld()` per rij, daarna geen RPC meer |
| `tkConcept2Import`, regel 7609 | `writeSessionRow` → `sbPostQ` → `sbFetch`. sbPostQ legt `eigenaar`/`uidStart` per aanroep vast en queuet bij een wissel (TK-REL-SEC-02) | Per write gebonden, maar de lus zelf niet: na een wissel gaat de volgende iteratie met B's identiteit | 1e610e8: `c2uid`-check per iteratie, alleen `true` telt. **Onbereikbaar:** geen UI-aanroeper en de netlify-functie `concept2-import` bestaat niet. Restrisico: dedupe alleen op `[c2:id]` in serversessies, gequeuede rijen worden niet gezien |
| `tkFitbitSync` / `wearableSyncNow` / polar/whoop/oura-sync | Eén netlify-call, `Authorization` uit `authSession.access_token` (wearableAuthHeaders) op het moment van de call; de server schrijft met service role voor de JWT-gebruiker | Eén request, geen client-lus | Ongewijzigd, veilig. `wearableSyncNow` hergebruikt dezelfde `h` voor de tweede call (activities), dus geen wissel tussen beide |
| `syncCustomTrainingsFromSupabase` legacy-tak, regels 8711/8714 (eerste upload naar lege server) | `sbPost` → `sbFetch`, SB_H per write | Geen. Lus over alle lokale trainingen en oefeningen | Ongewijzigd: **P0 DATA-LOSS** (zie matrix) plus ACCOUNT-RISK |
| `migrateLegacyWbSaved` (8776-8777) | tkCustomTrainingPost/pushCustomTrainingExercisesRich → sbPostQ/sbDelQ (eigenaar per write) | Per write gebonden. Een wissel midden in de lus verdeelt items over A (gequeued, eigenaar A) en B | Ongewijzigd. P2 |
| `opslaanProgramma` / `heergenereerResterendeWeken` (18869-18883, 19172-19213) | sbPostReturning/sbPost/sbDel → sbFetch, SB_H per write; niet gequeued | Geen; lange lussen met AI-awaits ertussen (19196) | Ongewijzigd: ACCOUNT-RISK (secundair) bij P0/P1-items |
| `loadTrainCfg` seed (8291-8298), `migreerABNaarVasteTrainingen` (8352), `ensureExercisesLoaded` (35696), `ensureEquipmentCatalogLoaded` (35590) | sbUpsert (directe fetch met SB_H) / sbPost | Geen. Eenmalige seed van globale of gedeelde rijen | P2/P3 |
| Bulk restore | Niet aanwezig: `exportJSON` exporteert, `importFromFile` is de enige restore | n.v.t. | n.v.t. |
| CSV/Strava/Health-file import | Niet aanwezig in index.html (alleen CSV-**export**) | n.v.t. | n.v.t. |

## Belangrijkste open bevindingen (historisch, HEAD 7ee0828)

De punten 1 tot en met 5 hieronder zijn inmiddels opgelost (zie de statustabel hierboven).


1. **P0 ACCOUNT-RISK, in-memory trainingsstatus niet eigenaargebonden** (finishSession 24642/24660, HYROX 36181, Guided 38567). `authSignOut` en `resetPersonalCacheIfNewDeviceOwner` wissen localStorage en catalogi, maar niet `curT`, `sessionLog`, `activeInstanceId`, `hyroxActive` of `GW.st.active`. Daarnaast schakelt `ensureValidSession` (via visibilitychange) stil over naar de sessie die een andere tab in `tk_auth_session` heeft gezet. A's sets worden dan met B als eigenaar weggeschreven (trigger). Dit is statisch afgeleid, niet in runtime gereproduceerd; het same-tab pad vereist dat B bij Home op "Hervatten" tikt.
2. **P0 DATA-LOSS in heergenereerResterendeWeken**: resterende geplande blokken worden verwijderd vóór de AI-generatie; bij een AI-fout volgt een return zonder vervanging.
3. **P0 DATA-LOSS in syncCustomTrainingsFromSupabase (legacy-tak)**: een mislukte sbPost wordt niet gemarkeerd; de volgende sync verwijdert de lokale training.
4. **P1 FALSE-SUCCESS** in de beheerflows voor vaste trainingen en programma's (niet-gequeuede sbPost/sbPatch/sbDel met een succes-toast), bij 1RM/PR in exercise_goals, bij het intrekken van de agenda-feed en bij deleteWorkout.
5. **P1 DUPLICATE-RISK** bij `exercises` via saveLosOefening (een 409 bij replay blokkeert afhankelijke sessies in de wachtrij) en bij handmatige runs zonder busy-guard (dubbel tikken).

## Open na de P1-rest (19-10-2026)

1. **P2 nog niet (volledig) opgelost: 36 rijen** (11 deels, 25 open). Daarvan dragen 21 het label FALSE-SUCCESS, 11 DUPLICATE-RISK, 5 ACCOUNT-RISK en 2 DATA-LOSS (een rij kan twee labels hebben). FALSE-SUCCESS: resultaat genegeerd bij directe writes buiten de trainingskern: favorieten, gewicht, HRV en check-in, lichaamssamenstelling, intake-profiel, coach/social-verwijderingen, `saveAtleet`, `saveNewEx`, `delEx`, `clearChat`. Accountbinding is bij de flows met meerdere awaits wel opgelost.
2. **P2 DUPLICATE-RISK zonder idempotente sleutel.** `goals` (identity-id) en `cycle_symptom_logs` (bewust geen merge) worden na een verloren antwoord niet meer automatisch herhaald; de sporter kiest na controle "Toch versturen". Een client-id-kolom vergt een migratie (PO-besluit). Ook: `nutritionSaveEntry` heeft geen busy-guard en `openCoachAthleteThread` kan wees-threads geven.
3. **Datamodel.** `training_exercises.id` (`A_squat`) en `vaste_trainingen.id` (`A`/`B`) zijn globaal uniek; de seed of migratie voor een tweede gebruiker botst. Dit bestond al.
4. **Directe social/coach-writes via een kale `fetch`.** Geen 401-refresh. Accountisolatie geldt via RLS `WITH CHECK (<eigenaarskolom> = auth.uid())` met de eigenaar uit de payload (read-only geverifieerd), niet via de client-binding.
