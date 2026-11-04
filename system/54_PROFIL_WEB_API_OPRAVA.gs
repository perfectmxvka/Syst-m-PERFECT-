/** PERFECT V54 — jednoznačné webové vstupy pro vlastní profil.
 * Nevyžadují identitu Google editora. Ověřují relaci aplikace a původní
 * oprávnění. Nevytvářejí účty, nemění role, směny, hesla ani objednávky.
 */
function perfectProfile54GetStatistics(token) {
  return perfectProfile54Read_(token,'',function(){
    if(typeof perfect40Original_perfectStaffGetMyStatistics_!=='function')
      throw Error('Chybí úplný modul 25_PROFIL_STATISTIKY.');
    var result=perfect40Original_perfectStaffGetMyStatistics_(token);
    if(!result||result.success!==true||!Array.isArray(result.orders))
      throw Error('Server nepotvrdil osobní statistiky.');
    return {success:true,since:result.since,vehicles:result.vehicles,programs:result.programs,orders:result.orders.map(function(o){return {
      orderId:String(o.orderId||''),date:String(o.date||''),
      vehicle:String(o.vehicle||''),program:String(o.program||'')
    };})};
  });
}
function perfectProfile54GetRoster(token,input) {
  return perfectProfile54Read_(token,'roster.read',function(){
    if(typeof perfect40Original_perfectRosterGetMineV25_!=='function')
      throw Error('Chybí úplný modul 34_BOXY_SMENAR_ADMIN.');
    // Klient vybírá pouze měsíc. Identitu vždy určuje ověřený token.
    var month=input&&input.month;
    var result=perfect40Original_perfectRosterGetMineV25_(token,{month:month});
    if(!result||result.success!==true||!Array.isArray(result.days))
      throw Error('Server nepotvrdil osobní směnář.');
    var detail=null;
    if(input&&input.date){
      var date=String(input.date);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!result.days.some(function(d){return d.date===date;}))throw Error('Neplatný den přehledu.');
      var user=perfectRepairRequireUser_(token),view=perfectBoxes49Overview_({from:date,to:date});
      var own=view.daily.filter(function(d){return String(d.userId)===String(user.id);});
      var stations=own.map(function(d){return d.station;});
      detail={date:date,shifts:own.map(function(d){return {station:d.station,worked:d.worked===true,revenue:d.assignedRevenue49,pay:d.pay||null,reward:d.reward==null?null:d.reward};}),orders:view.orders.filter(function(o){return o.eligible&&(o.allocations||[]).some(function(a){return stations.indexOf(a.station)>=0&&(!o.shared||a.revenue>0);});}).map(function(o){return {id:o.id,time:o.time,vehicle:o.vehicle,program:o.program,status:o.status,share:(o.allocations||[]).filter(function(a){return stations.indexOf(a.station)>=0;}).reduce(function(n,a){return n+Number(a.revenue||0);},0)};})};
    }
    return {success:true,detail:detail,month:result.month,group:result.group,
      days:result.days.map(function(d){return {
        date:d.date,planned:d.planned===true,worked:d.worked===true,
        amount:d.amount==null?null:d.amount,
        pay:d.pay?{base:d.pay.base,performanceBonus:d.pay.performanceBonus,
          weekendBonus:d.pay.weekendBonus,total:d.pay.total}:null
      };}),total:result.total};
  });
}
function perfectProfile54Read_(token,cap,operation) {
  if(typeof perfect40Require_!=='function'||typeof perfect40Trusted_!=='function')
    throw Error('Chybí úplný bezpečnostní modul 40_OPRAVNENI_SUPERADMIN_AUDIT.');
  // Nejdřív ověření relace a práv, teprve potom vnitřní databázové volání.
  var actor=perfect40Require_(token,cap);
  return perfect40Trusted_(function(){
    var previousActor=perfect43Actor_;perfect43Actor_=actor;
    try{return operation();}finally{perfect43Actor_=previousActor;}
  });
}
