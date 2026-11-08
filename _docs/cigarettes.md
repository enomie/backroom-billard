# Zigaretten und Rauch

> **Status: umgesetzt** sind die einzelne Zigarette, der Rauchfaden, die Schachtel, das Ziehen und Ausatmen (Taste `T`), das Feuerzeug, das Nehmen und Anzünden einer neuen Zigarette und der Kauf neuer Packungen. **Konzept** bleibt, was unten als „ursprüngliche Vorgaben“ steht, z. B. das Auf- und Zuklappen der Schachtel per Klick. Gläser, Flaschen und Aschenbecher stehen in [`glass-objects.md`](glass-objects.md).

Zur 80er-Kneipe gehört Rauch. Es gibt eine **Zigarettenschachtel zum Aufklappen**, **einzelne Zigaretten** (unangezündet, glimmend, Stummel) und **Rauch** per Shader. Wer an einer Zigarette zieht, **atmet danach eine Rauchwolke aus**.

## Referenzbilder

Die drei Bilder liegen **nicht im Repo** (Bildrechte ungeklärt), sie sind nur Vorlagen:

1. **Klappschachtel:** weißes Gehäuse, Deckel klappt nach hinten, **20 Zigaretten** in drei Reihen (7, 6, 7) mit orangefarbenem Filter nach vorn. Außen rotes Dach mit Krone, goldener Text. Nur als Vorbild für die Form; **die Gestaltung wird selbst entworfen**, mit fiktivem Namen und ohne echte Marke.
2. **Rauchfaden:** durchscheinende, weißblaue Bänder, die sich nach oben verdrehen, unten die Glut. Das ist der Zielstil für den **Rauch einer glimmenden Zigarette**.
3. **Rauchwolke:** dichte, wolkige Fläche mit dunkel ausgefransten Rändern (im Bild lila eingefärbt, bei uns grau-weiß). Zielstil für die **ausgeatmete Wolke**.

## Schachtel (umgesetzt, nur Optik)

- **Code:** `src/cigarette-pack.js`, Werte `PACK_*` in `cigarette-constants.js`.
- **Form:** Klappschachtel aus dünnen Kartonplatten, 58 × 88 × 23,5 mm: Boden, Rückwand, Seiten und unterer Teil der Front als Körper, dazu ein **Klappdeckel** mit Scharnier hinten oben (Front, Oberseite, Seiten). Innen **20 Zigaretten** in drei Reihen (7 – 6 – 7, dicht gepackt), Filter nach oben.
- **Gestaltung:** Zwei Ausführungen (`PACK_DESIGNS`): **schwarz/rot/gold** („BACKROOM · Premium Blend“) und **weiß/blau** („BACKROOM · Light Blend“), beide „No. 20“ (erfundene Marke). Am Billardtisch bekommt jeder Spieler eine andere. Die Front-Grafik ist auf Körper und Deckel aufgeteilt.
- **Zustand:** geschlossen oder **offen** (Deckel um etwa 110° nach hinten geklappt, die Filter sind zu sehen). Eine Animation zum Auf- und Zuklappen gibt es noch nicht.
- **Verteilung:** Die Hälfte der Tische hat eine Schachtel (liegt auf dem Rücken, zufällig gedreht, zur Hälfte offen, mit Abstand zu Kerze, Aschenbecher, Gläsern und Flaschen). Auf dem Rahmen des Billardtisches liegt **je Spieler eine** (links, zwischen zwei Rauten, quer zum Rahmen), offen oder geschlossen, bei jedem Laden neu gewürfelt.
- **Noch nicht:** Entnehmen einer Zigarette (die Anzahl in der Schachtel bleibt 20), Klappen per Klick.

Die ursprünglichen Vorgaben:

- **Größe:** ca. 86 × 55 × 23 mm, innen **20 Zigaretten** in drei Reihen **7 – 6 – 7**.
- **Aufbau:** Unterteil und **Klappdeckel** mit Scharnier an der Rückseite; Deckel öffnet in einer kurzen Animation (ca. 0,4 s). Innen Silberpapier, vorne ein Ausschnitt, damit man die Zigaretten greift.
- **Optik:** weiß mit rotem Dach (Canvas-Textur, fiktive Marke), zur Lampe hin leicht glänzend.
- **Stehen:** auf den Tischen, auf dem Holzrahmen des Billardtisches (Platz: 11 cm Breite, die Schachtel liegt flach) und im Aschenbecher-Umfeld. Zufällige Verteilung wie bei den Gläsern.
- **Inhalt:** Die Zigaretten sind echte Objekte; wird eine entnommen, fehlt sie in der Schachtel (20 → 19 …).

## Einzelne Zigarette (umgesetzt)

