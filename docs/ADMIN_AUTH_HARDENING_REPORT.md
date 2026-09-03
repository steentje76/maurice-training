# ADMIN_AUTH_HARDENING_REPORT.md — TRACK A

## BEFORE
Twee, gescheiden mechanismen. (1) `s-admin-pin`: client-side SHA-256-vergelijking tegen een hardcoded hash in `index.html`, ontsluit een oefeningen-/apparatuurcatalogusscherm. (2) `gym-team.js`: server-side, sessie-geverifieerde functie met rolgebaseerde autorisatie (`gym_role_level`) vóór een gedeelde, per-gym coach-pincode, voor teamleden-/rollenbeheer. `equipment_catalog`/`exercise_equipment` hadden `WITH CHECK (true)` op INSERT.

## AFTER
Live, transactioneel onderzoek (rollback-getest) toonde aan dat de INSERT-policies **geen exploiteerbaar gat** waren: before-insert-triggers (`set_exercise_equipment_owner()`/`set_equipment_catalog_owner()`) controleren autorisatie zelf en overschrijven altijd `gym_id`/`user_id`/`organization_id` met server-vertrouwde waarden. Toch gehard als defense-in-depth: beide INSERT-policies vervangen door hetzelfde, al bewezen rolgebaseerde patroon dat UPDATE/DELETE al gebruikten. `gym-team.js` bleek bij lezing al correct: rolcontrole vóór PIN-check, server-side identity, privilege-escalatie-bescherming, tenant-scoping, audit-logging — geen wijziging nodig, wel voor het eerst getest.

## FILES
`core/fAdminAuthGymRlsHardening.test.js` (nieuw, 8 tests). `docs/ADMIN_AUTH_AND_GYM_MIGRATION_PLAN.md` (nieuw). Geen wijziging aan `index.html`, `netlify/functions/gym-team.js`, of enige UX.

## DB CHANGES
2 RLS-policy-vervangingen (`exercise_equipment_insert`, `equipment_catalog_insert`), live toegepast via Supabase migration. Geen schema-, kolom-, of datawijziging.

## RLS
Beide INSERT-policies nu identiek aan het bestaande UPDATE/DELETE-patroon (gym_role_level>=3 OF org_has_role(owner/admin/staff) OF eigen user_id). Live geverifieerd na toepassing (policy-tekst opgehaald, komt exact overeen).

## TESTS
8/8 nieuw, groen. Volledige regressie: 229/229 (was 228). Live sabotage uitgevoerd en gedetecteerd (policy tijdelijk teruggezet naar `true`, transactioneel, gerollbackt). Live regressietest: bestaande, legitieme insert-paden (gym-owner) blijven werken.

## KNOWN LIMITATIONS
- `s-admin-pin`-hash blijft zichtbaar in client-broncode (LOW severity — geen privilege-verhoging mogelijk bovenop wat RLS al toestaat, want de onderliggende schrijfacties waren al beschermd). Niet gewijzigd deze sprint: verwijderen zou een UX-wijziging zijn (ander scherm-toegangsmechanisme), wat buiten deze technische-foundation-sprint valt.
- Gym-join-flow schrijft nog uitsluitend legacy `users.gym_id` — geen canonical `memberships`-write. Bewust niet gewijzigd (zie Track B, sectie "vóór nieuwe Gym-UX moet gebeuren").
- Geen live PSP/productie-executie; alles transactioneel getest met rollback vóór definitieve toepassing.

## STATUS
**CLOSED.** Gedeelde PIN is en was geen zelfstandige authorization-boundary voor gevoelige acties; de twee reële RLS-verzwakkingen zijn verholpen als defense-in-depth. Tenant-isolatie aantoonbaar bevestigd. Geen nieuwe UX gebouwd. Bestaande, normale flows niet regressief (229/229 groen, live insert-regressietest geslaagd).
