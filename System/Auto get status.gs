/**
 * AUTOMYČKA PERFECT – 30_AUTO_STATUS.gs
 * Automatické dokončování objednávek podle délky programu.
 * Zápis do objednávek provádí výhradně modul 01 přes jeho databázové funkce.
 * Změny stavu obsluhou jsou trvale chráněné v technickém listu.
 * PERFECT NEW CAR: neznámý přesný čas => záměrně nepřepisujeme.
 */
const PERFECT_AUTO_STATUS = Object.freeze({
  OVERRIDES_SHEET: '__PERFECT_STATUS_RUCNI',
  SNAPSHOT_PREFIX: '__PERFECT_STATUS_ZALOHA_',
  DURATIONS: Object.freeze({
    'CLASSIC': 30,
    'COMFORT': 60,
    'PREMIUM': 90,
    'INDIVIDUAL': 150,
    'ELEGANCE': 60,
    'AVANGARDE': 150,
    'AVANTGARDE': 150,
    'EXCLUSIVE': 180,
    'PERFECT': 240
  })
});

function perfectAutoStatusNormalize_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function perfectAutoStatusDuration_(program) {
  const name = perfectAutoStatusNormalize_(program);
  if (!name || /\bPERFECT NEW CAR\b/.test(name)) return null; // délka zatím neurčena
  const names = Object.keys(PERFECT_AUTO_STATUS.DURATIONS).sort((a,b) => b.length-a.length);
  const found = names.find(key => new RegExp('(?:^| )' + key + '(?: |$)').test(name));
  return found ? PERFECT_AUTO_STATUS.DURATIONS[found] : null;
}

function perfectAutoStatusOverrideIds_() {
  const sh = databaseAutoStatusOverridesSheet_();
  const last = sh.getLastRow();
  return new Set(last < 2 ? [] : sh.getRange(2,1,last-1,1).getValues().map(r=>String(r[0]).trim()).filter(Boolean));
}

function perfectAutoStatusDate_(value, tz) {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/.exec(text);
  if (m) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  return '';
}
function perfectAutoStatusTime_(value, tz) {
  if (value instanceof Date) return Utilities.formatDate(value, tz, 'HH:mm');
  const m = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/.exec(String(value || '').trim());
  return m ? m[1].padStart(2,'0')+':'+m[2] : '';
}

/** Všechny kandidáty vypočítá bez jakékoli změny objednávek. */
function perfectAutoStatusCandidates_(now) {
  const sh = databaseGetOrdersSheet_();
  const tz = Session.getScriptTimeZone();
  const end = sh.getLastRow();
  const result = {eligible:[],skippedManual:0,skippedUnknown:0,skippedOtherStatus:0,skippedFuture:0,skippedBadDate:0};
  if (end < 3) return result;
  const headers = Array.from(PERFECT_DB_ORDER_HEADERS);
  const idx = key => headers.indexOf(key);
  const rows = sh.getRange(3,1,end-2,headers.length).getValues();
  const overridden = perfectAutoStatusOverrideIds_();
  rows.forEach((row,i) => {
    const id = String(row[idx('ORDER_ID')] || '').trim();
    if (!id) return;
    if (perfectAutoStatusNormalize_(row[idx('STAV_OBJEDNAVKY')]) !== 'CEKA SE') {result.skippedOtherStatus++;return;}
    if (overridden.has(id)) {result.skippedManual++;return;}
    const duration = perfectAutoStatusDuration_(row[idx('MYCI_PROGRAM')]);
    if (duration === null) {result.skippedUnknown++;return;}
    const date = perfectAutoStatusDate_(row[idx('DATUM_OBJEDNANI')],tz);
    const time = perfectAutoStatusTime_(row[idx('CAS_PRIJEZDU')],tz);
    if (!date || !time) {result.skippedBadDate++;return;}
    let arrival;
    try {arrival = Utilities.parseDate(date+' '+time,tz,'yyyy-MM-dd HH:mm');}
    catch(e) {result.skippedBadDate++;return;}
    if (!arrival || isNaN(arrival.getTime())) {result.skippedBadDate++;return;}
    const deadline = arrival.getTime() + duration*60000;
    if (now.getTime() < deadline) {result.skippedFuture++;return;}
    result.eligible.push({id,row:3+i,program:String(row[idx('MYCI_PROGRAM')]),arrival:date+' '+time,durationMinutes:duration});
  });
  return result;
}

/** Spusť nejdřív tuto funkci, nic nemění. */
function perfectAutoStatusPreview() {
  return perfectDatabaseWithLock_('perfectAutoStatusPreview', () => {
    const x = perfectAutoStatusCandidates_(new Date());
    const summary = {kDokonceni:x.eligible.length,rucniNemenit:x.skippedManual,neznamyProgram:x.skippedUnknown,
      jinyStavNemenit:x.skippedOtherStatus,budouci:x.skippedFuture,neplatneDatum:x.skippedBadDate,
      priklady:x.eligible.slice(0,20)};
    Logger.log(JSON.stringify(summary,null,2));
    return summary;
  });
}

/** Jednorázová úprava historických objednávek: vždy vytvoří zálohu listu. */
function perfectAutoStatusBackfill() {
  const result = databaseAutoStatusApply_(true);
  Logger.log(JSON.stringify(result));
  return result;
}

/** Funkce volaná časovým spouštěčem; funguje i bez otevřeného webu. */
function perfectAutoStatusRun() { return databaseAutoStatusApply_(false); }

/** Instalace jediného spouštěče každých 5 minut. Spusť až po backfillu. */
function perfectAutoStatusInstall() {
  const handler = 'perfectAutoStatusRun';
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler).forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(handler).timeBased().everyMinutes(5).create();
  return {success:true,intervalMinutes:5};
}
