import {SERVICE_MS} from './workload-lanes.mjs';
import './hosted-bootstrap.mjs';
import {applyReferenceOverrides} from './shadow-prerequisite-recovery.mjs';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createDecipheriv} from 'node:crypto';import {gunzipSync} from 'node:zlib';import {spawnSync} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url)),lane='shadowing',repository='mstrangtrieueducation-droid/'+lane+'-grader-runner';
const required=n=>{const v=process.env[n]?.trim();if(!v)throw Error('MISSING_'+n);return v;};
const runTest=name=>{const r=spawnSync(process.execPath,[name],{cwd:root,env:{...process.env,NATIVE_YOUTUBE_INPUT:'false',SHEET_TRUTH_SYNC:'false'},encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024});if(r.status){fs.mkdirSync(path.join(root,'private'),{recursive:true});fs.writeFileSync(path.join(root,'private','test-failure.txt'),r.stdout+'\n'+r.stderr);throw Error('SAFEGUARD_TEST_FAILED');}console.log(JSON.stringify({test:name,passed:true,providerCalls:0}));};
async function main(){
 runTest('encrypted-media-cache-tests.mjs');runTest('cooperative-upgrade-tests.mjs');runTest('worker-ownership-tests.mjs');runTest('lane-pool-tests.mjs');runTest('workload-lanes-tests.mjs');runTest('audio-completeness-tests.mjs');
 runTest('sheet-truth-merge-chunk-tests.mjs');
 runTest('ielts-address-policy-tests.mjs');
 runTest('shadow-receipt-feedback-tests.mjs');
 runTest('ielts-address-saved-repair-tests.mjs');
 runTest('submission-source-tests.mjs');runTest('receipt-body-tests.mjs');runTest('unpaid-google-retry-tests.mjs');runTest('native-youtube-tests.mjs');runTest('current-roster-policy-tests.mjs');
 const mode=process.env.MODE||'audit';if(!['validate','audit','grade','repair-scores'].includes(mode))throw Error('MODE_INVALID');
 const publicTests=["shadowing-fixed-ledger-tests.mjs", "shadowing-unblock-tests.mjs","shadowing-coverage-tests.mjs"];runTest('automatic-authorization-tests.mjs');runTest('export-safeguards.mjs');for(const n of publicTests)runTest(n);
 runTest('master-cross-class-sweep-tests.mjs');runTest('master-first-snapshot-tests.mjs');runTest('student-speech-evidence-tests.mjs');runTest('master-submission-scope-tests.mjs');runTest('saved-speaking-consistency-tests.mjs');runTest('shadow-parent-prose-tests.mjs');runTest('saved-json-whitespace-tests.mjs');
 runTest('shadow-score-passthrough-tests.mjs');runTest('structured-shadow-coverage-tests.mjs');runTest('saved-json-section-objects-tests.mjs');runTest('batch-delivery-checkpoint-tests.mjs');runTest('shadow-prerequisite-recovery-tests.mjs');runTest('shadow-audio-recovery-tests.mjs');
 runTest('shadow-legacy-placeholder-tests.mjs');
 runTest('continuous-dispatcher-tests.mjs');
 runTest('universal-media-tests.mjs');runTest('core-media-resolver-tests.mjs');runTest('shadow-multi-media-tests.mjs');runTest('media-source-notice-recovery-tests.mjs');
 runTest('provider-retry-policy-tests.mjs');
 runTest('screen-grounding-tests.mjs');
 runTest('shadow-billing-recovery-tests.mjs');
 runTest('feedback-alignment-tests.mjs');runTest('feedback-contrast-tests.mjs');
 if(mode==='validate')return;
 if(process.env.GITHUB_ACTIONS==='true'&&(process.env.GITHUB_REPOSITORY!==repository||process.env.GITHUB_REF!=='refs/heads/'+required('RUNNER_DEFAULT_BRANCH')))throw Error('TRUSTED_REPOSITORY_AND_BRANCH_REQUIRED');
 if(mode==='grade'&&process.env.GRADING_ENABLED!=='true')throw Error('HANDOFF_NOT_ENABLED');
 if(mode==='grade'){process.env.AUTOMATIC_GRADING_AUTHORIZED='true';process.env.MASTER_CROSS_CLASS_SWEEP='true';}
 const bytes=fs.readFileSync(path.join(root,'approved-policy.enc'));if(bytes.subarray(0,4).toString()!=='GB01')throw Error('PRIVATE_BUNDLE_SCHEMA_INVALID');
 const decipher=createDecipheriv('aes-256-gcm',Buffer.from(required('PRIVATE_BUNDLE_KEY'),'base64'),bytes.subarray(4,16));decipher.setAAD(Buffer.from(repository));decipher.setAuthTag(bytes.subarray(16,32));
 const bundle=JSON.parse(gunzipSync(Buffer.concat([decipher.update(bytes.subarray(32)),decipher.final()])).toString('utf8'));
 const config=bundle.config,sa=JSON.parse(required('GOOGLE_SERVICE_ACCOUNT_JSON'));
 if(mode==='repair-scores'){if(bundle.lane!==lane||bundle.schema!=='private-grading-bundle-v1'||config.approvedRepository!==repository||config.serviceAccount!==sa.client_email)throw Error('PRIVATE_BINDING_INVALID');if(process.env.GRADING_ENABLED!=='true')throw Error('HANDOFF_NOT_ENABLED');const {Google}=await import('./google-adapter.mjs'),{repairSavedShadowScores}=await import('./shadow-saved-score-repair.mjs');repairSavedShadowScores(new Google(sa),config,required('REPAIR_IDS').split(',').map(x=>x.trim()).filter(Boolean));return;}
 const key=required('GEMINI_KEY_'+lane.toUpperCase());
 if(bundle.lane!==lane||bundle.schema!=='private-grading-bundle-v1'||config.approvedRepository!==repository||config.serviceAccount!==sa.client_email)throw Error('PRIVATE_BINDING_INVALID');
 fs.mkdirSync(path.join(root,'private'),{recursive:true,mode:0o700});
 process.env.RUNNER_CONFIG=JSON.stringify(config);process.env.GOOGLE_CREDENTIALS=JSON.stringify(sa);process.env.GEMINI_API_KEY=key;process.env.KIDS_NATIVE_CONFIG=JSON.stringify(config.nativeConfig);process.env.RUNNER_SHEET_BATCH='0';process.env.RUNNER_HOST='github';if(bundle.nonStudentAudioRegistry)fs.writeFileSync(path.join(root,'private/non-student-audio-registry.json'),JSON.stringify(bundle.nonStudentAudioRegistry));
 if(lane==='kids'){const catalog=path.join(root,'migration/kids-barem-20261012/catalog.approved.json');fs.mkdirSync(path.dirname(catalog),{recursive:true});fs.writeFileSync(catalog,JSON.stringify(bundle.barem),{mode:0o600});process.env.MASTER_BAREM_CATALOG=catalog;runTest('kids-barem-recovery-tests.mjs');}
 else{fs.writeFileSync(path.join(root,'shadowing-references.json'),JSON.stringify(applyReferenceOverrides(bundle.references,bundle.referenceOverrides)),{mode:0o600});runTest('shadowing-tests.mjs');}
 const {Google,request,pause}=await import('./google-adapter.mjs');const google=new Google(sa),model=lane==='kids'?config.kids.model:config.shadowing.model;
 if(mode==='grade'){const {repairLegacyShadowZeros}=await import('./shadow-legacy-zero-repair.mjs');try{repairLegacyShadowZeros(google,config);}catch(e){if(e.message==='SHARED_RUNNER_BUSY')throw e;console.log(JSON.stringify({event:'LEGACY_ZERO_REPAIR_DEFERRED',providerCalls:0}));}}
 if(mode==='grade'&&bundle.unassessableRepairIds?.length){const {repairUnassessableShadow}=await import('./shadow-unassessable-repair.mjs');console.log(JSON.stringify({event:'UNASSESSABLE_SAVED_REPAIR',...repairUnassessableShadow(google,config,bundle.unassessableRepairIds)}));}
 const metadata=request({url:'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model),headers:{'x-goog-api-key':key},timeoutMs:30000});if(metadata.getResponseCode()!==200)throw Error('MODEL_PREFLIGHT_FAILED');
 if(mode==='audit'){
  const counts={};for(const id of lane==='kids'?config.clusters.map(c=>c.controlId):[config.shadowing.controlId]){const range=lane==='kids'?"'Jobs'!F2:F5000":"'SHADOWING AI'!F2:F5000";const rows=google.api('https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/'+encodeURIComponent(range)).values||[];for(const r of rows)if(r[0]){try{const j=JSON.parse(r[0]);counts[j.status]=(counts[j.status]||0)+1;}catch{counts.INVALID=(counts.INVALID||0)+1;}}}
  console.log(JSON.stringify({audit:true,counts,providerGenerateCalls:0}));return;
 }
 let finished=0,requests=0;
 if(lane==='kids'){
  const result=spawnSync(process.execPath,[path.join(root,'grader_runner.mjs'),'--scheduled','--drain','--max-minutes=40','--max-jobs=16','--max-api-calls=16'],{cwd:root,env:process.env,encoding:'utf8',windowsHide:true,timeout:45*60000,maxBuffer:20*1024*1024});
  if(result.status!==0){fs.writeFileSync(path.join(root,'private','run-failure.txt'),result.stdout+'\n'+result.stderr);throw Error('KIDS_RUN_FAILED');}
  const counter=JSON.parse(fs.readFileSync(path.join(root,'private/last-run.json'),'utf8'));finished=counter.finished;requests=counter.paidCalls;
 }else{
  const {runShadowing}=await import('./shadowing-runner.mjs'),{runLanePool}=await import('./lane-pool.mjs');
  const deadline=Date.now()+SERVICE_MS;
  const result=await runLanePool({lane,root,google,config,key,deadline,plan:()=>{google.invalidate();const current=runShadowing({google,config,key,root,deadline,emit:()=>{},planOnly:true,resumeExisting:true,maxJobs:0,maxApiCalls:0});return current.work?.length?current:runShadowing({google,config,key,root,deadline,emit:()=>{},planOnly:true,maxJobs:0,maxApiCalls:0});}});finished=result.finished;requests=result.paidCalls;
 }
 const report={lane,finished,providerGenerateCalls:requests};console.log(JSON.stringify(report));
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`${lane}: ${finished} results returned; ${requests} provider requests.\n`);
}
main().catch(e=>{const code=/^[A-Z][A-Z0-9_]+$/.test(e.message||'')?e.message:'RUN_FAILED';console.error(JSON.stringify({failed:true,code}));process.exitCode=1;});
