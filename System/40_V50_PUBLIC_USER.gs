/**
 * PERFECT V50 – kompatibilita veřejného profilu uživatele.
 * Obnova původní implementace z Webbackend_V26.
 *
 * V Apps Scriptu vytvoř NOVÝ .gs soubor (např. 40_V50_PUBLIC_USER)
 * a vlož do něj tento obsah. Nepřepisuj PERFECT_Upgrade40 ani Webbackend.
 *
 * Funkci přidej pouze tehdy, pokud v projektu ještě není definována
 * perfect40BasePublicUser_. Diagnostika má schválně veřejné jméno bez koncového _.
 */
function perfect40BasePublicUser_(u) {
  if (!u || typeof u !== 'object') {
    throw new Error('Chybí údaje přihlášeného uživatele.');
  }
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    surname: u.surname,
    role: u.role,
    mustChangePassword: !!u.mustChangePassword
  };
}

/**
 * Bezpečná diagnostika definic bez přístupu k účtům a datům.
 * Spusť ji v editoru a případně pošli výsledek protokolu.
 */
function perfectV50CheckLoginDependencies() {
  var checks = {
    perfect40BasePublicUser_: typeof perfect40BasePublicUser_ === 'function',
    perfect40PublicUser_: typeof perfect40PublicUser_ === 'function',
    perfectRepairPublicUser_: typeof perfectRepairPublicUser_ === 'function',
    perfect40Caps_: typeof perfect40Caps_ === 'function',
    perfect40Super_: typeof perfect40Super_ === 'function',
    perfectRepairUsers_: typeof perfectRepairUsers_ === 'function',
    perfect40Enter_: typeof perfect40Enter_ === 'function',
    databaseSecurity40Audit_: typeof databaseSecurity40Audit_ === 'function',
    databaseSecurity40AuditSheet_: typeof databaseSecurity40AuditSheet_ === 'function',
    perfect43HideOwners_: typeof perfect43HideOwners_ === 'function',
    perfect43PricesGuard_: typeof perfect43PricesGuard_ === 'function',
    perfect43Actor_: typeof perfect43Actor_ !== 'undefined'
  };
  var missing = Object.keys(checks).filter(function(k) { return !checks[k]; });
  var report = {version: 'V50', checks: checks, missing: missing};
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}
