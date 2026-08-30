# MS-F10-02_COACH_ROSTER_ATHLETE_OVERVIEW.md — Trainingskompas

**Canonieke naam/acceptance:** "Coach Roster & Athlete Overview" -- "Scalable multi-athlete workflow." P2, dependency MS-F10-01 (CLOSED).

## Architectuur
CoachRosterCore voegt geen nieuwe autorisatie toe -- het bouwt voort op twee reeds bewezen fundamenten: de bestaande, correcte RLS op coach_athlete_relationships (een coach ziet server-side sowieso uitsluitend eigen relaties) en CoachAccessCore/coach_has_scope() uit MS-F10-01.

## Roster
buildRoster(): uitsluitend athletes met een ACTIEVE relatie. Pending en revoked relaties verschijnen nooit. Geen globale user directory -- een coach kan nooit willekeurige athletes enumereren.

## Athlete Overview
athleteOverviewSections(): retourneert uitsluitend de secties waarvoor daadwerkelijk toestemming bestaat. Een ontbrekende toestemming laat de sectie volledig weg -- geen "vergrendeld"-kaart die de inhoud zou verraden.

## Tests
core/fCoachRosterCore.test.js (12/12): roster-isolatie tussen coaches, pending/revoked-uitsluiting, veilige lege input, sectie-filtering. Sabotagebewijs: de coachId-filter tijdelijk verwijderd, exact gedetecteerd.

## MS-F10-02 acceptance-gate-toetsing
Letterlijke acceptance gate: "Scalable multi-athlete workflow."
Resultaat: CLOSED. Het roster-contract schaalt naar elk aantal athletes zonder enumeratierisico, en de overview-sectie-filtering is deterministisch en volledig getest.
