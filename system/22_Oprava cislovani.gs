/**
 * AUTOMYČKA PERFECT 2.0 — V20, bezpečné sjednocení ONLINE/OFFLINE, Gmail ID a čísel.
 * NÁHRADA souboru 22_Oprava cislovani.gs (nepřidávat vedle starého 22).
 * Závislost: 01 centrální databáze, databaseGetOrdersSheet_(), PERFECT_DB_ORDER_HEADERS.
 * Nezakládá ani nemaže žádnou objednávku. Na živé DB spouštět až po ověření náhledu.
 *
 * 1. perfectOrderIdsPreviewLast3Days()        pouze kontrola + Gmail párování
 * 2. perfectOrderIdsApplyConfirmedLast3Days()  záloha + řízené změny A, T, barev A
 *
 * Význam sloupců: A ORDER_ID, B datum příjezdu, C čas příjezdu,
 * G jméno, H e-mail, I telefon, T GMAIL_MESSAGE_ID.
 */
var PERFECT_ORDER_V20_CFG = Object.freeze({
  TZ: 'Europe/Prague',
  WINDOW_DAYS: 3,
  GMAIL_SINCE: '2026/09/18',  // Rezervace mohly být poslány před termínem příjezdu.
  GMAIL_BATCH: 100,
  GMAIL_MAX_THREADS: 400,
  PREVIEW_MAX_AGE_MS: 30*60*1000,
  PREVIEW_PROPERTY: 'PERFECT_V20_ORDER_PREVIEW',
  ONLINE_COLOR: '#38bdf8',
  OFFLINE_COLOR: '#f59e0b',
  BACKUP_PREFIX: 'ZALOHA_OBJ_V20_'
});

function perfectOrderIdsPreviewLast3Days() {
  var plan = perfectV20BuildPlan_();
  var digest = perfectV20Digest_(plan);
  PropertiesService.getScriptProperties().setProperty(PERFECT_ORDER_V20_CFG.PREVIEW_PROPERTY,
    JSON.stringify({at:Date.now(), digest:digest}));
  var publicPlan = perfectV20PublicPlan_(plan);
  Logger.log(JSON.stringify(publicPlan, null, 2));
  Logger.log('NÁHLED HOTOV. Zkontroluj změny a nejasné případy. Potom spusť perfectOrderIdsApplyConfirmedLast3Days().');
  return publicPlan;
}

