# Movekit vrijgave in pakketten van 25

Datum: 7 november 2026. Refs #504, #603 en #606.
Basis: b5615fe3f1dcc8201dd5b35e24d830c804b94cad.
Status: gebouwd op ontwikkelbranch; geen productiepublicatie.

## Probleem en verandering

De inhoudelijke review werkte al met 14 pakketten van 25 en een laatste pakket
van 6. De catalogusserver en runtime vereisten echter exact 356 nieuwe records
en een totaal van 582. Daardoor werd een correct eerste pakket van 25 geweigerd.

De bestaande catalogusserver en ECS-bridge accepteren nu volledige cumulatieve
pakketten: 25, 50, 75, ... 350, 356 nieuwe oefeningen. Het eerste pakket is
TK-000227 t/m TK-000251; na activering wordt het totaal 251. Het tweede verhoogt
het totaal naar 276. Elke levering bevat het volledige tot dan vrijgegeven
nieuwe bereik, niet alleen het verschil met de vorige levering.

## Controles

- De server bepaalt het vrijgegeven bereik uit de bestaande release-manifest-
  entries met afzonderlijk gevalideerde video- en posterdescriptors.
- Alleen een aaneengesloten bereik vanaf TK-000227 is toegestaan.
- Onvolledige pakketten, ontbrekende posters, dubbele media, ongeldige
  uploadbewijzen en overgeslagen eerdere pakketten worden geweigerd.
- Publication- en FK-bindingqueries vragen uitsluitend het vrijgegeven bereik
  op. Extra, ontbrekende of afwijkende records blokkeren de respons.
- Bestaande entitlementcontrole voor en na uitlezen blijft verplicht.
- De bestaande ECS valideert het hele pakket voor installatie. Verwijzingen
  naar nog niet vrijgegeven oefeningen blokkeren installatie; zij worden niet
  stil verwijderd of automatisch meegepubliceerd.
- Bij accountwisseling/intrekken verdwijnen de toegevoegde records en
  zoekindexgegevens. De 226 oorspronkelijke records blijven behouden.

## Verificatie

- Catalogusbroker: 171 assertions PASS; bestaande assertions behouden.
- Echte ECS/runtime: 188 assertions PASS; bestaande assertions behouden.
- Alle 15 cumulatieve pakketten, terugschalen naar 25, weigeren van ongeldige
  aantallen en bron-/relatiecontrole zijn uitgevoerd met synthetische payloads.
- Private proef met echte lokale batch-01 metadata en Nederlandse overlay:
  25/25 gemount, ECS-totaal 251, 25/25 Nederlandse zoekhits; intrekken brengt
  het totaal terug op 226. Autorisatiemarkeringen in deze proef zijn uitsluitend
  harnessinputs; dit bewijst geen werkelijke serverpublicatie of gebruiksrechten.
  Ruwe metadata en proefoutput blijven buiten Git.
- Webbuild geslaagd via node scripts/build-www.mjs.
- Volledige Windows-projectgate wordt afzonderlijk gerapporteerd.

## Resterend voor daadwerkelijke beschikbaarheid

De gedeelde #603 opslag-/schema-/accountacceptatie en #504 private-media-
cutover, rechten en echte browser/Androidacceptatie blijven vereist, ook voor
25 oefeningen. De centrale release-manifestentries blijven leeg. De appflags,
productiedatabase, grants en publicatie zijn niet gewijzigd. Geen APK gemaakt.

Vervolg: integreer deze kleine wijziging met de actuele #606-head, controleer
de gedeelde vrijgavevoorwaarden en activeer vervolgens uitsluitend pakket 01.
Pakketten 02-15 hoeven daar inhoudelijk niet opnieuw voor te worden beoordeeld.
