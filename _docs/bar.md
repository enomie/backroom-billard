# Bar

> **Status: Hauptmodul umgesetzt, der Rest folgt Schritt für Schritt.** Die Bar entsteht der Reihe nach; hier steht, was schon da ist und was geplant ist.

Eine Bar an der langen Wand **gegenüber dem Radio** (`x = -ROOM_WIDTH/2`, in Höhe der Tischmitte, `z = 0`).

## Aufbau (Code)

| Datei | Inhalt |
|-------|--------|
| `src/bar.js` | Meshes: Sockel, Holzblock, Marmorplatte, Hocker, Marmor-Textur |
| `src/backbar.js` | Rückbuffet: Marmorwand, Regale, Flaschen |
| `src/bar-constants.js` | Position, Maße, Farben |

## Hauptmodul (umgesetzt)

- **Stellung:** Die Rückseite steht **1 m von der Wand** entfernt (Platz für den Barkeeper), die Vorderseite zeigt in den Raum (`BAR_WALL_DISTANCE`).
- **Maße:** 3 m breit, 0,6 m tief (zur Wand hin), 1,2 m hoch insgesamt.
- **Sockel:** Silber (Metall), 0,16 m hoch, rundum 3 cm kleiner als der Holzblock.
- **Block:** Holz mit Maserung, bis unter die Platte.
- **Platte:** Marmor (weiß mit grauen Adern), 4 cm dick, steht rundum 4 cm über, abgerundete Ecken (Radius 7 cm) und leicht gerundete Kanten.
- **Hocker:** 3 Stück vor der Bar (0,8 m Abstand, 0,4 m von der Vorderkante): gepolsterter Sitz in Weinrot auf einer silbernen Säule mit Fuß und Fußring, Sitzhöhe 0,78 m (`STOOL_*` in `bar-constants.js`).
- **Getränke:** Auf der Platte stehen zufällig verteilt 7 volle Gläser (alle Sorten) und 2 Flaschen, ohne sich zu berühren (`BAR_DRINKS_*`, fester Zufall).
- Die Bar wirft keinen Schatten (sie steht außerhalb der Lichtkegel der Tischlampen) und bekommt das Licht der Wandleuchten.

## Rückbuffet (umgesetzt)

Hinter der Bar, an der Wand (`src/backbar.js`):

- **Rückwand:** 3,6 m breit, 3 m hoch, 6 cm dick, direkt an der Wand. **Bis zur Höhe des Bar-Pults (1,2 m) Holz** (wie die Wandvertäfelung), darüber **Marmor** wie die Platte.
- **Rahmen:** links, rechts und oben ein Holzrahmen im Holz der Wandvertäfelung, 7 cm breit und 8 cm tief (steht 2 cm vor dem Marmor), außen um den Marmor herum (`BACKBAR_FRAME_*`). Die Maserung läuft oben waagerecht.
- **Regale:** drei Ebenen (1,45 / 2,0 / 2,55 m), 3,2 m breit (also nicht bis an den Rand des Marmors), 22 cm tief, aus Holz. Der Abstand von 55 cm lässt Flaschen (bis 30 cm) bequem darauf stehen.
- **Beleuchtung:** Unter der Vorderkante jedes Regals eine warme LED-Leiste (leuchtet von selbst) und darunter an der Wand ein weicher Lichtschein (45 cm hoch, nach unten ausgeblendet). Das ist **kein echtes Licht**: Der Schein ist eine additive, ausgeblendete Fläche, es kostet also pro Pixel nichts (wie bei den Wandleuchten wollten wir keine zusätzlichen Lichter; deren Kegel-Shader passt für schmale Regallicht-Streifen nicht). Werte `BACKBAR_LED_*`.
- **Flaschen:** Wein- und Bierflaschen (dieselben wie auf den Tischen, `bottles.js`), mit festem Zufall in einer Reihe aufgestellt, mit Lücken, leicht schief.
- **Wandleuchte:** Die eine Wandleuchte, die vor dem Rückbuffet säße, ist entfernt (`wall-lamp-places.js`); es bleiben neun.

## Offene Punkte (Ideen, noch nicht gebaut)

- Weitere Module (Spirituosenflaschen, Beleuchtung der Regale), Barkeeper.
- Kollision/Sperrbereich für die freie Kamera um die Bar.
