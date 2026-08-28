# TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md

**Bewijsniveau:** CODE VERIFIED tegen `main` @ `60eac70d99508a5808998a58e771a97285df9d49` (v4.69.0). Vastgesteld door de app zelf te doorzoeken (router, AI-contextopbouw, core-modules), niet overgenomen uit eerdere documentatie.

---

## 1. De verticale keten (RAW → USER EXPERIENCE)

```
RAW SOURCES                    hrv_log, weight_log, body_comp, sessions, wearable_connections,
                                cycle_periods, cycle_symptom_logs, training_context, race_segments
        ↓
NORMALIZATION / CANONICAL      commonData.js (common_data_points), externalDataModel.js,
                                deviceIntegration.js (canonical/normalize/provenance)
        ↓
CALCULATION ENGINE             calculation.js, cardio.js, progression.js, trainingLoad.js,
                                intervalEngine.js — PURE, geen DOM/DB/network (afgedwongen
                                door core/release-gate.js "Calculation/Decision Core purity")
        ↓
CONTEXT ENGINE                 contextEngine.js, cycle.js, cycleTraining.js, sportDefinition.js,
                                weather.js, athleteConstraints.js
        ↓
DECISION / RULES ENGINE        decision.js, coaching.js, adaptiveCoaching.js, scheduleAdherence.js,
                                coachProgramming.js — bevat expliciete, corroboratie-vereisende
                                regels (bv. DEC-036: deload-signaal vereist TWEE onafhankelijke
                                signalen tegelijk, nooit één los signaal)
        ↓
EVIDENCE / PROVENANCE          scientificEvidence.js (evidence_store.v1) — externe wetenschappelijke
                                onderbouwing per regel, met harde eis: UNVALIDATED evidence mag
                                geen Decision Rule voeden, AI mag nooit een entry verzinnen.
                                Decision.js zelf legt interne reken-/regelprovenance vast.
        ↓
AI COACH                       netlify/functions/coach.js (server-side proxy, JWT-geverifieerd) +
                                client-side buildCtx() in index.html — bouwt de system-prompt uit
                                AL BEREKENDE context (tkCoachDataBlok, tkHyroxCoachContext,
                                tkProgramEventContext, tkProgressionTrendContext), nooit uit
                                ongefilterde ruwe data. Code-commentaar bevestigt het principe
                                expliciet: "AI leest dit, rekent er niet mee (geen bron van
                                waarheid)".
        ↓
USER EXPERIENCE                index.html — 38 top-level schermen (id="s-*"), gerouteerd via
                                één centrale functie go(id) (regel ~9611)
```

**Verdict over deze keten:** de architectuurintentie uit de eerdere documentatie (Calculation → Context → Decision → Evidence → AI → User) is **CODE VERIFIED aanwezig**, niet alleen op papier. De scheiding tussen "AI beschrijft" en "code berekent" is expliciet in commentaar vastgelegd op het exacte punt waar de AI-prompt wordt samengesteld (`buildCtx()`, index.html).

---

## 2. Horizontale systemen

| Systeem | Bewijs | Status |
|---|---|---|
| Auth/identity | Supabase Auth + RLS (67→69 tabellen), JWT-verificatie in alle Netlify Functions op één patroon (`/auth/v1/user`) | CODE+DB VERIFIED |
| Multi-user/gym | `users.gym_id/gym_role/gym_role_level`, `gyms`-tabel, `gym-team.js` (RBAC: lid/coach/manager/owner) | CODE+DB VERIFIED, single-gym-productie (ART CrossFit) |
| Storage/Supabase | PostgREST + RLS, 69 tabellen, 17 migratiebestanden in repo | DB VERIFIED |
| Offline/cache | Service worker (`sw.js`), `CORE_SIG`-guard koppelt cache-versie aan core-bestandsinhoud | CODE VERIFIED, geen IndexedDB-syncqueue (bevestigd deferred, memory) |
| Devices/wearables | `deviceIntegration.js` (1241 regels, grootste core-module), Google Health OAuth-flow, Concept2 PM5 BLE (`concept2Live.js`) | CODE+TEST VERIFIED, DEVICE VALIDATION grotendeels open (zie Capability Registry) |
| Security | RLS op alle 69 tabellen, JWT overal, `gyms`-lek gesloten (P0-closure) | DB+CODE VERIFIED |
| Privacy | `delete-account.js` ruimt 29+ tabellen/kolomcombinaties op, incl. wearable-tokens (RC0-fix) | CODE VERIFIED |
| Entitlements | `plans`, `features`, `plan_features`, `credit_packs`, `usage_log` — schema aanwezig | DB VERIFIED, **UI-aanwezigheid niet gevonden** in index.html (geen billing-/upgrade-scherm geïdentificeerd onder de 38 schermen) |
| Observability | `query_logs`-achtige infrastructuur niet in repo; geen client-side error-tracking-integratie gevonden | GEEN BEWIJS GEVONDEN — vermoedelijk niet geïmplementeerd |
| Platform/release | Netlify auto-deploy, Capacitor/Android, GitHub Actions Quality Gate (comprehensive sinds 18-08) | CODE VERIFIED |

---

## 3. Schermeninventaris (38 top-level, via router `go(id)`)

| Groep | Schermen (id) |
|---|---|
| Navigatie/shell | s-home |
| Auth/onboarding | s-auth, s-auth-newpass, s-onboarding, s-intake |
| Training Hub | s-train-mgr, s-train-mine, s-train-detail, s-programma, s-programma-detail, s-kalender |
| Builder/execution | s-builder, s-guided, s-hist |
| Exercise library | s-library |
| Progress/stats | s-stats, s-doelen (redirect → s-stats sinds v4.21.0) |
| Lichaam (health/recovery) | s-lichaam, s-lich-spieren, s-lich-spier, s-lich-oefeningen, s-lich-verbanden, s-lich-verband, s-lich-health, s-lich-metingen, s-lich-metric, s-lich-gegevens, s-lich-cyclus |
| Endurance/HYROX | s-hyrox, s-hyrox-perf |
| AI Coach | s-coach |
| Profiel/instellingen | s-profiel, s-settings, s-meldingen, s-privacy, s-help |
| Beheer/gym | s-admin, s-admin-pin |

