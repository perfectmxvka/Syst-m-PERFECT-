import {MongoMemoryReplSet} from 'mongodb-memory-server';import {MongoClient} from 'mongodb';import assert from 'node:assert/strict';
import {Store,documents,fromDocuments} from '../store.mjs';import {createRuntime} from '../performance107.mjs';import {runScoped} from '../scoped-store.mjs';import {scopeLoader} from '../scopes110.mjs';import {readBoxesDay,ORDERS,SHIFTS,ASSIGN} from '../boxes-read.mjs';import {snapshot,diff} from '../worker-events106.mjs';import {fixture,token,plain,matches} from './fixture110.mjs';
const memory=new Map(),control={_id:'active',ready:true,revision:0,spreadsheetId:'test'};
const collection={createIndex:async()=>{},insertMany:async docs=>{docs.forEach(d=>memory.set(d._id,structuredClone(d)));},find(q){let rows=[...memory.values()].filter(d=>matches(d,q));return {sort(spec){rows.sort((a,b)=>Object.entries(spec).reduce((v,[k,d])=>v||((a[k]>b[k]?1:a[k]<b[k]?-1:0)*d),0));return this;},limit(n){rows=rows.slice(0,n);return this;},toArray:async()=>structuredClone(rows)};},findOne:async q=>structuredClone([...memory.values()].find(d=>matches(d,q))),bulkWrite:async ops=>{for(const op of ops){if(op.replaceOne)memory.set(op.replaceOne.replacement._id,structuredClone(op.replaceOne.replacement));else memory.delete(op.deleteOne.filter._id);}}};
const client={startSession:()=>({withTransaction:async fn=>fn(),endSession:async()=>{}})};
const store={client,collection,meta:{findOne:async()=>({...control}),insertOne:async v=>Object.assign(control,v),updateOne:async(q,u)=>{if(control.revision!==q.revision)return {matchedCount:0};control.revision+=u.$inc.revision;return {matchedCount:1};}},changes:{replaceOne:async()=>{}},cache:null};
try{
 const state=fixture();const shifts=state.sheets.find(s=>s.name===SHIFTS);shifts.rows.push(['2026-10-27|BOX1','2026-10-27','BOX1','admin',true,true,'v1','','admin',0]);
 // Unrelated history, audit and order assignment indices must survive scoped append.
 state.sheets.find(s=>s.name===ASSIGN).rows.push(['OF1026-02','OF1026-02','BOX2',true,'old-version','','other']);
 await store.collection.insertMany([...documents(state).values()]);await store.meta.insertOne({_id:'active',ready:true,revision:0,spreadsheetId:'test'});
 const run=(method,args,readOnly=false)=>runScoped(store,scopeLoader(store,method,args),s=>createRuntime(s).call(method,args),{readOnly});
 const args=[token,{from:'2026-10-27',to:'2026-10-27'}];let view=await readBoxesDay(store,'perfectBoxes49GetOverview',args);assert.equal(view.orders.length,1);
 const order=view.orders[0],input={date:'2026-10-27',items:[{orderId:order.id,station:'QUEUE',revision:order.allocationRevision49}],includeOverview104:true};const untouched=await store.collection.findOne({kind:'row',sheet:ASSIGN,index:1});
 const beforeRaw=await store.collection.find({}).toArray(),meta=await store.meta.findOne({_id:'active'}),before=snapshot(createRuntime(fromDocuments(meta,beforeRaw)),new Set(['2026-10-27']));
 const result=await run('perfectBoxes49Apply',[token,input]);assert.equal(result.success,true);assert.deepEqual(await store.collection.findOne({_id:untouched._id}),untouched);
 view=await readBoxesDay(store,'perfectBoxes49GetOverview',args);assert.equal(view.orders[0].station,'');assert.equal(view.orders[0].revenue,8000);
 const afterRaw=await store.collection.find({}).toArray(),afterState=fromDocuments(meta,afterRaw),after=snapshot(createRuntime(afterState),new Set(['2026-10-27']));assert.ok(diff(before,after).length>0);
 const full=createRuntime(afterState).call('perfectBoxes49GetOverview',args);assert.deepEqual(plain(view),plain(full));
 await assert.rejects(run('perfectBoxes49Apply',[token,input]),/mezitím změnila/);
 for(const page of ['dashboard','calendar','orders','customers','vehicles','services','detailing','boxes49','settings']){const r=await run('perfectWebBootstrap36',[token,{scope109:{page,offset:0}}],true);assert.equal(r.success,true,page);assert.equal(r.lazy109.page,page);if(page==='boxes49'){assert.equal(r.orders.length,0);assert.equal(r.customers.length,0);}}
 const status=await run('perfect101Status',[token],true);assert.equal(status.success,true);assert.equal(status.revision,String((await store.meta.findOne({_id:'active'})).revision));
 console.log('PASS: simulated storage — selected day, scoped append, untouched history, conflict, notification diff, 9 page scopes, auth status');
}finally{}
