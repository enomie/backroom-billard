/**
 * npm entry point: Three.js first, then Rapier, then the game scripts.
 */
import * as THREE from "three";
import { initI18n, t } from "./i18n/index.js";

window.THREE = THREE;

initI18n();

async function boot() {
  try {
    // Rapier first (colliders are built from the table geometry)
    const mod = await import("@dimforge/rapier3d-simd");
    window.RAPIER = mod.default;
    await import("./table-blueprint.js");
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
