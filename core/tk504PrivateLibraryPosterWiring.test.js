'use strict';
// Full original-library thumbnail path, not a second picker/gallery.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const CID='TK-000206',OTHER='TK-000999';
const PRIVATE='https://storage.example.invalid/signed-poster?token=PRIVATE';
const PUBLIC='https://media.example.invalid/old-public-movekit-poster.webp';
function take(name){
 const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(m,'Missing real function: '+name);
 let depth=0;
 for(let i=html.indexOf('{',m.index);i<html.length;i++){
  if(html[i]==='{')depth++;
  if(html[i]==='}'&&!--depth)return html.slice(m.index,i+1);
 }
 throw Error('Unclosed '+name);
}
const loader=take('tk504LoadPrivateLibraryPoster');
const lib=take('_libLoad');
const invalidate=take('tk504InvalidateProtectedMedia');
function image(id){
 const attrs={'data-aid':id}, classes=new Set(), parent={classes:new Set(),
   classList:{add(v){parent.classes.add(v);},remove(v){parent.classes.delete(v);}}};
 return {
  attrs,src:null,parentNode:parent,isConnected:true,_done:0,
  classList:{add(v){classes.add(v);},remove(v){classes.delete(v);},contains(v){return classes.has(v);}},
  setAttribute(k,v){attrs[k]=v;},removeAttribute(k){delete attrs[k];if(k==='src')this.src=null;},
  getAttribute(k){return attrs[k]||null;}
 };
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(opts={}){
 let resolveTicket,signCalls=[],oldCalls=0,invalidated=0,owner='owner-A',release=opts.release!==false;
 const images=[];
 const getOwner=()=>owner;
 const ctx=vm.createContext({
  Promise,Date,
  authSession:{user:{id:owner}},
  tk504PosterEpoch:0,
  tk504PrivateEnabled:()=>release,
  ExerciseCatalogService:{byId:id=>id===CID?{catalog_id:CID,source:{provider:'movekit'}}:{catalog_id:id,source:{provider:'other'}}},
  ExerciseAssetProvider:{poster:()=>{oldCalls++;return PUBLIC;}},
  tk504GetMediaRuntime:()=>({signed:(id,type)=>{signCalls.push([id,type]);return new Promise(resolve=>{resolveTicket=resolve;});},
   invalidate:()=>{invalidated++;}}),
  tk504MediaRuntime:{invalidate:()=>{invalidated++;}},
  document:{querySelectorAll:()=>images},
  self:{},console
 });
 vm.runInContext(loader+'\n'+lib+'\n'+invalidate,ctx);
 return {ctx,images,make:(id=CID)=>{const i=image(id);images.push(i);return i;},
  setOwner:v=>{owner=v;ctx.authSession={user:{id:v}};},setRelease:v=>{release=v;},
  complete:v=>resolveTicket(v),get calls(){return signCalls;},get legacy(){return oldCalls;}};
}
(async()=>{
 const a=harness(),img=a.make();
 a.ctx._libLoad(img);
 await tick();
 assert.equal(a.legacy,0,'private library must not attempt public poster');
 assert.deepEqual(a.calls,[[CID,'poster']]);
 assert.equal(img.src,null,'no raw URL before authenticated ticket');
 a.complete({catalogId:CID,type:'poster',url:PRIVATE});
 await tick();
 assert.equal(img.src,PRIVATE,'existing library img receives signed poster');
 assert.equal(img.getAttribute('data-tk504-protected'),'true');
 img.onload();assert(img.classList.contains('is-loaded'));
 a.ctx.tk504InvalidateProtectedMedia();
 assert.equal(img.src,null,'logout/account-switch removes signed image src');
 assert.equal(img.classList.contains('is-loaded'),false);

 const stale=harness(),staleImg=stale.make();
 stale.ctx._libLoad(staleImg);await tick();stale.setOwner('owner-B');
 stale.ctx.tk504InvalidateProtectedMedia();
 stale.complete({catalogId:CID,type:'poster',url:PRIVATE});await tick();
 assert.equal(staleImg.src,null,'late signed result cannot restore old-account media');

 const detached=harness(),gone=detached.make();detached.ctx._libLoad(gone);await tick();
 gone.isConnected=false;detached.complete({catalogId:CID,type:'poster',url:PRIVATE});await tick();
 assert.equal(gone.src,null,'removed cards cannot receive signed ticket');

 const denied=harness(),deniedImg=denied.make();denied.ctx._libLoad(deniedImg);await tick();
 denied.complete(null);await tick();assert.equal(deniedImg.src,null);
 assert(deniedImg.parentNode.classes.has('no-img'),'denied private poster shows existing placeholder');

 const other=harness(),legacyImg=other.make(OTHER);
 other.ctx._libLoad(legacyImg);
 assert.equal(other.legacy,1,'other provider path retains existing behavior');
 assert.equal(legacyImg.src,PUBLIC);
 const v1=harness({release:false}),v1Img=v1.make();v1.ctx._libLoad(v1Img);
 assert.equal(v1.legacy,1,'feature OFF must retain legacy MoveKit poster');
 assert.equal(v1Img.src,PUBLIC);
 console.log('TK504 existing-library private posters: 7 safety scenarios PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});
