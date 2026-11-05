'use strict';
/* TK504 protected player integration with synthetic DOM and signed responses.
 * Tests behavior in a live JS VM: no licensed bytes, URLs or credentials.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const start=html.indexOf('async function tk504PlayPrivateVideo(container,catalogId){');
const stop=html.indexOf('\n\nconst EX_CATALOG =',start);
assert.ok(start>=0&&stop>start,'Protected-video function must exist in existing TK app');
const fn=html.slice(start,stop);
const URL1='https://media.example.invalid/signed-1';
const URL2='https://media.example.invalid/signed-2';
const POSTER='https://media.example.invalid/signed-private-poster';
const USER_A='11111111-1111-4111-8111-111111111111';
const USER_B='22222222-2222-4222-8222-222222222222';
function mockContainer(){
 const e={isConnected:true,children:[],_text:''};
 Object.defineProperty(e,'textContent',{
   get(){return this._text;},
   set(v){this._text=String(v);this.children=[];}
 });
 e.replaceChildren=function(...v){this.children=v;this._text='';for(const c of v)c.parentNode=this;};
 return e;
}
function fakeVideo(){
 const handlers={};
 return {
  handlers,controls:false,preload:'',playsInline:false,style:{},poster:null,parentNode:null,
  duration:70,currentTime:0,playCount:0,loadCount:0,
  setAttribute(k,v){this[k]=v;},
  addEventListener(event,callback,opts){(handlers[event]??=[]).push({callback,once:!!opts?.once});},
  dispatch(event){
   const current=[...(handlers[event]||[])];
   handlers[event]=(handlers[event]||[]).filter(x=>!x.once);
   return Promise.all(current.map(x=>x.callback()));
  },
  load(){this.loadCount++;this.dispatch('loadedmetadata');},
  play(){this.playCount++;return Promise.resolve();}
 };
}
function harness({signed,enabled=true,session=true}={}){
 let signedCount=0;
 const videos=[];
 const env={
   tk504PrivateEnabled:()=>enabled,
   authSession:session?{user:{id:USER_A}}:null,
   tk504GetMediaRuntime:()=>({
     signed:async(id,type)=>{signedCount++;return signed?signed(id,type,signedCount):{url:type==='poster'?POSTER:URL1,type};}
   }),
   document:{createElement(type){
     assert.equal(type,'video');
     const video=fakeVideo();videos.push(video);return video;
   }},
   ExerciseAssetProvider:{poster:()=>null}
 };
 const context=vm.createContext(env);
 vm.runInContext(fn,context);
 return {context,env,videos,get signedCount(){return signedCount;},
   play:(container,id='TK-000001')=>context.tk504PlayPrivateVideo(container,id)};
}
async function run(){
 let n=0;function okay(x,m){assert.ok(x,m);n++;}
 let h=harness({signed:(id,type,i)=>({url:type==='poster'?POSTER:(i===1?URL1:URL2),type})});
 const c=mockContainer();
 okay(await h.play(c)===true,'initial request plays');
 okay(h.signedCount===2,'video and optimized poster require distinct authorization');
 okay(h.videos.length===1,'one video element');
 const v=h.videos[0];
 okay(v.src===URL1,'initial video gets signed URL only');
 okay(v.playCount===1,'start is attempted');
 okay(v.poster===POSTER,'poster may only come from separately signed private ticket');
 okay(v.controlsList==='nodownload','no download control');
 v.currentTime=36;
 await v.dispatch('error');
 okay(h.signedCount===3,'one video-only retry after error');
 okay(v.src===URL2,'retry refreshes signed URL');
 okay(v.currentTime===36,'seek position restored on immediate loadedmetadata');
 okay(v.playCount===2,'playback resumes after renewal');
 await v.dispatch('error');
 okay(h.signedCount===3,'second error is terminal');
 okay(c.textContent.includes('niet beschikbaar'),'terminal error shows fail-closed notice');
 okay(c.children.length===0,'terminal error removes tokenized video node');
 h=harness({signed:(id,type)=>{if(type==='poster')throw Error('POSTER_DENIED');return {url:URL1,type};}});
 const withoutPoster=mockContainer();
 okay(await h.play(withoutPoster)===true,'poster refusal does not block authorized video');
 okay(h.videos[0].poster===null,'refused poster never falls back to raw URL');
 okay(h.signedCount===2,'refusal still checked server independently');

 let finishPoster;
 const delayedPoster=new Promise(resolve=>{finishPoster=resolve;});
 h=harness({signed:(id,type)=>type==='poster'?delayedPoster:{url:URL1,type:'video'}});
 const switchContainer=mockContainer();
 okay(await h.play(switchContainer)===true,'video may play while optimized poster is pending');
 const switchedVideo=h.videos[0];
 h.context.authSession={user:{id:USER_B}};
 finishPoster({url:POSTER,type:'poster'});
 await Promise.resolve();
 await Promise.resolve();
 okay(switchedVideo.poster===null,'late poster ticket cannot leak after user switches account');
 h=harness({signed:()=>{throw new Error('AUTH_DENIED');}});
 const denied=mockContainer();
 okay(await h.play(denied)===false,'broker deny never plays');
 okay(h.videos.length===0,'broker deny constructs no player');
 okay(denied.textContent.includes('niet beschikbaar'),'denial visible to user');

 h=harness();
 okay(await h.play(mockContainer(),'INVALID-000227')===false,'invalid catalog ID never starts');
 // The canonical adapter independently denies unpublished TK-000227 through TK-000582.
 h=harness({enabled:false});
 okay(await h.play(mockContainer())===false,'release OFF causes no signing');
 okay(h.signedCount===0,'no signing under disabled release');
 h=harness({session:false});
 const loggedOut=mockContainer();
 okay(await h.play(loggedOut)===false,'logged-out cannot play');
 okay(h.signedCount===0,'logged-out causes no signing');
 okay(loggedOut.textContent.includes('Log in'),'logged-out message');

 let answer;
 const pending=new Promise(resolve=>{answer=resolve;});
 h=harness({signed:()=>pending});
 const account=mockContainer();
 const playPromise=h.play(account);
 await Promise.resolve();
 h.context.authSession={user:{id:USER_B}};
 answer({url:URL1});
 okay(await playPromise===false,'session change denies pending result');
 okay(h.videos.length===0,'stale ticket never reaches DOM');
 okay(!account.textContent.includes('laden'),'stale spinner removed after account change');

 console.log('TK504 protected player flow: '+n+' synthetic DOM/authorization/retry tests PASS');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
