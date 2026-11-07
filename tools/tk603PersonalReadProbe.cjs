'use strict';
// Runs only inside the existing isolated captured-schema harness while B has coach read scope.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=async function({root,rest,A,B,query,assert}){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),calls=[],statuses=[];
 function take(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);if(!m)throw Error(name);for(let e=html.indexOf('}',m.index);e>=0;e=html.indexOf('}',e+1)){try{const f=html.slice(m.index,e+1);new vm.Script(f);return f;}catch{}}throw Error(name);}
 const visible=await query('/sessions?user_id=eq.'+A.id,B);
 assert(visible.status===200&&visible.data.length===2,'personal-reader probe precondition: real B coach JWT can read A rows through RLS');
 const c=vm.createContext({console,encodeURIComponent,tk603ReadEpoch:0,
  authSession:{user:{id:B.id}},SB_URL:rest,SB_H:{Authorization:'Bearer '+B.token,'Content-Type':'application/json'},
  tkEigenaarUid:()=>B.id,
  fetch:async(url,opts)=>{
   const target=new URL(url);
   if(target.origin!==new URL(rest).origin||!target.pathname.startsWith('/rest/v1/'))throw Error('non-local probe request refused');
   target.pathname=target.pathname.slice('/rest/v1'.length);calls.push(target);
   const response=await fetch(target,{...opts,signal:AbortSignal.timeout(10000)});statuses.push(response.status);return response;
  }});
 vm.runInContext(['sbFetch','sbGet','tk603OwnRows','tk603ReadContext','tk603ReadCurrent','tk603ReadRows'].map(take).join('\n'),c);
 const rows=await c.tk603ReadRows(c.tk603ReadContext(),c.sbGet,'sessions','&select=date');
 assert(Array.isArray(rows)&&rows.length===0,'actual own-reader with narrow date-only SELECT excludes authorized athlete A from personal B view');
 assert(calls.length===1&&statuses[0]===200&&calls[0].searchParams.get('user_id')==='eq.'+B.id,'actual sbGet sends explicit captured-owner predicate to real PostgREST despite omitted user_id in result');
};
