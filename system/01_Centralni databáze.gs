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
function perfect40Original_databaseGetAllVehicles_(){
 const vehicles=databaseRows_(databaseGetVehiclesSheet_(),2,PERFECT_DB_VEHICLE_HEADERS),latest=new Map();
 databaseGetAllOrders().forEach(o=>{if(!o.VEHICLE_ID||!databasePlateKey_(o.SPZ))return;const key=String(o.VEHICLE_ID),stamp=perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI)+'|'+String(o.CAS_PRIJEZDU||''),old=latest.get(key);if(!old||stamp>=old.stamp)latest.set(key,{stamp,plate:perfect103PlateDisplay_(o.SPZ)});});
 return vehicles.map(v=>Object.assign(v,{SPZ:latest.get(String(v.VEHICLE_ID))?.plate||''}));
}
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
function databaseNormalizePhone_(v){const p=perfectPhoneParse_(v);return p?p.key:'';}
function databaseFormatPhone_(v){const p=perfectPhoneParse_(v);return p?p.formatted:String(v||'').trim();}
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
 const allVehicles=databaseGetAllVehicles(),vehicles=allVehicles.filter(v=>String(v.CUSTOMER_ID)===id),allHistory=databaseGetAllOrders(),history=allHistory.filter(x=>String(x.CUSTOMER_ID)===id&&String(x.ORDER_ID)!==String(data.EXCLUDE_ORDER_ID||''));
 // SPZ je identita vozu i při jiném zápisu modelu nebo změně zákazníka.
 if(plate){const linked=allHistory.filter(x=>databasePlateKey_(x.SPZ)===plate&&x.VEHICLE_ID);const known=allVehicles.find(v=>linked.some(x=>String(x.VEHICLE_ID)===String(v.VEHICLE_ID)));if(known)return known;}
 
 const same=vehicles.filter(x=>databaseVehicleKey_(x.VOZIDLO)===databaseVehicleKey_(name));
 let candidate;if(plate)candidate=same.find(v=>!history.some(x=>x.VEHICLE_ID===v.VEHICLE_ID&&databasePlateKey_(x.SPZ)&&databasePlateKey_(x.SPZ)!==plate));
 else{if(same.length>1)throw new Error('Zákazník má více vozidel tohoto modelu. Vyplň SPZ.');candidate=same[0];}
 if(candidate)return candidate;
 const now=new Date(),row=[databaseGenerateVehicleId_(),id,name,now,now];databaseGetVehiclesSheet_().appendRow(row);return databaseVehicleRowToObject_(row);
});}
function databaseLinkOrder_(o,exclude,original){
 const existing=o.CUSTOMER_ID?databaseFindCustomerById(o.CUSTOMER_ID):null;
 let customer;if(o.TELEFON||o.EMAIL)customer=databaseCreateCustomer(o);else if(existing)customer=existing;else customer=databaseCreateCustomer(o);
 o.CUSTOMER_ID=customer.CUSTOMER_ID;o.JMENO_PRIJMENI=o.JMENO_PRIJMENI||customer.JMENO_PRIJMENI;o.TELEFON=databaseFormatPhone_(o.TELEFON||customer.TELEFON);o.EMAIL=o.EMAIL||customer.EMAIL;
 const unchanged=original&&String(original.CUSTOMER_ID)===String(customer.CUSTOMER_ID)&&databaseVehicleKey_(original.VOZIDLO)===databaseVehicleKey_(o.VOZIDLO)&&databasePlateKey_(original.SPZ)===databasePlateKey_(o.SPZ);
 const known=unchanged&&databaseGetAllVehicles().find(v=>String(v.VEHICLE_ID)===String(original.VEHICLE_ID));
 const vehicle=known||databaseCreateVehicle({CUSTOMER_ID:customer.CUSTOMER_ID,VOZIDLO:o.VOZIDLO,SPZ:o.SPZ,EXCLUDE_ORDER_ID:exclude});o.VEHICLE_ID=vehicle.VEHICLE_ID;return o;
}
function databaseValidatedOrder_(o){
 o.SPZ=perfect103PlateDisplay_(o.SPZ);
 o.DATUM_OBJEDNANI=databaseDate_(o.DATUM_OBJEDNANI);o.CAS_PRIJEZDU=databaseTime_(o.CAS_PRIJEZDU);o.CAS_ODJEZDU=databaseTime_(o.CAS_ODJEZDU);
 const pendingProgram=String(o.MYCI_PROGRAM||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='sluzbu si vyberu na miste';
 const pendingPrice=pendingProgram&&(o.CENA_CELKEM===''||o.CENA_CELKEM==null);
 o.CENA_CELKEM=pendingPrice?'':databaseMoney_(o.CENA_CELKEM);o.STAV_OBJEDNAVKY=databaseStatus_(o.STAV_OBJEDNAVKY);
 if(pendingPrice&&o.STAV_OBJEDNAVKY==='DOKONČENO')throw Error('Před dokončením vyber službu a zadej skutečnou cenu.');
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
 let o=databaseValidatedOrder_({...current,...changes});o=databaseLinkOrder_(o,String(id),current);
 databaseBalance104SyncPrice_(current,o);
 const row=PERFECT_DB_ORDER_HEADERS.map(h=>o[h]??'');sh.getRange(r,9).setNumberFormat('@');sh.getRange(r,1,1,row.length).setValues([row]);databaseStyleOrderId_(sh,r,o.ORDER_ID);if(Object.prototype.hasOwnProperty.call(changes,'STAV_OBJEDNAVKY'))databaseOrderMeta26Save_(o.ORDER_ID,'',new Date().toISOString());return databaseOrderRowToObject_(row);
});}
function databaseFindRowById_(sh,id,col){const start=sh.getName()===PERFECT_DB.SHEETS.ORDERS?3:2;if(sh.getLastRow()<start)return null;const rows=sh.getRange(start,col,sh.getLastRow()-start+1,1).getValues();const i=rows.findIndex(r=>String(r[0]).trim()===String(id).trim());return i<0?null:start+i;}
function databaseStyleOrderId_(sh,row,id){sh.getRange(row,1).setFontColor(/^OF\d{4}-/i.test(String(id))?'#f59e0b':/^N\d{4}-/i.test(String(id))?'#38bdf8':/^D\d{4}-/i.test(String(id))?'#d9b768':'#202124');}
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
  const spec={shift:{name:'__PERFECT_DB_SMENY',headers:['KEY','DATE','STATION','USER_ID','ACTIVE','WORKED','VERSION','UPDATED_AT','ACTOR_ID','WEEKEND_BONUS42']},order:{name:'__PERFECT_DB_PRIRAZENI_BOXU',headers:['KEY','ORDER_ID','STATION','ACTIVE','VERSION','UPDATED_AT','ACTOR_ID','BOX1_PRICE49','BOX2_PRICE49','BOX1_WEIGHT104','BOX2_WEIGHT104']},roster:{name:'__PERFECT_DB_SMENAR',headers:['KEY','DATE','USER_ID','PLANNED','GROUP','VERSION','UPDATED_AT','ACTOR_ID']},audit:{name:'__PERFECT_DB_BOXY_AUDIT',headers:['AT','ACTOR_ID','KIND','KEY','BEFORE_JSON','AFTER_JSON']}}[kind];
  if(!spec)throw new Error('Neznámý druh evidence.');
  const ss=perfectDatabaseGetSpreadsheet_();let sh=ss.getSheetByName(spec.name);
  if(!sh&&create){sh=ss.insertSheet(spec.name);if(sh.getMaxColumns()<spec.headers.length)sh.insertColumnsAfter(sh.getMaxColumns(),spec.headers.length-sh.getMaxColumns());sh.getRange(1,1,1,spec.headers.length).setValues([spec.headers]);sh.hideSheet();}
  if(!sh)return null;
  let width=Math.min(sh.getMaxColumns(),spec.headers.length),h=sh.getRange(1,1,1,width).getValues()[0];
  const oldWidth=kind==='shift'?9:kind==='order'?(h.length>=9&&spec.headers.slice(0,9).every((x,i)=>String(h[i])===x)?9:7):spec.headers.length;
  const legacy=oldWidth<spec.headers.length&&spec.headers.slice(0,oldWidth).every((x,i)=>String(h[i])===x)&&h.slice(oldWidth).every(x=>x==null||String(x)==='');
  if(legacy&&create){
    if(sh.getMaxColumns()>oldWidth&&sh.getLastRow()>1&&sh.getRange(2,oldWidth+1,sh.getLastRow()-1,Math.min(sh.getMaxColumns(),spec.headers.length)-oldWidth).getValues().some(r=>r.some(x=>x!==''&&x!=null)))throw Error('Nové sloupce evidence obsahují neoznačená data. Nebyly přepsány.');
    if(sh.getMaxColumns()<spec.headers.length)sh.insertColumnsAfter(sh.getMaxColumns(),spec.headers.length-sh.getMaxColumns());
    sh.getRange(1,oldWidth+1,1,spec.headers.length-oldWidth).setValues([spec.headers.slice(oldWidth)]);width=spec.headers.length;h=sh.getRange(1,1,1,width).getValues()[0];
  }
  if(!legacy&&spec.headers.some((x,i)=>String(h[i])!==x))throw new Error('Nesouhlasí hlavičky '+spec.name+'. Zápis byl zastaven.');
  return {sheet:sh,headers:spec.headers,readWidth:legacy&&!create?Math.min(oldWidth,width):spec.headers.length};
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
    const actor=perfect43Require_(token,'shifts.manage'),date=perfectBoxes25Date_(input.date),station=perfectBoxes25Station_(input.station);
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
    const actor=perfect43Require_(token,'shifts.manage'),id=String(input.orderId||'').trim();
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
   var clock58=databaseStatus58Clock_(o,timing);if(!clock58){result.unknown++;return;}
   if(clock58.arrival>Date.now()||clock58.finish>Date.now())return;result.eligible++;
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
 var sheet=databaseAddons31ServicesSheet_(false);if(!sheet||sheet.getLastRow()<2)return [];
 var width=sheet.getLastColumn()>=7?7:6;
 return sheet.getRange(2,1,sheet.getLastRow()-1,width).getValues().filter(function(r){return r[0];}).map(function(r){
  var meta={};if(r[6]){try{meta=JSON.parse(r[6]);}catch(e){throw Error('Poškozená nastavení programu '+r[1]);}}
  return {SERVICE_ID:String(r[0]),NAZEV:String(r[1]),TYP:String(r[2]),CENA:perfectAddons31Blank_(r[3])?null:perfectAddons31Money_(r[3],true),BARVA:String(r[4]),AKTIVNI:r[5]===true||r[5]===1||/^(true|ano)$/i.test(String(r[5])),META103:meta,REVISION103:perfect103ServiceRevision_(r.slice(0,6).concat(r[6]||''))};
 });
}
function databaseAddons31SaveService_(payload) {
 return perfectRepairLock_(function(){
  var sheet=databaseAddons31ServicesSheet_(true),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues():[];
  var id=String(payload.SERVICE_ID||'SRV_'+Utilities.getUuid()),index=rows.findIndex(function(r){return String(r[0])===id;});
  if(payload.SERVICE_ID&&index<0)throw Error('Služba nebyla nalezena.');
  var extra=sheet.getLastColumn()>=7?String(sheet.getRange(1,7).getValue()||''):'';
  if(extra&&extra!=='META103')throw Error('Sedmý sloupec ceníku již slouží jiným datům. Zápis zastaven.');
  var old=index<0?null:sheet.getRange(index+2,1,1,extra?7:6).getValues()[0];
  if(old&&payload.REVISION103&&payload.REVISION103!==perfect103ServiceRevision_(old.slice(0,6).concat(old[6]||'')))throw Error('CONFLICT: Program mezitím změnil někdo jiný. Obnov ceník.');
  var metadata=payload.META103===undefined?(old&&old[6]||''):JSON.stringify(perfect103ServiceMeta_(payload.META103));
  if(sheet.getMaxColumns()<7)sheet.insertColumnsAfter(sheet.getMaxColumns(),7-sheet.getMaxColumns());
  sheet.getRange(1,7).setValue('META103');
  var row=[id,payload.NAZEV,payload.TYP,payload.CENA===null?'':payload.CENA,payload.BARVA,payload.AKTIVNI,metadata];
  sheet.getRange(index<0?sheet.getLastRow()+1:index+2,1,1,7).setValues([row]);SpreadsheetApp.flush();
  CacheService.getScriptCache().remove('PERFECT101_FINGERPRINT');return {success:true,SERVICE_ID:id};
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
      if(!id||/^D\d{4}-/.test(id)||perfectTiming31Normalize_(order.STAV_OBJEDNAVKY)!=='CEKA SE')return;
      result.checked++;
      if(ids.get(id)!==1){result.unknown++;return;}
      var timing=perfectTiming31Meta_(order);
      if(!timing.AUTO_COMPLETE_AT){result.unknown++;return;}
      var clock58=databaseStatus58Clock_(order,timing);if(!clock58){result.unknown++;return;}
      if(clock58.arrival>now||clock58.finish>now)return;
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
function databaseSecurity40Save_(actor,input){return perfectDatabaseWithLock_('Oprávnění',function(){
 if(!perfect40Can_(actor,'roles.manage')||actor.role!=='ADMINISTRATOR')throw Error('Nemáš povolenou správu oprávnění.');
 var old=perfect40Policy_();if(String(input.version)!==String(old.version))throw Error('Oprávnění se mezitím změnila. Obnov přehled.');
 var keys=perfect40Catalog_().map(function(c){return c.key;}),roles={},superUser=perfect40Super_(actor),ceiling=perfect40Caps_(actor);
 ['ADMINISTRATOR','PRACOVNIK','SMENAR'].forEach(function(role){var values=input.roles&&input.roles[role];if(values===undefined&&role==='ADMINISTRATOR')values=old.roles[role];if(!Array.isArray(values)||values.some(function(k){return keys.indexOf(k)<0;}))throw Error('Neplatná oprávnění role '+role+'.');roles[role]=Array.from(new Set(values));
  if(!superUser&&role==='ADMINISTRATOR'&&JSON.stringify(roles[role].slice().sort())!==JSON.stringify(old.roles[role].slice().sort()))throw Error('Oprávnění administrátora může měnit jen nejvyšší účet.');
  if(!superUser&&roles[role].some(function(k){return old.roles[role].indexOf(k)<0&&ceiling.indexOf(k)<0;}))throw Error('Nelze přidělit oprávnění, které sám nemáš.');
  if(role!=='ADMINISTRATOR'&&roles[role].indexOf('roles.manage')>=0)throw Error('Správu oprávnění může mít pouze administrátor.');
  [['orders.create','orders.read'],['orders.edit','orders.read'],['customers.edit','customers.read'],['vehicles.edit','vehicles.read'],['vouchers.issue','vouchers.read'],['vouchers.redeem','vouchers.read'],['media.write','media.read'],['prices.edit','orders.edit'],['services.edit','services.read'],['duplicates.manage','orders.read']].forEach(function(pair){if(roles[role].indexOf(pair[0])>=0&&roles[role].indexOf(pair[1])<0)throw Error('Povolení '+pair[0]+' vyžaduje také '+pair[1]+'.');});
 });
 var changed=['ADMINISTRATOR','PRACOVNIK','SMENAR'].filter(function(role){return JSON.stringify(roles[role].slice().sort())!==JSON.stringify(old.roles[role].slice().sort());}),value={version:Utilities.getUuid(),roles:roles,updatedAt:new Date().toISOString(),actorId:String(actor.id)},props=perfectRepairProps_();props.setProperty('PERFECT40_ROLE_POLICY',JSON.stringify(value));var users=perfectRepairUsers_(),all=props.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){try{var session=JSON.parse(all[k]),u=users.find(function(x){return String(x.id)===String(session.userId);});if(u&&!perfect40Super_(u)&&(changed.indexOf(u.role)>=0||u.role==='SMENAR'&&changed.indexOf('PRACOVNIK')>=0))props.deleteProperty(k);}catch(e){}});return {success:true,version:value.version};
});}
function databaseSecurity43CreateOwner_(actor,input){return perfectDatabaseWithLock_('Založení nejvyššího účtu',function(){
 if(perfect40SuperIds_().length)throw Error('Založení nejvyššího účtu není dostupné.');
 var current=perfectRepairUsers_().find(function(u){return String(u.id)===String(actor.id)&&u.active!==false;});if(!current||current.role!=='ADMINISTRATOR'||!perfect40Can_(current,'roles.manage'))throw Error('Založení účtu není dostupné.');
 var cache=CacheService.getScriptCache(),key='OWNER43_'+actor.id,attempts=Number(cache.get(key)||0);if(attempts>=5)throw Error('Příliš mnoho pokusů. Zkus to za 15 minut.');
 if(!perfectRepairEqual_(current.passwordHash,perfectRepairPassword_(String(input.currentPassword||''),current.salt,current.iterations))){cache.put(key,String(attempts+1),900);throw Error('Současné heslo není správné.');}
 var username=String(input.username||'').trim().toLowerCase(),password=String(input.password||'');if(!/^[a-z0-9._-]{3,40}$/.test(username)||password.length<14||password.length>128)throw Error('Použij nové jméno a heslo dlouhé 14–128 znaků.');
 var users=perfectRepairUsers_();if(users.some(function(u){return String(u.username).toLowerCase()===username;}))throw Error('Zvol nové samostatné uživatelské jméno.');
 var user={id:Utilities.getUuid(),username:username,firstName:'Správce',surname:'',role:'ADMINISTRATOR',active:true,mustChangePassword:false};perfectAuthSetPasswordFields_(user,password);databaseSecurity40AuditSheet_();users.push(user);var props=perfectRepairProps_();props.setProperty(PERFECT_REPAIR.USERS,JSON.stringify(users));props.setProperty('PERFECT40_SUPER_IDS',JSON.stringify([user.id]));cache.remove(key);databaseSecurity40Audit_(user,'OWNER_SETUP',user.id,{}, {id:user.id},'OK','');return {success:true};
});}
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

/* V44 — centrální zápisy detailingových zakázek, souborů a připomínek. */
function databaseDetail44Sheet_(name,headers){var ss=perfectDatabaseGetSpreadsheet_(),sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.hideSheet();}else{var h=sh.getRange(1,1,1,headers.length).getValues()[0];if(headers.some(function(k,i){return k!==h[i];}))throw Error('Nesouhlasí hlavička '+name+'. Nic nebylo přepsáno.');}return sh;}
function databaseDetail44Save_(actor,input){return perfectDatabaseWithLock_('Detailing V44',function(){
 var id=String(input.id||''),updating=!!id,detail=perfectDetail44Input_(input),payload=input.order||{},request=String(input.requestId||'');if(!/^[a-zA-Z0-9-]{12,80}$/.test(request))throw Error('Chybí identifikátor uložení. Obnov formulář.');
 var ledger=databaseDetail44Sheet_('__PERFECT_DB_DETAILING_REQUEST44',['REQUEST_ID','HASH','ORDER_ID']),requests=ledger.getLastRow()<2?[]:ledger.getRange(2,1,ledger.getLastRow()-1,3).getValues();
 var entries=perfectDetail44Rows_(),hash=perfectDetail44Hash_({id:id,version:input.version||0,detail:detail,order:payload}),retry=requests.find(function(x){return x[0]===request;});if(retry){if(retry[1]!==hash)throw Error('Stejný požadavek má jiný obsah. Obnov formulář.');return Object.assign({success:true},perfectDetail44Record_(String(retry[2])));}
 var old=updating?perfectDetail44Order_(id):null,entry=entries.find(function(x){return x.id===id;});if(updating&&Number(input.version)!==(entry?entry.version:0))throw Error('Zakázku mezitím změnil jiný uživatel. Obnov kartu.');
 if(!perfect40Can_(actor,'prices.edit')){if(!updating)throw Error('Vytvoření detailingové zakázky s individuální cenou vyžaduje povolení úpravy cen.');['CENA_CELKEM','CENA_PROGRAMU'].forEach(function(k){if(payload[k]!==undefined&&databaseMoney_(payload[k])!==databaseMoney_(old[k]||old.CENA_CELKEM))throw Error('Nemáš povolenou úpravu cen.');});if(payload.MYCI_PROGRAM!==undefined&&String(payload.MYCI_PROGRAM)!==String(old.MYCI_PROGRAM))throw Error('Nemáš povolenou změnu služeb a ceny.');}
 var o=databaseNormalizeOrderInput_(payload);Object.keys(o).forEach(function(k){if(typeof o[k]==='string'&&o[k].length>(k==='MYCI_PROGRAM'||k==='POZNAMKY'?3000:150))throw Error('Pole '+k+' je příliš dlouhé.');});if(o.CENA_CELKEM!==undefined)o.CENA_PROGRAMU=o.CENA_CELKEM;delete o.ORDER_ID;delete o.GMAIL_MESSAGE_ID;delete o.CENOVE_POLOZKY;delete o.WEB_REQUEST_ID;delete o.DARKOVY_POUKAZ;delete o.ZNECISTENI_20;o.PRACOVNIK='DETAILING';
 if(o.TELEFON!==undefined){var phone=perfectPhoneParse_(o.TELEFON);if(!phone)throw Error('Vyplň platný telefon zákazníka.');}if(o.EMAIL&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.EMAIL))throw Error('Vyplň platný e-mail.');if(!updating&&!String(o.JMENO_PRIJMENI||'').trim())throw Error('Vyplň jméno zákazníka.');
 if(!updating){o.PERFECT_WEB_GENERATE_ID='DETAILING';o.PERFECT_WEB_REQUEST_ID=request;o.CENA_PROGRAMU=o.CENA_CELKEM;o.STAV_OBJEDNAVKY=o.STAV_OBJEDNAVKY||'ČEKÁ SE';o.CAS_PRIJEZDU=o.CAS_PRIJEZDU||'08:00';o=databaseValidatedOrder_(o);}
 else databaseValidatedOrder_(Object.assign({},old,o));
 var sh=databaseDetail44Sheet_('__PERFECT_DB_DETAILING44',['ORDER_ID','VERSION','DATA_JSON','REQUEST_ID','REQUEST_HASH']);
 var order=updating?databaseUpdateOrder(id,o):databaseCreateOrder(Object.assign({},o,{PERFECT_WEB_GENERATE_ID:'DETAILING',PERFECT_WEB_REQUEST_ID:request}));id=String(order.ORDER_ID);if(!updating){entry=entries.find(function(x){return x.id===id;});if(entry){if(entry.requestId!==request||entry.requestHash!==hash)throw Error('Zakázka již existuje, ale dokončení původního uložení vyžaduje kontrolu. Obnov kartu.');ledger.appendRow([request,hash,id]);return Object.assign({success:true},perfectDetail44Record_(id));}}var version=(entry?entry.version:0)+1,row=entry?databaseFindRowById_(sh,id,1):sh.getLastRow()+1;
 sh.getRange(row,1,1,5).setNumberFormat('@').setValues([[id,version,JSON.stringify(detail),request,hash]]);ledger.appendRow([request,hash,id]);return Object.assign({success:true},perfectDetail44Record_(id));
});}
function databaseDetail44MediaSave_(actor,input){return perfectDatabaseWithLock_('Fotografie detailingu V44',function(){var id=String(input.id||''),slot=String(input.slot||'');perfectDetail44Order_(id);if(!/^(before|after)[1-5]$/.test(slot))throw Error('Povoleno je 5 fotografií před a 5 po práci.');var match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(input.dataUrl||''));if(!match||String(input.dataUrl).length>2000000)throw Error('Nahraj JPG, PNG nebo WebP do 1,45 MB.');var bytes=Utilities.base64Decode(match[2]);if(bytes.length<100||bytes.length>1450000)throw Error('Fotografie musí mít 100 B až 1,45 MB.');var sh=databaseDetail44Sheet_('__PERFECT_DB_DETAILING_FOTO44',['ORDER_ID','SLOT','FILE_ID','AT','ACTOR_ID']),rows=sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,5).getValues(),i=rows.findIndex(function(r){return r[0]===id&&r[1]===slot;}),old=i>=0?String(rows[i][2]):'';if(String(input.expectedFileId||'')!==old)throw Error('Fotografii mezitím změnil jiný uživatel. Obnov kartu.');var file=perfectV13MediaFolder_().createFile(Utilities.newBlob(bytes,'image/'+match[1],id+'_'+slot+'_'+Date.now()+'.'+(match[1]==='jpeg'?'jpg':match[1])));try{sh.getRange(i>=0?i+2:sh.getLastRow()+1,1,1,5).setNumberFormat('@').setValues([[id,slot,file.getId(),new Date().toISOString(),String(actor.id)]]);}catch(e){file.setTrashed(true);throw e;}return {success:true,slot:slot,fileId:file.getId(),data:input.dataUrl};});}
function databaseDetail44Configure_(actor,input){return perfectDatabaseWithLock_('Připomínky detailingu V44',function(){if(input.enabled!==true&&input.enabled!==false)throw Error('Vyber zapnutí nebo vypnutí připomínek.');var p=perfectRepairProps_();if(input.enabled&&p.getProperty('PERFECT41_TEST_MODE')==='ON')throw Error('V testovací kopii se e-maily neposílají.');if(input.enabled&&ScriptApp.__perfectNode!==true){if(!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='perfectDetail44ReminderCron_';}))ScriptApp.newTrigger('perfectDetail44ReminderCron_').timeBased().everyMinutes(15).create();}p.setProperty('PERFECT44_REMINDERS_ENABLED',input.enabled?'ON':'OFF');return {success:true,settings:perfectDetail44Settings_()};});}
function databaseDetail44ClaimReminders_(){return perfectDatabaseWithLock_('Připomínky: příprava',function(){var p=perfectRepairProps_(),cfg=perfectDetail44Settings_();if(!cfg.enabled||cfg.testMode)return [];var today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd'),sh=databaseDetail44Sheet_('__PERFECT_DB_DETAILING_MAIL44',['KEY','STATUS','CLAIM','AT','DETAIL']),rows=sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,5).getValues(),jobs=[],orders=databaseGetAllOrders();perfectDetail44Rows_().forEach(function(r){var d=r.detail,o=orders.find(function(o){return o.ORDER_ID===r.id;});if(!o||!d.reminderEnabled||!d.protectionYears||!d.checkDate||['ZRUŠENO','NEDORAZIL'].indexOf(o.STAV_OBJEDNAVKY)>=0)return;var due=new Date(d.checkDate+'T12:00:00Z');due.setUTCDate(due.getUTCDate()-7);if(today<due.toISOString().slice(0,10)||today>d.checkDate)return;var key=r.id+'|'+d.checkDate;if(rows.some(function(row){return row[0]===key;})||jobs.length>=20)return;var claim=Utilities.getUuid(),subject='PERFECT: kontrola keramické ochrany — '+r.id,body=['Blíží se kontrola keramické ochrany.','Zakázka: '+r.id,'Zákazník: '+o.JMENO_PRIJMENI,'Telefon: '+o.TELEFON,'E-mail: '+(o.EMAIL||'neuveden'),'Vozidlo: '+o.VOZIDLO,'SPZ: '+(o.SPZ||'neuvedena'),'VIN: '+(d.vin||'neuveden'),'Keramická ochrana: '+d.protectionYears+' roky/let','Aplikace: '+d.applicationDate,'Kontrola: '+d.checkDate,'Obnova: '+d.renewalDate,'Služby: '+o.MYCI_PROGRAM,'Celková cena: '+o.CENA_CELKEM+' Kč',d.notes?'Poznámka: '+d.notes:''].filter(Boolean).join('\n');sh.appendRow([key,'SENDING',claim,new Date().toISOString(),'']);jobs.push({key:key,claim:claim,to:'rabitensro@gmail.com',subject:subject,body:body});});p.setProperty('PERFECT44_REMINDERS_LAST_RUN',new Date().toISOString());return jobs;});}
function databaseDetail44CompleteReminder_(key,claim,status,detail){return perfectDatabaseWithLock_('Připomínky: výsledek',function(){if(['SENT','UNKNOWN'].indexOf(status)<0)throw Error('Neplatný stav odeslání.');var sh=databaseDetail44Sheet_('__PERFECT_DB_DETAILING_MAIL44',['KEY','STATUS','CLAIM','AT','DETAIL']),row=databaseFindRowById_(sh,key,1);if(!row)throw Error('Připomínka nebyla připravena.');var v=sh.getRange(row,1,1,5).getValues()[0];if(v[2]!==claim)throw Error('Připomínka už patří jinému běhu.');if(v[1]==='SENT')return {success:true};sh.getRange(row,2,1,4).setValues([[status,claim,new Date().toISOString(),String(detail||'').slice(0,500)]]);var p=perfectRepairProps_();if(status==='UNKNOWN')p.setProperty('PERFECT44_REMINDERS_LAST_ERROR',String(detail||'Odeslání nebylo potvrzeno.'));return {success:true};});}

function databaseDetail44RetryMail_(actor,key){return perfectDatabaseWithLock_('Opakování připomínky',function(){var sh=databaseDetail44Sheet_('__PERFECT_DB_DETAILING_MAIL44',['KEY','STATUS','CLAIM','AT','DETAIL']),row=databaseFindRowById_(sh,key,1);if(!row)throw Error('Připomínka nebyla nalezena.');var v=sh.getRange(row,1,1,5).getValues()[0];if(v[1]==='SENT')throw Error('Potvrzeně odeslaná připomínka se znovu neposílá.');if(v[1]==='SENDING'&&Date.now()-Date.parse(v[3])<1800000)throw Error('Počkej alespoň 30 minut; odeslání může ještě probíhat.');sh.deleteRow(row);perfectRepairProps_().deleteProperty('PERFECT44_REMINDERS_LAST_ERROR');return {success:true};});}

/** V49: jediný zapisující modul. Celá dávka se ověří pod stejným zámkem před prvním zápisem. */
function databaseBoxes49Apply_(token,input){
 return perfectDatabaseWithLock_('Rozdělení boxů V49',function(){
  var actor=perfect43Require_(token,'shifts.manage'),date=perfectBoxes25Date_(input&&input.date),items=input&&input.items;
  if(!Array.isArray(items)||!items.length||items.length>50)throw Error('Vyber 1 až 50 zakázek.');
  var rows=perfectBoxes29Rows_('order'),byId104=new Map(databaseGetAllOrders().map(o=>[String(o.ORDER_ID),o])),seen=new Set(),prepared=items.map(function(item){
   var id=String(item.orderId||''),o=byId104.get(id),old=rows.find(r=>String(r.ORDER_ID)===id);
   if(seen.has(id))throw Error('Zakázka je v dávce dvakrát.');seen.add(id);
   if(!o||perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI)!==date)throw Error('Zakázka '+id+' není ve vybraném dni.');
   if(/^D\d{4}-/.test(id))throw Error('Detailing patří do samostatné sekce.');
   if(!perfectBoxes49Eligible_(o.STAV_OBJEDNAVKY))throw Error('Zrušenou nebo nedoručenou zakázku nelze přičíst do směny.');
   if(!item.revision||item.revision!==perfectBoxes49Revision_(o,old))throw Error('Zakázka '+id+' se mezitím změnila. Obnov přehled.');
   var station=String(item.station||''),split=null;
   if(station==='SHARED')split=perfectShared33Amounts_({box1:item.box1,box2:item.box2},o.CENA_CELKEM);
   else if(['BOX1','BOX2','QUEUE'].indexOf(station)<0)throw Error('Vyber BOX 1, BOX 2 nebo společnou práci.');
   return {id:id,expected:String(old&&old.VERSION||''),record:{KEY:id,ORDER_ID:id,STATION:station,ACTIVE:true,BOX1_PRICE49:split?split.box1:'',BOX2_PRICE49:split?split.box2:'',BOX1_WEIGHT104:split?Math.round(split.box1*100):'',BOX2_WEIGHT104:split?Math.round(split.box2*100):''}};
  });
  var applied=[],failed=[];
  prepared.forEach(function(p){try{var record=databaseBoxes25Commit_('order',p.id,p.record,p.expected,actor);applied.push({orderId:p.id,version:record.VERSION});}catch(e){failed.push({orderId:p.id,message:String(e.message||e)});}});
  if(typeof SpreadsheetApp.flush==='function')SpreadsheetApp.flush();
  var stored=perfectBoxes29Rows_('order');
  applied=applied.filter(function(p){var row=stored.find(r=>String(r.ORDER_ID)===p.orderId);if(!row||row.VERSION!==p.version){failed.push({orderId:p.orderId,message:'Zápis nebyl potvrzen následným čtením. Obnov přehled.'});return false;}return true;});
  return {success:failed.length===0,applied:applied,failed:failed,overview104:input.includeOverview104===true?perfectBalance104Overview_(token,date):undefined,message:failed.length?'Potvrzeno '+applied.length+' zakázek. '+failed.map(x=>x.orderId+': '+x.message).join(' · '):'Rozdělení potvrzeno.'};
 });
}

/** V56: hromadné vyřazení ručně označených duplicit. Pouze zápisový modul 01. */
function databaseDuplicates56RemoveSelected_(payload,actor){
 return perfectDatabaseWithLock_('databaseDuplicates56RemoveSelected_',function(){
  if(!actor||!actor.id||!actor.username)throw Error('Chybí ověřený uživatel.');
  var items=payload&&payload.items;
  if(!Array.isArray(items)||!items.length)throw Error('Nejdřív označ objednávky k odstranění.');
  if(items.length>1000)throw Error('Jedna dávka může obsahovat nejvýše 1000 objednávek.');
  var unique=new Map();items.forEach(function(item){
   var id=String(item&&item.id||'');
   if(!/^[a-z0-9_-]{1,100}$/i.test(id))throw Error('Neplatné číslo označené objednávky.');
   if(!unique.has(id))unique.set(id,item);
  });
  var sh=databaseGetOrdersSheet_(),heads=PERFECT_DB_ORDER_HEADERS;
  var actual=sh.getRange(2,1,1,heads.length).getValues()[0];
  if(actual.some(function(v,i){return String(v)!==heads[i];}))throw Error('Nesouhlasí hlavička databáze. Nic nebylo odstraněno.');
  var all=databaseGetAllOrders(),records=new Map();
  all.forEach(function(o){var id=String(o.ORDER_ID||''),list=records.get(id)||[];list.push(o);records.set(id,list);});
  var previous=perfectDuplicates38Decisions_(),plans=[];
  // Celá dávka se znovu ověří dřív, než se cokoliv archivuje nebo odstraní.
  unique.forEach(function(item,id){
   var proof=item.pair||{},ids=Array.isArray(proof.ids)?proof.ids.map(String):[];
   if(ids.length!==2||ids[0]===ids[1]||ids.indexOf(id)<0)throw Error('Chybí platné porovnání pro '+id+'. Obnov přehled.');
   var matches=ids.map(function(key){return records.get(key)||[];});
   if(matches.some(function(rows){return rows.length!==1;}))throw Error('Objednávka chybí nebo má duplicitní ID. Obnov přehled a označ ji znovu.');
   var pair=perfectDuplicates38Pair_(perfectDuplicates38Shape_(matches[0][0]),perfectDuplicates38Shape_(matches[1][0]));
   if(!pair||pair.key!==proof.key||pair.version!==proof.version)throw Error('Objednávky u '+id+' se mezitím změnily. Obnov přehled.');
   if(previous.some(function(r){return r[0]===pair.key&&r[1]===pair.version&&r[2]==='KEEP_BOTH';}))throw Error('Dvojice už byla označena jako dvě různé objednávky. Obnov přehled.');
   if(previous.some(function(r){return String(r[4])===id;}))throw Error('Objednávka '+id+' již má archivní záznam. Obnov přehled.');
   var row=databaseFindRowById_(sh,id,1),source=sh.getRange(row,1,1,heads.length).getValues()[0];
   if(source.some(function(v){return typeof v==='string'&&v.length>49000;}))throw Error('Záznam '+id+' je příliš dlouhý pro archivaci.');
   var other=ids.find(function(key){return key!==id&&!unique.has(key);})||'';
   var original=records.get(id)[0],gmail=String(original.GMAIL_MESSAGE_ID||'');
   var entry=[pair.key,pair.version,'PREPARED',other,id,String(actor.id),String(actor.username),new Date(),JSON.stringify(gmail?[gmail]:[])].concat(heads.map(function(_,i){return source[i]==null?'':source[i];}));
   if(entry.some(function(v){return typeof v==='string'&&/^\s*=/.test(v);}))throw Error('Záznam '+id+' obsahuje text vyžadující ruční kontrolu.');
   plans.push({id:id,entry:entry});
  });
  var ledger=perfectDuplicates38Ledger_(false);
  if(!ledger){
   ledger=perfectDatabaseGetSpreadsheet_().insertSheet('__PERFECT_DUPLICITY_ARCHIV');
   if(ledger.getMaxColumns()<perfectDuplicates38Headers_().length)ledger.insertColumnsAfter(ledger.getMaxColumns(),perfectDuplicates38Headers_().length-ledger.getMaxColumns());
   ledger.getRange(1,1,1,perfectDuplicates38Headers_().length).setValues([perfectDuplicates38Headers_()]);ledger.hideSheet();
  }
  var start=ledger.getLastRow()+1,entries=plans.map(function(p){return p.entry;});
  ledger.getRange(start,1,entries.length,entries[0].length).setNumberFormat('@').setValues(entries);SpreadsheetApp.flush();
  var saved=ledger.getRange(start,1,entries.length,entries[0].length).getValues();
  if(saved.some(function(row,i){return row.some(function(v,j){return String(v)!==String(entries[i][j]);});}))throw Error('Ověření archivních kopií selhalo. Aktivní objednávky zůstávají.');
  var removed=[],failed=[],warnings=[];
  plans.forEach(function(plan,i){
   try{
    var row=databaseFindRowById_(sh,plan.id,1);
    if(!row)throw Error('Objednávka již není aktivní.');
    sh.deleteRow(row);SpreadsheetApp.flush();
    if(databaseFindRowById_(sh,plan.id,1))throw Error('Odstranění objednávky nebylo potvrzené.');
    removed.push(plan.id);
    try{ledger.getRange(start+i,3).setValue('ARCHIVED');SpreadsheetApp.flush();}
    catch(e){warnings.push(plan.id+': objednávka odstraněna, archivní kopie čeká na potvrzení stavu.');}
   }catch(e){
    // Pokud záznam zmizel, ale potvrzení vyvolalo chybu, ověř skutečný stav.
    try{if(!databaseFindRowById_(sh,plan.id,1)){if(removed.indexOf(plan.id)<0)removed.push(plan.id);warnings.push(plan.id+': odstranění ověřeno dodatečně; archivní kopie zachována.');return;}}catch(verifyError){}
    failed.push({id:plan.id,message:String(e.message||e)});
   }
  });
  return {success:failed.length===0,requested:plans.length,removedIds:removed,failed:failed,warnings:warnings};
 });
}

/** V58: platný termín programu se ověřuje proti PLNÉMU datu příjezdu. */
function databaseStatus58Clock_(order,timing){
 try{
  if(!order||!timing||/^D\d{4}-/.test(String(order.ORDER_ID||'')))return null;
  var raw=order.DATUM_OBJEDNANI,date;
  if(raw instanceof Date)date=Utilities.formatDate(raw,'Europe/Prague','yyyy-MM-dd');
  else{raw=String(raw||'').trim();var iso=/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(raw),cz=/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/.exec(raw);date=iso?iso[1]+'-'+iso[2]+'-'+iso[3]:cz?cz[3]+'-'+cz[2].padStart(2,'0')+'-'+cz[1].padStart(2,'0'):'';}
  var time=order.CAS_PRIJEZDU instanceof Date?Utilities.formatDate(order.CAS_PRIJEZDU,'Europe/Prague','HH:mm'):String(order.CAS_PRIJEZDU||'').trim();
  if(!date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
  var arrival=Utilities.parseDate(date+' '+time,'Europe/Prague','yyyy-MM-dd HH:mm');
  if(Utilities.formatDate(arrival,'Europe/Prague','yyyy-MM-dd HH:mm')!==date+' '+time)return null;
  var start=arrival.getTime(),reported=Date.parse(timing.ARRIVAL_AT),finish=Date.parse(timing.AUTO_COMPLETE_AT),minutes=Number(timing.DURATION_MINUTES);
  if(!Number.isFinite(start)||!Number.isFinite(reported)||!Number.isFinite(finish)||!Number.isFinite(minutes)||minutes<=0)return null;
  if(reported!==start||finish!==start+minutes*60000)return null;
  return {arrival:start,finish:finish};
 }catch(e){return null;}
}
/** Pouze čtení: již dokončené zakázky, kterým program podle plného termínu ještě neskončil. */
function databaseStatus58Premature_(){
 var seen=new Map(),orders=databaseGetAllOrders(),now=Date.now();
 orders.forEach(function(o){var id=String(o.ORDER_ID||'');seen.set(id,(seen.get(id)||0)+1);});
 return orders.filter(function(o){return o.ORDER_ID&&seen.get(String(o.ORDER_ID))===1&&perfectTiming31Normalize_(o.STAV_OBJEDNAVKY)==='DOKONCENO';}).map(function(o){
  var timing=perfectTiming31Meta_(o),clock=databaseStatus58Clock_(o,timing);
  return clock&&clock.finish>now?{ORDER_ID:String(o.ORDER_ID),date:String(o.DATUM_OBJEDNANI),time:String(o.CAS_PRIJEZDU),finish:new Date(clock.finish).toISOString(),order:o}:null;
 }).filter(function(o){return !!o;});
}
/** Obnova nejvýše 50 nezměněných řádků z výslovně uloženého náhledu. Zápis jen v 01. */
function databaseStatus58Restore_(snapshot){
 return perfectDatabaseWithLock_('Oprava předčasných dokončení V58',function(){
  if(!snapshot||!Array.isArray(snapshot.items)||!snapshot.items.length)throw Error('Nejdřív spusť náhled předčasných dokončení.');
  if(snapshot.items.length>50||!Number.isFinite(snapshot.at)||Date.now()-snapshot.at>15*60000||snapshot.at>Date.now())throw Error('Náhled vypršel. Spusť nový náhled.');
  var candidates=new Map(databaseStatus58Premature_().map(function(x){return [x.ORDER_ID,x];})),sheet=databaseGetOrdersSheet_(),headers=Array.from(PERFECT_DB_ORDER_HEADERS),plans=[],unique=new Set();
  var actual=sheet.getRange(2,1,1,headers.length).getValues()[0];if(headers.some(function(h,i){return String(actual[i]).trim()!==h;}))throw Error('Nesouhlasí hlavička databáze.');
  snapshot.items.forEach(function(item){
   if(unique.has(String(item.id)))throw Error('Duplicitní ID v náhledu.');unique.add(String(item.id));
   var current=candidates.get(String(item.id));if(!current||perfectDuplicates38Fingerprint_(current.order)!==item.hash)throw Error('Zakázka '+item.id+' se změnila nebo její program mezitím skončil. Nic nebylo opraveno; spusť nový náhled.');
   var row=databaseFindRowById_(sheet,item.id,1),values=sheet.getRange(row,1,1,headers.length).getValues()[0];
   var json=JSON.stringify(values);if(json.length>48000)throw Error('Záloha zakázky je příliš velká.');plans.push({id:String(item.id),row:row,json:json});
  });
  var ss=perfectDatabaseGetSpreadsheet_(),name='__PERFECT_STATUS58_ZALOHA',backup=ss.getSheetByName(name),cols=['AT','ORDER_ID','BEFORE_ROW_JSON','NEW_STATUS'];
  if(!backup){backup=ss.insertSheet(name);backup.getRange(1,1,1,cols.length).setValues([cols]);backup.hideSheet();}
  else if(backup.getRange(1,1,1,cols.length).getValues()[0].some(function(v,i){return String(v)!==cols[i];}))throw Error('Nesouhlasí hlavička zálohy stavů.');
  var start=backup.getLastRow()+1,at=new Date().toISOString(),copies=plans.map(function(p){return [at,p.id,p.json,'ČEKÁ SE'];});
  backup.getRange(start,1,copies.length,cols.length).setNumberFormat('@').setValues(copies);SpreadsheetApp.flush();
  var verified=backup.getRange(start,1,copies.length,cols.length).getValues();if(verified.some(function(row,i){return row.some(function(v,j){return String(v)!==copies[i][j];});}))throw Error('Zálohu nebylo možné ověřit. Stavy nebyly změněny.');
  var restored=[],failed=[];
  plans.forEach(function(p){try{sheet.getRange(p.row,headers.indexOf('STAV_OBJEDNAVKY')+1).setValue('ČEKÁ SE');SpreadsheetApp.flush();if(String(sheet.getRange(p.row,headers.indexOf('STAV_OBJEDNAVKY')+1).getValue())!=='ČEKÁ SE')throw Error('Zápis nebyl potvrzen.');restored.push(p.id);}catch(e){failed.push({id:p.id,error:String(e.message||e)});}});
  return {restored:restored,failed:failed,backupSheet:name};
 });
}

/** PATCH 1.01: jediný deník je zdroj aktuálního stavu i audit; původní tabulky beze změn. */
function databaseLunch101Sheet_(create){
 var name='__PERFECT_DB_OBEDY101',heads=['EVENT_ID','REQUEST_ID','ACTOR_ID','HASH','RECORD_JSON'],ss=perfectDatabaseGetSpreadsheet_(),sh=ss.getSheetByName(name);
 if(!sh&&create){sh=ss.insertSheet(name);sh.getRange(1,1,1,heads.length).setValues([heads]);sh.setFrozenRows(1);sh.hideSheet();}
 if(sh&&sh.getRange(1,1,1,heads.length).getValues()[0].join('|')!==heads.join('|'))throw Error('Hlavička evidence obědů nesouhlasí. Nic nebylo přepsáno.');return sh;
}
function databaseLunch101Events_(){var sh=databaseLunch101Sheet_(false);return !sh||sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,5).getValues().map(function(r){return {eventId:String(r[0]),requestId:String(r[1]),actorId:String(r[2]),hash:String(r[3]),record:JSON.parse(r[4])};});}
function databaseLunch101Save_(actor,input){
 return perfectDatabaseWithLock_('PATCH 1.01 obědy',function(){
  var p=perfect101LunchInput_(input);perfect102Target_(actor,p.userId);var hash=perfect101Hash_(JSON.stringify(p)),events=databaseLunch101Events_();
  var retry=events.find(function(e){return e.requestId===p.requestId&&e.actorId===String(actor.id);});
  if(retry){if(retry.hash!==hash)throw Error('Stejný požadavek má jiný obsah. Načti přehled znovu.');return {success:true,replayed:true,record:retry.record};}
  var current={};events.forEach(function(e){current[e.record.id]=e.record;});var old=current[p.id];
  if(old&&old.version!==p.expectedVersion||!old&&p.expectedVersion!==0)throw Error('CONFLICT: Záznam se změnil. Načti jej znovu, tvé zadání nebylo uloženo.');
  if(p.cancelled&&!old)throw Error('Nelze stornovat neexistující záznam.');
  if(old&&old.userId!==p.userId)throw Error('Zaměstnance existujícího záznamu nelze změnit; použij storno a nový zápis.');
  if(!perfectRepairUsers_().some(function(u){return String(u.id)===p.userId&&!(String(actor.id)!==String(u.id)&&perfect40Super_(u));}))throw Error('Zaměstnanec není dostupný.');
  var now=new Date().toISOString(),record={id:p.id,userId:p.userId,month:p.month,period:p.period,amountCents:p.amountCents,note:p.note,cancelled:p.cancelled,version:(old?old.version:0)+1,createdAt:old?old.createdAt:now,createdBy:old?old.createdBy:String(actor.id),updatedAt:now,updatedBy:String(actor.id)};
  var sh=databaseLunch101Sheet_(true);sh.getRange(sh.getLastRow()+1,1,1,5).setNumberFormat('@').setValues([[Utilities.getUuid(),p.requestId,String(actor.id),hash,JSON.stringify(record)]]);SpreadsheetApp.flush();
  CacheService.getScriptCache().remove('PERFECT101_FINGERPRINT');return {success:true,record:record};
 });
}

/** 1.04 Balance: a price edit and its box allocation are one database operation. */
function databaseBalance104SyncPrice_(before,after){
 if(databaseMoney_(before.CENA_CELKEM||0)===databaseMoney_(after.CENA_CELKEM||0))return;
 if(perfectShared33Worker_(after.PRACOVNIK)){
  const data=perfectShared33Envelope_(after),split=data&&data.boxSplit;
  if(split&&Math.round(Number(split.box1)*100)+Math.round(Number(split.box2)*100)!==Math.round(Number(after.CENA_CELKEM)*100)){
   const old=perfectShared33Envelope_(before),source=old&&old.boxSplit||split;
   const basis=source.ratio104||{box1:Math.round(perfectAddons31Money_(source.box1,true)*100),box2:Math.round(perfectAddons31Money_(source.box2,true)*100)};
   if(!basis.box1&&!basis.box2){basis.box1=1;basis.box2=1;}
   data.boxSplit=Object.assign(perfectBalance104Split_(basis.box1,basis.box2,after.CENA_CELKEM),{ratio104:basis});after.CENOVE_POLOZKY=JSON.stringify(data);
  }
 }
 const row=perfectBoxes29Rows_('order').find(r=>String(r.ORDER_ID)===String(before.ORDER_ID));
 if(!row||row.ACTIVE!==true||row.STATION!=='SHARED')return;
 const basis=perfectBalance104Basis_(row),split=perfectBalance104Split_(basis.box1,basis.box2,after.CENA_CELKEM);
 const record=Object.assign({},row,{BOX1_PRICE49:split.box1,BOX2_PRICE49:split.box2,BOX1_WEIGHT104:basis.box1,BOX2_WEIGHT104:basis.box2});
 databaseBoxes25Commit_('order',String(before.ORDER_ID),record,row.VERSION,perfect43Actor_||{id:'SYSTEM_PRICE104'});
}

/** Complete waiting jobs assigned to the box being closed; preserve cancelled/no-show jobs. */
function databaseShift115Complete_(date,stations){
 var view=perfectBoxes49Overview_({from:date,to:date});
 var ids=new Set(view.orders.filter(function(o){return perfectBoxes25Normalize_(o.status)==='ceka se'&&o.allocations.some(function(a){return stations.indexOf(a.station)>=0&&(!o.shared||a.revenue>0);});}).map(function(o){return o.id;}));
 var sheet=databaseGetOrdersSheet_(),headers=Array.from(PERFECT_DB_ORDER_HEADERS),column=headers.indexOf('STAV_OBJEDNAVKY')+1;
 if(!column)throw Error('Chybí sloupec stavu.');
 var count=sheet.getLastRow()-2,completed=0;
 if(count>0)sheet.getRange(3,1,count,1).getValues().forEach(function(r,i){if(ids.has(String(r[0]))){sheet.getRange(i+3,column).setValue('DOKONČENO');completed++;}});
 return completed;
}
