/**
 * AUTOMYČKA PERFECT 2.0
 * 11_Design karty zákazníka.gs
 *
 * Vzhled zákaznické karty, grafika, loga a barvy.
 * Bez databázové a objednávkové logiky.
 */

const PERFECT_CARD_DESIGN = {

  SHEET_NAME: 'KARTA ZÁKAZNÍKA',

  VEHICLE_LOGOS_FOLDER_ID:

    '15I1TbycTxPxhaCDPBud6NQHpHbkM3mAn',

  IMAGES: {

    CELKEM_NAVSTEV: '12OhnL6JNTEOQaolnASYZ34pjfwLyGRoQ',

    CENA: '1V-PXQBbY_o9bOeKAAdii6l03LER21jGc',

    EMAIL: '1BT460ItAH_W88FD057VLdOGJNGSveJ--',

    HISTORIE: '1ru9xuOGf2RtTeLQZAxIV1-X1v7HC2YZd',

    JMENO_PRIJMENI: '15THJKKfdyl4HeLsO50hH3n6ykzJvyF6t',

    KARTA_ZAKAZNIKA: '1DJ_lhb7wF9p_wlXEfjveKo4KHlnwoSjq',

    LOGO: '1nfoRY9xTkLgghRFAUusiYhiTvdMykbee',

    NEJOBLIBENEJSI_PROGRAM: '13r5OZw4pKjYLrfCrZzTqZy4ZryYNaKSs',

    TELEFON: '1IxnPZYtiA-AjjU1mS79UU8CWxwzWW_kU',

    VOZIDLA: '1QlsC6QcFfvO_yNIrtRvFqC4hYuU9Pkf5'

  },

  COLORS: {

    BACKGROUND: '#000000',

    WHITE: '#FFFFFF',

    GOLD: '#F4B400',

    RED: '#E50914',

    PROGRAMS: {

      BASIC: '#40E0D0',

      CLASSIC: '#FFFFFF',

      PREMIUM: '#D3D3D3',

      AVANGARDE: '#B266FF',

      ELEGANCE: '#FF9800',

      EXCLUSIVE: '#87CEFA',

      PERFECT: '#C4A484',

      PERFECT_NEW_CAR: '#B7410E'

    },

    STATUSES: {

      DOKONCENO: '#00C853',

      CEKA_SE: '#FF9800',

      ZRUSENO: '#B59B00',

      NEDORAZIL: '#F44336'

    }

  }

};

/* =====================================================

 * KOMPATIBILITA S MODULEM 10

 * ===================================================== */

function designKartyZakaznika(sheet) {

  return designKartyZakaznikaApply_(sheet);

}

/* =====================================================

 * HLAVNÍ APLIKACE DESIGNU

 * ===================================================== */

