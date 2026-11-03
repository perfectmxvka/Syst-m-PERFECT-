/**
 * AUTOMYČKA PERFECT 2.0 — V27 / BEZPEČNÝ NÁHLED HISTORICKÉHO ČÍSLOVÁNÍ
 *
 * Pouze čtení databáze; zapisuje VÝHRADNĚ nový kontrolní list.
 * Nikdy nemění ORDER_ID, čas, zákazníky ani vazby.
 * Shodný termín není duplicita: stabilní pořadí určí původní číslo ID.
 * Europe/Prague a Europe/Bratislava se považují za kompatibilní.
 * POZOR: Návrhy jsou informativní; NEJSOU schválenou migrací.
 */
const PERFECT_HIST27 = Object.freeze({
  SPREADSHEET_ID: '1oOB6wO-h8bp1S_praSiVWtg03Y5qVWs1U63GsesQ0vo',
  DB: '__PERFECT_DB_OBJEDNAVKY',
  PREVIEW: '__PERFECT_NAVRH_OPRAV_V27',
  SUMMARY: '__PERFECT_SHRNUTI_V27',
  TIMEZONE: 'Europe/Prague',
  HEADER_ROW: 2,
  FIRST_DATA_ROW: 3,
  WIDTH: 24,
  OF_WARNING_BEFORE: '2026-10-11',
  MIN_TIME: '08:00',
  MAX_TIME: '19:30'
});

