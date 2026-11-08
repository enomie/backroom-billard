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
- Die Bar wirft keinen Schatten (sie steht außerhalb der Lichtkegel der Tischlampen) und bekommt das Licht der Wandleuchten.

## Rückbuffet (umgesetzt)

Hinter der Bar, an der Wand (`src/backbar.js`):

- **Rückwand:** Marmor wie die Platte, 3,6 m breit, 3 m hoch, 6 cm dick, direkt an der Wand.
- **Regale:** drei Ebenen (1,45 / 2,0 / 2,55 m), 3,2 m breit (also nicht bis an den Rand des Marmors), 22 cm tief, aus Holz. Der Abstand von 55 cm lässt Flaschen (bis 30 cm) bequem darauf stehen.
- **Flaschen:** Wein- und Bierflaschen (dieselben wie auf den Tischen, `bottles.js`), mit festem Zufall in einer Reihe aufgestellt, mit Lücken, leicht schief.
- **Wandleuchte:** Die eine Wandleuchte, die vor dem Rückbuffet säße, ist entfernt (`wall-lamp-places.js`); es bleiben neun.

## Offene Punkte (Ideen, noch nicht gebaut)

- Weitere Module (Spirituosenflaschen, Beleuchtung der Regale), Gläser und Flaschen auf der Bar, Barkeeper.
- Kollision/Sperrbereich für die freie Kamera um die Bar.
