'use strict';
// TK504 security regression: no legacy MoveKit poster/public URL can bypass
// authenticated V2 poster signing when the compiled private release is on.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const PUBLIC='https://public.example.invalid/legacy-movekit-poster.webp';
const ALTERNATIVE='https://assets.example.invalid/other-provider-poster.webp';
const CAT='TK-000206';
const providerStart=html.indexOf('var ExerciseAssetProvider=(function(){');
const providerEnd=html.indexOf('/* ═══ Sprint 11A',providerStart);
assert.ok(providerStart>=0 && providerEnd>providerStart,'Canonical provider block found');
const source=html.slice(providerStart,providerEnd);
let checks=0;
function ok(value,name){assert.ok(value,name);checks++;}
function provider(privateMode){
 const ctx=vm.createContext({
   EXERCISE_POSTERS:{'wall-sit':PUBLIC},
   EXERCISE_ASSETS:[],
   ExerciseCatalogService:{byId:id=>id===CAT?{
      catalog_id:CAT,source:{provider:'movekit',provider_id:'wall-sit'}
   }:null,all:()=>[]},
   tk504PrivateEnabled:()=>privateMode
 });
 vm.runInContext(source,ctx);
 return ctx.ExerciseAssetProvider;
}
const legacy=provider(false);
ok(legacy.poster(CAT)===PUBLIC,'Legacy poster remains with feature OFF');
ok(legacy.thumb(CAT)===PUBLIC,'Legacy thumbnail remains with feature OFF');
ok(legacy.resolve(CAT,'poster')===PUBLIC,'Legacy generic media resolves');
ok(legacy.has(CAT,'poster')===true,'Legacy availability unchanged');
const secure=provider(true);
ok(secure.poster(CAT)===null,'No direct public poster in private mode');
ok(secure.thumb(CAT)===null,'No public thumbnail in private mode');
ok(secure.resolve(CAT,'poster')===null,'Cannot bypass by generic provider.resolve');
ok(secure.has(CAT,'poster')===false,'Cannot claim legacy poster available');
ok(secure.register('poster',{id:'other-vendor',resolve:()=>ALTERNATIVE,has:()=>true}),
  'Vendor-neutral poster registry remains supported');
