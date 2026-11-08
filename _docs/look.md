# Optik — 80er-Backroom

> **Status: umgesetzt** (Raum, Vertäfelung, Deckenleuchten, Wandleuchten, Nebel, Lichtkegel, Möbel, Spiegelungen). Alle Parameter in `src/room-constants.js`. Offene Punkte stehen unten.

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
| Wandvertäfelung | **Glänzendes Holz** (Mahagoni, Klarlack) bis **1,80 m** (`WAINSCOT_HEIGHT`): gerahmte Füllungen (0,8 m breit), unten Fußleiste, oben eine **Abschlussleiste mit Profil** (Platte, Wulst, Rundung). Radio und Sideboard halten den Abstand `WAINSCOT_PROTRUSION`. |
| Wände (darüber) | **Creme-Gelb** („verrauchtes Weiß“), nach oben hin dunkler (Rauch sammelt sich an der Decke) |

Alle Maße und Farben sind Parameter in `src/room-constants.js`. Die freie Kamera geht nicht unter die Tischplatte (`FREE_CAM_MIN_Y`) und hält 1 m Abstand zu Wänden und Decke (`FREE_CAM_ROOM_MARGIN`).

## Deckenleuchten

**Drei gleiche Leuchten** über dem Tisch, nach der Skizze:

![Skizze der drei Deckenleuchten](img/ceiling-lamps-sketch.png)

- **Form:** Kegel-Lampenschirm (Dreieck im Profil), an einem **schwarzen Kabel** von der Decke hängend.
- **Farben:** außen **blau**, innen **golden**.
- **Licht:** Kegel-Spot (cone light) mit **Softshadow**. Die Lichtkegel der drei Leuchten überlappen sich auf dem Tisch (siehe gestrichelte Linien in der Skizze).
- **Anordnung:** nebeneinander in einer Reihe entlang der Tischlänge, Abstand 0,85 m (`LAMP_SPACING`).

### Höhe als Parameter (umgesetzt)

- Die **Aufhängehöhe** (Unterkante der Leuchten über dem Boden) ist der **Parameter `LAMP_HEIGHT`** in `src/room-constants.js`, Standard **2,00 m** (vorher 2,40 m; weil die Leuchten tiefer hängen, sind Lichtstärke und -winkel angepasst, damit der Tisch nicht heller wird). Dort stehen auch Abstand, Kabellänge, Schirm- und Lichtwerte.
- Ändert man ihn (z. B. auf 2,50 m), werden **alle drei Leuchten gemeinsam** höher oder tiefer.
- Das **Kabel** passt sich automatisch an: Es ist so lang (z. B. 10 m), dass es immer **durch die Decke nach oben herausragt** und nie sichtbar endet.
- **Schatten:** Nur die drei Deckenleuchten werfen Schatten, und ihr Lichtkegel reicht nur etwa 2 m um den Tisch. Deshalb werfen nur Dinge dort Schatten (Tisch, Kugeln, Cue, Zigaretten, Feuerzeuge, Gläser); Möbel und Kerzen auf den Tischen im Raum nicht (sie stehen außerhalb der Kegel, ein Schatten wäre nie zu sehen und kostet nur Bildrate).

## Nebel und Lichtkegel (umgesetzt)

- **Code:** `src/atmosphere.js`, Werte in `room-constants.js` (`GROUND_FOG_*`, `CEILING_FOG_*`, `FOG_*`, `SHAFT_*`). Der feste Raumnebel (`FOG_*`, linear, siehe oben) bleibt wie er ist.
- **Licht:** Rauchfaden, Ausatem-Wolke und beide Nebel werden **von den Lampen beleuchtet** (`smoke-light.js`): unter den drei Deckenleuchten (Kegel mit sanftem Abfall) und nahe an den Kerzen sind sie hell und leicht gelblich bzw. warm, sonst bleibt nur der dunkle Grundanteil (`SMOKE_LIGHT_AMBIENT`). Die Wandleuchten zählen dabei nicht mit. Stärken: `SMOKE_LAMP_STRENGTH`, `SMOKE_CANDLE_STRENGTH`, `SMOKE_CANDLE_RADIUS`.
- **Farbe:** Rauch, Ausatem-Wolke, Bodennebel und Deckennebel haben **dieselbe Farbe** (`AIR_SMOKE_COLOR`, ein warmes, leicht „verqualmtes“ Grau, kein reines Weißgrau). Der feste Raumnebel (`FOG_COLOR`) bleibt dunkel.
- **Bodennebel:** 5 durchsichtige Schichten zwischen 5 und 55 cm Höhe, **Deckennebel:** 3 Schichten zwischen 3,6 m und der Decke. Jede Schicht ist ein Rauschen-Shader, das langsam und in eigener Richtung durch den Raum wandert (Schwaden mit Wirbeln). Nahe an der Kamera und in großer Ferne blenden sie aus, damit keine harten Kanten entstehen. Die freie Kamera (mindestens Tischhöhe, höchstens 1 m unter der Decke) kommt nie in eine Schicht hinein.
- **Lichtkegel:** Unter jeder Deckenleuchte ein weicher Kegel, der **an der Öffnung des Schirms beginnt** (Schirmradius) und sich bis zum Boden verbreitert (additiv, `SHAFT_ANGLE` 0,6 rad). Er ist dort heller, wo der „Dunst“ dicht ist, und wandert mit. Die Stärke ist bewusst niedrig (`SHAFT_INTENSITY`), damit der Raum nicht heller wirkt als bisher.
- **Spiegelung:** Der Nebel entsteht erst nach der Raum-Aufnahme für die Kugeln, ist also in den Kugeln nicht zu sehen.

