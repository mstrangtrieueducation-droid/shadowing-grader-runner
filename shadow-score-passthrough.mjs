// Teacher instruction 2026-10-14: evidence metadata must never suppress a score.
export const DIRECT_SCORE_POLICY='teacher-direct-score-no-evidence-block-v1';
const number=v=>{if(typeof v==='number'&&Number.isFinite(v))return v;const m=String(v??'').trim().match(/^(\d+(?:[.,]\d+)?)\s*%?$/);return m?Number(m[1].replace(',','.')):null;};
export function savedShadowPercent(grade,{legacyLedger=false}={}){
 for(const key of ['overallPercent','percent','band','rubricBand']){const n=number(grade[key]);if(n!==null)return {percent:n,basis:'provider_'+key};}
 if(legacyLedger&&grade.scoreLedger){
  const details={};
  for(const name of ['units','prosody','fluency']){const b=grade.scoreLedger[name];if(typeof b?.outcomes==='string'&&b.outcomes.length){details[name]={correct:[...b.outcomes].filter(x=>x==='C').length,total:b.targets?.length||b.outcomes.length};}else if(Array.isArray(b)&&b.length){details[name]={correct:b.filter(x=>x.status==='correct').length,total:b.length};}else return null;}
  const percent=Math.round(50*details.units.correct/details.units.total+25*details.prosody.correct/details.prosody.total+25*details.fluency.correct/details.fluency.total);
  return {percent,basis:'saved_explicit_verdicts_50_25_25',details};
 }
 const values=(grade.sections||[]).map(s=>number(s.score));
 if(values.length===3&&values.every(n=>n!==null))return {percent:Math.round(values.reduce((a,b)=>a+b,0)/3),basis:'provider_section_scores'};
 return null;
}
export function acceptShadowScore(grade,options={}){
 const score=savedShadowPercent(grade,options);
 // No evidence links, IPA, timestamps, phrase alignment or reference check here.
 // A genuinely absent numeric value is not replaced with a fabricated mark.
 if(score){grade.scoreCalculation=score;grade.scoreQuality={status:'teacher-direct-score',basis:score.basis};}
 return grade;
}
export function directShadowSchema(schema){const copy=structuredClone(schema);delete copy.properties.scoreLedger;copy.required=copy.required.filter(k=>k!=='scoreLedger');copy.properties.overallPercent={type:'number',minimum:0,maximum:100};copy.required.push('overallPercent');const word=copy.properties.evidence?.items?.properties?.word;if(word)copy.properties.evidence.items.properties.word={type:'string'};return copy;}
export function directShadowSystem(system){return system.replace(/scoreLedger\.units\.targets[^.]*\./g,'').replace(/Điền scoreLedger[^.]*\./g,'').replace(/score tạm để 0[^.]*\./g,'')+'\nQUY TẮC ĐIỂM CUỐI CÙNG CỦA CÔ: Trả overallPercent là điểm tổng thật 0–100 theo ba tiêu chí 50–25–25; mỗi sections.score là điểm thật của tiêu chí đó. Không để điểm giả 0 cho code tính lại. Không lập scoreLedger, outcomes hoặc phraseChecks. Nghe và chữa toàn bài trong một lượt; thiếu IPA/mốc giây/liên kết dẫn chứng không làm mất nhận xét hoặc điểm. Giữ lời chữa cụ thể, trung thực; không bịa lỗi. Điểm trả về được ghi nguyên lên Sheet.';}
export const passShadowGrade=g=>g;
export const passShadowReference=g=>g;
export const passShadowAccent=g=>g;
export function directShadowSegments(segments,grade){const n=grade.scoreCalculation?.percent;if(n===undefined)return segments;return segments.map(s=>({...s,text:s.text.replace(/Chất lượng: đạt(?: khoảng)?\s+\d+(?:[.,]\d+)?%/g,'Chất lượng: đạt '+n+'%')}));}
