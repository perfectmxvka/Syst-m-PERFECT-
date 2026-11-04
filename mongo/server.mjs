import {runScoped} from './scoped-store.mjs';
import {scopeLoader,propertyMethods,boxWrites,readScopes,tickMethods} from './scopes110.mjs';
import {readBoxesDay} from './boxes-read.mjs';
import {watched,snapshot,diff,enqueue,affectedDates} from './worker-events106.mjs';
import {scheduleBackups} from './backup106.mjs';
import {capacity} from './capacity106.mjs';
import {pushService} from './push106.mjs';
import {trace,observe} from './monitor.mjs';
import {gzipSync} from 'node:zlib';
import {sendNoShow} from './mail.mjs';
import {verifyEnvelope,ingest} from './ingest.mjs';import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import crypto from 'node:crypto';import {openDatabase} from './database.mjs';import {Store} from './store.mjs';import {createRuntime} from './performance107.mjs';import {media} from './media.mjs';import {ALLOWED_METHODS} from '../pwa-cloudflare/src/methods.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),origin=process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL||'http://localhost:8080';
if(process.env.NODE_ENV==='production'&&!/^https:\/\//.test(origin))throw Error('PUBLIC_ORIGIN musí být HTTPS.');
const {client,db,backend}=await openDatabase();const store=new Store(client,db);await store.initialize();const assets=media(),allowed=new Set([...ALLOWED_METHODS,'perfect103BonusSave','perfectCapacity106','perfect108AccessBootstrap']);
const push=await pushService(db);scheduleBackups(store);
let queue=Promise.resolve();function serialized(fn){const result=queue.then(fn);queue=result.catch(()=>{});return result;}
async function execute(method,args){const started=performance.now();try{if(method==='perfectBoxes49GetOverview'&&args[1]?.from===args[1]?.to){const result=await readBoxesDay(store,method,args,{origin,mediaUrl:assets.url});observe(method,performance.now()-started,true);return result;}const scoped=propertyMethods.has(method)||boxWrites.has(method)||readScopes.has(method)||tickMethods.has(method)||(['perfectWebBootstrap36','perfect101Snapshot'].includes(method)&&args.at(-1)?.scope109);const run=operation=>scoped?runScoped(store,scopeLoader(store,method,args),operation,{readOnly:readScopes.has(method)||['perfect101Status','perfect108AccessBootstrap','perfectWebBootstrap36','perfect101Snapshot'].includes(method)}):store.run(operation,{trace});const value=await serialized(()=>run(async state=>{const original=structuredClone(state),runtime=createRuntime(state,{origin,mediaUrl:assets.url});let result,before,dates;try{if(push.enabled&&watched(method)){dates=affectedDates(runtime,args);before=snapshot(runtime,dates);}result=method==='perfectCapacity106'?capacity(runtime.call('perfectWebBootstrap36',[args[0]]).orders||[],args[1]):runtime.call(method,args);}catch(e){ // Failed business writes roll back. Preserve failed-login throttling only.
 state.sheets=original.sheets;state.drive=original.drive;state.userProperties=original.userProperties;const failed=Object.fromEntries(Object.entries(state.properties).filter(([k])=>/FAILURE|FAIL_/.test(k)));state.properties=original.properties;if(/^perfectAuthLogin/.test(method))Object.assign(state.properties,failed);return {__error:String(e.message||e)};}
 if(before){try{enqueue(state,diff(before,snapshot(runtime,dates)));}catch(e){throw Error('Příprava oznámení selhala; změna nebyla uložena.');}}
 if(push.enabled&&result?.success!==false&&!result?.replayed&&['perfect103BonusSave','perfect101LunchSave'].includes(method)&&result?.record){const r=result.record;enqueue(state,[{userId:r.userId,type:'earnings',title:method==='perfect103BonusSave'?'Měsíční bonusy a srážky':'Úprava srážky za obědy',body:method==='perfect103BonusSave'?`${r.month} · zdravotní příspěvek ${r.healthCents/100} Kč · ostatní bonus ${r.otherCents/100} Kč · srážky ${r.fineCents/100} Kč`:`${r.month} · ${r.cancelled?'Zrušeno':'Srážka'} ${r.amountCents/100} Kč`,url:'/#perfect-month='+r.month,created:Date.now()}]);}
 if(push.enabled&&result?.success!==false&&!result?.replayed&&['perfect102WeeklySave','perfect102AdvanceSave'].includes(method)&&result?.record){const rec=result.record;enqueue(state,[{userId:rec.userId,type:'earnings',title:method==='perfect102AdvanceSave'?'Změna zálohy':'Změna srážky za obědy',body:rec.month+' · '+(method==='perfect102AdvanceSave'?(rec.cancelled?'Storno ':'Záloha ')+(rec.amountCents/100)+' Kč':'Srážka '+((rec.weeks||[]).reduce((n,w)=>n+w.amountCents,0)/100)+' Kč'),url:'/#perfect-month='+rec.month,created:Date.now()}]);}
 for(const pending of runtime.pendingFiles)await assets.upload(pending.meta,pending.bytes);
 return result;}));observe(method,performance.now()-started,!value?.__error&&value?.success!==false);return value;}catch(e){observe(method,performance.now()-started,false);throw e;}}
let delivering106=false;
async function deliver106(){if(!push.enabled||delivering106)return;delivering106=true;try{
 // An empty outbox must not queue a full workbook transaction every ten seconds.
 const pending=await store.collection.find({kind:'property',name:{$regex:'^P106_EVENT_'}}).limit(20).toArray();if(!pending.length)return;
 const batch=await serialized(()=>store.run(state=>{const users=createRuntime(state).ctx.perfectRepairUsers_();return pending.filter(p=>state.properties[p.name]===p.value).map(p=>{const event=JSON.parse(p.value),user=users.find(u=>String(u.id)===String(event.userId)&&u.active!==false);return {key:p.name,value:p.value,event,user:user?{id:user.id}:null};});}));
 const done=[];for(const job of batch){try{if(job.user&&Date.now()-job.event.created<86400000)await push.notify(job.user,job.event);done.push(job);}catch(e){console.error('perfect108.push retry',e.name);}}
 if(done.length)await serialized(()=>store.run(state=>{for(const job of done)if(state.properties[job.key]===job.value)delete state.properties[job.key];}));
 }catch(e){console.error('perfect108.worker_push',e.name);}finally{delivering106=false;}}

setInterval(deliver106,10000).unref();
const publicFiles=new Map(['host.js','sw.js','manifest.webmanifest','favicon.ico','icon-192.png','icon-512.png','apple-touch-icon.png'].map(n=>['/'+n,path.join(root,'../pwa-cloudflare/public',n)]));
for(const name of ['intake110.mjs','intake-review.mjs'])publicFiles.set('/'+name,path.join(root,'../pwa-cloudflare/public',name));
for(const name of fs.readdirSync(path.join(root,'../pwa-cloudflare/public/ocr')))publicFiles.set('/ocr/'+name,path.join(root,'../pwa-cloudflare/public/ocr',name));
const html=fs.readFileSync(path.join(root,'../system/Index.html'),'utf8').replace('<head>','<head><script src="/host.js"></script><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple-touch-icon.png">');
const rates=new Map();function rate(ip,limit=120){const now=Date.now();let r=rates.get(ip);if(!r||r.until<now){r={until:now+60000,count:0};rates.set(ip,r);}if(rates.size>10000)for(const [k,v]of rates)if(v.until<now)rates.delete(k);return ++r.count<=limit;}
const send=(res,status,value)=>{const body=Buffer.from(JSON.stringify(value)),zip=res.perfectGzip&&body.length>2048;res.writeHead(status,{'content-type':'application/json; charset=utf-8',...(zip?{'content-encoding':'gzip','vary':'Accept-Encoding'}:{})});res.end(zip?gzipSync(body):body);};
const htmlGzip=gzipSync(html);
const server=http.createServer(async(req,res)=>{res.perfectGzip=/\bgzip\b/.test(req.headers['accept-encoding']||'');res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');res.setHeader('x-frame-options','DENY');res.setHeader('referrer-policy','same-origin');res.setHeader('x-robots-tag','noindex, nofollow');const pathname=new URL(req.url,origin).pathname;try{
 if(req.method==='GET'&&pathname==='/healthz')return send(res,200,{ok:true,build:'PERFECT-SUPABASE-2026-11-04-114'});
 if(req.method==='GET'&&pathname==='/push-config')return send(res,200,{enabled:push.enabled,publicKey:push.publicKey,reason:push.reason});
 if(req.method==='GET'&&(pathname==='/'||pathname==='/index.html')){res.setHeader('content-type','text/html; charset=utf-8');if(res.perfectGzip){res.setHeader('content-encoding','gzip');res.setHeader('vary','Accept-Encoding');}return res.end(res.perfectGzip?htmlGzip:html);}
 if(req.method==='GET'&&publicFiles.has(pathname)){const ext=path.extname(pathname);res.writeHead(200,{'content-type':{'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.gz':'application/octet-stream','.txt':'text/plain','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'}[ext]});return fs.createReadStream(publicFiles.get(pathname)).pipe(res);}
 if(req.method==='POST'&&pathname==='/ingest/reservations'){
 let body='',size=0;for await(const part of req){size+=part.length;if(size>600000)return send(res,413,{success:false,message:'Dávka je příliš velká.'});body+=part;}
 let envelope,data;try{envelope=JSON.parse(body);data=verifyEnvelope(envelope,process.env.PERFECT103_SYNC_SECRET);}catch{return send(res,403,{success:false,message:'Předání nebylo ověřeno.'});}
 const result=await serialized(()=>store.run(state=>{const key='PERFECT103_NONCE_'+envelope.nonce;if(state.properties[key])throw Error('Zpráva už byla přijata.');for(const k of Object.keys(state.properties))if(k.startsWith('PERFECT103_NONCE_')&&Number(state.properties[k])<Date.now()-300000)delete state.properties[k];const result=ingest(state,data);state.properties[key]=String(Date.now());return result;}));if(push.enabled&&result.accepted?.length){serialized(()=>store.run(state=>createRuntime(state).ctx.perfectRepairUsers_().filter(u=>u.active!==false&&u.role==='ADMINISTRATOR').map(u=>({id:u.id})))).then(async users=>{for(const u of users)await push.notify(u);}).catch(()=>console.error('perfect106.push event failed'));}return send(res,200,result);
 }
 if(req.method==='POST'&&['/subscribe','/unsubscribe','/push-test','/push-preferences','/push-status'].includes(pathname)){
 if(!push.enabled)return send(res,503,{success:false,message:'Push není nastaven.'});
 if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{success:false});
 if(!rate(req.socket.remoteAddress,30))return send(res,429,{success:false});
 let raw='',size=0;for await(const part of req){size+=part.length;if(size>10000)return send(res,413,{success:false});raw+=part;}
 const p=JSON.parse(raw);let user;try{user=await serialized(()=>store.run(state=>createRuntime(state).ctx.perfectRepairRequireUser_(p.token)));}catch{return send(res,401,{success:false,message:'Přihlas se znovu.'});}
 if(pathname==='/push-status')return send(res,200,{success:true,...await push.status(user)});
 if(pathname==='/push-preferences')return send(res,200,{success:true,preferences:await push.preferences(user,p.preferences)});
 if(pathname==='/subscribe')await push.subscribe(user,p.subscription);
 if(pathname==='/unsubscribe')await push.unsubscribe(user,String(p.endpoint));
 if(pathname==='/push-test'){const delivery=await push.notify(user);return send(res,200,{success:delivery.sent>0,message:delivery.sent>0?'Push služba přijala test. Ověř zobrazení na zařízení.':'Není aktivní odběr nebo máš oznámení vypnutá. Nejprve zvol Zapnout na tomto zařízení.',delivery});}
 return send(res,200,{success:true,message:'Požadavek zpracován; doručení ověř na zařízení.'});
 }
 if(req.method!=='POST'||pathname!=='/api')return send(res,404,{success:false,message:'Nenalezeno.'});
 if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{success:false,message:'Nepovolený původ požadavku.'});
 const ip=req.socket.remoteAddress||'unknown';if(!rate(ip))return send(res,429,{success:false,message:'Příliš mnoho požadavků. Zkus to za minutu.'});
 let body='',bytes=0;for await(const part of req){bytes+=part.length;if(bytes>3200000){send(res,413,{success:false,message:'Požadavek je příliš velký.'});return;}body+=part;}
 const {method,args}=JSON.parse(body);if(!allowed.has(method)||!Array.isArray(args)||args.length>12)return send(res,400,{success:false,message:'Nepovolená operace.'});
 const result=await execute(method,args);if(result?.__error)return send(res,400,{success:false,message:result.__error});send(res,200,result);
 }catch(e){console.error('Request failed:',e.code||e.name);send(res,500,{success:false,message:'Operace nebyla potvrzena. Obnov přehled a zkontroluj výsledek.'});}});
let mailBusy=false;async function mailTick(){if(mailBusy||!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)return;mailBusy=true;try{const job=await serialized(()=>store.run(state=>{const r=createRuntime(state);return r.ctx.perfect40Trusted_(()=>r.ctx.perfect103NoShowClaim_());}));if(job){let result;try{result=await sendNoShow(job,{apiKey:process.env.RESEND_API_KEY,from:process.env.MAIL_FROM});}catch{result={ok:false,id:'Nejasná odpověď'};}await serialized(()=>store.run(state=>{const r=createRuntime(state);return r.ctx.perfect40Trusted_(()=>r.ctx.perfect103NoShowFinish_(job.key,result.ok,result.id));}));}}catch(e){console.error('No-show mail worker:',e.name);}finally{mailBusy=false;}}
const mailTimer=setInterval(mailTick,60000);mailTimer.unref();
server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('PERFECT 1.06 host ready ('+backend+')'));
process.on('SIGTERM',()=>server.close(async()=>{await queue;await client.close();process.exit(0);}));
