export function createBusiness(services){
const {Date,console,Utilities,PropertiesService,SpreadsheetApp,LockService,CacheService,Session,Logger,DriveApp,ScriptApp,HtmlService,GmailApp}=services;
// 01_CENTRALNI_DATABAZE.gs.txt
/** PERFECT central database: compatibility with web, Gmail and intake sheet. */
const PERFECT_DB_ORDER_HEADER_ROW=2;
const PERFECT_DB_ORDER_DATA_START_ROW=3;
const PERFECT_DB=Object.freeze({SHEETS:{CUSTOMERS:'__PERFECT_DB_ZAKAZNICI',ORDERS:'__PERFECT_DB_OBJEDNAVKY',VEHICLES:'__PERFECT_DB_VOZIDLA'}});
const PERFECT_DB_CUSTOMER_HEADERS=Object.freeze(['CUSTOMER_ID','JMENO_PRIJMENI','EMAIL','TELEFON','DATUM_VYTVORENI','POSLEDNI_AKTUALIZACE']);
const PERFECT_DB_VEHICLE_HEADERS=Object.freeze(['VEHICLE_ID','CUSTOMER_ID','VOZIDLO','DATUM_VYTVORENI','POSLEDNI_AKTUALIZACE']);
const PERFECT_DB_ORDER_HEADERS=Object.freeze(['ORDER_ID','DATUM_OBJEDNANI','CAS_PRIJEZDU','CAS_ODJEZDU','CUSTOMER_ID','FIRMA','JMENO_PRIJMENI','EMAIL','TELEFON','VEHICLE_ID','VOZIDLO','SPZ','DARKOVY_POUKAZ','MYCI_PROGRAM','DOPLNKY','POZNAMKY','CENA_CELKEM','STAV_OBJEDNAVKY','PRACOVNIK','GMAIL_MESSAGE_ID','CENA_PROGRAMU','ZNECISTENI_20','CENOVE_POLOZKY','WEB_REQUEST_ID']);
const PERFECT_DB_ORDER_STATUSES=Object.freeze(['ČEKÁ SE','DOKONČENO','NEDORAZIL','ZRUŠENO']);
var perfectDatabaseLockDepth_=0;
var perfectDatabaseHandle36_=null;
function perfectDatabaseGetSpreadsheet_(){
 const props=PropertiesService.getScriptProperties(),id=props.getProperty('PERFECT_REPAIR_SPREADSHEET_ID');
 if(props.getProperty('PERFECT41_TEST_MODE')==='ON'){var testId=props.getProperty('PERFECT41_TEST_DATABASE_ID'),productionId=props.getProperty('PERFECT41_PRODUCTION_DATABASE_ID');if(!testId||!productionId||testId===productionId||id!==testId)throw Error('Testovací režim není oddělený od ostré databáze. Operace byla zablokována.');}
 if(perfectDatabaseHandle36_&&perfectDatabaseHandle36_.id===id)return perfectDatabaseHandle36_.ss;
 const ss=id?SpreadsheetApp.openById(id):SpreadsheetApp.getActiveSpreadsheet();
 if(!ss)throw new Error('Databáze není připojená. Spusť perfectRepairPrepare_ z editoru otevřeného z tabulky.');perfectDatabaseHandle36_={id:id,ss:ss};return ss;
}
function perfectDatabaseWithLock_(name,callback){
 if(perfectDatabaseLockDepth_)return callback();
 const lock=LockService.getScriptLock();lock.waitLock(30000);perfectDatabaseLockDepth_++;
 try{return callback();}catch(e){throw new Error('['+name+'] '+e.message);}finally{perfectDatabaseLockDepth_--;lock.releaseLock();}
}
function perfect40Original_databaseInitialize_(){
 const ss=perfectDatabaseGetSpreadsheet_();
 [[PERFECT_DB.SHEETS.CUSTOMERS,PERFECT_DB_CUSTOMER_HEADERS],[PERFECT_DB.SHEETS.VEHICLES,PERFECT_DB_VEHICLE_HEADERS],[PERFECT_DB.SHEETS.ORDERS,PERFECT_DB_ORDER_HEADERS]].forEach(([name,h])=>databaseEnsureSheet_(ss,name,h));return true;
}
function databaseEnsureSheet_(ss,name,headers){
 let sh=ss.getSheetByName(name);const r=name===PERFECT_DB.SHEETS.ORDERS?2:1;
 if(!sh){sh=ss.insertSheet(name);if(sh.getMaxColumns()<headers.length)sh.insertColumnsAfter(sh.getMaxColumns(),headers.length-sh.getMaxColumns());sh.getRange(r,1,1,headers.length).setValues([Array.from(headers)]);}
 else{const actual=sh.getRange(r,1,1,headers.length).getValues()[0];if(headers.some((v,i)=>String(actual[i]).trim()!==v))throw new Error('Jiné hlavičky v '+name+'. Nic nebylo přepsáno.');}
 databaseApplyBasicFormatting_(sh,headers);return sh;
}
function databaseApplyBasicFormatting_(sh,headers){const r=sh.getName()===PERFECT_DB.SHEETS.ORDERS?2:1;sh.getRange(r,1,1,headers.length).setFontWeight('bold');sh.setFrozenRows(r);}
function databaseGetSheet_(name){const sh=perfectDatabaseGetSpreadsheet_().getSheetByName(name);if(!sh)throw new Error('Chybí list '+name);return sh;}
function databaseGetCustomersSheet_(){return databaseGetSheet_(PERFECT_DB.SHEETS.CUSTOMERS);}
function databaseGetVehiclesSheet_(){return databaseGetSheet_(PERFECT_DB.SHEETS.VEHICLES);}
function databaseGetOrdersSheet_(){return databaseGetSheet_(PERFECT_DB.SHEETS.ORDERS);}
function databaseRows_(sh,start,headers){if(sh.getLastRow()<start)return [];return sh.getRange(start,1,sh.getLastRow()-start+1,headers.length).getValues().filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>databaseRowObject_(r,headers));}
function databaseRowObject_(row,headers){const o={};headers.forEach((h,i)=>o[h]=row[i]??'');return o;}
function databaseCustomerRowToObject_(r){return databaseRowObject_(r,PERFECT_DB_CUSTOMER_HEADERS);}
function databaseVehicleRowToObject_(r){return databaseRowObject_(r,PERFECT_DB_VEHICLE_HEADERS);}
function databaseOrderRowToObject_(r){return databaseRowObject_(r,PERFECT_DB_ORDER_HEADERS);}
function perfect40Original_databaseGetAllCustomers_(){return databaseRows_(databaseGetCustomersSheet_(),2,PERFECT_DB_CUSTOMER_HEADERS);}
function perfect40Original_databaseGetAllVehicles_(){return databaseRows_(databaseGetVehiclesSheet_(),2,PERFECT_DB_VEHICLE_HEADERS);}
function perfect40Original_databaseGetAllOrders_(){const metadata=databaseOrderMeta26Map_();return databaseRows_(databaseGetOrdersSheet_(),3,PERFECT_DB_ORDER_HEADERS).map(o=>{
 if(o.STAV_OBJEDNAVKY)try{o.STAV_OBJEDNAVKY=databaseStatus_(o.STAV_OBJEDNAVKY);}catch(e){}
 if(o.DATUM_OBJEDNANI)try{o.DATUM_OBJEDNANI=databaseDate_(o.DATUM_OBJEDNANI);}catch(e){}
 if(o.CENA_CELKEM!==''&&o.CENA_CELKEM!=null)try{o.CENA_CELKEM=databaseMoney_(o.CENA_CELKEM);}catch(e){}
 o.CREATED_AT=metadata[String(o.ORDER_ID)]?.CREATED_AT||'';
 ['CAS_PRIJEZDU','CAS_ODJEZDU'].forEach(k=>{if(o[k])try{o[k]=databaseTime_(o[k]);}catch(e){}});return o;
});}
function perfect40Original_databaseFindCustomerById_(id){return databaseGetAllCustomers().find(x=>String(x.CUSTOMER_ID)===String(id))||null;}
function perfect40Original_databaseFindCustomerByPhone_(p){const n=databaseNormalizePhone_(p);if(!n)return null;return databaseGetAllCustomers().find(x=>databaseNormalizePhone_(x.TELEFON)===n)||null;}
function perfect40Original_databaseFindCustomerByEmail_(e){const n=databaseNormalizeEmail_(e);if(!n)return null;return databaseGetAllCustomers().find(x=>databaseNormalizeEmail_(x.EMAIL)===n)||null;}
function perfect40Original_databaseFindOrderById_(id){return databaseGetAllOrders().find(x=>String(x.ORDER_ID)===String(id))||null;}
function perfect40Original_databaseFindOrderByGmailMessageId_(id){if(!id)return null;return databaseGetAllOrders().find(x=>String(x.GMAIL_MESSAGE_ID)===String(id))||null;}
function perfect40Original_databaseGetOrdersByCustomerId_(id){return databaseGetAllOrders().filter(x=>String(x.CUSTOMER_ID)===String(id));}
function perfect40Original_databaseGetVehiclesByCustomerId_(id){return databaseGetAllVehicles().filter(x=>String(x.CUSTOMER_ID)===String(id));}
function databaseGenerateCustomerId_(){return databaseNextId_(databaseGetAllCustomers(),'CUSTOMER_ID','CUS-');}
function databaseGenerateVehicleId_(){return databaseNextId_(databaseGetAllVehicles(),'VEHICLE_ID','VEH-');}
function databaseNextId_(rows,key,prefix){const re=new RegExp('^'+prefix+'(\\d+)$');const max=rows.reduce((m,o)=>{const a=String(o[key]).match(re);return a?Math.max(m,Number(a[1])):m;},0);return prefix+String(max+1).padStart(6,'0');}
function databaseNormalizePhone_(v){let p=String(v||'').replace(/\D/g,'');if(p.length===12&&p.startsWith('420'))p=p.slice(3);return p;}
function databaseFormatPhone_(v){const n=databaseNormalizePhone_(v);return n.length===9?n.slice(0,3)+' '+n.slice(3,6)+' '+n.slice(6):String(v||'').trim();}
function databaseNormalizeEmail_(v){return String(v||'').trim().toLowerCase();}
function databaseVehicleKey_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function databasePlateKey_(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
function databasePick_(d,keys){for(const k of keys)if(d[k]!==undefined&&d[k]!==null)return d[k];return undefined;}
function databaseNormalizeOrderInput_(d){
 const aliases={ORDER_ID:['orderId'],DATUM_OBJEDNANI:['datumObjednani','datumObjednavky','datum','date'],CAS_PRIJEZDU:['casPrijezdu'],CAS_ODJEZDU:['casOdjezdu'],CUSTOMER_ID:['customerId','customerID'],FIRMA:['firma'],JMENO_PRIJMENI:['jmenoPrijmeni','name'],EMAIL:['email'],TELEFON:['telefon','phone'],VEHICLE_ID:['vehicleId'],VOZIDLO:['vozidlo','vehicle'],SPZ:['spz'],DARKOVY_POUKAZ:['darkovyPoukaz'],MYCI_PROGRAM:['myciProgram','program'],DOPLNKY:['doplnky'],POZNAMKY:['poznamky','notes'],CENA_CELKEM:['cenaCelkem','cena','price'],STAV_OBJEDNAVKY:['stavObjednavky','status'],PRACOVNIK:['pracovnik'],GMAIL_MESSAGE_ID:['gmailMessageId']};
 const o={};PERFECT_DB_ORDER_HEADERS.forEach(h=>{const v=databasePick_(d,[h,...(aliases[h]||[])]);if(v!==undefined)o[h]=v;});return o;
}
function databaseDate_(v){
 if(v instanceof Date){if(!isNaN(v.getTime()))return v;throw new Error('Neplatné datum návštěvy.');}
 const s=String(v||'').trim();let y,m,d,a;
 if((a=/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s))){y=+a[1];m=+a[2];d=+a[3];}
 else if((a=/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/.exec(s))){d=+a[1];m=+a[2];y=+a[3];}
 else throw new Error('Chybí platné datum návštěvy. Dnešní datum nebylo dosazeno.');
 const t=new Date(Date.UTC(y,m-1,d));if(t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d)throw new Error('Neplatné datum návštěvy.');
 return Utilities.parseDate(y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'),Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function databaseTime_(v){if(v===''||v==null)return '';if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'HH:mm');const a=/^([01]?\d|2[0-3])[:.]([0-5]\d)$/.exec(String(v).trim());if(!a)throw new Error('Neplatný čas příjezdu nebo odjezdu.');return a[1].padStart(2,'0')+':'+a[2];}
function databaseMoney_(v){
 let s=String(v??'').replace(/\s|Kč/gi,'');if(s==='')throw new Error('Chybí cena.');
 if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else s=s.replace(',','.');
 const n=Number(s);if(!Number.isFinite(n)||n<0)throw new Error('Neplatná cena.');return n;
}
function databaseStatus_(v){const n=String(v||'ČEKÁ SE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();const map={'CEKA SE':'ČEKÁ SE','DOKONCENO':'DOKONČENO','VYHOTOVENO':'DOKONČENO','NEDORAZIL':'NEDORAZIL','ZRUSENO':'ZRUŠENO'};if(!map[n])throw new Error('Neplatný stav objednávky.');return map[n];}
function databaseSafeText_(v){const s=String(v??'').trim();if(/^=/.test(s))throw new Error('Text nesmí začínat znakem =.');return s;}
function perfect40Original_databaseCreateCustomer_(data){return perfectDatabaseWithLock_('databaseCreateCustomer',()=>{
 const o=databaseNormalizeOrderInput_(data),phone=databaseFormatPhone_(o.TELEFON),email=databaseNormalizeEmail_(o.EMAIL);
 const byPhone=databaseFindCustomerByPhone(phone),byEmail=databaseFindCustomerByEmail(email);
 if(byPhone&&byEmail&&byPhone.CUSTOMER_ID!==byEmail.CUSTOMER_ID)throw new Error('Telefon a e-mail patří dvěma různým zákazníkům. Je nutná kontrola kontaktů.');
 const existing=byPhone||byEmail;if(existing)return existing;
 const name=databaseSafeText_(o.JMENO_PRIJMENI||o.FIRMA||(phone?'Zákazník '+phone:''));if(!name)throw new Error('Chybí identifikace zákazníka.');
 const now=new Date(),row=[databaseGenerateCustomerId_(),name,email,phone,now,now];
 const sh=databaseGetCustomersSheet_();sh.getRange(sh.getLastRow()+1,4).setNumberFormat('@');sh.appendRow(row);return databaseCustomerRowToObject_(row);
});}
function perfect40Original_databaseUpdateCustomer_(id,data){return perfectDatabaseWithLock_('databaseUpdateCustomer',()=>{
 const o=databaseNormalizeOrderInput_(data),sh=databaseGetCustomersSheet_(),r=databaseFindRowById_(sh,id,1);if(!r)throw new Error('Zákazník nebyl nalezen.');
 const row=sh.getRange(r,1,1,6).getValues()[0];['JMENO_PRIJMENI','EMAIL','TELEFON'].forEach((k,i)=>{if(o[k]!==undefined)row[i+1]=k==='TELEFON'?databaseFormatPhone_(o[k]):databaseSafeText_(o[k]);});row[5]=new Date();sh.getRange(r,1,1,6).setValues([row]);return databaseCustomerRowToObject_(row);
});}
function perfect40Original_databaseCreateVehicle_(data){return perfectDatabaseWithLock_('databaseCreateVehicle',()=>{
 const o=databaseNormalizeOrderInput_(data),id=String(o.CUSTOMER_ID||''),name=databaseSafeText_(o.VOZIDLO),plate=databasePlateKey_(o.SPZ);
 if(!id||!databaseFindCustomerById(id)||!name)throw new Error('Vozidlo musí mít platného zákazníka a název.');
 const vehicles=databaseGetVehiclesByCustomerId(id),history=databaseGetOrdersByCustomerId(id).filter(x=>String(x.ORDER_ID)!==String(data.EXCLUDE_ORDER_ID||''));
 if(plate){const match=history.find(x=>databasePlateKey_(x.SPZ)===plate&&x.VEHICLE_ID);if(match){const v=vehicles.find(x=>x.VEHICLE_ID===match.VEHICLE_ID);if(v){if(databaseVehicleKey_(v.VOZIDLO)!==databaseVehicleKey_(name))throw new Error('Tato SPZ už patří jinému modelu vozidla. Zkontroluj název nebo SPZ.');return v;}}}
 const same=vehicles.filter(x=>databaseVehicleKey_(x.VOZIDLO)===databaseVehicleKey_(name));
 let candidate;if(plate)candidate=same.find(v=>!history.some(x=>x.VEHICLE_ID===v.VEHICLE_ID&&databasePlateKey_(x.SPZ)&&databasePlateKey_(x.SPZ)!==plate));
 else{if(same.length>1)throw new Error('Zákazník má více vozidel tohoto modelu. Vyplň SPZ.');candidate=same[0];}
 if(candidate)return candidate;
 const now=new Date(),row=[databaseGenerateVehicleId_(),id,name,now,now];databaseGetVehiclesSheet_().appendRow(row);return databaseVehicleRowToObject_(row);
});}
function databaseLinkOrder_(o,exclude){
 const existing=o.CUSTOMER_ID?databaseFindCustomerById(o.CUSTOMER_ID):null;
 let customer;if(o.TELEFON||o.EMAIL)customer=databaseCreateCustomer(o);else if(existing)customer=existing;else customer=databaseCreateCustomer(o);
 o.CUSTOMER_ID=customer.CUSTOMER_ID;o.JMENO_PRIJMENI=o.JMENO_PRIJMENI||customer.JMENO_PRIJMENI;o.TELEFON=databaseFormatPhone_(o.TELEFON||customer.TELEFON);o.EMAIL=o.EMAIL||customer.EMAIL;
 const vehicle=databaseCreateVehicle({CUSTOMER_ID:customer.CUSTOMER_ID,VOZIDLO:o.VOZIDLO,SPZ:o.SPZ,EXCLUDE_ORDER_ID:exclude});o.VEHICLE_ID=vehicle.VEHICLE_ID;return o;
}
function databaseValidatedOrder_(o){
 o.DATUM_OBJEDNANI=databaseDate_(o.DATUM_OBJEDNANI);o.CAS_PRIJEZDU=databaseTime_(o.CAS_PRIJEZDU);o.CAS_ODJEZDU=databaseTime_(o.CAS_ODJEZDU);
 o.CENA_CELKEM=databaseMoney_(o.CENA_CELKEM);o.STAV_OBJEDNAVKY=databaseStatus_(o.STAV_OBJEDNAVKY);
 if(!String(o.VOZIDLO||'').trim()||!String(o.MYCI_PROGRAM||'').trim())throw new Error('Chybí vozidlo nebo mycí program.');
 Object.keys(o).forEach(k=>{if(typeof o[k]==='string')o[k]=databaseSafeText_(o[k]);});return o;
}
function perfect40Original_databaseCreateOrder_(data){return perfectDatabaseWithLock_('databaseCreateOrder',()=>{
 let o=databaseNormalizeOrderInput_(data);const props=PropertiesService.getScriptProperties(),request=String(data.PERFECT_WEB_REQUEST_ID||'');
 if(request&&!/^[a-z0-9-]{12,80}$/i.test(request))throw new Error('Neplatný identifikátor uložení.');
 const requestKey=request?'PERFECT_WEB_SAVED_'+request:'';
 if(request){const saved=databaseGetAllOrders().find(x=>String(x.WEB_REQUEST_ID)===request);if(saved)return saved;}
 if(o.GMAIL_MESSAGE_ID){const found=databaseFindOrderByGmailMessageId(o.GMAIL_MESSAGE_ID);if(found)return found;const removed=perfectDuplicates38ArchivedGmail_()[String(o.GMAIL_MESSAGE_ID)];if(removed){const kept=databaseFindOrderById(removed);if(kept)return kept;throw Error('Zpráva již patří k archivované duplicitě. Nebyla znovu importována.');}}
 o=databaseValidatedOrder_(o);databaseOrderMeta26Sheet_(true);
 if(o.ORDER_ID&&databaseFindOrderById(o.ORDER_ID))throw new Error('Číslo objednávky už existuje. Nic nebylo přepsáno.');
 if(!o.ORDER_ID){if(typeof generateOrderId!=='function')throw new Error('Chybí generátor čísel objednávek.');o.ORDER_ID=generateOrderId(o.DATUM_OBJEDNANI,data.PERFECT_WEB_GENERATE_ID||(!o.GMAIL_MESSAGE_ID?'OFFLINE':'ONLINE'));}
 o=databaseLinkOrder_(o);if(request)o.WEB_REQUEST_ID=request;const row=PERFECT_DB_ORDER_HEADERS.map(h=>o[h]??'');const sh=databaseGetOrdersSheet_(),r=Math.max(sh.getLastRow()+1,3);
 sh.getRange(r,9).setNumberFormat('@');sh.getRange(r,1,1,row.length).setValues([row]);databaseStyleOrderId_(sh,r,o.ORDER_ID);
 databaseOrderMeta26Save_(o.ORDER_ID,new Date().toISOString());
 // WEB_REQUEST_ID is saved in the same row: retries after a lost response do not create a second order.
 return databaseOrderRowToObject_(row);
});}
function perfect40Original_databaseUpdateOrder_(id,data){return perfectDatabaseWithLock_('databaseUpdateOrder',()=>{
 const sh=databaseGetOrdersSheet_(),r=databaseFindRowById_(sh,id,1);if(!r)throw new Error('Objednávka nebyla nalezena.');
 const current=databaseOrderRowToObject_(sh.getRange(r,1,1,PERFECT_DB_ORDER_HEADERS.length).getValues()[0]);
 const changes=databaseNormalizeOrderInput_(data);delete changes.ORDER_ID;delete changes.GMAIL_MESSAGE_ID;delete changes.WEB_REQUEST_ID;
 let o=databaseValidatedOrder_({...current,...changes});o=databaseLinkOrder_(o,String(id));
 const row=PERFECT_DB_ORDER_HEADERS.map(h=>o[h]??'');sh.getRange(r,9).setNumberFormat('@');sh.getRange(r,1,1,row.length).setValues([row]);databaseStyleOrderId_(sh,r,o.ORDER_ID);if(Object.prototype.hasOwnProperty.call(changes,'STAV_OBJEDNAVKY'))databaseOrderMeta26Save_(o.ORDER_ID,'',new Date().toISOString());return databaseOrderRowToObject_(row);
});}
function databaseFindRowById_(sh,id,col){const start=sh.getName()===PERFECT_DB.SHEETS.ORDERS?3:2;if(sh.getLastRow()<start)return null;const rows=sh.getRange(start,col,sh.getLastRow()-start+1,1).getValues();const i=rows.findIndex(r=>String(r[0]).trim()===String(id).trim());return i<0?null:start+i;}
function databaseStyleOrderId_(sh,row,id){sh.getRange(row,1).setFontColor(/^OF\d{4}-/i.test(String(id))?'#f59e0b':/^N\d{4}-/i.test(String(id))?'#38bdf8':'#202124');}
function databaseHideTechnicalColumns_(){const sh=databaseGetOrdersSheet_();sh.hideColumns(5,1);sh.hideColumns(10,1);}


/* PERFECT PATCH – bezpečné archivování testovacích objednávek přes centrální DB. */

function databaseIsTestOrder_(o){

  const name=String(o.JMENO_PRIJMENI||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  const price=String(o.CENA_CELKEM??'').replace(/\s|Kč/gi,'').replace(',','.');

  return name==='zakaznik' && price!=='' && Number(price)===0 && !String(o.CAS_PRIJEZDU||'').trim();

}

function databasePreviewTestOrders_(){

  const sh=databaseGetOrdersSheet_(),result=[];

  if(sh.getLastRow()<3)return {count:0,orders:[]};

  const rows=sh.getRange(3,1,sh.getLastRow()-2,PERFECT_DB_ORDER_HEADERS.length).getValues();

  rows.forEach((row,i)=>{

    const o=databaseOrderRowToObject_(row);

    if(databaseIsTestOrder_(o)&&String(o.ORDER_ID||'').trim())

      result.push({ORDER_ID:String(o.ORDER_ID),JMENO_PRIJMENI:String(o.JMENO_PRIJMENI),CAS_PRIJEZDU:'',CENA_CELKEM:0,row:i+3});

  });

  return {count:result.length,orders:result};

}

function databaseArchiveTestOrders_(ids){

  if(!Array.isArray(ids)||ids.length===0||ids.length>500)throw new Error('Vyber 1–500 objednávek.');

  const wanted=new Set(ids.map(x=>String(x).trim()));

  if(wanted.size!==ids.length)throw new Error('Seznam obsahuje duplicitní ID.');

  return perfectDatabaseWithLock_('databaseArchiveTestOrders_',()=>{

    const sh=databaseGetOrdersSheet_(),all=sh.getLastRow()>=3?sh.getRange(3,1,sh.getLastRow()-2,PERFECT_DB_ORDER_HEADERS.length).getValues():[];

    const found=[];

    all.forEach((row,i)=>{

      const o=databaseOrderRowToObject_(row);

      if(wanted.has(String(o.ORDER_ID||''))){

        if(!databaseIsTestOrder_(o))throw new Error('Objednávka '+o.ORDER_ID+' již neodpovídá třem podmínkám. Nic nebylo smazáno.');

        found.push({row:i+3,id:String(o.ORDER_ID),values:row});

      }

    });

    if(found.length!==wanted.size)throw new Error('Některá vybraná ID nebyla nalezena. Nic nebylo smazáno.');

    const ss=perfectDatabaseGetSpreadsheet_(),archiveName='__PERFECT_ARCHIV_TEST_OBJEDNAVEK';

    let archive=ss.getSheetByName(archiveName);

    const header=['ARCHIVOVANO_DNE',...PERFECT_DB_ORDER_HEADERS];

    if(!archive){archive=ss.insertSheet(archiveName);archive.getRange(1,1,1,header.length).setValues([header]);}

    const a=archive.getRange(1,1,1,header.length).getValues()[0];

    if(header.some((h,i)=>a[i]!==h))throw new Error('Nesouhlasí hlavička archivu – žádná data nebyla smazána.');

    const oldIDs=archive.getLastRow()>1?new Set(archive.getRange(2,2,archive.getLastRow()-1,1).getValues().map(r=>String(r[0]))):new Set();

    const toWrite=found.filter(x=>!oldIDs.has(x.id));

    if(toWrite.length)archive.getRange(archive.getLastRow()+1,1,toWrite.length,header.length).setValues(toWrite.map(x=>[new Date(),...x.values]));

    SpreadsheetApp.flush();

    // Delete only after all backups have reached the archive.

    found.sort((a,b)=>b.row-a.row).forEach(x=>sh.deleteRow(x.row));

    return {success:true,archived:found.length,archiveSheet:archiveName,ids:found.map(x=>x.id)};

  });

}

/** PERFECT V10: aktualizace názvu vozidla pouze v centrální databázi.
 * Zachovává VEHICLE_ID, CUSTOMER_ID a všechny vazby. */
function perfect40Original_databaseUpdateVehicle_(id,data){
 return perfectDatabaseWithLock_('databaseUpdateVehicle',()=>{
   id=String(id||'').trim();
   const name=databaseSafeText_(data&&data.VOZIDLO);
   if(!name||name.length>120)throw new Error('Chybí platný název vozidla.');
   const sh=databaseGetVehiclesSheet_();
   const rowIndex=databaseFindRowById_(sh,id,1);
   if(!rowIndex)throw new Error('Vozidlo nebylo nalezeno.');
   const row=sh.getRange(rowIndex,1,1,PERFECT_DB_VEHICLE_HEADERS.length).getValues()[0];
   row[2]=name;
   row[4]=new Date();
   sh.getRange(rowIndex,1,1,PERFECT_DB_VEHICLE_HEADERS.length).setValues([row]);
   return databaseVehicleRowToObject_(row);
 });
}
/**
 * AUTOMYČKA PERFECT V14 – DOPLNĚK MODULU 01_CENTRALNI_DATABAZE.gs
 * Přidej na KONEC existujícího modulu 01, NEPŘEPISUJ celý původní modul.
 * JEDINÉ místo, které smí fyzicky přesunout objednávku z aktivního listu.
 * Archivace před odstraněním, kontrola hlaviček, zámek a záznam administrátora.
 * Bez změn zákazníků, vozidel, fotek, číslování a jiných modulů.
 */
function databaseArchiveOrderByAdmin_(orderId, actor) {
  const id = String(orderId || '').trim();
  if (!id || id.length > 100 || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Neplatné ID zakázky.');
  if (!actor || !actor.id || !actor.username) throw new Error('Chybí ověřený administrátor.');
  return perfectDatabaseWithLock_('databaseArchiveOrderByAdmin_', function () {
    const sh = databaseGetOrdersSheet_();
    const headers = Array.from(PERFECT_DB_ORDER_HEADERS);
    const firstRow = typeof PERFECT_DB_ORDER_DATA_START_ROW === 'number' ? PERFECT_DB_ORDER_DATA_START_ROW : 3;
    const headerRow = firstRow - 1;
    if (sh.getLastRow() < firstRow) throw new Error('Zakázka nebyla nalezena.');
    const actual = sh.getRange(headerRow, 1, 1, headers.length).getValues()[0].map(x => String(x).trim());
    if (headers.some((h, i) => actual[i] !== h)) throw new Error('Hlavičky aktivní databáze nesouhlasí; nic se neodstranilo.');
    const ids = sh.getRange(firstRow, 1, sh.getLastRow() - firstRow + 1, 1).getValues();
    const hits = [];
    ids.forEach((r, i) => { if (String(r[0]).trim() === id) hits.push(firstRow + i); });
    if (hits.length !== 1) throw new Error(hits.length ? 'Duplicitní ID v databázi; nic se neodstranilo.' : 'Zakázka nebyla nalezena.');
    const rowIndex = hits[0];
    const values = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const ss = perfectDatabaseGetSpreadsheet_();
    const archiveName = '__PERFECT_ARCHIV_OBJEDNAVEK_ADMIN';
    const archiveHeaders = ['ARCHIVOVANO_DNE', 'ADMIN_ID', 'ADMIN_UZIVATEL', ...headers];
    let archive = ss.getSheetByName(archiveName);
    if (!archive) {
      archive = ss.insertSheet(archiveName);
      if (archive.getMaxColumns() < archiveHeaders.length) archive.insertColumnsAfter(archive.getMaxColumns(), archiveHeaders.length - archive.getMaxColumns());
      archive.getRange(1, 1, 1, archiveHeaders.length).setValues([archiveHeaders]);
      archive.hideSheet();
    }
    const existingHeaders = archive.getRange(1, 1, 1, archiveHeaders.length).getValues()[0].map(x => String(x).trim());
    if (archiveHeaders.some((h, i) => h !== existingHeaders[i])) throw new Error('Nesouhlasí hlavička archivu; nic se neodstranilo.');
    // Nikdy nearchivujeme druhý aktivní řádek stejného ID ani nepřepisujeme starý archiv.
    const previous = archive.getLastRow() > 1 ? archive.getRange(2, 4, archive.getLastRow() - 1, 1).getValues() : [];
    if (previous.some(r => String(r[0]).trim() === id)) throw new Error('ID již existuje v archivu. Z bezpečnostních důvodů nebylo nic odstraněno.');
    const destination = archive.getLastRow() + 1;
    archive.getRange(destination, 1, 1, archiveHeaders.length).setValues([[new Date(), String(actor.id), String(actor.username), ...values]]);
    SpreadsheetApp.flush();
    // Kontrola potvrzeného archivního řádku před fyzickým odebráním z aktivní evidence.
    const copied = archive.getRange(destination, 4, 1, headers.length).getValues()[0];
    if (String(copied[0]).trim() !== id || copied.length !== values.length || copied.some((v,i) => String(v) !== String(values[i]))) {
      throw new Error('Kontrola kopie v archivu selhala; aktivní objednávka zůstala zachována.');
    }
    sh.deleteRow(rowIndex);
    SpreadsheetApp.flush();
    console.info('PERFECT ADMIN ARCHIVE ' + JSON.stringify({ orderId:id, actorId:String(actor.id), archiveRow:destination }));
    return { success:true, ORDER_ID:id, archiveSheet:archiveName, archiveRow:destination };
  });
}


/** BOX 1 / BOX 2 / DETAILING — jediný zápis v modulu 01, objednávky zůstávají nedotčené. */
function databaseBoxes25Sheet_(kind,create){
  const spec={shift:{name:'__PERFECT_DB_SMENY',headers:['KEY','DATE','STATION','USER_ID','ACTIVE','WORKED','VERSION','UPDATED_AT','ACTOR_ID','WEEKEND_BONUS42']},order:{name:'__PERFECT_DB_PRIRAZENI_BOXU',headers:['KEY','ORDER_ID','STATION','ACTIVE','VERSION','UPDATED_AT','ACTOR_ID']},roster:{name:'__PERFECT_DB_SMENAR',headers:['KEY','DATE','USER_ID','PLANNED','GROUP','VERSION','UPDATED_AT','ACTOR_ID']},audit:{name:'__PERFECT_DB_BOXY_AUDIT',headers:['AT','ACTOR_ID','KIND','KEY','BEFORE_JSON','AFTER_JSON']}}[kind];
  if(!spec)throw new Error('Neznámý druh evidence.');
  const ss=perfectDatabaseGetSpreadsheet_();let sh=ss.getSheetByName(spec.name);
  if(!sh&&create){sh=ss.insertSheet(spec.name);if(sh.getMaxColumns()<spec.headers.length)sh.insertColumnsAfter(sh.getMaxColumns(),spec.headers.length-sh.getMaxColumns());sh.getRange(1,1,1,spec.headers.length).setValues([spec.headers]);sh.hideSheet();}
  if(!sh)return null;
  let width=Math.min(sh.getMaxColumns(),spec.headers.length),h=sh.getRange(1,1,1,width).getValues()[0];
  const legacy=kind==='shift'&&spec.headers.slice(0,9).every((x,i)=>String(h[i])===x)&&(h[9]==null||String(h[9])==='');
  if(legacy&&create){
    if(sh.getMaxColumns()>=10&&sh.getLastRow()>1&&sh.getRange(2,10,sh.getLastRow()-1,1).getValues().some(r=>r[0]!==''&&r[0]!=null))throw Error('Sloupec 10 směn obsahuje neoznačená data. Nebyl přepsán.');
    if(sh.getMaxColumns()<10)sh.insertColumnsAfter(sh.getMaxColumns(),10-sh.getMaxColumns());
    sh.getRange(1,10).setValue('WEEKEND_BONUS42');width=10;h=sh.getRange(1,1,1,10).getValues()[0];
  }
  if(!legacy&&spec.headers.some((x,i)=>String(h[i])!==x))throw new Error('Nesouhlasí hlavičky '+spec.name+'. Zápis byl zastaven.');
  return {sheet:sh,headers:spec.headers,readWidth:legacy&&!create?Math.min(9,width):spec.headers.length};
}
function databaseBoxes25Read_(kind){
  const spec=databaseBoxes25Sheet_(kind,false);if(!spec||spec.sheet.getLastRow()<2)return [];
  return spec.sheet.getRange(2,1,spec.sheet.getLastRow()-1,spec.readWidth).getValues().map(r=>Object.fromEntries(spec.headers.map((h,i)=>[h,r[i]??''])));
}
function databaseBoxes25Commit_(kind,key,record,expected,actor){
  const rows=databaseBoxes25Read_(kind),matches=rows.map((r,i)=>({r,i})).filter(x=>String(x.r.KEY)===key);
  if(matches.length>1)throw new Error('Duplicitní klíč evidence; nutná kontrola.');
  const old=matches[0]?.r;
  if(String(old?.VERSION||'')!==String(expected||''))throw new Error('Záznam mezitím změnil jiný administrátor. Obnov přehled.');
  record.VERSION=Utilities.getUuid();record.UPDATED_AT=new Date().toISOString();record.ACTOR_ID=String(actor.id);
  const spec=databaseBoxes25Sheet_(kind,true),audit=databaseBoxes25Sheet_('audit',true);
  audit.sheet.getRange(audit.sheet.getLastRow()+1,1,1,6).setValues([[record.UPDATED_AT,String(actor.id),kind,key,JSON.stringify(old||null),JSON.stringify(record)]]);
  const row=old?matches[0].i+2:spec.sheet.getLastRow()+1;
  spec.sheet.getRange(row,1,1,spec.headers.length).setNumberFormat('@').setValues([spec.headers.map(h=>record[h]??'')]);
  return record;
}
function databaseBoxes25SaveShift_(token,input){
  return perfectDatabaseWithLock_('BOX směna',()=>{
    const actor=perfectAuthRequireAdmin_(token),date=perfectBoxes25Date_(input.date),station=perfectBoxes25Station_(input.station);
    const worker=String(input.userId||'').trim(),rows=databaseBoxes25Read_('shift');
    if(worker){
      if(!perfectRepairUsers_().some(u=>String(u.id)===worker&&u.active!==false))throw new Error('Vyber existujícího aktivního pracovníka.');
      if(rows.some(r=>String(r.DATE)===date&&r.STATION!==station&&r.ACTIVE===true&&String(r.USER_ID)===worker))throw new Error('Pracovník je v tento den již přiřazen jinému stanovišti.');
    }
    const key=date+'|'+station,previous=rows.find(r=>r.KEY===key),bonusInput=input.weekendBonus===undefined&&previous&&String(previous.USER_ID)===worker&&input.worked===true?previous.WEEKEND_BONUS42:input.weekendBonus,weekendBonus=perfectBoxes42Bonus_(date,station,bonusInput||0);
    if(weekendBonus&&(!worker||input.worked!==true))throw Error('Bonus vyžaduje potvrzenou směnu pracovníka.');
    return databaseBoxes25Commit_('shift',key,{KEY:key,DATE:date,STATION:station,USER_ID:worker,ACTIVE:!!worker,WORKED:!!worker&&input.worked===true,WEEKEND_BONUS42:weekendBonus},input.version,actor);
  });
}
function databaseBoxes25SaveOrder_(token,input){
  return perfectDatabaseWithLock_('BOX objednávka',()=>{
    const actor=perfectAuthRequireAdmin_(token),id=String(input.orderId||'').trim();
    if(!databaseFindOrderById(id))throw new Error('Objednávka nebyla nalezena.');
    const station=input.station?perfectBoxes25Station_(input.station):'';
    return databaseBoxes25Commit_('order',id,{KEY:id,ORDER_ID:id,STATION:station,ACTIVE:!!station},input.version,actor);
  });
}
function databaseRoster25Seed_(token){
  return perfectDatabaseWithLock_('Směnář říjen/listopad 2026',()=>{
    const actor=perfectAuthRequireAdmin_(token),users=perfectRepairUsers_();
    const names=['MartinF','Ladislave','vojtadd','MartinP'];
    const selected=names.map(n=>users.filter(u=>String(u.username).toLowerCase()===n.toLowerCase()));
    const missing=names.filter((n,i)=>selected[i].length!==1);
    if(missing.length)throw new Error('Nelze jednoznačně dohledat účty: '+missing.join(', ')+'.');
    const existing=new Set(databaseBoxes25Read_('roster').map(r=>String(r.KEY))),rows=[];
    for(const month of ['2026-10','2026-11']){
      const period=perfectRoster25Month_(month);
      for(let day=1;day<=period.days;day++){
        const date=month+'-'+String(day).padStart(2,'0');
        selected.forEach(list=>{
          const u=list[0],group=perfectRoster25Group_(u.username),key=date+'|'+u.id;
          if(perfectRoster25Planned_(group,date)&&!existing.has(key))rows.push([key,date,String(u.id),true,group,Utilities.getUuid(),new Date().toISOString(),String(actor.id)]);
        });
      }
    }
    if(rows.length){const spec=databaseBoxes25Sheet_('roster',true);spec.sheet.getRange(spec.sheet.getLastRow()+1,1,rows.length,spec.headers.length).setNumberFormat('@').setValues(rows);}
    return {success:true,created:rows.length,months:['2026-10','2026-11']};
  });
}

/** Metadata založení a ručních stavů: výhradně centrální databáze. */
function databaseOrderMeta26Sheet_(create){
 const ss=perfectDatabaseGetSpreadsheet_(),name='__PERFECT_DB_ORDER_META',headers=['ORDER_ID','CREATED_AT','MANUAL_AT','UPDATED_AT'];
 let sh=ss.getSheetByName(name);if(!sh&&create){sh=ss.insertSheet(name);sh.getRange(1,1,1,4).setValues([headers]);sh.hideSheet();}
 if(!sh)return null;const actual=sh.getRange(1,1,1,4).getValues()[0];
 if(headers.some((x,i)=>String(actual[i])!==x))throw new Error('Nesouhlasí hlavičky metadat objednávek.');
 return sh;
}
function databaseOrderMeta26Map_(){
 const sh=databaseOrderMeta26Sheet_(false),out={};if(!sh||sh.getLastRow()<2)return out;
 sh.getRange(2,1,sh.getLastRow()-1,4).getValues().forEach((r,i)=>{if(r[0])out[String(r[0])]={ORDER_ID:String(r[0]),CREATED_AT:r[1],MANUAL_AT:r[2],UPDATED_AT:r[3],row:i+2};});return out;
}
function databaseOrderMeta26Save_(id,created,manual){
 const map=databaseOrderMeta26Map_(),old=map[String(id)],sh=databaseOrderMeta26Sheet_(true);
 const row=[String(id),old?.CREATED_AT||created||'',manual===undefined?(old?.MANUAL_AT||''):manual,new Date().toISOString()];
 sh.getRange(old?.row||sh.getLastRow()+1,1,1,4).setNumberFormat('@').setValues([row]);
}
function databaseAutoStatus26Apply_(preview){
 return perfectDatabaseWithLock_('Automatické dokončování V26',()=>{
  const sh=databaseGetOrdersSheet_(),headers=Array.from(PERFECT_DB_ORDER_HEADERS),actual=sh.getRange(2,1,1,headers.length).getValues()[0];
  if(headers.some((h,i)=>h!==String(actual[i]).trim()))throw new Error('Nesouhlasí hlavičky objednávek.');
  const result={checked:0,eligible:0,completed:0,manual:0,unknown:0};
  if(sh.getLastRow()<3)return result;
  const meta=databaseOrderMeta26Map_(),manual=new Set(Object.values(meta).filter(m=>m.MANUAL_AT).map(m=>m.ORDER_ID));
  const legacy=perfectDatabaseGetSpreadsheet_().getSheetByName('__PERFECT_STATUS_RUCNI');
  if(legacy&&legacy.getLastRow()>1)legacy.getRange(2,1,legacy.getLastRow()-1,1).getValues().forEach(r=>manual.add(String(r[0])));
  const rows=sh.getRange(3,1,sh.getLastRow()-2,headers.length).getValues();
  rows.forEach((r,i)=>{
   const o=databaseOrderRowToObject_(r);if(!o.ORDER_ID)return;let status;try{status=databaseStatus_(o.STAV_OBJEDNAVKY);}catch(e){result.unknown++;return;}if(status!=='ČEKÁ SE')return;result.checked++;
   if(manual.has(String(o.ORDER_ID))){result.manual++;return;}
   let timing;try{timing=perfectOrderTimingV26_(o);}catch(e){result.unknown++;return;}
   if(!timing.AUTO_COMPLETE_AT){result.unknown++;return;}
   if(Date.parse(timing.AUTO_COMPLETE_AT)>Date.now())return;result.eligible++;
   if(!preview&&result.completed<100){sh.getRange(i+3,headers.indexOf('STAV_OBJEDNAVKY')+1).setValue('DOKONČENO');result.completed++;}
  });
  Logger.log('AUTO V26 '+JSON.stringify(result));return result;
 });
}


/** Rozšíření modulu 01 V36: jediná zapisující vrstva poukazů. Nemění existující listy. */
var PERFECT_VOUCHER36_HEADERS_=['ENTITY','ENTITY_ID','VERSION','REQUEST_ID','OPERATION','AT','ACTOR','REQUEST_HASH','DATA_JSON'];
function databaseVoucher36Sheet_(create){
 var ss=perfectDatabaseGetSpreadsheet_(),name='__PERFECT_DB_VOUCHER_EVENTS36',sh=ss.getSheetByName(name),h=PERFECT_VOUCHER36_HEADERS_;
 if(!sh&&create){sh=ss.insertSheet(name);sh.getRange(1,1,1,h.length).setValues([h]);sh.setFrozenRows(1);sh.hideSheet();}
 if(sh){var actual=sh.getRange(1,1,1,h.length).getValues()[0];if(h.some(function(v,i){return String(actual[i])!==v;}))throw Error('Hlavičky evidence poukazů nesouhlasí. Zápis zablokován.');}return sh;
}
function databaseVoucher36State_(){
 var sh=databaseVoucher36Sheet_(false),s={installed:!!sh,products:{},vouchers:{},events:[],requests:{}};if(!sh||sh.getLastRow()<2)return s;
 sh.getRange(2,1,sh.getLastRow()-1,PERFECT_VOUCHER36_HEADERS_.length).getValues().forEach(function(r,index){if(!r[0])return;var entity=String(r[0]),id=String(r[1]),version=Number(r[2]),bucket=entity==='PRODUCT'?s.products:entity==='VOUCHER'?s.vouchers:null;if(!bucket)throw Error('Neznámý typ záznamu poukazu na řádku '+(index+2));var data;try{data=JSON.parse(String(r[8]));}catch(e){throw Error('Nečitelná historie poukazu na řádku '+(index+2));}if(version!==(bucket[id]?bucket[id].version+1:1))throw Error('Nesouvislá historie poukazu '+id);data.id=id;data.version=version;bucket[id]=data;var e={entity:entity,id:id,version:version,requestId:String(r[3]),operation:String(r[4]),at:String(r[5]),actor:String(r[6]),requestHash:String(r[7]),data:data};s.events.push(e);if(e.requestId)s.requests[e.requestId]=e;});return s;
}
function databaseVoucher36Row_(entity,data,request,operation,actor,hash){return [entity,data.id,data.version,request,operation,new Date().toISOString(),String(actor),hash,JSON.stringify(data)];}
function databaseVoucher36Append_(rows){if(!rows.length)return;var sh=databaseVoucher36Sheet_(false);if(!sh)throw Error('Nejdřív připrav evidenci poukazů.');sh.getRange(sh.getLastRow()+1,1,rows.length,PERFECT_VOUCHER36_HEADERS_.length).setNumberFormat('@').setValues(rows);}
function databaseVoucher36Setup_(actor){return perfectDatabaseWithLock_('Příprava poukazů',function(){databaseVoucher36Sheet_(true);var s=databaseVoucher36State_(),rows=[];[1000,2000,3000].forEach(function(amount){var id='GIFT_'+amount;if(!s.products[id]){var p={id:id,version:1,name:'Dárkový poukaz',amount:amount*100,validityCount:3,validityUnit:'MONTHS',active:true};rows.push(databaseVoucher36Row_('PRODUCT',p,'SETUP36-'+id,'SETUP',actor,''));}});databaseVoucher36Append_(rows);return {success:true,createdProducts:rows.length};});}
function databaseVoucher36Stable_(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(databaseVoucher36Stable_).join(',')+']';return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+databaseVoucher36Stable_(v[k]);}).join(',')+'}';}
function databaseVoucher36Change_(entity,id,expected,request,actor,operation,input,transform){
 request=perfect36Request_(request);var hash=perfectRepairDigest_(databaseVoucher36Stable_({entity:entity,operation:operation,input:input,actor:actor.id}));
 return perfectDatabaseWithLock_('Uložení poukazu',function(){var s=databaseVoucher36State_();if(!s.installed)throw Error('Nejdřív připrav evidenci poukazů.');var previous=s.requests[request];if(previous){if(previous.requestHash!==hash)throw Error('Stejný identifikátor byl použit pro jinou změnu.');return {success:true,record:perfect36ViewSafe_(entity,previous.data),replayed:true};}
 var old=(entity==='PRODUCT'?s.products:s.vouchers)[id];if(old&&Number(expected)!==old.version)throw Error('Záznam mezitím změnil někdo jiný. Obnov přehled.');if(!old&&Number(expected||0)!==0)throw Error('Záznam nebyl nalezen.');var data=transform(old,s);data.version=old?old.version+1:1;databaseVoucher36Append_([databaseVoucher36Row_(entity,data,request,operation,actor.id,hash)]);return {success:true,record:perfect36ViewSafe_(entity,data)};});
}
function perfect36ViewSafe_(entity,data){return entity==='VOUCHER'?perfect36View_(data):data;}
function databaseVoucher36Import_(parsed,actor,request){return perfectDatabaseWithLock_('Import poukazů',function(){
 var s=databaseVoucher36State_();if(!s.installed)throw Error('Nejdřív připrav evidenci poukazů.');var sources=new Set(Object.keys(s.vouchers).map(function(id){return s.vouchers[id].sourceHash;}).filter(Boolean)),fresh=parsed.filter(function(v){if(sources.has(v.sourceHash))return false;sources.add(v.sourceHash);return true;}),customers=databaseGetAllCustomers(),orders=databaseGetAllOrders(),all=Object.keys(s.vouchers).map(function(id){return s.vouchers[id];}).concat(fresh),counts={};all.forEach(function(v){var code=v.code.toUpperCase();counts[code]=(counts[code]||0)+1;});var rows=[],max=Object.keys(s.vouchers).reduce(function(n,id){return Math.max(n,Number(s.vouchers[id].number)||0);},0);
 Object.keys(s.vouchers).forEach(function(id){var old=s.vouchers[id];if(counts[old.code.toUpperCase()]>1&&(old.issues||[]).indexOf('DUPLICATE_CODE')<0){var v=Object.assign({},old,{version:old.version+1,issues:(old.issues||[]).concat(['DUPLICATE_CODE'])});rows.push(databaseVoucher36Row_('VOUCHER',v,request+'-D'+rows.length,'IMPORT_CONFLICT',actor.id,''));}});
 fresh.forEach(function(v,index){v.number=++max;v.version=1;if(counts[v.code.toUpperCase()]>1&&v.issues.indexOf('DUPLICATE_CODE')<0)v.issues.push('DUPLICATE_CODE');Object.assign(v,perfect36Match_(v,customers,orders));var type=Object.keys(s.products).find(function(id){return s.products[id].amount===v.amount;});v.typeId=type||'';v.createdAt=new Date().toISOString();rows.push(databaseVoucher36Row_('VOUCHER',v,request+'-I'+index,'IMPORT',actor.id,perfectRepairDigest_(v.sourceHash)));});databaseVoucher36Append_(rows);return {success:true,imported:fresh.length,skipped:parsed.length-fresh.length,review:fresh.filter(function(v){return v.issues.length;}).length};
 });}


/** PERFECT – rozšíření modulu 01. Zapisuje ceník a stav dokončení; žádné změny schématu ani mazání. */
function databaseAddons31ServicesSheet_(create) {
  var ss=perfectDatabaseGetSpreadsheet_();
  var name=PERFECT_REPAIR.SERVICES;
  var headers=['SERVICE_ID','NAZEV','TYP','CENA','BARVA','AKTIVNI'];
  var sheet=ss.getSheetByName(name);
  if(sheet){
    var actual=sheet.getRange(1,1,1,headers.length).getValues()[0];
    if(headers.some(function(h,i){return String(actual[i])!==h;}))throw new Error('Ceník má jiné hlavičky. Zápis byl zablokován; žádná hlavička se nepřepisuje.');
  }else if(create){
    sheet=ss.insertSheet(name);
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  }
  return sheet;
}
function databaseAddons31ReadServices_() {
  var sheet=databaseAddons31ServicesSheet_(false);
  if(!sheet||sheet.getLastRow()<2)return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,6).getValues().filter(function(r){return r[0];}).map(function(r){
    return {SERVICE_ID:String(r[0]),NAZEV:String(r[1]),TYP:String(r[2]),
      CENA:perfectAddons31Blank_(r[3])?null:perfectAddons31Money_(r[3],true),
      BARVA:String(r[4]),AKTIVNI:r[5]===true||r[5]===1||/^(true|ano)$/i.test(String(r[5]))};
  });
}
function databaseAddons31SaveService_(payload) {
  return perfectRepairLock_(function(){
    var sheet=databaseAddons31ServicesSheet_(true);
    var rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues():[];
    var id=String(payload.SERVICE_ID||'SRV_'+Utilities.getUuid());
    var index=rows.findIndex(function(r){return String(r[0])===id;});
    if(payload.SERVICE_ID&&index<0)throw new Error('Služba nebyla nalezena.');
    var row=[id,payload.NAZEV,payload.TYP,payload.CENA===null?'':payload.CENA,payload.BARVA,payload.AKTIVNI];
    sheet.getRange(index<0?sheet.getLastRow()+1:index+2,1,1,6).setValues([row]);
    SpreadsheetApp.flush();
    return {success:true,SERVICE_ID:id};
  });
}
/** Stejná pravidla pro časovač na pozadí i pro otevřený hlavní panel. */
function databaseTiming31Apply_(preview){
  return perfectDatabaseWithLock_('Dokončení po době programu V31',function(){
    var sheet=databaseGetOrdersSheet_(),headers=Array.from(PERFECT_DB_ORDER_HEADERS);
    var headerRow=typeof PERFECT_DB_ORDER_HEADER_ROW==='number'?PERFECT_DB_ORDER_HEADER_ROW:2;
    var start=typeof PERFECT_DB_ORDER_DATA_START_ROW==='number'?PERFECT_DB_ORDER_DATA_START_ROW:3;
    var actual=sheet.getRange(headerRow,1,1,headers.length).getValues()[0];
    if(headers.some(function(h,i){return String(actual[i]).trim()!==h;}))throw new Error('Nesouhlasí hlavičky objednávek; automatický zápis byl zablokován.');
    var statusColumn=headers.indexOf('STAV_OBJEDNAVKY')+1;
    if(statusColumn<1)throw new Error('Chybí sloupec stavu objednávky.');
    var result={checked:0,eligible:0,completed:0,unknown:0,remaining:0,preview:preview===true,examples:[]};
    var count=sheet.getLastRow()-start+1;if(count<1)return result;
    var raw=sheet.getRange(start,1,count,headers.length).getValues(),ids=new Map(),eligible=[],now=Date.now();
    raw.forEach(function(row){var id=String(row[0]||'').trim();if(id)ids.set(id,(ids.get(id)||0)+1);});
    raw.forEach(function(row,index){
      var order=databaseOrderRowToObject_(row),id=String(order.ORDER_ID||'').trim();
      // Konečné stavy ani prázdné stavy nepřepisujeme. ČEKÁ SE patří do automatiky.
      if(!id||perfectTiming31Normalize_(order.STAV_OBJEDNAVKY)!=='CEKA SE')return;
      result.checked++;
      if(ids.get(id)!==1){result.unknown++;return;}
      var timing=perfectTiming31Meta_(order);
      if(!timing.AUTO_COMPLETE_AT){result.unknown++;return;}
      if(Date.parse(timing.AUTO_COMPLETE_AT)>now)return;
      result.eligible++;eligible.push({row:start+index,id:id,finish:timing.AUTO_COMPLETE_AT});
    });
    result.examples=eligible.slice(0,20).map(function(x){return {ORDER_ID:x.id,finish:x.finish};});
    if(preview)return result;
    var batch=eligible.slice(0,500);result.remaining=Math.max(0,eligible.length-batch.length);
    if(!batch.length)return result;
    var col='',n=statusColumn;while(n>0){n--;col=String.fromCharCode(65+n%26)+col;n=Math.floor(n/26);}
    sheet.getRangeList(batch.map(function(x){return col+x.row;})).setValue('DOKONČENO');
    SpreadsheetApp.flush();
    var statuses=sheet.getRange(start,statusColumn,count,1).getValues();
    batch.forEach(function(x){if(String(statuses[x.row-start][0])==='DOKONČENO')result.completed++;});
    if(result.completed!==batch.length)throw new Error('Zápis automatického dokončení nebyl potvrzen. Obnov panel.');
    return result;
  });
}


/** Duplicity V38: jediný zapisující modul 01. */
function databaseDuplicates38Resolve_(payload,actor){return perfectDatabaseWithLock_('databaseDuplicates38Resolve_',function(){
 if(!actor||!actor.id||!actor.username)throw Error('Chybí ověřený administrátor.');
 var ids=Array.isArray(payload.ids)?payload.ids.map(String):[];
 if(ids.length!==2||ids[0]===ids[1]||ids.some(function(id){return !/^[a-z0-9_-]{1,100}$/i.test(id);}))throw Error('Vyber přesně dvě různé zakázky.');
 if(!['KEEP_BOTH','ARCHIVE'].includes(payload.action))throw Error('Neplatná volba.');
 var sh=databaseGetOrdersSheet_(),actual=sh.getRange(2,1,1,PERFECT_DB_ORDER_HEADERS.length).getValues()[0];
 if(actual.some(function(v,i){return String(v)!==PERFECT_DB_ORDER_HEADERS[i];}))throw Error('Nesouhlasí hlavička aktivní databáze. Nic nebylo odstraněno.');
 var all=databaseGetAllOrders(),matches=ids.map(function(id){return all.filter(function(o){return String(o.ORDER_ID)===id;});});
 if(matches.some(function(a){return a.length!==1;}))throw Error('Zakázka chybí nebo má duplicitní ID. Obnov přehled.');
 var pair=perfectDuplicates38Pair_(perfectDuplicates38Shape_(matches[0][0]),perfectDuplicates38Shape_(matches[1][0]));
 if(!pair||pair.key!==payload.key||pair.version!==payload.version)throw Error('Zakázky se mezitím změnily. Obnov přehled a znovu je porovnej.');
 var keep='',remove='',source=[];
 if(payload.action==='ARCHIVE'){
  keep=String(payload.keepId||'');remove=ids.find(function(id){return id!==keep;});
  if(!ids.includes(keep)||!remove||String(payload.confirmId||'')!==remove)throw Error('Potvrď přesné číslo vyřazované zakázky.');
  var rawRow=databaseFindRowById_(sh,remove,1);source=sh.getRange(rawRow,1,1,PERFECT_DB_ORDER_HEADERS.length).getValues()[0];
  if(source.some(function(v){return typeof v==='string'&&v.length>49000;}))throw Error('Záznam je příliš dlouhý pro bezpečnou archivaci.');
 }
 var ss=perfectDatabaseGetSpreadsheet_(),ledger=perfectDuplicates38Ledger_(false);
 if(!ledger){ledger=ss.insertSheet('__PERFECT_DUPLICITY_ARCHIV');if(ledger.getMaxColumns()<perfectDuplicates38Headers_().length)ledger.insertColumnsAfter(ledger.getMaxColumns(),perfectDuplicates38Headers_().length-ledger.getMaxColumns());ledger.getRange(1,1,1,perfectDuplicates38Headers_().length).setValues([perfectDuplicates38Headers_()]);ledger.hideSheet();}
 var previous=perfectDuplicates38Decisions_();
 if(payload.action==='KEEP_BOTH'&&previous.some(function(r){return r[0]===pair.key&&r[1]===pair.version&&r[2]==='KEEP_BOTH';}))return {success:true,alreadyResolved:true};
 if(payload.action==='ARCHIVE'&&previous.some(function(r){return String(r[4])===remove;}))throw Error('Zakázka už má archivní záznam. Nic dalšího nebylo odstraněno.');
 var gmail=payload.action==='ARCHIVE'?String(matches[ids.indexOf(remove)][0].GMAIL_MESSAGE_ID||''):'';
 var entry=[pair.key,pair.version,payload.action==='ARCHIVE'?'PREPARED':'KEEP_BOTH',keep,remove,String(actor.id),String(actor.username),new Date(),JSON.stringify(gmail?[gmail]:[]),...PERFECT_DB_ORDER_HEADERS.map(function(_,i){return source[i]==null?'':source[i];})];
 // Prostý text brání vyhodnocení poznámek jako vzorců.
 if(entry.some(function(v){return typeof v==='string'&&/^\s*=/.test(v);}))throw Error('Archivní záznam obsahuje text vyžadující ruční kontrolu. Nic nebylo odstraněno.');
 var destination=ledger.getLastRow()+1;ledger.getRange(destination,1,1,entry.length).setNumberFormat('@').setValues([entry]);SpreadsheetApp.flush();
 var saved=ledger.getRange(destination,1,1,entry.length).getValues()[0];
 if(saved.some(function(v,i){return String(v)!==String(entry[i]);}))throw Error('Kontrola archivní kopie selhala. Aktivní zakázka zůstává.');
 if(payload.action==='ARCHIVE'){
  var row=databaseFindRowById_(sh,remove,1);if(!row)throw Error('Zakázka již není aktivní. Obnov přehled.');
  sh.deleteRow(row);SpreadsheetApp.flush();ledger.getRange(destination,3).setValue('ARCHIVED');SpreadsheetApp.flush();
 }
 return {success:true,action:payload.action,keptOrderId:keep,removedOrderId:remove,archiveSheet:ledger.getName()};
});}

/** V40: veškeré zápisy oprávnění a aktivit zajišťuje centrální modul. */
function databaseSecurity40AuditSheet_(){var ss=perfectDatabaseGetSpreadsheet_(),name='__PERFECT_DB_AKTIVITY_V40',heads=['ID','AT','ACTOR_ID','ACTOR','ROLE','ACTION','TARGET','BEFORE_JSON','AFTER_JSON','STATUS','DETAIL'],sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,heads.length).setValues([heads]);sh.hideSheet();}var h=sh.getRange(1,1,1,heads.length).getValues()[0];if(heads.some(function(k,i){return h[i]!==k;}))throw Error('Audit má jiné hlavičky. Operace nebyla bezpečně potvrzena.');return sh;}
function databaseSecurity40Audit_(actor,action,target,before,after,status,detail){return perfectDatabaseWithLock_('Audit V40',function(){var sh=databaseSecurity40AuditSheet_();sh.getRange(sh.getLastRow()+1,1,1,11).setValues([[Utilities.getUuid(),new Date().toISOString(),String(actor&&actor.id||''),String(actor&&actor.username||''),String(actor&&actor.role||''),String(action),String(target||'').slice(0,100),JSON.stringify(before||{}).slice(0,12000),JSON.stringify(after||{}).slice(0,12000),status,String(detail||'').slice(0,500)]]);return true;});}
function databaseSecurity40ReadAudit_(input){var sh=databaseSecurity40AuditSheet_(),limit=Math.max(1,Math.min(100,Number(input.limit)||50)),offset=Math.max(0,Math.floor(Number(input.offset)||0)),filter=String(input.actorId||''),action=String(input.action||''),from=String(input.from||''),to=String(input.to||'');if(from&&!/^\d{4}-\d{2}-\d{2}$/.test(from)||to&&!/^\d{4}-\d{2}-\d{2}$/.test(to))throw Error('Vyber platné datum.');var rows=sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,11).getValues();rows=rows.reverse().filter(function(r){return (!filter||r[2]===filter)&&(!action||String(r[5]).indexOf(action)>=0)&&(!from||String(r[1]).slice(0,10)>=from)&&(!to||String(r[1]).slice(0,10)<=to);});return {success:true,total:rows.length,offset:offset,items:rows.slice(offset,offset+limit).map(function(r){return {id:r[0],at:r[1],actorId:r[2],actor:r[3],role:r[4],action:r[5],target:r[6],before:JSON.parse(r[7]||'{}'),after:JSON.parse(r[8]||'{}'),status:r[9],detail:r[10]};})};}
function databaseSecurity40Save_(actor,input){return perfectDatabaseWithLock_('Role V40',function(){var old=perfect40Policy_();if(String(input.version)!==String(old.version))throw Error('Oprávnění se mezitím změnila. Obnov přehled.');var keys=perfect40Catalog_().map(function(c){return c.key;}),roles={};['PRACOVNIK','SMENAR'].forEach(function(role){var values=input.roles&&input.roles[role];if(!Array.isArray(values)||values.some(function(k){return keys.indexOf(k)<0;}))throw Error('Neplatná oprávnění role '+role+'.');roles[role]=Array.from(new Set(values));[['orders.create','orders.read'],['orders.edit','orders.read'],['customers.edit','customers.read'],['vehicles.edit','vehicles.read'],['vouchers.issue','vouchers.read'],['vouchers.redeem','vouchers.read'],['media.write','media.read']].forEach(function(pair){if(roles[role].indexOf(pair[0])>=0&&roles[role].indexOf(pair[1])<0)throw Error('Oprávnění '+pair[0]+' vyžaduje '+pair[1]+'.');});});var value={version:Utilities.getUuid(),roles:roles,updatedAt:new Date().toISOString(),actorId:String(actor.id)};perfectRepairProps_().setProperty('PERFECT40_ROLE_POLICY',JSON.stringify(value));var props=perfectRepairProps_(),users=perfectRepairUsers_(),all=props.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){try{var session=JSON.parse(all[k]),u=users.find(function(x){return String(x.id)===String(session.userId);});if(u&&u.role!=='ADMINISTRATOR')props.deleteProperty(k);}catch(e){}});return {success:true,version:value.version};});}
function databaseSecurity40SetupOwner_(){return perfectDatabaseWithLock_('Založení vlastníka V40',function(){var props=perfectRepairProps_();if(perfect40SuperIds_().length)throw Error('Účet vlastníka už je nastaven. Nebyl přepsán.');var username=String(props.getProperty('PERFECT40_SETUP_USERNAME')||'').trim().toLowerCase(),password=String(props.getProperty('PERFECT40_SETUP_PASSWORD')||'');if(!/^[a-z0-9._-]{3,40}$/.test(username)||password.length<14||password.length>128)throw Error('Ve Vlastnostech skriptu nastav PERFECT40_SETUP_USERNAME a PERFECT40_SETUP_PASSWORD (14–128 znaků).');var users=perfectRepairUsers_();if(users.some(function(u){return String(u.username).toLowerCase()===username;}))throw Error('Použij nové samostatné uživatelské jméno; běžný zaměstnanecký účet se nepřevádí.');databaseSecurity40AuditSheet_();var user={id:Utilities.getUuid(),username:username,firstName:'Vlastník',surname:'',role:'ADMINISTRATOR',active:true,mustChangePassword:false};perfectAuthSetPasswordFields_(user,password);users.push(user);props.setProperty(PERFECT_REPAIR.USERS,JSON.stringify(users));props.setProperty('PERFECT40_SUPER_IDS',JSON.stringify([user.id]));props.deleteProperty('PERFECT40_SETUP_PASSWORD');props.deleteProperty('PERFECT40_SETUP_USERNAME');databaseSecurity40Audit_(user,'OWNER_SETUP',user.id,{}, {id:user.id},'OK','');Logger.log('Účet vlastníka byl založen; dočasné údaje byly odstraněny. ID: '+user.id);return {success:true,id:user.id};});}

/** V41: dočasná relace vlastníka pouze v ověřené oddělené testovací kopii. */
function databasePreview41Start_(){
 return perfectDatabaseWithLock_('Testovací kopie V41',function(){
  if(!perfectPreview41Context_())throw Error('Testovací režim není pro tento Google účet povolený.');
  var props=perfectRepairProps_(),users=perfectRepairUsers_(),id=props.getProperty('PERFECT41_TEST_USER_ID'),user=users.find(function(u){return u.id===id&&u.previewOnly41===true;});
  databaseSecurity40AuditSheet_();
  if(!user){user={id:Utilities.getUuid(),username:'preview-'+Utilities.getUuid().replace(/-/g,'').slice(0,12),firstName:'Testovací',surname:'správce',role:'ADMINISTRATOR',active:true,previewOnly41:true,mustChangePassword:false};perfectAuthSetPasswordFields_(user,perfectRepairRandom_());users.push(user);props.setProperty(PERFECT_REPAIR.USERS,JSON.stringify(users));props.setProperty('PERFECT41_TEST_USER_ID',user.id);var supers=perfect40SuperIds_();supers.push(user.id);props.setProperty('PERFECT40_SUPER_IDS',JSON.stringify(supers));}
  var all=props.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){try{var s=JSON.parse(all[k]);if(s.userId===user.id)props.deleteProperty(k);}catch(e){}});
  var token=perfectRepairRandom_();props.setProperty('PERFECT_REPAIR_SESSION_'+perfectRepairDigest_(token),JSON.stringify({userId:user.id,expires:Date.now()+15*60*1000}));
  databaseSecurity40Audit_(user,'TEST_PREVIEW',user.id,{}, {},'OK','Oddělená testovací kopie; přístup vlastníka projektu.');
  return {token:token,user:perfect40PublicUser_(user)};
 });
}

// 01a_DESIGN_DATABAZE.gs.txt
/** AUTOMYČKA PERFECT 2.0 — oprava odkazů na sloupce aktuální databáze.
 * P = POZNAMKY, Q = CENA_CELKEM, R = STAV_OBJEDNAVKY, J = VEHICLE_ID.
 * Celá náhrada souboru 01a_Design databáze.gs.
 */
function perfect40Original_designCentralniDatabaze_() {
  const sheet = perfectGmailDesignSheetV24_();
  const title = sheet.getRange('A1:P1');
  title.getMergedRanges().forEach(function(range) { range.breakApart(); });
  title.merge();
  title.setValue('Centrální databáze - Automyčka PERFECT')
    .setFontFamily('Alata').setFontSize(30).setFontColor('#000000')
    .setFontWeight('bold').setBackground('#b42318')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(1,50);
  const end=Math.min(1000,sheet.getMaxRows());
  if(end>=3){
    sheet.getRange(3,1,end-2,17).setFontFamily('Quantico');
    sheet.getRange(3,3,end-2,1).setFontColor('#1dcf1d');
    sheet.getRange(3,4,end-2,1).setFontColor('#cd0f0f');
    sheet.getRange(3,6,end-2,3).setFontFamily('Quantico').setFontSize(15);
    sheet.getRange(3,17,end-2,1).setNumberFormat('#,##0 "Kč"');
    const colors=[];
    for(let row=3;row<=end;row++)colors.push(new Array(17).fill(row%2===1?'#ffffff':'#999999'));
    sheet.getRange(3,1,end-2,17).setBackgrounds(colors);
  }
  sheet.setColumnWidth(3,50);sheet.setColumnWidth(4,50);
  sheet.setColumnWidth(7,300);sheet.setColumnWidth(8,300);
  sheet.setColumnWidth(16,200);
  sheet.hideColumns(5,1);
  sheet.showColumns(9,1); // I je telefon, technický VEHICLE_ID je až J.
  sheet.hideColumns(10,1);
  opravitValidaciGmailImportu();
  sheet.setFrozenRows(2);
  const existingFilter=sheet.getFilter();if(existingFilter)existingFilter.remove();
  sheet.getRange(2,1,Math.max(sheet.getLastRow()-1,1),Math.max(sheet.getLastColumn(),24)).createFilter();
  Logger.log('Design centrální databáze: správné sloupce P/Q/R/J.');
}

function perfectGmailDesignSheetV24_(){
  const ss=typeof perfectDatabaseGetSpreadsheet_==='function'?perfectDatabaseGetSpreadsheet_():SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)throw new Error('Databáze není připojená.');
  const sh=ss.getSheetByName(PERFECT_DB.SHEETS.ORDERS);
  if(!sh)throw new Error('Databázový list objednávek nebyl nalezen.');
  const expected=Array.from(PERFECT_DB_ORDER_HEADERS);
  const actual=sh.getRange(2,1,1,expected.length).getValues()[0].map(x=>String(x).trim());
  if(expected.some((x,i)=>x!==actual[i]))throw new Error('Hlavičky databáze nesouhlasí s modulem 01. Oprava byla zastavena.');
  if(expected[15]!=='POZNAMKY'||expected[16]!=='CENA_CELKEM'||expected[17]!=='STAV_OBJEDNAVKY')throw new Error('Jiná struktura P/Q/R; nutná kontrola.');
  return sh;
}

/** Spouští se při prvním nastavení importu. Mění pouze validační a barevná pravidla.
 * Původní hodnoty buněk se nepřepisují. Odstraní pouze rozpoznané seznamy stavů z P.
 */
function perfect40Original_opravitValidaciGmailImportu_(){
  const sh=perfectGmailDesignSheetV24_();
  const count=sh.getMaxRows()-2;
  if(count<=0)return {removedWrongRules:0};
  const statuses=['DOKONČENO','ČEKÁ SE','ZRUŠENO','NEDORAZIL'];
  const validations=sh.getRange(3,16,count,1).getDataValidations();
  const runs=[];let start=-1,removed=0;
  for(let i=0;i<count;i++){
    const rule=validations[i][0];let isStatus=false;
    if(rule&&rule.getCriteriaType()===SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST){
      const values=rule.getCriteriaValues()[0];
      isStatus=Array.isArray(values)&&values.includes('DOKONČENO')&&values.includes('ČEKÁ SE')&&values.every(x=>statuses.includes(String(x)));
    }
    if(isStatus){if(start<0)start=i;removed++;}
    else if(start>=0){runs.push([start,i-start]);start=-1;}
  }
  if(start>=0)runs.push([start,count-start]);
  runs.forEach(x=>sh.getRange(3+x[0],16,x[1],1).clearDataValidations());
  const statusRange=sh.getRange(3,18,count,1);
  const rule=SpreadsheetApp.newDataValidation().requireValueInList(statuses,true).setAllowInvalid(false).build();
  statusRange.setDataValidation(rule);
  const colors={'DOKONČENO':'#16803C','ČEKÁ SE':'#E67E22','ZRUŠENO':'#B8860B','NEDORAZIL':'#C00000'};
  const existing=sh.getConditionalFormatRules().filter(function(r){
    const condition=r.getBooleanCondition();
    if(!condition||condition.getCriteriaType()!==SpreadsheetApp.BooleanCriteria.TEXT_EQUAL_TO)return true;
    const value=String(condition.getCriteriaValues()[0]);
    if(!statuses.includes(value))return true;
    return !r.getRanges().every(function(range){
      return (range.getColumn()===16||range.getColumn()===18)&&range.getNumColumns()===1&&range.getRow()>=3;
    });
  });
  sh.setConditionalFormatRules(existing.concat(statuses.map(s=>SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(s).setFontColor(colors[s]).setRanges([statusRange]).build())));
  SpreadsheetApp.flush();
  const result={removedWrongRules:removed,notesColumn:'P',statusColumn:'R'};
  Logger.log('OPRAVA VALIDACE GMAIL: '+JSON.stringify(result));return result;
}

// 02_GMAIL_IMPORT.gs.txt
/**
 * AUTOMYČKA PERFECT 2.0 — 02_Gmail import.gs — V24 FRONTA
 * Jeden kompletní importní modul. Neobsahuje náhodná ORDER_ID.
 * Používá pouze veřejné zápisové funkce 01_Centralni_databaze.gs.
 * Souběžné vytvoření a přidělení ORDER_ID řeší zamykání v centrální DB.
 * Nezapisuje přímo do tabulek, nemění staré ORDER_ID.
 */
const PERFECT_GMAIL_CONFIG = Object.freeze({
  START_DATE: '2026-09-19',
  BATCH_SIZE: 10,
  CANDIDATE_LIMIT: 100,
  SEARCH_PAGE_SIZE: 100,
  SEARCH_MAX_PAGES: 5,
  CHECK_INTERVAL_MINUTES: 5,
  SUBJECT: 'Máte novou rezervaci! AutomyckaPerfect.cz!',
  HANDLER_FUNCTION: 'gmailRunAutomaticImport',
  TIMEZONE: 'Europe/Prague',
  ORDER_STATUS: 'ČEKÁ SE',
  SKIP_NAMES: ['David Falč'],
  SKIP_EMAILS: ['Rabitensro@gmail.com'],
  SKIP_PHONES: ['776 650 654']
});

/** Nejdřív spusť tento náhled, který nic neukládá ani nemaže. */
function perfect40Original_gmailPreviewNextBatch_() {
  gmailValidateDependenciesV23_();
  const messages = gmailFindUnimportedMessages_(PERFECT_GMAIL_CONFIG.CANDIDATE_LIMIT, {preview:true, ignoreRetry:true});
  const preview = messages.map(m => {
    try {
      if (gmailIsBlockedReservation_(m)) return {gmailId: m.getId(), stav:'BLOKOVÁNO — bez importu, e-mail zůstane zachován'};
      const p = gmailParseReservation_(m);
      const match = gmailFindExistingOrderWithoutMessageId_(p);
      return {gmailId:m.getId(), datum:p.datumObjednavky, cas:p.casPrijezdu,
        jmeno:p.jmenoPrijmeni, program:p.myciProgram, cena:p.cenaCelkem,
        stav:match ? 'MOŽNÁ DUPLICITA — po importu bude nabídnuta ke kontrole ve webu' : 'PŘIPRAVENO K IMPORTU'};
    } catch(e) {return {gmailId:m.getId(), stav:'CHYBA: '+e.message};}
  });
  Logger.log(JSON.stringify(preview,null,2));
  return preview;
}

/** Aktivuje jediný pětiminutový časovač. Spusť až po náhledu. */
function perfect40Original_gmailStartAutomaticImport_() {
  gmailValidateDependenciesV23_();
  GmailApp.search('subject:"Máte novou rezervaci"',0,1);
  gmailStopAutomaticImport();
  ScriptApp.newTrigger(PERFECT_GMAIL_CONFIG.HANDLER_FUNCTION)
    .timeBased().everyMinutes(PERFECT_GMAIL_CONFIG.CHECK_INTERVAL_MINUTES).create();
  Logger.log('Aktivní Gmail import PERFECT V24 — každých 5 minut.');
  return 'Aktivováno';
}
function perfect40Original_gmailStopAutomaticImport_() {
  let removed=0;
  ScriptApp.getProjectTriggers().forEach(t=>{
    if(t.getHandlerFunction()===PERFECT_GMAIL_CONFIG.HANDLER_FUNCTION){ScriptApp.deleteTrigger(t);removed++;}
  });
  Logger.log('Odstraněno Gmail triggerů: '+removed);
  return removed;
}

function perfect40Original_gmailRunAutomaticImport_() {
  const lock = LockService.getUserLock();
  if(!lock.tryLock(5000))return {version:'V24',busy:true};
  try{
    gmailValidateDependenciesV23_();
    const messages=gmailFindUnimportedMessages_(PERFECT_GMAIL_CONFIG.CANDIDATE_LIMIT);
    const result=gmailImportMessagesToDatabase_(messages);
    result.version='V24';result.finishedAt=new Date().toISOString();
    gmailV24SaveLast_(result);
    Logger.log('Gmail import V24: '+JSON.stringify(result));
    return result;
  }catch(e){
    gmailV24SaveLast_({version:'V24',finishedAt:new Date().toISOString(),fatalError:String(e.message||e).slice(0,300)});
    throw e;
  }finally{lock.releaseLock();}
}

/** Dnešek, včerejšek a jeden rotující historický den od 19. 9. 2026. */
function gmailFindUnimportedMessages_(limit,options) {
  options=options||{};
  const tz=PERFECT_GMAIL_CONFIG.TIMEZONE,now=new Date();
  const today=Utilities.formatDate(now,tz,'yyyy-MM-dd');
  const todayUTC=new Date(today+'T00:00:00Z');
  const firstUTC=new Date(PERFECT_GMAIL_CONFIG.START_DATE+'T00:00:00Z');
  const days=[todayUTC,new Date(todayUTC.getTime()-86400000)];
  const history=Math.max(0,Math.floor((todayUTC-firstUTC)/86400000));
  if(history>0){const slot=Math.floor(Date.now()/(5*60*1000));days.push(new Date(firstUTC.getTime()+(slot%history)*86400000));}
  const existing=gmailGetExistingMessageIds_(),seen=Object.create(null),found=[];
  const retry=options.ignoreRetry?{}:gmailV24RetryState_(!options.preview);
  const max=Math.max(1,Math.min(Number(limit)||100,PERFECT_GMAIL_CONFIG.CANDIDATE_LIMIT));
  for(const day of days){
    if(day<firstUTC||found.length>=max)continue;
    const localDay=Utilities.formatDate(day,'UTC','yyyy-MM-dd');
    const previous=Utilities.formatDate(new Date(day.getTime()-86400000),'UTC','yyyy/MM/dd');
    const next=Utilities.formatDate(new Date(day.getTime()+2*86400000),'UTC','yyyy/MM/dd');
    const query='after:'+previous+' before:'+next+' subject:"Máte novou rezervaci" -in:trash -in:spam';
    for(let page=0;page<PERFECT_GMAIL_CONFIG.SEARCH_MAX_PAGES&&found.length<max;page++){
      const threads=GmailApp.search(query,page*PERFECT_GMAIL_CONFIG.SEARCH_PAGE_SIZE,PERFECT_GMAIL_CONFIG.SEARCH_PAGE_SIZE);
      for(const thread of threads){
        for(const m of thread.getMessages()){
          const id=String(m.getId());
          if(seen[id]||existing[id]||(retry[id]&&retry[id].until>Date.now()))continue;
          if(!gmailIsReservationMessage_(m))continue;
          const stamp=m.getDate();
          if(Utilities.formatDate(stamp,tz,'yyyy-MM-dd')!==localDay||stamp>now)continue;
          seen[id]=true;
          found.push(m);
          if(found.length>=max)break;
        }
        if(found.length>=max)break;
      }
      if(threads.length<PERFECT_GMAIL_CONFIG.SEARCH_PAGE_SIZE)break;
    }
  }
  found.sort((a,b)=>a.getDate()-b.getDate());
  return found;
}


function gmailImportMessagesToDatabase_(messages) {
  const result={created:0,alreadyImported:0,existingWithoutId:0,blocked:0,errors:0,examined:0,remainingCandidates:0,problems:[]};
  const existingIds=gmailGetExistingMessageIds_(),started=Date.now();
  function problem(id,kind,error){
    if(result.problems.length<12)result.problems.push({gmailId:String(id).slice(0,60),kind,error:String(error).slice(0,160)});
    Logger.log('GMAIL '+kind+' | '+id+' | '+error);
  }
  for(let index=0;index<messages.length;index++){
    // Chybné ani blokované zprávy nespotřebují limit úspěšně zapsaných rezervací.
    if(result.created>=PERFECT_GMAIL_CONFIG.BATCH_SIZE||Date.now()-started>210000){result.remainingCandidates=messages.length-index;break;}
    const message=messages[index],id=String(message.getId()||'').trim();
    result.examined++;
    try{
      if(!id)throw new Error('Zpráva nemá Gmail Message ID.');
      if(existingIds[id]){result.alreadyImported++;continue;}
      if(!gmailIsReservationMessage_(message))continue;
      if(gmailIsBlockedReservation_(message)){
        result.blocked++;gmailV24Defer_(id,'BLOCKED',360);continue;
      }
      const p=gmailParseReservation_(message),conflict=gmailFindExistingOrderWithoutMessageId_(p);
      // Rozdílné zprávy mohou být dvě skutečné rezervace. Kontrolu nabídne web včetně historie.
      const created=databaseCreateOrder({
        DATUM_OBJEDNANI:p.datumObjednavky,CAS_PRIJEZDU:p.casPrijezdu,CAS_ODJEZDU:'',
        JMENO_PRIJMENI:p.jmenoPrijmeni,TELEFON:p.telefon,EMAIL:p.email,
        VOZIDLO:gmailNormalizeVehicleName_(p.vozidlo),MYCI_PROGRAM:p.myciProgram,
        CENA_CELKEM:p.cenaCelkem,CENA_PROGRAMU:p.cenaCelkem,DARKOVY_POUKAZ:p.darkovyPoukaz,
        DOPLNKY:p.doplnky,POZNAMKY:p.poznamky,STAV_OBJEDNAVKY:PERFECT_GMAIL_CONFIG.ORDER_STATUS,
        GMAIL_MESSAGE_ID:id,PERFECT_WEB_GENERATE_ID:'ONLINE'
      });
      if(!created||!created.ORDER_ID)throw new Error('Centrální databáze nevrátila ORDER_ID.');
      existingIds[id]=true;result.created++;gmailV24ClearRetry_(id);
      Logger.log('IMPORT OK | '+created.ORDER_ID+' | Gmail '+id);
    }catch(e){
      result.errors++;gmailV24Defer_(id,'ERROR',30);problem(id,'ERROR',e.message||String(e));
    }
  }
  return result;
}


/** Přísná ochrana před duplicitami z dřívějšího importu bez Gmail ID.
 * Pokud už je v DB stejný kontakt, datum a čas, objednávku znovu nevytváříme.
 * Gmail ID staré objednávce doplní samostatný schválený opravný modul V20.
 */
function gmailFindExistingOrderWithoutMessageId_(p){
  const date=p.datumObjednavky;
  const normalizedPhone=gmailDigits_(p.telefon).replace(/^420(?=\d{9}$)/,'');
  const normalizedEmail=String(p.email||'').toLowerCase();
  const matches=(databaseGetAllOrders()||[]).filter(o=>{
    if(gmailDateString_(o.DATUM_OBJEDNANI)!==date)return false;
    if(gmailTimeString_(o.CAS_PRIJEZDU)!==p.casPrijezdu)return false;
    const phone=gmailDigits_(o.TELEFON).replace(/^420(?=\d{9}$)/,'');
    const email=String(o.EMAIL||'').toLowerCase().trim();
    if(!((normalizedPhone&&phone===normalizedPhone)||(normalizedEmail&&email===normalizedEmail)))return false;
    return true;
  });
  // Konzervativně zastav i na vícenásobné shodě, ať nevznikne duplicita.
  // Podobné zákazníky nebo rodinné objednávky nepárujeme automaticky!
  return matches.length?matches[0]:null;
}

function gmailGetExistingMessageIds_(){
  const ids=Object.assign(Object.create(null),perfectDuplicates38ArchivedGmail_());
  (databaseGetAllOrders()||[]).forEach(o=>{if(o.GMAIL_MESSAGE_ID)ids[String(o.GMAIL_MESSAGE_ID).trim()]=true;});
  return ids;
}
function gmailIsReservationMessage_(m){
  const s=gmailNormalizeText_(m.getSubject());
  return s.includes('mate novou rezervaci')&&s.includes('automyckaperfect.cz');
}
function gmailIsBlockedReservation_(m){
  const text=gmailNormalizeText_(m.getPlainBody()||gmailHtmlToText_(m.getBody()||''));
  if(PERFECT_GMAIL_CONFIG.SKIP_NAMES.some(n=>text.includes(gmailNormalizeText_(n))))return true;
  if(PERFECT_GMAIL_CONFIG.SKIP_EMAILS.some(e=>text.includes(gmailNormalizeText_(e))))return true;
  const digits=gmailDigits_(text);
  return PERFECT_GMAIL_CONFIG.SKIP_PHONES.some(p=>digits.includes(gmailDigits_(p)));
}
function gmailParseReservation_(message){
  const plain=gmailPrepareMailBody_(message.getPlainBody()||'');
  let firstError;
  if(plain){try{return gmailV24ParseBody_(plain);}catch(e){firstError=e;}}
  const html=gmailPrepareMailBody_(gmailHtmlToText_(message.getBody()||''));
  if(html&&html!==plain){try{return gmailV24ParseBody_(html);}catch(e){if(!firstError)firstError=e;}}
  throw firstError||new Error('Zpráva nemá použitelné textové ani HTML tělo.');
}
function gmailV24ParseBody_(body){
  const f=gmailExtractFields_(body);
  const name=gmailCleanValue_(f.customer),email=gmailExtractEmail_(f.email),phone=gmailFormatPhone_(f.phone);
  const visitDate=gmailParseDate_(f.date),arrival=gmailParseTime_(f.time);
  const vehicle=gmailCleanValue_(f.vehicle),service=gmailParseService_(f.service);
  if(!name)throw new Error('Chybí jméno zákazníka.');
  if(!email)throw new Error('Chybí nebo je chybný e-mail.');
  if(!phone)throw new Error('Chybí nebo je chybný telefon.');
  if(!visitDate)throw new Error('Chybí nebo je chybný datum návštěvy.');
  if(!arrival)throw new Error('Chybí nebo je chybný čas příjezdu.');
  if(!vehicle)throw new Error('Chybí vozidlo.');
  if(!service.program||service.price===null)throw new Error('Chybí mycí program nebo cena.');
  const min=Number(arrival.slice(0,2))*60+Number(arrival.slice(3));
  if(min<8*60||min>19*60+30)throw new Error('Čas '+arrival+' je mimo 08:00–19:30. Nutná kontrola e-mailu.');
  const notes=[];
  if(service.variant)notes.push('Varianta: '+service.variant);
  if(f.message)notes.push('Zpráva zákazníka: '+gmailCleanValue_(f.message));
  if(f.voucherApplied&&!f.voucherCode)notes.push('Poukaz: '+gmailCleanValue_(f.voucherApplied));
  return {datumObjednavky:visitDate,casPrijezdu:arrival,jmenoPrijmeni:name,email,telefon:phone,
    vozidlo:vehicle,myciProgram:service.program,cenaCelkem:service.price,
    darkovyPoukaz:gmailCleanValue_(f.voucherCode),doplnky:gmailCleanValue_(f.extras),poznamky:notes.join('\n')};
}


/** Vozidlo ukládáme bez připojeného obecného typu karoserie; nepřidělujeme žádná VEHICLE_ID sami. */
function gmailNormalizeVehicleName_(raw) {
  const cleaned = gmailCleanValue_(raw).replace(/\s+/g, ' ').trim();
  const withoutBody = cleaned.replace(/\s+(SUV|CUV|KOMBI|COMBI|SEDAN|HATCHBACK|LIFTBACK|COUP[EÉ]|KUP[EÉ]|CABRIO|KABRIOLET|ROADSTER|PICKUP|PICK-UP|VAN|MPV)$/i,'').trim();
  return withoutBody || cleaned;
}

/** Test přístupu ke Gmailu: nic nevytváří a neukládá. */
function perfect40Original_gmailTestPermissionsV23_() {
  const threads = GmailApp.search('subject:"Máte novou rezervaci"', 0, 1);
  const status = {gmailReadOK:true, foundThreads:threads.length, timezone:PERFECT_GMAIL_CONFIG.TIMEZONE};
  Logger.log(JSON.stringify(status, null, 2));
  return status;
}

/** Kontrolní výpis aktuálních časových spouštěčů tohoto importu. */
function perfect40Original_gmailAutomaticImportStatus_() {
  const triggers = ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===PERFECT_GMAIL_CONFIG.HANDLER_FUNCTION);
  const status = {active:triggers.length>0, triggerCount:triggers.length,
    intervalMinutes:PERFECT_GMAIL_CONFIG.CHECK_INTERVAL_MINUTES,
    startDate:PERFECT_GMAIL_CONFIG.START_DATE};
  const last=PropertiesService.getUserProperties().getProperty('PERFECT_GMAIL_V24_LAST');
  if(last)try{status.lastRun=JSON.parse(last);}catch(e){}
  Logger.log(JSON.stringify(status,null,2));
  return status;
}

/** Starší názvy testovacích funkcí zachovány kvůli kompatibilitě. Pouze čtou. */
function perfect40Original_gmailDryRun10Reservations_(){return gmailPreviewNextBatch();}
function perfect40Original_gmailTestLoad10Reservations_(){
  const messages=gmailFindUnimportedMessages_(10);
  const result=messages.map(m=>({id:m.getId(),date:m.getDate(),subject:m.getSubject()}));
  Logger.log(JSON.stringify(result,null,2));return result;
}
function perfect40Original_gmailTestParse10Reservations_(){return gmailPreviewNextBatch();}

function gmailExtractFields_(body){
  const names={
    'zakaznik':'customer','jmeno zakaznika':'customer','jmeno a prijmeni':'customer','jmeno':'customer',
    'email':'email','e-mail':'email','telefon':'phone','telefonni cislo':'phone',
    'datum':'date','datum prijezdu':'date','cas':'time','cas prijezdu':'time',
    'typ vozu':'vehicle','vozidlo':'vehicle',
    'vyber sluzby':'service','myci program':'service','sluzba':'service',
    'doplnky':'extras','doplnkove sluzby':'extras',
    'uplatnuji darkovy poukaz':'voucherApplied','kod darkoveho poukazu':'voucherCode',
    'zprava':'message','poznamka':'message','poznamky':'message'
  };
  const result=Object.create(null);let key='';
  String(body).split('\n').forEach(raw=>{
    const line=raw.trim();
    const bare=names[gmailNormalizeText_(line)];
    if(bare){key=bare;return;}
    const m=/^([^:]{2,80}):\s*(.*)$/.exec(line);
    if(m&&names[gmailNormalizeText_(m[1])]){key=names[gmailNormalizeText_(m[1])];if(m[2])result[key]=(result[key]?result[key]+'\n':'')+m[2];return;}
    if(key&&line){
      if(/^(car lazebn[ií]k|team automycka|nezapomen klienta kontaktovat)/i.test(line)){key='';return;}
      result[key]=(result[key]?result[key]+'\n':'')+line;
    }
  });
  return result;
}
function gmailParseService_(v){
  const s=gmailCleanValue_(v).split('\n')[0];
  const variant=(s.match(/\((KOMBI|SUV|[^)]{1,30})\)/i)||[])[1]||'';
  const priceMatches=Array.from(s.matchAll(/(\d[\d .\u00a0]*)(?:,[-–])?\s*Kč(?=\s|$|[,.;])/gi));
  // Preferujeme poslední cenu u programu: např. CLASSIC od 899 Kč.
  const priceMatch=priceMatches.length?priceMatches[priceMatches.length-1]:null;
  const price=priceMatch?Number(priceMatch[1].replace(/[^\d]/g,'')):null;
  let program=s;
  if(priceMatch)program=program.slice(0,priceMatch.index);
  program=program.replace(/\([^)]*\)/g,'').replace(/\bod\b\s*$/i,'').replace(/\s+/g,' ').trim().toUpperCase();
  return {program,price:Number.isFinite(price)?price:null,variant:variant.toUpperCase()};
}
function gmailParseDate_(v){
  const a=String(v||'').match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  const b=String(v||'').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(!a&&!b)return '';
  const y=Number(a?a[3]:b[1]),mo=Number(a?a[2]:b[2]),d=Number(a?a[1]:b[3]);
  const t=new Date(Date.UTC(y,mo-1,d));
  if(t.getUTCFullYear()!==y||t.getUTCMonth()!==mo-1||t.getUTCDate()!==d)return '';
  return String(y).padStart(4,'0')+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function gmailParseTime_(v){
  const m=String(v||'').match(/\b(\d{1,2})[:.](\d{2})\s*(AM|PM)?\b/i);
  if(!m)return '';
  let h=Number(m[1]);const min=Number(m[2]);
  if(m[3]){if(h<1||h>12)return '';h=(h%12)+(m[3].toUpperCase()==='PM'?12:0);}
  if(h>23||min>59)return '';
  return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');
}
function gmailDateString_(v){
  if(v instanceof Date)return Utilities.formatDate(v,PERFECT_GMAIL_CONFIG.TIMEZONE,'yyyy-MM-dd');
  return gmailParseDate_(String(v||''))||(/^\d{4}-\d{2}-\d{2}/.exec(String(v||''))||[])[0]||'';
}
function gmailTimeString_(v){
  if(v instanceof Date)return Utilities.formatDate(v,PERFECT_GMAIL_CONFIG.TIMEZONE,'HH:mm');
  return gmailParseTime_(String(v||''));
}
function gmailExtractEmail_(v){const a=String(v||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);return a?a[0].toLowerCase():'';}
function gmailFormatPhone_(v){
  let p=gmailDigits_(v);if(p.startsWith('00420'))p=p.slice(2);if(p.startsWith('420')&&p.length===12)p=p.slice(3);
  return p.length===9?'+420 '+p.slice(0,3)+' '+p.slice(3,6)+' '+p.slice(6):'';
}
function gmailDigits_(v){return String(v||'').replace(/\D/g,'');}
function gmailCleanValue_(v){return String(v||'').replace(/\u00a0/g,' ').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(x=>x&&!/^(car lazebn[ií]k|team automycka|nezapomen klienta kontaktovat)/i.test(x)).join(' ').trim();}
function gmailPrepareMailBody_(v){return String(v||'').replace(/\r/g,'').replace(/\u00a0/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
function gmailHtmlToText_(v){
  const entities={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
  return String(v||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'')
    .replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(?:p|div|li|tr|td|th|h[1-6])>/gi,'\n')
    .replace(/<[^>]+>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|nbsp|amp|lt|gt|quot|apos);/gi,function(all,key){
      if(key[0]!=='#')return entities[key.toLowerCase()];
      const cp=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
      return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):' ';
    });
}

function gmailNormalizeText_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}

/** Zapíše pouze centrální DB; blokuje import v nekompletním projektu. */
function gmailValidateDependenciesV23_() {
  const missing=[];
  if(typeof databaseGetAllOrders!=='function')missing.push('databaseGetAllOrders');
  if(typeof databaseCreateOrder!=='function')missing.push('databaseCreateOrder');
  if(typeof generateOrderId!=='function')missing.push('generateOrderId');
  if(missing.length) throw new Error('Chybí funkce centrální DB / generátoru: '+missing.join(', '));
  gmailV24CheckHeaders_();
}


/** V24: čekání chybových zpráv je jen stav fronty, nikoliv potvrzení importu.
 * Za importovanou se zpráva považuje výhradně podle GMAIL_MESSAGE_ID v centrální DB.
 * E-maily se zde neoznačují, nepřesouvají ani nemažou.
 */
function gmailV24RetryState_(cleanup){
  const props=PropertiesService.getUserProperties(),all=props.getProperties(),map=Object.create(null),prefix='PERFECT_GMAIL_V24_RETRY_';
  Object.keys(all).filter(k=>k.indexOf(prefix)===0).forEach(k=>{
    try{const v=JSON.parse(all[k]);if(v.until>Date.now())map[k.slice(prefix.length)]=v;else if(cleanup)props.deleteProperty(k);}
    catch(e){if(cleanup)props.deleteProperty(k);}
  });
  return map;
}
function gmailV24Defer_(id,kind,minutes){
  if(!id)return;
  try{PropertiesService.getUserProperties().setProperty('PERFECT_GMAIL_V24_RETRY_'+id,JSON.stringify({kind,until:Date.now()+minutes*60000}));}
  catch(e){Logger.log('Fronta: čekání nebylo uloženo; zpráva bude při dalším běhu znovu zkontrolována.');}
}
function gmailV24ClearRetry_(id){try{PropertiesService.getUserProperties().deleteProperty('PERFECT_GMAIL_V24_RETRY_'+id);}catch(e){}}
function gmailV24SaveLast_(result){
  try{PropertiesService.getUserProperties().setProperty('PERFECT_GMAIL_V24_LAST',JSON.stringify(result));}
  catch(e){Logger.log('Výsledek je pouze v protokolu spuštění.');}
}
function gmailV24CheckHeaders_(){
  if(typeof PERFECT_DB_ORDER_HEADERS==='undefined'||typeof databaseGetOrdersSheet_!=='function')throw new Error('Chybí rozhraní centrální databáze objednávek.');
  const expected=Array.from(PERFECT_DB_ORDER_HEADERS);
  const actual=databaseGetOrdersSheet_().getRange(2,1,1,expected.length).getValues()[0].map(x=>String(x).trim());
  if(expected.some((x,i)=>actual[i]!==x))throw new Error('Hlavička databáze objednávek nesouhlasí s modulem 01. Import byl zastaven.');
}
/** První spuštění po náhradě souboru: ověří přístup, importuje a aktivuje časovač. */
function perfect40Original_perfectGmailSpustitV24_(){
  gmailValidateDependenciesV23_();gmailV24CheckHeaders_();
  if(typeof opravitValidaciGmailImportu!=='function')throw new Error('Nejdřív vlož opravený soubor 01a_Design databáze.gs.');
  opravitValidaciGmailImportu();
  GmailApp.search('subject:"Máte novou rezervaci"',0,1);
  const result=gmailRunAutomaticImport();
  if(result.busy)throw new Error('Import již běží. Zkus tuto funkci znovu po dokončení běhu.');
  gmailStartAutomaticImport();
  Logger.log('NASTAVENÍ V24 HOTOVO | '+JSON.stringify(result));
  return result;
}
/** Pouze čtení. Zahrne i zprávy odložené kvůli chybě. */
function perfect40Original_perfectGmailDiagnostikaV24_(){
  const out={version:'V24',checkedAt:new Date().toISOString(),timezone:Session.getScriptTimeZone(),triggers:[],messages:[],errors:[]};
  try{out.triggers=ScriptApp.getProjectTriggers().map(t=>t.getHandlerFunction());}catch(e){out.errors.push('Spouštěče: '+e.message);}
  try{
    gmailValidateDependenciesV23_();gmailV24CheckHeaders_();
    const existing=gmailGetExistingMessageIds_();
    const found=gmailFindUnimportedMessages_(100,{preview:true,ignoreRetry:true});
    out.candidateCount=found.length;
    out.messages=found.slice(0,30).map(m=>{
      const item={gmailId:String(m.getId()),received:Utilities.formatDate(m.getDate(),PERFECT_GMAIL_CONFIG.TIMEZONE,'yyyy-MM-dd HH:mm'),inDatabase:!!existing[String(m.getId())]};
      try{item.blocked=gmailIsBlockedReservation_(m);const p=gmailParseReservation_(m);item.parser='OK';const c=gmailFindExistingOrderWithoutMessageId_(p);item.existingOrder=c?String(c.ORDER_ID):null;}
      catch(e){item.error=String(e.message||e).slice(0,200);}
      return item;
    });
  }catch(e){out.errors.push(String(e.message||e));}
  const last=PropertiesService.getUserProperties().getProperty('PERFECT_GMAIL_V24_LAST');
  if(last)try{out.lastRun=JSON.parse(last);}catch(e){}
  Logger.log(JSON.stringify(out,null,2));return out;
}

// 05_GENERATOR_ORDER_ID.gs.txt
/**
 * AUTOMYČKA PERFECT 2.0 — 05_GENERATOR_ORDER_ID.gs — V28
 * Jedna měsíční řada N/OF. Měsíc se určuje podle data příjezdu.
 * Pořadové číslo je přiděleno při vytvoření objednávky, nikdy se nepřečísluje.
 * VOLAT JEN z databaseCreateOrder() pod perfectDatabaseWithLock_().
 * Modul sám do databáze NIC nezapisuje.
 */
const PERFECT_ORDER_ID_V28_TZ = 'Europe/Prague';

function perfect40Original_generateOrderId_(datumObjednavky, sourceType) {
  if (typeof databaseGetAllOrders !== 'function') {
    throw new Error('Chybí databaseGetAllOrders() z centrální databáze.');
  }
  const date = orderIdNormalizeDate_(datumObjednavky);
  if (!date) throw new Error('ORDER_ID: chybí platné datum příjezdu.');
  const month = Utilities.formatDate(date, PERFECT_ORDER_ID_V28_TZ, 'MMyy');
  const type = String(sourceType == null ? 'ONLINE' : sourceType).trim().toUpperCase();
  if (!['ONLINE', 'N', 'OFFLINE', 'OF'].includes(type)) {
    throw new Error('ORDER_ID: neznámý typ zakázky ' + type);
  }
  const prefix = type === 'OFFLINE' || type === 'OF' ? 'OF' : 'N';
  const matcher = new RegExp('^(?:N|OF)' + month + '-([0-9]+)$', 'i');
  const orders = databaseGetAllOrders();
  if (!Array.isArray(orders)) throw new Error('Databáze nevrátila pole objednávek.');

  let maximum = 0;
  const seen = new Set();
  orders.forEach(function (o) {
    const id = String(o && (o.ORDER_ID || o.orderId) || '').trim().toUpperCase();
    if (!id) return;
    if (seen.has(id)) throw new Error('Duplicitní ORDER_ID v databázi: ' + id + '. Generování zastaveno.');
    seen.add(id);
    const match = matcher.exec(id);
    if (match) {
      const n = Number(match[1]);
      if (!Number.isSafeInteger(n) || n < 1) throw new Error('Neplatné pořadí ORDER_ID: ' + id);
      maximum = Math.max(maximum, n);
    }
  });

  // Archiv testovacích objednávek: ani archivovaná ID nesmějí být znovu přidělena.
  if (typeof perfectDatabaseGetSpreadsheet_ === 'function') {
    const archive = perfectDatabaseGetSpreadsheet_().getSheetByName('__PERFECT_ARCHIV_TEST_OBJEDNAVEK');
    if (archive && archive.getLastRow() >= 2) {
      // V archivu je ORDER_ID ve sloupci B.
      archive.getRange(2, 2, archive.getLastRow() - 1, 1).getValues().forEach(function (r) {
        const id = String(r[0] || '').trim().toUpperCase();
        const match = matcher.exec(id);
        if (match) {
          const n = Number(match[1]);
          if (!Number.isSafeInteger(n) || n < 1) throw new Error('Neplatné archivní ORDER_ID: ' + id);
          maximum = Math.max(maximum, n);
        }
      });
    }
  }

  // Znovu nepřidělit ani nejvyšší ID bezpečně vyřazené duplicity nebo admin archivu.
  [ ['__PERFECT_DUPLICITY_ARCHIV','REMOVED_ORDER_ID'], ['__PERFECT_ARCHIV_OBJEDNAVEK_ADMIN','ORDER_ID'] ].forEach(function(spec){
    var sh=perfectDatabaseGetSpreadsheet_().getSheetByName(spec[0]);if(!sh||sh.getLastRow()<2)return;
    var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0],column=headers.indexOf(spec[1])+1;
    if(!column)throw Error('Chybí ID sloupec v archivu '+spec[0]);
    sh.getRange(2,column,sh.getLastRow()-1,1).getValues().forEach(function(row){var m=matcher.exec(String(row[0]||'').trim());if(m)maximum=Math.max(maximum,Number(m[1]));});
  });
  const next = maximum + 1;
  if (!Number.isSafeInteger(next)) throw new Error('Měsíční číselná řada je vyčerpaná.');
  const id = prefix + month + '-' + String(next).padStart(2, '0');
  if (seen.has(id)) throw new Error('Kolize ORDER_ID: ' + id);
  return id;
}

function orderIdNormalizeDate_(value) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? new Date(value.getTime()) : null;
  }
  const s = String(value == null ? '' : value).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return orderIdDateParts_(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{4})\.?$/.exec(s);
  if (m) return orderIdDateParts_(+m[3], +m[2], +m[1]);
  return null;
}

function orderIdDateParts_(year, month, day) {
  if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return Utilities.parseDate(iso, PERFECT_ORDER_ID_V28_TZ, 'yyyy-MM-dd');
}

// Zachování kompatibility se staršími moduly.
function orderIdCreatePrefix_(year, month) {
  return 'N' + String(month).padStart(2, '0') + String(year).slice(-2) + '-';
}
function orderIdBuild_(prefix, number) {
  const n = Number(number);
  if (!prefix || !Number.isSafeInteger(n) || n < 1) throw new Error('Neplatné údaje pro ORDER_ID.');
  return String(prefix) + String(n).padStart(2, '0');
}

/** Nezapisuje nic: pouze ukáže, jaké číslo by dostala další zakázka. */
function perfect40Original_perfectOrderIdPreviewV28_() {
  const date = Utilities.formatDate(new Date(), PERFECT_ORDER_ID_V28_TZ, 'yyyy-MM-dd');
  const result = {
    date: date,
    online: generateOrderId(date, 'ONLINE'),
    offline: generateOrderId(date, 'OFFLINE'),
    note: 'Obě varianty mají stejné pořadí, protože nebyla vytvořena nová objednávka.'
  };
  Logger.log(JSON.stringify(result));
  return result;
}

// 25_PROFIL_STATISTIKY.gs.txt
/**
 * AUTOMYČKA PERFECT 2.0 – 25_PROFIL_STATISTIKY.gs
 * Read-only statistiky přihlášeného pracovníka.
 * Vyžaduje existující autentizaci perfectRepairRequireUser_ a centrální databaseGetAllOrders.
 * NEZAPISUJE do objednávek, nemění ceny, IDs ani přihlášení.
 * Vrací pouze datum, číslo objednávky, vozidlo a program – NIKDY tržby.
 */
function perfect40Original_perfectStaffGetMyStatistics_(token) {
  const user=perfectRepairRequireUser_(token);
  if(typeof databaseGetAllOrders!=='function')throw new Error('Chybí funkce centrální databáze databaseGetAllOrders.');
  const normalize=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
  const names=[user.firstName,user.surname].filter(Boolean).join(' ').trim();
  const id=normalize(user.id), username=normalize(user.username), full=normalize(names);
  // Identita podle stabilního ID nebo uživatelského jména. Samotné jméno
  // uznáme jen pokud je mezi účty jednoznačné, aby se data nepletla.
  const users=typeof perfectRepairUsers_==='function'?perfectRepairUsers_():[];
  const sameName=full?users.filter(u=>normalize([u.firstName,u.surname].filter(Boolean).join(' '))===full).length:0;
  const mine=raw=>{const v=normalize(raw);return !!v&&(v===id||v===username||(sameName===1&&v===full));};
  const dateStr=value=>{
    if(value instanceof Date){return isNaN(value.getTime())?'':Utilities.formatDate(value,'Europe/Prague','yyyy-MM-dd');}
    const s=String(value==null?'':value).trim();
    let m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
    m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s);
    return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';
  };
  const orders=databaseGetAllOrders().filter(o=>{
    const status=normalize(o.STAV_OBJEDNAVKY||'');
    return mine(o.PRACOVNIK)&&(/dokonc|vyhotov/.test(status));
  }).map(o=>({
    orderId:String(o.ORDER_ID||''),
    date:dateStr(o.DATUM_OBJEDNANI),
    vehicle:String(o.VOZIDLO||''),
    program:String(o.MYCI_PROGRAM||'')
  })).sort((a,b)=>b.date.localeCompare(a.date)||b.orderId.localeCompare(a.orderId));
  return {success:true,orders};
}

// 26_ADMIN_UZIVATELE.gs.txt
/** AUTOMYČKA PERFECT 2.0 — 26_ADMIN_UZIVATELE.gs
 * Samostatný modul, bez doGet, bez přepisování existujících účtů.
 * Vyžaduje stávající backend: perfectAuthRequireAdmin_, perfectRepairUsers_,
 * perfectRepairProps_, perfectRepairLock_, perfectAuthSetPasswordFields_, PERFECT_REPAIR.
 */
const PERFECT_ADMIN_USERS_AUDIT_KEY_ = 'PERFECT_ADMIN_USERS_AUDIT_V1';

function perfectAdminUsersPublic_(u) {
  return {id:String(u.id||''),username:String(u.username||''),firstName:String(u.firstName||''),
    surname:String(u.surname||''),role:['ADMINISTRATOR','SMENAR'].indexOf(u.role)>=0?u.role:'PRACOVNIK',
    active:u.active!==false,mustChangePassword:!!u.mustChangePassword,hasAvatar:!!u.avatarFileId};
}
function perfectAdminUsersValidateText_(value,max,label,required){
  var s=String(value==null?'':value).trim();
  if((required&&!s)||s.length>max||/[<>\r\n\x00-\x1f]/.test(s)) throw new Error('Neplatné pole: '+label+'.');
  return s;
}
function perfectAdminUsersAudit_(actor,action,target,details){
  var props=perfectRepairProps_(),arr=[];
  try{arr=JSON.parse(props.getProperty(PERFECT_ADMIN_USERS_AUDIT_KEY_)||'[]');if(!Array.isArray(arr))arr=[];}catch(e){arr=[];}
  arr.push({at:new Date().toISOString(),actorId:actor.id,actor:actor.username,
    action:action,targetId:target.id,target:target.username,details:details||''});
  props.setProperty(PERFECT_ADMIN_USERS_AUDIT_KEY_,JSON.stringify(arr.slice(-100)));
}
function perfect40Original_perfectAdminUsersList_(token){
  perfectAuthRequireAdmin_(token);
  return {users:perfectRepairUsers_().map(perfectAdminUsersPublic_)
    .sort(function(a,b){return (a.firstName+' '+a.surname).localeCompare(b.firstName+' '+b.surname,'cs');})};
}
function perfect40Original_perfectAdminUsersHistory_(token){
  perfectAuthRequireAdmin_(token);
  var items=[];
  try{items=JSON.parse(perfectRepairProps_().getProperty(PERFECT_ADMIN_USERS_AUDIT_KEY_)||'[]');}catch(e){}
  return {items:Array.isArray(items)?items.slice(-50).reverse():[]};
}
function perfect40Original_perfectAdminUsersSave_(token,input){
  var actor=perfectAuthRequireAdmin_(token);
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Chybí údaje účtu.');
  return perfectRepairLock_(function(){
    // Ověřit znovu uvnitř zámku kvůli souběžným změnám oprávnění.
    actor=perfectAuthRequireAdmin_(token);
    var props=perfectRepairProps_(),users=perfectRepairUsers_();
    var id=String(input.id||'').trim(),isNew=!id;
    var username=perfectAdminUsersValidateText_(input.username,40,'uživatelské jméno',true).toLowerCase();
    if(!/^[a-z0-9._-]{3,40}$/.test(username))throw new Error('Uživatelské jméno: 3–40 znaků, pouze a-z, 0-9, tečka, pomlčka a podtržítko.');
    var firstName=perfectAdminUsersValidateText_(input.firstName,70,'jméno',true);
    var surname=perfectAdminUsersValidateText_(input.surname,70,'příjmení',false);
    var role=String(input.role||'PRACOVNIK');
    if(['PRACOVNIK','SMENAR','ADMINISTRATOR'].indexOf(role)<0)throw new Error('Neplatná role.');
    var active=input.active!==false;
    var user=isNew?null:users.find(function(u){return u.id===id;});
    if(!isNew&&!user)throw new Error('Účet nebyl nalezen.');
    if(users.some(function(u){return u.username.toLowerCase()===username&&(!user||u.id!==user.id);}))throw new Error('Uživatelské jméno už existuje.');
    if(user&&user.id===actor.id&&(!active||role!=='ADMINISTRATOR'))throw new Error('Nemůžeš deaktivovat ani odebrat roli svému administrátorskému účtu.');
    var password=String(input.password||'');
    if(isNew&&!password)throw new Error('Nový účet musí mít dočasné heslo (alespoň 10 znaků).');
    if(password&&(password.length<10||password.length>128))throw new Error('Heslo musí mít 10–128 znaků.');
    if(!user){user={id:Utilities.getUuid(),username:username,active:true};users.push(user);}
    var previous={username:user.username,role:user.role,active:user.active!==false};
    user.username=username;user.firstName=firstName;user.surname=surname;user.role=role;user.active=active;
    if(password){perfectAuthSetPasswordFields_(user,password);user.mustChangePassword=true;}
    if(!users.some(function(u){return u.role==='ADMINISTRATOR'&&u.active!==false;}))throw new Error('Musí zůstat alespoň jeden aktivní administrátor.');
    // Uchovat ostatní vlastnosti uživatele (ID, avatarFileId, ...).
    props.setProperty(PERFECT_REPAIR.USERS,JSON.stringify(users));
    // Zneplatnit relace při resetu hesla, deaktivaci nebo změně role.
    if(!isNew&&(password||previous.role!==role||previous.active!==active)){
      var all=props.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){
        try{var s=JSON.parse(all[k]);if(s.userId===user.id)props.deleteProperty(k);}catch(e){}
      });
    }
    try{perfectAdminUsersAudit_(actor,isNew?'CREATE':'UPDATE',user,
      (previous.username!==username?'uživatelské jméno; ':'')+
      (previous.role!==role?'role; ':'')+(previous.active!==active?'aktivace; ':'')+
      (password?'reset hesla; ':'')+'profil');}
    catch(err){console.error('Audit účtu se nepodařilo zapsat: '+err.message);}
    return {success:true,user:perfectAdminUsersPublic_(user),sessionRevoked:!isNew&&(!!password||previous.role!==role||previous.active!==active)};
  });
}
function perfect40Original_perfectAdminUsersGetAvatar_(token,id){
  perfectAuthRequireAdmin_(token);
  var u=perfectRepairUsers_().find(function(x){return x.id===String(id||'');});
  if(!u||!u.avatarFileId)return {data:''};
  try{
    var blob=DriveApp.getFileById(u.avatarFileId).getBlob(),mime=blob.getContentType();
    if(!/^image\/(jpeg|png|webp)$/.test(mime)||blob.getSize()>180000)return {data:''};
    return {data:'data:'+mime+';base64,'+Utilities.base64Encode(blob.getBytes())};
  }catch(e){return {data:''};}
}

// 27_LOGA_AUTOMOBILEK.gs.txt
/**
 * AUTOMYČKA PERFECT 2.0 — 27_LOGA_AUTOMOBILEK.gs
 * Bezpečná syntaktická oprava původního JSON manifestu.
 * Pouze evidence cest k 42 logům. Žádný zápis do databáze.
 * POZOR: cesty velka/... a mala/... nejsou veřejné URL obrázků.
 * Tento soubor sám o sobě nehostuje PNG ani je nenapojuje do webu.
 */
var PERFECT_LOGA_42_MANIFEST = {
  "project": "AUTOMYČKA PERFECT 2.0",
  "version": "LOGA-42-V1",
  "description": "42 automobilek, dvě originální PNG velikosti. Připraveno k hostování, zatím nenapojeno na web.",
  "brands": [
    {
      "key": "alfa-romeo",
      "large": "velka/alfa-romeo.png",
      "small": "mala/alfa-romeo.png"
    },
    {
      "key": "audi",
      "large": "velka/audi.png",
      "small": "mala/audi.png"
    },
    {
      "key": "bentley",
      "large": "velka/bentley.png",
      "small": "mala/bentley.png"
    },
    {
      "key": "bmw",
      "large": "velka/bmw.png",
      "small": "mala/bmw.png"
    },
    {
      "key": "chrysler",
      "large": "velka/chrysler.png",
      "small": "mala/chrysler.png"
    },
    {
      "key": "citroen",
      "large": "velka/citroen.png",
      "small": "mala/citroen.png"
    },
    {
      "key": "cupra",
      "large": "velka/cupra.png",
      "small": "mala/cupra.png"
    },
    {
      "key": "dacia",
      "large": "velka/dacia.png",
      "small": "mala/dacia.png"
    },
    {
      "key": "ds",
      "large": "velka/ds.png",
      "small": "mala/ds.png"
    },
    {
      "key": "ferrari",
      "large": "velka/ferrari.png",
      "small": "mala/ferrari.png"
    },
    {
      "key": "fiat",
      "large": "velka/fiat.png",
      "small": "mala/fiat.png"
    },
    {
      "key": "ford",
      "large": "velka/ford.png",
      "small": "mala/ford.png"
    },
    {
      "key": "hyundai",
      "large": "velka/hyundai.png",
      "small": "mala/hyundai.png"
    },
    {
      "key": "infiniti",
      "large": "velka/infiniti.png",
      "small": "mala/infiniti.png"
    },
    {
      "key": "jaguar",
      "large": "velka/jaguar.png",
      "small": "mala/jaguar.png"
    },
    {
      "key": "jeep",
      "large": "velka/jeep.png",
      "small": "mala/jeep.png"
    },
    {
      "key": "kia",
      "large": "velka/kia.png",
      "small": "mala/kia.png"
    },
    {
      "key": "lamborghini",
      "large": "velka/lamborghini.png",
      "small": "mala/lamborghini.png"
    },
    {
      "key": "lancia",
      "large": "velka/lancia.png",
      "small": "mala/lancia.png"
    },
    {
      "key": "land-rover",
      "large": "velka/land-rover.png",
      "small": "mala/land-rover.png"
    },
    {
      "key": "lexus",
      "large": "velka/lexus.png",
      "small": "mala/lexus.png"
    },
    {
      "key": "maserati",
      "large": "velka/maserati.png",
      "small": "mala/maserati.png"
    },
    {
      "key": "mazda",
      "large": "velka/mazda.png",
      "small": "mala/mazda.png"
    },
    {
      "key": "mercedes-benz",
      "large": "velka/mercedes-benz.png",
      "small": "mala/mercedes-benz.png"
    },
    {
      "key": "mg",
      "large": "velka/mg.png",
      "small": "mala/mg.png"
    },
    {
      "key": "mitsubishi",
      "large": "velka/mitsubishi.png",
      "small": "mala/mitsubishi.png"
    },
    {
      "key": "nissan",
      "large": "velka/nissan.png",
      "small": "mala/nissan.png"
    },
    {
      "key": "opel",
      "large": "velka/opel.png",
      "small": "mala/opel.png"
    },
    {
      "key": "peugeot",
      "large": "velka/peugeot.png",
      "small": "mala/peugeot.png"
    },
    {
      "key": "porsche",
      "large": "velka/porsche.png",
      "small": "mala/porsche.png"
    },
    {
      "key": "renault",
      "large": "velka/renault.png",
      "small": "mala/renault.png"
    },
    {
      "key": "rolls-royce",
      "large": "velka/rolls-royce.png",
      "small": "mala/rolls-royce.png"
    },
    {
      "key": "saab",
      "large": "velka/saab.png",
      "small": "mala/saab.png"
    },
    {
      "key": "seat",
      "large": "velka/seat.png",
      "small": "mala/seat.png"
    },
    {
      "key": "skoda",
      "large": "velka/skoda.png",
      "small": "mala/skoda.png"
    },
    {
      "key": "ssangyong",
      "large": "velka/ssangyong.png",
      "small": "mala/ssangyong.png"
    },
    {
      "key": "subaru",
      "large": "velka/subaru.png",
      "small": "mala/subaru.png"
    },
    {
      "key": "suzuki",
      "large": "velka/suzuki.png",
      "small": "mala/suzuki.png"
    },
    {
      "key": "tesla",
      "large": "velka/tesla.png",
      "small": "mala/tesla.png"
    },
    {
      "key": "toyota",
      "large": "velka/toyota.png",
      "small": "mala/toyota.png"
    },
    {
      "key": "volkswagen",
      "large": "velka/volkswagen.png",
      "small": "mala/volkswagen.png"
    },
    {
      "key": "volvo",
      "large": "velka/volvo.png",
      "small": "mala/volvo.png"
    }
  ]
};

/** Vrátí nezměněný manifest. */
function perfect40Original_perfectLoga42GetManifest_() {
  return JSON.parse(JSON.stringify(PERFECT_LOGA_42_MANIFEST));
}

/** Vrátí záznam pro značku (nebo null), bez práce s Diskem. */
function perfect40Original_perfectLoga42GetBrand_(brandKey) {
  var key = String(brandKey || '').toLowerCase().trim();
  var brands = PERFECT_LOGA_42_MANIFEST.brands;
  for (var i = 0; i < brands.length; i++) {
    if (brands[i].key === key) return JSON.parse(JSON.stringify(brands[i]));
  }
  return null;
}

/** Jednoduchý diagnostický test, bez vedlejších účinků. */
function perfect40Original_perfectLoga42Test_() {
  var m = perfectLoga42GetManifest();
  if (m.brands.length !== 42) throw new Error('Očekáváno 42 automobilek.');
  Logger.log('OK: ' + m.brands.length + ' značek. Například: ' + m.brands[0].key);
  Logger.log('PNG zatím nejsou tímto modulem hostována ani napojena.');
}

// 27a_LOGA_DRIVE_NAPOJENI.gs.txt
/** Náhrada 27a_LOGA_DRIVE_NAPOJENI.gs. Soukromá loga z Drive. */
var PERFECT_LOGO42_FOLDER_ID=PropertiesService.getScriptProperties().getProperty('PERFECT_LOGO42_FOLDER_ID')||'1jJ5o8JYkoKoH_BSzLI8nx8c8_OGzJ6S2';
function perfectLogo25Key_(name){
  var s=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\.(png|jpe?g|webp)$/,'').replace(/\s*\(\d+\)\s*$/,'').replace(/[^a-z0-9]/g,'');
  var aliases={vw:'volkswagen',mercedes:'mercedesbenz',benz:'mercedesbenz',sangyong:'ssangyong'};
  return aliases[s]||s;
}
function perfectLogo25Inventory_(){
  var root=DriveApp.getFolderById(PERFECT_LOGO42_FOLDER_ID),small=[],large=[],children=root.getFolders();
  while(children.hasNext()){var f=children.next(),n=perfectLogo25Key_(f.getName());if(n==='mala')small.push(f);else if(n==='velka')large.push(f);}
  var files={},folders=small.concat([root],large);
  folders.forEach(function(folder){var it=folder.getFiles();while(it.hasNext()){
    var file=it.next(),key=perfectLogo25Key_(file.getName());
    if(/^image\/(png|jpeg|webp)$/.test(file.getMimeType())&&!files[key])files[key]=file;
  }});
  return files;
}
function perfect40Original_perfectLogo42GetMap_(token,requestedKeys){
  perfectRepairRequireUser_(token);
  if(!Array.isArray(requestedKeys)||requestedKeys.length>100)throw new Error('Požaduj nejvýše 100 značek.');
  var allowed={};PERFECT_LOGA_42_MANIFEST.brands.forEach(function(b){allowed[perfectLogo25Key_(b.key)]=b.key;});
  var keys=Array.from(new Set(requestedKeys.map(String))),files=null,logos={},missing=[],warnings=[];
  var cache=CacheService.getScriptCache();
  keys.forEach(function(requested){
    var normalized=perfectLogo25Key_(requested),canonical=allowed[normalized];
    if(!canonical){missing.push(requested);return;}
    var key='perfect-logo25-'+PERFECT_LOGO42_FOLDER_ID+'-'+canonical,uri=cache.get(key);
    if(!uri){
      if(!files)files=perfectLogo25Inventory_();
      var file=files[normalized];if(!file){missing.push(requested);return;}
      try{
        var blob;
        if(file.getSize()<=70000)blob=file.getBlob();
        else blob=file.getThumbnail()||file.getBlob();
        var bytes=blob.getBytes(),mime=blob.getContentType();
        if(bytes.length>600000||!/^image\/(png|jpeg|webp)$/.test(mime)){warnings.push(canonical+': příliš velký nebo nepodporovaný obrázek');return;}
        uri='data:'+mime+';base64,'+Utilities.base64Encode(bytes);
        if(uri.length<95000)try{cache.put(key,uri,21600);}catch(e){}
      }catch(e){warnings.push(canonical+': '+e.message);return;}
    }
    logos[requested]={brand:canonical,dataUri:uri};logos[canonical]=logos[requested];
  });
  return {ok:true,logos:logos,missing:missing,warnings:warnings};
}
function perfect40Original_perfectLogo42Diagnostika_(){
  var files=perfectLogo25Inventory_(),missing=[],found=0;
  PERFECT_LOGA_42_MANIFEST.brands.forEach(function(b){if(files[perfectLogo25Key_(b.key)])found++;else missing.push(b.key);});
  var result={found:found,total:PERFECT_LOGA_42_MANIFEST.brands.length,missing:missing};
  Logger.log(JSON.stringify(result));return result;
}

// 33_AUTOMATICKY_STAV_KOMPATIBILITA.gs.txt
/** 33_AUTO_STAV_V26.gs — jediné automatické dokončování podle programu. */
function perfectOrderTimingV26_(order){return perfectTiming31Meta_(order);}
function perfect40Original_perfectAutoStatusRun_(){return databaseTiming31Apply_(false);}
function perfect40Original_perfectAutoStatusPreview_(){return databaseTiming31Apply_(true);}
function perfect40Original_perfectAutoStatusBackfill_(){return databaseTiming31Apply_(false);}
function perfect40Original_perfectControlSetupV26_(token){perfectAuthRequireAdmin_(token);return perfectNastavitAutomatikuV31_();}
function perfect40Original_perfectControlTickV26_(token){return perfectControlTickAddons31(token);}

function perfectProgramColorV26_(name){
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 const key=norm(name);let color='';
 try{if(typeof perfectRepairServices_==='function'){const services=perfectProgramColorV26_.services||(perfectProgramColorV26_.services=perfectRepairServices_());const service=services.filter(x=>x.AKTIVNI!==false&&norm(x.NAZEV)&&(' '+key+' ').includes(' '+norm(x.NAZEV)+' ')).sort((a,b)=>norm(b.NAZEV).length-norm(a.NAZEV).length)[0];if(service)color=service.BARVA;}}catch(e){}
 if(!/^#[0-9a-f]{6}$/i.test(color)){try{if(typeof perfectBarvaMycihoProgramu_==='function')color=perfectBarvaMycihoProgramu_(name);}catch(e){}}
 return /^#[0-9a-f]{6}$/i.test(color)?color:'';
}

// 33_CASOVANI_PANELU_V31.gs.txt
/** Časování V31: skutečný čas programu, barevná výplň a potvrzené dokončení. */
function perfectTiming31Normalize_(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();}
function perfectTiming31Durations_(){
  // Délky ze stávajícího interního systému, bez dřívějšího přídavku 15 minut.
  var map={'PERFECT NEW CAR':1440,CLASSIC:30,COMFORT:60,ELEGANCE:60,PREMIUM:90,INDIVIDUAL:150,AVANGARDE:150,AVANTGARDE:150,EXCLUSIVE:180,PERFECT:240};
  if(typeof PERFECT_AUTO_V15!=='undefined'&&PERFECT_AUTO_V15.DURATIONS)Object.keys(PERFECT_AUTO_V15.DURATIONS).forEach(function(key){
    var minutes=Number(PERFECT_AUTO_V15.DURATIONS[key]);if(Number.isFinite(minutes)&&minutes>0)map[perfectTiming31Normalize_(key)]=minutes;
  });
  return map;
}
function perfectTiming31Meta_(order,services){
  var durations=perfectTiming31Durations_(),program=perfectTiming31Normalize_(order.MYCI_PROGRAM);
  var key=Object.keys(durations).sort(function(a,b){return b.length-a.length;}).find(function(k){return (' '+program+' ').indexOf(' '+k+' ')>=0;});
  var out={ARRIVAL_AT:'',AUTO_COMPLETE_AT:'',DURATION_MINUTES:null,PROGRAM_COLOR:'',TIMING_ERROR:''};
  if(!key){out.TIMING_ERROR='UNKNOWN_PROGRAM';return out;}
  var rawDate=order.DATUM_OBJEDNANI,date;
  if(rawDate instanceof Date)date=Utilities.formatDate(rawDate,'Europe/Prague','yyyy-MM-dd');
  else{
    var raw=String(rawDate||'').trim(),iso=/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(raw),cz=/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/.exec(raw);
    date=iso?iso[1]+'-'+iso[2]+'-'+iso[3]:cz?cz[3]+'-'+cz[2].padStart(2,'0')+'-'+cz[1].padStart(2,'0'):'';
  }
  var time;
  try{time=order.CAS_PRIJEZDU instanceof Date?Utilities.formatDate(order.CAS_PRIJEZDU,'Europe/Prague','HH:mm'):databaseTime_(order.CAS_PRIJEZDU);}catch(e){out.TIMING_ERROR='INVALID_TIME';return out;}
  if(!date||!time){out.TIMING_ERROR='MISSING_DATETIME';return out;}
  var arrival;
  try{arrival=Utilities.parseDate(date+' '+time,'Europe/Prague','yyyy-MM-dd HH:mm');if(Utilities.formatDate(arrival,'Europe/Prague','yyyy-MM-dd HH:mm')!==date+' '+time)throw Error('Neplatné datum');}
  catch(e){out.TIMING_ERROR='INVALID_DATETIME';return out;}
  out.ARRIVAL_AT=arrival.toISOString();out.DURATION_MINUTES=durations[key];out.AUTO_COMPLETE_AT=new Date(arrival.getTime()+durations[key]*60000).toISOString();
  var snapshot=null;try{snapshot=order.CENOVE_POLOZKY?JSON.parse(order.CENOVE_POLOZKY):null;}catch(e){}
  var programId=snapshot&&snapshot.program?String(snapshot.program.id||''):'';
  var catalog=(services||[]).filter(function(s){return s.TYP==='PROGRAM'&&/^#[0-9a-f]{6}$/i.test(s.BARVA||'');});
  var service=programId?catalog.find(function(s){return String(s.SERVICE_ID)===programId;}):null;
  if(!service)service=catalog.filter(function(s){var name=perfectTiming31Normalize_(s.NAZEV);return name&&(' '+program+' ').indexOf(' '+name+' ')>=0;}).sort(function(a,b){return String(b.NAZEV).length-String(a.NAZEV).length;})[0];
  if(service)out.PROGRAM_COLOR=service.BARVA;
  return out;
}
function perfectTiming31View_(order,services){return Object.assign({},perfectRepairSerializable_(order),perfectTiming31Meta_(order,services));}
function perfect40Original_perfectWebGetAllHistoricalDataAddons31_(token){
  var viewer=perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();
  var status=databaseTiming31Apply_(false),services=databaseAddons31ReadServices_();
  var customers=perfectRepairSerializable_(databaseGetAllCustomers()).filter(function(c){return c.CUSTOMER_ID;});
  var vehicles=perfectRepairSerializable_(databaseGetAllVehicles()).filter(function(v){return v.VEHICLE_ID;});
  var orders=databaseGetAllOrders().filter(function(o){return o.ORDER_ID;}).map(function(order){return perfectTiming31View_(order,services);});
  var today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');
  var revenue=orders.filter(function(o){var date=o.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(o.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(o.DATUM_OBJEDNANI).slice(0,10);return date===today&&perfectTiming31Normalize_(o.STAV_OBJEDNAVKY)==='DOKONCENO';}).reduce(function(sum,o){return sum+Math.round(perfectRepairMoney_(o.CENA_CELKEM)*100);},0)/100;
  return {success:true,customers:customers,vehicles:vehicles,orders:orders,summary:{
    todayRevenue:viewer.role==='ADMINISTRATOR'?revenue:null,
    latestOrders:orders.slice().sort(function(a,b){return String(b.DATUM_OBJEDNANI).localeCompare(String(a.DATUM_OBJEDNANI));}).slice(0,10),
    centralCustomers:customers.length,centralVehicles:vehicles.length,centralOrders:orders.length,
    historicalCustomersAddedToView:0,historicalVehiclesAddedToView:0},
    timing31:{completed:status.completed,unknown:status.unknown,remaining:status.remaining,checkedAt:new Date().toISOString()}};
}
function perfect40Original_perfectControlTickAddons31_(token){
  var viewer=perfectRepairRequireUser_(token),status=databaseTiming31Apply_(false),services=databaseAddons31ReadServices_();
  var orders=databaseGetAllOrders(),today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');
  return {success:true,now:new Date().toISOString(),completed:status.completed,unknown:status.unknown,remaining:status.remaining,
    orders:orders.map(function(order){return Object.assign({ORDER_ID:String(order.ORDER_ID),STAV_OBJEDNAVKY:String(order.STAV_OBJEDNAVKY),MANUAL_STATUS_HOLD:false},perfectTiming31Meta_(order,services));}),
    todayRevenue:viewer.role==='ADMINISTRATOR'?orders.filter(function(order){var date=order.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(order.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(order.DATUM_OBJEDNANI).slice(0,10);return date===today&&['DOKONCENO','VYHOTOVENO'].indexOf(perfectTiming31Normalize_(order.STAV_OBJEDNAVKY))>=0;}).reduce(function(sum,order){return sum+Math.round(perfectRepairMoney_(order.CENA_CELKEM)*100);},0)/100:null};
}
/** Jednou spusť v editoru Apps Scriptu. Funkce s _ není volatelná z prohlížeče. */
function perfectNastavitAutomatikuV31_(){
  var own='perfectAutoStatusRunAddons31_',replaced=['perfectAutoStatusRun','perfectAutoFinishPastOrders'];
  var triggers=ScriptApp.getProjectTriggers(),ours=triggers.filter(function(t){return t.getHandlerFunction()===own;});
  // Odstraňují se pouze staré časovače automatických stavů; Gmail a jiné spouštěče zůstávají.
  triggers.filter(function(t){return replaced.indexOf(t.getHandlerFunction())>=0;}).forEach(function(t){ScriptApp.deleteTrigger(t);});
  if(ours.length!==1){ours.forEach(function(t){ScriptApp.deleteTrigger(t);});ScriptApp.newTrigger(own).timeBased().everyMinutes(1).create();}
  var status=databaseTiming31Apply_(false);
  var result={success:true,intervalMinutes:1,extraMinutes:0,status:status};Logger.log(JSON.stringify(result));return result;
}
function perfectAutoStatusRunAddons31_(){return databaseTiming31Apply_(false);}
function perfectNahledCasovaniV31_(){var result=databaseTiming31Apply_(true);Logger.log(JSON.stringify(result));return result;}

// 34_BOXY_SMENAR_ADMIN.gs.txt
function perfectBoxes29Bool_(value) {
 if(value===true||value===1)return true;
 if(value===false||value===0||value==null||value==='')return false;
 var text=String(value).trim().toLowerCase();
 if(text==='true'||text==='1'||text==='ano')return true;
 if(text==='false'||text==='0'||text==='ne')return false;
 throw new Error('Neplatna hodnota priznaku ve smenach: '+text);
}
function perfectBoxes29Rows_(kind) {
 return databaseBoxes25Read_(kind).map(function(raw){
  var row={};Object.keys(raw).forEach(function(key){row[key]=raw[key];});
  ['ACTIVE','WORKED','PLANNED'].forEach(function(key){if(Object.prototype.hasOwnProperty.call(row,key))row[key]=perfectBoxes29Bool_(row[key]);});
  if(row.DATE)row.DATE=perfectBoxes25VisitDate_(row.DATE);
  return row;
 });
}
/** 34_BOXY_ADMIN.gs — pouze administrátor. Zápis provádí výhradně modul 01. */
function perfectBoxes25Date_(value){
  const s=String(value||'').trim(),m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if(!m)throw new Error('Vyber platné datum.');
  const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
  if(d.getUTCFullYear()!==+m[1]||d.getUTCMonth()!==+m[2]-1||d.getUTCDate()!==+m[3])throw new Error('Neplatné datum.');
  return s;
}
function perfectBoxes25Station_(s){s=String(s||'');if(!['BOX1','BOX2','DETAILING'].includes(s))throw new Error('Neplatné stanoviště.');return s;}
function perfectBoxes25VisitDate_(value){
  if(value instanceof Date)return isNaN(value)?'':Utilities.formatDate(value,'Europe/Prague','yyyy-MM-dd');
  const s=String(value||'');let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if(m)return m[0];m=/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';
}
function perfectBoxes25Normalize_(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');}
/** V42: kalendářní den v Praze a součty v celých haléřích. */
function perfectBoxes42Weekend_(date){var d=perfectBoxes25Date_(date),day=new Date(d+'T12:00:00Z').getUTCDay();return day===0||day===6;}
function perfectBoxes42Cents_(value){var n=perfectRepairMoney_(value),c=Math.round(n*100);if(!Number.isSafeInteger(c)||c>100000000000)throw Error('Částka je mimo podporovaný rozsah.');return c;}
function perfectBoxes42Bonus_(date,station,value){var c=perfectBoxes42Cents_(value==null||value===''?0:value);if(c&&(!perfectBoxes42Weekend_(date)||station==='DETAILING'))throw Error('Bonus za víkend lze zadat pouze na sobotu nebo neděli pro BOX 1 / BOX 2.');if(Math.abs(Number(String(value||0).replace(/\s|Kč/gi,'').replace(',','.'))*100-c)>.001)throw Error('Víkendový bonus zadej nejvýše na dvě desetinná místa.');return c/100;}
function perfectBoxes42Pay_(revenue,weekendBonus){var cents=perfectBoxes42Cents_(revenue),over=Math.max(0,cents-600000),bonus=perfectBoxes42Cents_(weekendBonus||0),percent=Math.round(over/4);return {base:1400,limit:6000,overLimit:over/100,performanceBonus:percent/100,weekendBonus:bonus/100,total:(140000+percent+bonus)/100};}
function perfectBoxes25Pay_(revenue){return perfectBoxes42Pay_(revenue,0).total;}
function perfect40Original_perfectBoxesGetOverviewV25_(token,input){
  perfectAuthRequireAdmin_(token);return perfectBoxes25Overview_(input);
}
function perfectBoxes25Overview_(input){
  input=input||{};
  const from=perfectBoxes25Date_(input.from),to=perfectBoxes25Date_(input.to);
  if(from>to||(new Date(to)-new Date(from))/86400000>366)throw new Error('Vyber období do 367 dnů.');
  const workers=perfectRepairUsers_().map(u=>({id:String(u.id),username:String(u.username||''),name:[u.firstName,u.surname].filter(Boolean).join(' ')||u.username,active:u.active!==false}));
  const shifts=perfectBoxes29Rows_('shift').filter(s=>s.DATE>=from&&s.DATE<=to);
  const overrides=perfectBoxes29Rows_('order'),byOrder=new Map(overrides.map(r=>[String(r.ORDER_ID),r]));
  const norm=perfectBoxes25Normalize_,byIdentity={};
  workers.forEach(w=>{[w.id,w.username,w.name].filter(Boolean).forEach(raw=>{const k=norm(raw);if(!byIdentity[k])byIdentity[k]=new Set();byIdentity[k].add(w.id);});});
  const days=new Map(),labels={BOX1:'BOX 1',BOX2:'BOX 2',DETAILING:'DETAILING'};
  function row(date,station){const k=date+'|'+station;if(!days.has(k))days.set(k,{date,station,revenue:0,orders:0,userId:'',shift:false,worked:false,reward:null,weekendBonus:0,soloCents42:0,sharedCents42:0,soloOrders:0,sharedOrders:0});return days.get(k);}
  shifts.filter(s=>s.ACTIVE===true).forEach(s=>{const r=row(String(s.DATE),s.STATION);r.userId=String(s.USER_ID);if(r.shift)throw Error('Pro '+s.DATE+' a '+s.STATION+' je více aktivních směn. Nejdřív oprav duplicitu.');r.shift=true;r.worked=s.WORKED===true;r.weekendBonus=perfectBoxes42Bonus_(r.date,r.station,s.WEEKEND_BONUS42||0);});
  const orders=databaseGetAllOrders().filter(o=>{const d=perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI);return d>=from&&d<=to;}).map(o=>{
    const date=perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI),override=byOrder.get(String(o.ORDER_ID));
    const ids=byIdentity[norm(o.PRACOVNIK)],workerId=ids&&ids.size===1?Array.from(ids)[0]:'';
    const matches=shifts.filter(s=>s.ACTIVE===true&&s.DATE===date&&String(s.USER_ID)===workerId);
    const station=override?.ACTIVE===true?override.STATION:matches.length===1?matches[0].STATION:'';
    const completed=['dokonceno','vyhotoveno'].includes(norm(o.STAV_OBJEDNAVKY));
    const revenue=perfectRepairMoney_(o.CENA_CELKEM);
    const split=perfectShared33Read_(o),shared=!!split;
    const allocations=shared?(split.valid?[{station:'BOX1',revenue:split.box1},{station:'BOX2',revenue:split.box2}]:[]):station?[{station,revenue}]:[];
    if(completed)allocations.forEach(part=>{if(shared&&part.revenue===0)return;const r=row(date,part.station);var cents=perfectBoxes42Cents_(part.revenue);if(shared){r.sharedCents42+=cents;r.sharedOrders++;}else{r.soloCents42+=cents;r.soloOrders++;}r.revenue=(r.soloCents42+r.sharedCents42)/100;r.orders++;});
    return {id:String(o.ORDER_ID),date,time:String(o.CAS_PRIJEZDU||''),vehicle:String(o.VOZIDLO||''),program:String(o.MYCI_PROGRAM||''),worker:String(o.PRACOVNIK||''),status:String(o.STAV_OBJEDNAVKY||''),revenue,completed,
      station:shared?(split.valid?'SHARED':''):station,manual:!shared&&override?.ACTIVE===true,version:String(override?.VERSION||''),shared,allocations,allocationSource:shared?'SHARED':override?.ACTIVE===true?'MANUAL':station?'WORKER_SHIFT':'UNASSIGNED',workerMatched:!!workerId,
      boxSplit:shared&&split.valid?{box1:split.box1,box2:split.box2}:null,allocationError:shared&&!split.valid?split.error:''};
  }).sort((a,b)=>b.date.localeCompare(a.date)||a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
  const daily=Array.from(days.values()).sort((a,b)=>b.date.localeCompare(a.date)||a.station.localeCompare(b.station));
  daily.forEach(r=>{r.soloRevenue=r.soloCents42/100;r.sharedRevenue=r.sharedCents42/100;delete r.soloCents42;delete r.sharedCents42;r.pay=r.station!=='DETAILING'&&r.shift&&r.worked?perfectBoxes42Pay_(r.revenue,r.weekendBonus):null;r.reward=r.pay?r.pay.total:null;});
  const totals=['BOX1','BOX2','DETAILING'].map(station=>{const r=daily.filter(x=>x.station===station);return {station,label:labels[station],revenue:Math.round(r.reduce((s,x)=>s+x.revenue,0)*100)/100,orders:r.reduce((s,x)=>s+x.orders,0),shifts:r.filter(x=>x.shift).length,reward:station==='DETAILING'?null:Math.round(r.reduce((s,x)=>s+(x.reward||0),0)*100)/100,missingShiftDays:r.filter(x=>x.orders&&!x.shift).length};});
  return {success:true,from,to,workers,shifts:shifts.map(r=>({date:String(r.DATE),station:r.STATION,userId:String(r.USER_ID||''),active:r.ACTIVE===true,worked:r.WORKED===true,weekendBonus:perfectBoxes42Bonus_(String(r.DATE),r.STATION,r.WEEKEND_BONUS42||0),version:String(r.VERSION||'')})),daily,orders,totals,unassigned:orders.filter(o=>o.completed&&!o.station).length};
}
function perfect40Original_perfectBoxesSaveShiftV25_(token,input){
 perfectAuthRequireAdmin_(token);
 if(!input||typeof input!=='object')throw new Error('Chybi udaje smeny.');
 return perfectDatabaseWithLock_('BOX overene ulozeni',function(){
  var date=perfectBoxes25Date_(input.date),station=perfectBoxes25Station_(input.station),userId=String(input.userId||'').trim();
  var shifts=perfectBoxes29Rows_('shift');
  if(userId&&shifts.some(function(r){return r.DATE===date&&r.STATION!==station&&r.ACTIVE&&String(r.USER_ID)===userId;}))throw new Error('Pracovnik je v tento den jiz prirazen jinemu stanovisti.');
  var previous=shifts.find(function(r){return r.KEY===date+'|'+station;});
  var bonusInput=input.weekendBonus===undefined&&previous&&String(previous.USER_ID)===userId&&input.worked===true?previous.WEEKEND_BONUS42:input.weekendBonus;
  var weekendBonus=perfectBoxes42Bonus_(date,station,bonusInput||0);
  if(weekendBonus&&(!userId||input.worked!==true))throw Error('Víkendový bonus vyžaduje přiřazeného pracovníka a potvrzenou odpracovanou směnu.');
  var saved=databaseBoxes25SaveShift_(token,Object.assign({},input,{weekendBonus:weekendBonus}));
  if(typeof SpreadsheetApp.flush==='function')SpreadsheetApp.flush();
  var record=perfectBoxes29Rows_('shift').filter(function(r){return r.KEY===saved.KEY;})[0];
  if(!record||record.VERSION!==saved.VERSION||String(record.USER_ID)!==userId||record.ACTIVE!==!!userId||record.WORKED!==(!!userId&&input.worked===true)||Number(record.WEEKEND_BONUS42||0)!==weekendBonus)throw new Error('Ulozeni smeny nebylo potvrzeno ctenim databaze. Obnov prehled pred dalsim pokusem.');
  return {success:true,build:'BOXY-V29',verified:true,shift:record};
 });
}
function perfect40Original_perfectBoxesSaveOrderV25_(token,input){
 perfectAuthRequireAdmin_(token);
 if(!input||typeof input!=='object')throw new Error('Chybi udaje zakazky.');
 return perfectDatabaseWithLock_('BOX overene prirazeni',function(){
  var saved=databaseBoxes25SaveOrder_(token,input);
  if(typeof SpreadsheetApp.flush==='function')SpreadsheetApp.flush();
  var record=perfectBoxes29Rows_('order').filter(function(r){return r.KEY===saved.KEY;})[0];
  if(!record||record.VERSION!==saved.VERSION||record.ACTIVE!==!!input.station||String(record.STATION)!==String(input.station||''))throw new Error('Prirazeni nebylo potvrzeno ctenim databaze. Obnov prehled pred dalsim pokusem.');
  return {success:true,build:'BOXY-V29',verified:true,order:record};
 });
}
/** Směnář: osobní čtení, založení plánu a potvrzení směny jen administrátor. */
function perfectRoster25Group_(username){
  const u=String(username||'').toLowerCase();
  return ['martinf','ladislave'].includes(u)?'A':['vojtadd','martinp'].includes(u)?'B':'';
}
function perfectRoster25Planned_(group,date){
  if(!group)return false;
  const delta=Math.round((new Date(date+'T00:00:00Z')-new Date('2026-10-12T00:00:00Z'))/86400000);
  const index=((delta%14)+14)%14,a=[0,1,4,5,6,9,10].includes(index);
  return group==='A'?a:!a;
}
function perfectRoster25Month_(month){
  const s=String(month||'');if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(s))throw new Error('Vyber měsíc.');
  const [y,m]=s.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate();
  return {month:s,from:s+'-01',to:s+'-'+last,days:last};
}
function perfect40Original_perfectRosterSeedV25_(token){perfectAuthRequireAdmin_(token);return databaseRoster25Seed_(token);}
function perfect40Original_perfectRosterGetMineV25_(token,input){
  const user=perfectRepairRequireUser_(token),period=perfectRoster25Month_(input&&input.month);
  const records=perfectBoxes29Rows_('roster').filter(r=>String(r.USER_ID)===String(user.id)&&r.PLANNED===true&&r.DATE>=period.from&&r.DATE<=period.to);
  const planned=new Set(records.map(r=>String(r.DATE)));
  const summary=perfectBoxes25Overview_({from:period.from,to:period.to});
  const own=summary.daily.filter(r=>r.userId===String(user.id));
  const days=Array.from({length:period.days},(_,i)=>{
    const date=period.month+'-'+String(i+1).padStart(2,'0'),shift=own.find(r=>r.date===date);
    return {date,planned:planned.has(date)||!!shift?.shift||(date>='2026-10-01'&&date<='2026-11-30'&&perfectRoster25Planned_(perfectRoster25Group_(user.username),date)),worked:shift?.worked===true,amount:shift?.worked?shift.reward:null,pay:shift?.worked?shift.pay:null};
  });
  // Vrací jen vlastní odměnu; žádné tržby, stanoviště ani údaje kolegů.
  return {success:true,month:period.month,group:perfectRoster25Group_(user.username),days,total:Math.round(days.reduce((s,d)=>s+(d.worked&&d.amount!==null?d.amount:0),0)*100)/100};
}

// 36_POUKAZY_A_VYKON.gs.txt
/** PERFECT V36. Nová API; stávající backend ani jeho hesla se nepřepisují. */
function perfect36Admin_(token){var u=perfectRepairRequireUser_(token);if(u.role!=='ADMINISTRATOR')throw Error('Tato operace je pouze pro administrátora.');return u;}
function perfect36Text_(v,max){var s=String(v==null?'':v).trim();if(s.length>(max||500))throw Error('Text je příliš dlouhý.');return s;}
function perfect36Request_(v){var s=String(v||'');if(!/^[a-zA-Z0-9-]{12,80}$/.test(s))throw Error('Chybí identifikátor uložení.');return s;}
function perfect36Cents_(v){var s=String(v==null?'':v).trim().replace(/\s|Kč/gi,'').replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('Částka musí být nezáporné číslo s nejvýše dvěma desetinnými místy.');var n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n>100000000)throw Error('Částka je příliš vysoká.');return n;}
function perfect36Day_(){return Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');}
function perfect36Date_(v,optional){var s=String(v||'').trim();if(!s&&optional)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Vyplň platné datum.');var d=new Date(s+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)throw Error('Datum neexistuje.');return s;}
function perfect36AddValidity_(date,count,unit){date=perfect36Date_(date);count=Number(count);if(!Number.isInteger(count)||count<1||count>3650)throw Error('Délka platnosti musí být od 1 do 3650.');var d=new Date(date+'T12:00:00Z');if(unit==='DAYS')d.setUTCDate(d.getUTCDate()+count);else if(unit==='MONTHS'){var day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+count);var last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));}else throw Error('Neplatná jednotka platnosti.');return d.toISOString().slice(0,10);}
function perfect36Name_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function perfect36Phone_(v){var p=String(v||'').replace(/\D/g,'').replace(/^00/,'');if(p.length===12&&p.indexOf('420')===0)p=p.slice(3);return p;}
function perfect36Match_(buyer,customers,orders){
 var phone=perfect36Phone_(buyer.phone),email=String(buyer.email||'').trim().toLowerCase();if(phone.length<9)phone='';if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))email='';
 var phoneRows=phone?customers.filter(function(c){return perfect36Phone_(c.TELEFON)===phone;}):[];
 var emailRows=email?customers.filter(function(c){return String(c.EMAIL||'').trim().toLowerCase()===email;}):[];
 var candidates=Array.from(new Set(phoneRows.concat(emailRows).map(function(c){return String(c.CUSTOMER_ID);}))).filter(Boolean);
 if(candidates.length!==1)return {customerId:'',linkState:candidates.length?'AMBIGUOUS':'NO_MATCH'};
 var id=candidates[0],visited=orders.some(function(o){var d=o.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(o.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(o.DATUM_OBJEDNANI||'').slice(0,10);return String(o.CUSTOMER_ID)===id&&perfect36Name_(o.STAV_OBJEDNAVKY)==='dokonceno'&&d&&d<=perfect36Day_();});
 return visited?{customerId:id,linkState:'CONTACT_MATCH'}:{customerId:'',linkState:'NO_VISIT'};
}
function perfect36Eligible_(id,orders){return orders.some(function(o){var d=o.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(o.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(o.DATUM_OBJEDNANI||'').slice(0,10);return String(o.CUSTOMER_ID)===String(id)&&perfect36Name_(o.STAV_OBJEDNAVKY)==='dokonceno'&&d&&d<=perfect36Day_();});}
function perfect36Status_(v){if(v.state==='CANCELLED')return 'ZRUŠENO';if(v.redeemed>=v.amount&&v.amount>0)return 'UPLATNĚNO';if(v.state==='UNSOLD')return 'NEPRODÁNO';if((v.issues||[]).length)return 'KE KONTROLE';if(!v.validFrom||!v.validTo)return 'KE KONTROLE';if(v.validFrom>perfect36Day_())return 'JEŠTĚ NEPLATÍ';if(v.validTo<perfect36Day_())return 'PO PLATNOSTI';return v.redeemed>0?'ČÁSTEČNĚ ČERPÁNO':'PLATNÝ';}
function perfect36View_(v){var o=Object.assign({},v);o.status=perfect36Status_(v);o.balance=Math.max(0,v.amount-v.redeemed);return o;}
function perfect40Original_perfectVoucher36Setup_(token){var u=perfect36Admin_(token);return databaseVoucher36Setup_(u.id);}
function perfectPripravitPoukazyV36_(){var r=databaseVoucher36Setup_('EDITOR');Logger.log(JSON.stringify(r));return r;}
function perfect40Original_perfectVoucher36List_(token,input){
 perfectRepairRequireUser_(token);input=input||{};var s=databaseVoucher36State_();if(!s.installed)return {success:true,installed:false,products:[],vouchers:[]};
 var customers=null,orders=null;var rows=Object.keys(s.vouchers).map(function(id){var v=s.vouchers[id];if(!v.customerId&&v.linkState!=='UNLINKED'&&(v.phone||v.email)){if(!customers){customers=databaseGetAllCustomers();orders=databaseGetAllOrders();}v=Object.assign({},v,perfect36Match_(v,customers,orders));}return perfect36View_(v);});
 if(input.customerId)rows=rows.filter(function(v){return v.customerId===String(input.customerId);});
 return {success:true,installed:true,products:Object.keys(s.products).map(function(id){return s.products[id];}),vouchers:rows};
}
function perfect40Original_perfectVoucher36SaveProduct_(token,p){var u=perfect36Admin_(token);p=p||{};var amount=perfect36Cents_(p.value);if(amount<=0)throw Error('Hodnota musí být vyšší než nula.');perfect36AddValidity_(perfect36Day_(),p.validityCount,p.validityUnit);var data={id:String(p.id||'GIFT_'+Utilities.getUuid()),amount:amount,name:perfect36Text_(p.name,100)||'Dárkový poukaz',validityCount:Number(p.validityCount),validityUnit:p.validityUnit,active:p.active===true};return databaseVoucher36Change_('PRODUCT',data.id,p.version,p.requestId,u,'PRODUCT_SAVE',p,function(old,state){if(p.id&&!old)throw Error('Hodnota poukazu nebyla nalezena.');if(Object.keys(state.products).some(function(id){return id!==data.id&&state.products[id].active&&data.active&&state.products[id].amount===amount;}))throw Error('Aktivní poukaz s touto hodnotou už existuje.');return data;});}
function perfect40Original_perfectVoucher36Issue_(token,p){var u=perfectRepairRequireUser_(token);p=p||{};var requested=perfect36Request_(p.requestId);return databaseVoucher36Change_('VOUCHER','NEW',0,requested,u,'ISSUE',p,function(old,s){
 var product=s.products[String(p.typeId)];if(!product||!product.active)throw Error('Vybraná hodnota není aktivní.');
 var from=perfect36Date_(p.validFrom),to=perfect36Date_(p.validTo||perfect36AddValidity_(from,product.validityCount,product.validityUnit));if(to<from)throw Error('Konec platnosti musí být po začátku.');
 var code=perfect36Text_(p.code,64)||('P'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase());if(!/^[a-zA-Z0-9-]{3,64}$/.test(code))throw Error('Kód musí obsahovat 3 až 64 písmen, číslic nebo pomlček.');
 if(Object.keys(s.vouchers).some(function(id){return s.vouchers[id].code.toUpperCase()===code.toUpperCase();}))throw Error('Tento kód už existuje.');
 var buyer={buyerName:perfect36Text_(p.buyerName,150),phone:perfect36Text_(p.phone,40),email:perfect36Text_(p.email,150),vehicle:perfect36Text_(p.vehicle,150),notes:perfect36Text_(p.notes,3000)};
 var match=perfect36Match_(buyer,databaseGetAllCustomers(),databaseGetAllOrders()),max=Object.keys(s.vouchers).reduce(function(n,id){return Math.max(n,Number(s.vouchers[id].number)||0);},0);
 return Object.assign(buyer,match,{id:'VCH_'+Utilities.getUuid(),number:max+1,typeId:product.id,amount:product.amount,code:code,validFrom:from,validTo:to,soldAt:perfect36Date_(p.soldAt||perfect36Day_()),paymentMethod:perfect36Text_(p.paymentMethod,100),paid:p.paid===''||p.paid==null?product.amount:perfect36Cents_(p.paid),redeemed:0,redeemedAt:'',state:'ISSUED',issues:[],validityCount:product.validityCount,validityUnit:product.validityUnit,createdAt:new Date().toISOString()});
 });}
function perfect40Original_perfectVoucher36Edit_(token,p){var u=perfect36Admin_(token);p=p||{};return databaseVoucher36Change_('VOUCHER',String(p.id),p.version,p.requestId,u,'EDIT',p,function(old,s){if(!old)throw Error('Poukaz nebyl nalezen.');var v=Object.assign({},old);['buyerName','phone','email','vehicle','notes','paymentMethod'].forEach(function(k){if(p[k]!==undefined)v[k]=perfect36Text_(p[k],k==='notes'?3000:150);});if(p.cancel!==true){v.validFrom=perfect36Date_(p.validFrom);v.validTo=perfect36Date_(p.validTo);if(v.validTo<v.validFrom)throw Error('Konec platnosti je před začátkem.');}if(p.value!==undefined&&p.cancel!==true){var amount=perfect36Cents_(p.value);if(amount<=0)throw Error('Hodnota musí být kladná.');if(old.redeemed>0&&amount!==old.amount)throw Error('Hodnotu již čerpaného poukazu nelze změnit.');if(old.amount===0&&old.redeemedAt)v.redeemed=amount;v.amount=amount;}
 if(p.cancel===true)v.state='CANCELLED';
 if(p.resolve===true){if(Object.keys(s.vouchers).some(function(id){var x=s.vouchers[id];return id!==v.id&&x.state!=='CANCELLED'&&x.code.toUpperCase()===v.code.toUpperCase();}))throw Error('Kód stále patří více nezrušeným poukazům.');v.issues=[];if(v.state!=='CANCELLED')v.state='ISSUED';}
 var orders=databaseGetAllOrders();if(p.customerId){if(!databaseFindCustomerById(p.customerId)||!perfect36Eligible_(p.customerId,orders))throw Error('Zákazník nemá dokončenou návštěvu.');v.customerId=String(p.customerId);v.linkState='MANUAL';}else if(p.customerId===''){v.customerId='';v.linkState='UNLINKED';}else Object.assign(v,perfect36Match_(v,databaseGetAllCustomers(),orders));return v;});}
function perfect40Original_perfectVoucher36Redeem_(token,p){var u=perfectRepairRequireUser_(token);p=p||{};var cents=perfect36Cents_(p.amount);if(cents<=0)throw Error('Vyplň kladnou částku čerpání.');return databaseVoucher36Change_('VOUCHER',String(p.id),p.version,p.requestId,u,'REDEEM',p,function(old,s){if(!old)throw Error('Poukaz nebyl nalezen.');var status=perfect36Status_(old);if(['PLATNÝ','ČÁSTEČNĚ ČERPÁNO'].indexOf(status)<0)throw Error('Poukaz nelze čerpat: '+status+'.');if(Object.keys(s.vouchers).some(function(id){return id!==old.id&&s.vouchers[id].state!=='CANCELLED'&&s.vouchers[id].code.toUpperCase()===old.code.toUpperCase();}))throw Error('Duplicitní kód vyžaduje kontrolu.');if(cents>old.amount-old.redeemed)throw Error('Částka překračuje zůstatek poukazu.');var orderId=perfect36Text_(p.orderId,80);if(orderId&&!databaseFindOrderById(orderId))throw Error('Zakázka nebyla nalezena.');return Object.assign({},old,{redeemed:old.redeemed+cents,redeemedAt:perfect36Day_(),lastOrderId:orderId,lastRedemption:cents});});}
function perfect40Original_perfectVoucher36History_(token,id){perfectRepairRequireUser_(token);var s=databaseVoucher36State_();return {success:true,events:s.events.filter(function(e){return e.entity==='VOUCHER'&&e.id===String(id);}).map(function(e){return {at:e.at,operation:e.operation,actor:e.actor,version:e.version,redeemed:e.data.redeemed,validTo:e.data.validTo,lastOrderId:e.data.lastOrderId||''};})};}
function perfect40Original_perfectVoucher36Art_(token){
 perfectRepairRequireUser_(token);var src=HtmlService.createHtmlOutputFromFile('PERFECT_Poukaz_Obrazek_1').getContent().replace(/\s/g,'');
 function complete(value){try{if(!/^data:image\/jpeg;base64,/.test(value))return false;var b=Utilities.base64Decode(value.split(',')[1]);return b.length>4&&(b[0]&255)===255&&(b[1]&255)===216&&(b[b.length-2]&255)===255&&(b[b.length-1]&255)===217;}catch(e){return false;}}
 if(!complete(src)){try{src+=HtmlService.createHtmlOutputFromFile('PERFECT_Poukaz_Obrazek_2').getContent().replace(/\s/g,'');}catch(e){}}
 if(!complete(src))throw Error('Podklad poukazu není úplný. Nahraj celý soubor PERFECT_Poukaz_Obrazek_1 z balíčku V40.');return {success:true,src:src};
}
function perfect40Original_perfectVoucher36ImportPreview_(token,p){perfect36Admin_(token);var parsed=perfectVoucher36ParseImport_(p&&p.text);return {success:true,hash:perfectRepairDigest_(String(p.text)),rows:parsed,counts:{total:parsed.length,review:parsed.filter(function(v){return v.issues.length;}).length,duplicates:parsed.filter(function(v){return v.issues.indexOf('DUPLICATE_CODE')>=0;}).length}};}
function perfect40Original_perfectVoucher36Import_(token,p){var u=perfect36Admin_(token);if(!p||p.hash!==perfectRepairDigest_(String(p.text)))throw Error('Náhled importu se změnil. Zopakuj kontrolu.');return databaseVoucher36Import_(perfectVoucher36ParseImport_(p.text),u,perfect36Request_(p.requestId));}
function perfectVoucher36ParseImport_(text){
 text=String(text||'');if(text.length>500000)throw Error('Import je příliš velký. Vlož nejvýše 500 kB.');var lines=text.replace(/\r/g,'').split('\n'),rows=[];
 function date(raw,issues,label){raw=String(raw||'').trim();if(!raw)return '';var m=/^(\d{1,2})[.,]\s*(\d{1,2})[.,]?\s*(\d{4})(?:\s*[Pp])?\.?$/.exec(raw);if(!m){issues.push(label+': neúplné datum');return '';}var s=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');try{return perfect36Date_(s);}catch(e){issues.push(label+': neplatné datum');return '';}}
 lines.forEach(function(line,index){if(!line.trim())return;var a=line.split('\t');if(/hodnota/i.test(a[1]||'')||/^číslo/i.test(a[0]||''))return;if(a.length<3)throw Error('Řádek '+(index+1)+' nemá sloupce oddělené tabulátory.');var issues=[],amount;try{amount=perfect36Cents_(a[1]);}catch(e){amount=0;issues.push('Chybí hodnota');}var code=String(a[2]||'').trim();if(!code)issues.push('Chybí kód');var notes=a.slice(7).join(' | ').trim(),sale=String(a[5]||'').trim(),used=String(a[6]||'').trim(),cancel=/zrus/.test(perfect36Name_(a.slice(3,7).join(' '))),from=cancel?'':date(a[3],issues,'Od'),to=cancel?'':date(a[4],issues,'Do');
 var redeemed=0,redeemedAt='',usedText=perfect36Name_(used),partial=/upl[^\d]*(\d[\d\s]*)\s*[,.-]/i.exec(used);
 if(partial){redeemed=Math.round(Number(partial[1].replace(/\s/g,''))*100);issues.push('Ověřit částečné čerpání');}
 else if(used&&!/prodlouz|marty|zrus/.test(usedText)){redeemedAt=date(used.replace(/\s*uplatn[eě]no\s*/ig,''),issues,'Uplatněno');if(redeemedAt||/uplatn/.test(usedText))redeemed=amount;else issues.push('Nejasné uplatnění');}
 if(redeemed>amount)issues.push('Čerpání je vyšší než hodnota');if(from&&to&&to<from)issues.push('Platnost končí před začátkem');if(redeemedAt&&from&&redeemedAt<from)issues.push('Čerpání před začátkem');if(redeemedAt>perfect36Day_())issues.push('Čerpání v budoucnu');
 var empty=!a.slice(3).some(function(v){return String(v||'').trim();});if(!empty&&!cancel&&(!from||!to)&&redeemed<amount)issues.push('Chybí úplná platnost');
 var phone=(notes.match(/(?:\+420\s*)?(?:\d[\s-]*){9}(?!\d)/)||[])[0]||'',email=(notes.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';
 rows.push({id:'VCH_'+Utilities.getUuid(),number:0,legacyNumber:String(a[0]||'').trim(),typeId:'',amount:amount,code:code,validFrom:from,validTo:to,soldAt:from,paymentMethod:sale,paid:null,redeemed:redeemed,redeemedAt:redeemedAt,state:cancel?'CANCELLED':empty?'UNSOLD':'ISSUED',issues:issues,buyerName:'',phone:phone.trim(),email:email,vehicle:'',notes:notes,customerId:'',linkState:'IMPORT_PENDING',sourceHash:perfectRepairDigest_(JSON.stringify(a)),sourceLine:index+1,raw:a});
 });if(rows.length>1000)throw Error('Importuj nejvýše 1000 řádků najednou.');var counts={};rows.forEach(function(v){var k=v.code.toUpperCase();counts[k]=(counts[k]||0)+1;});rows.forEach(function(v){if(counts[v.code.toUpperCase()]>1)v.issues.push('DUPLICATE_CODE');});return rows;
}
/** V36 oprava B: start čte existující ceník přímo a nevyžaduje doplňky V31. */
function perfect36ReadServices_(){
 var ss=perfectDatabaseGetSpreadsheet_(),sheet=ss.getSheetByName(PERFECT_REPAIR.SERVICES);
 if(!sheet)return [];
 var headers=['SERVICE_ID','NAZEV','TYP','CENA','BARVA','AKTIVNI'];
 var actual=sheet.getRange(1,1,1,headers.length).getValues()[0];
 if(headers.some(function(h,i){return String(actual[i])!==h;}))throw Error('Ceník má jiné hlavičky. Nic nebylo přepsáno.');
 if(sheet.getLastRow()<2)return [];
 return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues().filter(function(row){return row[0];}).map(function(row){
  var blank=row[3]===null||row[3]===undefined||String(row[3]).trim()==='';
  return {SERVICE_ID:String(row[0]),NAZEV:String(row[1]),TYP:String(row[2]),CENA:blank?null:perfectRepairMoney_(row[3]),BARVA:String(row[4]),AKTIVNI:row[5]===true||row[5]===1||/^(true|ano)$/i.test(String(row[5]))};
 });
}
/** Jedno ověření relace a jedna dávka dat. Při startu se do databáze nezapisuje. */
function perfect40Original_perfectWebBootstrap36_(token){
 var started=Date.now(),viewer=perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();
 var customers=perfectRepairSerializable_(databaseGetAllCustomers()).filter(function(c){return c.CUSTOMER_ID;});
 var vehicles=perfectRepairSerializable_(databaseGetAllVehicles()).filter(function(v){return v.VEHICLE_ID;});
 var services=perfect36ReadServices_(),hasTiming=typeof perfectTiming31View_==='function',waiting=0;
 var orders=databaseGetAllOrders().filter(function(order){return order.ORDER_ID;}).map(function(order){
  if(perfect36Name_(order.STAV_OBJEDNAVKY)==='ceka se'){
   waiting++;
   if(hasTiming)return perfectTiming31View_(order,services);
  }
  return perfectRepairSerializable_(order);
 });
 var today=perfect36Day_(),revenue=orders.reduce(function(sum,order){return String(order.DATUM_OBJEDNANI).slice(0,10)===today&&perfect36Name_(order.STAV_OBJEDNAVKY)==='dokonceno'?sum+Math.round(perfectRepairMoney_(order.CENA_CELKEM)*100):sum;},0)/100;
 return {success:true,version:PERFECT_REPAIR.VERSION,build:PERFECT_REPAIR.BUILD,user:perfectRepairPublicUser_(viewer),customers:customers,vehicles:vehicles,orders:orders,services:services,workers:perfectWebGetWorkers(token),release37:'PERFECT-37-20261017-1',
  summary:{todayRevenue:viewer.role==='ADMINISTRATOR'?revenue:null,latestOrders:orders.slice().sort(function(a,b){return String(b.DATUM_OBJEDNANI).localeCompare(String(a.DATUM_OBJEDNANI));}).slice(0,10),centralCustomers:customers.length,centralVehicles:vehicles.length,centralOrders:orders.length,historicalCustomersAddedToView:0,historicalVehiclesAddedToView:0},
  timing31:{checkedAt:'',pending:hasTiming,unknown:hasTiming?0:waiting,error:hasTiming?'':'Chybí modul časování V31. Data zakázek jsou načtená; automatické dokončení není dostupné.'},
  performance36:{serverMs:Date.now()-started,repair:'BOOTSTRAP-20261016-B'}};
}
/** PBKDF2-HMAC-SHA256. Stejné bajty a iterace jako původní Utilities implementace. */
function perfect36Password_(password,salt,iterations){
 var K=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
 var init=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225],w=new Int32Array(64);
 function rr(x,n){return (x>>>n)|(x<<(32-n));}
 function block(h,bytes,off){var i;for(i=0;i<16;i++){var p=off+i*4;w[i]=(bytes[p]<<24)|(bytes[p+1]<<16)|(bytes[p+2]<<8)|bytes[p+3];}for(i=16;i<64;i++){var x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rr(x,7)^rr(x,18)^(x>>>3))+w[i-7]+(rr(y,17)^rr(y,19)^(y>>>10)))|0;}var a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];for(i=0;i<64;i++){var t1=(hh+(rr(e,6)^rr(e,11)^rr(e,25))+((e&f)^(~e&g))+K[i]+w[i])|0,t2=((rr(a,2)^rr(a,13)^rr(a,22))+((a&b)^(a&c)^(b&c)))|0;hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}h[0]=(h[0]+a)|0;h[1]=(h[1]+b)|0;h[2]=(h[2]+c)|0;h[3]=(h[3]+d)|0;h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+hh)|0;}
 function finish(state,data,prefix){var h=state.slice(),length=data.length,total=length+prefix,buf=new Uint8Array(Math.ceil((length+9)/64)*64);buf.set(data);buf[length]=128;var bits=total*8;for(var i=0;i<8;i++){buf[buf.length-1-i]=bits%256;bits=Math.floor(bits/256);}for(var off=0;off<buf.length;off+=64)block(h,buf,off);var out=new Uint8Array(32);for(var j=0;j<8;j++){out[j*4]=h[j]>>>24;out[j*4+1]=h[j]>>>16;out[j*4+2]=h[j]>>>8;out[j*4+3]=h[j];}return out;}
 function utf8(s){return new Uint8Array(Utilities.newBlob(String(s)).getBytes().map(function(x){return x&255;}));}
 var key=utf8(password);if(key.length>64)key=finish(init,key,0);var inner=new Uint8Array(64),outer=new Uint8Array(64);for(var i=0;i<64;i++){inner[i]=(key[i]||0)^54;outer[i]=(key[i]||0)^92;}var ih=init.slice(),oh=init.slice();block(ih,inner,0);block(oh,outer,0);function hmac(data){return finish(oh,finish(ih,data,64),64);}
 iterations=Number(iterations);if(!Number.isInteger(iterations)||iterations<1||iterations>1000000)throw Error('Neplatné nastavení hesla.');var sb=utf8(salt),first=new Uint8Array(sb.length+4);first.set(sb);first[first.length-1]=1;var u=hmac(first),result=u.slice();for(var n=1;n<iterations;n++){u=hmac(u);for(var j=0;j<32;j++)result[j]^=u[j];}return Array.prototype.map.call(result,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
}
function perfect40Original_perfectAuthLoginFast36_(username,password){
 username=String(username||'').trim().toLowerCase();password=String(password||'');if(!username||username.length>64||password.length>128)throw Error('Nesprávné jméno nebo heslo.');
 return perfectRepairLock_(function(){var p=perfectRepairProps_(),failureKey='PERFECT_REPAIR_FAILURE_'+perfectRepairDigest_(username),f=JSON.parse(p.getProperty(failureKey)||'{"count":0,"until":0}');if(f.until>Date.now()&&f.count>=5)throw Error('Příliš mnoho pokusů. Počkej 15 minut.');if(f.until<Date.now())f={count:0,until:Date.now()+15*60*1000};var u=perfectRepairUsers_().find(function(x){return x.username.toLowerCase()===username;});if(!u||u.active===false||!perfectRepairEqual_(u.passwordHash,perfect36Password_(password,u.salt,u.iterations))){f.count++;p.setProperty(failureKey,JSON.stringify(f));throw Error('Nesprávné jméno nebo heslo.');}p.deleteProperty(failureKey);var token=perfectRepairRandom_(),all=p.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){try{var s=JSON.parse(all[k]);if(s.expires<Date.now()||s.userId===u.id)p.deleteProperty(k);}catch(e){p.deleteProperty(k);}});p.setProperty('PERFECT_REPAIR_SESSION_'+perfectRepairDigest_(token),JSON.stringify({userId:u.id,expires:Date.now()+8*60*60*1000}));return {token:token,user:perfectRepairPublicUser_(u)};});
}

// 37_START_A_KONTROLA.gs.txt
/** PERFECT V37 — společný start a kontrola sestavy. */
const PERFECT_RELEASE37='PERFECT-37-20261017-1';
function perfect40Original_perfectAuthLoginBootstrap37_(username,password){
 var auth=perfectAuthLoginFast36(username,password);
 try{return {token:auth.token,user:auth.user,bootstrap:perfectWebBootstrap36(auth.token),release37:PERFECT_RELEASE37};}
 catch(error){return {token:auth.token,user:auth.user,bootstrap:null,bootstrapError:String(error.message||error),release37:PERFECT_RELEASE37};}
}
/** Veřejné firemní obrázky; původní PNG se předávají beze změny bajtů. */
function perfect40Original_perfectWebGetBrandAssets37_(){
 var parts=[];
 for(var i=1;i<=5;i++){
  var source=HtmlService.createHtmlOutputFromFile('PERFECT_Loga_'+i).getContent();
  var match=source.match(/\.push\((\[[\s\S]*?\])\.join\(\s*['"]['"]\s*\)\)/);
  if(!match)throw Error('Nelze přečíst původní logo, část '+i+'.');
  var rows=JSON.parse(match[1]);if(!Array.isArray(rows)||rows.some(function(s){return typeof s!=='string';}))throw Error('Neplatná část loga.');parts.push(rows.join(''));
 }
 var assets=JSON.parse(parts.join(''));
 ['horizontal','stacked'].forEach(function(key){if(typeof assets[key]!=='string'||!/^data:image\/png;base64,/.test(assets[key]))throw Error('Chybí původní PNG logo '+key+'.');});
 return {success:true,release37:PERFECT_RELEASE37,assets:{horizontal:assets.horizontal,stacked:assets.stacked}};
}
/** Nezapisuje do tabulky, nemění uživatele ani spouštěče. */
function perfect40Original_perfectKontrolaProjektuV37_(){
 var checks=[
  ['perfectDuplicates38List',typeof perfectDuplicates38List],['databaseDuplicates38Resolve_',typeof databaseDuplicates38Resolve_],['databaseGetAllOrders',typeof databaseGetAllOrders],['databaseCreateOrder',typeof databaseCreateOrder],['generateOrderId',typeof generateOrderId],
  ['perfectAuthLoginFast36',typeof perfectAuthLoginFast36],['perfectWebBootstrap36',typeof perfectWebBootstrap36],
  ['databaseAddons31ReadServices_',typeof databaseAddons31ReadServices_],['perfectWebGetServicesAddons31',typeof perfectWebGetServicesAddons31],['perfectWebCreateOrderAddons31',typeof perfectWebCreateOrderAddons31],
  ['perfectTiming31View_',typeof perfectTiming31View_],['perfectControlTickAddons31',typeof perfectControlTickAddons31],
  ['perfectBoxesGetOverviewV25',typeof perfectBoxesGetOverviewV25],['perfectBoxesSaveShiftV25',typeof perfectBoxesSaveShiftV25],['perfectShared33Read_',typeof perfectShared33Read_],
  ['perfectVoucher36List',typeof perfectVoucher36List],['databaseVoucher36Change_',typeof databaseVoucher36Change_],['perfectAdminUsersList',typeof perfectAdminUsersList],['perfectLogo42GetMap',typeof perfectLogo42GetMap]
 ];
 var missing=checks.filter(function(x){return x[1]!=='function';}).map(function(x){return x[0];}),templates=['PERFECT_Duplicity','Index','PERFECT_Vzhled','PERFECT_Brand','PERFECT_Poukazy','PERFECT_Poukaz_Obrazek_1','PERFECT_Statistiky','PERFECT_Upgrade40','PERFECT_Loga_1','PERFECT_Loga_2','PERFECT_Loga_3','PERFECT_Loga_4','PERFECT_Loga_5'],html=[];
 templates.forEach(function(name){try{HtmlService.createHtmlOutputFromFile(name).getContent();}catch(e){html.push(name);}});
 var databaseError='';try{perfectRepairCheckDatabase_();}catch(e){databaseError=String(e.message||e);}
 var result={success:!missing.length&&!html.length&&!databaseError,release37:PERFECT_RELEASE37,missingFunctions:missing,missingHtml:html,databaseError:databaseError};
 Logger.log(JSON.stringify(result,null,2));return result;
}
/** Jednorázové dokončení v editoru. Ponechá účty, fotografie, data i Gmail spouštěče. */
function perfect40Original_perfectDokoncitInstalaciV37_(){
 var report=perfectKontrolaProjektuV37();if(!report.success)throw Error('Nejdřív doplň sestavu: '+JSON.stringify(report));
 var timing=perfectNastavitAutomatikuV31_();var result={success:true,release37:PERFECT_RELEASE37,timing:timing};Logger.log(JSON.stringify(result,null,2));return result;
}

// 38_DUPLICITY_A_HISTORIE.gs.txt
/** PERFECT 38: porovnání celé uložené historie; žádný automatický výmaz. */
function perfectDuplicates38Headers_(){return ['PAIR_KEY','PAIR_VERSION','ACTION','KEPT_ORDER_ID','REMOVED_ORDER_ID','ACTOR_ID','ACTOR_USERNAME','DECIDED_AT','GMAIL_IDS_JSON',...PERFECT_DB_ORDER_HEADERS];}
function perfectDuplicates38Norm_(value){return String(value==null?'':value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function perfectDuplicates38Hash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');}
function perfectDuplicates38Fingerprint_(order){return perfectDuplicates38Hash_(JSON.stringify(PERFECT_DB_ORDER_HEADERS.map(function(k){var v=order[k];return v instanceof Date?v.toISOString():v==null?'':v;})));}
function perfectDuplicates38Shape_(o){
 var phone=String(o.TELEFON||'').replace(/\D/g,'').replace(/^420(?=\d{9}$)/,'');
 return {order:o,id:String(o.ORDER_ID||'').trim(),date:gmailDateString_(o.DATUM_OBJEDNANI),time:gmailTimeString_(o.CAS_PRIJEZDU),phone:phone.length>=9?phone:'',email:String(o.EMAIL||'').trim().toLowerCase(),customer:String(o.CUSTOMER_ID||'').trim(),plate:perfectDuplicates38Norm_(o.SPZ),vehicle:perfectDuplicates38Norm_(o.VOZIDLO),vehicleId:String(o.VEHICLE_ID||'').trim(),gmail:String(o.GMAIL_MESSAGE_ID||'').trim()};
}
function perfectDuplicates38Pair_(a,b){
 if(!a.id||!b.id||a.id===b.id)return null;
 var source=a.gmail&&a.gmail===b.gmail;
 var contact=(a.phone&&a.phone===b.phone)||(a.email&&a.email===b.email)||(a.customer&&a.customer===b.customer);
 var vehicle=a.plate&&b.plate?a.plate===b.plate:((a.vehicleId&&a.vehicleId===b.vehicleId)||(a.vehicle&&a.vehicle===b.vehicle));
 if(!source&&!(a.date&&a.date===b.date&&contact&&vehicle))return null;
 var ordered=[a,b].sort(function(x,y){return x.id.localeCompare(y.id);});
 var same=!!(a.time&&a.time===b.time),reason=source?'Stejná zdrojová zpráva':same?'Stejný kontakt, vůz, datum a čas':'Stejný kontakt a vůz ve stejný den, jiný čas';
 return {key:perfectDuplicates38Hash_(JSON.stringify(ordered.map(function(x){return x.id;}))),version:perfectDuplicates38Hash_(JSON.stringify(ordered.map(function(x){return perfectDuplicates38Fingerprint_(x.order);}))),reason:reason,exact:!!(source||same),date:a.date,orders:ordered.map(function(x){return x.order;})};
}
function perfectDuplicates38Ledger_(create){
 var ss=perfectDatabaseGetSpreadsheet_(),sh=ss.getSheetByName('__PERFECT_DUPLICITY_ARCHIV');
 // Vytvoření a veškerý zápis vyhrazeny modulu 01.
 if(!sh)return null;
 var headers=sh.getRange(1,1,1,perfectDuplicates38Headers_().length).getValues()[0];
 if(headers.some(function(v,i){return String(v)!==perfectDuplicates38Headers_()[i];}))throw Error('Nesouhlasí hlavička archivu duplicit; rozhodnutí nebylo provedeno.');
 return sh;
}
function perfectDuplicates38Decisions_(){var sh=perfectDuplicates38Ledger_(false);return sh&&sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,perfectDuplicates38Headers_().length).getValues():[];}
function perfectDuplicates38ArchivedGmail_(){var ids={};perfectDuplicates38Decisions_().forEach(function(r){if(r[2]==='KEEP_BOTH')return;JSON.parse(r[8]||'[]').forEach(function(id){if(id)ids[String(id)]=String(r[3]);});});return ids;}
function perfectDuplicates38Scan_(options){
 options=options||{};var records=databaseGetAllOrders().map(perfectDuplicates38Shape_),buckets=new Map(),candidates=new Map();
 var decisions={};perfectDuplicates38Decisions_().forEach(function(r){if(r[2]==='KEEP_BOTH')decisions[String(r[0])]=String(r[1]);});
 // Index podle dne a kontaktu; neporovnáváme každou zakázku se všemi ostatními.
 records.forEach(function(o){var keys=[];if(o.gmail)keys.push('gmail:'+o.gmail);if(o.date){if(o.phone)keys.push(o.date+':phone:'+o.phone);if(o.email)keys.push(o.date+':email:'+o.email);if(o.customer)keys.push(o.date+':customer:'+o.customer);}
  keys.forEach(function(k){var bucket=buckets.get(k)||[];bucket.forEach(function(other){var pair=perfectDuplicates38Pair_(o,other);if(pair&&decisions[pair.key]!==pair.version)candidates.set(pair.key,pair);});bucket.push(o);buckets.set(k,bucket);});
 });
 var pairs=Array.from(candidates.values()).sort(function(a,b){return Number(b.exact)-Number(a.exact)||String(b.date).localeCompare(String(a.date))||a.key.localeCompare(b.key);}),total=pairs.length;
 var offset=Math.max(0,Math.floor(Number(options.offset)||0)),limit=Math.max(1,Math.min(50,Math.floor(Number(options.limit)||20)));
 return {success:true,total:total,scannedOrders:records.length,offset:offset,limit:limit,pairs:pairs.slice(offset,offset+limit)};
}
function perfect40Original_perfectDuplicates38List_(token,options){perfectRepairRequireUser_(token);return perfectRepairSerializable_(perfectDuplicates38Scan_(options));}
function perfect40Original_perfectDuplicates38Resolve_(token,payload){var actor=perfectAuthRequireAdmin_(token);return databaseDuplicates38Resolve_(payload||{},actor);}

// 39_STATISTIKY_TRZBY_ZAMESTNANCI.gs.txt
/** PERFECT 39 — čtecí statistiky v původní sekci Statistiky. Zápis dat zůstává v modulu 01. */
function perfectReports39ShiftMonth_(month, delta) {
  var p=perfectRoster25Month_(month),a=p.month.split('-').map(Number),d=new Date(Date.UTC(a[0],a[1]-1+delta,1));
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
}
function perfectReports39Round_(n){return Math.round((Number(n)||0)*100)/100;}
function perfectReports39Delta_(current,previous){return {amount:perfectReports39Round_(current-previous),percent:previous===0?null:perfectReports39Round_((current-previous)/Math.abs(previous)*100),fromZero:previous===0&&current!==0};}
function perfect40Original_perfectReports39Get_(token,input){
  perfectAuthRequireAdmin_(token);
  var owner=perfectRepairProps_().getProperty('PERFECT_REPORTS39_OWNER_ID');
  if(owner&&String(perfectRepairRequireUser_(token).id)!==String(owner)&&!perfect40Super_(perfectRepairRequireUser_(token)))throw Error('Přehled je vyhrazen hlavnímu administrátorovi.');
  return perfectDatabaseWithLock_('Statistiky V39 — čtení',function(){return perfectReports39Build_(input||{});});
}
function perfectReports39Build_(input){
  var today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd'),currentMonth=today.slice(0,7);
  var period=perfectRoster25Month_(input.month||currentMonth);
  if(period.month>currentMonth)throw Error('Budoucí měsíc ještě nemá uzavřené výdělky.');
  var previous=perfectRoster25Month_(perfectReports39ShiftMonth_(period.month,-1));
  var cutoff=period.month===currentMonth?today:period.to;
  var day=Number(cutoff.slice(-2)),previousCutoff=period.month===currentMonth?previous.month+'-'+String(Math.min(day,previous.days)).padStart(2,'0'):previous.to;
  var firstMonth=perfectReports39ShiftMonth_(period.month,-11);
  // Společné načtení výkonu za celé období. Dělení SPOLEČNĚ i denní odměny zajišťuje stávající ověřený modul 34.
  var source=perfectBoxes25Overview_({from:firstMonth+'-01',to:cutoff});
  var orders=source.orders.filter(function(o){return o.completed&&o.date<=cutoff;});
  var daily=source.daily.filter(function(d){return d.date<=cutoff;});
  var round=perfectReports39Round_,workers={},stationNames={BOX1:'Box 1',BOX2:'Box 2',DETAILING:'Detailing'};
  source.workers.forEach(function(w){workers[w.id]={id:w.id,name:w.name,username:w.username,active:w.active};});
  daily.forEach(function(d){if(d.userId&&!workers[d.userId])workers[d.userId]={id:d.userId,name:'Historický účet '+d.userId,username:'',active:false};});
  function inRange(date,from,to){return date>=from&&date<=to;}
  function summary(from,to){
    var selectedOrders=orders.filter(function(o){return inRange(o.date,from,to);});
    var selectedDays=daily.filter(function(d){return inRange(d.date,from,to);});
    var revenue=round(selectedOrders.reduce(function(n,o){return n+o.revenue;},0));
    var stations=['BOX1','BOX2','DETAILING'].map(function(key){var rows=selectedDays.filter(function(d){return d.station===key;});return {station:key,label:stationNames[key],revenue:round(rows.reduce(function(n,r){return n+r.revenue;},0)),orders:rows.reduce(function(n,r){return n+r.orders;},0),reward:round(rows.reduce(function(n,r){return n+(r.reward===null?0:r.reward);},0)),confirmedShifts:rows.filter(function(r){return r.shift&&r.worked&&r.reward!==null;}).length,unconfirmedDays:rows.filter(function(r){return r.orders&&!(r.shift&&r.worked);}).length};});
    var assigned=round(stations.reduce(function(n,s){return n+s.revenue;},0));
    return {from:from,to:to,revenue:revenue,orders:selectedOrders.length,average:round(selectedOrders.length?revenue/selectedOrders.length:0),stations:stations,unassignedRevenue:round(revenue-assigned),unassignedOrders:selectedOrders.filter(function(o){return !o.station;}).length,reward:round(stations.reduce(function(n,s){return n+s.reward;},0)),confirmedShifts:stations.reduce(function(n,s){return n+s.confirmedShifts;},0),unconfirmedDays:stations.reduce(function(n,s){return n+s.unconfirmedDays;},0)};
  }
  var selected=summary(period.from,cutoff),compare=summary(previous.from,previousCutoff),previousFull=summary(previous.from,previous.to);
  var monthly=[];for(var i=-11;i<=0;i++){var p=perfectRoster25Month_(perfectReports39ShiftMonth_(period.month,i));var end=i===0?cutoff:p.to;var total=summary(p.from,end);total.month=p.month;total.partial=p.month===currentMonth;monthly.push(total);}
  var days=[];for(var n=1;n<=period.days;n++){
    var date=period.month+'-'+String(n).padStart(2,'0'),previousDate=n<=previous.days?previous.month+'-'+String(n).padStart(2,'0'):null;
    var value=date<=cutoff?summary(date,date):null;
    days.push({date:date,day:n,current:value,previous:previousDate?summary(previousDate,previousDate):null,future:date>cutoff});
  }
  function earningsFor(id,from,to){var rows=daily.filter(function(d){return d.userId===id&&inRange(d.date,from,to);}),confirmed=rows.filter(function(d){return d.shift&&d.worked&&d.reward!==null;});return {base:round(confirmed.reduce(function(n,d){return n+d.pay.base;},0)),performanceBonus:round(confirmed.reduce(function(n,d){return n+d.pay.performanceBonus;},0)),weekendBonus:round(confirmed.reduce(function(n,d){return n+d.pay.weekendBonus;},0)),amount:round(confirmed.reduce(function(n,d){return n+d.reward;},0)),confirmedShifts:confirmed.length,unconfirmedDays:rows.filter(function(d){return d.orders&&!(d.shift&&d.worked);}).length,detailingDays:rows.filter(function(d){return d.shift&&d.worked&&d.station==='DETAILING';}).length};}
  var employees=Object.keys(workers).map(function(id){var w=workers[id],mine=earningsFor(id,period.from,cutoff),prior=earningsFor(id,previous.from,previousCutoff);return {id:id,name:w.name,username:w.username,active:w.active,current:mine,previous:prior,previousFull:earningsFor(id,previous.from,previous.to),change:perfectReports39Delta_(mine.amount,prior.amount),months:monthly.map(function(m){return {month:m.month,amount:earningsFor(id,m.from,m.to).amount,confirmedShifts:earningsFor(id,m.from,m.to).confirmedShifts};}),days:daily.filter(function(d){return d.userId===id&&d.date>=period.from&&d.date<=cutoff;}).map(function(d){return {date:d.date,station:d.station,worked:d.worked,confirmed:d.shift&&d.worked&&d.reward!==null,reward:d.reward,stationRevenue:d.revenue,soloRevenue:d.soloRevenue,sharedRevenue:d.sharedRevenue,pay:d.pay,orders:d.orders};})};}).sort(function(a,b){return b.current.amount-a.current.amount||a.name.localeCompare(b.name);});
  var invalidDates=databaseGetAllOrders().filter(function(o){return !perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI)&&['dokonceno','vyhotoveno'].includes(perfectBoxes25Normalize_(o.STAV_OBJEDNAVKY));}).length;
  return {success:true,release:'PERFECT-REPORTS-39',generatedAt:new Date().toISOString(),today:today,month:period.month,previousMonth:previous.month,cutoff:cutoff,current:selected,previous:compare,previousFull:previousFull,change:perfectReports39Delta_(selected.revenue,compare.revenue),daily:days,monthly:monthly,employees:employees,quality:{unassignedOrders:selected.unassignedOrders,unassignedRevenue:selected.unassignedRevenue,unconfirmedDays:selected.unconfirmedDays,invalidDateOrders:invalidDates,detailingWithoutReward:daily.filter(function(d){return d.date>=period.from&&d.station==='DETAILING'&&d.worked;}).length},definitions:{revenue:'Hodnota dokončených zakázek podle data příjezdu. Nejde o bankovní zůstatek ani ověřené hotovostní inkaso. Prodej poukazu se nepřičítá podruhé.',reward:'Vypočtená odměna za potvrzenou odpracovanou směnu na boxu: 1 400 Kč + 25 % z denní tržby nad 6 000 Kč + ručně potvrzený víkendový bonus. Denní tržba je součet samostatných zakázek a podílů ze společných zakázek. Nejde o potvrzení výplaty. Detailing nemá nastavený výpočet.',comparison:period.month===currentMonth?'Stejná uplynulá část měsíce; předchozí měsíc je omezen posledním existujícím dnem.':'Porovnání celých kalendářních měsíců; měsíce mohou mít různý počet dní.'}};
}
/** Jednorázová kontrola z editoru Apps Scriptu; nic nezapisuje do databáze. */
function perfect40Original_perfectReports39Kontrola_(){
  var checks={databaseGetAllOrders:typeof databaseGetAllOrders==='function',perfectBoxes25Overview_:typeof perfectBoxes25Overview_==='function',perfectAuthRequireAdmin_:typeof perfectAuthRequireAdmin_==='function',perfectDatabaseWithLock_:typeof perfectDatabaseWithLock_==='function',perfectShared33Read_:typeof perfectShared33Read_==='function',PERFECT_Statistiky:false};
  try{checks.PERFECT_Statistiky=HtmlService.createHtmlOutputFromFile('PERFECT_Statistiky').getContent().indexOf('perfectReports39Get')>=0;}catch(e){}
  var missing=Object.keys(checks).filter(function(k){return !checks[k];});
  Logger.log(JSON.stringify({version:'PERFECT-REPORTS-39',ready:!missing.length,missing:missing},null,2));
  if(missing.length)throw Error('Chybí součásti přehledů: '+missing.join(', ')+'.');
  return {success:true,ready:true};
}

// 40_OPRAVNENI_SUPERADMIN_AUDIT.gs.txt
/** PERFECT V40: autorizace na serveru, oddělený účet vlastníka, audit bez hesel a tokenů. */
var perfect40Depth_=0;
function perfect40Trusted_(fn){perfect40Depth_++;try{return fn();}finally{perfect40Depth_--;}}
function perfect40TrustedEditor_(){try{var a=Session.getActiveUser().getEmail(),e=Session.getEffectiveUser().getEmail();return !!a&&a===e;}catch(err){return false;}}
function perfect40SuperIds_(){try{return JSON.parse(perfectRepairProps_().getProperty('PERFECT40_SUPER_IDS')||'[]').map(String);}catch(e){throw Error('Neplatné nastavení vlastníka.');}}
function perfect40Super_(user){return !!user&&perfect40SuperIds_().indexOf(String(user.id))>=0;}
function perfect40Catalog_(){return [
 ['orders.read','Zakázky · zobrazení'],['orders.create','Zakázky · vytvoření'],['orders.edit','Zakázky · úpravy'],
 ['customers.read','Zákazníci · zobrazení'],['customers.edit','Zákazníci · úpravy'],['vehicles.read','Vozidla · zobrazení'],['vehicles.edit','Vozidla · úpravy'],
 ['services.read','Ceník · zobrazení'],['vouchers.read','Poukazy · zobrazení'],['vouchers.issue','Poukazy · vystavení'],['vouchers.redeem','Poukazy · čerpání'],['media.read','Fotografie · zobrazení'],['media.write','Fotografie · nahrávání'],['roster.read','Vlastní směnář']
 ].map(function(a){return {key:a[0],label:a[1]};});}
function perfect40Policy_(){var text=perfectRepairProps_().getProperty('PERFECT40_ROLE_POLICY');if(!text)return {version:'0',roles:{PRACOVNIK:perfect40Catalog_().map(function(c){return c.key;}),SMENAR:perfect40Catalog_().map(function(c){return c.key;})}};var p=JSON.parse(text);if(!p.roles||!p.version)throw Error('Neplatné nastavení rolí.');return p;}
function perfect40Caps_(user){if(user.role==='ADMINISTRATOR')return perfect40Catalog_().map(function(c){return c.key;}).concat(['finance.read','users.manage','roles.manage']);return (perfect40Policy_().roles[user.role]||[]).slice();}
function perfect40Can_(user,cap){return perfect40Super_(user)||perfect40Caps_(user).indexOf(cap)>=0;}
function perfect40Require_(token,cap){var u=perfectRepairRequireUser_(token);if(u.previewOnly41===true&&!(typeof perfectPreview41Context_==='function'&&perfectPreview41Context_()))throw Error('Přihlášení vypršelo. Testovací režim není aktivní pro vlastníka.');if(cap==='super'){if(!perfect40Super_(u))throw Error('Tato funkce není pro tento účet dostupná.');}else if(cap&&(!Array.isArray(cap)?!perfect40Can_(u,cap):!cap.some(function(k){return perfect40Can_(u,k);})))throw Error('K této funkci nemáš oprávnění administrátora nebo povolení své role.');return u;}
function perfect40RawTarget_(input){input=input||{};return perfectRepairUsers_().find(function(u){return (input.id&&String(u.id)===String(input.id))||(!input.id&&input.username&&String(u.username).toLowerCase()===String(input.username).toLowerCase());});}
function perfect40GuardUser_(actor,input){var target=perfect40RawTarget_(input);if(!perfect40Super_(actor)&&(perfect40Super_(target)||target&&target.role==='ADMINISTRATOR'||String(input&&input.role||'')==='ADMINISTRATOR'))throw Error('Tento účet nelze z této role spravovat.');if(perfect40Super_(target)&&String(target.id)===String(actor.id)&&(input.active===false||input.role&&input.role!=='ADMINISTRATOR'))throw Error('Vlastní účet vlastníka musí zůstat aktivním administrátorem.');}
function perfect40PublicUser_(user){var visible=perfect40BasePublicUser_(user);visible.capabilities40=perfect40Caps_(user);visible.superAdmin40=perfect40Super_(user);return visible;}
function perfect40Original_perfectSecurity40Get_(token){var u=perfect40Require_(token,'roles.manage'),p=perfect40Policy_();return {success:true,version:p.version,catalog:perfect40Catalog_(),roles:p.roles,superAdmin40:perfect40Super_(u)};}
function perfect40Original_perfectSecurity40Save_(token,input){var u=perfect40Require_(token,'roles.manage');return databaseSecurity40Save_(u,input||{});}
function perfect40Original_perfectSecurity40Audit_(token,input){perfect40Require_(token,'super');return databaseSecurity40ReadAudit_(input||{});}
function perfect40PrivateSnapshot_(name,args){
 var p=args&&args[1]||{},result={};
 if(/UpdateOrder|ArchiveOrder/.test(name)&&p.ORDER_ID){var o=databaseGetAllOrders().find(function(x){return String(x.ORDER_ID)===String(p.ORDER_ID);});if(o)result=perfect40OrderFields_(o);}
 else if(/UsersSave|UpsertUser/.test(name)){var u=perfect40RawTarget_(p);if(u)result={id:u.id,username:u.username,role:u.role,active:u.active!==false};}
 else if(name==='perfectSecurity40Save')result=perfect40Policy_();
 return result;
}
function perfect40OrderFields_(o){var result={};['ORDER_ID','DATUM_OBJEDNANI','CAS_PRIJEZDU','MYCI_PROGRAM','CENA_CELKEM','CENA_PROGRAMU','STAV_OBJEDNAVKY','PRACOVNIK','CENOVE_POLOZKY'].forEach(function(k){if(o&&o[k]!==undefined)result[k]=String(o[k]).slice(0,1500);});return result;}
function perfect40After_(name,args,value){var p=args&&args[1]||{};if(value&&value.order)return perfect40OrderFields_(value.order);if(/UsersSave|UpsertUser/.test(name)&&value&&value.user)return {id:value.user.id,username:value.user.username,role:value.user.role,active:value.user.active,passwordReset:!!p.password};if(name==='perfectSecurity40Save')return perfect40Policy_();return {id:String(value&&value.ORDER_ID||value&&value.record&&value.record.id||p.ORDER_ID||p.id||p.orderId||''),fields:Object.keys(p).filter(function(k){return !/password|token|secret|text|dataUrl/i.test(k);}).slice(0,30)};}
function perfect40SanitizeResult_(name,args,value,actor){
 var superIds=perfect40SuperIds_(),raw=perfectRepairUsers_(),hiddenNames=raw.filter(function(u){return superIds.indexOf(String(u.id))>=0;}).map(function(u){return u.username;});
 if(name==='perfectAdminUsersList'&&value&&value.users&&!perfect40Super_(actor))value.users=value.users.filter(function(u){return superIds.indexOf(String(u.id))<0;});
 if(name==='perfectAuthGetUsers'&&Array.isArray(value)&&!perfect40Super_(actor))value=value.filter(function(u){return superIds.indexOf(String(u.id))<0;});
 if(name==='perfectWebGetWorkers'&&Array.isArray(value))value=value.filter(function(u){return hiddenNames.indexOf(u.username)<0;});
 if(name==='perfectBoxesGetOverviewV25'&&value&&value.workers&&!perfect40Super_(actor))value.workers=value.workers.filter(function(u){return superIds.indexOf(String(u.id))<0;});
 if(name==='perfectReports39Get'&&value&&!perfect40Super_(actor))value.employees=value.employees.filter(function(u){return superIds.indexOf(String(u.id))<0;});
 if(name==='perfectControlTickAddons31'&&value&&!perfect40Can_(actor,'orders.read'))value.orders=[];
 if(value&&value.user&&actor&&String(value.user.id)===String(actor.id))value.user=perfect40PublicUser_(actor);
 if(value&&value.bootstrap)value.bootstrap=perfect40FilterBootstrap_(value.bootstrap,actor);
 if(name==='perfectWebBootstrap36')value=perfect40FilterBootstrap_(value,actor);
 if(name==='perfectWebGetDashboardData'&&value){if(actor.role!=='ADMINISTRATOR'){value.todayRevenue=null;value.totalRevenue=null;}if(!perfect40Can_(actor,'orders.read')){value.latestOrders=[];value.orders=0;}if(!perfect40Can_(actor,'customers.read'))value.customers=0;if(!perfect40Can_(actor,'vehicles.read'))value.vehicles=0;}
 return value;
}
function perfect40FilterBootstrap_(data,user){if(!data||!user)return data;data.user=perfect40PublicUser_(user);if(!perfect40Can_(user,'orders.read')){data.orders=[];if(data.summary){data.summary.latestOrders=[];data.summary.centralOrders=0;}}if(!perfect40Can_(user,'customers.read')){data.customers=[];if(data.summary)data.summary.centralCustomers=0;}if(!perfect40Can_(user,'vehicles.read')){data.vehicles=[];if(data.summary)data.summary.centralVehicles=0;}if(!perfect40Can_(user,'services.read'))data.services=[];var names=perfectRepairUsers_().filter(perfect40Super_).map(function(u){return u.username;});data.workers=(data.workers||[]).filter(function(w){return names.indexOf(w.username)<0;});if(user.role!=='ADMINISTRATOR'&&data.summary)data.summary.todayRevenue=null;return data;}
function perfect40Enter_(name,fn,args,cap){
 if(name==='gmailRunAutomaticImport'&&perfectRepairProps_().getProperty('PERFECT41_TEST_MODE')==='ON')throw Error('Gmail import je v testovací kopii vypnutý.');
 if(perfect40Depth_)return fn.apply(null,args);
 var login=/^perfectAuthLogin/.test(name),publicCall=login||name==='perfectAuthGetStatus'||name==='perfectWebGetBrandAssets37'||name==='doGet';
 if(cap==='internal'&&!perfect40TrustedEditor_())throw Error('Tato funkce se spouští pouze z editoru nebo důvěryhodné úlohy.');
 return perfect40Trusted_(function(){
  var actor=null,payload=args&&args[1]||{},before={},result,error;
  if(!publicCall&&cap!=='internal')actor=perfect40Require_(args[0],cap);
  if(/UsersSave|UpsertUser/.test(name))perfect40GuardUser_(actor,payload);
  if(name==='perfectAdminUsersGetAvatar'&&!perfect40Super_(actor)&&perfect40Super_(perfect40RawTarget_({id:args[1]})))return {data:''};
  var write=/CreateOrder|UpdateOrder|UpdateCustomer|UpdateVehicle|SaveService|ArchiveOrder|ArchiveTest|UsersSave|UpsertUser|ChangePassword|SaveMyProfile|MediaSave|SaveShift|SaveOrder|Voucher36(?:Setup|SaveProduct|Issue|Edit|Redeem|Import$)|Duplicates38Resolve|Security40Save/.test(name);
  if(write){databaseSecurity40AuditSheet_();before=perfect40PrivateSnapshot_(name,args);}
  try{result=fn.apply(null,args);if(login&&result&&result.user){actor=perfectRepairUsers_().find(function(u){return String(u.id)===String(result.user.id);});}result=perfect40SanitizeResult_(name,args,result,actor||{});}catch(e){error=e;}
  if(login||write||name==='perfectAuthLogout'){
   var action=login?'LOGIN':name==='perfectAuthLogout'?'LOGOUT':name;
   // Pouze bezpečná pole: nikdy heslo, hash, token, klíč, obsah importu ani fotografie.
   databaseSecurity40Audit_(actor,action,String(payload.ORDER_ID||payload.id||result&&result.ORDER_ID||result&&result.user&&result.user.id||''),before,error?{}:perfect40After_(name,args,result),error?'FAILED':'OK',login&&!actor?'Přihlášení nebylo ověřeno.':'');
  }
  if(error)throw error;return result;
 });
}
/** Spouštět výhradně z editoru; koncové _ blokuje google.script.run. */
function perfectSuperAdmin40Setup_(){return perfect40Trusted_(function(){return databaseSecurity40SetupOwner_();});}
function perfect40GmailCron_(){if(perfectRepairProps_().getProperty('PERFECT41_TEST_MODE')==='ON')return {skipped:true,reason:'Testovací kopie nepoužívá ostrý Gmail.'};return perfect40Trusted_(function(){return gmailRunAutomaticImport();});}
function perfect40TimingCron_(){return perfect40Trusted_(function(){return perfectAutoStatusRun();});}
/** Jednorázově z editoru: zachová ostatní spouštěče a nahradí pouze známé staré časovače. */
function perfect40Install_(){return perfect40Trusted_(function(){var gmail=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='gmailRunAutomaticImport'||t.getHandlerFunction()==='perfect40GmailCron_';});perfectNastavitAutomatikuV31_();if(gmail){ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='gmailRunAutomaticImport'||t.getHandlerFunction()==='perfect40GmailCron_';}).forEach(function(t){ScriptApp.deleteTrigger(t);});ScriptApp.newTrigger('perfect40GmailCron_').timeBased().everyMinutes(5).create();}databaseSecurity40AuditSheet_();return {success:true};});}

function perfectRepairPublicUser_(u){return perfect40PublicUser_(u);}

// Schválené webové vstupy a ochrana starých veřejných pomocníků.
function databaseInitialize(){return perfect40Enter_("databaseInitialize",perfect40Original_databaseInitialize_,arguments,"internal");}
function databaseGetAllCustomers(){return perfect40Enter_("databaseGetAllCustomers",perfect40Original_databaseGetAllCustomers_,arguments,"internal");}
function databaseGetAllVehicles(){return perfect40Enter_("databaseGetAllVehicles",perfect40Original_databaseGetAllVehicles_,arguments,"internal");}
function databaseGetAllOrders(){return perfect40Enter_("databaseGetAllOrders",perfect40Original_databaseGetAllOrders_,arguments,"internal");}
function databaseFindCustomerById(){return perfect40Enter_("databaseFindCustomerById",perfect40Original_databaseFindCustomerById_,arguments,"internal");}
function databaseFindCustomerByPhone(){return perfect40Enter_("databaseFindCustomerByPhone",perfect40Original_databaseFindCustomerByPhone_,arguments,"internal");}
function databaseFindCustomerByEmail(){return perfect40Enter_("databaseFindCustomerByEmail",perfect40Original_databaseFindCustomerByEmail_,arguments,"internal");}
function databaseFindOrderById(){return perfect40Enter_("databaseFindOrderById",perfect40Original_databaseFindOrderById_,arguments,"internal");}
function databaseFindOrderByGmailMessageId(){return perfect40Enter_("databaseFindOrderByGmailMessageId",perfect40Original_databaseFindOrderByGmailMessageId_,arguments,"internal");}
function databaseGetOrdersByCustomerId(){return perfect40Enter_("databaseGetOrdersByCustomerId",perfect40Original_databaseGetOrdersByCustomerId_,arguments,"internal");}
function databaseGetVehiclesByCustomerId(){return perfect40Enter_("databaseGetVehiclesByCustomerId",perfect40Original_databaseGetVehiclesByCustomerId_,arguments,"internal");}
function databaseCreateCustomer(){return perfect40Enter_("databaseCreateCustomer",perfect40Original_databaseCreateCustomer_,arguments,"internal");}
function databaseUpdateCustomer(){return perfect40Enter_("databaseUpdateCustomer",perfect40Original_databaseUpdateCustomer_,arguments,"internal");}
function databaseCreateVehicle(){return perfect40Enter_("databaseCreateVehicle",perfect40Original_databaseCreateVehicle_,arguments,"internal");}
function databaseCreateOrder(){return perfect40Enter_("databaseCreateOrder",perfect40Original_databaseCreateOrder_,arguments,"internal");}
function databaseUpdateOrder(){return perfect40Enter_("databaseUpdateOrder",perfect40Original_databaseUpdateOrder_,arguments,"internal");}
function databaseUpdateVehicle(){return perfect40Enter_("databaseUpdateVehicle",perfect40Original_databaseUpdateVehicle_,arguments,"internal");}
function designCentralniDatabaze(){return perfect40Enter_("designCentralniDatabaze",perfect40Original_designCentralniDatabaze_,arguments,"internal");}
function opravitValidaciGmailImportu(){return perfect40Enter_("opravitValidaciGmailImportu",perfect40Original_opravitValidaciGmailImportu_,arguments,"internal");}
function gmailPreviewNextBatch(){return perfect40Enter_("gmailPreviewNextBatch",perfect40Original_gmailPreviewNextBatch_,arguments,"internal");}
function gmailStartAutomaticImport(){return perfect40Enter_("gmailStartAutomaticImport",perfect40Original_gmailStartAutomaticImport_,arguments,"internal");}
function gmailStopAutomaticImport(){return perfect40Enter_("gmailStopAutomaticImport",perfect40Original_gmailStopAutomaticImport_,arguments,"internal");}
function gmailRunAutomaticImport(){return perfect40Enter_("gmailRunAutomaticImport",perfect40Original_gmailRunAutomaticImport_,arguments,"internal");}
function gmailTestPermissionsV23(){return perfect40Enter_("gmailTestPermissionsV23",perfect40Original_gmailTestPermissionsV23_,arguments,"internal");}
function gmailAutomaticImportStatus(){return perfect40Enter_("gmailAutomaticImportStatus",perfect40Original_gmailAutomaticImportStatus_,arguments,"internal");}
function gmailDryRun10Reservations(){return perfect40Enter_("gmailDryRun10Reservations",perfect40Original_gmailDryRun10Reservations_,arguments,"internal");}
function gmailTestLoad10Reservations(){return perfect40Enter_("gmailTestLoad10Reservations",perfect40Original_gmailTestLoad10Reservations_,arguments,"internal");}
function gmailTestParse10Reservations(){return perfect40Enter_("gmailTestParse10Reservations",perfect40Original_gmailTestParse10Reservations_,arguments,"internal");}
function perfectGmailSpustitV24(){return perfect40Enter_("perfectGmailSpustitV24",perfect40Original_perfectGmailSpustitV24_,arguments,"internal");}
function perfectGmailDiagnostikaV24(){return perfect40Enter_("perfectGmailDiagnostikaV24",perfect40Original_perfectGmailDiagnostikaV24_,arguments,"internal");}
function generateOrderId(){return perfect40Enter_("generateOrderId",perfect40Original_generateOrderId_,arguments,"internal");}
function perfectOrderIdPreviewV28(){return perfect40Enter_("perfectOrderIdPreviewV28",perfect40Original_perfectOrderIdPreviewV28_,arguments,"internal");}
function perfectStaffGetMyStatistics(){return perfect40Enter_("perfectStaffGetMyStatistics",perfect40Original_perfectStaffGetMyStatistics_,arguments,"");}
function perfectAdminUsersList(){return perfect40Enter_("perfectAdminUsersList",perfect40Original_perfectAdminUsersList_,arguments,"users.manage");}
function perfectAdminUsersHistory(){return perfect40Enter_("perfectAdminUsersHistory",perfect40Original_perfectAdminUsersHistory_,arguments,"super");}
function perfectAdminUsersSave(){return perfect40Enter_("perfectAdminUsersSave",perfect40Original_perfectAdminUsersSave_,arguments,"users.manage");}
function perfectAdminUsersGetAvatar(){return perfect40Enter_("perfectAdminUsersGetAvatar",perfect40Original_perfectAdminUsersGetAvatar_,arguments,"users.manage");}
function perfectLoga42GetManifest(){return perfect40Enter_("perfectLoga42GetManifest",perfect40Original_perfectLoga42GetManifest_,arguments,"internal");}
function perfectLoga42GetBrand(){return perfect40Enter_("perfectLoga42GetBrand",perfect40Original_perfectLoga42GetBrand_,arguments,"internal");}
function perfectLoga42Test(){return perfect40Enter_("perfectLoga42Test",perfect40Original_perfectLoga42Test_,arguments,"internal");}
function perfectLogo42GetMap(){return perfect40Enter_("perfectLogo42GetMap",perfect40Original_perfectLogo42GetMap_,arguments,"media.read");}
function perfectLogo42Diagnostika(){return perfect40Enter_("perfectLogo42Diagnostika",perfect40Original_perfectLogo42Diagnostika_,arguments,"internal");}
function perfectAutoStatusRun(){return perfect40Enter_("perfectAutoStatusRun",perfect40Original_perfectAutoStatusRun_,arguments,"internal");}
function perfectAutoStatusPreview(){return perfect40Enter_("perfectAutoStatusPreview",perfect40Original_perfectAutoStatusPreview_,arguments,"internal");}
function perfectAutoStatusBackfill(){return perfect40Enter_("perfectAutoStatusBackfill",perfect40Original_perfectAutoStatusBackfill_,arguments,"internal");}
function perfectControlSetupV26(){return perfect40Enter_("perfectControlSetupV26",perfect40Original_perfectControlSetupV26_,arguments,"internal");}
function perfectControlTickV26(){return perfect40Enter_("perfectControlTickV26",perfect40Original_perfectControlTickV26_,arguments,"internal");}
function perfectWebGetAllHistoricalDataAddons31(){return perfect40Enter_("perfectWebGetAllHistoricalDataAddons31",perfect40Original_perfectWebGetAllHistoricalDataAddons31_,arguments,"internal");}
function perfectControlTickAddons31(){return perfect40Enter_("perfectControlTickAddons31",perfect40Original_perfectControlTickAddons31_,arguments,"");}
function perfectBoxesGetOverviewV25(){return perfect40Enter_("perfectBoxesGetOverviewV25",perfect40Original_perfectBoxesGetOverviewV25_,arguments,"finance.read");}
function perfectBoxesSaveShiftV25(){return perfect40Enter_("perfectBoxesSaveShiftV25",perfect40Original_perfectBoxesSaveShiftV25_,arguments,"finance.read");}
function perfectBoxesSaveOrderV25(){return perfect40Enter_("perfectBoxesSaveOrderV25",perfect40Original_perfectBoxesSaveOrderV25_,arguments,"finance.read");}
function perfectRosterSeedV25(){return perfect40Enter_("perfectRosterSeedV25",perfect40Original_perfectRosterSeedV25_,arguments,"internal");}
function perfectRosterGetMineV25(){return perfect40Enter_("perfectRosterGetMineV25",perfect40Original_perfectRosterGetMineV25_,arguments,"roster.read");}
function perfectVoucher36Setup(){return perfect40Enter_("perfectVoucher36Setup",perfect40Original_perfectVoucher36Setup_,arguments,"finance.read");}
function perfectVoucher36List(){return perfect40Enter_("perfectVoucher36List",perfect40Original_perfectVoucher36List_,arguments,"vouchers.read");}
function perfectVoucher36SaveProduct(){return perfect40Enter_("perfectVoucher36SaveProduct",perfect40Original_perfectVoucher36SaveProduct_,arguments,"finance.read");}
function perfectVoucher36Issue(){return perfect40Enter_("perfectVoucher36Issue",perfect40Original_perfectVoucher36Issue_,arguments,"vouchers.issue");}
function perfectVoucher36Edit(){return perfect40Enter_("perfectVoucher36Edit",perfect40Original_perfectVoucher36Edit_,arguments,"finance.read");}
function perfectVoucher36Redeem(){return perfect40Enter_("perfectVoucher36Redeem",perfect40Original_perfectVoucher36Redeem_,arguments,"vouchers.redeem");}
function perfectVoucher36History(){return perfect40Enter_("perfectVoucher36History",perfect40Original_perfectVoucher36History_,arguments,"vouchers.read");}
function perfectVoucher36Art(){return perfect40Enter_("perfectVoucher36Art",perfect40Original_perfectVoucher36Art_,arguments,"vouchers.read");}
function perfectVoucher36ImportPreview(){return perfect40Enter_("perfectVoucher36ImportPreview",perfect40Original_perfectVoucher36ImportPreview_,arguments,"finance.read");}
function perfectVoucher36Import(){return perfect40Enter_("perfectVoucher36Import",perfect40Original_perfectVoucher36Import_,arguments,"finance.read");}
function perfectWebBootstrap36(){return perfect40Enter_("perfectWebBootstrap36",perfect40Original_perfectWebBootstrap36_,arguments,"");}
function perfectAuthLoginFast36(){return perfect40Enter_("perfectAuthLoginFast36",perfect40Original_perfectAuthLoginFast36_,arguments,"");}
function perfectAuthLoginBootstrap37(){return perfect40Enter_("perfectAuthLoginBootstrap37",perfect40Original_perfectAuthLoginBootstrap37_,arguments,"");}
function perfectWebGetBrandAssets37(){return perfect40Enter_("perfectWebGetBrandAssets37",perfect40Original_perfectWebGetBrandAssets37_,arguments,"");}
function perfectKontrolaProjektuV37(){return perfect40Enter_("perfectKontrolaProjektuV37",perfect40Original_perfectKontrolaProjektuV37_,arguments,"internal");}
function perfectDokoncitInstalaciV37(){return perfect40Enter_("perfectDokoncitInstalaciV37",perfect40Original_perfectDokoncitInstalaciV37_,arguments,"internal");}
function perfectDuplicates38List(){return perfect40Enter_("perfectDuplicates38List",perfect40Original_perfectDuplicates38List_,arguments,"orders.read");}
function perfectDuplicates38Resolve(){return perfect40Enter_("perfectDuplicates38Resolve",perfect40Original_perfectDuplicates38Resolve_,arguments,"finance.read");}
function perfectReports39Get(){return perfect40Enter_("perfectReports39Get",perfect40Original_perfectReports39Get_,arguments,"finance.read");}
function perfectReports39Kontrola(){return perfect40Enter_("perfectReports39Kontrola",perfect40Original_perfectReports39Kontrola_,arguments,"internal");}
function perfectWebGetServicesAddons31(){return perfect40Enter_("perfectWebGetServicesAddons31",perfect40Original_perfectWebGetServicesAddons31_,arguments,"services.read");}
function perfectWebSaveServiceAddons31(){return perfect40Enter_("perfectWebSaveServiceAddons31",perfect40Original_perfectWebSaveServiceAddons31_,arguments,"finance.read");}
function perfectWebCreateOrderAddons31(){return perfect40Enter_("perfectWebCreateOrderAddons31",perfect40Original_perfectWebCreateOrderAddons31_,arguments,"orders.create");}
function perfectWebUpdateOrderAddons31(){return perfect40Enter_("perfectWebUpdateOrderAddons31",perfect40Original_perfectWebUpdateOrderAddons31_,arguments,"orders.edit");}
function doGet(){return perfect40Enter_("doGet",perfect40Original_doGet_,arguments,"");}
function pripravitWebAObjednavkovyList(){return perfect40Enter_("pripravitWebAObjednavkovyList",perfect40Original_pripravitWebAObjednavkovyList_,arguments,"internal");}
function zobrazitSloupceObjednavek(){return perfect40Enter_("zobrazitSloupceObjednavek",perfect40Original_zobrazitSloupceObjednavek_,arguments,"internal");}
function perfectAuthGetStatus(){return perfect40Enter_("perfectAuthGetStatus",perfect40Original_perfectAuthGetStatus_,arguments,"");}
function perfectAuthLogin(){return perfect40Enter_("perfectAuthLogin",perfect40Original_perfectAuthLogin_,arguments,"");}
function perfectAuthWhoAmI(){return perfect40Enter_("perfectAuthWhoAmI",perfect40Original_perfectAuthWhoAmI_,arguments,"internal");}
function perfectAuthLogout(){return perfect40Enter_("perfectAuthLogout",perfect40Original_perfectAuthLogout_,arguments,"");}
function perfectWebGetAppInfo(){return perfect40Enter_("perfectWebGetAppInfo",perfect40Original_perfectWebGetAppInfo_,arguments,"internal");}
function perfectWebGetAllHistoricalData(){return perfect40Enter_("perfectWebGetAllHistoricalData",perfect40Original_perfectWebGetAllHistoricalData_,arguments,"internal");}
function perfectWebGetDashboardData(){return perfect40Enter_("perfectWebGetDashboardData",perfect40Original_perfectWebGetDashboardData_,arguments,"");}
function perfectWebGetServices(){return perfect40Enter_("perfectWebGetServices",perfect40Original_perfectWebGetServices_,arguments,"internal");}
function perfectWebGetWorkers(){return perfect40Enter_("perfectWebGetWorkers",perfect40Original_perfectWebGetWorkers_,arguments,["orders.read", "orders.create", "orders.edit"]);}
function perfectWebSaveService(){return perfect40Enter_("perfectWebSaveService",perfect40Original_perfectWebSaveService_,arguments,"finance.read");}
function perfectWebCreateOrder(){return perfect40Enter_("perfectWebCreateOrder",perfect40Original_perfectWebCreateOrder_,arguments,"orders.create");}
function perfectWebUpdateOrder(){return perfect40Enter_("perfectWebUpdateOrder",perfect40Original_perfectWebUpdateOrder_,arguments,"orders.edit");}
function perfectU06GetLogoMap(){return perfect40Enter_("perfectU06GetLogoMap",perfect40Original_perfectU06GetLogoMap_,arguments,"internal");}
function perfectAuthBootstrapAdmin(){return perfect40Enter_("perfectAuthBootstrapAdmin",perfect40Original_perfectAuthBootstrapAdmin_,arguments,"internal");}
function perfectAuthGetUsers(){return perfect40Enter_("perfectAuthGetUsers",perfect40Original_perfectAuthGetUsers_,arguments,"internal");}
function perfectAuthUpsertUser(){return perfect40Enter_("perfectAuthUpsertUser",perfect40Original_perfectAuthUpsertUser_,arguments,"users.manage");}
function perfectAuthChangePassword(){return perfect40Enter_("perfectAuthChangePassword",perfect40Original_perfectAuthChangePassword_,arguments,"");}
function perfectWebPreviewTestOrders(){return perfect40Enter_("perfectWebPreviewTestOrders",perfect40Original_perfectWebPreviewTestOrders_,arguments,"finance.read");}
function perfectWebArchiveTestOrders(){return perfect40Enter_("perfectWebArchiveTestOrders",perfect40Original_perfectWebArchiveTestOrders_,arguments,"finance.read");}
function perfectAuthGetMyProfile(){return perfect40Enter_("perfectAuthGetMyProfile",perfect40Original_perfectAuthGetMyProfile_,arguments,"");}
function perfectAuthSaveMyProfile(){return perfect40Enter_("perfectAuthSaveMyProfile",perfect40Original_perfectAuthSaveMyProfile_,arguments,"");}
function perfectWebUpdateCustomer(){return perfect40Enter_("perfectWebUpdateCustomer",perfect40Original_perfectWebUpdateCustomer_,arguments,"customers.edit");}
function perfectWebUpdateVehicle(){return perfect40Enter_("perfectWebUpdateVehicle",perfect40Original_perfectWebUpdateVehicle_,arguments,"vehicles.edit");}
function perfectV13MediaGet(){return perfect40Enter_("perfectV13MediaGet",perfect40Original_perfectV13MediaGet_,arguments,"media.read");}
function perfectV13MediaSave(){return perfect40Enter_("perfectV13MediaSave",perfect40Original_perfectV13MediaSave_,arguments,"media.write");}
function perfectV13MediaGetProfileBatch(){return perfect40Enter_("perfectV13MediaGetProfileBatch",perfect40Original_perfectV13MediaGetProfileBatch_,arguments,"media.read");}
function perfectWebAdminArchiveOrder(){return perfect40Enter_("perfectWebAdminArchiveOrder",perfect40Original_perfectWebAdminArchiveOrder_,arguments,"finance.read");}
function perfectSecurity40Get(){return perfect40Enter_("perfectSecurity40Get",perfect40Original_perfectSecurity40Get_,arguments,"roles.manage");}
function perfectSecurity40Save(){return perfect40Enter_("perfectSecurity40Save",perfect40Original_perfectSecurity40Save_,arguments,"roles.manage");}
function perfectSecurity40Audit(){return perfect40Enter_("perfectSecurity40Audit",perfect40Original_perfectSecurity40Audit_,arguments,"super");}

/** Před nasazením z editoru; pouze kontroluje soulad úplných náhrad. */
function perfect40Kontrola_(){var all=[["perfect40Original_databaseCreateCustomer_",typeof perfect40Original_databaseCreateCustomer_],["perfect40Original_databaseCreateOrder_",typeof perfect40Original_databaseCreateOrder_],["perfect40Original_databaseCreateVehicle_",typeof perfect40Original_databaseCreateVehicle_],["perfect40Original_databaseFindCustomerByEmail_",typeof perfect40Original_databaseFindCustomerByEmail_],["perfect40Original_databaseFindCustomerById_",typeof perfect40Original_databaseFindCustomerById_],["perfect40Original_databaseFindCustomerByPhone_",typeof perfect40Original_databaseFindCustomerByPhone_],["perfect40Original_databaseFindOrderByGmailMessageId_",typeof perfect40Original_databaseFindOrderByGmailMessageId_],["perfect40Original_databaseFindOrderById_",typeof perfect40Original_databaseFindOrderById_],["perfect40Original_databaseGetAllCustomers_",typeof perfect40Original_databaseGetAllCustomers_],["perfect40Original_databaseGetAllOrders_",typeof perfect40Original_databaseGetAllOrders_],["perfect40Original_databaseGetAllVehicles_",typeof perfect40Original_databaseGetAllVehicles_],["perfect40Original_databaseGetOrdersByCustomerId_",typeof perfect40Original_databaseGetOrdersByCustomerId_],["perfect40Original_databaseGetVehiclesByCustomerId_",typeof perfect40Original_databaseGetVehiclesByCustomerId_],["perfect40Original_databaseInitialize_",typeof perfect40Original_databaseInitialize_],["perfect40Original_databaseUpdateCustomer_",typeof perfect40Original_databaseUpdateCustomer_],["perfect40Original_databaseUpdateOrder_",typeof perfect40Original_databaseUpdateOrder_],["perfect40Original_databaseUpdateVehicle_",typeof perfect40Original_databaseUpdateVehicle_],["perfect40Original_designCentralniDatabaze_",typeof perfect40Original_designCentralniDatabaze_],["perfect40Original_doGet_",typeof perfect40Original_doGet_],["perfect40Original_generateOrderId_",typeof perfect40Original_generateOrderId_],["perfect40Original_gmailAutomaticImportStatus_",typeof perfect40Original_gmailAutomaticImportStatus_],["perfect40Original_gmailDryRun10Reservations_",typeof perfect40Original_gmailDryRun10Reservations_],["perfect40Original_gmailPreviewNextBatch_",typeof perfect40Original_gmailPreviewNextBatch_],["perfect40Original_gmailRunAutomaticImport_",typeof perfect40Original_gmailRunAutomaticImport_],["perfect40Original_gmailStartAutomaticImport_",typeof perfect40Original_gmailStartAutomaticImport_],["perfect40Original_gmailStopAutomaticImport_",typeof perfect40Original_gmailStopAutomaticImport_],["perfect40Original_gmailTestLoad10Reservations_",typeof perfect40Original_gmailTestLoad10Reservations_],["perfect40Original_gmailTestParse10Reservations_",typeof perfect40Original_gmailTestParse10Reservations_],["perfect40Original_gmailTestPermissionsV23_",typeof perfect40Original_gmailTestPermissionsV23_],["perfect40Original_opravitValidaciGmailImportu_",typeof perfect40Original_opravitValidaciGmailImportu_],["perfect40Original_perfectAdminUsersGetAvatar_",typeof perfect40Original_perfectAdminUsersGetAvatar_],["perfect40Original_perfectAdminUsersHistory_",typeof perfect40Original_perfectAdminUsersHistory_],["perfect40Original_perfectAdminUsersList_",typeof perfect40Original_perfectAdminUsersList_],["perfect40Original_perfectAdminUsersSave_",typeof perfect40Original_perfectAdminUsersSave_],["perfect40Original_perfectAuthBootstrapAdmin_",typeof perfect40Original_perfectAuthBootstrapAdmin_],["perfect40Original_perfectAuthChangePassword_",typeof perfect40Original_perfectAuthChangePassword_],["perfect40Original_perfectAuthGetMyProfile_",typeof perfect40Original_perfectAuthGetMyProfile_],["perfect40Original_perfectAuthGetStatus_",typeof perfect40Original_perfectAuthGetStatus_],["perfect40Original_perfectAuthGetUsers_",typeof perfect40Original_perfectAuthGetUsers_],["perfect40Original_perfectAuthLoginBootstrap37_",typeof perfect40Original_perfectAuthLoginBootstrap37_],["perfect40Original_perfectAuthLoginFast36_",typeof perfect40Original_perfectAuthLoginFast36_],["perfect40Original_perfectAuthLogin_",typeof perfect40Original_perfectAuthLogin_],["perfect40Original_perfectAuthLogout_",typeof perfect40Original_perfectAuthLogout_],["perfect40Original_perfectAuthSaveMyProfile_",typeof perfect40Original_perfectAuthSaveMyProfile_],["perfect40Original_perfectAuthUpsertUser_",typeof perfect40Original_perfectAuthUpsertUser_],["perfect40Original_perfectAuthWhoAmI_",typeof perfect40Original_perfectAuthWhoAmI_],["perfect40Original_perfectAutoStatusBackfill_",typeof perfect40Original_perfectAutoStatusBackfill_],["perfect40Original_perfectAutoStatusPreview_",typeof perfect40Original_perfectAutoStatusPreview_],["perfect40Original_perfectAutoStatusRun_",typeof perfect40Original_perfectAutoStatusRun_],["perfect40Original_perfectBoxesGetOverviewV25_",typeof perfect40Original_perfectBoxesGetOverviewV25_],["perfect40Original_perfectBoxesSaveOrderV25_",typeof perfect40Original_perfectBoxesSaveOrderV25_],["perfect40Original_perfectBoxesSaveShiftV25_",typeof perfect40Original_perfectBoxesSaveShiftV25_],["perfect40Original_perfectControlSetupV26_",typeof perfect40Original_perfectControlSetupV26_],["perfect40Original_perfectControlTickAddons31_",typeof perfect40Original_perfectControlTickAddons31_],["perfect40Original_perfectControlTickV26_",typeof perfect40Original_perfectControlTickV26_],["perfect40Original_perfectDokoncitInstalaciV37_",typeof perfect40Original_perfectDokoncitInstalaciV37_],["perfect40Original_perfectDuplicates38List_",typeof perfect40Original_perfectDuplicates38List_],["perfect40Original_perfectDuplicates38Resolve_",typeof perfect40Original_perfectDuplicates38Resolve_],["perfect40Original_perfectGmailDiagnostikaV24_",typeof perfect40Original_perfectGmailDiagnostikaV24_],["perfect40Original_perfectGmailSpustitV24_",typeof perfect40Original_perfectGmailSpustitV24_],["perfect40Original_perfectKontrolaProjektuV37_",typeof perfect40Original_perfectKontrolaProjektuV37_],["perfect40Original_perfectLoga42GetBrand_",typeof perfect40Original_perfectLoga42GetBrand_],["perfect40Original_perfectLoga42GetManifest_",typeof perfect40Original_perfectLoga42GetManifest_],["perfect40Original_perfectLoga42Test_",typeof perfect40Original_perfectLoga42Test_],["perfect40Original_perfectLogo42Diagnostika_",typeof perfect40Original_perfectLogo42Diagnostika_],["perfect40Original_perfectLogo42GetMap_",typeof perfect40Original_perfectLogo42GetMap_],["perfect40Original_perfectOrderIdPreviewV28_",typeof perfect40Original_perfectOrderIdPreviewV28_],["perfect40Original_perfectReports39Get_",typeof perfect40Original_perfectReports39Get_],["perfect40Original_perfectReports39Kontrola_",typeof perfect40Original_perfectReports39Kontrola_],["perfect40Original_perfectRosterGetMineV25_",typeof perfect40Original_perfectRosterGetMineV25_],["perfect40Original_perfectRosterSeedV25_",typeof perfect40Original_perfectRosterSeedV25_],["perfect40Original_perfectSecurity40Audit_",typeof perfect40Original_perfectSecurity40Audit_],["perfect40Original_perfectSecurity40Get_",typeof perfect40Original_perfectSecurity40Get_],["perfect40Original_perfectSecurity40Save_",typeof perfect40Original_perfectSecurity40Save_],["perfect40Original_perfectStaffGetMyStatistics_",typeof perfect40Original_perfectStaffGetMyStatistics_],["perfect40Original_perfectU06GetLogoMap_",typeof perfect40Original_perfectU06GetLogoMap_],["perfect40Original_perfectV13MediaGetProfileBatch_",typeof perfect40Original_perfectV13MediaGetProfileBatch_],["perfect40Original_perfectV13MediaGet_",typeof perfect40Original_perfectV13MediaGet_],["perfect40Original_perfectV13MediaSave_",typeof perfect40Original_perfectV13MediaSave_],["perfect40Original_perfectVoucher36Art_",typeof perfect40Original_perfectVoucher36Art_],["perfect40Original_perfectVoucher36Edit_",typeof perfect40Original_perfectVoucher36Edit_],["perfect40Original_perfectVoucher36History_",typeof perfect40Original_perfectVoucher36History_],["perfect40Original_perfectVoucher36ImportPreview_",typeof perfect40Original_perfectVoucher36ImportPreview_],["perfect40Original_perfectVoucher36Import_",typeof perfect40Original_perfectVoucher36Import_],["perfect40Original_perfectVoucher36Issue_",typeof perfect40Original_perfectVoucher36Issue_],["perfect40Original_perfectVoucher36List_",typeof perfect40Original_perfectVoucher36List_],["perfect40Original_perfectVoucher36Redeem_",typeof perfect40Original_perfectVoucher36Redeem_],["perfect40Original_perfectVoucher36SaveProduct_",typeof perfect40Original_perfectVoucher36SaveProduct_],["perfect40Original_perfectVoucher36Setup_",typeof perfect40Original_perfectVoucher36Setup_],["perfect40Original_perfectWebAdminArchiveOrder_",typeof perfect40Original_perfectWebAdminArchiveOrder_],["perfect40Original_perfectWebArchiveTestOrders_",typeof perfect40Original_perfectWebArchiveTestOrders_],["perfect40Original_perfectWebBootstrap36_",typeof perfect40Original_perfectWebBootstrap36_],["perfect40Original_perfectWebCreateOrderAddons31_",typeof perfect40Original_perfectWebCreateOrderAddons31_],["perfect40Original_perfectWebCreateOrder_",typeof perfect40Original_perfectWebCreateOrder_],["perfect40Original_perfectWebGetAllHistoricalDataAddons31_",typeof perfect40Original_perfectWebGetAllHistoricalDataAddons31_],["perfect40Original_perfectWebGetAllHistoricalData_",typeof perfect40Original_perfectWebGetAllHistoricalData_],["perfect40Original_perfectWebGetAppInfo_",typeof perfect40Original_perfectWebGetAppInfo_],["perfect40Original_perfectWebGetBrandAssets37_",typeof perfect40Original_perfectWebGetBrandAssets37_],["perfect40Original_perfectWebGetDashboardData_",typeof perfect40Original_perfectWebGetDashboardData_],["perfect40Original_perfectWebGetServicesAddons31_",typeof perfect40Original_perfectWebGetServicesAddons31_],["perfect40Original_perfectWebGetServices_",typeof perfect40Original_perfectWebGetServices_],["perfect40Original_perfectWebGetWorkers_",typeof perfect40Original_perfectWebGetWorkers_],["perfect40Original_perfectWebPreviewTestOrders_",typeof perfect40Original_perfectWebPreviewTestOrders_],["perfect40Original_perfectWebSaveServiceAddons31_",typeof perfect40Original_perfectWebSaveServiceAddons31_],["perfect40Original_perfectWebSaveService_",typeof perfect40Original_perfectWebSaveService_],["perfect40Original_perfectWebUpdateCustomer_",typeof perfect40Original_perfectWebUpdateCustomer_],["perfect40Original_perfectWebUpdateOrderAddons31_",typeof perfect40Original_perfectWebUpdateOrderAddons31_],["perfect40Original_perfectWebUpdateOrder_",typeof perfect40Original_perfectWebUpdateOrder_],["perfect40Original_perfectWebUpdateVehicle_",typeof perfect40Original_perfectWebUpdateVehicle_],["perfect40Original_pripravitWebAObjednavkovyList_",typeof perfect40Original_pripravitWebAObjednavkovyList_],["perfect40Original_zobrazitSloupceObjednavek_",typeof perfect40Original_zobrazitSloupceObjednavek_]],missing=all.filter(function(x){return x[1]!=="function";}).map(function(x){return x[0];});["Index","PERFECT_Statistiky","PERFECT_Upgrade40","PERFECT_Poukazy","PERFECT_Poukaz_Obrazek_1"].forEach(function(name){try{HtmlService.createHtmlOutputFromFile(name).getContent();}catch(e){missing.push(name);}});var result={success:!missing.length,release:"PERFECT-40-41",missing:missing};Logger.log(JSON.stringify(result,null,2));if(missing.length)throw Error("Chybí úplné náhrady modulů: "+missing.join(", "));return result;}

// 41_TESTOVACI_KOPIE.gs.txt
/** Testovací kopie: bez formuláře jen pro přihlášeného Google vlastníka, nikdy anonymně. */
function perfectPreview41Context_(){
 var props=perfectRepairProps_();if(props.getProperty('PERFECT41_TEST_MODE')!=='ON')return null;
 var active='',effective='';try{active=Session.getActiveUser().getEmail();effective=Session.getEffectiveUser().getEmail();}catch(e){}
 if(!active||active!==effective)return null;
 var test=String(props.getProperty('PERFECT41_TEST_DATABASE_ID')||''),production=String(props.getProperty('PERFECT41_PRODUCTION_DATABASE_ID')||''),current=String(props.getProperty(PERFECT_REPAIR.DB)||'');
 if(!test||!production||test===production||current!==test)throw Error('Testovací režim není oddělený od ostré databáze. Zkontroluj tři ID ve Vlastnostech skriptu.');
 if(perfectDatabaseGetSpreadsheet_().getId()!==test)throw Error('Testovací režim neotevřel očekávanou kopii databáze.');
 return {testId:test};
}
function perfectPreview41Wrap_(output){
 var context=perfectPreview41Context_();if(!context)return output;
 perfectRepairCheckDatabase_();var auth=databasePreview41Start_();
 var script='<script>sessionStorage.setItem("perfectAuthToken",'+JSON.stringify(auth.token)+');sessionStorage.setItem("perfectAuthUser",'+JSON.stringify(JSON.stringify(auth.user))+');</script>';
 var badge='<div style="position:fixed;right:12px;bottom:10px;z-index:11010;padding:6px 11px;background:#292212;border:1px solid #aa8b3e;border-radius:8px;color:#f1d580;font:700 10px/1.5 sans-serif;pointer-events:none">TESTOVACÍ KOPIE</div>';
 return HtmlService.createHtmlOutput(output.getContent().replace('<head>','<head>'+script).replace('</body>',badge+'</body>')).setTitle('TEST · Automyčka PERFECT').addMetaTag('viewport','width=device-width, initial-scale=1');
}

// SLUZBY_A_OBJEDNAVKY_DOPLNKY_V31.gs.txt
/** PERFECT ADDONS-V31. Nové názvy API: původní backend zůstává beze změny. */
function perfectAddons31Blank_(value) { return value===null||value===undefined||String(value).trim()===''; }
function perfectAddons31Extra_(type) { return ['DOPLNEK','ADDON'].indexOf(String(type))>=0; }
function perfectAddons31Money_(value,required) {
  if(perfectAddons31Blank_(value)){
    if(required)throw new Error('Vyplň cenu.');
    return null;
  }
  var s=String(value).trim().replace(/\s/g,'').replace(/Kč$/i,'').replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw new Error('Cena musí být nezáporné číslo s nejvýše dvěma desetinnými místy.');
  var parts=s.split('.'),cents=Number(parts[0])*100+Number(((parts[1]||'')+'00').slice(0,2));
  if(!Number.isSafeInteger(cents)||cents>100000000000)throw new Error('Cena je příliš vysoká.');
  return cents/100;
}
function perfect40Original_perfectWebGetServicesAddons31_(token) {
  perfectRepairRequireUser_(token);
  return databaseAddons31ReadServices_();
}
function perfect40Original_perfectWebSaveServiceAddons31_(token,payload) {
  var user=perfectRepairRequireUser_(token);
  if(user.role!=='ADMINISTRATOR')throw new Error('Pouze administrátor může upravit ceník.');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Chybí údaje služby.');
  var name=String(payload.NAZEV||'').trim(),type=String(payload.TYP||'PROGRAM');
  if(!name||name.length>100)throw new Error('Vyplň název služby do 100 znaků.');
  if(/^\s*=/.test(name))throw new Error('Název služby nesmí začínat znakem =.');
  if(['PROGRAM','DOPLNEK','ADDON','DETAILING'].indexOf(type)<0)throw new Error('Neplatný typ služby.');
  var price=perfectAddons31Money_(payload.CENA,!perfectAddons31Extra_(type));
  return databaseAddons31SaveService_({SERVICE_ID:String(payload.SERVICE_ID||''),NAZEV:name,TYP:type,CENA:price,
    BARVA:/^#[0-9a-f]{6}$/i.test(String(payload.BARVA))?String(payload.BARVA):'#bfe1f6',AKTIVNI:payload.AKTIVNI===true});
}
function perfectAddons31Pricing_(payload,original) {
  var services=databaseAddons31ReadServices_().filter(function(s){return s.AKTIVNI;});
  var previous=null;
  try{previous=original&&original.CENOVE_POLOZKY?JSON.parse(original.CENOVE_POLOZKY):null;}catch(e){}
  if(previous&&previous.legacyPricing===true)previous=null;
  if(previous&&(!previous.program||!Array.isArray(previous.addons)))throw new Error('Původní cenový rozpis nelze bezpečně přečíst.');
  var programId=String(payload.PROGRAM_ID||''),oldProgram=previous&&previous.program;
  var sameProgram=!!(oldProgram&&String(oldProgram.id||'')===programId);
  var program;
  if(programId){
    var selected=services.find(function(s){return s.SERVICE_ID===programId&&s.TYP==='PROGRAM';});
    if(!selected&&!sameProgram)throw new Error('Program není aktivní.');
    var source=sameProgram?oldProgram:{id:selected.SERVICE_ID,name:selected.NAZEV,price:selected.CENA};
    program={id:programId,name:String(source.name),price:perfectAddons31Money_(payload.CENA_PROGRAMU!==undefined?payload.CENA_PROGRAMU:source.price,true)};
  }else{
    var name=databaseSafeText_(payload.MYCI_PROGRAM);
    if(!name)throw new Error('Vyplň mycí program.');
    var baseValue=payload.CENA_PROGRAMU!==undefined?payload.CENA_PROGRAMU:sameProgram?oldProgram.price:payload.CENA_CELKEM;
    program={id:'',name:name,price:perfectAddons31Money_(baseValue,true)};
  }
  var ids=Array.from(new Set(Array.isArray(payload.ADDON_IDS)?payload.ADDON_IDS.map(String):[]));
  if(ids.length>100)throw new Error('Bylo vybráno příliš mnoho doplňků.');
  var overrides=payload.ADDON_PRICES;
  if(overrides!==undefined&&(!Array.isArray(overrides)||overrides.length>100))throw new Error('Neplatný cenový rozpis doplňků.');
  var prices=new Map();
  (overrides||[]).forEach(function(item){
    if(!item||typeof item!=='object'||typeof item.id!=='string'||ids.indexOf(item.id)<0||prices.has(item.id))throw new Error('Neplatná nebo duplicitní cena doplňku.');
    prices.set(item.id,perfectAddons31Money_(item.price,false));
  });
  var addons=ids.map(function(id){
    var old=previous&&previous.addons.find(function(a){return String(a.id)===id;});
    var service=services.find(function(s){return s.SERVICE_ID===id&&s.TYP!=='PROGRAM';});
    if(!service&&!old)throw new Error('Doplňková služba není aktivní.');
    var amount;
    if(prices.has(id))amount=prices.get(id);
    else if(old)amount=old.priceEntered===false?null:perfectAddons31Money_(old.price,false);
    else amount=service.CENA;
    return {id:id,name:String(old?old.name:service.NAZEV),price:amount===null?0:amount,priceEntered:amount!==null};
  });
  var dirt=payload.ZNECISTENI_20===true||payload.ZNECISTENI_20==='true';
  var base=Math.round(program.price*100),surcharge=dirt?Math.round(base*.2):0;
  var calculated=base+surcharge+addons.reduce(function(sum,a){return sum+Math.round(a.price*100);},0);
  if(!Number.isSafeInteger(calculated)||calculated>100000000000)throw new Error('Celková cena je příliš vysoká.');
  var manual=payload.MANUAL_TOTAL===true||payload.MANUAL_TOTAL==='true';
  var total=manual?perfectAddons31Money_(payload.CENA_CELKEM,true):calculated/100;
  var pricing=Object.assign({},previous||{}, {version:'ADDONS-V31',program:program,addons:addons,dirt:dirt,
    surcharge:surcharge/100,calculatedTotal:calculated/100,total:total,manualTotal:manual});
  return {CENA_PROGRAMU:base/100,ZNECISTENI_20:dirt,CENOVE_POLOZKY:JSON.stringify(pricing),CENA_CELKEM:total,
    MYCI_PROGRAM:program.name,DOPLNKY:addons.map(function(a){return a.name;}).join(', ')};
}
function perfect40Original_perfectWebCreateOrderAddons31_(token,payload) {
  perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();
  if(!payload||typeof payload!=='object')throw new Error('Chybí údaje objednávky.');
  var order=perfectShared33Payload_(payload);
  if(!order.TELEFON||!order.CAS_PRIJEZDU||!String(order.VOZIDLO||'').trim()||!order.DATUM_OBJEDNANI)throw new Error('Vyplň telefon, čas příjezdu, vozidlo a datum.');
  Object.assign(order,perfectAddons31Pricing_(payload,null));
  if(typeof generateOrderId!=='function')throw new Error('Chybí modul generátoru čísel zakázek.');
  delete order.ORDER_ID;order.PERFECT_WEB_GENERATE_ID='OFFLINE';order.PERFECT_WEB_REQUEST_ID=payload.REQUEST_ID||'';
  order.STAV_OBJEDNAVKY=order.STAV_OBJEDNAVKY||'ČEKÁ SE';
  perfectShared33Apply_(payload,order,null);
  var saved=databaseCreateOrder(order);
  var related=typeof perfectSpeedRelated_==='function'?perfectSpeedRelated_(saved):{};
  var view=typeof perfectTiming31View_==='function'?perfectTiming31View_(saved,databaseAddons31ReadServices_()):perfectRepairSerializable_(saved);
  return Object.assign({success:true,ORDER_ID:saved.ORDER_ID,order:view},related);
}
function perfect40Original_perfectWebUpdateOrderAddons31_(token,payload) {
  perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();
  if(!payload||typeof payload!=='object')throw new Error('Chybí údaje objednávky.');
  var id=String(payload.ORDER_ID||'').trim();if(!id)throw new Error('Chybí číslo zakázky.');
  var original=databaseFindOrderById(id);if(!original)throw new Error('Objednávka nebyla nalezena.');
  var order=perfectShared33Payload_(payload,original);
  if(payload.RECALCULATE_PRICING===true)Object.assign(order,perfectAddons31Pricing_(payload,original));
  // Bez cenové změny nepřepisujeme uložený součet ani rozpis.
  else ['CENOVE_POLOZKY','CENA_PROGRAMU','ZNECISTENI_20','CENA_CELKEM','DOPLNKY','MYCI_PROGRAM'].forEach(function(k){delete order[k];});
  ['ORDER_ID','CUSTOMER_ID','VEHICLE_ID','GMAIL_MESSAGE_ID'].forEach(function(k){delete order[k];});
  perfectShared33Apply_(payload,order,original);
  var saved=databaseUpdateOrder(id,order);
  var related=typeof perfectSpeedRelated_==='function'?perfectSpeedRelated_(saved):{};
  var view=typeof perfectTiming31View_==='function'?perfectTiming31View_(saved,databaseAddons31ReadServices_()):perfectRepairSerializable_(saved);
  return Object.assign({success:true,ORDER_ID:id,order:view},related);
}

/** Společná zakázka V33: jeden ORDER_ID, rozdělená tržba pro BOX 1 a BOX 2. */
function perfectShared33Worker_(value){return String(value||'')==='SPOLECNE';}
function perfectShared33Payload_(payload,original){
  if(!perfectShared33Worker_(payload&&payload.PRACOVNIK))return perfectRepairOrderPayload_(payload,original);
  var order=perfectRepairOrderPayload_(Object.assign({},payload,{PRACOVNIK:''}),original);
  order.PRACOVNIK='SPOLECNE';return order;
}
function perfectShared33Envelope_(order){
  if(!order||!order.CENOVE_POLOZKY)return null;
  var data;try{data=JSON.parse(order.CENOVE_POLOZKY);}catch(e){throw new Error('Cenový rozpis nelze přečíst.');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Neplatný cenový rozpis.');return data;
}
function perfectShared33Amounts_(split,total){
  if(!split||typeof split!=='object')throw new Error('Vyplň částku pro BOX 1 a BOX 2.');
  var box1=perfectAddons31Money_(split.box1,true),box2=perfectAddons31Money_(split.box2,true),price=perfectAddons31Money_(total,true);
  if(Math.round(box1*100)+Math.round(box2*100)!==Math.round(price*100))throw new Error('Součet BOXU 1 a BOXU 2 musí odpovídat celkové ceně objednávky.');
  return {version:1,box1:box1,box2:box2};
}
function perfectShared33Apply_(payload,order,original){
  var worker=Object.prototype.hasOwnProperty.call(order,'PRACOVNIK')?order.PRACOVNIK:original&&original.PRACOVNIK;
  var oldShared=perfectShared33Worker_(original&&original.PRACOVNIK);
  if(!perfectShared33Worker_(worker)&&!oldShared)return order;
  var data=perfectShared33Envelope_(order)||perfectShared33Envelope_(original);
  if(perfectShared33Worker_(worker)){
    var total=Object.prototype.hasOwnProperty.call(order,'CENA_CELKEM')?order.CENA_CELKEM:original&&original.CENA_CELKEM;
    var provided=Object.prototype.hasOwnProperty.call(payload,'BOX1_PRICE')||Object.prototype.hasOwnProperty.call(payload,'BOX2_PRICE');
    var split=provided?{box1:payload.BOX1_PRICE,box2:payload.BOX2_PRICE}:oldShared&&data&&data.boxSplit;
    split=perfectShared33Amounts_(split,total);
    if(!data)data={version:'BOX-SPLIT-V33',legacyPricing:true};
    data.boxSplit=split;order.CENOVE_POLOZKY=JSON.stringify(data);
  }else if(data&&data.boxSplit){
    delete data.boxSplit;
    order.CENOVE_POLOZKY=data.legacyPricing===true?'':JSON.stringify(data);
  }
  return order;
}
function perfectShared33Read_(order){
  if(!perfectShared33Worker_(order.PRACOVNIK))return null;
  try{var data=perfectShared33Envelope_(order),split=perfectShared33Amounts_(data&&data.boxSplit,order.CENA_CELKEM);return {valid:true,box1:split.box1,box2:split.box2};}
  catch(error){return {valid:false,error:String(error.message||error)};}
}

// Webbecked.gs.txt
/** PERFECT V14: replace the whole old Webbecked.gs, do not append. */



const PERFECT_REPAIR = Object.freeze({



  VERSION: 'V14-SECURE', BUILD: 'PERFECT-ORDERS-2026-10-13-1',



  DB: 'PERFECT_REPAIR_SPREADSHEET_ID', USERS: 'PERFECT_REPAIR_USERS',



  SETUP: 'PERFECT_REPAIR_SETUP', SERVICES: 'Ceník'



});







function perfect40Original_doGet_() {

  const output = HtmlService.createTemplateFromFile('Index').evaluate()

    .setTitle('Automyčka PERFECT')

    .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  const faviconUrl = PropertiesService.getScriptProperties()

    .getProperty('PERFECT_FAVICON_URL');

  if (faviconUrl) output.setFaviconUrl(faviconUrl);

  return typeof perfectPreview41Wrap_==='function'?perfectPreview41Wrap_(output):output;

}



function perfectRepairProps_() { return PropertiesService.getScriptProperties(); }



function perfectRepairLock_(fn) {



  const lock = LockService.getScriptLock(); lock.waitLock(30000);



  try { return fn(); } finally { lock.releaseLock(); }



}



function perfectRepairUsers_() { return JSON.parse(perfectRepairProps_().getProperty(PERFECT_REPAIR.USERS) || '[]'); }



function perfectRepairRandom_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }



function perfectRepairDigest_(s) {



  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)



    .map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');



}



// PBKDF2-HMAC-SHA256, one 32-byte block. Iterations stored per user.



function perfectRepairPassword_(password,salt,iterations){return perfect36Password_(password,salt,iterations);}



function perfectRepairEqual_(a, b) {



  a = String(a); b = String(b); let difference = a.length ^ b.length;



  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);



  return difference === 0;



}



function perfect40BasePublicUser_(u) {



  return {id:u.id, username:u.username, firstName:u.firstName, surname:u.surname, role:u.role,mustChangePassword:!!u.mustChangePassword};



}



// Spouštěcí funkce pro nabídku editoru; projekt ponech s přístupem Pouze já.



function perfect40Original_pripravitWebAObjednavkovyList_(){return perfectRepairPrepare_();}



function perfect40Original_zobrazitSloupceObjednavek_(){



 const sh=databaseGetOrdersSheet_(),width=Math.min(sh.getMaxColumns(),PERFECT_DB_ORDER_HEADERS.length);



 const actual=sh.getRange(PERFECT_DB_ORDER_HEADER_ROW,1,1,width).getValues()[0].map(v=>String(v).trim());



 const differences=Array.from(PERFECT_DB_ORDER_HEADERS).map((expected,i)=>({sloupec:i+1,ocekavano:expected,skutecne:actual[i]||'(prázdné)'})).filter(x=>x.ocekavano!==x.skutecne);



 Logger.log(JSON.stringify({list:sh.getName(),rozdily:differences},null,2));return differences;



}



// Private implementation.



function perfectRepairPrepare_() {



  const ss = SpreadsheetApp.getActiveSpreadsheet();



  if (!ss) throw new Error('Otevři Apps Script z tabulky automyčky a spusť tuto funkci znovu.');



  perfectRepairProps_().setProperty(PERFECT_REPAIR.DB, ss.getId());



  perfectRepairExtendOrderColumns_();



  perfectRepairCheckDatabase_();



  perfectRepairStyleOrderIds_();



  perfectRepairEnsureAdmin_(false);



  Logger.log('Databáze připojena. Existující přihlašovací účty nebyly změněny.');



}



function perfectRepairEnsureAdmin_(force) {



  // No hardcoded password, no automatic password reset.



  const users=perfectRepairUsers_();



  return users.some(u=>u.role==='ADMINISTRATOR'&&u.active!==false);



}



function perfectRepairCheckDatabase_() {



  const ss = perfectDatabaseGetSpreadsheet_();



  const definitions = [



    [PERFECT_DB.SHEETS.CUSTOMERS, 1, PERFECT_DB_CUSTOMER_HEADERS],



    [PERFECT_DB.SHEETS.VEHICLES, 1, PERFECT_DB_VEHICLE_HEADERS],



    [PERFECT_DB.SHEETS.ORDERS, PERFECT_DB_ORDER_HEADER_ROW, PERFECT_DB_ORDER_HEADERS]



  ];



  definitions.forEach(([name,row,headers]) => {



    const sh = ss.getSheetByName(name);



    if (!sh) throw new Error('Chybí centrální list ' + name + '. Nic nebylo vytvořeno ani přepsáno.');



    const width=Math.min(sh.getMaxColumns(),headers.length);



    const actual = sh.getRange(row,1,1,width).getValues()[0].map(v=>String(v).trim());



    const firstMismatch=headers.findIndex((h,i)=>h!==actual[i]);



    if(firstMismatch>=0){



      const instruction=name===PERFECT_DB.SHEETS.ORDERS&&firstMismatch>=20?'Spusť v editoru funkci pripravitWebAObjednavkovyList a potom nasaď novou verzi.':'Spusť zobrazitSloupceObjednavek a pošli rozdíly; hlavičky nepřepisuj.';



      throw new Error('List '+name+': sloupec '+(firstMismatch+1)+' má hlavičku „'+(actual[firstMismatch]||'prázdná')+'“, očekávám „'+headers[firstMismatch]+'“. '+instruction);



    }



  });



  return ss;



}



function perfectRepairExtendOrderColumns_(){



 const sh=databaseGetOrdersSheet_(),headers=Array.from(PERFECT_DB_ORDER_HEADERS);



 const old=sh.getRange(2,1,1,20).getValues()[0];



 if(headers.slice(0,20).some((h,i)=>String(old[i]).trim()!==h))throw new Error('Původní sloupce objednávek jsou jiné. Žádná data nebyla přepsána.');



 if(sh.getMaxColumns()<headers.length)sh.insertColumnsAfter(sh.getMaxColumns(),headers.length-sh.getMaxColumns());



 const extra=sh.getRange(2,21,1,headers.length-20).getValues()[0];



 if(extra.some((v,i)=>v!==''&&String(v).trim()!==headers[i+20]))throw new Error('Za původními sloupci jsou jiná data. Je nutná kontrola před rozšířením.');



 sh.getRange(2,21,1,headers.length-20).setValues([headers.slice(20)]);



  sh.hideColumns(21,headers.length-20);



}



function perfectRepairStyleOrderIds_(){



 const sh=databaseGetOrdersSheet_();if(sh.getLastRow()<3)return;



 const colors=sh.getRange(3,1,sh.getLastRow()-2,1).getValues().map(r=>[/^OF\d{4}-/i.test(String(r[0]))?'#f59e0b':/^N\d{4}-/i.test(String(r[0]))?'#38bdf8':'#202124']);



 sh.getRange(3,1,colors.length,1).setFontColors(colors);



}



function perfect40Original_perfectAuthGetStatus_() { return {setupRequired:!perfectRepairEnsureAdmin_(false)}; }



function perfect40Original_perfectAuthLogin_(username, password) {



  username=String(username||'').trim().toLowerCase(); password=String(password||'');



  if (!username || username.length>64 || password.length>128) throw new Error('Nesprávné jméno nebo heslo.');



  return perfectRepairLock_(() => {



    const p=perfectRepairProps_(), failureKey='PERFECT_REPAIR_FAILURE_'+perfectRepairDigest_(username);



    let f=JSON.parse(p.getProperty(failureKey)||'{"count":0,"until":0}');



    if (f.until>Date.now() && f.count>=5) throw new Error('Příliš mnoho pokusů. Počkej 15 minut.');



    if (f.until<Date.now()) f={count:0,until:Date.now()+15*60*1000};



    const u=perfectRepairUsers_().find(x=>x.username.toLowerCase()===username);



    if (!u || u.active===false || !perfectRepairEqual_(u.passwordHash,perfectRepairPassword_(password,u.salt,u.iterations))) {



      f.count++; p.setProperty(failureKey,JSON.stringify(f)); throw new Error('Nesprávné jméno nebo heslo.');



    }



    p.deleteProperty(failureKey);



    const token=perfectRepairRandom_();



    const sessionKey='PERFECT_REPAIR_SESSION_'+perfectRepairDigest_(token);



    // Remove expired sessions; raw tokens are never stored.



    const all=p.getProperties(); Object.keys(all).filter(k=>k.indexOf('PERFECT_REPAIR_SESSION_')===0).forEach(k=>{



      try { const s=JSON.parse(all[k]); if(s.expires<Date.now() || s.userId===u.id) p.deleteProperty(k); } catch(e){p.deleteProperty(k);}



    });



    p.setProperty(sessionKey,JSON.stringify({userId:u.id,expires:Date.now()+8*60*60*1000}));



    return {token,user:perfectRepairPublicUser_(u)};



  });



}



function perfectRepairRequireUser_(token) {



  if (!token || !/^[a-f0-9]{64}$/i.test(String(token))) throw new Error('Přihlášení vypršelo. Přihlas se znovu.');



  const s=JSON.parse(perfectRepairProps_().getProperty('PERFECT_REPAIR_SESSION_'+perfectRepairDigest_(token))||'null');



  const u=s && s.expires>Date.now() && perfectRepairUsers_().find(x=>x.id===s.userId&&x.active!==false);



  if (!u) throw new Error('Přihlášení vypršelo. Přihlas se znovu.');



  return u;



}



function perfect40Original_perfectAuthWhoAmI_(token) { return {user:perfectRepairPublicUser_(perfectRepairRequireUser_(token))}; }



function perfect40Original_perfectAuthLogout_(token) {



  if (/^[a-f0-9]{64}$/i.test(String(token||''))) perfectRepairProps_().deleteProperty('PERFECT_REPAIR_SESSION_'+perfectRepairDigest_(token));



  return {success:true};



}



function perfect40Original_perfectWebGetAppInfo_(token) {



  perfectRepairRequireUser_(token); return {version:PERFECT_REPAIR.VERSION,build:PERFECT_REPAIR.BUILD};



}



function perfectRepairSerializable_(value, key) {



  if (value instanceof Date) return isNaN(value.getTime())?'':Utilities.formatDate(value,Session.getScriptTimeZone(), /^CAS_/.test(key||'')?'HH:mm':'yyyy-MM-dd');



  if (Array.isArray(value)) return value.map(v=>perfectRepairSerializable_(v));



  if (value && typeof value==='object') { const o={}; Object.keys(value).forEach(k=>o[k]=perfectRepairSerializable_(value[k],k)); return o; }



  return value;



}



function perfectRepairMoney_(v) {



  return databaseMoney_(v==null||v===''?0:v);



}



function perfect40Original_perfectWebGetAllHistoricalData_(token) {



  const viewer=perfectRepairRequireUser_(token); perfectRepairCheckDatabase_();



  const customers=perfectRepairSerializable_(databaseGetAllCustomers()).filter(c=>c.CUSTOMER_ID);



  const vehicles=perfectRepairSerializable_(databaseGetAllVehicles()).filter(v=>v.VEHICLE_ID);



  if(typeof databaseAutoStatus26Apply_==='function')databaseAutoStatus26Apply_();
  const orders=perfectRepairSerializable_(databaseGetAllOrders()).filter(o=>o.ORDER_ID).map(o=>({...o,...perfectOrderTimingV26_(o),PROGRAM_COLOR:perfectProgramColorV26_(o.MYCI_PROGRAM)}));



  const today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');



  const todayRevenue=orders.filter(o=>perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI)===today && o.STAV_OBJEDNAVKY==='DOKONČENO').reduce((s,o)=>s+perfectRepairMoney_(o.CENA_CELKEM),0);



  const latestOrders=orders.slice().sort((a,b)=>String(b.DATUM_OBJEDNANI).localeCompare(String(a.DATUM_OBJEDNANI))).slice(0,10);



  return {success:true,customers,vehicles,orders,summary:{todayRevenue:viewer.role==='ADMINISTRATOR'?todayRevenue:null,latestOrders,centralCustomers:customers.length,centralVehicles:vehicles.length,centralOrders:orders.length,historicalCustomersAddedToView:0,historicalVehiclesAddedToView:0}};



}



function perfect40Original_perfectWebGetDashboardData_(token) {



  const d=perfectWebGetAllHistoricalData(token); return {customers:d.customers.length,vehicles:d.vehicles.length,orders:d.orders.length,todayRevenue:d.summary.todayRevenue,latestOrders:d.summary.latestOrders};



}



function perfectRepairServicesSheet_(create) {



  const ss=perfectDatabaseGetSpreadsheet_(); let sh=ss.getSheetByName(PERFECT_REPAIR.SERVICES);



  const headers=['SERVICE_ID','NAZEV','TYP','CENA','BARVA','AKTIVNI'];



  if (!sh && create) {sh=ss.insertSheet(PERFECT_REPAIR.SERVICES);sh.getRange(1,1,1,headers.length).setValues([headers]);}



  if (sh) {const h=sh.getRange(1,1,1,headers.length).getValues()[0]; if(headers.some((v,i)=>v!==h[i]))throw new Error('Ceník má jiné sloupce. Nejdříve upravíme mapování.');}



  return sh;



}



function perfectRepairServices_() {



  const sh=perfectRepairServicesSheet_(false); if(!sh || sh.getLastRow()<2)return [];



  return sh.getRange(2,1,sh.getLastRow()-1,6).getValues().filter(r=>r[0]).map(r=>({SERVICE_ID:String(r[0]),NAZEV:String(r[1]),TYP:String(r[2]),CENA:perfectRepairMoney_(r[3]),BARVA:String(r[4]),AKTIVNI:r[5]===true||r[5]===1||/^(true|ano)$/i.test(String(r[5]))}));



}



function perfect40Original_perfectWebGetServices_(token) { perfectRepairRequireUser_(token); return perfectRepairServices_(); }



function perfect40Original_perfectWebGetWorkers_(token) {



  perfectRepairRequireUser_(token);



  return perfectRepairUsers_().filter(u=>u.active!==false).map(u=>({username:u.username,name:[u.firstName,u.surname].filter(Boolean).join(' ')||u.username}));



}



function perfectRepairWorker_(name) {



  if(!name)return '';



  const u=perfectRepairUsers_().find(x=>x.active!==false&&x.username===String(name));



  if(!u)throw new Error('Vybraný pracovník neexistuje nebo není aktivní.');return u.username;



}



function perfect40Original_perfectWebSaveService_(token, payload) {



  const u=perfectRepairRequireUser_(token); if(u.role!=='ADMINISTRATOR')throw new Error('Pouze administrátor může upravit ceník.');



  if(!payload || !String(payload.NAZEV||'').trim())throw new Error('Vyplň název služby.');



  const price=perfectRepairMoney_(payload.CENA);



  return perfectRepairLock_(()=>{



    const sh=perfectRepairServicesSheet_(true), id=String(payload.SERVICE_ID||'SRV_'+Utilities.getUuid());



    const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,1).getValues():[];



    const index=rows.findIndex(r=>String(r[0])===id);



    if(payload.SERVICE_ID && index<0)throw new Error('Služba nebyla nalezena.');



    const type=String(payload.TYP||'PROGRAM'); if(!['PROGRAM','DOPLNEK','DETAILING','ADDON'].includes(type))throw new Error('Neplatný typ služby.');



    const color=/^#[0-9a-f]{6}$/i.test(String(payload.BARVA))?payload.BARVA:'#bfe1f6';



    sh.getRange(index<0?sh.getLastRow()+1:index+2,1,1,6).setValues([[id,String(payload.NAZEV).trim(),type,price,color,payload.AKTIVNI===true]]);



    return {success:true,SERVICE_ID:id};



  });



}



function perfectRepairOrderPayload_(payload,original) {



  if(!payload || typeof payload!=='object')throw new Error('Chybí údaje zakázky.');



  const o={}; PERFECT_DB_ORDER_HEADERS.forEach(k=>{if(Object.prototype.hasOwnProperty.call(payload,k))o[k]=payload[k];});



  delete o.CENOVE_POLOZKY;delete o.WEB_REQUEST_ID;delete o.CENA_PROGRAMU;delete o.ZNECISTENI_20;



  if(o.DATUM_OBJEDNANI!==undefined)o.DATUM_OBJEDNANI=databaseDate_(o.DATUM_OBJEDNANI);



  ['CAS_PRIJEZDU','CAS_ODJEZDU'].forEach(k=>{if(o[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(o[k]))throw new Error('Neplatný čas.');});



  if(o.CAS_PRIJEZDU!==undefined){const t=String(o.CAS_PRIJEZDU||'');if(!/^([01]\d|2[0-3]):(?:00|30)$/.test(t)||t<'08:00'||t>'19:30')throw new Error('Čas příjezdu musí být od 08:00 do 19:30, po 30 minutách.');}



  if(o.CENA_CELKEM!==undefined)o.CENA_CELKEM=perfectRepairMoney_(o.CENA_CELKEM);



  if(o.STAV_OBJEDNAVKY!==undefined && !PERFECT_DB_ORDER_STATUSES.includes(o.STAV_OBJEDNAVKY))throw new Error('Neplatný stav zakázky.');



  if(o.TELEFON!==undefined){const phone=databaseNormalizePhone_(o.TELEFON);if(!/^\d{9}$/.test(phone))throw new Error('Telefon musí mít 9 číslic, případně předvolbu +420.');o.TELEFON=databaseFormatPhone_(phone);}



  if(o.PRACOVNIK!==undefined&&(!original||o.PRACOVNIK!==original.PRACOVNIK))o.PRACOVNIK=perfectRepairWorker_(o.PRACOVNIK);



  // Prevent spreadsheet formulas in user-entered text.



  Object.keys(o).forEach(k=>{if(typeof o[k]==='string' && /^\s*=/.test(o[k]))throw new Error('Text nesmí začínat znakem =.');});



  return o;



}



function perfectRepairPricing_(payload,original){



 const active=perfectRepairServices_().filter(s=>s.AKTIVNI);



 let previous=null;try{previous=original&&original.CENOVE_POLOZKY?JSON.parse(original.CENOVE_POLOZKY):null;}catch(e){}



 const reuse=!!(original&&payload.PRESERVE_PRICING===true&&previous);



 let program;



 if(reuse){program=previous.program;}



 else if(payload.PROGRAM_ID){const s=active.find(s=>s.SERVICE_ID===String(payload.PROGRAM_ID)&&s.TYP==='PROGRAM');if(!s)throw new Error('Program není aktivní.');program={id:s.SERVICE_ID,name:s.NAZEV,price:payload.CENA_PROGRAMU!==undefined?databaseMoney_(payload.CENA_PROGRAMU):s.CENA};}



 else{program={id:'',name:databaseSafeText_(payload.MYCI_PROGRAM),price:databaseMoney_(payload.CENA_PROGRAMU??payload.CENA_CELKEM)};if(!program.name)throw new Error('Vyplň mycí program.');}



 const ids=Array.from(new Set(Array.isArray(payload.ADDON_IDS)?payload.ADDON_IDS.map(String):[]));



 const addons=ids.map(id=>{



  const old=reuse&&Array.isArray(previous.addons)?previous.addons.find(a=>a.id===id):null;if(old)return old;



  const s=active.find(s=>s.SERVICE_ID===id&&s.TYP!=='PROGRAM');if(!s)throw new Error('Doplňková služba není aktivní.');return {id:s.SERVICE_ID,name:s.NAZEV,price:s.CENA};



 });



 const dirt=payload.ZNECISTENI_20===true||payload.ZNECISTENI_20==='true';



 const base=Math.round(databaseMoney_(program.price)*100),surcharge=dirt?Math.round(base*.2):0;



 const cents=base+surcharge+addons.reduce((s,a)=>s+Math.round(databaseMoney_(a.price)*100),0);



 const manualTotal=payload.MANUAL_TOTAL===true||payload.MANUAL_TOTAL==='true';



 const finalTotal=manualTotal?databaseMoney_(payload.CENA_CELKEM):cents/100;



 const pricing={program,addons,dirt,surcharge:surcharge/100,total:finalTotal,manualTotal};



 return {CENA_PROGRAMU:base/100,ZNECISTENI_20:dirt,CENOVE_POLOZKY:JSON.stringify(pricing),CENA_CELKEM:finalTotal,MYCI_PROGRAM:program.name,DOPLNKY:addons.map(a=>a.name).join(', ')};



}




/** SPEED V13: jen dva související řádky, bez opětovného čtení celé databáze. */
function perfectSpeedRelated_(saved) {
  const find = (sheet, id, headers) => {
    if (!id || sheet.getLastRow() < 2) return null;
    const match = sheet.getRange(2,1,sheet.getLastRow()-1,1)
      .createTextFinder(String(id)).matchEntireCell(true).findNext();
    if (!match) return null;
    const values = sheet.getRange(match.getRow(),1,1,headers.length).getValues()[0];
    return perfectRepairSerializable_(databaseRowObject_(values,headers));
  };
  // Kdyby nešlo načíst doplňkové údaje, potvrzená objednávka se tím neruší.
  try {
    return {
      customer: find(databaseGetCustomersSheet_(),saved.CUSTOMER_ID,PERFECT_DB_CUSTOMER_HEADERS),
      vehicle: find(databaseGetVehiclesSheet_(),saved.VEHICLE_ID,PERFECT_DB_VEHICLE_HEADERS)
    };
  } catch(e) { console.warn('SPEED V13: doplňková data nejsou dostupná: '+e.message);return {customer:null,vehicle:null}; }
}

function perfect40Original_perfectWebCreateOrder_(token, payload) {



  perfectRepairRequireUser_(token); perfectRepairCheckDatabase_();



  const o=perfectRepairOrderPayload_(payload);



  if(!o.TELEFON || !o.CAS_PRIJEZDU || !String(o.VOZIDLO||'').trim() || !o.DATUM_OBJEDNANI)throw new Error('Vyplň telefon, čas příjezdu, vozidlo a datum.');



  Object.assign(o,perfectRepairPricing_(payload,null));



  if(!String(o.MYCI_PROGRAM||'').trim() || o.CENA_CELKEM===undefined)throw new Error('Vyplň program a cenu.');



  if(typeof generateOrderId!=='function')throw new Error('Chybí modul generátoru čísel zakázek.');



  // Manual entry is OFFLINE. Customer and vehicle links are resolved in the same database lock.



  delete o.ORDER_ID; o.PERFECT_WEB_GENERATE_ID='OFFLINE';o.PERFECT_WEB_REQUEST_ID=payload.REQUEST_ID||'';



  o.STAV_OBJEDNAVKY=o.STAV_OBJEDNAVKY||'ČEKÁ SE';



  const saved=databaseCreateOrder(o); return {success:true,ORDER_ID:saved.ORDER_ID,order:perfectRepairSerializable_(saved),...perfectSpeedRelated_(saved)};



}



function perfect40Original_perfectWebUpdateOrder_(token, payload) {



  perfectRepairRequireUser_(token); perfectRepairCheckDatabase_();



  const id=String(payload&&payload.ORDER_ID||'').trim();



  if(!id)throw new Error('Chybí číslo zakázky.');



  const original=databaseFindOrderById(id);if(!original)throw new Error('Objednávka nebyla nalezena.');



  const o=perfectRepairOrderPayload_(payload,original);



  if(payload.RECALCULATE_PRICING===true)Object.assign(o,perfectRepairPricing_(payload,original));



  delete o.ORDER_ID; delete o.CUSTOMER_ID; delete o.VEHICLE_ID; delete o.GMAIL_MESSAGE_ID;



  const saved=databaseUpdateOrder(id,o); return {success:true,ORDER_ID:id,order:perfectRepairSerializable_(saved),...perfectSpeedRelated_(saved)};



}



function perfect40Original_perfectU06GetLogoMap_(token) { perfectRepairRequireUser_(token); return {ok:true,logos:{}}; }











/* PERFECT PATCH – pracovní účty. Všechna volání s tokenem; editace jen ADMINISTRATOR. */



function perfectAuthRequireAdmin_(token){



  const u=perfectRepairRequireUser_(token);



  if(u.role!=='ADMINISTRATOR'||u.active===false)throw new Error('Pouze administrátor může provést tuto akci.');



  return u;



}



function perfectAuthPasswordHash_(password,salt){



  // 20k iterations matches current backend; migration to stronger KDF requires migration.



  return perfectRepairPassword_(password,salt,20000);



}



function perfectAuthSetPasswordFields_(user,password){



  if(typeof password!=='string'||password.length<10||password.length>128)throw new Error('Heslo musí mít 10–128 znaků.');



  user.salt=perfectRepairRandom_(); user.iterations=20000;



  user.passwordHash=perfectAuthPasswordHash_(password,user.salt);



}



function perfect40Original_perfectAuthBootstrapAdmin_(){



  // Jednorázová inicializace, pouze z editoru Apps Script. Heslo se zadává v Script Properties.



  return perfectRepairLock_(()=>{



    const p=perfectRepairProps_(), users=perfectRepairUsers_();



    if(users.length)throw new Error('Uživatelské účty již existují; bootstrap odmítnut.');



    const password=p.getProperty('PERFECT_BOOTSTRAP_ADMIN_PASSWORD');



    if(!password)throw new Error('Nastav Script Property PERFECT_BOOTSTRAP_ADMIN_PASSWORD na nové heslo (10+ znaků).');



    const admin={id:Utilities.getUuid(),username:'admin',firstName:'Administrátor',surname:'',role:'ADMINISTRATOR',active:true,mustChangePassword:true};



    perfectAuthSetPasswordFields_(admin,password);



    p.setProperty(PERFECT_REPAIR.USERS,JSON.stringify([admin]));



    p.deleteProperty('PERFECT_BOOTSTRAP_ADMIN_PASSWORD');



    return {success:true,username:admin.username};



  });



}



function perfect40Original_perfectAuthGetUsers_(token){



  perfectAuthRequireAdmin_(token);



  return perfectRepairUsers_().map(u=>({...perfectRepairPublicUser_(u),active:u.active!==false,mustChangePassword:!!u.mustChangePassword}));



}



function perfect40Original_perfectAuthUpsertUser_(token,input){



  perfectAuthRequireAdmin_(token);



  if(!input||typeof input!=='object')throw new Error('Chybí údaje uživatele.');



  return perfectRepairLock_(()=>{



    const p=perfectRepairProps_(),users=perfectRepairUsers_();



    const username=String(input.username||'').toLowerCase().trim();



    if(!/^[a-z0-9._-]{3,40}$/.test(username))throw new Error('Uživatelské jméno musí mít 3–40 znaků bez mezer.');



    const role=String(input.role||'PRACOVNIK');



    if(!['ADMINISTRATOR','PRACOVNIK','SMENAR'].includes(role))throw new Error('Neplatná role.');



    let user=users.find(u=>u.username.toLowerCase()===username);



    if(input.id&&(!user||user.id!==input.id))throw new Error('Uživatel nebyl nalezen.');



    if(!user){



      if(!input.password)throw new Error('Nový pracovník musí mít dočasné heslo.');



      user={id:Utilities.getUuid(),username,active:true}; users.push(user);



    }



    user.firstName=String(input.firstName||'').trim();



    user.surname=String(input.surname||'').trim();



    if(!user.firstName)throw new Error('Vyplň jméno pracovníka.');



    user.role=role;



    if(typeof input.active==='boolean')user.active=input.active;



    if(input.password){perfectAuthSetPasswordFields_(user,String(input.password));user.mustChangePassword=true;}



    if(users.filter(x=>x.role==='ADMINISTRATOR'&&x.active!==false).length===0)throw new Error('Musí zůstat alespoň jeden aktivní administrátor.');



    p.setProperty(PERFECT_REPAIR.USERS,JSON.stringify(users));



    return {success:true,user:{...perfectRepairPublicUser_(user),active:user.active!==false}};



  });



}



function perfect40Original_perfectAuthChangePassword_(token,currentPassword,newPassword){



  const u=perfectRepairRequireUser_(token);



  return perfectRepairLock_(()=>{



    const users=perfectRepairUsers_(),user=users.find(x=>x.id===u.id);



    if(!user||!perfectRepairEqual_(user.passwordHash,perfectRepairPassword_(String(currentPassword||''),user.salt,user.iterations)))throw new Error('Stávající heslo není správné.');



    perfectAuthSetPasswordFields_(user,String(newPassword||''));user.mustChangePassword=false;



    perfectRepairProps_().setProperty(PERFECT_REPAIR.USERS,JSON.stringify(users));



    return {success:true};



  });



}



function perfect40Original_perfectWebPreviewTestOrders_(token){



  perfectAuthRequireAdmin_(token);



  return databasePreviewTestOrders_();



}



function perfect40Original_perfectWebArchiveTestOrders_(token,ids){



  perfectAuthRequireAdmin_(token);



  return databaseArchiveTestOrders_(ids);



}











/* PERFECT 2.0 — vlastní profil pracovníka, neveřejné fotografie na Disku. */



function perfect40Original_perfectAuthGetMyProfile_(token) {



  const user = perfectRepairRequireUser_(token);



  let avatarData = '';



  if (user.avatarFileId) {



    try {



      const file = DriveApp.getFileById(user.avatarFileId);



      const blob = file.getBlob();



      if (/^image\/(jpeg|png|webp)$/.test(blob.getContentType()) && blob.getSize() <= 180000) {



        avatarData = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());



      }



    } catch (err) { console.warn('Fotografii profilu nelze načíst: ' + err.message); }



  }



  return { success:true, user:perfectRepairPublicUser_(user), avatarData:avatarData };



}



function perfect40Original_perfectAuthSaveMyProfile_(token, input) {



  const current = perfectRepairRequireUser_(token);



  if (!input || typeof input !== 'object') throw new Error('Chybí údaje profilu.');



  const firstName = String(input.firstName || '').trim();



  const surname = String(input.surname || '').trim();



  if (firstName.length < 1 || firstName.length > 70 || surname.length > 70)



    throw new Error('Zkontroluj jméno a příjmení (maximálně 70 znaků).');



  if (/[<>\r\n]/.test(firstName + surname)) throw new Error('Jméno obsahuje nepovolené znaky.');



  const photo = input.avatarData == null ? '' : String(input.avatarData);



  if (photo.length > 230000) throw new Error('Fotografie je příliš velká.');



  const match = photo ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(photo) : null;



  if (photo && !match) throw new Error('Povoleny jsou pouze fotografie JPG, PNG a WebP.');



  let newFileId = '';



  if (match) {



    const bytes = Utilities.base64Decode(match[2]);



    if (bytes.length > 150000 || bytes.length < 100) throw new Error('Profilová fotografie musí mít maximálně 150 kB.');



    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];



    const props = perfectRepairProps_();



    let folderId = props.getProperty('PERFECT_PROFILE_PHOTOS_FOLDER_ID');



    let folder;



    try { folder = folderId ? DriveApp.getFolderById(folderId) : null; if (folder) folder.getName(); }



    catch (err) { folder = null; }



    if (!folder) {



      folder = DriveApp.createFolder('AUTOMYCKA_PERFECT_SOUKROME_PROFILOVE_FOTKY');



      props.setProperty('PERFECT_PROFILE_PHOTOS_FOLDER_ID', folder.getId());



    }



    const blob = Utilities.newBlob(bytes, 'image/' + match[1], 'profil-' + current.id + '-' + Date.now() + '.' + ext);



    newFileId = folder.createFile(blob).getId();



  }



  try {



    return perfectRepairLock_(() => {



      const props = perfectRepairProps_(), users = perfectRepairUsers_();



      const user = users.find(u => u.id === current.id && u.active !== false);



      if (!user) throw new Error('Účet nebyl nalezen.');



      user.firstName = firstName; user.surname = surname;



      if (newFileId) user.avatarFileId = newFileId;



      props.setProperty(PERFECT_REPAIR.USERS, JSON.stringify(users));



      return { success:true, user:perfectRepairPublicUser_(user) };



    });



  } catch(err) {



    // Zabráníme vzniku nového osiřelého obrázku po neúspěšném zápisu.



    if (newFileId) try { DriveApp.getFileById(newFileId).setTrashed(true); } catch(e) {}



    throw err;



  }



}





/** Favicon č. 1. Spustit jednou pouze v editoru Apps Script.

 * Koncové podtržítko znemožňuje volání přes google.script.run.

 * Zpřístupní pouze nový obrázek ikony, nikdy tabulku ani projekt.

 */

function nastavitFaviconuPerfect_() {

  return perfectRepairLock_(() => {

    const props = PropertiesService.getScriptProperties();

    const previousId = props.getProperty('PERFECT_FAVICON_FILE_ID');

    let file = null;

    if (previousId) {

      try {

        file = DriveApp.getFileById(previousId);

        if (file.isTrashed()) file = null;

      } catch (err) { file = null; }

    }

    if (!file) {

      const bytes = Utilities.base64Decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsSAAALEgHS3X78AAATLUlEQVR4nN1be5BU1Zm/t1/T3YMKDAyMYGSEgZ4XIIiIcXVV8C1xU/lDJRpjYgkDGokuBEURy4Fg1jImqXUTl2wqFtmNm2JXjApZxd1aiY959WMePS8eM8MMIAzME4Z5/La+75zTfe/te7tnrP3Lrvrq3nvuOd855/c9z7mnta4TJ3Cupwe7d+/GokWL4PV54fP57Mkrrl4irzfxLIjaJdt6Dc9c38RLvKM6CT4mXpK/sY5hDF51VfeKv1fUt+/Th0DAj5Urb8WBA39BT28vOo4fh9bX348tW7ZA0zTous7Xryup+RGgv3/rLQwMDEDbu3cvF7pcLrjdblHR0sBYlu5ePStKHUCGAVr56MYyHZpsr8pVHWt9u76pLb33eDz8PHXqVFRUVEK76667uEBN3oqWdXBJcEQdpozIf0WJOTxbr+JejMWubyOQdPV6BQgbN/4YGiFh11nGQRgm7iR1+4Fm7mO8gKRono3G2gnS7XLx/Y1/cyM0cg52FVNMQEp7ooM2qqx1sHqaviakLVIb7cZmN04yd7oWFRdD82VlpZWM0c6c0DZ1po8PBOPgnbSF7X4CJmUst2qnHQDFDIDUgHSqa1J3p4kbbDEdr/FISAGZSROswkk3RiNACoDCokIzAElbNquT0dOOT3Jm6Zk8eWJyEzclJ4lqDn7JqV0CgEIDAI4qmg4E5X3TqKrZzp1NwDiJdNphqykcARx42JivAiAUsgBgP3ERfxMgWGKtnZmMZyLCqaa2d9YoYzvFW47NYC52Yc+s3U4AaKmImSRvVfk08T+d43Tsx6QVNuHMLvTaaG2mUGk0gVAoZAbA6PWtg7JKzG7g+gQSIFMGZ6d1DnytOUdC8gmA5DgtjttOAxYsWJBqAnZJzUSTpExka0IOHj0TeLagpBmf7qQBmlI9G9VMakaqnZvefQWylfBX5JWpHy0jAFoSYZM5GHJ+q+3pNuuI8RLxdBnVnZ7l4P6/yOXSeQFE6a+9D8hK4wQd7NT0Tk7An5WFYDCIgN8vKBBIEpdlwe/3M1FZMBjggRltXkQcHcFAANnBAF+JuL6VgkHRn3zODgaRbXhHz1kW4dLEdZfOlKIBunEQBk+cstxMvE8i+eyWZ9HU3Iz6xkbUx+NoaGxEvLkJ8eZmvjbI8rqGBlGH3jc1oaqqCtcsW2aSys4dO3H4yBHUxeNcp7Glhfk0tbSgqbWVn5maiZrR2ELvWtHUKsv5XlCsthbv/fnPeGnbNly9eHGiH6WxoUKLCZgkbbLP1IWKYnLbbbeDfmOjoxgbGgIuDgHqarq/mKShCxg+f57bbd/+YoL3woULMTw8IvjR+wuSiMeFCwCVJcrpWRI9q3fnBwUNXQBoTGPMDkNDQ/jNr3+NKVOmJIRaaOcDTPafJp7TPalbZUUFd3B43QZEZ89BXagI0XkhxOaFUFsQQqwghChTIWLzQ/y+auZsxB/6Hrfb9sLzCd4Pr1nDZSdffx2RmbMRnV+IyNz5CM+dj8hVBbYUNZGoR/d1cwtQGypGfOXtOPXqq7h46hTzPvTJJ8jJyeH+ilJSYadVloWU9J/d/BNmenbfOwhrGsKaCzW6CzWaC2FNR42mo9pANVTH7cZnmoba2+/kti9t357o59Wf/QOXNdz7LVRwXY+Fh0uSla8qo6tbko4qTUONrqNO09AyrwBnDx5k/r/9593cX2lpiZ0PsMRSS1JiXEic6+3DaE8v4qFiRDUdEV82wp4AIkx+RNwBRNx+hD1+hN307Ec4axIqaUD3fksA8GLSBD46+DEwOobwvEJENB0xX9DAJ4Cwgaic+XoCkvyy3yRRedQXRG1WNqo1DdU50zFY38D9Ll60CPn5+fZhMH1YEQDs/dOfmFHbM5tYWhFvNsKuLKaIvCqq0X0Iu4iyUOMJsiYcXb2a27+w9TnmNzN3Bk6eO4eRpmZEA5MQ0ai+n3lZ+aWSHzWWviOGcib/pQx8+2OPc78vPv8C8mbmpd8PEJRMfpTqf+fb32YmA5WVYrC6DzUkXd1+sGpwTN4AS+OIBOB5CcDKm2/h5+4//EGYiico6uvpJ68mSJMVgAnQxDsCQIBAGhHTdDTNnc/9fHBgP+ZedZUBgDT5N0tevp982WTU19Uzk5ZVtyGqaYh6A6mDo4Gz5M3XiDfIkmi+Z7XJBJ7dtFk40yefFPbvDQrNYT5Kqj4mniybhj9pFlLqVgEkNIJMUPMgHLgUOHoM4fp6LKcQbLshYokERunvfLmcB9r1q39kJyNUX04wBYSk6icm4A3gC01D/G7hA15+6SXmu++dd/m57trrWUPIflmyDIJPmlEWom4q8wgHR/2z89Usk/ebAOBytx/VmhcVvklAYwuijXF8c8WK9D4g4fWl3S9dsgSDF4cx3NWF6KwrENbczDhl4iQRMgeSuGEQAoAgS7jx3vuECTwnTKC9qwtjxzsRu2waIpqX+QrVlgBIyddqHtTn5iEWKkVtQRFaikoQn1+E6izhNwRoqb6ohhwntZ2aC/T349Bnn6G0xBAF7CZuVf/973/Agz62rkyg7xV2WqNLWyQpMSBey8QJDOUDpAmsFgA8vXEj5uVfxfe9+/YhRiYlVdqqWWTH1O/ZPf/K9Ud6ejE6MMD3J177JQNLTtYkeQWGJ8i8W5evEKHwt7sxe/bs1A2RRCiU4dAjVf/h7z4kBvnf/yPsz0W2Z5G8JyBC3J13oSG/gPMCtj22XTGhGlmnebUwgSfWr8eaBx4UEeXpv2fVptCVqlXChqNTpuPCkaNcf3R0FCOUWQI495/vcH5R48k2OU7qN+rKQswbZNNq3/Ajrv/4Yz9EXp5NFDCu8mglRfczZszA0WPHuGHjDTcK6SsvrbwwqSyZRN5s9H9RgXj+fE5QOIYbJEkAkKSapBN8ZuNGvPHGG3xfe/0Nwq9QHLeoMGkb9dt8y20YpVSZctyxMQaBfu3ffYjf16hwbHKcWYh6Avhc09H93vug7LiksBD5c+Y4OUER+pTje/3V14Sa/eKXjCI5PmOIIU2gAdLgT/7qDc7d4zPJR3gM6px0guwD7rqHee4q34HKmjDQfQaRyTmoIU9N/CwmFJX8O55+BsODgxjq7MTIqVMYbu9A57aXUKt7UM8a6ZfRI+mASQtJ6yKhYk60KiqrRCpcVJRcDlvNQDm+b664HrQ8udjWhljeLHZ8JFWavPK2hC6hH1+2nBdFF7/8Eg2z5iAi66p6ygnSRFruFgC8vWcPTg8Mouf99xPe3y6iJJzo1Bmon52PxllXIjYrH+HJuaikLFSqOptZIvmSV+l3jssItunpZ3huJUYnaN4EERsglPV9/JHIn498/weJsGeSjNuPmIfsy4We994XK6/OTgYgJgGI6CpSCA2giR6+826u29nWxirZ/uxWHmSY0mlDGFPEduymCXlZswjcKs2DKoo2HqGRxkSsWpkmpcuaG9FvzMHYmW6cPnsWc+ZcKRdDRTa7wgbVf+zRH4jFzv79qNY9CJPjM0rD5UPUm83AHL1frORoMsOnz6BhVn5CAxK2TANUAKy6Q3jy4WG+Nt18K/OhDDCZ3ZkB4H7J13gCqHYHxZpAaqOxPt1Xc2TysUMlk+v6p9+krD0KjatBa66fN3Mm2to7gJERNCxdJtVThhhe2IhrWMtCJHAJ+j/9K0YHBzHS04Oho0dQf/mVQlLuoMGhJTWg9eaVDBa5sAvtHYhOn8mS4pTaAICYtCAVdcSECVh/AhgjWCx9tx/RLCGc1ocf4clTBjt58uT0ALiV43tNOL6Ol8sNGZ90eImc28/JTm3wEjTMnY/ab8xFS/48HJ4zF7U+WiOo/DyZ0am1QPMNN/KGBef/+97l7DCR/Zmyx2QYTGZ5Ig0m86PMkEyDyqoJGKrnzUa128+SP/x338Ho4HmMjI5i1apVPDd1PiBk3RBR0r/+uhXs+IZaWxGeOh01mk8sS3lAonO16FCSpTU4hcFaSTQ4Vc+aKxCgTctXYGxYxPCO554XAPikLRsjgMo1PGoZHJB+J0mcIJF26n7ENBcnPFUeP44+sxkjcufp0UcfFXmNx+O8K6zLjO/AB/uF43voe0L6vkk2Htmcc6t1OecHbCqpsZwlKwGIL72Wt8rIDJpvukWYmM2iitrHCEjO/z0iCiVIbIhUskP0osoTRMvcAhxfuxb9FZVixdrXh+8/8oicvNBuWwA88uzMIw+LrapzH3yAiO4W6CZCnkE6LF2x4UEqyJLglZlyTspPCK0xAkWTbVi8lPu50NbOoY38he26QobYE5t+gr5Dh9C7/wD6Dh5E74cfoufAAfTs34++Dz/ksvMVlRgbGGBQ6ffZp59ixXXXmTJaRwA0dnx5aO8Qjq/26mukVJRXVp5WLkHpnjI/KY0oX72crtJzLJH+GjRFTwJQV7pY2P87+0T4Y2+eXFMwyfsKbwD94bCIMiPCb3BuIq9qwv0XL6K5tRX/tmcP7rn7bj4ap/yaaW1jBcAlC37x2s+Z0fFdP2ObFGllcldFOSPWiOAlqJtxOSI5uYjm5KJu+gzEcvPQOOsKNMy8XGiEZTODAZEAxApLhf1v2izCXwJo5QTlworAKizmtPfQoUNYXFqKFcuvxbKrr8aSRQuxdPEiLFuyhNf2hQsWYNKkbJNJq4TO5OiN3wb9fn+K46ubnotqSjLkklTEVBmPyfNqbnT/8d8xNjjIWd/F06cx0t0NdHdjtK8Xg7W1iE7N5bS22hXg9ioTjHpozaAjVlCEkb4+xG/8WwaEY7vuEyFMprGUNdKGS5vMR7Zv22YyVydyu11s704nRUwfR70+Lz/814G/iF2e+x8QmwwUrsi7y8nzvUwpj9z/ANft6evDsa4udJw6hY6TJ9F16hTH9aGODoSnzuANiCq3kCxPiEgCUDd3AQaqqlA9dQaqaBfXnWUBILm+OP37t7i/VbfeKgDwik9dpNp8dbl4Uvzlx/It0G6JbwJA0zT8UCJ8Zt+7OER27cvmbS5KWtij07rfl41KPQufXjoFA7V1PNE7Vq2Cz+tB7rRpmHzppcidlsNfZ8baO1AxZSZLP+qbhJg3wMtRWjPQzjGFy/qCQnz5u9/hC82HKorbFEVkn7wa9AV5E+Pz4GUYbmpG+8mTmC73862fu+32MKzb/OZVrgGAaTnT2HFgcBA1oUJ8rGn43EV7+xqrJkmAt5/cbnxOKe+WrQzWv8i9dYW68rS18TjG2tpQFaBNSA31us5qXKN46TonKNV5eTiy5kG+/6vLxT5HbXNx3y4Xr+8jC4Wz/OPbb6d4c+OJFdMkrSdPLFv9JgBKiovRe/48zjfG0fbCNhzbuQsdO3aiq3wHOnfsQOfOnYLoeedPMXbmDPoGB8VnJelhFUP6CNoQbwTO9eDEK6/g5M6dTCeo/Y4dzJeIVmVdP38dX+7ejc7t29FeXo6O8nJ0lpeji/osL8dxqrftRZzZ+x8MwMaNTyUAyHQuIUUrLJ/hTVFg1qxZ/DFS7bCk+42MiO92u155RaSUytEYvhdWV1ePi9d4frzpIa8raAPT4MGNkreCkOlorgkAXdf5mPyPnnwSG9atw4aydVi/bi3K1q0Vz+voeR3KHn8cTz3xBNaseZA/PxttUTAVICxfvhybN23ChrL1vN315Pr1eKKsTND6MmwoK8OGdWWij7Vr+Up90juqo/rjemVl+PFTT2H1vat5X1KYmgDc6YyQEEb6s4xJEwhN/MuQMWVOqNlXPPM38T7Nn+5T6xiO3TkdsjQcwgjxatDrS5yiIPsichuIyzyKPOJQg02oUdIgFVV1EzxUWyMvt7FM8E32407hYToE5ejwzFt6doc+jGYUomNy6hSF6bSVHbrjlZRTe8ugxsvX7vCTrRbatBETTz3OZ9YAX+qOkAkQ6yEjUwy2P59vr3oZJmETzkyTsTu7YOHtBIaVTxKAkMN3gXHYv5N62XWcTrp2wDhpSDqA7Hg4aaLtWWHNwWGIe8vxOJuJ22ZkFqk6ZW2ZtMfpo43SQrvDXFbfYGcChekAsJ4CyyTNTGCkqG06+7X4I1stsMnwrGZkTYRSnWAouRiynaBi6PgfAfvzwsmtdaNndk5dUydnpxU2Yc2oDWlMydEJhhx8gBXNTBJ00qB0KaqdFthJz+5QtclBG00gw585VB3b0+LaBChFJa1STfEP5iO4Tuo/3j7twJ4If5MGeL1ex0bOsdWo6pa6Nud/rXWNGpIiVQdHms7papn6tpxxVj6giL4N5uRMTYt6cmCZ/itkY592kjJohVNO4DhRmdhk0ohM2uOSS+o777gd2n333WfaZnK26fFFgxQNmkCcT/esT2AcKZHDohlK63ft2gVt/4H9vHuqyy8mamvpa0lud2LyBQUFaGlpgdbb24s333yTT12nU8WvA6m5XXHFFfjo4EF0d3dD6+g4jv7+AfzvJ5/w56Ol1yzl7+ZEpaWlfC0uKU6UFdO1VN4XFwvislKUli7kNqULxTXRRtajf2rSJ+mi4iKUlIj3XFZUxAsTysyoHh2apmOsqr9E22IxjkS/xSUoIZJjFX2LK48pMV7R10033YStW7ciHm/E2XM9/Pf5/wOwt4ddOzM5EAAAAABJRU5ErkJggg==');

      file = DriveApp.createFile(Utilities.newBlob(bytes, 'image/png', 'PERFECT_favicon_AP_1.png'));

    }

    // Veřejná je pouze ikona; oprávnění ostatních souborů se nemění.

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const key = file.getResourceKey();

    const url = 'https\://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId())

      + '&sz=w64' + (key ? '&resourcekey=' + encodeURIComponent(key) : '') + '&.png';

    props.setProperty('PERFECT_FAVICON_FILE_ID', file.getId());

    props.setProperty('PERFECT_FAVICON_URL', url);

    Logger.log('Favicon AP č. 1 je připravena. Nyní nasaď novou verzi webu.');

    return {success:true, faviconUrl:url};

  });

}



/* PERFECT V10: editace karet. Všechna data zapisuje modul 01 (centrální DB). */
function perfect40Original_perfectWebUpdateCustomer_(token,id,payload){
  perfectRepairRequireUser_(token);
  id=String(id||'').trim();
  if(!id||!payload||typeof payload!=='object')throw new Error('Chybí ID zákazníka nebo údaje.');
  const original=databaseFindCustomerById(id);
  if(!original)throw new Error('Zákazník nebyl nalezen.');
  const name=String(payload.JMENO_PRIJMENI||'').trim();
  const email=String(payload.EMAIL||'').trim().toLowerCase();
  const phone=String(payload.TELEFON||'').trim();
  if(!name||name.length>120||/[<>\r\n]/.test(name)||/^=/.test(name))throw new Error('Vyplň platné jméno zákazníka.');
  if(email&&(email.length>180||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new Error('Neplatný e-mail.');
  if(phone && !/^\d{9}$/.test(databaseNormalizePhone_(phone)))throw new Error('Telefon musí obsahovat 9 číslic, případně +420.');
  const conflictEmail=email&&databaseGetAllCustomers().find(c=>c.CUSTOMER_ID!==id&&databaseNormalizeEmail_(c.EMAIL)===email);
  const conflictPhone=phone&&databaseGetAllCustomers().find(c=>c.CUSTOMER_ID!==id&&databaseNormalizePhone_(c.TELEFON)===databaseNormalizePhone_(phone));
  if(conflictEmail||conflictPhone)throw new Error('Tento telefon nebo e-mail již patří jinému zákazníkovi. Záznamy nebyly sloučeny.');
  const updated=databaseUpdateCustomer(id,{JMENO_PRIJMENI:name,EMAIL:email,TELEFON:phone});
  return {success:true,record:perfectRepairSerializable_(updated)};
}
function perfect40Original_perfectWebUpdateVehicle_(token,id,payload){
  perfectRepairRequireUser_(token);
  id=String(id||'').trim();
  if(!id||!payload||typeof payload!=='object')throw new Error('Chybí ID vozidla nebo údaje.');
  const name=String(payload.VOZIDLO||'').trim();
  if(!name||name.length>120||/[<>\r\n]/.test(name)||/^=/.test(name))throw new Error('Vyplň platnou značku a model vozidla.');
  const updated=databaseUpdateVehicle(id,{VOZIDLO:name});
  return {success:true,record:perfectRepairSerializable_(updated)};
}

/**
 * AUTOMYČKA PERFECT – V13 SPEED / MEDIA REPAIR
 * Kompatibilní s uloženými fotografiemi z 28_FOTOGRAFIE_BACKEND.gs.
 * Samostatné názvy API zamezují kolizi se starým modulem 28/29.
 * Metadata ani původní soubory se nemažou a žádný list DB se nemění.
 */
var PERFECT_V13_MEDIA = Object.freeze({
  FOLDER_KEY:'PERFECT_MEDIA_V1_FOLDER_ID',
  ITEM_PREFIX:'PERFECT_MEDIA_V1_',
  MAX_BYTES:1450000
});

function perfectV13MediaValidate_(kind,id,slot) {
  kind=String(kind||'').toLowerCase();
  id=String(id||'').trim();
  slot=String(slot||'').toLowerCase();
  if(kind!=='customer'&&kind!=='vehicle')throw new Error('Neznámý typ fotografie.');
  if(!id||id.length>100||!/^[a-zA-Z0-9_-]+$/.test(id))throw new Error('Neplatné ID subjektu.');
  if(kind==='customer'&&slot!=='profile')throw new Error('Zákazník může mít jen profilovou fotografii.');
  if(kind==='vehicle'&&!/^(profile|gallery[1-5])$/.test(slot))throw new Error('Neplatný slot galerie vozidla.');
  return {kind:kind,id:id,slot:slot};
}
function perfectV13MediaKey_(kind,id,slot) {
  var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,kind+'|'+id+'|'+slot);
  return PERFECT_V13_MEDIA.ITEM_PREFIX+digest.map(function(b){return ('0'+(b&255).toString(16)).slice(-2)}).join('');
}
function perfectV13MediaExists_(kind,id) {
  var list=kind==='customer'?databaseGetAllCustomers():databaseGetAllVehicles();
  var field=kind==='customer'?'CUSTOMER_ID':'VEHICLE_ID';
  if(!list.some(function(row){return String(row[field])===id}))throw new Error('Záznam '+id+' nebyl nalezen v centrální databázi.');
}
function perfectV13MediaData_(fileId,thumbnail) {
  if(!fileId)return '';
  try {
    var key='perfect-media25-'+fileId+(thumbnail?'-thumb':'-full');
    var cache=CacheService.getScriptCache(),hit=cache.get(key);if(hit)return hit;
    var file=DriveApp.getFileById(fileId);
    var blob=thumbnail?(file.getThumbnail()||file.getBlob()):file.getBlob();
    var mime=blob.getContentType();
    if(!/^image\/(jpeg|png|webp)$/.test(mime)||blob.getBytes().length>PERFECT_V13_MEDIA.MAX_BYTES)return '';
    var data='data:'+mime+';base64,'+Utilities.base64Encode(blob.getBytes());
    if(data.length<95000)try{cache.put(key,data,21600);}catch(e){}
    return data;
  }catch(e){console.warn('PERFECT MEDIA READ: '+e.message);return ''}
}
function perfectV13MediaFolder_() {
  var p=PropertiesService.getScriptProperties(),id=p.getProperty(PERFECT_V13_MEDIA.FOLDER_KEY);
  if(id){try{var f=DriveApp.getFolderById(id);f.getName();return f}catch(e){}}
  var folder=DriveApp.createFolder('AUTOMYCKA_PERFECT_MEDIA_SOUKROME');
  p.setProperty(PERFECT_V13_MEDIA.FOLDER_KEY,folder.getId());
  return folder;
}
/** Načtení profilové fotky zákazníka nebo všech 6 slotů vozidla. */
function perfect40Original_perfectV13MediaGet_(token,request) {
  perfectRepairRequireUser_(token);
  request=request||{};
  var kind=String(request.kind||'').toLowerCase(),id=String(request.id||'').trim();
  perfectV13MediaValidate_(kind,id,'profile');
  perfectV13MediaExists_(kind,id);
  var slots=kind==='customer'?['profile']:['profile','gallery1','gallery2','gallery3','gallery4','gallery5'];
  var props=PropertiesService.getScriptProperties(),photos={};
  slots.forEach(function(slot){
    var fileId=props.getProperty(perfectV13MediaKey_(kind,id,slot));
    if(fileId){var data=perfectV13MediaData_(fileId);if(data)photos[slot]=data}
  });
  return {success:true,photos:photos};
}
/** Uložení jedné fotografie; starý soubor se ponechá jako záloha. */
function perfect40Original_perfectV13MediaSave_(token,request) {
  var user=perfectRepairRequireUser_(token);
  request=request||{};
  var v=perfectV13MediaValidate_(request.kind,request.id,request.slot);
  perfectV13MediaExists_(v.kind,v.id);
  var dataUrl=String(request.dataUrl||'');
  if(dataUrl.length>2000000)throw new Error('Fotografie je příliš velká.');
  var match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if(!match)throw new Error('Povoleny jsou pouze JPG, PNG a WebP.');
  var bytes=Utilities.base64Decode(match[2]);
  if(bytes.length<100||bytes.length>PERFECT_V13_MEDIA.MAX_BYTES)throw new Error('Fotografie po kompresi musí mít nejvýše 1,45 MB.');
  var lock=LockService.getScriptLock();lock.waitLock(25000);
  try {
    perfectRepairRequireUser_(token);
    perfectV13MediaExists_(v.kind,v.id);
    var ext=match[1]==='jpeg'?'jpg':match[1],folder=perfectV13MediaFolder_();
    var name=v.kind+'_'+v.id+'_'+v.slot+'_'+Date.now()+'.'+ext;
    var file=folder.createFile(Utilities.newBlob(bytes,'image/'+match[1],name));
    try {
      PropertiesService.getScriptProperties().setProperty(perfectV13MediaKey_(v.kind,v.id,v.slot),file.getId());
    }catch(err){file.setTrashed(true);throw err}
    console.info('PERFECT MEDIA SAVE: '+JSON.stringify({user:user.id,kind:v.kind,id:v.id,slot:v.slot}));
    return {success:true,kind:v.kind,id:v.id,slot:v.slot,dataUrl:dataUrl};
  }finally{lock.releaseLock()}
}
/** Dávkové čtení 1–10 profilových fotografií pro seznamy a dashboard. */
function perfect40Original_perfectV13MediaGetProfileBatch_(token,request) {
  perfectRepairRequireUser_(token);
  request=request||{};
  var kind=String(request.kind||'').toLowerCase();
  if(kind!=='customer'&&kind!=='vehicle')throw new Error('Neznámý typ fotografie.');
  var ids=request.ids;
  if(!Array.isArray(ids)||ids.length>10)throw new Error('Najednou lze načíst nejvýše 10 fotografií.');
  var unique=[];
  ids.forEach(function(id){
    var v=perfectV13MediaValidate_(kind,id,'profile');
    if(unique.indexOf(v.id)===-1)unique.push(v.id);
  });
  var rows=kind==='customer'?databaseGetAllCustomers():databaseGetAllVehicles();
  var field=kind==='customer'?'CUSTOMER_ID':'VEHICLE_ID',valid={};
  rows.forEach(function(r){valid[String(r[field])]=true});
  var props=PropertiesService.getScriptProperties(),photos={};
  unique.forEach(function(id){
    if(!valid[id])return;
    var fileId=props.getProperty(perfectV13MediaKey_(kind,id,'profile'));
    if(fileId){var data=perfectV13MediaData_(fileId,true);if(data)photos[id]=data}
  });
  return {success:true,kind:kind,photos:photos};
}


/** PERFECT V14 – administrátorské odstranění zakázky s povinným archivem.
 * Veškerý zápis provádí pouze modul 01_CENTRALNI_DATABAZE.
 */
function perfect40Original_perfectWebAdminArchiveOrder_(token, orderId) {
  const admin = perfectAuthRequireAdmin_(token);
  const id = String(orderId || '').trim();
  if (!id || id.length > 100 || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Neplatné číslo zakázky.');
  if (typeof databaseArchiveOrderByAdmin_ !== 'function') {
    throw new Error('Chybí funkce databaseArchiveOrderByAdmin_ v modulu 01. Doplň bezpečný archivovací modul.');
  }
  return databaseArchiveOrderByAdmin_(id, { id: String(admin.id), username: String(admin.username) });
}

perfect36Password_=services.__nativePassword;
return {perfectDatabaseGetSpreadsheet_,perfectDatabaseWithLock_,perfect40Original_databaseInitialize_,databaseEnsureSheet_,databaseApplyBasicFormatting_,databaseGetSheet_,databaseGetCustomersSheet_,databaseGetVehiclesSheet_,databaseGetOrdersSheet_,databaseRows_,databaseRowObject_,databaseCustomerRowToObject_,databaseVehicleRowToObject_,databaseOrderRowToObject_,perfect40Original_databaseGetAllCustomers_,perfect40Original_databaseGetAllVehicles_,perfect40Original_databaseGetAllOrders_,perfect40Original_databaseFindCustomerById_,perfect40Original_databaseFindCustomerByPhone_,perfect40Original_databaseFindCustomerByEmail_,perfect40Original_databaseFindOrderById_,perfect40Original_databaseFindOrderByGmailMessageId_,perfect40Original_databaseGetOrdersByCustomerId_,perfect40Original_databaseGetVehiclesByCustomerId_,databaseGenerateCustomerId_,databaseGenerateVehicleId_,databaseNextId_,databaseNormalizePhone_,databaseFormatPhone_,databaseNormalizeEmail_,databaseVehicleKey_,databasePlateKey_,databasePick_,databaseNormalizeOrderInput_,databaseDate_,databaseTime_,databaseMoney_,databaseStatus_,databaseSafeText_,perfect40Original_databaseCreateCustomer_,perfect40Original_databaseUpdateCustomer_,perfect40Original_databaseCreateVehicle_,databaseLinkOrder_,databaseValidatedOrder_,perfect40Original_databaseCreateOrder_,perfect40Original_databaseUpdateOrder_,databaseFindRowById_,databaseStyleOrderId_,databaseHideTechnicalColumns_,databaseIsTestOrder_,databasePreviewTestOrders_,databaseArchiveTestOrders_,perfect40Original_databaseUpdateVehicle_,databaseArchiveOrderByAdmin_,databaseBoxes25Sheet_,databaseBoxes25Read_,databaseBoxes25Commit_,databaseBoxes25SaveShift_,databaseBoxes25SaveOrder_,databaseRoster25Seed_,databaseOrderMeta26Sheet_,databaseOrderMeta26Map_,databaseOrderMeta26Save_,databaseAutoStatus26Apply_,databaseVoucher36Sheet_,databaseVoucher36State_,databaseVoucher36Row_,databaseVoucher36Append_,databaseVoucher36Setup_,databaseVoucher36Stable_,databaseVoucher36Change_,perfect36ViewSafe_,databaseVoucher36Import_,databaseAddons31ServicesSheet_,databaseAddons31ReadServices_,databaseAddons31SaveService_,databaseTiming31Apply_,databaseDuplicates38Resolve_,databaseSecurity40AuditSheet_,databaseSecurity40Audit_,databaseSecurity40ReadAudit_,databaseSecurity40Save_,databaseSecurity40SetupOwner_,databasePreview41Start_,perfect40Original_designCentralniDatabaze_,perfectGmailDesignSheetV24_,perfect40Original_opravitValidaciGmailImportu_,perfect40Original_gmailPreviewNextBatch_,perfect40Original_gmailStartAutomaticImport_,perfect40Original_gmailStopAutomaticImport_,perfect40Original_gmailRunAutomaticImport_,gmailFindUnimportedMessages_,gmailImportMessagesToDatabase_,gmailFindExistingOrderWithoutMessageId_,gmailGetExistingMessageIds_,gmailIsReservationMessage_,gmailIsBlockedReservation_,gmailParseReservation_,gmailV24ParseBody_,gmailNormalizeVehicleName_,perfect40Original_gmailTestPermissionsV23_,perfect40Original_gmailAutomaticImportStatus_,perfect40Original_gmailDryRun10Reservations_,perfect40Original_gmailTestLoad10Reservations_,perfect40Original_gmailTestParse10Reservations_,gmailExtractFields_,gmailParseService_,gmailParseDate_,gmailParseTime_,gmailDateString_,gmailTimeString_,gmailExtractEmail_,gmailFormatPhone_,gmailDigits_,gmailCleanValue_,gmailPrepareMailBody_,gmailHtmlToText_,gmailNormalizeText_,gmailValidateDependenciesV23_,gmailV24RetryState_,gmailV24Defer_,gmailV24ClearRetry_,gmailV24SaveLast_,gmailV24CheckHeaders_,perfect40Original_perfectGmailSpustitV24_,perfect40Original_perfectGmailDiagnostikaV24_,perfect40Original_generateOrderId_,orderIdNormalizeDate_,orderIdDateParts_,orderIdCreatePrefix_,orderIdBuild_,perfect40Original_perfectOrderIdPreviewV28_,perfect40Original_perfectStaffGetMyStatistics_,perfectAdminUsersPublic_,perfectAdminUsersValidateText_,perfectAdminUsersAudit_,perfect40Original_perfectAdminUsersList_,perfect40Original_perfectAdminUsersHistory_,perfect40Original_perfectAdminUsersSave_,perfect40Original_perfectAdminUsersGetAvatar_,perfect40Original_perfectLoga42GetManifest_,perfect40Original_perfectLoga42GetBrand_,perfect40Original_perfectLoga42Test_,perfectLogo25Key_,perfectLogo25Inventory_,perfect40Original_perfectLogo42GetMap_,perfect40Original_perfectLogo42Diagnostika_,perfectOrderTimingV26_,perfect40Original_perfectAutoStatusRun_,perfect40Original_perfectAutoStatusPreview_,perfect40Original_perfectAutoStatusBackfill_,perfect40Original_perfectControlSetupV26_,perfect40Original_perfectControlTickV26_,perfectProgramColorV26_,perfectTiming31Normalize_,perfectTiming31Durations_,perfectTiming31Meta_,perfectTiming31View_,perfect40Original_perfectWebGetAllHistoricalDataAddons31_,perfect40Original_perfectControlTickAddons31_,perfectNastavitAutomatikuV31_,perfectAutoStatusRunAddons31_,perfectNahledCasovaniV31_,perfectBoxes29Bool_,perfectBoxes29Rows_,perfectBoxes25Date_,perfectBoxes25Station_,perfectBoxes25VisitDate_,perfectBoxes25Normalize_,perfectBoxes42Weekend_,perfectBoxes42Cents_,perfectBoxes42Bonus_,perfectBoxes42Pay_,perfectBoxes25Pay_,perfect40Original_perfectBoxesGetOverviewV25_,perfectBoxes25Overview_,perfect40Original_perfectBoxesSaveShiftV25_,perfect40Original_perfectBoxesSaveOrderV25_,perfectRoster25Group_,perfectRoster25Planned_,perfectRoster25Month_,perfect40Original_perfectRosterSeedV25_,perfect40Original_perfectRosterGetMineV25_,perfect36Admin_,perfect36Text_,perfect36Request_,perfect36Cents_,perfect36Day_,perfect36Date_,perfect36AddValidity_,perfect36Name_,perfect36Phone_,perfect36Match_,perfect36Eligible_,perfect36Status_,perfect36View_,perfect40Original_perfectVoucher36Setup_,perfectPripravitPoukazyV36_,perfect40Original_perfectVoucher36List_,perfect40Original_perfectVoucher36SaveProduct_,perfect40Original_perfectVoucher36Issue_,perfect40Original_perfectVoucher36Edit_,perfect40Original_perfectVoucher36Redeem_,perfect40Original_perfectVoucher36History_,perfect40Original_perfectVoucher36Art_,perfect40Original_perfectVoucher36ImportPreview_,perfect40Original_perfectVoucher36Import_,perfectVoucher36ParseImport_,perfect36ReadServices_,perfect40Original_perfectWebBootstrap36_,perfect36Password_,perfect40Original_perfectAuthLoginFast36_,perfect40Original_perfectAuthLoginBootstrap37_,perfect40Original_perfectWebGetBrandAssets37_,perfect40Original_perfectKontrolaProjektuV37_,perfect40Original_perfectDokoncitInstalaciV37_,perfectDuplicates38Headers_,perfectDuplicates38Norm_,perfectDuplicates38Hash_,perfectDuplicates38Fingerprint_,perfectDuplicates38Shape_,perfectDuplicates38Pair_,perfectDuplicates38Ledger_,perfectDuplicates38Decisions_,perfectDuplicates38ArchivedGmail_,perfectDuplicates38Scan_,perfect40Original_perfectDuplicates38List_,perfect40Original_perfectDuplicates38Resolve_,perfectReports39ShiftMonth_,perfectReports39Round_,perfectReports39Delta_,perfect40Original_perfectReports39Get_,perfectReports39Build_,perfect40Original_perfectReports39Kontrola_,perfect40Trusted_,perfect40TrustedEditor_,perfect40SuperIds_,perfect40Super_,perfect40Catalog_,perfect40Policy_,perfect40Caps_,perfect40Can_,perfect40Require_,perfect40RawTarget_,perfect40GuardUser_,perfect40PublicUser_,perfect40Original_perfectSecurity40Get_,perfect40Original_perfectSecurity40Save_,perfect40Original_perfectSecurity40Audit_,perfect40PrivateSnapshot_,perfect40OrderFields_,perfect40After_,perfect40SanitizeResult_,perfect40FilterBootstrap_,perfect40Enter_,perfectSuperAdmin40Setup_,perfect40GmailCron_,perfect40TimingCron_,perfect40Install_,perfectRepairPublicUser_,databaseInitialize,databaseGetAllCustomers,databaseGetAllVehicles,databaseGetAllOrders,databaseFindCustomerById,databaseFindCustomerByPhone,databaseFindCustomerByEmail,databaseFindOrderById,databaseFindOrderByGmailMessageId,databaseGetOrdersByCustomerId,databaseGetVehiclesByCustomerId,databaseCreateCustomer,databaseUpdateCustomer,databaseCreateVehicle,databaseCreateOrder,databaseUpdateOrder,databaseUpdateVehicle,designCentralniDatabaze,opravitValidaciGmailImportu,gmailPreviewNextBatch,gmailStartAutomaticImport,gmailStopAutomaticImport,gmailRunAutomaticImport,gmailTestPermissionsV23,gmailAutomaticImportStatus,gmailDryRun10Reservations,gmailTestLoad10Reservations,gmailTestParse10Reservations,perfectGmailSpustitV24,perfectGmailDiagnostikaV24,generateOrderId,perfectOrderIdPreviewV28,perfectStaffGetMyStatistics,perfectAdminUsersList,perfectAdminUsersHistory,perfectAdminUsersSave,perfectAdminUsersGetAvatar,perfectLoga42GetManifest,perfectLoga42GetBrand,perfectLoga42Test,perfectLogo42GetMap,perfectLogo42Diagnostika,perfectAutoStatusRun,perfectAutoStatusPreview,perfectAutoStatusBackfill,perfectControlSetupV26,perfectControlTickV26,perfectWebGetAllHistoricalDataAddons31,perfectControlTickAddons31,perfectBoxesGetOverviewV25,perfectBoxesSaveShiftV25,perfectBoxesSaveOrderV25,perfectRosterSeedV25,perfectRosterGetMineV25,perfectVoucher36Setup,perfectVoucher36List,perfectVoucher36SaveProduct,perfectVoucher36Issue,perfectVoucher36Edit,perfectVoucher36Redeem,perfectVoucher36History,perfectVoucher36Art,perfectVoucher36ImportPreview,perfectVoucher36Import,perfectWebBootstrap36,perfectAuthLoginFast36,perfectAuthLoginBootstrap37,perfectWebGetBrandAssets37,perfectKontrolaProjektuV37,perfectDokoncitInstalaciV37,perfectDuplicates38List,perfectDuplicates38Resolve,perfectReports39Get,perfectReports39Kontrola,perfectWebGetServicesAddons31,perfectWebSaveServiceAddons31,perfectWebCreateOrderAddons31,perfectWebUpdateOrderAddons31,doGet,pripravitWebAObjednavkovyList,zobrazitSloupceObjednavek,perfectAuthGetStatus,perfectAuthLogin,perfectAuthWhoAmI,perfectAuthLogout,perfectWebGetAppInfo,perfectWebGetAllHistoricalData,perfectWebGetDashboardData,perfectWebGetServices,perfectWebGetWorkers,perfectWebSaveService,perfectWebCreateOrder,perfectWebUpdateOrder,perfectU06GetLogoMap,perfectAuthBootstrapAdmin,perfectAuthGetUsers,perfectAuthUpsertUser,perfectAuthChangePassword,perfectWebPreviewTestOrders,perfectWebArchiveTestOrders,perfectAuthGetMyProfile,perfectAuthSaveMyProfile,perfectWebUpdateCustomer,perfectWebUpdateVehicle,perfectV13MediaGet,perfectV13MediaSave,perfectV13MediaGetProfileBatch,perfectWebAdminArchiveOrder,perfectSecurity40Get,perfectSecurity40Save,perfectSecurity40Audit,perfect40Kontrola_,perfectPreview41Context_,perfectPreview41Wrap_,perfectAddons31Blank_,perfectAddons31Extra_,perfectAddons31Money_,perfect40Original_perfectWebGetServicesAddons31_,perfect40Original_perfectWebSaveServiceAddons31_,perfectAddons31Pricing_,perfect40Original_perfectWebCreateOrderAddons31_,perfect40Original_perfectWebUpdateOrderAddons31_,perfectShared33Worker_,perfectShared33Payload_,perfectShared33Envelope_,perfectShared33Amounts_,perfectShared33Apply_,perfectShared33Read_,perfect40Original_doGet_,perfectRepairProps_,perfectRepairLock_,perfectRepairUsers_,perfectRepairRandom_,perfectRepairDigest_,perfectRepairPassword_,perfectRepairEqual_,perfect40BasePublicUser_,perfect40Original_pripravitWebAObjednavkovyList_,perfect40Original_zobrazitSloupceObjednavek_,perfectRepairPrepare_,perfectRepairEnsureAdmin_,perfectRepairCheckDatabase_,perfectRepairExtendOrderColumns_,perfectRepairStyleOrderIds_,perfect40Original_perfectAuthGetStatus_,perfect40Original_perfectAuthLogin_,perfectRepairRequireUser_,perfect40Original_perfectAuthWhoAmI_,perfect40Original_perfectAuthLogout_,perfect40Original_perfectWebGetAppInfo_,perfectRepairSerializable_,perfectRepairMoney_,perfect40Original_perfectWebGetAllHistoricalData_,perfect40Original_perfectWebGetDashboardData_,perfectRepairServicesSheet_,perfectRepairServices_,perfect40Original_perfectWebGetServices_,perfect40Original_perfectWebGetWorkers_,perfectRepairWorker_,perfect40Original_perfectWebSaveService_,perfectRepairOrderPayload_,perfectRepairPricing_,perfectSpeedRelated_,perfect40Original_perfectWebCreateOrder_,perfect40Original_perfectWebUpdateOrder_,perfect40Original_perfectU06GetLogoMap_,perfectAuthRequireAdmin_,perfectAuthPasswordHash_,perfectAuthSetPasswordFields_,perfect40Original_perfectAuthBootstrapAdmin_,perfect40Original_perfectAuthGetUsers_,perfect40Original_perfectAuthUpsertUser_,perfect40Original_perfectAuthChangePassword_,perfect40Original_perfectWebPreviewTestOrders_,perfect40Original_perfectWebArchiveTestOrders_,perfect40Original_perfectAuthGetMyProfile_,perfect40Original_perfectAuthSaveMyProfile_,nastavitFaviconuPerfect_,perfect40Original_perfectWebUpdateCustomer_,perfect40Original_perfectWebUpdateVehicle_,perfectV13MediaValidate_,perfectV13MediaKey_,perfectV13MediaExists_,perfectV13MediaData_,perfectV13MediaFolder_,perfect40Original_perfectV13MediaGet_,perfect40Original_perfectV13MediaSave_,perfect40Original_perfectV13MediaGetProfileBatch_,perfect40Original_perfectWebAdminArchiveOrder_};
}
