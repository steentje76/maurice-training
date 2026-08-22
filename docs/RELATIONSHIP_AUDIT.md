# RELATIONSHIP_AUDIT.md — tweede relationship-audit

**Datum** 19 augustus 2026 · **App-versie** v4.48.0 · **Contract** `relationship.v1`
**Databron** productiedatabase, uitsluitend de rijen van één gebruiker
**Meetvenster** 365 dagen tot 2026-08-19 · 103 sessies over 31 trainingsdagen, 57 check-ins, 41 weegmomenten

---

## 0. Correctie op de vorige auditronde

De relationship-audits van sprint 25, sprint 26 en de Fase-2-verificatie zijn uitgevoerd op
een datadump die met een service-role-sleutel was gemaakt. Die sleutel omzeilt RLS, en er
staan twee accounts in de database. De dump bevatte dus **112 sessies en 43 weegmomenten van
twee gebruikers door elkaar** — onder meer weegmomenten van 74 en 76 kg naast die van 106 kg.

Dat is een situatie die in de app zelf niet kan bestaan: de engine draait client-side en ziet
door RLS uitsluitend de eigen rijen. De cijfers uit die rondes beschreven dus niet wat een
gebruiker te zien krijgt. Deze audit is opnieuw gedraaid op **één gebruiker** (103 sessies,
41 weegmomenten). Het is geen productdefect — het was een fout in mijn analysemethode — maar
het corrigeert wel de eerder gerapporteerde aantallen.

| | Vorige ronde (2 accounts vermengd) | Nu (1 gebruiker) |
|---|---:|---:|
| Circulair uitgesloten | 24 | **23** |
| Kenbare relaties | 186 | **187** |
| Doorgerekend op echte data | 82 | **82** |
| Gevalideerde patronen | 6 | **7** |

Het extra patroon is *Aantal sets ↔ Topgewicht*; op vermengde data verdween dat in de ruis.

---

## 1. Wat de engine kan weten

| Variabele | key | Domein | Aard | Ruwe invoer | Beschikbaarheid |
|---|---|---|---|---|---|
| HRV | `hrv` | recovery | gemeten | hrv | nu |
| Rusthartslag | `rhr` | recovery | gemeten | rhr | nu |
| Slaap | `sleep` | recovery | gemeten | sleep | nu |
| Dagfactor | `dagfactor` | recovery | afgeleid | hrv, sleep | nu |
| Gereedheid | `readiness` | recovery | afgeleid | hrv, sleep | nu |
| Lichaamsgewicht | `gewicht` | recovery | gemeten | weight | nu |
| Trainingsvolume | `volume` | training | afgeleid | sets, reps, weight_kg | nu |
| RPE | `rpe` | training | gemeten | rpe | nu |
| Aantal sets | `sets` | training | gemeten | sets | nu |
| Trainingsbelasting | `load` | training | afgeleid | sets, reps, weight_kg, rpe | nu |
| Belasting vorige dag | `load_vorige_dag` | training | afgeleid | sets_prev, reps_prev, weight_kg_prev, rpe_prev, kalender | nu |
| Weekbelasting | `weekbelasting` | training | afgeleid | sets, reps, weight_kg, rpe, sets_prev, reps_prev, weight_kg_prev, rpe_prev, kalender | nu |
| Rustdagen ervoor | `rustdagen` | training | afgeleid | kalender | nu |
| Trainingsduur | `duur` | training | gemeten | duration | toekomstig |
| Rustduur | `rust` | training | gemeten | rest_sec | toekomstig |
| Prestatieniveau | `e1rm` | performance | afgeleid | weight_kg, reps | nu |
| Topgewicht | `topgewicht` | performance | gemeten | weight_kg | nu |
| Cardio-split | `cardio_split` | performance | afgeleid | distance, duration | nu |
| Temperatuur | `temperatuur` | environment | gemeten | temp_c | toekomstig |
| Luchtvochtigheid | `luchtvochtigheid` | environment | gemeten | humidity | toekomstig |
| Wind | `wind` | environment | gemeten | wind_kmh | toekomstig |

