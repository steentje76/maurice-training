# Herstelpreview — betrouwbare inhoudsvergelijking (20 oktober 2026, TK-REL-SEC-32)

Branch `review/claude-restore-canon-20261020`, gestapeld op Draft-PR #568 (`e2adec9`). Er is niets gemerged, niets in productie aangepast, geen gegevens hersteld en niets op Android geïnstalleerd.

## Oorzaak

1. **`__proto__`.** `canon()` in `core/restorePreview.js` bouwde gewone objecten (`const o={}`). Bij een eigen veld `"__proto__"` (door `JSON.parse` als gewone data aangemaakt) zette `o['__proto__']=…` het prototype van `o` in plaats van een veld. Het veld verdween daardoor uit de vergelijking. Twee records met dezelfde id en een andere `__proto__`-inhoud waren dus "gelijk". Een record met het veld en een record zonder dat veld ook.
2. **Gelijkheid op een 32-bits FNV-vingerafdruk.** De lokale index en de wachtrijvergelijking bewaarden alleen de vingerafdruk, en BESTAAT_AL werd beslist op `vingerafdruk === vingerafdruk`. Een botsing is na ongeveer 2^16 pogingen te vinden. De test zoekt ze en vindt er binnen enkele duizenden pogingen. Twee verschillende records werden dan BESTAAT_AL.

## Herstel

- `canonTekst()` is een volledige, deterministische canonieke serialisatie zonder tussenobjecten:
  - sleutels gesorteerd, recursief;
  - strings, getallen, `null` en `false` blijven onderscheiden;
  - een ontbrekend veld is niet gelijk aan `null`;
  - dieptegrens 64. Een onvergelijkbaar record wordt ONBEKEND.
- **Gelijkheid wordt alleen beslist op de volledige canonieke tekst:** lokale index per identiteit, verzameling van inhouden bij identiteit-op-inhoud (Guided Workout-log), wachtrij (inhoud en identiteit), en de vergelijking "al op de server".
- **Identiteit op inhoud** geeft bij een verschil HERSTELBAAR (een andere regel), nooit CONFLICT. Gelijk geeft BESTAAT_AL.
- **De vingerafdruk blijft alleen een ondersteunende aanduiding** in het plan, in de recordsleutel zonder identiteit en in de vingerafdrukvelden. Hij beslist niets.
- Objecten zonder prototype voor de wachtrij-index; `hasOwnProperty` bij het opzoeken.

## Tests

| Suite | Resultaat | RED op `e2adec9` |
|---|---|---|
| `fRestorePreviewCanon` (nieuw) | 28/28 | 8 |
| `fRestorePreview` | 53/53 | — |
| Volledige core-suite (Node 20) | 488/488 | — |
| Chromium-suites | alle groen | — |

`fRestorePreviewCanon` dekt:

- C1: `__proto__` met een andere inhoud, en aanwezig versus ontbrekend;
- C2: echte FNV-32-botsingen in een map, een eigen training, de log en de wachtrij;
- C3: andere veldvolgorde;
- C4: geneste objecten en arrays;
- C5: getal, getal-als-tekst, string, null, ontbrekend en false;
- C6: "al op de server", inclusief een botsende waarde;
- C7: accountwissel;
- C8: herhaalde preview zonder mutatie, in de echte app-preview;
- C9: de vingerafdruk is alleen ondersteunend.

Mutatietests: 12/12 gedood. Gedekt zijn onder meer:

- gelijkheid op de vingerafdruk (in 4 varianten);
- een tussenobject met prototype;
- ongesorteerde sleutels;
- geen onderscheid tussen tekst en getal;
- null gelijk aan ontbrekend;
- gesorteerde arrays;
- false gelijk aan null.

## Resterende risico's

- De dieptegrens van 64 is ruim boven de opschoondiepte van de kopie (32). Dieper geeft ONBEKEND, nooit gelijk.
- Getallen worden vergeleken op hun JSON-weergave: `60` en `60.0` zijn gelijk, `"60"` en `60` niet. Dat volgt de opslag in localStorage (JSON).
- Een herstelprocedure (fase 4C) moet dezelfde `canonTekst` gebruiken. Het voorstel noemt dit expliciet.
