/* =====================================================
 * 05_GENERATOR_ORDER_ID.gs
 * ===================================================== */

function generateOrderId(datumObjednavky, sourceType) {
  const datum = orderIdNormalizeDate_(datumObjednavky);
  if (!datum) throw new Error('Nelze vygenerovat ORDER_ID. Datum objednávky není platné.');
  if (typeof databaseGetAllOrders !== 'function') throw new Error('Chybí databaseGetAllOrders() z centrální databáze 01.');

  const monthPrefix = orderIdCreatePrefix_(datum.getFullYear(), datum.getMonth() + 1);
  const isOffline = String(sourceType || '').toUpperCase() === 'OFFLINE' || String(sourceType || '').toUpperCase() === 'OF';
  const outputPrefix = isOffline ? monthPrefix.replace(/^N/, 'OF') : monthPrefix;
  
  const orders = databaseGetAllOrders();
  if (!Array.isArray(orders)) throw new Error('Centrální databáze nevrátila seznam objednávek.');

  const sharedPattern = new RegExp('^(?:N|OF)' + monthPrefix.slice(1).replace('-', '') + '-(\\d+)$');
  const usedNumbers = new Set();
  let highestNumber = 0;

  orders.forEach(function(order) {
    if (!order || typeof order !== 'object') return;
    const orderId = String(order.ORDER_ID || order.orderId || order.id || '').trim().toUpperCase();
    const match = orderId.match(sharedPattern);
    if (!match) return;
    const number = Number(match[1]);
    if (!Number.isSafeInteger(number) || number < 1) return;
    usedNumbers.add(number);
    if (number > highestNumber) highestNumber = number;
  });

  let nextNumber = highestNumber + 1;
  while (usedNumbers.has(nextNumber)) nextNumber++;
  return orderIdBuild_(outputPrefix, nextNumber);
}

function orderIdCreatePrefix_(year, month) {
  const monthCode = String(month).padStart(2, '0');
  const yearCode = String(year).slice(-2);
  return 'N' + monthCode + yearCode + '-';
}

function orderIdBuild_(prefix, number) {
  if (!prefix || !number || number < 1) throw new Error('Neplatné údaje pro vytvoření ORDER_ID.');
  const sequence = String(number).padStart(2, '0');
  return String(prefix) + sequence;
}

function orderIdNormalizeDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return new Date(value.getTime());
  if (!value) return null;
  const text = String(value).trim();

  const czech = text.match(/^(\d{1,2})\s*[.\\/-]\s*(\d{1,2})\s*[.\\/-]\s*(\d{4})/);
  if (czech) {
    const day = parseInt(czech[1], 10);
    const month = parseInt(czech[2], 10);
    const year = parseInt(czech[3], 10);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) return date;
  }

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (iso) {
    const year = parseInt(iso[1], 10);
    const month = parseInt(iso[2], 10);
    const day = parseInt(iso[3], 10);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) return date;
  }

  const parsed = new Date(text);
  return !isNaN(parsed.getTime()) ? parsed : null;
}