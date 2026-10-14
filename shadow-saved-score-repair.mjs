import {createHash} from 'node:crypto';
import {sourceInMasterScope} from './master-submission-scope.mjs';
import {targetLocation} from './shadowing-policies.mjs';
import {postprocessShadow} from './shadowing-postprocess.mjs';
import {acceptShadowScore} from './shadow-score-passthrough.mjs';
import {stateStore} from './runner-state.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),q=s=>"'"+s.replaceAll("'","''")+"'";
export function repairSavedShadowScores(g,config,ids){
 const binding=config.shadowing,lease=stateStore(g,binding.controlId,'ShadowingState'),out=[],changes=new Map();lease.acquire(Date.now()+10*60000);
 try{
  const control=g.book(binding.controlId),table=control.getSheetByName('SHADOWING AI'),rows=table.getRange(2,6,table.getLastRow()-1,1).getValues(),jobs=rows.flatMap((r,i)=>{try{const j=JSON.parse(r[0]);return ids.includes(j.id)?[{j,row:i+2}]:[];}catch{return [];}});
  if(jobs.length!==ids.length)throw Error('REPAIR_TARGETS_MISSING');
  const artifacts=control.getSheetByName('RunnerArtifacts'),index=artifacts.getRange(2,1,artifacts.getLastRow()-1,2).getValues();
  const classIds=[...new Set(jobs.map(({j})=>binding.classes[j.source.className]))];
  for(const id of classIds){const book=g.book(id),sheet=book.getSheetByName('THEO DÕI TOÀN DIỆN');g.preloadSource(id,sheet.meta.properties.gridProperties.columnCount,[sheet.getName()]);}
  for(const {j,row}of jobs){
   if(!sourceInMasterScope(j.source)||!j.rawId)throw Error('REPAIR_SCOPE_OR_RAW_INVALID');
   const parts=index.flatMap((r,i)=>r[0]===j.rawId?[{row:i+2,part:Number(r[1])}]:[]).sort((a,b)=>a.part-b.part);if(!parts.length)throw Error('REPAIR_RAW_MISSING');
   const values=g.api('https://sheets.googleapis.com/v4/spreadsheets/'+binding.controlId+'/values:batchGet?'+parts.map(p=>'ranges='+encodeURIComponent(q('RunnerArtifacts')+'!C'+p.row)).join('&')).valueRanges;
   const raw=JSON.parse(values.map(v=>v.values?.[0]?.[0]||'').join('')),grade=acceptShadowScore(postprocessShadow(raw,{blockScores:false}),{legacyLedger:!!raw._shadowRequestLedger}),score=grade.scoreCalculation;
   if(!score)throw Error('REPAIR_SOURCE_CONTAINS_NO_SCORE');
   const id=binding.classes[j.source.className],book=g.book(id),sheet=book.getSheetByName('THEO DÕI TOÀN DIỆN'),display=sheet.getDataRange().getDisplayValues(),loc=targetLocation(display,sheet.meta.merges,j.source.className.startsWith('IELTS')?5:Math.max(3,sheet.meta.properties.gridProperties.frozenRowCount||3),j.source),cell=sheet.getRange(loc.row,loc.col),before=cell.getDisplayValue();
   if(/Chất lượng:[^\n]*\d+(?:[.,]\d+)?\s*%/.test(before)){out.push({id:j.id,alreadyScored:true});continue;}
   if(hash(before)!==j.resultHash||!before.includes('— NHẬN XÉT GV —')||/CẦN NỘP LẠI/.test(before))throw Error('REPAIR_TARGET_CHANGED');
   const marker='— NHẬN XÉT GV —\n',at=before.indexOf(marker)+marker.length,line='Chất lượng: đạt '+score.percent+'%.\n'+(score.percent<75?'⚠️ Cần theo dõi\n':''),after=before.slice(0,at)+line+before.slice(at);
   const native=book.cache.get(sheet.getName()+'|master')?.cells?.[loc.row-1]?.values?.[loc.col-1]||{},oldRuns=native.textFormatRuns||[],runs=oldRuns.map(r=>({...r,startIndex:r.startIndex>=at?r.startIndex+line.length:r.startIndex}));
   const requests=changes.get(id)||[];requests.push({updateCells:{range:{sheetId:sheet.getSheetId(),startRowIndex:loc.row-1,endRowIndex:loc.row,startColumnIndex:loc.col-1,endColumnIndex:loc.col},rows:[{values:[{userEnteredValue:{stringValue:after},textFormatRuns:runs,userEnteredFormat:{horizontalAlignment:'LEFT',verticalAlignment:'TOP'}}]}],fields:'userEnteredValue,textFormatRuns,userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment'}});changes.set(id,requests);
   j.resultHash=hash(after);j.status='RETURNED';j.error='';j.scorePassThrough={at:new Date().toISOString(),percent:score.percent,basis:score.basis,details:score.details,providerGenerateCalls:0,previousHash:hash(before),authorization:'TEACHER_REMOVE_INTERNAL_SCORE_BLOCK_20261014'};
   out.push({id:j.id,student:j.source.name,className:j.source.className,code:j.source.code,percent:score.percent,spreadsheetId:id,sheetId:sheet.getSheetId(),row:loc.row,col:loc.col,resultHash:j.resultHash,source:score.basis,providerGenerateCalls:0});
  }
  for(const [id,requests]of changes)g.api('https://sheets.googleapis.com/v4/spreadsheets/'+id+':batchUpdate','POST',{requests});
  const data=jobs.filter(({j})=>out.some(x=>x.id===j.id&&!x.alreadyScored)).map(({j,row})=>({range:q('SHADOWING AI')+'!E'+row+':I'+row,values:[[j.status,JSON.stringify(j),j.error,j.target?.address||'',new Date().toISOString()]]}));
  if(data.length)g.api('https://sheets.googleapis.com/v4/spreadsheets/'+binding.controlId+'/values:batchUpdate','POST',{valueInputOption:'RAW',data});
  console.log(JSON.stringify({event:'SAVED_SCORE_REPAIR_COMPLETE',updated:out.filter(x=>!x.alreadyScored).length,providerGenerateCalls:0}));return out;
 }finally{lease.release();}
}
