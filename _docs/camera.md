# Kamera und Cue: Befund und Umbau (Plan)

> **Status: Plan, nichts davon ist umgesetzt.** Es gibt heute zwei Kameras (Spielerkamera hinter dem Cue, freie Kamera) und den Klavierhocker; der Wechsel dazwischen geht über mehrere Sonderwege. Hier steht, was an der Spielerkamera nicht stimmt (Teil 1, Ursachen), wie sie und der Cue zusammenpassen sollen (Teil 2) und wie die Kameras vereinfacht werden (Teil 3).

## 1. Befund (Ursachen)

1. **Die Kamera schaut nicht auf die weiße Kugel.** `placeAimCamera` (`billard.js`) kreist um die Kugel (`FP_CAM_DISTANCE` 1,02 m), schaut aber auf einen Punkt **1,88 m vor** der Kugel in Kugelhöhe (`FP_CAM_LOOK_AHEAD`, `room-constants.js`). Flach (16°) liegt die Kugel dabei ungefähr in der Bildmitte; je höher die Kamera, desto weiter rutscht sie im Bild nach unten (bei 45° etwa 26° unter der Mitte, bei 80° etwa 17°): am Rand oder ganz aus dem Bild.
2. **Der Cue folgt der Kamera nicht.** Seine Neigung (`aimCuePitch`) ist „Kamerahöhe minus `CUE_PITCH_BELOW_CAMERA` (0,16 rad)“, aber auf `CUE_PITCH_MAX` (0,5 rad, 29°) begrenzt, während die Kamera bis `FP_CAM_MAX_ELEVATION` (80°) steigt. Ab etwa 38° Kamerahöhe bleibt der Cue stehen, die Kamera steigt weiter. Die beiden Grenzen sind in **zwei Dateien unabhängig** voneinander festgelegt (`cue-constants.js`, `room-constants.js`), nichts verbindet sie.
3. **Zittern:** Es zittert nur der Cue (`aimSway`, `aimSwayPitch`); die Kamera benutzt beides nicht. Was sich an der Kamera bewegt, ist das **Zurückgleiten der Höhe auf die flache Standardhöhe** bei jedem neuen Zug (`elevationGlide`, gewollt) und das Nachziehen des Mittelpunkts zur Kugel (`FP_CAM_FOCUS_RATE`).

## 2. Spielerkamera und Cue (kleiner Eingriff)

**Eine** Höhe (`aimElevation`) treibt beides; die Grenzen des einen folgen aus denen des anderen:

- **Cue-Neigung** = Kamerahöhe − `CUE_PITCH_BELOW_CAMERA` (der Cue liegt etwas unter der Blickrichtung), ohne eigene zweite Begrenzung.
- **Grenzen** nur im Cue festgelegt: `CUE_PITCH_MIN` 0,04 rad, **`CUE_PITCH_MAX` 60°** (1,047 rad). Die Kamera darf genau so hoch und so tief wie der Cue es erlaubt: `FP_CAM_MIN_ELEVATION = CUE_PITCH_MIN + CUE_PITCH_BELOW_CAMERA`, `FP_CAM_MAX_ELEVATION = CUE_PITCH_MAX + CUE_PITCH_BELOW_CAMERA` (rund 69°), in den Konstanten abgeleitet statt doppelt von Hand gesetzt.
- **Die Kamera schaut immer auf die weiße Kugel** (etwas über ihrer Mitte); `FP_CAM_LOOK_AHEAD` entfällt. Position wie bisher: auf einem Kreis um die Kugel, Abstand 1,02 m, Höhe nach der gewählten Neigung.
- **Das Zurückgleiten** der Höhe auf die flache Standardhöhe (`FP_CAM_DEFAULT_ELEVATION` 0,28) zum nächsten Zug **bleibt**, ebenso das Nachziehen zur Kugel.
- **Zittern:** nur der Cue (wie bisher), die Kamera bleibt ruhig.
- Das Fadenkreuz (`aim-crosshair`) liegt dann auf der Kugel; zu entscheiden, ob es bleibt.
- **Prüfen:** in der flachen und in der höchsten Kamerahöhe: die Kugel bleibt in der Bildmitte, der Cue liegt in beiden gleich unter der Blickrichtung, ein Stoß aus der steilsten Stellung ist mit und ohne seitlichen Anschlag (Nubbel) unauffällig (die Kugel hüpft nicht, der Cue geht nicht durch den Filz). Hier bei Bedarf `CUE_PITCH_MAX` zurücknehmen.

## 3. Ein Kamerasystem statt Sonderwegen (größerer Umbau)

### Heute

Die Kamera ist eine einzige `camera`, die an verschiedenen Stellen direkt bewegt wird:

| Teil | Wo |
|------|----|
| Spielerkamera: Pose aus Winkel, Höhe, Mittelpunkt | `placeAimCamera`, `snapFpsCamera`, `camFocus`, jeden Frame |
| Freie Kamera: Pose aus `freeYaw`, `freePitch`, `camera.position` | `updateFreeCamera`, `confineFreeCamera`, `freeSavedPosition`, `freePoseSaved` |
| Wechsel Spieler ⇄ frei | `toggleCamera` (verändert `camera` direkt, speichert und holt Posen), `cameraFlight`, `applyCameraFlight` |
| Im Mehrspieler: Wechsel nach dem Zug | `mpWantCamera`, `placeFreeCameraBehindCue` |
| Klavier | `pianoMode` („off“, „entering“, „on“, „leaving“), `pianoTransition`, `pianoReturn`, `enterPiano`, `leavePiano`, `updatePianoMove` |

