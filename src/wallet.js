/**
 * The player's money and its display (top left), plus short messages ("toast") for purchases.
 */
import { START_MONEY, TOAST_SECONDS } from "./shop-constants.js";
import { t } from "./i18n/index.js";

const format = (amount) => "$ " + amount.toLocaleString("en-US");

export function createWallet() {
  let balance = START_MONEY;
  const display = document.getElementById("wallet-amount");
  const toast = document.getElementById("toast");
  let toastTimer = 0;
  const render = () => {
    display.textContent = format(balance);
  };
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
      return true;
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
