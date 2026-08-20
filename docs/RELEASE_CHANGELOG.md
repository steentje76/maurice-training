# RELEASE_CHANGELOG.md — v4.48.0 (RC0)

**Datum** 19 augustus 2026 · **Vorige versie** v4.47.0 · **versionCode** 44800

Deze release maakt Trainingskompas gereed voor Google Play Internal Testing. Er is geen
nieuwe functionaliteit bijgekomen: alles hieronder maakt bestaande functionaliteit
betrouwbaar, zichtbaar of uitleverbaar.

---

## Dataverlies en synchronisatie

- **Verlopen sessie gaf stil dataverlies.** Android bevriest achtergrondtimers, dus de
  token-refresh liep niet door zolang de app in de achtergrond stond. Bij terugkeer gaf elke
  leesactie een lege lijst — waardoor elk scherm "geen data" toonde — en verdwenen zojuist
  ingevoerde sets met alleen "Fout bij opslaan". Alle communicatie met de database loopt nu
  via één laag die op een 401 eenmalig het token vernieuwt en de aanroep herhaalt met een
  verse header. Lukt dat niet, dan verschijnt een duidelijke inlogvraag in plaats van een leeg
  scherm. Schrijfacties met een herstelbare fout gaan naar dezelfde offline-wachtrij als bij
  een netwerkstoring; een echte validatiefout niet, want die zou eeuwig blijven herhalen.
- **Dubbele sessierijen bij gelijktijdige synchronisatie.** De wachtrij werd door drie
  onafhankelijke gebeurtenissen afgespeeld zonder onderling slot. Twee doorlopen konden
  hetzelfde item versturen. Opgelost; er wordt bovendien niets verstuurd zolang niemand is
  ingelogd, zodat de wachtrij intact blijft tot na het opnieuw inloggen.
- **Trainingskoppeling overleefde een herstart niet.** Sloot Android de app tijdens een
  training, dan was bij hervatten de koppeling met de trainingssessie weg en werd die nooit
  afgerond — precies de weesrijen die migratie v446 achteraf moest opruimen. De koppeling
  reist nu mee in het concept.

## Meerdere accounts op één toestel

- **Een tweede sporter sloeg de hele intake over.** De vlag "onboarding afgerond" en negen
  andere persoonlijke instellingen (coachvoorkeuren, apparatuurgeheugen, machinelijsten, de
  gekozen cardio-machine) werden bij een accountwissel niet gewist. De tweede sporter kwam
  daardoor zonder profiel, doel of sport in het dashboard terecht.
- **Dezelfde sporter op een nieuw toestel** hoeft de intake niet meer opnieuw te doorlopen:
  een bestaand profiel in de database telt als afgerond.

## Uitleg en bewijs

- **Het bewijsspoor is zichtbaar geworden.** Bij elke afgeronde oefening met RPE werd al
  vastgelegd welke waarden zijn gemeten, wat eruit is berekend, welke regel besloot en welke
  versie van die regel dat deed — maar dat was nergens te zien. In het logboek staat nu per
  oefening een knop 'ⓘ Waarom' die precies dat toont. Er wordt niets herberekend en niets
  aangevuld: wat destijds ontbrak, blijft leeg en wordt als ontbrekend benoemd.

## Navigatie

- **De terugknop sluit de app niet langer af.** Vanaf elk scherm gaat terug nu één stap
  terug. Staat er een venster open, dan sluit dat eerst. Op het beginscherm sluit de app pas
  af bij een tweede terugveeg binnen 2,5 seconde.

## Privacy en beveiliging

- **Accountverwijdering was onvolledig.** Elf tabellen met gebruikersgegevens bleven achter,
  waaronder de tabel met het access- en refresh-token van de wearable-koppeling. Aangevuld,
  inclusief beide richtingen van gedeelde content en met behoud van gym-inrichting die van
  andere leden is.
- **App-gegevens gingen mee in de cloudback-up van Android**, inclusief het sessietoken.
  Uitgezet, voor zowel back-up als toestel-naar-toestel-overdracht.
- **Privacyverklaring toegevoegd** als losse pagina (`/privacy.html`), opgesteld uit wat de
  code en de database feitelijk doen. De app verwijst ernaar vanuit Help.

## Beheer en interface

- **Een solo-sporter kon zijn eigen apparatuur en oefeningen niet beheren**: hij kwam op een
  gedeelde pincode-muur terecht omdat "geen gym" niet te onderscheiden was van "rol nog niet
  opgehaald". Die twee zijn nu gescheiden.
- **`[PLACEHOLDER]` stond zichtbaar in het scherm Help.** Vervangen door een echt
  contactblok. Zolang er geen supportadres is ingesteld, toont de app een eerlijke tekst in
  plaats van een niet-werkende link.

## Android

- **Target-API naar 36.** Google Play weigert vanaf 31 augustus 2026 alles daaronder; de
  configuratie stond nog op 34.
- **Van 450 MB naar 14 MB.** De videobibliotheek werd integraal meegebundeld, ruim boven het
  Play-plafond van 200 MB. Video's worden nu on-demand opgehaald en lokaal gecachet, net als
  op het web. Ook de 62 testbestanden gingen niet langer mee in het artefact.
- **Ondertekening voor de release** is ingericht. De sleutel zelf blijft buiten de
  repository.
- **App-icoon en opstartscherm** waren nog het standaard Capacitor-logo. Alle Android-
  resources zijn uit het merkbeeld afgeleid, reproduceerbaar via een script.
- **Bluetooth is niet langer een installatie-eis**; de app is in de kern een trainingslogboek.
- **Rand-tot-rand-weergave** van Android 15 en 16 wordt correct opgevangen: de koptekst en de
  onderbalk schuiven niet meer onder de systeembalken.

---

## Tests

66 testbestanden groen, 0 rood. Release gate 12/12. Vier nieuwe suites:
`fSessieIntegriteit` (38), `fAndroidRelease` (27), `fRC0` (26) en `fNavigatie` (14).
`fFase2` is uitgebreid naar 36 asserts, waaronder een generieke controle die elke nieuwe
lokale opslagsleutel dwingt te classificeren als persoonlijk of toestelgebonden.

Geen test is verwijderd of verzwakt. Eén test is aangescherpt: de synchronisatiecontrole bij
terugkeer in de app keek naar de afstand tussen twee tekens in de broncode en eist nu de
juiste volgorde — eerst de sessie valideren, dan pas synchroniseren.

## Database

Geen wijzigingen. 11/11 migraties geverifieerd tegen het productieschema.
