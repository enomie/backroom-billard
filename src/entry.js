/**
 * npm entry point: Three.js first, then Rapier, then the game scripts.
 */
import * as THREE from "three";
import { initI18n, t } from "./i18n/index.js";

window.THREE = THREE;

initI18n();

/** The most the game waits for the fonts (ms): then it starts with substitute fonts. */
const FONT_WAIT = 1500;

/**
 * Wait for the fonts: text that is drawn into a texture at the start (the B on the door) would
 * otherwise stay in a substitute font for good, and the HUD would jump when Roboto comes late.
 */
async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('400 1em "Limelight"', "B"), document.fonts.load('400 1em "Roboto"', "A")]),
      new Promise((resolve) => setTimeout(resolve, FONT_WAIT)),
    ]);
  } catch {
    /* the substitute fonts do */
  }
}

async function boot() {
  try {
    const fonts = fontsReady(); // loads while Rapier and the table are loaded
    // Rapier first (colliders are built from the table geometry)
    const mod = await import("@dimforge/rapier3d-simd");
    window.RAPIER = mod.default;
    await import("./table-blueprint.js");
    await fonts;
    await import("./billard.js");
  } catch (err) {
    console.error("[Backroom Billard] Boot fehlgeschlagen:", err);
    const txt = document.getElementById("status-text");
    if (txt) txt.textContent = t("boot.failed");
    const dot = document.getElementById("status-dot");
    if (dot) dot.className = "status-dot status-dot--moving";
  }
}

boot();
