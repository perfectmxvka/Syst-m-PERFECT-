/**

 * AUTOMYČKA PERFECT 2.0

 * 06_SEZNAM_ZAKAZNIKU.gs

 *

 * PREZENTAČNÍ SEZNAM ZÁKAZNÍKŮ

 * Zdroj provozních dat: 01_CENTRÁLNÍ_DATABÁZE.gs

 *

 * Tento modul nemá vlastní databázi. Pouze čte centrální databázi,

 * zobrazuje zákazníky a počítá dokončené návštěvy a celkovou útratu.

 *

 * A JMÉNO A PŘÍJMENÍ

 * B E-MAIL

 * C KONTAKT

 * D NÁVŠTĚVY

 * E ÚTRATA

 * F POZNÁMKA - KOMENTÁŘ

 * G KARTA ZÁKAZNÍKA

 * Z CUSTOMER_ID (technický, skrytý)

 */



const PERFECT_CUSTOMER_LIST_FINAL_CONFIG = Object.freeze({

  SHEET_NAME: 'SEZNAM ZÁKAZNÍKŮ',

  TITLE: 'SEZNAM ZÁKAZNÍKŮ - AUTOMYČKA PERFECT',

  HEADER_ROW: 3,

  DATA_START_ROW: 4,

  DATA_END_ROW: 1000,

  CARD_COLUMN: 7,

  TECHNICAL_ID_COLUMN: 26,

  VISIBLE_COLUMNS: 7,

  TOTAL_COLUMNS: 26,

  CARD_TEXT: '👤 OTEVŘÍT KARTU',

  COMPLETED_STATUS: 'VYHOTOVENO',

  WIDTH_A: 450,

  WIDTH_B: 450,

  WIDTH_C: 450

});



/* =====================================================

 * 01. OTEVŘÍT SEZNAM / AKTUALIZACE

 * ===================================================== */



function otevritSeznamZakazniku() {

  const sheet = perfectCustomerListGetOrCreateSheet_();

  perfectCustomerListRefresh_();

  sheet.activate();

  pridatMenuSeznamuZakazniku();

}



/**

 * Přidá nabídku pro bezpečné otevření karty.

 * Lze ji také spustit ručně z Apps Scriptu.

 */

function pridatMenuSeznamuZakazniku() {

  SpreadsheetApp.getUi()

    .createMenu('👤 Zákazníci')

    .addItem('Otevřít kartu vybraného zákazníka…', 'otevritKartuAktualnihoRadkuSPotvrzenim')

    .addToUi();

}



function aktualizovatSeznamZakazniku() {

  return perfectCustomerListRefresh_();

}



function obnovitSeznamZakazniku() {

  return perfectCustomerListRefresh_();

}



function vytvoritSeznamZakazniku() {

  return perfectCustomerListRefresh_();

}



/* =====================================================

 * 02. LIST

 * ===================================================== */



function perfectCustomerListGetOrCreateSheet_() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(

    PERFECT_CUSTOMER_LIST_FINAL_CONFIG.SHEET_NAME

  );



  if (!sheet) {

    sheet = ss.insertSheet(

      PERFECT_CUSTOMER_LIST_FINAL_CONFIG.SHEET_NAME

    );

  }



  return sheet;

}



/* =====================================================

 * 03. HLAVNÍ AKTUALIZACE SEZNAMU

 * ===================================================== */



