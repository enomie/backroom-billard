/**
 * The player's money (shown by the match panel at the top: `onChange` is called with every new balance), plus short
 * messages ("toast") for purchases.
 */
import { START_MONEY, TOAST_SECONDS } from "./shop-constants.js";
import { t } from "./i18n/index.js";
import { loadProfile, saveMoney } from "./profile-store.js";

const format = (amount) => "$ " + amount.toLocaleString("en-US");

/** @param {(balance: number) => void} onChange */
export function createWallet(onChange) {
  let balance = loadProfile()?.money ?? START_MONEY; // the money is kept between the visits
  const toast = document.getElementById("toast");
  let toastTimer = 0;
  const render = () => onChange(balance);
  render();

  return {
    get balance() {
      return balance;
    },
    canAfford: (price) => balance >= price,
    /** Pay `price`; returns false (and pays nothing) if there is not enough money. */
    spend(price) {
      if (balance < price) return false;
      balance -= price;
      render();
      saveMoney(balance);
      return true;
    },
    /** Set the balance (the welcome screen has paid for the first drink and the first pack). */
    setBalance(amount) {
      balance = amount;
      render();
      saveMoney(balance);
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