- **Code:** `src/cigarettes.js`, Werte in `src/cigarette-constants.js`.
- **Form:** 84 mm lang, Ø 8 mm, Filter 25 mm in Beige-Tan (nach einem Foto) mit feinen Sprenkeln, weißer Papierschaft. Zustände: unangezündet, glimmend, Stummel.
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

## Feuerzeug (umgesetzt)

- **Code:** `src/lighter.js`, Werte in `src/lighter-constants.js`, Töne in `src/lighter-sounds.js`.
- **Form:** Ein Klapp-Feuerzeug im Stil eines Zippos: Gehäuse 38 × 13 mm, 40 mm hoch, Klappdeckel (18 mm) mit Scharnier hinten oben, innen Einsatz mit Kamin (zwei Löcher), Funkenrad und eine kleine Flamme mit Schein.
- **Material:** **gebürstetes Metall**: Schleifstreifen als Bump- und Rauheits-Karte, Spiegelung des Raums. Der erste Spieler hat ein **silbernes**, der zweite ein **goldenes** (`LIGHTER_COLORS`).
- **Platz:** Je Spieler eines auf dem Rahmen des Billardtisches (links, bei z = ±0,2 zwischen Seitentasche und erster Raute), auf der breiten Seite liegend.
- **Ton:** Deckel klappt auf („Klick“), Funkenrad und Flamme zünden, Deckel schnappt zu.

## Neue Zigarette: Packung, Feuerzeug, Kauf (umgesetzt)

Hat der Spieler keine glimmende Zigarette im Aschenbecher (abgebrannt und gefallen), nimmt **`T` halten** eine neue:

1. Die Zigarette fliegt aus der Packung des Spielers (Filter voran) zum Mund (0,5 s). In der Packung fehlt dann eine.
2. Das Feuerzeug des Spielers fliegt zur Zigarettenspitze, der Deckel klappt auf, die Flamme brennt 0,6 s; bei 40 % davon fängt die Zigarette Feuer. Deckel zu, das Feuerzeug fliegt zurück (zusammen 1,5 s).
3. Wer `T` weiter hält, **zieht** wie gewohnt. Lässt man früher los, wird die brennende Zigarette in den Aschenbecher zurückgelegt.

- **Anzeige:** Die **Zahl der Zigaretten in der Packung** steht als Plakette am Knopf „Smoke“ (die Packung des Spielers, der Seite nahe der Kamera). In der Packung selbst fehlen die genommenen Zigaretten (die Packungen am Billardtisch haben einzelne Zigaretten).
- **Packung leer:** Dann wird **automatisch eine neue Packung gekauft**: **75 $** (`PACK_PRICE` in `shop-constants.js`) vom Geld, mit kurzer Meldung. Reicht das Geld nicht, passiert nichts („Nicht genug Geld“).
- **Aschenbecher-Fehler behoben:** Brennt eine Zigarette im Aschenbecher von selbst ab (auch die des anderen Spielers und die auf den Tischen), **fällt sie jetzt in die Schale**, statt als Stummel quer über dem Rand liegen zu bleiben. Stummel zu Beginn liegen gleich flach in der Schale.

## Spieler und Zigarette

**Umgesetzt: Ziehen mit `T`** (`src/smoking.js`, Werte `SMOKING_*`, Ton in `smoke-sounds.js`):

- **Halten von `T`:** Die glimmende Zigarette aus dem Aschenbecher des Spielers (auf dem Rahmen des Billardtisches, die nächste zur Kamera) **fliegt in einem kleinen Bogen zum Mund** (0,45 s): vor und etwas unterhalb der Kamera, leicht nach rechts, Spitze nach vorn. Dort bleibt sie und folgt der Kamera. Die Glut leuchtet immer heller (voll nach 1,5 s), der Rauchfaden wird schwächer, und die Zigarette brennt schneller herunter.
- **Ton beim Ziehen:** ein weiches Einatmen, das lauter und heller wird, solange man hält (3 s bis zum Maximum), dazu das Knistern der Glut.
- **Loslassen:** Die Zigarette fliegt in ihre Kerbe zurück (0,5 s), und der Spieler **atmet aus**. Je länger gehalten (bis 3 s), desto mehr Rauch: 5 bis 36 Rauchballen, schneller und dichter, über 0,5 bis 1,6 s; der Ausatem-Ton wird länger (0,7 bis 2,6 s) und lauter. Ein kurzes Antippen gibt ein kleines Wölkchen.
- **Brennt beim Ziehen ab:** Ja. Beim Ziehen brennt die Zigarette 28-mal schneller herunter (ein voller 3-Sekunden-Zug verbraucht etwa ein Fünftel, `SMOKING_BURN_FACTOR`), die Papierlänge schrumpft sichtbar und die Asche wächst.
- **Abgebrannt:** Ist sie beim Ziehen aufgebraucht, endet der Zug von selbst (mit Ausatmen), die Zigarette fliegt über den Aschenbecher und **fällt aus 10 cm Höhe hinein** (`SMOKING_DROP_*`): Schwerkraft, ein paar Aufschläge mit Dämpfung (35 %), sie dreht sich dabei und legt sich flach auf den Schalenboden, wo sie als Stummel liegen bleibt. Der Fall rechnet in festen Schritten, ist also bei jeder Bildrate gleich.
- **5 Züge pro Zigarette (umgesetzt):** ein voller 3-Sekunden-Zug verbraucht etwa ein Fünftel (`SMOKING_BURN_FACTOR` 28). Wer will, **raucht die ganze Zigarette auf einmal**, indem er `T` entsprechend lange hält (ca. 15 s); dann fällt der Stummel wie oben beschrieben in den Aschenbecher. Das Ziehen schiebt den Nikotin-Balken (`game-concept.md`).
- Ohne glimmende Zigarette im Spieler-Aschenbecher nimmt `T` eine neue (siehe oben).

