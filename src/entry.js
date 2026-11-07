/**
 * NPM-Einstieg: Three.js zuerst, dann Spielskripte; Rapier vor den Spielskripten.
 */
import * as THREE from "three";

window.THREE = THREE;

async function boot() {
  try {
    // Rapier zuerst (Kollisionskörper werden aus der Tisch-Geometrie gebaut)
    const mod = await import("@dimforge/rapier3d-simd");
    window.RAPIER = mod.default;
    await import("./table-blueprint.js");
    await import("./billard.js");
  } catch (err) {
    console.error("[Backroom Billard] Boot fehlgeschlagen:", err);
    const txt = document.getElementById("status-text");
    if (txt) txt.textContent = "Start fehlgeschlagen – Konsole prüfen";
    const dot = document.getElementById("status-dot");
    if (dot) dot.className = "status-dot status-dot--moving";
  }
}

boot();
