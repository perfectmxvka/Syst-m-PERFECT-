/** One-time *new database only* empty installation; refuse existing databases. */
import {buildCleanState} from './seed-state.mjs';
import {documents} from './store.mjs';
const commit=process.argv.includes('--commit');
const databaseName=String(process.env.MONGODB_DB||'');
const username=String(process.env.CLEAN_ADMIN_USERNAME||'');
const password=String(process.env.CLEAN_ADMIN_PASSWORD||'');
if(!/^[A-Za-z0-9_-]{3,64}_clean$/.test(databaseName))throw Error('Bezpečnostní pojistka: název MONGODB_DB musí končit _clean, například customsis_clean.');
if(!process.env.MONGODB_URI)throw Error('Chybí MONGODB_URI.');
const state=buildCleanState({username,password});
const rows=[...documents(state).values()];
console.log(JSON.stringify({target:databaseName,mode:commit?'VYTVOŘENÍ':'POUZE KONTROLA',accounts:1,user:username,orders:0,customers:0,vehicles:0,files:0,rows:rows.length},null,2));
if(!commit){console.log('Nic nebylo změněno. Přidej --commit pro vytvoření v úplně NOVÉ databázi.');process.exit(0);}
const {MongoClient}=await import('mongodb');
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
await client.connect();
try{
 const db=client.db(databaseName);
 const existing=await db.listCollections({}, {nameOnly:true}).toArray();
 if(existing.length)throw Error('Databáze již obsahuje kolekce. ŽÁDNÁ DATA nebyla přepsána. Použij nový název s koncovkou _clean.');
 // Transaction protects against partial initialization on Atlas replica sets.
 const session=client.startSession();
 try{
  await session.withTransaction(async()=>{
   const records=db.collection('perfect103_records');const control=db.collection('perfect103_control');
   // Guard against concurrent initialization.
   if(await control.findOne({_id:'active'},{session}))throw Error('Inicializace již proběhla.');
   await control.insertOne({_id:'active',ready:false,spreadsheetId:state.spreadsheetId,revision:0,createdAt:new Date().toISOString(),kind:'clean'}, {session});
   await records.insertMany(rows,{session,ordered:true});
   await control.updateOne({_id:'active'},{$set:{ready:true}},{session});
  });
 }finally{await session.endSession();}
 console.log('Hotovo: prázdná databáze s jediným účtem '+username+'. Žádné původní záznamy nebyly přeneseny.');
}finally{await client.close();}
