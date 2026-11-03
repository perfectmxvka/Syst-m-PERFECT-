/** PERFECT V37 — společný start a kontrola sestavy. */
const PERFECT_RELEASE37='PERFECT-37-20261017-1';
function perfect40Original_perfectAuthLoginBootstrap37_(username,password){
 var auth=perfectAuthLoginFast36(username,password);
 try{return {token:auth.token,user:auth.user,bootstrap:perfectWebBootstrap36(auth.token),release37:PERFECT_RELEASE37};}
 catch(error){return {token:auth.token,user:auth.user,bootstrap:null,bootstrapError:String(error.message||error),release37:PERFECT_RELEASE37};}
}
/** Veřejné firemní obrázky; původní PNG se předávají beze změny bajtů. */
function perfect40Original_perfectWebGetBrandAssets37_(){
 var parts=[];
 for(var i=1;i<=5;i++){
  var source=HtmlService.createHtmlOutputFromFile('PERFECT_Loga_'+i).getContent();
  var match=source.match(/\.push\((\[[\s\S]*?\])\.join\(\s*['"]['"]\s*\)\)/);
  if(!match)throw Error('Nelze přečíst původní logo, část '+i+'.');
  var rows=JSON.parse(match[1]);if(!Array.isArray(rows)||rows.some(function(s){return typeof s!=='string';}))throw Error('Neplatná část loga.');parts.push(rows.join(''));
 }
 var assets=JSON.parse(parts.join(''));
 // V61: PNG je uložen jednou, obě varianty používají původní shodné bajty.
 if(!assets.stacked)assets.stacked=assets.horizontal;
 ['horizontal','stacked'].forEach(function(key){if(typeof assets[key]!=='string'||!/^data:image\/png;base64,/.test(assets[key]))throw Error('Chybí původní PNG logo '+key+'.');});
 return {success:true,release37:PERFECT_RELEASE37,assets:{horizontal:assets.horizontal,stacked:assets.stacked}};
}
/** Nezapisuje do tabulky, nemění uživatele ani spouštěče. */
function perfect40Original_perfectKontrolaProjektuV37_(){
 var checks=[
  ['perfectDuplicates38List',typeof perfectDuplicates38List],['databaseDuplicates38Resolve_',typeof databaseDuplicates38Resolve_],['databaseGetAllOrders',typeof databaseGetAllOrders],['databaseCreateOrder',typeof databaseCreateOrder],['generateOrderId',typeof generateOrderId],
  ['perfectAuthLoginFast36',typeof perfectAuthLoginFast36],['perfectWebBootstrap36',typeof perfectWebBootstrap36],
  ['databaseAddons31ReadServices_',typeof databaseAddons31ReadServices_],['perfectWebGetServicesAddons31',typeof perfectWebGetServicesAddons31],['perfectWebCreateOrderAddons31',typeof perfectWebCreateOrderAddons31],
  ['perfectTiming31View_',typeof perfectTiming31View_],['perfectControlTickAddons31',typeof perfectControlTickAddons31],
  ['perfectBoxesGetOverviewV25',typeof perfectBoxesGetOverviewV25],['perfectBoxesSaveShiftV25',typeof perfectBoxesSaveShiftV25],['perfectShared33Read_',typeof perfectShared33Read_],
  ['perfectVoucher36List',typeof perfectVoucher36List],['databaseVoucher36Change_',typeof databaseVoucher36Change_],['perfectAdminUsersList',typeof perfectAdminUsersList],['perfectLogo42GetMap',typeof perfectLogo42GetMap]
 ];
 var missing=checks.filter(function(x){return x[1]!=='function';}).map(function(x){return x[0];}),templates=['PERFECT_Duplicity','Index','PERFECT_Vzhled','PERFECT_Brand','PERFECT_Poukazy','PERFECT_Poukaz_Obrazek_1','PERFECT_Statistiky','PERFECT_Upgrade40','PERFECT_Loga_1','PERFECT_Loga_2','PERFECT_Loga_3','PERFECT_Loga_4','PERFECT_Loga_5'],html=[];
 templates.forEach(function(name){try{HtmlService.createHtmlOutputFromFile(name).getContent();}catch(e){html.push(name);}});
 var databaseError='';try{perfectRepairCheckDatabase_();}catch(e){databaseError=String(e.message||e);}
 var result={success:!missing.length&&!html.length&&!databaseError,release37:PERFECT_RELEASE37,missingFunctions:missing,missingHtml:html,databaseError:databaseError};
 Logger.log(JSON.stringify(result,null,2));return result;
}
/** Jednorázové dokončení v editoru. Ponechá účty, fotografie, data i Gmail spouštěče. */
function perfect40Original_perfectDokoncitInstalaciV37_(){
 var report=perfectKontrolaProjektuV37();if(!report.success)throw Error('Nejdřív doplň sestavu: '+JSON.stringify(report));
 var timing=perfectNastavitAutomatikuV31_();var result={success:true,release37:PERFECT_RELEASE37,timing:timing};Logger.log(JSON.stringify(result,null,2));return result;
}

/** V61: jen čtecí kontrola rozděleného schváleného loga. */
function PERFECT_61_KONTROLA_LOG(){
 const r=perfect40Original_perfectWebGetBrandAssets37_(),a=r.assets;
 const bytes=Utilities.base64Decode(a.horizontal.split(',')[1]);
 const hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');
 const result={success:hash==='f0653424b0651651ede002b834eb3d3434abc528134f75473d424d163be83825'&&a.horizontal===a.stacked,build:'PERFECT-LOGA-61',pngBytes:bytes.length,pngSha256:hash,sharedImage:a.horizontal===a.stacked};
 Logger.log(JSON.stringify(result,null,2));return result;
}
