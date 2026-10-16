import {createHash} from 'node:crypto';
import {isIeltsClass,ieltsAddressText,IELTS_ADDRESS_VERSION} from './ielts-address-policy.mjs';
import {sourceInMasterScope} from './master-submission-scope.mjs';
export const ADDRESS_REPAIR_JOB='2e978b4c6b0fd681d76eab11ee654445b34673e2f34d9f8f4bec00403ef297da';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function addressedRichCell(before,runs=[]){
 const ordered=[...runs].sort((a,b)=>a.startIndex-b.startIndex);if(!ordered.length||ordered[0].startIndex!==0)ordered.unshift({startIndex:0,format:{}});
 let text='';const changed=[];
 for(let i=0;i<ordered.length;i++){const r=ordered[i],part=ieltsAddressText(before.slice(r.startIndex,ordered[i+1]?.startIndex??before.length));if(part){changed.push({...r,startIndex:text.length});text+=part;}}
 if(text!==ieltsAddressText(before))throw Error('ADDRESS_REPAIR_RUN_BOUNDARY');
 return {text,runs:changed};
}
export function repairManagedIeltsAddress({g,binding,items,save,isLatest,emit=()=>{}}){
 let repaired=0;
 for(const {job,row} of items){
  if(job.id!==ADDRESS_REPAIR_JOB||job.status!=='RETURNED'||!job.rawId||!job.resultHash||!isIeltsClass(job.source?.className)||!sourceInMasterScope(job.source)||!isLatest(job.source))continue;
  const t=job.target;if(!t||binding.classes[job.source.className]!==t.spreadsheetId||!Number.isInteger(t.row)||!Number.isInteger(t.col))continue;
  try{
   const range="'"+String(t.sheetName).replaceAll("'","''")+"'!"+t.address,url='https://sheets.googleapis.com/v4/spreadsheets/'+t.spreadsheetId+'?ranges='+encodeURIComponent(range)+'&includeGridData=true&fields=sheets(properties(sheetId),data(rowData(values(userEnteredValue,textFormatRuns,dataValidation))))';
   const sheet=g.api(url).sheets?.[0],cell=sheet?.data?.[0]?.rowData?.[0]?.values?.[0],before=cell?.userEnteredValue?.stringValue;
   if(sheet?.properties?.sheetId!==t.sheetId||typeof before!=='string'||cell.userEnteredValue.formulaValue||cell.dataValidation)continue;
   const current=hash(before),pending=job.pendingAddressRepair;
   if(pending?.version===IELTS_ADDRESS_VERSION&&current===pending.afterHash){job.resultHash=current;job.addressPolicyRepair={...pending,providerCalls:0};delete job.pendingAddressRepair;save(job,row);repaired++;continue;}
   if(current!==job.resultHash)continue;
   const after=addressedRichCell(before,cell.textFormatRuns);if(after.text===before)continue;
   job.pendingAddressRepair={version:IELTS_ADDRESS_VERSION,beforeHash:current,afterHash:hash(after.text),at:new Date().toISOString(),providerCalls:0};save(job,row);
   g.api('https://sheets.googleapis.com/v4/spreadsheets/'+t.spreadsheetId+':batchUpdate','POST',{requests:[{updateCells:{range:{sheetId:t.sheetId,startRowIndex:t.row-1,endRowIndex:t.row,startColumnIndex:t.col-1,endColumnIndex:t.col},rows:[{values:[{userEnteredValue:{stringValue:after.text},textFormatRuns:after.runs}]}],fields:'userEnteredValue,textFormatRuns'}}]});
   job.resultHash=job.pendingAddressRepair.afterHash;job.addressPolicyRepair={...job.pendingAddressRepair};delete job.pendingAddressRepair;save(job,row);g.books.get(t.spreadsheetId)?.invalidateSheet(t.sheetName);repaired++;
  }catch(e){emit({event:'IELTS_ADDRESS_REPAIR_DEFERRED',id:job.id,error:e.message,providerCalls:0});}
 }
 return {repaired,providerCalls:0};
}
