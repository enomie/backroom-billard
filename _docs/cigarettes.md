# Zigaretten und Rauch

> **Status:** Die **einzelne Zigarette** und der **Rauchfaden** der glimmenden Zigarette sind umgesetzt (Test: die Zigaretten liegen in den Aschenbechern). **Schachtel, Ausatem-Wolke, Ziehen und die Bedienung durch den Spieler sind Konzept** und werden erst gebaut, wenn es ausdrücklich beauftragt wird. Gläser, Flaschen und Aschenbecher stehen in [`glass-objects.md`](glass-objects.md).

Zur 80er-Kneipe gehört Rauch. Es gibt eine **Zigarettenschachtel zum Aufklappen**, **einzelne Zigaretten** (unangezündet, glimmend, Stummel) und **Rauch** per Shader. Wer an einer Zigarette zieht, **atmet danach eine Rauchwolke aus**.

## Referenzbilder

Die drei Bilder liegen **nicht im Repo** (Bildrechte ungeklärt), sie sind nur Vorlagen:

1. **Klappschachtel:** weißes Gehäuse, Deckel klappt nach hinten, **20 Zigaretten** in drei Reihen (7, 6, 7) mit orangefarbenem Filter nach vorn. Außen rotes Dach mit Krone, goldener Text. Nur als Vorbild für die Form; **die Gestaltung wird selbst entworfen**, mit fiktivem Namen und ohne echte Marke.
2. **Rauchfaden:** durchscheinende, weißblaue Bänder, die sich nach oben verdrehen, unten die Glut. Das ist der Zielstil für den **Rauch einer glimmenden Zigarette**.
3. **Rauchwolke:** dichte, wolkige Fläche mit dunkel ausgefransten Rändern (im Bild lila eingefärbt, bei uns grau-weiß). Zielstil für die **ausgeatmete Wolke**.

## Schachtel

- **Größe:** ca. 86 × 55 × 23 mm, innen **20 Zigaretten** in drei Reihen **7 – 6 – 7**.
- **Aufbau:** Unterteil und **Klappdeckel** mit Scharnier an der Rückseite; Deckel öffnet in einer kurzen Animation (ca. 0,4 s). Innen Silberpapier, vorne ein Ausschnitt, damit man die Zigaretten greift.
- **Optik:** weiß mit rotem Dach (Canvas-Textur, fiktive Marke), zur Lampe hin leicht glänzend.
- **Stehen:** auf den Tischen, auf dem Holzrahmen des Billardtisches (Platz: 11 cm Breite, die Schachtel liegt flach) und im Aschenbecher-Umfeld. Zufällige Verteilung wie bei den Gläsern.
- **Inhalt:** Die Zigaretten sind echte Objekte; wird eine entnommen, fehlt sie in der Schachtel (20 → 19 …).

## Einzelne Zigarette (umgesetzt)

- **Code:** `src/cigarettes.js`, Werte in `src/cigarette-constants.js`.
- **Form:** 84 mm lang, Ø 8 mm, Filter 25 mm in Orange mit feinen Sprenkeln, weißer Papierschaft. Zustände: unangezündet, glimmend, Stummel.
- **Glimmend:** Die Spitze trägt Asche (bis 6 mm) und eine pulsierende Glut mit weichem Schein (nur leuchtend, kein echtes Licht). Die Zigarette **brennt über die Zeit herunter** (7 Minuten Spielzeit, `CIGARETTE_BURN_SECONDS`) und wird danach zum Stummel ohne Glut.
- **Test-Aufbau:** Jeder Aschenbecher auf den Tischen bekommt 1–3 Zigaretten in zufälligen Kerben, gemischt aus glimmend (45 %), unangezündet (20 %) und Stummel; die Aschenbecher der Spieler am Billardtisch bekommen **genau eine**, glimmend. Sie liegt quer in der Kerbe, die Spitze ruht innen auf dem Schalenboden.
- **Rauch:** Jede glimmende Zigarette hat einen Rauchfaden (siehe „Rauch“). Er endet mit der Glut.
- **Noch nicht:** Entnehmen, Anzünden, Ziehen und Ausatmen.

## Zustände im Überblick

| Zustand | Aussehen |
|---------|----------|
| **Unangezündet** | weißer Papierschaft (Ø 8 mm, ca. 84 mm lang, davon ca. 25 mm orange gefärbter Filter). |
| **Glimmend** | Glut an der Spitze (orange-rot, pulsiert leicht), **Asche** (grau, wächst), die Zigarette wird **über die Zeit kürzer**; dünner Rauchfaden steigt auf. |
| **Zug** | Die Glut leuchtet kurz stark auf, der Faden wird dünner, dann wird eine **Wolke ausgeatmet** (siehe unten). |
| **Stummel** | nur noch Filter mit etwas Asche; wird im Aschenbecher ausgedrückt. |

- **Brenndauer:** einstellbar (umgesetzt: 7 Minuten Spielzeit), Werte in `cigarette-constants.js`.
- **Im Aschenbecher:** Zigaretten liegen in den **5 Kerben**, glimmen weiter und rauchen dünn. Auch bei den Tischen sollen einige Aschenbecher mit **qualmenden Zigaretten** stehen (zufällig verteilt, wenige zugleich).
- **Ablage:** auf der Kerbe, die Glut zeigt nach innen.

