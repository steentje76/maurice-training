# TRAININGSKOMPAS DESIGN SYSTEM V1

**Status:** SPECIFIED — AWAITING PRODUCT OWNER REVIEW. Geen enkel bestaand scherm visueel gewijzigd in deze sprint.
**Baseline-datum:** 3 september 2026. Bron: goedgekeurde referentieconcepten (Vandaag v0.11, Trainen v0.2, Inzicht v0.1, Coach v0.2, Samen v0.1, Profiel v0.1) + code-geverifieerde bestaande implementatie (`index.html`, fresh main `c0ec6c1`).

Elke regel is gemarkeerd: **A**=APPROVED (letterlijk uit de goedgekeurde baseline), **B**=DERIVED FROM APPROVED BASELINE (logisch afgeleid, geen nieuwe keuze), **C**=EXISTING IMPLEMENTATION (uit de code, nog niet expliciet PO-goedgekeurd als canoniek maar wel al in productie), **D**=PROPOSED (vereist expliciete PO-goedkeuring).

## 1. Visuele identiteit [A]
Rustige, lichte achtergrond; donker marine/navy voor primaire tekst; turquoise/teal als primaire interactieve kleur; wit als dominante cardkleur; zachte secundaire tinten; beperkte verzadigde kleuren; royale witruimte; afgeronde cards; subtiele elevation; rustige, volwassen sport-/health-uitstraling; consistente lijniconografie; hiërarchie boven decoratie. **Verboden:** gaming-interface, neon, druk dashboard, concurrerende gradients, kinderachtige AI-interface, gelijkwaardig dominante cards.

## 2. Kleurtokens [C, bevestigd consistent met A — PO-besluiten 3 september 2026 hieronder verwerkt]

**DESIGN SYSTEM V1 STATUS: PRODUCT OWNER APPROVED — SPECIFICATION BASELINE.** Visuele richting, navigation contract en component-principes zijn goedgekeurd. Open implementatie-/audit-items blijven bestaan (zie §17/§19 en `DESIGN_SYSTEM_V1_IMPLEMENTATION_PLAN.md`). Runtime is nog NIET gemigreerd; de zes primaire schermen (Vandaag v0.11, Trainen v0.2, Inzicht v0.1, Coach v0.2, Samen v0.1, Profiel v0.1) zijn nog NIET geïmplementeerd. Mockup omission != functionality removal.

| Token | Waarde | Bron | Status |
|---|---|---|---|
| `--bg` | `#E6EBEF` | bestaande code | [A] |
| `--card` | `#fff` | bestaande code | [A] |
| `--dark` / `--bk` | `#0B1D2A` | bestaande code | [A] |
| `--accent` (**PRIMARY CTA**) | `#00B894` (teal) | bestaande code | **[A] GOEDGEKEURD (PO-besluit 3-9-2026)** — gebruik voor Start training, primaire bevestigende actie, belangrijkste actie in lokale context. Niet elke knop wordt teal; maximaal één duidelijke primary CTA per lokale context. |
| `--accent2` (**marine/navy-familie**) | `#0E3B4A` | bestaande code | **[A] GOEDGEKEURD (PO-besluit)** — voor dominante content surfaces, Training A/primary context cards, belangrijke structurele surfaces, primaire tekst waar passend. **Marine is NIET de standaard primary CTA-kleur** (dat is teal, zie boven). |
| `--status-good/-warn/-bad` | aliassen op `--df-g/-y/-r` | bestaande code | [A] |
| `--load-0..3` | belastingsintensiteit, geen stoplicht | bestaande code | [A] |
| Dark mode | volledig, automatisch + handmatige override | bestaande code | [A] |
| **AI identity kleur** | **GEEN apart paars/kleurschema** | — | **[A] GOEDGEKEURD (PO-besluit): AI Coach gebruikt de bestaande teal/navy-familie, geen aparte huisstijl.** Onderscheid komt van: abstract sparkle/star/AI-lijnicoon + expliciet label ("AI Coach"/"Trainingskompas Coach") + consistente AI-componentstijl — NIET van een andere kleur. GEEN robotmascotte, GEEN menselijke avatar voor AI. |
| Human-coach identity kleur | geen apart token nodig — onderscheid via avatar/naam (menselijke identiteit) | — | [A], afgeleid uit AI-besluit |
| **Destructive kleur** | rood, **uitsluitend** voor daadwerkelijk destructieve/risicovolle acties | — | **[A] GOEDGEKEURD (PO-besluit)** — account verwijderen, data verwijderen, verbinding permanent verwijderen (met consequentie), lid verwijderen, programma definitief verwijderen. **NIET** voor een algemene negatieve of "terug"-actie. |
| **Data-visualisatiepalet** | teal/navy als basis; aanvullende kleuren uitsluitend voor semantische status, series-onderscheid, waarschuwing/error, noodzakelijke contrastdifferentiatie | — | **[A] GOEDGEKEURD PRINCIPE (PO-besluit)** — geen decoratieve regenboogcharts, geen kleur-only betekenis; status/trends altijd ook met tekst/iconografie/labels. Het exacte, concrete palet (welke aanvullende kleuren precies) blijft [D], OPEN IMPLEMENTATION GAP, toegewezen aan DS-10. |
| Social accents | niet gedefinieerd | — | [D], OPEN, geen PO-besluit hierover genomen deze ronde |

