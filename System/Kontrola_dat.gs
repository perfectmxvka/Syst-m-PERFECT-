/** Run only from the Apps Script editor. All entry points end in _. */
function perfectDataAudit_(){
 const ss=perfectDatabaseGetSpreadsheet_(),sh=databaseGetOrdersSheet_(),orders=databaseGetAllOrders();
 const customers=new Set(databaseGetAllCustomers().map(x=>String(x.CUSTOMER_ID))),vehicles=new Map(databaseGetAllVehicles().map(x=>[String(x.VEHICLE_ID),String(x.CUSTOMER_ID)]));
 const counts={},dates={},gmail={},rows=[];
 orders.forEach(o=>{if(o.ORDER_ID)counts[o.ORDER_ID]=(counts[o.ORDER_ID]||0)+1;if(o.GMAIL_MESSAGE_ID)gmail[o.GMAIL_MESSAGE_ID]=(gmail[o.GMAIL_MESSAGE_ID]||0)+1;});
 // Read physical rows so the report points to the actual database row.
 if(sh.getLastRow()>=3)sh.getRange(3,1,sh.getLastRow()-2,PERFECT_DB_ORDER_HEADERS.length).getValues().forEach((r,i)=>{
  if(!r.some(v=>v!==''&&v!==null))return;const o=databaseOrderRowToObject_(r),issues=[];
  let date='';try{date=Utilities.formatDate(databaseDate_(o.DATUM_OBJEDNANI),Session.getScriptTimeZone(),'yyyy-MM-dd');}catch(e){issues.push('Neplatné/chybějící datum');}
  dates[date||'NEPLATNÉ']=(dates[date||'NEPLATNÉ']||0)+1;
  const empty=!o.JMENO_PRIJMENI&&!o.TELEFON&&!o.EMAIL&&!o.VOZIDLO&&!o.MYCI_PROGRAM&&!o.GMAIL_MESSAGE_ID;
  if(empty)issues.push('PRÁZDNÝ OBSAH — kandidát ke kontrole');
  if(!o.CUSTOMER_ID||!customers.has(String(o.CUSTOMER_ID)))issues.push('Chybí platný CUSTOMER_ID');
  if(!o.VEHICLE_ID||vehicles.get(String(o.VEHICLE_ID))!==String(o.CUSTOMER_ID))issues.push('Chybí platný VEHICLE_ID nebo patří jinému zákazníkovi');
  if(!o.VOZIDLO)issues.push('Chybí vozidlo');if(!o.MYCI_PROGRAM)issues.push('Chybí program');
  try{databaseMoney_(o.CENA_CELKEM);}catch(e){issues.push('Chybí/nesprávná cena');}
  if(counts[o.ORDER_ID]>1)issues.push('Duplicitní ORDER_ID');if(o.GMAIL_MESSAGE_ID&&gmail[o.GMAIL_MESSAGE_ID]>1)issues.push('Opakované Gmail ID');
  rows.push([i+3,String(o.ORDER_ID||''),date,String(o.CAS_PRIJEZDU||''),String(o.CUSTOMER_ID||''),String(o.VEHICLE_ID||''),o.GMAIL_MESSAGE_ID?'ANO':'NE',empty?'ANO':'NE',issues.join('; ')||'OK']);
 });
 const name='__PERFECT_KONTROLA_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');let report=ss.getSheetByName(name);if(report)throw new Error('Počkej sekundu a spusť kontrolu znovu.');report=ss.insertSheet(name);
 const header=['Řádek v databázi','ORDER_ID','Datum návštěvy','Čas příjezdu','CUSTOMER_ID','VEHICLE_ID','Má Gmail ID','Prázdný obsah','Zjištění'];
 report.getRange(1,1,1,header.length).setValues([header]);if(rows.length)report.getRange(2,1,rows.length,header.length).setValues(rows);report.setFrozenRows(1);
 const summary={total:rows.length,empty:rows.filter(r=>r[7]==='ANO').length,withIssues:rows.filter(r=>r[8]!=='OK').length,dates,report:name};Logger.log(JSON.stringify(summary,null,2));return summary;
}
function perfectPauseImportForRepair_(){
 if(typeof gmailStopAutomaticImport!=='function')throw new Error('Chybí funkce gmailStopAutomaticImport.');
 gmailStopAutomaticImport();Logger.log('Automatický import pozastaven pro kontrolu. Objednávky nebyly změněny.');
}
// Preview only: no changes to customer/order/vehicle records. Missing Gmail IDs are never guessed.
function perfectPreviewDateRecovery_(){
 const rows=databaseGetAllOrders(),result={total:rows.length,withoutGmailId:0,recoverable:[],unavailable:[],limited:false};let attempted=0;
 rows.forEach(o=>{
  if(!o.GMAIL_MESSAGE_ID){result.withoutGmailId++;return;}
  if(attempted>=100){result.limited=true;return;}attempted++;
  try{
   const message=GmailApp.getMessageById(String(o.GMAIL_MESSAGE_ID));const parsed=gmailParseReservation_(message);
   if(!parsed||!parsed.datumObjednavky)throw new Error('Rezervaci nelze načíst.');
   const expected=Utilities.formatDate(databaseDate_(parsed.datumObjednavky),Session.getScriptTimeZone(),'yyyy-MM-dd');
   const current=perfectRepairSerializable_(o.DATUM_OBJEDNANI,'DATUM_OBJEDNANI');
   if(expected!==current)result.recoverable.push({ORDER_ID:o.ORDER_ID,current,expected});
  }catch(e){result.unavailable.push({ORDER_ID:o.ORDER_ID,reason:String(e.message||e)});}
 });Logger.log(JSON.stringify(result,null,2));return result;
}
function perfectHistoryPriceKey_(name){return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
function perfectHistoryPricePlan_(o,services){
 if(o.CENA_CELKEM!==''&&o.CENA_CELKEM!==null&&o.CENA_CELKEM!==undefined)return {reason:'Původní cena zachována'};
 if(!o.MYCI_PROGRAM)return {reason:'Chybí program — cenu nelze určit'};
 if(o.DOPLNKY||o.DARKOVY_POUKAZ||o.ZNECISTENI_20)return {reason:'Doplňky/poukaz/příplatek vyžadují kontrolu'};
 const matches=services.filter(s=>s.TYP==='PROGRAM'&&perfectHistoryPriceKey_(s.NAZEV)===perfectHistoryPriceKey_(o.MYCI_PROGRAM));
 if(matches.length!==1)return {reason:matches.length?'Více shod v ceníku':'Program není v ceníku'};
 return {price:matches[0].CENA,reason:'DOPLNIT ZE SOUČASNÉHO CENÍKU'};
}
function perfectPreviewHistoryPrices_(){
 const services=perfectRepairServices_(),sh=databaseGetOrdersSheet_(),ss=perfectDatabaseGetSpreadsheet_(),rows=[];
 if(sh.getLastRow()>=3)sh.getRange(3,1,sh.getLastRow()-2,PERFECT_DB_ORDER_HEADERS.length).getValues().forEach((r,i)=>{
  const o=databaseOrderRowToObject_(r);if(!o.ORDER_ID)return;const plan=perfectHistoryPricePlan_(o,services);
  rows.push([i+3,String(o.ORDER_ID),String(o.MYCI_PROGRAM||''),o.CENA_CELKEM,plan.price??'',plan.reason,perfectRepairDigest_(JSON.stringify(r))]);
 });
 const name='__PERFECT_CENY_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
 if(ss.getSheetByName(name))throw new Error('Počkej sekundu a spusť náhled znovu.');const report=ss.insertSheet(name);
 report.getRange(1,1,1,7).setValues([['Řádek','ORDER_ID','Program','Původní cena','Návrh ceny','Důvod','Kontrolní otisk']]);if(rows.length)report.getRange(2,1,rows.length,7).setValues(rows);report.setFrozenRows(1);
 PropertiesService.getScriptProperties().setProperty('PERFECT_HISTORY_PRICE_REPORT',name);
 Logger.log('Náhled: '+name+'. Možných doplnění: '+rows.filter(r=>r[5]==='DOPLNIT ZE SOUČASNÉHO CENÍKU').length+'. Provozní data se nezměnila.');return name;
}
// Apply only proposals from the latest preview; copy the original sheet first.
function perfectApplyHistoryPrices_(){return perfectDatabaseWithLock_('perfectApplyHistoryPrices_',()=>{
 const ss=perfectDatabaseGetSpreadsheet_(),p=PropertiesService.getScriptProperties(),name=p.getProperty('PERFECT_HISTORY_PRICE_REPORT'),report=name&&ss.getSheetByName(name);
 if(!report)throw new Error('Nejdříve spusť perfectPreviewHistoryPrices_ a prohlédni náhled.');
 const proposals=report.getLastRow()>1?report.getRange(2,1,report.getLastRow()-1,7).getValues().filter(r=>r[5]==='DOPLNIT ZE SOUČASNÉHO CENÍKU'):[];
 const sh=databaseGetOrdersSheet_(),services=perfectRepairServices_(),changes=[];
 proposals.forEach(r=>{
  const row=Number(r[0]);if(!Number.isInteger(row)||row<3||row>sh.getLastRow())throw new Error('Neplatný řádek v náhledu.');
  const original=sh.getRange(row,1,1,PERFECT_DB_ORDER_HEADERS.length).getValues()[0];
  if(perfectRepairDigest_(JSON.stringify(original))!==String(r[6]))throw new Error('Data se od náhledu změnila. Vytvoř nový náhled.');
  const o=databaseOrderRowToObject_(original),plan=perfectHistoryPricePlan_(o,services);
  if(plan.price===undefined||Number(r[4])!==plan.price)throw new Error('Cena nebo ceník se od náhledu změnily. Vytvoř nový náhled.');
  changes.push({row,price:plan.price,note:String(o.POZNAMKY||'')+(o.POZNAMKY?'\n':'')+'[Cena doplněna ze současného ceníku '+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd')+']'});
 });
 if(!changes.length){Logger.log('Žádné ceny k doplnění.');return {updated:0};}
 const backup=sh.copyTo(ss);backup.setName('__PERFECT_ZALOHA_CEN_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss'));
 changes.forEach(c=>{sh.getRange(c.row,17).setValue(c.price);sh.getRange(c.row,16).setValue(c.note);});p.deleteProperty('PERFECT_HISTORY_PRICE_REPORT');Logger.log('Doplněno '+changes.length+' cen. Záloha: '+backup.getName());return {updated:changes.length,backup:backup.getName()};
});}
function spustitKontroluHistorie() {
  return perfectDataAudit_();
}