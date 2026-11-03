import {fileURLToPath} from 'node:url';import {createStore} from './store-factory.mjs';import {createNodeServer} from './http.mjs';import {prepareGmail} from './gmail.mjs';import {execute} from './application.mjs';
const port=Number(process.env.PORT||3000),origin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||'http://localhost:'+port;
const store=createStore();
await store.connect();
const gmail=()=>prepareGmail(store,{clientId:process.env.GMAIL_CLIENT_ID,clientSecret:process.env.GMAIL_CLIENT_SECRET,refreshToken:process.env.GMAIL_REFRESH_TOKEN});
const server=createNodeServer({store,origins:origin.split(',').map(s=>s.trim()),cronSecret:process.env.PERFECT_CRON_SECRET||'',gmailFactory:gmail,webRoot:fileURLToPath(new URL('../web/',import.meta.url))});
server.listen(port,'0.0.0.0',()=>console.log('PERFECT MongoDB server běží na portu',port));
let timingBusy=false,gmailBusy=false;
async function timing(){if(timingBusy)return;timingBusy=true;try{await execute(store,'perfectAutoStatusRun',[],{internal:true});}catch(e){if(!/Nejdřív importuj/.test(e.message))console.error('Časování:',e.message);}finally{timingBusy=false;}}
async function importMail(){if(gmailBusy||!process.env.GMAIL_REFRESH_TOKEN)return;gmailBusy=true;try{await execute(store,'gmailRunAutomaticImport',[],{internal:true,gmail:await gmail()});}catch(e){console.error('Gmail:',e.message);}finally{gmailBusy=false;}}
if(process.env.PERFECT_JOBS_ENABLED==='true'){setInterval(timing,60000).unref();setInterval(importMail,300000).unref();timing();}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await store.close();process.exit(0);}));
