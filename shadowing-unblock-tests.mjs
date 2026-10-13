import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createReferenceSelector,NETWORK_TIMEOUT_MS,referenceInstructions} from './shadowing-reference-policy.mjs';
import {RECOVERY_AUTHORIZATION,resetAuthorizedCache} from './shadowing-cache-policy.mjs';
import {MAX_RETRIES,assertShadowSingleCall} from './shadowing-single-call.mjs';
import {postprocessShadow} from './shadowing-postprocess.mjs';
import {spokenShadowTranscript,targetWords} from './quant-score.mjs';
test('Windows Python preserves Unicode and expands only correct joined words',()=>{
 const grade={scoreLedger:{units:{targets:['Let’s','ha,ha','wrong words','cat'],unclearIndexes:[],errors:[{unitIndex:2,evidenceIndexes:[0]},{unitIndex:3,evidenceIndexes:[1]}]}},evidence:[{type:'content',word:'wrong words'},{type:'pronunciation',word:'cat',ipa:'/kæt/',observed:'thiếu âm',time:'1:9'}]};
 const g=postprocessShadow({candidates:[{content:{parts:[{text:JSON.stringify(grade)}]}}]});
 assert.deepEqual(g.scoreLedger.units.targets,['let’s','ha','ha','wrong words','cat']);
 assert.deepEqual(g.scoreLedger.units.errors.map(e=>e.unitIndex),[3,4]);
 assert.equal(g.evidence[1].ipa,'/kæt/');assert.equal(g.evidence[1].observed,'thiếu âm');
 assert.deepEqual(targetWords(spokenShadowTranscript('A: A marathon.\nJ: Let’s run.\nIt means: a race.')),['a','marathon',"let's",'run','it','means','a','race']);
 assert.deepEqual(targetWords(spokenShadowTranscript('[Sneeze] 50, 100 views.')),['50','100','views']);
});
test('out-of-range repeated word requires one occurrence between timestamped anchors',()=>{
 const normalize=targets=>postprocessShadow({candidates:[{content:{parts:[{text:JSON.stringify({scoreLedger:{units:{targets,unclearIndexes:[],errors:[{unitIndex:1,evidenceIndexes:[0]},{unitIndex:9,evidenceIndexes:[1]}]}},evidence:[{type:'pronunciation',word:'jobs',time:'00:38'},{type:'pronunciation',word:'minute',time:'00:53'}]})}]}}]});
 assert.equal(normalize(['minute','jobs','minute']).scoreLedger.units.errors[1].unitIndex,2);
 assert.equal(normalize(['minute','jobs','minute','minute']).scoreLedger.units.errors[1].unitIndex,9);
});
test('BBC download failure uses verified transcript and memoizes fallback',()=>{
 const select=createReferenceSelector(),doc={videoId:'bbc_video_1',publisherMediaUrl:'https://downloads.bbc.co.uk/test.mp3',transcript:'Hello world.'};let downloads=0;
 const fail=()=>{downloads++;throw Error('TIMEOUT');};
 const a=select(doc,{id:'Shadow-L2-001',videoId:doc.videoId},fail);
 assert.equal(NETWORK_TIMEOUT_MS,5000);assert.equal(a.part,null);assert.equal(a.meta.mode,'transcript');
 assert.equal(select(doc,{id:'Shadow-L2-001',videoId:doc.videoId},fail),a);assert.equal(downloads,1);
 assert.match(referenceInstructions(a.meta.mode),/Không có audio mẫu/);
 assert.throws(()=>select({...doc,transcript:''},{id:'other',videoId:doc.videoId},fail),/TIMEOUT/);
 assert.throws(()=>select(doc,{id:'other',videoId:'wrong'},fail),/REFERENCE_CHANGED/);
});
test('explicit cache recovery archives old usage and allows exactly one fresh call',()=>{
 const j={rawId:'old',usage:{totalTokenCount:100},generateRequests:1,cacheResetAuthorized:RECOVERY_AUTHORIZATION};
 assert.equal(MAX_RETRIES,0);assert.throws(()=>assertShadowSingleCall(j),/ONE_CALL_LIMIT/);
 assert.equal(resetAuthorizedCache(j,Error('SHADOW_GRADE_INVALID')),true);
 assert.equal(j.failedAttempts[0].rawId,'old');assert.equal(j.failedAttempts[0].usage.totalTokenCount,100);
 assertShadowSingleCall(j);j.generationAttempt.calls++;
 assert.throws(()=>assertShadowSingleCall(j),/ONE_CALL_LIMIT/);
 j.rawId='new';assert.equal(resetAuthorizedCache(j,Error('SHADOW_GRADE_INVALID')),false);
});
