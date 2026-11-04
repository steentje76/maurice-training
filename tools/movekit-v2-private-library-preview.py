#!/usr/bin/env python3
"""Generate a PRIVATE, LOCAL-ONLY review page for the 582 MoveKit V2 exercises.

Reads the checked private review projection (status PRIVATE_REVIEW_NOT_RELEASED)
and writes ONE static HTML file directly under <source-directory>/.tk-private-review.

Safeguards: no network (CSP default-src 'none'), no service worker, no app link,
no publishing, no media copying. Posters/videos are referenced only through
relative file:// paths to files that already exist on this machine. The script
embeds no supplier content; everything shown comes from the private input file.
"""
import argparse
import base64
import hashlib
import json
import os
import re
import sys
import urllib.parse
from collections import Counter
from pathlib import Path

sys.dont_write_bytecode = True

STATUS = 'PRIVATE_REVIEW_NOT_RELEASED'
PRIVATE_DIRNAME = '.tk-private-review'
POSTER_DIRNAME = 'posters-webp-v2'
VIDEO_DIR_GLOB = 'complete-exercise-library-golden-release-*'
ID = re.compile(r'TK-\d{6}\Z')
SLUG = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*\Z')
MAX_STAGE_BYTES = 64 * 1024 * 1024
ROUTES = {
    'AI_PROPOSAL_PENDING_HUMAN_REVIEW': ('ai', 'ai_classification_proposal'),
    'SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW': ('term', 'proposed_exact_vocabulary'),
    'OWNER_FEEDBACK_PENDING_CONTENT_REVIEW': ('owner', 'owner_choice'),
}
EXPECTED = {'published': 226, 'ai': 245, 'term': 85, 'owner': 26}
DRAFT_SCHEMA = 'tk504-owner-review-draft'
DRAFT_VERSION = 1
DRAFT_STATUSES = ['unreviewed', 'review-agree-provisionally', 'needs-correction',
                  'exclude-provisionally']
DRAFT_MAX_BYTES = 512 * 1024
DRAFT_MAX_NOTE = 500
OWNER_LABELS = {
    'apart': 'Apart houden', 'meta': 'Metadata-correctie voorgesteld',
    'variant': 'Variant (niet automatisch ontdubbeld)',
    'hold': 'In de wacht', 'exclude': 'Uitsluiten voorgesteld',
}


def need(ok, code):
    if not ok:
        raise ValueError(code)


# ---------------------------------------------------------------- paths
def resolve_private(source_directory):
    source = Path(source_directory).resolve(strict=True)
    need(source.is_dir(), 'SOURCE_DIRECTORY_INVALID')
    raw = source / PRIVATE_DIRNAME
    need(raw.is_dir() and not raw.is_symlink(), 'PRIVATE_DIRECTORY_MISSING')
    return source, raw.resolve(strict=True)


def resolve_staged(path, private):
    p = Path(path).resolve(strict=True)
    need(p.parent == private and p.suffix.lower() == '.json' and p.is_file(),
         'STAGED_CATALOG_MUST_BE_PRIVATE_JSON')
    need(p.stat().st_size <= MAX_STAGE_BYTES, 'STAGED_CATALOG_TOO_LARGE')
    return p


def resolve_output(path, private, staged):
    """Output must be a NEW .html file directly inside the private directory."""
    raw = Path(path)
    need(raw.name and raw.name not in ('.', '..'), 'PRIVATE_OUTPUT_PATH_REQUIRED')
    parent = raw.parent.resolve(strict=False)
    need(parent == private, 'PRIVATE_OUTPUT_PATH_REQUIRED')
    target = private / raw.name
    need(target.suffix.lower() == '.html' and target.stem != '', 'PRIVATE_OUTPUT_PATH_REQUIRED')
    need(not os.path.lexists(target) and target != staged, 'OUTPUT_ALREADY_EXISTS')
    return target


def find_video_dir(source, explicit=None):
    if explicit is not None:
        d = Path(explicit).resolve(strict=True)
        need(d.is_dir() and d.parent == source, 'VIDEO_DIRECTORY_MUST_BE_UNDER_SOURCE')
        return d
    found = [d for d in source.glob(VIDEO_DIR_GLOB) if d.is_dir() and not d.is_symlink()]
    return found[0].resolve() if len(found) == 1 else None


def media_ref(directory, slug, ext, output_dir):
    """Relative, URL-quoted path to an EXISTING regular file, else None."""
    if directory is None:
        return None
    need(SLUG.fullmatch(slug) is not None, 'INVALID_SLUG')
    f = directory / (slug + ext)
    try:
        if f.is_symlink() or not f.is_file() or f.resolve().parent != directory:
            return None
        rel = os.path.relpath(f, output_dir)
    except (OSError, ValueError):
        return None
    ref = urllib.parse.quote(rel.replace(os.sep, '/'), safe='/')
    if re.match(r'[A-Za-z][A-Za-z0-9+.-]*:', ref) or ref.startswith(('/', '//')):
        return None
    return ref


# ---------------------------------------------------------------- validation
def text(value, limit=400):
    need(isinstance(value, str) and len(value) <= limit, 'INVALID_TEXT')
    return value


def tags(value):
    need(isinstance(value, list) and len(value) <= 40, 'INVALID_TAGS')
    return [text(x, 200) for x in value]


def bound(value, depth=0):
    """Copy JSON-ish review evidence with hard limits (render-only; no HTML)."""
    need(depth <= 6, 'EVIDENCE_TOO_DEEP')
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value[:4000]
    if isinstance(value, list):
        return [bound(x, depth + 1) for x in value[:80]]
    if isinstance(value, dict):
        return {str(k)[:80]: bound(v, depth + 1) for k, v in list(value.items())[:60]}
    raise ValueError('INVALID_EVIDENCE')


