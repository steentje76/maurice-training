# B9-H2C Team Operations UI Requirements

**Reden dat UI nu vereist is:** het volledige, functionele backend-
fundament (planning, meeting-time, lifecycle, availability, attendance,
responsibilities, notificaties) is nu compleet en veilig, maar 0%
ervan is bereikbaar voor een echte gebruiker. Zonder scherm blijft de
gebruikerswaarde nul, ongeacht hoe volwassen de backend is (sectie 58).

## PRODUCT CAPABILITY 1 — Team-agenda/overzicht

**PRIMARY USERS:** alle actieve teamleden (member/coach/manager).
**REQUIRED USER ACTIONS:** aankomende team-events zien; een event
openen voor details.
**REQUIRED INFORMATION:** datum, starttijd, verzameltijd (indien
afwijkend), locatie, event-type, eigen beschikbaarheids-/
aanwezigheidsstatus.
**REQUIRED STATES:** loading; leeg (geen aankomende events); error;
succes.
**PERMISSION DIFFERENCES:** members zien alleen lezen; coach/manager
zien een "wijzigen"/"annuleren"-actie.
**ERROR STATES:** netwerkfout bij laden -- expliciet, geen "geen
events" tonen bij een mislukte query.
**EMPTY STATES:** "Nog geen geplande teamtrainingen" + (voor
coach/manager) een CTA om er een aan te maken.
**BACKEND FUNCTIONS:** directe select op `team_events` (RLS-beveiligd).
**DATA CONTRACTS:** bestaand schema, geen wijziging nodig.
**SECURITY REQUIREMENTS:** ongewijzigd, RLS reeds bewezen.
**WHAT MUST NOT CHANGE:** geen wijziging aan de canonieke `team_events`/
`memberships`-tabellen nodig voor dit scherm.

## PRODUCT CAPABILITY 2 — Event aanmaken/wijzigen/annuleren

**PRIMARY USERS:** coach/manager (organisatie-staff-rollen).
**REQUIRED USER ACTIONS:** nieuw event aanmaken (titel, datum, tijd,
verzameltijd, locatie, type); bestaand event wijzigen; event
annuleren; event dupliceren naar een nieuwe datum (recurring, sectie 14).
**REQUIRED INFORMATION:** zelfde velden als hierboven, plus een
duidelijke "dit annuleert het event voor het hele team"-bevestiging.
**REQUIRED STATES:** loading tijdens opslaan; succes; error (blijf op
het formulier, toon de fout, verlies geen ingevoerde data).
**PERMISSION DIFFERENCES:** uitsluitend coach/manager/admin, server-side
afgedwongen via de bestaande `team_has_access()`.
**ERROR STATES:** een mislukte `update_team_event_notify()`-aanroep
mag nooit doen alsof de wijziging is opgeslagen.
**EMPTY STATES:** N.v.t. (formulier).
**BACKEND FUNCTIONS:** `update_team_event_notify()`,
`cancel_team_event_notify()`, gewone insert op `team_events` (RLS) +
`notify_team_event_created()`.
**DATA CONTRACTS:** bestaand, in deze sprint uitgebreid schema.
**SECURITY REQUIREMENTS:** ongewijzigd, reeds live bevestigd (S4-scenario).
**WHAT MUST NOT CHANGE:** de RPC-signatures zoals in migratie_v540.sql.

## PRODUCT CAPABILITY 3 — Beschikbaarheid opgeven