/** Spuštění této funkce je vědomé potvrzení po náhledu, není zde žádné getUi(). */
function perfectOrderIdsApplyConfirmedLast3Days() {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var props = PropertiesService.getScriptProperties();
    var preview = JSON.parse(props.getProperty(PERFECT_ORDER_V20_CFG.PREVIEW_PROPERTY) || 'null');
    if (!preview || Date.now()-preview.at > PERFECT_ORDER_V20_CFG.PREVIEW_MAX_AGE_MS)
      throw new Error('Chybí čerstvý náhled (max. 30 minut). Spusť nejprve perfectOrderIdsPreviewLast3Days().');
    var plan = perfectV20BuildPlan_();
    if (preview.digest !== perfectV20Digest_(plan))
      throw new Error('Data objednávek nebo Gmail se změnily od náhledu. Nic nezapsáno. Spusť znovu náhled.');
    if (plan.blockers.length) throw new Error('Zápis zastaven: ' + plan.blockers.join(' | '));
    if (!plan.actions.length) {
      props.deleteProperty(PERFECT_ORDER_V20_CFG.PREVIEW_PROPERTY);
      return {success:true, updatedIds:0, linkedGmailIds:0, updatedColors:0, backup:'', review:plan.review};
    }
    var sheet=databaseGetOrdersSheet_(), ss=sheet.getParent();
    var timestamp=Utilities.formatDate(new Date(), PERFECT_ORDER_V20_CFG.TZ, 'MMdd_HHmmss');
    // Kompletní kopie tabulky PŘED JAKÝMKOLIV zápisem.
    var backup=sheet.copyTo(ss);
    var base=(PERFECT_ORDER_V20_CFG.BACKUP_PREFIX+timestamp).slice(0,85);
    var name=base, n=2; while (ss.getSheetByName(name)) name=base+'_'+n++;
    backup.setName(name); backup.hideSheet();
    var counts={ids:0,gmail:0,colors:0};
    // Přednačíst barvy celé A; upravit pouze barvy cílových řádků v paměti.
    // Jediným setFontColors nenutíme Apps Script dělat stovky pomalých getFontColor volání.
    var last=sheet.getLastRow();
    var colorRange=last>=3?sheet.getRange(3,1,last-2,1):null;
    var colorValues=colorRange?colorRange.getFontColors():[];
    plan.actions.forEach(function(a) {
      if (a.newId !== a.oldId) {
        sheet.getRange(a.row,1).setValue(a.newId);
        counts.ids++;
      }
      if (a.gmailId && !a.oldGmailId) {
        sheet.getRange(a.row,20).setValue(a.gmailId);
        counts.gmail++;
      }
      var expectedColor=a.newId.indexOf('OF')===0?PERFECT_ORDER_V20_CFG.OFFLINE_COLOR:PERFECT_ORDER_V20_CFG.ONLINE_COLOR;
      if (String(colorValues[a.row-3][0]||'').toLowerCase()!==expectedColor) {
        colorValues[a.row-3][0]=expectedColor; counts.colors++;
      }
    });
    if (counts.colors)colorRange.setFontColors(colorValues);
    SpreadsheetApp.flush();
    props.deleteProperty(PERFECT_ORDER_V20_CFG.PREVIEW_PROPERTY);
    var result={success:true,updatedIds:counts.ids,linkedGmailIds:counts.gmail,updatedColors:counts.colors,backup:backup.getName(),review:plan.review};
    Logger.log(JSON.stringify(result,null,2));return result;
  } finally {lock.releaseLock();}
}

// Kompatibilita se starým návodem. Jiné argumenty se neakceptují.
function perfectOrderIdsApplyLast3Days(confirmation) {
  if (confirmation!=='POTVRZUJI-OPRAVU-ID') throw new Error('Nejdříve spusť náhled, potom perfectOrderIdsApplyConfirmedLast3Days().');
  return perfectOrderIdsApplyConfirmedLast3Days();
}

