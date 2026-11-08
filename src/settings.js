/**
 * The settings overlay (gear button, top right): the re-rack button, the language flags and the
 * controls. While it is open the game keys do nothing and Esc, the cross or a click outside the
 * card close it.
 */

/** @param {() => void} onRerack — the player asked for a new rack */
export function createSettings(onRerack) {
  const root = document.getElementById("settings");
  const opener = document.getElementById("btn-settings");
  let open = false;

  const show = () => {
    open = true;
    root.hidden = false;
    if (document.pointerLockElement) document.exitPointerLock(); // the free camera holds the mouse
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
  root.addEventListener("pointerdown", (e) => {
    if (e.target === root) hide(); // a click outside the card
  });
  window.addEventListener("keydown", (e) => {
    if (open && e.code === "Escape") hide();
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    hide();
    onRerack();
  });

  return { isOpen: () => open };
}
