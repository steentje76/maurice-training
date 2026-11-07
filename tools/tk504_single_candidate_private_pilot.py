#!/usr/bin/env python3
"""TK504 — generate and serve ONE local, unpublished Movekit preview.

Only 127.0.0.1; never deploy or include licensed media in Git.
Uses the REAL current TK index.html, central ExerciseCatalogService and
ExerciseAssetProvider. Does not modify the repository or Supabase.
"""
import argparse
import hashlib
import html as htmllib
import json
import re
import sys
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

PILOT_ID = "TK-000227"
PILOT_SLUG = "90-90-hip-switches"
PILOT_STATUS = "PRIVATE_PILOT_NO_CONTENT_APPROVAL_NO_LOGGING"


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def verify_file(path, info):
    require(path.is_file() and not path.is_symlink(), "missing or unsafe private file")
    require(path.stat().st_size == info["bytes"], "size mismatch")
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    require(digest.hexdigest() == info["sha256"], "private media checksum mismatch")


def after_json(source, prefix, js_injection):
    start = source.find(prefix)
    require(start >= 0 and source.count(prefix) == 1, "unique canonical data anchor missing")
    begin = start + len(prefix)
    _, offset = json.JSONDecoder().raw_decode(source[begin:])
    end = begin + offset
    require(source[end:].lstrip().startswith(";"), "canonical JS literal delimiter missing")
    return source[:end] + ";\n" + js_injection + "\n" + source[end:].lstrip()[1:]


def parse_record(args):
    stage = json.loads(args.stage.read_text(encoding="utf-8-sig"))
    require(stage.get("_status") and stage.get("_approved_for_import") in (False, None),
            "stage must be an explicitly unapproved private draft")
    candidates = [x for x in stage["catalog"] if x.get("catalog_id") == PILOT_ID]
    require(len(candidates) == 1, "pilot candidate must occur exactly once")
    row = candidates[0]
    require(row["source"]["provider"] == "movekit" and
            row["source"]["provider_id"] == PILOT_SLUG, "source identity mismatch")
    require(row["_review"]["status"] == "NOT_PUBLISHED" and
            row["_review"]["confirmed_by_authenticated_reviewer"] is False,
            "candidate must remain unpublished and unapproved")

    names = json.loads(args.golden.read_text(encoding="utf-8"))
    matches = [x for x in names["items"] if x["catalog_id"] == PILOT_ID]
    require(len(matches) == 1 and matches[0]["provider_id"] == PILOT_SLUG,
            "golden source identity mismatch")
    video_meta = matches[0]["video"]

    posters = json.loads(args.poster_index.read_text(encoding="utf-8"))
    matches = [x for x in posters["items"] if x["catalog_id"] == PILOT_ID]
    require(len(matches) == 1 and matches[0]["provider_id"] == PILOT_SLUG,
            "optimized poster identity mismatch")
    poster_meta = matches[0]

    with zipfile.ZipFile(args.translations) as archive:
        tr = json.loads(archive.read("TK504-NL-CANONICAL-OVERLAY-582-20261105.json"))
    candidates = [x for x in tr["items"] if x["catalog_id"] == PILOT_ID]
    require(len(candidates) == 1 and candidates[0]["group"] == "UNRELEASED_CANDIDATE",
            "unreleased translation identity missing")
    require(candidates[0]["translation_status"] ==
            "DRAFT_NOT_HUMAN_REVIEWED_NOT_PUBLISHED", "translation must be unapproved")
    dutch = candidates[0]["translations"]

    video_file = args.videos_dir / (PILOT_SLUG + ".mp4")
    poster_file = args.posters_dir / (PILOT_SLUG + ".webp")
    verify_file(video_file, video_meta)
    verify_file(poster_file, poster_meta)

    # AI-proposed taxonomy is shown in the pilot only, NOT published as fact.
    clone = json.loads(json.dumps(row))
    clone["identity"]["nl"] = dutch["name_nl"]
    clone["identity"]["category"] = "mobility"
    clone["identity"]["family"] = "mobility"
    clone["identity"]["pattern"] = "mobility"
    clone["identity"]["type"] = "mobility"
    clone["identity"]["goals"] = ["mobility"]
    clone["identity"]["primary"] = ["Glutes"]
    clone["identity"]["equipment"] = ["bodyweight"]
    clone["_review"]["integration_status"] = PILOT_STATUS
    clone["_review"]["classification_authority"] = "AI_PROPOSAL_NOT_APPROVED"
    return clone, dutch, video_file, poster_file, video_meta, poster_meta


