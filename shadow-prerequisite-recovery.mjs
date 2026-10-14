import {targetLocation,norm} from './shadowing-policies.mjs';
export const PREREQUISITE_RECOVERY='teacher-shadow-prerequisites-20261014';
export function hasShadowCall(job){
 const spent=x=>!!(x?.rawId||x?.gradeId||x?.usage||x?.apiUsage||x?.verificationUsage||x?.masterGenerationReserved||x?.runnerGenerationStarted||x?.generationReservation||x?.singleCallPermanentlyConsumed||Number(x?.generateRequests||0)>0||Number(x?.approvedGenerateRequests||0)>0||Number(x?.calls||0)>0||x?.providerFailure?.http);
 return spent(job)||spent(job.generationAttempt)||['failedAttempts','recoveryHistory','teacherApprovedHistory','previousGradingAttempts'].some(k=>job[k]?.some(x=>spent(x)||Number(x.oldRequests||x.previousRequests||0)>0||spent(x.previousAttempt)));
}
const cleanName=x=>String(x||'').split(/\r?\n/).filter(s=>!/^\s*new\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/i.test(s)).join(' ').trim();
function headers(rows,merges,count){const heads=rows.slice(0,count).map(r=>r.slice());for(const m of merges||[])if(m.startRowIndex<count){const value=rows[m.startRowIndex]?.[m.startColumnIndex]||'';for(let r=m.startRowIndex;r<Math.min(count,m.endRowIndex);r++)for(let c=m.startColumnIndex;c<m.endColumnIndex;c++)(heads[r]||=[])[c]=value;}return heads;}
export function resolveShadowTarget(rows,merges,headerRows,source){
 const normalized=rows.map((r,i)=>i<headerRows?r:r.map((v,c)=>c===1?cleanName(v):v));
 const matches=normalized.slice(headerRows).flatMap((r,i)=>[r[1],r[2]].some(v=>v&&norm(v)===norm(source.name))?[i+headerRows+1]:[]);
 if(matches.length!==1)throw Error(matches.length?'STUDENT_AMBIGUOUS':'STUDENT_NOT_FOUND');
 // The existing resolver still checks full lesson and level. Aliases only
 // identify a unique row; they never change the source signature or identity.
 normalized[matches[0]-1]=normalized[matches[0]-1].slice();normalized[matches[0]-1][1]=source.name;
 try{return targetLocation(normalized,merges,headerRows,source);}catch(e){if(e.message!=='DESTINATION_AMBIGUOUS')throw e;}
 const heads=headers(normalized,merges,headerRows),width=Math.max(...heads.map(r=>r.length));
 const meta=[];for(let c=3;c<width;c++){
  const h=heads.map(r=>r[c]||'').join('\n');if(!/SHADOW/i.test(h))continue;
  const code=h.match(/SHADOW\s*-\s*L([12])\s*-\s*(\d+)/i),level=h.match(/LEVEL\s*0*([12])\b/i),number=h.match(/BÀI\s*0*(\d+)\b/i),date=h.match(/H(?:Ạ|A)N[^\d]*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if(!(code||level&&number)||!date)continue;
  meta.push({col:c+1,level:Number(code?.[1]||level[1]),number:Number(code?.[2]||number[1]),date:Date.UTC(+date[3],+date[2]-1,+date[1])});
 }
 const [,level,number]=/^Shadow-L([12])-(\d+)$/.exec(source.code),candidates=meta.filter(m=>m.level===+level&&m.number===+number),day=86400000;
 const groups=new Map();for(const m of meta.filter(m=>m.level===+level&&m.number!==+number)){const group=groups.get(m.number)||[];group.push(m);groups.set(m.number,group);}
 const anchors=[...groups.values()].filter(v=>v.length===1).map(v=>v[0]);
 // Two independent nearby lessons must agree on a weekly sequence. No
 // arbitrary leftmost/rightmost or nearest-submission-date choice is allowed.
 const predicted=anchors.filter(a=>Math.abs(a.number-Number(number))<=3).map(a=>a.date+(Number(number)-a.number)*7*day);
 if(predicted.length<2||new Set(predicted).size!==1)throw Error('DESTINATION_AMBIGUOUS');
 const selected=candidates.filter(m=>m.date===predicted[0]);if(selected.length!==1)throw Error('DESTINATION_AMBIGUOUS');
 return {row:matches[0],col:selected[0].col,verifiedWeeklySequence:true};
}
export function applyReferenceOverrides(bank,overrides={}){
 const result={...bank};for(const [code,o]of Object.entries(overrides)){
  const old=bank[code];if(!old||old.videoId!==o.videoId||o.code!==code||!o.transcript?.trim()||!/^https:\/\/downloads\.bbc\.co\.uk\/learningenglish\/.*\.pdf$/.test(o.sourceUrl||''))throw Error('SHADOW_REFERENCE_OVERRIDE_INVALID');
  if(old.transcript?.trim())continue;result[code]={...old,transcript:o.transcript,transcriptRecovery:{sourceUrl:o.sourceUrl,sourceSha256:o.sourceSha256,version:PREREQUISITE_RECOVERY}};
 }return result;
}
export function recoverUncalledPrerequisite(job,references,resolve){
 if(job.status!=='NEEDS_REVIEW'||hasShadowCall(job))return false;
 if(!['BAREM_LOCAL_TRANSCRIPT_MISSING','SHADOW_FIXED_LEDGER_SOURCE_MISSING','STUDENT_NOT_FOUND','STUDENT_AMBIGUOUS','DESTINATION_AMBIGUOUS','DESTINATION_COLUMN_NOT_FOUND','SHADOW_CANONICAL_AUDIO_SOURCE_MISSING','AUDIO_EXTRACTION_FAILED','SHADOW_CANONICAL_AUDIO_TOO_LARGE'].includes(job.error))return false;
 if(!references[job.source.code]?.transcript?.trim())return false;
 const target=resolve(job.source);job.recoveryHistory=(job.recoveryHistory||[]).concat([{at:new Date().toISOString(),reason:PREREQUISITE_RECOVERY,previousError:job.error,newCalls:0}]);
 job.status='READY';job.error='';job.nextAt=0;job.prerequisiteRecoveryVersion=PREREQUISITE_RECOVERY;job.manualReviewRequired=false;return target;
}
