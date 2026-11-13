/** The panel above the table: who plays (name, flag, money), the stake, the pocketed balls of each, and the clock of the turn. */
import { t } from "./i18n/index.js";
import { ballDot } from "./balls.js";
import { isCountry, flagUrl } from "./country-list.js";
import { TURN_LIMIT_SECONDS } from "./multiplayer-constants.js";

const money = (amount) => "$ " + amount.toLocaleString("en-US");

/** Two guests sit at the table (multiplayer). */
const bothSeated = (m) => m.mode === "multi" && !!(m.names[0].name && m.names[1].name);

/**
 * Draw the panel above the table.
 * @param {{ mode: "single" | "multi" | null, me: { name: string, country: string }, balance: number,
 *   names: { name: string, country: string, money: number }[], pockets: { ball: number, seat: number }[],
 *   table: { stake: number }, mySide: 0 | 1 | null, game: { running: boolean, turnSeat: number } }} m
 */
export function renderMatchPanel(m) {
  const panel = document.getElementById("match");
  panel.hidden = m.mode === null;
  if (m.mode === null) return;
  const two = bothSeated(m);
  const alone = m.mode === "multi" && !two;
  panel.classList.toggle("match--single", m.mode === "single");
  panel.classList.toggle("match--two", two);
  document.getElementById("pocketed-balls").hidden = two; // (the common list for one player; two have one each)
  const stake = document.getElementById("match-stake");
  stake.hidden = !(two && m.table.stake > 0);
  stake.textContent = t("match.stake", { amount: money(m.table.stake) }); // (over the VS)
  // who stands where: (name, country, money) of the left and of the right one
  const mySeat = m.mySide === 1 ? 1 : m.mySide === 0 ? 2 : 0;
  const entry = (seat) => ({ ...m.names[seat - 1], money: seat === mySeat ? m.balance : m.names[seat - 1].money });
  const left = two ? entry(1) : { ...m.me, name: m.mode === "single" ? t("mode.single") : m.me.name, money: m.balance };
  const right = two ? entry(2) : alone ? { name: t("room.waiting"), country: "", money: null } : null;
  [left, right].forEach((who, i) => {
    const n = i + 1;
    document.getElementById(`match-name-${n}`).textContent = who?.name ?? "";
    const flag = document.getElementById(`match-flag-${n}`);
    flag.hidden = !(who?.country && isCountry(who.country));
    if (!flag.hidden) flag.src = flagUrl(who.country);
    document.getElementById(`match-money-${n}`).textContent = who && who.money !== null ? money(who.money) : "";
    document.getElementById(`match-name-${n}`).parentElement.classList.toggle("is-up", two && m.game.running && m.game.turnSeat === n); // (a rounded border: his turn)
    document.getElementById(`match-name-${n}`).classList.toggle("is-waiting", who === right && alone);
    document.getElementById(`match-balls-${n}`).replaceChildren(
      ...(two ? m.pockets : [])
        .filter((p) => p.seat === n)
        .sort((a, b) => a.ball - b.ball)
        .map((p) => {
          const dot = ballDot(p.ball);
          dot.title = t("pocketed.ball", { n: p.ball });
          return dot;
        })
    );
  });
}

/**
 * The countdown next to the name of the one who is up: 3 minutes from the start of his turn (the database's time, as far as this browser can
 * tell); not while his shot is on its way. Red and blinking in the last 30 seconds. At zero the database ends the game.
 * @param {{ startedAt: number, running: boolean } | null} clock
 * @param {number} serverNow — the database's time now (ms)
 */
export function renderTurnClock(m, clock, serverNow) {
  const two = bothSeated(m);
  const left = clock && two && m.game.running && !clock.running ? Math.max(0, TURN_LIMIT_SECONDS - (serverNow - clock.startedAt) / 1000) : null;
  [1, 2].forEach((seat) => {
    const el = document.getElementById(`match-clock-${seat}`);
    const show = left !== null && m.game.turnSeat === seat;
    el.hidden = !show;
    if (!show) return;
    const seconds = Math.ceil(left);
    const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    if (el.textContent !== text) el.textContent = text;
    el.classList.toggle("is-low", seconds <= 30);
  });
}