def validate_stage(stage, baseline=None):
    need(isinstance(stage, dict), 'INVALID_STAGE')
    need(stage.get('_status') == STATUS, 'STAGE_STATUS_NOT_PRIVATE_REVIEW')
    need(stage.get('_app_activated') is False, 'APP_ACTIVATION_DETECTED')
    for key in ('_approved_for_import', '_media_grants_created',
                '_history_updates', '_personal_exercise_updates'):
        v = stage.get(key)
        need(isinstance(v, int) and not isinstance(v, bool) and v == 0, 'RELEASE_FLAG_SET:' + key)
    catalog = stage.get('catalog')
    need(isinstance(catalog, list) and len(catalog) == 582 and stage.get('count') == 582,
         'CATALOG_COUNT_NOT_582')
    if baseline is not None:
        need(isinstance(baseline, list) and len(baseline) == 226 and catalog[:226] == baseline,
             'BASELINE_MUTATED')
    ids, slugs, counts = set(), set(), Counter()
    for index, item in enumerate(catalog):
        need(isinstance(item, dict), 'INVALID_ENTRY')
        cid = item.get('catalog_id')
        src = item.get('source')
        need(isinstance(cid, str) and ID.fullmatch(cid) and isinstance(src, dict), 'INVALID_ENTRY')
        slug = src.get('provider_id')
        need(isinstance(slug, str) and SLUG.fullmatch(slug), 'INVALID_SLUG')
        need(cid not in ids, 'DUPLICATE_CATALOG_ID')
        need(slug not in slugs, 'DUPLICATE_PROVIDER_SLUG')
        ids.add(cid)
        slugs.add(slug)
        need(isinstance(item.get('identity'), dict), 'INVALID_ENTRY')
        review = item.get('_review')
        if index < 226:
            need(review is None or (isinstance(review, dict) and
                 review.get('status') != 'NOT_PUBLISHED' and
                 'review_route' not in review), 'BASELINE_ENTRY_HAS_REVIEW_BLOCK')
            counts['published'] += 1
            continue
        need(isinstance(review, dict) and review.get('status') == 'NOT_PUBLISHED', 'PENDING_NOT_UNPUBLISHED')
        route = ROUTES.get(review.get('review_route'))
        need(route is not None, 'UNKNOWN_REVIEW_ROUTE')
        need(review.get('confirmed_by_authenticated_reviewer') is False and
             review.get('supplier_metadata_modified') is False, 'REVIEW_CONFIRMATION_FLAG')
        need(item.get('assets') == [], 'PENDING_HAS_ASSETS')
        feedback = review.get('feedback')
        need(isinstance(feedback, dict) and route[1] in feedback, 'REVIEW_EVIDENCE_MISSING')
        meta = feedback.get('source_metadata_proposal')
        need(meta is None or (isinstance(meta, dict) and meta.get('approved') is False),
             'METADATA_PROPOSAL_APPROVED')
        pair = feedback.get('variant_pair')
        need(pair is None or (isinstance(pair, dict) and
             pair.get('automated_deduplication_permitted') is False and
             pair.get('formal_variant_relation_approved') is False), 'VARIANT_APPROVED')
        counts[route[0]] += 1
    need(dict(counts) == EXPECTED, 'REVIEW_COUNTS_CHANGED')
    return dict(counts)


# ---------------------------------------------------------------- data
def build_items(stage, poster_dir, video_dir, output_dir):
    items = []
    for index, raw in enumerate(stage['catalog']):
        ident = raw['identity']
        slug = raw['source']['provider_id']
        review = raw.get('_review') if index >= 226 else None
        entry = {
            'id': raw['catalog_id'], 'slug': slug,
            'name': text(ident.get('name'), 200),
            'nl': text(ident['nl'], 200) if ident.get('nl') else None,
            'difficulty': text(ident['difficulty'], 100) if ident.get('difficulty') else None,
            'primary': tags(ident.get('primary', [])),
            'secondary': tags(ident.get('secondary', [])),
            'equipment': tags(ident.get('equipment', [])),
            'patterns': tags(review.get('movement_patterns_supplied', [])) if review else [],
            'group': 'published', 'proposal': None, 'owner': None,
            'metadata': None, 'variant': None,
            'poster': media_ref(poster_dir, slug, '.webp', output_dir),
            'video': media_ref(video_dir, slug, '.mp4', output_dir),
        }
        if review:
            group, key = ROUTES[review['review_route']]
            fb = review['feedback']
            entry['group'] = group
            if group in ('ai', 'term'):
                entry['proposal'] = bound(fb[key])
            else:
                choice = text(fb['owner_choice'], 40)
                entry['owner'] = {
                    'choice': choice, 'label': OWNER_LABELS.get(choice, choice),
                    'note': text(fb.get('owner_note') or '', 4000),
                    'route': text(fb.get('proposed_route') or '', 200)}
            if fb.get('source_metadata_proposal'):
                entry['metadata'] = bound(fb['source_metadata_proposal'])
            if fb.get('variant_pair'):
                entry['variant'] = bound(fb['variant_pair'])
        items.append(entry)
    return items


def draft_binding(stage, stage_bytes):
    """Digests binding a draft file to THIS stage; carries ids/slugs/routes only."""
    rows = sorted((raw['catalog_id'], raw['source']['provider_id'], raw['_review']['review_route'])
                  for raw in stage['catalog'][226:])
    need(len(rows) == sum(EXPECTED[k] for k in ('ai', 'term', 'owner')), 'PENDING_COUNT_CHANGED')
    manifest = ''.join('%s\t%s\t%s\n' % row for row in rows)
    return {
        'schema': DRAFT_SCHEMA, 'version': DRAFT_VERSION, 'statuses': DRAFT_STATUSES,
        'max_bytes': DRAFT_MAX_BYTES, 'max_note': DRAFT_MAX_NOTE, 'expected': len(rows),
        'routes': {g: r for r, (g, _k) in ROUTES.items()},
        'stage_sha256': hashlib.sha256(stage_bytes).hexdigest(),
        'manifest_sha256': hashlib.sha256(manifest.encode('utf8')).hexdigest(),
    }


def safe_json(obj):
    """JSON safe inside <script>: no raw <, >, & or line separators."""
    s = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    return (s.replace('&', '\\u0026').replace('<', '\\u003c').replace('>', '\\u003e')
             .replace('\u2028', '\\u2028').replace('\u2029', '\\u2029'))


