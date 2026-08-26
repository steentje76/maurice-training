# DECISION REQUIRED — Postpartum / Return-to-Training

**Status:** wacht op productbeslissing door Maurice. Niet gebouwd, geen code geschreven.
**Bron:** Trainingskompas_Womens_Performance_Blueprint_v1.0.md, sectie 14; sectie 27
noemt "postpartum rules" expliciet als beslissing die niet autonoom genomen mag worden.

## VRAAG
Moet Trainingskompas een "terugkeer na bevalling"-traject krijgen, en zo ja: op basis
waarvan bepaalt de app of iemand klaar is voor een volgende trainingsfase — een vaste
tijdlijn (aantoonbaar riskant, het blueprint verbiedt dit expliciet: "Never assume a
fixed number of weeks automatically means readiness"), of uitsluitend zelf-gerapporteerde
signalen?

## OPTIE A — Niet bouwen
Geen postpartum-specifieke functionaliteit.

**Voordelen:** geen risico, geen onderhoud.
**Nadelen:** een reële, kwetsbare gebruikersgroep krijgt geen ondersteuning op een
moment waarop foutieve trainingsopbouw (te snel, te zwaar) een bekend, reëel risico is.

## OPTIE B — Zelf-gerapporteerde stadium-registratie, geen automatische voortgang
Gebruiker kan optioneel een bevallingsdatum en een zelf-gekozen "stadium" vastleggen
(bijv. de vijf conceptuele stappen uit het blueprint: Herstel → Beweging → Lichte
training → Progressieve training → Normale training). De GEBRUIKER kiest zelf wanneer
zij naar de volgende stap gaat; de app stelt dit nooit automatisch voor op basis van
verstreken tijd.

**Voordelen:** geeft structuur zonder een medische beslissing te nemen namens de
gebruiker; sluit aan bij bestaande, algemene periodisatie-taal in de app.
**Nadelen:** vereist zorgvuldige copy zodat de zelfgekozen stadia niet als medisch
advies overkomen.

## OPTIE C — Optie B + expliciete, generieke waarschuwingstekst
Zoals B, plus een vaste, niet-persoonlijke informatietekst die verwijst naar
professioneel medisch advies (bekkenbodem-/huisarts-controle) vóórdat naar "Progressieve
training" wordt overgestapt — puur informatief, geen blokkering van de app-functionaliteit.

**Voordelen:** verantwoorde, laagdrempelige extra zorgvuldigheid.
**Nadelen:** exacte formulering vereist juridische/medische zorgvuldigheid — niet iets
wat ik als taalmodel zelfstandig moet opstellen zonder Maurice's review.

## AANBEVELING
Optie B als uitgangspunt; optie C's waarschuwingstekst pas concreet formuleren ná
Maurice's akkoord op de aanpak, niet vooraf door mij verzonnen.

## IMPACT OP ARCHITECTUUR
Nieuwe, optionele tabel/velden (RAW DATA: bevallingsdatum, zelfgekozen stadium) —
geen wijziging aan Calculation/Decision Engine. Trainingsvoorschriften blijven
ongewijzigd door dit veld; het dient uitsluitend als zichtbare context voor de
gebruiker zelf (en optioneel een coach, via het bestaande deelmechanisme).

## IMPACT OP PRIVACY
Zeer gevoelige data. Zelfde RLS-patroon als `cycle_periods`/`cycle_symptom_logs`,
verwijderbaar, nooit automatisch gedeeld.

## IMPACT OP UX
Vereist een geruststellende, niet-voorschrijvende toon; expliciet vermijden dat een
"stadium"-label aanvoelt als een medisch attest van geschiktheid.
