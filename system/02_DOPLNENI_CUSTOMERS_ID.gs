/*******************************************************
 * AUTOMYČKA PERFECT 2.0
 * 02_DOPLNENI_CUSTOMER_ID.gs
 *
 * V3 – OPRAVA PRO AKTUÁLNÍ 01 CENTRÁLNÍ DATABÁZI
 *
 * =====================================================
 * DŮLEŽITÁ OPRAVA
 * =====================================================
 *
 * Aktuální 01 vrací objednávky jako OBJEKTY:
 *
 *   order.ORDER_ID
 *   order.CUSTOMER_ID
 *   order.JMENO_PRIJMENI
 *   order.EMAIL
 *   order.TELEFON
 *   order.VEHICLE_ID
 *   order.VOZIDLO
 *
 * Tato verze s tím pracuje správně.
 *
 * Navíc při skutečném zápisu:
 *
 *   1. vytvoří zákazníka přes 01
 *   2. získá CUSTOMER_ID
 *   3. propojí všechny bezpečně rozpoznané objednávky
 *   4. zapíše CUSTOMER_ID do objednávek přes 01
 *
 * Žádná vlastní databáze.
 * Žádný PropertiesService.
 *
 * =====================================================
 * MATCHING
 * =====================================================
 *
 * BEZPEČNÁ SHODA:
 *
 *  - stejný EMAIL
 *  - stejný TELEFON
 *  - stejný EMAIL + JMÉNO
 *  - stejný TELEFON + JMÉNO
 *
 * KONTROLA:
 *
 *  - stejné JMÉNO + stejné VOZIDLO = bezpečná shoda
 *  - pouze stejné JMÉNO = nespojovat
 *
 * Pouhé stejné jméno se nikdy automaticky nespojí.
 *
 *******************************************************/


const CUSTOMER_ID_HISTORY_V3 = Object.freeze({
  PREFIX: 'CUS-',
  ID_DIGITS: 6,
  MAX_LOG_ROWS: 200
});


/* =====================================================
 * 01. NÁHLED
 * ===================================================== */

function nahledCustomerIDHistorie() {

  const orders =
    customerIdHistoryV3GetOrders_();

  const result =
    customerIdHistoryV3BuildPlan_(
      orders
    );

  customerIdHistoryV3Log_(
    result
  );

  return {
    success: true,
    objednavky: orders.length,
    zakazniciVPlan: result.customers.length,
    jizSId: result.alreadyAssigned,
    bezpecneShody: result.safeMatches.length,
    noviZakaznici: result.newCustomers.length,
    keKontrole: result.review.length
  };
}


/* =====================================================
 * 02. SKUTEČNÝ ZÁPIS
 *
 * POZOR:
 * - vytvoří zákazníky v centrální DB 01
 * - propojí objednávky
 *
 * Před prvním spuštěním musí být náhled zkontrolovaný.
 * ===================================================== */

