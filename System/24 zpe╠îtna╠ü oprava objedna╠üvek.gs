/**
 * AUTOMYČKA PERFECT 2.0 — V26 / BEZPEČNÝ NÁHLED HISTORIE
 *
 * Nahrazuje modul 24 V25. Nezapisuje do centrální databáze.
 * NEMĚNÍ ORDER_ID ani CAS_PRIJEZDU.
 *
 * Po změně časového pásma LA -> Praha čte pro pořadí primárně
 * ZOBRAZENÝ ČAS v buňce databáze (getDisplayValues), nikoliv
 * Utilities.formatDate(rawDate, 'Europe/Prague', 'HH:mm').
 *
 * Upozornění: viditelný čas je nutné ověřit proti zdrojové rezervaci.
 * Změna časového pásma mohla ovlivnit i zobrazení historických hodnot.
 */
const PERFECT_HIST26 = Object.freeze({
  SPREADSHEET_ID: '1oOB6wO-h8bp1S_praSiVWtg03Y5qVWs1U63GsesQ0vo',
  DB: '__PERFECT_DB_OBJEDNAVKY',
  PREVIEW: '__PERFECT_NAVRH_OPRAV_V26',
  TIMEZONE: 'Europe/Prague',
  HEADER_ROW: 2,
  FIRST_DATA_ROW: 3,
  WIDTH: 24,
  OF_WARNING_BEFORE: '2026-10-11',
  MIN_TIME: '08:00',
  MAX_TIME: '19:30'
});

