/** Časování V31: skutečný čas programu, barevná výplň a potvrzené dokončení. */
function perfectTiming31Normalize_(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();}
function perfectTiming31Durations_(){
  // Délky ze stávajícího interního systému, bez dřívějšího přídavku 15 minut.
  var map={'PERFECT NEW CAR':1440,CLASSIC:30,COMFORT:60,ELEGANCE:60,PREMIUM:90,INDIVIDUAL:150,AVANGARDE:150,AVANTGARDE:150,EXCLUSIVE:180,PERFECT:240};
  if(typeof PERFECT_AUTO_V15!=='undefined'&&PERFECT_AUTO_V15.DURATIONS)Object.keys(PERFECT_AUTO_V15.DURATIONS).forEach(function(key){
    var minutes=Number(PERFECT_AUTO_V15.DURATIONS[key]);if(Number.isFinite(minutes)&&minutes>0)map[perfectTiming31Normalize_(key)]=minutes;
  });
  return map;
}
function perfectTiming31Meta_(order,services){
  var durations=perfectTiming31Durations_(),program=perfectTiming31Normalize_(order.MYCI_PROGRAM);
  var key=Object.keys(durations).sort(function(a,b){return b.length-a.length;}).find(function(k){return (' '+program+' ').indexOf(' '+k+' ')>=0;});
  var out={ARRIVAL_AT:'',AUTO_COMPLETE_AT:'',DURATION_MINUTES:null,PROGRAM_COLOR:'',TIMING_ERROR:''};
  if(/^D\d{4}-/.test(String(order.ORDER_ID||'')))return out;
  if(!key){out.TIMING_ERROR='UNKNOWN_PROGRAM';return out;}
  var rawDate=order.DATUM_OBJEDNANI,date;
  if(rawDate instanceof Date)date=Utilities.formatDate(rawDate,'Europe/Prague','yyyy-MM-dd');
  else{
    var raw=String(rawDate||'').trim(),iso=/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(raw),cz=/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/.exec(raw);
    date=iso?iso[1]+'-'+iso[2]+'-'+iso[3]:cz?cz[3]+'-'+cz[2].padStart(2,'0')+'-'+cz[1].padStart(2,'0'):'';
  }
  var time;
  try{time=order.CAS_PRIJEZDU instanceof Date?Utilities.formatDate(order.CAS_PRIJEZDU,'Europe/Prague','HH:mm'):databaseTime_(order.CAS_PRIJEZDU);}catch(e){out.TIMING_ERROR='INVALID_TIME';return out;}
  if(!date||!time){out.TIMING_ERROR='MISSING_DATETIME';return out;}
  var arrival;
  try{arrival=Utilities.parseDate(date+' '+time,'Europe/Prague','yyyy-MM-dd HH:mm');if(Utilities.formatDate(arrival,'Europe/Prague','yyyy-MM-dd HH:mm')!==date+' '+time)throw Error('Neplatné datum');}
  catch(e){out.TIMING_ERROR='INVALID_DATETIME';return out;}
  out.ARRIVAL_AT=arrival.toISOString();out.DURATION_MINUTES=durations[key];out.AUTO_COMPLETE_AT=new Date(arrival.getTime()+durations[key]*60000).toISOString();
  var snapshot=null;try{snapshot=order.CENOVE_POLOZKY?JSON.parse(order.CENOVE_POLOZKY):null;}catch(e){}
  var programId=snapshot&&snapshot.program?String(snapshot.program.id||''):'';
  var catalog=(services||[]).filter(function(s){return s.TYP==='PROGRAM'&&/^#[0-9a-f]{6}$/i.test(s.BARVA||'');});
  var service=programId?catalog.find(function(s){return String(s.SERVICE_ID)===programId;}):null;
  if(!service)service=catalog.filter(function(s){var name=perfectTiming31Normalize_(s.NAZEV);return name&&(' '+program+' ').indexOf(' '+name+' ')>=0;}).sort(function(a,b){return String(b.NAZEV).length-String(a.NAZEV).length;})[0];
  if(service)out.PROGRAM_COLOR=service.BARVA;
  return out;
}
function perfectTiming31View_(order,services){return Object.assign({},perfectRepairSerializable_(order),perfectTiming31Meta_(order,services));}
function perfect40Original_perfectWebGetAllHistoricalDataAddons31_(token){
  var viewer=perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();
  var status=databaseTiming31Apply_(false),services=databaseAddons31ReadServices_();
  var customers=perfectRepairSerializable_(databaseGetAllCustomers()).filter(function(c){return c.CUSTOMER_ID;});
  var vehicles=perfectRepairSerializable_(databaseGetAllVehicles()).filter(function(v){return v.VEHICLE_ID;});
  var orders=databaseGetAllOrders().filter(function(o){return o.ORDER_ID;}).map(function(order){return perfectTiming31View_(order,services);});
  var today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');
  var revenue=orders.filter(function(o){var date=o.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(o.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(o.DATUM_OBJEDNANI).slice(0,10);return date===today&&perfectTiming31Normalize_(o.STAV_OBJEDNAVKY)==='DOKONCENO';}).reduce(function(sum,o){return sum+Math.round(perfectRepairMoney_(o.CENA_CELKEM)*100);},0)/100;
  return {success:true,customers:customers,vehicles:vehicles,orders:orders,summary:{
    todayRevenue:perfect40Can_(viewer,'finance.read')?revenue:null,
    latestOrders:orders.slice().sort(function(a,b){return String(b.DATUM_OBJEDNANI).localeCompare(String(a.DATUM_OBJEDNANI));}).slice(0,10),
    centralCustomers:customers.length,centralVehicles:vehicles.length,centralOrders:orders.length,
    historicalCustomersAddedToView:0,historicalVehiclesAddedToView:0},
    timing31:{completed:status.completed,unknown:status.unknown,remaining:status.remaining,checkedAt:new Date().toISOString()}};
}
function perfect40Original_perfectControlTickAddons31_(token){
  var viewer=perfectRepairRequireUser_(token),status=databaseTiming31Apply_(false),services=databaseAddons31ReadServices_();
  var orders=databaseGetAllOrders(),today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');
  return {success:true,now:new Date().toISOString(),completed:status.completed,unknown:status.unknown,remaining:status.remaining,
    orders:orders.map(function(order){return Object.assign({ORDER_ID:String(order.ORDER_ID),revision101:perfect101RecordRevision_('orders',order),STAV_OBJEDNAVKY:String(order.STAV_OBJEDNAVKY),MANUAL_STATUS_HOLD:false},perfectTiming31Meta_(order,services));}),
    todayRevenue:perfect40Can_(viewer,'finance.read')?orders.filter(function(order){var date=order.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(order.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(order.DATUM_OBJEDNANI).slice(0,10);return date===today&&['DOKONCENO','VYHOTOVENO'].indexOf(perfectTiming31Normalize_(order.STAV_OBJEDNAVKY))>=0;}).reduce(function(sum,order){return sum+Math.round(perfectRepairMoney_(order.CENA_CELKEM)*100);},0)/100:null};
}
/** Jednou spusť v editoru Apps Scriptu. Funkce s _ není volatelná z prohlížeče. */
function perfectNastavitAutomatikuV31_(){
  var own='perfectAutoStatusRunAddons31_',replaced=['perfectAutoStatusRun','perfectAutoFinishPastOrders'];
  var triggers=ScriptApp.getProjectTriggers(),ours=triggers.filter(function(t){return t.getHandlerFunction()===own;});
  // Odstraňují se pouze staré časovače automatických stavů; Gmail a jiné spouštěče zůstávají.
  triggers.filter(function(t){return replaced.indexOf(t.getHandlerFunction())>=0;}).forEach(function(t){ScriptApp.deleteTrigger(t);});
  if(ours.length!==1){ours.forEach(function(t){ScriptApp.deleteTrigger(t);});ScriptApp.newTrigger(own).timeBased().everyMinutes(1).create();}
  var status=databaseTiming31Apply_(false);
  var result={success:true,intervalMinutes:1,extraMinutes:0,status:status};Logger.log(JSON.stringify(result));return result;
}
function perfectAutoStatusRunAddons31_(){return databaseTiming31Apply_(false);}
function perfectNahledCasovaniV31_(){var result=databaseTiming31Apply_(true);Logger.log(JSON.stringify(result));return result;}

/** V58: ovládání z editoru přidat jednou do existujícího modulu 33. */
function perfectStatus58Editor_(fn){
 var trusted=typeof perfect40TrustedEditor_==='function'&&perfect40TrustedEditor_();
 if(!trusted){try{if(!SpreadsheetApp.getUi())throw Error('Bez UI');}catch(e){throw Error('Spusť tuto operaci ručně z editoru původní tabulky.');}}
 if(typeof perfect40Trusted_!=='function')throw Error('Chybí bezpečnostní modul 40.');
 return perfect40Trusted_(fn);
}
function PERFECT_58_NAHLED_STAVU(){return perfectStatus58Editor_(function(){
 var all=databaseStatus58Premature_(),items=all.slice(0,50),props=PropertiesService.getUserProperties();
 var snapshot={at:Date.now(),items:items.map(function(x){return {id:x.ORDER_ID,hash:perfectDuplicates38Fingerprint_(x.order)};})};
 var json=JSON.stringify(snapshot);if(json.length>8500)throw Error('Náhled je příliš velký pro uložení.');props.setProperty('PERFECT_STATUS58_PREVIEW',json);
 var result={total:all.length,batch:items.map(function(x){return {ORDER_ID:x.ORDER_ID,date:x.date,time:x.time,completeAt:x.finish};}),automatic:databaseTiming31Apply_(true)};
 Logger.log(JSON.stringify(result,null,2));return result;
});}
function PERFECT_58_VRATIT_PREDCASTNE_DOKONCENE(){return perfectStatus58Editor_(function(){
 var props=PropertiesService.getUserProperties(),snapshot=JSON.parse(props.getProperty('PERFECT_STATUS58_PREVIEW')||'null');
 var result=databaseStatus58Restore_(snapshot);props.deleteProperty('PERFECT_STATUS58_PREVIEW');Logger.log(JSON.stringify(result,null,2));return result;
});}
function PERFECT_58_POZASTAVIT_STAVY(){return perfectStatus58Editor_(function(){
 var names=['perfectAutoStatusRunAddons31_','perfectAutoStatusRun','perfectAutoStatusRun_','perfectAutoFinishPastOrders','perfectAutoFinishPastOrders_'],removed=[];
 ScriptApp.getProjectTriggers().forEach(function(t){if(names.indexOf(t.getHandlerFunction())>=0){removed.push(t.getHandlerFunction());ScriptApp.deleteTrigger(t);}});
 var result={removed:removed,remainingHandlers:ScriptApp.getProjectTriggers().map(function(t){return t.getHandlerFunction();}),note:'Pouze spouštěče dostupné tomuto účtu. Nezastaví již běžící proces.'};Logger.log(JSON.stringify(result,null,2));return result;
});}
function PERFECT_58_ZAPNOUT_STAVY(){return perfectStatus58Editor_(function(){
 if(typeof databaseStatus58Clock_!=='function')throw Error('Nejdřív vlož opravu modulu 01.');
 return perfectNastavitAutomatikuV31_();
});}
