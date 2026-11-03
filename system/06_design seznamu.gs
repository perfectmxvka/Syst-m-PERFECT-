/**
 * AUTOMYČKA PERFECT – PROFESIONÁLNÍ DESIGN SEZNAMU ZÁKAZNÍKŮ
 *
 * Samostatný designový modul pro list „SEZNAM ZÁKAZNÍKŮ“.
 * Nezapisuje ani nemaže data v centrální databázi.
 *
 * Spuštění:
 * 1. Vlož tento soubor do projektu Apps Script jako DESIGN_SEZNAMU_ZAKAZNIKU.gs
 * 2. Spusť aplikovatFinalniDesignSeznamuZakazniku()
 */

const PERFECT_CUSTOMER_LIST_DESIGN = Object.freeze({
  SHEET_NAME: 'SEZNAM ZÁKAZNÍKŮ',
  FIRST_DATA_ROW: 4,
  HEADER_ROW: 3,
  TITLE_ROW: 1,
  LAST_DESIGN_ROW: 1000,
  COLORS: {
    black: '#08090B',
    blackSoft: '#111318',
    blackAlt: '#171A20',
    red: '#B10202',
    redBright: '#F21D2D',
    white: '#FFFFFF',
    text: '#F3F4F6',
    muted: '#A7ADB7',
    green: '#00C875',
    yellow: '#FFE600',
    border: '#30343B',
    header: '#15171C',
    vip: '#B10202'
  }
});