Die ursprünglichen Vorgaben:

- **Entnehmen:** Klick auf die Schachtel nimmt eine Zigarette (Schachtel öffnet sich).
- **Anzünden:** automatisch beim Nehmen oder mit einer eigenen Aktion (offen).
- **Halten:** Wie der Cue (`CUE_CARRY_*`) liegt sie entspannt im Bild, etwa an der Seite; beim Zielen und Stoßen ist sie im Aschenbecher abgelegt.
- **Ziehen:** eigene Taste (offen); die Glut leuchtet, nach kurzem Halten **atmet der Spieler aus**: eine **Wolke** aus der Blickrichtung des Spielers, die langsam im Raum steht und sich auflöst.
- **Sound:** Anzünden (Feuerzeug), Knistern der Glut beim Zug, Ausatmen (passend zu den Atemgeräuschen in [`sound.md`](sound.md)).
- **Texte:** alle sichtbaren Texte (Tasten-Hinweis) laufen durch `src/i18n`.

## Rauch (Shader)

**Umgesetzt ist der Rauchfaden** (`src/smoke.js`, Werte `SMOKE_*` in `cigarette-constants.js`): eine hohe, schmale Fläche (5 × 40 cm), die sich um die senkrechte Achse zur Kamera dreht. Der Fragment-Shader zeichnet aus vier Schichten Rauschen (fBm) mit Verwirbelung (Domain Warping) einen langsam nach oben wandernden Streifen, unten dünn und deutlich, oben breit und blass. Im Vertex-Shader schwankt der Faden umso mehr, je höher er steigt. Grau, durchscheinend, ohne Tiefenschreiben, mit dem Raumnebel. Eine Fläche pro glimmender Zigarette; **Die Ausatem-Wolke** (`src/exhale.js`, Werte `EXHALE_*`): `T` atmet aus, vor und etwas unterhalb der Kamera, in Blickrichtung. 16 weiche Rauchballen (Rauschen-Shader mit ausgefranstem Rand) fliegen über 1,2 s heraus, werden langsamer, wachsen von 12 auf 75 cm, steigen leicht und lösen sich nach 5–8 s auf. Noch ohne Ton und ohne Bindung an das Ziehen an einer Zigarette; die Dichte ist ungetestet und muss nach Gefühl nachgestellt werden. Die Quellen unten habe ich nicht ausgewertet, der Shader ist eigenständig nach dem üblichen Verfahren gebaut.

Die ursprünglichen Vorgaben:

**Ziel:** Weicher, durchscheinender Rauch, der sich träge nach oben dreht, im Lichtkegel der Lampen heller wird und die Stimmung des dunklen Raums nicht heller macht.

**Zwei Arten:**

1. **Rauchfaden** (glimmende Zigarette): ein schmales, nach oben gestrecktes Band (Ribbon oder Billboard) mit **Fragment-Shader**: mehrschichtiges Rauschen (fBm), das nach oben scrollt, mit **Verwirbelung** (Domain Warping) und einem Alpha, der zu den Seiten und nach oben ausläuft. Je höher, desto breiter und blasser.
2. **Ausatem-Wolke:** wenige, größere Sprites mit demselben Rauschen, die aus dem Mund/der Hand wachsen, dem Blick folgen, sich verwirbeln und nach ca. 5–8 s auflösen.

**Technik:**
- `ShaderMaterial` mit Transparenz, **ohne Tiefenschreiben**, weiche Kanten (Alpha-Verlauf); optional „Soft Particles“ (Alpha an der Tiefe zur Tischplatte ausblenden).
- Zeit als Uniform; ein Rauschmuster per Textur (billig) oder berechnet.
- **Licht (umgesetzt):** Der Rauch wird von den Deckenlampen und den Kerzen beleuchtet (`smoke-light.js`, Beschreibung in `look.md`) und geht im Dunkel unter.
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