def injection(html, row, translations, port):
    origin = "http://127.0.0.1:" + str(port)
    require("const TK504_PRIVATE_MEDIA_RELEASE = false;" in html,
            "do not use pilot with activated private production release")
    require("const TK504_PRIVATE_MEDIA_CUTOVER" not in html,
            "only the JS app index is used (no SW alterations)")
    # Nothing about the 356 is written to index.html in Git; this HTML
    # snapshot exists only in the private output directory.
    html = html.replace("var ExerciseAssetProvider=(function(){",
                        "var MEDIA_ORIGIN_OVERRIDE=" + json.dumps(origin) +
                        ";\nvar ExerciseAssetProvider=(function(){", 1)
    manifest = {
        "catalog_id": PILOT_ID, "slug": PILOT_SLUG, "poster": PILOT_SLUG,
        "thumbnail": PILOT_SLUG,
        "videos": [{"provider": "movekit", "provider_asset_id": PILOT_SLUG,
                    "version": "v2-private-local-preview",
                    "file": "videos/" + PILOT_SLUG + ".mp4",
                    "mime": "video/mp4"}]
    }
    html = after_json(html, "var VIDEO_MANIFEST=", "VIDEO_MANIFEST[" +
                      json.dumps(PILOT_ID) + "]=" +
                      json.dumps(manifest, separators=(",", ":")) + ";\n" +
                      "if(typeof EXERCISE_POSTERS!=='undefined')EXERCISE_POSTERS[" +
                      json.dumps(PILOT_SLUG) + "]=" +
                      json.dumps(origin+"/pilot-poster/"+PILOT_SLUG+".webp") + ";")
    html = after_json(html, "const EX_CATALOG = ", "EX_CATALOG.catalog.push(" +
                      json.dumps(row, ensure_ascii=False, separators=(",", ":")) +
                      ");EX_CATALOG.count=EX_CATALOG.catalog.length;")
    # The UI is intentionally a local read-only modal over the real app.
    # It uses the genuine current ECS indexes/provider rather than a shadow catalog.
    details = {
        "name": translations["name_nl"],
        "description": translations["shortDescription_nl"],
        "instructions": [x.strip() for x in translations["instructions_nl"].split(";") if x.strip()],
        "mistakes": [x.strip() for x in translations["commonMistakes_nl"].split(";") if x.strip()],
    }
    bootstrap = r"""<style id="tk504-pilot-css">
#tk504-pilot-panel{position:fixed;inset:0;z-index:2147483646;background:#0c1526;overflow-y:auto;color:#eaf3ff;font:15px/1.45 system-ui,Arial,sans-serif}
#tk504-pilot-panel *{box-sizing:border-box} #tk504-pilot-panel .frame{max-width:1040px;margin:24px auto;padding:24px;background:#15243a;border:1px solid #2d425f;border-radius:22px;box-shadow:0 20px 50px #0007}
#tk504-pilot-panel .two{display:grid;grid-template-columns:1.2fr .9fr;gap:22px}@media(max-width:750px){#tk504-pilot-panel .two{grid-template-columns:1fr}}
#tk504-pilot-panel h1{font-size:28px;margin:3px 0 10px}#tk504-pilot-panel p{color:#bbccda}
#tk504-pilot-panel .kicker{color:#9fcaef;font-weight:600;letter-spacing:1px;font-size:12px;text-transform:uppercase}
#tk504-pilot-panel video{display:block;background:#08111e;width:100%;border-radius:13px;max-height:520px}
#tk504-pilot-panel img{display:block;width:100%;border-radius:13px;margin-top:12px}
#tk504-pilot-panel .block{background:#0e1c2f;border:1px solid #233957;border-radius:12px;padding:15px;margin-top:14px}
#tk504-pilot-panel .tag{display:inline-block;padding:4px 9px;background:#243955;border-radius:7px;margin-right:6px;font-size:12px}
#tk504-pilot-panel ol,#tk504-pilot-panel ul{padding-left:20px}#tk504-pilot-panel li{margin:6px 0}
#tk504-pilot-panel code{font-size:12px;white-space:pre-wrap;word-break:break-word;color:#abcfff}
#tk504-pilot-panel .warn{border-left:3px solid #e5ac4d;padding-left:12px;color:#edc98f}
</style>
<script>
(function(){
"use strict";
const config=__CONFIG__;
const expectedId="TK-000227";
function node(tag,text,cls){
 const n=document.createElement(tag);if(text!=null)n.textContent=String(text);
 if(cls)n.className=cls;return n;
}
function show(){
 const ecs=window.ExerciseCatalogService;
 const provider=window.ExerciseAssetProvider;
 const row=ecs&&ecs.byId(expectedId);
 const matches=ecs?ecs.search(config.name,{},"relevance"):[];
 const source=provider&&provider.resolve(expectedId,"video");
 const poster=provider&&provider.poster(expectedId);
 const ok=!!row&&row.catalog_id===expectedId
 &&row.source&&row.source.provider_id===config.slug
 &&row._review&&row._review.status==="NOT_PUBLISHED"
 &&provider&&provider.hasVideo(expectedId)
 &&typeof source==="string"&&source===config.origin+"/videos/"+config.slug+".mp4"
 &&typeof poster==="string"&&poster===config.origin+"/pilot-poster/"+config.slug+".webp"
 &&matches.some(x=>x.catalog_id===expectedId);
 const report={ok,canonical_id:expectedId,registered_via:"ExerciseCatalogService",
   poster_via:"ExerciseAssetProvider",video_via:"ExerciseAssetProvider",
   name_search:matches.some(x=>x.catalog_id===expectedId),
   catalog_count:ecs?ecs.count():-1,unreleased:true,
   workout_logging:"disabled_in_private_pilot"};
 const panel=node("section",null);
 panel.id="tk504-pilot-panel";
 const frame=node("div",null,"frame");panel.appendChild(frame);
 frame.appendChild(node("div","Trainingskompas · gecontroleerde lokale mediaproef","kicker"));
 frame.appendChild(node("h1",config.name));
 frame.appendChild(node("div","TK-000227 · Movekit · heupmobiliteit · lichaamsgewicht · beginner","tag"));
 frame.appendChild(node("p","Dit is een afgeschermde preview van één niet-goedgekeurde oefening. De trainingshistorie blijft ongewijzigd."));
 const cols=node("div",null,"two");frame.appendChild(cols);
 const left=node("div");cols.appendChild(left);
 const vid=node("video");vid.id="tk504-pilot-video";vid.controls=true;vid.playsInline=true;
 vid.preload="metadata";vid.muted=true;vid.src=ok?source:"";
 if(ok)vid.poster=poster;left.appendChild(vid);
 vid.setAttribute("controlsList","nodownload");
 left.appendChild(node("p","Movekit-video met de gekoppelde anatomische poster als startbeeld."));
 const right=node("div");cols.appendChild(right);
 const intro=node("div",null,"block");right.appendChild(intro);
 intro.appendChild(node("h2","Wat laat deze oefening zien?"));
 intro.appendChild(node("p",config.description));
 const steps=node("div",null,"block");right.appendChild(steps);
 steps.appendChild(node("h2","Uitvoering — conceptvertaling"));
 const stepsList=node("ol");steps.appendChild(stepsList);
 for(const s of config.instructions)stepsList.appendChild(node("li",s.replace(/^\d+[.)]\s*/,"")));
 const mistakes=node("div",null,"block");right.appendChild(mistakes);
 mistakes.appendChild(node("h2","Let op"));
 const list=node("ul");mistakes.appendChild(list);
 for(const s of config.mistakes)list.appendChild(node("li",s));
 const notice=node("div",null,"block warn");frame.appendChild(notice);
 notice.appendChild(node("strong",ok?"Technisch bruikbaar in de bestaande engine":"Technische koppeling ongeldig"));
 notice.appendChild(node("p","De Nederlandse tekst en categorie zijn concepten. Er is geen menselijke inhoudelijke goedkeuring, geen release, geen Supabase-signed stream en geen trainingslogging."));
 const code=node("code","PILOT_RESULT="+JSON.stringify(report));
 frame.appendChild(code);
 document.body.appendChild(panel);
 // Optional automated read-only browser media test; never used by normal users.
 if(window.location.search==="?tk504qa=1"&&ok){
   const qa=node("code","PILOT_PLAYBACK=PENDING");qa.id="tk504-pilot-playback";frame.appendChild(qa);
   let finished=false;
   function done(result){
     if(finished)return;finished=true;
     qa.textContent="PILOT_PLAYBACK="+JSON.stringify(result);
     vid.pause();
   }
   vid.addEventListener("loadedmetadata",()=>{
     const duration=vid.duration;
     if(!Number.isFinite(duration)||duration<=0)return done({ok:false,error:"duration"});
     vid.currentTime=Math.min(duration*0.56,Math.max(0,duration-0.2));
   },{once:true});
   vid.addEventListener("seeked",()=>{
     const at=vid.currentTime;
     const prom=vid.play();
     if(prom&&prom.then)prom.then(()=>done({
       ok:at>1&&vid.readyState>=2,seek_seconds:at,
       duration:vid.duration,width:vid.videoWidth,height:vid.videoHeight,
       ready_state:vid.readyState,played:true
     })).catch(e=>done({ok:false,error:e.name}));
   },{once:true});
   vid.addEventListener("error",()=>done({ok:false,error:"media_error"}),{once:true});
   if(vid.readyState>=1){
     vid.currentTime=Math.min(vid.duration*0.56,Math.max(0,vid.duration-0.2));
   } else {
     vid.load();
   }
   window.setTimeout(()=>{
     if(finished)return;
     if(vid.readyState>=1){
       vid.currentTime=Math.min(vid.duration*0.56,Math.max(0,vid.duration-0.2));
     } else done({ok:false,error:"metadata_timeout",network_state:vid.networkState});
   },3000);
 }
 // No controls to dismiss this full-screen pilot and enter the live training app.
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",show,{once:true});
else show();
})();
</script>"""
    bootstrap = bootstrap.replace("__CONFIG__", json.dumps({
        "name": details["name"], "description": details["description"],
        "instructions": details["instructions"], "mistakes": details["mistakes"],
        "slug": PILOT_SLUG, "origin": origin}, ensure_ascii=False))
    require(html.count("</body>") == 1, "unique html closing tag")
    return html.replace("</body>", bootstrap + "\n</body>")


