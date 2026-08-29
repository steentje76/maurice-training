# DAILY_HEALTH_FIELD_RECONCILIATION_CONTRACT.md — Trainingskompas

**Doel:** GAP-P1-008-closure. Formeel vastgelegd vóór enige productiewijziging (sectie 9/16 van de opdracht).

## Bestaande semantiek bevestigd (niet verzonnen, uit code)
`tkMergeHealthRow()` (index.html) behandelt een ontbrekend/leeg invoerveld altijd als **"geen nieuwe data"**, nooit als **"wis deze waarde"**. Bevestigd via UI-audit: `pchkSubmit()` gebruikt `parseFloat(...)||null` — een leeg formulierveld en een expliciete wis-actie zijn in de UI niet te onderscheiden, dus de UI ondersteunt sowieso geen intentioneel wissen. **Conclusie (sectie 24): geen "intentional clear"-semantiek bestaat of hoeft ondersteund te worden.** `COALESCE(nieuw, bestaand)` is daarom veilig (sectie 23) — er is geen scenario waarin `null` iets anders betekent dan "geen nieuwe waarde aangeleverd".

## Field Reconciliation Contract (per veld, bindend voor de nieuwe atomaire schrijffunctie)
| Situatie | Regel |
|---|---|
| Nieuw = waarde, bestaand = null | Nieuw wint. Bron = de bron van de nieuwe schrijver. |
| Nieuw = null, bestaand = waarde | Bestaand blijft. Bron blijft ongewijzigd. |
| Nieuw = waarde, bestaand = waarde, identiek | Nieuw wint (idempotent). Bron = nieuwe schrijver. |
| Nieuw = waarde, bestaand = waarde, verschillend | In de 4 daadwerkelijk gevonden gevallen kwam dit niet voor. Mocht dit optreden: laatste-schrijver-wint (tijdstip-gebaseerd), met behoud van de bijbehorende bron — geen `PRODUCT_DECISION_REQUIRED` zolang beide bronnen (device-invoer, handmatige check-in) gelijkwaardig geldig blijven, wat de bestaande architectuur al zo behandelt. |

## Duplicate Inventory (4 groepen, live geïnspecteerd, geanonimiseerd)
| Groep | Datum | Rijen | Classificatie | Verschil |
|---|---|---|---|---|
| 1 | 2026-06-29 | 2 | A. Exact duplicate | Geen — identiek, 48s uiteen (race) |
| 2 | 2026-07-08 | 2 | A. Exact duplicate | Geen — identiek, 55s uiteen (race) |
| 3 | 2026-08-09 | 2 | A. Exact duplicate | Geen — identiek, 26s uiteen (race) |
| 4 | 2026-08-18 | 2 | B. Complementary (niet conflicterend) | Rij 1: rhr=null. Rij 2 (+1u35m): rhr=57. hrv/sleep/note identiek. Beide dragen [src:fitbit] — beide wearable, geen manual/wearable-botsing. |

**Geen enkele groep bevat groep-D (conflicterende, verschillende non-null waarden). Geen PRODUCT_DECISION_REQUIRED nodig voor deze 4 gevallen.**

## Reconciliatiebeslissing per groep
- **Groepen 1-3:** behoud de OUDSTE rij (originele audit trail), verwijder de duplicaat. Geen velden gewijzigd.
- **Groep 4:** behoud de OUDSTE rij, vul `rhr` aan met de waarde uit de jongste rij (union, geen conflict), verwijder de jongste rij.
- **Bronkolommen:** blijven NULL (= onbekend) voor alle gereconcilieerde rijen — deze rijen dateren van vóór migratie_v499.sql. Bewust GEEN retroactieve invulling vanuit de note-tag tijdens de cleanup zelf (zou een aparte, riskantere beslissing zijn) — de tag-gebaseerde afleiding wordt wel gebruikt voor de leeskant-fix van pickLatestMetric hieronder, niet om de kolommen met terugwerkende kracht te vullen.

## Recoverability (sectie 17)
Alle 4 te verwijderen rijen worden vóór verwijdering gearchiveerd in `hrv_log_archive_v500` (nieuwe, permanente archieftabel), met de volledige oorspronkelijke rij-inhoud + een `archived_reason`-kolom. Reversibel: de archieftabel blijft bestaan.

## Aanvullende bevinding tijdens deze audit (niet GAP-P1-008 zelf, wel gerelateerd)
`core/deviceIntegration.js`'s `pickLatestMetric()` leidt de getoonde bron nog af uit de rij-niveau note-tag (`_parseSrcTag`), niet uit de nieuwe, precieze per-veld-kolommen uit migratie_v499.sql. Meegenomen in deze hotfix (zelfde bestand/architectuur, laag risico): `pickLatestMetric` gebruikt voortaan de per-veld-kolom als deze aanwezig is (nieuwe rijen), met terugval op de bestaande note-tag-methode voor historische rijen zonder kolomwaarde (backward compatible).
