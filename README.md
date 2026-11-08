# Backroom Billard

3D-Billard im Browser (Three.js + Rapier): First-Person-Queue zum Zielen, echter 9-Fuß-Tisch, Kugeln mit Schwerkraft, die selbst ins Loch fallen.

## Starten

```bash
npm install
npm run dev        # http://localhost:8181/
```

Produktion: `npm run build` und `npm run preview`. Der Port steht in `vite.config.js`.

**Auf einem Webserver (z. B. PHP):** `npm run build` und den Ordner `dist/` auf den Server kopieren, auch in einen Unterordner. Die Pfade sind relativ (`base: "./"` in `vite.config.js`), eine `.htaccess` für Apache (richtiger Typ für die `.wasm`-Datei der Physik) liegt dabei (`public/.htaccess`). Der Stream des Radios braucht Internet.

## Steuerung

| Aktion | Eingabe |
|--------|---------|
| Zielen und Kamera drehen (auch während die Kugeln rollen) | Maus ziehen: links/rechts schwenken, hoch/runter kippen (10°–80° über dem Tisch; jeder neue Zug beginnt wieder flach mit 16°); `A` / `D` oder Pfeile links/rechts |
| Kraft (1-%-Schritte) | Mausrad, `W` / `S` oder Pfeil hoch/runter, vertikaler farbiger Slider rechts (auch per Touch) |
| Stoß | Klick, Leertaste oder der SHOOT-Button unten in der Mitte |
| Kamera wechseln (Spieler-Kamera ↔ freie Kamera) | `C` oder der große Knopf „C · Player/Free Camera“ unten links |
| Freie Kamera (nur beobachten, Start: Seitenansicht auf Tisch und Lampen) | Maus umsehen (Klick fängt die Maus, `Esc` löst sie), `WASD` bewegen, `Leertaste` hoch, `Shift` runter; nicht unter Tischhöhe, 1 m Abstand zu Wänden und Decke |
| Trinken: antippen = ein Schluck, halten = Schluck für Schluck (5 pro Getränk) | `R` oder der Knopf „Drink“ unten links neben dem Shoot-Button |
| Leeres Glas: Getränkekarte, Klick auf ein Getränk kauft es | Maus oder Touch |
| Neu aufbauen | `N` oder der Knopf „Re-rack“ oben rechts |
| Ziehen an der Zigarette (halten = stärker) und ausatmen (loslassen) | `T` halten oder den Knopf „Smoke“ unten links gedrückt halten (Maus oder Touch) |

## Regeln

- **Zustand:** Zwei Balken oben in der Mitte (Thirsty ↔ Drunk, Nerves ↔ Desire). Mit der Zeit wird man durstig und will rauchen; trinken und rauchen schieben die Marker. In der Mitte ist man ruhig, sonst schwankt der Cue (und wer betrunken ist, trifft ungenauer). Siehe `_docs/game-concept.md`.
- Versenkte Kugeln erscheinen als farbige Kreise im HUD, die weiße Kugel wird neu aufgelegt.
- Die **schwarze 8 muss als letzte Kugel** versenkt werden. Sonst: **Game Lost**. Danach: **Gewonnen**.
- Ein Stoß ist eine Animation: Der Cue wird zurückgezogen und schnalzt nach vorn; die Kugel bekommt ihre Geschwindigkeit durch die echte Kollision der Cue-Spitze.
- Nach dem Stoß bleibt die Kamera auf der Schussposition (sie folgt den Kugeln nicht), lässt sich aber weiter um sie drehen. Erst wenn alle Kugeln (nahezu) stillstehen, gleitet sie zur neuen Schussposition; bis dahin ist kein neuer Stoß möglich.
- Während die Kugeln rollen **und** mit der freien Kamera hält der Spieler den Queue entspannt vor sich: Griff unten im Bild, Spitze oberhalb rechts; nach dem Stillstand schwingt er sanft zurück an die Kugel. Die Pose steht in `src/cue-constants.js`.
- Nach dem Spielende sind Stöße gesperrt, „Neu aufbauen“ (`N` oder der Knopf) startet neu.

## Leistung (ohne sichtbare Änderung)

Stand: volle Bildrate des Monitors (75 fps bei 75 Hz, 120 fps auf einem 120-Hz-Monitor), Pixelverhältnis 1: Schleife ca. 1,8 ms, GPU ca. 9,5 ms pro Bild, 185 Draw-Calls. Die Bremse war die **GPU**, nicht die Schleife (der Hauptthread war fast leer); die Hauptlast waren die Wandlampen. Alle Maßnahmen lassen die Optik unverändert.

