/**
 * The countries a player can play for: only those with a round flag in public/flags/{code}.svg.
 * [ISO code, German name, English name]. More countries: add the flag file and a line here.
 * The source data is in _docs/countries/ (info only). See _docs/welcome-screen.md.
 */
export const DEFAULT_COUNTRY = "at";

/** @type {[string, string, string][]} */
export const COUNTRIES = [
  ["ar", "Argentinien", "Argentina"],
  ["au", "Australien", "Australia"],
  ["at", "Österreich", "Austria"],
  ["be", "Belgien", "Belgium"],
  ["br", "Brasilien", "Brazil"],
  ["ca", "Kanada", "Canada"],
  ["co", "Kolumbien", "Colombia"],
  ["hr", "Kroatien", "Croatia"],
  ["cz", "Tschechien", "Czech Republic"],
  ["dk", "Dänemark", "Denmark"],
  ["ee", "Estland", "Estonia"],
  ["fi", "Finnland", "Finland"],
  ["fr", "Frankreich", "France"],
  ["de", "Deutschland", "Germany"],
  ["gr", "Griechenland", "Greece"],
  ["hu", "Ungarn", "Hungary"],
  ["ie", "Irland", "Ireland"],
  ["il", "Israel", "Israel"],
  ["it", "Italien", "Italy"],
  ["jp", "Japan", "Japan"],
  ["my", "Malaysia", "Malaysia"],
  ["mx", "Mexiko", "Mexico"],
  ["nl", "Niederlande", "Netherlands"],
  ["nz", "Neuseeland", "New Zealand"],
  ["no", "Norwegen", "Norway"],
  ["pe", "Peru", "Peru"],
  ["ph", "Philippinen", "Philippines"],
  ["pl", "Polen", "Poland"],
  ["pt", "Portugal", "Portugal"],
  ["ro", "Rumänien", "Romania"],
  ["sg", "Singapur", "Singapore"],
  ["sk", "Slowakei", "Slovakia"],
  ["si", "Slowenien", "Slovenia"],
  ["za", "Südafrika", "South Africa"],
  ["kr", "Südkorea", "South Korea"],
  ["es", "Spanien", "Spain"],
  ["se", "Schweden", "Sweden"],
  ["ch", "Schweiz", "Switzerland"],
  ["tw", "Taiwan", "Taiwan"],
  ["th", "Thailand", "Thailand"],
  ["gb", "Grossbritannien", "United Kingdom"],
  ["us", "USA", "United States"],
];

/** The name of a country in a language ("de" or "en"; any other: English). */
export function countryName(code, language) {
  const row = COUNTRIES.find((c) => c[0] === code);
  return row ? (language === "de" ? row[1] : row[2]) : "";
}

/** True if the code is one of the countries. */
export const isCountry = (code) => COUNTRIES.some((c) => c[0] === code);

/** The path of the round flag (relative to the page). */
export const flagUrl = (code) => `./flags/${code}.svg`;