def launch(args):
    require(args.port > 1024 and args.port < 65535, "invalid port")
    require(args.index.is_file(), "missing actual TK index.html")
    source = args.index.read_text(encoding="utf-8")
    row, translations, video, poster, _, _ = parse_record(args)
    output = args.private_out.resolve()
    require(".tk-private-review" in output.parts,
            "generated content must remain under private review folder")
    output.mkdir(parents=True, exist_ok=True)
    result = injection(source, row, translations, args.port)
    preview = output / "index.html"
    preview.write_text(result, encoding="utf-8")
    require(args.check_only or args.serve, "select --serve or --check-only")
    # Public repo has no generated content, and production release remains false.
    print(json.dumps({"status": PILOT_STATUS, "catalog_id": PILOT_ID,
                      "origin": "http://127.0.0.1:" + str(args.port),
                      "scope": "single candidate in actual TK engine",
                      "video_sha256_verified": True,
                      "poster_sha256_verified": True,
                      "private_preview_only": True,
                      "public_writes": 0}, ensure_ascii=False), flush=True)
    if args.check_only:
        return

    main_dir = args.index.parent.resolve()
    allowed = {"/":preview, "/index.html":preview}
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *vals):
            # No auth headers, query strings, source paths or tokens emitted.
            pass
        def do_HEAD(self):
            self.handle_request(True)
        def do_GET(self):
            self.handle_request(False)
        def handle_request(self, head):
            raw = urlsplit(self.path).path
            uri = unquote(raw)
            if not uri.startswith("/") or ".." in uri or "\\" in uri:
                return self.send_error(404)
            if uri in ("/videos/" + PILOT_SLUG + ".mp4",
                       "/pilot-poster/" + PILOT_SLUG + ".webp"):
                target = video if uri.startswith("/videos/") else poster
                mime = "video/mp4" if uri.startswith("/videos/") else "image/webp"
                return self.transfer(target, mime, head, ranges=uri.startswith("/videos/"))
            if uri == "/sw.js":
                return self.send_error(404)
            if uri in allowed:
                return self.transfer(allowed[uri], "text/html; charset=utf-8", head)
            # Canonical first-party code/manifest assets only; no directory listing.
            if (uri.startswith("/core/") or
                uri in ("/manifest.json","/exercise-catalog.json",
                        "/icon-192.png","/icon-512.png","/logo-wordmark.png",
                        "/exercise-intelligence_6.json","/favicon.ico")):
                target=(main_dir / uri.lstrip("/")).resolve()
                if not target.is_relative_to(main_dir) or not target.is_file():
                    return self.send_error(404)
                mime="application/javascript" if uri.endswith(".js") else (
                    "application/json" if uri.endswith(".json") else "image/png")
                return self.transfer(target,mime,head)
            return self.send_error(404)
        def transfer(self, target, mime, head, ranges=False):
            size=target.stat().st_size
            start,end=0,size-1
            rg=self.headers.get("Range") if ranges else None
            if rg:
                m=re.fullmatch(r"bytes=(\d+)-(\d*)",rg.strip())
                if not m:return self.send_error(416)
                start=int(m.group(1))
                if m.group(2):end=min(int(m.group(2)),size-1)
                if start>=size or start>end:
                    self.send_response(416)
                    self.send_header("Content-Range","bytes */"+str(size))
                    self.end_headers()
                    return
            self.send_response(206 if rg else 200)
            self.send_header("Content-Type",mime)
            self.send_header("Content-Length",str(end-start+1))
            self.send_header("Cache-Control","no-store, private")
            self.send_header("X-Content-Type-Options","nosniff")
            self.send_header("Referrer-Policy","no-referrer")
            self.send_header("Accept-Ranges","bytes" if ranges else "none")
            if rg:self.send_header("Content-Range",f"bytes {start}-{end}/{size}")
            self.end_headers()
            if head:return
            with target.open("rb") as stream:
                stream.seek(start)
                remaining=end-start+1
                while remaining>0:
                    data=stream.read(min(64*1024,remaining))
                    if not data:break
                    try:self.wfile.write(data)
                    except (ConnectionAbortedError,BrokenPipeError,ConnectionResetError):break
                    remaining-=len(data)
    server=ThreadingHTTPServer(("127.0.0.1",args.port),Handler)
    print("TK504_PRIVATE_PILOT_READY http://127.0.0.1:"+str(args.port),flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()


def arguments(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--index",required=True,type=Path)
    p.add_argument("--stage",required=True,type=Path)
    p.add_argument("--golden",required=True,type=Path)
    p.add_argument("--poster-index",required=True,type=Path)
    p.add_argument("--translations",required=True,type=Path)
    p.add_argument("--videos-dir",required=True,type=Path)
    p.add_argument("--posters-dir",required=True,type=Path)
    p.add_argument("--private-out",required=True,type=Path)
    p.add_argument("--port",type=int,default=18777)
    modes=p.add_mutually_exclusive_group(required=True)
    modes.add_argument("--serve",action="store_true")
    modes.add_argument("--check-only",action="store_true")
    return p.parse_args(argv)


if __name__=="__main__":
    try:launch(arguments())
    except Exception as e:
        print("TK504_PRIVATE_PILOT_BLOCKED "+str(e),file=sys.stderr)
        raise SystemExit(1)
