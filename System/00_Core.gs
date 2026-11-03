/*******************************************************

  * AUTOMYČKA PERFECT 2.0

  * 00_CORE.gs

  *

  * =====================================================

  * HLAVNÍ JÁDRO SYSTÉMU

  * =====================================================

  *

  * CORE JE ŘÍDICÍ CENTRUM CELÉHO PROJEKTU.

  *

  * CORE:

  *

  * - vytváří hlavní ovládací menu

  * - řídí základní systémovou konfiguraci

  * - drží verzi systému

  * - spouští inicializaci

  * - provádí základní diagnostiku

  * - kontroluje dostupnost modulů

  * - propojuje systém s centrální databází

  *

  * =====================================================

  *

  * DŮLEŽITÉ:

  *

  * CORE NENÍ DATABÁZE.

  *

  * CORE:

  *

  * - NEUKLÁDÁ zákazníky

  * - NEUKLÁDÁ objednávky

  * - NEUKLÁDÁ vozidla

  * - NEVYTVÁŘÍ vlastní databázi

  * - NEVYTVÁŘÍ JSON úložiště

  * - NEPOUŽÍVÁ PropertiesService jako databázi

  *

  * JEDINÉ CENTRÁLNÍ ÚLOŽIŠTĚ PROVOZNÍCH DAT:

  *

  * 01 CENTRÁLNÍ DATABÁZE

  *

  * =====================================================

  *

  * FINÁLNÍ OVLÁDACÍ MENU:

  *

  * 👥 ZÁKAZNÍCI

  *    🔎 Vyhledávač zákazníků

  *    🗒️ Seznam zákazníků

  *

  * 🗒️ OBJEDNÁVKY

  *    🔐 Databáze objednávek

  *

  * 📊 STATISTIKY

  *    💰 Tržby měsíční

  *    🧽 Oblíbenost programů

  *    ➕ další statistiky

  *

  * ⚙️ NASTAVENÍ

  *    🔧 Konfigurace systému

  *

  * =====================================================

  *

  *******************************************************/

/* =====================================================

  * 01. ZÁKLADNÍ INFORMACE SYSTÉMU

  * ===================================================== */

const PERFECT_SYSTEM = Object.freeze({

   NAME:

      'AUTOMYČKA PERFECT',

   VERSION:

      '2.0.0',

   CORE:

      '00_CORE',

   DATABASE:

      '01_CENTRALNI_DATABAZE'

});

/* =====================================================

  * 02. PŘÍSTUP K DATABÁZI OBJEDNÁVEK

  *

  * PIN slouží pouze jako aplikační kontrola

  * před odkrytím databázového listu.

  *

  * Není náhradou za oprávnění Google účtu.

  * ===================================================== */

const PERFECT_DATABASE_ACCESS = Object.freeze({

   PASSWORD:

      '9800'

});

/* =====================================================

  * 03. DEFINICE MODULŮ

  *

  * Pouze technický seznam.

  *

  * NENÍ TO DATABÁZE.

  * ===================================================== */

const PERFECT_MODULES = Object.freeze({

   CORE:

      '00 Core',

   DATABASE:

      '01 Centrální databáze',

   CUSTOMERS:

      '02 Zákazníci',

   ORDERS:

      '03 Objednávky',

   VEHICLES:

      '04 Vozidla',

   ORDER_NUMBERING:

      '05 Číslování objednávek',

   CUSTOMER_SEARCH:

      '06 Hledání zákazníků',

   GMAIL:

      '07 Gmail online objednávky',

   CUSTOMER_LIST:

      '08 Seznam zákazníků',

   CUSTOMER_LIST_DESIGN:

      '09 Design seznamu zákazníků',

   CUSTOMER_CARD:

      '10 Karta zákazníka',

   CUSTOMER_CARD_DESIGN:

      '11 Design karty zákazníků'

});

/* =====================================================

  * 04. GOOGLE SHEETS ON OPEN

  * ===================================================== */

