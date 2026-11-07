function perfectBoxes29Bool_(value) {
 if(value===true||value===1)return true;
 if(value===false||value===0||value==null||value==='')return false;
 var text=String(value).trim().toLowerCase();
 if(text==='true'||text==='1'||text==='ano')return true;
 if(text==='false'||text==='0'||text==='ne')return false;
 throw new Error('Neplatna hodnota priznaku ve smenach: '+text);
}
function perfectBoxes29Rows_(kind,from,to,ids) {
 return databaseBoxes25Read_(kind).filter(function(raw){if(ids&&!ids.has(String(raw.ORDER_ID)))return false;if(!from)return true;var d=perfectBoxes25VisitDate_(raw.DATE);return d>=from&&d<=to;}).map(function(raw){
  var row={};Object.keys(raw).forEach(function(key){row[key]=raw[key];});
  ['ACTIVE','WORKED','PLANNED'].forEach(function(key){if(Object.prototype.hasOwnProperty.call(row,key))row[key]=perfectBoxes29Bool_(row[key]);});
  if(row.DATE)row.DATE=perfectBoxes25VisitDate_(row.DATE);
  return row;
 });
}
/** 34_BOXY_ADMIN.gs — pouze administrátor. Zápis provádí výhradně modul 01. */
function perfectBoxes25Date_(value){
  const s=String(value||'').trim(),m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if(!m)throw new Error('Vyber platné datum.');
  const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
  if(d.getUTCFullYear()!==+m[1]||d.getUTCMonth()!==+m[2]-1||d.getUTCDate()!==+m[3])throw new Error('Neplatné datum.');
  return s;
}
function perfectBoxes25Station_(s){s=String(s||'');if(!['BOX1','BOX2','DETAILING'].includes(s))throw new Error('Neplatné stanoviště.');return s;}
function perfectBoxes25VisitDate_(value){
  if(value instanceof Date)return isNaN(value)?'':Utilities.formatDate(value,'Europe/Prague','yyyy-MM-dd');
  const s=String(value||'');let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if(m)return m[0];m=/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';
}
function perfectBoxes25Normalize_(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');}
/** V42: kalendářní den v Praze a součty v celých haléřích. */
function perfectBoxes42Weekend_(date){var d=perfectBoxes25Date_(date),day=new Date(d+'T12:00:00Z').getUTCDay();return day===0||day===6;}
function perfectBoxes42Cents_(value){var n=perfectRepairMoney_(value),c=Math.round(n*100);if(!Number.isSafeInteger(c)||c>100000000000)throw Error('Částka je mimo podporovaný rozsah.');return c;}
function perfectBoxes42Bonus_(date,station,value){var c=perfectBoxes42Cents_(value==null||value===''?0:value);if(c&&(!perfectBoxes42Weekend_(date)||station==='DETAILING'))throw Error('Bonus za víkend lze zadat pouze na sobotu nebo neděli pro BOX 1 / BOX 2.');if(Math.abs(Number(String(value||0).replace(/\s|Kč/gi,'').replace(',','.'))*100-c)>.001)throw Error('Víkendový bonus zadej nejvýše na dvě desetinná místa.');return c/100;}
function perfectBoxes42Pay_(revenue,weekendBonus){var cents=perfectBoxes42Cents_(revenue),over=Math.max(0,cents-600000),bonus=perfectBoxes42Cents_(weekendBonus||0),percent=Math.round(over/4);return {base:1400,limit:6000,overLimit:over/100,performanceBonus:percent/100,weekendBonus:bonus/100,total:(140000+percent+bonus)/100};}
function perfectBoxes25Pay_(revenue){return perfectBoxes42Pay_(revenue,0).total;}
function perfect40Original_perfectBoxesGetOverviewV25_(token,input){
  perfect108BoxesRead_(token,input);return perfect40Trusted_(function(){return perfectBoxes49Overview_(input);});
}
function perfectBoxes49Overview_(input){
  input=input||{};
  const from=perfectBoxes25Date_(input.from),to=perfectBoxes25Date_(input.to);
  if(from>to||(new Date(to)-new Date(from))/86400000>366)throw new Error('Vyber období do 367 dnů.');
  const workers=perfectRepairUsers_().map(u=>({id:String(u.id),username:String(u.username||''),name:[u.firstName,u.surname].filter(Boolean).join(' ')||u.username,active:u.active!==false}));
  const shifts=perfectBoxes29Rows_('shift',from,to);
  const sourceOrders=databaseGetAllOrders().filter(o=>{const d=perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI);return d>=from&&d<=to;});
  const overrides=perfectBoxes29Rows_('order',null,null,new Set(sourceOrders.map(o=>String(o.ORDER_ID)))),byOrder=new Map(overrides.map(r=>[String(r.ORDER_ID),r]));
  const norm=perfectBoxes25Normalize_,byIdentity={};
  workers.forEach(w=>{[w.id,w.username,w.name].filter(Boolean).forEach(raw=>{const k=norm(raw);if(!byIdentity[k])byIdentity[k]=new Set();byIdentity[k].add(w.id);});});
  const shiftIndex=new Map();shifts.forEach(s=>{if(s.ACTIVE){const k=s.DATE+'|'+String(s.USER_ID);if(!shiftIndex.has(k))shiftIndex.set(k,[]);shiftIndex.get(k).push(s);}});
  const days=new Map(),labels={BOX1:'BOX 1',BOX2:'BOX 2',DETAILING:'DETAILING'};
  function row(date,station){const k=date+'|'+station;if(!days.has(k))days.set(k,{date,station,revenue:0,orders:0,userId:'',shift:false,worked:false,reward:null,weekendBonus:0,assignedCents49:0,assignedOrders49:0,soloCents42:0,sharedCents42:0,soloOrders:0,sharedOrders:0});return days.get(k);}
  shifts.filter(s=>s.ACTIVE===true).forEach(s=>{const r=row(String(s.DATE),s.STATION);r.userId=String(s.USER_ID);if(r.shift)throw Error('Pro '+s.DATE+' a '+s.STATION+' je více aktivních směn. Nejdřív oprav duplicitu.');r.shift=true;r.worked=s.WORKED===true;r.weekendBonus=perfectBoxes42Bonus_(r.date,r.station,s.WEEKEND_BONUS42||0);});
  const orders=sourceOrders.map(o=>{
    const date=perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI),override=byOrder.get(String(o.ORDER_ID));
    const ids=byIdentity[norm(o.PRACOVNIK)],workerId=ids&&ids.size===1?Array.from(ids)[0]:'';
    const matches=shiftIndex.get(date+'|'+workerId)||[];
    const station=override?.ACTIVE===true?override.STATION:/^D\d{4}-/.test(String(o.ORDER_ID))?'DETAILING':matches.length===1?matches[0].STATION:'';
    const completed=['dokonceno','vyhotoveno'].includes(norm(o.STAV_OBJEDNAVKY));
    const revenue=perfectRepairMoney_(o.CENA_CELKEM);
    const manual=override?.ACTIVE===true,legacySplit=perfectShared33Read_(o);
    const split=manual?(override.STATION==='SHARED'?perfectBoxes49ReadSplit_(override,revenue):null):legacySplit,shared=!!split;
    const activeStation=manual&&override.STATION==='QUEUE'?'':station;
    const allocations=shared?(split.valid?[{station:'BOX1',revenue:split.box1},{station:'BOX2',revenue:split.box2}]:[]):activeStation?[{station:activeStation,revenue}]:[];
    const eligible=perfectBoxes49Eligible_(o.STAV_OBJEDNAVKY);
    allocations.forEach(part=>{if(shared&&part.revenue===0)return;const r=row(date,part.station),cents=perfectBoxes42Cents_(part.revenue);if(eligible){r.assignedCents49+=cents;r.assignedOrders49++;}if(completed){if(shared){r.sharedCents42+=cents;r.sharedOrders++;}else{r.soloCents42+=cents;r.soloOrders++;}r.revenue=(r.soloCents42+r.sharedCents42)/100;r.orders++;}});
    return {id:String(o.ORDER_ID),date,time:String(o.CAS_PRIJEZDU||''),vehicle:String(o.VOZIDLO||''),program:String(o.MYCI_PROGRAM||''),worker:String(o.PRACOVNIK||''),status:String(o.STAV_OBJEDNAVKY||''),revenue,completed,
      station:shared?(split.valid?'SHARED':''):activeStation,manual,eligible,customer:String(o.JMENO_PRIJMENI||''),programPrice:perfectRepairMoney_(o.CENA_PROGRAMU||o.CENA_CELKEM),allocationRevision49:perfectBoxes49Revision_(o,override),version:String(override?.VERSION||''),shared,allocations,allocationSource:shared?'SHARED':override?.ACTIVE===true?'MANUAL':station==='DETAILING'&&/^D\d{4}-/.test(String(o.ORDER_ID))?'DETAILING':station?'WORKER_SHIFT':'UNASSIGNED',workerMatched:!!workerId,
      boxSplit:shared&&split.valid?{box1:split.box1,box2:split.box2}:null,allocationError:shared&&!split.valid?split.error:''};
  }).sort((a,b)=>b.date.localeCompare(a.date)||a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
  const daily=Array.from(days.values()).sort((a,b)=>b.date.localeCompare(a.date)||a.station.localeCompare(b.station));
  daily.forEach(r=>{r.soloRevenue=r.soloCents42/100;r.sharedRevenue=r.sharedCents42/100;delete r.soloCents42;delete r.sharedCents42;r.assignedRevenue49=r.assignedCents49/100;delete r.assignedCents49;r.pay=r.station!=='DETAILING'&&r.shift?perfectBoxes42Pay_(r.assignedRevenue49,r.weekendBonus):null;r.reward=r.pay&&r.worked?r.pay.total:null;});
  const totals=['BOX1','BOX2','DETAILING'].map(station=>{const r=daily.filter(x=>x.station===station);return {station,label:labels[station],revenue:Math.round(r.reduce((s,x)=>s+x.revenue,0)*100)/100,orders:r.reduce((s,x)=>s+x.orders,0),shifts:r.filter(x=>x.shift).length,reward:station==='DETAILING'?null:Math.round(r.reduce((s,x)=>s+(x.reward||0),0)*100)/100,missingShiftDays:r.filter(x=>x.orders&&!x.shift).length};});
  return {success:true,boxesBuild49:'BOXY-V49.1',from,to,workers,shifts:shifts.map(r=>({date:String(r.DATE),station:r.STATION,userId:String(r.USER_ID||''),active:r.ACTIVE===true,worked:r.WORKED===true,weekendBonus:perfectBoxes42Bonus_(String(r.DATE),r.STATION,r.WEEKEND_BONUS42||0),version:String(r.VERSION||'')})),daily,orders,totals,unassigned:orders.filter(o=>o.completed&&!o.station).length};
}
function perfect40Original_perfectBoxesSaveShiftV25_(token,input){
 perfect43Require_(token,'shifts.manage');
 if(!input||typeof input!=='object')throw new Error('Chybi udaje smeny.');
 return perfectDatabaseWithLock_('BOX overene ulozeni',function(){
  var date=perfectBoxes25Date_(input.date),station=perfectBoxes25Station_(input.station),userId=String(input.userId||'').trim();
  var shifts=perfectBoxes29Rows_('shift',date,date);
  if(userId&&shifts.some(function(r){return r.DATE===date&&r.STATION!==station&&r.ACTIVE&&String(r.USER_ID)===userId;}))throw new Error('Pracovnik je v tento den jiz prirazen jinemu stanovisti.');
  var previous=shifts.find(function(r){return r.KEY===date+'|'+station;});
  var bonusInput=input.weekendBonus===undefined&&previous&&String(previous.USER_ID)===userId&&input.worked===true?previous.WEEKEND_BONUS42:input.weekendBonus;
  var weekendBonus=perfectBoxes42Bonus_(date,station,bonusInput||0);
  if(weekendBonus&&(!userId||input.worked!==true))throw Error('Víkendový bonus vyžaduje přiřazeného pracovníka a potvrzenou odpracovanou směnu.');
  var saved=databaseBoxes25SaveShift_(token,Object.assign({},input,{weekendBonus:weekendBonus}));
  if(userId&&input.worked===true&&['BOX1','BOX2'].indexOf(station)>=0)databaseShift115Complete_(date,[station]);
  if(typeof SpreadsheetApp.flush==='function')SpreadsheetApp.flush();
  var record=perfectBoxes29Rows_('shift',date,date).filter(function(r){return r.KEY===saved.KEY;})[0];
  if(!record||record.VERSION!==saved.VERSION||String(record.USER_ID)!==userId||record.ACTIVE!==!!userId||record.WORKED!==(!!userId&&input.worked===true)||Number(record.WEEKEND_BONUS42||0)!==weekendBonus)throw new Error('Ulozeni smeny nebylo potvrzeno ctenim databaze. Obnov prehled pred dalsim pokusem.');
  return {success:true,build:'BOXY-V29',verified:true,shift:record,overview104:input.includeOverview104===true?perfectBalance104Overview_(token,date):undefined};
 });
}
function perfect40Original_perfectBoxesSaveOrderV25_(token,input){
 perfect43Require_(token,'shifts.manage');
 if(!input||typeof input!=='object')throw new Error('Chybi udaje zakazky.');
 return perfectDatabaseWithLock_('BOX overene prirazeni',function(){
  var saved=databaseBoxes25SaveOrder_(token,input);
  if(typeof SpreadsheetApp.flush==='function')SpreadsheetApp.flush();
  var record=perfectBoxes29Rows_('order').filter(function(r){return r.KEY===saved.KEY;})[0];
  if(!record||record.VERSION!==saved.VERSION||record.ACTIVE!==!!input.station||String(record.STATION)!==String(input.station||''))throw new Error('Prirazeni nebylo potvrzeno ctenim databaze. Obnov prehled pred dalsim pokusem.');
  return {success:true,build:'BOXY-V29',verified:true,order:record};
 });
}
/** Směnář: osobní čtení, založení plánu a potvrzení směny jen administrátor. */
function perfectRoster25Group_(username){
  const u=String(username||'').toLowerCase();
  return ['martinf','ladislave'].includes(u)?'A':['vojtadd','martinp'].includes(u)?'B':'';
}
function perfectRoster25Planned_(group,date){
  if(!group)return false;
  const delta=Math.round((new Date(date+'T00:00:00Z')-new Date('2026-10-12T00:00:00Z'))/86400000);
  const index=((delta%14)+14)%14,a=[0,1,4,5,6,9,10].includes(index);
  return group==='A'?a:!a;
}
function perfectRoster25Month_(month){
  const s=String(month||'');if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(s))throw new Error('Vyber měsíc.');
  const [y,m]=s.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate();
  return {month:s,from:s+'-01',to:s+'-'+last,days:last};
}
function perfect40Original_perfectRosterSeedV25_(token){perfectAuthRequireAdmin_(token);return databaseRoster25Seed_(token);}
function perfect40Original_perfectRosterGetMineV25_(token,input){
  const user=perfectRepairRequireUser_(token),period=perfectRoster25Month_(input&&input.month);
  const records=perfectBoxes29Rows_('roster').filter(r=>String(r.USER_ID)===String(user.id)&&r.PLANNED===true&&r.DATE>=period.from&&r.DATE<=period.to);
  const planned=new Set(records.map(r=>String(r.DATE)));
  const summary=perfectBoxes49Overview_({from:period.from,to:period.to});
  const own=summary.daily.filter(r=>r.userId===String(user.id));
  const days=Array.from({length:period.days},(_,i)=>{
    const date=period.month+'-'+String(i+1).padStart(2,'0'),shift=own.find(r=>r.date===date);
    return {date,planned:planned.has(date)||!!shift?.shift||(date>='2026-10-01'&&date<='2026-11-30'&&perfectRoster25Planned_(perfectRoster25Group_(user.username),date)),worked:shift?.worked===true,amount:shift?.worked?shift.reward:null,pay:shift?.worked?shift.pay:null};
  });
  // Vrací jen vlastní odměnu; žádné tržby, stanoviště ani údaje kolegů.
  return {success:true,month:period.month,group:perfectRoster25Group_(user.username),days,total:Math.round(days.reduce((s,d)=>s+(d.worked&&d.amount!==null?d.amount:0),0)*100)/100};
}

