STATUS: CANONICAL — SOURCE OF TRUTH

# TrainingKompas — Route Map

Consolidatie van de Fase 0 / 0B / 0C action-level navigatie-audits.
Read-only bewijs, geen enkele fix uitgevoerd tijdens de audit-passen.
Zie `TRAININGSKOMPAS_ROUTE_RULES.md` voor de invariants.

**LAST_VERIFIED_SHA (main): `0eecff7d3ed6d6fb3065b295bd3d180e18c18964`**
(APP_VER v4.69.74 — ongewijzigd)

**WAVE 1 (branch `fix/navigation-root-cause-wave-1`) — RC-OVL-01 en RC-OVL-02
gerepareerd.** Zie §2a hieronder. Alle overige root causes (RC-NAV-01/02/03,
RC-OVL-03, RC-IA-01) staan nog OPEN.

**AUDITED DOMAINS: A (Vandaag) · B (Trainen Hub) · D (Coach) · E (Inzicht) ·
F (Samen) · G (Profiel)**

Niet-geauditeerde (sub)domeinen — NIET impliciet compleet: interne Workout
Builder, volledige Oefeningen-bibliotheek, Running/Cycling/Swimming/HYROX-
detailschermen, Nutrition-functionaliteit voorbij het navigatie-niveau,
Kalender/Programma-interne acties, Instellingen-scherm intern, C (Training
Shell/Execution — wél deels behandeld in Fase 0B, niet als eigen letter-
domein herhaald hier).

---

## 1. Cross-domain totalen

| Domein | Contracts | GREEN | AMBER | RED | UNKNOWN |
|---|---|---|---|---|---|
| A — Vandaag | 11 | 9 | 1 | 0 | 1 |
| B — Trainen Hub | 24 | 19 | 1 | 4 | 0 |
| D — Coach | 13 | 9 | 1 | 3 | 0 |
| E — Inzicht | 17 | 9 | 4 | 4 | 0 |
| F — Samen | 6 | 5 | 0 | 1 | 0 |
| G — Profiel | 20 | 20 | 0 | 0 | 0 |
| **TOTAAL (na Wave 1)** | **91** | **71** | **7** | **12** | **1** |

Controle: 71 + 7 + 12 + 1 = 91 ✓ (was vóór Wave 1: 65/7/18/1)

### 2a. Wave 1 — uitgevoerd

**Centrale fix (geen architectuurherschrijving):** `tkNavModaalOpen()` is
uitgebreid tot `tkNavTopmostOverlay()`, die naast `.modal-bg.open` nu ook
`.tk-confirm-bg` (confirmModal) en `.exec-overlay.open` (execution-sheets)
herkent en sluit via hún eigen bestaande mechanisme (`closeModal`, de
`.tk-confirm-cancel`-knop, `closeExecOverlay`). De popstate-handler roept nu
`tkNavTopmostOverlay()` aan i.p.v. `tkNavModaalOpen()`. Geen nieuwe globale
state, geen wijziging aan de bestaande `tkNavStack`/`go()`-mechanica.

**Bewijs:** `core/fNavigatie.test.js`, nieuwe sectie E (5 assertions):
Android Back sluit een open confirmModal zonder het scherm te wisselen (E1),
sluit een open execution-sheet zonder de training te verlaten (E2), een
`.modal-bg` heeft precedentie boven confirm/exec als er toevallig meerdere
open zouden staan (E3), gewoon terugnavigeren zonder overlay blijft
ongewijzigd (E4), en de bestaande Coach-vanuit-Training-terugkeer
(RC-NAV-03) wordt niet per ongeluk door de nieuwe check onderschept (E5).
21/21 tests groen in dit bestand; volledige suite 356/358 groen (2 vooraf
bestaande, omgevingsgebonden falingen — bevestigd los van deze wijziging).

**RC-OVL-01 — FIXED (Wave 1).** Alle 6 geverifieerde instanties (B-26, D-03,
D-05, P-14, P-15, E-15) RED → GREEN. De overige, niet individueel als
action-contract geauditeerde confirmModal-aanroepen (49 totaal in de app)
profiteren van dezelfde centrale fix, aangezien de popstate-check nu op
klasse `.tk-confirm-bg` werkt, niet op een specifieke actie.