function perfectCustomerListRefresh_() {

  const sheet = perfectCustomerListGetOrCreateSheet_();



  // Jediný zdroj provozních dat: modul 01 – centrální databáze.

  const customers = databaseGetAllCustomers() || [];

  const orders = databaseGetAllOrders() || [];



  perfectCustomerListPrepareSheet_(sheet);

  perfectCustomerListBuildHeader_(sheet);



  // Statistiky se počítají podle CUSTOMER_ID.

  const statistics = perfectCustomerListBuildStatistics_(orders);

  const rows = [];

  const customerIds = [];



  customers.forEach(function(rawCustomer) {

    const customer = perfectCustomerListCustomerToObject_(rawCustomer);



    if (!customer || !customer.customerId) {

      return;

    }



    const stats = statistics[customer.customerId] || {

      visits: 0,

      spending: 0

    };



    rows.push([

      perfectCustomerListUpperCase_(customer.name),

      customer.email || '',

      perfectCustomerListFormatPhone_(customer.phone),

      stats.visits,

      stats.spending,

      customer.note || '',

      PERFECT_CUSTOMER_LIST_FINAL_CONFIG.CARD_TEXT

    ]);



    customerIds.push([customer.customerId]);

  });



  if (rows.length > 0) {

    sheet.getRange(

      PERFECT_CUSTOMER_LIST_FINAL_CONFIG.DATA_START_ROW,

      1,

      rows.length,

      7

    ).setValues(rows);



    // CUSTOMER_ID je technický údaj ve skrytém sloupci Z.

    sheet.getRange(

      PERFECT_CUSTOMER_LIST_FINAL_CONFIG.DATA_START_ROW,

      PERFECT_CUSTOMER_LIST_FINAL_CONFIG.TECHNICAL_ID_COLUMN,

      customerIds.length,

      1

    ).setValues(customerIds);

  }



  perfectCustomerListApplyFormatting_(sheet, rows.length);



  // Design zůstává v samostatném modulu.

  if (typeof aplikovatFinalniDesignSeznamuZakazniku === 'function') {

    aplikovatFinalniDesignSeznamuZakazniku();

  } else {

    throw new Error(

      'Modul designu seznamu není připojen. ' +

      'Chybí aplikovatFinalniDesignSeznamuZakazniku().'

    );

  }



  // Kritické šířky A-C nastavíme znovu po aplikaci designu.

  sheet.setColumnWidth(1, PERFECT_CUSTOMER_LIST_FINAL_CONFIG.WIDTH_A);

  sheet.setColumnWidth(2, PERFECT_CUSTOMER_LIST_FINAL_CONFIG.WIDTH_B);

  sheet.setColumnWidth(3, PERFECT_CUSTOMER_LIST_FINAL_CONFIG.WIDTH_C);



  sheet.hideColumns(

    PERFECT_CUSTOMER_LIST_FINAL_CONFIG.TECHNICAL_ID_COLUMN

  );



  return rows.length;

}



/* =====================================================

 * 04. PŘÍPRAVA LISTU

 * ===================================================== */



function perfectCustomerListPrepareSheet_(sheet) {

  const config = PERFECT_CUSTOMER_LIST_FINAL_CONFIG;



  if (sheet.getMaxColumns() < config.TOTAL_COLUMNS) {

    sheet.insertColumnsAfter(

      sheet.getMaxColumns(),

      config.TOTAL_COLUMNS - sheet.getMaxColumns()

    );

  }



  if (sheet.getMaxRows() < config.DATA_END_ROW) {

    sheet.insertRowsAfter(

      sheet.getMaxRows(),

      config.DATA_END_ROW - sheet.getMaxRows()

    );

  }



  // Čistí pouze prezentační list, nikoliv centrální databázi.

  sheet.getRange(

    1,

    1,

    config.DATA_END_ROW,

    config.TOTAL_COLUMNS

  ).clearContent();



  const filter = sheet.getFilter();

  if (filter) {

    filter.remove();

  }



  sheet.getRange('Z1').setValue('CUSTOMER_ID');

}



/* =====================================================

 * 05. HLAVIČKA

 * ===================================================== */



function perfectCustomerListBuildHeader_(sheet) {

  const titleRange = sheet.getRange('A1:G1');



  if (!titleRange.isPartOfMerge()) {

    titleRange.merge();

  }



  sheet.getRange('A1').setValue(

    PERFECT_CUSTOMER_LIST_FINAL_CONFIG.TITLE

  );



  sheet.getRange('A3:G3').setValues([[

    'JMÉNO A PŘÍJMENÍ',

    'E-MAIL',

    'KONTAKT',

    'NÁVŠTĚVY',

    'ÚTRATA',

    'POZNÁMKA - KOMENTÁŘ',

    'KARTA ZÁKAZNÍKA'

  ]]);

}



/* =====================================================

 * 06. STATISTIKY OBJEDNÁVEK – OPRAVENÝ VÝPOČET ÚTRATY

 * ===================================================== */



