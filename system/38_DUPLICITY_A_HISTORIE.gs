/** PERFECT 38: porovnání celé uložené historie; žádný automatický výmaz. */
function perfectDuplicates38Headers_(){return ['PAIR_KEY','PAIR_VERSION','ACTION','KEPT_ORDER_ID','REMOVED_ORDER_ID','ACTOR_ID','ACTOR_USERNAME','DECIDED_AT','GMAIL_IDS_JSON',...PERFECT_DB_ORDER_HEADERS];}
function perfectDuplicates38Norm_(value){return String(value==null?'':value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function perfectDuplicates38Hash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');}
function perfectDuplicates38Fingerprint_(order){return perfectDuplicates38Hash_(JSON.stringify(PERFECT_DB_ORDER_HEADERS.map(function(k){var v=order[k];return v instanceof Date?v.toISOString():v==null?'':v;})));}
function perfectDuplicates38Shape_(o){
 var phone=databaseNormalizePhone_(o.TELEFON);
 return {order:o,id:String(o.ORDER_ID||'').trim(),date:gmailDateString_(o.DATUM_OBJEDNANI),time:gmailTimeString_(o.CAS_PRIJEZDU),phone:phone.length>=9?phone:'',email:String(o.EMAIL||'').trim().toLowerCase(),customer:String(o.CUSTOMER_ID||'').trim(),plate:perfectDuplicates38Norm_(o.SPZ),vehicle:perfectDuplicates38Norm_(o.VOZIDLO),vehicleId:String(o.VEHICLE_ID||'').trim(),gmail:String(o.GMAIL_MESSAGE_ID||'').trim()};
}
function perfectDuplicates38Pair_(a,b){
 if(!a.id||!b.id||a.id===b.id)return null;
 var source=a.gmail&&a.gmail===b.gmail;
 var contact=(a.phone&&a.phone===b.phone)||(a.email&&a.email===b.email)||(a.customer&&a.customer===b.customer);
 var vehicle=a.plate&&b.plate?a.plate===b.plate:((a.vehicleId&&a.vehicleId===b.vehicleId)||(a.vehicle&&a.vehicle===b.vehicle));
 if(!source&&!(a.date&&a.date===b.date&&contact&&vehicle))return null;
 var ordered=[a,b].sort(function(x,y){return x.id.localeCompare(y.id);});
 var same=!!(a.time&&a.time===b.time),reason=source?'Stejná zdrojová zpráva':same?'Stejný kontakt, vůz, datum a čas':'Stejný kontakt a vůz ve stejný den, jiný čas';
 return {key:perfectDuplicates38Hash_(JSON.stringify(ordered.map(function(x){return x.id;}))),version:perfectDuplicates38Hash_(JSON.stringify(ordered.map(function(x){return perfectDuplicates38Fingerprint_(x.order);}))),reason:reason,exact:!!(source||same),date:a.date,orders:ordered.map(function(x){return x.order;})};
}
function perfectDuplicates38Ledger_(create){
 var ss=perfectDatabaseGetSpreadsheet_(),sh=ss.getSheetByName('__PERFECT_DUPLICITY_ARCHIV');
 // Vytvoření a veškerý zápis vyhrazeny modulu 01.
 if(!sh)return null;
 var headers=sh.getRange(1,1,1,perfectDuplicates38Headers_().length).getValues()[0];
 if(headers.some(function(v,i){return String(v)!==perfectDuplicates38Headers_()[i];}))throw Error('Nesouhlasí hlavička archivu duplicit; rozhodnutí nebylo provedeno.');
 return sh;
}
function perfectDuplicates38Decisions_(){var sh=perfectDuplicates38Ledger_(false);return sh&&sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,perfectDuplicates38Headers_().length).getValues():[];}
function perfectDuplicates38ArchivedGmail_(){var ids={};perfectDuplicates38Decisions_().forEach(function(r){if(r[2]==='KEEP_BOTH')return;JSON.parse(r[8]||'[]').forEach(function(id){if(id)ids[String(id)]=String(r[3]||r[4]||'ARCHIVED');});});return ids;}
function perfectDuplicates38Scan_(options){
 options=options||{};var records=databaseGetAllOrders().map(perfectDuplicates38Shape_),buckets=new Map(),candidates=new Map();
 var decisions={};perfectDuplicates38Decisions_().forEach(function(r){if(r[2]==='KEEP_BOTH')decisions[String(r[0])]=String(r[1]);});
 // Index podle dne a kontaktu; neporovnáváme každou zakázku se všemi ostatními.
 records.forEach(function(o){var keys=[];if(o.gmail)keys.push('gmail:'+o.gmail);if(o.date){if(o.phone)keys.push(o.date+':phone:'+o.phone);if(o.email)keys.push(o.date+':email:'+o.email);if(o.customer)keys.push(o.date+':customer:'+o.customer);}
  keys.forEach(function(k){var bucket=buckets.get(k)||[];bucket.forEach(function(other){var pair=perfectDuplicates38Pair_(o,other);if(pair&&decisions[pair.key]!==pair.version)candidates.set(pair.key,pair);});bucket.push(o);buckets.set(k,bucket);});
 });
 var pairs=Array.from(candidates.values()).sort(function(a,b){return Number(b.exact)-Number(a.exact)||String(b.date).localeCompare(String(a.date))||a.key.localeCompare(b.key);}),total=pairs.length;
 var offset=Math.max(0,Math.floor(Number(options.offset)||0)),limit=Math.max(1,Math.min(50,Math.floor(Number(options.limit)||20)));
 return {success:true,total:total,scannedOrders:records.length,offset:offset,limit:limit,pairs:pairs.slice(offset,offset+limit)};
}
function perfect40Original_perfectDuplicates38List_(token,options){perfectRepairRequireUser_(token);return perfectRepairSerializable_(perfectDuplicates38Scan_(options));}
function perfect40Original_perfectDuplicates38Resolve_(token,payload){var actor=perfectAuthRequireAdmin_(token);return databaseDuplicates38Resolve_(payload||{},actor);}

/** V56: ověřený webový vstup, bez opisování čísel objednávek. */
function perfectDuplicates56RemoveSelected(token,payload){
 var actor=perfect40Require_(token,'duplicates.manage');
 return perfect40Trusted_(function(){
  var previousActor=perfect43Actor_;perfect43Actor_=actor;
  try{return databaseDuplicates56RemoveSelected_(payload||{},actor);}
  finally{perfect43Actor_=previousActor;}
 });
}
