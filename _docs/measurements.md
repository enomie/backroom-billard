### 1. Tischzonen (von innen nach außen)

Ursprung `(0, 0, 0)` liegt in der **Tischmitte**, Filzhöhe auf `y = TABLE_H`.

| Zone | Ausdehnung in X (Breite) | Ausdehnung in Z (Länge) | Typische Dicke / Höhe |
| --- | --- | --- | --- |
| **Spielfläche (Filz)** | `[-hw, +hw]` | `[-hl, +hl]` | **Projekt:** `1,22 m × 2,44 m`<br>

<br>*(WPA 9-Fuß: 1,27 m × 2,54 m)* |
| **Bande (Gummi)** | schließt direkt an `±hw` an | schließt direkt an `±hl` an | Breite: **~45–50 mm**<br>

<br>Höhe über Filz: **~36–55 mm** (`cushionH`) |
| **Holzrahmen (Rail)** | schließt außen an Bande an | schließt außen an Bande an | Breite: **~100–150 mm**<br>

<br>Außenkante Tisch: ca. `hw + 0,18 m` |

*Im Projekt:* `hw = 1,22 / 2 = 0,61 m` | `hl = 2,44 / 2 = 1,22 m`

---

### 2. Exakte Taschen-Positionen & Radien (Zylinderachsen)

Die Zylinderachsen liegen **nicht** auf der Innenkante, sondern leicht **nach außen versetzt** auf der Winkelhalbierenden bzw. Senkrechten, damit die Kissen-Spitzen sauber geschnitten werden:

* **Ecktaschen:** `r_corner = 0,060 m` (60 mm) | `cornerOffset = 0,060 × 0,35 = 0,021 m` (21 mm)
* **Mitteltaschen:** `r_side = 0,066 m` (66 mm) | `sideOffset = 0,066 × 0,20 = 0,0132 m` (~13 mm)

#### Koordinaten im Projekt (`hw = 0,61 m`, `hl = 1,22 m`)

| Tasche | ID | `X` (Breite) | `Z` (Länge) | Radius |
| --- | --- | --- | --- | --- |
| **Ecke oben links** | `corner-tl` | **`-0,631 m`** (`-(hw + 0,021)`) | **`-1,241 m`** (`-(hl + 0,021)`) | `0,060 m` |
| **Ecke oben rechts** | `corner-tr` | **`+0,631 m`** (`+(hw + 0,021)`) | **`-1,241 m`** (`-(hl + 0,021)`) | `0,060 m` |
| **Ecke unten links** | `corner-bl` | **`-0,631 m`** (`-(hw + 0,021)`) | **`+1,241 m`** (`+(hl + 0,021)`) | `0,060 m` |
| **Ecke unten rechts** | `corner-br` | **`+0,631 m`** (`+(hw + 0,021)`) | **`+1,241 m`** (`+(hl + 0,021)`) | `0,060 m` |
| **Mitte links** | `side-l` | **`-0,623 m`** (`-(hw + 0,013)`) | **`0,000 m`** | `0,066 m` |
| **Mitte rechts** | `side-r` | **`+0,623 m`** (`+(hw + 0,013)`) | **`0,000 m`** | `0,066 m` |

---

### 3. Vertikaler Schnitt (Y-Achse)

Für den CSG-Zylinder-Körper:

* **Oberkante (`yTop`):** `TABLE_H + cushionH + 0,02 m` (ragt 2 cm über die Bandenoberkante heraus).
* **Unterkante (`yBottom`):** `TABLE_H - 0,15 m` (durchdringt Schieferplatte und Unterbau komplett).
* **Zylinderhöhe:** `height = yTop - yBottom = cushionH + 0,17 m`.