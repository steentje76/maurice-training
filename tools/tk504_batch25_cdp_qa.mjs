#!/usr/bin/env node
// Bounded real Chromium acceptance of a private 25-row TK ECS pilot.
// Only localhost; media and user-specific source content stay outside Git.
import {setTimeout as delay} from 'node:timers/promises';

const url=process.argv[2]||'http://127.0.0.1:18779/';
const debuggerPort=Number(process.argv[3]||18780);
if(!/^http:\/\/127\.0\.0\.1:\d+\/$/.test(url) ||
   ![18779,18780,18781].includes(debuggerPort))throw Error('LOCAL_ONLY');
const targets=await (await fetch('http://127.0.0.1:'+debuggerPort+'/json/list')).json();
const page=targets.find(x=>x.type==='page'&&x.url.startsWith(url));
if(!page)throw Error('NO_LOCAL_TARGET');
const ws=new WebSocket(page.webSocketDebuggerUrl);
const waiting=new Map();let sequence=0;
ws.onmessage=e=>{
 let x;try{x=JSON.parse(e.data)}catch{return}
 const target=waiting.get(x.id);if(!target)return;
 waiting.delete(x.id);
 x.error?target.reject(new Error(JSON.stringify(x.error))):target.resolve(x.result);
};
await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej});
const invoke=(method,params)=>new Promise((resolve,reject)=>{
 const id=++sequence;waiting.set(id,{resolve,reject});
 ws.send(JSON.stringify({id,method,params}));
});
const check=async function(){
 const summary=Array.from(document.querySelectorAll('#tk504-batch-items button[data-catalog-id]'));
 const root=document.querySelector('#tk504-batch-review');
 if(!root||summary.length!==25)return {ok:false,problem:'NOT_25_CARDS',cards:summary.length};
 const expected=['TK-000227','TK-000238','TK-000251'];
 const browser={cards:summary.length,unique:new Set(summary.map(x=>x.dataset.catalogId)).size,
   approved:document.querySelectorAll('#tk504-batch-items .approved').length,
   concept:document.querySelectorAll('#tk504-batch-items .status:not(.approved)').length,
   selected:[],search:false};
 const inp=document.getElementById('tk504-batch-search');
 inp.value='TK-000251';inp.dispatchEvent(new Event('input',{bubbles:true}));
 browser.search=document.querySelectorAll('#tk504-batch-items button[data-catalog-id]').length===1;
 inp.value='';inp.dispatchEvent(new Event('input',{bubbles:true}));
 for(const id of expected){
   const button=document.querySelector('#tk504-batch-items button[data-catalog-id="'+id+'"]');
   if(!button){browser.selected.push({id,ok:false,problem:'BUTTON_NOT_FOUND'});continue}
   button.click();
   const video=document.getElementById('tk504-batch-video');
   const proof=document.querySelector('#tk504-batch-review .detail code.verify');
   const ok=proof&&proof.textContent.includes('"id":"'+id+'"')&&
      proof.textContent.includes('"ok":true');
   if(!ok||!video){browser.selected.push({id,ok:false,problem:'CANONICAL_MEDIA_NOT_RESOLVED'});continue}
   const loaded=await new Promise(resolve=>{
      if(video.readyState>=1)return resolve(true);
      let end=false;
      const timer=setTimeout(()=>{if(!end){end=true;resolve(false)}},9000);
      video.onloadedmetadata=()=>{if(!end){end=true;clearTimeout(timer);resolve(true)}};
      video.onerror=()=>{if(!end){end=true;clearTimeout(timer);resolve(false)}};
      video.load();
   });
   if(!loaded){browser.selected.push({id,ok:false,problem:'VIDEO_METADATA_FAILED'});continue}
   const duration=video.duration;
   const pos=duration*.5;
   const seek=await new Promise(resolve=>{
     let end=false;const timer=setTimeout(()=>{if(!end){end=true;resolve(false)}},9000);
     video.addEventListener('seeked',()=>{if(!end){end=true;clearTimeout(timer);resolve(true)}},{once:true});
     video.currentTime=pos;
   });
   let played=false,progress=0;
   if(seek){
     video.muted=true;
     try{
       await video.play();
       const before=video.currentTime;
       await new Promise(resolve=>setTimeout(resolve,420));
       progress=video.currentTime-before;
       played=progress>=0;
     }catch(_){}
   }
   video.pause();
   browser.selected.push({id,ok:loaded&&seek&&played&&video.videoWidth>0,
      duration:Math.round(duration*100)/100,seek,played,
      width:video.videoWidth,height:video.videoHeight,
      progress_seconds:Math.round(progress*100)/100});
 }
 return {ok:browser.cards===25&&browser.unique===25&&browser.approved===1&&
    browser.concept===24&&browser.search&&browser.selected.every(x=>x.ok),
    ...browser};
};
try{
 const r=await Promise.race([
   invoke('Runtime.evaluate',{
      expression:'('+check.toString()+')()',returnByValue:true,awaitPromise:true
   }),
   delay(65000,null,{ref:false}).then(()=>{throw Error('TIMEOUT')})
 ]);
 const result=r?.result?.value;
 console.log('TK504_BATCH25_CHROMIUM='+JSON.stringify(result));
 ws.close();
 if(!result?.ok)process.exitCode=1;
}catch(e){
 console.error('TK504_BATCH25_CDP_ERROR='+e.message);
 ws.close();process.exitCode=1;
}
