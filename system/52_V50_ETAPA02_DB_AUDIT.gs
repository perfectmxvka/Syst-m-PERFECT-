/** PERFECT V50 / ETAPA 02 — audit konzistence dat, pouze čtení. NOVÝ soubor.
 * Nepíše a nemaže žádné řádky. Nevolá Gmail import, nezasahuje do tržeb.
 */
var PERFECT_V50_DB_LIMIT_000102=12000;
function perfectV50DbAuditSheet000102_(ss,name,headers,headerRow,startRow,options){
 var sh=ss.getSheetByName(name),issues=[],result={name:name,exists:!!sh,rows:0,headersOk:false,
      truncated:false,issues:issues,sample:[],values:[],headerRow:headerRow,startRow:startRow};
 if(!sh){issues.push('Chybí list.');return result;}
 var actual=sh.getRange(headerRow,1,1,headers.length).getValues()[0].map(function(x){return String(x||'').trim();});
 var mismatch=headers.map(function(h,i){return actual[i]===h?null:{column:i+1,expected:h,found:actual[i]};}).filter(Boolean);
 result.headersOk=mismatch.length===0; if(mismatch.length)issues.push('Nesoulad hlaviček '+JSON.stringify(mismatch.slice(0,10)));
 var total=Math.max(0,sh.getLastRow()-startRow+1),max=Math.min(total,PERFECT_V50_DB_LIMIT_000102);
 result.rows=total;result.truncated=max!==total;
 if(result.truncated)issues.push('Audit omezen na prvních '+max+' z '+total+' řádků.');
 // Čtení po blocích bez změny listu. Omezení 25 tis. řádků proti timeoutu Apps Scriptu.
 for(var offset=0;offset<max;offset+=750){
  var n=Math.min(750,max-offset),batch=sh.getRange(startRow+offset,1,n,headers.length).getValues();
  Array.prototype.push.apply(result.values,batch);
 }
 return result;
}

function perfectV50DbNormalizeId000102_(v){return String(v===null||v===undefined?'':v).trim();}
function perfectV50DbFindDuplicates000102_(rows,index){
 var seen=Object.create(null),count=0,blank=0;
 rows.forEach(function(r){var id=perfectV50DbNormalizeId000102_(r[index]);if(!id){blank++;return;}
  if(seen[id])count++;else seen[id]=true;});
 return {duplicates:count,blanks:blank,ids:seen};
}
function perfectV50DbSheetSize000102_(ss,name){var sh=ss.getSheetByName(name);return {name:name,exists:!!sh,rows:sh?Math.max(0,sh.getLastRow()-1):0};}

