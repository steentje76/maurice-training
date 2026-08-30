# MS-F10-03_COACH_PROGRAMMING_ASSIGNMENT.md — Trainingskompas

**Canonieke naam/acceptance:** "Coach Programming & Assignment" -- "Templates/assignment/calendar/adherence." P2, dependency MS-F10-02 (CLOSED).

## Voorgeschiedenis: kritieke architecturale bevinding (PR #144)
Een eerste implementatiepoging (coach schrijft direct in public.programs met user_id=athlete) bleek niet te werken: een bestaande trigger (trg_set_user_id) dwingt onvoorwaardelijk user_id=auth.uid() af. Live adversarial bevestigd, direct gecorrigeerd (niet-werkende policy verwijderd, geen lek), vastgelegd als GAP-P2-023.

## Product Owner-architectuurbeslissing
Behoud de bestaande trigger-invariant volledig intact. Drie gescheiden verantwoordelijkheden: coach-authored templates, assignment, athlete-owned materialisatie via een smalle, athlete-geinitieerde RPC.

## Geimplementeerd
- coach_program_templates: coach-owned programma-ontwerp.
- coach_program_assignments (uitgebreid): koppelt template aan athlete, status-flow, materialized_program_id.
- materialize_coach_assignment() RPC: uitsluitend aanroepbaar door de athlete zelf. De INSERT gebeurt terwijl auth.uid()=athlete is -- de bestaande trigger zet user_id vanzelf, correct. Geen bypass, geen vrije payload, idempotent.

## Live adversarial geverifieerd
1. Volledige flow: coach maakt template, wijst toe, athlete materialiseert -> programs.user_id=athlete.
2. Coach probeert zelf te materialiseren -> expliciete fout.
3. Idempotentie: tweemaal aanroepen geeft 1 rij, geen duplicaat.
4. Derde partij kan de assignment niet eens ophalen (RLS blokkeert al).

## Sabotagebewijs conform de Product Owner-instructie
Een poging om opnieuw een coach-direct-insert-policy op programs toe te voegen werd door de nieuwe testsuite exact gedetecteerd -- de gate faalde zoals bedoeld.

## Tests
core/fCoachProgramCore.test.js (13/13), core/fCoachProgramRls.test.js (8/8). Beide met sabotagebewijs.

## Calendar/Adherence: hergebruik, geen tweede engine
Een gematerialiseerd programma is een gewoon, canoniek programs-record -- het loopt automatisch door de bestaande ScheduleAdherenceCore/AdherenceIntelligenceCore-keten en de bestaande kalender-UI, zonder coach-specifieke aanpassing.

## Eerlijk vastgelegde, bewuste scopegrens
De huidige materialisatie maakt uitsluitend het programs-basisrecord aan (naam/sport/status) -- het omzetten van template-content naar daadwerkelijke program_blocks/geplande trainingsdagen is niet in deze sprint gebouwd. Zonder deze stap toont de agenda een leeg, geaccepteerd programma zonder geplande sessies.

## MS-F10-03 acceptance-gate-toetsing
Letterlijke acceptance gate: "Templates/assignment/calendar/adherence."
Resultaat: **IMPLEMENTED, niet CLOSED.** Templates: volledig werkend. Assignment: volledig werkend (de kern van GAP-P2-023 is opgelost, adversarial bewezen). Calendar/Adherence: architecturaal bewezen te werken zodra content bestaat, maar content-materialisatie zelf (template naar program_blocks) is nog niet gebouwd -- dit is de resterende stap vóór MS-F10-03 als CLOSED gemarkeerd kan worden.
