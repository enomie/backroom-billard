# Zigaretten, Feuerzeug und Rauch

> **Status: umgesetzt.** Offen sind nur die Punkte am Ende. Gläser, Flaschen und Aschenbecher stehen in [`glass-objects.md`](glass-objects.md), die Wirkung auf die Balken in [`game-concept.md`](game-concept.md).

Zur 80er-Kneipe gehört Rauch: eine Klappschachtel, einzelne Zigaretten, ein Feuerzeug, ein Rauchfaden über jeder Glut und eine Wolke beim Ausatmen. Die Taste **`T`** (oder der Knopf „Smoke“) steuert alles.

## Ablauf mit `T` (`src/smoking.js`, Werte `SMOKING_*`, `LIGHTING_*`)

- **Es glimmt eine Zigarette im Aschenbecher des Spielers:** `T` halten, die Zigarette **fliegt in einem Bogen zum Mund** (0,45 s; vor und unterhalb der Kamera, leicht rechts, Spitze nach vorn) und folgt dort der Kamera. Die Glut leuchtet immer heller (voll nach 1,5 s), der Rauchfaden wird schwächer, und es läuft der Einatem-Ton, der lauter und heller wird (3 s bis zum Maximum), dazu das Knistern der Glut.
- **Loslassen:** Die Zigarette fliegt in ihre Kerbe zurück (0,5 s), und der Spieler **atmet aus**: je länger gehalten (bis 3 s), desto mehr Rauch (5 bis 36 Rauchballen, schneller und dichter) und desto länger der Ausatem-Ton (0,7 bis 2,6 s). Ein kurzes Antippen gibt ein Wölkchen.
- **Keine glimmende Zigarette da:** `T` halten **nimmt eine neue**. Sie fliegt aus der Packung des Spielers (Filter voran) zum Mund (0,5 s), das Feuerzeug fliegt zur Spitze, der Deckel klappt auf, die Flamme brennt 0,6 s und zündet bei 40 % davon, Deckel zu, das Feuerzeug fliegt zurück (zusammen 1,5 s). Wer weiter hält, zieht; lässt man früher los, wird die brennende Zigarette zurückgelegt.
- **5 Züge pro Zigarette:** Beim Ziehen brennt sie 28-mal schneller herunter (ein 3-Sekunden-Zug verbraucht etwa ein Fünftel, `SMOKING_BURN_FACTOR`). Wer will, raucht sie auf einmal (`T` etwa 15 s halten). Das Ziehen schiebt den Balken Nerves ↔ Desire.
- **Abgebrannt beim Ziehen:** Der Zug endet von selbst (mit Ausatmen), die Zigarette fliegt über den Aschenbecher und **fällt aus 10 cm Höhe hinein** (`SMOKING_DROP_*`): Schwerkraft, ein paar gedämpfte Aufschläge (35 %), Drehung, am Ende liegt sie flach im Schalenboden. Der Fall rechnet in festen Schritten, ist also bei jeder Bildrate gleich.
- **Brennt im Aschenbecher von selbst ab** (7 Minuten, `CIGARETTE_BURN_SECONDS`; auch die des anderen Spielers und die auf den Tischen): Sie rutscht in einem kurzen Hüpfer vom Rand in die Schale. Stummel liegen immer innerhalb der Schale, auch die zu Beginn.

## Packung und Kauf

- **Schachtel** (`src/cigarette-pack.js`, `PACK_*`): 58 × 88 × 23,5 mm aus dünnen Kartonplatten mit **Klappdeckel** (Scharnier hinten oben), innen **20 Zigaretten** (7 – 6 – 7, Filter nach oben). Zwei Ausführungen (`PACK_DESIGNS`): **schwarz/rot/gold** („BACKROOM · Premium Blend“) und **weiß/blau** („BACKROOM · Light Blend“), erfundene Marke. Offen (Deckel um etwa 110° zurück, Filter zu sehen) oder geschlossen. Das Auf- und Zuklappen per Klick oder Animation gibt es nicht.
- **Verteilung:** Die Hälfte der Tische hat eine (auf dem Rücken, zufällig gedreht, mit Abstand zu Kerze, Aschenbecher, Gläsern und Flaschen). Auf dem Rahmen des Billardtisches liegt **je Spieler eine** (links, quer zum Rahmen), die beiden Ausführungen in zufälliger Reihenfolge, bei jedem Laden neu.
- **Zählung:** Die Zahl der Zigaretten in der Packung steht als Plakette am Knopf „Smoke“ (Packung der Seite nahe der Kamera); die genommenen fehlen auch in der Packung (die Packungen der Spieler haben einzelne Zigaretten).
- **Packung leer:** Eine neue wird **automatisch gekauft** (`PACK_PRICE` 75 $ in `shop-constants.js`), mit kurzer Meldung. Reicht das Geld nicht, passiert nichts („Nicht genug Geld“).

