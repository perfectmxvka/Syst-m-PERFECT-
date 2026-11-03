/*******************************************************
 * AUTOMYČKA PERFECT 2.0
 * 10_Karta zákazníka.gs
 *
 * KARTA ZÁKAZNÍKA – PREZENTAČNÍ MODUL
 *
 * PRINCIP:
 * - čte pouze centrální databázi
 * - nemá vlastní databázi
 * - neukládá provozní data
 * - KAŽDÉ OTEVŘENÍ vytvoří NOVÝ LIST
 * - staré karty se nikdy nepřepisují
 * - vozidla se načítají z DB vozidel i z objednávek
 *******************************************************/
/* =====================================================
 * 01. HLAVNÍ VEŘEJNÁ FUNKCE
 * ===================================================== */
function otevritKartuZakaznika(customerId) {
  return vytvoritKartuZakaznika(
    customerId
  );
}
/* =====================================================
 * 02. KOMPATIBILITA
 * ===================================================== */
function otevritKartuZakaznikaModul10(customerId) {
  return vytvoritKartuZakaznika(
    customerId
  );
}
/* =====================================================
 * 03. VYTVOŘIT NOVOU KARTU
 * ===================================================== */
function vytvoritKartuZakaznika(customerId) {
  const id =
    String(
      customerId || ''
    ).trim();
  if (!id) {
    throw new Error(
      'KARTA: Nebyl předán CUSTOMER_ID.'
    );
  }
  /* ---------------------------------------------------
   * ZÁKAZNÍK
   * --------------------------------------------------- */
  let customer = null;
  if (
    typeof databaseFindCustomerById ===
    'function'
  ) {
    customer =
      databaseFindCustomerById(
        id
      );
  }
  /* ---------------------------------------------------
   * OBJEDNÁVKY
   * --------------------------------------------------- */
  let orders = [];
  if (
    typeof databaseGetOrdersByCustomerId ===
    'function'
  ) {
    orders =
      databaseGetOrdersByCustomerId(
        id
      ) || [];
  }
  /* ---------------------------------------------------
   * ZÁLOŽNÍ ZÁKAZNÍK Z OBJEDNÁVKY
   * --------------------------------------------------- */
  if (
    !customer &&
    orders.length
  ) {
    const firstOrder =
      kartaZakaznikaNormalizeOrder_(
        orders[0]
      );
    customer = {
      CUSTOMER_ID:
        id,
      JMENO_PRIJMENI:
        firstOrder.JMENO_PRIJMENI || '',
      EMAIL:
        firstOrder.EMAIL || '',
      TELEFON:
        firstOrder.TELEFON || ''
    };
  }
  if (!customer) {
    throw new Error(
      'KARTA: Zákazník "' +
      id +
      '" nebyl nalezen v centrální databázi.'
    );
  }
  /* ---------------------------------------------------
   * VOZIDLA
   *
   * Načteme:
   * 1. centrální DB vozidel
   * 2. vozidla z objednávek
   *
   * Tím se zajistí, že se vozidlo zobrazí
   * i u starších objednávek.
   * --------------------------------------------------- */
  const vehicles =
    kartaZakaznikaGetVehiclesForCard_(
      id,
      orders
    );
  /* ---------------------------------------------------
   * NOVÝ LIST
   *
   * KAŽDÉ OTEVŘENÍ = NOVÝ LIST.
   * --------------------------------------------------- */
  const sheet =
    kartaZakaznikaCreateNewSheet_(
      customer
    );
  /* ---------------------------------------------------
   * DESIGN
   * --------------------------------------------------- */
  kartaZakaznikaApplyDesign_(
    sheet
  );
  /* ---------------------------------------------------
   * DATA ZÁKAZNÍKA
   * --------------------------------------------------- */
  kartaZakaznikaWriteCustomerData_(
    sheet,
    customer,
    orders,
    vehicles
  );
  // Loga vkládáme až po zapsání názvů vozidel do D15:D25.
  if (typeof perfectVlozitLogaVozidel_ === 'function') {
    perfectVlozitLogaVozidel_(sheet);
  }
  /* ---------------------------------------------------
   * HISTORIE OBJEDNÁVEK
   * --------------------------------------------------- */
  kartaZakaznikaWriteOrders_(
    sheet,
    orders
  );
  /* ---------------------------------------------------
   * STATUSY
   * --------------------------------------------------- */
  kartaZakaznikaApplyStatusValidation_(
    sheet
  );
  /* ---------------------------------------------------
   * AKTIVNÍ LIST
   * --------------------------------------------------- */
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();
  ss.setActiveSheet(
    sheet
  );
  SpreadsheetApp.flush();
  return {
    success: true,
    customerId:
      customer.CUSTOMER_ID || id,
    customer:
      customer.JMENO_PRIJMENI || '',
    orders:
      orders.length,
    vehicles:
      vehicles.length,
    sheetName:
      sheet.getName()
  };
}
/* =====================================================
 * 04. VYTVOŘIT VŽDY NOVÝ LIST
 * ===================================================== */
