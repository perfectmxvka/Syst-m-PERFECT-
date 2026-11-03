/** OPRAVA CHYBĚJÍCÍHO ZÁPISU DUPLICIT.
 * Přidat jako NOVÝ Skript 01b_DUPLICITY_ZAPIS.
 * Neměnit HTML a nic nespouštět z editoru. Uložit a nasadit novou verzi webu.
 * Je součástí zapisovací vrstvy 01. Pokud hlavní modul už funkci má, nic nepřepisuje.
 * Samotné vložení nic nemaže; archivace se provede až po ověřeném potvrzení v aplikaci.
 */
var databaseDuplicates38Resolve_ = typeof databaseDuplicates38Resolve_ === 'function' ? databaseDuplicates38Resolve_ : function(payload,actor){return perfectDatabaseWithLock_('databaseDuplicates38Resolve_',function(){
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
});};