## Spieler und Zigarette

- **Entnehmen:** Klick auf die Schachtel nimmt eine Zigarette (Schachtel öffnet sich).
- **Anzünden:** automatisch beim Nehmen oder mit einer eigenen Aktion (offen).
- **Halten:** Wie der Cue (`CUE_CARRY_*`) liegt sie entspannt im Bild, etwa an der Seite; beim Zielen und Stoßen ist sie im Aschenbecher abgelegt.
- **Ziehen:** eigene Taste (offen); die Glut leuchtet, nach kurzem Halten **atmet der Spieler aus**: eine **Wolke** aus der Blickrichtung des Spielers, die langsam im Raum steht und sich auflöst.
- **Sound:** Anzünden (Feuerzeug), Knistern der Glut beim Zug, Ausatmen (passend zu den Atemgeräuschen in [`sound.md`](sound.md)).
- **Texte:** alle sichtbaren Texte (Tasten-Hinweis) laufen durch `src/i18n`.

## Rauch (Shader)

**Umgesetzt ist der Rauchfaden** (`src/smoke.js`, Werte `SMOKE_*` in `cigarette-constants.js`): eine hohe, schmale Fläche (5 × 40 cm), die sich um die senkrechte Achse zur Kamera dreht. Der Fragment-Shader zeichnet aus vier Schichten Rauschen (fBm) mit Verwirbelung (Domain Warping) einen langsam nach oben wandernden Streifen, unten dünn und deutlich, oben breit und blass. Im Vertex-Shader schwankt der Faden umso mehr, je höher er steigt. Grau, durchscheinend, ohne Tiefenschreiben, mit dem Raumnebel. Eine Fläche pro glimmender Zigarette; **die Ausatem-Wolke fehlt noch.** Die Quellen unten habe ich nicht ausgewertet, der Shader ist eigenständig nach dem üblichen Verfahren gebaut.

Die ursprünglichen Vorgaben:

**Ziel:** Weicher, durchscheinender Rauch, der sich träge nach oben dreht, im Lichtkegel der Lampen heller wird und die Stimmung des dunklen Raums nicht heller macht.

**Zwei Arten:**

1. **Rauchfaden** (glimmende Zigarette): ein schmales, nach oben gestrecktes Band (Ribbon oder Billboard) mit **Fragment-Shader**: mehrschichtiges Rauschen (fBm), das nach oben scrollt, mit **Verwirbelung** (Domain Warping) und einem Alpha, der zu den Seiten und nach oben ausläuft. Je höher, desto breiter und blasser.
2. **Ausatem-Wolke:** wenige, größere Sprites mit demselben Rauschen, die aus dem Mund/der Hand wachsen, dem Blick folgen, sich verwirbeln und nach ca. 5–8 s auflösen.

**Technik:**
- `ShaderMaterial` mit Transparenz, **ohne Tiefenschreiben**, weiche Kanten (Alpha-Verlauf); optional „Soft Particles“ (Alpha an der Tiefe zur Tischplatte ausblenden).
- Zeit als Uniform; ein Rauschmuster per Textur (billig) oder berechnet.
- **Licht:** Der Rauch bekommt etwas Farbe vom Lampenlicht (je näher an einem Lichtkegel, desto heller), sonst ist er grau-weiß und geht im Dunkel unter.
- **Kosten:** wenige Rauchquellen zugleich (Spieler, ein paar Aschenbecher in der Nähe der Kamera), weiter entfernte schalten ab; auf Handys weniger Schichten.
- **Nicht** als Volumen-Raymarching, das ist zu teuer für viele Quellen.

### Quellen und Anleitungen (noch nicht ausgewertet)

- [shaders.com — Smoke-Komponente](https://shaders.com/docs/components/smoke)
- [Zero One Group — Coffee-Smoke-Shader mit Three.js und GLSL](https://blog.zero-one-group.com/creating-a-coffee-smoke-shader-with-three-js-and-glsl-a911ff99a880)
- [Brad Woods — Shaders 103: Smoke (Three.js)](https://garden.bradwoods.io/notes/javascript/three-js/shaders/shaders-103-smoke)
- [UBOS — Three.js Smoke Shader Tutorial](https://ubos.tech/news/three-js-smoke-shader-tutorial-create-realistic-3d-smoke-effects/)
- [GitHub Gist von MartinRGB](https://gist.github.com/MartinRGB/0f47d4d7a2d933f817cf93f49cd290ed)

Vor der Umsetzung werden die Quellen gelesen und das passende Verfahren gewählt; die Lizenz der Codebeispiele ist zu prüfen.

## Offene Punkte

- **Darstellung von Rauchen:** Das Thema kann bei Plattformen oder Altersfreigaben eine Rolle spielen; vor einer Veröffentlichung klären (z. B. Hinweis oder abschaltbar in den Einstellungen).
- Taste zum Ziehen und Anzünden, Haltepose der Zigarette.
- Wie lange brennt eine Zigarette, wie viele sind zugleich erlaubt?
- Soll der Raumdunst vom Rauch dichter werden (der Nebel ist heute fest)?
- Gerüche und Husten: bewusst weglassen.