function perfectV50DatabaseIntegrity000102_(){
 perfectV50AssertEditor000102_();
 var env=perfectV50Environment000102_();
 if(!env.success)throw Error('Nejdřív oprav připojení k databázi: '+env.errors.join(' '));
 var ss=perfectDatabaseGetSpreadsheet_();
 var specs=[
  {name:PERFECT_DB.SHEETS.CUSTOMERS,headers:PERFECT_DB_CUSTOMER_HEADERS,hr:1,start:2},
  {name:PERFECT_DB.SHEETS.VEHICLES,headers:PERFECT_DB_VEHICLE_HEADERS,hr:1,start:2},
  {name:PERFECT_DB.SHEETS.ORDERS,headers:PERFECT_DB_ORDER_HEADERS,hr:2,start:3}
 ];
 var tables=specs.map(function(s){return perfectV50DbAuditSheet000102_(ss,s.name,s.headers,s.hr,s.start);});
 var customers=tables[0],vehicles=tables[1],orders=tables[2],warnings=[],errors=[];
 tables.forEach(function(t){
  if(!t.exists||!t.headersOk)errors.push(t.name+': '+t.issues.join('; '));
  if(t.truncated)warnings.push(t.name+': nelze potvrdit celý rozsah nad '+PERFECT_V50_DB_LIMIT_000102+' řádků.');
 });
 var customerIds=perfectV50DbFindDuplicates000102_(customers.values,0),
     vehicleIds=perfectV50DbFindDuplicates000102_(vehicles.values,0),
     orderIds=perfectV50DbFindDuplicates000102_(orders.values,0),
     gmailIds=perfectV50DbFindDuplicates000102_(orders.values,19),
     requestIds=perfectV50DbFindDuplicates000102_(orders.values,23);
 var orphanVehicles=0,orphanOrdersCustomer=0,orphanOrdersVehicle=0,vehicleOwnerMismatch=0,
     missingOrderLinks=0,invalidPrices=0,negativePrices=0;
 var vehicleOwner=Object.create(null);
 vehicles.values.forEach(function(v){
  var id=perfectV50DbNormalizeId000102_(v[0]),owner=perfectV50DbNormalizeId000102_(v[1]);
  if(id)vehicleOwner[id]=owner;
  if(owner&&!customerIds.ids[owner])orphanVehicles++;
 });
 orders.values.forEach(function(o){
  var customer=perfectV50DbNormalizeId000102_(o[4]),vehicle=perfectV50DbNormalizeId000102_(o[9]),price=o[16];
  if(!customer||!vehicle)missingOrderLinks++;
  if(customer&&!customerIds.ids[customer])orphanOrdersCustomer++;
  if(vehicle&&!vehicleIds.ids[vehicle])orphanOrdersVehicle++;
  if(customer&&vehicle&&vehicleOwner[vehicle]&&vehicleOwner[vehicle]!==customer)vehicleOwnerMismatch++;
  if(price!==''&&price!==null&&price!==undefined){
   // Zamítneme záporné a nečíselné ceny, ale neměníme je ani nepřepočítáváme podle ceníku.
   var raw=String(price).replace(/\s|Kč/gi,'').replace(',','.'),money=Number(raw);
   if(!raw||!Number.isFinite(money))invalidPrices++;
   else if(money<0)negativePrices++;
  }
 });
 if(orderIds.duplicates)errors.push('Duplicitní ORDER_ID: '+orderIds.duplicates);
 if(customerIds.duplicates)errors.push('Duplicitní CUSTOMER_ID: '+customerIds.duplicates);
 if(vehicleIds.duplicates)errors.push('Duplicitní VEHICLE_ID: '+vehicleIds.duplicates);
 if(gmailIds.duplicates)errors.push('Duplicitní GMAIL_MESSAGE_ID: '+gmailIds.duplicates);
 if(requestIds.duplicates)errors.push('Duplicitní WEB_REQUEST_ID: '+requestIds.duplicates);
 if(invalidPrices||negativePrices)warnings.push('Neplatné/záporné částky: '+invalidPrices+'/'+negativePrices+'. Historické ceny se nemění.');
 if(orphanVehicles||orphanOrdersCustomer||orphanOrdersVehicle||vehicleOwnerMismatch||missingOrderLinks)
    warnings.push('Zjištěné historické nesoulady vazeb; data nebyla změněna.');
 var voucher={installed:false,events:0,historyOk:null,error:''};
 try{if(typeof databaseVoucher36State_==='function'){
   var s=databaseVoucher36State_();voucher={installed:!!s.installed,events:s.events.length,
     products:Object.keys(s.products).length,vouchers:Object.keys(s.vouchers).length,historyOk:true,error:''};
  }}catch(e){voucher.historyOk=false;voucher.error=String(e.message||e).slice(0,200);errors.push('Historie poukazů je nekonzistentní.');}
 var extra=['__PERFECT_DB_PRIRAZENI_BOXU','__PERFECT_DB_SMENY','__PERFECT_DB_BOX_UZAVERKY',
 '__PERFECT_DB_BOXY_AUDIT','__PERFECT_DB_ORDER_META','__PERFECT_DB_VOUCHER_EVENTS36',
 '__PERFECT_DB_DETAILING_ORDERS44','__PERFECT_DB_HISTORY','__PERFECT_DB_PLATBY'].map(function(name){return perfectV50DbSheetSize000102_(ss,name);});
 var report={success:errors.length===0,build:PERFECT_V50_AUDIT_000102,
      checkedDatabase:env.openedDatabase,testSeparated:env.testSeparated,environmentMode:env.mode,
      tables:tables.map(function(t){return {name:t.name,exists:t.exists,rows:t.rows,headersOk:t.headersOk,truncated:t.truncated,issues:t.issues};}),
      duplicateIds:{customer:customerIds.duplicates,vehicle:vehicleIds.duplicates,order:orderIds.duplicates,
       gmailMessage:gmailIds.duplicates,webRequest:requestIds.duplicates},
      missingIds:{customer:customerIds.blanks,vehicle:vehicleIds.blanks,order:orderIds.blanks},
      relationalIntegrity:{orphanVehicles:orphanVehicles,orphanOrdersCustomer:orphanOrdersCustomer,
       orphanOrdersVehicle:orphanOrdersVehicle,vehicleOwnerMismatch:vehicleOwnerMismatch,missingOrderLinks:missingOrderLinks},
      pricing:{invalidPrices:invalidPrices,negativePrices:negativePrices,historicPricesPreserved:true},
      voucher:voucher,extensions:extra,errors:errors,warnings:warnings,
      note:'Diagnostika je pouze pro čtení. Neshody historických záznamů mohou vyžadovat ruční posouzení.'};
 Logger.log(JSON.stringify(report,null,2));return report;
}

function perfectV50CompleteAudit000102_(){
 perfectV50AssertEditor000102_();
 var core=perfectV50CoreDiagnostics000102_(),database=perfectV50DatabaseIntegrity000102_(),triggers=perfectV50Triggers000102_();
 var result={success:core.success&&database.success&&triggers.gmailTriggers<=1,
   build:PERFECT_V50_AUDIT_000102,core:core,database:database,triggers:triggers,
   note:'Výstup neověřuje živou webovou aplikaci ani přihlašování různých rolí.'};
 Logger.log('PERFECT 00+01+02: '+JSON.stringify({success:result.success,build:result.build,
    coreSuccess:core.success,databaseSuccess:database.success,gmailTriggers:triggers.gmailTriggers},null,2));
 return result;
}
