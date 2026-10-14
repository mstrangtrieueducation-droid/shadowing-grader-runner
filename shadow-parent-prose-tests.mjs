import assert from 'node:assert/strict';import {parentProseParts,shadowParentSegments} from './shadow-parent-prose.mjs';
const body='\n• Phát âm\nCon đọc rõ.\nTuy nhiên, con chú ý từ rain /reɪn/ ở 00:44 nhé.\n';
const input='— NHẬN XÉT GV —\nĐiểm: chưa xác định — kết quả đã lưu chưa có đủ bằng chứng.\nĐối chiếu theo transcript; chưa có audio mẫu để đánh giá.\n'+body;
const out=parentProseParts(input);assert.equal(out.text,'— NHẬN XÉT GV —\n'+body);assert(out.kept.every(p=>input.slice(p.start,p.end)===p.text));assert.equal(parentProseParts(out.text).text,out.text);
assert.deepEqual(shadowParentSegments([{text:input,tone:'neutral'}]),[{text:out.text,tone:'neutral'}]);
assert.equal(parentProseParts('Chất lượng: đạt khoảng 85%.\n'+body).text,'Chất lượng: đạt khoảng 85%.\n'+body);
console.log('PASS parent-facing prose only; all feedback, IPA, times, scores and tones preserved; provider calls: 0.');