ok(secure.poster(CAT)===ALTERNATIVE,'Unrelated future provider is not blocked');
ok(secure.resolve(CAT,'poster')===ALTERNATIVE,'Other provider resolves normally');
const start=html.indexOf('function tk504PrivateVideoMarkup(catalogId,poster,label){');
const end=html.indexOf('async function tk504PlayPrivateVideo(',start);
ok(start>=0&&end>start,'Private markup function present');
const ctxt=vm.createContext({escHtml:v=>String(v)});
vm.runInContext(html.slice(start,end),ctxt);
const markup=ctxt.tk504PrivateVideoMarkup(CAT,PUBLIC,'Wall sit');
ok(markup.includes('Video afspelen'),'Signed-video click target still present');
ok(!markup.includes(PUBLIC),'Public raw poster never rendered in private markup');
ok(!markup.includes('<img '),'Private preview has no unauthorized image element');
ok(ctxt.tk504PrivateVideoMarkup('bad-id',PUBLIC,'x')==='','Invalid catalog ID rejected');
const mediaStart=html.indexOf('function resolveExerciseMedia(ex){');
const mediaEnd=html.indexOf('// UNIVERSELE RECOVERY',mediaStart);
ok(mediaStart>=0&&mediaEnd>mediaStart,'Existing media resolver present');
const vctx=vm.createContext({
   tk504PrivateEnabled:()=>true,
   ExerciseCatalogService:{byId:id=>id===CAT?{
      catalog_id:CAT,source:{provider:'movekit',provider_id:'wall-sit'}
   }:null},
   ExerciseAssetProvider:{has:()=>true,hasVideo:()=>true,
      resolve:()=>PUBLIC,poster:()=>PUBLIC,video:()=>({file:'videos/wall-sit.mp4'})},
   movekitPosterFor:()=>PUBLIC
});
vm.runInContext(html.slice(mediaStart,mediaEnd),vctx);
const info=vctx.resolveExerciseMedia({catalog_id:CAT,source:{provider:'movekit',provider_id:'wall-sit'}});
ok(info.kind==='private-mp4','Secure exercise card recognized');
ok(info.poster===null,'Secure media descriptor never includes public poster');
const blockStart=html.indexOf('function _videoBlock(id){');
const blockEnd=html.indexOf('/* Lazy player:',blockStart);
ok(blockStart>=0&&blockEnd>blockStart,'Existing library video renderer present');
const lctx=vm.createContext({
 tk504PrivateEnabled:()=>true,
 ExerciseAssetProvider:{has:()=>true,video:()=>({duration:6,resolution_label:'1080p'}),
 resolve:()=>PUBLIC,poster:()=>PUBLIC},
 _fmtDur:()=> '0:06',escHtml:x=>String(x)
});
vm.runInContext(html.slice(blockStart,blockEnd),lctx);
const libraryHtml=lctx._videoBlock(CAT);
ok(!libraryHtml.includes(PUBLIC),'Library video tile does not expose public poster');
ok(!libraryHtml.includes('data-vsrc='),'Library tile does not expose raw video');
// Verify the two original intelligence/ECS bypass paths independently.
const intelStart=html.indexOf('function getExerciseAsset(ex){');
const intelEnd=html.indexOf('function _intelInjectPoster(',intelStart);
ok(intelStart>=0&&intelEnd>intelStart,'Original intelligence asset reader present');
const intelSource=html.slice(intelStart,intelEnd);
function intelligence(privateMode){
  const asset={movekit_slug:'barbell-bench-press',poster:PUBLIC,technique:['safe cue'],mistakes:[]};
  const context=vm.createContext({
    tk504PrivateEnabled:()=>privateMode,
    ExerciseCatalogService:{byId:()=>null},
    _intelById:{legacy:asset},_intelByName:{},
    _intelNorm:v=>v,_intelBuildIndex:()=>{}
  });
  vm.runInContext(intelSource+'\nresult=getExerciseAsset({id:"legacy",naam:"legacy"});',context);
  return context.result;
}
ok(intelligence(false).poster===PUBLIC,'Legacy intelligence poster is preserved before cutover');
ok(intelligence(true).poster===null,'Intelligence fallback strips MoveKit embedded poster');
ok(intelligence(true).technique[0]==='safe cue','Intelligence technique remains intact');
const ecsStart=html.indexOf('resolveAsset:function(item,type){');
const ecsEnd=html.indexOf('    hasAsset:function(',ecsStart);
ok(ecsStart>=0&&ecsEnd>ecsStart,'Canonical ECS asset method present');
const ecsSource=html.slice(ecsStart,ecsEnd).replace(/,\s*$/,'');
function resolveEcs(privateMode,sourceProvider){
 const ctx=vm.createContext({
   tk504PrivateEnabled:()=>privateMode,
   EXERCISE_ASSETS:[{movekit_slug:'barbell-bench-press',poster:PUBLIC}],
   item:{source:{provider:sourceProvider},assets:[{type:'poster',embedded:true,ref:'barbell-bench-press'}]}
 });
 vm.runInContext('obj={'+ecsSource+'};result=obj.resolveAsset(item,"poster");',ctx);
 return ctx.result;
}
ok(resolveEcs(false,'movekit').src===PUBLIC,'Legacy ECS embedded poster works while feature OFF');
ok(resolveEcs(true,'movekit')===null,'ECS cannot expose embedded MoveKit poster with feature ON');
ok(resolveEcs(true,'other')===null,'ECS does not leak legacy embedded poster for other provider IDs');
console.log('TK504 private poster isolation: '+checks+' checks PASS, including both Claude-detected bypasses');
