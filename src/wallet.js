/**
 * The player's money (shown by the match panel at the top: `onChange` is called with every new balance), plus short
 * messages ("toast") for purchases.
 */
import { START_MONEY, TOAST_SECONDS } from "./shop-constants.js";
import { t } from "./i18n/index.js";
import { loadSingle, saveSingleMoney } from "./profile-store.js";

const format = (amount) => "$ " + amount.toLocaleString("en-US");

/** @param {(balance: number) => void} onChange */
export function createWallet(onChange) {
  let balance = loadSingle()?.money ?? START_MONEY; // the money is kept between the visits
  const toast = document.getElementById("toast");
  let toastTimer = 0;
  let buyAtServer = null; // multiplayer: the database counts the money; purchases are asked there ((item) => void)
  const render = () => onChange(balance);
  render();

  return {
    get balance() {
      return balance;
    },
    canAfford: (price) => balance >= price,
    /**
     * Pay `price` for `item` (a drink's glass kind, or "pack"); returns false (and pays nothing) if there is not enough money.
     * In multiplayer the money is shown at once and the database is asked (its answer sets the balance right).
     */
    spend(price, item) {
      if (balance < price) return false;
      balance -= price;
      render();
      if (buyAtServer) buyAtServer(item);
      else saveSingleMoney(balance);
      return true;
    },
    /** Set the balance (the welcome screen has paid for the first drink and the first pack). */
    setBalance(amount) {
      balance = amount;
      render();
      if (!buyAtServer) saveSingleMoney(balance);
    },
    /** Multiplayer: the money is the database's. `buy` asks it for a purchase; `setBalance` no longer writes the browser's money. */
    useServer(buy) {
      buyAtServer = buy;
    },
    /** Multiplayer: the balance as the database has it. */
    syncBalance(amount) {
      balance = amount;
      render();
    },
    /** A short message at the top of the screen; `key` is an i18n key. */
    say(key, params) {
      toast.textContent = t(key, params);
      toast.classList.add("is-visible");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), TOAST_SECONDS * 1000);
    },
    format,
  };
}
