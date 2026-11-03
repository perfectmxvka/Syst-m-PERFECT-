import {createRuntime} from './runtime.mjs';
import {Buffer} from 'node:buffer';
class NeedQuery extends Error{constructor(q,start,max){super('Přednačtení Gmail dotazu');Object.assign(this,{q,start,max});}}
const decode64=s=>Buffer.from(s||'','base64url').toString('utf8');
function message(m){const h=Object.fromEntries((m.payload?.headers||[]).map(x=>[x.name.toLowerCase(),x.value]));let plain='',html='';function walk(p){if(p.mimeType==='text/plain')plain+=decode64(p.body?.data);if(p.mimeType==='text/html')html+=decode64(p.body?.data);(p.parts||[]).forEach(walk);}walk(m.payload||{});return {getId:()=>m.id,getSubject:()=>h.subject||'',getDate:()=>new Date(Number(m.internalDate)),getPlainBody:()=>plain,getBody:()=>html||plain};}
export async function prepareGmail(store,{clientId,clientSecret,refreshToken,fetcher=fetch}){
 if(!clientId||!clientSecret||!refreshToken)throw Error('Gmail není připojen; nastav OAuth údaje.');
 const token=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken}),signal:AbortSignal.timeout(30000)});
 if(!token.ok)throw Error('Google odmítl obnovení přístupu ke Gmailu.');const {access_token}=await token.json();
 async function get(path){const r=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{Authorization:'Bearer '+access_token},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Gmail API odmítlo požadavek ('+r.status+').');return r.json();}
 const results=new Map(),threadCache=new Map();const key=(q,start,max)=>JSON.stringify([q,start,max]);
 const facade={search(q,start=0,max=100){const k=key(q,start,max);if(!results.has(k))throw new NeedQuery(q,start,max);return results.get(k);},getMessageById(){throw Error('Samostatné čtení zprávy není součástí tohoto importu.');}};
 const {state}=await store.load();const runtime=createRuntime(state,{gmail:facade});
 for(let attempts=0;attempts<30;attempts++){
  try{runtime.business.gmailFindUnimportedMessages_(100,{preview:true});return facade;}
  catch(e){if(!(e instanceof NeedQuery))throw e;let pageToken='',items=[];
   do{const query=new URLSearchParams({q:e.q,maxResults:String(e.max)});if(pageToken)query.set('pageToken',pageToken);const page=await get('threads?'+query);items.push(...(page.threads||[]));pageToken=page.nextPageToken||'';}while(pageToken&&items.length<e.start+e.max);
   const ids=items.slice(e.start,e.start+e.max).map(x=>x.id),threads=[];
   for(let start=0;start<ids.length;start+=5){const batch=await Promise.all(ids.slice(start,start+5).map(async id=>{if(!threadCache.has(id)){const t=await get('threads/'+encodeURIComponent(id)+'?format=full');const messages=(t.messages||[]).map(message);threadCache.set(id,{getMessages:()=>messages});}return threadCache.get(id);}));threads.push(...batch);}
   results.set(key(e.q,e.start,e.max),threads);
  }
 }
 throw Error('Gmail vyžaduje příliš mnoho dotazů; import se bezpečně odloží na další běh.');
}
