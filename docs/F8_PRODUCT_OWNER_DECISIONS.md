# F8_PRODUCT_OWNER_DECISIONS.md — Trainingskompas

Vastgelegde afwegingen tijdens autonome F8-uitvoering (Product Owner niet beschikbaar). Elke afweging is reversibel; geen enkele onomkeerbare actie is genomen zonder expliciete Product Owner-bevestiging.

## Afweging 1: Scope-beperking tot Cycle & Symptoms, DEFER voor de overige drie domeinen
Waarom nodig: de acceptance gate vraagt vijf gesloten beslissingen, maar drie domeinen (contraceptie, zwangerschap/postpartum, perimenopauze/menopauze/bekkenbodem) vereisen een diepere, aparte evidence-review dan binnen deze sprint verantwoord uit te voeren is, gezien de medische/veiligheidsimplicaties.
Opties overwogen: (a) alle vijf domeinen implementeren, (b) alle vijf als architecture-only behandelen, (c) alleen implementeren waarvoor reeds bestaande, correcte code + voldoende actueel onderzoek beschikbaar is, overige drie bewust uitstellen.
Impact: optie (c) gekozen. Geen functionaliteit voor de meest gevoelige domeinen wordt gebouwd zonder een aparte, toekomstige sprint met hogere veiligheidslat.
Aanbevolen, reversibele default: DEFER voor de drie domeinen. Volledig reversibel.
Kan onafhankelijk werk doorgaan? Ja.

## Afweging 2: cycle_symptom_logs-migratiebestand alsnog retroactief committen
Waarom nodig: de tabel bestaat correct en veilig op de live database (RLS aan, eigen-data-alleen-policy geverifieerd), maar het aanmaak-script ontbreekt in de repo.
Opties overwogen: (a) een retroactief migratiebestand toevoegen (IF NOT EXISTS, geen destructieve wijziging), (b) puur als gedocumenteerd gap laten staan.
Impact: optie (a) is veilig en verbetert reproduceerbaarheid zonder risico.
Aanbevolen, reversibele default: optie (a) -- toegevoegd als onderdeel van deze sprint.
Kan onafhankelijk werk doorgaan? Ja.
