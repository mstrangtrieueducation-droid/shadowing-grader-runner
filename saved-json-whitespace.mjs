// Repair literal formatting escapes only outside JSON strings. No content changes.
export function savedJsonWhitespace(text){
 try{JSON.parse(text);return text;}catch{}
 let out='',inside=false,escaped=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(inside){out+=ch;if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')inside=false;continue;}if(ch==='"'){inside=true;out+=ch;continue;}if(ch==='\\'){let end=i;while(text[end]==='\\')end++;if(end-i<=2&&'nrt'.includes(text[end]||'!')){out+=({n:'\n',r:'\r',t:'\t'})[text[end]];i=end;continue;}}out+=ch;}
 try{JSON.parse(out);return out;}catch{return text;}
}
