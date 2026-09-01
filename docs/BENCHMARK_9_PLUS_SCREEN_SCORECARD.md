# Benchmark 9+ Screen Scorecard

Een scherm blijft open zodra één dimensie <9.0 scoort (sectie 30).
Scores op basis van de in `docs/B9_H1_SCREEN_INVENTORY.md` en
`docs/B9_H1_FUNCTION_NAVIGATION_BUTTON_AUDIT.md` verzamelde evidence.

| Screen | Functional | Discoverability | Hierarchy | Taps | Consistency | States | Accessibility | Overall |
|---|---|---|---|---|---|---|---|---|
| s-nutrition (Voeding) | 8.8 | 6.5 (icoon, geen label) | 8.5 | 8.5 | 8.5 | 8.5 | 7.5 (NOT ENOUGH EVIDENCE op contrast/screenreader) | **6.5 (blocked by Discoverability)** |
| s-social (Sociaal) | 8.0 | 6.5 (icoon, geen label) | 7.5 | 8.0 | 7.8 | 8.0 | 7.5 (NOT ENOUGH EVIDENCE) | **6.5 (blocked by Discoverability)** |
| s-running (Hardlopen) | 8.8 | 8.5 | 8.5 | 8.0 | 8.5 | 8.5 | NOT ENOUGH EVIDENCE | **NOT ENOUGH EVIDENCE (accessibility ontbreekt)** |
| s-lichaam (Lichaam) | 8.5 | 8.5 | 8.0 | 8.5 | 8.3 | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | **NOT ENOUGH EVIDENCE** |
| s-home (Home) | 8.5 | 8.8 | 8.0 | N.v.t. | 8.3 | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | **NOT ENOUGH EVIDENCE** |
| s-stats (Voortgang) | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | N.v.t. | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | **NOT ENOUGH EVIDENCE (audit nodig)** |
| s-coach (Coach) | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | N.v.t. | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | **NOT ENOUGH EVIDENCE (audit nodig)** |
| s-onboarding (Onboarding) | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | NOT ENOUGH EVIDENCE | **NOT ENOUGH EVIDENCE (audit nodig)** |

**Eerlijke, harde conclusie:** de twee schermen waarvoor deze sprint
het meeste, directe bewijs heeft (Voeding, Sociaal) blijven beide
open, specifiek geblokkeerd door één dimensie: **Discoverability**
(6.5) -- beide zijn uitsluitend bereikbaar via een klein, ongelabeld
icoon, niet via een gelijkwaardige, herkenbare hoofdplek. Dit is
precies de reden waarom `s-social`/`s-nutrition`/de bredere
navigatiestructuur de sterkste kandidaat is voor de eerste UX-review
(zie hieronder).

Voor de overige schermen geldt **NOT ENOUGH EVIDENCE** op meerdere
dimensies (met name Accessibility en States) -- deze vereisen een
gerichte, toekomstige audit-ronde met daadwerkelijke, live
schermtoetsing (screenreader, contrastmeting), wat buiten het
haalbare van deze eerste, brede rebenchmark-sprint viel.
