/** Page-specific bootstrap, using a scoped workbook on the Node host. */
function perfect109Ranks_(all,customers){
 var byId=new Map(customers.map(c=>[String(c.CUSTOMER_ID),c])),seen=new Set(),map=new Map(),phone=v=>databaseNormalizePhone_(v);
 all.forEach(o=>{if(!/^(dokonceno|vyhotoveno)$/.test(perfect36Name_(o.STAV_OBJEDNAVKY)))return;var oid=String(o.ORDER_ID);if(seen.has(oid))return;seen.add(oid);var id=String(o.CUSTOMER_ID||'');if(!byId.has(id)){var matches=customers.filter(c=>phone(c.TELEFON)&&phone(c.TELEFON)===phone(o.TELEFON)&&perfect36Name_(c.JMENO_PRIJMENI)===perfect36Name_(o.JMENO_PRIJMENI));if(matches.length!==1)return;id=String(matches[0].CUSTOMER_ID);}var c=byId.get(id),r=map.get(id)||{id:id,name:c.JMENO_PRIJMENI||'Zákazník',visits:0,total:0};r.visits++;r.total+=perfectRepairMoney_(o.CENA_CELKEM);map.set(id,r);});
 var rows=Array.from(map.values()),sort=k=>(a,b)=>b[k]-a[k]||a.id.localeCompare(b.id,'cs',{numeric:true});return {visits:rows.slice().sort(sort('visits')).slice(0,5),spending:rows.filter(r=>r.total>0).sort(sort('total')).slice(0,5),all:rows};
}
function perfect109Bootstrap_(token,scope){
 var viewer=perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();var page=scope.page,all=databaseGetAllOrders(),customers=[],vehicles=[],services=[],orders=[],workers=[],ranks=null;
 var today=perfect36Day_(),day=o=>perfectBoxes25VisitDate_(o.DATUM_OBJEDNANI),full=['orders','customers','vehicles','payments','stats','editor'].indexOf(page)>=0;
 if(full)orders=all;
 else if(page==='dashboard'){
  var start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));var from=start.toISOString().slice(0,10);start.setUTCDate(start.getUTCDate()+6);var to=start.toISOString().slice(0,10);
  var nearest=all.filter(o=>!/(zrus|nedorazil|dokonc|vyhotov)/.test(perfect36Name_(o.STAV_OBJEDNAVKY))).sort((a,b)=>day(a).localeCompare(day(b))||String(a.CAS_PRIJEZDU).localeCompare(String(b.CAS_PRIJEZDU))).slice(0,5),ids=new Set(nearest.map(o=>String(o.ORDER_ID)));
  orders=all.filter(o=>ids.has(String(o.ORDER_ID))||(day(o)>=from&&day(o)<=to));
 }else if(page==='calendar')orders=all;
 else if(page==='detailing')orders=all.filter(o=>/^D\d{4}-/.test(String(o.ORDER_ID)));
 if(full||['dashboard','calendar','detailing'].indexOf(page)>=0){customers=databaseGetAllCustomers();vehicles=databaseGetAllVehicles();}
 if(full||['dashboard','calendar','detailing','services'].indexOf(page)>=0)services=perfect36ReadServices_();
 if(full||['dashboard','detailing'].indexOf(page)>=0)workers=perfectWebGetWorkers(token);
 if((full||page==='dashboard')&&perfect40Can_(viewer,'orders.read')&&perfect40Can_(viewer,'customers.read'))ranks=perfect109Ranks_(all,customers);
 var nc=customers.length,nv=vehicles.length;
 if(page==='dashboard'||page==='calendar'||page==='detailing'){var cids=new Set(orders.map(o=>String(o.CUSTOMER_ID))),vids=new Set(orders.map(o=>String(o.VEHICLE_ID)));if(ranks)[...ranks.visits,...ranks.spending].forEach(r=>cids.add(r.id));customers=customers.filter(c=>cids.has(String(c.CUSTOMER_ID)));vehicles=vehicles.filter(v=>vids.has(String(v.VEHICLE_ID)));}
 orders=orders.filter(o=>o.ORDER_ID).map(o=>{var r=typeof perfectTiming31View_==='function'&&perfect36Name_(o.STAV_OBJEDNAVKY)==='ceka se'?perfectTiming31View_(o,services):perfectRepairSerializable_(o);r.revision101=perfect101RecordRevision_('orders',o);return r;});
 customers=perfectRepairSerializable_(customers);vehicles=perfectRepairSerializable_(vehicles);customers.forEach(r=>r.revision101=perfect101RecordRevision_('customers',r));vehicles.forEach(r=>r.revision101=perfect101RecordRevision_('vehicles',r));
 var revenue=all.reduce((sum,o)=>sum+(day(o)===today&&perfect36Name_(o.STAV_OBJEDNAVKY)==='dokonceno'?Math.round(perfectRepairMoney_(o.CENA_CELKEM)*100):0),0)/100;
 return {success:true,version:PERFECT_REPAIR.VERSION,build:PERFECT_REPAIR.BUILD,release37:'PERFECT-37-20261017-1',user:perfectRepairPublicUser_(viewer),customers,vehicles,orders,services,workers,lazy109:scope,ranks110:ranks,summary:{todayRevenue:perfect40Can_(viewer,'finance.read')?revenue:null,latestOrders:orders.slice(0,10),centralCustomers:nc,centralVehicles:nv,centralOrders:all.length},timing31:{checkedAt:'',pending:false,unknown:0,error:''}};
}