/** Hlavní funkce — jen náhled, bez zásahu do DB. */
function perfectHistoricalPreviewV26() {
  const c = PERFECT_HIST26;
  const ss = SpreadsheetApp.openById(c.SPREADSHEET_ID);
  const db = hist26Db_(ss);
  const scriptZone = Session.getScriptTimeZone();
  const sheetZone = ss.getSpreadsheetTimeZone();
  const n = Math.max(0, db.getLastRow() - c.FIRST_DATA_ROW + 1);
  const range = n ? db.getRange(c.FIRST_DATA_ROW, 1, n, c.WIDTH) : null;
  const raw = range ? range.getValues() : [];
  const shown = range ? range.getDisplayValues() : [];
  const idPattern = /^(N|OF)(\d{2})(\d{2})-(\d+)$/i;
  const rows = [], byMonth = new Map(), blocked = new Set(), ids = new Map();
  const globalWarnings = [];
  if (scriptZone !== c.TIMEZONE) globalWarnings.push('SCRIPT NENÍ Europe/Prague: ' + scriptZone);
  if (sheetZone !== c.TIMEZONE) globalWarnings.push('TABULKA NENÍ Europe/Prague: ' + sheetZone);

  for (let i = 0; i < n; i++) {
    const rowNo = i + c.FIRST_DATA_ROW, r = raw[i], d = shown[i];
    const oldId = String(d[0] || '').trim();
    const match = idPattern.exec(oldId);
    const prefix = match ? match[1].toUpperCase() : '';
    const oldMonth = match ? match[2] + match[3] : '';
    // Datum je primárně převzato z textu, který vidí uživatel v DB.
    const date = hist26Date_(d[1], r[1], match, sheetZone);
    const day = date ? date.iso : '';
    const month = date ? date.month : '';
    // Primárně číst čas, který se zobrazuje přímo v DB.
    const time = hist26Clock_(d[2]);
    const rawPrague = r[2] instanceof Date && !isNaN(r[2].getTime())
      ? Utilities.formatDate(r[2], c.TIMEZONE, 'HH:mm') : hist26Clock_(r[2]);
    const notes = [];
    if (!oldId && !String(d[1] || '').trim() && !String(d[2] || '').trim()) {
      // Prázdné či poloprázdné řádky nepřečíslovávat.
      notes.push('PRÁZDNÝ/NEÚPLNÝ ŘÁDEK');
    }
    if (!date) notes.push('NEJASNÉ DATUM PŘÍJEZDU');
    if (!match) notes.push('NEPLATNÉ ORDER_ID');
    if (match && date && oldMonth !== month) notes.push('MĚSÍC V ID NEODPOVÍDÁ DATU');
    if (prefix === 'OF' && day && day < c.OF_WARNING_BEFORE)
      notes.push('STARÉ OF: OVĚŘIT SKUTEČNÝ PŮVOD (NEPŘEVÁDĚT AUTOMATICKY)');
    if (!time) notes.push('NEČITELNÝ ČAS V DATABÁZI');
    else if (time < c.MIN_TIME || time > c.MAX_TIME) notes.push('ČAS MIMO OBVYKLÝ PROVOZ');
    if (rawPrague && time && rawPrague !== time)
      notes.push('ODLIŠNÁ INTERPRETACE Date — NEOPRAVOVAT NASLEPO');
    const item = {
      row: rowNo, oldId, prefix, day, month, time, rawPrague,
      proposed: '', notes, hash: hist26Hash_(r), manual: ''
    };
    rows.push(item);
    if (oldId) {
      if (!ids.has(oldId)) ids.set(oldId, []);
      ids.get(oldId).push(item);
    }
    if (month) {
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month).push(item);
      if (!date || !match || oldMonth !== month || !time ||
          (prefix === 'OF' && day < c.OF_WARNING_BEFORE) ||
          (time && (time < c.MIN_TIME || time > c.MAX_TIME))) blocked.add(month);
    }
  }

  for (const items of ids.values()) if (items.length > 1) {
    items.forEach(item => {
      item.notes.push('DUPLICITNÍ ORDER_ID');
      if (item.month) blocked.add(item.month);
    });
  }

  // Pokud nelze datum/ID zařadit, je celý návrh neúplný.
  const unassigned = rows.filter(x => !x.day || !idPattern.test(x.oldId)).length;
  if (unassigned) globalWarnings.push('NEZAŘAZENÉ ŘÁDKY: ' + unassigned);
  if (globalWarnings.some(x => x.indexOf('NENÍ Europe/Prague') !== -1)) {
    for (const code of byMonth.keys()) blocked.add(code);
  }

  // Ruční potvrzené časy z minulého náhledu lze zachovat, ale NESMÍ se
  // automaticky použít pro výpočet bez opětovného prověření zdroje.
  let preview = ss.getSheetByName(c.PREVIEW);
  if (!preview) preview = ss.insertSheet(c.PREVIEW);
  const keep = new Map();
  if (preview.getLastRow() > 1 && preview.getLastColumn() >= 11) {
    const previous = preview.getRange(2, 1, preview.getLastRow() - 1, 11).getDisplayValues();
    previous.forEach(a => {
      const correction = hist26Clock_(a[7]);
      if (correction) keep.set(a[0] + '|' + a[10], correction);
    });
  }
  rows.forEach(item => { item.manual = keep.get(item.row + '|' + item.hash) || ''; });

  // Pokud je v měsíci více objednávek se stejným datumem/časem,
  // jejich vzájemné pořadí nelze prokázat: zablokovat měsíc.
  for (const [month, items] of byMonth.entries()) {
    const seenSlots = new Set();
    for (const item of items) {
      if (!item.day || !item.time) continue;
      const slot = item.day + ' ' + item.time;
      if (seenSlots.has(slot)) {
        blocked.add(month);
        item.notes.push('STEJNÝ TERMÍN JAKO JINÁ ZAKÁZKA — POŘADÍ NEJASNÉ');
      }
      seenSlots.add(slot);
    }
    if (blocked.has(month)) {
      items.forEach(x => x.notes.push('MĚSÍC BLOKOVÁN — POUZE KONTROLA'));
      continue;
    }
    items.sort((a, b) => a.day.localeCompare(b.day) ||
      a.time.localeCompare(b.time) || a.row - b.row);
    items.forEach((x, i) => {
      x.proposed = x.prefix + month + '-' + String(i + 1).padStart(2, '0');
    });
  }

  const headers = [
    'DB ŘÁDEK', 'PŮVODNÍ ORDER_ID', 'NÁVRH ID (NEZAPISUJE SE)',
    'DATUM PŘÍJEZDU', 'ČAS VIDITELNÝ V DB', 'ČAS Z Date V PRAZE (DIAGNOSTIKA)',
    'STAV / VAROVÁNÍ', 'RUČNĚ OVĚŘENÝ ČAS (POUZE POZNÁMKA)',
    'TYP N/OF', 'MĚSÍC', 'OTISK ŘÁDKU'
  ];
  const output = rows.map(x => [
    x.row, x.oldId, x.proposed, x.day, x.time, x.rawPrague,
    x.notes.join(' | '), x.manual, x.prefix, x.month, x.hash
  ]);
  preview.clearContents();
  preview.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (output.length) preview.getRange(2, 1, output.length, headers.length).setValues(output);
  preview.getRange('D:F').setNumberFormat('@');
  preview.getRange('H:H').setNumberFormat('@');
  preview.setFrozenRows(1);
  preview.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  const changes = rows.filter(x => x.proposed && x.proposed !== x.oldId).length;
  const differences = rows.filter(x => x.time && x.rawPrague && x.time !== x.rawPrague).length;
  Logger.log('V26: celkem ' + n + '; návrhy ID ' + changes +
    '; rozdíly Date/zobrazení ' + differences + '; blokované měsíce: ' + [...blocked].join(', '));
  Logger.log('Časové pásmo tabulky: ' + sheetZone + '; Apps Script: ' + scriptZone);
  Logger.log('VAROVÁNÍ: ' + (globalWarnings.join(' | ') || 'žádná globální'));
  Logger.log('Náhled: ' + c.PREVIEW + '. ZDROJOVÁ DB NEBYLA ZMĚNĚNA.');
  return { total: n, proposedIds: changes, dateDisplayDifferences: differences,
    blockedMonths: [...blocked], warnings: globalWarnings, preview: c.PREVIEW };
}