function perfectV20BuildPlan_() {
  var sh=databaseGetOrdersSheet_();
  var wanted=['ORDER_ID','DATUM_OBJEDNANI','CAS_PRIJEZDU','CAS_ODJEZDU','CUSTOMER_ID','FIRMA','JMENO_PRIJMENI','EMAIL','TELEFON','VEHICLE_ID','VOZIDLO','SPZ','DARKOVY_POUKAZ','MYCI_PROGRAM','DOPLNKY','POZNAMKY','CENA_CELKEM','STAV_OBJEDNAVKY','PRACOVNIK','GMAIL_MESSAGE_ID','CENA_PROGRAMU','ZNECISTENI_20','CENOVE_POLOZKY','WEB_REQUEST_ID'];
  if (typeof PERFECT_DB_ORDER_HEADERS==='undefined' || PERFECT_DB_ORDER_HEADERS.length!==wanted.length)
    throw new Error('Chybí správná centrální databáze 01 (24 sloupců).');
  var head=sh.getRange(2,1,1,wanted.length).getDisplayValues()[0];
  wanted.forEach(function(h,i){if(head[i]!==h)throw new Error('Nesouhlasí hlavička sloupce '+(i+1)+': očekáváno '+h);});
  var now=new Date(), today=Utilities.formatDate(now,PERFECT_ORDER_V20_CFG.TZ,'yyyy-MM-dd');
  var dparts=today.split('-').map(Number);
  var from=Utilities.formatDate(new Date(Date.UTC(dparts[0],dparts[1]-1,dparts[2]-2,12)),'UTC','yyyy-MM-dd');
  var last=sh.getLastRow();
  var values=last<3?[]:sh.getRange(3,1,last-2,wanted.length).getValues();
  var all=values.map(function(r,i){return {
    row:i+3,rawId:String(r[0]||'').trim(),oldId:String(r[0]||'').replace(/\s+/g,'').toUpperCase(),date:perfectV20Date_(r[1]),
    time:perfectV20Time_(r[2]),name:String(r[6]||''),email:perfectV20Email_(r[7]),
    phone:perfectV20Phone_(r[8]),oldGmailId:String(r[19]||'').trim()
  };}).filter(function(o){return o.oldId||o.date||o.name||o.oldGmailId;});
  var targets=all.filter(function(o){return o.date>=from&&o.date<=today;});
  var existingGmail={};
  all.forEach(function(o){if(o.oldGmailId){if(existingGmail[o.oldGmailId])existingGmail[o.oldGmailId].push(o.row);else existingGmail[o.oldGmailId]=[o.row];}});
  var blockers=[];
  Object.keys(existingGmail).forEach(function(id){if(existingGmail[id].length>1 && existingGmail[id].some(function(row){return targets.some(function(t){return t.row===row;});}))
    blockers.push('Gmail Message ID existuje ve více objednávkách a týká se opravovaného období: řádky '+existingGmail[id].join(','));});
  var candidates=perfectV20FindGmailMatches_(targets,existingGmail);
  var review=candidates.review.slice(), links=candidates.links;
  var occurrences={};all.forEach(function(o){if(o.oldId)occurrences[o.oldId]=(occurrences[o.oldId]||0)+1;});
  // Každá dvojice mmYY+pořadí je jedinečná i mezi prefixy N/OF.
  var reserve={};
  function used(key,num){return !!(reserve[key] && reserve[key][num]);}
  function add(key,num){if(!reserve[key])reserve[key]={};reserve[key][num]=true;}
  var targetRows={};targets.forEach(function(o){targetRows[o.row]=true;});
  all.filter(function(o){return !targetRows[o.row];}).forEach(function(o){
    var m=/^(?:N|OF)(\d{4})-(\d+)$/.exec(o.oldId);
    if(m && Number(m[2])>0) add(m[1], Number(m[2]));
  });
  var prepared=targets.map(function(o){
    var link=links[o.row]||'';
    var gmail=o.oldGmailId||link;
    var prefix=gmail?'N':/^N\d{4}-\d+$/i.test(o.oldId)?'N':/^OF\d{4}-\d+$/i.test(o.oldId)?'OF':'';
    if(!prefix){review.push({row:o.row,orderId:o.oldId,reason:'Není jednoznačný typ online/offline. ID se nemění.'});}
    if(prefix==='N' && !gmail) review.push({row:o.row,orderId:o.oldId,reason:'Označení N zachováno, ale chybí prokazatelné Gmail Message ID.'});
    if(o.oldGmailId&&/^OF/.test(o.oldId))review.push({row:o.row,orderId:o.oldId,reason:'OF číslo, ale existuje Gmail ID: opraví se na N.'});
    var m=/^(N|OF)(\d{4})-(\d+)$/.exec(o.oldId), key=o.date.slice(5,7)+o.date.slice(2,4);
    return Object.assign({},o,{prefix:prefix,key:key,seq:m?Number(m[3]):0,match:m,gmailId:gmail});
  });
  prepared.sort(function(a,b){return a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.row-b.row;});
  var keep={};
  prepared.forEach(function(o){
    if(!o.prefix)return;
    var valid=o.match&&o.match[1]===o.prefix&&o.match[2]===o.key&&o.seq>0&&occurrences[o.oldId]===1;
    if(valid&&!used(o.key,o.seq)){keep[o.row]=true;add(o.key,o.seq);}
  });
  var actions=[];
  prepared.forEach(function(o){
    if(!o.prefix)return;
    var newId=o.oldId;
    if(!keep[o.row]){
      var n=1;while(used(o.key,n))n++;
      add(o.key,n);newId=o.prefix+o.key+'-'+String(n).padStart(2,'0');
    }
    var gmailLink=links[o.row]||'';
    // Barvy opravujeme všem bezpečně rozpoznaným řádkům z posledních 3 dní.
    actions.push({row:o.row,oldId:o.rawId,newId:newId,oldGmailId:o.oldGmailId,gmailId:gmailLink,date:o.date,time:o.time});
  });
  return {from:from,to:today,checked:targets.length,scannedMails:candidates.scanned,
    gmailSearchComplete:candidates.complete,actions:actions,review:review,blockers:blockers};
}