/** V46: jednoznačné webové vstupy, nezávislé na starých veřejných názvech ve zbylých modulech. */
function perfectBoxes46GetOverview(){return perfect40Enter_('perfectBoxesGetOverviewV25',perfect40Original_perfectBoxesGetOverviewV25_,arguments,['shifts.manage','finance.read']);}
function perfectBoxes46SaveShift(){var result=perfect40Enter_('perfectBoxesSaveShiftV25',perfect40Original_perfectBoxesSaveShiftV25_,arguments,'shifts.manage');perfect101Notify_('perfectBoxes46SaveShift',arguments,result);return result;}
function perfectBoxes46SaveOrder(){return perfect40Enter_('perfectBoxesSaveOrderV25',perfect40Original_perfectBoxesSaveOrderV25_,arguments,'shifts.manage');}

/** V49: společný zdroj výpočtu pro boxy, statistiky i osobní výdělek. */
function perfectBoxes49Eligible_(status){return ['zruseno','nedorazil','cancelled','canceled'].indexOf(perfectBoxes25Normalize_(status))<0;}
/** Read both historical fixed amounts and the persistent ratio used by Balance. */
function perfectBalance104Basis_(row){
 var a=Number(row.BOX1_WEIGHT104),b=Number(row.BOX2_WEIGHT104);
 if(row.BOX1_WEIGHT104!==''&&row.BOX1_WEIGHT104!=null&&Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&a>=0&&b>=0&&a+b>0)return {box1:a,box2:b};
 a=Math.round(perfectAddons31Money_(row.BOX1_PRICE49,true)*100);b=Math.round(perfectAddons31Money_(row.BOX2_PRICE49,true)*100);
 return a+b?{box1:a,box2:b}:{box1:1,box2:1};
}
function perfectBalance104Split_(a,b,total){
 var cents=Math.round(perfectAddons31Money_(total,true)*100);
 if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0||a+b<=0)throw Error('Neplatný poměr boxů.');
 // Exact integer rounding, including odd cents and the maximum supported amount.
 var denominator=BigInt(a+b),first=Number((BigInt(cents)*BigInt(a)+denominator/2n)/denominator);
 return {box1:first/100,box2:(cents-first)/100};
}
function perfectBoxes49ReadSplit_(row,total){try{var basis=perfectBalance104Basis_(row),s=perfectBalance104Split_(basis.box1,basis.box2,total);return {valid:true,box1:s.box1,box2:s.box2};}catch(e){return {valid:false,error:'Rozdělení nelze přečíst: '+e.message};}}

