# PRODUCT_ARCHITECTURE_INVENTORY.md — Functional Capability Inventory

| CAPABILITY-ID | Naam | Domein | UI? | Backend | DB | Tests | Status |
|---|---|---|---|---|---|---|---|
| CAP-01 | Krachttraining-logging | Training | JA | JA | `sessions` | JA | FULLY USER ACCESSIBLE |
| CAP-02 | Hardlopen (handmatig + cloud-sync) | Training | JA | JA | `activities` | JA (37+8) | FULLY USER ACCESSIBLE |
| CAP-03 | Fietsen (handmatig + cloud-sync) | Training | JA | JA | `activities` | JA | FULLY USER ACCESSIBLE |
| CAP-04 | Concept2 (RowErg/SkiErg/BikeErg) | Training | JA (binnen generieke flow) | JA | `sessions` | JA (105+) | FULLY USER ACCESSIBLE |
| CAP-05 | HYROX | Training | JA | JA | `race_segments` | onbekend (niet deze sessie geaudit) | FULLY USER ACCESSIBLE |
| CAP-06 | Programma's/kalender | Training | JA | JA | `programs` | onbekend | FULLY USER ACCESSIBLE |
| CAP-07 | Oefeningenbibliotheek | Exercise | JA | JA | exercise-catalogus | onbekend | FULLY USER ACCESSIBLE |
| CAP-08 | HRV/RHR/Sleep-tracking | Recovery | JA | JA | `hrv_log` | JA (210+) | FULLY USER ACCESSIBLE |
| CAP-09 | Readiness/Decision-signalen | Recovery | JA (indirect, via home/coach-advies) | JA | n.v.t. (on-demand) | JA | FULLY USER ACCESSIBLE |
| CAP-10 | Cyclus-tracking | Women's Performance | JA | JA | `cycle_periods` | JA (151+) | FULLY USER ACCESSIBLE |
| CAP-11 | Cyclus-training-correlatie | Women's Performance | JA (binnen s-lich-cyclus) | JA | n.v.t. | JA | FULLY USER ACCESSIBLE |
| CAP-12 | Pregnancy/postpartum/menopause | Women's Performance | NEE | NEE | NEE | N.v.t. | PRODUCT OWNER DECISION OPEN (niet gebouwd) |
| CAP-13 | Google Health-koppeling (recovery) | Wearables | JA (koppelkaart) | JA | `wearable_connections` | JA (162+) | FULLY USER ACCESSIBLE (software); EXTERNAL VALIDATION OPEN |
| CAP-14 | Google Health-activity-ingestion | Wearables | JA (indirect, verschijnt in trainingshistorie) | JA | `activities` | JA (45) | FULLY USER ACCESSIBLE (software); EXTERNAL VALIDATION OPEN |
| CAP-15 | Garmin/Strava/Polar/etc. | Wearables | NEE | NEE | NEE | N.v.t. | EXTERNAL VALIDATION OPEN (Garmin: BLOCKED, geen developer-toegang) |
| CAP-16 | Social (feed/groepen/challenges) | Social | JA | JA | `social_*` | JA | FULLY USER ACCESSIBLE |
| CAP-17 | Nutrition-logging | Nutrition | JA | JA | `nutrition_entries` | JA | FULLY USER ACCESSIBLE |
| CAP-18 | Team Operations (events/attendance/taken) | Team | **NEE** | JA | `team_events` e.a. | JA (21) | **BACKEND ONLY — UI REQUIREMENT OPEN** |
| CAP-19 | Coach/PT (relatie/programma/assignment) | Coach | **NEE** | JA | `coach_athlete_relationships` e.a. | JA (79+) | **BACKEND ONLY — UI REQUIREMENT OPEN** |
| CAP-20 | Coach notes/feedback | Coach | NEE | NEE | NEE | N.v.t. | NOT BUILT — PRODUCT OWNER DECISION OPEN (klein schema-ontwerp nodig) |
| CAP-21 | Coach Pro entitlement-gating | Commercial | NEE | NEE (0 checks) | N.v.t. | N.v.t. | NOT BUILT — PRODUCT OWNER DECISION OPEN |
| CAP-22 | Canonieke Organizations/Teams/Memberships | Gym/Club | **NEE** (legacy UI blijft actief) | JA | `organizations` e.a. | JA | **BACKEND ONLY — UI REQUIREMENT OPEN (of: legacy-laag uitfaseren)** |
| CAP-23 | Gym-beheer (legacy) | Gym/Club | JA (s-admin) | JA (legacy) | `users.gym_id` | onbekend | FULLY USER ACCESSIBLE, maar LEGACY |
| CAP-24 | AI Coach-chat | AI | JA (s-coach) | JA | n.v.t. | JA | FULLY USER ACCESSIBLE |
| CAP-25 | Account deletion/export | Privacy | JA (indirect, settings) | JA | N.v.t. (repo-breed) | onbekend | FULLY USER ACCESSIBLE |

**Belangrijkste bevinding, conform de expliciete opdracht ("zoek naar functionaliteit die WEL gebouwd is maar GEEN scherm heeft"): CAP-18, CAP-19, en CAP-22 zijn de drie grootste, volledig geverifieerde voorbeelden van grondig geteste, werkende backend-functionaliteit zonder enige gebruikersinterface.**
