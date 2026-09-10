# TRAININGSKOMPAS_UX_UI_REGISTER.md

Canoniek register voor de ALL SURFACES UX/UI >=9 MASTER PHASE.
Status: **UX-0 FORENSIC BASELINE — LOPEND, NIET COMPLEET.**

Vastgesteld tegen main `2ce387b3e776900abc0403eed302ecbb27df33a8`,
APP_VER v4.69.67, Quality Gate SUCCESS, regressie 348/348, worktree clean.
Freeze-status geverifieerd: FUNCTIONAL SOFTWARE ARCHITECTURE FROZEN,
P0=0, P1=0.

---

## 0. EERLIJKE DEKKINGSVERANTWOORDING (sectie 56)

Deze fase eist expliciet dat "VISUALLY VERIFIED" niet geclaimd wordt als
alleen code is bekeken. Daarom per surface strikt gescheiden:

| Niveau | Aantal | Toelichting |
|---|---|---|
| CODE INSPECTED | 79/79 | uit de functionele auditfase |
| RUNTIME REACHABLE | 79/79 | bewezen in de freeze-audit (74 router + 5 pre-sessie-gates) |
| **VISUALLY INSPECTED** | **6/79** | daadwerkelijk gerenderd in Chromium @390px deze ronde |
| MOCK-UP COMPARED | 1/79 | alleen Inzicht heeft een expliciet PO-goedgekeurde referentie waartegen vergeleken is |

**Er wordt dus NIET geclaimd dat 79 surfaces visueel beoordeeld zijn.**
De resterende 73 hebben nog GEEN UX-score, omdat een score zonder
rendering per sectie 15 ongeldig zou zijn.

### Rendering-omgeving (werkt, met beperking)
Chromium via Playwright 1.56 werkt; de app is lokaal over HTTP geserveerd
(niet file://, omdat assets absolute paden gebruiken -- zie Bevinding
V-01). De app start op `s-auth`; er is GEEN testaccount beschikbaar, dus
andere surfaces zijn geinspecteerd door ze geforceerd te activeren.
Gevolg: **zonder live gebruikersdata**. Structuur/hierarchie/typografie/
spacing zijn daarmee wel beoordeelbaar, gevulde datastates NIET. Dit is
een echte beperking, geen formaliteit.

---

## 1. GEVONDEN GOEDGEKEURDE VISUELE REFERENTIES

Aangetroffen in `docs/screenshots/` (bestandsnamen bevatten letterlijk
`po_final_correction` / `po_fix` -> Product Owner-goedgekeurd):

- **Inzicht v0.1** -- 25 screenshots, incl. `inzicht_v01_po_final_correction_390/430_{top,middle,bottom}.png`
  en `inzicht_v01_final_wcag_390/430.png`. Sterkste beschikbare referentie.
- **Trainen v0.2** -- 4 screenshots, incl. `trainen_v02_visual_fidelity_full.png`,
  `trainen_v02_micro_alignment_final.png`.
- Ondersteunend: `docs/TRAININGSKOMPAS_DESIGN_SYSTEM_V1.md`,
  `DESIGN_SYSTEM_*`-audits, `docs/ux/SCREEN_IMPLEMENTATION_STANDARD_v1.md`,
  `docs/design/NUTRITION_UX_CONCEPT_B_WIREFRAME.html`.

**VISUAL REFERENCE COVERAGE**
- Direct approved reference: **2 domeinen** (Inzicht, Trainen)
- Afleidbaar uit canonieke richting: het merendeel (zelfde componentfamilie)
- Ontbrekend/ambigu: nog te bepalen voor de 73 niet-geinspecteerde surfaces

---

## 2. GERECONSTRUEERDE CANONICAL DESIGN LANGUAGE
(uit de goedgekeurde referenties + live rendering -- NIET opnieuw bedacht)

