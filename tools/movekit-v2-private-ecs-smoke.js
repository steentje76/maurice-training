'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createReviewSearch,FILTERS}=require('../core/movekitV2EcsReviewAdapter.js');
const root=path.resolve(__dirname,'..');
const stageFile=path.resolve(process.argv[2]||'');
if(path.basename(path.dirname(stageFile)) !== '.tk-private-review' ||
   path.extname(stageFile).toLowerCase() !== '.json')throw new Error('PRIVATE_FILE_ONLY');
const stage=JSON.parse(fs.readFileSync(stageFile,'utf8'));
const map=JSON.parse(fs.readFileSync(path.join(root,'tools/movekit-v2-taxonomy-map.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const a=html.indexOf('var ExerciseCatalogService=(function(){'),b=html.indexOf('})();',a);
assert(a>0&&b>a);
const ctx={EX_CATALOG:JSON.parse(JSON.stringify(stage)),
 localStorage:{getItem:()=>null,setItem:()=>{}},
 favoriteExIds:new Set(),performance:{now:()=>0}};
vm.runInNewContext(html.slice(a,b+5),ctx,{timeout:10000});
const svc=ctx.ExerciseCatalogService;
const bridge=createReviewSearch({stage,catalogService:svc,registry:map});
const forearms=bridge.search('',{[FILTERS.muscle]:'movekit:muscle:forearms'});
const lower=bridge.search('',{[FILTERS.muscle]:'movekit:muscle:lower_back'});
const bench=bridge.search('',{[FILTERS.equipment]:'movekit:equipment:bench'});
assert.equal(bridge.search('').length,582);
assert.equal(bridge.search('',{category:'pending_review'}).length,356);
assert(svc.validateIndex().ok);
assert(forearms.length>0&&lower.length>0&&bench.length>0);
for(const item of forearms)assert(item.identity.primary.concat(item.identity.secondary).includes('Forearms'));
for(const item of lower)assert(item.identity.primary.concat(item.identity.secondary).includes('Lower Back'));
for(const item of bench)assert(item.identity.equipment.includes('Bench'));
console.log(JSON.stringify({status:'REAL_ECS_PRIVATE_REVIEW_PASS',catalog:582,
 newPending:356,forearms:forearms.length,lowerBack:lower.length,bench:bench.length,
 indexIntegrity:true,dbWrites:0,activated:false,licensedTextLogged:false}));