/** Párování používá datum+čas příjezdu a jeden skutečný kontakt, se zákaznickým jménem jako pojistkou. */
function perfectV20FindGmailMatches_(targets,existingIds) {
  var out={links:{},review:[],scanned:0,complete:true};
  var need=targets.filter(function(o){return !o.oldGmailId && o.date && o.time && (o.email||o.phone);});
  if(!need.length)return out;
  var byKey={};
  need.forEach(function(o){var k=o.date+'|'+o.time;if(!byKey[k])byKey[k]=[];byKey[k].push(o);});
  var msgs=[], seen={},offset=0, cap=PERFECT_ORDER_V20_CFG.GMAIL_MAX_THREADS;
  var query='in:anywhere after:'+PERFECT_ORDER_V20_CFG.GMAIL_SINCE+' subject:"Máte novou rezervaci"';
  while(offset<cap){
    var batch;
    try {batch=GmailApp.search(query,offset,Math.min(PERFECT_ORDER_V20_CFG.GMAIL_BATCH,cap-offset));}
    catch(e){out.complete=false;out.review.push({row:0,reason:'Gmail není dostupný nebo není povolen přístup: '+String(e.message||e).slice(0,160)});break;}
    if(!batch.length)break;
    batch.forEach(function(thread){thread.getMessages().forEach(function(message){
      var id=String(message.getId()||'');
      if(!id||seen[id]||existingIds[id])return;
      seen[id]=true;
      var subject=perfectV20Plain_(message.getSubject());
      if(subject.indexOf('mate novou rezervaci')<0 || subject.indexOf('automyckaperfect.cz')<0)return;
      var parsed=perfectV20ParseMail_(message);if(parsed)msgs.push(parsed);
    });});
    offset+=batch.length;
    if(batch.length<Math.min(PERFECT_ORDER_V20_CFG.GMAIL_BATCH,cap-offset+batch.length))break;
  }
  if(offset>=cap){out.complete=false;out.review.push({row:0,reason:'Gmail prohledán jen do limitu '+cap+' vláken. Starší zprávy nemusely být zahrnuty.'});}
  out.scanned=msgs.length;
  // Dvoustranné ověření: jeden mail smí sedět jen na jednu objednávku a obráceně.
  var possibleByRow={},possibleByMail={};
  msgs.forEach(function(m){
    var pool=byKey[m.date+'|'+m.time]||[];
    pool.forEach(function(o){
      var contact=(m.email&&o.email&&m.email===o.email)||(m.phone&&o.phone&&m.phone===o.phone);
      if(!contact)return;
      var mn=perfectV20Plain_(m.name),on=perfectV20Plain_(o.name);
      if(mn&&on&&mn!==on)return;
      if(!possibleByRow[o.row])possibleByRow[o.row]=[];
      if(!possibleByMail[m.id])possibleByMail[m.id]=[];
      possibleByRow[o.row].push(m.id); possibleByMail[m.id].push(o.row);
    });
  });
  Object.keys(possibleByRow).forEach(function(key){
    var matches=possibleByRow[key], row=Number(key), id=matches[0];
    if(matches.length===1 && possibleByMail[id].length===1)out.links[row]=id;
    else out.review.push({row:row,reason:'Více možných shod Gmail/objednávka. Gmail ID se nepřiřazuje automaticky.'});
  });
  if(!out.complete){
    out.links={};
    out.review.push({row:0,reason:'Nekompletní přístup k Gmailu: žádné nové Gmail Message ID se pro jistotu nepropisuje.'});
  }
  return out;
}

