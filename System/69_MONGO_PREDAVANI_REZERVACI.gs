/** VOLITELNÉ: samostatné předávání NOVÝCH online rezervací do MongoDB.
 * Původní Gmail import ani jeho spouštěče nemění. Instalovat až po přechodu.
 * Vlastnosti: PERFECT103_MONGO_ORIGIN=https://... ; PERFECT103_SYNC_SECRET=32+ náhodných znaků.
 */
function perfect103ForwardReservations(){
 if(!perfect40TrustedEditor_())throw Error('Spustit může pouze vlastník projektu nebo jeho spouštěč.');
 var props=PropertiesService.getScriptProperties(),origin=props.getProperty('PERFECT103_MONGO_ORIGIN'),secret=props.getProperty('PERFECT103_SYNC_SECRET');
 if(!/^https:\/\/[^/?#]+$/.test(origin||'')||!secret||secret.length<32)throw Error('Doplň HTTPS adresu a tajný klíč předávání.');
 var rows=perfect40Trusted_(function(){return databaseGetAllOrders();}).filter(function(o){return o.GMAIL_MESSAGE_ID&&/^N\d{4}-\d+$/.test(String(o.ORDER_ID));});
 var ss=SpreadsheetApp.openById(props.getProperty('PERFECT_REPAIR_SPREADSHEET_ID')),sh=ss.getSheetByName('__PERFECT103_FORWARD_ACK');if(!sh){sh=ss.insertSheet('__PERFECT103_FORWARD_ACK');sh.appendRow(['GMAIL_MESSAGE_ID','AT']);}
 var sent={};if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,1).getValues().forEach(function(r){sent[String(r[0])]=true;});
 var batch=rows.filter(function(o){return !sent[String(o.GMAIL_MESSAGE_ID)];}).reverse().slice(0,25).map(function(o){return perfectRepairSerializable_(o);});if(!batch.length)return;
 var timestamp=Date.now(),nonce=Utilities.getUuid(),payload=JSON.stringify({orders:batch}),signature=Utilities.computeHmacSha256Signature(timestamp+'.'+nonce+'.'+payload,secret).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
 var response=UrlFetchApp.fetch(origin+'/ingest/reservations',{method:'post',contentType:'application/json',payload:JSON.stringify({timestamp:timestamp,nonce:nonce,payload:payload,signature:signature}),muteHttpExceptions:true});
 if(response.getResponseCode()!==200)throw Error('Předání nebylo potvrzeno (HTTP '+response.getResponseCode()+'). Kurzor se nezměnil.');
 var result=JSON.parse(response.getContentText());if(!result.success)throw Error('Cíl nepotvrdil dávku.');
 batch.forEach(function(o){sh.appendRow([String(o.GMAIL_MESSAGE_ID),new Date().toISOString()]);});Logger.log('Nové rezervace předány: '+result.accepted.length+', dříve přenesené: '+result.skipped.length+'.');
}
function perfect103InstallForwarder(){
 if(!perfect40TrustedEditor_())throw Error('Spusť z editoru jako vlastník.');
 var exists=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='perfect103ForwardReservations';});
 if(!exists)ScriptApp.newTrigger('perfect103ForwardReservations').timeBased().everyMinutes(5).create();
 Logger.log('Samostatné předávání připraveno. Existující Gmail spouštěče beze změn.');
}
