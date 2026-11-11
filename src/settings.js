/**
 * The settings overlay (gear button, top right): the re-rack button, the language flags and the
 * controls. While it is open the game keys do nothing and Esc, the cross or a click outside the
 * card close it.
 */

/**
 * @param {() => void} onRerack — the player asked for a new rack
 * @param {() => { name: string, money: string, multi: boolean, seated: boolean, seatFree: boolean, running: boolean }} getInfo — what the panel shows
 *   (`multi`: the account buttons and the table buttons; `seated`: he sits at the table; `seatFree`: a seat is free; `running`: a game is on)
 * @param {{ leave: () => void, sit: () => void }} table — get up from the table (a game that runs is lost, so it is asked first), sit down at a free seat
 */
export function createSettings(onRerack, getInfo, table) {
  const root = document.getElementById("settings");
  const opener = document.getElementById("btn-settings");
  let open = false;
  let info = null;
  const leaveButton = document.getElementById("settings-leave");
  const sitButton = document.getElementById("settings-sit");
  const ask = document.getElementById("settings-leave-ask");

  const show = () => {
    info = getInfo();
    document.getElementById("settings-table").hidden = !info.multi || !(info.seated || info.seatFree);
    leaveButton.hidden = !info.seated;
    sitButton.hidden = info.seated || !info.seatFree;
    ask.hidden = true;
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
  // the table: get up (asked first while a game runs: it is lost), or sit down again
  leaveButton.addEventListener("click", () => {
    if (info.running) {
      leaveButton.hidden = true;
      ask.hidden = false;
      return;
    }
    table.leave();
    hide();
  });
  document.getElementById("settings-leave-yes").addEventListener("click", () => {
    table.leave();
    hide();
  });
  document.getElementById("settings-leave-no").addEventListener("click", () => {
    ask.hidden = true;
    leaveButton.hidden = false;
  });
  sitButton.addEventListener("click", () => {
    table.sit();
    hide();
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
