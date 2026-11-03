/** PERFECT V36. Nová API; stávající backend ani jeho hesla se nepřepisují. */
function perfect36Admin_(token){var u=perfectRepairRequireUser_(token);perfect43Require_(token,'vouchers.manage');return u;}/** PERFECT V36. Nová API; stávající backend ani jeho hesla se nepřepisují. */
function perfect36Admin_(token){var u=perfectRepairRequireUser_(token);perfect43Require_(token,'vouchers.manage');return u;}
function perfect36Text_(v,max){var s=String(v==null?'':v).trim();if(s.length>(max||500))throw Error('Text je příliš dlouhý.');return s;}
function perfect36Request_(v){var s=String(v||'');if(!/^[a-zA-Z0-9-]{12,80}$/.test(s))throw Error('Chybí identifikátor uložení.');return s;}
function perfect36Cents_(v){var s=String(v==null?'':v).trim().replace(/\s|Kč/gi,'').replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('Částka musí být nezáporné číslo s nejvýše dvěma desetinnými místy.');var n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n>100000000)throw Error('Částka je příliš vysoká.');return n;}
function perfect36Day_(){return Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');}
function perfect36Date_(v,optional){var s=String(v||'').trim();if(!s&&optional)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Vyplň platné datum.');var d=new Date(s+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)throw Error('Datum neexistuje.');return s;}
function perfect36AddValidity_(date,count,unit){date=perfect36Date_(date);count=Number(count);if(!Number.isInteger(count)||count<1||count>3650)throw Error('Délka platnosti musí být od 1 do 3650.');var d=new Date(date+'T12:00:00Z');if(unit==='DAYS')d.setUTCDate(d.getUTCDate()+count);else if(unit==='MONTHS'){var day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+count);var last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));}else throw Error('Neplatná jednotka platnosti.');return d.toISOString().slice(0,10);}
function perfect36Name_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function perfect36Phone_(v){return databaseNormalizePhone_(v);}
function perfect36Match_(buyer,customers,orders){
 var phone=perfect36Phone_(buyer.phone),email=String(buyer.email||'').trim().toLowerCase();if(phone.length<9)phone='';if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))email='';
 var phoneRows=phone?customers.filter(function(c){return perfect36Phone_(c.TELEFON)===phone;}):[];
 var emailRows=email?customers.filter(function(c){return String(c.EMAIL||'').trim().toLowerCase()===email;}):[];
 var candidates=Array.from(new Set(phoneRows.concat(emailRows).map(function(c){return String(c.CUSTOMER_ID);}))).filter(Boolean);
 if(candidates.length!==1)return {customerId:'',linkState:candidates.length?'AMBIGUOUS':'NO_MATCH'};
 var id=candidates[0],visited=orders.some(function(o){var d=o.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(o.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(o.DATUM_OBJEDNANI||'').slice(0,10);return String(o.CUSTOMER_ID)===id&&perfect36Name_(o.STAV_OBJEDNAVKY)==='dokonceno'&&d&&d<=perfect36Day_();});
 return visited?{customerId:id,linkState:'CONTACT_MATCH'}:{customerId:'',linkState:'NO_VISIT'};
}
function perfect36Eligible_(id,orders){return orders.some(function(o){var d=o.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(o.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(o.DATUM_OBJEDNANI||'').slice(0,10);return String(o.CUSTOMER_ID)===String(id)&&perfect36Name_(o.STAV_OBJEDNAVKY)==='dokonceno'&&d&&d<=perfect36Day_();});}
function perfect36Status_(v){if(v.state==='CANCELLED')return 'ZRUŠENO';if(v.redeemed>=v.amount&&v.amount>0)return 'UPLATNĚNO';if(v.state==='UNSOLD')return 'NEPRODÁNO';if((v.issues||[]).length)return 'KE KONTROLE';if(!v.validFrom||!v.validTo)return 'KE KONTROLE';if(v.validFrom>perfect36Day_())return 'JEŠTĚ NEPLATÍ';if(v.validTo<perfect36Day_())return 'PO PLATNOSTI';return v.redeemed>0?'ČÁSTEČNĚ ČERPÁNO':'PLATNÝ';}
function perfect36View_(v){var o=Object.assign({},v);o.status=perfect36Status_(v);o.balance=Math.max(0,v.amount-v.redeemed);return o;}
function perfect40Original_perfectVoucher36Setup_(token){var u=perfect36Admin_(token);return databaseVoucher36Setup_(u.id);}
function perfectPripravitPoukazyV36_(){var r=databaseVoucher36Setup_('EDITOR');Logger.log(JSON.stringify(r));return r;}
function perfect40Original_perfectVoucher36List_(token,input){
 perfectRepairRequireUser_(token);input=input||{};var s=databaseVoucher36State_();if(!s.installed)return {success:true,installed:false,products:[],vouchers:[]};
 var customers=null,orders=null;var rows=Object.keys(s.vouchers).map(function(id){var v=s.vouchers[id];if(!v.customerId&&v.linkState!=='UNLINKED'&&(v.phone||v.email)){if(!customers){customers=databaseGetAllCustomers();orders=databaseGetAllOrders();}v=Object.assign({},v,perfect36Match_(v,customers,orders));}return perfect36View_(v);});
 if(input.customerId)rows=rows.filter(function(v){return v.customerId===String(input.customerId);});
 return {success:true,installed:true,products:Object.keys(s.products).map(function(id){return s.products[id];}),vouchers:rows};
}
function perfect40Original_perfectVoucher36SaveProduct_(token,p){var u=perfect36Admin_(token);p=p||{};var amount=perfect36Cents_(p.value);if(amount<=0)throw Error('Hodnota musí být vyšší než nula.');perfect36AddValidity_(perfect36Day_(),p.validityCount,p.validityUnit);var data={id:String(p.id||'GIFT_'+Utilities.getUuid()),amount:amount,name:perfect36Text_(p.name,100)||'Dárkový poukaz',validityCount:Number(p.validityCount),validityUnit:p.validityUnit,active:p.active===true};var image=String(p.imageUrl||'').trim();if(image&&(!/^https:\/\//i.test(image)||image.length>2000))throw Error('Obrázek musí mít platnou HTTPS adresu, nejvýše 2000 znaků.');return databaseVoucher36Change_('PRODUCT',data.id,p.version,p.requestId,u,'PRODUCT_SAVE',p,function(old,state){if(p.id&&!old)throw Error('Hodnota poukazu nebyla nalezena.');if(Object.keys(state.products).some(function(id){return id!==data.id&&state.products[id].active&&data.active&&state.products[id].amount===amount;}))throw Error('Aktivní poukaz s touto hodnotou už existuje.');data.imageUrl=p.imageUrl===undefined?String(old&&old.imageUrl||''):image;return data;});}
function perfect40Original_perfectVoucher36Issue_(token,p){var u=perfectRepairRequireUser_(token);p=p||{};var requested=perfect36Request_(p.requestId);return databaseVoucher36Change_('VOUCHER','NEW',0,requested,u,'ISSUE',p,function(old,s){
 var product=s.products[String(p.typeId)];if(!product||!product.active)throw Error('Vybraná hodnota není aktivní.');
 var from=perfect36Date_(p.validFrom),to=perfect36Date_(p.validTo||perfect36AddValidity_(from,product.validityCount,product.validityUnit));if(to<from)throw Error('Konec platnosti musí být po začátku.');
 var code=perfect36Text_(p.code,64)||('P'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase());if(!/^[a-zA-Z0-9-]{3,64}$/.test(code))throw Error('Kód musí obsahovat 3 až 64 písmen, číslic nebo pomlček.');
 if(Object.keys(s.vouchers).some(function(id){return s.vouchers[id].code.toUpperCase()===code.toUpperCase();}))throw Error('Tento kód už existuje.');
 var buyer={buyerName:perfect36Text_(p.buyerName,150),phone:perfect36Text_(p.phone,40),email:perfect36Text_(p.email,150),vehicle:perfect36Text_(p.vehicle,150),notes:perfect36Text_(p.notes,3000)};
 var match=perfect36Match_(buyer,databaseGetAllCustomers(),databaseGetAllOrders()),max=Object.keys(s.vouchers).reduce(function(n,id){return Math.max(n,Number(s.vouchers[id].number)||0);},0);
 return Object.assign(buyer,match,{id:'VCH_'+Utilities.getUuid(),number:max+1,typeId:product.id,amount:product.amount,code:code,validFrom:from,validTo:to,soldAt:perfect36Date_(p.soldAt||perfect36Day_()),paymentMethod:perfect36Text_(p.paymentMethod,100),paid:p.paid===''||p.paid==null?product.amount:perfect36Cents_(p.paid),redeemed:0,redeemedAt:'',state:'ISSUED',issues:[],validityCount:product.validityCount,validityUnit:product.validityUnit,createdAt:new Date().toISOString()});
 });}
function perfect40Original_perfectVoucher36Edit_(token,p){var u=perfect36Admin_(token);p=p||{};return databaseVoucher36Change_('VOUCHER',String(p.id),p.version,p.requestId,u,'EDIT',p,function(old,s){if(!old)throw Error('Poukaz nebyl nalezen.');var v=Object.assign({},old);['buyerName','phone','email','vehicle','notes','paymentMethod'].forEach(function(k){if(p[k]!==undefined)v[k]=perfect36Text_(p[k],k==='notes'?3000:150);});if(p.cancel!==true){v.validFrom=perfect36Date_(p.validFrom);v.validTo=perfect36Date_(p.validTo);if(v.validTo<v.validFrom)throw Error('Konec platnosti je před začátkem.');}if(p.value!==undefined&&p.cancel!==true){var amount=perfect36Cents_(p.value);if(amount<=0)throw Error('Hodnota musí být kladná.');if(old.redeemed>0&&amount!==old.amount)throw Error('Hodnotu již čerpaného poukazu nelze změnit.');if(old.amount===0&&old.redeemedAt)v.redeemed=amount;v.amount=amount;}
 if(p.cancel===true)v.state='CANCELLED';
 if(p.resolve===true){if(Object.keys(s.vouchers).some(function(id){var x=s.vouchers[id];return id!==v.id&&x.state!=='CANCELLED'&&x.code.toUpperCase()===v.code.toUpperCase();}))throw Error('Kód stále patří více nezrušeným poukazům.');v.issues=[];if(v.state!=='CANCELLED')v.state='ISSUED';}
 var orders=databaseGetAllOrders();if(p.customerId){if(!databaseFindCustomerById(p.customerId)||!perfect36Eligible_(p.customerId,orders))throw Error('Zákazník nemá dokončenou návštěvu.');v.customerId=String(p.customerId);v.linkState='MANUAL';}else if(p.customerId===''){v.customerId='';v.linkState='UNLINKED';}else Object.assign(v,perfect36Match_(v,databaseGetAllCustomers(),orders));return v;});}
function perfect40Original_perfectVoucher36Redeem_(token,p){var u=perfectRepairRequireUser_(token);p=p||{};var cents=perfect36Cents_(p.amount);if(cents<=0)throw Error('Vyplň kladnou částku čerpání.');return databaseVoucher36Change_('VOUCHER',String(p.id),p.version,p.requestId,u,'REDEEM',p,function(old,s){if(!old)throw Error('Poukaz nebyl nalezen.');var status=perfect36Status_(old);if(['PLATNÝ','ČÁSTEČNĚ ČERPÁNO'].indexOf(status)<0)throw Error('Poukaz nelze čerpat: '+status+'.');if(Object.keys(s.vouchers).some(function(id){return id!==old.id&&s.vouchers[id].state!=='CANCELLED'&&s.vouchers[id].code.toUpperCase()===old.code.toUpperCase();}))throw Error('Duplicitní kód vyžaduje kontrolu.');if(cents>old.amount-old.redeemed)throw Error('Částka překračuje zůstatek poukazu.');var orderId=perfect36Text_(p.orderId,80);if(orderId&&!databaseFindOrderById(orderId))throw Error('Zakázka nebyla nalezena.');return Object.assign({},old,{redeemed:old.redeemed+cents,redeemedAt:perfect36Day_(),lastOrderId:orderId,lastRedemption:cents});});}
function perfect40Original_perfectVoucher36History_(token,id){perfectRepairRequireUser_(token);var s=databaseVoucher36State_();return {success:true,events:s.events.filter(function(e){return e.entity==='VOUCHER'&&e.id===String(id);}).map(function(e){return {at:e.at,operation:e.operation,actor:e.actor,version:e.version,redeemed:e.data.redeemed,validTo:e.data.validTo,lastOrderId:e.data.lastOrderId||''};})};}
function perfect40Original_perfectVoucher36Art_(token){
 perfectRepairRequireUser_(token);var src=HtmlService.createHtmlOutputFromFile('PERFECT_Poukaz_Obrazek_1').getContent().replace(/\s/g,'');
 function complete(value){try{if(!/^data:image\/jpeg;base64,/.test(value))return false;var b=Utilities.base64Decode(value.split(',')[1]);return b.length>4&&(b[0]&255)===255&&(b[1]&255)===216&&(b[b.length-2]&255)===255&&(b[b.length-1]&255)===217;}catch(e){return false;}}
 if(!complete(src)){try{src+=HtmlService.createHtmlOutputFromFile('PERFECT_Poukaz_Obrazek_2').getContent().replace(/\s/g,'');}catch(e){}}
 if(!complete(src))throw Error('Podklad poukazu není úplný. Nahraj celý soubor PERFECT_Poukaz_Obrazek_1 z balíčku V40.');return {success:true,src:src};
}
function perfect40Original_perfectVoucher36ImportPreview_(token,p){perfect36Admin_(token);var parsed=perfectVoucher36ParseImport_(p&&p.text);return {success:true,hash:perfectRepairDigest_(String(p.text)),rows:parsed,counts:{total:parsed.length,review:parsed.filter(function(v){return v.issues.length;}).length,duplicates:parsed.filter(function(v){return v.issues.indexOf('DUPLICATE_CODE')>=0;}).length}};}
function perfect40Original_perfectVoucher36Import_(token,p){var u=perfect36Admin_(token);if(!p||p.hash!==perfectRepairDigest_(String(p.text)))throw Error('Náhled importu se změnil. Zopakuj kontrolu.');return databaseVoucher36Import_(perfectVoucher36ParseImport_(p.text),u,perfect36Request_(p.requestId));}
function perfectVoucher36ParseImport_(text){
 text=String(text||'');if(text.length>500000)throw Error('Import je příliš velký. Vlož nejvýše 500 kB.');var lines=text.replace(/\r/g,'').split('\n'),rows=[];
 function date(raw,issues,label){raw=String(raw||'').trim();if(!raw)return '';var m=/^(\d{1,2})[.,]\s*(\d{1,2})[.,]?\s*(\d{4})(?:\s*[Pp])?\.?$/.exec(raw);if(!m){issues.push(label+': neúplné datum');return '';}var s=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');try{return perfect36Date_(s);}catch(e){issues.push(label+': neplatné datum');return '';}}
 lines.forEach(function(line,index){if(!line.trim())return;var a=line.split('\t');if(/hodnota/i.test(a[1]||'')||/^číslo/i.test(a[0]||''))return;if(a.length<3)throw Error('Řádek '+(index+1)+' nemá sloupce oddělené tabulátory.');var issues=[],amount;try{amount=perfect36Cents_(a[1]);}catch(e){amount=0;issues.push('Chybí hodnota');}var code=String(a[2]||'').trim();if(!code)issues.push('Chybí kód');var notes=a.slice(7).join(' | ').trim(),sale=String(a[5]||'').trim(),used=String(a[6]||'').trim(),cancel=/zrus/.test(perfect36Name_(a.slice(3,7).join(' '))),from=cancel?'':date(a[3],issues,'Od'),to=cancel?'':date(a[4],issues,'Do');
 var redeemed=0,redeemedAt='',usedText=perfect36Name_(used),partial=/upl[^\d]*(\d[\d\s]*)\s*[,.-]/i.exec(used);
 if(partial){redeemed=Math.round(Number(partial[1].replace(/\s/g,''))*100);issues.push('Ověřit částečné čerpání');}
 else if(used&&!/prodlouz|marty|zrus/.test(usedText)){redeemedAt=date(used.replace(/\s*uplatn[eě]no\s*/ig,''),issues,'Uplatněno');if(redeemedAt||/uplatn/.test(usedText))redeemed=amount;else issues.push('Nejasné uplatnění');}
 if(redeemed>amount)issues.push('Čerpání je vyšší než hodnota');if(from&&to&&to<from)issues.push('Platnost končí před začátkem');if(redeemedAt&&from&&redeemedAt<from)issues.push('Čerpání před začátkem');if(redeemedAt>perfect36Day_())issues.push('Čerpání v budoucnu');
 var empty=!a.slice(3).some(function(v){return String(v||'').trim();});if(!empty&&!cancel&&(!from||!to)&&redeemed<amount)issues.push('Chybí úplná platnost');
 var phone=(notes.match(/(?:\+420\s*)?(?:\d[\s-]*){9}(?!\d)/)||[])[0]||'',email=(notes.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';
 rows.push({id:'VCH_'+Utilities.getUuid(),number:0,legacyNumber:String(a[0]||'').trim(),typeId:'',amount:amount,code:code,validFrom:from,validTo:to,soldAt:from,paymentMethod:sale,paid:null,redeemed:redeemed,redeemedAt:redeemedAt,state:cancel?'CANCELLED':empty?'UNSOLD':'ISSUED',issues:issues,buyerName:'',phone:phone.trim(),email:email,vehicle:'',notes:notes,customerId:'',linkState:'IMPORT_PENDING',sourceHash:perfectRepairDigest_(JSON.stringify(a)),sourceLine:index+1,raw:a});
 });if(rows.length>1000)throw Error('Importuj nejvýše 1000 řádků najednou.');var counts={};rows.forEach(function(v){var k=v.code.toUpperCase();counts[k]=(counts[k]||0)+1;});rows.forEach(function(v){if(counts[v.code.toUpperCase()]>1)v.issues.push('DUPLICATE_CODE');});return rows;
}
/** V36 oprava B: start čte existující ceník přímo a nevyžaduje doplňky V31. */
function perfect36ReadServices_(){
 var ss=perfectDatabaseGetSpreadsheet_(),sheet=ss.getSheetByName(PERFECT_REPAIR.SERVICES);
 if(!sheet)return [];
 var headers=['SERVICE_ID','NAZEV','TYP','CENA','BARVA','AKTIVNI'];
 var actual=sheet.getRange(1,1,1,headers.length).getValues()[0];
 if(headers.some(function(h,i){return String(actual[i])!==h;}))throw Error('Ceník má jiné hlavičky. Nic nebylo přepsáno.');
 if(sheet.getLastRow()<2)return [];
 return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues().filter(function(row){return row[0];}).map(function(row){
  var blank=row[3]===null||row[3]===undefined||String(row[3]).trim()==='';
  return {SERVICE_ID:String(row[0]),NAZEV:String(row[1]),TYP:String(row[2]),CENA:blank?null:perfectRepairMoney_(row[3]),BARVA:String(row[4]),AKTIVNI:row[5]===true||row[5]===1||/^(true|ano)$/i.test(String(row[5]))};
 });
}
/** Jedno ověření relace a jedna dávka dat. Při startu se do databáze nezapisuje. */
function perfect40Original_perfectWebBootstrap36_(token){
 var started=Date.now(),viewer=perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();
 var customers=perfectRepairSerializable_(databaseGetAllCustomers()).filter(function(c){return c.CUSTOMER_ID;});
 var vehicles=perfectRepairSerializable_(databaseGetAllVehicles()).filter(function(v){return v.VEHICLE_ID;});
 var services=perfect36ReadServices_(),hasTiming=typeof perfectTiming31View_==='function',waiting=0;
 var rawOrders101=databaseGetAllOrders(),revisions101={};rawOrders101.forEach(function(o){revisions101[String(o.ORDER_ID)]=perfect101RecordRevision_('orders',o);});
 customers.forEach(function(r){r.revision101=perfect101RecordRevision_('customers',r);});vehicles.forEach(function(r){r.revision101=perfect101RecordRevision_('vehicles',r);});
 var orders=rawOrders101.filter(function(order){return order.ORDER_ID;}).map(function(order){
  if(perfect36Name_(order.STAV_OBJEDNAVKY)==='ceka se'){
   waiting++;
   if(hasTiming)return perfectTiming31View_(order,services);
  }
  return perfectRepairSerializable_(order);
 });
 orders.forEach(function(o){o.revision101=revisions101[String(o.ORDER_ID)];});
 var today=perfect36Day_(),revenue=orders.reduce(function(sum,order){return String(order.DATUM_OBJEDNANI).slice(0,10)===today&&perfect36Name_(order.STAV_OBJEDNAVKY)==='dokonceno'?sum+Math.round(perfectRepairMoney_(order.CENA_CELKEM)*100):sum;},0)/100;
 return {success:true,version:PERFECT_REPAIR.VERSION,build:PERFECT_REPAIR.BUILD,user:perfectRepairPublicUser_(viewer),customers:customers,vehicles:vehicles,orders:orders,services:services,workers:perfectWebGetWorkers(token),release37:'PERFECT-37-20261017-1',
  summary:{todayRevenue:perfect40Can_(viewer,'finance.read')?revenue:null,latestOrders:orders.slice().sort(function(a,b){return String(b.DATUM_OBJEDNANI).localeCompare(String(a.DATUM_OBJEDNANI));}).slice(0,10),centralCustomers:customers.length,centralVehicles:vehicles.length,centralOrders:orders.length,historicalCustomersAddedToView:0,historicalVehiclesAddedToView:0},
  timing31:{checkedAt:'',pending:hasTiming,unknown:hasTiming?0:waiting,error:hasTiming?'':'Chybí modul časování V31. Data zakázek jsou načtená; automatické dokončení není dostupné.'},
  performance36:{serverMs:Date.now()-started,repair:'BOOTSTRAP-20261016-B'}};
}
/** PBKDF2-HMAC-SHA256. Stejné bajty a iterace jako původní Utilities implementace. */
function perfect36Password_(password,salt,iterations){
 var K=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
 var init=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225],w=new Int32Array(64);
 function rr(x,n){return (x>>>n)|(x<<(32-n));}
 function block(h,bytes,off){var i;for(i=0;i<16;i++){var p=off+i*4;w[i]=(bytes[p]<<24)|(bytes[p+1]<<16)|(bytes[p+2]<<8)|bytes[p+3];}for(i=16;i<64;i++){var x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rr(x,7)^rr(x,18)^(x>>>3))+w[i-7]+(rr(y,17)^rr(y,19)^(y>>>10)))|0;}var a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];for(i=0;i<64;i++){var t1=(hh+(rr(e,6)^rr(e,11)^rr(e,25))+((e&f)^(~e&g))+K[i]+w[i])|0,t2=((rr(a,2)^rr(a,13)^rr(a,22))+((a&b)^(a&c)^(b&c)))|0;hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}h[0]=(h[0]+a)|0;h[1]=(h[1]+b)|0;h[2]=(h[2]+c)|0;h[3]=(h[3]+d)|0;h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+hh)|0;}
 function finish(state,data,prefix){var h=state.slice(),length=data.length,total=length+prefix,buf=new Uint8Array(Math.ceil((length+9)/64)*64);buf.set(data);buf[length]=128;var bits=total*8;for(var i=0;i<8;i++){buf[buf.length-1-i]=bits%256;bits=Math.floor(bits/256);}for(var off=0;off<buf.length;off+=64)block(h,buf,off);var out=new Uint8Array(32);for(var j=0;j<8;j++){out[j*4]=h[j]>>>24;out[j*4+1]=h[j]>>>16;out[j*4+2]=h[j]>>>8;out[j*4+3]=h[j];}return out;}
 function utf8(s){return new Uint8Array(Utilities.newBlob(String(s)).getBytes().map(function(x){return x&255;}));}
 var key=utf8(password);if(key.length>64)key=finish(init,key,0);var inner=new Uint8Array(64),outer=new Uint8Array(64);for(var i=0;i<64;i++){inner[i]=(key[i]||0)^54;outer[i]=(key[i]||0)^92;}var ih=init.slice(),oh=init.slice();block(ih,inner,0);block(oh,outer,0);function hmac(data){return finish(oh,finish(ih,data,64),64);}
 iterations=Number(iterations);if(!Number.isInteger(iterations)||iterations<1||iterations>1000000)throw Error('Neplatné nastavení hesla.');var sb=utf8(salt),first=new Uint8Array(sb.length+4);first.set(sb);first[first.length-1]=1;var u=hmac(first),result=u.slice();for(var n=1;n<iterations;n++){u=hmac(u);for(var j=0;j<32;j++)result[j]^=u[j];}return Array.prototype.map.call(result,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
}
function perfect40Original_perfectAuthLoginFast36_(username,password){
 username=String(username||'').trim().toLowerCase();password=String(password||'');if(!username||username.length>64||password.length>128)throw Error('Nesprávné jméno nebo heslo.');
 return perfectRepairLock_(function(){var p=perfectRepairProps_(),failureKey='PERFECT_REPAIR_FAILURE_'+perfectRepairDigest_(username),f=JSON.parse(p.getProperty(failureKey)||'{"count":0,"until":0}');if(f.until>Date.now()&&f.count>=5)throw Error('Příliš mnoho pokusů. Počkej 15 minut.');if(f.until<Date.now())f={count:0,until:Date.now()+15*60*1000};var u=perfectRepairUsers_().find(function(x){return x.username.toLowerCase()===username;});if(!u||u.active===false||!perfectRepairEqual_(u.passwordHash,perfect36Password_(password,u.salt,u.iterations))){f.count++;p.setProperty(failureKey,JSON.stringify(f));throw Error('Nesprávné jméno nebo heslo.');}p.deleteProperty(failureKey);var token=perfectRepairRandom_(),all=p.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){try{var s=JSON.parse(all[k]);if(!Number.isFinite(s.expires)||s.expires<=Date.now())p.deleteProperty(k);}catch(e){p.deleteProperty(k);}});p.setProperty('PERFECT_REPAIR_SESSION_'+perfectRepairDigest_(token),JSON.stringify({userId:u.id,expires:Date.now()+8*60*60*1000}));return {token:token,user:perfectRepairPublicUser_(u)};});
}

