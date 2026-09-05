# Human Coach/PT Integration + Canonical Messaging Foundation — Implementation Report

Branch: `functional/human-coach-messaging-foundation`. Runtime sprint,
geen audit-document. Vervolg op PR #234 (audit-only, ongewijzigd
gelaten).

## WHAT EXISTED (vóór deze sprint, forensisch bevestigd)

- `core/coachAccess.js` (F10.1, MS-F10-01): pure, geversioneerde
  scope-logica (TRAINING_CORE/RECOVERY_HEALTH/WOMENS_PERFORMANCE,
  default-uit voor gevoelige scopes, zelf-elevatie onmogelijk).
  **Geen testbestand.** Nergens aangeroepen vanuit `index.html`.
- `core/coachRoster.js` (F10.2, MS-F10-02): pure roster-opbouw op basis
  van actieve relaties + scopes. **Geen testbestand.** Nergens
  aangeroepen vanuit `index.html`.
- `core/coachIntelligence.js`, `core/coachProgram.js`: aanwezig, niet
  onderzocht in deze sprint (buiten scope: geen messaging-relevantie).
- Database: `coach_athlete_relationships` en `coach_access_scopes`
  bestonden al **volledig, met correcte, productieklare RLS-policies**
  (bevestigd via `pg_policies`): lifecycle pending->active (uitsluitend
  door de athlete), revoke (door beide partijen), insert uitsluitend als
  pending met `requested_by = auth.uid()`. Functies `coach_has_scope()`,
  `is_relationship_athlete()`, `is_relationship_coach()` bestonden al,
  `SECURITY DEFINER` met vast `search_path=public`.
- Geen enkele messaging-tabel bestond (bevestigd, 0 treffers op
  `%message%`/`%conversation%`/`%thread%`).

**Conclusie vooraf, bevestigd:** Human Coach was preciezer
"IMPLEMENTED (client-logica + database-RLS), NOT TESTED, NOT
INTEGRATED (client)" dan "architecture only" -- de database-kant was
al veel verder dan eerdere audits impliceerden.

## WHAT IS NOW INTEGRATED (deze sprint)

### Database (nieuwe, additieve migratie `ms_f_messaging_foundation_v1`)

Drie nieuwe tabellen: `message_threads`, `message_participants`,
`messages`. Geen bestaande tabel gewijzigd. RLS aan op alle drie,
`revoke all ... from anon` expliciet.

**Data model:**
- `message_threads`: `thread_type` (DIRECT/COACH_ATHLETE/GROUP/TEAM),
  `context_relationship_id` (FK naar `coach_athlete_relationships`),
  `context_group_id`/`context_team_id` (voorbereid, nog niet
  geschreven-naar in deze sprint), `status`.
- `message_participants`: `(thread_id, user_id)` PK, `participant_role`,
  `last_read_at`, `is_blocked`.
- `messages`: `sender_user_id`, `sender_type` (ATHLETE/HUMAN_COACH/
  AI_COACH/SYSTEM, met een check-constraint die SYSTEM-berichten een
  NULL sender_user_id verplicht en alle andere types juist niet), `body`
  (1-4000 tekens).

**RLS (per policy, doel):**
- `mt_select_participant`/`mp_select_participant`/`m_select_participant`:
  uitsluitend zichtbaar voor participanten (via `is_thread_participant()`,
  `SECURITY DEFINER`, vast `search_path`, zelfde bewezen patroon als
  `coach_has_scope()`).
- `mt_insert_direct`: iedereen mag een DIRECT-thread aanmaken.
- `mt_insert_coach_athlete`: uitsluitend aanmaakbaar bij een bestaande,
  ACTIEVE relationship waarin de aanmaker coach of athlete is -- geen
  nieuwe autorisatie, hergebruikt exact de bestaande relationship-rij.
