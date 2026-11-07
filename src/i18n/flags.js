/**
 * Inline SVG flags (emoji flags do not render on Windows).
 * Keys match the language codes registered in index.js.
 */
const svg = (inner) =>
  `<svg viewBox="0 0 60 30" width="26" height="14" aria-hidden="true" focusable="false">${inner}</svg>`;

export const FLAGS = {
  // United Kingdom (simplified Union Jack)
  en: svg(
    '<rect width="60" height="30" fill="#012169"/>' +
      '<path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>' +
      '<path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" stroke-width="2"/>' +
      '<path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/>' +
      '<path d="M30,0 V30 M0,15 H60" stroke="#c8102e" stroke-width="6"/>'
  ),
  // Germany
  de: svg(
    '<rect width="60" height="10" fill="#000"/>' +
      '<rect y="10" width="60" height="10" fill="#dd0000"/>' +
      '<rect y="20" width="60" height="10" fill="#ffce00"/>'
  ),
};
