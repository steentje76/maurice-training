/* DEC-REC-001-B independent negative regression: Coach advice must consume Decision output. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const H=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const D=require('./decision.js'),C=require('./coaching.js');
function extract(name){
  const match=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(H);
  if(!match)throw Error('missing '+name);
  let start=H.indexOf('{',match.index),depth=0;
  for(let i=start;i<H.length;i++){if(H[i]==='{')depth++;else if(H[i]==='}'&&!--depth)return H.slice(match.index,i+1);}
  throw Error('unclosed '+name);
}
let pass=0,fail=0;
function chk(cond,msg){if(cond)pass++;else{fail++;console.error('FAIL: '+msg);}}
const el={innerHTML:'<old>STALE 93/100</old>'};
const sb={
  window:{_tkReadiness:{trainingGepland:true,herstel:{score:93,band:'hoog'}}},
  document:{getElementById:id=>id==='home-coach-advies'?el:null},
  CoachingCore:C,DecisionCore:D,tkDagfactorVoorAdvies:x=>x,
  escHtml:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  // Any new render must never use this obsolete duplicate calculation.
  buildCoachTraining:()=>({title:'Je bent klaar om te presteren',line:'Je herstel is goed — veilig progressie maken.'}),
  computeProgAdjustment:()=>({setsDelta:0,rpeDelta:0}),joinNl:a=>a.join(' en ')
};
vm.createContext(sb);
vm.runInContext(extract('renderCoachAdvies')+'\n'+extract('buildCoachAdvice'),sb);
const refresh=extract('refreshHome');
chk(/window\._tkReadiness=null;/.test(refresh)&&/renderCoachAdvies\(dfAdvies,recRows,readinessCtx\)/.test(refresh), 'Home resets stale global readiness and passes only same-refresh context to Coach');
const noPlan=D.readinessDay({trainingGepland:false,dagfactor:1.05,gereedheid:90,signalen:{}});
const noCtx=C.buildReadinessContext({besluit:noPlan});
sb.renderCoachAdvies({factor:1.05,basis:{hrv:true}},[],noCtx);
chk(el.innerHTML==='', 'no explicit plan must clear stale Coach advice and suppress workout coaching');
const trained=D.readinessDay({trainingGepland:true,dagfactor:1.05,gereedheid:90,
 herstel:{score:88,band:'hoog',confidence:'hoog'},
 signalen:{spierherstel:[{muscle:'borst',pct:70,hours:20}]}});
const ctx=C.buildReadinessContext({besluit:trained,geplandeTraining:{naam:'Borsttraining'}});
sb.renderCoachAdvies({factor:1.05,basis:{hrv:true}},[{muscle:'borst',pct:70,hours:20}],ctx);
chk(el.innerHTML.includes('88/100')&&el.innerHTML.includes('Borsttraining'), 'planned+complete draws exact scoped Decision score');
chk(!el.innerHTML.includes('klaar om te presteren')&&!el.innerHTML.includes('veilig progressie'), 'obsolete duplicate coach prescription may not be rendered');
const partial=D.readinessDay({trainingGepland:true,dagfactor:1.05,signalen:{spierherstel:null}});
sb.renderCoachAdvies({factor:1.05,basis:{hrv:true}},[],C.buildReadinessContext({besluit:partial}));
chk(el.innerHTML==='', 'planned but incomplete muscle evidence must not display optimistic Coach advice');
sb.renderCoachAdvies({factor:1.05,basis:{hrv:true}},[],null);
chk(el.innerHTML==='', 'failed readiness must clear previous Coach card');
(async()=>{
 const generic=await sb.buildCoachAdvice({factor:1.05,basis:{hrv:true}},null,[],true,false);
 chk(!/train je training|veilig progressie|een goed moment voor/i.test(generic) && /dagfactor/i.test(generic), 'unplanned generic text cannot prescribe a workout');
 const suggestion=await sb.buildCoachAdvice({factor:1.05,basis:{hrv:true}},{naam:'Automatische rotatie',_muscles:['borst']},[{muscle:'borst',pct:98,hours:24}],true,false);
 chk(!/Automatische rotatie|een goed moment voor|klaar om/i.test(suggestion),'rotation suggestion may not be described as a planned workout');
 console.log('fCoachDecisionScope: '+pass+' passed, '+fail+' failed');
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
