// Old prompts deliberately returned section scores of zero for local calculation.
// Recover only that documented representation, never replace a genuine provider score.
export function legacyPlaceholderScore(grade){
 if(grade?.assessable!==true||!grade.scoreLedger||grade.scoreLedger.complete!==true||grade.sections?.length!==3||!grade.sections.every(s=>Number(s.score)===0))return null;
 if(['overallPercent','percent','band','rubricBand'].some(k=>grade[k]!==undefined&&grade[k]!==null&&String(grade[k]).trim()!==''))return null;
 const details={};
 for(const name of ['units','prosody','fluency']){
  const b=grade.scoreLedger[name],total=b?.targets?.length;if(!total)return null;
  if(typeof b.outcomes==='string'&&b.outcomes.length){details[name]={correct:[...b.outcomes].filter(v=>v==='C').length,total};continue;}
  if(!Array.isArray(b.errors)||!Array.isArray(b.unclearIndexes))return null;
  const excluded=[...b.unclearIndexes,...b.errors.map(e=>e.unitIndex)];
  if(excluded.some(i=>!Number.isInteger(i)||i<0||i>=total))return null;
  details[name]={correct:total-new Set(excluded).size,total};
 }
 return {percent:Math.round(50*details.units.correct/details.units.total+25*details.prosody.correct/details.prosody.total+25*details.fluency.correct/details.fluency.total),basis:'saved_complete_legacy_ledger_50_25_25',details};
}
export function restoreLegacyPlaceholder(grade){const score=legacyPlaceholderScore(grade);if(score){grade.scoreCalculation=score;grade.scoreQuality={status:'teacher-direct-score',basis:score.basis};}return grade;}
export function replaceLegacyZeroLine(before,score){
 const changes=[];const match=/Chất lượng: đạt(?: khoảng)?\s+0(?:[.,]0+)?%\.?/.exec(before);if(!match)return null;
 changes.push({start:match.index,end:match.index+match[0].length,text:'Chất lượng: đạt '+score.percent+'%.'});
 const warning=/^⚠️ Cần theo dõi\r?\n/m.exec(before);if(score.percent>=75&&warning)changes.push({start:warning.index,end:warning.index+warning[0].length,text:''});
 let after=before;for(const e of [...changes].sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.text+after.slice(e.end);
 return {after,mapIndex(index){let delta=0;for(const e of changes.sort((a,b)=>a.start-b.start)){if(index<e.start)break;if(index<e.end)return e.start+delta;delta+=e.text.length-(e.end-e.start);}return index+delta;}};
}