function doplnitCustomerIDHistorie() {

  const orders =
    customerIdHistoryV3GetOrders_();


  const result =
    customerIdHistoryV3BuildPlan_(
      orders
    );


  /*
   * Bezpečnost:
   * REVIEW případy se vůbec nezapisují.
   */
  const groupsToCreate = [];


  result.customerGroups.forEach(
    function(group) {

      if (
        group.hasReviewOnly
      ) {
        return;
      }


      if (
        group.customerId
      ) {
        return;
      }


      if (
        !group.records ||
        !group.records.length
      ) {
        return;
      }


      const first =
        group.records[0];


      groupsToCreate.push({

        groupKey:
          group.key,

        JMENO_PRIJMENI:
          first.nameOriginal,

        EMAIL:
          first.emailOriginal,

        TELEFON:
          first.phoneOriginal

      });

    }
  );


  /*
   * Všechny nové zákazníky vytvoříme
   * jedním hromadným voláním do 01.
   *
   * Žádné volání databaseCreateCustomer()
   * v cyklu = žádné opakované čekání na ScriptLock.
   */
  let createdCustomers = [];


  if (
    groupsToCreate.length
  ) {

    if (
      typeof databaseCreateCustomersBatch !==
      'function'
    ) {

      throw new Error(
        'V 01 Centrální databázi chybí databaseCreateCustomersBatch(). ' +
        'Nahraď 01 za verzi CUSTOMER_ID_BATCH_V2.'
      );

    }


    createdCustomers =
      databaseCreateCustomersBatch(
        groupsToCreate
      );

  }


  /*
   * Propojíme nově vytvořená ID
   * s příslušnými skupinami.
   */
  for (
    let i = 0;
    i < groupsToCreate.length;
    i++
  ) {

    const group =
      result.customerGroups.find(
        function(item) {

          return (
            item.key ===
            groupsToCreate[i].groupKey
          );

        }
      );


    if (!group) {
      continue;
    }


    const created =
      createdCustomers[i];


    if (!created) {
      continue;
    }


    group.customerId =
      created.CUSTOMER_ID;

  }


  /*
   * Připravíme všechny objednávky k zápisu.
   */
  const updates = [];


  result.plan.forEach(
    function(item) {

      if (
        item.type !== 'SAFE_MATCH' &&
        item.type !== 'NEW_CUSTOMER'
      ) {
        return;
      }


      const group =
        result.customerGroups.find(
          function(candidate) {

            return (
              candidate.key ===
              item.groupKey
            );

          }
        );


      if (
        !group ||
        !group.customerId
      ) {
        return;
      }


      updates.push({

        orderId:
          item.orderId,

        customerId:
          group.customerId

      });

    }
  );


  let updateResult = {
    updated: 0
  };


  if (
    updates.length
  ) {

    if (
      typeof databaseUpdateOrdersCustomerIdsBatch !==
      'function'
    ) {

      throw new Error(
        'V 01 Centrální databázi chybí ' +
        'databaseUpdateOrdersCustomerIdsBatch().'
      );

    }


    updateResult =
      databaseUpdateOrdersCustomerIdsBatch(
        updates
      );

  }


  Logger.log(
    '=========================================='
  );

  Logger.log(
    'CUSTOMER_ID HISTORIE – ZÁPIS HOTOV'
  );

  Logger.log(
    'OBJEDNÁVEK CELKEM: ' +
    orders.length
  );

  Logger.log(
    'NOVÉ / VYTVOŘENÉ ZÁKAZNICKÉ PROFILY: ' +
    groupsToCreate.length
  );

  Logger.log(
    'OBJEDNÁVEK PROPOJENO: ' +
    updateResult.updated
  );

  Logger.log(
    'KE KONTROLE / NEZAPSÁNO: ' +
    result.review.length
  );

  Logger.log(
    '=========================================='
  );


  return {

    success:
      true,

    totalOrders:
      orders.length,

    customersCreated:
      groupsToCreate.length,

    ordersLinked:
      updateResult.updated,

    review:
      result.review.length

  };

}


/* =====================================================
 * 03. NAČTENÍ OBJEDNÁVEK Z 01
 *
 * AKTUÁLNÍ 01 VRACÍ OBJEKTY.
 * ===================================================== */

function customerIdHistoryV3GetOrders_() {

  if (
    typeof databaseGetAllOrders !==
    'function'
  ) {

    throw new Error(
      'Chybí databaseGetAllOrders().'
    );
  }


  const raw =
    databaseGetAllOrders();


  if (!Array.isArray(raw)) {
    throw new Error(
      'databaseGetAllOrders() nevrátilo pole.'
    );
  }


  return raw
    .map(
      function(order, index) {

        return customerIdHistoryV3OrderToRecord_(
          order,
          index
        );
      }
    )
    .filter(
      function(record) {
        return !!record.orderId;
      }
    );
}


/* =====================================================
 * 04. PŘEVOD OBJEDNÁVKY NA INTERNÍ ZÁZNAM
 *
 * Podporuje OBJEKT i starší POLE.
 * ===================================================== */

