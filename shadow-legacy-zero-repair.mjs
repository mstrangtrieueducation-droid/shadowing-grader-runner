import {createHash} from 'node:crypto';
import {sourceInMasterScope} from './master-submission-scope.mjs';
import {targetLocation} from './shadowing-policies.mjs';
import {postprocessShadow} from './shadowing-postprocess.mjs';
import {legacyPlaceholderScore,replaceLegacyZeroLine} from './shadow-legacy-placeholder.mjs';
import {stateStore} from './runner-state.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),q=s=>"'"+s.replaceAll("'","''")+"'";
export function repairLegacyShadowZeros(g,config){
 const binding=config.shadowing,lease=stateStore(g,binding.controlId,'ShadowingState');lease.acquire(Date.now()+8*60000);
 try{
  const book=g.book(binding.controlId),table=book.getSheetByName('SHADOWING AI');if(!table||table.getLastRow()<2)return [];
  const jobs=table.getRange(2,6,table.getLastRow()-1,1).getValues().flatMap(([v],i)=>{try{const j=JSON.parse(v);return j.status==='RETURNED'&&j.rawId&&j.resultHash&&!j.legacyZeroRepair&&sourceInMasterScope(j.source)?[{j,row:i+2}]:[];}catch{return [];}}),candidates=[];
  for(const {j,row}of jobs){try{const id=binding.classes[j.source.className],b=g.book(id),s=b.getSheetByName('THEO DÕI TOÀN DIỆN');if(!b.cache.has(s.getName()+'|master'))g.preloadSource(id,s.meta.properties.gridProperties.columnCount,[s.getName()]);const rows=s.getDataRange().getDisplayValues(),loc=targetLocation(rows,s.meta.merges,j.source.className.startsWith('IELTS')?5:Math.max(3,s.meta.properties.gridProperties.frozenRowCount||3),j.source),before=rows[loc.row-1]?.[loc.col-1]||'';if(hash(before)===j.resultHash&&/Chất lượng: đạt(?: khoảng)?\s+0(?:[.,]0+)?%/.test(before)&&!before.includes('CẦN NỘP LẠI'))candidates.push({j,row,id,s,loc,before});}catch(e){console.log(JSON.stringify({event:'LEGACY_ZERO_TARGET_DEFERRED',id:j.id,error:String(e.message||'UNKNOWN')}));}}
  if(!candidates.length)return [];
  const artifacts=book.getSheetByName('RunnerArtifacts'),index=artifacts.getRange(2,1,artifacts.getLastRow()-1,2).getValues(),raws=new Map(),writes=new Map(),updates=[],out=[];
  for(const x of candidates){const {j,row,id,s,loc,before}=x;try{let raw=raws.get(j.rawId);if(!raw){const parts=index.flatMap((r,i)=>r[0]===j.rawId?[{row:i+2,part:Number(r[1])}]:[]).sort((a,b)=>a.part-b.part);if(!parts.length)throw Error('RAW_NOT_FOUND');const values=g.api('https://sheets.googleapis.com/v4/spreadsheets/'+binding.controlId+'/values:batchGet?'+parts.map(p=>'ranges='+encodeURIComponent(q('RunnerArtifacts')+'!C'+p.row)).join('&')).valueRanges;raw=JSON.parse(values.map(v=>v.values?.[0]?.[0]||'').join(''));raws.set(j.rawId,raw);}
   const grade=postprocessShadow(raw,{blockScores:false}),score=legacyPlaceholderScore(grade);if(!score||score.percent===0){console.log(JSON.stringify({event:'LEGACY_ZERO_SOURCE_UNRESOLVED',id:j.id,providerCalls:0}));continue;}
   const changed=replaceLegacyZeroLine(before,score);if(!changed)continue;const native=g.book(id).cache.get(s.getName()+'|master')?.cells?.[loc.row-1]?.values?.[loc.col-1]||{};
   if(s.getRange(loc.row,loc.col).getFormula()||s.getRange(loc.row,loc.col).getDataValidation())continue;
   const runs=(native.textFormatRuns||[]).map(r=>({...r,startIndex:changed.mapIndex(r.startIndex)})).filter((r,i,a)=>i===a.length-1||r.startIndex!==a[i+1].startIndex),requests=writes.get(id)||[];
   requests.push({updateCells:{range:{sheetId:s.getSheetId(),startRowIndex:loc.row-1,endRowIndex:loc.row,startColumnIndex:loc.col-1,endColumnIndex:loc.col},rows:[{values:[{userEnteredValue:{stringValue:changed.after},textFormatRuns:runs,userEnteredFormat:{horizontalAlignment:'LEFT',verticalAlignment:'TOP'}}]}],fields:'userEnteredValue,textFormatRuns,userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment'}});writes.set(id,requests);
   j.legacyZeroRepair={at:new Date().toISOString(),previousHash:j.resultHash,percent:score.percent,basis:score.basis,details:score.details,providerCalls:0};j.resultHash=hash(changed.after);updates.push({id,row,j});out.push({id:j.id,student:j.source.name,className:j.source.className,code:j.source.code,percent:score.percent});
  }catch(e){console.log(JSON.stringify({event:'LEGACY_ZERO_REPAIR_DEFERRED',id:j.id,error:String(e.message||'UNKNOWN'),providerCalls:0}));}}
  for(const [id,requests]of writes){try{g.api('https://sheets.googleapis.com/v4/spreadsheets/'+id+':batchUpdate','POST',{requests});const data=updates.filter(x=>x.id===id).map(({row,j})=>({range:q('SHADOWING AI')+'!F'+row,values:[[JSON.stringify(j)]]}));if(data.length)g.api('https://sheets.googleapis.com/v4/spreadsheets/'+binding.controlId+'/values:batchUpdate','POST',{valueInputOption:'RAW',data});}catch(e){console.log(JSON.stringify({event:'LEGACY_ZERO_BATCH_DEFERRED',spreadsheetId:id,error:String(e.message||'UNKNOWN'),providerCalls:0}));}}
  console.log(JSON.stringify({event:'LEGACY_ZERO_REPAIR_FINISHED',results:out,providerCalls:0}));return out;
 }finally{lease.release();}
}
