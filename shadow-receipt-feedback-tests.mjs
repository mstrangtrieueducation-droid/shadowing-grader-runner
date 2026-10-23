import assert from 'node:assert/strict';
import {hasFeedback} from './shadowing-policies.mjs';
import {withShadowReceiptProtection} from './shadow-receipt-feedback.mjs';
const protectedFeedback=withShadowReceiptProtection(hasFeedback);
for(const text of ['— CHƯA GHI NHẬN','⛔ QUÁ HẠN\n— CHƯA GHI NHẬN','✅ ĐÃ NỘP\n16/10/2026 08:00\n— NHẬN XÉT GV —','✅ ĐÃ GHI NHẬN · 1 lượt\nLượt 1: 16/10/2026 08:00',''])assert.equal(protectedFeedback(text),false,text);
for(const text of ['Chất lượng: đạt 85%.','⛔ QUÁ HẠN\n— CHƯA GHI NHẬN\nCon nộp sai bài, gửi lại cho cô.','— NHẬN XÉT GV —\nEm đọc rõ.','⛔ BÀI CHƯA HỢP LỆ\n💬 GHI CHÚ GV:\nCon quay lại đúng bài nhé.','QUÁ HẠN: cô đã xem bài.'])assert.equal(protectedFeedback(text),true,text);
assert.equal(protectedFeedback('— CHƯA GHI NHẬN','=IF(A1,1,0)'),true);
console.log('PASS stock stale receipts are not teacher feedback; marks, prose, invalid-submission notices and formulas protected; no sync writes or provider calls.');
const quiz='✅ ĐÃ NỘP\n15/10/2026 21:49\n🎧 ĐIỂM NGHE SCIENCE G3\nĐiểm 13/30 (43%)',marker='— NHẬN XÉT GV —';
for(const text of [quiz,quiz+'\n\n'+marker,'43%','13/30','Điểm nghe: 13/30 (43%)']){assert.equal(protectedFeedback(text),false);assert.equal(protectedFeedback(text,'=1'),true);}
assert.equal(protectedFeedback(quiz+'\n'+marker+'\nEm nói rõ.'),true);
const {richSegments}=await import('./shadowing-policies.mjs'),grade={sections:[{label:'Phát âm',score:85,praise:'Em đọc rõ.',correction:'Em giữ âm cuối.'},{label:'Ngữ điệu',score:80},{label:'Trôi chảy',score:90}],evidence:[]};
for(const before of [quiz,quiz+'\n\n'+marker,'Điểm nghe: 13/30 (43%)']){const segments=richSegments(grade,'2026-10-15T14:49:00Z',before),text=segments.map(s=>s.text).join('');assert(text.startsWith(before.split(marker)[0]));assert(text.includes('13/30 (43%)'));assert.equal(text.split(marker).length,2);assert(text.includes('Chất lượng: đạt khoảng 85%.'));assert(segments.some(s=>s.tone==='correction'&&s.text.includes('Em giữ âm cuối.')));assert.equal(protectedFeedback(text),true);}
console.log('PASS Shadow listening marks eligible; prefix, actual grade, full prose and color tones merged; second delivery protected; 0 provider calls.');
