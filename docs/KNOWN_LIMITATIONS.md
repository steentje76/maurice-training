# KNOWN_LIMITATIONS.md

**Versie** v4.48.0 (RC0) · **Datum** 19 augustus 2026

Wat de app bewust niet doet, nog niet kan, of waar hij afhankelijk is van iets buiten zichzelf.
Alles hieronder is bekend en geaccepteerd voor de eerste release; niets hiervan is een
onopgelost defect.

---

## Bewust niet gebouwd

| Onderwerp | Waarom |
|---|---|
| Sociale functies, gym- en teamchallenges | Vereist cross-user aggregatie die niet bestaat, en een productdefinitie die er niet is (DEC-018) |
| Abonnementen, credits, betalingen | De tabellen staan leeg in het schema als voorbereiding; er is geen enkele codepad die ze gebruikt |
| White-label | Buiten scope voor V1 |
| Apple HealthKit, Health Connect, Garmin, Whoop, Oura | Elk vereist een geregistreerde OAuth-app met eigen client-id en -secret. Fitbit via Google Health werkt |
| HYROX race-splits, triathlon-brick | De sportopties bestaan in de keuzelijsten; de specifieke logica is niet gebouwd |
| Cardio-split als bron voor verbanden | Wordt berekend, maar een split per 500 m is pas vergelijkbaar binnen hetzelfde apparaat. Wacht op een productbesluit over de machine-sleutel |

---

## Wachten op gegevens die nog niet worden vastgelegd

| Ontbreekt | Gevolg |
|---|---|
| **Trainingsduur per sessie** | 105 van de 187 kenbare relaties kunnen niet worden berekend, en `athlete.unifiedLoad` geeft bewust `{beschikbaar:false, ontbreekt:['duur_per_sessie']}` terug. De timer loopt al in de app; alleen het wegschrijven ontbreekt |
| **Rustduur tussen sets** | De relatie *Rustduur* blijft leeg |
| **Weer per trainingsdag** | Temperatuur, luchtvochtigheid en wind leveren geen reeks; alleen relevant voor buitentraining |

---

## Datakwaliteit bij de huidige gebruiker

Deze punten zijn geen softwarefouten; het systeem gedraagt zich juist correct door hier
géén getal te tonen.

- **Lichaamsgewicht** staat 36 van de 41 dagen op exact 106,0 kg — een handmatig overgenomen
  waarde. Elke relatie met gewicht wordt daardoor geweigerd wegens te weinig variatie. Een
  weegschaal die naar de app synchroniseert lost dit op; meer loggen niet.
- **Rusthartslag** is 39 dagen bijna constant (55–60) met één uitschieter van 28. De
  outliertoets van Iglewicz & Hoaglin vraagt minimaal 20 waarnemingen per paar en ziet die
  uitschieter daardoor nog niet.
- **Bewijsspoor**: 0 productierijen bevatten er nu een. Dat komt doordat de code na de
  laatste gelogde training (15 augustus) is toegevoegd; de eerstvolgende afgeronde training
  mét RPE schrijft er een. De schrijf- en leeskant zijn wel volledig getest.

---

## Techniek

| Beperking | Toelichting |
|---|---|
| **Android-build niet geverifieerd** | De configuratie is naar API 36 gebracht (Play-eis vanaf 31-08-2026), maar deze omgeving heeft geen Android SDK en kan `dl.google.com` niet bereiken. Eén lokale build is nodig. Blijkt Capacitor 6 niet met compileSdk 36 te werken, dan is een Capacitor-upgrade de volgende stap; die is bewust niet blind doorgevoerd |
| **Video's vereisen internet bij eerste weergave** | Ze worden niet meegebundeld (437 MB tegen een Play-plafond van 200 MB) maar on-demand opgehaald en daarna gecachet met een LRU-plafond van 250 MB — hetzelfde gedrag als op het web |
| **Onboarding-vlag is toestel-gescoped** | `tk_onboarding_done` staat in localStorage. Sinds RC0 wordt hij bij een eigenaarswissel gewist en is een bestaand profiel in de database de tweede bron van waarheid. Ben je offline op een nieuw toestel, dan verschijnt de intake alsnog |
| **Zoomen is uitgeschakeld** | `maximum-scale=1, user-scalable=no` in de viewport. Dit beperkt WCAG 1.4.4; wijzigen raakt de lay-out van elk scherm en hoort in een aparte accessibility-sprint |
| **Beheer-pincode is client-side** | Een 4-cijferige pincode waarvan de SHA-256 in de app staat, is triviaal te brute-forcen. Sinds RC0 is hij alleen nog het vangnet zolang de rol nog niet is opgehaald; schrijfrechten worden hoe dan ook server-side door RLS afgedwongen |
| **Wearable-tokens staan leesbaar in de database** | `wearable_connections.access_token` en `.refresh_token`. De tabel is voor `anon` en `authenticated` volledig geblokkeerd (RLS zonder policy) en alleen via `service_role` bereikbaar. Versleuteling op kolomniveau is een verbetering voor later |
| **Bij accountverwijdering wordt de koppeling niet bij de provider ingetrokken** | De tokens worden verwijderd, maar er gaat geen revoke-aanroep naar Fitbit/Google. De gebruiker kan de toegang zelf intrekken in zijn Google-account |
| **Vier verouderde duplicaten in de repo-root** | `coaching.js`, `coaching.test.js`, `sw-guard.test.js` en `release-gate.js` zijn oudere kopieën van de `core/`-versies. Ze worden niet geladen en niet gedraaid |
| **Dode code** | `vPin`/`pinBuf` verwijzen naar een scherm `s-pin-lock` dat niet meer bestaat |

---

## Prestaties

De Supabase-adviseur meldt 82 × `auth_rls_initplan` (`auth.uid()` wordt per rij geëvalueerd)
en 43 niet-geïndexeerde foreign keys. Bij de huidige omvang (112 sessies, 6 accounts) is dat
niet meetbaar. Herschrijven van 82 policies is een databasewijziging met RLS-risico en hoort
niet in een releasesprint; het staat als POST-V1 in `docs/CURRENT_ROADMAP.md`.

---

## Wat de app nadrukkelijk niet is

Trainingskompas geeft trainingsadvies, geen medisch advies. Er worden geen diagnoses gesteld.
Verbanden in je eigen gegevens zijn samenhang, geen oorzaak en gevolg — de app formuleert dat
ook zo en weigert een uitspraak zodra de onderbouwing te dun is.