function perfect36Text_(v,max){var s=String(v==null?'':v).trim();if(s.length>(max||500))throw Error('Text je příliš dlouhý.');return s;}
function perfect36Request_(v){var s=String(v||'');if(!/^[a-zA-Z0-9-]{12,80}$/.test(s))throw Error('Chybí identifikátor uložení.');return s;}
function perfect36Cents_(v){var s=String(v==null?'':v).trim().replace(/\s|Kč/gi,'').replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('Částka musí být nezáporné číslo s nejvýše dvěma desetinnými místy.');var n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n>100000000)throw Error('Částka je příliš vysoká.');return n;}
function perfect36Day_(){return Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');}
function perfect36Date_(v,optional){var s=String(v||'').trim();if(!s&&optional)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Vyplň platné datum.');var d=new Date(s+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)throw Error('Datum neexistuje.');return s;}
function perfect36AddValidity_(date,count,unit){date=perfect36Date_(date);count=Number(count);if(!Number.isInteger(count)||count<1||count>3650)throw Error('Délka platnosti musí být od 1 do 3650.');var d=new Date(date+'T12:00:00Z');if(unit==='DAYS')d.setUTCDate(d.getUTCDate()+count);else if(unit==='MONTHS'){var day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+count);var last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));}else throw Error('Neplatná jednotka platnosti.');return d.toISOString().slice(0,10);}
function perfect36Name_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function perfect36Phone_(v){return databaseNormalizePhone_(v);}
function perfect36Match_(buyer,customers,orders){
 var phone=perfect36Phone_(buyer.phone),email=String(buyer.email||'').trim().toLowerCase();if(phone.length<9)phone='';if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))email='';
 var phoneRows=phone?customers.filter(function(c){return perfect36Phone_(c.TELEFON)===phone;}):[];
 var emailRows=email?customers.filter(function(c){return String(c.EMAIL||'').trim().toLowerCase()===email;}):[];
 var candidates=Array.from(new Set(phoneRows.concat(emailRows).map(function(c){return String(c.CUSTOMER_ID);}))).filter(Boolean);
 if(candidates.length!==1)return {customerId:'',linkState:candidates.length?'AMBIGUOUS':'NO_MATCH'};
 var id=candidates[0],visited=orders.some(function(o){var d=o.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(o.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(o.DATUM_OBJEDNANI||'').slice(0,10);return String(o.CUSTOMER_ID)===id&&perfect36Name_(o.STAV_OBJEDNAVKY)==='dokonceno'&&d&&d<=perfect36Day_();});
 return visited?{customerId:id,linkState:'CONTACT_MATCH'}:{customerId:'',linkState:'NO_VISIT'};
}
function perfect36Eligible_(id,orders){return orders.some(function(o){var d=o.DATUM_OBJEDNANI instanceof Date?Utilities.formatDate(o.DATUM_OBJEDNANI,'Europe/Prague','yyyy-MM-dd'):String(o.DATUM_OBJEDNANI||'').slice(0,10);return String(o.CUSTOMER_ID)===String(id)&&perfect36Name_(o.STAV_OBJEDNAVKY)==='dokonceno'&&d&&d<=perfect36Day_();});}
function perfect36Status_(v){if(v.state==='CANCELLED')return 'ZRUŠENO';if(v.redeemed>=v.amount&&v.amount>0)return 'UPLATNĚNO';if(v.state==='UNSOLD')return 'NEPRODÁNO';if((v.issues||[]).length)return 'KE KONTROLE';if(!v.validFrom||!v.validTo)return 'KE KONTROLE';if(v.validFrom>perfect36Day_())return 'JEŠTĚ NEPLATÍ';if(v.validTo<perfect36Day_())return 'PO PLATNOSTI';return v.redeemed>0?'ČÁSTEČNĚ ČERPÁNO':'PLATNÝ';}
function perfect36View_(v){var o=Object.assign({},v);o.status=perfect36Status_(v);o.balance=Math.max(0,v.amount-v.redeemed);return o;}
function perfect40Original_perfectVoucher36Setup_(token){var u=perfect36Admin_(token);return databaseVoucher36Setup_(u.id);}
function perfectPripravitPoukazyV36_(){var r=databaseVoucher36Setup_('EDITOR');Logger.log(JSON.stringify(r));return r;}
function perfect40Original_perfectVoucher36List_(token,input){
 perfectRepairRequireUser_(token);input=input||{};var s=databaseVoucher36State_();if(!s.installed)return {success:true,installed:false,products:[],vouchers:[]};
 var customers=null,orders=null;var rows=Object.keys(s.vouchers).map(function(id){var v=s.vouchers[id];if(!v.customerId&&v.linkState!=='UNLINKED'&&(v.phone||v.email)){if(!customers){customers=databaseGetAllCustomers();orders=databaseGetAllOrders();}v=Object.assign({},v,perfect36Match_(v,customers,orders));}return perfect36View_(v);});
 if(input.customerId)rows=rows.filter(function(v){return v.customerId===String(input.customerId);});
 return {success:true,installed:true,products:Object.keys(s.products).map(function(id){return s.products[id];}),vouchers:rows};
}
function perfect40Original_perfectVoucher36SaveProduct_(token,p){var u=perfect36Admin_(token);p=p||{};var amount=perfect36Cents_(p.value);if(amount<=0)throw Error('Hodnota musí být vyšší než nula.');perfect36AddValidity_(perfect36Day_(),p.validityCount,p.validityUnit);var data={id:String(p.id||'GIFT_'+Utilities.getUuid()),amount:amount,name:perfect36Text_(p.name,100)||'Dárkový poukaz',validityCount:Number(p.validityCount),validityUnit:p.validityUnit,active:p.active===true};var image=String(p.imageUrl||'').trim();if(image&&(!/^https:\/\//i.test(image)||image.length>2000))throw Error('Obrázek musí mít platnou HTTPS adresu, nejvýše 2000 znaků.');return databaseVoucher36Change_('PRODUCT',data.id,p.version,p.requestId,u,'PRODUCT_SAVE',p,function(old,state){if(p.id&&!old)throw Error('Hodnota poukazu nebyla nalezena.');if(Object.keys(state.products).some(function(id){return id!==data.id&&state.products[id].active&&data.active&&state.products[id].amount===amount;}))throw Error('Aktivní poukaz s touto hodnotou už existuje.');data.imageUrl=p.imageUrl===undefined?String(old&&old.imageUrl||''):image;return data;});}
function perfect40Original_perfectVoucher36Issue_(token,p){var u=perfectRepairRequireUser_(token);p=p||{};var requested=perfect36Request_(p.requestId);return databaseVoucher36Change_('VOUCHER','NEW',0,requested,u,'ISSUE',p,function(old,s){
 var product=s.products[String(p.typeId)];if(!product||!product.active)throw Error('Vybraná hodnota není aktivní.');
 var from=perfect36Date_(p.validFrom),to=perfect36Date_(p.validTo||perfect36AddValidity_(from,product.validityCount,product.validityUnit));if(to<from)throw Error('Konec platnosti musí být po začátku.');
 var code=perfect36Text_(p.code,64)||('P'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase());if(!/^[a-zA-Z0-9-]{3,64}$/.test(code))throw Error('Kód musí obsahovat 3 až 64 písmen, číslic nebo pomlček.');
 if(Object.keys(s.vouchers).some(function(id){return s.vouchers[id].code.toUpperCase()===code.toUpperCase();}))throw Error('Tento kód už existuje.');
 var buyer={buyerName:perfect36Text_(p.buyerName,150),phone:perfect36Text_(p.phone,40),email:perfect36Text_(p.email,150),vehicle:perfect36Text_(p.vehicle,150),notes:perfect36Text_(p.notes,3000)};
 var match=perfect36Match_(buyer,databaseGetAllCustomers(),databaseGetAllOrders()),max=Object.keys(s.vouchers).reduce(function(n,id){return Math.max(n,Number(s.vouchers[id].number)||0);},0);
 return Object.assign(buyer,match,{id:'VCH_'+Utilities.getUuid(),number:max+1,typeId:product.id,amount:product.amount,code:code,validFrom:from,validTo:to,soldAt:perfect36Date_(p.soldAt||perfect36Day_()),paymentMethod:perfect36Text_(p.paymentMethod,100),paid:p.paid===''||p.paid==null?product.amount:perfect36Cents_(p.paid),redeemed:0,redeemedAt:'',state:'ISSUED',issues:[],validityCount:product.validityCount,validityUnit:product.validityUnit,createdAt:new Date().toISOString()});
 });}
function perfect40Original_perfectVoucher36Edit_(token,p){var u=perfect36Admin_(token);p=p||{};return databaseVoucher36Change_('VOUCHER',String(p.id),p.version,p.requestId,u,'EDIT',p,function(old,s){if(!old)throw Error('Poukaz nebyl nalezen.');var v=Object.assign({},old);['buyerName','phone','email','vehicle','notes','paymentMethod'].forEach(function(k){if(p[k]!==undefined)v[k]=perfect36Text_(p[k],k==='notes'?3000:150);});if(p.cancel!==true){v.validFrom=perfect36Date_(p.validFrom);v.validTo=perfect36Date_(p.validTo);if(v.validTo<v.validFrom)throw Error('Konec platnosti je před začátkem.');}if(p.value!==undefined&&p.cancel!==true){var amount=perfect36Cents_(p.value);if(amount<=0)throw Error('Hodnota musí být kladná.');if(old.redeemed>0&&amount!==old.amount)throw Error('Hodnotu již čerpaného poukazu nelze změnit.');if(old.amount===0&&old.redeemedAt)v.redeemed=amount;v.amount=amount;}
 if(p.cancel===true)v.state='CANCELLED';
 if(p.resolve===true){if(Object.keys(s.vouchers).some(function(id){var x=s.vouchers[id];return id!==v.id&&x.state!=='CANCELLED'&&x.code.toUpperCase()===v.code.toUpperCase();}))throw Error('Kód stále patří více nezrušeným poukazům.');v.issues=[];if(v.state!=='CANCELLED')v.state='ISSUED';}
 var orders=databaseGetAllOrders();if(p.customerId){if(!databaseFindCustomerById(p.customerId)||!perfect36Eligible_(p.customerId,orders))throw Error('Zákazník nemá dokončenou návštěvu.');v.customerId=String(p.customerId);v.linkState='MANUAL';}else if(p.customerId===''){v.customerId='';v.linkState='UNLINKED';}else Object.assign(v,perfect36Match_(v,databaseGetAllCustomers(),orders));return v;});}
function perfect40Original_perfectVoucher36Redeem_(token,p){var u=perfectRepairRequireUser_(token);p=p||{};var cents=perfect36Cents_(p.amount);if(cents<=0)throw Error('Vyplň kladnou částku čerpání.');return databaseVoucher36Change_('VOUCHER',String(p.id),p.version,p.requestId,u,'REDEEM',p,function(old,s){if(!old)throw Error('Poukaz nebyl nalezen.');var status=perfect36Status_(old);if(['PLATNÝ','ČÁSTEČNĚ ČERPÁNO'].indexOf(status)<0)throw Error('Poukaz nelze čerpat: '+status+'.');if(Object.keys(s.vouchers).some(function(id){return id!==old.id&&s.vouchers[id].state!=='CANCELLED'&&s.vouchers[id].code.toUpperCase()===old.code.toUpperCase();}))throw Error('Duplicitní kód vyžaduje kontrolu.');if(cents>old.amount-old.redeemed)throw Error('Částka překračuje zůstatek poukazu.');var orderId=perfect36Text_(p.orderId,80);if(orderId&&!databaseFindOrderById(orderId))throw Error('Zakázka nebyla nalezena.');return Object.assign({},old,{redeemed:old.redeemed+cents,redeemedAt:perfect36Day_(),lastOrderId:orderId,lastRedemption:cents});});}
function perfect40Original_perfectVoucher36History_(token,id){perfectRepairRequireUser_(token);var s=databaseVoucher36State_();return {success:true,events:s.events.filter(function(e){return e.entity==='VOUCHER'&&e.id===String(id);}).map(function(e){return {at:e.at,operation:e.operation,actor:e.actor,version:e.version,redeemed:e.data.redeemed,validTo:e.data.validTo,lastOrderId:e.data.lastOrderId||''};})};}
function perfect40Original_perfectVoucher36Art_(token){
 perfectRepairRequireUser_(token);var src=HtmlService.createHtmlOutputFromFile('PERFECT_Poukaz_Obrazek_1').getContent().replace(/\s/g,'');
 function complete(value){try{if(!/^data:image\/jpeg;base64,/.test(value))return false;var b=Utilities.base64Decode(value.split(',')[1]);return b.length>4&&(b[0]&255)===255&&(b[1]&255)===216&&(b[b.length-2]&255)===255&&(b[b.length-1]&255)===217;}catch(e){return false;}}
 if(!complete(src)){try{src+=HtmlService.createHtmlOutputFromFile('PERFECT_Poukaz_Obrazek_2').getContent().replace(/\s/g,'');}catch(e){}}
 if(!complete(src))throw Error('Podklad poukazu není úplný. Nahraj celý soubor PERFECT_Poukaz_Obrazek_1 z balíčku V40.');return {success:true,src:src};
}
function perfect40Original_perfectVoucher36ImportPreview_(token,p){perfect36Admin_(token);var parsed=perfectVoucher36ParseImport_(p&&p.text);return {success:true,hash:perfectRepairDigest_(String(p.text)),rows:parsed,counts:{total:parsed.length,review:parsed.filter(function(v){return v.issues.length;}).length,duplicates:parsed.filter(function(v){return v.issues.indexOf('DUPLICATE_CODE')>=0;}).length}};}
function perfect40Original_perfectVoucher36Import_(token,p){var u=perfect36Admin_(token);if(!p||p.hash!==perfectRepairDigest_(String(p.text)))throw Error('Náhled importu se změnil. Zopakuj kontrolu.');return databaseVoucher36Import_(perfectVoucher36ParseImport_(p.text),u,perfect36Request_(p.requestId));}
function perfectVoucher36ParseImport_(text){
 text=String(text||'');if(text.length>500000)throw Error('Import je příliš velký. Vlož nejvýše 500 kB.');var lines=text.replace(/\r/g,'').split('\n'),rows=[];
 function date(raw,issues,label){raw=String(raw||'').trim();if(!raw)return '';var m=/^(\d{1,2})[.,]\s*(\d{1,2})[.,]?\s*(\d{4})(?:\s*[Pp])?\.?$/.exec(raw);if(!m){issues.push(label+': neúplné datum');return '';}var s=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');try{return perfect36Date_(s);}catch(e){issues.push(label+': neplatné datum');return '';}}
 lines.forEach(function(line,index){if(!line.trim())return;var a=line.split('\t');if(/hodnota/i.test(a[1]||'')||/^číslo/i.test(a[0]||''))return;if(a.length<3)throw Error('Řádek '+(index+1)+' nemá sloupce oddělené tabulátory.');var issues=[],amount;try{amount=perfect36Cents_(a[1]);}catch(e){amount=0;issues.push('Chybí hodnota');}var code=String(a[2]||'').trim();if(!code)issues.push('Chybí kód');var notes=a.slice(7).join(' | ').trim(),sale=String(a[5]||'').trim(),used=String(a[6]||'').trim(),cancel=/zrus/.test(perfect36Name_(a.slice(3,7).join(' '))),from=cancel?'':date(a[3],issues,'Od'),to=cancel?'':date(a[4],issues,'Do');
 var redeemed=0,redeemedAt='',usedText=perfect36Name_(used),partial=/upl[^\d]*(\d[\d\s]*)\s*[,.-]/i.exec(used);
 if(partial){redeemed=Math.round(Number(partial[1].replace(/\s/g,''))*100);issues.push('Ověřit částečné čerpání');}
 else if(used&&!/prodlouz|marty|zrus/.test(usedText)){redeemedAt=date(used.replace(/\s*uplatn[eě]no\s*/ig,''),issues,'Uplatněno');if(redeemedAt||/uplatn/.test(usedText))redeemed=amount;else issues.push('Nejasné uplatnění');}
 if(redeemed>amount)issues.push('Čerpání je vyšší než hodnota');if(from&&to&&to<from)issues.push('Platnost končí před začátkem');if(redeemedAt&&from&&redeemedAt<from)issues.push('Čerpání před začátkem');if(redeemedAt>perfect36Day_())issues.push('Čerpání v budoucnu');
 var empty=!a.slice(3).some(function(v){return String(v||'').trim();});if(!empty&&!cancel&&(!from||!to)&&redeemed<amount)issues.push('Chybí úplná platnost');
 var phone=(notes.match(/(?:\+420\s*)?(?:\d[\s-]*){9}(?!\d)/)||[])[0]||'',email=(notes.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';
 rows.push({id:'VCH_'+Utilities.getUuid(),number:0,legacyNumber:String(a[0]||'').trim(),typeId:'',amount:amount,code:code,validFrom:from,validTo:to,soldAt:from,paymentMethod:sale,paid:null,redeemed:redeemed,redeemedAt:redeemedAt,state:cancel?'CANCELLED':empty?'UNSOLD':'ISSUED',issues:issues,buyerName:'',phone:phone.trim(),email:email,vehicle:'',notes:notes,customerId:'',linkState:'IMPORT_PENDING',sourceHash:perfectRepairDigest_(JSON.stringify(a)),sourceLine:index+1,raw:a});
 });if(rows.length>1000)throw Error('Importuj nejvýše 1000 řádků najednou.');var counts={};rows.forEach(function(v){var k=v.code.toUpperCase();counts[k]=(counts[k]||0)+1;});rows.forEach(function(v){if(counts[v.code.toUpperCase()]>1)v.issues.push('DUPLICATE_CODE');});return rows;
}
/** V36 oprava B: start čte existující ceník přímo a nevyžaduje doplňky V31. */
function perfect36ReadServices_(){
 var ss=perfectDatabaseGetSpreadsheet_(),sheet=ss.getSheetByName(PERFECT_REPAIR.SERVICES);
 if(!sheet)return [];
 var headers=['SERVICE_ID','NAZEV','TYP','CENA','BARVA','AKTIVNI'];
 var actual=sheet.getRange(1,1,1,headers.length).getValues()[0];
 if(headers.some(function(h,i){return String(actual[i])!==h;}))throw Error('Ceník má jiné hlavičky. Nic nebylo přepsáno.');
 if(sheet.getLastRow()<2)return [];
 return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues().filter(function(row){return row[0];}).map(function(row){
  var blank=row[3]===null||row[3]===undefined||String(row[3]).trim()==='';
  return {SERVICE_ID:String(row[0]),NAZEV:String(row[1]),TYP:String(row[2]),CENA:blank?null:perfectRepairMoney_(row[3]),BARVA:String(row[4]),AKTIVNI:row[5]===true||row[5]===1||/^(true|ano)$/i.test(String(row[5]))};
 });
}
/** Jedno ověření relace a jedna dávka dat. Při startu se do databáze nezapisuje. */
function perfect40Original_perfectWebBootstrap36_(token){
 var started=Date.now(),viewer=perfectRepairRequireUser_(token);perfectRepairCheckDatabase_();
 var customers=perfectRepairSerializable_(databaseGetAllCustomers()).filter(function(c){return c.CUSTOMER_ID;});
 var vehicles=perfectRepairSerializable_(databaseGetAllVehicles()).filter(function(v){return v.VEHICLE_ID;});
 var services=perfect36ReadServices_(),hasTiming=typeof perfectTiming31View_==='function',waiting=0;
 var rawOrders101=databaseGetAllOrders(),revisions101={};rawOrders101.forEach(function(o){revisions101[String(o.ORDER_ID)]=perfect101RecordRevision_('orders',o);});
 customers.forEach(function(r){r.revision101=perfect101RecordRevision_('customers',r);});vehicles.forEach(function(r){r.revision101=perfect101RecordRevision_('vehicles',r);});
 var orders=rawOrders101.filter(function(order){return order.ORDER_ID;}).map(function(order){
  if(perfect36Name_(order.STAV_OBJEDNAVKY)==='ceka se'){
   waiting++;
   if(hasTiming)return perfectTiming31View_(order,services);
  }
  return perfectRepairSerializable_(order);
 });
 orders.forEach(function(o){o.revision101=revisions101[String(o.ORDER_ID)];});
 var today=perfect36Day_(),revenue=orders.reduce(function(sum,order){return String(order.DATUM_OBJEDNANI).slice(0,10)===today&&perfect36Name_(order.STAV_OBJEDNAVKY)==='dokonceno'?sum+Math.round(perfectRepairMoney_(order.CENA_CELKEM)*100):sum;},0)/100;
 return {success:true,version:PERFECT_REPAIR.VERSION,build:PERFECT_REPAIR.BUILD,user:perfectRepairPublicUser_(viewer),customers:customers,vehicles:vehicles,orders:orders,services:services,workers:perfectWebGetWorkers(token),release37:'PERFECT-37-20261017-1',
  summary:{todayRevenue:perfect40Can_(viewer,'finance.read')?revenue:null,latestOrders:orders.slice().sort(function(a,b){return String(b.DATUM_OBJEDNANI).localeCompare(String(a.DATUM_OBJEDNANI));}).slice(0,10),centralCustomers:customers.length,centralVehicles:vehicles.length,centralOrders:orders.length,historicalCustomersAddedToView:0,historicalVehiclesAddedToView:0},
  timing31:{checkedAt:'',pending:hasTiming,unknown:hasTiming?0:waiting,error:hasTiming?'':'Chybí modul časování V31. Data zakázek jsou načtená; automatické dokončení není dostupné.'},
  performance36:{serverMs:Date.now()-started,repair:'BOOTSTRAP-20261016-B'}};
}
/** PBKDF2-HMAC-SHA256. Stejné bajty a iterace jako původní Utilities implementace. */
function perfect36Password_(password,salt,iterations){
 var K=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
 var init=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225],w=new Int32Array(64);
 function rr(x,n){return (x>>>n)|(x<<(32-n));}
 function block(h,bytes,off){var i;for(i=0;i<16;i++){var p=off+i*4;w[i]=(bytes[p]<<24)|(bytes[p+1]<<16)|(bytes[p+2]<<8)|bytes[p+3];}for(i=16;i<64;i++){var x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rr(x,7)^rr(x,18)^(x>>>3))+w[i-7]+(rr(y,17)^rr(y,19)^(y>>>10)))|0;}var a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];for(i=0;i<64;i++){var t1=(hh+(rr(e,6)^rr(e,11)^rr(e,25))+((e&f)^(~e&g))+K[i]+w[i])|0,t2=((rr(a,2)^rr(a,13)^rr(a,22))+((a&b)^(a&c)^(b&c)))|0;hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}h[0]=(h[0]+a)|0;h[1]=(h[1]+b)|0;h[2]=(h[2]+c)|0;h[3]=(h[3]+d)|0;h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+hh)|0;}
 function finish(state,data,prefix){var h=state.slice(),length=data.length,total=length+prefix,buf=new Uint8Array(Math.ceil((length+9)/64)*64);buf.set(data);buf[length]=128;var bits=total*8;for(var i=0;i<8;i++){buf[buf.length-1-i]=bits%256;bits=Math.floor(bits/256);}for(var off=0;off<buf.length;off+=64)block(h,buf,off);var out=new Uint8Array(32);for(var j=0;j<8;j++){out[j*4]=h[j]>>>24;out[j*4+1]=h[j]>>>16;out[j*4+2]=h[j]>>>8;out[j*4+3]=h[j];}return out;}
 function utf8(s){return new Uint8Array(Utilities.newBlob(String(s)).getBytes().map(function(x){return x&255;}));}
 var key=utf8(password);if(key.length>64)key=finish(init,key,0);var inner=new Uint8Array(64),outer=new Uint8Array(64);for(var i=0;i<64;i++){inner[i]=(key[i]||0)^54;outer[i]=(key[i]||0)^92;}var ih=init.slice(),oh=init.slice();block(ih,inner,0);block(oh,outer,0);function hmac(data){return finish(oh,finish(ih,data,64),64);}
 iterations=Number(iterations);if(!Number.isInteger(iterations)||iterations<1||iterations>1000000)throw Error('Neplatné nastavení hesla.');var sb=utf8(salt),first=new Uint8Array(sb.length+4);first.set(sb);first[first.length-1]=1;var u=hmac(first),result=u.slice();for(var n=1;n<iterations;n++){u=hmac(u);for(var j=0;j<32;j++)result[j]^=u[j];}return Array.prototype.map.call(result,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
}
function perfect40Original_perfectAuthLoginFast36_(username,password){
 username=String(username||'').trim().toLowerCase();password=String(password||'');if(!username||username.length>64||password.length>128)throw Error('Nesprávné jméno nebo heslo.');
 return perfectRepairLock_(function(){var p=perfectRepairProps_(),failureKey='PERFECT_REPAIR_FAILURE_'+perfectRepairDigest_(username),f=JSON.parse(p.getProperty(failureKey)||'{"count":0,"until":0}');if(f.until>Date.now()&&f.count>=5)throw Error('Příliš mnoho pokusů. Počkej 15 minut.');if(f.until<Date.now())f={count:0,until:Date.now()+15*60*1000};var u=perfectRepairUsers_().find(function(x){return x.username.toLowerCase()===username;});if(!u||u.active===false||!perfectRepairEqual_(u.passwordHash,perfect36Password_(password,u.salt,u.iterations))){f.count++;p.setProperty(failureKey,JSON.stringify(f));throw Error('Nesprávné jméno nebo heslo.');}p.deleteProperty(failureKey);var token=perfectRepairRandom_(),all=p.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){try{var s=JSON.parse(all[k]);if(!Number.isFinite(s.expires)||s.expires<=Date.now())p.deleteProperty(k);}catch(e){p.deleteProperty(k);}});p.setProperty('PERFECT_REPAIR_SESSION_'+perfectRepairDigest_(token),JSON.stringify({userId:u.id,expires:Date.now()+8*60*60*1000}));return {token:token,user:perfectRepairPublicUser_(u)};});
}
