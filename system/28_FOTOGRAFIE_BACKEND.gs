/**
 * AUTOMYČKA PERFECT 2.0 — 28_FOTOGRAFIE_BACKEND.gs (V1)
 * Pro aktuální Index.html s PerfectDesign.connect() a voláním
 * perfectMediaGet / perfectMediaSave.
 *
 * Média: soukromá složka Google Drive; metadata: ScriptProperties.
 * NEMĚNÍ listy centrální databáze, účty ani ID subjektů.
 * Používá existující perfectRepairRequireUser_ a databaseGetAllCustomers/Vehicles.
 */
var PERFECT_MEDIA_V1 = {
  FOLDER_KEY: 'PERFECT_MEDIA_V1_FOLDER_ID',
  ITEM_PREFIX: 'PERFECT_MEDIA_V1_',
  MAX_BYTES: 1450000
};

function perfectMediaValidate_(kind, id, slot) {
  kind = String(kind || '').toLowerCase();
  id = String(id || '').trim();
  slot = String(slot || '').toLowerCase();
  if (kind !== 'customer' && kind !== 'vehicle') throw new Error('Neznámý typ fotografie.');
  if (!id || id.length > 100 || !/^[a-zA-Z0-9_\-]+$/.test(id)) throw new Error('Neplatné ID subjektu.');
  if (kind === 'customer' && slot !== 'profile') throw new Error('Zákazník může mít jen profilovou fotografii.');
  if (kind === 'vehicle' && !/^(profile|gallery[1-5])$/.test(slot)) throw new Error('Vozidlo může mít profilovou fotografii a galerii 1–5.');
  return {kind:kind, id:id, slot:slot};
}

function perfectMediaExists_(kind, id) {
  var rows = kind === 'customer' ? databaseGetAllCustomers() : databaseGetAllVehicles();
  var field = kind === 'customer' ? 'CUSTOMER_ID' : 'VEHICLE_ID';
  if (!rows.some(function(r){ return String(r[field]) === id; })) {
    throw new Error('Záznam nebyl nalezen v centrální databázi: ' + kind + '.');
  }
}

function perfectMediaKey_(kind,id,slot) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, kind+'|'+id+'|'+slot);
  var hash = bytes.map(function(b){ return ('0'+(b & 255).toString(16)).slice(-2); }).join('');
  return PERFECT_MEDIA_V1.ITEM_PREFIX + hash;
}

function perfectMediaFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PERFECT_MEDIA_V1.FOLDER_KEY);
  if (id) {
    try { var f=DriveApp.getFolderById(id); f.getName(); return f; } catch(e) {}
  }
  var folder = DriveApp.createFolder('AUTOMYCKA_PERFECT_MEDIA_SOUKROME');
  props.setProperty(PERFECT_MEDIA_V1.FOLDER_KEY,folder.getId());
  return folder;
}

function perfectMediaImageData_(fileId) {
  if (!fileId) return '';
  try {
    var blob=DriveApp.getFileById(fileId).getBlob();
    var type=blob.getContentType();
    if (!/^image\/(jpeg|png|webp)$/.test(type) || blob.getSize()>PERFECT_MEDIA_V1.MAX_BYTES) return '';
    return 'data:'+type+';base64,'+Utilities.base64Encode(blob.getBytes());
  } catch(e) {
    console.warn('Fotografie nedostupná: '+e.message);
    return '';
  }
}

/** Vrací pouze fotografie zadaného subjektu. Volá se automaticky z karty. */
function perfectMediaGet(token, request) {
  perfectRepairRequireUser_(token);
  request=request||{};
  var kind=String(request.kind||'').toLowerCase(), id=String(request.id||'').trim();
  var slots=kind==='customer' ? ['profile'] : kind==='vehicle' ? ['profile','gallery1','gallery2','gallery3','gallery4','gallery5'] : [];
  if (!slots.length) throw new Error('Neznámý typ subjektu.');
  perfectMediaValidate_(kind,id,'profile');
  perfectMediaExists_(kind,id);
  var props=PropertiesService.getScriptProperties();
  var photos={};
  slots.forEach(function(slot){
    var fileId=props.getProperty(perfectMediaKey_(kind,id,slot));
    if (fileId) {
      var data=perfectMediaImageData_(fileId);
      if (data) photos[slot]=data;
    }
  });
  return {success:true,photos:photos};
}

/** Uloží jednu fotografii; předchozí soubor zůstane na Disku jako záloha. */
function perfectMediaSave(token, request) {
  var user=perfectRepairRequireUser_(token);
  request=request||{};
  var v=perfectMediaValidate_(request.kind,request.id,request.slot);
  perfectMediaExists_(v.kind,v.id);
  var dataUrl=String(request.dataUrl||'');
  if (dataUrl.length>2000000) throw new Error('Fotografie je příliš velká.');
  var m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error('Povolen je jen obrázek JPG, PNG nebo WebP.');
  var bytes=Utilities.base64Decode(m[2]);
  if (bytes.length<100 || bytes.length>PERFECT_MEDIA_V1.MAX_BYTES) {
    throw new Error('Fotografie musí mít po kompresi maximálně 1,45 MB.');
  }
  var mime='image/'+m[1], extension=m[1]==='jpeg'?'jpg':m[1];
  var lock=LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    // Opakovaná kontrola subjektu a uživatele před zápisem.
    perfectRepairRequireUser_(token);
    perfectMediaExists_(v.kind,v.id);
    var folder=perfectMediaFolder_();
    var name=v.kind+'_'+v.id+'_'+v.slot+'_'+Date.now()+'.'+extension;
    var file=folder.createFile(Utilities.newBlob(bytes,mime,name));
    var key=perfectMediaKey_(v.kind,v.id,v.slot);
    try {
      PropertiesService.getScriptProperties().setProperty(key,file.getId());
    } catch(err) {
      file.setTrashed(true);
      throw err;
    }
    console.info('PERFECT MEDIA: '+JSON.stringify({actor:user.id,kind:v.kind,id:v.id,slot:v.slot,fileId:file.getId(),at:new Date().toISOString()}));
    return {success:true,kind:v.kind,id:v.id,slot:v.slot,dataUrl:dataUrl};
  } finally {
    lock.releaseLock();
  }
}
