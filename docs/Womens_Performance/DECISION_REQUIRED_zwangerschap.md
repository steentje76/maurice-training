# DECISION REQUIRED — Zwangerschap als trainingscontext

**Status:** wacht op productbeslissing door Maurice. Niet gebouwd, geen code geschreven.
**Bron:** Trainingskompas_Womens_Performance_Blueprint_v1.0.md, sectie 13; sectie 27
noemt "pregnancy mode" expliciet als beslissing die niet autonoom genomen mag worden.

## VRAAG
Moet Trainingskompas een optionele "zwangerschapscontext" krijgen, en zo ja: hoe ver
mag de app gaan in het aanpassen van trainingsadvies op basis daarvan?

Dit is geen technische vraag maar een productbeslissing met reële fysieke-veiligheids-
en aansprakelijkheidsimplicaties: als de app ooit een trainingsaanpassing suggereert
tijdens een zwangerschap die achteraf ongepast blijkt, is de impact van een fout hier
principieel groter dan bij een verkeerd geschat cyclusdag-getal.

## OPTIE A — Niet bouwen
Geen zwangerschapsfunctionaliteit. Gebruikers die zwanger zijn, gebruiken Trainingskompas
zoals nu, zonder aangepaste context.

**Voordelen:** geen aansprakelijkheidsrisico, geen medische-claim-risico, geen extra
onderhoudslast.
**Nadelen:** een reële gebruikersgroep (zwangere sporters) krijgt geen ondersteuning;
concurrenten (Garmin, Oura) bieden dit wel.

## OPTIE B — Uitsluitend registratie/logging, geen trainingsaanpassing
Gebruiker kan optioneel "zwanger" + een grove trimester-indicatie vastleggen, puur als
aantekening bij haar trainingshistorie (zichtbaar in Home). De app past ZELF niets aan
aan oefeningkeuze, belasting of voorschriften. Geen enkele Decision Engine-regel wordt
aangepast op basis van dit veld.

**Voordelen:** laag risico, laag onderhoud, geeft de gebruiker wel een plek om dit vast
te leggen voor haarzelf en (optioneel) een coach.
**Nadelen:** levert geen daadwerkelijke trainingswaarde — puur een notitieveld.

## OPTIE C — Registratie + conservatieve, expliciete comfort-aanpassingen
Naast registratie (optie B) mag de gebruiker EXPLICIET, zelf, per sessie aangeven welke
oefeningen zij wil vermijden (bijv. buikligging, hoge-impact-sprongen) — vergelijkbaar
met het bestaande "te vermijden oefeningen"-mechanisme in `training_context`. De app
handhaaft die keuze consistent, maar STELT NOOIT ZELF een trainingsaanpassing voor op
basis van het zwangerschapsveld alleen.

**Voordelen:** benut al bestaande infrastructuur (`training_context`-tabel bestaat al
voor vergelijkbare doeleinden), geeft praktische waarde zonder dat de app zelf
medische keuzes maakt.
**Nadelen:** vereist zorgvuldige UX-taal om nooit de indruk te wekken dat de gebruiker
"veilig" traint omdat de app het toestaat.

## AANBEVELING
Optie B als eerste stap, met optie C als mogelijke latere uitbreiding zodra Maurice
akkoord is met de exacte formulering. Geen enkele trainingsvoorschrift-logica mag
zelfstandig reageren op een zwangerschapsveld zonder een aparte, expliciete
vervolgbeslissing.

## IMPACT OP ARCHITECTUUR
Optie B: één nieuw, optioneel veld/tabel (naar het patroon van `cycle_periods`), geen
wijziging aan Calculation/Decision Engine. Optie C: hergebruik van het bestaande
`training_context`-vermijdingsmechanisme, eveneens geen Engine-wijziging.

## IMPACT OP PRIVACY
Zeer gevoelige gezondheidsdata. RLS verplicht (zelfde patroon als `cycle_periods`),
verwijderbaar, nooit standaard zichtbaar voor een coach/gym zonder expliciete,
aparte deel-toestemming (bestaand `content_shares`-mechanisme, niet automatisch).

## IMPACT OP UX
Vereist zorgvuldige, niet-medische taal door de hele flow; geen "geschikte
oefeningen tijdens zwangerschap"-suggesties zonder professionele validatie.
