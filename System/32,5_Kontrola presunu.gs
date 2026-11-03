/**
 * AUTOMYČKA PERFECT 2.0 — 27b_LOGA_KONTROLA_PRENOSU.gs
 * Bezpečná diagnostika. NIC NEMĚNÍ na Disku ani v databázi.
 * Používá PERFECT_LOGO42_FOLDER_ID a PERFECT_LOGA_42_MANIFEST z modulů 27 a 27a.
 */
function perfectLogo42KontrolaPrenosu() {
  var root = DriveApp.getFolderById(PERFECT_LOGO42_FOLDER_ID);
  var result = {};
  ['mala', 'velka'].forEach(function(size) {
    var iterator = root.getFoldersByName(size);
    if (!iterator.hasNext()) {
      Logger.log('CHYBÍ podsložka: ' + size);
      result[size] = {found: 0, missing: ['CELÁ SLOŽKA'], tooLarge: []};
      return;
    }
    var folder = iterator.next();
    var found = 0, missing = [], tooLarge = [], bytesTotal = 0;
    PERFECT_LOGA_42_MANIFEST.brands.forEach(function(brand) {
      var files = folder.getFilesByName(brand.key + '.png');
      if (!files.hasNext()) { missing.push(brand.key); return; }
      var file = files.next();
      var bytes = file.getSize();
      found++;
      bytesTotal += bytes;
      if (size === 'mala' && bytes > 70000) tooLarge.push(brand.key + ' (' + bytes + ' B)');
    });
    result[size] = {found: found, missing: missing, tooLarge: tooLarge, bytesTotal: bytesTotal};
    Logger.log(size.toUpperCase() + ': nalezeno ' + found + '/42, celkem ' + Math.round(bytesTotal / 1024) + ' KiB');
    Logger.log('Chybějící: ' + (missing.join(', ') || 'žádné'));
    if (size === 'mala') Logger.log('Příliš velká pro současný modul 27a (>70 kB): ' + (tooLarge.join(', ') || 'žádná'));
  });
  return result;
}
