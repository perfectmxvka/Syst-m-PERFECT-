/**
 * AUTOMYČKA PERFECT 2.0 — V26: audit a kontrolovaná migrace ORDER_ID.
 * Přidej jako JEDEN nový soubor 26_AUDIT_A_MIGRACE_ORDER_ID.gs.
 * Neměň centrální databázi ani generátor. Zachovává CUSTOMER_ID / VEHICLE_ID.
 *
 * 1. perfectMigrationAuditV26() — audit, NIC v DB nemění.
 * 2. perfectMigrationApplyV26() — ve výchozím nastavení VYPNUTO.
 *
 * POZOR: audit neumí prohledat zdrojové kódy jiných Apps Script projektů,
 * externí tabulky, dokumenty a externí integrace. Pokud se tam ORDER_ID
 * používá jako trvalý odkaz, migraci NESPOUŠTĚJ bez jejich kontroly.
 */
const PERFECT_MIG26 = Object.freeze({
  DB: '__PERFECT_DB_OBJEDNAVKY',
  PLAN: '__PERFECT_NAVRH_OPRAV_V25',
  REPORT: '__PERFECT_AUDIT_MIGRACE_V26',
  JOURNAL_PREFIX: '__PERFECT_MIGRACE_V26_',
  TZ: 'Europe/Prague',
  START_ROW: 3,
  WIDTH: 24,
  // Zápis je záměrně vypnutý. Aktivuj AŽ po auditu a kontrole všech integrací.
  ENABLE_APPLY: false,
  // Po schválení opiš přesný token z posledního auditu sem:
  APPROVED_AUDIT_TOKEN: '',
  // Nezpracovávej říjen 2026, dokud nejsou vyjasněné OF a časy.
  BLOCKED_MONTHS: ['1026'],
  // Pokud jsou v plánu varování, příslušný měsíc nepůjde migrovat.
  ALLOW_ROWS_WITH_WARNINGS: false,
  MAX_SCAN_CELLS_PER_SHEET: 250000
});

function perfectMigrationAuditV26() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw Error('Probíhá jiná operace. Zkus to znovu.');
  try {
    const audit=mig26BuildAudit_();
    mig26WriteReport_(audit);
    Logger.log('V26 AUDIT: '+JSON.stringify(audit.summary));
    Logger.log('AUDIT TOKEN: '+audit.token);
    Logger.log('Detail v listu '+PERFECT_MIG26.REPORT+'. Databáze nebyla změněna.');
    return {summary:audit.summary,token:audit.token,report:PERFECT_MIG26.REPORT};
  } finally {lock.releaseLock()}
}