**RC-OVL-02 — FIXED (Wave 1).** Alle 6 execution-sheets (exec-overview/
next/stop/explain/pause/note) worden nu door Android Back correct gesloten
zonder de onderliggende training te verlaten.

**Nog OPEN na Wave 1:** RC-NAV-01, RC-NAV-02, RC-NAV-03, RC-OVL-03, RC-IA-01
— zie root cause registry hieronder voor hun oorspronkelijke, ongewijzigde
status.

Non-nav interaction contracts (apart, niet in bovenstaande totalen):
A=2, B=3, D=4, E=4, F=8, G=6 → **totaal 27**.

Dead/Unreachable: A=1 (module), B=0, D=1, E=0, F=1, G=0 → **3 registraties**
(zie §5, aantal onderliggende acties per registratie verschilt).

Non-existent: A=2, D=1, F=4 → **7 registraties** (zie §5).

---

## 2. Root Cause Registry

Elke RED wordt hier onder precies één root cause geconsolideerd.

### RC-NAV-01 — Directe screen-activatie buiten `go()` → Android Back mist niveau
Rechtstreekse `.scr`-classmanipulatie i.p.v. `go()`, dus geen `tkNavStack`-push.
Zichtbare terugknop (indien aanwezig) werkt vaak wél correct — het is
specifiek Android Back dat een navigatieniveau overslaat.

| Instantie | Actie-ID | Severity |
|---|---|---|
| Coach/PT sporter-detail openen | D-04 | P2 |
| Samen bericht-thread openen (`openMessageThread`) | F-05 | P2 |

**Instances: 2**

### RC-NAV-02 — Hardcoded wrong-parent op zichtbare terugknop
Terugknop wijst altijd naar hetzelfde hardcoded scherm, ongeacht werkelijke
herkomst. Android Back werkt via `tkNavStack` doorgaans wél correct (bewijst
dat alleen de zichtbare knop het probleem is) — behalve waar expliciet anders
vermeld.

| Instantie | Actie-ID | Terug naar (fout) | Severity |
|---|---|---|---|
| Workout Builder | B-10 / B-18 / B-25 | `s-home` (altijd) | P2 |
| Oefeningen-bibliotheek | B-19 | `s-home` (altijd) | P2 |
| Inzicht → Herstel | E-03 | `s-lichaam` (altijd) | P2 |
| Inzicht → Lichaam | E-05 | `s-lichaam` (altijd) | P2 |
| Inzicht → Verbanden | E-07 | `s-lichaam` (altijd) | P2 |

**Instances: 5** (Builder telt als één surface met 3 fysieke ingangen)
**Bewezen fix-patroon reeds aanwezig in de codebase:** `tkNavGoBack(fallback)`
(zie Profiel → Meldingen/Privacy/Help, die dit al correct doen).

### RC-NAV-03 — Contextuele Coach dubbele history-push
`openCoachSession()` legt handmatig een extra `history.pushState({coach:true})`
neer, bovenop de automatische push van `go('s-coach')`. Eerste terugactie
werkt (herstelt zelfs de exacte oefening + scroll), maar laat een weesentry
achter in de browserstack.

| Instantie | Actie-ID | Severity |
|---|---|---|
| Training-oefening → "Vraag Coach" → terug | D-01 / D-02 | P2 |

**Instances: 1**

### RC-OVL-01 — `confirmModal()`/`.tk-confirm-bg` niet Android-Back-aware — **FIXED (Wave 1)**
`tkNavModaalOpen()` checkt uitsluitend `.modal-bg.open`. `confirmModal()`
gebruikt de aparte klasse `.tk-confirm-bg` en wordt dus nooit herkend.
Android Back sluit de bevestiging niet; de onderliggende navigatie kan
ondertussen wel doorgaan.

