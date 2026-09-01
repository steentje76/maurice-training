# Benchmark 9+ Scorecard

**Methodologie:** score = huidige, daadwerkelijk gebouwde software
(sectie 37, current != potential). Confidence weerspiegelt hoeveel
directe, verifieerbare evidence (code/tests/live gebruik) voor dit
domein binnen deze en eerdere sessies is verzameld. Geen gemiddelde
wordt als closure-gate gebruikt (sectie 6).

| Dimension | TK score | Confidence | Best comparator | Comparator | Gap to 9 | Blocking gaps |
|---|---|---|---|---|---|---|
| Endurance -- Running (execution) | 8.7 | HIGH | Garmin Connect/Strava | Volledige state machine, laps, intervallen, crash-recovery, alle bewezen; geen live GPS-tracking | 0.3 | B9G-END-001 (geen live GPS) |
| Endurance -- Running Intelligence | 8.4 | HIGH | Strava | Volume/trend/consistency/CS bewezen; geen HR-zones (bewust, geen evidence) | 0.6 | B9G-END-002 (HR-zones ontbreken) |
| Endurance -- Cycling | 8.2 | HIGH | Garmin Connect | Vergelijkbaar met Running, geen power-zones | 0.8 | B9G-END-003 |
| Endurance -- Multisport (HYROX/Triathlon/Brick) | 8.0 | MEDIUM | Garmin Connect | Correct datamodel bevestigd (B9-06), UI-diepte van HYROX/Triathlon zelf niet in deze sessie grondig getest | 1.0 | B9G-END-004 (UX niet recent gevalideerd) |
| Nutrition -- Foundation/Product | 8.3 | HIGH | Cronometer (qua discipline, niet feature-omvang) | CRUD/offline/idempotency/security bewezen; discoverability-gap (icoon i.p.v. hoofdplek) | 0.7 | B9G-NUT-001 (discoverability), B9G-UX-001 |
| Nutrition -- Intelligence | 8.5 | HIGH | MacroFactor (qua voorzichtigheid, niet precisie) | Correct, veilig, evidence-gebonden; zeer beperkte scope (bewust) | 0.5 | Geen blokkerend (bewuste scope-keuze) |
| Social -- Product Layer | 7.8 | HIGH | Strava (feed/profiel) | Profiel/connecties/groepen/challenges/sharing/comments/moderatie/notificaties allemaal bruikbaar; discoverability-gap, geen recente, brede UX-polish-ronde | 1.2 | B9G-SOC-001 (discoverability), B9G-UX-001 |
| Social -- Intelligence | 8.1 | HIGH | Strava | Activiteiten-samenvatting/challenge-context/notificatiegroepering correct, bewust geen ranking | 0.9 | Geen blokkerend (bewuste scope-keuze) |
| Platform -- Security/RLS | 9.2 | HIGH | N.v.t. (interne standaard) | Herhaaldelijk, live adversarial getest over 10+ sprints, meerdere P0's zelf gevonden en gerepareerd | -0.2 (>=9) | Geen |
| Platform -- Offline/Sync | 8.6 | MEDIUM | Strava | Bewezen queue-architectuur (idempotency, replay), maar niet elk domein (bijv. Social) even grondig offline getest als Nutrition | 0.4 | B9G-PLAT-001 |
| Platform -- Account deletion/export | 8.4 | MEDIUM | N.v.t. | Deletion consequent en herhaaldelijk bewezen; generiek account-export-contract ontbreekt nog altijd (bekend, niet-blokkerend) | 0.6 | B9G-PLAT-002 (export) |
| Strength/Exercise Core | NOT ENOUGH EVIDENCE | LOW | Hevy/Strong | Niet grondig onderzocht binnen deze of recente sessies (buiten scope van de B9-sprints) | N.v.t. | B9G-STR-001 (audit nodig) |
| Recovery/HRV/Sleep | NOT ENOUGH EVIDENCE | LOW | WHOOP | Bekend uit eerdere sessie-context (F7/F8), niet opnieuw, grondig herbeoordeeld in deze sprint | N.v.t. | B9G-REC-001 (audit nodig) |
| Women's Performance | NOT ENOUGH EVIDENCE | LOW | N.v.t. | Niet onderzocht binnen deze of recente sessies | N.v.t. | B9G-WOM-001 (audit nodig) |
| AI Coach | NOT ENOUGH EVIDENCE | LOW | N.v.t. | Bestaande architectuur (allowlist-gebaseerd) herhaaldelijk bevestigd via isolatie-audits, maar de kwaliteit/bruikbaarheid van de coachervaring zelf niet apart beoordeeld in deze sprint | N.v.t. | B9G-AI-001 (audit nodig) |
| Analytics/Longitudinal Intelligence | NOT ENOUGH EVIDENCE | LOW | TrainingPeaks | Bestaan bevestigd (F7 AdherenceIntelligenceCore, hergebruikt in B9-11), diepte niet apart beoordeeld | N.v.t. | B9G-AN-001 (audit nodig) |
| Coach/PT | NOT ENOUGH EVIDENCE | LOW | TrainingPeaks | Niet onderzocht binnen deze sessie | N.v.t. | B9G-COACH-001 (audit nodig) |
| Gym/Club/Team | NOT ENOUGH EVIDENCE | LOW | N.v.t. | Niet onderzocht binnen deze sessie | N.v.t. | B9G-GYM-001 (audit nodig) |
| UX -- Global (navigatie/discoverability) | 7.5 | HIGH | Strava/Hevy | Nieuwe, volwaardige domeinen (Sociaal/Voeding) missen een gelijkwaardige, herkenbare hoofdplek | 1.5 | B9G-UX-001 |