function designKartyZakaznikaApply_(sheet) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Použijeme přesně list předaný modulem 10.

  if (!sheet) {

    sheet = ss.getActiveSheet();

  }

  if (!sheet) {

    throw new Error('Nebyl předán list zákaznické karty.');

  }

  if (sheet.getMaxColumns() < 26) {

    sheet.insertColumnsAfter(

      sheet.getMaxColumns(),

      13 - sheet.getMaxColumns()

    );

  }

  if (sheet.getMaxRows() < 1000) {

    sheet.insertRowsAfter(

      sheet.getMaxRows(),

      100 - sheet.getMaxRows()

    );

  }

  sheet.setHiddenGridlines(true);

  // Základní vzhled.

  sheet.getRange('A1:Z1000')

    .setBackground('#000000')

    .setFontFamily('Alata')

    .setFontColor('#FFFFFF')

    .setVerticalAlignment('middle')

    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  // Šířky sloupců.

  const widths = {

    A: 75,

    B: 150,

    C: 75,

    D: 450,

    E: 75,

    F: 255,

    G: 150,

    H: 150,

    I: 150,

    J: 240,

    K: 210,

    L: 150,

    M: 210

  };

  Object.keys(widths).forEach(function(col) {

    sheet.setColumnWidth(columnToNumber_(col), widths[col]);

  });

  // Výšky řádků.

  sheet.setRowHeight(1, 210);

  sheet.setRowHeight(2, 98);

  sheet.setRowHeight(3, 53);

  sheet.setRowHeight(4, 15);

  sheet.setRowHeight(5, 53);

  sheet.setRowHeight(6, 15);

  sheet.setRowHeight(7, 53);

  sheet.setRowHeights(8, 93, 42);

  sheet.setRowHeight(12, 75); // výška hlavičky vozidel v pixelech

  /*

   * Záměrně nerozpojujeme sloučení v A1:M100.

   * Modul 10 připravuje rozložení konkrétní karty.

   * Sloučené řádky vozidel zachováváme.

   */

  // Hlavní grafika – logo a obrázek karty jsou prohozené podle požadavku.

  perfectCardMerge_(sheet, 'A1:C1');

  perfectCardMerge_(sheet, 'D1:G1');

  perfectCardMerge_(sheet, 'H1:M1');

  perfectVlozitCellImage_(sheet, 'A1', PERFECT_CARD_DESIGN.IMAGES.LOGO);

  perfectVlozitCellImage_(sheet, 'D1', PERFECT_CARD_DESIGN.IMAGES.KARTA_ZAKAZNIKA);

  perfectVlozitCellImage_(sheet, 'H1', PERFECT_CARD_DESIGN.IMAGES.HISTORIE);

  perfectVlozitCellImage_(

    sheet, 'D12', PERFECT_CARD_DESIGN.IMAGES.VOZIDLA

  );

  // Ikony zákaznických údajů a statistik.

  const icons = {

    C3: 'JMENO_PRIJMENI',

    C5: 'TELEFON',

    C7: 'EMAIL',

    E3: 'CELKEM_NAVSTEV',

    E5: 'CENA',

    E7: 'NEJOBLIBENEJSI_PROGRAM'

  };

  Object.keys(icons).forEach(function(cell) {

    perfectVlozitCellImage_(

      sheet, cell, PERFECT_CARD_DESIGN.IMAGES[icons[cell]]

    );

  });

  // Statistiky.

  sheet.getRange('D3:F9')

    .setFontFamily('Alata')

    .setFontSize(20)

    .setFontWeight('bold')

    .setFontColor('#FFFFFF')

    .setHorizontalAlignment('center')

    .setVerticalAlignment('middle');

  sheet.getRange('F5').setFontColor('#F4B400');

  // Hlavičky historie – obnovíme správné názvy sloupců.

  sheet.getRange('H2:M2').setValues([[

    'Datum', 'Čas příjezdu', 'Vozidlo', 'Mycí program', 'Cena', 'Stav objednávky'

  ]]);

  sheet.getRange('H2:M2')

    .setFontFamily('Alata')

    .setFontSize(13)

    .setFontWeight('bold')

    .setFontColor('#FFFFFF')

    .setBackground('#000000')

    .setHorizontalAlignment('center')

    .setVerticalAlignment('middle')

    .setBorder(

      false, false, true, false, false, false,

      '#E50914',

      SpreadsheetApp.BorderStyle.SOLID_MEDIUM

    );

  // Historie objednávek.

  sheet.getRange('H3:M100')

    .setFontFamily('Alata')

    .setFontSize(18)

    .setFontWeight('bold')

    .setFontColor('#FFFFFF')

    .setBackground('#000000')

    .setHorizontalAlignment('center')

    .setVerticalAlignment('middle');

  // Každý řádek vozidla musí být samostatně sloučený D:F.

  perfectCardMerge_(sheet, 'D12:F12');

  sheet.setRowHeight(12, 75);

  for (let row = 15; row <= 25; row++) {

    perfectCardMerge_(sheet, 'D' + row + ':F' + row);

  }

  sheet.getRange('D15:F25')

    .setFontFamily('Quantico')

    .setFontSize(20)

    .setFontWeight('bold')

    .setFontColor('#FFFFFF')

    .setBackground('#000000')

    .setHorizontalAlignment('center')

    .setVerticalAlignment('middle');

  // Loga vkládá modul 10 až po zápisu názvů vozidel.

  // Barvy písma programů a stavů.

  perfectObarvitMyciProgramy_(sheet);

  perfectObarvitStavyObjednavek_(sheet);

  SpreadsheetApp.flush();

  return sheet;

}

