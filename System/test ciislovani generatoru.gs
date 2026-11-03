
function testGenerateOrderIdReadOnly() {
  if (typeof databaseGetAllOrders !== 'function') {
    throw new Error('Chybí funkce databaseGetAllOrders().');
  }

  if (typeof generateOrderId !== 'function') {
    throw new Error('Chybí funkce generateOrderId().');
  }

  const orders = databaseGetAllOrders() || [];
  const date = new Date();
  const proposedId = generateOrderId(date);

  const result = {
    success: Boolean(proposedId),
    existingOrdersCount: orders.length,
    testDate: Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      'dd.MM.yyyy'
    ),
    proposedNextOrderId: String(proposedId || ''),
    wroteToDatabase: false
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
