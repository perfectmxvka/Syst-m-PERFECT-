/**
 * AUTOMYČKA PERFECT 2.0
 * JEDNORÁZOVÉ ODSTRANĚNÍ DUPLIKÁTNÍCH OBJEDNÁVEK
 *
 * Nemaže zákazníky ani vozidla.
 * Kontroluje pouze __PERFECT_DB_OBJEDNAVKY.
 *
 * DUPLICITA:
 * 1) stejné GMAIL_MESSAGE_ID
 * NEBO
 * 2) stejné JMÉNO + TELEFON + EMAIL + VOZIDLO + DATUM + ČAS PŘÍJEZDU
 *
 * Nejprve spusť:
 *   perfectPreviewDuplicateOrders()
 *
 * Až výpis zkontroluješ:
 *   perfectRemoveDuplicateOrdersOnce()
 */

const PERFECT_DUP_SHEET = '__PERFECT_DB_OBJEDNAVKY';
const PERFECT_DUP_DATA_ROW = 3;
const PERFECT_DUP_COLS = 17;

function perfectPreviewDuplicateOrders() {
  const a = perfectAnalyzeDuplicateOrders_();
  Logger.log('========================================');
  Logger.log('NÁHLED DUPLIKÁTŮ – NIC SE NEMAŽE');
  Logger.log('Celkem objednávek: ' + a.total);
  Logger.log('Duplicitních řádků: ' + a.duplicates.length);
  Logger.log('Duplicitních skupin: ' + a.groups.length);
  a.groups.forEach(function(g, i) {
    Logger.log('');
    Logger.log('SKUPINA #' + (i + 1));
    Logger.log('PONECHAT: řádek ' + g.keep.row + ' | ORDER_ID=' + g.keep.id);
    g.duplicates.forEach(function(d) {
      Logger.log('SMAZAT: řádek ' + d.row + ' | ORDER_ID=' + d.id +
        ' | důvod: ' + d.reason);
    });
  });
  Logger.log('');
  Logger.log('Pokud je výpis správně, spusť:');
  Logger.log('perfectRemoveDuplicateOrdersOnce()');
  return a;
}

function perfectRemoveDuplicateOrdersOnce() {
  const a = perfectAnalyzeDuplicateOrders_();

  if (!a.duplicates.length) {
    Logger.log('Žádné duplicity nebyly nalezeny.');
    return a;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(PERFECT_DUP_SHEET);

  if (!sheet) throw new Error('List ' + PERFECT_DUP_SHEET + ' neexistuje.');

  const rows = a.duplicates.map(function(x) { return x.row; })
    .sort(function(x, y) { return y - x; });

  rows.forEach(function(row) { sheet.deleteRow(row); });

  Logger.log('========================================');
  Logger.log('DUPLICITY ODSTRANĚNY');
  Logger.log('Kontrolováno: ' + a.total);
  Logger.log('Odstraněno: ' + rows.length);
  Logger.log('Ponecháno: ' + (a.total - rows.length));
  Logger.log('========================================');

  return {
    success: true,
    checked: a.total,
    deleted: rows.length,
    remaining: a.total - rows.length
  };
}

function perfectAnalyzeDuplicateOrders_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(PERFECT_DUP_SHEET);

  if (!sheet) throw new Error('List ' + PERFECT_DUP_SHEET + ' neexistuje.');

  const last = sheet.getLastRow();
  if (last < PERFECT_DUP_DATA_ROW) {
    return { total: 0, duplicates: [], groups: [] };
  }

  const rows = sheet.getRange(
    PERFECT_DUP_DATA_ROW, 1,
    last - PERFECT_DUP_DATA_ROW + 1, PERFECT_DUP_COLS
  ).getValues();

  const gmail = {};
  const reservation = {};
  const groups = [];
  const duplicateMap = {};

  rows.forEach(function(r, i) {
    const o = {
      row: PERFECT_DUP_DATA_ROW + i,
      id: String(r[0] || '').trim(),
      date: perfectDupDate_(r[1]),
      time: perfectDupTime_(r[2]),
      name: perfectDupText_(r[5]),
      email: perfectDupEmail_(r[6]),
      phone: perfectDupPhone_(r[7]),
      vehicle: perfectDupText_(r[9]),
      gmailId: String(r[16] || '').trim()
    };

    if (!o.id && !o.name && !o.gmailId) return;

    let original = null;
    let reason = '';

    if (o.gmailId) {
      if (gmail[o.gmailId]) {
        original = gmail[o.gmailId];
        reason = 'STEJNÉ GMAIL MESSAGE ID';
      } else {
        gmail[o.gmailId] = o;
      }
    }

    const key = perfectDupKey_(o);
    if (!original && key) {
      if (reservation[key]) {
        original = reservation[key];
        reason = 'STEJNÁ REZERVACE';
      } else {
        reservation[key] = o;
      }
    }

    if (original) {
      duplicateMap[o.row] = {
        row: o.row,
        id: o.id,
        reason: reason
      };

      let group = groups.find(function(g) {
        return g.keep.row === original.row;
      });

      if (!group) {
        group = { keep: original, duplicates: [] };
        groups.push(group);
      }

      group.duplicates.push(duplicateMap[o.row]);
    }
  });

  return {
    total: rows.length,
    duplicates: Object.keys(duplicateMap).map(function(k) {
      return duplicateMap[k];
    }),
    groups: groups
  };
}

function perfectDupKey_(o) {
  if (!o.name || !o.phone || !o.email || !o.vehicle ||
      !o.date || !o.time) return '';

  return [
    o.name, o.phone, o.email, o.vehicle, o.date, o.time
  ].join('|');
}

function perfectDupText_(v) {
  return String(v || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function perfectDupEmail_(v) {
  return String(v || '').trim().toLowerCase();
}

function perfectDupPhone_(v) {
  let x = String(v || '').replace(/\D/g, '');
  if (!x) return '';
  if (x.indexOf('00420') === 0) x = x.substring(2);
  if (x.length === 9) x = '420' + x;
  return x;
}

function perfectDupDate_(v) {
  if (!v) return '';
  const tz = Session.getScriptTimeZone() || 'Europe/Prague';

  if (Object.prototype.toString.call(v) === '[object Date]' &&
      !isNaN(v.getTime())) {
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }

  const x = String(v).trim();
  let m = x.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);

  m = x.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);

  return x;
}

function perfectDupTime_(v) {
  if (v === '' || v === null || v === undefined) return '';
  const tz = Session.getScriptTimeZone() || 'Europe/Prague';

  if (Object.prototype.toString.call(v) === '[object Date]' &&
      !isNaN(v.getTime())) {
    return Utilities.formatDate(v, tz, 'HH:mm');
  }

  const x = String(v).trim();
  const m = x.match(/^(\d{1,2}):(\d{1,2})/);
  if (m) return ('0' + m[1]).slice(-2) + ':' + ('0' + m[2]).slice(-2);
  return x;
}
