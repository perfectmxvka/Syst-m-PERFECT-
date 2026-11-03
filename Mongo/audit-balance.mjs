import {MongoClient} from 'mongodb';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {fromDocuments} from './store.mjs';
import {validateRelations} from './migration.mjs';
import {createRuntime} from './runtime.mjs';

export function auditBalance(state){
 const integrity=validateRelations(state),r=createRuntime(state);
 return r.ctx.perfect40Trusted_(()=>{
  const orders=r.ctx.databaseGetAllOrders(),vehicles=r.ctx.databaseGetAllVehicles(),links=new Map(),byId=new Map(orders.map(o=>[String(o.ORDER_ID),o]));
  for(const o of orders){const plate=r.ctx.databasePlateKey_(o.SPZ);if(!plate||!o.VEHICLE_ID)continue;if(!links.has(plate))links.set(plate,new Set());links.get(plate).add(String(o.VEHICLE_ID));}
  const duplicatePlateLinks=[...links].filter(([,ids])=>ids.size>1).map(([,ids])=>({vehicleIds:[...ids]}));
  const splitErrors=[],priceRebalances=[];
  for(const row of r.ctx.perfectBoxes29Rows_('order')){
   if(!row.ACTIVE||row.STATION!=='SHARED')continue;const o=byId.get(String(row.ORDER_ID));
   if(!o){splitErrors.push({orderId:String(row.ORDER_ID),reason:'Přiřazení nemá aktivní objednávku; může patřit do archivu.'});continue;}
   const split=r.ctx.perfectBoxes49ReadSplit_(row,o.CENA_CELKEM);
   if(!split.valid)splitErrors.push({orderId:String(o.ORDER_ID),reason:split.error});
   else if(Math.round(Number(row.BOX1_PRICE49)*100)+Math.round(Number(row.BOX2_PRICE49)*100)!==Math.round(Number(o.CENA_CELKEM)*100))priceRebalances.push({orderId:String(o.ORDER_ID),box1:split.box1,box2:split.box2});
  }
  return {success:true,build:'PERFECT-PATCH-1.04-BALANCE',readOnly:true,requiresReview:Boolean(duplicatePlateLinks.length||splitErrors.length||priceRebalances.length),integrity,accounts:JSON.parse(state.properties.PERFECT_REPAIR_USERS||'[]').length,media:state.drive.files.length,spz:{ordersWithPlate:orders.filter(o=>r.ctx.databasePlateKey_(o.SPZ)).length,vehiclesWithPlate:vehicles.filter(v=>v.SPZ).length,duplicatePlateLinks},boxes:{splitErrors,priceRebalances},note:'Kontrola nic nemění. Nedokáže sama prokázat, zda dřívější neuložená změna odpovídá záměru obsluhy.'};
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let client;
 try{
  if(!process.env.MONGODB_URI||!process.env.MONGODB_DB)throw Error('Nastav MONGODB_URI a MONGODB_DB v .env.');
  client=new MongoClient(process.env.MONGODB_URI,{maxPoolSize:1,serverSelectionTimeoutMS:10000});await client.connect();
  const db=client.db(process.env.MONGODB_DB),session=client.startSession();let snapshot;
  try{await session.withTransaction(async()=>{
   const meta=await db.collection('perfect103_control').findOne({_id:'active'},{session});if(!meta?.ready)throw Error('Databáze nemá potvrzený import.');
   const records=await db.collection('perfect103_records').find({},{session}).toArray();snapshot=fromDocuments(meta,records);
  },{readConcern:{level:'snapshot'},readPreference:'primary'});}finally{await session.endSession();}
  console.log(JSON.stringify(auditBalance(snapshot),null,2));
 }catch(e){console.error('Kontrola nebyla dokončena ('+e.name+'). Ověř připojení a oprávnění; při chybě dat spusť kontrolu s vývojářem.');process.exitCode=1;}
 finally{if(client)await client.close();}
}
