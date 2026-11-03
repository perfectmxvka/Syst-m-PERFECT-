import {createRuntime} from './runtime.mjs';
import {ENDPOINTS} from './endpoints.mjs';
const PUBLIC=new Set(['perfectAuthGetStatus','perfectAuthLogin','perfectAuthLoginFast36','perfectAuthLoginBootstrap37','perfectWebGetBrandAssets37','perfectAuthLogout']);
const LOGIN=new Set(['perfectAuthLogin','perfectAuthLoginFast36','perfectAuthLoginBootstrap37']);
export async function execute(store,method,args=[],options={}){
 if(!ENDPOINTS.includes(method)&&!options.internal)throw Error('Nepovolená operace.');
 if(!Array.isArray(args)||args.length>8)throw Error('Neplatné argumenty.');
 for(let attempt=0;attempt<3;attempt++){
  const {state,version}=await store.load(),blobs=new Map(),runtime=createRuntime(state,{...options,blobs});
  if(!PUBLIC.has(method)&&!options.internal)runtime.business.perfectRepairRequireUser_(args[0]);
  // Přístup k privátním souborům až po ověření relace a daného subjektu.
  const ids=new Set(),b=runtime.business,props=runtime.propsStore;
  if(method==='perfectV13MediaGet'||method==='perfectV13MediaGetProfileBatch'){
   b.perfect40Require_(args[0],'media.read');const p=args[1]||{},subjects=method.endsWith('Batch')?p.ids:[p.id];
   if(!Array.isArray(subjects)||subjects.length>10)throw Error('Neplatná dávka fotografií.');
   for(const id of subjects){b.perfectV13MediaValidate_(p.kind,id,'profile');b.perfect40Trusted_(()=>b.perfectV13MediaExists_(p.kind,id));for(const slot of method.endsWith('Batch')||p.kind==='customer'?['profile']:['profile','gallery1','gallery2','gallery3','gallery4','gallery5']){const f=props[b.perfectV13MediaKey_(p.kind,id,slot)];if(f)ids.add(f);}}
  }
  if(method==='perfectAuthGetMyProfile'||method==='perfectAdminUsersGetAvatar'){
   const viewer=b.perfectRepairRequireUser_(args[0]);if(method==='perfectAdminUsersGetAvatar'){b.perfect40Require_(args[0],'users.manage');const target=b.perfect40RawTarget_({id:args[1]});if(b.perfect40Super_(target)&&!b.perfect40Super_(viewer))return {data:''};}
   const user=method==='perfectAuthGetMyProfile'?viewer:JSON.parse(props.PERFECT_REPAIR_USERS||'[]').find(u=>String(u.id)===String(args[1]));if(user?.avatarFileId)ids.add(user.avatarFileId);
  }
  if(method==='perfectLogo42GetMap'){
   const keys=args[1];if(!Array.isArray(keys)||keys.length>100)throw Error('Neplatné značky.');const wanted=new Set(keys.map(b.perfectLogo25Key_));
   for(const f of state.drive?.files||[])if(!f.trashed&&wanted.has(b.perfectLogo25Key_(f.name)))ids.add(f.id);
  }
  await Promise.all([...ids].map(async id=>{if(!runtime.files.has(id))throw Error('V převodu chybí soubor '+id+'.');blobs.set(id,await store.getFile(id));}));
  const app=ids.size?createRuntime(state,{...options,blobs}):runtime;
  let result,error;
  try{result=options.internal&&app.business.perfect40Trusted_?app.business.perfect40Trusted_(()=>app.invoke(method,args)):app.invoke(method,args);}catch(e){error=e;}
  let next=app.exportState();if(error&&!LOGIN.has(method)){const audit=next.sheets.find(s=>s.name==='__PERFECT_DB_AKTIVITY_V40');next=structuredClone(state);if(audit){next.sheets=next.sheets.filter(s=>s.name!=='__PERFECT_DB_AKTIVITY_V40');next.sheets.push(audit);}}const changed=JSON.stringify(state)!==JSON.stringify(next),uploaded=[];
  try{
   for(const [id,blob]of (error?new Map():app.pendingFiles)){await store.putFile(id,new Uint8Array(blob.getBytes()),blob.getContentType());uploaded.push(id);}
   if(changed)await store.commit(version,next);
  }catch(e){
   // Při známém konfliktu transakce neproběhla a nové objekty lze uklidit.
   // Při neznámém výsledku sítě objekty ponecháme: mohou už být odkazované z potvrzeného stavu.
   if(e.conflict){try{await store.removeNewFiles(uploaded);}catch(_){}if(attempt<2)continue;}
   throw e;
  }
  if(error)throw error;
  return JSON.parse(JSON.stringify(result??null));
 }
 throw Error('Probíhá jiná změna. Obnov data a opakuj akci.');
}
export function createHandler({store,origins,cronSecret='',gmailFactory}){
 const allowed=new Set(origins);
 return async request=>{
  const origin=request.headers.get('origin')||'',headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname.endsWith('/health'))return json({ok:true,version:'PERFECT-MONGODB-1'});
  const cron=request.headers.get('x-perfect-cron');
  if(cronSecret&&cron===cronSecret&&request.method==='POST'&&!origin){
   try{const {job}=await request.json();if(!['timing','gmail'].includes(job))return json({error:'Neplatná úloha.'},400);
    const extra={internal:true};if(job==='gmail'){if(!gmailFactory)throw Error('Gmail není připojen.');extra.gmail=await gmailFactory(store);}
    const data=await execute(store,job==='timing'?'perfectAutoStatusRun':'gmailRunAutomaticImport',[],extra);return json({data});
   }catch(e){return json({error:e.message},400);}
  }
  if(!allowed.has(origin))return json({error:'Nepovolený původ požadavku.'},403);
  headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='content-type';headers['Access-Control-Allow-Methods']='POST, OPTIONS';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'Použij POST.'},405);
  try{
   const raw=await request.text();if(raw.length>3000000)return json({error:'Požadavek je příliš velký.'},413);
   const {method,args}=JSON.parse(raw);if(typeof method!=='string'||!ENDPOINTS.includes(method))return json({error:'Nepovolená operace.'},400);
   return json({data:await execute(store,method,args)});
  }catch(e){return json({error:e.message||'Operace nebyla potvrzena.'},400);}
 };
}
