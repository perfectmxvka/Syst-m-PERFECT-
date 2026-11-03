/**
 * PERFECT V50 – kompatibilita mezi starším 01 a zabezpečením V40.
 * Tato vrstva nic sama nenačítá ani nezapisuje. Původní metody V42 použije
 * POUZE pokud chybějí, aby wrapper V40 nepřeskakoval kontrolu oprávnění.
 *
 * ZDROJ: uživatelem poskytnutá 01_CENTRALNI_DATABAZE_V42_CELA.gs.
 *
 * Nahraď STÁVAJÍCÍ obsah 41_PERFECT_V50_OPRAVA_ZAKAZNICI; nepřidávej
 * jako druhý soubor se stejnými funkcemi. Bez změny doGet / hesel / schématu.
 * Pokud má projekt už kompletní V42, tento soubor není potřeba.
 */


function perfectV50Compat_databaseInitialize_(){
 const ss=perfectDatabaseGetSpreadsheet_();
 [[PERFECT_DB.SHEETS.CUSTOMERS,PERFECT_DB_CUSTOMER_HEADERS],[PERFECT_DB.SHEETS.VEHICLES,PERFECT_DB_VEHICLE_HEADERS],[PERFECT_DB.SHEETS.ORDERS,PERFECT_DB_ORDER_HEADERS]].forEach(([name,h])=>databaseEnsureSheet_(ss,name,h));return true;
}

function perfectV50Compat_databaseGetAllCustomers_(){return databaseRows_(databaseGetCustomersSheet_(),2,PERFECT_DB_CUSTOMER_HEADERS);}

function perfectV50Compat_databaseGetAllVehicles_(){return databaseRows_(databaseGetVehiclesSheet_(),2,PERFECT_DB_VEHICLE_HEADERS);}

function perfectV50Compat_databaseGetAllOrders_(){const metadata=databaseOrderMeta26Map_();return databaseRows_(databaseGetOrdersSheet_(),3,PERFECT_DB_ORDER_HEADERS).map(o=>{
 if(o.STAV_OBJEDNAVKY)try{o.STAV_OBJEDNAVKY=databaseStatus_(o.STAV_OBJEDNAVKY);}catch(e){}
 if(o.DATUM_OBJEDNANI)try{o.DATUM_OBJEDNANI=databaseDate_(o.DATUM_OBJEDNANI);}catch(e){}
 if(o.CENA_CELKEM!==''&&o.CENA_CELKEM!=null)try{o.CENA_CELKEM=databaseMoney_(o.CENA_CELKEM);}catch(e){}
 o.CREATED_AT=metadata[String(o.ORDER_ID)]?.CREATED_AT||'';
 ['CAS_PRIJEZDU','CAS_ODJEZDU'].forEach(k=>{if(o[k])try{o[k]=databaseTime_(o[k]);}catch(e){}});return o;
});}

function perfectV50Compat_databaseFindCustomerById_(id){return databaseGetAllCustomers().find(x=>String(x.CUSTOMER_ID)===String(id))||null;}

function perfectV50Compat_databaseFindCustomerByPhone_(p){const n=databaseNormalizePhone_(p);if(!n)return null;return databaseGetAllCustomers().find(x=>databaseNormalizePhone_(x.TELEFON)===n)||null;}

function perfectV50Compat_databaseFindCustomerByEmail_(e){const n=databaseNormalizeEmail_(e);if(!n)return null;return databaseGetAllCustomers().find(x=>databaseNormalizeEmail_(x.EMAIL)===n)||null;}

function perfectV50Compat_databaseFindOrderById_(id){return databaseGetAllOrders().find(x=>String(x.ORDER_ID)===String(id))||null;}

function perfectV50Compat_databaseFindOrderByGmailMessageId_(id){if(!id)return null;return databaseGetAllOrders().find(x=>String(x.GMAIL_MESSAGE_ID)===String(id))||null;}

function perfectV50Compat_databaseGetOrdersByCustomerId_(id){return databaseGetAllOrders().filter(x=>String(x.CUSTOMER_ID)===String(id));}

function perfectV50Compat_databaseGetVehiclesByCustomerId_(id){return databaseGetAllVehicles().filter(x=>String(x.CUSTOMER_ID)===String(id));}

