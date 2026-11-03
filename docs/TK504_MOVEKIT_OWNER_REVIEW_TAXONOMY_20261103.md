# TK504 — MoveKit V2 eigenaarfeedback en brongerichte terminologie (3 november 2026)

## Verificatie uitgevoerd — PRIVÉ, GEEN RELEASE

- Eigenaarfeedback uit de lokale privé-upload: **26/26** unieke bestaande TK-ID's, bronrecord-SHA's en provider-ID's geldig. De aangeboden result-hash en leverancierbestand-SHA zijn exact geverifieerd.
- Keuzes: **8** `apart`, **12** `meta`, **6** `variant`. Dit zijn **eigenaarssuggesties**; geen formeel geauthenticeerde menselijke goedkeuring van een database-import, classificatie of licentie.
- Privégeverifieerd rapport: `C:\Movikit\.tk-private-review\TK504-EIGENAAR-REVIEW-GECONTROLEERD-20261103.json`. Niet in Git opnemen.
- De variantparen TK-000387/TK-000559 en TK-000575/TK-000576 hebben verschillende video-hashes. TK-000428/TK-000429 hebben dezelfde video-hash. Verwijder niets automatisch; behoud beide identiteiten en bronbestanden tot expliciet inhoudelijk besluit.
- De eigenaar verduidelijkte TK-000381 Jump Rope met 'Springtouw vereist'. Dit is een **separaat correctieverzoek**, geen wijziging aan de originele leveranciermetadata.
- De 26 keuzes staan niet gelijk aan 26 geldige Trainingkompas-taxonomieën. `meta` kan extra, concrete bron-/uitvoeringsbeoordeling vereisen.

## Technische 85 — source-first term coverage

De andere 85 AI-aangehouden oefeningen hebben uitsluitend ontbrekende bronterminologie als blokkade. Daarin zitten 21 veld/term-combinaties, terug te brengen tot 5 spierlabels (Forearms, Lower Back, Neck, Tibialis, Adductors) en 13 apparatuurtermen. De nieuwe `tools/movekit-v2-taxonomy-map.json` bevat **18 expliciete, namenruimte-gebonden termen**.

De preflight `tools/movekit-v2-taxonomy-preflight.py` vereist de exact op SHA-256 vastgezette leverancier, catalogus en inventaris, plus de AI-ledger, en verifieert per van de 85 oefeningen de exacte brontekst/bronrecord-digest. Het resultaat `85 covered / 26 special` staat alleen als privévoorstel. Bronspieren en apparatuur blijven onveranderd. Forearms wordt niet automatisch Grip; Lower Back niet automatisch Rug. Geen AI-claim of wetenschappelijke belastingberekening.

Uitvoeren op de ontwikkel-pc (privé output, GEEN live activatie):

```powershell
python tools/movekit-v2-taxonomy-preflight.py --private "C:\Movikit\.tk-private-review" --output "C:\Movikit\.tk-private-review\TK504-V2-TAXONOMY-PREFLIGHT-85-20261103.json"
python -m unittest discover -s tools -p "test_movekit_v2_taxonomy_preflight.py" -v
```

## Vervolgbouw: 582-resultaatprojectie en eigenaarbewijs (zonder release)

- `tools/movekit-v2-source-metadata-proof.py` verifieert 12 eigenaar-aangemerkte metadata-casus uitsluitend tegen expliciete termen in de lokale leveranciersbeschrijving/instructies en de brondigest. De output blijft privé, met `approved=false` en zonder leverancierrecords te overschrijven.
- `tools/movekit-v2-private-reviewed-stage.py` combineert alle 356 nieuw voorgestelde identiteitrecords: 245 AI-classificatievoorstellen, 85 exacte terminologievoorstellen en 26 eigenaarfeedbackgevallen.
- De compiler controleert niet alleen per-record bron-SHA en provider-ID, maar ook `movekit-review-ledger.py`-schema, het originele eigenaarbestand versus de gevalideerde reconciliation en de drie variantparen. Videoidentiteit wordt via de Golden manifest-hashes gecontroleerd.
- **Alle 582 catalogusidentiteiten behouden**; voor de 356 voorgestelde oefeningen blijft `pending_review`, `assets=[]`, 0 importgoedkeuring, 0 entitlement-writes, 0 productieactivatie. De 226 bestaande objecten blijven byte-equivalent qua JSON-data.
- Gecontroleerde privéprojectie: `C:\Movikit\.tk-private-review\TK504-V2-PRIVATE-REVIEWED-STAGE-582-FINAL-20261103.json`. Deze privéprojectie (met leverancierbeschrijvingen) **nooit** aan Git toevoegen.
- De vervolgintegratie van JS-bronfacetten gebeurt als een afzonderlijk synthetisch getest contract; er is nog geen ingeschakelde UI/zoekfilter of wetenschappelijke spierbelastingafleiding.

## Releasegates blijven open

- De nieuwe 18 termen moeten nog versioneerbaar worden opgenomen in de uiteindelijke catalogus-/UI-/filter- en spierbelastingcontracten, zonder te vervallen in onnauwkeurige synoniemen.
- Voor 245 AI-classificaties, 85 term-voorstellen en de 26 eigenaarfeedbackregels blijft formele review vereist. Geen stagingrapport is een goedgekeurde dataset.
- Source-bound DB-writer, bevoegdheid, licentie-/offline-rechten, grants, fysieke Android/PM5-test, bestaande herstelissues #577/#582/#584/#579 en gezamenlijke UX blijven voorwaarden.
- **Geen wijziging** aan historische trainingen, persoonsgegevens, productie-Supabase, `main`, actieve Movekit V1-media, Netlify-release of APK.
