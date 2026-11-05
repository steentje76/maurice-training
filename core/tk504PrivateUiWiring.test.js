'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
function segment(start,end){
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Expected source segment '+start);
 return html.slice(a,b);
}
let checks=0;
function ok(test,message){assert.ok(test,message);checks++}
const published=new Map([
 ['TK-000001',{catalog_id:'TK-000001',source:{provider:'movekit',provider_id:'abdominals-stretch-variation-four'}}]
]);
const assets={
 has:()=>true,hasVideo:()=>true,
 resolve:()=> 'https://maurice-art.netlify.app/videos/abdominals-stretch-variation-four.mp4',
 video:()=>({file:'videos/abdominals-stretch-variation-four.mp4'}),
 poster:()=>null
};
const resolver=segment('function resolveExerciseMedia(ex){','// UNIVERSELE RECOVERY');
function media(privateEnabled,exercise){
 const sandbox={ExerciseAssetProvider:assets,ExerciseCatalogService:{byId:id=>published.get(id)||null},
   movekitPosterFor:()=>null,tk504PrivateEnabled:()=>privateEnabled};
 const context=vm.createContext({...sandbox,input:exercise,result:null});
 vm.runInContext(resolver+'\nresult=resolveExerciseMedia(input);',context);
 return context.result;
}
let got=media(true,{canonicalId:'TK-000001',id:'TK-000001'});
ok(got.kind==='private-mp4','Published canonical media uses private path');
ok(got.catalogId==='TK-000001','Canonical ID unchanged');
ok(!Object.hasOwn(got,'src'),'Never return raw URL in private mode');
got=media(true,{id:'TK-000001'});
ok(got.kind==='none','Id-only legacy row must not be authorized');
got=media(true,{canonicalId:'TK-000001',scope:'personal'});
ok(got.kind==='none','Personal legacy collision must be denied');
got=media(true,{canonicalId:'TK-000001',source:{provider:'movekit',provider_id:'wrong-exercise'}});
ok(got.kind==='none','Provider identity mismatch never binds a different exercise');
got=media(true,{canonicalId:'TK-000227',video:'videos/unpublished.mp4'});
ok(got.kind==='none','356 candidates never sign or fall back to public video');
got=media(false,{canonicalId:'TK-000001'});
ok(got.kind==='mp4','Legacy media preserved when release disabled');
ok(/const TK504_PRIVATE_MEDIA_RELEASE = false;/.test(html),'Private release defaults off');
ok(/function tk504InvalidateProtectedMedia/.test(html),'User logout invalidates media');
ok(/function clearAuthSession\(\)\{\s*tk504InvalidateProtectedMedia\(\)/.test(html),'Logout triggers invalidation');
ok(/'private-mp4'/.test(segment('function openExecExplain(t){','// ── F0.8')),'Execution explain recognizes private media');
ok(/tk504PrivateVideoMarkup/.test(segment('function buildVideoMuscle(ex){','// Strength Basis Recency')),'Existing workout media recognizes private source');
const block=segment('function _videoBlock(id){','/* Lazy player:');
const fakeElement={ getAttribute(key){return key==='data-vid'?'TK-000001':null;} };
function rendered(privateEnabled){
 const sb={ExerciseAssetProvider:assets,tk504PrivateEnabled:()=>privateEnabled,escHtml:x=>x,
   _fmtDur:x=>String(x)};
 const context=vm.createContext({...sb,result:null});
 vm.runInContext(block+'\nresult=_videoBlock("TK-000001");',context);
 return context.result;
}
ok(!rendered(true).includes('data-vsrc='),'No public raw URL in private catalog markup');
ok(rendered(false).includes('data-vsrc='),'Legacy release path unchanged');
ok(/tk504PlayPrivateVideo\(el,id\)/.test(segment('function _libPlayVideo(el){','function _lib')),'Catalog video button uses authorized player');
ok(/tk504PlayPrivateVideo/.test(html),'Authorized player bound');
ok(/core\/privateMoveKitV2MediaClient\.js/.test(html),'Existing HTML loads media client');
ok(/core\/tk504ProtectedPlayback\.js/.test(html),'Existing HTML loads canonical adapter');
console.log('TK504 UI wiring: '+checks+' deterministic authorization/identity/render assertions PASS; private release OFF');