| Instantie | Actie-ID | Severity |
|---|---|---|
| Training hervatten-prompt ("Niet-afgeronde training gevonden") | B-26 | P1 |
| Coach — "Gesprek wissen" | D-03 | P1 |
| Coach/PT — "Coachrelatie beëindigen" | D-05 | P1 |
| Profiel — "Uitloggen" | P-14 | P1 |
| Profiel — "Account verwijderen" (2× confirmModal na elkaar) | P-15 | P1 |
| Inzicht — "Doel verwijderen" | E-15 | P1 |

**Instances: 6 individueel geverifieerd.** Aanvullend bewijs: `grep -c
"confirmModal("` op `index.html` geeft **49 totale aanroepen** in de hele
app — de daadwerkelijke blootstelling is dus groter dan de 6 hier individueel
als action-contract geaudite instanties.

### RC-OVL-02 — `.exec-overlay` niet Android-Back-aware — **FIXED (Wave 1)**
Zes execution-sheets (`ensureExecOverlay()`/`closeExecOverlay()`), allemaal
rechtstreeks aan `document.body` toegevoegd, buiten enig `.scr`-scherm.
`tkNavModaalOpen()` checkt niet op `.exec-overlay.open`. Android Back
navigeert het onderliggende trainingsscherm weg terwijl de sheet zichtbaar
blijft zweven op het scherm waar de gebruiker vervolgens landt.

| Sheet | Severity |
|---|---|
| exec-overview | P1 |
| exec-next | P1 |
| exec-stop | P1 |
| exec-explain (Techniek & uitleg) | P1 |
| exec-pause (Pauzeren) | P1 |
| exec-note | P1 |

**Instances: 6** (ACTIVE-HIGH — pauzeren/volgende-oefening worden in vrijwel
elke trainingssessie gebruikt).

### RC-OVL-03 — Ad-hoc `modal-bg` herkend maar niet sluitbaar (ontbrekend id)
`showCardioDetail()` bouwt een modal-element met class `modal-bg open` maar
zonder `id`-attribuut. `tkNavModaalOpen()` vindt het element wél (class-match),
maar `closeModal(modaal.id)` faalt stil (`getElementById('')` → `null` →
crash binnen een lege `try/catch`). Android Back "verbruikt" de terugactie
zonder de modal daadwerkelijk te sluiten.

| Instantie | Actie-ID | Severity |
|---|---|---|
| Voortgang → cardio 1RM-item detail | E-17 | P2 |

**Instances: 1**

### RC-IA-01 — Meerdere kaarten landen ongedifferentieerd op dezelfde surface
Specifiek gelabelde kaarten (Prestaties/Belasting/Doelen) claimen een
deelonderwerp maar landen altijd bovenaan dezelfde lange `s-stats`-pagina,
zonder anchor/scroll — terwijl de app elders (`openHelpFeedback()`) al een
bewezen scroll-naar-sectie-patroon heeft.

| Instantie | Actie-ID | Severity |
|---|---|---|
| Inzicht → Prestaties | E-02 | P3 |
| Inzicht → Belasting | E-04 | P3 |
| Inzicht → Doelen | E-08 | P3 |
| Vandaag → Doelen-preview-kaart | A-10 | P3 |

**Instances: 4**

### RC-DATA-01 — zie Functional/Data Architecture Issues (§3), geen gewone nav-root-cause.

---

**UNIQUE ROOT CAUSES: 7** (RC-NAV-01/02/03, RC-OVL-01/02/03, RC-IA-01)
plus 1 apart geregistreerd functioneel/data-issue (RC-DATA-01 / FD-01).

**P1 instances: 12** (RC-OVL-01: 6 + RC-OVL-02: 6)
**P2 instances: 9** (RC-NAV-01: 2 + RC-NAV-02: 5 + RC-NAV-03: 1 + RC-OVL-03: 1)
**P3 instances: 4** (RC-IA-01: 4)
Totaal RED action-contracts in de per-domein matrices: **18** — dit telt
elke B-10/B-18/B-25-groep als één matrix-rij (Builder), dus 18 ≠ som van
bovenstaande instance-counts (21) omdat de root-cause-registry losse fysieke
ingangen apart telt waar de domein-matrix ze als één contract groepeerde.
Beide tellingen zijn intern consistent binnen hun eigen doel (matrix =
audit-dekking per contract; registry = reparatie-omvang per root cause).

