/** Add this helper once. Replace existing doGet using NAPOJENI.md; do not add a second doGet. */
function perfectDesignInclude_(name) {
  var allowed = ['Design_Base','Design_Styles','Design_Assets','Design_UI'];
  if (allowed.indexOf(name) < 0) throw new Error('Neznámý designový soubor.');
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
