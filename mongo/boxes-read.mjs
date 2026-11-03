// Read-only snapshot for a single day. Never pass this compact workbook to Store.run.
import {fromDocuments} from './store.mjs';
import {createRuntime} from './runtime.mjs';
export const ORDERS='__PERFECT_DB_OBJEDNAVKY',SHIFTS='__PERFECT_DB_SMENY',ASSIGN='__PERFECT_DB_PRIRAZENI_BOXU';
export function validateDay(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day)throw Error('Neplatné datum.');return day;}
function midnight(day){let ms=Date.parse(day+'T00:00:00Z');for(let i=0;i<3;i++){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(ms).map(p=>[p.type,p.value]));ms+=Date.parse(day+'T00:00:00Z')-Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);}return new Date(ms).toISOString();}
export function dayQuery(sheet,day){validateDay(day);const [y,m,d]=day.split('-'),next=new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);return {kind:'row',sheet,index:{$gte:sheet===ORDERS?2:1},$or:[{'cells.1':{$regex:'^'+day+'(?:$|T|\\s)'}},{'cells.1':{$regex:'^0?'+Number(d)+'\\.\\s*0?'+Number(m)+'\\.\\s*'+y+'(?:$|\\s)'}},{'cells.1.$date':{$gte:midnight(day),$lt:midnight(next)}}]};}
export async function readBoxesDay(store,method,args,options={}){
 const day=validateDay(args[1].from);if(args[1].to!==day)throw Error('Vyber jeden den.');
 const session=store.client.startSession();
 try{return await session.withTransaction(async()=>{
  const meta=await store.meta.findOne({_id:'active'},{session});if(!meta?.ready)throw Error('Nejdřív proveď ověřený import dat.');
  const base=await store.collection.find({$or:[{kind:{$in:['sheet','property']}},{kind:'row',index:{$lt:2},sheet:ORDERS},{kind:'row',index:0}]},{session}).toArray();
  const auth=createRuntime(fromDocuments(meta,base),options);auth.ctx.perfect108BoxesRead_(args[0],args[1]);
  const orders=await store.collection.find(dayQuery(ORDERS,day),{session}).sort({index:1}).toArray();
  const ids=orders.map(r=>String(r.cells[0]));
  const shifts=await store.collection.find(dayQuery(SHIFTS,day),{session}).sort({index:1}).toArray();
  const assignments=await store.collection.find({kind:'row',sheet:ASSIGN,index:{$gte:1},'cells.1':{$in:ids}},{session}).sort({index:1}).toArray();
  // Compact row numbers are safe only because this path can never persist changes.
  const compact=(rows,start)=>rows.map((r,i)=>({...r,index:start+i}));
  const state=fromDocuments(meta,[...base,...compact(orders,2),...compact(shifts,1),...compact(assignments,1)]);
  return createRuntime(state,options).call(method,args);
 },{readConcern:{level:'snapshot'},maxCommitTimeMS:15000});}finally{await session.endSession();}
}
