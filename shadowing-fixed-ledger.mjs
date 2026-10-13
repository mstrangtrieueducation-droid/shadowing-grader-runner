import {targetWords,spokenShadowTranscript} from './quant-score.mjs';
export const FIXED_LEDGER_VERSION='shadow-single-pass-fixed-ledger-v1';
export function requestLedger(transcript){
 const spoken=spokenShadowTranscript(transcript),units=targetWords(spoken);
 const phrases=spoken.split(/\n+/).map(s=>s.trim()).filter(s=>targetWords(s).length);
 if(!units.length||!phrases.length)throw Error('SHADOW_FIXED_LEDGER_SOURCE_MISSING');
 return {version:FIXED_LEDGER_VERSION,units,prosody:phrases,fluency:phrases};
}
export function sparseSchema(schema){
 const copy=structuredClone(schema);
 for(const name of ['units','prosody','fluency']){const item=copy.properties.scoreLedger.properties[name];delete item.properties.targets;item.required=item.required.filter(k=>k!=='targets');}
 return copy;
}
export function indexedLedger(template){return {version:template.version,unitsCount:template.units.length,phraseCount:template.prosody.length,units:template.units.map((word,i)=>i+'='+word).join(' '),prosodyAndFluency:template.prosody.map((phrase,i)=>i+'='+phrase).join('\n')};}
export function restoreFixedTargets(grade,template){
 if(!template)return grade;
 if(template.version!==FIXED_LEDGER_VERSION)throw Error('SHADOW_FIXED_LEDGER_VERSION_INVALID');
 for(const name of ['units','prosody','fluency']){
  const block=grade.scoreLedger?.[name];if(!block||Array.isArray(block)||!Array.isArray(block.errors)||!Array.isArray(block.unclearIndexes)||!Array.isArray(template[name])||!template[name].length)throw Error('SHADOW_FIXED_LEDGER_OUTPUT_INVALID');
  // The reference lists belong to the request. Acoustic verdicts, evidence,
  // completeness and uncertainty are supplied only by Gemini.
  block.targets=[...template[name]];
 }
 return grade;
}
export const fixedLedgerInstruction='Danh sách mục tiêu đã được code cố định và đánh số trong requestLedger, chỉ số 0-based. units là index=từng từ, gồm từng lần xuất hiện; prosody và fluency dùng chung prosodyAndFluency, index=từng dòng/cụm đọc. Dùng đúng index đã cho, KHÔNG tự đếm index. Nghe toàn bộ audio học sinh trong lượt này, đối chiếu TẤT CẢ mục tiêu. KHÔNG chép lại targets trong JSON trả về: chỉ ghi errors=[{unitIndex,evidenceIndexes}] và unclearIndexes cho từng nhóm. Với mỗi lỗi phải có bằng chứng thực nghe, liên kết evidenceIndexes đúng loại. Mọi evidence phải được một errors entry sử dụng; không ghi lỗi trong lời nhận xét mà thiếu evidence. Một từ có nhiều lỗi gom chung một errors entry. complete=true chỉ khi đã thực sự đối chiếu hết; không có lỗi rõ thì errors=[]; không chắc thì ghi unclearIndexes, không bịa lỗi. Code gắn lại đúng targets đã gửi và tự tính điểm theo 50–25–25; không tự chọn điểm hoặc tự đếm lại số từ.';