## Tische und Sessel (umgesetzt)

- **8 runde Tische** (80 cm, Mahagoni mit Klarlack, Messing-Säule) in zwei Reihen links und rechts vom Billardtisch, jeweils mit 2–3 **Clubsesseln** in weinrotem Leder; die Sessel sind leicht verdreht und teils zurückgeschoben. Lage und Zahl stehen in `furniture-constants.js`, der Bau in `furniture.js` (Sessel als Instanzen).
- **Sperrkreis:** Die freie Kamera hält 1,5 m Abstand zur Tischmitte jeder Gruppe (`FURNITURE_KEEP_OUT_RADIUS`). Die Möbel haben sonst keine Kollision.
- Die Beleuchtung bleibt wie sie ist; im dunklen Raum erscheinen die Möbel nur als gedämpfte Formen.

## Spiegelungen in den Kugeln (umgesetzt)

- **Prinzip:** Beim Start wird der Raum einmal als Würfel-Karte aufgenommen (Tischmitte, Kugelhöhe, noch ohne Kugeln und Cue, HDR). Nur die Kugel-Materialien benutzen sie (`ball-reflection.js`), und zwar nur als Spiegelung, nicht als Licht: Die Kugeln werden dadurch nicht heller.
- **Lampenflecken:** Die Öffnung jeder Deckenleuchte ist in der Aufnahme eine helle Scheibe (`LAMP_REFLECTION_GLOW`), die sonst niemand sieht. Auf jeder Kugel erscheinen die drei Lampen deutlich als helle Flecken.
- **Perspektive:** Die Karte wird wie ein Kasten um den Tisch gelesen (Wände echt, Boden auf Filzhöhe, Decke auf Lampenhöhe), damit die Lampen für jede Kugel an der richtigen Stelle erscheinen.
- **Nicht dabei:** Kugeln spiegeln sich nicht gegenseitig; Holz und Rahmen spiegeln den Raum nicht.

## Wandleuchten (umgesetzt)

Dezente Leuchten an den Wänden (`src/wall-lamps.js`, Parameter `WALL_LAMP*` in `src/room-constants.js`):

- **Anzahl:** 2 pro kurzer Wand, 3 pro langer Wand (zusammen 10), gleichmäßig verteilt.
- **Form:** derselbe Kegel-Lampenschirm wie die Deckenleuchten (außen blau, innen golden), nur kleiner (Faktor 0,45), an einer **Messing-Halterung**: Wandplatte, Arm (25 cm aus der Wand, `WALL_LAMP_ARM_LENGTH`), kurzer Stiel, Knauf.
- **Höhe:** Schirmunterkante 2,0 m über dem Boden (`WALL_LAMP_HEIGHT`).
- **Licht:** je ein weicher, warmer Spot nach unten ohne Schatten. Er wirft einen sanften Lichtkegel auf Wand und Boden.

## Tür (umgesetzt, nur Attrappe)

Code: `src/door.js`, Werte in `door-constants.js`. Aus Rücksicht auf die Bildrate gibt es **kein Foyer** dahinter; die Tür ist eine Attrappe.

- **Wo:** in der kurzen Wand hinter dem Spieler beim Start (z = +15), zwischen den zwei Wandleuchten. Die Wand hat dort eine Öffnung (1,70 × 2,15 m) mit Laibung (25 cm tief), Schwelle und Zierleisten; die Vertäfelung endet an der Zierleiste. Am Ende der Laibung steht eine helle Platte, die das Licht hinter dem Glas ersetzt.
- **Tür:** alte Doppel-Pendeltür aus dem Holz der Wandvertäfelung (gleiche Maserung und Farbe, lackiert; `wainscotWoodMaterial` in `wood.js`), **ohne Spalten** (`DOOR_GAP` 0). Jeder Flügel hat oben 3 × 3 Scheiben, unten zwei Füllungen, eine schräge Druckstange aus dunkler Bronze und drei schwarze Bänder. Schatten wirft sie keine. Sie bewegt sich nicht.
- **Glas:** durchsichtiges, **gewelltes Bernsteinglas**, leicht emissiv (0,5). Auf der mittleren Scheibe der Mitte des linken Flügels steht das **gespiegelte goldene B**, auf der gleichen Scheibe des rechten Flügels das **normale B** (`DOOR_LOGO_*`).

## Fester Raumnebel

- **Linearer Nebel von 1 m bis 12 m** (`FOG_NEAR`, `FOG_FAR`): Ab 1 m beginnt er, bei 12 m ist der Dunst am dichtesten (aber nie komplett deckend).
- **Neutral-grauer Dunst** (`FOG_COLOR`, bewusst dunkel). Nebelfarbe wird von Three.js nicht beleuchtet: ein heller Nebel hellt den ganzen Raum auf, deshalb ist er an die dunkle Stimmung angepasst. Er deckt maximal 60 % (`FOG_MAX_OPACITY`). Es gibt keinen Vignetten-Effekt (kein „Taschenlampen-Look“).
- **Beleuchtung des Raums:** Haupt-Lichtquellen sind die drei Deckenleuchten über dem Tisch. Nur ein sehr schwaches, warmes Umgebungslicht (`ROOM_AMBIENT_*`) lässt die Wände als Schemen erahnen. Der Raum bleibt dunkel, gedämpft und weich.

## Offene Punkte

- Wanddekoration (Poster, Tapete, Fenster).
- Die Tür ist eine Attrappe: kein Foyer dahinter (kostete zu viel Bildrate), sie öffnet sich nicht.
- Feintuning von Armlänge, Höhe und Verteilung der Wandleuchten und des Abstands der Deckenleuchten.