function perfectV50Compat_databaseCreateCustomer_(data){return perfectDatabaseWithLock_('databaseCreateCustomer',()=>{
 const o=databaseNormalizeOrderInput_(data),phone=databaseFormatPhone_(o.TELEFON),email=databaseNormalizeEmail_(o.EMAIL);
 const byPhone=databaseFindCustomerByPhone(phone),byEmail=databaseFindCustomerByEmail(email);
 if(byPhone&&byEmail&&byPhone.CUSTOMER_ID!==byEmail.CUSTOMER_ID)throw new Error('Telefon a e-mail patří dvěma různým zákazníkům. Je nutná kontrola kontaktů.');
 const existing=byPhone||byEmail;if(existing)return existing;
 const name=databaseSafeText_(o.JMENO_PRIJMENI||o.FIRMA||(phone?'Zákazník '+phone:''));if(!name)throw new Error('Chybí identifikace zákazníka.');
 const now=new Date(),row=[databaseGenerateCustomerId_(),name,email,phone,now,now];
 const sh=databaseGetCustomersSheet_();sh.getRange(sh.getLastRow()+1,4).setNumberFormat('@');sh.appendRow(row);return databaseCustomerRowToObject_(row);
});}

function perfectV50Compat_databaseUpdateCustomer_(id,data){return perfectDatabaseWithLock_('databaseUpdateCustomer',()=>{
 const o=databaseNormalizeOrderInput_(data),sh=databaseGetCustomersSheet_(),r=databaseFindRowById_(sh,id,1);if(!r)throw new Error('Zákazník nebyl nalezen.');
 const row=sh.getRange(r,1,1,6).getValues()[0];['JMENO_PRIJMENI','EMAIL','TELEFON'].forEach((k,i)=>{if(o[k]!==undefined)row[i+1]=k==='TELEFON'?databaseFormatPhone_(o[k]):databaseSafeText_(o[k]);});row[5]=new Date();sh.getRange(r,1,1,6).setValues([row]);return databaseCustomerRowToObject_(row);
});}

