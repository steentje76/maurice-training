# TODAY_UX_SCREEN_SPEC.md — UX-01 VANDAAG

**Status:** SCREEN SPEC — WACHT OP PRODUCT OWNER + CHATGPT VISUEEL ONTWERP. Niets gebouwd.
**Bron:** `PRODUCT_ARCHITECTURE_TODAY_HOME_ORCHESTRATION_DETAIL.md` (volledig gelezen), huidige `index.html` Home-renderfuncties (code-geverifieerd), `NIGHT_REPORT_REASSESSMENT_AND_GYM_AUDIT.md`.

## PURPOSE
Dagelijkse orchestrator: verzamelt bestaande canonical outputs, prioriteert, dedupliceert, presenteert en biedt veilige vervolgstappen. Geen dashboard, geen kopie van huidig Home, geen metric-verzameling.

## PRIMARY USER QUESTION
"Wat is vandaag voor mij relevant en wat is mijn volgende logische actie?"

## PRIMARY ACTION
Exact één Next Best Action (NBA), rule-based geselecteerd via P0–P5. AI legt uit, kiest nooit.

## INFORMATION HIERARCHY (mobile-first, boven de fold = secties 1–2, begin 3)
1. Header → 2. Next Best Action → 3. Today Timeline → 4. Relevante context (alleen indien relevant) → 5. Progress snapshot (klein) → 6. Quick actions.

## SECTION 1 — HEADER
- Begroeting + voornaam (tijdsafhankelijk: Goedemorgen/-middag/-avond — bestaat al in CURRENT).
- Datum (lokale timezone, expliciet gemodelleerd — geen UTC-dag).
- Profiel-avatar rechtsboven → Profiel (PROFILE-AVATAR-001; fallback-avatar verplicht).
- Optioneel P0-indicator (alleen bij account/security/consent-actie).
- **Omitted:** de huidige "heartbeat/status"-knop (CURRENT: niet als vast element gevonden; functie onduidelijk) → REMOVE FROM TODAY tenzij PO een reden geeft.

## SECTION 2 — NEXT BEST ACTION
E�n dominante kaart. Inhoud per bron:
| Bron | Voorbeeld NBA | Secundaire actie |
|---|---|---|
| Geplande training | "Start Training A — Kracht, 18:00" | Preview / Verplaats |
| Onafgemaakte training | "Hervat training (12 min geleden gepauzeerd)" | Afronden zonder data |
| Teamtraining | "Teamtraining 19:00 — verzamelen 18:30" | Beschikbaarheid doorgeven |
| Coach assignment | "Nieuwe opdracht van [coachnaam]" (afzender altijd zichtbaar) | Bekijk |
| Recovery-actie | alleen via Decision Rule, nooit "rust" op HRV alleen | Bekijk herstel |
| Device | "PM5 verbinden voor RowErg-blok" | Start zonder verbinding |
| Planningconflict | "Twee trainingen overlappen om 18:00" | Los op |
| P0 account | "Bevestig je e-mailadres" / "Koppeling verlopen — opnieuw inloggen" | — |
| Geen planning | "Plan je eerste training" / "Kies een programma" | Vrij trainen |
Altijd een "Waarom zie ik dit?"-ontsluiting (deterministische explainability: bron, regel, confidence).

## SECTION 3 — TODAY TIMELINE
Chronologisch, alleen relevante commitments. Per item: tijd, type-icoon + tekstlabel (geen kleur-only), status (PLANNED/READY/IN_PROGRESS/COMPLETED/SKIPPED/MISSED/RESCHEDULED/CANCELED), bron-label (programma / coach / team / eigen).
Ondersteunt: geen planning (sectie verborgen, NBA = empty-state), één training, meerdere trainingen (NBA wisselt na afronding van de eerste), multisport (blokken, fueling gekoppeld aan relevante sessie), wedstrijd (A/B/C-prioriteit zichtbaar), teamtraining (verzameltijd + locatie), coach assignment, rustdag (expliciet "Rustdag — gepland", geen lege staat).
Dedupe: één teamtraining verschijnt één keer, ook als hij in kalender, team, coach én notificatie bestaat.

## SECTION 4 — RELEVANTE CONTEXT (CONTEXTUAL — verschijnt alleen wanneer relevant)
| Context | Toon alleen als | Vorm |
|---|---|---|
| Herstel | altijd compact indien data; anders "Geen herstelgegevens vandaag" (nooit groen bij ontbreken) | "Herstel 79/100 · Train beheerst · 1 datapunt ontbreekt → Bekijk herstel" |
| Weer | outdoor-activiteit gepland én bron/freshness bekend | temperatuur/neerslag/wind + timestamp |
| Device | verbinding nodig, sync-fout, of device nodig voor komende training | statuskaart + herstelactie; "Start zonder wearable" blijft |
| Nutrition | lange duurtraining/event gepland, of training net afgerond | fueling-reminder / post-training log |
| Coach | ongelezen feedback/bericht (Human) | afzender + tijd, nooit vermengd met AI |
| Team | open beschikbaarheid/taak, aankondiging | actieknop |
| Event | event binnen taper-venster | countdown + plan-referentie |
Stale data krijgt altijd een freshness-label ("HRV van 3 dagen geleden" — nooit als "vandaag gemeten").

