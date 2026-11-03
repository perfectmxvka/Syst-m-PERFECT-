import {documents,fromDocuments} from './store.mjs';
// Isolated partial workbook. Row locations are translated on commit, never guessed.
export async function runScoped(store,load,operation,{readOnly=false}={}){
 const session=store.client.startSession();
 try{return await session.withTransaction(async()=>{
  const meta=await store.meta.findOne({_id:'active'},{session});if(!meta?.ready)throw Error('Nejdřív proveď ověřený import dat.');
  const raw=await load(session,meta),unique=new Map(raw.map(d=>[d._id,d]));
  const maps=new Map(),compact=[],maxima=new Map();
  for(const d of unique.values())if(d.kind!=='row')compact.push(d);
  const sheets=[...unique.values()].filter(d=>d.kind==='sheet');
  for(const sh of sheets){const rows=[...unique.values()].filter(d=>d.kind==='row'&&d.sheet===sh.name).sort((a,b)=>a.index-b.index),map=new Map();rows.forEach((r,i)=>{map.set(i,r.index);compact.push({...r,index:i});});maps.set(sh.name,map);}
  const state=fromDocuments(meta,compact);state.revision110=meta.revision;
  const before=documents(state);const value=await operation(state);
  if(readOnly)return value;
  const after=documents(state),ops=[];
  // Compact sheet row deletion would shift original positions and is prohibited.
  for(const [id,d] of before)if(!after.has(id)&&d.kind==='row')throw Error('Částečný zápis nesmí odstranit řádky.');
  for(const [id,d] of after){if(JSON.stringify(d)===JSON.stringify(before.get(id)))continue;
   let target=d;
   if(d.kind==='row'){
    const map=maps.get(d.sheet)||new Map();let index=map.get(d.index);
    if(index===undefined){if(!maxima.has(d.sheet)){const last=await store.collection.find({kind:'row',sheet:d.sheet},{session,projection:{index:1}}).sort({index:-1}).limit(1).toArray();maxima.set(d.sheet,last[0]?.index??-1);}index=maxima.get(d.sheet)+1;maxima.set(d.sheet,index);map.set(d.index,index);maps.set(d.sheet,map);}
    target={...d,index,_id:d._id.replace(/:\d+$/,':'+index)};
   }
   ops.push({replaceOne:{filter:{_id:target._id},replacement:target,upsert:true}});
  }
  for(const [id,d] of before)if(!after.has(id)&&d.kind!=='row')ops.push({deleteOne:{filter:{_id:id}}});
  if(ops.length){const changed=await store.meta.updateOne({_id:'active',revision:meta.revision},{$inc:{revision:1}},{session});if(changed.matchedCount!==1)throw Error('CONFLICT: Obnov přehled.');for(let i=0;i<ops.length;i+=200)await store.collection.bulkWrite(ops.slice(i,i+200),{session,ordered:true});const ids=ops.map(o=>(o.replaceOne||o.deleteOne).filter._id);await store.changes.replaceOne({_id:meta.revision+1},{_id:meta.revision+1,ids:ids.length<=5000?ids:[],full:ids.length>5000,expiresAt:new Date(Date.now()+86400000)},{session,upsert:true});store.cache=null;}
  return value;
 },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:15000});}finally{await session.endSession();}
}
