import { AppError } from './domain';
export interface PrivateStorage {
  put(key:string,value:ArrayBuffer,options?:{httpMetadata?:{contentType:string}}):Promise<unknown>;
  get(key:string):Promise<{arrayBuffer():Promise<ArrayBuffer>}|null>;
  delete(key:string):Promise<unknown>;
}
export type MediaPurpose='audio'|'evidence'|'image';
export function validateUpload(bytes:Uint8Array,mime:string,purpose:MediaPurpose){
  const max=purpose==='audio'?2*1024*1024:1024*1024;
  if(!bytes.length||bytes.length>max)throw new AppError(413,'Datei fehlt oder ist zu groß.');
  const header=new TextDecoder('ascii').decode(bytes.slice(0,12));
  if(purpose==='audio'){
    if(mime!=='audio/wav'||header.slice(0,4)!=='RIFF'||header.slice(8,12)!=='WAVE')throw new AppError(415,'Nur WAV-Dateien sind vorbereitet.');
    // Storage accepts private originals only. Streaming/publication remains gated off.
  }else if(purpose==='evidence'){
    if(mime!=='application/pdf'||header.slice(0,5)!=='%PDF-')throw new AppError(415,'Nachweise müssen PDF-Dateien sein.');
  }else if(mime!=='image/png'||!bytes.slice(0,8).every((b,i)=>b===[137,80,78,71,13,10,26,10][i]))throw new AppError(415,'Nur PNG-Dateien sind vorbereitet.');
  return {bytes:bytes.length,mime,purpose};
}
export const mediaProviders={youtube:{kind:'external_embed',revealsTitle:true},private_audio:{kind:'licensed_content',publicationEnabled:false}} as const;