## Domain-subtotalen (uitsluitend voor overzicht, NOOIT als closure-gate)

- **Endurance:** gemiddeld ~8.3 (HIGH confidence op Running/Cycling,
  MEDIUM op Multisport-UX).
- **Nutrition:** gemiddeld ~8.4 (HIGH confidence).
- **Social:** gemiddeld ~8.0 (HIGH confidence).
- **Platform:** gemiddeld ~8.7 (HIGH op security, MEDIUM op offline-
  breedte/export).
- **Overige domeinen (Strength/Recovery/Women's Performance/AI/
  Analytics/Coach/Gym):** NOT ENOUGH EVIDENCE binnen deze sprint --
  vereisen een aparte, gerichte audit in een toekomstige B9-H-fase
  (B9-H3/H4/H5/H6/H7 conform de nieuwe roadmapindeling).

**Belangrijkste, harde conclusie:** geen enkele kritieke dimensie is
in deze sprint bevestigd op >=9.0 met HIGH confidence, behalve
Platform-Security (9.2). Trainingskompas is dus nog niet 9+
gecertificeerd -- dat was ook niet het doel van deze audit-sprint.

## Functional Deep-Dive uitbreiding (sectie 35: leidende benchmark vanaf nu)

| Domain | Overall old | Functional verified | UX deferred | Main functional blockers | Target |
|---|---|---|---|---|---|
| Team Operations | 6.8 | 6.8 (bevestigd: volledig backend-only, 0 UI) | N.v.t. (geen scherm bestaat) | B9G-TEAM-001: geen enkele UI/Netlify-integratie; B9G-GYM-001 (architectuurambiguïteit eerst oplossen) | 9.0 |
| Coach/PT | 7.5 | 7.5 (bevestigd: volledig backend-only, 0 UI) | N.v.t. | B9G-COACH-001: geen relatiebeheer-UI; `coach.js` is de AI-proxy, geen PT-endpoint | 9.0 |
| Devices/Wearables | 7.5 | 7.5 (architectuur bevestigd sterk) | N.v.t. | B9G-DEV-001: 0 externe, fysieke provider-validatie | SOFTWARE 9+ READY / EXTERNAL VALIDATION OPEN |
| Gym/Club | 8.0 | 8.0 (bevestigd: twee parallelle systemen) | N.v.t. | B9G-GYM-001: architecturele ambiguïteit, vereist Product Owner-beslissing | 9.0 |
| Social | 8.2 | 8.2 (bevestigd bruikbaar over 9 onderdelen) | B9G-UX-001 (discoverability, reeds B9-H1) | B9G-SOC-002: beperkte notificatie-dekking, groep-administratie-lifecycle | 9.0 |
| Triathlon | 8.2 | 8.2 (datamodel bevestigd correct via B9-06) | N.v.t. | race-vs-training-onderscheid, expliciete transitie-tijd | 8.9 |
| Women's Performance | 8.3 | NOT ENOUGH EVIDENCE | N.v.t. | vereist eigen, gerichte audit | 9.0 (na audit) |
| Ergometers | 8.3 | NOT ENOUGH EVIDENCE (Concept2-basis bevestigd, niet grondig herbevestigd) | N.v.t. | vereist eigen, gerichte audit | 9.0 (na audit) |
| Cycling | 8.5 | 8.5 (bevestigd bruikbaar) | N.v.t. | power zones (bewuste scope-keuze, geen onbedoeld gat) | 8.5 blijft grotendeels gerechtvaardigd |
| Running | 8.6 | 8.6 (bevestigd bruikbaar) | N.v.t. | HR-zones/TRIMP/decoupling (bewuste scope-keuzes) | 8.6 blijft grotendeels gerechtvaardigd |
| Recovery | 8.7 | NOT ENOUGH EVIDENCE | N.v.t. | vereist eigen, gerichte audit | 9.0 (na audit) |
| Commercial | 8.7 | MEDIUM (lees-pad bevestigd, lifecycle niet) | N.v.t. | upgrade/downgrade/cancellation-flows niet herbevestigd | 9.0 (na audit) |
| HYROX/Athlete Intelligence | 8.8 | MEDIUM (HYROX-datamodel bevestigd; Athlete Intelligence NOT ENOUGH EVIDENCE) | N.v.t. | splitsing bevestigd relevant, Athlete Intelligence apart traject nodig | 8.9 (HYROX-deel) |
