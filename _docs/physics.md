# Physik

Rapier (`@dimforge/rapier3d-simd`), Schwerkraft, fester Schritt **240 Hz**. Die Collider werden aus der **gerenderten** Tisch-Geometrie gebaut, damit Optik und Kollision identisch sind.

## Aufbau

| Teil | Collider |
|------|----------|
| Spielplatte + Holz | Trimesh aus dem CSG-Tisch (runde Löcher inklusive) |
| Bandenstücke | Trimesh je Stück (Nase, Facetten) |
| Taschenbecher | Trimesh-Wand (oben offen) + Boden |
| Kugeln | Kugel-Körper mit CCD, kein Ruhezustand durch Rapier |

Trimeshes bekommen `FIX_INTERNAL_EDGES_TWO_SIDED`. Ohne dieses Flag lenken Dreiecksnähte rollende Kugeln seitlich ab.

## Spielregeln der Physik

- **Stoß:** Impuls durch den Kugelmittelpunkt (Stärke 1,1 – 4,2 m/s), kein Effet.
- **Versenken:** Die Kugel fällt selbst über die Lochkante. Gezählt wird sie erst beim **Aufprall auf dem Becherboden** (Kollisionsevent).
- **Weiße Kugel:** wird nach 600 ms auf einem freien Platz neu aufgelegt.
- **Ruhe:** unter 1 cm/s (und kaum Drall) setzt das Spiel die Geschwindigkeit auf 0.
- **Sicherheitsnetz:** Eine Kugel außerhalb des Tisches wird zurückgesetzt (Konsolen-Warnung).

## Stellschrauben (`src/physics-constants.js`)

| Wert | Standard | Wirkung |
|------|----------|---------|
| `LINEAR_DAMPING` | 0,25 | Rollwiderstand: wie weit Kugeln auslaufen |
| `ANGULAR_DAMPING` | 0,40 | Ausklingen des Drehens |
| `CUSHION_RESTITUTION` | 0,70 | Sprungkraft der Bande (× Kugel 0,95) |
| `BALL_RESTITUTION` | 0,95 | Kugel gegen Kugel |
| `TABLE_FRICTION` | 0,15 | Grip auf dem Filz |
| `CUP_RESTITUTION` | 0,20 | Wie stark Kugeln im Becher springen |

Reibung und Restitution werden kombiniert (Reibung: Mittelwert, Restitution: Produkt).
