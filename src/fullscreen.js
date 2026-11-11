/**
 * The fullscreen button in the settings panel: "Go fullscreen" / "Leave fullscreen" (the label follows the state, also when the browser
 * leaves fullscreen itself, e.g. with Esc). Hidden where the browser has no fullscreen for pages (e.g. iPhone).
 */
import { t, onLanguageChange } from "./i18n/index.js";

const root = document.documentElement;
const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
const exit = document.exitFullscreen ?? document.webkitExitFullscreen;
const current = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;

export function createFullscreenButton() {
  const button = document.getElementById("btn-fullscreen");
  const label = document.getElementById("fullscreen-label");
  if (!request || !exit) {
    button.hidden = true;
    return;
  }
  const render = () => {
    label.textContent = t(current() ? "settings.fullscreenLeave" : "settings.fullscreen");
  };
  button.addEventListener("click", () => {
    try {
      Promise.resolve(current() ? exit.call(document) : request.call(root)).catch(() => {}); // (refused: nothing happens)
    } catch {
      /* refused */
    }
  });
  document.addEventListener("fullscreenchange", render);
  document.addEventListener("webkitfullscreenchange", render);
  onLanguageChange(render);
  render();
}