## 3. Typography [B, schaal afgeleid uit bestaand, consistent gebruik]
Font-stack: `'Poppins','Arial',sans-serif` [C]. Bestaande, herhaald gebruikte maten: 9px (nav-label), 11px (card-title/sectie), 12-13px (secundaire body), 15-16px (body/CTA), 18-22px (iconen/koppen elders). **[B] Voorgestelde canonieke schaal** (geen nieuwe waarden, alleen benoeming van bestaande):
- `caption` = 9-11px
- `secondary-body` = 12-13px
- `body` = 15px
- `card-title` = 11px, uppercase, letterspacing .5px (bestaand patroon)
- `button` = 15-16px, weight 700-800
- `display/page-title` [D] — niet eenduidig teruggevonden, PO-review

## 4. Spacing [B, afgeleid]
Herhaald gebruikte waarden: 4/6/8/10/12/14/16/18/20px. Voorgestelde schaal (geen nieuwe waarden): xs=4, sm=8, md=12, lg=16, xl=20.

## 5. Radius [PO-besluit 3-9-2026, APPROVED]
`--r:8px` (globaal token) vs. een lokale card-override van `16px` (regel 1677) vs. buttons `14px`/`10px`. **[A] GOEDGEKEURD (PO-besluit): 16px is de canonieke standaard radius voor grote/standaard content cards.** Daarnaast een kleinere token voor compacte controls/pills/kleinere input- en button-surfaces (waarde technisch af te leiden uit bestaande, kleinere button-radii `10-14px` — [D] exacte waarde, OPEN, toegewezen aan DS-01). Niet langer twee willekeurige card-radii zonder semantische reden — de bestaande `--r:8px` wordt herbestemd voor de kleinere token-categorie, niet voor cards.

## 6. Elevation [PO-besluit, APPROVED PRINCIPE]
Eén bestaand token `--shadow:0 1px 3px rgba(0,0,0,.1)`. **[A] GOEDGEKEURD PRINCIPE (PO-besluit): subtiele elevation -- cards mogen niet visueel "zweven" als losse dashboardwidgets.** Semantische niveaus: none, subtle (huidige `--shadow`), card (huidige `--shadow`, hergebruikt, terughoudend), floating, modal. De exacte, concrete waarden voor floating/modal blijven [D], OPEN IMPLEMENTATION GAP, toegewezen aan DS-01.

## 7. Motion [C, al volledig gedefinieerd]
`--motion-instant/fast/standard/normal/success/warning/modal/navigation/loading-pulse` + `--motion-ease`. Al aanwezig, grotendeels nog niet breed toegepast — geen nieuwe tokens nodig.

## 8. Icon size / Control height [D]
Niet expliciet gedocumenteerd in de bestaande code als benoemde schaal. Bestaande, waargenomen waarden: nav-icon 22-23px, ibtn 36px (rond, icoonknop). Formeel voorstel vereist PO-review.

## 9. Domeinkarakter per hoofdscherm [A]
Zoals letterlijk vastgelegd in de opdracht: **Vandaag** = orchestratie, rekent niets zelf, rustig ondanks context. **Trainen** = taakgericht, geen analytics-dashboard. **Inzicht** = mag data-dichter zijn, evidence/confidence zichtbaar. **Coach** = AI (abstract sparkle/star-symbool, GEEN robotmascotte) en Human Coach/PT (naam+avatar) altijd visueel onderscheiden. **Samen** = visueler/levendiger, gevoelige health-data nooit automatisch gedeeld. **Profiel** = rustiger/functioneler, geen bottom tab, geopend via avatar rechtsboven.

## 10. Component architecture — zie apart document
Volledige, per-patroon inventarisatie: `docs/DESIGN_SYSTEM_CURRENT_IMPLEMENTATION_AUDIT.md`.