/* =====================================================

 * OBRÁZKY DO BUNĚK – HLAVIČKY A IKONY

 * ===================================================== */

function perfectCardMerge_(sheet, a1) {
  const range = sheet.getRange(a1);
  // Zachováme existující sloučení a nikdy nerozpojujeme okolní buňky.
  const alreadyMerged = range.getMergedRanges().some(function(merged) {
    return merged.getA1Notation() === range.getA1Notation();
  });
  if (alreadyMerged) return range;
  try {
    range.merge();
  } catch (e) {
    console.warn('Sloučení ' + a1 + ' nebylo změněno: ' + e.message);
  }
  return range;
}

function perfectCardFillVehiclesFromHistory_(sheet) {

  const current = sheet.getRange('D15:D25').getDisplayValues().flat();

  if (current.some(function(v) { return String(v || '').trim(); })) return;

  const history = sheet.getRange('J3:J100').getDisplayValues().flat();

  const seen = {};

  const vehicles = [];

  history.forEach(function(value) {

    const name = String(value || '').trim();

    if (!name) return;

    const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');

    if (seen[key]) return;

    seen[key] = true;

    vehicles.push(name);

  });

  for (let i = 0; i < 11; i++) {

    const cell = sheet.getRange(15 + i, 4);

    cell.clearContent();

    if (vehicles[i]) cell.setValue(vehicles[i]);

  }

}

function perfectVlozitCellImage_(sheet, cellAddress, fileId) {

  if (!fileId) {

    console.warn('Chybí ID obrázku: ' + cellAddress);

    return;

  }

  const url =

    'https://drive.google.com/uc?export=view&id=' +

    encodeURIComponent(fileId);

  const image = SpreadsheetApp.newCellImage()

    .setSourceUrl(url)

    .build();

  sheet.getRange(cellAddress)

    .setValue(image)

    .setHorizontalAlignment('center')

    .setVerticalAlignment('middle');

}

// Zachovaný název původní pomocné funkce.

function vlozitObrazekDoBunky_(sheet, cellAddress, fileId) {

  return perfectVlozitCellImage_(sheet, cellAddress, fileId);

}

/* =====================================================

 * NORMALIZACE TEXTU

 * ===================================================== */

function perfectNormalizovatText_(value) {

  return String(value == null ? '' : value)

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .toLowerCase()

    .replace(/\s+/g, ' ')

    .trim();

}

/* =====================================================

 * ALIASY ZNAČEK AUTOMOBILŮ

 * ===================================================== */

function perfectAliasZnacek_() {

  return {

    'vw': 'volkswagen',

    'volkswagen': 'volkswagen',

    'volswagen': 'volkswagen',

    'skoda': 'skoda',

    'rolls royce': 'rolls royce',

    'rolls-royce': 'rolls royce',

    'sangyong': 'sangyong',

    'ssangyong': 'sangyong',

    'seat': 'seat',

    'subaru': 'subaru',

    'suzuki': 'suzuki',

    'tesla': 'tesla',

    'toyota': 'toyota',

    'mg': 'mg',

    'mini': 'mini',

    'mitsubishi': 'mitsubishi',

    'nissan': 'nissan',

    'opel': 'opel',

    'peugeot': 'peugeot',

    'porsche': 'porsche',

    'ram': 'ram',

    'renault': 'renault',

    'kia': 'kia',

    'lamborghini': 'lamborghini',

    'lancia': 'lancia',

    'land rover': 'land rover',

    'lexus': 'lexus',

    'maserati': 'maserati',

    'mazda': 'mazda',

    'mclaren': 'mclaren',

    'mercedes': 'mercedes',

    'mercedes benz': 'mercedes',

    'ford': 'ford',

    'honda': 'honda',

    'hyundai': 'hyundai',

    'chevrolet': 'chevrolet',

    'chrysler': 'chrysler',

    'infiniti': 'infiniti',

    'isuzu': 'isuzu',

    'jaguar': 'jaguar',

    'jeep': 'jeep',

    'bmw': 'bmw',

    'citroen': 'citroen',

    'cupra': 'cupra',

    'dacia': 'dacia',

    'daihatsu': 'daihatsu',

    'dodge': 'dodge',

    'ds': 'ds',

    'ferrari': 'ferrari',

    'fiat': 'fiat',

    'acura': 'acura',

    'alfa romeo': 'alfa romeo',

    'aston martin': 'aston martin',

    'audi': 'audi',

    'bentley': 'bentley'

  };

}