- **Wandlampen (größter Gewinn, ca. −37 ms GPU):** kein Three.js-Licht, sondern ein eigener Shader-Baustein nur in den Materialien, die sie erreicht (`wall-lamp-light.js`, `_docs/look.md`). Three.js rechnet jedes Licht für jedes Pixel jedes Materials, auch wo es nicht ankommt.
- **Schatten:** Die Schattenkarten der Lampen werden nur neu gezeichnet, wenn sich im Lampenkegel etwas bewegt (Kugeln, Cue, Zigaretten, Feuerzeuge), sonst nie; `updateShadows` in `billard.js`. Möbel, Kerzen und Radio werfen keine Schatten (außerhalb der Kegel).
- **Draw-Calls:** gleiche Teile sind instanziert oder zusammengefasst (Wandlampen, Kerzenhalter, Diamanten, Tischteile der Raumtische, Schachtel-Karton auf den Tischen).
- **Physik:** im Ruhezustand wird nichts berechnet (siehe `_docs/physics.md`).
- **Nebel und Rauch:** Fragmente ohne Wirkung werden vor der Lichtberechnung verworfen. HUD und Audio-Hörer schreiben nur bei Änderung.
- Statische Gruppen (`STATIC_GROUPS`) berechnen ihre Matrizen nicht jedes Bild neu.
- **Messen:** Mit `?perf` hinter der Adresse (z. B. `http://localhost:5173/?perf`) erscheint unten rechts ein Entwickler-Overlay (`src/perf-hud.js`): fps, CPU-Zeit der Schleife und von `render`, **GPU-Zeit** (Timer-Query), Draw-Calls, Dreiecke, Programme, dazu Schalter für Nebelschichten, Schatten und Pixelverhältnis. Ist `loop`/`render` klein und `gpu` groß, begrenzt die Grafikkarte.
- **Reserve für schwächere Geräte** (nicht umgesetzt, die Optik soll bleiben): Materialien mit Klarlack (Vertäfelung, Kugeln), die 11 Nebelschichten, Retina-Pixelverhältnis 2 (4× Pixel), die 4 Kerzen-Punktlichter (bleiben wie sie sind).

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
| `candle.js`, `candle-constants.js` | Kerzenhalter mit Kerze, Flamme und flackerndem Schein auf jedem Tisch |
| `ashtray.js`, `ashtray-constants.js` | Glas-Aschenbecher auf Tischen und am Billardtisch |
| `glasses.js`, `glasses-constants.js` | Wein-, Bier- und Whiskeyglas mit Getränk auf Tischen und am Billardtisch |
| `bottles.js`, `bottles-constants.js` | Wein- und Bierflaschen auf den Tischen |
| `lighter.js`, `lighter-constants.js`, `lighter-sounds.js` | Zippo-Feuerzeuge (silbern und golden) |
| `wallet.js`, `drink-menu.js`, `shop-constants.js` | Geld, Getränkekarte, Preise |
| `player-state.js`, `player-constants.js`, `drinking.js`, `drink-sounds.js` | Zustand des Spielers (die zwei Balken), Trinken |
| `cigarettes.js`, `cigarette-pack.js`, `cigarette-constants.js`, `smoking.js`, `smoke.js`, `exhale.js`, `smoke-sounds.js` | Zigaretten, Klappschachtel, Rauchen mit `T`, Rauchfaden und Ausatem-Wolke |
| `ball-reflection.js` | Raum-Spiegelung in den Kugeln (Würfel-Karte, Lampenflecken) |
| `smoke-light.js`, `noise-glsl.js` | Gemeinsamer Shader-Code für Rauch und Nebel: Beleuchtung durch Lampen und Kerzen, Rauschen |
| `atmosphere.js` | Wandernder Boden- und Deckennebel, sichtbare Lichtkegel der Deckenleuchten |
| `door.js`, `door-constants.js` | Doppelte Pendeltür aus Holz und Bernsteinglas in der Wand hinter dem Spieler (Attrappe) |
| `room.js`, `wood.js`, `ceiling-lamps.js`, `wall-lamps.js`, `wall-lamp-places.js`, `wall-lamp-light.js`, `room-constants.js` | Raum (Teppich, Wände mit Holzvertäfelung, Holzdecke, Nebel), Holz-Material, Decken- und Wandleuchten und alle Parameter dazu |
| `i18n/` | Übersetzungen (`locales/`), Flaggen, Sprachumschalter |

Root: `index.html`, `style.css` (HUD), `vite.config.js`. Optik und Physik teilen sich dieselbe Geometrie, deshalb gibt es nur eine Quelle für Maße.

## Sprachen

Die Oberfläche ist Englisch (Standard) und Deutsch; oben rechts wechseln die Flaggen die Sprache (wird gespeichert). Neue Sprache: Datei in `src/i18n/locales/` anlegen, Flagge in `flags.js` ergänzen, in `LANGUAGES` eintragen. Projektregeln (Sprache, Arbeitsweise): [`CLAUDE.md`](CLAUDE.md).

## Weiterführend

- [`_docs/table.md`](_docs/table.md) — Maße und Geometrie von Tisch, Bande und Taschen
- [`_docs/physics.md`](_docs/physics.md) — Physik-Modell und Stellschrauben
- [`_docs/game-concept.md`](_docs/game-concept.md) — Spielkonzept: Zustand (Balken), Trinken, Rauchen, Geld; Ideen (Mehrspieler, Wette)
- [`_docs/sound.md`](_docs/sound.md) — Klänge: Stoß, Kugeln, Bande, Rollen, Becher
- [`_docs/shot-animation.md`](_docs/shot-animation.md) — Stoß-Animation mit Zurückziehen, Vorschnalzen und physischer Cue-Spitze
- [`_docs/radio.md`](_docs/radio.md) — Radio auf dem Sideboard mit Display, Stream und Stereo-Lautsprechern
- [`_docs/glass-objects.md`](_docs/glass-objects.md) — Kerzenhalter, Aschenbecher, Gläser, Flaschen, Trinken und Getränkekarte
- [`_docs/cigarettes.md`](_docs/cigarettes.md) — Zigaretten, Packung, Feuerzeug, Rauch, Rauchen mit `T`
- [`_docs/look.md`](_docs/look.md) — Optik des 80er-Raums: Raum, Leuchten, Nebel, Möbel, Spiegelungen

## Backup

`npm run backup` kopiert `src/` und die Root-Dateien nach `.backups/` (nicht im Repo). `npm run backup:structure` aktualisiert `src/structure.md`.
