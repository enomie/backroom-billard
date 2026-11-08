# Bar

> **Status: Hauptmodul umgesetzt, der Rest folgt Schritt für Schritt.** Die Bar entsteht der Reihe nach; hier steht, was schon da ist und was geplant ist.

Eine Bar an der langen Wand **gegenüber dem Radio** (`x = -ROOM_WIDTH/2`, in Höhe der Tischmitte, `z = 0`).

## Aufbau (Code)

| Datei | Inhalt |
|-------|--------|
| `src/bar.js` | Meshes: Sockel, Holzblock, Marmorplatte, Marmor-Textur |
| `src/bar-constants.js` | Position, Maße, Farben |

## Hauptmodul (umgesetzt)

- **Stellung:** Die Rückseite steht **1 m von der Wand** entfernt (Platz für den Barkeeper), die Vorderseite zeigt in den Raum (`BAR_WALL_DISTANCE`).
- **Maße:** 3 m breit, 0,6 m tief (zur Wand hin), 1,3 m hoch insgesamt.
- **Sockel:** Silber (Metall), 0,16 m hoch, rundum 3 cm kleiner als der Holzblock.
- **Block:** Holz mit Maserung, bis unter die Platte.
- **Platte:** Marmor (weiß mit grauen Adern), 4 cm dick, steht rundum 4 cm über, abgerundete Ecken (Radius 7 cm) und leicht gerundete Kanten.
- Die Bar wirft keinen Schatten (sie steht außerhalb der Lichtkegel der Tischlampen) und bekommt das Licht der Wandleuchten.

## Offene Punkte (Ideen, noch nicht gebaut)

- Weitere Module (Rückbuffet, Regale, Hocker), Gläser und Flaschen auf der Bar, Barkeeper.
- Kollision/Sperrbereich für die freie Kamera um die Bar.