function perfectV50Compat_databaseCreateVehicle_(data){return perfectDatabaseWithLock_('databaseCreateVehicle',()=>{
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

function perfectV50Compat_databaseCreateOrder_(data){return perfectDatabaseWithLock_('databaseCreateOrder',()=>{
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

function perfectV50Compat_databaseUpdateOrder_(id,data){return perfectDatabaseWithLock_('databaseUpdateOrder',()=>{
 const sh=databaseGetOrdersSheet_(),r=databaseFindRowById_(sh,id,1);if(!r)throw new Error('Objednávka nebyla nalezena.');
 const current=databaseOrderRowToObject_(sh.getRange(r,1,1,PERFECT_DB_ORDER_HEADERS.length).getValues()[0]);
 const changes=databaseNormalizeOrderInput_(data);delete changes.ORDER_ID;delete changes.GMAIL_MESSAGE_ID;delete changes.WEB_REQUEST_ID;
 let o=databaseValidatedOrder_({...current,...changes});o=databaseLinkOrder_(o,String(id));
 const row=PERFECT_DB_ORDER_HEADERS.map(h=>o[h]??'');sh.getRange(r,9).setNumberFormat('@');sh.getRange(r,1,1,row.length).setValues([row]);databaseStyleOrderId_(sh,r,o.ORDER_ID);if(Object.prototype.hasOwnProperty.call(changes,'STAV_OBJEDNAVKY'))databaseOrderMeta26Save_(o.ORDER_ID,'',new Date().toISOString());return databaseOrderRowToObject_(row);
});}

function perfectV50Compat_databaseUpdateVehicle_(id,data){
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


/* Jen chybějící původní metody V40, bez přepisování existujících. */

if (typeof perfect40Original_databaseInitialize_ !== "function") globalThis.perfect40Original_databaseInitialize_ = perfectV50Compat_databaseInitialize_;

if (typeof perfect40Original_databaseGetAllCustomers_ !== "function") globalThis.perfect40Original_databaseGetAllCustomers_ = perfectV50Compat_databaseGetAllCustomers_;

if (typeof perfect40Original_databaseGetAllVehicles_ !== "function") globalThis.perfect40Original_databaseGetAllVehicles_ = perfectV50Compat_databaseGetAllVehicles_;

if (typeof perfect40Original_databaseGetAllOrders_ !== "function") globalThis.perfect40Original_databaseGetAllOrders_ = perfectV50Compat_databaseGetAllOrders_;

if (typeof perfect40Original_databaseFindCustomerById_ !== "function") globalThis.perfect40Original_databaseFindCustomerById_ = perfectV50Compat_databaseFindCustomerById_;

if (typeof perfect40Original_databaseFindCustomerByPhone_ !== "function") globalThis.perfect40Original_databaseFindCustomerByPhone_ = perfectV50Compat_databaseFindCustomerByPhone_;

if (typeof perfect40Original_databaseFindCustomerByEmail_ !== "function") globalThis.perfect40Original_databaseFindCustomerByEmail_ = perfectV50Compat_databaseFindCustomerByEmail_;

if (typeof perfect40Original_databaseFindOrderById_ !== "function") globalThis.perfect40Original_databaseFindOrderById_ = perfectV50Compat_databaseFindOrderById_;

if (typeof perfect40Original_databaseFindOrderByGmailMessageId_ !== "function") globalThis.perfect40Original_databaseFindOrderByGmailMessageId_ = perfectV50Compat_databaseFindOrderByGmailMessageId_;

if (typeof perfect40Original_databaseGetOrdersByCustomerId_ !== "function") globalThis.perfect40Original_databaseGetOrdersByCustomerId_ = perfectV50Compat_databaseGetOrdersByCustomerId_;

if (typeof perfect40Original_databaseGetVehiclesByCustomerId_ !== "function") globalThis.perfect40Original_databaseGetVehiclesByCustomerId_ = perfectV50Compat_databaseGetVehiclesByCustomerId_;

if (typeof perfect40Original_databaseCreateCustomer_ !== "function") globalThis.perfect40Original_databaseCreateCustomer_ = perfectV50Compat_databaseCreateCustomer_;

if (typeof perfect40Original_databaseUpdateCustomer_ !== "function") globalThis.perfect40Original_databaseUpdateCustomer_ = perfectV50Compat_databaseUpdateCustomer_;

if (typeof perfect40Original_databaseCreateVehicle_ !== "function") globalThis.perfect40Original_databaseCreateVehicle_ = perfectV50Compat_databaseCreateVehicle_;

if (typeof perfect40Original_databaseCreateOrder_ !== "function") globalThis.perfect40Original_databaseCreateOrder_ = perfectV50Compat_databaseCreateOrder_;

if (typeof perfect40Original_databaseUpdateOrder_ !== "function") globalThis.perfect40Original_databaseUpdateOrder_ = perfectV50Compat_databaseUpdateOrder_;

if (typeof perfect40Original_databaseUpdateVehicle_ !== "function") globalThis.perfect40Original_databaseUpdateVehicle_ = perfectV50Compat_databaseUpdateVehicle_;


/** Spustitelná diagnostika BEZ čtení obsahu zakázek a BEZ zápisu do DB. */
function perfectV50KontrolaDatabazovychVazeb() {
  var names = ['databaseRows_','databaseGetCustomersSheet_','databaseGetVehiclesSheet_',
    'databaseGetOrdersSheet_','perfect40Enter_','perfectDatabaseWithLock_'];

  names = names.concat(["perfect40Original_databaseInitialize_", "perfect40Original_databaseGetAllCustomers_", "perfect40Original_databaseGetAllVehicles_", "perfect40Original_databaseGetAllOrders_", "perfect40Original_databaseFindCustomerById_", "perfect40Original_databaseFindCustomerByPhone_", "perfect40Original_databaseFindCustomerByEmail_", "perfect40Original_databaseFindOrderById_", "perfect40Original_databaseFindOrderByGmailMessageId_", "perfect40Original_databaseGetOrdersByCustomerId_", "perfect40Original_databaseGetVehiclesByCustomerId_", "perfect40Original_databaseCreateCustomer_", "perfect40Original_databaseUpdateCustomer_", "perfect40Original_databaseCreateVehicle_", "perfect40Original_databaseCreateOrder_", "perfect40Original_databaseUpdateOrder_", "perfect40Original_databaseUpdateVehicle_"]);

  var result = {};
  names.forEach(function(n){ result[n] = typeof globalThis[n] === 'function'; });
  result['PERFECT_DB_CUSTOMER_HEADERS'] = typeof PERFECT_DB_CUSTOMER_HEADERS !== 'undefined';
  result['PERFECT_DB_VEHICLE_HEADERS'] = typeof PERFECT_DB_VEHICLE_HEADERS !== 'undefined';
  result['PERFECT_DB_ORDER_HEADERS'] = typeof PERFECT_DB_ORDER_HEADERS !== 'undefined';
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}