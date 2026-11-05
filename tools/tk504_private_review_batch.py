#!/usr/bin/env python3
"""MoveKit 25-at-a-time local ECS review import; never a production release.

Read source/vendor draft from private files, SHA-256 verify every MP4+WebP,
append only 25 NOT_PUBLISHED records to a temporary HTML clone of the REAL
Trainingskompas index.html and resolve assets via the REAL ExerciseAssetProvider.

The licensed HTML, translations and media NEVER enter Git or production.
No private storage credentials, no logs or account writes. Loopback-only.
"""
import argparse
import hashlib
import json
import re
import sys
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

try:
    from tk504_single_candidate_private_pilot import after_json, require, verify_file
except ImportError:
    from tools.tk504_single_candidate_private_pilot import after_json, require, verify_file

LIMIT = 25
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
REVIEWED = "TK-000227"


def js(value):
    """Create an inline script-safe JSON literal, not an HTML string."""
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace(
        "<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def batch_records(args):
    require(227 <= args.start <= 582 and args.count == LIMIT
            and args.start + args.count - 1 <= 582,
            "Batch must be exactly 25 unpublished V2 candidates")
    require(args.videos_dir.is_dir() and args.posters_dir.is_dir(),
            "Private media source folders missing")
    stage = json.loads(args.stage.read_text(encoding="utf-8-sig"))
    require(stage.get("_approved_for_import") == 0
            and stage.get("_app_activated") is False, "Live stage must never be used")
    golden = json.loads(args.golden.read_text(encoding="utf-8"))
    posters = json.loads(args.poster_index.read_text(encoding="utf-8"))
    require(len(stage["catalog"]) >= 356 and len(golden["items"]) == 582
            and len(posters["items"]) == 582, "Full 582 inventory required")
    existing = json.loads(args.catalog.read_text(encoding="utf-8"))
    require(existing["count"] == 226 and len(existing["catalog"]) == 226,
            "Production baseline 226 must be preserved")
    existing_ids = {row["catalog_id"] for row in existing["catalog"]}
    existing_slugs = {row["source"]["provider_id"] for row in existing["catalog"]}
    stage_ids = {row["catalog_id"]: row for row in stage["catalog"]}
    video_ids = {row["catalog_id"]: row for row in golden["items"]}
    poster_ids = {row["catalog_id"]: row for row in posters["items"]}
    require(len(stage_ids) == len(stage["catalog"])
            and len(video_ids) == 582 and len(poster_ids) == 582,
            "Duplicate supplier/canonical IDs")
    with zipfile.ZipFile(args.translations) as z:
        names = json.loads(z.read("TK504-NL-CANONICAL-OVERLAY-582-20261105.json"))
    translations = {row["catalog_id"]: row for row in names["items"]}
    require(len(translations) == 582 and len(names["items"]) == 582,
            "Translation identity registry incomplete")
    approved = json.loads(args.approval.read_text(encoding="utf-8"))
    require(approved["exercise"]["catalog_id"] == REVIEWED
            and approved["decision_status"] == "OWNER_CONTENT_APPROVED_FOR_SINGLE_ITEM_PILOT"
            and approved["access_release"]["production_release_authorized"] is False,
            "Single owner content scope invalid")
    output = []
    known_slugs = set()
    for number in range(args.start, args.start+args.count):
        catalog_id = f"TK-{number:06d}"
        require(catalog_id not in existing_ids, "Already published catalog ID")
        row = stage_ids.get(catalog_id)
        v = video_ids.get(catalog_id)
        p = poster_ids.get(catalog_id)
        tr = translations.get(catalog_id)
        require(row and v and p and tr, "Missing paired source object: "+catalog_id)
        source = row.get("source") or {}
        slug = source.get("provider_id")
        require(source.get("provider") == "movekit" and isinstance(slug,str)
                and SLUG.fullmatch(slug) and slug not in known_slugs
                and slug not in existing_slugs, "Ambiguous provider identity")
        known_slugs.add(slug)
        require(v["provider_id"] == slug and p["provider_id"] == slug,
                "Video/poster provider mismatch")
        require(v["video"]["path"] == "movekit/v2/video/"+slug+".mp4"
                and p["path"] == "movekit/v2/poster-optimized/"+slug+".webp",
                "Golden V2 object path mismatch")
        review = row["_review"]
        require(review["status"] == "NOT_PUBLISHED"
                and review["confirmed_by_authenticated_reviewer"] is False,
                "Only unpublished candidates accepted")
        require(tr["group"] == "UNRELEASED_CANDIDATE"
                and tr["translation_status"] == "DRAFT_NOT_HUMAN_REVIEWED_NOT_PUBLISHED",
                "Unreviewed text cannot be implicitly published")
        dutch = tr["translations"]
        for field in ("name_nl","shortDescription_nl",
                      "instructions_nl","commonMistakes_nl"):
            require(isinstance(dutch.get(field),str) and dutch[field].strip(),
                    "Missing Dutch detail field: "+field)
        video_file = args.videos_dir/(slug+".mp4")
        poster_file = args.posters_dir/(slug+".webp")
        verify_file(video_file, v["video"])
        verify_file(poster_file, p)
        identity = json.loads(json.dumps(row))
        identity["identity"]["nl"] = dutch["name_nl"]
        proposed = review.get("feedback",{}).get("ai_classification_proposal",{})
        if catalog_id == REVIEWED:
            proposed = approved["exercise"]["taxonomy"]
        require(isinstance(proposed,dict), "Proposal must be a mapping")
        for key in ("category","family","pattern","type"):
            value = proposed.get(key)
            if isinstance(value,str) and value and value != "pending_review":
                identity["identity"][key] = value
        identity["_review"]["integration_status"] = "LOCAL_REVIEW_BATCH_ONLY"
        identity["_review"]["selectable"] = False
        identity["_review"]["trainable"] = False
        identity["_review"]["owner_visible_content_approved"] = catalog_id == REVIEWED
        identity["_review"]["classification_authority"] = (
            "OWNER_CONTENT_APPROVED" if catalog_id == REVIEWED else "AI_PROPOSAL_PENDING_REVIEW"
        )
        output.append({
            "catalog_id":catalog_id, "slug":slug, "name":dutch["name_nl"],
            "english":row["identity"]["name"],
            "category":identity["identity"].get("category") or "pending_review",
            "level":identity["identity"].get("difficulty") or "pending_review",
            "equipment":identity["identity"].get("equipment") or [],
            "description":dutch["shortDescription_nl"],
            "instructions":[x.strip() for x in dutch["instructions_nl"].split(";") if x.strip()],
            "mistakes":[x.strip() for x in dutch["commonMistakes_nl"].split(";") if x.strip()],
            "row":identity,
            "video_file":video_file,"poster_file":poster_file,
            "video_bytes":v["video"]["bytes"],"poster_bytes":p["bytes"],
            "approved":catalog_id==REVIEWED
        })
    require(len(output) == LIMIT, "Unexpected batch size")
    return output


CSS = r"""
#tk504-batch-review{position:fixed;inset:0;z-index:2147483646;overflow:auto;background:#101a2b;color:#ebf1fa;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
#tk504-batch-review *{box-sizing:border-box}#tk504-batch-review button,#tk504-batch-review input{font:inherit}
#tk504-batch-review .shell{max-width:1450px;margin:auto;padding:20px 24px 48px}
#tk504-batch-review .header{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:18px}
#tk504-batch-review .brand{color:#8ebada;letter-spacing:.07em;font-size:12px;text-transform:uppercase;font-weight:700}
#tk504-batch-review h1{font-size:27px;margin:4px 0}
#tk504-batch-review .sub{color:#b7c7d9}
#tk504-batch-review .kpis{display:flex;gap:9px;flex-wrap:wrap}
#tk504-batch-review .kpi{padding:9px 13px;border:1px solid #3b536f;background:#1c2c43;border-radius:11px}
#tk504-batch-review .kpi strong{font-size:19px;color:#e5f4ff}
#tk504-batch-review .layout{display:grid;grid-template-columns:minmax(310px,390px) minmax(0,1fr);gap:18px}
#tk504-batch-review .panel{background:#17263c;border:1px solid #2f4561;border-radius:17px;overflow:hidden}
#tk504-batch-review .toolbar{padding:14px;border-bottom:1px solid #34465c;position:sticky;top:0;background:#17263c;z-index:2}
#tk504-batch-review input{display:block;width:100%;padding:11px 13px;color:#fff;background:#0d1a2c;border:1px solid #47617b;border-radius:9px;outline-offset:2px}
#tk504-batch-review .items{max-height:calc(100vh - 220px);overflow-y:auto;padding:8px}
#tk504-batch-review .item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid transparent;border-radius:11px;background:transparent;color:#e6edf6;padding:9px;cursor:pointer}
#tk504-batch-review .item:hover{background:#253a56}#tk504-batch-review .item.active{border-color:#76aee7;background:#284666}
#tk504-batch-review .item img{width:70px;height:54px;object-fit:cover;border-radius:7px;background:#091522;flex:none}
#tk504-batch-review .item .name{display:block;font-weight:650;font-size:13px}
#tk504-batch-review .item .meta{display:block;color:#b6c7d7;font-size:11px;margin-top:3px}
#tk504-batch-review .status{font-size:11px;font-weight:650;padding:3px 7px;border-radius:6px;background:#48412c;color:#ffdda2;white-space:nowrap}
#tk504-batch-review .status.approved{background:#1c493b;color:#a7f4d3}
#tk504-batch-review .detail{padding:22px;min-height:540px}#tk504-batch-review .detail h2{font-size:24px;margin:3px 0 6px}
#tk504-batch-review .detail .two{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(260px,.9fr);gap:18px}
#tk504-batch-review video{display:block;width:100%;aspect-ratio:16/9;background:#050d18;border-radius:13px;max-height:450px}
#tk504-batch-review .card{padding:15px;background:#101e31;border:1px solid #2e4763;border-radius:11px;margin-top:13px}
#tk504-batch-review .card h3{margin:0 0 9px;font-size:16px}
#tk504-batch-review .card ol,#tk504-batch-review .card ul{padding-left:21px;margin:6px 0}
#tk504-batch-review .card li{margin:6px 0}#tk504-batch-review p{margin:8px 0;color:#d4e0ef}
#tk504-batch-review .note{border-left:3px solid #efbd69;background:#2c2b2a;padding:10px 12px;border-radius:7px;margin-top:16px}
#tk504-batch-review .verify{display:block;font:11px/1.4 ui-monospace,monospace;white-space:pre-wrap;word-break:break-word;color:#a0c4e0;margin-top:14px}
@media(max-width:850px){#tk504-batch-review .layout{grid-template-columns:1fr}#tk504-batch-review .items{max-height:300px}#tk504-batch-review .detail .two{grid-template-columns:1fr}#tk504-batch-review .shell{padding:12px}#tk504-batch-review .detail{padding:14px}}
"""

JS = r"""
(function(){
"use strict";
const DATA=__DATA__;
const origin=__ORIGIN__;
const IDs=DATA.map(x=>x.id);
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=String(txt);if(cls)n.className=cls;return n;};
const assets=window.ExerciseAssetProvider;
const ecs=window.ExerciseCatalogService;
const verified=DATA.every(x=>{
  const item=ecs&&ecs.byId(x.id);
  const video=assets&&assets.resolve(x.id,"video");
  const poster=assets&&assets.poster(x.id);
  const search=ecs&&ecs.search(x.name,{},"relevance");
  return item&&item.catalog_id===x.id&&item.source&&
   item.source.provider==="movekit"&&item.source.provider_id===x.slug&&
   item._review&&item._review.status==="NOT_PUBLISHED"&&item._review.trainable===false&&
   video===origin+"/videos/"+x.slug+".mp4"&&
   poster===origin+"/pilot-poster/"+x.slug+".webp"&&
   Array.isArray(search)&&search.some(y=>y.catalog_id===x.id);
});
let selected=DATA[0];
const state={verified,selected:selected.id,filtered:25};
const panel=el("section");panel.id="tk504-batch-review";
const shell=el("div",null,"shell");panel.appendChild(shell);
const header=el("div",null,"header");shell.appendChild(header);
const heading=el("div");header.appendChild(heading);
heading.appendChild(el("div","TRAININGSKOMPAS · MOVEKIT IMPORTEVALUATIE","brand"));
heading.appendChild(el("h1","Batch 01 — 25 nieuwe oefeningen"));
heading.appendChild(el("p","De bestaande oefencatalogus met echte video's en posters · uitsluitend lokale review","sub"));
const kpis=el("div",null,"kpis");header.appendChild(kpis);
function kpi(number,text){const n=el("div",null,"kpi");n.appendChild(el("strong",number));n.appendChild(el("div",text));kpis.appendChild(n);}
kpi("25/25","Bronnen gecontroleerd");kpi("1","Inhoud goedgekeurd");kpi("24","Ter beoordeling");
const layout=el("div",null,"layout");shell.appendChild(layout);
const listPanel=el("div",null,"panel");layout.appendChild(listPanel);
const toolbar=el("div",null,"toolbar");listPanel.appendChild(toolbar);
const search=el("input");search.id="tk504-batch-search";search.placeholder="Zoek in 25 oefeningen…";search.setAttribute("aria-label","Zoek oefeningen");toolbar.appendChild(search);
const result=el("div","25 oefeningen","sub");toolbar.appendChild(result);
const items=el("div",null,"items");items.id="tk504-batch-items";listPanel.appendChild(items);
const detailPanel=el("div",null,"panel");layout.appendChild(detailPanel);
const detail=el("div",null,"detail");detailPanel.appendChild(detail);
function media(x,type){
 const expected=(type==="video"?"/videos/"+x.slug+".mp4":"/pilot-poster/"+x.slug+".webp");
 const value=type==="video"?assets.resolve(x.id,"video"):assets.poster(x.id);
 return value===origin+expected?value:null;
}
function renderItems(){
 items.replaceChildren();
 const term=search.value.trim().toLocaleLowerCase("nl-NL");
 const filtered=DATA.filter(x=>
  x.name.toLocaleLowerCase("nl-NL").includes(term)||
  x.en.toLocaleLowerCase("en").includes(term)||
  x.id.toLocaleLowerCase("en").includes(term)
 );
 state.filtered=filtered.length;result.textContent=filtered.length+" van 25 oefeningen";
 for(const x of filtered){
   const button=el("button",null,"item"+(x.id===selected.id?" active":""));
   button.type="button";button.dataset.catalogId=x.id;
   const thumb=el("img");thumb.alt="";thumb.loading="lazy";
   const url=media(x,"poster");if(url)thumb.src=url;
   button.appendChild(thumb);
   const info=el("div");info.style.flex="1";
   info.appendChild(el("span",x.name,"name"));
   info.appendChild(el("span",x.id+" · "+x.category,"meta"));
   button.appendChild(info);
   const badge=el("span",x.approved?"Goedgekeurd":"Concept","status"+(x.approved?" approved":""));
   button.appendChild(badge);
   button.addEventListener("click",()=>{selected=x;state.selected=x.id;renderItems();renderDetail();});
   items.appendChild(button);
 }
}
function list(parent,heading,values,ordered){
 const card=el("section",null,"card");card.appendChild(el("h3",heading));
 const ul=el(ordered?"ol":"ul");
 for(const s of values){const t=String(s).replace(/^\d+[.)]\s*/,"");ul.appendChild(el("li",t));}
 card.appendChild(ul);parent.appendChild(card);
}
function renderDetail(){
 // Do not keep licensed video in a hidden DOM element when selecting exercises.
 detail.replaceChildren();
 const item=ecs.byId(selected.id);
 const status=el("span",selected.approved?"Inhoud goedgekeurd":"Concept — ter beoordeling","status"+(selected.approved?" approved":""));
 detail.appendChild(status);
 detail.appendChild(el("h2",selected.name));
 detail.appendChild(el("p",selected.id+" · MoveKit · "+selected.category+" · "+selected.level,"sub"));
 const two=el("div",null,"two");detail.appendChild(two);
 const mediaCol=el("div");two.appendChild(mediaCol);
 const video=el("video");video.id="tk504-batch-video";video.controls=true;video.playsInline=true;
 video.preload="metadata";video.setAttribute("controlsList","nodownload");
 const videoSrc=media(selected,"video"),posterSrc=media(selected,"poster");
 if(videoSrc)video.src=videoSrc;if(posterSrc)video.poster=posterSrc;
 mediaCol.appendChild(video);
 mediaCol.appendChild(el("p","Originele Movekit-video en geoptimaliseerde anatomische poster.","sub"));
 const sub=el("div",null,"card");sub.appendChild(el("h3","Over de oefening"));
 sub.appendChild(el("p",selected.description));mediaCol.appendChild(sub);
 const textCol=el("div");two.appendChild(textCol);
 list(textCol,"Uitvoering — Nederlandse tekst",selected.instructions,true);
 list(textCol,"Veelgemaakte fouten",selected.mistakes,false);
 const note=el("div",null,"note");
 note.textContent=selected.approved?
  "De eigenaar heeft de getoonde inhoud van deze oefening goedgekeurd. Technische productie- en mediavrijgave zijn nog niet afgerond.":
  "Dit is een concept ter inhoudelijke beoordeling. Nog niet gepubliceerd, niet trainbaar en niet beschikbaar in productie.";
 detail.appendChild(note);
 const proof={ok:verified&&!!item&&!!videoSrc&&!!posterSrc,id:selected.id,
  count:ecs.count(),batch:25,approved:selected.approved,unpublished:item?item._review.status==="NOT_PUBLISHED":false,
  videoProvider:"ExerciseAssetProvider",catalogProvider:"ExerciseCatalogService",
  trainingLogging:"disabled"};
 const code=el("code","BATCH25_RESULT="+JSON.stringify(proof),"verify");detail.appendChild(code);
}
search.addEventListener("input",renderItems);
renderItems();renderDetail();
document.body.appendChild(panel);
const audit={ok:verified,count:ecs?ecs.count():0,added:25,existing:226,
 approved:DATA.filter(x=>x.approved).length,unapproved:DATA.filter(x=>!x.approved).length,
 ids:IDs,private_local:true,live_write:false};
panel.appendChild(el("code","BATCH25_AUDIT="+JSON.stringify(audit),"verify"));
})();
"""


def preview_html(args, rows):
    original = args.index.read_text(encoding="utf-8")
    require("const TK504_PRIVATE_MEDIA_RELEASE = false;" in original,
            "Active private release is not an offline test fixture")
    require(original.count("var ExerciseAssetProvider=(function(){") == 1
            and original.count("</body>") == 1, "Unexpected application template")
    origin=f"http://127.0.0.1:{args.port}"
    html=original.replace("var ExerciseAssetProvider=(function(){",
                          "var MEDIA_ORIGIN_OVERRIDE="+js(origin)+";\nvar ExerciseAssetProvider=(function(){",1)
    videos={}
    posters={}
    catalog=[]
    ui=[]
    for r in rows:
        cid=r["catalog_id"]
        slug=r["slug"]
        videos[cid]={"catalog_id":cid,"slug":slug,"poster":slug,
                     "thumbnail":slug,"videos":[{
                      "provider":"movekit","provider_asset_id":slug,
                      "version":"v2-local-batch-review","file":"videos/"+slug+".mp4",
                      "mime":"video/mp4"}]}
        posters[slug]=origin+"/pilot-poster/"+slug+".webp"
        catalog.append(r["row"])
        ui.append({"id":cid,"slug":slug,"name":r["name"],"en":r["english"],
                   "category":r["category"],"level":r["level"],
                   "description":r["description"],"instructions":r["instructions"],
                   "mistakes":r["mistakes"],"approved":r["approved"]})
    js_manifest="Object.assign(VIDEO_MANIFEST,"+js(videos)+");\n" + \
      "if(typeof EXERCISE_POSTERS!=='undefined')Object.assign(EXERCISE_POSTERS,"+js(posters)+");"
    html=after_json(html,"var VIDEO_MANIFEST=",js_manifest)
    js_catalog="EX_CATALOG.catalog.push(..."+js(catalog)+");\n" + \
      "EX_CATALOG.count=EX_CATALOG.catalog.length;"
    html=after_json(html,"const EX_CATALOG = ",js_catalog)
    addon="<style id='tk504-batch-css'>"+CSS+"</style>\n<script>"+JS.replace(
      "__DATA__",js(ui)).replace("__ORIGIN__",js(origin))+"</script>\n"
    require(html.count("</body>")==1,"HTML closing tag changed")
    return html.replace("</body>",addon+"</body>")


def serve(args, rows, preview):
    assets={}
    for row in rows:
        assets["/videos/"+row["slug"]+".mp4"]=(row["video_file"],"video/mp4",True)
        assets["/pilot-poster/"+row["slug"]+".webp"]=(row["poster_file"],"image/webp",False)
    root=args.index.parent.resolve()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*_):pass
        def do_HEAD(self):self.handle_get(True)
        def do_GET(self):self.handle_get(False)
        def handle_get(self,head):
            route=unquote(urlsplit(self.path).path)
            if (not route.startswith("/") or ".." in route or "\\" in route
                or "\x00" in route):return self.send_error(404)
            if route in assets:
                target,mime,allow_range=assets[route]
                return self.transfer(target,mime,head,allow_range)
            if route in ("/","/index.html"):
                return self.transfer(preview,"text/html; charset=utf-8",head,False)
            if route=="/sw.js":return self.send_error(404)
            if (route.startswith("/core/") or route in (
                 "/manifest.json","/exercise-catalog.json","/icon-192.png",
                 "/icon-512.png","/logo-wordmark.png","/favicon.ico",
                 "/exercise-intelligence_6.json")):
                file=(root/route.lstrip("/")).resolve()
                if not file.is_relative_to(root) or not file.is_file():
                    return self.send_error(404)
                mime=("application/javascript" if route.endswith(".js") else
                      "application/json" if route.endswith(".json") else "image/png")
                return self.transfer(file,mime,head,False)
            return self.send_error(404)
        def transfer(self,target,mime,head,ranges):
            total=target.stat().st_size
            start,end=0,total-1
            rg=self.headers.get("Range") if ranges else None
            if rg:
                match=re.fullmatch(r"bytes=(\d+)-(\d*)",rg.strip())
                if match is None:return self.send_error(416)
                start=int(match.group(1))
                if match.group(2):end=min(int(match.group(2)),total-1)
                if start>=total or start>end:
                    self.send_response(416)
                    self.send_header("Content-Range",f"bytes */{total}")
                    self.end_headers();return
            self.send_response(206 if rg else 200)
            for key,val in [
                ("Content-Type",mime),("Content-Length",str(end-start+1)),
                ("Cache-Control","private, no-store"),
                ("Accept-Ranges","bytes" if ranges else "none"),
                ("X-Content-Type-Options","nosniff"),
                ("Referrer-Policy","no-referrer"),
                ("X-Frame-Options","DENY"),
                ("Access-Control-Allow-Origin","http://127.0.0.1:"+str(args.port)),
            ]:self.send_header(key,val)
            if rg:self.send_header("Content-Range",f"bytes {start}-{end}/{total}")
            self.end_headers()
            if head:return
            with target.open("rb") as stream:
                stream.seek(start); remaining=end-start+1
                while remaining:
                    content=stream.read(min(64*1024,remaining))
                    if not content:break
                    try:self.wfile.write(content)
                    except (BrokenPipeError,ConnectionAbortedError,ConnectionResetError):break
                    remaining-=len(content)
    server=ThreadingHTTPServer(("127.0.0.1",args.port),Handler)
    print("TK504_BATCH25_PRIVATE_READY http://127.0.0.1:"+str(args.port)+"/",flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()


def parse(argv=None):
    a=argparse.ArgumentParser(description=__doc__)
    for key in ("index","catalog","stage","golden","poster_index",
                "translations","videos_dir","posters_dir","approval","private_out"):
        a.add_argument("--"+key.replace("_","-"),required=True,type=Path)
    a.add_argument("--start",type=int,default=227)
    a.add_argument("--count",type=int,default=25)
    a.add_argument("--port",type=int,default=18777)
    modes=a.add_mutually_exclusive_group(required=True)
    modes.add_argument("--check-only",action="store_true")
    modes.add_argument("--serve",action="store_true")
    return a.parse_args(argv)


def run(args):
    require(1024<args.port<65535,"Port invalid")
    private_out=args.private_out.resolve()
    require(".tk-private-review" in private_out.parts,
            "Output must reside in private licensed source working directory")
    rows=batch_records(args)
    rendered=preview_html(args,rows)
    private_out.mkdir(parents=True,exist_ok=True)
    path=private_out/"index.html"
    path.write_text(rendered,encoding="utf-8")
    count=sum(x["approved"] for x in rows)
    report={"batch_start":args.start,"batch_size":len(rows),"owner_content_approved":count,
            "content_pending":len(rows)-count,"existing_catalog_count":226,
            "local_catalog_count":226+len(rows),"sha256_verified_media_files":len(rows)*2,
            "private_local":True,"live_writes":0,
            "url":"http://127.0.0.1:"+str(args.port)+"/"}
    print("TK504_BATCH25_IMPORT="+json.dumps(report,ensure_ascii=False),flush=True)
    if args.serve:serve(args,rows,path)


if __name__=="__main__":
    try:run(parse())
    except Exception as ex:
        print("TK504_BATCH25_BLOCKED="+str(ex),file=sys.stderr)
        sys.exit(1)