function customerIdHistoryV3OrderToRecord_(
  order,
  index
) {

  if (!order) {
    return {
      index: index,
      orderId: ''
    };
  }


  /*
   * AKTUÁLNÍ 01 – OBJEKT.
   */
  if (
    !Array.isArray(order) &&
    typeof order === 'object'
  ) {

    return {
      index:
        index,

      orderId:
        customerIdHistoryV3Text_(
          order.ORDER_ID ||
          order.orderId ||
          order.id
        ),

      customerId:
        customerIdHistoryV3Text_(
          order.CUSTOMER_ID ||
          order.customerId
        ),

      name:
        customerIdHistoryV3NormalizeName_(
          order.JMENO_PRIJMENI ||
          order.jmenoPrijmeni ||
          order.name
        ),

      nameOriginal:
        customerIdHistoryV3Text_(
          order.JMENO_PRIJMENI ||
          order.jmenoPrijmeni ||
          order.name
        ),

      email:
        customerIdHistoryV3NormalizeEmail_(
          order.EMAIL ||
          order.email
        ),

      emailOriginal:
        customerIdHistoryV3Text_(
          order.EMAIL ||
          order.email
        ),

      phone:
        customerIdHistoryV3NormalizePhone_(
          order.TELEFON ||
          order.telefon ||
          order.phone
        ),

      phoneOriginal:
        customerIdHistoryV3Text_(
          order.TELEFON ||
          order.telefon ||
          order.phone
        ),

      vehicle:
        customerIdHistoryV3NormalizeVehicle_(
          order.VOZIDLO ||
          order.vozidlo ||
          order.vehicle
        ),

      vehicleOriginal:
        customerIdHistoryV3Text_(
          order.VOZIDLO ||
          order.vozidlo ||
          order.vehicle
        )
    };
  }


  /*
   * FALLBACK – POLE.
   */
  return {
    index:
      index,

    orderId:
      customerIdHistoryV3Text_(
        order[0]
      ),

    customerId:
      customerIdHistoryV3Text_(
        order[4]
      ),

    name:
      customerIdHistoryV3NormalizeName_(
        order[5]
      ),

    nameOriginal:
      customerIdHistoryV3Text_(
        order[5]
      ),

    email:
      customerIdHistoryV3NormalizeEmail_(
        order[6]
      ),

    emailOriginal:
      customerIdHistoryV3Text_(
        order[6]
      ),

    phone:
      customerIdHistoryV3NormalizePhone_(
        order[7]
      ),

    phoneOriginal:
      customerIdHistoryV3Text_(
        order[7]
      ),

    vehicle:
      customerIdHistoryV3NormalizeVehicle_(
        order[9]
      ),

    vehicleOriginal:
      customerIdHistoryV3Text_(
        order[9]
      )
  };
}


/* =====================================================
 * 05. VYTVOŘENÍ PLÁNU
 * ===================================================== */

