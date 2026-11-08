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
- **Schatten:** Nur die drei Deckenleuchten werfen Schatten, und ihr Lichtkegel reicht nur etwa 2 m um den Tisch. Deshalb werfen nur Dinge dort Schatten (Tisch, Kugeln, Cue, Zigaretten, Feuerzeuge, Gläser); Möbel, Kerzen und das Radio nicht (sie stehen außerhalb der Kegel, ein Schatten wäre nie zu sehen und kostet nur Bildrate).
- **Neu zeichnen:** Die drei Schatten-Karten werden nur dann neu gezeichnet, wenn sich etwas im Kegel bewegt hat (Kugeln, Cue, Zigaretten samt Abbrand in 2-%-Schritten, Feuerzeuge). Das langsame Schwanken des Cues folgt höchstens alle 50 ms, der Stoß jedes Bild. Liegt alles still, wird nichts gezeichnet (früher alle 0,5 s). Werte `LAMP_SHADOW_*` in `room-constants.js`.

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
- **Licht:** je ein weicher, warmer Kegel nach unten ohne Schatten (Reichweite 7 m, `WALL_LAMP_LIGHT_*`); er wirft einen sanften Lichtkegel auf Wand und Boden. Die Lampen sind **keine Three.js-Lichter**: Zehn Lichter mehr würden für jedes Pixel jedes Materials gerechnet (auf einer Grafikkarte etwa 37 ms pro Bild). Stattdessen berechnet `wall-lamp-light.js` ihr Licht mit denselben Formeln (Kegel, Weichzeichnung, Abfall, Beleuchtungsmodell) in den wenigen Materialien, die sie erreichen kann: Wände, Vertäfelung, Teppich, die Lampen selbst, das Radio und die Sessel an der Wand. Alle anderen Materialien zahlen nichts. Ein Bildvergleich vorher/nachher ergab keinen Unterschied. Neue Dinge, die unter einer Wandlampe stehen, brauchen `receiveWallLamps(material)`.

## Tür (umgesetzt, nur Attrappe)

Code: `src/door.js`, Werte in `door-constants.js`. Aus Rücksicht auf die Bildrate gibt es **kein Foyer** dahinter; die Tür ist eine Attrappe.

- **Wo:** in der kurzen Wand hinter dem Spieler beim Start (z = +15), zwischen den zwei Wandleuchten. Die Wand hat dort eine Öffnung (1,70 × 2,15 m) mit Laibung (25 cm tief), Schwelle und Zierleisten; die Vertäfelung endet an der Zierleiste. Am Ende der Laibung steht eine helle Platte, die das Licht hinter dem Glas ersetzt.
- **Tür:** alte Doppel-Pendeltür aus dem Holz der Wandvertäfelung (gleiche Maserung und Farbe, lackiert; `wainscotWoodMaterial` in `wood.js`), **ohne Spalten** (`DOOR_GAP` 0). Jeder Flügel hat oben 3 × 3 Scheiben, unten zwei Füllungen, eine schräge Druckstange aus dunkler Bronze und drei schwarze Bänder. Schatten wirft sie keine. Sie bewegt sich nicht.
- **Glas:** durchsichtiges, **gewelltes Bernsteinglas**, leicht emissiv (0,5). Auf der mittleren Scheibe der Mitte des linken Flügels steht das **gespiegelte goldene B**, auf der gleichen Scheibe des rechten Flügels das **normale B** (`DOOR_LOGO_*`).

## Kugeln: Einschlüsse (umgesetzt)

Die Kugeln tragen kleine **Einschlüsse** wie Elfenbeinkugeln (`src/ball-texture.js`, Werte in `ball-constants.js`), damit man sieht, wie sie sich drehen: etwa 90 winzige Flecken (Radius 0,4–1,2 mm) gleichmäßig über die ganze Kugel verteilt, **für jede Kugel ein anderes Muster** (fest, bei jedem Start gleich). Auf hellen und bunten Kugeln sind sie dunkelbraun, auf der schwarzen 8 hell-grau. Rein optisch: eine kleine Canvas-Textur je Kugel (512 × 256, einmal erzeugt und behalten), die Farbe der Kugel steckt in der Textur. Größe, Anzahl und Stärke der Flecken stehen in `ball-constants.js`.

## Filz: abgenutzt und mit Flecken (umgesetzt)

Der Filz ist nicht mehr einfarbig (`src/felt-texture.js`, Werte in `felt-constants.js`). Eine Farb- und eine Rauigkeits-Textur (je 1024 × 512, ca. 2,5 mm pro Pixel, einmal erzeugt) legen sich nach der Position (u = x, v = z in Metern) über das ganze Spielfeld. **Immer gleiches Aussehen**, nichts ist zufällig. Die Grundfarbe ist die alte (`0x0a4032`), dazu ein feines Faserrauschen (±2).
- **Abgenutzter Kopfpunkt** (dort, wo die weiße Kugel aufgelegt wird, `HEAD_SPOT_Z` in `table-constants.js`), zweiteilig:
  - **Loch:** eine **kleine, dunkle, wulstige Stelle** (ca. 3 cm breit, ein Drittel der früheren), an der der Filz durchgescheuert ist und der dunkle Untergrund zeigt; unregelmäßig gelappt, Rand leicht ausgefranst, minimal neben dem Mittelpunkt der Kugel (`FELT_WEAR`).
  - **Ausgewaschener Fleck** darum: heller und grauer (die Fasern sind flachgedrückt), unregelmäßig gelappt, etwas glatter und mit schwachem Schimmer unter den Lampen, Radius ca. 7,5 cm und nur halb so stark wie in der ersten Fassung (`FELT_WASH`).
  Beide sind mit Absicht deutlicher als die Flecken.
- **Drei Wasserflecken** (Rotwein, vergeblich ausgewaschen): jeder hat einen **unregelmäßigen, langgezogenen, gelappten Umriss** wie eine verlaufene Pfütze (Form, Länge und Drehung je Fleck verschieden), innen minimal heller und grauer, am Rand ein feiner Ring, der **an manchen Stellen kräftig ist und an anderen fehlt**, mit einem schwächeren zweiten Ring innen (einer mit einem Hauch Rot), matt (Rauigkeit 1,0). Sehr dezent, man sieht sie erst beim Hinsehen.
- Rein optisch, die Reibung ändert sich nicht.

## Fester Raumnebel

- **Linearer Nebel von 1 m bis 12 m** (`FOG_NEAR`, `FOG_FAR`): Ab 1 m beginnt er, bei 12 m ist der Dunst am dichtesten (aber nie komplett deckend).
- **Neutral-grauer Dunst** (`FOG_COLOR`, bewusst dunkel). Nebelfarbe wird von Three.js nicht beleuchtet: ein heller Nebel hellt den ganzen Raum auf, deshalb ist er an die dunkle Stimmung angepasst. Er deckt maximal 60 % (`FOG_MAX_OPACITY`). Es gibt keinen Vignetten-Effekt (kein „Taschenlampen-Look“).
- **Beleuchtung des Raums:** Haupt-Lichtquellen sind die drei Deckenleuchten über dem Tisch. Nur ein sehr schwaches, warmes Umgebungslicht (`ROOM_AMBIENT_*`) lässt die Wände als Schemen erahnen. Der Raum bleibt dunkel, gedämpft und weich.

## Offene Punkte

- Wanddekoration (Poster, Tapete, Fenster).
- Die Tür ist eine Attrappe: kein Foyer dahinter (kostete zu viel Bildrate), sie öffnet sich nicht.
- Feintuning von Armlänge, Höhe und Verteilung der Wandleuchten und des Abstands der Deckenleuchten.
