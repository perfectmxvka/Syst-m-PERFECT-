/*******************************************************
 * AUTOMYČKA PERFECT 2.0
 * 12_KONTROLA_NEDORAZIL.gs
 *
 * KONTROLA ZÁKAZNÍKŮ PO NOVÉ ONLINE OBJEDNÁVCE
 *
 * PRAVIDLO:
 *
 * Pokud poslední HISTORICKÁ ONLINE objednávka
 * stejného zákazníka měla stav NEDORAZIL,
 * systém odešle varovný e-mail.
 *
 * E-mail:
 * rabitensro@gmail.com
 *
 * Tento modul:
 * - nemá vlastní databázi
 * - nic neukládá
 * - používá pouze centrální DB
 *******************************************************/


/* =====================================================
 * 01. HLAVNÍ KONTROLA
 * ===================================================== */

function kontrolaNedorazilPoNoveOnlineObjednavce(
  customerId,
  newOrderId
) {

  const id =
    String(
      customerId || ''
    ).trim();


  const currentOrderId =
    String(
      newOrderId || ''
    ).trim();


  if (!id) {

    throw new Error(
      'KONTROLA NEDORAZIL: Chybí CUSTOMER_ID.'
    );

  }


  if (
    typeof databaseGetOrdersByCustomerId !==
    'function'
  ) {

    throw new Error(
      'KONTROLA NEDORAZIL: Chybí databaseGetOrdersByCustomerId().'
    );

  }


  /*
   * Načteme kompletní historii zákazníka
   * pouze z centrální databáze.
   */

  const allOrders =
    databaseGetOrdersByCustomerId(
      id
    ) || [];


  /*
   * Normalizujeme objednávky.
   */

  const orders =
    allOrders
      .map(
        function(rawOrder) {

          return kontrolaNedorazilNormalizeOrder_(
            rawOrder
          );

        }
      )
      .filter(
        function(order) {

          return !!order;

        }
      );


  /*
   * Vybereme pouze ONLINE objednávky.
   *
   * Online objednávka = má GMAIL_MESSAGE_ID.
   */

  const onlineOrders =
    orders.filter(
      function(order) {

        return String(
          order.GMAIL_MESSAGE_ID || ''
        ).trim() !== '';

      }
    );


  /*
   * Aktuální novou objednávku
   * nesmíme hodnotit jako historickou.
   */

  const historicalOrders =
    onlineOrders.filter(
      function(order) {

        if (
          currentOrderId &&
          String(
            order.ORDER_ID || ''
          ).trim() === currentOrderId
        ) {

          return false;

        }

        return true;

      }
    );


  /*
   * Žádná předchozí online objednávka.
   *
   * Není co kontrolovat.
   */

  if (
    !historicalOrders.length
  ) {

    return {

      alert: false,

      reason:
        'Zákazník nemá předchozí online objednávku.',

      customerId:
        id

    };

  }


  /*
   * Seřadíme historické online objednávky
   * od nejnovější po nejstarší.
   */

  historicalOrders.sort(
    function(a, b) {

      const dateA =
        kontrolaNedorazilGetOrderDate_(
          a
        );


      const dateB =
        kontrolaNedorazilGetOrderDate_(
          b
        );


      return dateB - dateA;

    }
  );


  /*
   * TOHLE JE KLÍČOVÉ.
   *
   * Bereme pouze poslední historickou
   * online objednávku.
   */

  const lastHistoricalOrder =
    historicalOrders[0];


  /*
   * Pokud poslední historická objednávka
   * nebyla NEDORAZIL → žádný poplach.
   */

  if (
    String(
      lastHistoricalOrder.STAV_OBJEDNAVKY || ''
    )
      .trim()
      .toUpperCase() !==
    'NEDORAZIL'
  ) {

    return {

      alert: false,

      reason:
        'Poslední historická online objednávka nemá stav NEDORAZIL.',

      customerId:
        id,

      previousOrderId:
        lastHistoricalOrder.ORDER_ID || '',

      previousStatus:
        lastHistoricalOrder.STAV_OBJEDNAVKY || ''

    };

  }


  /*
   * POPLACH
   */

  const penalty =
    kontrolaNedorazilCalculatePenalty_(
      lastHistoricalOrder.CENA_CELKEM
    );


  /*
   * ODEŠLEME E-MAIL.
   */

  const emailResult =
    kontrolaNedorazilSendAlertEmail_(
      id,
      lastHistoricalOrder,
      penalty,
      currentOrderId,
      orders
    );


  return {

    alert: true,

    emailSent:
      emailResult.success,

    customerId:
      id,

    previousOrderId:
      lastHistoricalOrder.ORDER_ID || '',

    previousStatus:
      lastHistoricalOrder.STAV_OBJEDNAVKY || '',

    previousProgram:
      lastHistoricalOrder.MYCI_PROGRAM || '',

    previousPrice:
      lastHistoricalOrder.CENA_CELKEM || 0,

    penalty:
      penalty,

    newOrderId:
      currentOrderId

  };

}


/* =====================================================
 * 02. NORMALIZACE OBJEDNÁVKY
 * ===================================================== */

