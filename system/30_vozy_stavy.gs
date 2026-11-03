/** 33_AUTO_STAV_V26.gs — jediné automatické dokončování podle programu. */
function perfectOrderTimingV26_(o){
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  const p=normalize(o.MYCI_PROGRAM),durations={'PERFECT NEW CAR':1440,CLASSIC:30,COMFORT:60,ELEGANCE:60,PREMIUM:90,INDIVIDUAL:150,AVANGARDE:150,AVANTGARDE:150,EXCLUSIVE:180,PERFECT:240};
  const key=Object.keys(durations).sort((a,b)=>b.length-a.length).find(k=>(' '+p+' ').includes(' '+k+' '));
  if(!key)return {ARRIVAL_AT:'',AUTO_COMPLETE_AT:'',DURATION_MINUTES:null};
  const date=perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI);let time;
  try{time=databaseTime_(o.CAS_PRIJEZDU);}catch(e){return {};}
  if(!date||!time)return {};
  let at;try{at=Utilities.parseDate(date+' '+time,'Europe/Prague','yyyy-MM-dd HH:mm');}catch(e){return {};}
  if(Utilities.formatDate(at,'Europe/Prague','yyyy-MM-dd HH:mm')!==date+' '+time)return {};
  const minutes=durations[key]+(key==='PERFECT NEW CAR'?0:15);
  return {ARRIVAL_AT:at.toISOString(),AUTO_COMPLETE_AT:new Date(at.getTime()+minutes*60000).toISOString(),DURATION_MINUTES:minutes};
}
function perfectAutoStatusRun(){return databaseAutoStatus26Apply_();}
function perfectAutoStatusPreview(){return databaseAutoStatus26Apply_(true);}
function perfectAutoStatusBackfill(){return databaseAutoStatus26Apply_();}
function perfectControlSetupV26(token){
  perfectAuthRequireAdmin_(token);
  const name='perfectAutoStatusRun',triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===name);
  if(triggers.length!==1){triggers.forEach(t=>ScriptApp.deleteTrigger(t));ScriptApp.newTrigger(name).timeBased().everyMinutes(1).create();}
  return {success:true,status:databaseAutoStatus26Apply_()};
}
function perfectControlTickV26(token){
  const viewer=perfectRepairRequireUser_(token);databaseAutoStatus26Apply_();
  const summary=databaseOrderMeta26Map_();
  const today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');
  const orders=databaseGetAllOrders();
  return {success:true,orders:orders.map(o=>({ORDER_ID:String(o.ORDER_ID),STAV_OBJEDNAVKY:String(o.STAV_OBJEDNAVKY),...perfectOrderTimingV26_(o),MANUAL_STATUS_HOLD:!!summary[String(o.ORDER_ID)]?.MANUAL_AT})),todayRevenue:viewer.role==='ADMINISTRATOR'?orders.filter(o=>perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI)===today&&['DOKONČENO','VYHOTOVENO'].includes(String(o.STAV_OBJEDNAVKY).toUpperCase())).reduce((s,o)=>s+perfectRepairMoney_(o.CENA_CELKEM),0):null};
}

function perfectProgramColorV26_(name){
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 const key=norm(name);let color='';
 try{if(typeof perfectRepairServices_==='function'){const services=perfectProgramColorV26_.services||(perfectProgramColorV26_.services=perfectRepairServices_());const service=services.filter(x=>x.AKTIVNI!==false&&norm(x.NAZEV)&&(' '+key+' ').includes(' '+norm(x.NAZEV)+' ')).sort((a,b)=>norm(b.NAZEV).length-norm(a.NAZEV).length)[0];if(service)color=service.BARVA;}}catch(e){}
 if(!/^#[0-9a-f]{6}$/i.test(color)){try{if(typeof perfectBarvaMycihoProgramu_==='function')color=perfectBarvaMycihoProgramu_(name);}catch(e){}}
 return /^#[0-9a-f]{6}$/i.test(color)?color:'';
}
