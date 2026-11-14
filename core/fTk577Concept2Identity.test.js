'use strict';
/* Official Concept2 PM CSAFE spec, device-information table and Appendix A.
 * Synthetic protocol fixtures prove decoding and lease isolation, not physical PM5 acceptance. */
const assert=require('assert'),C=require('./concept2Live.js'),NT=require('../native/src/nativeConcept2BleTransport.js');
let pass=0,fail=0;
async function t(name,run){try{await run();pass++;}catch(e){fail++;console.log('FAIL '+name+': '+e.message);}}
const bytes=s=>Array.from(Buffer.from(s,'ascii'));
(async()=>{
  await t('004/005 official UUID mapping',()=>{
    const ch=C.CONCEPT2_BLE_UUIDS.characteristics;
    for(const [key,hex] of Object.entries({serialNumber:'12',firmwareRev:'14',hardwareRev:'13',manufacturer:'15',machineType:'16'}))assert(ch[key].uuid.startsWith('CE0600'+hex));
  });
  await t('004 serial from complete advertised PM5 name only',()=>{
    assert.equal(C.pm5SerialFromName('PM5 123456789 Ski'),'123456789');
    for(const s of ['Concept2 PM5','#0:27','PM5 1234 Row','XX PM5 123456789','PM5 1234567890'])assert.equal(C.pm5SerialFromName(s),null);
  });
  await t('005 official SkiErg, RowErg, BikeErg one-byte types',()=>{
    for(const [b,type] of [[128,'skierg'],[225,'skierg'],[192,'bikeerg'],[0,'rowerg']])assert.equal(C.decodePm5Identity({machineType:[b]}).reportedMachineType,type);
    for(const b of [4,30,200,255])assert.equal(C.decodePm5Identity({machineType:[b]}).reportedMachineType,null);
    assert.equal(C.decodePm5Identity({machineType:[128,0]}).reportedMachineType,null);
    assert.equal(C.decodePm5Identity({machineType:bytes('Concept2')}).reportedMachineType,null);
  });
  await t('004 strict serial decoding, unknown and malformed are not inferred',()=>{
    assert.equal(C.decodePm5Identity({serialNumber:bytes('123456789')}).serialNumber,'123456789');
    for(const raw of [[],bytes('PM5'),bytes('1234'),bytes('<script>'),[0xff]])assert.equal(C.decodePm5Identity({serialNumber:raw}).serialNumber,null);
  });
  await t('005 name hint states uncertainty',()=>{
    const msg=C.machineHintMismatchMessage('rowerg','skierg');assert(/niet bevestigd/.test(msg));assert(!/meldt zich als/.test(msg));
  });
  await t('004 native reads actual serial and type; stale device read discarded',async()=>{
    let release;
    const pending=new Promise(resolve=>release=resolve);
    let delay=false;
    const gw={connect:async()=>{},getServices:async()=>[],startNotifications:async()=>{},stopNotifications:async()=>{},disconnect:async()=>{},
      read:async(id,svc,ch)=>{
        if(delay){await pending;}
        const data=ch.startsWith('CE060012')?bytes('123456789'):ch.startsWith('CE060016')?[128]:[];
        return new DataView(Uint8Array.from(data).buffer);
      }};
    const nt=NT.makeNativeConcept2BleTransport({gateway:gw,concept2Live:C});
    await nt.connect('skierg','synthetic-a');
    const info=await nt.getDeviceInfo();assert.equal(info.serialNumber,'123456789');assert.equal(info.reportedMachineType,'skierg');
    delay=true;const old=nt.getDeviceInfo();await nt.disconnect();await nt.connect('rowerg','synthetic-b');release();
    assert.equal((await old).deviceId,null);assert.equal(nt.getStatus().deviceId,'synthetic-b');
  });
  console.log('Resultaat: '+pass+' geslaagd, '+fail+' mislukt');process.exitCode=fail?1:0;
})();
