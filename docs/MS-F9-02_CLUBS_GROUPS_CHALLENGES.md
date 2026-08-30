# MS-F9-02_CLUBS_GROUPS_CHALLENGES.md — Trainingskompas

**Canonieke naam/acceptance:** "Clubs, Groups & Challenges" -- "Community engagement without health oversharing." P3, dependency MS-F9-01 (CLOSED).

## Architecturale audit
Bevestigd bestaande organizations/teams/training_groups/memberships (F1/F11, commercieel vertrouwensmodel). social_groups/social_group_memberships zijn een volledig apart datamodel -- geen foreign keys naar de commerciële tabellen, geen gedeelde RLS-policies.

## Groups
SocialGroupCore: kleinst mogelijk rolmodel (owner/member), drie join-modes (open/approval_required/invite_only). Datamodel live toegepast met RLS.

Kritieke, live geverifieerde garantie: de zelf-join-INSERT-policy dwingt role='member' af; rolwijziging is uitsluitend via een owner-gebonden SECURITY DEFINER-check, nooit via een FOR ALL-policy voor het lid zelf. Live bevestigd: een lid dat zichzelf naar owner probeerde te updaten, bleef member.

Twee SECURITY DEFINER-helperfuncties, beide met vastgezette search_path, anon-EXECUTE expliciet ingetrokken.

## Challenges
SocialChallengeCore: Social is uitsluitend een consument van canonieke trainingsdata. V1 ondersteunt een metric: completed_sessions_count (pure telling, geen berekening). Acht onveilige/niet-canonieke metrics expliciet uitgesloten en getest.

Tijdgrenzen: starts_at/ends_at zijn DATE-kolommen -- inherent timezone-safe, consistent met de bestaande conventie.

Self-elevation architecturaal onmogelijk: social_challenge_participants heeft geen rol-kolom, geen UPDATE-policy nodig.

Live adversarial verificatie: block-bypass-poging bij join expliciet geweigerd; group-only-onzichtbaarheid voor niet-leden bevestigd (defense-in-depth).

Bekende, niet-blokkerende bevinding: anonieme toegang geeft een database-foutmelding i.p.v. een lege set (Postgres-expressie-evaluatie), geen databeveiligingsimpact.

## Tests
core/fSocialGroupCore.test.js (9/9), core/fSocialGroupRls.test.js (9/9), core/fSocialChallengeCore.test.js (26/26), core/fSocialChallengeRls.test.js (7/7). Alle vier met sabotagebewijs.

## UI-scope
Conform de MS-F9-01-IA-beslissing: geen 6e bottom-nav-tab. Geen UI gebouwd binnen deze sprint.

## MS-F9-02 acceptance-gate-toetsing
Letterlijke acceptance gate: "Community engagement without health oversharing."
Resultaat: CLOSED. Groups en Challenges bestaan als veilig, getest fundament. Geen enkele gezondheidsgerelateerde metric mogelijk als challenge-type.
