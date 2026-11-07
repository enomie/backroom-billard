# Stoß-Animation

> **Status: umgesetzt** (Zurückziehen, Spannung, Vorschnalzen, physischer Treffer, Klänge für Zurückziehen, Vorschnalzen und Abstoß, siehe `sound.md`).

## Ablauf

Ein Klick, die Leertaste oder der SHOOT-Button löst **nicht sofort** den Stoß aus, sondern startet eine Animation. Erst wenn die Spitze die Kugel erreicht, bekommt die Kugel ihre Geschwindigkeit — **durch die echte Kollision der Cue-Spitze**, nicht durch einen künstlichen Impuls.

| Phase | Beschreibung | Abhängigkeit von der Kraft |
|-------|--------------|----------------------------|
| **Zielen** | Die Spitze ruht **dicht an der Kugel** (1,2 cm Abstand, `CUE_AIM_GAP`). | – |
| **1. Zurückziehen** | Der Cue gleitet nach hinten (weich anfahren und abbremsen). | Mehr Kraft = weiter (8–34 cm) und länger (0,25–0,55 s). |
| **2. Spannung** | Kurzer Halt am hinteren Punkt. | 0,05–0,2 s, bei mehr Kraft länger. |
| **3. Vorschnalzen** | Der Cue beschleunigt nach vorn. | Die Endgeschwindigkeit entspricht der gewünschten Kugelgeschwindigkeit (1,1–4,2 m/s), also deutlich schneller bei mehr Kraft. |
| **4. Treffer** | Die Spitze berührt die Kugel: Kollision in Rapier, Abstoß-Klang. | – |
| **5. Nachschwung** | Der Cue läuft noch 2 cm weiter, bleibt kurz stehen und schwingt dann in die Haltepose (siehe unten). | – |

Während der Animation sind Zielen, Kraft und ein zweiter Stoß ohne Wirkung.

## Kamera und Cue-Ausrichtung

- **Kamera:** Sie kreist ohne Glättung direkt um die Schussposition (`placeAimCamera`, Winkel und Höhe 10°–80°, `FP_CAM_*`), damit Kamera, Zielhilfe und Cue nie gegeneinander ruckeln. Sie bleibt dort, bis alle Kugeln stillstehen, und ist die ganze Zeit drehbar.
- **Cue:** Er zeigt in Blickrichtung der Kamera, seine Neigung folgt der Kamerahöhe und liegt etwas darunter (`CUE_PITCH_*`, höchstens ca. 29°). Die Stoßgeschwindigkeit wird für die Neigung ausgeglichen.

## Die Spitze ist physisch

Die Cue-Spitze ist ein eigener Körper in Rapier (kinematisch, `physics-world.js`). Seine Form ist die **echte Form des Cue-Endes**: eine Kuppe mit 9,5 mm Krümmungsradius, die Gummispitze und die Zwinge als konvexe Hülle. Maße kommen aus `cue-model.js`, damit Optik und Kollision zusammenpassen.

- **Material:** Reibung 0,8 (Leder mit Kreide), Restitution 0 (die Spitze federt nicht; die Kugel verlässt die Spitze mit deren Geschwindigkeit).
- **Nur gegen Kugeln:** Die Spitze kollidiert mit keinem Tisch, keiner Bande und keinem Becher. Sie ist nur während des Vorschnalzens aktiv.
- **Genauigkeit:** Beim Vorschnalzen läuft die Physik in 8 Teilschritten, damit die schnelle Spitze nicht in die Kugel eindringt. Die Kugelgeschwindigkeit liegt dadurch bei allen Kraftstufen auf ±1 % am Sollwert.
- **Neigung:** Die Cue-Achse geht durch die Kugelmitte. Ein geneigter Cue drückt die Kugel leicht auf den Tisch; deshalb ist die Neigung begrenzt.
- **Sicherheitsnetz:** Falls der Stoß die Kugel nicht bewegt, bekommt sie den vorgesehenen Impuls und es gibt eine Konsolen-Warnung.

## Haltepose nach dem Stoß

Während die Kugeln rollen und mit der freien Kamera hält der Spieler den Cue fast senkrecht im Bild (Griff unten, Spitze oben rechts). Die Pose steht in `cue-constants.js` (`CUE_CARRY_*`).

## Einstellungen

Alle Werte stehen in `src/cue-constants.js` (Abstände, Zeiten, Nachlaufweg, Teilschritte) und `src/physics-constants.js` (Spitzenmaterial, Krümmungsradius).

## Offene Punkte

- Abbruch vor dem Vorschnalzen (z. B. `Esc`)?
- Soll die Kamera beim Zurückziehen leicht zoomen oder wackeln (bei viel Kraft)?
- Seitlicher oder hoher/tiefer Treffpunkt auf der Kugel (Effet): Die Spitzenform erlaubt es, die Steuerung gibt es noch nicht.
