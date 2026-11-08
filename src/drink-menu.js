/**
 * The drinks menu: a popover that asks what the player wants once a glass is empty. A click on a
 * drink buys it at once (the price is paid and the glass is replaced).
 */
import { DRINK_MENU } from "./shop-constants.js";
import { t, onLanguageChange } from "./i18n/index.js";

/**
 * @param {{ canAfford: (price: number) => boolean, format: (amount: number) => string }} wallet
 * @param {(item: { kind: string, price: number }) => void} onChoose
 */
export function createDrinkMenu(wallet, onChoose) {
  const root = document.getElementById("menu");
  const list = document.getElementById("menu-list");
  let open = false;

  const render = () => {
    list.replaceChildren(
      ...DRINK_MENU.map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "menu__item";
        button.disabled = !wallet.canAfford(item.price);
        const name = document.createElement("span");
        name.textContent = t(item.key);
        const price = document.createElement("span");
        price.className = "menu__price";
        price.textContent = wallet.format(item.price);
        button.append(name, price);
        button.addEventListener("click", () => {
          hide();
          onChoose(item);
        });
        return button;
      })
    );
  };
  const hide = () => {
    open = false;
    root.hidden = true;
  };
  root.addEventListener("pointerdown", (e) => {
    if (e.target === root) hide(); // a click outside the card closes the menu
  });
  window.addEventListener("keydown", (e) => {
    if (open && e.code === "Escape") hide();
  });
  onLanguageChange(() => open && render());

  return {
    isOpen: () => open,
    show() {
      open = true;
      render();
      root.hidden = false;
    },
  };
}
