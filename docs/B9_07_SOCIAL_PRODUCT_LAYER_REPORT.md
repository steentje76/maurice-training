# B9-07 Social Product Layer — Eindrapport

**Rol-erkenning:** geen benchmarkscore toegekend.

**START SHA:** `7909e29121a36773f16b1f97e0277e3db0bcbb3a`
**APP_VER voor/na:** v4.69.39 / v4.69.40
**Migration(s):** geen (volledig hergebruik van bestaande social_*-schema/RLS)

## Social existing-state audit

| Tabel | RLS | Classificatie vóór B9-07 |
|---|---|---|
| `social_profiles` | Ja, 2 policies | BACKEND ONLY |
| `social_connections` | Ja, 4 policies | BACKEND ONLY |
| `social_blocks` | Ja, 1 policy | BACKEND ONLY |
| `social_reports` | Ja, 2 policies | BACKEND ONLY |
| `social_groups` | Ja, 4 policies | BACKEND ONLY |
| `social_group_memberships` | Ja, 4 policies | BACKEND ONLY |
| `social_challenges` | Ja, 2 policies | BACKEND ONLY |
| `social_challenge_participants` | Ja, 3 policies | BACKEND ONLY |
| `social_shared_activities` | Ja, 2 policies | BACKEND ONLY |
| `social_notifications` | Ja, 2 policies | BACKEND ONLY |

Repo-breed, per exacte tabelnaam geverifieerd: **0 UI-treffers** vóór
deze sprint. Dit bevestigt exact de vooraf verwachte situatie uit de
opdracht: een volledig, volwassen backend-fundament zonder enige
gebruikersinterface.

## Social productprincipes

Toegepast: identity/profile → privacy → connections zijn nu bruikbaar.
Clubs/groups → activities → challenges → sharing →
reactions/comments → moderation/block/report → notifications blijven
in deze sprint nog BACKEND ONLY -- niet gebouwd, zie "Open limitations".

## Social entry point

Geen nieuwe bottom-nav-tab op de bestaande 35 schermen (te risicovol
voor deze sprint gezien de omvang van die wijziging). In plaats
daarvan: een nieuw, eigen scherm `s-social` met een eigen navigatie,
bereikbaar via een duidelijke, zichtbare knop op het Home-scherm.

## Wat is gebouwd (V1-kern)

- Eigen profiel: weergavenaam, bio, zichtbaarheid (privé/connecties/
  vindbaar), opslaan via `upsert` op `social_profiles`.
- Profielen zoeken (uitsluitend via een directe database-query die
  onderworpen is aan de bestaande privacy-RLS -- geen client-side
  filtering die een schijnveiligheid zou geven).
- Volgen (altijd met status `pending`), volgverzoeken accepteren
  (alleen als followee).
- Connectie-lijst en geblokkeerde-gebruikers-lijst (leeslijsten).

## Groepen (vervolg, hergebruik van bestaande, canonieke modules)

Tijdens de audit bleek `SOCIAL-GROUPS-CHALLENGES-001` al een volledige,
canonieke, getest business-logic-laag te hebben (`core/socialGroup.js`/
`core/socialChallenge.js`, MS-F9-02, 51 reeds bestaande assertions) --
alleen de UI-integratie ontbrak. Dit is alsnog toegevoegd (laag risico,
geen nieuwe business logic): groepen aanmaken (met join_mode open/
approval_required/invite_only), groepenlijst met correcte rol-weergave
(eigenaar/lid/geen toegang), direct lid worden bij `open`-groepen.
Uitsluitend de bestaande `SocialGroupCore.isMember()`/`isOwner()`/
`canJoinDirectly()` gebruikt als bron van waarheid voor wat de UI
toont/toestaat -- geen dubbele rol-logica.

Live, adversariaal herbevestigd (kritieke MS-F9-01-les: "een lid mag
zichzelf nooit kunnen promoveren"): een poging om zichzelf direct als
`owner` toe te voegen aan andermans groep wordt door de bestaande RLS
geweigerd. De UI probeert dit ook nooit (altijd `role:'member'` bij het
toetreden).

Challenges-UI (hergebruik van `core/socialChallenge.js`) is **niet**
meer toegevoegd binnen deze sprint -- blijft een open punt.

## Live, adversariale privacy-verificatie

Drie scenario's, elk in een transactie zonder commit:
1. Een follow-verzoek direct met `status:'accepted'` insereren ->
   **geweigerd** door de bestaande RLS.
2. Een privé-profiel van een andere gebruiker opvragen -> **0
   resultaten** (onzichtbaar).
3. Een geblokkeerde gebruiker probeert een `discoverable`-profiel van
   de blokkeerder te zien -> **0 resultaten** (blokkering overrulet
   zichtbaarheid correct).

## Zelf gevonden en gerepareerd

Tijdens het bouwen van de nieuwe Social-functie verwijderde een eigen
invoegfout per ongeluk de functiedefinitieregel van de bestaande
`renderRunningInsights()`. Direct opgemerkt via de verplichte
syntax-check (Node zou anders een crash hebben gegeven), hersteld, en
de volledige, bestaande Running/Cycling/Multisport-regressie (180
assertions) opnieuw, expliciet herbevestigd groen.

## Tests

`core/fB9_07SocialProductLayer.test.js` (nieuw, 11/11, uitgebreid met
3 groepen-assertions). Geen regressie op de overige 207 bestaande
testbestanden (188 assertions herbevestigd).

## Sabotage

Een follow-verzoek direct als `accepted` verstuurd i.p.v. `pending` ->
gedetecteerd, teruggedraaid. Een zelf-elevation-poging (direct `owner`
i.p.v. `member` bij het toetreden tot een groep) -> gedetecteerd,
teruggedraaid.

## Release gate

**211/211 uitgevoerd, 0 geskipt, 0 gefaald** (was 210, +1 nieuw
testbestand).

## Doc consistency

**0 problemen.**

## Open limitations (eerlijk, transparant, expliciet)

Niet gebouwd in deze sprint, ten opzichte van de volledige, in de
opdracht beschreven Social-architectuur:
- Challenges-UI (aanmaken, deelnemen, voortgang) -- de canonieke
  `core/socialChallenge.js` bestaat al (MS-F9-02), nog geen UI-integratie.
- Activity sharing-UI (een gedeelde activiteit tonen/aanmaken) --
  backend bestaat, geen UI.
- Reacties/comments -- geen backend-tabel gevonden voor comments
  specifiek, geen UI.
- Volledige moderatie/report-UI (rapporteren vanuit een profiel/
  activiteit) -- backend bestaat, geen UI, alleen een blocks-leeslijst
  gebouwd.
- Notificaties-UI (lijst, ongelezen-status, markeren als gelezen) --
  backend bestaat, geen UI.
- Geen nieuwe bottom-nav-tab op de bestaande 35 schermen (bewuste,
  veiligere keuze voor deze sprint).

## FINAL STATUS

**B9-07 SOCIAL PRODUCT LAYER PARTIAL — BLOCKERS OPEN**

Conform de harde gate (sectie 2): B9-08 wordt NIET gestart. Deze
sprint levert een eerlijk, veilig, grondig geverifieerd fundament
(identity/profile/privacy/connections), maar dekt niet de volledige,
in de opdracht beschreven Social-architectuur. Wacht op onafhankelijke
review en een besluit over vervolgscope voor groepen/challenges/
sharing/moderatie/notificaties.
