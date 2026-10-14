const technical=/^(?:Điểm: chưa xác định\s*[—–-].*|Đối chiếu theo transcript; chưa có audio mẫu.*)$/u;
export function parentProseParts(text){
 const kept=[];let cursor=0;
 for(const line of String(text).match(/[^\n]*\n|[^\n]+$/g)||[]){if(!technical.test(line.trim()))kept.push({start:cursor,end:cursor+line.length,text:line});cursor+=line.length;}
 return {text:kept.map(p=>p.text).join(''),kept};
}
export const shadowParentSegments=segments=>segments.map(s=>({...s,text:parentProseParts(s.text).text})).filter(s=>s.text);
