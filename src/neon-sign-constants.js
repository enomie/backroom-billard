/** The neon sign on the short wall opposite the door (see _docs/look.md). Sizes in m. */
export const NEON_SIGN_WIDTH = 1.5;
export const NEON_SIGN_CENTER_Y = 2.7;
/** Distance of the sign from the wall surface. */
export const NEON_SIGN_WALL_GAP = 0.02;
/** The two lines, top to bottom: text and tube color (the core of the tube is lighter). */
export const NEON_SIGN_LINES = [
  { text: "BACKROOM", color: "#2fb6ff", core: "#d4f1ff" },
  { text: "BILLARD", color: "#ffc726", core: "#fff1b8" },
];
/** Strength of the glow (0…1 of the additive drawing). */
export const NEON_SIGN_GLOW = 1;
