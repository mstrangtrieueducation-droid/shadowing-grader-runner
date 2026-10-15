import assert from 'node:assert/strict';
import {billingRecoveryChildren,billingChildId,BILLING_REJECTED_IDS} from './shadow-billing-recovery.mjs';
import {assertShadowSingleCall} from './shadowing-single-call.mjs';
import {automaticEligible} from './automatic-authorization.mjs';
const id=BILLING_REJECTED_IDS[0],parent={id,source:{signature:id,time:'2026-10-01T12:00:00+07:00',className:'FIGHTER 5',name:'Student',code:'Shadow-L1-001',link:'https://drive.google.com/file/d/example/view'},route:{kind:'shadowing',code:'Shadow-L1-001'},status:'FAILED_NO_RESULT_SINGLE_CALL_LOCKED',error:'SHADOW_GEMINI_HTTP_402',providerFailure:{http:402,message:'Your prepayment credits are depleted.'},generateRequests:1,singleCallPermanentlyConsumed:true};
const options={isLatest:()=>true,emptyTarget:()=>true,now:'2026-10-15T11:00:00Z'},before=JSON.stringify(parent);
const [child]=billingRecoveryChildren([parent],options);
assert.equal(child.id,billingChildId(id));assert.equal(JSON.stringify(parent),before);
assert.doesNotThrow(()=>assertShadowSingleCall(child));assert.equal(automaticEligible(child,[parent,child]),true);
assert.throws(()=>assertShadowSingleCall(parent),/ONE_CALL/);
assert.equal(billingRecoveryChildren([parent,child],options).length,0);
child.generateRequests=1;child.providerFailure={http:402};child.status='FAILED_NO_RESULT_SINGLE_CALL_LOCKED';
assert.equal(billingRecoveryChildren([parent,child],options).length,0);
for(const change of [{rawId:'raw'}, {gradeId:'grade'}, {usage:{}}, {apiUsage:{}}, {failedAttempts:[{rawId:'saved'}]}, {previousGradingAttempts:[{usage:{tokens:1}}]}, {failedAttempts:[{generateRequests:1}]}, {generateRequests:2}, {providerFailure:{http:503,message:'overload'}}, {status:'RETURNED'}, {presentationResubmissionRequired:{}}, {id:'other'}, {source:{...parent.source,time:'2026-08-31T12:00:00+07:00'}}]){
 const p={...structuredClone(parent),...change};
 assert.equal(billingRecoveryChildren([p],options).length,0,JSON.stringify(change));
}
assert.equal(billingRecoveryChildren([parent],{...options,isLatest:()=>false}).length,0);
assert.equal(billingRecoveryChildren([parent],{...options,emptyTarget:()=>false}).length,0);
assert.equal(billingRecoveryChildren([parent],{...options,emptyTarget:()=>{throw Error('DESTINATION_AMBIGUOUS');}}).length,0);
assert.equal(billingRecoveryChildren([parent,{id:'archive',source:parent.source,rawId:'old'}],options).length,0);
console.log(JSON.stringify({test:'billing-recovery',passed:true,providerCalls:0,parentImmutable:true,oneChildOnly:true}));
