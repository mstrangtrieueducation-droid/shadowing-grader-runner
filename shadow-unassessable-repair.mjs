import {stateStore} from './runner-state.mjs';import {hash} from './shadowing-policies.mjs';import {postprocessShadow} from './shadowing-postprocess.mjs';
export const UNASSESSABLE_NOTICE='Chưa đánh giá được từ bản nộp này. Em kiểm tra đúng bài và gửi lại bản thu có giọng đọc rõ của mình để cô nhận xét nhé.';
export function unassessableNotice(grade){const corrections=[...new Set((grade.sections||[]).map(s=>s.correction?.trim()).filter(Boolean))];return UNASSESSABLE_NOTICE+(corrections.length?'\n'+corrections.join('\n'):'');}
const q=s=>"'"+s.replaceAll("'","''")+"'";
export function repairUnassessableShadow(g,config,ids){
 if(!ids?.length)return {updated:0,providerGenerateCalls:0};
 const binding=config.shadowing,lease=stateStore(g,binding.controlId,'ShadowingState');lease.acquire(Date.now()+10*60000);let updated=0;
 try{
  const b=g.book(binding.controlId),s=b.getSheetByName('SHADOWING AI'),rows=s.getRange(2,6,s.getLastRow()-1,1).getValues(),jobs=rows.flatMap((r,i)=>{try{const j=JSON.parse(r[0]);return ids.includes(j.id)&&j.status==='RETURNED'&&j.rawId?[{j,row:i+2}]:[];}catch{return[];}});
  if(!jobs.length)return {updated,providerGenerateCalls:0};
  const artifacts=b.getSheetByName('RunnerArtifacts'),index=artifacts.getRange(2,1,artifacts.getLastRow()-1,2).getValues();
  for(const {j,row}of jobs){
   const parts=index.flatMap((r,i)=>r[0]===j.rawId?[{row:i+2,part:+r[1]}]:[]).sort((a,b)=>a.part-b.part);if(!parts.length)continue;
   const values=g.api('https://sheets.googleapis.com/v4/spreadsheets/'+binding.controlId+'/values:batchGet?'+parts.map(p=>'ranges='+encodeURIComponent(q('RunnerArtifacts')+'!C'+p.row)).join('&')).valueRanges;
   const raw=JSON.parse(values.map(r=>r.values?.[0]?.[0]||'').join('')),grade=postprocessShadow(raw,{blockScores:false});if(grade.assessable!==false)continue;
   const t=j.target,book=g.book(t.spreadsheetId),sheet=book.getSheetByName(t.sheetName);if(!sheet||sheet.getSheetId()!==t.sheetId)continue;
   const range=q(t.sheetName)+'!'+t.address,url='https://sheets.googleapis.com/v4/spreadsheets/'+t.spreadsheetId+'?ranges='+encodeURIComponent(range)+'&includeGridData=true&fields=sheets(data(rowData(values(userEnteredValue,textFormatRuns,dataValidation))))';
   const cell=g.api(url).sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0],before=cell?.userEnteredValue?.stringValue||'';
   if(cell?.userEnteredValue?.formulaValue||cell?.dataValidation||hash(before)!==j.resultHash)continue;
   const match=/Chất lượng:[^\n]*\b0(?:[.,]0+)?\s*%[^\n]*/.exec(before);if(!match)continue;
   const after=before.slice(0,match.index)+'Chất lượng: chưa đánh giá được.\n'+UNASSESSABLE_NOTICE+before.slice(match.index+match[0].length),delta=after.length-before.length;
   const runs=(cell.textFormatRuns||[]).map(r=>({...r,startIndex:r.startIndex>match.index?r.startIndex+delta:r.startIndex}));
   g.api('https://sheets.googleapis.com/v4/spreadsheets/'+t.spreadsheetId+':batchUpdate','POST',{requests:[{updateCells:{range:{sheetId:t.sheetId,startRowIndex:t.row-1,endRowIndex:t.row,startColumnIndex:t.col-1,endColumnIndex:t.col},rows:[{values:[{userEnteredValue:{stringValue:after},textFormatRuns:runs}]}],fields:'userEnteredValue,textFormatRuns'}}]});
   const check=g.api(url).sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0]?.userEnteredValue?.stringValue;if(check!==after)throw Error('UNASSESSABLE_WRITE_VERIFY_FAILED');
   j.status='COMPLETED_UNASSESSABLE';j.resultHash=hash(after);j.autoNotice=after;j.error='';j.manualReviewRequired=false;j.unassessableCorrection={at:new Date().toISOString(),reason:grade.reason,providerGenerateCalls:0};
   s.getRange(row,5,1,5).setValues([[j.status,JSON.stringify(j),'',t.address,new Date().toISOString()]]);updated++;
  }
  return {updated,providerGenerateCalls:0};
 }finally{lease.release();}
}
