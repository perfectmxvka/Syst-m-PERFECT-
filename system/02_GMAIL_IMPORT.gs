/** V57: zachovává původní příkazy 52 a zabezpečení modulu 40. */
function GMAIL_57_01_NAHLED(){return GMAIL_52_02_NAHLED_BEZ_ZAPISU();}
function GMAIL_57_02_SPUSTIT_OD_17_10(){return gmailEditor52_(function(){
 gmailCheckProduction52_();gmailValidateDependenciesV23_();
 // Reset kurzoru je povolen jen pod stejným zámkem jako běžící import.
 const lock=LockService.getUserLock();if(!lock.tryLock(1000))throw Error('Import právě běží. Spusť nastavení po jeho dokončení.');
 try{PropertiesService.getUserProperties().setProperty('PERFECT_GMAIL_V57_HISTORY',JSON.stringify({day:PERFECT_GMAIL_CONFIG.START_DATE,offset:0}));}
 finally{lock.releaseLock();}
 perfect40Original_gmailStartAutomaticImport_();
 const result=perfect40Original_gmailRunAutomaticImport_();Logger.log(JSON.stringify(result,null,2));return result;
});}
function GMAIL_57_03_KONTROLA_NYNI(){return GMAIL_52_05_IMPORTOVAT_NYNI();}
function GMAIL_57_04_STAV(){return GMAIL_52_04_STAV_AUTOMATIKY();}
function GMAIL_57_05_VYPNOUT(){return GMAIL_52_06_VYPNOUT_AUTOMATIKU();}

/** PERFECT V52 — ovládání z editoru je přímo v tomto souboru 02.
 * Stávající vstupy v modulu 40 zůstávají pro kompatibilitu; žádné jejich
 * definice se zde neduplikují a ochrana zbytku aplikace se nemění.
 */
function GMAIL_52_01_TEST() {
  return gmailEditor52_(function(){return perfect40Original_gmailTestPermissionsV23_();});
}
function GMAIL_52_02_NAHLED_BEZ_ZAPISU() {
  return gmailEditor52_(function(){return perfect40Original_gmailPreviewNextBatch_();});
}
function GMAIL_52_03_ZAPNOUT_AUTOMATIKU() {
  return gmailEditor52_(function(){
    gmailCheckProduction52_();
    perfect40Original_gmailStartAutomaticImport_();
    return perfect40Original_gmailAutomaticImportStatus_();
  });
}
function GMAIL_52_04_STAV_AUTOMATIKY() {
  return gmailEditor52_(function(){return perfect40Original_gmailAutomaticImportStatus_();});
}
function GMAIL_52_05_IMPORTOVAT_NYNI() {
  return gmailEditor52_(function(){gmailCheckProduction52_();return perfect40Original_gmailRunAutomaticImport_();});
}
function GMAIL_52_06_VYPNOUT_AUTOMATIKU() {
  return gmailEditor52_(function(){return perfect40Original_gmailStopAutomaticImport_();});
}
/** Privátní brána: zachová původní ověření identity, nebo vyžaduje
 * kontext editoru/tabulky. getUi není dostupné při běhu webové aplikace.
 * V případě nejistoty odmítne spuštění, nepovoluje prázdný e-mail plošně.
 */
function gmailEditor52_(operation) {
  if(typeof perfect40Trusted_!=='function'||typeof perfect40TrustedEditor_!=='function')
    throw Error('Chybí modul 40_OPRAVNENI_SUPERADMIN_AUDIT.');
  if(!perfect40TrustedEditor_()){
    try {
      if(!SpreadsheetApp.getUi())throw Error('UI není dostupné.');
    } catch(error) {
      throw Error('Spusť příkaz z editoru otevřeného přes Rozšíření → Apps Script v původní Google tabulce. Ověření kontextu spuštění nebylo potvrzené.');
    }
  }
  return perfect40Trusted_(operation);
}
function gmailKnownHandler52_(name) {
  return ['gmailRunAutomaticImport','perfect40GmailCron_','gmailCron52_'].indexOf(String(name))>=0;
}
function gmailCheckProduction52_() {
  if(perfectRepairProps_().getProperty('PERFECT41_TEST_MODE')==='ON')
    throw Error('Gmail import je v testovací kopii vypnutý. Použij ostrý projekt; tato oprava testovací režim nevypíná.');
}
/** Soukromý cíl časovače: není volatelný z google.script.run.
 * Nevyžaduje aktivního návštěvníka; používá autorizaci vlastníka spouštěče.
 */
