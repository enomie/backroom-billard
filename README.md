# Backroom Billard

3D-Billard im Browser (Three.js + Rapier): First-Person-Queue zum Zielen, echter 9-Fuß-Tisch, Kugeln mit Schwerkraft, die selbst ins Loch fallen.

**Hersteller:** Bad Habits Games · **Kontakt:** [bad.habits.games@proton.me](mailto:bad.habits.games@proton.me) (offizielle Adresse)

## Starten

```bash
npm install
npm run dev        # http://localhost:8181/
```

Produktion: `npm run build` und `npm run preview`. Der Port steht in `vite.config.js`.

**Auf einem Webserver (z. B. PHP; der Server des Herstellers hat nur HTML und PHP, sonst nichts):** `npm run build` und den Ordner `dist/` auf den Server kopieren, auch in einen Unterordner. Die Pfade sind relativ (`base: "./"` in `vite.config.js`), eine `.htaccess` für Apache (richtiger Typ für die `.wasm`-Datei der Physik) liegt dabei (`public/.htaccess`). Der Stream des Radios braucht Internet. **Das Radio ist [Jazz24](https://www.jazz24.org/)** (spenden: [jazz24.org/donate](https://www.jazz24.org/donate), über sie: [jazz24.org/about](https://www.jazz24.org/about)); das Spiel ist nicht von ihnen und spielt nur ihren Stream, im Einstellungs-Panel steht ein Hinweis mit den Links.

## Startscreen

Beim Öffnen steht zuerst ein schlichter Startscreen auf `#1c1c1a`, zentriert: **Bad Habits Games**, darunter **PRESENT**, der Titel in Limelight und der Knopf **Confirm Age 18+** (deutsch „Alter bestätigen 18+“; die Sprache kommt aus der gespeicherten Wahl, sonst aus dem Browser, sonst Englisch). Es gibt bewusst keinen „Verlassen“-Knopf, das kann der Browser. Das Spiel lädt im Hintergrund; sobald es bereit ist **und** das Alter bestätigt wurde, blendet der Screen aus. **Der Klick auf den Knopf schaltet den Ton frei und startet das Radio** (kein anderer Tastendruck tut das); das Alter wird bei jedem Besuch neu gefragt. Solange der Screen steht, tun die Spieltasten nichts. Danach kommt der **Welcome-Screen** (Name in drei Feldern, erstes Getränk und erste Zigaretten kaufen, Continue; Name, Auswahl und Geld bleiben im Browser, siehe [`_docs/welcome-screen.md`](_docs/welcome-screen.md)), dann das Spiel. Code: `src/start-screen.js`, `src/welcome-screen.js`, Markup in `index.html`, `src/entry.js` verbindet Laden und beide Screens.

## Steuerung

| Aktion | Eingabe |
|--------|---------|
| Zielen und Kamera drehen (auch während die Kugeln rollen) | Maus ziehen: links/rechts schwenken, hoch/runter kippen (10°–80° über dem Tisch; jeder neue Zug beginnt wieder flach mit 16°); `A` / `D` oder Pfeile links/rechts |
| Kraft (1 bis 100, in Einerschritten, ohne %-Zeichen) | Mausrad, `W` / `S` oder Pfeil hoch/runter, vertikaler farbiger Slider rechts (auch per Touch) |
| Stoß | Klick, `E` oder der SHOOT-Button unten in der Mitte |
| Kamera wechseln (Spieler-Kamera ↔ freie Kamera) | `C` oder der große Knopf „C · Player/Free Camera“ unten links |
| Freie Kamera (nur beobachten, Start: Seitenansicht auf Tisch und Lampen) | Maus umsehen (Klick fängt die Maus, `Esc` löst sie), `WASD` bewegen, `Leertaste` hoch, `Shift` runter; am Handy mit einem Finger: seitlich wischen dreht, nach oben näher ran, nach unten weiter weg; nicht unter Tischhöhe, 1 m Abstand zu Wänden und Decke |
| Trinken: antippen = ein Schluck, halten = Schluck für Schluck (5 pro Getränk) | `R` oder der Knopf „Drink“ unten links |
| Leeres Glas: Getränkekarte, Klick auf ein Getränk kauft es | Maus oder Touch |
| Neu aufbauen | `N` oder „Re-rack“ in den Einstellungen (Zahnrad oben rechts) |
| Ziehen an der Zigarette (halten = stärker) und ausatmen (loslassen) | `T` halten oder den Knopf „Smoke“ unten rechts gedrückt halten (Maus oder Touch) |

## Regeln

Die wichtigsten Regeln stehen auch im Spiel im Einstellungs-Panel (Abschnitt „Regeln“, `rules.*` in `src/i18n`); beim Ändern einer Regel beide Stellen pflegen.

- **Zustand:** Zwei Balken oben in der Mitte (Thirsty ↔ Drunk, Nerves ↔ Desire). Mit der Zeit wird man durstig und will rauchen; trinken und rauchen schieben die Marker. In der Mitte ist man ruhig, sonst schwankt der Cue (und wer betrunken ist, trifft ungenauer). Siehe `_docs/game-concept.md`.
- Versenkte Kugeln erscheinen als farbige Kreise im HUD, die weiße Kugel wird neu aufgelegt, **sobald alle anderen Kugeln stillstehen** (frühestens 0,6 s nach dem Versenken, `CUE_RESPAWN_DELAY`). Das gilt auch, wenn sie **vom Tisch geschossen** wird: Sie zählt wie versenkt und kommt erst bei Ruhe zurück (eine farbige Kugel, die vom Tisch springt, wird dagegen sofort auf einen freien Platz zurückgelegt).
- Die **schwarze 8 muss als letzte Kugel** versenkt werden. Sonst: **Game Lost**. Danach: **Gewonnen**.
- **Foul:** Berührt die Cue-Spitze beim Stoß **zuerst eine farbige Kugel** statt der weißen (etwa weil sie dicht hinter der weißen liegt), ist das Spiel **sofort verloren** (Game Lost, Meldung „Foul: Der Cue hat eine farbige Kugel statt der weißen getroffen.“). Berührt die Spitze die weiße Kugel zuerst oder gleichzeitig, gilt der Stoß.
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
| `furniture.js`, `furniture-constants.js` | Runde Tische mit Clubsesseln |
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
| `settings.js` | Einstellungen-Overlay: Re-rack, Sprache, Hinweise zur Bedienung |
| `welcome-screen.js`, `name-rules.js`, `profile-store.js` | Welcome-Screen (Name, erstes Getränk und Packung), Namensregeln, Profil im Browser |
| `start-screen.js` | Startscreen mit Alterbestätigung (blendet aus, wenn das Spiel geladen und bestätigt ist) |

Root: `index.html`, `style.css` (HUD), `vite.config.js`. Optik und Physik teilen sich dieselbe Geometrie, deshalb gibt es nur eine Quelle für Maße.

## Schriften

Alle Schriften liegen **im Repo** (`public/fonts/`, mit den Lizenzen), es wird nichts von Google geladen (Datenschutz, geht offline):
- **Limelight 400** nur für den Titel „BACKROOM BILLARD“ (auf die Buchstaben A–Z gekürzt, 5 KB) und für das goldene B auf der Tür.
- **Roboto** (variable Schrift) für alles andere, immer in **Breite 75 %** (`font-stretch: 75%` am `html`, auch für die Knöpfe); Latin und Latin-Erweiterung, die zweite wird nur geladen, wenn ein Zeichen daraus vorkommt.
- Die Dateien werden im `<head>` vorab geladen; der Start (`src/entry.js`) wartet höchstens 1,5 s auf sie, weil Text, der beim Start in Texturen gezeichnet wird (das B), sonst für immer in einer Ersatzschrift bliebe. Die Schrift in den Texturen der Flaschen, Packungen und der Radioskala ist bewusst eine Serifenschrift wie auf echten Etiketten.

## Sprachen

Die Oberfläche ist Englisch (Standard) und Deutsch; in den Einstellungen (Symbol oben rechts) wechseln die Flaggen die Sprache (wird gespeichert). Neue Sprache: Datei in `src/i18n/locales/` anlegen, Flagge in `flags.js` ergänzen, in `LANGUAGES` eintragen. Projektregeln (Sprache, Arbeitsweise): [`CLAUDE.md`](CLAUDE.md).

## Weiterführend

- [`_docs/table.md`](_docs/table.md) — Maße und Geometrie von Tisch, Bande und Taschen
- [`_docs/physics.md`](_docs/physics.md) — Physik-Modell und Stellschrauben
- [`_docs/game-concept.md`](_docs/game-concept.md) — Spielkonzept: Zustand (Balken), Trinken, Rauchen, Geld; Ideen (Mehrspieler, Wette)
- [`_docs/sound.md`](_docs/sound.md) — Klänge: Stoß, Kugeln, Bande, Rollen, Becher
- [`_docs/shot-animation.md`](_docs/shot-animation.md) — Stoß-Animation mit Zurückziehen, Vorschnalzen und physischer Cue-Spitze
- [`_docs/radio.md`](_docs/radio.md) — Radio auf dem Sideboard mit Display, Stream und Stereo-Lautsprechern
- [`_docs/bar.md`](_docs/bar.md) — Bar gegenüber dem Radio (Hauptmodul mit Silbersockel, Holzblock, Marmorplatte, und drei Hocker; Rückbuffet mit Marmorwand, Regalen und Flaschen)
- [`_docs/piano.md`](_docs/piano.md) — Flügel (spielbar mit der Maus, generativer Klang) mit geschlossenem Deckel, voller Klaviatur und Hocker an der Neon-Wand
- [`_docs/glass-objects.md`](_docs/glass-objects.md) — Kerzenhalter, Aschenbecher, Gläser, Flaschen, Trinken und Getränkekarte
- [`_docs/cigarettes.md`](_docs/cigarettes.md) — Zigaretten, Packung, Feuerzeug, Rauch, Rauchen mit `T`
- [`_docs/look.md`](_docs/look.md) — Optik des 80er-Raums: Raum, Leuchten, Nebel, Möbel, Spiegelungen
- [`_docs/welcome-screen.md`](_docs/welcome-screen.md) — Welcome-Screen nach dem Startscreen: Name in drei Feldern, erstes Getränk und erste Zigaretten kaufen, Speichern im Browser
- [`_docs/countries/`](_docs/countries/README.md) — Länderdaten aus einem anderen Projekt (71 ISO-Codes mit deutschen und englischen Namen, 42 Flaggen als SVG); nur Material, noch nicht im Spiel verwendet. Die Flaggen stammen von der VDMFK-Seite, die Nutzungsrechte sind nicht geklärt.

## Backup

`npm run backup` kopiert `src/` und die Root-Dateien nach `.backups/` (nicht im Repo). `npm run backup:structure` aktualisiert `src/structure.md`.