def sri(content):
    return "'sha256-" + base64.b64encode(hashlib.sha256(content.encode('utf8')).digest()).decode() + "'"


# ---------------------------------------------------------------- page
STYLE = r'''
:root{--navy:#10253f;--teal:#0f8b8d;--teal-d:#0a6567;--amber:#e8a33d;--bg:#f3f6f9;--card:#fff;--ink:#1b2a3a;--mut:#5d6f82;--line:#d9e1e9;--ok:#2f7d4f;--warn:#a8650f}
*{box-sizing:border-box}
body{margin:0;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
header.top{background:var(--navy);color:#fff;padding:14px 20px}
header.top h1{margin:0;font-size:20px}
header.top p{margin:4px 0 0;color:#b9c9da;font-size:13px}
.banner{background:#fff4dc;border-bottom:1px solid #f0d49a;color:#6b4710;padding:8px 20px;font-size:13px}
.wrap{max-width:1500px;margin:0 auto;padding:16px 20px 60px}
.tiles{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;cursor:pointer;text-align:left;font:inherit;color:inherit;min-width:150px}
.tile b{display:block;font-size:22px}
.tile span{color:var(--mut);font-size:12px}
.tile.on{border-color:var(--teal);box-shadow:0 0 0 2px rgba(15,139,141,.2)}
.tile.sub{padding:8px 12px;min-width:120px}
.tile.sub b{font-size:18px}
.tools{position:sticky;top:0;z-index:5;background:var(--bg);padding:8px 0 10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tools input[type=search],.tools select{padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;color:inherit}
.tools input[type=search]{flex:1 1 280px;min-width:200px}
.tools label{display:flex;gap:5px;align-items:center;color:var(--mut);font-size:13px}
.btn{border:1px solid var(--teal);background:var(--teal);color:#fff;border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer}
.btn.ghost{background:#fff;color:var(--teal-d)}
.count{color:var(--mut);font-size:13px;margin:2px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;cursor:pointer;text-align:left;padding:0;font:inherit;color:inherit;display:flex;flex-direction:column}
.card:hover,.card:focus-visible{border-color:var(--teal);outline:none;box-shadow:0 2px 10px rgba(16,37,63,.12)}
.thumb{aspect-ratio:4/3;background:#e6edf3;display:flex;align-items:center;justify-content:center;color:#8a9bad;font-size:12px;overflow:hidden}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.cbody{padding:10px 12px 12px}
.cbody h3{margin:0 0 2px;font-size:15px}
.cid{color:var(--mut);font-size:12px}
.badge{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:600;margin:6px 4px 0 0}
.b-published{background:#e1f2e8;color:var(--ok)}
.b-ai,.b-term,.b-owner{background:#fdeccd;color:var(--warn)}
.b-vid{background:#e3edf8;color:#27517f}
.b-rel{background:#ece8f8;color:#4a3a86}
.more{display:block;margin:16px auto 0}
.more[hidden],#scrim[hidden]{display:none}
#scrim{position:fixed;inset:0;background:rgba(16,37,63,.45);z-index:15}
:focus-visible{outline:3px solid var(--amber);outline-offset:2px}
.card{content-visibility:auto;contain-intrinsic-size:260px 300px}
.link{min-height:32px}
.chips{margin-top:6px;color:var(--mut);font-size:12px}
.empty{padding:40px;text-align:center;color:var(--mut)}
aside#detail{position:fixed;top:0;right:0;bottom:0;width:min(520px,100%);background:#fff;border-left:1px solid var(--line);box-shadow:-6px 0 24px rgba(16,37,63,.18);overflow:auto;z-index:20;padding:16px 18px 40px}
aside#detail[hidden]{display:none}
aside h2{margin:6px 0 2px;font-size:20px}
aside h4{margin:18px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}
.media{background:#e6edf3;border-radius:10px;overflow:hidden;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:#8a9bad;font-size:13px;margin:10px 0 8px}
.media img,.media video{width:100%;height:100%;object-fit:contain;background:#000}
.note{white-space:pre-wrap;background:#f7f9fb;border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.pend{background:#fff4dc;border:1px solid #f0d49a;color:#6b4710;border-radius:8px;padding:8px 10px;font-size:13px}
dl.kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;margin:0}
dl.kv dt{color:var(--mut)}
dl.kv dd{margin:0;overflow-wrap:anywhere}
ul.plain{margin:0;padding-left:18px}
.muted{color:var(--mut)}
.draft{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-bottom:14px}
.draft h2{margin:0 0 6px;font-size:16px}
.draft .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px}
#dmsg{margin:8px 0 0;font-size:13px;min-height:1.2em}
#dmsg.err{color:#a11d1d;font-weight:600}
.b-dec{background:#e6e0f5;color:#40307a}
.dlab{display:block;margin:10px 0 4px;color:var(--mut);font-size:13px}
.dsel,textarea.dnote{width:100%;font:inherit;color:inherit;padding:8px;border:1px solid var(--line);border-radius:8px;background:#fff}
.tag{display:inline-block;background:#eef3f7;border-radius:6px;padding:1px 7px;margin:2px 4px 2px 0;font-size:13px}
.link{background:none;border:0;color:var(--teal-d);text-decoration:underline;cursor:pointer;font:inherit;padding:0}
@media(max-width:700px){.grid{grid-template-columns:repeat(2,1fr);gap:8px}.wrap{padding:10px}.tiles{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px}.tile{min-width:128px;flex:0 0 auto}.tools{position:static}.tools select{flex:1 1 140px}.btn,.tile,.tools input,.tools select{min-height:44px}aside#detail{width:100%;border-left:0;padding:12px 14px 40px}header.top h1{font-size:17px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
'''

