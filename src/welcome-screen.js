/**
 * The welcome screen after the start screen (see _docs/welcome-screen.md): first the mode (single or multiplayer); multiplayer then
 * logs in to the account of this browser, or asks for a new one (name, country, face) or a key; last comes "What'll it be?": the first
 * drink and the first pack of cigarettes (the money of the chosen mode drops as the player chooses). Single player has no name, flag,
 * face or key; its purse lives in the browser (profile-store.js), the multiplayer account in the database.
 */
import { DRINK_MENU, PACK_PRICE, START_MONEY } from "./shop-constants.js";
import { PACK_DESIGNS } from "./cigarette-constants.js";
import { t, onLanguageChange, getLanguage } from "./i18n/index.js";
import { filterName, normalizeName, isValidName, displayName } from "./name-rules.js";
import { randomFace, isFace, faceSvg } from "./face.js";
import { COUNTRIES, DEFAULT_COUNTRY, isCountry, countryName, flagUrl } from "./country-list.js";
import { loadLegacy, clearLegacy, loadSingle, saveSingle, clearSingle, loadMultiChoice, saveMultiChoice } from "./profile-store.js";
import { loadKey, clearKey, normalizeKey } from "./account-key.js";
import { clamp } from "./math-utils.js";

const format = (amount) => "$ " + amount.toLocaleString("en-US");
const $ = (id) => document.getElementById(id);
const DEFAULT_DRINK = "beer";
const DEFAULT_PACK = 0; // Premium Blend
const CHEAPEST_DRINK = Math.min(...DRINK_MENU.map((d) => d.price));
const STEPS = ["mode", "account", "key", "menu"];

/**
 * Show the screen; resolves when the game has started.
 * @param {{
 *   login: (spec: { key?: string, create?: { name: string, country: string, face: string } }) => Promise<{ name: string, country: string, face: string, money: number, key: string }>,
 *   start: (choice: object) => Promise<void>,
 * }} game — `login`: multiplayer log in (a new account or a key); `start`: the mode and what was chosen at the bar (see startGame in billard.js)
 * @returns {Promise<void>}
 */
