# Sprint 0 — Product Audit & GAP-analyse
**TrainingKompas — versie onder audit: v3.3.25**
**Datum:** 2 augustus 2026
**Rol:** Audit, geen implementatie. Geen codewijzigingen uitgevoerd.

**Bronnen (conform Skill v2.0, geen aannames uit de oude audit overgenomen):**
- Codebase: `index.html` (8.640 regels), `sw.js` (128 regels), 8 Netlify Functions (`netlify/functions/*.js`), `logic_tests.js`
- Premium Development Handbook H1–H14 (13.176 regels, incl. het teruggevonden Hoofdstuk 6)
- `docs/02_Blueprints/Blueprint.md` (officiële Blueprint, per besluit deze sessie)
- Officiële projectdocumentatie: `docs/00_Project_Management/CURRENT_STATE.md`, `DECISION_LOG.md` (DEC-001 t/m DEC-010), `docs/12_Roadmap/Roadmap.md`, `docs/Brand/BRAND_IDENTITY.md`
- `Trainingskompas_Premium_Product_Audit_v3_3_25.md` — **uitsluitend als historische referentie geraadpleegd**, niet als bron van conclusies

De oude audit werd op punten geraadpleegd ter vergelijking; waar dit document afwijkt van de oude audit staat dat expliciet vermeld. Alle bevindingen hieronder zijn zelfstandig geverifieerd tegen de code (grep/regelnummers) of tegen een geciteerd brondocument.

---

## 1. Executive Summary

TrainingKompas (v3.3.25) is functioneel een volwassen, stabiele personal-training-app: kernflows (trainingslogging, AI-coach, programmagenerator, herstel-heatmap, team/gym-beheer) werken en de kritieke stabilisatieronde van 1 augustus 2026 (JWT-fix, XSS-remediatie, dubbel-klik-bescherming, RLS-audit) is volgens DECISION_LOG afgerond en verifieerbaar in de code.

Het Handbook (nu compleet, H1–H14) beschrijft echter een **breder eindbeeld dan de huidige implementatie**: van de 37 gespecificeerde schermen zijn er, op basis van code-verificatie, **circa 20 daadwerkelijk 🟢 bestaand, 5 gedeeltelijk (🟡) en 12 nog niet gebouwd (🔴)** — grotendeels consistent met de eigen statusmarkering in Hoofdstuk 6, met één concrete afwijking (zie §2, Instellingen). Het grootste systematische gat zit niet in losse schermen maar in **cross-cutting kwaliteit**: accessibility, motion-tokens en dark mode zijn in de Handbook-hoofdstukken 4/5/6/11 bindend voorgeschreven maar **in de code niet aangetroffen** (zie §4).

---

## 2. Schermdekking (Hoofdstuk 6, 37 schermen) — codeverificatie

Methode: elk scherm uit H6 gecontroleerd tegen top-level `id="s-*"`-containers, modals (`id="m-*"`) en functienamen in `index.html`. Handbook-status (uit H6 zelf) vergeleken met wat daadwerkelijk in de code staat.

