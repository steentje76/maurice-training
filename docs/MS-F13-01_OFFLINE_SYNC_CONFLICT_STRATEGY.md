# MS-F13-01_OFFLINE_SYNC_CONFLICT_STRATEGY.md — Trainingskompas

**Baseline main SHA:** `ccb46c542735da8d95593183243c129ce40c3b09`. Datum: 30 augustus 2026.

## Existing-state audit
Trainingskompas heeft al een volwassen, IndexedDB-gebaseerde offline-queue (sbPostQ/sbPatchQ/sbDelQ, offlineQueueAdd/All/Remove, flushOfflineQueue()), niet in deze sprint gebouwd maar hier voor het eerst expliciet, domein-breed geclassificeerd en getest tegen de nieuwe F12-commerciële laag.

Bewezen, bestaande beschermingen:
- Re-entry-lock (_flushBezig): voorkomt dat drie onafhankelijke triggers (window online-event, visibilitychange, startAppAfterAuth) gelijktijdig dezelfde queue-items versturen -- het exacte scenario dat een dubbele sessierij zou opleveren.
- Auth-gate: zonder geldige sessie wordt de queue nooit geleegd of weggegooid, blijft intact tot een geldige sessie terugkeert.
- Per-item foutisolatie: één mislukt item blokkeert niet de rest van de queue.
- Client-gegenereerde ID's voor training_instances: specifiek om duplicate-detectie mogelijk te maken bij een offline POST die later synchroniseert.

## Domeinclassificatie (nieuw, expliciet vastgelegd)

| Domein | Classificatie | Bewijs |
|---|---|---|
| Training logging (sessions, training_instances, program_blocks, race_segments) | QUEUEABLE | Reeds via sbPostQ/sbPatchQ, client-gegenereerde ID's voorkomen duplicaten |
| Drafts/actieve training | OFFLINE SAFE | Puur lokale state totdat expliciet afgerond |
| Doelen/PR's (goals, exercise_goals) | QUEUEABLE | Reeds via sbPostQ/sbPatchQ |
| Cyclus/symptomen (cycle_periods, cycle_symptom_logs) | QUEUEABLE | Reeds via sbPostQ, geen multi-device-race-conditie-risico |
| Custom trainingen/oefeningen | QUEUEABLE | Reeds via sbPostQ/sbPatchQ |
| Wearable/health-sync | SERVER AUTHORITATIVE | Komt altijd van de provider server-side, nooit een client-write-conflict |
| Gebruikersinstellingen | QUEUEABLE | Low-conflict-domein |
| Social/team-data (F9/F11) | CONFLICT SENSITIVE | Nieuw geclassificeerd: content_shares/team_events/event_attendance gaan NIET via sbPostQ (bevestigd 0 treffers) -- correct, gelijktijdige multi-user-wijzigingen horen altijd direct, online te worden afgehandeld. |
| Commerciële/billing-data (billing_events, individual_plan_key/status/expires_at, checkout, webhook) | NEVER OFFLINE MUTABLE | Nieuw geclassificeerd en getest: bevestigd 0 treffers voor sbPostQ/sbPatchQ op deze data. Nog geen client-side checkout-UI (MS-F12-03 bouwde alleen het planoverzicht) -- vastgelegd als expliciete architectuurregel vóór die UI ooit gebouwd wordt (MS-F13-08): een checkout-aanroep mag NOOIT via de offline-queue lopen. |
| Authenticatie (login/signup/token-refresh) | NEVER OFFLINE MUTABLE | Vereist per definitie een actieve verbinding, nooit gequeued (bevestigd 0 treffers) |

## Gap gevonden en gedicht
Er bestond geen expliciete, geteste architectuurregel die vastlegt dat billing/auth nooit via de offline-queue mogen -- dit was tot nu toe alleen "toevallig waar" omdat er nog geen client-side billing-UI bestond. Nu die in een toekomstige sprint (MS-F13-08) wél gebouwd gaat worden, is deze regel voortaan expliciet vastgelegd én geregressietest.

## Conclusie
Geen structurele architectuurwijziging nodig -- het bestaande systeem is al correct ontworpen. De toegevoegde waarde van deze sprint is de expliciete, geteste classificatie en het vastleggen van de grens vóór toekomstig commercieel/social werk deze per ongeluk zou kunnen overschrijden.