- `mp_insert_self`: je mag uitsluitend jezelf toevoegen als participant.
- `mp_insert_coach_athlete_counterpart`: de tegenpartij van een
  al-geverifieerde, actieve relationship mag automatisch worden
  toegevoegd door de aanmakende partij (nodig om een 1-op-1 coach-
  athlete-thread te kunnen opzetten zonder een aparte "invite"-stap
  voor iets waar al expliciete consent voor bestaat).
- `m_insert_own_sender`: `sender_type <> 'SYSTEM'`, `sender_user_id =
  auth.uid()`, moet participant zijn, mag niet geblokkeerd zijn. Dit is
  de directe, server-side afdwinging tegen sender-forgery.

**GEEN gevoelige data in dit model:** geen kolom verwijst naar of
dupliceert HRV/sleep/recovery/Women's Performance/nutrition-data. Een
COACH_ATHLETE-thread geeft uitsluitend recht op *communicatie*, nooit
impliciet op health-scopes -- die blijven volledig, ongewijzigd via
`CoachAccessCore.hasScope()` lopen.

### Validatiepoging en eerlijke beperking (belangrijk, transparant)

Ik heb geprobeerd de RLS-policies adversarieel te valideren door als
twee verschillende, gesimuleerde gebruikers (via `set_config` op
`role`/`request.jwt.claims`) te queryen. Dit toonde aanvankelijk een
schijnbare lek (gebruiker B zag een thread waar hij geen participant
van was). Grondig onderzoek wees uit dat de onderliggende
SQL-tool-verbinding altijd verbindt als `session_user=postgres`, de
**eigenaar** van de tabel, en `relforcerowsecurity=false` staat --
in PostgreSQL wordt RLS dan voor de eigenaar genegeerd, ongeacht de
`role`-instelling. Ik heb bevestigd dat dit **exact dezelfde,
bestaande configuratie is als de al langer productie-draaiende
`coach_athlete_relationships`- en `hrv_log`-tabellen** (zelfde owner,
zelfde `relforcerowsecurity=false`) -- dit is dus een beperking van
mijn testmethode via deze specifieke tool-verbinding, niet een nieuw,
door mij geïntroduceerd risico. De echte, productie-app verbindt nooit
als tabel-eigenaar (uitsluitend via PostgREST met de `authenticated`/
`anon`-rol), waar deze eigenaar-bypass niet van toepassing is.

**Eerlijke consequentie:** de RLS-policies zijn syntactisch correct,
logisch nagerekend, en volgen 1:1 hetzelfde, bewezen patroon als de
al-werkende coach-tabellen -- maar zijn in deze sprint **niet
end-to-end, black-box adversarieel gevalideerd** via een echte
PostgREST-aanroep met een echt JWT (ik had geen veilige toegang tot
een test-gebruikers-token binnen deze sessie). Dit is expliciet een
open punt, geen verzwegen risico.

### Client-side (nieuw)

- `core/messaging.js` (nieuw, 28/28 tests): pure, deterministische
  spiegel van de RLS-regels (`isParticipant`, `canCreateDirectThread`,
  `canCreateCoachAthleteThread`, `resolveSenderType`, `canSendMessage`,
  `renderSenderLabel`, `unreadCount`). Expliciet gedocumenteerd: dit is
  UI-logica, nooit de security-boundary.
- `core/coachAccess.test.js` (nieuw, 20/20 tests): eerste testdekking
  ooit voor deze module. Adversariale gevallen: zelf-elevatie-preventie,
  cross-relationship-scope-lekkage, default-uit voor gevoelige scopes.
- `core/coachRoster.test.js` (nieuw, 11/11 tests): cross-coach-isolatie,
  pending/revoked-uitsluiting uit het roster.

**Geen client-side UI-integratie (geen scherm) in deze sprint** --
conform de expliciete opdracht ("geen nieuw Coach-/Samen-hoofdscherm").
De canonical modellen en hun tests bewijzen de logica; een daadwerkelijk
end-to-end-scherm blijft toekomstig werk.

## DATA MODEL (samenvatting)

