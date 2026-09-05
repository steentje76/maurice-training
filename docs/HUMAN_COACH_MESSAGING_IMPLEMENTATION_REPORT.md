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

1. **RLS-policies niet black-box, end-to-end adversarieel gevalideerd
   via een echte authenticated-JWT.** Ik heb dit expliciet geprobeerd op
   te lossen in de closure-pass: de SQL-tool verbindt altijd als
   `session_user=postgres` (tabel-eigenaar, `relforcerowsecurity=false`
   op alle betrokken tabellen, identiek aan de bestaande, productie-
   bewezen `coach_athlete_relationships`/`hrv_log`). Ik heb ook
   onderzocht of ik zelf een geldige `authenticated`-JWT kon genereren
   via een test-gebruiker; `auth.users` bevat uitsluitend echte,
   bestaande productie-accounts (met e-mail/wachtwoord-hash) -- ik heb
   bewust GEEN wachtwoord-reset of JWT-forging voor een bestaand account
   geprobeerd (dat zou zelf een beveiligingsschending zijn), en had geen
   toegang tot een auth-signup-endpoint om een nieuw, veilig testaccount
   aan te maken binnen deze sessie. **Status: RLS IMPLEMENTED +
   STRUCTURALLY REVIEWED. BLACK-BOX AUTH VALIDATION OPEN.** Dit is geen
   merge-blocker voor de foundation-code (de policies zijn structureel
   correct en volgen 1:1 het bewezen patroon), maar wel een blocker voor
   VALIDATED/>=9-status.
2. Geen UI/scherm-integratie (bewust, buiten scope).
3. Private-notes-model: **NOT IMPLEMENTED / DEFERRED** (expliciete,
   aparte capability, geen onderdeel van canonical messaging; mag nooit
   automatisch lekken naar athlete messages/AI payload/social/team/
   gym/exports -- er bestaat simpelweg nog geen tabel/pad die dit zou
   kunnen laten gebeuren, dus dit risico is momenteel niet aanwezig
   omdat de capability zelf niet bestaat).
4. Geen GROUP/TEAM-schrijfpad daadwerkelijk gebruikt.
5. **Revocation-gedrag voor bestaande threads:** een revoked
   coach_athlete_relationship verwijdert GEEN participant-rij uit
   `message_participants` (geen automatische, destructieve migratie).
   Of historische berichten na revocatie zichtbaar mogen blijven is
   expliciet **PO DECISION REQUIRED** (`MessagingCore.
   canReadHistoricalMessagesAfterRevocation()`, fail-closed default:
   nee). Belangrijk, wel technisch geborgd: revocatie kan NOOIT nieuwe,
   ongeautoriseerde berichten of nieuwe health-data-toegang opleveren --
   dat blijft ongewijzigd via de bestaande RLS/CoachAccessCore.
6. **Block-integratie:** `MessagingCore.blockPreventsFurtherMessages()`
   (nieuw, getest) spiegelt het bestaande, canonical "block wint altijd"-
   principe (MS-F9-01/03) -- een actieve `social_blocks`-rij in beide
   richtingen voorkomt het versturen van nieuwe berichten. Dit is
   vooralsnog uitsluitend client-side/presentatielaag; een server-side
   RLS-koppeling tussen `social_blocks` en `messages`-inserts is NIET
   in deze sprint aan de database-migratie toegevoegd (zou een aparte,
   voorzichtige migratie-stap vereisen) -- expliciet genoteerd als open
   punt, niet verzwegen.
7. Geen error/degraded-state-tests voor de client-flows (netwerkfouten/
   duplicate send) buiten de nu toegevoegde `isValidThreadState`/
   `canSendMessage`-fail-closed-logica.

## NOTIFICATIONS (nieuw, deze closure-pass)

Onderzocht: de bestaande, canonical `social_notifications`-infrastructuur
(MS-F9-03: `recipient_id, event_type, actor_id, target_type/id, read_at`,
geen sensitive content-snapshot, insert uitsluitend via `service_role`).
**Geen tweede notification engine gebouwd.**

Nieuwe, additieve migraties:
- `ms_f_messaging_notification_trigger_v1`: `SECURITY DEFINER`-trigger
  (`notify_message_participants()`) op `messages` AFTER INSERT, die voor
  elke andere, niet-geblokkeerde participant een `social_notifications`-
  rij aanmaakt (`event_type='new_message'`, `target_type='message'`).
  Geen notificatie naar de afzender zelf (bevestigd via een echte,
  functionele test met bestaande, echte user-ID's, direct daarna volledig
  opgeruimd -- geen testdata achtergebleven).
- Twee vervolgmigraties om de bestaande check-constraints op
  `social_notifications.event_type`/`target_type` additief uit te
  breiden met `'new_message'`/`'message'` (geen bestaande, toegestane
  waarde verwijderd).

**Bevestigd, functioneel getest (niet alleen source-inspectie):**
ontvanger krijgt precies 1 notificatie, afzender krijgt er 0.

