/** Gmail → původní tabulka → podepsaný backend → Supabase.
 * PERFECT103_MONGO_ORIGIN je historický název HTTPS adresy backendu.
 * PERFECT103_SYNC_SECRET musí být stejný v Renderu i Script Properties (32+ znaků).
 */
function perfect103Config_(){
 var p=PropertiesService.getScriptProperties(),origin=(p.getProperty('PERFECT103_MONGO_ORIGIN')||'').replace(/\/$/,''),secret=p.getProperty('PERFECT103_SYNC_SECRET');
 if(!/^https:\/\/[^/?#]+$/.test(origin)||!secret||secret.length<32)throw Error('Doplň PERFECT103_MONGO_ORIGIN a PERFECT103_SYNC_SECRET (32+ znaků).');
 return {props:p,origin:origin,secret:secret};
}
function perfect103Send_(batch){
 var c=perfect103Config_(),timestamp=Date.now(),nonce=Utilities.getUuid(),payload=JSON.stringify({orders:batch});
 var signature=Utilities.computeHmacSha256Signature(timestamp+'.'+nonce+'.'+payload,c.secret).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
 var response=UrlFetchApp.fetch(c.origin+'/ingest/reservations',{method:'post',contentType:'application/json',payload:JSON.stringify({timestamp:timestamp,nonce:nonce,payload:payload,signature:signature}),muteHttpExceptions:true,followRedirects:false});
 if(response.getResponseCode()!==200)throw Error('Backend nepotvrdil přenos (HTTP '+response.getResponseCode()+'). Nepotvrzené objednávky se zopakují.');
 var result=JSON.parse(response.getContentText());
 if(!result.success||!Array.isArray(result.accepted)||!Array.isArray(result.skipped))throw Error('Neplatné potvrzení backendu.');
 var ids=result.accepted.concat(result.skipped);
 if(batch.some(function(o){return ids.indexOf(String(o.ORDER_ID))<0;}))throw Error('Backend nepotvrdil všechny objednávky. Dávka se zopakuje.');
 return result;
}
function perfect103ForwardReservations(){
 if(!perfect40TrustedEditor_())throw Error('Spusť z editoru jako vlastník.');
 return perfect103ForwardCron_();
}
// Soukromý handler: nedostupný přes google.script.run, běží jako vlastník časovače.
function perfect103ForwardCron_(){
 gmailCheckProduction52_();
 var lock=LockService.getScriptLock();if(!lock.tryLock(1000))return {busy:true};
 try{
  var c=perfect103Config_(),start=gmailStartDate103_();
  var rows=perfect40Trusted_(function(){return databaseGetAllOrders();}).filter(function(o){return o.GMAIL_MESSAGE_ID&&/^N\d{4}-\d+$/.test(String(o.ORDER_ID));}).reverse();
  // Potvrzení platí jen pro tento backend a tuto hranici historie.
  var scope=Utilities.computeHmacSha256Signature(c.origin+'|'+start,c.secret).slice(0,8).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
  var ss=SpreadsheetApp.openById(c.props.getProperty('PERFECT_REPAIR_SPREADSHEET_ID')),name='__PERFECT103_ACK_'+scope,sh=ss.getSheetByName(name);
  if(!sh){sh=ss.insertSheet(name);sh.appendRow(['GMAIL_MESSAGE_ID','AT','RESULT']);}
  var sent=Object.create(null);if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,1).getValues().forEach(function(r){sent[String(r[0])]=true;});
  var batch=[],excluded=[],errors=0,examined=0,started=Date.now();
  for(var i=0;i<rows.length&&examined<100&&batch.length<25&&Date.now()-started<120000;i++){
   var o=rows[i],id=String(o.GMAIL_MESSAGE_ID);if(sent[id])continue;examined++;
   try{
    var message=GmailApp.getMessageById(id);if(!message)throw Error('Zpráva není dostupná.');
    var day=Utilities.formatDate(message.getDate(),'Europe/Prague','yyyy-MM-dd');
    if(day<start){excluded.push([id,new Date().toISOString(),'BEFORE_START']);sent[id]=true;continue;}
    batch.push(perfectRepairSerializable_(o));sent[id]=true;
   }catch(e){errors++;Logger.log('Nelze ověřit datum zprávy '+id+'; zůstává k opakování.');}
  }
  // Potvrzení zapisujeme až po úspěšném přenosu celé dávky.
  var result=batch.length?perfect103Send_(batch):{success:true,accepted:[],skipped:[]};
  var ack=excluded.concat(batch.map(function(o){return [String(o.GMAIL_MESSAGE_ID),new Date().toISOString(),'CONFIRMED'];}));
  if(ack.length)sh.getRange(sh.getLastRow()+1,1,ack.length,3).setValues(ack);
  var status={at:new Date().toISOString(),accepted:result.accepted.length,alreadyPresent:result.skipped.length,errors:errors,remaining:rows.filter(function(o){return !sent[String(o.GMAIL_MESSAGE_ID)];}).length};
  c.props.setProperty('PERFECT103_FORWARD_LAST',JSON.stringify(status));Logger.log(JSON.stringify(status));return status;
 }finally{lock.releaseLock();}
}
function perfect103InstallForwarder(){
 if(!perfect40TrustedEditor_())throw Error('Spusť z editoru jako vlastník.');
 perfect103Send_([]); // Ověří skutečné spojení, podpis i backend před instalací.
 ScriptApp.getProjectTriggers().forEach(function(t){if(['perfect103ForwardReservations','perfect103ForwardCron_'].indexOf(t.getHandlerFunction())>=0)ScriptApp.deleteTrigger(t);});
 ScriptApp.newTrigger('perfect103ForwardCron_').timeBased().everyMinutes(5).create();
}
/** Jednorázově spustit v původním projektu pod účtem s rezervacemi v Gmailu. */
function GMAIL_SUPABASE_START_25_10(){
 return gmailEditor52_(function(){
  gmailCheckProduction52_();gmailValidateDependenciesV23_();perfect103Send_([]);
  var lock=LockService.getUserLock();if(!lock.tryLock(1000))throw Error('Import běží; nastavení spusť po jeho dokončení.');
  try{
   PropertiesService.getScriptProperties().setProperty('PERFECT103_GMAIL_START_DATE','2026-10-25');
   PropertiesService.getUserProperties().setProperty('PERFECT_GMAIL_V57_HISTORY',JSON.stringify({day:'2026-10-25',offset:0}));
  }finally{lock.releaseLock();}
  perfect40Original_gmailStartAutomaticImport_();perfect103InstallForwarder();
  var imported=perfect40Original_gmailRunAutomaticImport_(),forwarded=perfect103ForwardCron_();
  Logger.log('Gmail každou minutu; předávání do Supabase každých 5 minut. Historie pokračuje po dávkách.');
  return {imported:imported,forwarded:forwarded};
 });
}
function GMAIL_SUPABASE_STAV(){
 return gmailEditor52_(function(){
  var result={gmail:perfect40Original_gmailAutomaticImportStatus_(),forward:PropertiesService.getScriptProperties().getProperty('PERFECT103_FORWARD_LAST'),triggers:ScriptApp.getProjectTriggers().map(function(t){return t.getHandlerFunction();})};
  Logger.log(JSON.stringify(result,null,2));return result;
 });
}
