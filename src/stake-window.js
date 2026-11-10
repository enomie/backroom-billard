/**
 * The stake window (two at the table, before every game) and the table bet (spectators). Both are one panel:
 * - Players: each sets his own offer with −100 −10 +10 +100, live for the other one; the stake is the smaller of the two
 *   offers; the game begins when both press Ready (the database does that). Changing the stake takes the Ready back.
 * - Spectators: the "Table bet" button opens the same panel with their bid and the list of all bids; the highest bid
 *   challenges the winner of the last game. See _docs/multiplayer.md.
 */
import { t } from "./i18n/index.js";
import { STAKE_MIN, STAKE_STEPS, STAKE_ROUND } from "./stake-constants.js";

const money = (amount) => "$ " + amount.toLocaleString("en-US");

/**
 * @param {{ onStake: (amount: number) => void, onReady: (ready: boolean) => void, onBid: (amount: number) => void, onWithdraw: () => void }} actions
 */
export function createStakeWindow(actions) {
  const panel = document.getElementById("stake");
  const title = document.getElementById("stake-title");
  const note = document.getElementById("stake-note");
  const rows = document.getElementById("stake-rows");
  const agreed = document.getElementById("stake-agreed");
  const steps = document.getElementById("stake-steps");
  const main = document.getElementById("stake-main");
  const close = document.getElementById("stake-close");
  const betButton = document.getElementById("bet-open");

  let table = { staking: false, offers: [null, null], stake: 0, bids: [] };
  let me = { seat: 0, balance: 0, players: [{ name: "" }, { name: "" }] }; // seat 0: spectator
  let blocked = false; // the game-over panel is up: the window waits behind it
  let betOpen = false;
  let draft = 0; // the amount of a spectator that is not placed yet

  const range = () => ({ lo: Math.min(STAKE_MIN, me.balance), hi: me.balance });
  /** `amount` moved by `delta`: a multiple of 10 within the limits (the limit itself may be any amount: "all I have"). */
  const moved = (amount, delta) => {
    const { lo, hi } = range();
    const v = amount + delta;
    return v >= hi ? hi : Math.max(lo, Math.floor(v / STAKE_ROUND) * STAKE_ROUND);
  };
  const myOffer = () => table.offers[me.seat - 1];
  const myBid = () => table.bids.find((b) => b.mine);
  const players = () => me.seat > 0;
  const betting = () => !players() && betOpen && !!(me.players[0].name && me.players[1].name);

  for (const step of STAKE_STEPS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stake__step";
    button.textContent = (step > 0 ? "+" : "−") + Math.abs(step);
    button.addEventListener("click", () => {
      if (players()) {
        const offer = myOffer();
        if (!offer) return;
        const amount = moved(offer.amount, step);
        if (amount !== offer.amount) actions.onStake(amount);
      } else {
        draft = moved(draft, step);
        if (myBid()) actions.onBid(draft); // (a bid that stands follows the buttons)
        else render();
      }
    });
    steps.append(button);
  }
  main.addEventListener("click", () => {
    if (players()) actions.onReady(!myOffer()?.ready);
    else if (myBid()) actions.onWithdraw();
    else actions.onBid(draft);
  });
  close.addEventListener("click", () => {
    betOpen = false;
    render();
  });
  betButton.addEventListener("click", () => {
    betOpen = true;
    draft = myBid()?.amount ?? range().lo;
    render();
  });

  const row = (who, value, mark) => {
    const el = document.createElement("div");
    el.className = "stake__row";
    const name = document.createElement("span");
    name.className = "stake__who";
    name.textContent = who;
    const amount = document.createElement("span");
    amount.className = "stake__amount";
    amount.textContent = value;
    el.append(name, amount);
    if (mark !== null) {
      const ready = document.createElement("span");
      ready.className = "stake__mark" + (mark ? " is-ready" : "");
      ready.textContent = mark ? "✓" : "…";
      el.append(ready);
    }
    return el;
  };

  function render() {
    if (players()) betOpen = false; // (he got a seat: the bet is done)
    // the button of the spectators: next to the match panel, when two sit at the table
    betButton.hidden = players() || !(me.players[0].name && me.players[1].name);
    const show = (players() && table.staking && !blocked) || betting();
    panel.hidden = !show;
    if (!show) return;
    const mine = players();
    title.textContent = t(mine ? "stake.title" : "bet.title");
    note.textContent = t(mine ? "stake.note" : "bet.note");
    close.hidden = mine;
    if (mine) {
      const seats = [1, 2];
      rows.replaceChildren(
        ...seats.map((seat) => {
          const offer = table.offers[seat - 1];
          return row(me.players[seat - 1].name, offer ? money(offer.amount) : "", offer ? offer.ready : false);
        })
      );
      agreed.textContent = t("stake.agreed", { amount: money(table.stake) });
      const ready = !!myOffer()?.ready;
      const other = me.players[me.seat === 1 ? 1 : 0].name;
      main.textContent = ready ? t("stake.waiting", { name: other }) : t("stake.ready");
      main.classList.toggle("is-ready", ready);
    } else {
      rows.replaceChildren(...(table.bids.length ? table.bids.map((b) => row(b.name, money(b.amount), null)) : [Object.assign(document.createElement("p"), { className: "stake__none", textContent: t("bet.none") })]));
      agreed.textContent = t("bet.yours", { amount: money(myBid()?.amount ?? draft) });
      main.textContent = t(myBid() ? "bet.withdraw" : "bet.place");
      main.classList.remove("is-ready");
    }
  }

  return {
    /** The picture of the table from the database: the offers, the stake, the bids ({ staking, offers, stake, bids }). */
    setTable(next) {
      table = next;
      render();
    },
    /** Who I am: `seat` (0 = spectator), my money, and the two at the table by seat. */
    setMe(next) {
      me = next;
      render();
    },
    /** The game-over panel is up: the window waits behind it. */
    setBlocked(value) {
      blocked = value;
      render();
    },
    /** The window is in the way of the game (a player's stake window is open). */
    get open() {
      return !panel.hidden && players();
    },
    render,
  };
}