**Rekensom van het bereik**

| | Aantal |
|---|---:|
| Variabelen in het register | 21 |
| — nu beschikbaar | 16 |
| — wacht op nieuwe invoer | 5 |
| Theoretisch mogelijke paren (21 × 20 / 2) | 210 |
| Uitgesloten wegens circulariteit | 23 |
| **Kenbare relaties** | **187** |
| Doorgerekend op de huidige data | 82 |
| Wacht op een invoer die nog niet bestaat | 105 |

De drie zichtbare verbanden uit sprint 25 waren dus nooit "alles wat Trainingskompas kent".
Ze waren de bovenkant van een ranglijst. Sinds sprint 26 toont het overzicht er twaalf, met
de resterende 65 achter *meer tonen*.

---

## 2. Gevalideerde patronen

Een relatie krijgt pas een patroonstatus bij minimaal 30 vergelijkbare dagen, minimaal 5
onderscheiden waarden aan beide kanten, minder dan 35 % uitgesloten dagen, en een
sterktedrempel volgens Cohen (1988). Alles daaronder blijft `INSUFFICIENT_DATA`.

| Relatie | r | n | Status | Datakwaliteit | Reden |
|---|---:|---:|---|---|---|
| HRV ↔ Rusthartslag | -0.515 | 37 | STRONG_PATTERN | goed | — |
| Rustdagen ervoor ↔ Topgewicht | +0.403 | 30 | MODERATE_PATTERN | goed | — |
| Aantal sets ↔ Topgewicht | +0.196 | 31 | POSSIBLE_PATTERN | goed | — |
| Trainingsbelasting ↔ Rustdagen ervoor | -0.164 | 30 | POSSIBLE_PATTERN | goed | — |
| Trainingsvolume ↔ Rustdagen ervoor | -0.127 | 30 | POSSIBLE_PATTERN | goed | — |
| HRV ↔ Slaap | +0.111 | 37 | POSSIBLE_PATTERN | goed | — |
| Aantal sets ↔ Rustdagen ervoor | -0.103 | 30 | POSSIBLE_PATTERN | goed | — |

**Beoordeling per patroon**

| Relatie | Onafhankelijke invoer? | Tautologie? | Sportinhoudelijk verdedigbaar | Oordeel |
|---|---|---|---|---|
| HRV ↔ Rusthartslag | Ja — twee losse metingen uit dezelfde hartslagsensor, maar verschillende grootheden | Nee | Klassiek omgekeerd verband: hogere variabiliteit gaat samen met een lagere rusthartslag | **Behouden** |
| Rustdagen ervoor ↔ Topgewicht | Ja — kalenderafstand versus gelogd gewicht | Nee, sinds `kalender` expliciet als invoer van beide belastingsmaten is vastgelegd | Herstel vóór een zware dag is de kern van de recovery-first-benadering | **Behouden** |
| Aantal sets ↔ Topgewicht | Ja | Nee — sets is een telling, topgewicht een maximum; `volume` deelt wél invoer met beide en is dáárom uitgesloten | Volumeverdeling versus piekbelasting binnen één sessie | **Behouden** |
| Trainingsbelasting ↔ Rustdagen ervoor | Ja | Nee | Meer rust ervoor gaat samen met een andere belastingsopbouw | **Behouden, zwak** |
| Trainingsvolume ↔ Rustdagen ervoor | Ja | Nee | Idem | **Behouden, zwak** |
| Aantal sets ↔ Rustdagen ervoor | Ja | Nee | Idem | **Behouden, zwak** |
| HRV ↔ Slaap | Ja | Nee | Bekend fysiologisch verband, hier zeer zwak | **Behouden, zwak** |