function perfectCustomerListBuildStatistics_(orders) {

  const statistics = {};



  (orders || []).forEach(function(rawOrder) {

    const order = perfectCustomerListOrderToObject_(rawOrder);



    if (!order || !order.customerId) {

      return;

    }



    const customerId = String(order.customerId).trim();

    if (!customerId) {

      return;

    }



    if (!statistics[customerId]) {

      statistics[customerId] = {

        visits: 0,

        spending: 0

      };

    }



    // Do návštěv a útraty se započítávají pouze dokončené objednávky.

    if (perfectCustomerListIsCompleted_(order.status)) {

      statistics[customerId].visits += 1;

      statistics[customerId].spending +=

        perfectCustomerListParseMoney_(order.price);

    }

  });



  return statistics;

}



/* =====================================================

 * 07. NORMALIZACE ZÁKAZNÍKA

 * ===================================================== */



function perfectCustomerListCustomerToObject_(customer) {

  if (!customer) {

    return null;

  }



  if (!Array.isArray(customer)) {

    return {

      customerId: String(

        customer.CUSTOMER_ID ??

        customer.customerId ??

        ''

      ).trim(),



      name: String(

        customer.JMENO_PRIJMENI ??

        customer.jmenoPrijmeni ??

        customer.name ??

        ''

      ).trim(),



      email: String(

        customer.EMAIL ??

        customer.email ??

        ''

      ).trim(),



      phone: String(

        customer.TELEFON ??

        customer.telefon ??

        customer.phone ??

        ''

      ).trim(),



      note: String(

        customer.POZNAMKA ??

        customer.POZNAMKY ??

        customer.poznamka ??

        customer.note ??

        ''

      ).trim()

    };

  }



  // Kompatibilita se starým řádkovým formátem zákazníka.

  return {

    customerId: String(customer[0] || '').trim(),

    name: String(customer[1] || '').trim(),

    email: String(customer[2] || '').trim(),

    phone: String(customer[3] || '').trim(),

    note: String(customer[6] || '').trim()

  };

}



/* =====================================================

 * 08. NORMALIZACE OBJEDNÁVKY – OPRAVENÉ POLE CENY A STAVU

 * ===================================================== */



function perfectCustomerListOrderToObject_(order) {

  if (!order) {

    return null;

  }



  // Aktuální modul 01 vrací objekt s poli CUSTOMER_ID,

  // CENA_CELKEM a STAV_OBJEDNAVKY.

  if (!Array.isArray(order)) {

    return {

      customerId: String(

        order.CUSTOMER_ID ??

        order.customerId ??

        ''

      ).trim(),



      price:

        order.CENA_CELKEM ??

        order.cenaCelkem ??

        order.CENA_PROGRAMU ??

        order.cenaProgramu ??

        order.price ??

        order.cena ??

        0,



      status: String(

        order.STAV_OBJEDNAVKY ??

        order.stavObjednavky ??

        order.status ??

        ''

      ).trim()

    };

  }



  /*

   * Kompatibilita se starým řádkovým formátem A:Q:

   * E = CUSTOMER_ID       -> index 4

   * O = CENA_CELKEM       -> index 14

   * P = STAV_OBJEDNAVKY   -> index 15

   */

  return {

    customerId: String(order[4] || '').trim(),

    price: order[14] ?? 0,

    status: String(order[15] || '').trim()

  };

}



/* =====================================================

 * 09. KONTROLA DOKONČENÉ OBJEDNÁVKY

 * ===================================================== */



function perfectCustomerListIsCompleted_(status) {

  const value = String(status || '')

    .trim()

    .toUpperCase();



  return (

    value === 'VYHOTOVENO' ||

    value === 'DOKONČENO' ||

    value === 'DOKONČENÉ'

  );

}



/* =====================================================

 * 10. PŘEVOD CENY NA ČÍSLO

 * ===================================================== */



function perfectCustomerListParseMoney_(value) {

  if (value === null || value === undefined || value === '') {

    return 0;

  }



  if (typeof value === 'number') {

    return Number.isFinite(value) ? value : 0;

  }



  let text = String(value)

    .trim()

    .replace(/Kč/gi, '')

    .replace(/\s/g, '');



  if (!text) {

    return 0;

  }



  // Český formát např. 1.200,50 -> 1200.50.

  if (text.indexOf(',') !== -1) {

    text = text.replace(/\\./g, '').replace(',', '.');

  } else {

    // Celé částky např. 1.200 -> 1200.

    text = text.replace(/\\./g, '');

  }



  const number = Number(text.replace(/[^0-9.-]/g, ''));

  return Number.isFinite(number) ? number : 0;

}



