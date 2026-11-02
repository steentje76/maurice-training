/* TK #579 -- sequential PM5 interval transfer, NOT a workout-confirmation oracle.
 * Only raw Concept2 CSAFE / existing transport; no execution or database writer.
 * A fully transferred sequence is TRANSFERRED_UNVERIFIED until actual PM5 structure
 * readback and physical acceptance are available. */
(function(root){
'use strict';
var C=typeof require==='function'?require('./concept2Csafe.js'):root.Concept2Csafe;
var STATE={IDLE:'IDLE',WRITING:'WRITING',WRITING_ACK:'WRITING_ACK',WAIT_DIRECT:'WAIT_DIRECT',
  WAIT_ACK:'WAIT_ACK',TRANSFERRED_UNVERIFIED:'TRANSFERRED_UNVERIFIED',
  FAILED:'FAILED',TIMEOUT:'TIMEOUT',CANCELLED:'CANCELLED'};
function createFiniteIntervalTransfer(deps){
  deps=deps||{};
  var csafe=deps.csafe||C,write=deps.write;
  var startTimer=deps.setTimeoutFn||setTimeout,stopTimer=deps.clearTimeoutFn||clearTimeout;
  var ms=Number.isFinite(deps.timeoutMs)?deps.timeoutMs:5000;
  var active=null,last=null,state=STATE.IDLE;
  function report(){return {state:state,pending:!!active,frameIndex:active?active.index:(last?last.frameIndex:null),
    frameCount:active?active.frames.length:(last?last.frameCount:null),
    lastResult:last};}
  function validContext(op,ctx){
    return !!(ctx&&ctx.connected===true&&ctx.deviceId===op.deviceId&&
      ctx.generation===op.generation);
  }
  function timer(op){
    if(op.timer!=null)stopTimer(op.timer);
    op.timer=startTimer(function(){
      if(active===op) finish(STATE.TIMEOUT,(state===STATE.WRITING||state===STATE.WRITING_ACK)?'write_timeout':'response_timeout');
    },ms);
  }
  function finish(finalState,reason){
    var op=active;
    if(!op)return;
    if(op.timer!=null)stopTimer(op.timer);
    active=null;state=finalState;
    last={state:finalState,reason:reason||null,frameIndex:op.index,
      frameCount:op.frames.length,acked:op.acked,attempted:op.attempted,
      deviceIdPresent:!!op.deviceId,generation:op.generation,
      // partial transfer may already have changed PM5; no automatic retry.
      partialDeviceMutationPossible:op.attempted>0,
      verified:false};
    op.resolve({ok:false,transferred:finalState===STATE.TRANSFERRED_UNVERIFIED,
      state:finalState,reason:reason||null,progress:op.acked,total:op.frames.length,
      verified:false});
  }
  function sendFrame(op){
    if(active!==op)return;
    state=STATE.WRITING;
    timer(op);
    var n=op.index;
    if(n>=op.frames.length){finish(STATE.TRANSFERRED_UNVERIFIED,'complete_structure_readback_required');return;}
    op.attempted++;
    Promise.resolve().then(function(){return write(op.frames[n]);}).then(function(writeResult){
      if(active!==op||op.index!==n)return;
      if(writeResult===false||(writeResult&&writeResult.ok===false)){
        finish(STATE.FAILED,'frame_write_rejected');return;
      }
      if(state===STATE.WRITING){state=STATE.WAIT_DIRECT;timer(op);}
    }).catch(function(e){if(active===op)finish(STATE.FAILED,'frame_write_failed');});
  }
  function sendAck(op){
    if(active!==op)return;
    state=STATE.WRITING_ACK;
    timer(op);
    var f=csafe.buildGetStatusFrame();
    Promise.resolve().then(function(){return write(f.frame);}).then(function(writeResult){
      if(active!==op)return;
      if(writeResult===false||(writeResult&&writeResult.ok===false)){
        finish(STATE.FAILED,'ack_probe_write_rejected');return;
      }
      state=STATE.WAIT_ACK;timer(op);
    }).catch(function(){
      if(active===op)finish(STATE.FAILED,'ack_probe_write_failed');
    });
  }
  function start(normalized,ctx){
    if(active)return Promise.resolve({ok:false,state:state,reason:'already_pending',verified:false});
    ctx=ctx||{};
    if(typeof write!=='function'||!csafe)return Promise.resolve({ok:false,state:STATE.FAILED,reason:'write_unavailable',verified:false});
    // Caller must derive idle readback from current physical PM5, not an app setting.
    var idle=ctx.preflight;
    if(ctx.connected!==true||!ctx.deviceId||ctx.generation==null||!Number.isInteger(ctx.controlResponseSeq))
      return Promise.resolve({ok:false,state:STATE.FAILED,reason:'identity_or_connection_missing',verified:false});
    if(ctx.userConfirmed!==true)return Promise.resolve({ok:false,state:STATE.FAILED,reason:'explicit_user_confirmation_required',verified:false});
    if(!idle||idle.source!=='pm5_0x31'||idle.deviceId!==ctx.deviceId||
       idle.generation!==ctx.generation||idle.workoutState!==0||
       !Number.isFinite(idle.observedAt)||!Number.isFinite(ctx.now)||ctx.now<idle.observedAt||
       ctx.now-idle.observedAt>15000)
      return Promise.resolve({ok:false,state:STATE.FAILED,reason:'fresh_idle_pm5_readback_required',verified:false});
    var compiled=csafe.compileFiniteIntervalPrescription(normalized);
    if(!compiled||!compiled.ok)return Promise.resolve({ok:false,state:STATE.FAILED,reason:'invalid_prescription:'+((compiled&&compiled.error)||'unknown'),verified:false});
    var planned=csafe.planBleCharacteristicFrames(compiled);
    if(!planned||!planned.ok||!planned.frames.length||planned.frames.some(function(f){return f.length>20;}))
      return Promise.resolve({ok:false,state:STATE.FAILED,reason:'ble_frame_plan_unavailable',verified:false});
    var op={frames:planned.frames,index:0,acked:0,attempted:0,deviceId:ctx.deviceId,
      generation:ctx.generation,timer:null,resolve:null,lastControlSeq:ctx.controlResponseSeq};
    active=op;
    var p=new Promise(function(resolve){op.resolve=resolve;});
    sendFrame(op);
    return p;
  }
  function handleControlResponse(bytes,ctx){
    var op=active;
    if(!op)return {handled:false,reason:'no_pending'};
    if(!validContext(op,ctx))return {handled:false,reason:'wrong_device_or_generation'};
    if(!Number.isInteger(ctx.controlResponseSeq)||ctx.controlResponseSeq<=op.lastControlSeq)
      return {handled:false,reason:'stale_control_response'};
    if(state!==STATE.WAIT_DIRECT&&state!==STATE.WAIT_ACK)return {handled:false,reason:'not_awaiting_response'};
    var r=csafe.parseResponseFrame(bytes);
    if(!r||!r.ok)return {handled:false,reason:'invalid_response'};
    op.lastControlSeq=ctx.controlResponseSeq;
    var P=csafe.PREVIOUS_FRAME_STATUS;
    if(r.previousFrameStatus===P.REJECT||r.previousFrameStatus===P.BAD){
      finish(STATE.FAILED,state===STATE.WAIT_ACK?'ack_rejected':'direct_rejected');
      return {handled:true,state:STATE.FAILED};
    }
    if(r.previousFrameStatus!==P.OK)return {handled:true,state:state,reason:'not_ready'};
    if(state===STATE.WAIT_DIRECT){
      sendAck(op);
      return {handled:true,state:state};
    }
    // Previous Frame Status on the GETSTATUS response acknowledges the
    // *preceding program frame*, not the current configuration as a whole.
    op.acked++;op.index++;
    if(op.timer!=null){stopTimer(op.timer);op.timer=null;}
    sendFrame(op);
    return {handled:true,state:state,acked:op.acked};
  }
  function cancel(reason){if(active)finish(STATE.CANCELLED,reason||'cancelled');}
  return {STATE:STATE,start:start,handleControlResponse:handleControlResponse,
    cancel:cancel,getDiagnostics:report,isPending:function(){return !!active;}};
}
var api={STATE:STATE,createFiniteIntervalTransfer:createFiniteIntervalTransfer};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.Concept2FiniteTransfer=api;
})(typeof self!=='undefined'?self:this);
