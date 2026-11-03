/**
 * PERFECT V50 – obnovení auditních funkcí z původního modulu
 * 01_CENTRALNI_DATABAZE_V42_CELA.gs (beze změny logiky zápisu).
 *
 * Použití: přidat jako NOVÝ soubor .gs do STEJNÉHO Apps Script projektu,
 * který obsluhuje web PERFECT, pouze pokud v něm tyto funkce chybí.
 * Soubor NEVYPÍNÁ audit ani práva a NEMĚNÍ objednávky či hesla.
 * Vyžaduje existující perfectDatabaseGetSpreadsheet_ a
 * perfectDatabaseWithLock_.
 */

function databaseSecurity40AuditSheet_(){var ss=perfectDatabaseGetSpreadsheet_(),name='__PERFECT_DB_AKTIVITY_V40',heads=['ID','AT','ACTOR_ID','ACTOR','ROLE','ACTION','TARGET','BEFORE_JSON','AFTER_JSON','STATUS','DETAIL'],sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,heads.length).setValues([heads]);sh.hideSheet();}var h=sh.getRange(1,1,1,heads.length).getValues()[0];if(heads.some(function(k,i){return h[i]!==k;}))throw Error('Audit má jiné hlavičky. Operace nebyla bezpečně potvrzena.');return sh;}
function databaseSecurity40Audit_(actor,action,target,before,after,status,detail){return perfectDatabaseWithLock_('Audit V40',function(){var sh=databaseSecurity40AuditSheet_();sh.getRange(sh.getLastRow()+1,1,1,11).setValues([[Utilities.getUuid(),new Date().toISOString(),String(actor&&actor.id||''),String(actor&&actor.username||''),String(actor&&actor.role||''),String(action),String(target||'').slice(0,100),JSON.stringify(before||{}).slice(0,12000),JSON.stringify(after||{}).slice(0,12000),status,String(detail||'').slice(0,500)]]);return true;});}

/** Diagnostika bez zápisu do databáze; spustit z editoru. */
function perfectV50OveritAudit_() {
  var stav = {
    audit: typeof databaseSecurity40Audit_ === 'function',
    auditList: typeof databaseSecurity40AuditSheet_ === 'function',
    databaze: typeof perfectDatabaseGetSpreadsheet_ === 'function',
    zamykani: typeof perfectDatabaseWithLock_ === 'function'
  };
  Logger.log(JSON.stringify(stav));
  return stav;
}
