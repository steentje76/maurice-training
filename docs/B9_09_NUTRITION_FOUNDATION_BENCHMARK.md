# B9-09 Nutrition Foundation — Benchmark

| Product | Patroon | Sterkte | Zwakte/risico | TK-keuze |
|---|---|---|---|---|
| MyFitnessPal | Enorme voedingsmiddelendatabase + barcode | Snelle logging voor bekende producten | Databasekwaliteit wisselend, sterke focus op caloriedoel/tekort -- kan restrictief gedrag voeden | Geen voedingsmiddelendatabase, geen barcode (expliciet uitgesloten, sectie 8) |
| MacroFactor | Adaptieve TDEE-berekening uit gewichtstrend | Wetenschappelijk onderbouwd, past doel automatisch aan | Vereist consistente, langdurige logging; TDEE-schatting blijft een schatting die als "waarheid" kan overkomen | Geen caloriedoel-/TDEE-engine (expliciet uitgesloten, sectie 9) |
| Cronometer | Zeer gedetailleerde micronutriënten | Compleet voor wie dat wil | Hoge invoerlast, veel friction | Bewust minimaal: alleen kcal/eiwit/koolhydraat/vet/vocht, geen micronutriënten |
| Garmin Connect | Koppelt "calories burned" direct aan een suggestie | Voelt geïntegreerd met training | Wearable-energieverbruik als harde "waarheid" gebruiken is methodologisch zwak | Wearable-energie blijft expliciet een schatting, geen eat-back-engine (sectie 16) |
| WHOOP | Herstel/voeding gekoppeld aan recovery-score | Motiverend voor sommigen | Kan schuld-/prestatiedruk rond eten creëren | Geen koppeling aan recovery-score, geen "verdien je eten"-mechaniek (sectie 11) |
| TrainingPeaks | Optionele koppeling van voeding aan een workout (pre/during/post) | Nuttige trainingscontext zonder dwang | Kan verworden tot een verplicht ritueel per training | Koppeling aan training is optioneel, `timing_context` op één entry_type, geen aparte, verplichte flow |
| Fitbit | Snelle "water glass"-teller | Zeer lage friction voor hydratatie | Weinig context, geen precisie nodig -- ook geen probleem | Vergelijkbare, snelle hydratatie-invoer (ml, één stap) |

**TK-keuze, samengevat:** een klein, eerlijk, uitbreidbaar fundament --
geen voedingsmiddelendatabase, geen caloriedoel, geen dieetadvies. De
gebruiker registreert zelf wat hij wil, met expliciete "niet
ingevoerd"-taal in plaats van gefabriceerde nullen of doelen.
