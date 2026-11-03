import crypto from 'node:crypto';
const key=s=>crypto.createHash('sha256').update(s).digest('hex');
export function documents(state){
 const docs=new Map();
 for(const sh of state.sheets){docs.set('sheet:'+key(sh.name),{_id:'sheet:'+key(sh.name),kind:'sheet',name:sh.name,hidden:!!sh.hidden});for(let i=0;i<sh.rows.length;i++)docs.set('row:'+key(sh.name)+':'+i,{_id:'row:'+key(sh.name)+':'+i,kind:'row',sheet:sh.name,index:i,cells:sh.rows[i]||[]});}
 for(const [name,value] of Object.entries(state.properties||{}))docs.set('prop:'+name,{_id:'prop:'+name,kind:'property',name,value});
 for(const [name,value] of Object.entries(state.userProperties||{}))docs.set('userprop:'+name,{_id:'userprop:'+name,kind:'userProperty',name,value});
 for(const f of state.drive?.files||[])docs.set('media:'+f.id,{_id:'media:'+f.id,kind:'media',value:f});
 for(const f of state.drive?.folders||[])docs.set('folder:'+f.id,{_id:'folder:'+f.id,kind:'folder',value:f});return docs;
}
export function fromDocuments(meta,docs){const state={schemaVersion:1,spreadsheetId:meta.spreadsheetId,properties:{},userProperties:{},sheets:[],drive:{files:[],folders:[]}},sheets=new Map();for(const d of docs)if(d.kind==='sheet'){const sh={name:d.name,hidden:d.hidden,rows:[]};state.sheets.push(sh);sheets.set(d.name,sh);}for(const d of docs){if(d.kind==='row'){const sh=sheets.get(d.sheet);if(!sh)throw Error('Poškozený index listu.');sh.rows[d.index]=d.cells;}else if(d.kind==='property')Object.defineProperty(state.properties,d.name,{value:d.value,enumerable:true,writable:true,configurable:true});else if(d.kind==='userProperty')Object.defineProperty(state.userProperties,d.name,{value:d.value,enumerable:true,writable:true,configurable:true});else if(d.kind==='media')state.drive.files.push(d.value);else if(d.kind==='folder')state.drive.folders.push(d.value);}for(const sh of state.sheets)for(let i=0;i<sh.rows.length;i++)sh.rows[i]??=[];return state;}
export class Store{
 constructor(client,db){this.client=client;this.db=db;this.collection=db.collection('perfect103_records');this.meta=db.collection('perfect103_control');this.changes=db.collection('perfect105_changes');this.cache=null;}
 async initialize(){await this.collection.createIndex({kind:1,sheet:1,'cells.1':1});await this.collection.createIndex({kind:1,sheet:1,'cells.1.$date':1});await this.collection.createIndex({kind:1,sheet:1,index:1});await this.changes.createIndex({expiresAt:1},{expireAfterSeconds:0});}
 // Preserve immutable snapshots and atomic writes. Use legacy transaction timeouts:
 // mongodb 6.21 can add forbidden maxTimeMS to getMore with transaction-only CSOT.
 async run(operation,{trace=()=>{}}={}){
  const session=this.client.startSession();let committedCache;
  try{
   const result=await session.withTransaction(async()=>{
    trace('db.meta.start');
    const meta=await this.meta.findOne({_id:'active'},{session});
    trace('db.meta.done');
    if(!meta?.ready)throw Error('Nejdřív proveď ověřený import dat.');
    trace('db.records.start');
    let raw,mode='full';
    const cached=this.cache;
    if(cached&&cached.spreadsheetId===meta.spreadsheetId&&Number.isSafeInteger(meta.revision)&&meta.revision>=cached.revision){
     if(meta.revision===cached.revision){raw=structuredClone(cached.raw);mode='cached';}
     else if(meta.revision-cached.revision<=128){
      const changes=await this.changes.find({_id:{$gt:cached.revision,$lte:meta.revision}},{session}).sort({_id:1}).toArray();
      if(changes.length===meta.revision-cached.revision&&changes.every((c,i)=>c._id===cached.revision+i+1&&!c.full)){
       const ids=[...new Set(changes.flatMap(c=>c.ids))],map=new Map(cached.raw.map(d=>[d._id,d]));
       ids.forEach(id=>map.delete(id));
       for(let i=0;i<ids.length;i+=200){const docs=await this.collection.find({_id:{$in:ids.slice(i,i+200)}},{session}).toArray();for(const d of docs)map.set(d._id,d);}
       raw=structuredClone([...map.values()]);mode='targeted';
      }
     }
    }
    if(!raw)raw=await this.collection.find({kind:{$in:['sheet','row','property','userProperty','media','folder']}},{session}).toArray();
    trace('db.read.mode',{mode});
    trace('db.records.done',{records:raw.length});
    const state=fromDocuments(meta,raw);state.revision110=meta.revision;
    const before=new Map([...documents(state)].map(([id,doc])=>[id,JSON.stringify(doc)]));
    trace('operation.start');
    const value=await operation(state);
    trace('operation.done');
    const after=documents(state),ops=[];
    for(const [id,doc] of after)if(JSON.stringify(doc)!==before.get(id))ops.push({replaceOne:{filter:{_id:id},replacement:doc,upsert:true}});
    for(const id of before.keys())if(!after.has(id))ops.push({deleteOne:{filter:{_id:id}}});
    trace('db.write.start',{changes:ops.length});
    if(ops.length){
     const changed=await this.meta.updateOne({_id:'active',revision:meta.revision},{$inc:{revision:1}},{session});
     if(changed.matchedCount!==1)throw Error('CONFLICT: Obnov data.');
     for(let i=0;i<ops.length;i+=200)await this.collection.bulkWrite(ops.slice(i,i+200),{session,ordered:true});
     const ids=ops.map(op=>(op.replaceOne||op.deleteOne).filter._id);
     await this.changes.replaceOne({_id:meta.revision+1},{_id:meta.revision+1,ids:ids.length<=5000?ids:[],full:ids.length>5000,expiresAt:new Date(Date.now()+86400000)},{session,upsert:true});
    }
    committedCache={raw:structuredClone([...after.values()]),revision:meta.revision+(ops.length?1:0),spreadsheetId:meta.spreadsheetId,at:mode==='full'?Date.now():cached.at};
    trace('db.commit.start');
    return value;
   },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:15000});
   this.cache=committedCache;trace('db.commit.done');
   return result;
  }catch(e){this.cache=null;trace('db.error',{error:e.name,code:e.code,codeName:e.codeName,message:String(e.message||'').replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi,'[MONGODB_URI]').slice(0,2000),labels:e.errorLabels});throw e;}
  finally{await session.endSession();}
 }
}
