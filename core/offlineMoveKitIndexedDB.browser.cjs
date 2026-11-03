/* Real Chrome/Android-WebView-compatible IndexedDB persistence test.
 * No MoveKit video/poster files, Supabase credentials or user records are loaded.
 * Usage: NODE_PATH=/path/to/playwright node core/offlineMoveKitIndexedDB.browser.test.js
 */
'use strict';
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
let chromium;
try{chromium=require('playwright').chromium;}catch(e){console.log('SKIPPED: playwright not installed');process.exit(0);}
const appRoot=path.join(__dirname,'..');
const ownerA='12345678-1234-4234-8234-123456789abc';
const ownerB='12345678-1234-4234-8234-123456789def';
const guide={schema:'trainingskompas-offline-guide/1.0',ownerId:ownerA,workoutId:'leg-day-1',catalogIds:['TK-000038'],
  items:[{catalogId:'TK-000038',name:'Barbell Squat',category:'compound',primary:['Quadriceps'],equipment:['barbell'],cues:['Houd je rug neutraal']}],
  videoOfflineStatus:'LICENCE_REVIEW_REQUIRED',rawMediaStored:false};
(async()=>{
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Offline guides test</title>');});
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
 const port=server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.TK_CHROME_PATH||undefined});
 const context=await browser.newContext();
 try{
  async function init(page){
   await page.goto('http://127.0.0.1:'+port);
   await page.addScriptTag({path:path.join(__dirname,'offlineMoveKitPackCore.js')});
   await page.addScriptTag({path:path.join(__dirname,'offlineMoveKitIndexedDB.js')});
  }
  const page=await context.newPage();
  await init(page);
  const first=await page.evaluate(async({a,b,g})=>{
   const adapter=OfflineMoveKitIndexedDB.create({dbName:'tk-offline-guides-browser-test'});
   const store=OfflineMoveKitPackCore.store(adapter);
   const before=await store.get(a,'leg-day-1');
   await store.save(a,g);
   const stored=await store.get(a,'leg-day-1');
   const cross=await store.get(b,'leg-day-1');
   const countA=(await store.list(a)).length;
   const countB=(await store.list(b)).length;
   await adapter.close();
   return {before,stored,cross,countA,countB};
  },{a:ownerA,b:ownerB,g:guide});
  assert.equal(first.before,null);
  assert.deepEqual(first.stored,guide);
  assert.equal(first.cross,null);
  assert.equal(first.countA,1);
  assert.equal(first.countB,0);
  const second=await context.newPage();
  await init(second); // new page/window, same origin and persisted device store
  const after=await second.evaluate(async({a,b})=>{
   const adapter=OfflineMoveKitIndexedDB.create({dbName:'tk-offline-guides-browser-test'});
   const store=OfflineMoveKitPackCore.store(adapter);
   const fromDisk=await store.get(a,'leg-day-1');
   const cross=await store.get(b,'leg-day-1');
   const noRaw=JSON.stringify(fromDisk).indexOf('mp4')===-1&&JSON.stringify(fromDisk).indexOf('https:')===-1;
   await store.remove(b,'leg-day-1'); // another owner's key is distinct
   const preserved=await store.get(a,'leg-day-1');
   await store.remove(a,'leg-day-1');
   const erased=await store.get(a,'leg-day-1');
   await adapter.close();
   return {fromDisk,cross,noRaw,preserved,erased};
  },{a:ownerA,b:ownerB});
  assert.deepEqual(after.fromDisk,guide);
  assert.equal(after.cross,null);
  assert.equal(after.noRaw,true);
  assert.deepEqual(after.preserved,guide);
  assert.equal(after.erased,null);
  console.log('Chrome IndexedDB offline guide persistence: PASS; restart, account isolation, no raw media, removal');
 }finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});