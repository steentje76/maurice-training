'use strict';
// TK504: run the staged V2 bridge beside the REAL shipped
// ExerciseAssetProvider from index.html, without changing the live provider.
// This verifies a one-app migration path, not activation or licensed playback.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {create}=require('./movekitV2ExerciseMediaBridge.js');
const catalog=require('../exercise-catalog.json');

const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const start=html.indexOf('var ExerciseAssetProvider=(function(){');
const end=html.indexOf('var ExerciseIntelligence=(function(){');
assert.ok(start>0 && end>start,'cannot locate real shipped media provider');
const actual=new Function('window','location',html.slice(start,end)+
  '\n return {provider:ExerciseAssetProvider, manifest:VIDEO_MANIFEST};')(
  {},{hostname:'localhost'}
);
const provider=actual.provider;
const typesBefore=provider.types().slice();
const keysBefore=Object.keys(provider).sort();
let calls=0, invalidations=0, enabled=false;
const mockPrivateClient={
  get:async(id,type,owner)=>{
    calls++;
    if(!enabled)throw new Error('MEDIA_NOT_RELEASED');
    return {catalogId:id,type,owner,version:'v2',signedUrl:'SYNTHETIC_ONLY'};
  },
  invalidate:()=>{invalidations++;}
};
const bridge=create({catalog,mediaClient:mockPrivateClient});
let pass=0;
function check(title,condition){assert.ok(condition,title);pass++;}
(async()=>{
  check('226 catalog entries are still the sole canonical source',bridge.registeredMoveKitExercises===226);
  check('production provider still has video media',provider.has('TK-000206','video'));
  check('production provider points to its preexisting version 1 video',
    provider.resolve('TK-000206','video')==='https://maurice-art.netlify.app/videos/wall-sit.mp4');
  check('production unknown video still unavailable',provider.resolve('TK-999999','video')===null);
  check('old provider methods still all present',keysBefore.includes('poster')&&keysBefore.includes('video'));
  check('new bridge does not mutate legacy types',JSON.stringify(typesBefore)===JSON.stringify(provider.types()));
  check('new bridge does not mutate legacy function keys',JSON.stringify(keysBefore)===JSON.stringify(Object.keys(provider).sort()));
  check('canonical catalog object resolves in staged V2 bridge',
    bridge.resolve(catalog.catalog.find(c=>c.catalog_id==='TK-000206')).catalogId==='TK-000206');
  check('personal Supabase records cannot ride published TK identity',
    bridge.resolve({id:'TK-000206',scope:'personal',name:'Wall Sit'})===null);
  check('DB id-only projection cannot impersonate catalog',
    bridge.resolve({id:'TK-000206'})===null);
  await assert.rejects(()=>bridge.requestStaged(
    catalog.catalog.find(c=>c.catalog_id==='TK-000206'),'video','synthetic-user'),/MEDIA_NOT_RELEASED/);
  pass++;
  check('V2 denial does not silently cause direct public V1 media fallback',calls===1);
  check('V1 media behavior remains unchanged after V2 refusal',
    provider.resolve('TK-000206','video')==='https://maurice-art.netlify.app/videos/wall-sit.mp4');
  enabled=true;
  const request=await bridge.requestStaged(
    catalog.catalog.find(c=>c.catalog_id==='TK-000206'),'poster','synthetic-user');
  check('enabled synthetic adapter routes exact catalog ID, never a raw URL',
    request.catalogId==='TK-000206'&&request.version==='v2'&&request.type==='poster');
  check('staged bridge always reports inactive UI',bridge.activeUi===false);
  bridge.invalidate();
  check('account switch invalidation forwarded exactly once',invalidations===1);
  console.log('TK504 actual ExerciseAssetProvider + staged private V2 bridge: '+pass+
      ' compatibility assertions PASS; no runtime UI changes or silent V1 fallback');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
