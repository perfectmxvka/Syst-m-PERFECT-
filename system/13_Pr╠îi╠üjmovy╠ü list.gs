/************************************************************
 * AUTOMYČKA PERFECT 2.0
 * 04_Prijmovy_list.gs
 * Příjmový list – formulář; provozní data ukládá výhradně
 * přes API modulu 01 – Centrální databáze.
 ************************************************************/

const PERFECT_INCOME_CFG = Object.freeze({
  SHEET_NAME: 'Příjmový list',
  PROGRAMS: [
    { name: 'CLASSIC', color: '#bfe1f6' },
    { name: 'PREMIUM', color: '#ffcfc9' },
    { name: 'AVANGARDE', color: '#b10202' },
    { name: 'INDIVIDUÁL', color: '#11734b' },
    { name: 'COMFORT', color: '#bd59f1' },
    { name: 'ELEGANCE', color: '#ff5f13' },
    { name: 'EXCLUSIVE', color: '#5866f0' },
    { name: 'PERFECT', color: '#b33a00' },
    { name: 'PERFECT NEW CAR', color: '#f80000' }
  ],
  // Obrázky z uživatelem dodaných odkazů na Google Drive.
  // Pořadí odpovídá zaslaným odkazům: záhlaví, Termín, Vozidlo, Program,
  // Cena, Dárkový poukaz, Příjezd, Odjezd, Zákazník, Telefon, Poznámky,
  // Uložit do databáze, Vyčistit list.
  IMAGE_URLS: {
    HEADER: 'https://drive.google.com/uc?export=view&id=1UNFhWkzMrQBZQyHei3Lqrz1hJS-kz7FO',
    TERMIN: 'https://drive.google.com/uc?export=view&id=1_EL_Xx1byb-jf2rIWBN685F4nsrw4S3U',
    VOZIDLO: 'https://drive.google.com/uc?export=view&id=1PRkfilXP9ZPE8fS0646NM8vnGdc3Up9q',
    PROGRAM: 'https://drive.google.com/uc?export=view&id=1gcFEfjXMWsWEwpL5g1ONAW_EfQTkCb2l',
    CENA: 'https://drive.google.com/uc?export=view&id=1uU8gQh0e49331QoZk5V_7dm554qZm9R3',
    POUKAZ: 'https://drive.google.com/uc?export=view&id=167qzwqAV9mynqTj_Di7DXSaiUglZmVti',
    PRIJEZD: 'https://drive.google.com/uc?export=view&id=1GVIFvXSFmc4FyZbqhQ__vqdXR6ggb6rd',
    ODJEZD: 'https://drive.google.com/uc?export=view&id=1LhG2a0Yo7PdvcKcHIQAUQIPwuV8XzgPs',
    ZAKAZNIK: 'https://drive.google.com/uc?export=view&id=1Oa1Af6nhGtrzq2A1TtZblw85aXNLu1ER',
    TELEFON: 'https://drive.google.com/uc?export=view&id=1bRjAo3Uxg7NsvpcrBLndOgz4oonLx1Rt',
    POZNAMKY: 'https://drive.google.com/uc?export=view&id=1pKwf-1G08_71DxBQm_DYrlWf79UOTR2Q',
    SAVE: 'https://drive.google.com/uc?export=view&id=1J-iQxBT2u9Y1Ep98zKV-6uW57MFtxZCz',
    CLEAR: 'https://drive.google.com/uc?export=view&id=19LEXuwDeKxvM6OhTwjzbEKT_glHUAjpg'
  }
});

function otevritPrijmovyList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(PERFECT_INCOME_CFG.SHEET_NAME);
  if (!sh) sh = ss.insertSheet(PERFECT_INCOME_CFG.SHEET_NAME);
  perfectIncomeBuildSheet_(sh);
  ss.setActiveSheet(sh);
  return sh;
}

