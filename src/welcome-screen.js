/**
 * The welcome screen after the start screen: the name in three fields, the first drink, the first
 * pack of cigarettes (the money drops as the player chooses) and Continue. See
 * _docs/welcome-screen.md. The result is saved in the browser (profile-store.js).
 */
import { DRINK_MENU, PACK_PRICE, START_MONEY } from "./shop-constants.js";
import { PACK_DESIGNS } from "./cigarette-constants.js";
import { t, onLanguageChange, getLanguage } from "./i18n/index.js";
import { filterName, normalizeName, isValidName, middleInitial } from "./name-rules.js";
import { COUNTRIES, DEFAULT_COUNTRY, isCountry, countryName, flagUrl } from "./country-list.js";
import { loadProfile, saveProfile, clearProfile, PROFILE_VERSION } from "./profile-store.js";

const format = (amount) => "$ " + amount.toLocaleString("en-US");
const $ = (id) => document.getElementById(id);
const DEFAULT_DRINK = "beer";
const CHEAPEST_DRINK = Math.min(...DRINK_MENU.map((d) => d.price));

/**
 * Show the screen; resolves with the profile when the player continues.
 * @returns {Promise<import("./profile-store.js").Profile>}
 */
export function showWelcome() {
  const root = $("welcome");
  const fields = { first: $("welcome-first"), middle: $("welcome-middle"), last: $("welcome-last") };
  const required = { first: true, middle: false, last: true };
  const previous = loadProfile();
  let money = previous?.money ?? START_MONEY; // what he has before buying
  let drink = previous?.firstDrink ?? DEFAULT_DRINK; // a new player starts with a beer chosen (can be changed)
  let pack = previous?.firstPack ?? null;
  let country = isCountry(previous?.country) ? previous.country : DEFAULT_COUNTRY;

  const priceOfDrink = (kind) => DRINK_MENU.find((d) => d.kind === kind)?.price ?? 0;
  const spent = () => (drink ? priceOfDrink(drink) : 0) + (pack !== null ? PACK_PRICE : 0);
  // the last choices he cannot pay any more (little money left) are not taken over
  if (money < spent()) pack = null;
  if (money < spent()) drink = null;

  /**
   * The option buttons (drinks and packs), rebuilt when something changes. A choice can be taken back
   * by pressing it again. What he cannot pay together with the other choice is grey.
   */
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
            update();
          });
          return button;
        })
      );
    };
    make($("welcome-drinks"), DRINK_MENU.map((d) => ({ value: d.kind, label: t(d.key), price: d.price })), drink, pack !== null ? PACK_PRICE : 0, (v) => (drink = v));
    make($("welcome-packs"), PACK_DESIGNS.map((d, i) => ({ value: i, label: d.subtitle, price: PACK_PRICE })), pack, drink ? priceOfDrink(drink) : 0, (v) => (pack = v));
  };

  const valid = () => Object.keys(fields).every((k) => isValidName(normalizeName(fields[k].value), required[k]));

  const update = () => {
    const left = money - spent();
    $("welcome-money").textContent = format(left);
    $("welcome-broke").hidden = money >= CHEAPEST_DRINK + PACK_PRICE;
    renderOptions();
    $("welcome-continue").disabled = !(valid() && drink && pack !== null && left >= 0);
  };

  // the name: nothing but letters, "." and "-" can be typed
  for (const [key, field] of Object.entries(fields)) {
    field.value = previous ? (key === "first" ? previous.firstName : key === "middle" ? previous.middleName : previous.lastName) : "";
    field.addEventListener("input", () => {
      const caret = field.selectionStart;
      const kept = filterName(field.value);
      if (kept !== field.value) {
        const removed = field.value.length - kept.length;
        field.value = kept;
        field.setSelectionRange(Math.max(0, caret - removed), Math.max(0, caret - removed));
      }
      update();
    });
    field.addEventListener("blur", () => {
      field.value = normalizeName(field.value);
      update();
    });
  }
  const order = [fields.first, fields.middle, fields.last];
  order.forEach((field, i) =>
    field.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (order[i + 1]) order[i + 1].focus();
      else if (!$("welcome-continue").disabled) $("welcome-continue").click();
    })
  );

  // the country: a drop-down list with a search (typing filters; names in the language of the page)
  const countryButton = $("welcome-country");
  const panel = $("welcome-country-panel");
  const search = $("welcome-country-search");
  const list = $("welcome-country-list");
  /** Lower case without accents, so that "osterreich" finds "Österreich". */
  const plain = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let shown = []; // the codes in the list, and which one is marked
  let marked = 0;

  const renderCountry = () => {
    $("welcome-country-flag").src = flagUrl(country);
    $("welcome-country-name").textContent = countryName(country, getLanguage());
  };
  const mark = (index) => {
    marked = Math.max(0, Math.min(shown.length - 1, index));
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

  // start over: after a question, the profile is gone and the money is the start money again
  const ask = (open) => {
    $("welcome-restart-ask").hidden = !open;
    $("welcome-restart").hidden = open;
  };
  $("welcome-restart").addEventListener("click", () => ask(true));
  $("welcome-restart-no").addEventListener("click", () => ask(false));
  $("welcome-restart-yes").addEventListener("click", () => {
    clearProfile();
    money = START_MONEY;
    drink = DEFAULT_DRINK;
    pack = null;
    country = DEFAULT_COUNTRY;
    renderCountry();
    for (const field of Object.values(fields)) field.value = "";
    ask(false);
    update();
    fields.first.focus();
  });

  onLanguageChange(() => {
    renderCountry();
    if (!panel.hidden) renderList();
    update();
  });
  root.hidden = false;
  update();
  fields.first.focus();

  return new Promise((resolve) => {
    $("welcome-continue").addEventListener("click", () => {
      const [firstName, middleName, lastName] = [fields.first, fields.middle, fields.last].map((f) => normalizeName(f.value));
      /** @type {import("./profile-store.js").Profile} */
      const profile = {
        version: PROFILE_VERSION,
        firstName,
        middleName,
        middleInitial: middleInitial(middleName),
        lastName,
        country,
        firstDrink: drink,
        firstPack: pack,
        money: money - spent(),
        createdAt: previous?.createdAt ?? new Date().toISOString(),
      };
      saveProfile(profile);
      $("welcome-continue").disabled = true;
      resolve(profile);
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
