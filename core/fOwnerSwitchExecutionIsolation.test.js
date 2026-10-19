/* TK-REL-SEC-12 — een lopende training van gebruiker A kan nooit onder gebruiker B worden afgerond
 * (heracceptatie 19-10-2026). curT/sessionLog, de begeleide training (GW) en een lopende HYROX-race
 * leven in het geheugen; bij uitloggen of een eigenaarwissel werd alleen localStorage gewist. B kon de
 * training van A daarna afronden: de insert-trigger set_user_id_from_auth() maakt de sets dan van B.
 *  O1 eigenaarwissel (resetPersonalCacheIfNewDeviceOwner): alle uitvoeringsstate in het geheugen weg;
 *  O2 zelfde eigenaar opnieuw ingelogd (sessie verlopen): lopende training blijft staan;
 *  O3 uitloggen met niet-opgeslagen lokale gegevens: eerst expliciete bevestiging, annuleren = niets gewist;
 *  O4 bevestigd uitloggen: uitvoeringsstate in het geheugen weg, daarna pas sessie gewist;
 *  O5 uitloggen zonder lokale blokkades: ongewijzigd (geen extra vraag);
 *  O6 GW.vergeetVoorEigenaarwissel() wist de actieve begeleide training uit het geheugen.
 * Draait de ONGEWIJZIGDE productiefuncties uit index.html. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,'brongrenzen niet gevonden: '+a);return html.slice(i,j);};
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};

const SRC=[
  block('async function tkMagUitloggenMetLokaleData(){','async function deleteAccount(){'),
  block('function tkVergeetLopendeTraining(){','/* RC0 — is de onboarding')
].join('\n');
function maak(opts={}){
  const st={vragen:[],gewist:0,sessieWeg:0,store:{tk_cache_owner_uid:'A'},volgorde:[]};
  const ctx={console:{log(){},warn(){},error(){}},CACHE_OWNER_KEY:'tk_cache_owner_uid',
    localStorage:{getItem:k=>st.store[k]||null,setItem:(k,v)=>{st.store[k]=v;},removeItem:k=>{delete st.store[k];}},
    curT:'custom_A',sessionLog:{ex1:[{reps:8}]},sessionExtra:[1],pctSelection:{a:1},rpeManual:{a:1},warmupState:{a:1},cardioSplitMode:{a:1},
    cardioSplits:{a:1},manualKgSets:{a:1},sessionRxAdj:{a:1},sessionPrBase:{a:1},resolvedWorkout:{x:1},activeInstanceId:'inst-A',hyroxActive:{race:'A'},
    stopTrainTimer(){},cancelRestTimer(){},tkErgDisconnectAll(){},
    GW:{vergeten:0,vergeetVoorEigenaarwissel(){this.vergeten++;}},
    tkUpdateGereedheid:async()=>opts.gereedheid||{veilig:true,open:[],onbekend:[]},
    confirmModal:async(tekst,o)=>{st.vragen.push({tekst,o});return opts.antwoorden?opts.antwoorden.shift():true;},
    clearAuthSession(){st.sessieWeg++;st.volgorde.push(['sessie',ctx.curT]);},
    wipePersonalCache(){st.gewist++;},escHtml:s=>String(s),
    document:{querySelectorAll:()=>[],getElementById:()=>({classList:{add(){}},value:''})}};
  ctx.window=ctx;
  // in-memory caches die resetPersonalCacheIfNewDeviceOwner al leegmaakte
  ['atleet','customTrainings','activeSport','progExData','estOneRMCache','repPRCache','goalsCache','programBlockExCache','exPickerRecentIds','vasteTrainingen','vtMetaSel','_vasteTrainingenLoaded','exercises','_exercisesLoading','favoriteExIds','_favoritesLoaded','exerciseGoals','_exerciseGoalsLoaded','equipmentTypes','_equipmentTypesLoading','equipmentCatalog','_equipmentCatalogLoading'].forEach(k=>{ctx[k]=null;});
  vm.createContext(ctx);vm.runInContext(SRC,ctx);return {ctx,st};
}
const leeg=c=>c.curT===null&&Object.keys(c.sessionLog).length===0&&c.activeInstanceId===null&&c.hyroxActive===null&&c.resolvedWorkout===null&&c.GW.vergeten===1;
async function main(){
  { const {ctx}=maak(); ctx.resetPersonalCacheIfNewDeviceOwner('B');
    check(leeg(ctx),'O1 eigenaarwissel: lopende training, sets, instance, HYROX en Guided uit het geheugen'); }
  { const {ctx}=maak(); ctx.resetPersonalCacheIfNewDeviceOwner('A');
    check(ctx.curT==='custom_A'&&ctx.sessionLog.ex1&&ctx.GW.vergeten===0,'O2 zelfde eigenaar: lopende training blijft behouden'); }
  { const {ctx,st}=maak({gereedheid:{veilig:false,open:['er loopt nu een training'],onbekend:[]},antwoorden:[true,false]});
    await ctx.authSignOut();
    check(st.vragen.length===2&&/er loopt nu een training/.test(st.vragen[1].tekst)&&st.vragen[1].o.danger===true,'O3 niet-opgeslagen lokale gegevens: expliciete waarschuwing met inhoud');
    check(st.sessieWeg===0&&st.gewist===0&&ctx.curT==='custom_A','O3 annuleren: niets gewist, training blijft'); }
  { const {ctx,st}=maak({gereedheid:{veilig:false,open:['er loopt nu een training'],onbekend:[]},antwoorden:[true,true]});
    await ctx.authSignOut();
    check(st.sessieWeg===1&&st.gewist===1&&leeg(ctx)&&st.volgorde[0][1]===null,'O4 bevestigd uitloggen: geheugen leeg vóór de sessie wordt gewist'); }
  { const {ctx,st}=maak({antwoorden:[true]});
    ctx.curT=null; await ctx.authSignOut();
    check(st.vragen.length===1&&st.sessieWeg===1,'O5 zonder lokale blokkades: één bevestiging, uitloggen zoals voorheen'); }
  { const {ctx,st}=maak({gereedheid:null,antwoorden:[true,false]}); ctx.tkUpdateGereedheid=async()=>{throw new Error('IDB');};
    await ctx.authSignOut();
    check(st.vragen.length===2&&st.sessieWeg===0,'O3b controle zelf mislukt: behandeld als niet veilig (fail-closed)'); }
  // O7 — andere tab logde in met B (gedeelde localStorage); terugkeer naar deze tab via ensureValidSession().
  for(const ander of [true,false]){
    const E=block('async function ensureValidSession(){','function toggleAuthPassVisibility(){');
    const sB={access_token:'at',refresh_token:'rt',expires_at:Date.now()+3600e3,user:{id:ander?'B':'A'}};
    let herladen=0;
    const ctx={handleFederatedAuthCallback:async()=>false,loadAuthSession:()=>sB,SB_H:{},scheduleAuthRefresh(){},refreshAuthToken:async()=>true,
      clearAuthSession(){},authSession:{user:{id:'A'}},location:{reload(){herladen++;}},curT:'custom_A',vergeten:0};
    ctx.tkVergeetLopendeTraining=()=>{ctx.vergeten++;ctx.curT=null;};
    vm.createContext(ctx);vm.runInContext(E,ctx);
    const ok=await ctx.ensureValidSession();
    if(ander) check(ok===true&&ctx.vergeten===1&&ctx.curT===null&&herladen===1,'O7 sessie van een andere gebruiker overgenomen: uitvoering vergeten en app herladen');
    else check(ctx.vergeten===0&&herladen===0&&ctx.curT==='custom_A','O7 zelfde gebruiker: niets vergeten, geen herlaad');
  }
  // O6 — echte GW-module
  { const g=block('var GW=(function(){','</script>')+'\nthis.GW=GW;';
    const store={};const ctx={window:{},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}},console,Date,JSON,Math};
    ctx.window=ctx;vm.createContext(ctx);vm.runInContext(g,ctx);
    ctx.GW.st.active={items:[{id:'x'}],phase:'exercise'};
    ctx.GW.vergeetVoorEigenaarwissel();
    check(ctx.GW.active()===null,'O6 GW.vergeetVoorEigenaarwissel() wist de begeleide training uit het geheugen'); }
  klaar=true;console.log('TK-REL-SEC-12: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
