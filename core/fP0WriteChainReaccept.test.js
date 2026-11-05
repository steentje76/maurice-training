/* TK-REL-SEC-07 — onafhankelijke heracceptatie PR #557/#558 (19-10-2026).
 * Aanvullende negatieve scenario's op de ECHTE productiefuncties uit index.html:
 *  P1 eigenaarloze PATCH/DELETE/RPC bereikt ook online de server niet (geen anoniem verzoek);
 *  P2 HTTP 401 en 429 volgen het wachtrijcontract: alleen "geslaagd" bij een bevestigde queue-commit;
 *  P3 netwerkfout + mislukte queue-commit: precies één netwerkpoging, geen extra verzoek;
 *  P4 sbDelQ({detail:true}) zonder eigenaar houdt het detail-contract ({ok:false,status:'failed'});
 *  P5 voeding: een mislukte OUDER-verwijdering van een maaltijd navigeert niet weg en meldt de fout;
 *  P6 voeding: na een gedeeltelijke verwijdering (kind weg, ouder mislukt) slaagt een herhaling. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const grab=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,'brongrenzen niet gevonden: '+a);return html.slice(i,j);};
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};

const WRITE_SRC=grab('function tkSchrijfUitkomst(status, http, reden){','// Speelt de queue in volgorde af;');
function schrijf({owner='user-A',online=true,queueResult=true,response,networkError}={}){
  const st={requests:0,added:0};
  const ctx={console:{warn(){},error(){},log(){}},navigator:{onLine:online},SB_URL:'https://invalid.example',
    tkEigenaarUid:()=>owner,tkHuidigeUid:()=>owner,updateOfflineBadge(){},tkLogSchrijf(){},tkFoutcode:()=>'',
    TK_WACHTRIJ_OUDERS:{},IDEMPOTENT_TABELLEN_MET_CLIENT_ID:{},TK_IDEMPOTENT_ZONDER_UPDATE:{},
    sbRetryable:s=>[401,408,425,429,500,502,503,504].includes(s),
    offlineQueueAdd:async()=>{st.added++;return queueResult;},
    sbFetch:async()=>{st.requests++;if(networkError)throw new Error('network');return response||{ok:true,status:200,text:async()=>'',json:async()=>({v:1})};}};
  vm.createContext(ctx);vm.runInContext(WRITE_SRC,ctx);return {ctx,st};
}
const antwoord=(status)=>({ok:status>=200&&status<300,status,text:async()=>'x',json:async()=>({})});
const doe=(c,k,opts)=>k==='PATCH'?c.sbPatchQ('sessions','id=eq.1',{reps:5},opts):k==='DELETE'?c.sbDelQ('sessions','id=eq.1',opts):c.sbRpcQ('schedule_my_training',{p_occurrence_id:'o1'});

async function main(){
  for(const k of ['PATCH','DELETE','RPC']){
    const s=schrijf({owner:null,online:true});
    check(await doe(s.ctx,k)===false&&s.st.requests===0&&s.st.added===0,'P1 '+k+' zonder eigenaar: false, geen verzoek, geen wachtrij');
    for(const code of [401,429]){
      const nok=schrijf({response:antwoord(code),queueResult:false});
      check(await doe(nok.ctx,k)===false,'P2 '+k+' HTTP '+code+' + mislukte queue-commit → false');
      const ok=schrijf({response:antwoord(code),queueResult:true});
      check(await doe(ok.ctx,k)===true&&ok.st.added===1,'P2 '+k+' HTTP '+code+' + bevestigde queue-commit → true');
    }
    const net=schrijf({networkError:true,queueResult:false});
    check(await doe(net.ctx,k)===false&&net.st.requests===1&&net.st.added===1,'P3 '+k+' netwerkfout + mislukte queue: false, 1 verzoek, 1 queue-poging');
  }
  const d=schrijf({owner:null});
  const u=await d.ctx.sbDelQ('custom_trainings','id=eq.x',{detail:true});
  check(u&&typeof u==='object'&&u.ok===false&&u.status==='failed','P4 sbDelQ detail zonder eigenaar levert het detail-object (ok:false, status failed)');

  const VOED=grab('async function voedingDeleteMealConfirmed(mealId){','/* SCREEN 8 — Supplement toevoegen. */');
  function maaltijd(uitkomsten){
    const toasts=[],routes=[],calls=[];
    const ctx={voedingOpenMealDetailId:'meal-1',toast:t=>toasts.push(t),go:r=>routes.push(r),
      sbDelQ:async(t,f)=>{calls.push(t);return uitkomsten.shift();}};
    vm.createContext(ctx);vm.runInContext(VOED,ctx);return {ctx,toasts,routes,calls};
  }
  const m=maaltijd([true,false]);await m.ctx.voedingDeleteMealConfirmed('meal-1');
  check(m.routes.length===0&&m.ctx.voedingOpenMealDetailId==='meal-1'&&m.toasts.some(t=>/mislukt/i.test(t)),'P5 mislukte ouderverwijdering: blijft op het scherm en meldt de fout');
  const r=maaltijd([true,true]);await r.ctx.voedingDeleteMealConfirmed('meal-1');
  check(r.routes.includes('s-voeding-maaltijden')&&r.calls.join()==='nutrition_meal_items,nutrition_meals','P6 herhaling na gedeeltelijke verwijdering slaagt (kind-DELETE idempotent, FK ON DELETE CASCADE)');
  klaar=true;console.log('TK-REL-SEC-07: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
