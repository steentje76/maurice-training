'use strict';
// #603 — original History UI is display-only for owner-verified TKC sessions.
// No production DB writes, private provider content, real accounts or media.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const original=JSON.parse((html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m)||[])[1]);
assert(original&&original.catalog.length===226);
const c=original.catalog[37];
assert.equal(c.catalog_id,'TK-000038');
function take(name){
 const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(m,'real app function '+name);
 let d=0;
 for(let i=html.indexOf('{',m.index);i<html.length;i++){
  if(html[i]==='{')d++;
  if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);
 }
 throw Error('unclosed '+name);
}
let count=0;
function env(flag){
 let owner='synthetic-A',calls=0;
 const s=vm.createContext({
   TK504_TYPED_FK_SESSION_RELEASE:flag,
   ExerciseCatalogService:{byId:id=>id===c.catalog_id?c:null},
   tkEigenaarUid:()=>owner,
   sbRpc:async(fn,args)=>{
     calls++;assert.equal(fn,'tk504_historical_catalog_id');
     assert.equal(args.p_exercise_id,'TKC-000038');
     return 'TK-000038';
   },
   navigator:{onLine:true},
   console
 });
 vm.runInContext(take('tk504HistoricalSourceForSession'),s);
 return {s,get calls(){return calls;},setOwner:o=>{owner=o;}};
}
function ok(x,label){assert(x,label);count++;}
(async()=>{
 const a=env(true);
 const got=await a.s.tk504HistoricalSourceForSession('TKC-000038');
 ok(got&&got.catalog_id==='TK-000038'&&got.exercise_id==='TKC-000038',
   'historical typed ID is mapped only by authenticated own-session RPC');
 ok(got.name===c.identity.nl||got.name===c.identity.name,
   'display name comes from actual public catalog, never user input');
 ok(Object.isFrozen(got),'immutable result');
 ok(a.calls===1,'exactly one owner-verified RPC');
 for(const bad of ['TK-000038','TKC-000000','TKC-000583','TKC-000999','TKC-abc','user-own-exercise']){
   ok(await a.s.tk504HistoricalSourceForSession(bad)===null,'untyped/out-of-range ignored: '+bad);
 }
 ok(a.calls===1,'no other requests for unknown/legacy identities');
 a.s.sbRpc=async()=>null;
 ok(await a.s.tk504HistoricalSourceForSession('TKC-000038')===null,
  'no own session -> no identity projected');
 a.s.sbRpc=async()=> 'TK-000019';
 ok(await a.s.tk504HistoricalSourceForSession('TKC-000038')===null,
  'mismatched server response cannot become different exercise');
 a.s.sbRpc=async()=>{a.setOwner('synthetic-B');return 'TK-000038';};
 ok(await a.s.tk504HistoricalSourceForSession('TKC-000038')===null,
  'late result from previous account cannot render under new account');
 a.setOwner('synthetic-A');
 a.s.navigator.onLine=false;
 ok(await a.s.tk504HistoricalSourceForSession('TKC-000038')===null,
  'offline history identity stays unresolved, never guessed');
 a.s.navigator.onLine=true;
 a.s.ExerciseCatalogService={byId:()=>null};
 ok(await a.s.tk504HistoricalSourceForSession('TKC-000038')===null,
  'no currently visible trusted catalog record -> no made-up display');
 const b=env(false);
 ok(await b.s.tk504HistoricalSourceForSession('TKC-000038')===null&&b.calls===0,
  'HARD RELEASE flag OFF: no production UI request');
 const load=take('loadHistory');
 ok(load.includes('tk504HistoricalSourceForSession(id)'),'real history uses owner-verified ID source');
 ok(load.includes('tk504HistoryNames[s.exercise_id]'),'real history changes display name ONLY');
 ok(load.includes('const _exObj=exercises.find(e=>e.id===s.exercise_id)'),
   'original historical exercise/cardio context stays untouched');
 ok(load.includes('escHtml(n)'), 'catalog-derived displayed name is safely HTML-escaped');
 ok(load.includes('!s._pending')&&load.includes('new Set(ss.filter'),
   'unverified offline/pending entries do not trigger a server identity claim');
 ok(load.includes('tkEigenaarUid()===owner'),
   'stale owner-changing callback cannot relabel the history list');
 ok(load.includes('openEditSess(')&&!load.includes('s.exercise_id=tk504HistoryNames'),
   'editor still receives original session FK, not a rewritten FK');
 ok(!/tk504HistoryNames\[s\.exercise_id\].*poster/.test(load),
   'canonical name never confers media rights');
 console.log('TK504 History own-session projection: '+count+
   ' real-code assertions PASS; revoke-compatible, no mixed accounts or media, flag OFF');
})().catch(e=>{console.error(e);process.exitCode=1;});