function kartaZakaznikaCreateNewSheet_(
  customer
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();
  let customerName =
    String(
      customer &&
      customer.JMENO_PRIJMENI
        ? customer.JMENO_PRIJMENI
        : 'Zákazník'
    ).trim();
  if (!customerName) {
    customerName =
      'Zákazník';
  }
  /*
   * Odstranění znaků, které Google Sheets
   * nepovoluje v názvu listu.
   */
  customerName =
    customerName
      .replace(
        /[\[\]\*\\/\\\\?:]/g,
        ''
      )
      .trim();
  /*
   * Základní název.
   */
  let baseName =
    'KARTA - ' +
    customerName;
  /*
   * Přidáme CUSTOMER_ID,
   * aby bylo vždy jasné,
   * komu karta patří.
   */
  if (
    customer &&
    customer.CUSTOMER_ID
  ) {
    baseName +=
      ' - ' +
      String(
        customer.CUSTOMER_ID
      ).trim();
  }
  /*
   * Google Sheets má limit délky názvu listu.
   */
  if (
    baseName.length > 90
  ) {
    baseName =
      baseName.substring(
        0,
        90
      );
  }
  let sheetName =
    baseName;
  let counter = 2;
  /*
   * Pokud list existuje,
   * vytvoříme další:
   *
   * KARTA - Tomáš Prokop - CUS-000123
   * KARTA - Tomáš Prokop - CUS-000123 (2)
   * KARTA - Tomáš Prokop - CUS-000123 (3)
   */
  while (
    ss.getSheetByName(
      sheetName
    )
  ) {
    sheetName =
      baseName +
      ' (' +
      counter +
      ')';
    counter++;
  }
  /*
   * DŮLEŽITÉ:
   * vždy se vytvoří nový list.
   */
  const sheet =
    ss.insertSheet(
      sheetName
    );
  return sheet;
}
/* =====================================================
 * 05. DESIGN
 * ===================================================== */
function kartaZakaznikaApplyDesign_(
  sheet
) {
  if (
    typeof designKartyZakaznikaApply_ !==
    'function'
  ) {
    throw new Error(
      'KARTA: Chybí modul 11 – Design karty zákazníka.'
    );
  }
  designKartyZakaznikaApply_(
    sheet
  );
}
/* =====================================================
 * 06. DATA ZÁKAZNÍKA
 * ===================================================== */
function kartaZakaznikaWriteCustomerData_(
  sheet,
  customer,
  orders,
  vehicles
) {
  /* ---------------------------------------------------
   * JMÉNO
   * --------------------------------------------------- */
  sheet
    .getRange('D3')
    .setValue(
      customer.JMENO_PRIJMENI || ''
    );
  /* ---------------------------------------------------
   * TELEFON
   * --------------------------------------------------- */
  sheet
    .getRange('D5')
    .setValue(
      customer.TELEFON || ''
    );
  /* ---------------------------------------------------
   * EMAIL
   * --------------------------------------------------- */
  sheet
    .getRange('D7')
    .setValue(
      customer.EMAIL || ''
    );
  /* ---------------------------------------------------
   * CELKEM NÁVŠTĚV
   * --------------------------------------------------- */
  sheet
    .getRange('F3')
    .setValue(
      orders.length
    );
  /* ---------------------------------------------------
   * CELKEM UTRACENO
   * --------------------------------------------------- */
  const totalSpent = orders.reduce(function(sum, rawOrder) {
    const order = kartaZakaznikaNormalizeOrder_(rawOrder);
    let raw = String(order.CENA_CELKEM ?? '').trim();
    if (!raw) return sum;

    // Podpora českých částek, například 1.599,50 Kč.
    raw = raw.replace(/\s/g, '').replace(/[^\d,.-]/g, '');
    if (raw.indexOf(',') !== -1) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) return sum;
    return sum + value;
  }, 0);

  const totalSpentRounded = Math.round(totalSpent / 1000) * 1000;
  sheet.getRange('F5').setValue(totalSpentRounded).setNumberFormat('#,##0 "Kč"');
  sheet
    .getRange('F7')
    .setValue(
      kartaZakaznikaGetFavoriteProgram_(
        orders
      )
    );
  /* ---------------------------------------------------
   * VOZIDLA
   * --------------------------------------------------- */
  kartaZakaznikaWriteVehicles_(sheet, vehicles);
}
/* =====================================================
 * 07. NAČTENÍ VOZIDEL Z CENTRÁLNÍ DB A OBJEDNÁVEK
 * ===================================================== */