function perfectBoxes49Revision_(order,row){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([order.ORDER_ID,order.DATUM_OBJEDNANI,order.CENA_CELKEM,order.STAV_OBJEDNAVKY,order.PRACOVNIK,order.CENOVE_POLOZKY,String(row&&row.VERSION||'')])).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');}
function perfectBoxes49Apply(){var result=perfect40Enter_('perfectBoxesSaveOrderV25',function(token,input){perfect43Require_(token,'shifts.manage');return databaseBoxes49Apply_(token,input);},arguments,'shifts.manage');perfect101Notify_('perfectBoxes49Apply',arguments,result);return result;}

/** V49.1: jednoznačný zdroj přehledu, nezávislý na starém stejnojmenném modulu. */
function perfectBoxes25Overview_(input){return perfectBoxes49Overview_(input);}
function perfectBoxes49GetOverview(){return perfect40Enter_('perfectBoxesGetOverviewV25',function(token,input){perfect108BoxesRead_(token,input);return perfectBoxes49Overview_(input);},arguments,['shifts.manage','finance.read']);}

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

/** A write response must have exactly the same field permissions as a separate read. */
function perfectBalance104Overview_(token,date){
 return perfect40SanitizeResult_('perfectBoxesGetOverviewV25',[],perfectBoxes49Overview_({from:date,to:date}),perfect40Require_(token,['shifts.manage','finance.read']));
}

function perfect108BoxesRead_(token,input){var user=perfect43Require_(token,['shifts.manage','finance.read']);if(!perfect40Can_(user,'finance.read')&&(!input||input.from!==input.to))throw Error('Bez práva na tržby lze otevřít pouze konkrétní den v boxech.');return user;}
