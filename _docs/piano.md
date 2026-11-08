# Flügel

> **Status: umgesetzt** (Flügel mit geschlossenem Deckel, volle Klaviatur, Hocker). Nur zur Ansicht, man kann nicht darauf spielen.

Ein Konzertflügel in schwarzem Lack an der kurzen Wand **gegenüber der Tür**, neben dem Neonschild (`src/piano.js`, Maße in `src/piano-constants.js`).

- **Stellung:** In der **Mitte** der Wand (unter dem Neonschild), die Mitte des Flügels 2,1 m von der Wand, **um 45° gedreht** (`PIANO_TURN`): die Tastatur schaut schräg in den Raum, der Schwanz zur Wand.
- **Maße:** 1,55 m breit, 2,75 m lang, Zarge von 0,62 bis 0,98 m, darauf der **geschlossene Deckel** (3 cm). Die Umrissform: gerade Bassseite links, runder Schwanz, lange Kurve der Diskantseite rechts.
- **Klaviatur:** Die **volle Klaviatur** (A0 bis C8): 52 weiße Tasten (je 2,35 cm) und 36 schwarze in den Gruppen zu zwei und drei, zwischen zwei Wangen und unter einem Namensbrett mit Messingstreifen.
- **Beine:** Drei verjüngte Beine mit Messingfüßen, dazu die Pedalleiste mit drei Messingpedalen.
- **Kerze:** Auf dem Deckel steht **außermittig** (rechts der Mitte, `PIANO_CANDLE_LOCAL`) eine Kerze im Halter wie auf den Tischen (`candle.js`, Platz in `CANDLE_EXTRA_SPOTS`), mit Flamme, Schein und Licht für den Rauch.
- **Hocker:** gepolsterter Sitz (0,55 × 0,32 m, Höhe 0,52 m) auf vier Beinen, 40 cm vor der Klaviatur.
- Die Teile bekommen das Licht der Wandleuchten (`receiveWallLampsDeep`); die Tasten sind je eine Instanz-Gruppe (ein Aufruf zum Zeichnen).

## Offene Punkte (Ideen)

- Pedale und Tasten bewegen, Klavierklang, Notenständer, Deckel öffnen.
