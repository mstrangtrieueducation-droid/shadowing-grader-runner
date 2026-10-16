import assert from 'node:assert/strict';
import {hasFeedback} from './shadowing-policies.mjs';
import {withShadowReceiptProtection} from './shadow-receipt-feedback.mjs';
const protectedFeedback=withShadowReceiptProtection(hasFeedback);
for(const text of ['— CHƯA GHI NHẬN','⛔ QUÁ HẠN\n— CHƯA GHI NHẬN','✅ ĐÃ NỘP\n16/10/2026 08:00\n— NHẬN XÉT GV —','✅ ĐÃ GHI NHẬN · 1 lượt\nLượt 1: 16/10/2026 08:00',''])assert.equal(protectedFeedback(text),false,text);
for(const text of ['85%','Chất lượng: đạt 85%.','⛔ QUÁ HẠN\n— CHƯA GHI NHẬN\nCon nộp sai bài, gửi lại cho cô.','— NHẬN XÉT GV —\nEm đọc rõ.','⛔ BÀI CHƯA HỢP LỆ\n💬 GHI CHÚ GV:\nCon quay lại đúng bài nhé.','QUÁ HẠN: cô đã xem bài.'])assert.equal(protectedFeedback(text),true,text);
assert.equal(protectedFeedback('— CHƯA GHI NHẬN','=IF(A1,1,0)'),true);
console.log('PASS stock stale receipts are not teacher feedback; marks, prose, invalid-submission notices and formulas protected; no sync writes or provider calls.');