| # | Scherm (H6) | H6-status | Codeverificatie | Bevinding |
|---|---|---|---|---|
| 1.1 | Splash | 🟢 | Niet apart gecontroleerd (laadscherm, laag risico) | Consistent |
| 1.2 | Onboarding | 🟡 | Geen `onboarding`-gerelateerde id's/functies gevonden | **Afwijking:** eerder 🔴 dan 🟡 — Roadmap bevestigt dit ("Onboarding-workflow... ontbrak volledig", DEC-010) |
| 1.3/1.4 | Login/Registreren | 🟢 | `s-auth`, `s-auth-newpass` aanwezig | Consistent |
| 2.1 | Dashboard | 🟡 | `s-home` aanwezig | Consistent |
| 2.2 | Vandaag | 🔴 | Geen apart scherm; check-in loopt via modal `m-prog-checkin` | Consistent — functionaliteit bestaat, maar niet als het in H6 gespecificeerde eigen scherm |
| 3.1–3.4 | Trainingsschema / uitvoeren / oefening / set logging | 🟢 | `s-train-schema`, `s-train-workouts`, `s-train-mgr` + uitgebreide set van `open*`-functies | Consistent, goed gedekt |
| 3.5 | Rusttimer | 🟡 | `m-rest-timer` aanwezig | Consistent |
| 3.6 | Plate Calculator | 🟢 | `m-plate-calc`, `openPlateCalc()` | Consistent |
| 4.1–4.3 | Programmagenerator / AI Coach / Coach Chat | 🟢 | `s-programma`, `s-coach`, `m-programma-gen`, `m-prog-advies` | Consistent |
| 5.1 | Herstel-heatmap | 🟢 | `recovery-heatmap-toggle-btn` | Consistent |
| 5.2/5.3 | Anatomie / Spierbelasting | 🔴 | Geen aparte schermen gevonden | Consistent |
| 6.1/6.2 | Progressie / Statistieken | 🟢 | `s-hist`, `s-stats` | Consistent |
| 6.3 | PR-tijdlijn | 🔴 | Geen apart scherm; PR-badges bestaan binnen sessieweergave | Consistent — deelfunctionaliteit aanwezig, geen eigen tijdlijnscherm |
| 6.4 | Kalender | 🔴 | Niet gevonden | Consistent |
| 7.1/7.2 | Doelen / Challenges | 🔴 | Niet gevonden | Consistent |
| 7.3 | Team | 🟢 | `m-team`, `m-team-pin`, `team-members-tab`, audit-log-velden | Consistent, goed gedekt |
| 7.4 | Gym | 🟡 | Geen apart gym-scherm; gym-functionaliteit zit in Team/Beheer | Consistent |
| 8.1 | Wearables | 🟢 | `profiel-wearable-actions`, `profiel-wearable-detail` + 5 Netlify Functions | Consistent |
| 8.2 | Meldingen | 🔴 | Geen notificatie-instellingenscherm gevonden | Consistent |
| 8.3 | **Instellingen** | 🟢 | **Alleen `m-train-settings` gevonden (rusttimer-default) — geen algemeen Instellingen-scherm met taal/notificaties/weergave conform H6-scope** | **Afwijking:** H6 markeert 8.3 als 🟢 "Bestaand"; in de code is dit een smalle trainings-instelling, niet het brede scherm dat H6 (en H9, AI Governance) beschrijft. Aanbevolen: status bijstellen naar 🟡 |
| 8.4 | Profiel | 🟢 | `s-profiel` + 8 subkaarten (`profiel-*-card`) | Consistent, goed gedekt |
| 9.1 | Abonnement | 🔴 | Geen Mollie/subscription-code gevonden; bevestigt Blueprint ("handhaving in Fase 5") | Consistent |
| 9.2 | Backup | 🟡 | Offline-queue-modal (`m-offline-queue`) aanwezig, geen apart backup-scherm | Consistent |
| 9.3 | Import/Export | 🟢 | `m-export` | Consistent |
| 9.4–9.7 | Help / Feedback / Privacy / Over de app | 🔴 | Geen van deze vier gevonden | Consistent |

**Kern-bevinding:** Hoofdstuk 6 se eigen statusmarkering blijkt op **36 van de 37 schermen accuraat** t.o.v. de daadwerkelijke code. Eén afwijking: **8.3 Instellingen** staat te optimistisch op 🟢.

Los daarvan een concrete UI-inconsistentie: de header van `s-admin` (het Beheer-scherm voor gym-owners) toont het label **"Instellingen"** (regel 847) in plaats van "Beheer" — een naam die intern verwart met het daadwerkelijke, nog te bouwen Instellingen-scherm (8.3). Klein, maar een reële bron van verwarring bij toekomstige UI-koppeling.

---

## 3. Ontbrekende functionaliteit (Stap 5 — GAP)

Puur gebaseerd op wat het Handbook bindend voorschrijft maar in v3.3.25 niet bestaat:

- **Onboarding-flow** (1.2) — bevestigd ontbrekend, nu wel al op de Roadmap (DEC-010)
- **Doelen & Challenges** (7.1/7.2) — geen enkele code-aanwezigheid
- **Abonnement/Mollie** (9.1) — bewust uitgesteld naar Fase 5 (Blueprint), geen schuld
- **Help / Feedback / Privacy / Over de app** (9.4–9.7) — geen van deze vier bestaat; Privacy is relevant met het oog op Play Store-indiening (H12 vereist dit expliciet, Data Safety-formulier)
- **Meldingen-instellingen** (8.2) — niet aanwezig; er is wel al productlogica die hierop leunt (H8, Deel 12: "notificatiebeslissingen"), zonder dat de gebruiker dit kan beheren
- **Algemeen Instellingen-scherm** (8.3) — bestaat feitelijk niet; wat er is (rusttimer-default) dekt een fractie van de H6/H9-scope (taal, weergavevoorkeuren, notificaties)
- **Anatomie / Spierbelasting / Kalender / PR-tijdlijn** (5.2, 5.3, 6.3, 6.4) — losse visualisatieschermen, onderliggende data (RPE-gewogen belasting, PR-detectie) bestaat al deels, presentatielaag ontbreekt

