# DESIGN_SYSTEM_CURRENT_IMPLEMENTATION_AUDIT.md

Bron: `index.html`, fresh main `c0ec6c1`. Alle waarden hieronder zijn letterlijk uit de code overgenomen, niet verzonnen.

| Patroon | CURRENT | REUSABLE | NEEDS NORMALIZATION | TARGET | RISK | PROPOSED ACTION |
|---|---|---|---|---|---|---|
| Kleuren (CSS vars) | `--accent:#00B894` (teal), `--accent2:#0E3B4A` (marine), `--bg:#E6EBEF`, `--card:#fff`, `--dark:#0B1D2A` | JA | NEE | APPROVED — matcht de goedgekeurde baseline (teal primair, navy tekst, lichte achtergrond, witte cards) vrijwel exact | LAAG | Overnemen als canonieke tokens, geen wijziging nodig |
| Dark mode | Volledig, automatisch (`prefers-color-scheme`) + handmatige override (`data-theme`) | JA | NEE | APPROVED (bestaand, verder dan de mockups expliciet tonen) | LAAG | Behouden, documenteren als bonus t.o.v. baseline |
| Status-tokens | `--status-good/-warn/-bad` (aliassen op `--df-g/-y/-r`) | JA | NEE | APPROVED | LAAG | Hergebruiken voor Inzicht-statussen |
| Belastings-schaal | `--load-0..3`, bewust geen stoplicht | JA | NEE | APPROVED | LAAG | Hergebruiken in Inzicht/trainingsbelasting |
| Motion-tokens | Volledig gedefinieerd (`--motion-fast/standard/normal/...`), maar grotendeels nog niet toegepast op bestaande transities | GEDEELTELIJK | JA | APPROVED tokens, TARGET: breder toepassen | LAAG | Hergebruiken, uitbreiden naar meer componenten (DS-implementatieplan) |
| Typography | Eén font-stack (`--f:'Poppins','Arial',sans-serif`), geen gedocumenteerde type-schaal (font-sizes ad-hoc per component: 9px/11px/12px/13px/15px/16px) | GEDEELTELIJK | JA | DERIVED — schaal moet geformaliseerd worden uit de bestaande, gebruikte waarden | MEDIUM | Canoniseren van de bestaande maten tot een benoemde schaal (DS-02) |
| Spacing | Geen gedocumenteerde schaal; ad-hoc pixelwaarden (8/10/12/14/16/18/20px) consistent hergebruikt | GEDEELTELIJK | JA | DERIVED uit bestaande, herhaalde waarden | LAAG | Formaliseren als 4/8px-grid-achtige schaal (DS-01) |
| Border radius | `--r:8px` (algemeen), maar cards gebruiken lokaal `16px` (regel 1677), buttons `14px`/`10px` | NEE (inconsistent) | JA | DERIVED — meerdere, niet-geünificeerde radius-waarden in gebruik | MEDIUM | Canoniseren tot small/control/card/modal-schaal (DS-01) |
| Shadows | `--shadow:0 1px 3px rgba(0,0,0,.1)`, één token, geen elevation-schaal | GEDEELTELIJK | JA | DERIVED | LAAG | Uitbreiden naar een subtiele/card/floating/modal-schaal |
| Buttons | `.btn-r` (dark/primary), `.btn-o` (outline/secondary), `.btn-d` (accent), `.btn-sm`, `.ibtn` (icon, rond) | JA | JA (naamgeving inconsistent met PRIMARY/SECONDARY/TERTIARY-taal) | DERIVED | LAAG | Hernoemen/mappen naar de canonieke CTA-hiërarchie (DS-04), geen visuele wijziging |
| Cards | `.card` (basis), `.card-hd`, `.card-title`, `.card-body`, `.card-sep`; een lokale override op regel 1677 gebruikt `16px`-radius i.p.v. het globale `--r` | GEDEELTELIJK | JA | DERIVED | MEDIUM | Radius-inconsistentie oplossen vóór Level 1-5-hiërarchie wordt toegepast |
| List rows | Niet apart geïnventariseerd binnen dit tijdsbudget | ONBEKEND | ONBEKEND | UNKNOWN | — | Detailleren in een latere DS-08-sprint |
| Bottom navigation | `.bnav` (container, safe-area-aware), `.ni` (item), `.ni-icon`/`.ni-label`, `.ni.active` (kleur = `--accent`), `.ni-dot` (badge) — huidig gebruikt EMOJI als iconen (🏋️), geen lijniconografie | JA (structuur) | JA (iconen) | CURRENT gebruikt emoji, APPROVED baseline vraagt consistente lijniconografie | MEDIUM | Structuur behouden, iconen vervangen door lijniconen (DS-03), PO-review nodig voor exacte iconenset |
| Avatar | **Geen canonieke avatar-component gevonden** (0 `.avatar`-classes) | NEE | JA | PROPOSED (nieuw, PROFILE-AVATAR-001 uit target-architectuur) | HOOG (nieuw component) | Bouwen conform sectie 10 van deze opdracht, hergebruikbaar in 7 contexten |
| Tabs/segmented controls | Niet apart geïnventariseerd | ONBEKEND | ONBEKEND | UNKNOWN | — | Detailleren later |
| Dialogs/bottom sheets | `.tk-confirm-actions` (bevestigingsmodal) gevonden; geen apart bottom-sheet-patroon geïnventariseerd | GEDEELTELIJK | JA | DERIVED/UNKNOWN | MEDIUM | Detailleren in DS-11 |
| Charts | Niet apart geïnventariseerd binnen dit tijdsbudget (bekend: `chart_display_v0`-tool bestaat voor conversationele charts, los van in-app Inzicht-charts) | ONBEKEND | ONBEKEND | UNKNOWN | — | Detailleren in DS-10 |
| Status indicators | `--status-good/-warn/-bad` bestaan als kleurtoken; icoon+tekst-combinatie niet overal geverifieerd | GEDEELTELIJK | JA | DERIVED, moet expliciet "nooit kleur-only" afdwingen | MEDIUM | Auditten per scherm tijdens implementatie |
| Loading/empty/error states | Niet centraal geïnventariseerd; patronen bestaan waarschijnlijk per scherm ad-hoc | ONBEKEND | ONBEKEND | UNKNOWN | MEDIUM | Detailleren in DS-12 |
| Offline indicators | Bekend uit eerdere sessies: `sbPostQ`/offline-queue bestaat functioneel; visuele indicator niet apart geverifieerd | ONBEKEND | ONBEKEND | UNKNOWN | MEDIUM | Detailleren in DS-12 |
| Accessibility attributes | `aria-level`, `aria-label` op enkele plekken gezien (bijv. `s-admin`-header); geen systematische audit binnen dit tijdsbudget | GEDEELTELIJK | JA | DERIVED, gap-audit nodig | MEDIUM-HOOG | Volledige a11y-audit vóór DS-13 |
| Responsive rules | Niet apart geïnventariseerd | ONBEKEND | ONBEKEND | UNKNOWN | — | Detailleren in DS-14 |

**Belangrijkste, positieve conclusie:** het fundament (kleuren, dark mode, motion-tokens, status/belasting-tokens) is al in hoge mate consistent met de goedgekeurde baseline. De belangrijkste, echte gaps zijn: (1) geen canonieke avatar-component, (2) inconsistente radius-waarden tussen cards/buttons, (3) emoji-iconen i.p.v. lijniconografie, (4) geen geformaliseerde type-/spacing-schaal (wel consistent gebruikt, niet gedocumenteerd).
