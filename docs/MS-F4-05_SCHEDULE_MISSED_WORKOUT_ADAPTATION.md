# MS-F4-05_SCHEDULE_MISSED_WORKOUT_ADAPTATION.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json, leidend):** "Schedule & Missed-workout Adaptation" -- "Adapt safely to adherence and event proximity." Track: Decision & Rules Engine (geen AI-capability gekoppeld).

## Kernbevinding: volledig bestaande, actief gebruikte architectuur
core/scheduleAdherence.js (ScheduleAdherenceCore, scheduleAdherence.v1) bestaat al sinds "Program Adaptation V1" en is puur deterministisch (eigen bestandscommentaar: "AI is hier nergens de bron van waarheid"). Runtime-trace bevestigt uitgebreid, actief gebruik:

- daysUntilEvent()/weeksUntilEvent(): gebruikt op minimaal 3 schermen, inclusief binnen buildCtx() -- event-nabijheid voedt dus al de AI-coachcontext als feitelijke, canonieke data.
- resolveScheduleGap(): bepaalt deterministisch COMPLETED/SKIPPED/FUTURE/TODAY/MISSED per block, met correcte voorrangsvolgorde.
- resolveRescheduleDecision()/hasScheduleConflict(): bij een botsing altijd CONFLICT_WARNING + expliciete confirmModal()-bevestiging -- nooit stille overschrijving, bevestigd via runtime-trace.
- Elke reschedule bewaart rescheduled_from en reschedule_reason ('missed'/'early'/'manual') -- reeds bestaande, veld-niveau provenance.

## "Adapt safely" -- expliciete architectuurgrenzen bevestigd nageleefd
- Een reschedule raakt uitsluitend het aangeklikte block (nooit week_nr, nooit fase_naam, nooit andere blocks).
- Geen enkele functie roept Supabase, de DOM, of Date.now() intern aan -- today wordt altijd expliciet meegegeven (puur, testbaar).

## Kleine, niet-blokkerende bevinding
sessionsMissed() (feitelijke telling van gemiste trainingen) is geëxporteerd maar niet aangeroepen in de runtime -- geen dubbele/eigen telling elders gevonden. Geregistreerd als niet-kritieke observatie.

## MS-F4-05 acceptance-gate-toetsing
Letterlijke acceptance gate: "Adapt safely to adherence and event proximity."
Resultaat: CLOSED. Beide aspecten bevestigd via runtime-trace, geen herbouw nodig.