function onOpen() {

   perfectCreateMainMenu_();

}

/* =====================================================

  * 05. HLAVNÍ OVLÁDACÍ MENU

  *

  * FINÁLNÍ STRUKTURA:

  *

  * 👥 ZÁKAZNÍCI

  * 🗒️ OBJEDNÁVKY

  * 📊 STATISTIKY

  * ⚙️ NASTAVENÍ

  *

  * ===================================================== */

function perfectCreateMainMenu_() {

   const ui =

      SpreadsheetApp.getUi();

   /*

     * ===================================================

     * 👥 ZÁKAZNÍCI

     * ===================================================

     */

   const customersMenu =

      ui.createMenu(

         '👥 ZÁKAZNÍCI'

      );

   customersMenu.addItem(

      '🔎 Vyhledávač zákazníků',

      'perfectMenuCustomerSearch_'

   );

   customersMenu.addItem(

      '🗒️ Seznam zákazníků',

      'perfectMenuCustomerList_'

   );

   customersMenu.addToUi();

   /*

     * ===================================================

     * 🗒️ OBJEDNÁVKY

     * ===================================================

     */

   const ordersMenu =
    ui.createMenu(
      '🗒️ OBJEDNÁVKY'
    );
  ordersMenu.addItem(
    '🔐 Databáze objednávek',
    'perfectMenuShowOrdersDatabase_'
  );
  ordersMenu.addSeparator();
  ordersMenu.addItem(
    '🧾 Příjmový list',
    'perfectMenuIncomeSheet_'
  );
  ordersMenu.addItem(
    '✨ Detailing příjmový list',
    'perfectMenuDetailingIncomeSheet_'
  );
  ordersMenu.addToUi();

   /*

     * ===================================================

     * 📊 STATISTIKY

     * ===================================================

     */

   const statisticsMenu =

      ui.createMenu(

         '📊 STATISTIKY'

      );

   statisticsMenu.addItem(

      '💰 Tržby měsíční',

      'perfectMenuStatisticsMonthlyRevenue_'

   );

   statisticsMenu.addItem(

      '🧽 Oblíbenost programů',

      'perfectMenuStatisticsPrograms_'

   );

   /*

     * MÍSTO PRO DALŠÍ STATISTIKY

     *

     * Další položky se budou přidávat sem.

     */

   statisticsMenu.addSeparator();

   statisticsMenu.addItem(

      '➕ Další statistiky',

      'perfectMenuStatisticsMore_'

   );

   statisticsMenu.addToUi();

   /*

     * ===================================================

     * ⚙️ NASTAVENÍ

     * ===================================================

     */

   const settingsMenu =

      ui.createMenu(

         '⚙️ NASTAVENÍ'

      );

   settingsMenu.addItem(

      '🔧 Konfigurace systému',

      'perfectMenuSystemConfiguration_'

   );

   settingsMenu.addToUi();

}

/* =====================================================

  * 06. MENU – VYHLEDÁVAČ ZÁKAZNÍKŮ

  *

  * Kliknutí okamžitě spustí vyhledávač.

  * ===================================================== */

function perfectMenuCustomerSearch_() {

   if (

      typeof otevritHledaniZakaznika ===

      'function'

   ) {

      try {

         otevritHledaniZakaznika();

      } catch (error) {

         perfectShowError_(

            'Vyhledávání zákazníka se nepodařilo otevřít.',

            error

         );

      }

      return;

   }

   perfectModuleNotReady_(

      PERFECT_MODULES.CUSTOMER_SEARCH

   );

}

/* =====================================================

  * 07. MENU – SEZNAM ZÁKAZNÍKŮ

  *

  * Kliknutí okamžitě vytvoří / zobrazí seznam.

  * ===================================================== */

