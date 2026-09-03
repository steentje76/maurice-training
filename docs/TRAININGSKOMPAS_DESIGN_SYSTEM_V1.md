# TRAININGSKOMPAS DESIGN SYSTEM V1

**Status:** SPECIFIED — AWAITING PRODUCT OWNER REVIEW. Geen enkel bestaand scherm visueel gewijzigd in deze sprint.
**Baseline-datum:** 3 september 2026. Bron: goedgekeurde referentieconcepten (Vandaag v0.11, Trainen v0.2, Inzicht v0.1, Coach v0.2, Samen v0.1, Profiel v0.1) + code-geverifieerde bestaande implementatie (`index.html`, fresh main `c0ec6c1`).

Elke regel is gemarkeerd: **A**=APPROVED (letterlijk uit de goedgekeurde baseline), **B**=DERIVED FROM APPROVED BASELINE (logisch afgeleid, geen nieuwe keuze), **C**=EXISTING IMPLEMENTATION (uit de code, nog niet expliciet PO-goedgekeurd als canoniek maar wel al in productie), **D**=PROPOSED (vereist expliciete PO-goedkeuring).

## 1. Visuele identiteit [A]
Rustige, lichte achtergrond; donker marine/navy voor primaire tekst; turquoise/teal als primaire interactieve kleur; wit als dominante cardkleur; zachte secundaire tinten; beperkte verzadigde kleuren; royale witruimte; afgeronde cards; subtiele elevation; rustige, volwassen sport-/health-uitstraling; consistente lijniconografie; hiërarchie boven decoratie. **Verboden:** gaming-interface, neon, druk dashboard, concurrerende gradients, kinderachtige AI-interface, gelijkwaardig dominante cards.

## 2. Kleurtokens [C, bevestigd consistent met A]
| Token | Waarde | Bron |
|---|---|---|
| `--bg` | `#E6EBEF` | bestaande code |
| `--card` | `#fff` | bestaande code |
| `--dark` / `--bk` | `#0B1D2A` | bestaande code |
| `--accent` (primary) | `#00B894` (teal) | bestaande code |
| `--accent2` | `#0E3B4A` (marine) | bestaande code |
| `--g1..g4,g6` | grijstinten `#f5f5f5`→`#444` | bestaande code |
| `--status-good/-warn/-bad` | aliassen op `--df-g/-y/-r` | bestaande code |
| `--load-0..3` | belastingsintensiteit, geen stoplicht | bestaande code |
| Dark mode | volledig, automatisch + handmatige override | bestaande code |
| AI identity kleur | [D] nog geen apart token — voorstel: een rustige, neutrale accentkleur los van `--accent` (om AI-content visueel te onderscheiden van gewone interactieve elementen), PO-review nodig |
| Human-coach identity kleur | [D] geen apart token nodig indien avatar/naam al voldoende onderscheid geeft — PO-review |
| Social accents | [D] niet gedefinieerd, PO-review |
| Data-visualisatiepalet | [D] niet gedefinieerd buiten `--load-*`, PO-review nodig voor Inzicht-charts |

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

## 5. Radius [B, met een geconstateerde inconsistentie]
`--r:8px` (globaal token) vs. een lokale card-override van `16px` (regel 1677) vs. buttons `14px`/`10px`. **[D] Voorstel, PO-review nodig:** small=8px (bestaand `--r`), control=10-14px (bestaande button-waarden), card=16px (bestaande, meest gebruikte card-override — waarschijnlijk de bedoelde, actuele standaard), modal/sheet=nader te bepalen.

## 6. Elevation [B]
E�n bestaand token `--shadow:0 1px 3px rgba(0,0,0,.1)`. **[D] Voorstel:** none, subtle (huidige `--shadow`), card (huidige `--shadow`, hergebruikt), floating (iets sterker, PO-review), modal (sterker nog, PO-review).

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

## 12. Button/CTA-hiërarchie [C, bestaand, her-labeld]
| Canonieke naam | Bestaande class | Wanneer |
|---|---|---|
| PRIMARY | `.btn-r` (dark) of `.btn-d` (accent) — **[D] PO-review welke van de twee de canonieke PRIMARY wordt** | dominante actie |
| SECONDARY | `.btn-o` (outline) | ondersteunende actie |
| TERTIARY/TEXT ACTION | niet apart gevonden [D] | link-achtige actie |
| ICON ACTION | `.ibtn` (rond, 36px) | icoon-only |
| DESTRUCTIVE | niet apart gevonden als kleurvariant [D] | verwijderen/gevaarlijke actie |
Loading/disabled/error/pressed-states: `:active{transform:scale(.97)}` bestaat; expliciete disabled/error-visuals niet teruggevonden — [D], PO-review.

## 13. Navigation contract [C, bevestigd]
`.bnav` (container, safe-area via `env(safe-area-inset-bottom)`), `.ni` (item, kleur `--g4` inactief / `--accent` actief), `.ni-icon` + `.ni-label`, `.ni-dot` (badge, verborgen tenzij actief). **Gap:** huidige iconen zijn emoji (🏋️ etc.), de goedgekeurde baseline vraagt consistente lijniconografie — [D], PO-review voor exacte iconenset.

## 14. Avatar contract [D, nieuw component]
Geen bestaande, canonieke avatar-component gevonden. Te bouwen conform PROFILE-AVATAR-001 (target-architectuur): upload/replace/remove, initials-fallback, generic-fallback, herbruikbaar in Profiel/Samen/Groups/Challenges/Team/Human Coach/Gym-Club. Geen facial recognition, geen publieke avatar-URL zonder privacybeoordeling.

## 15. Data visualization [D, nog te specificeren]
Regels (uit de opdracht, [A]): UNKNOWN != 0, geen gesuggereerde zekerheid die niet bestaat, UI rekent nooit zelf, gebruikt uitsluitend canonical Calculation→Context→Decision→Evidence-output. Concreet paletvoorstel: PO-review.

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
