/** PERFECT PATCH 1.01. Žádná změna účtů/rolí. Všechny veřejné vstupy ověřují relaci. */
var PERFECT101_BUILD_='PERFECT-PATCH-1.10-COMPLETE';
function perfect101Hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');}
function perfect101Month_(s){return perfectRoster25Month_(s).month;}
function perfect101LunchInput_(p){
 if(!p||typeof p!=='object')throw Error('Chybí záznam.');
 var id=String(p.id||''),request=String(p.requestId||''),userId=String(p.userId||''),period=String(p.period||'').trim(),note=String(p.note||'').trim();
 if(!/^[a-zA-Z0-9_-]{16,100}$/.test(id)||!/^[a-zA-Z0-9_-]{16,100}$/.test(request)||!userId||userId.length>100)throw Error('Neplatné ID záznamu, zaměstnance nebo požadavku.');
 if(!period||period.length>120||note.length>1000)throw Error('Vyplň označení období (max. 120 znaků), poznámka max. 1000 znaků.');
 var amount=String(p.amount==null?'':p.amount).trim().replace(',','.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(amount))throw Error('Částka musí být 0 Kč nebo vyšší, nejvýše dvě desetinná místa.');
 var cents=Math.round(Number(amount)*100);if(!Number.isSafeInteger(cents)||cents>100000000)throw Error('Částka je mimo rozsah.');
 if(!Number.isInteger(p.expectedVersion)||p.expectedVersion<0||typeof p.cancelled!=='boolean')throw Error('Neplatná verze nebo stav záznamu.');
 return {id:id,requestId:request,userId:userId,month:perfect101Month_(p.month),period:period,amountCents:cents,note:note,cancelled:p.cancelled,expectedVersion:p.expectedVersion};
}
function perfect101Context_(token,cap,fn){return perfectProfile54Read_(token,cap,function(){var actor=perfect40Require_(token,cap);return fn(actor);});}
function perfect101LunchSave(token,input){
 return perfect101Context_(token,'shifts.manage',function(actor){
  perfect102RequireAdmin_(actor);
  // Pověření k úpravě směn samo neotevírá cizí finanční údaje.
  if(!perfect40Can_(actor,'payroll.read'))throw Error('K evidenci obědů je nutné stávající oprávnění shifts.manage i payroll.read.');
  return databaseLunch101Save_(actor,input);
 });
}
function perfect101Totals_(daily,records,id){
 var gross=daily.filter(function(d){return String(d.userId)===id&&d.shift&&d.worked&&d.reward!==null;}).reduce(function(n,d){return n+Math.round(Number(d.reward)*100);},0);
 var lunches=records.filter(function(r){return r.userId===id&&!r.cancelled;}).reduce(function(n,r){return n+r.amountCents;},0);
 if(!Number.isSafeInteger(gross)||!Number.isSafeInteger(lunches))throw Error('Neplatný součet odměn.');return {gross:gross/100,lunches:lunches/100,net:(gross-lunches)/100};
}
function perfect101Employees(token,input){
 return perfect101Context_(token,['roster.read','payroll.read'],function(actor){return perfectDatabaseWithLock_('PATCH 1.01 přehled čtení',function(){
  var p=input||{},month=perfect101Month_(p.month),all=perfect102Admin_(actor)&&perfect40Can_(actor,'payroll.read'),selected=String(p.userId||'');
  if(!all&&selected&&selected!==String(actor.id))throw Error('Cizí zaměstnanecké údaje nejsou povolené.');
  var owners102=new Set(perfect40SuperIds_()),actorSuper102=owners102.has(String(actor.id));
  var users=perfectRepairUsers_().filter(function(u){return (all||String(u.id)===String(actor.id))&&(!selected||String(u.id)===selected)&&(!owners102.has(String(u.id))||String(u.id)===String(actor.id));});
  if(selected&&!users.length)throw Error('Zaměstnanec není dostupný.');
  var period=perfectRoster25Month_(month),source=perfectBoxes49Overview_({from:period.from<'2026-08-01'?'2026-08-01':period.from,to:period.to<'2026-08-01'?'2026-08-01':period.to}),events=databaseLunch101Events_(),latest={},historyById=new Map();events.forEach(function(e){latest[e.record.id]=e.record;var list=historyById.get(e.record.id);if(!list){list=[];historyById.set(e.record.id,list);}list.push(e.record);});
  var records=Object.keys(latest).map(function(k){return latest[k];}).filter(function(r){return r.month===month;});
  var employees=users.map(function(u){var id=String(u.id),totals=perfect101Totals_(source.daily.filter(function(d){return d.date>=period.from&&d.date<=period.to;}),records,id);return {id:id,name:[u.firstName,u.surname].filter(Boolean).join(' ')||u.username,active:u.active!==false,gross:totals.gross,lunches:totals.lunches,net:totals.net,entries:records.filter(function(r){return r.userId===id;}).map(function(r){return Object.assign({},r,{history:historyById.get(r.id)||[]});}),days:source.daily.filter(function(d){return String(d.userId)===id&&d.date>=period.from&&d.date<=period.to;}).map(function(d){return {date:d.date,worked:d.worked,reward:d.reward,pay:d.pay?{base:d.pay.base,performanceBonus:d.pay.performanceBonus,weekendBonus:d.pay.weekendBonus,total:d.pay.total}:null};})};});
  var extra=perfect102Finance_(month,database102Events_());
  employees.forEach(function(e){var x=extra.byUser.get(e.id)||{weekly:null,weeklyCents:0,advanceCents:0,advances:[]};e.legacyLunches=e.lunches;e.weeklyLunches=x.weeklyCents/100;e.lunches=(Math.round(e.lunches*100)+x.weeklyCents)/100;e.advances=x.advanceCents/100;e.net=(Math.round(e.net*100)-x.weeklyCents-x.advanceCents)/100;e.weekly=x.weekly;e.advanceEntries=x.advances;});
  if(typeof perfect103ApplyBonuses_==='function')perfect103ApplyBonuses_(employees,month,database102Events_());
  var totals={gross:0,lunches:0,advances:0,health:0,otherBonus:0,fines:0,net:0};Object.keys(totals).forEach(function(k){totals[k]=employees.reduce(function(n,e){return n+Math.round((e[k]||0)*100);},0)/100;});
  return {success:true,month:month,weeks:extra.weeks,allAllowed:all,canWrite:all&&perfect40Can_(actor,'shifts.manage'),employees:employees,totals:totals,build:PERFECT101_BUILD_};
 });});
}
/** Read-only shared change fingerprint. One cached scan / 8s for all clients, no personal data in response. */
function perfect101Revision_(){
 var cache=CacheService.getScriptCache(),cached=cache.get('PERFECT101_FINGERPRINT');if(cached)return cached;
 var ss=perfectDatabaseGetSpreadsheet_(),parts=ss.getSheets().filter(function(sh){var n=sh.getName();return (/^__PERFECT_DB_/.test(n)&&!/AKTIVITY|AUDIT|MAIL/.test(n))||n==='Ceník';}).sort(function(a,b){return a.getName().localeCompare(b.getName());}).map(function(sh){if(sh.getName()===PERFECT102_SHEET_){var last=sh.getLastRow();return [sh.getName(),last,last>1?perfect101Hash_(JSON.stringify(sh.getRange(last,1,1,5).getValues())):''];}return [sh.getName(),perfect101Hash_(JSON.stringify(sh.getDataRange().getValues()))];});
 var revision=perfect101Hash_(JSON.stringify(parts));cache.put('PERFECT101_FINGERPRINT',revision,8);return revision;
}
function perfect101Release_(){return {version:'1.10',build:PERFECT101_BUILD_,available:true,compatible:true,changes:[
 'Pět nejbližších objednávek, žebříčky a decentní logo CTS.',
 'Vlastní widgety v profilu: pořadí, viditelnost, šířka a poznámky.',
 'Původní kalendář také jako widget; původní Detailing PRO zachován.',
 'Mobilní spodní navigace a načtení příjmového listu z fotografie s kontrolou před uložením.',
 'Cílené čtení a ukládání boxů pro vybraný den.',
 'Načítání podle otevřené sekce a rychlá kontrola změn bez čtení celé databáze.'
 ],history:[]};}

function perfect101Status(token){return perfect101Context_(token,'',function(actor){return {success:true,revision:perfect101Revision_(),access:perfect101Hash_(JSON.stringify(perfect40Caps_(actor))),release:perfect101Release_(),serverBuild:PERFECT101_BUILD_,appUrl:ScriptApp.getService().getUrl(),push:{supported:false,reason:'Apps Script vstup nemá push host. Použij doplňkový PWA host.'}};});}
function perfect101Snapshot(token){
 return perfect101Context_(token,'',function(){return perfectDatabaseWithLock_('PATCH 1.01 snapshot čtení',function(){
  // Veřejný bootstrap musí projít vlastní autorizací a sanitizací, ne trusted zkratkou.
  var revision=perfect101Revision_(),depth=perfect40Depth_;perfect40Depth_=0;var data;try{data=perfectWebBootstrap36(token);}finally{perfect40Depth_=depth;}
  return {success:true,data:data,revision:revision};
 });});
}
/** Best effort webhook only after confirmed box write. No change to write result semantics. */
function perfect101Notify_(method,args,result){
 try{
  var props=PropertiesService.getScriptProperties(),url=props.getProperty('PERFECT101_PUSH_WEBHOOK');if(!url)return;
  if(!/^https:\/\/[^/?#]+\/internal\/events$/.test(url))throw Error('Neplatná HTTPS adresa push hostu.');
  var events=perfectMobile65Events_(method,args,result).map(function(e){return {eventKey:e.eventKey,userId:e.userId};});if(!events.length)return;
  var secret=props.getProperty('PERFECT65_BRIDGE_SECRET');if(!secret||secret.length<32)throw Error('Chybí bridge klíč.');
  var timestamp=Date.now(),nonce=Utilities.getUuid(),body=JSON.stringify({events:events}),signature=Utilities.computeHmacSha256Signature(timestamp+'.'+nonce+'.'+body,secret).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
  var response=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',payload:body,headers:{'X-Perfect-Time':String(timestamp),'X-Perfect-Nonce':nonce,'X-Perfect-Signature':signature},muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw Error('Push host nepotvrdil přijetí události.');
 }catch(e){if(result&&typeof result==='object')result.pushWarning101='Zápis uložen, oznámení nebylo potvrzeno. Zápis neopakuj.';console.warn('PATCH 1.01 push: '+e.message);}
 return result;
}
/** Audit 23.10.: clients may immediately edit a returned record again. */
function perfect101DecorateWriteResult_(name,value){
 if(!value||typeof value!=='object'||value.success===false)return value;
 function decorate(kind,record){if(!record||record.revision101)return;var raw=perfect40Trusted_(function(){return kind==='orders'?databaseFindOrderById(record.ORDER_ID):kind==='customers'?databaseFindCustomerById(record.CUSTOMER_ID):databaseGetAllVehicles().find(function(v){return String(v.VEHICLE_ID)===String(record.VEHICLE_ID);});});record.revision101=perfect101RecordRevision_(kind,raw||record);}
 [['order','orders'],['customer','customers'],['vehicle','vehicles']].forEach(function(pair){decorate(pair[1],value[pair[0]]);});
 var kind=/UpdateCustomer/.test(name)?'customers':/UpdateVehicle/.test(name)?'vehicles':'';if(kind)decorate(kind,value.record);return value;
}
/** Revize ignoruje technické datum změny; obsah a skutečné konflikty chrání dál. */
function perfect101RecordRevision_(kind,row){var heads=kind==='orders'?PERFECT_DB_ORDER_HEADERS:kind==='customers'?PERFECT_DB_CUSTOMER_HEADERS:PERFECT_DB_VEHICLE_HEADERS;return perfect101Hash_(JSON.stringify(heads.filter(function(h){return h!=='POSLEDNI_AKTUALIZACE'&&h!=='DATUM_VYTVORENI';}).map(function(h){var v=perfectRepairSerializable_(row[h],h);return v==null?'':v;})));}
function perfect101GuardedWrite(token,input){
 var routes={perfectWebUpdateOrder:['orders','orders.edit'],perfectWebUpdateOrderAddons31:['orders','orders.edit'],perfectWebUpdateCustomer:['customers','customers.edit'],perfectWebUpdateVehicle:['vehicles','vehicles.edit']};
 var p=input||{},route=Object.prototype.hasOwnProperty.call(routes,p.method)?routes[p.method]:null;if(!route||!Array.isArray(p.args)||typeof p.expected!=='string')throw Error('Neplatná operace.');
 return perfect101Context_(token,route[1],function(actor){return perfectDatabaseWithLock_('PATCH 1.01 chráněný zápis',function(){
  var id=route[0]==='orders'?String(p.args[0]&&p.args[0].ORDER_ID||''):String(p.args[0]||'');
  var row=route[0]==='orders'?databaseFindOrderById(id):route[0]==='customers'?databaseFindCustomerById(id):databaseGetAllVehicles().find(function(r){return String(r.VEHICLE_ID)===id;});
  if(!row||perfect101RecordRevision_(route[0],row)!==p.expected)throw Error('CONFLICT: Záznam má novější obsah (úprava nebo automatická změna stavu). Zavři editor, obnov data a porovnej změny. Nic nebylo přepsáno.');
  var depth=perfect40Depth_,result;perfect40Depth_=0;try{result=globalThis[p.method].apply(null,[token].concat(p.args));}finally{perfect40Depth_=depth;}
  CacheService.getScriptCache().remove('PERFECT101_FINGERPRINT');
  return perfect101DecorateWriteResult_(p.method,result);
 });});
}
/** Spustit ručně z editoru před nasazením; soukromé soubory na Disku vlastníka. */
function perfect101Backup_(){
 if(!perfect40TrustedEditor_())throw Error('Spusť pouze z editoru jako vlastník projektu.');
 return perfect40Trusted_(function(){var id=ScriptApp.getScriptId(),root='https://script.googleapis.com/v1/projects/'+encodeURIComponent(id),headers={Authorization:'Bearer '+ScriptApp.getOAuthToken()};
  function get(url){var r=UrlFetchApp.fetch(url,{headers:headers,muteHttpExceptions:true});if(r.getResponseCode()!==200)throw Error('Záloha zastavena: API '+r.getResponseCode()+'. Nic nebylo nasazeno.');return JSON.parse(r.getContentText());}
  var content=get(root+'/content'),deployments=[],next='';do{var page=get(root+'/deployments'+(next?'?pageToken='+encodeURIComponent(next):''));deployments=deployments.concat(page.deployments||[]);next=page.nextPageToken||'';}while(next);
  var versions={};deployments.forEach(function(d){var v=d.deploymentConfig&&d.deploymentConfig.versionNumber;if(v&&!versions[v])versions[v]=get(root+'/content?versionNumber='+v);});
  var folder=DriveApp.createFolder('PERFECT_PRED_PATCH_1.01_'+Utilities.formatDate(new Date(),'Europe/Prague','yyyyMMdd_HHmmss'));
  folder.createFile('kod_aktualni.json',JSON.stringify(content),MimeType.PLAIN_TEXT);folder.createFile('nasazeni.json',JSON.stringify(deployments),MimeType.PLAIN_TEXT);folder.createFile('kod_nasazenych_verzi.json',JSON.stringify(versions),MimeType.PLAIN_TEXT);folder.createFile('vlastnosti_SOUKROME.json',JSON.stringify(PropertiesService.getScriptProperties().getProperties()),MimeType.PLAIN_TEXT);
  var copy=DriveApp.getFileById(perfectDatabaseGetSpreadsheet_().getId()).makeCopy('PERFECT_DATA_PRED_1.01',folder),info={id:folder.getId(),at:new Date().toISOString(),databaseCopyId:copy.getId(),scriptId:id,deployments:deployments.map(function(d){return {id:d.deploymentId,version:d.deploymentConfig&&d.deploymentConfig.versionNumber};})};folder.createFile('OBNOVA.json',JSON.stringify(info,null,2),MimeType.PLAIN_TEXT);Logger.log(JSON.stringify(info));return info;
 });
}
