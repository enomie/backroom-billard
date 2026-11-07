# Optik — 80er-Backroom

> **Status:** Die **drei Deckenleuchten sind umgesetzt** (`src/ceiling-lamps.js`, Parameter in `src/room-constants.js`). **Raum und Nebel sind noch Vorgaben**, nicht umgesetzt. Umgesetzt wird erst, wenn es ausdrücklich beauftragt wird.

Das Spiel spielt in den **80ern** in einem verrauchten, schummrigen Billardcafé. Die Optik soll genau das transportieren: wenig Licht, Rauch in der Luft, ein heller Tisch im Dunkeln.

## Raum

Ein geschlossener Raum mit **Boden, 4 Wänden und Decke**, proportional zum Tisch, aber deutlich größer.

| Teil | Vorgabe |
|------|---------|
| Länge (lange Tischseite) | ca. **10 m** (Richtung der Tischlänge) |
| Breite | proportional zum Tisch (Tisch 1 : 2 → ca. 5 m), noch zu bestätigen |
| Höhe | **4,50 m** |
| Boden | **Teppich** |
| Decke | **Holz** |
| Wände | noch offen |

Maße sollen im Code als Parameter einstellbar sein.

## Deckenleuchten

**Drei gleiche Leuchten** über dem Tisch, nach der Skizze:

![Skizze der drei Deckenleuchten](img/ceiling-lamps-sketch.png)

- **Form:** Kegel-Lampenschirm (Dreieck im Profil), an einem **schwarzen Kabel** von der Decke hängend.
- **Farben:** außen **blau**, innen **golden**.
- **Licht:** Kegel-Spot (cone light) mit **Softshadow**. Die Lichtkegel der drei Leuchten überlappen sich auf dem Tisch (siehe gestrichelte Linien in der Skizze).
- **Anordnung:** nebeneinander in einer Reihe entlang der Tischlänge, Abstand 0,85 m (`LAMP_SPACING`).
- **Draufsicht:** In der Draufsicht (Kamera über den Leuchten) sind die Lampenkörper ausgeblendet, das Licht bleibt an.

### Höhe als Parameter (umgesetzt)

- Die **Aufhängehöhe** (Unterkante der Leuchten über dem Boden) ist der **Parameter `LAMP_HEIGHT`** in `src/room-constants.js`, Standard **2,40 m**. Dort stehen auch Abstand, Kabellänge, Schirm- und Lichtwerte.
- Ändert man ihn (z. B. auf 2,50 m), werden **alle drei Leuchten gemeinsam** höher oder tiefer.
- Das **Kabel** passt sich automatisch an: Es ist so lang (z. B. 10 m), dass es immer **durch die Decke nach oben herausragt** und nie sichtbar endet.

## Nebel / Rauch

- **Linearer Nebel von 1 m bis 12 m**: Ab 1 m beginnt er, bei 12 m ist alles komplett im Dunst.
- **Rauchfarben** (warmes, bräunliches Grau), der Raum soll **wirklich schummrig** wirken.
- Hinweis: Aktuell nutzt die Szene exponentiellen Nebel (`FogExp2`); die Vorgabe meint einen linearen Nebel mit Anfang und Ende.

## Offene Punkte

- Wandmaterial und Dekoration (Poster, Tapete, Holz?).
- Genaue Rauchfarbe und ob zusätzlich Rauchschwaden im Lichtkegel sichtbar sein sollen.
- Abstand der Leuchten zueinander.
