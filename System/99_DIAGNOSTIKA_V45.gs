function perfectDiagnostikaV45() {
  var names = [
    'doGet',
    'perfect40Original_doGet_',
    'perfectDetail44List',
    'perfectDetail44Save',
    'perfectSecurity45Overview',
    'databaseDetail44Save_',
    'databaseDetail44MediaSave_',
    'generateOrderId',
    'perfect40Enter_'
  ];

  var result = names.map(function(name) {
    return name + ': ' +
      (typeof globalThis[name] === 'function'
        ? 'OK'
        : 'CHYBÍ');
  });

  Logger.log(result.join('\n'));
  return result.join('\n');
}
function perfectTestWebOutput45() {
  var output = perfect40Original_doGet_();

  Logger.log('Typ: ' + typeof output);

  Logger.log(
    'Má getContent(): ' +
    (output && typeof output.getContent === 'function')
  );

  Logger.log(
    'Preview wrapper existuje: ' +
    (typeof perfectPreview41Wrap_ === 'function')
  );

  if (!output || typeof output.getContent !== 'function') {
    Logger.log('CHYBA: doGet nevrací HTML výstup.');
    return 'NEPLATNY_HTML_VYSTUP';
  }

  var html = output.getContent();

  Logger.log('Délka HTML: ' + html.length);
  Logger.log('HTML výstup je připraven.');

  return 'TEST_OK';
}