function kartaZakaznikaGetVehiclesForCard_(customerId, orders) {
  const vehicles = [];
  const known = Object.create(null);
  // A) Vozidla z centrální databáze.
  if (typeof databaseGetVehiclesByCustomerId === 'function') {
    const dbVehicles = databaseGetVehiclesByCustomerId(customerId) || [];
    dbVehicles.forEach(function(rawVehicle) {
      const vehicle = kartaZakaznikaNormalizeVehicle_(rawVehicle);
      if (vehicle) {
        kartaZakaznikaAddVehicle_(vehicles, known, vehicle);
      }
    });
  }
  // B) Vozidla z objednávek – zahrne i starší objednávky.
  if (Array.isArray(orders)) {
    orders.forEach(function(rawOrder) {
      const order = kartaZakaznikaNormalizeOrder_(rawOrder);
      if (!order.VOZIDLO) return;
      kartaZakaznikaAddVehicle_(vehicles, known, {
        VEHICLE_ID: order.VEHICLE_ID || '',
        SPZ: order.SPZ || order.spz || order.RZ || order.RZ_VOZIDLA || '',
        VOZIDLO: order.VOZIDLO || ''
      });
    });
  }
  return vehicles;
}
/* =====================================================
 * 08. ZAPSAT VOZIDLA DO KARTY (11 ŘÁDKŮ)
 * ===================================================== */
function kartaZakaznikaWriteVehicles_(sheet, vehicles) {
  const startRow = 15;
  const maxVehicles = 11;
  // Vyčistí pouze obsah, zachová existující sloučení.
  for (let i = 0; i < maxVehicles; i++) {
    sheet.getRange(startRow + i, 4, 1, 3).clearContent();
  }
  if (!Array.isArray(vehicles)) return;
  vehicles.slice(0, maxVehicles).forEach(function(vehicle, index) {
    if (!vehicle) return;
    const name = String(
      typeof vehicle === 'string'
        ? vehicle
        : vehicle.VOZIDLO ||
          vehicle.vozidlo ||
          vehicle.VEHICLE ||
          vehicle.vehicle ||
          vehicle.name ||
          ''
    ).trim();
    if (!name) return;
    sheet.getRange(startRow + index, 4).setValue(name);
  });
  sheet.getRange('D15:F25')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}
function kartaZakaznikaNormalizeVehicle_(
  rawVehicle
) {
  if (!rawVehicle) {
    return null;
  }
  if (
    typeof rawVehicle ===
    'string'
  ) {
    const name =
      String(
        rawVehicle
      ).trim();
    if (!name) {
      return null;
    }
    return {
      VEHICLE_ID:
        '',
      VOZIDLO:
        name
    };
  }
  return {
    VEHICLE_ID:
      rawVehicle.VEHICLE_ID ||
      rawVehicle.vehicleId ||
      rawVehicle.ID ||
      '',
    SPZ:
      rawVehicle.SPZ || rawVehicle.spz || rawVehicle.RZ ||
      rawVehicle.RZ_VOZIDLA || rawVehicle.REGISTRATION_PLATE ||
      rawVehicle.registrationPlate || rawVehicle.licensePlate || '',
    VOZIDLO:
      rawVehicle.VOZIDLO ||
      rawVehicle.vozidlo ||
      rawVehicle.VEHICLE ||
      rawVehicle.vehicle ||
      rawVehicle.name ||
      ''
  };
}
/* =====================================================
 * 09. PŘIDAT VOZIDLO BEZ DUPLICITY
 * ===================================================== */
