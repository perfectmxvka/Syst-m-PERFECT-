/** PERFECT V50 E07: Fotopozadí detailingu. Nezasahuje do zakázek, ceníku, plateb ani voucherů. */
function perfectV50DetailingBackgroundsGet(token){
 perfect40Require_(token,'orders.read');
 var raw=PropertiesService.getScriptProperties().getProperty('PERFECT_V50_DETAILING_BACKGROUNDS')||'[]';
 var arr=[];try{arr=JSON.parse(raw);}catch(e){arr=[];}
 if(!Array.isArray(arr))arr=[];
 return {success:true,images:arr.filter(function(url){return typeof url==='string'&&/^https:\/\//i.test(url);}).slice(0,12),intervalSeconds:12};
}
function perfectV50DetailingBackgroundsSave(token,input){
 var actor=perfect40Require_(token,'roles.manage');
 var items=input&&input.images;
 if(!Array.isArray(items)||items.length>12)throw Error('Povoleno je 0 až 12 fotografií.');
 var unique=[];
 items.forEach(function(v){
  var url=String(v||'').trim();
  if(!url)return;
  if(url.length>1200||!/^https:\/\/[a-z0-9]/i.test(url)||/[<>"'\s\\]/.test(url))throw Error('Použij přímou HTTPS adresu obrázku.');
  if(unique.indexOf(url)<0)unique.push(url);
 });
 var lock=LockService.getScriptLock();lock.waitLock(10000);
 try{PropertiesService.getScriptProperties().setProperty('PERFECT_V50_DETAILING_BACKGROUNDS',JSON.stringify(unique));}
 finally{lock.releaseLock();}
 return {success:true,images:unique,intervalSeconds:12};
}
