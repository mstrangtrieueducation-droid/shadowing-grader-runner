// The live Form is already verified by the native sweep/preflight. A stale
// classroom receipt is not teacher feedback and must not prevent grading.
import {receiptOnlyCell,hasTeacherReview} from './teacher-feedback-state.mjs';
export const withShadowReceiptProtection=hasFeedback=>(text,formula='')=>{
 if(formula)return true;
 if(hasTeacherReview(text))return true;
 if(receiptOnlyCell(text))return false;
 const lines=String(text||'').normalize('NFC').split('\n').map(s=>s.trim()).filter(Boolean);
 const staleReceipt=lines.length&&lines.every(s=>/^(?:⛔\s*QUÁ HẠN|[—–-]\s*CHƯA GHI NHẬN)$/u.test(s));
 return staleReceipt?false:hasFeedback(text,formula);
};
