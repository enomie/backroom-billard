/**
 * The messages about the room (multiplayer): a standing "Waiting for another player" while the guest is
 * alone, and short notes when somebody joins or leaves. Texts: src/i18n (room.*). See _docs/multiplayer.md.
 */
import { t } from "./i18n/index.js";

const NOTE_SECONDS = 4;
let timer = 0;
let note = null; // the last note as { key, name }, to render it again after a change of language

/** Show or hide the standing message for a guest who is alone in the room. */
export function showWaiting(visible) {
  document.getElementById("room-waiting").hidden = !visible;
}

/** A short note ("Anna joined" / "Anna left") that goes away by itself. */
export function roomNote(key, name) {
  note = { key, name };
  renderNote();
  const element = document.getElementById("room-note");
  element.classList.add("is-visible");
  window.clearTimeout(timer);
  timer = window.setTimeout(() => element.classList.remove("is-visible"), NOTE_SECONDS * 1000);
}

/** Render the note in the current language (also after the language was changed). */
export function renderNote() {
  if (note) document.getElementById("room-note").textContent = t(note.key, { name: note.name });
}