---

## 3. Functional / Data Architecture Issues

### FD-01 — Dubbele voedingregistratiearchitectuur (D3, bevestigd)

Twee onafhankelijke, structureel gescheiden systemen voor hetzelfde
kernconcept (dagelijkse voedingsinname):

| | `#s-nutrition` | `#s-voeding` |
|---|---|---|
| Databron | `nutrition_entries` | `nutrition_meals` + `nutrition_meal_items` |
| Rekenkern | `NutritionFoundationCore` | `NutritionTargetService` (macro-doelen) |
| Entry | Lichaam → 🍽️ | Inzicht → "Voeding" |

**Bewezen risico:** gegevens gelogd via de ene interface zijn **niet
automatisch bewezen zichtbaar** in de andere — verschillende tabellen, geen
gevonden synchronisatie ertussen.

**Classificatie: D3, FUNCTIONAL / DATA ARCHITECTURE ISSUE — geen gewone
navigatiefout.** Niet gerepareerd, niet gemigreerd, geen canonical keuze
gemaakt in deze pas.

---

## 4. PO Decisions Required

### PO-01 — Betekenis van "Belasting" vanuit Inzicht

- **Kandidaat A:** `s-stats` → "Volume per spiergroep", historisch, laatste
  7 dagen, niet-interactief.
- **Kandidaat B:** `s-lich-spieren` ("Herstel & belasting") → actuele
  hersteltoestand per spiergroep, interactief, klikbaar naar detail.

Beide zijn inhoudelijk legitiem or "Belasting" — niet uit code alleen op te
lossen welke de canonical home moet zijn.

**Status: PO DECISION REQUIRED.** Geen keuze gemaakt.

---

## 5. Dead / Unreachable Registry

Onderscheid: **DEAD MODULE** (code bestaat, draait zelfs, maar de output is
nooit zichtbaar) versus **DEAD FORWARD ENTRY** (het scherm zelf werkt prima
en is zelfs bereikbaar als terugbestemming, maar er is geen enkel pad om er
naartoe te navigeren).

| Registratie | Type | Beschrijving |
|---|---|---|
| Vandaag `DASHUI`-module | DEAD MODULE | Rendert in permanent `display:none` `#home-dash`. Bevat 6 eigen (nooit zichtbare) acties: statusCard, todayCard (3 varianten), quickActions, lastTrainingCard, lastPerfCard. Nog wel bij elke Vandaag-load uitgevoerd (verspilde berekening, geen schade). |
| Samen `#s-messages` | DEAD FORWARD ENTRY | Conversatielijst-scherm werkt correct, heeft een correcte terugknop-bestemming vanuit `#s-message-thread`, maar geen enkele knop/kaart in de huidige UI opent het voorwaarts. |
| Coach `#s-intake` (na eerste gebruik) | DEAD (per gebruiker, CONDITIONAL bij eerste boot) | Onboarding-gate; geen "opnieuw doorlopen"-pad gevonden. |

**Registraties: 3**

## Non-Existent Registry (nooit gebouwd — geen dead code, geen bug)

| Item | Domein |
|---|---|
| Coach-stijl/toon als losse, na-onboarding beheerbare instelling | D |
| Nutrition/Voeding-snelkoppeling op Vandaag | A |
| Wearable/device-statuskaart op Vandaag | A |
| Vriend/profieldetail-scherm | F |
| Groepsdetail-scherm | F |
| Notificatie-deep-link naar bron | F |
| Blokkeren/rapporteren vanaf een profiel (zelf-gedocumenteerd: "volgende sprint") | F |

**Registraties: 7**

---

## 6. Presentation / Visual Debt Registry (apart van navigation REDs)