/** Shrnutí návrhů bez zápisu. */
function perfectHistoricalImpactV26() {
  const c = PERFECT_HIST26, ss = SpreadsheetApp.openById(c.SPREADSHEET_ID);
  const sh = ss.getSheetByName(c.PREVIEW);
  if (!sh || sh.getLastRow() < 2) throw Error('Nejprve spusť perfectHistoricalPreviewV26.');
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getDisplayValues();
  const changed = rows.filter(r => r[2] && r[1] !== r[2]);
  const warnings = rows.filter(r => r[6]);
  Logger.log('V26 DOPAD: navržené změny ID: ' + changed.length +
    '; řádky s upozorněním: ' + warnings.length);
  Logger.log('Prvních 20: ' + JSON.stringify(changed.slice(0, 20).map(r => ({
    row: r[0], old: r[1], next: r[2], date: r[3], time: r[4]
  }))));
  Logger.log('POUZE NÁHLED. Nic nebylo přepsáno.');
}

/** Jen ověření konfigurace — bezpečné ke spuštění. */
function perfectHistoricalTimezoneCheckV26() {
  const c = PERFECT_HIST26, ss = SpreadsheetApp.openById(c.SPREADSHEET_ID);
  const result = {
    expected: c.TIMEZONE,
    spreadsheet: ss.getSpreadsheetTimeZone(),
    script: Session.getScriptTimeZone(),
    same: ss.getSpreadsheetTimeZone() === c.TIMEZONE &&
      Session.getScriptTimeZone() === c.TIMEZONE
  };
  Logger.log(JSON.stringify(result));
  return result;
}

function hist26Db_(ss) {
  const c = PERFECT_HIST26, sh = ss.getSheetByName(c.DB);
  if (!sh) throw Error('Nenalezen databázový list ' + c.DB);
  const header = sh.getRange(c.HEADER_ROW, 1, 1, c.WIDTH)
    .getDisplayValues()[0].map(x => String(x).trim().toUpperCase());
  const required = { ORDER_ID: 0, DATUM_OBJEDNANI: 1, CAS_PRIJEZDU: 2,
    JMENO_PRIJMENI: 6, EMAIL: 7, TELEFON: 8, VOZIDLO: 10 };
  Object.entries(required).forEach(([key, idx]) => {
    if (header[idx] !== key) throw Error('NESHODA HLAVIČKY: ' + key +
      ' ve sloupci ' + (idx + 1) + '. ZASTAVENO.');
  });
  return sh;
}

/** Datum dle zobrazení v DB. Rok u DD.MM odvozujeme jen z původního ID. */
function hist26Date_(display, raw, idMatch, tz) {
  const s = String(display || '').trim();
  let m, y, month, day;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
    y = +m[1]; month = +m[2]; day = +m[3];
  } else if ((m = /^(\d{1,2})\.(\d{1,2})\.(?:\s*(\d{4}))?$/.exec(s))) {
    day = +m[1]; month = +m[2];
    y = m[3] ? +m[3] : (idMatch ? 2000 + Number(idMatch[3]) : NaN);
  } else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) {
    // Jazyk tabulky je Česko: DD/MM/YYYY.
    day = +m[1]; month = +m[2]; y = +m[3];
  } else if (raw instanceof Date && !isNaN(raw.getTime())) {
    const iso = Utilities.formatDate(raw, tz, 'yyyy-MM-dd');
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    y = +m[1]; month = +m[2]; day = +m[3];
  } else return null;
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;
  const valid = new Date(Date.UTC(y, month - 1, day));
  if (valid.getUTCFullYear() !== y || valid.getUTCMonth() !== month - 1 ||
      valid.getUTCDate() !== day) return null;
  return { iso: [y, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-'),
    month: String(month).padStart(2, '0') + String(y).slice(-2) };
}

function hist26Clock_(value) {
  if (value instanceof Date) return '';
  const s = String(value === null || value === undefined ? '' : value).trim();
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s);
  if (!m) return '';
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return '';
  return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

function hist26Hash_(row) {
  const json = JSON.stringify(row.map(v => v instanceof Date ? 'DATE:' + v.getTime() : v));
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, json));
}