De laatste vier hebben een coëfficiënt onder 0,20. Ze halen de drempel, maar het zijn geen
verhalen om coaching op te bouwen. De DecisionCore-formulering maakt dat zichtbaar via
`strength_label`; er is geen reden ze te verbergen en evenmin om ze te benadrukken.

---

## 3. Onderzocht en niets gevonden

| Relatie | r | n | Status | Datakwaliteit | Reden |
|---|---:|---:|---|---|---|
| Rusthartslag ↔ Slaap | -0.023 | 36 | NO_PATTERN | goed | — |

Dit is een inhoudelijk antwoord, geen leemte: bij 36 vergelijkbare dagen is er tussen
rusthartslag en slaapduur bij deze sporter geen samenhang. Precies daarvoor bestaat het
onderscheid tussen `NO_PATTERN` en `INSUFFICIENT_DATA` dat in sprint 26 is toegevoegd.

---

## 4. Verborgen maar valide — wacht alleen op meer dagen

Vijftig relaties zijn doorgerekend met goede datakwaliteit maar hebben nog geen 30
vergelijkbare dagen. Vijfentwintig daarvan zitten al op 20 of meer. Deze worden vanzelf
opnieuw beoordeeld zodra de sporter blijft loggen — er is geen actie voor nodig.

| Relatie | r | n | Status | Datakwaliteit | Reden |
|---|---:|---:|---|---|---|
| RPE ↔ Aantal sets | -0.379 | 25 | INSUFFICIENT_DATA | goed | — |
| Trainingsvolume ↔ RPE | -0.269 | 25 | INSUFFICIENT_DATA | goed | — |
| RPE ↔ Topgewicht | +0.111 | 25 | INSUFFICIENT_DATA | goed | — |
| RPE ↔ Rustdagen ervoor | +0.043 | 25 | INSUFFICIENT_DATA | goed | — |
| Aantal sets ↔ Prestatieniveau | -0.389 | 22 | INSUFFICIENT_DATA | goed | — |
| RPE ↔ Prestatieniveau | +0.373 | 22 | INSUFFICIENT_DATA | goed | — |
| Rustdagen ervoor ↔ Prestatieniveau | -0.128 | 22 | INSUFFICIENT_DATA | goed | — |
| HRV ↔ Trainingsbelasting | -0.251 | 21 | INSUFFICIENT_DATA | goed | — |
| Dagfactor ↔ Topgewicht | -0.235 | 21 | INSUFFICIENT_DATA | goed | — |
| Gereedheid ↔ Topgewicht | -0.235 | 21 | INSUFFICIENT_DATA | goed | — |
| HRV ↔ Trainingsvolume | -0.199 | 21 | INSUFFICIENT_DATA | goed | — |
| Dagfactor ↔ Rustdagen ervoor | -0.173 | 21 | INSUFFICIENT_DATA | goed | — |
| Gereedheid ↔ Rustdagen ervoor | -0.173 | 21 | INSUFFICIENT_DATA | goed | — |
| HRV ↔ Topgewicht | -0.131 | 21 | INSUFFICIENT_DATA | goed | — |
| HRV ↔ Rustdagen ervoor | -0.062 | 21 | INSUFFICIENT_DATA | goed | — |
| Dagfactor ↔ Aantal sets | +0.058 | 21 | INSUFFICIENT_DATA | goed | — |
| Gereedheid ↔ Aantal sets | +0.058 | 21 | INSUFFICIENT_DATA | goed | — |
| HRV ↔ Weekbelasting | -0.057 | 21 | INSUFFICIENT_DATA | goed | — |
| Dagfactor ↔ Trainingsbelasting | +0.051 | 21 | INSUFFICIENT_DATA | goed | — |
| Gereedheid ↔ Trainingsbelasting | +0.051 | 21 | INSUFFICIENT_DATA | goed | — |
| HRV ↔ Aantal sets | -0.034 | 21 | INSUFFICIENT_DATA | goed | — |
| Dagfactor ↔ Trainingsvolume | +0.012 | 21 | INSUFFICIENT_DATA | goed | — |
| Dagfactor ↔ Weekbelasting | +0.012 | 21 | INSUFFICIENT_DATA | goed | — |
| Gereedheid ↔ Trainingsvolume | +0.012 | 21 | INSUFFICIENT_DATA | goed | — |
| Gereedheid ↔ Weekbelasting | +0.012 | 21 | INSUFFICIENT_DATA | goed | — |
| Dagfactor ↔ RPE | +0.299 | 18 | INSUFFICIENT_DATA | goed | — |
| Gereedheid ↔ RPE | +0.299 | 18 | INSUFFICIENT_DATA | goed | — |
| HRV ↔ RPE | -0.141 | 18 | INSUFFICIENT_DATA | goed | — |
| HRV ↔ Prestatieniveau | -0.373 | 16 | INSUFFICIENT_DATA | goed | — |
| Lichaamsgewicht ↔ Trainingsbelasting | +0.180 | 16 | INSUFFICIENT_DATA | goed | — |
| Lichaamsgewicht ↔ Weekbelasting | -0.151 | 16 | INSUFFICIENT_DATA | goed | — |
| Lichaamsgewicht ↔ Trainingsvolume | +0.122 | 16 | INSUFFICIENT_DATA | goed | — |
| Lichaamsgewicht ↔ Topgewicht | +0.070 | 16 | INSUFFICIENT_DATA | goed | — |
| Lichaamsgewicht ↔ Aantal sets | -0.036 | 16 | INSUFFICIENT_DATA | goed | — |
| Slaap ↔ Trainingsbelasting | +0.515 | 12 | INSUFFICIENT_DATA | goed | — |
| Slaap ↔ Trainingsvolume | +0.445 | 12 | INSUFFICIENT_DATA | goed | — |
| Slaap ↔ Aantal sets | +0.441 | 12 | INSUFFICIENT_DATA | goed | — |
| Slaap ↔ Weekbelasting | +0.427 | 12 | INSUFFICIENT_DATA | goed | — |
| Slaap ↔ Topgewicht | +0.321 | 12 | INSUFFICIENT_DATA | goed | — |
| Slaap ↔ RPE | +0.162 | 12 | INSUFFICIENT_DATA | goed | — |
| Slaap ↔ Prestatieniveau | +0.147 | 12 | INSUFFICIENT_DATA | goed | — |
| Slaap ↔ Rustdagen ervoor | -0.041 | 12 | INSUFFICIENT_DATA | goed | — |
| Aantal sets ↔ Belasting vorige dag | +0.115 | 11 | INSUFFICIENT_DATA | goed | — |
| Belasting vorige dag ↔ Topgewicht | -0.110 | 11 | INSUFFICIENT_DATA | goed | — |
| Trainingsbelasting ↔ Belasting vorige dag | +0.073 | 11 | INSUFFICIENT_DATA | goed | — |
| Trainingsvolume ↔ Belasting vorige dag | -0.009 | 11 | INSUFFICIENT_DATA | goed | — |
| HRV ↔ Belasting vorige dag | -0.530 | 10 | INSUFFICIENT_DATA | goed | — |
| RPE ↔ Belasting vorige dag | -0.664 | 9 | INSUFFICIENT_DATA | goed | — |
| Belasting vorige dag ↔ Prestatieniveau | +0.167 | 9 | INSUFFICIENT_DATA | goed | — |
| Slaap ↔ Belasting vorige dag | -0.116 | 6 | INSUFFICIENT_DATA | goed | — |

