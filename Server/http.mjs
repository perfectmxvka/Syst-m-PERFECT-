import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {createHandler} from './application.mjs';
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png'};
export function createNodeServer({store,origins,cronSecret,gmailFactory,webRoot}){
 const handler=createHandler({store,origins,cronSecret,gmailFactory});const root=path.resolve(webRoot)+path.sep;
 return http.createServer(async(req,res)=>{try{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/api'||pathname==='/health'){
   let count=0;const chunks=[];for await(const chunk of req){count+=chunk.length;if(count>3000000){res.writeHead(413);res.end('{"error":"Požadavek je příliš velký."}');return;}chunks.push(chunk);}
   const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
   if(!headers.has('origin')&&headers.get('sec-fetch-site')==='same-origin')headers.set('origin',origins[0]);
   const request=new Request('https://perfect.local'+pathname,{method:req.method,headers,...(['POST','PUT','PATCH'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const wanted=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!wanted.startsWith(root)||path.basename(wanted).startsWith('.')){res.writeHead(404);res.end();return;}
  const data=await fs.readFile(wanted);res.writeHead(200,{'Content-Type':types[path.extname(wanted)]||'application/octet-stream','Cache-Control':path.extname(wanted)==='.png'?'public, max-age=86400':'no-cache','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Server nemohl dokončit požadavek. Zkontroluj připojení databáze.'}));}});
}
