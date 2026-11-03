/**
 * AUTOMYČKA PERFECT 2.0 — V28 READ-ONLY AUDIT ORDER_ID
 * Čte centrální objednávky; žádné listy nevytváří ani neupravuje.
 */
function perfectOrderIdAuditV28() {
  if (typeof databaseGetAllOrders !== 'function') throw new Error('Chybí databaseGetAllOrders().');
  const orders = databaseGetAllOrders();
  const pattern = /^(N|OF)(\d{2})(\d{2})-(\d+)$/i;
  const byId = Object.create(null);
  const groups = Object.create(null);
  const problems = [];
  const stats = {total: orders.length, valid: 0, invalid: 0, duplicate: 0, missingSequence: 0, monthMismatch: 0, examples: []};
  orders.forEach(function(o, i) {
    const id = String(o.ORDER_ID || '').trim().toUpperCase();
    const row = i + 3; // Přibližný řádek; prázdné řádky databaseGetAllOrders() vynechává.
    const m = pattern.exec(id);
    if (!m || +m[2] < 1 || +m[2] > 12 || !Number.isSafeInteger(+m[4]) || +m[4] < 1) {
      stats.invalid++;
      problems.push({rowApprox: row, id: id, issue: 'NEPLATNÝ FORMÁT'});
      return;
    }
    stats.valid++;
    if (byId[id] !== undefined) {
      stats.duplicate++;
      problems.push({rowApprox: row, id: id, issue: 'DUPLICITA ID'});
    } else byId[id] = row;
    const month = m[2] + m[3];
    if (!groups[month]) groups[month] = [];
    groups[month].push(+m[4]);
    try {
      const d = o.DATUM_OBJEDNANI;
      const parsed = d instanceof Date ? d : orderIdNormalizeDate_(d);
      if (!(parsed instanceof Date) || !Number.isFinite(parsed.getTime())) throw new Error('Neplatné datum');
      const actual = Utilities.formatDate(parsed, 'Europe/Prague', 'MMyy');
      if (actual !== month) {
        stats.monthMismatch++;
        problems.push({rowApprox: row, id: id, issue: 'MĚSÍC ID SE LIŠÍ OD DATA PŘÍJEZDU', visitMonth: actual});
      }
    } catch (e) {
      problems.push({rowApprox: row, id: id, issue: 'DATUM NELZE OVĚŘIT'});
    }
  });
  const months = Object.keys(groups).sort().map(function(month) {
    const nums = groups[month];
    const uniq = new Set(nums);
    const max = Math.max.apply(null, nums);
    const missing = [];
    for (let n = 1; n <= max && missing.length < 30; n++) if (!uniq.has(n)) missing.push(n);
    stats.missingSequence += max - uniq.size;
    return {month: month, count: nums.length, maximum: max, gaps: max - uniq.size, firstMissing: missing};
  });
  stats.examples = problems.slice(0, 30);
  const result = {stats: stats, months: months, warning: 'Mezery nemusí být chybou (archivované či zrušené ID). NIKDY neopravovat pouze podle mezer.', databaseChanged: false};
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