function kartaZakaznikaAddVehicle_(vehicles, known, vehicle) {
  if (!vehicle) return;
  const name = String(
    vehicle.VOZIDLO || vehicle.vozidlo || vehicle.VEHICLE || vehicle.vehicle || vehicle.name || ''
  ).trim();
  const vehicleId = String(
    vehicle.VEHICLE_ID || vehicle.vehicleId || vehicle.ID || ''
  ).trim();
  const plate = String(
    vehicle.SPZ || vehicle.spz || vehicle.RZ || vehicle.RZ_VOZIDLA ||
    vehicle.REGISTRATION_PLATE || vehicle.registrationPlate || vehicle.licensePlate || ''
  ).trim();
  if (!name && !vehicleId && !plate) return;
  // Vozidlo z DB a stejné vozidlo z objednávky se nesmí zdvojit jen proto,
  // že jeden záznam má VEHICLE_ID a druhý ho nemá.
  const normalizedName = kartaZakaznikaNormalizeVehicleName_(name);
  const normalizedPlate = kartaZakaznikaNormalizeVehicleName_(plate).replace(/[^a-z0-9]/g, '');
  const keys = [];
  if (normalizedPlate) keys.push('PLATE:' + normalizedPlate);
  if (normalizedName) keys.push('NAME:' + normalizedName);
  if (vehicleId) keys.push('ID:' + vehicleId.toLowerCase());
  if (keys.some(function(key) { return known[key]; })) return;
  keys.forEach(function(key) { known[key] = true; });
  vehicles.push({
    VEHICLE_ID: vehicleId,
    SPZ: plate,
    VOZIDLO: name
  });
}
/* =====================================================
 * 10. NORMALIZACE NÁZVU VOZIDLA
 * ===================================================== */
function kartaZakaznikaNormalizeVehicleName_(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    );
}
function kartaZakaznikaWriteOrders_(
  sheet,
  orders
) {
  const range =
    sheet.getRange(
      'H3:M1002'
    );
  range.clearContent();
  if (
    !Array.isArray(orders) ||
    !orders.length
  ) {
    return;
  }
  const normalizedOrders =
    orders.map(
      function(order) {
        return kartaZakaznikaNormalizeOrder_(
          order
        );
      }
    );
  const sorted =
    normalizedOrders
      .slice()
      .sort(
        function(a, b) {
          const dateA =
            kartaZakaznikaToDate_(
              a.DATUM_OBJEDNANI
            );
          const dateB =
            kartaZakaznikaToDate_(
              b.DATUM_OBJEDNANI
            );
          return dateB - dateA;
        }
      );
  const rows =
    sorted
      .slice(0, 1000)
      .map(
        function(order) {
          return [
            kartaZakaznikaFormatDate_(
              order.DATUM_OBJEDNANI
            ),
            kartaZakaznikaFormatTime_(
              order.CAS_PRIJEZDU
            ),
            order.VOZIDLO || '',
            order.MYCI_PROGRAM || '',
            order.CENA_CELKEM ?? '',
            order.STAV_OBJEDNAVKY || ''
          ];
        }
      );
  if (
    rows.length
  ) {
    sheet
      .getRange(
        3,
        8,
        rows.length,
        6
      )
      .setValues(
        rows
      );
  }
  sheet
    .getRange(
      'L3:L1002'
    )
    .setNumberFormat(
      '#,##0 "Kč"'
    );
}
/* =====================================================
 * 13. NORMALIZACE OBJEDNÁVKY
 * ===================================================== */