function perfectRozpoznatZnackuVozidla_(vehicleName) {

  const name = perfectNormalizovatText_(vehicleName);

  if (!name) return '';

  const aliases = perfectAliasZnacek_();

  const keys = Object.keys(aliases).sort(function(a, b) {

    return b.length - a.length;

  });

  for (let i = 0; i < keys.length; i++) {

    const alias = keys[i];

    const escaped = alias.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');

    const pattern = new RegExp('^' + escaped + '(?:\\s|[-_/]|$)');

    if (pattern.test(name)) return aliases[alias];

  }

  return '';

}

/* =====================================================

 * NAČTENÍ LOG Z GOOGLE DRIVE

 * ===================================================== */

function perfectNacistMapLog_() {
  const folder = DriveApp.getFolderById(
    PERFECT_CARD_DESIGN.VEHICLE_LOGOS_FOLDER_ID
  );
  const aliases = perfectAliasZnacek_();
  const map = {};
  const files = folder.getFiles();

  // Názvy souborů ponecháváme beze změny. Při hledání ignorujeme
  // diakritiku, velikost písmen, příponu a běžná slova typu „logo“.
  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed()) continue;

    const originalName = file.getName();
    const normalizedName = perfectNormalizovatText_(originalName)
      .replace(/\.(png|jpe?g|gif|webp|svg)$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b(logo|logos|brand|car|cars|icon|emblem|transparent|official|vector|png|jpg|jpeg|webp|svg)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let brand = aliases[normalizedName] || '';

    // Podpora názvů jako „BMW Logo“, „logo-volkswagen“ apod.
    // Krátké značky (VW, MG, DS) používáme pouze při přesné shodě,
    // aby nedocházelo k falešnému přiřazení.
    if (!brand) {
      const keys = Object.keys(aliases).sort(function(a, b) {
        return b.length - a.length;
      });
      for (let i = 0; i < keys.length; i++) {
        const alias = keys[i];
        if (alias.length < 3) continue;
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp('(?:^|\\s)' + escaped + '(?:\\s|$)');
        if (pattern.test(normalizedName)) {
          brand = aliases[alias];
          break;
        }
      }
    }

    if (brand && (!map[brand] || normalizedName === brand)) {
      map[brand] = file.getId();
    }
  }
  return map;
}

/* =====================================================

 * VLOŽENÍ LOG AUTOMOBILŮ

 *

 * Vozidlo se čte z D15:D25.

 * Loga se ukotví do C15:C25 a G15:G25.

 * ===================================================== */

