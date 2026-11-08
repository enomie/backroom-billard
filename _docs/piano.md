# Flügel

> **Status: umgesetzt** (Flügel mit geschlossenem Deckel, volle Klaviatur, Hocker). Man kann mit der Maus darauf spielen.

Ein Konzertflügel in schwarzem Lack an der kurzen Wand **gegenüber der Tür**, neben dem Neonschild (`src/piano.js`, Maße in `src/piano-constants.js`).

- **Stellung:** In der **Mitte** der Wand (unter dem Neonschild), die Mitte des Flügels 4,1 m von der Wand, **um 45° gedreht** (`PIANO_TURN`): die Tastatur schaut schräg in den Raum, der Schwanz zur Wand.
- **Maße:** 1,55 m breit, 2,75 m lang, Zarge von 0,62 bis 0,98 m, darauf der **geschlossene Deckel** (3 cm). Die Umrissform: gerade Bassseite links, runder Schwanz, lange Kurve der Diskantseite rechts.
- **Klaviatur:** Die **volle Klaviatur** (A0 bis C8): 52 weiße Tasten (je 2,35 cm) und 36 schwarze in den Gruppen zu zwei und drei, zwischen zwei Wangen und unter einem Namensbrett mit Messingstreifen.
- **Beine:** Drei verjüngte Beine mit Messingfüßen, dazu die Pedalleiste mit drei Messingpedalen.
- **Kerze:** Auf dem Deckel steht **außermittig** (rechts der Mitte, `PIANO_CANDLE_LOCAL`) eine Kerze im Halter wie auf den Tischen (`candle.js`, Platz in `CANDLE_EXTRA_SPOTS`), mit Flamme, Schein und Licht für den Rauch.
- **Hocker:** gepolsterter Sitz (0,55 × 0,32 m, Höhe 0,52 m) auf vier Beinen, 40 cm vor der Klaviatur.
- Die Teile bekommen das Licht der Wandleuchten (`receiveWallLampsDeep`); die Tasten sind je eine Instanz-Gruppe (ein Aufruf zum Zeichnen).

## Spielen

- **Bedienung mit der Maus:** Maustaste auf eine Taste **drücken und halten**: Die Taste senkt sich und der Ton klingt; beim Loslassen dämpft der Ton ab. Im Sitzen zeigt der Mauszeiger; bis 5 m Entfernung. Die schwarzen Tasten liegen über den weißen. Ein Klick auf eine Taste schießt nicht und zielt nicht.
- **Hinsetzen:** In der freien Kamera erscheint **nahe am Flügel** (unter 2,5 m, `PIANO_ENTER_DISTANCE`) links am Rand der Knopf **Klavier spielen (F)**. `F` oder der Knopf setzt dich hin: Die Kamera fährt weich auf den Hocker (Augenhöhe 1,3 m, `PIANO_SEAT_*`) und schaut auf die Tasten; die Bewegung ist dabei gesperrt, die Maus zeigt als normaler Zeiger auf die Tasten (kein Umschauen, kein Schuss). **Esc**, `F` oder der Knopf **Klavier verlassen** bringt die Kamera zurück an die alte Stelle. Die Kamera-Taste ist im Sitzen gesperrt.
- **Computertastatur** (nur im Sitzen): alle Tasten gehören dem Klavier. Untere Reihe `Z S X D C V G B H N J M , L . ; /` ab dem mittleren C (C4; schwarze Tasten `S D G H J` und `L`), obere Reihe `Q 2 W 3 E R 5 T 6 Y 7 U I 9 O 0 P [ = ]` ab C5 (schwarze `2 3 5 6 7 9 0`). **Akkorde gehen** (mehrere Tasten gleichzeitig); Halten = Ton klingt, Loslassen = Dämpfer. Die Zuordnung steht in `PIANO_COMPUTER_KEYS`. Am Handy: der Knopf setzt hin, Antippen der Tasten spielt.
- **Töne:** Alle 88 Tasten (A0 bis C8) mit den richtigen Tonhöhen (A4 = 440 Hz).
- **Klang** (`src/piano-sound.js`, Werte `PIANO_*` in `piano-constants.js`): ohne Samples, **generativ**. Jede Note besteht aus einigen Sinusteiltönen (tiefe Noten bis 9, hohe 3), leicht gedehnt wie bei echten Saiten (Inharmonizität), die zwei tiefsten doppelt und minimal verstimmt (zwei Saiten pro Ton, das gibt das lebendige Schweben), dazu ein weicher Hammerklang (kurzes gefiltertes Rauschen). Tiefe Töne klingen bis 7 s nach, hohe etwa 1,2 s; höhere Teiltöne sterben früher; ein Tiefpass macht leise Anschläge dunkler. Der Klang kommt aus dem Raum vom Flügel (Richtung und Entfernung folgen der Kamera), bis 32 Töne gleichzeitig, ein Kompressor hält es sauber.

## Offene Punkte (Ideen)

- Mehrere Finger mit der Maus (Akkord geht nur mit der Computertastatur), Gleiten mit gedrückter Maus, Pedal, Anschlagstärke je nach Stelle auf der Taste, Handy (Touch).
- Notenständer, Deckel öffnen, ein Halleffekt.
