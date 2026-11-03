/**
 * AUTOMYČKA PERFECT 2.0 — 05_GENERATOR_ORDER_ID.gs — V28
 * Jedna měsíční řada N/OF. Měsíc se určuje podle data příjezdu.
 * Pořadové číslo je přiděleno při vytvoření objednávky, nikdy se nepřečísluje.
 * VOLAT JEN z databaseCreateOrder() pod perfectDatabaseWithLock_().
 * Modul sám do databáze NIC nezapisuje.
 */
const PERFECT_ORDER_ID_V28_TZ = 'Europe/Prague';

function perfect40Original_generateOrderId_(datumObjednavky, sourceType) {
  if (typeof databaseGetAllOrders !== 'function') {
    throw new Error('Chybí databaseGetAllOrders() z centrální databáze.');
  }
  const date = orderIdNormalizeDate_(datumObjednavky);
  if (!date) throw new Error('ORDER_ID: chybí platné datum příjezdu.');
  const month = Utilities.formatDate(date, PERFECT_ORDER_ID_V28_TZ, 'MMyy');
  const type = String(sourceType == null ? 'ONLINE' : sourceType).trim().toUpperCase();
  if (!['ONLINE', 'N', 'OFFLINE', 'OF', 'DETAILING', 'D'].includes(type)) {
    throw new Error('ORDER_ID: neznámý typ zakázky ' + type);
  }
  const detailing = type === 'DETAILING' || type === 'D';
  const prefix = detailing ? 'D' : type === 'OFFLINE' || type === 'OF' ? 'OF' : 'N';
  const matcher = new RegExp((detailing ? '^D' : '^(?:N|OF)') + month + '-([0-9]+)$', 'i');
  const orders = databaseGetAllOrders();
  if (!Array.isArray(orders)) throw new Error('Databáze nevrátila pole objednávek.');

  let maximum = 0;
  const seen = new Set();
  orders.forEach(function (o) {
    const id = String(o && (o.ORDER_ID || o.orderId) || '').trim().toUpperCase();
    if (!id) return;
    if (seen.has(id)) throw new Error('Duplicitní ORDER_ID v databázi: ' + id + '. Generování zastaveno.');
    seen.add(id);
    const match = matcher.exec(id);
    if (match) {
      const n = Number(match[1]);
      if (!Number.isSafeInteger(n) || n < 1) throw new Error('Neplatné pořadí ORDER_ID: ' + id);
      maximum = Math.max(maximum, n);
    }
  });

  // Archiv testovacích objednávek: ani archivovaná ID nesmějí být znovu přidělena.
  if (typeof perfectDatabaseGetSpreadsheet_ === 'function') {
    const archive = perfectDatabaseGetSpreadsheet_().getSheetByName('__PERFECT_ARCHIV_TEST_OBJEDNAVEK');
    if (archive && archive.getLastRow() >= 2) {
      // V archivu je ORDER_ID ve sloupci B.
      archive.getRange(2, 2, archive.getLastRow() - 1, 1).getValues().forEach(function (r) {
        const id = String(r[0] || '').trim().toUpperCase();
        const match = matcher.exec(id);
        if (match) {
          const n = Number(match[1]);
          if (!Number.isSafeInteger(n) || n < 1) throw new Error('Neplatné archivní ORDER_ID: ' + id);
          maximum = Math.max(maximum, n);
        }
      });
    }
  }

  // Znovu nepřidělit ani nejvyšší ID bezpečně vyřazené duplicity nebo admin archivu.
  [ ['__PERFECT_DUPLICITY_ARCHIV','REMOVED_ORDER_ID'], ['__PERFECT_ARCHIV_OBJEDNAVEK_ADMIN','ORDER_ID'] ].forEach(function(spec){
    var sh=perfectDatabaseGetSpreadsheet_().getSheetByName(spec[0]);if(!sh||sh.getLastRow()<2)return;
    var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0],column=headers.indexOf(spec[1])+1;
    if(!column)throw Error('Chybí ID sloupec v archivu '+spec[0]);
    sh.getRange(2,column,sh.getLastRow()-1,1).getValues().forEach(function(row){var m=matcher.exec(String(row[0]||'').trim());if(m)maximum=Math.max(maximum,Number(m[1]));});
  });
  const next = maximum + 1;
  if (!Number.isSafeInteger(next)) throw new Error('Měsíční číselná řada je vyčerpaná.');
  const id = prefix + month + '-' + String(next).padStart(2, '0');
  if (seen.has(id)) throw new Error('Kolize ORDER_ID: ' + id);
  return id;
}

function orderIdNormalizeDate_(value) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? new Date(value.getTime()) : null;
  }
  const s = String(value == null ? '' : value).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return orderIdDateParts_(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{4})\.?$/.exec(s);
  if (m) return orderIdDateParts_(+m[3], +m[2], +m[1]);
  return null;
}

function orderIdDateParts_(year, month, day) {
  if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return Utilities.parseDate(iso, PERFECT_ORDER_ID_V28_TZ, 'yyyy-MM-dd');
}

// Zachování kompatibility se staršími moduly.
function orderIdCreatePrefix_(year, month) {
  return 'N' + String(month).padStart(2, '0') + String(year).slice(-2) + '-';
}
function orderIdBuild_(prefix, number) {
  const n = Number(number);
  if (!prefix || !Number.isSafeInteger(n) || n < 1) throw new Error('Neplatné údaje pro ORDER_ID.');
  return String(prefix) + String(n).padStart(2, '0');
}

/** Nezapisuje nic: pouze ukáže, jaké číslo by dostala další zakázka. */
function perfect40Original_perfectOrderIdPreviewV28_() {
  const date = Utilities.formatDate(new Date(), PERFECT_ORDER_ID_V28_TZ, 'yyyy-MM-dd');
  const result = {
    date: date,
    online: generateOrderId(date, 'ONLINE'),
    offline: generateOrderId(date, 'OFFLINE'),
    note: 'Obě varianty mají stejné pořadí, protože nebyla vytvořena nová objednávka.'
  };
  Logger.log(JSON.stringify(result));
  return result;
}
