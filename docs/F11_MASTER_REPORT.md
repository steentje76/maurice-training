# F11_MASTER_REPORT.md — Trainingskompas

**F11 — Gym/Club/Team Platform.** Baseline SHA: `32cfe80b9751fdf841de22b84a03d150545b3f5d` (na F10-afsluiting). Fresh-main audit-baseline vóór de merge van dit Master Report zelf (PR #156): `a2b054f11493df2fd664057dfacbd05f280d0654`. **Finale, daadwerkelijk gemergde main SHA (na PR #156): `877bafa55c7fbb640d94edcfa3173f064426bf0a`.** APP_VER: `v4.69.21`.

## 1. Executive status
Alle vijf canonieke F11-mastersprints zijn CLOSED en daadwerkelijk gemergd naar main (PR #151–#155). Tijdens de uitvoering zijn meerdere kritieke, genuine security-bugs live gevonden en gerepareerd, verspreid over de sprints: in MS-F11-01 self-role-elevation en twee tenant-escape-bugs (memberships/locations); in MS-F11-03 vier team-event-tenant-escape/immutabiliteitsbugs plus een client-omzeilbare privacy-drempel in team-analytics; in MS-F11-05 een RLS-kolomlek op `gyms`. Geen enkele bug bereikte ooit de productie-`main` vóór reparatie. Eén Quality Gate-falen (Android-versiesynchronisatie) werd gevonden en gerepareerd vóór merge.

## 2. F11 Sprint Matrix
| Sprint | PR | Software | Database | Integration | Security/Privacy | UX | Device/External | Evidence | Open validation |
|---|---|---|---|---|---|---|---|---|---|
| MS-F11-01 Organization & Location Core | #151 | CLOSED | CLOSED (migratie_v512/513) | N.v.t. | CLOSED (self-elevation + 2 tenant-escape-bugs gerepareerd) | Geen UI (backend/Core) | N.v.t. | `docs/F11_MS_F11_01_REPORT.md` | Geen |
| MS-F11-02 Gym Programming & Equipment | #152 | CLOSED | CLOSED (migratie_v514/515) | Hergebruikt F10 volledig | CLOSED | Geen UI | N.v.t. | `docs/F11_MS_F11_02_REPORT.md` | Geen |
| MS-F11-03 Teams, Groups & Analytics | #153 | CLOSED | CLOSED (migratie_v516-519, incl. retroactieve schema-drift-vastlegging) | Hergebruikt training_instances | CLOSED (server-side privacy-safe analytics, 4 tenant-escape-bugs + 1 client-omzeilbare privacy-drempel gerepareerd) | Geen UI | N.v.t. | `docs/F11_MS_F11_03_REPORT.md` | 1 non-blocking productpunt (assigned_user_id), 1 non-blocking hardening (GAP-P2-024) |
| MS-F11-04 Gym Device Vendor Feasibility | #154 | CLOSED (feasibility, geen implementatie) | N.v.t. | N.v.t. | N.v.t. (geen runtime-toegang) | N.v.t. | **EXTERNAL VALIDATION OPEN** (0 van 8 vendors geïmplementeerd) | `docs/F11_GYM_DEVICE_VENDOR_FEASIBILITY.md` | Vendor-partnerschappen (EGYM/Technogym Enterprise), Matrix Fitness RESEARCH FURTHER |
| MS-F11-05 Dynamic Branding & Admin | #155 | CLOSED | CLOSED (migratie_v520/521) | Runtime volledig geïntegreerd (was dead code) | CLOSED (kritieke RLS-kolomlek gerepareerd vóór merge) | Minimale, zichtbare tenant-skin + admin-knop | N.v.t. | `docs/F11_MS_F11_05...` (dit rapport + audit-doc) | Geen |

## 3. Canonical Organization Architecture
```
organizations (tenant identity + authorization root)
  → locations (MS-F11-01)
  → memberships (rollen: owner/admin/staff/member)
  → teams → training_groups (MS-F11-01, hergebruikt uit F1)
  → coach_program_templates/assignments (MS-F11-02, hergebruikt F10)
  → equipment_catalog/exercise_equipment (MS-F11-02, hergebruikt canonical Exercise Library)
  → team_events/event_attendance/event_responsibilities (MS-F11-03)
  → get_team_attendance_summary() (MS-F11-03, server-side privacy-safe)
  → gyms (MS-F11-05, organization-gebonden branding/presentatie, GEEN tenant root)
```
**Geen dubbele identiteitsmodellen.** `gyms` is definitief vastgelegd als uitsluitend organization-gebonden configuratie/presentatie-entiteit, nooit een tweede tenant root (zie `docs/F11_DYNAMIC_BRANDING_EXISTING_STATE_AUDIT.md`). Het legacy `gyms`/`users.gym_id`/PIN-model (Model A) blijft volledig, bewust gescheiden en ongewijzigd bestaan naast het canonieke Model B.

## 4. Multi-tenant Security — Final Audit
Herhaalde, fresh-main adversarial matrix: org A owner → org B (denied), team A staff → team B (denied), gewoon member → staff-operaties (denied), removed member → teamdata (denied), organization_id/team_id/location_id/user_id/event_id-mutatiepogingen (allemaal geblokkeerd door immutabiliteit-triggers), analytics cross-tenant (denied, en de cohort-privacydrempel is server-side niet-client-verlaagbaar), equipment/template/assignment/materialization cross-tenant (allemaal denied, live herbevestigd deze sessie). **Geen enkele `USING(true)`/`WITH CHECK(true)`-bypass gevonden buiten één, expliciet gedocumenteerde en getrigger-gevalideerde uitzondering** (`exercise_equipment_insert`, analoog aan het bestaande `trg_set_user_id`-patroon).

## 5. Row-vs-Column Security Audit (nieuwe, verplichte gate — direct uitgevoerd na de gyms-bevinding)
Alle tabellen met een member/staff-brede SELECT-policy zijn repo-breed en live doorgelicht op kolomniveau: `coach_program_templates`, `equipment_catalog`, `event_attendance`, `event_responsibilities`, `exercise_equipment`, `locations`, `macrocycles`/`mesocycles`/`microcycles`, `memberships`, `organizations`, `seasons`, `social_challenges`/`social_group_memberships`/`social_groups`, `team_events`, `teams`/`training_groups`. **Geen enkele andere tabel bevat het gyms-patroon** (een "onschuldige" member-leesrechtenpolicy die ook gevoelige, niet-bedoelde kolommen blootlegt). `gyms` zelf staat na de fix terecht niet meer in deze lijst (uitsluitend owner/admin lezen de volledige rij).

## 6. Coach/PT Boundary
Herbevestigd: `coach_athlete_relationships`/`coach_access_scopes` (F10) blijven volledig gescheiden van `organizations`/`memberships` (F11). Een organisatiecoach/staff krijgt nooit automatisch F10 `RECOVERY_HEALTH`/`WOMENS_PERFORMANCE`-scopes. Organization-membership is geen consent voor gevoelige athlete-context.

## 7. Teamsport — eerlijk vastgelegd
Daadwerkelijk gebouwd: team-membership, rollen, event-planning (datum/tijd/locatie/type), aanwezigheidsregistratie, generiek taak/verantwoordelijkheid-model (sport-onafhankelijk), privacy-safe geaggregeerde analytics. **Niet gebouwd, geen claim gedaan:** teamchat (bewust DEFERRED, F9 bouwde ook geen messaging-engine), volledige wedstrijdplanning-UI. Geen UI voor enig F11-onderdeel — backend/Core/database volledig, consistent met het F10-precedent.

## 8. Gym Device Vendor Maturity (herbevestigd, geen inflatie)
EGYM Data Hub / Technogym Enterprise API: PARTNER DEPENDENT. FTMS (open standaard, dekt Technogym-cardio/Wattbike) en Keiser BLE-broadcast: ARCHITECTURE READY / NOW, geen partnerschap nodig, geen implementatie gebouwd. Life Fitness/Precor Halo: NEXT (publieke registratie). Matrix Fitness: RESEARCH FURTHER. gym80: NO-GO. Concept2: reeds geïmplementeerd, apart vastgelegd via F5/F6 (`DEV-CONCEPT2-001`), real-device-validatie blijft daar OPEN. **Geen enkele vendor is daadwerkelijk geïntegreerd — dit rapport claimt dit ook nergens.**

## 9. Dynamic Branding/Admin — Final Audit
Cross-tenant (org A user + forged/actief B → nooit B-branding, live bevestigd), removed membership → TK-default, logout → TK-default + sessionStorage-hint gewist, multi-org zonder geldige voorkeur → TK-default (geen stille keuze), invalid/malicious kleuren en logo-URL's → server-side CHECK-constraint weigert vóór opslag, client-side ook individueel genegeerd. TK-identity: "Powered by Trainingskompas" wordt bij elke `applyBrandContext()`-aanroep daadwerkelijk in de DOM gezet (sabotagebewijs geleverd). Adminmutatie: uitsluitend owner/admin, server-side RLS is de daadwerkelijke autoriteit (staff-mutatiepoging via directe API faalt, live bevestigd).

## 10. Sensitive-data isolation
Bevestigd: F11 (organization/team/branding) geeft nergens automatisch toegang tot HRV/sleep/recovery/medical/cycle/Women's Performance-context. Deze blijven exclusief onder F8/F10-consent-architectuur. Organization-/teamrol alleen is nooit voldoende.

## 11. Delete/offboarding
Member/staff removal: rechten verdwijnen onmiddellijk (RLS is stateless per request). Organization/team-delete: cascade naar locations/memberships/equipment/templates/events, geen orphans. `gyms`-branding: cascade via `organization_id → organizations`. Eén niet-blokkerende observatie (GAP-P2-024): `team_events.created_by` CASCADE kan bij account-delete van de organisator ook andermans historische aanwezigheidsregistratie meeslepen — P2, niet blokkerend, aanbeveling voor een toekomstige sprint vastgelegd.

## 12. Observability
Geen tokens/secrets/`coach_pin_hash`/`plan_key`/Mollie-identifiers/gevoelige athlete-context in logs — bestaande F1-redactieregels blijven ongewijzigd van toepassing, F11 introduceert geen nieuwe logging-paden die dit zouden omzeilen.

## 13. Shadow Architecture Audit
0 treffers voor: tweede workout/calculation-engine-klasse, hardcoded organization-ID's/klantnamen, device-specifieke calculation-formules in `core/calculation.js`/`core/decision.js`. Geen parallel tenant-, membership-, rol-, team-, locatie-, of exercise-model gevonden.

## 14. Regression evidence (fresh main, na de Quality Gate-reparatie)
`node core/release-gate.js`: 163 uitgevoerd, 0 geskipt (de Android-buildmap is deze sessie lokaal gegenereerd, dus `fAndroidRelease.test.js` draaide volledig, 29/29), 0 gefaald. Alle F11-specifieke suites herbevestigd: organizationCore/Rls, equipmentCore/Rls, gymTemplateRls, teamAnalyticsCore/Rpc/CohortFloor, teamEventsRls/AdversarialFixes, brandingCore/Rls, gymsColumnLeakFix, organizationContextRuntime, gymDeviceProviderContract. `node coaching.test.js`: 35/35. `npm run test:native`: 51/51. `tools/check-doc-consistency.js`: capability count exact 66/66; 1 bekende, eerder handmatig geverifieerde false-positive (GAP-P2-024 vermeldt "MS-F11-03 CLOSED" in de context van een onafhankelijk P2-punt, geen echte inconsistentie).

## 15. Known gaps
- **GAP-P2-024** (P2, niet-blokkerend): `team_events.created_by` CASCADE-gedrag bij account-delete.
- **PRODUCT DECISION OPEN**: `event_responsibilities.assigned_user_id` zonder verplicht teamlidmaatschap (geen data-lek, mogelijk legitiem voor vrijwilligers).
- **Teamchat**: architecture-ready/DEFERRED, geen roadmap-noodzaak binnen F11.

## 16. External/deferred validation
- Gym device vendor-partnerschappen (EGYM, Technogym Enterprise API) — extern, buiten Trainingskompas' controle.
- Matrix Fitness feasibility — vereist direct vendorcontact.
- Concept2 real-device-validatie — reeds als open vastgelegd in F5/F6, ongewijzigd.
- Geen enkele F11-UI is gebouwd (consistent met F10) — real-world organization/team-workflow-validatie blijft open.

## 17. Capability count
66/66, exact consistent tussen `CAPABILITY_REGISTRY.md`, `ROADMAP_INDEX.json`, `ROADMAP_COVERAGE_AUDIT.md`. Vijf nieuwe F11-capabilities toegevoegd tijdens deze fase (was 61 vóór F11, is nu 66): `ORGANIZATION-CORE-001` (MS-F11-01), `GYM-PROGRAMMING-EQUIPMENT-001` (MS-F11-02), `TEAMS-GROUPS-ANALYTICS-001` (MS-F11-03), `GYM-DEVICE-FEASIBILITY-001` (MS-F11-04), `DYNAMIC-BRANDING-ADMIN-001` (MS-F11-05).

## 18. Final F11 phase verdict

**"F11 GYM/CLUB/TEAM PLATFORM SOFTWARE CLOSED — EXTERNAL DEVICE/PARTNER VALIDATION OPEN"**

### Onderbouwing
Alle vijf mastersprints zijn volmondig CLOSED op basis van code/database/tests/live-adversarial-bewijs, herbevestigd op de daadwerkelijk gemergde, verse main. Meerdere kritieke security-bugs zijn tijdens de ontwikkeling zelf gevonden — nooit door een externe partij, altijd vóór of tijdens de eigen verplichte adversarial-audit — en gerepareerd met live bewijs en sabotagebewijs, geen enkele bereikte ooit productie. De row-vs-column-security-audit (een nieuwe gate, geboren uit de gyms-bevinding) bevestigt dat dit patroon zich nergens anders herhaalt. Geen tweede tenant-, workout-, calculation-, equipment-, of messaging-model is ontstaan. Organization blijft de enige tenant-identity-root; gyms is definitief een organization-gebonden presentatie-entiteit.

De enige reden dat de status niet volledig "CLOSED — READY FOR F12 SELECTION" is: MS-F11-04 is bewust een feasibility-sprint gebleven (geen vendor daadwerkelijk geïntegreerd, conform de expliciete scope-instructie) — dit is geen software-tekortkoming maar een externe afhankelijkheid (vendor-partnerschappen, hardware-toegang) die buiten Trainingskompas' eigen controle valt.

---

## F12 NOT STARTED — AWAITING EXPLICIT RELEASE

Conform de absolute fasegrens: geen F12-branch aangemaakt, geen subscriptions/billing/paywalls/entitlements/pricing/commerciële providers geïmplementeerd of onderzocht. F12 vereist een nieuwe, expliciete vrijgave.
