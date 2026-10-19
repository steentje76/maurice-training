# TK-REL-SEC-10 — Acceptatiecontract server-read-after-write (`serververify.v1`)

**Datum:** 19 oktober 2026 · **Status:** contract vastgesteld als voorstel; contractkern geïmplementeerd en getest (`core/serverVerification.js`), nog niet in de app geladen. **Geen** wijziging van trainingsdata, schema, RLS of triggers.

## 1. Waarom

Een HTTP 2xx of een lege offline-wachtrij is geen bewijs dat de gegevens van de sporter volledig en correct op Supabase staan:

- `resolution=ignore-duplicates` geeft 2xx terug als er al een rij bestond, ook als die rij inhoudelijk anders is;
- een PATCH die 0 rijen raakt (RLS, compare-and-set) is ook 2xx;
- de insert-trigger `set_user_id_from_auth()` maakt een rij eigendom van de aanroeper, niet van de bedoelde eigenaar;
- `allowBackup="false"`: een Android-de-installatie wist alle lokale data definitief.

## 2. Statusmachine

```
LOCAL → QUEUED → SENT → SERVER_ACCEPTED → SERVER_VERIFIED
                  │            │
                  └→ QUEUED    ├→ MISMATCH   (eindtoestand)
                  └→ UNKNOWN   ├→ MISSING    (eindtoestand)
                               └→ UNKNOWN    (eindtoestand)
```

| Status | Betekenis | Telt als serverbewijs |
|---|---|---|
| `LOCAL` | alleen op het toestel | nee |
| `QUEUED` | duurzaam in de IndexedDB-wachtrij (commit bevestigd) | nee |
| `SENT` | verzoek verstuurd, antwoord onbekend | nee |
| `SERVER_ACCEPTED` | server gaf 2xx | **nee** |
| `SERVER_VERIFIED` | teruggelezen en inhoudelijk gelijk | **ja, als enige** |
| `MISMATCH` | teruggelezen maar eigenaar, id of inhoud wijkt af | nee |
| `MISSING` | teruggelezen, rij bestaat niet | nee |
| `UNKNOWN` | niet (volledig) teruggelezen of ongeldige invoer | nee |

`SERVER_VERIFIED` is alleen bereikbaar vanuit `SERVER_ACCEPTED`, en alleen via `verifyRecord()`.

## 3. Verificatierecord (per rij)

| Veld | Inhoud |
|---|---|
| `versie` | `serververify.v1` |
| `status` | zie §2 |
| `record_id` | client-id van de lokaal ingevoerde rij (vereist) |
| `owner_uid` | eigenaar van de write (vastgelegd bij de aanroep, TK-REL-SEC-02) |
| `hash_lokaal` / `hash_server` | FNV-1a over de canonieke vorm van uitsluitend de opgegeven velden |
| `afwijkingen[]` | `eigenaar`, `record_id`, `veld:<naam>`, `rij_ontbreekt`, `niet_teruggelezen`, `onvolledige_invoer` |
| `bron` | leesroute, bv. `supabase:rest:sessions` |
| `verified_at` | tijdstip van de geslaagde teruglezing (alleen bij `SERVER_VERIFIED`) |

**Canonieke vergelijking.** Alleen de velden die de client verstuurde; server-velden zoals `created_at` tellen niet. Numerieke velden worden alleen genormaliseerd als ze expliciet als `number` zijn opgegeven (`"8.0" == 8`); er wordt niet gegokt over types. Sleutelvolgorde maakt niet uit.

**Eigenaar.** De serverrij moet `user_id` (of het opgegeven eigenaarsveld) gelijk aan `owner_uid` hebben. Teruglezen gebeurt met het token van díe eigenaar; RLS kan anders een rij onzichtbaar maken, en dat zou dan als `MISSING` verschijnen.

## 4. Ouder-kindvolledigheid

`verifyParentChildren()`: de ouder én elk lokaal bekend kind moeten `SERVER_VERIFIED` zijn. Een kind dat op de server staat maar lokaal onbekend is, maakt de groep `MISMATCH`. Zijn de kinderen niet teruggelezen, of is de lokale kinderlijst onbekend, dan is de groep `UNKNOWN`. Toepassing:

- `custom_trainings` + `custom_training_exercises`
- `training_instances` + `sessions`
- `nutrition_meals` + `nutrition_meal_items`
- `activities` + `activity_laps`

## 5. De-installatiepoort

`uninstallGate()` staat een de-installatie alleen toe als:

1. de lokale inventaris volledig is: wachtrij (strikt gelezen), drafts, Guided, onbevestigde Builder-trainingen en lokale-only id's;
2. geen enkele lokale bron onleesbaar is;
3. elk lokaal id een resultaat `SERVER_VERIFIED` heeft.

In alle andere gevallen geldt **NO-GO**, met een lijst van redenen.

## 6. Implementatiestatus

| Onderdeel | Status |
|---|---|
| Contractkern (`core/serverVerification.js`) | **gereed**: samengestelde identiteit (tabel + record-id + eigenaar + revisie), `beoordeelRegister`, MISSING nooit definitief; `fServerVerifyHardening` 30/30, `fServerVerificationContract` 31/31 |
| Lokaal register | **gebouwd (fase 2, Draft)**: aparte IndexedDB `tk_verificatie/register`; de wachtrij-DB blijft ongewijzigd; opslagfout = defect (fail-closed) |
| Leesroute per tabel | **gebouwd (fase 2, Draft)**: `GET ?select=*&<sleutel>=in.(…)` via `sbFetch` met `{uid}` (GET-binding), identiteitscontrole vóór en na |
| UI | **gebouwd (fase 2, Draft)**: "Controleren met de server" in de updategereedheid; "Veilig om te verwijderen" uitgeschakeld |
| Koppeling met `tkUpdateGereedheid()` | **deels**: een registerdefect maakt de gereedheid onbekend; de poort blijft dicht tot de historie is geïnventariseerd |
| Verwijdering | **fase 3**: alleen bewezen via het DELETE-antwoord (`return=representation`); afwezig zonder bewijs = UNKNOWN |
| Historische inventaris | **fase 3 (Draft)**: bronmanifest, alleen-lezen basismeting, `HIST_*`-statussen; nooit SERVER_VERIFIED |

Rapport: `docs/TK_SERVER_READ_AFTER_WRITE_FASE2_RAPPORT_20261019.md`.

**Android:** een de-installatie blijft verboden tot §5 voor alle relevante lokale gegevens aantoonbaar `toegestaan` oplevert. Dat is nog niet het geval.
