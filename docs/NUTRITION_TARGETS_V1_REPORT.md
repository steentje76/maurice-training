# Nutrition Targets V1 — Stacked Sprint Report (bovenop PR #240)

## Forensische inventarisatie
Repo-breed geen bestaande target-/goal-functionaliteit: B9-09/B9-11 zeggen expliciet "geen caloriedoel-/macrodoel-engine"; geen `nutrition_targets`-tabel; geen UI. **Wel bestaand en leidend:** Calculation Registry CALC-ENE-004 legt BMR/RMR/TDEE vast als **NOT_IMPLEMENTED / PRODUCT_DECISION_REQUIRED** (meerdere wetenschappelijk verschillende vergelijkingen; roadmap schrijft geen methode voor), bewaakt door `fEnergyEstimateRegistry.test.js` (10/10). Hergebruikt: `NutritionMealService.aggregateDailyNutrition()` (consumed + coverage), `NutritionCrossDomainContract`, bestaande sbGet/sbPostQ-, RLS- en UI-conventies.

## Productbeslissing
- **USER_DEFINED: V1 — gebouwd.** Volwaardige functionaliteit.
- **SYSTEM_CALCULATED: niet gebouwd.** Vereist BMR/TDEE, wat een geregistreerde open productbeslissing is; bouwen zou die overrulen zonder evidence. De DB-`source`-check laat alleen USER_DEFINED toe en is later uitbreidbaar.
- **AI_GENERATED: nooit canonical source.** Afgedwongen in service (`INVALID_SOURCE`) én database-constraint (functioneel bewezen: insert met AI-source geweigerd).

## Architectuur
- Model: `nutrition_targets(user_id, effective_from, energy_kcal, protein_g, carbohydrate_g, fat_g, source, created_at)`; NULL = geen doel (UNKNOWN≠0, 0 is per constraint geweigerd); minstens één veld verplicht (constraint).
- Historie: **effective_from-versionering** — elke wijziging is een nieuwe rij; de dag krijgt het doel met grootste `effective_from <= dag`. Maandag 2400 → vrijdag 2600: maandag blijft tegen 2400 beoordeeld (getest).
- Berekening: uitsluitend `core/nutritionTargetService.js` (`computeDailyProgress`): CONSUMED/TARGET/REMAINING/PROGRESS per veld met status `NO_TARGET | NOTHING_LOGGED | UNKNOWN_CONSUMED | ON_TRACK | OVER_TARGET`. UI toont via `formatRemaining` (neutraal: "Nog 580 kcal" / "10 g boven doel"). Geen `target - consumed` in UI (structurele test).
- UNKNOWN: doel null → NO_TARGET (niets tonen); items gelogd maar veld onbekend → UNKNOWN_CONSUMED (remaining null, "Inname onvolledig bekend"); niets gelogd → consumed 0 (echte nul), remaining = target.
- Partial targets: elk veld onafhankelijk optioneel (getest, DB + service + UI).
- Validatie: technische plausibiliteitsgrenzen → `CHECK_VALUE` met expliciete tweede bevestiging; geen stille correctie, geen medische claims.
- AI-boundary: nutrition gaat nog niet naar de AI Coach; `buildTargetContext()` legt alvast het contract vast (canonieke remaining, wording "je ingestelde doel", nooit "optimale behoefte").

## Security (live geverifieerd)
RLS user_id=auth.uid() op SELECT/INSERT/UPDATE/DELETE; `anon` geen rechten; `authenticated` alleen SELECT/INSERT/UPDATE/DELETE (TRUNCATE/REFERENCES/TRIGGER expliciet ingetrokken — TRUNCATE omzeilt RLS). Constraints functioneel bewezen (AI-source, leeg doel en 0 geweigerd; partial target toegestaan). Testrij opgeruimd. Beperking: cross-user black-box met echte JWT niet vanuit deze tooling (bekende, eerder gedocumenteerde beperking); policy-expressies zijn structureel bevestigd.

## Geparkeerde real-device blockers (ONGEWIJZIGD, OPEN)
1. Native camera-app fallback: terugkeer naar Home, foto niet verwerkt — OPEN, niet aangeraakt.
2. Fysieke barcodeherkenning onvoldoende betrouwbaar — OPEN, niet aangeraakt.
Groene tests zeggen hier niets over.
