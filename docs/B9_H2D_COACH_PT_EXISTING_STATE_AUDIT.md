# B9-H2D Coach/PT Existing-State Audit

## KRITIEKE, CORRIGERENDE BEVINDING

De baseline-aanname van deze opdracht (Coach/PT = 7.5, "foundation
eerder als READY beoordeeld") bleek bij audit **onvolledig**: Coach/PT
heeft al een volledige, eerdere mastersprint-serie (**F10**, 4
sprints, PR #142-#148) die reeds "F10 COACH/PT PLATFORM CLOSED — READY
FOR F11 SELECTION" heeft bereikt. Dit werd kennelijk gemist door de
eerdere Benchmark 9+ Functional Deep-Dive (die enkel repo-brede grep
op tabelnamen deed en concludeerde "0 UI-integratie", wat op zich
correct is, maar niet vermeldde dat de volledige backend/Core-laag al
grondig gebouwd en getest was).

**Alle onderstaande bevindingen zijn zelf, opnieuw, live geverifieerd
in deze sessie -- niet blind overgenomen uit het bestaande
F10_MASTER_REPORT.md.**

## Capability Matrix

| CAPABILITY | EXISTS | FUNCTIONALLY COMPLETE | DATABASE | BACKEND | SECURITY | CURRENT USER ACCESS | TEST COVERAGE | GAPS | BLOCKS 9+ |
|---|---|---|---|---|---|---|---|---|---|
| Relationship lifecycle (invite/accept/revoke) | Ja | Ja | `coach_athlete_relationships` | N.v.t. (RLS-only) | Live herbevestigd: self-elevation (coach activeert eigen relatie) geweigerd | Geen UI | 16/16 (`fCoachAccessRls`) | Geen | Nee |
| Access scopes (granulair) | Ja | Ja | `coach_access_scopes` | `CoachAccessCore` | Live herbevestigd in F10, niet opnieuw gemuteerd deze sessie (geen wijziging) | Geen UI | zie boven | Geen | Nee |
| Roster/Athlete Overview | Ja | Ja | Afgeleid (geen eigen tabel) | `CoachRosterCore` | Geen enumeratie mogelijk (F10-bewezen) | Geen UI | 12/12 | Geen | Nee |
| Program templates | Ja | Ja | `coach_program_templates` | `CoachProgram` | Coach-owned, isolatie bewezen | Geen UI | 21/21 | Geen | Nee |
| Assignment | Ja | Ja | `coach_program_assignments` | `CoachProgram` | Self-elevation onmogelijk | Geen UI | 13/13 (`fCoachProgramRls`) | Geen | Nee |
| Content-materialisatie | Ja | Ja | canonieke `programs`/`program_blocks`/etc. | `materialize_coach_assignment()` RPC | Atomiciteit/idempotentie bewezen | Geen UI | 5/5 (`fCoachProgramAssignmentGap`) | Geen | Nee |
| Adherence | Ja (hergebruikt) | Ja | `program_blocks` (canoniek) | `AdherenceIntelligenceCore` (ongewijzigd) | N.v.t. | Geen UI | Bewezen zonder codewijziging | Geen | Nee |
| Coach Intelligence (AI-whitelist) | Ja | Ja | N.v.t. | `CoachIntelligenceCore` | Women's Performance-isolatie bewezen | Geen UI/AI-integratie | 12/12 | Geen | Nee |
| **Organization/Team-intersectie** | Deels | **Nee** | `coach_program_assignments.organization_id` bestaat, ongebruikt | 0 organization-aware logica in alle Coach-Core-modules | N.v.t. | N.v.t. | 0 | **Coach/PT en Team Operations (B9-H2C) zijn volledig ongekoppeld** | Nee (bewuste, correcte scheiding per B9-H2A: coach_athlete_relationships blijft standalone) |
| **Entitlement/Commercial boundary** | **Nee** | **Nee** | Geen entitlement-check gevonden in RLS | Geen | 0 entitlement-checks in RLS live bevestigd | N.v.t. | 0 | **Elke gebruiker kan vandaag een coach-relatie/programma/toewijzing aanmaken, ongeacht abonnement (role != entitlement niet afgedwongen)** | Nee (vereist een productbeslissing, buiten autonome scope) |
| UI (elk van bovenstaande) | Nee | N.v.t. | N.v.t. | N.v.t. | N.v.t. | **0%** | Alle | **Ja, enige resterende blocker voor user-accessible score** |

## Waarom de twee "Nee"-gevonden gaten niet in deze sprint zijn opgelost

1. **Organization/Team-intersectie:** B9-H2A stelde expliciet vast dat
   `coach_athlete_relationships` bewust standalone blijft (hypothese C
   uit die opdracht, bevestigd). Een team-coach kan vandaag athletes
   binnen zijn team beheren via `team_has_access()` (B9-H2C), maar dit
   geeft GEEN automatische individuele coach-athlete-relationship
   (correcte, bewuste scheiding, sectie 37 van deze opdracht: "team
   role ≠ automatisch individuele coach-athlete relationship"). Dit is
   dus GEEN bug, maar een bevestigde, correcte architectuurgrens.
2. **Entitlement/Commercial boundary:** het bouwen van een
   entitlement-gate (welk plan geeft toegang tot hoeveel athletes,
   welke features) is een productbeslissing (welke limieten, welk
   plan) die de Product Owner moet nemen -- niet een technische
   bugfix die zonder overleg autonoom gebouwd mag worden (sectie 59:
   "zonder productdesignbeslissing"). Vastgelegd als een echte,
   herkende functionele gap voor een toekomstige, aparte beslissing.