DRAFT_LIB = r'''
function makeDraft(cfg,pending){
 var STAT=cfg.statuses.slice(),exp=new Map();
 pending.forEach(function(p){exp.set(p.id,p);});
 function fail(c){throw new Error('DRAFT_'+c);}
 function plain(o){return o!==null&&typeof o==='object'&&!Array.isArray(o)&&(Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null);}
 function keysAre(o,list){return plain(o)&&Object.keys(o).sort().join('|')===list.slice().sort().join('|');}
 function blank(){var m=new Map();pending.forEach(function(p){m.set(p.id,{status:STAT[0],note:''});});return m;}
 function counts(m){var c={};STAT.forEach(function(s){c[s]=0;});m.forEach(function(v){c[v.status]++;});return c;}
 function build(m,iso){
  var d=pending.map(function(p){var v=m.get(p.id);return {id:p.id,slug:p.slug,review_route:cfg.routes[p.group],status:v.status,note:v.note};});
  return {schema:cfg.schema,version:cfg.version,draft_only:true,authenticated:false,formal_approval:false,ready_for_import:false,
   stage_sha256:cfg.stage_sha256,manifest_sha256:cfg.manifest_sha256,exported_at:iso,counts:counts(m),decisions:d};
 }
 function parse(text){
  if(typeof text!=='string'||text.length>cfg.max_bytes)fail('TOO_LARGE');
  var o;try{o=JSON.parse(text);}catch(e){fail('NOT_JSON');}
  if(!keysAre(o,['schema','version','draft_only','authenticated','formal_approval','ready_for_import','stage_sha256','manifest_sha256','exported_at','counts','decisions']))fail('SHAPE');
  if(o.schema!==cfg.schema||o.version!==cfg.version)fail('SCHEMA');
  if(o.draft_only!==true||o.authenticated!==false||o.formal_approval!==false||o.ready_for_import!==false)fail('FLAGS');
  if(o.stage_sha256!==cfg.stage_sha256)fail('STAGE_MISMATCH');
  if(o.manifest_sha256!==cfg.manifest_sha256)fail('MANIFEST_MISMATCH');
  if(typeof o.exported_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(o.exported_at)||isNaN(Date.parse(o.exported_at)))fail('TIMESTAMP');
  if(!Array.isArray(o.decisions)||o.decisions.length!==exp.size)fail('COUNT');
  var m=new Map();
  for(var i=0;i<o.decisions.length;i++){
   var d=o.decisions[i];
   if(!keysAre(d,['id','slug','review_route','status','note']))fail('ENTRY_SHAPE');
   if(typeof d.id!=='string'||!exp.has(d.id)||m.has(d.id))fail('ID');
   var p=exp.get(d.id);
   if(d.slug!==p.slug)fail('SLUG');
   if(d.review_route!==cfg.routes[p.group])fail('ROUTE');
   if(typeof d.status!=='string'||STAT.indexOf(d.status)<0)fail('STATUS');
   if(typeof d.note!=='string'||d.note.length>cfg.max_note||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(d.note))fail('NOTE');
   m.set(d.id,{status:d.status,note:d.note});
  }
  var c=counts(m);
  if(!keysAre(o.counts,STAT)||STAT.some(function(s){return o.counts[s]!==c[s];}))fail('COUNTS');
  return m;
 }
 return {statuses:STAT,blank:blank,counts:counts,build:build,parse:parse};
}
'''

