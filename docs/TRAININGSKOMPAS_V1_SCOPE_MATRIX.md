# TRAININGSKOMPAS_V1_SCOPE_MATRIX.md

Canonieke V1-scope-matrix, bijgehouden naast
docs/TRAININGSKOMPAS_COMPLETE_FUNCTIONALITY_REGISTER.md. Doel: per
domein in een oogopslag zien of iets V1 MUST is, of het gebouwd is, en
of er een bewuste of onbewuste reden is dat iets (nog) niet bereikbaar
is voor de gebruiker.

| Domein | V1 MUST? | Software status | Product accessible? | Reden indien nee |
|---|---|---|---|---|
| Training (bouwen/loggen/programma) | Ja | Compleet | Ja | -- |
| Voeding | Ja | Compleet (grootste domein, 33 modules) | Ja | -- |
| Social | Ja | Compleet | Ja | -- |
| Coach/PT | Ja | Compleet | Ja | -- |
| Team/Gym | Ja | Compleet | Ja | -- |
| Devices/Wearables (software) | Ja | Compleet t/m Fitbit-successor+Polar/WHOOP/Oura/Garmin-fundering | Ja (UI-kaarten, deels eerlijk disabled) | Externe activatie (credentials/partnergoedkeuring/macOS) blijft open, zie WEARABLE_ACTIVATION_AND_DEVICE_PROOF.md -- blokkeert freeze niet |
| **Commercial/Billing** | **Nee (voor deze fase)** | **Compleet server-side** | **NEE -- BEWUST** | **PRODUCTBESLISSING: BETA/PRE-COMMERCIAL. billing-checkout.js intentional dormant-from-UI; billing-verify-apple.js/billing-verify-google-play.js intentional future native IAP hook. Commerciele activatie is een aparte, toekomstige product/commercial sprint (na freeze en/of tijdens livegang-voorbereiding). Geen P0, geen P1, geen freeze-blocker.** |
| Analytics/Inzicht | Ja | Compleet (nog niet audit-bevestigd op reachable-vs-backend-only, zie register sectie 7 punt 12) | Vermoedelijk ja | -- |
| Auth/account-lifecycle | Ja | Compleet (nog niet audit-bevestigd, zie register sectie 7 punt 13) | Ja | -- |

## Bekende, geregistreerde niet-P0/P1-bevindingen (geen scope-wijziging)

- Dead UI: één permanent verborgen knop (`tenant-brand-admin-btn`)
  zonder gekoppelde functie -- nul gebruikersimpact, zie
  TRAININGSKOMPAS_COMPLETE_FUNCTIONALITY_REGISTER.md sectie 5.
- 6 ongebruikte "fundering"-modules (adaptiveCoaching, coachProgramming,
  externalDataModel, nutritionDegradedStateClassifier, platformRoles,
  teamPerformance) -- classificatie (bewust vervangen vs. onafgemaakte
  integratie) nog te bepalen, zie register sectie 5.

## LEGACY ARCHIVE TABLES — Product Owner-beslissing (vastgelegd)

Negen archief-/backuptabellen uit eerdere migraties (`bak_p_sessions`,
`bak_p_training_instances`, `bak_p_exercises`, `bak_p_goals`,
`bak_p_training_exercises`, `bak_p_exercise_equipment`,
`bak_p_exercise_goals`, `bak_p_program_block_exercises`,
`hrv_log_archive_v500`).

```
LEGACY ARCHIVE TABLES
- Status:                 RETAIN TEMPORARILY (PO-beslissing)
- Toegang:                server-only -- RLS aan met NUL policies, dus
                          uitsluitend via service_role benaderbaar.
                          Live geverifieerd, geen actief productpad.
- Account/user erasure:   VERPLICHT GEDEKT -- beide verwijderpaden
                          (delete-account.js PR #316/#317 en
                          cleanup-unverified-accounts.js) ruimen deze
                          tabellen nu expliciet op.
- P0:                     Geen
- P1:                     Geen -- persoonsgegevens worden correct
                          verwijderd en er is geen ongeautoriseerde toegang
- Functional freeze:      GEEN BLOCKER
- Vervolg:                cleanup/decommissioning is een POST-FREEZE
                          technical-debt-taak. Geen destructieve
                          DROP-migratie tijdens deze audit.
```

