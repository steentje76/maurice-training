# TK504 private review: local draft decision collector (2026-11-04)

Status: **local, private, non-binding.** Nothing here approves, releases, publishes or entitles anything.
The 356 pending exercises stay untrainable. App integration remains blocked.

Scope of this change: `tools/movekit-v2-private-library-preview.py` (generator) and
`tools/test_movekit_v2_private_library_preview.py` (synthetic tests). No change to `index.html`, the live
app, DB, storage, catalog, builder or logging. No licensed text, media URL or owner note is in this document.

## What it does

The generated private HTML (same single new file under `<source>/.tk-private-review`, never overwritten)
gains a **Concept-beoordeling (alleen lokaal)** panel:

- Per pending exercise (356 = 245 AI + 85 term + 26 owner) the side panel shows a status select and an
  optional note (max 500 chars). Statuses: `unreviewed` (default), `review-agree-provisionally`,
  `needs-correction`, `exclude-provisionally`.
- The 226 published exercises get no control (enforced in `setDec`, not only hidden in the UI).
- Summary line with counts per status, a filter "Alle conceptstatussen", card badge for non-default status.
- Original owner feedback, `_review` fields and supplier data are never read for writing or modified;
  the draft lives in a separate in-memory `Map`.
- Visible warning in the panel and in every side panel: not authenticated approval, not a release, no entitlement.
- `beforeunload` prompt while there are unexported changes.

### Export (user click only)
`Concept exporteren` builds JSON, wraps it in a `Blob`, and triggers one download via a temporary
`<a download>` (`blob:` URL, revoked afterwards). No network. Refuses (shows `DRAFT_TOO_LARGE`) if the
result would exceed the import limit of 512 KiB (reachable only with ~500 multi-byte chars in most notes).