function perfectMenuCustomerList_() {

   if (

      typeof otevritSeznamZakazniku ===

      'function'

   ) {

      try {

         otevritSeznamZakazniku();

      } catch (error) {

         perfectShowError_(

            'Seznam zákazníků se nepodařilo otevřít.',

            error

         );

      }

      return;

   }

   perfectModuleNotReady_(

      PERFECT_MODULES.CUSTOMER_LIST

   );

}

/* =====================================================

  * 08. MENU – DATABÁZE OBJEDNÁVEK

  *

  * 1. zobrazí PIN okno

  * 2. ověří PIN

  * 3. při správném PINu zobrazí databázi objednávek

  *

  * ===================================================== */

function perfectMenuShowOrdersDatabase_() {

   const ui =

      SpreadsheetApp.getUi();

   const response =

      ui.prompt(

         '🔐 Databáze objednávek',

         'Pro zobrazení databáze objednávek zadejte PIN:',

         ui.ButtonSet.OK_CANCEL

      );

   /*

     * ---------------------------------------------------

     * ZRUŠENÍ

     * ---------------------------------------------------

     */

   if (

      response.getSelectedButton() !==

      ui.Button.OK

   ) {

      return;

   }

   const enteredPassword =

      String(

         response.getResponseText() || ''

      ).trim();

   /*

     * ---------------------------------------------------

     * KONTROLA PINU

     * ---------------------------------------------------

     */

   if (

      enteredPassword !==

      PERFECT_DATABASE_ACCESS.PASSWORD

   ) {

      ui.alert(

         'Přístup zamítnut',

         'Zadaný PIN není správný.\n\n' +

         'Databáze objednávek zůstává skrytá.',

         ui.ButtonSet.OK

      );

      return;

   }

   /*

     * ---------------------------------------------------

     * SPRÁVNÝ PIN

     * ---------------------------------------------------

     */

   try {

      const result =

         perfectShowOrdersDatabase_();

      if (

         result.success

      ) {

         ui.alert(

            'Přístup povolen',

            'Databáze objednávek byla zobrazena.',

            ui.ButtonSet.OK

         );

      }

   } catch (error) {

      perfectShowError_(

         'Databázi objednávek se nepodařilo zobrazit.',

         error

      );

   }

}

/* =====================================================

  * 09. ZOBRAZENÍ DATABÁZE OBJEDNÁVEK

  *

  * Záměrně se zobrazí pouze objednávková databáze.

  *

  * Zákaznická a vozidlová databáze zůstávají skryté.

  *

  * ===================================================== */

function perfectShowOrdersDatabase_() {

   const ss =

      perfectGetSpreadsheet_();

   if (

      typeof PERFECT_DB ===

      'undefined'

   ) {

      throw new Error(

         'Modul 01 – Centrální databáze není načten.'

      );

   }

   const sheetName =

      PERFECT_DB.SHEETS.ORDERS;

   if (!sheetName) {

      throw new Error(

         'V konfiguraci centrální databáze není definován list objednávek.'

      );

   }

   const sheet =

      ss.getSheetByName(

         sheetName

      );

   if (!sheet) {

      throw new Error(

         'Databázový list objednávek "' +

         sheetName +

         '" nebyl nalezen.'

      );

   }

   if (

      sheet.isSheetHidden()

   ) {

      sheet.showSheet();

   }

   ss.setActiveSheet(

      sheet

   );

   return {

      success:

         true,

      sheet:

         sheetName

   };

}

/* =====================================================

  * 10. SKRYTÍ DATABÁZE OBJEDNÁVEK

  *

  * Technická funkce.

  *

  * Není v hlavním menu.

  * ===================================================== */

