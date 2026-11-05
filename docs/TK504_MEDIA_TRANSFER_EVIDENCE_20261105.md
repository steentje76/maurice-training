# TK504 — 582 video's + 582 posters: source-to-storage evidence

Datum: 2026-11-05. Scope: READ-ONLY bewijs, geen productieactivering en geen nieuwe oefeningpublicatie.

## Uitvoering

- Supplier Golden V2 local MP4: **582 / 582** bestanden, in totaal **2.047.785.201 bytes**. SHA-256 en byteaantal per bestand matchen exact met de in de repository bestaande Golden V2-inventaris.
- Supplier optimized WebP local poster: **582 / 582** bestanden, in totaal **9.634.714 bytes**. SHA-256 en byteaantal per bestand matchen exact met de bestaande poster-digest-inventaris.
- In Supabase Storage zijn per bucket 582 objecten aanwezig. Het gehele in naam gesorteerde register `path|bytes|eTag` is server-side geaggregeerd met PostgreSQL `md5(string_agg(...))`.
- Video remote ETag register MD5: `f47e1c875e0703325fa845e48f4c8ce2`. Lokaal berekend uit alle 582 originele videobytes: **identiek**.
- Poster remote ETag register MD5: `410c96f8a864a099ef0b15c3c418ba6f`. Lokaal berekend uit alle 582 geoptimaliseerde posterbytes: **identiek**.
- De Supabase ETag werd eerst op een echte bronfile onafhankelijk als MD5 bevestigd. Een match van alle 582 MD5/ETag + objectgrootten is sterk overdrachtsevidence, maar **geen volledige SHA-256 van de serverbytes**. Deze nuance blijft bij de vrijgave.
- Geen licentiebronfiles, bronmetadata, lokale filesystemlocaties, secrets of private video-URL's worden in Git opgeslagen. Alleen generieke verificatiesoftware en deze geaggregeerde bewijssamenvatting.

## Reproduceerbare verificatie

- Script: `tools/tk504_source_remote_etag_audit.py` met parameters `--videos-dir`, `--posters-dir`, `--inventory`, `--poster-inventory`, `--remote-video-digest`, `--remote-poster-digest`. Alleen tegen geautoriseerde PRIVATE lokale bronbestanden uitvoeren.
- Negatieve en positieve synthetische unittest suite: `python -B -m unittest tools.test_movekit_tk504_source_remote_etag_audit -v`.
- Gebruik voor remote manifest read-only SQL (in PostgreSQL-Supabase):

```sql
select bucket_id,count(*) as n,
  md5(string_agg(
    name || '|' || (metadata->>'size') || '|' || trim(both '"' from (metadata->>'eTag')),
    E'\n' order by name collate "C"
  )) as remote_etag_manifest_md5
from storage.objects
where bucket_id in ('exercise-media','exercise-posters')
group by bucket_id order by bucket_id;
```

## Licentie- en veiligheidsgrens

- Officiële MoveKit License Agreement §3: in-app tonen/streamen toegestaan; ruwe bestanden of publieke ruwe URL's niet aanbieden. De MoveKit-site beschrijft expliciet self-hosting, eigen CDN en signed URLs aan ingelogde gebruikers: https://movekit.com/license en https://movekit.com/about.
- Controleer afzonderlijk of de aankoop/licentiehouder overeenkomt met de exploitant van Trainingskompas en welke voorwaarden bij die specifieke aankoop gelden.
- De huidige oude publieke Netlify-MP4 paden blijven een compliance-risico. **Niet zomaar verwijderen** voordat de geautoriseerde privé-afspeelroute aantoonbaar werkt in echte browsers en Android. De gescheiden stopzetting van die paden is onderdeel van de gecontroleerde cutover.
- De 226 eerder gepubliceerde catalogusidentiteiten mogen niet autonoom worden aangevuld met de 356 niet-goedgekeurde kandidaten.
- Dit bewijs geeft **geen** serverentitlement, human content approval of toestemming voor de productie-vrijgaveschakelaar.

## Spelerhardenings

- In `tk504PlayPrivateVideo()` werd bij een verlopen URL een `loadedmetadata` listener na `video.load()` geplaatst; op snelle WebViews kon metadata verloren gaan. De handler wordt nu vóór het opnieuw laden geregistreerd.
- Een accountwissel tijdens een openstaande mediasigning verwijdert nu de laadmelding in plaats van eindeloos laden.
- `core/tk504ProtectedPlayerFlow.test.js` voert end-to-end synthetische DOM-tests uit op signed playback, refresh en seek, 2e fout fail-closed, afwijzing, logout, release OFF en accountwissel. Geen real-device claim.

## Resultaat

Integriteitsoordeel: **PASS voor alle 1.164 lokale SHA-256-bewijzen en corresponderende Storage ETag-registers**. Productie-release: **BLOCKED** tot beoordeelde grants/uitrol, echte user en Android/Range/caching-tests en aparte 356-review.

## Lokale browsermedia-smoke

- Vier gekozen lokale MP4-videobestanden uit de licentiebron zijn via een geïsoleerde Microsoft Edge (Chromium) headless-browser geladen en afgespeeld. Het ging om zowel een kandidaat uit de 356 als reeds gepubliceerde oefeningen; geen bestand of direct pad is publiek gemaakt.
- **4/4** retourneerden `loadedmetadata`, `readyState=4` en succesvolle `video.play()`-promises. Alle vier tonen 1936×1072 videopixels, met looptijden tussen circa 5,3 en 9,6 seconden.
- Het virtuele headless testklokje registreerde nog `currentTime=0`; daarom is realtime framesnelheid, doorspoelen en volledig afspelen van de clip **niet** aangetoond. Voor Android/WebView is nog geen fysieke afspeeltest uitgevoerd.
- Test lokaal met een tijdelijke privé HTML-pagina die nooit naar Git of Netlify is gekopieerd. Dit bewijst lokale decodeerbaarheid van vier voorbeelden, niet de server-signed streaming-implementatie.

## Beveiligde cache-cutover (code voorbereid, release UIT)

- De bestaande service worker bewaart bewust de offline cache `tk-videos-v1`. Bij latere beveiligde media-activering zou dit ongeautoriseerd blijvende kopieën van de oude openbare MP4-bestanden kunnen opleveren.
- Daarom heeft `sw.js` de compile-time codegate `TK504_PRIVATE_MEDIA_CUTOVER = false`, die exact synchroon moet blijven met `TK504_PRIVATE_MEDIA_RELEASE = false` in `index.html`. `core/tk504PrivateCutoverCache.test.js` is een release-guard die een mismatch blokkeert.
- In de gesimuleerde private-modus verwijdert de activate-handler de oude ongecodeerde videobestanden uit Cache Storage; verzoeken naar de oude openbare `/videos/*.mp4` route worden met 403 afgebroken in de service worker. De beveiligde Supabase signed-URL's worden nooit aan de cache onderschept.
- De daadwerkelijke openbare Netlify-bestanden moeten **apart** verdwijnen nadat beveiligde streaming en Android-acceptatie bewezen zijn; de service worker alleen beschermt niet tegen directe CDN-links.
- De oude offline videofunctie is na beveiligde cutover bewust niet beschikbaar totdat het versleutelde native offline-vault-spoor afzonderlijk veilig is afgerond. Nooit stiekem een onversleutelde cache behouden.
- Met beide vlaggen op `false` blijft het huidige V1-afspeel- en offlinegedrag ongewijzigd.
