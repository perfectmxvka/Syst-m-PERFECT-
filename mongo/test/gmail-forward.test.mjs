import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import crypto from 'node:crypto';
import {verifyEnvelope} from '../ingest.mjs';
const source=readFileSync(new URL('../../system/69_MONGO_PREDAVANI_REZERVACI.gs',import.meta.url),'utf8');
function fixture(){
 const secret='test-secret-'.repeat(4),props={PERFECT103_MONGO_ORIGIN:'https://example.com',PERFECT103_SYNC_SECRET:secret},ack=[],delivered=new Set(),calls=[];
 let failure=false,partial=false;
 const rows=[{ORDER_ID:'N1026-1',GMAIL_MESSAGE_ID:'old'},{ORDER_ID:'N1026-2',GMAIL_MESSAGE_ID:'history'},{ORDER_ID:'N1126-1',GMAIL_MESSAGE_ID:'new'}];
 const sheet={getLastRow:()=>ack.length+1,getRange:()=>({getValues:()=>ack.map(x=>[x[0]]),setValues:v=>ack.push(...v)})};
 const ctx={Logger:{log(){}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},perfect40TrustedEditor_:()=>false,gmailCheckProduction52_(){},gmailStartDate103_:()=> '2026-10-25',perfect40Trusted_:fn=>fn(),databaseGetAllOrders:()=>rows,perfectRepairSerializable_:x=>x,SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet})},GmailApp:{getMessageById:id=>({getDate:()=>new Date(id==='old'?'2026-10-24T12:00:00Z':id==='history'?'2026-10-25T12:00:00Z':'2026-11-04T12:00:00Z')})},Utilities:{getUuid:()=>crypto.randomUUID(),computeHmacSha256Signature:(v,k)=>[...crypto.createHmac('sha256',k).update(v).digest()],formatDate:d=>d.toISOString().slice(0,10)},UrlFetchApp:{fetch:(url,opt)=>{
  const body=verifyEnvelope(JSON.parse(opt.payload),secret);calls.push(body.orders);
  const accepted=[],skipped=[];for(const o of body.orders){(delivered.has(o.GMAIL_MESSAGE_ID)?skipped:accepted).push(o.ORDER_ID);delivered.add(o.GMAIL_MESSAGE_ID);}
  return {getResponseCode:()=>failure?503:200,getContentText:()=>JSON.stringify({success:true,accepted:partial?[]:accepted,skipped})};
 }}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,ack,delivered,calls,rows,fail:v=>failure=v,partial:v=>partial=v};
}
test('timer without browser user forwards cutoff and new messages once',()=>{
 const f=fixture();assert.throws(()=>f.ctx.perfect103ForwardReservations(),/editoru/);
 const result=f.ctx.perfect103ForwardCron_();assert.equal(result.accepted,2);assert.equal(f.delivered.has('old'),false);assert.equal(result.remaining,0);
 f.ctx.perfect103ForwardCron_();assert.equal(f.calls.length,1);
 f.rows.push({ORDER_ID:'N1126-2',GMAIL_MESSAGE_ID:'later'});f.ctx.perfect103ForwardCron_();assert.equal(f.delivered.size,3);
});
test('lost response retries without acknowledgment or duplicate delivery',()=>{
 const f=fixture();f.fail(true);assert.throws(()=>f.ctx.perfect103ForwardCron_(),/HTTP 503/);assert.equal(f.ack.length,0);
 f.fail(false);assert.equal(f.ctx.perfect103ForwardCron_().alreadyPresent,2);assert.equal(f.delivered.size,2);
});
test('partial confirmation never advances acknowledgment',()=>{
 const f=fixture();f.partial(true);assert.throws(()=>f.ctx.perfect103ForwardCron_(),/všechny/);assert.equal(f.ack.length,0);
});
test('date configuration default and explicit cutoff',()=>{
 const src=readFileSync(new URL('../../system/02_GMAIL_IMPORT.gs',import.meta.url),'utf8');
 let day=null;const c={PropertiesService:{getScriptProperties:()=>({getProperty:()=>day})}};vm.createContext(c);vm.runInContext(src,c);
 assert.equal(c.gmailStartDate103_(),'2026-10-17');day='2026-10-25';assert.equal(c.gmailStartDate103_(),day);day='bad';assert.throws(()=>c.gmailStartDate103_());
});
