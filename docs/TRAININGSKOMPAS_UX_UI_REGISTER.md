# TRAININGSKOMPAS_UX_UI_REGISTER.md

**UX-0 FORENSIC BASELINE — AFGEROND.** Geen implementatie uitgevoerd.
Geen merge naar main.

Baseline: main `2ce387b3…` (register-branch `ea866d1`), APP_VER
**v4.69.67**, Quality Gate **SUCCESS**, regressie **348/348**,
doc-consistency **0**, worktree clean, functional freeze intact
(P0=0, P1=0).

---

## 1. PRIMARY VISUAL SOURCE OF TRUTH (PO-bevestigd)

`docs/ux/baseline/v1/` — zes canonical mock-ups, alle zes SHA-256
byte-identiek geverifieerd tegen het manifest:

vandaag-v0.11 · trainen-v0.2 · inzicht-v0.1 · coach-v0.2 · samen-v0.1 · profiel-v0.1

**Navigation contract (canonical):** Vandaag · Trainen · Inzicht · Coach · Samen.
Profiel via avatar rechtsboven, GEEN zesde tab.

**AI-identiteit:** abstract sparkle. Robotmascotte = REJECTED. Geen
menselijke avatar voor AI.

**Mock-updata = placeholder.** Authority voor layout/hierarchie/visual
language/navigatie/componentbehandeling — NIET voor waarden.

`docs/screenshots/` (29 bestanden) is **historische implementatie-evidence**,
GEEN canonical bron. Bestandsnamen als `po_final_correction` maken een
screenshot niet canonical.

---

## 2. DEKKING — EERLIJK VERANTWOORD

| Niveau | Dekking | Bewijs |
|---|---|---|
| CODE INSPECTED | **79/79** | functionele auditfase |
| RUNTIME REACHABLE | **79/79** | 74 via router `go(id)`, 5 pre-sessie-DOM-gates |
| **RUNTIME GEMETEN** | **79/79** | Chromium 390px: tekstlengte, interactieve elementen, touch-target-hoogte, scrollhoogte |
| VISUEEL BEOORDEELD (screenshot bekeken) | **7/79** | s-auth, s-home, s-train-mgr, s-lichaam, s-stats, s-voeding + canonical referenties |
| CANONICAL MOCK-UP DIRECT | **6** surfaces (zie §3) | de zes PNG's |
| LOCAL FUNCTIONAL CHECK | **0/79** | niet uitgevoerd — vereist sessie/live data |

### Harde beperking (registreren, niet wegpoetsen)
Er is **geen testaccount**. De app start op `s-auth`; alle overige
surfaces zijn geforceerd geactiveerd **zonder sessie en zonder live data**.
Gevolg:
- structuur, hiërarchie, typografie, spacing, touch targets → **wel** meetbaar;
- gevulde datastates, empty-vs-error-onderscheid, local functional
  integrity → **niet** beoordeelbaar.
