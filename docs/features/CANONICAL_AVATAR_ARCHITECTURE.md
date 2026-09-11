# CANONICAL USER AVATAR — forensische inventarisatie + architectuur

Branch: `feature/canonical-user-avatar` · baseline main `2ce387b3e776900abc0403eed302ecbb27df33a8`
APP_VER v4.69.67. **Nog niet geïmplementeerd.**

## 0. Baseline (zelf geverifieerd, geen aannames)
- remote main == local HEAD == `2ce387b3…`
- Werkboom schoon op tracked files; 3 untracked docs uit de UX-fase.
- stash@{0} (UX-1 zonder goedkeuring) blijft ongemoeid.

## 1. Forensische inventarisatie — uitkomst

| Zoekvraag | Uitkomst |
|---|---|
| `avatar_url` / `avatar_path` / `photo_url` / `profile_image` in code | **0 treffers** |
| Supabase Storage gebruikt (`storage.from`, `/storage/v1/`, `createSignedUrl`, `getPublicUrl`) | **0 treffers** |
| `storage.buckets` in productie | **leeg** — nog géén bucket |
| Bestaande upload/delete helpers voor avatars | **geen** |
| Canonical profieltabel | `atleet_profiel` (user_id, naam, leeftijd, geslacht, lengte, niveau, klasse, sport, doel, cyclus_consent, updated_at) |
| Tweede profielrecord | `social_profiles` (display_name, bio, visibility, theme_id) — pre-existing split, **niet** samenvoegen |
| Avatarkolom in een van beide | **geen** |

### Twee niet-eerder gemelde vondsten

**(a) Er bestaat al een render-hook `atleet.foto` — maar geen opslag.**
Twee locaties renderen al een foto met initialen-fallback:
- `index.html:28069` (Profiel-hero): `foto ? <img src=…> : naam.charAt(0)`
- `index.html:29671` (Home/Vandaag): idem met `V43I.user`-icoon als tweede fallback

`atleet.foto` wordt **nergens gezet**. Er is dus een dormante,
render-only capability. De drietraps-fallback uit §7 (foto → initialen →
neutraal icoon) bestaat op Home dus al in embryonale vorm en moet
hergebruikt worden, niet opnieuw bedacht.

**(b) LATENTE BUG — `atleet` wordt ongefilterd geüpsert.**
`sbUpsert('atleet_profiel', {...atleet, user_id})` stuurt het hele
`atleet`-object door; er is **geen veld-whitelist**. `atleet` leeft in
`localStorage['tk_atleet']`. Zodra `atleet.foto` daadwerkelijk gezet
wordt zonder bijpassende kolom, stuurt PostgREST een fout op een
onbekende kolom en **faalt het opslaan van het hele atleetprofiel**.
Dit is een concrete valkuil voor deze feature: de avatarreferentie mag
niet zomaar als extra sleutel in `atleet` belanden.