## 11. Card hiërarchie [B, afgeleid uit de opdracht + bestaande cardstructuur]
Level 1 (primaire actie, bijv. huidige `.today-cta`/`.today-start`) — mag dominant zijn, niet meerdere tegelijk zonder functionele reden. Level 2 (context, bijv. huidige `.df-head`-kaarten). Level 3 (standaard functie, huidige `.card`). Level 4 (compacte data/status). Level 5 (social content, Samen-specifiek).

## 12. Button/CTA-hiërarchie [PO-besluiten 3-9-2026 verwerkt]
| Canonieke naam | Bestaande class | Wanneer | Status |
|---|---|---|---|
| **PRIMARY** | `.btn-d` (teal/`--accent`) | dominante actie: Start training, primaire bevestigende actie, belangrijkste actie in lokale context | **[A] GOEDGEKEURD (PO-besluit): teal (#00B894) is de primary action color** — `.btn-d` is daarmee de canonieke PRIMARY-class, `.btn-r` (dark/marine) wordt gebruikt voor dominante content surfaces, niet als standaard CTA-kleur (zie §2). Maximaal één duidelijke PRIMARY per lokale context. |
| SECONDARY | `.btn-o` (outline) | ondersteunende actie | [C] bevestigd, geen wijziging |
| **TERTIARY/TEXT ACTION** | niet apart gevonden in bestaande code, nieuw te bouwen | rustige text-actions zonder zware surface: "Bekijk details", "Waarom vandaag?", "Bekijk alles", "Aanpassen" | **[A] GOEDGEKEURD PRINCIPE (PO-besluit)** — mag de PRIMARY-hiërarchie niet verstoren. Exacte stijl (kleur/weight) blijft [D], OPEN, toegewezen aan DS-04. |
| ICON ACTION | `.ibtn` (rond, 36px) | icoon-only | [C] bevestigd, geen wijziging |
| **DESTRUCTIVE** | niet apart gevonden als kleurvariant, nieuw te bouwen | **uitsluitend** daadwerkelijk destructieve/risicovolle acties: account verwijderen, data verwijderen, verbinding permanent verwijderen, lid verwijderen, programma definitief verwijderen | **[A] GOEDGEKEURD (PO-besluit): rood, nooit voor een algemene negatieve of "terug"-actie.** Exacte roodtint blijft [D], OPEN, toegewezen aan DS-04. |
Loading/disabled/error/pressed-states: `:active{transform:scale(.97)}` bestaat; expliciete disabled/error-visuals niet teruggevonden — [D], OPEN IMPLEMENTATION GAP, toegewezen aan DS-04.

## 13. Navigation contract [C, bevestigd + PO-besluiten iconography]
`.bnav` (container, safe-area via `env(safe-area-inset-bottom)`), `.ni` (item, kleur `--g4` inactief / `--accent` actief), `.ni-icon` + `.ni-label`, `.ni-dot` (badge, verborgen tenzij actief). **Canonieke bottom navigation, GOEDGEKEURD (PO-besluit): Vandaag | Trainen | Inzicht | Coach | Samen — Profiel is GEEN zesde bottom-navigation-item, geopend via avatar rechtsboven waar de page-header dit ondersteunt.**

**[A] GOEDGEKEURD (PO-besluit, iconography):** één consistente outline/line icon family, geen emoji als structurele navigatie-/functie-iconen (huidige 🏋️ e.d. worden vervangen). Emoji mogen wél voorkomen als user-generated/social content waar inhoudelijk logisch (bijv. in Samen). De **exacte iconenset** mag technisch worden geselecteerd op basis van consistente lijnbreedte, Android/web-ondersteuning, accessibility, licentie en bestaande build-compatibility — dit is een **technische keuze, geen aparte PO-blokkade**, zolang de visuele stijl aan deze criteria voldoet. Concrete selectie: [D], OPEN IMPLEMENTATION GAP, toegewezen aan DS-03.

## 14. Avatar contract [A, GOEDGEKEURD PRINCIPE (PO-besluit), component zelf nog te bouwen]
Geen bestaande, canonieke avatar-component gevonden. **[A] GOEDGEKEURD (PO-besluit): één canonical avatarcomponent**, te bouwen conform PROFILE-AVATAR-001 (target-architectuur): uploaded image, replace, remove, initials fallback, generic fallback. Gebruik in Profiel, Samen, Groups, Challenges, Team, Human Coach/PT, Gym/Club. Geen facial recognition, geen mockup-foto hardcoden. **OPEN IMPLEMENTATION GAP** (niet gebouwd deze sprint) — toegewezen aan DS-07.

## 15. Data visualization [A, principe GOEDGEKEURD; concreet palet OPEN]
Regels (uit de opdracht, [A]): UNKNOWN != 0, geen gesuggereerde zekerheid die niet bestaat, UI rekent nooit zelf, gebruikt uitsluitend canonical Calculation→Context→Decision→Evidence-output. **[A] GOEDGEKEURD (PO-besluit): teal/navy als basis, aanvullende kleuren uitsluitend voor semantische status/series-onderscheid/waarschuwing/contrastdifferentiatie, geen decoratieve regenboogcharts, geen kleur-only betekenis** (zie §2). Het concrete, exacte palet blijft [D], OPEN IMPLEMENTATION GAP, toegewezen aan DS-10.

## 16. Status & semantics [B]
Canonieke statussen (uit de opdracht): connected/disconnected/syncing/incomplete/good/attention/warning/critical/planned/active/completed/missed/unavailable/unknown. Regel: nooit alleen kleur — altijd icoon + tekst (+ eventueel kleur).

## 17. Accessibility [D, gap-audit vereist]
WCAG-contrast, semantic HTML, screen-reader-labels, logische focus-volgorde, zichtbare focus, keyboard-navigatie, dynamic text, touch targets, reduced motion, geen kleur-only, toegankelijke charts/errors/modals. Bestaande dekking: gedeeltelijk (enkele `aria-label`/`aria-level` gezien), geen systematische audit binnen dit tijdsbudget — apart, later te doen (DS-13).

## 18. Responsive/device contract [B]
Robuust voor verschillende Android/iPhone-breedtes, safe areas, grotere tekst, keyboard-open, landscape waar ondersteund, toekomstige tablet/web. Geen absolute layout uitsluitend voor mockup-resolutie.

## 19. Loading/empty/error/offline [D, nog te centraliseren]
Contracten vereist voor: loading, empty, partial data, error, offline, syncing, stale data, permission denied, connection required. Regel: ontbrekende data ≠ nul; app blijft bruikbaar zonder wearable.

## 20. AI UX contract [A]
AI Coach: abstract sparkle/star-symbool, NOOIT robotmascotte, altijd gelabeld als AI, geen menselijke avatar, geen medische autoriteit, geen zelf berekende metrics, geen verzonnen data, geen ongeautoriseerde Decision-regels. Human Coach: expliciete menselijke identiteit (naam/avatar/initialen). AI mag nooit namens een mens spreken; AI-concepten mogen nooit ongemerkt als menselijk bericht verschijnen.

## 21. Privacy UX [A]
Ondersteunt: private/shared/shared-with-coach/shared-with-team/shared-with-gym/research-consent/revoked. Harde regels: membership ≠ health access, coach-relatie ≠ onbeperkte toegang, betaling ≠ autorisatie, sociale connectie ≠ health consent.

## 22. UX Governance [A]
Elke toekomstige UX-wijziging: (A) bestaand goedgekeurd patroon, (B) goedgekeurde extensie, (C) nieuw patroon — vereist PO-review vóór implementatie. Flow: DESIGN → PO REVIEW → REVISE → PO APPROVAL → IMPLEMENT → TEST → VISUAL VALIDATION → CLOSED.

────────────────────────────────────
## OPEN IMPLEMENTATION GAPS (NIET als opgelost te beschouwen)

De volgende gebieden zijn nog NIET volledig geïnventariseerd en mogen niet als CLOSED/FULLY IMPLEMENTED/FULLY VALIDATED worden overclaimd, ondanks de PO-goedkeuring van de principes hierboven:
- Accessibility (systematische audit, DS-13)
- Responsive behavior (DS-14)
- Charts (concreet, technisch, DS-10)
- Loading/empty/error/offline (gecentraliseerde contracten, DS-12)
- Tabs/segmented controls (DS-08)
- Dialogs/bottom sheets (DS-11)
- Icon/control size-schaal (exacte waarden, DS-01/DS-03)
- Volledige list-row normalization (DS-08)

Deze blijven expliciete Design System-implementatie-items, toegewezen aan DS-08 t/m DS-14 waar van toepassing (zie `docs/DESIGN_SYSTEM_V1_IMPLEMENTATION_PLAN.md`).

## DESIGN SYSTEM V1 STATUS (canoniek)

**PRODUCT OWNER APPROVED — SPECIFICATION BASELINE**

Dit betekent expliciet:
- visuele richting: goedgekeurd
- navigation contract: goedgekeurd
- component principles: goedgekeurd
- open implementatie-/audit-items: blijven bestaan (zie hierboven)
- runtime: NOG NIET gemigreerd
- primaire schermen (Vandaag v0.11, Trainen v0.2, Inzicht v0.1, Coach v0.2, Samen v0.1, Profiel v0.1): NOG NIET geïmplementeerd

Dit is **NIET**: FULLY IMPLEMENTED of FULLY VALIDATED. Mockup omission != functionality removal.
