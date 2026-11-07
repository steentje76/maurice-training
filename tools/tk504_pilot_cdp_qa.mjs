#!/usr/bin/env node
// TK504: read-only Chromium CDP proof for localhost single-candidate pilot.
// No licensed media, signed URLs, credentials or user data in output.
import { setTimeout as delay } from 'node:timers/promises';

const origin='http://127.0.0.1:18777/';
const debuggerOrigin='http://127.0.0.1:18778';
const targets=await (await fetch(debuggerOrigin+'/json/list')).json();
const target=targets.find(x=>x.type==='page'&&x.url.startsWith(origin));
if(!target || !/^ws:\/\/127\.0\.0\.1:18778\//.test(target.webSocketDebuggerUrl||'')){
  console.error('TK504_CDP_NO_PRIVATE_PILOT_TARGET');
  process.exit(2);
}
const ws=new WebSocket(target.webSocketDebuggerUrl);
let seq=0;
const pending=new Map();
ws.onmessage=e=>{
  let msg;try{msg=JSON.parse(e.data);}catch{return;}
  if(!pending.has(msg.id))return;
  const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);
  if(msg.error)reject(new Error(JSON.stringify(msg.error)));
  else resolve(msg.result);
};
await new Promise((resolve,reject)=>{
  ws.onopen=resolve;
  ws.onerror=()=>reject(new Error('CDP_WEBSOCKET_ERROR'));
});
function call(method,params={}){
 return new Promise((resolve,reject)=>{
   const id=++seq;pending.set(id,{resolve,reject});
   ws.send(JSON.stringify({id,method,params}));
 });
}
const snippet='('+ (async function(){
  const video=document.getElementById('tk504-pilot-video');
  const rep=document.querySelector('#tk504-pilot-panel code');
  if(!video||!rep||!rep.textContent.includes('"ok":true'))return {ok:false,error:'PILOT_NOT_WIRED'};
  const loaded=()=>{
    if(video.readyState>=1)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const tid=setTimeout(()=>reject(new Error('LOAD_TIMEOUT')),12000);
      video.addEventListener('loadedmetadata',()=>{clearTimeout(tid);resolve();},{once:true});
      video.addEventListener('error',()=>{clearTimeout(tid);reject(new Error('MEDIA_LOAD_ERROR'));},{once:true});
      video.load();
    });
  };
  try{
    await loaded();
    const duration=video.duration;
    if(!Number.isFinite(duration)||duration<3)return {ok:false,error:'INVALID_DURATION'};
    const midpoint=duration*0.54;
    const seekDone=new Promise((resolve,reject)=>{
      const tid=setTimeout(()=>reject(new Error('SEEK_TIMEOUT')),10000);
      video.addEventListener('seeked',()=>{clearTimeout(tid);resolve();},{once:true});
    });
    video.currentTime=midpoint;
    await seekDone;
    const at=video.currentTime;
    video.muted=true;
    await video.play();
    await new Promise(resolve=>setTimeout(resolve,700));
    const playedTime=video.currentTime;
    const result={ok:at>=2&&playedTime>=at&&video.readyState>=2&&video.videoWidth>0,
      loaded:true,seeked:true,played:true,
      seconds:Math.round(duration*100)/100,seek_seconds:Math.round(at*100)/100,
      elapsed_seconds:Math.round((playedTime-at)*100)/100,
      width:video.videoWidth,height:video.videoHeight,
      network_state:video.networkState,ready_state:video.readyState,
      error_code:video.error?.code||null};
    video.pause();
    return result;
  }catch(e){return {ok:false,error:String(e.message||e)}}
}).toString()+')()';
try{
  const r=await Promise.race([
    call('Runtime.evaluate',{expression:snippet,awaitPromise:true,returnByValue:true}),
    delay(30000,null,{ref:false}).then(()=>{throw new Error('CDP_EVAL_TIMEOUT')})
  ]);
  const result=r?.result?.value;
  console.log('TK504_REAL_CHROMIUM_PLAYBACK='+JSON.stringify(result));
  ws.close();
  if(!result?.ok)process.exitCode=1;
}catch(e){
  console.error('TK504_CDP_FAIL: '+e.message);
  ws.close();process.exitCode=1;
}
