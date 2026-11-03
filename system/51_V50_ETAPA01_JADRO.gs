/** PERFECT V50 / ETAPA 01 — bezkolizní jádro kontrol. NOVÝ soubor.
 * Nezasahuje do doGet, práv, frontendu ani časovačů.
 */
var PERFECT_V50_CORE_000102 = Object.freeze({build:'V50-00-01-02-20261019',timezone:'Europe/Prague',
  engine:'Google Apps Script',schema:'V49.1 compatible',readOnlyChecks:true});

function perfectV50CoreRegistry000102_(){
  var endpoints=[
    ['doGet','HTML webový vstup','public','HtmlOutput'],
    ['perfectAuthLoginFast36','Přihlášení','login','token + user'],
    ['perfectWebBootstrap36','Úvodní data','login','data podle oprávnění'],
    ['perfectWebCreateOrderAddons31','Založení zakázky','orders.write','ORDER_ID'],
    ['perfectWebUpdateOrderAddons31','Úprava zakázky','orders.write','výsledek uložení'],
    ['perfectBoxesGetOverviewV25','Přehled boxů','finance.read','směny a přiřazení'],
    ['perfectBoxesSaveOrderV25','Přiřazení boxu','shifts.manage','uložené přiřazení'],
    ['perfectBoxesSaveShiftV25','Potvrzení směny','shifts.manage','uložená směna'],
    ['perfectVoucher36List','Přehled poukazů','vouchers.read','poukazy'],
    ['perfectVoucher36Issue','Vystavení poukazu','vouchers.manage','poukaz'],
    ['perfectReports39Get','Statistiky','podle rozsahu','přehled'],
    ['gmailRunAutomaticImport','Gmail časovač','trusted/cron','importní výsledek'],
    ['perfect40GmailCron_','Gmail cron alias','trusted/cron','importní výsledek'],
    ['perfectKontrolaProjektuV37','Kontrola projektu','trusted/editor','diagnostika']
  ];
  // typeof nevyžaduje existenci funkce a pracuje se sdíleným GAS V8 prostorem.
  var exists=[typeof doGet,typeof perfectAuthLoginFast36,typeof perfectWebBootstrap36,
    typeof perfectWebCreateOrderAddons31,typeof perfectWebUpdateOrderAddons31,
    typeof perfectBoxesGetOverviewV25,typeof perfectBoxesSaveOrderV25,
    typeof perfectBoxesSaveShiftV25,typeof perfectVoucher36List,typeof perfectVoucher36Issue,
    typeof perfectReports39Get,typeof gmailRunAutomaticImport,typeof perfect40GmailCron_,
    typeof perfectKontrolaProjektuV37];
  return endpoints.map(function(e,i){return {name:e[0],purpose:e[1],access:e[2],expected:e[3],available:exists[i]==='function'};});
}

function perfectV50CoreDiagnostics000102_(){
  perfectV50AssertEditor000102_();
  var environment=perfectV50Environment000102_();
  var registry=perfectV50CoreRegistry000102_();
  var missing=registry.filter(function(x){return !x.available;}).map(function(x){return x.name;});
  var templates=['Index','PERFECT_Poukazy','PERFECT_Detailing44','PERFECT_Graphite45',
                 'PERFECT_Statistiky','PERFECT_Brand','PERFECT_Vzhled'];
  var missingTemplates=[];
  templates.forEach(function(name){try{HtmlService.createHtmlOutputFromFile(name).getContent();}
    catch(e){missingTemplates.push(name);}});
  var warnings=[];
  if(!environment.testSeparated)warnings.push('Tato sada je určena pro testovací kopii; nepouštěj zápisové testy na produkci.');
  if(missing.length)warnings.push('Některá referenční API nejsou nalezena; prověř verzi projektu.');
  var result={success:environment.success&&missing.length===0&&missingTemplates.length===0,
      build:PERFECT_V50_CORE_000102.build,environment:environment,
      missingApi:missing,missingHtml:missingTemplates,registry:registry,warnings:warnings,
      note:'Kontrola existence API není náhradou za funkční test přihlášení a obrazovek.'};
  Logger.log(JSON.stringify(result,null,2));return result;
}

function perfectV50CoreSafeError000102_(err){
  var message=String(err&&err.message||err||'Neznámá chyba');
  message=message.replace(/\b[A-Za-z0-9_-]{35,}\b/g,'[skrytý identifikátor]')
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[skrytý email]');
  return {success:false,build:PERFECT_V50_CORE_000102.build,error:message.slice(0,240)};
}
