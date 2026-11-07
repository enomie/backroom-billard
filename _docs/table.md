# Tisch — Maße und Geometrie

Norm: WPA 9 Fuß. Alle Werte stehen in `src/table-constants.js`; Tisch, Taschen und Physik lesen nur von dort.

Ursprung in der Tischmitte, Filzoberkante bei `y = TABLE_H` (0,85 m). Alle Maße in Metern.

## Spielfeld

- **1,27 × 2,54 m, gemessen Nase zu Nase** (`PLAY_W`, `PLAY_L`).
- Der Filz reicht um die Gummibreite (40 mm) weiter nach außen, die Löcher sitzen darauf.
- Kugel: Ø 57,15 mm, 170 g.

## Querschnitt (von innen nach außen)

| Teil | Maß |
|------|-----|
| Bande (Gummi, K-66) | 40 mm breit, Höhe 36,3 mm (63,5 % Kugel-Ø). **Nase oben**, die Fläche weicht nach unten 12 mm zurück. Rückseite senkrecht, bündig am Holz. |
| Holzrahmen | 110 mm, **Kanten abgerundet** (`RAIL_EDGE_RADIUS` 12 mm), dunkles Mahagoni mit Klarlack-Glanz (`wood.js`, gilt auch für Zargen und Beine) |
| Spielplatte (grün) | 5 mm dick |
| Taschenbecher | beginnt direkt unter der Platte, Boden bei `TABLE_H − 0,15` |
| Zargen (Bretter rundherum) | **2 cm dick, 40 cm hoch** (`SKIRT_THICKNESS`, `SKIRT_HEIGHT`), bündig mit der Außenkante des Holzrahmens, Oberkante an der Unterkante des Rahmens (y = 0,85 m). Verdecken die Taschenbecher von außen. |
| Tischbeine | 4 Stück, **direkt unter den Eckbechern**, vom Boden bis **2 cm unter den Becherboden** (`LEG_CUP_GAP`), also 0,68 m hoch |

## Taschen

- **Loch rund**, Mitte auf der Filzkante (Ecke: Filzkanten-Ecke, Seite: Filzkante bei z = 0).
- Radius = halbe WPA-Mündung: Ecke ≈ 58 mm, Seite ≈ 64 mm.
- **Bandenenden mit Facette:** Die Rückseite des Gummis endet am Loch, die Nase ist zurückgeschnitten (Ecke 45°, Seite ca. 14°).
- Die Nasen-Spitzen ergeben sich daraus (`cushionTipOffsets` in `pocket-spec.js`).

## Wie der Tisch entsteht

1. `table-blueprint.js` baut Filzplatte und Holz, die Banden als einzelne Stücke zwischen den Taschen.
2. `table-csg.js` schneidet die 6 runden Löcher in Platte und Holz.
3. Darunter sitzt je Tasche ein Becher (`pocketCupDims`).
4. Die fertigen Meshes gehen an die Physik (`_docs/physics.md`).

Änderungen an Maßen nur in `table-constants.js` — Optik und Kollision folgen automatisch.