function perfectHideOrdersDatabase_() {

   const ss =

      perfectGetSpreadsheet_();

   if (

      typeof PERFECT_DB ===

      'undefined'

   ) {

      throw new Error(

         'Modul 01 – Centrální databáze není načten.'

      );

   }

   const sheetName =

      PERFECT_DB.SHEETS.ORDERS;

   const sheet =

      ss.getSheetByName(

         sheetName

      );

   if (!sheet) {

      throw new Error(

         'Databázový list objednávek nebyl nalezen.'

      );

   }

   if (

      sheet.isSheetHidden()

   ) {

      return {

         success:

            true,

         hidden:

            false,

         message:

            'Databáze objednávek již byla skrytá.'

      };

   }

   /*

     * Google Sheets nesmí skrýt úplně všechny listy.

     */

   const visibleSheets =

      ss.getSheets()

         .filter(

            function(item) {

               return !item.isSheetHidden();

            }

         );

   if (

      visibleSheets.length <= 1

   ) {

      throw new Error(

         'Databázi nelze skrýt, protože by nezůstal žádný viditelný list.'

      );

   }

   sheet.hideSheet();

   return {

      success:

         true,

      hidden:

         true,

      message:

         'Databáze objednávek byla skryta.'

   };

}

/* =====================================================

  * 11. STATISTIKY – TRŽBY MĚSÍČNÍ

  *

  * Toto je připravený vstupní bod.

  *

  * CORE zde NEPOČÍTÁ statistiky.

  *

  * Až bude vytvořen statistický modul,

  * tato funkce ho automaticky využije.

  *

  * ===================================================== */

function perfectMenuStatisticsMonthlyRevenue_() {

   /*

     * Budoucí statistický modul.

     *

     * Možné názvy funkcí, které může následně

     * statistický modul poskytovat:

     *

     * - otevritStatistikyMesicniTrzby()

     * - statisticsMonthlyRevenue()

     *

     * CORE se pokusí najít dostupný vstupní bod.

     */

   if (

      typeof otevritStatistikyMesicniTrzby ===

      'function'

   ) {

      try {

         otevritStatistikyMesicniTrzby();

      } catch (error) {

         perfectShowError_(

            'Statistiky měsíčních tržeb se nepodařilo otevřít.',

            error

         );

      }

      return;

   }

   if (

      typeof statisticsMonthlyRevenue ===

      'function'

   ) {

      try {

         statisticsMonthlyRevenue();

      } catch (error) {

         perfectShowError_(

            'Statistiky měsíčních tržeb se nepodařilo otevřít.',

            error

         );

      }

      return;

   }

   perfectModuleNotReady_(

      'Statistiky – měsíční tržby'

   );

}

/* =====================================================

  * 12. STATISTIKY – OBLÍBENOST PROGRAMŮ

  * ===================================================== */

function perfectMenuStatisticsPrograms_() {

   if (

      typeof otevritStatistikyOblibenostProgramu ===

      'function'

   ) {

      try {

         otevritStatistikyOblibenostProgramu();

      } catch (error) {

         perfectShowError_(

            'Statistiky oblíbenosti programů se nepodařilo otevřít.',

            error

         );

      }

      return;

   }

   if (

      typeof statisticsProgramPopularity ===

      'function'

   ) {

      try {

         statisticsProgramPopularity();

      } catch (error) {

         perfectShowError_(

            'Statistiky oblíbenosti programů se nepodařilo otevřít.',

            error

         );

      }

      return;

   }

   perfectModuleNotReady_(

      'Statistiky – oblíbenost programů'

   );

}

/* =====================================================

  * 13. STATISTIKY – DALŠÍ

  *

  * Rezervní vstupní bod pro budoucí statistiky.

  * ===================================================== */

function perfectMenuStatisticsMore_() {

   perfectModuleNotReady_(

      'Další statistiky'

   );

}

/* =====================================================

  * 14. NASTAVENÍ – KONFIGURACE SYSTÉMU

  * ===================================================== */