## SECTION 5 — PROGRESS SNAPSHOT (CONTEXTUAL, klein)
Maximaal 1–2 regels uit de canonieke PR-/trend-engine: "Front squat — e1RM verbeterd deze week" / "4 van 4 geplande sessies afgerond". Nooit charts, volume-analytics, correlaties of body-trends (→ Inzicht). Niet elke dag verplicht.

## SECTION 6 — QUICK ACTIONS (CONFIGURABLE, 4–6)
Kandidaten na duplicatiecheck met bottom-nav:
- **Aanbevolen defaults:** Vrij trainen · Training maken · Activiteit loggen · Voeding loggen.
- **Contextueel:** Hardlopen / Fietsen / Kracht (sportprofiel-afhankelijk), Meting toevoegen, Planning openen.
- **Afgewezen als quick action:** "Coach" (redundant: Coach is primaire nav), "Inzicht", "Samen" (idem).
Kritieke NBA/waarschuwingen verdwijnen nooit door personalisatie.

## DEEP LINKS
Training → Training Preview → Execution · Herstel → Inzicht › Herstel · Teamtraining → Samen › Team › Event · Coach-item → Coach › Human Coach · Profiel-avatar → Profiel · Device → in-workout connect óf Profiel › Apparaten · Progress → Inzicht › Prestaties · Event → Trainen › Wedstrijden.

## PERSONALIZATION
FIXED: header, NBA-positie, P0-items. CONTEXTUAL: timeline, context-kaarten, progress. CONFIGURABLE: quick actions (herschikken/toevoegen/verwijderen). **PO-beslissing open:** mogen niet-kritieke context-kaarten (weer, nutrition) door de gebruiker permanent uit worden gezet?

## STATES (13)
| # | State | Top content | NBA | Context | Hidden |
|---|---|---|---|---|---|
| 01 | Normale trainingsdag | Training A 18:00 | Start | herstel compact | analytics |
| 02 | Rustdag | "Rustdag — gepland" | Bekijk herstel / Plan morgen | herstel, vooruitblik | training-CTA |
| 03 | Meerdere trainingen | Timeline 2+ items | eerste niet-afgeronde | fueling tussen sessies | — |
| 04 | Teamtraining | Team 19:00, verzamelen 18:30 | Beschikbaarheid / Start | locatie, taken | persoonlijke recovery van anderen (nooit) |
| 05 | Wedstrijd/event | Event + A-prioriteit | Bekijk raceplan | fueling-plan, weer, device | gewone training-CTA |
| 06 | Recovery caution | Training + Decision-signaal | Bekijk aangepaste suggestie | "Signaal, geen diagnose" | "je bent overtraind"-taal (nooit) |
| 07 | Missing recovery data | Training | Start | "Geen herstelgegevens — niet als goed geïnterpreteerd" | groen readiness |
| 08 | Geen wearable | Training | Start | handmatige RPE-optie; device-koppelen secundair | wearable-CTA als NBA (nooit) |
| 09 | Offline | Laatst bekende planning + freshness-badge | Start (lokaal beschikbaar) | "Offline — laatste sync 08:12" | server-state-claims |
| 10 | Sync error | Training | Start | device-kaart met herstelactie | — |
| 11 | Planningconflict | Conflict-kaart | Los op | beide items | automatische keuze (nooit) |
| 12 | Coach assignment | "Toegewezen door [coach]" | Bekijk | afzender-label | AI-vermenging |
| 13 | P0 account/privacy | P0-banner bovenaan | Los op | — | alles lager blijft zichtbaar maar onder P0 |

## EMPTY STATE (nieuwe gebruiker)
Geen leeg dashboard. NBA = "Plan je eerste training", secundair: Kies programma · Vrij trainen · Rond sportprofiel af · (optioneel) Koppel device · Join team via invite. Wearable-koppeling nooit de eerste CTA.

## LOADING STATE
Skeleton per sectie; NBA-sectie eerst. Eén falend subsysteem degradeert alleen zijn eigen kaart.

## OFFLINE STATE
Zie state 09. Queue logging; reconciliatie bij reconnect zonder dubbele executions.

## ERROR STATE
Per capability: "Planning niet beschikbaar" / "Herstelberekening niet beschikbaar" / "Weer niet beschikbaar" — Home blijft bruikbaar.

