# DECISION REQUIRED — Perimenopauze / Menopauze-context

**Status:** wacht op productbeslissing door Maurice. Niet gebouwd, geen code geschreven.
**Bron:** Trainingskompas_Womens_Performance_Blueprint_v1.0.md, sectie 11; sectie 27
noemt "menopause terminology" expliciet als beslissing die niet autonoom genomen mag
worden.

## VRAAG
Moet Trainingskompas perimenopauze/menopauze als aparte context ondersteunen, en zo ja:
welke terminologie en welke registratievelden zijn passend? Dit raakt direct de al
bestaande cyclustracking-architectuur: bij (peri)menopauze wordt de cyclus onregelmatig
of stopt die — de huidige `CycleCore`-berekeningen (cyclusdag/geschatte fase) zijn dan
niet meer zinvol en zouden een gebruiker in deze levensfase mogelijk verwarrende of
irrelevante schattingen tonen.

## OPTIE A — Niet bouwen
Geen aparte menopauze-context. Gebruikers in deze levensfase gebruiken cyclustracking
zoals nu (met de kans op onzinnige schattingen bij een sterk onregelmatige cyclus) of
schakelen de cyclusfunctie gewoon uit.

**Voordelen:** geen extra ontwikkeling/onderhoud.
**Nadelen:** cyclustracking kan voor deze gebruikersgroep actief misleidend zijn
(bijvoorbeeld een "geschatte volgende menstruatie" tonen die niet meer relevant is).

## OPTIE B — Cyclustracking correct laten "afvallen", zonder aparte contextlaag
Voeg een instelling toe waarmee de gebruiker cyclustracking-voorspellingen expliciet
kan onderdrukken (bijvoorbeeld "ik wil geen voorspellingen meer zien"), zonder een
volledige nieuwe menopauze-feature te bouwen. Symptoomregistratie (al gebouwd, sectie 7)
blijft gewoon bruikbaar, onafhankelijk van cyclusvoorspellingen.

**Voordelen:** kleine, veilige wijziging; lost het belangrijkste risico (misleidende
voorspellingen) op zonder nieuwe terminologiekeuzes te hoeven maken.
**Nadelen:** biedt geen gerichte, positieve ondersteuning voor deze levensfase.

## OPTIE C — Aparte, lichte contextregistratie (slaap/energie/opvliegers als zelfrapportage)
Een eigen, optionele registratie (vergelijkbaar met de al gebouwde symptoomregistratie)
voor bijvoorbeeld slaapverandering, energie, opvliegers (zelfgerapporteerd, niet
gemeten) — zonder een "menopauzefase"-berekening te doen. Puur logging + neutrale
patroonweergave, zelfde patroon als `symptomPatternSummary()`.

**Voordelen:** biedt gerichte waarde, hergebruikt de al bewezen, veilige architectuur.
**Nadelen:** terminologiekeuzes (welke term gebruiken we, "overgang" vs "perimenopauze"
vs een neutralere formulering) zijn een expliciete, gevoelige productbeslissing die ik
niet zelf moet vaststellen.

## AANBEVELING
Optie B eerst (laag risico, lost het belangrijkste probleem op), optie C als latere,
volledig door Maurice goedgekeurde uitbreiding — inclusief de exacte terminologie.

## IMPACT OP ARCHITECTUUR
Optie B: een kleine UI-instelling in het bestaande cyclusscherm, geen nieuwe tabel,
geen Engine-wijziging. Optie C: nieuwe, optionele tabel naar het gevestigde
`cycle_symptom_logs`-patroon.

## IMPACT OP PRIVACY
Optie C: zelfde RLS-patroon als de bestaande cyclustabellen.

## IMPACT OP UX
Terminologie is hier het kernvraagstuk — vereist Maurice's expliciete input vóór
enige tekst wordt geschreven.
