/** PERFECT MOBILE 65 · jediné HTTP propojení pro novou aplikaci.
 * Zachovává původní doGet, účty, hesla a databázi. Nevytváří spouštěče.
 * Do Nastavení projektu → Vlastnosti skriptu přidej PERFECT65_BRIDGE_SECRET.
 * Hodnotu zkopíruj pouze ze soukromého nastavení nové aplikace.
 */
function doPost(e){
 try{
  var raw=e&&e.postData&&e.postData.contents||'';if(raw.length>3200000)throw Error('Požadavek je příliš velký.');
  var envelope=JSON.parse(raw),secret=PropertiesService.getScriptProperties().getProperty('PERFECT65_BRIDGE_SECRET');
  if(!secret||secret.length<32)throw Error('Doplň vlastnost skriptu PERFECT65_BRIDGE_SECRET.');
  if(envelope.version!==65||!Number.isFinite(envelope.timestamp)||Math.abs(Date.now()-envelope.timestamp)>120000||!/^[a-f0-9-]{36}$/i.test(String(envelope.nonce||'')))throw Error('Neplatný nebo expirovaný požadavek.');
  var text=envelope.timestamp+'.'+envelope.nonce+'.'+envelope.payload,expected=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text,secret)).replace(/=+$/,''),given=String(envelope.signature||''),diff=expected.length^given.length;
  for(var i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^(given.charCodeAt(i)||0);
  if(diff)throw Error('Propojovací klíč nesouhlasí. Zkontroluj vlastnost skriptu.');
  var nonce='P65_'+envelope.nonce,cache=CacheService.getScriptCache(),lock=LockService.getScriptLock();if(!lock.tryLock(3000))throw Error('Server je zaneprázdněný.');
  try{if(cache.get(nonce))throw Error('Požadavek již byl zpracován. Neopakuj zápis bez obnovení přehledu.');cache.put(nonce,'1',300);}finally{lock.releaseLock();}
  var request=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(envelope.payload)).getDataAsString()),method=String(request.method||''),args=request.args||[];
  if(!Array.isArray(args)||args.length>12)throw Error('Neplatné parametry.');
  var data,events=[],eventWarning='';
  if(method==='_mobile65Status')data={success:true,build:'PERFECT-MOBILE-65',accountsPreserved:true};
  else if(method==='_mobile65WhoAmI')data=perfectMobile65User_(args[0]);
  else if(method==='_mobile65Members'){perfectMobile65User_(args[0]);data=perfect40Trusted_(function(){return {ids:perfectRepairUsers_().filter(function(u){return u.active!==false;}).map(function(u){return String(u.id);})};});}
  else{
   var allowed=["perfect102CustomerFlagGet", "perfect103BonusSave", "perfect103NoShowSettle", "perfect102WeeklySave", "perfect102AdvanceSave", "perfect102CustomerFlagSave", "perfectUsers50Get", "perfectUsers50Save", "perfect101GuardedWrite", "perfect101Status", "perfect101Snapshot", "perfect101Employees", "perfect101LunchSave", "perfectAdminUsersGetAvatar", "perfectAdminUsersHistory", "perfectAdminUsersList", "perfectAdminUsersSave", "perfectAuthChangePassword", "perfectAuthGetMyProfile", "perfectAuthGetStatus", "perfectAuthLogin", "perfectAuthLoginBootstrap37", "perfectAuthLoginFast36", "perfectAuthLogout", "perfectAuthSaveMyProfile", "perfectAuthUpsertUser", "perfectBoxes46GetOverview", "perfectBoxes46SaveOrder", "perfectBoxes46SaveShift", "perfectBoxes49Apply", "perfectBoxes49GetOverview", "perfectBoxesGetOverviewV25", "perfectBoxesSaveOrderV25", "perfectBoxesSaveShiftV25", "perfectControlTickAddons31", "perfectDetail44Configure", "perfectDetail44Get", "perfectDetail44List", "perfectDetail44MailHistory", "perfectDetail44MediaGet", "perfectDetail44MediaSave", "perfectDetail44RetryMail", "perfectDetail44Save", "perfectDuplicates38List", "perfectDuplicates38Resolve", "perfectDuplicates56RemoveSelected", "perfectLogo42GetMap", "perfectProfile54GetRoster", "perfectProfile54GetStatistics", "perfectReports39Get", "perfectSecurity40Audit", "perfectSecurity40Get", "perfectSecurity40Save", "perfectSecurity43CreateOwner", "perfectSecurity45Overview", "perfectV13MediaGet", "perfectV13MediaGetProfileBatch", "perfectV13MediaSave", "perfectVoucher36Art", "perfectVoucher36Edit", "perfectVoucher36History", "perfectVoucher36Import", "perfectVoucher36ImportPreview", "perfectVoucher36Issue", "perfectVoucher36List", "perfectVoucher36Redeem", "perfectVoucher36SaveProduct", "perfectVoucher36Setup", "perfectWebAdminArchiveOrder", "perfectWebArchiveTestOrders", "perfectWebBootstrap36", "perfectWebCreateOrder", "perfectWebCreateOrderAddons31", "perfectWebGetBrandAssets37", "perfectWebGetDashboardData", "perfectWebGetServicesAddons31", "perfectWebGetWorkers", "perfectWebPreviewTestOrders", "perfectWebSaveService", "perfectWebSaveServiceAddons31", "perfectWebUpdateCustomer", "perfectWebUpdateOrder", "perfectWebUpdateOrderAddons31", "perfectWebUpdateVehicle"];
   if(allowed.indexOf(method)<0||typeof globalThis[method]!=='function')throw Error('Nepovolená operace.');
   data=globalThis[method].apply(null,args);
   if(['perfectBoxes49Apply','perfectBoxes46SaveShift'].indexOf(method)>=0){try{events=perfectMobile65Events_(method,args,data);}catch(eventError){events=[];eventWarning='Změna je uložená, ale příprava oznámení se nezdařila. Uložení neopakuj.';Logger.log('PERFECT65: zápis potvrzen; událost oznámení nebyla připravena.');}}
  }
  return perfectMobile65Json_({success:true,data:data,events:events,eventWarning:eventWarning});
 }catch(error){return perfectMobile65Json_({success:false,error:String(error.message||error),code:401});}
}
function perfectMobile65Json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function perfectMobile65User_(token){return perfect40Trusted_(function(){var u=perfectRepairRequireUser_(token);if(!u||u.active===false)throw Error('Přihlas se do aplikace.');return {id:String(u.id),username:String(u.username||''),name:[u.firstName,u.surname].filter(Boolean).join(' ')||String(u.username||''),role:String(u.role||''),active:true};});}
function perfectMobile65Events_(method,args,result){
 var token=args[0],input=args[1]||{},write=result&&result.writeResult64||result;
 if(!write)return [];
 return perfect40Trusted_(function(){
  perfect40Require_(token,'shifts.manage');
  var date=perfectBoxes25Date_(input.date),view=perfectBoxes49Overview_({from:date,to:date}),active=new Set(perfectRepairUsers_().filter(function(u){return u.active!==false;}).map(function(u){return String(u.id);})),events=[];
  if(method==='perfectBoxes49Apply'){
   (write.applied||[]).forEach(function(applied){var order=view.orders.find(function(o){return o.id===applied.orderId&&o.version===applied.version;});if(!order||!order.eligible)return;
    (order.allocations||[]).filter(function(part){return part.revenue>0;}).forEach(function(part){var shift=view.shifts.find(function(s){return s.active&&s.date===date&&s.station===part.station;});if(!shift||!active.has(shift.userId))return;
     events.push({eventKey:'assigned:'+order.id+':'+applied.version+':'+shift.userId,userId:shift.userId,kind:'assigned',title:'Přiřazená zakázka',body:order.program+' · '+order.vehicle+' · '+order.revenue+' Kč',payload:{orderId:order.id,date:date,program:order.program,vehicle:order.vehicle,price:order.revenue}});
    });
   });
  }else if(input.worked===false&&write.success===true&&write.verified===true&&write.shift&&input.userId){
   var added=view.shifts.find(function(s){return s.active&&s.date===date&&s.station===input.station&&s.version===write.shift.VERSION&&s.userId===String(input.userId);});
   if(added&&active.has(added.userId))view.orders.filter(function(o){return o.eligible&&(o.allocations||[]).some(function(a){return a.station===added.station&&a.revenue>0;});}).forEach(function(o){events.push({eventKey:'assigned-shift:'+date+':'+added.station+':'+added.version+':'+o.id+':'+added.userId,userId:added.userId,kind:'assigned',title:'Přiřazená zakázka',body:o.program+' · '+o.vehicle+' · '+o.revenue+' Kč',payload:{orderId:o.id,date:date,program:o.program,vehicle:o.vehicle,price:o.revenue}});});
  }else if(input.worked===true&&write.success===true&&write.verified===true&&write.shift){
   var saved=write.shift,shift=view.shifts.find(function(s){return s.active&&s.date===date&&s.station===input.station&&s.version===saved.VERSION&&s.userId===String(saved.USER_ID)&&s.worked;}),day=shift&&view.daily.find(function(d){return d.date===date&&d.station===shift.station&&d.userId===shift.userId;});
   if(shift&&day&&day.pay&&active.has(shift.userId)){var today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');events.push({eventKey:'income:'+date+':'+shift.station+':'+shift.version+':'+shift.userId,userId:shift.userId,kind:'income',title:date===today?'Byl potvrzen příjem za dnešní směnu 🤑':'Výdělek za směnu potvrzen 🤑',body:date+' · '+day.pay.total+' Kč',payload:{date:date,assignedRevenue:day.assignedRevenue49,pay:{base:day.pay.base,overLimit:day.pay.overLimit,performanceBonus:day.pay.performanceBonus,weekendBonus:day.pay.weekendBonus,total:day.pay.total}}});}
  }
  return events;
 });
}
function PERFECT_65_KONTROLA(){var p=PropertiesService.getScriptProperties(),r={build:'PERFECT-MOBILE-65',bridgeKeyConfigured:String(p.getProperty('PERFECT65_BRIDGE_SECRET')||'').length>=32,login:typeof perfectAuthLoginBootstrap37==='function',profile:typeof perfectAuthGetMyProfile==='function',boxes:typeof perfectBoxes49Overview_==='function'};r.success=r.bridgeKeyConfigured&&r.login&&r.profile&&r.boxes;Logger.log(JSON.stringify(r,null,2));if(!r.success)throw Error('Doplň propojovací klíč nebo chybějící původní moduly.');return r;}