## Openstaand vóór een freeze-beslissing genomen kan worden

Zie docs/TRAININGSKOMPAS_COMPLETE_FUNCTIONALITY_REGISTER.md sectie 7 voor
de volledige, eerlijke stand van de 17 auditpunten (4 van 17 gedaan of
deels gedaan, 13 nog niet onderzocht). Geen freeze-beslissing wordt hier
genomen -- dit document registreert scope-keuzes, niet audit-volledigheid.


---

# DEFINITIEVE V1 SCOPE MATRIX (main d3b9615b, audit afgerond)

| Domein | V1 MUST | Functional | Canonical | Accessible | Secure | Resilient | Ext. blocker | P0 | P1 | Freeze ready |
|---|---|---|---|---|---|---|---|---|---|---|
| Training (start/execution/logging/completion) | Ja | Ja | Ja (één finishSession -> completeTrainingInstance -> één sessions-write) | Ja | Ja | Ja (offline queue) | Nee | 0 | 0 | JA |
| Nutrition | Ja | Ja | Ja (canonieke queue + frozen snapshot + nutritionFoundation-totalen) | Ja (28 surfaces) | Ja (RLS eigen data) | Ja | Nee | 0 | 0 | JA |
| Social / block / privacy | Ja | Ja | Ja | Ja | Ja (bidirectionele block-enforcement in RLS) | Ja | Nee | 0 | 0 | JA |
| Coach / PT | Ja | Ja | Ja | Ja | Ja (coach_has_scope: active + enabled) | Ja | Nee | 0 | 0 | JA |
| Team / Gym | Ja | Ja | Ja (canoniek server-side; gym_id is bewuste nullable placeholder) | Ja | Ja | Ja | Nee | 0 | 0 | JA |
| Auth / account lifecycle | Ja | Ja | Ja (beide verwijderpaden gecertificeerd) | Ja | Ja | Ja | Nee | 0 | 0 | JA |
| Offline / resilience | Ja | Ja | Ja (owner_uid-isolatie, idempotente replay) | n.v.t. | Ja | Ja | Nee | 0 | 0 | JA |
| Analytics / Inzicht | Ja | Ja | Deels bewezen (purity-gate groen; geen diepteaudit per berekening) | Ja | Ja | Ja | Nee | 0 | 0 | JA (met P3-restrisico) |
| Devices / Wearables (software) | Ja | Ja | Ja | Ja | Ja | Ja | JA (credentials/hardware/macOS) | 0 | 0 | JA (software); externe validatie apart open |
| Commercial / Billing | Nee (deze fase) | Backend ja | n.v.t. | NEE -- bewust | Ja | n.v.t. | n.v.t. | 0 | 0 | n.v.t. (DEFERRED BY PO) |
| Legacy archive tables | n.v.t. | n.v.t. | n.v.t. | Server-only | Ja (RLS nul policies) | n.v.t. | Nee | 0 | 0 | Geen blocker (post-freeze debt) |

**TRAININGSKOMPAS V1 -- FUNCTIONAL SOFTWARE ARCHITECTURE FROZEN**
(aanvaard door de Product Owner). P0 = 0 open, P1 = 0 open.

Uitzonderingen, geen freeze blockers: externe wearable/provider/
real-device-validatie blijft open; commerciele activatie is deferred by
Product Owner; geregistreerde P2/P3 en legacy cleanup.

Vanaf nu wordt de functionele architectuur niet heropend zonder een nieuw
aantoonbaar P0/P1.

REIKWIJDTE: de 79 surfaces zijn ACCOUNTED FOR / REACHABILITY VERIFIED --
geinventariseerd met een bewezen navigatiepad. Dit is NADRUKKELIJK GEEN
claim dat elke surface individueel volledig functioneel is gecertificeerd
op elke read/write/interactie; die doorlichting volgt per surface in de
aparte ALL SURFACES UX/UI >=9 MASTER PHASE.
