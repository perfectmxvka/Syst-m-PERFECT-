/** Přidat jako NOVÝ Skript 90_EXPORT_PRO_MIGRACI.
 * Čte původní data, zakládá pouze soukromou exportní složku a vlastní stav exportu.
 * Původní tabulku, fotografie, účty a spouštěče nemění.
 */
// V1.2: hodnoty tabulky jsou pouze dvourozměrná matice buněk.
// Neprochází obecné objekty rekurzí (hostované objekty mohou mít kruhové vazby).
function perfectMigrationEncodeCellV1_(value, row, column, imageHandler) {
  if (value === null || typeof value === 'undefined') return '';
  var kind = typeof value;
  if (kind === 'string' || kind === 'boolean') return value;
  if (kind === 'number') {
    if (!isFinite(value)) throw Error('Neplatné číslo v buňce R' + row + 'C' + column + '.');
    return value;
  }
  if (kind === 'object') {
    // Object.prototype funguje i pro datum pocházející z jiného JS kontextu.
    var tag = Object.prototype.toString.call(value);
    if (typeof value.getContentUrl === 'function') {
      if (typeof imageHandler !== 'function') throw Error('Obrázek v buňce R' + row + 'C' + column + ' vyžaduje export médií.');
      return imageHandler(value, row, column);
    }
    if (tag === '[object String]') return String(value);
    if (tag === '[object Boolean]') return value.valueOf();
    if (tag === '[object Number]') return perfectMigrationEncodeCellV1_(Number(value), row, column);

    if (tag === '[object Date]' || (typeof value.getTime === 'function' && typeof value.toISOString === 'function')) {
      try {
        var time = value.getTime();
        if (!isFinite(time)) throw Error('Neplatné datum.');
        return {$date: new Date(time).toISOString()};
      } catch (e) {
        throw Error('Neplatné datum v buňce R' + row + 'C' + column + '.');
      }
    }
  }
  throw Error('Nepodporovaný typ buňky R' + row + 'C' + column + ': ' + kind + (value && value.valueType ? ' (valueType=' + String(value.valueType) + ')' : '') + '. Export byl zastaven bez úprav zdroje.');
}
function perfectMigrationEncodeV1_(rows, imageHandler) {
  if (!Array.isArray(rows)) throw Error('Zdroj nevrátil matici buněk.');
  var result = new Array(rows.length);
  for (var r = 0; r < rows.length; r++) {
    if (!Array.isArray(rows[r])) throw Error('Neplatný řádek ' + (r + 1) + '.');
    result[r] = new Array(rows[r].length);
    for (var c = 0; c < rows[r].length; c++) {
      result[r][c] = perfectMigrationEncodeCellV1_(rows[r][c], r + 1, c + 1, imageHandler);
    }
  }
  return result;
}
function perfectMigrationReadSheetV11_(sheet, imageHandler) {
  try {
    var rows = perfectMigrationEncodeV1_(sheet.getDataRange().getValues(), imageHandler);
    Logger.log('Načten list: ' + sheet.getName() + ' (' + rows.length + ' řádků)');
    return rows;
  } catch (e) {
    throw Error('List "' + sheet.getName() + '": ' + String(e.message || e));
  }
}
function perfectMigrationHashV1_(bytes){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');}
function perfectMigrationPrepareV1(){
 var lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  var all=PropertiesService.getScriptProperties().getProperties(),props={};
  Object.keys(all).forEach(function(k){if(/^PERFECT_MIGRATION_|^PERFECT_REPAIR_SESSION_|^PERFECT_REPAIR_FAIL_|^PERFECT36_FAIL_/.test(k))return;props[k]=all[k];});
  var id=props.PERFECT_REPAIR_SPREADSHEET_ID,ss=id?SpreadsheetApp.openById(id):SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)throw Error('Není připojená zdrojová tabulka.');
  var output=DriveApp.createFolder('PERFECT_PREVOD_'+Utilities.formatDate(new Date(),'Europe/Prague','yyyyMMdd_HHmmss'));
  var folders=[],files=[],seenFolders={},seenFiles={},errors=[];
  function addFile(f,parentId){var fileId=f.getId();if(seenFiles[fileId])return;seenFiles[fileId]=true;files.push({id:fileId,name:f.getName(),mimeType:f.getMimeType(),size:f.getSize(),parentId:parentId||'',trashed:false});}
  function addFolder(folder,parentId){var fid=folder.getId();if(seenFolders[fid])return;seenFolders[fid]=true;folders.push({id:fid,name:folder.getName(),parentId:parentId||''});var it=folder.getFiles();while(it.hasNext())addFile(it.next(),fid);var children=folder.getFolders();while(children.hasNext())addFolder(children.next(),fid);}
  Object.keys(props).filter(function(k){return /FOLDER/.test(k);}).forEach(function(k){try{if(props[k])addFolder(DriveApp.getFolderById(props[k]),'');}catch(e){errors.push({property:k,error:String(e.message||e)});}});
  if(typeof PERFECT_LOGO42_FOLDER_ID!=='undefined'){props.PERFECT_LOGO42_FOLDER_ID=String(PERFECT_LOGO42_FOLDER_ID);try{addFolder(DriveApp.getFolderById(PERFECT_LOGO42_FOLDER_ID),'');}catch(e){errors.push({kind:'logos',error:String(e.message||e)});}}
  else {try{addFolder(DriveApp.getFolderById('1jJ5o8JYkoKoH_BSzLI8nx8c8_OGzJ6S2'),'');}catch(e){errors.push({kind:'logos',error:String(e.message||e)});}}
  Object.keys(props).filter(function(k){return /^PERFECT_MEDIA_V1_/.test(k)&&!/FOLDER/.test(k);}).forEach(function(k){try{if(props[k])addFile(DriveApp.getFileById(props[k]),'');}catch(e){errors.push({property:k,error:String(e.message||e)});}});
  try{JSON.parse(props.PERFECT_REPAIR_USERS||'[]').forEach(function(u){if(u.avatarFileId)try{addFile(DriveApp.getFileById(u.avatarFileId),'');}catch(e){errors.push({userId:u.id,error:String(e.message||e)});}});}catch(e){throw Error('Nelze přečíst seznam účtů.');}
  var cellImagesByHash={};
  function exportCellImage(value,row,column,sheetName) {
    var url=value.getContentUrl();
    if(!url)throw Error('Nelze načíst obrázek v buňce R'+row+'C'+column+'.');
    var response=UrlFetchApp.fetch(url,{muteHttpExceptions:true});
    if(response.getResponseCode()!==200)throw Error('Stažení obrázku v buňce R'+row+'C'+column+' selhalo (HTTP '+response.getResponseCode()+').');
    var image=response.getBlob(),bytes=image.getBytes(),mime=image.getContentType();
    if(!/^image\//i.test(mime||''))throw Error('Buňka R'+row+'C'+column+' nevrátila obrazový soubor.');
    if(bytes.length>20*1024*1024)throw Error('Obrázek v buňce R'+row+'C'+column+' překračuje 20 MiB.');
    var hash=perfectMigrationHashV1_(bytes),imageId=cellImagesByHash[hash];
    if(!imageId){
      var saved=output.createFile(image.setName('cell_image.bin'));imageId=saved.getId();saved.setName(imageId+'.bin');
      seenFiles[imageId]=true;cellImagesByHash[hash]=imageId;
      files.push({id:imageId,name:'CELL_IMAGE_'+imageId,mimeType:mime,size:bytes.length,parentId:'',trashed:false,source:'spreadsheet-cell'});
    }
    return {$cellImage:{fileId:imageId,altTextTitle:typeof value.getAltTextTitle==='function'?String(value.getAltTextTitle()||''):'',altTextDescription:typeof value.getAltTextDescription==='function'?String(value.getAltTextDescription()||''):''}};
  }
  var state={schemaVersion:1,spreadsheetId:ss.getId(),properties:props,userProperties:{},sheets:ss.getSheets().map(function(sh){return {name:sh.getName(),hidden:sh.isSheetHidden(),rows:perfectMigrationReadSheetV11_(sh,function(value,row,column){return exportCellImage(value,row,column,sh.getName());})};}),drive:{folders:folders,files:files}};
  var blob=Utilities.newBlob(JSON.stringify(state),'application/json','state.json'),data=output.createFile(blob);
  var manifest={format:'PERFECT-MIGRATION-1',createdAt:new Date().toISOString(),sourceSpreadsheet:ss.getId(),stateSha256:perfectMigrationHashV1_(blob.getBytes()),files:files,copied:[],errors:errors,completed:false};
  var manifestFile=output.createFile(Utilities.newBlob(JSON.stringify(manifest),'application/json','manifest.json'));
  PropertiesService.getScriptProperties().setProperty('PERFECT_MIGRATION_V1_JOB',JSON.stringify({folderId:output.getId(),stateId:data.getId(),manifestId:manifestFile.getId(),index:0}));
  Logger.log(JSON.stringify({prepared:true,sheets:state.sheets.length,files:files.length,mediaBytes:files.reduce(function(n,f){return n+f.size;},0),errors:errors,folderUrl:output.getUrl()},null,2));
 }finally{lock.releaseLock();}
}
function perfectMigrationExportBatchV1(){
 var lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  var p=PropertiesService.getScriptProperties(),job=JSON.parse(p.getProperty('PERFECT_MIGRATION_V1_JOB')||'null');if(!job)throw Error('Nejdřív spusť perfectMigrationPrepareV1.');
  var folder=DriveApp.getFolderById(job.folderId),mf=DriveApp.getFileById(job.manifestId),manifest=JSON.parse(mf.getBlob().getDataAsString()),started=Date.now(),count=0;
  while(job.index<manifest.files.length&&count<25&&Date.now()-started<90000){
   var meta=manifest.files[job.index],filename=meta.id+'.bin';
   try{var copied=folder.getFilesByName(filename);if(copied.hasNext()){var old=copied.next(),bytes=old.getBlob().getBytes();}else{var blob=DriveApp.getFileById(meta.id).getBlob();var bytes=blob.getBytes();folder.createFile(blob.setName(filename));}
    if(!manifest.copied.some(function(f){return f.id===meta.id;}))manifest.copied.push({id:meta.id,bytes:bytes.length,sha256:perfectMigrationHashV1_(bytes)});
   }catch(e){manifest.errors.push({fileId:meta.id,error:String(e.message||e)});mf.setContent(JSON.stringify(manifest));throw Error('Export souboru '+meta.id+' se nezdařil. Data zůstala zachovaná; po opravě přístupu spusť dávku znovu.');}
   manifest.errors=manifest.errors.filter(function(e){return e.fileId!==meta.id;});
   job.index++;count++;
   // Průběžně uložit kurzor; opakování již zkopírovaného souboru nevytvoří další kopii.
   p.setProperty('PERFECT_MIGRATION_V1_JOB',JSON.stringify(job));
  }
  manifest.completed=job.index===manifest.files.length;mf.setContent(JSON.stringify(manifest));
  Logger.log(JSON.stringify({completed:manifest.completed,copied:job.index,total:manifest.files.length,errors:manifest.errors,folderUrl:folder.getUrl(),next:manifest.completed?'Stáhni celou složku jako ZIP.':'Spusť perfectMigrationExportBatchV1 znovu.'},null,2));
 }finally{lock.releaseLock();}
}