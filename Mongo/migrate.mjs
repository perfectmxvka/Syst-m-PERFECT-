import fs from 'node:fs';import path from 'node:path';import {isDeepStrictEqual} from 'node:util';import {validateExport} from './migration.mjs';import {documents} from './store.mjs';
// Export is JSON. Normalize optional undefined media fields BEFORE BSON writes.
// Raw Cloudinary assets (for example ZIP) need not have a format property.
function importDocumentV2(doc){return JSON.parse(JSON.stringify(doc));}
function verifyImportV2(written,expected){
 if(written.length!==expected.size)throw Error('Počet záznamů po importu nesouhlasí. Databáze zůstává neaktivní.');
 const seen=new Set();
 for(const doc of written){
  if(seen.has(doc._id)||!expected.has(doc._id)||!isDeepStrictEqual(doc,expected.get(doc._id)))throw Error('Kontrola záznamu selhala: '+doc._id);
  seen.add(doc._id);
 }
}
const folder=process.argv[2],commit=process.argv.includes('--commit');if(!folder)throw Error('Použití: npm run import -- /cesta/k/exportu [--commit]');
const {state,report}=validateExport(folder);console.log(JSON.stringify({validation:'OK',...report},null,2));
if(!commit){console.log('Kontrola dokončena. Nic nebylo zapsáno. Pro import přidej --commit.');process.exit(0);}
if(!process.env.MONGODB_URI||!process.env.MONGODB_DB)throw Error('Chybí MONGODB_URI / MONGODB_DB.');
const {MongoClient}=await import('mongodb'),{media}=await import('./media.mjs'),client=new MongoClient(process.env.MONGODB_URI);await client.connect();
try{const db=client.db(process.env.MONGODB_DB),records=db.collection('perfect103_records'),control=db.collection('perfect103_control');
 const collections=await db.listCollections({}, {nameOnly:true}).toArray(),allowed=new Set(['perfect103_records','perfect103_control','perfect103_import_media']);
 if(collections.some(c=>!allowed.has(c.name)))throw Error('Databáze obsahuje jiná data. Použij NOVOU databázi perfect103_staging.');
 let job=await control.findOne({_id:'active'});if(job?.ready)throw Error('Databáze je již aktivní. Import ji nesmí přepsat.');if(job&&job.sourceHash!==report.sourceHash)throw Error('Rozpracovaný import je z jiného exportu. Použij jinou prázdnou databázi.');
 if(!job){if(await records.countDocuments({}))throw Error('Databáze není prázdná.');await control.insertOne({_id:'active',ready:false,sourceHash:report.sourceHash,spreadsheetId:state.spreadsheetId,revision:0});}
 const assets=media(),checkpoint=db.collection('perfect103_import_media');for(const m of state.drive?.files||[]){const old=await checkpoint.findOne({_id:m.id});if(old?.cloud)m.cloud=old.cloud;else{await assets.upload(m,fs.readFileSync(path.join(folder,m.id+'.bin')));await checkpoint.updateOne({_id:m.id},{$set:{cloud:m.cloud}},{upsert:true});}}
 const docs=[...documents(state).values()].map(importDocumentV2);for(let i=0;i<docs.length;i+=200)await records.bulkWrite(docs.slice(i,i+200).map(d=>({replaceOne:{filter:{_id:d._id},replacement:d,upsert:true}})));
 const written=await records.find({}).toArray(),expected=new Map(docs.map(d=>[d._id,d]));verifyImportV2(written,expected);
 await records.createIndex({kind:1,sheet:1,index:1});await control.updateOne({_id:'active',ready:false},{$set:{ready:true,verifiedReport:report,importedAt:new Date().toISOString()}});console.log('Import a úplné porovnání záznamů dokončeny. Účty i OF objednávky zachovány.');
}finally{await client.close();}