## ACCESSIBILITY
Semantische koppen per sectie; NBA als eerste focus; alle status via icoon + tekst (nooit kleur-only); touch targets ≥ 44pt; dynamische tekst met reflow; reduced motion; fouten via live-region; screenreader-label op avatar ("Profiel, Maurice").

## PRIVACY
Alleen data met athlete-authorization. Team/gym-context lekt nooit andermans recovery. Gevoelige Women's Performance/nutrition/recovery alleen volgens consent. Push-preview ≠ Home-content.

## AI BOUNDARIES
AI mag: samenvatten, uitleggen ("Waarom zie ik dit?"), onzekerheid benoemen. AI mag niet: prioriteren, herberekenen, readiness verzinnen, training verplaatsen, coach-assignment overschrijven, diagnose. Human Coach-items altijd visueel/semantisch gescheiden van AI.

## EVIDENCE/DATA QUALITY
Elk item draagt bron (measured/imported/manual/derived), freshness, confidence, missingness. "Geen data ≠ alles goed."

## CURRENT → TARGET MAPPING (elk huidig Home-element, code-geverifieerd)
| CURRENT element | Classificatie | Reden |
|---|---|---|
| Begroeting + naam | KEEP | matcht header |
| Datum | KEEP | met expliciete timezone |
| Profile button | KEEP → MOVE rechtsboven | PO-besluit |
| Heartbeat/status button | REMOVE FROM TODAY (UNKNOWN functie) | niet als vast element gevonden; PO bevestigt |
| Coach Vandaag (`renderCoachAdvies`) | MERGE → NBA + "Waarom?" | wordt de uitleglaag bij NBA, geen aparte kaart |
| "Voorzichtig vandaag" (dynamisch Decision-label) | REDUCE → compact recovery-signaal | alleen als Decision Rule het triggert |
| Herstel/readiness | REDUCE + CONTEXTUAL | compact op Vandaag; detail → Inzicht › Herstel |
| Jouw ritme | MOVE → Inzicht | trend-informatie, niet dag-relevant |
| Vandaag gepland / Training A (`renderTodayCta`) | KEEP → NBA + timeline | kern van Vandaag |
| Weer | CONTEXTUAL | alleen bij outdoor-planning (CURRENT: 22 treffers in app, niet in Home-context-card) |
| Actieve dagen / volume (`renderWeekStats`) | MOVE → Inzicht | analytics |
| Trainingsschema (`renderHomeProgramCard`) | REDUCE → timeline-bronlabel + Trainen | programma-detail hoort onder Trainen |
| Recente vooruitgang (`renderHomeImprove`) | REDUCE → progress snapshot (1–2 regels) | rest → Inzicht |
| Motivational text (`renderMotivatie`) | REMOVE FROM TODAY | geen canonical engine erachter; geen streak-guilt |
| Quick actions (`renderQuickActions`) | KEEP → REDESIGN als configurable registry | Quick Action Registry bestaat nog niet |

## ACCEPTANCE CRITERIA (voor latere implementatie, niet nu)
Zie brondocument §46: deterministische prioriteit, rule-based NBA, dedupe, conflict-escalatie, freshness, missing≠zero, no-wearable werkt, multisport werkt, AI/human gescheiden, quick actions veilig configureerbaar, notification≠Today-state, timezone/DST, offline reconciliatie, RLS geen lek, graceful degradation, empty state bruikbaar, explainability, telemetry zonder sensitive data, accessibility getest.

## TEKSTUELE WIREFRAME (informatiehiërarchie, GEEN visueel ontwerp)
```
┌───────────────────────────────┐
│ Goedemorgen, Maurice      (○) │  ← avatar → Profiel
│ Woensdag 3 september          │
│ [P0-banner alleen indien nodig]│
├───────────────────────────────┤
│ VOLGENDE ACTIE                │
│ Training A — Kracht · 18:00   │
│ Programma week 3 · bron: eigen│
│ [ Start ]   Preview · Verplaats│
│ Waarom zie ik dit? ›          │
├───────────────────────────────┤
│ VANDAAG                       │
│ 07:30 ✓ Herstelcheck          │
│ 12:30 ○ Fueling (lange rit)   │
│ 18:00 ○ Training A            │
│ 19:00 ○ Teamtraining · 18:30  │
├───────────────────────────────┤
│ RELEVANTE CONTEXT             │
│ Herstel 79 · Train beheerst   │
│ 1 datapunt ontbreekt → Herstel│
│ [weer/device/coach alleen     │
│  indien relevant]             │
├───────────────────────────────┤
│ VOORTGANG                     │
│ Front squat · e1RM ↑ deze week│
├───────────────────────────────┤
│ SNELACTIES                    │
│ Vrij trainen · Training maken │
│ Activiteit · Voeding    [⚙]   │
├───────────────────────────────┤
│ Vandaag Trainen Inzicht Coach │
│                         Samen │
└───────────────────────────────┘
```