function perfectHistoricalPreviewV27() {
  const c = PERFECT_HIST27;
  const ss = SpreadsheetApp.openById(c.SPREADSHEET_ID);
  const db = hist27Db_(ss);
  const sheetZone = ss.getSpreadsheetTimeZone();
  const scriptZone = Session.getScriptTimeZone();
  const tzOk = hist27CompatibleZone_(sheetZone) && hist27CompatibleZone_(scriptZone);
  const count = Math.max(0, db.getLastRow() - c.FIRST_DATA_ROW + 1);
  const range = count ? db.getRange(c.FIRST_DATA_ROW, 1, count, c.WIDTH) : null;
  const raw = range ? range.getValues() : [];
  const shown = range ? range.getDisplayValues() : [];
  const idRe = /^(N|OF)(\d{2})(\d{2})-(\d+)$/i;
  const all = [], months = new Map(), ids = new Map();
  const blockers = new Map();
  const globalWarnings = [];
  if (!tzOk) globalWarnings.push('ČASOVÁ PÁSMA NEJSOU POTVRZENÁ JAKO KOMPATIBILNÍ');

  for (let i = 0; i < count; i++) {
    const r = raw[i], d = shown[i], row = i + c.FIRST_DATA_ROW;
    const id = String(d[0] || '').trim();
    const match = idRe.exec(id);
    const prefix = match ? match[1].toUpperCase() : '';
    const oldMonth = match ? match[2] + match[3] : '';
    const seq = match ? Number(match[4]) : NaN;
    const date = hist27Date_(d[1], r[1], match, sheetZone);
    const day = date ? date.iso : '';
    const month = date ? date.month : '';
    const time = hist27Clock_(d[2]);
    const pragueTime = r[2] instanceof Date && !isNaN(r[2].getTime())
      ? Utilities.formatDate(r[2], c.TIMEZONE, 'HH:mm') : hist27Clock_(r[2]);
    const notes = [], reasons = [];
    if (!date) reasons.push('NEČITELNÉ DATUM');
    if (!match) reasons.push('NEPLATNÉ ORDER_ID');
    if (match && date && oldMonth !== month) reasons.push('MĚSÍC V ID NESOUHLASÍ S DATEM');
    if (!time) reasons.push('NEČITELNÝ ČAS');
    if (prefix === 'OF' && day && day < c.OF_WARNING_BEFORE)
      reasons.push('STARŠÍ OF — OVĚŘIT PŮVOD');
    if (time && (time < c.MIN_TIME || time > c.MAX_TIME))
      notes.push('ČAS MIMO OBVYKLÝ PROVOZ — OVĚŘIT');
    if (time && pragueTime && time !== pragueTime)
      reasons.push('ROZDÍL ZOBRAZENÍ A Date — OVĚŘIT');
    const item = {row, id, prefix, oldMonth, seq, day, month, time,
      pragueTime, notes, reasons, proposed:'', hash:hist27Hash_(r), tie:''};
    all.push(item);
    if (id) {
      if (!ids.has(id.toUpperCase())) ids.set(id.toUpperCase(), []);
      ids.get(id.toUpperCase()).push(item);
    }
    if (month) {
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(item);
    }
  }

  // Kolize ID se mohou týkat i záznamů s nečitelným datem.
  for (const group of ids.values()) if (group.length > 1) {
    group.forEach(x => x.reasons.push('DUPLICITNÍ ORDER_ID'));
  }
  const unassigned = all.filter(x => !x.day || !idRe.test(x.id));
  if (unassigned.length) globalWarnings.push('NEZAŘAZENÉ/NEPLATNÉ ZÁZNAMY: ' + unassigned.length +
    ' — NÁVRHY NEJSOU KOMPLETNÍ MIGRACÍ');

  for (const [month, items] of months) {
    const monthReasons = new Set();
    if (!tzOk) monthReasons.add('ČASOVÁ PÁSMA');
    for (const x of items) for (const reason of x.reasons) monthReasons.add(reason);
    // Neznámé datum, ale validní ORDER_ID: blokovat i měsíc odvozený z ID.
    for (const x of all) if (!x.month && x.oldMonth === month)
      monthReasons.add('NEZAŘAZENÝ ŘÁDEK SE STEJNÝM MĚSÍCEM V ID');

    const slots = new Map();
    for (const x of items) {
      if (!x.day || !x.time) continue;
      const key = x.day + ' ' + x.time;
      if (!slots.has(key)) slots.set(key, []);
      slots.get(key).push(x);
    }
    for (const [slot, group] of slots) if (group.length > 1) {
      group.forEach(x => {
        x.tie = slot + ' (' + group.length + ' zakázky)';
        x.notes.push('SHODNÝ TERMÍN — PŮVODNÍ RELATIVNÍ POŘADÍ ID');
      });
      // Pouze pokud nelze určit původní číselné pořadí, je shoda blokující.
      const numbers = group.map(x => x.seq);
      if (numbers.some(n => !Number.isFinite(n)) || new Set(numbers).size !== numbers.length)
        monthReasons.add('SHODNÝ TERMÍN BEZ JEDNOZNAČNÉHO PŮVODNÍHO POŘADÍ');
    }
    if (monthReasons.size) {
      blockers.set(month, [...monthReasons]);
      items.forEach(x => x.notes.push('MĚSÍC BLOKOVÁN — ' + [...monthReasons].join('; ')));
      continue;
    }
    items.sort((a,b) => a.day.localeCompare(b.day) ||
      a.time.localeCompare(b.time) || a.seq-b.seq || a.row-b.row);
    items.forEach((x,i) => x.proposed = x.prefix + month + '-' + String(i+1).padStart(2,'0'));
  }
  // Pro nezmapované měsíce z ORDER_ID zobrazit také blokaci.
  for (const x of unassigned) if (x.oldMonth && !blockers.has(x.oldMonth)) {
    blockers.set(x.oldMonth, ['NEZAŘAZENÝ ŘÁDEK S ID TOHOTO MĚSÍCE']);
    const items = months.get(x.oldMonth) || [];
    items.forEach(y => {y.proposed=''; y.notes.push('MĚSÍC BLOKOVÁN — NEZAŘAZENÝ ŘÁDEK');});
  }
  // Návrhy z jiných měsíců jsou pouze pracovní, dokud existují nejasné řádky.
  const headers = [
    'DB ŘÁDEK','PŮVODNÍ ORDER_ID','NÁVRH ID (NEZAPISUJE SE)',
    'DATUM PŘÍJEZDU','ČAS VIDITELNÝ V DB','ČAS Z Date V PRAZE',
    'STAV / VAROVÁNÍ','RUČNÍ POZNÁMKA','TYP N/OF','MĚSÍC','OTISK ŘÁDKU',
    'SHODNÝ TERMÍN','BLOKUJÍCÍ PROBLÉM'
  ];
  const sh = hist27Sheet_(ss,c.PREVIEW);
  const keep = new Map();
  if (sh.getLastRow()>1 && sh.getLastColumn()>=11) {
    const prev=sh.getRange(2,1,sh.getLastRow()-1,11).getDisplayValues();
    prev.forEach(a=>{if(a[7])keep.set(a[0]+'|'+a[10],a[7]);});
  }
  const out=all.map(x=>[x.row,x.id,x.proposed,x.day,x.time,x.pragueTime,
    x.notes.concat(x.reasons).join(' | '),keep.get(x.row+'|'+x.hash)||'',
    x.prefix,x.month,x.hash,x.tie,x.reasons.join(' | ')]);
  sh.clearContents();
  sh.getRange('D:F').setNumberFormat('@');
  sh.getRange('H:H').setNumberFormat('@');
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if (out.length) sh.getRange(2,1,out.length,headers.length).setValues(out);
  sh.getRange('D:F').setNumberFormat('@');
  sh.getRange('H:H').setNumberFormat('@');
  sh.getRange(1,1,1,headers.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  const changes=all.filter(x=>x.proposed && x.proposed!==x.id).length;
  const ties=all.filter(x=>x.tie).length;
  const summary=hist27Sheet_(ss,c.SUMMARY);
  const report=[
    ['KONTROLA V27','HODNOTA'],['Počet DB řádků',count],
    ['Návrhy ID (jen náhled)',changes],['Záznamy se shodným termínem',ties],
    ['Nezařazené záznamy',unassigned.length],
    ['Pásmo tabulky',sheetZone],['Pásmo Apps Script',scriptZone],
    ['Pásma kompatibilní',tzOk?'ANO':'NE'],
    ['Blokované měsíce',[...blockers.keys()].sort().join(', ')],
    ['POZOR','Návrhy nelze použít k zápisu bez ověření vazeb a nezařazených řádků'],
    ['MĚSÍC','DŮVOD BLOKACE']
  ];
  for (const [m,reasons] of [...blockers].sort((a,b)=>a[0].localeCompare(b[0])))
    report.push([m,reasons.join(' | ')]);
  summary.clearContents();summary.getRange(1,1,report.length,2).setValues(report);
  summary.getRange('A1:B1').setFontWeight('bold');summary.setFrozenRows(1);
  Logger.log('V27: celkem '+count+'; návrhy ID '+changes+'; záznamy ve shodném termínu '+ties+
    '; nezařazené '+unassigned.length+'; blokované měsíce '+[...blockers.keys()].join(', '));
  Logger.log('Pásma: '+sheetZone+' / '+scriptZone+'; kompatibilní: '+tzOk);
  Logger.log('Náhled: '+c.PREVIEW+'; důvody: '+c.SUMMARY+'; DATABÁZE NEZMĚNĚNA.');
  return {total:count, proposedIds:changes, tiedRows:ties, unassigned:unassigned.length,
    blockedMonths:[...blockers.keys()], preview:c.PREVIEW, summary:c.SUMMARY};
}

function perfectHistoricalImpactV27(){
  const c=PERFECT_HIST27,ss=SpreadsheetApp.openById(c.SPREADSHEET_ID);
  const sh=ss.getSheetByName(c.PREVIEW);
  if(!sh||sh.getLastRow()<2)throw Error('Nejprve spusť perfectHistoricalPreviewV27.');
  const rows=sh.getRange(2,1,sh.getLastRow()-1,13).getDisplayValues();
  const changes=rows.filter(r=>r[2]&&r[1]!==r[2]);
  const blocked=rows.filter(r=>r[6].includes('MĚSÍC BLOKOVÁN'));
  Logger.log('V27 DOPAD: návrhy ID '+changes.length+'; blokované řádky '+blocked.length);
  Logger.log('Prvních 20 návrhů: '+JSON.stringify(changes.slice(0,20).map(r=>({row:r[0],old:r[1],next:r[2],day:r[3],time:r[4]}))));
  Logger.log('JEN NÁHLED — ŽÁDNÝ ZÁPIS DO DB.');
}

function perfectHistoricalTimezoneCheckV27(){
  const ss=SpreadsheetApp.openById(PERFECT_HIST27.SPREADSHEET_ID);
  const sheet=ss.getSpreadsheetTimeZone(),script=Session.getScriptTimeZone();
  const result={sheet,script,compatible:hist27CompatibleZone_(sheet)&&hist27CompatibleZone_(script)};
  Logger.log(JSON.stringify(result));return result;
}

function hist27CompatibleZone_(z){return z==='Europe/Prague'||z==='Europe/Bratislava';}
function hist27Sheet_(ss,name){return ss.getSheetByName(name)||ss.insertSheet(name);}
function hist27Db_(ss){
  const c=PERFECT_HIST27,s=ss.getSheetByName(c.DB);
  if(!s)throw Error('Chybí databázový list '+c.DB);
  const h=s.getRange(c.HEADER_ROW,1,1,c.WIDTH).getDisplayValues()[0]
    .map(x=>String(x).trim().toUpperCase());
  const required={ORDER_ID:0,DATUM_OBJEDNANI:1,CAS_PRIJEZDU:2,
    JMENO_PRIJMENI:6,EMAIL:7,TELEFON:8,VOZIDLO:10};
  for(const [key,i] of Object.entries(required))if(h[i]!==key)
    throw Error('NESHODA HLAVIČKY '+key+' ve sloupci '+(i+1)+' — ZASTAVENO');
  return s;
}
function hist27Date_(display,raw,idMatch,tz){
  const s=String(display||'').trim();let m,y,mo,d;
  if((m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))){y=+m[1];mo=+m[2];d=+m[3];}
  else if((m=/^(\d{1,2})[.](\d{1,2})[.]?(?:\s*(\d{4}))?[.]?$/.exec(s))){
    d=+m[1];mo=+m[2];y=m[3]?+m[3]:(idMatch?2000+Number(idMatch[3]):NaN);
  }else if((m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))){
    d=+m[1];mo=+m[2];y=+m[3];
  }else if(raw instanceof Date&&!isNaN(raw.getTime())){
    const iso=Utilities.formatDate(raw,tz,'yyyy-MM-dd');m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    y=+m[1];mo=+m[2];d=+m[3];
  }else return null;
  if(!Number.isInteger(y)||y<2000||y>2100)return null;
  const date=new Date(Date.UTC(y,mo-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==mo-1||date.getUTCDate()!==d)return null;
  return {iso:[y,String(mo).padStart(2,'0'),String(d).padStart(2,'0')].join('-'),
    month:String(mo).padStart(2,'0')+String(y).slice(-2)};
}
function hist27Clock_(v){
  if(v instanceof Date)return '';
  const s=String(v===null||v===undefined?'':v).trim();
  const m=/^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s);if(!m)return '';
  const h=+m[1],min=+m[2];if(h>23||min>59)return '';
  return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');
}
function hist27Hash_(row){
  const json=JSON.stringify(row.map(v=>v instanceof Date?'DATE:'+v.getTime():v));
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,json));
}