| Item | Domein | Classificatie |
|---|---|---|
| 👥-emoji als Samen-snelkoppeling op Vandaag-header | A | L2 |
| 🍽️-emoji als Voeding-snelkoppeling op Lichaam-header | E | L2 |
| Emoji-statusiconen (🏆📈⚖️🌿✓•) in Coach-conclusiekaart na training | D | L2 |
| Rauwe user-UUID als gesprekslabel in berichtenlijst (i.p.v. resolved display name) | F | Presentation/data debt |
| EN "Resume"-knoptekst naast NL `aria-label` bij Running/Cycling/Swimming-hervatten | B | Copy-inconsistentie |
| 6 verschillende visuele/copy-patronen voor "hervatten" over activiteitstypen | B | L2/IA |

Geen redesign uitgevoerd of voorgesteld hier.

---

## 7. Open Evidence Items

### EV-01 — Vandaag A-11 "Verder met programma"
`startProgramBlockTraining()` → `maybeShowScheduleGate()`. Aanroepketen niet
tot de uiteindelijke schermbestemming herleid.
**NAV_STATUS: UNKNOWN — nooit als GREEN geregistreerd (R-008).**

### EV-02 — Onboarding `intakeValueCTA()` / `intakeGoHome()` — patroon bewezen, buiten geauditeerde scope

Herbeoordeeld tegen actuele code (regel 11305-11321, ongewijzigd door Wave 1).

Bewezen tegen de drie vereiste criteria:
1. **Navigation action contract**: ja — beide chip-handlers (`intakeGoHome()` en
   de inline "Bekijk mijn trainingen"-handler) veroorzaken een zichtbare
   schermwissel vanuit de AI-intake.
2. **Directe `.scr`-activatie buiten `go()`**: ja, letterlijk —
   `document.querySelectorAll('.scr').forEach(s=>s.classList.remove('active'))`
   gevolgd door `classList.add('active')` op het doelscherm, zonder één
   aanroep naar `go()`.
3. **Aantoonbare Android Back-afwijking**: ja — omdat `go()` wordt omzeild,
   wordt `tkNavPush()` nooit aangeroepen voor deze stap. Android Back na
   zo'n overgang kan daardoor niet naar de intake terugkeren (geen stack-
   entry) en `tkPaintBnav()` wordt evenmin aangeroepen, dus de bottom-nav
   kan tijdelijk de verkeerde tab tonen na aankomst op `s-home`/`s-train-mgr`.

Dit matcht **exact** het RC-NAV-01-patroon (directe screen-activatie buiten
`go()` → Android Back mist niveau).

**Toch niet toegevoegd aan de 91 geauditeerde action-contracts.** Onboarding/
intake valt buiten de zes geauditeerde domeinen (`A, B, D, E, F, G` — zie
`metadata.audited_domains` in de JSON). Canonical opname zou een nieuwe
domeinscope (of een uitbreiding van domein A) vereisen, wat de PO-
geverifieerde 71/7/12/1=91-telling van deze Wave zou wijzigen zonder
expliciete PO-goedkeuring voor scope-uitbreiding.

**Status: PROVEN PATTERN, UNVERIFIED SCOPE.** Root cause: RC-NAV-01
(patroonmatch). Geen functionele fix in deze Wave. PO-beslissing nodig:
onboarding toevoegen als nieuw geaudit domein (bv. domein "H — Onboarding")
in een volgende scope, vóórdat dit als canonical action-contract meetelt.

---

## 8. Action Contracts (volledige lijst, oorspronkelijke IDs behouden)

Kolommen verkort weergegeven; volledige velden (STATE_READ/WRITE,
EXTERNAL_EXIT, VISUAL_GENERATION, enz.) staan in de onderliggende
domein-audits en in `TRAININGSKOMPAS_ROUTE_MAP.json`.

### Domein A — Vandaag
| ID | Label | Destination | Nav_status | Root cause |
|---|---|---|---|---|
| A-01 | 👥 (header) | s-social | GREEN | — |
| A-02 | offline-badge (CONDITIONAL) | m-offline-queue | GREEN | — |
| A-03 | HRV check-in invoeren | m-hrv | GREEN | — |
| A-04 | Coach-kaart | s-coach | GREEN | — |
| A-05 | Training bekijken | m-training-preview | GREEN | — |
| A-06 | Quick action Coach | s-coach | GREEN | — |
| A-07 | Quick action Stats | s-stats | GREEN | — |
| A-08 | Quick action Logboek | s-hist | GREEN | — |
| A-09 | Quick action Plate Calculator | m-plate-calc | GREEN | — |
| A-10 | Doelen-preview-kaart | s-stats (top) | AMBER | RC-IA-01 |
| A-11 | Verder met programma | onbekend (EV-01) | UNKNOWN | — |

