# MS-F10-03_COACH_PROGRAMMING_ASSIGNMENT.md — Trainingskompas

**Canonieke naam/acceptance:** "Coach Programming & Assignment" -- "Templates/assignment/calendar/adherence." P2, dependency MS-F10-02 (CLOSED).

## Voorgeschiedenis: kritieke architecturale bevinding (PR #144)
Een eerste implementatiepoging (coach schrijft direct in public.programs met user_id=athlete) bleek niet te werken: een bestaande trigger (trg_set_user_id) dwingt onvoorwaardelijk user_id=auth.uid() af. Live adversarial bevestigd, direct gecorrigeerd (niet-werkende policy verwijderd, geen lek), vastgelegd als GAP-P2-023.

## Product Owner-architectuurbeslissing
Behoud de bestaande trigger-invariant volledig intact. Drie gescheiden verantwoordelijkheden: coach-authored templates, assignment, athlete-owned materialisatie via een smalle, athlete-geinitieerde RPC.

## Geimplementeerd (deel 1, PR #145)
- coach_program_templates: coach-owned programma-ontwerp.
- coach_program_assignments: koppelt template aan athlete, status-flow, materialized_program_id.
- materialize_coach_assignment() RPC: uitsluitend aanroepbaar door de athlete zelf.

## Geimplementeerd (deel 2, volledige content-materialisatie)
Content-schema (v1): { schema_version, days: [ { week_nr, day_offset, training_name, exercises: [ { exercise_id, sets, reps, rpe } ] } ] }.

Canonieke keten (audit bevestigd, geen nieuwe tabellen): programs -> program_blocks (training_ref -> custom_trainings.id) -> custom_trainings -> training_exercises (canoniek exercise_id). Alle drie child-tabellen hebben elk hun eigen, bestaande trg_set_user_id-trigger -- ownership wordt automatisch, correct afgedwongen voor elk child-record.

CoachProgramCore.validateTemplateContent(): deterministische, pure validator (schema-versie, week/dag-structuur, canonieke exercise-IDs via een meegegeven whitelist, geen duplicaten, geen negatieve/ongeldige waarden). De RPC bevat dezelfde validatie server-side (de daadwerkelijke bron van waarheid).

## Live adversarial geverifieerd (volledige matrix)
1. Volledige flow: coach maakt template met content, wijst toe, athlete materialiseert -> alle vier eigenaarschapskolommen (programs/program_blocks/custom_trainings/training_exercises.user_id) bevestigd correct op de athlete.
2. Coach probeert zelf te materialiseren -> expliciete fout.
3. Derde partij kan de assignment niet eens ophalen (RLS blokkeert al).
4. Onbekend exercise_id -> materialisatie geweigerd, 0 rijen aangemaakt.
5. Midden-in-het-proces-fout (geldige dag 1, kapotte dag 2) -> 0 rijen achtergebleven, volledige atomiciteit bewezen (PL/pgSQL-transactionaliteit).
6. Idempotentie: tweemaal aanroepen geeft 1 rij per child-tabel, geen duplicaat van de volledige content.
7. Revoke: een reeds gematerialiseerd, athlete-owned programma blijft volledig intact na revoke, terwijl nieuwe coach-toegang onmiddellijk stopt.
8. Delete-completeness: coach_program_templates/coach_program_assignments toegevoegd aan delete-account.js; bevestigd dat een verwijderde coach het athlete-owned programma niet raakt.

## Sabotagebewijs
- Een poging om opnieuw een coach-direct-insert-policy op programs toe te voegen werd exact gedetecteerd.
- De exercise-whitelist-check (zowel in CoachProgramCore als in de migratie) tijdelijk uitgeschakeld -- beide keren exact gedetecteerd, teruggedraaid.

## Calendar/Adherence: hergebruik, geen tweede engine (bewezen zonder codewijziging)
AdherenceIntelligenceCore.aggregate() verwerkt een program_blocks-item met exact de structuur die deze materialisatie aanmaakt en geeft een correct adherence-percentage terug. Geen tweede formule, geen coach-specifieke berekening.

## Tests
core/fCoachProgramCore.test.js (21/21, was 13), core/fCoachProgramRls.test.js (13/13, was 8), core/fDeleteAccountSecurity.test.js (25/25, was 23). Alle relevante met sabotagebewijs.

## MS-F10-03 acceptance-gate-toetsing (finaal)
Letterlijke acceptance gate: "Templates/assignment/calendar/adherence."
**Resultaat: CLOSED.** Alle vier onderdelen zijn volledig, adversarial bewezen. Geen tweede workoutmodel, geen trigger-bypass, geen self-elevation, volledige atomiciteit, idempotentie, correct revoke-gedrag, delete-completeness bevestigd.

## Software-bewijs versus real-world validatie
Dit bewijst dat de architectuur correct en veilig is. Het bewijst niet dat coaches en atleten deze workflow in de praktijk prettig of nuttig vinden -- er is nog geen UI gebouwd.