/* =====================================================

 * 11. FORMÁT TELEFONU

 * ===================================================== */



function perfectCustomerListFormatPhone_(phone) {

  const original = String(phone || '');

  const digits = original.replace(/\D/g, '');



  if (digits.length === 9) {

    return '+420 ' +

      digits.substring(0, 3) + ' ' +

      digits.substring(3, 6) + ' ' +

      digits.substring(6, 9);

  }



  if (digits.length === 12 && digits.substring(0, 3) === '420') {

    const local = digits.substring(3);

    return '+420 ' +

      local.substring(0, 3) + ' ' +

      local.substring(3, 6) + ' ' +

      local.substring(6, 9);

  }



  return original;

}



/* =====================================================

 * 12. VELKÁ PÍSMENA

 * ===================================================== */



function perfectCustomerListUpperCase_(value) {

  return String(value || '')

    .trim()

    .toLocaleUpperCase('cs-CZ');

}



/* =====================================================

 * 13. FORMÁT SEZNAMU

 * ===================================================== */



function perfectCustomerListApplyFormatting_(sheet, rowCount) {

  const config = PERFECT_CUSTOMER_LIST_FINAL_CONFIG;



  sheet.setColumnWidth(1, config.WIDTH_A);

  sheet.setColumnWidth(2, config.WIDTH_B);

  sheet.setColumnWidth(3, config.WIDTH_C);

  sheet.setColumnWidth(4, 110);

  sheet.setColumnWidth(5, 130);

  sheet.setColumnWidth(6, 300);

  sheet.setColumnWidth(7, 190);



  sheet.getRange('A1:G1')

    .setFontWeight('bold')

    .setHorizontalAlignment('center')

    .setVerticalAlignment('middle')

    .setFontSize(22);



  sheet.setRowHeight(1, 48);



  sheet.getRange('A3:G3')

    .setFontWeight('bold')

    .setHorizontalAlignment('center')

    .setVerticalAlignment('middle');



  sheet.setRowHeight(3, 32);



  if (rowCount > 0) {

    sheet.getRange(

      config.DATA_START_ROW, 1, rowCount, 7

    ).setVerticalAlignment('middle');



    sheet.getRange(

      config.DATA_START_ROW, 1, rowCount, 1

    ).setHorizontalAlignment('left');



    sheet.getRange(

      config.DATA_START_ROW, 2, rowCount, 1

    ).setHorizontalAlignment('left');



    sheet.getRange(

      config.DATA_START_ROW, 3, rowCount, 1

    ).setHorizontalAlignment('left');



    sheet.getRange(

      config.DATA_START_ROW, 4, rowCount, 2

    ).setHorizontalAlignment('center');



    sheet.getRange(

      config.DATA_START_ROW, 5, rowCount, 1

    ).setNumberFormat('#,##0 "Kč"');



    sheet.getRange(

      config.DATA_START_ROW, 7, rowCount, 1

    ).setHorizontalAlignment('center');

  }



  sheet.hideColumns(config.TECHNICAL_ID_COLUMN);

  sheet.setFrozenRows(3);



  const existingFilter = sheet.getFilter();

  if (existingFilter) {

    existingFilter.remove();

  }



  sheet.getRange(

    3,

    1,

    Math.max(1, rowCount + 1),

    7

  ).createFilter();

}



/* =====================================================

 * 14. OTEVŘENÍ KARTY ZÁKAZNÍKA

 * ===================================================== */



function otevritKartuZeSeznamuZakazniku(customerId) {

  const id = String(customerId || '').trim();



  if (!id) {

    SpreadsheetApp.getUi().alert('Na tomto řádku není CUSTOMER_ID.');

    return false;

  }



  if (typeof otevritKartuZakaznikaModul10 !== 'function') {

    SpreadsheetApp.getUi().alert(

      'Modul 10 – KARTA ZÁKAZNÍKA není dostupný.'

    );

    return false;

  }



  // Tato funkce je volána až po potvrzení uživatelem.

  return otevritKartuZakaznikaModul10(id);

}



/**

 * Uživatelská akce z nabídky „👤 Zákazníci“.

 * Získá ID ze skrytého sloupce Z na aktuálním řádku,

 * vyžádá potvrzení a teprve potom otevře kartu.

 */