function customerIdHistoryV3BuildPlan_(
  records
) {

  const customers = [];

  const customerGroups = [];

  /*
   * Interní pořadové číslo skupiny pro náhled.
   * Není to CUSTOMER_ID a nikam se neukládá.
   */
  let previewGroupNumber = 0;

  const plan = [];

  const safeMatches = [];

  const newCustomers = [];

  const review = [];

  let alreadyAssigned = 0;


  /*
   * ---------------------------------------------------
   * A) OBJEDNÁVKY, KTERÉ UŽ MAJÍ CUSTOMER_ID
   * ---------------------------------------------------
   */

  records.forEach(
    function(record) {

      if (!record.customerId) {
        return;
      }


      alreadyAssigned++;


      let group =
        customerGroups.find(
          function(item) {
            return (
              item.customerId ===
              record.customerId
            );
          }
        );


      if (!group) {

        group = {
          key:
            'ID:' +
            record.customerId,

          previewGroup:
            ++previewGroupNumber,

          customerId:
            record.customerId,

          records: [],

          hasReviewOnly:
            false,

          names: {},

          emails: {},

          phones: {},

          vehicles: {}
        };

        customerGroups.push(
          group
        );

        customers.push(
          group
        );
      }


      customerIdHistoryV3AddToGroup_(
        group,
        record
      );


      plan.push({
        orderId:
          record.orderId,

        customerId:
          record.customerId,

        previewGroup:
          group.previewGroup,

        type:
          'EXISTING_ID',

        groupKey:
          group.key
      });
    }
  );


  /*
   * ---------------------------------------------------
   * B) OBJEDNÁVKY BEZ CUSTOMER_ID
   * ---------------------------------------------------
   *
   * Zpracujeme je v pořadí.
   * Jakmile bezpečně najdeme zákazníka,
   * jeho další telefon/e-mail se přidá do
   * skupiny v paměti.
   */

  records.forEach(
    function(record) {

      if (record.customerId) {
        return;
      }


      const candidates =
        customerIdHistoryV3FindCandidates_(
          record,
          customerGroups
        );


      /*
       * ---------------------------------------------
       * ŽÁDNÝ KANDIDÁT
       * ---------------------------------------------
       */

      if (!candidates.length) {

        const group = {
          key:
            'NEW:' +
            String(
              customerGroups.length + 1
            ),

          previewGroup:
            ++previewGroupNumber,

          customerId:
            '',

          records: [],

          hasReviewOnly:
            false,

          names: {},

          emails: {},

          phones: {},

          vehicles: {}
        };


        customerIdHistoryV3AddToGroup_(
          group,
          record
        );


        customerGroups.push(
          group
        );

        customers.push(
          group
        );


        const item = {
          orderId:
            record.orderId,

          customerId:
            '',

          previewGroup:
            group.previewGroup,

          type:
            'NEW_CUSTOMER',

          groupKey:
            group.key,

          confidence:
            'NOVÝ ZÁKAZNÍK',

          reason:
            'Žádná shoda s dosud známým zákazníkem.',

          name:
            record.nameOriginal,

          email:
            record.emailOriginal,

          phone:
            record.phoneOriginal,

          vehicle:
            record.vehicleOriginal
        };


        plan.push(item);
        newCustomers.push(item);

        return;
      }


      const best =
        candidates[0];

      const second =
        candidates[1] || null;


      /*
       * ---------------------------------------------
       * VÍCE STEJNĚ SILNÝCH KANDIDÁTŮ
       * ---------------------------------------------
       */

      if (
        second &&
        second.score === best.score
      ) {

        const item = {
          orderId:
            record.orderId,

          customerId:
            '',

          previewGroup:
            '',

          type:
            'REVIEW',

          groupKey:
            '',

          confidence:
            'KONTROLA',

          reason:
            'Více zákazníků má stejně silnou shodu.',

          name:
            record.nameOriginal,

          email:
            record.emailOriginal,

          phone:
            record.phoneOriginal,

          vehicle:
            record.vehicleOriginal,

          candidates:
            candidates
              .slice(0, 5)
              .map(
                function(candidate) {
                  return {
                    groupKey:
                      candidate.group.key,

                    customerId:
                      candidate.group.customerId,

                    score:
                      candidate.score,

                    reason:
                      candidate.reason
                  };
                }
              )
        };


        plan.push(item);
        review.push(item);

        return;
      }


      /*
       * ---------------------------------------------
       * POUZE JMÉNO + VOZIDLO
       * ---------------------------------------------
       *
       * Necháváme ke kontrole.
       */

      if (
        best.matchType ===
        'NAME_VEHICLE'
      ) {

        /*
         * Stejné jméno + stejné vozidlo
         * nyní považujeme za bezpečnou historickou shodu.
         *
         * Telefon nebo e-mail se mohou v historii měnit.
         * Nové telefonní číslo / e-mail se tímto přidá
         * do stejného zákaznického profilu v paměti.
         */

        customerIdHistoryV3AddToGroup_(
          best.group,
          record
        );

        const item = {
          orderId:
            record.orderId,

          customerId:
            best.group.customerId,

          type:
            'SAFE_MATCH',

          groupKey:
            best.group.key,

          confidence:
            'SHODA JMÉNO + VOZIDLO',

          reason:
            best.reason,

          name:
            record.nameOriginal,

          email:
            record.emailOriginal,

          phone:
            record.phoneOriginal,

          vehicle:
            record.vehicleOriginal
        };

        plan.push(item);
        safeMatches.push(item);

        return;
      }


      /*
       * ---------------------------------------------
       * BEZPEČNÁ SHODA
       * ---------------------------------------------
       */

      customerIdHistoryV3AddToGroup_(
        best.group,
        record
      );


      const item = {
        orderId:
          record.orderId,

        customerId:
          best.group.customerId,

        previewGroup:
          best.group.previewGroup,

        type:
          'SAFE_MATCH',

        groupKey:
          best.group.key,

        confidence:
          best.confidence,

        reason:
          best.reason,

        name:
          record.nameOriginal,

        email:
          record.emailOriginal,

        phone:
          record.phoneOriginal,

        vehicle:
          record.vehicleOriginal
      };


      plan.push(item);
      safeMatches.push(item);
    }
  );


  return {
    customers:
      customers,

    customerGroups:
      customerGroups,

    plan:
      plan,

    safeMatches:
      safeMatches,

    newCustomers:
      newCustomers,

    review:
      review,

    alreadyAssigned:
      alreadyAssigned
  };
}


