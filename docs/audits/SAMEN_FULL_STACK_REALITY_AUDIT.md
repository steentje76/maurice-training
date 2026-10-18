# Samen — Full Stack Reality Audit

**Methode:** live Supabase-schema-inspectie + source-code-inspectie
(`index.html`). Geen documentatie als bewijs gebruikt.

## Database (bewezen, live geïnspecteerd, rijen op moment van audit)

| Tabel | Rijen | RLS |
|---|---|---|
| social_profiles | 0 | ja |
| social_connections | 0 | ja |
| social_blocks | 0 | ja |
| social_reports | 0 | ja |
| social_groups | 1 | ja |
| social_group_memberships | 1 | ja |
| social_challenges | 0 | ja |
| social_challenge_participants | 0 | ja |
| social_shared_activities | 0 | ja |
| social_notifications | 0 | ja |
| social_reactions | 0 | ja |
| social_comments | 0 | ja |
| teams | 0 | ja |
| training_groups | 0 | ja |
| organizations | 1 | ja |
| memberships | 4 | ja |

Kolomstructuur bevestigd voor social_profiles (user_id, display_name, bio,
visibility), social_shared_activities (referentie naar training_instance_id
+ presentatie-whitelist, geen content-duplicatie), social_notifications
(recipient-only, geen sensitive snapshot), social_reactions/social_comments
(gekoppeld aan shared_activity_id).

## Backend/UI (bewezen via code)

Substantiële, werkende CRUD-code bestaat al in index.html voor:
- social_profiles: zoeken op naam, aanmaken/upserten (`merge-duplicates`)
- social_connections: follow-verzoek aanmaken (status:'pending'),
  accepteren (RLS-bewust: alleen followee mag accepteren)
- social_blocks: ophalen, aanmaken
- social_reports: rapporteren met reason_code/status
- social_groups: aanmaken, ophalen
- social_challenges: ophalen

**Geen `s-samen`-scherm bestaat** (0 treffers voor een route met dat ID) --
er is geen gecentraliseerd Samen-overzichtsscherm zoals de canonical mockup
toont (Vrienden/Groepen/Challenges/Berichten/Gym-Club als één geheel).

**Messaging:** geen aparte messaging/thread-tabel gevonden (geen
`social_messages` of vergelijkbaar) -- de "Berichten"-tegel uit de mockup
heeft geen gevonden backend-tegenhanger.

**Feed:** `social_shared_activities` + `social_reactions` + `social_comments`
vormen samen een architecturaal complete feed-backend, maar zonder UI-scherm
dat deze combineert, en zonder data.

## Classificatie per canonical Samen-capability

| Mockup-belofte | Database | Backend (CRUD) | UI-scherm | Runtime data | Status |
|---|---|---|---|---|---|
| Vrienden (connections) | ja | ja | nee (geen s-samen) | 0 rijen | **BACKEND READY** |
| Groepen | ja | ja | nee | 1 rij | **BACKEND READY** |
| Challenges | ja | ja | nee | 0 rijen | **BACKEND READY** |
| Feed (activiteit delen) | ja | gedeeltelijk (create-CRUD niet expliciet bevestigd) | nee | 0 rijen | **PARTIAL** |
| Berichten/Messaging | nee | nee | nee | n.v.t. | **MISSING** |
| Gym/Club | ja (organizations/memberships) | ja (elders al gebruikt, Team/Gym-track) | nee (los van Samen-scherm) | 4 memberships | **BACKEND READY**, los van Samen-UI |
| Moderatie (block/report) | ja | ja | geen zichtbare, gebruikersgerichte UI gevonden | 0 rijen | **BACKEND READY** |
| Notifications (social) | ja | schema aanwezig, geen create-aanroep gevonden | nee | 0 rijen | **ARCHITECTURE ONLY** |

## Hard rule toegepast

Conform de instructie: geen enkele mockup-tegel hierboven wordt als "af"
beschouwd. Zelfs waar backend-CRUD al werkt (Vrienden/Groepen/Challenges),
ontbreekt het samenbindende scherm en bestaat er nagenoeg geen echte data
-- dit is BACKEND READY, niet FULL STACK.

## Eerlijke conclusie

Samen is verder gevorderd dan de mockup-status doet vermoeden: er ligt een
niet-triviale hoeveelheid werkende, RLS-bewuste backend-logica klaar. Maar
zonder een centraal scherm, zonder messaging-fundament, en met vrijwel
nul productiedata is dit domein nog ver van een afgeronde
gebruikerservaring.

**FULL STACK SCORE: 3/10** -- veel losse, werkende bouwstenen; geen
samenhangend, getest, door gebruikers daadwerkelijk gebruikt geheel.
