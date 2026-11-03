/** Testovací kopie: bez formuláře jen pro přihlášeného Google vlastníka, nikdy anonymně. */
function perfectPreview41Context_(){
 var props=perfectRepairProps_();if(props.getProperty('PERFECT41_TEST_MODE')!=='ON')return null;
 var active='',effective='';try{active=Session.getActiveUser().getEmail();effective=Session.getEffectiveUser().getEmail();}catch(e){}
 if(!active||active!==effective)return null;
 var test=String(props.getProperty('PERFECT41_TEST_DATABASE_ID')||''),production=String(props.getProperty('PERFECT41_PRODUCTION_DATABASE_ID')||''),current=String(props.getProperty(PERFECT_REPAIR.DB)||'');
 if(!test||!production||test===production||current!==test)throw Error('Testovací režim není oddělený od ostré databáze. Zkontroluj tři ID ve Vlastnostech skriptu.');
 if(perfectDatabaseGetSpreadsheet_().getId()!==test)throw Error('Testovací režim neotevřel očekávanou kopii databáze.');
 return {testId:test};
}
function perfectPreview41Wrap_(output){
 var context=perfectPreview41Context_();if(!context)return output;
 perfectRepairCheckDatabase_();var auth=databasePreview41Start_();
 var script='<script>sessionStorage.setItem("perfectAuthToken",'+JSON.stringify(auth.token)+');sessionStorage.setItem("perfectAuthUser",'+JSON.stringify(JSON.stringify(auth.user))+');</script>';
 var badge='<div style="position:fixed;right:12px;bottom:10px;z-index:11010;padding:6px 11px;background:#292212;border:1px solid #aa8b3e;border-radius:8px;color:#f1d580;font:700 10px/1.5 sans-serif;pointer-events:none">TESTOVACÍ KOPIE</div>';
 return HtmlService.createHtmlOutput(output.getContent().replace('<head>','<head>'+script).replace('</body>',badge+'</body>')).setTitle('TEST · Automyčka PERFECT').addMetaTag('viewport','width=device-width, initial-scale=1');
}
