# B9-H4 Recovery Metric Contracts

## A. HRV

**CANONICAL FIELD:** `hrv_log.hrv` (numeric, milliseconden).
**UNIT:** milliseconden.
**SOURCE:** `hrv_source` (`wearable` | NULL=handmatig).
**MEASUREMENT TIMESTAMP:** `hrv_log.date` (lokale datum, geen UTC-conversiebug -- bevestigd via bestaande `fSleepUnit`/timezone-tests).
**RAW/DERIVED/MANUAL:** beide ondersteund, expliciet onderscheiden via `hrv_source`.
**MISSING-DATA SEMANTICS:** `null`, nooit `0` (live herbevestigd tijdens deze sprint).
**EVIDENCE LEVEL:** C (signaal-niveau, geen klinisch instrument).
**LIMITATIONS (nieuw, deze sprint vastgelegd, gedeeltelijk verbeterd
in een latere long-run-sprint):** het onderliggende berekeningstype
(RMSSD vs SDNN) wordt nu expliciet vastgelegd via `hrv_log.
hrv_metric_type` (rmssd/sdnn/unknown, default 'unknown' voor alle
bestaande en nieuwe rijen) -- de ONZEKERHEID zelf is nu zichtbaar
i.p.v. stilzwijgend aangenomen. De daadwerkelijke, correcte waarde
kan nog niet automatisch worden ingevuld: dit vereist live verificatie
van de Google Health `dataSource`-metadata, wat real-API-toegang
vereist (extern geblokkeerd sinds B9-H3C). Een baseline blijft intern
consistent zolang de gebruiker niet van apparaattype wisselt.
**ALLOWED DECISION RULES:** HRV is één van zes `READINESS_SIGNALEN`
(hrv/rhr/slaap/spierherstel/gevoel/trainingsbelasting) -- nooit
enkelvoudig doorslaggevend (bevestigd: 0 treffers voor een harde,
enkelvoudige HRV-drempel-regel).
**FORBIDDEN INTERPRETATIONS:** HRV alleen = overtraining; HRV alleen =
ziekte; HRV alleen = verplichte rust.
**AI PERMISSIONS:** mag de bestaande, berekende readiness-output
uitleggen; mag NOOIT zelfstandig HRV herinterpreteren als klinische
waarheid.
**USER-FACING MEANING:** een signaal, niet een diagnose.

## B. RESTING HEART RATE (RHR)

**CANONICAL FIELD:** `hrv_log.rhr` (integer, bpm).
**UNIT:** slagen per minuut.
**SOURCE:** `rhr_source`, zelfde patroon als HRV.
**MISSING-DATA SEMANTICS:** `null`, live herbevestigd.
**EVIDENCE LEVEL:** C.
**ALLOWED DECISION RULES:** zelfde multi-signaal-architectuur als HRV.

## C. SLEEP

**CANONICAL FIELD:** `hrv_log.sleep` (numeric).
**UNIT:** herbevestigd via `fSleepUnit.test.js` (60/60 assertions) --
expliciete eenheidstests bestaan, geen ambiguïteit gevonden.
**EVIDENCE LEVEL:** C. Sleep-STAGES worden niet apart opgeslagen
(Google Health `exercise`/health-daily-sync levert vandaag alleen een
duur-samenvatting, geen stage-detail) -- correct, geen false precision.

## D. SUBJECTIVE RECOVERY / WELLNESS

**CANONICAL FIELD:** `hrv_log.note`/`edema` (vrije tekst/categorisch).
**EVIDENCE LEVEL:** D (subjectief, self-report).
**FORBIDDEN INTERPRETATIONS:** subjectieve notities worden niet
automatisch gekwantificeerd of in een score omgezet zonder expliciete,
bestaande regel.

## E. TRAINING LOAD CONTEXT

**CANONICAL FIELD:** canonieke training-history (`activities`/
`programs`), NIET gedupliceerd in `hrv_log`. Bevestigd: geen aparte
recovery-load-kopie gevonden -- correct, één bron van waarheid (sectie
5: "geen parallelle waarheden").

## F. RECOVERY / READINESS OUTPUTS

**CANONICAL FIELD:** berekend in `core/decision.js`, `READINESS_
SIGNALEN`-gebaseerd, geen aparte opslagtabel voor de uitkomst zelf
(berekend on-demand uit de onderliggende signalen -- correct,
voorkomt stale, gecachte readiness-scores).
**ALLOWED DECISION RULES:** multi-signaal, gewogen, geen enkelvoudige
trigger.
**FORBIDDEN:** provider-specifieke readiness-scores (bijv. een
toekomstige Garmin Body Battery) worden nooit direct doorgegeven als
Trainingskompas-readiness (bevestigd architectuurprincipe, consistent
met B9-H3A/B/C se "provider-derived blijft provider-derived").
**AI PERMISSIONS:** mag de berekende readiness uitleggen en
contextualiseren; berekent nooit zelf opnieuw.
