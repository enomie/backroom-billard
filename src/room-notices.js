/**
 * The messages about the room (multiplayer): short notes ("Anna joined", "The game starts: …") one below the
 * other that go away by themselves (the "Waiting for another player" stands in the match panel).
 * Texts: src/i18n (room.*). See _docs/multiplayer.md.
 */
import { t } from "./i18n/index.js";

const NOTE_SECONDS = 5;
const notes = []; // the notes on the screen: { key, name, element }

/** A short note: the text is the translation of `key` with the name; it goes away after a few seconds. */
export function roomNote(key, name) {
  const element = document.createElement("div");
  element.className = "toast is-visible";
  element.setAttribute("role", "status");
  const note = { key, name, element };
  element.textContent = t(key, { name });
  document.getElementById("room-messages").append(element);
  notes.push(note);
  window.setTimeout(() => {
    element.remove();
    notes.splice(notes.indexOf(note), 1);
  }, NOTE_SECONDS * 1000);
}

/** Render the notes on the screen in the current language (after a change of language). */
export function renderNote() {
  for (const note of notes) note.element.textContent = t(note.key, { name: note.name });
}
