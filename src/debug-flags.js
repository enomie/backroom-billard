/**
 * Debug switches, off by default. Turn one on with a parameter in the address: `?debug=face` (several: `?debug=face,other`).
 * - `face`: the dummy head next to the bar (your own face, as a ball with name and flag; face-ball.js)
 * - `chat`: a long sample message over the dummy head (needs `face`: `?debug=face,chat`; to see how the bubble breaks lines and keeps its size)
 */
const flags = new Set((new URLSearchParams(window.location.search).get("debug") ?? "").split(",").filter(Boolean));

/** @param {string} name */
export const debugFlag = (name) => flags.has(name);
