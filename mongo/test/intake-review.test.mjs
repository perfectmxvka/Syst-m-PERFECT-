import {test} from 'node:test';import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {intakeFromOcr} from '../../pwa-cloudflare/public/intake110.mjs';
import {openIntakeReview} from '../../pwa-cloudflare/public/intake-review.mjs';

test('uncertain handwritten words are omitted even with confident printed labels',()=>{
 const data={text:'Jméno: j Preholiov\nTelefon: 776 681 115',blocks:[{paragraphs:[{lines:[{text:'Jméno: j Preholiov',words:[{confidence:99},{confidence:20},{confidence:43}]},{text:'Telefon: 776 681 115',words:[{confidence:99},{confidence:90},{confidence:88},{confidence:91}]}]}]}]};
 const r=intakeFromOcr(data);assert.equal(r.draft.JMENO_PRIJMENI,undefined);assert.equal(r.draft.TELEFON,'776681115');assert.equal(r.uncertain,true);
});
test('photo review permits correction after OCR failure and requires confirmation before continuing',async()=>{
 const dom=new JSDOM('<body></body>',{url:'http://localhost'}),w=dom.window;
 const oldWindow=globalThis.window,oldDocument=globalThis.document,oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
 globalThis.window=w;globalThis.document=w.document;let revoked=false;URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>{revoked=true;};
 w.HTMLImageElement.prototype.decode=async()=>{throw Error('Unreadable test image');};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 let draft;
 try{
  const dialog=openIntakeReview({}, {onReview:value=>draft=value});await new Promise(r=>setTimeout(r,0));
  assert.match(dialog.querySelector('[data-status]').textContent,/nepodařilo přečíst/);
  const form=dialog.querySelector('form');form.elements.JMENO_PRIJMENI.value='Jana Nováková';form.elements.TELEFON.value='776 681 115';form.elements.CAS_PRIJEZDU.value='13:00';
  form.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(draft,undefined);
  form.elements.confirmed.checked=true;form.dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal(draft.JMENO_PRIJMENI,'Jana Nováková');assert.equal(draft.TELEFON,'776681115');assert.equal(draft.CAS_PRIJEZDU,'13:00');assert.equal(dialog.isConnected,false);assert.equal(revoked,true);
 }finally{dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;}
});