### Domein B — Trainen Hub
| ID | Label | Destination | Nav_status | Root cause |
|---|---|---|---|---|
| B-01 | profiel-icoon | s-profiel | GREEN | — |
| B-02 | sportkeuze (NON-NAV) | — | — | — |
| B-03 | plan-kaart | m-training-preview | GREEN | — |
| B-04 | "Bekijk details" (plan-kaart) | m-training-preview | AMBER | label-ambiguïteit |
| B-05 | Start training (plan-kaart) | m-training-preview | GREEN | — |
| B-06 | Bekijk programma's (empty) | s-programma | GREEN | — |
| B-07 | Mijn trainingen | s-train-mine | GREEN | — |
| B-08 | Programma's | s-programma | GREEN | — |
| B-09 | Planning | s-kalender | GREEN | — |
| B-10 | Kracht (quick-act) | s-builder | RED | RC-NAV-02 |
| B-11 | Hardlopen | s-running | GREEN | — |
| B-12 | Fietsen | s-cycling | GREEN | — |
| B-13 | HYROX | m-hyrox-setup | GREEN | — |
| B-14 | Meer (toggle, NON-NAV) | — | — | — |
| B-15 | Zwemmen | s-swimming | GREEN | — |
| B-16 | Triathlon-brick | m-hyrox-setup | GREEN | — |
| B-17 | Losse oefening | m-los-oefening | GREEN | — |
| B-18 | Training maken (AI) | s-builder | RED | RC-NAV-02 |
| B-19 | Oefeningen | s-library | RED | RC-NAV-02 |
| B-20 | Trainingshistorie/Logboek | s-hist | GREEN | — |
| B-21 | s-train-detail sluiten | s-train-mgr | GREEN | — |
| B-22 | Start training (detail) | m-training-preview | GREEN | — |
| B-23 | Waarom vandaag (NON-NAV) | — | — | — |
| B-24 | Start training (modal, normal/guided) | s-guided / startT() | GREEN | — |
| B-25 | Naar Builder (custom-preview) | s-builder | RED | RC-NAV-02 |
| B-26 | Hervatten-prompt | confirmModal | GREEN (Wave 1) | — |
| B-27 | Preview annuleren | — | GREEN | — |

### Domein D — Coach
| ID | Label | Destination | Nav_status | Root cause |
|---|---|---|---|---|
| D-01 | Vraag Coach (vanuit oefening) | s-coach | RED | RC-NAV-03 |
| D-02 | Coach-back-bar | popstate→returnToTraining | RED | RC-NAV-03 |
| D-03 | Gesprek wissen | confirmModal | GREEN (Wave 1) | — |
| D-04 | Coach/PT sporter openen | s-coachpt-athlete | RED | RC-NAV-01 |
| D-05 | Coachrelatie beëindigen | confirmModal | GREEN (Wave 1) | — |
| D-06 | "Naar Home" (post-workout) | s-home | AMBER | hardcoded, niet source-aware |
| D-07 | Bottom-nav Coach | s-coach | GREEN | — |
| D-08 | Gespreksgeschiedenis | m-coach-history | GREEN | — |
| D-09 | Sessie-rij (historie) | s-coach | GREEN | — |
| D-10 | Historie sluiten | — | GREEN | — |
| D-11 | Coach/PT "Openen" (Samen) | s-coachpt | GREEN | — |
| D-12 | Coach/PT athlete "←" (in-app) | s-coachpt | GREEN | (Android Back: zie D-04) |
| D-13 | Intake bevestigen (CONDITIONAL) | — | GREEN | — |

