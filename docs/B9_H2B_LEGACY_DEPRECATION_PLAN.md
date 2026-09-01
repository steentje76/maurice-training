# B9-H2B Legacy Deprecation Plan

## LEGACY ELEMENT: users.gym_id
**CURRENT USE:** bepaalt welke gym een gebruiker ziet in de bestaande, actieve Gym/Club-UI (`gym-team.js`).
**CANONICAL REPLACEMENT:** `memberships.organization_id` (via `gyms.organization_id`).
**WRITE DISABLED:** Nee (nog actief geschreven door de bestaande gym-join-flow).
**READ COMPATIBILITY:** behouden -- de actieve UI leest dit nog.
**REMOVAL BLOCKER:** de bestaande Gym/Club-UI moet eerst omgeschakeld worden naar het canonieke, `memberships`-gebaseerde leespad (vereist een aparte, toekomstige sprint, geen UX-wijziging op zich maar wel een functionele wiring-wijziging).
**TARGET REMOVAL PHASE:** Migratiefase 5-6 (zie B9-H2A ADR).
**STATUS:** legacy/compatibility only, canonical bron is nu `memberships`.

## LEGACY ELEMENT: users.gym_role / gym_role_level
**CURRENT USE:** bepaalt rol-gebaseerde UI-elementen in de bestaande Gym/Club-flow.
**CANONICAL REPLACEMENT:** `memberships.role`.
**WRITE DISABLED:** Nee.
**READ COMPATIBILITY:** behouden, read-only voor nieuwe, organization-aware functionaliteit (geen nieuwe code mag dit als autorisatiebron gebruiken, sectie 15 van de opdracht).
**REMOVAL BLOCKER:** zelfde als hierboven.
**TARGET REMOVAL PHASE:** Migratiefase 5-6.
**STATUS:** legacy/compatibility only, canonical bron is nu `memberships.role`.

## LEGACY ELEMENT: legacy gym auth logic (gym-team.js pincode-verificatie)
**CURRENT USE:** actieve, functionerende pincode-verificatie voor gym-toegang.
**CANONICAL REPLACEMENT:** geen directe vervanging gepland in deze sprint -- pincode-verificatie is een apart, orthogonaal beveiligingsmechanisme, geen tenant-identiteitsvraagstuk.
**WRITE DISABLED:** N.v.t.
**READ COMPATIBILITY:** volledig behouden, ongewijzigd.
**REMOVAL BLOCKER:** geen -- dit element wordt niet gedeprecieerd, blijft bestaan naast de canonieke laag.
**TARGET REMOVAL PHASE:** N.v.t.
**STATUS:** actief, niet gedeprecieerd.

## LEGACY ELEMENT: gyms.owner_email
**CURRENT USE:** was voorheen de enige eigenaarsaanduiding vóór een organization-koppeling bestond.
**CANONICAL REPLACEMENT:** `organizations.owner_user_id`.
**WRITE DISABLED:** Ja (de bestaande `gyms_owner_context_chk`-constraint dwingt af dat dit veld leeg is zodra `organization_id` gezet is).
**READ COMPATIBILITY:** N.v.t. (0 treffers in actieve code, live bevestigd).
**REMOVAL BLOCKER:** geen.
**TARGET REMOVAL PHASE:** kolom kan op termijn fysiek verwijderd worden; functioneel al niet meer in gebruik voor gekoppelde gyms.
**STATUS:** gedeprecieerd, functioneel vervangen.