SCRIPT_TEMPLATE = r'''
(function(){'use strict';
/*DRAFT_LIB*/
var DATA=JSON.parse(document.getElementById('tk-data').textContent);
var items=DATA.items,byId={};
var GROUP_LABEL={published:'Bestaand \u00b7 gepubliceerd',ai:'AI-voorstel',term:'Alleen bronterm',owner:'Eigenaar-feedback'};
var PENDING='In afwachting inhoudelijke vrijgave';
var REASON={
 ai:'Er ligt een AI-classificatievoorstel; een mens moet dit nog inhoudelijk beoordelen.',
 term:'Alleen een voorstel op basis van exacte brontermen; menselijke beoordeling is nog nodig.',
 owner:'Eigenaar-feedback is verwerkt; een inhoudelijke beoordeling en vrijgave volgen nog.'};
var ORDER={published:0,ai:1,term:2,owner:3};
var PAGE=96;
var S={q:'',exact:false,group:'all',owner:'',equipment:'',muscle:'',video:false,sort:'name',dec:'',limit:PAGE};
var incoming={},lastFocus=null,qTimer=null;
function $(id){return document.getElementById(id);}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=String(txt);return e;}
function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function cmp(a,b){return String(a).localeCompare(String(b),'nl',{sensitivity:'base',numeric:true});}
function isPending(it){return it.group!=='published';}
var DLABEL={'unreviewed':'Niet beoordeeld','review-agree-provisionally':'Voorlopig akkoord (concept)','needs-correction':'Correctie nodig (concept)','exclude-provisionally':'Voorlopig uitsluiten (concept)'};
var DWARN='Alleen een lokaal concept: dit is GEEN geauthenticeerde goedkeuring, geen vrijgave en geen rechtenverlening. De keuze blijft alleen in het geheugen van dit tabblad tot je zelf exporteert. Schrijf geen bronteksten of eigenaar-notities over in de notitie.';
var pendingList=items.filter(isPending).sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:0;});
var DR=makeDraft(DATA.draft,pendingList),D=DR.blank(),dirty=false,STAT=DR.statuses;

items.forEach(function(it){
 byId[it.id]=it;
 if(it.variant&&it.variant.peer_catalog_id){var pe=it.variant.peer_catalog_id;(incoming[pe]=incoming[pe]||[]).push(it.id);}
 var tg=it.primary.concat(it.secondary,it.equipment);
 it._h=norm([it.name,it.nl,it.id,it.slug].concat(tg).join(' | '));
 it._x=[it.name,it.nl,it.id,it.slug].concat(tg).filter(Boolean).map(norm);
});

function matches(it){
 if(S.group==='pending'){if(!isPending(it))return false;}
 else if(S.group!=='all'&&it.group!==S.group)return false;
 if(S.owner&&(!it.owner||it.owner.choice!==S.owner))return false;
 if(S.equipment&&it.equipment.indexOf(S.equipment)<0)return false;
 if(S.muscle&&it.primary.indexOf(S.muscle)<0&&it.secondary.indexOf(S.muscle)<0)return false;
 if(S.video&&!it.video)return false;
 if(S.dec&&(!isPending(it)||D.get(it.id).status!==S.dec))return false;
 var q=norm(S.q);
 if(!q)return true;
 if(S.exact)return it._x.indexOf(q)>=0;
 return q.split(/\s+/).every(function(t){return it._h.indexOf(t)>=0;});
}
function sorter(){
 if(S.sort==='name-desc')return function(a,b){return cmp(b.name,a.name);};
 if(S.sort==='id')return function(a,b){return cmp(a.id,b.id);};
 if(S.sort==='status')return function(a,b){return (ORDER[a.group]-ORDER[b.group])||cmp(a.name,b.name);};
 return function(a,b){return cmp(a.name,b.name);};
}
function thumb(it,big){
 var box=el('div',big?'media':'thumb');
 if(it.poster){var img=el('img');img.alt='';img.loading='lazy';img.decoding='async';img.src=it.poster;
  img.addEventListener('error',function(){img.remove();box.textContent='Poster niet beschikbaar';});
  box.appendChild(img);}
 else box.textContent='Geen poster beschikbaar';
 return box;
}
function badge(it){return el('span','badge b-'+it.group,isPending(it)?PENDING:GROUP_LABEL.published);}
function card(it){
 var b=el('button','card');b.type='button';b.setAttribute('data-id',it.id);
 b.setAttribute('aria-label',it.name+', '+it.id+', '+(isPending(it)?PENDING:GROUP_LABEL.published));
 b.appendChild(thumb(it,false));
 var body=el('div','cbody');
 body.appendChild(el('h3',null,it.name));
 body.appendChild(el('div','cid',it.id+(it.nl&&it.nl!==it.name?' \u00b7 '+it.nl:'')));
 body.appendChild(badge(it));
 if(isPending(it))body.appendChild(el('span','badge b-'+it.group,GROUP_LABEL[it.group]));
 if(it.owner)body.appendChild(el('span','badge b-rel',it.owner.label));
 if(it.metadata)body.appendChild(el('span','badge b-rel','Metadata-voorstel (niet goedgekeurd)'));
 if(it.variant||incoming[it.id])body.appendChild(el('span','badge b-rel','Gekoppeld paar'));
 if(isPending(it)&&D.get(it.id).status!==STAT[0])body.appendChild(el('span','badge b-dec',DLABEL[D.get(it.id).status]));
 if(it.video)body.appendChild(el('span','badge b-vid','Video lokaal'));
 var t=it.primary.concat(it.equipment).slice(0,4).join(' \u00b7 ');
 if(t)body.appendChild(el('div','chips',t));
 b.appendChild(body);
 b.addEventListener('click',function(){openDetail(it);});
 return b;
}
var current=[];
function render(keepLimit){
 if(!keepLimit)S.limit=PAGE;
 current=items.filter(matches).sort(sorter());
 var grid=$('grid');while(grid.firstChild)grid.removeChild(grid.firstChild);
 var shown=current.slice(0,S.limit);
 var frag=document.createDocumentFragment();
 shown.forEach(function(it){frag.appendChild(card(it));});
 grid.appendChild(frag);
 $('count').textContent=current.length+' van '+items.length+' oefeningen · '+shown.length+' getoond';
 $('more').hidden=shown.length>=current.length;
 $('more').textContent='Toon meer ('+(current.length-shown.length)+' resterend)';
 $('empty').hidden=current.length>0;
 Array.prototype.forEach.call(document.querySelectorAll('[data-group]'),function(t){
  t.classList.toggle('on',t.getAttribute('data-group')===S.group);});
 $('group').value=S.group;
}
function renderValue(v,parent){
 if(Array.isArray(v)){
  if(!v.length){parent.appendChild(el('span','muted','\u2014'));return;}
  var ul=el('ul','plain');
  v.forEach(function(x){var li=el('li');renderValue(x,li);ul.appendChild(li);});
  parent.appendChild(ul);
 }else if(v&&typeof v==='object'){
  var dl=el('dl','kv');
  Object.keys(v).forEach(function(k){dl.appendChild(el('dt',null,k));var dd=el('dd');renderValue(v[k],dd);dl.appendChild(dd);});
  parent.appendChild(dl);
 }else if(v===null||v===undefined||v===''){parent.appendChild(el('span','muted','\u2014'));}
 else if(typeof v==='boolean'){parent.textContent=v?'Ja':'Nee';}
 else parent.textContent=String(v);
}
function tagRow(parent,label,arr){
 parent.appendChild(el('dt',null,label));
 var dd=el('dd');
 if(arr&&arr.length)arr.forEach(function(t){dd.appendChild(el('span','tag',t));});
 else dd.appendChild(el('span','muted','\u2014'));
 parent.appendChild(dd);
}
function section(root,title){root.appendChild(el('h4',null,title));var d=el('div');root.appendChild(d);return d;}
function openDetail(it){
 var root=$('detail');
 if(root.hidden)lastFocus=document.activeElement;
 while(root.firstChild)root.removeChild(root.firstChild);
 var close=el('button','btn ghost','Sluiten');close.type='button';close.id='detail-close';close.addEventListener('click',closeDetail);
 root.appendChild(close);
 var h=el('h2',null,it.name);h.id='detail-title';h.tabIndex=-1;root.appendChild(h);
 root.appendChild(el('div','cid',it.id+' \u00b7 '+it.slug));
 root.appendChild(badge(it));
 if(isPending(it))root.appendChild(el('span','badge b-'+it.group,GROUP_LABEL[it.group]));
 root.appendChild(thumb(it,true));
 if(it.video){
  var vb=el('button','btn','Video laden (lokaal)');vb.type='button';
  vb.addEventListener('click',function(){
   var m=root.querySelector('.media');while(m.firstChild)m.removeChild(m.firstChild);
   var v=document.createElement('video');v.controls=true;v.preload='metadata';v.playsInline=true;v.muted=false;
   v.addEventListener('error',function(){m.textContent='Video niet beschikbaar';});
   v.src=it.video;m.appendChild(v);vb.remove();
  });
  root.appendChild(vb);
 }else root.appendChild(el('div','muted','Geen lokale video gevonden.'));

 if(isPending(it)){
  var st=section(root,'Status');
  st.appendChild(el('div','pend',PENDING+'. '+REASON[it.group]+' Dit is geen vrijgave of productiebelofte.'));
 }else{
  section(root,'Status').appendChild(el('div',null,'Bestaand in de bibliotheek (ongewijzigd).'));
 }
 if(isPending(it))draftControls(root,it);
 var src=section(root,'Brontermen (origineel)');
 var dl=el('dl','kv');
 if(it.nl)tagRow(dl,'Nederlands',[it.nl]);
 tagRow(dl,'Primair',it.primary);tagRow(dl,'Secundair',it.secondary);
 tagRow(dl,'Materiaal',it.equipment);
 if(it.patterns&&it.patterns.length)tagRow(dl,'Bewegingspatroon',it.patterns);
 if(it.difficulty)tagRow(dl,'Niveau',[it.difficulty]);
 src.appendChild(dl);

 if(it.group==='ai'||it.group==='term'){
  var p=section(root,it.group==='ai'?'AI-voorstel (niet bevestigd)':'Voorstel bronterm (niet bevestigd)');
  renderValue(it.proposal,p);
 }
 if(it.owner){
  var o=section(root,'Eigenaar');
  var od=el('dl','kv');
  od.appendChild(el('dt',null,'Keuze'));od.appendChild(el('dd',null,it.owner.label));
  if(it.owner.route){od.appendChild(el('dt',null,'Voorgestelde route'));od.appendChild(el('dd',null,it.owner.route));}
  o.appendChild(od);
  if(it.owner.note)o.appendChild(el('div','note',it.owner.note));
 }
 if(it.metadata){
  var m2=section(root,'Voorstel metadata (niet goedgekeurd)');
  renderValue(it.metadata,m2);
 }
 if(it.variant){
  var vs=section(root,'Variant-koppeling (niet automatisch ontdubbeld)');
  peerLink(vs,'Gekoppeld aan',it.variant.peer_catalog_id);
  renderValue({'video_bytes_identical':it.variant.video_bytes_identical},vs);
 }
 if(incoming[it.id]&&!(it.variant&&incoming[it.id].length===1&&incoming[it.id][0]===it.variant.peer_catalog_id)){
  var is=section(root,'Gekoppeld vanuit (niet automatisch ontdubbeld)');
  incoming[it.id].forEach(function(id){peerLink(is,'Verwijst naar deze oefening',id);});
 }
 root.hidden=false;root.scrollTop=0;
 $('scrim').hidden=false;$('page').inert=true;$('page').setAttribute('aria-hidden','true');
 try{history.replaceState(null,'','#'+it.id);}catch(e){}
 h.focus();
}
function msg(text,isErr){
 var m=$('dmsg');m.textContent=text;m.className=isErr?'err':'';m.setAttribute('role',isErr?'alert':'status');
}
function updateSummary(){
 var c=DR.counts(D);
 $('dsum').textContent='Concept-beoordeling van '+D.size+' nieuwe oefeningen (lokaal, niet bevestigd): '+
  STAT.map(function(s){return DLABEL[s]+' '+c[s];}).join(' \u00b7 ')+(dirty?' \u00b7 nog niet ge\u00ebxporteerd':'');
}
function setDec(id,status,note){
 var it=byId[id],cur=D.get(id);
 if(!it||!isPending(it)||!cur)return;
 if(status!==null){if(STAT.indexOf(status)<0)return;cur.status=status;}
 if(note!==null)cur.note=String(note).slice(0,DATA.draft.max_note);
 dirty=true;updateSummary();msg('',false);
 if(status!==null)render(true);
}
function draftControls(root,it){
 var cur=D.get(it.id),box=section(root,'Concept-beoordeling (alleen lokaal, voorlopig)');
 box.appendChild(el('div','pend',DWARN));
 var l1=el('label','dlab','Conceptstatus');l1.setAttribute('for','dec-status');box.appendChild(l1);
 var sel=el('select','dsel');sel.id='dec-status';
 STAT.forEach(function(s){var o=document.createElement('option');o.value=s;o.textContent=DLABEL[s];sel.appendChild(o);});
 sel.value=cur.status;
 sel.addEventListener('change',function(){setDec(it.id,sel.value,null);});
 box.appendChild(sel);
 var l2=el('label','dlab','Notitie (optioneel, max. '+DATA.draft.max_note+' tekens)');l2.setAttribute('for','dec-note');box.appendChild(l2);
 var ta=document.createElement('textarea');ta.id='dec-note';ta.className='dnote';ta.rows=3;ta.maxLength=DATA.draft.max_note;ta.value=cur.note;
 var cnt=el('div','muted',cur.note.length+'/'+DATA.draft.max_note);
 ta.addEventListener('input',function(){setDec(it.id,null,ta.value);cnt.textContent=ta.value.length+'/'+DATA.draft.max_note;});
 box.appendChild(ta);box.appendChild(cnt);
}
function doExport(){
 var iso=new Date().toISOString();
 var json=JSON.stringify(DR.build(D,iso),null,1)+'\n';
 var blob=new Blob([json],{type:'application/json'});
 if(blob.size>DATA.draft.max_bytes){msg('Export geweigerd (DRAFT_TOO_LARGE): verkort de notities.',true);return;}
 var url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='tk504-review-concept-'+iso.replace(/[:.]/g,'-')+'.json';a.rel='noopener';a.hidden=true;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(function(){URL.revokeObjectURL(url);},4000);
 dirty=false;updateSummary();
 msg('Concept lokaal aangeboden als download. Dit bestand is geen goedkeuring of vrijgave; bewaar het zelf.',false);
}
function doImport(e){
 var f=e.target.files&&e.target.files[0];e.target.value='';
 if(!f)return;
 function bad(code){msg('Import geweigerd ('+code+'). Het bestaande concept is ongewijzigd.',true);}
 if(f.size>DATA.draft.max_bytes){bad('DRAFT_TOO_LARGE');return;}
 f.text().then(function(t){
  var m;
  try{m=DR.parse(t);}catch(err){bad(/^DRAFT_[A-Z_]+$/.test(err&&err.message)?err.message:'DRAFT_INVALID');return;}
  D=m;dirty=false;updateSummary();render(true);
  msg('Concept hersteld uit bestand. Dit is een lokaal concept, geen goedkeuring of vrijgave.',false);
 },function(){bad('DRAFT_READ_FAILED');});
}
function peerLink(parent,label,id){
 var row=el('div');row.appendChild(el('span','muted',label+': '));
 var t=byId[id];
 if(t){
  var lk=el('button','link',t.name+' ('+id+')');lk.type='button';
  lk.addEventListener('click',function(){openDetail(t);});
  row.appendChild(lk);
  row.appendChild(el('span','badge '+(isPending(t)?'b-'+t.group:'b-published'),isPending(t)?PENDING:'Bestaand · ongewijzigd'));
 }else row.appendChild(el('span','muted',id+' (niet in deze bibliotheek)'));
 parent.appendChild(row);
}
function closeDetail(){
 var r=$('detail');if(r.hidden)return;
 while(r.firstChild)r.removeChild(r.firstChild);
 r.hidden=true;$('scrim').hidden=true;$('page').inert=false;$('page').removeAttribute('aria-hidden');
 try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
 var f=lastFocus;lastFocus=null;
 if(f&&f.isConnected&&f.focus)f.focus();else $('q').focus();
}
function trap(e){
 var r=$('detail');if(r.hidden||e.key!=='Tab')return;
 var f=Array.prototype.filter.call(r.querySelectorAll('button,[href],input,select,textarea,video[controls],[tabindex]:not([tabindex="-1"])'),function(x){return !x.disabled;});
 if(!f.length){e.preventDefault();return;}
 var first=f[0],last=f[f.length-1],a=document.activeElement;
 if(e.shiftKey&&(a===first||!r.contains(a))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&(a===last||!r.contains(a))){e.preventDefault();first.focus();}
}

function uniq(get){
 var s={};items.forEach(function(it){get(it).forEach(function(t){s[t]=1;});});
 return Object.keys(s).sort(cmp);
}
function fill(sel,vals){vals.forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);});}
function init(){
 var n={published:0,ai:0,term:0,owner:0};items.forEach(function(it){n[it.group]++;});
 var pend=n.ai+n.term+n.owner;
 $('n-all').textContent=items.length;$('n-pub').textContent=n.published;$('n-pend').textContent=pend;
 $('n-ai').textContent=n.ai;$('n-term').textContent=n.term;$('n-owner').textContent=n.owner;
 fill($('equipment'),uniq(function(it){return it.equipment;}));
 fill($('muscle'),uniq(function(it){return it.primary.concat(it.secondary);}));
 Array.prototype.forEach.call(document.querySelectorAll('[data-group]'),function(t){
  t.addEventListener('click',function(){S.group=t.getAttribute('data-group');render();});});
 $('group').addEventListener('change',function(e){S.group=e.target.value;render();});
 $('q').addEventListener('input',function(e){var v=e.target.value;clearTimeout(qTimer);qTimer=setTimeout(function(){S.q=v;render();},120);});
 $('owner').addEventListener('change',function(e){S.owner=e.target.value;render();});
 $('more').addEventListener('click',function(){S.limit+=PAGE*2;render(true);});
 $('scrim').addEventListener('click',closeDetail);
 $('exact').addEventListener('change',function(e){S.exact=e.target.checked;render();});
 $('equipment').addEventListener('change',function(e){S.equipment=e.target.value;render();});
 $('muscle').addEventListener('change',function(e){S.muscle=e.target.value;render();});
 $('video').addEventListener('change',function(e){S.video=e.target.checked;render();});
 $('sort').addEventListener('change',function(e){S.sort=e.target.value;render();});
 STAT.forEach(function(s){var o=document.createElement('option');o.value=s;o.textContent=DLABEL[s];$('dstatus').appendChild(o);});
 $('dstatus').addEventListener('change',function(e){S.dec=e.target.value;render();});
 $('dexport').addEventListener('click',doExport);
 $('dimport').addEventListener('change',doImport);
 window.addEventListener('beforeunload',function(e){if(dirty){e.preventDefault();e.returnValue='';}});
 updateSummary();
 $('reset').addEventListener('click',function(){
  clearTimeout(qTimer);
  S={q:'',exact:false,group:'all',owner:'',equipment:'',muscle:'',video:false,sort:'name',dec:'',limit:PAGE};
  $('dstatus').value='';$('q').value='';$('owner').value='';$('exact').checked=false;$('equipment').value='';$('muscle').value='';
  $('video').checked=false;$('sort').value='name';render();});
 document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeDetail();return;}
  trap(e);
  var t=e.target&&e.target.tagName;
  if(e.key==='/'&&t!=='INPUT'&&t!=='SELECT'&&$('detail').hidden){e.preventDefault();$('q').focus();}
 });
 var oc={},on={};
 items.forEach(function(it){if(it.owner){oc[it.owner.choice]=it.owner.label;on[it.owner.choice]=(on[it.owner.choice]||0)+1;}});
 Object.keys(oc).sort().forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=oc[k]+' ('+on[k]+')';$('owner').appendChild(o);});
 render();
 var m=/^#(TK-\d{6})$/.exec(location.hash||'');
 if(m&&byId[m[1]]){openDetail(byId[m[1]]);}
}
init();
})();
'''
SCRIPT = SCRIPT_TEMPLATE.replace('/*DRAFT_LIB*/', DRAFT_LIB)