function perfectMigrationApplyV26() {
  const c=PERFECT_MIG26;
  if(!c.ENABLE_APPLY || !c.APPROVED_AUDIT_TOKEN)throw Error('Zápis je vypnutý. Nejdřív spusť audit a ověř všechny návaznosti.');
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw Error('Probíhá jiná operace.');
  try {
    const audit=mig26BuildAudit_();
    if(audit.token!==c.APPROVED_AUDIT_TOKEN)throw Error('Data nebo návrh se změnily od auditu. Spusť audit znovu. Nic nezapsáno.');
    if(audit.problems.length)throw Error('Audit našel '+audit.problems.length+' blokujících problémů. Nic nezapsáno.');
    if(!audit.changes.length)throw Error('Žádné schválené změny k zápisu.');
    const ss=audit.ss, db=audit.db, start=c.START_ROW;
    const original=audit.originalIds.map(id=>[id]);
    const changed=audit.originalIds.slice();
    audit.changes.forEach(x=>changed[x.row-start]=x.next);
    // Záloha celé tabulky je nutná před jakýmkoliv zápisem.
    const stamp=Utilities.formatDate(new Date(),c.TZ,'yyyyMMdd_HHmmss');
    const backup=DriveApp.getFileById(ss.getId()).makeCopy('PERFECT_ZALOHA_PRED_ORDER_ID_V26_'+stamp);
    const journalName=c.JOURNAL_PREFIX+stamp;
    const journal=ss.insertSheet(journalName);
    const headers=['DB_RADek','PRED','PO','ZALOHA_URL','DATUM'];
    journal.getRange(1,1,1,headers.length).setValues([headers]);
    journal.getRange(2,1,audit.changes.length,headers.length).setValues(audit.changes.map(x=>[x.row,x.old,x.next,backup.getUrl(),new Date()]));
    journal.hideSheet();
    SpreadsheetApp.flush();
    // Jeden zápis celého ID sloupce. Pokud selže, pokusíme se vrátit původní hodnoty.
    try {
      db.getRange(start,1,changed.length,1).setValues(changed.map(id=>[id]));
      SpreadsheetApp.flush();
      const verify=db.getRange(start,1,changed.length,1).getDisplayValues().map(r=>r[0].trim());
      if(verify.some((id,i)=>id!==changed[i]))throw Error('Nesouhlasí kontrola po zápisu.');
      // Barvy se nemění: zachová se původní formátování.
      Logger.log('V26 MIGRACE DOKONČENA: '+audit.changes.length+' ID. ZÁLOHA: '+backup.getUrl());
      return {changed:audit.changes.length,backupUrl:backup.getUrl(),journalSheet:journalName};
    } catch(e) {
      try {db.getRange(start,1,original.length,1).setValues(original);SpreadsheetApp.flush();}
      catch(rollbackError){throw Error('KRITICKÉ: zápis selhal a automatický návrat také. Použij zálohu '+backup.getUrl()+'. Původní chyba: '+e.message+'; návrat: '+rollbackError.message);}
      throw Error('Zápis selhal, původní ORDER_ID byly vráceny. Záloha: '+backup.getUrl()+'. '+e.message);
    }
  } finally {lock.releaseLock()}
}

