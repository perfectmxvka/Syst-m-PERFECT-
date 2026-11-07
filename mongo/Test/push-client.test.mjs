import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';

test('existing device permission restores a server subscription and replaces an obsolete VAPID key',async()=>{
 const dom=new JSDOM('<body><div class="top-actions"></div></body>',{url:'https://perfect.example',runScripts:'outside-only'}),w=dom.window;
 let removed=0,created=0,permissionRequests=0;const requests=[];
 const subscription={options:{applicationServerKey:new Uint8Array([9,9]).buffer},unsubscribe:async()=>{removed++;},toJSON:()=>({endpoint:'https://fcm.googleapis.com/old'})};
 const registration={pushManager:{getSubscription:async()=>subscription,subscribe:async options=>{created++;assert.equal(options.userVisibleOnly,true);assert.deepEqual([...options.applicationServerKey],[1,2,3]);return {toJSON:()=>({endpoint:'https://fcm.googleapis.com/new',keys:{}})};}}};
 Object.defineProperty(w.navigator,'serviceWorker',{value:{register:async()=>registration,ready:Promise.resolve(registration)}});
 w.matchMedia=()=>({matches:false});w.Notification={permission:'granted',requestPermission:async()=>{permissionRequests++;return 'granted';}};
 w.PerfectStorage62={session:{getItem:()=> 'synthetic-session'}};
 w.fetch=async(path,options)=>{requests.push({path,body:options?.body?JSON.parse(options.body):null});return {ok:true,json:async()=>path==='/push-config'?{enabled:true,publicKey:'AQID'}:{success:true}};};
 try{
  const source=readFileSync(new URL('../../pwa-cloudflare/public/host.js',import.meta.url),'utf8');w.eval(source.slice(0,source.indexOf("addEventListener('DOMContentLoaded',()=>{const b=document.createElement('button');b.className='btn secondary';b.textContent='Kapacita zakázek'")));
  w.dispatchEvent(new w.Event('DOMContentLoaded'));
  for(let i=0;i<30&&!requests.some(r=>r.path==='/subscribe');i++)await new Promise(r=>setTimeout(r,10));
  assert.ok(requests.some(r=>r.path==='/subscribe'&&r.body.subscription.endpoint.endsWith('/new')));assert.ok(removed>=1);assert.ok(created>=1);assert.equal(permissionRequests,0);
 }finally{dom.window.close();}
});
