'use strict';
/* TK504: browser-ready MoveKit V2 modules without require/module, no runtime activation. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const first=html.indexOf('var ExerciseCatalogService=(function(){'),last=html.indexOf('})();',first);
assert(first>0&&last>first);
const catalog=Array.from({length:582},(_,i)=>{
 const n=i+1,pending=n>226;
 return {catalog_id:'TK-'+String(n).padStart(6,'0'),source:{provider:'movekit',provider_id:'synthetic-'+n},
  identity:{name:'Synthetic '+n,category:pending?'pending_review':'strength',
   primary:n===227?['Forearms']:['Quadriceps'],secondary:[],
   equipment:n===227?['Bench']:['bodyweight'],difficulty:'beginner'},
  flags:{favorite:false,home_gym_ready:false,travel_ready:false},assets:[],
  ...(pending?{_review:{status:'NOT_PUBLISHED'}}:{})};
});
const files=[['movekitV2SourceFacets.js','MoveKitV2SourceFacets'],
 ['movekitV2ReviewEligibility.js','MoveKitV2ReviewEligibility'],
 ['movekitV2DarkLaunchGate.js','MoveKitV2DarkLaunchGate'],
 ['movekitV2TkCatalogAdapter.js','MoveKitV2TkCatalogAdapter']];
const src=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const ctx=vm.createContext({catalogJson:JSON.stringify(catalog),
 favoriteExIds:new Set(),localStorage:{getItem:()=>null,setItem:()=>{}},
 performance:{now:()=>0},console:{log(){}},
 registryJson:fs.readFileSync(path.join(ROOT,'tools/movekit-v2-taxonomy-map.json'),'utf8')});
vm.runInContext('var EX_CATALOG={catalog:JSON.parse(catalogJson)};',ctx);
let pass=0;
function check(name,fn){fn();pass++;console.log('PASS '+name);}
check('standalone browser globals available without module/require',()=>{
 for(const [file,name] of files){
  vm.runInContext(src(file),ctx,{filename:file,timeout:3000});
  assert.equal(typeof ctx[name],'object',name);assert(Object.isFrozen(ctx[name]),name);
 }
});
check('real shipped ExerciseCatalogService coexists with browser MoveKit modules',()=>{
 vm.runInContext(html.slice(first,last+5),ctx,{timeout:4000});
 assert.equal(typeof ctx.ExerciseCatalogService.search,'function');
});
check('missing browser dependencies fail closed',()=>{
 const bad=vm.createContext({});
 vm.runInContext(src('movekitV2TkCatalogAdapter.js'),bad,{timeout:3000});
 assert.throws(()=>bad.MoveKitV2TkCatalogAdapter.create({}),/MOVEKIT_V2_DEPENDENCIES_NOT_READY/);
});
check('dark-launch default does not expose even published exercises',()=>{
 vm.runInContext("var registry=JSON.parse(registryJson);"+
 "var published=EX_CATALOG.catalog.slice(0,226).map(e=>({catalog_id:e.catalog_id,source:e.source}));"+
 "var pending=EX_CATALOG.catalog.slice(226).map(e=>({catalog_id:e.catalog_id,source:e.source}));"+
 "var disabled=MoveKitV2TkCatalogAdapter.create({catalogService:ExerciseCatalogService,"+
 "launchGate:MoveKitV2DarkLaunchGate.create({}),grantProvider:()=>({}),"+
 "registry,baseline:published,pending});",ctx,{timeout:3000});
 assert.equal(ctx.disabled.search('').total,0);
 assert.equal(ctx.disabled.productionEnabled,false);
});
check('synthetic authorized browser gate keeps 356 pending nonselectable',()=>{
 vm.runInContext("var gate=MoveKitV2DarkLaunchGate.create({getAccountId:()=> 'synthetic-account',"+
 "now:()=>100000,verifyServerGrant:()=>true});"+
 "var adapter=MoveKitV2TkCatalogAdapter.create({catalogService:ExerciseCatalogService,"+
 "launchGate:gate,grantProvider:()=>({issuer:'tk-server',scope:MoveKitV2DarkLaunchGate.SCOPE,"+
 "accountId:'synthetic-account',expiresAtMs:110000}),registry,baseline:published,pending});",
 ctx,{timeout:3000});
 assert.equal(ctx.adapter.search('').total,226);
 assert.equal(vm.runInContext("adapter.search('',{},'name',{includePending:true,limit:200}).total",ctx),582);
 assert.equal(ctx.adapter.assetIdentity('TK-000227').ok,false);
 assert.equal(ctx.adapter.assetIdentity('TK-000001').ok,true);
 assert.equal(vm.runInContext("adapter.search('',{movekitSourceMuscle:'movekit:muscle:forearms'},undefined,{includePending:true}).total",ctx),1);
});
check('live app index.html remains unmapped, no accidental V2 scripts',()=>{
 for(const [file] of files)assert(!html.includes(file),file);
});
console.log('TK504 browser UMD integration: '+pass+' checks PASS; app remains unwired');
