/**
 * The settings overlay (gear button, top right): the re-rack button, the language flags and the
 * controls. While it is open the game keys do nothing and Esc, the cross or a click outside the
 * card close it.
 */

/**
 * @param {() => void} onRerack — the player asked for a new rack
 * @param {() => { name: string, money: string }} getInfo — what the top of the panel shows
 */
export function createSettings(onRerack, getInfo) {
  const root = document.getElementById("settings");
  const opener = document.getElementById("btn-settings");
  let open = false;

  const show = () => {
    const info = getInfo();
    document.getElementById("settings-name").textContent = info.name;
    document.getElementById("settings-money").textContent = info.money;
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
  document.getElementById("btn-reset").addEventListener("click", () => {
    hide();
    onRerack();
  });

  return { isOpen: () => open };
}