**(c) Bestaande beeldverwerking is herbruikbaar.**
De voedingsfoto-flow bevat al native camera-afhandeling én expliciete
EXIF/orientation-correctie (`index.html` ~25863-25907, "orientatie van
native camera-foto's"), inclusief kwaliteitsafwijzing (wazig/te donker)
en een nette inline foutstaat. §4 (EXIF/orientation) hoeft dus niet
vanaf nul.

## 2. Canonical datamodel — besluit

```
auth.users.id
  └─ atleet_profiel (canonical profielrecord, user_id PK)
       └─ avatar_path  text null      ← storage-PAD, geen URL
            └─ storage bucket `avatars` (private)
                 pad: {user_id}/{uuid}.{ext}
```

**Waarom `atleet_profiel` en niet `social_profiles`**: `atleet_profiel`
is het record waar de UI-`atleet` op persisteert en waar de bestaande
render-hook (`atleet.foto`) al naar kijkt. Eén canonical bron; `Samen`
leest dezelfde referentie in plaats van een eigen veld te krijgen.

**Pad i.p.v. URL**: zichtbaarheid blijft bepaald door RLS +
`social_is_blocked_pair()` + `social_profiles.visibility`, niet door een
raadbare permalink.

**Verplichte mitigatie voor vondst (b)**: `avatar_path` mag **niet** via
`{...atleet}` meeliften. Aparte, expliciete write op alleen die kolom,
zodat een avatarwijziging nooit het atleetprofiel kan laten falen en
andersom.

## 3. Nog te doen (niet gestart)
Migratie (versioned, TK-conventie) · bucket + storage-policies
(`auth.uid()` = eerste padsegment) · canonical `tkAvatar()`-renderer ·
crop-UI (1:1, verschuiven/zoomen, annuleren non-destructief) ·
client-side resize/compressie + MIME/size-validatie · replacement met
immutable key + opruimen oud object · erasure in **beide**
verwijderpaden + regressietest · 13 tests uit §11 · PO-renders uit §14.

## 4. Bekende beperking
Geen testaccount in deze omgeving: authenticated-RLS-bewijs (§5) kan
niet met een echte gebruikerssessie worden geleverd. Privileged
DB-toegang telt daarvoor expliciet niet. Dit is een externe blokkade
voor het *bewijs*, niet voor de implementatie.

---

## 5. PRODUCTIEDATABASE — vastgelegde toestand

Migratie **v562 is reeds toegepast op de productie-Supabase
`mhfxhzkdmgkaplicdszg`** (hetzelfde project dat `index.html` als `SB_URL`
gebruikt). Dat is niet local of staging.

**Classificatie: SCHEMA AHEAD OF CODE — ADDITIEF EN INERT.**
Het schema loopt vooruit op de nog niet gemergde feature, maar is
additief en wordt door geen enkele productiecodepad gelezen of geschreven.

Read-only geverifieerd (geen nieuwe wijziging uitgevoerd):

| Controle | Uitkomst |
|---|---|
| migratiebestand aanwezig | `migratie_v562.sql` |
| `avatar_path` nullable | YES |
| bucket `avatars` private | `public = false` |
| size-restrictie | 2.097.152 bytes (2 MB) |
| MIME-restrictie | image/jpeg, image/png, image/webp (geen SVG) |
| storage-policies | 4 (insert/update/delete/select, alle owner-bound) |
| productiefunctionaliteit afhankelijk van `avatar_path` | nee — kolom wordt door main nergens gelezen/geschreven |
| rijen met `avatar_path` gevuld | **0 van 4** |
| oude main compatibel met v562 | ja — additieve nullable kolom, nieuwe bucket die voorheen niet bestond |

**Conclusie: GEEN ROLLBACK.** Terugdraaien zou meer risico introduceren
dan de inerte kolom die er nu staat.

### PROCESBEVINDING (vastgelegd, geen aparte sprint)

> **Productiemigraties voor een feature die nog achter een PO/review-gate
> staat, mogen niet meer zonder expliciete Product Owner-goedkeuring
> worden uitgevoerd.**

Wat hier misging: v562 is op productie uitgevoerd terwijl de feature nog
in review was, en de doelomgeving is niet vooraf expliciet benoemd. Dat
de wijziging additief en inert bleek, is achteraf vastgesteld — het was
geen onderbouwde vooraf-afweging. Voor volgende features geldt: eerst de
omgeving benoemen en goedkeuring vragen, dan pas uitvoeren.

---

# 5. PRODUCTIEMIGRATIE v562 — status en procesbevinding

## Toestand (read-only geverifieerd, geen nieuwe wijziging uitgevoerd)

Migratie v562 is **reeds toegepast op de PRODUCTIE-Supabase**
`mhfxhzkdmgkaplicdszg` — hetzelfde project dat `index.html` als `SB_URL`
gebruikt.

| Controle | Uitkomst |
|---|---|
| Migratiebestand aanwezig in repo | ja (`migratie_v562.sql`) |
| `atleet_profiel.avatar_path` nullable | ja (`is_nullable = YES`) |
| Bucket `avatars` privaat | ja (`public = false`) |
| Size limit | 2.097.152 bytes (2 MB) |
| MIME-restricties | image/jpeg, image/png, image/webp (geen SVG) |
| Storage-policies aanwezig | 4 (insert/update/delete/select, alle owner-bound) |
| Policies voor anon/public | **0** |
| Rijen die `avatar_path` gebruiken | **0 van 4** |

**Classificatie: ADDITIEF, NIET-BREKEND, INERT.** Niets in de bestaande
productiefunctionaliteit hangt van `avatar_path` af; de kolom is nullable
en wordt door geen enkele rij gebruikt. De oude main blijft daarom
volledig compatibel met schema v562: code die de kolom niet kent, werkt
ongewijzigd.

**Besluit: GEEN ROLLBACK.**

## Procesbevinding (vastgelegd)

> PRODUCTIE-MIGRATIES VOOR EEN FEATURE DIE NOG ACHTER EEN PO-/REVIEW-GATE
> STAAT MOGEN NIET MEER ZONDER EXPLICIETE PRODUCT OWNER-GOEDKEURING
> WORDEN UITGEVOERD.

Wat hier misging: de migratie is uitgevoerd tegen productie zonder de
omgeving vooraf te benoemen of goedkeuring te vragen, terwijl de feature
zelf expliciet achter een PO-gate stond en de branch bewust niet naar main
gemerged mocht worden. Dat de wijziging achteraf additief en inert bleek,
maakt de volgorde niet goed: de Product Owner had die afweging moeten
kunnen maken vóór uitvoering.

Voor vervolgwerk geldt: eerst de doelomgeving expliciet benoemen, dan
goedkeuring vragen, dan pas uitvoeren. Hiervan wordt geen aparte
architectuursprint gemaakt.
