export function batchDeliveryCheckpoint(batch,size=10){let next=size;return completed=>{if(!batch||completed<next)return false;batch.flush();next=(Math.floor(completed/size)+1)*size;return true;};}
