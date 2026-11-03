/** PERFECT 2.0 – diagnostika příjezdu. Bez změn objednávek. */
function perfectAuditCasyPrijezdu() {
  const sh = databaseGetOrdersSheet_();
  const first = PERFECT_DB_ORDER_DATA_START_ROW;
  const last = sh.getLastRow();
  if (last < first) return {celkem:0, podezrele:[]};
  const width = PERFECT_DB_ORDER_HEADERS.length;
  const rows = sh.getRange(first,1,last-first+1,width).getValues();
  const displayed = sh.getRange(first,3,last-first+1,1).getDisplayValues();
  const tz = Session.getScriptTimeZone();
  const flagged=[];
  rows.forEach((r,i)=>{
    if (!r[0]) return;
    const raw=r[2];
    const normalized = raw instanceof Date ? Utilities.formatDate(raw,tz,'HH:mm') : String(raw??'').trim();
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(normalized);
    const minutes=match?Number(match[1])*60+Number(match[2]):null;
    const suspicious=minutes===null || minutes<480 || minutes>1170 || (minutes%30!==0);
    if (suspicious) flagged.push({radek:first+i,orderId:String(r[0]),datum:String(r[1]),ulozenyCas:normalized,zobrazenyCas:displayed[i][0],duvod:minutes===null?'neplatný nebo chybějící čas':'mimo 08:00–19:30 nebo mimo 30min interval'});
  });
  Logger.log(JSON.stringify({celkem:rows.length,podezrele:flagged},null,2));
  return {celkem:rows.length,podezrele:flagged};
}

/** Formátuje pouze zobrazení v centrální DB; nemění hodnoty v buňkách. */
function perfectNastavit24hFormatDatabaze() {
  const sh=databaseGetOrdersSheet_();
  const end=Math.max(sh.getMaxRows(),3);
  sh.getRange(3,3,end-2,2).setNumberFormat('HH:mm');
  return {success:true,info:'Změněn pouze formát sloupců C:D od řádku 3, uložené časy zůstaly stejné.'};
}