function perfectIncomeBuildSheet_(sh) {
  const rows = [
    ['PŘÍJMOVÝ LIST', ''],
    ['TERMÍN', ''],
    ['VOZIDLO', ''],
    ['PROGRAM', ''],
    ['CENA', ''],
    ['DÁRKOVÝ POUKAZ', ''],
    ['PŘÍJEZD', ''],
    ['ODJEZD', ''],
    ['ZÁKAZNÍK', ''],
    ['TELEFÓN', ''],
    ['POZNÁMKY', '']
  ];
  // Odstraníme případné staré plovoucí obrázky z předchozí verze.
  // Nová verze používá výhradně obrázky přímo v buňkách přes IMAGE().
  sh.getImages().forEach(img => img.remove());
  sh.setHiddenGridlines(true);
  sh.getRange('A1:Z500').setBackground('#000000').setFontColor('#ffffff');
  sh.setColumnWidth(1, 22);
  sh.setColumnWidth(2, 22);
  sh.setColumnWidth(3, 425);
  sh.setColumnWidth(4, 22);
  sh.setColumnWidth(5, 174);
  sh.setColumnWidth(6, 199);
  sh.setColumnWidth(7, 22);
  sh.setColumnWidth(8, 425);
  const heights = {1:82,2:37,3:48,4:37,5:32,6:64,7:30,8:44,9:37,10:30,11:30,13:71};
  Object.keys(heights).forEach(r => sh.setRowHeight(Number(r), heights[r]));
  sh.getRange('E1:F1').breakApart();
  sh.getRange('E1:F1').merge();
  sh.getRange('E1').setValue('PŘÍJMOVÝ LIST');
  for (let i = 1; i < rows.length; i++) sh.getRange(i + 1, 5).setValue(rows[i][0]);
  sh.getRange('E1:F11')
    .setBackground('#000000')
    .setFontFamily('Fredoka')
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setVerticalAlignment('middle');
  sh.getRange('E1:F1').setHorizontalAlignment('center').setFontSize(18);
  sh.getRange('E2:E11').setHorizontalAlignment('left').setFontSize(10);
  sh.getRange('F2:F11').setHorizontalAlignment('center').setFontSize(12).setFontColor('#ffffff');
  sh.getRange('F5').setFontColor('#f1c232').setNumberFormat('#,##0 "Kč"');
  sh.getRange('F2').setNumberFormat('d.M');
  sh.getRange('F7:F8').setNumberFormat('H:mm');
  sh.getRange('F4').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(PERFECT_INCOME_CFG.PROGRAMS.map(p => p.name), true)
    .setAllowInvalid(true).build());
  sh.setConditionalFormatRules([]);
  PERFECT_INCOME_CFG.PROGRAMS.forEach(p => {
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(p.name).setBackground(p.color)
      .setFontColor(['#b10202','#f80000','#ff5f13','#b33a00'].includes(p.color) ? '#ffffff' : '#000000')
      .setRanges([sh.getRange('F4')]).build();
    const existing = sh.getConditionalFormatRules();
    existing.push(rule); sh.setConditionalFormatRules(existing);
  });
  sh.getRange('E1:F11').setBorder(true, false, true, false, false, true, '#ff0000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  // Pole pro zadávání; tmavý vzhled zůstává zachován.
  sh.getRange('F2:F11').setBackground('#171717');
  sh.getRange('F4').setBackground('#171717');
  sh.getRange('C13').setValue('💾  ULOŽIT DO CENTRÁLNÍ DATABÁZE');
  sh.getRange('H13').setValue('🧹  VYČISTIT LIST');
  ['C13','H13'].forEach(a => sh.getRange(a)
    .setBackground('#b10202').setFontColor('#ffffff').setFontFamily('Fredoka')
    .setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center')
    .setVerticalAlignment('middle').setWrap(true)
    .setBorder(true,true,true,true,false,false,'#ffffff',SpreadsheetApp.BorderStyle.SOLID_MEDIUM));
  sh.getRange('C13').setNote('Klikněte pravým tlačítkem na buňku a zvolte Přiřadit skript: perfectIncomeSaveButton');
  sh.getRange('H13').setNote('Klikněte pravým tlačítkem na buňku a zvolte Přiřadit skript: perfectIncomeClearButton');
  // PŘESNÉ MAPOVÁNÍ OBRÁZKŮ PODLE NÁZVŮ SOUBORŮ A BUNĚK OD UŽIVATELE.
  // Každý obrázek se zapisuje jako vzorec IMAGE() přímo do uvedené buňky.
  // PERFECT_HLAVICKA je v oblasti E1:F1 (sloučené buňky).
  const imageMap = [
    { name: 'PERFECT_HLAVICKA', cell: 'E1', key: 'HEADER', fallback: 'PŘÍJMOVÝ LIST' },
    { name: 'PERFECT_TERMIN', cell: 'E2', key: 'TERMIN', fallback: 'TERMÍN' },
    { name: 'PERFECT_VOZIDLO', cell: 'E3', key: 'VOZIDLO', fallback: 'VOZIDLO' },
    { name: 'PERFECT_MYCI_PROGRAM', cell: 'E4', key: 'PROGRAM', fallback: 'MYCÍ PROGRAM' },
    { name: 'PERFECT_CENA', cell: 'E5', key: 'CENA', fallback: 'CENA' },
    { name: 'PERFECT_DARKOVY_POUKAZ', cell: 'E6', key: 'POUKAZ', fallback: 'DÁRKOVÝ POUKAZ' },
    { name: 'PERFECT_PRIJEZD', cell: 'E7', key: 'PRIJEZD', fallback: 'PŘÍJEZD' },
    { name: 'PERFECT_ODJEZD', cell: 'E8', key: 'ODJEZD', fallback: 'ODJEZD' },
    { name: 'PERFECT_ZAKAZNIK', cell: 'E9', key: 'ZAKAZNIK', fallback: 'ZÁKAZNÍK' },
    { name: 'PERFECT_TELEFON', cell: 'E10', key: 'TELEFON', fallback: 'TELEFON' },
    { name: 'PERFECT_POZNAMKY', cell: 'E11', key: 'POZNAMKY', fallback: 'POZNÁMKY' },
    { name: 'PERFECT_ULOZIT_DO_DATABAZE', cell: 'C13', key: 'SAVE', fallback: 'ULOŽIT DO DATABÁZE' },
    { name: 'PERFECT_VYCISTIT_FORMULAR', cell: 'H13', key: 'CLEAR', fallback: 'VYČISTIT FORMULÁŘ' }
  ];
  imageMap.forEach(item => {
    perfectIncomeApplyImage_(sh, item.cell, PERFECT_INCOME_CFG.IMAGE_URLS[item.key], item.fallback);
    sh.getRange(item.cell).setNote('Soubor: ' + item.name + '\nCílová buňka: ' + item.cell + '\nObrázek je vložen přímo do buňky pomocí IMAGE().');
  });
  sh.setFrozenRows(1);
}

