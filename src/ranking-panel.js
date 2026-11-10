/**
 * The world ranking in the settings panel (multiplayer): the richest hundred by money; if the player is not among them, a line with
 * "…" and below it his own line with his place. The database works the list out when asked (at most every 5 s). See _docs/multiplayer.md.
 */
import { t } from "./i18n/index.js";
import { flagUrl, isCountry } from "./country-list.js";
import { RANKING_REFRESH_SECONDS, RANKING_SIZE } from "./ranking-constants.js";

const money = (amount) => "$ " + amount.toLocaleString("en-US");

/**
 * @param {() => void} refresh — ask the database to work the ranking out
 * @param {() => { name: string, country: string }} getMe — this guest's name and country (his own line)
 */
export function createRankingPanel(refresh, getMe) {
  const box = document.getElementById("ranking-box");
  const list = document.getElementById("ranking-list");
  const settings = document.getElementById("settings");
  let rows = []; // [{ place, name, country, money }]
  let mine = null; // { place, money } | null
  let timer = 0;

  const line = (place, name, country, amount, isMe) => {
    const li = document.createElement("li");
    li.className = "ranking__row" + (isMe ? " is-me" : "");
    const placeEl = Object.assign(document.createElement("span"), { className: "ranking__place", textContent: String(place) });
    const flag = document.createElement("img");
    flag.className = "ranking__flag";
    flag.alt = "";
    flag.width = flag.height = 16;
    if (isCountry(country)) flag.src = flagUrl(country);
    else flag.hidden = true;
    const nameEl = Object.assign(document.createElement("span"), { className: "ranking__name", textContent: name });
    const amountEl = Object.assign(document.createElement("span"), { className: "ranking__money", textContent: money(amount) });
    li.append(placeEl, flag, nameEl, amountEl);
    return li;
  };

  const render = () => {
    if (box.hidden) return;
    const items = rows.map((r) => line(r.place, r.name, r.country, r.money, mine?.place === r.place));
    if (mine && mine.place > RANKING_SIZE) {
      const me = getMe();
      items.push(Object.assign(document.createElement("li"), { className: "ranking__gap", textContent: "…" }));
      items.push(line(mine.place, me.name, me.country, mine.money, true));
    }
    if (!items.length) items.push(Object.assign(document.createElement("li"), { className: "ranking__gap", textContent: t("ranking.loading") }));
    list.replaceChildren(...items);
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };
  const tick = () => {
    if (settings.hidden || box.hidden) return stop(); // (the panel is closed: no more asking)
    refresh();
  };

  return {
    /** The button: show or hide the list; while it is shown the database is asked every few seconds. */
    toggle() {
      box.hidden = !box.hidden;
      if (box.hidden) return stop();
      render();
      refresh();
      timer = window.setInterval(tick, RANKING_REFRESH_SECONDS * 1000);
    },
    /** The list from the database. */
    setData(next) {
      rows = next.rows;
      mine = next.mine;
      render();
    },
    /** The language changed. */
    render,
  };
}
