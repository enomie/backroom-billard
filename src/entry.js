/**
 * NPM-Einstieg: Three.js zuerst, dann Spielskripte; Rapier lazy (noch ohne Physik).
 */
import * as THREE from "three";

window.THREE = THREE;

async function boot() {
  try {
    await import("./table-blueprint.js");
    await import("./billiard.js");
  } catch (err) {
    console.error("[Billiard] Boot fehlgeschlagen:", err);
    const txt = document.getElementById("status-text");
    if (txt) txt.textContent = "Start fehlgeschlagen – Konsole prüfen";
    const dot = document.getElementById("status-dot");
    if (dot) dot.className = "status-dot status-dot--moving";
  }

  import("@dimforge/rapier3d-simd")
    .then((mod) => {
      window.RAPIER = mod.default;
    })
    .catch((err) => {
      console.warn("[Billiard] Rapier (SIMD) optional nicht geladen:", err);
    });
}

boot();
