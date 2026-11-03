/** PERFECT 39 — čtecí statistiky v původní sekci Statistiky. Zápis dat zůstává v modulu 01. */
function perfectReports39ShiftMonth_(month, delta) {
  var p=perfectRoster25Month_(month),a=p.month.split('-').map(Number),d=new Date(Date.UTC(a[0],a[1]-1+delta,1));
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
}
function perfectReports39Round_(n){return Math.round((Number(n)||0)*100)/100;}
function perfectReports39Delta_(current,previous){return {amount:perfectReports39Round_(current-previous),percent:previous===0?null:perfectReports39Round_((current-previous)/Math.abs(previous)*100),fromZero:previous===0&&current!==0};}
function perfect40Original_perfectReports39Get_(token,input){
  perfect43Require_(token,['finance.read','payroll.read']);
  return perfectDatabaseWithLock_('Statistiky V39 — čtení',function(){return perfectReports39Build_(input||{});});
}
function perfectReports39Build_(input){
  var today=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd'),currentMonth=today.slice(0,7);
  var period=perfectRoster25Month_(input.month||currentMonth);
  if(period.month>currentMonth)throw Error('Budoucí měsíc ještě nemá uzavřené výdělky.');
  var previous=perfectRoster25Month_(perfectReports39ShiftMonth_(period.month,-1));
  var cutoff=period.month===currentMonth?today:period.to;
  var day=Number(cutoff.slice(-2)),previousCutoff=period.month===currentMonth?previous.month+'-'+String(Math.min(day,previous.days)).padStart(2,'0'):previous.to;
  var firstMonth=perfectReports39ShiftMonth_(period.month,-11);
  // Společné načtení výkonu za celé období. Dělení SPOLEČNĚ i denní odměny zajišťuje stávající ověřený modul 34.
  var source=perfectBoxes49Overview_({from:(firstMonth+'-01'<'2026-08-01'?'2026-08-01':firstMonth+'-01'),to:cutoff<'2026-08-01'?'2026-08-01':cutoff});
  var orders=source.orders.filter(function(o){return o.completed&&o.date<=cutoff;});
  var daily=source.daily.filter(function(d){return d.date<=cutoff;});
  var round=perfectReports39Round_,workers={},stationNames={BOX1:'Box 1',BOX2:'Box 2',DETAILING:'Detailing'};
  source.workers.forEach(function(w){workers[w.id]={id:w.id,name:w.name,username:w.username,active:w.active};});
  daily.forEach(function(d){if(d.userId&&!workers[d.userId])workers[d.userId]={id:d.userId,name:'Historický účet '+d.userId,username:'',active:false};});
  function inRange(date,from,to){return date>=from&&date<=to;}
  function summary(from,to){
    var selectedOrders=orders.filter(function(o){return inRange(o.date,from,to);});
    var selectedDays=daily.filter(function(d){return inRange(d.date,from,to);});
    var revenue=round(selectedOrders.reduce(function(n,o){return n+o.revenue;},0));
    var stations=['BOX1','BOX2','DETAILING'].map(function(key){var rows=selectedDays.filter(function(d){return d.station===key;});return {station:key,label:stationNames[key],revenue:round(rows.reduce(function(n,r){return n+r.revenue;},0)),orders:rows.reduce(function(n,r){return n+r.orders;},0),reward:round(rows.reduce(function(n,r){return n+(r.reward===null?0:r.reward);},0)),confirmedShifts:rows.filter(function(r){return r.shift&&r.worked&&r.reward!==null;}).length,unconfirmedDays:rows.filter(function(r){return r.orders&&!(r.shift&&r.worked);}).length};});
    var assigned=round(stations.reduce(function(n,s){return n+s.revenue;},0));
    return {from:from,to:to,revenue:revenue,orders:selectedOrders.length,average:round(selectedOrders.length?revenue/selectedOrders.length:0),stations:stations,unassignedRevenue:round(revenue-assigned),unassignedOrders:selectedOrders.filter(function(o){return !o.station;}).length,reward:round(stations.reduce(function(n,s){return n+s.reward;},0)),confirmedShifts:stations.reduce(function(n,s){return n+s.confirmedShifts;},0),unconfirmedDays:stations.reduce(function(n,s){return n+s.unconfirmedDays;},0)};
  }
  var selected=summary(period.from,cutoff),compare=summary(previous.from,previousCutoff),previousFull=summary(previous.from,previous.to);
  var monthly=[];for(var i=-11;i<=0;i++){var p=perfectRoster25Month_(perfectReports39ShiftMonth_(period.month,i));var end=i===0?cutoff:p.to;var total=summary(p.from,end);total.month=p.month;total.partial=p.month===currentMonth;monthly.push(total);}
  var days=[];for(var n=1;n<=period.days;n++){
    var date=period.month+'-'+String(n).padStart(2,'0'),previousDate=n<=previous.days?previous.month+'-'+String(n).padStart(2,'0'):null;
    var value=date<=cutoff?summary(date,date):null;
    days.push({date:date,day:n,current:value,previous:previousDate?summary(previousDate,previousDate):null,future:date>cutoff});
  }
  function earningsFor(id,from,to){var rows=daily.filter(function(d){return d.userId===id&&inRange(d.date,from,to);}),confirmed=rows.filter(function(d){return d.shift&&d.worked&&d.reward!==null;});return {base:round(confirmed.reduce(function(n,d){return n+d.pay.base;},0)),performanceBonus:round(confirmed.reduce(function(n,d){return n+d.pay.performanceBonus;},0)),weekendBonus:round(confirmed.reduce(function(n,d){return n+d.pay.weekendBonus;},0)),amount:round(confirmed.reduce(function(n,d){return n+d.reward;},0)),confirmedShifts:confirmed.length,unconfirmedDays:rows.filter(function(d){return d.orders&&!(d.shift&&d.worked);}).length,detailingDays:rows.filter(function(d){return d.shift&&d.worked&&d.station==='DETAILING';}).length};}
  var employees=Object.keys(workers).map(function(id){var w=workers[id],mine=earningsFor(id,period.from,cutoff),prior=earningsFor(id,previous.from,previousCutoff);return {id:id,name:w.name,username:w.username,active:w.active,current:mine,previous:prior,previousFull:earningsFor(id,previous.from,previous.to),change:perfectReports39Delta_(mine.amount,prior.amount),months:monthly.map(function(m){return {month:m.month,amount:earningsFor(id,m.from,m.to).amount,confirmedShifts:earningsFor(id,m.from,m.to).confirmedShifts};}),days:daily.filter(function(d){return d.userId===id&&d.date>=period.from&&d.date<=cutoff;}).map(function(d){return {date:d.date,station:d.station,worked:d.worked,confirmed:d.shift&&d.worked&&d.reward!==null,reward:d.reward,stationRevenue:d.revenue,soloRevenue:d.soloRevenue,sharedRevenue:d.sharedRevenue,pay:d.pay,orders:d.orders};})};}).sort(function(a,b){return b.current.amount-a.current.amount||a.name.localeCompare(b.name);});
  var invalidDates=databaseGetAllOrders().filter(function(o){return !perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI)&&['dokonceno','vyhotoveno'].includes(perfectBoxes25Normalize_(o.STAV_OBJEDNAVKY));}).length;
  return {success:true,release:'PERFECT-REPORTS-39',generatedAt:new Date().toISOString(),today:today,month:period.month,previousMonth:previous.month,cutoff:cutoff,current:selected,previous:compare,previousFull:previousFull,change:perfectReports39Delta_(selected.revenue,compare.revenue),daily:days,monthly:monthly,employees:employees,quality:{unassignedOrders:selected.unassignedOrders,unassignedRevenue:selected.unassignedRevenue,unconfirmedDays:selected.unconfirmedDays,invalidDateOrders:invalidDates,detailingWithoutReward:daily.filter(function(d){return d.date>=period.from&&d.station==='DETAILING'&&d.worked;}).length},definitions:{revenue:'Hodnota dokončených zakázek podle data příjezdu. Nejde o bankovní zůstatek ani ověřené hotovostní inkaso. Prodej poukazu se nepřičítá podruhé.',reward:'Vypočtená odměna za potvrzenou odpracovanou směnu na boxu: 1 400 Kč + 25 % z denní tržby nad 6 000 Kč + ručně potvrzený víkendový bonus. Denní tržba je součet samostatných zakázek a podílů ze společných zakázek. Nejde o potvrzení výplaty. Detailing nemá nastavený výpočet.',comparison:period.month===currentMonth?'Stejná uplynulá část měsíce; předchozí měsíc je omezen posledním existujícím dnem.':'Porovnání celých kalendářních měsíců; měsíce mohou mít různý počet dní.'}};
}
/** Jednorázová kontrola z editoru Apps Scriptu; nic nezapisuje do databáze. */
function perfect40Original_perfectReports39Kontrola_(){
  var checks={databaseGetAllOrders:typeof databaseGetAllOrders==='function',perfectBoxes49Overview_:typeof perfectBoxes49Overview_==='function',perfectAuthRequireAdmin_:typeof perfectAuthRequireAdmin_==='function',perfectDatabaseWithLock_:typeof perfectDatabaseWithLock_==='function',perfectShared33Read_:typeof perfectShared33Read_==='function',PERFECT_Statistiky:false};
  try{checks.PERFECT_Statistiky=HtmlService.createHtmlOutputFromFile('PERFECT_Statistiky').getContent().indexOf('perfectReports39Get')>=0;}catch(e){}
  var missing=Object.keys(checks).filter(function(k){return !checks[k];});
  Logger.log(JSON.stringify({version:'PERFECT-REPORTS-39',ready:!missing.length,missing:missing},null,2));
  if(missing.length)throw Error('Chybí součásti přehledů: '+missing.join(', ')+'.');
  return {success:true,ready:true};
}
/** Čtecí kontrola 17.–18.10.2026. Přidat jednou do stávajícího modulu 34. */
function PERFECT_59_KONTROLA_BOXU_17_18_10(){
 var editor=typeof perfect40TrustedEditor_==='function'&&perfect40TrustedEditor_();
 if(!editor){try{if(!SpreadsheetApp.getUi())throw Error('Bez UI');}catch(e){throw Error('Spusť kontrolu ručně z editoru původní tabulky.');}}
 if(typeof perfect40Trusted_!=='function')throw Error('Chybí bezpečnostní modul 40.');
 return perfect40Trusted_(function(){
  var view=perfectBoxes49Overview_({from:'2026-10-17',to:'2026-10-18'}),allOrders=databaseGetAllOrders(),ids=new Set(allOrders.map(function(o){return String(o.ORDER_ID);}));
  var rows=databaseBoxes25Read_('order'),orphans=rows.filter(function(r){return !ids.has(String(r.ORDER_ID));});
  var report={from:view.from,to:view.to,
   days:view.daily.map(function(d){return {date:d.date,station:d.station,userId:d.userId,worked:d.worked,assignedRevenue:d.assignedRevenue49,completedRevenue:d.revenue,soloRevenue:d.soloRevenue,sharedRevenue:d.sharedRevenue,assignedOrders:d.assignedOrders49,pay:d.pay,reward:d.reward};}),
   orderCount:view.orders.length,orders:view.orders.slice(0,80).map(function(o){return {id:o.id,date:o.date,status:o.status,revenue:o.revenue,eligible:o.eligible,station:o.station,source:o.allocationSource,shared:o.shared,allocations:o.allocations,error:o.allocationError};}),
   orphanCount:orphans.length,orphanAssignments:orphans.slice(0,30).map(function(r){return {orderId:String(r.ORDER_ID),station:String(r.STATION),active:r.ACTIVE,updatedAt:String(r.UPDATED_AT)};}),
   note:'Náhled nic nemění. Osiřelé přiřazení může patřit i archivované/smazané zakázce; nepřenáší se automaticky na jiné ID.'};
  Logger.log(JSON.stringify(report,null,2));return report;
 });
}