Zwei Zustandsvariablen (`cameraMode`, `pianoMode`) und drei Übergangsmechanismen (Flug, Klavierflug, direktes Setzen) für dasselbe: „wo steht die Kamera jetzt“. Das macht jeden Wechsel anfällig (gespeicherte Posen, `cameraMode`-Abfragen an rund 50 Stellen).

### Ziel

- **Ein Zustand** `camMode`: `"cue"` (Spielerkamera), `"free"`, `"piano"`.
- **Eine Zielpose je Modus**, als reine Funktion (Position und Drehung, ohne die Kamera zu verändern):
  - `cuePose()`: hinter der Kugel, schaut auf sie (Teil 2).
  - `freePose()`: aus **eigenen** Variablen `freePosition`, `freeYaw`, `freePitch` (nicht mehr aus `camera`); nur im Modus „free“ bewegen Tasten und Maus sie.
  - `pianoPose()`: der Hocker (`piano.seat()`).
- **Eine** Übergangsregel: Bei einem Wechsel wird die **aktuelle Pose** gemerkt und `t = 0` gesetzt; jeden Frame ist die Kamera `Mischung(gemerkte Pose, Zielpose des Modus, weich(t))`; bei `t = 1` ist sie genau die Zielpose. Das ist der heutige Flug, aber **für alle Wechsel gleich** und ohne gesonderten Fall für die Spielerkamera.
- Die freien Variablen bleiben beim Sitzen am Klavier unberührt: **Aufstehen = zurück in den Modus „free“**, `pianoReturn` und `freeSavedPosition` entfallen.
- **Mehrspieler:** `mpWantCamera` wird zu einem einzigen „gewünschten Modus“, den das Spiel setzt (am Zug: „cue“; nach dem Zug und für Zuschauer: „free“; Klavier nur, wenn man frei ist). Der Anfangsort der freien Kamera nach dem Zug („hinter und über dem Cue“, `placeFreeCameraBehindCue`) wird einmal beim Wechsel in „free“ in die freien Variablen geschrieben.
- Die **Kopfposition für die anderen** (`multiplayer.update`) und alle Strahlen von der Kamera (Radio, Klavier, Gesichter) lesen weiter die tatsächliche `camera`.

### Schritte (jeder lauffähig und geprüft)

1. **Freie Kamera mit eigenen Variablen:** `freePosition` neben `freeYaw`, `freePitch`; `updateFreeCamera` und `confineFreeCamera` arbeiten darauf und schreiben die Pose in die Kamera. Verhalten unverändert. *Prüfen:* freie Kamera laufen und umschauen (Maus, Tasten, Handy), Gesichter und Wand-Begrenzung wie vorher.
2. **Zielposen als Funktionen:** `cuePose()` aus `placeAimCamera` (reine Berechnung mit der Änderung aus Teil 2), `freePose()`, `pianoPose()`. Die Kamera wird noch wie bisher gesetzt. *Prüfen:* wie Schritt 1, dazu die Spielerkamera.
3. **Ein `updateCamera(dt)` und eine Übergangsregel:** ersetzt `placeAimCamera`-Aufrufe, `applyCameraFlight`, `updatePianoMove`; `toggleCamera`, `enterPiano`, `leavePiano` setzen nur noch den Modus. `cameraFlight`, `pianoTransition`, `pianoReturn`, `freeSavedPosition`, `freePoseSaved` fallen weg. *Prüfen:* alle Wechsel im Einzelspiel: `C` hin und zurück, Stoß (`E`), Klavier `F`/`Esc`, neues Rack, Wechsel während des Fluges (doppelt drücken).
4. **Mehrspieler:** `mpWantCamera` und `placeFreeCameraBehindCue` auf den gewünschten Modus umstellen. *Prüfen:* mit zwei Browsern: Zugwechsel, der andere schaut zu, Zuschauer, Klavier setzen, wenn man dran wird (steht sofort auf), Stoß-Wiedergabe.
5. **Aufräumen:** `cameraMode`/`pianoMode`-Reste, tote Hilfsvariablen, Docs ([`game-concept.md`](game-concept.md), [`piano.md`](piano.md), [`multiplayer.md`](multiplayer.md)).

### Risiken

- Die Eingaben (Maus, Touch, Tasten, Klavier-Strahlen) fragen heute `cameraMode` und `pianoMode` ab; alle Stellen müssen auf `camMode` umgestellt werden (rund 50), sonst reagiert eine Eingabe im falschen Modus.
- Der weiche Übergang zur Spielerkamera, deren Ziel sich bewegt (die Kugel rollt noch), muss jeden Frame neu gemischt werden (macht die Übergangsregel ohnehin).
- Ohne Browser-Tests über alle Wege gibt es leicht eine Lücke; deshalb die Prüfschritte oben.