function mig26BuildAudit_() {
  const c=PERFECT_MIG26;
  if(typeof perfectDatabaseGetSpreadsheet_!=='function')throw Error('Chybí centrální databáze 01.');
  const ss=perfectDatabaseGetSpreadsheet_(),db=ss.getSheetByName(c.DB),plan=ss.getSheetByName(c.PLAN);
  if(!db||!plan)throw Error('Chybí databáze nebo náhled V25.');
  const expected=typeof PERFECT_DB_ORDER_HEADERS!=='undefined'?Array.from(PERFECT_DB_ORDER_HEADERS):null;
  if(!expected||expected.length!==c.WIDTH)throw Error('Neshoda verze databázových hlaviček.');
  const headers=db.getRange(2,1,1,c.WIDTH).getDisplayValues()[0].map(x=>x.trim());
  if(headers.some((h,i)=>h!==expected[i]))throw Error('Nesouhlasí hlavičky centrální DB. Nic nezapsáno.');
  const n=Math.max(0,db.getLastRow()-c.START_ROW+1);
  const raw=n?db.getRange(c.START_ROW,1,n,c.WIDTH).getValues():[];
  const disp=n?db.getRange(c.START_ROW,1,n,c.WIDTH).getDisplayValues():[];
  const originalIds=disp.map(r=>String(r[0]).trim());
  const planRows=plan.getLastRow()>1?plan.getRange(2,1,plan.getLastRow()-1,10).getDisplayValues():[];
  const problems=[], changes=[],seenRows=new Set(),oldIds=new Set(),monthRows=new Map(),selectedMonths=new Set();
  const re=/^(N|OF)(\d{2})(\d{2})-(\d+)$/i;
  for(let i=0;i<n;i++){
    const id=originalIds[i];
    if(!id){problems.push(['DB',i+c.START_ROW,'CHYBÍ ORDER_ID']);continue}
    if(oldIds.has(id))problems.push(['DB',i+c.START_ROW,'DUPLICITNÍ PŮVODNÍ ID '+id]);
    oldIds.add(id);
    const m=re.exec(id);
    if(!m)problems.push(['DB',i+c.START_ROW,'NEPLATNÉ PŮVODNÍ ID '+id]);
    else {const code=m[2]+m[3];if(!monthRows.has(code))monthRows.set(code,[]);monthRows.get(code).push(i+c.START_ROW)}
  }
  if(planRows.length!==n)problems.push(['NÁHLED',0,'Nesouhlasí počet řádků DB a V25. Obnov náhled.']);
  for(const r of planRows){
    const row=Number(r[0]),old=String(r[1]).trim(),next=String(r[2]).trim(),warn=String(r[7]).trim(),manual=String(r[5]).trim();
    if(!Number.isInteger(row)||row<c.START_ROW||row>=c.START_ROW+n||seenRows.has(row)){
      problems.push(['NÁHLED',row,'Chybějící/duplicitní/neplatné číslo řádku']);continue;
    }
    seenRows.add(row);
    const index=row-c.START_ROW;
    if(originalIds[index]!==old)problems.push(['NÁHLED',row,'ID se změnilo od vytvoření náhledu']);
    if(typeof hist25Hash_!=='function'||hist25Hash_(raw[index])!==r[9])problems.push(['NÁHLED',row,'Řádek DB se změnil od V25 náhledu']);
    if(manual)problems.push(['ČAS',row,'Ručně navržený čas ještě není uložený v DB']);
    if(!next||next===old)continue;
    const a=re.exec(old),b=re.exec(next);
    if(!a||!b){problems.push(['ID',row,'Neplatný formát starého nebo nového ID']);continue}
    if(a[1].toUpperCase()!==b[1].toUpperCase())problems.push(['ID',row,'Změna prefixu N/OF je zakázaná']);
    if(a[2]+a[3]!==b[2]+b[3])problems.push(['ID',row,'Změna měsíce v ID je zakázaná']);
    const month=b[2]+b[3];
    if(c.BLOCKED_MONTHS.includes(month))problems.push(['MĚSÍC',row,'Měsíc '+month+' je blokovaný']);
    if(warn&&!c.ALLOW_ROWS_WITH_WARNINGS)problems.push(['VAROVÁNÍ',row,warn]);
    // Mimo provozní čas není automatický důkaz chyby, ale vyžaduje lidské ověření.
    const time=String(r[4]).trim();
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))problems.push(['ČAS',row,'Neověřený nebo neplatný čas příjezdu']);
    changes.push({row,old,next,month});selectedMonths.add(month);
  }
  if(seenRows.size!==n)problems.push(['NÁHLED',0,'Náhled nepokrývá všechny řádky databáze']);
  // Zabránit neúplnému přepočtu měsíce, kdyby se část návrhu vynechala.
  for(const month of selectedMonths){
    const all=monthRows.get(month)||[];
    const mapped=planRows.filter(r=>{const m=re.exec(String(r[1]).trim());return m&&m[2]+m[3]===month});
    if(all.length!==mapped.length)problems.push(['MĚSÍC',0,'Neúplné pokrytí měsíce '+month]);
    if(mapped.some(r=>!String(r[2]).trim()))problems.push(['MĚSÍC',0,'Některé řádky měsíce '+month+' nemají návrh ID']);
    if(mapped.some(r=>String(r[7]).trim()&&!c.ALLOW_ROWS_WITH_WARNINGS))problems.push(['MĚSÍC',0,'Měsíc '+month+' má upozornění']);
  }
  // Výsledná ID musí být jedinečná i vůči řádkům, které se nepřečíslují.
  const result=originalIds.slice();
  changes.forEach(x=>result[x.row-c.START_ROW]=x.next);
  const seenResult=new Set();
  result.forEach((id,i)=>{if(seenResult.has(id))problems.push(['KOLIZE',i+c.START_ROW,'Duplicitní výsledné ID '+id]);seenResult.add(id)});
  // Ve stejném měsíci musí výsledná číselná řada obsahovat unikátní čísla pro N i OF.
  for(const month of selectedMonths){
    const seq=new Set();
    result.forEach((id,i)=>{const m=re.exec(id);if(!m||m[2]+m[3]!==month)return;const k=Number(m[4]);if(seq.has(k))problems.push(['ČÍSLOVÁNÍ',i+c.START_ROW,'Duplicitní pořadové číslo v '+month+': '+k]);seq.add(k)});
  }
  // Externí odkazy uvnitř tabulky: vyhledáme stará ID v ostatních listech a
  // v ostatních sloupcích DB. Nalezené odkazy je třeba nejdřív řešit.
  const changedIds=new Set(changes.map(x=>x.old));
  const idPattern=/(?:OF|N)\d{4}-\d+/gi;
  for(const sh of ss.getSheets()){
    const name=sh.getName();
    if(name===c.PLAN||name===c.REPORT||name.startsWith(c.JOURNAL_PREFIX))continue;
    const rr=sh.getLastRow(),cc=sh.getLastColumn();if(!rr||!cc)continue;
    if(rr*cc>c.MAX_SCAN_CELLS_PER_SHEET){problems.push(['ODKAZY',0,'List '+name+' je příliš velký na úplnou kontrolu ('+(rr*cc)+' buněk)']);continue}
    const values=sh.getRange(1,1,rr,cc).getDisplayValues();
    const formulas=sh.getRange(1,1,rr,cc).getFormulas();
    for(let i=0;i<rr;i++)for(let j=0;j<cc;j++){
      if(name===c.DB&&j===0&&i+1>=c.START_ROW)continue;
      const value=String(values[i][j]||''),formula=String(formulas[i][j]||'');
      if(!value&&!formula)continue;
      // Vyhledat odkazy podle vzoru ID; neprocházet 592 ID pro každou buňku.
      const matches=(value+' '+formula).match(idPattern)||[];
      const ref=matches.find(id=>changedIds.has(id));
      if(ref)problems.push(['ODKAZY',i+1,name+'!'+mig26Column_(j+1)+(i+1)+' obsahuje '+ref]);
    }
  }
  const token=mig26Hash_(JSON.stringify({originalIds,planRows,problems,changes,raw:raw.map(r=>r.map(v=>v instanceof Date?v.getTime():v))}));
  return {ss,db,originalIds,changes,problems,token,summary:{orders:n,proposedChanges:changes.length,blockingProblems:problems.length,months:[...selectedMonths],externalReferences:problems.filter(x=>x[0]==='ODKAZY').length}};
}
function mig26WriteReport_(a){
  const c=PERFECT_MIG26;let sh=a.ss.getSheetByName(c.REPORT);if(!sh)sh=a.ss.insertSheet(c.REPORT);
  sh.clearContents();
  const lines=[['V26 AUDIT – BEZ ZMĚNY DB',''],['DATUM',new Date()],['TOKEN',a.token],['OBJEDNÁVKY',a.summary.orders],['NÁVRHY ID',a.summary.proposedChanges],['BLOKUJÍCÍ PROBLÉMY',a.summary.blockingProblems],['EXTERNÍ ODKAZY V TABULCE',a.summary.externalReferences],['',''],['KATEGORIE','ŘÁDEK','POPIS']];
  sh.getRange(1,1,lines.length,3).setValues(lines.map(r=>[r[0]||'',r[1]||'',r[2]||'']));
  if(a.problems.length)sh.getRange(lines.length+1,1,a.problems.length,3).setValues(a.problems);
  sh.setFrozenRows(9);sh.autoResizeColumns(1,3);
}
function mig26Column_(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function mig26Hash_(s){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s))}