function perfectVlozitLogaVozidel_(sheet) {

  const logoMap = perfectNacistMapLog_();

  // Odstraníme pouze plovoucí obrázky ukotvené

  // do vyhrazených buněk C15:C25 a G15:G25.

  sheet.getImages().forEach(function(image) {

    const anchor = image.getAnchorCell();

    const row = anchor.getRow();

    const col = anchor.getColumn();

    if (row >= 15 && row <= 25 && (col === 3 || col === 7)) {

      image.remove();

    }

  });

  for (let row = 15; row <= 25; row++) {

    // D je levá horní buňka sloučeného rozsahu D:F.

    const vehicle = sheet.getRange('D' + row).getDisplayValue();

    const brand = perfectRozpoznatZnackuVozidla_(vehicle);

    if (!vehicle || !brand || !logoMap[brand]) {

      console.warn(

        'Logo nenalezeno: řádek ' + row +

        ', vozidlo: "' + vehicle + '"' +

        ', značka: "' + (brand || 'nerozpoznána') + '"'

      );

      continue;

    }

    const blob = DriveApp.getFileById(logoMap[brand]).getBlob();

    const leftImage = sheet.insertImage(blob, 3, row);

    leftImage

      .setAnchorCell(sheet.getRange('C' + row))

      .setWidth(55)

      .setHeight(35);

    const rightImage = sheet.insertImage(blob, 7, row);

    rightImage

      .setAnchorCell(sheet.getRange('G' + row))

      .setWidth(55)

      .setHeight(35);

  }

}

/* =====================================================

 * BARVY MYCÍCH PROGRAMŮ – BARVA PÍSMA

 * ===================================================== */

function perfectBarvaMycihoProgramu_(program) {

  const value = perfectNormalizovatText_(program);

  const c = PERFECT_CARD_DESIGN.COLORS.PROGRAMS;

  if (!value) return null;

  if (value.includes('perfect new car')) return c.PERFECT_NEW_CAR;

  if (value.includes('avangarde')) return c.AVANGARDE;

  if (value.includes('exclusive')) return c.EXCLUSIVE;

  if (value.includes('elegance')) return c.ELEGANCE;

  if (value.includes('premium')) return c.PREMIUM;

  if (value.includes('basic')) return c.BASIC;

  if (/\b(classic|clasic)\b/.test(value)) return c.CLASSIC;

  if (/\bperfect\b/.test(value)) return c.PERFECT;

  return null;

}

function perfectObarvitMyciProgramy_(sheet) {

  const values = sheet.getRange('K3:K100').getDisplayValues();

  for (let i = 0; i < values.length; i++) {

    const color = perfectBarvaMycihoProgramu_(values[i][0]);

    if (color) {

      sheet.getRange(i + 3, 11).setFontColor(color);

    }

  }

}

/* =====================================================

 * BARVY STAVŮ OBJEDNÁVEK – BARVA PÍSMA

 * ===================================================== */

function perfectBarvaStavuObjednavky_(status) {

  const value = perfectNormalizovatText_(status);

  const c = PERFECT_CARD_DESIGN.COLORS.STATUSES;

  if (!value) return null;

  if (value === 'dokonceno') return c.DOKONCENO;

  if (value === 'ceka se') return c.CEKA_SE;

  if (value === 'zruseno') return c.ZRUSENO;

  if (value === 'nedorazil') return c.NEDORAZIL;

  return null;

}

function perfectObarvitStavyObjednavek_(sheet) {

  const values = sheet.getRange('M3:M100').getDisplayValues();

  for (let i = 0; i < values.length; i++) {

    const color = perfectBarvaStavuObjednavky_(values[i][0]);

    if (color) {

      sheet.getRange(i + 3, 13).setFontColor(color);

    }

  }

}

/* =====================================================

 * SLOUPEC → ČÍSLO

 * ===================================================== */

function columnToNumber_(column) {

  let number = 0;

  const value = String(column).toUpperCase();

  for (let i = 0; i < value.length; i++) {

    number = number * 26 + value.charCodeAt(i) - 64;

  }

  return number;

}

/* =====================================================

 * RUČNÍ TEST DESIGNU

 *

 * Spouští se na aktuálním listu zákaznické karty.

 * ===================================================== */

function testDesignKartyZakaznika() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (!/^KARTA\s*-/i.test(sheet.getName())) {

    throw new Error(

      'Otevři konkrétní kartu zákazníka, například ' +

      '"KARTA - Tomáš Prokop", a potom spusť test.'

    );

  }

  designKartyZakaznikaApply_(sheet);

  return 'Design aplikován na: ' + sheet.getName();

}
