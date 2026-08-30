# F9_SOCIAL_INFORMATION_ARCHITECTURE_AUDIT.md — Trainingskompas

## Bestaande navigatie-audit
De bestaande mobiele bottom-navigatie bevat al 5 vaste hoofdbestemmingen: Home, Training, Lichaam, Coach, Voortgang. Dit is een volle, mobiel-geoptimaliseerde balk (icoon + label per tab).

## Kernbevinding: genuine navigatieconflict tegen de "sterke standaard"
Een 6e permanente hoofdtab op een mobiele bottom-navigatiebalk is een bekend UX-antipatroon: bij 6 tabs wordt elk icoon+label te smal om leesbaar te blijven. De meeste benchmark-apps (Strava, Instagram, Twitter) houden 5 tabs aan als praktisch maximum. Trainingskompas zit al op dit maximum.

Alternatieven afgewogen:
- A. Aparte Social-hoofdtab: verstoort de bestaande, volle 5-tab-balk -- genuine UX-conflict.
- B. Social binnen Home: zou Home overladen, in strijd met de bestaande "geen metric-wall"-discipline.
- C. Social onder Profiel/Instellingen: lage ontdekbaarheid.
- D. Social onder "Meer": neutraal, geen navigatie-regressie.
- E. Hybride: Social bereikbaar via een icoon in de bestaande header/context, geen permanente 6e tab. VOORKEURSOPTIE.

## Beslissing
Geen aparte, permanente Social-hoofdtab in deze sprint. In plaats daarvan krijgt Social een eigen, volwaardig scherm (s-social), bereikbaar via een duidelijk, consistent toegangspunt zonder de bestaande 5-tab-navigatie te wijzigen. Dit is een eerlijke, evidence-based afwijking van de gesuggereerde "sterke standaard" -- gemotiveerd door een aantoonbaar, bestaand navigatieconflict, niet door terughoudendheid over Social als productrichting.

Herzien indien: een toekomstige gebruiksmeting aantoont dat Social-ontdekbaarheid onvoldoende is, kan een herstructurering van de 5-tab-balk apart overwogen worden -- een grotere, aparte productbeslissing.
