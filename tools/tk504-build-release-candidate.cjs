#!/usr/bin/env node
'use strict';
// #504: generate a cumulative package release CANDIDATE (packages 1..N) from
// the Git-tracked golden inventory + optimized poster digests via the canonical
// ledger. Output status is RELEASE_CANDIDATE_NOT_APPROVED: it can never sign
// media or serve catalog rows until a separate owner release decision changes
// the central release document. Refuses to overwrite that document.
// Usage: node tools/tk504-build-release-candidate.cjs --package 1 \
//   --review TK504-YYYYMMDD-NNN --upload TK504-YYYYMMDD-NNN [--out file.json]
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ledger=require('../core/tk504BatchReleaseLedger.js');
const media=require('../netlify/functions/exercise-media-v2-url.js')._internal;
function arg(name){const i=process.argv.indexOf(name);return i>0?process.argv[i+1]:undefined;}
try{
  const n=Number(arg('--package'));
  if(!Number.isSafeInteger(n)||n<1||n>15)throw Error('--package 1..15 required');
  const candidate=ledger.buildReleaseCandidate(n,{
    inventory:require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'),
    posters:require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json'),
    inventorySha:media.inventorySha,posterSha:media.posterSha,
    reviewReference:arg('--review'),uploadReference:arg('--upload')});
  const scope=ledger.releasedScope(candidate);
  if(!scope||scope.batch!==n)throw Error('candidate failed ledger validation');
  const out=arg('--out');
  const text=JSON.stringify(candidate,null,2)+'\n';
  if(out){
    const target=path.resolve(out);
    if(target===path.join(root,'docs','generated','MOVEKIT_V2_RELEASE_GATES.json'))
      throw Error('refusing to overwrite the central release document');
    fs.writeFileSync(target,text,{flag:'wx'});
  }
  console.log(JSON.stringify({package:n,through:scope.through,new_count:scope.new_count,
    total:scope.total,entries:candidate.entries.length,status:candidate.status,
    written:!!out}));
}catch(e){console.error('TK504_RELEASE_CANDIDATE_FAILED: '+e.message);process.exitCode=1;}
