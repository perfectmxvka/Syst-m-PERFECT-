/** PERFECT V50 / ETAPA 00 — inventura a bezpečné ověření. NOVÝ soubor.
 * Všechny funkce končí _, takže nejsou dostupné jako přímá RPC z webového UI.
 * Žádná změna databáze, Gmailu, manifestu ani uživatelů.
 */
var PERFECT_V50_AUDIT_000102 = 'V50-00-01-02-20261019';

function perfectV50AssertEditor000102_(){
  // Vyžadujeme volání z Apps Script editoru, nikoli webové RPC.
  var allowed = typeof perfect40TrustedEditor_ === 'function' && perfect40TrustedEditor_();
  if (!allowed) throw new Error('Tuto diagnostiku smí spustit vlastník projektu z editoru Apps Scriptu.');
  return true;
}

function perfectV50Mask000102_(v){
  var s=String(v||''); return s ? '…'+s.slice(-5) : '(nenastaveno)';
}

function perfectV50Environment000102_(){
  perfectV50AssertEditor000102_();
  var p=PropertiesService.getScriptProperties(),
      active=String(p.getProperty('PERFECT_REPAIR_SPREADSHEET_ID')||''),
      test=String(p.getProperty('PERFECT41_TEST_DATABASE_ID')||''),
      production=String(p.getProperty('PERFECT41_PRODUCTION_DATABASE_ID')||''),
      mode=String(p.getProperty('PERFECT41_TEST_MODE')||'OFF'),
      errors=[],warnings=[];
  if(!active)errors.push('Chybí PERFECT_REPAIR_SPREADSHEET_ID.');
  if(mode==='ON'){
    if(!test||!production)errors.push('TEST: chybí některé z ID testovací/produkční DB.');
    if(test && production && test===production)errors.push('TEST a PRODUKCE používají STEJNÉ ID databáze.');
    if(test && active!==test)errors.push('TEST režim nemá aktivní testovací DB.');
  }else warnings.push('TEST_MODE není ON. Před zápisovými testy ověř samostatnou testovací kopii.');
  if(test && production && test===production)errors.push('Konfigurace obsahuje totožné TEST/PROD ID.');
  var live='';
  try{live=perfectDatabaseGetSpreadsheet_().getId();if(active&&live!==active)errors.push('Otevřená DB nesouhlasí s konfigurací.');}
  catch(e){errors.push('Nelze otevřít DB: '+String(e.message||e).slice(0,220));}
  return {build:PERFECT_V50_AUDIT_000102,mode:mode,
          activeDatabase:perfectV50Mask000102_(active),
          testDatabase:perfectV50Mask000102_(test),
          productionDatabase:perfectV50Mask000102_(production),
          openedDatabase:perfectV50Mask000102_(live),
          testSeparated:mode==='ON'&&!!test&&!!production&&test!==production&&test===active&&live===active,
          success:errors.length===0,errors:errors,warnings:warnings};
}

function perfectV50RequireTest000102_(){
  var env=perfectV50Environment000102_();
  if(!env.success||!env.testSeparated)throw Error('Operace vyžaduje správně oddělenou TEST databázi. '+env.errors.join(' '));
  return env;
}

function perfectV50Triggers000102_(){
  perfectV50AssertEditor000102_();
  var list=ScriptApp.getProjectTriggers().map(function(t){
    return {handler:String(t.getHandlerFunction()),source:String(t.getEventType())};
  });
  var gmail=list.filter(function(t){return t.handler==='gmailRunAutomaticImport'||t.handler==='perfect40GmailCron_';});
  return {total:list.length,gmailTriggers:gmail.length,gmailHandlers:gmail.map(function(t){return t.handler;}),
          warning:gmail.length>1?'Více Gmail časovačů: ověř nastavení, ale nic se automaticky nemaže.':'',
          note:'KONTROLA nic nevypíná. Gmail import zůstává aktivní.'};
}

function perfectV50BackupTestDatabase000102_(){
  perfectV50RequireTest000102_();
  var p=PropertiesService.getScriptProperties(),id=p.getProperty('PERFECT41_TEST_DATABASE_ID');
  var copyName='PERFECT_TEST_DB_ZALOHA_'+Utilities.formatDate(new Date(),'Europe/Prague','yyyyMMdd_HHmmss');
  // Výslovná manuální akce v editoru. Kopie tabulky; neprovádí změnu jejího obsahu.
  var file=DriveApp.getFileById(id).makeCopy(copyName);
  var result={success:true,createdCopy:true,name:copyName,fileId:file.getId(),source:perfectV50Mask000102_(id),
              note:'Toto je záloha TEST databáze. Zdrojové soubory Apps Scriptu zálohuj samostatně.'};
  Logger.log(JSON.stringify(result));return result;
}
