/**
 * Tiny i18n layer.
 *
 * Add a language:
 *   1. create `locales/<code>.js` (copy `en.js`, translate the values),
 *   2. add its flag to `flags.js`,
 *   3. register it in LANGUAGES below.
 * Missing keys fall back to English, then to the key itself.
 *
 * Static texts use `data-i18n="key"` (text), `data-i18n-aria-label` and `data-i18n-title`.
 * Dynamic texts call `t()` and re-render inside an `onLanguageChange` listener.
 */
import en from "./locales/en.js";
import de from "./locales/de.js";
import { FLAGS } from "./flags.js";
import { storageGet, storageSet } from "../storage.js";

/** Registered languages; the first one is the default. */
export const LANGUAGES = [
  { code: "en", name: "English", flag: FLAGS.en, messages: en },
  { code: "de", name: "Deutsch", flag: FLAGS.de, messages: de },
];

const STORAGE_KEY = "backroom-billard.lang";

const find = (code) => LANGUAGES.find((l) => l.code === code);

let current = LANGUAGES[0].code;
const listeners = new Set();

/**
 * Translate a key. `{name}` placeholders are replaced from `params`.
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 */
export function t(key, params = {}) {
  const message = find(current).messages[key] ?? en[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

export const getLanguage = () => current;

/** @param {(code: string) => void} fn — called after every language change; returns an unsubscribe function */
export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Apply `data-i18n*` attributes below `root`. */
export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
}

function markActiveFlag() {
  document.querySelectorAll("#lang-switch .lang-btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === current));
  });
}

export function setLanguage(code) {
  if (!find(code)) return;
  current = code;
  storageSet(STORAGE_KEY, code);
  document.documentElement.lang = code;
  applyTranslations();
  markActiveFlag();
  listeners.forEach((fn) => fn(code));
}

function renderSwitcher() {
  const host = document.getElementById("lang-switch");
  if (!host) return;
  host.replaceChildren();
  for (const lang of LANGUAGES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-btn";
    btn.dataset.lang = lang.code;
    btn.title = lang.name;
    btn.setAttribute("aria-label", lang.name);
    btn.innerHTML = lang.flag;
    btn.addEventListener("click", () => setLanguage(lang.code));
    host.appendChild(btn);
  }
}

/** Build the flag switcher and apply the stored (or default) language. Call once at startup. */
export function initI18n() {
  const saved = storageGet(STORAGE_KEY);
  // the stored choice, else the language of the browser, else English
  const browser = (navigator.languages ?? [navigator.language]).map((l) => l?.slice(0, 2).toLowerCase()).find(find);
  current = find(saved) ? saved : browser ?? LANGUAGES[0].code;
  renderSwitcher();
  setLanguage(current);
}