---

## 5. Verborgen wegens te weinig variatie — meer dagen helpt niet

Vierentwintig relaties hebben wél data maar te weinig onderscheiden waarden aan minstens één
kant. De oorzaak is bij deze gebruiker goed aanwijsbaar:

- **Lichaamsgewicht** staat 36 van de 41 dagen op exact 106,0 kg. Dat is een handmatig
  overgenomen waarde, geen meting. Zolang dat zo blijft, levert elke relatie met gewicht een
  betekenisloze correlatie op.
- **Rusthartslag** is 39 dagen lang bijna constant (55–60), met één uitschieter van 28 die de
  outlier-toets van Iglewicz & Hoaglin nog niet ziet omdat n < 20 per paar.

Meer loggen lost dit niet op; een betrouwbaarder bron wel (een weegschaal die naar de app
synchroniseert). Zo hoort het systeem zich ook te gedragen: het weigert hier bewust een
getal te tonen in plaats van een toevallige uitkomst te presenteren.

| Relatie | r | n | Status | Datakwaliteit | Reden |
|---|---:|---:|---|---|---|
| Rusthartslag ↔ Dagfactor | -0.008 | 37 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_doel |
| Rusthartslag ↔ Gereedheid | -0.008 | 37 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_doel |
| Dagfactor ↔ Lichaamsgewicht | +0.106 | 35 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron, te_weinig_variatie_doel |
| Gereedheid ↔ Lichaamsgewicht | +0.106 | 35 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron, te_weinig_variatie_doel |
| HRV ↔ Lichaamsgewicht | -0.101 | 35 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_doel |
| Slaap ↔ Lichaamsgewicht | +0.239 | 34 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_doel |
| Rusthartslag ↔ Lichaamsgewicht | +0.184 | 34 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_doel |
| Dagfactor ↔ Prestatieniveau | +0.169 | 16 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Gereedheid ↔ Prestatieniveau | +0.169 | 16 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Lichaamsgewicht ↔ Rustdagen ervoor | +0.395 | 15 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Lichaamsgewicht ↔ RPE | +0.320 | 13 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Lichaamsgewicht ↔ Prestatieniveau | -0.232 | 13 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Rusthartslag ↔ Topgewicht | +0.502 | 12 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Rusthartslag ↔ Trainingsvolume | +0.309 | 12 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Rusthartslag ↔ Trainingsbelasting | +0.309 | 12 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Rusthartslag ↔ Aantal sets | +0.208 | 12 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Rusthartslag ↔ Weekbelasting | +0.060 | 12 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Rusthartslag ↔ Rustdagen ervoor | +0.053 | 12 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Rusthartslag ↔ RPE | +0.479 | 11 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Rusthartslag ↔ Prestatieniveau | +0.224 | 11 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Dagfactor ↔ Belasting vorige dag | +0.168 | 10 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Gereedheid ↔ Belasting vorige dag | +0.168 | 10 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Lichaamsgewicht ↔ Belasting vorige dag | -0.408 | 7 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |
| Rusthartslag ↔ Belasting vorige dag | -0.507 | 6 | INSUFFICIENT_DATA | onvoldoende | te_weinig_variatie_bron |