function kartaZakaznikaNormalizeOrder_(
  order
) {
  if (!order) {
    return {
      CUSTOMER_ID: '',
      JMENO_PRIJMENI: '',
      EMAIL: '',
      TELEFON: '',
      VEHICLE_ID: '',
      VOZIDLO: '',
      DATUM_OBJEDNANI: '',
      CAS_PRIJEZDU: '',
      MYCI_PROGRAM: '',
      CENA_CELKEM: 0,
      STAV_OBJEDNAVKY: ''
    };
  }
  if (
    Array.isArray(order)
  ) {
    return {
      ORDER_ID:
        order[0] || '',
      DATUM_OBJEDNANI:
        order[1] || '',
      CAS_PRIJEZDU:
        order[2] || '',
      CAS_ODJEZDU:
        order[3] || '',
      CUSTOMER_ID:
        order[4] || '',
      JMENO_PRIJMENI:
        order[5] || '',
      EMAIL:
        order[6] || '',
      TELEFON:
        order[7] || '',
      VEHICLE_ID:
        order[8] || '',
      VOZIDLO:
        order[9] || '',
      DARKOVY_POUKAZ:
        order[10] || '',
      MYCI_PROGRAM:
        order[11] || '',
      DOPLNKY:
        order[12] || '',
      POZNAMKY:
        order[13] || '',
      CENA_CELKEM:
        order[14] ?? 0,
      STAV_OBJEDNAVKY:
        order[15] || '',
      GMAIL_MESSAGE_ID:
        order[16] || ''
    };
  }
  return {
    ORDER_ID:
      order.ORDER_ID ||
      order.orderId ||
      '',
    DATUM_OBJEDNANI:
      order.DATUM_OBJEDNANI ||
      order.datumObjednani ||
      '',
    CAS_PRIJEZDU:
      order.CAS_PRIJEZDU ||
      order.casPrijezdu ||
      '',
    CAS_ODJEZDU:
      order.CAS_ODJEZDU ||
      order.casOdjezdu ||
      '',
    CUSTOMER_ID:
      order.CUSTOMER_ID ||
      order.customerId ||
      '',
    JMENO_PRIJMENI:
      order.JMENO_PRIJMENI ||
      order.jmenoPrijmeni ||
      order.name ||
      '',
    EMAIL:
      order.EMAIL ||
      order.email ||
      '',
    TELEFON:
      order.TELEFON ||
      order.telefon ||
      order.phone ||
      '',
    VEHICLE_ID:
      order.VEHICLE_ID ||
      order.vehicleId ||
      '',
    VOZIDLO:
      order.VOZIDLO ||
      order.vozidlo ||
      order.VEHICLE ||
      order.vehicle ||
      '',
    DARKOVY_POUKAZ:
      order.DARKOVY_POUKAZ ||
      order.darkovyPoukaz ||
      order.voucher ||
      '',
    MYCI_PROGRAM:
      order.MYCI_PROGRAM ||
      order.myciProgram ||
      order.program ||
      '',
    DOPLNKY:
      order.DOPLNKY ||
      order.doplnky ||
      '',
    POZNAMKY:
      order.POZNAMKY ||
      order.poznamky ||
      order.notes ||
      '',
    CENA_CELKEM:
      order.CENA_CELKEM ??
      order.cenaCelkem ??
      order.price ??
      0,
    STAV_OBJEDNAVKY:
      order.STAV_OBJEDNAVKY ||
      order.stavObjednavky ||
      order.status ||
      '',
    GMAIL_MESSAGE_ID:
      order.GMAIL_MESSAGE_ID ||
      order.gmailMessageId ||
      ''
  };
}
/* =====================================================
 * 14. OBLÍBENÝ PROGRAM
 * ===================================================== */
function kartaZakaznikaGetFavoriteProgram_(
  orders
) {
  if (
    !Array.isArray(orders) ||
    !orders.length
  ) {
    return '';
  }
  const counts = {};
  orders.forEach(
    function(rawOrder) {
      const order =
        kartaZakaznikaNormalizeOrder_(
          rawOrder
        );
      const program =
        String(
          order.MYCI_PROGRAM || ''
        ).trim();
      if (!program) {
        return;
      }
      counts[program] =
        (
          counts[program] || 0
        ) + 1;
    }
  );
  let favorite = '';
  let max = 0;
  Object.keys(counts)
    .forEach(
      function(program) {
        if (
          counts[program] > max
        ) {
          max =
            counts[program];
          favorite =
            program;
        }
      }
    );
  return favorite;
}
/* =====================================================
 * 15. STATUSY
 * ===================================================== */
function kartaZakaznikaApplyStatusValidation_(
  sheet
) {
  const statuses = [
    'DOKONČENO',
    'ČEKÁ SE',
    'ZRUŠENO',
    'NEDORAZIL'
  ];
  const rule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        statuses,
        true
      )
      .setAllowInvalid(false)
      .build();
  sheet
    .getRange(
      'M3:M1002'
    )
    .setDataValidation(
      rule
    );
}
/* =====================================================
 * 16. DATUM
 * ===================================================== */
function kartaZakaznikaToDate_(
  value
) {
  if (
    value instanceof Date
  ) {
    return value;
  }
  if (!value) {
    return new Date(0);
  }
  const date =
    new Date(
      value
    );
  if (
    isNaN(
      date.getTime()
    )
  ) {
    return new Date(0);
  }
  return date;
}
/* =====================================================
 * 17. FORMÁT DATA
 * ===================================================== */
function kartaZakaznikaFormatDate_(
  value
) {
  if (!value) {
    return '';
  }
  if (
    value instanceof Date
  ) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'dd.MM.yyyy'
    );
  }
  return String(
    value
  );
}
/* =====================================================
 * 18. FORMÁT ČASU
 * ===================================================== */
function kartaZakaznikaFormatTime_(
  value
) {
  if (!value) {
    return '';
  }
  if (
    value instanceof Date
  ) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'HH:mm'
    );
  }
  return String(
    value
  );
}
/* =====================================================
 * 19. TEST
 * ===================================================== */
function testKartaZakaznika() {
  return vytvoritKartuZakaznika(
    'CUS-000001'
  );
}
/* =====================================================
 * 20. TEST PODLE ID
 * ===================================================== */
function testKartaPodleID() {
  const customerId =
    'CUS-000001';
  return vytvoritKartuZakaznika(
    customerId
  );
}
