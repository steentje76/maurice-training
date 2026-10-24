# TK ochtendtest — 24 oktober 2026

## Doel en bron
Geïsoleerde testkandidaat op `fix/tk-night-test-20261023`, gebaseerd op PR #570
`9f051d940b21b91ffd8964bc20dfb8b6bbd08d42`, met de volledige native export/MIME-keten
van PR #572 `b550a845b68f5e3e95e7bde1a7249b5619349044` als tweede mergeouder.
Bestaande branches en main worden niet gewijzigd. Bestaande stapel-PRs niet dubbel mergen.

## Inbegrepen
- Gezamenlijke trainingsinvoer, hervatten, offline-opslag, accountisolatie en readiness-communicatie uit #570.
- Native SAF-export en alleen-lezen herstelpreview uit #571/#572.
- SEC-570-05: G1 gecodeerde JSON achter tekstprefix wordt bij niet-verifieerbare Unicode-escapes herkenbaar overgeslagen, zonder de bron te herschrijven.
- G2: zelfstandige regressie voor malformed JSON/Unicode en vier foutmutanten, inclusief de eerder overlevende Y3-regel.
- Toon/verberg wachtzin op vier velden; standaard verborgen, bij verzenden verborgen, bij sluiten/heropenen/achtergrond/paginaverlaten gewist.
- Expliciete uitleg dat de wachtzin niet herstelbaar is en buiten de app moet worden bewaard.
- Apart Android-pakket `com.trainingskompas.app.nachtproef20261024`, label **TK Test 24 oktober**, versie `4.70.25-nachtproef20261024`.
- CI bouwt exacte PR-head, test native unitcode en controleert pakket, label, rechten, debugcertificaat, ingebouwde MIME/exportcode, SHA-256 en broncommit.

## Bewijs vóór vrijgave
Gerichte SEC-570-05-test: eerst RED op oude G1-code, daarna 38/38 GREEN.
Vier mutanten worden uitsluitend bij een assertion failure als gedood geteld; intacte controle slaagt.
Bestaande SEC-570-04-test 32/32; mutanten 4/4; MIME-varianttest 14/14 met 9/9 mutanten.
Volledige regressie, echte Chromiumacceptatie en Android-CI moeten op de uiteindelijke HEAD worden gecontroleerd.
Een APK-artifact alleen is geen volledige acceptatie. Fysieke acceptatie blijft door tester uit te voeren.

## Ochtendtest (uitsluitend synthetisch testaccount)
1. Installeer **TK Test 24 oktober** naast bestaande apps. Verwijder niets. Controleer pakket, bestands-SHA en BUILDINFO.
2. Maak twee eigen testtrainingen. Voer één deels uit: verschillende gewichten/herhalingen per set, RPE, afvinken, oefening wisselen, terug en hervatten. Controleer invoer en historie na afronden/heropenen.
3. Test offline opslaan en terug online. Let op eerlijke wachtrijstatus; pas serverbevestiging bewijst dat data aangekomen is.
4. Onder Profiel → Account & data → Gegevens exporteren: probeer Toon/verberg, bewaar een nieuwe testwachtzin buiten de app, maak een versleutelde kopie via Downloads.
5. Selecteer diezelfde kopie in Herstelpreview. Controleer bronnen, aantallen, weggelaten data en dat Herstel uitvoeren uitgeschakeld is.
6. Probeer verkeerd wachtwoord, annuleren en een ongeldig testbestand. Geen schijnsucces en geen terugzetten.
7. Sluit het exportvenster en open opnieuw: wachtzin leeg en verborgen. Test achtergrond/voorgrond hetzelfde.

## Expliciet open
- #570→main/productie en bestaande app bijwerken/verwijderen zijn niet vrijgegeven door deze testbuild.
- G3 overredactie (bijvoorbeeld max_tokens/cookie_consent) en G4 scanbudget/omissies blijven beperkingen; tijdelijke acceptatie gold uitsluitend voor Draft #570.
- F3/F5/F6 en het beleid voor bestaande reddingskopieën blijven open; deze kandidaat besluit dat beleid niet.
- Conservatieve prefixweigering kan ook onschuldige tekst met Unicode-escapes weglaten; reden payload_unverifiable zichtbaar. Geen bewijs van volledige back-up.
- Herstellen blijft uitgeschakeld; complete:false en restoreAllowed:false blijven gelden.
- Debugsigning is per CI-run wisselend. Ook deze testvariant later niet verwijderen als er nog noodzakelijke lokale testgegevens op staan.
- Oude bestandskopie met vergeten wachtzin blijft ongewijzigd; geen cryptografische bypass.
- MoveKit-uitbreiding, nieuwe trainingsregels en schemawijzigingen vallen buiten deze kandidaat.