function perfectMenuSystemConfiguration_() {

   /*

     * Budoucí samostatný modul konfigurace.

     *

     * Pokud už bude funkce existovat,

     * CORE ji automaticky použije.

     */

   if (

      typeof otevritKonfiguraciSystemu ===

      'function'

   ) {

      try {

         otevritKonfiguraciSystemu();

      } catch (error) {

         perfectShowError_(

            'Konfiguraci systému se nepodařilo otevřít.',

            error

         );

      }

      return;

   }

   /*

     * Dokud nebude samostatný modul konfigurace,

     * nabídneme technické funkce CORE.

     */

   const ui =

      SpreadsheetApp.getUi();

   const response =

      ui.alert(

         '⚙️ Konfigurace systému',

         'Konfigurační modul zatím není aktivní.\n\n' +

         'Chcete otevřít technickou diagnostiku systému?',

         ui.ButtonSet.YES_NO

      );

   if (

      response ===

      ui.Button.YES

   ) {

      perfectSystemDiagnostics();

   }

}

/* =====================================================

  * 15. TECHNICKÁ FUNKCE – INICIALIZACE

  *

  * Není v běžném hlavním menu.

  * ===================================================== */

function perfectInitializeSystem() {

   const result =

      perfectRunInitialization_();

   const ui =

      SpreadsheetApp.getUi();

   let message =

      'SYSTÉM BYL ZKONTROLOVÁN.\n\n';

   message +=

      'Core: ' +

      (

         result.core

            ? '✓ OK'

            : '✗ CHYBA'

      ) +

      '\n';

   message +=

      'Centrální databáze: ' +

      (

         result.database

            ? '✓ DOSTUPNÁ'

            : '✗ NEDOSTUPNÁ'

      );

   ui.alert(

      PERFECT_SYSTEM.NAME,

      message,

      ui.ButtonSet.OK

   );

   return result;

}

/* =====================================================

  * 16. INTERNÍ INICIALIZACE

  * ===================================================== */

function perfectRunInitialization_() {

   const spreadsheet =

      perfectGetSpreadsheet_();

   if (!spreadsheet) {

      return {

         success:

            false,

         core:

            false,

         database:

            false

      };

   }

   return {

      success:

         true,

      core:

         true,

      database:

         perfectIsDatabaseAvailable_(),

      spreadsheetId:

         spreadsheet.getId(),

      spreadsheetName:

         spreadsheet.getName(),

      version:

         PERFECT_SYSTEM.VERSION

   };

}

/* =====================================================

  * 17. AKTUÁLNÍ SPREADSHEET

  * ===================================================== */

function perfectGetSpreadsheet_() {

   return SpreadsheetApp

      .getActiveSpreadsheet();

}

/* =====================================================

  * 18. KONTROLA DATABÁZE

  * ===================================================== */

function perfectIsDatabaseAvailable_() {

   return (

      typeof databaseInitialize ===

      'function'

   );

}

/* =====================================================

  * 19. DIAGNOSTIKA SYSTÉMU

  * ===================================================== */

function perfectSystemDiagnostics() {

   const result =

      perfectBuildDiagnostics_();

   const ui =

      SpreadsheetApp.getUi();

   let message =

      PERFECT_SYSTEM.NAME +

      '\n\n';

   message +=

      'Verze: ' +

      result.version +

      '\n\n';

   message +=

      'CORE: ' +

      (

         result.core

            ? '✓'

            : '✗'

      ) +

      '\n';

   message +=

      'CENTRÁLNÍ DATABÁZE: ' +

      (

         result.database

            ? '✓'

            : '○'

      ) +

      '\n\n';

   message +=

      'MODULY:\n';

   result.modules.forEach(

      function(module) {

         message +=

            (

               module.available

                  ? '✓ '

                  : '○ '

            ) +

            module.name +

            '\n';

      }

   );

   ui.alert(

      'Kontrola systému',

      message,

      ui.ButtonSet.OK

   );

   return result;

}

/* =====================================================

  * 20. DIAGNOSTIKA MODULŮ

  * ===================================================== */