---

## 6. Bewust uitgesloten — circulair

Deze paren meten de rekenformule, niet de sporter: beide grootheden delen ruwe invoer.
`DecisionCore.verbandIsCirculair` weigert ze vóór er ook maar één coëfficiënt wordt berekend.

| Paar | id | Reden van uitsluiting |
|---|---|---|
| HRV ↔ Dagfactor | `hrv__dagfactor` | gedeelde ruwe invoer |
| HRV ↔ Gereedheid | `hrv__readiness` | gedeelde ruwe invoer |
| Slaap ↔ Dagfactor | `sleep__dagfactor` | gedeelde ruwe invoer |
| Slaap ↔ Gereedheid | `sleep__readiness` | gedeelde ruwe invoer |
| Dagfactor ↔ Gereedheid | `dagfactor__readiness` | gedeelde ruwe invoer |
| Trainingsvolume ↔ Aantal sets | `volume__sets` | gedeelde ruwe invoer |
| Trainingsvolume ↔ Trainingsbelasting | `volume__load` | gedeelde ruwe invoer |
| Trainingsvolume ↔ Weekbelasting | `volume__weekbelasting` | gedeelde ruwe invoer |
| Trainingsvolume ↔ Prestatieniveau | `volume__e1rm` | gedeelde ruwe invoer |
| Trainingsvolume ↔ Topgewicht | `volume__topgewicht` | gedeelde ruwe invoer |
| RPE ↔ Trainingsbelasting | `rpe__load` | gedeelde ruwe invoer |
| RPE ↔ Weekbelasting | `rpe__weekbelasting` | gedeelde ruwe invoer |
| Aantal sets ↔ Trainingsbelasting | `sets__load` | gedeelde ruwe invoer |
| Aantal sets ↔ Weekbelasting | `sets__weekbelasting` | gedeelde ruwe invoer |
| Trainingsbelasting ↔ Weekbelasting | `load__weekbelasting` | gedeelde ruwe invoer |
| Trainingsbelasting ↔ Prestatieniveau | `load__e1rm` | gedeelde ruwe invoer |
| Trainingsbelasting ↔ Topgewicht | `load__topgewicht` | gedeelde ruwe invoer |
| Belasting vorige dag ↔ Weekbelasting | `load_vorige_dag__weekbelasting` | gedeelde ruwe invoer |
| Belasting vorige dag ↔ Rustdagen ervoor | `load_vorige_dag__rustdagen` | gedeelde ruwe invoer |
| Weekbelasting ↔ Rustdagen ervoor | `weekbelasting__rustdagen` | gedeelde ruwe invoer |
| Weekbelasting ↔ Prestatieniveau | `weekbelasting__e1rm` | gedeelde ruwe invoer |
| Weekbelasting ↔ Topgewicht | `weekbelasting__topgewicht` | gedeelde ruwe invoer |
| Prestatieniveau ↔ Topgewicht | `e1rm__topgewicht` | gedeelde ruwe invoer |

