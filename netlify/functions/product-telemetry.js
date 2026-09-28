// MS-TELEMETRY-01 — dedicated product telemetry ingestion.
// Fail-safe for product flow; fail-closed for event/property content.
const ProductTelemetry = require('../../core/productTelemetry.js');
const MAX_BYTES=2048, WINDOW_MS=60000, MAX_PER_WINDOW=60, rate=Object.create(null);
function response(){return {statusCode:204,headers:{'Cache-Control':'no-store'},body:''};}
function limited(k){const n=Date.now(),e=rate[k];if(!e||n-e.start>WINDOW_MS){rate[k]={start:n,count:1};return false;}e.count++;return e.count>MAX_PER_WINDOW;}
async function userFromToken(token,base,anonKey){if(!token||!base||!anonKey)return null;try{const r=await fetch(base+'/auth/v1/user',{headers:{Authorization:token,apikey:anonKey}});if(!r.ok)return null;const u=await r.json();return u&&u.id?u.id:null;}catch(e){return null;}}
exports.handler=async function(event){
 if(event.httpMethod!=='POST')return response();
 try{
  if(Buffer.byteLength(event.body||'','utf8')>MAX_BYTES)return response();
  const base=process.env.SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY,anon=process.env.SUPABASE_ANON_KEY;
  if(!base||!service||!anon)return response();
  const auth=(event.headers&&(event.headers.authorization||event.headers.Authorization))||'',uid=await userFromToken(auth,base,anon);
  if(!uid||limited(uid))return response();
  const body=JSON.parse(event.body||'{}'),built=ProductTelemetry.buildEvent(body.event,body.properties||{},{app_version:body.app_version,environment:body.environment,platform:body.platform});
  if(!built.ok)return response();
  const e=built.event,props={};Object.keys(body.properties||{}).forEach(k=>{if(k!=='route_id'&&k!=='correlation_id')props[k]=body.properties[k];});
  await fetch(base+'/rest/v1/product_telemetry_events',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({user_id:uid,event_id:e.event,event_version:e.event_version,app_version:e.app_version,environment:e.environment,platform:e.platform,route_id:e.route_id||null,correlation_id:e.correlation_id||null,properties:props})});
 }catch(e){/* telemetry must never affect the product flow */}
 return response();
};