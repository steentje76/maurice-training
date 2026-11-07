'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function extract(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);let d=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);}throw Error(name);}
let n=0;function ok(v,label){assert(v,label);n++;}
const flags={release:true};const p=vm.createContext({get TK504_TYPED_FK_SESSION_RELEASE(){return flags.release;}});vm.runInContext(extract('tk603CanUpdatePersonalRecord'),p);
ok(p.tk603CanUpdatePersonalRecord(null,false),'personal record path remains allowed');
ok(!p.tk603CanUpdatePersonalRecord({kind:'movekit-catalog-v1'},false),'catalog session cannot update personal exercise goal');
ok(!p.tk603CanUpdatePersonalRecord({invalid:true},false),'invalid explicit source cannot fall back to personal record');
ok(!p.tk603CanUpdatePersonalRecord(null,true),'selected canonical loose exercise cannot update personal goal');
flags.release=false;ok(p.tk603CanUpdatePersonalRecord({invalid:true},true),'unreleased legacy record behavior preserved');
ok(extract('saveLosOefening').includes('tk603CanUpdatePersonalRecord(null,ex&&ex._catalog===true)'),'actual loose writer guards personal PR update');
ok(extract('finishSession').includes('if(tk603CanUpdatePersonalRecord(ex.tk504_catalog_ref))'),'actual central finish path guards personal PR update');
ok(html.includes("typeof DecisionCore!=='undefined'&&tk603CanUpdatePersonalRecord(it.tk504_catalog_ref)"),'actual guided persist guards personal PR update');
function env(){const st={owner:'A',mode:'normal',calls:0};const c=vm.createContext({console,Object,TK_REL_VENSTER:365,_tkRelOwner:null,_tkRelRows:null,_tkRelWeight:null,_tkRelSessies:null,_tkRelNutritionMeals:null,_tkRelNutritionHydration:null,tkEigenaarUid:()=>st.owner,_tkHealthLimitFor:()=>400,v43SafeGet:async table=>{st.calls++;if(st.mode==='switch')st.owner='B';if(table==='nutrition_meals')return [];return [{user_id:'A',weight:40,exercise_id:'TKC-000038'},{user_id:'B',weight:999,exercise_id:'TKC-000038'}];}});vm.runInContext(extract('tkRelData'),c);return{st,c};}
(async()=>{
 let {st,c}=env();await c.tkRelData();ok(c._tkRelSessies.length===1&&c._tkRelSessies[0].user_id==='A','intentional coach-RLS foreign rows excluded from own trend cache');
 st.owner='B';await c.tkRelData();ok(c._tkRelOwner==='B'&&c._tkRelSessies.length===1&&c._tkRelSessies[0].user_id==='B','new owner cannot consume old owner cached session trends');
 ({st,c}=env());st.mode='switch';const rows=await c.tkRelData();ok(rows.sessies.length===0&&c._tkRelSessies===null,'in-flight old-owner relationship read cannot repopulate new cache');
 ({st,c}=env());st.owner=null;await c.tkRelData();ok(st.calls===0,'signed-out relationship request makes no data calls');
 console.log('TK603 personal record / coach-RLS trend ownership: '+n+' actual-function assertions PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
