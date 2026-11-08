/**
 * The start screen: the maker, the title and the age confirmation, bare on a dark page. It is in
 * index.html and visible from the first moment, while the game loads behind it. The click on the
 * button allows the sound (audio.js) and with it the radio. See README.md.
 */
import { unlockAudio } from "./audio.js";

let open = true;

/** True while the start screen is up: the game keys do nothing. */
export const isStartScreenOpen = () => open;

/** Resolves when the player has confirmed his age. */
export function waitForConfirmation() {
  const button = document.getElementById("start-confirm");
  return new Promise((resolve) => {
    button.addEventListener(
      "click",
      () => {
        unlockAudio(); // the click allows sound and starts the radio
        button.disabled = true; // the game may still be loading: wait quietly
        resolve();
      },
      { once: true }
    );
  });
}

/** Fade the start screen out and remove it. */
export function hideStartScreen() {
  const root = document.getElementById("start");
  open = false;
  root.classList.add("start--leaving");
  const remove = () => root.remove();
  root.addEventListener("transitionend", remove, { once: true });
  window.setTimeout(remove, 1000); // if the transition does not run (e.g. a hidden tab)
}
