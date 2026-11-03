import {createRuntime} from './runtime.mjs';
import {fromDocuments} from './store.mjs';
import {dayQuery,ORDERS,SHIFTS,ASSIGN,validateDay} from './boxes-read.mjs';
export const propertyMethods=new Set(['perfectAuthLoginFast36','perfectAuthGetStatus','perfectAuthLogout','perfect101Status','perfect109Widgets','perfect108AccessBootstrap']);
export const boxWrites=new Set(['perfectBoxes49Apply','perfectBoxes46SaveShift','perfectBoxesSaveShiftV25']);
export const readScopes=new Map([['perfectWebGetServicesAddons31',/Ceník|SLUZBY|CENIK|SERVICES/],['perfectWebGetWorkers',/a^/],['perfectAuthGetMyProfile',/MEDIA|PHOTO|FOTO/],['perfectV13MediaGetProfileBatch',/MEDIA|PHOTO|FOTO/],['perfectV13MediaGet',/MEDIA|PHOTO|FOTO/],['perfectLogo42GetMap',/LOGO/],['perfectDetail44List',/DETAIL|OBJEDNAVKY|ORDER_META|ZAKAZNICI|VOZIDLA|Ceník|SLUZBY/],['perfectDetail44Get',/DETAIL|OBJEDNAVKY|ORDER_META|ZAKAZNICI|VOZIDLA|Ceník|SLUZBY/],['perfectDetail44MediaGet',/DETAIL|OBJEDNAVKY|ORDER_META|MEDIA|PHOTO|FOTO/],['perfectProfile54GetStatistics',/OBJEDNAVKY|ORDER_META|SMEN|PRIRAZENI|ZAKAZNICI|VOZIDLA|EVENTS|LUNCH|BONUS/],['perfectProfile54GetRoster',/OBJEDNAVKY|ORDER_META|SMEN|PRIRAZENI|EVENTS|LUNCH|BONUS/],['perfect101Employees',/OBJEDNAVKY|ORDER_META|SMEN|PRIRAZENI|EVENTS|LUNCH|BONUS/],['perfectReports39Get',/OBJEDNAVKY|ORDER_META|SMEN|PRIRAZENI|EVENTS|LUNCH|BONUS|Ceník|SLUZBY/],['perfectUsers50Get',/AKTIVITY/]]);
export const tickMethods=new Set(['perfectControlTickAddons31']);
const CUSTOMERS='__PERFECT_DB_ZAKAZNICI',VEHICLES='__PERFECT_DB_VOZIDLA';
export async function baseRecords(store,session){return store.collection.find({$or:[{kind:{$in:['sheet','property','userProperty']}},{kind:'row',index:0},{kind:'row',sheet:ORDERS,index:1}]},{session}).toArray();}
export function scopeLoader(store,method,args){return async(session,meta)=>{
 const base=await baseRecords(store,session);
 if(propertyMethods.has(method))return base;
 const authReader=createRuntime(fromDocuments(meta,base));authReader.ctx.perfectRepairRequireUser_(args[0]);
 if(readScopes.has(method)){const selected=base.filter(d=>d.kind==='sheet'&&readScopes.get(method).test(d.name)).map(d=>d.name);const media=/Media|Logo|Avatar|MyProfile/.test(method);return [...base,...await store.collection.find({$or:[{kind:'row',sheet:{$in:selected},index:{$gte:1}},...(media?[{kind:{$in:['media','folder']}}]:[])]},{session}).toArray()];}
 if(tickMethods.has(method)){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),names=base.filter(d=>d.kind==='sheet'&&/Ceník|SLUZBY|CENIK|SERVICES|ORDER_META|STATUS_RUCNI/.test(d.name)).map(d=>d.name);return [...base,...await store.collection.find({$or:[dayQuery(ORDERS,today),{kind:'row',sheet:ORDERS,index:{$gte:2},'cells.17':{$in:['ČEKÁ SE','CEKA SE','Čeká se','ceka se']}},{kind:'row',sheet:{$in:names},index:{$gte:1}}]},{session}).toArray()];}
 if(boxWrites.has(method)){
  const day=validateDay(args[1]?.date),auth=createRuntime(fromDocuments(meta,base));auth.ctx.perfect43Require_(args[0],'shifts.manage');
  const orders=await store.collection.find(dayQuery(ORDERS,day),{session}).toArray(),ids=orders.map(r=>String(r.cells[0]));
  const other=await store.collection.find({$or:[dayQuery(SHIFTS,day),{kind:'row',sheet:ASSIGN,'cells.1':{$in:ids}}]},{session}).toArray();return [...base,...orders,...other];
 }
 const scope=args.at(-1)?.scope109,page=scope?.page||'dashboard';
 const auth=createRuntime(fromDocuments(meta,base));auth.ctx.perfectRepairRequireUser_(args[0]);
 const names=base.filter(d=>d.kind==='sheet').map(d=>d.name);
 const use=new Set();const addPattern=re=>names.filter(n=>re.test(n)).forEach(n=>use.add(n));
 const lists=['orders','customers','vehicles','payments','stats','editor'];
 if(lists.includes(page)||page==='dashboard'){[ORDERS,CUSTOMERS,VEHICLES,'__PERFECT_DB_ORDER_META'].forEach(n=>use.add(n));addPattern(/CUSTOMER_FLAG|NOSHOW|NO_SHOW|EVENTS102/);}
 if(page==='calendar'){addPattern(/EVENTS102|NOSHOW|NO_SHOW/);[CUSTOMERS,VEHICLES,'__PERFECT_DB_ORDER_META'].forEach(n=>use.add(n));}
 if(['orders','dashboard','calendar','editor','services','detailing'].includes(page))addPattern(/Ceník|SLUZBY|SERVICES|CENIK/);
 if(page==='detailing'){use.add(ORDERS);use.add(CUSTOMERS);use.add(VEHICLES);addPattern(/DETAIL|ORDER_META/);}
 if(page==='stats')addPattern(/SMENY|PRIRAZENI|BONUS|FINANCE|LUNCH|OBED/);
 const data=use.size?await store.collection.find({kind:'row',sheet:{$in:[...use]},index:{$gte:1}},{session}).toArray():[];
 if(page==='calendar'){let start=new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7)+(scope.offset||0)*7);const days=Array.from({length:7},(_,i)=>new Date(start.getTime()+i*86400000).toISOString().slice(0,10));data.push(...await store.collection.find({$or:days.map(d=>dayQuery(ORDERS,d))},{session}).toArray());}
 return [...base,...data];
};}
