import { createClient } from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase=url&&key?createClient(url,key):null;
export type Payload=Record<string,unknown>;
export type Pending={id:string,payload:Payload};
export type Cache={records:Record<string,Payload>,pending:Record<string,Pending>};
export const empty=():Cache=>({records:{},pending:{}});
let dbPromise:Promise<IDBDatabase>|undefined;
function db(){
  return dbPromise??=new Promise((resolve,reject)=>{
    const req=indexedDB.open('betterme-v1',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('accounts');
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>{dbPromise=undefined;reject(req.error)};
  });
}
export async function loadCache(uid:string):Promise<Cache>{
  const conn=await db();
  return new Promise((resolve,reject)=>{
    const req=conn.transaction('accounts','readonly').objectStore('accounts').get(uid);
    req.onsuccess=()=>resolve(req.result??empty());req.onerror=()=>reject(req.error);
  });
}
export async function saveCache(uid:string,value:Cache):Promise<void>{
  const conn=await db();
  return new Promise((resolve,reject)=>{
    const tx=conn.transaction('accounts','readwrite');
    tx.objectStore('accounts').put(value,uid);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
export async function pullRecords(uid:string){
  if(!supabase)throw new Error('Backend not configured');
  const records:Record<string,Payload>={};
  for(let start=0;;start+=500){
    const {data,error}=await supabase.from('entries').select('entry_key,payload').eq('user_id',uid).order('entry_key').range(start,start+499);
    if(error)throw error;
    for(const row of data??[]) records[row.entry_key]=row.payload as Payload;
    if((data??[]).length<500)break;
  }
  return records;
}