function perfectIncomeApplyImage_(sh, cell, url, fallback) {
  const range = sh.getRange(cell);

  // Obrázek je vložený přímo V BUŇCE pomocí IMAGE(), nikoli jako plovoucí objekt.
  // Rozměry řádků a sloupců zůstávají podle uživatelova návrhu beze změny.
  if (!url || !/^https?:\/\//i.test(url)) {
    range.setValue(fallback);
    range.setNote('Chybí platná URL obrázku.');
    return;
  }

  try {
    const safeUrl = url.replace(/"/g, '%22');
    range.setFormula('=IMAGE("' + safeUrl + '")');
    range.setNote('Obrázek vložený přímo do buňky ' + cell + '. Pokud se zobrazuje chyba, ověřte veřejný přístup k obrázku a přímý obrazový odkaz.');
  } catch (err) {
    range.setValue(fallback);
    range.setNote('Obrázek se nepodařilo vložit do buňky ' + cell + '. Detail: ' + err.message);
    console.warn('Nelze vložit obrázek do buňky ' + cell + ': ' + err.message);
  }
}

/**
 * Shovívavé rozpoznání názvu mycího programu.
 * Ignoruje diakritiku, velikost písmen, mezery a běžné drobné překlepy.
 * Pokud je vstup příliš odlišný, vrátí prázdný řetězec místo hádání.
 */
function perfectIncomeNormalizeProgram_(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const normalize = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');
  const target = normalize(raw);
  const programs = PERFECT_INCOME_CFG.PROGRAMS;
  const exact = programs.find(p => normalize(p.name) === target);
  if (exact) return exact.name;
  let best = null;
  let bestDistance = Infinity;
  programs.forEach(p => {
    const candidate = normalize(p.name);
    const distance = perfectIncomeLevenshtein_(target, candidate);
    const allowed = candidate.length >= 12 ? 2 : (candidate.length >= 7 ? 1 : 1);
    if (distance < bestDistance) { bestDistance = distance; best = p; }
    if (distance === 0) bestDistance = 0;
  });
  if (!best) return '';
  const bestName = normalize(best.name);
  const allowed = bestName.length >= 12 ? 2 : 1;
  return bestDistance <= allowed ? best.name : '';
}

function perfectIncomeLevenshtein_(a, b) {
  const dp = Array.from({length: a.length + 1}, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function perfectIncomeSaveButton() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    'Potvrzení uložení',
    'Opravdu chcete zákazníka uložit do centrální databáze automyčky PERFECT?',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(PERFECT_INCOME_CFG.SHEET_NAME);
    if (!sh) throw new Error('Příjmový list neexistuje. Otevřete jej znovu přes menu.');
    if (typeof databaseCreateCustomer !== 'function' || typeof databaseCreateOrder !== 'function') {
      throw new Error('Chybí funkce modulu 01 – Centrální databáze. Záznam nebyl uložen.');
    }
    const v = sh.getRange('F2:F11').getValues().flat();
    const date = v[0] instanceof Date ? v[0] : (v[0] ? new Date(v[0]) : new Date());
    const vehicle = String(v[1] || '').trim();
    const programInput = String(v[2] || '').trim();
    const program = perfectIncomeNormalizeProgram_(programInput);
    const price = Number(v[3]) || 0;
    const voucher = String(v[4] || '').trim();
    const arrival = v[5] || '';
    const departure = v[6] || '';
    const customerName = String(v[7] || '').trim();
    const phone = String(v[8] || '').trim();
    const notes = String(v[9] || '').trim();
    if (!customerName) throw new Error('Vyplňte prosím zákazníka (F9).');
    if (!vehicle) throw new Error('Vyplňte prosím vozidlo (F3).');
    if (!program) throw new Error('Program v F4 se nepodařilo rozpoznat. Vyberte jednu z nabízených možností: CLASSIC, PREMIUM, AVANGARDE, INDIVIDUÁL, COMFORT, ELEGANCE, EXCLUSIVE, PERFECT nebo PERFECT NEW CAR.');
    // I při drobném překlepu uložíme kanonický název programu a jeho oficiální barvu.
    sh.getRange('F4').setValue(program);
    const chosenProgram = PERFECT_INCOME_CFG.PROGRAMS.find(p => p.name === program);
    if (chosenProgram) sh.getRange('F4').setBackground(chosenProgram.color).setFontColor(['#b10202','#f80000','#ff5f13','#b33a00'].includes(chosenProgram.color) ? '#ffffff' : '#000000');
    if (!price || price < 0) throw new Error('Vyplňte prosím platnou cenu (F5).');
    const customerResult = databaseCreateCustomer({
      JMENO_PRIJMENI: customerName, jmenoPrijmeni: customerName,
      TELEFON: phone, telefon: phone, EMAIL: '', email: ''
    });
    const customer = customerResult && (customerResult.customer || customerResult.data || customerResult);
    const customerId = customer && (customer.CUSTOMER_ID || customer.customerId || customer.id || customerResult.customerId || '');
    if (!customerId) throw new Error('Centrální databáze nevrátila ID zákazníka. Ověřte výsledek a případně zkontrolujte databázi před opakováním.');
    const data = {
      ORDER_ID: '', DATUM_OBJEDNANI: date, CAS_PRIJEZDU: arrival, CAS_ODJEZDU: departure,
      CUSTOMER_ID: customerId, JMENO_PRIJMENI: customerName, EMAIL: '', TELEFON: phone,
      VEHICLE_ID: '', VOZIDLO: vehicle, DARKOVY_POUKAZ: voucher, MYCI_PROGRAM: program,
      DOPLNKY: '', POZNAMKY: notes, CENA_CELKEM: price, STAV_OBJEDNAVKY: 'Dokončeno', GMAIL_MESSAGE_ID: ''
    };
    const orderResult = databaseCreateOrder(data);
    if (orderResult && orderResult.success === false) throw new Error(orderResult.message || 'Centrální databáze odmítla uložit objednávku.');
    perfectIncomeClearFields_(sh);
    ui.alert('Hotovo', 'Záznam byl předán centrální databázi a formulář byl vyčištěn.', ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Uložení se nezdařilo', String(err && err.message ? err.message : err), ui.ButtonSet.OK);
  }
}

function perfectIncomeClearButton() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert('Potvrzení vyčištění', 'Opravdu chcete vyčistit Příjmový list?', ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PERFECT_INCOME_CFG.SHEET_NAME);
  if (!sh) { ui.alert('Příjmový list neexistuje. Otevřete jej znovu přes menu.'); return; }
  perfectIncomeClearFields_(sh);
  ui.alert('Hotovo', 'Příjmový list byl vyčištěn.', ui.ButtonSet.OK);
}

function perfectIncomeClearFields_(sh) {
  sh.getRange('F2:F11').clearContent();
  sh.getRange('F2').setNumberFormat('d.M');
  sh.getRange('F5').setNumberFormat('#,##0 "Kč"');
  sh.getRange('F7:F8').setNumberFormat('H:mm');
}

// Spusťte jednou pro vytvoření listu a nastavení jeho vzhledu.
function perfectIncomeInitialize() {
  otevritPrijmovyList();
  SpreadsheetApp.getUi().alert('Příjmový list byl vytvořen a naformátován.');
}
