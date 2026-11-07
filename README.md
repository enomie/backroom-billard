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
| Zielen und Kamera drehen (auch während die Kugeln rollen) | Maus ziehen: links/rechts schwenken, hoch/runter kippen (10°–80° über dem Tisch); `A` / `D` oder Pfeile links/rechts |
| Kraft (1-%-Schritte) | Mausrad, `W` / `S` oder Pfeil hoch/runter, vertikaler farbiger Slider rechts (auch per Touch) |
| Stoß | Klick, Leertaste oder der SHOOT-Button unten in der Mitte |
| Kamera wechseln (Queue-Ansicht ↔ freie Kamera) | `C` oder der Button unten links |
| Freie Kamera (nur beobachten, Start: Seitenansicht auf Tisch und Lampen) | Maus umsehen (Klick fängt die Maus, `Esc` löst sie), `WASD` bewegen, `Leertaste` hoch, `Shift` runter; nicht unter Tischhöhe, 1 m Abstand zu Wänden und Decke |
| Neu aufbauen | `R` |

## Regeln

- Versenkte Kugeln erscheinen als farbige Kreise im HUD, die weiße Kugel wird neu aufgelegt.
- Die **schwarze 8 muss als letzte Kugel** versenkt werden. Sonst: **Game Lost**. Danach: **Gewonnen**.
- Ein Stoß ist eine Animation: Der Cue wird zurückgezogen und schnalzt nach vorn; die Kugel bekommt ihre Geschwindigkeit durch die echte Kollision der Cue-Spitze.
- Nach dem Stoß bleibt die Kamera auf der Schussposition (sie folgt den Kugeln nicht), lässt sich aber weiter um sie drehen. Erst wenn alle Kugeln (nahezu) stillstehen, gleitet sie zur neuen Schussposition; bis dahin ist kein neuer Stoß möglich.
- Während die Kugeln rollen **und** mit der freien Kamera hält der Spieler den Queue entspannt vor sich: Griff unten im Bild, Spitze oberhalb rechts; nach dem Stillstand schwingt er sanft zurück an die Kugel. Die Pose steht in `src/cue-constants.js`.
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
| `radio.js`, `radio-audio.js`, `radio-metadata.js`, `radio-constants.js` | Sideboard mit Radio, Stream, Titelanzeige und Raumklang über zwei Lautsprecher |
| `audio.js`, `shot-sounds.js`, `collision-sounds.js`, `cup-sounds.js`, `rolling-sound.js`, `synth-utils.js`, `sound-constants.js` | Audio-Kontext und alle generierten Klänge |
| `cue-model.js`, `cue-constants.js` | Der Queue (Gummispitze, Zwinge, Ahorn-Schaft, Messing-Verbindung, dunkles Griffstück) und seine Haltepose nach dem Stoß |
| `furniture.js`, `furniture-constants.js` | Runde Tische mit Clubsesseln, Sperrkreise für die freie Kamera |
| `ball-reflection.js` | Raum-Spiegelung in den Kugeln (Würfel-Karte, Lampenflecken) |
| `room.js`, `wood.js`, `ceiling-lamps.js`, `wall-lamps.js`, `room-constants.js` | Raum (Teppich, Wände mit Holzvertäfelung, Holzdecke, Nebel), Holz-Material, Decken- und Wandleuchten und alle Parameter dazu |
| `i18n/` | Übersetzungen (`locales/`), Flaggen, Sprachumschalter |

Root: `index.html`, `style.css` (HUD), `vite.config.js`. Optik und Physik teilen sich dieselbe Geometrie, deshalb gibt es nur eine Quelle für Maße.

## Sprachen

Die Oberfläche ist Englisch (Standard) und Deutsch; oben rechts wechseln die Flaggen die Sprache (wird gespeichert). Neue Sprache: Datei in `src/i18n/locales/` anlegen, Flagge in `flags.js` ergänzen, in `LANGUAGES` eintragen. Projektregeln (Sprache, Arbeitsweise): [`CLAUDE.md`](CLAUDE.md).

## Weiterführend

- [`_docs/table.md`](_docs/table.md) — Maße und Geometrie von Tisch, Bande und Taschen
- [`_docs/physics.md`](_docs/physics.md) — Physik-Modell und Stellschrauben
- [`_docs/game-concept.md`](_docs/game-concept.md) — Spielideen (nur Ideen, nicht umgesetzt)
- [`_docs/sound.md`](_docs/sound.md) — Klänge: Stoß, Kugeln, Bande, Rollen, Becher
- [`_docs/shot-animation.md`](_docs/shot-animation.md) — Stoß-Animation mit Zurückziehen, Vorschnalzen und physischer Cue-Spitze
- [`_docs/radio.md`](_docs/radio.md) — Radio auf dem Sideboard mit Display, Stream und Stereo-Lautsprechern
- [`_docs/glass-objects.md`](_docs/glass-objects.md) — Konzept: Gläser, Flaschen, Aschenbecher, Kerzenhalter (noch nicht umgesetzt)
- [`_docs/cigarettes.md`](_docs/cigarettes.md) — Konzept: Zigaretten, Schachtel und Rauch-Shader (noch nicht umgesetzt)
- [`_docs/look.md`](_docs/look.md) — Optik-Vorgaben für den 80er-Raum (noch nicht umgesetzt)

## Backup

`npm run backup` kopiert `src/` und die Root-Dateien nach `.backups/` (nicht im Repo). `npm run backup:structure` aktualisiert `src/structure.md`.
