/** PERFECT 1.02: customer warnings, weekly lunch rows and individual advances.
 * Append-only events. Public functions authenticate before and inside the write lock.
 * Existing order, customer, shift and gross-pay records are never migrated here.
 */
var PERFECT102_BUILD_='PERFECT-PATCH-1.02';
var PERFECT102_SHEET_='__PERFECT_DB_EVENTS102';
function perfect102Admin_(u){return !!u&&(perfect40Super_(u)||u.role==='ADMINISTRATOR');}
function perfect102RequireAdmin_(u){if(!perfect102Admin_(u))throw Error('Tuto činnost může provést pouze administrátor.');}
function perfect102Money_(value){
 var text=String(value==null?'':value).trim().replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw Error('Částka musí být nezáporné číslo s nejvýše dvěma desetinnými místy.');
 var cents=Math.round(Number(text)*100);if(!Number.isSafeInteger(cents)||cents>100000000)throw Error('Částka je mimo rozsah.');return cents;
}
function perfect102Version_(p){if(!Number.isInteger(p.expectedVersion)||p.expectedVersion<0)throw Error('Chybí platná verze záznamu.');return p.expectedVersion;}
function perfect102Id_(v){v=String(v||'');if(!/^[a-zA-Z0-9_-]{16,100}$/.test(v))throw Error('Neplatné ID záznamu nebo požadavku.');return v;}
function perfect102Text_(v,max){var s=String(v==null?'':v).trim();if(s.length>max)throw Error('Text je příliš dlouhý (maximum '+max+' znaků).');return s;}
function perfect102Day_(v){return perfectBoxes25Date_(v);}
function perfect102Weeks_(month){
 month=perfect101Month_(month);var first=new Date(month+'-01T12:00:00Z'),last=new Date(first);last.setUTCMonth(last.getUTCMonth()+1,0);
 var start=new Date(first);start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));var weeks=[];
 while(start<=last){var end=new Date(start);end.setUTCDate(end.getUTCDate()+6);var from=start<first?first:start,to=end>last?last:end;
  weeks.push({key:start.toISOString().slice(0,10),from:from.toISOString().slice(0,10),to:to.toISOString().slice(0,10),label:'Týden '+(weeks.length+1)});start.setUTCDate(start.getUTCDate()+7);
 }return weeks;
}
function database102Sheet_(create){
 var ss=perfectDatabaseGetSpreadsheet_(),sh=ss.getSheetByName(PERFECT102_SHEET_),heads=['EVENT_ID','REQUEST_ID','ACTOR_ID','HASH','RECORD_JSON'];
 if(!sh&&create){sh=ss.insertSheet(PERFECT102_SHEET_);sh.getRange(1,1,1,5).setValues([heads]);sh.setFrozenRows(1);sh.hideSheet();}
 if(sh&&sh.getRange(1,1,1,5).getValues()[0].join('|')!==heads.join('|'))throw Error('Hlavička deníku 1.02 nesouhlasí. Nic nebylo přepsáno.');return sh;
}
function database102Events_(){
 var sh=database102Sheet_(false);if(!sh||sh.getLastRow()<2)return [];
 return sh.getRange(2,1,sh.getLastRow()-1,5).getValues().map(function(r){var record;try{record=JSON.parse(String(r[4]));}catch(e){throw Error('Poškozený záznam deníku 1.02. Výpočet byl zastaven.');}
  if(!record||['flag','weekly','advance','bonus'].indexOf(record.type)<0||!record.id||!Number.isInteger(record.version)||record.version<1)throw Error('Neplatný záznam deníku 1.02.');
  return {eventId:String(r[0]),requestId:String(r[1]),actorId:String(r[2]),hash:String(r[3]),record:record};
 });
}
function perfect102State_(events){var latest=new Map(),history=new Map();events.forEach(function(e){var key=e.record.type+'|'+e.record.id,list=history.get(key);if(!list){list=[];history.set(key,list);}list.push(e.record);latest.set(key,e.record);});return {latest:latest,history:history};}
function perfect102Target_(actor,id){id=String(id||'');var user=perfectRepairUsers_().find(function(u){return String(u.id)===id;});if(!user||String(actor.id)!==String(user.id)&&perfect40Super_(user))throw Error('Zaměstnanec není dostupný.');return user;}
function perfect102Write_(token,cap,admin,input,normalize){
 return perfect101Context_(token,cap,function(actor){if(admin)perfect102RequireAdmin_(actor);
  return perfectDatabaseWithLock_('PATCH 1.02 zápis',function(){
   var fresh=perfect40Require_(token,cap);if(admin)perfect102RequireAdmin_(fresh);
   if(admin&&!perfect40Can_(fresh,'payroll.read'))throw Error('Chybí oprávnění ke mzdovým údajům.');
   var p=normalize(input||{},fresh),requestId=perfect102Id_(input&&input.requestId),hash=perfect101Hash_(JSON.stringify(p)),events=database102Events_();
   var replay=events.find(function(e){return e.actorId===String(fresh.id)&&e.requestId===requestId;});
   if(replay){if(replay.hash!==hash)throw Error('Stejné ID požadavku má jiný obsah. Obnov přehled.');return {success:true,replayed:true,record:replay.record};}
   var old=perfect102State_(events).latest.get(p.type+'|'+p.id);
   if(old&&old.version!==p.expectedVersion||!old&&p.expectedVersion!==0)throw Error('CONFLICT: Záznam mezitím změnil jiný uživatel. Obnov přehled; nic nebylo přepsáno.');
   if(p.cancelled&&!old)throw Error('Nelze stornovat neexistující zálohu.');
   if(old&&((old.userId||'')!==(p.userId||'')||(old.customerId||'')!==(p.customerId||'')))throw Error('Vlastníka záznamu nelze změnit.');
   var now=new Date().toISOString(),record=Object.assign({},p,{version:old?old.version+1:1,createdAt:old?old.createdAt:now,createdBy:old?old.createdBy:String(fresh.id),updatedAt:now,updatedBy:String(fresh.id)});delete record.expectedVersion;
   var sh=database102Sheet_(true);sh.getRange(sh.getLastRow()+1,1,1,5).setNumberFormat('@').setValues([[Utilities.getUuid(),requestId,String(fresh.id),hash,JSON.stringify(record)]]);SpreadsheetApp.flush();
   CacheService.getScriptCache().remove('PERFECT101_FINGERPRINT');return {success:true,record:record};
  });
 });
}
function perfect102WeeklySave(token,input){return perfect102Write_(token,'shifts.manage',true,input,function(p,actor){
 var month=perfect101Month_(p.month),userId=String(p.userId||'');perfect102Target_(actor,userId);var weeks=perfect102Weeks_(month);
 if(!Array.isArray(p.weeks)||p.weeks.length!==weeks.length)throw Error('Počet týdnů neodpovídá kalendáři vybraného měsíce.');
 var values=weeks.map(function(w,i){var v=p.weeks[i];if(!v||v.key!==w.key)throw Error('Týdny neodpovídají kalendáři. Obnov přehled.');return {key:w.key,amountCents:perfect102Money_(v.amount)};});
 return {type:'weekly',id:'L102_'+perfect101Hash_(userId+'|'+month).slice(0,32),userId:userId,month:month,weeks:values,note:perfect102Text_(p.note,1000),expectedVersion:perfect102Version_(p)};
});}
function perfect102AdvanceSave(token,input){return perfect102Write_(token,'shifts.manage',true,input,function(p,actor){
 var userId=String(p.userId||'');perfect102Target_(actor,userId);var date=perfect102Day_(p.date);
 if(typeof p.cancelled!=='boolean')throw Error('Neplatný stav zálohy.');
 return {type:'advance',id:perfect102Id_(p.id),userId:userId,date:date,month:date.slice(0,7),amountCents:perfect102Money_(p.amount),note:perfect102Text_(p.note,1000),cancelled:p.cancelled,expectedVersion:perfect102Version_(p)};
});}
function perfect102CustomerFlagSave(token,input){return perfect102Write_(token,'customers.edit',false,input,function(p){
 var customerId=String(p.customerId||''),customer=databaseFindCustomerById(customerId);if(!customer)throw Error('Zákazník nebyl nalezen.');
 if(typeof p.active!=='boolean')throw Error('Neplatný stav upozornění.');var note=perfect102Text_(p.note,2000);if(p.active&&!note)throw Error('Popiš důvod upozornění na problémového zákazníka.');
 return {type:'flag',id:'C102_'+perfect101Hash_(customerId).slice(0,32),customerId:customerId,active:p.active,note:note,expectedVersion:perfect102Version_(p)};
});}
function perfect102Finance_(month,events){
 var state=perfect102State_(events),byUser=new Map(),calendar=perfect102Weeks_(month);
 function account(id){if(!byUser.has(id))byUser.set(id,{weekly:null,weeklyCents:0,advanceCents:0,advances:[]});return byUser.get(id);}
 state.latest.forEach(function(r){if(r.month!==month||['weekly','advance'].indexOf(r.type)<0)return;var a=account(r.userId);
  if(r.type==='weekly'){
   if(!Array.isArray(r.weeks)||r.weeks.length!==calendar.length||r.weeks.some(function(w,i){return w.key!==calendar[i].key||!Number.isSafeInteger(w.amountCents)||w.amountCents<0;}))throw Error('Neplatný týdenní přehled obědů.');
   if(a.weekly)throw Error('Duplicitní týdenní řádek zaměstnance.');a.weekly=Object.assign({},r,{history:state.history.get('weekly|'+r.id)||[]});a.weeklyCents=r.weeks.reduce(function(n,w){return n+w.amountCents;},0);
  }else{
   if(!Number.isSafeInteger(r.amountCents)||r.amountCents<0||typeof r.cancelled!=='boolean'||r.date.slice(0,7)!==r.month)throw Error('Neplatná částka nebo datum zálohy.');
   a.advances.push(Object.assign({},r,{history:state.history.get('advance|'+r.id)||[]}));if(!r.cancelled)a.advanceCents+=r.amountCents;
  }
 });
 byUser.forEach(function(a){if(!Number.isSafeInteger(a.weeklyCents)||!Number.isSafeInteger(a.advanceCents))throw Error('Součet odečtů je mimo rozsah.');a.advances.sort(function(x,y){return y.date.localeCompare(x.date)||y.updatedAt.localeCompare(x.updatedAt);});});return {byUser:byUser,weeks:calendar};
}
function perfect102Bootstrap_(data,user){
 if(!data)return data;data.customerFlags102={};
 if(!['orders.read','customers.read','vehicles.read'].some(function(c){return perfect40Can_(user,c);}))return data;
 var ids=new Set();(data.customers||[]).concat(data.orders||[],data.vehicles||[]).forEach(function(r){if(r.CUSTOMER_ID)ids.add(String(r.CUSTOMER_ID));});
 var state=perfect102State_(database102Events_());state.latest.forEach(function(r){if(r.type==='flag'&&ids.has(r.customerId))data.customerFlags102[r.customerId]={customerId:r.customerId,active:r.active,note:r.note,version:r.version,updatedAt:r.updatedAt};});return typeof perfect103NoShowBootstrap_==='function'?perfect103NoShowBootstrap_(data,ids):data;
}
function perfect102CustomerFlagGet(token,customerId){
 return perfect101Context_(token,['customers.read','customers.edit','orders.read','orders.create'],function(){
  customerId=String(customerId||'');if(!databaseFindCustomerById(customerId))throw Error('Zákazník nebyl nalezen.');
  var state=perfect102State_(database102Events_()),r=state.latest.get('flag|C102_'+perfect101Hash_(customerId).slice(0,32));
  var flag=r?{customerId:customerId,active:r.active,note:r.note,version:r.version,updatedAt:r.updatedAt}:{customerId:customerId,active:false,note:'',version:0};return {success:true,record:typeof perfect103NoShowFlag_==='function'?perfect103NoShowFlag_(flag):flag};
 });
}
