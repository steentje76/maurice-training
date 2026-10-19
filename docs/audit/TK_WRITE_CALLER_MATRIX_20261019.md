# Schrijf-aanroepen index.html: inventarisatie en classificatie

**Basis:** geklasseerd tegen HEAD `7ee0828` (branch `review/claude-p0-reaccept-20261019`). De opdracht noemde `429d6c0`; tijdens de audit schoof de branch op (`fb7cff0`, `9994705`, `1e610e8`, `1dfe06c`, `41ca606`, `7ee0828`). Alle 244 aanroepregels komen 1-op-1 overeen tussen beide versies. **Regel** = HEAD 7ee0828. **Regelnummers in de kolom Bewijs verwijzen naar 429d6c0** (kolom `line_429d6c0` in matrix.json); vanaf ca. regel 9200 is HEAD 13 tot 41 regels hoger.

**Scope:** alle aanroepen van sbPostQ, sbPostQOpgeslagen, sbPatchQ, sbDelQ, sbRpcQ, sbPost, sbPostReturning, sbPatch, sbDel, sbUpsert, sbRpc, upsertWeightLog, upsertHrvLog en tkImportHrvRows, plus directe `fetch` POST/PATCH/DELETE naar `/rest/v1/` of `/.netlify/functions/`. Daarnaast vijf wrapper-aanroepen (writeSessionRow, writeRaceSegmentRow) die P0/P1-relevant zijn. Niet opgenomen: auth- en storage-endpoints, een commentaarregel (11335) en de interne aanroep in sbPostQOpgeslagen (9338). Totaal: 247 rijen.

## Status na herstel (Draft-PR #560, 19-10-2026)

| Prio | Bevinding | Herstel |
|---|---|---|
| P0 | `syncCustomTrainingsFromSupabase`: eerste upload (legacy) negeerde het resultaat → dataverlies | `bb354ad` (idempotente ouder-kindroute, markering, volgorde, identiteitsbinding) |
| P0 | `heergenereerResterendeWeken`: schema verwijderd vóór de AI-generatie | `bb354ad` (pas vervangen na volledige generatie, eerlijke telling, identiteitsbinding) |
| P0 | `finishSession` / Guided / HYROX: lopende training na uitloggen of eigenaarwissel onder het nieuwe account afgerond | `45f5e33` (uitvoering vergeten bij eigenaarwissel, bevestiging bij uitloggen, tab-wissel → herladen) |
| P1 | `afrondenRunningActivity`: replay na verloren antwoord → dubbele activiteit | `9994705` (client-id). Rest: geen busy-guard (dubbel tikken) — open |
| P1 | overige 19 FALSE-SUCCESS/DATA-LOSS/DUPLICATE-items | **open** — vervolg-Draft-PR (zie `docs/TK_P0_REACCEPTANCE_557_558_20261019.md` §10) |
| — | imports (`importFromFile`, `tkConcept2Import`, `tkImportHrvRows`) | `1e610e8` |

Opnieuw genereren van de ruwe inventaris: `node tools/audit-write-callers.js` (JSON op stdout; classificatie blijft handwerk met bewijs per regel).

## Telling

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

## Analyse van de importpaden (meerdere opeenvolgende writes)

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

## Belangrijkste open bevindingen (HEAD 7ee0828)

1. **P0 ACCOUNT-RISK, in-memory trainingsstatus niet eigenaargebonden** (finishSession 24642/24660, HYROX 36181, Guided 38567). `authSignOut` en `resetPersonalCacheIfNewDeviceOwner` wissen localStorage en catalogi, maar niet `curT`, `sessionLog`, `activeInstanceId`, `hyroxActive` of `GW.st.active`. Daarnaast schakelt `ensureValidSession` (via visibilitychange) stil over naar de sessie die een andere tab in `tk_auth_session` heeft gezet. A's sets worden dan met B als eigenaar weggeschreven (trigger). Dit is statisch afgeleid, niet in runtime gereproduceerd; het same-tab pad vereist dat B bij Home op "Hervatten" tikt.
2. **P0 DATA-LOSS in heergenereerResterendeWeken**: resterende geplande blokken worden verwijderd vóór de AI-generatie; bij een AI-fout volgt een return zonder vervanging.
3. **P0 DATA-LOSS in syncCustomTrainingsFromSupabase (legacy-tak)**: een mislukte sbPost wordt niet gemarkeerd; de volgende sync verwijdert de lokale training.
4. **P1 FALSE-SUCCESS** in de beheerflows voor vaste trainingen en programma's (niet-gequeuede sbPost/sbPatch/sbDel met een succes-toast), bij 1RM/PR in exercise_goals, bij het intrekken van de agenda-feed en bij deleteWorkout.
5. **P1 DUPLICATE-RISK** bij `exercises` via saveLosOefening (een 409 bij replay blokkeert afhankelijke sessies in de wachtrij) en bij handmatige runs zonder busy-guard (dubbel tikken).
