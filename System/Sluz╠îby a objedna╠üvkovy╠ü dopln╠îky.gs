/** PERFECT ADDONS-V31. Nové názvy API: původní backend zůstává beze změny. */
function perfectAddons31Blank_(value) { return value===null||value===undefined||String(value).trim()===''; }
function perfectAddons31Extra_(type) { return ['DOPLNEK','ADDON'].indexOf(String(type))>=0; }
function perfectAddons31Money_(value,required) {
  if(perfectAddons31Blank_(value)){
    if(required)throw new Error('Vyplň cenu.');
    return null;
  }
  var s=String(value).trim().replace(/\s/g,'').replace(/Kč$/i,'').replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw new Error('Cena musí být nezáporné číslo s nejvýše dvěma desetinnými místy.');
  var parts=s.split('.'),cents=Number(parts[0])*100+Number(((parts[1]||'')+'00').slice(0,2));
  if(!Number.isSafeInteger(cents)||cents>100000000000)throw new Error('Cena je příliš vysoká.');
  return cents/100;
}
function perfect40Original_perfectWebGetServicesAddons31_(token) {
  perfectRepairRequireUser_(token);
  return databaseAddons31ReadServices_();
}
function perfect40Original_perfectWebSaveServiceAddons31_(token,payload) {
  var user=perfectRepairRequireUser_(token);
  perfect43Require_(token,'services.edit');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Chybí údaje služby.');
  var name=String(payload.NAZEV||'').trim(),type=String(payload.TYP||'PROGRAM');
  if(!name||name.length>100)throw new Error('Vyplň název služby do 100 znaků.');
  if(/^\s*=/.test(name))throw new Error('Název služby nesmí začínat znakem =.');
  if(['PROGRAM','DOPLNEK','ADDON','DETAILING'].indexOf(type)<0)throw new Error('Neplatný typ služby.');
  var price=perfectAddons31Money_(payload.CENA,!perfectAddons31Extra_(type));
  return databaseAddons31SaveService_({SERVICE_ID:String(payload.SERVICE_ID||''),NAZEV:name,TYP:type,CENA:price,
    BARVA:/^#[0-9a-f]{6}$/i.test(String(payload.BARVA))?String(payload.BARVA):'#bfe1f6',AKTIVNI:payload.AKTIVNI===true,META103:payload.META103,REVISION103:payload.REVISION103});
}
function perfectAddons31Pricing_(payload,original) {
  var services=databaseAddons31ReadServices_().filter(function(s){return s.AKTIVNI;});
  var previous=null;
  try{previous=original&&original.CENOVE_POLOZKY?JSON.parse(original.CENOVE_POLOZKY):null;}catch(e){}
  if(previous&&previous.legacyPricing===true)previous=null;
  if(previous&&(!previous.program||!Array.isArray(previous.addons)))throw new Error('Původní cenový rozpis nelze bezpečně přečíst.');
  var programId=String(payload.PROGRAM_ID||''),oldProgram=previous&&previous.program;
  var sameProgram=!!(oldProgram&&String(oldProgram.id||'')===programId);
  var program;
  if(programId){
    var selected=services.find(function(s){return s.SERVICE_ID===programId&&s.TYP==='PROGRAM';});
    if(!selected&&!sameProgram)throw new Error('Program není aktivní.');
    var source=sameProgram?oldProgram:{id:selected.SERVICE_ID,name:selected.NAZEV,price:selected.CENA};
    program={id:programId,name:String(source.name),price:perfectAddons31Money_(payload.CENA_PROGRAMU!==undefined?payload.CENA_PROGRAMU:source.price,true)};
  }else{
    var name=databaseSafeText_(payload.MYCI_PROGRAM);
    if(!name)throw new Error('Vyplň mycí program.');
    var baseValue=payload.CENA_PROGRAMU!==undefined?payload.CENA_PROGRAMU:sameProgram?oldProgram.price:payload.CENA_CELKEM;
    program={id:'',name:name,price:perfectAddons31Money_(baseValue,true)};
  }
  var ids=Array.from(new Set(Array.isArray(payload.ADDON_IDS)?payload.ADDON_IDS.map(String):[]));
  if(ids.length>100)throw new Error('Bylo vybráno příliš mnoho doplňků.');
  var overrides=payload.ADDON_PRICES;
  if(overrides!==undefined&&(!Array.isArray(overrides)||overrides.length>100))throw new Error('Neplatný cenový rozpis doplňků.');
  var prices=new Map();
  (overrides||[]).forEach(function(item){
    if(!item||typeof item!=='object'||typeof item.id!=='string'||ids.indexOf(item.id)<0||prices.has(item.id))throw new Error('Neplatná nebo duplicitní cena doplňku.');
    prices.set(item.id,perfectAddons31Money_(item.price,false));
  });
  var addons=ids.map(function(id){
    var old=previous&&previous.addons.find(function(a){return String(a.id)===id;});
    var service=services.find(function(s){return s.SERVICE_ID===id&&s.TYP!=='PROGRAM';});
    if(!service&&!old)throw new Error('Doplňková služba není aktivní.');
    var amount;
    if(prices.has(id))amount=prices.get(id);
    else if(old)amount=old.priceEntered===false?null:perfectAddons31Money_(old.price,false);
    else amount=service.CENA;
    return {id:id,name:String(old?old.name:service.NAZEV),price:amount===null?0:amount,priceEntered:amount!==null};
  });
  var dirt=payload.ZNECISTENI_20===true||payload.ZNECISTENI_20==='true';
  var base=Math.round(program.price*100),surcharge=dirt?Math.round(base*.2):0;
  var calculated=base+surcharge+addons.reduce(function(sum,a){return sum+Math.round(a.price*100);},0);
  if(!Number.isSafeInteger(calculated)||calculated>100000000000)throw new Error('Celková cena je příliš vysoká.');
  var manual=payload.MANUAL_TOTAL===true||payload.MANUAL_TOTAL==='true';
  var total=manual?perfectAddons31Money_(payload.CENA_CELKEM,true):calculated/100;
  var pricing=Object.assign({},previous||{}, {version:'ADDONS-V31',program:program,addons:addons,dirt:dirt,
    surcharge:surcharge/100,calculatedTotal:calculated/100,total:total,manualTotal:manual});
  return {CENA_PROGRAMU:base/100,ZNECISTENI_20:dirt,CENOVE_POLOZKY:JSON.stringify(pricing),CENA_CELKEM:total,
    MYCI_PROGRAM:program.name,DOPLNKY:addons.map(function(a){return a.name;}).join(', ')};
}
function perfect40Original_perfectWebCreateOrderAddons31_(token,payload) {
  perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();
  if(!payload||typeof payload!=='object')throw new Error('Chybí údaje objednávky.');
  var order=perfectShared33Payload_(payload);
  if(!order.TELEFON||!order.CAS_PRIJEZDU||!String(order.VOZIDLO||'').trim()||!order.DATUM_OBJEDNANI)throw new Error('Vyplň telefon, čas příjezdu, vozidlo a datum.');
  Object.assign(order,perfectAddons31Pricing_(payload,null));
  if(typeof generateOrderId!=='function')throw new Error('Chybí modul generátoru čísel zakázek.');
  delete order.ORDER_ID;order.PERFECT_WEB_GENERATE_ID='OFFLINE';order.PERFECT_WEB_REQUEST_ID=payload.REQUEST_ID||'';
  order.STAV_OBJEDNAVKY=order.STAV_OBJEDNAVKY||'ČEKÁ SE';
  perfectShared33Apply_(payload,order,null);
  var saved=databaseCreateOrder(order);
  var related=typeof perfectSpeedRelated_==='function'?perfectSpeedRelated_(saved):{};
  var view=typeof perfectTiming31View_==='function'?perfectTiming31View_(saved,databaseAddons31ReadServices_()):perfectRepairSerializable_(saved);
  return Object.assign({success:true,ORDER_ID:saved.ORDER_ID,order:view},related);
}
function perfect40Original_perfectWebUpdateOrderAddons31_(token,payload) {
  perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();
  if(!payload||typeof payload!=='object')throw new Error('Chybí údaje objednávky.');
  var id=String(payload.ORDER_ID||'').trim();if(!id)throw new Error('Chybí číslo zakázky.');
  var original=databaseFindOrderById(id);if(!original)throw new Error('Objednávka nebyla nalezena.');
  var order=perfectShared33Payload_(payload,original);
  if(payload.RECALCULATE_PRICING===true)Object.assign(order,perfectAddons31Pricing_(payload,original));
  // Bez cenové změny nepřepisujeme uložený součet ani rozpis.
  else ['CENOVE_POLOZKY','CENA_PROGRAMU','ZNECISTENI_20','CENA_CELKEM','DOPLNKY','MYCI_PROGRAM'].forEach(function(k){delete order[k];});
  ['ORDER_ID','CUSTOMER_ID','VEHICLE_ID','GMAIL_MESSAGE_ID'].forEach(function(k){delete order[k];});
  perfectShared33Apply_(payload,order,original);
  var saved=databaseUpdateOrder(id,order);
  var related=typeof perfectSpeedRelated_==='function'?perfectSpeedRelated_(saved):{};
  var view=typeof perfectTiming31View_==='function'?perfectTiming31View_(saved,databaseAddons31ReadServices_()):perfectRepairSerializable_(saved);
  return Object.assign({success:true,ORDER_ID:id,order:view},related);
}

/** Společná zakázka V33: jeden ORDER_ID, rozdělená tržba pro BOX 1 a BOX 2. */
function perfectShared33Worker_(value){return String(value||'')==='SPOLECNE';}
function perfectShared33Payload_(payload,original){
  if(!perfectShared33Worker_(payload&&payload.PRACOVNIK))return perfectRepairOrderPayload_(payload,original);
  var order=perfectRepairOrderPayload_(Object.assign({},payload,{PRACOVNIK:''}),original);
  order.PRACOVNIK='SPOLECNE';return order;
}
function perfectShared33Envelope_(order){
  if(!order||!order.CENOVE_POLOZKY)return null;
  var data;try{data=JSON.parse(order.CENOVE_POLOZKY);}catch(e){throw new Error('Cenový rozpis nelze přečíst.');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Neplatný cenový rozpis.');return data;
}
function perfectShared33Amounts_(split,total){
  if(!split||typeof split!=='object')throw new Error('Vyplň částku pro BOX 1 a BOX 2.');
  var box1=perfectAddons31Money_(split.box1,true),box2=perfectAddons31Money_(split.box2,true),price=perfectAddons31Money_(total,true);
  if(Math.round(box1*100)+Math.round(box2*100)!==Math.round(price*100))throw new Error('Součet BOXU 1 a BOXU 2 musí odpovídat celkové ceně objednávky.');
  return {version:1,box1:box1,box2:box2};
}
function perfectShared33Apply_(payload,order,original){
  var worker=Object.prototype.hasOwnProperty.call(order,'PRACOVNIK')?order.PRACOVNIK:original&&original.PRACOVNIK;
  var oldShared=perfectShared33Worker_(original&&original.PRACOVNIK);
  if(!perfectShared33Worker_(worker)&&!oldShared)return order;
  var data=perfectShared33Envelope_(order)||perfectShared33Envelope_(original);
  if(perfectShared33Worker_(worker)){
    var total=Object.prototype.hasOwnProperty.call(order,'CENA_CELKEM')?order.CENA_CELKEM:original&&original.CENA_CELKEM;
    var provided=Object.prototype.hasOwnProperty.call(payload,'BOX1_PRICE')||Object.prototype.hasOwnProperty.call(payload,'BOX2_PRICE');
    var split=provided?{box1:payload.BOX1_PRICE,box2:payload.BOX2_PRICE}:oldShared&&data&&data.boxSplit;
    split=perfectShared33Amounts_(split,total);
    if(!data)data={version:'BOX-SPLIT-V33',legacyPricing:true};
    data.boxSplit=split;order.CENOVE_POLOZKY=JSON.stringify(data);
  }else if(data&&data.boxSplit){
    delete data.boxSplit;
    order.CENOVE_POLOZKY=data.legacyPricing===true?'':JSON.stringify(data);
  }
  return order;
}
function perfectShared33Read_(order){
  if(!perfectShared33Worker_(order.PRACOVNIK))return null;
  try{var data=perfectShared33Envelope_(order),split=perfectShared33Amounts_(data&&data.boxSplit,order.CENA_CELKEM);return {valid:true,box1:split.box1,box2:split.box2};}
  catch(error){return {valid:false,error:String(error.message||error)};}
}