function otevritKartuAktualnihoRadkuSPotvrzenim() {

  const ui = SpreadsheetApp.getUi();

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const config = PERFECT_CUSTOMER_LIST_FINAL_CONFIG;



  if (sheet.getName() !== config.SHEET_NAME) {

    ui.alert(

      'Otevři list „' + config.SHEET_NAME +

      '“ a vyber řádek požadovaného zákazníka.'

    );

    return false;

  }



  const range = sheet.getActiveRange();

  if (!range) {

    ui.alert('Nejdřív vyber řádek zákazníka.');

    return false;

  }



  const row = range.getRow();

  if (row < config.DATA_START_ROW || row > config.DATA_END_ROW) {

    ui.alert('Vyber buňku v řádku zákazníka, ne záhlaví.');

    return false;

  }



  const customerId = String(

    sheet.getRange(row, config.TECHNICAL_ID_COLUMN).getValue() || ''

  ).trim();



  if (!customerId) {

    ui.alert(

      'Na vybraném řádku není CUSTOMER_ID. ' +

      'Nejdřív aktualizuj seznam zákazníků.'

    );

    return false;

  }



  const customerName = String(sheet.getRange(row, 1).getDisplayValue() || '')

    .trim();



  const choice = ui.alert(

    'AUTOMYČKA PERFECT',

    'Opravdu chceš otevřít kartu zákazníka' +

      (customerName ? ':\n' + customerName : '') +

      '?',

    ui.ButtonSet.YES_NO

  );



  if (choice !== ui.Button.YES) {

    return false;

  }



  return otevritKartuZeSeznamuZakazniku(customerId);

}



/* =====================================================

 * 15. OTEVŘÍT KARTU PODLE ŘÁDKU

 * ===================================================== */



function otevritZakaznikaPodleRadku(row) {

  const sheet = perfectCustomerListGetOrCreateSheet_();

  const numericRow = Number(row);

  const config = PERFECT_CUSTOMER_LIST_FINAL_CONFIG;



  if (

    !numericRow ||

    numericRow < config.DATA_START_ROW ||

    numericRow > config.DATA_END_ROW

  ) {

    throw new Error('Neplatný řádek zákazníka.');

  }



  const customerId = String(

    sheet.getRange(numericRow, config.TECHNICAL_ID_COLUMN).getValue() || ''

  ).trim();



  if (!customerId) {

    throw new Error('Na tomto řádku není CUSTOMER_ID.');

  }



  return otevritKartuZeSeznamuZakazniku(customerId);

}



/* =====================================================

 * 16. KLIKNUTÍ DO SLOUPCE G

 * ===================================================== */



function onSelectionChange(e) {

  // Záměrně neotevíráme kartu při pouhém označení buňky.

  // Použij nabídku „👤 Zákazníci“ a volbu

  // „Otevřít kartu vybraného zákazníka…“.

}



/* =====================================================

 * 17. POZNÁMKA ZÁKAZNÍKA – ZÁPIS PŘES MODUL 01

 * ===================================================== */



function upravitPoznamkuZakaznika(customerId, note) {

  const id = String(customerId || '').trim();



  if (!id) {

    throw new Error('Chybí CUSTOMER_ID.');

  }



  if (typeof databaseUpdateCustomer !== 'function') {

    throw new Error(

      'Centrální databáze neposkytuje databaseUpdateCustomer().'

    );

  }



  return databaseUpdateCustomer(id, {

    poznamka: String(note || '').trim()

  });

}



/* =====================================================

 * 18. TECHNICKÝ SLOUPEC

 * ===================================================== */



function pripravitTechnickySloupecSeznamuZakazniku() {

  const sheet = perfectCustomerListGetOrCreateSheet_();



  sheet.getRange('Z1').setValue('CUSTOMER_ID');

  sheet.hideColumns(

    PERFECT_CUSTOMER_LIST_FINAL_CONFIG.TECHNICAL_ID_COLUMN

  );



  return true;

}



/* =====================================================

 * 19. POČET ZÁKAZNÍKŮ V SEZNAMU

 * ===================================================== */



