# TODAY_MOCKUP_HANDOFF.md — voor ChatGPT + Product Owner

**Doel van dit document:** voldoende, concrete input om één visuele mock-up van het scherm VANDAAG te maken. Claude bouwt niets; dit is de brief voor het ontwerp.

## Screen purpose
De dagelijkse ingang. Beantwoordt in enkele seconden, boven de fold: wat speelt vandaag, wat moet ik doen, waarom. Geen dashboard.

## Exact content hierarchy (vaste volgorde, van boven naar beneden)
1. Header (begroeting, datum, avatar rechtsboven, optionele P0-banner)
2. Volgende actie — één kaart, dominant
3. Vandaag — chronologische lijst
4. Relevante context — 0 tot 3 compacte kaarten, alleen indien relevant
5. Voortgang — 1 regel, optioneel
6. Snelacties — 4 tot 6 chips + configureer-icoon
7. Bottom navigation: Vandaag · Trainen · Inzicht · Coach · Samen (Vandaag actief)

## Example realistic content (gebruik dit letterlijk voor de eerste mock-up: STATE 01 + teamtraining)
- Header: "Goedemorgen, Maurice" · "Woensdag 3 september"
- Volgende actie: titel "Training A — Kracht", subregel "18:00 · Programma Sterker, week 3 van 8", primaire knop "Start", secundair "Preview" en "Verplaats", link "Waarom zie ik dit?"
- Vandaag: "07:30 · Herstelcheck · afgerond" / "18:00 · Training A — Kracht · gepland" / "19:00 · Teamtraining ART CrossFit · verzamelen 18:30 · beschikbaar ✓"
- Relevante context: kaart "Herstel 79 van 100 — Train beheerst — 1 datapunt ontbreekt (slaap)" met link "Bekijk herstel"
- Voortgang: "Front squat — geschatte 1RM verbeterd deze week"
- Snelacties: "Vrij trainen", "Training maken", "Activiteit loggen", "Voeding loggen"

Maak daarna twee extra varianten van dezelfde mock-up:
- **STATE 08 (geen wearable):** identiek, maar contextkaart wordt "Geen herstelgegevens vandaag — vul eventueel in hoe je je voelt" (neutraal, niet rood, niet groen).
- **STATE 13 (P0):** bovenaan een smalle banner "Je Google Health-koppeling is verlopen — opnieuw verbinden", de rest blijft ongewijzigd eronder.

## Actions (tap-doelen)
| Element | Tap | Bestemming |
|---|---|---|
| Avatar | → | Profiel |
| Volgende actie "Start" | → | Training execution (na preview-state) |
| "Preview" | → | Training preview |
| "Verplaats" | → | Planning (verplaats-dialoog; bevestiging vereist) |
| "Waarom zie ik dit?" | expand | inline uitleg: bron, regel, confidence |
| Timeline-item training | → | Training preview |
| Timeline-item teamtraining | → | Samen › Team › Event |
| "Bekijk herstel" | → | Inzicht › Herstel |
| Voortgang-regel | → | Inzicht › Prestaties |
| Snelactie | → | betreffende flow |
| Snelacties ⚙ | → | configureer-sheet (herschik/toevoegen/verwijderen) |
| P0-banner | → | betreffende herstelactie |

## Labels (Nederlands, sober, geen uitroeptekens, geen guilt)
Sectiekoppen: VOLGENDE ACTIE · VANDAAG · RELEVANTE CONTEXT · VOORTGANG · SNELACTIES. Statuslabels altijd als tekst naast icoon: gepland / bezig / afgerond / overgeslagen / gemist / verplaatst. Bronlabels: "Programma" / "Coach [naam]" / "Team" / "Eigen".

## Required components (functioneel, niet visueel voorgeschreven)
Avatar met fallback · P0-banner · NBA-kaart (titel, subregel, 1 primaire + max 2 secundaire acties, expand-link) · timeline-rij (tijd, icoon+label, status, bron) · contextkaart (compact, 1 link) · progress-regel · quick-action-chip · bottom-nav met actieve state.

## Elements intentionally omitted (staan NIET op dit scherm)
Huidige "Jouw ritme", "Actieve dagen", "Volume", HRV/RHR/slaapgrafieken, PR-historie, volume-analytics, correlaties, body-trends, motivatietekst, streak-tellers, upgrade-banners, lijst van alle gekoppelde apparaten, volledige week-/maandkalender, tweede navigatiestructuur via quick actions ("Coach"/"Inzicht"/"Samen" als chip is afgewezen).

## Navigation
Vandaag is de eerste bottom-tab en het startscherm na login. Profiel uitsluitend via avatar rechtsboven — geen zesde tab. Terug-navigatie vanuit elke deep link keert terug naar Vandaag met behoud van scrollpositie.

## State model waarop de mock-up moet kunnen variëren
Zie TODAY_UX_SCREEN_SPEC.md, 13 states. Minimaal ontwerpen: 01 (normaal), 02 (rustdag), 08 (geen wearable), 13 (P0). De overige states verschillen alleen in inhoud, niet in structuur.

## Harde ontwerpgrenzen (uit de target-architectuur)
- Eén NBA; lagere prioriteit verdringt nooit hogere.
- Geen data ≠ goed: ontbrekend herstel nooit groen.
- Stale data altijd met datum ("HRV van 3 dagen geleden").
- Human Coach altijd met naam/avatar, nooit vermengd met AI Coach.
- Status nooit alleen via kleur.
- Geen commerciële content boven P5.
- Werkt volledig zonder wearable.

## Open Product Owner-beslissingen (markeer in de mock-up als "TBD")
1. Mag de gebruiker niet-kritieke contextkaarten (weer, voeding) permanent uitzetten?
2. Blijft de huidige "heartbeat/status"-knop bestaan? Zo ja, met welke functie?
3. Toont Vandaag een beperkte vooruitblik naar morgen wanneer er vandaag niets gepland is?
4. Exacte default-set van 4 quick actions.
5. Wordt de begroeting per dagdeel behouden, of alleen naam + datum?