function aplikovatFinalniDesignSeznamuZakazniku() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PERFECT_CUSTOMER_LIST_DESIGN.SHEET_NAME);

  if (!sheet) {
    throw new Error(
      'List „' + PERFECT_CUSTOMER_LIST_DESIGN.SHEET_NAME + '“ nebyl nalezen. ' +
      'Nejdřív vytvoř nebo aktualizuj seznam zákazníků.'
    );
  }

  const c = PERFECT_CUSTOMER_LIST_DESIGN.COLORS;
  const lastRow = Math.max(sheet.getLastRow(), PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW);
  const endRow = Math.min(
    Math.max(lastRow, PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW),
    PERFECT_CUSTOMER_LIST_DESIGN.LAST_DESIGN_ROW
  );
  const dataCount = Math.max(1, endRow - PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW + 1);

  // Celkový vizuální základ.
  sheet.setHiddenGridlines(true);
  sheet.setTabColor(c.red);
  // Zamrazíme pouze horní řádky. Zamrazení sloupců A by kolidovalo
  // se sloučeným titulkem A1:G1 a vyvolalo chybu Google Sheets.
  sheet.setFrozenRows(PERFECT_CUSTOMER_LIST_DESIGN.HEADER_ROW);

  // Rozumné šířky sloupců – žádné obrovské sloupce.
  const widths = [250, 250, 165, 105, 135, 280, 185];
  widths.forEach(function(width, i) {
    sheet.setColumnWidth(i + 1, width);
  });

  // Záhlaví / horní značka.
  const title = sheet.getRange('A1:G1');
  if (!title.isPartOfMerge()) {
    title.merge();
  }
  title
    .setBackground(c.black)
    .setFontColor(c.redBright)
    .setFontFamily('Arial')
    .setFontSize(22)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.getRange('A1').setValue('AUTOMYČKA PERFECT  |  SEZNAM ZÁKAZNÍKŮ');
  sheet.setRowHeight(1, 52);

  // Červený akcentový proužek pod titulkem.
  sheet.getRange('A2:G2')
    .setBackground(c.red)
    .setFontColor(c.white)
    .setFontSize(3);
  sheet.setRowHeight(2, 6);

  // Hlavička tabulky.
  sheet.getRange('A3:G3')
    .setBackground(c.header)
    .setFontColor(c.redBright)
    .setFontFamily('Arial')
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true)
    .setBorder(
      false, false, true, false,
      false, false,
      c.red, SpreadsheetApp.BorderStyle.SOLID_MEDIUM
    );
  sheet.setRowHeight(3, 38);

  // Páskování řádků a základní typografie.
  const body = sheet.getRange(
    PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW,
    1,
    dataCount,
    7
  );
  body
    .setFontFamily('Arial')
    .setFontSize(10)
    .setFontColor(c.text)
    .setVerticalAlignment('middle')
    .setBackground(c.blackSoft)
    .setWrap(false)
    .setBorder(
      false, false, true, false,
      false, false,
      c.border, SpreadsheetApp.BorderStyle.SOLID
    );

  // Jemné střídání odstínů pro čitelnost.
  const backgrounds = [];
  for (let r = 0; r < dataCount; r++) {
    const shade = r % 2 === 0 ? c.blackSoft : c.blackAlt;
    backgrounds.push([shade, shade, shade, shade, shade, shade, shade]);
  }
  body.setBackgrounds(backgrounds);

  // Jednotlivé sloupce.
  sheet.getRange(PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW, 1, dataCount, 1)
    .setFontColor(c.yellow)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');

  sheet.getRange(PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW, 2, dataCount, 1)
    .setFontColor(c.green)
    .setHorizontalAlignment('left');

  sheet.getRange(PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW, 3, dataCount, 1)
    .setFontColor(c.white)
    .setHorizontalAlignment('center')
    .setNumberFormat('@');

  sheet.getRange(PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW, 4, dataCount, 1)
    .setFontColor(c.green)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setNumberFormat('0');

  sheet.getRange(PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW, 5, dataCount, 1)
    .setFontColor(c.yellow)
    .setFontWeight('bold')
    .setHorizontalAlignment('right')
    .setNumberFormat('#,##0 "Kč"');

  sheet.getRange(PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW, 6, dataCount, 1)
    .setFontColor(c.muted)
    .setHorizontalAlignment('left');

  sheet.getRange(PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW, 7, dataCount, 1)
    .setBackground(c.red)
    .setFontColor(c.white)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // Komfortní výška řádků.
  if (lastRow >= PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW) {
    sheet.setRowHeights(
      PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW,
      Math.min(dataCount, PERFECT_CUSTOMER_LIST_DESIGN.LAST_DESIGN_ROW),
      34
    );
  }

  // Filtr na hlavičce a zákaznických datech.
  const oldFilter = sheet.getFilter();
  if (oldFilter) oldFilter.remove();

  const filterEnd = Math.max(
    PERFECT_CUSTOMER_LIST_DESIGN.HEADER_ROW + 1,
    Math.min(lastRow, PERFECT_CUSTOMER_LIST_DESIGN.LAST_DESIGN_ROW)
  );
  sheet.getRange(
    PERFECT_CUSTOMER_LIST_DESIGN.HEADER_ROW,
    1,
    filterEnd - PERFECT_CUSTOMER_LIST_DESIGN.HEADER_ROW + 1,
    7
  ).createFilter();

  // Technický identifikátor zůstává skrytý.
  if (sheet.getMaxColumns() >= 26) {
    sheet.hideColumns(26);
  }

  // Podmíněné formátování: vysoký počet návštěv a nulová útrata jsou viditelné.
  const rules = sheet.getConditionalFormatRules().filter(function(rule) {
    const ranges = rule.getRanges();
    return !ranges.some(function(range) {
      return range.getSheet().getName() === sheet.getName() &&
        range.getColumn() <= 5 && range.getLastColumn() >= 4;
    });
  });

  const visitRange = sheet.getRange(
    PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW, 4, dataCount, 1
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(5)
      .setBackground('#123D2C')
      .setFontColor('#36E39A')
      .setRanges([visitRange])
      .build()
  );

  const spendRange = sheet.getRange(
    PERFECT_CUSTOMER_LIST_DESIGN.FIRST_DATA_ROW, 5, dataCount, 1
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(0)
      .setFontColor('#FF7474')
      .setRanges([spendRange])
      .build()
  );

  sheet.setConditionalFormatRules(rules);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Profesionální design seznamu zákazníků byl aplikován.',
    'AUTOMYČKA PERFECT',
    4
  );

  return true;
}
