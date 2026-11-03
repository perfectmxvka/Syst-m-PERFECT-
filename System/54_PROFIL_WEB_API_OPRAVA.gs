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
    return {success:true,month:result.month,group:result.group,
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