- **Merk**: navy (#0F2233-achtig) + teal accent; wordmark "TRAININGS" navy,
  "KOMPAS" teal; kompas/atleet-logo.
- **Achtergrond**: licht grijsblauw; **kaarten**: wit, ruime radius (~14-16px),
  zachte schaduw.
- **Titel**: groot, zwaar, navy + grijze subtitel eronder.
- **Sectielabels**: UPPERCASE, klein, letterspaced, grijs
  ("SNEL OVERZICHT", "DOMEINEN", "HERSTEL & BELASTING").
- **Segmented control**: pill-vorm, teal-getinte actieve staat.
- **Lijstrij**: teal-getint afgerond icoonvlak + titel + grijze subtitel + chevron.
- **Primaire CTA**: navy gevulde knop, volle breedte, grote radius.
- **Bottom nav**: 5 items, icoon + label, teal actief.

---

## 3. SYSTEMISCHE BEVINDINGEN (runtime bewezen)

| ID | Bevinding | Bewijs | Klasse |
|---|---|---|---|
| V-01 | Assets gebruiken absolute paden (`/logo-wordmark.png`); breekt onder `file://`, correct via HTTP/Netlify | gerenderd, beide varianten vergeleken | GEEN BUG (gefalsificeerd) |
| V-02 | `.ilbl{width:72px}` laat "E-mailadres" afbreken naar "E-/mailadres" op 390px | zichtbaar in render s-auth | P3 visueel |
| V-03 | Dev-/previewbanner "Preview: nieuw Inzicht-scherm (v0.1)" zichtbaar in de eindgebruiker-UI op Lichaam | render s-lichaam | P2 -- previewtaal lekt naar eindgebruiker |
| V-04 | Emoji-iconen in lijstrijen op Lichaam waar de goedgekeurde referentie consistente teal-getinte lijn-icoonvlakken gebruikt | render s-lichaam vs. Inzicht-referentie | C: visual inconsistency |
| V-05 | Lege sectie "HERSTELTRENDS" zonder inhoud en zonder empty-state | render s-lichaam | C/K: ontbrekende empty-state |

---

## 4. BLOKKERENDE PRODUCT OWNER-BESLISSING (sectie 46)

**Hoofdnavigatie: goedgekeurde mock-up en opdrachttekst spreken elkaar tegen.**

| Bron | Labels |
|---|---|
| Opdracht sectie 10 ("canonical") | VANDAAG · TRAINEN · INZICHT · COACH · SAMEN |
| PO-goedgekeurde mock-up (`inzicht_v01_po_final_correction_*`) | HOME · TRAINING · LICHAAM · COACH · VOORTGANG |
| Huidige implementatie (live gerenderd) | Home · Training · Lichaam · Coach · Voortgang |

Mock-up en implementatie komen overeen; beide wijken op 4 van 5 labels af
van de in de opdracht genoemde canonieke IA. Dit is geen cosmetisch
detail: het bepaalt de informatiearchitectuur, de journey-indeling en de
semantiek van elk surface-cluster. Sectie 10 verbiedt wijziging zonder
expliciete PO-beslissing; sectie 46 vereist een PO-gate voor
hoofdnavigatie. Daarom NIET zelf beslist.

---

## 5. SURFACE-REGISTER (voortgang)

Volledige 79-rij-tabel wordt opgebouwd zodra de navigatiebeslissing er is
(de journey-kolom hangt er direct van af). Reeds visueel geinspecteerd:

| ID | Domein | Visueel | Mock-up vgl. | Eerste observatie |
|---|---|---|---|---|
| s-auth | Auth | JA | nee | V-02; verder rustig en helder |
| s-home | Vandaag | JA | nee | leeg zonder sessie -- score uitgesteld |
| s-train-mgr | Training | JA | Trainen v0.2 beschikbaar, nog niet vergeleken | -- |
| s-lichaam | Recovery/Health | JA | nee | V-03, V-04, V-05 |
| s-stats | Inzicht | JA | Inzicht v0.1 beschikbaar, nog niet vergeleken | -- |
| s-voeding | Nutrition | JA | wireframe beschikbaar | -- |
| overige 73 | -- | NEE | -- | nog geen score (bewust) |

---

## 6. STATUS

UX-0 is **niet afgerond**. Afgerond: baseline-verificatie, rendering-
omgeving werkend, goedgekeurde referenties gelokaliseerd, design language
gereconstrueerd, vijf systemische bevindingen, en één blokkerende
PO-beslissing geidentificeerd. Nog te doen: 73 surfaces visueel
inspecteren, mock-up-vergelijking Inzicht/Trainen, scoreverdeling,
clustervolgorde.

Geen enkele visuele implementatie uitgevoerd (sectie 15/53).
