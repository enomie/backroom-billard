/**
 * Money and prices ($). The player starts with 15,000 $ play money (_docs/game-concept.md).
 */
export const START_MONEY = 15000;
/** A new pack of cigarettes is bought automatically (and paid) when the pack is empty. */
export const PACK_PRICE = 75;
/** The menu: what a drink costs (the same prices stand in spacetime/src/index.ts: change both). `kind` is the glass kind (glasses.js), `key` the i18n key of its name. */
export const DRINK_MENU = [
  { kind: "beer", key: "menu.beer", price: 8 },
  { kind: "wine-red", key: "menu.redWine", price: 14 },
  { kind: "wine-white", key: "menu.whiteWine", price: 14 },
  { kind: "champagne", key: "menu.champagne", price: 22 },
  { kind: "whiskey", key: "menu.whiskey", price: 18 },
  { kind: "cognac", key: "menu.cognac", price: 24 },
  { kind: "vodka", key: "menu.vodka", price: 16 },
  { kind: "gin-tonic", key: "menu.ginTonic", price: 15 },
  { kind: "white-russian", key: "menu.whiteRussian", price: 16 },
  { kind: "cocktail", key: "menu.cocktail", price: 17 },
];
/** How long a message ("new pack, −75 $") stays on the screen (s). */
export const TOAST_SECONDS = 2.5;
