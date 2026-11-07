# Projektregeln (Backroom Billard)

## Sprache

- **Code, Code-Kommentare, Bezeichner, Log- und Fehlermeldungen, Commit-Messages: immer Englisch.**
- **Docs (`README.md`, `_docs/`, diese Datei) und Gespräche: Deutsch.**
- **Oberfläche: Englisch ist die Hauptsprache.** Jeder sichtbare Text läuft durch `src/i18n`, nie hartcodiert im HTML oder JS.

## Übersetzungen (`src/i18n/`)

- Statische Texte: `data-i18n="key"` (sowie `data-i18n-aria-label`, `data-i18n-title`) im HTML, englischer Text als Fallback im Markup.
- Dynamische Texte: `t("key", { param })` im Code; beim Sprachwechsel neu rendern über `onLanguageChange`.
- Neue Sprache: `locales/<code>.js` anlegen (Kopie von `en.js`), Flagge in `flags.js` ergänzen, in `LANGUAGES` (`index.js`) eintragen. Fehlende Schlüssel fallen auf Englisch zurück.
- Neuer UI-Text: Schlüssel **immer in allen Sprachdateien** anlegen.

## Arbeitsweise

- Änderungen direkt auf `main` pushen, keine Branches.
- Maße nur in `src/table-constants.js`, Physik-Werte nur in `src/physics-constants.js`.
- Docs minimal halten (Überblick für Neueinsteiger); beim Ändern von Verhalten die betroffene Doc-Seite mitpflegen.
- Kein toter Code; nach Änderungen `npm run build` und im Browser prüfen.
- `_docs/game-concept.md` (Spielideen), `_docs/look.md` (Optik-Vorgaben, teils umgesetzt), `_docs/cigarettes.md` (Konzept, nicht umgesetzt) sind **Konzept-Docs**: nichts davon umsetzen oder einplanen, solange es nicht ausdrücklich beauftragt wird.
