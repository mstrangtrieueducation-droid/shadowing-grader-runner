const headings=new Set(['Phát âm, âm đuôi & trọng âm','Ngữ điệu & ngắt nghỉ theo mẫu','Tốc độ nói & độ trôi chảy']);
// Recover only an omitted {"label": before a known section heading. Tokens
// inside teacher quotations are never interpreted as JSON structure.
export function savedJsonSectionObjects(text){
 const tokens=[];for(let i=0;i<text.length;){if(/\s/.test(text[i])){i++;continue;}const start=i;if(text[i]==='"'){i++;let escaped=false,closed=false;for(;i<text.length;i++){if(escaped){escaped=false;continue;}if(text[i]==='\\'){escaped=true;continue;}if(text[i]==='"'){i++;closed=true;break;}}if(!closed)return text;let value;try{value=JSON.parse(text.slice(start,i));}catch{return text;}tokens.push({type:'string',value,start,end:i});}else if('{}[],:'.includes(text[i]))tokens.push({type:text[i],start:i,end:++i});else{for(;i<text.length&&!/[\s{}\[\],:]/.test(text[i]);i++);tokens.push({type:'literal',start,end:i});}}
 const insert=[];for(let i=2;i+3<tokens.length;i++){const t=tokens[i];if(t.type==='string'&&headings.has(t.value)&&tokens[i-2].type==='}'&&tokens[i-1].type===','&&tokens[i+1].type===','&&tokens[i+2].type==='string'&&tokens[i+2].value==='score'&&tokens[i+3].type===':')insert.push(t.start);}
 for(const at of insert.reverse())text=text.slice(0,at)+'{"label":'+text.slice(at);return text;
}
