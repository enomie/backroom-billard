/**
 * The chat input (multiplayer, see _docs/chat.md): Enter (or the speech-bubble button, for the phone) opens a field at the bottom, Enter sends,
 * Esc closes without sending; an empty Enter takes the own message away (so does the ✕ at the own message). While the field is open every key
 * belongs to it: the game keys do nothing. The own message stands at the left, under the status (the own head is not seen by oneself).
 */
import { t, onLanguageChange } from "./i18n/index.js";

/**
 * @param {{ say: (text: string) => void, clear: () => void, canOpen: () => boolean, onOpen: () => void }} actions
 *   `canOpen`: no other window is up; `onOpen`: let go of what is held (keys, glass, cigarette) before the field takes the keys
 */
export function createChatBox({ say, clear, canOpen, onOpen }) {
  const box = document.getElementById("chat-box");
  const input = document.getElementById("chat-input");
  const sendButton = document.getElementById("chat-send");
  const openButton = document.getElementById("btn-chat");
  const own = document.getElementById("chat-own");
  const ownText = document.getElementById("chat-own-text");
  const ownClear = document.getElementById("chat-own-clear");
  let enabled = false;
  let isOpen = false;
  let hasOwn = false;

  const render = () => {
    input.placeholder = t("chat.placeholder");
    sendButton.textContent = t("chat.send");
    openButton.title = openButton.ariaLabel = t("chat.open");
    ownClear.title = ownClear.ariaLabel = t("chat.clear");
  };
  onLanguageChange(render);
  render();

  const open = () => {
    if (!enabled || isOpen || !canOpen()) return;
    isOpen = true;
    onOpen();
    box.hidden = false;
    input.value = "";
    input.focus();
  };
  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    box.hidden = true;
    input.blur();
  };
  /** Enter: send; an empty field takes the own message away (if there is one). */
  const send = () => {
    const text = input.value.trim();
    if (text) say(text);
    else if (hasOwn) clear();
    close();
  };

  // first in line (window, capture): the keys of the game must not see what is typed here
  window.addEventListener(
    "keydown",
    (e) => {
      if (isOpen) {
        e.stopPropagation(); // (the typing itself still goes into the field)
        if (e.isComposing) return;
        if (e.key === "Enter") {
          e.preventDefault();
          send();
        } else if (e.key === "Escape") {
          e.preventDefault();
          close();
        }
        return;
      }
      if (e.key === "Enter" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && enabled && canOpen()) {
        e.preventDefault(); // (also no click on a button that has the focus)
        e.stopPropagation();
        open();
      }
    },
    true
  );
  window.addEventListener(
    "keyup",
    (e) => {
      if (isOpen) e.stopPropagation();
    },
    true
  );
  // a tap or click outside the field closes it (without sending)
  document.addEventListener("pointerdown", (e) => {
    if (isOpen && !e.target.closest("#chat-box") && !e.target.closest("#btn-chat")) close();
  });
  openButton.addEventListener("click", () => (isOpen ? close() : open()));
  sendButton.addEventListener("click", send);
  ownClear.addEventListener("click", clear);

  return {
    /** The chat is there (multiplayer, in the room): the button shows and Enter opens the field. */
    setEnabled(on) {
      enabled = on;
      openButton.hidden = !on;
      if (!on) {
        close();
        this.setOwn("");
      }
    },
    /** The own message as the database has it (an empty text: none). */
    setOwn(text) {
      hasOwn = !!text;
      own.hidden = !hasOwn;
      ownText.textContent = text;
    },
  };
}