BODY = '''<header class="top"><h1>Trainingskompas \u00b7 Oefeningenbibliotheek \u2014 priv\u00e9 beoordeling</h1>
<p>Lokale voorbeeldweergave van alle MoveKit-oefeningen. Alleen voor de eigenaar.</p></header>
<div class="banner">Priv\u00e9 en niet vrijgegeven: niets is gepubliceerd, er is geen koppeling met de app en er zijn geen mediarechten toegekend. Video's en posters worden alleen lokaal geopend.</div>
<noscript><div class="banner">Voor deze pagina is JavaScript nodig.</div></noscript>
<div class="wrap" id="page">
<div class="tiles">
<button type="button" class="tile" data-group="all"><b id="n-all">0</b><span>Alle oefeningen</span></button>
<button type="button" class="tile" data-group="published"><b id="n-pub">0</b><span>Bestaand (ongewijzigd)</span></button>
<button type="button" class="tile" data-group="pending"><b id="n-pend">0</b><span>Nieuw \u2014 in afwachting inhoudelijke vrijgave</span></button>
<button type="button" class="tile sub" data-group="ai"><b id="n-ai">0</b><span>AI-voorstel</span></button>
<button type="button" class="tile sub" data-group="term"><b id="n-term">0</b><span>Alleen bronterm</span></button>
<button type="button" class="tile sub" data-group="owner"><b id="n-owner">0</b><span>Eigenaar-feedback</span></button>
</div>
<section class="draft" aria-labelledby="draft-h"><h2 id="draft-h">Concept-beoordeling (alleen lokaal)</h2>
<div class="pend">Dit is GEEN geauthenticeerde goedkeuring, geen vrijgave en geen rechtenverlening. Keuzes blijven alleen in het geheugen van dit tabblad tot je zelf op exporteren klikt; sluit je de pagina eerst, dan zijn ze weg. De 226 bestaande oefeningen hebben geen concept-keuze.</div>
<div class="count" id="dsum"></div>
<div class="row"><button type="button" class="btn" id="dexport">Concept exporteren (JSON)</button>
<label for="dimport">Concept importeren (JSON, max. 512 KiB):</label><input type="file" id="dimport" accept=".json,application/json"></div>
<p id="dmsg" role="status" aria-live="polite"></p></section>
<div class="tools">
<input type="search" id="q" placeholder="Zoek op naam, ID, spier of materiaal" aria-label="Zoeken" autocomplete="off">
<label><input type="checkbox" id="exact"> Exacte term</label>
<select id="group" aria-label="Status"><option value="all">Alle statussen</option><option value="published">Bestaand</option><option value="pending">Nieuw (alle)</option><option value="ai">AI-voorstel</option><option value="term">Alleen bronterm</option><option value="owner">Eigenaar-feedback</option></select>
<select id="owner" aria-label="Eigenaar-keuze"><option value="">Alle eigenaar-keuzes</option></select>
<select id="equipment" aria-label="Materiaal"><option value="">Alle materiaal</option></select>
<select id="muscle" aria-label="Spiergroep"><option value="">Alle spieren</option></select>
<select id="dstatus" aria-label="Conceptstatus"><option value="">Alle conceptstatussen</option></select>
<label><input type="checkbox" id="video"> Met lokale video</label>
<select id="sort" aria-label="Sorteren"><option value="name">Naam A\u2013Z</option><option value="name-desc">Naam Z\u2013A</option><option value="id">ID</option><option value="status">Status</option></select>
<button type="button" class="btn ghost" id="reset">Herstel</button>
</div>
<div class="count" id="count"></div>
<div class="grid" id="grid"></div>
<button type="button" class="btn ghost more" id="more" hidden>Toon meer</button>
<div class="empty" id="empty" hidden>Geen oefeningen gevonden voor deze selectie.</div>
</div>
<div id="scrim" hidden></div>
<aside id="detail" hidden role="dialog" aria-modal="true" aria-labelledby="detail-title"></aside>'''


