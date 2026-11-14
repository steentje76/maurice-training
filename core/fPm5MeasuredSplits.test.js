'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function fn(n){const st=html.indexOf('function '+n+'(');assert(st>=0,n);for(let e=html.indexOf('}',st);e>=0;e=html.indexOf('}',e+1)){let s=html.slice(st,e+1);try{new Function('return ('+s+')');return s;}catch{}}throw Error(n);}
const NT=require('../native/src/nativeConcept2BleTransport'),Live=require('./concept2Live');
(async()=>{
 const notify={},gateway={isEnabled:async()=>true,checkPermission:async()=> 'granted',connect:async()=>{},disconnect:async()=>{},getServices:async()=>[],
 startNotifications:async(id,svc,ch,cb)=>{notify[ch.toLowerCase()]=cb;},stopNotifications:async()=>{}};
 const transport=NT.makeNativeConcept2BleTransport({gateway,concept2Live:Live,subscriptionMode:'MULTIPLEXED'});
 await transport.connect('rowerg','synthetic-pm5');
 const mux='ce060080-43e5-11e4-916c-0800200c9a66',received=[];
 transport.subscribeMetrics(e=>received.push(e.metrics));
 function packet(number,time,elapsed,distance){
  const b=new Uint8Array(19);b[0]=0x37;
  const le=(off,n,len)=>{for(let i=0;i<len;i++)b[off+i]=(n>>>(8*i))&255;};
  le(1,Math.round(elapsed*100),3);le(4,distance*10,3);le(7,Math.round(time*10),3);le(10,250,3);
  b[17]=1;b[18]=number;return new DataView(b.buffer);
 }
 [58,57,59,58].forEach((v,i)=>notify[mux](packet(i+1,v,[58,115,174,232][i],(i+1)*250)));
 assert.equal(received.length,4);assert.deepEqual(received.map(x=>x.splitTimeS),[58,57,59,58]);assert(received.every(x=>x.splitDistanceM===250));
 assert.equal(transport.getCurrentMetrics(),null,'split packets must not replace live totals');
 notify[mux](new DataView(new Uint8Array([0x37,1,2]).buffer));assert.equal(received.length,4,'truncated packet refused');
 const ctx=transport.getControlContext();let owner='synthetic-owner',saves=0;
 const c={curT:'A',sessionLog:{row:{c2:{distanceM:1000,elapsedTimeS:232},intervalsDetail:{version:'erg_intervals_actual.v1',blocks:[{block_index:0}]}}},
 tkEigenaarUid:()=>owner,_c2rtGet:(id,g,d)=>g===ctx.generation&&d===ctx.deviceId?{ownerUid:'synthetic-owner'}:null,
 tkC2IsLoggableSummary:x=>x.distanceM>0&&x.elapsedTimeS>0,persistTrainingDraft:()=>saves++,document:{getElementById:()=>null},CardioEngine:{formatTime:x=>String(x)},Date};
 vm.createContext(c);for(const n of ['tkErgOnMeasuredSplit','tkPm5MeasuredSplitsHtml'])vm.runInContext(fn(n),c);
 received.forEach(r=>assert.equal(c.tkErgOnMeasuredSplit('row',r,ctx),true));
 const detail=c.sessionLog.row.intervalsDetail;assert.equal(detail.pm5_splits.length,4);assert.equal(detail.blocks.length,1,'app interval blocks retained');
 assert.equal(detail.pm5_splits.reduce((a,b)=>a+b.duration_s,0),232);assert.equal(saves,4);
 assert(c.tkPm5MeasuredSplitsHtml(detail).includes('Gemeten PM5-splits'));assert.equal(c.tkPm5MeasuredSplitsHtml({}), '');
 c.tkErgOnMeasuredSplit('row',received[0],ctx);assert.equal(detail.pm5_splits.length,4);assert.equal(saves,4,'duplicate packet has no side effects');
 assert.equal(c.tkErgOnMeasuredSplit('row',received[0],{...ctx,generation:ctx.generation+1}),false);
 owner='other-owner';assert.equal(c.tkErgOnMeasuredSplit('row',received[0],ctx),false);owner='synthetic-owner';
 assert.equal(c.tkErgOnMeasuredSplit('row',{...received[0],intervalType:2},ctx),false,'rest not labelled work');
 c.sessionLog.row.c2Completed={measurement:c.sessionLog.row.c2};
 assert.equal(c.tkErgOnMeasuredSplit('row',{...received[3],intervalNumber:5,elapsedTimeS:300},ctx),false,'later workout excluded after freeze');
 assert(html.includes('tkPm5MeasuredSplitsHtml(s.intervals_detail)'),'logbook reads saved actuals');
 assert(html.includes("intervals_detail:(l.intervalsDetail||null)"),'existing single writer persists split JSON');
 const oldNotification=notify[mux];await transport.disconnect();
const before=received.length;oldNotification(packet(5,60,292,1250));assert.equal(received.length,before,'disconnected notification rejected');
await transport.connect('rowerg','different-pm5');oldNotification(packet(5,60,292,1250));assert.equal(received.length,before,'old generation callback cannot reach new device');
await transport.disconnect();
c.curT=null;c.LOS_DOMID='los';c.sessionLog.los={c2:{distanceM:1000,elapsedTimeS:232}};
assert.equal(c.tkErgOnMeasuredSplit('los',received[0],ctx),true,'standalone uses same split handoff');
assert(html.includes('row.intervals_detail=sessionLog[LOS_DOMID].intervalsDetail'),'standalone writer retains measured splits');
assert(fn('logCardio').includes('...(sessionLog[exId].cardio||{})'),'form edits retain missing-split provenance');
 console.log('PM5 real 0x37 path: byte units, uneven splits, truncated packet, totals isolation, owner/generation, duplicate, freeze bound, draft and history PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
