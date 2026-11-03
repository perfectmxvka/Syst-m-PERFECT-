import {readFile} from 'node:fs/promises';
import {PostgresDatabase} from './postgres-db.mjs';

export async function openDatabase(env=process.env){
 const url=env.SUPABASE_DATABASE_URL||env.DATABASE_URL;
 if(url){
  const parsed=new URL(url);
  if(!['postgres:','postgresql:'].includes(parsed.protocol))throw Error('SUPABASE_DATABASE_URL musí být PostgreSQL connection string.');
  if(!parsed.hostname||!parsed.username||parsed.pathname.length<2)throw Error('PostgreSQL URI musí obsahovat hostitele, uživatele a databázi.');
  const local=['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
  if(env.PG_LOCAL_TEST==='true'&&!local)throw Error('PG_LOCAL_TEST je povolený pouze pro lokální testovací databázi.');
  const ca=env.SUPABASE_CA_CERT_PATH?await readFile(env.SUPABASE_CA_CERT_PATH,'utf8'):undefined;
  const {Pool}=await import('pg');
  // Parse connection fields explicitly: URI query parameters must never override
  // the target host or disable TLS / certificate verification.
  const pool=new Pool({host:parsed.hostname.replace(/^\[|\]$/g,''),port:Number(parsed.port||5432),user:decodeURIComponent(parsed.username),password:decodeURIComponent(parsed.password),database:decodeURIComponent(parsed.pathname.slice(1)),application_name:'perfect',max:5,connectionTimeoutMillis:15000,ssl:env.PG_LOCAL_TEST==='true'?false:{rejectUnauthorized:true,...(ca?{ca}:{})}});
  pool.on('error',error=>console.error('PostgreSQL idle connection error:',error.code||error.name));
  const db=new PostgresDatabase(pool);
  try{await db.connect();}catch(error){await db.close();throw error;}
  return {client:db,db,backend:'Supabase PostgreSQL'};
 }
 if(!env.MONGODB_URI||!env.MONGODB_DB)throw Error('Nastav SUPABASE_DATABASE_URL pro Supabase (nebo MONGODB_URI a MONGODB_DB pro původní databázi).');
 const {MongoClient}=await import('mongodb');
 const client=new MongoClient(env.MONGODB_URI,{maxPoolSize:5,serverSelectionTimeoutMS:10000});
 try{await client.connect();}catch(error){await client.close();throw error;}
 return {client,db:client.db(env.MONGODB_DB),backend:'MongoDB'};
}
