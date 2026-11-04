import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {fixture,token} from './fixture110.mjs';
import {createRuntime} from '../performance107.mjs';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<80;i++){if(check())return;await wait(25);}assert.ok(check(),'Timed out waiting for UI');}

test('real application opens editable customer and vehicle cards without recursion; both camera buttons request capture immediately',async()=>{
 const state=fixture();
 for(const [name,row] of [['__PERFECT_DB_ZAKAZNICI',{CUSTOMER_ID:'c1',JMENO_PRIJMENI:'Test Customer'}],['__PERFECT_DB_VOZIDLA',{VEHICLE_ID:'v1',CUSTOMER_ID:'c1',VOZIDLO:'Skoda Fabia'}]]){const sh=state.sheets.find(x=>x.name===name);sh.rows.push(sh.rows[0].map(h=>row[h]??''));}
 const orders=state.sheets.find(x=>x.name==='__PERFECT_DB_OBJEDNAVKY');
 const h=orders.rows[1],r=orders.rows[2];for(const [k,v] of Object.entries({TELEFON:'777123456',VOZIDLO:'Skoda Fabia',MYCI_PROGRAM:'Comfort',JMENO_PRIJMENI:'Test',CENOVE_POLOZKY:'{"legacy":"imported"}'}))r[h.indexOf(k)]=v;
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...args)=>errors.push(args.map(String).join(' ')));
 const dom=new JSDOM(readFileSync(new URL('../../system/Index.html',import.meta.url),'utf8'),{url:'http://localhost',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.structuredClone=structuredClone;w.alert=v=>errors.push('ALERT '+v);w.fetch=async()=>({json:async()=>({enabled:false})});w.CSS={escape:s=>s};w.sessionStorage.setItem('perfectAuthToken',token);
  const runner=(ok=()=>{},fail=()=>{})=>new Proxy({},{get(_,name){if(name==='withSuccessHandler')return fn=>runner(fn,fail);if(name==='withFailureHandler')return fn=>runner(ok,fn);return (...args)=>{try{const r=createRuntime(state).call(name,args);w.setTimeout(()=>ok(JSON.parse(JSON.stringify(r))),0);}catch(e){w.setTimeout(()=>fail(e),0);}};}});
  w.google={script:{run:runner()}};
 }});
 try{
  const w=dom.window,d=w.document;
  await until(()=>d.getElementById('authGate').style.display==='none');
  for(const [fn,id,title] of [['perfectOpenCustomer','c1','Karta zákazníka'],['perfectOpenVehicle','v1','Detail vozu']]){
   w[fn](id);await until(()=>d.querySelector('.pd-modal'));
   assert.equal(d.querySelectorAll('.pd-modal').length,1);assert.match(d.querySelector('.pd-modal').textContent,new RegExp(title));
   d.querySelector('[data-v10-toggle]').click();assert.equal(d.querySelector('[data-v10-form]').hidden,false);
   d.querySelector('.pd-modal .close').click();assert.equal(d.querySelectorAll('.pd-modal').length,0);
  }
  w.perfectOpenOrder114('OF1026-01');await until(()=>d.querySelector('.edit-order'));d.querySelector('.edit-order').click();await until(()=>d.querySelector('#orderForm [type=submit]')?.disabled===false);
  const form=d.querySelector('#orderForm');form.elements.POZNAMKY.value='Edited in UI';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>!d.querySelector('#orderOverlay')||d.querySelector('#orderMessage')?.textContent.includes('nezdařilo'));
  assert.equal(d.querySelector('#orderMessage')?.textContent,undefined);
  assert.equal(orders.rows[2][h.indexOf('POZNAMKY')],'Edited in UI');assert.equal(orders.rows[2][h.indexOf('CENOVE_POLOZKY')],'{"legacy":"imported"}');assert.equal(orders.rows[2][h.indexOf('CENA_CELKEM')],8000);
  w.perfectOpenMyProfile();d.querySelector('.perfect-profile-dialog [data-pp-tab=roster]').click();await until(()=>d.querySelector('[data-own-day114]'));d.querySelector('[data-own-day114]').click();await until(()=>d.querySelector('#perfectOwnDay114 [data-day-content]')?.textContent.includes('Zakázky mé směny'));d.querySelector('#perfectOwnDay114 .close').click();d.querySelector('.perfect-profile-dialog').closest('.overlay').remove();
  let captures=0;const original=w.HTMLInputElement.prototype.click;
  w.HTMLInputElement.prototype.click=function(){if(this.type==='file'){captures++;assert.equal(this.getAttribute('capture'),'environment');assert.equal(this.isConnected,true);assert.equal(d.querySelectorAll('dialog').length,0);}else original.call(this);};
  d.querySelector('button[onclick="window.perfectScan110()"]').click();assert.equal(captures,1);
  d.querySelector('#perfect109Dock [data-action="2"]').click();assert.equal(captures,2);
  assert.equal(d.querySelectorAll('#perfectCameraInput113').length,1);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
