/** Náhrada 27a_LOGA_DRIVE_NAPOJENI.gs. Soukromá loga z Drive. */
var PERFECT_LOGO42_FOLDER_ID='1jJ5o8JYkoKoH_BSzLI8nx8c8_OGzJ6S2';
function perfectLogo25Key_(name){
  var s=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\.(png|jpe?g|webp)$/,'').replace(/\s*\(\d+\)\s*$/,'').replace(/[^a-z0-9]/g,'');
  var aliases={vw:'volkswagen',mercedes:'mercedesbenz',benz:'mercedesbenz',sangyong:'ssangyong'};
  return aliases[s]||s;
}
function perfectLogo25Inventory_(){
  var root=DriveApp.getFolderById(PERFECT_LOGO42_FOLDER_ID),small=[],large=[],children=root.getFolders();
  while(children.hasNext()){var f=children.next(),n=perfectLogo25Key_(f.getName());if(n==='mala')small.push(f);else if(n==='velka')large.push(f);}
  var files={},folders=small.concat([root],large);
  folders.forEach(function(folder){var it=folder.getFiles();while(it.hasNext()){
    var file=it.next(),key=perfectLogo25Key_(file.getName());
    if(/^image\/(png|jpeg|webp)$/.test(file.getMimeType())&&!files[key])files[key]=file;
  }});
  return files;
}
function perfectLogo42GetMap(token,requestedKeys){
  perfectRepairRequireUser_(token);
  if(!Array.isArray(requestedKeys)||requestedKeys.length>100)throw new Error('Požaduj nejvýše 100 značek.');
  var allowed={};PERFECT_LOGA_42_MANIFEST.brands.forEach(function(b){allowed[perfectLogo25Key_(b.key)]=b.key;});
  var keys=Array.from(new Set(requestedKeys.map(String))),files=null,logos={},missing=[],warnings=[];
  var cache=CacheService.getScriptCache();
  keys.forEach(function(requested){
    var normalized=perfectLogo25Key_(requested),canonical=allowed[normalized];
    if(!canonical){missing.push(requested);return;}
    var key='perfect-logo25-'+PERFECT_LOGO42_FOLDER_ID+'-'+canonical,uri=cache.get(key);
    if(!uri){
      if(!files)files=perfectLogo25Inventory_();
      var file=files[normalized];if(!file){missing.push(requested);return;}
      try{
        var blob;
        if(file.getSize()<=70000)blob=file.getBlob();
        else blob=file.getThumbnail()||file.getBlob();
        var bytes=blob.getBytes(),mime=blob.getContentType();
        if(bytes.length>600000||!/^image\/(png|jpeg|webp)$/.test(mime)){warnings.push(canonical+': příliš velký nebo nepodporovaný obrázek');return;}
        uri='data:'+mime+';base64,'+Utilities.base64Encode(bytes);
        if(uri.length<95000)try{cache.put(key,uri,21600);}catch(e){}
      }catch(e){warnings.push(canonical+': '+e.message);return;}
    }
    logos[requested]={brand:canonical,dataUri:uri};logos[canonical]=logos[requested];
  });
  return {ok:true,logos:logos,missing:missing,warnings:warnings};
}
function perfectLogo42Diagnostika(){
  var files=perfectLogo25Inventory_(),missing=[],found=0;
  PERFECT_LOGA_42_MANIFEST.brands.forEach(function(b){if(files[perfectLogo25Key_(b.key)])found++;else missing.push(b.key);});
  var result={found:found,total:PERFECT_LOGA_42_MANIFEST.brands.length,missing:missing};
  Logger.log(JSON.stringify(result));return result;
}
