# KNOWN_LIMITATIONS.md

**Versie** v4.54.0 · **Datum** 21 augustus 2026 (bijgewerkt na v4.51.0–v4.54.0)

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

## Data die eerder ontbrak — inmiddels opgelost

Onderstaande drie punten stonden hier als "wachten op gegevens die nog niet worden
vastgelegd". Alle drie zijn sindsdien opgelost; behouden als historische context.

| Ontbrak | Opgelost in | Hoe |
|---|---|---|
| **Trainingsduur per sessie** | v4.49.0 | `sessions.duration_s` + `srpe.v1`. `athlete.unifiedLoad` levert nu een AU-reeks |
| **Rustduur tussen sets** | v4.51.0 (`mastersprint/v4.51.0`, `7952a948`) | `rest_duration_s` in `sets_detail`, `rest_duration.v1` |
| **Weer per trainingsdag** | v4.52.0 (`mastersprint/v4.52.0`, `474999f6`) | `training_instances.weather` / `sessions.weather`, `weather_session_snapshot.v1` |

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
| **Zoomen was uitgeschakeld** | Opgelost in v4.53.0 (`mastersprint/v4.53.0`, `6dbcca47`): `maximum-scale=1, user-scalable=no` verwijderd uit de viewport. Contrast van `--g4` en de merkkleur-als-tekst (nieuw token `--accent-text`) in dezelfde sprint gecorrigeerd naar WCAG AA. Tekstgroottes (7,5–9,5px, 47 elementen) bewust niet herontworpen — dat is een redesign, geen contrastcorrectie |
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
