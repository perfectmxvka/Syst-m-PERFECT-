/** PERFECT V14: replace the whole old Webbecked.gs, do not append. */



const PERFECT_REPAIR = Object.freeze({



  VERSION: 'V14-SECURE', BUILD: 'PERFECT-ORDERS-2026-10-13-1',



  DB: 'PERFECT_REPAIR_SPREADSHEET_ID', USERS: 'PERFECT_REPAIR_USERS',



  SETUP: 'PERFECT_REPAIR_SETUP', SERVICES: 'Ceník'



});







function perfect40Original_doGet_() {
  const request=arguments[0];
  if(request&&request.parameter&&request.parameter.perfectCheck==='60'){
    const result=PERFECT_60_KONTROLA();
    const body=JSON.stringify(result,null,2).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return HtmlService.createHtmlOutput('<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PERFECT — kontrola sestavení</title></head><body style="background:#15161b;color:#eee;font:16px system-ui;padding:20px"><h1>Kontrola sestavení 60</h1><p>'+ (result.success?'Sestavení je propojeno.':'Kontrola našla problém. Zkopíruj výsledek níže.')+'</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+body+'</pre></body></html>');
  }

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



      try { const s=JSON.parse(all[k]); if(!Number.isFinite(s.expires) || s.expires<=Date.now()) p.deleteProperty(k); } catch(e){p.deleteProperty(k);}



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
  if(key==='SPZ')return perfect103PlateDisplay_(value);



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



  return {success:true,customers,vehicles,orders,summary:{todayRevenue:perfect40Can_(viewer,'finance.read')?todayRevenue:null,latestOrders,centralCustomers:customers.length,centralVehicles:vehicles.length,centralOrders:orders.length,historicalCustomersAddedToView:0,historicalVehiclesAddedToView:0}};



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



  const u=perfectRepairRequireUser_(token); perfect43Require_(token,'services.edit');



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



  if(o.TELEFON!==undefined){const phone=perfectPhoneParse_(o.TELEFON);if(!phone)throw new Error('Zadej české číslo s 9 číslicemi nebo mezinárodní číslo s předvolbou + / 00.');o.TELEFON=phone.formatted;}



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



  if(typeof perfect43Actor_!=='undefined'&&perfect43Actor_&&String(perfect43Actor_.id)===String(u.id)&&perfect40Depth_>0)return u;
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
    // Keep this device signed in; revoke other devices after a password change.
    var sessionProps=perfectRepairProps_(),sessionValues=sessionProps.getProperties(),keepSession='PERFECT_REPAIR_SESSION_'+perfectRepairDigest_(String(token));
    Object.keys(sessionValues).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0&&k!==keepSession;}).forEach(function(k){try{var session=JSON.parse(sessionValues[k]);if(String(session.userId)===String(user.id))sessionProps.deleteProperty(k);}catch(e){sessionProps.deleteProperty(k);}});




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

      const bytes = Utilities.base64Decode('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');

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
  if(phone && !perfectPhoneParse_(phone))throw new Error('Zadej české číslo s 9 číslicemi nebo mezinárodní číslo s předvolbou + / 00.');
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

/** V60: čtecí kontrola sestavení. Bez změn databáze, účtů, směn a spouštěčů. */
function PERFECT_60_KONTROLA(){
 const expected='PERFECT-INTEGRACE-60-20261020';
 const checks={
  statistics:typeof perfectProfile54GetStatistics==='function',
  roster:typeof perfectProfile54GetRoster==='function',
  duplicates:typeof perfectDuplicates56RemoveSelected==='function',
  duplicateWriter:typeof databaseDuplicates56RemoveSelected_==='function',
  gmail:typeof GMAIL_57_04_STAV==='function',
  statusProtection:typeof databaseStatus58Clock_==='function',
  boxes:typeof perfectBoxes49Overview_==='function',
  statisticsUsesBoxes:typeof perfect40Original_perfectStaffGetMyStatistics_==='function'&&perfect40Original_perfectStaffGetMyStatistics_.toString().indexOf('ownShifts')>=0,
  gmailAllowsSelectionOnSite:typeof gmailV24ParseBody_==='function'&&gmailV24ParseBody_.toString().indexOf('pendingService')>=0,
  databaseAllowsPendingPrice:typeof databaseValidatedOrder_==='function'&&databaseValidatedOrder_.toString().indexOf('pendingPrice')>=0,
  timingWriterProtected:typeof databaseTiming31Apply_==='function'&&databaseTiming31Apply_.toString().indexOf('databaseStatus58Clock_')>=0,
  legacyStatusWriterProtected:typeof databaseAutoStatus26Apply_==='function'&&databaseAutoStatus26Apply_.toString().indexOf('databaseStatus58Clock_')>=0,
  webEntryUsesTemplate:typeof perfect40Original_doGet_==='function'&&perfect40Original_doGet_.toString().indexOf('createTemplateFromFile')>=0,
  dispatcherUsesKnownEntry:typeof doGet==='function'&&doGet.toString().indexOf('perfect40Original_doGet_')>=0
 };
 let rendered='',error='';
 try{rendered=HtmlService.createTemplateFromFile('Index').evaluate().getContent();}catch(e){error=String(e.message||e);}
 const result={build:expected,modules:checks,htmlBuildMatches:rendered.indexOf(expected)>=0,
  rawTemplateCommands:/(?:<|&lt;)\?!=\s*HtmlService\./.test(rendered),renderError:error};
 result.success=Object.keys(checks).every(k=>checks[k])&&result.htmlBuildMatches&&!result.rawTemplateCommands&&!error;
 Logger.log(JSON.stringify(result,null,2));return result;
}
