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

- **Stoß:** Die Cue-Spitze ist ein kinematischer Körper mit der echten Form der Spitze und trifft die Kugel (Kugelgeschwindigkeit 0,8 – 8 m/s, quadratische Kurve), siehe `shot-animation.md`.
- **Versenken:** Die Kugel fällt selbst über die Lochkante. Gezählt wird sie erst beim **Aufprall auf dem Becherboden** (Kollisionsevent). Danach wird sie aus dem Becher gelöscht (Körper und Mesh) und erscheint als farbiger Kreis im HUD.
- **Seitendrall (Effet):** Der Nubbel trifft die Kugel außermittig; die echte Spitzenform und die Reibung der Spitze erzeugen den Drall (gemessen bei halbem Radius seitlich: ca. 18 rad/s um die Hochachse, unten: Rückdrall). Weil die Spitze in der Simulation unendlich schwer ist, würde die Kugel dabei bis zu **14°** von der Zielrichtung abweichen (echt: 1–3°). Deshalb zieht `limitSquirt` (`billard.js`) die Richtung nach dem Stoß auf höchstens `CUE_SQUIRT_MAX_DEG` (2,5°, bei Stoß ganz außen, weg von der getroffenen Seite) zurück; der Drall bleibt.
- **Kurve (Swerve):** Mit steilem Cue ist die Drehachse geneigt, und die Kugel kurvt, solange sie noch auf dem Filz gleitet (Reibung gegen den Schlupf des Berührpunkts). Die Physik gibt das nur schwach, deshalb vervielfacht `applySwerve` in den ersten `SWERVE_SECONDS` (1 s) nach dem Stoß den **seitlichen Teil** dieser Reibung auf der weißen Kugel um `SWERVE_BOOST` (8). Gemessen bei 30° Cue-Neigung: ca. 8° Kursänderung auf 0,8 m (zur Seite des Effets), mit flachem Cue ca. 3°; ohne Boost unter 1°. Mit `SWERVE_BOOST = 1` und `CUE_SQUIRT_MAX_DEG = 14` ist das alte Verhalten wieder da.
- **Weiße Kugel:** wird nach 600 ms auf einem freien Platz neu aufgelegt (nicht gelöscht, nicht im HUD).
- **Tuchbremse:** Rapiers Damping ist aus (0), weil es proportional zur Geschwindigkeit bremst (langsame Kugeln kriechen sekundenlang). Stattdessen bremst `applyClothDrag` (`billard.js`) jede Kugel auf dem Tisch **konstant** (Rollwiderstand `ROLLING_RESISTANCE` × g); der Drall wird dabei so mitgenommen, dass eine rollende Kugel weiter rollt. Seitendrall um die Hochachse klingt mit `SIDE_SPIN_DECEL` ab. Gemessen: aus 1 m/s ca. 5,1 m Weg, Stillstand nach ca. 10 s.
- **Ruhe:** unter 1 cm/s (und kaum Drall) setzt das Spiel die Geschwindigkeit auf 0. Sobald **alle** Kugeln unter 2 cm/s sind (der Tisch gilt als still), werden die Reste (Geschwindigkeit und Drall) auf 0 gesetzt, sonst würde eine kriechende Kugel ihre Restgeschwindigkeit behalten, während die Physik schläft, und beim nächsten Stoß „von allein“ weiterrollen (auch die weiße).
- **Sicherheitsnetz:** Eine Kugel außerhalb des Tisches wird zurückgesetzt (Konsolen-Warnung).

## Stellschrauben (`src/physics-constants.js`)

| Wert | Standard | Wirkung |
|------|----------|---------|
| `ROLLING_RESISTANCE` | 0,01 | Rollwiderstand: wie weit Kugeln auslaufen |
| `SIDE_SPIN_DECEL` | 10 | Abklingen des Seitendralls (rad/s pro s) |
| `CUSHION_RESTITUTION` | 0,80 | Sprungkraft der Bande (× Kugel 0,95 ≈ 0,76) |
| `BALL_RESTITUTION` | 0,95 | Kugel gegen Kugel |
| `TABLE_FRICTION` | 0,34 | Grip auf dem Filz (mit Kugel gemittelt: 0,2 Gleitreibung) |
| `CUP_RESTITUTION` | 0,20 | Wie stark Kugeln im Becher springen |
| `CUE_SQUIRT_MAX_DEG` | 2,5 | Größte Ablenkung bei seitlichem Stoß (Grad) |
| `SWERVE_BOOST` | 8 | Verstärkung der Kurve bei Effet (1 = reine Physik) |

Reibung und Restitution werden kombiniert (Reibung: Mittelwert, Restitution: Produkt).

## Leistung: Physik im Ruhezustand

Liegen alle Kugeln still (kein Stoß läuft, nichts ist neu aufgebaut oder neu aufgelegt), wird die Physik-Welt **gar nicht geschritten** (`stepPhysics` in `billard.js`): Es kann sich nichts ändern. Nach einem neuen Aufbau oder dem Neuauflegen der weißen Kugel laufen noch 120 Schritte (0,5 s), damit die Kugeln sich setzen. Das Ergebnis ist identisch, spart aber im Stillstand fast die ganze Physikzeit. Ebenso liest die Stoßerkennung (`detectBallImpacts`) die Kugelpositionen einmal pro Schritt statt pro Kugelpaar.
