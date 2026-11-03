import {readFile} from 'node:fs/promises';
import {rootCertificates} from 'node:tls';

export async function databaseTls(hostname,env={}){
 const local=['localhost','127.0.0.1','[::1]'].includes(hostname);
 if(env.PG_LOCAL_TEST==='true'){
  if(!local)throw Error('PG_LOCAL_TEST je povolený pouze pro lokální testovací databázi.');
  return false;
 }
 // Supabase's private root is not in Node's public trust store. Keep the exact
 // public certificate downloaded from the project's SSL settings in source.
 // Render's manually pasted copy is no longer used for hosted Supabase.
 const supabase=hostname.endsWith('.supabase.com')||hostname.endsWith('.supabase.co');
 const path=supabase?new URL('./certs/supabase-root-2021.crt',import.meta.url):env.SUPABASE_CA_CERT_PATH;
 const ca=path?await readFile(path,'utf8'):undefined;
 return {rejectUnauthorized:true,...(ca?{ca:[...rootCertificates,ca]}:{})};
}