function gmailCron52_() {
  if(perfectRepairProps_().getProperty('PERFECT41_TEST_MODE')==='ON')
    return {skipped:true,reason:'Testovací kopie nepoužívá ostrý Gmail.'};
  if(typeof perfect40Trusted_!=='function')throw Error('Chybí bezpečnostní modul 40.');
  return perfect40Trusted_(function(){return perfect40Original_gmailRunAutomaticImport_();});
}

/**
 * AUTOMYČKA PERFECT 2.0 — 02_Gmail import.gs — V24 FRONTA
 * Jeden kompletní importní modul. Neobsahuje náhodná ORDER_ID.
 * Používá pouze veřejné zápisové funkce 01_Centralni_databaze.gs.
 * Souběžné vytvoření a přidělení ORDER_ID řeší zamykání v centrální DB.
 * Nezapisuje přímo do tabulek, nemění staré ORDER_ID.
 */
const PERFECT_GMAIL_CONFIG = Object.freeze({
  START_DATE: '2026-10-17',
  BATCH_SIZE: 20,
  CANDIDATE_LIMIT: 100,
  SEARCH_PAGE_SIZE: 100,
  SEARCH_MAX_PAGES: 5,
  CHECK_INTERVAL_MINUTES: 1,
  SUBJECT: 'Máte novou rezervaci! AutomyckaPerfect.cz!',
  HANDLER_FUNCTION: 'gmailCron52_',
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
        stav:match ? 'POZASTAVENO — podobná zakázka '+String(match.ORDER_ID)+'; bez nového zápisu' : 'PŘIPRAVENO K IMPORTU'};
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
  Logger.log('Aktivní Gmail import PERFECT V57 — každou minutu; historie od 17. 10. 2026.');
  return 'Aktivováno';
}
function perfect40Original_gmailStopAutomaticImport_() {
  let removed=0;
  ScriptApp.getProjectTriggers().forEach(t=>{
    if(gmailKnownHandler52_(t.getHandlerFunction())){ScriptApp.deleteTrigger(t);removed++;}
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
    result.version='V57';result.history=gmailHistory57_();result.finishedAt=new Date().toISOString();
    gmailV24SaveLast_(result);
    Logger.log('Gmail import V24: '+JSON.stringify(result));
    return result;
  }catch(e){
    gmailV24SaveLast_({version:'V24',finishedAt:new Date().toISOString(),fatalError:String(e.message||e).slice(0,300)});
    throw e;
  }finally{lock.releaseLock();}
}

/** V57: souvislá historie od START_DATE + samostatná živá fronta a opakování chyb. */
function gmailFindUnimportedMessages_(limit,options) {
 options=options||{};
 const props=PropertiesService.getUserProperties(),now=new Date(),today=Utilities.formatDate(now,PERFECT_GMAIL_CONFIG.TIMEZONE,'yyyy-MM-dd');
 const max=Math.max(1,Math.min(Number(limit)||20,PERFECT_GMAIL_CONFIG.BATCH_SIZE)),existing=gmailGetExistingMessageIds_(),retry=gmailV24RetryState_(!options.preview),seen=Object.create(null),found=[];
 const started=Date.now(),liveBudget=Math.max(1,Math.floor(max/3)),retryBudget=Math.max(1,Math.floor(max/6));
 function add(m){
  const id=String(m.getId()),day=Utilities.formatDate(m.getDate(),PERFECT_GMAIL_CONFIG.TIMEZONE,'yyyy-MM-dd');
  if(seen[id]||existing[id]||m.getDate()>now||day<PERFECT_GMAIL_CONFIG.START_DATE||!gmailIsReservationMessage_(m))return false;
  if(!options.ignoreRetry&&retry[id]&&retry[id].until>Date.now())return false;
  seen[id]=true;found.push(m);return true;
 }
 function query(day){const stamp=new Date(day+'T00:00:00Z').getTime();return 'after:'+Utilities.formatDate(new Date(stamp-86400000),'UTC','yyyy/MM/dd')+' before:'+Utilities.formatDate(new Date(stamp+2*86400000),'UTC','yyyy/MM/dd')+' subject:"Máte novou rezervaci" -in:trash -in:spam';}
 // Čerstvé zprávy se procházejí při každém běhu, i během dohánění historie.
 const liveDays=[today,gmailNextDay57_(today,-1)];
 for(const day of liveDays){
  if(day<PERFECT_GMAIL_CONFIG.START_DATE||found.length>=liveBudget)continue;
  for(let page=0;page<PERFECT_GMAIL_CONFIG.SEARCH_MAX_PAGES&&found.length<liveBudget;page++){
   const threads=GmailApp.search(query(day),page*PERFECT_GMAIL_CONFIG.SEARCH_PAGE_SIZE,PERFECT_GMAIL_CONFIG.SEARCH_PAGE_SIZE);
   for(const thread of threads){for(const m of thread.getMessages()){if(Utilities.formatDate(m.getDate(),PERFECT_GMAIL_CONFIG.TIMEZONE,'yyyy-MM-dd')===day)add(m);if(found.length>=liveBudget)break;}if(found.length>=liveBudget)break;}
   if(threads.length<PERFECT_GMAIL_CONFIG.SEARCH_PAGE_SIZE)break;
  }
 }
 // Chybové zprávy se neztratí ani po posunu historického kurzoru.
 const retryLimit=Math.min(max,found.length+retryBudget);
 for(const id of Object.keys(retry).sort((a,b)=>retry[a].until-retry[b].until)){
  if(found.length>=retryLimit)break;
  if(existing[id]){if(!options.preview)gmailV24ClearRetry_(id);continue;}
  if(!options.ignoreRetry&&retry[id].until>Date.now())continue;
  try{const m=GmailApp.getMessageById(id);if(m)add(m);}catch(e){if(!options.preview)gmailV24Defer_(id,'MESSAGE_UNAVAILABLE',360);}
 }
 let cursor=gmailHistory57_(),pages=0;
 while(cursor.day<=today&&found.length<max&&pages<PERFECT_GMAIL_CONFIG.SEARCH_MAX_PAGES&&Date.now()-started<30000){
  const threads=GmailApp.search(query(cursor.day),cursor.offset,PERFECT_GMAIL_CONFIG.SEARCH_PAGE_SIZE);pages++;
  let pending=false,full=false;
  for(const thread of threads){
   for(const m of thread.getMessages()){
    if(Utilities.formatDate(m.getDate(),PERFECT_GMAIL_CONFIG.TIMEZONE,'yyyy-MM-dd')!==cursor.day)continue;
    const id=String(m.getId());
    if(!existing[id]&&seen[id])pending=true;
    if(add(m))pending=true;
    if(found.length>=max){full=true;break;}
   }
   if(full)break;
  }
  // Stránku s nezapsanými kandidáty zopakujeme; při pádu importu nic nepřeskočíme.
  if(pending||full)break;
  if(threads.length<PERFECT_GMAIL_CONFIG.SEARCH_PAGE_SIZE)cursor={day:gmailNextDay57_(cursor.day,1),offset:0};
  else cursor.offset+=PERFECT_GMAIL_CONFIG.SEARCH_PAGE_SIZE;
 }
 if(!options.preview)props.setProperty('PERFECT_GMAIL_V57_HISTORY',JSON.stringify(cursor));
 return found;
}
function gmailNextDay57_(day,offset){return Utilities.formatDate(new Date(new Date(day+'T00:00:00Z').getTime()+offset*86400000),'UTC','yyyy-MM-dd');}
function gmailHistory57_(){
 let value;try{value=JSON.parse(PropertiesService.getUserProperties().getProperty('PERFECT_GMAIL_V57_HISTORY')||'null');}catch(e){}
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value.day)||value.day<PERFECT_GMAIL_CONFIG.START_DATE||!Number.isInteger(value.offset)||value.offset<0)return {day:PERFECT_GMAIL_CONFIG.START_DATE,offset:0};
 return value;
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
      const p=gmailParseReservation_(message);
      const created=perfectDatabaseWithLock_('Gmail V57 kontrola a zápis',function(){
       const byId=databaseFindOrderByGmailMessageId(id);if(byId)return byId;
       const conflict=gmailFindExistingOrderWithoutMessageId_(p);
       if(conflict)return {possibleDuplicate:true,ORDER_ID:String(conflict.ORDER_ID)};
       return databaseCreateOrder({
        DATUM_OBJEDNANI:p.datumObjednavky,CAS_PRIJEZDU:p.casPrijezdu,CAS_ODJEZDU:'',
        JMENO_PRIJMENI:p.jmenoPrijmeni,TELEFON:p.telefon,EMAIL:p.email,
        VOZIDLO:gmailNormalizeVehicleName_(p.vozidlo),MYCI_PROGRAM:p.myciProgram,
        CENA_CELKEM:p.cenaCelkem,CENA_PROGRAMU:p.cenaCelkem,DARKOVY_POUKAZ:p.darkovyPoukaz,
        DOPLNKY:p.doplnky,POZNAMKY:p.poznamky,STAV_OBJEDNAVKY:PERFECT_GMAIL_CONFIG.ORDER_STATUS,
        GMAIL_MESSAGE_ID:id,PERFECT_WEB_GENERATE_ID:'ONLINE'
       });
      });
      if(created&&created.possibleDuplicate){result.existingWithoutId++;gmailV24Defer_(id,'POSSIBLE_DUPLICATE',360);problem(id,'POSSIBLE_DUPLICATE','Pozastaveno: podobná zakázka '+created.ORDER_ID);continue;}
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
  const normalizedPhone=databaseNormalizePhone_(p.telefon);
  const normalizedEmail=String(p.email||'').toLowerCase();
  const matches=(databaseGetAllOrders()||[]).filter(o=>{
    if(gmailDateString_(o.DATUM_OBJEDNANI)!==date)return false;
    if(gmailTimeString_(o.CAS_PRIJEZDU)!==p.casPrijezdu)return false;
    const phone=databaseNormalizePhone_(o.TELEFON);
    const email=String(o.EMAIL||'').toLowerCase().trim();
    if(!((normalizedPhone&&phone===normalizedPhone)||(normalizedEmail&&email===normalizedEmail)))return false;
    const vehicle=gmailNormalizeText_(gmailNormalizeVehicleName_(o.VOZIDLO||'')).replace(/[^a-z0-9]/g,'');
    const incoming=gmailNormalizeText_(gmailNormalizeVehicleName_(p.vozidlo||'')).replace(/[^a-z0-9]/g,'');
    return !!vehicle&&vehicle===incoming;
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
  const pendingService=gmailNormalizeText_(service.program)==='sluzbu si vyberu na miste';
  if(!service.program||(!pendingService&&service.price===null))throw new Error('Chybí mycí program nebo cena.');
  const min=Number(arrival.slice(0,2))*60+Number(arrival.slice(3));
  if(min<8*60||min>19*60+30)throw new Error('Čas '+arrival+' je mimo 08:00–19:30. Nutná kontrola e-mailu.');
  const notes=[];
  if(pendingService)notes.push('Služba a cena budou dohodnuty na místě. Cena zatím není určena.');
  if(service.variant)notes.push('Varianta: '+service.variant);
  if(f.message)notes.push('Zpráva zákazníka: '+gmailCleanValue_(f.message));
  if(f.voucherApplied&&!f.voucherCode)notes.push('Poukaz: '+gmailCleanValue_(f.voucherApplied));
  return {datumObjednavky:visitDate,casPrijezdu:arrival,jmenoPrijmeni:name,email,telefon:phone,
    vozidlo:vehicle,myciProgram:service.program,cenaCelkem:pendingService?'':service.price,
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
  const triggers = ScriptApp.getProjectTriggers().filter(t=>gmailKnownHandler52_(t.getHandlerFunction()));
  const status = {active:triggers.length>0, triggerCount:triggers.length, handlers:triggers.map(t=>t.getHandlerFunction()),
    intervalMinutes:PERFECT_GMAIL_CONFIG.CHECK_INTERVAL_MINUTES,
    startDate:PERFECT_GMAIL_CONFIG.START_DATE,history:gmailHistory57_()};
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
function gmailFormatPhone_(v){const p=perfectPhoneParse_(v);return p?p.formatted:'';}
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
  if(typeof perfectDatabaseWithLock_!=='function')missing.push('perfectDatabaseWithLock_');
  if(typeof databaseFindOrderByGmailMessageId!=='function')missing.push('databaseFindOrderByGmailMessageId');
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
    try{const v=JSON.parse(all[k]);if(v&&Number.isFinite(v.until))map[k.slice(prefix.length)]=v;else if(cleanup)props.deleteProperty(k);}
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