Schema `tk504-owner-review-draft` v1 (exact key set):
`schema, version, draft_only:true, authenticated:false, formal_approval:false, ready_for_import:false,
stage_sha256, manifest_sha256, exported_at, counts, decisions[356]`;
each decision: `id, slug, review_route, status, note`. No entitlement flags exist in the schema.
Never exported: names, descriptions, terms, proposals, media paths/URLs, owner notes, source text.
(The user's own free-text note is exported verbatim; do not paste licensed text into it.)

### Binding
- `stage_sha256` = SHA-256 of the exact staged JSON bytes read by the generator.
- `manifest_sha256` = SHA-256 of the sorted `id<TAB>slug<TAB>review_route` lines of the 356 pending items.
- Both are computed in Python, embedded in the page, and compared by the importer. The generator also prints
  them (`draft_stage_sha256`, `draft_manifest_sha256`).

### Import (file input, fail closed)
Rejects, leaving the current draft untouched and showing `Import geweigerd (DRAFT_<CODE>)`:
file > 512 KiB (checked before reading), not JSON, non-plain/array top level, any extra or missing key
(incl. `__proto__`), wrong schema/version, flags other than `true/false/false/false`, wrong stage or
manifest digest, bad timestamp, not exactly 356 entries, duplicate/unknown/published id, wrong slug,
wrong route, status outside the 4, note not a string / >500 / control characters, counts that do not match
the decisions. State is replaced only after the whole file validated. Error text is a fixed code, never
file content; all notes are rendered with `textContent` only. A valid import restores choices and shows
"geen goedkeuring of vrijgave".

## Usage
1. Generate a NEW private page (existing CLI, unchanged flags):
   `python tools/movekit-v2-private-library-preview.py --source-directory C:\Movikit --staged-catalog <stage.json> --output <new-name>.html`
2. Open the file locally, review, set statuses/notes.
3. Click **Concept exporteren**; save the file wherever you choose (keep it out of Git).
4. Later: open the page generated from the *same* stage, **Concept importeren**.
   A page from a different/changed stage rejects the file (`DRAFT_STAGE_MISMATCH`).

## Privacy / CSP
CSP unchanged in policy (`default-src 'none'`, no `connect-src`, no `unsafe-*`, no `blob:` source needed for a
download navigation). Script hash is recomputed by the generator from the final script, which now includes the
draft library. No `localStorage`/`sessionStorage`/cookies/IndexedDB, `fetch`, XHR, beacon, service worker,
autoplay, media copying, server endpoint, Supabase or Netlify access. The only widened test rule: exactly one
`download=` and one `Blob`/`createObjectURL` use is allowed.

## Tests (all synthetic; `python -I tools/test_movekit_v2_private_library_preview.py`)
37 tests green (29 existing, security tests kept, 8 new):
- Digests independently recomputed in Python; stage vs. manifest sensitivity (owner-note edit changes only the
  stage digest, slug edit changes both); embedded config has no licensed content.
- CSP hash covers the final script (exactly 2 hashes); static UI contract (warning, 500 max, published guard,
  parse-before-replace order, size guards).
- Pure draft library run in node: export shape, 356 unique ids, routes/slugs, no licensed strings,
  round-trip (compact + pretty), 500-char note, Unicode/newline/tab notes, **60 negative import cases**
  each asserted against its exact error code, no prototype pollution, parse has no side effects.
- Whole embedded script run in node against a small DOM stub: 582 shown / 96 cards, published has no controls,
  pending select + note + summary + filter, export only on click (one download, `application/json`, 356
  entries, flags, no licensed strings), import into a fresh page restores choices, seven failing imports keep
  the draft unchanged and never echo input, oversize file is not even read, worst-case export is blocked.

## Threat model and exact limitations
- **Not authentication.** Anyone with the page and the stage digests can produce a valid-looking file; digests
  bind a file to a stage (stale/foreign detection), they do not prove who wrote it or that it is untampered.
  The flags in the file are constants, not attestations.
- Drafts are not formal approval; owner must later sign in an authenticated release workflow; the publisher
  must verify source, account and entitlement. 356 stay untrainable until then.
- Notes are free text from the reviewer; the tool cannot detect pasted licensed text. Exported files must be
  stored privately and not committed.
- Downloads depend on browser behaviour (file name may be altered; some browsers prompt). Overwrite handling
  of the saved file is the browser's/user's, not the generator's.
- The 512 KiB check uses `File.size` (bytes) on import and UTF-16 length inside the parser; export checks bytes.
- Tested with a Node DOM stub, not a real browser: **no headless-browser run, no real file-picker or
  download-dialog test, no screen-reader/keyboard pass of the new controls yet.** Left for audit.
- Real private data (`C:\Movikit`) was not read or used by this change or its tests.
- No numeric sport-science content was added.

## Onafhankelijke acceptatiecontrole door ChatGPT — 4 november 2026

- De generator is tegen de echte, privé gehouden 582-records review stage uitgevoerd. Baselinevergelijking met de bestaande 226 gepubliceerd-catalogusrecords: **PASS**. Lokale vindbaarheid: **582/582 posters en 582/582 video's**. Nieuw bestand: `TK504-MOVEKIT-BIBLIOTHEEK-582-OWNER-DRAFT-20261104.html` uitsluitend in `C:\Movikit\.tk-private-review`.
- Geïsoleerde **echte Chrome-headless DOM-test: 22/22 PASS**. Getest: 582-records/navigatie, 356 pending, de 226 published zonder conceptcontrols, conceptstatus plus notitie, voortgangsindicator, statusfilter, exportactie met JSON Blob, 356 identiteiten en formele-vrijgaveflags false, geen media- of eigenaar-feedbackvelden in export, ongeldig stage-digest geweigerd zonder stateverlies, correcte herimport en restore.
- De browsertest onderschepte de downloadknop om geen bestand in Downloads te schrijven. Er is dus **geen OS-downloadvenster of handmatige save-dialog** getest. De werkelijke file-picker is via gesimuleerde `File`+`DataTransfer` van dezelfde Chrome DOM gecontroleerd, niet via een menselijk gekozen bestand.
- Alle MoveKit-gerelateerde Python-testbestanden: **114/114 PASS**. De losse tekst `FAILED: PRIVATE_OUTPUT_PATH_REQUIRED` is afkomstig van een bedoelde negatieve CLI-test binnen deze geslaagde suite.
- Geen leveranciersteksten, originele eigenaar-notities of bestanden van de privé-library zijn naar GitHub geüpload. De conceptuitvoer blijft uitdrukkelijk **niet geauthenticeerd en niet geschikt voor import**.

De gebruikersapp blijft ongewijzigd en de 356 nieuwe oefeningen blijven geblokkeerd; na de conceptreview is nog een echte ingelogde beoordelings-/vrijgavestap nodig.