def render_html(items, draft):
    data = safe_json({'items': items, 'draft': draft})
    csp = ("default-src 'none'; script-src %s; style-src %s; img-src file: data:; "
           "media-src file:; base-uri 'none'; form-action 'none'; frame-src 'none'; "
           "object-src 'none'" % (sri(SCRIPT), sri(STYLE)))
    return ('<!doctype html>\n<html lang="nl"><head><meta charset="utf-8">\n'
            '<meta http-equiv="Content-Security-Policy" content="' + csp + '">\n'
            '<meta name="referrer" content="no-referrer">\n'
            '<meta name="robots" content="noindex,nofollow,noarchive">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            '<title>Priv\u00e9 oefeningenbibliotheek \u2014 niet vrijgegeven</title>\n'
            '<style>' + STYLE + '</style></head><body>\n' + BODY + '\n'
            '<script type="application/json" id="tk-data">' + data + '</script>\n'
            '<script>' + SCRIPT + '</script>\n</body></html>\n')


# ---------------------------------------------------------------- entry
def generate(source_directory, staged_catalog, output, baseline_catalog=None, video_directory=None):
    source, private = resolve_private(source_directory)
    staged = resolve_staged(staged_catalog, private)
    target = resolve_output(output, private, staged)
    stage_bytes = staged.read_bytes()
    stage = json.loads(stage_bytes.decode('utf8'))
    baseline = None
    if baseline_catalog is not None:
        raw = json.loads(Path(baseline_catalog).read_text(encoding='utf8'))
        baseline = raw.get('catalog') if isinstance(raw, dict) else raw
    counts = validate_stage(stage, baseline)
    poster_dir = private / POSTER_DIRNAME
    poster_dir = poster_dir.resolve() if poster_dir.is_dir() and not poster_dir.is_symlink() else None
    video_dir = find_video_dir(source, video_directory)
    items = build_items(stage, poster_dir, video_dir, private)
    draft = draft_binding(stage, stage_bytes)
    page = render_html(items, draft)
    with open(target, 'x', encoding='utf8', newline='\n') as handle:  # never overwrites
        handle.write(page)
    return {'status': 'PRIVATE_LOCAL_REVIEW_PAGE_NOT_PUBLISHED', 'total': len(items),
            'groups': counts,
            'posters_found': sum(1 for x in items if x['poster']),
            'videos_found': sum(1 for x in items if x['video']),
            'baseline_compared': baseline is not None,
            'draft_stage_sha256': draft['stage_sha256'],
            'draft_manifest_sha256': draft['manifest_sha256'],
            'output': str(target)}


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-directory', required=True)
    p.add_argument('--staged-catalog', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--baseline-catalog', default=None,
                   help='optional read-only exercise-catalog.json to prove the 226 are unchanged')
    p.add_argument('--video-directory', default=None)
    a = p.parse_args(argv)
    try:
        result = generate(a.source_directory, a.staged_catalog, a.output,
                          a.baseline_catalog, a.video_directory)
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print('FAILED: ' + str(exc), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