Daarom is er **geen baseline-score per surface toegekend**. Een score op
niet-waargenomen aspecten zou in strijd zijn met de opdracht ("geen score
op een aspect dat je niet betrouwbaar hebt kunnen beoordelen").

---

## 3. A–F CLASSIFICATIE

**A. Direct canonical mock-up (6):** s-home→vandaag-v0.11 ·
s-train-mgr→trainen-v0.2 · s-stats/s-inzicht→inzicht-v0.1 ·
s-coach→coach-v0.2 · s-social→samen-v0.1 · s-profiel→profiel-v0.1.

**B. Betrouwbaar afleidbaar (meerderheid):** alle surfaces die dezelfde
componentfamilie gebruiken (lijstrij met teal icoonvlak + titel +
subtitel + chevron, sectielabel, kaart, segmented control) — o.a. de
Lichaam-, Inzicht-detail-, Coach/PT-, Samen-sub- en Settings-surfaces.

**C. Gespecialiseerde compositie nodig binnen dezelfde taal:**
training-execution (`s-guided`, `s-builder`), endurance/ergometer
(`s-running`, `s-cycling`, `s-swimming`, `s-hyrox`), scanner/OCR-flows
(`s-voeding-scanner`, `-foto-*`), grafiek-zware detailschermen.

**D. Implementatie wijkt af van canonical IA:** bottom nav toont
`Home · Training · Lichaam · Coach · Voortgang` i.p.v.
`Vandaag · Trainen · Inzicht · Coach · Samen`.
→ geclassificeerd als **IMPLEMENTATION BEHIND CANONICAL PO-APPROVED IA**,
niet als alternatieve IA.

**E. Echte UX-regressies:** zie §4 (infrastructure leakage, touch targets,
previewbanner, emoji-iconen, lege sectie zonder empty-state).

**F. Legitieme functionele uitbreidingen sinds de mock-up:** de mock-ups
tonen 6 surfaces, de app heeft er 79. Alle extra surfaces vallen onder de
**frozen functional scope** en mogen NIET worden verwijderd om
pixel-perfect naar een oudere mock-up terug te keren.

---

## 4. SYSTEMISCHE BEVINDINGEN (runtime bewezen)

### 4.1 INFRASTRUCTURE LEAKAGE (harde PO-regel)

| ID | Bevinding | Locaties | Classificatie |
|---|---|---|---|
| **L-01** | Native `prompt()` in normale gebruikersflows | 6× (regels 13815, 13817, 14062, 33038, 33039, 33040) | **APP-CONTROLLED LEAK** |
| **L-02** | Native `confirm()` in normale gebruikersflows | 4× (12326, 13819, 14356, 32802) | **APP-CONTROLLED LEAK** |
| L-03 | `netlify.app` in broncode | 1× (regel 24285) | **FALSE POSITIVE** — codecommentaar dat documenteert dat de native Android-scanner juist is ingevoerd om de systeem-permissiedialoog te vermijden |
| L-04 | Camera-permissiedialoog toont hostname | Android/Chrome | **SYSTEM-CONTROLLED UI** — al opgelost voor native Android via CameraX/ML-Kit; blijft open als production/native validation item voor web/PWA |
| L-05 | `alert(` | 0× | schoon |
| L-06 | `deploy-preview` / `localhost` / `127.0.0.1` | 0× | schoon |

**Ernstigste gevallen:**
- regels 33038–33040: een gelogde set bewerken via **drie opeenvolgende
  browser-prompts** (afstand → gewicht → reps).
- regel 13819: `confirm()` misbruikt als **keuzedialoog** — "OK = zichtbaar
  voor iedereen, Annuleren = alleen connecties". Een binaire OS-dialoog om
  een privacy-instelling te kiezen; onduidelijk en privacy-gevoelig.

**Component-status:** `confirmModal()` bestaat al en wordt 48× gebruikt →
de 4 `confirm()`-gevallen zijn inconsistenties, direct oplosbaar.
Er is **géén** canonieke prompt/invoer-vervanger → de 6 `prompt()`-gevallen
vereisen een **nieuw canonical input-component** (UX-1 design-system scope).

**Definition of Done-impact:** zolang L-01/L-02 bestaan kan geen enkele
betrokken surface UX ≥9 / DONE krijgen (eis: 0 app-controlled leaks).

### 4.2 TOUCH TARGETS / MOBILE ERGONOMICS
**116 van 431** interactieve elementen (**27%**) zijn lager dan 44px —
gemeten, niet geschat. Hotspots: `s-profiel` 11/27, `s-meldingen` 6/7,
`s-admin` 5/10, `s-inzicht` 5/11. Systemisch op te lossen in het
design system (knop-/lijstrij-minimumhoogte), niet per scherm.

### 4.3 OVERIGE VISUELE BEVINDINGEN
| ID | Bevinding | Klasse |
|---|---|---|
| V-02 | `.ilbl{width:72px}` breekt "E-mailadres" af tot "E-/mailadres" op 390px | P3 |
| V-03 | Dev-banner "Preview: nieuw Inzicht-scherm (v0.1)" zichtbaar in eindgebruiker-UI (`s-lichaam`) | **P2 — previewtaal naar eindgebruiker** |
| V-04 | Emoji-iconen in lijstrijen waar canonical teal-getinte lijn-icoonvlakken voorschrijft | C: visual inconsistency |
| V-05 | Lege sectie "HERSTELTRENDS" zonder empty-state | K: ontbrekende state |
| V-01 | "Kapot logo" | **GEFALSIFICEERD** — `file://`-artefact, correct via HTTP |

### 4.4 SURFACES MET WEINIG GERENDERDE INHOUD (17)
`s-coachpt-athlete`, `s-hyrox`, `s-hyrox-perf`, `s-message-thread`,
`s-voeding-correctie`, `-hoeveelheid`, `-item-edit`, `-kennis`,
`-kennis-ai`, `-kennis-categorie`, `-kennis-topic`, `-maaltijd-detail`,
`-nieuw-product`, `-product`, `-product-match`, `-supplement-info`,
`-verschil`.
**Niet geclassificeerd als defect** — dit zijn vrijwel allemaal
detail-/vervolgschermen die per definitie een geselecteerd item of
sessie vereisen. Beoordeling vereist een testaccount.

---

## 5. GERECONSTRUEERD CANONICAL DESIGN SYSTEM
(uit de zes mock-ups — niet opnieuw bedacht)

- **Kleur:** navy (titels/donkere kaarten) + teal (accent/actief/CTA) op
  licht grijsblauwe achtergrond.
- **Typografie:** groot zwaar navy schermtitel + grijze subtitel;
  UPPERCASE letterspaced grijze sectielabels.
- **Kaarten:** wit, ruime radius (~14–16px), zachte schaduw; donkere
  navy kaart voor de primaire actie ("Volgende actie" / "Eerstvolgende
  training").
- **Lijstrij:** teal-getint afgerond icoonvlak + titel + grijze subtitel
  + chevron.
- **Segmented control:** pill, teal-getinte actieve staat.
- **Primaire CTA:** teal gevulde pill-knop; secundair = outline.
- **Bottom nav:** 5 items, lijn-icoon + label, teal actief.
- **Avatar:** rechtsboven, ronde foto met teal ring = ingang naar Profiel.
- **AI-markering:** sparkle-symbool + expliciet label "AI".
- **Metric-tegel:** groot getal + label + kleine deltaregel.

---

## 6. VOORGESTELDE CLUSTERVOLGORDE

1. **UX-1 — Design system + app shell** (bottom nav naar canonical IA,
   touch-target-normalisatie, canonical dialog/input-componenten die
   L-01/L-02 elimineren).
2. **UX-2 — Vandaag** (direct mock-up).
3. **UX-3 — Trainen** (direct mock-up).
4. **UX-4 — Inzicht** (direct mock-up).
5. **UX-5 — Coach** (direct mock-up, incl. AI/mens-scheiding).
6. **UX-6 — Samen** (direct mock-up).
7. **UX-7 — Profiel/Settings/Account** (direct mock-up).
8. **UX-8 — Training execution** (gespecialiseerd).
9. **UX-9 — Endurance/ergometers** (gespecialiseerd).
10. **UX-10 — Nutrition** (grootste cluster, 28 surfaces).
11. **UX-11 — Lichaam/Recovery/Health.**
12. **UX-12 — Team/Gym/Coach-PT/Admin + resterende.**

Rationale: het app shell eerst, omdat de bottom nav en de dialog/input-
componenten in **elk** volgend cluster terugkomen; ze nu normaliseren
voorkomt dat 79 surfaces later opnieuw moeten worden aangeraakt.

---

## 7. NIEUW BEWEZEN FUNCTIONELE P0/P1
**Geen.** De freeze blijft intact. L-01/L-02 zijn UX-defecten, geen
functionele P0/P1 (de onderliggende acties werken).

## 8. OPEN PRODUCTVRAAG
Geen blokkerende. De navigatie-onzekerheid is gesloten door het
canonical Navigation Contract.

---

# UX-1 DESIGN PREVIEW (ter goedkeuring — NIET geïmplementeerd)

Preview: `docs/ux/preview/ux1-proposed.html` — volledig geïsoleerd, niet
geladen door `index.html`, raakt geen productiepad.

## Design tokens (AFGELEID uit de zes canonical PNG's, via pixelsampling)

| Token | Waarde | Herkomst |
|---|---|---|
| `--tk-teal` | `#04AE9B` | gesampled uit Start-training-knop, trainen-v0.2 |
| `--tk-navy` | `#053146` | gesampled uit donkere primaire kaart, trainen-v0.2 |
| `--tk-ink` | `#223A4B` | gesampled uit bottom-nav-label |
| `--tk-bg` | `#F4F6F9` | dominante achtergrondkleur alle drie mock-ups |
| `--tk-card` | `#FFFFFF` | kaartvlak |
| radii | card 16 · pill 999 · control 12 | mock-up-observatie |
| spacing | 4·8·12·16·20·24 | mock-up-ritme |
| touch target | **min. 44px** | WCAG/afwijking t.o.v. mock-up, zie D |

## B. Welke canonical mock-up ondersteunt wat
App shell/nav/header/avatar → alle zes · primaire donkere kaart +
metric-tegels → vandaag-v0.11 en trainen-v0.2 · lijstrij met teal
icoonvlak + sectielabel → inzicht-v0.1 en profiel-v0.1 · teal pill-CTA →
trainen-v0.2 · segmented/keuze-behandeling → coach-v0.2 en samen-v0.1.

## C. Welke UX-0-bevinding wordt opgelost
- **L-01** (6× `prompt()`) → canonical "Set bewerken"-sheet met alle velden
  tegelijk zichtbaar en ± steppers.
- **L-02** (4× `confirm()`) → canonical bevestigings-sheet + expliciete
  privacykeuze i.p.v. OK/Annuleren.
- **Touch targets** → gemeten in de preview: **0 van 28** onder 44px
  (huidige app: 116 van 431).
- **V-02** → label boven het veld, geen vaste 72px-breedte.
- **V-05** → lege staat met uitleg en vervolgactie.
- **V-03/V-04** → previewbanner afwezig; teal lijn-icoonvlakken i.p.v. emoji.
- **IA** → canonical Vandaag · Trainen · Inzicht · Coach · Samen.

## D. Bewuste afwijkingen van de mock-up (gedocumenteerd)
1. **Touch targets ≥44px** — de mock-ups tonen compactere controls; WCAG
   en de gemeten 27%-bevinding wegen zwaarder. Opgelost met hit-area, niet
   door alles visueel groter te maken.
2. **Label boven veld** — mock-ups tonen geen inlogformulier; dit lost een
   bewezen afbreekfout in Nederlandse labels op.
3. **Lege staat** — komt niet in de mock-ups voor (die tonen gevulde data);
   ontworpen binnen dezelfde taal.
4. **Steppers bij Set bewerken** — geen mock-up beschikbaar; afgeleid.

## E. Voorgestelde UX-1 implementatiescope (NA goedkeuring)
Alleen app shell + design system: bottom nav naar canonical IA (labels/
iconen/actief-staat, capabilities blijven), token-laag, knop-/invoer-/
sectie-/kaart-normalisatie, canonical dialog- én nieuw input-sheet-
component, empty-state-component, verwijderen dev-previewbanner.

## F. Bestanden die daarna zouden wijzigen
`index.html` (CSS-tokenlaag, bottom-nav-markup, `confirmModal` uitbreiden,
nieuw input-sheet, 10 call-sites van `confirm()`/`prompt()`),
plus nieuwe dedicated tests. Geen migraties, geen DB, geen architectuur.

## G. MAIN UNCHANGED — bevestigd
Alles staat op branch `ux/ux0-forensic-baseline`. Geen PR gemerged, geen
commit op main, geen productiepad gewijzigd.