**PRIMARY USERS:** alle teamleden.
**REQUIRED USER ACTIONS:** vóór een event aangeven: beschikbaar/niet
beschikbaar/onzeker.
**REQUIRED INFORMATION:** eigen, huidige status per aankomend event.
**REQUIRED STATES:** loading; succes (directe feedback); error.
**PERMISSION DIFFERENCES:** een lid mag uitsluitend de eigen
beschikbaarheid wijzigen (sectie 49) -- geen management-capability
gebouwd in deze sprint om andermans beschikbaarheid te wijzigen.
**ERROR STATES:** een mislukte update mag de lokale, getoonde status
niet stil overschrijven met een onjuiste "gelukt"-indruk.
**EMPTY STATES:** "Nog geen reactie gegeven" i.p.v. een default-waarde.
**BACKEND FUNCTIONS:** directe insert/update op `event_attendance`
met `stage='availability'` (RLS: `user_id = auth.uid()`).
**DATA CONTRACTS:** `event_attendance.stage`, nieuw in deze sprint.
**SECURITY REQUIREMENTS:** RLS bevestigt dat een gebruiker uitsluitend
de eigen availability-rij mag muteren -- ook coach/staff kan dit niet
overrulen. Live, adversariaal bevestigd tijdens deze sprint (nadat
eerst het gerelateerde attendance-gat hieronder werd gevonden en
gerepareerd, is expliciet herbevestigd dat de availability-kant strikt
self-only is gebleven).
**WHAT MUST NOT CHANGE:** geen.

## PRODUCT CAPABILITY 4 — Aanwezigheid registreren (na afloop)

**PRIMARY USERS:** coach/manager.
**REQUIRED USER ACTIONS:** per teamlid aanwezig/afwezig registreren
na een event.
**REQUIRED INFORMATION:** ledenlijst met huidige aanwezigheidsstatus.
**REQUIRED STATES:** loading; succes; error.
**PERMISSION DIFFERENCES:** coach/manager/staff kan attendance voor
elk teamlid registreren; een gewoon lid uitsluitend voor zichzelf.
**Zelf gevonden en gerepareerd tijdens deze sprint:** de oorspronkelijke
RLS stond dit nog helemaal niet toe (uitsluitend self-mutatie voor
zowel availability als attendance) -- gecorrigeerd zodat staff nu wél
attendance van anderen mag muteren, terwijl availability strikt
self-only is gebleven. Live, adversariaal bevestigd op beide punten.
**ERROR STATES:** idem als hierboven.
**EMPTY STATES:** "Nog geen deelnemers geregistreerd".
**BACKEND FUNCTIONS:** insert/update op `event_attendance` met
`stage='attendance'`.
**DATA CONTRACTS:** bestaand.
**SECURITY REQUIREMENTS:** zie hierboven, open aandachtspunt.
**WHAT MUST NOT CHANGE:** geen.

## PRODUCT CAPABILITY 5 — Taken/materiaal toewijzen

**PRIMARY USERS:** coach/manager (toewijzen), alle leden (eigen taken zien).
**REQUIRED USER ACTIONS:** een taak aanmaken en toewijzen aan een
teamlid; een toegewezen taak als "gedaan" markeren.
**REQUIRED INFORMATION:** taakomschrijving, toegewezen persoon,
deadline (optioneel), status.
**REQUIRED STATES:** loading; succes; error.
**PERMISSION DIFFERENCES:** toewijzen = coach/manager; "als gedaan
markeren" = de toegewezen persoon zelf, of coach/manager.
**ERROR STATES:** idem.
**EMPTY STATES:** "Geen taken voor dit event".
**BACKEND FUNCTIONS:** `assign_event_responsibility_notify()`.
**DATA CONTRACTS:** bestaand, ongewijzigd `event_responsibilities`.
**SECURITY REQUIREMENTS:** reeds live bevestigd (S5-scenario).
**WHAT MUST NOT CHANGE:** geen.

## Samenvatting: backend-verificaties, alle afgerond binnen deze sprint

Beide RLS-vereisten zijn tijdens deze sprint zelf ontdekt, gerepareerd
en live geverifieerd: (a) een lid kan uitsluitend de eigen
`availability`-rij muteren, ook coach/staff kan dit niet overrulen; (b)
coach/manager/staff kan een `attendance`-rij van elk teamlid muteren.
Geen resterende backend-blokkers voor de hierboven beschreven vijf
capabilities.