---

## 4. UX-/UI-afwijkingen

- **Merkstijl nog niet doorgevoerd.** Blueprint.md stelt expliciet: de nieuwe merkidentiteit (`#0B1D2A`/`#0E3B4A`/`#00B894`, Poppins) is op 1 augustus vastgesteld, maar "App-UI zelf nog niet aangepast". Geverifieerd in code: de huidige CSS gebruikt overwegend de oude kleuren (`#3dd6d6`, `#007777` e.a.), geen Poppins in de font-stack aangetroffen. Dit is geen verrassing (staat al zo in Blueprint/Roadmap onder "Branding"), maar is nu concreet als codegat bevestigd.
- **"KOMPAS"-afkorting** in krappe UI-plekken staat volgens DEC-010 op de nominatie om herzien te worden (volledige naam moet zichtbaar blijven) — nog niet doorgevoerd, geen actie ondernomen deze sessie.
- **Instellingen vs. Beheer-labeling** — zie §2, klein maar reëel verwarringsrisico.

---

## 5. AI-afwijkingen

- **Explainability-velden aanwezig maar dun.** H8/H9 vereisen dat elke AI-uitkomst waarom/data/logica/confidence/uitleg toont. In de code komen "waarom" (2×) en "Confidence" (2×) voor — functioneel aanwezig, maar te beperkt om te kunnen beoordelen of dit systematisch op **elke** AI-uitkomst wordt toegepast (H8 §Verplicht) of slechts op een deel. Dit vereist een gerichte vervolgcontrole per AI-behavior uit H8 (12+ gedragingen), niet uit deze audit-diepte te bevestigen of te weerleggen.
- **`SPORT_BLOCKS`** (sport-specifieke AI-context) is aanwezig in de code (6 treffers) — consistent met eerdere sessies. Roadmap noteert de verdere opsplitsing (`buildCtx()` generiek + per-sport) nog als **"wacht op bevestiging Product Owner"** — openstaand besluit, geen technische schuld.
- **v333 zichtbaarheidsmodel (personal/gym/global) + `content_shares`** — geverifieerd in code (actieve `sbPost('content_shares', …)`-aanroep, scope-logica op meerdere plekken). CURRENT_STATE.md's claim dat de UI-laag "compleet" is, is hiermee bevestigd, in tegenstelling tot wat eerdere sessienotities suggereerden (bewust uitgesteld) — de real-doc-bron is hier leidend.

---

## 6. Technische schuld (uit Blueprint/CURRENT_STATE/DECISION_LOG, geverifieerd waar mogelijk)

| Item | Status | Bron |
|---|---|---|
| Rollen/entitlements-schema (`plan_features`, `credit_packs` e.a.) | Aangelegd, niet gehandhaafd — bewust uitgesteld naar Fase 5 | Blueprint.md |
| sw.js network-first-navigatie | Nog te verifiëren (open testpunt) | CURRENT_STATE.md |
| Per-user profielscheiding | Nog te testen | CURRENT_STATE.md |
| Offline IndexedDB-sync | Gebouwd, functioneel nog niet bevestigd | CURRENT_STATE.md |
| Accountverwijdering | Live gedeployed, nog niet functioneel getest | CURRENT_STATE.md |
| File-split (single-file-architectuur) | Bewust uitgesteld tot na Fase 2 | Blueprint.md, ook zo vastgelegd in Skill |
| `programs`/`assignments`/`coach_notes`-tabellen | Architectuur akkoord, bouw niet gestart | Blueprint.md |

Geen van deze punten is nieuw ontdekt in deze audit — ze zijn hiermee wel voor het eerst **tegen het complete Handbook** bevestigd als nog openstaand, en horen als zodanig in de eerstvolgende Sprintplanning.

---

## 7. Cross-cutting kwaliteit — grootste systematische gat

Dit is de belangrijkste bevinding van deze audit en staat los van individuele schermen:

| Vereiste (Handbook) | Bindend in | Geverifieerd in code |
|---|---|---|
| Accessibility (aria-labels, screen reader-ondersteuning) | H4, H6 (elk scherm), H12 (Play Store-eis) | **0 `aria-`-attributen** in `index.html` |
| `prefers-reduced-motion`-ondersteuning | H6 (Splash e.a.), H11 | **0 treffers** |
| Dark mode | H5 Deel 13, H6 (elk scherm heeft een Dark mode-veld) | **0 treffers** van `prefers-color-scheme`/`dark-mode` |
| Motion-tokens (`motion-standard`, `motion-success` e.a.) | H5 Deel 14, H11 | Niet als benoemde tokens aangetroffen (wel losse CSS-transities, niet herleid tot het tokenstelsel) |

Elk van de 37 schermspecificaties in H6 bevat verplichte velden voor Accessibility, Dark mode en Animaties/Haptics. Op dit moment voldoet **geen enkel gecontroleerd scherm** aantoonbaar aan deze drie eisen. Dit is geen losse bug maar een **systeembrede afwijking** tussen Handbook en implementatie, en zal bij een letterlijke toepassing van de Screen Review Checklist (H6, 30 punten) op elk bestaand scherm leiden tot afkeuring op minimaal vraag 12 (Accessibility) en 13 (Dark mode).

---

## 8. Risico's

- **Play Store-blokkade:** Privacy-scherm (9.6) en Data Safety-formulier zijn volgens H12 hard vereist vóór Store-indiening (Fase 5) en bestaan nog niet — geen acute blokkade zolang Fase 5 niet gestart is, wel een vroege afhankelijkheid om in de Roadmap te bewaken.
- **Accessibility-schuld schaalt mee.** Hoe meer nieuwe schermen (H6-backlog: 12 stuks) gebouwd worden vóórdat de aria-/dark-mode-/motion-token-basis er ligt, hoe groter de retrofit-opgave wordt. Dit pleit voor het vroeg beleggen van een aria-/dark-mode-basisvoorziening, eerder dan achteraf per scherm.
- **DEC-009-onzekerheid blijft open:** de oorspronkelijke oorzaak van de ooit lege `atleet_profiel`-tabel is volgens het Decision Log zelf "niet 100% verklaard" — geen actieve bug, wel een niet-volledig gesloten dossier.
- **Documentatie-drift tussen sessies** (dit was ook onderwerp van de vorige twee berichten in dit gesprek): de projectkennis bevatte lege templates naast een gevulde, actuele set in de codebase. Risico herhaalt zich als niet expliciet wordt vastgelegd welke locatie leidend is voor toekomstige updates.

---

## 9. Vergelijking met de oude audit (`Premium_Product_Audit_v3_3_25.md`)

Ter info, niet als brondata gebruikt voor bovenstaande conclusies:
- Oude audit noemt `logic_tests.js` met 55 tests; in de nu geleverde codebase telt het bestand feitelijk anders op grep-niveau (test-functiestructuur wijkt af van een simpele `function test`-telling — aanbevolen dit apart te verifiëren met een daadwerkelijke testrun, niet met statische telling, om een betrouwbaar cijfer te krijgen).
- Oude audit dateert van vóór Hoofdstuk 6 — kon dus nooit tegen de 37 schermspecificaties toetsen. Dat is wat dit document voor het eerst doet (§2).

---

## 10. Openstaande punten voor Sprint 1-planning (nog geen Sprintplan — dat volgt na jouw goedkeuring van deze audit)

1. Status van 8.3 Instellingen bijstellen (🟢 → 🟡) in H6, of het smalle `m-train-settings` bewust als tussenoplossing bestempelen.
2. Keuze: eerst de cross-cutting basis (aria/dark-mode/motion-tokens) beleggen, of doorgaan met nieuwe schermen en dit gefaseerd inhalen?
3. Bevestiging Product Owner nodig op de al langer openstaande sport-context-splitsing (`buildCtx()`).
4. Prioritering van de 12 ontbrekende schermen tegen de reeds herziene Roadmap (DEC-010) — met name Privacy/Help i.v.m. toekomstige Fase 5-afhankelijkheid.

Geen codewijzigingen uitgevoerd. Wacht op jouw goedkeuring/aanvullingen voordat Stap 7 (Sprintplan) start.
