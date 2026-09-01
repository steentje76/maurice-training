# B9-10 Nutrition Product — Benchmark

| Product | UX-pattern | Voordeel | Frictie/risico | TK-keuze |
|---|---|---|---|---|
| MacroFactor | Snelle dag-switcher bovenaan het scherm | Direct duidelijk welke dag je bekijkt | Kan een volledige kalendermodal vereisen | Eenvoudige vorige/volgende/vandaag-knoppen, geen kalendermodal (niet nodig gebleken) |
| MyFitnessPal | "Recente/Favorieten"-lijst voor snel opnieuw loggen | Zeer snel voor terugkerende maaltijden | Kan tot onnauwkeurige, "automatische" invoer leiden | **Niet gebouwd** (sectie 13) -- zou extra scope toevoegen zonder een duidelijke, veilige meerwaarde binnen deze sprint; expliciet gedeferred |
| Cronometer | Zeer gedetailleerde edit-flow met volledige historie per veld | Precieze correcties mogelijk | Hoge complexiteit | Eenvoudige edit: hetzelfde formulier, vooraf ingevuld, dezelfde validatie |
| Fitbit | Eén-tap water-glas-teller | Zeer lage friction voor hydratatie | Weinig flexibiliteit | +250ml/+500ml-presets die het bestaande vocht-veld ophogen, geen aparte teller-UI |
| Garmin Connect | Koppelt een voedingslog direct aan een specifieke workout-kaart | Sterke trainingscontext | Vereist een robuuste, foutloze koppeling | `timing_context` (vóór/tijdens/na training) zonder concrete training-ID-link -- eenvoudiger, geen foutgevoelige koppeling-UI nodig |
| WHOOP | Herstel-dashboard toont voedingscompleteheid als kleurcode | Visueel snel te begrijpen | Kan als beoordeling voelen ("rood is slecht") | Neutrale tekst ("dag mogelijk onvolledig"), geen kleurcodering die als oordeel voelt |
| TrainingPeaks | Offline-first logging met achtergrond-sync | Betrouwbaar in gebieden met slecht bereik | Vereist robuuste queue-architectuur | Hergebruikt de bestaande, bewezen offline-queue -- geen nieuwe architectuur nodig |

**TK-keuze, samengevat:** eenvoud boven volledigheid. Geen recent/
favorieten-systeem, geen kalendermodal, geen kleurcodering -- elke
toevoeging moest een concrete, veilige productwaarde bewijzen binnen
de bestaande architectuur.
