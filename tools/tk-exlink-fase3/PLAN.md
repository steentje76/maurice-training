# DEC-EXLINK-005 — Fase 3: historie van de eigenaar naar MoveKit-id's (plan, 15 november 2026)

Status: stap 0, fase 3a en porties 1-4 uitgevoerd (56 van 70; 17 november). Rest wacht op MoveKit-cardio in de app.

## Besluiten eigenaar (15 november)
- Fase 3 voorbereiden (appwerk + plan + proefrun), uitvoeren per portie.
- Alleen de data van het eigen account wordt gemigreerd.
- Van andere gebruikers worden alleen de 9 sessies op gedeelde oude catalogusoefeningen verwijderd (met back-up). Accounts en overige data blijven.

## Inventaris (productie, alleen gelezen)
| Wat | Aantal |
|---|---|
| Zichtbare koppelingen eigen oefening → MoveKit | 70 (20 op een oud TK-id, 48 eigen persoonlijke, 2 eigen globale) |
| Sessies van de eigenaar op gekoppelde oefeningen | 196 van 199 (33 oefeningen met historie) |
| Doelen (exercise_goals) op gekoppelde oefeningen | 27 |
| Programmaregels / trainingsregels / eigen trainingsregels | 192 / 14 / 2 |
| Uitrusting / favorieten | 5 / 2 |
| Sessies van andere gebruikers op gekoppelde (oude TK-) oefeningen | 9 → worden verwijderd (stap 0) |

## GAP: wat de app nog mist (fase 3a, eerst bouwen)
1. **Programma's en trainingen op catalogus-id zonder bron.** Een programmaregel met een TK-id zonder opgeslagen MoveKit-bron
   logt nu op het TK-id (de app maakt zo nodig een FK-compat-rij). Na migratie moet zo'n item op het MoveKit-id loggen.
   Gebouwd (3a): `tk504DerivedCatalogRef` via `getSessionExs`.
2. **Koppeling "gemigreerd".** Na migratie mag de app een catalogusitem niet meer naar de eigen oefening omleiden
   (DEC-EXLINK-002), anders splitst de historie weer. Nodig: kolom `migrated_at` op `exercise_catalog_links`;
   gemigreerd = geen omleiding; oude verwijzingen naar de eigen id (wachtrij, snapshots) worden het catalogusitem.
3. **Achterblijvers uit de offline-wachtrij.** Een sessie die na de migratie nog op de oude id binnenkomt: herhaalde run
   verplaatst haar (zelfde patroon als fase 1).
4. **Doelen samenvoegen.** Eigen/TK-doelrij en TKC-rij samenvoegen, hoogste waarde per veld (besluit fase 1);
   `tkGoalKey` gaat daarna altijd naar TKC.
5. **Rusttijd, uitrusting, favorieten** meeverhuizen naar de nieuwe sleutel.

## Uitvoering (fase 3b), per portie
Per portie één transactie met voorwaarden, back-up (`bak_tkx3_<datum>_*`), controles en auditregel; herhaalbaar;
terugdraaibaar via reverse-script. Alleen rijen van de eigenaar.
- sessies: eigen/TK-id → TKC-id
- exercise_goals: samenvoegen in de TKC-rij
- programma-, trainings- en eigen trainingsregels, snapshots: eigen id → TK-catalogus-id
- rusttijd, uitrusting, favorieten: naar de nieuwe sleutel
- koppeling: `migrated_at = now()`; eigen oefening `active = false` (verwijderen pas in fase 4)

Porties (voorstel): P1 = 5 oefeningen zonder programma en met weinig sessies; P2 = rest zonder programma;
P3 = oefeningen in programma's; P4 = hoofdliften (bankdrukken, squat, press). Na elke portie: app-controle op de telefoon.

## Stap 0 (los, klaar): 9 sessies van andere gebruikers verwijderen
`delete-foreign-9.sql` (back-up + voorwaarden + controles), terugzetten met `restore-foreign-9.sql`.
Proefrun eindigt met `rollback;`, uitvoering met `commit;`.

## Volgorde
0. Go stap 0 → proefrun → uitvoering.
1. Fase 3a: appwerk (punten 1–5) + migratie `migrated_at` (na go) + tests + merge (na go).
2. Fase 3b: per portie proefrun (rollback) → go → uitvoering → controle op de telefoon.
3. Fase 4: opruimen (eigen oefeningen en back-ups), apart besluit.