Drie daarvan verdienen toelichting, omdat ze eerder wél zijn doorgeglipt:

- **`weekbelasting__rustdagen`** — een som over zeven dagen daalt automatisch als je minder
  traint. Dat is rekenkundig, niet fysiologisch. In v4.45.1 gaf dit een schijnverband van
  r = −0,41 dat de coach bereikte. Opgelost door `kalender` als expliciete invoer van beide
  op te nemen.
- **`volume__load`, `sets__load`** — belasting wordt uit volume en sets berekend.
- **`e1rm__topgewicht`** — de geschatte 1RM wordt uit het topgewicht afgeleid.

---

## 7. Wacht op invoer die nog niet bestaat — 105 relaties (stand 19-08-2026)

Zes variabelen leverden op dat moment geen enkele reeks en blokkeerden samen 105 van de 187
kenbare relaties. **Van de vier bronnen in de tabel hieronder zijn er sindsdien drie
opgelost** (v4.49.0, v4.51.0, v4.52.0) — alleen cardio-split blijft bewust buiten de engine.
Het exacte aantal nu-nog-geblokkeerde relaties is niet opnieuw herberekend in deze
documentatiesynchronisatie (dat vereist het daadwerkelijk draaien van de relationship-audit
tegen actuele productiedata, niet alleen een documentcorrectie) — vermoedelijk is dat aantal
fors gedaald, maar het concrete cijfer staat hier bewust niet totdat dat is geverifieerd.