```
ATHLETE / COACH  --(coach_athlete_relationships, ongewijzigd)-->  RELATIONSHIP
RELATIONSHIP + coach_access_scopes (ongewijzigd)  -->  PERMISSION/SCOPE
RELATIONSHIP (actief)  -->  message_threads (COACH_ATHLETE)  -->  message_participants  -->  messages
```

Geen parallel model gecreëerd. `coach_program_assignments`/
`coach_program_templates` (bestaand, ongewijzigd) blijven het canonical
pad voor programma-toewijzing/feedback -- niet aangeraakt in deze
sprint (buiten messaging-scope).

## PRIVATE NOTES vs. ATHLETE-VISIBLE FEEDBACK

**Niet gebouwd in deze sprint.** Geen "coach private note"-tabel
bestond al en is er niet bijgekomen -- dit blijft een open punt, expliciet
niet verward met de messaging-foundation (een bericht in een
COACH_ATHLETE-thread is per definitie athlete-visible; een private
note zou een aparte tabel/RLS vereisen die een athlete nooit mag lezen,
en die ontbreekt vooralsnog volledig).

## AI COACH BOUNDARY (regressie bevestigd)

`sender_type='AI_COACH'` is een expliciet, apart type in het nieuwe
model. `MessagingCore.renderSenderLabel()` garandeert (getest,
adversarieel) dat AI_COACH en HUMAN_COACH nooit hetzelfde label/dezelfde
representatie kunnen krijgen, en dat een onbekend/vervalst sender_type
nooit stilzwijgend als een van beide wordt getoond. De bestaande AI
Coach-keten (`coaching.js`, `coachProgramming.js`, 80/80 + 13/13 tests,
ongewijzigd) is niet aangeraakt.

## NOTIFICATIONS

**Niet geïntegreerd in deze sprint.** Het notification-domein was al
eerder als "not investigated" gemarkeerd; er is in deze sprint geen
bestaande, canonical notification-infrastructuur gevonden of bevestigd
om op aan te sluiten binnen de resterende tijd. Expliciet open,
geen tweede systeem gebouwd.

## ERROR/DEGRADED STATES

**Niet systematisch getest in deze sprint** (network failure, duplicate
send, revoked-during-session, etc.) -- de kern-RLS-regels garanderen
fail-closed-gedrag bij authorization-onzekerheid (geen enkele policy
geeft toegang bij ontbrekend bewijs van participantschap), maar
expliciete degraded-state-tests voor de client zijn niet geschreven.

## TESTS

- `core/messaging.test.js`: 28/28
- `core/coachAccess.test.js`: 20/20 (nieuw)
- `core/coachRoster.test.js`: 11/11 (nieuw)
- Release gate (volledig): 242/242 (was 239, +3 nieuwe bestanden)
- Android: 29/29
- Cross-domain steekproef (fCoachAccessRls, fCoachProgramRls,
  fCoachProxySecurity, fSocialRlsMultiTenant, fWomensPrivacyConsent,
  coaching, coachProgramming): allemaal individueel bevestigd groen
- Doc consistency: schoon

## KNOWN LIMITATIONS (expliciet, geen verzwegen risico)

1. RLS-policies niet black-box, end-to-end adversarieel gevalideerd
   (tool-beperking, zie boven) -- wel syntactisch correct en 1:1
   overeenkomstig het bewezen bestaande patroon.
2. Geen UI/scherm-integratie (bewust, buiten scope).
3. Geen private-notes-model.
4. Geen notification-integratie.
5. Geen GROUP/TEAM-schrijfpad daadwerkelijk gebruikt (wel
   architectonisch voorbereid in de migratie, check-constraints staan
   dit toe).
6. Geen error/degraded-state-tests voor de client-flows.

## PO DECISIONS STILL OPEN

- Wanneer/hoe een daadwerkelijk Coach v0.2-scherm deze foundation gaat
  gebruiken.
- Private coach notes: apart model laten ontwerpen of bewust uitstellen.
- Welke notification-infrastructuur (bestaand of nieuw te bouwen) de
  message-events moet dragen.
- GROUP/TEAM messaging: wanneer dit daadwerkelijk geactiveerd wordt.
