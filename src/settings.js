/**
 * The settings overlay (gear button, top right): the re-rack button, the language flags and the
 * controls. While it is open the game keys do nothing and Esc, the cross or a click outside the
 * card close it.
 */

/**
 * @param {() => void} onRerack — the player asked for a new rack
 * @param {() => { name: string, money: string, multi: boolean }} getInfo — what the top of the panel shows (`multi`: the account buttons)
 */
export function createSettings(onRerack, getInfo) {
  const root = document.getElementById("settings");
  const opener = document.getElementById("btn-settings");
  let open = false;

  const show = () => {
    const info = getInfo();
    document.getElementById("settings-name").textContent = info.name;
    document.getElementById("settings-money").textContent = info.money;
    document.getElementById("settings-account").hidden = !info.multi;
    document.getElementById("settings-soon").hidden = true;
    open = true;
    root.hidden = false;
    document.getElementById("settings-close").focus();
  };
  const hide = () => {
    open = false;
    root.hidden = true;
    opener.focus({ preventScroll: true });
    opener.blur(); // so that a key such as E does not press the button again
  };

  opener.addEventListener("click", show);
  document.getElementById("settings-close").addEventListener("click", hide);
  // a click or touch anywhere outside the card closes it (and does nothing else)
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!open || e.target.closest(".settings__card")) return;
      e.stopPropagation();
      e.preventDefault();
      hide();
    },
    true
  );
  window.addEventListener("keydown", (e) => {
    if (open && e.code === "Escape") hide();
  });
  // buying play money and changing name or face will be paid with real money later: for now they only say so
  for (const id of ["settings-buy", "settings-change"]) {
    document.getElementById(id).addEventListener("click", () => {
      document.getElementById("settings-soon").hidden = false;
    });
  }
  document.getElementById("btn-reset").addEventListener("click", () => {
    hide();
    onRerack();
  });

  return { isOpen: () => open };
}