### Domein E — Inzicht
| ID | Label | Destination | Nav_status | Root cause |
|---|---|---|---|---|
| E-00 | profiel-icoon | s-profiel | GREEN | — |
| E-01 | Bekijk details | s-stats | GREEN | — |
| E-02 | Prestaties | s-stats (top) | AMBER | RC-IA-01 |
| E-03 | Herstel | s-lich-health | RED | RC-NAV-02 |
| E-04 | Belasting | s-stats (top) | AMBER | RC-IA-01 / PO-01 |
| E-05 | Lichaam | s-lich-metingen | RED | RC-NAV-02 |
| E-06 | Voeding | s-voeding | AMBER | FD-01 (nav zelf correct) |
| E-07 | Verbanden | s-lich-verbanden | RED | RC-NAV-02 |
| E-08 | Doelen | s-stats (top) | AMBER | RC-IA-01 |
| E-09 | Bekijk alle inzichten en trends | s-stats | GREEN | — |
| E-11 | + Doel | m-goal-add | GREEN | — |
| E-12 | Volledig trainingslogboek | s-hist | GREEN | — |
| E-13 | + Eten toevoegen | s-voeding-maaltijden | GREEN | — |
| E-14 | spiergroep-rij | s-lich-spier | GREEN | — |
| E-15 | Doel verwijderen | confirmModal | GREEN (Wave 1) | — |
| E-16 | Vraag de coach (per doel) | s-coach | GREEN | — |
| E-17 | Cardio 1RM-item detail | ad-hoc modal | RED | RC-OVL-03 |

### Domein F — Samen
| ID | Label | Destination | Nav_status | Root cause |
|---|---|---|---|---|
| F-01 | Mijn social-profiel & geblokkeerd | m-social-instellingen | GREEN | — |
| F-05 | Bericht (vanuit connectie) | s-message-thread | RED | RC-NAV-01 |
| F-06 | Coach/PT "Openen" | s-coachpt | GREEN | (=D-11) |
| F-10 | Thread "← Terug naar Berichten" | s-messages | GREEN | (Android Back: zie F-05) |
| F-11 | Berichten "← Terug naar Sociaal" | s-social | GREEN | — |
| F-13 | Social-instellingen sluiten | — | GREEN | — |

### Domein G — Profiel
| ID | Label | Destination | Nav_status | Root cause |
|---|---|---|---|---|
| P-00 | avatar/profiel-icoon (6 plekken app-breed) | s-profiel | GREEN | — |
| P-01 | Sportprofiel & doelen | m-atleet | GREEN | — |
| P-02 | Condities | m-condities | GREEN | — |
| P-03 | Lichaamsgegevens | s-lichaam | GREEN | — |
| P-04 | Apparaten & verbindingen | m-wearable | GREEN | — |
| P-05 | Privacy & delen | s-privacy | GREEN | (tkNavGoBack — bewezen fix-precedent) |
| P-06 | Meldingen | s-meldingen | GREEN | (tkNavGoBack — idem) |
| P-07 | Abonnement | m-plan-overzicht | GREEN | — |
| P-08 | Instellingen | s-settings | GREEN | — |
| P-09 | Help & ondersteuning | s-help | GREEN | (tkNavGoBack — idem) |
| P-10 | Feedback | s-help (scroll) | GREEN | — |
| P-11 | Account & data | m-account | GREEN | — |
| P-12 | Onderzoeksdeelname | m-research | GREEN | — |
| P-13 | Organisatie & team (CONDITIONAL) | m-team-pin | GREEN | — |
| P-14 | Uitloggen | confirmModal | GREEN (Wave 1) | — |
| P-15 | Account verwijderen | confirmModal (2×) | GREEN (Wave 1) | — |
| P-16 | Wachtwoord | m-pass-reset | GREEN | — |
| P-18 | Wachtwoord annuleren | — | GREEN | — |
| P-19 | Gegevens exporteren | m-export | GREEN | — |
| P-25 | Export sluiten | — | GREEN | — |

---

## 9. Validatie

Zie `core/routeMap.test.js` — controleert dat `TRAININGSKOMPAS_ROUTE_MAP.json`
parsebaar is, unieke action- en root-cause-IDs bevat, geldige enum-waarden
gebruikt, de zes geauditeerde domeinen aanwezig zijn, en metadata een
`last_verified_sha` bevat.