**Observatie:** dit is een compactere schermenset dan de "Screen Library"-hoofdstukken in het Handbook lijken te impliceren (zie `HANDBOOK_UPDATE_PLAN.md`) — sommige oudere routes (`s-train-schema`, `s-train-workouts`, `s-doelen`) zijn code-niveau samengevoegd/redirected (v4.20-4.21), wat bevestigt dat het Handbook op dit specifieke punt is ingehaald door consolidatie in de code.

**Wat NIET als apart top-level scherm is gevonden:** een billing/upgrade-scherm, een coach-dashboard-scherm (los van s-admin), een leaderboard/challenges-scherm. Dit komt overeen met de eerdere bevinding dat Phase 3 (coach dashboard) en Commercial nog niet UI-geïmplementeerd zijn.

---

## 4. Afwijkingen van de eerder gedocumenteerde architectuur

- **Geen aparte "Context Engine" als losstaand Handbook-hoofdstuk**, maar wel degelijk als eigen, aanwijsbare module (`core/contextEngine.js` + `cycle.js`/`cycleTraining.js`/`sportDefinition.js`/`weather.js`/`athleteConstraints.js`) — genoeg gewicht om als eigen roadmaptrack te erkennen (zie Master Roadmap 2.0, track 4).
- **Entitlements/Commercial-schema bestaat in de DB maar heeft geen zichtbare UI** — dit is eerder "voorbereid, niet gebouwd" dan "gebruikt", in tegenstelling tot hoe sommige eerdere sprintrapporten het als afgerond kunnen suggereren.
- **Observability ontbreekt volledig** — geen enkel bewijs van gestructureerde logging/monitoring buiten Netlify's eigen functielogs en `Supabase:query_logs`.

---

## 5. AI Coach Governance-matrix

**Bewijs:** `netlify/functions/coach.js` (server-side proxy) + `buildCtx()` in index.html (6 aanroeppunten: losse vraag, week-generatie ×2, samenvatting, chat, korte uitleg) + `core/scientificEvidence.js` (evidence_store.v1) + `core/decision.js` (interne provenance).

| AI-actie | Toegestaan | Verboden | Codebewijs |
|---|---|---|---|
| Samenvatten van al-berekende context | ✅ | — | `buildCtx()` levert `tkCoachDataBlok()`, `tkHyroxCoachContext()` e.d. als kant-en-klare tekst |
| Uitleggen van een bestaande Decision-uitkomst | ✅ | — | `openEvidence()`/`openExecExplain()` in index.html, `decision.js`-provenance |
| Contextualiseren (bv. cyclusfase bij trainingsadvies) | ✅ | — | `cyclus_fase` wordt meegegeven als context, niet als AI-berekening |
| Combineren van meerdere berekende metrics in taal | ✅ | — | `buildCtx()` combineert progressie-trend + belasting + HYROX-context in doorlopende tekst |
| Aanbeveling binnen regelgrenzen (bv. rustdag suggereren) | ✅ | — | Alleen ná een gecorroboreerd signaal uit `TrainingLoadCore.corroboratedLoadSignal()` (DEC-036) — AI formuleert het advies, de regel bepaalt of het getriggerd wordt |
| Zelf een numerieke waarde (her)berekenen | ❌ | ✅ verboden | `core/release-gate.js` "Calculation/Decision Core purity" verbiedt DOM/DB/network in de calc-laag; AI zit hier expliciet buiten — geen enkel bewijs dat de AI-respons ooit als bron voor een opgeslagen metric dient |
| Een nieuwe trainingsregel verzinnen | ❌ | ✅ verboden | Regels leven uitsluitend in `decision.js`/`coaching.js`, niet in de AI-laag; AI genereert tekst, geen regelcode |
| Ontbrekende data zelf invullen | ⚠️ niet hard afgedwongen in code | — | Geen expliciete guardrail gevonden die een AI-antwoord blokkeert als het een cijfer noemt dat niet in de meegegeven context zit — dit is een **PROMPT-niveau aanname**, geen code-afgedwongen contract (zie GAP-P1-005, nog open) |
| Medische diagnose stellen | ⚠️ niet hard afgedwongen in code | — | Geen technische blokkade gevonden (geen output-classifier/filter); afhankelijk van de systeemprompt-tekst zelf, niet geverifieerd in deze audit (zou een aparte prompt-inhoud-review vereisen) |
| Wetenschappelijke claim zonder evidence doen | ❌ voor Decision Rules | ⚠️ voor vrije AI-tekst niet hard geblokkeerd | `scientificEvidence.js` blokkeert dit hard voor **regels** (`ruleBacking → backed:false` zonder voldoende metadata); voor de vrije-tekst AI-respons zelf is er geen vergelijkbare technische controle |

**Belangrijkste conclusie:** de architectuur dwingt terecht af dat *berekeningen en regels* nooit door de AI zelf gebeuren (dit is hard gecontroleerd, zowel qua code-scheiding als qua purity-test in de release gate). De governance-garanties over *AI-tekst* zelf (geen medische diagnose, geen verzonnen cijfers, tonen van onzekerheid) zijn **productbeleid, niet technisch afgedwongen** — dit is precies waarom GAP-P1-005 ("AI Coach zonder geautomatiseerde output-contractbewaking") terecht als open gap staat.