/* =====================================================
 * 06. HLEDÁNÍ KANDIDÁTŮ
 * ===================================================== */

function customerIdHistoryV3FindCandidates_(
  record,
  groups
) {

  const result = [];


  groups.forEach(
    function(group) {

      let score = 0;

      const reasons = [];

      let matchType =
        'OTHER';


      const sameEmail =
        Boolean(
          record.email &&
          group.emails[record.email]
        );


      const samePhone =
        Boolean(
          record.phone &&
          group.phones[record.phone]
        );


      const sameName =
        Boolean(
          record.name &&
          group.names[record.name]
        );


      const sameVehicle =
        Boolean(
          record.vehicle &&
          group.vehicles[record.vehicle]
        );


      /*
       * EMAIL
       */
      if (sameEmail) {

        score += 100;

        reasons.push(
          'stejný e-mail'
        );

        matchType =
          'EMAIL';
      }


      /*
       * TELEFON
       */
      if (samePhone) {

        score += 100;

        reasons.push(
          'stejný telefon'
        );

        matchType =
          'PHONE';
      }


      /*
       * JMÉNO
       */
      if (sameName) {

        score += 30;

        reasons.push(
          'stejné jméno'
        );
      }


      /*
       * VOZIDLO
       */
      if (sameVehicle) {

        score += 30;

        reasons.push(
          'stejné vozidlo'
        );
      }


      if (!score) {
        return;
      }


      /*
       * Pouhé jméno:
       * nikdy nestačí.
       */
      if (
        score === 30
      ) {
        return;
      }


      /*
       * Výchozí úroveň jistoty nastavujeme
       * PŘED jejím prvním použitím.
       */
      let confidence =
        'KONTROLA';


      /*
       * Jméno + stejné vozidlo:
       * bezpečná historická shoda.
       */
      if (
        score === 60
      ) {

        matchType =
          'NAME_VEHICLE';

        confidence =
          'SHODA JMÉNO + VOZIDLO';
      }


      if (
        sameEmail &&
        samePhone
      ) {

        confidence =
          'VELMI SILNÁ SHODA';

      } else if (
        sameEmail &&
        sameName
      ) {

        confidence =
          'SILNÁ SHODA';

      } else if (
        samePhone &&
        sameName
      ) {

        confidence =
          'SILNÁ SHODA';

      } else if (
        sameEmail
      ) {

        confidence =
          'SILNÁ SHODA';

      } else if (
        samePhone
      ) {

        confidence =
          'SILNÁ SHODA';

      } else if (
        sameName &&
        sameVehicle
      ) {

        confidence =
          'SHODA JMÉNO + VOZIDLO';
      }


      result.push({
        group:
          group,

        score:
          score,

        confidence:
          confidence,

        matchType:
          matchType,

        reason:
          reasons.join(
            ' + '
          )
      });
    }
  );


  result.sort(
    function(a, b) {

      return (
        b.score -
        a.score
      );
    }
  );


  return result;
}


