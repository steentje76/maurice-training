# DEC-EXLINK-001 fase 1 — eigen oefeningen worden de MoveKit-oefening

Bestanden:
- `mapping.json` — bron: 98 eigen oefeningen → MoveKit-item, doel (`merged_into`) of `hidden` (race-onderdeel).
- `build.cjs` — genereert `apply.sql` en `reverse.sql` uit `mapping.json` (`--check` controleert of ze actueel zijn).
- `apply.sql` / `reverse.sql` — gegenereerd, niet met de hand wijzigen. Bevatten geen account-id.

## Volgorde (alleen na expliciete go van de eigenaar)

1. PR gemerged en gedeployed (de app kent de koppelingen; zonder koppelingen is het gedrag ongewijzigd).
2. Migratie `supabase/migrations/20261114180000_tk_exercise_catalog_links.sql` toegepast.
3. Telefoon online, app geopend en gesynchroniseerd (lege wachtrij).
4. Proefrun: dezelfde inhoud als hieronder, eindigend met `rollback;`. Het verslag moet `controles = geslaagd` tonen.
5. Uitvoering:
   ```sql
   begin;
   select set_config('tk.exlink_owner', '<uuid eigenaar>', true);
   -- inhoud van apply.sql
   commit;
   ```
6. App herstarten en controleren: kieslijst (één tegel per beweging), historie Bench/Squat/Press, doelen, programma's.

Een herhaalde run is veilig: hij verplaatst alleen achterblijvers (bv. een sessie die na de migratie nog uit de
offline wachtrij op een oude id binnenkwam) en verandert verder niets.

## Terugdraaien

Zelfde vorm met `reverse.sql`. Herstelt alle omgezette rijen, doelen, uitrusting, favorieten, snapshots en de
actief-stand uit `bak_tkx20261114_*` en verwijdert de koppelingen. Sessies die ná de migratie op een doel zijn
gelogd blijven op dat doel staan.
