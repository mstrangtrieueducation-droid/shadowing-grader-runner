import {createHash} from 'node:crypto';
import {sourceInMasterScope} from './master-submission-scope.mjs';

// The teacher confirmed the top-up on 15 October and asked about these held
// submissions. This is a bounded recovery of explicit provider rejections;
// it does not relax the ordinary single-call guard or reset original jobs.
export const BILLING_RECOVERY='teacher-confirmed-topup-20261015';
export const BILLING_REJECTED_IDS=Object.freeze([
 '4bb2a1130ca93b1b2e5f912b177be0675e9658417b9da725eb60d2a62a42daf1',
 '70649b8ab050f59c7ef59d5cecfe31f9c06145c8b33b444077c8004d366ef664',
 '6affa5055945cc0cd90624422c6526c09b11912bdb512f2d836d155d4834062f',
 '474be482eb35ef731c3b4087555b77da8f33862f154398ea9900198d2c03c947',
 '2d22a0307431f779c62b2a68c6d3f251644af0471c864272ba51e396e0afdbdb',
 '966ec3ba60d9c1fb411d14edc28e1aca4a035aa40d768f84a1f0f8eb69eb51b2',
 'fe7551e74879837cf67a989465e9f24153601b47ad583148581c4bbefb596fb3',
 '86a1e6553212da9bcfa236500da23e57728a91673eb207374ab3c992d541263b'
]);
const hasResult=(x,seen=new Set())=>{
 if(!x||typeof x!=='object'||seen.has(x))return false;seen.add(x);
 if(['rawId','gradeId','usage','apiUsage','verificationRawId','verificationUsage','resultHash','autoNotice'].some(k=>!!x[k]))return true;
 return Object.values(x).some(v=>v&&typeof v==='object'&&hasResult(v,seen));
};
const priorAttempt=x=>x&&typeof x==='object'&&(hasResult(x)||['calls','generateRequests','physicalGenerateRequests','approvedGenerateRequests','oldRequests','previousRequests'].some(k=>Number(x[k])>0)||Object.values(x).some(v=>v&&typeof v==='object'&&priorAttempt(v)));
export const billingChildId=id=>createHash('sha256').update(BILLING_RECOVERY+'|'+id).digest('hex');
export function billingRecoveryChildren(jobs,{isLatest,emptyTarget,now=new Date().toISOString()}){
 const created=[];
 for(const parent of jobs){
  if(!BILLING_REJECTED_IDS.includes(parent.id)||parent.source?.signature!==parent.id||!sourceInMasterScope(parent.source)||parent.presentationResubmissionRequired||parent.technicalInputFailure)continue;
  if(!['FAILED_NO_RESULT_SINGLE_CALL_LOCKED','NEEDS_REVIEW'].includes(parent.status)||parent.error!=='SHADOW_GEMINI_HTTP_402'||parent.providerFailure?.http!==402||!String(parent.providerFailure.message).includes('prepayment credits are depleted')||Number(parent.generateRequests)!==1||hasResult(parent))continue;
  if(['failedAttempts','previousGradingAttempts','teacherApprovedHistory','recoveryHistory','generationAttempt'].some(k=>priorAttempt(parent[k])))continue;
  const id=billingChildId(parent.id);
  if(jobs.some(j=>j.id===id||j.billingRejectionRecovery?.parentId===parent.id))continue;
  if(jobs.some(j=>j.source?.signature===parent.source.signature&&j!==parent&&hasResult(j)))continue;
  if(!isLatest(parent.source))continue;
  try{if(!emptyTarget(parent.source))continue;}catch{continue;}
  created.push({id,source:structuredClone(parent.source),route:structuredClone(parent.route||{kind:'shadowing',code:parent.source.code}),status:'READY',error:'',nextAt:0,billingRejectionRecovery:{authorization:BILLING_RECOVERY,parentId:parent.id,providerHttp:402,createdAt:now}});
 }
 return created;
}
