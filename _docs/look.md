# Optik — 80er-Backroom

> **Status:** **Raum, Nebel und die drei Deckenleuchten sind umgesetzt** (`src/room.js`, `src/ceiling-lamps.js`, alle Parameter in `src/room-constants.js`). Offene Punkte stehen unten.

Das Spiel spielt in den **80ern** in einem verrauchten, schummrigen Billardcafé. Die Optik soll genau das transportieren: wenig Licht, Rauch in der Luft, ein heller Tisch im Dunkeln.

## Raum

Ein geschlossener Raum mit **Boden, 4 Wänden und Decke**, proportional zum Tisch, aber deutlich größer.

| Teil | Vorgabe |
|------|---------|
| Länge (lange Tischseite) | **30 m** (`ROOM_LENGTH`, Richtung der Tischlänge) |
| Breite | **15 m** (`ROOM_WIDTH`) |
| Höhe | **4,50 m** (`ROOM_HEIGHT`) |
| Boden | **Teppich**, dunkles Weinrot, mit feinem Rauschmuster |
| Decke | **Holz**, Bretter längs |
| Wände | **Creme-Gelb** („verrauchtes Weiß“), nach oben hin dunkler (Rauch sammelt sich an der Decke) |

Alle Maße und Farben sind Parameter in `src/room-constants.js`. Die freie Kamera bleibt im Raum.

## Deckenleuchten

**Drei gleiche Leuchten** über dem Tisch, nach der Skizze:

![Skizze der drei Deckenleuchten](img/ceiling-lamps-sketch.png)

- **Form:** Kegel-Lampenschirm (Dreieck im Profil), an einem **schwarzen Kabel** von der Decke hängend.
- **Farben:** außen **blau**, innen **golden**.
- **Licht:** Kegel-Spot (cone light) mit **Softshadow**. Die Lichtkegel der drei Leuchten überlappen sich auf dem Tisch (siehe gestrichelte Linien in der Skizze).
- **Anordnung:** nebeneinander in einer Reihe entlang der Tischlänge, Abstand 0,85 m (`LAMP_SPACING`).

### Höhe als Parameter (umgesetzt)

- Die **Aufhängehöhe** (Unterkante der Leuchten über dem Boden) ist der **Parameter `LAMP_HEIGHT`** in `src/room-constants.js`, Standard **2,40 m**. Dort stehen auch Abstand, Kabellänge, Schirm- und Lichtwerte.
- Ändert man ihn (z. B. auf 2,50 m), werden **alle drei Leuchten gemeinsam** höher oder tiefer.
- Das **Kabel** passt sich automatisch an: Es ist so lang (z. B. 10 m), dass es immer **durch die Decke nach oben herausragt** und nie sichtbar endet.

## Nebel / Rauch

- **Linearer Nebel von 1 m bis 12 m** (`FOG_NEAR`, `FOG_FAR`): Ab 1 m beginnt er, bei 12 m ist der Dunst am dichtesten (aber nie komplett deckend).
- **Grauweiß** (`FOG_COLOR`): heller grauer Dunst. Er deckt maximal 60 % (`FOG_MAX_OPACITY`), damit der Raum in der Ferne noch sichtbar bleibt. Es gibt keinen Vignetten-Effekt (kein „Taschenlampen-Look“) mehr.
- Damit die Wände im Dunkeln lesbar bleiben, gibt es ein schwaches warmes Umgebungslicht (`ROOM_AMBIENT_*`).

## Offene Punkte

- Wanddekoration (Poster, Tapete, Leisten, Fenster, Tür).
- Ob zusätzlich Rauchschwaden im Lichtkegel sichtbar sein sollen.
- Abstand der Leuchten zueinander.