## Zigarette (`src/cigarettes.js`, `cigarette-constants.js`)

- **Form:** 84 mm lang, Ø 8 mm, Filter 25 mm in **Beige-Tan** mit feinen Sprenkeln, weißer Papierschaft. Zustände: unangezündet, glimmend, Stummel.
- **Glimmend:** Asche an der Spitze (bis 6 mm), eine pulsierende Glut mit weichem Schein (nur leuchtend, kein echtes Licht); sie wird über die Zeit kürzer.
- **Zu Beginn:** Jeder Aschenbecher auf den Tischen hat 1–3 Zigaretten in zufälligen Kerben (45 % glimmend, 20 % unangezündet, der Rest Stummel in der Schale). Die Aschenbecher der Spieler haben **genau eine**, glimmend. Sie liegt quer in der Kerbe, die Spitze ruht innen auf dem Schalenboden.

## Feuerzeug (`src/lighter.js`, `lighter-constants.js`, Töne `lighter-sounds.js`)

Klapp-Feuerzeug im Stil eines Zippos: Gehäuse 38 × 13 mm, 40 mm hoch, Klappdeckel (18 mm) mit Scharnier, innen Einsatz mit Kamin, Funkenrad und eine Flamme mit Schein. **Gebürstetes Metall** (Schleifstreifen als Bump- und Rauheits-Karte, Spiegelung des Raums): das des ersten Spielers **silbern**, das des zweiten **golden** (`LIGHTER_COLORS`). Je eines liegt auf dem Rahmen links (bei z = ±0,2, auf der breiten Seite). Töne: Deckel auf („Klick“), Funkenrad und Flamme, Deckel zu.

## Rauch (Shader)

- **Rauchfaden** (`src/smoke.js`, `SMOKE_*`): eine hohe, schmale Fläche (5 × 40 cm), die sich um die senkrechte Achse zur Kamera dreht. Der Fragment-Shader zeichnet aus vier Schichten Rauschen (fBm) mit Verwirbelung einen nach oben wandernden Streifen, unten dünn und deutlich, oben breit und blass; im Vertex-Shader schwankt er umso mehr, je höher er steigt. Eine Fläche je glimmender Zigarette, sie endet mit der Glut.
- **Ausatem-Wolke** (`src/exhale.js`, `EXHALE_*`): weiche Rauchballen (Rauschen-Shader mit ausgefranstem Rand), die aus dem Mund in Blickrichtung fliegen, langsamer werden, von 12 auf 75 cm wachsen, leicht steigen und sich nach 5–8 s auflösen.
- **Gemeinsam:** Transparenz ohne Tiefenschreiben, eine Farbe für allen Rauch und Nebel (`AIR_SMOKE_COLOR`), **beleuchtet von den Deckenlampen und den Kerzen** (`smoke-light.js`, siehe `look.md`), geteiltes Rauschen in `noise-glsl.js`. Das Verfahren ist eigenständig nach dem üblichen Vorgehen gebaut; die Quellen unten wurden **nicht ausgewertet**:
  - [shaders.com — Smoke-Komponente](https://shaders.com/docs/components/smoke)
  - [Zero One Group — Coffee-Smoke-Shader mit Three.js und GLSL](https://blog.zero-one-group.com/creating-a-coffee-smoke-shader-with-three-js-and-glsl-a911ff99a880)
  - [Brad Woods — Shaders 103: Smoke (Three.js)](https://garden.bradwoods.io/notes/javascript/three-js/shaders/shaders-103-smoke)
  - [UBOS — Three.js Smoke Shader Tutorial](https://ubos.tech/news/three-js-smoke-shader-tutorial-create-realistic-3d-smoke-effects/)
  - [GitHub Gist von MartinRGB](https://gist.github.com/MartinRGB/0f47d4d7a2d933f817cf93f49cd290ed)

## Referenzbilder

Liegen **nicht im Repo** (Bildrechte ungeklärt): eine weiße Klappschachtel mit 20 Zigaretten (nur Formvorbild, die Gestaltung ist selbst entworfen), ein Rauchfaden aus durchscheinenden Bändern mit Glut (Zielstil Faden) und eine dichte Wolke mit ausgefransten Rändern (Zielstil Ausatem-Wolke).

## Offene Punkte

- **Darstellung von Rauchen:** Das Thema kann bei Plattformen oder Altersfreigaben eine Rolle spielen; vor einer Veröffentlichung klären (z. B. Hinweis oder abschaltbar in den Einstellungen).
- Aufklappen der Schachtel als Animation (ca. 0,4 s, innen Silberpapier).
- Soll der Raumdunst vom Rauch dichter werden (der Nebel ist heute unabhängig vom Rauch)?
- Gerüche und Husten: bewusst weglassen.
