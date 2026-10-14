import assert from 'node:assert/strict';import {savedJsonWhitespace} from './saved-json-whitespace.mjs';
const value={assessable:true,correction:'Con sửa /kæt/ ở 00:38. Giữ \\n trong lời trích.'},valid=JSON.stringify(value,null,2),bad=valid.replaceAll('\n','\\\\n');
assert.deepEqual(JSON.parse(savedJsonWhitespace(bad)),value);assert.equal(savedJsonWhitespace(valid),valid);assert.equal(savedJsonWhitespace('{"missing":'),'{"missing":');assert.equal(savedJsonWhitespace('not JSON'),'not JSON');
console.log('PASS saved structural escapes only, immutable quotations/IPA/times; incomplete replies remain rejected; provider calls: 0.');