export function showWelcome(game) {
  const root = $("welcome");
  const fields = { first: $("welcome-first"), middle: $("welcome-middle"), last: $("welcome-last") };
  const required = { first: true, middle: false, last: true };
  const legacy = loadLegacy(); // an earlier version's name, country and face fill in the "New here" form
  let face = isFace(legacy?.face) ? legacy.face : randomFace();
  let country = isCountry(legacy?.country) ? legacy.country : DEFAULT_COUNTRY;

  /** @type {"single" | "multi"} */
  let mode = "single";
  let account = null; // multiplayer: the account { name, country, face, money, key }
  let money = START_MONEY; // what he has before buying
  let drink = DEFAULT_DRINK;
  let pack = DEFAULT_PACK;
  let busy = false;

  const show = (step) => {
    for (const name of STEPS) $(`welcome-step-${name}`).hidden = name !== step;
    $("welcome-error").hidden = true;
    busy = false;
    $("welcome-multi").classList.remove("is-busy");
    $("welcome-single").disabled = $("welcome-multi").disabled = false;
  };

  /* ---- 4. What'll it be? ------------------------------------------------------------------------------------------ */
  const priceOfDrink = (kind) => DRINK_MENU.find((d) => d.kind === kind)?.price ?? 0;
  const drinkCost = () => (drink ? priceOfDrink(drink) : 0);
  const packCost = () => (pack !== null ? PACK_PRICE : 0);
  const spent = () => drinkCost() + packCost();

  /** The option buttons (drinks and packs). A choice can be taken back by pressing it again. What he cannot pay together with the other choice is grey. */
  const renderOptions = () => {
    const make = (host, items, selected, otherSpent, choose) => {
      host.replaceChildren(
        ...items.map((item) => {
          const chosen = selected === item.value;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "welcome__option";
          button.setAttribute("role", "radio");
          button.setAttribute("aria-checked", String(chosen));
          button.disabled = !chosen && money - otherSpent < item.price;
          const name = document.createElement("span");
          name.textContent = item.label;
          const price = document.createElement("span");
          price.className = "welcome__price";
          price.textContent = format(item.price);
          button.append(name, price);
          button.addEventListener("click", () => {
            choose(chosen ? null : item.value);
            updateMenu();
          });
          return button;
        })
      );
    };
    make($("welcome-drinks"), DRINK_MENU.map((d) => ({ value: d.kind, label: t(d.key), price: d.price })), drink, packCost(), (v) => (drink = v));
    make($("welcome-packs"), PACK_DESIGNS.map((d, i) => ({ value: i, label: d.subtitle, price: PACK_PRICE })), pack, drinkCost(), (v) => (pack = v));
  };

  // He may go on when each choice is made, or when he has too little money for it (then it stays empty: he cannot buy it later either).
  const complete = () => (drink !== null || money - packCost() < CHEAPEST_DRINK) && (pack !== null || money - drinkCost() < PACK_PRICE);
  const updateMenu = () => {
    $("welcome-money").textContent = format(money - spent());
    $("welcome-broke").hidden = money >= CHEAPEST_DRINK + PACK_PRICE;
    renderOptions();
    $("welcome-go").classList.toggle("is-busy", busy); // (a spinner while the room is being set up)
    $("welcome-go").disabled = !complete() || busy;
  };
  const openMenu = () => {
    const saved = mode === "single" ? loadSingle() : loadMultiChoice();
    money = mode === "single" ? (loadSingle()?.money ?? START_MONEY) : account.money;
    drink = saved?.firstDrink ?? DEFAULT_DRINK; // beer and Premium Blend are chosen at first, and later what was chosen last
    pack = Number.isInteger(saved?.firstPack) ? saved.firstPack : DEFAULT_PACK;
    // what he cannot pay any more (little money left) is not taken over
    if (money < spent()) pack = null;
    if (money < spent()) drink = null;
    $("welcome-switch").hidden = mode !== "multi";
    $("welcome-menu-error").hidden = true;
    show("menu");
    updateMenu();
  };

  /* ---- 2. Multiplayer: the account ---------------------------------------------------------------------------------- */
  let tab = "new"; // "new" | "key"
  let warned = false; // the warning about giving up this browser's account was shown
  const validNames = () => Object.keys(fields).every((k) => isValidName(normalizeName(fields[k].value), required[k]));
  const updateAccount = () => {
    const isNew = tab === "new";
    $("welcome-tab-new").setAttribute("aria-selected", String(isNew));
    $("welcome-tab-key").setAttribute("aria-selected", String(!isNew));
    $("welcome-new").hidden = !isNew;
    $("welcome-keyin").hidden = isNew;
    $("welcome-key-warn").hidden = isNew || !warned;
    $("welcome-account-go-label").textContent = isNew ? t("welcome.accountGo") : warned ? t("welcome.keyWarnYes") : t("welcome.keyLogin");
    $("welcome-account-go").classList.toggle("is-busy", busy); // (a spinner while the account is being set up)
    $("welcome-account-go").disabled = busy || (isNew ? !validNames() : !$("welcome-key").value.trim());
  };
  const openAccount = (which) => {
    tab = which;
    warned = false;
    $("welcome-key-error").hidden = true;
    show("account");
    updateAccount();
    (which === "new" ? fields.first : $("welcome-key")).focus();
  };
  $("welcome-tab-new").addEventListener("click", () => openAccount("new"));
  $("welcome-tab-key").addEventListener("click", () => openAccount("key"));
  $("welcome-account-back").addEventListener("click", () => show("mode"));
  $("welcome-key").addEventListener("input", () => {
    warned = false;
    $("welcome-key-error").hidden = true;
    updateAccount();
  });

  // the name: nothing but letters, "." and "-" can be typed
  for (const [key, field] of Object.entries(fields)) {
    field.value = legacy ? (key === "first" ? legacy.firstName : key === "middle" ? legacy.middleName : legacy.lastName) : "";
    field.addEventListener("input", () => {
      const caret = field.selectionStart;
      const kept = filterName(field.value);
      if (kept !== field.value) {
        const removed = field.value.length - kept.length;
        field.value = kept;
        field.setSelectionRange(Math.max(0, caret - removed), Math.max(0, caret - removed));
      }
      updateAccount();
    });
    field.addEventListener("blur", () => {
      field.value = normalizeName(field.value);
      updateAccount();
    });
  }
  const order = [fields.first, fields.middle, fields.last];
  order.forEach((field, i) =>
    field.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (order[i + 1]) order[i + 1].focus();
      else if (!$("welcome-account-go").disabled) $("welcome-account-go").click();
    })
  );
  $("welcome-key").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !$("welcome-account-go").disabled) $("welcome-account-go").click();
  });

  // the face: what is shown counts; the button throws the dice again
  const renderFace = () => ($("welcome-face").innerHTML = faceSvg(face));
  $("welcome-face-random").addEventListener("click", () => {
    face = randomFace();
    renderFace();
  });
  renderFace();

  // the country: a drop-down list with a search (typing filters; names in the language of the page)
  const countryButton = $("welcome-country");
  const panel = $("welcome-country-panel");
  const search = $("welcome-country-search");
  const list = $("welcome-country-list");
  /** Lower case without accents, so that "osterreich" finds "Österreich". */
  const plain = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  let shown = []; // the codes in the list, and which one is marked
  let marked = 0;

  const renderCountry = () => {
    $("welcome-country-flag").src = flagUrl(country);
    $("welcome-country-name").textContent = countryName(country, getLanguage());
  };
  const mark = (index) => {
    marked = clamp(index, 0, shown.length - 1);
    [...list.children].forEach((li, i) => li.classList.toggle("is-marked", i === marked));
    list.children[marked]?.scrollIntoView({ block: "nearest" });
  };
  const renderList = () => {
    const language = getLanguage();
    const wanted = plain(search.value.trim());
    shown = COUNTRIES.map((c) => c[0])
      .map((code) => ({ code, name: countryName(code, language) }))
      .filter((c) => plain(c.name).includes(wanted))
      .sort((a, b) => a.name.localeCompare(b.name, language));
    list.replaceChildren(
      ...(shown.length
        ? shown.map((c) => {
            const li = document.createElement("li");
            li.setAttribute("role", "option");
            li.setAttribute("aria-selected", String(c.code === country));
            li.className = "welcome__country-item";
            const flag = document.createElement("img");
            flag.src = flagUrl(c.code);
            flag.alt = "";
            flag.width = flag.height = 24;
            li.append(flag, document.createTextNode(c.name));
            li.addEventListener("click", () => choose(c.code));
            return li;
          })
        : [Object.assign(document.createElement("li"), { className: "welcome__country-none", textContent: t("welcome.countryNone") })])
    );
    search.placeholder = t("welcome.countrySearch");
    mark(Math.max(0, shown.findIndex((c) => c.code === country)));
    shown = shown.map((c) => c.code);
  };
  const setOpen = (open) => {
    panel.hidden = !open;
    countryButton.setAttribute("aria-expanded", String(open));
    if (open) {
      search.value = "";
      renderList();
      search.focus();
    }
  };
  const choose = (code) => {
    country = code;
    renderCountry();
    setOpen(false);
    countryButton.focus();
  };
  countryButton.addEventListener("click", () => setOpen(panel.hidden));
  search.addEventListener("input", renderList);
  search.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") mark(marked + 1);
    else if (e.key === "ArrowUp") mark(marked - 1);
    else if (e.key === "Enter" && shown[marked]) choose(shown[marked]);
    else if (e.key === "Escape") setOpen(false);
    else return;
    e.preventDefault();
  });
  document.addEventListener("pointerdown", (e) => {
    if (!panel.hidden && !e.target.closest(".welcome__country")) setOpen(false); // a click outside closes the list
  });
  renderCountry();

  // Continue / Log in
  $("welcome-account-go").addEventListener("click", async () => {
    busy = true;
    $("welcome-key-error").hidden = true;
    updateAccount();
    try {
      if (tab === "new") {
        const [firstName, middleName, lastName] = Object.values(fields).map((f) => normalizeName(f.value));
        account = await game.login({ create: { name: displayName({ firstName, middleName, lastName }, "short"), country, face: JSON.stringify(face) } });
        clearLegacy(); // its name, country and face live in the account now
        $("welcome-key-show").textContent = account.key;
        show("key");
        return;
      }
      const key = normalizeKey($("welcome-key").value);
      if (!key) return fail("welcome.keyBad");
      if (loadKey() && loadKey() !== key && !warned) {
        warned = true; // this browser has an account: giving it up needs a second click
        busy = false;
        updateAccount();
        return;
      }
      account = await game.login({ key });
      openMenu();
    } catch (error) {
      console.warn("[Backroom Billard] the login did not work:", error);
      fail(error?.message === "unknown-key" ? "welcome.keyUnknown" : "welcome.multiFailed");
    }
  });
  const fail = (messageKey) => {
    busy = false;
    const message = $("welcome-key-error");
    message.textContent = t(messageKey);
    message.hidden = false;
    message.dataset.key = messageKey;
    updateAccount();
  };

  /* ---- 3. The key of a new account (shown once) ----------------------------------------------------------------------- */
  $("welcome-key-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(account.key);
      $("welcome-key-copy").textContent = t("welcome.keyCopied");
    } catch {
      /* no clipboard: the key stands there to be copied by hand */
    }
  });
  $("welcome-key-ok").addEventListener("click", openMenu);

  /* ---- 1. The mode ---------------------------------------------------------------------------------------------------- */
  $("welcome-single").addEventListener("click", () => {
    mode = "single";
    openMenu();
  });
  $("welcome-multi").addEventListener("click", async () => {
    mode = "multi";
    if (!loadKey()) return openAccount("new");
    busy = true;
    $("welcome-error").hidden = true;
    $("welcome-multi").classList.add("is-busy");
    $("welcome-single").disabled = $("welcome-multi").disabled = true;
    try {
      account = await game.login({}); // this browser's account
      openMenu();
    } catch (error) {
      console.warn("[Backroom Billard] the login did not work:", error);
      if (error?.message === "unknown-key" || error?.message === "no-key") return openAccount("new"); // the database does not know it (any more)
      show("mode");
      $("welcome-error").hidden = false;
    }
  });

  /* ---- the buttons of the menu ------------------------------------------------------------------------------------------- */
  $("welcome-back").addEventListener("click", () => show("mode"));
  $("welcome-switch").addEventListener("click", () => openAccount("key"));
  const ask = (open) => {
    $("welcome-restart-ask").hidden = !open;
    $("welcome-restart").hidden = open;
    $("welcome-restart-text").textContent = t(mode === "single" ? "welcome.restartAskSingle" : "welcome.restartAskMulti");
  };
  $("welcome-restart").addEventListener("click", () => ask(true));
  $("welcome-restart-no").addEventListener("click", () => ask(false));
  $("welcome-restart-yes").addEventListener("click", () => {
    ask(false);
    if (mode === "single") {
      clearSingle(); // the old profile too: its money is not taken over again
      openMenu();
    } else {
      clearKey(); // the account is given up; a new one is made (its old key stays good for whoever saved it)
      face = randomFace();
      renderFace();
      for (const field of Object.values(fields)) field.value = "";
      openAccount("new");
    }
  });

  onLanguageChange(() => {
    renderCountry();
    if (!panel.hidden) renderList();
    const message = $("welcome-key-error");
    if (message.dataset.key && !message.hidden) message.textContent = t(message.dataset.key);
    if (!$("welcome-step-account").hidden) updateAccount();
    if (!$("welcome-step-menu").hidden) updateMenu();
  });

  root.hidden = false;
  show("mode");

  return new Promise((resolve) => {
    $("welcome-go").addEventListener("click", async () => {
      busy = true;
      $("welcome-menu-error").hidden = true;
      updateMenu();
      try {
        if (mode === "single") {
          const left = money - spent();
          saveSingle({ money: left, firstDrink: drink, firstPack: pack });
          await game.start({ mode, money: left, firstDrink: drink, firstPack: pack });
        } else {
          saveMultiChoice({ firstDrink: drink, firstPack: pack });
          await game.start({ mode, firstDrink: drink, firstPack: pack, name: account.name, fullName: account.name, country: account.country, face: account.face });
        }
        resolve();
      } catch (error) {
        console.warn("[Backroom Billard] the game could not be started:", error);
        busy = false;
        $("welcome-menu-error").hidden = false;
        updateMenu();
      }
    });
  });
}

/** Fade the welcome screen out and remove it. */
export function hideWelcome() {
  const root = $("welcome");
  root.classList.add("welcome--leaving");
  const remove = () => root.remove();
  root.addEventListener("transitionend", remove, { once: true });
  window.setTimeout(remove, 1000); // if the transition does not run (e.g. a hidden tab)
}
