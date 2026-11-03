// Explicit opt-in: this test creates perfect_import in an empty LOCAL test DB.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {PostgresDatabase} from '../postgres-db.mjs';
import {openDatabase} from '../database.mjs';
import {Store,documents,fromDocuments} from '../store.mjs';
import {fixture,token,plain} from './fixture110.mjs';
import {createRuntime} from '../performance107.mjs';
import {runScoped} from '../scoped-store.mjs';
import {scopeLoader} from '../scopes110.mjs';
import {readBoxesDay,ASSIGN} from '../boxes-read.mjs';

const url=process.env.PERFECT_TEST_DATABASE_URL;
if(!url)throw Error('Set PERFECT_TEST_DATABASE_URL to an empty local database named perfect_test.');
const parsed=new URL(url);
if(!['localhost','127.0.0.1'].includes(parsed.hostname)||parsed.pathname!=='/perfect_test')throw Error('Refusing to use a non-local or non-test database.');
const pool=new Pool({connectionString:url,max:5});
const db=new PostgresDatabase(pool);
test('Supabase document backend: import, scoped reads/writes, rollback, concurrent commits and preferences',async()=>{
 try{
  const existing=await pool.query("SELECT to_regnamespace('perfect_import') AS existing");
  assert.equal(existing.rows[0].existing,null,'Use an empty test database; existing schema will not be removed.');
  await pool.query('CREATE SCHEMA perfect_import; CREATE TABLE perfect_import.source_documents(collection text NOT NULL, document_id text NOT NULL, document jsonb NOT NULL)');
  await pool.query("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END $$");
  const sql=await readFile(new URL('../sql/supabase.sql',import.meta.url),'utf8');
  await pool.query(sql);await pool.query(sql); // repeatable setup
  const state=fixture();
  await pool.query('INSERT INTO perfect_import.source_documents VALUES ($1,$2,$3)', ['perfect103_control','active',JSON.stringify({_id:'active',ready:true,revision:0,spreadsheetId:'test'})]);
  for(const doc of documents(state).values())await pool.query('INSERT INTO perfect_import.source_documents VALUES ($1,$2,$3)', ['perfect103_records',doc._id,JSON.stringify(doc)]);
  await db.connect();
  const store=new Store(db,db);await store.initialize();
  const args=[token,{from:'2026-10-27',to:'2026-10-27'}];
  const full=await store.run(s=>createRuntime(s).call('perfectBoxes49GetOverview',args));
  assert.deepEqual(plain(await readBoxesDay(store,'perfectBoxes49GetOverview',args)),plain(full));
  const untouched=await store.collection.findOne({kind:'row',sheet:ASSIGN,index:0});
  const view=await readBoxesDay(store,'perfectBoxes49GetOverview',args),order=view.orders[0];
  const input={date:'2026-10-27',items:[{orderId:order.id,station:'QUEUE',revision:order.allocationRevision49}],includeOverview104:true};
  const run=(method,args,readOnly=false)=>runScoped(store,scopeLoader(store,method,args),s=>createRuntime(s).call(method,args),{readOnly});
  assert.equal((await run('perfectBoxes49Apply',[token,input])).success,true);
  assert.deepEqual(await store.collection.findOne({_id:untouched._id}),untouched);
  await assert.rejects(run('perfectBoxes49Apply',[token,input]),/mezitím změnila/);
  const updated=await readBoxesDay(store,'perfectBoxes49GetOverview',args);
  assert.equal(updated.orders[0].station,'');assert.equal(updated.orders[0].revenue,8000);
  const meta=await store.meta.findOne({_id:'active'});
  assert.deepEqual(plain(updated),plain(createRuntime(fromDocuments(meta,await store.collection.find({}).toArray())).call('perfectBoxes49GetOverview',args)));
  for(const page of ['dashboard','calendar','orders','customers','vehicles','services','detailing','boxes49','settings'])assert.equal((await run('perfectWebBootstrap36',[token,{scope109:{page,offset:0}}],true)).success,true,page);
  // A new Store instance exercises the revision/change-log cache refresh path.
  const second=new Store(db,db);await second.initialize();
  await store.run(s=>{s.properties.PG_COUNTER='0';});
  await second.run(s=>assert.equal(s.properties.PG_COUNTER,'0'));
  await Promise.all(Array.from({length:8},(_,i)=>(i%2?store:second).run(async s=>{const n=Number(s.properties.PG_COUNTER);await new Promise(resolve=>setTimeout(resolve,5));s.properties.PG_COUNTER=String(n+1);})));
  assert.equal(await store.run(s=>s.properties.PG_COUNTER),'8');
  const revision=(await store.meta.findOne({_id:'active'})).revision;
  await assert.rejects(store.run(s=>{s.properties.ROLLBACK='bad';throw Error('intentional rollback');}),/intentional rollback/);
  assert.equal(await second.run(s=>s.properties.ROLLBACK),undefined);
  assert.equal((await store.meta.findOne({_id:'active'})).revision,revision);
  await assert.rejects(db.transaction(async connection=>{
   const session={db,connection};
   await store.meta.updateOne({_id:'active',revision},{$inc:{revision:1}},{session});
   await store.collection.bulkWrite([{replaceOne:{filter:{_id:'prop:PG_ATOMIC'},replacement:{_id:'prop:PG_ATOMIC',kind:'property',name:'PG_ATOMIC',value:'bad'},upsert:true}},{unsupported:{}}],{session});
  }),/Unsupported bulk/);
  assert.equal(await store.collection.findOne({_id:'prop:PG_ATOMIC'}),null);
  assert.equal((await store.meta.findOne({_id:'active'})).revision,revision);
  const session=db.startSession();
  await assert.rejects(session.withTransaction(async()=>{await db.collection('perfect106_push_preferences').updateOne({_id:'admin'},{$set:{enabled:false}},{upsert:true,session});throw Error('rollback preferences');}),/rollback preferences/);
  assert.equal(await db.collection('perfect106_push_preferences').findOne({_id:'admin'}),null);
  const prefs=db.collection('perfect106_push_preferences');
  await prefs.updateOne({_id:'admin'},{$set:{enabled:false}},{upsert:true});
  await prefs.updateOne({_id:'admin'},{$set:{details:false}},{upsert:true});
  assert.deepEqual(await prefs.findOne({_id:'admin'}),{_id:'admin',enabled:false,details:false});
  const config=db.collection('perfect108_push_config');
  await Promise.all(['first','second'].map(publicKey=>config.updateOne({_id:'vapid'},{$setOnInsert:{publicKey}},{upsert:true})));
  assert.ok(['first','second'].includes((await config.findOne({_id:'vapid'})).publicKey));
  const subs=db.collection('perfect106_push');
  await subs.replaceOne({_id:'expired'},{_id:'expired',user:'admin',expiresAt:new Date(0)},{upsert:true});
  await subs.replaceOne({_id:'live'},{_id:'live',user:'admin',s:{endpoint:'https://example.com'},expiresAt:new Date(Date.now()+60000)},{upsert:true});
  assert.equal((await subs.find({user:'admin',expiresAt:{$gt:new Date()}}).toArray()).length,1);
  assert.equal(await subs.findOne({_id:'expired'}),null);
  assert.equal((await subs.deleteOne({user:'admin','s.endpoint':'https://example.com'})).deletedCount,1);
  await assert.rejects(prefs.find({enabled:{$unknown:true}}).toArray(),/Unsupported query/);
  assert.equal((await store.collection.find({kind:'row',index:{$gte:0}}).sort({index:-1}).limit(1).toArray()).length,1);
  await assert.rejects(readBoxesDay(store,'perfectBoxes49GetOverview',['bad-token',args[1]]));
  const opened=await openDatabase({SUPABASE_DATABASE_URL:url,PG_LOCAL_TEST:'true'});await opened.client.close();
  await assert.rejects(openDatabase({SUPABASE_DATABASE_URL:'postgresql://test@example.com/perfect_test',PG_LOCAL_TEST:'true'}),/pouze pro lokální/);
  // Exercise the actual npm-start entry point and HTTP API, with no Mongo URI.
  const origin='http://localhost:18086';
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,MONGODB_URI:'',MONGODB_DB:'',SUPABASE_DATABASE_URL:url,PG_LOCAL_TEST:'true',PORT:'18086',PUBLIC_ORIGIN:'',RENDER_EXTERNAL_URL:origin,PUSH_ENABLED:'false',BACKUP_DIR:'',RESEND_API_KEY:''},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  try{
   let healthy=false;
   for(let i=0;i<50;i++){
    if(child.exitCode!==null)throw Error('Server exited: '+output);
    try{healthy=(await fetch(origin+'/healthz')).ok;}catch{}
    if(healthy)break;await new Promise(resolve=>setTimeout(resolve,100));
   }
   assert.ok(healthy,'Server did not start: '+output);
   assert.match(output,/Supabase PostgreSQL/);
   assert.match(await (await fetch(origin)).text(),/host.js/);
   const post=(method,args,requestOrigin=origin)=>fetch(origin+'/api',{method:'POST',headers:{origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify({method,args})});
   assert.equal((await post('perfect101Status',[token],'https://wrong.example')).status,403);
   const status=await post('perfect101Status',[token]);assert.equal(status.status,200);assert.equal((await status.json()).success,true);
   const page=await post('perfectWebBootstrap36',[token,{scope109:{page:'dashboard',offset:0}}]);assert.equal(page.status,200);assert.equal((await page.json()).success,true);
   const denied=await post('perfect101Status',['invalid']);assert.equal(denied.status,400);
  }finally{
   const exited=new Promise(resolve=>child.once('exit',resolve));
   if(child.exitCode===null){child.kill('SIGTERM');await exited;}
  }
 }finally{
  // Keep local test data until its disposable PostgreSQL container is removed.
  await pool.end();
 }
});
