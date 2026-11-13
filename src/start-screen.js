/**
 * The start screen: the maker, the title and the age confirmation, bare on a dark page. It is in
 * index.html and visible from the first moment, while the game loads behind it. The click on the
 * button allows the sound (audio.js) and with it the radio. See README.md.
 */
import { unlockAudio } from "./audio.js";

let open = true;

/** True while the intro (this screen and the welcome screen after it) is up: the game keys do nothing. */
export const isStartScreenOpen = () => open;

/** The intro is over: the game keys work. */
export function introDone() {
  open = false;
}

/** Resolves when the player has confirmed his age and `ready` (the loading game) has settled; a spinner until then. */
export function waitForConfirmation(ready) {
  const button = document.getElementById("start-confirm");
  return new Promise((resolve) => {
    button.addEventListener(
      "click",
      async () => {
        unlockAudio(); // the click allows sound and starts the radio
        button.disabled = true;
        button.classList.add("is-busy"); // the game may still be loading
        await ready;
        resolve();
      },
      { once: true }
    );
  });
}

/** Take the start screen away at once; the welcome screen is already over it. */
export function removeStartScreen() {
  document.getElementById("start")?.remove();
}
