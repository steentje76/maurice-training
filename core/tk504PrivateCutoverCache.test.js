'use strict';
/* TK504 — old public cache must be removed atomically with private release.
 * Client release flags are code-only, never localStorage/user controlled.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
let passed=0;
function check(condition,message){assert.ok(condition,message);passed++;}
const htmlGate=html.match(/const TK504_PRIVATE_MEDIA_RELEASE\s*=\s*(true|false);/);
const swGate=sw.match(/const TK504_PRIVATE_MEDIA_CUTOVER\s*=\s*(true|false);/);
check(!!htmlGate,'private player gate exists');
check(!!swGate,'SW raw-video cutover gate exists');
check(htmlGate[1]===swGate[1],'SW and player cutover MUST match exactly');
check(htmlGate[1]==='false','protected media remains unreleased');
check(/'supabase\.co'/.test(sw),'storage-signed URLs excluded from SW cache');
check(/CACHE_VIDEOS\s*=\s*'tk-videos-v1'/.test(sw),'legacy video cache identified');
const actStart=sw.indexOf("self.addEventListener('activate',");
const actEnd=sw.indexOf('// ── VIDEO CACHE:',actStart);
check(actStart>0&&actEnd>actStart,'service worker activate handler exists');
const activation=sw.slice(actStart,actEnd);
async function simulateActivate(flag){
 let handler,finished;
 const removed=[];
 const keys=['trainingskompas-v470251','trainingskompas-static-v470251',
   'trainingskompas-v470252','trainingskompas-static-v470252','tk-videos-v1'];
 const ctx=vm.createContext({
   self:{addEventListener:(event,fn)=>{if(event==='activate')handler=fn;},
         clients:{claim:async()=>true}},
   caches:{keys:async()=>keys,delete:async name=>{removed.push(name);return true;}},
   console:{log:()=>{}}
 });
 vm.runInContext("const CACHE_NAME='trainingskompas-v470252';\n"+
  "const CACHE_STATIC='trainingskompas-static-v470252';\n"+
  "const CACHE_VIDEOS='tk-videos-v1';\n"+
  "const TK504_PRIVATE_MEDIA_CUTOVER="+flag+";\n"+activation,ctx);
 handler({waitUntil:p=>{finished=p;}});
 await finished;
 return removed;
}
const fetchStart=sw.indexOf("self.addEventListener('fetch',");
check(fetchStart>0,'SW fetch handler exists');
const fetchCode=sw.slice(fetchStart);
async function simulateFetch(url,cutover){
 let handler,result,called=false;
 const ctx=vm.createContext({
   Response, // Node web-standard response, no network operation.
   self:{addEventListener:(event,fn)=>{if(event==='fetch')handler=fn;}},
   NO_CACHE_PATTERNS:['supabase.co'],
   isVideoRequest:()=>{throw Error('Old video handler must not execute');},
   caches:{match:async()=>null},
   fetch:async()=>{throw Error('Network must not be called');}
 });
 vm.runInContext("const TK504_PRIVATE_MEDIA_CUTOVER="+cutover+";\n"+fetchCode,ctx);
 handler({request:{url,method:'GET',mode:'cors'},respondWith:p=>{called=true;result=p;}});
 return {called,result:await result};
}
async function run(){
 const old=await simulateActivate(false);
 check(!old.includes('tk-videos-v1'),'legacy cache preserved while private media OFF');
 const secure=await simulateActivate(true);
 check(secure.includes('tk-videos-v1'),'private cutover deletes raw offline video cache');
 check(secure.includes('trainingskompas-v470251'),'old runtime dynamic cache also removed');
 const raw=await simulateFetch('https://trainingskompas.com/videos/wall-sit.mp4',true);
 check(raw.called,'old raw media intercepted on private cutover');
 check(raw.result.status===403,'old raw media is rejected rather than cached');
 const signed=await simulateFetch('https://mhfxhzkdmgkaplicdszg.supabase.co/storage/v1/object/sign/exercise-media/test.mp4?token=synthetic',true);
 check(!signed.called,'signed media request is left to native browser, never cached');
 console.log('TK504 SW private cutover: '+passed+' checks PASS; flags OFF and in sync');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
