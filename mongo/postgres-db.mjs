// PostgreSQL implementation of the small document API used by the existing runtime.
// No MongoDB connection is involved. All cooperating writers take one transaction
// lock, including push preferences and scoped workbook writes.
const TABLE='perfect_import.source_documents';
const LOCK=106110;
export function encodeDocument(value){
 if(value instanceof Date)return {$date:value.toISOString()};
 if(Array.isArray(value))return value.map(encodeDocument);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encodeDocument(v)]));
 return value;
}
const parameter=(values,value)=>{values.push(value);return '$'+values.length;};
const field=(name,values)=>`document #> ${parameter(values,name.split('.'))}::text[]`;
export function condition(query,values=[]){
 const parts=Object.entries(query).map(([name,value])=>{
  if(name==='$or')return '('+(value.length?value.map(q=>condition(q,values)).join(' OR '):'FALSE')+')';
  if(name.startsWith('$'))throw Error('Unsupported query operator: '+name);
  const left=field(name,values);
  const compare=(operator,right)=>{
   if(right instanceof Date){const p=parameter(values,right.toISOString());return `(${left} ->> '$date') ${operator} ${p}::text`;}
   const p=parameter(values,JSON.stringify(right));
   return `(jsonb_typeof(${left}) = jsonb_typeof(${p}::jsonb) AND ${left} ${operator} ${p}::jsonb)`;
  };
  if(value&&typeof value==='object'&&!Array.isArray(value)&&!(value instanceof Date)&&Object.keys(value).some(k=>k.startsWith('$'))){
   return '('+Object.entries(value).map(([op,right])=>{
    if(op==='$in')return '('+(right.length?right.map(v=>compare('=',v)).join(' OR '):'FALSE')+')';
    if(op==='$regex')return `(jsonb_typeof(${left}) = 'string' AND (${left} #>> '{}') ~ ${parameter(values,right)})`;
    const operators={$gt:'>',$gte:'>=',$lt:'<',$lte:'<='};
    if(!operators[op])throw Error('Unsupported query operator: '+op);
    return compare(operators[op],right);
   }).join(' AND ')+')';
  }
  return compare('=',value);
 });
 return parts.length?parts.join(' AND '):'TRUE';
}
function idOf(doc){
 if(!['string','number'].includes(typeof doc._id)||!String(doc._id))throw Error('Document requires a string or numeric _id.');
 return String(doc._id);
}
export class PostgresDatabase{
 constructor(pool){this.pool=pool;}
 collection(name){return new PostgresCollection(this,name);}
 async connect(){
  // Fail before serving traffic if the import or its unique key is incomplete.
  await this.pool.query(`SELECT collection, document_id, document FROM ${TABLE} LIMIT 0`);
  const invalid=await this.pool.query(`SELECT 1 FROM ${TABLE} WHERE document->>'_id' IS DISTINCT FROM document_id LIMIT 1`);
  if(invalid.rowCount)throw Error('Import má nesouhlasící document_id a document._id.');
  const key=await this.pool.query(`SELECT 1 FROM pg_index i WHERE i.indrelid = '${TABLE}'::regclass AND i.indisunique AND i.indisvalid AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=2 AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM unnest(i.indkey::smallint[]) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE k.n<=i.indnkeyatts) = ARRAY['collection','document_id']::text[] LIMIT 1`);
  if(!key.rowCount)throw Error('Spusť nejprve mongo/sql/supabase.sql (unikátní klíč importu).');
  const meta=await this.collection('perfect103_control').findOne({_id:'active'});
  if(!meta?.ready||!Number.isSafeInteger(meta.revision)||!meta.spreadsheetId)throw Error('Import není připravený: zkontroluj active, ready, revision a spreadsheetId.');
 }
 startSession(){return new PostgresSession(this);}
 async close(){await this.pool.end();}
 async transaction(operation,session){
  if(session){if(session.db!==this||!session.connection)throw Error('Inactive PostgreSQL session.');return operation(session.connection);}
  const own=this.startSession();
  return own.withTransaction(()=>operation(own.connection));
 }
}
class PostgresSession{
 constructor(db){this.db=db;this.connection=null;}
 async withTransaction(operation){
  if(this.connection)throw Error('Nested PostgreSQL transaction.');
  const connection=await this.db.pool.connect();this.connection=connection;
  try{
   await connection.query('BEGIN');
   await connection.query("SET LOCAL lock_timeout = '15s'");
   await connection.query("SET LOCAL statement_timeout = '30s'");
   await connection.query('SELECT pg_advisory_xact_lock($1)',[LOCK]);
   // PostgreSQL has no Mongo TTL indexes. Prune only ephemeral collections.
   await connection.query(`DELETE FROM ${TABLE} WHERE collection IN ('perfect105_changes','perfect106_push') AND document->'expiresAt'->>'$date' < $1`,[new Date().toISOString()]);
   const result=await operation();await connection.query('COMMIT');return result;
  }catch(error){await connection.query('ROLLBACK').catch(()=>{});throw error;}
  finally{this.connection=null;connection.release();}
 }
 async endSession(){}
}
class PostgresCollection{
 constructor(db,name){this.db=db;this.name=name;}
 // Required indexes are installed once by sql/supabase.sql, never by app users.
 async createIndex(){}
 find(query={},options={}){
  let sorting={},maximum;
  const cursor={sort(spec){sorting=spec;return cursor;},limit(n){if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid limit.');maximum=n;return cursor;},toArray:async()=>{
   const values=[this.name],where=condition(query,values);
   const order=Object.entries(sorting).map(([name,direction])=>{if(![1,-1].includes(direction))throw Error('Invalid sort.');return field(name,values)+(direction===1?' ASC':' DESC');});
   const sql=`SELECT document FROM ${TABLE} WHERE collection=$1 AND (${where})`+(order.length?' ORDER BY '+order.join(', '):'')+(maximum?' LIMIT '+parameter(values,maximum):'');
   const connection=options.session?.connection||this.db.pool;
   if(options.session&&(!options.session.connection||options.session.db!==this.db))throw Error('Inactive PostgreSQL session.');
   // Keep workbook {$date:...} values intact: runtime.mjs decodes them itself.
   const result=await connection.query(sql,values);return result.rows.map(row=>row.document);
  }};return cursor;
 }
 async findOne(query,options){return (await this.find(query,options).limit(1).toArray())[0]||null;}
 async replaceOne(filter,replacement,options={}){
  return this.db.transaction(async connection=>{
   const existing=await this.findOne(filter,{session:{db:this.db,connection}});
   if(!existing&&!options.upsert)return {matchedCount:0};
   const id=idOf(replacement);
   if(existing&&idOf(existing)!==id)throw Error('Cannot change document _id.');
   await connection.query(`INSERT INTO ${TABLE} (collection,document_id,document) VALUES ($1,$2,$3::jsonb) ON CONFLICT (collection,document_id) DO UPDATE SET document=EXCLUDED.document`,[this.name,id,JSON.stringify(encodeDocument(replacement))]);
   return {matchedCount:existing?1:0};
  },options.session);
 }
 async updateOne(filter,update,options={}){
  for(const op of Object.keys(update))if(!['$set','$inc','$setOnInsert'].includes(op))throw Error('Unsupported update: '+op);
  return this.db.transaction(async connection=>{
   const session={db:this.db,connection},existing=await this.findOne(filter,{session});
   if(!existing&&!options.upsert)return {matchedCount:0};
   if(!existing&&(typeof filter._id!=='string'&&typeof filter._id!=='number'))throw Error('Upsert requires _id.');
   const doc=existing?structuredClone(existing):{_id:filter._id,...update.$setOnInsert};
   for(const [key,value] of Object.entries(update.$set||{})){if(key.includes('.')||key==='_id')throw Error('Unsupported update field.');doc[key]=value;}
   for(const [key,value] of Object.entries(update.$inc||{})){if(key.includes('.')||key==='_id'||typeof value!=='number'||typeof doc[key]!=='number')throw Error('Invalid increment.');doc[key]+=value;}
   await this.replaceOne({_id:doc._id},doc,{upsert:true,session});return {matchedCount:existing?1:0};
  },options.session);
 }
 async deleteOne(filter,options={}){
  return this.db.transaction(async connection=>{
   const values=[this.name],where=condition(filter,values);
   const result=await connection.query(`DELETE FROM ${TABLE} WHERE collection=$1 AND document_id IN (SELECT document_id FROM ${TABLE} WHERE collection=$1 AND (${where}) LIMIT 1)`,values);
   return {deletedCount:result.rowCount};
  },options.session);
 }
 async bulkWrite(operations,options={}){
  return this.db.transaction(async connection=>{
   const session={db:this.db,connection};
   const replacements=operations.filter(op=>op.replaceOne).map(op=>op.replaceOne);
   const deletions=operations.filter(op=>op.deleteOne).map(op=>op.deleteOne);
   const ids=replacements.map(op=>idOf(op.replacement));
   const fast=operations.length===replacements.length+deletions.length&&new Set(ids).size===ids.length&&replacements.every(op=>op.upsert&&Object.keys(op.filter).length===1&&op.filter._id===op.replacement._id)&&deletions.every(op=>Object.keys(op.filter).length===1&&['string','number'].includes(typeof op.filter._id))&&deletions.every(op=>!ids.includes(String(op.filter._id)));
   if(fast){
    // Store.run already chunks to 200; one SQL round trip per chunk rather
    // than a SELECT and INSERT per changed workbook row over the Internet.
    if(replacements.length)await connection.query(`INSERT INTO ${TABLE} (collection,document_id,document) SELECT $1, item->>'_id', item FROM jsonb_array_elements($2::jsonb) AS item ON CONFLICT (collection,document_id) DO UPDATE SET document=EXCLUDED.document`,[this.name,JSON.stringify(replacements.map(op=>encodeDocument(op.replacement)))]);
    if(deletions.length)await connection.query(`DELETE FROM ${TABLE} WHERE collection=$1 AND document_id=ANY($2::text[])`,[this.name,deletions.map(op=>String(op.filter._id))]);
    return;
   }
   for(const op of operations){
    if(op.replaceOne)await this.replaceOne(op.replaceOne.filter,op.replaceOne.replacement,{upsert:op.replaceOne.upsert,session});
    else if(op.deleteOne)await this.deleteOne(op.deleteOne.filter,{session});
    else throw Error('Unsupported bulk operation.');
   }
  },options.session);
 }
}
