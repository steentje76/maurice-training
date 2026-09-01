# B9-09 Nutrition Foundation — Existing-State Audit

## Matrix

| Capability | Data | DB | Core | UI | Privacy | Evidence | Status |
|---|---|---|---|---|---|---|---|
| Nutrition profile/context | Nee | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Meals | Nee | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Hydration | Nee | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Protein | Nee | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Carbohydrate | Nee | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Fat | Nee | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Energy/kcal (nutrition) | Nee (wel wearable-energieverbruik, ander domein) | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Training nutrition timing | Nee | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Recovery nutrition | Nee (alleen AI-prompttekst noemt "voeding" generiek) | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Body weight context | Ja (bestaand, apart domein: `metingen`/gewicht) | Ja | Ja | Ja | Privé | Bestaand | **CLOSED** (ongerelateerd, niet aangeraakt) |
| Nutrition goals | Nee | Nee | Nee | Nee | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| AI nutrition context | Nee | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Export | N.v.t. (nog geen data) | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |
| Deletion | N.v.t. (nog geen data) | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | **NOT IMPLEMENTED** |

## Bevindingen

Repo-breed, exacte zoekopdrachten uitgevoerd voor alle in de opdracht
genoemde termen (nutrition/voeding/food/meal/calorie/kcal/protein/
eiwit/carb/koolhydraat/fat/vet/hydration/water/fluid/drink/
electrolyte/diet/fasting/supplement/creatine/caffeine). Resultaat: **0
bestaande database-tabellen** (`information_schema.tables` bevat geen
`nutrition`/`meal`/`hydration`/`food`-tabel). De enige treffers in
`index.html` zijn generieke AI-coach-prompttekst die "voeding" als
coachingsonderwerp noemt (bijv. bij Bodybuilding/Triathlon-
identiteiten) en een uitlegtekst bij lichaamsgewicht die "voeding"
noemt als een van de factoren die dagelijkse gewichtsschommelingen
veroorzaakt -- geen van beide is functionele Nutrition-logica.

Bestaande, wel gevonden maar NIET Nutrition: wearable-energieverbruik
(`core/deviceIntegration.js`/`core/concept2Live.js`/
`core/commonData.js`, allemaal "calories verbrand tijdens training",
een compleet ander domein dan voedingsinname) en `core/socialChallenge.js`
noemt "calorie" alleen als voorbeeld van een NIET-ondersteunde
challenge-metric (expliciet uitgesloten, B9-07-precedent).

Lichaamsgewicht/-samenstelling bestaat als eigen, apart, al volwassen
domein (`metingen`) -- B9-09 raakt dit domein niet aan, conform de
opdracht (sectie 10: alleen koppelen wanneer expliciet verwacht,
privacy klopt, geen nieuwe medische claim).

**Conclusie: volledig schone lei.** Geen bestaande code te hergebruiken
of te dupliceren binnen het Nutrition-domein zelf; wel te hergebruiken:
de bestaande offline-queue-infrastructuur, het bestaande account-
deletion-contract, het bestaande export-contract, en de bestaande
canonieke data-quality-taal (COMPLETE/PARTIAL/INSUFFICIENT/
NOT_AVAILABLE) uit eerdere B9-sprints.