| Variabele | Waarom leeg (19-08-2026) | Status nu |
|---|---|---|
| **Trainingsduur** | `sessions` had geen duurkolom | 🟢 **opgelost, v4.49.0.** `sessions.duration_s` + `srpe.v1` |
| **Rustduur tussen sets** | De rusttimer bewaarde zijn uitkomst niet | 🟢 **opgelost, v4.51.0** (`mastersprint/v4.51.0`, `7952a948`). `rest_duration_s` in `sets_detail`, `rest_duration.v1` |
| **Cardio-split** | Berekend maar bewust niet als bron afgegeven | ⚪ **ongewijzigd, blijft geblokkeerd.** Productbesluit over de machine-sleutel ontbreekt nog steeds: een split per 500 m is pas vergelijkbaar binnen hetzelfde apparaat |
| **Temperatuur / Luchtvochtigheid / Wind** | Geen historische reeks per trainingsdag opgeslagen | 🟢 **opgelost, v4.52.0** (`mastersprint/v4.52.0`, `474999f6`). `training_instances.weather` / `sessions.weather`, `weather_session_snapshot.v1` |

---

## 8. Beoordeling van elke kandidaat op de negen vragen

De opdracht vraagt om per kandidaat negen vragen te beantwoorden. Die vragen zijn niet
per relatie handmatig beantwoord — ze zijn **in de engine zelf afgedwongen**, zodat een
nieuwe variabele er niet langs kan glippen:

| Vraag | Waar afgedwongen | Wat er gebeurt als het antwoord nee is |
|---|---|---|
| 1. Is de invoer werkelijk onafhankelijk? | `verbandIsCirculair` vergelijkt de `inputs`-lijsten uit het register | Paar wordt overgeslagen, nooit berekend |
| 2. Is het geen tautologie? | idem | idem |
| 3. Is het geen afgeleide van dezelfde variabele? | idem, plus de `afgeleid`-vlag in het register | idem |
| 4. Sportinhoudelijk verdedigbaar? | Handmatig bij opname in `VARIABLE_REGISTRY`; hoofdstuk 2 van dit document is de verantwoording | Variabele wordt niet opgenomen |
| 5. Reproduceerbaar? | `discover` is puur en krijgt zijn tijdstip ingespoten; geen `Date.now` in de engine | Zou de testsuite laten falen |
| 6. Deterministisch? | Spearman staat één keer in `calculation.js`; `dayfactor.v1` is per dag berekend | idem |
| 7. Voldoende data? | `REL_MIN_KANDIDAAT=10`, `REL_MIN_PATROON=30`, `REL_MIN_DISTINCT=5`, `REL_MAX_UITSLUIT=0.35` | Status blijft `INSUFFICIENT_DATA` |
| 8. Begrijpelijk voor de gebruiker? | Elke variabele draagt `zinNaam`, `conditie` en `noemer`; DecisionCore bouwt daar de zin uit | Variabele kan niet worden opgenomen |
| 9. Veilig aan de AI te geven? | Whitelist `INTEL_AI_FIELDS` (6 velden) en `INTEL_INZICHT_FIELDS` (9 velden) | Veld bereikt de AI niet |

---

## 9. Conclusie

**Geen enkele nieuwe relatie toegevoegd in deze sprint.** Het register telt onveranderd 21
variabelen. Dat is de uitkomst, niet het uitblijven van werk: de opdracht schrijft voor dat een
relatie pas mag worden toegevoegd wanneer de bestaande architectuur haar rechtvaardigt, en
geen van de zes ontbrekende variabelen kan worden ontsloten zonder eerst nieuwe data vast te
leggen. Dat vastleggen (met name `duration_s`) is geen releasewerk en staat als POST-V1 in
`CURRENT_ROADMAP.md`.

Wat deze audit wél oplevert:

1. De cijfers van de vorige rondes zijn gecorrigeerd — ze waren op vermengde accounts berekend.
2. Er is een zevende gevalideerd patroon zichtbaar geworden op schone data.
3. De 105 geblokkeerde relaties zijn per ontbrekende variabele toegewezen, met een
   opbrengstschatting per stuk. `duration_s` ontsluit er veruit de meeste.
4. De reden van onzichtbaarheid is nu per relatie hard gemaakt: 50 wachten op dagen,
   24 op databetrouwbaarheid, 105 op een invoer die nog niet bestaat, 23 zijn definitief
   uitgesloten.