/* =====================================================
 * 07. PŘIDÁNÍ ZÁZNAMU DO SKUPINY
 *
 * POUZE V PAMĚTI.
 * ===================================================== */

function customerIdHistoryV3AddToGroup_(
  group,
  record
) {

  group.records.push(
    record
  );


  if (record.name) {

    group.names[
      record.name
    ] = true;
  }


  if (record.email) {

    group.emails[
      record.email
    ] = true;
  }


  if (record.phone) {

    group.phones[
      record.phone
    ] = true;
  }


  if (record.vehicle) {

    group.vehicles[
      record.vehicle
    ] = true;
  }
}


/* =====================================================
 * 08. NORMALIZACE JMÉNA
 * ===================================================== */

function customerIdHistoryV3NormalizeName_(
  value
) {

  return customerIdHistoryV3Text_(
    value
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}


/* =====================================================
 * 09. NORMALIZACE EMAILU
 * ===================================================== */

function customerIdHistoryV3NormalizeEmail_(
  value
) {

  return customerIdHistoryV3Text_(
    value
  )
    .toLowerCase()
    .replace(
      /\s+/g,
      ''
    );
}


/* =====================================================
 * 10. NORMALIZACE TELEFONU
 * ===================================================== */

function customerIdHistoryV3NormalizePhone_(
  value
) {

  let phone =
    customerIdHistoryV3Text_(
      value
    );


  if (!phone) {
    return '';
  }


  phone =
    phone.replace(
      /\D/g,
      ''
    );


  if (
    phone.length === 9
  ) {

    return '420' + phone;
  }


  if (
    phone.length === 12 &&
    phone.indexOf('420') === 0
  ) {

    return phone;
  }


  return phone;
}


/* =====================================================
 * 11. NORMALIZACE VOZIDLA
 * ===================================================== */

function customerIdHistoryV3NormalizeVehicle_(
  value
) {

  return customerIdHistoryV3Text_(
    value
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ''
    );
}


/* =====================================================
 * 12. TEXT
 * ===================================================== */

function customerIdHistoryV3Text_(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return '';
  }


  return String(
    value
  ).trim();
}


/* =====================================================
 * 13. TEST NAPOJENÍ
 * ===================================================== */

function testDoplneniCustomerIDConnection() {

  const result = {

    databaseGetAllOrders:
      typeof databaseGetAllOrders ===
      'function',

    databaseCreateCustomer:
      typeof databaseCreateCustomer ===
      'function',

    databaseUpdateOrder:
      typeof databaseUpdateOrder ===
      'function',

    databaseGenerateCustomerId:
      typeof databaseGenerateCustomerId_ ===
      'function'
  };


  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );


  return result;
}


/* =====================================================
 * 14. TEST JEDNÉHO ZÁZNAMU
 *
 * Pouze ukáže, jak 01 vrací objednávku.
 * NIC NEZAPISUJE.
 * ===================================================== */

