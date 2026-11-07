# Backroom Billard

3D-Billard im Browser (Three.js + Rapier): First-Person-Queue zum Zielen, echter 9-Fuß-Tisch, Kugeln mit Schwerkraft, die selbst ins Loch fallen.

## Starten

```bash
npm install
npm run dev        # http://localhost:8181/
```

Produktion: `npm run build` und `npm run preview`. Der Port steht in `vite.config.js`.

## Steuerung

| Aktion | Eingabe |
|--------|---------|
| Zielen | Maus ziehen, `A` / `D` oder Pfeile |
| Kraft | Mausrad, Slider, `W` / `S` |
| Stoß | Klick, Leertaste, Button |
| Kamera / Reset | `C` / `R` |

## Regeln

- Versenkte Kugeln erscheinen als farbige Kreise im HUD, die weiße Kugel wird neu aufgelegt.
- Die **schwarze 8 muss als letzte Kugel** versenkt werden. Sonst: **Game Lost**. Danach: **Gewonnen**.
- Nach dem Spielende sind Stöße gesperrt, „Neu aufbauen“ (oder `R`) startet neu.

## Aufbau

| Datei (`src/`) | Rolle |
|----------------|-------|
| `entry.js` | Einstieg: lädt Three.js, Rapier, dann die Spielmodule |
| `billard.js` | Szene, Kugeln, Steuerung, Kamera, Spielschleife |
| `table-constants.js` | Alle Tischmaße (WPA 9 Fuß) |
| `table-blueprint.js` | Tisch bauen: Platte, Banden, Holz, Becher |
| `pocket-spec.js` | Taschen-Maße, Bandenspitzen, Becher-Maße |
| `table-csg.js`, `csg-brush.js` | Löcher per Boolean-Operation ausschneiden |
| `physics-world.js` | Rapier-Welt, Collider aus der gerenderten Geometrie |
| `physics-rapier.js` | Kugel-Körper, Trimesh-Helfer |
| `physics-constants.js` | Reibung, Dämpfung, Restitution, Zeitschritt |
| `i18n/` | Übersetzungen (`locales/`), Flaggen, Sprachumschalter |

Root: `index.html`, `style.css` (HUD), `vite.config.js`. Optik und Physik teilen sich dieselbe Geometrie, deshalb gibt es nur eine Quelle für Maße.

## Sprachen

Die Oberfläche ist Englisch (Standard) und Deutsch; oben rechts wechseln die Flaggen die Sprache (wird gespeichert). Neue Sprache: Datei in `src/i18n/locales/` anlegen, Flagge in `flags.js` ergänzen, in `LANGUAGES` eintragen. Projektregeln (Sprache, Arbeitsweise): [`CLAUDE.md`](CLAUDE.md).

## Weiterführend

- [`_docs/table.md`](_docs/table.md) — Maße und Geometrie von Tisch, Bande und Taschen
- [`_docs/physics.md`](_docs/physics.md) — Physik-Modell und Stellschrauben
- [`_docs/game-concept.md`](_docs/game-concept.md) — Spielideen (nur Ideen, nicht umgesetzt)
- [`_docs/look.md`](_docs/look.md) — Optik-Vorgaben für den 80er-Raum (noch nicht umgesetzt)

## Backup

`npm run backup` kopiert `src/` und die Root-Dateien nach `.backups/` (nicht im Repo). `npm run backup:structure` aktualisiert `src/structure.md`.
