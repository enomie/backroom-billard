# Taschen / Löcher — Konzept & Maße

**Norm:** WPA **9-Fuß** — zentrale Werte in **`src/table-constants.js`**. Specs, Blueprint und Physik lesen nur daraus (bzw. durchgereichte `dims`).

Quelle: [WPA Recommended Equipment Specifications (PDF)](https://wpapool.com/wp-content/uploads/2024/01/RECOMMENDED-EQUIPMENT-SPECIFICATIONS.pdf)

---

## 1. Ziel (Essenz)

1. Filz + Bande + Holz → Union, 6× Zylinder-Subtract (`src/pocket-spec.js`, `src/table-csg.js`).
2. Kugel **57,15 mm** Ø; Taschenradien = **halbe WPA-Mündung** (Mittel der Normspanne).
3. Senkrechter Zylinder nur als Vereinfachung der echten Taschenform; Radien/Position folgen WPA-Spannweite.

---

## 2. Tischzonen (WPA 9-Fuß)

Ursprung Tischmitte; Filz **`y = TABLE_H`** (`0,85 m` Möbelhöhe, Spielnorm unabhängig).

| Zone | X / Z | Maß (Code) |
|------|--------|------------|
| **Spielfläche** | `±hw`, `±hl` (Nasenlinie) | **`1,27 m × 2,54 m` Nase zu Nase** (`PLAY_W`, `PLAY_L`); Filzkante liegt 40 mm weiter außen |
| **Bande (Gummi)** | Trapez (~K-66), Nase **oben** (63,5 % Ø), 40 mm breit | **`CUSHION_PROFILE_WIDTH` = 40 mm** · Unterkante +6 mm außen · Fuß der Fläche 12 mm hinter der Nase (`CUSHION_PROFILE_FACE_RECESS`) |
| **Holzrahmen** | außerhalb Filz | **`RAIL_WOOD_DEPTH` = 110 mm** · **`RAIL_CAP_WIDTH` = 150 mm** (Nase→Außenkante) |
| **Spielplatte (grün)** | — | **`FELT_BED_DEPTH` = 5 mm**, darunter beginnt der Taschenbecher |

`hw = **0,635 m**` | `hl = **1,27 m**`

---

## 3. Taschen (Zylinder aus `createPocketSpecs`)

| | Ecke | Mitte |
|---|------|--------|
| WPA mouth (Mitte Spanne) | 115,9 mm | 128,59 mm |
| **`radius`** | **`POCKET_R_CORNER` ≈ 57,95 mm** | **`POCKET_R_SIDE` ≈ 64,29 mm** |
| Achs-Offset | `r × 0` (Mitte auf Nasenlinien-Ecke) | `r × 0,20` nach außen |

### Positionen (berechnet, nicht hardcoden)

Anker = **Schnittpunkt der Nasen** (`hw|hl − 40 mm`), danach `r × Faktor` nach außen.

| ID | X (ca.) | Z (ca.) |
|----|---------|---------|
| `corner-tl/tr/bl/br` | **±0,615** | **±1,250** |
| `side-l` / `side-r` | **±0,608** | `0` |

### Vertikal

| | Formel | Wert (bei `TABLE_H = 0,85`) |
|---|--------|------------------------------|
| `yTop` | `TABLE_H + cushionH + 0,02` | **≈ 0,906 m** |
| `yBottom` | `TABLE_H − 0,15` | **0,700 m** |
| `y₀` | Mitte | **≈ 0,803 m** |

`cushionH` = `CUSHION_NOSE_TO_BED` (identisch `dims.railH` im Blueprint).

---

## 4. Module

| Datei | Rolle |
|-------|--------|
| `src/table-constants.js` | WPA-Maße (einzige Konstantenquelle) |
| `src/pocket-spec.js` | Specs + Versenken + Debug-Wireframes |
| `src/table-blueprint.js` | Mesh-Rohling → CSG |
| `src/billiard.js` | `HALF_W/L` = Spielfeldhalbmess − `BALL_R` |

---

## 5. Checkliste

- [x] Spielfeld 2,54 × 1,27 m
- [x] Kugel & Kissenmaße WPA
- [x] Taschenradien ohne Arcade-Puffer (mouth/2)
- [x] Banden-Kollision an Kissen-Innenfläche (`cushions[]`, nicht Holz)
- [x] Kissen-Segmente enden an den Taschen-Spitzen (`cushionTipOffsets`, Spitzen = Ausschnitt ∩ Nasenlinie); Enden wirken als Kreis-Hindernis
- [ ] `DEBUG_POCKET_CYLINDERS = false` nach Abgleich

---

*Achs-Offsets (0 / 0,20) sind geometrische Platzierung für CSG, nicht WPA-normiert — Radien und Spielfeld sind normiert.*

---

## 6. Banden-Enden & Löcher (visuell, Stand Schritt 1)

- **Loch rund**, Mitte genau auf der **Filzkante** (Ecke: Filzkanten-Ecke, Seite: Filzkante bei z = 0), Radius = Mouth/2 (`POCKET_R_*`).
- **Facette** an jedem Bandenende: Die Rückseite des Gummis (an der Filzkante) endet am Loch, die **Nase ist zurückgeschnitten**. Ecke 45° (`CUSHION_END_RECESS_CORNER = 1`), Seite ≈ 14° (`CUSHION_END_RECESS_SIDE = 0,25`).
- Daraus folgen die Nasen-Spitzen (`cushionTipOffsets` in `src/pocket-spec.js`); die Banden-Physik endet dort.
- Unter der 5-mm-Platte: runder Taschenbecher (`pocket-cup-*`), nichts steht über der Platte hinaus.
- Schritt 2 (Physik) baut die Kollisionskörper aus genau dieser Geometrie.
