'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function extract(name){const re=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(');const m=re.exec(html);assert(m,name);let depth=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&--depth===0)return html.slice(m.index,i+1);}throw Error(name);}
let count=0;
function env(){const st={owner:'A',release:true,mode:'normal',calls:0};const ref={kind:'movekit-catalog-v1',catalog_id:'TK-000038',provider_id:'synthetic'};const ctx=vm.createContext({console,encodeURIComponent,navigator:{onLine:true},get TK504_TYPED_FK_SESSION_RELEASE(){return st.release;},tkEigenaarUid:()=>st.owner,tk504ValidateCatalogSourceRef:(id,r)=>r===ref?r:null,tk504VerifySessionBinding:async()=>({owner_uid:st.owner,fk_id:'TKC-000038'}),tk504HistoricalSourceForSession:async id=>({exercise_id:id,catalog_id:'TK-000038'}),sbGet:async(table,q)=>{st.calls++;const oldOwner=st.owner;if(st.mode==='switch')st.owner='B';const fk=q.includes('eq.TKC-')?'TKC-000038':'TK-000038';return [{user_id:oldOwner,exercise_id:fk,weight:40},{user_id:'foreign',exercise_id:fk,weight:999}];}});vm.runInContext(['tk603OwnRows','tk603ReadExerciseSessions','tk603RecentPickerSourceKeys'].map(extract).join('\n'),ctx);return {st,ctx,ref};}
async function check(label,fn){await fn();count++;console.log('PASS '+label);}
(async()=>{
 await check('legacy response discarded after account switch',async()=>{const {st,ctx}=env();st.mode='switch';assert.equal((await ctx.tk603ReadExerciseSessions('TK-000038')).length,0);});
 await check('catalog response excludes foreign same-FK rows',async()=>{const {ctx,ref}=env();const rows=await ctx.tk603ReadExerciseSessions('TK-000038',ref);assert.equal(rows.length,1);assert.equal(rows[0].user_id,'A');});
 await check('legacy response excludes foreign owner rows',async()=>{const {ctx}=env();assert.equal((await ctx.tk603ReadExerciseSessions('TK-000038')).length,1);});
 await check('recents owner captured before first request',async()=>{const {st,ctx}=env();st.mode='switch';assert.equal((await ctx.tk603RecentPickerSourceKeys()).length,0);});
 await check('signed-out requests return no sessions',async()=>{const {st,ctx}=env();st.owner=null;assert.equal((await ctx.tk603ReadExerciseSessions('TK-000038')).length,0);assert.equal(st.calls,0);});
 console.log('TK603 owner switch read isolation: '+count+' actual-function regressions PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
