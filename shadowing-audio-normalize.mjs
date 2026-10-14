import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {repairAudioLocally} from './audio-payload-guard.mjs';
export function normalizeShadowAudio(part,job,options={}){
 const mime=part.inlineData?.mimeType||part.fileData?.mimeType;
 if(!mime?.startsWith('audio/'))throw Error('SHADOW_VIDEO_PAYLOAD_FORBIDDEN');
 if(mime==='audio/mpeg'&&part.inlineData&&Buffer.from(part.inlineData.data,'base64').length<=8*1024*1024)return part;
 const m=job.media[0],root=options.root||path.dirname(fileURLToPath(import.meta.url));
 const tag=m.id+'-'+createHash('sha256').update(String(m.modified)).digest('hex').slice(0,10);
 const dir=path.join(root,'private','cache');fs.mkdirSync(dir,{recursive:true});
 const source=path.join(dir,tag+'.shadow-input.audio'),out=path.join(dir,tag+'.shadow.mp3');
 let input;
 if(part.inlineData){fs.writeFileSync(source,Buffer.from(part.inlineData.data,'base64'));input=source;}
 else {
  input=[m.audioPayloadProof?.file,...['.m4a','.flac','.mp3'].map(ext=>path.join(dir,tag+ext))].filter(Boolean).find(f=>fs.existsSync(f)&&fs.statSync(f).size>10240);
  if(!input&&options.g){
   const repaired=(options.repair||repairAudioLocally)({m,job,g:options.g,root,ffmpeg:options.ffmpeg||process.env.FFMPEG_PATH||'ffmpeg',emit:options.emit});
   input=repaired.file;
  }
 }
 if(!input||!fs.existsSync(input))throw Error('SHADOW_CANONICAL_AUDIO_SOURCE_MISSING');
 try{
  const ffmpeg=options.ffmpeg||process.env.FFMPEG_PATH||'ffmpeg',run=options.run||spawnSync;
  // Every encoding uses the COMPLETE extracted recording; never truncate it to
  // fit the API. Lower the bitrate locally if the recording exceeds 8 MiB.
  let okay=false;
  for(const rate of ['64k','48k','32k']){
   const result=run(ffmpeg,['-nostdin','-v','error','-i',input,'-map','0:a:0','-vn','-ac','1','-ar','22050','-c:a','libmp3lame','-b:a',rate,'-y',out],{encoding:'utf8',timeout:120000,windowsHide:true});
   if(result.status!==0||!fs.existsSync(out)||!fs.statSync(out).size){if(fs.existsSync(out))fs.unlinkSync(out);throw Error('SHADOW_CANONICAL_AUDIO_FAILED');}
   if(fs.statSync(out).size<=8*1024*1024){okay=true;break;}
  }
  if(!okay)throw Error('SHADOW_CANONICAL_AUDIO_TOO_LARGE');
 }finally{if(fs.existsSync(source))fs.unlinkSync(source);}
 const data=fs.readFileSync(out);
 job.canonicalAudio={mime:'audio/mpeg',bytes:data.length,sourceMime:mime,sourceId:m.id,modified:m.modified,sha256:createHash('sha256').update(data).digest('hex')};
 return {inlineData:{mimeType:'audio/mpeg',data:data.toString('base64')}};
}
