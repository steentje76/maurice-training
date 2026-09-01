# B9-H2D Coach/PT UI Requirements

**Reden dat UI nu vereist is:** F10 bouwde een volledig, grondig
getest backend/Core-platform (relationship/consent/scopes/roster/
programming/assignment/materialisatie/adherence/AI-intelligence), maar
0% ervan is toegankelijk voor een echte coach of athlete.

## PRODUCT CAPABILITY 1 — Relationship/invite management

**PRIMARY USER:** coach (initieert), athlete (accepteert/weigert).
**ATHLETE USER IMPACT:** athlete moet een uitnodiging kunnen zien,
accepteren/weigeren, en scopes kunnen instellen/wijzigen.
**REQUIRED COACH ACTIONS:** athlete uitnodigen (bijv. via e-mail/
identifier), relatie beëindigen.
**REQUIRED ATHLETE ACTIONS:** uitnodiging accepteren/weigeren, scopes
instellen (TRAINING_CORE/RECOVERY_HEALTH/WOMENS_PERFORMANCE, elk apart
aan/uit), relatie beëindigen.
**REQUIRED DATA:** relatiestatus, coach-identiteit, huidige scopes.
**REQUIRED STATES:** loading; leeg (geen relaties); error; succes.
**ROLE/PERMISSION DIFFERENCES:** uitsluitend de athlete kan
pending->active zetten en scopes wijzigen (reeds architecturaal
afgedwongen, F10-bewezen).
**ERROR STATES:** een mislukte invite mag niet doen alsof de coach al
gekoppeld is.
**EMPTY STATES:** "Nog geen coach gekoppeld" + CTA (athlete-kant);
"Nog geen athletes" + CTA (coach-kant).
**BACKEND FUNCTIONS:** directe insert/update op `coach_athlete_
relationships`/`coach_access_scopes` (RLS reeds bewezen).
**DATA CONTRACTS:** bestaand, ongewijzigd.
**SECURITY REQUIREMENTS:** ongewijzigd, reeds live bevestigd.
**PRIVACY REQUIREMENTS:** Women's Performance-scope moet in de UI
even prominent en apart instelbaar zijn als de andere twee -- nooit
impliciet meegenomen bij "alles aanzetten".
**WHAT MUST NOT CHANGE:** de architecturale garantie dat uitsluitend
de athlete zelf de eigen scopes/status kan wijzigen.

## PRODUCT CAPABILITY 2 — Athlete roster/overview (coach-kant)

**PRIMARY USER:** coach.
**REQUIRED COACH ACTIONS:** lijst van eigen athletes zien, een athlete
openen voor een overzicht (afhankelijk van toegestane scopes).
**REQUIRED DATA:** athlete-identiteit, sport, huidige assignment-
status, adherence-samenvatting, relevante, toegestane context.
**REQUIRED STATES:** loading; leeg (nog geen athletes); error; succes.
**ROLE/PERMISSION DIFFERENCES:** een coach ziet uitsluitend eigen,
actieve athletes -- geen enumeratie van andere coaches se athletes
(F10-bewezen).
**ERROR STATES:** idem.
**EMPTY STATES:** "Nog geen athletes gekoppeld" + CTA om uit te
nodigen.
**BACKEND FUNCTIONS:** `CoachRosterCore`-gebaseerde queries (bestaand).
**DATA CONTRACTS:** bestaand.
**SECURITY REQUIREMENTS:** reeds bewezen (12/12).
**PRIVACY REQUIREMENTS:** alleen tonen wat de scope toestaat --
recovery/Women's Performance-secties mogen niet zichtbaar zijn als de
scope niet is toegekend (geen "grijs, uitgeschakeld"-preview die de
aanwezigheid van data verraadt).
**WHAT MUST NOT CHANGE:** de sectie-filtering op scope.

## PRODUCT CAPABILITY 3 — Programma's/templates + toewijzing

**PRIMARY USER:** coach.
**REQUIRED COACH ACTIONS:** een template aanmaken/hergebruiken, een
template toewijzen aan een athlete.
**REQUIRED ATHLETE ACTIONS:** een toegewezen assignment zien en
materialiseren (het "accepteren" ervan als eigen, canonieke training).
**REQUIRED DATA:** template-inhoud, assignment-status.
**REQUIRED STATES:** loading; succes; error (assignment-materialisatie
is atomisch, F10-bewezen -- de UI moet dit correct weergeven, geen
gedeeltelijke state tonen).
**ROLE/PERMISSION DIFFERENCES:** uitsluitend de eigen coach kan
eigen templates wijzigen; materialisatie gebeurt uitsluitend onder de
sessie van de athlete zelf (F10-architectuur, geen coach-side bypass).
**ERROR STATES:** een mislukte materialisatie mag geen half-
gematerialiseerd programma achterlaten (F10 bewijst atomiciteit op
databaseniveau -- de UI moet dit correct communiceren).
**EMPTY STATES:** "Nog geen templates"/"Nog geen toewijzing".
**BACKEND FUNCTIONS:** `materialize_coach_assignment()` (bestaand).
**DATA CONTRACTS:** bestaand.
**SECURITY REQUIREMENTS:** reeds bewezen (21/21 + 13/13 + 5/5).
**PRIVACY REQUIREMENTS:** geen.
**WHAT MUST NOT CHANGE:** de strikte scheiding tussen coach-authored
templates (coach-owned) en athlete-executed programma's (athlete-
owned) -- geen enkele UI-keuze mag deze grens vervagen.

## PRODUCT CAPABILITY 4 — Adherence/voortgang (coach-kant)

**PRIMARY USER:** coach.
**REQUIRED COACH ACTIONS:** per athlete zien hoeveel van een
toegewezen programma is voltooid.
**REQUIRED DATA:** bestaande `AdherenceIntelligenceCore`-output.
**REQUIRED STATES:** loading; succes; error; NOT_AVAILABLE (missing
!= zero, bestaand contract).
**ROLE/PERMISSION DIFFERENCES:** vereist minimaal `TRAINING_CORE`-scope.
**ERROR STATES:** idem.
**EMPTY STATES:** "Nog geen data" i.p.v. 0%.
**BACKEND FUNCTIONS:** bestaand, ongewijzigd.
**DATA CONTRACTS:** bestaand.
**SECURITY REQUIREMENTS:** bestaand.
**PRIVACY REQUIREMENTS:** scope-afhankelijk zichtbaar.
**WHAT MUST NOT CHANGE:** geen nieuwe adherence-berekening in de UI-laag.

## Niet in scope van UI-requirements (vereisen eerst een aparte beslissing)

- **Coach notes/feedback:** ontbreekt volledig in de backend --
  vereist eerst een klein, nieuw databaseontwerp (welke content-
  objecten, welke zichtbaarheid) vóór een UI kan worden gespecificeerd.
- **Entitlement-gating (Coach Pro):** vereist eerst een
  productbeslissing over welk plan welke coach-capaciteit geeft.