function testCustomerIDPrvniObjednavka() {

  const orders =
    databaseGetAllOrders();


  if (!orders.length) {

    throw new Error(
      'Centrální databáze nemá žádné objednávky.'
    );
  }


  const order =
    orders[0];


  const result = {

    typ:
      Array.isArray(order)
        ? 'POLE'
        : typeof order,

    orderId:
      order.ORDER_ID ||
      order[0] ||
      '',

    customerId:
      order.CUSTOMER_ID ||
      order[4] ||
      '',

    name:
      order.JMENO_PRIJMENI ||
      order[5] ||
      '',

    email:
      order.EMAIL ||
      order[6] ||
      '',

    phone:
      order.TELEFON ||
      order[7] ||
      '',

    vehicle:
      order.VOZIDLO ||
      order[9] ||
      ''
  };


  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );


  return result;
}


/* =====================================================
 * 15. LOG NÁHLEDU
 * ===================================================== */

function customerIdHistoryV3Log_(
  result
) {

  Logger.log(
    '=========================================='
  );

  Logger.log(
    'CUSTOMER_ID HISTORIE V3 – NÁHLED'
  );

  Logger.log(
    '=========================================='
  );

  Logger.log(
    'OBJEDNÁVEK: ' +
    result.plan.length
  );

  Logger.log(
    'JIŽ S CUSTOMER_ID: ' +
    result.alreadyAssigned
  );

  Logger.log(
    'BEZPEČNÉ SHODY: ' +
    result.safeMatches.length
  );

  Logger.log(
    'NOVÍ ZÁKAZNÍCI: ' +
    result.newCustomers.length
  );

  Logger.log(
    'KE KONTROLE: ' +
    result.review.length
  );

  Logger.log(
    '------------------------------------------'
  );


  result.plan
    .slice(
      0,
      CUSTOMER_ID_HISTORY_V3.MAX_LOG_ROWS
    )
    .forEach(
      function(item) {

        if (
          item.type ===
          'REVIEW'
        ) {

          Logger.log(
            '⚠️ KONTROLA | ' +
            item.orderId +
            ' | ' +
            item.name +
            ' | ' +
            item.email +
            ' | ' +
            item.phone +
            ' | ' +
            item.vehicle +
            ' | ' +
            item.reason
          );

          if (
            item.candidates
          ) {

            item.candidates.forEach(
              function(candidate) {

                Logger.log(
                  '   → ' +
                  candidate.customerId +
                  ' | ' +
                  candidate.score +
                  ' | ' +
                  candidate.reason
                );

              }
            );
          }

          return;
        }


        const idText =
          item.customerId ||
          (
            item.type === 'NEW_CUSTOMER'
              ? '[NOVÝ ZÁKAZNÍK – ID VYTVOŘIT 1×]'
              : '[BEZ ID]'
          );

        const groupText =
          item.previewGroup
            ? 'SKUPINA #' + item.previewGroup
            : 'BEZ SKUPINY';

        Logger.log(
          item.orderId +
          ' → ' +
          idText +
          ' | ' +
          groupText +
          ' | ' +
          item.confidence +
          ' | ' +
          (
            item.reason ||
            ''
          )
        );
      }
    );


  if (
    result.plan.length >
    CUSTOMER_ID_HISTORY_V3.MAX_LOG_ROWS
  ) {

    Logger.log(
      '... další objednávky nejsou v logu zobrazené.'
    );
  }


  /*
   * Souhrn skupin:
   * ukáže, kolik objednávek patří pod jednoho zákazníka.
   */
  const groupCounts = {};

  result.plan.forEach(
    function(item) {

      if (!item.previewGroup) {
        return;
      }

      if (!groupCounts[item.previewGroup]) {
        groupCounts[item.previewGroup] = 0;
      }

      groupCounts[item.previewGroup]++;
    }
  );

  Logger.log(
    '------------------------------------------'
  );

  Logger.log(
    'SKUPINY ZÁKAZNÍKŮ:'
  );

  Object.keys(groupCounts)
    .forEach(
      function(groupNumber) {

        Logger.log(
          'SKUPINA #' +
          groupNumber +
          ' → ' +
          groupCounts[groupNumber] +
          ' objednávek'
        );

      }
    );

  Logger.log(
    '=========================================='
  );
}


/* =====================================================
 * KONEC MODULU V7
 * ===================================================== */

