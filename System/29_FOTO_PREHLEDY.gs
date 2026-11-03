/**
 * AUTOMYČKA PERFECT 2.0 — 29_FOTO_PREHLEDY.gs
 * Doplněk k 28_FOTOGRAFIE_BACKEND.gs. Jen čte profilové obrázky.
 * Nic nezapisuje do centrální databáze.
 */
function perfectMediaGetProfileBatch(token, request) {
  perfectRepairRequireUser_(token);
  request = request || {};
  var kind = String(request.kind || '').toLowerCase();
  if (kind !== 'customer' && kind !== 'vehicle') throw new Error('Neznámý typ fotografie.');
  var ids = request.ids;
  if (!Array.isArray(ids) || ids.length > 10) throw new Error('Najednou lze načíst nejvýše 10 fotografií.');
  var unique = [];
  ids.forEach(function(id) {
    var valid = perfectMediaValidate_(kind, id, 'profile');
    if (unique.indexOf(valid.id) === -1) unique.push(valid.id);
  });
  // Ověření, že každé ID opravdu patří do existující evidence.
  var rows = kind === 'customer' ? databaseGetAllCustomers() : databaseGetAllVehicles();
  var idField = kind === 'customer' ? 'CUSTOMER_ID' : 'VEHICLE_ID';
  var validIds = {};
  rows.forEach(function(r) { validIds[String(r[idField])] = true; });
  var props = PropertiesService.getScriptProperties();
  var photos = {};
  unique.forEach(function(id) {
    if (!validIds[id]) return;
    var fileId = props.getProperty(perfectMediaKey_(kind, id, 'profile'));
    if (!fileId) return;
    var data = perfectMediaImageData_(fileId);
    if (data) photos[id] = data;
  });
  return {success:true, kind:kind, photos:photos};
}