function perfectBuildDiagnostics_() {

   const modules = [];

   modules.push({

      name:

         PERFECT_MODULES.CORE,

      available:

         true

   });

   modules.push({

      name:

         PERFECT_MODULES.DATABASE,

      available:

         typeof databaseInitialize ===

         'function'

   });

   modules.push({

      name:

         PERFECT_MODULES.CUSTOMERS,

      available:

         false

   });

   modules.push({

      name:

         PERFECT_MODULES.ORDERS,

      available:

         typeof otevritNovyObjednavkovyList ===

         'function'

   });

   modules.push({

      name:

         PERFECT_MODULES.VEHICLES,

      available:

         false

   });

   modules.push({

      name:

         PERFECT_MODULES.ORDER_NUMBERING,

      available:

         false

   });

   modules.push({

      name:

         PERFECT_MODULES.CUSTOMER_SEARCH,

      available:

         typeof otevritHledaniZakaznika ===

         'function'

   });

   modules.push({

      name:

         PERFECT_MODULES.GMAIL,

      available:

         false

   });

   modules.push({

      name:

         PERFECT_MODULES.CUSTOMER_LIST,

      available:

         typeof otevritSeznamZakazniku ===

         'function'

   });

   modules.push({

      name:

         PERFECT_MODULES.CUSTOMER_LIST_DESIGN,

      available:

         false

   });

   modules.push({

      name:

         PERFECT_MODULES.CUSTOMER_CARD,

      available:

         typeof otevritKartuZakaznikaModul10 ===

         'function' ||

         typeof otevritKartuZakaznika ===

         'function'

   });

   modules.push({

      name:

         PERFECT_MODULES.CUSTOMER_CARD_DESIGN,

      available:

         false

   });

   return {

      success:

         true,

      name:

         PERFECT_SYSTEM.NAME,

      version:

         PERFECT_SYSTEM.VERSION,

      core:

         true,

      database:

         perfectIsDatabaseAvailable_(),

      modules:

         modules

   };

}

/* =====================================================

  * 21. INFORMACE O SYSTÉMU

  * ===================================================== */

function perfectShowSystemInfo() {

   const ui =

      SpreadsheetApp.getUi();

   ui.alert(

      PERFECT_SYSTEM.NAME,

      'Verze: ' +

      PERFECT_SYSTEM.VERSION +

      '\n\n' +

      'Core: ' +

      PERFECT_SYSTEM.CORE +

      '\n' +

      'Datová vrstva: ' +

      PERFECT_SYSTEM.DATABASE +

      '\n\n' +

      'Centrální databáze je jediným ' +

      'úložištěm provozních dat systému.',

      ui.ButtonSet.OK

   );

}

/* =====================================================

  * 22. KONTROLA PROSTŘEDÍ

  * ===================================================== */

function perfectCheckEnvironment_() {

   const ss =

      perfectGetSpreadsheet_();

   if (!ss) {

      return {

         success:

            false,

         message:

            'Aktivní Google Spreadsheet nebyl nalezen.'

      };

   }

   return {

      success:

         true,

      spreadsheetId:

         ss.getId(),

      spreadsheetName:

         ss.getName()

   };

}

/* =====================================================

  * 23. TEST CORE

  * ===================================================== */

function testCore() {

   const environment =

      perfectCheckEnvironment_();

   const diagnostics =

      perfectBuildDiagnostics_();

   return {

      success:

         environment.success,

      system:

         PERFECT_SYSTEM.NAME,

      version:

         PERFECT_SYSTEM.VERSION,

      environment:

         environment,

      database:

         diagnostics.database,

      modules:

         diagnostics.modules

   };

}

/* =====================================================

  * 24. TEST HLAVNÍHO MENU

  * ===================================================== */

