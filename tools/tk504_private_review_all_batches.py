#!/usr/bin/env python3
"""TK504 — local 15-page review of 356 unpublished MoveKit exercises.

Review page 1-14: 25 items each; page 15: final 6. It reuses the true ECS
and ExerciseAssetProvider; only LICENSED localhost media is served. None of
these candidates becomes selectable/trainable in production. No DB writes.
"""
import argparse
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs

try:
    import tk504_private_review_batch as batch
except ImportError:
    from tools import tk504_private_review_batch as batch


def construct(args):
    target=args.private_out.resolve()
    batch.require(".tk-private-review" in target.parts,
                  "Generated artifacts must remain in private review folder")
    batch.require(not (target/"README.md").exists(),
                  "Cannot overwrite arbitrary existing folder")
    target.mkdir(parents=True,exist_ok=True)
    html_by_batch={}
    assets={}
    ids=set()
    approved=0
    total_bytes=0
    for idx in range(15):
        start=227+(idx*25)
        count=min(25,583-start)
        job=argparse.Namespace(**vars(args))
        job.start=start
        job.count=count
        job.private_out=target/f"batch{idx+1:02d}"
        rows=batch.batch_records(job)
        html=batch.preview_html(job,rows)
        folder=job.private_out
        folder.mkdir(parents=True,exist_ok=True)
        page=folder/"index.html"
        page.write_text(html,encoding="utf-8")
        html_by_batch[idx+1]=page
        for row in rows:
            cid=row["catalog_id"]
            batch.require(cid not in ids, "Duplicate canonical ID across batches")
            ids.add(cid)
            slug=row["slug"]
            for route,p,mime,is_video in (
                ("/videos/"+slug+".mp4",row["video_file"],"video/mp4",True),
                ("/pilot-poster/"+slug+".webp",row["poster_file"],"image/webp",False)):
                batch.require(route not in assets,"Duplicate media route across batches")
                assets[route]=(p,mime,is_video)
            total_bytes+=row["video_bytes"]+row["poster_bytes"]
            approved+=bool(row["approved"])
        print("TK504_BATCH_READY="+json.dumps({
            "batch":idx+1,"start":start,"count":count,
            "sha256_checks":2*count,"owner_approved":sum(x["approved"] for x in rows),
            "private_only":True
        }),flush=True)
    expected_approved = 356 if getattr(args,"bulk_approval",None) else 1
    batch.require(len(html_by_batch)==15 and len(ids)==356
                  and len(assets)==712 and approved==expected_approved,
                  "All 356 candidates must be represented with the exact owner decision")
    batch.require(ids=={f"TK-{i:06d}" for i in range(227,583)},
                  "Exact complete 356 canonical IDs required")
    print("TK504_ALL_BATCHES="+json.dumps({
       "batches":15,"full_batches_25":14,"final_batch_6":1,"local_review_items":356,
       "existing_prod_catalog_unchanged":226,"media_sha256_checks":712,
       "local_asset_bytes":total_bytes,"approved_content":approved,
       "pending_content":356-approved,"production_writes":0,
       "origin":f"http://127.0.0.1:{args.port}/"
    }),flush=True)
    return html_by_batch,assets


def serve(args,pages,assets):
    root=args.index.parent.resolve()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*_):pass
        def do_HEAD(self):self.respond(True)
        def do_GET(self):self.respond(False)
        def respond(self,head):
            parsed=urlsplit(self.path)
            uri=unquote(parsed.path)
            if (not uri.startswith("/") or ".." in uri
                    or "\\" in uri or "\x00" in uri):
                return self.send_error(404)
            if uri in assets:
                path,mime,rangeable=assets[uri]
                return self.send_file(path,mime,head,rangeable)
            if uri=="/sw.js":return self.send_error(404)
            if uri in ("/","/index.html"):
                query=parse_qs(parsed.query,keep_blank_values=True)
                if set(query)-{"batch","utm_source"}:return self.send_error(404)
                wanted=query.get("batch",["1"])
                if len(wanted)!=1 or not re.fullmatch(r"\d{1,2}",wanted[0]):
                    return self.send_error(404)
                page=pages.get(int(wanted[0]))
                if page is None:return self.send_error(404)
                return self.send_file(page,"text/html; charset=utf-8",head,False)
            if (uri.startswith("/core/") or uri in (
                  "/manifest.json","/exercise-catalog.json","/icon-192.png",
                  "/icon-512.png","/logo-wordmark.png","/favicon.ico",
                  "/exercise-intelligence_6.json")):
                source=(root/uri.lstrip("/")).resolve()
                if not source.is_relative_to(root) or not source.is_file():
                    return self.send_error(404)
                mime=("application/javascript" if uri.endswith(".js") else
                      "application/json" if uri.endswith(".json") else "image/png")
                return self.send_file(source,mime,head,False)
            return self.send_error(404)
        def send_file(self,source,mime,head,rangeable):
            total=source.stat().st_size
            start,end=0,total-1
            rg=self.headers.get("Range") if rangeable else None
            if rg:
                match=re.fullmatch(r"bytes=(\d+)-(\d*)",rg.strip())
                if not match:return self.send_error(416)
                start=int(match.group(1))
                if match.group(2):end=min(int(match.group(2)),total-1)
                if start>=total or start>end:
                    self.send_response(416)
                    self.send_header("Content-Range",f"bytes */{total}")
                    self.end_headers();return
            self.send_response(206 if rg else 200)
            headers={
                "Content-Type":mime,"Content-Length":str(end-start+1),
                "Cache-Control":"private, no-store",
                "Accept-Ranges":"bytes" if rangeable else "none",
                "X-Content-Type-Options":"nosniff",
                "Referrer-Policy":"no-referrer",
                "X-Frame-Options":"DENY",
            }
            if rg:headers["Content-Range"]=f"bytes {start}-{end}/{total}"
            for key,value in headers.items():self.send_header(key,value)
            self.end_headers()
            if head:return
            with source.open("rb") as stream:
                stream.seek(start);remaining=end-start+1
                while remaining:
                    chunk=stream.read(min(65536,remaining))
                    if not chunk:break
                    try:self.wfile.write(chunk)
                    except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):break
                    remaining-=len(chunk)
    web=ThreadingHTTPServer(("127.0.0.1",args.port),Handler)
    print("TK504_356_REVIEW_READY=http://127.0.0.1:"+str(args.port)+"/",flush=True)
    try:web.serve_forever()
    except KeyboardInterrupt:pass
    finally:web.server_close()


def cli(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    for key in ("index","catalog","stage","golden","poster_index",
                "translations","videos_dir","posters_dir","approval","private_out"):
        parser.add_argument("--"+key.replace("_","-"),type=Path,required=True)
    parser.add_argument("--port",type=int,default=18777)
    parser.add_argument("--bulk-approval",type=Path,default=None,
                        help="Owner batch-content record, not a live media grant")
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check-only",action="store_true")
    mode.add_argument("--serve",action="store_true")
    return parser.parse_args(argv)


def run(args):
    batch.require(1024<args.port<65535,"Port outside allowed range")
    pages,assets=construct(args)
    if args.serve:serve(args,pages,assets)


if __name__=="__main__":
    try:run(cli())
    except Exception as error:
        print("TK504_ALL_BATCHES_BLOCKED="+str(error),file=sys.stderr)
        sys.exit(1)
