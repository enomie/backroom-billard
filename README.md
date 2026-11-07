# Billiard — Le Salon Noir

Ein **nettes, simples Billard-Spiel** im Browser: 3D-Tisch, First-Person-Ansicht zum Zielen, klare Bedienung — gedacht für **Desktop und Mobile**.

Ziel ist kein Simulationstitel mit Regelwerk à la Turnier, sondern ein entspanntes Spielgefühl: Tisch, Kugeln, Stoß, Physik — schnell verständlich auf Maus/Tastatur und auf Touch.

## Stand & Richtung

- **Aktuell:** Prototyp mit Three.js (Szene, Tisch, CSG-Taschen, einfache Kugelphysik), Salon-UI ohne Framework-Overhead.
- **Geplant:** Stabile Physik (Rapier SIMD), touch-taugliche Steuerung, Polish für kleine und große Screens.
- **Plattformen:** Moderne Browser auf Desktop, Tablet und Smartphone (Portrait/Landscape).

## Projektaufbau

**Root** (Vite-Einstieg, keine Spiel-Logik):

| Teil | Rolle |
|------|--------|
| `index.html` / `style.css` | Seite und HUD |
| `vite.config.js` | Dev-Server Port 8181, WASM/Rapier, CSG-Brush-Alias |
| `favicon.ico` | Favicon |
| `_docs/` | Konzept & Maße (siehe unten) |
| `_Scripts/_BACKUP/` | Backup-Skript (`npm run backup`) |

**`src/`** — gesamter Spiel- und Tisch-Code:

| Datei | Rolle |
|-------|--------|
| `entry.js` | Einstieg: Three.js, dynamisches Laden der Spielmodule, Rapier **lazy** |
| `billiard.js` | Spiel, Kamera, Steuerung, Physik (provisorisch) |
| `table-constants.js` | WPA 9-Fuß-Maße (Spielfeld, Kugel, Bande, Taschen) |
| `pocket-spec.js` | Taschen-Specs, Versenken, Debug-Wireframes |
| `table-csg.js` | Boolean Union + Taschen-Subtract (`three-bvh-csg`) |
| `csg-brush.js` | CSG-`Brush` (Alias für `three-bvh-csg`) |
| `table-blueprint.js` | Tisch-Rohling → CSG-Mesh, Beine |
| `physics-rapier.js` | Helfer für geplante Rapier-Migration (noch nicht im Boot) |
| `structure.md` | Automatischer Verzeichnisbaum von `src/` (via Backup-Skript) |

Aktueller Baum: siehe [`src/structure.md`](src/structure.md).

**Dokumentation**

| Datei | Inhalt |
|-------|--------|
| `_docs/holes.md` | Taschen-Konzept & CSG |
| `_docs/measurements.md` | Tischzonen und Referenzmaße |
| `_docs/physics.md` | Physik-Parameter und Rapier-Richtung |

Stack: **Vite**, **Three.js**, **three-bvh-csg**, **@dimforge/rapier3d-simd** (lazy geladen; Migration der Laufzeitphysik folgt).

## Entwicklung

```bash
npm install
npm run dev
```

Im Browser: **http://localhost:8181/**

Produktions-Build:

```bash
npm run build
npm run preview
```

Port **8181** ist in `vite.config.js` festgelegt. Bei `Address already in use` den anderen Prozess beenden oder den Port anpassen. Server stoppen: `Ctrl+C`.

Nach Änderungen an Skripten oder CSS ggf. Hard-Reload (**Cmd+Shift+R**).

### Backup

```bash
npm run backup                              # src/ + Root-Snapshot
npm run backup -- vor-rapier                # optionales Suffix im Ordnernamen
npm run backup:structure                    # nur src/structure.md aktualisieren
npm run backup:all                          # zusätzlich public/ (Ordner muss existieren)
```

Speicherort: `.backups/backup-YYYYMMDDHHMMSS[-suffix]/`

- Vollständige Kopie von **`src/`**
- Zusätzlich aus dem Root: `index.html`, `style.css`, `vite.config.js`, `package.json`, `package-lock.json`, `README.md`, `favicon.ico`

## Steuerung (Prototyp)

- **Zielen:** Maus ziehen oder `A` / `D`
- **Kraft:** Mausrad oder Slider
- **Stoß:** Klick, Leertaste oder Stoß-Button
- **Kamera / Reset:** `C` bzw. `R` (oder Buttons im HUD)

Mobile-spezifische Gesten kommen mit dem geplanten Touch-UI dazu.
