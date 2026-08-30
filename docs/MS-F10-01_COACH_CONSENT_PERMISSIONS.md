# MS-F10-01_COACH_CONSENT_PERMISSIONS.md — Trainingskompas

**Canonieke naam/acceptance:** "Coach Consent & Permissions" -- "Dedicated tests and athlete-controlled access." P1, geen dependencies.

## Baseline-audit
coach_athlete_relationships bestond al, correct en veilig ontworpen (uitsluitend de athlete kan pending->active zetten, self-elevation al onmogelijk), maar volledig ongekoppeld: 0 referenties in de runtime, geen dedicated test, geen granulaire toestemmingslaag.

## Product Owner-beslissingen geimplementeerd
- TRAINING_CORE: default AAN bij activatie.
- RECOVERY_HEALTH: default UIT, athlete-controlled.
- WOMENS_PERFORMANCE: default UIT, altijd apart, nooit impliciet via TRAINING_CORE, RECOVERY_HEALTH, social/team/gym-relaties, of premium.
- Zowel coach als athlete kunnen een relatie voorstellen; uitsluitend de athlete kan activeren.

## Architectuur
CoachAccessCore: canoniek autorisatiecontract, 1:1 gespiegeld door de database. coach_access_scopes-tabel (expliciet, versioneerbaar, geen opaque JSON). Vier SECURITY DEFINER-helperfuncties, waarvan coach_has_scope() de enige plek is waar toegang wordt bepaald.

Server-side default-scope-trigger: bij activatie worden defaults automatisch aangemaakt, nooit client-side te manipuleren.

## Zes kritieke scenario's, live adversarial geverifieerd
1. Coach zonder relatie -> 0 rijen.
2. Self-elevation-poging -> RLS-schending.
3. Actieve relatie + defaults -> TRAINING_CORE zichtbaar, RECOVERY_HEALTH/WOMENS_PERFORMANCE niet.
4. RECOVERY_HEALTH expliciet aan -> zichtbaar; WOMENS_PERFORMANCE blijft ook dan geweigerd.
5. Revoke van de hele relatie -> toegang stopt onmiddellijk.
6. Andere coach (geen relatie) -> 0 rijen, geen cross-coach-lek.

## Eigen adversarial zelf-audit (aanvullend, na de implementatie)
- Bevestigd: geen bestaande, verspreide if(coach)-check die CoachAccessCore zou moeten omzeilen -- alle bestaande "coach"-referenties zijn AI-coach-gerelateerd, volledig gescheiden.
- Bevestigd: core/coaching.js bevat 0 referenties naar coach_user_id/coach_access_scopes/CoachAccessCore.
- Extra defense-in-depth ontdekt: zelfs de athlete zelf kan geen nieuwe coach_access_scopes-rij insereren -- scope-rijen ontstaan uitsluitend via de server-side trigger.
- Bevestigd: mijn nieuwe coach-leespolicies zijn additief naast bestaande policies, geen conflicten.
- Minieur, niet-blokkerend observatiepunt: een athlete zou technisch een scope-rij tussen eigen relaties kunnen verplaatsen -- geen cross-athlete-lek, wel een edge-case voor toekomstige UI.

## Genuine bevinding gecorrigeerd: CASCADE-documentatie
Het bestaande delete-account.js-commentaar claimde ten onrechte dat nergens ON DELETE CASCADE naar auth.users bestaat. Bevestigd: coach_athlete_relationships heeft dit wel. Commentaar gecorrigeerd. Tabel alsnog expliciet in de verwijderlijst (auditeerbaarheid). coach_access_scopes volgt automatisch via een tweede-niveau CASCADE.

## Tests
core/fCoachAccessCore.test.js (20/20), core/fCoachAccessRls.test.js (16/16), core/fDeleteAccountSecurity.test.js uitgebreid (23/23, was 22). Alle met sabotagebewijs.

## MS-F10-01 acceptance-gate-toetsing
Letterlijke acceptance gate: "Dedicated tests and athlete-controlled access."
Resultaat: CLOSED. Dedicated tests bestaan. Athlete-controlled access is aantoonbaar in code en DB en live adversarial tests bewezen, niet alleen gedocumenteerd.