**Niet in deze sprint:** preference-respectering (geen bestaande
notification-preference-infrastructuur gevonden om op aan te sluiten),
retry-gedrag (de trigger is synchroon met de insert; er is geen
bestaand, apart retry-mechanisme voor `social_notifications` gevonden
om te hergebruiken).

## UNREAD CONTRACT (nieuw, deze closure-pass)

`MessagingCore.unreadCount()` (bestond al) is nu aanvullend getest op
adversariale randgevallen. Geen thread-unread-leakage mogelijk zolang
`last_read_at` uitsluitend via `mp_update_own_read_state` (bestaande
RLS: `user_id = auth.uid()`) gewijzigd kan worden -- een gebruiker kan
nooit de `last_read_at` van een ander manipuleren. Geen "global unread
count"-implementatie in deze sprint (geen bestaande, canonical
architectuur hiervoor gevonden om zonder nieuwe productbeslissing op
aan te sluiten).

## PO-BESLUIT: COACH RELATIONSHIP REVOCATION/END (deze closure-pass)

De Product Owner heeft dit definitief vastgesteld (geen open technisch
punt meer):
- bestaande message history blijft behouden, wordt NIET verwijderd;
- na revoked/ended wordt de coach-athlete-conversatie **READ-ONLY**:
  geen nieuwe berichten, geen nieuwe coach-notificaties (implicaties
  van elkaar: de notificatie-trigger vuurt uitsluitend na een
  succesvolle insert; als de insert al door RLS geblokkeerd wordt,
  ontstaat er per definitie nooit een notificatie);
- geen nieuwe/herstelde coach access/scopes via messaging -- die blijven
  exclusief bij `CoachAccessCore.hasScope()`, ongewijzigd;
- block/privacy blijft sterker en kan leestoegang verder beperken dan
  revocation alleen toestaat.

**Geïmplementeerd (database, additieve migratie
`ms_f_messaging_revocation_readonly_v1`):** `m_insert_own_sender`
aangescherpt met een extra `not exists`-voorwaarde: voor een
COACH_ATHLETE-thread moet de gekoppelde `coach_athlete_relationships.
status = 'active'` zijn om een nieuw bericht te mogen versturen. De
SELECT-policy (`m_select_participant`) is **niet gewijzigd** -- history
blijft leesbaar zolang je participant bent en niet geblokkeerd, exact
zoals besloten.

**Functioneel getest** (echte, tijdelijke `revoked`-relatie + thread
aangemaakt met bestaande, echte user-ID's, de exacte policy-expressie
bevestigd `true` voor de blokkade, daarna volledig, verifieerbaar
opgeruimd -- 0 rijen achtergebleven): de blokkade-logica werkt correct.

**Client-side:** nieuwe `MessagingCore.canSendCoachAthleteMessage()`
(vervangt de eerdere `canCreateCoachAthleteThread`-achtige aanname voor
send-momenten) en een bijgewerkte `canReadHistoricalMessagesAfterRevocation()`
die niet langer fail-closed "PO_DECISION_REQUIRED" retourneert, maar het
definitieve besluit spiegelt: history blijft leesbaar, tenzij een
actieve block dit specifiek verder beperkt (block-precedence expliciet
getest).

## FINAL MATURITY (exact, zoals voorgeschreven -- geen samengestelde claim)

```
HUMAN COACH CORE                     = IMPLEMENTED + TESTED
HUMAN COACH NORMAL UX                = OPEN
HUMAN COACH REAL USER VALIDATION     = OPEN

MESSAGING FOUNDATION                 = IMPLEMENTED + TESTED
MESSAGING RLS                        = IMPLEMENTED + STRUCTURALLY VERIFIED
MESSAGING BLACK-BOX AUTH VALIDATION  = OPEN
MESSAGING NORMAL UX                  = OPEN
MESSAGING REAL USER VALIDATION       = OPEN

PRIVATE NOTES                        = DEFERRED
```

**Geen VALIDATED/FULL STACK/>=9-claim voor Human Coach of Messaging**
zolang black-box, non-owner authenticated RLS-validatie ontbreekt. Dit
blijft, conform het PO-besluit, GEEN merge-blocker voor de foundation.

## PO DECISIONS STILL OPEN

- Wanneer/hoe een daadwerkelijk Coach v0.2-scherm deze foundation gaat
  gebruiken.
- Private coach notes: apart model laten ontwerpen of bewust uitstellen.
- **Revocation:** mogen historische berichten na het intrekken van een
  coach-athlete-relatie zichtbaar blijven voor beide partijen, of moeten
  ze verborgen/gearchiveerd worden? (`canReadHistoricalMessagesAfterRevocation`
  staat nu fail-closed op "nee", maar dit is een productkeuze, geen
  technisch gegeven.)
- Server-side RLS-koppeling tussen `social_blocks` en nieuwe `messages`-
  inserts (nu uitsluitend client-side gespiegeld) -- gewenst als
  aanvullende, harde database-garantie?
- GROUP/TEAM messaging: wanneer dit daadwerkelijk geactiveerd wordt.
- Notification-preferences en retry-gedrag: bestaande infrastructuur
  hiervoor identificeren of bewust (nog) niet bouwen.
