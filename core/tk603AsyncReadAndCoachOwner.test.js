'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const CalcCore=require('./calculation.js');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function take(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);for(let e=html.indexOf('}',m.index);e>=0;e=html.indexOf('}',e+1)){try{const f=html.slice(m.index,e+1);new vm.Script(f);return f;}catch{}}throw Error(name);}
const names=['tk603BumpReadEpoch','tk603OwnRows','tk603ReadContext','tk603ReadCurrent','tk603ReadRows','tk603CancelCoachSend','tk603ResetCoachAccount','tk603CoachConversationCurrent','tk603CoachSameView',
 'ensureAiConsent','sendMsg','openCoachSession','focusCoach','openCoachHistory','loadCoachSession','clearChat',
 'tkPrTimeline','computePrTimelineFromSessions','nearestRepBucket','refreshStatsScreen','renderTrainScreen','refreshCardioProgress','refreshImprovements','refreshConsistency','refreshMultisportOverview'];
let checks=0;const ok=(value,label)=>{assert(value,label);checks++;};
function world(){
 const st={owner:'A',blocked:null,releases:new Map(),reached:new Set(),calls:[],rendered:[],memory:new Map([['tk_ai_consent','1']]),dom:[],calc:0,loadRep:0};
 async function gate(name){const key=name+':'+st.owner;if(st.blocked===key){st.reached.add(key);await new Promise(r=>st.releases.set(key,r));}}
 const elements={};const el=id=>elements[id]||(elements[id]={value:'',style:{},disabled:false,scrollTop:0,scrollHeight:0,classList:{},
  _html:'',get innerHTML(){return this._html;},set innerHTML(v){st.dom.push({owner:st.owner,id,v});this._html=v;},
  _text:'',get textContent(){return this._text;},set textContent(v){st.dom.push({owner:st.owner,id,v});this._text=v;}});
 const ownRows=()=>[{user_id:'A',exercise_id:'same',date:'2026-11-07',sets:1,reps:5,weight:42},{user_id:'foreign',exercise_id:'same',date:'2026-11-07',sets:1,reps:5,weight:999}];
 const read=async(table,q)=>{
  st.calls.push({op:'read',owner:st.owner,table,q});
  if(table==='chat_history'){
   await gate('history');
   return Array.from({length:41},(_,i)=>({id:'own-'+i,user_id:st.owner,role:'user',content:'private '+st.owner,session_id:'old',created_at:'2026-11-07'})).concat([{id:'foreign',user_id:'foreign',role:'user',content:'foreign'}]);
  }
  if(table==='activities'){await gate('activity');return [];}
  if(table==='sessions'){await gate(q.includes('eq.same')?'sessions':'otherSessions');return q.includes('eq.same')?ownRows():[];}
  return [];
 };
 const c=vm.createContext({console,Date,Math,JSON,Object,Array,Set,Map,Number,parseFloat,parseInt,encodeURIComponent,
  tk603ReadEpoch:0,authSession:{user:{id:'A'}},tkEigenaarUid:()=>st.owner,
  tk603CoachRequest:null,tk603CoachHistoryOwner:'A',tk603CoachLoadEpoch:0,tk603CoachHistoryLoad:null,
  chatHist:[],sending:false,activeSessionId:null,activeSessionCtx:null,coachReturn:null,_openingCoachViaSession:false,curT:'A',
  document:{getElementById:el,createElement:()=>({innerHTML:'',firstElementChild:null}),querySelectorAll:()=>[]},
  window:{},AI_CONSENT_STORAGE_KEY_BY_PURPOSE:{DAILY_COACH:'tk_ai_consent',KNOWLEDGE_AI:'knowledge-consent'},AI_CONSENT_TEXT_BY_PURPOSE:{DAILY_COACH:'tk_ai_consent'},
  localStorage:{getItem:k=>st.memory.get(k)||null,setItem:(k,v)=>{st.calls.push({op:'consentWrite',owner:st.owner,k,v});st.memory.set(k,v);},removeItem:k=>st.memory.delete(k)},
  confirmModal:async()=>{await gate('consent');return true;},
  sbPost:async(table,row)=>{st.calls.push({op:'post',owner:st.owner,table,row:structuredClone(row)});await gate(row.role==='assistant'?'assistantPost':'userPost');return true;},
  sbGet:read,v43SafeGet:read,
  sbDel:async(table,q)=>{st.calls.push({op:'delete',owner:st.owner,table,q});await gate('delete');return true;},
  buildCtx:async()=>{await gate('context');return 'approved context '+st.owner;},
  tkApiUrl:x=>x,SB_H:{Authorization:'Bearer A'},
  fetch:async(url,init)=>{st.calls.push({op:'AI',owner:st.owner,url,body:JSON.parse(init.body),authorization:init.headers.Authorization});await gate('fetch');return {json:async()=>{await gate('json');return {content:[{text:'allowed reply'}]};}};},
  addMsg:(role,content)=>{st.rendered.push({owner:st.owner,role,content});return 'typing';},removeMsg:()=>{},renderCoachReply:t=>st.rendered.push({owner:st.owner,role:'reply',content:t}),
  commercialErrorMessage:()=> 'error',renderChatHist:()=>st.rendered.push({owner:st.owner,role:'history',content:structuredClone(c.chatHist)}),go:()=>{},closeModal:()=>{},openModal:()=>{},
  escHtml:x=>String(x),setTimeout:()=>{},REP_PR_BUCKETS:[1,3,5,10],
  exercises:[{id:'same',name:'own exercise',type:'strength'}],TK504_TYPED_FK_SESSION_RELEASE:false,
  ensureFavoritesLoaded:async()=>{},ensureExerciseGoalsLoaded:async()=>{await gate('goals');},
  computeExerciseTrends:async()=>({}),renderWeekOverview:()=>{},
  CalcCore:{...CalcCore,selectStrengthBasis:(...a)=>{st.calc++;return CalcCore.selectStrengthBasis(...a);}},
  prFor:()=>null,peakGoalFor:()=>null,tk603CatalogProgressEntries:async()=>{await gate('catalog');return [];},
  progExData:{},progCatalogData:[],progExTrends:{},progFilterState:{sport:'all',type:'all',muscle:'all'},progSortMode:'az',
  SPORT_LABELS:{},TYPE_LABELS:{},renderFilterChips:()=>{},renderProgList:()=>st.rendered.push({owner:st.owner,role:'progress'}),
  drawChart:()=>{},tkTrendRegel:()=>{},renderStatsHero:()=>{},renderDoelenScreen:()=>{},
  ensureEquipmentTypesLoaded:async()=>{},loadTrainCfg:async()=>{},getSessionExs:()=>[{id:'same',type:'strength'}],
  buildTrainIntro:async()=>'',resolveCardioType:()=>null,loadRepPRs:async()=>{st.loadRep++;},loadEstOneRM:async()=>{},loadEquipment:async()=>[],
  cardioPerfFromSession:()=>({}),renderCardioProgress:()=>st.rendered.push({owner:st.owner,role:'cardio'}),
  CoachingCore:{improvementsDigest:x=>x},buildImprovementItems:x=>x,renderImprovements:()=>st.rendered.push({owner:st.owner,role:'improvements'}),
  tkConsistencyCounts:x=>x,renderConsistency:()=>st.rendered.push({owner:st.owner,role:'consistency'}),
  RunningIntelligenceCore:{weeklyVolume:()=>({}),weekKeyFromDate:()=> 'week'}
 });
 ['refreshVolumeSpiergroep','refreshRepPRs','refreshPrTimeline','refreshRatioFactors','refreshCardioProgress','refreshImprovements','refreshConsistency','refreshMultisportOverview'].forEach(n=>{c[n]=async()=>{};});
 vm.runInContext(names.filter(n=>!['refreshCardioProgress','refreshImprovements','refreshConsistency','refreshMultisportOverview'].includes(n)).map(take).join('\n'),c);
 function switchTo(uid){if(st.owner!==uid)c.tk603BumpReadEpoch();st.owner=uid;c.authSession={user:{id:uid}};c.SB_H.Authorization='Bearer '+uid;}
 async function reached(name){for(let i=0;i<80&&!st.reached.has(name);i++)await Promise.resolve();assert(st.reached.has(name),'never reached '+name);}
 const release=name=>{const r=st.releases.get(name);assert(r,name);r();};
 return {st,c,elements,el,switchTo,reached,release,gate};
}
(async()=>{
 let w=world(),c=w.c,st=w.st;
 const context=c.tk603ReadContext();
 const rows=await c.tk603ReadRows(context,c.sbGet,'sessions','&exercise_id=eq.same&select=date');
 ok(rows.length===1&&rows[0].weight===42,'personal view drops explicitly foreign authorized rows');
 ok(st.calls[0].q.includes('&user_id=eq.A'),'even narrow SELECT requests explicitly restrict own user_id');
 let blocked=false;try{await c.tk603ReadRows(context,async()=>{throw Error('writer called');},'hrv_log');}catch(e){blocked=e.message==='tk603_read_adapter_invalid';}
 ok(blocked,'bounded personal read adapter rejects arbitrary or writer functions');
 w.switchTo('B');w.switchTo('A');ok(!c.tk603ReadCurrent(context),'same UID after another login cannot revive old read context');
 c.tk603BumpReadEpoch();ok(!c.tk603ReadCurrent(context),'logout/account generation invalidates a prior context');
 // Timeline must discard the full result before calculations after a late response.
 w=world();w.st.blocked='sessions:A';let p=w.c.tkPrTimeline();await w.reached('sessions:A');w.switchTo('B');w.release('sessions:A');
 ok((await p).length===0,'old owner timeline returns no records after account switch');
 w=world();const events=await w.c.tkPrTimeline();
 ok(events.length===1&&events[0].weight===42,'same-owner timeline remains usable and never merges foreign PRs');
 // Main progress cache must not overwrite the next owner at either read boundary.
 for(const phase of ['sessions','catalog']){
  w=world();w.st.blocked=phase+':A';p=w.c.refreshStatsScreen();await w.reached(phase+':A');
  w.switchTo('B');w.c.progExData={B:{disp:7}};w.c.progCatalogData=[{owner_uid:'B'}];w.st.rendered=[];
  w.release(phase+':A');await p;
  ok(w.c.progExData.B?.disp===7&&w.c.progCatalogData[0]?.owner_uid==='B','stale '+phase+' phase cannot overwrite B progress caches');
  ok(w.st.rendered.length===0,'stale '+phase+' phase cannot paint B progress');
 }
 w=world();await w.c.refreshStatsScreen();ok(w.c.progExData.same?.disp>0&&w.c.progExData.same.disp<999,'normal progress uses original Calculation Engine on owned rows');
 // Normal execution previous-session prefetch must stop before downstream reads/render.
 w=world();w.st.blocked='sessions:A';p=w.c.renderTrainScreen('A');await w.reached('sessions:A');w.switchTo('B');w.st.dom=[];w.release('sessions:A');await p;
 ok(w.st.loadRep===0&&w.st.dom.length===0,'stale previous-session response cannot continue loading or paint next owner training');
 for(const fn of ['refreshCardioProgress','refreshImprovements','refreshConsistency','refreshMultisportOverview']){
  w=world();vm.runInContext(take(fn),w.c);const phase=fn==='refreshMultisportOverview'?'activity':'otherSessions';
  // Cardio needs a selected cardio exercise; all other views read global recent rows.
  if(fn==='refreshCardioProgress'){w.c.resolveCardioType=()=> 'rowing';w.st.blocked='sessions:A';}
  else w.st.blocked=phase+':A';
  p=w.c[fn]();const key=w.st.blocked;await w.reached(key);w.switchTo('B');w.st.dom=[];w.release(key);await p;
  ok(!w.st.rendered.length&&!w.st.dom.length,fn+' discards late results before UI writes');
 }

 // Execute the nested personal source readers as well as their parent views.
 w=world();Object.assign(w.c,{strengthBasisCache:{},estOneRMCache:{}});
 vm.runInContext(take('loadStrengthBasis'),w.c);await w.c.loadStrengthBasis('same');
 ok(w.st.calls[0].q.includes('&user_id=eq.A')&&w.c.strengthBasisCache.same?.recent?.e1rm<999,'actual legacy strength reader scopes before limit and calculation');
 vm.runInContext(take('tk603ReadExerciseSessions'),w.c);await w.c.tk603ReadExerciseSessions('same',null);
 ok(w.st.calls.at(-1).q.includes('&user_id=eq.A'),'actual legacy exercise read scopes before limit');
 w.c.TK504_TYPED_FK_SESSION_RELEASE=true;w.c.tk504ValidateCatalogSourceRef=()=>({verified:true});
 w.c.tk504VerifySessionBinding=async()=>({owner_uid:'A',fk_id:'TKC-000001'});
 await w.c.tk603ReadExerciseSessions('TK-000001',{provider_id:'synthetic'});
 ok(w.st.calls.at(-1).q.includes('exercise_id=eq.TKC-000001')&&w.st.calls.at(-1).q.includes('&user_id=eq.A'),'typed exercise reader scopes physical FK before limit');
 vm.runInContext(take('tk603CatalogPerformanceSources'),w.c);await w.c.tk603CatalogPerformanceSources();
 ok(w.st.calls.at(-1).q.includes('limit=1000&user_id=eq.A'),'catalog source discovery scopes before its row limit');
 w=world();Object.assign(w.c,{_tkRelRows:null,_tkRelOwner:null,_tkRelWeight:null,_tkRelSessies:null,_tkRelNutritionMeals:null,_tkRelNutritionHydration:null,
  _tkHealthLimitFor:()=>30,TK_REL_VENSTER:30});
 vm.runInContext(take('tkRelData'),w.c);await w.c.tkRelData();
 ok(w.st.calls.filter(x=>x.op==='read').every(x=>x.q.includes('&user_id=eq.A')),'all direct personal relationship reads scope before their limits');
 w=world();Object.assign(w.c,{MUSCLE_RECOVERY_HOURS:{back:48},SVG_ID_RECOVERY_HOURS:{back:48},
  getExerciseMuscles:id=>{w.st.calls.push({op:'muscle',id});return ['back'];},muscleNamesToSvgIds:x=>x,computeMuscleRecoveryPct:()=>50});
 w.c.v43SafeGet=async(table,q)=>{w.st.calls.push({op:'recoveryRead',q});return [{user_id:'A',exercise_id:'own',date:'2026-11-07'},{user_id:'foreign',exercise_id:'foreign',date:'2026-11-07'}];};
 vm.runInContext(take('v43OverallRecovery'),w.c);const recovery=await w.c.v43OverallRecovery();
 ok(recovery.hasData&&w.st.calls.some(x=>x.op==='recoveryRead'&&x.q.includes('&user_id=eq.A'))&&!w.st.calls.some(x=>x.op==='muscle'&&x.id==='foreign'),'actual recovery function only calculates own source rows');
 w=world();w.c.window.v43LichRec={owner:'A'};w.st.blocked='recovery:A';
 w.c.v43OverallRecovery=async()=>{await w.gate('recovery');return {owner:'A',rows:[]};};
 vm.runInContext(take('renderLichaam'),w.c);p=w.c.renderLichaam();await w.reached('recovery:A');
 w.switchTo('B');w.c.window.v43LichRec={owner:'B'};w.st.dom=[];w.release('recovery:A');await p;
 ok(w.c.window.v43LichRec.owner==='B'&&!w.st.dom.length,'late body recovery cannot overwrite B recovery cache or UI');

 for(const typed of [false,true]){
  w=world();w.c.repPRCache={};w.c.TK504_TYPED_FK_SESSION_RELEASE=typed;
  w.st.blocked='repread:A';w.c.tk603ReadExerciseSessions=async(ex,ref,q,meta)=>{
   if(meta){meta.verified=true;meta.owner_uid='A';}await w.gate('repread');return [];
  };
  vm.runInContext(take('computeRepPRsFromSessions')+'\n'+take('loadRepPRs'),w.c);
  p=w.c.loadRepPRs('same',typed?{provider_id:'synthetic'}:null);await w.reached('repread:A');
  w.switchTo('B');w.switchTo('A');const key=typed?'catalog:A:same':'same';
  const fresh={1:{weight:42}};w.c.repPRCache[key]=fresh;w.release('repread:A');await p;
  ok(w.c.repPRCache[key]===fresh,(typed?'typed':'legacy')+' stale same-UID relogin cannot replace or delete fresh Rep-PR cache');
 }
 // Consent cannot be accepted into another user's personal preferences.
 w=world();w.st.memory.delete('tk_ai_consent');w.st.blocked='consent:A';p=w.c.sendMsg('A consent question');await w.reached('consent:A');w.switchTo('B');w.release('consent:A');await p;
 ok(!w.st.memory.has('tk_ai_consent')&&!w.st.calls.some(x=>x.op==='AI'||x.op==='post'),'late consent answer neither authorizes nor writes under B');
 for(const phase of ['userPost','context','fetch','json','assistantPost','history','delete']){
  w=world();w.st.blocked=phase+':A';p=w.c.sendMsg('A private');await w.reached(phase+':A');
  w.switchTo('B');w.c.chatHist=[{role:'user',content:'B only'}];const sent=w.st.calls.length;w.st.rendered=[];
  w.release(phase+':A');await p;
  ok(w.c.chatHist.length===1&&w.c.chatHist[0].content==='B only'&&!w.st.rendered.length,'coach '+phase+' result cannot modify/render B history');
  ok(w.st.calls.length===sent,'coach '+phase+' continuation makes no further request under B');
 }
 w=world();w.st.blocked='context:A';p=w.c.sendMsg('token refresh');await w.reached('context:A');
 w.c.authSession={user:{id:'A'},refreshed:true};w.release('context:A');await p;
 ok(w.st.calls.some(x=>x.op==='AI')&&w.st.calls.some(x=>x.op==='post'&&x.row.role==='assistant')&&!w.el('send-btn').disabled&&!w.c.sending,'same-owner token refresh preserves reply and releases controls');

 // Invoke the real auth lifecycle: refresh must preserve context; logout/login must invalidate it.
 w=world();Object.assign(w.c,{AUTH_SESSION_KEY:'auth',SB_KEY:'anon',authRefreshTimer:null,
  tk504InvalidateProtectedMedia:()=>{},tk504ClearPublishedCatalog:()=>{},scheduleAuthRefresh:()=>{},clearTimeout:()=>{}});
 vm.runInContext(take('saveAuthSession')+'\n'+take('clearAuthSession'),w.c);
 const live=w.c.tk603ReadContext();w.c.saveAuthSession({user:{id:'A'},access_token:'renewed'});
 ok(w.c.tk603ReadCurrent(live),'actual same-user saveAuthSession preserves pending read generation');
 w.c.clearAuthSession();w.c.saveAuthSession({user:{id:'A'},access_token:'new-login'});
 ok(!w.c.tk603ReadCurrent(live),'actual logout and same-user re-login invalidate old generation');
 // Real focusCoach + immediate sendMsg must share the history load, including historical context.
 w=world();w.st.blocked='history:A';const focus=w.c.focusCoach();await w.reached('history:A');
 p=w.c.sendMsg('auto entry');await Promise.resolve();
 ok(!w.st.calls.some(x=>x.op==='post'||x.op==='AI'),'auto-entry send waits for pending personal history');
 w.st.blocked=null;w.release('history:A');await Promise.all([focus,p]);
 const ai=w.st.calls.find(x=>x.op==='AI');
 ok(ai&&ai.body.messages.some(x=>x.content==='auto entry')&&ai.body.messages.some(x=>x.content==='private A'),'history and immediate message are both retained in AI context');
 ok(w.c.chatHist.some(x=>x.role==='assistant'&&x.content==='allowed reply')&&!w.c.sending&&!w.el('send-btn').disabled,'auto-entry reply retained with released controls');
 for(const phase of ['history','delete']){
  w=world();w.st.blocked=phase+':A';p=w.c.clearChat();await w.reached(phase+':A');
  w.switchTo('B');w.c.chatHist=[{role:'user',content:'B protected'}];const before=w.st.calls.length;w.st.rendered=[];
  w.release(phase+':A');await p;
  ok(w.st.calls.length===before&&!w.st.rendered.length&&w.c.chatHist[0].content==='B protected','general clear stops after stale '+phase+' without replacing or deleting B');
 }
 // A stale request must not release the lock of B's new request.
 w=world();w.st.blocked='fetch:A';const a=w.c.sendMsg('A');await w.reached('fetch:A');
 w.switchTo('B');w.c.chatHist=[];w.st.blocked='fetch:B';const b=w.c.sendMsg('B');await w.reached('fetch:B');
 w.release('fetch:A');await a;
 ok(w.c.sending===true&&w.el('send-btn').disabled===true,'A finally cannot unlock B active request');
 w.release('fetch:B');await b;
 ok(!w.c.sending&&!w.el('send-btn').disabled,'B request completes and releases its own lock');
 // Switching conversations invalidates a response even without changing owner.
 w=world();w.st.blocked='fetch:A';p=w.c.sendMsg('old conversation');await w.reached('fetch:A');w.c.openCoachSession({exId:'another',exNaam:'new'});const next=w.c.chatHist;w.st.rendered=[];w.release('fetch:A');await p;
 ok(w.c.chatHist===next&&next.length===1&&!w.st.rendered.length,'old reply cannot append to newly selected conversation');
 // Read-only history loading and destructive clear are both bound to captured owner.
 w=world();w.st.blocked='history:A';p=w.c.loadCoachSession('old','old');await w.reached('history:A');w.switchTo('B');w.c.activeSessionId='B session';w.release('history:A');await p;
 ok(w.c.activeSessionId==='B session','late history load cannot select A conversation for B');
 w=world();w.st.blocked='consent:A';p=w.c.clearChat();await w.reached('consent:A');w.switchTo('B');w.release('consent:A');await p;
 ok(!w.st.calls.length,'old clear-chat confirmation cannot read or delete B data');
 // Normal path still applies the original output contract before storing assistant text.
 w=world();w.c.window.AIOutputContract={};w.c.AIOutputContract={validateAiOutputText:()=>({valid:false}),safeCoachFallback:()=> 'SAFE'};
 await w.c.sendMsg('normal');
 ok(w.st.calls.some(x=>x.op==='AI')&&w.st.calls.some(x=>x.op==='post'&&x.row.role==='assistant'&&x.row.content==='SAFE'),'same-owner coach retains AI-output sanitization and persistent history');
 ok(!w.st.calls.some(x=>x.op==='delete'&&x.q.includes('foreign')),'history pruning cannot delete an authorized foreign-owner row');
 w=world();const beforeWipe=w.c.tk603ReadContext();w.c.chatHist=[{role:'user',content:'A private'}];w.c.window.v43LichRec={owner:'A'};w.c.sending=true;w.el('send-btn').disabled=true;w.c.activeSessionId='A-session';w.el('chat-wrap').innerHTML='A private';
 const begin=html.indexOf('const PERSONAL_CACHE_KEYS=[')+'const PERSONAL_CACHE_KEYS=['.length;
 const keys=html.slice(begin,html.indexOf('];',begin));w.c.CACHE_OWNER_KEY='tk_cache_owner_uid';
 vm.runInContext('const PERSONAL_CACHE_KEYS=['+keys+'];'+take('wipePersonalCache'),w.c);w.c.wipePersonalCache();
 ok(w.c.window.v43LichRec===null&&!w.c.tk603ReadCurrent(beforeWipe)&&!w.c.sending&&w.c.chatHist.length===0&&w.c.activeSessionId===null&&!w.el('send-btn').disabled&&w.el('chat-wrap').innerHTML===''&&!w.st.memory.has('tk_ai_consent'),'actual logout wipe invalidates reads, clears coach history/consent and resets only its own UI');
 console.log('TK603 async reads and coach owner isolation: '+checks+' actual-function assertions PASS; synthetic services only');
})().catch(e=>{console.error(e);process.exitCode=1;});