function kontrolaNedorazilNormalizeOrder_(
  order
) {

  if (!order) {

    return null;

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
      '',

    EMAIL:
      order.EMAIL ||
      order.email ||
      '',

    TELEFON:
      order.TELEFON ||
      order.telefon ||
      '',

    VEHICLE_ID:
      order.VEHICLE_ID ||
      order.vehicleId ||
      '',

    VOZIDLO:
      order.VOZIDLO ||
      order.vozidlo ||
      order.vehicle ||
      '',

    DARKOVY_POUKAZ:
      order.DARKOVY_POUKAZ ||
      order.darkovyPoukaz ||
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
 * 03. DATUM OBJEDNÁVKY
 * ===================================================== */

function kontrolaNedorazilGetOrderDate_(
  order
) {

  /*
   * Priorita:
   * DATUM_OBJEDNANI
   *
   * To je historické pořadí evidence
   * objednávky v systému.
   */

  if (
    order.DATUM_OBJEDNANI instanceof Date
  ) {

    return order.DATUM_OBJEDNANI;

  }


  const date =
    new Date(
      order.DATUM_OBJEDNANI
    );


  if (
    !isNaN(
      date.getTime()
    )
  ) {

    return date;

  }


  return new Date(0);

}


/* =====================================================
 * 04. VÝPOČET POKUTY
 * ===================================================== */

function kontrolaNedorazilCalculatePenalty_(
  price
) {

  let value =
    Number(
      String(
        price ?? 0
      )
        .replace(
          /\s/g,
          ''
        )
        .replace(
          /[^\d,.-]/g,
          ''
        )
        .replace(
          ',',
          '.'
        )
    );


  if (
    isNaN(value)
  ) {

    value = 0;

  }


  return value * 0.5;

}


/* =====================================================
 * 05. FORMÁT PENĚZ
 * ===================================================== */

function kontrolaNedorazilFormatMoney_(
  value
) {

  const number =
    Number(
      value || 0
    );


  return number
    .toLocaleString(
      'cs-CZ',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ) +
    ' Kč';

}


/* =====================================================
 * 06. FORMÁT DATA
 * ===================================================== */

function kontrolaNedorazilFormatDate_(
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


  const date =
    new Date(
      value
    );


  if (
    !isNaN(
      date.getTime()
    )
  ) {

    return Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      'dd.MM.yyyy'
    );

  }


  return String(
    value
  );

}


/* =====================================================
 * 07. FORMÁT ČASU
 * ===================================================== */

function kontrolaNedorazilFormatTime_(
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
 * 08. ODESLAT VAROVNÝ E-MAIL
 * ===================================================== */

function kontrolaNedorazilSendAlertEmail_(
  customerId,
  previousOrder,
  penalty,
  newOrderId,
  allOrders
) {

  const recipient =
    'rabitensro@gmail.com';


  const subject =
    '🚨 POZOR – ZÁKAZNÍK NEDORAZIL NA POSLEDNÍ OBJEDNÁVKU';


  /*
   * Najdeme aktuální novou objednávku.
   */

  let newOrder = null;


  if (
    newOrderId
  ) {

    newOrder =
      allOrders.find(
        function(order) {

          return String(
            order.ORDER_ID || ''
          ).trim() ===
          String(
            newOrderId
          ).trim();

        }
      );

  }


  /*
   * Pokud ji nenajdeme,
   * použijeme prázdnou strukturu.
   */

  if (!newOrder) {

    newOrder = {

      ORDER_ID:
        newOrderId || '',

      DATUM_OBJEDNANI:
        '',

      CAS_PRIJEZDU:
        '',

      VOZIDLO:
        '',

      MYCI_PROGRAM:
        '',

      CENA_CELKEM:
        0,

      STAV_OBJEDNAVKY:
        'ČEKÁ SE'

    };

  }


  const customerName =
    previousOrder.JMENO_PRIJMENI || '';


  const email =
    previousOrder.EMAIL || '';


  const phone =
    previousOrder.TELEFON || '';


  const previousPrice =
    Number(
      kontrolaNedorazilNormalizeOrder_(
        previousOrder
      ).CENA_CELKEM || 0
    );


  const body =

    'do CENTRÁLNÍ DATABÁZE byl evidován zákazník ' +
    'který na poslední online objednávku nedorazil ' +
    'a nebyl patřičně odůvodněn důvod.\n\n' +

    'Zákazník má udělenou pokutu 50 % částky ' +
    'z předchozího programu.\n\n' +

    '========================================\n' +
    'ZÁKAZNÍK\n' +
    '========================================\n\n' +

    'Jméno: ' +
    customerName +
    '\n' +

    'CUSTOMER_ID: ' +
    customerId +
    '\n' +

    'Telefon: ' +
    phone +
    '\n' +

    'E-mail: ' +
    email +
    '\n\n' +

    '========================================\n' +
    'PŘEDCHOZÍ ONLINE OBJEDNÁVKA – NEDORAZIL\n' +
    '========================================\n\n' +

    'Objednávka: ' +
    (previousOrder.ORDER_ID || '') +
    '\n' +

    'Datum evidence: ' +
    kontrolaNedorazilFormatDate_(
      previousOrder.DATUM_OBJEDNANI
    ) +
    '\n' +

    'Čas příjezdu: ' +
    kontrolaNedorazilFormatTime_(
      previousOrder.CAS_PRIJEZDU
    ) +
    '\n' +

    'Vozidlo: ' +
    (previousOrder.VOZIDLO || '') +
    '\n' +

    'Program: ' +
    (previousOrder.MYCI_PROGRAM || '') +
    '\n' +

    'Cena programu: ' +
    kontrolaNedorazilFormatMoney_(
      previousPrice
    ) +
    '\n' +

    'Stav: NEDORAZIL\n\n' +

    '========================================\n' +
    'POKUTA\n' +
    '========================================\n\n' +

    '50 % z předchozího programu: ' +
    kontrolaNedorazilFormatMoney_(
      penalty
    ) +
    '\n\n' +

    '========================================\n' +
    'NOVÁ ONLINE OBJEDNÁVKA\n' +
    '========================================\n\n' +

    'Objednávka: ' +
    (newOrder.ORDER_ID || '') +
    '\n' +

    'Datum evidence: ' +
    kontrolaNedorazilFormatDate_(
      newOrder.DATUM_OBJEDNANI
    ) +
    '\n' +

    'Čas příjezdu: ' +
    kontrolaNedorazilFormatTime_(
      newOrder.CAS_PRIJEZDU
    ) +
    '\n' +

    'Vozidlo: ' +
    (newOrder.VOZIDLO || '') +
    '\n' +

    'Program: ' +
    (newOrder.MYCI_PROGRAM || '') +
    '\n' +

    'Cena: ' +
    kontrolaNedorazilFormatMoney_(
      newOrder.CENA_CELKEM
    ) +
    '\n' +

    'Stav: ' +
    (newOrder.STAV_OBJEDNAVKY || 'ČEKÁ SE') +
    '\n\n' +

    '========================================\n' +

    'Automyčka PERFECT 2.0';


  MailApp.sendEmail(
    recipient,
    subject,
    body
  );


  return {

    success: true,

    recipient:
      recipient,

    subject:
      subject

  };

}


/* =====================================================
 * 09. TESTOVACÍ E-MAIL
 *
 * TATO FUNKCE NIC NEČTE A NIC NEMĚNÍ
 * V CENTRÁLNÍ DATABÁZI.
 *
 * Pouze odešle testovací e-mail.
 * ===================================================== */

function testKONTROLA_NEDORAZIL_EMAIL() {

  const recipient =
    'rabitensro@gmail.com';


  const subject =
    '🧪 TEST – AUTOMYČKA PERFECT – KONTROLA NEDORAZIL';


  const previousPrice =
    1599;


  const penalty =
    previousPrice * 0.5;


  const body =

    'TESTOVACÍ E-MAIL – AUTOMYČKA PERFECT 2.0\n\n' +

    'Tento e-mail slouží pouze k ověření, ' +
    'že systém dokáže odeslat upozornění ' +
    'na rizikovou online objednávku.\n\n' +

    '========================================\n' +
    'ZÁKAZNÍK\n' +
    '========================================\n\n' +

    'Jméno: Tomáš Prokop\n' +

    'CUSTOMER_ID: CUS-TEST001\n' +

    'Telefon: +420 606 001 312\n' +

    'E-mail: tomas@severske-svetlo.cz\n\n' +

    '========================================\n' +
    'PŘEDCHOZÍ ONLINE OBJEDNÁVKA – NEDORAZIL\n' +
    '========================================\n\n' +

    'Objednávka: N0826-TEST\n' +

    'Datum: 19.08.2026\n' +

    'Čas příjezdu: 09:00\n' +

    'Vozidlo: Kia Sportage\n' +

    'Program: ELEGANCE\n' +

    'Cena programu: ' +
    kontrolaNedorazilFormatMoney_(
      previousPrice
    ) +
    '\n' +

    'Stav: NEDORAZIL\n\n' +

    '========================================\n' +
    'POKUTA\n' +
    '========================================\n\n' +

    '50 % z předchozího programu: ' +
    kontrolaNedorazilFormatMoney_(
      penalty
    ) +
    '\n\n' +

    '========================================\n' +
    'NOVÁ ONLINE OBJEDNÁVKA\n' +
    '========================================\n\n' +

    'Objednávka: N1026-TEST\n' +

    'Datum: 15.10.2026\n' +

    'Čas příjezdu: 10:30\n' +

    'Vozidlo: Kia Sportage\n' +

    'Program: EXCLUSIVE\n' +

    'Cena: 2499 Kč\n' +

    'Stav: ČEKÁ SE\n\n' +

    '========================================\n\n' +

    'Automyčka PERFECT 2.0\n' +

    'TEST – žádná databázová data nebyla změněna.';


  MailApp.sendEmail(
    recipient,
    subject,
    body
  );


  return {

    success: true,

    message:
      'Testovací e-mail byl odeslán na ' +
      recipient

  };

}
