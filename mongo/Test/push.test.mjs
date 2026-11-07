import {test} from 'node:test';import assert from 'node:assert/strict';
import {pushService} from '../push106.mjs';
function database(){const collections=new Map();return {collection(name){if(!collections.has(name))collections.set(name,new Map());const rows=collections.get(name),matches=(doc,q)=>Object.entries(q).every(([k,v])=>{const actual=k.split('.').reduce((o,p)=>o?.[p],doc);return v&&typeof v==='object'&&'$gt'in v?actual>v.$gt:actual===v;});return {createIndex:async()=>{},findOne:async q=>structuredClone([...rows.values()].find(d=>matches(d,q))),find(q){let list=[...rows.values()].filter(d=>matches(d,q));return {limit(n){list=list.slice(0,n);return this;},toArray:async()=>structuredClone(list)};},updateOne:async(q,u)=>{const old=rows.get(q._id);rows.set(q._id,{...(old||{_id:q._id,...u.$setOnInsert}),...u.$set});},replaceOne:async(q,v)=>rows.set(q._id,structuredClone(v)),deleteOne:async q=>{for(const [k,d] of rows)if(matches(d,q)){rows.delete(k);break;}}};}};}
test('Render subject, retained VAPID keys, subscription delivery, preferences and expired/invalid endpoints',async()=>{
 const db=database(),sent=[];let generated=0,subject;
 const transport={generateVAPIDKeys:()=>{generated++;return {publicKey:'public',privateKey:'private'};},setVapidDetails:s=>subject=s,sendNotification:async(s,p)=>sent.push({s,p:JSON.parse(p)})};
 const env={PUSH_ENABLED:'true',RENDER_EXTERNAL_URL:'https://perfect-test.onrender.com'};
 const service=await pushService(db,{env,transport});assert.equal(subject,env.RENDER_EXTERNAL_URL);
 await pushService(db,{env,transport});assert.equal(generated,1);
 const user={id:'worker'},subscription={endpoint:'https://fcm.googleapis.com/test',keys:{p256dh:Buffer.alloc(65).toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}};
 await service.subscribe(user,subscription);assert.deepEqual(await service.status(user),{enabled:true,subscriptions:1});
 assert.equal((await service.notify(user,{title:'Test',body:'Assignment',type:'assigned'})).sent,1);assert.equal(sent[0].p.body,'Assignment');
 await service.preferences(user,{assigned:false});assert.equal((await service.notify(user,{type:'assigned'})).disabled,true);assert.equal(sent.length,1);
 await service.preferences(user,{details:false});await service.notify(user);assert.equal(sent.at(-1).p.title,'PERFECT');
 transport.sendNotification=async()=>{throw Object.assign(Error('gone'),{statusCode:410});};await service.notify(user);assert.equal((await service.status(user)).subscriptions,0);
 await service.subscribe(user,subscription);transport.sendNotification=async()=>{throw Object.assign(Error('temporary'),{statusCode:503});};await assert.rejects(service.notify(user),/dočasně/);
 const disabled=await pushService(db,{env:{PUSH_ENABLED:'false'},transport});assert.equal(disabled.enabled,false);
});
