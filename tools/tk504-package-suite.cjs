'use strict';
// Focused #504 package suite: runs the existing catalog/media/runtime tests
// that guard the 15-package integration path. Exit code != 0 on any failure.
const {spawnSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const tests=['tk504Batch15Integration','tk504SignedStorageAcceptance',
  'tk504PublishedCatalogBroker','tk504PublishedCatalogRuntime',
  'movekitV2ClientServerContract','movekitV2Broker','movekitV2ExerciseMediaBridge',
  'tk504MediaRenewalBoundary','tk504ProtectedPlayback','tk504V1SigningRetirement',
  'tk504ProtectedPlayerFlow','tk504PrivateReleaseCutoverGuard','sw-guard',
  'tk504ApprovedPrivateContentStage','tk504CatalogProvenanceFlow','tk504HistoryOwnerProjection',
  'tk603PickerProvenanceCollision','tk603OfflineRestartProvenance','tk603ExecutionMediaProvenance'];
let failed=0;
for(const t of tests){
  const r=spawnSync(process.execPath,[path.join(root,'core',t+'.test.js')],{cwd:root,encoding:'utf8',timeout:600000});
  const lines=(r.stdout+r.stderr).trim().split(/\r?\n/).filter(l=>!/^PACKAGE /.test(l));
  const ok=r.status===0;if(!ok)failed++;
  console.log((ok?'PASS ':'FAIL ')+t+': '+(lines.at(-1)||'').slice(0,160));
}
console.log(failed?failed+' FAILED':'ALL '+tests.length+' PASS');
process.exitCode=failed?1:0;
