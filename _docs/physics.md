### 1. Banden-Parameter (Gummi / K-66 Cushion)

Für die Banden-Collider (`RAPIER.ColliderDesc`):

| Parameter | Rapier-Property / Methode | Empfohlener Wert | Physikalische Begründung |
| --- | --- | --- | --- |
| **Restitution (Bounciness)** | `.setRestitution(0.70)` | **`0.68 – 0.72`** | K66-Profilbanden haben einen realen Stoßbeiwert von ca. 0,65–0,75. Über 0,75 wirkt es wie Flipper; unter 0,60 „klebt“ die Kugel. |
| **Restitution Combine Rule** | `.setRestitutionCombineRule(...)` | **`Multiply`** | Verhindert, dass die extrem elastischen Kugeln (~0,95) an der Bande unrealistisch schnell abprallen ($0{,}95 \times 0{,}70 \approx 0{,}66$). |
| **Friction (Gleitreibung)** | `.setFriction(0.20)` | **`0.18 – 0.22`** | Tuch auf Bandengummi. Zu viel Reibung (> 0,35) führt zu extrem unphysikalischen Ausfallswinkeln bei Effet; zu wenig ignoriert Seitenschnitt. |
| **Friction Combine Rule** | `.setFrictionCombineRule(...)` | **`Average`** | Bildet den Mittelwert aus Tuchreibung und Kugeloberfläche. |
| **Contact Skin (Sicherheit)** | `.setContactSkin(0.001)` | **`0.001 m` (1 mm)** | Verhindert numerisches Hineinsinken bei schnellen Einschlägen. |

---

### 2. Kugel-Parameter (Gegenstück zur Bande)

Damit die Bandenkollision mathematisch stimmt, müssen die Kugeln (`RAPIER.RigidBodyDesc` & `ColliderDesc`) exakt darauf abgestimmt sein:

| Parameter | Rapier-Property / Methode | Wert | Begründung |
| --- | --- | --- | --- |
| **Masse (Phenolharz)** | `.setMass(0.170)` *(oder via Dichte)* | **`0.170 kg` (170 g)** | Standard Aramith Turnierkugel (57,15 mm Ø, `BALL_R = 0.028575`). |
| **Dichte** | `.setDensity(1740)` | **`1740 kg/m³`** | Alternative zur festen Masse bei volumetrischen Kollidern. |
| **Kugel-Restitution** | `.setRestitution(0.95)` | **`0.94 – 0.96`** | Kugel-auf-Kugel-Stoß ist nahezu vollkommen elastisch. |
| **Kugel-Friction** | `.setFriction(0.06)` | **`0.05 – 0.08`** | Poliertes Phenolharz auf Phenolharz / Tuch. |
| **Linear Damping** | `bodyDesc.setLinearDamping(0.25)` | **`0.20 – 0.35`** | Simuliert den Rollwiderstand des Tuchs ohne komplexe Rollreibung. |
| **Angular Damping** | `bodyDesc.setAngularDamping(0.40)` | **`0.30 – 0.50`** | Simuliert das natürliche Auslaufen des Dralls (Spin Decay). |
| **CCD (Pflicht!)** | `bodyDesc.setCcdEnabled(true)` | **`true`** | **Zwingend aktivieren:** Verhindert das Durchtunneln bei harten Breaks (> 8 m/s). |

---

### 3. Tischplatte (Filz / Schiefer)

| Parameter | Rapier-Property / Methode | Wert | Begründung |
| --- | --- | --- | --- |
| **Tisch-Restitution** | `.setRestitution(0.40)` | **`0.35 – 0.45`** | Schiefer absorbiert vertikale Energie; Kugel soll nicht wie ein Flummi springen. |
| **Tisch-Friction** | `.setFriction(0.15)` | **`0.12 – 0.18`** | Gleitreibung auf Simonis-Turniertuch. |

---

### 4. Implementierung im Repo

| Datei | Nutzung |
|-------|---------|
| `src/physics-constants.js` | Alle Werte + `CUSHION_COLLISION_RESTITUTION` (Multiply), `BALL_BALL_RESTITUTION`, `CUSHION_IMPACT_FRICTION` (Average) |
| `src/billiard.js` | Sub-Steps 240 Hz; Kugel–Kugel **6× Relaxation**/Substep + Baumgarte; Dämpfung **nach** Sub-Steps; Sleep nur ohne Nachbar-Überlapp |
| `src/physics-rapier.js` | Fabriken für spätere Rapier-Migration (`createCushionColliderDesc`, `createBallPhysics`) |

`TABLE_RESTITUTION` / `TABLE_FRICTION` gelten für künftigen Filz-Collider (Rapier), nicht für die 2D-Gleitphysik.

---

### 5. Code-Snippet für Rapier.js

```javascript
import RAPIER from '@dimforge/rapier3d-compat';

// 1. Collider-Deskriptor für eine Bandenkante
export function createCushionColliderDesc(halfExtents) {
  return RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
    .setRestitution(0.70)
    .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
    .setFriction(0.20)
    .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Average)
    .setContactSkin(0.001);
}

// 2. RigidBody & Collider für eine Billardkugel
export function createBallPhysics(world, position, ballRadius = 0.028575) {
  // RigidBody
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z)
    .setLinearDamping(0.25)
    .setAngularDamping(0.40)
    .setCcdEnabled(true); // Essenziell für Billard

  const body = world.createRigidBody(bodyDesc);

  // Collider
  const colliderDesc = RAPIER.ColliderDesc.ball(ballRadius)
    .setMass(0.170)
    .setRestitution(0.95)
    .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
    .setFriction(0.06)
    .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Average);

  const collider = world.createCollider(colliderDesc, body);

  return { body, collider };
}

```