function testPerfectMainMenu() {

   perfectCreateMainMenu_();

   console.log(

      '=========================================='

   );

   console.log(

      'AUTOMYČKA PERFECT 2.0'

   );

   console.log(

      'TEST FINÁLNÍHO OVLÁDACÍHO MENU'

   );

   console.log(

      '=========================================='

   );

   console.log(

      '✓ 👥 ZÁKAZNÍCI'

   );

   console.log(

      '   ✓ 🔎 Vyhledávač zákazníků'

   );

   console.log(

      '   ✓ 🗒️ Seznam zákazníků'

   );

   console.log(

      '✓ 🗒️ OBJEDNÁVKY'

   );

   console.log(

      '   ✓ 🔐 Databáze objednávek'

   );

   console.log(

      '✓ 📊 STATISTIKY'

   );

   console.log(

      '   ✓ 💰 Tržby měsíční'

   );

   console.log(

      '   ✓ 🧽 Oblíbenost programů'

   );

   console.log(

      '   ✓ ➕ Další statistiky'

   );

   console.log(

      '✓ ⚙️ NASTAVENÍ'

   );

   console.log(

      '   ✓ 🔧 Konfigurace systému'

   );

   console.log(

      '=========================================='

   );

   return {

      success:

         true,

      message:

         'Finální ovládací menu bylo vytvořeno.'

   };

}

/* =====================================================

  * 25. CHYBOVÉ HLÁŠENÍ

  * ===================================================== */

function perfectShowError_(

   title,

   error

) {

   const ui =

      SpreadsheetApp.getUi();

   const message =

      title +

      '\n\n' +

      (

         error &&

         error.message

            ? error.message

            : String(error)

      );

   ui.alert(

      PERFECT_SYSTEM.NAME,

      message,

      ui.ButtonSet.OK

   );

}

/* =====================================================

  * 26. OZNÁMENÍ O NEAKTIVNÍM MODULU

  * ===================================================== */

function perfectModuleNotReady_(

   moduleName

) {

   const ui =

      SpreadsheetApp.getUi();

   ui.alert(

      PERFECT_SYSTEM.NAME,

      'Modul "' +

      moduleName +

      '" zatím není aktivní.\n\n' +

      'Bude připojen během další fáze vývoje.',

      ui.ButtonSet.OK

   );

}


/* =====================================================
 * 27. MENU – PŘÍJMOVÝ LIST
 * ===================================================== */
function perfectMenuIncomeSheet_() {
  if (typeof otevritPrijmovyList === 'function') {
    try {
      otevritPrijmovyList();
    } catch (error) {
      perfectShowError_(
        'Příjmový list se nepodařilo otevřít.',
        error
      );
    }
    return;
  }

  perfectModuleNotReady_('Příjmový list');
}

/* =====================================================
 * 28. MENU – DETAILING PŘÍJMOVÝ LIST
 * ===================================================== */
function perfectMenuDetailingIncomeSheet_() {
  if (typeof otevritDetailingPrijmovyList === 'function') {
    try {
      otevritDetailingPrijmovyList();
    } catch (error) {
      perfectShowError_(
        'Detailing příjmový list se nepodařilo otevřít.',
        error
      );
    }
    return;
  }

  perfectModuleNotReady_('Detailing příjmový list');
}

/* =====================================================

  * KONEC 00_CORE.gs

  * ===================================================== */

/**
 * AUTOMYČKA PERFECT 2.0
 * Zobrazení HTML aplikace.
 */
// Webový vstup doGet je pouze v Webbackend.gs.


function perfectWebDiagnoseDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const result = {
    success: true,
    spreadsheetName: ss ? ss.getName() : null,
    spreadsheetId: ss ? ss.getId() : null,
    sheets: ss ? ss.getSheets().map(s => ({
      name: s.getName(),
      lastRow: s.getLastRow(),
      lastColumn: s.getLastColumn()
    })) : [],
    customers: null,
    vehicles: null,
    orders: null,
    error: null
  };

  try {
    result.customers = databaseGetAllCustomers().length;
    result.vehicles = databaseGetAllVehicles().length;
    result.orders = databaseGetAllOrders().length;
  } catch (e) {
    result.success = false;
    result.error = String(e && e.message ? e.message : e);
  }
console.log(JSON.stringify(result, null, 2));
  return result;
}