function getPocetZakaznikuVSeznamu() {

  const sheet = perfectCustomerListGetOrCreateSheet_();

  const config = PERFECT_CUSTOMER_LIST_FINAL_CONFIG;

  const lastRow = sheet.getLastRow();



  if (lastRow < config.DATA_START_ROW) {

    return 0;

  }



  const ids = sheet.getRange(

    config.DATA_START_ROW,

    config.TECHNICAL_ID_COLUMN,

    lastRow - config.DATA_START_ROW + 1,

    1

  ).getValues();



  return ids.filter(function(row) {

    return String(row[0] || '').trim() !== '';

  }).length;

}



/* =====================================================

 * 20. AKTUÁLNÍ CUSTOMER_ID

 * ===================================================== */



function getCustomerIdZAktualnihoRadku() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const config = PERFECT_CUSTOMER_LIST_FINAL_CONFIG;



  if (sheet.getName() !== config.SHEET_NAME) {

    return '';

  }



  const range = sheet.getActiveRange();

  if (!range) {

    return '';

  }



  const row = range.getRow();

  if (row < config.DATA_START_ROW || row > config.DATA_END_ROW) {

    return '';

  }



  return String(

    sheet.getRange(row, config.TECHNICAL_ID_COLUMN).getValue() || ''

  ).trim();

}



/* =====================================================

 * 21. AKTUÁLNÍ ZÁKAZNÍK

 * ===================================================== */



function getAktualnihoZakaznikaZeSeznamu() {

  const customerId = getCustomerIdZAktualnihoRadku();



  if (!customerId) {

    return null;

  }



  return databaseFindCustomerById(customerId);

}



/* =====================================================

 * 22. OBNOVIT JEDEN ŘÁDEK

 * ===================================================== */



function obnovitRadekZakaznika(customerId) {

  if (!customerId) {

    throw new Error('Chybí CUSTOMER_ID.');

  }



  return perfectCustomerListRefresh_();

}



/* =====================================================

 * 23. BEZPEČNÉ OBNOVENÍ

 * ===================================================== */



function bezpecneObnovitSeznamZakazniku() {

  try {

    const result = perfectCustomerListRefresh_();



    SpreadsheetApp.getActiveSpreadsheet().toast(

      'Seznam zákazníků aktualizován.',

      'AUTOMYČKA PERFECT',

      3

    );



    return result;

  } catch (error) {

    Logger.log(

      'SEZNAM ZÁKAZNÍKŮ – chyba: ' + error.stack

    );



    SpreadsheetApp.getActiveSpreadsheet().toast(

      'Seznam zákazníků se nepodařilo aktualizovat.',

      'AUTOMYČKA PERFECT',

      5

    );



    throw error;

  }

}



/* =====================================================

 * 24. TEST NAPOJENÍ NA CENTRÁLNÍ DATABÁZI

 * ===================================================== */



function testSeznamZakaznikuDatabaseConnection() {

  const customers = databaseGetAllCustomers() || [];

  const orders = databaseGetAllOrders() || [];



  const result = {

    database: true,

    customerCount: customers.length,

    orderCount: orders.length

  };



  Logger.log(JSON.stringify(result, null, 2));

  return result;

}



/* =====================================================

 * 25. TEST CELÉHO SEZNAMU

 * ===================================================== */



function testModul06SeznamZakazniku() {

  const database = testSeznamZakaznikuDatabaseConnection();

  const displayed = perfectCustomerListRefresh_();

  const count = getPocetZakaznikuVSeznamu();



  const result = {

    module: '06',

    name: 'SEZNAM ZÁKAZNÍKŮ',

    database: database,

    displayed: displayed,

    customerCount: count,

    columns: 'A-G',

    technicalId: 'Z',

    widths: {

      A: 450,

      B: 450,

      C: 450

    },

    status: 'OK'

  };



  Logger.log(JSON.stringify(result, null, 2));

  return result;

}



/* =====================================================

 * 26. TEST KARTY ZE SLOUPCE G

 * ===================================================== */



function testKartyZakaznikaZeSloupceG() {

  const sheet = perfectCustomerListGetOrCreateSheet_();

  const range = sheet.getActiveRange();



  if (!range) {

    throw new Error('Vyber řádek zákazníka.');

  }



  return otevritZakaznikaPodleRadku(range.getRow());

}



/* =====================================================

 * KONEC MODULU 06

 * ===================================================== */