function perfectV20ParseMail_(m){
  var body=String(m.getPlainBody()||'');
  if(!body.trim())body=String(m.getBody()||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/?[^>]+>/g,' ');
  body=body.replace(/\r/g,'').replace(/\u00a0/g,' ').replace(/<[^>]*>/g,'');
  // Hodnoty za názvem mohou být na dalším řádku.
  var values={},key='',mapping={'zakaznik':'name','email':'email','telefon':'phone','datum':'date','cas':'time'};
  body.split('\n').forEach(function(raw){
    var line=String(raw||'').trim();
    var x=/^([^:]{2,45}):\s*(.*)$/.exec(line);
    var norm=x?perfectV20Plain_(x[1]):'';
    if(mapping[norm]){key=mapping[norm];if(x[2])values[key]=x[2].trim();return;}
    // Ukončit sekci u jiné hlavičky, aby se nesbíraly náhodné údaje.
    if(x && /^(typ vozu|vyber sluzby|doplnky|zprava|kod darkoveho poukazu|uplatnuji darkovy poukaz)$/.test(norm)){key='';return;}
    if(key && line && !values[key])values[key]=line;
  });
  var date=perfectV20Date_(values.date),time=perfectV20Time_(values.time);
  if(!date||!time)return null;
  return {id:String(m.getId()||''),date:date,time:time,name:values.name||'',
    email:perfectV20Email_(values.email),phone:perfectV20Phone_(values.phone)};
}

function perfectV20Date_(v){
  if(v instanceof Date && !isNaN(v.getTime()))return Utilities.formatDate(v,PERFECT_ORDER_V20_CFG.TZ,'yyyy-MM-dd');
  var s=String(v||'').trim(); var m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
  m=/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';
}
function perfectV20Time_(v){
  if(v instanceof Date && !isNaN(v.getTime()))return Utilities.formatDate(v,PERFECT_ORDER_V20_CFG.TZ,'HH:mm');
  var m=/(^|\s)(\d{1,2}):(\d{2})(\s|$)/.exec(String(v||''));
  if(!m||Number(m[2])>23||Number(m[3])>59)return '';
  return m[2].padStart(2,'0')+':'+m[3];
}
function perfectV20Email_(v){return String(v||'').trim().toLowerCase();}
function perfectV20Phone_(v){var s=String(v||'').replace(/\D/g,'');return s.length===12&&s.indexOf('420')===0?s.slice(3):s;}
function perfectV20Plain_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function perfectV20Digest_(plan){
  var payload=JSON.stringify({from:plan.from,to:plan.to,checked:plan.checked,actions:plan.actions,review:plan.review,blockers:plan.blockers,scannedMails:plan.scannedMails,gmailSearchComplete:plan.gmailSearchComplete});
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,payload,Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes);
}
function perfectV20PublicPlan_(p){
  return {from:p.from,to:p.to,checked:p.checked,scannedGmailReservations:p.scannedMails,
    gmailSearchComplete:p.gmailSearchComplete,
    changedNumbers:p.actions.filter(function(x){return x.oldId!==x.newId;}).map(function(x){return {row:x.row,from:x.oldId,to:x.newId};}),
    linkedGmailIds:p.actions.filter(function(x){return !x.oldGmailId&&x.gmailId;}).map(function(x){return {row:x.row,orderId:x.newId,gmailMessageId:x.gmailId};}),
    recolorCount:p.actions.length,needsReview:p.review.length,review:p.review.slice(0,75),blockers:p.blockers,
    note:'Bez automatu N -> OF při chybějícím Gmail ID. Nepárované N zůstává N; nový Gmail ID jen při jednoznačné shodě termínu, kontaktu a jména.'};
}
