/** PERFECT V50: nepovinná jednorázová konfigurace ikonky karty prohlížeče. */
function perfectV50NastavitIkonuProhlizece() {
  const logo = "https://res.cloudinary.com/ecxcwvyr/image/upload/v1792400548/Leskl%C3%A9_logo_Automy%C4%8Dka_Perfect.png";
  PropertiesService.getScriptProperties().setProperty('PERFECT_FAVICON_URL', logo);
  Logger.log('PERFECT_FAVICON_URL nastaven. Pro zobrazení aktualizujte webové nasazení.');
  return logo;
}
